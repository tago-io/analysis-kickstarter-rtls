import z from "zod";

const editUserModel = z.object({
  user_name: z.string().optional(),
  user_phone: z.string().optional(),
});

type IEditUserModel = z.infer<typeof editUserModel>;

export { editUserModel, IEditUserModel };
