import { Utils, Device, Account, Analysis } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { parseTagoObject } from "../lib/data.logic";
import getDevice from "../lib/getDevice";
import { TagoContext } from "../types";

interface BeaconLocationData {
  device?: string;
  embed?: string;
  id?: string;
  strongest_rssi?: number;
  link_type: string;
  value: string;
  x: string;
  y: string;
}

interface Beacon {
  id: string;
  rssi: number;
  x?: number;
  y?: number;
  layer_id?: string;
  group?: string;
}

interface DataWithSlice extends Data {
  sliced?: string;
}

function getAssetInfoInside(
  scope: Data[],
  strongest_beacon: Beacon,
  enviroment: any,
  site_id: string,
  equipment: Data,
  layer: Data,
  site_name: string,
  equip_icon: Data,
  equip_img: Data
) {
  return parseTagoObject(
    {
      equipment_location: {
        value: equipment?.metadata?.label,
        metadata: {
          layer: layer.group,
          x: strongest_beacon.x,
          y: strongest_beacon.y,
          site_name,
          floor_name: layer.value,
          site_id,
          layer_id: layer.id,
          icon: equip_icon ? equip_icon.value : null,
          url: `https://admin.tago.io/dashboards/info/${enviroment.dash_site}?site_dev=${site_id}&asset_dev=${scope[0].device}`,
          img_pin: equip_img?.value,
        },
      },
      // equipment_site: site_id,
    },
    equipment.group
  );
}

function getAssetHistoryInside(strongest_beacon: Beacon, equipment: Data, layer: Data, site_name: string, equip_icon: Data) {
  return parseTagoObject({
    asset_history: {
      value: equipment.metadata?.label,
      metadata: {
        layer: layer.group,
        x: strongest_beacon.x,
        y: strongest_beacon.y,
        site: site_name,
        floor: layer.value,
        layer_id: layer.id,
        icon: equip_icon ? equip_icon.value : null,
      },
    },
  });
}

function getPlotBasicImageMarker(scope: Data[], layer: Data) {
  return parseTagoObject(
    {
      layers: {
        ...layer,
        metadata: {
          ...layer.metadata,
          fixed_position: {
            [`${scope[0].device}`]: {
              value: "Offset",
              x: "0.00",
              y: "0.00",
            },
          },
        },
      },
    },
    layer.group
  );
}

function getAssetInfoOutside(equipment: Data, outdoor_data: any, equip_img: Data) {
  return parseTagoObject(
    {
      equipment_outside_location: {
        value: equipment.metadata?.label,
        location: {
          lat: outdoor_data?.location?.coordinates[0],
          lng: outdoor_data?.location?.coordinates[1],
        },
        metadata: {
          img_pin: equip_img?.value,
        },
      },
    },
    equipment.group
  );
}

function getAssetHistoryOutside(equipment: Data) {
  return parseTagoObject({
    asset_history: {
      value: equipment.metadata?.label,
      metadata: {
        site: "Equipment is Outdoor",
        floor: "Equipment is Outdoor",
      },
    },
  });
}

