# CSV Importer and Validation Tool Specification

## Status

Proposed. This document captures the desired CSV importer behavior and architecture for future planning and rebuild work. The importer implementation is intentionally not part of the current codebase yet.

## Summary

Create a separate TypeScript REST service for validating CSV files before batch importing data into Express Pass. V1 validates consignment item CSVs only, but the service should be designed around a schema registry so future import types can be added without rewriting the HTTP layer or validation pipeline.

V1 is validation-only. It does not write to PostgreSQL, create consignments, submit consignments, call Gearshift, or enqueue import jobs. A later phase may add an import worker that calls the main Express Pass API rather than writing directly to the database.

## Goals

- Provide a dedicated API for CSV validation outside the main API/web app.
- Accept user-provided CSV files with explicit field-to-column mapping.
- Return structured validation results with row, cell, mapping, and global issues.
- Reuse existing Express Pass domain rules where possible.
- Keep the service extensible for additional import schemas later.
- Avoid server-side persistence in v1.

## Non-Goals for V1

- No actual batch import execution.
- No direct database writes.
- No file storage, validation job IDs, or retry queues.
- No UI for uploading CSV files.
- No auto-detection of CSV headers.
- No generic user-configurable rule builder.

## Service Shape

The importer should be its own workspace app, for example `apps/importer`, using TypeScript and Fastify to match the existing backend style. It should have its own package scripts, Dockerfile, config, routes, and tests.

The HTTP layer should be thin. CSV parsing, mapping validation, row validation, and global validation should live in reusable modules so they can be tested without starting the server.

The service should use a registry-style import schema interface:

```ts
type ImportSchema = {
  id: string;
  version: string;
  describe(): ImportSchemaDescription;
  validate(input: CsvValidationInput): ValidationResult;
};
```

The first registered schema should be `items`.

## Authentication

Mirror the main API auth posture:

- `/health` is public.
- Schema and validation endpoints require authentication.
- Local development may use dev headers.
- Production should be JWT/OIDC-ready.

The authenticated role matters because business item imports require valid unique barcodes, while public item imports should not require customer-supplied barcodes.

## Public API

### `GET /schemas/items`

Returns JSON metadata describing the canonical fields for consignment item imports.

The response should include:

- schema ID and version
- display name and description
- canonical fields
- required fields
- accepted value type
- example values
- field-specific notes
- global validation rules

Use `GET`, not `HEAD`, for JSON schema discovery because `HEAD` responses should not include a body.

### `HEAD /validate`

Lightweight capability check for clients.

Expected behavior:

- returns no body
- returns success when validation service is reachable
- includes headers for the default schema ID and version

### `POST /validate`

Accepts `multipart/form-data`.

Required parts:

| Part      | Type      | Purpose                                              |
| --------- | --------- | ---------------------------------------------------- |
| `file`    | CSV file  | Uploaded CSV content.                                |
| `mapping` | JSON text | Maps canonical field names to source CSV columns.    |

Optional parts:

| Part     | Type | Default | Purpose                         |
| -------- | ---- | ------- | ------------------------------- |
| `schema` | text | `items` | Selects the import schema to use. |

Example mapping:

```json
{
  "description": "Description",
  "itemType": "Type",
  "itemSize": "Size",
  "price": "Price",
  "qty": "Qty",
  "new": "New",
  "redTag": "Red Tag",
  "barcode": "Barcode"
}
```

## Consignment Item Schema

Canonical fields:

| Field         | Required | Type    | Notes                                                    |
| ------------- | -------- | ------- | -------------------------------------------------------- |
| `description` | Yes      | string  | Must be non-empty.                                       |
| `itemType`    | Yes      | number  | Must match a known shared catalog item type ID.          |
| `itemSize`    | Yes      | string  | Must be non-empty.                                       |
| `price`       | Yes      | money   | Human dollar input; parsed into integer `priceCents`.    |
| `qty`         | Yes      | integer | Must be a positive integer.                              |
| `new`         | Yes      | boolean | Accept values such as `true/false`, `yes/no`, `y/n`, `1/0`. |
| `redTag`      | Yes      | boolean | Same boolean parsing rules as `new`.                     |
| `barcode`     | Role-dependent | string | Required for business imports, not required for public imports. |

