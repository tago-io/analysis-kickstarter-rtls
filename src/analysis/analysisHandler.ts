import { Utils, Account, Device, Analysis } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { TagoContext } from "@tago-io/sdk/out/modules/Analysis/analysis.types";
import { createOrganization } from "../services/organization/register";
import { deleteOrganization } from "../services/organization/remove";
import { editOrganization } from "../services/organization/edit";
import { createSite } from "../services/site/register";
import { deleteSite } from "../services/site/remove";
import { editSite } from "../services/site/edit";
import { createEquipment } from "../services/equipment/register";
import { deleteEquipment } from "../services/equipment/remove";
import { createSensor } from "../services/device/register";
import { deleteSensor } from "../services/device/remove";
import { editSensor } from "../services/device/edit";
import { createUser } from "../services/user/register";
import { deleteUser } from "../services/user/remove";
import { editUser } from "../services/user/edit";

async function analysisHandler(context: TagoContext, scope: Data[]): Promise<void> {
  // Convert environment variables to a JSON.
  const environment = Utils.envToJson(context.environment);

  // Just a hack to transform input_id from Device List edit to an environment variable,
  environment._input_id = (scope as any).find((x: any) => x.device_list_button_id)?.device_list_button_id;

  // Instance of the settings device, that stores global information of the application.
  const config_dev = new Device({ token: environment.config_token });

  // Instace of the account class, to have access to devices, actions, dashboards, etc..
  const account = new Account({ token: environment.account_token });

  // Instance the router classs of Utils.router
  const router = new Utils.AnalysisRouter({ scope, context, environment, account, config_dev });

  // Register routes based on variable, action or widget.

  // Organization Routing - Using Device List Widget
  router.register(createOrganization).whenInputFormID("create-org");
  router.register(deleteOrganization).whenDeviceListIdentifier("delete-org");
  router.register(editOrganization).whenCustomBtnID("edit-org");

  router.register(createSite).whenInputFormID("create-site");
  router.register(deleteSite).whenDeviceListIdentifier("delete-site");
  router.register(editSite).whenCustomBtnID("edit-site");

  router.register(createEquipment).whenInputFormID("create-equip");
  router.register(deleteEquipment).whenDeviceListIdentifier("delete-equip");

  router.register(createSensor).whenInputFormID("create-dev");
  router.register(deleteSensor).whenDeviceListIdentifier("delete-dev");
  router.register(editSensor).whenCustomBtnID("edit-dev");

  router.register(createUser).whenInputFormID("create-user");
  router.register(deleteUser).whenUserListIdentifier("delete-user");
  router.register(editUser).whenCustomBtnID("edit-user");

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
    throw "Missing config_token environment var";
  } else if (environment.config_token.length !== 36) {
    return context.log('Invalid "config_token" in the environment variable');
  } else if (!environment.account_token) {
    throw "Missing account_token environment var";
  } else if (environment.account_token.length !== 36) {
    return context.log('Invalid "account_token" in the environment variable');
  }

  await analysisHandler(context, scope);
}

if (!process.env.T_TEST) {
  Analysis.use(startAnalysis, { token: process.env.T_ANALYSIS_TOKEN });
}

export { startAnalysis };
