# By Case — Task-Triggered Payment Request Automation — Design Spec

Date: 2026-09-15
Status: Draft — pending user review

## 1. Overview

Today, a By Case contract's installment schedule (`paymentSchedule.installments`) is purely descriptive — nothing ever turns an installment into an actual `paymentRequests` row automatically. Accounting/lawyers have to remember to open the contract and click "Create payment request" in `ContractPaymentScheduleDetailBlock.js` for every installment, with no link at all to how the underlying case work is actually progressing. Separately, `paymentDate` is currently a hard-required field per installment whenever `billingCycle === "multiple_payments"` (`ContractCreateForm.js` `validate()`), even though a lawyer often cannot know a real due date until work is further along.

This spec automates that flow end-to-end for **By Case** contracts specifically (By Service is a separate, follow-up spec that builds on the vocabulary introduced here):

- `paymentDate` becomes optional on every installment, no exceptions.
- Every installment now declares **when it becomes payable** (`triggerType`): at contract signing, at a specific Task's completion, or at whole-Case completion.
- The moment a By Case contract with a schedule is saved, one `paymentRequests` row per installment is created immediately at `status: 'pending'` — accounting never has to remember to initiate a request.
- A pending Payment Request flips to `active` — meaning "ready for a human to review and act on" — only once **both** of the following are true, regardless of which happens first:
  1. its trigger condition has actually occurred, and
  2. it has a due date.
- Reaching `active` never auto-creates a real Payment or Invoice — a human still does that manually, unchanged from today's flow. This matches this project's existing convention (see `2026-09-07-retainer-billing-automation-design.md` §3: "Auto-approving the generated Payment Request... was never asked for").

**Mechanism choice: NocoBase Workflow, not Postgres triggers.** The two prior payment-automation specs in this project (`2026-09-05-contract-payment-status-workflow-design.md`, `2026-09-07-retainer-billing-automation-design.md`) deliberately moved away from NocoBase Workflow rows to Postgres triggers after hitting two real failures: a Workflow edited via API didn't take effect until manually toggled off/on (the running server caches workflow definitions in memory), and a Workflow row was silently lost when the dev database was restored from an older backup, because it lives only as data, not as a git-tracked file. This spec knowingly reverses that choice for this feature, at the user's explicit request, to get the ergonomic win of visually inspectable/editable logic in the Admin UI. See §3 for the trade-off this accepts.

## 2. Goals

