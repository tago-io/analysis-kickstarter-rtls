import validation from "../../lib/validation";
import { ServiceParams } from "../../types";
import { getOrgVariables } from "./models/edit.model";

async function editOrganization({ config_dev, scope, account }: ServiceParams) {
  const org_id = scope[0].group;
  const validate = validation("org_validation", config_dev);
  // Collecting data
  const { org_name, org_address } = await getOrgVariables(scope, validate);
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

export { editOrganization };
