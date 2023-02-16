import { getFormVariables } from "../edit";
import scope from "./mocks/edit.mock.json";

// jest test of src/services/site/edit.ts getFormVariables function
describe("getFormVariables", () => {
  test("success", () => {
    const { site_name, site_id, site_address } = getFormVariables(scope as any);
    expect(site_name.value).toBe("johnnyssite");
    expect(site_address.value).toBe("http://johnnyssite.com");
    expect(site_id).toBe("SAF676SAS787");
  });

  test("both values are empty", () => {
    delete scope[0].value;
    delete scope[1].value;
    expect(() => getFormVariables(scope as any)).toThrow("no values to change");
    scope[0].value = "johnnyssite";
    scope[1].value = "http://johnnyssite.com";
  });

  // test("site_name should be empty", () => {
  //   delete scope[0].value;
  //   expect(() => getFormVariables(scope as any)).toThrow("Name field is empty");
  //   scope[0].value = "johnnyssite";
  // });

  test("site_id should be empty", () => {
    delete scope[0].group;
    expect(() => getFormVariables(scope as any)).toThrow("Site id is empty");
    scope[0].group = "SAF676SAS787";
  });

  // test("site_address should be empty", () => {
  //   delete scope[1].value;
  //   expect(() => getFormVariables(scope as any)).toThrow("Address field is empty");
  //   scope[1].value = "http://johnnyssite.com";
  // });
});
