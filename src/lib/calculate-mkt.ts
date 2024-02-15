import { DateTime } from "luxon";

import { Data } from "@tago-io/sdk/lib/types";

import { getMean } from "./standard-deviation-and-mean";

const kelvin = 273.15;
const mktTypes = {
  solid: 60,
  combined: 80,
  liquid: 100,
};

function roundByFrequency(x: number, uplinkFrequency: number) {
  return Math.ceil(x / uplinkFrequency) * uplinkFrequency;
}

function orderBy(data: Data[], timezone: string, format: string, uplinkFrequency: number = 10) {
  const result = data.reduce(
    (f, i) => {
      const date_f = DateTime.fromJSDate(new Date(i.time), { zone: timezone });
      const minute = date_f.minute;
      const rounded = roundByFrequency(minute, uplinkFrequency) - minute;
      date_f.plus({ minutes: rounded });
      const date_s = date_f.toFormat(format);

      if (!f[date_s]) {
        f[date_s] = [];
      }
      f[date_s][0] = i.value as number;

      return f;
    },
    {} as { [key: string]: number[] }
  );

  return result;
}

function getMKT(separated_by_time: { [key: string]: number[] }) {
  const items = Object.keys(separated_by_time).reduce((final, key) => {
    const averagePlusKelvin = getMean(separated_by_time[key]) + kelvin;
    final.push(Math.exp(-83.144 / (0.008_314_4 * averagePlusKelvin)));
    return final;
  }, [] as number[]);

  const averaged = items.reduce((f, i) => f + i, 0) / items.length;

  return Number((-83.144 / 0.008_314_4 / Math.log(averaged) - kelvin).toFixed(2));
}

/**
 * Calculate Average MKT by frequency of uplink of the sensor.
 * @param {Data[]} dataList list of data of the sensor
 * @param {string} timezone valid timezone string such as America/New_York
 * @param {number} uplinkFrequency uplink frequency of the sensor
 * @returns {number} MKT Value
 */
function calculateMKTByFrequency(dataList: Data[], timezone: string, uplinkFrequency: number): number {
  const orderedData = orderBy(dataList, timezone, "DD/MM/YY HH:mm", Number(uplinkFrequency || 10));
  const mkt = getMKT(orderedData);

  return mkt;
}

/**
 * Calculate MKT of a sensors
 * @param {number[]} numberList list of temperature values
 * @returns {number} MKT Value
 */
function calculateMKT(numberList: number[]): number {
  if (numberList.length === 0) {
    return 0;
  }
  const averagePlusKelvin = numberList.map((x) => x + kelvin);
  const deltas = averagePlusKelvin.map((x) => Math.exp(-83.144_72 / (0.008_314_472 * x)));
  const sum = deltas.reduce((f, i) => f + i, 0);
  const averaged = sum / numberList.length;

  return Number((-83.144 / 0.008_314_4 / Math.log(averaged) - kelvin).toFixed(2));
}

/**
 * Calculate MKT with DHR
 * @param {number[]} numberList list of temperature values
 * @param {string} dh activation energy ratio as solid, combined or liquid
 * @returns {number} MKT Value
 */
function calculateMKTwithDHR(numberList: number[], dh: "solid" | "combined" | "liquid" = "solid"): number {
  if (numberList.length === 0) {
    return 0;
  }
  const dHR = (mktTypes[dh] * 1000) / 8.314_472;

  const deltas = numberList.map((x) => Math.pow(Math.E, dHR / -(x + kelvin)));
  const sum = deltas.reduce((f, i) => f + i, 0);
  const averaged = sum / numberList.length;

  return Number((-dHR / Math.log(averaged) - kelvin).toFixed(2));
}

export { roundByFrequency, calculateMKTByFrequency, calculateMKT, calculateMKTwithDHR };
