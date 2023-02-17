import { Account, Device, Types } from "@tago-io/sdk";
import { DeviceCreateInfo } from "@tago-io/sdk/out/modules/Account/devices.types";

import { parseTagoObject } from "../../lib/data.logic";
import validation from "../../lib/validation";
import { DeviceCreated, ServiceParams } from "../../types";

interface installDeviceParam {
  account: Account;
  new_org_name: string;
  new_org_address: string;
}

function getFormVariables(scope: Types.Common.Data[], config_dev: Device) {
  if (!Array.isArray(scope)) {
    throw "Scope is missing";
  }

  // validation
  const validate = validation("org_validation", config_dev);
  validate("Registering...", "warning");

  const new_org_name = scope.find((x) => x.variable === "new_org_name");
  const new_org_address = scope.find((x) => x.variable === "new_org_address");

  if (!new_org_name.value) {
    throw validate("Name field is empty", "danger");
  }
  if ((new_org_name.value as string).length < 3) {
    throw validate("Name field is smaller than 3 character", "danger");
  }
  if (!new_org_address.value) {
    throw validate("Address field is empty", "danger");
  }

  return { new_org_name, new_org_address, validate };
}

async function installDevice({ account, new_org_name, new_org_address }: installDeviceParam) {
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
      { key: "address", value: new_org_address },
    ],
  });

  // instantiating new device
  const new_org_dev = new Device({ token: new_org.token });

  // token, device_id, bucket_id
  return { ...new_org, device: new_org_dev } as DeviceCreated;
}

async function createOrganization({ config_dev, context, scope, account, environment }: ServiceParams) {
  // Collecting data
  const { new_org_name, new_org_address, validate } = getFormVariables(scope, config_dev);

  const [org_exists] = await config_dev.getData({ variables: "org_name", values: new_org_name.value, qty: 1 });
  const { id: config_dev_id } = await config_dev.info();

  if (org_exists) {
    throw validate("User already exists", "danger");
  }

  // need device id to configure serie in parseTagoObject
  // creating new device
  const { device_id, device } = await installDevice({ account, new_org_name: new_org_name.value as string, new_org_address: new_org_address.value as string });
  const org_data = {
    org_id: device_id,
    org_name: {
      value: new_org_name.value,
      metadata: { url: `https://admin.tago.io/dashboards/info/${environment.dash_org}?settings=${config_dev_id}&org_dev=${device_id}` },
    }, // org_name.value widget?
    org_address: { value: new_org_address.value, location: new_org_address.location },
  };

  const device_info = await device.info();
  const tags = device_info.tags || [];
  tags.push({ key: "url_link", value: `https://admin.tago.io/dashboards/info/${environment.dash_org}?settings=${config_dev_id}&org_dev=${device_id}` });

  await account.devices.edit(device_id, { tags });
  // send to admin device (settings_device) which will send to bucket
  await config_dev.sendData(parseTagoObject(org_data, device_id));

  return validate("Organization created", "success");
}

export { getFormVariables, createOrganization };
