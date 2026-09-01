import { z } from "zod";
import { itemTypeSchema } from "./catalog.js";
import { uuidV7Schema } from "./uuid-v7.js";

export const roleSchema = z.enum(["public", "business"]);
export type CustomerRole = z.infer<typeof roleSchema>;

export const consignmentStatusSchema = z.enum([
  "draft",
  "submitted",
  "received",
  "rejected",
]);
export type ConsignmentStatus = z.infer<typeof consignmentStatusSchema>;

export const barcodeSchema = z
  .string()
  .regex(/^\d{3}-\d{4}$/, "Barcode must use the 000-0000 format");
export const optionalBarcodeSchema = z.preprocess(
  (value) =>
    value === null || (typeof value === "string" && value.trim() === "")
      ? undefined
      : value,
  barcodeSchema.optional(),
);

export const addressSchema = z.object({
  line1: z.string(),
  line2: z.string().optional().default(""),
  city: z.string(),
  province: z.string(),
  postalCode: z.string(),
});

export const profileSchema = z.object({
  address: addressSchema,
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  phone: z.string().optional(),
});

export type CustomerProfile = z.infer<typeof profileSchema>;

// A business consignor can hold more than one Gearshift vendor code (they're warehouse
// sorting buckets, not identity — see barcodeVendorCode below), reused every season, so
// this is a set rather than a single value.
const vendorCodesSchema = z.array(z.number().int().min(100).max(999)).max(20);

export const identityProfileSchema = profileSchema.extend({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  vendorCodes: vendorCodesSchema.optional(),
});

export type IdentityProfile = z.infer<typeof identityProfileSchema>;

export const businessInformationSchema = z.object({
  businessName: z.string().min(1),
  vendorCodes: vendorCodesSchema.optional(),
  gstNumber: z.string().optional(),
});

export type BusinessInformation = z.infer<typeof businessInformationSchema>;

export function validateProfileForRole(
  role: CustomerRole,
  profile: IdentityProfile,
): void {
  const missingProfileFields =
    !profile.firstName ||
    !profile.lastName ||
    !profile.address.line1 ||
    !profile.address.city ||
    !profile.address.province ||
    !profile.address.postalCode;
  if (missingProfileFields) {
    throw new Error("Profile name and mailing address are required");
  }
  if (role === "business" && !profile.businessName) {
    throw new Error("Business accounts require business name");
  }
}

export const notificationPreferencesSchema = z
  .object({
    emailOptIn: z.boolean(),
    smsOptIn: z.boolean(),
    smsPhone: z.string().optional(),
    smsVerified: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.smsOptIn && (!value.smsPhone || !value.smsVerified)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["smsOptIn"],
        message: "SMS notifications require a verified phone number",
      });
    }
  });

export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;

export const consignmentItemSchema = z.object({
  id: uuidV7Schema.optional(),
  barcode: optionalBarcodeSchema,
  description: z.string().min(1),
  itemType: itemTypeSchema.shape.id,
  itemSize: z.string().min(1),
  priceCents: z.number().int().positive(),
  new: z.boolean(),
  redTag: z.boolean(),
  qty: z.number().int().positive(),
});

export type ConsignmentItem = z.infer<typeof consignmentItemSchema>;

// A barcode's vendor code is its 3-digit prefix (e.g. "203-0042" -> 203) — the warehouse
// sorting bucket it belongs to, not a per-item identifier.
export function barcodeVendorCode(barcode: string): number {
  return Number(barcode.slice(0, 3));
}

export function validateBusinessItemBarcodes(
  items: ConsignmentItem[],
  ownedVendorCodes?: number[],
): void {
  const seen = new Set<string>();
  for (const item of items) {
    const barcode = item.barcode?.trim();
    if (!barcode) {
      throw new Error("Business items require a barcode");
    }
    barcodeSchema.parse(barcode);
    if (seen.has(barcode)) {
      throw new Error(`Business item barcodes must be unique: ${barcode}`);
    }
    seen.add(barcode);
    if (
      ownedVendorCodes &&
      ownedVendorCodes.length > 0 &&
      !ownedVendorCodes.includes(barcodeVendorCode(barcode))
    ) {
      throw new Error(
        `Barcode ${barcode} does not belong to one of your assigned vendor codes`,
      );
    }
  }
}

