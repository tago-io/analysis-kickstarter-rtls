import { Analysis, Utils, Device, Account } from "@tago-io/sdk";
import { parseTagoObject } from "./lib/data.logic";
import getDevice from "./lib/getDevice";
import { TagoContext } from "./types";

async function handler(context: TagoContext) {
  context.log("Running Analysis");
  const environment = Utils.envToJson(context.environment);
  if (!environment) {
    return;
  } else if (!environment.config_token) {
    throw "Missing config_token environment var";
  } else if (!environment.account_token) {
    throw "Missing account_token environment var";
  }

  const account = new Account({ token: environment.account_token });
  const config_dev = new Device({ token: environment.config_token });

  const asset_indoor = await getDevice(account, environment.asset_indoor_id);
  const asset_outdoor = await getDevice(account, environment.asset_outdoor_id);

  const payload_array = ["b05b8cf1c95b8cf4be5b8ce8b9", "b05b8cf1c95b8cf4be5b8ce8BF", "b05b8cf1c95b8cf4be5b8ce8C9"];

  const coord_pos = [
    [35.7796, -78.6382],
    [35.975_493, -78.910_795],
    [36.020_212, -78.474_089],
  ];

  const [asset_gen_count] = await config_dev.getData({ variables: "asset_gen_count" });
  await config_dev.deleteData({ variables: "asset_gen_count" });

  let count = asset_gen_count.value as number;

  await asset_indoor.sendData(
    parseTagoObject({
      payload: {
        variable: "payload",
        value: payload_array[count],
      },
      port: { variable: "port", value: 25 },
    })
  );

  await asset_outdoor.sendData(
    parseTagoObject({
      payload: {
        variable: "asset_location",
        value: "Random Position Generated",
        location: {
          coordinates: coord_pos[count],
        },
      },
      port: { variable: "port", value: 25 },
    })
  );

  if (count !== 2) {
    count = count + 1;
    await config_dev.sendData(parseTagoObject({ asset_gen_count: { variables: "asset_gen_count", values: count } }));
  } else {
    await config_dev.sendData(parseTagoObject({ asset_gen_count: { variables: "asset_gen_count", values: 0 } }));
  }

  return context.log("Random data sent");
}

async function startAnalysis(context: TagoContext) {
  try {
    await handler(context);
  } catch (error) {
    console.log(error);
    context.log(error.message || JSON.stringify(error));
  }
}

if (!process.env.T_TEST) {
  Analysis.use(startAnalysis, { token: process.env.T_ANALYSIS_TOKEN });
}

export { startAnalysis };
