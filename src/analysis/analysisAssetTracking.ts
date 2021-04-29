import { Analysis, Utils, Device, Account } from "@tago-io/sdk";
import axios from "axios";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { DataToSend } from "@tago-io/sdk/out/modules/Device/device.types";
import { DeviceListItem } from "@tago-io/sdk/out/modules/Account/devices.types";
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
  serie?: string;
}

interface DataWithSlice extends Data {
  sliced?: string;
}

async function getIndoorPos(account: Account, scope: Data[], org_dev: Device, site_dev: Device, site_id: string, equipment: Data) {
  let beacon_list = (await site_dev.getData({ variables: "beacon_id", qty: 9999 })) as DataWithSlice[];
  beacon_list = beacon_list.map((x) => ({
    ...x,
    value: (x.value as string).toUpperCase(),
    sliced: (x.value as string).slice(6).toUpperCase(),
  }));

  let beacons_received: Beacon[] = scope.reduce((final, data) => {
    data.variable = data.variable.toUpperCase();
    const beacon_data = beacon_list.find((y) => y.value == data.variable || data.variable == y.sliced);
    if (!beacon_data) return final;

    final.push({ id: beacon_data.value as string, rssi: data.value as number, serie: beacon_data.serie });
    return final;
  }, []);

  const [strongest_beacon] = beacons_received.sort((a, b) => b.rssi - a.rssi);
  if (!strongest_beacon) return console.log("No beacon found in the data sent by the device!");

  const layers_list = await site_dev.getData({ variables: "layers", qty: 9999 });

  // Find layer with the most strongest beacon
  const fixed_position_key = `${site_id}${strongest_beacon.serie}`;
  const layer = layers_list.find((x) => (x?.metadata as any)?.fixed_position[fixed_position_key]);
  if (!layer) return console.log("No beacon found in the layer!");

  // Get Layer scales

  //only the last beacon position matter (to fix)
  beacons_received = beacons_received.map((item) => {
    const key = `${site_id}${item.serie}`;
    const beacon_layer = (layer.metadata as any).fixed_position[key] as BeaconLocationData;
    item.x = Number(beacon_layer.x);
    item.y = Number(beacon_layer.y);
    item.layer_id = layer.serie;
    return item;
  });

  const { name: site_name } = await site_dev.info();

  const [equip_icon] = await org_dev.getData({ variables: "equip_img_icon", series: `ET${equipment?.metadata?.type}` });
  const [equip_img] = await site_dev.getData({ variables: "equip_img", series: equipment?.serie });

  const assetInfo = parseTagoObject(
    {
      equipment_location: {
        value: equipment?.metadata?.label as string,
        metadata: {
          layer: layer.serie,
          x: strongest_beacon.x, //
          y: strongest_beacon.y, //
          site_name,
          floor_name: layer.value,
          site_id,
          layer_id: layer.id,
          icon: equip_icon ? equip_icon.value : null,
          url: `https://admin.tago.io/dashboards/info/6061d65c060a6b00185359a8?site_dev=${site_id}&asset_dev=${scope[0].origin}`,
          img_pin: equip_img?.value,
        },
      },
      // equipment_site: site_id,
    },
    equipment.serie
  );

  const assetHistory = parseTagoObject({
    asset_history: {
      value: equipment.metadata.label as string,
      metadata: {
        layer: layer.serie,
        x: strongest_beacon.x, //
        y: strongest_beacon.y, //
        site: site_name,
        floor: layer.value,
        layer_id: layer.id,
        icon: equip_icon ? equip_icon.value : null,
      },
    },
  });

  const plotBasicImageMarker = parseTagoObject(
    {
      layers: {
        ...layer,
        metadata: {
          ...layer.metadata,
          fixed_position: {
            [`${scope[0].origin}`]: {
              value: "Offset",
              x: "0.00",
              y: "0.00",
            },
          },
        },
      },
    },
    layer.serie
  );

  await site_dev.deleteData({ variables: ["equipment_location", "equipment_outside_location"], series: equipment.serie, qty: 9999 });
  await site_dev.sendData(assetInfo.concat(assetHistory));
  // await site_dev.sendData(assetHistory);

  await org_dev.deleteData({ variables: ["equipment_location"], series: equipment.serie, qty: 9999 });
  await org_dev.sendData(assetInfo);

  const device = await getDevice(account, scope[0].origin);

  // const [device_marker] = await device.getData({ variables: "layers" });
  // if (device_marker?.value) {
  //   await device.sendData(assetInfo.concat(assetHistory, plotBasicImageMarker));
  // }
  await device.deleteData({ variables: "layers" });
  await device.sendData(assetInfo.concat(assetHistory, plotBasicImageMarker));

  console.log(strongest_beacon);

  return console.log("Indoor position processed!");
}

