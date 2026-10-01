const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// 2026-09-25: a service picked in Line pricing (A), then a combo (B) added in
// Combo pricing, rendered as a loose line next to the combo — mixed data. Rule
// (user): standalone services are merged into the combo being added.
const file = path.resolve(__dirname, "../../All Module/Contract/ContractCreateForm.js");
const { mergeStandaloneIntoCombo } = extractMarkedBlock(
  file,
  "// ---- combo merge helpers (pure; tested by scripts/tests/combo-merge.test.js) ----",
  "// ---- end combo merge helpers ----",
  ["mergeStandaloneIntoCombo"],
);

const rows = [
  { id: "m1", serviceName: "A", basePrice: "1000", vat: "8" },
  { id: "c1", serviceName: "X", _comboInstanceId: "combo-1", _comboName: "Old combo" },
  { id: "m2", serviceName: "B", _packageBasePrice: 500 },
];
const contributions = { m1: 1000, m2: 500 };
const out = mergeStandaloneIntoCombo(
  rows,
  { instanceId: "combo-2", catalogId: "7", name: "Combo B" },
  (row) => contributions[row.id] || 0,
);
assert.deepEqual(out.merged.map((r) => r.id), ["m1", "m2"], "only standalone rows merge");
assert.equal(out.contribution, 1500, "their value joins the combo amount");
const m1 = out.rows.find((r) => r.id === "m1");
assert.equal(m1._comboInstanceId, "combo-2");
assert.equal(m1._comboCatalogId, "7");
assert.equal(m1._comboName, "Combo B");
assert.equal(m1._mergedIntoCombo, true);
assert.equal(m1.basePrice, "", "priced by the combo now");
assert.equal(m1.vat, "0");
assert.equal(m1._comboItemSnapshot.price, 1000, "keeps its own price as reference");
assert.equal(out.rows.find((r) => r.id === "c1")._comboInstanceId, "combo-1", "other combos untouched");
assert.equal(rows[0]._comboInstanceId, undefined, "input not mutated");
// ad-hoc combo (no catalog id)
assert.equal(
  mergeStandaloneIntoCombo(rows, { instanceId: "adhoc-1", catalogId: null, name: "Ad hoc" }, () => 0).rows[0]._comboCatalogId,
  null,
);
// nothing standalone
assert.deepEqual(mergeStandaloneIntoCombo([rows[1]], { instanceId: "z", name: "Z" }, () => 0).merged, []);

