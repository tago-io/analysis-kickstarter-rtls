import { Resources } from "@tago-io/sdk";

import { parseObjectToTago } from "../../lib/parse-object-to-tagoio";
import { ServiceParams } from "../../types";

interface sentValue {
  label: string;
  value: string;
}

async function searchAsset({ scope, context }: ServiceParams) {
  const org_id = scope[0].device;

  await Resources.devices.deleteDeviceData(org_id, { variables: ["asset_name", "asset_site", "asset_floor", "asset_room", "asset_link"], qty: 9999 });
  // get _dashboard_id key from enviroment
  const dashboard = context.environment.find((x) => x.key === "_dashboard_id")?.value;
  console.log("dashboard: ", dashboard);

  // Collecting data
  const find_asset = scope.find((x) => x.variable === "find_asset");
  const metadata = find_asset?.metadata;
  const sentValues = metadata.sentValues.map((x: sentValue) => x.value);

  // getting all the devices in this org.
  const active_info_list = await Resources.devices.getDeviceData(org_id, { variables: "dev_id" });

  // filtering the list for only the devices we are searching for.
  const active_asset_list = active_info_list.filter((x) => sentValues.includes(x.value));
  console.log("devices: ", active_asset_list);

  for (let i = 0; i < sentValues.length; i++) {
    const asset_info = active_asset_list.find((x) => x.value === sentValues[i]);

    const device_info = await Resources.devices.info(asset_info?.value as string);
    const tags = device_info.tags || [];

    const site_id = tags.find((x) => x.key === "site_id")?.value;
    const device_dashboard_link = `https://admin.tago.io/dashboards/info/${dashboard}?tab=3&org_dev=${org_id}&site_dev=${site_id}&asset=${asset_info?.value}`;

    // getting equipement_idz
    const equipment_id = tags.find((x) => x.key === "equipment_id")?.value;

    // geting data from org device
    const [info] = await Resources.devices.getDeviceData(org_id, { variables: "equipment_location", groups: equipment_id });
    console.log("info: ", info);

    console.log("asset_info: ", asset_info);

    console.log("device_dashboard_link: ", device_dashboard_link);
    if (asset_info) {
      await Resources.devices.sendDeviceData(
        org_id,
        parseObjectToTago({
          asset_name: device_info.name,
          asset_site: site_id,
          asset_floor: info?.metadata?.floor_name ?? "Not Tracked",
          asset_room: info?.metadata?.room_name ?? "Not Tracked",
          asset_link: device_dashboard_link,
        })
      );
    }
  }

  return;
}

export { searchAsset };
