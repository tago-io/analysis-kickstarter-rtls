import { Device, Account } from "@tago-io/sdk";
import getDevice from "../../lib/getDevice";
import { ServiceParams, TagoContext, DeviceCreated } from "../../types";

export default async ({ config_dev, context, scope, account, environment }: ServiceParams, org_dev: Device) => {
  const dev_id = scope[0].serie;
  console.log(dev_id);

  //getting department device
  const { tags } = await account.devices.info(dev_id);
  const dept_id = tags.find((tag) => tag.key === "department_id")?.value;
  const dept_dev = await getDevice(account, dept_id as string);

  //fetching info
  const dev_name = scope.find((x) => x.variable === "dev_name");
  const dev_type = scope.find((x) => x.variable === "dev_type");

  //getting previous id data
  const [dev_data] = await org_dev.getData({ variable: "dev_id", qty: 1, serie: dev_id });
  const [dev_data_type] = await org_dev.getData({ variable: "dev_type", qty: 1, serie: dev_id });
  console.log(dev_data_type);
  // const [dev_dept_data] = await dept_dev.getData({ variable: "dev_id", qty: 1, serie: dev_id });

  if (dev_name) {
    //deleting prev data in settings_device
    await config_dev.deleteData({ id: dev_data.id, variable: "dev_name" });
    await org_dev.deleteData({ id: dev_data.id, variable: "dev_name" });
    await dept_dev.deleteData({ id: dev_data.id, variable: "dev_name" });

    //sending to settings new info
    await config_dev.sendData({ ...dev_data, metadata: { ...dev_data.metadata, label: dev_name.value }, time: null });
    await org_dev.sendData({ ...dev_data, metadata: { ...dev_data.metadata, label: dev_name.value }, time: null });
    await dept_dev.sendData({ ...dev_name, metadata: { ...dev_data.metadata, label: dev_name.value }, time: null });

    //updating device name
    await account.devices.edit(dev_id, { name: dev_name.value as string });

    //editing bucket name
    const bucket_id = (await account.devices.info(dev_id)).bucket.id;

    await account.buckets.edit(bucket_id, { name: dev_name.value as string });
  }

  if (dev_type) {
    await config_dev.deleteData({ id: dev_data.id, variable: "dev_type" });
    await org_dev.deleteData({ id: dev_data.id, variable: "dev_type" });
    await dept_dev.deleteData({ id: dev_data.id, variable: "dev_type" });

    await config_dev.sendData({ ...dev_data_type, value: dev_type.value, time: null });
    await org_dev.sendData({ ...dev_data_type, value: dev_type.value, time: null });
    await dept_dev.sendData({ ...dev_data_type, value: dev_type.value, time: null });
  }
  return console.log(await org_dev.getData({ variables: ["dev_id", "dev_type"], qty: 1, serie: dev_id }));
};
