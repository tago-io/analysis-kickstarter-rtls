import { Data } from "@tago-io/sdk/out/common/common.types";
import { ServiceParams, EnvironmentItemObject } from "../../types";
import getDevice from "../../lib/getDevice";
import add from "./register";
import remove from "./remove";

/**
 * Check each variable sent in the scope of the analysis.
 * Compare by variable name (since each widget have their correct variables)
 * Actions like delete and edit does send the internal environment variable _widget_exec when the user take this kind of action.
 */
function checkType(scope: Data[], environment: EnvironmentItemObject) {
  if (scope.find((x) => x.variable === "new_equip_name")) return "add";
  else if (scope.find((x) => x.variable === "equip_name") && environment._widget_exec === "delete") return "remove";
}

/**
 * Get the tago device class from the origin of the variable in the scope.
 * Service controller to find the function for given variables.
 */
async function controller(params: ServiceParams) {
  const type = checkType(params.scope, params.environment);
  const org_dev = await getDevice(params.account, params.scope[0].origin);

  if (type === "add") await add(params, org_dev);
  if (type === "remove") await remove(params, org_dev);
}

export { checkType, controller };
