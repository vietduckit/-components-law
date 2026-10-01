const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// Final review of docs/superpowers/plans/2026-09-30-create-forms-ui-money-unification.md
const root = path.resolve(__dirname, "../..");
const P = {
  Contract: "All Module/Contract/ContractCreateForm.js",
  Case: "All Module/Case/CaseCreateForm.js",
  Quotation: "All Module/Quotation/QuotationCreateForm.js",
};
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");
const numberOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};
const firstNumber = (...values) => {
  for (const v of values) { const p = numberOrNull(v); if (p !== null) return p; }
  return null;
};
const firstNonZeroNumber = (...values) => {
  for (const v of values) { const p = numberOrNull(v); if (p !== null && p !== 0) return p; }
  return 0;
};
const roundAmount = (value) => { const n = Number(value); return Number.isFinite(n) ? Math.round(n) : 0; };
const contract = read(P.Contract);
const kase = read(P.Case);
const quotation = read(P.Quotation);

// ---- #1: a typed price is never rounded to whole units (10.50 USD was sent as 11) ----
const amounts = extractMarkedBlock(
  path.join(root, P.Contract),
  "// ---- amount resolution helpers (pure; tested by scripts/tests/money-rounding.test.js) ----",
  "// ---- end amount resolution helpers ----",
  ["resolveServiceAmounts"],
  { firstNonZeroNumber, firstNumber, roundAmount },
);
assert.equal(amounts.resolveServiceAmounts({ basePrice: 10.5, quantity: 1, vat: 8 }).basePrice, 10.5, "#1: a USD price keeps its cents without decimalPlaces");
assert.equal(amounts.resolveServiceAmounts({ basePrice: "120.50", quantity: 2, vat: 4 }).basePrice, 120.5, "#1: a string price is kept");
assert.equal(amounts.resolveServiceAmounts({ totalAmount: 108, vat: 8 }).basePrice, 100, "#1: a price derived from totals is still rounded");

