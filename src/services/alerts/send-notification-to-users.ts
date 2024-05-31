import { Resources, Services } from "@tago-io/sdk";
import { UserInfo } from "@tago-io/sdk/lib/types";

import { getAnalysisByTagID } from "../../lib/find-resource";
import { IAlertModel } from "./alert.model";

interface NotificationParams {
  equipment_name: string;
  equipment_id: string;
  sensor_type: string;
  trigger_id: string;
  value: string;
  variable: string;
  condition: string;
  trigger_value: string;
  alert_id: string;
  time_string: string;
  actionGroupID: string;
  alert_type: string;
  sensorID: string;
  siteID: string;
  pushMessage: string;
  smsMessage: string;
  [key: string]: string | number; // Allow additional properties with string keys and values of string, number, or Date
}

/**
 * Sends push notification messages to the specified user list with the given notification parameters
 * @param userList Array of UserInfo objects containing the user IDs to receive the push notification
 * @param notificationParams Object containing the parameters for the push notification
 */

async function pushNotificationMessage(userList: UserInfo[], ackAnalysisID: string, notificationParams: NotificationParams) {
  const notificationIDList: string[] = [];
  for (const user of userList) {
    if (!user.active) {
      continue;
    }

    console.debug(`Sending push notification to ${user.name}`);
    const { id: notificationID } = await Resources.run.notificationCreate(user.id, {
      message: notificationParams.pushMessage,
      title: "Equipment Alert",
      buttons_autodisable: true,
      buttons_enabled: true,
      buttons: [
        {
          id: `ack-btn-${notificationParams.alert_id}`,
          label: "Acknowledge",
          color: "#385157",
          triggers: [
            {
              analysis_id: ackAnalysisID,
            },
          ],
        },
      ],
    });
    notificationIDList.push(notificationID);
  }
  return notificationIDList;
}

/**
 * Sends email messages to the specified user list with the given notification parameters
 * @param userList Array of UserInfo objects containing the email addresses of the users to receive the email
 * @param notificationParams Object containing the parameters for the email notification
 */
async function emailMessages(userList: UserInfo[], notificationParams: NotificationParams) {
  const email = new Services({ token: process.env.T_ANALYSIS_TOKEN }).email;
  userList = userList.filter((x) => x.active);
  let emailTemplate = "email_alert";

  if (notificationParams.alert_type === "Door") {
    emailTemplate = "email_alert_door";
  }

  void email
    .send({
      to: userList.map((x) => x.email).join(","),
      template: {
        name: emailTemplate,
        params: notificationParams,
      },
    })
    .then((msg) => console.log(msg));
}

/**
 * Sends SMS messages to the specified user list with the given notification parameters
 * @param userList Array of UserInfo objects containing the phone numbers of the users to receive the SMS
 * @param notificationParams Object containing the parameters for the SMS notification
 */

async function smsMessages(userList: UserInfo[], notificationParams: NotificationParams) {
  for (const user of userList) {
    if (!user.active) {
      continue;
    }

    const smsService = new Services({ token: process.env.T_ANALYSIS_TOKEN }).sms;
    if (!user.phone) {
      continue;
    }

    void smsService
      .send({
        message: notificationParams.smsMessage,
        to: user.phone,
      })
      .then((msg) => console.debug(msg));
  }
}

/**
 * Generates the notification message based on the notification parameters
 * @param notificationParams Object containing the parameters for the notification
 * @returns The generated notification message
 */
async function generateNotificationMessage(notificationParams: NotificationParams, notificationType: IAlertModel["notificationType"]) {
  const runInfo = await Resources.run.info();
  const messages: any = {};

  /**
   * Processes a notification by replacing placeholders in the email template with corresponding values from notificationParams object.
   * @param type - The type of notification.
   * @param templateKey - The key of the email template to be used.
   * @throws {string} - Throws an error if the email template is not found.
   */
  function processNotification(type: string, templateKey: string) {
    let { value: emailTemplate } = runInfo.email_templates[templateKey];

    if (notificationParams.alert_type === "Door") {
      emailTemplate = runInfo.email_templates["alert_info_door"].value;
    }

    if (!emailTemplate) {
      throw "Email template not found";
    }

    for (const key in notificationParams) {
      emailTemplate = emailTemplate.replaceAll(`$${key}$`, String(notificationParams[key]));
    }

    messages[`${type}Message`] = emailTemplate;
  }

  if (notificationType.sms) {
    processNotification("sms", "sms_alert");
  }

  if (notificationType.push) {
    processNotification("push", "push_alert");
  }

  return messages;
}

/**
 * Sends notifications to the specified user list based on the notification type and parameters
 * @param notificationType Object containing the types of notifications to be sent (push, email, sms)
 * @param userList Array of UserInfo objects containing the user information
 * @param notificationParams Object containing the parameters for the notifications
 */
async function sendNotificationsToUsers(
  notificationType: IAlertModel["notificationType"],
  userList: UserInfo[],
  notificationParams: NotificationParams // TODO: notificationParams must be strongly typed
) {
  console.log("Sending notifications to users", notificationParams);

  console.info(`Sending notifications to ${userList.length} users.`);

  // Capitalize the first letter of the alert type for better readability
  notificationParams.alert_type = notificationParams.alert_type.charAt(0).toUpperCase() + notificationParams.alert_type.slice(1);

  const message = notificationType.push || notificationType.sms ? await generateNotificationMessage(notificationParams, notificationType) : null;
  const smsMessage = message?.smsMessage;
  const pushMessage = message?.pushMessage;

  if (notificationType.sms) {
    await smsMessages(userList, { ...notificationParams, smsMessage });
  }

  let notificationIDList: string[] = [];
  if (notificationType.push) {
    const analysisID = await getAnalysisByTagID("alert_acknowledge", "alert_tag");
    notificationIDList = await pushNotificationMessage(userList, analysisID, { ...notificationParams, pushMessage });
  }

  if (notificationType.email) {
    await emailMessages(userList, notificationParams);
  }

  return notificationIDList;
}

export { sendNotificationsToUsers };
