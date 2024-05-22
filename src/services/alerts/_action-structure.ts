/**
 * Reverse the logic of the alert condition for use in the action trigger unlock
 * @param condition The original condition of the action
 * @returns {string} The reversed condition
 */
function _reverseCondition(condition: string) {
  switch (condition) {
    case "=":
      return "!";
    case "!":
      return "=";
    case ">":
      return "<";
    case "<":
      return ">";
    default:
      break;
  }
}

function _generateDeviceTags(devices: string[]) {
  return devices.map((device) => ({ key: "device", value: device }));
}

interface ActionStructureParams {
  group_id?: string;
  org_id: string;
  site_id: string;

  // Equipment ID, only useful for the c3web3 application.
  equipment_id: string;

  send_to: string[];
  // type: string;
  triggers: {
    trigger_value: string | number | boolean;
    trigger_value2?: string | number | boolean;
    variable: string;
    condition: string;
    trigger_id: string;
    isActive: boolean;
    isRecurring: boolean;
    deviceIdList: string[];
  }[];

  script: string;
  name?: string;
}
/**
 * Function that generate the structure of the action create
 * @param structure Parameters used to create the structure
 * @param device_ids Device id list
 */
function generateActionStructure(structure: ActionStructureParams) {
  const actions = [];

  for (const trigger of structure.triggers) {
    if (!trigger.variable || !trigger.condition || trigger.trigger_value === undefined) {
      console.error("Missing required fields for action creation", trigger);
      continue;
    }

    if (trigger.variable.includes("geofence")) {
      trigger.isRecurring = true;
    }

    if (!trigger.isActive) {
      continue;
    }

    const type = trigger.trigger_value !== undefined ? (typeof trigger.trigger_value).toLowerCase() : "string";

    const action_structure: any = {
      active: trigger.isActive,
      name: `Application alert trigger ${structure.group_id ? "GROUP" : "DEVICE"}`,
      tags: [
        { key: "group_id", value: structure.group_id || "N/A" },
        { key: "organization_id", value: structure.org_id },
        { key: "site_id", value: structure.site_id },
        { key: "trigger_id", value: trigger.trigger_id },
        { key: "variable", value: trigger.variable },
        { key: "equipment_id", value: structure.equipment_id },
        // { key: "send_to", value: structure.send_to.join(";") },
        // { key: "action_type", value: structure.type.replaceAll(" ", "") },
        ..._generateDeviceTags(trigger.deviceIdList),
      ],
      type: "condition",
      trigger: [],
      action: {
        type: "script",
        script: [structure.script],
      },
    };

    for (const device_id of trigger.deviceIdList) {
      action_structure.trigger.push({
        is: trigger.condition,
        value: String(trigger.trigger_value),
        value_type: type,
        variable: trigger.variable,
        device: device_id,
        second_value: trigger.trigger_value2,
      });

      if (!trigger.isRecurring) {
        // Setup Unlock Trigger
        if (type === "boolean") {
          action_structure.trigger.push({
            is: "=", // Boolean is always "="
            unlock: true,
            value: String(!trigger.trigger_value),
            value_type: type,
            variable: trigger.variable,
            device: device_id,
            second_value: "",
          });
        } else if (trigger.condition !== "><") {
          action_structure.trigger.push({
            is: _reverseCondition(trigger.condition),
            unlock: true,
            value: String(trigger.trigger_value),
            value_type: type,
            variable: trigger.variable,
            device: device_id,
            second_value: trigger.trigger_value2 || "",
          });
        } else {
          action_structure.trigger.push({
            is: "<",
            unlock: true,
            value: String(trigger.trigger_value),
            value_type: type,
            variable: trigger.variable,
            device: device_id,
            second_value: "",
          });

          action_structure.trigger.push({
            is: ">",
            unlock: true,
            value: String(trigger.trigger_value2),
            value_type: type,
            variable: trigger.variable,
            device: device_id,
            second_value: "",
          });
        }
      }
    }

    // If there are no triggers, add a dummy trigger to avoid errors
    if (action_structure.trigger.length === 0) {
      action_structure.trigger.push({
        is: "=",
        value: "000",
        value_type: "number",
        variable: "not_used_and_doesnt_exist",
        tag_key: "tag_not_used_and_doesnt_exist",
        tag_value: "temp_value",
        second_value: "",
      });

      // Usually it means something is wrong
      console.debug("No triggers found for action", action_structure);
    }

    actions.push(action_structure);
  }

  return actions;
}

export { generateActionStructure, ActionStructureParams };
