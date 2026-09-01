import { createNotification } from "./repositories/notifications.js";

export async function dispatchGearshiftNotification(
  customerId: string,
  eventType: string,
  messageId: string,
  title: string,
  body: string,
): Promise<void> {
  await createNotification(customerId, eventType, title, body, messageId);
}
