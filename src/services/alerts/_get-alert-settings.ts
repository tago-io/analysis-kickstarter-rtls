import { Resources } from "@tago-io/sdk";

interface IAlertSettings {
  /**
   * Unique identifier for the alert.
   */
  id: string;
  /**
   * Variable for the action.
   */
  variable: string;
  /**
   * Type of the alert, that will be presented to the user.
   */
  type: "checkbox" | "dropdown" | "number";
  /**
   * Label for the alert on the user screen.
   */
  label: string;
  /**
   * Default value for the alert.
   */
  value: boolean | string | number;
  /**
   * Optional: Array of values for dropdown type alerts.
   */
  values?: (string | number)[];
  /**
   * Optional: Default selected value for dropdown type alerts.
   */
  selected?: string;
  /**
   * Optional: Minimum value for number type alerts.
   */
  min?: number;
  /**
   * Optional: Maximum value for number type alerts.
   */
  max?: number;
  /**
   * Condition for the alert.
   * Example: ">", "<", ">=", "<=", "=", "!", "*"
   */
  condition: string;
  formula?: string;
  connector: string;
}
/**
 * Get alert settings for a specific configuration and device.
 * @param {string} configID - The ID of the configuration.
 * @param {string} deviceID - The ID of the device.
 * @param {string} [connector] - Optional connector value.
 * @returns {Promise<IAlertSettings[]>} - The alert settings for the specified configuration and device.
 */
async function getAlertSettings(configID: string, deviceID: string, connectorList?: string[]) {
  if (!connectorList) {
    const deviceInfo = await Resources.devices.info(deviceID);
    connectorList = deviceInfo?.tags?.filter((x) => x.key === "connector_id").map((x) => x.value);
  }

  if (connectorList.length === 0) {
    throw new Error("Connector not found");
  }

  if (!configID) {
    throw new Error("Device Config ID not found");
  }

  const alertSettings = await Resources.devices.getDeviceData(configID, { variables: "alert_settings", groups: connectorList });

  return alertSettings.flatMap((setting) => setting.metadata?.alertList.map((x: IAlertSettings) => ({ ...x, connector: setting.group })));
}

export { getAlertSettings, IAlertSettings };
