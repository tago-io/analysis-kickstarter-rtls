import z from "zod";

const registerDeviceModel = z.object({
  new_dev_name: z.object({
    value: z.string({ required_error: "Name field is empty" }),
  }),
  new_dev_type: z.object({
    value: z.string({ required_error: "Type field is empty" }),
    metadata: z.object({
      label: z.string(),
    }),
  }),
  new_dev_network: z.object({
    value: z.string({ required_error: "Network field is empty" }),
    metadata: z.object({
      label: z.string(),
    }),
  }),
  new_dev_eui: z.object({
    value: z.string({ required_error: "EUI field is empty" }),
  }),
  new_dev_site: z.object({
    value: z.string({ required_error: "Site field is empty" }),
    metadata: z.object({
      label: z.string(),
    }),
  }),
});

type IRegisterDeviceModel = z.infer<typeof registerDeviceModel>;

export { registerDeviceModel, IRegisterDeviceModel };
