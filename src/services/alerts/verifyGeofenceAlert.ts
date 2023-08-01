import { Account, Device, Services } from "@tago-io/sdk";
import { ConfigurationParams, DeviceInfo } from "@tago-io/sdk/out/modules/Account/devices.types";
import { UserInfo } from "@tago-io/sdk/out/modules/Account/run.types";
import { TagoContext } from "@tago-io/sdk/out/modules/Analysis/analysis.types";

import { Geofence, getInsideGeofence } from "../device/is-inside-geofence";

async function notificationMessages(account: Account, users_info: UserInfo[], message: string) {
  for (const user of users_info) {
    void account.run.notificationCreate(user.id, {
      message,
      title: "Alert Trigger",
    });
  }
}

async function emailMessages(context: TagoContext, deviceInfo: DeviceInfo, users_info: UserInfo[], message: string) {
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

async function smsMessages(context: TagoContext, users_info: UserInfo[], message: string) {
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
      .then((msg) => console.debug(msg));
  }
}

interface sourceDispachMessages {
  type: ["notification" | "email" | "sms"];
  account: Account;
  context: TagoContext;
  usersInfo: UserInfo[];
  message: string;
  deviceInfo: DeviceInfo;
}

async function _dispachMessages({ type, account, context, usersInfo, message, deviceInfo }: sourceDispachMessages) {
  if (type.includes("notification")) {
    await notificationMessages(account, usersInfo, message);
  } else if (type.includes("email")) {
    await emailMessages(context, deviceInfo, usersInfo, message);
  } else if (type.includes("sms")) {
    await smsMessages(context, usersInfo, message);
  }
}

async function _getUsers(account: Account, send_to: string[]) {
  const func_list = send_to.map((user_id) => account.run.userInfo(user_id).catch(() => null));

  return (await Promise.all(func_list)).filter((x) => x) as UserInfo[];
}

async function _sendEnteredAlert(
  account: Account,
  context: TagoContext,
  deviceID: string,
  myCurrentGeofence: Geofence | null,
  alert: any,
  usersInfo: UserInfo[],
  deviceInfo: DeviceInfo
) {
  if (!myCurrentGeofence) {
    // The asset is not inside any geofence
    return;
  }

  if (!alert?.trigger_value?.includes("enter geofence")) {
    // Alert doesn't include an Entered event to trigger.
    return;
  }

  await _dispachMessages({ type: alert.type, account, context, usersInfo, message: alert.message, deviceInfo });
}

async function _sendLeaveAlert(
  account: Account,
  context: TagoContext,
  deviceID: string,
  lastALert: any,
  lastGeofenceParam: ConfigurationParams,
  usersInfo: UserInfo[],
  deviceInfo: DeviceInfo
) {
  if (!lastGeofenceParam?.value) {
    // The asset was not previously inside any geofence
    return;
  }

  if (!lastALert?.trigger_value?.includes("leave geofence")) {
    // Alert doesn't include an Leave event to trigger.
    return;
  }

  await _dispachMessages({ type: lastALert.type, account, context, usersInfo, message: lastALert.message, deviceInfo });
}

interface GeofenceAlarmCheck {
  pos_x: number;
  pos_y: number;
  geofence_list: Geofence[];
  deviceID: string;
}

/**
 *
 * @param param.pos_x X position of the asset
 * @param param.pos_y Y position of the asset
 * @param param.geofence_list Geofence as variable = { ...x.metadata, id: x.group }
 */
async function verifyGeofenceAlarm(account: Account, context: TagoContext, siteDev: Device, { deviceID, pos_x, pos_y, geofence_list }: GeofenceAlarmCheck) {
  // GetInsideGeofence will return the geofence that the asset is inside, or null if is not inside any geofence
  // const myCurrentGeofence = getInsideGeofence([pos_x, pos_y], geofence_list);
  const myCurrentGeofence = getInsideGeofence([pos_x, pos_y], geofence_list);
  // the .event is the alert id that is linked to the geofence
  let alert: any;
  if (myCurrentGeofence && myCurrentGeofence.event) {
    // console.log(await siteDev.info());
    const [alertRaw] = await siteDev.getData({ variables: "alert_id", groups: myCurrentGeofence.event });
    alert = alertRaw?.metadata as any;
  }

  if (!alert) {
    return;
  }

  const paramList = await account.devices.paramList(deviceID);
  const lastGeofenceParam = paramList.find((x) => x.key === "last_geofence") || { key: "last_geofence", value: "", sent: false };

  const usersInfo = await _getUsers(account, alert.send_to?.replace(/;/g, ",").split(","));
  const deviceInfo = await account.devices.info(deviceID);

  console.log(myCurrentGeofence?.id, lastGeofenceParam.value);

  if (myCurrentGeofence && myCurrentGeofence.id !== lastGeofenceParam.value) {
    // The asset is inside a geofence, but is not inside the last geofence
    await _sendEnteredAlert(account, context, deviceID, myCurrentGeofence, alert, usersInfo, deviceInfo);
  }

  if (myCurrentGeofence && lastGeofenceParam.value && lastGeofenceParam.value !== myCurrentGeofence.id) {
    // The asset is inside a geofence, but is inside a different geofence than the last time
    const [lastAlertRaw] = await siteDev.getData({ variables: "alert_id", groups: lastGeofenceParam.value });
    const lastAlert = lastAlertRaw?.metadata as any;
    await _sendLeaveAlert(account, context, lastAlert, deviceID, lastGeofenceParam, usersInfo, deviceInfo);
  }

  if (!myCurrentGeofence || lastGeofenceParam.value !== myCurrentGeofence?.id) {
    // The asset is not inside any geofence, or is inside a different geofence than the last time
    // Thus we update the LastGeofence Config Parameter
    await account.devices.paramSet(deviceID, { ...lastGeofenceParam, value: myCurrentGeofence?.id || "" });
  }
}

export { verifyGeofenceAlarm };
