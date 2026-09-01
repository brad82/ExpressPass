import { describe, expect, it } from "vitest";
import { consignmentStatusSchema } from "./schemas.js";

describe("consignmentStatusSchema", () => {
  it("accepts the four lifecycle states", () => {
    for (const status of ["draft", "submitted", "received", "rejected"]) {
      expect(consignmentStatusSchema.parse(status)).toBe(status);
    }
  });

  it("rejects the retired pending/accepted states", () => {
    expect(consignmentStatusSchema.safeParse("pending").success).toBe(false);
    expect(consignmentStatusSchema.safeParse("accepted").success).toBe(false);
  });
});
