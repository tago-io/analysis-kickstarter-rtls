import { getNewDeviceVariables } from "../register";

const scope = [
  {
    variable: "new_dev_name",
    time: "2023-02-27T16:45:10.855Z",
    created_at: "2023-02-27T16:45:10.855Z",
    value: "Device Test",
    id: "63fcde16cdea1f0009a40596",
    group: "1677516310618",
    device: "63f799a619ed1e000905d795",
  },
  {
    variable: "new_dev_type",
    time: "2023-02-27T16:45:10.856Z",
    created_at: "2023-02-27T16:45:10.856Z",
    value: "5f5a8f3351d4db99c40deecf",
    metadata: {
      label: "Tektelic BLE Asset Tracker",
    },
    id: "63fcde16cdea1f0009a40597",
    group: "1677516310618",
    device: "63f799a619ed1e000905d795",
  },
  {
    variable: "new_dev_network",
    time: "2023-02-27T16:45:10.857Z",
    created_at: "2023-02-27T16:45:10.857Z",
    value: "602275f9fc48a40018510a8a",
    metadata: {
      label: "LoRaWAN Helium",
    },
    id: "63fcde16cdea1f0009a40598",
    group: "1677516310618",
    device: "63f799a619ed1e000905d795",
  },
  {
    variable: "new_dev_eui",
    time: "2023-02-27T16:45:10.858Z",
    created_at: "2023-02-27T16:45:10.858Z",
    value: "12312312390",
    id: "63fcde16cdea1f0009a40599",
    group: "1677516310618",
    device: "63f799a619ed1e000905d795",
  },
  {
    variable: "new_dev_site",
    time: "2023-02-27T16:45:10.859Z",
    created_at: "2023-02-27T16:45:10.859Z",
    value: "63f799c2602c4500093527e3",
    metadata: {
      label: "Site Two",
    },
    id: "63fcde16cdea1f0009a4059a",
    group: "1677516310618",
    device: "63f799a619ed1e000905d795",
  },
];

const validate = () => Promise.resolve({});

describe("Check form information", () => {
  test("success", async () => {
    const result = await getNewDeviceVariables(scope as any, validate as any);

    expect(result.new_dev_name?.value).toBe("Device Test");
    expect(result.new_dev_eui?.value).toBe("12312312390");
    expect(result.new_dev_type?.value).toBe("5f5a8f3351d4db99c40deecf");
    expect(result.new_dev_site?.value).toBe("63f799c2602c4500093527e3");
    expect(result.new_dev_network?.value).toBe("602275f9fc48a40018510a8a");
  });

  test("new_dev_name is empty", async () => {
    // @ts-expect-error
    delete scope[0].value;
    await expect(() => getNewDeviceVariables(scope as any, validate as any)).rejects.toThrow("Name field is empty");
    scope[0].value = "test1";
  });

  test("new_dev_eui is empty", async () => {
    // @ts-expect-error
    delete scope[3].value;
    await expect(() => getNewDeviceVariables(scope as any, validate as any)).rejects.toThrow("EUI field is empty");
    scope[3].value = "2B123ER2";
  });

  test("new_dev_type is empty", async () => {
    // @ts-expect-error
    delete scope[1].value;
    await expect(() => getNewDeviceVariables(scope as any, validate as any)).rejects.toThrow("Type field is empty");
    scope[1].value = "Type2";
  });

  test("new_dev_network is empty", async () => {
    // @ts-expect-error
    delete scope[2].value;
    await expect(() => getNewDeviceVariables(scope as any, validate as any)).rejects.toThrow("Network field is empty");
    scope[2].value = "Network2";
  });

  test("new_dev_site is empty", async () => {
    // @ts-expect-error
    delete scope[4].value;
    await expect(() => getNewDeviceVariables(scope as any, validate as any)).rejects.toThrow("Site field is empty");
    scope[4].value = "DevEnv";
  });
});
