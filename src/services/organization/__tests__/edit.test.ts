import { getOrgVariables } from "../edit";

const scope = [
  {
    device: "63fcad0cdbfb0a00092d7472",
    name: "Org Seven",
    "tags.address": "-8.783195,34.508523;Africa",
    old: {
      name: "Org six",
      "tags.address": "56.130366,-106.346771;Canada",
    },
  },
];

const validate = () => Promise.resolve({});

describe("getOrgVariables", () => {
  test("success", async () => {
    const data = await getOrgVariables(scope as any, validate as any);
    expect(data.name).toBe("Org Seven");
    expect(data.address?.value).toBe("Africa");
  });
});
