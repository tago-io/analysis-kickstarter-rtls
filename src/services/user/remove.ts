import { Device, Account } from "@tago-io/sdk";
import getDevice from "../../lib/getDevice";
import { ServiceParams, TagoContext, DeviceCreated } from "../../types";

export default async ({ config_dev, context, scope, account, environment }: ServiceParams, org_dev: Device) => {
  const user_id = scope[0].serie;
  //checking if user exists
  const user_exists = await account.run.userInfo(user_id);
  if (!user_exists) throw "User does not exist";

  //collecting org id
  const org_id = user_exists.tags.find((x) => x.key === "organization_id");

  if (!org_dev) throw "Organization device not found";

  // block the user from deleting himself  //?
  if (environment._user_id === user_id) {
    // await org_dev.sendData(scope);
    throw "User tried to delete himself";
  }

  //deleting data from config_dev and org_dev
  await config_dev.deleteData({ serie: user_id, qty: 9999 });
  await org_dev.deleteData({ serie: user_id, qty: 9999 });
  //deleting user
  await account.run.userDelete(user_id).then((msg) => console.log(msg));
  return;
};
