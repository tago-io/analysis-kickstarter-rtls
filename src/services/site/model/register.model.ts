import { Data } from "@tago-io/sdk/out/common/common.types";
import z from "zod";

import { getZodError } from "../../../lib/get-zod-error";
import validation from "../../../lib/validation";

const registerSiteModel = z.object({
  new_site_name: z.object({
    value: z.string(),
  }),
  new_site_address: z.object({
    value: z.string(),
    location: z.object({
      type: z.string(),
      coordinates: z.array(z.number()),
    }),
  }),
});

type IRegisterSiteModel = z.infer<typeof registerSiteModel>;

async function getNewSiteVariables(scope: Data[], validate: ReturnType<typeof validation>) {
  const new_site_name = scope.find((x) => x.variable === "new_site_name");
  const new_site_address = scope.find((x) => x.variable === "new_site_address");

  try {
    return registerSiteModel.parse({
      new_site_name,
      new_site_address,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    validate(zodErrorMsg, "danger");
    throw error;
  }
}

export { getNewSiteVariables, registerSiteModel, IRegisterSiteModel };
