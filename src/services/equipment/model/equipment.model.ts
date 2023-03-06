import z from "zod";

const registerEquipModel = z.object({
  name: z.string({ required_error: "Name field is empty" }),
  serieNumber: z.string({ required_error: "Serie field is empty" }),
  image: z.object({
    fileName: z.string({ required_error: "Image field is empty" }),
    url: z.string({ required_error: "Image field is empty" }).url(),
  }),
  assetID: z.string({ required_error: "Asset field is empty" }),
});

type IEquipModel = z.infer<typeof registerEquipModel>;

export { registerEquipModel, IEquipModel };
