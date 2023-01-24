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

    expect(result.new_org_name?.value).toBe("johnnyappleseed");
    expect(result.new_org_address?.value).toBe("johnnyappleseed.com");
  });

  test("new_org_name is empty", () => {
    delete scope[0].value;
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Name field is empty");
    scope[0].value = "johnnyappleseed";
  });

  test("new_org_address is empty", () => {
    delete scope[1].value;
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Address field is empty");
    scope[1].value = "johnnyappleseed.com";
  });

  test("new_org_name is smaller than 3 characters", () => {
    scope[0].value = "te";
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Name field is smaller than 3 character");
    scope[0].value = "johnnyappleseed";
  });
});
