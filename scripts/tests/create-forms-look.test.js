const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// docs/superpowers/specs/2026-09-30-create-forms-ui-money-unification-design.md §3
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");
// 2026-10-01: labels are tr("English") + a VI dictionary (scripts/i18n/ui-strings.js).
// `has` accepts a label as a literal or wrapped in tr(); `ui` drops the dictionary.
const { MARK_START, MARK_END } = require("../i18n/ui-strings");
const ui = (src) => (src.includes(MARK_START) ? src.slice(0, src.indexOf(MARK_START)) + src.slice(src.indexOf(MARK_END)) : src);
const has = (src, s) =>
  src.includes(s) || src.includes(s.startsWith("`") ? `tr("${s.slice(1)}` : `tr(${s})`) || src.includes(s.startsWith("`") ? "" : `tr(${s},`);
const START = "// ---- currency breakdown helpers (pure; tested by scripts/tests/create-forms-look.test.js) ----";
const END = "// ---- end currency breakdown helpers ----";
const FORMS_WITH_HELPER = (process.env.LOOK_FORMS || "Contract,Quotation").split(",");
const PATHS = {
  Contract: "All Module/Contract/ContractCreateForm.js",
  Quotation: "All Module/Quotation/QuotationCreateForm.js",
  Case: "All Module/Case/CaseCreateForm.js",
};
const convert = (lines, rate) =>
  lines.reduce((acc, l) => {
    const s = Math.round(l.subTotal * rate); const v = Math.round(l.vatAmount * rate);
    return { subTotal: acc.subTotal + s, vatAmount: acc.vatAmount + v, totalAmount: acc.totalAmount + s + v };
  }, { subTotal: 0, vatAmount: 0, totalAmount: 0 });
for (const form of FORMS_WITH_HELPER) {
  const { currencyBreakdownRows } = extractMarkedBlock(path.join(root, PATHS[form]), START, END, ["currencyBreakdownRows"], {});
  const groups = [
    { currency: { code: "VND" }, lineCount: 1, totalAmount: 19440000, lines: [{ subTotal: 18000000, vatAmount: 1440000 }] },
    { currency: { code: "USD" }, lineCount: 2, totalAmount: 21.6, lines: [{ subTotal: 10, vatAmount: 0.8 }, { subTotal: 10, vatAmount: 0.8 }] },
    { currency: { code: "SGD" }, lineCount: 1, totalAmount: 5, lines: [{ subTotal: 5, vatAmount: 0 }] },
  ];
  const rows = currencyBreakdownRows(groups, {
    isBase: (g) => g.currency.code === "VND",
    matchOf: (g) => (g.currency.code === "USD" ? { rate: 26176.5, record: { effectiveDate: "2026-08-18", source: "Vietcombank" }, direction: "inverse" } : null),
    codeOf: (c) => c.code,
    convert,
  });
  assert.deepEqual(rows.map((r) => r.status), ["base", "converted", "missing"], form);
  assert.equal(rows[1].convertedTotal, 2 * 282706, `${form}: lines converted one by one`);
  assert.equal(rows[1].source, "Vietcombank (inverse)", form);
  assert.equal(rows[1].effectiveDate, "2026-08-18", form);
  assert.equal(rows[2].source, "No rate", form);
  assert.equal(rows[0].source, "Base currency", form);
}
if (FORMS_WITH_HELPER.length > 1) {
  const blocks = FORMS_WITH_HELPER.map((f) => { const s = read(PATHS[f]); return s.slice(s.indexOf(START), s.indexOf(END)).split("\n").map((l) => l.trim()).join("\n"); });
  blocks.slice(1).forEach((b, i) => assert.equal(b, blocks[0], `${FORMS_WITH_HELPER[i + 1]}: breakdown helper differs`));
}

// ---- Contract table: the Case columns and cells ----
const contract = read(PATHS.Contract);
const section = contract.slice(contract.indexOf("const ManualContractServicesSection = ({"), contract.indexOf("const PaymentScheduleSection = ({"));
["\"#\"", "\"Service Name & Type\"", "\"Unit Price\"", "\"VAT (%)\"", "\"Total\"", "`Original: ", "`Missing rate to ", "\"Currency breakdown\"", "`View currency breakdown (", "\"Converted total in \"", "\"Rate to \""]
  .forEach((s) => assert.ok(has(section, s), `Contract services table lacks ${s}`));
["\"Base price\"", "Gốc:", "Thiếu tỷ giá", "Quy đổi", "\"Đóng\""].forEach((s) => assert.ok(!section.includes(s), `Contract services table still has ${s}`));
assert.ok(!contract.includes("const ServiceLinesSection = ("), "ServiceLinesSection removed");
assert.ok(!contract.includes("SERVICE_STATUS_LABELS"), "its status labels removed");
assert.match(section, /currencyBreakdownRows\(financialSummary\.groups,/, "the modal uses the helper");

// ---- Quotation: same cells, footer and modal ----
const quotation = read(PATHS.Quotation);
["`Original: ", "`Missing rate to ", "\"Currency breakdown\"", "`View currency breakdown (", "\"Combo subtotal:\"", "\"VAT (%):\"", "\"VAT amount:\"", "\"Combo total:\""]
  .forEach((s) => assert.ok(has(quotation, s), `Quotation lacks ${s}`));
["Gốc:", "Thiếu tỷ giá", "Quy đổi tiền tệ", "\"Combo Subtotal:\"", "\"VAT Amount:\"", "\"Combo Total:\""].forEach((s) => assert.ok(!ui(quotation).includes(s), `Quotation still has ${s}`));
assert.match(quotation, /currencyBreakdownRows\(financialSummary\.groups,/, "Quotation modal uses the helper");

// ---- Case: footer labels and button ----
const kase = read(PATHS.Case);
["\"VAT amount\"", "\"Combo subtotal:\"", "\"VAT (%):\"", "\"VAT amount:\"", "\"Combo total:\"", "`View currency breakdown ("].forEach((s) => assert.ok(has(kase, s), `Case lacks ${s}`));
["\"Total VAT\"", "\"Combo Subtotal:\"", "\"VAT Amount:\"", "\"Combo Total:\"", "\"View breakdown\""].forEach((s) => assert.ok(!ui(kase).includes(s), `Case still has ${s}`));
console.log("create-forms-look: all tests passed");
