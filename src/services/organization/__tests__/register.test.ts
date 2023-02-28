import { getNewOrgVariables } from "../register";

const scope = [
  {
    variable: "new_org_name",
    value: "johnnyappleseed",
    origin: "2023-01-23T19:59:25.472Z",
    time: "2023-01-23T19:59:25.472Z",
    created_at: "2023-01-23T19:59:25.472Z",
  },
  {
    variable: "new_org_address",
    value: "Florida",
    origin: "2023-01-23T19:59:25.472Z",
    time: "2023-01-23T19:59:25.472Z",
    created_at: "2023-01-23T19:59:25.472Z",
    location: { type: "Point", coordinates: [-81.5157535, 27.6648274] },
  },
];

const validate = () => Promise.resolve({});

describe("Check form information", () => {
  test("success", async () => {
    const data = await getNewOrgVariables(scope as any, validate as any);
    expect(data.name).toBe("johnnyappleseed");
    expect(data.address.value).toBe("Florida");
  });

  test("new_org_name is empty", async () => {
    // @ts-expect-error
    delete scope[0].value;
    await expect(() => getNewOrgVariables(scope as any, validate as any)).rejects.toThrow("Name field is empty");
    scope[0].value = "johnnyappleseed";
  });

  test("new_org_address is empty", async () => {
    // @ts-expect-error
    delete scope[1].value;
    await expect(() => getNewOrgVariables(scope as any, validate as any)).rejects.toThrow("Address field is empty");
    scope[1].value = "Florida";
  });
});
