import protobuf from "protobufjs";
import {
  gearshiftMessageSchema,
  type GearshiftEventType,
  type GearshiftItemSnapshot,
  type GearshiftMessage,
} from "./schemas.js";

type TimestampMessage = { seconds?: number | LongLike; nanos?: number };
type LongLike = { toNumber(): number };

const EVENT_TYPE_TO_PROTO = {
  remote_account_linked: 1,
  consignment_accepted: 2,
  item_checked_in: 3,
  item_checked_out: 4,
  item_updated: 5,
  item_sold: 6,
  item_note_added: 7,
  check_issued: 8,
  electronic_payment_issued: 9,
} as const satisfies Record<GearshiftEventType, number>;

const PROTO_TO_EVENT_TYPE = Object.fromEntries(
  Object.entries(EVENT_TYPE_TO_PROTO).map(([eventType, value]) => [
    value,
    eventType,
  ]),
) as Record<number, GearshiftEventType>;

export const gearshiftRoutingKeys = {
  remote_account_linked: "gearshift.event.remote_account.linked",
  consignment_accepted: "gearshift.event.consignment.accepted",
  item_checked_in: "gearshift.event.item.checked_in",
  item_checked_out: "gearshift.event.item.checked_out",
  item_updated: "gearshift.event.item.updated",
  item_sold: "gearshift.event.item.sold",
  item_note_added: "gearshift.event.item.note_added",
  check_issued: "gearshift.event.payment.check_issued",
  electronic_payment_issued: "gearshift.event.payment.electronic_issued",
} as const satisfies Record<GearshiftEventType, string>;

export const gearshiftContentType = "application/x-protobuf";

const root = new protobuf.Root();
const google = root.define("google");
const protobufNamespace = google.define("protobuf");
const Timestamp = new protobuf.Type("Timestamp")
  .add(new protobuf.Field("seconds", 1, "int64"))
  .add(new protobuf.Field("nanos", 2, "int32"));
protobufNamespace.add(Timestamp);

const gearshift = root.define("gearshift.v1");

gearshift.add(
  new protobuf.Enum("GearshiftEventType", {
    GEARSHIFT_EVENT_TYPE_UNSPECIFIED: 0,
    REMOTE_ACCOUNT_LINKED: 1,
    CONSIGNMENT_ACCEPTED: 2,
    ITEM_CHECKED_IN: 3,
    ITEM_CHECKED_OUT: 4,
    ITEM_UPDATED: 5,
    ITEM_SOLD: 6,
    ITEM_NOTE_ADDED: 7,
    CHECK_ISSUED: 8,
    ELECTRONIC_PAYMENT_ISSUED: 9,
  }),
);

const ItemNote = new protobuf.Type("ItemNote")
  .add(new protobuf.Field("id", 1, "string"))
  .add(new protobuf.Field("text", 2, "string"))
  .add(new protobuf.Field("type", 3, "string"))
  .add(new protobuf.Field("createdAt", 4, "google.protobuf.Timestamp"));

const GearshiftItemSnapshot = new protobuf.Type("GearshiftItemSnapshot")
  .add(new protobuf.Field("id", 1, "string"))
  .add(new protobuf.Field("consignmentId", 2, "string"))
  .add(new protobuf.Field("itemId", 3, "string"))
  .add(new protobuf.Field("barcode", 4, "string"))
  .add(new protobuf.Field("description", 5, "string"))
  .add(new protobuf.Field("itemType", 6, "uint32"))
  .add(new protobuf.Field("itemTypeName", 7, "string"))
  .add(new protobuf.Field("itemSize", 8, "string"))
  .add(new protobuf.Field("priceCents", 9, "int64"))
  .add(new protobuf.Field("qty", 10, "int32"))
  .add(new protobuf.Field("qtyChecked", 11, "int32"))
  .add(new protobuf.Field("sold", 12, "int32"))
  .add(new protobuf.Field("reclaimed", 13, "bool"))
  .add(new protobuf.Field("valueSoldCents", 14, "int64"))
  .add(new protobuf.Field("timeSold", 15, "google.protobuf.Timestamp"))
  .add(new protobuf.Field("notes", 16, "ItemNote", "repeated"));

