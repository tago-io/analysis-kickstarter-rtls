import { DateTime } from "luxon";

import { Resources } from "@tago-io/sdk";
import { RouterConstructor } from "@tago-io/sdk/lib/modules/Utils/router/router.types";
import { Data } from "@tago-io/sdk/lib/types";

import { DataResolver } from "../../lib/edit.data";
import { ParamResolver } from "../../lib/edit.params";

/**
 * Deletes the notifications associated with the given alert log.
 * @param alertLog The alert log containing the notifications to be deleted.
 */
async function updateNotifications(alertLog: Data) {
  const notificationsToEdit = alertLog.metadata?.notificationIDList;

  console.debug("Editing notifications", notificationsToEdit);

  if (notificationsToEdit) {
    for (const notificationID of notificationsToEdit) {
      await Resources.run.notificationEdit(notificationID, { buttons_enabled: false });
    }
  }
}

/**
 * Updates the status of an alert by acknowledging it.
 *
 * @param siteID - The ID of the site where the alert is located.
 * @param actionGroupID - The ID of the action group associated with the alert.
 * @param alertGroupID - The ID of the alert group to which the alert belongs.
 * @returns A Promise that resolves when the alert status is successfully updated.
 */
async function _updateAlertStatus(siteID: string, actionGroupID: string) {
  await DataResolver(siteID, false).setVariable({ variable: "alert_status", value: "orange", group: actionGroupID }).apply(actionGroupID);
}

/**
 * Retrieves the details of an alert.
 * @param alertLog The alert log object.
 * @param environment The environment object containing user information.
 * @returns An object containing the details of the alert.
 * @throws Error if any required parameter is missing.
 */
function getAlertDetails(alertLog: Data, environment: { [key: string]: string }) {
  const alertGroupID = alertLog.group;
  const siteID = alertLog.device;
  const userID = environment._user_id;

  // get the sensor used in the action
  const sensorID = alertLog.metadata?.sensor_id;
  const equipID = alertLog.value as string;
  const actionGroupID = alertLog.metadata?.actionGroupID;

  if (!alertGroupID) {
    throw new Error("Alert ACK: Missing alertGroupID");
  }
  if (!siteID) {
    throw new Error("Alert ACK: Missing siteID");
  }
  if (!userID) {
    throw new Error("Alert ACK: Missing userID");
  }
  if (!sensorID) {
    throw new Error("Alert ACK: Missing sensorID");
  }
  if (!equipID) {
    throw new Error("Alert ACK: Missing equipID");
  }
  if (!actionGroupID) {
    throw new Error("Alert ACK: Missing actionGroupID");
  }

  return { siteID, actionGroupID, alertGroupID, equipID, sensorID, userID };
}

/**
 * Checks if all the alerts of an equipment are acknowledged.
 * If they are, the equipment alarm_status cfg is set to "false" and the sensor alarm_status variable is set to "1".
 *
 * @param siteID - The ID of the site.
 * @param equipID - The ID of the equipment.
 * @returns {Promise<void>} - A promise that resolves when the acknowledgements are checked.
 */
async function _updateEquipSensorStatus(siteID: string, equipID: string, sensorID: string, alertGroupID: string) {
  await Resources.devices.sendDeviceData(sensorID, { variable: "alarm_status", value: 1, group: alertGroupID });

  const alertLogData = await Resources.devices.getDeviceData(siteID, { variables: ["alert_log"], values: equipID, qty: 30 });
  const alertLogList = alertLogData.map((x) => x.metadata);
  const alertLogListAck = alertLogList.filter((x) => x?.acknowledged);

  if (alertLogList.length != alertLogListAck.length) {
    return;
  }

  const equipParam = await Resources.devices.paramList(equipID);
  const editEquip = ParamResolver(equipParam, false);
  editEquip.setParam("alarm_status", "false").apply(equipID);
}

/**
 * Register an alert for a specific environment and scope.
 * @param {RouterConstructor & { scope: Data[] }} options - The options object containing the environment and scope.
 * @returns {Promise<void>} - A promise that resolves when the alert is registered.
 */
async function ackAlert({ environment, scope }: RouterConstructor & { scope: Data[] }) {
  const alertLog = scope.find((x) => x.variable === "alert_log");
  if (!alertLog) {
    throw new Error("Alert ACK: Missing alert_log");
  }

  const { siteID, actionGroupID, alertGroupID, equipID, sensorID, userID } = getAlertDetails(alertLog, environment);

  if (alertLog?.metadata?.acknowledged === true) {
    return;
  }

  await _updateAlertStatus(siteID, actionGroupID);

  // this is used when verifying the alert retry feature
  await Resources.devices.deleteDeviceData(siteID, { variables: "not_ack_alert", groups: alertGroupID });

  const deletedUser = await Resources.run.userInfo(userID);
  const [dataToEdit] = await Resources.devices.getDeviceData(siteID, { variables: ["alert_log"], groups: alertGroupID });
  await Resources.devices.editDeviceData(siteID, {
    id: dataToEdit.id,
    metadata: { ...dataToEdit.metadata, acknowledged: true, label: deletedUser.name, ack_date: DateTime.now(), user_id: userID },
  });

  // checks if equipment doesnt have any other unacknowledged alerts
  await _updateEquipSensorStatus(siteID, equipID, sensorID, alertGroupID);

  // clear the notification related to that acknowledgement
  await updateNotifications(alertLog);
}

export { ackAlert };
