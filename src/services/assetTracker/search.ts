import { Device } from "@tago-io/sdk";
import { ServiceParams } from "../../types";
import { parseTagoObject } from "../../lib/data.logic";

interface sentValue {
  label: string;
  value: string;
}

export default async ({ scope, account }: ServiceParams, org_dev: Device) => {
  await org_dev.deleteData({ variables: ["asset_name", "asset_site", "asset_building", "asset_floor", "asset_room", "asset_link"], qty: 999 });

  await account.dashboards.edit("5fc91ac2a0e14a002654fe99", {});

  // Collecting data
  const find_asset = scope.find((x) => x.variable === "find_asset");

  const metadata = find_asset.metadata as any;

  const sentValues = metadata.sentValues.map((x: sentValue) => x.value);

  //const active_asset_list = (await org_dev.getData({ variables: "asset_active_info" })).filter((x) => sentValues.includes(x.value));

  const active_info_list = await org_dev.getData({ variables: "asset_active_info" });
  const active_asset_list = active_info_list.filter((x) => sentValues.includes(x.value));

  for (let i = 0; i < sentValues.length; i++) {
    const asset_info = active_asset_list.find((x) => x.value === sentValues[i]);

    if (asset_info) {
      await org_dev.sendData(
        parseTagoObject({
          asset_name: asset_info.value,
          asset_site: (asset_info.metadata as any).asset_site,
          asset_building: (asset_info.metadata as any).asset_building,
          asset_floor: (asset_info.metadata as any).asset_floor,
          asset_room: (asset_info.metadata as any).asset_room,
          asset_link: (asset_info.metadata as any).asset_link,
        })
      );
    } else {
      await org_dev.sendData(
        parseTagoObject({
          asset_name: sentValues[i],
          asset_site: "Not Tracked",
          asset_building: "Not Tracked",
          asset_floor: "Not Tracked",
          asset_room: "Not Tracked",
        })
      );
    }
  }

  return;
};
