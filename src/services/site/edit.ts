import { queue } from "async";

import { Resources } from "@tago-io/sdk";

import { DataResolver } from "../../lib/edit.data";
import { fetchDeviceList } from "../../lib/fetch-device-list";
import { convertLocationParamToObj } from "../../lib/fix-address";
import { getZodError } from "../../lib/get-zod-error";
import { initializeValidation } from "../../lib/validation";
import { ServiceParams } from "../../types";
import { updateSiteModel } from "./model/site.model";

async function getSiteVariables(scope: any, validate: ReturnType<typeof initializeValidation>) {
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

async function editSite({ environment, scope }: ServiceParams) {
  // Collecting data
  const config_id = environment.config_id;
  const validate = initializeValidation("site_validation", config_id);

  const { name: site_name, address: site_address } = await getSiteVariables(scope, validate);
  // getting Organization device
  const site_id = scope[0].device;

  const site_info = await Resources.devices.info(site_id);
  const org_id = site_info.tags.find((tag) => tag.key === "organization_id")?.value;
  if (!org_id) {
    throw new Error("Organization not found");
  }

  // getting previous id data
  const [site_data] = await Resources.devices.getDeviceData(org_id, { variables: "site_id", qty: 1, groups: site_id });

  async function editData(device: any) {
    await DataResolver(site_id).setVariable({ variable: "dev_site", value: site_name }).apply(device.id);
  }

  if (site_name) {
    await DataResolver(config_id)
      .setVariable({ variable: "site_id", metadata: { ...site_data.metadata, label: site_name } })
      .apply(site_id);

    await DataResolver(org_id)
      .setVariable({ variable: "site_id", metadata: { ...site_data.metadata, label: site_name } })
      .apply(site_id);

    await DataResolver(site_id)
      .setVariable({ variable: "site_id", metadata: { ...site_data.metadata, label: site_name } })
      .apply(site_id);

    // updating device name
    await Resources.devices.edit(site_id, { name: site_name });

    // editing device site info
    const device_list = await fetchDeviceList({
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
    await DataResolver(config_id)
      .setVariable({
        variable: "site_address",
        value: site_address.value,
        location: { lat: site_address.location.lat, lng: site_address.location.lng },
        group: site_id,
      })
      .apply(site_id);

    await DataResolver(org_id)
      .setVariable({
        variable: "site_address",
        value: site_address.value,
        location: { lat: site_address.location.lat, lng: site_address.location.lng },
        group: site_id,
      })
      .apply();

    await DataResolver(site_id)
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
