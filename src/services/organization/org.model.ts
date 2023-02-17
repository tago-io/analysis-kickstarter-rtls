import z from "zod";

const orgModel = z.object({
  id: z.string(),
});

type OrgModel = z.infer<typeof orgModel>;
