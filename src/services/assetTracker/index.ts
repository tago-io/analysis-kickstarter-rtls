import { Data } from "@tago-io/sdk/out/common/common.types";
import { AnalysisEnvironment } from "@tago-io/sdk/out/modules/Analysis/analysis.types";
import getDevice from "../../lib/getDevice";
import { ServiceParams } from "../../types";
import plotPosition from "./plotPosition";

/**
 * Check each variable sent in the scope of the analysis.
 * Compare by variable name (since each widget have their correct variables)
 * Actions like delete and edit does send the internal environment variable _widget_exec when the user take this kind of action.
 */
function checkType(scope: Data[], environment: AnalysisEnvironment) {
  if (scope.find((x) => x.variable === "payload")) return "plotPosition";
}

/**
 * Simple service controller to find the function for given variables.
 */
async function controller(params: ServiceParams) {
  const site_dev = await getDevice(params.account, params.scope[0].origin);
  const type = checkType(params.scope, params.environment);
  if (type === "plotPosition") await plotPosition(params, site_dev);
}

export { checkType, controller };
