import { getOrgVariables } from "../edit";
import scope from "./mocks/edit.mock.json";

const validate = () => Promise.resolve({});

describe("getOrgVariables", () => {
  test("success", async () => {
    const data = await getOrgVariables(scope as any, validate as any);
    expect(data.name).toBe("Org Seven");
    expect(data.address?.value).toBe("Africa");
  });
});
