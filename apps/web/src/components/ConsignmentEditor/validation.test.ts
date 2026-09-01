import { describe, expect, it } from "vitest";
import type { ConsignmentItem } from "@expresspass/shared";
import { businessBarcodeError } from "./validation";

const baseItem: ConsignmentItem = {
  barcode: "123-4567",
  description: "Rossignol Hero",
  itemType: 1,
  itemSize: "170",
  priceCents: 25000,
  new: false,
  redTag: false,
  qty: 1,
};

describe("businessBarcodeError", () => {
  it("requires business item barcodes", () => {
    expect(businessBarcodeError([{ ...baseItem, barcode: "" }], 0)).toBe(
      "Required",
    );
  });

  it("rejects barcodes that do not match Gearshift format", () => {
    expect(businessBarcodeError([{ ...baseItem, barcode: "1234567" }], 0)).toBe(
      "Use 000-0000",
    );
  });

  it("rejects duplicate barcodes", () => {
    expect(
      businessBarcodeError(
        [
          baseItem,
          { ...baseItem, description: "Salomon QST", barcode: "123-4567" },
        ],
        1,
      ),
    ).toBe("Duplicate");
  });

  it("allows unique valid barcodes", () => {
    expect(
      businessBarcodeError(
        [
          baseItem,
          { ...baseItem, description: "Salomon QST", barcode: "123-4568" },
        ],
        1,
      ),
    ).toBe("");
  });

  it("rejects barcodes outside the submitter's assigned vendor codes", () => {
    expect(businessBarcodeError([baseItem], 0, [203, 204])).toBe(
      "Not one of your vendor codes",
    );
  });

  it("allows barcodes matching any of the submitter's assigned vendor codes", () => {
    expect(businessBarcodeError([baseItem], 0, [123, 204])).toBe("");
  });

  it("skips vendor code ownership checks when none are known yet", () => {
    expect(businessBarcodeError([baseItem], 0, [])).toBe("");
    expect(businessBarcodeError([baseItem], 0, undefined)).toBe("");
  });
});
