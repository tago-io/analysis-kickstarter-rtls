import { Resources, Services } from "@tago-io/sdk";
import { DeviceInfo, TagoContext, UserInfo } from "@tago-io/sdk/lib/types";

async function _notificationMessages(users_info: UserInfo[], message: string) {
  for (const user of users_info) {
    void Resources.run.notificationCreate(user.id, {
      message,
      title: "Alert Trigger",
    });
  }
}

async function _emailMessages(context: TagoContext, deviceInfo: DeviceInfo, users_info: UserInfo[], message: string) {
  const email = new Services({ token: context.token }).email;

  void email.send({
    to: users_info.map((x) => x.email).join(","),
    template: {
      name: "email_alert",
      params: {
        device_name: deviceInfo.name,
        alert_message: message,
      },
    },
  });
}

async function _smsMessages(context: TagoContext, users_info: UserInfo[], message: string) {
  for (const user of users_info) {
    const smsService = new Services({ token: context.token }).sms;
    if (!user.phone) {
      throw "user.phone not found";
    }
    void smsService
      .send({
        message,
        to: user.phone,
      })
      .catch((error) => console.debug(error));
  }
}

interface sourceDispatchMessages {
  type: string[];
  context: TagoContext;
  usersInfo: UserInfo[];
  message: string;
  deviceInfo: DeviceInfo;
}

async function _dispatchMessages(source: sourceDispatchMessages) {
  if (source.type.includes("push")) {
    await _notificationMessages(source.usersInfo, source.message);
  }

  if (source.type.includes("email")) {
    await _emailMessages(source.context, source.deviceInfo, source.usersInfo, source.message);
  }

  if (source.type.includes("sms")) {
    await _smsMessages(source.context, source.usersInfo, source.message);
  }
}

/**
 * Function that get the users that will receive the alert
 * @param send_to List of users that will receive the alert
 */
async function _getUsers(send_to: string[]) {
  const func_list = send_to.map((user_id) => Resources.run.userInfo(user_id).catch(() => null));

  return (await Promise.all(func_list)).filter((x) => x) as UserInfo[];
}

interface IAlertTrigger {
  name: string;
  site_id: string;
  type: string;
  group_id?: string;
  trigger_value: string | number;
  variable: string;
  condition: string;
  message: string;
  script?: string;
  device: string;
  description?: string;
  send_to: string;
}

/**
 * Function that send the alert to the users
 * @param context Context is a variable sent by the analysis
 * @param org_id Organization ID that will be used to charge the usage
 * @param alert Alert that will be sent
 */
async function sendAlert(context: TagoContext, alert: IAlertTrigger, deviceID: string) {
  // Get action message
  const device_info = await Resources.devices.info(deviceID);
  if (!device_info.tags) {
    throw new Error("Device tags not found");
  }
  const sensor_type = device_info?.tags?.find((tag) => tag.key === "device_type")?.value;
  if (!sensor_type) {
    throw new Error("Sensor type not found");
  }

  const users_info = await _getUsers(alert.send_to?.replace(/;/g, ",").split(","));
  const type = alert.type.replaceAll(";", ",").split(",");

  await _dispatchMessages({
    type,
    context,
    usersInfo: users_info,
    message: alert.message,
    deviceInfo: device_info,
  });
}

export { sendAlert, IAlertTrigger };
