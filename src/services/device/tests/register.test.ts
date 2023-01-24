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

    expect(result.new_dev_name?.value).toBe("test1");
    expect(result.new_dev_eui?.value).toBe("2B123ER2");
    expect(result.new_dev_type?.value).toBe("Type2");
    expect(result.new_dev_site?.value).toBe("DevEnv");
  });

  test("new_dev_name is empty", () => {
    delete scope[0].value;
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Name field is empty");
    scope[0].value = "test1";
  });

  test("new_dev_eui is empty", () => {
    delete scope[1].value;
    expect(() => getFormVariables(scope as any, device as any)).toThrow("EUI field is empty");
    scope[1].value = "2B123ER2";
  });

  test("new_dev_type is empty", () => {
    delete scope[2].value;
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Type field is empty");
    scope[2].value = "Type2";
  });

  test("new_dev_site is empty", () => {
    delete scope[3].value;
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Site field is empty");
    scope[3].value = "DevEnv";
  });

  test("new_dev_name is smaller than 3 character", () => {
    scope[0].value = "te";
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Name field is smaller than 3 character.");
    scope[0].value = "test1";
  });
});
