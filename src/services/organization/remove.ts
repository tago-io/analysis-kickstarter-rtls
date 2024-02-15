import { queue } from "async";

import { Resources } from "@tago-io/sdk";

import { fetchDeviceList } from "../../lib/fetch-device-list";
import { sendNotificationFeedback } from "../../lib/send-notification";
import { ServiceParams } from "../../types";

async function deleteOrganization({ scope, environment }: ServiceParams) {
  if (!scope[0].device) {
    throw "Organization not found!";
  }
  const config_id = environment.config_id;
  // id of the org device
  const org_id = scope[0].device; // changed this from device to group... it was deleting all organizations, so i changed it back to device

  // delete from settings_device
  await Resources.devices.deleteDeviceData(config_id, { groups: org_id, qty: 10_000 });

  // deleting users (organization's user)
  const user_accounts = await Resources.run.listUsers({ filter: { tags: [{ key: "organization_id", value: org_id }] } });
  if (user_accounts) {
    for (const user of user_accounts) {
      void Resources.run.userDelete(user.id);
    }
  }

  // deleting organization's device
  const devices = await fetchDeviceList({ tags: [{ key: "organization_id", value: org_id }] });

  async function deleteData(device: any) {
    await Resources.devices.delete(device.id);
  }

  const deleteQueue = queue(deleteData, 5);
  deleteQueue.error((error: any) => console.log(error));
  if (devices) {
    for (const device of devices) {
      void deleteQueue.push(device);
    }
  }

  await deleteQueue.drain();
  await sendNotificationFeedback({
    environment,
    message: `Organization deleted`,
    title: `Organization deleted`,
  });
  return;
}

export { deleteOrganization };
