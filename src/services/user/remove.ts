import { Utils } from "@tago-io/sdk";
import { ServiceParams } from "../../types";

async function deleteUser({ config_dev, scope, account, environment }: ServiceParams) {
  const user_id = scope[0].device;
  const org_dev = await Utils.getDevice(account, user_id);
  // checking if user exists
  const user_exists = await account.run.userInfo(user_id);
  if (!user_exists) {
    throw "User does not exist";
  }

  if (!org_dev) {
    throw "Organization device not found";
  }

  // block the user from deleting himself
  if (environment._user_id === user_id) {
    // await org_dev.sendData(scope);
    throw "User tried to delete himself";
  }

  // deleting data from config_dev and org_dev
  await config_dev.deleteData({ groups: user_id, qty: 9999 });
  await org_dev.deleteData({ groups: user_id, qty: 9999 });
  // deleting user
  await account.run.userDelete(user_id).then((msg) => console.log(msg));
  return;
}

export { deleteUser };
