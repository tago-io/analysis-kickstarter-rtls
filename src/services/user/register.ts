import { Device, Account, Types } from "@tago-io/sdk";
import validation from "../../lib/validation";
import registerUser from "../../lib/registerUser";
import { ServiceParams, TagoContext, DeviceCreated } from "../../types";
import getDevice from "../../lib/getDevice";
import { parseTagoObject } from "../../lib/data.logic";

interface UserData {
  name: string;
  email: string;
  phone?: string | number | boolean | void;
  timezone: string;
  tags?: Types.Common.TagsObj[];
  password?: string;
  id?: string;
  dept: string;
}

export default async ({ config_dev, context, scope, account, environment }: ServiceParams, org_dev: Device) => {
  //Collecting data
  const new_user_name = scope.find((x) => x.variable === "new_user_name");
  const new_user_email = scope.find((x) => x.variable === "new_user_email");
  const new_user_dept = scope.find((x) => x.variable === "new_user_dept");
  const new_user_access = scope.find((x) => x.variable === "new_user_access");
  const new_user_phone = scope.find((x) => x.variable === "new_user_phone");

  //validation
  const org_id = scope[0].origin;
  const validate = validation("user_validation", org_dev);

  if (!new_user_name.value) throw validate("Name field is empty", "danger");
  if ((new_user_name.value as string).length < 3) throw validate("Name field is smaller than 3 character", "danger");
  if (!new_user_email.value) throw validate("Email field is empty", "danger");
  if (!new_user_dept.value) throw validate("Department field is empty", "danger");
  if (!new_user_access.value) throw validate("Access field is empty", "danger");
  if (!new_user_phone.value) throw validate("Phone field is empty", "danger");

  const [user_exists] = await account.run.listUsers({
    page: 1,
    amount: 1,
    filter: { email: new_user_email.value as string },
  });

  if (user_exists) throw validate("User already exists!", "danger");

  //creating user
  const { timezone } = await account.info();

  const new_user_data: UserData = {
    name: new_user_name.value as string,
    email: new_user_email.value as string,
    phone: new_user_phone.value as string,
    dept: new_user_dept.metadata.label as string,
    timezone: timezone,
    tags: [
      {
        key: "organization_id",
        value: org_id,
      },
      {
        key: "department_id",
        value: new_user_dept.value,
      },
      {
        key: "access",
        value: new_user_access.value as string,
      },
    ],
  };

  //registering user
  const new_user_id = await registerUser(context, account, new_user_data, "https://tago.io/");

  const user_data = parseTagoObject(
    {
      user_id: new_user_id as string,
      user_name: new_user_name.value as string,
      user_email: new_user_email.value as string,
      user_phone: new_user_phone.value as string,
      user_dept: new_user_dept.metadata.label as string,
      user_access: new_user_access.value as string,
      timezone: timezone,
      tags: [
        {
          key: "organization_id",
          value: org_id,
        },
        {
          key: "department_id",
          value: new_user_dept.value,
        },
        {
          key: "access",
          value: new_user_access.value,
        },
      ],
    },
    new_user_id
  );

  //sending to org device
  org_dev.sendData(user_data);

  //sending to admin device (settings_device)
  config_dev.sendData(user_data);

  return validate("User successfully created!", "success");
};
