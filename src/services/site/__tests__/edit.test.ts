import { getSiteVariables } from "../edit";
import scope from "./mocks/edit.mock.json";

const validate = () => Promise.resolve({});

// jest test of src/services/site/edit.ts getSiteVariables function
describe("getSiteVariables", () => {
  test("success", async () => {
    const data = await getSiteVariables(scope as any, validate as any);
    expect(data.name).toBe("Site Two");
    expect(data.address?.value).toBe("Canada");
  });
});
