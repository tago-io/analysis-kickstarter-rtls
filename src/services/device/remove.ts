import { Device, Account } from "@tago-io/sdk";
import getDevice from "../../lib/getDevice";
import { ServiceParams } from "../../types";

export default async ({ config_dev, context, scope, account, environment }: ServiceParams, org_dev: Device) => {
  console.log(scope);
  const dev_id = scope[0].serie;

  const device_to_delete = await (await getDevice(account, dev_id)).info();
  const site_id = device_to_delete.tags.find((tag) => tag.key === "site_id").value;
  const org_id = device_to_delete.tags.find((tag) => tag.key === "organization_id").value;

  if (org_id) {
    await org_dev.deleteData({ serie: dev_id, qty: 9999 });
  }
  if (site_id) {
    const site_dev = await getDevice(account, site_id as string);
    site_dev.deleteData({ serie: dev_id, qty: 9999 });
  }

  await config_dev.deleteData({ serie: dev_id, qty: 99999 });

  //we must collect device_info before delete it
  const device_info = await account.devices.info(dev_id);

  await account.devices.delete(dev_id);
  await account.buckets.delete(device_info.bucket.id);
  return console.log("Device deleted!");
};
