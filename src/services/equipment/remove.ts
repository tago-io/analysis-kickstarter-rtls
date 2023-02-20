import { Utils } from "@tago-io/sdk";
import { parseTagoObject } from "../../lib/data.logic";
import getDevice from "../../lib/getDevice";
import { ServiceParams } from "../../types";

async function deleteEquipment({ scope, account }: ServiceParams) {
  const equip_id = scope[0].device;
  const org_dev = await Utils.getDevice(account, equip_id);

  // geting equipment asset id
  const equip_asset = scope[3].value;
  console.log(equip_asset);

  // deleting on list
  await org_dev.sendData(parseTagoObject({ asset_list: equip_asset }));
  const equip_info = await account.devices.info(equip_id);

  // deleting data
  const site_id = equip_info.tags.find((tag) => tag.key === "site_id").value;
  const org_id = equip_info.tags.find((tag) => tag.key === "organization_id").value;
  const asset_id = equip_info.tags.find((x) => x.key === "asset_id").value;

  if (org_id) {
    await org_dev.deleteData({ groups: equip_id, qty: 9999 });
  }
  if (site_id) {
    const site_dev = await getDevice(account, site_id);
    await site_dev.deleteData({ groups: equip_id, qty: 9999 });
  }

  // deleting device
  await account.devices.delete(equip_id);
  await account.buckets.delete(equip_info.bucket.id);

  // removing asset equipment tag
  const asset_dev_tags = (await account.devices.info(asset_id)).tags.filter((x) => x.key !== "equipment_id");
  await account.devices.edit(asset_id, { tags: [...asset_dev_tags] });

  return console.log("Equipment deleted!");
}

export { deleteEquipment };
