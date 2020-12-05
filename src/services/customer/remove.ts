import { Device, Account } from "@tago-io/sdk";
import getDevice from "../../lib/getDevice";
import { ServiceParams, TagoContext, DeviceCreated } from "../../types";

export default async ({ config_dev, context, scope, account, environment }: ServiceParams) => {
  const user_id = scope[0].serie;
  const user_exists = await account.run.userInfo(user_id);
  if (!user_exists) throw "User does not exist";

  //collecting org id
  const org_id = user_exists.tags.find((x) => x.key === "organization_id");
  const org_device = await getDevice(account, org_id.value as string);

  if (!org_device) throw "Organization device not found";

  // block the user from deleting himself  //?
  if (environment._user_id === user_id) {
    // await org_device.sendData(scope);
    throw "User tried to delete himself";
  }

  await config_dev.deleteData({ serie: user_id, qty: 9999 });
  await org_device.deleteData({ serie: user_id, qty: 9999 });
  await account.run.userDelete(user_id);
  return;
};
