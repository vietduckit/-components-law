const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// 2026-09-30: a retainer's Total amount is the fee of EVERY period — no longer
// split over the periods. What the contract is worth (Outstanding / Paid) is
// fee × the plan's periods; open-ended: the periods billed so far (at least 1).
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

// ---- Payment blocks: JS twins of contract_retainer_value ----
const START = "// ---- retainer contract value (pure; tested by scripts/tests/retainer-per-period.test.js) ----";
const END = "// ---- end retainer contract value ----";
const parseNum = (v) => Number(String(v ?? "").replace(/[^\d.-]/g, "")) || 0;
for (const rel of [
  "All Module/Payment/PaymentContractDetailBlock.js",
  "All Module/Payment/PaymentCreateBlock.js",
  "All Module/Payment/PaymentRequestCreateBlock.js",
]) {
  const { retainerContractValue } = extractMarkedBlock(path.join(root, rel), START, END, ["retainerContractValue"], { parseNum });
  const fixed = { id: 2, planType: "retainer", status: "active", totalAmount: 1000, retainerTotalCycles: 3, retainerCyclesBilled: 1 };
  const c = (plans) => ({ contractType: "retainer", totalAmount: 1000, billingPlans: plans });
  assert.equal(retainerContractValue(c([fixed])), 3000, rel);
  assert.equal(retainerContractValue(c([{ ...fixed, retainerTotalCycles: null, retainerCyclesBilled: 0 }])), 1000, `${rel}: open-ended, nothing billed`);
  assert.equal(retainerContractValue(c([{ ...fixed, retainerTotalCycles: null, retainerCyclesBilled: 4 }])), 4000, `${rel}: open-ended`);
  assert.equal(
    retainerContractValue(c([{ ...fixed, id: 9, status: "completed", retainerTotalCycles: 2 }, fixed])),
    3000,
    `${rel}: the active plan wins`,
  );
  assert.equal(retainerContractValue(c([])), 0, `${rel}: no plan yet`);
  assert.equal(retainerContractValue({ contractType: "byCase", totalAmount: 1000, billingPlans: [fixed] }), 0, `${rel}: not a retainer`);
  assert.equal(retainerContractValue(null), 0, rel);
}
{
  for (const rel of ["All Module/Payment/PaymentContractDetailBlock.js", "All Module/Payment/PaymentCreateBlock.js"]) {
    const src = read(rel);
    const fn = src.slice(src.indexOf("const contractTotalAmount = (contract) => {"));
    assert.ok(/^const contractTotalAmount = \(contract\) => \{\s*const retainerValue = retainerContractValue\(contract\);\s*if \(retainerValue > MONEY_TOLERANCE\) return retainerValue;/.test(fn), `${rel}: contract total = retainer value first`);
  }
  const src = read("All Module/Payment/PaymentRequestCreateBlock.js");
  const fn = src.slice(src.indexOf("const contractMoneyInfo = "), src.indexOf("const contractMoneyInfo = ") + 3000);
  assert.ok(/const totalAmount =\s*retainerContractValue\(contract\) \|\|/.test(fn), "contractMoneyInfo: retainer value first");
}

// ---- Contract form: Total amount is labelled per period for a retainer ----
{
  const src = read("All Module/Contract/ContractCreateForm.js");
  assert.ok(/"Retainer duration": (?:tr\()?"Number of periods\. Each period bills the amount per period;/.test(src), "help text: no split");
  assert.ok(!/each period bills Total amount ÷ periods/.test(src), "old split help text gone");
  assert.ok(/isRetainer\s*\?\s*\{\s*label: (?:tr\()?"Amount per period"\)?,/.test(src), "retainer: Amount per period label, fixed or open-ended");
}

// ---- Contract Detail: the plan's amount is per period ----
{
  const src = read("All Module/Contract/ContractDetailView.js");
  assert.ok(/ReadField, \{ label: (?:tr\()?"Amount per period"\)?, value: formatMoney\(plan\.totalAmount\) \}/.test(src), "read view label");
  assert.ok(/FieldRow, \{ label: (?:tr\()?"Amount per period"\)? \}, React\.createElement\(NumberField, \{ value: form\.planTotalAmount/.test(src), "edit label");
}

// ---- SQL ----
{
  const rules = read("pgsql/finance_billing_rules.sql");
  const helper = rules.slice(rules.indexOf("FUNCTION public.retainer_cycle_amount"), rules.indexOf("$function$;", rules.indexOf("FUNCTION public.retainer_cycle_amount")));
  assert.ok(/SELECT ROUND\(p_total::numeric\);/.test(helper), "every period bills the whole fee");
  assert.ok(!/p_total::numeric \/ p_cycles/.test(helper), "no split");

  const status = read("pgsql/contract_payment_status_workflow.sql");
  assert.ok(/FUNCTION public\.contract_retainer_value\(p_contract_id BIGINT\)/.test(status), "contract_retainer_value defined");
  assert.ok(status.indexOf("FUNCTION public.contract_retainer_value") < status.indexOf("FUNCTION public.contract_resolved_total(p_contract_id BIGINT)"), "defined before use");
  assert.ok(/COALESCE\(contract_retainer_value\(c\.id\), contract_resolved_total_from_row\(c\)\)/.test(status), "contract total = retainer value first");

  const sched = read("pgsql/finance_retainer_schedule.sql");
  const onChange = sched.slice(sched.indexOf("FUNCTION public.retainer_schedule_on_plan_change"));
  assert.ok(/PERFORM public\.contract_recompute_outstanding_for\(NEW\."contractId"\);/.test(onChange), "plan change recomputes the contract balance");
  assert.ok(/contract_recompute_outstanding_for\(c\.id\)[\s\S]*"contractType" = 'retainer'/.test(sched.slice(sched.lastIndexOf("Existing retainer"))), "deploy recomputes retainer balances");
}

console.log("retainer-per-period: all tests passed");