const PayoutItem = new protobuf.Type("PayoutItem")
  .add(new protobuf.Field("gearshiftItemId", 1, "string"))
  .add(new protobuf.Field("consignmentId", 2, "string"))
  .add(new protobuf.Field("itemId", 3, "string"));

const RemoteAccountLinked = new protobuf.Type("RemoteAccountLinked")
  .add(new protobuf.Field("remoteAccountNumber", 1, "string"))
  .add(new protobuf.Field("email", 2, "string"))
  .add(new protobuf.Field("gearshiftGuid", 3, "string"))
  .add(new protobuf.Field("linkedAt", 4, "google.protobuf.Timestamp"));

const ConsignmentAccepted = new protobuf.Type("ConsignmentAccepted")
  .add(new protobuf.Field("consignmentId", 1, "string"))
  .add(new protobuf.Field("gearshiftGuid", 2, "string"))
  .add(new protobuf.Field("acceptedAt", 3, "google.protobuf.Timestamp"));

const ItemCheckedIn = new protobuf.Type("ItemCheckedIn")
  .add(new protobuf.Field("consignmentId", 1, "string"))
  .add(new protobuf.Field("itemId", 2, "string"))
  .add(new protobuf.Field("gearshiftItemId", 3, "string"))
  .add(new protobuf.Field("quantity", 4, "int32"))
  .add(new protobuf.Field("checkedInAt", 5, "google.protobuf.Timestamp"));

const ItemCheckedOut = new protobuf.Type("ItemCheckedOut")
  .add(new protobuf.Field("consignmentId", 1, "string"))
  .add(new protobuf.Field("itemId", 2, "string"))
  .add(new protobuf.Field("gearshiftItemId", 3, "string"))
  .add(new protobuf.Field("quantity", 4, "int32"))
  .add(new protobuf.Field("checkedOutAt", 5, "google.protobuf.Timestamp"));

const ItemUpdated = new protobuf.Type("ItemUpdated").add(
  new protobuf.Field("item", 1, "GearshiftItemSnapshot"),
);

const ItemSold = new protobuf.Type("ItemSold")
  .add(new protobuf.Field("consignmentId", 1, "string"))
  .add(new protobuf.Field("itemId", 2, "string"))
  .add(new protobuf.Field("gearshiftItemId", 3, "string"))
  .add(new protobuf.Field("quantity", 4, "int32"))
  .add(new protobuf.Field("saleAmountCents", 5, "int64"))
  .add(new protobuf.Field("soldAt", 6, "google.protobuf.Timestamp"));

const ItemNoteAdded = new protobuf.Type("ItemNoteAdded")
  .add(new protobuf.Field("consignmentId", 1, "string"))
  .add(new protobuf.Field("itemId", 2, "string"))
  .add(new protobuf.Field("gearshiftItemId", 3, "string"))
  .add(new protobuf.Field("note", 4, "ItemNote"));

const CheckIssued = new protobuf.Type("CheckIssued")
  .add(new protobuf.Field("paymentId", 1, "string"))
  .add(new protobuf.Field("checkNumber", 2, "string"))
  .add(new protobuf.Field("gearshiftGuid", 3, "string"))
  .add(new protobuf.Field("amountCents", 4, "int64"))
  .add(new protobuf.Field("issuedAt", 5, "google.protobuf.Timestamp"))
  .add(new protobuf.Field("items", 6, "PayoutItem", "repeated"));

const ElectronicPaymentIssued = new protobuf.Type("ElectronicPaymentIssued")
  .add(new protobuf.Field("paymentId", 1, "string"))
  .add(new protobuf.Field("paymentReference", 2, "string"))
  .add(new protobuf.Field("gearshiftGuid", 3, "string"))
  .add(new protobuf.Field("amountCents", 4, "int64"))
  .add(new protobuf.Field("issuedAt", 5, "google.protobuf.Timestamp"))
  .add(new protobuf.Field("items", 6, "PayoutItem", "repeated"));

