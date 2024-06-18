import z from "zod";

const registerEquipModel = z.object({
  name: z.string({ required_error: "#ERR.MISSING_NAME_FIELD#" }),
  serieNumber: z.string({ required_error: "#ERR.MISSING_SERIE_FIELD#" }),
  image: z.object({
    fileName: z.string({ required_error: "#ERR.MISSING_IMAGE_FIELD#" }),
    url: z.string({ required_error: "#ERR.MISSING_IMAGE_FIELD#" }).url(),
  }),
  assetID: z.string({ required_error: "#ERR.MISSING_SENSOR_FIELD#" }),
});

type IEquipModel = z.infer<typeof registerEquipModel>;

export { registerEquipModel, IEquipModel };
