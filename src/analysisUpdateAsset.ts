import { Analysis, Utils, Device, Account } from "@tago-io/sdk";
import axios from "axios";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { DeviceListItem } from "@tago-io/sdk/out/modules/Account/devices.types";
import { parseTagoObject } from "./lib/data.logic";
import getDevice from "./lib/getDevice";
import { TagoContext } from "./types";

// interface LayerData {
//   id?: string;
//   metadata?: any;
//   origin: string;
//   serie?: string;
//   time?: Date;
//   value: string;
//   variable: string;
// }

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

function mean(array: Array<number>) {
  array = array.sort();
  const result = (Number(array[0]) + Number(array[array.length - 1])) / 2;
  return result;
}

function grbAPI(layer: Data, active_beacon_list: Data[]) {
  const meas_bundles = [];
  const x_pos = [],
    y_pos = [];

  const R = 6371000;

  const beacon_array = (layer.metadata as any).fixed_position;

  const beacon_key_array = Object.keys(beacon_array);

  for (let i = 0; i < beacon_key_array.length; i++) {
    x_pos.push(beacon_array[beacon_key_array[i]].x);
    y_pos.push(beacon_array[beacon_key_array[i]].y);
  }

  const mx = mean(x_pos);
  const my = mean(y_pos);

  for (let i = 0; i < Object.keys(beacon_array).length; i++) {
    (active_beacon_list[i] as any).lat_n = (beacon_array[beacon_key_array[i]].y * 100 - my) / R; //*100 to get rid of decimals
    (active_beacon_list[i] as any).lon_n = (beacon_array[beacon_key_array[i]].x * 100 - mx) / R; //*100 to get rid of decimals
    (active_beacon_list[i] as any).alt_n = 0;
  }

  const arr = [];

  for (let i = 0; i < Object.keys(beacon_array).length; i++) {
    // const current_beacon = active_beacon_list.find((x) => Object.keys(beacon_array[i])[0].includes(x.serie));
    arr.push({
      rssi: active_beacon_list[i].value,
      gw_id: active_beacon_list[i].variable,
      ant_lat: (active_beacon_list[i] as any).lat_n,
      ant_long: (active_beacon_list[i] as any).lon_n,
      ant_alt: (active_beacon_list[i] as any).alt_n,
    });
  }

  meas_bundles.push(arr);

  axios({
    method: "post",
    url: "https://lorawan-grs-dev.tektelic.com/api/geo/localization/rssi",
    data: {
      meas_bundles,
    },
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic dGFnbzp0YWdvZGV2MTQ=",
    },
  })
    .then((msg) => console.log(msg))
    .catch((e) => console.log(e));

  //return the response
}

async function getIndoorPos(
  site_dev: Device,
  scope: Data[],
  device_id: string,
  site_id: string,
  dev_name: string,
  site_name: string,
  org_name: string,
  org_dev: Device,
  org_id: string
) {
  //fetching existing layers
  const layers_list = await site_dev.getData({ variable: "layers", qty: 9999 });

  const beacon_list = await site_dev.getData({ variable: "beacon_id", qty: 9999 });

  //device payload will contain beacons signals
  const beacon_active_list = scope.filter((x) => beacon_list.find((y) => y.value == x.variable));

  //need to change -> used only in grbAPI() -> need to change with beacon_active_list variables below
  const active_beacon_list = beacon_active_list.map((x) => {
    const serie = beacon_list.find((y) => y.value === x?.variable)?.serie;
    return { ...x, serie: serie };
  });

  //sort the array and get the first position of resultant array
  const [strongest_beacon] = beacon_active_list.sort((a, b) => (b.value as number) - (a.value as number));

  //getting the serie of the beacon pin manually placed (image marker widget concatanation site_id+pin_serie)
  const strongest_beacon_serie = beacon_list.find((x) => x.value === strongest_beacon?.variable)?.serie;
  const fixed_position_key = `${site_id}${strongest_beacon_serie}`;

  const layer = layers_list.find((x) => {
    const metadata = x.metadata as any;
    return metadata.fixed_position[fixed_position_key];
  });

  if (!layer) return console.log("No beacon found!");

  const strongest_beacon_info = (layer.metadata as any).fixed_position[fixed_position_key];

  const [asset_room] = await site_dev.getData({ variable: "beacon_room", qty: 1, serie: strongest_beacon_serie });

  const equip_list = await org_dev.getData({ variable: "equip_asset" });

  const equip_serie = equip_list.find((x) => x.value === dev_name)?.serie;

  let equip_info = null;
  let equip_name = null;
  let equip_img_url = null;

  if (equip_serie) {
    equip_info = await org_dev.getData({ variables: ["equip_img", "equip_serie", "equip_name"], serie: equip_serie });
    equip_name = equip_info.find((x) => x.variable === "equip_name")?.value;
    equip_img_url = equip_info.find((x) => x.variable === "equip_img")?.value;
  }

  grbAPI(layer, active_beacon_list);

  const assetInfo = parseTagoObject(
    {
      asset_location: {
        variable: "asset_location",
        value: dev_name,
        metadata: {
          layer: layer.serie,
          x: strongest_beacon_info.x,
          y: strongest_beacon_info.y,
          color: "#" + ((Math.random() * 0xffffff) << 0).toString(16),
          img_pin: equip_img_url,
        },
      }, //pin
      asset_active_info: {
        variable: "asset_active_info",
        value: dev_name,
        metadata: {
          asset_site: org_name,
          asset_building: site_name,
          asset_floor: layer?.value,
          asset_room: asset_room?.value,
          asset_link: `https://admin.tago.io/dashboards/info/5fc91ac2a0e14a002654fe99?tab=2&edit=yes&asset=5ff5e718d0fff4001e9053a9&org_dev=${org_id}&site_dev=${site_id}`,
        },
      }, //asset search table
      asset_equip_name: {
        variable: "asset_equip_name",
        value: equip_name,
      },
      asset_equip_img: {
        variable: "asset_equip_img",
        value: equip_img_url,
      },
    },
    device_id //device id
  );

  const assetHistory = parseTagoObject({
    asset_equip_paired: equip_name || "No equipment paired yet.",
    asset_name: dev_name,
    asset_closest_beacon: strongest_beacon_info.value,
    asset_strongest_rssi: strongest_beacon.value,
  });

  await site_dev.deleteData({ variables: ["asset_location", "asset_active_info", "asset_equip_name", "asset_equip_img"], serie: device_id });
  await org_dev.deleteData({ variables: ["asset_location", "asset_active_info", "asset_equip_name", "asset_equip_img"], serie: device_id });
  await site_dev.sendData(assetInfo);
  await org_dev.sendData(assetInfo);
  await site_dev.sendData(assetHistory);

  return console.log("Position processed!");
}

