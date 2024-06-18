import { Device, Resources } from "@tago-io/sdk";
import { Data, DeviceCreateInfo } from "@tago-io/sdk/lib/types";

import { getZodError } from "../../lib/get-zod-error";
import { parseObjectToTago } from "../../lib/parse-object-to-tagoio";
import { initializeValidation } from "../../lib/validation";
import { DeviceCreated, ServiceParams } from "../../types";
import { registerSiteModel } from "./model/site.model";

interface installDeviceParam {
  site_name: string;
  site_address: string;
  org_id: string;
}

async function getNewSiteVariables(scope: Data[], validate: ReturnType<typeof initializeValidation>) {
  const name = scope.find((x) => x.variable === "new_site_name")?.value;
  const address = scope.find((x) => x.variable === "new_site_address");

  try {
    return registerSiteModel.parse({
      name,
      address: { value: address?.value, location: address?.location?.coordinates },
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    await validate(zodErrorMsg, "danger");
    throw error;
  }
}

async function installDevice({ site_name, site_address, org_id }: installDeviceParam) {
  // structuring data
  const device_data: DeviceCreateInfo = {
    name: site_name,
    type: "mutable",
    connector: "5f5a8f3351d4db99c40dece5",
    network: "5bbd0d144051a50034cd19fb",
  };

  // creating new device
  const new_site = await Resources.devices.create(device_data);

  // inserting device id -> so we can reference this later
  await Resources.devices.edit(new_site.device_id, {
    tags: [
      { key: "site_id", value: new_site.device_id },
      { key: "organization_id", value: org_id },
      { key: "device_type", value: "site" },
      { key: "site_address", value: site_address },
      { key: "department_id", value: new_site.device_id },
    ],
  });

  // instantiating new device
  const new_org_dev = new Device({ token: new_site.token });

  // token, device_id, bucket_id
  return { ...new_site, device: new_org_dev } as DeviceCreated;
}

async function createSite({ scope, environment }: ServiceParams) {
  // getting Organization device
  const config_id = environment.config_id;
  const org_id = scope[0].device;

  const validate = initializeValidation("site_validation", org_id);
  // Collecting data
  await validate("Registering...", "warning");
  const { name: new_site_name, address: new_site_address } = await getNewSiteVariables(scope, validate);

  const [site_exists] = await Resources.devices.getDeviceData(org_id, { variables: "site_name", values: new_site_name, qty: 1 });

  if (site_exists) {
    throw await validate("Site name already exists", "danger");
  }

  if (new_site_name.length < 3) {
    throw await validate("Site name must be at least 3 characters long", "danger");
  }

  // need device id to configure serie in parseTagoObject
  // creating new device
  const { device_id: site_id, device: site_dev } = await installDevice({ site_name: new_site_name, site_address: new_site_address.value, org_id });
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
  };

  const dashboard_info = await Resources.dashboards.list();
  const site_dashboard = dashboard_info.find((dashboard) => dashboard.label === "#GLOBAL.SITE#");
  const site_dashboard_id = site_dashboard?.id;

  const device_info = await site_dev.info();
  const tags = device_info.tags || [];
  tags.push({
    key: "url_link",
    value: `https://admin.tago.io/dashboards/info/${site_dashboard_id}/?org_dev=${org_id}&site_dev=${site_id}`,
  });

  await Resources.devices.edit(site_id, { tags });

  // send to admin device (settings_device) which will send to bucket
  await Resources.devices.sendDeviceData(config_id, parseObjectToTago(site_data, site_id));

  // send to organization device
  await Resources.devices.sendDeviceData(org_id, parseObjectToTago(site_data, site_id));

  // send to site device
  await Resources.devices.sendDeviceData(site_id, parseObjectToTago(site_data, site_id));

  return await validate("Site successfully created!", "success");
}

export { createSite, getNewSiteVariables };
