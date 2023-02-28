import { Utils, Analysis } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { TagoContext } from "@tago-io/sdk/out/modules/Analysis/analysis.types";

async function alertTrigger(context: TagoContext, scope: Data[]): Promise<void> {
  console.log("ANALYSIS TRIGGERED");
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

  await alertTrigger(context, scope);
}

if (!process.env.T_TEST) {
  Analysis.use(startAnalysis, { token: process.env.T_ANALYSIS_TOKEN });
}

export { startAnalysis };
