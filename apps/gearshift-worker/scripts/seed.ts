/**
 * Local dev seed: gives the seeded Authentik public consignor
 * (`customer@example.com`) one `received` consignment whose items carry a rich
 * Gearshift history, so the Item Status screen and its Item History drawer have
 * something to show.
 *
 * How it works: it inserts the minimum local state the worker cannot create
 * itself (a customer row + a `submitted` consignment with items), then publishes
 * a sequence of real Gearshift protobuf events to RabbitMQ. The running worker
 * consumes them and builds every derived row (snapshots, links, and the new
 * `gearshift_item_events` timeline).
 *
 * Prerequisites:
 *   - infra up:            npm run dev:infra
 *   - worker consuming:    npm run dev            (leave it running)
 *   Then, in another shell:
 *     npm run seed            (from the repo root; or -w apps/gearshift-worker)
 *
 * The customer row uses a placeholder `idp_subject`; the API's `ensureCustomer`
 * adopts it by email on first real login, so the seeded consignment simply
 * appears once you sign in as customer@example.com (password `customer`).
 *
 * Idempotent: every message has a stable id, so re-running against a database
 * that already has the seed is a no-op. To reseed from scratch, recreate the DB
 * (`docker compose ... down -v` then `npm run dev:infra`).
 */
import amqp from "amqplib";
import pg from "pg";
import {
  encodeGearshiftMessage,
  gearshiftContentType,
  gearshiftRoutingKeys,
  getGearshiftRoutingKey,
  type GearshiftEventType,
  type GearshiftItemSnapshot,
  type GearshiftMessage,
} from "@expresspass/shared";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://consign:consign@localhost:5432/consignments";
const RABBITMQ_URL = process.env.RABBITMQ_URL ?? "amqp://localhost:5672";
const EXCHANGE = process.env.GEARSHIFT_EXCHANGE ?? "gearshift.events";
const QUEUE = process.env.GEARSHIFT_QUEUE ?? "gearshift.customer-events";
const DLX = process.env.GEARSHIFT_DLX ?? "gearshift.events.dlx";
const DLQ = process.env.GEARSHIFT_DLQ ?? "gearshift.customer-events.dlq";

const CUSTOMER_EMAIL =
  process.env.SEED_CUSTOMER_EMAIL ?? "customer@example.com";
const GEARSHIFT_GUID = "seed-gs-guid-0001";
const CONSIGNMENT_ID = "0199e000-0000-7000-8000-0000000000aa";

type SeedItem = {
  gs: string;
  itemId: string;
  consignmentItemId: string;
  description: string;
  itemType: number;
  itemSize: string;
  priceCents: number;
};

