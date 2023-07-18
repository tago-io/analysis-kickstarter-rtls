import { Utils, Account, Analysis } from "@tago-io/sdk";
import { queue } from "async";
import getDevice from "../lib/getDevice";
import { TagoContext } from "../types";
import { ParamResolver } from "../lib/edit.params";
import { fetchDeviceList } from "../lib/fetch-device-list";

async function resolveSensorQueue(data: any) {
  const { context, account, deviceID } = data;
  void resolveDevice(context, account, deviceID);
}

async function resolveDevice(context: TagoContext, account: Account, device_id: string) {
  const device = await getDevice(account, device_id);

  const dataList = await device.getData({ variables: ["battery_status_life", "payload"], qty: 1 });
  const battery = dataList.find((item) => item.variable === "battery_status_life");
  if (dataList.length === 0) {
    return context.log("No data");
  }

  // adding battery parameter
  const paramList = await account.devices.paramList(device_id);
  const paramResolver = ParamResolver(paramList);
  await paramResolver.setParam("battery", battery?.value as string).apply(account, device_id);
}

async function handler(context: TagoContext): Promise<void> {
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
  const sensorList = await fetchDeviceList(account, { tags: [{ key: "device_type", value: "device" }] });
  const resolveQueue = queue(resolveSensorQueue, 5);

  for (const device of sensorList) {
    const orgID = device.tags.find((tag) => tag.key === "organization_id")?.value;
    const deviceID = device.tags.find((tag) => tag.key === "device_id")?.value;
    if (!orgID) {
      throw "Device not assigned to an Organization";
    }
    if (!deviceID) {
      throw "Device not assigned to a Site";
    }
    const data = { context, account, deviceID };
    void resolveQueue.push({ data });
  }

  await resolveQueue.drain();
}

async function startAnalysis(context: TagoContext) {
  try {
    await handler(context);
    context.log("Analysis finished");
  } catch (error: any) {
    console.error(error);
    context.log(error.message || JSON.stringify(error));
  }
}

if (!process.env.T_TEST) {
  Analysis.use(startAnalysis, { token: process.env.T_ANALYSIS_TOKEN });
}

export { startAnalysis };
