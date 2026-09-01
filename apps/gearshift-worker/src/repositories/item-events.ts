import {
  createUuidV7,
  type GearshiftItemEventDetail,
  type GearshiftItemEventType,
} from "@expresspass/shared";
import { query } from "../db.js";

type RecordItemEventInput = {
  gearshiftItemId: string;
  consignmentId?: string | null;
  eventType: GearshiftItemEventType;
  occurredAt: string;
  detail?: GearshiftItemEventDetail;
  sourceMessageId: string;
};

// Append one row to the per-item history feed. Idempotent on (source_message_id,
// event_type): a redelivered message never doubles up a timeline entry.
export async function recordItemEvent(
  input: RecordItemEventInput,
): Promise<void> {
  await query(
    `INSERT INTO gearshift_item_events
       (id, gearshift_item_id, consignment_id, event_type, occurred_at, detail, source_message_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (source_message_id, event_type) DO NOTHING`,
    [
      createUuidV7(),
      input.gearshiftItemId,
      input.consignmentId ?? null,
      input.eventType,
      input.occurredAt,
      JSON.stringify(input.detail ?? {}),
      input.sourceMessageId,
    ],
  );
}