async function outdoorData(scope: Data[], site_dev: Device, equipment: Data) {
  const outdoor_data = scope.find((x) => x?.location) as any; //as any tagoIO issue -> location coordinates/lat,lng

  if (!outdoor_data && !outdoor_data?.location?.coordinates[0]) return false;

  const [equip_img] = await site_dev.getData({ variables: "equip_img", series: equipment?.serie });

  const assetInfo = parseTagoObject(
    {
      equipment_outside_location: {
        value: equipment.metadata.label as string,
        location: {
          lat: outdoor_data?.location?.coordinates[0],
          lng: outdoor_data?.location?.coordinates[1],
        },
        metadata: {
          img_pin: equip_img?.value,
        },
      },
    },
    equipment.serie
  );

  const assetHistory = parseTagoObject({
    asset_history: {
      value: equipment.metadata.label as string,
      metadata: {
        site: "Equipment is Outdoor",
        floor: "Equipment is Outdoor",
      },
    },
  });

  await site_dev.deleteData({ variables: ["equipment_outside_location", "equipment_location"], series: equipment.serie });
  await site_dev.sendData(assetInfo.concat(assetHistory));

  console.log("Outdoor position processed!");

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
  const config_dev = new Device({ token: environment.config_token });
  //asset device info
  const device_id = scope[0].origin;
  const { tags } = await account.devices.info(device_id);

  const equipment_id = tags.find((x) => x.key === "equipment_id")?.value as string;
  if (!equipment_id) return context.log("Device is not paired with an equipment");

  const organization = tags.find((x) => x.key === "organization_id")?.value as string;
  if (!organization) return context.log("Device not assigned to an Organization");

  const org_dev = await getDevice(account, organization);

  //getting the org_dev through the tag
  const site_id = tags.find((x) => x.key === "site_id")?.value as string;
  const site_dev = await getDevice(account, site_id);

  const [equipment] = await site_dev.getData({ variables: ["equip_serie"], series: equipment_id });

  if (await outdoorData(scope, site_dev, equipment)) return;

  await getIndoorPos(account, scope, org_dev, site_dev, site_id, equipment);

  context.log("Analysis Finished");
}

async function startAnalysis(context: TagoContext, scope: any) {
  try {
    await updateAsset(context, scope);
  } catch (error) {
    console.log(error);
    context.log(error.message || JSON.stringify(error));
  }
}

export { startAnalysis };

//asset data example

// [
//   {
//     "variable": "111",
//     "value": -80
//   },
//   {
//     "variable": "222",
//     "value": 0
//   },
//   {
//     "variable": "333",
//     "value": -70
//   },
//   {
//     "variable": "payload",
//     "value": "0xIJOAJSDJIO"
//   },
//   {
//     "variable": "port",
//     "value": "25"
//   }
// ]

// [
//   {
//     "variable": "asset_location",
//     "value": "R. Emboabas, 776 - Brooklin, São Paulo - SP, 04623-011, Brasil",
//     "location": {
//       "coordinates": [
//         -23.634459770994653,
//         -46.66992187500001
//       ]
//     }
//   },
//   {
//     "variable": "payload",
//     "value": "0xIJOAJSDJIO"
//   },
//   {
//     "variable": "port",
//     "value": "25"
//   }
// ]

// [
//   { "variable": "payload", "value": "0aac233f5b8ce8af51a1c7f5c109d14461fa70292cccac233f5b8cf4cbac233f5b8cf1df7b95a9308e42bc51dd64f0398cba40163bf03241ac" },
//   { "variable": "port", "value": 25 }
//  ]

// [
//   { "variable": "payload", "value": "0aac233f5b8ce8af51a1c7f5c109d14461fa70292cccac233f5b8cf4cbac233f5b8cf1af7b95a9308e42bc51dd64f0398cba40163bf03241af" },
//   { "variable": "port", "value": 25 }
//  ]

// [
//   { "variable": "payload", "value": "0aac233f5b8ce8af51a1c7f5c109d14461fa70292cccac233f5b8cf4cbac233f5b8cf1ea7b95a9308e42bc51dd64f0398cba40163bf03241af" },
//   { "variable": "port", "value": 25 }
//  ]

// [
//   {
//     "variable": "latitude",
//     "value": "35.770575"
//   },
//   {
//     "variable": "longitude",
//     "value": "-78.67815999999999"
//   },
//   {
//     "variable": "payload",
//     "value": "0xIJOAJSDJIO"
//   },
//   {
//     "variable": "payload",
//     "value": "0xIJOAJSDJIO"
//   },
//   {
//     "variable": "port",
//     "value": "25"
//   }
// ]

// [
//   { "variable": "payload", "value": "b05b8cf1c95b8cf4be5b8ce8b9" },
// { "variable": "port", "value": 25 }
//  ]
