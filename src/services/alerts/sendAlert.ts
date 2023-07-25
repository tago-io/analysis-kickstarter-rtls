import { Account, Services, Utils } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { UserInfo } from "@tago-io/sdk/out/modules/Account/run.types";
import { TagoContext } from "@tago-io/sdk/out/modules/Analysis/analysis.types";

interface IMessageDetail {
  device_name: string;
  device_id: string;
  sensor_type: string;
  value: string;
  variable: string;
}
/**
 * Function that replace the message variables
 * @param message Message that will be replaced
 * @param replace_details Object with the variables that will be replaced
 */
function replaceMessage(message: string, replace_details: IMessageDetail) {
  for (const key of Object.keys(replace_details)) {
    message = message.replace(new RegExp(`#${key}#`, "g"), (replace_details as any)[key]);
  }

  return message;
}

/**
 * Function that get the users that will receive the alert
 * @param account Account instanced class
 * @param send_to List of users that will receive the alert
 */
async function getUsers(account: Account, send_to: string[]) {
  const func_list = send_to.map((user_id) => account.run.userInfo(user_id).catch(() => null));

  return (await Promise.all(func_list)).filter((x) => x) as UserInfo[];
}

interface IAlertTrigger {
  action_id: string;
  data: Data;
  send_to: string[];
  type: string[];
  device: string;
}

/**
 * Function that send the alert to the users
 * @param account Account instanced class
 * @param context Context is a variable sent by the analysis
 * @param org_id Organization ID that will be used to charge the usage
 * @param alert Alert that will be sent
 */
async function sendAlert(account: Account, context: TagoContext, alert: IAlertTrigger) {
  const { data, action_id: alert_id, send_to, type } = alert;
  const groupWithAlert = await Utils.getDevice(account, alert.device);

  // Get action message
  const [message_var] = await groupWithAlert.getData({ variables: ["alert_message", "alert_message"], groups: alert_id, qty: 1 });

  const device_id = data.device;
  const device_info = await account.devices.info(device_id);
  if (!device_info.tags) {
    throw new Error("Device tags not found");
  }
  const sensor_type = device_info?.tags?.find((tag) => tag.key === "device_type")?.value;
  if (!sensor_type) {
    throw new Error("Sensor type not found");
  }
  const replace_details: IMessageDetail = {
    device_name: device_info?.name,
    device_id: device_info?.id,
    sensor_type: sensor_type,
    value: String(data?.value),
    variable: data?.variable,
  };

  const message = replaceMessage(message_var.value as string, replace_details);

  const users_info = await getUsers(account, send_to);

  if (type.includes("notification_run")) {
    users_info.forEach((user) => {
      void account.run.notificationCreate(user.id, {
        message,
        title: "Alert Trigger",
      });
    });
  }

  if (type.includes("email")) {
    const email = new Services({ token: context.token }).email;

    await email.send({
      to: users_info.map((x) => x.email).join(","),
      template: {
        name: "email_alert",
        params: {
          device_name: device_info.name,
          alert_message: message,
        },
      },
    });
  }

  if (type.includes("sms")) {
    users_info.forEach((user) => {
      const smsService = new Services({ token: context.token }).sms;
      if (!user.phone) {
        throw new Error("User phone not found");
      }
      void smsService
        .send({
          message,
          to: user.phone,
        })
        .then((msg) => console.debug(msg));
    });
  }
}

export { sendAlert, IAlertTrigger };
