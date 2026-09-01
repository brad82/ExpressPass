import { query } from "../db.js";

export async function listNotifications(
  customerId: string,
): Promise<unknown[]> {
  const result = await query(
    `SELECT id, event_type AS "eventType", title, body, read_at AS "readAt", created_at AS "createdAt"
     FROM notifications
     WHERE customer_id = $1
     ORDER BY created_at DESC
     LIMIT 100`,
    [customerId],
  );
  return result.rows;
}

export async function markNotificationRead(
  customerId: string,
  notificationId: string,
): Promise<void> {
  await query(
    "UPDATE notifications SET read_at = COALESCE(read_at, now()) WHERE id = $1 AND customer_id = $2",
    [notificationId, customerId],
  );
}
