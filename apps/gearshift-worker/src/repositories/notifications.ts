import { createUuidV7 } from "@expresspass/shared";
import { query } from "../db.js";

export async function createNotification(
  customerId: string,
  eventType: string,
  title: string,
  body: string,
  sourceMessageId: string,
): Promise<void> {
  await query(
    `INSERT INTO notifications (id, customer_id, event_type, title, body, source_message_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [createUuidV7(), customerId, eventType, title, body, sourceMessageId],
  );
}
