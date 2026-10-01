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

// ---- helpers ----
const BLOCK = path.join(root, "All Module/Case/CaseFinanceBlock.js");
const H = extractMarkedBlock(
  BLOCK,
  "// ---- finance helpers (pure; tested by scripts/tests/case-finance-block.test.js) ----",
  "// ---- end finance helpers ----",
  [
    "financeMode", "paymentVnd", "isReceived", "openRequestFor", "requestFlow", "summarizeFinance",
    "retainerCycleAmount", "retainerPeriods", "canViewFinance", "formatVnd", "retainerContractValue",
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
  // paid in full without an invoice (D3: invoicing is optional) -> not "To invoice"
  const paidNoInvoice = H.requestFlow({ id: 1, status: "active", requestedAmount: 100, paidAmount: 100 }, []);
  assert.equal(tones(paidNoInvoice), "done,idle,done");
  assert.equal(paidNoInvoice.steps[1].label, "No invoice");
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
  // 2026-09-30: totalAmount is the fee of EVERY period — never split
  assert.equal(H.retainerCycleAmount(1000, 3, 1), 1000);
  assert.equal(H.retainerCycleAmount(1000, 3, 3), 1000, "the last period bills the same fee");
  assert.equal(H.retainerCycleAmount(500, null, 7), 500, "open-ended: totalAmount per cycle");
  assert.equal(H.retainerCycleAmount(1000.4, 3, 1), 1000, "whole đồng");
  const plan = {
    id: 5, totalAmount: 900, retainerTotalCycles: 3, retainerCyclesBilled: 1, retainerUnit: "month",
    nextBillingDate: "2026-10-01", isBillingActive: true, status: "active",
  };
  const reqs = [{ id: 11, billingPlanId: 5, cycleNo: 1, status: "active", requestedAmount: 300, paidAmount: 300 }];
  const periods = H.retainerPeriods(plan, reqs, [], "2026-09-28");
  assert.deepEqual(periods.map((p) => p.state), ["paid", "next", "scheduled"]);
  assert.deepEqual(periods.map((p) => p.date), [null, "2026-10-01", "2026-11-01"]);
  assert.deepEqual(periods.map((p) => p.amount), [300, 900, 900], "billed period keeps its request amount");
  const stopped = H.retainerPeriods({ ...plan, isBillingActive: false }, reqs, [], "2026-09-28");
  assert.equal(stopped[1].state, "stopped");
  const open = H.retainerPeriods({ ...plan, retainerTotalCycles: null, totalAmount: 250 }, reqs, [], "2026-09-28");
  assert.deepEqual(open.map((p) => p.state), ["paid", "next"], "open-ended: billed so far + next");
  assert.equal(open[1].amount, 250);
}

// retainer contract value (JS twin of contract_retainer_value): fee × periods
{
  const c = { contractType: "retainer", totalAmount: 1000 };
  const fixed = { planType: "retainer", status: "active", totalAmount: 1000, retainerTotalCycles: 3, retainerCyclesBilled: 1 };
  assert.equal(H.retainerContractValue(c, [fixed]), 3000);
  const open = { ...fixed, retainerTotalCycles: null, retainerCyclesBilled: 0 };
  assert.equal(H.retainerContractValue(c, [open]), 1000, "open-ended, nothing billed yet: one period");
  assert.equal(H.retainerContractValue(c, [{ ...open, retainerCyclesBilled: 4 }]), 4000, "open-ended: periods billed so far");
  assert.equal(
    H.retainerContractValue(c, [{ ...fixed, id: 1, status: "completed", retainerTotalCycles: 2 }, { ...fixed, id: 2 }]),
    3000,
    "the active plan wins",
  );
  assert.equal(H.retainerContractValue({ contractType: "byCase", totalAmount: 1000 }, [fixed]), null, "not a retainer");
  assert.equal(H.retainerContractValue(c, []), null, "no plan yet");
  // the Contract value tile uses it
  const s = H.summarizeFinance({ contract: c, plans: [fixed], requests: [], invoices: [], payments: [] });
  assert.equal(s.value, 3000);
  assert.equal(s.outstanding, 3000);
  assert.equal(H.summarizeFinance({ contract: c, requests: [], invoices: [], payments: [] }).value, 1000, "no plan: the contract amount");
}

// visibility
{
  assert.equal(H.canViewFinance({ user: { roles: [{ name: "admin" }] }, lawyerId: null, managerIds: [], financeLawyerIds: [] }), true);
  assert.equal(H.canViewFinance({ user: { id: 1 }, lawyerId: 7, managerIds: [7], financeLawyerIds: [] }), true);
  assert.equal(H.canViewFinance({ user: { id: 1 }, lawyerId: 8, managerIds: [7], financeLawyerIds: ["8"] }), true);
  assert.equal(H.canViewFinance({ user: { id: 1 }, lawyerId: 9, managerIds: [7], financeLawyerIds: [8] }), false);
  assert.equal(H.canViewFinance({ user: { id: 1 }, lawyerId: null, managerIds: [7], financeLawyerIds: [8] }), false);
}

// ---- block: static checks ----
{
  const src = read("All Module/Case/CaseFinanceBlock.js");
  assert.ok(/ctx\.render\(React\.createElement\(CaseFinanceBlock/.test(src), "renders the block");
  assert.ok(/url: "auth:check"/.test(src), "knows the viewer");
  assert.ok(/appends: \["financeMembers"\]/.test(src), "reads Finance members of the cases and records");
  const denied = src.indexOf('return { kind: "denied" }');
  const firstFinanceList = src.indexOf('("paymentRequests", byContract)');
  assert.ok(denied > 0 && firstFinanceList > denied, "access decided before any finance list is fetched");
  assert.ok(!/fetch\(|localStorage|innerHeight/.test(src), "sandbox-safe");
  assert.ok(!/PDF/.test(src), "no PDF actions");
  for (const mode of ["byCase", "byServiceLine", "byServiceCombo", "retainer"]) {
    assert.ok(src.includes(`mode === "${mode}"`), `renders ${mode}`);
  }
  assert.ok(/No contract linked to this case/.test(src), "no-contract state");
  assert.ok(/repeat\(auto-fit, minmax\(/.test(src), "responsive KPI grid");
}
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
  assert.deepEqual(A.billNowPreview(plan, { status: "execution" }), { ok: true, period: 2, amount: 1000, scheduledDate: "2026-10-01" }, "bill now = the per-period fee");
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

// ---- UI sync with the design canvas (2026-09-28) ----
const U = extractMarkedBlock(
  BLOCK,
  "// ---- finance helpers (pure; tested by scripts/tests/case-finance-block.test.js) ----",
  "// ---- end finance helpers ----",
  [
    "modeBadge", "kpiNotes", "requestSource", "invoiceCandidates", "paymentCandidates",
    "installmentIssueOptions", "overdueDays", "retainerPeriodNote", "unitActions",
  ],
);
{
  // contract strip badge
  assert.equal(U.modeBadge("byCase", { schedules: [{}, {}] }), "By Case · 2 installments · VND");
  assert.equal(U.modeBadge("byServiceLine", { projectServices: [{}, {}] }), "By Service · 2 services · line pricing · VND");
  assert.equal(U.modeBadge("byServiceCombo", { schedules: [{}] }), "By Service · Combo pricing · 1 billing item · VND");
  const plan = { planType: "retainer", retainerUnit: "month", retainerTotalCycles: 6 };
  assert.equal(U.modeBadge("retainer", { plans: [plan] }), "Retainer · Every month · 6 months total · VND");
  assert.equal(U.modeBadge("retainer", { plans: [{ ...plan, retainerTotalCycles: null }] }), "Retainer · Every month · open-ended · VND");

  // KPI sub-lines
  const byCase = U.kpiNotes("byCase", {
    schedules: [{ id: 1 }, { id: 2 }],
    projectServices: [{ id: 5 }, { id: 6 }],
    requests: [
      { id: 1, contractPaymentScheduleId: 1, status: "active" },
      { id: 2, contractPaymentScheduleId: 2, status: "pending" },
      { id: 3, contractPaymentScheduleId: 2, status: "cancelled" },
    ],
    invoices: [{ id: 1, status: "partial" }, { id: 2, status: "draft" }],
    plans: [],
  });
  assert.deepEqual(byCase, { value: "2 services · 2 installments", requested: "1 of 2 payment requests active", invoiced: "1 invoice" });
  const line = U.kpiNotes("byServiceLine", {
    schedules: [], plans: [], invoices: [],
    projectServices: [{ id: 5 }, { id: 6 }],
    requests: [{ id: 1, projectServiceId: 6, status: "active" }],
  });
  assert.equal(line.value, "2 services, billed separately");
  assert.equal(line.requested, "1 of 2 services triggered");
  assert.equal(line.invoiced, "0 invoices");
  const ret = U.kpiNotes("retainer", {
    schedules: [], projectServices: [], invoices: [], requests: [],
    plans: [{ planType: "retainer", totalAmount: 19440000, retainerTotalCycles: 6, retainerCyclesBilled: 3 }],
  });
  assert.equal(ret.value, "6 periods × 19.440.000 VND");
  assert.equal(ret.requested, "3 of 6 periods requested");

  // where a request came from
  assert.equal(U.requestSource({ triggerType: "on_task_done" }), "Auto");
  assert.equal(U.requestSource({ triggerType: "manual", sourceSnapshot: { billing: "service_manual" } }), "Manual");
  assert.equal(U.requestSource({ sourceSnapshot: '{"billing":"retainer_bill_now"}' }), "Bill now");
  assert.equal(U.requestSource({ sourceSnapshot: { billing: "termination_settlement" } }), "Settlement");

  // top buttons pick from what can still be invoiced / paid
  const reqs = [
    { id: 1, status: "active", requestedAmount: 100, paidAmount: 0 },
    { id: 2, status: "active", requestedAmount: 100, paidAmount: 100 },
    { id: 3, status: "pending", requestedAmount: 100 },
    { id: 4, status: "active", requestedAmount: 100, paidAmount: 20 },
  ];
  const invs = [{ id: 9, paymentRequestId: 4, status: "partial" }];
  assert.deepEqual(U.invoiceCandidates(reqs, invs).map((r) => r.id), [1]);
  assert.deepEqual(U.paymentCandidates(reqs).map((r) => r.id), [1, 4]);

  // By Case "+ Payment Request": issue a pending installment now, or re-create a cancelled one
  const options = U.installmentIssueOptions(
    [{ id: 12, installmentNo: 2 }, { id: 11, installmentNo: 1 }, { id: 13, installmentNo: 3 }],
    [
      { id: 1, contractPaymentScheduleId: 11, status: "active" },
      { id: 2, contractPaymentScheduleId: 12, status: "pending" },
      { id: 3, contractPaymentScheduleId: 13, status: "cancelled" },
    ],
  );
  assert.deepEqual(options.map((o) => [o.schedule.id, o.action, o.request ? o.request.id : null]), [[12, "issue", 2], [13, "create", null]]);

  // overdue days count from the local due date (UTC+7)
  assert.equal(U.overdueDays({ dueDate: "2026-09-19T17:00:00Z", overdueSince: "2026-09-21" }, "2026-09-28"), 8);
  assert.equal(U.overdueDays({ dueDate: "2026-09-19T17:00:00Z" }, "2026-09-28"), 0, "not overdue -> 0");

  // retainer period notes
  const rp = { status: "active", isBillingActive: true, nextBillingDate: "2026-10-01" };
  assert.equal(U.retainerPeriodNote({ state: "next", date: "2026-10-01" }, rp, "2026-09-28"), "Auto-request in 3 days");
  assert.equal(U.retainerPeriodNote({ state: "next", date: "2026-09-28" }, rp, "2026-09-28"), "Auto-request today");
  assert.equal(U.retainerPeriodNote({ state: "stopped", date: "2026-10-01" }, { ...rp, isBillingActive: false }, "2026-09-28"), "Stopped · moves to the end");
  assert.equal(U.retainerPeriodNote({ state: "scheduled", date: "2026-11-01" }, { ...rp, isBillingActive: false }, "2026-09-28"), "Scheduled · paused");
  assert.equal(
    U.retainerPeriodNote({ state: "requested", request: { createdAt: "2026-09-27T20:00:00Z", sourceSnapshot: { billing: "retainer_bill_now" } } }, rp, "2026-09-28"),
    "Billed early · 28/09/2026",
  );

  // row actions: one primary + the rest in the "⋯" menu
  const keys = (a) => [a.primary ? a.primary.key : null, a.menu.map((m) => m.key).join(",")];
  const active = { id: 1, status: "active", requestedAmount: 100, paidAmount: 0 };
  assert.deepEqual(keys(U.unitActions(active, [], {}, {})), ["invoice", "payment,view,cancel"]);
  assert.deepEqual(keys(U.unitActions(active, [{ id: 9, paymentRequestId: 1, status: "pending" }], {}, {})), ["payment", "view"]);
  assert.deepEqual(keys(U.unitActions({ ...active, paidAmount: 100 }, [{ id: 9, paymentRequestId: 1, status: "paid" }], {}, {})), ["view", ""]);
  assert.deepEqual(keys(U.unitActions({ ...active, status: "pending" }, [], {}, {})), ["issue", "view,cancel"]);
  assert.deepEqual(keys(U.unitActions(null, [], { status: "execution" }, { canCreate: true })), ["create", ""]);
  assert.deepEqual(keys(U.unitActions(null, [], { status: "terminated" }, { canCreate: true })), [null, ""]);
  assert.deepEqual(keys(U.unitActions(null, [], { status: "execution" }, { canCreate: true, waiting: true })), [null, "create"], "waiting on triggers: bill early from the menu");
}
{
  const src = read("All Module/Case/CaseFinanceBlock.js");
  assert.ok(!/scroll:\s*\{\s*x/.test(src), "no horizontally scrolling tables");
  assert.ok(/@container/.test(src) && /container-type: inline-size/.test(src), "tables collapse to cards on a narrow block");
  assert.ok(/Dropdown/.test(src), "row actions menu");
  assert.ok(src.includes('data: { status: "active", dueDate'), "By Case: issue a pending installment now");
  assert.ok(/Drawer/.test(src), "View opens the record");
  for (const label of ["New payment request", "New invoice", "New payment", "Open contract", "Expand all", "Bill next period now", "Periods billed"]) {
    assert.ok(src.includes(label), `design element: ${label}`);
  }
}

// ---- Finance members on the case and on every finance record (2026-09-28) ----
{
  const src = read("JsField/RegisterFinanceMembersFields.js");
  for (const [collection, through, fk] of [
    ["projects", "projectFinanceMembers", "projectId"],
    ["paymentRequests", "paymentRequestFinanceMembers", "paymentRequestId"],
    ["invoices", "invoiceFinanceMembers", "invoiceId"],
    ["payments", "paymentFinanceMembers", "paymentId"],
  ]) {
    assert.ok(src.includes(`["${collection}", "${through}", "${fk}"]`), `financeMembers on ${collection} via ${through}`);
  }
  assert.ok(/type: "belongsToMany"/.test(src) && /target: "lawyers"/.test(src) && /otherKey: "lawyerId"/.test(src), "m2m to lawyers");
  assert.ok(/name: "financeMembers"/.test(src), "field name");
}
const M = extractMarkedBlock(
  BLOCK,
  "// ---- finance helpers (pure; tested by scripts/tests/case-finance-block.test.js) ----",
  "// ---- end finance helpers ----",
  ["defaultMemberIds", "memberIdsOf", "lawyerLabel", "membersText", "recordRequestActions"],
);
{
  // Finance members + Manager of every case of the contract, once each (twin of finance_default_member_ids)
  const cases = [
    { id: 1, managerId: 7, financeMembers: [{ id: 9 }, { id: 7 }] },
    { id: 2, managerId: "8", financeMembers: [] },
    { id: 3, managerId: null },
  ];
  assert.deepEqual(M.defaultMemberIds(cases), ["7", "8", "9"]);
  assert.deepEqual(M.memberIdsOf({ financeMembers: [{ id: 3 }, 4, null] }), ["3", "4"]);
  assert.deepEqual(M.memberIdsOf({}), []);
  assert.equal(M.lawyerLabel({ id: 5, lawyerName: "Nguyễn An" }), "Nguyễn An");
  assert.equal(M.lawyerLabel({ id: 5, nickname: "An" }), "An");
  assert.equal(M.lawyerLabel({ id: 5 }), "Lawyer 5");
  const byId = { 1: { id: 1, lawyerName: "A" }, 2: { id: 2, lawyerName: "B" }, 3: { id: 3, lawyerName: "C" } };
  assert.equal(M.membersText(["1", "2"], byId), "A, B");
  assert.equal(M.membersText(["1", "2", "3"], byId), "A, B +1");
  assert.equal(M.membersText([], byId), "");

  // Payment Requests table: the person picks invoice-first or payment-first
  const keys = (a) => [a.buttons.map((b) => b.key).join(","), a.menu.map((m) => m.key).join(",")];
  const active = { id: 1, status: "active", requestedAmount: 100, paidAmount: 0 };
  assert.deepEqual(keys(M.recordRequestActions(active, [], {})), ["invoice,payment", "members,cancel"]);
  assert.deepEqual(keys(M.recordRequestActions(active, [{ id: 9, paymentRequestId: 1, status: "pending" }], {})), ["payment", "members"]);
  assert.deepEqual(keys(M.recordRequestActions({ ...active, paidAmount: 100 }, [], {})), ["invoice", "members"], "paid first, invoice after");
  assert.deepEqual(keys(M.recordRequestActions({ ...active, status: "pending", contractPaymentScheduleId: 4 }, [], {})), ["issue", "members,cancel"]);
  assert.deepEqual(keys(M.recordRequestActions({ ...active, status: "pending" }, [], {})), ["", "members,cancel"], "issue only for an installment");
  assert.deepEqual(keys(M.recordRequestActions({ ...active, status: "cancelled" }, [], {})), ["", "members"]);
}
{
  const src = read("All Module/Case/CaseFinanceBlock.js");
  const records = src.slice(src.indexOf("const RecordsTabs"), src.indexOf("// ---- contract strip"));
  assert.ok(records.length > 1000 && !/"View"/.test(records), "no View buttons in the Records tables");
  assert.ok(/recordRequestActions\(r, data\.invoices/.test(records), "Payment Requests table: invoice / payment buttons");
  assert.ok((src.match(/financeMembers: members/g) || []).length >= 6, "every create dialog sends the picked Finance members");
  assert.ok(src.includes("MembersDialog"), "Finance members can be edited on a record");
}

// ---- retainer without a billing plan, "New ..." buttons, live refresh (2026-09-28) ----
const R = extractMarkedBlock(
  BLOCK,
  "// ---- finance helpers (pure; tested by scripts/tests/case-finance-block.test.js) ----",
  "// ---- end finance helpers ----",
  ["periodsBetween", "planSetupPreview", "modeBadge", "kpiNotes", "unitActions", "recordRequestActions"],
);
{
  // billing dates from the start that fall on or before the end date
  assert.equal(R.periodsBetween("2026-07-01", "2026-12-31", "month"), 6);
  assert.equal(R.periodsBetween("2026-07-01", "2026-12-01", "month"), 6, "the end date itself counts");
  assert.equal(R.periodsBetween("2026-01-31", "2026-12-31", "quarter"), 4);
  assert.equal(R.periodsBetween("2026-07-01", "2026-06-30", "month"), 0);
  assert.equal(R.periodsBetween("2026-07-01", null, "month"), null, "no end date -> open-ended");

  assert.deepEqual(R.planSetupPreview({ total: 1000, cycles: 3, unit: "month", startDate: "2026-10-01" }), {
    perPeriod: 1000, contractValue: 3000, lastDate: "2026-12-01",
  });
  assert.deepEqual(R.planSetupPreview({ total: 500, cycles: null, unit: "month", startDate: "2026-10-01" }), {
    perPeriod: 500, contractValue: null, lastDate: null,
  });

  // no plan yet: say so instead of "0 VND per period · open-ended"
  assert.equal(R.modeBadge("retainer", { plans: [] }), "Retainer · no billing plan yet · VND");
  const none = R.kpiNotes("retainer", { plans: [], requests: [], schedules: [], projectServices: [], invoices: [] });
  assert.equal(none.value, "No billing plan yet");
  assert.equal(none.requested, "Auto-billing not set up");

  // "New ..." labels on every create action
  assert.equal(R.unitActions(null, [], { status: "execution" }, { canCreate: true }).primary.label, "New request");
  const acts = R.recordRequestActions({ id: 1, status: "active", requestedAmount: 100, paidAmount: 0 }, [], {});
  assert.deepEqual(acts.buttons.map((b) => b.label), ["New invoice", "New payment"]);
}
{
  const src = read("All Module/Case/CaseFinanceBlock.js");
  assert.ok(src.includes('url: "contractBillingPlans:create"') && src.includes("PlanSetupDialog"), "retainer: set up the billing plan from the tab");
  assert.ok(/setInterval\(/.test(src) && /silent/.test(src), "reloads by itself, without a spinner");
  assert.ok(/WebkitLineClamp/.test(src), "long texts are clamped");
  assert.ok(!/"Create invoice"|"Record payment"|"Create request"/.test(src), "every create action is named New ...");
}

// ---- action buttons: one button, or one "Actions" menu from two up (2026-09-29) ----
{
  const G = extractMarkedBlock(
    BLOCK,
    "// ---- finance helpers (pure; tested by scripts/tests/case-finance-block.test.js) ----",
    "// ---- end finance helpers ----",
    ["groupActions"],
  );
  assert.deepEqual(G.groupActions([]), { mode: "none", items: [] });
  const one = [{ key: "invoice", label: "New invoice" }];
  assert.deepEqual(G.groupActions(one), { mode: "single", items: one });
  const two = [{ key: "invoice", label: "New invoice" }, { key: "payment", label: "New payment" }];
  assert.deepEqual(G.groupActions(two), { mode: "menu", items: two });
  assert.deepEqual(G.groupActions([null, ...one, undefined]).mode, "single", "empty slots are ignored");

  const src = read("All Module/Case/CaseFinanceBlock.js");
  assert.ok(!src.includes("TriggersPopover"), "trigger tasks open from the menu, not a separate button");
  assert.ok(src.includes('kind: "triggers"'), "trigger tasks dialog");
  assert.ok(src.includes('"Actions"') && src.includes('label: tr("New")'), "Actions menu / New menu");
}

console.log("case-finance-block: all checks passed");
