import { Device } from "@tago-io/sdk";
import getDevice from "../../lib/getDevice";
import { ServiceParams } from "../../types";

export default async ({ config_dev, scope, account, environment }: ServiceParams, org_dev: Device) => {
  const dev_id = scope[0].device;

  const dev_name = scope.find((x) => x.variable === "dev_name");

  const device_info = await (await getDevice(account, dev_id)).info();
  const site_id = device_info.tags.find((tag) => tag.key === "site_id").value;
  const org_id = device_info.tags.find((tag) => tag.key === "organization_id").value;

  if (org_id) {
    await org_dev.deleteData({ groups: dev_id, qty: 9999 });
  }
  if (site_id) {
    const site_dev = await getDevice(account, site_id as string);
    site_dev.deleteData({ groups: dev_id, qty: 9999 });
  }

  await config_dev.deleteData({ groups: dev_id, qty: 99999 });

  await org_dev.deleteData({ variables: "asset_list", values: dev_name.value });
  await account.dashboards.edit(environment.dash_org, {});

  await account.devices.delete(dev_id);
  await account.buckets.delete(device_info.bucket.id);
  return console.log("Device deleted!");
};
