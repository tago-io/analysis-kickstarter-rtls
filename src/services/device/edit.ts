import { Utils } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import getDevice from "../../lib/getDevice";
import { ServiceParams } from "../../types";

function getFormVariables(scope: Data[]) {
  const dev_id = scope[0].device;
  const dev_name = scope.find((x) => x.variable === "dev_name");
  const new_site_id_data = scope.find((x) => x.variable === "dev_site");

  return { dev_name, new_site_id_data, dev_id };
}

async function editSensor({ config_dev, scope, account }: ServiceParams) {
  // fetching info
  const { dev_name, new_site_id_data, dev_id } = getFormVariables(scope);
  const org_dev = await Utils.getDevice(account, dev_id);

  // getting site device
  let { tags } = await account.devices.info(dev_id);
  const site_id = tags.find((tag) => tag.key === "site_id")?.value;
  const site_dev = await getDevice(account, site_id);

  // getting previous id data
  const [dev_data] = await org_dev.getData({ variables: "dev_id", qty: 1, groups: dev_id });
  const dev_data_site = await org_dev.getData({ variables: ["dev_site", "dev_type", "dev_eui", "dev_name", "dev_id"], qty: 1, groups: dev_id });

  if (dev_name) {
    // deleting prev data in settings_device
    await config_dev.deleteData({ groups: dev_data.id, variables: "dev_name" });
    await org_dev.deleteData({ groups: dev_data.id, variables: "dev_name" });
    await site_dev.deleteData({ groups: dev_data.id, variables: "dev_name" });

    // sending to settings new info
    await config_dev.sendData({ ...dev_data, metadata: { ...dev_data.metadata, label: dev_name.value as string }, time: null });
    await org_dev.sendData({ ...dev_data, metadata: { ...dev_data.metadata, label: dev_name.value as string }, time: null });
    await site_dev.sendData({ ...dev_name, metadata: { ...dev_data.metadata, label: dev_name.value as string }, time: null });

    // updating device name
    await account.devices.edit(dev_id, { name: dev_name.value as string });

    // editing bucket name
    const bucket_id = (await account.devices.info(dev_id)).bucket.id;
    await account.buckets.edit(bucket_id, { name: dev_name.value as string });

    // updating asset list
    await org_dev.deleteData({ variables: "asset_list", groups: dev_id });
    await org_dev.sendData({ ...dev_name, group: dev_id });
  }

  if (new_site_id_data) {
    const new_site_dev = await getDevice(account, new_site_id_data.value as string);
    // deleting prev info
    // await config_dev.deleteData({ serie: dev_data.id });
    // await org_dev.deleteData({ serie: dev_data.id });
    await site_dev.deleteData({ groups: dev_data.id }); //prev site

    // updating data
    // await config_dev.sendData({ ...dev_data_site, value: new_site_id_data.metadata.label as string });
    // await org_dev.sendData({ ...dev_data_site, value: new_site_id_data.metadata.label as string });
    // await site_dev.sendData({ ...dev_data_site, value: new_site_id_data.metadata.label as string });
    await new_site_dev.sendData(dev_data_site);

    // updating tags array
    tags = tags.filter((x) => !["site_id"].includes(x.key));
    tags.push({ key: "site_id", value: new_site_id_data.value as string });

    await account.devices.edit(dev_id, { tags });
  }
  return;
}

export { getFormVariables, editSensor };
