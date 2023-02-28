import z from "zod";

const registerEquipModel = z.object({
  new_equip_name: z.object({
    value: z.string({ required_error: "Name field is empty" }),
  }),
  new_equip_serie: z.object({
    value: z.string({ required_error: "Serie field is empty" }),
  }),
  new_equip_img: z.object({
    value: z.string({ required_error: "Image field is empty" }),
    metadata: z.object({
      file: z.object({
        url: z.string(),
      }),
    }),
  }),
  new_equip_asset: z.object({
    value: z.string({ required_error: "Asset field is empty" }),
    metadata: z.object({
      label: z.string(),
    }),
  }),
});

type IEquipModel = z.infer<typeof registerEquipModel>;

export { registerEquipModel, IEquipModel };
