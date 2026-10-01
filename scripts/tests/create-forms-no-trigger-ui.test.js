const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// 2026-09-25: the New Case form's per-task "Trigger" column is removed (user
// request). The New Contract form KEEPS its Payment Triggers section — By
// Case installment trigger tasks, By Service per-service triggers and Combo
// pricing billing items (removing it by mistake was reverted the same day).
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

{
  const src = read("All Module/Contract/ContractCreateForm.js");
  const renders = src.match(/React\.createElement\(PaymentTriggersSection, \{/g) || [];
  // + 2026-09-29: By Case One time (its single payment's trigger tasks)
  assert.equal(renders.length, 4, "contract form: Payment Triggers for installments, One time, billing items and services");
  assert.ok(/React\.createElement\(PaymentScheduleSection, \{/.test(src), "contract form: By Case payment schedule");
  assert.equal((src.match(/const comboBillingItems\b/g) || []).length, 1, "comboBillingItems declared once (helper only)");
}

{
  const src = read("All Module/Case/CaseCreateForm.js");
  const card = src.slice(src.indexOf("const renderTaskCard = (row) => {"), src.indexOf("const renderTaskCard = (row) => {") + 9000);
  assert.ok(!/^\s*"Trigger",\s*$/m.test(card), "case form: no Trigger column in the task overview");
  assert.ok(!/updateEditableTask\(row, taskIndex, "isPaymentTrigger"/.test(src), "case form: trigger not editable");
}

console.log("create-forms-no-trigger-ui: all tests passed");
