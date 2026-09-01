import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GearshiftMessage } from "@expresspass/shared";
import { dispatchGearshiftMessage } from "./index.js";
import { markConsignmentReceived } from "../repositories/consignments.js";
import {
  getCustomerByConsignmentId,
  getCustomerByGearshiftGuid,
  linkCustomerAccount,
} from "../repositories/customers.js";
import { recordPayout } from "../repositories/payouts.js";
import {
  appendItemNote,
  getItemSnapshotPriceCents,
  upsertItemLink,
  upsertItemSnapshot,
} from "../repositories/snapshots.js";
import { recordItemEvent } from "../repositories/item-events.js";
import { dispatchGearshiftNotification } from "../notification-dispatcher.js";

vi.mock("../repositories/consignments.js", () => ({
  markConsignmentReceived: vi.fn(),
}));

vi.mock("../repositories/customers.js", () => ({
  getCustomerByConsignmentId: vi.fn(),
  getCustomerByGearshiftGuid: vi.fn(),
  linkCustomerAccount: vi.fn(),
}));

vi.mock("../repositories/snapshots.js", () => ({
  appendItemNote: vi.fn(),
  getItemSnapshotPriceCents: vi.fn(),
  upsertItemLink: vi.fn(),
  upsertItemSnapshot: vi.fn(),
}));

vi.mock("../repositories/item-events.js", () => ({
  recordItemEvent: vi.fn(),
}));

vi.mock("../repositories/payouts.js", () => ({
  recordPayout: vi.fn(),
}));

vi.mock("../notification-dispatcher.js", () => ({
  dispatchGearshiftNotification: vi.fn(),
}));

const base = {
  schemaVersion: 1,
  sourceSystem: "gearshift",
  occurredAt: "2026-05-07T10:00:00.000Z",
  publishedAt: "2026-05-07T10:00:01.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getItemSnapshotPriceCents).mockResolvedValue(null);
  vi.mocked(getCustomerByConsignmentId).mockResolvedValue({
    id: "customer-1",
    email: "customer@example.com",
  });
  vi.mocked(getCustomerByGearshiftGuid).mockResolvedValue({
    id: "customer-1",
    email: "customer@example.com",
    gearshiftGuid: "gearshift-vendor-1",
  });
});