export const consignmentSchema = z.object({
  id: uuidV7Schema,
  status: consignmentStatusSchema,
  submittedAt: z.string().datetime().optional(),
  receivedAt: z.string().datetime().optional(),
  items: z.array(consignmentItemSchema),
});

export type Consignment = z.infer<typeof consignmentSchema>;

export const customerSchema = z.object({
  id: uuidV7Schema,
  oidcSubject: z.string(),
  email: z.string().email(),
  role: roleSchema,
  profile: identityProfileSchema,
  profileLocked: z.boolean(),
  gearshiftGuid: z.string().optional(),
  notificationPreferences: notificationPreferencesSchema,
});

export type Customer = z.infer<typeof customerSchema>;

export const itemNoteSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1),
  createdAt: z.string().datetime(),
  type: z.string().optional(),
});

export type ItemNote = z.infer<typeof itemNoteSchema>;

export const gearshiftItemSnapshotSchema = z.object({
  id: z.string(),
  consignmentId: uuidV7Schema.optional(),
  itemId: uuidV7Schema.optional(),
  barcode: z.string().optional(),
  description: z.string().nullable(),
  itemType: z.number().int().positive(),
  itemTypeName: z.string().optional(),
  itemSize: z.string(),
  priceCents: z.number().int().nonnegative(),
  qty: z.number().int(),
  qtyChecked: z.number().int(),
  // Count of units sold so far (mirrors Gearshift's tblItems.QtySold) — not a boolean,
  // despite sitting next to `reclaimed`.
  qtySold: z.number().int(),
  reclaimed: z.boolean(),
  valueSoldCents: z.number().int().nonnegative().nullable(),
  timeSold: z.string().datetime().nullable(),
  notes: z.array(itemNoteSchema).default([]),
});

export type GearshiftItemSnapshot = z.infer<typeof gearshiftItemSnapshotSchema>;

// Append-only per-item history, written by the Gearshift worker as events arrive and
// read back by `GET /consignments/:id/status/:gearshiftItemId/history` to drive the
// item-history timeline drawer. Unlike the snapshot (current state only), this keeps
// every transition so "Price updated" / "Sold" style entries survive later updates.
export const gearshiftItemEventTypeSchema = z.enum([
  "checked_in",
  "checked_out",
  "sold",
  "price_updated",
  "note_added",
]);

export type GearshiftItemEventType = z.infer<
  typeof gearshiftItemEventTypeSchema
>;

export const gearshiftItemEventDetailSchema = z.object({
  quantity: z.number().int().optional(),
  amountCents: z.number().int().nonnegative().optional(),
  priceCents: z.number().int().nonnegative().optional(),
  previousPriceCents: z.number().int().nonnegative().optional(),
  note: z.string().optional(),
  noteType: z.string().optional(),
});

export type GearshiftItemEventDetail = z.infer<
  typeof gearshiftItemEventDetailSchema
>;

export const gearshiftItemEventSchema = z.object({
  id: uuidV7Schema,
  gearshiftItemId: z.string().min(1),
  eventType: gearshiftItemEventTypeSchema,
  occurredAt: z.string().datetime(),
  detail: gearshiftItemEventDetailSchema.default({}),
});

export type GearshiftItemEvent = z.infer<typeof gearshiftItemEventSchema>;

export const gearshiftEventTypeSchema = z.enum([
  "remote_account_linked",
  "consignment_accepted",
  "item_checked_in",
  "item_checked_out",
  "item_updated",
  "item_sold",
  "item_note_added",
  "check_issued",
  "electronic_payment_issued",
]);

export type GearshiftEventType = z.infer<typeof gearshiftEventTypeSchema>;

const gearshiftEnvelopeFields = {
  messageId: z.string(),
  schemaVersion: z.number().int().positive(),
  sourceSystem: z.string().min(1),
  correlationId: z.string().optional(),
  causationId: z.string().optional(),
  occurredAt: z.string().datetime(),
  publishedAt: z.string().datetime(),
  gearshiftGuid: z.string().optional(),
};

