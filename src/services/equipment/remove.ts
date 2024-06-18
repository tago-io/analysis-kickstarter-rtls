import { Resources } from "@tago-io/sdk";

import { TagResolver } from "../../lib/edit.tag";
import { sendNotificationFeedback } from "../../lib/send-notification";
import { RouterConstructorCustomBtn } from "../../types";

async function updateAssetDevice(assetID: string) {
  const { tags: asset_dev_tags } = await Resources.devices.info(assetID);
  const tagResolver = TagResolver(asset_dev_tags);
  tagResolver.setTag("equipment_id", "none");
  tagResolver.setTag("has_equip", "false");
  await tagResolver.apply(assetID);
}

async function deleteEquipment({ scope, environment }: RouterConstructorCustomBtn) {
  const equip_id = scope[0].device;

  if (!equip_id) {
    throw "Equipment not found!";
  }

  // geting equipment device organization tag
  const { tags: equip_tags } = await Resources.devices.info(equip_id);
  const file_url = equip_tags.find((x) => x.key === "equip_img")?.value;

  if (file_url) {
    await Resources.files.delete([file_url]);
  }

  await Resources.devices.delete(equip_id);

  const assetID = scope.find((x) => x.property === "tags.asset_id")?.value;
  if (!assetID) {
    throw "Asset ID not found";
  }
  await updateAssetDevice(assetID);

  await sendNotificationFeedback({
    environment,
    message: `Equipment deleted`,
    title: `Equipment deleted`,
  });
}

export { deleteEquipment };
