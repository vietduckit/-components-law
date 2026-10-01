const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// Finance P1 (2026-09-28): one status vocabulary everywhere.
// Payment Requests: pending / active / cancelled. Payments: Received / Cancelled.
// The SQL behaviour is exercised by pgsql/tests/finance_foundation_test.sql;
// this keeps the JS blocks and the SQL files in step.
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

// ---- JS never creates a request as "submitted" ----
for (const rel of [
  "All Module/Payment/PaymentRequestCreateBlock.js",
  "All Module/Contract/ContractDetailView.js",
  "All Module/Contract/ContractPaymentScheduleDetailBlock.js",
  "JsField/Workflow/CreateContractBillingPlansWorkflow.js",
]) {
  const src = read(rel);
  assert.ok(!/status:\s*"submitted"/.test(src), `${rel}: no request is created as "submitted"`);
}
for (const rel of ["All Module/Payment/PaymentRequestCreateBlock.js", "All Module/Contract/ContractDetailView.js", "All Module/Contract/ContractPaymentScheduleDetailBlock.js"]) {
  assert.ok(/status:\s*"active"/.test(read(rel)), `${rel}: requests are created "active"`);
}
for (const rel of ["All Module/Contract/ContractDetailView.js", "All Module/Contract/ContractPaymentScheduleDetailBlock.js"]) {
  const src = read(rel);
  assert.ok(/const REQUESTED_PR_STATUSES = \["active"\];/.test(src), `${rel}: requested = active`);
  for (const gone of ["submitted:", "checking:", "approved:", "converted:", "rejected:"]) {
    assert.ok(!src.includes(`  ${gone} { label:`), `${rel}: PR_STATUS_META has no ${gone}`);
  }
}

// ---- payments: Received / Cancelled only ----
{
  const src = read("All Module/Payment/PaymentCreateBlock.js");
  assert.ok(/const ACTUAL_PAYMENT_STATUSES = \["received"\];/.test(src), "PaymentCreateBlock: only received counts");
  assert.ok(/const FINAL_STATUSES = \["received"\];/.test(src), "PaymentCreateBlock: final = received");
  assert.ok(/options: \["Received", "Cancelled"\]\.map/.test(src), "PaymentCreateBlock: status options");
  assert.ok(
    /const deriveActualPaymentStatus = \(\) => "Received";/.test(src),
    "deriveActualPaymentStatus always returns Received (never Partial)",
  );
}
assert.ok(
  /const ACTUAL_PAYMENT_STATUSES = \["received"\];/.test(read("All Module/Payment/PaymentContractDetailBlock.js")),
  "PaymentContractDetailBlock: only received counts",
);

// ---- SQL shape ----
{
  const sql = read("pgsql/finance_foundation.sql");
  for (const name of [
    "ux_payment_requests_schedule_open",
    "ux_payment_requests_project_service_open",
    "ux_payment_requests_plan_cycle_open",
    "trg_finance_payment_request_derive",
    "trg_finance_invoice_derive",
    "trg_finance_payment_rollup",
    "trg_finance_invoice_link_rollup",
    "finance_refresh_overdue",
  ]) {
    assert.ok(sql.includes(name), `finance_foundation.sql defines ${name}`);
  }
  assert.ok(/'Asia\/Ho_Chi_Minh'/.test(sql), "business dates in Vietnam time");
}
{
  const sql = read("pgsql/contract_payment_status_workflow.sql");
  assert.ok(/AFTER INSERT OR UPDATE OR DELETE ON payments/.test(sql), "contract outstanding recomputes on every payment change");
  assert.ok(!/IN \('received', 'paid', 'completed', 'partial'\)/.test(sql), "contract outstanding: Received only");
}
{
  const sql = read("pgsql/retainer_billing_run_due.sql");
  assert.ok(!/'submitted'/.test(sql.replace(/^--.*$/gm, "")), "retainer requests are not 'submitted'");
  assert.ok(/"billingPlanId", "cycleNo"/.test(sql), "retainer requests record plan + cycle");
}
{
  const sql = read("pgsql/unified_contract_payment_schedule.sql");
  assert.ok(
    /WHERE "projectServiceId" = p_project_service_id AND status IS DISTINCT FROM 'cancelled'/.test(sql),
    "By Service idempotency ignores cancelled",
  );
}
console.log("finance-foundation: all checks passed");