const GearshiftEventEnvelope = new protobuf.Type("GearshiftEventEnvelope")
  .add(new protobuf.Field("messageId", 1, "string"))
  .add(new protobuf.Field("eventType", 2, "GearshiftEventType"))
  .add(new protobuf.Field("schemaVersion", 3, "uint32"))
  .add(new protobuf.Field("sourceSystem", 4, "string"))
  .add(new protobuf.Field("correlationId", 5, "string"))
  .add(new protobuf.Field("causationId", 6, "string"))
  .add(new protobuf.Field("occurredAt", 7, "google.protobuf.Timestamp"))
  .add(new protobuf.Field("publishedAt", 8, "google.protobuf.Timestamp"))
  .add(new protobuf.Field("gearshiftGuid", 9, "string"))
  .add(new protobuf.Field("remoteAccountLinked", 100, "RemoteAccountLinked"))
  .add(new protobuf.Field("consignmentAccepted", 101, "ConsignmentAccepted"))
  .add(new protobuf.Field("itemCheckedIn", 102, "ItemCheckedIn"))
  .add(new protobuf.Field("itemCheckedOut", 103, "ItemCheckedOut"))
  .add(new protobuf.Field("itemUpdated", 104, "ItemUpdated"))
  .add(new protobuf.Field("itemSold", 105, "ItemSold"))
  .add(new protobuf.Field("itemNoteAdded", 106, "ItemNoteAdded"))
  .add(new protobuf.Field("checkIssued", 107, "CheckIssued"))
  .add(
    new protobuf.Field(
      "electronicPaymentIssued",
      108,
      "ElectronicPaymentIssued",
    ),
  )
  .add(
    new protobuf.OneOf("payload", [
      "remoteAccountLinked",
      "consignmentAccepted",
      "itemCheckedIn",
      "itemCheckedOut",
      "itemUpdated",
      "itemSold",
      "itemNoteAdded",
      "checkIssued",
      "electronicPaymentIssued",
    ]),
  );

gearshift
  .add(ItemNote)
  .add(GearshiftItemSnapshot)
  .add(PayoutItem)
  .add(RemoteAccountLinked)
  .add(ConsignmentAccepted)
  .add(ItemCheckedIn)
  .add(ItemCheckedOut)
  .add(ItemUpdated)
  .add(ItemSold)
  .add(ItemNoteAdded)
  .add(CheckIssued)
  .add(ElectronicPaymentIssued)
  .add(GearshiftEventEnvelope);

const EnvelopeType = root.lookupType("gearshift.v1.GearshiftEventEnvelope");

export function encodeGearshiftMessage(message: GearshiftMessage): Uint8Array {
  const envelope = toProtobufEnvelope(message);
  const error = EnvelopeType.verify(envelope);
  if (error) {
    throw new Error(error);
  }
  return EnvelopeType.encode(EnvelopeType.create(envelope)).finish();
}

export function decodeGearshiftMessage(bytes: Uint8Array): GearshiftMessage {
  const decoded = EnvelopeType.toObject(EnvelopeType.decode(bytes), {
    longs: Number,
    defaults: false,
  }) as Record<string, unknown>;
  return gearshiftMessageSchema.parse(fromProtobufEnvelope(decoded));
}

export function getGearshiftRoutingKey(type: GearshiftEventType): string {
  return gearshiftRoutingKeys[type];
}

