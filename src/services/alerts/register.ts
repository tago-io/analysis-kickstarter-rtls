import { Account, Utils } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { DataToSend } from "@tago-io/sdk/out/modules/Device/device.types";
import { parseTagoObject } from "../../lib/data.logic";
import { findAnalysisByExportID } from "../../lib/findResource";
import { getZodError } from "../../lib/get-zod-error";
import validation from "../../lib/validation";
import { ServiceParams } from "../../types";
import { registerAlertModel } from "./models/alert.model";

interface ActionStructureParams {
  org_id: string;
  type: string;
  group_id?: string;
  trigger_value: string | number;
  variable: string;
  condition: string;
  message: string;
  script?: string;
  device: string;
  description?: string;
  send_to: string;
}

function generateActionStructure(structure: ActionStructureParams, device_ids: string[]) {
  const action_structure: any = {
    active: true,
    name: `Application alert trigger ${structure.group_id ? "GROUP" : "DEVICE"}`,
    tags: [
      { key: "group_id", value: structure.group_id || "N/A" },
      { key: "organization_id", value: structure.org_id },
      { key: "device", value: structure.device },
      { key: "description", value: structure.description || "" },
      { key: "send_to", value: structure.send_to.replaceAll(" ", "") },
      { key: "action_type", value: structure.type.replaceAll(" ", "") },
    ],
    type: "condition",
    trigger: [],
    action: {
      type: "script",
      script: [structure.script],
    },
  };

  action_structure.tags = action_structure.tags.concat(
    device_ids.map((id) => {
      return { key: "device_id", value: id };
    })
  );

  const value_type = Number.isNaN(Number(structure.trigger_value)) ? "string" : "number";
  const variables = structure.variable.split(",");
  for (const device_id of device_ids) {
    for (const variable of variables) {
      action_structure.trigger.push({
        is: structure.condition,
        value: String(structure.trigger_value),
        value_type,
        variable,
        device: device_id,
        second_value: structure.trigger_value2,
      });

      if (structure.type !== "><") {
        action_structure.trigger.push({
          is: reverseCondition(structure.condition),
          unlock: true,
          value: String(structure.trigger_value),
          value_type,
          variable,
          device: device_id,
          second_value: structure.trigger_value2 || "",
        });
      } else {
        action_structure.trigger.push({
          is: "<",
          unlock: true,
          value: String(structure.trigger_value),
          value_type: "number",
          variable,
          device: device_id,
          second_value: "",
        });

        action_structure.trigger.push({
          is: ">",
          unlock: true,
          value: String(structure.trigger_value2),
          value_type: "number",
          variable,
          device: device_id,
          second_value: "",
        });
      }
    }
  }

  // Add a random trigger, so the API can accept it.
  if (action_structure.trigger.length === 0) {
    action_structure.trigger.push({
      is: "=",
      value: String(structure.trigger_value),
      value_type: "number",
      variable: "not_used_and_doesnt_exist",
      tag_key: "tag_not_used_and_doesnt_exist",
      tag_value: "temp_value",
      second_value: "",
    });
  }

  return action_structure;
}

async function getNewAlertVariables(scope: Data[], validate: ReturnType<typeof validation>) {
  const condition = scope.find((x) => x.variable === "alert_condition"); // Battery or Geofence
  const equipments = scope.find((x) => x.variable === "alert_equip");
  const condition_value = scope.find((x) => x.variable === "alert_value"); // Battery -> number, Geofence -> [string]
  const type = scope.find((x) => x.variable === "alert_type");
  const users = scope.find((x) => x.variable === "alert_users");
  const message = scope.find((x) => x.variable === "alert_message");

  try {
    return registerAlertModel.parse({
      condition,
      equipments,
      condition_value,
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

function reverseCondition(condition: string) {
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

async function createAlert({ scope, account }: ServiceParams) {
  const defaultCondition = "<";
  const devToStoreAlert = await Utils.getDevice(account, scope[0].device);
  await devToStoreAlert.sendData({ variable: "action_validation", value: "#VAL.CREATING_ALERT#", metadata: { type: "warning" } });
  // getting org_id and group_id from the scope
  const organization_id = scope[0].device;
  const org_dev = await Utils.getDevice(account, organization_id);
  // creating validation field
  const validate = validation("alert_validation", org_dev);
  await validate("Registering...", "warning");
  // getting scope data
  const { condition, equipments, condition_value, type, users, message } = await getNewAlertVariables(scope, validate);
  // getting the organization_id_list from the scope
  const equipment_list = equipments.metadata.sentValues.map((equipment) => equipment.value);
  console.debug("Equipment_id List: ", equipment_list);
  // geting device id of each equipment
  const device_list = await getDeviceIds(account, equipment_list);
  console.debug("Device_id List: ", device_list);
  // creating the alert
  console.debug("Data from form: ", condition, equipments, condition_value, type, users, message);
  // getting script
  const script_id = await findAnalysisByExportID(account, "[TagoIO] - AlertTrigger");
  // creating action name
  const action_name = `Action checks ${condition?.value} condition for ${equipments?.value} equipments`;
  console.log("Action name: ", action_name);
  // Create the action structure.
  const structure: ActionStructureParams = {
    org_id: organization_id,
    trigger_value: condition_value?.value,
    condition: defaultCondition,
    group_id: undefined,
    type: type?.value,
    variable: condition?.value,
    device: scope[0].device,
    message: message?.value,
    description: action_name,
    script: script_id,
    send_to: users.value,
  };
  // creating action for each device
  const action_structure = await generateActionStructure(structure, device_list as string[]);
  const { action: action_id } = await account.actions.create(action_structure).catch((error) => {
    void validate(error, "danger");
    throw error;
  });

  // Store the data in the device, so we can see and edit it in the Dynamic Table.
  // It's very important that the group is the action ID, so we can use it to edit/delete later.
  const data_to_tago: DataToSend[] = parseTagoObject(
    {
      action_list_variable: { value: condition?.value, metadata: structure },
      action_list_condition: defaultCondition,
      action_list_value: `${condition_value?.value}`,
      action_list_type: { value: type?.value, metadata: type?.metadata },
      action_list_sendto: { value: users.value, metadata: users.metadata },
      action_list_message: message?.value,
    },
    action_id
  );

  data_to_tago.push({ variable: "action_list_devices", value: device_list.values.toString(), group: action_id });

  await devToStoreAlert.sendData(data_to_tago);
  await devToStoreAlert.sendData({ variable: "action_validation", value: "#ALC.CREATE_SUCCESS#", metadata: { type: "success" } });
  if (structure.variable === "geofence") {
    await geofenceAlertCreate(account, devToStoreAlert, action_id, structure);
  } else if (structure.variable === "checkin") {
    await checkinAlertSet(account, action_id, structure.trigger_value as number, device_list);
  }
}

export { createAlert, generateActionStructure, ActionStructureParams };
