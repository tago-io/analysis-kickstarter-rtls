import { Types, Utils } from "@tago-io/sdk";
import validation from "../../lib/validation";
import registerUser from "../../lib/registerUser";
import { ServiceParams } from "../../types";
import { parseTagoObject } from "../../lib/data.logic";
import { getNewUserVariables } from "./model/register.model";

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

async function createUser({ config_dev, context, scope, account }: ServiceParams) {
  // Collecting data
  const org_id = scope[0].device;
  const user_id = scope[0].device;
  const org_dev = await Utils.getDevice(account, user_id);
  const validate = validation("user_validation", org_dev);
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
  const new_user_id = await registerUser(context, account, new_user_data, "https://tago.io/");

  const user_data = parseTagoObject(
    {
      user_id: new_user_id,
      user_name: new_user_name.value,
      user_email: new_user_email.value,
      user_phone: new_user_phone.value,
      user_site: new_user_site === undefined ? "" : new_user_site?.metadata.label,
      user_access: new_user_access.value,
    },
    new_user_id
  );

  // sending to org device
  await org_dev.sendData(user_data);

  // sending to admin device (settings_device)
  await config_dev.sendData(user_data);

  return validate("User successfully invited! An email will be sent with the credentials to the new user.", "success");
}

export { createUser };
