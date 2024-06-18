import { Resources } from "@tago-io/sdk";

import { ServiceParams } from "../../types";

async function deleteUser({ scope, environment }: ServiceParams) {
  const user_id = scope[0].user;
  const config_id = environment.config_id;
  // checking if user exists
  const user_exists = await Resources.run.userInfo(user_id);

  // getting the organization_id tag
  const tags = user_exists.tags;
  const org_id = tags.find((tag) => tag.key === "organization_id")?.value;
  if (!org_id) {
    throw "Organization ID not found";
  }

  if (!user_exists) {
    throw "User does not exist";
  }

  if (!org_id) {
    throw "Organization device not found";
  }

  // block the user from deleting himself
  if (environment._user_id === user_id) {
    // await org_dev.sendData(scope);
    throw "User tried to delete himself";
  }

  // deleting data from config_dev and org_dev
  await Resources.devices.deleteDeviceData(config_id, { groups: user_id, qty: 9999 });
  await Resources.devices.deleteDeviceData(org_id, { groups: user_id, qty: 9999 });
  // deleting user
  await Resources.run.userDelete(user_id);
  return;
}

export { deleteUser };
