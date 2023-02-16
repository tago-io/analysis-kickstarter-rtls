import { getFormVariables } from "../edit";
import scope from "./mocks/edit.mock.json";

const device = {
  sendData: () => Promise.resolve("success"),
};

// jest test of src/services/site/edit.ts getFormVariables function
describe("getFormVariables", () => {
  test("success", () => {
    const { org_name, org_id, org_address } = getFormVariables(scope as any, device as any);
    expect(org_name.value).toBe("Some Org");
    expect(org_id).toBe("SAF676SAS787");
    expect(org_address.value).toBe("http://someOrgsWebsite.com");
  });

  test("both values are empty", () => {
    delete scope[0].value;
    delete scope[1].value;
    expect(() => getFormVariables(scope as any, device as any)).toThrow("no values to change");
    scope[0].value = "Some Org";
    scope[1].value = "http://someOrgsWebsite.com";
  });

  // test("org_id is empty", () => {
  //   delete scope[0].group;
  //   expect(() => getFormVariables(scope as any, device as any)).toThrow("Organization id is empty");
  //   scope[0].group = "SAF676SAS787";
  // });

  // test("org_address is empty", () => {
  //   delete scope[1].value;
  //   expect(() => getFormVariables(scope as any, device as any)).toThrow("Organization address field is empty");
  //   scope[1].value = "http://someOrgsWebsite.com";
  // });
});
