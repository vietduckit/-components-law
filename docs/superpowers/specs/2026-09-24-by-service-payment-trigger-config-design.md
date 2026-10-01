# By Service — Payment Trigger Configuration in Contract Create Form — Design Spec

Date: 2026-09-24
Status: Implemented 2026-09-24 — pending manual verification on the instance (§9).
Related: `2026-09-17-unified-contract-payment-data-model-design.md` (§5 By Service task-trigger, §6d ungated `isPaymentTrigger`).

## 1. Problem

By Service billing is already fully automated on the SQL side: `by_service_check_and_create_payment_request()` creates one Payment Request per case-service line once **every** task flagged `isPaymentTrigger` for that `projectServiceId` is `done`. But the only places a lawyer can flag trigger tasks today are downstream of contract creation — `CaseCreateForm.js`'s Sample Tasks table, `TaskDetailView.js`, and `TaskManagement.js`. The Contract create form, where the lawyer actually decides "this is a By Service contract, billed per service", has no trigger configuration at all.

Both creation orders are common in practice and must be supported:

- **(A) Case first, Contract second** — the contract is created with `form.projectId` set (opened from a Case, or Case picked in "Related"). Real `tasks` rows already exist.
- **(B) Contract first, Case second** — e.g. Quotation → Contract, Case created later from that contract. No `tasks` rows exist yet; only the service's sample tasks in the `projectTemplates` catalog.

## 2. Goals / Non-goals

Goals:
- A lawyer creating a By Service contract can pick, per service, which tasks trigger that service's Payment Request — in both (A) and (B).
- (A) writes straight to the real tasks. (B) persists the choice on the contract and pre-ticks it when the Case is later created from that contract.
- Services left with zero trigger tasks are flagged (warning, not a block).

Non-goals:
- Editing triggers after the contract exists — already covered by `TaskDetailView.js`/`TaskManagement.js`.
- Creating `projectServices` for services newly added inside the Contract form when a Case already exists (pre-existing gap — those rows get only `contractServices`, never `projectServices`, so no tasks and no By Service automation). Surfaced as an inline note only.
- Any change to By Case (installment Payment Schedule with required service tags, §6h/§6m) or Retainer.
- Any SQL change.

## 3. UI — "Payment Triggers" block (`ContractCreateForm.js`)

Rendered only when `form.contractType === "byService"`, in the exact slot `PaymentScheduleSection` occupies for By Case — directly after the "Commercial Terms" Section. Same visual convention as Payment Schedule: no Section of its own, a light uppercase sub-heading ("Payment Triggers").

**Revision (2026-09-24, user request): inline summary + popup accordion.** The form itself only shows a one-line summary — "`n/m` services have a payment trigger", an amber "⚠ N without trigger" chip, a muted "N with no tasks yet" chip — and a **Configure** button. The per-service checkboxes below live in an antd `Modal` ("Payment Triggers", width `min(640px, calc(100vw - 32px))`, footer "Done" only): a one-column accordion, one service expanded at a time; each header shows the service name and `n/m` (amber with ⚠ when 0 ticked) or "No tasks". The popup opens on the first service still missing a trigger. Ticks update form state immediately (nothing is written until contract submit), so there's no Save/Cancel. Covered by `scripts/tests/payment-triggers-section.test.js`. The card content described below is what each expanded accordion item shows.

- **Source line** at the top:
  - (A): "Tasks of case {case name}" — each task shows a small status badge (To do / In progress / Done…).
  - (B): "Sample tasks — applied when a Case is created from this contract".
- **One card per selected service line** (catalog lines from `selectedContractServiceLines` + `manualServiceRows`, same order as the Services table): service name, counter `n/m trigger tasks`, and a checkbox per task (title; status badge in (A)).
- **Inline states per card:**
  - 0 ticked (but has tasks) → amber note: "This service will not create a Payment Request automatically."
  - No tasks available (custom manual service with no catalog `serviceId`; or, in (A), a service line with no `projectServiceId`) → muted note: "No tasks yet — configure the trigger later in the Case / Task."
- **Help text** under the heading: "A service's Payment Request is created once ALL its ticked tasks are Done."
- Responsive: cards are full-width and stack; checkbox rows wrap; no horizontal scroll on mobile (per project convention, see memory "JS Block phải responsive ngay từ đầu").

