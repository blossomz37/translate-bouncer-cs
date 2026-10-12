import { describe, expect, it } from "vitest";
import type { Model } from "../types/api";
import { docChars, estimateCost, formatEstimate } from "./costEstimate";

const paid: Model = {
  id: "x/y",
  pricing: { prompt: "0.000003", completion: "0.000015" }, // $3 / $15 per M
};
const free: Model = { id: "x/f", pricing: { prompt: "0", completion: "0" } };
const noprice: Model = { id: "x/n" };

describe("costEstimate", () => {
  it("docChars sums paragraph text", () => {
    expect(docChars(null)).toBe(0);
    expect(docChars({ paragraphs: [{ style: "normal", text: "Hi" }] })).toBe(3);
  });

  it("estimateCost scales with chars, prices, and calls", () => {
    // 4000 chars ≈ 1000 tokens × ($3+$15)/M × 1 call = $0.018
    expect(estimateCost(4000, paid, 1)).toBeCloseTo(0.018, 6);
    expect(estimateCost(4000, paid, 3)).toBeCloseTo(0.054, 6);
  });

  it("estimateCost returns null or zero for missing data", () => {
    expect(estimateCost(4000, undefined, 1)).toBeNull();
    expect(estimateCost(4000, noprice, 1)).toBeNull();
    expect(estimateCost(0, paid, 1)).toBeNull();
    expect(estimateCost(4000, paid, 0)).toBeNull();
    expect(estimateCost(4000, free, 2)).toBe(0);
  });

  it("formatEstimate renders friendly labels", () => {
    expect(formatEstimate(null)).toBeNull();
    expect(formatEstimate(0)).toBe("free");
    expect(formatEstimate(0.004)).toBe("<$0.01");
    expect(formatEstimate(0.427)).toBe("$0.43");
  });
});
