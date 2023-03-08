import { Account } from "@tago-io/sdk";

interface INotificationError {
  account: Account;
  environment: { [key: string]: string } | string;
  title?: string;
  message: string;
}

/**
 * Get the tago device class from the device id
 */
async function sendNotificationFeedback({ account, environment, title, message }: INotificationError) {
  let user_id: string;
  if (typeof environment === "string") {
    user_id = environment;
  } else {
    user_id = environment?._user_id;
  }

  if (!user_id) {
    return;
  }

  const user = await account.run.userInfo(user_id).catch(() => null);
  if (!user) {
    return;
  }

  await account.run.notificationCreate(user_id, {
    title: title || "Operation error",
    message,
  });
}

export { sendNotificationFeedback };
