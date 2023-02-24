import { getDeviceVariables } from "../edit";
import scope from "./mocks/edit.mock.json";

const validate = () => Promise.resolve({});

// jest test of src/services/site/edit.ts getDeviceVariables function
describe("getDeviceVariables", () => {
  test("success", async () => {
    const { dev_name, new_site_id_data } = await getDeviceVariables(scope as any, validate as any);
    expect(dev_name).toBe("SomeDeviceName");
    expect(new_site_id_data).toBe("SomeSiteIdData");
  });

  test("dev_name is empty", () => {
    delete scope[0].value;
    expect(() => getDeviceVariables(scope as any, validate as any)).toThrow("Device name field is empty");
    scope[0].value = "SomeDeviceName";
  });

  test("new_site_id_data is empty", () => {
    delete scope[1].value;
    expect(() => getDeviceVariables(scope as any, validate as any)).toThrow("Site ID Data field is empty");
    scope[1].value = "SomeSiteIdData";
  });
});
