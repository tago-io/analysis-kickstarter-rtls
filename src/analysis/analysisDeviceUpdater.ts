import { Utils, Account, Analysis } from "@tago-io/sdk";
import moment from "moment-timezone";
import { parseTagoObject } from "../lib/data.logic";
import getDevice from "../lib/getDevice";
import { TagoContext } from "../types";

async function resolveDevice(context: TagoContext, account: Account, dept_id: string, device_id: string) {
  const device = await getDevice(account, device_id);
  const org_dev = await getDevice(account, dept_id);

  const dataList = await device.getData({ variables: ["battery_status_life", "payload"], qty: 1 });
  const payload = dataList.find((item) => item.variable === "payload");
  const battery = dataList.find((item) => item.variable === "battery_status_life");
  if (dataList.length === 0) {
    return context.log("No data");
  }

  let checkin_date;

  if (payload) {
    checkin_date = moment(payload.time).tz("America/New_York").format("MMMM Do YYYY, h:mm:ss a");
  } else if (battery) {
    checkin_date = moment(battery.time).tz("America/New_York").format("MMMM Do YYYY, h:mm:ss a");
  }

  await org_dev.deleteData({
    variables: ["dev_battery", "dev_lastcheckin"],
    series: device_id,
    qty: 99,
  });

  const data = parseTagoObject(
    {
      dev_battery: { value: battery?.value, unit: battery?.unit },
      dev_lastcheckin: { value: checkin_date ? checkin_date : null },
    },
    device_id
  );

  await org_dev.sendData(data);
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

  const sensorList = await account.devices.list({
    page: 1,
    fields: ["id", "name", "tags", "last_input"],
    filter: { tags: [{ key: "device_type", value: "device" }] },
    amount: 10_000,
  });

  sensorList.map((device) => {
    const orgID = device.tags.find((tag) => tag.key === "organization_id")?.value;
    const deviceID = device.tags.find((tag) => tag.key === "device_id")?.value;

    if (!orgID) {
      throw "Device not assigned to an Organization";
    }

    if (!deviceID) {
      throw "Device not assigned to a Site";
    }

    void resolveDevice(context, account, orgID, deviceID);
  });
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
