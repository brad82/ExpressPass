import { query } from "../db.js";

export async function recordIntegrationMessage(
  messageId: string,
  messageType: string,
  payload: unknown,
): Promise<boolean> {
  const result = await query(
    `INSERT INTO integration_messages (message_id, message_type, payload)
     VALUES ($1, $2, $3)
     ON CONFLICT (message_id) DO NOTHING`,
    [messageId, messageType, payload],
  );
  return (result.rowCount ?? 0) > 0;
}
