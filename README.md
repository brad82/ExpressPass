# Express Pass

TypeScript monorepo for the Express Pass application.

## Apps

- `apps/web`: React, Vite, MUI Express Pass portal.
- `apps/api`: Fastify API plus shared backend services for PostgreSQL, S3 export, identity profiles, and notification reads.
- `apps/gearshift-worker`: RabbitMQ worker for Gearshift protobuf events and notification creation.
- `packages/shared`: Shared Zod schemas, types, catalogs, and notification templates.

## Quick Start

```sh
npm install
npm run dev
```

For local infrastructure:

```sh
docker compose up --build
```

Docker Compose files live at the repository root. Supporting configuration for
Traefik, PostgreSQL initialization, Garage S3 storage, Authentik, and pgAdmin
lives under `.docker/`. The app and Authentik use separate logical databases on
the shared `postgres` service. Local S3 exports are written to the Garage bucket
`local-consignments` through <http://localhost:3900>. To rebuild local databases
and object storage from scratch after infrastructure changes, stop the stack
with volumes and start it again:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
npm run dev:infra
```

Traefik routes the Dockerized apps on port 80:

- Web app: <http://localhost> or <http://web.localhost>
- API: <http://api.localhost> or <http://localhost/api>
- Traefik dashboard: <http://traefik.localhost/dashboard/>

For watch-mode development without rebuilding containers after code changes, run the
infrastructure and Traefik first:

```sh
npm run dev:infra
```

Then run the API, worker, and web watchers:

```sh
npm run dev
```

Traefik will keep serving the app at <http://localhost>, while routing to the local
Vite server on port 3000 and local API watcher on port 4000. The local Gearshift
worker watcher also starts with `npm run dev`; it consumes RabbitMQ messages
from `gearshift.customer-events` when `RABBITMQ_URL` is configured. `npm run dev:traefik`
starts the local RabbitMQ dependency and configures the worker automatically.

You can also start both steps together:

```sh
npm run dev:traefik
```

### Seeding demo data

With infra up and the worker running (`npm run dev` / `npm run dev:traefik`), you can
give the public customer a `received` consignment with a full item history:

```sh
npm run seed
```

It inserts a submitted consignment for `customer@example.com`, then publishes real
Gearshift events (checked in, price drop, sold, clerk note) that the worker turns into
snapshots and the item-history timeline. (The script lives in
`apps/gearshift-worker/scripts/seed.ts`; `npm run seed -w apps/gearshift-worker` also works.) Sign in as that user and open `/consignments`
to see the Item Status screen and click a row for the Item History drawer. The script
is idempotent; to reseed from scratch, recreate the database (`docker compose ... down -v`).

The Traefik-backed dev environment includes Authentik for OAuth/OIDC:

- Authentik: <http://auth.localhost>
- Admin login: `akadmin` / `authentik`
- Public customer login: `customer@example.com` / `customer`
- Business customer login: `business@example.com` / `business`
- Express Pass OIDC issuer: <http://auth.localhost/application/o/expresspass/>
- Express Pass client ID: `expresspass`
- Express Pass callback: <http://localhost/auth/callback>
- pgAdmin: <http://pgadmin.localhost> or <http://localhost:5050>
- pgAdmin OIDC issuer: <http://auth.localhost/application/o/pgadmin/>
- pgAdmin client ID: `pgadmin`
- pgAdmin callback: <http://pgadmin.localhost/oauth2/authorize>
- pgAdmin includes default entries for the app and Authentik databases on the shared `postgres` service.
- The `profile` scope includes `given_name`, `family_name`, `phone_number`,
  `address`, `business_name`, `gst_number`, `vendor_id`, and `groups`.

Browser requests must be authenticated with an OIDC bearer token. The web app
uses OIDC authorization code + PKCE and sends API requests through Traefik's
same-origin `/api` route when running `npm run dev:traefik`.

## Currency Handling

All machine-to-machine currency values are stored and transmitted as integer cents. API payloads, database columns, S3 exports, and RabbitMQ messages use names such as `priceCents` and `valueSoldCents`.

Human-facing UI accepts and displays dollar-cent values, then converts at the application boundary before sending data to the API.

## Identity Profiles

Customer-maintained profile fields are owned by the configured identity provider and updated through the API. In production this can be Amazon Cognito; dev or self-hosted deployments can use Authentik.

IdP-owned fields are first name, last name, email, phone, mailing address, business name, GST number, and business vendor ID. PostgreSQL keeps workflow data such as customer UUID, IdP subject, Gearshift linkage, consignments, notifications, snapshots, and exports.

Configure API authentication with `OIDC_ISSUER`, `OIDC_JWKS_URL`, and `OIDC_AUDIENCE`. The API verifies bearer tokens with `fastify-jwt-jwks`. Configure profile storage with `IDENTITY_PROVIDER=cognito` or `IDENTITY_PROVIDER=authentik`. Cognito profile updates also need `COGNITO_USER_POOL_ID`; Authentik profile updates need `AUTHENTIK_BASE_URL` and `AUTHENTIK_TOKEN`.

## Item Barcodes

Public users cannot edit item barcodes. Gearshift item state arrives through protobuf `ItemUpdated` events.

Business users assign their own barcodes while editing items. Each barcode must use `000-0000` and be unique within the consignment.
