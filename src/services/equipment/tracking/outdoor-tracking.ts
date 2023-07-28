import { Account, Device } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { DeviceInfo } from "@tago-io/sdk/out/modules/Account/devices.types";

import { parseTagoObject } from "../../../lib/data.logic";
import { DataResolver } from "../../../lib/edit.data";

function getAssetInfoOutside(equipment: DeviceInfo, outdoor_data: Data, equip_img?: string) {
  return parseTagoObject(
    {
      equipment_outside_location: {
        value: equipment.name,
        location: {
          lat: outdoor_data?.location?.coordinates[1],
          lng: outdoor_data?.location?.coordinates[0],
        },
        metadata: {
          temperature: " 31.8",
          light: " 90",
          img_pin: equip_img,
        },
      },
    },
    equipment.id
  );
}

async function outdoorData(account: Account, scope: Data[], site_dev: Device, equipmentID: string) {
  const outdoor_data = scope.find((x) => x?.location) as any; //as any tagoIO issue -> location coordinates/lat,lng

  // checking if device is outside
  if (!outdoor_data && !outdoor_data?.location?.coordinates[0]) {
    return;
  }

  const equipmentInfo = await account.devices.info(equipmentID);
  const equip_img = equipmentInfo.tags.find((x) => x.key === "equip_img")?.value;
  const assetInfo = getAssetInfoOutside(equipmentInfo, outdoor_data, equip_img);

  // checking if device was previously inside
  const [previously_inside] = await site_dev.getData({ variables: "equipment_location", qty: 1, groups: equipmentID });

  // Edit equipment_outside_location if already outside
  if (previously_inside) {
    await site_dev.deleteData({ variables: ["equipment_location"], groups: equipmentID });
    await site_dev.sendData(assetInfo);
  } else {
    await DataResolver(site_dev)
      .setVariable({
        variable: "equipment_outside_location",
        location: {
          lat: outdoor_data?.location?.coordinates[1],
          lng: outdoor_data?.location?.coordinates[0],
        },
      })
      .apply(equipmentID);
  }

  return {
    coordinates: { lat: Number(outdoor_data?.location?.coordinates[1]), lng: Number(outdoor_data?.location?.coordinates[0]) },
    device_id: scope[0].device,
  };
}

export { outdoorData, getAssetInfoOutside };
