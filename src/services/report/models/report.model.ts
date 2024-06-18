import z from "zod";

const registerReportModel = z.object({
  users: z.string({ required_error: "#ERR.ERR_MISSING_USER_LIST#" }).transform((data) => data.split(",").map((x) => x.trim())),
});

const updateReportModel = registerReportModel.partial();
type IReportModel = z.infer<typeof registerReportModel>;

export { updateReportModel, registerReportModel, IReportModel };
