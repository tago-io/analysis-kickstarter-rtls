import { Analysis } from "@tago-io/sdk";
import { startAnalysis } from "./analysis/analysisHandler";

export default new Analysis(startAnalysis, { token: "94f78b11-587d-432d-a6b0-52e8ce4821a7" });

//Send this variable to settings_dev, will be used when creating devices, on form's dropdown "Type".
// [
//   {
//     "id": "5fdbc47fcf49a20028d2b554",
//     "origin": "5fc64986a0e14a0026084d9e",
//     "time": "2020-12-17T20:50:07.977Z",
//     "value": "5f5a8f3351d4db99c40deed1",
//     "variable": "list_devtype_id",
//     "metadata": {
//       "label": "Industrial GPS Asset Tracker"
//     }
//   },
//   {
//     "id": "5fdbc47fcf49a20028d2b555",
//     "origin": "5fc64986a0e14a0026084d9e",
//     "time": "2020-12-17T20:50:07.977Z",
//     "value": "5f5a8f3351d4db99c40deecf",
//     "variable": "list_devtype_id",
//     "metadata": {
//       "label": "BLE Asset Tracker"
//     }
//   }
// ]
