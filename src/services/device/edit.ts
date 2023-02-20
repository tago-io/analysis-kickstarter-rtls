import { Utils } from "@tago-io/sdk";
import getDevice from "../../lib/getDevice";
import validation from "../../lib/validation";
import { ServiceParams } from "../../types";
import { getDeviceVariables } from "./model/edit.model";

async function editSensor({ config_dev, scope, account }: ServiceParams) {
  const dev_id = scope[0].device;
  // fetching info
  const validate = validation("org_validation", config_dev);
  const { dev_name, new_site_id_data } = await getDeviceVariables(scope, validate);
  const org_dev = await Utils.getDevice(account, dev_id);

  // get device tags
  const dev_tags = (await account.devices.info(dev_id)).tags;
  console.log("site_dev_tags", dev_tags);
  // get tag named device_id
  const dev_id_tag = dev_tags.find((tag) => tag.key === "device_id");

  // getting site device
  let { tags } = await account.devices.info(dev_id);
  const site_id = tags.find((tag) => tag.key === "site_id")?.value;
  const site_dev = await getDevice(account, site_id);

  // getting previous id data
  const [dev_data] = await org_dev.getData({ variables: "dev_id", qty: 1, groups: dev_id });
  const dev_data_site = await org_dev.getData({ variables: ["dev_site", "dev_type", "dev_eui", "dev_name", "dev_id"], qty: 1, groups: dev_id });

  if (dev_name) {
    // deleting prev data in settings_device
    await config_dev.deleteData({ groups: dev_id_tag.value, variables: "dev_name" });
    await org_dev.deleteData({ groups: dev_id_tag.value, variables: "dev_name" });
    await site_dev.deleteData({ groups: dev_id_tag.value, variables: "dev_name" });

    // sending to settings new info
    await config_dev.sendData({ ...dev_data, metadata: { ...dev_data.metadata, label: dev_name }, time: null });
    await org_dev.sendData({ ...dev_data, metadata: { ...dev_data.metadata, label: dev_name }, time: null });
    await site_dev.sendData({ ...(dev_name as any), metadata: { ...dev_data.metadata, label: dev_name }, time: null });

    // updating device name
    await account.devices.edit(dev_id, { name: dev_name });

    // editing bucket name
    const bucket_id = (await account.devices.info(dev_id)).bucket.id;
    await account.buckets.edit(bucket_id, { name: dev_name });

    // updating asset list
    await org_dev.deleteData({ variables: "asset_list", groups: dev_id });
    await org_dev.sendData({ ...(dev_name as any), group: dev_id });
  }

  if (new_site_id_data) {
    console.log("new_site_id_data", new_site_id_data);
    const site_dev = await getDevice(account, new_site_id_data);
    await site_dev.deleteData({ groups: dev_id_tag.value });
    await site_dev.sendData(dev_data_site);

    // updating tags array
    tags = tags.filter((x) => !["site_id"].includes(x.key));
    tags.push({ key: "site_id", value: new_site_id_data });

    await account.devices.edit(dev_id, { tags });
  }
  return;
}

export { editSensor };
