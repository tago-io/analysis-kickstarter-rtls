import { Resources } from "@tago-io/sdk";
import { UserInfo } from "@tago-io/sdk/lib/types";

/**
 * Function that gets the users' information from a specific group
 * @param orgID The organization ID
 * @param groupID The group ID
 */
async function getUsersFromGroup(orgID: string, groupID: string) {
  const [userIdList] = await Resources.devices.getDeviceData(orgID, { variables: ["recipients_user_list"], groups: [groupID], qty: 1 });
  if (!userIdList?.metadata?.sentValues) {
    return [];
  }

  const func_list = userIdList.metadata.sentValues.map((user) =>
    Resources.run.userInfo(user.value as string).catch((error) => {
      console.debug(`Error fetching user info for ${user.value}: ${error.message}`);
      return null;
    })
  );
  const userList = await Promise.all(func_list);

  return userList.filter((x) => x && x.active) as UserInfo[];
}

export { getUsersFromGroup };
