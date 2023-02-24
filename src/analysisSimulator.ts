import { Utils, Account, Analysis } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import validation from "./lib/validation";
import { parseTagoObject } from "./lib/data.logic";
import getDevice from "./lib/getDevice";
import { TagoContext } from "./types";

async function startAnalysis(context: TagoContext, scope: Data[]) {
  context.log("Running analysis");
  const environment = Utils.envToJson(context.environment);

  const site_id = scope[0].device;

  if (!environment.config_token) {
    context.log("Missing config_token environment var");
  } else if (!environment.account_token) {
    context.log("Missing account_token environment var");
  }

  const account = new Account({ token: environment.account_token });

  const site_dev = await getDevice(account, site_id);

  const org_id = (await site_dev.info()).tags.find((x) => x.key === "organization_id").value;

  const org_dev = await getDevice(account, org_id);

  const validate = validation("plot_validation", site_dev);

  const pin_layer = scope.find((x) => x.variable === "pin_layer");
  const pin_equip = scope.find((x) => x.variable === "pin_equip");
  const [layer] = await site_dev.getData({ variables: ["layers"], values: pin_layer.value });

  const beacon_sent = scope.filter((x) => x?.variable?.includes("beacon"));
  const [strongest_beacon] = beacon_sent.sort((a, b) => Number(b.value) - Number(a.value));

  const pos = Number(strongest_beacon.variable.slice(7)); //beacon_1 -> 1

  const keys = Object.keys((layer.metadata as any).fixed_position);

  const [equip_serie] = await org_dev.getData({ variables: "equip_name", values: pin_equip.value, qty: 1 });

  const [equip_img] = await site_dev.getData({ variables: "equip_img", series: equip_serie?.group });

  const data_to_plot = parseTagoObject(
    {
      equipment_location: {
        value: pin_equip.value,
        metadata: {
          layer: layer.serie,
          x: (layer.metadata as any).fixed_position[keys[pos - 1]].x,
          y: (layer.metadata as any).fixed_position[keys[pos - 1]].y,
          img_pin: equip_img?.value,
        },
      },
    },
    equip_serie.serie
  );

  const assetHistory = parseTagoObject({
    asset_history: {
      value: pin_equip.value,
      metadata: {
        floor: layer.value,
        site: "SIMULATED",
      },
    },
  });

  await site_dev.deleteData({ variables: "equipment_location", qty: 1, series: equip_serie.group });

  await site_dev.sendData(data_to_plot.concat(assetHistory));

  throw validate("Position plotted successfully!", "success");
}

if (!process.env.T_TEST) {
  Analysis.use(startAnalysis, { token: process.env.T_ANALYSIS_TOKEN });
}

export { startAnalysis };
