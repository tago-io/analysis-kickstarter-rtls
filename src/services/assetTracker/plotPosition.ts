import { Analysis, Utils, Device, Account } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { DeviceListItem } from "@tago-io/sdk/out/modules/Account/devices.types";
import getDevice from "../../lib/getDevice";
import { ServiceParams, TagoContext } from "../../types";

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
  let closer_beacon;
  let higher_rssi = -100;

  payload.forEach((data) => {
    if (data.value > higher_rssi) higher_rssi = data.value as number;
    else return;

    closer_beacon = beacon_location_list.find((beacon_data) => beacon_data.id === data.variable);
  });

  return closer_beacon;
}

export default async ({ config_dev, context, scope, account, environment }: ServiceParams, site_dev: Device) => {
  const assetPayload = scope.find((x) => x.variable === "payload");

  //collecting all site device
  // const list_site_data = await account.devices.list({ filter: { tags: [{ key: "device_type", value: "site" }] } });

  const beacon_location_list: Array<BeaconLocationData> = [];

  //looping through all site and searching for layers variable -> fetching beacons position in layers var.
  // const [beacon_data_list] = await Promise.all(
  //   list_site_data.map(async (site_data) => {
  //     const site_dev = await getDevice(account, site_data.id);
  //     const site_dev_data = await site_dev.getData({ variable: "layers", qty: 1 });
  //     return site_dev_data[0].metadata.fixed_position as any;
  //   })
  // );

  const layer_data = site_dev.getData({ variable: "layers", qty: 1 });

  //pushing to an array the beacon info
  // Object.keys(beacon_data_list).forEach((key) => beacon_location_list.push({ ...beacon_data_list[key], id: key }));

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

  console.log("5fe0897bcb2fb800279f8594".length);
  const closer_beacon = getAssetPosition(account, beacon_location_list, payload);

  console.log(closer_beacon);
};
