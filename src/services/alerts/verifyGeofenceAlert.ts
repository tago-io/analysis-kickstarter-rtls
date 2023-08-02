import { Account, Device } from "@tago-io/sdk";
import { ConfigurationParams } from "@tago-io/sdk/out/modules/Account/devices.types";
import { TagoContext } from "@tago-io/sdk/out/modules/Analysis/analysis.types";

import { Geofence, getInsideGeofence } from "../device/is-inside-geofence";
import { IAlertTrigger, sendAlert } from "./sendAlert";

async function _sendEnteredAlert(account: Account, context: TagoContext, myCurrentGeofence: Geofence | null, alert: IAlertTrigger, deviceID: string) {
  if (!myCurrentGeofence) {
    // The asset is not inside any geofence
    return;
  }

  if (alert.trigger_value !== "enter geofence") {
    // Alert doesn't include an Entered event to trigger.
    return;
  }

  await sendAlert(account, context, alert, deviceID);
}

async function _sendLeaveAlert(account: Account, context: TagoContext, lastALert: IAlertTrigger, lastGeofenceParam: ConfigurationParams, deviceID: string) {
  if (!lastGeofenceParam?.value) {
    // The asset was not previously inside any geofence
    return;
  }

  if (lastALert.trigger_value !== "leave geofence") {
    // Alert doesn't include an Leave event to trigger.
    return;
  }

  await sendAlert(account, context, lastALert, deviceID);
}

interface GeofenceAlarmCheck {
  pos_x: number;
  pos_y: number;
  layerBeacon: string;
  geofence_list: Geofence[];
  deviceID: string;
}

/**
 *
 * @param param.pos_x X position of the asset
 * @param param.pos_y Y position of the asset
 * @param param.geofence_list Geofence as variable = { ...x.metadata, id: x.group }
 */
async function verifyGeofenceAlarm(
  account: Account,
  context: TagoContext,
  siteDev: Device,
  { deviceID, pos_x, pos_y, layerBeacon, geofence_list }: GeofenceAlarmCheck
) {
  const myCurrentGeofence = getInsideGeofence([pos_x, pos_y], geofence_list, layerBeacon);
  // the .event is the alert id that is linked to the geofence
  let alert: any;
  if (myCurrentGeofence && myCurrentGeofence.event) {
    const [alertRaw] = await siteDev.getData({ variables: "alert_id", groups: myCurrentGeofence.event, qty: 1 });
    alert = alertRaw?.metadata as any;
  }

  const paramList = await account.devices.paramList(deviceID);
  const lastGeofenceParam = paramList.find((x) => x.key === "last_geofence") || { key: "last_geofence", value: "", sent: false };

  if (myCurrentGeofence && myCurrentGeofence.id !== lastGeofenceParam.value) {
    // The asset is inside a geofence, but is not inside the last geofence
    await _sendEnteredAlert(account, context, myCurrentGeofence, alert, deviceID);
  }

  if (!myCurrentGeofence && lastGeofenceParam?.value) {
    // The asset is inside a geofence, but is inside a different geofence than the last time
    const geofence = geofence_list.find((x) => x.id === lastGeofenceParam.value) as Geofence;
    const [lastAlertRaw] = await siteDev.getData({ variables: "alert_id", groups: geofence.event, qty: 1 });
    const lastAlert = lastAlertRaw?.metadata as any;
    await _sendLeaveAlert(account, context, lastAlert, lastGeofenceParam, deviceID);
  }

  if (!myCurrentGeofence || lastGeofenceParam.value !== myCurrentGeofence?.id) {
    // The asset is not inside any geofence, or is inside a different geofence than the last time
    // Thus we update the LastGeofence Config Parameter
    await account.devices.paramSet(deviceID, { ...lastGeofenceParam, value: myCurrentGeofence?.id || "" });
  }
}

export { verifyGeofenceAlarm };
