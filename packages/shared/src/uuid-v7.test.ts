import { describe, expect, it } from "vitest";
import { consignmentReferenceCode, createUuidV7, isUuidV7 } from "./uuid-v7.js";

describe("createUuidV7", () => {
  it("creates UUIDv7 ids", () => {
    const id = createUuidV7(new Date("2026-05-07T00:00:00.000Z"));
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(isUuidV7(id)).toBe(true);
  });

  it("embeds the timestamp in the UUID prefix", () => {
    const id = createUuidV7(new Date("2026-05-07T00:00:00.000Z"));
    expect(id.startsWith("019dffbb-f000-")).toBe(true);
  });
});

describe("consignmentReferenceCode", () => {
  it("returns the last 12 hex characters, uppercased and unpunctuated", () => {
    expect(
      consignmentReferenceCode("019dffbb-f000-7abc-89de-0123456789ab"),
    ).toBe("0123456789AB");
  });

  it("is derived from a real UUIDv7's random tail", () => {
    const id = createUuidV7(new Date("2026-05-07T00:00:00.000Z"));
    const code = consignmentReferenceCode(id);
    expect(code).toMatch(/^[0-9A-F]{12}$/);
    expect(id.toUpperCase().endsWith(code)).toBe(true);
  });
});
