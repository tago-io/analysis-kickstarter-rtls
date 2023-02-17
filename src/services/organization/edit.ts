import { Device } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";

import validation from "../../lib/validation";
import { ServiceParams } from "../../types";

function getFormVariables(scope: Data[], config_dev: Device) {
  const org_id = scope[0].group;

  // validation
  const validate = validation("org_validation", config_dev);
  validate("Editing...", "warning");

  const org_name = scope.find((x) => x.variable === "org_name");
  const org_address = scope.find((x) => x.variable === "org_address");

  if (!org_name?.value && !org_address?.value) {
    throw "no values to change";
  }
  // if (!org_name.value) {
  //   throw "Organization name is empty";
  // }
  if (!org_id) {
    throw "Organization id is empty";
  }
  // if (!org_address.value) {
  //   throw "Organization address field is empty";
  // }

  return { org_name, org_id, org_address };
}

async function editOrganization({ config_dev, scope, account }: ServiceParams) {
  const { org_name, org_id, org_address } = getFormVariables(scope, config_dev);
  console.debug(org_id);

  if (org_name) {
    // getting previous id data
    const [org_id_data] = await config_dev.getData({ variables: "org_name", qty: 1, groups: org_id });
    // deleting prev data in settings_device
    await config_dev.deleteData({ variables: "org_name", groups: org_id_data.group, qty: 10_000 });
    // updating data
    await config_dev.sendData({ ...org_id_data, metadata: { ...org_id_data.metadata, label: org_name.value as string }, time: null });
    // updating device name
    const org_device = org_id_data.metadata.device_id;
    await account.devices.edit(org_device, { name: org_name.value as string });
  }
  if (org_address) {
    // getting previous data
    const [org_id_data] = await config_dev.getData({ variables: "org_address", qty: 1, groups: org_id });
    // deleting prev data in settings_device
    await config_dev.deleteData({ variables: "org_address", groups: org_id_data.group, qty: 10_000 });
    // updating data
    await config_dev.sendData({ ...org_id_data, metadata: { ...org_id_data.metadata, label: org_address.value as string }, time: null });
    // updating device tag
    const org_device = org_id_data.metadata.device_id;
    const device_info = await org_device.info();
    const tags = device_info.tags || [];
    tags.push({ key: "org_address", value: org_address });
    await account.devices.edit(org_device, { tags });
  }
  return console.debug("edited!");
}

export { getFormVariables, editOrganization };
