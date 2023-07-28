import getDevice from "../../lib/getDevice";
import { sendNotificationFeedback } from "../../lib/send-notification";
import { ServiceParams } from "../../types";

async function deleteSensor({ config_dev, scope, account, environment }: ServiceParams) {
  if (!scope[0].device) {
    throw "Device not found!";
  }
  const dev_id = scope[0].device;
  const dev_dev = await getDevice(account, dev_id);
  const device_info = await dev_dev.info();
  const site_id = device_info.tags.find((tag) => tag.key === "site_id")?.value;
  const org_id = device_info.tags.find((tag) => tag.key === "organization_id")?.value;
  const equip_id = device_info.tags.find((tag) => tag.key === "equipment_id")?.value;
  const org_dev = await getDevice(account, org_id as string);
  if (org_id) {
    await org_dev.deleteData({ groups: dev_id, qty: 9999 });
  }
  if (site_id) {
    const site_dev = await getDevice(account, site_id);
    await site_dev.deleteData({ groups: dev_id, qty: 9999 });
  }
  await config_dev.deleteData({ groups: dev_id, qty: 9999 });

  await account.dashboards.edit(environment.dash_org, {});
  await account.devices.delete(dev_id);
  if (equip_id != "none") {
    await account.devices.delete(equip_id as string);
  }
  await sendNotificationFeedback({
    account,
    environment,
    message: `Sensor deleted`,
    title: `Sensor deleted`,
  });
}
export { deleteSensor };
