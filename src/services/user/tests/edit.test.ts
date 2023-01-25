import { getFormVariables } from "../edit";
import scope from "../mocks/edit.mock.json";

// jest test of src/services/user/edit.ts getFormVariables function
describe("getFormVariables", () => {
  test("success", () => {
    const { user_name, user_phone, user_id } = getFormVariables(scope as any);
    expect(user_name.value).toBe("jhonny");
    expect(user_phone.value).toBe("998056391");
    expect(user_id).toBe("1231312312");
  });

  test("user_name should be empty", () => {
    delete scope[0].value;
    expect(() => getFormVariables(scope as any)).toThrow("Name field is empty");
    scope[0].value = "jhonny";
  });

  test("user_phone should be empty", () => {
    delete scope[1].value;
    expect(() => getFormVariables(scope as any)).toThrow("Phone field is empty");
    scope[1].value = "998056391";
  });

  test("user_id should be empty", () => {
    delete scope[0].group;
    expect(() => getFormVariables(scope as any)).toThrow("User id is empty");
    scope[0].group = "1231312312";
  });
});
