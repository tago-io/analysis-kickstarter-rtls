import { Device, Account } from "@tago-io/sdk";
import { ServiceParams, TagoContext, DeviceCreated } from "../../types";

export default async ({ config_dev, context, scope, account, environment }: ServiceParams, org_dev: Device) => {
  const site_id = scope[0].serie;

  const site_name = scope.find((x) => x.variable === "site_name");
  const site_address = scope.find((x) => x.variable === "site_address");

  //getting previous id data
  const [site_data] = await org_dev.getData({ variable: "site_id", qty: 1, serie: site_id });
  // const [dev_site_data] = await org_dev.getData({ variable: "dev_site", qty: 1, serie: site_id });
  // console.log("dev_site_data");
  // console.log(dev_site_data);??

  if (site_name) {
    //deleting prev data in settings_device
    await config_dev.deleteData({ id: site_data.id });
    await org_dev.deleteData({ id: site_data.id });
    //sending to settings new info
    await config_dev.sendData({ ...site_data, metadata: { ...site_data.metadata, label: site_name.value }, time: null });
    await org_dev.sendData({ ...site_data, metadata: { ...site_data.metadata, label: site_name.value }, time: null });
    console.log(await config_dev.getData({ variable: "site_id", qty: 1, serie: site_id }));
    //updating device name
    await account.devices.edit(site_id, { name: site_name.value as string });

    //editing bucket name
    const bucket_id = (await account.devices.info(site_id)).bucket.id;
    await account.buckets.edit(bucket_id, { name: site_name.value as string });

    //editing device site info
    const device_list = await account.devices.list({
      fields: ["id", "bucket", "tags", "name"],
      filter: {
        tags: [
          { key: "site_id", value: site_id },
          { key: "device_type", value: "device" },
        ],
      },
    });

    await Promise.all(
      device_list.map(async (device) => {
        //fetching dev_site data
        const [data_to_edit] = await org_dev.getData({ serie: device.id, variable: "dev_site" });
        //deleting prev data and updating the data to new dev_site name
        await org_dev.deleteData({ id: data_to_edit.id });
        await org_dev.sendData({ ...data_to_edit, value: site_name.value as string });

        const x = await org_dev.getData({ serie: device.id, variable: "dev_site" });
      })
    );

    // dev_site_data.value = site_name.value;
    // dev_site_data.time = null;
    // await config_dev.sendData(dev_site_data);
    // await org_dev.sendData(dev_site_data);
    // await site_dev.sendData(dev_site_data);
  }

  if (site_address) {
    await config_dev.deleteData({ id: site_data.id });
    await org_dev.deleteData({ id: site_data.id });

    await config_dev.sendData({ ...site_data, metadata: { ...site_data.metadata, address: site_address.value }, time: null });
    await org_dev.sendData({ ...site_data, metadata: { ...site_data.metadata, address: site_address.value }, time: null });
  }

  return console.log("Site edited!");
};
