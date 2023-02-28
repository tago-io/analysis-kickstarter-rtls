import { Account, Utils } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { findAnalysisByExportID } from "../../lib/findResource";
import { getZodError } from "../../lib/get-zod-error";
import validation from "../../lib/validation";
import { ServiceParams } from "../../types";
import { registerAlertModel } from "./models/alert.model";

interface ActionStructureParams {
  org_id: string;
  type: string;
  trigger_value: string | number;
  variable: string;
  condition: string;
  message: string;
  script?: string;
  device: string;
  description?: string;
}

async function generateActionStructure(structure: ActionStructureParams, device: string, user_list: string[], alert_id: string) {
  const action_structure: any = {
    active: true,
    name: `Application alert trigger for Alert Variable Group: ${alert_id}`,
    tags: [
      { key: "organization_id", value: structure.org_id },
      { key: "device", value: structure.device },
      { key: "description", value: structure.description || "" },
      { key: "alert_id", value: alert_id },
      { key: "alert_type", value: structure.type },
      { key: "device_id", value: device },
    ],
    type: "condition",
    trigger: [
      {
        is: "=",
        value: String(structure.trigger_value),
        variable: structure.variable,
        value_type: "number",
        device,
      },
    ],
    action: {
      type: "script",
      script: [structure.script],
    },
  };

  action_structure.tags = action_structure.tags.concat(
    user_list.map((id) => {
      return { key: "send_to", value: id };
    })
  );

  return action_structure;
}

async function getNewAlertVariables(scope: Data[], validate: ReturnType<typeof validation>) {
  const condition = scope.find((x) => x.variable === "alert_condition"); // Battery or Geofence
  const equipments = scope.find((x) => x.variable === "alert_equip");
  const condition_option = scope.find((x) => x.variable === "alert_cond_option"); // Battery -> number, Geofence -> [string]
  const type = scope.find((x) => x.variable === "alert_type");
  const users = scope.find((x) => x.variable === "alert_users");
  const message = scope.find((x) => x.variable === "alert_message");

  try {
    return registerAlertModel.parse({
      condition,
      equipments,
      condition_option,
      type,
      users,
      message,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    await validate(zodErrorMsg, "danger");
    throw error;
  }
}

async function getDeviceIds(account: Account, equipment_list: string[]) {
  const device_list = [];
  for (const equipment_id of equipment_list) {
    const equipmentDevice = Utils.getDevice(account, equipment_id);
    const equipmentTags = (await equipmentDevice).info();
    const equipmentDeviceId = (await equipmentTags).tags.find((tag) => tag.key === "asset_id");
    device_list.push(equipmentDeviceId?.value);
  }
  return device_list;
}

async function createAlert({ config_dev, scope, account }: ServiceParams) {
  // getting org_id and group_id from the scope
  const organization_id = scope[0].device;
  const alert_id = scope[0].group;
  // creating validation field
  const validate = validation("alert_validation", config_dev);
  await validate("Registering...", "warning");
  // getting scope data
  const { condition, equipments, condition_option, type, users, message } = await getNewAlertVariables(scope, validate);
  // getting the user_id_list from the scope
  const user_list = equipments.metadata.sentValues.map((user) => user.value);
  console.debug("User_id List: ", user_list);
  // getting the organization_id_list from the scope
  const equipment_list = equipments.metadata.sentValues.map((equipment) => equipment.value);
  console.debug("Equipment_id List: ", equipment_list);
  // geting device id of each equipment
  const device_list = await getDeviceIds(account, equipment_list);
  console.debug("Device_id List: ", device_list);
  // creating the alert
  console.debug("Data from form: ", condition, equipments, condition_option, type, users, message);
  // getting script
  const script_id = await findAnalysisByExportID(account, "[TagoIO] - AlertTrigger");
  // creating action name
  const action_name = `Action checks ${condition?.value} condition for ${equipments?.value} equipments`;
  console.log("Action name: ", action_name);
  // Create the action structure.
  const structure: ActionStructureParams = {
    org_id: organization_id,
    trigger_value: condition_option?.value,
    condition: condition?.value,
    type: type?.value,
    variable: condition?.value,
    device: scope[0].device,
    message: message?.value,
    description: action_name,
    script: script_id,
  };

  for (const device of device_list) {
    const action_structure = await generateActionStructure(structure, device as string, user_list, alert_id as string);
    const { action: action_id } = await account.actions.create(action_structure);
    console.debug("Action created: ", action_id);
  }

  return validate("Alert created", "success");
}

export { createAlert, getNewAlertVariables };
