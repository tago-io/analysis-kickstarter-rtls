import { Data } from "@tago-io/sdk/out/common/common.types";
import z from "zod";

import { getZodError } from "../../../lib/get-zod-error";
import validation from "../../../lib/validation";

const registerOrgModel = z.object({
  new_org_name: z.object({
    value: z.string(),
  }),
  new_org_address: z.object({
    value: z.string(),
    location: z.object({
      type: z.string(),
      coordinates: z.array(z.number()),
    }),
  }),
});

type IRegisterOrgModel = z.infer<typeof registerOrgModel>;

async function getNewOrgVariables(scope: Data[], validate: ReturnType<typeof validation>) {
  const new_org_name = scope.find((x) => x.variable === "new_org_name");
  const new_org_address = scope.find((x) => x.variable === "new_org_address");

  try {
    return registerOrgModel.parse({
      new_org_name,
      new_org_address,
      validate,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    validate(zodErrorMsg, "danger");
    throw error;
  }
}

export { getNewOrgVariables, registerOrgModel, IRegisterOrgModel };
