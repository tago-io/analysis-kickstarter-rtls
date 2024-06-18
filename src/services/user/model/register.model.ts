import z from "zod";

const registerUserModel = z.object({
  new_user_name: z.object({
    value: z.string({ required_error: "#ERR.MISSING_NAME_FIELD#" }),
  }),
  new_user_email: z.object({
    value: z.string({ required_error: "#ERR.MISSING_EMAIL_FIELD#" }),
  }),
  new_user_phone: z.object({
    value: z.string({ required_error: "#ERR.MISSING_PHONE_FIELD#" }),
  }),
  new_user_access: z.object({
    value: z.string({ required_error: "#ERR.MISSING_ACCESS_FIELD#" }),
    metadata: z.object({
      label: z.string(),
    }),
  }),
  new_user_site: z
    .object({
      value: z.string({ required_error: "#ERR.MISSING_SITE_FIELD#" }),
      metadata: z.object({
        label: z.string(),
      }),
    })
    .optional(),
});

type IRegisterUserModel = z.infer<typeof registerUserModel>;

export { registerUserModel, IRegisterUserModel };
