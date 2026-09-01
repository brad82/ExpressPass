import { query } from "../db.js";

export async function markConsignmentReceived(
  consignmentId: string,
  receivedAt: string,
  gearshiftGuid: string,
): Promise<string | null> {
  const result = await query(
    `UPDATE consignments
     SET status = 'received',
         received_at = $1,
         gearshift_guid = $2,
         updated_at = now()
     WHERE id = $3
       AND status = 'submitted'
     RETURNING customer_id`,
    [receivedAt, gearshiftGuid, consignmentId],
  );
  if ((result.rowCount ?? 0) === 0) {
    // Redelivered event, or the consignment is not in `submitted` (already
    // received, still draft, etc.) — nothing to advance.
    console.warn(
      `consignment_accepted ignored: consignment ${consignmentId} is not in submitted state`,
    );
    return null;
  }
  return result.rows[0]?.customer_id ?? null;
}
