import type { GearshiftMessage } from "@expresspass/shared";
import { markConsignmentReceived } from "../repositories/consignments.js";
import {
  getCustomerByConsignmentId,
  getCustomerByGearshiftGuid,
  linkCustomerAccount,
} from "../repositories/customers.js";
import { recordPayout } from "../repositories/payouts.js";
import { recordItemEvent } from "../repositories/item-events.js";
import {
  appendItemNote,
  getItemSnapshotPriceCents,
  upsertItemLink,
  upsertItemSnapshot,
} from "../repositories/snapshots.js";
import { dispatchGearshiftNotification } from "../notification-dispatcher.js";

type GearshiftHandler<T extends GearshiftMessage["type"]> = (
  message: Extract<GearshiftMessage, { type: T }>,
) => Promise<void>;

type GearshiftHandlers = {
  [Type in GearshiftMessage["type"]]: GearshiftHandler<Type>;
};

export const handlers = {
  remote_account_linked: async (message) => {
    await linkCustomerAccount(message.email, message.gearshiftGuid);
  },
  consignment_accepted: async (message) => {
    const customerId = await markConsignmentReceived(
      message.consignmentId,
      message.acceptedAt,
      message.gearshiftGuid,
    );
    if (customerId) {
      await dispatchGearshiftNotification(
        customerId,
        "consignment_accepted",
        message.messageId,
        "Consignment received",
        `Your consignment ${message.consignmentId} has been received.`,
      );
    }
  },
  item_checked_in: async (message) => {
    await upsertItemLink(
      message.gearshiftItemId,
      message.consignmentId,
      message.itemId,
      message.gearshiftGuid,
    );
    await recordItemEvent({
      gearshiftItemId: message.gearshiftItemId,
      consignmentId: message.consignmentId,
      eventType: "checked_in",
      occurredAt: message.checkedInAt,
      detail: { quantity: message.quantity },
      sourceMessageId: message.messageId,
    });
    const customer = await getCustomerByConsignmentId(message.consignmentId);
    if (customer) {
      await dispatchGearshiftNotification(
        customer.id,
        "item_received",
        message.messageId,
        "Item received",
        `Item ${message.itemId} has been received by sale staff.`,
      );
    }
  },
  item_checked_out: async (message) => {
    await upsertItemLink(
      message.gearshiftItemId,
      message.consignmentId,
      message.itemId,
      message.gearshiftGuid,
    );
    await recordItemEvent({
      gearshiftItemId: message.gearshiftItemId,
      consignmentId: message.consignmentId,
      eventType: "checked_out",
      occurredAt: message.checkedOutAt,
      detail: { quantity: message.quantity },
      sourceMessageId: message.messageId,
    });
    const customer = await getCustomerByConsignmentId(message.consignmentId);
    if (customer) {
      await dispatchGearshiftNotification(
        customer.id,
        "item_reclaimed",
        message.messageId,
        "Item reclaimed",
        `Item ${message.itemId} has been reclaimed.`,
      );
    }
  },
  item_updated: async (message) => {
    if (!message.gearshiftGuid) {
      throw new Error("ItemUpdated requires envelope.gearshiftGuid");
    }
    const previousPriceCents = await getItemSnapshotPriceCents(message.item.id);
    await upsertItemSnapshot(message.gearshiftGuid, message.item);
    if (
      previousPriceCents !== null &&
      previousPriceCents !== message.item.priceCents
    ) {
      await recordItemEvent({
        gearshiftItemId: message.item.id,
        consignmentId: message.item.consignmentId ?? null,
        eventType: "price_updated",
        occurredAt: message.occurredAt,
        detail: {
          previousPriceCents,
          priceCents: message.item.priceCents,
        },
        sourceMessageId: message.messageId,
      });
    }
    if (message.item.consignmentId) {
      await upsertItemLink(
        message.item.id,
        message.item.consignmentId,
        message.item.itemId ?? null,
        message.gearshiftGuid,
      );
    }
  },
  item_sold: async (message) => {
    await upsertItemLink(
      message.gearshiftItemId,
      message.consignmentId,
      message.itemId,
      message.gearshiftGuid,
    );
    await recordItemEvent({
      gearshiftItemId: message.gearshiftItemId,
      consignmentId: message.consignmentId,
      eventType: "sold",
      occurredAt: message.soldAt,
      detail: {
        quantity: message.quantity,
        amountCents: message.saleAmountCents,
      },
      sourceMessageId: message.messageId,
    });
    const customer = await getCustomerByConsignmentId(message.consignmentId);
    if (customer) {
      await dispatchGearshiftNotification(
        customer.id,
        "item_sold",
        message.messageId,
        "Item sold",
        `Item ${message.itemId} sold for ${message.saleAmountCents} cents.`,
      );
    }
  },
  item_note_added: async (message) => {
    await appendItemNote(message.gearshiftItemId, message.note);
    await recordItemEvent({
      gearshiftItemId: message.gearshiftItemId,
      consignmentId: message.consignmentId ?? null,
      eventType: "note_added",
      occurredAt: message.note.createdAt,
      detail: {
        note: message.note.text,
        noteType: message.note.type,
      },
      sourceMessageId: message.messageId,
    });
    if (message.consignmentId) {
      await upsertItemLink(
        message.gearshiftItemId,
        message.consignmentId,
        message.itemId ?? null,
        message.gearshiftGuid,
      );
    }
  },
  check_issued: async (message) => {
    await recordPayout({
      gearshiftGuid: message.gearshiftGuid,
      paymentId: message.paymentId,
      method: "check",
      checkNumber: message.checkNumber,
      amountCents: message.amountCents,
      issuedAt: message.issuedAt,
      items: message.items,
    });
    const customer = await getCustomerByGearshiftGuid(message.gearshiftGuid);
    if (customer) {
      await dispatchGearshiftNotification(
        customer.id,
        "custom",
        message.messageId,
        "Check issued",
        `Check ${message.checkNumber} was issued for ${message.amountCents} cents.`,
      );
    }
  },
  electronic_payment_issued: async (message) => {
    await recordPayout({
      gearshiftGuid: message.gearshiftGuid,
      paymentId: message.paymentId,
      method: "electronic",
      paymentReference: message.paymentReference,
      amountCents: message.amountCents,
      issuedAt: message.issuedAt,
      items: message.items,
    });
    const customer = await getCustomerByGearshiftGuid(message.gearshiftGuid);
    if (customer) {
      await dispatchGearshiftNotification(
        customer.id,
        "custom",
        message.messageId,
        "Electronic payment issued",
        `Electronic payment ${message.paymentReference} was issued for ${message.amountCents} cents.`,
      );
    }
  },
} satisfies GearshiftHandlers;

export async function dispatchGearshiftMessage(
  message: GearshiftMessage,
): Promise<void> {
  const handler = handlers[message.type] as (
    message: GearshiftMessage,
  ) => Promise<void>;
  await handler(message);
}
