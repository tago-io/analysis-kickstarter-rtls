import { Account, Device, Utils } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { DeviceCreateInfo } from "@tago-io/sdk/out/modules/Account/devices.types";

import { site_id } from "../../analysis/__tests__/mocks/getAssetInfoInside.mock";
import { parseTagoObject } from "../../lib/data.logic";
import { ParamResolver } from "../../lib/edit.params";
import { getZodError } from "../../lib/get-zod-error";
import getDevice from "../../lib/getDevice";
import validation from "../../lib/validation";
import { DeviceCreated, ServiceParams } from "../../types";
import { registerDeviceModel } from "./model/register.model";

interface installDeviceParam {
  account: Account;
  new_dev_name: string;
  org_id: string;
  site_id: string;
  connector: string;
  new_device_eui: string;
  new_device_network: string;
}

async function getNewDeviceVariables(scope: Data[], validate: ReturnType<typeof validation>) {
  const new_dev_name = scope.find((x) => x.variable === "new_dev_name");
  const new_dev_type = scope.find((x) => x.variable === "new_dev_type");
  const new_dev_network = scope.find((x) => x.variable === "new_dev_network");
  const new_dev_eui = scope.find((x) => x.variable === "new_dev_eui");
  const new_dev_site = scope.find((x) => x.variable === "new_dev_site");

  try {
    return registerDeviceModel.parse({
      new_dev_name,
      new_dev_type,
      new_dev_network,
      new_dev_eui,
      new_dev_site,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    await validate(zodErrorMsg, "danger");
    throw error;
  }
}

async function installDevice({ account, new_dev_name, org_id, site_id, connector, new_device_eui, new_device_network }: installDeviceParam) {
  const device_data: DeviceCreateInfo = {
    name: new_dev_name,
    network: new_device_network,
    serie_number: new_device_eui,
    connector,
    type: "immutable",
    chunk_period: "month",
    chunk_retention: 1,
  };

  // creating new device
  const new_dev = await account.devices.create(device_data);

  // inserting device id -> so we can reference this later
  await account.devices.edit(new_dev.device_id, {
    tags: [
      { key: "device_id", value: new_dev.device_id },
      { key: "site_id", value: site_id },
      { key: "organization_id", value: org_id },
      { key: "device_type", value: "device" },
      { key: "device_eui", value: new_device_eui },
      { key: "device_network", value: new_device_network },
      { key: "equipment_id", value: "none" },
      { key: "has_equip", value: "false" },
    ],
  });

  // instantiating new device
  const new_org_dev = new Device({ token: new_dev.token });

  // token, device_id, bucket_id
  return { ...new_dev, device: new_org_dev } as DeviceCreated;
}

async function createSensor({ config_dev, scope, account }: ServiceParams) {
  // getting organization device
  const org_id = scope[0].device;
  const org_dev = await Utils.getDevice(account, org_id);

  // Collecting data
  const validate = validation("dev_validation", org_dev);
  await validate("Registering...", "warning");
  const { new_dev_name, new_dev_type, new_dev_eui, new_dev_site, new_dev_network } = await getNewDeviceVariables(scope, validate);

  if (new_dev_name.value.length < 3) {
    throw await validate("Device name must be at least 3 characters long", "danger");
  }

  new_dev_eui.value = new_dev_eui.value.toUpperCase();

  const [dev_exists] = await org_dev.getData({
    variables: ["dev_eui", "dev_name"],
    values: [new_dev_eui.value, new_dev_name.value],
    qty: 1,
  });

  if (dev_exists) {
    throw await validate("Device already exists", "danger");
  }
  // need device id to configure serie in parseTagoObject
  // creating new device
  const { device_id: dev_id } = await installDevice({
    account,
    new_dev_name: new_dev_name.value,
    org_id,
    site_id: new_dev_site.value,
    connector: new_dev_type.value,
    new_device_eui: new_dev_eui.value,
    new_device_network: new_dev_network.value,
  });

  const device_type_name = (await account.integration.connectors.info(new_dev_type.value)).name;
  const device_network_name = (await account.integration.networks.info(new_dev_network.value)).name;

  const dev_data = parseTagoObject(
    {
      dev_id: dev_id,
      dev_name: new_dev_name.value,
      dev_eui: new_dev_eui.value,
      dev_type: { value: new_dev_type.value, metadata: { label: device_type_name } },
      dev_site: new_dev_site.value,
      dev_network: { value: new_dev_network.value, metadata: { label: device_network_name } },
    },
    dev_id
  );

  const site_dev = await getDevice(account, new_dev_site.value);

  // send to admin device (settings_device) which will send to bucket
  await config_dev.sendData(dev_data);

  // send to organization device
  await org_dev.sendData(dev_data);

  // send to site device
  await site_dev.sendData(dev_data);

  const paramList = await account.devices.paramList(dev_id);
  const paramResolver = ParamResolver(paramList);
  // if the new device is a seeed sensecap t1000-A/B, add its beacon_mode parameter.
  if (new_dev_type.value == "6499864a3498840008651b68") {
    paramResolver.setParam("beacon_decoder", "simple", false);
  }
  await paramResolver.setParam("last_geofence", "null", false).apply(account, dev_id);
  return await validate("Device created successfully!", "success");
}

export { createSensor, getNewDeviceVariables };
