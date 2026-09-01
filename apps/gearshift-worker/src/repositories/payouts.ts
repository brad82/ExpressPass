import { createUuidV7 } from "@expresspass/shared";
import { query } from "../db.js";

type PayoutItemInput = {
  gearshiftItemId: string;
  consignmentId?: string;
  itemId?: string;
};

type PayoutInput = {
  gearshiftGuid: string;
  paymentId: string;
  method: "check" | "electronic";
  checkNumber?: string;
  paymentReference?: string;
  amountCents: number;
  issuedAt: string;
  items: PayoutItemInput[];
};

// Persists the structured payout breakdown Gearshift already sends (mirroring its own
// tblCheques/tblChequeDetails) instead of discarding it into a notification string.
export async function recordPayout(input: PayoutInput): Promise<void> {
  const result = await query<{ id: string }>(
    `INSERT INTO payouts
     (id, gearshift_guid, payment_id, method, check_number, payment_reference, amount_cents, issued_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (payment_id) DO NOTHING
     RETURNING id`,
    [
      createUuidV7(),
      input.gearshiftGuid,
      input.paymentId,
      input.method,
      input.checkNumber ?? null,
      input.paymentReference ?? null,
      input.amountCents,
      input.issuedAt,
    ],
  );
  const payoutId = result.rows[0]?.id;
  if (!payoutId) {
    // Payment ID already recorded — idempotent no-op (payment_id is unique).
    return;
  }
  for (const item of input.items) {
    await query(
      `INSERT INTO payout_items (id, payout_id, gearshift_item_id, consignment_id, item_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        createUuidV7(),
        payoutId,
        item.gearshiftItemId,
        item.consignmentId ?? null,
        item.itemId ?? null,
      ],
    );
  }
}
