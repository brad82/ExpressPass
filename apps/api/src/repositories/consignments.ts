import {
  barcodeSchema,
  consignmentItemSchema,
  consignmentSchema,
  createUuidV7,
  validateBusinessItemBarcodes,
  validateProfileForRole,
  type Consignment,
  type ConsignmentExport,
  type ConsignmentItem,
  type Customer,
} from "@expresspass/shared";
import { query } from "../db.js";
import { lockProfile } from "./customers.js";
import { getActiveSaleId } from "./sales.js";

function mapConsignment(
  row: Record<string, unknown>,
  items: ConsignmentItem[],
): Consignment {
  return consignmentSchema.parse({
    id: row.id,
    status: row.status,
    submittedAt: row.submitted_at
      ? new Date(String(row.submitted_at)).toISOString()
      : undefined,
    receivedAt: row.received_at
      ? new Date(String(row.received_at)).toISOString()
      : undefined,
    items,
  });
}

async function getItems(consignmentId: string): Promise<ConsignmentItem[]> {
  const result = await query(
    `SELECT id, barcode, description, item_type, item_size, price_cents, item_new, red_tag, qty
     FROM consignment_items
     WHERE consignment_id = $1
     ORDER BY created_at, id`,
    [consignmentId],
  );
  return result.rows.map((row) =>
    consignmentItemSchema.parse({
      id: row.id,
      barcode: row.barcode,
      description: row.description,
      itemType: row.item_type,
      itemSize: row.item_size,
      priceCents: row.price_cents,
      new: row.item_new,
      redTag: row.red_tag,
      qty: row.qty,
    }),
  );
}

export async function listConsignments(
  customerId: string,
): Promise<Consignment[]> {
  const result = await query(
    "SELECT * FROM consignments WHERE customer_id = $1 ORDER BY created_at DESC",
    [customerId],
  );
  return Promise.all(
    result.rows.map(async (row) => mapConsignment(row, await getItems(row.id))),
  );
}

export async function getConsignment(
  customerId: string,
  id: string,
): Promise<Consignment | null> {
  const result = await query(
    "SELECT * FROM consignments WHERE customer_id = $1 AND id = $2",
    [customerId, id],
  );
  if (!result.rows[0]) {
    return null;
  }
  return mapConsignment(result.rows[0], await getItems(id));
}

export async function createConsignment(
  customerId: string,
): Promise<Consignment> {
  // A customer may only ever hold one draft at a time; if they already have one,
  // return it rather than creating another (the DB also enforces this via
  // consignments_one_draft_per_customer).
  const existingDraft = await query(
    "SELECT id FROM consignments WHERE customer_id = $1 AND status = 'draft'",
    [customerId],
  );
  const existingDraftId = existingDraft.rows[0]?.id as string | undefined;
  if (existingDraftId) {
    const draft = await getConsignment(customerId, existingDraftId);
    if (draft) {
      return draft;
    }
  }

  const id = createUuidV7();
  const saleId = await getActiveSaleId();
  await query(
    "INSERT INTO consignments (id, customer_id, status, sale_id) VALUES ($1, $2, 'draft', $3)",
    [id, customerId, saleId],
  );
  const consignment = await getConsignment(customerId, id);
  if (!consignment) {
    throw new Error("Unable to create consignment");
  }
  return consignment;
}

async function getConsignmentSaleId(consignmentId: string): Promise<string> {
  const result = await query<{ sale_id: string | null }>(
    "SELECT sale_id FROM consignments WHERE id = $1",
    [consignmentId],
  );
  const saleId = result.rows[0]?.sale_id;
  if (!saleId) {
    throw new Error("Consignment has no associated sale");
  }
  return saleId;
}

export async function replaceConsignmentItems(
  customer: Customer,
  consignmentId: string,
  items: ConsignmentItem[],
): Promise<Consignment> {
  const consignment = await getConsignment(customer.id, consignmentId);
  if (!consignment) {
    throw new Error("Consignment not found");
  }
  if (consignment.status !== "draft") {
    throw new Error("Only draft consignments can be edited");
  }
  const parsed = items.map((item) => consignmentItemSchema.parse(item));
  const normalized = parsed.map((item) => ({
    ...item,
    barcode: customer.role === "business" ? item.barcode?.trim() : undefined,
  }));
  if (customer.role === "business") {
    validateBusinessItemBarcodes(normalized, customer.profile.vendorCodes);
  }
  const saleId = await getConsignmentSaleId(consignmentId);
  await query("DELETE FROM consignment_items WHERE consignment_id = $1", [
    consignmentId,
  ]);
  for (const item of normalized) {
    await query(
      `INSERT INTO consignment_items
       (id, consignment_id, sale_id, barcode, description, item_type, item_size, price_cents, item_new, red_tag, qty)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        createUuidV7(),
        consignmentId,
        saleId,
        item.barcode ?? null,
        item.description,
        item.itemType,
        item.itemSize,
        item.priceCents,
        item.new,
        item.redTag,
        item.qty,
      ],
    );
  }
  return (await getConsignment(customer.id, consignmentId)) ?? consignment;
}

export async function updatePublicConsignmentItemBarcode(
  consignmentId: string,
  itemId: string,
  barcode: string,
): Promise<boolean> {
  const parsedBarcode = barcodeSchema.parse(barcode);
  const result = await query(
    `UPDATE consignment_items AS item
     SET barcode = $1, updated_at = now()
     FROM consignments AS consignment
     JOIN customers AS customer ON customer.id = consignment.customer_id
     WHERE item.consignment_id = consignment.id
       AND consignment.id = $2
       AND item.id = $3
       AND customer.role = 'public'`,
    [parsedBarcode, consignmentId, itemId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function submitConsignment(
  customer: Customer,
  consignmentId: string,
): Promise<ConsignmentExport> {
  const consignment = await getConsignment(customer.id, consignmentId);
  if (!consignment) {
    throw new Error("Consignment not found");
  }
  if (consignment.status !== "draft") {
    throw new Error("Only draft consignments can be submitted");
  }
  if (!customer.profile) {
    throw new Error("Profile is required before submission");
  }
  validateProfileForRole(customer.role, customer.profile);
  if (consignment.items.length === 0) {
    throw new Error("At least one item is required");
  }
  if (customer.role === "business") {
    validateBusinessItemBarcodes(consignment.items, customer.profile.vendorCodes);
  }

  const submittedAt = new Date().toISOString();
  await query(
    `UPDATE consignments
     SET status = 'submitted', submitted_at = $1, gearshift_guid = $2, vendor_id = $3, updated_at = now()
     WHERE id = $4`,
    [
      submittedAt,
      customer.gearshiftGuid ?? null,
      // Informational primary/default code only — a business can hold several (see the
      // `sale_id`-scoped barcode uniqueness and per-item vendor code prefix instead).
      customer.profile.vendorCodes?.[0] ?? null,
      consignmentId,
    ],
  );
  await lockProfile(customer.id);

  return {
    consignmentId,
    submittedAt,
    role: customer.role,
    email: customer.profile.email,
    profile: customer.profile,
    gearshiftGuid: customer.gearshiftGuid,
    notificationContact: {
      emailOptIn: customer.notificationPreferences.emailOptIn,
      smsOptIn: customer.notificationPreferences.smsOptIn,
      smsPhone: customer.notificationPreferences.smsPhone,
    },
    items: consignment.items,
  };
}
