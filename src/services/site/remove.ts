import { queue } from "async";

import { Resources } from "@tago-io/sdk";

import { fetchDeviceList } from "../../lib/fetch-device-list";
import { sendNotificationFeedback } from "../../lib/send-notification";
import { ServiceParams } from "../../types";

async function deleteSite({ environment, scope }: ServiceParams) {
  if (!scope[0].device) {
    throw "Site not found!";
  }
  const site_id = scope[0].device;
  // getting Organization device

  const config_id = environment.config_id;

  const site_tags = await Resources.devices.info(site_id);
  const org_id = site_tags.tags.find((x) => x.key === "organization_id")?.value as string;

  if (!org_id) {
    throw "Organization not found!";
  }

  // delete from settings_device
  await Resources.devices.deleteDeviceData(config_id, { groups: site_id, qty: 9999 });
  // delete from org_dev
  await Resources.devices.deleteDeviceData(org_id, { groups: site_id, qty: 9999 });

  // deleting users (site's user)
  const user_accounts = await Resources.run.listUsers({ filter: { tags: [{ key: "site_id", value: site_id }] } });
  if (user_accounts) {
    for (const user of user_accounts) {
      await Resources.run.userDelete(user.id);
      await Resources.devices.deleteDeviceData(org_id, { groups: user.id, qty: 9999 });
      await Resources.devices.deleteDeviceData(config_id, { groups: user.id, qty: 9999 });
    }
  }

  // deleting site's device
  const devices = await fetchDeviceList({ tags: [{ key: "site_id", value: site_id }] });

  async function deleteData(device: any) {
    await Resources.devices.delete(device.id); /*passing the device id*/
    await Resources.devices.deleteDeviceData(org_id, { groups: device.id, qty: 9999 });
    await Resources.devices.deleteDeviceData(config_id, { groups: device.id, qty: 9999 });
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
    message: `Site deleted`,
    title: `Site deleted`,
  });
  return;
}

export { deleteSite };
