import { Resources } from "@tago-io/sdk";

import { DataResolver } from "../../../lib/edit.data";
import { ParamResolver } from "../../../lib/edit.params";
import { getTriggerDetails } from "./getTriggerDetails";

/**
 * Function to update alert status
 * @param siteID The ID of the site
 * @param triggerDetails Object containing trigger details
 * @param alertGroup The group of the alert
 */
async function updateAlertStatus(siteID: string, triggerDetails: ReturnType<typeof getTriggerDetails>, sensorID: string, equipID: string, alertGroup: string) {
  const editSite = DataResolver(siteID, false);
  editSite.setVariable({ variable: "alert_status", value: "red", metadata: { lastAlert: triggerDetails.time.toISOString() }, group: alertGroup });
  await editSite.apply(alertGroup);

  await Resources.devices.sendDeviceData(sensorID, { variable: "alarm_status", value: 0, group: alertGroup });

  const equipParams = await Resources.devices.paramList(equipID);
  const editEquip = ParamResolver(equipParams, false);
  editEquip.setParam("alarm_status", "true");
  await editEquip.apply(equipID);
}

export { updateAlertStatus };
