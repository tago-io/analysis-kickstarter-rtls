import z from "zod";

const registerOrgModel = z.object({
  name: z.string({ required_error: "#ERR.ERR_MISSING_NAME_FIELD#" }),
  address: z.object({
    value: z.string({ required_error: "#ERR_MISSING_ADDRESS_FIELD#" }),
    location: z.array(z.number()).transform((x) => ({
      lng: x[0],
      lat: x[1],
    })),
  }),
});

const updateOrgModel = registerOrgModel.partial();
type IOrgModel = z.infer<typeof registerOrgModel>;

export { updateOrgModel, registerOrgModel, IOrgModel };
