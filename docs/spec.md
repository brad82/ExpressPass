# Express Pass Engineering Specification

## Overview

Express Pass is a customer-facing portal for public and business consignors. It lets customers maintain identity-owned profile information, build and submit consignments, follow each consignment through its lifecycle (`draft` → `submitted` → `received`) and view per-consignment item status as Gearshift events arrive, and receive notifications as the sale workflow progresses.

The repository is a TypeScript monorepo with separate applications for the portal UI, API, Gearshift event worker, and shared domain code. PostgreSQL owns Express Pass workflow data, while the configured identity provider owns customer-maintained profile fields.

## Product Roles and Workflows

### Roles

| Role              | Purpose                                                              | Key behavior                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Public customer   | Individual consignor entering items through the guided portal flow.  | Cannot directly edit item barcodes. Barcodes are assigned on-premises by sale clerks when items are appraised and checked in.                 |
| Business customer | High-volume consignor entering rows in a grid/import-style workflow. | Purchases barcode blocks ahead of time, receives one or more sale-assigned vendor codes (warehouse sorting buckets, reused every season — not a unique identifier), and may assign purchased barcodes to equipment before drop-off. |

Business and public profiles differ because the sale handles their intake process differently. Business vendors are trusted to pre-label equipment from barcode blocks they purchased from the sale. Public vendors bring items to the sale without pre-assigned barcodes; sale clerks appraise and check in those items on-premises, and Gearshift issues the item barcodes during that workflow.

### Core Customer Flow

1. A customer authenticates through OIDC and opens the portal.
2. The API ensures a local customer row exists for the authenticated subject and returns identity-profile data merged with Express Pass workflow data.
3. The customer completes profile, business information when applicable, and notification preferences.
4. The customer creates a draft consignment and adds items. A customer may hold only one `draft` at a time, but may hold several consignments overall in one sale; the portal presents them under one Consignments page with a tab switcher.
5. The customer submits the draft consignment.
6. The API validates profile, role-specific consignment rules, and item requirements.
7. The API moves the consignment to `submitted`, locks the local profile flag, writes a consignment export, and returns the export `s3Key`.
8. Gearshift events later link accounts, move consignments to `received`, update per-consignment item status, and create notifications.

### Consignment lifecycle

| State | Set by | Customer can | Portal view |
| ----------- | ------------------------------------------------ | ------------------------------------- | ---------------------------------------- |
| `draft`     | Creating a consignment                           | Full item CRUD                        | Editable item editor                     |
| `submitted` | `POST /consignments/:id/submit`                  | Read-only                             | Read-only item editor                    |
| `received`  | Gearshift `consignment_accepted` event (worker)  | View per-consignment item status      | Item-status view (checked in / sold / value; per-item history) |
| `rejected`  | No producer yet (reserved for rejected business auto-imports) | n/a                    | n/a                                     |

Only `draft` consignments can be edited or submitted. The move from `submitted` to `received` is Gearshift-driven and only advances a consignment that is currently `submitted`.

## Monorepo Architecture

