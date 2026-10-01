# Finance P3 — Case Finance Tab (read-only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `CaseFinanceBlock` JS Block for the Case detail "Finance" tab that shows, for the case's contract, what can be billed, what has been requested, invoiced and received, and what is overdue — laid out per contract type as on the design canvas — visible only to the case's Manager, the contract's Finance members and admins.

**Architecture:** One single-file NocoBase JS Block (`All Module/Case/CaseFinanceBlock.js`). A marked block of pure helpers (mode detection, KPIs, per-unit rows, the Request › Invoice › Payment flow, retainer periods, visibility) is unit-tested from Node with `extract-marked-block.js`. The view loads everything for the contract in a few list calls and renders one of four layouts (By Case, By Service line, By Service combo, Retainer) plus the no-contract and no-access states, all with antd components and responsive from the start. Numbers come from the columns the database derives since P1/P2 (`paidAmount`, `outstandingAmount`, `overdueSince`, invoice `status`), never recomputed differently in the browser. A new `contracts.financeLawyers` (many-to-many → lawyers) holds the Finance members. Actions (record payment, create invoice, manual request, bill now, stop/start, cancel) are P4.

**Tech Stack:** NocoBase JS Block (`ctx.React`, `ctx.antd`, `ctx.api.request`, `ctx.render`), Node `node:assert` + `scripts/tests/extract-marked-block.js`.

**Spec:** `docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md` §1, §10.1, §10.2 (and the display rules of §3–§9). Design: https://claude.ai/artifact/XqRAYWFgcjU3yB46g2XhjK.

## Global Constraints

- UI copy in English (Task/Finance modules), money in VND formatted `12.960.000 VND` (dot thousands, no decimals).
- Visibility (D6): the case's Manager (`projects.managerId`), any contract Finance member (`contracts.financeLawyers`), or an admin/root user. Anyone else sees a short "Finance is visible to the case manager and finance members" notice — no numbers.
- No contract on the case → an empty state with no amounts (memory: finance hidden without contract).
- Contract-level scope (§1): data for the contract of the case; services of the case being viewed are listed first; a banner when the contract is used by other cases.
- Statuses shown: request pending / active / cancelled; payment Received / Cancelled; invoice draft / pending / partial / paid / overdue / cancelled; overdue badges from `overdueSince`.
- Responsive from the first version: KPI tiles use a grid of equal columns (the one place equal columns are right); lists wrap on phones; tables scroll horizontally inside their card, never the page.
- Sandbox rules (spec 2026-09-25 "RunJS sandbox globals"): only `ctx`, `window.*` allowed members, `document.createElement/querySelector`, JS built-ins; no `fetch`, `localStorage`, bare `innerHeight` … — `scripts/tests/static-checks.test.js` scans every block.
- No git commits; manual checklist at the end.

## Review Focus

1. A contract whose Finance data is partly legacy (no `paidAmount` yet, request status `submitted`) → treat missing numbers as 0 / unknown, never crash. Pinned in Task 2 (helpers tolerate missing fields).
2. A cancelled request next to its replacement for the same unit → the row shows the open one; cancelled ones only appear in the Requests list with a Cancelled tag. Pinned in Task 2.
3. A retainer with no cycle count (open-ended) → periods listed as billed so far + the next one, amount = totalAmount per cycle. Pinned in Task 2.
4. A foreign-currency payment → counts in VND (`amount × exchangeRateToBase`) and shows its original currency amount. Pinned in Task 2.
5. The viewer is neither Manager nor Finance member nor admin → no Finance data requested beyond what decides access. Pinned in Task 3 (load order).

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `JsField/RegisterContractFinanceLawyersField.js` | Create | `contracts.financeLawyers` belongsToMany → `lawyers` |
| `All Module/Case/CaseFinanceBlock.js` | Create | The Finance tab block (helpers + loader + view) |
| `scripts/tests/case-finance-block.test.js` | Create | Unit tests of the helpers + static checks of the block |

---

### Task 1: Finance members field

**Files:** Create `JsField/RegisterContractFinanceLawyersField.js`; test in `scripts/tests/case-finance-block.test.js` (first section).

- [ ] **Step 1: Failing test** — `scripts/tests/case-finance-block.test.js` (sections appended by Task 2/3):

