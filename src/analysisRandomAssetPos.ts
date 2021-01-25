import { Analysis, Utils, Device, Account } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { parseTagoObject } from "./lib/data.logic";
import getDevice from "./lib/getDevice";
import { TagoContext } from "./types";

async function handler(context: TagoContext, scope: Data[]) {
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

  const asset_0008 = await getDevice(account, environment.asset_0008_id);
  const asset_0128 = await getDevice(account, environment.asset_0128_id);
  const asset_0026 = await getDevice(account, environment.asset_0026_id);

  const rand_array = ["00", "f4", "f6", "de", "9e", "d6", "b2", "f8", "e6", "a0"];

  const rand_pos = [
    [35.7705745, -78.6794943],
    [-23.634459, -46.669921],
    [-34.610435, -58.543507],
    [-34.012697, 18.828928],
    [51.524286, -0.109501],
    [-28.085785, 153.44981],
  ];

  if (Math.floor(Math.random() * 2) >= 1) {
    await asset_0008.sendData(
      parseTagoObject({
        payload: {
          variable: "payload",
          value: `0a5b8cf1${rand_array[Math.floor(Math.random() * 10)]}5b8cf4${rand_array[Math.floor(Math.random() * 10)]}5b8ce8${
            rand_array[Math.floor(Math.random() * 10)]
          }`,
        },
        port: { variable: "port", value: 25 },
      })
    );
  } else {
    await asset_0128.sendData(
      parseTagoObject({
        payload: {
          variable: "payload",
          value: `0a5b8cf1${rand_array[Math.floor(Math.random() * 10)]}5b8cf4${rand_array[Math.floor(Math.random() * 10)]}5b8ce8${
            rand_array[Math.floor(Math.random() * 10)]
          }`,
        },
        port: { variable: "port", value: 25 },
      })
    );
  }
  await asset_0026.sendData(
    parseTagoObject({
      payload: {
        variable: "asset_location",
        value: "Random Position Generated",
        location: {
          coordinates: rand_pos[Math.floor(Math.random() * 6)],
        },
      },
      port: { variable: "port", value: 25 },
    })
  );

  return context.log("Random data sent");
}

async function startAnalysis(context: TagoContext, scope: any) {
  try {
    await handler(context, scope);
  } catch (error) {
    console.log(error);
    context.log(error.message || JSON.stringify(error));
  }
}

export default new Analysis(startAnalysis, { token: "665002f9-3a72-4cab-8a8e-43f2a70a41d3" });
