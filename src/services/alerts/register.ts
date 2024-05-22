import { Resources } from "@tago-io/sdk";
import { RouterConstructor } from "@tago-io/sdk/lib/modules/Utils/router/router.types";
import { Data, DeviceInfo } from "@tago-io/sdk/lib/types";

import { TagResolver } from "../../lib/edit.tag";
import { getAnalysisByTagID } from "../../lib/find-resource";
import { sendNotificationFeedback } from "../../lib/send-notification";
import { ActionStructureParams, generateActionStructure } from "./_action-structure";
import { getAlertSettings, IAlertSettings } from "./_get-alert-settings";
import { alertModel } from "./alert.model";

/**
 * Parse the alert scope data to extract alert information.
 * @param {Data[]} scope - The scope data containing the alert information.
 * @returns {Promise<{
 *   device: string,
 *   triggers: {
 *     trigger_value: string | number,
 *     trigger_value2?: string | number,
 *     variable: string,
 *     condition: string
 *   }[],
 *   group: string,
 *   dataID: string
 * }>} - The parsed alert information.
 */
async function parseAlertScope(scope: Data[]) {
  const alert = scope.find((x) => x.variable === "alert");
  if (!alert) {
    throw new Error("Add Alert: Missing alert variable");
  }

  const result = await alertModel.parseAsync({ ...alert.metadata, device: alert.value });

  return { ...result, group: alert.group, dataID: alert.id };
}
/**
 * Register an alert for a specific environment and scope.
 * @param {RouterConstructor & { scope: Data[] }} options - The options object containing the environment and scope.
 * @returns {Promise<void>} - A promise that resolves when the alert is registered.
 */
async function _getOrgId(siteID: string) {
  const site = await Resources.devices.info(siteID);

  const orgID = site?.tags?.find((x) => x.key === "organization_id")?.value;

  if (!orgID) {
    throw new Error("Organization not found");
  }
  return orgID;
}

/**
 * Get the list of sensor IDs associated with a specific equipment.
 * @param {string} equipmentID - The ID of the equipment for which to retrieve the sensor IDs.
 * @returns {Promise<string[]>} - A promise that resolves with an array of sensor IDs associated with the equipment.
 */
async function _getEquipmentSensorList(equipmentID: string) {
  const { tags } = await Resources.devices.info(equipmentID);
  const sensorIDList = tags?.filter((x) => x.key === "sensor_id").map((x) => x.value);

  const sensorListInfo = await Promise.all(sensorIDList?.map((x) => Resources.devices.info(x)) || []);

  return sensorListInfo;
}

function _formatTriggerList(alertScope: Awaited<ReturnType<typeof parseAlertScope>>, alertSettings: IAlertSettings[], equipmentSensorList: DeviceInfo[]) {
  return alertScope.triggers.map((trigger) => {
    const triggerSettings = alertSettings.find((x) => x.id === trigger.id);

    const formula = triggerSettings?.formula;

    const applyFormula = (value?: string | number | boolean) => {
      if (formula && value !== undefined) {
        return eval(formula.replace("$VALUE$", value.toString()));
      }
      return value;
    };

    const deviceIDs = equipmentSensorList.filter((x) => x.connector === triggerSettings?.connector).map((x) => x.id);

    return {
      trigger_value: applyFormula(trigger.value ?? trigger.values?.[0]),
      trigger_value2: applyFormula(trigger.values?.[1]),
      variable: triggerSettings?.variable as string,
      condition: triggerSettings?.condition || "",
      trigger_id: trigger.id,
      isActive: trigger.alertActivation,
      isRecurring: trigger.recurringAlarm,
      deviceIdList: deviceIDs,
    };
  });
}

/**
 * Register an alert for a specific environment and scope.
 * @param {RouterConstructor & { scope: Data[] }} options - The options object containing the environment and scope.
 * @returns {Promise<void>} - A promise that resolves when the alert is registered.
 */
async function registerAlert({ environment, scope }: RouterConstructor & { scope: Data[] }) {
  const actionIDs: string[] = [];
  const siteID = scope[0].device as string;

  try {
    const analysisID = await getAnalysisByTagID("alert_trigger");
    const alertScope = await parseAlertScope(scope);

    // Equipment is not the device which received the readings
    const equipmentSensorList = await _getEquipmentSensorList(alertScope.device);
    if (equipmentSensorList.length === 0) {
      throw new Error("No sensor found for the selected equipment");
    }
    const alertSettings = await getAlertSettings(environment.config_id, alertScope.device);
    console.log("ALERT SETTINGS:", alertSettings);
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

    const actionList = generateActionStructure(actionStructure);
    for (const actionBody of actionList) {
      console.log("ACTION BODY:", actionBody);
      const { action } = await Resources.actions.create(actionBody).catch((error) => {
        throw error;
      });

      actionIDs.push(action);
    }

    // identify which actions are monitoring door variables, then add a tag to the device the action is monitoring
    for (const trigger of actionStructure.triggers) {
      if (trigger.trigger_id.includes("door-open-alert") && trigger.isActive) {
        const { tags: deviceTags } = await Resources.devices.info(trigger.deviceIdList[0]);
        void TagResolver(deviceTags).setTag("door-open", "true").apply(trigger.deviceIdList[0]);
      } else if (trigger.trigger_id.includes("Geofence") && trigger.isActive) {
        const { tags: deviceTags } = await Resources.devices.info(trigger.deviceIdList[0]);
        void TagResolver(deviceTags).setTag("group_id_geofence", "true").apply(trigger.deviceIdList[0]);

        // Adding the geofence to the widget event list so that the geofence event can be shown in the image marker
        const type = trigger.trigger_value as string;
        console.log(type);
        const color = type.includes("leave") ? "blue" : type.includes("enter") ? "green" : "pink";
        await Resources.devices.sendDeviceData(siteID, { variable: "geofence_events", value: type, metadata: { color }, group: alertScope.group });
        console.log("color", color);
      }
    }
  } catch (error: any) {
    void Resources.devices.deleteDeviceData(siteID, { groups: scope[0].group });
    void sendNotificationFeedback({ environment, message: error?.message || error, title: "Error creating alert" });
    for (const actionID of actionIDs) {
      await Resources.actions.delete(actionID);
    }
    throw error;
  }
}

export { registerAlert, parseAlertScope, _getOrgId, _getEquipmentSensorList, _formatTriggerList, ActionStructureParams };
