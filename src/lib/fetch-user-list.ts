import { Account } from "@tago-io/sdk";
import { UserInfo, UserQuery } from "@tago-io/sdk/out/modules/Account/run.types";

type FetchUserResponse = Pick<UserInfo, "id" | "name" | "phone" | "company" | "tags" | "active" | "email" | "timezone">;

/**
 * Fetchs the user list using filters.
 * Automatically apply pagination to not run on throughtput errors.
 * @param account TagoIO Account object
 * @param filter filter conditions of the request
 * @returns
 */
async function fetchUserList(account: Account, filter: UserQuery["filter"]): Promise<FetchUserResponse[]> {
  let userList: FetchUserResponse[] = [];

  for (let index = 1; index < 9999; index++) {
    const amount = 40;
    const foundUsers = await account.run
      .listUsers({
        page: index,
        fields: ["id", "name", "phone", "company", "tags", "active", "email", "timezone"],
        filter,
        amount,
      })
      .then((r) => r as FetchUserResponse[]);

    userList = userList.concat(foundUsers);
    if (foundUsers.length < amount) {
      return userList;
    }
  }

  return userList;
}

export { fetchUserList };
