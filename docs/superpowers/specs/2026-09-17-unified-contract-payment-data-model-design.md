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

## 6. Open items to resolve before writing the SQL file

1. Confirm `contractPaymentSchedule`'s real table name (§4).
2. Confirm `tasks`' `caseService` raw FK column name (§4).
3. Confirm `contractPaymentSchedule.triggerType`'s option list matches `paymentRequests.triggerType` exactly (§4).
4. Confirm `sourceSnapshot`'s intended shape/purpose with the user (§4) — this spec proposes a minimal shape (§5) but the field was added by the user directly, not from this spec's own earlier proposal, so its intended full shape should be confirmed rather than assumed.
5. Confirm the join path from `projectServices` to `contracts` (via `projects.contractId` or a more direct FK) for the By Service trigger's `INSERT`.

## 7. Deployment (once §6 is resolved)

1. New SQL file `pgsql/unified_contract_payment_schedule.sql` — idempotent (`CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS`/`CREATE TRIGGER`), replacing `by_case_create_scheduled_payment_requests()` and adding `by_service_task_group_done_creates_payment_request()`. `by_case_task_done_activates_payment_request()`, `by_case_case_done_activates_payment_request()`, `by_case_due_date_activates_payment_request()` carry over unchanged from `by_case_payment_request_automation.sql` (either kept in that file or moved into the new one for a single source of truth — recommend consolidating into the new file and marking the old one superseded, matching this project's existing supersession convention).
2. `ContractCreateForm.js`, `ContractDetailView.js`, `ContractPaymentScheduleDetailBlock.js` — switch from `paymentSchedule` JSON to `contractPaymentSchedule` collection calls.
3. `TaskManagement.js` / `TaskDetailView.js` — add the `isPaymentTrigger` checkbox to the task form (By Service cases only — hide/disable for By Case and Retainer cases, where the existing `linkedPaymentRequestId` selector already covers the same role).
4. **Separate follow-up, not part of this deployment**: a one-time migration script for existing contracts' `paymentSchedule` JSON → `contractPaymentSchedule` rows, plus backfilling `paymentRequests.contractPaymentScheduleId` on already-existing PRs (§3).
5. Test plan: repeat the 2026-09-15 spec's §7 test plan against the new row-based mechanism for By Case (same expected outcomes, different underlying storage); add a By Service test — create a case with 3 services (10tr/20tr/30tr), tag 2 tasks on service A as `isPaymentTrigger`, mark one done (confirm no PR yet), mark the second done (confirm exactly 1 PR created for service A, `pending`, `conditionMet: true`, amount 10tr), set a `dueDate` (confirm it flips to `active`).
