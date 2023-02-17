import { Data } from "@tago-io/sdk/out/common/common.types";
import z from "zod";

import { getZodError } from "../../../lib/get-zod-error";
import validation from "../../../lib/validation";

const editOrgModel = z.object({
  org_name: z.object({
    value: z.string(),
  }),
  org_address: z.object({
    value: z.string(),
    location: z.object({
      type: z.string(),
      coordinates: z.array(z.number()),
    }),
  }),
});

type IEditOrgModel = z.infer<typeof editOrgModel>;

async function getOrgVariables(scope: Data[], validate: ReturnType<typeof validation>) {
  const org_name = scope.find((x) => x.variable === "org_name");
  const org_address = scope.find((x) => x.variable === "org_address");

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
