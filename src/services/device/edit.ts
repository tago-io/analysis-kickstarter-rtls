import { Device, Account } from "@tago-io/sdk";
import getDevice from "../../lib/getDevice";
import { ServiceParams, TagoContext, DeviceCreated } from "../../types";

export default async ({ config_dev, context, scope, account, environment }: ServiceParams, org_dev: Device) => {
  const dev_id = scope[0].serie;
  console.log(dev_id);

  //getting site device
  let { tags } = await account.devices.info(dev_id);
  const site_id = tags.find((tag) => tag.key === "site_id")?.value;
  const site_dev = await getDevice(account, site_id as string);

  //fetching info
  const dev_name = scope.find((x) => x.variable === "dev_name");
  const new_site_id_data = scope.find((x) => x.variable === "dev_site");

  console.log(new_site_id_data);

  //getting previous id data
  const [dev_data] = await org_dev.getData({ variable: "dev_id", qty: 1, serie: dev_id });
  const dev_data_site = await org_dev.getData({ variables: ["dev_site", "dev_type", "dev_eui", "dev_name", "dev_id"], qty: 1, serie: dev_id });

  if (dev_name) {
    //deleting prev data in settings_device
    await config_dev.deleteData({ id: dev_data.id, variable: "dev_name" });
    await org_dev.deleteData({ id: dev_data.id, variable: "dev_name" });
    await site_dev.deleteData({ id: dev_data.id, variable: "dev_name" });

    //sending to settings new info
    await config_dev.sendData({ ...dev_data, metadata: { ...dev_data.metadata, label: dev_name.value }, time: null });
    await org_dev.sendData({ ...dev_data, metadata: { ...dev_data.metadata, label: dev_name.value }, time: null });
    await site_dev.sendData({ ...dev_name, metadata: { ...dev_data.metadata, label: dev_name.value }, time: null });

    //updating device name
    await account.devices.edit(dev_id, { name: dev_name.value as string });

    //editing bucket name
    const bucket_id = (await account.devices.info(dev_id)).bucket.id;

    await account.buckets.edit(bucket_id, { name: dev_name.value as string });
  }

  if (new_site_id_data) {
    const new_site_dev = await getDevice(account, new_site_id_data.value as string);
    //deleting prev info
    // await config_dev.deleteData({ serie: dev_data.id });
    // await org_dev.deleteData({ serie: dev_data.id });
    await site_dev.deleteData({ serie: dev_data.id }); //prev site

    //updating data
    // await config_dev.sendData({ ...dev_data_site, value: new_site_id_data.metadata.label as string });
    // await org_dev.sendData({ ...dev_data_site, value: new_site_id_data.metadata.label as string });
    // await site_dev.sendData({ ...dev_data_site, value: new_site_id_data.metadata.label as string });
    await new_site_dev.sendData(dev_data_site);

    //updating tags array
    tags = tags.filter((x) => !["site_id"].includes(x.key));
    tags.push({ key: "site_id", value: new_site_id_data.value as string });

    await account.devices.edit(dev_id, { tags });
  }
  return console.log(await org_dev.getData({ variables: ["dev_id", "dev_type", "dev_site"], qty: 1, serie: dev_id }));
};
