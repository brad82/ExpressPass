import { query } from "../db.js";

export type PayoutItem = {
  gearshiftItemId: string;
  consignmentId?: string;
  itemId?: string;
};

export type Payout = {
  id: string;
  method: "check" | "electronic";
  checkNumber?: string;
  paymentReference?: string;
  amountCents: number;
  issuedAt: string;
  items: PayoutItem[];
};

export async function listPayouts(gearshiftGuid?: string): Promise<Payout[]> {
  if (!gearshiftGuid) {
    return [];
  }
  const result = await query<Record<string, unknown>>(
    `SELECT p.id, p.method, p.check_number, p.payment_reference, p.amount_cents, p.issued_at,
            COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'gearshiftItemId', pi.gearshift_item_id,
                  'consignmentId', pi.consignment_id,
                  'itemId', pi.item_id
                )
              ) FILTER (WHERE pi.id IS NOT NULL),
              '[]'
            ) AS items
     FROM payouts p
     LEFT JOIN payout_items pi ON pi.payout_id = p.id
     WHERE p.gearshift_guid = $1
     GROUP BY p.id
     ORDER BY p.issued_at DESC`,
    [gearshiftGuid],
  );
  return result.rows.map((row) => ({
    id: String(row.id),
    method: row.method as "check" | "electronic",
    checkNumber: (row.check_number as string | null) ?? undefined,
    paymentReference: (row.payment_reference as string | null) ?? undefined,
    amountCents: Number(row.amount_cents),
    issuedAt: new Date(String(row.issued_at)).toISOString(),
    items: row.items as PayoutItem[],
  }));
}
