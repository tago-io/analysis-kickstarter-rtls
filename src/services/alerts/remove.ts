import { Resources } from "@tago-io/sdk";
import { ActionInfo } from "@tago-io/sdk/lib/types";

/**
 * Function to be used externally when need to remove a device from an alert.
 * @param action_id Id of the action that will be removed
 * @param device_id Device id of the action that will be removed
 */
async function removeDeviceFromAlert(action_id: string, device_id: string) {
  const action_info: Partial<Omit<ActionInfo, "trigger">> & { trigger: any } = (await Resources.actions.info(action_id)) as any;

  if (!action_id || !device_id) {
    throw new Error("Missing parameters");
  }

  if (!action_info.tags) {
    throw new Error("Action not found");
  }
  delete action_info.created_at;
  delete action_info.updated_at;
  delete action_info.last_triggered;
  delete action_info.description;
  delete action_info.id;

  action_info.tags = action_info.tags.filter((tag) => tag.value !== device_id);
  action_info.trigger = action_info.trigger.filter((trigger: any) => trigger.device !== device_id);

  // Add a random trigger, so the API can accept it.
  if (action_info.trigger.length === 0) {
    action_info.trigger.push({
      is: "<",
      unlock: true,
      value: "0",
      value_type: "number",
      variable: "not_used_and_doesnt_exist",
      tag_key: "tag_not_used_and_doesnt_exist",
      tag_value: "temp_value",
      second_value: "",
    });
  }

  await Resources.actions.edit(action_id, action_info);
}

/**
 * Main delete alert function.
 * @param environment Environment Variable is a resource to send variables values to the context of your script
 * @param scope Number of devices that will be listed
 * @param config_dev Device of the configuration
 * @param context Context is a variable sent by the analysis
 */
async function deleteAlert({ environment, scope, config_dev, context }: any) {
  if (!environment || !scope || !config_dev || !context) {
    throw new Error("Missing parameters");
  }

  const { group } = scope[0];
  if (!group) {
    throw new Error("Group not found");
  }
  const device_id = scope[0].device;

  await Resources.devices.deleteDeviceData(device_id, { groups: group });

  const action_info = await Resources.actions.info(group);
  if (!action_info.trigger) {
    throw new Error("Action not found");
  }

  await Resources.actions.delete(group);
}

export { deleteAlert, removeDeviceFromAlert };
