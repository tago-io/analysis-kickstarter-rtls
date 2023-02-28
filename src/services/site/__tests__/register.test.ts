import { getNewSiteVariables } from "../register";

const scope = [
  {
    variable: "new_site_name",
    value: "johnnyappleseed",
    origin: "2023-01-23T19:59:25.472Z",
    time: "2023-01-23T19:59:25.472Z",
    created_at: "2023-01-23T19:59:25.472Z",
  },
  {
    variable: "new_site_address",
    value: "johnnyappleseed.com",
    origin: "2023-01-23T19:59:25.472Z",
    time: "2023-01-23T19:59:25.472Z",
    created_at: "2023-01-23T19:59:25.472Z",
    location: { type: "Point", coordinates: [-81.5157535, 27.6648274] },
  },
];

const validate = () => Promise.resolve({});

describe("Check form information", () => {
  test("success", async () => {
    const { name: new_site_name, address: new_site_address } = await getNewSiteVariables(scope as any, validate as any);

    expect(new_site_name).toBe("johnnyappleseed");
    expect(new_site_address?.value).toBe("johnnyappleseed.com");
  });

  test("name field is empty", async () => {
    // @ts-expect-error
    delete scope[0].value;
    await expect(() => getNewSiteVariables(scope as any, validate as any)).rejects.toThrow("Name field is empty");
    scope[0].value = "johnnyappleseed";
  });

  test("address field is empty", async () => {
    // @ts-expect-error
    delete scope[1].value;
    await expect(() => getNewSiteVariables(scope as any, validate as any)).rejects.toThrow("Address field is empty");
    scope[1].value = "johnnyappleseed.com";
  });
});
