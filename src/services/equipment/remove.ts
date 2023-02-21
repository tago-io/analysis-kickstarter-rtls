import { Utils } from "@tago-io/sdk";
import { parseTagoObject } from "../../lib/data.logic";
import { ServiceParams } from "../../types";

async function deleteEquipment({ scope, account }: ServiceParams) {
  const equip_id = scope[0].device;
  const org_dev = await Utils.getDevice(account, equip_id);

  // geting equipment asset id
  const equip_asset = scope[3].value;

  // deleting on list
  await org_dev.sendData(parseTagoObject({ asset_list: equip_asset }));
  const equip_info = await account.devices.info(equip_id);

  // deleting data
  const asset_id = equip_info.tags.find((x) => x.key === "asset_id").value;

  // deleting device
  await account.devices.delete(equip_id);

  // removing asset equipment tag
  const asset_dev_tags = (await account.devices.info(asset_id)).tags.filter((x) => x.key !== "equipment_id");
  await account.devices.edit(asset_id, { tags: [...asset_dev_tags] });

  return console.log("Equipment deleted!");
}

export { deleteEquipment };
