import { describe, expect, it } from "vitest";
import { isValidIndianMobile, validateIndianMobile } from "./mobileNumber";

describe("validateIndianMobile", () => {
  it("accepts a real Indian mobile", () => {
    expect(validateIndianMobile("9876543211")).toEqual({ ok: true, phone: "9876543211" });
    expect(isValidIndianMobile("+91 79853 52422")).toBe(true);
  });

  it("rejects short or non-Indian prefixes", () => {
    expect(validateIndianMobile("98765").ok).toBe(false);
    expect(validateIndianMobile("5123456789").ok).toBe(false);
    const leadingZero = validateIndianMobile("0123456789");
    expect(leadingZero.ok).toBe(false);
    if (!leadingZero.ok) expect(leadingZero.error).toMatch(/starting with 6/);
  });

  it("rejects dummy / repeated numbers", () => {
    const allNines = validateIndianMobile("9999999999");
    expect(allNines.ok).toBe(false);
    if (!allNines.ok) expect(allNines.error).toMatch(/real mobile/);

    const sequential = validateIndianMobile("9876543210");
    expect(sequential.ok).toBe(false);
    if (!sequential.ok) expect(sequential.error).toMatch(/real mobile/);
  });
});
