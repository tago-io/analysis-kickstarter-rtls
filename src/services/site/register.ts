import { Device, Account, Utils } from "@tago-io/sdk";
import { DeviceCreateInfo } from "@tago-io/sdk/out/modules/Account/devices.types";
import { Data } from "@tago-io/sdk/out/common/common.types";
import validation from "../../lib/validation";
import { ServiceParams, DeviceCreated } from "../../types";
import { parseTagoObject } from "../../lib/data.logic";
import { getZodError } from "../../lib/get-zod-error";
import { registerSiteModel } from "./model/site.model";

interface installDeviceParam {
  account: Account;
  site_name: string;
  site_address: string;
  org_id: string;
}

async function getNewSiteVariables(scope: Data[], validate: ReturnType<typeof validation>) {
  const name = scope.find((x) => x.variable === "new_site_name").value;
  const address = scope.find((x) => x.variable === "new_site_address");

  try {
    return registerSiteModel.parse({
      name,
      address: { value: address.value, location: address.location.coordinates },
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    await validate(zodErrorMsg, "danger");
    throw error;
  }
}

async function installDevice({ account, site_name, site_address, org_id }: installDeviceParam) {
  // structuring data
  const device_data: DeviceCreateInfo = {
    name: site_name,
    type: "mutable",
    connector: "5f5a8f3351d4db99c40dece5",
    network: "5bbd0d144051a50034cd19fb",
  };

  // creating new device
  const new_site = await account.devices.create(device_data);

  // inserting device id -> so we can reference this later
  await account.devices.edit(new_site.device_id, {
    tags: [
      { key: "site_id", value: new_site.device_id },
      { key: "organization_id", value: org_id },
      { key: "device_type", value: "site" },
      { key: "site_address", value: site_address },
    ],
  });

  // instantiating new device
  const new_org_dev = new Device({ token: new_site.token });

  // token, device_id, bucket_id
  return { ...new_site, device: new_org_dev } as DeviceCreated;
}

async function createSite({ config_dev, scope, account, environment }: ServiceParams) {
  // getting Organization device
  const org_id = scope[0].device;
  const org_dev = await Utils.getDevice(account, org_id);
  const validate = validation("site_validation", org_dev);
  // Collecting data
  await validate("Registering...", "warning");
  const { name: new_site_name, address: new_site_address } = await getNewSiteVariables(scope, validate);

  const [site_exists] = await org_dev.getData({ variables: "site_name", values: new_site_name, qty: 1 });

  if (site_exists) {
    throw validate("site already exists", "danger");
  }

  // need device id to configure serie in parseTagoObject
  // creating new device
  const { device_id: site_id, device } = await installDevice({ account, site_name: new_site_name, site_address: new_site_address.value, org_id });
  const site_data = {
    site_id: {
      value: site_id,
      metadata: {
        label: new_site_name,
      },
    },
    site_name: {
      value: new_site_name,
      metadata: {
        url: `https://admin.tago.io/dashboards/info/${environment.dash_site}?site_dev=${site_id}&org_dev=${org_id}`,
      },
    },
    site_address: { value: new_site_address.value, location: new_site_address.location },
    // site_org: new_site_org.value,
  };

  const dashboard_info = await account.dashboards.list();
  const site_dashboard = dashboard_info.find((dashboard) => dashboard.label === "Site");
  const site_dashboard_id = site_dashboard.id;

  const device_info = await device.info();
  const tags = device_info.tags || [];
  tags.push({
    key: "url_link",
    value: `https://admin.tago.io/dashboards/info/${site_dashboard_id}/?org_dev=${org_id}&site_dev=${site_id}`,
  });

  await account.devices.edit(site_id, { tags });

  // send to admin device (settings_device) which will send to bucket
  await config_dev.sendData(parseTagoObject(site_data, site_id));

  // send to organization device
  await org_dev.sendData(parseTagoObject(site_data, site_id));

  return validate("Site successfully created!", "success");
}

export { createSite, getNewSiteVariables };
