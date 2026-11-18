import { describe, expect, it } from "vitest";
import {
  calculatePercentageChange,
  formatCompactIdr,
  slugifyWalletName,
} from "../src/lib/utils";

describe("formatCompactIdr", () => {
  it("formats millions as juta", () => {
    expect(formatCompactIdr(2_500_000)).toBe("Rp 2.5Jt");
  });

  it("formats thousands as ribu", () => {
    expect(formatCompactIdr(15_000)).toBe("Rp 15Rb");
  });
});

describe("calculatePercentageChange", () => {
  it("returns 100 when the previous value is zero", () => {
    expect(calculatePercentageChange(50, 0)).toBe(100);
  });

  it("computes a rounded percentage change", () => {
    expect(calculatePercentageChange(150, 100)).toBe(50);
  });
});

describe("slugifyWalletName", () => {
  it("normalizes wallet names into slugs", () => {
    expect(slugifyWalletName("  Sea Bank  ")).toBe("sea-bank");
  });
});
