import { Data } from "@tago-io/sdk/out/common/common.types";
import z from "zod";

import { getZodError } from "../../../lib/get-zod-error";
import validation from "../../../lib/validation";

const registerUserModel = z.object({
  new_user_name: z.object({
    value: z.string(),
  }),
  new_user_email: z.object({
    value: z.string(),
  }),
  new_user_phone: z.object({
    value: z.string(),
  }),
  new_user_access: z.object({
    value: z.string(),
    metadata: z.object({
      label: z.string(),
    }),
  }),
  new_user_site: z
    .object({
      value: z.string(),
      metadata: z.object({
        label: z.string(),
      }),
    })
    .optional(),
});

type IRegisterUserModel = z.infer<typeof registerUserModel>;

async function getNewUserVariables(scope: Data[], validate: ReturnType<typeof validation>) {
  const new_user_name = scope.find((x) => x.variable === "new_user_name");
  const new_user_email = scope.find((x) => x.variable === "new_user_email");
  const new_user_phone = scope.find((x) => x.variable === "new_user_phone");
  const new_user_access = scope.find((x) => x.variable === "new_user_access");
  const new_user_site = scope.find((x) => x.variable === "new_user_site");

  try {
    return registerUserModel.parse({
      new_user_name,
      new_user_email,
      new_user_phone,
      new_user_access,
      new_user_site,
      validate,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    validate(zodErrorMsg, "danger");
    throw error;
  }
}

export { getNewUserVariables, registerUserModel, IRegisterUserModel };
