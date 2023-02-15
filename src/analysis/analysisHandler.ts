import { Utils, Account, Device, Analysis } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { TagoContext } from "@tago-io/sdk/out/modules/Analysis/analysis.types";
import { createOrganization } from "../services/organization/register"

async function analysisHandler(context: TagoContext, scope: Data[]): Promise<void> {
  context.log("Running Analysis");
  console.log("Scope:", scope);

  // Convert environment variables to a JSON.
  const environment = Utils.envToJson(context.environment);

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
  // router.register(deleteOrganization as any).whenEnv("_input_id", "delete-org");
  // router.register(editOrganization as any).whenWidgetExec("edit-org" as any);

  const result = await router.exec();

  console.log("Services found:", result.services);
}

export default new Analysis(analysisHandler, { token: "94f78b11-587d-432d-a6b0-52e8ce4821a7" });
