import { Data } from "@tago-io/sdk/out/common/common.types";
import z from "zod";

import { getZodError } from "../../../lib/get-zod-error";
import validation from "../../../lib/validation";

const registerEquipModel = z.object({
  new_equip_name: z.object({
    value: z.string(),
  }),
  new_equip_serie: z.object({
    value: z.string(),
  }),
  new_equip_img: z.object({
    value: z.string(),
    metadata: z.object({
      file: z.string(),
    }),
  }),
  new_equip_asset: z.object({
    value: z.string(),
    metadata: z.object({
      label: z.string(),
    }),
  }),
});

type IRegisterEquipModel = z.infer<typeof registerEquipModel>;

async function getNewEquipVariables(scope: Data[], validate: ReturnType<typeof validation>) {
  const new_equip_name = scope.find((x) => x.variable === "new_equip_name");
  const new_equip_serie = scope.find((x) => x.variable === "new_equip_serie");
  const new_equip_img = scope.find((x) => x.variable === "new_equip_img");
  const new_equip_asset = scope.find((x) => x.variable === "new_equip_asset");

  try {
    return registerEquipModel.parse({
      new_equip_name,
      new_equip_serie,
      new_equip_img,
      new_equip_asset,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    validate(zodErrorMsg, "danger");
    throw error;
  }
}

export { getNewEquipVariables, registerEquipModel, IRegisterEquipModel };