Business barcode rules:

- barcode is required
- barcode must use `000-0000` format
- barcode must be unique within the CSV

Public barcode rules:

- barcode is not required
- future implementation should decide whether provided public barcodes are ignored, rejected, or returned as warnings before build work begins

## Validation Result

`POST /validate` should return a JSON object:

```ts
type ValidationResult<TParsed = unknown> = {
  schema: string;
  valid: boolean;
  summary: {
    rows: number;
    parsedRows: number;
    errors: number;
    warnings: number;
  };
  rows: TParsed[];
  issues: ValidationIssue[];
};
```

Issue shape:

```ts
type ValidationIssue = {
  severity: "error" | "warning";
  scope: "mapping" | "row" | "cell" | "global";
  row?: number;
  field?: string;
  column?: string;
  code: string;
  message: string;
};
```

Behavior:

- Mapping errors should be returned before row-level validation when required mappings are missing.
- Cell issues should include row number, canonical field, and source column when available.
- Global issues should cover rules that require seeing multiple rows, especially duplicate business barcodes.
- Warnings are supported by the response contract, but v1 should primarily return errors for strict validation failures.
- Parsed rows should use canonical Express Pass shape where possible, including `priceCents`.

## CSV Handling

The CSV parser must support:

- header row
- comma-separated fields
- quoted fields
- escaped quotes inside quoted fields
- CRLF and LF line endings
- stable source row numbers for error reporting

The parser should reject malformed CSV with a clear `400` response.

## Error Handling

Use `4xx` responses for request-level failures:

- missing `file`
- missing `mapping`
- malformed mapping JSON
- unknown schema
- unsupported content type
- malformed CSV

Use `200` responses for successful validation requests, even when the CSV contains validation errors. In that case `valid` should be `false` and issues should describe the errors.

## Future Import Execution

Future import execution should likely run as a worker process that calls the main Express Pass API, rather than writing directly to PostgreSQL. This keeps database ownership and business logic centralized in the main API.

Future planning should decide:

- whether validation results are persisted
- whether an import job ID is created
- whether imports create a new draft consignment or update an existing draft
- how to handle partial success
- how to authorize imports for a customer or business account
- whether public uploads may include barcode data

## Test Plan

Unit tests:

- CSV parsing with quoted commas, escaped quotes, CRLF, and malformed quoted fields
- field mapping validation
- required cell validation
- item type validation
- price parsing
- positive quantity parsing
- boolean parsing
- barcode format validation
- duplicate barcode global validation

API tests:

- `GET /schemas/items` returns schema metadata
- `HEAD /validate` succeeds with schema headers and no body
- `POST /validate` accepts multipart CSV and mapping
- valid business CSV returns `valid: true`
- invalid CSV returns structured issues with row/cell/global details
- malformed mapping JSON returns `400`
- unknown schema returns `400`
- unsupported content type returns `415`

Acceptance checks:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## Example CSV

```csv
Description,Type,Size,Price,Qty,New,Red Tag,Barcode
Atomic Bent 100 skis,1,172 cm,299.99,1,no,false,123-4567
Burton Custom snowboard,2,156 cm,249.50,1,false,no,123-4568
Salomon S/Pro boots,3,27.5,189.00,1,yes,false,123-4569
```

## Open Questions

- Should public CSV uploads reject barcode mappings or allow them as ignored/warned fields?
- Should schema discovery support all schemas through `GET /schemas` once more import types exist?
- Should CSV files have a maximum row count or byte size in v1?
- Should future import execution create a new draft consignment by default or require a target draft ID?
- Should mapping presets be saved per business customer in a future UI?
