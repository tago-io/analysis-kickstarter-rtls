import { Device, Account } from "@tago-io/sdk";
import { ServiceParams, TagoContext, DeviceCreated } from "../../types";

export default async ({ config_dev, context, scope, account, environment }: ServiceParams) => {
  const org_id = scope[0].serie;
  console.log(org_id);

  const org_name = scope.find((x) => x.variable === "org_name");
  const org_address = scope.find((x) => x.variable === "org_address");

  if (org_name) {
    //getting previous id data
    const [st_org_data] = await config_dev.getData({ variable: "org_id", qty: 1, serie: org_id });
    console.log("before");
    console.log(st_org_data);
    //deleting prev data in settings_device
    // await config_dev.deleteData({ id: st_org_data.id });

    //updating device name
    // await config_dev.sendData({ ...st_org_data, metadata: { ...st_org_data.metadata, label: org_name.value }, time: null });
    console.log("after");
    await account.devices.edit(org_id, { name: org_name.value as string });

    //editting bucket name
    const bucket_id = (await account.devices.info(org_id)).bucket.id;
    await account.buckets.edit(bucket_id, { name: org_name.value as string });
    console.log("to be edited device");
    console.log(
      await account.devices.list({
        amount: 9999,
        page: 1,
        filter: {
          tags: [
            { key: "organization_id", value: org_id },
            { key: "device_type", value: "organization" },
          ],
        },
        fields: ["name", "bucket"],
      })
    );
    console.log("======");
    console.log(await config_dev.getData({ variable: "org_name", serie: org_id }));
  }
  if (org_address) {
    //updating data
    // await config_dev.sendData(org_address); //?

    //getting previous data
    const [org_id_data] = await config_dev.getData({ variable: "org_id", qty: 1, serie: org_id });
    //deleting prev data in settings_device
    await config_dev.deleteData({ id: org_id_data.id });
    //updating data
    await config_dev.sendData({ ...org_id_data, metadata: { ...org_id_data.metadata, label: org_address.value }, time: null });
  }
  return console.log("edited!");
};