## 4. Data loading

State: `triggerSource` (`"case" | "template" | null`), `triggerTasksByLine` (`{ [lineKeyOrRowId]: TaskOption[] }`), `triggerSelection` (`{ [lineKeyOrRowId]: string[] }` of task/template ids), plus `triggerInitial` (snapshot of the initial selection, for diffing in (A)). Line identity reuses the existing convention: `lineKey(line)` for catalog lines, `row.id` for manual rows (same keys `paymentScheduleServiceOptions` uses).

- **(A) `form.projectId` set** → `tasks:list` filtered by `projectId`, fields `id,title,status,projectServiceId,isPaymentTrigger,taskIndex`, sorted by `taskIndex`. Grouped by `projectServiceId` and matched to lines by `extractId(line.projectServiceId)`. Initial selection = tasks where `isPaymentTrigger` is true.
- **(B) no Case** → `projectTemplates:list` filtered by `serviceId $in` [the lines' catalog service ids], fields `id,serviceId,templateName,sortOrder,isPaymentTrigger`, sorted by `sortOrder`. Initial selection = templates where the catalog `isPaymentTrigger` is true (same default `CaseCreateForm.js`'s `editableTasksForRow` seeds from).
- Re-evaluated whenever `contractType` becomes `byService`, `form.projectId` changes, or the lines change. Fetched records are cached per fetch key (`case:{projectId}`, or `template:{sorted serviceIds}`) — editing the services list only re-groups unless the Case or the service set changed (`loadTriggerRecords`). A line whose key was already present keeps the lawyer's current selection; new lines, and lines whose matched service changed under the same key (a manual row re-picked from the catalog), get the new service's defaults (`changedTriggerLineKeys`). Switching Case resets everything (different task universe).
- The header line ("Tasks of case …" / "Tasks of this case" / "Sample tasks …") follows the selected Case directly (`triggerSourceLabel`), so it's correct during loading and after a failed load.
- Template matching is by `serviceId` only — same effective behavior as `CaseCreateForm.js`, whose name-based fallback never fires because `PROJECT_TEMPLATE_FIELDS` doesn't fetch a service name.
- Fetch failure → block shows an inline error line; submit is unaffected (triggers can still be set later in Task views).

## 5. Persistence on submit

### (A) Case exists
For each task whose ticked state differs from `triggerInitial`: `tasks:update?filterByTk={id}` with `{ isPaymentTrigger }`. Only changed tasks are written.

**Ordering constraint (revised after review):** these updates run **before `contracts:create`** — not merely before the later `projects:update { contractId }`. `contracts.cases` is a hasMany on `projects.contractId` (confirmed in `schema/schema_01-06.sql`), so the create call itself links the Case and fires `by_service_contract_linked_catches_up_done_tasks`, which reads `isPaymentTrigger` at that moment; the later `projects:update` is then a no-op for the trigger. Writing flags first means an already-complete service gets its Payment Request immediately, and a catalog-default trigger the lawyer unticked never creates one. Enforced by `scripts/tests/submit-order.test.js`.

**Stale data guard:** trigger data is only used at submit when it was loaded for the currently selected scope (`triggerScopeKey(projectId)`) and no reload is in flight (`isTriggerDataCurrent`). Switching/clearing the Case or a failed load clears the previous scope's data immediately; submitting while triggers are still loading shows "Payment triggers are still loading…" and does nothing.

**Cancelled tasks** can't be newly ticked (checkbox disabled; unticking an already-flagged one is allowed) — the SQL requires every flagged task to be `done`, so a flagged cancelled task would block that service's Payment Request forever.

**Known limitation — appendix contracts:** an appendix (`contractKind !== "main"`) never links the Case (no `cases` in the payload, no `projects:update`), so no catch-up runs. A task that is **already Done** when ticked therefore won't create its Payment Request (tasks ticked while not yet Done work normally when they reach Done). Same pre-existing gap as flagging an already-Done task in TaskDetailView/TaskManagement. Closing it needs a SQL trigger on `tasks AFTER UPDATE OF "isPaymentTrigger"` — out of scope here (no SQL changes), pending the user's decision.

Individual `tasks:update` failures → `console.warn` + one aggregated `message.warning` ("Could not save payment trigger on N task(s) — set it in Task detail"); contract creation is not rolled back.

