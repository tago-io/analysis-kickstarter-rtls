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

  const payload_array = ["b05b8cf1c95b8cf4be5b8ce8b9", "b05b8cf1c95b8cf4be5b8ce8BF", "b05b8cf1c95b8cf4be5b8ce8C9"];

  const coord_pos = [
    [35.7796, -78.6382],
    [35.975493, -78.910795],
    [36.020212, -78.474089],
  ];

  if (Math.floor(Math.random() * 2) >= 1) {
    await asset_0008.sendData(
      parseTagoObject({
        payload: {
          variable: "payload",
          value: payload_array[Math.floor(Math.random() * (2 - 0 + 1)) + 0],
        },
        port: { variable: "port", value: 25 },
      })
    );
  } else {
    await asset_0128.sendData(
      parseTagoObject({
        payload: {
          variable: "payload",
          value: payload_array[Math.floor(Math.random() * (2 - 0 + 1)) + 0],
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
          coordinates: coord_pos[Math.floor(Math.random() * (2 - 0 + 1)) + 0],
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

// [
//   { "variable": "payload", "value": "b05b8cf1c95b8cf4be5b8ce8b9" },
// { "variable": "port", "value": 25 }
//  ]

// [
//   { "variable": "payload", "value": "b05b8cf1c95b8cf4be5b8ce8BF" },
// { "variable": "port", "value": 25 }
//  ]

// [
//   { "variable": "payload", "value": "b05b8cf1c95b8cf4be5b8ce8C9" },
// { "variable": "port", "value": 25 }
//  ]
