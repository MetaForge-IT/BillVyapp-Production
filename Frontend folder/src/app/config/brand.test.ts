import { describe, expect, it } from "vitest";
import { BRAND } from "./brand";

describe("brand config", () => {
  it("exposes app name", () => {
    expect(BRAND.appName.length).toBeGreaterThan(0);
  });
});
