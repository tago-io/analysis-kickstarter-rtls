import { execSync } from "child_process";
import { promises as fs } from "fs";
import { Account } from "@tago-io/sdk";
import { resolveEnviroment } from "./lib/resolveEnviroment";

const config = resolveEnviroment(process.argv, false);

const cmd = process.argv.slice(2).map((x) => x.toLowerCase());
let script_names = Object.keys(config.analysis_id);
if (cmd.length > 0 && cmd[0] !== "all") {
  script_names = script_names.filter((key) => cmd.find((x) => key.toLowerCase().includes(x)));
}

const account = new Account({ token: config.account_token });

(async () => {
  if (script_names.length === 0) {
    console.error("No analysis found.");
    return process.exit();
  }

  for (const script_name of script_names) {
    console.info(`\nBuilding ${script_name}.ts`);
    execSync(`analysis-builder src/analysis/${script_name}.ts ./build/${script_name}.tago.js`, { stdio: "inherit" });
    const script = await fs.readFile(`./build/${script_name}.tago.js`, { encoding: "base64" }).catch((error) => {
      console.error(`Script ${script_name} file location error:`, error);
      return null;
    });

    if (!script) {
      return process.exit();
    }

    await account.analysis
      .uploadScript(config.analysis_id[script_name], {
        content: script,
        language: "node",
        name: `${script_name}.tago.js`,
      })
      .catch((error) => console.error(`\n> Script ${script_name}.ts error: `, error))
      .then(() => console.info(`\n> Script ${script_name}.ts successfully uploaded to TagoIO!`));
    await account.analysis.edit(config.analysis_id[script_name], { run_on: "tago" });
  }
  process.exit();
})().catch(console.log);
