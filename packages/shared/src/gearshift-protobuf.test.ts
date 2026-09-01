import { describe, expect, it } from "vitest";
import {
  decodeGearshiftMessage,
  encodeGearshiftMessage,
  gearshiftRoutingKeys,
  type GearshiftMessage,
} from "./index.js";

const base = {
  schemaVersion: 1,
  sourceSystem: "gearshift",
  occurredAt: "2026-05-07T10:00:00.000Z",
  publishedAt: "2026-05-07T10:00:01.000Z",
};

const messages: GearshiftMessage[] = [
  {
    ...base,
    messageId: "m-remote",
    type: "remote_account_linked",
    remoteAccountNumber: "A-100",
    email: "customer@example.com",
    gearshiftGuid: "gearshift-vendor-1",
    linkedAt: "2026-05-07T10:00:00.000Z",
  },
  {
    ...base,
    messageId: "m-consignment",
    type: "consignment_accepted",
    consignmentId: "0196a5ca-e000-7000-8000-000000000001",
    gearshiftGuid: "gearshift-vendor-1",
    acceptedAt: "2026-05-07T10:00:00.000Z",
  },
  {
    ...base,
    messageId: "m-in",
    type: "item_checked_in",
    consignmentId: "0196a5ca-e000-7000-8000-000000000001",
    itemId: "0196a5ca-e000-7000-8000-000000000002",
    gearshiftItemId: "gearshift-item-1",
    quantity: 1,
    checkedInAt: "2026-05-07T10:00:00.000Z",
  },
  {
    ...base,
    messageId: "m-out",
    type: "item_checked_out",
    consignmentId: "0196a5ca-e000-7000-8000-000000000001",
    itemId: "0196a5ca-e000-7000-8000-000000000002",
    gearshiftItemId: "gearshift-item-1",
    quantity: 1,
    checkedOutAt: "2026-05-07T10:00:00.000Z",
  },
  {
    ...base,
    messageId: "m-update",
    type: "item_updated",
    gearshiftGuid: "gearshift-vendor-1",
    item: {
      id: "gearshift-item-1",
      consignmentId: "0196a5ca-e000-7000-8000-000000000001",
      itemId: "0196a5ca-e000-7000-8000-000000000002",
      barcode: "123-4567",
      description: "Skis",
      itemType: 1,
      itemTypeName: "Ski",
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
  },
  {
    ...base,
    messageId: "m-sold",
    type: "item_sold",
    consignmentId: "0196a5ca-e000-7000-8000-000000000001",
    itemId: "0196a5ca-e000-7000-8000-000000000002",
    gearshiftItemId: "gearshift-item-1",
    quantity: 1,
    saleAmountCents: 10000,
    soldAt: "2026-05-07T10:00:00.000Z",
  },
  {
    ...base,
    messageId: "m-note",
    type: "item_note_added",
    consignmentId: "0196a5ca-e000-7000-8000-000000000001",
    itemId: "0196a5ca-e000-7000-8000-000000000002",
    gearshiftItemId: "gearshift-item-1",
    note: {
      id: "note-1",
      text: "Needs tuning",
      type: "condition",
      createdAt: "2026-05-07T10:00:00.000Z",
    },
  },
  {
    ...base,
    messageId: "m-check",
    type: "check_issued",
    gearshiftGuid: "gearshift-vendor-1",
    paymentId: "payment-1",
    checkNumber: "10001",
    amountCents: 5000,
    issuedAt: "2026-05-07T10:00:00.000Z",
    items: [{ gearshiftItemId: "gearshift-item-1" }],
  },
  {
    ...base,
    messageId: "m-eft",
    type: "electronic_payment_issued",
    gearshiftGuid: "gearshift-vendor-1",
    paymentId: "payment-2",
    paymentReference: "eft-1",
    amountCents: 5000,
    issuedAt: "2026-05-07T10:00:00.000Z",
    items: [{ gearshiftItemId: "gearshift-item-1" }],
  },
];

describe("Gearshift protobuf contracts", () => {
  it.each(messages)("round-trips $type messages", (message) => {
    expect(decodeGearshiftMessage(encodeGearshiftMessage(message))).toEqual(
      message,
    );
  });

  it("defines routing keys for every event type", () => {
    expect(Object.keys(gearshiftRoutingKeys).sort()).toEqual(
      messages.map((message) => message.type).sort(),
    );
  });
});
