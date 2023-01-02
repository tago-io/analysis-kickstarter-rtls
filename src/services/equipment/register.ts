import { Device, Account, Types } from "@tago-io/sdk";
import { DeviceCreateInfo } from "@tago-io/sdk/out/modules/Account/devices.types";
import validation from "../../lib/validation";
import { ServiceParams, TagoContext, DeviceCreated } from "../../types";
import { parseTagoObject } from "../../lib/data.logic";
import getDevice from "../../lib/getDevice";

interface installDeviceParam {
  account: Account;
  new_dev_name: string;
  org_id: string;
  site_id: string;
  asset_id: string;
}

async function installDevice({ account, new_dev_name, org_id, site_id, asset_id }: installDeviceParam) {
  //structuring data
  const device_data: DeviceCreateInfo = {
    name: new_dev_name,
    network: "5bbd0d144051a50034cd19fb",
    connector: "5f5a8f3351d4db99c40dece5",
    type: "mutable",
  };

  //creating new device
  const new_dev = await account.devices.create(device_data);

  //inserting device id -> so we can reference this later
  await account.devices.edit(new_dev.device_id, {
    tags: [
      { key: "device_id", value: new_dev.device_id },
      { key: "asset_id", value: asset_id },
      { key: "site_id", value: site_id },
      { key: "organization_id", value: org_id },
      { key: "device_type", value: "equipment" },
    ],
  });

  //instantiating new device
  const new_org_dev = new Device({ token: new_dev.token });

  //token, device_id, bucket_id
  return { ...new_dev, device: new_org_dev } as DeviceCreated;
}

export default async ({ config_dev, context, scope, account, environment }: ServiceParams, org_dev: Device) => {
  console.log("Registering...");
  const validate = validation("equip_validation", org_dev);
  validate("Registering...", "warning");
  //Collecting data
  const new_equip_name = scope.find((x) => x.variable === "new_equip_name");
  const new_equip_serie = scope.find((x) => x.variable === "new_equip_serie");
  const new_equip_img = scope.find((x) => x.variable === "new_equip_img");
  const new_equip_asset = scope.find((x) => x.variable === "new_equip_asset");

  const org_id = scope[0].origin as string;

  //deleteData
  await org_dev.deleteData({ variable: "asset_list", value: new_equip_asset.value }).then((msg) => console.log(msg));
  // await account.dashboards.edit("608aaa44e49d32001116715e", {});
  await account.dashboards.edit(environment.dash_org, {});

  const [asset_name] = await org_dev.getData({ variable: "dev_name", value: new_equip_asset.value, qty: 1 });
  const asset_id = asset_name.serie;

  const site_id = (await account.devices.info(asset_id)).tags.find((x) => x.key === "site_id").value as string;
  const site_dev = await getDevice(account, site_id);

  const { device_id: equip_id, device: equip_dev } = await installDevice({
    account,
    new_dev_name: new_equip_name.value as string,
    org_id,
    site_id: site_id,
    asset_id,
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
  //DELTE ALSO THE IMAGE, ITS BEING KEPT!
};
