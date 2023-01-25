import { Data } from "@tago-io/sdk/out/common/common.types";
import getDevice from "../../lib/getDevice";
import { ServiceParams } from "../../types";
import search from "./search";

/**
 * Check each variable sent in the scope of the analysis.
 * Compare by variable name (since each widget have their correct variables)
 * Actions like delete and edit does send the internal environment variable _widget_exec when the user take this kind of action.
 */
function checkType(scope: Data[]) {
  if (scope.find((x) => x.variable === "find_asset")) return "search";
}

/**
 * Simple service controller to find the function for given variables.
 */
async function controller(params: ServiceParams) {
  const type = checkType(params.scope);
  const org_dev = await getDevice(params.account, params.scope[0].device);
  if (type === "search") await search(params, org_dev);
}

export { checkType, controller };
