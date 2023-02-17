import z from "zod";

import { getZodError } from "../../../lib/get-zod-error";
import validation from "../../../lib/validation";

const editUserModel = z.object({
  user_name: z.string().optional(),
  user_phone: z.string().optional(),
});

type IEditUserModel = z.infer<typeof editUserModel>;

async function getUserVariables(scope: any, validate: ReturnType<typeof validation>) {
  const user_name = scope[0]?.name;
  const user_phone = scope[0]?.["tags.phone"];

  try {
    return editUserModel.parse({
      user_name,
      user_phone,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    validate(zodErrorMsg, "danger");
    throw error;
  }
}

export { getUserVariables, editUserModel, IEditUserModel };
