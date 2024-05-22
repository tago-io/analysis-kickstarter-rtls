import { Resources } from "@tago-io/sdk";

import { fetchDeviceList } from "../../../lib/fetch-device-list";

/**
 * Function to get equipment details
 * @param sensorID The ID of the sensor
 * @returns Object containing equipment details
 */
async function getEquipmentDetails(sensorID: string) {
  const [equipment] = await fetchDeviceList({
    tags: [
      { key: "device_type", value: "equipment" },
      { key: "equipment_id", value: sensorID },
    ],
  });

  if (!equipment) {
    throw new Error("Equipment not found");
  }

  const sensorInfo = await Resources.devices.info(sensorID);
  return {
    name: equipment.name,
    id: equipment.id,
    sensor_type: sensorInfo?.tags?.find((x) => x.key === "sensor_type")?.value,
  };
}

export { getEquipmentDetails };
