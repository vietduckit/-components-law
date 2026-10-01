# By Service + Combo pricing — Locked, editable Payment Request amount per service — Design Spec

> **Superseded the same day (user redesign) — see "Per-item billing" at the end.** The amount UI, allocation helpers and blocking rules are kept, but they now apply to billing ITEMS (each combo, and each service outside any combo), not to individual services; per-service `paymentAllocatedAmount` is no longer written by the form.

Date: 2026-09-25
Status: Design approved in conversation; implemented same session.
Related: `2026-09-17-unified-contract-payment-data-model-design.md` §6ab (SQL auto-allocation), `2026-09-24-by-service-payment-trigger-config-design.md` (Payment Triggers popup).

## Problem
In Combo pricing every service line is stored with price 0; the SQL fallback (§6ab) splits the contract total at Payment Request time. Users couldn't see the per-service amounts beforehand, the split could drift from what they expected (services added later, rounding order), and a tiny catalog price produced unusable requests (e.g. 202đ).

## Decisions (user-approved)
- Amounts are **locked at contract creation** and **editable** (option A).
- Auto-fill: combo services use their price inside the combo (applied-row snapshot, else the catalog combo's item price), other services use their catalog price; scaled so the sum equals the contract Total amount; whole units, remainder on the last weighted line; all weights missing → equal split; lines with no reference get 0 and a warning.

## Data
- New field `paymentAllocatedAmount` (double) on `contractServices` and `projectServices` (registered by `JsField/RegisterContractServicesPaymentTriggerField.js`).
- SQL `by_service_check_and_create_payment_request()` amount priority: `paymentAllocatedAmount` > 0 → line `totalAmount` > 0 → package auto-allocation (legacy contracts) → none (no 0 request). Read via `to_jsonb(ps)` so the function keeps working if the field isn't registered yet.

## UI
- **ContractCreateForm**, By Service + Combo pricing, Payment Triggers popup: each service item shows an editable "Payment Request amount"; header line "Allocated X / Total ✓|✗" + "Auto-distribute"; warnings per line (no price reference, unusually small < 0.5% of total). Summary row outside the popup shows the allocation status. Line pricing: read-only line total.
- Submit blocked when allocated sum ≠ Total amount (package mode, By Service). Amounts written to `contractServices` (create payload) and, when a Case exists, the Case's `projectServices`.
- **CaseCreateForm**: copies `contractServices.paymentAllocatedAmount` onto the created `projectServices`.
- **TaskManagement** (By Service): service header shows "Payment Request: X" (planned) or "Payment Request: X · {status}" (created).

## Review fixes (same day)
- SQL: a locked amount (non-null, including 0) is final; the auto-split never runs for a Case that has any locked amount (prevented billing more than the contract).
- Case exists: locked amounts are written to the Case's services **before** `contracts:create` (its `cases` link fires the By Service catch-up).
- Lines added in the form while a Case exists (no projectService → no tasks) are flagged "notInCase".
- Line pricing shows a read-only per-line preview in the line's own currency.
- Input keeps the typed value ("" allowed, counts as 0); stale typed amounts pruned; reset when Combo pricing is toggled; submit blocked when Total amount ≤ 0.
- Allocation + Configure stay reachable when tasks fail to load; "noReference" clears once an amount is entered.
- TaskManagement badge refreshes after a task status change, warns when the service has no trigger task, clears without a contract, ignores stale loads.
- Known: amounts are whole units (spec choice); the SQL request currency is 'VND' (pre-existing).

## Deployment
1. Run `JsField/RegisterContractServicesPaymentTriggerField.js` (adds `paymentAllocatedAmount`) — without it NocoBase silently drops the field and the locked amounts are lost.
2. `psql … -f pgsql/unified_contract_payment_schedule.sql`.
3. Paste `ContractCreateForm.js`, `CaseCreateForm.js`, `TaskManagement.js`.

## Out of scope
Editing locked amounts after creation; By Case / Retainer.

## Tests
Node: allocation suggestion (weights, rounding remainder, equal fallback, zero-reference), status/warnings, render of the amount inputs, source wiring. Manual: CT29092026-like contract.

## Per-item billing (2026-09-25 redesign, user-approved)

Decisions: in By Service + Combo pricing, **each combo is one billing item and each service outside any combo is its own item**. Amount per item: optional manual entry in the Payment Triggers popup; auto-filled pro-rata by the combo's own price (applied-combo amount, else catalog combo `packageSubTotal`, else the sum of its services' reference prices) and, for standalone services, the catalog price, scaled to the Total amount; submit blocked unless the items add up to the Total amount exactly.

