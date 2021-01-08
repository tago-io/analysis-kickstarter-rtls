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
  connector: string;
  new_device_eui: string;
}

export default async ({ config_dev, context, scope, account, environment }: ServiceParams, org_dev: Device) => {
  console.log("Registering...");
  //Collecting data
  const new_equip_name = scope.find((x) => x.variable === "new_equip_name");
  const new_equip_serie = scope.find((x) => x.variable === "new_equip_serie");
  const new_equip_img = scope.find((x) => x.variable === "new_equip_img");
  const new_equip_asset = scope.find((x) => x.variable === "new_equip_asset");

  const org_id = scope[0].origin as string;

  // const asset_list = await org_dev.getData({ variable: "asset_list" });
  // const index = asset_list.indexOf(asset_list.find((x) => x.value === new_equip_asset.value));
  // asset_list.splice(index, 1);

  //deleteData
  await org_dev.deleteData({ variable: "asset_list", value: new_equip_asset.value }).then((msg) => console.log(msg));
  await account.dashboards.edit("5fca818da0e14a00267c419e", {});

  //validation
  const validate = validation("equip_validation", org_dev);

  const equip_data = parseTagoObject({
    equip_name: new_equip_name.value,
    equip_serie: new_equip_serie.value,
    equip_img: `https://api.tago.io/file/5fc13907cf4e170027440a96/${(new_equip_img?.metadata as any)?.file?.path}`,
    equip_asset: new_equip_asset.value,
  });

  await org_dev.sendData(equip_data);

  return validate("Device created successfully!", "success");
};
