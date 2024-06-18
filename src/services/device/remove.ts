import { Resources } from "@tago-io/sdk";

import { sendNotificationFeedback } from "../../lib/send-notification";
import { ServiceParams } from "../../types";

async function deleteSensor({ scope, environment }: ServiceParams) {
  if (!scope[0].device) {
    throw "Device not found!";
  }
  const config_id = environment.config_id;
  const dev_id = scope[0].device;
  const device_info = await Resources.devices.info(dev_id);
  const site_id = device_info.tags.find((tag) => tag.key === "site_id")?.value;
  const org_id = device_info.tags.find((tag) => tag.key === "organization_id")?.value;
  const equip_id = device_info.tags.find((tag) => tag.key === "equipment_id")?.value;

  if (org_id) {
    await Resources.devices.deleteDeviceData(org_id, { groups: dev_id, qty: 9999 });
  }
  if (site_id) {
    await Resources.devices.deleteDeviceData(site_id, { groups: dev_id, qty: 9999 });
  }
  await Resources.devices.deleteDeviceData(config_id, { groups: dev_id, qty: 9999 });

  await Resources.dashboards.edit(environment.dash_org, {});
  await Resources.devices.delete(dev_id);
  if (equip_id != "none") {
    await Resources.devices.delete(equip_id as string);
  }
  await sendNotificationFeedback({
    environment,
    message: `Sensor deleted`,
    title: `Sensor deleted`,
  });
}
export { deleteSensor };
