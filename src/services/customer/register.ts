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
}

export default async ({ config_dev, context, scope, account, environment }: ServiceParams) => {
  //Collecting data
  const new_user_name = scope.find((x) => x.variable === "new_user_name");
  const new_user_email = scope.find((x) => x.variable === "new_user_email");
  const new_user_access = scope.find((x) => x.variable === "new_user_access");

  //validation
  const validate = validation("user_validation", config_dev);

  if (!new_user_name.value) throw validate("Name field is empty", "danger");
  if ((new_user_name.value as string).length < 3) throw validate("Name field is empty", "danger");
  if (!new_user_email.value) throw validate("Email field is empty", "danger");

  const [user_exists] = await account.run.listUsers({ page: 1, amount: 1, filter: { name: new_user_name.value as string } });

  if (user_exists) throw validate("User already exists!", "danger");

  /*******CREATING USER*********/
  const org_id = scope[0].origin; //
  const { timezone } = await account.info();

  const new_user_data: UserData = {
    name: new_user_name.value as string,
    email: new_user_email.value as string,
    timezone: timezone,
    tags: [
      {
        key: "organization_id",
        value: org_id,
      },
      {
        key: "access",
        value: new_user_access.value as string,
      },
    ],
  };

  const new_user_id = await registerUser(context, account, new_user_data, "https://guilhermeco.co/");

  const user_data = parseTagoObject(
    {
      user_name: new_user_name.value as string,
      user_email: new_user_email.value as string,
      user_access: new_user_access.value as string,
      timezone: timezone,
      tags: [
        {
          key: "organization_id",
          value: org_id,
        },
        {
          key: "access",
          value: new_user_access.value,
        },
      ],
    },
    new_user_id
  );

  //getting org device and sending to org device
  const org_device = await getDevice(account, org_id);
  org_device.sendData(user_data);

  //sending to admin device (settings_device)
  config_dev.sendData(user_data);

  return validate("User successfully created!", "success");
};
