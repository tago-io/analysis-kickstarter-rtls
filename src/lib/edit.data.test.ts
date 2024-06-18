import { DataResolver } from "./edit.data";

describe("LIB | edit.data Resolver", () => {
  test("Success Resolver", async () => {
    const dataResolver = DataResolver("1234", true);
    // @ts-expect-error we are testing only value and metadata;
    dataResolver.setOldData([{ variable: "test", value: 123, metadata: { label: "test" }, id: "4445" }]);
    dataResolver.setVariable({ variable: "test", value: 444 });
    dataResolver.setVariable({ variable: "test2", value: 5555 });
    const result = await dataResolver.apply();

    expect(result).toStrictEqual({
      toAdd: [{ group: undefined, value: 5555, variable: "test2" }],
      toUpdate: [{ id: "4445", value: 444, variable: "test" }],
    });
  });

  test("Invalid Variable", () => {
    const dataResolver = DataResolver("1234", true);

    // @ts-expect-error we are testing an invalid key
    expect(() => dataResolver.setVariable({})).toThrow();
  });
});
