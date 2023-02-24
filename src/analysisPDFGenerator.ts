import { Account, Analysis, Services, Utils } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/out/common/common.types";
import axios from "axios";

import { getImageBase64 } from "./lib/get-image-base64";
import getDevice from "./lib/getDevice";
import { footerTemplate, headerTemplate, html } from "./services/report/html";
import { TagoContext } from "./types";

async function handler(context: TagoContext, scope: Data[]) {
  // data must come through Device test 1
  context.log("Running Analysis");
  const environment = Utils.envToJson(context.environment);
  if (!environment) {
    return;
  } else if (!environment.config_token) {
    throw "Missing config_token environment var";
  } else if (!environment.account_token) {
    throw "Missing account_token environment var";
  } else if (!environment.email) {
    return context.log("email environment variable not found");
  }

  const account = new Account({ token: environment.account_token });

  const dev_id = scope[0].device;

  const site_dev = await getDevice(account, dev_id);

  const [pdf_email_list] = await site_dev.getData({ variables: "pdf_email_list" });

  if (!pdf_email_list) {
    return console.error("No email");
  }
  const email_list = (pdf_email_list?.value as string).split(";");

  // const table_data = await site_dev.getData({ variables: ["asset_name", "asset_equip_paired", "asset_closest_beacon", "asset_strongest_rssi"], qty: 10 });

  // const dev_register_qty = (await site_dev.getData({ variable: "dev_id", qty: 9999 })).length;

  const logoImageBase64 = await getImageBase64("https://api.tago.io/file/5f2c66d367edac0027103d7d/scripts/Flag_blank.png");

  const options = {
    path: "example.html", //change the path where
    displayHeaderFooter: true,
    headerTemplate: headerTemplate(logoImageBase64),
    footerTemplate,
    format: "A4",
    margin: {
      bottom: 70, // minimum required for footer msg to display
      left: 25,
      right: 35,
      top: 110,
    },
    printBackground: true,
  };
  const base64 = Buffer.from(html).toString("base64");
  const result = await axios.post("https://pdf.tago.io", { base64, options });
  const pdf = result.data.result;

  // Start the email service
  const email = new Services({ token: context.token }).email;

  // Send the email.
  email_list.forEach(async (el) => {
    await email.send({
      to: el,
      subject: "RTLS System - Asset Location History",
      message: "Please find attcahed the RTLS System - Asset Location History ",
      attachment: {
        archive: pdf,
        type: "base64",
        filename: "Asset Location History.pdf",
      } as any,
    });
  });

  return context.log("PDF Generated!");
}

async function startAnalysis(context: TagoContext, scope: any) {
  try {
    await handler(context, scope);
  } catch (error) {
    console.log(error);
    context.log(error.message || JSON.stringify(error));
  }
}

if (!process.env.T_TEST) {
  Analysis.use(startAnalysis, { token: process.env.T_ANALYSIS_TOKEN });
}

export { startAnalysis };