// Wiring: both combo paths merge, and top-level "New service" in Combo pricing targets a combo
{
  const src = fs.readFileSync(file, "utf8");
  const applyCombo = src.slice(src.indexOf("const applyCombo = async"), src.indexOf("const applyAdhocCombo = async"));
  assert.ok(/mergeStandaloneIntoCombo\(/.test(applyCombo), "applyCombo merges standalone services");
  const adhoc = src.slice(src.indexOf("const applyAdhocCombo = async"), src.indexOf("const applyAdhocCombo = async") + 9000);
  assert.ok(/mergeStandaloneIntoCombo\(/.test(adhoc), "applyAdhocCombo merges standalone services");
  assert.ok(/addToComboTarget/.test(src), "top-level New service asks which combo to add to");
}

// ---- Case / Quotation create forms: same rule ----
const helperStart = "// ---- combo merge helpers (pure; tested by scripts/tests/combo-merge.test.js) ----";
const helperEnd = "// ---- end combo merge helpers ----";
const wiring = (src, applyStart, applyEnd, adhocEnd) => {
  const apply = src.slice(src.indexOf(applyStart), src.indexOf(applyEnd));
  const adhoc = src.slice(src.indexOf(applyEnd), src.indexOf(adhocEnd));
  for (const [name, body] of [["applyCombo", apply], ["applyAdhocCombo", adhoc]]) {
    assert.ok(/mergeStandaloneIntoCombo\(/.test(body), `${name} merges standalone services`);
    assert.ok(/const dedupeBaseline = \[\.\.\.rows\];/.test(body), `${name} dedupes against rows kept on the form`);
    assert.ok(/-\s*mergeResult\.contribution/.test(body), `${name}: merged value not counted twice in the subtotal`);
  }
  assert.ok(/addToComboTarget/.test(src), "top-level New service asks which combo to add to");
  assert.ok(/onClick: openTopLevelPicker,/.test(src), "New service buttons open with a combo target");
  assert.ok(/comboTargets: packageMode \? comboTargets : \[\]/.test(src), "picker gets the combo list only in Combo pricing");
  assert.ok(/else if \(addToComboTarget && packageMode\)/.test(src), "picked service goes into the chosen combo");
};
{
  const caseFile = path.resolve(__dirname, "../../All Module/Case/CaseCreateForm.js");
  const { mergeStandaloneIntoCombo: mergeCase } = extractMarkedBlock(caseFile, helperStart, helperEnd, ["mergeStandaloneIntoCombo"], {
    BILLING_PACKAGE_INCLUDED: "packageIncluded",
    PRICING_MODE_PACKAGE: "package",
  });
  const caseRows = [
    { _id: 1, serviceName: "A", _packageBasePrice: 2000, billingMode: "line", pricingMode: "line", basePrice: 2000 },
    { _id: 2, serviceName: "From contract", _fromContract: true, _packageBasePrice: 0 },
    { _id: 3, serviceName: "From quotation", _fromQuotation: true },
    { _id: 4, serviceName: "In combo", _comboInstanceId: "combo-9" },
  ];
  const res = mergeCase(caseRows, { instanceId: "combo-1-x", catalogId: 1, name: "B", snapshot: { comboId: 1 } }, (r) => r._packageBasePrice);
  assert.deepEqual(res.merged.map((r) => r._id), [1], "case: source-document rows keep their shape");
  assert.equal(res.contribution, 2000);
  const a = res.rows[0];
  assert.equal(a.billingMode, "packageIncluded");
  assert.equal(a.pricingMode, "package");
  assert.equal(a.basePrice, 0);
  assert.equal(a._packageBasePrice, 0, "deleteRow must not subtract it again");
  assert.equal(a._comboInstanceId, "combo-1-x");
  assert.deepEqual(a._comboSnapshot, { comboId: 1 });
  assert.equal(a._mergedIntoCombo, true);
  const src = fs.readFileSync(caseFile, "utf8");
  wiring(src, "  const applyCombo = useCallback(", "  const applyAdhocCombo = useCallback(", "  const removeAppliedCombo = useCallback(");
}
{
  const qFile = path.resolve(__dirname, "../../All Module/Quotation/QuotationCreateForm.js");
  const { mergeStandaloneIntoCombo: mergeQ } = extractMarkedBlock(qFile, helperStart, helperEnd, ["mergeStandaloneIntoCombo"]);
  const qRows = [
    { _id: 1, serviceName: "A", _packageBasePrice: 3000 },
    { _id: 2, serviceName: "  " },
    { _id: 3, serviceName: "In combo", _comboInstanceId: "adhoc-1" },
  ];
  const res = mergeQ(qRows, { instanceId: "combo-2-y", catalogId: 2, name: "B" }, (r) => r._packageBasePrice);
  assert.deepEqual(res.merged.map((r) => r._id), [1], "quotation: blank placeholder rows untouched");
  assert.equal(res.contribution, 3000);
  assert.equal(res.rows[0]._comboItemSnapshot.price, 3000);
  const src = fs.readFileSync(qFile, "utf8");
  wiring(src, "  const applyCombo = async (comboId) => {", "  const applyAdhocCombo = async (payload) => {", "  const removeAppliedCombo = (instanceId) => {");
  assert.equal((src.match(/return \{ \.\.\.row, basePrice: 0, vat: 0, _packageBasePrice: contributionVnd \};/g) || []).length, 2, "quotation fold keeps each row's value");
}

console.log("combo-merge: all tests passed");
