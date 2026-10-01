# By Case — Trigger Tasks per Installment in Contract Create Form — Design Spec

Date: 2026-09-24
Status: Design approved in conversation; implemented in the same session (see plan `docs/superpowers/plans/2026-09-24-by-case-installment-trigger-tasks.md`).
Related: `2026-09-24-by-service-payment-trigger-config-design.md` (the By Service Payment Triggers block this reuses), `2026-09-17-unified-contract-payment-data-model-design.md` §6h/§6m/§6aa.

## 1. Problem

1. **Bug (fixed in SQL, same day):** `by_case_activate_payment_request_if_ready()` activated an installment's Payment Request as soon as the *first* linked task was Done. With tasks A and B both linked to installment 1, A alone activated it. Now AND logic: at least one linked task and none not `done` (same rule as By Service). Unlinking re-checks the previous installment.
2. **Feature:** a lawyer creating a By Case (Multiple payments) contract can't choose which tasks trigger each installment — only later, one task at a time, in Task Management / Task Detail.

## 2. Decisions (user-approved)

- Both creation orders, like By Service: **(A)** Case exists → real tasks; **(B)** no Case → sample tasks, applied when the Case is created from the contract.
- Each installment lists only tasks of the **services tagged on that installment** (its `serviceKeys`) — matches the Task Management installment filter. A task belongs to at most one installment (single FK `tasks.paymentRequestId`): ticked in one installment → locked in the others ("Linked to Installment N").

## 3. UI

Reuses `PaymentTriggersSection` (inline summary + accordion popup), generalized by a `noun` prop:
- By Service: items = services (unchanged).
- By Case + Multiple payments: rendered right after `PaymentScheduleSection`; items = installments ("Installment 1 — 30%"); each item's tasks are grouped by service (small group headers); summary "n/m installments have trigger tasks"; help text "An installment is activated when ALL its ticked tasks are Done."
- Locked tasks: checkbox disabled + "Linked to {other item}". Cancelled tasks: not newly tickable (existing rule).
- Submit: installments that offer tasks but have none ticked → confirm dialog (warn, don't block), same as By Service.

## 4. Data

- Task source/loading reused as-is (`loadTriggerRecords`, `groupTriggerTasks` keyed by service line key). Loaded when `isByService || (isByCase && isMultiplePayments)`.
- Installment selection state `{ [installmentRowId]: taskId[] }`, default empty. Pruned on every change: removed installments dropped, task ids no longer offered by the installment's current services dropped, and a task claimed by an earlier installment dropped from later ones.

## 5. Persistence

**(A) Case exists.** In the submit loop, after each `contractPaymentSchedules:create` (whose AFTER INSERT trigger synchronously creates the Payment Request), fetch `paymentRequests` by `contractPaymentScheduleId`, then `tasks:update { linkedPaymentRequestId }` for each ticked task — **not-done tasks first, done tasks last**, so the AND check never sees a partial set that is all done. Failures aggregated into one warning.

**(B) No Case.** New JSON field `contractPaymentSchedules.triggerTemplateIds` (template ids as strings), written in the schedule create payload. Registered by `JsField/RegisterContractServicesPaymentTriggerField.js` (now registers both new fields). `CaseCreateForm.js`, after all service rows (and their task sync) are saved and when the Case has a linked contract: fetch that contract's schedule rows with non-empty `triggerTemplateIds`, their Payment Requests, and the new Case's tasks; map template id → the row whose `_templateTasks` contains it → that task's final (possibly edited) title → the real task with the same `serviceId` and title; link open-first. Templates removed from Sample Tasks are skipped.

## 6. Out of scope

Editing links after creation (Task Management/Detail already do it); By Case One time (SQL-created `on_case_done` installment, no tasks); any further SQL change. Known residual: in Task Management, linking an already-Done task *first* can still activate early (inherent to one-at-a-time linking).

## 6a. Review fixes (2026-09-25)

- Pruned selection is written back to state (and toggles apply to the pruned base), so a tick dropped when its service was untagged can't return and steal a task from a later installment.
- (A) Case tasks carry their current `linkedPaymentRequestId`; a task already linked to an existing installment (e.g. the main contract's) is locked — "Linked to another contract's installment".
- Submit: Payment Request lookup/linking has its own try/catch (reported as unlinked tasks, not "installment not created"); a missing schedule id counts the ticks as failed; the confirm dialog only lists installments that will actually be created.
- CaseCreateForm: unresolved templates (still in Sample Tasks, no matching task) and installments whose request is missing are counted and warned; a blanked title matches "Untitled task"; the whole step failing shows a warning instead of console-only.
- SQL: `trg_by_case_task_deleted_rechecks_payment_request` (AFTER DELETE ON tasks) re-checks the deleted task's installment.
- Open question for the user: a linked task that becomes `cancelled` blocks its installment (consistent with By Service); unlinking it is the current way out.

## 7. Tests

Node tests for the pure helpers (installment task options, lock owner, pruning, open-first ordering, installments without tasks, template→task resolution) and a render test for the generalized section. Manual: (A) Case with 2 services, 2 installments, A+B on installment 1 → A Done doesn't activate, B Done does; (B) Quotation → Contract with sample tasks ticked → create Case → tasks linked to the right installments.
