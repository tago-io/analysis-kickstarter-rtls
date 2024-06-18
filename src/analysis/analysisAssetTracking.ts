import { Analysis, Resources, Utils } from "@tago-io/sdk";
import { Data, TagoContext } from "@tago-io/sdk/lib/types";

import { getIndoorPos } from "../services/equipment/tracking/indoor-tracking";
import { outdoorData } from "../services/equipment/tracking/outdoor-tracking";

async function startAnalysis(context: TagoContext, scope: Data[]) {
  context.log("Running Analysis");
  const environment = Utils.envToJson(context.environment);
  if (!environment) {
    return;
  }

  //asset device info
  const device_id = scope[0].device;
  const { tags } = await Resources.devices.info(device_id);

  const equipmentID = tags.find((x) => x.key === "equipment_id")?.value;
  if (!equipmentID) {
    return context.log("Device is not paired with an equipment");
  }

  const orgID = tags.find((x) => x.key === "organization_id")?.value;
  if (!orgID) {
    return context.log("Device not assigned to an Organization");
  }

  //getting the org_dev through the tag
  const siteID = tags.find((x) => x.key === "site_id")?.value;
  if (!siteID) {
    throw "Device not assigned to a Site";
  }

  const locationIsOutdoors = await outdoorData(scope, siteID, equipmentID);

  if (locationIsOutdoors) {
    return;
  }

  await getIndoorPos(context, scope, environment, orgID, siteID, equipmentID);

  context.log("Analysis Finished");
}

if (!process.env.T_TEST) {
  Analysis.use(startAnalysis, { token: process.env.T_ANALYSIS_TOKEN });
}

export { startAnalysis };
