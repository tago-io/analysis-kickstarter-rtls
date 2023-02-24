import { getNewSiteVariables } from "../register";
import scope from "./mocks/register.mock.json";

const validate = () => Promise.resolve({});

describe("Check form information", () => {
  test("scope doesn't exists", () => {
    // @ts-expect-error
    expect(() => getNewSiteVariables("test")).toThrow("Scope is missing");
  });

  test("success", async () => {
    const { name: new_site_name, address: new_site_address } = await getNewSiteVariables(scope as any, validate as any);

    expect(new_site_name).toBe("johnnyappleseed");
    expect(new_site_address?.value).toBe("johnnyappleseed.com");
  });

  test("name field is empty", () => {
    delete scope[0].value;
    expect(() => getNewSiteVariables(scope as any, validate as any)).toThrow("Name field is empty");
    scope[0].value = "johnnyappleseed";
  });

  test("address field is empty", () => {
    delete scope[1].value;
    expect(() => getNewSiteVariables(scope as any, validate as any)).toThrow("Address field is empty");
    scope[1].value = "johnnyappleseed.com";
  });
});
