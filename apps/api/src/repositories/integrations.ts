import { createHash } from "node:crypto";
import { createUuidV7 } from "@expresspass/shared";
import { query } from "../db.js";

export function checksumPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

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

export async function recordOutboxExport(
  consignmentId: string,
  s3Key: string,
  checksum: string,
): Promise<void> {
  await query(
    `INSERT INTO outbox_exports (id, consignment_id, s3_key, checksum)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (s3_key) DO UPDATE SET checksum = EXCLUDED.checksum, status = 'written'`,
    [createUuidV7(), consignmentId, s3Key, checksum],
  );
}
