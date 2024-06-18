import { getDeviceVariables } from "../edit";

const scope = [
  {
    device: "63f799df602c450009352a37",
    name: "Device Three",
    "tags.site_id": "63f7ea5954083c0009096414",
    old: {
      name: "Device two",
      "tags.site_id": "63f799c2602c4500093527e3",
    },
  },
];

const validate = () => Promise.resolve({});

// jest test of src/services/site/edit.ts getDeviceVariables function
describe("getDeviceVariables", () => {
  test("success", async () => {
    const { dev_name, new_site_id_data } = await getDeviceVariables(scope as any, validate as any);
    expect(dev_name).toBe("Device Three");
    expect(new_site_id_data).toBe("63f7ea5954083c0009096414");
  });
});
