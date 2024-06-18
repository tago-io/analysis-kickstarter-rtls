import { Resources } from "@tago-io/sdk";
import { Data, DeviceInfo } from "@tago-io/sdk/lib/types";

import { DataResolver } from "../../../lib/edit.data";
import { parseObjectToTago } from "../../../lib/parse-object-to-tagoio";
import { verifyGeofenceAlarm } from "../../alerts/verifyGeofenceAlert";
import { Geofence } from "../../device/is-inside-indoor-geofence";

function getAssetInfoOutside(equipment: DeviceInfo, outdoor_data: Data, equip_img?: string) {
  return parseObjectToTago(
    {
      equipment_outside_location: {
        value: equipment.name,
        location: {
          lat: outdoor_data?.location?.coordinates[1],
          lng: outdoor_data?.location?.coordinates[0],
        },
        metadata: {
          temperature: " 31.8",
          light: " 90",
          img_pin: equip_img,
        },
      },
    },
    equipment.id
  );
}

async function outdoorData(scope: Data[], site_id: string, equipmentID: string) {
  const outdoor_data = scope.find((x) => x?.location) as any; //as any tagoIO issue -> location coordinates/lat,lng

  // checking if device is outside
  if (!outdoor_data && !outdoor_data?.location?.coordinates[0]) {
    return false;
  }

  const equipmentInfo = await Resources.devices.info(equipmentID);
  const equip_img = equipmentInfo.tags.find((x) => x.key === "equip_img")?.value;
  const assetInfo = getAssetInfoOutside(equipmentInfo, outdoor_data, equip_img);

  // checking if device was previously inside
  const [previously_inside] = await Resources.devices.getDeviceData(site_id, { variables: "equipment_location", qty: 1, groups: equipmentID });

  // Edit equipment_outside_location if already outside
  if (previously_inside) {
    await Resources.devices.deleteDeviceData(site_id, { variables: ["equipment_location"], groups: equipmentID });
    await Resources.devices.sendDeviceData(site_id, assetInfo);
  } else {
    await Resources.devices.sendDeviceData(site_id, {
      variable: "equipment_outside_location",
      value: equipmentInfo.name,
      location: outdoor_data.location,
      group: equipmentID,
    });
  }

  const geofence_list = (await Resources.devices.getDeviceData(site_id, { variables: "geofence_outdoor", qty: 9999 })).map((x) => ({
    ...x.metadata,
    id: x.group,
  })) as Geofence[];

  await verifyGeofenceAlarm(
    site_id,
    {
      deviceID: scope[0].device,
      pos_x: Number(outdoor_data?.location?.coordinates[1]),
      pos_y: Number(outdoor_data?.location?.coordinates[0]),
      geofence_list,
    },
    scope
  );

  return true;
}

export { outdoorData, getAssetInfoOutside };