async function getIndoorPos(account: Account, scope: Data[], enviroment: any, org_dev: Device, site_dev: Device, site_id: string, equipment: Data) {
  let beacon_list = (await site_dev.getData({ variables: "beacon_id", qty: 9999 })) as DataWithSlice[];
  beacon_list = beacon_list.map((x) => ({
    ...x,
    value: (x.value as string).toUpperCase(),
    sliced: (x.value as string).slice(6).toUpperCase(),
  }));
  console.log("beacon_list", beacon_list); // deleta dps
  let beacons_received: Beacon[] = scope.reduce((final: any, data) => {
    const beacon_data = beacon_list.find((y) => y.value == data.variable || data.variable == y.sliced);
    if (!beacon_data) {
      return final;
    }
    final.push({ id: beacon_data.value as string, rssi: data.value as number, group: beacon_data.group });
    return final;
  }, []);

  const [strongest_beacon] = beacons_received.sort((a, b) => b.rssi - a.rssi);
  if (!strongest_beacon) {
    return console.error("No beacon found in the data sent by the device!");
  }

  const layers_list = await site_dev.getData({ variables: "layers", qty: 9999 });

  // Find layer with the most strongest beacon
  const fixed_position_key = `${site_id}${strongest_beacon.group}`;
  const layer = layers_list.find((x) => (x?.metadata as any)?.fixed_position[fixed_position_key]);
  if (!layer) {
    return console.error("No beacon found in the layer!");
  }

  // Get Layer scales

  // only the last beacon position matter (to fix)
  beacons_received = beacons_received.map((item) => {
    const key = `${site_id}${item.group}`;
    const beacon_layer = (layer.metadata as any).fixed_position[key] as BeaconLocationData;
    item.x = Number(beacon_layer.x);
    item.y = Number(beacon_layer.y);
    item.layer_id = layer.group;
    return item;
  });

  const { name: site_name } = await site_dev.info();

  const [equip_icon] = await org_dev.getData({ variables: "equip_img_icon", groups: `ET${equipment?.metadata?.type}` });
  const [equip_img] = await site_dev.getData({ variables: "equip_img", groups: equipment?.group });

  const assetInfo = getAssetInfoInside(scope, strongest_beacon, enviroment, site_id, equipment, layer, site_name, equip_icon, equip_img);

  const assetHistory = getAssetHistoryInside(strongest_beacon, equipment, layer, site_name, equip_icon);

  const plotBasicImageMarker = getPlotBasicImageMarker(scope, layer);

  await site_dev.deleteData({ variables: ["equipment_location", "equipment_outside_location"], groups: equipment.group, qty: 9999 });
  await site_dev.sendData(assetInfo.concat(assetHistory));
  // await site_dev.sendData(assetHistory);

  await org_dev.deleteData({ variables: ["equipment_location"], groups: equipment.group, qty: 9999 });
  await org_dev.sendData(assetInfo);

  const device = await getDevice(account, scope[0].device);
  await device.deleteData({ variables: "layers" });
  await device.sendData(assetInfo.concat(assetHistory, plotBasicImageMarker));
  return;
}

async function outdoorData(scope: Data[], site_dev: Device, equipment: Data) {
  const outdoor_data = scope.find((x) => x?.location) as any; //as any tagoIO issue -> location coordinates/lat,lng

  if (!outdoor_data && !outdoor_data?.location?.coordinates[0]) {
    return false;
  }

  const [equip_img] = await site_dev.getData({ variables: "equip_img", groups: equipment?.group });

  const assetInfo = getAssetInfoOutside(equipment, outdoor_data, equip_img);

  const assetHistory = getAssetHistoryOutside(equipment);

  await site_dev.deleteData({ variables: ["equipment_outside_location", "equipment_location"], groups: equipment.group });
  await site_dev.sendData(assetInfo.concat(assetHistory));

  return true;
}

async function updateAsset(context: TagoContext, scope: Data[]) {
  context.log("Running Analysis");
  const environment = Utils.envToJson(context.environment);
  if (!environment) {
    return;
  } else if (!environment.config_token) {
    throw "Missing config_token environment var";
  } else if (!environment.account_token) {
    throw "Missing account_token environment var";
  }

  const account = new Account({ token: environment.account_token });
  //asset device info
  const device_id = scope[0].device;
  const { tags } = await account.devices.info(device_id);

  const equipment_id = tags.find((x) => x.key === "equipment_id")?.value;
  if (!equipment_id) {
    return context.log("Device is not paired with an equipment");
  }
  const organization = tags.find((x) => x.key === "organization_id")?.value;
  if (!organization) {
    return context.log("Device not assigned to an Organization");
  }

  const org_dev = await getDevice(account, organization);

  //getting the org_dev through the tag
  const site_id = tags.find((x) => x.key === "site_id")?.value;

  if (!site_id) {
    throw "Device not assigned to a Site";
  }

  const site_dev = await getDevice(account, site_id);

  const [equipment] = await site_dev.getData({ variables: ["equip_group"], groups: equipment_id });

  if (await outdoorData(scope, site_dev, equipment)) {
    return;
  }

  await getIndoorPos(account, scope, environment, org_dev, site_dev, site_id, equipment);

  context.log("Analysis Finished");
}

async function startAnalysis(context: TagoContext, scope: any) {
  try {
    await updateAsset(context, scope);
  } catch (error: any) {
    console.log(error);
    context.log(error.message || JSON.stringify(error));
  }
}

if (!process.env.T_TEST) {
  Analysis.use(startAnalysis, { token: process.env.T_ANALYSIS_TOKEN });
}

export { getAssetInfoInside, getAssetHistoryInside, getPlotBasicImageMarker, getAssetInfoOutside, getAssetHistoryOutside, startAnalysis };
