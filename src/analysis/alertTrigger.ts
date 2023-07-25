import { Account, Analysis, Services, Utils } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { DeviceInfo } from "@tago-io/sdk/out/modules/Account/devices.types";
import { UserInfo } from "@tago-io/sdk/out/modules/Account/run.types";
import { TagoContext } from "@tago-io/sdk/out/modules/Analysis/analysis.types";

interface IMessageDetail {
  device_name: string;
  device_id: string;
  sensor_type: string;
  value: string;
  variable: string;
}

async function notificationMessages(type: string[], account: Account, users_info: UserInfo[], message: string) {
  if (type.includes("push")) {
    users_info.forEach((user) => {
      void account.run.notificationCreate(user.id, {
        message,
        title: "Alert Trigger",
      });
    });
  }
}

async function emailMessages(type: string[], context: TagoContext, users_info: UserInfo[], device_info: any, message: string) {
  if (type.includes("email")) {
    const email = new Services({ token: context.token }).email;

    void email.send({
      to: users_info.map((x) => x.email).join(","),
      template: {
        name: "email_alert",
        params: {
          device_name: device_info.name,
          alert_message: message,
        },
      },
    });
  }
}

async function smsMessages(type: string[], context: TagoContext, users_info: UserInfo[], message: string) {
  if (type.includes("sms")) {
    users_info.forEach((user) => {
      const smsService = new Services({ token: context.token }).sms;
      if (!user.phone) {
        throw "user.phone not found";
      }
      void smsService
        .send({
          message,
          to: user.phone,
        })
        .then((msg) => console.debug(msg));
    });
  }
}

async function dispachMessages(type: string[], account: Account, context: TagoContext, users_info: UserInfo[], message: string, device_info: DeviceInfo) {
  await notificationMessages(type, account, users_info, message);
  await emailMessages(type, context, users_info, device_info, message);
  await smsMessages(type, context, users_info, message);
}

/**
 * Function that replaces the message with the variables
 * @param message Message to be sent
 * @param replace_details Object with the variables to be replaced
 */
function replaceMessage(message: string, replace_details: IMessageDetail) {
  for (const key of Object.keys(replace_details)) {
    message = message.replace(new RegExp(`#${key}#`, "g"), (replace_details as any)[key]);
    console.debug((replace_details as any)[key]);
  }

  return message;
}

/**
 * Function that get the users information
 * @param account Account instanced class
 * @param send_to Array of users to receive the message
 */
async function getUsers(account: Account, send_to: string[]) {
  const func_list = send_to.map((user_id) => account.run.userInfo(user_id).catch(() => null));

  return (await Promise.all(func_list)).filter((x) => x) as UserInfo[];
}

/**
 * Function that starts the analysis and handles the alert trigger
 * @param context Context is a variable sent by the analysis
 * @param scope Scope is an array of data sent by the analysis
 */
async function analysisAlert(context: TagoContext, scope: Data[]): Promise<void> {
  console.debug("Running Analysis");
  if (!scope[0]) {
    return console.debug("This analysis must be triggered by an action.");
  }

  console.debug(JSON.stringify(scope));
  // Get the environment variables.
  const environment_variables = Utils.envToJson(context.environment);
  if (!environment_variables.account_token) {
    return console.debug('Missing "account_token" environment variable');
  } else if (environment_variables.account_token.length !== 36) {
    return console.debug('Invalid "account_token" in the environment variable');
  }

  // Instance the Account class
  const account = new Account({ token: environment_variables.account_token });

  const action_id = environment_variables._action_id;
  if (!action_id) {
    return console.debug("This analysis must be triggered by an action.");
  }

  // Get action details
  const action_info = await account.actions.info(action_id);
  if (!action_info.tags) {
    throw "action_info.tags not found";
  }

  if (!action_info.trigger) {
    throw "action_info.trigger not found";
  }

  const send_to = action_info.tags
    .find((x) => x.key === "send_to")
    ?.value?.replace(/;/g, ",")
    .split(",");
  const type = action_info.tags
    .find((x) => x.key === "action_type")
    ?.value?.replace(/;/g, ",")
    .split(",");

  if (!send_to) {
    throw "send_to not found";
  }

  if (!type) {
    throw "type not found";
  }
  // const alert_id = action_info.tags.find((x) => x.key === "action_id")?.value;
  const alert_id = action_id;

  // Get action message
  const org_id = action_info.tags.find((x) => x.key === "organization_id")?.value;

  if (!org_id) {
    throw "org_id not found";
  }
  const org_dev = await Utils.getDevice(account, org_id);
  const [message_var] = await org_dev.getData({ variables: ["action_list_message", "action_group_message"], groups: alert_id, qty: 1 });

  const trigger_variable = scope.find((x) => x.variable === (action_info.trigger[0] as any).variable);
  if (!trigger_variable?.value) {
    throw "trigger_variable.value not found";
  }

  const device_id = scope[0].device;
  const device_info = await account.devices.info(device_id);

  const sensor_type = device_info?.tags?.find((tag) => tag.key === "device_type")?.value;
  if (!sensor_type) {
    throw "sensor_type not found";
  }

  const replace_details: IMessageDetail = {
    device_name: device_info?.name,
    device_id: device_info?.id,
    sensor_type: sensor_type,
    value: String(trigger_variable?.value),
    variable: trigger_variable?.variable,
  };

  const message = replaceMessage(message_var.value as string, replace_details);

  const users_info = await getUsers(account, send_to);

  await dispachMessages(type, account, context, users_info, message, device_info);

  return console.debug("Analysis Finished!");
}

if (!process.env.T_TEST) {
  Analysis.use(analysisAlert, { token: process.env.T_ANALYSIS_TOKEN });
}

export { analysisAlert };