```js
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// Finance P3 (2026-09-28): the Case "Finance" tab block.
// Spec: docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

// ---- contracts.financeLawyers ----
{
  const src = read("JsField/RegisterContractFinanceLawyersField.js");
  assert.ok(/name: "financeLawyers"/.test(src), "field name");
  assert.ok(/type: "belongsToMany"/.test(src) && /target: "lawyers"/.test(src), "many-to-many to lawyers");
  assert.ok(/through: "contractFinanceLawyers"/.test(src), "explicit through table");
  assert.ok(/foreignKey: "contractId"/.test(src) && /otherKey: "lawyerId"/.test(src), "keys");
}
```

- [ ] **Step 2: Run** `node scripts/tests/case-finance-block.test.js` → FAIL `ENOENT … RegisterContractFinanceLawyersField.js`.

- [ ] **Step 3: Implement** `JsField/RegisterContractFinanceLawyersField.js`:

```js
// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Finance P3 (2026-09-28, spec §10.1): contracts.financeLawyers — the
// contract's Finance members (many-to-many -> lawyers). Together with the
// case's Manager (projects.managerId) they see and operate the Case Finance
// tab and receive finance notifications (Finance P5).
//
// NocoBase creates the through table "contractFinanceLawyers"
// (contractId, lawyerId) itself. Idempotent — skips if already registered.
// How to run: paste into the browser dev console on any admin page (ctx in
// scope) or a temporary Action block's onClick.
// ============================================================

const fieldPayload = () => ({
  name: "financeLawyers",
  type: "belongsToMany",
  interface: "m2m",
  target: "lawyers",
  through: "contractFinanceLawyers",
  foreignKey: "contractId",
  otherKey: "lawyerId",
  sourceKey: "id",
  targetKey: "id",
  uiSchema: {
    type: "array",
    title: "Finance members",
    "x-component": "AssociationField",
    "x-component-props": { multiple: true },
  },
});

(async () => {
  const existing = await ctx.api.request({
    url: "collections/contracts/fields:list",
    params: { paginate: false },
  });
  if ((existing?.data?.data || []).some((f) => f.name === "financeLawyers")) {
    console.log("[skip] contracts.financeLawyers already registered");
    return;
  }
  await ctx.api.request({ url: "collections/contracts/fields:create", method: "POST", data: fieldPayload() });
  console.log("[created] contracts.financeLawyers (through contractFinanceLawyers)");
  console.log("Next: add 'Finance members' to the Contract edit form so it can be filled in.");
})();
```

