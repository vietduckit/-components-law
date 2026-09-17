# Unified Contract Payment Data Model — Contract Payment Schedule Collection + By Service Task-Trigger — Design Spec

Date: 2026-09-17

Status: Schema already built by the user directly in the Admin UI (confirmed via screenshots, see §4). This spec documents the as-built schema, fills the remaining gaps needed to implement the automation logic, and supersedes `2026-09-15-by-case-payment-request-automation-design.md` §4's `paymentSchedule.installments[]` JSON approach for By Case.

## 1. Overview

By Case's installment schedule currently lives as a JSON array inside `contracts.paymentSchedule` (`{installments: [...]}`), read/written by 3 separate JS Blocks that each parse/rebuild that structure by hand (`ContractCreateForm.js`, `ContractDetailView.js`, `ContractPaymentScheduleDetailBlock.js`). This works but doesn't extend cleanly: there's no real FK from a `paymentRequests` row back to "which installment created me" (today it's an implicit match on `installmentNo`), no referential integrity, and no way to reuse the same shape for By Service (whose billing unit isn't an installment schedule at all — it's per-service, driven by task completion, per the By Service business flow agreed on 2026-09-16/17).

This spec replaces the JSONB approach with a real collection, `contractPaymentSchedule` (one row per installment, proper FK to `contracts` and to the `paymentRequests` it generates), and adds a lightweight task-trigger mechanism for By Service that needs no new collection at all — it reuses `contractServices`/`projectServices` (already the natural billing unit) plus one new boolean on `tasks`.

Together with the existing `contractBillingPlans` collection (Retainer, shipped 2026-09-08), all 3 contract types now follow the same shape: `contracts` holds common fields, each type's own billing unit lives in its own collection or reuses an existing one, and `paymentRequests` gets a nullable FK back to whichever billing unit produced it.

## 2. Goals

- By Case's installment schedule is a real, queryable collection with FK integrity to both `contracts` and `paymentRequests` — no more JSON parsing to answer "which installments does this contract have" or "which Payment Request came from which installment."
- By Service gets task-completion-triggered Payment Request creation, matching the business flow already agreed: 1 service = 1 Payment Request, created (not merely activated) once every task the lawyer flagged as a payment trigger for that service reaches `done`.
- The existing By Case activation rules (condition met AND due date, in either order) carry over unchanged and are reused as-is for By Service's own activation.
- No auto-creation of a real Payment or Invoice — unchanged from the existing convention; an active Payment Request is still a queue item for a human.

## 3. Non-goals

