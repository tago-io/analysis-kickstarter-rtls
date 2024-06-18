import { Resources } from "@tago-io/sdk";

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

  const userList = [];

  for (const user of userIdList.metadata.sentValues) {
    try {
      const userInfo = await Resources.run.userInfo(user.value as string);
      userList.push(userInfo);
    } catch (error) {
      console.debug(`Error fetching user info for ${user.value}: ${error}`);
    }
  }

  return userList.filter((x) => x && x.active);
}

export { getUsersFromGroup };
