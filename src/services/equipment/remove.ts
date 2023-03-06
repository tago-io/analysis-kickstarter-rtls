import { Account } from "@tago-io/sdk";

import { TagResolver } from "../../lib/edit.tag";
import { InputScope, RouterConstructorCustomBtn, ServiceParams } from "../../types";

async function updateAssetDevice(account: Account, assetID: string) {
  const { tags: asset_dev_tags } = await account.devices.info(assetID);
  const tagResolver = TagResolver(asset_dev_tags);
  tagResolver.setTag("equipment_id", "none");
  tagResolver.setTag("has_equip", "false");
  await tagResolver.apply(account, assetID);
}

async function deleteEquipment({ scope, account }: RouterConstructorCustomBtn) {
  if (!account) {
    return;
  }

  const equip_id = scope[0].device;

  if (!equip_id) {
    throw "Equipment not found!";
  }

  // geting equipment device organization tag
  const { tags: equip_tags } = await account.devices.info(equip_id);
  const file_url = equip_tags.find((x) => x.key === "equip_img")?.value;

  if (file_url) {
    await account.files.delete([file_url]);
  }

  await account.devices.delete(equip_id);

  const assetID = scope.find((x) => x.property === "tags.asset_id")?.value;
  if (!assetID) {
    throw "Asset ID not found";
  }
  await updateAssetDevice(account, assetID);
}

export { deleteEquipment };
