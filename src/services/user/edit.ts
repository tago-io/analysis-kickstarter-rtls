import { getZodError } from "../../lib/get-zod-error";
import validation from "../../lib/validation";
import { ServiceParams } from "../../types";
import { editUserModel } from "./model/edit.model";

async function getUserVariables(scope: any, validate: ReturnType<typeof validation>) {
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

async function editUser({ config_dev, scope, account }: ServiceParams) {
  // the line below is incorret, need to find another way to get since we aren´t using dynamic table anymore.
  const user_id = scope[0].user;
  // validate variable
  const validate = validation("user_validation", config_dev);
  // Collecting data
  const { user_name, user_phone } = await getUserVariables(scope, validate);

  const new_user_info: any = {};
  if (user_name) {
    new_user_info.name = user_name;
    await account.run.userEdit(user_id, new_user_info);
  }
  if (user_phone) {
    new_user_info.phone = user_phone;
    await account.run.userEdit(user_id, new_user_info);
  }
  return;
}

export { editUser, getUserVariables };
