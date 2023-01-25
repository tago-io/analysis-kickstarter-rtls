import zlib from "zlib";
import { Account } from "@tago-io/sdk";
import axios from "axios";
import { resolveEnviroment } from "./lib/resolveEnviroment";

const config = resolveEnviroment(process.argv, false);

const cmd = process.argv.slice(2).map((x) => x.toLowerCase());
const account = new Account({ token: config.account_token });

(async () => {
  if (cmd.length === 0) {
    console.error("You must enter an analysis name");
    return process.exit();
  }

  const analysis = await account.analysis.info(cmd[0]).catch(() => null);
  if (!analysis) {
    throw `Analysis ID ${cmd[0]} can't be found`;
  }

  const script = await account.analysis.downloadScript(analysis.id);
  const script_base64 = await axios
    .get(script.url, {
      responseType: "arraybuffer",
    })
    .then((response) => zlib.gunzipSync(response.data).toString("base64"));

  const new_analysis_name = `${analysis.name} - Copy`;
  const { id: new_analysis_id } = await account.analysis.create({ ...analysis, name: `${analysis.name} - Copy` });
  await account.analysis.uploadScript(new_analysis_id, { content: script_base64, language: analysis.language, name: "script.js" });

  console.info(`Analysis succesfully duplicated: ${new_analysis_name}`);
})().catch(console.log);
