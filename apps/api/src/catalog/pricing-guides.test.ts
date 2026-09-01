import { describe, expect, it } from "vitest";
import { pricingGuideForItemType } from "./pricing-guides.js";

describe("pricingGuideForItemType", () => {
  it("reads item-specific Markdown guides from disk", async () => {
    const guide = await pricingGuideForItemType(1);

    expect(guide).toEqual({
      itemType: 1,
      markdown: expect.stringContaining("# Alpine Skis Pricing Guide"),
    });
  });

  it("falls back to the default Markdown guide", async () => {
    const guide = await pricingGuideForItemType(999);

    expect(guide).toEqual({
      itemType: 999,
      markdown: expect.stringContaining("# Pricing Guide"),
    });
  });
});