export const remoteAccountLinkedMessageSchema = z.object({
  ...gearshiftEnvelopeFields,
  type: z.literal("remote_account_linked"),
  remoteAccountNumber: z.string().min(1),
  email: z.string().email(),
  gearshiftGuid: z.string().min(1),
  linkedAt: z.string().datetime(),
});

export const consignmentAcceptedMessageSchema = z.object({
  ...gearshiftEnvelopeFields,
  type: z.literal("consignment_accepted"),
  consignmentId: uuidV7Schema,
  gearshiftGuid: z.string().min(1),
  acceptedAt: z.string().datetime(),
});

export const itemCheckedInMessageSchema = z.object({
  ...gearshiftEnvelopeFields,
  type: z.literal("item_checked_in"),
  consignmentId: uuidV7Schema,
  itemId: uuidV7Schema,
  gearshiftItemId: z.string().min(1),
  quantity: z.number().int().positive(),
  checkedInAt: z.string().datetime(),
});

export const itemCheckedOutMessageSchema = z.object({
  ...gearshiftEnvelopeFields,
  type: z.literal("item_checked_out"),
  consignmentId: uuidV7Schema,
  itemId: uuidV7Schema,
  gearshiftItemId: z.string().min(1),
  quantity: z.number().int().positive(),
  checkedOutAt: z.string().datetime(),
});

export const itemUpdatedMessageSchema = z.object({
  ...gearshiftEnvelopeFields,
  type: z.literal("item_updated"),
  item: gearshiftItemSnapshotSchema,
});

export const itemSoldMessageSchema = z.object({
  ...gearshiftEnvelopeFields,
  type: z.literal("item_sold"),
  consignmentId: uuidV7Schema,
  itemId: uuidV7Schema,
  gearshiftItemId: z.string().min(1),
  quantity: z.number().int().positive(),
  saleAmountCents: z.number().int().nonnegative(),
  soldAt: z.string().datetime(),
});

export const itemNoteAddedMessageSchema = z.object({
  ...gearshiftEnvelopeFields,
  type: z.literal("item_note_added"),
  consignmentId: uuidV7Schema.optional(),
  itemId: uuidV7Schema.optional(),
  gearshiftItemId: z.string().min(1),
  note: itemNoteSchema.extend({ id: z.string().min(1) }),
});

const payoutItemSchema = z.object({
  gearshiftItemId: z.string().min(1),
  consignmentId: uuidV7Schema.optional(),
  itemId: uuidV7Schema.optional(),
});

export const checkIssuedMessageSchema = z.object({
  ...gearshiftEnvelopeFields,
  type: z.literal("check_issued"),
  gearshiftGuid: z.string().min(1),
  paymentId: z.string().min(1),
  checkNumber: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  issuedAt: z.string().datetime(),
  items: z.array(payoutItemSchema).default([]),
});

export const electronicPaymentIssuedMessageSchema = z.object({
  ...gearshiftEnvelopeFields,
  type: z.literal("electronic_payment_issued"),
  gearshiftGuid: z.string().min(1),
  paymentId: z.string().min(1),
  paymentReference: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  issuedAt: z.string().datetime(),
  items: z.array(payoutItemSchema).default([]),
});

export const gearshiftMessageSchema = z.discriminatedUnion("type", [
  remoteAccountLinkedMessageSchema,
  consignmentAcceptedMessageSchema,
  itemCheckedInMessageSchema,
  itemCheckedOutMessageSchema,
  itemUpdatedMessageSchema,
  itemSoldMessageSchema,
  itemNoteAddedMessageSchema,
  checkIssuedMessageSchema,
  electronicPaymentIssuedMessageSchema,
]);

export type GearshiftMessage = z.infer<typeof gearshiftMessageSchema>;

export const consignmentExportSchema = z.object({
  consignmentId: uuidV7Schema,
  submittedAt: z.string().datetime(),
  role: roleSchema,
  email: z.string().email(),
  profile: identityProfileSchema,
  gearshiftGuid: z.string().optional(),
  notificationContact: z.object({
    emailOptIn: z.boolean(),
    smsOptIn: z.boolean(),
    smsPhone: z.string().optional(),
  }),
  items: z.array(consignmentItemSchema).min(1),
});

export type ConsignmentExport = z.infer<typeof consignmentExportSchema>;
