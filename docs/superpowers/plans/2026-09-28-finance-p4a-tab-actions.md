# Finance P4a — Finance Tab Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Case Finance tab usable day to day: from the tab, a Manager or Finance member can create a request by hand (service / combo), cancel a request with a reason, create an invoice for a request, record a payment, bill the next retainer period now, stop / start retainer auto-billing, and raise a termination settlement — every rule enforced by the database (P1/P2), the tab only collecting input and showing the database's own error sentences.

**Architecture:** Actions live in `All Module/Case/CaseFinanceBlock.js`. Each is a small antd `Modal` that writes one record through `ctx.api.request` — a P2 *stub* insert (`requestType` `manual_unit` / `bill_now` / `termination_settlement`) or a plain update/create — then reloads the tab. Pure helpers decide which actions a row offers and preview what a retainer bill-now / start will do (mirroring the SQL, for the confirmation text only); they are unit-tested. Server errors (plpgsql `RAISE EXCEPTION`) are surfaced verbatim.

**Tech Stack:** NocoBase JS Block, antd 5 (`Modal`, `Form`, `Input`, `InputNumber`, `DatePicker`-free `Input type=date`, `Select`, `Radio`, `message`), Node tests.

**Spec:** `docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md` §3, §6 (single payments), §7.1, §7.5, §8. P4b covers receipt groups, credit, advances, invoice cancel/replace and foreign-currency invoices.

## Global Constraints

