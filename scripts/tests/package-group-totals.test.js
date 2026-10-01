const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// Bug 2026-09-25: a Contract with combos 62,823,600 + 15,000,000 but a Combo
// Subtotal overridden to 70,000,000 produced a Case whose Combo subtotal was
// 77,823,600 — Case views sum each combo group's own packageSubTotal, and the
// group amounts no longer added up to the contract subtotal. Invariant: the
// package groups (each combo, each standalone package line) sum to the
// contract / case package subtotal.

// ---- CaseCreateForm: normalize rows built from a contract ----
{
  const file = path.resolve(__dirname, "../../All Module/Case/CaseCreateForm.js");
  const { normalizeContractPackageRows } = extractMarkedBlock(
    file,
    "// ---- contract package normalization (pure; tested by scripts/tests/package-group-totals.test.js) ----",
    "// ---- end contract package normalization ----",
    ["normalizeContractPackageRows"],
  );
  const pkg = (extra) => ({ pricingMode: "package", packageVatRate: 8, ...extra });
  // the reported case: two combos summing to 77,823,600, contract subtotal 70,000,000
  const rows = [
    pkg({ id: "a1", comboId: 1, packageSubTotal: 62823600 }),
    pkg({ id: "a2", comboId: 1, packageSubTotal: 62823600 }),
    pkg({ id: "b1", comboId: 2, packageSubTotal: 15000000 }),
    pkg({ id: "b2", comboId: 2, packageSubTotal: 15000000 }),
    pkg({ id: "b3", comboId: 2, packageSubTotal: 15000000 }),
  ];
  const out = normalizeContractPackageRows(rows, { subTotal: 70000000, packageVatRate: 8 });
  const groupA = out.find((r) => r.id === "a1").packageSubTotal;
  const groupB = out.find((r) => r.id === "b1").packageSubTotal;
  assert.equal(groupA + groupB, 70000000, "groups sum to the contract subtotal");
  assert.equal(groupA, Math.round((70000000 * 62823600) / 77823600));
  assert.equal(out.find((r) => r.id === "a2").packageSubTotal, groupA, "same amount on every row of a group");
  assert.equal(out.find((r) => r.id === "b3").packageSubTotal, groupB);
  const a1 = out.find((r) => r.id === "a1");
  assert.equal(a1.packageVatAmount, Math.round((groupA * 8) / 100));
  assert.equal(a1.packageTotalAmount, groupA + a1.packageVatAmount);
  assert.equal(rows[0].packageSubTotal, 62823600, "input not mutated");

  // legacy standalone package lines carry the contract-level total as a
  // fallback — they're "included in package": 0, the combo keeps the total
  const legacy = normalizeContractPackageRows(
    [
      pkg({ id: "c1", comboId: 5, packageSubTotal: 15000000 }),
      pkg({ id: "s1", packageSubTotal: 15000000 }),
      pkg({ id: "s2", packageSubTotal: 15000000 }),
    ],
    { subTotal: 15000000, packageVatRate: 8 },
  );
  assert.deepEqual(legacy.map((r) => [r.id, r.packageSubTotal]), [["c1", 15000000], ["s1", 0], ["s2", 0]]);

  // already consistent (new contracts) → untouched
  const consistent = [pkg({ id: "x", comboId: 1, packageSubTotal: 40000000 }), pkg({ id: "y", comboId: 2, packageSubTotal: 30000000 })];
  assert.equal(normalizeContractPackageRows(consistent, { subTotal: 70000000 }), consistent);
  // line pricing / no subtotal → untouched
  const line = [{ id: "l", pricingMode: "line", packageSubTotal: 0 }];
  assert.equal(normalizeContractPackageRows(line, { subTotal: 70000000 }), line);
  assert.equal(normalizeContractPackageRows(rows, { subTotal: 0 }), rows);

  const src = fs.readFileSync(file, "utf8");
  assert.ok(/normalizeContractPackageRows\(/.test(src.slice(src.indexOf("function mapContractServicesToRows"))), "applied to contract rows");
}

// ---- CaseServices: saving the case Combo subtotal distributes it across groups ----
{
  const file = path.resolve(__dirname, "../../All Module/Case/CaseServices.js");
  const { distributePackageAcrossGroups } = extractMarkedBlock(
    file,
    "// ---- package group distribution (pure; tested by scripts/tests/package-group-totals.test.js) ----",
    "// ---- end package group distribution ----",
    ["distributePackageAcrossGroups"],
  );
  assert.deepEqual(
    distributePackageAcrossGroups([{ key: "A", weight: 62823600 }, { key: "B", weight: 15000000 }], 70000000),
    { A: Math.round((70000000 * 62823600) / 77823600), B: 70000000 - Math.round((70000000 * 62823600) / 77823600) },
  );
  assert.deepEqual(distributePackageAcrossGroups([{ key: "A", weight: 0 }, { key: "B", weight: 0 }], 1001), { A: 501, B: 500 });
  assert.deepEqual(distributePackageAcrossGroups([{ key: "A", weight: 5 }], 70), { A: 70 });

  const src = fs.readFileSync(file, "utf8");
  const save = src.slice(src.indexOf("const handleSavePackageSummary = async"), src.indexOf("const handleSavePackageSummary = async") + 2500);
  assert.ok(/distributePackageAcrossGroups\(/.test(save), "handleSavePackageSummary distributes the subtotal");
}

// ---- ContractCreateForm: saved rows carry their group's share ----
{
  const src = fs.readFileSync(path.resolve(__dirname, "../../All Module/Contract/ContractCreateForm.js"), "utf8");
  const submit = src.slice(src.indexOf("const handleSubmit = async () => {"));
  assert.ok(/withPackageGroupFields\(/.test(submit), "contractServices/projectServices payloads use the group share");
  assert.ok(/const redistributeComboSubtotal = /.test(src), "editing Combo Subtotal redistributes across combos");
}

// ---- ContractCreateForm: header total from a Case/Quotation's services ----
// Bug 2026-09-25: a Case with combos A + B (85,000,000 in total) opened a
// Contract whose Total amount was combo A only — the form read the package
// total off the FIRST package line, but each combo's rows carry that combo's
// own amount. Header total = sum of each distinct group, exactly like
// CaseServices' servicePricingSummary (group = comboId, else comboName, else
// the row itself; VAT on the summed subtotal).
{
  const file = path.resolve(__dirname, "../../All Module/Contract/ContractCreateForm.js");
  const extractId = (v) => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "object") return extractId(v.id);
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const parseNum = (v) => Number(String(v ?? "").replace(/[^\d.-]/g, "")) || 0;
  const { sumPackageGroups } = extractMarkedBlock(
    file,
    "// ---- package group sum (pure; tested by scripts/tests/package-group-totals.test.js) ----",
    "// ---- end package group sum ----",
    ["sumPackageGroups"],
    { extractId, parseNum },
  );
  const line = (extra) => ({ pricingMode: "package", packageVatRate: 8, ...extra });
  // the reported case: combo A (2 services) + combo B (2 services) = 85,000,000
  const lines = [
    line({ id: "a1", comboId: 1, packageSubTotal: 60000000 }),
    line({ id: "a2", comboId: 1, packageSubTotal: 60000000 }),
    line({ id: "b1", comboId: 2, packageSubTotal: 25000000 }),
    line({ id: "b2", comboId: 2, packageSubTotal: 25000000 }),
  ];
  const out = sumPackageGroups(lines);
  assert.equal(out.subTotal, 85000000, "both combos count, each once");
  assert.equal(out.vatAmount, 6800000);
  assert.equal(out.totalAmount, 91800000);
  assert.equal(out.vatRate, 8);
  // ad-hoc combos group by name; a package line with no combo is its own group
  assert.equal(
    sumPackageGroups([
      line({ id: "x1", comboName: "Ad hoc", packageSubTotal: 10 }),
      line({ id: "x2", comboName: "Ad hoc", packageSubTotal: 10 }),
      line({ id: "s1", packageSubTotal: 5 }),
    ]).subTotal,
    15,
  );
  // no rate on the lines → the caller's fallback rate
  assert.equal(sumPackageGroups([{ id: "n", comboId: 3, packageSubTotal: 100 }], 10).vatAmount, 10);

  const src = fs.readFileSync(file, "utf8");
  const apply = src.slice(src.indexOf("const applyServiceSelection = (nextIds"), src.indexOf("const applyServiceSelection = (nextIds") + 3000);
  assert.ok(/sumPackageGroups\(selectedPackageLines/.test(apply), "service selection sums every combo group");
  assert.ok(
    !/const packageAmounts = packageMode\s*\?\s*resolvePackageAmounts\(/.test(apply),
    "the total is no longer read off the first package line",
  );
  const popup = src.slice(src.indexOf("const selectedPackageSource ="), src.indexOf("const selectedPackageSource =") + 2500);
  assert.ok(/sumPackageGroups\(/.test(popup), "popup-opened contract sums every combo group");
  const summary = src.slice(src.indexOf("const summaryRows = isPackage"), src.indexOf("const summaryRows = isPackage") + 1500);
  assert.ok(/sumPackageGroups\(/.test(summary), "quotation summary row sums every combo group");
  const modeChange = src.slice(src.indexOf("const handleManualPricingModeChange = (mode) => {"), src.indexOf("const handleManualPricingModeChange = (mode) => {") + 2500);
  assert.ok(/sumPackageGroups\(/.test(modeChange), "switching to Combo pricing sums every combo group");
}

// ---- ContractServices / QuotationServices / ContractDetailView: package total on load / header resync ----
// Same bug class: the blocks read the package total off the FIRST package
// row (one combo's own amount) — shown as the whole total, re-split over
// every combo on save, and written to the contract header by
// syncContractHeaderFromServices.
for (const rel of [
  "All Module/Contract/ContractServices.js",
  "All Module/Quotation/QuotationServices.js",
  "All Module/Contract/ContractDetailView.js",
]) {
  const file = path.resolve(__dirname, "../..", rel);
  const { packageDocumentSubTotal, packageRowsSubTotal } = extractMarkedBlock(
    file,
    "// ---- package document subtotal (pure; tested by scripts/tests/package-group-totals.test.js) ----",
    "// ---- end package document subtotal ----",
    ["packageDocumentSubTotal", "packageRowsSubTotal"],
  );
  const rows = [
    { id: 1, comboId: 1, packageSubTotal: 60000000 },
    { id: 2, comboId: 1, packageSubTotal: 60000000 },
    { id: 3, comboId: 2, packageSubTotal: 25000000 },
    { id: 4, comboName: "Ad hoc", packageSubTotal: 5000000 },
    { id: 5, comboName: "Ad hoc", packageSubTotal: 5000000 },
  ];
  // load: the document header wins (right for old contracts too)…
  assert.equal(packageDocumentSubTotal({ subTotal: 90000000 }, rows), 90000000, `${rel}: header subtotal`);
  // …without one, each group once
  assert.equal(packageDocumentSubTotal({}, rows), 90000000, `${rel}: groups summed once`);
  assert.equal(packageDocumentSubTotal({ subTotal: 90000000 }, rows, false), 90000000, `${rel}: header not used`);
  // resync from rows: each group once
  assert.equal(packageRowsSubTotal(rows, 60000000), 90000000, `${rel}: resync sums the groups`);
  // old contract shape (every row stamped with the whole total) keeps the header
  const legacy = [
    { id: 1, comboId: 1, packageSubTotal: 70000000 },
    { id: 2, comboId: 2, packageSubTotal: 70000000 },
  ];
  assert.equal(packageRowsSubTotal(legacy, 70000000), 70000000, `${rel}: legacy rows not multiplied`);

  const src = fs.readFileSync(file, "utf8");
  assert.ok(/setPackageSubTotal\(\s*packageDocumentSubTotal\(/.test(src), `${rel}: load uses the document subtotal`);
  assert.ok(!/setPackageSubTotal\(parseNum\(packageSource\?\.packageSubTotal/.test(src), `${rel}: not the first row's amount`);
  assert.ok(/subTotal = packageRowsSubTotal\(packageLines, contract\.subTotal\)/.test(src), `${rel}: header resync sums the groups`);
}
{
  const src = fs.readFileSync(path.resolve(__dirname, "../../All Module/Contract/ContractCreateForm.js"), "utf8");
  const own = src.slice(src.indexOf("const comboOwnPrice = (line) => {"), src.indexOf("const comboOwnPrice = (line) => {") + 600);
  assert.ok(/sourceComboAmount/.test(own), "contract form: a source combo keeps its Case/Quotation amount on submit");
}

// ---- ContractServices / QuotationServices / ContractDetailView: saving rescales groups ----
for (const rel of [
  "All Module/Contract/ContractServices.js",
  "All Module/Quotation/QuotationServices.js",
  "All Module/Contract/ContractDetailView.js",
]) {
  const src = fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
  assert.ok(/const packageGroupShareOf = \(\(\) => \{/.test(src), `${rel}: group share computed on save`);
  assert.ok(
    /packageSubTotal: packageGroupShareOf\(r\) \?\? r\.packageSubTotal \?\? packageSubTotal,/.test(src),
    `${rel}: saved rows use the group share`,
  );
}

console.log("package-group-totals: all tests passed");
