import { queue } from "async";
import { Utils } from "@tago-io/sdk";
import { ServiceParams } from "../../types";
import validation from "../../lib/validation";
import { getZodError } from "../../lib/get-zod-error";
import { convertLocationParamToObj } from "../../lib/fix-address";
import { updateSiteModel } from "./model/site.model";

async function getSiteVariables(scope: any, validate: ReturnType<typeof validation>) {
  const name = scope[0]?.name;
  const address = scope[0]?.["tags.site_address"];
  const new_address = convertLocationParamToObj(address);

  try {
    return updateSiteModel.parse({
      name,
      address: { value: new_address.value, location: new_address.location.coordinates },
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    await validate(zodErrorMsg, "danger");
    throw error;
  }
}

async function editSite({ config_dev, scope, account }: ServiceParams) {
  // Collecting data
  const validate = validation("site_validation", config_dev);
  const { name: site_name, address: site_address } = await getSiteVariables(scope, validate);

  // getting Organization device
  const site_id = scope[0].device;
  const site_dev = await Utils.getDevice(account, site_id);

  const site_info = await site_dev.info();
  const org_id = site_info.tags.find((tag) => tag.key === "organization_id").value;
  const org_dev = await Utils.getDevice(account, org_id);

  // getting previous id data
  const [site_data] = await org_dev.getData({ variables: "site_id", qty: 1, groups: site_id });
  //const [config_address_data] = await config_dev.getData({ variables: "site_address", qty: 1, groups: site_id });

  async function editData(device: any) {
    const dev_device = await Utils.getDevice(account, device.id);
    const [data_to_edit] = await dev_device.getData({ groups: device.id, variables: "dev_site" });
    await site_dev.deleteData({ groups: data_to_edit.id });
    await site_dev.sendData({ ...data_to_edit, value: site_name });
  }

  if (site_name) {
    // deleting prev data in settings_device
    await config_dev.deleteData({ groups: site_id });
    await site_dev.deleteData({ groups: site_id });
    await org_dev.deleteData({ groups: site_id });
    // sending to settings new info
    await config_dev.sendData({ ...site_data, metadata: { ...site_data.metadata, label: site_name }, time: null });
    await site_dev.sendData({ ...site_data, metadata: { ...site_data.metadata, label: site_name }, time: null });
    await org_dev.sendData({ ...site_data, metadata: { ...site_data.metadata, label: site_name }, time: null });

    await config_dev.getData({ variables: "site_id", qty: 1, groups: site_id });

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

    const editQueue = await queue(editData, 5);
    editQueue.error((error: any) => console.log(error));

    if (device_list) {
      device_list.forEach((device) => {
        editQueue.push(device);
      });
    }

    await editQueue.drain();
  }

  if (site_address) {
    // const new_site_data = { ...site_data, metadata: { ...site_data.metadata, address: site_address } };
    // console.log(new_site_data);

    await config_dev.deleteData({ groups: site_id });
    await site_dev.deleteData({ groups: site_id });
    await config_dev.sendData({ ...site_data, metadata: { ...site_data.metadata, address: site_address }, time: null });
    await site_dev.sendData({ ...site_data, metadata: { ...site_data.metadata, address: site_address }, time: null });

    // console.log(await config_dev.editData(new_site_data));
    // console.log(await site_dev.editData(new_site_data));
  }

  return;
}

export { editSite, getSiteVariables };
