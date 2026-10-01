const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// contracts.cases is a hasMany on projects.contractId (schema dump), so
// contracts:create itself links the Case and fires the SQL catch-up trigger
// by_service_contract_linked_catches_up_done_tasks. Trigger flags must be on
// the tasks BEFORE that call, not merely before projects:update.
const src = fs.readFileSync(
  path.resolve(__dirname, "../../All Module/Contract/ContractCreateForm.js"),
  "utf8",
);
const submitStart = src.indexOf("const handleSubmit = async () => {");
assert.ok(submitStart > 0, "handleSubmit not found");
const body = src.slice(submitStart);
const taskWrites = body.indexOf("diffTaskTriggers(triggerTasksByLine");
const contractCreate = body.indexOf('url: "contracts:create"');
assert.ok(taskWrites > 0, "trigger task writes not found in handleSubmit");
assert.ok(contractCreate > 0, "contracts:create not found in handleSubmit");
assert.ok(
  taskWrites < contractCreate,
  "trigger task writes must run before contracts:create (it links the Case)",
);
// Every trigger-data use in submit is gated on the data being current.
assert.ok(
  /isTriggerDataCurrent\(/.test(body.slice(0, contractCreate)),
  "handleSubmit must check isTriggerDataCurrent before using trigger data",
);

console.log("submit-order: all tests passed");
