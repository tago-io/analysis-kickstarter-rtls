import { parseTagoObject } from "../data.logic";
import { obj } from "./mocks/data.logic.mock";

describe("parseTagoObject", () => {
  const result = parseTagoObject(obj, "1588160000000");
  // testing variables
  test("parseTagoObject variables", () => {
    expect(result[0].variable).toBe("name");
    expect(result[1].variable).toBe("user_amount");
    expect(result[2].variable).toBe("active");
    expect(result[3].variable).toBe("device_amount");
    expect(result[4].variable).toBe("location");
  });
  // testing values
  test("parseTagoObject values", () => {
    expect(result[0].value).toBe("stringValuee");
    expect(result[1].value).toBe(2);
    expect(result[2].value).toBe(true);
    expect(result[3].value).toBe(4);
    expect(result[4].value).toBe(5);
  });
  // testing group
  test("parseTagoObject group", () => {
    expect(result[0].group).toBe("1588160000000");
    expect(result[1].group).toBe("1588160000000");
    expect(result[2].group).toBe("1588160000000");
    expect(result[3].group).toBe("1588160000000");
    expect(result[4].group).toBe("1588160000000");
  });
  // testing time
  test("parseTagoObject time", () => {
    expect(result[3].time).toBe("2020-01-01T00:00:00.000Z");
    expect(result[4].time).toBe("2020-01-01T00:00:00.000Z");
  });
  // testing metadata
  test("parseTagoObject metadata", () => {
    expect(result[2].metadata).toEqual({ color: "Green" });
  });

  test("parseTagoObject with empty body", () => {
    expect(() => parseTagoObject({})).toThrow("Nothing to parse");
  });

  test("checking if the serie is being created", () => {
    const serie = Date.now();
    expect(parseTagoObject(obj)[0].group).toEqual(String(serie));
  });
});
