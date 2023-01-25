import { Device } from "@tago-io/sdk";
import { parseTagoObject } from "../../lib/data.logic";
import getDevice from "../../lib/getDevice";
import { ServiceParams } from "../../types";

export default async ({ scope, account }: ServiceParams, org_dev: Device) => {
  const equip_id = scope[0].device;

  // deleting on list
  const equip_asset = scope.find((x) => x.variable === "equip_asset");

  await org_dev.sendData(parseTagoObject({ asset_list: equip_asset.value }));

  const equip_info = await account.devices.info(equip_id);

  // deleting data
  const site_id = equip_info.tags.find((tag) => tag.key === "site_id").value;
  const org_id = equip_info.tags.find((tag) => tag.key === "organization_id").value;

  if (org_id) {
    await org_dev.deleteData({ groups: equip_id, qty: 9999 });
  }
  if (site_id) {
    const site_dev = await getDevice(account, site_id as string);
    site_dev.deleteData({ groups: equip_id, qty: 9999 });
  }

  // deleting device
  await account.devices.delete(equip_id);
  await account.buckets.delete(equip_info.bucket.id);

  // removing asset equipment tag
  const asset_id = equip_info.tags.find((x) => x.key === "asset_id").value as string;
  const asset_dev_tags = (await account.devices.info(asset_id)).tags.filter((x) => x.key !== "equipment_id");

  await account.devices.edit(asset_id, { tags: [...asset_dev_tags] });

  return console.log("Equipment deleted!");
};
