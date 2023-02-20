import { Utils } from "@tago-io/sdk";
import { ServiceParams } from "../../types";
import validation from "../../lib/validation";
import { getSiteVariables } from "./model/edit.model";

async function editSite({ config_dev, scope, account }: ServiceParams) {
  // Collecting data
  const validate = validation("site_validation", config_dev);
  const { site_name, site_address } = await getSiteVariables(scope, validate);

  // getting Organization device
  const site_id = scope[0].device;
  const site_dev = await Utils.getDevice(account, site_id);
  console.log("Site ID: ", site_id);

  const site_info = await site_dev.info();
  const org_id = site_info.tags.find((tag) => tag.key === "organization_id").value;
  const org_dev = await Utils.getDevice(account, org_id);

  // getting previous id data
  const [site_data] = await org_dev.getData({ variables: "site_id", qty: 1, groups: site_id });
  console.log("site data:", site_data);
  if (site_name) {
    // deleting prev data in settings_device
    await config_dev.deleteData({ groups: site_id });
    await site_dev.deleteData({ groups: site_id });
    // sending to settings new info
    await config_dev.sendData({ ...site_data, metadata: { ...site_data.metadata, label: site_name }, time: null });
    await site_dev.sendData({ ...site_data, metadata: { ...site_data.metadata, label: site_name }, time: null });
    console.log(await config_dev.getData({ variables: "site_id", qty: 1, groups: site_id }));

    // updating device name
    await account.devices.edit(site_id, { name: site_name });

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
        const [data_to_edit] = await site_dev.getData({ groups: device.id, variables: "dev_site" });
        // deleting prev data and updating the data to new dev_site name
        await site_dev.deleteData({ groups: data_to_edit.id });
        await site_dev.sendData({ ...data_to_edit, value: site_name });
      })
    );
  }

  if (site_address) {
    await config_dev.deleteData({ groups: site_id });
    await site_dev.deleteData({ groups: site_id });
    await config_dev.sendData({ ...site_data, metadata: { ...site_data.metadata, address: site_address }, time: null });
    await site_dev.sendData({ ...site_data, metadata: { ...site_data.metadata, address: site_address }, time: null });
  }

  return console.log("Site edited!");
}

export { editSite };
