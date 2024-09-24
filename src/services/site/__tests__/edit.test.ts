import { describe, expect, test } from "vitest";

import { getSiteVariables } from "../edit";

const scope = [
  {
    device: "63f799c2602c4500093527e3",
    name: "Site Two",
    "tags.site_address": "56.130366,-106.346771;Canada",
    old: {
      name: "Site one",
      "tags.site_address": "-40.900557,174.885971;New Zealand",
    },
  },
];

const validate = () => Promise.resolve({});

// jest test of src/services/site/edit.ts getSiteVariables function
describe("getSiteVariables", () => {
  test("success", async () => {
    const data = await getSiteVariables(scope as any, validate as any);
    expect(data.name).toBe("Site Two");
    expect(data.address?.value).toBe("Canada");
  });
});