function toProtobufEnvelope(
  message: GearshiftMessage,
): Record<string, unknown> {
  const base = {
    messageId: message.messageId,
    eventType: EVENT_TYPE_TO_PROTO[message.type],
    schemaVersion: message.schemaVersion,
    sourceSystem: message.sourceSystem,
    correlationId: message.correlationId,
    causationId: message.causationId,
    occurredAt: timestampFromIso(message.occurredAt),
    publishedAt: timestampFromIso(message.publishedAt),
    gearshiftGuid: message.gearshiftGuid,
  };

  switch (message.type) {
    case "remote_account_linked":
      return {
        ...base,
        remoteAccountLinked: {
          remoteAccountNumber: message.remoteAccountNumber,
          email: message.email,
          gearshiftGuid: message.gearshiftGuid,
          linkedAt: timestampFromIso(message.linkedAt),
        },
      };
    case "consignment_accepted":
      return {
        ...base,
        consignmentAccepted: {
          consignmentId: message.consignmentId,
          gearshiftGuid: message.gearshiftGuid,
          acceptedAt: timestampFromIso(message.acceptedAt),
        },
      };
    case "item_checked_in":
      return {
        ...base,
        itemCheckedIn: {
          consignmentId: message.consignmentId,
          itemId: message.itemId,
          gearshiftItemId: message.gearshiftItemId,
          quantity: message.quantity,
          checkedInAt: timestampFromIso(message.checkedInAt),
        },
      };
    case "item_checked_out":
      return {
        ...base,
        itemCheckedOut: {
          consignmentId: message.consignmentId,
          itemId: message.itemId,
          gearshiftItemId: message.gearshiftItemId,
          quantity: message.quantity,
          checkedOutAt: timestampFromIso(message.checkedOutAt),
        },
      };
    case "item_updated":
      return { ...base, itemUpdated: { item: itemToProtobuf(message.item) } };
    case "item_sold":
      return {
        ...base,
        itemSold: {
          consignmentId: message.consignmentId,
          itemId: message.itemId,
          gearshiftItemId: message.gearshiftItemId,
          quantity: message.quantity,
          saleAmountCents: message.saleAmountCents,
          soldAt: timestampFromIso(message.soldAt),
        },
      };
    case "item_note_added":
      return {
        ...base,
        itemNoteAdded: {
          consignmentId: message.consignmentId,
          itemId: message.itemId,
          gearshiftItemId: message.gearshiftItemId,
          note: noteToProtobuf(message.note),
        },
      };
    case "check_issued":
      return {
        ...base,
        checkIssued: {
          paymentId: message.paymentId,
          checkNumber: message.checkNumber,
          gearshiftGuid: message.gearshiftGuid,
          amountCents: message.amountCents,
          issuedAt: timestampFromIso(message.issuedAt),
          items: message.items,
        },
      };
    case "electronic_payment_issued":
      return {
        ...base,
        electronicPaymentIssued: {
          paymentId: message.paymentId,
          paymentReference: message.paymentReference,
          gearshiftGuid: message.gearshiftGuid,
          amountCents: message.amountCents,
          issuedAt: timestampFromIso(message.issuedAt),
          items: message.items,
        },
      };
  }
}

function fromProtobufEnvelope(
  envelope: Record<string, unknown>,
): Record<string, unknown> {
  const type = PROTO_TO_EVENT_TYPE[Number(envelope.eventType)];
  if (!type) {
    throw new Error(
      `Unknown Gearshift event type: ${String(envelope.eventType)}`,
    );
  }
  const base = {
    messageId: envelope.messageId,
    type,
    schemaVersion: envelope.schemaVersion,
    sourceSystem: envelope.sourceSystem,
    correlationId: optionalString(envelope.correlationId),
    causationId: optionalString(envelope.causationId),
    occurredAt: isoFromTimestamp(envelope.occurredAt as TimestampMessage),
    publishedAt: isoFromTimestamp(envelope.publishedAt as TimestampMessage),
    gearshiftGuid: optionalString(envelope.gearshiftGuid),
  };

  switch (type) {
    case "remote_account_linked": {
      const payload = requiredPayload(envelope.remoteAccountLinked, type);
      return {
        ...base,
        remoteAccountNumber: payload.remoteAccountNumber,
        email: payload.email,
        gearshiftGuid: payload.gearshiftGuid,
        linkedAt: isoFromTimestamp(payload.linkedAt as TimestampMessage),
      };
    }
    case "consignment_accepted": {
      const payload = requiredPayload(envelope.consignmentAccepted, type);
      return {
        ...base,
        consignmentId: payload.consignmentId,
        gearshiftGuid: payload.gearshiftGuid,
        acceptedAt: isoFromTimestamp(payload.acceptedAt as TimestampMessage),
      };
    }
    case "item_checked_in": {
      const payload = requiredPayload(envelope.itemCheckedIn, type);
      return {
        ...base,
        consignmentId: payload.consignmentId,
        itemId: payload.itemId,
        gearshiftItemId: payload.gearshiftItemId,
        quantity: payload.quantity,
        checkedInAt: isoFromTimestamp(payload.checkedInAt as TimestampMessage),
      };
    }
    case "item_checked_out": {
      const payload = requiredPayload(envelope.itemCheckedOut, type);
      return {
        ...base,
        consignmentId: payload.consignmentId,
        itemId: payload.itemId,
        gearshiftItemId: payload.gearshiftItemId,
        quantity: payload.quantity,
        checkedOutAt: isoFromTimestamp(
          payload.checkedOutAt as TimestampMessage,
        ),
      };
    }
    case "item_updated": {
      const payload = requiredPayload(envelope.itemUpdated, type);
      return {
        ...base,
        item: itemFromProtobuf(payload.item as Record<string, unknown>),
      };
    }
    case "item_sold": {
      const payload = requiredPayload(envelope.itemSold, type);
      return {
        ...base,
        consignmentId: payload.consignmentId,
        itemId: payload.itemId,
        gearshiftItemId: payload.gearshiftItemId,
        quantity: payload.quantity,
        saleAmountCents: payload.saleAmountCents,
        soldAt: isoFromTimestamp(payload.soldAt as TimestampMessage),
      };
    }
    case "item_note_added": {
      const payload = requiredPayload(envelope.itemNoteAdded, type);
      return {
        ...base,
        consignmentId: optionalString(payload.consignmentId),
        itemId: optionalString(payload.itemId),
        gearshiftItemId: payload.gearshiftItemId,
        note: noteFromProtobuf(payload.note as Record<string, unknown>),
      };
    }
    case "check_issued": {
      const payload = requiredPayload(envelope.checkIssued, type);
      return {
        ...base,
        gearshiftGuid: payload.gearshiftGuid,
        paymentId: payload.paymentId,
        checkNumber: payload.checkNumber,
        amountCents: payload.amountCents,
        issuedAt: isoFromTimestamp(payload.issuedAt as TimestampMessage),
        items: payload.items ?? [],
      };
    }
    case "electronic_payment_issued": {
      const payload = requiredPayload(envelope.electronicPaymentIssued, type);
      return {
        ...base,
        gearshiftGuid: payload.gearshiftGuid,
        paymentId: payload.paymentId,
        paymentReference: payload.paymentReference,
        amountCents: payload.amountCents,
        issuedAt: isoFromTimestamp(payload.issuedAt as TimestampMessage),
        items: payload.items ?? [],
      };
    }
  }
}

