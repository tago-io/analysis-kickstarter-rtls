import { Device, Account, Types, Utils } from "@tago-io/sdk";
import { DeviceCreateInfo } from "@tago-io/sdk/out/modules/Account/devices.types";
import validation from "../../lib/validation";
import { ServiceParams, DeviceCreated } from "../../types";
import { parseTagoObject } from "../../lib/data.logic";
import getDevice from "../../lib/getDevice";

interface installDeviceParam {
  account: Account;
  new_dev_name: string;
  org_id: string;
  site_id: string;
  asset_id: string;
  equip_serie: string;
  equip_img: string;
}

function getFormVariables(scope: Types.Common.Data[], config_dev: Device) {
  if (!Array.isArray(scope)) {
    throw "Scope is missing";
  }

  // validation
  const validate = validation("org_validation", config_dev);

  const new_equip_name = scope.find((x) => x.variable === "new_equip_name");
  const new_equip_serie = scope.find((x) => x.variable === "new_equip_serie");
  const new_equip_img = scope.find((x) => x.variable === "new_equip_img");
  const new_equip_asset = scope.find((x) => x.variable === "new_equip_asset");

  if (!new_equip_name.value) {
    throw validate("Name field is empty", "danger");
  }
  if (!new_equip_serie.value) {
    throw validate("Serie field is empty", "danger");
  }
  if (!new_equip_img.value) {
    throw validate("Image field is empty", "danger");
  }
  if (!new_equip_asset.value) {
    throw validate("Asset field is empty", "danger");
  }

  return { new_equip_asset, new_equip_name, new_equip_img, new_equip_serie };
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
  const org_id = scope[0].device as string;
  const org_dev = await Utils.getDevice(account, org_id);
  console.log("Registering...");
  const validate = validation("equip_validation", org_dev);
  validate("Registering...", "warning");
  // Collecting data
  const { new_equip_asset, new_equip_name, new_equip_img, new_equip_serie } = getFormVariables(scope, org_dev);

  // deleteData
  await org_dev.deleteData({ variables: "asset_list", values: new_equip_asset.value }).then((msg) => console.log(msg));
  // await account.dashboards.edit("608aaa44e49d32001116715e", {});
  await account.dashboards.edit(environment.dash_org, {});

  const [asset_name] = await org_dev.getData({ variables: "dev_name", values: new_equip_asset.value, qty: 1 });
  const asset_id = asset_name?.group;

  const site_id = (await account.devices.info(asset_id)).tags.find((x) => x.key === "site_id").value as string;
  const site_dev = await getDevice(account, site_id);

  const { device_id: equip_id, device: equip_dev } = await installDevice({
    account,
    new_dev_name: new_equip_name.value as string,
    org_id,
    site_id: site_id,
    asset_id,
    equip_serie: new_equip_serie.value as string,
    equip_img: new_equip_img.value as string,
  });

  const equip_data = parseTagoObject(
    {
      equip_name: new_equip_name.value,
      // equip_serie: new_equip_serie.value,
      // equip_img: `https://api.tago.io/file/608aa9bd050d8f0012e20a8a/${(new_equip_img?.metadata as any)?.file?.path}`,
      equip_img: `https://api.tago.io/file/5fc13907cf4e170027440a96/${(new_equip_img?.metadata as any)?.file?.path}`,
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

  return validate("Device created successfully!", "success");
  // DELETE ALSO THE IMAGE, ITS BEING KEPT!
}

export { getFormVariables, createEquipment };
