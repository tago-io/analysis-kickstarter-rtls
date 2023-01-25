import { Account } from "@tago-io/sdk";
import { resolveEnviroment } from "./lib/resolveEnviroment";

const config = resolveEnviroment(process.argv, false);

const cmd = process.argv.slice(2).map((x) => x.toLowerCase());
let script_names = Object.keys(config.analysis_id);

script_names = script_names.filter((key) => cmd.find((x) => key.toLowerCase().includes(x)));

const account = new Account({ token: config.account_token });

(async () => {
  if (cmd.length === 0) {
    console.error("You must enter an analysis name");
    return process.exit();
  }

  for (const script_name of script_names) {
    console.log(`> Analysis found: ${script_name} [${config.analysis_id[script_name]}].`);
    await account.analysis.run(config.analysis_id[script_name]).then(console.log);
  }
})().catch(console.log);
