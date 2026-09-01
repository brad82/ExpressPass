import { z } from "zod";

export const notificationEventTypeSchema = z.enum([
  "consignment_accepted",
  "item_received",
  "item_sold",
  "item_reclaimed",
  "custom",
]);

export type NotificationEventType = z.infer<typeof notificationEventTypeSchema>;

export const notificationChannelSchema = z.enum(["in_app", "email", "sms"]);
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;

export const notificationTemplateSchema = z.object({
  eventType: notificationEventTypeSchema,
  title: z.string().min(1),
  body: z.string().min(1),
  emailSubject: z.string().min(1).optional(),
  smsBody: z.string().min(1).optional(),
});

export type NotificationTemplate = z.infer<typeof notificationTemplateSchema>;

export const notificationTemplates: Record<
  NotificationEventType,
  NotificationTemplate
> = {
  consignment_accepted: {
    eventType: "consignment_accepted",
    title: "Consignment accepted",
    body: "Your consignment {{consignmentId}} has been accepted. Bring the barcode email when you check in.",
    emailSubject: "Your consignment {{consignmentId}} is ready for check-in",
    smsBody:
      "Your consignment {{consignmentId}} has been accepted. Check your email for the barcode.",
  },
  item_received: {
    eventType: "item_received",
    title: "Item received",
    body: "{{itemDescription}} has been received by sale staff.",
    emailSubject: "Item received: {{itemDescription}}",
    smsBody: "{{itemDescription}} has been received.",
  },
  item_sold: {
    eventType: "item_sold",
    title: "Item sold",
    body: "{{itemDescription}} sold for {{itemPrice}}.",
    emailSubject: "Item sold: {{itemDescription}}",
    smsBody: "{{itemDescription}} sold for {{itemPrice}}.",
  },
  item_reclaimed: {
    eventType: "item_reclaimed",
    title: "Item reclaimed",
    body: "{{itemDescription}} has been marked as reclaimed.",
    emailSubject: "Item reclaimed: {{itemDescription}}",
    smsBody: "{{itemDescription}} has been reclaimed.",
  },
  custom: {
    eventType: "custom",
    title: "{{title}}",
    body: "{{message}}",
    emailSubject: "{{title}}",
    smsBody: "{{message}}",
  },
};

export function renderTemplate(
  template: string,
  variables: Record<string, unknown>,
): string {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? "" : String(value);
  });
}