- No installment's `paymentDate` is ever a hard requirement for a By Case contract.
- A By Case contract's Payment Requests exist (as `pending`) the moment the contract is saved with a schedule — no manual initiation step.
- Each installment carries an explicit `triggerType`: `on_signed` / `on_task_done` / `on_case_done`, chosen by the lawyer while building the schedule.
- A lawyer can explicitly link one specific Task to one specific pending `on_task_done` Payment Request (the lawyer's own choice — not automatic ordering/FIFO), so marking that Task `done` marks that installment's condition met.
- The already-existing "case auto-completes once all its tasks are done/cancelled" trigger (`case_auto_complete_when_tasks_done`, already shipped) additionally marks any `on_case_done`-type installment's condition met when it fires.
- `pending → active` requires both the trigger condition AND a due date, in either order.
- No new automation ever creates a real Payment or Invoice record.

## 3. Non-goals (explicitly out of scope for this iteration)

- **Not using Postgres triggers for this feature's logic.** Explicit, informed trade-off — accepted despite the specific documented incidents in this project (see §1) because the user wants Admin-UI-visible/editable logic. Concretely, this means: (a) this feature cannot be redeployed to a new environment by running one script/SQL file the way the prior two specs can — each of the 4 Workflows below must be manually rebuilt through the Admin UI on every environment; (b) any future edit to a Workflow's node graph made via API (rather than the UI) risks not taking effect until that Workflow is toggled disabled→enabled; (c) if this dev database is ever restored from an older backup again, these 4 Workflow definitions are lost and must be rebuilt by hand — the schema fields (§5) are not lost (they're normal DB columns), only the automation logic itself. Schema field registration (§5) still goes through the existing scripted, idempotent, git-tracked convention (`JsField/*.js` register scripts) — only the Workflow node graphs themselves are UI-only.
- **Not touching the existing SQL triggers** `case_auto_complete_when_tasks_done` or `auto_create_payment_request_on_case_done` (`pgsql/contract_payment_status_workflow.sql`). Both keep running exactly as they do today. This spec's WF3 (§6) reacts to the same "case became done" event independently and side-by-side — when a contract has a scheduled `on_case_done` installment, WF3 activates that specific installment's own request; the existing SQL trigger's lump-sum "outstanding balance" fallback still fires for contracts with no such scheduled installment (e.g., a By Case contract with `billingCycle` other than `multiple_payments`, or no schedule at all). No change needed to the existing SQL trigger to make this coexist correctly, since it already guards on `contract.paymentStatus <> 'paid'` and duplicate-PRs-across-two-mechanisms is an acceptable, already-accepted failure mode per that spec's own §6.4 note ("accounting sees two requests... rather than none").
- **By Service billing.** Separate, follow-up spec — reuses this spec's `paymentRequests.status` vocabulary (`pending`/`active`) and the "condition met AND due date" activation rule, but needs its own schema (per-service schedule) and its own Workflow trigger scoped by `serviceId`.
- **Auto-creating Payment/Invoice records.** An `active` Payment Request is a queue item for a human, never an automatic money-movement event.
- **Editing/reordering installments after a Task is already linked to one.** No migration UI for this; if a lawyer needs to change a linked installment, that's a manual fix-up (unlink the Task, adjust the schedule, relink), not built here.
- **Non-`multiple_payments` billing cycles.** `one_time`, `monthly`, `quarterly`, `milestone`, `manual` billing cycles are untouched — this spec only activates for schedules that actually have an `installments` array with rows.

## 4. Schema changes

**Verified against the live system on 2026-09-15 (Admin UI screenshots + a `collections/{name}/fields:list` diagnostic query, both run by the user) — every field this spec needs already exists. No field creation, no enum-option edit, no migration script. This section is now a confirmation record, not a to-do list.**

### `paymentRequests` — already has everything needed

| Field | Type (confirmed live) | Notes |
|---|---|---|
| `triggerType` | `string`, single select | Already registered. This spec is the first code to actually write/read it — confirm its live option list matches `on_signed` / `on_task_done` / `on_case_done` before wiring up WF1; add any missing option via the Admin UI's field editor (a UI edit to an existing field's enum, not a new field) if it doesn't. |
| `conditionMet` | `boolean` (checkbox) | Already registered, default presumably `false` — confirm the default in the Admin UI field editor. |
| `installmentNo` | `bigInt` (integer) | Already registered. |
| `status` | `string`, single select | Confirmed live enum (richer than this spec assumed): `draft`, `pending`, `submitted`, `active`, `checking`, `approved`, `converted`, `rejected`, `cancelled`. **`pending` and `active` already exist** — no enum edit needed. Every value besides `submitted` is currently unwritten by any existing JS Block (confirmed by this session's earlier code research) — this feature is the first to actually drive `pending`/`active` through real transitions. `draft`/`checking`/`approved`/`converted`/`rejected`/`cancelled` are out of scope for this spec's automation (§3) — likely provisioned for the existing manual review flow or a future extension, not touched here. |

### `tasks` — already has everything needed

| Field | Type (confirmed live) | Notes |
|---|---|---|
| `linkedPaymentRequestId` | `belongsTo` → Payment Requests | Already registered. This spec is the first code to read/write it. |

Also confirmed live but not otherwise documented in this session's earlier code research: `tasks` already has `contractService`/`caseService`/`quotationService`/`companyService`/`taskTemplate` (all `belongsTo`) — not used by this spec, but directly relevant to the upcoming By Service spec (a Task can already point straight at its `contractService` line, no need to derive it via `serviceId` + `projectId` → `contractId` join).

### `paymentSchedule.installments[]` (JSON key, no DB migration)

Add one new key to the shape already built by `ContractCreateForm.js`'s `buildPaymentSchedulePayload` (`{id, installmentNo, sortOrder, label, installmentLabel, content, timingType, dueDate, paymentDate, timingNote, percentage, amount}`):

| Key | Values | Notes |
|---|---|---|
| `triggerType` | `on_signed` \| `on_task_done` \| `on_case_done` | New. Chosen per-installment by the lawyer in the schedule-builder UI (§7). Distinct from the existing `timingType` key, which is unrelated — that key is just a derived `"fixed_date"` vs `""` flag based on whether `row.paymentDate` was filled in (`ContractCreateForm.js:1929`), not a trigger classification. Both keys coexist without conflict. |

No change needed to `paymentRequestItems` beyond continuing to create one row per installment the same way the existing manual "Create payment request" flow does (`lineType: "schedule_installment"`, `lineStatus: "pending"`, `scheduleItemId`) — this keeps the auto-created requests visually and structurally identical to manually-created ones in every screen that already renders `paymentRequestItems`.

## 5. Mechanism: 4 NocoBase Workflows

Built through the Admin UI only (per §3/§1 — never scripted via raw API, so an edit always takes effect immediately without a disable/enable toggle).

### WF1 — "By Case: create scheduled Payment Requests on contract save"

- **Trigger**: Collection event on `contracts`, on create (and on update of `paymentSchedule`, to also cover a contract whose schedule is added/edited after initial creation).
- **Condition**: `contractType == 'byCase'` AND `paymentSchedule.installments` is a non-empty array.
- **Loop** over `paymentSchedule.installments`:
  - **Query record** (`paymentRequests`): existing row where `contractId = trigger.id AND installmentNo = loopItem.installmentNo`. **Condition**: skip the rest of this iteration if found (idempotency guard — an edit-and-resave of the same schedule must not create duplicates for installments already materialized).
  - **Calculation**: `conditionMet = (loopItem.triggerType == 'on_signed')`; `initialStatus = (conditionMet AND loopItem.paymentDate) ? 'active' : 'pending'`.
  - **Create record** (`paymentRequests`): `title` (human-readable per this project's existing notification-content convention — e.g. `"Đợt {installmentNo} - {contract.contractCode} - {contract.contractName}"`, never a bare id), `status: initialStatus`, `triggerType: loopItem.triggerType`, `conditionMet`, `installmentNo: loopItem.installmentNo`, `contractId`, `customerId`, `internalCompanyId` (all copied from the contract), `requestedAmount: loopItem.amount`, `dueDate: loopItem.paymentDate` (nullable), `currency: 'VND'`, `requestType: 'create_payment'` (default — adjustable by hand later), `assignedLawyerId: NULL` (unassigned, matching this project's existing convention of never guessing an owner for an auto-created request).
  - **Create record** (`paymentRequestItems`): mirroring the Create record above — `paymentRequestId` (the just-created row), `contractId`, `lineType: 'schedule_installment'`, `lineStatus: 'pending'`, `scheduleItemId: loopItem.id`, `installmentNo`, `lineLabel: loopItem.label`, `description: loopItem.content`, `plannedPaymentDate: loopItem.paymentDate`, `requestedAmount: loopItem.amount`.

**As-built note (superseding the pseudocode above):** the Loop-over-a-JSON-array concern was confirmed fine — `target: "{{$context.data.paymentSchedule.installments}}"` on a Loop node works exactly as hoped. What broke instead, confirmed against a real failed execution (id `386803035602944`, job log `Error: Cannot convert "on_signed" to a number`) and reproduced directly against the installed `mathjs` package: a `calculation`-type node's `engine: "math.js"` cannot do string equality at all in this project's bundled mathjs version — `==`/`equal()` always attempts numeric coercion and throws for any non-numeric string (`!= null` null-checks are unaffected and work fine). Fixed by restructuring the "which triggerType" decision into a `condition`-type node's `calculation` config (`{calculator: 'equal', operands: [a, b]}`, evaluated by plain JS `a == b` via `logicCalculate.ts` — not mathjs) placed as the loop body's own first node, with each branch (on_signed / other) creating its Payment Request with a literal `conditionMet` value instead of a computed one. The idempotency "does a request already exist for this installment" Query/skip step described above was dropped in the actual build in favor of a CREATE-only trigger (mode 1, not 1|2) — see the script's own header comment for the full rationale. The real, current node graph lives in `JsField/Workflow/CreateByCaseScheduledPaymentRequestsWorkflow.js` — treat that file as the source of truth over this section's pseudocode.

### WF2 — "Task done: mark linked Payment Request's condition met"

- **Trigger**: Collection event on `tasks`, on update.
- **Condition**: `status` changed to `'done'` AND `linkedPaymentRequestId` is not null.
- **Query record** (`paymentRequests`): `id = trigger.linkedPaymentRequestId`.
- **Condition**: `query.status == 'pending'` — guard against touching a request that's already `active`/`submitted`/converted (e.g., a Task re-opened and re-done, or a request already handled by other means).
- **Update record** (`paymentRequests`): `conditionMet: true`.
- **Condition**: `query.dueDate` is not null →
  - **true**: **Update record** (same request) — `status: 'active'`.
  - **false**: no further action — stays `pending` until a due date is later set (→ WF4).

### WF3 — "Case done: mark on_case_done Payment Request's condition met"

- **Trigger**: Collection event on `projects`, on update.
- **Condition**: `status` changed to `'done'` AND `contractId` is not null.
- **Query record** (`contracts`): `id = trigger.contractId`.
- **Query record** (`paymentRequests`): `contractId = contract.id AND triggerType == 'on_case_done' AND status == 'pending'` (normally at most one row, but not enforced as a hard constraint — handle as a small result set).
- **Loop** over the query result:
  - **Update record**: `conditionMet: true`.
  - **Condition**: `dueDate` is not null → **Update record**: `status: 'active'`.

This runs independently of, and has no effect on, the existing `auto_create_payment_request_on_case_done` SQL trigger (§3) — both react to the same `projects.status → 'done'` transition, one via Postgres trigger, one via this new Workflow.

### WF4 — "Payment Request: due date set activates an already-qualified request"

- **Trigger**: Collection event on `paymentRequests`, on update.
- **Condition**: `dueDate` changed from empty to non-empty AND `status == 'pending'` AND `conditionMet == true`.
- **Update record** (same request): `status: 'active'`.

This is the "due date arrives after the trigger condition already happened" ordering — WF1/WF2/WF3 each already handle the "condition arrives after (or together with) the due date" ordering inline. Together, all four orderings are covered:

| Condition met first | Due date set first | Both at creation |
|---|---|---|
| WF2/WF3's own branch activates once the date is later added — but only because WF4 is the thing that actually flips it | WF4 activates once the condition is later met — but only because WF2/WF3 already marked `conditionMet` | WF1 computes `initialStatus` directly at creation |

## 6. UI changes

### `ContractCreateForm.js`

- Remove the per-installment `paymentDate` required-check inside `validate()` for `billingCycle === "multiple_payments"` — every other required check (contractName, customerId, internalCompanyId, currency, contractType) is untouched.
- Add a "Trigger" selector to each installment row in the schedule builder: a 3-option select (`Khi ký hợp đồng` / `Khi một task cụ thể hoàn thành` / `Khi toàn bộ case hoàn thành`) writing straight into `triggerType` on that installment, alongside the existing `paymentDate` (now optional) input.

### `TaskManagement.js` / `TaskDetailView.js`

- Add a "Đợt thanh toán sẽ kích hoạt" field to the Task create/detail form: a Select populated from `paymentRequests` where `contractId` = the case's linked contract AND `triggerType == 'on_task_done'` AND `status == 'pending'`, writing the chosen id into `linkedPaymentRequestId`. Empty/unset by default — most tasks don't drive any Payment Request. If the case has no linked contract, or the contract has no `on_task_done` installments, this field renders empty/hidden rather than erroring.

## 7. Testing / verification plan

1. Create a By Case contract with a 3-installment schedule: Đợt 1 `on_signed` with `paymentDate` filled in, Đợt 2 `on_task_done` with no `paymentDate`, Đợt 3 `on_case_done` with no `paymentDate` → confirm on save: 3 `paymentRequests` rows exist, Đợt 1 is `active` immediately, Đợt 2 and Đợt 3 are `pending` with `conditionMet: false`.
2. Re-save the same contract with no schedule change → confirm no duplicate `paymentRequests` rows are created (WF1's idempotency guard).
3. Create a Task under the linked case, set its `linkedPaymentRequestId` to Đợt 2's request, mark it `done` → confirm Đợt 2's request has `conditionMet: true` but stays `pending` (no due date yet).
4. Manually set a `dueDate` on Đợt 2's now-`conditionMet` request → confirm it flips to `active` (WF4).
5. Mark every Task in the case `done`/`cancelled` so the case auto-completes → confirm Đợt 3's request gets `conditionMet: true`; since it has no due date, it stays `pending`.
6. Set a `dueDate` on Đợt 3's request → confirm it flips to `active`.
7. Repeat steps 3–4 in the other order: set a `dueDate` on a still-`conditionMet: false` `on_task_done` request first, then mark its linked Task `done` → confirm it flips to `active` at that point (WF2's inline branch), not requiring a separate WF4 firing.
8. Confirm the existing `auto_create_payment_request_on_case_done` SQL trigger still fires its own lump-sum fallback unaffected, on a By Case contract that has no `paymentSchedule` at all (e.g. `billingCycle: 'one_time'`).
9. Confirm no Payment or Invoice record is ever created by any of the 4 Workflows — `active` only changes the Payment Request row itself.

## 8. Rollback

Everything here is additive (4 new fields, 2 new enum options, 4 Workflows). To roll back: disable/delete the 4 Workflows via the Admin UI, leave the new fields in place unused. No data migration to undo — no existing row's behavior changes unless it was created by this feature.

## 9. Deployment

1. ~~Field registration~~ — not needed; §4 confirms every field already exists on the live system.
2. Confirm `paymentRequests.triggerType`'s live select options actually include `on_signed`/`on_task_done`/`on_case_done` (Admin UI field editor); add any missing option there directly if not — a small manual edit, not a script.
3. `ContractCreateForm.js` (validation removal + trigger-type selector) and `TaskDetailView.js` (linked-request selector) — done, plain JS Block edits.
4. WF1–WF4 are scripted (not hand-built through the UI as originally planned in §1/§3 — still subject to that section's accepted trade-offs), living in `JsField/Workflow/`:
   - `CreateByCaseScheduledPaymentRequestsWorkflow.js` (WF1)
   - `CreateTaskDoneActivatesPaymentRequestWorkflow.js` (WF2)
   - `CreateCaseDoneActivatesPaymentRequestWorkflow.js` (WF3)
   - `CreatePaymentRequestDueDateActivationWorkflow.js` (WF4)
   Run each once (browser console or a temporary Action block), then in Admin → Workflow toggle each one Disabled → Enabled once (cache refresh — see §1's cache gotcha). Every other Workflow-creation script this project has already shipped (`CreateContractBillingPlansWorkflow.js`, `CreatePaymentRequestNotificationWorkflow.js`, etc.) now lives alongside these 4 in the same `JsField/Workflow/` folder, for one place to find every workflow-defining script in this project.
