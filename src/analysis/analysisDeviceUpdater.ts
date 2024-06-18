import { queue } from "async";

import { Analysis, Resources, Utils } from "@tago-io/sdk";

import { ParamResolver } from "../lib/edit.params";
import { fetchDeviceList } from "../lib/fetch-device-list";
import { TagoContext } from "../types";

interface IResolveDevice {
  context: TagoContext;

  device_id: string;
}

async function resolveDevice({ context, device_id }: IResolveDevice) {
  console.log("Device", device_id);
  const dataList = await Resources.devices.getDeviceData(device_id, { variables: ["battery"], qty: 1 });
  const battery = dataList.find((item) => item.variable === "battery");
  if (dataList.length === 0) {
    return context.log("No data");
  }
  // adding battery parameter
  const paramList = await Resources.devices.paramList(device_id);
  const paramResolver = ParamResolver(paramList);
  await paramResolver.setParam("battery", String(battery?.value)).apply(device_id);
}

async function handler(context: TagoContext): Promise<void> {
  console.log("Running Analysis");

  const environment = Utils.envToJson(context.environment);
  if (!environment) {
    return;
  }

  const sensorList = await fetchDeviceList({ tags: [{ key: "device_type", value: "device" }] });
  console.log("Sensor List", sensorList);
  const resolveQueue = queue(resolveDevice, 5);

  resolveQueue.error((error) => {
    console.error("Error", error);
  });
  for (const device of sensorList) {
    const orgID = device.tags.find((tag) => tag.key === "organization_id")?.value;
    const deviceID = device.tags.find((tag) => tag.key === "device_id")?.value;
    if (!orgID) {
      throw "Device not assigned to an Organization";
    }
    if (!deviceID) {
      throw "Device not assigned to a Site";
    }

    void resolveQueue.push({ context, device_id: deviceID }).catch(() => null);
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