async function handler(context: TagoContext, scope: Data[]) {
  //data must come through Device test 1

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
  const device_id = scope[0].origin;
  const dev_name = (await account.devices.info(device_id)).name;

  //getting the site_dev through the tag
  const site_id = (await account.devices.info(device_id)).tags.find((x) => x.key === "site_id").value as string;
  const site_dev = await getDevice(account, site_id);
  const site_name = (await site_dev.info()).name;

  const org_id = (await account.devices.info(site_id)).tags.find((x) => x.key === "organization_id").value as string;
  const org_dev = await getDevice(account, org_id);
  const org_name = (await org_dev.info()).name;

  const outdoor_data = scope.find((x) => x?.location) as any; //as any tagoIO issue -> location coordinates/lat,lng

  const outdoor_data_tektelic_lat = scope.find((x) => x.variable === "latitude")?.value;
  const outdoor_data_tektelic_lng = scope.find((x) => x.variable === "longitude")?.value;

  if (outdoor_data || outdoor_data_tektelic_lat) {
    const assetInfo = parseTagoObject(
      {
        asset_location: {
          variable: "asset_location",
          value: dev_name,
          location: {
            lat: outdoor_data?.location?.coordinates[0] || outdoor_data_tektelic_lat,
            lng: outdoor_data?.location?.coordinates[1] || outdoor_data_tektelic_lng,
          },
        },
        asset_active_info: {
          variable: "asset_active_info",
          value: dev_name,
          metadata: {
            asset_site: org_name,
            asset_building: site_name,
            asset_floor: "Asset is outdoor",
            asset_room: "Asset is outdoor",
            asset_link: `https://admin.tago.io/dashboards/info/5fc91ac2a0e14a002654fe99?tab=0&edit=yes&asset=5ff5e718d0fff4001e9053a9&org_dev=${org_id}&site_dev=${site_id}`,
          },
        },
      },
      device_id
    );

    const assetHistory = parseTagoObject({
      asset_name: dev_name,
      asset_closest_beacon: "Asset is outdoor",
      asset_strongest_rssi: "Asset is outdoor",
    });

    await site_dev.deleteData({ variables: ["asset_location", "asset_active_info"], serie: device_id });
    await org_dev.deleteData({ variables: ["asset_location", "asset_active_info"], serie: device_id });
    await site_dev.sendData(assetInfo);
    await org_dev.sendData(assetInfo);
    await site_dev.sendData(assetHistory);

    return console.log("Position processed!");
  }

  //if theres no outdoor position than we will have an indoor position
  await getIndoorPos(site_dev, scope, device_id, site_id, dev_name, site_name, org_name, org_dev, org_id);
}

async function startAnalysis(context: TagoContext, scope: any) {
  try {
    await handler(context, scope);
  } catch (error) {
    console.log(error);
    context.log(error.message || JSON.stringify(error));
  }
}

export default new Analysis(startAnalysis, { token: "b5e413b3-cf53-4d36-afac-c0962abbf8a8" });

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
