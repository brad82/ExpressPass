import {
  gearshiftItemEventSchema,
  type GearshiftItemEvent,
} from "@expresspass/shared";
import { query } from "../db.js";

// Per-item history feed for the timeline drawer. Scoped through gearshift_item_links
// so a customer only ever sees events for items in a consignment they own.
export async function getItemHistory(
  consignmentId: string,
  gearshiftItemId: string,
): Promise<GearshiftItemEvent[]> {
  const result = await query<Record<string, unknown>>(
    `SELECT e.id, e.gearshift_item_id, e.event_type, e.occurred_at, e.detail
     FROM gearshift_item_events e
     JOIN gearshift_item_links l ON l.gearshift_item_id = e.gearshift_item_id
     WHERE l.consignment_id = $1 AND e.gearshift_item_id = $2
     ORDER BY e.occurred_at, e.created_at`,
    [consignmentId, gearshiftItemId],
  );
  return result.rows.map((row) =>
    gearshiftItemEventSchema.parse({
      id: String(row.id),
      gearshiftItemId: String(row.gearshift_item_id),
      eventType: row.event_type,
      occurredAt: new Date(String(row.occurred_at)).toISOString(),
      detail: row.detail ?? {},
    }),
  );
}
