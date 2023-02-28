import { ServiceParams } from "../../types";

async function deleteEquipment({ scope, account }: ServiceParams) {
  if (!scope[0].device) {
    throw "Equipment not found!";
  }
  const equip_id = scope[0].device;
  // geting equipment device organization tag
  const equip_tags = (await account.devices.info(equip_id)).tags;
  const file_url = equip_tags.find((x) => x.key === "equip_img")?.value;
  // geting equipment asset id
  const equip_asset = scope[3].value;
  console.log("equip_asset", equip_asset);
  // deleting on list
  const equip_info = await account.devices.info(equip_id);
  // deleting data
  const asset_id = equip_info.tags.find((x) => x.key === "asset_id")?.value;
  // deleting TagoIO Files data
  console.log(await account.files.delete([file_url as string]));
  // deleting device
  await account.devices.delete(equip_id);
  // removing asset equipment tag
  const asset_dev_tags = (await account.devices.info(asset_id as string)).tags.filter((x) => x.key !== "equipment_id");
  await account.devices.edit(asset_id as string, { tags: [...asset_dev_tags] });
  return;
}

export { deleteEquipment };