| Workspace               | Responsibility                                                                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`              | React/Vite/MUI Express Pass portal. Uses Redux Toolkit Query for API access and OIDC authorization code + PKCE for auth.                       |
| `apps/api`              | Fastify API for customer profile, catalog, consignments, per-consignment item status, notifications, and consignment export.                   |
| `apps/gearshift-worker` | RabbitMQ consumer for Gearshift protobuf events. Updates snapshots, links snapshots to consignments, links customers, advances consignment state, and dispatches notifications. |
| `packages/shared`       | Shared Zod schemas, domain types, catalog helpers, currency helpers, object IDs, notification templates, and Gearshift protobuf support.       |
| `.docker`               | Local and container infrastructure: Compose files, Traefik routing, Authentik blueprint, and pgAdmin config.                                   |

### Source of Truth Boundaries

- `packages/shared/src/schemas.ts` defines the shared domain contracts used across applications.
- `apps/api/migrations/001_initial.sql` defines the PostgreSQL persistence model. There is no migration runner and no migration chain (nothing is released yet): it is applied once by Postgres on a fresh data volume, and schema changes are made by editing that file and recreating the database.
- API route behavior is implemented as encapsulated Fastify route plugins under `apps/api/src/routes`.
- Gearshift event routing is implemented in `apps/gearshift-worker/src/handlers/index.ts`.
- Web route and API client behavior is implemented in `apps/web/src/components/PortalRoutes.tsx` and `apps/web/src/api.ts`.

Generated `dist` outputs and `tsconfig.tsbuildinfo` files are build artifacts, not design sources of truth.

## Authentication and Identity

Express Pass uses OIDC bearer tokens for browser/API authentication. The web app signs in with authorization code + PKCE and sends API requests with `Authorization: Bearer <token>`. The API registers `fastify-jwt-jwks` at startup with explicit `OIDC_ISSUER`, `OIDC_JWKS_URL`, and `OIDC_AUDIENCE` configuration. Route options use Fastify auth decorators to require a verified token, a loaded customer, or a specific customer role; those decorators map verified token claims into the local `authUser`/`customer` request context.

The API supports identity profile updates through a provider abstraction:

| Provider  | Use case                                             | Required configuration                                                  |
| --------- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| Authentik | Local/self-hosted development.                       | `IDENTITY_PROVIDER=authentik`, `AUTHENTIK_BASE_URL`, `AUTHENTIK_TOKEN`. |
| Cognito   | Production-compatible hosted identity provider path. | `IDENTITY_PROVIDER=cognito`, `COGNITO_USER_POOL_ID`.                    |

Identity-owned fields are first name, last name, email, phone, mailing address, business name, GST number, and business vendor codes (a business may hold more than one — see Important Domain Constraints). PostgreSQL keeps workflow data such as local customer ID, OIDC subject, role, profile lock state, Gearshift GUID, consignments, notifications, snapshots, and export metadata.

The local Traefik-backed environment includes Authentik with seeded users:

| User                   | Password    | Role                    |
| ---------------------- | ----------- | ----------------------- |
| `customer@example.com` | `customer`  | Public customer         |
| `business@example.com` | `business`  | Business customer       |
| `akadmin`              | `authentik` | Authentik administrator |

## Data Model

### Domain Entities

| Entity                    | Purpose                                               | Notes                                                                                                           |
| ------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Customer                  | Local workflow identity linked to an OIDC subject.    | Stores role, profile lock state, email, and optional Gearshift GUID.                                            |
| Notification preferences  | Customer opt-in state for email and SMS.              | SMS opt-in requires a verified phone number in shared schema validation.                                        |
| Sale                      | A single sale event/season Express Pass runs against. | At most one `active` sale accepts submissions at a time. Consignments and consignment items are scoped to it.  |
| Consignment               | Draft/submitted/received/rejected submission container. | Uses UUIDv7 IDs, belongs to one customer, and is scoped to the sale that was active when it was created. `rejected` is reserved (no producer yet). |
| Consignment item          | Item row submitted for sale.                          | Uses UUIDv7 IDs and stores barcode, description, item type, size, price cents, new/red-tag flags, and quantity. Barcode uniqueness is enforced per sale, not globally. |
| Gearshift vendor snapshot | Latest vendor payload captured from Gearshift.        | Keyed by Gearshift GUID.                                                                                        |
| Gearshift item snapshot   | Latest item state captured from Gearshift.            | Drives the per-consignment `received` item-status view.                                                         |
| Gearshift item link       | Maps a Gearshift item id to an Express Pass consignment (and item). | Written by any event carrying the `(gearshiftItemId, consignmentId, itemId)` triple; scopes item snapshots to a consignment. |
| Gearshift item note       | Notes attached to Gearshift item snapshots.           | Stored separately from item snapshot payloads.                                                                  |
| Gearshift item event      | Append-only per-item history entry.                   | Written by the worker on `item_checked_in`/`item_checked_out`/`item_sold`/`item_note_added`, and on `item_updated` when the price changed; read (scoped through the item link) to drive the item-history timeline drawer. Unlike the snapshot, it retains every transition. |
| Integration message       | Processed Gearshift message record.                   | Used to support idempotent event processing.                                                                    |
| Outbox export             | Record of a written consignment export.               | Stores S3 key, checksum, status, and consignment link.                                                          |
| Notification              | In-app notification row for customer-visible events.  | Created by Gearshift worker event handling.                                                                     |
| Payout                    | A check or electronic payment issued by Gearshift.    | Keyed by Gearshift GUID and a unique payment ID; persisted from `check_issued`/`electronic_payment_issued` events instead of only a notification. |
| Payout item                | Line item within a payout.                            | Mirrors the event's `PayoutItem[]`, linking a Gearshift item ID to its consignment/item when known.             |

### Important Domain Constraints

- Currency values crossing API, database, export, and event boundaries are integer cents, for example `priceCents` and `valueSoldCents`.
- Human-facing UI accepts dollar-cent input and converts at the application boundary.
- Express Pass-generated IDs use UUIDv7. Gearshift-originated IDs remain external identifiers and must not be treated as Express Pass-generated IDs.
- Consignment statuses are `draft`, `submitted`, `received`, and `rejected` (`rejected` has no producer yet — reserved for rejected business auto-imports).
- Draft consignments are the only consignments that can be edited or submitted; `submitted` and `received` are read-only. A customer may have several consignments in one sale.
- A submitted consignment must contain at least one item.
- Profile name and mailing address are required before submission.
- Business accounts require a business name before submission.
- Business consignment items require unique valid barcodes because business vendors pre-assign barcodes from purchased blocks; uniqueness is enforced per sale (across every consignment in that sale), not globally across all sales ever run — Gearshift's own item table enforces uniqueness globally, which assumes it gets cleared each sale; it does not, and reused barcodes across sales are expected and legitimate.
- A barcode's vendor code is its 3-digit prefix (e.g. `203-0042` -> `203`). Business item barcodes must belong to one of the submitting customer's own assigned vendor codes.
- Public consignment item barcodes are removed during customer edits and can be updated later through Gearshift-driven check-in workflows.
- Public vendors use vendor code `200` for legacy application compatibility.
- Vendor code is a sale logistics code, not a unique computing identifier — it is a warehouse sorting bucket, shared by every public consignor (`200`) and reused every season by a business (which may hold more than one code at once). It must not be used as a primary identifier, authorization boundary, or uniqueness assumption in any Express Pass, Gearshift, importer, or reporting logic. `consignments.vendor_id` holds only an informational primary/default code for the submission, since a single submission can span more than one of a business's owned codes.

## Web Application

The web app is a React 19, Vite, MUI application. Routing is handled by React Router and API state is handled by Redux Toolkit Query.

### Portal Routes

| Route           | Page             | Purpose                                                                                     |
| --------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| `/`             | Dashboard        | Shows customer overview, summary cards, and notification context.                           |
| `/profile/*`    | Profile settings | Edits identity profile, business information when applicable, and notification preferences. |
| `/consignments` | Consignments     | Single entry point for all of the customer's consignments: a tab switcher selects one; drafts are edited/saved/submitted, `submitted` is read-only, `received` shows the per-consignment item-status view. |
| `*`             | Redirect         | Redirects unknown routes to `/`.                                                            |

### Consignment Editing

`ConsignmentWorkspace` lists the customer's consignments as tabs (defaulting to the first draft, else the first consignment) and renders the right surface for the selected consignment's status: the editable item editor for `draft`, the same editor read-only for `submitted`, and `ConsignmentStatusView` (fed by `GET /consignments/:id/status`) for `received`. The status view renders items in a sortable/filterable MUI data grid; clicking an item row opens an `ItemHistoryDrawer` (fed by `GET /consignments/:id/status/:gearshiftItemId/history`) with that item's event timeline. Save/submit actions appear only for `draft`.

Public customers add items through `PublicItemWizard`, which walks through category, description, price, and options steps. The wizard builds a shopper-facing description, fetches pricing guide Markdown for the selected item type, and saves newly added items immediately. It does not collect barcodes because public item barcodes are assigned later by sale clerks during Gearshift appraisal/check-in.

Business customers edit items in a data grid. Barcode validation is visible before save/submit, and invalid rows block those actions. This supports the operational model where business vendors label equipment ahead of time using purchased barcode blocks.

### API Client Behavior

The web API client requires `VITE_API_BASE_URL` at startup/build time. Local watcher scripts set it to `http://localhost:4000`; Traefik-backed development and container builds set it to `/api` so browser requests use the same-origin reverse proxy.

## API Application

The API is a Fastify service. `/health` is public. Feature routes are registered as encapsulated plugins under `apps/api/src/routes`. Catalog routes require a verified token; customer workflow routes use a scoped `requireCustomer` hook; business-only routes add a route-level role hook. Request params and bodies are validated at the route boundary with shared Zod schemas through `fastify-type-provider-zod`.

### API Endpoints

| Method  | Path                                | Purpose                                                                   |
| ------- | ----------------------------------- | ------------------------------------------------------------------------- |
| `GET`   | `/health`                           | Health check.                                                             |
| `GET`   | `/me`                               | Return current customer with identity profile data.                       |
| `PUT`   | `/me/profile`                       | Update identity-owned profile fields through the configured provider.     |
| `PUT`   | `/me/business-information`          | Update business profile fields for business customers.                    |
| `PUT`   | `/me/notification-preferences`      | Update local notification preference data.                                |
| `GET`   | `/notifications`                    | List notifications for the current customer.                              |
| `POST`  | `/notifications/:id/read`           | Mark one notification read for the current customer.                      |
| `GET`   | `/catalog/item-types`               | Return shared item type catalog.                                          |
| `GET`   | `/catalog/equipment-manufacturers`  | Return equipment manufacturer names.                                      |
| `GET`   | `/catalog/pricing-guides/:itemType` | Return Markdown pricing guidance for an item type from API-bundled files. |
| `GET`   | `/consignments`                     | List current customer consignments.                                       |
| `POST`  | `/consignments`                     | Create a new draft consignment, or return the customer's existing draft (only one draft per customer, also enforced by `consignments_one_draft_per_customer`). |
| `PATCH` | `/consignments/:id`                 | Replace all items on a draft consignment.                                 |
| `POST`  | `/consignments/:id/submit`          | Validate and submit a draft consignment, then write export.               |
| `GET`   | `/consignments/:id/status`          | Return Gearshift item snapshots linked to one consignment (drives the `received` view). |
| `GET`   | `/consignments/:id/status/:gearshiftItemId/history` | Return the append-only event timeline for one item (drives the item-history drawer). |
| `GET`   | `/payouts`                          | Return payouts (checks/electronic payments) issued to the linked customer, with line items. |

### Consignment Submission Behavior

Submission validates that the consignment belongs to the authenticated customer, is still `draft`, has at least one item, and satisfies role-specific profile and barcode rules. On success the API:

- Sets status to `submitted`.
- Records submission timestamp, Gearshift GUID when known, and the customer's primary/default vendor code when present (informational only — see Important Domain Constraints).
- Locks the local profile flag.
- Builds a consignment export payload.
- Writes the export through the S3 exporter service.
- Returns the submitted consignment plus `s3Key`.

## Gearshift Integration

The Gearshift worker consumes protobuf events from RabbitMQ. It asserts a topic exchange, binds one queue to all known Gearshift routing keys, and configures a dead-letter exchange/queue. Messages are acknowledged after successful processing and negatively acknowledged without requeue on failure.

### Event Handling

| Event                       | Behavior                                                                      |
| --------------------------- | ----------------------------------------------------------------------------- |
| `remote_account_linked`     | Links a local customer to a Gearshift GUID by email.                          |
| `consignment_accepted`      | Moves a `submitted` consignment to `received` and notifies the customer.      |
| `item_checked_in`           | Records the item→consignment link, appends a `checked_in` history event, and notifies the customer that an item was received. |
| `item_checked_out`          | Records the item→consignment link, appends a `checked_out` history event, and notifies the customer that an item was reclaimed. |
| `item_updated`              | Upserts the Gearshift item snapshot (and its consignment link when the payload carries one); appends a `price_updated` history event when the stored price changed; requires envelope Gearshift GUID. |
| `item_sold`                 | Records the item→consignment link, appends a `sold` history event (with the sale amount), and notifies the customer that an item sold. |
| `item_note_added`           | Appends a note to an item snapshot and a `note_added` history event; records the consignment link when the event carries one. |
| `check_issued`              | Persists a `payouts`/`payout_items` record and notifies the Gearshift-linked customer that a check was issued. |
| `electronic_payment_issued` | Persists a `payouts`/`payout_items` record and notifies the Gearshift-linked customer that an electronic payment was issued. |

Processed integration messages are persisted so repeated message IDs can be handled idempotently.

## Proposed CSV Importer

A future CSV importer has been discussed but is not currently implemented. The working specification lives in `docs/csv-importer-spec.md`. When built, a rejected auto-import will surface as a consignment in the `rejected` state pending manual inspection.

## Notifications

Express Pass stores in-app notifications for Gearshift-driven events. Notification preferences are stored for future delivery channels, but email/SMS sending is not currently implemented.

The current worker creates notifications for received consignments, received/reclaimed items, sold items, issued checks, and electronic payments. The web app can list notifications and mark them read.

## Local Development and Infrastructure

### Common Commands

| Command                                  | Purpose                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| `npm install`                            | Install monorepo dependencies.                                                    |
| `npm run dev`                            | Run API, Gearshift worker, and web watchers with explicit local configuration.    |
| `npm run dev:infra`                      | Start Traefik, shared PostgreSQL, RabbitMQ, Garage, and Authentik infrastructure. |
| `npm run dev:traefik`                    | Start infrastructure and local app watchers configured for Traefik routing.       |
| `npm run build`                          | Build all workspaces.                                                             |
| `npm run test --workspaces --if-present` | Run workspace tests that exist.                                                   |
| `npm run typecheck`                      | Run TypeScript project references.                                                |
| `npm run seed`                           | Dev seed (`apps/gearshift-worker/scripts/seed.ts`): give `customer@example.com` a `received` consignment with item history. Requires infra up and the worker running; publishes real Gearshift events one at a time. Idempotent; reseed from scratch by recreating the DB. |

### Docker Layout

Compose files live at the repository root. Supporting infrastructure config lives under `.docker`:

| Path                     | Purpose                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `docker-compose.yml`     | Base Compose stack for Traefik, PostgreSQL, RabbitMQ, API, worker, and web.         |
| `docker-compose.dev.yml` | Local dev overlay for Authentik, pgAdmin, host routing, and container-app profiles. |
| `.docker/traefik`        | Dynamic Traefik routing config.                                                     |
| `.docker/postgres`       | Shared PostgreSQL initialization for app and Authentik databases.                   |
| `.docker/garage`         | Garage S3-compatible object storage configuration and local bucket bootstrap.       |
| `.docker/authentik`      | Authentik blueprint for local OIDC applications and seeded users.                   |
| `.docker/pgadmin`        | pgAdmin OAuth and server configuration.                                             |

Traefik routes the portal and API on port 80 in container-style environments:

| URL                                                   | Service           |
| ----------------------------------------------------- | ----------------- |
| `http://localhost` or `http://web.localhost`          | Web portal        |
| `http://api.localhost` or `http://localhost/api`      | API               |
| `http://traefik.localhost/dashboard/`                 | Traefik dashboard |
| `http://auth.localhost`                               | Authentik         |
| `http://pgadmin.localhost` or `http://localhost:5050` | pgAdmin           |
| `http://localhost:3900`                               | Garage S3 API     |

Garage is configured as a single-node local object store and uses Garage's
development bootstrap flags to create the deterministic development key and the
`local-consignments` bucket. Local API watchers use
`S3_ENDPOINT=http://localhost:3900`; containerized API runs use
`S3_ENDPOINT=http://garage:3900`.

## Testing Expectations

The repository currently includes unit tests for shared helpers, API identity providers, Gearshift worker broker/handler behavior, and web components. Documentation-only changes should not affect application behavior, but the following checks are appropriate after editing this spec:

```sh
npm run typecheck
npm test --workspaces --if-present
```

For infrastructure changes, validate Compose rendering:

```sh
docker compose -f docker-compose.yml config
docker compose -f docker-compose.yml -f docker-compose.dev.yml config
```

## Known Constraints and Defaults

- Express Pass is the canonical product name.
- Customer profile fields are identity-provider-owned; local PostgreSQL profile data is workflow metadata and linkage state.
- S3 export behavior is part of submission, even in local/dev configurations where a local or configured endpoint may be used.
- Gearshift is the authoritative source for post-submission item state, and for advancing a consignment from `submitted` to `received`.
- Public item barcode assignment is Gearshift/check-in driven; business barcode entry is customer-driven.
- Public vendors default to vendor code `200` for legacy application compatibility.
- Vendor code is not a unique system identifier and must not be used for uniqueness, authorization, or durable object identity. It is a warehouse sorting bucket: shared by every public consignor, and a business may hold several at once, reused every season.
- Barcode uniqueness is enforced per sale, not globally — do not copy Gearshift's own global-forever uniqueness assumption; it does not actually clear its item table between sales, so barcode blocks are legitimately reused sale-to-sale.
- `check_issued`/`electronic_payment_issued` events are persisted as structured `payouts`/`payout_items` rows (not just a notification), so the portal can show real payout history.
- Pricing guides are Markdown files bundled with the API and read from disk on each request so file updates are visible without restarting the API process.
- This document describes current behavior and should be updated alongside meaningful architecture, API, workflow, or infrastructure changes.
