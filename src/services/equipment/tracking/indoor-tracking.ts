import { Resources } from "@tago-io/sdk";
import { Data, DeviceInfo, TagoContext } from "@tago-io/sdk/lib/types";

import { parseObjectToTago } from "../../../lib/parse-object-to-tagoio";
import { verifyGeofenceAlarm } from "../../alerts/verifyGeofenceAlert";
import { Geofence } from "../../device/is-inside-indoor-geofence";

interface Beacon {
  id: string;
  rssi: number;
  x?: number;
  y?: number;
  layer_id?: string;
  group?: string;
}

interface BeaconPosition {
  color: string;
  icon: string;
  value: string;
  x: string;
  y: string;
}

function getAssetInfoInside(
  scope: Data[],
  strongest_beacon: BeaconPosition,
  enviroment: any,
  site_id: string,
  equipment: DeviceInfo,
  layer: Data,
  room: Data,
  site_name: string
) {
  return parseObjectToTago(
    {
      equipment_location: {
        value: equipment.name,
        metadata: {
          layer: layer.group,
          x: strongest_beacon.x,
          y: strongest_beacon.y,
          site_name,
          floor_name: layer.value,
          site_id,
          layer_id: layer.id,
          room_name: room.value,
          url: `https://admin.tago.io/dashboards/info/${enviroment.dash_site}?site_dev=${site_id}&asset_dev=${scope[0].device}`,
          temperature: " 24.3",
          light: " 22",
        },
      },
      // equipment_site: site_id,
    },
    equipment.id
  );
}

function getAssetHistoryInside(strongest_beacon: BeaconPosition, equipment: DeviceInfo, layer: Data, room: Data, site_name: string) {
  return parseObjectToTago({
    asset_history: {
      value: equipment.name,
      metadata: {
        layer: layer.group,
        x: strongest_beacon.x,
        y: strongest_beacon.y,
        site: site_name,
        floor: layer.value,
        room: room.value,
        layer_id: layer.id,
      },
    },
  });
}

/**
 * {
 *  metadata: {
 *   "ABAB": -12
 * }
 * }
 */
async function getBeaconList(site_id: string, scope: Data[]) {
  const beaconListRaw = await Resources.devices.getDeviceData(site_id, { variables: "beacon_id", qty: 9999 });

  const beaconListFromSite = beaconListRaw.map((x) => ({
    ...x,
    value: (x.value as string).toUpperCase(),
    // we slice the MAC because usually the payload only report first 6 letters of the MAC
    sliced: (x.value as string).slice(6).toUpperCase(),
  }));

  const beaconFromScope = scope.find((data) => data.variable === "beacons" || data.variable === "ble_scan" || data.variable === "wifi_scan")?.metadata; // might need to add ble_scan here
  if (!beaconFromScope || Object.keys(beaconFromScope).length === 0) {
    return [];
  }

  const beaconsReceived: Beacon[] = Object.keys(beaconFromScope).reduce((final: any, beaconKey) => {
    const beacon_data = beaconListFromSite.find((y) => y.value == beaconKey || beaconKey == y.sliced);
    if (!beacon_data) {
      return final;
    }

    final.push({ id: beacon_data.value, rssi: beaconFromScope[beaconKey] as number, group: beacon_data.group });
    return final;
  }, []);

  return beaconsReceived;
}

async function getIndoorPos(context: TagoContext, scope: Data[], enviroment: any, org_id: string, siteID: string, equipmentID: string) {
  const beaconsReceived = await getBeaconList(siteID, scope);
  const [strongest_beacon] = beaconsReceived.sort((a, b) => b.rssi - a.rssi);
  if (!strongest_beacon) {
    throw console.error("No beacon found in the data sent by the device!");
  }

  const layers_list = await Resources.devices.getDeviceData(siteID, { variables: "layers", qty: 9999 });
  const room_list = await Resources.devices.getDeviceData(siteID, { variables: "beacon_room", qty: 9999 });

  // Find layer with the most strongest beacon
  const fixed_position_key = `${siteID}${strongest_beacon.group}`;
  const layer = layers_list.find((x) => x?.metadata?.fixed_position?.[fixed_position_key]);
  const room = room_list.find((x) => x.group == strongest_beacon.group);

  if (!room) {
    throw console.error("No beacon found in the room!");
  }

  if (!layer) {
    throw console.error("No beacon found in the layer!");
  }

  const beaconPosition = layer?.metadata?.fixed_position?.[fixed_position_key];

  if (!beaconPosition) {
    throw console.error("No beacon found in the layer!");
  }

  const equipmentInfo = await Resources.devices.info(equipmentID);
  // const equip_img = equipmentInfo.tags.find((x) => x.key === "equip_img")?.value;

  const { name: site_name } = await Resources.devices.info(siteID);

  const assetInfo = getAssetInfoInside(scope, beaconPosition, enviroment, siteID, equipmentInfo, layer, room, site_name);
  const assetHistory = getAssetHistoryInside(beaconPosition, equipmentInfo, layer, room, site_name);

  // remove previous outside location data, add new inside location data
  await Resources.devices.deleteDeviceData(siteID, { variables: ["equipment_outside_location"], groups: equipmentID, qty: 1 });
  await Resources.devices.deleteDeviceData(org_id, { variables: ["equipment_outside_location"], groups: equipmentID, qty: 1 });
  await Resources.devices.sendDeviceData(siteID, assetInfo);
  await Resources.devices.sendDeviceData(org_id, assetInfo);
  //always send assethistory
  await Resources.devices.sendDeviceData(siteID, assetHistory);

  const dev_id = scope[0].device;
  //await device.deleteDeviceData({ variables: "layers" });
  await Resources.devices.sendDeviceData(dev_id, assetInfo.concat(assetHistory));

  const geofence_list = (await Resources.devices.getDeviceData(siteID, { variables: "geofence", qty: 9999 })).map((x) => ({
    ...x.metadata,
    id: x.group,
  })) as Geofence[];

  await verifyGeofenceAlarm(
    siteID,
    {
      deviceID: scope[0].device,
      pos_x: Number(beaconPosition.x),
      pos_y: Number(beaconPosition.y),
      layerBeacon: layer.group as string,
      geofence_list,
    },
    scope
  );
}

export { getIndoorPos, getAssetHistoryInside, getAssetInfoInside };
