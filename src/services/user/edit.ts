/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Resources } from "@tago-io/sdk";

import { getZodError } from "../../lib/get-zod-error";
import { initializeValidation } from "../../lib/validation";
import { ServiceParams } from "../../types";
import { editUserModel } from "./model/edit.model";

async function getUserVariables(scope: any, validate: ReturnType<typeof initializeValidation>) {
  const user_name = scope[0]?.name;
  const user_phone = scope[0]?.["tags.phone"];

  try {
    return editUserModel.parse({
      user_name,
      user_phone,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    await validate(zodErrorMsg, "danger");
    throw error;
  }
}

async function editUser({ scope, environment }: ServiceParams) {
  const user_id = scope[0].user;
  const config_id = environment.config_id;
  // validate variable
  const validate = initializeValidation("user_validation", config_id);
  // Collecting data
  const { user_name, user_phone } = await getUserVariables(scope, validate);
  // geting user Organization tag
  const user_exists = await Resources.run.userInfo(user_id);
  const tags = user_exists.tags;
  const org_id = tags.find((tag) => tag.key === "organization_id")?.value;
  // geting user Organization device

  if (!org_id) {
    return "User does not have an organization";
  }

  const new_user_info: any = {};
  if (user_name) {
    new_user_info.name = user_name;
    await Resources.run.userEdit(user_id, new_user_info);

    //fetching prev data
    const [user_name_config_dev] = await Resources.devices.getDeviceData(config_id, { variables: "user_name", qty: 1, groups: user_id });
    const [user_name_org_dev] = await Resources.devices.getDeviceData(org_id, { variables: "user_name", qty: 1, groups: user_id });
    //deleting prev data
    await Resources.devices.deleteDeviceData(org_id, { id: user_name_org_dev.id } as any);
    await Resources.devices.deleteDeviceData(config_id, { id: user_name_org_dev.id } as any);
    //modifying json object
    // @ts-expect-error
    delete user_name_config_dev.time;
    // @ts-expect-error
    delete user_name_config_dev.id;
    // @ts-expect-error
    delete user_name_org_dev.time;
    // @ts-expect-error
    delete user_name_org_dev.id;

    //sending new data
    await Resources.devices.sendDeviceData(config_id, { ...user_name_config_dev, value: user_name }).then((msg) => console.log(msg));
    await Resources.devices.sendDeviceData(org_id, { ...user_name_org_dev, value: user_name });

    new_user_info.name = user_name;
    await Resources.run.userEdit(user_id, new_user_info);
  }
  if (user_phone) {
    //fetching prev data
    const [user_phone_config_dev] = await Resources.devices.getDeviceData(config_id, { variables: "user_phone", qty: 1, groups: user_id });
    const [user_phone_org_dev] = await Resources.devices.getDeviceData(org_id, { variables: "user_phone", qty: 1, groups: user_id });
    //deleting prev data
    await Resources.devices.deleteDeviceData(config_id, { id: user_phone_config_dev.id } as any);
    await Resources.devices.deleteDeviceData(org_id, { id: user_phone_org_dev.id } as any);
    //modifying json object
    // @ts-expect-error
    delete user_phone_config_dev.time;
    // @ts-expect-error
    delete user_phone_config_dev.id;
    // @ts-expect-error
    delete user_phone_org_dev.time;
    // @ts-expect-error
    delete user_phone_org_dev.id;

    //sending new data
    await Resources.devices.sendDeviceData(config_id, { ...user_phone_config_dev, value: user_phone }).then((msg) => console.log(msg));
    await Resources.devices.sendDeviceData(org_id, { ...user_phone_org_dev, value: user_phone });

    new_user_info.phone = user_phone;
    await Resources.run.userEdit(user_id, new_user_info);
  }
  return;
}

export { editUser, getUserVariables };
