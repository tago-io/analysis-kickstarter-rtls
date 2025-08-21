import { Resources } from "@tago-io/sdk";
import { Data, DeviceInfo, TagoContext } from "@tago-io/sdk/lib/types";

import { parseObjectToTago } from "../../../lib/parse-object-to-tagoio";
import { verifyGeofenceAlarm } from "../../alerts/verifyGeofenceAlert";
import { Geofence } from "../../device/is-inside-indoor-geofence";
import { estimateDevicePosition, Beacon as TriangulationBeacon, DeviceData, TrilaterationOptions } from "./triangulation";

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
          // url: `https://admin.tago.io/dashboards/info/${enviroment.dash_site}?site_dev=${site_id}&asset_dev=${scope[0].device}`,
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

  const beaconsReceived: Beacon[] = Object.keys(beaconFromScope).reduce((final: Beacon[], beaconKey) => {
    const beacon_data = beaconListFromSite.find((y) => y.value.toLowerCase() === beaconKey || beaconKey === y.sliced.toLowerCase());
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
  
  // Fetch individual triangulation configuration variables
  const triangulation_variables = await Resources.devices.getDeviceData(siteID, { 
    variables: [
      "defaulttxpowerat1m",
      "defaultpathlossexponent", 
      "metersperunit",
      "outputscale",
      "clamptounitsquare",
      "minbeaconsfortrilateration",
      "mindistanceunits"
    ], 
    qty: 1 
  });

  let finalPosition: { x: string; y: string; value: string; color: string; icon: string } | undefined;
  let layer: Data | undefined;
  let room: Data | undefined;

  // Try triangulation first
  try {
    const triangulationBeacons: TriangulationBeacon[] = [];
    
    // Build beacon positions from layers data
    for (const layerItem of layers_list) {
      if (layerItem.metadata?.fixed_position) {
        const positions = layerItem.metadata.fixed_position;
        Object.keys(positions).forEach(key => {
          const beacon = beaconsReceived.find(b => key === `${siteID}${b.group}`);
          if (beacon) {
            const position = positions[key];
            triangulationBeacons.push({
              id: beacon.id,
              x: parseFloat(position.x) / 100, // Convert to normalized coordinates
              y: parseFloat(position.y) / 100,
              room: 'all' // Use same room for all beacons to enable cross-room triangulation
            });
          }
        });
      }
    }

    const deviceData: DeviceData = {
      beacons: beaconsReceived.map(b => ({ id: b.id, rssi: b.rssi }))
    };

    // Helper function to get variable value by name
    const getVariableValue = (varName: string, defaultValue: any) => {
      const variable = triangulation_variables.find(v => v.variable === varName);
      return variable?.value !== undefined ? variable.value : defaultValue;
    };

    // Build triangulation options from individual site variables
    const triangulationOptions: TrilaterationOptions = {
      defaultTxPowerAt1m: getVariableValue('defaulttxpowerat1m', -59),
      defaultPathLossExponent: getVariableValue('defaultpathlossexponent', 2.0),
      metersPerUnit: getVariableValue('metersperunit', 1),
      outputScale: getVariableValue('outputscale', 'percent') as 'normalized' | 'percent',
      clampToUnitSquare: getVariableValue('clamptounitsquare', true),
      minBeaconsForTrilateration: getVariableValue('minbeaconsfortrilateration', 3),
      minDistanceUnits: getVariableValue('mindistanceunits', 0.01)
    };

    const triangulationResult = estimateDevicePosition(deviceData, triangulationBeacons, triangulationOptions);

    if (triangulationResult) {
      // Use triangulation result
      finalPosition = {
        x: triangulationResult.x.toString(),
        y: triangulationResult.y.toString(),
        value: `Triangulated position`,
        color: '#4CAF50',
        icon: 'location'
      };
      
      // Find corresponding layer and room for the triangulated position
      const usedBeaconId = triangulationResult.usedBeacons[0];
      const usedBeacon = beaconsReceived.find(b => b.id === usedBeaconId);
      if (usedBeacon) {
        const fixed_position_key = `${siteID}${usedBeacon.group}`;
        layer = layers_list.find((x) => x?.metadata?.fixed_position?.[fixed_position_key]);
        room = room_list.find((x) => x.group == usedBeacon.group);
      }
    }
  } catch (error) {
    console.warn("Triangulation failed, falling back to strongest beacon:", error);
  }

  // Fall back to strongest beacon if triangulation failed
  if (!finalPosition) {
    const fixed_position_key = `${siteID}${strongest_beacon.group}`;
    layer = layers_list.find((x) => x?.metadata?.fixed_position?.[fixed_position_key]);
    room = room_list.find((x) => x.group == strongest_beacon.group);

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

    finalPosition = beaconPosition;
  }

  // Ensure we have layer and room data
  if (!layer || !room) {
    throw console.error("Could not determine layer or room for position!");
  }

  const equipmentInfo = await Resources.devices.info(equipmentID);
  const { name: site_name } = await Resources.devices.info(siteID);

  const assetInfo = getAssetInfoInside(scope, finalPosition, enviroment, siteID, equipmentInfo, layer, room, site_name);
  const assetHistory = getAssetHistoryInside(finalPosition, equipmentInfo, layer, room, site_name);

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
      pos_x: Number(finalPosition.x),
      pos_y: Number(finalPosition.y),
      layerBeacon: layer.group as string,
      geofence_list,
    },
    scope
  );
}

export { getIndoorPos, getAssetHistoryInside, getAssetInfoInside };
