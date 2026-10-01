const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// docs/superpowers/specs/2026-09-30-create-forms-ui-money-unification-design.md §6
const root = path.resolve(__dirname, "../..");
const FORMS = {
  Contract: "All Module/Contract/ContractCreateForm.js",
  Case: "All Module/Case/CaseCreateForm.js",
  Quotation: "All Module/Quotation/QuotationCreateForm.js",
};
const START = "// ---- cross-document payload helpers (pure; tested by scripts/tests/cross-document-writes.test.js) ----";
const END = "// ---- end cross-document payload helpers ----";
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");
const blockOf = (src) => src.slice(src.indexOf(START), src.indexOf(END)).split("\n").map((l) => l.trim()).join("\n");

const blocks = Object.entries(FORMS).map(([name, rel]) => [name, blockOf(read(rel))]);
blocks.forEach(([name, b]) => assert.ok(b.length > 100, `${name}: helper block missing`));
blocks.slice(1).forEach(([name, b]) => assert.equal(b, blocks[0][1], `${name}: helper block differs from Contract's`));

const h = extractMarkedBlock(path.join(root, FORMS.Contract), START, END, ["lineWritePayload", "linkedLineFollowUpPayload", "apiErrorText"], {});
const line = {
  contractId: 5, projectServiceId: 7, status: "active", pricingMode: "line",
  serviceId: 3, serviceName: "Audit", serviceType: "Tax", description: "d", comboId: 2, comboName: "Pack",
  basePrice: 10, quantity: 1, vat: 8, currencyId: 2, subTotal: 261765, vatAmount: 20941, totalAmount: 282706,
};
const own = h.lineWritePayload(line);
["subTotal", "vatAmount", "totalAmount"].forEach((k) => assert.ok(!(k in own), `own line sends ${k}`));
["serviceName", "basePrice", "currencyId", "projectServiceId"].forEach((k) => assert.ok(k in own, `own line lost ${k}`));
const follow = h.linkedLineFollowUpPayload(line);
["serviceId", "serviceName", "serviceType", "description", "comboId", "comboName", "subTotal"].forEach((k) =>
  assert.ok(!(k in follow), `follow-up sends ${k}`));
["contractId", "projectServiceId", "status", "pricingMode", "basePrice", "quantity", "vat", "currencyId"].forEach((k) =>
  assert.ok(k in follow, `follow-up lost ${k}`));
const pkg = { pricingMode: "package", subTotal: 0, packageSubTotal: 5000000 };
assert.deepEqual(h.lineWritePayload(pkg), pkg, "a package line keeps what it sends");
assert.equal(h.apiErrorText({ response: { data: { errors: [{ message: "refused" }] } } }, "x"), "refused");
assert.equal(h.apiErrorText(new Error("boom"), "x"), "boom");
assert.equal(h.apiErrorText(null, "x"), "x");

// ---- the call sites use them ----
const contract = read(FORMS.Contract);
assert.match(contract, /const cleanPayload = stripContractServicePayload\(lineWritePayload\(payload\)\);/, "C1");
assert.match(contract, /updateProjectServiceLineSafely\(\s*lineProjectServiceId,\s*linkedLineFollowUpPayload\(projectServiceUpdatePayload\),/, "C2");
assert.match(contract, /data: linkedLineFollowUpPayload\(quotationServicePayload\),/, "C3");
assert.match(contract, /if \(!isPackage\) return; \/\/ line pricing: trg_money_quotation_header/, "C4 (Review Focus 4: a package quotation is still synced)");

const kase = read(FORMS.Case);
assert.match(kase, /data: cleanPayload\(lineWritePayload\(payload\)\),/, "K1");
assert.doesNotMatch(kase, /await updateContractHeaderSafely\(/, "K4");
assert.doesNotMatch(kase, /setSubmitStep\("Updating quotation total\.\.\."\)/, "K6");
assert.ok((kase.match(/lineWritePayload\(\{/g) || []).length >= 4, "K2/K5 payloads");

const quotation = read(FORMS.Quotation);
assert.match(quotation, /data: linkedLineFollowUpPayload\(contractServicePayload\),/, "Q3");
// Q5: the case header gets totals only for a combo quotation (its trigger skips package pricing)
const projectUpdate = quotation.slice(quotation.indexOf("const projectUpdateData = {"), quotation.indexOf("const projectUpdateData = {") + 900);
assert.match(projectUpdate, /\.\.\.\(packageMode\s*\?\s*\{\s*subTotal: totals\.subTotal,/, "Q5: totals for a combo quotation only");
assert.ok(!projectUpdate.split("...(packageMode")[0].includes("subTotal: totals.subTotal"), "Q5: no unconditional totals");
assert.match(quotation, /if \(!\(localIsPackage\(contract\) \|\| packageLine\)\) return; \/\/ line pricing: trg_money_contract_header/, "Q4 (retainer and package keep their sync)");
assert.doesNotMatch(quotation, /Missing exchange rate for contract total/, "Q4: the line-pricing header computation is gone");
console.log("cross-document-writes: all tests passed");
