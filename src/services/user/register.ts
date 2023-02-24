import { Types, Utils } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { getZodError } from "../../lib/get-zod-error";
import registerUser from "../../lib/registerUser";
import validation from "../../lib/validation";
import { ServiceParams } from "../../types";
import { registerUserModel } from "./model/register.model";

interface UserData {
  name: string;
  email: string;
  phone?: string | number | boolean | void;
  timezone: string;
  tags?: Types.Common.TagsObj[];
  password?: string;
  id?: string;
  site: string;
}

async function getNewUserVariables(scope: Data[], validate: ReturnType<typeof validation>) {
  const new_user_name = scope.find((x) => x.variable === "new_user_name");
  const new_user_email = scope.find((x) => x.variable === "new_user_email");
  const new_user_phone = scope.find((x) => x.variable === "new_user_phone");
  const new_user_access = scope.find((x) => x.variable === "new_user_access");
  const new_user_site = scope.find((x) => x.variable === "new_user_site");

  try {
    return registerUserModel.parse({
      new_user_name,
      new_user_email,
      new_user_phone,
      new_user_access,
      new_user_site,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    await validate(zodErrorMsg, "danger");
    throw error;
  }
}

async function createUser({ context, scope, account }: ServiceParams) {
  // Collecting data
  const org_id = scope[0].device;
  const user_id = scope[0].device;
  const org_dev = await Utils.getDevice(account, user_id);
  const validate = validation("user_validation", org_dev);
  await validate("Registering...", "warning");
  const { new_user_name, new_user_email, new_user_site, new_user_access, new_user_phone } = await getNewUserVariables(scope, validate);

  const [user_exists] = await account.run.listUsers({
    page: 1,
    amount: 1,
    filter: { email: new_user_email.value },
  });

  if (user_exists) {
    return validate("User already exists!", "danger");
  }

  // creating user
  const { timezone } = await account.info();

  const new_user_data: UserData = {
    name: new_user_name.value,
    email: new_user_email.value,
    phone: new_user_phone.value,
    site: new_user_site === undefined ? "" : new_user_site?.metadata.label,
    timezone: timezone,
    tags: [
      {
        key: "organization_id",
        value: org_id,
      },
      {
        key: "department_id",
        value: new_user_site === undefined ? "" : new_user_site?.value,
      },
      {
        key: "access",
        value: new_user_access.value,
      },
      {
        key: "phone",
        value: new_user_phone.value,
      },
      {
        key: "email",
        value: new_user_email.value,
      },
    ],
  };

  // registering user
  await registerUser(context, account, new_user_data, "https://tago.io/");
  return validate("User successfully invited! An email will be sent with the credentials to the new user.", "success");
}

export { createUser, getNewUserVariables };
