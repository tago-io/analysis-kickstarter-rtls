import { Data } from "@tago-io/sdk/lib/types";

import { IAlertModel } from "../alert.model";

/**
 * Function to get trigger details
 * @param trigger The trigger object
 * @param variableName The name of the variable
 * @param scope The scope of the data
 * @returns Object containing trigger details
 */
function getTriggerDetails(trigger: IAlertModel["triggers"][0], variableName: string, scope: Data[]) {
  const variable = scope.find((x) => x.variable === variableName);

  const alert_id = Math.floor(Date.now() % 1e8).toString(); // random 8 digit string
  const triggerDetails = {
    // Need to change device temperature to Fahrenheit with 2 decimal places
    // value: ((Number(variable?.value) * 9) / 5 + 32).toFixed(2),
    value: variable?.value,
    variable: variableName,
    condition: trigger.condition,
    trigger_value: trigger.value,
    alert_id,
    time: new Date(variable?.time as Date),
  };

  return triggerDetails;
}

export { getTriggerDetails };
