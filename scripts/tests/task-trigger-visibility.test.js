const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// By Case + One time bills through a single payment that waits for the Case
// to be Done — or, once tasks are linked to it, for ALL of them
// (by_case_one_time_sync_trigger_mode, 2026-09-29). Task Management / Task
// Detail therefore show the trigger control for it, offering that payment.
const START = "// ---- by-case one-time contract check (pure; tested by scripts/tests/task-trigger-visibility.test.js) ----";
const END = "// ---- end by-case one-time contract check ----";

for (const rel of ["All Module/Task/TaskManagement.js", "All Module/Task/TaskDetailView.js"]) {
  const file = path.resolve(__dirname, "../..", rel);
  const { isByCaseOneTimeContract, linkableTriggerRequests, LINKABLE_TRIGGER_TYPES } = extractMarkedBlock(
    file,
    START,
    END,
    ["isByCaseOneTimeContract", "linkableTriggerRequests", "LINKABLE_TRIGGER_TYPES"],
  );
  assert.equal(isByCaseOneTimeContract({ contractType: "byCase", billingCycle: "one_time" }), true, rel);
  assert.equal(isByCaseOneTimeContract({ contractType: "byCase", billingCycle: null }), true, `${rel}: blank = one time`);
  assert.equal(isByCaseOneTimeContract({ contractType: "byCase", billingCycle: "multiple_payments" }), false, rel);
  assert.equal(isByCaseOneTimeContract({ contractType: "byService", billingCycle: "one_time" }), false, rel);
  assert.equal(isByCaseOneTimeContract({ contractType: "retainer" }), false, rel);
  assert.equal(isByCaseOneTimeContract(null), false, rel);

  assert.deepEqual(LINKABLE_TRIGGER_TYPES, ["on_task_done", "on_case_done"], rel);
  const prs = [
    { id: 1, triggerType: "on_task_done" },
    { id: 2, triggerType: "on_case_done" },
    { id: 3, triggerType: "on_date" },
  ];
  // One time: its single payment is linkable while it still waits for the Case
  assert.deepEqual(
    linkableTriggerRequests(prs, { contractType: "byCase", billingCycle: "one_time" }).map((pr) => pr.id),
    [1, 2],
    `${rel}: one time`,
  );
  // installments / By Service: only requests driven by tasks
  assert.deepEqual(
    linkableTriggerRequests(prs, { contractType: "byCase", billingCycle: "multiple_payments" }).map((pr) => pr.id),
    [1],
    `${rel}: multiple payments`,
  );
  assert.deepEqual(linkableTriggerRequests(prs, { contractType: "byService" }).map((pr) => pr.id), [1], rel);
  assert.deepEqual(linkableTriggerRequests(null, null), [], rel);
}

// Wiring
{
  const src = fs.readFileSync(path.resolve(__dirname, "../../All Module/Task/TaskManagement.js"), "utf8");
  assert.ok(/fetchAll\("contracts:list", "id,contractType,billingCycle"/.test(src), "TaskManagement fetches billingCycle");
  assert.ok(!/contractType === CONTRACT_MODE_BY_CASE_ONE_TIME\) \{/.test(src), "TriggerCell no longer falls back for one-time");
  assert.ok(/const oneTime = contractType === CONTRACT_MODE_BY_CASE_ONE_TIME;/.test(src), "TriggerCell knows one-time");
  assert.ok(/if \(contractType === "byCase" \|\| oneTime \|\| coveredByItem\)/.test(src), "one-time uses the installment picker");
  assert.ok(/React\.createElement\(ColHeader, \{ hasContract \}\)/.test(src), "header shows the trigger column for one-time");
  assert.ok(/triggerType: \{ \$in: LINKABLE_TRIGGER_TYPES \}/.test(src), "loads on_case_done requests too");
  assert.ok(/linkableTriggerRequests\(rows, contractRows\?\.\[0\]\)/.test(src), "filters them by contract");
}
{
  const src = fs.readFileSync(path.resolve(__dirname, "../../All Module/Task/TaskDetailView.js"), "utf8");
  assert.ok(/fetchAll\("contracts:list", "id,contractType,billingCycle"/.test(src), "TaskDetailView fetches billingCycle");
  assert.ok(!/hasContract &&\s*!isByCaseOneTimeContract\(caseInfo\) &&/.test(src), "trigger block shown for one-time");
  assert.ok(/triggerType: \{ \$in: LINKABLE_TRIGGER_TYPES \}/.test(src), "loads on_case_done requests too");
  assert.ok(/linkableTriggerRequests\(rows, contractRows\?\.\[0\]\)/.test(src), "filters them by contract");
  assert.ok(/if \(oneTime\) return true;/.test(src), "one-time payment offered to every task");
  assert.ok(/const coveredByItem =/.test(src), "Combo pricing item services use the installment picker");
}

console.log("task-trigger-visibility: all tests passed");
