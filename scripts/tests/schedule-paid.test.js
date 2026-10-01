const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// ContractPaymentScheduleDetailBlock (2026-09-28): what each installment has
// received follows the money recorded anywhere — the request's paidAmount
// derived by pgsql/finance_foundation.sql (payments on the request or its
// invoice, e.g. from the Case Finance tab) plus old payments tied only to the
// installment by scheduleItemId.
const root = path.resolve(__dirname, "../..");
const BLOCK = path.join(root, "All Module/Contract/ContractPaymentScheduleDetailBlock.js");
const P = extractMarkedBlock(
  BLOCK,
  "// ---- installment paid helpers (pure; tested by scripts/tests/schedule-paid.test.js) ----",
  "// ---- end installment paid helpers ----",
  ["installmentRequests", "installmentPaid"],
);

const row = { id: 11, scheduleItemId: 11, installmentNo: 1 };
{
  // the live (not cancelled) request of the installment, matched by its schedule row
  const reqs = [
    { id: 1, contractPaymentScheduleId: 11, status: "cancelled", createdAt: "2026-09-02" },
    { id: 2, contractPaymentScheduleId: 11, status: "active", createdAt: "2026-09-01", paidAmount: 400 },
    { id: 3, contractPaymentScheduleId: 12, installmentNo: 1, status: "active", createdAt: "2026-09-03" },
  ];
  const { live, latest } = P.installmentRequests(row, reqs);
  assert.equal(live.id, 2, "a cancelled request never wins over the live one");
  assert.equal(latest.id, 2);
  // legacy rows without contractPaymentScheduleId: matched by installment number
  const legacy = P.installmentRequests({ id: "payment-1", scheduleItemId: "payment-1", installmentNo: 2 }, [
    { id: 9, installmentNo: 2, status: "pending", createdAt: "2026-09-01" },
  ]);
  assert.equal(legacy.live.id, 9);
  // only cancelled ones: nothing live, the badge still shows the latest
  const cancelledOnly = P.installmentRequests(row, [{ id: 1, contractPaymentScheduleId: 11, status: "cancelled" }]);
  assert.equal(cancelledOnly.live, null);
  assert.equal(cancelledOnly.latest.id, 1);
}
{
  const live = { id: 2, status: "active", paidAmount: 400 };
  const payments = [
    // counted in the request's paidAmount already (request / invoice link)
    { id: 21, amount: 400, paymentStatus: "Received", paymentRequestId: 2, scheduleItemId: 11 },
    // old payment tied only to the installment, in foreign currency
    { id: 22, amount: 10, exchangeRateToBase: 25000, paymentStatus: "Received", scheduleItemId: 11 },
    // not received / another installment
    { id: 23, amount: 999, paymentStatus: "Cancelled", scheduleItemId: 11 },
    { id: 24, amount: 999, paymentStatus: "Received", scheduleItemId: 12 },
  ];
  const paid = P.installmentPaid(row, payments, live);
  assert.equal(paid.amount, 250400, "request's paidAmount + old installment-only payments, in VND");
  assert.deepEqual(paid.records.map((p) => p.id), [21, 22], "records shown: the received ones of this installment");
  assert.equal(P.installmentPaid(row, [], null).amount, 0);
  assert.equal(P.installmentPaid(row, [], { id: 2, status: "active" }).amount, 0, "legacy request without paidAmount -> 0");
}
{
  // the Requested / Received / Remaining pills: the whole contract, like the Case Finance tab —
  // money on requests outside the schedule (settlement, by hand) included
  const T = extractMarkedBlock(
    BLOCK,
    "// ---- installment paid helpers (pure; tested by scripts/tests/schedule-paid.test.js) ----",
    "// ---- end installment paid helpers ----",
    ["scheduleTotals"],
  );
  const totals = T.scheduleTotals({
    contractTotal: 1000,
    installments: [{ amount: 600 }, { amount: 400 }],
    payments: [
      { amount: 300, paymentStatus: "Received", paymentRequestId: 1 },
      { amount: 1, exchangeRateToBase: 100, paymentStatus: "Received" },
      { amount: 999, paymentStatus: "Cancelled" },
    ],
    paymentRequests: [
      { status: "active", requestedAmount: 600 },
      { status: "pending", requestedAmount: 400 },
      { status: "cancelled", requestedAmount: 999 },
    ],
  });
  assert.deepEqual(totals, { total: 1000, requested: 600, received: 400, remaining: 600 });
  assert.equal(T.scheduleTotals({ contractTotal: 0, installments: [{ amount: 50 }], payments: [], paymentRequests: [] }).remaining, 50, "no contract total -> sum of the schedule");
}
{
  const src = fs.readFileSync(BLOCK, "utf8");
  assert.ok(/setInterval\(/.test(src), "reloads by itself so amounts recorded elsewhere show up");
  assert.ok(/scheduleTotals\(\{/.test(src), "the pills use the contract totals");
  assert.ok(/contractType === "retainer"/.test(src), "retainer periods are billed from the Finance tab, not requested by hand here");
}

console.log("schedule-paid: all checks passed");