describe("Gearshift handlers", () => {
  it("links accounts by Gearshift GUID", async () => {
    await dispatchGearshiftMessage({
      ...base,
      messageId: "m-link",
      type: "remote_account_linked",
      remoteAccountNumber: "A-100",
      email: "customer@example.com",
      gearshiftGuid: "gearshift-vendor-1",
      linkedAt: "2026-05-07T10:00:00.000Z",
    });

    expect(linkCustomerAccount).toHaveBeenCalledWith(
      "customer@example.com",
      "gearshift-vendor-1",
    );
  });

  it("marks consignments received", async () => {
    vi.mocked(markConsignmentReceived).mockResolvedValue("customer-1");

    await dispatchGearshiftMessage({
      ...base,
      messageId: "m-accepted",
      type: "consignment_accepted",
      consignmentId: "0196a5ca-e000-7000-8000-000000000001",
      gearshiftGuid: "gearshift-vendor-1",
      acceptedAt: "2026-05-07T10:00:00.000Z",
    });

    expect(markConsignmentReceived).toHaveBeenCalledWith(
      "0196a5ca-e000-7000-8000-000000000001",
      "2026-05-07T10:00:00.000Z",
      "gearshift-vendor-1",
    );
    expect(dispatchGearshiftNotification).toHaveBeenCalledWith(
      "customer-1",
      "consignment_accepted",
      "m-accepted",
      expect.any(String),
      expect.any(String),
    );
  });

  it.each([
    ["item_checked_in", "item_received"],
    ["item_checked_out", "item_reclaimed"],
    ["item_sold", "item_sold"],
  ] as const)(
    "dispatches notifications and records the item link for %s",
    async (type, notificationType) => {
      const message = {
        ...base,
        messageId: `m-${type}`,
        type,
        consignmentId: "0196a5ca-e000-7000-8000-000000000001",
        itemId: "0196a5ca-e000-7000-8000-000000000002",
        gearshiftItemId: "gearshift-item-1",
        quantity: 1,
        checkedInAt: "2026-05-07T10:00:00.000Z",
        checkedOutAt: "2026-05-07T10:00:00.000Z",
        saleAmountCents: 10000,
        soldAt: "2026-05-07T10:00:00.000Z",
      } as GearshiftMessage;

      await dispatchGearshiftMessage(message);

      expect(dispatchGearshiftNotification).toHaveBeenCalledWith(
        "customer-1",
        notificationType,
        `m-${type}`,
        expect.any(String),
        expect.any(String),
      );
      expect(upsertItemLink).toHaveBeenCalledWith(
        "gearshift-item-1",
        "0196a5ca-e000-7000-8000-000000000001",
        "0196a5ca-e000-7000-8000-000000000002",
        undefined,
      );
      expect(recordItemEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          gearshiftItemId: "gearshift-item-1",
          consignmentId: "0196a5ca-e000-7000-8000-000000000001",
          sourceMessageId: `m-${type}`,
        }),
      );
    },
  );

  it("records a sold history event with the sale amount", async () => {
    await dispatchGearshiftMessage({
      ...base,
      messageId: "m-sold-history",
      type: "item_sold",
      consignmentId: "0196a5ca-e000-7000-8000-000000000001",
      itemId: "0196a5ca-e000-7000-8000-000000000002",
      gearshiftItemId: "gearshift-item-1",
      quantity: 1,
      saleAmountCents: 2000,
      soldAt: "2026-05-07T10:00:00.000Z",
    });

    expect(recordItemEvent).toHaveBeenCalledWith({
      gearshiftItemId: "gearshift-item-1",
      consignmentId: "0196a5ca-e000-7000-8000-000000000001",
      eventType: "sold",
      occurredAt: "2026-05-07T10:00:00.000Z",
      detail: { quantity: 1, amountCents: 2000 },
      sourceMessageId: "m-sold-history",
    });
  });

  it("records a price_updated history event only when the price changed", async () => {
    vi.mocked(getItemSnapshotPriceCents).mockResolvedValue(12000);

    const item = {
      id: "gearshift-item-1",
      consignmentId: "0196a5ca-e000-7000-8000-000000000001",
      description: "Skis",
      itemType: 1,
      itemSize: "170",
      priceCents: 9000,
      qty: 1,
      qtyChecked: 1,
      qtySold: 0,
      reclaimed: false,
      valueSoldCents: null,
      timeSold: null,
      notes: [],
    };

    await dispatchGearshiftMessage({
      ...base,
      messageId: "m-price",
      type: "item_updated",
      gearshiftGuid: "gearshift-vendor-1",
      item,
    });

    expect(recordItemEvent).toHaveBeenCalledWith({
      gearshiftItemId: "gearshift-item-1",
      consignmentId: "0196a5ca-e000-7000-8000-000000000001",
      eventType: "price_updated",
      occurredAt: base.occurredAt,
      detail: { previousPriceCents: 12000, priceCents: 9000 },
      sourceMessageId: "m-price",
    });
  });

  it("does not record a price_updated event when the price is unchanged", async () => {
    vi.mocked(getItemSnapshotPriceCents).mockResolvedValue(9000);

    await dispatchGearshiftMessage({
      ...base,
      messageId: "m-price-same",
      type: "item_updated",
      gearshiftGuid: "gearshift-vendor-1",
      item: {
        id: "gearshift-item-1",
        description: "Skis",
        itemType: 1,
        itemSize: "170",
        priceCents: 9000,
        qty: 1,
        qtyChecked: 1,
        qtySold: 0,
        reclaimed: false,
        valueSoldCents: null,
        timeSold: null,
        notes: [],
      },
    });

    expect(recordItemEvent).not.toHaveBeenCalled();
  });

  it("upserts full item snapshots without a link when the item carries no consignment id", async () => {
    const message: GearshiftMessage = {
      ...base,
      messageId: "m-update",
      type: "item_updated",
      gearshiftGuid: "gearshift-vendor-1",
      item: {
        id: "gearshift-item-1",
        description: "Skis",
        itemType: 1,
        itemSize: "170",
        priceCents: 12000,
        qty: 1,
        qtyChecked: 1,
        qtySold: 0,
        reclaimed: false,
        valueSoldCents: null,
        timeSold: null,
        notes: [],
      },
    };

    await dispatchGearshiftMessage(message);

    expect(upsertItemSnapshot).toHaveBeenCalledWith(
      "gearshift-vendor-1",
      message.item,
    );
    expect(upsertItemLink).not.toHaveBeenCalled();
  });

  it("records an item link when item_updated carries a consignment id", async () => {
    const message: GearshiftMessage = {
      ...base,
      messageId: "m-update-linked",
      type: "item_updated",
      gearshiftGuid: "gearshift-vendor-1",
      item: {
        id: "gearshift-item-2",
        consignmentId: "0196a5ca-e000-7000-8000-000000000001",
        itemId: "0196a5ca-e000-7000-8000-000000000002",
        description: "Boots",
        itemType: 1,
        itemSize: "27",
        priceCents: 8000,
        qty: 1,
        qtyChecked: 0,
        qtySold: 0,
        reclaimed: false,
        valueSoldCents: null,
        timeSold: null,
        notes: [],
      },
    };

    await dispatchGearshiftMessage(message);

    expect(upsertItemLink).toHaveBeenCalledWith(
      "gearshift-item-2",
      "0196a5ca-e000-7000-8000-000000000001",
      "0196a5ca-e000-7000-8000-000000000002",
      "gearshift-vendor-1",
    );
  });

  it("appends item notes", async () => {
    const note = {
      id: "note-1",
      text: "Needs tuning",
      createdAt: "2026-05-07T10:00:00.000Z",
    };

    await dispatchGearshiftMessage({
      ...base,
      messageId: "m-note",
      type: "item_note_added",
      consignmentId: "0196a5ca-e000-7000-8000-000000000001",
      gearshiftItemId: "gearshift-item-1",
      note,
    });

    expect(appendItemNote).toHaveBeenCalledWith("gearshift-item-1", note);
    expect(recordItemEvent).toHaveBeenCalledWith({
      gearshiftItemId: "gearshift-item-1",
      consignmentId: "0196a5ca-e000-7000-8000-000000000001",
      eventType: "note_added",
      occurredAt: "2026-05-07T10:00:00.000Z",
      detail: { note: "Needs tuning", noteType: undefined },
      sourceMessageId: "m-note",
    });
  });

  it("persists a structured payout and notifies for check_issued", async () => {
    const message = {
      ...base,
      messageId: "m-check_issued",
      type: "check_issued",
      gearshiftGuid: "gearshift-vendor-1",
      paymentId: "p1",
      checkNumber: "10001",
      amountCents: 5000,
      issuedAt: base.occurredAt,
      items: [{ gearshiftItemId: "gearshift-item-1" }],
    } satisfies GearshiftMessage;

    await dispatchGearshiftMessage(message);

    expect(recordPayout).toHaveBeenCalledWith({
      gearshiftGuid: "gearshift-vendor-1",
      paymentId: "p1",
      method: "check",
      checkNumber: "10001",
      amountCents: 5000,
      issuedAt: base.occurredAt,
      items: [{ gearshiftItemId: "gearshift-item-1" }],
    });
    expect(dispatchGearshiftNotification).toHaveBeenCalledWith(
      "customer-1",
      "custom",
      message.messageId,
      expect.any(String),
      expect.any(String),
    );
  });

  it("persists a structured payout and notifies for electronic_payment_issued", async () => {
    const message = {
      ...base,
      messageId: "m-electronic_payment_issued",
      type: "electronic_payment_issued",
      gearshiftGuid: "gearshift-vendor-1",
      paymentId: "p2",
      paymentReference: "eft-1",
      amountCents: 5000,
      issuedAt: base.occurredAt,
      items: [{ gearshiftItemId: "gearshift-item-1" }],
    } satisfies GearshiftMessage;

    await dispatchGearshiftMessage(message);

    expect(recordPayout).toHaveBeenCalledWith({
      gearshiftGuid: "gearshift-vendor-1",
      paymentId: "p2",
      method: "electronic",
      paymentReference: "eft-1",
      amountCents: 5000,
      issuedAt: base.occurredAt,
      items: [{ gearshiftItemId: "gearshift-item-1" }],
    });
    expect(dispatchGearshiftNotification).toHaveBeenCalledWith(
      "customer-1",
      "custom",
      message.messageId,
      expect.any(String),
      expect.any(String),
    );
  });
});
