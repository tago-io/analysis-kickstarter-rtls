import { getFormVariables } from "../edit";
import scope from "../mocks/edit.mock.json";

// jest test of src/services/site/edit.ts getFormVariables function
describe("getFormVariables", () => {
  test("success", () => {
    const { dev_name, dev_id, new_site_id_data } = getFormVariables(scope as any);
    expect(dev_name.value).toBe("SomeDeviceName");
    expect(dev_id).toBe("SAF676SAS787");
    expect(new_site_id_data.value).toBe("SomeSiteIdData");
  });

  test("dev_name is empty", () => {
    delete scope[0].value;
    expect(() => getFormVariables(scope as any)).toThrow("Device name field is empty");
    scope[0].value = "SomeDeviceName";
  });

  test("dev_id is empty", () => {
    delete scope[0].device;
    expect(() => getFormVariables(scope as any)).toThrow("Device id is empty");
    scope[0].device = "SAF676SAS787";
  });

  test("new_site_id_data is empty", () => {
    delete scope[1].value;
    expect(() => getFormVariables(scope as any)).toThrow("Site ID Data field is empty");
    scope[1].value = "SomeSiteIdData";
  });
});
