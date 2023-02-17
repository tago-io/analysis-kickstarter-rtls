import z from "zod";

import { getZodError } from "../../../lib/get-zod-error";
import validation from "../../../lib/validation";

const editSiteModel = z.object({
  site_name: z.string().optional(),
  site_address: z.string().optional(),
});

type IEditSiteModel = z.infer<typeof editSiteModel>;

async function getSiteVariables(scope: any, validate: ReturnType<typeof validation>) {
  const site_name = scope[0]?.name;
  const site_address = scope[0]?.["tags.site_address"];

  try {
    return editSiteModel.parse({
      site_name,
      site_address,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    validate(zodErrorMsg, "danger");
    throw error;
  }
}

export { getSiteVariables, editSiteModel, IEditSiteModel };
