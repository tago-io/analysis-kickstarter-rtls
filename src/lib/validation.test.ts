import { describe, expect, vi } from "vitest";

import { initializeValidation } from "./validation";

// Mock the TagoIO SDK Resources.devices.sendDeviceData function
vi.mock("@tago-io/sdk", () => {
  return {
    Resources: {
      devices: {
        sendDeviceData: vi.fn(async () => { }),
        deleteDeviceData: vi.fn(async () => { }),
      },
    },
  };
});

describe("Validation test", () => {
  test("By color", async () => {
    const validate = initializeValidation("var1", "1234");
    const result = await validate("Test message", "green");
    expect(result).toBe("Test message");
  });

  test("By type", async () => {
    const validate = initializeValidation("var2", "1234");
    const result = await validate("Test message", "success");
    expect(result).toBe("Test message");
  });
});
