import { Account, Analysis, Utils } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";

import getDevice from "../lib/getDevice";
import { geofenceAlertTrigger, IGeofenceAlert } from "../services/alerts/GeofenceAlert";
import { getIndoorPos } from "../services/equipment/tracking/indoor-tracking";
import { outdoorData } from "../services/equipment/tracking/outdoor-tracking";
import { TagoContext } from "../types";

async function startAnalysis(context: TagoContext, scope: Data[]) {
  context.log("Running Analysis");
  const environment = Utils.envToJson(context.environment);
  if (!environment) {
    return;
  } else if (!environment.config_token) {
    throw "Missing config_token environment var";
  } else if (!environment.account_token) {
    throw "Missing account_token environment var";
  }

  const account = new Account({ token: environment.account_token });

  //asset device info
  const device_id = scope[0].device;
  const { tags } = await account.devices.info(device_id);

  const equipmentID = tags.find((x) => x.key === "equipment_id")?.value;
  if (!equipmentID) {
    return context.log("Device is not paired with an equipment");
  }

  const orgID = tags.find((x) => x.key === "organization_id")?.value;
  if (!orgID) {
    return context.log("Device not assigned to an Organization");
  }

  const orgDev = await getDevice(account, orgID);

  //getting the org_dev through the tag
  const siteID = tags.find((x) => x.key === "site_id")?.value;
  if (!siteID) {
    throw "Device not assigned to a Site";
  }

  const siteDev = await getDevice(account, siteID);

  let locationData: IGeofenceAlert | undefined = await outdoorData(account, scope, siteDev, equipmentID);
  if (locationData) {
    await geofenceAlertTrigger(account, context, locationData);
    return;
  }

  locationData = await getIndoorPos(account, scope, environment, orgDev, siteDev, siteID, equipmentID);
  await geofenceAlertTrigger(account, context, locationData);
  context.log("Analysis Finished");
}

if (!process.env.T_TEST) {
  Analysis.use(startAnalysis, { token: process.env.T_ANALYSIS_TOKEN });
}

export { startAnalysis };
