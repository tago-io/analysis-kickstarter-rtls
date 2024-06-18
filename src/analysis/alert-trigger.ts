import { DateTime } from "luxon";

/*
 * Alert Trigger
 *
 * The analysis runs everytime a device uplink matches an alert and must send an email, sms or notification.
 *
 * How to setup this analysis
 * Make sure you have the following enviroment variables:
 * - config_token: the value must be a token from a HTTPs device, that stores general information of the application.
 */
import { Analysis, Resources, Utils } from "@tago-io/sdk";
import { Data, TagoContext } from "@tago-io/sdk/lib/types";

import { getUsersFromGroup } from "../services/alerts/_get-group-users";
import { createAlertLog } from "../services/alerts/lib/createAlertLog";
import { getAlertDetails } from "../services/alerts/lib/getAlertDetails";
import { getEquipmentDetails } from "../services/alerts/lib/getEquipmentDetails";
import { getTriggerDetails } from "../services/alerts/lib/getTriggerDetails";
import { updateAlertStatus } from "../services/alerts/lib/updateAlertStatus";
import { sendNotificationsToUsers } from "../services/alerts/send-notification-to-users";

/**
 * Function that starts the analysis and handles the alert trigger
 * This function assumes that Action contains Trigger Unlock, so it will not be triggered by the same action
 *
 * @param context Context is a variable sent by the analysis
 * @param scope Scope is an array of data sent by the analysis
 */
async function analysisAlert(context: TagoContext, scope: Data[]): Promise<void> {
  console.log("Scope:", scope);
  console.debug("Running Analysis");
  if (!scope[0]) {
    return console.debug("This analysis requires an scope.");
  }

  // Get the environment variables.
  const environment = Utils.envToJson(context.environment);

  const action_id = environment._action_id;
  if (!action_id) {
    return console.debug("This analysis must be triggered by an action.");
  }

  const sensorID = scope[0].device;
  // Get action details
  const { variable, contactGroups, trigger, notificationType, orgID, siteID, equipmentID, alertGroup, alert_type } = await getAlertDetails(action_id);
  const triggerDetails = getTriggerDetails(trigger, variable, scope);
  const equpmentDetails = await getEquipmentDetails(equipmentID);

  const notificationParams = {
    equipment_name: equpmentDetails.name,
    equipment_id: equpmentDetails.id,
    sensor_type: equpmentDetails.sensor_type,
    trigger_id: trigger.id,
    ...triggerDetails,
    time_string: DateTime.fromJSDate(triggerDetails.time).toFormat("yyyy-MM-dd HH:mm:ss"),
    actionGroupID: alertGroup,
    alert_type,
    sensorID,
    siteID,
  };

  const userList = await getUsersFromGroup(orgID, contactGroups[0]);
  if (!userList || userList.length === 0) {
    throw new Error(`Users not found in group ${contactGroups[0]}`);
  }

  // Change alert_status value to red hexadecimal color since it was triggered and update the alert_time
  await updateAlertStatus(siteID, triggerDetails, sensorID, notificationParams.equipment_id, alertGroup);
  const notificationIDList = await sendNotificationsToUsers(notificationType, userList, notificationParams);
  await createAlertLog(notificationParams, notificationIDList, siteID);

  if (contactGroups.length >= 2) {
    // It will be picked by alert-retry analysis
    await Resources.devices.sendDeviceData(siteID, {
      variable: "not_ack_alert",
      value: 1,
      group: notificationParams.alert_id,
      metadata: {
        notificationParams,
        contactGroups: contactGroups,
        notificationType,
        orgID,
      },
    });
  }

  return console.debug("Analysis Finished!");
}

if (!process.env.T_TEST) {
  Analysis.use(analysisAlert, { token: process.env.T_ANALYSIS_TOKEN });
}

export { analysisAlert };
