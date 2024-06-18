import { Resources } from "@tago-io/sdk";

/**
 * Creates an alert log for a given environment and notification parameters.
 * Adds NotificationIDList which is used to know which notifications were sent to the user.
 * Adds Info which is the message about the alert.
 * @param environment - The environment JSON object.
 * @param notificationParams - The notification parameters.
 * @param notificationIDList - The list of notification IDs (optional).
 * @param siteID - The site ID.
 * @throws Throws an error if the email template is not found.
 */
async function createAlertLog(notificationParams: { [key: string]: any }, notificationIDList: string[] = [], siteID: string) {
  const runInfo = await Resources.run.info();

  let { value: emailTemplate } = runInfo.email_templates["alert_info"];

  if (notificationParams.alert_type === "Door") {
    emailTemplate = runInfo.email_templates["alert_info_door"].value;
  }

  if (!emailTemplate) {
    throw "Email template not found";
  }

  for (const key in notificationParams) {
    emailTemplate = emailTemplate.replaceAll(`$${key}$`, notificationParams[key]);
  }

  const message = emailTemplate;

  await Resources.devices.sendDeviceData(siteID, [
    {
      variable: "alert_log",
      value: notificationParams.equipment_id,
      metadata: {
        acknowledged: false,
        actionGroupID: notificationParams.actionGroupID,
        sensor_id: notificationParams.sensorID,
        user_id: "",
        notificationIDList,
        info: message,
      },
      group: notificationParams.alert_id,
    },
  ]);
}

export { createAlertLog };
