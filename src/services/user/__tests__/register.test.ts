import { getNewUserVariables } from "../register";
import scope from "./mocks/register.mock.json";

const validate = () => Promise.resolve({});

describe("check form information", () => {
  test("scope doesn't exists", () => {
    // @ts-expect-error
    expect(() => getNewUserVariables("test")).toThrow("Scope is missing");
  });

  test("success", () => {
    const result = getNewUserVariables(scope as any, validate as any);

    expect(result.new_user_name?.value).toBe("test"); // 0
    expect(result.new_user_email?.value).toBe("test@gmail.com"); //1
    expect(result.new_user_site?.value).toBe("test.com"); //2
    expect(result.new_user_access?.value).toBe("testingenvironment"); //3
    expect(result.new_user_phone?.value).toBe("48990308596"); //4
  });

  test("scope is smaller than 3 character", () => {
    scope[0].value = "te";
    expect(() => getNewUserVariables(scope as any, validate as any )).toThrow("Name field is smaller than 3 character");
    scope[0].value = "test";
  });

  test("name field is empty", () => {
    delete scope[0].value;
    expect(() => getNewUserVariables(scope as any, validate as any )).toThrow("Name field is empty");
    scope[0].value = "test";
  });

  test("email field is empty", () => {
    delete scope[1].value;
    expect(() => getNewUserVariables(scope as any, validate as any )).toThrow("Email field is empty");
    scope[1].value = "test@gmail.com";
  });

  test("department field is empty", () => {
    delete scope[2].value;
    scope[3].value = "user";
    expect(() => getNewUserVariables(scope as any, validate as any )).toThrow("Department field is empty");
    scope[2].value = "test.com";
    scope[3].value = "testingenvironment";
  });

  test("access field is empty", () => {
    delete scope[3].value;
    expect(() => getNewUserVariables(scope as any, validate as any )).toThrow("Access field is empty");
    scope[3].value = "testingenvironment";
  });

  test("phone field is empty", () => {
    delete scope[4].value;
    expect(() => getNewUserVariables(scope as any, validate as )).toThrow("Phone field is empty");
    scope[4].value = "48990308596";
  });
});
