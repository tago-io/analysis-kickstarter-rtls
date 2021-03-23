import { Utils, Services, Account, Device, Types, Analysis } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import validation from "../src/lib/validation";
import { parseTagoObject } from "./lib/data.logic";
import getDevice from "./lib/getDevice";
import { ServiceParams, TagoContext, ServicesAnalysis } from "./types";

async function startAnalysis(context: TagoContext, scope: Data[]) {
  context.log("Running analysis");
  const environment = Utils.envToJson(context.environment);

  const asset_id = scope[0].origin;

  if (!environment.config_token) {
    context.log("Missing config_token environment var");
  } else if (!environment.account_token) {
    context.log("Missing account_token environment var");
  }

  const account = new Account({ token: environment.account_token });
  const config_dev = new Device({ token: environment.config_token });

  const asset_dev = await getDevice(account, asset_id);

  const { name: asset_name, tags } = await asset_dev.info();

  const site_id = tags.find((x) => x.key === "site_id").value as string;

  const site_dev = await getDevice(account, site_id);

  const validate = validation("plot_validation", site_dev);

  const pos_x = scope.find((x) => x.variable === "pos_x");
  const pos_y = scope.find((x) => x.variable === "pos_y");
  const pin_layer = scope.find((x) => x.variable === "pin_layer");
  // const plot_validation = scope.find((x) => x.variable === "plot_validation");

  //serie does not match with layers serie so we need to do a workaround

  const [layer] = await site_dev.getData({ variable: "layers", value: pin_layer.value });

  if (!(pos_x.value <= 1 && pos_x.value >= 0 && pos_y.value <= 1 && pos_y.value >= 0))
    throw validate("Please make sure the values are between 0 - 1", "warning");

  const data_to_plot = parseTagoObject(
    {
      asset_location: {
        variable: "asset_location",
        value: asset_name,
        metadata: {
          layer: layer.serie,
          x: pos_x.value,
          y: pos_y.value,
        },
      },
    },
    asset_id
  );

  const [first_beacon] = await site_dev.getData({ variable: "beacon_name" });

  const assetHistory = parseTagoObject({
    asset_equip_paired: "No equipment paired yet.",
    asset_name: asset_name,
    asset_closest_beacon: first_beacon.value,
    asset_strongest_rssi: Math.floor(Math.random() * -100),
  });

  await site_dev.sendData(data_to_plot);
  await site_dev.sendData(assetHistory);

  throw validate("Position plotted successfully!", "success");
}

export default new Analysis(startAnalysis, { token: "338895a3-805b-499e-917f-f2fa51903cc5" });
