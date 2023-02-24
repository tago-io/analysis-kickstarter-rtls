import { getOrgVariables } from "../edit";
import scope from "./mocks/edit.mock.json";

const validate = () => Promise.resolve({});

// jest test of src/services/site/edit.ts getOrgVariables function
describe("getOrgVariables", () => {
  test("success", async () => {
    const { name: org_name, address: org_address } = await getOrgVariables(scope as any, validate as any);
    expect(org_name).toBe("Some Org");
    expect(org_address.value).toBe("http://someOrgsWebsite.com");
  });

  test("both values are empty", () => {
    delete scope[0].value;
    delete scope[1].value;
    expect(() => getOrgVariables(scope as any, validate as any)).toThrow("no values to change");
    scope[0].value = "Some Org";
    scope[1].value = "http://someOrgsWebsite.com";
  });

  test("org_id is empty", () => {
    delete scope[0].group;
    expect(() => getOrgVariables(scope as any, validate as any)).toThrow("Organization id is empty");
    scope[0].group = "SAF676SAS787";
  });

  test("org_address is empty", () => {
    delete scope[1].value;
    expect(() => getOrgVariables(scope as any, validate as any)).toThrow("Organization address field is empty");
    scope[1].value = "http://someOrgsWebsite.com";
  });
});
