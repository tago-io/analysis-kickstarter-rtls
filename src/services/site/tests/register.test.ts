import { getFormVariables } from "../register";
import scope from "../mocks/register.mock.json";

const device = {
  sendData: () => Promise.resolve("success"),
};

describe("Check form information", () => {
  test("scope doesn't exists", () => {
    // @ts-expect-error
    expect(() => getFormVariables("test")).toThrow("Scope is missing");
  });

  test("success", () => {
    const result = getFormVariables(scope as any, device as any);

    expect(result.new_site_name?.value).toBe("johnnyappleseed");
    expect(result.new_site_address?.value).toBe("johnnyappleseed.com");
  });

  test("scope is smaller than 3 character", () => {
    scope[0].value = "te";
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Name field is smaller than 3 character");
    scope[0].value = "test";
  });

  test("address field is empty", () => {
    delete scope[1].value;
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Address field is empty");
    scope[1].value = "johnnyappleseed.com";
  });

  test("address field is smaller than 3 character", () => {
    scope[1].value = "jo";
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Address field is smaller than 3 character");
    scope[1].value = "johnnyappleseed.com";
  });
});
