import { Analysis, Resources, Utils } from "@tago-io/sdk";
import { Data, TagoContext } from "@tago-io/sdk/lib/types";

import { verifyGeofenceAlarm } from "../services/alerts/verifyGeofenceAlert";
import { Geofence } from "../services/device/is-inside-indoor-geofence";

/**
 * Function that starts the analysis and handles the alert trigger
 * @param context Context is a variable sent by the analysis
 * @param scope Scope is an array of data sent by the analysis
 */
async function analysisAlert(context: TagoContext, scope: Data[]): Promise<void> {
  console.debug("Running Analysis");
  if (!scope[0]) {
    return console.debug("This analysis must be triggered by an action.");
  }

  console.debug(JSON.stringify(scope));
  // Get the environment variables.
  const environment_variables = Utils.envToJson(context.environment);

  const action_id = environment_variables._action_id;
  if (!action_id) {
    return console.debug("This analysis must be triggered by an action.");
  }

  // Get action details
  const action_info = await Resources.actions.info(action_id);
  if (!action_info.tags) {
    throw "action_info.tags not found";
  }

  const siteID = action_info.tags.find((x) => x.key === "site_id")?.value as string;
  const deviceID = action_info.tags.find((x) => x.key === "device_id")?.value as string;

  const pos_x = scope.find((x) => x.variable === "geofence")?.metadata?.coordinates?.x as number;
  const pos_y = scope.find((x) => x.variable === "geofence")?.metadata?.coordinates?.y as number;

  const geofence_list = (await Resources.devices.getDeviceData(deviceID, { variables: "geofence", qty: 9999 })).map((x) => ({
    ...x.metadata,
    id: x.group,
  })) as Geofence[];

  await verifyGeofenceAlarm(siteID, { deviceID, pos_x, pos_y, geofence_list }, scope);

  return console.debug("Analysis Finished!");
}

if (!process.env.T_TEST) {
  Analysis.use(analysisAlert, { token: process.env.T_ANALYSIS_TOKEN });
}

export { analysisAlert };
