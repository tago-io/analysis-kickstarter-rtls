import { Resources } from "@tago-io/sdk";
import { Data, DeviceCreateInfo } from "@tago-io/sdk/lib/types";

import { ParamResolver } from "../../lib/edit.params";
import { getZodError } from "../../lib/get-zod-error";
import { parseObjectToTago } from "../../lib/parse-object-to-tagoio";
import { initializeValidation } from "../../lib/validation";
import { ServiceParams } from "../../types";
import { registerDeviceModel } from "./model/register.model";

interface installDeviceParam {
  new_dev_name: string;
  org_id: string;
  site_id: string;
  connector: string;
  new_device_eui: string;
  new_device_network: string;
}

async function getNewDeviceVariables(scope: Data[], validate: ReturnType<typeof initializeValidation>) {
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

async function installDevice({ new_dev_name, org_id, site_id, connector, new_device_eui, new_device_network }: installDeviceParam) {
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
  const new_dev = await Resources.devices.create(device_data);

  // inserting device id -> so we can reference this later
  await Resources.devices.edit(new_dev.device_id, {
    tags: [
      { key: "device_id", value: new_dev.device_id },
      { key: "site_id", value: site_id },
      { key: "organization_id", value: org_id },
      { key: "device_type", value: "sensor" },
      { key: "device_eui", value: new_device_eui },
      { key: "device_network", value: new_device_network },
      { key: "equipment_id", value: "none" },
      { key: "has_equip", value: "false" },
      { key: "connector_id", value: connector },
    ],
  });

  // token, device_id, bucket_id
  return new_dev;
}

async function createSensor({ scope, environment }: ServiceParams) {
  // getting organization device
  const org_id = scope[0].device;
  const config_id = environment.config_id;

  // Collecting data
  const validate = initializeValidation("dev_validation", org_id);
  await validate("Registering...", "warning");
  const { new_dev_name, new_dev_type, new_dev_eui, new_dev_site, new_dev_network } = await getNewDeviceVariables(scope, validate);

  if (new_dev_name.value.length < 3) {
    throw await validate("Device name must be at least 3 characters long", "danger");
  }

  new_dev_eui.value = new_dev_eui.value.toUpperCase();

  const [dev_exists] = await Resources.devices.getDeviceData(org_id, {
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
    new_dev_name: new_dev_name.value,
    org_id,
    site_id: new_dev_site.value,
    connector: new_dev_type.value,
    new_device_eui: new_dev_eui.value,
    new_device_network: new_dev_network.value,
  });

  const device_type_name = (await Resources.integration.connectors.info(new_dev_type.value)).name;
  const device_network_name = (await Resources.integration.networks.info(new_dev_network.value)).name;

  const dev_data = parseObjectToTago(
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

  // send to admin device (settings_device) which will send to bucket
  await Resources.devices.sendDeviceData(config_id, dev_data);

  // send to organization device
  await Resources.devices.sendDeviceData(org_id, dev_data);

  // send to site device
  await Resources.devices.sendDeviceData(new_dev_site.value, dev_data);

  const paramList = await Resources.devices.paramList(dev_id);
  const paramResolver = ParamResolver(paramList);
  // if the new device is a seeed sensecap t1000-A/B, add its beacon_mode parameter.
  if (new_dev_type.value == "6499864a3498840008651b68") {
    paramResolver.setParam("beacon_decoder", "simple", false);
  }
  await paramResolver.setParam("last_geofence", "", false).apply(dev_id);
  return await validate("Device created successfully!", "success");
}

export { createSensor, getNewDeviceVariables };
