import { Utils, Services, Account, Device, Types, Analysis } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { ConfigurationParams, DeviceListItem } from "@tago-io/sdk/out/modules/Account/devices.types";
import moment from "moment-timezone";
import { check } from "prettier";
import { parseTagoObject } from "../lib/data.logic";
import getDevice from "../lib/getDevice";
import { TagoContext } from "../types";

async function resolveDevice(context: TagoContext, account: Account, dept_id: string, device_id: string) {
  const device = await getDevice(account, device_id);
  const org_dev = await getDevice(account, dept_id);

  const dataList = await device.getData({ variables: ["battery_status_life", "payload"], qty: 1 });
  const payload = dataList.find((item) => item.variable === "payload");
  const battery = dataList.find((item) => item.variable === "battery_status_life");
  if (dataList.length === 0) return context.log("No data");

  let checkin_date;

  if (payload) {
    checkin_date = moment(payload.time as Date)
      .tz("America/New_York")
      .format("MMMM Do YYYY, h:mm:ss a");
  } else if (battery) {
    checkin_date = moment(battery.time as Date)
      .tz("America/New_York")
      .format("MMMM Do YYYY, h:mm:ss a");
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

  context.log(data);

  org_dev.sendData(data);
}

async function handler(context: TagoContext, scope: Data[]): Promise<void> {
  context.log("Running Analysis");

  const environment = Utils.envToJson(context.environment);
  if (!environment) {
    return;
  } else if (!environment.config_token) {
    throw "Missing config_token environment var";
  } else if (!environment.account_token) {
    throw "Missing account_token environment var";
  }

  const config_dev = new Device({ token: environment.config_token });
  const account = new Account({ token: environment.account_token });

  const sensorList = await account.devices.list({
    page: 1,
    fields: ["id", "name", "tags", "last_input"],
    filter: { tags: [{ key: "device_type", value: "device" }] },
    amount: 10000,
  });

  sensorList.map((device) =>
    resolveDevice(
      context,
      account,
      device.tags.find((tag) => tag.key === "organization_id")?.value as string,
      device.tags.find((tag) => tag.key === "device_id")?.value as string
    )
  );
}

async function startAnalysis(context: TagoContext, scope: any) {
  try {
    await handler(context, scope);
    context.log("Analysis finished");
  } catch (error) {
    console.log(error);
    context.log(error.message || JSON.stringify(error));
  }
}

export { startAnalysis };
