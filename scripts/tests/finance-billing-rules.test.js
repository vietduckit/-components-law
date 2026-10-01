const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// Finance P2 (2026-09-28): combo items are billed on trigger (spec §3) — the
// forms tick isPaymentTrigger on combo tasks instead of linking them to a
// request that no longer exists up front. SQL behaviour:
// pgsql/tests/finance_billing_rules_test.sql.
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

{
  const src = read("All Module/Contract/ContractCreateForm.js");
  const start = src.indexOf("// Case exists: link the ticked tasks");
  assert.ok(start > 0, "ContractCreateForm: task-linking block found");
  const block = src.slice(start, start + 4000);
  assert.ok(
    /triggerSource === "case" && comboBillingActive\)[\s\S]*?orderLinksOpenFirst\(ticked, installmentTasksById\)[\s\S]*?isPaymentTrigger: true/.test(block),
    "combo items tick isPaymentTrigger, open tasks first",
  );
  assert.ok(/linkedPaymentRequestId: prId/.test(block), "By Case still links to the installment request");
}
{
  const src = read("All Module/Case/CaseCreateForm.js");
  const start = src.indexOf("const linkInstallmentTemplateTasks = async () => {");
  const block = src.slice(start, src.indexOf("const syncCatalogServiceTasks", start));
  assert.ok(/contractType/.test(block) && /isPaymentTrigger: true/.test(block), "By Service contract: template tasks ticked as triggers");
  assert.ok(/linkedPaymentRequestId: pr\.id/.test(block), "By Case still links to the installment request");
}
{
  const sql = read("pgsql/finance_billing_rules.sql");
  for (const name of [
    "trg_finance_fill_request_stub",
    "trg_finance_payment_request_cancel_guard",
    "trg_finance_billing_plan_active_toggle",
    "trg_finance_contract_terminated",
    "finance_fill_bill_now",
    "retainer_cycle_amount",
  ]) {
    assert.ok(sql.includes(name), `finance_billing_rules.sql defines ${name}`);
  }
  const unified = read("pgsql/unified_contract_payment_schedule.sql");
  assert.ok(/by_service_combo_item_check_and_create/.test(unified), "combo on-trigger creation");
  assert.ok(/AFTER UPDATE OF status, "isPaymentTrigger", "projectServiceId" ON tasks/.test(unified), "task trigger re-checks on tick");
  const run = read("pgsql/retainer_billing_run_due.sql");
  assert.ok(/"isBillingActive" IS NOT FALSE/.test(run), "stopped plans are skipped");
  assert.ok(/retainer_cycle_amount\(/.test(run) && /retainer_step\(/.test(run), "run uses the shared helpers");
}
console.log("finance-billing-rules: all checks passed");
