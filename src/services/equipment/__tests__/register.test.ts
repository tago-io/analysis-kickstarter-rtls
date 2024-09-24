import { describe, expect, test } from "vitest";

import { getNewEquipVariables } from "../register";
import scope from "./mocks/register.mock.json";

const validate = () => Promise.resolve({});

describe("Check form information", () => {
  test("scope doesn't exists", () => {
    // @ts-expect-error
    expect(async () => await getNewEquipVariables("test", validate as any).toThrow("Scope is missing"));
  });

  test("success", async () => {
    const result = await getNewEquipVariables(scope as any, validate as any);
    expect(result.new_equip_name?.value).toBe("Equipment Test");
    expect(result.new_equip_serie?.value).toBe("2347856934567892");
    expect(result.new_equip_img?.value).toBe("Screenshot from 2023-02-27 13-35-48.png");
    expect(result.new_equip_asset?.value).toBe("Device Test 1");
  });

  test("new_equip_name is empty", async () => {
    // @ts-expect-error
    delete scope[0].value;
    await expect(async () => await getNewEquipVariables(scope as any, validate as any)).rejects.toThrow("Name field is empty");
    scope[0].value = "hammer";
  });

  test("new_equip_serie is empty", async () => {
    // @ts-expect-error
    delete scope[1].value;
    await expect(async () => await getNewEquipVariables(scope as any, validate as any)).rejects.toThrow("Serie field is empty");
    scope[1].value = "1CD23DW2";
  });

  test("new_equip_img is empty", async () => {
    // @ts-expect-error
    delete scope[2].value;
    await expect(async () => await getNewEquipVariables(scope as any, validate as any)).rejects.toThrow("Image field is empty");
    scope[2].value = "imagelink";
  });

  test("new_equip_asset is empty", async () => {
    // @ts-expect-error
    delete scope[3].value;
    await expect(async () => await getNewEquipVariables(scope as any, validate as any)).rejects.toThrow("Asset field is empty");
    scope[3].value = "123123123";
  });
});
