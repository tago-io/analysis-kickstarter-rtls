/**
 * Alert Retry Analysis
 * The analysis runs periodically to check if alerts had been acknowledged and if not, send a notification to the next group of users.
 *
 * This analysis is executed from a scheduled action.
 */
import { queue } from "async";
import { DateTime } from "luxon";

import { Analysis, Resources, Utils } from "@tago-io/sdk";
import { DeviceListItem, TagoContext } from "@tago-io/sdk/lib/types";

import { fetchDeviceList } from "../lib/fetch-device-list";
import { getUsersFromGroup } from "../services/alerts/_get-group-users";
import { NotificationParams, sendNotificationsToUsers } from "../services/alerts/send-notification-to-users";

let retryTimeInMinutes = 20;

interface contactGroups extends Array<string> {}

interface notificationType {
  email: boolean;
  sms: boolean;
  push: boolean;
}

/**
 * Checks for unacknowledged alerts and performs retry logic.
 *
 * @param siteInfo - The information of the site/device.
 * @param environment - The environment configuration.
 * @returns {Promise<void>} - A promise that resolves when the retry logic is completed.
 */
async function _checkNoAckAlert({ siteInfo }: { siteInfo: DeviceListItem }) {
  const noAckDataList = await Resources.devices.getDeviceData(siteInfo.id, { variables: ["not_ack_alert"] });

  if (!noAckDataList || noAckDataList.length === 0) {
    return;
  }

  // get data using the groups from the noAckDataList
  const alertLogGroups = noAckDataList.map((variable) => variable.group) as string[];

  if (alertLogGroups.length === 0) {
    return;
  }

  const alertLog = await Resources.devices.getDeviceData(siteInfo.id, { variables: ["alert_log"], groups: alertLogGroups });

  const curTime = DateTime.now();
  for (const noAckData of noAckDataList) {
    const lastAlertTime = DateTime.fromJSDate(noAckData.time);
    const diff = curTime.diff(lastAlertTime, "minutes").minutes;

    const alertDetails = noAckData.metadata as {
      notificationParams: NotificationParams;
      contactGroups: contactGroups;
      notificationType: notificationType;
      orgID: string;
    };

    if (!noAckData.value) {
      continue;
    }

    // Adding limit of 200 notifications, necessary since metadata 10KB size is a limitation. 200 notifications is apporximately 5.2KB of data.
    if (diff > retryTimeInMinutes && Number(noAckData.value) <= 200) {
      const users = await getUsersFromGroup(alertDetails.orgID, alertDetails.contactGroups[noAckData.value as number]);

      const notificationIDList = await sendNotificationsToUsers(alertDetails.notificationType, users, alertDetails.notificationParams);
      console.log("Notification sent to users", notificationIDList, "For Alert ID:", noAckData.group);
      await Resources.devices.editDeviceData(siteInfo.id, { id: noAckData.id, value: (noAckData.value as number) + 1 });
      const alertLogData = alertLog.find((data) => data.group === noAckData.group);
      const newNotificationIDList = [...(alertLogData?.metadata?.notificationIDList || []), ...notificationIDList];

      if (!alertLogData) {
        continue;
      }

      await Resources.devices.editDeviceData(siteInfo.id, {
        id: alertLogData.id,
        metadata: { ...alertLogData.metadata, notificationIDList: newNotificationIDList },
      });
    } else {
      console.log("Alert eached maximum amount of notifications:", noAckData.group);
    }
  }
}

/**
 * Starts the analysis process.
 *
 * @param context - The TagoContext object containing the analysis context.
 * @returns A Promise that resolves when the analysis is finished.
 */
async function startAnalysis(context: TagoContext): Promise<void> {
  console.log("Running Analysis");
  console.log("Context:", context);

  const environment = Utils.envToJson(context.environment);
  if (environment.retry_time_in_minutes) {
    retryTimeInMinutes = Number(environment.retry_time_in_minutes);

    if (isNaN(retryTimeInMinutes)) {
      throw new Error("retry_time_in_minutes is not a number");
    }
  }

  // get all site devices within the application
  const allSiteDevices = await fetchDeviceList({ tags: [{ key: "device_type", value: "site" }] });
  const siteQueue = queue(_checkNoAckAlert, 5);
  siteQueue.error((error) => console.log(error));

  for (const siteInfo of allSiteDevices) {
    void siteQueue.push({ siteInfo });
  }

  await siteQueue.drain();
  return console.debug("Analysis Finished!");
}

if (process.env.NODE_ENV !== "test") {
  Analysis.use(startAnalysis, { token: process.env.T_ANALYSIS_TOKEN });
}
