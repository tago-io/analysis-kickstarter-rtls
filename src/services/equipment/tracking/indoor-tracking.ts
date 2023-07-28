import { Account, Device } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { DeviceInfo } from "@tago-io/sdk/out/modules/Account/devices.types";

import { parseTagoObject } from "../../../lib/data.logic";
import { DataResolver } from "../../../lib/edit.data";
import getDevice from "../../../lib/getDevice";

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
  return parseTagoObject(
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
  return parseTagoObject({
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
async function getBeaconList(siteDev: Device, scope: Data[]) {
  const beaconListRaw = await siteDev.getData({ variables: "beacon_id", qty: 9999 });
  console.log("scope", scope);
  console.log("beaconListRaw", beaconListRaw);

  const beaconListFromSite = beaconListRaw.map((x) => ({
    ...x,
    value: (x.value as string).toUpperCase(),
    // we slice the MAC because usually the payload only report first 6 letters of the MAC
    sliced: (x.value as string).slice(6).toUpperCase(),
  }));
  console.log("beaconListFromSite", beaconListFromSite);
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

async function getIndoorPos(account: Account, scope: Data[], enviroment: any, orgDev: Device, siteDev: Device, siteID: string, equipmentID: string) {
  const beaconsReceived = await getBeaconList(siteDev, scope);
  const [strongest_beacon] = beaconsReceived.sort((a, b) => b.rssi - a.rssi);
  if (!strongest_beacon) {
    throw console.error("No beacon found in the data sent by the device!");
  }

  const layers_list = await siteDev.getData({ variables: "layers", qty: 9999 });
  const room_list = await siteDev.getData({ variables: "beacon_room", qty: 9999 });

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

  const equipmentInfo = await account.devices.info(equipmentID);
  // const equip_img = equipmentInfo.tags.find((x) => x.key === "equip_img")?.value;

  const { name: site_name } = await siteDev.info();

  const assetInfo = getAssetInfoInside(scope, beaconPosition, enviroment, siteID, equipmentInfo, layer, room, site_name);
  const assetHistory = getAssetHistoryInside(beaconPosition, equipmentInfo, layer, room, site_name);

  // checking if device was previously inside
  const [previously_inside] = await siteDev.getData({ variables: "equipment_location", qty: 1, groups: equipmentID });
  // if it already was inside, just edit the previous variables metadata, else delete the previous location and sends a new one
  if (previously_inside) {
    await DataResolver(siteDev)
      .setVariable({
        variable: "equipment_location",
        metadata: { ...previously_inside.metadata, x: beaconPosition.x, y: beaconPosition.y },
      })
      .apply(equipmentID);
  } else {
    // remove previous outside location data, add new inside location data
    await siteDev.deleteData({ variables: ["equipment_outside_location"], groups: equipmentID, qty: 1 });
    await orgDev.deleteData({ variables: ["equipment_outside_location"], groups: equipmentID, qty: 1 });
    await siteDev.sendData(assetInfo);
    await orgDev.sendData(assetInfo);
  }
  //always send assethistory
  await siteDev.sendData(assetHistory);

  const device = await getDevice(account, scope[0].device);
  //await device.deleteData({ variables: "layers" });
  await device.sendData(assetInfo.concat(assetHistory));

  return;
  //return { coordinates: { lat: Number(beaconPosition.x), lng: Number(beaconPosition.y) }, device_id: scope[0].device };
}

export { getIndoorPos, getAssetHistoryInside, getAssetInfoInside };
