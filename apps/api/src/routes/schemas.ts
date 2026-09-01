import { z } from "zod";
import {
  consignmentItemSchema,
  uuidV7Schema,
} from "@expresspass/shared";

export const idParamsSchema = z.object({
  id: uuidV7Schema,
});

// `gearshiftItemId` is a Gearshift-owned external id (see gearshift_item_snapshots.id),
// not an Express Pass UUIDv7 — keep it a plain non-empty string.
export const itemHistoryParamsSchema = z.object({
  id: uuidV7Schema,
  gearshiftItemId: z.string().min(1),
});

export const pricingGuideParamsSchema = z.object({
  itemType: z.coerce.number().int().positive(),
});

export const replaceConsignmentItemsBodySchema = z.union([
  consignmentItemSchema.array(),
  z.object({
    items: consignmentItemSchema.array(),
  }),
]);

