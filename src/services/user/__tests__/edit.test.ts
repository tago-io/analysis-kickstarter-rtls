import { describe, expect, test } from "vitest";

import { getUserVariables } from "../edit";
import scope from "./mocks/edit.mock.json";

const validate = () => Promise.resolve({});

// jest test of src/services/user/edit.ts getUserVariables function
describe("getUserVariables", () => {
  test("success", async () => {
    const data = await getUserVariables(scope as any, validate as any);
    expect(data.user_name).toBe("Usernamer");
    expect(data.user_phone).toBe("99999999999");
  });
});
