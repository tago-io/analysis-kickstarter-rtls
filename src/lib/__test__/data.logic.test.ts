import { parseTagoObject } from "../data.logic";
import { obj, objResult } from "./mocks/data.logic.mock";

describe("parseTagoObject", () => {
  test("parseTagoObject", () => {
    expect(parseTagoObject(obj, "1588160000000")).toEqual(objResult);
  });

  test("parseTagoObject with empty body", () => {
    expect(() => parseTagoObject({})).toThrow("Nothing to parse");
  });

  test("checking if the serie is being created", () => {
    const serie = new Date().getTime();
    expect(parseTagoObject(obj)[0].group).toEqual(String(serie));
  });
});
