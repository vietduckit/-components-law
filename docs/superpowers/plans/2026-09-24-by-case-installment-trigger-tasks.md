# By Case Installment Trigger Tasks — Implementation Plan

> Executed inline (superpowers:executing-plans, Native), TDD per task. No commits unless the user asks (public repo).

**Goal:** configure, per By Case installment, which tasks trigger it — in the Contract create form, for both "Case exists" and "no Case yet".
**Spec:** `docs/superpowers/specs/2026-09-24-by-case-installment-trigger-tasks-design.md`

## Global Constraints
- JS Blocks: single files, no imports; UI copy English.
- A task links to at most one installment (`tasks.paymentRequestId`, API field `linkedPaymentRequestId`).
- Link order on submit / Case creation: not-done tasks first, done tasks last.
- New field `contractPaymentSchedules.triggerTemplateIds` (json, default null).
- By Service behavior unchanged; existing tests must keep passing.

## Tasks

1. **Field registration** — `JsField/RegisterContractServicesPaymentTriggerField.js` also registers `contractPaymentSchedules.triggerTemplateIds`. Verify: `node scripts/tests/parse-blocks.js`.
2. **Pure helpers (ContractCreateForm, marked block "installment trigger helpers")** — `installmentTaskGroups(installment, lines, tasksByLine)`, `pruneInstallmentSelection(selection, installments, lines, tasksByLine)`, `installmentLinkOwner(selection, installments)`, `orderLinksOpenFirst(taskIds, tasksById)`, `installmentsWithoutTasks(installments, lines, tasksByLine, selection)`. Test: `scripts/tests/installment-triggers.test.js` RED → GREEN.
3. **Generalize `PaymentTriggersSection`** — `noun` ("service" | "installment"), optional per-task `groupLabel`, `lockedBy(itemKey, taskId)` → label or null, custom `helpText`. Render test extended; existing assertions unchanged.
4. **Form wiring** — load trigger data when By Service or By Case multiple payments; `installmentTriggerSelection` state pruned via effect; render the section after `PaymentScheduleSection` for By Case.
5. **Submit** — confirm for installments without tasks; (A) link tasks per created schedule row via its Payment Request, open-first; (B) `triggerTemplateIds` in the schedule create payload. Source-order test in `installment-triggers.test.js`.
6. **CaseCreateForm linking** — pure `resolveTemplateTaskLinks` (marked block) + test `scripts/tests/case-installment-links.test.js`; call after rows are saved when the Case has a contract.
7. **Verify + review** — full test suite, parse, fresh reviewer; fix findings (including minors, per user preference).
