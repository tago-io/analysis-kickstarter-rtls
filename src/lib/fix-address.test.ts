import { convertLocationDataToString, convertLocationParamToObj } from "./fix-address";

const locationData = {
  id: "6377bb08c8673a002788a715",
  time: new Date("2022-11-18T17:04:08.338Z"),
  value: "2500 Warren Carroll Dr, Raleigh, NC 27606, EUA",
  variable: "location_address",
  location: {
    type: "Point" as const,
    coordinates: [-78.670_882_880_687_73, 35.780_158_485_777_314],
  },
  group: "L1668791048246",
  device: "63764f260e43360011be01f5",
};

const locationParam = { key: "param", value: "35.78175301646967,-78.64017068812656;Salisbury St at W Edenton St, Raleigh, NC 27603, USA", sent: true };

describe("Fix Address", () => {
  test("convertLocationDataToString - Success", () => {
    const result = convertLocationDataToString(locationData);
    expect(result).toBe("35.780158485777314,-78.67088288068773;2500 Warren Carroll Dr, Raleigh, NC 27606, EUA");
  });
  test("convertLocationDataToString - Empty String", () => {
    const result = convertLocationDataToString({ ...locationData, location: undefined });
    expect(result).toBe("");
  });
  test("convertLocationDataToString - Undefined Data", () => {
    const result = convertLocationDataToString(undefined as any);
    expect(result).toBe("");
  });
  test("convertLocationParamToObj - Success", () => {
    const result = convertLocationParamToObj(locationParam.value);
    expect(result).toStrictEqual({
      location: { coordinates: [35.781_753_016_469_67, -78.640_170_688_126_56], type: "point" },
      value: "Salisbury St at W Edenton St, Raleigh, NC 27603, USA",
    });
  });
  test("convertLocationParamToObj - Empty Param", () => {
    const result = convertLocationParamToObj("" as any);
    expect(result).toBe(undefined);
  });
  test("convertLocationParamToObj - Undefined Param", () => {
    const result = convertLocationParamToObj(undefined as any);
    expect(result).toBe(undefined);
  });
});
