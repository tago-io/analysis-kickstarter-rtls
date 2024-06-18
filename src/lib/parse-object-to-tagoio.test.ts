import { parseObjectToTago } from "./parse-object-to-tagoio";

describe("ParseTagoObj test", () => {
  test("default variable", () => {
    const data = parseObjectToTago({
      test1: 1,
      test2: "test",
      test3: true,
      test4: false,
      test5: 0,
    });

    const test1 = data.find((x) => x.variable === "test1");
    const test2 = data.find((x) => x.variable === "test2");
    const test3 = data.find((x) => x.variable === "test3");
    const test4 = data.find((x) => x.variable === "test4");
    const test5 = data.find((x) => x.variable === "test5");
    expect(test1?.value).toBe(1);
    expect(test2?.value).toBe("test");
    expect(test3?.value).toBe(true);
    expect(test4?.value).toBe(false);
    expect(test5?.value).toBe(0);
  });

  test("location variable", () => {
    const data = parseObjectToTago({
      test1: { value: 1, location: { lat: 1, lng: 2 } },
    });

    const test1 = data.find((x) => x.variable === "test1");
    expect(test1?.location).toEqual({ lat: 1, lng: 2 });
  });

  test("same serial", () => {
    const data = parseObjectToTago(
      {
        test1: 1,
        test2: 1,
      },
      "123"
    );

    const test1 = data.find((x) => x.variable === "test1");
    const test2 = data.find((x) => x.variable === "test2");
    expect(test1?.group).toBe(test2?.group);
  });
});
