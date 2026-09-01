import { describe, expect, it } from "vitest";
import {
  barcodeSchema,
  consignmentItemSchema,
  validateBusinessItemBarcodes,
} from "./schemas.js";

const baseItem = {
  description: "Rossignol Hero skis",
  itemType: 1,
  itemSize: "170",
  priceCents: 12000,
  new: false,
  redTag: false,
  qty: 1,
};

describe("item barcodes", () => {
  it("accepts the business barcode format", () => {
    expect(barcodeSchema.parse("123-4567")).toBe("123-4567");
  });

  it("normalizes an empty item barcode to absent", () => {
    expect(
      consignmentItemSchema.parse({ ...baseItem, barcode: "" }).barcode,
    ).toBeUndefined();
  });

  it("normalizes a null item barcode to absent", () => {
    expect(
      consignmentItemSchema.parse({ ...baseItem, barcode: null }).barcode,
    ).toBeUndefined();
  });

  it("requires every business item to have a valid barcode", () => {
    expect(() =>
      validateBusinessItemBarcodes([consignmentItemSchema.parse(baseItem)]),
    ).toThrow("Business items require a barcode");
    expect(() =>
      validateBusinessItemBarcodes([
        consignmentItemSchema.parse({ ...baseItem, barcode: "12-34567" }),
      ]),
    ).toThrow();
  });

  it("rejects duplicate business item barcodes", () => {
    const item = consignmentItemSchema.parse({
      ...baseItem,
      barcode: "123-4567",
    });
    expect(() => validateBusinessItemBarcodes([item, item])).toThrow(
      "Business item barcodes must be unique",
    );
  });
});
