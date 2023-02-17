import { Device, Utils } from "@tago-io/sdk";
import { ServiceParams } from "../../types";

async function deleteSite({ config_dev, scope, account }: ServiceParams) {
  const site_id = scope[0].device;

  // getting Organization device
  const org_id = scope[0].device;
  const org_dev = await Utils.getDevice(account, org_id);

  // delete from settings_device
  await config_dev.deleteData({ groups: site_id, qty: 9999 });
  // delete from org_dev
  await org_dev.deleteData({ groups: site_id, qty: 9999 });

  // deleting users (site's user)
  const user_accounts = await account.run.listUsers({ filter: { tags: [{ key: "site_id", value: site_id }] } });
  if (user_accounts) {
    user_accounts.forEach(async (user) => {
      await account.run.userDelete(user.id);
      await org_dev.deleteData({ groups: user.id, qty: 9999 }).then((msg) => console.log(msg));
      await config_dev.deleteData({ groups: user.id, qty: 9999 });
    });
  }

  // deleting site's device
  const devices = await account.devices.list({
    amount: 9999,
    page: 1,
    filter: { tags: [{ key: "site_id", value: site_id }] },
    fields: ["id", "bucket", "tags", "name"],
  });

  if (devices) {
    devices.forEach(async (x) => {
      account.devices.delete(x.id); /*passing the device id*/
      account.buckets.delete(x.bucket); /*passing the bucket id*/
      await org_dev.deleteData({ groups: x.id, qty: 9999 }).then((msg) => msg); /*deleting org_dev and config_dev data*/
      await config_dev.deleteData({ groups: x.id, qty: 9999 });
    });
  }

  return;
}

export { deleteSite };
