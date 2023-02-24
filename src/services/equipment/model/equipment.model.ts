import z from "zod";

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
      file: z.object({
        path: z.string(),
      }),
    }),
  }),
  new_equip_asset: z.object({
    value: z.string(),
    metadata: z.object({
      label: z.string(),
    }),
  }),
});

type IEquipModel = z.infer<typeof registerEquipModel>;

export { registerEquipModel, IEquipModel };
