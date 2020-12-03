import { Device, Account } from "@tago-io/sdk";
import getDevice from "../../lib/getDevice";
import { ServiceParams, TagoContext, DeviceCreated } from "../../types";

export default async ({ config_dev, context, scope, account, environment }: ServiceParams) => {
  const org_id = scope[0].serie; //id of the org device

  //delete organization device
  const test = await config_dev.deleteData({ serie: org_id, qty: 99999 });
  console.log(test);

  //deleting device's users
  const user_accounts = await account.run.listUsers({ filter: { tags: [{ key: "organization_id", value: org_id }] } });
  if (user_accounts) {
    user_accounts.forEach((user) => account.run.userDelete(user.id));
  }

  const devices = await account.devices.list({
    amount: 9999,
    page: 1,
    filter: { tags: [{ key: "organization_id", value: org_id }] },
    fields: ["id", "bucket", "tags", "name"],
  });

  console.log(devices);

  devices.forEach((x) => {
    account.devices.delete(x.id); /*passing the device id*/
    account.buckets.delete(x.bucket); /*passing the bucket id*/
  });

  const device = await getDevice(account, org_id);

  return;
};
