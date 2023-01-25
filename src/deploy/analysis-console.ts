import { Account } from "@tago-io/sdk";
import { connect } from "socket.io-client";
import { resolveEnviroment } from "./lib/resolveEnviroment";

const config = resolveEnviroment(process.argv, false);

const cmd = process.argv.slice(2).map((x) => x.toLowerCase());
const script_names = Object.keys(config.analysis_id);

function apiSocket() {
  const socket = connect("wss://realtime.tago.io", {
    reconnectionDelay: 10_000,
    reconnection: true,
    transports: ["websocket"],
    query: {
      token: config.account_token,
    },
  });

  return socket;
}

const account = new Account({ token: config.account_token });

async function consoleConnection() {
  if (!cmd[0]) {
    console.error("You must enter the name of the analysis from your configuration file.");
    return process.exit();
  }
  const script_name = script_names.find((key) => key.toLowerCase().includes(cmd[0].toLowerCase()));

  if (!script_name) {
    console.error(`Analysis not found: ${cmd[9]}`);
    return process.exit();
  }

  const analysis_info = await account.analysis.info(config.analysis_id[script_name]).catch(() => null);
  if (!analysis_info) {
    console.error(`Analysis with ID: ${config.analysis_id[script_name]} couldn't be found.`);
    return process.exit();
  }

  const socket = apiSocket();
  socket.on("connect", () => {
    console.info("Connected to TagoIO, Getting analysis information...");
    socket.emit("attach", "analysis", config.analysis_id[script_name]);
    socket.emit("attach", { resourceName: "analysis", resourceID: config.analysis_id[script_name] });
  });

  socket.on("disconnect", () => console.info("Disconnected from TagoIO.\n\n"));

  socket.on("error", (e: Error) => console.error("Connection error", e));

  socket.on("ready", () => console.info(`Analysis [${analysis_info.name}] found succesfully. Waiting for logs...`));

  socket.on("analysis::console", (scope: any) => {
    console.log(`\x1b[35m${new Date(scope.timestamp).toISOString()} \x1b[0m ${scope.message}`);
  });
}

consoleConnection().catch(console.log);