### (B) No Case
New field on `contractServices`: **`paymentTriggerTemplateIds`** — JSON array of `projectTemplates.id` values (stored as strings). Written in the payload passed to `createContractServiceLine()` for each line (catalog and manual) while `contractType === "byService"` and the line has template tasks. Not written for By Case / Retainer, and not written in (A) (the real tasks are the source of truth there).

`createContractServiceLine`'s fallback payloads (`fallbackPayload`, `minimalPayload`) keep the field — it's a plain column, not a relation, so it isn't a plausible cause of the first attempt failing.

Field registration: new one-time script `JsField/RegisterContractServicesPaymentTriggerField.js`, same shape and idempotency check as `JsField/RegisterContractPaymentStatusFields.js` (`name: "paymentTriggerTemplateIds"`, `type: "json"`, `interface: "json"`, `defaultValue: null`). Must be run on the instance before deploying the updated blocks.

## 6. Case creation from a (B) contract (`CaseCreateForm.js`)

`fetchContractServices()` adds `paymentTriggerTemplateIds` to what it reads (plain column — already returned when no `fields` restriction is passed; verify and add to `fields` if one is present). In `mapContractServicesToRows`, right after `row._templateTasks = getServiceTaskTemplates(...)`:

- If `Array.isArray(s.paymentTriggerTemplateIds)` → set each `_templateTasks[i].isPaymentTrigger = ids.includes(String(task.id))`. An empty array is meaningful ("explicitly no triggers") and overrides the catalog default.
- If the field is `null`/absent (contracts created before this change, or By Case/Retainer) → unchanged behavior (catalog default).

The lawyer can still change ticks in Sample Tasks. Writing to real tasks is entirely the existing path: `syncCatalogServiceTasks()` already diffs `isPaymentTrigger` against the pristine template and patches the DB-cloned tasks (`AutoCreateTaskFromTemplate.sql` clones `isPaymentTrigger` from the template, then the diff corrects it).

## 7. Submit-time warning

In the By Service branch, before the create calls: collect lines that have ≥1 available task but 0 ticked. If any, `Modal.confirm` (pattern already used in this file) listing their names: "These services have no trigger task and will not create a Payment Request automatically: … Create the contract anyway?" — OK continues, Cancel returns to the form. Lines with no tasks available are not included (nothing the lawyer could have ticked). Not a `validate()` error.

## 8. Files touched

| File | Change |
|---|---|
| `All Module/Contract/ContractCreateForm.js` | `PaymentTriggersSection` component; loading state/effects; submit: (A) task updates before `projects:update`, (B) `paymentTriggerTemplateIds` in contractService payload; confirm modal |
| `All Module/Case/CaseCreateForm.js` | Seed `_templateTasks[].isPaymentTrigger` from `contractServices.paymentTriggerTemplateIds` in `mapContractServicesToRows` |
| `JsField/RegisterContractServicesPaymentTriggerField.js` | New one-time field registration script |

## 9. Manual test plan

1. **(A)** Case with services S1, S2 (tasks auto-cloned). Open Contract create from the Case, type By Service. Block lists S1/S2 tasks with statuses. Tick 1 task on S1, none on S2 → S2 card amber; submit → confirm lists S2 → OK. Verify `tasks.isPaymentTrigger` true only on the ticked S1 task. Mark it Done → exactly 1 Payment Request for S1.
2. **(A, catch-up)** Same as 1 but the ticked task is already Done before submit → Payment Request for S1 exists right after the contract is created.
3. **(B)** Quotation → Contract (no Case), By Service. Block shows sample tasks pre-ticked per catalog default. Change ticks, submit. Verify `contractServices.paymentTriggerTemplateIds`. Create Case from that contract → Sample Tasks pre-ticked exactly as chosen; submit Case → real tasks' `isPaymentTrigger` match.
4. **(B, empty)** Untick everything for one service → stored `[]` → Case Sample Tasks shows none ticked for it (catalog default overridden).
5. **Regression** By Case / Retainer contracts: no Payment Triggers block, no `paymentTriggerTemplateIds` written; Case from an old contract (field null) → catalog defaults as before.
6. **Mobile width** — block readable, no horizontal scroll.
