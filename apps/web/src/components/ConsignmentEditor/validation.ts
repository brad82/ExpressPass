import {
  barcodeSchema,
  barcodeVendorCode,
  type ConsignmentItem,
} from "@expresspass/shared";

export function businessBarcodeError(
  items: ConsignmentItem[],
  index: number,
  ownedVendorCodes?: number[],
): string {
  const barcode = items[index]?.barcode?.trim();
  if (!barcode) {
    return "Required";
  }
  if (!barcodeSchema.safeParse(barcode).success) {
    return "Use 000-0000";
  }
  const duplicate = items.some(
    (item, itemIndex) =>
      itemIndex !== index && item.barcode?.trim() === barcode,
  );
  if (duplicate) {
    return "Duplicate";
  }
  if (
    ownedVendorCodes &&
    ownedVendorCodes.length > 0 &&
    !ownedVendorCodes.includes(barcodeVendorCode(barcode))
  ) {
    return "Not one of your vendor codes";
  }
  return "";
}
