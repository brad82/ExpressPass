-- Express Pass PostgreSQL schema.
--
-- There is no migration runner: this file is executed once by Postgres via
-- /docker-entrypoint-initdb.d on an empty data volume. No product has been
-- released, so there is no migration chain to maintain — edit this file directly
-- and recreate the database (`docker compose ... down -v`) to apply changes.

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY CHECK (substring(id::text from 15 for 1) = '7'),
  idp_subject text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('public', 'business')),
  profile_locked boolean NOT NULL DEFAULT false,
  gearshift_guid text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  customer_id uuid PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  email_opt_in boolean NOT NULL DEFAULT false,
  sms_opt_in boolean NOT NULL DEFAULT false,
  sms_phone text,
  sms_verified boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Sale / season entity. Express Pass (unlike a per-deployment Gearshift instance)
-- persists across every sale CNUSS ever runs; submissions are always for whichever
-- sale is currently open.
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY CHECK (substring(id::text from 15 for 1) = '7'),
  label text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('upcoming', 'active', 'closed')) DEFAULT 'upcoming',
  submission_opens_at timestamptz,
  submission_closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- At most one sale accepts submissions at a time.
CREATE UNIQUE INDEX IF NOT EXISTS sales_single_active_idx ON sales ((true)) WHERE status = 'active';

-- Seed a default active sale so local/dev environments work out of the box.
-- Production operators replace this row's label (and create the real next one)
-- directly via SQL until sale management gets an admin surface.
INSERT INTO sales (id, label, status)
VALUES ('00000000-0000-7000-8000-000000000001', 'Default Sale', 'active')
ON CONFLICT DO NOTHING;

