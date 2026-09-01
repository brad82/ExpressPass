import {
  gearshiftItemSnapshotSchema,
  type GearshiftItemSnapshot,
} from "@expresspass/shared";
import { query } from "../db.js";

export async function getConsignmentStatus(
  consignmentId: string,
): Promise<GearshiftItemSnapshot[]> {
  const result = await query(
    `SELECT s.payload
     FROM gearshift_item_snapshots s
     JOIN gearshift_item_links l ON l.gearshift_item_id = s.id
     WHERE l.consignment_id = $1
     ORDER BY s.description NULLS LAST, s.id`,
    [consignmentId],
  );
  // Normalize through the shared schema so partial payloads (e.g. a missing
  // `notes` array) come back complete rather than crashing the client.
  return result.rows.map((row) =>
    gearshiftItemSnapshotSchema.parse(row.payload),
  );
}
