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
  link_type: string;
  value: string;
  x: string;
  y: string;
}

interface AssetPayload {
  value: string | number;
  variable: string;
}

function getAssetPosition(account: Account, beacon_location_list: Array<BeaconLocationData>, payload: Array<AssetPayload>): BeaconLocationData {
  let closest_beacon;
  let higher_rssi = -100;

  payload.forEach((data) => {
    if (data.value > higher_rssi) higher_rssi = data.value as number;
    else return;

    closest_beacon = beacon_location_list.find((beacon_data) => beacon_data.id === data.variable);
  });

  return closest_beacon;
}

async function handler(context: TagoContext, scope: Data[]) {
  context.log("Running Analysis");

  const environment = Utils.envToJson(context.environment);
  if (!environment) {
    return;
  } else if (!environment.config_token) {
    throw "Missing config_token environment var";
  } else if (!environment.account_token) {
    throw "Missing account_token environment var";
  }

  const assetPayload = scope.find((x) => x.variable === "payload");

  const config_dev = new Device({ token: environment.config_token });
  const account = new Account({ token: environment.account_token });

  //collecting all site device
  const list_site_data = await account.devices.list({ filter: { tags: [{ key: "device_type", value: "site" }] } });

  const beacon_location_list: Array<BeaconLocationData> = [];

  //looping through all site and searching for layers variable -> fetching beacons position in layers var.
  const [beacon_data_list] = await Promise.all(
    list_site_data.map(async (site_data) => {
      const site_dev = await getDevice(account, site_data.id);
      const site_dev_data = await site_dev.getData({ variable: "layers", qty: 1 });
      return site_dev_data[0].metadata.fixed_position as any;
    })
  );

  //pushing to an array the beacon info
  Object.keys(beacon_data_list).forEach((key) => beacon_location_list.push({ ...beacon_data_list[key], id: key }));

  const payload = [
    {
      variable: "5fe089dd069a08002771b68c1608578132580",
      value: -80,
    },
    {
      variable: "5fe089dd069a08002771b68c1608578177438",
      value: 0,
    },
    {
      variable: "5fe089dd069a08002771b68c1608578187194",
      value: -70,
    },
    {
      variable: "payload",
      value: "0xIJOAJSDJIO",
    },
  ];

  const closest_beacon = getAssetPosition(account, beacon_location_list, payload);

  const site_id = closest_beacon.id.slice(0, 24);

  const site_dev = await getDevice(account, site_id);

  const assetLocation = parseTagoObject({
    asset_location: {
      variable: "asset_location",
      value: "Asset",
      serie: closest_beacon.id.slice(24),
      metadata: {
        color: "#FF0004",
      },
    },
    asset_name: "Asset",
    asset_closest_beacon: closest_beacon.value,
  });

  site_dev.sendData(assetLocation).then((msg) => console.log(msg));
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
