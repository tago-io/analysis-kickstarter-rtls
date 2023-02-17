import { Data } from "@tago-io/sdk/out/common/common.types";
import z from "zod";

import { getZodError } from "../../../lib/get-zod-error";
import validation from "../../../lib/validation";

const registerDeviceModel = z.object({
  new_dev_name: z.object({
    value: z.string(),
  }),
  new_dev_type: z.object({
    value: z.string(),
    metadata: z.object({
      label: z.string(),
    }),
  }),
  new_dev_network: z.object({
    value: z.string(),
    metadata: z.object({
      label: z.string(),
    }),
  }),
  new_dev_eui: z.object({
    value: z.string(),
  }),
  new_dev_site: z.object({
    value: z.string(),
    metadata: z.object({
      label: z.string(),
    }),
  }),
});

type IRegisterDeviceModel = z.infer<typeof registerDeviceModel>;

async function getNewDeviceVariables(scope: Data[], validate: ReturnType<typeof validation>) {
  const new_dev_name = scope.find((x) => x.variable === "new_dev_name");
  const new_dev_type = scope.find((x) => x.variable === "new_dev_type");
  const new_dev_network = scope.find((x) => x.variable === "new_dev_network");
  const new_dev_eui = scope.find((x) => x.variable === "new_dev_eui");
  const new_dev_site = scope.find((x) => x.variable === "new_dev_site");

  try {
    return registerDeviceModel.parse({
      new_dev_name,
      new_dev_type,
      new_dev_network,
      new_dev_eui,
      new_dev_site,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    validate(zodErrorMsg, "danger");
    throw error;
  }
}

export { getNewDeviceVariables, registerDeviceModel, IRegisterDeviceModel };