// Gearshift issues a warehouse barcode when a public item is checked in: the
// public default vendor code (200) plus a random 4-digit number, e.g. "200-0421".
const issueBarcode = () =>
  `200-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

const SKIS: SeedItem = {
  gs: "seed-gs-item-skis",
  itemId: "0199e000-0000-7000-8000-0000000000a1",
  consignmentItemId: "0199e000-0000-7000-8000-00000000c1a1",
  description: "Rossignol Experience 88 skis",
  itemType: 1,
  itemSize: "170",
  priceCents: 24000,
};
const BOOTS: SeedItem = {
  gs: "seed-gs-item-boots",
  itemId: "0199e000-0000-7000-8000-0000000000b2",
  consignmentItemId: "0199e000-0000-7000-8000-00000000c1b2",
  description: "Salomon X Pro 100 boots",
  itemType: 3,
  itemSize: "27.5",
  priceCents: 8000,
};
const HELMET: SeedItem = {
  gs: "seed-gs-item-helmet",
  itemId: "0199e000-0000-7000-8000-0000000000c3",
  consignmentItemId: "0199e000-0000-7000-8000-00000000c1c3",
  description: "Smith Mission helmet",
  itemType: 5,
  itemSize: "M",
  priceCents: 6000,
};
const ITEMS = [SKIS, BOOTS, HELMET];

// Barcodes are assigned at check-in; the helmet is never checked in, so it never
// gets one.
const SKIS_BARCODE = issueBarcode();
const BOOTS_BARCODE = issueBarcode();

const base = Date.now() - 3 * 60 * 60 * 1000;
const at = (minutes: number) =>
  new Date(base + minutes * 60 * 1000).toISOString();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let sequence = 0;
function envelope(occurredAt: string) {
  sequence += 1;
  return {
    messageId: `seed-${String(sequence).padStart(3, "0")}`,
    schemaVersion: 1,
    sourceSystem: "seed-script",
    occurredAt,
    publishedAt: occurredAt,
    gearshiftGuid: GEARSHIFT_GUID,
  };
}

function snapshot(
  item: SeedItem,
  overrides: Partial<GearshiftItemSnapshot> = {},
): GearshiftItemSnapshot {
  return {
    id: item.gs,
    consignmentId: CONSIGNMENT_ID,
    itemId: item.itemId,
    description: item.description,
    itemType: item.itemType,
    itemSize: item.itemSize,
    priceCents: item.priceCents,
    qty: 1,
    qtyChecked: 0,
    qtySold: 0,
    reclaimed: false,
    valueSoldCents: null,
    timeSold: null,
    notes: [],
    ...overrides,
  };
}

// Timeline (relative to 3h ago):
//   skis:   listed -> checked in (barcode issued) -> price dropped 240 -> 180 -> sold for 180
//   boots:  listed -> checked in (barcode issued) -> clerk note added
//   helmet: listed only (never checked in -> no barcode, history drawer shows the empty state)
const messages: GearshiftMessage[] = [
  {
    ...envelope(at(0)),
    type: "remote_account_linked",
    remoteAccountNumber: "SEED-200",
    email: CUSTOMER_EMAIL,
    gearshiftGuid: GEARSHIFT_GUID,
    linkedAt: at(0),
  },
  {
    ...envelope(at(1)),
    type: "consignment_accepted",
    consignmentId: CONSIGNMENT_ID,
    gearshiftGuid: GEARSHIFT_GUID,
    acceptedAt: at(1),
  },
  ...ITEMS.map(
    (item, index): GearshiftMessage => ({
      ...envelope(at(2 + index)),
      type: "item_updated",
      item: snapshot(item),
    }),
  ),
  {
    ...envelope(at(10)),
    type: "item_checked_in",
    consignmentId: CONSIGNMENT_ID,
    itemId: SKIS.itemId,
    gearshiftItemId: SKIS.gs,
    quantity: 1,
    checkedInAt: at(10),
  },
  {
    ...envelope(at(10)),
    type: "item_updated",
    item: snapshot(SKIS, { qtyChecked: 1, barcode: SKIS_BARCODE }),
  },
  {
    ...envelope(at(12)),
    type: "item_checked_in",
    consignmentId: CONSIGNMENT_ID,
    itemId: BOOTS.itemId,
    gearshiftItemId: BOOTS.gs,
    quantity: 1,
    checkedInAt: at(12),
  },
  {
    ...envelope(at(12)),
    type: "item_updated",
    item: snapshot(BOOTS, { qtyChecked: 1, barcode: BOOTS_BARCODE }),
  },
  {
    ...envelope(at(16)),
    type: "item_note_added",
    consignmentId: CONSIGNMENT_ID,
    itemId: BOOTS.itemId,
    gearshiftItemId: BOOTS.gs,
    note: {
      id: "seed-note-boots-1",
      text: "Right buckle is stiff — flagged at check-in.",
      type: "check_in",
      createdAt: at(16),
    },
  },
  {
    ...envelope(at(70)),
    type: "item_updated",
    item: snapshot(SKIS, {
      qtyChecked: 1,
      priceCents: 18000,
      barcode: SKIS_BARCODE,
    }),
  },
  {
    ...envelope(at(130)),
    type: "item_sold",
    consignmentId: CONSIGNMENT_ID,
    itemId: SKIS.itemId,
    gearshiftItemId: SKIS.gs,
    quantity: 1,
    saleAmountCents: 18000,
    soldAt: at(130),
  },
  {
    ...envelope(at(130)),
    type: "item_updated",
    item: snapshot(SKIS, {
      qtyChecked: 1,
      qtySold: 1,
      priceCents: 18000,
      valueSoldCents: 18000,
      timeSold: at(130),
      barcode: SKIS_BARCODE,
    }),
  },
];

async function seedDatabase(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  try {
    await pool.query(
      `INSERT INTO customers (id, idp_subject, email, role)
       VALUES ('0199e000-0000-7000-8000-0000000000c0', $1, $2, 'public')
       ON CONFLICT (email) DO NOTHING`,
      [`seed:${CUSTOMER_EMAIL}`, CUSTOMER_EMAIL],
    );
    const customer = await pool.query<{ id: string }>(
      "SELECT id FROM customers WHERE lower(email) = lower($1)",
      [CUSTOMER_EMAIL],
    );
    const customerId = customer.rows[0]?.id;
    if (!customerId) {
      throw new Error(`Could not create or find customer ${CUSTOMER_EMAIL}`);
    }

    await pool.query(
      `INSERT INTO notification_preferences (customer_id)
       VALUES ($1) ON CONFLICT (customer_id) DO NOTHING`,
      [customerId],
    );

    const sale = await pool.query<{ id: string }>(
      "SELECT id FROM sales WHERE status = 'active' LIMIT 1",
    );
    const saleId = sale.rows[0]?.id ?? null;

    await pool.query(
      `INSERT INTO consignments (id, customer_id, sale_id, status, submitted_at)
       VALUES ($1, $2, $3, 'submitted', $4)
       ON CONFLICT (id) DO NOTHING`,
      [CONSIGNMENT_ID, customerId, saleId, at(0)],
    );

    for (const item of ITEMS) {
      await pool.query(
        `INSERT INTO consignment_items
           (id, consignment_id, sale_id, description, item_type, item_size, price_cents, qty)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
         ON CONFLICT (id) DO NOTHING`,
        [
          item.consignmentItemId,
          CONSIGNMENT_ID,
          saleId,
          item.description,
          item.itemType,
          item.itemSize,
          item.priceCents,
        ],
      );
    }

    console.log(
      `Seeded customer ${CUSTOMER_EMAIL} (${customerId}) and submitted consignment ${CONSIGNMENT_ID}.`,
    );
  } finally {
    await pool.end();
  }
}

async function publishEvents(): Promise<void> {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  async function waitForEmptyQueue(): Promise<void> {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const { messageCount } = await channel.checkQueue(QUEUE);
      if (messageCount === 0) {
        // messageCount drops to 0 the moment the worker takes the message (before
        // it acks), so give the handler's DB writes time to commit before the
        // next order-sensitive event goes out.
        await sleep(500);
        return;
      }
      await sleep(150);
    }
    throw new Error(`Timed out waiting for "${QUEUE}" to drain.`);
  }

  // Declare the same topology the worker's consumer does (harmless if it already
  // exists) so the consumer check and per-event draining below have a queue.
  await channel.assertExchange(DLX, "fanout", { durable: true });
  await channel.assertQueue(DLQ, { durable: true });
  await channel.bindQueue(DLQ, DLX, "");
  await channel.assertExchange(EXCHANGE, "topic", { durable: true });
  await channel.assertQueue(QUEUE, {
    durable: true,
    arguments: { "x-dead-letter-exchange": DLX },
  });
  for (const eventType of Object.keys(
    gearshiftRoutingKeys,
  ) as GearshiftEventType[]) {
    await channel.bindQueue(QUEUE, EXCHANGE, gearshiftRoutingKeys[eventType]);
  }

  // The worker consumes without a prefetch limit and processes messages
  // concurrently, but Gearshift events for one item are order-sensitive here
  // (checked-in count, then price drop, then sale). Require a live consumer and
  // publish one event at a time, waiting for the queue to drain between each.
  const { consumerCount } = await channel.checkQueue(QUEUE);
  if (consumerCount === 0) {
    throw new Error(
      `No consumer on "${QUEUE}". Start the worker first (npm run dev) and re-run the seed.`,
    );
  }

  for (const message of messages) {
    channel.publish(
      EXCHANGE,
      getGearshiftRoutingKey(message.type),
      Buffer.from(encodeGearshiftMessage(message)),
      {
        contentType: gearshiftContentType,
        messageId: message.messageId,
        persistent: true,
      },
    );
    console.log(`  published ${message.messageId} (${message.type})`);
    await waitForEmptyQueue();
  }

  await channel.close();
  await connection.close();
}

async function main(): Promise<void> {
  await seedDatabase();
  console.log(`Publishing ${messages.length} Gearshift events to ${EXCHANGE}…`);
  await publishEvents();
  console.log(
    [
      "",
      "Done. Make sure the worker (npm run dev) is running to consume the events.",
      `Sign in as ${CUSTOMER_EMAIL} (password "customer") and open /consignments —`,
      "the received consignment's Item Status screen shows the seeded items;",
      "click a row (skis or boots) to see the Item History drawer.",
    ].join("\n"),
  );
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
