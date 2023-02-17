import { Utils } from "@tago-io/sdk";
import validation from "../../lib/validation";
import { ServiceParams } from "../../types";
import { getOrgVariables } from "./models/edit.model";

async function editOrganization({ config_dev, scope, account }: ServiceParams) {
  const org_id = scope[0].device;
  const validate = validation("org_validation", config_dev);
  // Collecting data
  const { org_name, org_address } = await getOrgVariables(scope, validate);
  if (org_name) {
    // getting previous id data
    const [org_id_data] = await config_dev.getData({ variables: "org_name", qty: 1, groups: org_id });
    // deleting prev data in settings_device
    await config_dev.deleteData({ variables: "org_name", groups: org_id_data.group, qty: 10_000 });
    // updating data
    await config_dev.sendData({ ...org_id_data, metadata: { ...org_id_data.metadata, label: org_name }, time: null });
    // updating device name
    await account.devices.edit(org_id, { name: org_name });
  }
  if (org_address) {
    // getting previous data
    const [org_id_data] = await config_dev.getData({ variables: "org_address", qty: 1, groups: org_id });
    // deleting prev data in settings_device
    await config_dev.deleteData({ variables: "org_address", groups: org_id_data.group, qty: 10_000 });
    // updating data
    await config_dev.sendData({ ...org_id_data, metadata: { ...org_id_data.metadata, label: org_address }, time: null });
    // getting device and device tags
    const org_device = await Utils.getDevice(account, org_id);
    const device_info = await org_device.info();
    const tags = device_info.tags || [];
    // remove old tag
    tags.splice(
      tags.findIndex((tag) => tag.key === "address"),
      1
    );
    // add new tag
    tags.push({ key: "address", value: org_address });
    await account.devices.edit(org_id, { tags });
  }
  return console.debug("edited!");
}

export { editOrganization };
