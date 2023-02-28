import { getNewUserVariables } from "../register";
import scope from "./mocks/register.mock.json";

const validate = () => Promise.resolve({});

describe("check form information", () => {
  test("success", async () => {
    const result = await getNewUserVariables(scope as any, validate as any);

    expect(result.new_user_name?.value).toBe("username"); // 0
    expect(result.new_user_email?.value).toBe("user@email.com"); //1
    expect(result.new_user_site?.value).toBe("63f7ea5954083c0009096414"); //2
    expect(result.new_user_access?.value).toBe("user"); //3
    expect(result.new_user_phone?.value).toBe("78978978789"); //4
  });

  test("name field is empty", async () => {
    // @ts-expect-error
    delete scope[0].value;
    await expect(() => getNewUserVariables(scope as any, validate as any)).rejects.toThrow("Name field is empty");
    scope[0].value = "test";
  });

  test("email field is empty", async () => {
    // @ts-expect-error
    delete scope[1].value;
    await expect(() => getNewUserVariables(scope as any, validate as any)).rejects.toThrow("Email field is empty");
    scope[1].value = "test@gmail.com";
  });

  test("Site field is empty", async () => {
    // @ts-expect-error
    delete scope[4].value;
    await expect(() => getNewUserVariables(scope as any, validate as any)).rejects.toThrow("Site field is empty");
    scope[4].value = "63f7ea5954083c0009096414";
  });

  test("access field is empty", async () => {
    // @ts-expect-error
    delete scope[3].value;
    await expect(() => getNewUserVariables(scope as any, validate as any)).rejects.toThrow("Access field is empty");
    scope[3].value = "testingenvironment";
  });

  test("phone field is empty", async () => {
    // @ts-expect-error
    delete scope[2].value;
    await expect(() => getNewUserVariables(scope as any, validate as any)).rejects.toThrow("Phone field is empty");
    scope[2].value = "48990308596";
  });
});
