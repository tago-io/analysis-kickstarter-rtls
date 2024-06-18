import z from "zod";

const registerSiteModel = z.object({
  name: z.string({ required_error: "#ERR.MISSING_NAME_FIELD#" }),
  address: z.object({
    value: z.string({ required_error: "#ERR.MISSING_ADDRESS_FIELD#" }),
    location: z.array(z.number()).transform((x) => ({
      lng: x[0],
      lat: x[1],
    })),
  }),
});

const updateSiteModel = registerSiteModel.partial();
type ISiteModel = z.infer<typeof registerSiteModel>;

export { registerSiteModel, updateSiteModel, ISiteModel };
