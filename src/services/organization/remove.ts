import { queue } from "async";
import { ServiceParams } from "../../types";

async function deleteOrganization({ config_dev, scope, account }: ServiceParams) {
  if (!scope[0].device) {
    throw "Organization not found!";
  }
  // id of the org device
  const org_id = scope[0].device; // changed this from device to group... it was deleting all organizations, so i changed it back to device

  // delete from settings_device
  await config_dev.deleteData({ groups: org_id, qty: 10_000 });

  // deleting users (organization's user)
  const user_accounts = await account.run.listUsers({ filter: { tags: [{ key: "organization_id", value: org_id }] } });
  if (user_accounts) {
    user_accounts.forEach((user) => account.run.userDelete(user.id));
  }

  // deleting organization's device
  const devices = await account.devices.list({
    amount: 9999,
    page: 1,
    filter: { tags: [{ key: "organization_id", value: org_id }] },
    fields: ["id", "bucket", "tags", "name"],
  });

  async function deleteData(device: any) {
    await account.devices.delete(device.id);
  }

  const deleteQueue = await queue(deleteData, 5);
  deleteQueue.error((error: any) => console.log(error));
  if (devices) {
    devices.forEach((device) => {
      deleteQueue.push(device);
    });
  }

  await deleteQueue.drain();
  return;
}

export { deleteOrganization };
