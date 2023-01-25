import { Account, Device } from "@tago-io/sdk";
import { io } from "socket.io-client";
import { resolveEnviroment } from "./lib/resolveEnviroment";

const config = resolveEnviroment(process.argv, false);

const cmd = process.argv.slice(2).map((x) => x.toLowerCase());

function apiSocket() {
  const socket = io("wss://realtime.tago.io", {
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

async function inspectorConnection() {
  let device_id_token = cmd[0];
  if (!device_id_token) {
    console.error("You must provide a device ID or Token");
    return process.exit();
  }
  let device_info = await account.devices.info(device_id_token).catch(() => null);
  if (!device_info) {
    const device = new Device({ token: device_id_token });
    device_info = await device.info().catch(() => null);
    if (!device_info) {
      console.error(`Device with ID/token: ${device_id_token} couldn't be found.`);
      return process.exit();
    }
    device_id_token = device_info.id;
  }

  const socket = apiSocket();
  socket.on("connect", () => {
    console.info("Connected to TagoIO, Getting device information...");
    socket.emit("attach", "device", device_id_token);
    socket.emit("attach", { resourceName: "device", resourceID: device_id_token });
  });

  socket.on("disconnect", () => console.info("Disconnected from TagoIO.\n\n"));

  socket.on("error", (e: Error) => console.error("Connection error", e));

  socket.on("ready", () => console.info(`Device [${device_info.name}] found succesfully. Waiting for logs...`));

  socket.on("device::inspection", (scope: any) => {
    console.log(`\x1b[35m${new Date(scope.timestamp).toISOString()} \x1b[32m${scope.title}\x1b[0m ${scope.content}`);
  });
}

inspectorConnection().catch(console.log);
