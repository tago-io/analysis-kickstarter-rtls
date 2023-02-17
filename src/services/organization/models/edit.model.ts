import z from "zod";

import { getZodError } from "../../../lib/get-zod-error";
import validation from "../../../lib/validation";

const editOrgModel = z.object({
  org_name: z.string().optional(),
  org_address: z.string().optional(),
});

type IEditOrgModel = z.infer<typeof editOrgModel>;

async function getOrgVariables(scope: any, validate: ReturnType<typeof validation>) {
  const org_name = scope[0]?.name;
  const org_address = scope[0]?.["tags.address"];

  try {
    return editOrgModel.parse({
      org_name,
      org_address,
      validate,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    validate(zodErrorMsg, "danger");
    throw error;
  }
}

export { getOrgVariables, editOrgModel, IEditOrgModel };
