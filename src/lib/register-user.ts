import { Resources, Services } from "@tago-io/sdk";
import { TagoContext, TagsObj } from "@tago-io/sdk/lib/types";

import { fetchUserList } from "./fetch-user-list";

interface UserData {
  email: string;
  name: string;
  phone?: string | number | boolean | void;
  timezone: string;
  tags?: TagsObj[];
  password?: string;
}

/**
 * Sends an email to the user with the provided user data, password, and domain URL.
 * @param context - The TagoContext object.
 * @param user_data - The user data object.
 * @param password - The password for the user.
 * @param domain_url - The domain URL for the application.
 * @returns A promise that resolves when the email is sent successfully.
 */
async function sendEmail(context: TagoContext, user_data: UserData, password: string, domain_url: string) {
  const emailService = new Services({ token: context.token }).email;
  await emailService.send({
    to: user_data.email,
    template: {
      name: "invite_user",
      params: {
        name: user_data.name,
        email: user_data.email,
        password,
        domain_url,
      },
    },
  });
}

/**
 * Converts an ISO string to a cron expression.
 * @param isoString The ISO string to convert.
 * @returns The cron expression representing the given ISO string.
 */
function isoToCron(isoString: string): string {
  const date = new Date(isoString);
  const minute = date.getUTCMinutes();
  const hour = date.getUTCHours();
  const dayOfMonth = date.getUTCDate();
  const month = date.getUTCMonth() + 1; // Months are zero-based in Date object

  return `${minute} ${hour} ${dayOfMonth} ${month} *`;
}

async function updateUserAndReturnID(user_data: UserData) {
  // If got an error, try to find the user_data.
  const [user] = await fetchUserList({ email: user_data.email });
  if (!user) {
    throw "Couldn`t find user data";
  }

  // If found, update the tags.
  user.tags = user.tags?.filter((x) => user_data.tags?.find((y) => x.key !== y.key));
  user.tags = user.tags?.concat(user_data.tags || []);

  await Resources.run.userEdit(user.id, { tags: user_data.tags });

  return user.id;
}

/**
 * Invites a user to the system.
 *
 * @param context - The TagoContext object.
 * @param user_data - The user data.
 * @param domain_url - The domain URL.
 * @param active - Optional. Specifies if the user should be active. Defaults to true.
 * @param new_user_activation_date - Optional. The activation date for inactive users.
 *
 * @returns The ID of the invited user.
 *
 * @throws Throws an error if the activation date is required for inactive users and not provided.
 */
async function inviteUser(context: TagoContext, user_data: UserData, domain_url: string, new_user_activation_date?: string) {
  user_data.email = user_data.email.toLowerCase();

  // Generate a Random Password
  const password = user_data.password || `A${Math.random().toString(36).slice(2, 12)}!`;
  const { timezone } = await Resources.account.info();

  let createError = "";
  // Try to create the user.
  const result = await Resources.run
    .userCreate({
      active: new_user_activation_date ? false : true,
      company: "",
      email: user_data.email,
      language: "en",
      name: user_data.name,
      phone: String(user_data.phone || ""),
      tags: user_data.tags,
      timezone: user_data.timezone || timezone || "America/New_York",
      password,
    })
    .catch((error) => {
      createError = error;
      return null;
    });

  if (!result) {
    return updateUserAndReturnID(user_data).catch(() => {
      throw createError;
    });
  }

  // if not activated, don't send the email and password.
  if (new_user_activation_date) {
    const cron = isoToCron(new_user_activation_date);
    const org_id = user_data.tags?.find((x) => x.key === "organization_id")?.value;

    if (!org_id) {
      throw "User not assigned to an organization";
    }

    // create action to activate the user and send the email.
    await Resources.actions.create({
      name: `Activate user: ${user_data.name}`,
      type: "schedule",
      active: true,
      tags: [
        { key: "user_id", value: result.user },
        { key: "organization_id", value: org_id },
      ],
      description: "This action will activate the user once their time has come.",
      trigger: [{ cron, timezone: user_data.timezone || "UTC" }],
      action: { type: "script", script: ["65c41f36d3b4cc001067ffe3"] },
    });

    return result.user;
  }

  // If success, send an email with the password
  await sendEmail(context, user_data, password, domain_url);

  return result.user;
}

export { inviteUser, sendEmail };
