import { Device, Account } from "@tago-io/sdk";
import { parseTagoObject } from "../../lib/data.logic";
import getDevice from "../../lib/getDevice";
import { ServiceParams } from "../../types";

export default async ({ config_dev, context, scope, account, environment }: ServiceParams, org_dev: Device) => {
  console.log(scope);

  const equip_asset = scope.find((x) => x.variable === "equip_asset");

  await org_dev.sendData(parseTagoObject({ asset_list: equip_asset.value }));

  return console.log("Equipment deleted!");
};