function itemToProtobuf(item: GearshiftItemSnapshot): Record<string, unknown> {
  return {
    ...item,
    // Wire field is still named `sold` (external Gearshift contract, unchanged); only the
    // local/JS representation was renamed to `qtySold` to stop it reading as a boolean.
    sold: item.qtySold,
    description: item.description ?? undefined,
    valueSoldCents: item.valueSoldCents ?? undefined,
    timeSold: item.timeSold ? timestampFromIso(item.timeSold) : undefined,
    notes: item.notes.map(noteToProtobuf),
  };
}

function itemFromProtobuf(
  item: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...item,
    qtySold: item.sold,
    consignmentId: optionalString(item.consignmentId),
    itemId: optionalString(item.itemId),
    barcode: optionalString(item.barcode),
    description: optionalString(item.description) ?? null,
    itemTypeName: optionalString(item.itemTypeName),
    valueSoldCents: item.valueSoldCents ?? null,
    timeSold: item.timeSold
      ? isoFromTimestamp(item.timeSold as TimestampMessage)
      : null,
    notes: Array.isArray(item.notes)
      ? item.notes.map((note) =>
          noteFromProtobuf(note as Record<string, unknown>),
        )
      : [],
  };
}

function noteToProtobuf(note: {
  id?: string;
  text: string;
  type?: string;
  createdAt: string;
}): Record<string, unknown> {
  return {
    id: note.id,
    text: note.text,
    type: note.type,
    createdAt: timestampFromIso(note.createdAt),
  };
}

function noteFromProtobuf(
  note: Record<string, unknown>,
): Record<string, unknown> {
  return {
    id: optionalString(note.id),
    text: note.text,
    type: optionalString(note.type),
    createdAt: isoFromTimestamp(note.createdAt as TimestampMessage),
  };
}

function timestampFromIso(value: string): TimestampMessage {
  const millis = new Date(value).getTime();
  return {
    seconds: Math.floor(millis / 1000),
    nanos: (millis % 1000) * 1_000_000,
  };
}

function isoFromTimestamp(value: TimestampMessage | undefined): string {
  if (!value) {
    throw new Error("Missing timestamp");
  }
  const seconds =
    typeof value.seconds === "number"
      ? value.seconds
      : (value.seconds?.toNumber() ?? 0);
  return new Date(
    seconds * 1000 + Math.floor((value.nanos ?? 0) / 1_000_000),
  ).toISOString();
}

function requiredPayload(
  value: unknown,
  type: GearshiftEventType,
): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new Error(`Missing payload for ${type}`);
  }
  return value as Record<string, unknown>;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
