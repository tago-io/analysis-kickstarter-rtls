import { Resources } from "@tago-io/sdk";

import { IAlertModel } from "../alert.model";

/**
 * Function to get alert details
 * @param action_id The ID of the action
 * @returns Object containing alert details
 */
async function getAlertDetails(action_id: string) {
  const action_info = await Resources.actions.info(action_id);
  if (!action_info.tags) {
    throw new Error("action_info.tags not found");
  } else if (!action_info.trigger) {
    throw new Error("action_info.trigger not found");
  }

  const siteID = action_info.tags.find((x) => x.key === "site_id")?.value as string;
  const actionGroupID = action_info.tags.find((x) => x.key === "group_id")?.value as string;
  const alert_type = (action_info.tags.find((x) => x.key === "trigger_id")?.value as string).split("-")[0];

  if (!siteID) {
    throw new Error("Alert Details: site_id not found");
  }

  const [alertData] = await Resources.devices.getDeviceData(siteID, { variables: ["alert"], groups: actionGroupID });

  const alertSettings = { ...alertData?.metadata, group: alertData?.group } as IAlertModel & { group: string };
  if (!alertData) {
    throw new Error("Alert variable not found");
  }

  const contactGroups = alertSettings.recipients.map((x) => x.value);
  if (contactGroups?.length == 0) {
    throw new Error("contactGroups not found");
  }

  // Get action message
  const orgID = action_info.tags.find((x) => x.key === "organization_id")?.value;
  const triggerID = action_info.tags.find((x) => x.key === "trigger_id")?.value;
  const variable = action_info.tags.find((x) => x.key === "variable")?.value;
  const equipmentID = action_info.tags.find((x) => x.key === "equipment_id")?.value;
  const trigger = alertSettings.triggers.find((x) => x.id === triggerID);

  if (!orgID || !triggerID || !trigger || !variable || !equipmentID || !alertData.group || !alert_type) {
    throw new Error("Alert Details: Missing required fields");
  }

  return {
    variable,
    equipmentID,
    contactGroups,
    orgID,
    siteID,
    trigger,
    notificationType: alertSettings.notificationType,
    alertGroup: actionGroupID,
    alert_type,
  };
}

export { getAlertDetails };
