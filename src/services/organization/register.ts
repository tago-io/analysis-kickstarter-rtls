import { Device, Resources } from "@tago-io/sdk";
import { Data, DeviceCreateInfo } from "@tago-io/sdk/lib/types";

import { getZodError } from "../../lib/get-zod-error";
import { parseObjectToTago } from "../../lib/parse-object-to-tagoio";
import { initializeValidation } from "../../lib/validation";
import { DeviceCreated, ServiceParams } from "../../types";
import { registerOrgModel } from "./models/org.model";

interface installDeviceParam {
  new_org_name: string;
  new_org_address: string;
}

async function getNewOrgVariables(scope: Data[], validate: ReturnType<typeof initializeValidation>) {
  const name = scope.find((x) => x.variable === "new_org_name")?.value;
  const address = scope.find((x) => x.variable === "new_org_address");
  try {
    return registerOrgModel.parse({
      name,
      address: { value: address?.value, location: address?.location?.coordinates },
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    await validate(zodErrorMsg, "danger");
    throw error;
  }
}

async function installDevice({ new_org_name, new_org_address }: installDeviceParam) {
  // structuring data
  const device_data: DeviceCreateInfo = {
    name: new_org_name,
    type: "mutable",
    connector: "5f5a8f3351d4db99c40dece5",
    network: "5bbd0d144051a50034cd19fb",
  };

  // creating new device
  const new_org = await Resources.devices.create(device_data);

  // inserting device id -> so we can reference this later
  await Resources.devices.edit(new_org.device_id, {
    tags: [
      { key: "organization_id", value: new_org.device_id },
      { key: "device_type", value: "organization" },
      { key: "address", value: new_org_address },
    ],
  });

  // instantiating new device
  const new_org_dev = new Device({ token: new_org.token });

  // token, device_id, bucket_id
  return { ...new_org, device: new_org_dev } as DeviceCreated;
}

async function createOrganization({ scope, environment }: ServiceParams) {
  // creating validate
  const config_id = environment.config_id;
  const validate = initializeValidation("org_validation", config_id);
  // Collecting data
  await validate("Registering...", "warning");
  const { name: new_org_name, address: new_org_address } = await getNewOrgVariables(scope, validate);
  const [org_exists] = await Resources.devices.getDeviceData(config_id, { variables: "org_name", values: new_org_name, qty: 1 });
  const { id: config_dev_id } = await Resources.devices.info(config_id);

  if (org_exists) {
    throw await validate("Organization name already exists", "danger");
  }

  if (new_org_name.length < 3) {
    throw await validate("Organization name must be at least 3 characters long", "danger");
  }

  const dashboard_info = await Resources.dashboards.list();
  const organization_dashboard = dashboard_info.find((dashboard) => dashboard.label === "#GLOBAL.ORGANIZATION#");
  const organization_dashboard_id = organization_dashboard?.id;

  // need device id to configure serie in parseTagoObject
  // creating new device
  const { device_id, device } = await installDevice({ new_org_name: new_org_name, new_org_address: new_org_address.value });
  const org_data = {
    org_id: device_id,
    org_name: {
      value: new_org_name,
      metadata: { url: `https://admin.tago.io/dashboards/info/${organization_dashboard_id}?settings=${config_dev_id}&org_dev=${device_id}` },
    }, // org_name.value widget?
    org_address: { value: new_org_address.value, location: new_org_address.location },
  };

  const device_info = await device.info();
  const tags = device_info.tags || [];
  tags.push({ key: "url_link", value: `https://admin.tago.io/dashboards/info/${environment.dash_org}?settings=${config_dev_id}&org_dev=${device_id}` });

  await Resources.devices.edit(device_id, { tags });
  // send to admin device (settings_device) which will send to bucket
  await Resources.devices.sendDeviceData(config_id, parseObjectToTago(org_data, device_id));

  return await validate("Organization created", "success");
}

export { createOrganization, getNewOrgVariables };
