import { Analysis, Utils, Device, Account, Services } from "@tago-io/sdk";
import axios from "axios";
import dayjs from "dayjs";
import { Data } from "@tago-io/sdk/out/common/common.types";
import { TagoContext } from "./types";
import getDevice from "./lib/getDevice";

async function handler(context: TagoContext, scope: Data[]) {
  //data must come through Device test 1
  console.log(scope);
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

  // const dev_id = scope[0].origin;

  // const site_dev = await getDevice(account, dev_id);

  // const table_data = await site_dev.getData({ variables: ["asset_name", "asset_equip_paired", "asset_closest_beacon", "asset_strongest_rssi"], qty: 10 });

  // const dev_register_qty = (await site_dev.getData({ variable: "dev_id", qty: 9999 })).length;

  const html = `<html>
  <link
    href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;700&display=swap"
    rel="stylesheet"
  />
  <head>
    <style>
      *,
      *::after,
      *::before {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      html {
        scroll-behavior: smooth;
        height: 100%;
        width: 100%;
        -webkit-box-sizing: border-box;
        box-sizing: border-box;
        font-size: 62.5%;
        font-family: "Ubuntu", sans-serif;
      }

      body {
        min-height: 100%;
        margin: 0;
        padding: 0 15px;
        position: relative;
      }

      table {
        border-collapse: collapse;
        margin-top: 40px;
        width: 100%;
        border: 1px solid hsla(0, 0%, 90.2%, 1);
      }

      table caption {
        color: rgba(0, 0, 0, 0.65);
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 15px;
      }

      td {
        border-bottom: 1px solid #ddd;
        padding: 10px;
        font-size: 15px;
      }

      tr:last-of-type td {
        border: none;
      }

      th {
        color: var(--main-color);
        padding: 10px;
        text-align: left;
      }

      hr {
        border-color: var(--main-color);
        margin-bottom: 30px;
      }

      .container {
        height: 98vh;
        background-color: hsl(0deg 0% 98%);
        border-radius: 10px;
      }

      .pdf-header {
        align-items: center;
        padding: 15px 30px;
        /* text-align: center; */
      }

      .header__logo {
        display: inline-block;
        width: 23%;
      }

      .header__logo img {
        width: 100%;
        vertical-align: top;
      }

      .header__info {
        display: inline-block;
        margin-left: 3rem;
        vertical-align: top;
        width: 70%;
        text-align: end;
      }

      .header__info h1 {
        border-radius: 1px;
        display: inline-block;
        margin-top: 1.5rem;
        font-size: 23px;
      }

      .header__info p {
        border-radius: 1px;
      }

      .section__qty {
        padding: 5px 0px;
        display: flex;
        text-align: center;
        margin-top: 5rem;
      }
      .box {
        border: 1px solid hsla(0, 0%, 90.2%, 1);
        padding: 10px;
        display: inline-block;
        height: 120px;
        width: 31%;
        margin: 0 10px;
      }

      .box h1 {
        font-size: 16px;
        width: 200px;
        margin: auto;
      }

      .box h1:last-of-type {
        margin-top: 2rem;
        font-size: 30px;
      }

      .table thead {
        background-color: hsla(0, 0%, 90.2%, 0.6);
        border: 1px solid hsla(0, 0%, 90.2%, 1);
      }
      .center {
        text-align: center;
      }
      .ct-chart {
        height: 100%;
        width: 100%;
        left: 0;
      }

      footer {
        text-align: center;
      }
    </style>
  </head>

  <body>
    <div class="container">
      <header class="pdf-header">
        <div class="header__logo">
          <img src="https://api.tago.io/file/5fc13907cf4e170027440a96/mycompany.png" alt="" />
        </div>
        <div class="header__info">
          <h1>RTLS System - Asset Location History</h1>
          <p>${dayjs().format("YYYY-MM-DD")}</p>
        </div>
      </header>
      <div class="section__qty">
        <div class="box">
          <h1 class="ttl__dev">Total Asset Tracker Device</h1>
          <h1>4</h1>
        </div>
        <div class="box">
          <h1 class="active_dev">Active Asset Tracker Device</h1>
          <h1>3</h1>
        </div>
        <div class="box">
          <h1 class="paired_dev">Total Asset Tracker Paired</h1>
          <h1>2</h1>
        </div>
      </div>
      <table class="table">
        <thead>
          <th>Asset name</th>
          <th>Equipment Paired</th>
          <th>Closest beacon</th>
          <th>RSSI Signal</th>
          <th>Date and Time</th>
        </thead>
        <tbody>
          <tr>
            <td>BLE Tracker 0008</td>
            <td>Red Machine #0123</td>
            <td>Beacon Real 1</td>
            <td>-67</td>
            <td>01/08/2021 09:56:02 am</td>
          </tr>
          <tr>
            <td>BLE Tracker 0008</td>
            <td>Red Machine #0123</td>
            <td>Beacon Real 1</td>
            <td>-67</td>
            <td>01/08/2021 09:56:02 am</td>
          </tr>
          <tr>
            <td>BLE Tracker 0008</td>
            <td>Red Machine #0123</td>
            <td>Beacon Real 1</td>
            <td>-67</td>
            <td>01/08/2021 09:56:02 am</td>
          </tr>
          <tr>
            <td>BLE Tracker 0008</td>
            <td>Red Machine #0123</td>
            <td>Beacon Real 1</td>
            <td>-67</td>
            <td>01/08/2021 09:56:02 am</td>
          </tr>
          <tr>
            <td>BLE Tracker 0008</td>
            <td>Red Machine #0123</td>
            <td>Beacon Real 1</td>
            <td>-67</td>
            <td>01/08/2021 09:56:02 am</td>
          </tr>
          <tr>
            <td>BLE Tracker 0008</td>
            <td>Red Machine #0123</td>
            <td>Beacon Real 1</td>
            <td>-67</td>
            <td>01/08/2021 09:56:02 am</td>
          </tr>
          <tr>
            <td>BLE Tracker 0008</td>
            <td>Red Machine #0123</td>
            <td>Beacon Real 1</td>
            <td>-67</td>
            <td>01/08/2021 09:56:02 am</td>
          </tr>
          <tr>
            <td>BLE Tracker 0008</td>
            <td>Red Machine #0123</td>
            <td>Beacon Real 1</td>
            <td>-67</td>
            <td>01/08/2021 09:56:02 am</td>
          </tr>
          <tr>
            <td>BLE Tracker 0008</td>
            <td>Red Machine #0123</td>
            <td>Beacon Real 1</td>
            <td>-67</td>
            <td>01/08/2021 09:56:02 am</td>
          </tr>
          <tr>
            <td>BLE Tracker 0008</td>
            <td>Red Machine #0123</td>
            <td>Beacon Real 1</td>
            <td>-67</td>
            <td>01/08/2021 09:56:02 am</td>
          </tr>
        </tbody>
      </table>
    </div>
  </body>
  <footer>
    <p>My Company Corporation - Raleigh, NC USA - (555) 555-5555</p>
  </footer>
</html>`;

  const options = {
    displayHeaderFooter: true,
    footerTemplate:
      '<div class="page-footer" style="width:100%; text-align:center; font-size:12px;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    margin: {
      top: "1.5cm",
      right: "1.5cm",
      left: "1.5cm",
      bottom: "1.5cm",
    },
  };

  const base64 = Buffer.from(html).toString("base64");
  const result = await axios.post("https://pdf.tago.io", { base64, options });
  const pdf = result.data.result;

  // Start the email service
  const email = new Services({ token: context.token }).email;

  // Send the email.
  await email.send({
    to: environment.email,
    subject: "RTLS System - Asset Location History",
    message: "Please find attcahed the RTLS System - Asset Location History ",
    attachment: {
      archive: pdf,
      type: "base64",
      filename: "Asset Location History.pdf",
    } as any,
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

export default new Analysis(startAnalysis, { token: "e6074132-f8a8-44f9-ad63-4395cae16e34" });
