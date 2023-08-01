import { Account, Utils } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { DataToSend } from "@tago-io/sdk/out/modules/Device/device.types";

import { parseTagoObject } from "../../lib/data.logic";
import { fetchDeviceList } from "../../lib/fetch-device-list";
import { findAnalysisByExportID } from "../../lib/findResource";
import { getZodError } from "../../lib/get-zod-error";
import validation from "../../lib/validation";
import { ServiceParams } from "../../types";
import { geofenceAlertCreate } from "./GeofenceAlert";
import { registerAlertModel } from "./models/alert.model";

interface ActionStructureParams {
  name: string;
  site_id: string;
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

async function getGroupDevices(account: Account, group_id: string, groupKey: string = "group_id") {
  const list = await fetchDeviceList(account, {
    tags: [
      { key: groupKey, value: group_id },
      { key: "device_type", value: "device" },
    ],
  });

  return list.map((x) => x.id);
}

function generateActionStructure(structure: ActionStructureParams, device_ids: string[]) {
  const action_structure: any = {
    active: true,
    name: structure.name,
    tags: [
      { key: "group_id", value: structure.group_id || "N/A" },
      { key: "site_id", value: structure.site_id },
      { key: "device", value: structure.device },
      { key: "description", value: structure.description || "" },
      { key: "send_to", value: structure.send_to.replaceAll(" ", "") },
      { key: "action_type", value: structure.type.replaceAll(" ", "") },
      { key: "type", value: structure.trigger_value },
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
        second_value: "",
      });

      if (structure.type !== "><") {
        action_structure.trigger.push({
          is: reverseCondition(structure.condition),
          unlock: true,
          value: String(structure.trigger_value),
          value_type,
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

async function getNewAlertVariables(scope: Data[], validate: ReturnType<typeof validation>) {
  const name = scope.find((x) => x.variable === "new_alert_name");
  const condition = scope.find((x) => x.variable === "new_alert_condition"); // Battery or Geofence
  const equipments = scope.find((x) => x.variable === "new_alert_equip" && x.metadata);
  const condition_value = scope.find((x) => x.variable === "new_alert_value" && x.metadata); // Battery number or geofence leave/enter
  const type = scope.find((x) => x.variable === "new_alert_type" && x.metadata);
  const users = scope.find((x) => x.variable === "new_alert_send_to");
  const message = scope.find((x) => x.variable === "new_alert_message");

  try {
    return registerAlertModel.parse({
      name,
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
  const site_dev = await Utils.getDevice(account, scope[0].device);
  await site_dev.sendData({ variable: "action_validation", value: "#VAL.CREATING_ALERT#", metadata: { type: "warning" } });
  const validate = validation("alert_validation", site_dev);
  await validate("Registering...", "warning");
  const { name, condition, equipments, condition_value, type, users, message } = await getNewAlertVariables(scope, validate);

  const equipment_list = equipments.metadata.sentValues.map((equipment) => equipment.value);
  const device_list = await getDeviceIds(account, equipment_list);
  const script_id = await findAnalysisByExportID(account, "[TagoIO] - AlertTrigger");

  const action_description = `Action checks ${condition?.value} condition for ${equipments?.value} equipments`;
  let defaultCondition = "<";
  if (condition?.value == "geofence") {
    defaultCondition = "=";
  }

  const structure: ActionStructureParams = {
    name: name?.value,
    site_id: scope[0].device,
    trigger_value: condition_value?.value,
    condition: defaultCondition,
    group_id: undefined,
    type: type?.value,
    variable: condition?.value,
    device: scope[0].device,
    message: message?.value,
    description: action_description,
    script: script_id,
    send_to: users.value,
  };

  const action_structure = await generateActionStructure(structure, device_list as string[]);
  const { action: action_id } = await account.actions.create(action_structure).catch((error) => {
    void validate(error, "danger");
    throw error;
  });

  // Store the data in the device, so we can see and edit it in the Dynamic Table.
  // It's very important that the group is the action ID, so we can use it to edit/delete later.
  const data_to_tago: { [key: string]: any } = {
    alert_name: { value: name?.value },
    alert_condition: condition?.value,
    alert_value: `${condition_value?.value}`,
    alert_equip: equipments?.value,
    alert_type: { value: type?.value, metadata: type?.metadata },
    alert_send_to: { value: users.value, metadata: users.metadata },
    alert_message: message?.value,
    alert_id: {
      value: condition.value,
      group: action_id,
      metadata: structure,
    },
  };

  if (condition.value === "geofence") {
    const type = condition_value.value as string;
    const color = type.includes("enter geofence") && type.includes("leave geofence") ? "blue" : type.includes("enter geofence") ? "green" : "pink";
    data_to_tago.geofence_events = { value: name.value, metadata: { color } };
  }

  const to_tago = parseTagoObject(data_to_tago, action_id);

  const list_of_devices = JSON.stringify(device_list.map((device) => device));
  to_tago.push({ variable: "alert_list_devices", value: list_of_devices, group: action_id });

  await site_dev.sendData(to_tago);
  await site_dev.sendData({ variable: "action_validation", value: "#ALC.CREATE_SUCCESS#", metadata: { type: "success" } });
  if (structure.variable === "geofence") {
    await geofenceAlertCreate(site_dev, action_id, structure);
  }
  await validate("Alert created!", "success");
}

export { createAlert, generateActionStructure, ActionStructureParams, getGroupDevices };
