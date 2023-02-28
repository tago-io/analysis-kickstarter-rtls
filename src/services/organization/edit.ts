import { convertLocationParamToObj } from "../../lib/fix-address";
import { getZodError } from "../../lib/get-zod-error";
import validation from "../../lib/validation";
import { ServiceParams } from "../../types";
import { updateOrgModel } from "./models/org.model";

async function getOrgVariables(scope: any, validate: ReturnType<typeof validation>) {
  const name = scope[0]?.name;
  const address = scope[0]?.["tags.address"];
  const new_address = convertLocationParamToObj(address);
  const addressInfo = { value: new_address?.value, location: new_address?.location?.coordinates };

  try {
    return updateOrgModel.parse({
      name,
      address: address ? addressInfo : undefined,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    await validate(zodErrorMsg, "danger");
    throw error;
  }
}

async function editOrganization({ config_dev, scope, account }: ServiceParams) {
  const org_id = scope[0].device;
  const validate = validation("org_validation", config_dev);
  // Collecting data
  const { name: org_name, address: org_address } = await getOrgVariables(scope, validate);
  if (org_name) {
    // getting previous id data
    const [org_id_data] = await config_dev.getData({ variables: "org_name", qty: 1, groups: org_id });
    // updating data with in settings_device
    await config_dev.editData({ ...org_id_data, metadata: { ...org_id_data.metadata, label: org_name }, value: org_name });
    // updating device name
    await account.devices.edit(org_id, { name: org_name });
  }
  if (org_address) {
    // getting previous data
    const [org_id_data] = await config_dev.getData({ variables: "org_address", qty: 1, groups: org_id });
    // updating data with in settings_device
    await config_dev.editData({
      ...org_id_data,
      metadata: { ...org_id_data.metadata, label: org_address.value },
      location: org_address.location,
      value: org_address.value,
    });
  }
  return;
}

export { editOrganization, getOrgVariables };
