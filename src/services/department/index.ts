import { Data } from "@tago-io/sdk/out/common/common.types";
import { AnalysisEnvironment } from "@tago-io/sdk/out/modules/Analysis/analysis.types";
import { ServiceParams } from "../../types";
import add from "./register";
import remove from "./remove";
import editUser from "./edit";
import getDevice from "../../lib/getDevice";

/**
 * Check each variable sent in the scope of the analysis.
 * Compare by variable name (since each widget have their correct variables)
 * Actions like delete and edit does send the internal environment variable _widget_exec when the user take this kind of action.
 */
function checkType(scope: Data[], environment: AnalysisEnvironment) {
  if (scope.find((x) => x.variable === "new_dept_name")) return "add";
  else if (scope.find((x) => x.variable === "dept_name") && environment._widget_exec === "delete") return "remove";
  else if (scope.find((x) => x.variable === "dept_name" || x.variable === "dept_address") && environment._widget_exec === "edit") return "edit";
}

/**
 * Simple service controller to find the function for given variables.
 */
async function controller(params: ServiceParams) {
  const type = checkType(params.scope, params.environment);
  console.log(params.scope);
  //getting the parent device
  const org_dev = await getDevice(params.account, params.scope[0].origin);
  if (type === "add") await add(params, org_dev);
  else if (type === "remove") await remove(params, org_dev);
  else if (type === "edit") await editUser(params, org_dev);
}

export { checkType, controller };
