import { Resources } from "@tago-io/sdk";
import { RouterConstructor } from "@tago-io/sdk/lib/modules/Utils/router/router.types";
import { Data } from "@tago-io/sdk/lib/types";

import { fetchDeviceList } from "../../lib/fetch-device-list";
import { ackAlert } from "./acknowledge";

/**
 * Extracts the button details from the environment object.
 * @param {Object} enviroment - The environment object containing the button_id and user_id.
 * @returns {Object} - An object containing the alertID, userID, and notificationID.
 * @throws {Error} - Throws an error if alertID, userID, or notificationID is missing.
 */

function getButtonDetails(enviroment: { [key: string]: any }) {
  const btnID = enviroment.button_id;
  const alertID = btnID.split("-")[2];

  const userID = enviroment.user_id;
  const notificationID = enviroment.notification_id;

  if (!alertID || !userID || !notificationID) {
    throw new Error("Alert ACK: Missing parameters");
  }

  return { alertID, userID, notificationID };
}

/**
 * Register an alert for a specific environment and scope.
 * @param {RouterConstructor & { scope: Data[] }} options - The options object containing the environment and scope.
 * @returns {Promise<void>} - A promise that resolves when the alert is registered.
 */
async function ackAlertNotificationBtn({ environment }: RouterConstructor & { scope: Data[] }) {
  // Scope is expected to be null
  const btnDetails = getButtonDetails(environment);
  const userInfo = await Resources.run.userInfo(btnDetails.userID);

  const organizationID = userInfo.tags.find((x) => x.key === "organization_id")?.value;
  const userSites = await fetchDeviceList({ tags: [{ key: "organization_id", value: organizationID }] });

  let alertData: Data | undefined;
  for (const site of userSites) {
    const [siteData] = await Resources.devices.getDeviceData(site.id, { variables: ["alert_log"], groups: btnDetails.alertID, qty: 1 });
    if (siteData) {
      alertData = siteData;
      break;
    }
  }

  if (!alertData) {
    throw new Error(`Alert ACK: Alert not found for user ${btnDetails.userID}`);
  }
  environment._user_id = btnDetails.userID;
  await ackAlert({ environment, scope: [alertData] });
}

export { ackAlertNotificationBtn };
