import { Utils } from "@tago-io/sdk";
import { ServiceParams } from "../../types";
import validation from "../../lib/validation";
import { getSiteVariables } from "./model/edit.model";

async function editSite({ config_dev, scope, account }: ServiceParams) {
  const site_id = scope[0].device;

  console.log("Site ID: ", site_id);

  // Collecting data
  const validate = validation("site_validation", config_dev);
  const { site_name, site_address } = await getSiteVariables(scope, validate);

  // getting Organization device
  const org_id = scope[0].device;
  const org_dev = await Utils.getDevice(account, org_id);

  // getting previous id data
  const [site_data] = await org_dev.getData({ variables: "site_id", qty: 1, groups: site_id });

  if (site_name) {
    // deleting prev data in settings_device
    await config_dev.deleteData({ groups: site_data.id });
    await org_dev.deleteData({ groups: site_data.id });
    // sending to settings new info
    await config_dev.sendData({ ...site_data, metadata: { ...site_data.metadata, label: site_name }, time: null });
    await org_dev.sendData({ ...site_data, metadata: { ...site_data.metadata, label: site_name }, time: null });
    console.log(await config_dev.getData({ variables: "site_id", qty: 1, groups: site_id }));

    // updating device name
    await account.devices.edit(site_id, { name: site_name });
    // editing bucket name
    // get bucket id
    const bucket_id = (await account.devices.info(site_id)).bucket.id; // erro aqui. bucket_id is undefined
    await account.buckets.edit(bucket_id, { name: site_name });

    // editing device site info
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
        // fetching dev_site data
        const [data_to_edit] = await org_dev.getData({ groups: device.id, variables: "dev_site" });
        // deleting prev data and updating the data to new dev_site name
        await org_dev.deleteData({ groups: data_to_edit.id });
        await org_dev.sendData({ ...data_to_edit, value: site_name });

        const x = await org_dev.getData({ groups: device.id, variables: "dev_site" });
      })
    );

    // dev_site_data.value = site_name.value;
    // dev_site_data.time = null;
    // await config_dev.sendData(dev_site_data);
    // await org_dev.sendData(dev_site_data);
    // await site_dev.sendData(dev_site_data);
  }

  if (site_address) {
    await config_dev.deleteData({ groups: site_data.id });
    await org_dev.deleteData({ groups: site_data.id });
    await config_dev.sendData({ ...site_data, metadata: { ...site_data.metadata, address: site_address }, time: null });
    await org_dev.sendData({ ...site_data, metadata: { ...site_data.metadata, address: site_address }, time: null });
  }

  return console.log("Site edited!");
}

export { editSite };