// ---- #2: a Case row synced to a contract / quotation line converts on that document's date ----
const rates = extractMarkedBlock(
  path.join(root, P.Case),
  "// ---- source rate helpers (pure; tested by scripts/tests/create-forms-money.test.js) ----",
  "// ---- end source rate helpers ----",
  ["rowRateBasis", "sourceDocumentRateDate"],
  {},
);
const vnDay = (v) => (v ? new Date(new Date(v).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10) : null);
assert.equal(rates.sourceDocumentRateDate({ signedAt: "2026-08-17T20:00:00Z", createdAt: "2026-09-01T00:00:00Z" }, null, vnDay), "2026-08-18", "#2: a contract's Signed date, Vietnam day (money_line_rate)");
assert.equal(rates.sourceDocumentRateDate({ createdAt: "2026-09-01T03:00:00Z" }, null, vnDay), "2026-09-01", "#2: unsigned contract → its creation day");
assert.equal(rates.sourceDocumentRateDate(null, { createdAt: "2026-08-31T18:00:00Z" }, vnDay), "2026-09-01", "#2: a quotation's creation day");
assert.equal(rates.sourceDocumentRateDate(null, null, vnDay), null);
const cid = (v) => { const n = parseInt(v && typeof v === "object" ? v.id : v, 10); return Number.isFinite(n) ? n : null; };
const frozenRow = { currencyId: "2", _frozenRate: { rate: 26176.5, date: "2026-08-18" }, _frozenRateCurrencyId: "2" };
assert.deepEqual(rates.rowRateBasis(frozenRow, { extractCurrencyId: cid, synced: true, sourceRateDate: "2026-08-20" }), { rate: 26176.5, date: "2026-08-18" }, "#2: kept currency → the source line's rate");
assert.deepEqual(rates.rowRateBasis({ ...frozenRow, currencyId: "3" }, { extractCurrencyId: cid, synced: true, sourceRateDate: "2026-08-20" }), { rate: null, date: "2026-08-20" }, "#2: currency changed → the source document's date");
assert.deepEqual(rates.rowRateBasis({ currencyId: "2" }, { extractCurrencyId: cid, synced: true, sourceRateDate: "2026-08-20" }), { rate: null, date: "2026-08-20" }, "#2: a new synced row → the source document's date");
assert.deepEqual(rates.rowRateBasis(frozenRow, { extractCurrencyId: cid, synced: false, sourceRateDate: "2026-08-20" }), { rate: null, date: null }, "#2: an unsynced row → the Case's Open date");
assert.deepEqual(rates.rowRateBasis({ currencyId: "2" }, { extractCurrencyId: cid, synced: true, sourceRateDate: null }), { rate: null, date: null }, "#2: no source date → Open date");
assert.ok((kase.match(/rowRateBasis\(/g) || []).length >= 4, "#2: totals, submit, row cell and combo fold use rowRateBasis");
assert.doesNotMatch(kase, /rowFrozenRate\(r(ow)?, extractCurrencyId\)/, "#2: no call site bypasses the sync rule");
assert.match(kase, /sourceRateDate,\s*\n/, "#2: the table receives the source document's date");

// ---- #4: a combo quotation / contract header sums every combo group ----
const summary = extractMarkedBlock(
  path.join(root, P.Contract),
  "// ---- contract summary helpers (pure; tested by scripts/tests/create-forms-money.test.js) ----",
  "// ---- end contract summary helpers ----",
  ["packageHeaderRow"],
  {},
);
const headerRow = summary.packageHeaderRow(
  { id: 1, pricingMode: "package", subTotalNative: 10000000, vatAmountNative: 800000, totalAmountNative: 10800000, exchangeRateDate: "2026-09-01", exchangeRateToBase: 1, basePriceVnd: 0 },
  { subTotal: 25000000, vatAmount: 2000000, totalAmount: 27000000 },
  5,
);
["subTotalNative", "vatAmountNative", "totalAmountNative", "exchangeRateDate", "exchangeRateToBase", "basePriceVnd"].forEach((k) => assert.ok(!(k in headerRow), `#4: header row keeps ${k}`));
assert.deepEqual([headerRow.subTotal, headerRow.vatAmount, headerRow.totalAmount, headerRow.currencyId], [25000000, 2000000, 27000000, 5]);
assert.match(contract, /packageHeaderRow\(/, "#4: the quotation header sync uses packageHeaderRow");
const SUM_START = "// ---- package group sum (pure; tested by scripts/tests/package-group-totals.test.js) ----";
const SUM_END = "// ---- end package group sum ----";
const trim = (s) => s.slice(s.indexOf(SUM_START), s.indexOf(SUM_END)).split("\n").map((l) => l.trim()).join("\n");
assert.ok(quotation.includes(SUM_START), "#4: Quotation has the package group sum");
assert.equal(trim(quotation), trim(contract), "#4: Quotation's package group sum is Contract's");
assert.match(quotation, /sumPackageGroups\(packageLines,/, "#4: the contract header sync sums every combo");

// ---- #5: a retainer header is its typed fee — the quotation form never recomputes it ----
assert.match(quotation, /if \(isRetainer\) return; \/\/ a retainer's header is its typed fee/, "#5");
assert.doesNotMatch(quotation, /parseNum\(contract\.monthlyFee\) \* parseNum\(contract\.retainerDuration\)/, "#5: monthlyFee × duration is gone");

// ---- minors ----
assert.match(contract, /pricingDate: form\.signedDate \|\| "",/, "M1: no UTC today; the lookup falls back to the Vietnam date");
assert.match(kase, /new Set\(sortedLineTotalsByCurrency\.map\(\(group\) => getCurrencyCode\(group\.currency\)\)\)\.size/, "M2: currencies counted, not groups");
// labels may be wrapped in tr("English") (scripts/i18n/ui-strings.js)
const qAt = Math.max(quotation.indexOf('title: "Currency breakdown",'), quotation.indexOf('title: tr("Currency breakdown"),'));
const qModal = quotation.slice(qAt, qAt + 5000);
assert.ok(
  (qModal.includes("`Base currency: ${") || qModal.includes('tr("Base currency: {0}.')) &&
    (qModal.includes('"Converted total in "') || qModal.includes('tr("Converted total in ")')),
  "M3: Quotation modal note and converted strip",
);
assert.match(contract, /message\.warning\(apiErrorText\(error, (?:tr\()?"Could not update the case line\."\)?\)\)/, "M4: C2 failure is shown, submit goes on");
assert.match(quotation, /message\.warning\(apiErrorText\(linkError, (?:tr\()?"Could not link the case line to the quotation\."\)?\)\)/, "M4: Q2 failure is shown");
for (const [name, src] of [["Contract", contract], ["Case", kase], ["Quotation", quotation]]) {
  assert.ok(!/Math\.max\(100, fromIds\.length \* 5\)/.test(src), `M6: ${name} rate page too small for back-dated contracts`);
  assert.ok(!/ -> \$\{/.test(src), `M7: ${name} still writes "->" in missing-rate pairs`);
}
console.log("create-forms-review-fixes: all tests passed");
