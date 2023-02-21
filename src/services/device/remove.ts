import getDevice from "../../lib/getDevice";
import { ServiceParams } from "../../types";

async function deleteSensor({ config_dev, scope, account, environment }: ServiceParams) {
  const dev_id = scope[0].device;
  const device_info = await (await getDevice(account, dev_id)).info();
  const site_id = device_info.tags.find((tag) => tag.key === "site_id").value;
  if (site_id) {
    const site_dev = await getDevice(account, site_id);
    await site_dev.deleteData({ groups: dev_id, qty: 9999 });
  }
  await config_dev.deleteData({ groups: dev_id, qty: 9999 });
  await account.dashboards.edit(environment.dash_org, {});
  await account.devices.delete(dev_id);
  return console.log("Device deleted!");
}
export { deleteSensor };
