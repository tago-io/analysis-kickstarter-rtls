import { DateTime } from "luxon";

import { Resources } from "@tago-io/sdk";
import { ConfigurationParams, Data } from "@tago-io/sdk/lib/types";

import { ParamResolver } from "../../lib/edit.params";
import { Geofence, getInsideIndoorGeofence } from "../device/is-inside-indoor-geofence";
import { getInsideOutdoorGeofence } from "../device/is-inside-outdoor-geofence";
import { getUsersFromGroup } from "./_get-group-users";
import { createAlertLog } from "./lib/createAlertLog";
import { getAlertDetails } from "./lib/getAlertDetails";
import { getEquipmentDetails } from "./lib/getEquipmentDetails";
import { getTriggerDetails } from "./lib/getTriggerDetails";
import { updateAlertStatus } from "./lib/updateAlertStatus";
import { sendNotificationsToUsers } from "./send-notification-to-users";

interface Alert {
  deviceName: string;
  name: string;
  triggers: {
    id: string;
    variable: string;
    type: string;
    label: string;
    value: number | string;
    formula: string;
    condition: string;
    sensorName: string;
    alertActivation: boolean;
    recurringAlarm: boolean;
  }[];
  notificationType: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  recipients: {
    label: string;
    value: string;
  }[];
  status: string;
}

async function triggerGeofenceAlert(deviceID: string, action_group: string, scope: any, geofenceType: "enter geofence" | "leave geofence") {
  const [action_id] = await Resources.actions.list({ filter: { tags: [{ key: "group_id", value: action_group }] } });

  const { variable, contactGroups, trigger, notificationType, orgID, siteID, equipmentID, alertGroup, alert_type } = await getAlertDetails(action_id.id);
  scope.push({ variable: "geofence", value: geofenceType, time: scope[0].time });
  const triggerDetails = getTriggerDetails(trigger, variable, scope);
  const equpmentDetails = await getEquipmentDetails(equipmentID);

  const notificationParams = {
    equipment_name: equpmentDetails.name,
    equipment_id: equpmentDetails.id,
    sensor_type: equpmentDetails.sensor_type,
    trigger_id: trigger.id,
    ...triggerDetails,
    condition: "",
    trigger_value: geofenceType,
    time_string: DateTime.fromJSDate(triggerDetails.time).toFormat("yyyy-MM-dd HH:mm:ss"),
    actionGroupID: alertGroup,
    alert_type,
    sensorID: deviceID,
    siteID,
  };

  const userList = await getUsersFromGroup(orgID, contactGroups[0]);
  if (!userList || userList.length === 0) {
    throw new Error(`Users not found in group ${contactGroups[0]}`);
  }

  // Change alert_status value to red hexadecimal color since it was triggered and update the alert_time
  await updateAlertStatus(siteID, triggerDetails, deviceID, notificationParams.equipment_id, alertGroup);
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
}

async function _sendEnteredAlert(myCurrentGeofence: Geofence | null, alert: Alert, deviceID: string, scope: Data[]) {
  if (!myCurrentGeofence) {
    // The asset is not inside any geofence
    return;
  }

  if (!alert || !alert.triggers.some((trigger: any) => trigger.value === "enter geofence" && trigger.alertActivation)) {
    // Alert doesn't include an Enter event to trigger.
    return;
  }

  // add alert-trigger.ts logic here
  await triggerGeofenceAlert(deviceID, myCurrentGeofence.event, scope, "enter geofence");
}

async function _sendLeaveAlert(lastGeofenceParam: ConfigurationParams, alert: any, deviceID: string, scope: Data[], oldevent: string) {
  if (!lastGeofenceParam?.value) {
    // The asset was not previously inside any geofence
    return;
  }

  if (!alert || !alert.triggers.some((trigger: any) => trigger.value === "leave geofence" && trigger.alertActivation)) {
    // Alert doesn't include an Leave event to trigger.
    return;
  }

  // add alert-trigger.ts logic here
  await triggerGeofenceAlert(deviceID, oldevent, scope, "leave geofence");
}

interface GeofenceAlarmCheck {
  pos_x: number;
  pos_y: number;
  layerBeacon?: string;
  geofence_list: Geofence[];
  deviceID: string;
}

/**
 *
 * @param param.pos_x X position of the asset
 * @param param.pos_y Y position of the asset
 * @param param.geofence_list Geofence as variable = { ...x.metadata, id: x.group }
 */
async function verifyGeofenceAlarm(site_id: string, { deviceID, pos_x, pos_y, layerBeacon, geofence_list }: GeofenceAlarmCheck, scope: Data[]) {
  let myCurrentGeofence: Geofence | undefined = {} as Geofence;

  if (layerBeacon) {
    myCurrentGeofence = getInsideIndoorGeofence([pos_x, pos_y], geofence_list, layerBeacon);
  } else {
    myCurrentGeofence = getInsideOutdoorGeofence([pos_x, pos_y], geofence_list);
  }

  // the .event is the alert id that is linked to the geofence
  let alert: any;

  if (myCurrentGeofence && myCurrentGeofence.event) {
    const [alertRaw] = await Resources.devices.getDeviceData(site_id, { variables: "alert", groups: myCurrentGeofence.event, qty: 1 });
    alert = alertRaw?.metadata as any;
    // console.log("Currently inside of geofence related to the following Alert:", alertRaw);
  }

  // save the last geofence id in the devices parameters
  // if the device is not inside a geofence or is diferent then the last one, its a leave event
  // if the device is inside a geofence and is diferent then the last one, its a enter event
  const paramList = await Resources.devices.paramList(deviceID);
  const editParams = ParamResolver(paramList);

  // last geofence needs to refer to the geofence id
  const lastGeofenceParam = paramList.find((x) => x.key === "last_geofence") || { key: "last_geofence", value: "", sent: false };

  // console.log("lastGeofenceParam", lastGeofenceParam);
  // console.log("myCurrentGeofence", myCurrentGeofence);
  // console.log("alert", alert);

  // entering geofence alert
  if (myCurrentGeofence && myCurrentGeofence.id !== lastGeofenceParam.value) {
    // The asset is inside a geofence, but is not inside the last geofence
    console.info("Entering geofence");
    await _sendEnteredAlert(myCurrentGeofence, alert, deviceID, scope);
  }

  // leaving geofence alert
  if ((!myCurrentGeofence && lastGeofenceParam?.value != "") || (lastGeofenceParam.value !== myCurrentGeofence?.id && lastGeofenceParam.value !== "")) {
    // The asset is inside a geofence, but is inside a different geofence than the last time

    // check if we have a alert with the leave geofence trigger == to last_geofence
    const [geofence] = await Resources.devices.getDeviceData(site_id, { variables: "geofence", groups: lastGeofenceParam.value, qty: 1 });
    const alert_id = geofence?.metadata?.event;
    const [possibleleaveAlert] = await Resources.devices.getDeviceData(site_id, { variables: "alert", groups: alert_id, qty: 1 });
    alert = possibleleaveAlert?.metadata as any;

    console.info("Leaving geofence");
    await _sendLeaveAlert(lastGeofenceParam, alert, deviceID, scope, alert_id);
  }

  if (myCurrentGeofence) {
    editParams.setParam("last_geofence", myCurrentGeofence?.id, false);
  } else {
    editParams.setParam("last_geofence", "", false);
  }
  if (editParams.hasChanged()) {
    await editParams.apply(deviceID);
  }
}

export { verifyGeofenceAlarm };
