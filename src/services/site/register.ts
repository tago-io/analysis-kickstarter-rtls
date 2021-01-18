import { Device, Account, Types } from "@tago-io/sdk";
import { DeviceCreateInfo } from "@tago-io/sdk/out/modules/Account/devices.types";
import validation from "../../lib/validation";
import registerUser from "../../lib/registerUser";
import { ServiceParams, TagoContext, DeviceCreated } from "../../types";
import { parseTagoObject } from "../../lib/data.logic";
import getDevice from "../../lib/getDevice";

interface installDeviceParam {
  account: Account;
  new_site_name: string;
  org_id: string;
}

async function installDevice({ account, new_site_name, org_id }: installDeviceParam) {
  //structuring data
  const device_data: DeviceCreateInfo = {
    name: new_site_name,
  };

  //creating new device
  const new_site = await account.devices.create(device_data);

  //inserting device id -> so we can reference this later
  await account.devices.edit(new_site.device_id, {
    tags: [
      { key: "site_id", value: new_site.device_id },
      { key: "organization_id", value: org_id },
      { key: "device_type", value: "site" },
    ],
  });

  //instantiating new device
  const new_org_dev = new Device({ token: new_site.token });

  //token, device_id, bucket_id
  return { ...new_site, device: new_org_dev } as DeviceCreated;
}

export default async ({ config_dev, context, scope, account, environment }: ServiceParams, org_dev: Device) => {
  console.log("Registering...");
  //Collecting data
  // const new_site_org = scope.find((x) => x.variable === "new_site_org");
  const new_site_name = scope.find((x) => x.variable === "new_site_name");
  const new_site_address = scope.find((x) => x.variable === "new_site_address");

  const org_id = scope[0].origin as string;

  //validation
  const validate = validation("site_validation", org_dev);

  if (!new_site_name.value) throw validate("Name field is empty", "danger");
  if ((new_site_name.value as string).length < 3) throw validate("Name field is smaller than 3 char.", "danger");
  if (!new_site_address.value) throw validate("Address field is empty", "danger");

  const [site_exists] = await org_dev.getData({ variable: "site_name", value: new_site_name.value, qty: 1 }); /** */

  if (site_exists) throw validate("site already exists", "danger");

  //need device id to configure serie in parseTagoObject
  //creating new device
  const { device_id: site_id, device } = await installDevice({ account, new_site_name: new_site_name.value as string, org_id });

  const site_data = {
    site_id: {
      value: site_id,
      metadata: {
        label: new_site_name.value,
      },
    },
    site_name: {
      value: new_site_name.value,
      metadata: {
        url: `https://admin.tago.io/dashboards/info/5fc91ac2a0e14a002654fe99?site_dev=${site_id}&org_dev=${org_id}`,
      },
    },
    site_address: { value: new_site_address.value, location: new_site_address.location },
    // site_org: new_site_org.value,
  };

  //send to admin device (settings_device) which will send to bucket
  await config_dev.sendData(parseTagoObject(site_data, site_id));

  //send to organization device
  await org_dev.sendData(parseTagoObject(site_data, site_id));

  return validate("Site successfully created!", "success");
};
