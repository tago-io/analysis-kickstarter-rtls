import { z } from "zod";

const alertModel = z.object({
  triggers: z.array(
    z.object({
      id: z.string(),
      value: z.union([z.string(), z.boolean(), z.number()]),
      values: z.union([z.string(), z.number()]).array().optional(),
      condition: z.enum([">", "<", "=", "!", "*"]),
      alertActivation: z.boolean().default(false),
      recurringAlarm: z.boolean().default(false),
      type: z.enum(["number", "checkbox", "dropdown"]),
    })
  ),
  notificationType: z.object({
    email: z.boolean().default(false),
    push: z.boolean().default(false),
    sms: z.boolean().default(false),
  }),
  recipients: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    })
  ),
  status: z.string().optional(),
  name: z.string().optional(),
  device: z.string().min(24).max(34),
});

type IAlertModel = z.infer<typeof alertModel>;

export { IAlertModel, alertModel };