Mechanics (reuses the By Case installment engine):
- **Submit** creates one `contractPaymentSchedules` row per item (label = combo / service name, amount, `triggerType = on_task_done`, no due date) tagged with the item's contractServices → the existing trigger creates a **pending** Payment Request per item (title "{item} - {contract}"). Ticked tasks are linked open-first (Case exists) or stored as `triggerTemplateIds` and linked when the Case is created from the contract.
- **Activation**: `by_case_activate_payment_request_if_ready` (AND over all linked tasks). A request with no due date gets one on activation (+7 days) — due dates count from activation, not from contract creation.
- **SQL By Service** never creates per-service requests for a contract with `pricingMode = 'package'` (checked on the contract, which exists before `contracts:create` links the Case and fires the catch-up).
- **Task Management / Task Detail**: a task whose service belongs to an item uses the installment picker (the item's request, found via `paymentRequestServices`); the service header shows that request's amount and status, refreshed after a status change.
- The popup reuses the installment mode (`noun: "item"`): items with their services' tasks, cross-item locks, amount inputs, Auto-distribute.

### Per-item review fixes (same day)
- Rows added into a persisted combo section join that combo's item (`persisted-id-X` → `combo:X`, `persisted-name-X` → `comboname:X`).
- Legacy Combo pricing contracts (no schedule rows, created before per-item billing) keep the per-service path (auto-split); the SQL skip applies only when the contract has schedule rows or was created within the last 10 minutes (the `contracts:create` catch-up window).
- Task views: a service in no item on a per-item contract shows "Not billed" (no dead checkbox); controls wait until requests + tags are loaded; badges refresh after linking/unlinking.
- Items left at 0 get no schedule row (no 0 request), flagged "zero" in the popup; `notInCase`/`zero` have their own texts.
- Activation also fills `paymentRequestItems.plannedPaymentDate` and `sourceSnapshot.dueDate` when it sets the due date.
- CaseCreateForm no longer copies per-service `paymentAllocatedAmount`.

### Deployment (per-item billing) — order matters
1. `psql … -f pgsql/by_case_payment_request_automation.sql` (activation sets due date).
2. `psql … -f pgsql/unified_contract_payment_schedule.sql` (item rows, By Service skip).
3. Only then paste `ContractCreateForm.js`, `CaseCreateForm.js`, `TaskManagement.js`, `TaskDetailView.js` — the new form with the old SQL would create both item requests and per-service requests.
(`JsField/RegisterContractServicesPaymentTriggerField.js` is only needed for `contractPaymentSchedules.triggerTemplateIds`, already registered on the instance.)

## Line/Combo sync (2026-09-25, user-approved)

Problem: a service picked in Line pricing (A), then a combo (B) added from the picker's Combo tab, rendered A as a loose line next to B, so the data had no clear shape. Rule: **when a combo is added, every standalone service is merged into it**. Applies to the Contract, Case and Quotation create forms.

- `mergeStandaloneIntoCombo(rows, combo, contributionOf)` is a pure helper in each form, tested by `scripts/tests/combo-merge.test.js`. Rows without `_comboInstanceId` are tagged with the new combo (`_comboInstanceId`, `_comboCatalogId`, `_comboName`, Case: `_comboSnapshot`) and flagged `_mergedIntoCombo`. Their price moves to the combo: `basePrice`/`vat`/`_packageBasePrice` are set to 0, and the old value is kept in `_comboItemSnapshot`.
- Combo amount = converted combo price + the merged rows' value (the folded VND line price, or the package share they already added in Combo pricing). The document subtotal does not count that value twice.
- Rows skipped by the merge:
  - Case: rows from the selected Contract/Quotation (`_fromContract`/`_fromQuotation`), which keep that document's shape;
  - Quotation: blank placeholder rows.
- Dedup: a combo item that duplicates a row already on the form is skipped, in Line pricing too (the rows are kept now).
- Removing a combo also removes its merged services, and a message lists them.
- Top-level **"New service"** in Combo pricing with combos present: the picker shows "Add to combo" (default: the last combo), and the service is added into that combo, included at 0. Without combos it behaves as before.
- Per-mode parking (switching Line ↔ Combo restores each mode's own rows) is unchanged.

Deployment: paste `ContractCreateForm.js`, `CaseCreateForm.js`, `QuotationCreateForm.js`. No SQL.

## Money rounding: no đồng lost (2026-09-25)

Reported problem: installments split 30/30/40 from a 10,000,000 total could be summed by hand to 9,999,999.

Root causes (each reproduced with numbers):
1. **Contract Payment Schedule.** Each row's amount was rounded on its own, e.g. 30/30/40 of 10,000,001 shows 3,000,000 + 3,000,000 + 4,000,000. Submit then added the difference to the last row, so the table did not match what was saved. The reconcile also ran without checking the percentages.
2. **Rounded parts not adding up.** After currency conversion, subtotal, VAT and total were each rounded separately. Example: USD 0.01 × 25,432 gives 254 + 20 but a total of 275. The same happened in `resolveServiceAmounts` / `resolvePackageAmounts` when a value was derived.
3. **Fractional VND.** Conversions and folded line contributions stored decimals:
   - Contract/Quotation totals summed unrounded conversions, while CaseCreateForm rounded per currency group, so a Case and a Contract for the same services could differ by 1;
   - `_packageBasePrice` values from folding were fractional.
4. **Retainer.** `ROUND(total / cycles, 2)` billed 10,000,000 / 3 as 3 × 3,333,333.33 = 9,999,999.99.

Rules now:
- **Installments by percentage.** When the percentages add up to 100%, the last installment with an amount takes the remainder (`allocateInstallmentAmounts`). The table shows exactly what is saved, and it adds up to the total.
- **Rounded parts add up.** subtotal + VAT = total:
  - conversions are rounded per currency group (same method in Contract, Case and Quotation);
  - when a subtotal is derived from a total, VAT is the rest.
- **Whole VND.** Folded and added line contributions are rounded to whole VND.
- **Retainer cycles.** Every cycle is ROUND(total / cycles) and the last cycle is the remainder (`pgsql/retainer_billing_run_due.sql`).
- **Legacy schedules that store only percentages.** This covers ContractDetailView, ContractPaymentScheduleDetailBlock, PaymentRequestCreateBlock and PaymentContractDetailBlock. The last installment takes the remainder (`absorbPercentRemainder`); stored amounts are never changed.
- Already remainder-safe and unchanged: per-item allocation, package group shares, by-service auto-split (SQL), `distributePackageAcrossGroups`.

Tests: `scripts/tests/money-rounding.test.js`. `parse-blocks.js` now also covers QuotationCreateForm and the Payment/Schedule blocks.

Deployment:
- paste `ContractCreateForm.js`, `CaseCreateForm.js`, `QuotationCreateForm.js`, `ContractDetailView.js`, `ContractPaymentScheduleDetailBlock.js`, `PaymentRequestCreateBlock.js`, `PaymentContractDetailBlock.js`;
- `psql … -f pgsql/retainer_billing_run_due.sql`.

Existing data is not rewritten.

## Case trigger column; fresh quotations; dropdown flip (2026-09-25)

**New Case: "Trigger" column removed from the task overview.** Tasks keep the template default, or the selection saved on the contract. Change them per task in Task Management.

**New Contract keeps its Payment Triggers section** (By Case installment trigger tasks, By Service per-service triggers, Combo pricing billing items). It was removed by mistake the same day and has been restored. Guarded by `create-forms-no-trigger-ui.test.js`.

**New Quotation never had a trigger UI.**

- **Related Quotation empty after choosing a customer** (Case and Contract).
  - The quotation list was loaded once when the form opened, so a quotation created afterwards never appeared.
  - The Case form also loaded it unsorted and capped at 500.
  - Choosing a customer now fetches that customer's quotations from the server and merges them in.
  - The Case list is loaded newest first.
- **Task Management dropdowns** open upward when the room below is too small, measured in the task list's scroll area and the viewport:
  - status menu, task ⋮ menu, service ⋮ menu and prerequisite-task picker (`useDropdownFlip`);
  - assignee picker (`PortalDropdown`, which no longer uses a fixed 400px threshold).

Tests: `create-forms-no-trigger-ui.test.js`, `task-dropdown-placement.test.js`, `tdz-check.js`. `tdz-check.js` is a static check for "Cannot access X before initialization".

## RunJS sandbox globals (2026-09-25)

Reported error: `Access to global property "innerHeight" is not allowed.` when a Task Management status menu was opened in a JS item.

How NocoBase v2.0.30 runs these blocks:
- RunJS evaluates each block in an SES Compartment (flow-engine `JSRunner.ts`).
- JS Block, JS item and JS field all receive the proxies from `utils/safeGlobals.ts`.

What the sandbox allows:
- **Bare globals:** only `ctx`, `window`, `document`, `navigator`, `console`, timers, `Blob`, `URL` and the JavaScript built-ins. Names like `innerHeight`, `getComputedStyle`, `fetch`, `localStorage`, `Node`, `CustomEvent` don't exist.
- **`window.*`:** timers, `console`, `Math`, `Date`, `FormData`, `Blob`, `URL`, `addEventListener` (not `removeEventListener`), `open`, `location`. Assigning `window.x = …` is allowed.
- **`document.*`:** `createElement`, `querySelector`, `querySelectorAll`.
- **`location.*`:** `origin`, `protocol`, `host`, `hostname`, `port`, `pathname`, `assign`, `replace`, `reload`. No `href`, `search` or `hash`.
- **`navigator.*`:** `clipboard`, `onLine`, `language`, `languages`.
- DOM elements are real objects. `el.getBoundingClientRect()`, `el.ownerDocument.getSelection()` etc. work.

Fixes:
- Viewport height: `document.querySelector("html").clientHeight`.
- Scroll containers: detected by inline `overflow` style.
- Mention editors: selection and exec commands go through `editor.ownerDocument`; `Node.TEXT_NODE` is replaced by the constant 3.
- `removeEventListener`, `localStorage`, `window.confirm` fallbacks and `window.fetch` probes: wrapped in `try`. The ctx.api fallback now runs, so text previews work again.
- `location.href` / `location.search`: replaced by `pathname`.
- Undefined names that are real bugs: `formatMoney` → `formatMoneyByCurrency`; `currencies` in `quotationOverview` → passed as a parameter; `Avatar` in MyTask → taken from `ctx.antd`; `getUrlFilterId` in LegalReferenceDocument → defined.

Guard:
- `scripts/tests/sandbox-globals-check.js` and `tdz-check.js` scan every block under `All Module`.
- They share the scope analysis in `js-scope.js`.
- `static-checks.test.js` runs both.

## Contract total from a multi-combo Case (2026-09-25, critical)

**Bug.** A Case with combos A + B (85,000,000) opened a Contract whose Total amount was combo A only.
- Every combo's rows carry that combo's OWN amount.
- The contract form read the package total off the FIRST package line.

**Same bug class, fixed everywhere:**
- **ContractCreateForm**
  - service selection (Case → Contract), the popup-opened contract, the quotation summary row and switching to Combo pricing now use `sumPackageGroups`. It sums each distinct group once (comboId, else comboName, else the row), exactly like CaseServices, with VAT on the summed subtotal.
  - `comboOwnPrice` keeps a source combo's Case/Quotation amount (not the catalog price), so the per-combo split saved on submit matches the Case.
- **ContractServices / QuotationServices / ContractDetailView**
  - On load, the package subtotal is the document header's subtotal (`packageDocumentSubTotal`). Header is right for old contracts too; without a header, groups are summed once. Before, it was the first row's combo amount, which a save then re-split over every combo, shrinking the total.
  - `syncContractHeaderFromServices` rebuilds the header from each group once (`packageRowsSubTotal`). Old rows that each carry the whole total keep the header.

**Existing contracts:** `pgsql/audit_contract_combo_totals.sql` (read only) lists Combo-pricing contracts whose subtotal differs from their Case's combo total.

## Billing item amounts re-balance (2026-09-25)

In the Payment Triggers popup (By Service + Combo pricing), an amount typed by hand stays as typed. The items not edited share the rest of the Total amount automatically (`allocateWithOverrides`): pro-rata by price reference, remainder on the last, and they are marked "· auto". Before, a typed amount left the allocation off by the difference.

Auto-distribute still clears every typed amount. Typed amounts above the Total leave the others at 0, and the status shows the overrun.
