import { getSiteVariables } from "../edit";
import scope from "./mocks/edit.mock.json";

const validate = () => Promise.resolve({});

// jest test of src/services/site/edit.ts getSiteVariables function
describe("getSiteVariables", () => {
  test("success", async () => {
    const { name: site_name, address: site_address } = await getSiteVariables(scope as any, validate as any);
    expect(site_name).toBe("johnnyssite");
    expect(site_address.value).toBe("http://johnnyssite.com");
  });

  test("site_name should be empty", () => {
    delete scope[0].value;
    expect(() => getSiteVariables(scope as any, validate as any)).toThrow("Name field is empty");
    scope[0].value = "johnnyssite";
  });

  test("site_id should be empty", () => {
    delete scope[0].group;
    expect(() => getSiteVariables(scope as any, validate as any)).toThrow("Site id is empty");
    scope[0].group = "SAF676SAS787";
  });

  test("site_address should be empty", () => {
    delete scope[1].value;
    expect(() => getSiteVariables(scope as any, validate as any)).toThrow("Address field is empty");
    scope[1].value = "http://johnnyssite.com";
  });
});
