import { Data } from "@tago-io/sdk/out/common/common.types";
import z from "zod";

import { getZodError } from "../../lib/get-zod-error";
import validation from "../../lib/validation";

const orgModel = z.object({
  new_org_name: z.string(),
  new_org_address: z.object({}),
});

type OrgModel = z.infer<typeof orgModel>;

async function getOrgVariables(scope: Data[], validate: ReturnType<typeof validation>) {
  const new_org_name = scope.find((x) => x.variable === "new_org_name").value;
  const new_org_address = scope.find((x) => x.variable === "new_org_address");

  try {
    return orgModel.parse({
      new_org_name,
      new_org_address,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    await validate(zodErrorMsg, "danger");
    throw error;
  }
}

export { getOrgVariables, orgModel, OrgModel };
