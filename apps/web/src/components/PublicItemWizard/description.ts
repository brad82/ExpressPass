import type { ItemType } from "@expresspass/shared";

export type DescriptionFields = {
  brand: string;
  model: string;
  size: string;
  condition: string;
  details: string;
};

export const defaultDescriptionFields: DescriptionFields = {
  brand: "",
  model: "",
  size: "",
  condition: "",
  details: "",
};

export function hasRequiredDescriptionFields(fields: DescriptionFields) {
  return (
    fields.brand.trim() !== "" &&
    fields.model.trim() !== "" &&
    fields.size.trim() !== ""
  );
}

export function buildDescription(
  fields: DescriptionFields,
  itemType?: ItemType,
) {
  return [
    fields.brand,
    fields.model,
    itemType?.description ?? "",
    fields.condition,
    fields.details,
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" - ");
}