- **Migrating existing contracts' `paymentSchedule` JSON into `contractPaymentSchedule` rows is a separate, explicit follow-up task**, not bundled into this spec's implementation — see §7. This spec's triggers only act on new rows created from this point forward; nothing in this spec back-fills history.
- **Not changing `contractBillingPlans` (Retainer)** — already correct, untouched.
- **Not adding a By Service child collection.** `contractServices` / `projectServices` already are the billing unit; adding another collection on top would duplicate data that already exists (violates this project's own "don't design for hypothetical future" convention already applied elsewhere this session).
- **Not auto-creating Payment/Invoice records** — same convention as the By Case spec's §3.
- **Not changing `dueDate`/`conditionMet`/`status` on `paymentRequests`** — they keep doing exactly what they already do; the new FKs (§4) only add "where did this PR come from," not new state.

## 4. Schema — as already built (confirmed via Admin UI screenshots, 2026-09-17)

### New collection: `contractPaymentSchedule` ("Contract Payment Schedule")

| Field display name | Field name | Type | Notes |
|---|---|---|---|
| ID | `id` | snowflakeId | title field |
| contractId | `contractId` | bigInt | raw FK column |
| Contracts | `contracts` | belongsTo → contracts | many-to-one; despite the plural display name this is a single parent contract |
| Installment No | `installmentNo` | bigInt | order within the contract |
| Label | `label` | string | e.g. "Đợt 1 - Ký hợp đồng" |
| Percentage | `percentage` | double | nullable in practice — a fixed-amount installment has no percentage |
| Amount | `amount` | float | resolved amount in contract currency |
| Trigger Type | `triggerType` | string, single select | should carry the same 3 options as `paymentRequests.triggerType` — **confirm the option list matches `on_signed`/`on_task_done`/`on_case_done` exactly** before wiring the trigger (same caveat the 2026-09-15 spec raised for `paymentRequests.triggerType`) |
| Payment Requests | `paymentRequests` | hasMany → paymentRequests | reverse of the new belongsTo below |
| Created at/by, Updated at/by | `createdAt`/`createdBy`/`updatedAt`/`updatedBy` | standard | unchanged NocoBase system fields |

**Open item**: the collection's actual underlying table name wasn't visible in the Admin UI field list (only the collection's display name and field names are). Before writing the SQL trigger file, confirm the real table name (almost certainly `contractPaymentSchedule` or `contractPaymentSchedules` — this project's other collections are plural, e.g. `contracts`, `tasks`, `paymentRequests`) via `information_schema.tables` or the collection's own settings panel.

### `paymentRequests` — new fields added

| Field display name | Field name | Type | Used by |
|---|---|---|---|
| Source Snapshot | `sourceSnapshot` | json | **Purpose to confirm with user** — presumed to be a point-in-time snapshot of whichever record generated this PR (the schedule row's label/percentage/amount, or the service's totalAmount/comboName), so financial reporting stays accurate even if the source row is later edited — same audit-trail role `pricingSnapshot` already plays for combo-priced `projectServices` rows. Not yet populated by any trigger — this spec proposes what writes it (§5). |
| Installment No | `installmentNo` | bigInt | By Case — denormalized copy of `contractPaymentSchedule.installmentNo`, kept directly on the PR so existing frontend code (`ContractPaymentScheduleDetailBlock.js`'s `summarizePaymentRequestsByInstallment`, keyed by `installmentNo`) keeps working without a join |
| Contract Payment Schedule | `contractPaymentSchedule` | belongsTo → contractPaymentSchedule | By Case — which installment produced this PR |
| Case Services | `projectServices` | belongsTo → projectServices | By Service — which case-level service line produced this PR |
| Contract Services | `contractServices` | belongsTo → contractServices | By Service — trace back to the original contract-level service definition, same dual-link convention already used in `CaseCreateForm.js`'s `createProjectService()` payload (`contractServiceId` + `projectServiceId` both sent together) |

`dueDate`, `conditionMet`, `status`, `triggerType` (already existing on `paymentRequests`) are unchanged — they remain the single source of truth for a PR's own activation state; `contractPaymentSchedule` stays a purely static definition (no dueDate/conditionMet duplicated there), avoiding a two-places-to-update bug.

### `tasks` — new field added

| Field display name | Field name | Type | Notes |
|---|---|---|---|
| isPaymentTrigger | `isPaymentTrigger` | boolean (checkbox) | lawyer ticks this on any task, in any case, that should count toward that task's service's payment trigger |

Already-existing relevant fields on `tasks` (unchanged, just noted for §5): `linkedPaymentRequestId` (belongsTo → paymentRequests, By Case's existing single-task-to-single-PR link), `contractService`/`caseService`/`quotationService`/`companyService` (belongsTo, confirmed live in the 2026-09-15 spec's §4 and again in this session's screenshots).

**Open item**: `caseService`'s raw FK column name (likely `caseServiceId` or `projectServiceId` — this project has a recurring gotcha where a `belongsTo` association's display/API name differs from its actual `foreignKey` column, already hit once with `linkedPaymentRequestId` → real column `paymentRequestId`). Confirm the real column name via the `fields` metadata table before writing the By Service trigger (§5) — the same verification step the 2026-09-15 spec already had to do for `tasks.linkedPaymentRequestId`.

## 5. Automation logic

### By Case — rewritten from JSON-parsing to row-based

| Trigger (current, JSON-based) | Replacement (row-based) |
|---|---|
| `by_case_create_scheduled_payment_requests()` — `AFTER INSERT ON contracts`, loops `jsonb_array_elements(paymentSchedule->'installments')` | `AFTER INSERT ON "contractPaymentSchedule"` — one row insert = one PR created directly, no JSON parsing. Sets `contractPaymentScheduleId = NEW.id`, `installmentNo = NEW."installmentNo"`, `sourceSnapshot = jsonb_build_object('label', NEW.label, 'percentage', NEW.percentage, 'amount', NEW.amount)`. |
| `by_case_task_done_activates_payment_request()` | Unchanged — still keyed off `tasks."paymentRequestId"`, nothing here depends on where the PR came from. |
| `by_case_case_done_activates_payment_request()` | Unchanged. |
| `by_case_due_date_activates_payment_request()` | Unchanged — already generic over any `paymentRequests` row regardless of contract type, reused as-is by By Service below. |

Consequence for `ContractCreateForm.js`: building a schedule becomes inserting `contractPaymentSchedule` rows (one API call per installment, or a bulk create) instead of assembling a `paymentSchedule` JSON blob. `ContractDetailView.js` / `ContractPaymentScheduleDetailBlock.js` switch from parsing `contract.paymentSchedule.installments` to querying `contractPaymentSchedule` filtered by `contractId` (with `appends: ["paymentRequests"]` to get each installment's generated PR in one call).

### By Service — new trigger, PR creation instead of activation

New function `by_service_task_group_done_creates_payment_request()`:

- **Fires**: `AFTER UPDATE OF status ON tasks`.
- **Guard**: `NEW."isPaymentTrigger" = true AND NEW.status = 'done' AND NEW."<caseServiceRawColumn>" IS NOT NULL` (exact column name from §4's open item).
- **Check**: among sibling tasks sharing the same case-service link (`WHERE "<caseServiceRawColumn>" = NEW."<caseServiceRawColumn>" AND "isPaymentTrigger" = true`), are they now **all** `status = 'done'`? (AND logic, per the confirmed business rule — not ANY-one-of-them.)
- **Idempotency guard**: skip if a `paymentRequests` row already exists with `"projectServices" = NEW."<caseServiceRawColumn>"` (a service's task group can only produce one PR, ever — re-marking a task done after being reopened must not create a second one).
- **If both conditions hold**: look up the `projectServices` row (for `totalAmount`, `contractServiceId`) and its parent `contracts` row (via `projectServices` → `projects` → `contractId`, or directly if `projectServices.contractServiceId` → `contractServices.contractId` gives a shorter path — confirm which join is available), then `INSERT INTO "paymentRequests"` with `status = 'pending'`, `conditionMet = true` (the task condition already happened by definition), `triggerType = 'on_task_done'`, `projectServices = <the service row id>`, `contractServices = <its contractServiceId>`, `requestedAmount = projectServices.totalAmount`, `sourceSnapshot = jsonb_build_object('serviceName', ..., 'totalAmount', ...)`, `dueDate = NULL` — stays `pending` until a human sets a due date, at which point the existing, unchanged `by_case_due_date_activates_payment_request()` trigger activates it exactly like a By Case installment.

This mirrors the By Case pattern closely enough that the *activation half* (due-date trigger) is shared code — only the *creation half* differs (upfront-at-signing for By Case vs. task-group-completion for By Service).

## 6. Schema confirmed (via `JsField/DiagnoseUnifiedPaymentSchemaFields.js`, run 2026-09-17)

1. **Table name**: `contractPaymentSchedules` (plural, tableName same as collection name).
2. **`tasks` raw FK columns**: `caseService` → `projectServiceId`; `contractService` → `contractServiceId`; `linkedPaymentRequestId` → `paymentRequestId` (already known); `isPaymentTrigger` confirmed present, no FK.
3. **`contractPaymentSchedules.triggerType`** option list confirmed identical to `paymentRequests.triggerType`: `on_signed` / `on_task_done` / `on_case_done`.
4. **`sourceSnapshot`** (json, on `paymentRequests`) has no description set in the field metadata — its intended shape is not otherwise documented. This spec proceeds with a minimal proposed shape (§5: `{label/serviceName, percentage, amount/totalAmount}` depending on contract type) as a reasonable audit-trail default; adjust later if the user had something more specific in mind.
5. **Join path `projectServices` → `contracts`**: `projectServices` has no direct `contractId` column. Path is `projectServices.projectId → projects.id → projects.contractId → contracts.id`. Its originating `contractServices` row (nullable — an ad-hoc case service added directly on the case has none) is found via the reverse link `contractServices.projectServiceId = projectServices.id`.

Full field dumps for `contractPaymentSchedules`, `paymentRequests`, `tasks`, `projectServices`, `contractServices` are preserved in this session's diagnostic output — see `JsField/DiagnoseUnifiedPaymentSchemaFields.js` for the script that produced them.

**Behavior change surfaced by this confirmation**: `contractPaymentSchedules` has no `dueDate` column (dueDate/conditionMet live only on the generated `paymentRequests` row, per this spec's own §4 design). This means a newly created request always starts `pending` with no due date — even an `on_signed` installment filled in at contract signing no longer becomes `active` immediately the way the old JSON-based flow could (a pre-filled `paymentDate` on the installment used to allow that). A due date must now always be set as a separate step directly on the Payment Request. Not fixed here since the schema (no `dueDate` column on the schedule collection) was the user's own design — flagged for awareness.

## 7. Deployment

1. **Done**: `pgsql/unified_contract_payment_schedule.sql` — idempotent (`CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS`/`CREATE TRIGGER`). Drops the superseded `trg_by_case_create_scheduled_payment_requests` trigger on `contracts` (function left in place for history), adds `by_case_schedule_row_creates_payment_request()` (`AFTER INSERT ON "contractPaymentSchedules"`) and `by_service_task_group_done_creates_payment_request()` (`AFTER UPDATE OF status ON tasks`). `by_case_task_done_activates_payment_request()`, `by_case_case_done_activates_payment_request()`, `by_case_due_date_activates_payment_request()` stay defined in `by_case_payment_request_automation.sql`, unchanged — both files must remain installed together.
2. `ContractCreateForm.js`, `ContractDetailView.js`, `ContractPaymentScheduleDetailBlock.js` — switch from `paymentSchedule` JSON to `contractPaymentSchedule` collection calls.
3. `TaskManagement.js` / `TaskDetailView.js` — add the `isPaymentTrigger` checkbox to the task form (By Service cases only — hide/disable for By Case and Retainer cases, where the existing `linkedPaymentRequestId` selector already covers the same role).
4. **Separate follow-up, not part of this deployment**: a one-time migration script for existing contracts' `paymentSchedule` JSON → `contractPaymentSchedule` rows, plus backfilling `paymentRequests.contractPaymentScheduleId` on already-existing PRs (§3).
5. Test plan: repeat the 2026-09-15 spec's §7 test plan against the new row-based mechanism for By Case (same expected outcomes, different underlying storage); add a By Service test — create a case with 3 services (10tr/20tr/30tr), tag 2 tasks on service A as `isPaymentTrigger`, mark one done (confirm no PR yet), mark the second done (confirm exactly 1 PR created for service A, `pending`, `conditionMet: true`, amount 10tr), set a `dueDate` (confirm it flips to `active`).
