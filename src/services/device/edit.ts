import { Device, Account } from "@tago-io/sdk";
import { ServiceParams, TagoContext, DeviceCreated } from "../../types";

export default async ({ config_dev, context, scope, account, environment }: ServiceParams, org_dev: Device) => {
  const dev_id = scope[0].serie;

  const dev_name = scope.find((x) => x.variable === "dev_name");
  const dev_type = scope.find((x) => x.variable === "dev_type");

  //getting previous id data
  const [dev_data] = await org_dev.getData({ variable: "dev_id", qty: 1, serie: dev_id });

  if (dev_name) {
    //deleting prev data in settings_device
    await config_dev.deleteData({ id: dev_data.id });
    await org_dev.deleteData({ id: dev_data.id });
    //sending to settings new info
    await config_dev.sendData({ ...dev_data, metadata: { ...dev_data.metadata, label: dev_name.value }, time: null });
    await org_dev.sendData({ ...dev_data, metadata: { ...dev_data.metadata, label: dev_name.value }, time: null });
    console.log(await config_dev.getData({ variable: "dev_id", qty: 1, serie: dev_id }));
    //updating device name
    await account.devices.edit(dev_id, { name: dev_name.value as string });

    //editing bucket name
    const bucket_id = (await account.devices.info(dev_id)).bucket.id;

    await account.buckets.edit(bucket_id, { name: dev_name.value as string });
  }

  if (dev_type) {
    await config_dev.deleteData({ id: dev_data.id });
    await org_dev.deleteData({ id: dev_data.id });

    await config_dev.sendData({ ...dev_data, metadata: { ...dev_data.metadata, type: dev_type.value }, time: null });
    await org_dev.sendData({ ...dev_data, metadata: { ...dev_data.metadata, type: dev_type.value }, time: null });
  }
  return;
};
