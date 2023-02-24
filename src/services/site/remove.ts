import { queue } from "async";
import { Utils } from "@tago-io/sdk";
import { ServiceParams } from "../../types";

async function deleteSite({ config_dev, scope, account }: ServiceParams) {
  if (!scope[0].device) {
    throw "Site not found!";
  }
  const site_id = scope[0].device;
  // getting Organization device
  const site_dev = await Utils.getDevice(account, site_id);
  const site_tags = await site_dev.info();
  const org_id = site_tags.tags.find((x) => x.key === "organization_id").value;
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
      await org_dev.deleteData({ groups: user.id, qty: 9999 });
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

  async function deleteData(device: any) {
    await account.devices.delete(device.id); /*passing the device id*/
    await org_dev.deleteData({ groups: device.id, qty: 9999 }).then((msg) => msg); /*deleting org_dev and config_dev data*/
    await config_dev.deleteData({ groups: device.id, qty: 9999 });
  }

  const deleteQueue = await queue(deleteData, 5);
  deleteQueue.error((error: any) => console.log(error));

  if (devices) {
    devices.forEach(async (device) => {
      deleteQueue.push(device);
    });
  }

  await deleteQueue.drain();
  return;
}

export { deleteSite };
