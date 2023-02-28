import { getZodError } from "../../lib/get-zod-error";
import getDevice from "../../lib/getDevice";
import validation from "../../lib/validation";
import { ServiceParams } from "../../types";
import { editDeviceModel } from "./model/edit.model";

async function getDeviceVariables(scope: any, validate: ReturnType<typeof validation>) {
  const dev_name = scope[0]?.name;
  const new_site_id_data = scope[0]?.["tags.site_id"];

  try {
    return editDeviceModel.parse({
      dev_name,
      new_site_id_data,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    await validate(zodErrorMsg, "danger");
    throw error;
  }
}

async function editSensor({ config_dev, scope, account }: ServiceParams) {
  const dev_id = scope[0].device;
  // fetching info
  const validate = validation("org_validation", config_dev);
  const { dev_name, new_site_id_data } = await getDeviceVariables(scope, validate);

  // get device tags
  const dev_tags = (await account.devices.info(dev_id)).tags;
  // get tag named device_id
  const org_id = dev_tags.find((tag) => tag.key === "organization_id");

  if (!org_id) {
    throw new Error("Device has no organization_id tag");
  }

  // getting org device
  const org_dev = await getDevice(account, org_id.value);

  // getting site device
  const site_id = dev_tags.find((tag) => tag.key === "site_id")?.value;

  if (!site_id) {
    throw new Error("Device has no site_id tag");
  }

  const site_dev = await getDevice(account, site_id);

  // getting previous id data
  const [dev_data] = await org_dev.getData({ variables: "dev_id", qty: 1, groups: dev_id });

  if (dev_name) {
    // deleting prev data in settings_device
    await config_dev.deleteData({ groups: dev_id, variables: "dev_name" });
    await org_dev.deleteData({ groups: dev_id, variables: "dev_name" });
    await site_dev.deleteData({ groups: dev_id, variables: "dev_name" });

    // sending to settings new info
    await config_dev.sendData({ ...dev_data, metadata: { ...dev_data.metadata, label: dev_name } });
    await org_dev.sendData({ ...dev_data, metadata: { ...dev_data.metadata, label: dev_name } });
    await site_dev.sendData({ variable: "dev_name", value: dev_name, metadata: { ...dev_data.metadata, label: dev_name } });

    // updating device name
    await account.devices.edit(dev_id, { name: dev_name });

    // updating asset list
    await org_dev.deleteData({ variables: "asset_list", groups: dev_id });
    await org_dev.sendData({ variable: "dev_name", value: dev_name, group: dev_id });
  }

  if (new_site_id_data) {
    // updating tags array
    tags = tags.filter((x) => !["site_id"].includes(x.key));
    tags.push({ key: "site_id", value: new_site_id_data });

    await account.devices.edit(dev_id, { tags });
  }
  return;
}

export { editSensor, getDeviceVariables };
