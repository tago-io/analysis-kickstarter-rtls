/* eslint-disable prettier/prettier */

import { json2csv } from "json-2-csv";

import { Analysis, Resources, Services } from "@tago-io/sdk";
import { Data } from "@tago-io/sdk/lib/types";

import { getZodError } from "../../lib/get-zod-error";
import { initializeValidation } from "../../lib/validation";
import { ServiceParams } from "../../types";
import { registerReportModel } from "./models/report.model";

async function _generateCsv(siteID: string) {
  const sensorData: { [key: string]: string }[] = [];
  const siteInfo = await Resources.devices.info(siteID);

  const siteDataIndoorData = await Resources.devices.getDeviceData(siteID, { variables: "equipment_location", qty: 10 });

  // Check if the site has indoor data, if it doesn't, then it's outdoor data or no data at all.
  if (siteDataIndoorData.length > 0) {
    const siteDataIndoorData = await Resources.devices.getDeviceData(siteID, { variables: "equipment_location", qty: 10 });

    for (const data of siteDataIndoorData) {
      sensorData.push({
        Time: data.time.toISOString(),
        "Equipment Name": String(data.value),
        "Floor Name": String(data.metadata?.floor_name),
        "Room Name": String(data.metadata?.room_name),
        Location: String(data.metadata?.x) + ", " + String(data.metadata?.y),
      });
    }

    const csv = await json2csv(sensorData, { delimiter: { field: "," }, emptyFieldValue: "", preventCsvInjection: true });

    return `"${siteInfo.name.trim()}"\n\n${csv}`;
  } else {
    const siteDataIndoorData = await Resources.devices.getDeviceData(siteID, { variables: "equipment_outside_location", qty: 10 });

    for (const data of siteDataIndoorData) {
      sensorData.push({
        Time: data.time.toISOString(),
        "Equipment Name": String(data.value),
        Location: String(data.location?.coordinates[0]) + ", " + String(data.location?.coordinates[1]),
      });
    }

    const csv = await json2csv(sensorData, { delimiter: { field: "," }, emptyFieldValue: "", preventCsvInjection: true });

    return `"${siteInfo.name.trim()} Location Data"\n\n${csv}`;
  }
}

/**
 * @description Send CSV email to users.
 * @param csv - CSV.
 * @param userID - User ID.
 */
async function _sendCsvEmailToUsers(csv: string, userID: string) {
  const { email } = await Resources.run.userInfo(userID);
  await Services.email
    .send({
      to: email,
      subject: "Kickstarter Generated Site Report",
      message: "Kickstarter Generated Site Report",
      attachment: {
        archive: csv,
        filename: "exported_file.csv",
      },
    })
    .catch((error) => console.log(error));
}

async function getNewReportVariables(scope: Data[], validate: ReturnType<typeof initializeValidation>) {
  const users = scope.find((x) => x.variable === "new_report_user_list")?.value;
  try {
    return registerReportModel.parse({
      users,
    });
  } catch (error) {
    const zodErrorMsg = getZodError(error);
    await validate(zodErrorMsg, "danger");
    throw error;
  }
}

/**
 * @description Generate sensor level report CSV.
 * @param context - TagoIO Context.
 */
async function sensorLevelReportCsv({ scope }: ServiceParams) {
  const siteID = scope[0].device;
  if (!siteID) {
    throw "[Error] No Site ID Found";
  }

  const validate = initializeValidation("site_validation", siteID);

  await validate("Generating Report(s)...", "warning");

  const { users: userIDList } = await getNewReportVariables(scope, validate);

  const csv = await _generateCsv(siteID);

  console.log("CSV", csv);

  for (const userID of userIDList) {
    await _sendCsvEmailToUsers(csv, userID);
  }

  await validate("Report(s) Sent!", "success");
}

export { sensorLevelReportCsv };
