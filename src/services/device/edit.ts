import { Resources } from "@tago-io/sdk";

import { DataResolver } from "../../lib/edit.data";
import { getZodError } from "../../lib/get-zod-error";
import { initializeValidation } from "../../lib/validation";
import { ServiceParams } from "../../types";
import { editDeviceModel } from "./model/edit.model";

async function getDeviceVariables(scope: any, validate: ReturnType<typeof initializeValidation>) {
  const dev_name = scope[0]?.name;
  const new_site_id_data = scope[0]?.["tags.site_id"];

  try {
    return editDeviceModel.parse({
      dev_name,
      new_site_id_data,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    await validate(zodErrorMsg, "danger");
    throw error;
  }
}

async function editSensor({ scope, environment }: ServiceParams) {
  const dev_id = scope[0].device;
  const config_id = environment.config_id;
  // fetching info
  const validate = initializeValidation("org_validation", config_id);
  const { dev_name, new_site_id_data } = await getDeviceVariables(scope, validate);

  // get device tags
  const { tags: dev_tags } = await Resources.devices.info(dev_id);
  // get tag named device_id
  const org_id = dev_tags.find((tag) => tag.key === "organization_id")?.value;

  if (!org_id) {
    throw new Error("Device has no organization_id tag");
  }

  // getting site device
  let { tags } = await Resources.devices.info(dev_id);

  const site_id = tags.find((tag) => tag.key === "site_id")?.value;

  if (!site_id) {
    throw new Error("Device has no site_id tag");
  }

  // getting previous id data
  const [dev_data] = await Resources.devices.getDeviceData(org_id, { variables: "dev_name", qty: 1, groups: dev_id });

  if (dev_name) {
    await DataResolver(config_id)
      .setVariable({ variable: "dev_name", value: dev_name, metadata: { ...dev_data.metadata, label: dev_name } })
      .apply(dev_id);

    await DataResolver(org_id)
      .setVariable({ variable: "dev_name", value: dev_name, metadata: { ...dev_data.metadata, label: dev_name } })
      .apply(dev_id);

    await DataResolver(site_id)
      .setVariable({ variable: "dev_name", value: dev_name, metadata: { ...dev_data.metadata, label: dev_name } })
      .apply(dev_id);

    // updating device name
    await Resources.devices.edit(dev_id, { name: dev_name });

    // updating asset list
    await DataResolver(org_id).setVariable({ variable: "asset_list", value: dev_name }).apply(dev_id);
  }

  if (new_site_id_data) {
    // updating tags array
    tags = tags.filter((x) => !["site_id"].includes(x.key));
    tags.push({ key: "site_id", value: new_site_id_data });

    await Resources.devices.edit(dev_id, { tags });
  }
  return;
}

export { editSensor, getDeviceVariables };
