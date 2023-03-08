import { queue } from "async";
import { Utils } from "@tago-io/sdk";
import { ServiceParams } from "../../types";
import validation from "../../lib/validation";
import { getZodError } from "../../lib/get-zod-error";
import { convertLocationParamToObj } from "../../lib/fix-address";
import { DataResolver } from "../../lib/edit.data";
import { fetchDeviceList } from "../../lib/fetch-device-list";
import { updateSiteModel } from "./model/site.model";

async function getSiteVariables(scope: any, validate: ReturnType<typeof validation>) {
  const name = scope[0]?.name;
  const address = scope[0]?.["tags.site_address"];
  const new_address = convertLocationParamToObj(address);
  const addressInfo = { value: new_address?.value, location: new_address?.location?.coordinates };

  try {
    return updateSiteModel.parse({
      name,
      address: address ? addressInfo : undefined,
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
  const org_id = site_info.tags.find((tag) => tag.key === "organization_id")?.value;
  if (!org_id) {
    throw new Error("Organization not found");
  }
  const org_dev = await Utils.getDevice(account, org_id);

  // getting previous id data
  const [site_data] = await org_dev.getData({ variables: "site_id", qty: 1, groups: site_id });

  async function editData(device: any) {
    await DataResolver(site_dev).setVariable({ variable: "dev_site", value: site_name }).apply(device.id);
  }

  if (site_name) {
    await DataResolver(config_dev)
      .setVariable({ variable: "site_id", metadata: { ...site_data.metadata, label: site_name } })
      .apply(site_id);

    await DataResolver(org_dev)
      .setVariable({ variable: "site_id", metadata: { ...site_data.metadata, label: site_name } })
      .apply(site_id);

    await DataResolver(site_dev)
      .setVariable({ variable: "site_id", metadata: { ...site_data.metadata, label: site_name } })
      .apply(site_id);

    // updating device name
    await account.devices.edit(site_id, { name: site_name });

    // editing device site info
    const device_list = await fetchDeviceList(account, {
      tags: [
        { key: "site_id", value: site_id },
        { key: "device_type", value: "device" },
      ],
    });

    console.log(device_list);

    const editQueue = queue(editData, 5);
    editQueue.error((error: any) => console.log(error));

    if (device_list) {
      for (const device of device_list) {
        void editQueue.push(device);
      }
    }

    await editQueue.drain();
  }

  if (site_address) {
    await DataResolver(config_dev)
      .setVariable({
        variable: "site_address",
        value: site_address.value,
        location: { lat: site_address.location.lat, lng: site_address.location.lng },
        group: site_id,
      })
      .apply(site_id);

    await DataResolver(org_dev)
      .setVariable({
        variable: "site_address",
        value: site_address.value,
        location: { lat: site_address.location.lat, lng: site_address.location.lng },
        group: site_id,
      })
      .apply();

    await DataResolver(site_dev)
      .setVariable({
        variable: "site_address",
        value: site_address.value,
        location: { lat: site_address.location.lat, lng: site_address.location.lng },
        group: site_id,
      })
      .apply(site_id);
  }
}

export { editSite, getSiteVariables };
