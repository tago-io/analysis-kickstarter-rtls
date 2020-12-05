import { Device, Account } from "@tago-io/sdk";
import { ServiceParams } from "../../types";

export default async ({ config_dev, context, scope, account, environment }: ServiceParams, org_dev: Device) => {
  const dept_id = scope[0].serie;

  //delete from settings_device
  await config_dev.deleteData({ serie: dept_id, qty: 9999 });

  //deleting device's users (department's user)
  const user_accounts = await account.run.listUsers({ filter: { tags: [{ key: "department_id", value: dept_id }] } });
  if (user_accounts) {
    user_accounts.forEach((user) => account.run.userDelete(user.id));
  }

  //deleting organization's device
  const devices = await account.devices.list({
    amount: 9999,
    page: 1,
    filter: { tags: [{ key: "department_id", value: dept_id }] },
    fields: ["id", "bucket", "tags", "name"],
  });

  if (devices) {
    devices.forEach((x) => {
      account.devices.delete(x.id); /*passing the device id*/
      account.buckets.delete(x.bucket); /*passing the bucket id*/
    });
  }

  return;
};
