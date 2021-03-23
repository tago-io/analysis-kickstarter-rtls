import { Analysis } from "@tago-io/sdk";
import { startAnalysis } from "./analysis/analysisDeviceUpdater";

export default new Analysis(startAnalysis, { token: "fc9afcb3-f182-45b5-9fe7-9970849131ff" });
