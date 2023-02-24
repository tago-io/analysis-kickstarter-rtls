import z from "zod";

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

export { registerDeviceModel, IRegisterDeviceModel };
