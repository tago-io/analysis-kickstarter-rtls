import { Analysis, Resources, Utils } from "@tago-io/sdk";

import { parseObjectToTago } from "../lib/parse-object-to-tagoio";
import { TagoContext } from "../types";

async function handler(context: TagoContext) {
  context.log("Running Analysis");
  const environment = Utils.envToJson(context.environment);
  if (!environment) {
    return;
  }

  if (!environment.config_id) {
    throw "Missing config_id environment var";
  } else if (!environment.asset_indoor_id) {
    throw "Missing asset_indoor_id environment var";
  } else if (!environment.asset_outdoor_id) {
    throw "Missing asset_outdoor_id environment var";
  }

  const config_id = environment.config_id;
  const indoor_asset_id = environment.asset_indoor_id;
  const outdoor_asset_id = environment.asset_outdoor_id;

  const payload_array = ["b05b8cf1c95b8cf4be5b8ce8b9", "b05b8cf1c95b8cf4be5b8ce8BF", "b05b8cf1c95b8cf4be5b8ce8C9"];

  const coord_pos = [
    [35.7796, -78.6382],
    [35.975_493, -78.910_795],
    [36.020_212, -78.474_089],
  ];

  const [asset_gen_count] = await Resources.devices.getDeviceData(config_id, { variables: "asset_gen_count" });
  await Resources.devices.deleteDeviceData(config_id, { variables: "asset_gen_count" });

  let count = asset_gen_count.value as number;

  await Resources.devices.sendDeviceData(
    indoor_asset_id,
    parseObjectToTago({
      payload: {
        variable: "payload",
        value: payload_array[count],
      },
      port: { variable: "port", value: 25 },
    })
  );

  await Resources.devices.sendDeviceData(
    outdoor_asset_id,
    parseObjectToTago({
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
    await Resources.devices.sendDeviceData(config_id, parseObjectToTago({ asset_gen_count: { variables: "asset_gen_count", values: count } }));
  } else {
    await Resources.devices.sendDeviceData(config_id, parseObjectToTago({ asset_gen_count: { variables: "asset_gen_count", values: 0 } }));
  }

  return context.log("Random data sent");
}

async function startAnalysis(context: TagoContext) {
  try {
    await handler(context);
  } catch (error: any) {
    console.log(error);
    context.log(error.message || JSON.stringify(error));
  }
}

if (!process.env.T_TEST) {
  Analysis.use(startAnalysis, { token: process.env.T_ANALYSIS_TOKEN });
}

export { startAnalysis };
