import z from "zod";

import { getZodError } from "../../../lib/get-zod-error";
import validation from "../../../lib/validation";

const editDeviceModel = z.object({
  dev_name: z.string().optional(),
  new_site_id_data: z.string().optional(),
});

type IEditDeviceModel = z.infer<typeof editDeviceModel>;

async function getDeviceVariables(scope: any, validate: ReturnType<typeof validation>) {
  const dev_name = scope[0]?.name;
  const new_site_id_data = scope[0]?.["tags.site_id"];

  try {
    return editDeviceModel.parse({
      dev_name,
      new_site_id_data,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    validate(zodErrorMsg, "danger");
    throw error;
  }
}

export { getDeviceVariables, editDeviceModel, IEditDeviceModel };
