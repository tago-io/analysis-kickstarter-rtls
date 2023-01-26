import { getFormVariables } from "../register";
import scope from "./mocks/register.mock.json";

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

    expect(result.new_equip_name?.value).toBe("hammer");
    expect(result.new_equip_serie?.value).toBe("1CD23DW2");
    expect(result.new_equip_img?.value).toBe("imagelink");
    expect(result.new_equip_asset?.value).toBe("123123123");
  });

  test("new_equip_name is empty", () => {
    delete scope[0].value;
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Name field is empty");
    scope[0].value = "hammer";
  });

  test("new_equip_serie is empty", () => {
    delete scope[1].value;
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Serie field is empty");
    scope[1].value = "1CD23DW2";
  });

  test("new_equip_img is empty", () => {
    delete scope[2].value;
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Image field is empty");
    scope[2].value = "imagelink";
  });

  test("new_equip_asset is empty", () => {
    delete scope[3].value;
    expect(() => getFormVariables(scope as any, device as any)).toThrow("Asset field is empty");
    scope[3].value = "123123123";
  });
});
