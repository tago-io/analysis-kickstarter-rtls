import z from "zod";

const registerUserModel = z.object({
  new_user_name: z.object({
    value: z.string(),
  }),
  new_user_email: z.object({
    value: z.string(),
  }),
  new_user_phone: z.object({
    value: z.string(),
  }),
  new_user_access: z.object({
    value: z.string(),
    metadata: z.object({
      label: z.string(),
    }),
  }),
  new_user_site: z
    .object({
      value: z.string(),
      metadata: z.object({
        label: z.string(),
      }),
    })
    .optional(),
});

type IRegisterUserModel = z.infer<typeof registerUserModel>;

export { registerUserModel, IRegisterUserModel };
