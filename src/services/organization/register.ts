import { Device, Account, Types } from "@tago-io/sdk";
import { DeviceCreateInfo } from "@tago-io/sdk/out/modules/Account/devices.types";
import validation from "../../lib/validation";
import { ServiceParams, DeviceCreated } from "../../types";
import { parseTagoObject } from "../../lib/data.logic";
import getDevice from "../../lib/getDevice";
import { getOrgVariables } from "./org.model";

interface installDeviceParam {
  account: Account;
  new_org_name: string;
}

async function installDevice({ account, new_org_name }: installDeviceParam) {
  // structuring data
  const device_data: DeviceCreateInfo = {
    name: new_org_name,
    type: "mutable",
    connector: "5f5a8f3351d4db99c40dece5",
    network: "5bbd0d144051a50034cd19fb",
  };

  // creating new device
  const new_org = await account.devices.create(device_data);

  // inserting device id -> so we can reference this later
  await account.devices.edit(new_org.device_id, {
    tags: [
      { key: "organization_id", value: new_org.device_id },
      { key: "device_type", value: "organization" },
    ],
  });

  // instantiating new device
  const new_org_dev = new Device({ token: new_org.token });

  // token, device_id, bucket_id
  return { ...new_org, device: new_org_dev } as DeviceCreated;
}

async function createOrganization({ config_dev, scope, account, environment }: ServiceParams) {
  const validate = validation("org_validation", config_dev);
  // Collecting data
  const { new_org_name, new_org_address } = await getOrgVariables(scope, validate);

  const [org_exists] = await config_dev.getData({ variables: "org_name", values: new_org_name, qty: 1 });
  const { id: config_dev_id } = await config_dev.info();

  if (org_exists) throw validate("User already exists", "danger");

  // need device id to configure serie in parseTagoObject
  // creating new device
  const { device_id, device } = await installDevice({ account, new_org_name: new_org_name as string });
  const org_data = {
    org_id: device_id,
    org_name: {
      value: new_org_name,
      metadata: { url: `https://admin.tago.io/dashboards/info/${environment.dash_org}?settings=${config_dev_id}&org_dev=${device_id}` },
    }, // org_name.value widget?
    org_address: { value: new_org_address.value, location: new_org_address.location },
  };

  // send to admin device (settings_device) which will send to bucket
  await config_dev.sendData(parseTagoObject(org_data, device_id));

  const org_device = await getDevice(account, device_id);
  console.debug(org_device);

  return validate("Organization created", "success");
}

export { createOrganization };
