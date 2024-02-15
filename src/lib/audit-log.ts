import { Resources } from "@tago-io/sdk";
import { DeviceListScope, UserListScope } from "@tago-io/sdk/lib/modules/Utils/router/router.types";
import { Data } from "@tago-io/sdk/lib/types";

import { getLinkedDeviceID } from "./find-resource";
import { IReplaceObj, replaceObj } from "./replace-obj";

type LogType = "create" | "update" | "remove";
/**
 * Generate a function for Auditlog.
 * Example:
 *   const auditlog = await initializeAuditlog(scope[0].device);
 *   await auditlog("#LOG.ERROR", environment._user_id);
 * @param deviceID
 * @param log_variable
 * @returns
 */
async function initializeAuditLog(deviceID: string, log_variable: string = "auditlog") {
  const auditLogDeviceID = await getLinkedDeviceID(deviceID, "organization-logs");

  return async function _(type: LogType, description: string, user_id?: "system" | string) {
    if (!description) {
      throw "Missing Auditlog description";
    }

    let name = "#LOG.S_ADMIN#";

    if (user_id === "system") {
      name = "#LOG.SYSTEM#";
    } else if (user_id) {
      const user = await Resources.run.userInfo(user_id).catch(() => null);
      if (user && user.email) {
        name = `${user.name} (${user.email})`;
      }
    }

    await Resources.devices.sendDeviceData(auditLogDeviceID, {
      variable: log_variable,
      value: user_id || "#LOG.S_ADMIN#",
      metadata: { label: name, description, type },
      group: String(Date.now()),
    });
    return description;
  };
}

type ValueType = string | number | boolean | undefined;
/** [EditedItem, newValue, oldValue]*/
type EditedValues = [string, ValueType, ValueType];
function _getValuesFromDevice(scope: DeviceListScope[], replacer: IReplaceObj) {
  const editedValues: EditedValues[] = [];
  const oldValues = scope[0].old;

  for (const key in scope[0]) {
    if (["device", "old"].includes(key)) {
      continue;
    }
    const currValue = scope[0][key];
    const oldValue = oldValues?.[key];

    editedValues.push([key, oldValue, currValue]);
  }

  return replaceObj(editedValues, replacer);
}

function _getValuesFromUser(scope: UserListScope[], replacer: IReplaceObj) {
  const editedValues: EditedValues[] = [];
  const oldValues = scope[0].old;

  for (const key in scope[0]) {
    if (["user", "old"].includes(key)) {
      continue;
    }
    const currValue = scope[0][key];
    const oldValue = oldValues?.[key];

    editedValues.push([key, oldValue, currValue]);
  }

  return replaceObj(editedValues, replacer);
}

function _getValuesFromData(scope: Data[], replacer: IReplaceObj) {
  const editedValues: EditedValues[] = [];

  for (const item of scope) {
    const currValue = String(item?.metadata?.label || item.value);
    const oldValue = item?.metadata?.old_value;

    editedValues.push([item.variable, oldValue, currValue]);
  }

  return replaceObj(editedValues, replacer);
}

/**
 * Create an edit log message
 * Example:
 *   const auditlog = await initializeAuditlog(scope[0].device);
 *   await auditlog("#LOG.ERROR", environment._user_id);
 * @param deviceID
 * @param log_variable
 * @returns
 */
function generateEditMessage(scope: UserListScope[] | Data[] | DeviceListScope[], replacer: IReplaceObj) {
  if (!Array.isArray(scope)) {
    scope = [scope];
  }

  let editedValues: EditedValues[] = [];
  if ("variable" in scope[0]) {
    editedValues = _getValuesFromData(scope as Data[], replacer);
  } else if ("device" in scope[0]) {
    editedValues = _getValuesFromDevice(scope as DeviceListScope[], replacer);
  } else if ("user" in scope[0]) {
    editedValues = _getValuesFromUser(scope as UserListScope[], replacer);
  }

  const message = editedValues.map((log) => `${log[0]}: ${log[1]} #LOG.TO# ${log[2]}`).join("; ");
  return message;
}

const privateAuditLogFunctions = { _getValuesFromData, _getValuesFromUser, _getValuesFromDevice };
export { initializeAuditLog, generateEditMessage, privateAuditLogFunctions };
