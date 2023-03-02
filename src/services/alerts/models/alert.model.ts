import z from "zod";

const registerAlertModel = z.object({
  condition: z.object({
    value: z.string({ required_error: "Condition field is empty" }),
  }),
  equipments: z.object({
    value: z.string({ required_error: "Equipment field is empty" }),
    metadata: z.object({
      sentValues: z.array(
        z.object({
          value: z.string(),
          label: z.string(),
        })
      ),
    }),
  }),
  condition_value: z.object({
    value: z.number({ required_error: "Condition Option field is empty" }),
  }),
  type: z.object({
    value: z.string({ required_error: "Type field is empty" }),
    metadata: z.object({
      sentValues: z.array(
        z.object({
          value: z.string(),
        })
      ),
    }),
  }),
  users: z.object({
    value: z.string({ required_error: "Users field is empty" }),
    metadata: z.object({
      sentValues: z.array(
        z.object({
          value: z.string(),
        })
      ),
    }),
  }),
  message: z.object({
    value: z.string({ required_error: "Message field is empty" }),
  }),
});

const updateAlertModel = registerAlertModel.partial();
type IAlertModel = z.infer<typeof registerAlertModel>;

export { updateAlertModel, registerAlertModel, IAlertModel };
