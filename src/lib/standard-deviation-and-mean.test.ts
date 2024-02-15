import { getMean, getStandardDevitationAndMean } from "./standard-deviation-and-mean";

describe("Calculate Mean", () => {
  test("Get Mean", () => {
    const result = getMean([3, 7, 5, 13, 20, 23, 39, 23, 40, 23, 14, 12, 56, 23, 29]);
    expect(result).toBe(22);
  });

  test("MKT by Frequency Result", () => {
    const result = getStandardDevitationAndMean([3, 7, 5, 13, 20, 23, 39, 23, 40, 23, 14, 12, 56, 23, 29]);
    expect(result).toStrictEqual({ mean: 22, std: 14.506 });
  });
});
