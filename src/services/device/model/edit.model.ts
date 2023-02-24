import z from "zod";

const editDeviceModel = z.object({
  dev_name: z.string().optional(),
  new_site_id_data: z.string().optional(),
});

type IEditDeviceModel = z.infer<typeof editDeviceModel>;

export { editDeviceModel, IEditDeviceModel };
