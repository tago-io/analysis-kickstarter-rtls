import { getNewOrgVariables } from "../register";
import scope from "./mocks/register.mock.json";

const validate = () => Promise.resolve({});

describe("Check form information", () => {
  test("scope doesn't exists", () => {
    // @ts-expect-error
    expect(async () => await getNewOrgVariables("test")).toThrow("Scope is missing");
  });

  test("success", async () => {
    const result = await getNewOrgVariables(scope as any, validate as any);

    expect(result.name).toBe("johnnyappleseed");
    expect(result.address?.value).toBe("johnnyappleseed.com");
  });

  test("new_org_name is empty", () => {
    delete scope[0].value;
    expect(async () => await getNewOrgVariables(scope as any, validate as any)).toThrow("Name is required");
    scope[0].value = "johnnyappleseed";
  });

  test("new_org_address is empty", () => {
    delete scope[1].value;
    expect(async () => await getNewOrgVariables(scope as any, validate as any)).toThrow("Address is required");
    scope[1].value = "johnnyappleseed.com";
  });
});
