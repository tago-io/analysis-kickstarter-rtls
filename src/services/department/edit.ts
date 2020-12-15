import { Device, Account } from "@tago-io/sdk";
import { ServiceParams, TagoContext, DeviceCreated } from "../../types";

export default async ({ config_dev, context, scope, account, environment }: ServiceParams, org_dev: Device) => {
  const dept_id = scope[0].serie;

  const dept_name = scope.find((x) => x.variable === "dept_name");
  const dept_address = scope.find((x) => x.variable === "dept_address");

  //getting previous id data
  const [dept_data] = await org_dev.getData({ variable: "dept_id", qty: 1, serie: dept_id });

  if (dept_name) {
    //deleting prev data in settings_device
    await config_dev.deleteData({ id: dept_data.id });
    await org_dev.deleteData({ id: dept_data.id });
    //sending to settings new info
    await config_dev.sendData({ ...dept_data, metadata: { ...dept_data.metadata, label: dept_name.value }, time: null });
    await org_dev.sendData({ ...dept_data, metadata: { ...dept_data.metadata, label: dept_name.value }, time: null });
    console.log(await config_dev.getData({ variable: "dept_id", qty: 1, serie: dept_id }));
    //updating device name
    await account.devices.edit(dept_id, { name: dept_name.value as string });

    //editing bucket name
    const bucket_id = (await account.devices.info(dept_id)).bucket.id;

    await account.buckets.edit(bucket_id, { name: dept_name.value as string });
  }

  if (dept_address) {
    await config_dev.deleteData({ id: dept_data.id });
    await org_dev.deleteData({ id: dept_data.id });

    await config_dev.sendData({ ...dept_data, metadata: { ...dept_data.metadata, address: dept_address.value }, time: null });
    await org_dev.sendData({ ...dept_data, metadata: { ...dept_data.metadata, address: dept_address.value }, time: null });
  }

  return console.log("Department edited!");
};
