import { Device, Account } from "@tago-io/sdk";
import { ServiceParams, TagoContext, DeviceCreated } from "../../types";

export default async ({ config_dev, context, scope, account, environment }: ServiceParams) => {
  const org_id = scope[0].serie;

  const org_name = scope.find((x) => x.variable === "org_name");
  const org_address = scope.find((x) => x.variable === "org_address");

  if (org_name) {
    //getting previous data
    const [org_data] = await config_dev.getData({ variable: "org_id", qty: 1, serie: org_id });
    console.log(org_data);
    //deleting prev data in settings_device
    await config_dev.deleteData({ id: org_data.id });

    //updating data
    await config_dev.sendData({ ...org_data, metadata: { ...org_data.metadata, label: org_name.value }, time: null });
    await account.devices.edit(org_id, { name: org_name.value as string });
    const bucket_id = (await account.devices.info(org_id)).bucket.id;
    await account.buckets.edit(bucket_id, { name: org_name.value as string });
  }
  if (org_address) {
    const [org_data] = await config_dev.getData({ variable: "org_id", qty: 1, serie: org_id });

    //deleting prev data in settings_device
    await config_dev.deleteData({ id: org_address.id });
    //updating data
    await config_dev.sendData(org_address); //?
    const [org_data2] = await config_dev.getData({ variable: "org_address", qty: 1, serie: org_id });
    console.log(org_data2);
  }
  return console.log("edditted!");
};