-- Consignment lifecycle: draft -> submitted -> received. `rejected` has no producer
-- yet (reserved for rejected business auto-imports). Only `draft` is editable;
-- `submitted`/`received` are read-only. `received_at` is when Gearshift's
-- `consignment_accepted` event advanced a `submitted` consignment to `received`.
CREATE TABLE IF NOT EXISTS consignments (
  id uuid PRIMARY KEY CHECK (substring(id::text from 15 for 1) = '7'),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES sales(id),
  status text NOT NULL CHECK (status IN ('draft', 'submitted', 'received', 'rejected')),
  submitted_at timestamptz,
  received_at timestamptz,
  gearshift_guid text,
  vendor_id integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consignments_sale_idx ON consignments(sale_id);

-- A customer may only ever hold one draft consignment at a time; submitted/received/
-- rejected consignments are unconstrained (a customer may hold several in one sale).
CREATE UNIQUE INDEX IF NOT EXISTS consignments_one_draft_per_customer
  ON consignments(customer_id) WHERE status = 'draft';

-- consignments.vendor_id is informational only, not authoritative: a business's items
-- can span more than one of their owned vendor codes within a single submission, so
-- this holds at most the submitter's primary/default code. Per-item vendor code is the
-- barcode's own 3-digit prefix (see barcodeVendorCode in packages/shared).
COMMENT ON COLUMN consignments.vendor_id IS
  'Informational primary/default vendor code for this submission only — not authoritative. A business may hold several codes; the real per-item code is the barcode''s 3-digit prefix.';

CREATE TABLE IF NOT EXISTS consignment_items (
  id uuid PRIMARY KEY CHECK (substring(id::text from 15 for 1) = '7'),
  consignment_id uuid NOT NULL REFERENCES consignments(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES sales(id),
  barcode text,
  description text NOT NULL,
  item_type integer NOT NULL,
  item_size text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents > 0),
  item_new boolean NOT NULL DEFAULT false,
  red_tag boolean NOT NULL DEFAULT false,
  qty integer NOT NULL CHECK (qty > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Barcode uniqueness is scoped per sale, not global-forever like Gearshift's own
-- constraint (which assumes tblItems gets cleared each sale — it doesn't). Vendor
-- codes and their barcode blocks are legitimately reused sale-to-sale.
CREATE UNIQUE INDEX IF NOT EXISTS consignment_items_sale_barcode_unique
ON consignment_items(sale_id, barcode)
WHERE barcode IS NOT NULL AND sale_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS gearshift_vendor_snapshots (
  gearshift_guid text PRIMARY KEY,
  vendor_id integer,
  captured_at timestamptz NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- `qty_sold` is a unit *count* (mirrors Gearshift's tblItems.QtySold), not a boolean,
-- despite sitting next to the boolean `reclaimed` column. The wire protobuf field keeps
-- its existing name (`sold`) since that's the external Gearshift contract; only the
-- local representation differs (see packages/shared/src/gearshift-protobuf.ts).
CREATE TABLE IF NOT EXISTS gearshift_item_snapshots (
  id text PRIMARY KEY,
  gearshift_guid text NOT NULL,
  consignment_id uuid CHECK (consignment_id IS NULL OR substring(consignment_id::text from 15 for 1) = '7'),
  item_id uuid CHECK (item_id IS NULL OR substring(item_id::text from 15 for 1) = '7'),
  barcode text,
  description text,
  item_type integer NOT NULL,
  item_type_name text,
  item_size text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  qty integer NOT NULL,
  qty_checked integer NOT NULL,
  qty_sold integer NOT NULL,
  reclaimed boolean NOT NULL,
  value_sold_cents integer,
  time_sold timestamptz,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gearshift_item_snapshots_vendor_idx ON gearshift_item_snapshots(gearshift_guid);

CREATE TABLE IF NOT EXISTS gearshift_item_notes (
  id text PRIMARY KEY,
  item_snapshot_id text NOT NULL REFERENCES gearshift_item_snapshots(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  note_type text,
  created_at timestamptz NOT NULL
);

-- Links a Gearshift item id to an Express Pass consignment so the per-consignment
-- `received` item-status view can be scoped. A dedicated table (rather than the
-- nullable gearshift_item_snapshots.consignment_id column) because Gearshift events
-- are unordered: an item_checked_in / item_sold can arrive before the first
-- item_updated has created a snapshot row, and a later ids-less item_updated must
-- not clobber a known link. item_checked_in / item_checked_out / item_sold always
-- carry the (gearshiftItemId, consignmentId, itemId) triple; item_updated /
-- item_note_added contribute it opportunistically.
CREATE TABLE IF NOT EXISTS gearshift_item_links (
  gearshift_item_id text PRIMARY KEY,
  consignment_id uuid NOT NULL CHECK (substring(consignment_id::text from 15 for 1) = '7'),
  item_id uuid CHECK (item_id IS NULL OR substring(item_id::text from 15 for 1) = '7'),
  gearshift_guid text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gearshift_item_links_consignment_idx
  ON gearshift_item_links(consignment_id);

-- Append-only per-item history feed. Written by the Gearshift worker as
-- item_checked_in / item_checked_out / item_sold / item_note_added events arrive,
-- and on item_updated when the price actually changed. Read back per item (scoped
-- through gearshift_item_links) to render the item-history timeline drawer. The
-- snapshot table holds only current state; this keeps every transition.
CREATE TABLE IF NOT EXISTS gearshift_item_events (
  id uuid PRIMARY KEY CHECK (substring(id::text from 15 for 1) = '7'),
  gearshift_item_id text NOT NULL,
  consignment_id uuid CHECK (consignment_id IS NULL OR substring(consignment_id::text from 15 for 1) = '7'),
  event_type text NOT NULL,
  occurred_at timestamptz NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_message_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gearshift_item_events_item_idx
  ON gearshift_item_events(gearshift_item_id, occurred_at, created_at);

-- Belt-and-braces idempotency (the worker already dedupes whole messages via
-- integration_messages): one message produces at most one event of a given type.
CREATE UNIQUE INDEX IF NOT EXISTS gearshift_item_events_message_dedupe
  ON gearshift_item_events(source_message_id, event_type);

CREATE TABLE IF NOT EXISTS integration_messages (
  message_id text PRIMARY KEY,
  message_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox_exports (
  id uuid PRIMARY KEY CHECK (substring(id::text from 15 for 1) = '7'),
  consignment_id uuid NOT NULL REFERENCES consignments(id) ON DELETE CASCADE,
  s3_key text NOT NULL UNIQUE,
  checksum text NOT NULL,
  status text NOT NULL DEFAULT 'written',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY CHECK (substring(id::text from 15 for 1) = '7'),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  source_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id uuid PRIMARY KEY CHECK (substring(id::text from 15 for 1) = '7'),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'sms')),
  dedupe_key text NOT NULL UNIQUE,
  status text NOT NULL,
  provider_message_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Structured payout data from Gearshift `check_issued` / `electronic_payment_issued`
-- events (mirrors Gearshift's own tblCheques / tblChequeDetails breakdown).
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY CHECK (substring(id::text from 15 for 1) = '7'),
  gearshift_guid text NOT NULL,
  payment_id text NOT NULL UNIQUE,
  method text NOT NULL CHECK (method IN ('check', 'electronic')),
  check_number text,
  payment_reference text,
  amount_cents integer NOT NULL,
  issued_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payouts_gearshift_guid_idx ON payouts(gearshift_guid);

CREATE TABLE IF NOT EXISTS payout_items (
  id uuid PRIMARY KEY CHECK (substring(id::text from 15 for 1) = '7'),
  payout_id uuid NOT NULL REFERENCES payouts(id) ON DELETE CASCADE,
  gearshift_item_id text NOT NULL,
  consignment_id uuid CHECK (consignment_id IS NULL OR substring(consignment_id::text from 15 for 1) = '7'),
  item_id uuid CHECK (item_id IS NULL OR substring(item_id::text from 15 for 1) = '7')
);

CREATE INDEX IF NOT EXISTS payout_items_payout_idx ON payout_items(payout_id);