- [ ] **Step 4: Run** → the field section passes (the file then fails on Task 2's missing block — expected until Task 2).

---

### Task 2: Pure helpers

**Files:** Create `All Module/Case/CaseFinanceBlock.js` (helpers section only at this step); extend the test.

**Interfaces (produced, used by Task 3):**
- `financeMode(contract, scheduleRows) → "none" | "byCase" | "byServiceLine" | "byServiceCombo" | "retainer"`
- `paymentVnd(payment) → number`, `isReceived(status) → boolean`
- `openRequestFor(requests, predicate) → request | null` (non-cancelled, newest first)
- `requestFlow(request, invoices) → { steps: [{ key, label, tone }], overdue: boolean }` — tones: `idle | wait | next | done | part | bad`
- `summarizeFinance({ contract, requests, invoices, payments }) → { value, requested, pendingRequested, invoiced, received, receivedPct, outstanding, overdue, nextDue }`
- `retainerCycleAmount(total, cycles, period) → number` (JS twin of the SQL `retainer_cycle_amount`)
- `retainerPeriods(plan, requests, invoices, today) → [{ period, date, amount, request, state }]` — state: `paid | partial | overdue | invoiced | requested | next | stopped | scheduled`
- `canViewFinance({ user, lawyerId, managerIds, financeLawyerIds }) → boolean`
- `formatVnd(n) → "12.960.000 VND"`

- [ ] **Step 1: Failing test** — append:

```js
// ---- helpers ----
const BLOCK = path.join(root, "All Module/Case/CaseFinanceBlock.js");
const H = extractMarkedBlock(
  BLOCK,
  "// ---- finance helpers (pure; tested by scripts/tests/case-finance-block.test.js) ----",
  "// ---- end finance helpers ----",
  [
    "financeMode", "paymentVnd", "isReceived", "openRequestFor", "requestFlow", "summarizeFinance",
    "retainerCycleAmount", "retainerPeriods", "canViewFinance", "formatVnd",
  ],
);

assert.equal(H.financeMode(null, []), "none");
assert.equal(H.financeMode({ contractType: "byCase" }, []), "byCase");
assert.equal(H.financeMode({ contractType: "retainer" }, []), "retainer");
assert.equal(H.financeMode({ contractType: "byService", pricingMode: "line" }, []), "byServiceLine");
assert.equal(H.financeMode({ contractType: "byService", pricingMode: "package" }, []), "byServiceLine", "legacy combo contract without items bills per service");
assert.equal(H.financeMode({ contractType: "byService", pricingMode: "package" }, [{ id: 1 }]), "byServiceCombo");

assert.equal(H.formatVnd(12960000), "12.960.000 VND");
assert.equal(H.formatVnd(null), "0 VND");
assert.equal(H.isReceived(" Received "), true);
assert.equal(H.isReceived("Partial"), false);
assert.equal(H.paymentVnd({ amount: 10, exchangeRateToBase: 25000 }), 250000);
assert.equal(H.paymentVnd({ amount: 500 }), 500);

// open request wins over a cancelled one for the same unit
{
  const reqs = [
    { id: 1, contractPaymentScheduleId: 7, status: "cancelled", createdAt: "2026-09-01" },
    { id: 2, contractPaymentScheduleId: 7, status: "active", createdAt: "2026-09-02" },
  ];
  assert.equal(H.openRequestFor(reqs, (r) => r.contractPaymentScheduleId === 7).id, 2);
  assert.equal(H.openRequestFor(reqs.slice(0, 1), (r) => r.contractPaymentScheduleId === 7), null);
}

// flow
{
  const tones = (f) => f.steps.map((s) => s.tone).join(",");
  assert.equal(tones(H.requestFlow(null, [])), "idle,idle,idle");
  assert.equal(tones(H.requestFlow({ id: 1, status: "pending", requestedAmount: 100 }, [])), "wait,idle,idle");
  assert.equal(tones(H.requestFlow({ id: 1, status: "active", requestedAmount: 100 }, [])), "done,next,idle");
  const inv = [{ id: 9, paymentRequestId: 1, status: "partial" }];
  const partly = H.requestFlow({ id: 1, status: "active", requestedAmount: 100, paidAmount: 40 }, inv);
  assert.equal(tones(partly), "done,done,part");
  assert.equal(partly.steps[2].label, "Paid 40%");
  assert.equal(tones(H.requestFlow({ id: 1, status: "active", requestedAmount: 100, paidAmount: 0, overdueSince: "2026-09-10" }, inv)), "done,done,bad");
  assert.equal(tones(H.requestFlow({ id: 1, status: "active", requestedAmount: 100, paidAmount: 100 }, inv)), "done,done,done");
  // a cancelled invoice does not count; legacy request without paidAmount -> 0
  assert.equal(tones(H.requestFlow({ id: 1, status: "active", requestedAmount: 100 }, [{ id: 9, paymentRequestId: 1, status: "cancelled" }])), "done,next,idle");
}

// summary
{
  const s = H.summarizeFinance({
    contract: { totalAmount: 1000 },
    requests: [
      { id: 1, status: "active", requestedAmount: 400, outstandingAmount: 400, overdueSince: "2026-09-01", dueDate: "2026-08-31" },
      { id: 2, status: "pending", requestedAmount: 300 },
      { id: 3, status: "cancelled", requestedAmount: 999 },
      { id: 4, status: "active", requestedAmount: 300, outstandingAmount: 100, dueDate: "2026-10-05T00:00:00Z" },
    ],
    invoices: [
      { id: 1, status: "partial", totalAmount: 300 },
      { id: 2, status: "draft", totalAmount: 50 },
      { id: 3, status: "cancelled", totalAmount: 70 },
    ],
    payments: [
      { amount: 200, paymentStatus: "Received" },
      { amount: 0.01, paymentStatus: "Received", exchangeRateToBase: 1000 },
      { amount: 500, paymentStatus: "Cancelled" },
    ],
  });
  assert.equal(s.value, 1000);
  assert.equal(s.requested, 700, "active requests only");
  assert.equal(s.pendingRequested, 300);
  assert.equal(s.invoiced, 300, "no draft, no cancelled");
  assert.equal(s.received, 210);
  assert.equal(s.receivedPct, 21);
  assert.equal(s.outstanding, 790);
  assert.equal(s.overdue, 400);
  assert.equal(s.nextDue.amount, 400);
}

// retainer
{
  assert.equal(H.retainerCycleAmount(1000, 3, 1), 333);
  assert.equal(H.retainerCycleAmount(1000, 3, 3), 334, "last cycle takes the remainder");
  assert.equal(H.retainerCycleAmount(500, null, 7), 500, "open-ended: totalAmount per cycle");
  const plan = {
    id: 5, totalAmount: 900, retainerTotalCycles: 3, retainerCyclesBilled: 1, retainerUnit: "month",
    nextBillingDate: "2026-10-01", isBillingActive: true, status: "active",
  };
  const reqs = [{ id: 11, billingPlanId: 5, cycleNo: 1, status: "active", requestedAmount: 300, paidAmount: 300 }];
  const periods = H.retainerPeriods(plan, reqs, [], "2026-09-28");
  assert.deepEqual(periods.map((p) => p.state), ["paid", "next", "scheduled"]);
  assert.deepEqual(periods.map((p) => p.date), [null, "2026-10-01", "2026-11-01"]);
  assert.deepEqual(periods.map((p) => p.amount), [300, 300, 300]);
  const stopped = H.retainerPeriods({ ...plan, isBillingActive: false }, reqs, [], "2026-09-28");
  assert.equal(stopped[1].state, "stopped");
  const open = H.retainerPeriods({ ...plan, retainerTotalCycles: null, totalAmount: 250 }, reqs, [], "2026-09-28");
  assert.deepEqual(open.map((p) => p.state), ["paid", "next"], "open-ended: billed so far + next");
  assert.equal(open[1].amount, 250);
}

// visibility
{
  assert.equal(H.canViewFinance({ user: { roles: [{ name: "admin" }] }, lawyerId: null, managerIds: [], financeLawyerIds: [] }), true);
  assert.equal(H.canViewFinance({ user: { id: 1 }, lawyerId: 7, managerIds: [7], financeLawyerIds: [] }), true);
  assert.equal(H.canViewFinance({ user: { id: 1 }, lawyerId: 8, managerIds: [7], financeLawyerIds: ["8"] }), true);
  assert.equal(H.canViewFinance({ user: { id: 1 }, lawyerId: 9, managerIds: [7], financeLawyerIds: [8] }), false);
  assert.equal(H.canViewFinance({ user: { id: 1 }, lawyerId: null, managerIds: [7], financeLawyerIds: [8] }), false);
}
```

- [ ] **Step 2: Run** → FAIL `ENOENT … CaseFinanceBlock.js`.

- [ ] **Step 3: Implement** the helpers at the top of `All Module/Case/CaseFinanceBlock.js` between the markers `// ---- finance helpers (pure; tested by scripts/tests/case-finance-block.test.js) ----` and `// ---- end finance helpers ----` (no `ctx` inside; plain functions):

```js
// ---- finance helpers (pure; tested by scripts/tests/case-finance-block.test.js) ----
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const idKey = (v) => (v === null || v === undefined || v === "" ? null : String(v && typeof v === "object" ? v.id : v));
const lower = (v) => String(v === null || v === undefined ? "" : v).trim().toLowerCase();

const formatVnd = (n) => `${Math.round(toNum(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} VND`;
const isReceived = (status) => lower(status) === "received";
const paymentVnd = (p) => toNum(p && p.amount) * (toNum(p && p.exchangeRateToBase) || 1);

const financeMode = (contract, scheduleRows) => {
  if (!contract) return "none";
  const type = contract.contractType;
  if (type === "retainer") return "retainer";
  if (type === "byService") {
    return contract.pricingMode === "package" && (scheduleRows || []).length ? "byServiceCombo" : "byServiceLine";
  }
  return "byCase";
};

const openRequestFor = (requests, predicate) => {
  const open = (requests || []).filter((r) => r && lower(r.status) !== "cancelled" && predicate(r));
  open.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return open[0] || null;
};

const liveInvoicesFor = (request, invoices) =>
  request
    ? (invoices || []).filter((i) => idKey(i.paymentRequestId) === idKey(request.id) && lower(i.status) !== "cancelled")
    : [];

const requestFlow = (request, invoices) => {
  const step = (key, label, tone) => ({ key, label, tone });
  if (!request || lower(request.status) === "cancelled") {
    return { steps: [step("request", "Request", "idle"), step("invoice", "Invoice", "idle"), step("payment", "Payment", "idle")], overdue: false };
  }
  const status = lower(request.status);
  const requested = toNum(request.requestedAmount);
  const paid = toNum(request.paidAmount);
  const hasInvoice = liveInvoicesFor(request, invoices).length > 0;
  const overdue = !!request.overdueSince || liveInvoicesFor(request, invoices).some((i) => lower(i.status) === "overdue");
  const reqStep = status === "pending" ? step("request", "Pending", "wait") : step("request", "Request", "done");
  const invStep = hasInvoice
    ? step("invoice", "Invoice", "done")
    : status === "active"
      ? step("invoice", "To invoice", "next")
      : step("invoice", "Invoice", "idle");
  let payStep;
  if (requested > 0 && paid >= requested) payStep = step("payment", "Paid", "done");
  else if (overdue && status === "active") payStep = step("payment", "Overdue", "bad");
  else if (paid > 0) payStep = step("payment", `Paid ${requested > 0 ? Math.floor((paid / requested) * 100) : 0}%`, "part");
  else payStep = step("payment", "Payment", "idle");
  return { steps: [reqStep, invStep, payStep], overdue: overdue && status === "active" && paid < requested };
};

const summarizeFinance = ({ contract, requests, invoices, payments }) => {
  const value = toNum(contract && contract.totalAmount);
  const open = (requests || []).filter((r) => lower(r.status) !== "cancelled");
  const active = open.filter((r) => lower(r.status) === "active");
  const requested = active.reduce((s, r) => s + toNum(r.requestedAmount), 0);
  const pendingRequested = open.filter((r) => lower(r.status) === "pending").reduce((s, r) => s + toNum(r.requestedAmount), 0);
  const invoiced = (invoices || [])
    .filter((i) => !["draft", "cancelled"].includes(lower(i.status)))
    .reduce((s, i) => s + toNum(i.totalAmount), 0);
  const received = (payments || []).filter((p) => isReceived(p.paymentStatus)).reduce((s, p) => s + paymentVnd(p), 0);
  const outstanding = Math.max(value - received, 0);
  const owing = (r) => (r.outstandingAmount === null || r.outstandingAmount === undefined ? toNum(r.requestedAmount) - toNum(r.paidAmount) : toNum(r.outstandingAmount));
  const overdue = active.filter((r) => r.overdueSince).reduce((s, r) => s + Math.max(owing(r), 0), 0);
  const dueNext = active
    .filter((r) => owing(r) > 0 && r.dueDate)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0];
  return {
    value,
    requested,
    pendingRequested,
    invoiced,
    received,
    receivedPct: value > 0 ? Math.floor((received / value) * 100) : 0,
    outstanding,
    overdue,
    nextDue: dueNext ? { date: String(dueNext.dueDate).slice(0, 10), amount: owing(dueNext), request: dueNext } : null,
  };
};

const retainerCycleAmount = (total, cycles, period) => {
  const t = toNum(total);
  const c = toNum(cycles);
  if (!c || c <= 0) return t;
  const each = Math.round(t / c);
  return period >= c ? t - each * (c - 1) : each;
};

const addUnit = (isoDate, unit, times) => {
  if (!isoDate) return null;
  const [y, m, d] = String(isoDate).slice(0, 10).split("-").map(Number);
  const u = lower(unit) || "month";
  if (u === "day" || u === "week") {
    const dt = new Date(Date.UTC(y, m - 1, d + (u === "week" ? 7 : 1) * times));
    return dt.toISOString().slice(0, 10);
  }
  const months = (u === "quarter" ? 3 : u === "year" ? 12 : 1) * times;
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
};

const retainerPeriods = (plan, requests, invoices, today) => {
  if (!plan) return [];
  const billed = toNum(plan.retainerCyclesBilled);
  const cycles = toNum(plan.retainerTotalCycles) || null;
  const last = cycles || billed + 1;
  const planReqs = (requests || []).filter((r) => idKey(r.billingPlanId) === idKey(plan.id));
  const rows = [];
  for (let period = 1; period <= last; period += 1) {
    const request = openRequestFor(planReqs, (r) => toNum(r.cycleNo) === period);
    const amount = request ? toNum(request.requestedAmount) : retainerCycleAmount(plan.totalAmount, cycles, period);
    let state;
    let date = null;
    if (request) {
      const flow = requestFlow(request, invoices);
      const paid = toNum(request.paidAmount);
      state = paid >= amount && amount > 0 ? "paid" : flow.overdue ? "overdue" : paid > 0 ? "partial"
        : liveInvoicesFor(request, invoices).length ? "invoiced" : "requested";
    } else if (period === billed + 1 && plan.nextBillingDate && lower(plan.status) === "active") {
      date = String(plan.nextBillingDate).slice(0, 10);
      state = plan.isBillingActive === false ? "stopped" : "next";
    } else if (period > billed + 1 && plan.nextBillingDate && lower(plan.status) === "active") {
      date = addUnit(plan.nextBillingDate, plan.retainerUnit, period - billed - 1);
      state = "scheduled";
    } else {
      state = "scheduled";
    }
    rows.push({ period, date, amount, request, state });
  }
  return rows;
};

const isAdminUser = (user) => {
  const role = (user && ((user.roles && user.roles[0] && user.roles[0].name) || user.role || user.systemRole)) || "";
  return role === "admin" || role === "root" || !!(user && (user.isAdmin === true || user.isSuperAdmin === true));
};

const canViewFinance = ({ user, lawyerId, managerIds, financeLawyerIds }) => {
  if (isAdminUser(user)) return true;
  const me = idKey(lawyerId);
  if (!me) return false;
  return [...(managerIds || []), ...(financeLawyerIds || [])].some((id) => idKey(id) === me);
};
// ---- end finance helpers ----
```

- [ ] **Step 4: Run** `node scripts/tests/case-finance-block.test.js` → Expected: helper assertions pass (block has only helpers so far; the static section of Task 3 does not exist yet).

---

### Task 3: Loader + views

**Files:** Modify `All Module/Case/CaseFinanceBlock.js` (everything after the helpers); extend the test with static checks.

**Behaviour (all of it is in the file; this is the contract the code must meet):**

- **Load order** (`useFinanceData(caseId)`):
  1. `auth:check` → user; `lawyers:list` filter `userId = user.id` → the viewer's `lawyerId`.
  2. `projects:get` (`id, contractId, managerId, projectName, caseCode`).
  3. No `contractId` → state `none` (stop).
  4. `contracts:get` with `appends: ["financeLawyers"]` (retry without `appends` if the field is not registered yet → `financeLawyerIds = []`), and `projects:list` filter `contractId` (all cases of the contract → `managerIds`, other-case banner).
  5. `canViewFinance(...)` false → state `denied` (stop — no finance lists are fetched).
  6. In parallel, all filtered by `contractId` (`paginate: false`): `paymentRequests`, `invoices`, `payments`, `contractPaymentSchedules`, `contractBillingPlans`, `contractServices`; then `contractPaymentScheduleServices` (schedule ids), `projectServices` (case ids), `tasks` (case ids; fields `id,title,status,projectId,projectServiceId,isPaymentTrigger,linkedPaymentRequestId,taskIndex`).
  7. A failed call → an inline error with a Retry button; partial data is never shown as complete.
- **Layout** (antd `Card`, `Tag`, `Tabs`, `Table`, `Progress`, `Alert`, `Empty`, `Spin`):
  - Contract strip: code (link to the contract page when a route is known, else plain), mode label (`By Case · N installments`, `By Service · line pricing`, `By Service · Combo pricing · N billing items`, `Retainer · Every {unit} · {cycles} periods`), contract payment status tag, "Used by N cases" banner when > 1 case.
  - KPI tiles (CSS grid `repeat(auto-fit, minmax(180px, 1fr))`): Contract value; Requested (+ pending below it when > 0); Invoiced; Received (+ progress); Outstanding (+ overdue in red, or next due).
  - Mode section:
    - **By Case**: one row per installment (schedule order): label, amount (+ %), trigger (text from `triggerType`; linked tasks as chips with status), flow steps, received, remaining.
    - **By Service line**: one row per case service of the contract (viewed case first; other cases' services dimmed with the case name): service, amount (request amount, else locked/line amount), trigger tasks progress `x/y done` + chips, flow, received, remaining; "No trigger task" warning when none.
    - **By Service combo**: allocation bar (item amount / contract value), then one expandable row per item: COMBO tag + label + service count, amount + %, trigger progress across services, flow (idle steps + "Will be created as “{label} - {code}”" hint when no request), received, remaining; expanded: each service with its trigger chips.
    - **Retainer**: auto-billing panel (Started/Stopped tag from `isBillingActive`, per-period amount, next billing date or stop reason + since, periods billed x/N segments, end date); period table from `retainerPeriods` with state tags.
  - Records tabs: Payment Requests (title, unit, amount, due, status + overdue days, invoice number), Invoices (number, request, issued, deadline, amount, paid, status), Payments (date, amount in VND + original currency when not VND, method, reference, applied to, status). No PDF actions.
  - States: loading (Spin), `none` (Empty "No contract linked to this case" — no amounts), `denied` (Alert info), error (Alert + Retry).
- **Responsive**: the root uses a `ResizeObserver`-free approach — widths from CSS only (`flex-wrap`, grid `auto-fit`, `Table scroll={{ x: … }}`), so it works inside the NocoBase tab at any width.

- [ ] **Step 1: Failing test** — append:

```js
// ---- block: static checks ----
{
  const src = read("All Module/Case/CaseFinanceBlock.js");
  assert.ok(/ctx\.render\(React\.createElement\(CaseFinanceBlock/.test(src), "renders the block");
  assert.ok(/url: "auth:check"/.test(src), "knows the viewer");
  assert.ok(/appends: \["financeLawyers"\]/.test(src), "reads Finance members");
  const denied = src.indexOf('setState({ kind: "denied"');
  const firstFinanceList = src.indexOf('"paymentRequests:list"');
  assert.ok(denied > 0 && firstFinanceList > denied, "access decided before any finance list is fetched");
  assert.ok(!/fetch\(|localStorage|innerHeight/.test(src), "sandbox-safe");
  assert.ok(!/PDF/.test(src), "no PDF actions");
  for (const mode of ["byCase", "byServiceLine", "byServiceCombo", "retainer"]) {
    assert.ok(src.includes(`mode === "${mode}"`), `renders ${mode}`);
  }
  assert.ok(/No contract linked to this case/.test(src), "no-contract state");
  assert.ok(/repeat\(auto-fit, minmax\(/.test(src), "responsive KPI grid");
}
console.log("case-finance-block: all checks passed");
```

- [ ] **Step 2: Run** → FAIL `renders the block`.

- [ ] **Step 3: Implement** the loader and views in `All Module/Case/CaseFinanceBlock.js` after the helpers, following the behaviour above and the existing block style (`const { React } = ctx;`, `React.createElement`, `FONT`, `extractId`).

- [ ] **Step 4: Run** `node scripts/tests/case-finance-block.test.js && node scripts/tests/static-checks.test.js && node --check "All Module/Case/CaseFinanceBlock.js"` and the whole node suite → Expected: all pass.

---

## Manual deployment checklist (dev) — after P1 + P2

1. Browser console: paste `JsField/RegisterContractFinanceLawyersField.js`.
2. Contract edit form: add the "Finance members" field; fill it on a test contract.
3. Case detail page → add a tab "Finance" → add a JS Block → paste `All Module/Case/CaseFinanceBlock.js`.
4. Check with three users on one case: its Manager (sees everything), a Finance member of the contract (sees everything), another lawyer (sees the "visible to the case manager and finance members" notice).
5. Check one case per contract type: By Case, By Service line, By Service combo (new contract, P2 flow), Retainer; and a case with no contract (no amounts shown).
6. Resize to phone width: KPI tiles stack, tables scroll inside their cards.
