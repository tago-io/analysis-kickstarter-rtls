import { getFormVariables } from "../register";
import scope from "../mocks/register.mock.json";

const device = {
  sendData: () => Promise.resolve("success"),
};

describe("check form information", () => {
  test("scope doesn't exists", () => {
    // @ts-expect-error
    expect(() => getFormVariables("test")).toThrow("Scope is missing");
  });

  test("success", () => {
    const result = getFormVariables(scope as any, device as any);

    expect(result.new_user_name?.value).toBe("test"); // 0
    expect(result.new_user_email?.value).toBe("test@gmail.com"); //1
    expect(result.new_user_site?.value).toBe("test.com"); //2
    expect(result.new_user_access?.value).toBe("testingenvironment"); //3
    expect(result.new_user_phone?.value).toBe("48990308596"); //4
  });

  test("scope is smaller than 3 character", () => {
    scope[0].value = "te";
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Name field is smaller than 3 character");
    scope[0].value = "test";
  });

  test("email field is empty", () => {
    delete scope[1].value;
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Email field is empty");
    scope[1].value = "test@gmail.com";
  });

  test("department field is empty", () => {
    delete scope[2].value;
    scope[3].value = "user";
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Department field is empty");
    scope[2].value = "test.com";
    scope[3].value = "testingenvironment";
  });

  test("access field is empty", () => {
    delete scope[3].value;
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Access field is empty");
    scope[3].value = "testingenvironment";
  });

  test("phone field is empty", () => {
    delete scope[4].value;
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Phone field is empty");
    scope[4].value = "48990308596";
  });
});
