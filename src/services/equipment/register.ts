import { Device, Resources } from "@tago-io/sdk";
import { Data, DeviceCreateInfo } from "@tago-io/sdk/lib/types";

import { TagResolver } from "../../lib/edit.tag";
import { getZodError } from "../../lib/get-zod-error";
import { parseObjectToTago } from "../../lib/parse-object-to-tagoio";
import { initializeValidation } from "../../lib/validation";
import { DeviceCreated, ServiceParams } from "../../types";
import { registerEquipModel } from "./model/equipment.model";

interface installDeviceParam {
  new_dev_name: string;
  org_id: string;
  site_id: string;
  asset_id: string;
  equip_serie: string;
  equip_img: string;
  sensor_connector: string;
}

async function getNewEquipVariables(scope: Data[], validate: ReturnType<typeof initializeValidation>) {
  const new_equip_name = scope.find((x) => x.variable === "new_equip_name");
  const new_equip_serie = scope.find((x) => x.variable === "new_equip_serie");
  const new_equip_img = scope.find((x) => x.variable === "new_equip_img");
  const new_equip_asset = scope.find((x) => x.variable === "new_equip_asset");

  try {
    return registerEquipModel.parse({
      name: new_equip_name?.value,
      serieNumber: new_equip_serie?.value,
      image: {
        fileName: new_equip_img?.value,
        url: new_equip_img?.metadata?.file?.url,
      },
      assetID: new_equip_asset?.value,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    await validate(zodErrorMsg, "danger");
    throw error;
  }
}

async function installDevice({ new_dev_name, org_id, site_id, asset_id, equip_serie, equip_img, sensor_connector }: installDeviceParam) {
  // structuring data
  const device_data: DeviceCreateInfo = {
    name: new_dev_name,
    type: "mutable",
    connector: "5f5a8f3351d4db99c40dece5",
    network: "5bbd0d144051a50034cd19fb",
  };

  // creating new device
  const new_dev = await Resources.devices.create(device_data);

  // inserting device id -> so we can reference this later
  await Resources.devices.edit(new_dev.device_id, {
    tags: [
      { key: "equipment_id", value: new_dev.device_id },
      { key: "sensor_id", value: asset_id },
      { key: "site_id", value: site_id },
      { key: "organization_id", value: org_id },
      { key: "device_type", value: "equipment" },
      { key: "equip_serie", value: equip_serie },
      { key: "equip_img", value: equip_img },
      { key: "connector_id", value: sensor_connector },
    ],
  });

  // instantiating new device
  const new_org_dev = new Device({ token: new_dev.token });

  // token, device_id, bucket_id
  return { ...new_dev, device: new_org_dev } as DeviceCreated;
}

async function createEquipment({ scope, environment }: ServiceParams) {
  const org_id = scope[0].device;
  const validate = initializeValidation("equip_validation", org_id);
  await validate("Registering...", "warning");
  // Collecting data
  const { assetID, image, name: equipName, serieNumber } = await getNewEquipVariables(scope, validate);

  if (equipName.length < 3) {
    await validate("Equipment name must be at least 3 characters long", "danger");
  }

  // deleteData
  await Resources.dashboards.edit(environment.dash_org, {});

  console.log("assetID", assetID);
  const [asset_name] = await Resources.devices.getDeviceData(org_id, { variables: "dev_name", groups: assetID, qty: 1 });
  console.log("asset_name", asset_name);
  const asset_id = asset_name?.group;

  if (!asset_id) {
    throw "Asset id not found";
  }

  const assetInfo = await Resources.devices.info(asset_id);

  const site_id = assetInfo.tags.find((x) => x.key === "site_id")?.value;
  const sensor_connector = assetInfo.connector;

  if (!site_id) {
    throw "Site id not found!";
  }

  const { device_id: equip_id } = await installDevice({
    new_dev_name: equipName,
    org_id,
    site_id: site_id,
    asset_id,
    equip_serie: serieNumber,
    equip_img: image.url,
    sensor_connector,
  });

  const equip_data = parseObjectToTago(
    {
      equip_name: equipName,
      equip_img: image.url,
      equip_asset: assetID,
      equip_serie: serieNumber,
    },
    equip_id
  );

  const { tags: asset_dev_tags } = await Resources.devices.info(asset_id);
  const tagResolver = TagResolver(asset_dev_tags);
  tagResolver.setTag("equipment_id", equip_id);
  tagResolver.setTag("has_equip", "true");
  await tagResolver.apply(assetID);

  await Resources.devices.sendDeviceData(org_id, equip_data);
  await Resources.devices.sendDeviceData(site_id, equip_data);

  return validate("Equipment created successfully!", "success");
}

export { createEquipment, getNewEquipVariables };
