import { Analysis, Utils } from "@tago-io/sdk";
import { Data, TagoContext } from "@tago-io/sdk/lib/types";

import { searchAsset } from "../services/assetTracker/search";
import { editSensor } from "../services/device/edit";
import { createSensor } from "../services/device/register";
import { deleteSensor } from "../services/device/remove";
import { createEquipment } from "../services/equipment/register";
import { deleteEquipment } from "../services/equipment/remove";
import { editOrganization } from "../services/organization/edit";
import { createOrganization } from "../services/organization/register";
import { deleteOrganization } from "../services/organization/remove";
import { sensorLevelReportCsv } from "../services/report/generateReport";
import { editSite } from "../services/site/edit";
import { createSite } from "../services/site/register";
import { deleteSite } from "../services/site/remove";
import { editUser } from "../services/user/edit";
import { createUser } from "../services/user/register";
import { deleteUser } from "../services/user/remove";

async function analysisHandler(context: TagoContext, scope: Data[]): Promise<void> {
  // Convert environment variables to a JSON.
  const environment = Utils.envToJson(context.environment);

  // Just a hack to transform input_id from Device List edit to an environment variable,
  environment._input_id = (scope as any).find((x: any) => x.device_list_button_id)?.device_list_button_id;

  // Instance the router classs of Utils.router
  const router = new Utils.AnalysisRouter({ scope, environment, context });

  // Register routes based on variable, action or widget.

  // Organization Routing - Using Device List Widget
  router.register(createOrganization as any).whenInputFormID("create-org");
  router.register(deleteOrganization as any).whenDeviceListIdentifier("delete-org");
  router.register(editOrganization as any).whenCustomBtnID("edit-org");

  router.register(createSite as any).whenInputFormID("create-site");
  router.register(deleteSite as any).whenDeviceListIdentifier("delete-site");
  router.register(editSite as any).whenCustomBtnID("edit-site");

  router.register(createEquipment as any).whenInputFormID("create-equip");
  router.register(deleteEquipment as any).whenDeviceListIdentifier("delete-equip");

  router.register(createSensor as any).whenInputFormID("create-dev");
  router.register(deleteSensor as any).whenDeviceListIdentifier("delete-dev");
  router.register(editSensor as any).whenCustomBtnID("edit-dev");

  router.register(createUser as any).whenInputFormID("create-user");
  router.register(deleteUser as any).whenUserListIdentifier("delete-user");
  router.register(editUser as any).whenCustomBtnID("edit-user");

  router.register(searchAsset as any).whenInputFormID("search-asset");

  router.register(sensorLevelReportCsv as any).whenInputFormID("create-report");

  const result = await router.exec();

  console.log("Services found:", result.services);
}

/**
 * Main function - handle the analysis initialization
 */
async function startAnalysis(context: TagoContext, scope: Data[]): Promise<void> {
  console.log("SCOPE:", JSON.stringify(scope, null, 4));
  console.log("CONTEXT:", JSON.stringify(context, null, 4));
  console.log("Running Analysis");

  // Convert the environment variables from [{ key, value }] to { key: value };
  const environment = Utils.envToJson(context.environment);
  if (!environment) {
    return;
  }
  // Check if all tokens needed for the application were provided.
  if (!environment.config_token) {
    throw new Error("Config id not found, add it to the analysis environment variables");
  }

  await analysisHandler(context, scope);
}

if (!process.env.T_TEST) {
  Analysis.use(startAnalysis, { token: process.env.T_ANALYSIS_TOKEN });
}

export { startAnalysis };
