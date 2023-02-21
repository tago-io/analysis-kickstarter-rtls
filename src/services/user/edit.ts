import { Utils } from "@tago-io/sdk";
import validation from "../../lib/validation";
import { ServiceParams } from "../../types";
import { getUserVariables } from "./model/edit.model";

async function editUser({ config_dev, scope, account }: ServiceParams) {
  // the line below is incorret, need to find another way to get since we aren´t using dynamic table anymore.
  const user_id = scope[0].user;
  const userInfo = await account.run.userInfo(user_id);
  const tags = userInfo.tags;
  const org_id = tags.find((tag) => tag.key === "organization_id").value;
  console.log("User info:", userInfo);
  // validate variable
  const validate = validation("user_validation", config_dev);
  // Collecting data
  const { user_name, user_phone } = await getUserVariables(scope, validate);
  const org_dev = await Utils.getDevice(account, org_id);

  const new_user_info: any = {};
  if (user_name) {
    // fetching prev data
    const [user_name_config_dev] = await config_dev.getData({ variables: "user_name", qty: 1, groups: user_id });
    const [user_name_org_dev] = await org_dev.getData({ variables: "user_name", qty: 1, groups: user_id });
    // deleting prev data
    await config_dev.deleteData({ groups: user_name_config_dev.id });
    await org_dev.deleteData({ groups: user_name_org_dev.id });

    // modifying json object
    delete user_name_config_dev.time;
    delete user_name_config_dev.id;
    delete user_name_org_dev.time;
    delete user_name_org_dev.id;

    console.debug(user_name_config_dev);

    // sending new data
    await config_dev.sendData({ ...user_name_config_dev, value: user_name }).then((msg) => console.log(msg));
    await org_dev.sendData({ ...user_name_org_dev, value: user_name });

    new_user_info.name = user_name;
    await account.run.userEdit(user_id, new_user_info);
  }
  if (user_phone) {
    // fetching prev data
    const [user_phone_config_dev] = await config_dev.getData({ variables: "user_phone", qty: 1, groups: user_id });
    const [user_phone_org_dev] = await org_dev.getData({ variables: "user_phone", qty: 1, groups: user_id });
    // deleting prev data
    console.log("aqui", user_phone_config_dev);
    console.log("aqui", user_phone_org_dev);

    await config_dev.deleteData({ groups: user_phone_config_dev.id });
    await org_dev.deleteData({ groups: user_phone_org_dev.id });

    // modifying json object
    delete user_phone_config_dev.time;
    delete user_phone_config_dev.id;
    delete user_phone_org_dev.time;
    delete user_phone_org_dev.id;

    console.debug(user_phone_config_dev);

    // sending new data
    await config_dev.sendData({ ...user_phone_config_dev, value: user_phone }).then((msg) => console.log(msg));
    await org_dev.sendData({ ...user_phone_org_dev, value: user_phone });

    new_user_info.phone = user_phone;
    await account.run.userEdit(user_id, new_user_info);
  }
  return;
}

export { editUser };
