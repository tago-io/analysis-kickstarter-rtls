import { getUserVariables } from "../edit";
import scope from "./mocks/edit.mock.json";

const validate = () => Promise.resolve({});

// jest test of src/services/user/edit.ts getUserVariables function
describe("getUserVariables", () => {
  test("success", () => {
    const { user_name, user_phone } = getUserVariables(scope, validate as any);
    expect(user_name.value).toBe("jhonny");
    expect(user_phone.value).toBe("998056391");
  });

  test("user_name should be empty", () => {
    delete scope[0].value;
    expect(() => getUserVariables(scope as any, validate as any)).toThrow("Name field is empty");
    scope[0].value = "jhonny";
  });

  test("user_phone should be empty", () => {
    delete scope[1].value;
    expect(() => getUserVariables(scope as any, validate as any)).toThrow("Phone field is empty");
    scope[1].value = "998056391";
  });
});
