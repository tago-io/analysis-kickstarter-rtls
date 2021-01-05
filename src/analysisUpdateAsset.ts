import { Analysis, Utils, Device, Account } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { DeviceListItem } from "@tago-io/sdk/out/modules/Account/devices.types";
import { parseTagoObject } from "./lib/data.logic";
import getDevice from "./lib/getDevice";
import { TagoContext } from "./types";

interface BeaconLocationList {
  [key: string]: BeaconLocationData;
}
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

interface AssetPayload {
  value: string | number;
  variable: string;
}

async function getIndoorPos(site_dev: Device, scope: Data[], device_id: string, site_id: string, dev_name: string) {
  //fetching existing layers
  const layers_list = await site_dev.getData({ variable: "layers", qty: 9999 });

  const beacon_list = await site_dev.getData({ variable: "beacon_id", qty: 9999 });

  //device payload will contain beacons signals
  const beacon_active_list = scope.filter((x) => beacon_list.find((y) => y.value == x.variable));

  //sort the array and get the first position of resultant array
  const [strongest_beacon] = beacon_active_list.sort((a, b) => (b.value as number) - (a.value as number));

  //getting beacon info (x,y)

  const strongest_beacon_serie = beacon_list.find((x) => x.value === strongest_beacon.variable).serie;
  const fixed_position_key = `${site_id}${strongest_beacon_serie}`;

  const layer = layers_list.find((x) => {
    const metadata = x.metadata as any;
    return metadata.fixed_position[fixed_position_key];
  });

  if (!layer) return console.log("No beacon created!");

  const strongest_beacon_info = (layer.metadata as any).fixed_position[fixed_position_key];

  const assetLocation = parseTagoObject(
    {
      asset_location: {
        variable: "asset_location",
        value: dev_name,
        metadata: {
          layer: layer.serie,
          x: strongest_beacon_info.x,
          y: strongest_beacon_info.y,
          color: "#" + ((Math.random() * 0xffffff) << 0).toString(16),
        },
      },
    },
    device_id //device id
  ); //we put the serie as the second param in parseTagoObject function

  const assetInfo = parseTagoObject(
    {
      asset_name: dev_name,
      asset_closest_beacon: strongest_beacon_info.value,
      asset_strongest_rssi: strongest_beacon.value,
    },
    null
  );

  await site_dev.deleteData({ variable: "asset_location", serie: device_id }).then((msg) => console.log(msg));
  await site_dev.sendData(assetLocation);
  await site_dev.sendData(assetInfo);

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

  const config_dev = new Device({ token: environment.config_token });
  const account = new Account({ token: environment.account_token });

  const device_id = scope[0].origin;
  const dev_name = await (await account.devices.info(device_id)).name;

  //getting the site_dev through the tag
  const site_id = (await account.devices.info(device_id)).tags.find((x) => x.key === "site_id").value as string;
  const site_dev = await getDevice(account, site_id);

  const outdoor_data = scope.find((x) => x?.location) as any; //as any tagoIO issue -> location coordinates/lat,lng

  if (outdoor_data) {
    const assetLocation = parseTagoObject(
      {
        asset_location: {
          variable: "asset_location",
          value: outdoor_data.value,
          location: {
            lat: outdoor_data.location.coordinates[0],
            lng: outdoor_data.location.coordinates[1],
          },
        },
      },
      device_id
    );

    const assetInfo = parseTagoObject({
      asset_name: dev_name,
      asset_closest_beacon: "Asset is outdoor",
      asset_strongest_rssi: "Asset is outdoor",
    });

    await site_dev.deleteData({ variable: "asset_location", serie: device_id }).then((msg) => console.log(msg));
    await site_dev.sendData(assetLocation);
    await site_dev.sendData(assetInfo);

    return console.log("Position processed!");
  }

  //if theres no outdoor position than we will have a indoor position
  await getIndoorPos(site_dev, scope, device_id, site_id, dev_name);
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