- Only the Finance audience (Manager / Finance members / admins — the tab is already gated) sees the buttons.
- Database first: the tab never computes an amount the database also computes (manual / bill-now / settlement amounts are filled by the P2 stubs); invoice default amount = the request's `outstandingAmount`, payment default amount = the invoice's (else request's) outstanding.
- Invoice created from the tab: `status: "pending"`, `invoiceName` = request title, `issuedDate` = now, `deadline` = request `dueDate` (editable), `totalAmount` = request outstanding (editable, > 0), links `paymentRequestId`, `contractId`, `customerId`, `internalCompanyId` (+ their association keys, as `InvoiceCreateBlock.js` does); `invoiceType` left to its default.
- Payment recorded from the tab: `paymentStatus: "Received"`, `paymentDate`, `amount` (> 0), `paymentMethod` (Cash / Bank transfer / Credit card / Other), `paymentRefer`, links `paymentRequestId`, `invoiceId` (the request's single live invoice, if any), `contractId`, `customerId`, `internalCompanyId`, `sourceKey` `financeTab:paymentRequest:{id}:{timestamp}`.
- Cancel needs a reason (the database refuses otherwise); Stop needs a reason; Start confirms how many periods are skipped and the new end date.
- UI English; responsive modals (`width: min(560px, calc(100vw - 32px))`).
- No git commits; manual checklist at the end.

## Review Focus

1. The database refuses an action (e.g. cancel with an invoice) → the modal stays open and shows the database sentence, nothing reloads half-way. Pinned in Task 1 (`apiErrorMessage`) and Task 2 (static: every action awaits and catches).
2. Double click on Confirm → one record (buttons disabled while saving). Pinned in Task 2 (static: `confirmLoading`).
3. A request with a draft invoice → "Record payment" still offered (money can arrive before issuing), "Create invoice" not offered (one live invoice per request), "Cancel" offered only when no live invoice and nothing paid. Pinned in Task 1.
4. Retainer stopped → "Bill next period now" hidden, "Start auto-billing" shown with the skip preview; completed plan → no bill-now. Pinned in Task 1.
5. Terminated contract → no manual service/combo request; "Settlement request" shown with the unbilled cap. Pinned in Task 1.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `All Module/Case/CaseFinanceBlock.js` | Modify | Action helpers (in the marked block), `ActionModal`s, buttons on rows / sections / records |
| `scripts/tests/case-finance-block.test.js` | Modify | Tests for the action helpers + static checks of the payloads |

---

### Task 1: Action helpers

**Interfaces (produced, used by Task 2):**
- `apiErrorMessage(error) → string` — the server's message (`error.response.data.errors[0].message`, else `.message`), stripped of a leading `error: `.
- `requestActions(request, invoices, contract) → { createInvoice, recordPayment, cancel }` (booleans)
- `unitCanBeBilledByHand(request, contract) → boolean` — no open request and contract not terminated.
- `billNowPreview(plan, contract) → { ok: true, period, amount, scheduledDate } | { ok: false, reason }`
- `startPreview(plan, today) → { skipped, nextBillingDate, endDate }` — mirror of `finance_billing_plan_active_toggle`.
- `unbilledAmount(contract, requests) → number` — contract value minus non-cancelled requested.

- [ ] **Step 1: Failing test** — append to `scripts/tests/case-finance-block.test.js` before its final `console.log`:

```js
// ---- action helpers (Finance P4a) ----
const A = extractMarkedBlock(
  BLOCK,
  "// ---- finance helpers (pure; tested by scripts/tests/case-finance-block.test.js) ----",
  "// ---- end finance helpers ----",
  ["apiErrorMessage", "requestActions", "unitCanBeBilledByHand", "billNowPreview", "startPreview", "unbilledAmount"],
);
assert.equal(A.apiErrorMessage({ response: { data: { errors: [{ message: "error: Give a reason to cancel this payment request." }] } } }), "Give a reason to cancel this payment request.");
assert.equal(A.apiErrorMessage(new Error("Network down")), "Network down");
{
  const active = { id: 1, status: "active", requestedAmount: 100, paidAmount: 0 };
  assert.deepEqual(A.requestActions(active, [], {}), { createInvoice: true, recordPayment: true, cancel: true });
  const draft = [{ id: 9, paymentRequestId: 1, status: "draft" }];
  assert.deepEqual(A.requestActions(active, draft, {}), { createInvoice: false, recordPayment: true, cancel: false });
  assert.deepEqual(A.requestActions({ ...active, paidAmount: 100 }, [], {}), { createInvoice: true, recordPayment: false, cancel: false });
  assert.deepEqual(A.requestActions({ ...active, paidAmount: 30 }, [], {}), { createInvoice: true, recordPayment: true, cancel: false });
  assert.deepEqual(A.requestActions({ ...active, status: "pending" }, [], {}), { createInvoice: false, recordPayment: false, cancel: true });
  assert.deepEqual(A.requestActions({ ...active, status: "cancelled" }, [], {}), { createInvoice: false, recordPayment: false, cancel: false });
  assert.equal(A.unitCanBeBilledByHand(null, { status: "execution" }), true);
  assert.equal(A.unitCanBeBilledByHand(active, { status: "execution" }), false);
  assert.equal(A.unitCanBeBilledByHand(null, { status: "terminated" }), false);
}
{
  const plan = { id: 5, status: "active", isBillingActive: true, totalAmount: 1000, retainerTotalCycles: 3, retainerCyclesBilled: 1, nextBillingDate: "2026-10-01", retainerUnit: "month" };
  assert.deepEqual(A.billNowPreview(plan, { status: "execution" }), { ok: true, period: 2, amount: 333, scheduledDate: "2026-10-01" });
  assert.equal(A.billNowPreview({ ...plan, isBillingActive: false }, {}).ok, false);
  assert.equal(A.billNowPreview({ ...plan, status: "completed", nextBillingDate: null }, {}).ok, false);
  assert.equal(A.billNowPreview(plan, { status: "terminated" }).ok, false);
  // stopped from 2026-07-15 with the next date 2026-08-01 -> 08-01 and 09-01 skipped on 2026-09-28
  assert.deepEqual(
    A.startPreview({ ...plan, isBillingActive: false, pausedAt: "2026-07-15T03:00:00Z", nextBillingDate: "2026-08-01", endDate: "2026-12-31" }, "2026-09-28"),
    { skipped: 2, nextBillingDate: "2026-10-01", endDate: "2027-02-28" },
  );
  assert.deepEqual(
    A.startPreview({ ...plan, isBillingActive: false, pausedAt: "2026-09-28T01:00:00Z", endDate: "2026-12-31" }, "2026-09-28"),
    { skipped: 0, nextBillingDate: "2026-10-01", endDate: "2026-12-31" },
  );
}
assert.equal(A.unbilledAmount({ totalAmount: 1000 }, [{ status: "active", requestedAmount: 300 }, { status: "cancelled", requestedAmount: 500 }, { status: "pending", requestedAmount: 100 }]), 600);
```

- [ ] **Step 2: Run** `node scripts/tests/case-finance-block.test.js` → FAIL (`apiErrorMessage is not defined` from the extractor's return).

- [ ] **Step 3: Implement** inside the marked helpers block, before `// ---- end finance helpers ----`:

```js
// ---- action helpers (Finance P4a) ----
const apiErrorMessage = (error) => {
  const fromApi = error && error.response && error.response.data && error.response.data.errors && error.response.data.errors[0];
  const raw = (fromApi && fromApi.message) || (error && error.message) || String(error || "Something went wrong.");
  return String(raw).replace(/^error:\s*/i, "");
};

const requestActions = (request, invoices, contract) => {
  const status = lower(request && request.status);
  if (!request || status === "cancelled") return { createInvoice: false, recordPayment: false, cancel: false };
  const live = liveInvoicesFor(request, invoices);
  const paid = toNum(request.paidAmount);
  const owing = owingOf(request);
  return {
    createInvoice: status === "active" && live.length === 0,
    recordPayment: status === "active" && owing > 0,
    cancel: live.length === 0 && paid <= 0,
  };
};

const unitCanBeBilledByHand = (request, contract) => !request && lower(contract && contract.status) !== "terminated";

const billNowPreview = (plan, contract) => {
  if (!plan) return { ok: false, reason: "No retainer plan." };
  if (lower(contract && contract.status) === "terminated") return { ok: false, reason: "The contract is terminated." };
  if (plan.isBillingActive === false) return { ok: false, reason: "Auto-billing is stopped — start it again first." };
  if (lower(plan.status) !== "active" || !plan.nextBillingDate) return { ok: false, reason: "No period left to bill." };
  const period = toNum(plan.retainerCyclesBilled) + 1;
  return {
    ok: true,
    period,
    amount: retainerCycleAmount(plan.totalAmount, toNum(plan.retainerTotalCycles) || null, period),
    scheduledDate: String(plan.nextBillingDate).slice(0, 10),
  };
};

// Mirror of finance_billing_plan_active_toggle (pgsql/finance_billing_rules.sql),
// for the confirmation text only — the database does the real shift.
const startPreview = (plan, today) => {
  const t = String(today).slice(0, 10);
  const from = plan.pausedAt ? String(new Date(new Date(plan.pausedAt).getTime() + 7 * 3600 * 1000).toISOString()).slice(0, 10) : t;
  let next = plan.nextBillingDate ? String(plan.nextBillingDate).slice(0, 10) : null;
  let skipped = 0;
  while (next && next < t && next >= from) {
    next = addUnit(next, plan.retainerUnit, 1);
    skipped += 1;
  }
  const endDate = plan.endDate
    ? skipped > 0
      ? addUnit(String(plan.endDate).slice(0, 10), plan.retainerUnit, skipped)
      : String(plan.endDate).slice(0, 10)
    : null;
  return { skipped, nextBillingDate: next, endDate };
};

const unbilledAmount = (contract, requests) =>
  toNum(contract && contract.totalAmount) -
  (requests || []).filter((r) => lower(r.status) !== "cancelled").reduce((s, r) => s + toNum(r.requestedAmount), 0);
```

(`pausedAt` is a timestamp; its business date is taken in UTC+7 like the SQL's `Asia/Ho_Chi_Minh`.)

- [ ] **Step 4: Run** → Expected: all helper tests pass.

---

### Task 2: Modals and buttons

**Behaviour (the contract the code meets):**
- One `ActionModal` component: `open`, `title`, `okText`, `danger`, `onOk` (async; resolves → close + `onDone()` reload; rejects → stays open with an `Alert` showing `apiErrorMessage(err)`), `confirmLoading` while saving, children = form fields.
- Buttons:
  - Unit rows (By Case, line, combo, retainer periods): when the row's open request exists → the request's actions (`requestActions`): "Invoice", "Record payment", "Cancel"; when none and `unitCanBeBilledByHand` → line / combo rows show "Create request".
  - Retainer panel: "Bill next period now" (when `billNowPreview.ok`), "Stop auto-billing" (started, plan active), "Start auto-billing" (stopped).
  - Contract strip: "Settlement request" when the contract is terminated.
  - Requests table: an actions column with the same request actions.
- Payloads:
  - Create request (service): `paymentRequests:create` `{ requestType: "manual_unit", projectServiceId, dueDate? }`; (combo): `{ requestType: "manual_unit", contractPaymentScheduleId, dueDate? }`.
  - Settlement: `{ requestType: "termination_settlement", contractId, requestedAmount, title? }` (amount input capped at `unbilledAmount` in the UI; the database re-checks).
  - Bill now: `{ requestType: "bill_now", billingPlanId }`.
  - Cancel: `paymentRequests:update?filterByTk={id}` `{ status: "cancelled", cancelReason }`.
  - Stop: `contractBillingPlans:update?filterByTk={id}` `{ isBillingActive: false, pauseReason, resumeOn: date | null }`; Start: `{ isBillingActive: true }`.
  - Invoice / payment: as in Global Constraints.

- [ ] **Step 1: Failing test** — append:

```js
// ---- actions: static checks (Finance P4a) ----
{
  const src = read("All Module/Case/CaseFinanceBlock.js");
  for (const needle of [
    'requestType: "manual_unit"',
    'requestType: "bill_now"',
    'requestType: "termination_settlement"',
    'status: "cancelled", cancelReason',
    "isBillingActive: false, pauseReason",
    "isBillingActive: true",
    'url: "invoices:create"',
    'url: "payments:create"',
    'paymentStatus: "Received"',
    "confirmLoading",
    "apiErrorMessage(",
  ]) {
    assert.ok(src.includes(needle), `action code contains ${needle}`);
  }
  assert.ok(/sourceKey: `financeTab:paymentRequest:\$\{/.test(src), "payment sourceKey");
}
```

- [ ] **Step 2: Run** → FAIL `action code contains requestType: "manual_unit"`.

- [ ] **Step 3: Implement** the `ActionModal`, the forms (`CreateRequestForm`, `CancelForm`, `InvoiceForm`, `PaymentForm`, `StopForm`, `SettlementForm`) and the buttons in `CaseFinanceBlock.js`; pass `onReload` from the root (`setReloadKey`) down to `FinanceView`.

- [ ] **Step 4: Run** `node scripts/tests/case-finance-block.test.js && node scripts/tests/static-checks.test.js && node --check "All Module/Case/CaseFinanceBlock.js"`, the whole node suite, and the scratch SSR smoke render → Expected: all pass, no React warnings.

---

## Manual deployment checklist (dev) — after P3

1. Re-paste `All Module/Case/CaseFinanceBlock.js` into the Finance tab's JS Block.
2. On a By Service line case: a service with no trigger task → Create request → a request "Dịch vụ … - {code} - …" appears; Create request again → the database sentence "This service already has a payment request." is shown.
3. Create invoice on an active request → invoice pending; Record payment for part → request and invoice show partly paid; for the rest → paid.
4. Cancel a request that has an invoice → refused with the database sentence; cancel one without → cancelled with the reason in the list.
5. Retainer: Bill next period now → next period requested, next date moves one period; Stop with a reason → panel shows Stopped; Start → confirmation shows skipped periods / new end date.
6. Set a test contract's status to Terminated → pending requests cancelled; Settlement request above the unbilled amount → refused; within → created.
