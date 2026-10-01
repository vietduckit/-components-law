const assert = require("node:assert/strict");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

const { applyContractTriggerSelection } = extractMarkedBlock(
  path.resolve(__dirname, "../../All Module/Case/CaseCreateForm.js"),
  "// ---- contract trigger seed (pure; tested by scripts/tests/case-trigger-seed.test.js) ----",
  "// ---- end contract trigger seed ----",
  ["applyContractTriggerSelection"],
);

const catalog = [
  { id: 4, templateName: "Draft", isPaymentTrigger: false },
  { id: 5, templateName: "Sign", isPaymentTrigger: true },
];

// ids present → overrides catalog default, new objects (catalog untouched)
{
  const out = applyContractTriggerSelection(catalog, ["4"]);
  assert.deepEqual(out.map((t) => t.isPaymentTrigger), [true, false]);
  assert.equal(catalog[0].isPaymentTrigger, false);
  assert.equal(catalog[1].isPaymentTrigger, true);
  assert.notEqual(out[0], catalog[0]);
}
// [] → explicitly none
assert.deepEqual(applyContractTriggerSelection(catalog, []).map((t) => t.isPaymentTrigger), [false, false]);
// null / undefined / non-array (old contracts) → same array back, unchanged (Review Focus 5)
assert.equal(applyContractTriggerSelection(catalog, null), catalog);
assert.equal(applyContractTriggerSelection(catalog, undefined), catalog);
assert.equal(applyContractTriggerSelection(catalog, "4"), catalog);
// numeric ids in storage still match
assert.deepEqual(applyContractTriggerSelection(catalog, [5]).map((t) => t.isPaymentTrigger), [false, true]);

console.log("case-trigger-seed: all tests passed");
