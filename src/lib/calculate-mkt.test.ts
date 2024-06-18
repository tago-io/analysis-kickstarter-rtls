import { calculateMKT, calculateMKTByFrequency, calculateMKTwithDHR } from "./calculate-mkt";
import * as mockData from "./calculate.mkt.mock.json";

const fixMockData = mockData.map((x) => ({
  ...x,
  time: new Date(x.time),
  id: "",
  device: "",
}));

describe("Calculate MKT", () => {
  test("MKT Result", () => {
    const result = calculateMKT([19.8, 20.2, 20.6, 21, 21.3, 21.5]);
    expect(result).toBe(20.75);
  });

  test("MKT by Frequency Result", () => {
    const result = calculateMKTByFrequency(fixMockData as any, "America/Sao_Paulo", 3);
    expect(result).toBe(20.8);
  });

  test("MKT with Solid Energy", () => {
    const result = calculateMKTwithDHR([19.8, 20.2, 20.6, 21, 21.3, 21.5]);
    expect(result).toBe(20.75);
  });
  test("MKT with Liquid Energy", () => {
    const result = calculateMKTwithDHR([19.8, 20.2, 20.6, 21, 21.3, 21.5], "liquid");
    expect(result).toBe(20.76);
  });
  test("MKT with Combined Energy", () => {
    const result = calculateMKTwithDHR([19.8, 20.2, 20.6, 21, 21.3, 21.5], "combined");
    expect(result).toBe(20.75);
  });
});
