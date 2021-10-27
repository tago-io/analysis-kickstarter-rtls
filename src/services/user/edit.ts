import { Device, Account } from "@tago-io/sdk";
import { ServiceParams, TagoContext, DeviceCreated } from "../../types";

export default async ({ config_dev, context, scope, account, environment }: ServiceParams, org_dev: Device) => {
  const user_id = scope[0].serie;

  const user_name = scope.find((x) => x.variable === "user_name");
  const user_phone = scope.find((x) => x.variable === "user_phone");

  const new_user_info: any = {};

  // const user_to_edit = await account.run.userInfo(user_id);
  // const [user_data] = await org_dev.getData({ variable: "user_id", qty: 1, serie: user_id });

  if (user_name) {
    //fetching prev data
    const [user_name_config_dev] = await config_dev.getData({ variable: "user_name", qty: 1, serie: user_id });
    const [user_name_org_dev] = await config_dev.getData({ variable: "user_name", qty: 1, serie: user_id });
    //deleting prev data
    await config_dev.deleteData({ id: user_name_config_dev.id });
    await org_dev.deleteData({ id: user_name_org_dev.id });

    //modifying json object
    delete user_name_config_dev.time;
    delete user_name_config_dev.id;
    delete user_name_org_dev.time;
    delete user_name_org_dev.id;

    console.log(user_name_config_dev);

    //sending new data
    await config_dev.sendData({ ...user_name_config_dev, value: user_name.value as string }).then((msg) => console.log(msg));
    await org_dev.sendData({ ...user_name_org_dev, value: user_name.value as string });

    new_user_info.name = user_name.value;
    await account.run.userEdit(user_id, new_user_info);
  }
  if (user_phone) {
    //fetching prev data
    const [user_phone_config_dev] = await config_dev.getData({ variable: "user_phone", qty: 1, serie: user_id });
    const [user_phone_org_dev] = await config_dev.getData({ variable: "user_phone", qty: 1, serie: user_id });
    //deleting prev data
    await config_dev.deleteData({ id: user_phone_config_dev.id });
    await org_dev.deleteData({ id: user_phone_org_dev.id });

    //modifying json object
    delete user_phone_config_dev.time;
    delete user_phone_config_dev.id;
    delete user_phone_org_dev.time;
    delete user_phone_org_dev.id;

    console.log(user_phone_config_dev);

    //sending new data
    await config_dev.sendData({ ...user_phone_config_dev, value: user_phone.value as string }).then((msg) => console.log(msg));
    await org_dev.sendData({ ...user_phone_org_dev, value: user_phone.value as string });

    new_user_info.phone = user_phone.value;
    await account.run.userEdit(user_id, new_user_info);
  }
  return;
};
