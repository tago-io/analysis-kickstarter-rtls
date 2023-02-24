import { Device, Account, Utils } from "@tago-io/sdk";
import { DeviceCreateInfo } from "@tago-io/sdk/out/modules/Account/devices.types";
import { Data } from "@tago-io/sdk/out/common/common.types";
import validation from "../../lib/validation";
import { ServiceParams, DeviceCreated } from "../../types";
import { parseTagoObject } from "../../lib/data.logic";
import getDevice from "../../lib/getDevice";
import { getZodError } from "../../lib/get-zod-error";
import { registerEquipModel } from "./model/equipment.model";

interface installDeviceParam {
  account: Account;
  new_dev_name: string;
  org_id: string;
  site_id: string;
  asset_id: string;
  equip_serie: string;
  equip_img: string;
}

async function getNewEquipVariables(scope: Data[], validate: ReturnType<typeof validation>) {
  const new_equip_name = scope.find((x) => x.variable === "new_equip_name");
  const new_equip_serie = scope.find((x) => x.variable === "new_equip_serie");
  const new_equip_img = scope.find((x) => x.variable === "new_equip_img");
  const new_equip_asset = scope.find((x) => x.variable === "new_equip_asset");

  try {
    return registerEquipModel.parse({
      new_equip_name,
      new_equip_serie,
      new_equip_img,
      new_equip_asset,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    await validate(zodErrorMsg, "danger");
    throw error;
  }
}

async function installDevice({ account, new_dev_name, org_id, site_id, asset_id, equip_serie, equip_img }: installDeviceParam) {
  // structuring data
  const device_data: DeviceCreateInfo = {
    name: new_dev_name,
    type: "mutable",
    connector: "5f5a8f3351d4db99c40dece5",
    network: "5bbd0d144051a50034cd19fb",
  };

  // creating new device
  const new_dev = await account.devices.create(device_data);

  // inserting device id -> so we can reference this later
  await account.devices.edit(new_dev.device_id, {
    tags: [
      { key: "device_id", value: new_dev.device_id },
      { key: "asset_id", value: asset_id },
      { key: "site_id", value: site_id },
      { key: "organization_id", value: org_id },
      { key: "device_type", value: "equipment" },
      { key: "equip_serie", value: equip_serie },
      { key: "equip_img", value: equip_img },
    ],
  });

  // instantiating new device
  const new_org_dev = new Device({ token: new_dev.token });

  // token, device_id, bucket_id
  return { ...new_dev, device: new_org_dev } as DeviceCreated;
}

async function createEquipment({ scope, account, environment }: ServiceParams) {
  const org_id = scope[0].device;
  const org_dev = await Utils.getDevice(account, org_id);
  const validate = validation("equip_validation", org_dev);
  await validate("Registering...", "warning");
  // Collecting data
  const { new_equip_asset, new_equip_name, new_equip_img, new_equip_serie } = await getNewEquipVariables(scope, validate);

  // deleteData
  await org_dev.deleteData({ variables: "asset_list", values: new_equip_asset.value });
  // await account.dashboards.edit("608aaa44e49d32001116715e", {});
  await account.dashboards.edit(environment.dash_org, {});

  const [asset_name] = await org_dev.getData({ variables: "dev_name", values: new_equip_asset.value, qty: 1 });
  const asset_id = asset_name?.group;

  const site_id = (await account.devices.info(asset_id)).tags.find((x) => x.key === "site_id").value;
  const site_dev = await getDevice(account, site_id);

  const { device_id: equip_id } = await installDevice({
    account,
    new_dev_name: new_equip_name.value,
    org_id,
    site_id: site_id,
    asset_id,
    equip_serie: new_equip_serie.value,
    equip_img: `https://api.tago.io/file/5fc13907cf4e170027440a96/${(new_equip_img?.metadata as any)?.file?.path}`,
  });

  const equip_data = parseTagoObject(
    {
      equip_name: new_equip_name.value,
      // equip_serie: new_equip_serie.value,
      // equip_img: `https://api.tago.io/file/608aa9bd050d8f0012e20a8a/${(new_equip_img?.metadata as any)?.file?.path}`,
      equip_asset: new_equip_asset.value,
      equip_serie: {
        value: new_equip_serie.value,
        metadata: {
          label: new_equip_name.value,
        },
      },
    },
    equip_id
  );

  const asset_dev_tags = (await account.devices.info(asset_id)).tags;

  await account.devices.edit(asset_id, { tags: [...asset_dev_tags, { key: "equipment_id", value: equip_id }] });

  await org_dev.sendData(equip_data);
  await site_dev.sendData(equip_data);

  return validate("Equipment created successfully!", "success");
  // DELETE ALSO THE IMAGE, ITS BEING KEPT!
}

export { createEquipment, getNewEquipVariables };
