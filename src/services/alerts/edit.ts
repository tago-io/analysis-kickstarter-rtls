import { Resources } from "@tago-io/sdk";
import { RouterConstructor } from "@tago-io/sdk/lib/modules/Utils/router/router.types";
import { Data } from "@tago-io/sdk/lib/types";

import { TagResolver } from "../../lib/edit.tag";
import { getAnalysisByTagID } from "../../lib/find-resource";
import { sendNotificationFeedback } from "../../lib/send-notification";
import { ActionStructureParams, generateActionStructure } from "./_action-structure";
import { getAlertSettings } from "./_get-alert-settings";
import { _formatTriggerList, _getEquipmentSensorList, _getOrgId, parseAlertScope } from "./register";

async function deleteOldActions(group: string) {
  if (!group) {
    console.debug("Alert Edit: No group to delete");
    return;
  }

  const actionList = await Resources.actions.list({ page: 1, fields: ["id", "tags"], filter: { tags: [{ key: "group_id", value: group }] } });

  for (const action of actionList) {
    void Resources.actions.delete(action.id);
  }
}

// {
//   "id": "xxxx",
//   "variable": "alert",
//   "value": "DEVICE_ID",
//   "group": "RANDOM",
//   "metadata": {
//     "triggers": [{ "id": "xxx", "value":"xxx" , "values": "xxx" }],
//     "notificationType": {"email": true, "push": true, "sms": true},
//     "recipients": [{ value: "group1", label: "Group 1" },],
//     "lastAlert": "DATE",
//     "status": "xxx",
//     "name": "xxx"
//   },
// }
async function editAlert({ environment, scope }: RouterConstructor & { scope: Data[] }) {
  const analysisID = await getAnalysisByTagID("alert_trigger");
  const alertScope = await parseAlertScope(scope);
  const alertSettings = await getAlertSettings(environment.config_id, alertScope.device);

  // Equipment is not the device which received the readings
  const equipmentSensorList = await _getEquipmentSensorList(alertScope.device);
  if (equipmentSensorList.length === 0) {
    throw new Error("No sensor found for the selected equipment");
  }

  const siteID = scope[0].device as string;
  const orgID = await _getOrgId(siteID);

  const triggers = _formatTriggerList(alertScope, alertSettings, equipmentSensorList);

  const actionStructure: ActionStructureParams = {
    org_id: orgID,
    site_id: siteID,
    group_id: alertScope.group,
    script: analysisID,
    send_to: alertScope.recipients.map((x) => x.value),
    equipment_id: alertScope.device,
    triggers,
  };

  await deleteOldActions(alertScope.group as string);

  const actionList = generateActionStructure(actionStructure);
  for (const actionBody of actionList) {
    await Resources.actions.create(actionBody).catch((error) => {
      void Resources.devices.deleteDeviceData(siteID, { groups: alertScope.group });
      void sendNotificationFeedback({ environment, message: error, title: "Error creating action" });
      throw error;
    });
  }

  // identify which actions are monitoring door variables, then add a tag to the device the action is monitoring
  for (const trigger of actionStructure.triggers) {
    const { tags: deviceTags } = await Resources.devices.info(trigger.deviceIdList[0]);
    if (trigger.trigger_id.includes("door-open-alert") && trigger.isActive) {
      void TagResolver(deviceTags).setTag("door-open", "true").apply(trigger.deviceIdList[0]);
    } else {
      void TagResolver(deviceTags).remTag("door-open").apply(trigger.deviceIdList[0]);
    }
  }
}

export { editAlert };
