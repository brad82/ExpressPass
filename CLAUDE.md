# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

For full architecture, data model, API endpoint list, and product/workflow rules, see **`docs/spec.md`** — keep it in sync with meaningful changes. The proposed (not yet implemented) CSV importer service is specified in `docs/csv-importer-spec.md`; `apps/importer` currently contains only early auth scaffolding for it.

## What this is

Express Pass is a customer-facing portal for a consignment sale ("Gearshift" is the existing on-premises sale system it integrates with). Public and business consignors manage their identity profile, build and submit consignments, follow each consignment through its lifecycle, and get notifications as Gearshift events arrive. TypeScript monorepo, npm workspaces.

**Consignment lifecycle**: `draft` → `submitted` → `received` (plus `rejected`, reserved — no producer yet, for future rejected business auto-imports). Only `draft` is editable; `submitted`/`received` are read-only. `POST /consignments/:id/submit` sets `submitted`; the Gearshift `consignment_accepted` event (worker) advances a `submitted` consignment to `received`. There is no standalone "sale status" — per-consignment item status lives behind `GET /consignments/:id/status` and the `/consignments` page's tab switcher (a customer may hold several consignments in one sale). Snapshot→consignment scoping goes through the `gearshift_item_links` table populated by the worker.

- `apps/web` — React 19 / Vite / MUI portal. Redux Toolkit Query for API access, OIDC auth code + PKCE (`react-oidc-context`) for auth. Routes in `apps/web/src/components/PortalRoutes.tsx`, API client in `apps/web/src/api.ts`.
- `apps/api` — Fastify API (customer profile, catalog, consignments, per-consignment item status, notifications, S3 export). Route plugins under `apps/api/src/routes`; persistence via `apps/api/src/repositories`; the entire Postgres schema is a single `apps/api/migrations/001_initial.sql` mounted into Postgres via `docker-compose.yml` — no migration runner and no chain (nothing released), so edit that file and recreate the DB (`docker compose ... down -v`) to change schema.
- `apps/gearshift-worker` — RabbitMQ consumer for Gearshift protobuf events. Event routing in `apps/gearshift-worker/src/handlers/index.ts`.
- `packages/shared` (`@expresspass/shared`) — shared Zod schemas (`schemas.ts` is the source of truth for domain contracts), catalog helpers, currency helpers, UUIDv7, notification templates, Gearshift protobuf support.
- `apps/importer` — not yet a real workspace (no `package.json`); scaffolding toward the proposed CSV validation service.

## Common commands

```sh
npm install                              # install monorepo deps
npm run dev                              # run api + gearshift-worker + web watchers (explicit local env inline in the script)
npm run dev:infra                        # start Traefik, Postgres, RabbitMQ, Garage, Authentik via Docker
npm run dev:traefik                      # dev:infra, then watchers configured for Traefik routing (http://localhost)
npm run build                            # build all workspaces
npm run lint                             # eslint .
npm run typecheck                        # tsc -b (project references)
npm test                                 # npm run test --workspaces --if-present (vitest per workspace)
```

Run one workspace's tests: `npm test -w apps/api`, `npm test -w apps/web`, `npm test -w packages/shared`, etc. Run a single test file with vitest directly, e.g. `npx vitest run src/services/identity-profile-provider.test.ts -w apps/api` or `cd apps/api && npx vitest run <path>`.

To reset local infra state (Postgres/Garage volumes) after infra changes:
```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
npm run dev:infra
```

Validate Compose changes without starting anything: `docker compose -f docker-compose.yml config` (add `-f docker-compose.dev.yml` for the dev overlay).

## Key conventions

- **Currency is always integer cents** across API payloads, DB columns, S3 exports, and RabbitMQ messages (`priceCents`, `valueSoldCents`, ...). Only the UI layer converts to/from dollar-cent display values, at the boundary.
- **IDs**: Express Pass-generated entities use UUIDv7. Gearshift-originated IDs are external and must never be treated as Express Pass IDs. Vendor codes (e.g. the public default `200`) are sale logistics/warehouse-sorting buckets only, shared by many customers and reused every season — never use one for uniqueness, authorization, or identity; a business may hold more than one at once (`IdentityProfile.vendorCodes: number[]`, not a single value).
- **Identity-owned vs local fields**: name, email, phone, address, business name/GST/vendor codes live in the configured identity provider (Authentik locally, Cognito in prod — set via `IDENTITY_PROVIDER`) and are updated through `apps/api/src/services/identity-profile-provider.*`. Postgres only stores workflow state (customer row, role, profile lock, Gearshift GUID, consignments, notifications, snapshots, item→consignment links, exports).
- **Public vs business consignment items**: public customers never set barcodes (assigned later by sale clerks during Gearshift check-in); business customers pre-assign unique barcodes from purchased blocks and are blocked from saving/submitting with invalid or not-their-own-vendor-code barcodes (`barcodeVendorCode` in shared).
- **Sales are scoped, not global**: at most one `sales` row is `active` at a time; consignments/consignment items are stamped with that `sale_id` at creation, and barcode uniqueness is enforced per sale (`consignment_items_sale_barcode_unique`) — deliberately *not* globally, unlike Gearshift's own item table, which the sale system does not clear between sales.
- **Auth**: API routes require a verified OIDC bearer token (`fastify-jwt-jwks`, configured via `OIDC_ISSUER`/`OIDC_JWKS_URL`/`OIDC_AUDIENCE`); route-scoped hooks add "customer loaded" or "specific role" requirements on top. Request bodies/params are validated at the route boundary with shared Zod schemas via `fastify-type-provider-zod`.
- Path alias `@expresspass/shared` resolves to `packages/shared/src/index.ts` (see `tsconfig.base.json`); apps also depend on it as a `file:../../packages/shared` npm dependency, so rebuild `packages/shared` (`npm run build -w packages/shared`) after changing it if a consuming app runs from `dist` rather than the watcher.

## Local environment

`npm run dev` and `npm run dev:traefik` embed a full set of local dev env vars inline in `package.json` — this is the reference for every env var each app needs, since there's no separate `.env` checked in. Traefik-backed dev exposes the portal at `http://localhost`/`http://web.localhost`, API at `http://api.localhost` or `http://localhost/api`, Authentik at `http://auth.localhost` (seeded users documented in `docs/spec.md` and `README.md`), pgAdmin at `http://pgadmin.localhost`. Compose/infra config lives under `.docker/` (`traefik`, `postgres`, `garage`, `authentik`, `pgadmin` subfolders); compose files themselves are at the repo root.
