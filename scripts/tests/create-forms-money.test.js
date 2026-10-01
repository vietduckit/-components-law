const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// docs/superpowers/specs/2026-09-30-create-forms-ui-money-unification-design.md §4
const root = path.resolve(__dirname, "../..");
const CONTRACT = path.join(root, "All Module/Contract/ContractCreateForm.js");
const cases = JSON.parse(fs.readFileSync(path.join(root, "scripts/tests/fixtures/money-cases.json"), "utf8"));
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
const amounts = extractMarkedBlock(
  CONTRACT,
  "// ---- amount resolution helpers (pure; tested by scripts/tests/money-rounding.test.js) ----",
  "// ---- end amount resolution helpers ----",
  ["lineAmountsInCurrency", "resolveServiceAmounts"],
  { firstNonZeroNumber, firstNumber, roundAmount },
);
const pick = (a) => [a.subTotal, a.vatAmount, a.totalAmount];

// ---- the shared money cases: Contract resolves a line like the database ----
for (const c of cases.lines) {
  const a = amounts.lineAmountsInCurrency({ basePrice: c.basePrice, quantity: c.quantity, vat: c.vat }, c.decimals);
  assert.deepEqual(pick(a), c.native, `Contract line: ${c.name}`);
}

// ---- a case line as the API returns it: no decimalPlaces, VND totals, no natives ----
const apiCaseLine = { basePrice: 10, quantity: 1, vat: 8, currencyId: 2, subTotal: 261765, vatAmount: 20941, totalAmount: 282706 };
assert.deepEqual(pick(amounts.lineAmountsInCurrency(apiCaseLine, 2)), [10, 0.8, 10.8], "USD cents kept (not 11 USD)");
// ---- Review Focus 3: a legacy line with totals but no price keeps its totals ----
assert.deepEqual(pick(amounts.lineAmountsInCurrency({ subTotal: 100, vatAmount: 8, totalAmount: 108 }, 0)), [100, 8, 108], "legacy line without a price");

// ---- the footer converts at the pricing date it is given ----
const seen = [];
const { buildContractFinancialSummary } = extractMarkedBlock(
  CONTRACT,
  "// ---- contract summary helpers (pure; tested by scripts/tests/create-forms-money.test.js) ----",
  "// ---- end contract summary helpers ----",
  ["buildContractFinancialSummary"],
  {
    findDefaultCurrency: () => ({ id: 1, code: "VND", decimalPlaces: 0 }),
    resolveServiceAmounts: amounts.resolveServiceAmounts,
    lineAmountsInCurrency: amounts.lineAmountsInCurrency,
    currencyFromRecord: (row) => (row.currencyId === 2 ? { id: 2, code: "USD", decimalPlaces: 2 } : { id: 1, code: "VND", decimalPlaces: 0 }),
    getCurrencyDecimals: (c) => c.decimalPlaces,
    extractCurrencyId: (v) => (v && typeof v === "object" ? v.id : v) || null,
    getCurrencyCode: (c) => c.code,
    isSameCurrency: (a, b) => a.id === b.id,
    pickConversionRate: (rates, from, to, date) => {
      seen.push(date);
      return date === "2026-08-18" ? { rate: 26176.5 } : { rate: 30000 };
    },
    convertLinesToBase: (lines, rate) =>
      lines.reduce((acc, l) => {
        const s = Math.round(l.subTotal * rate); const v = Math.round(l.vatAmount * rate);
        return { subTotal: acc.subTotal + s, vatAmount: acc.vatAmount + v, totalAmount: acc.totalAmount + s + v };
      }, { subTotal: 0, vatAmount: 0, totalAmount: 0 }),
  },
);
const rows = [
  { basePrice: 18000000, quantity: 1, vat: 8, currencyId: 1 },
  { ...apiCaseLine },
];
const summary = buildContractFinancialSummary({ rows, currencies: [], exchangeRates: [], pricingDate: "2026-08-18" });
assert.equal(seen.at(-1), "2026-08-18", "the Signed date reaches the rate lookup");
assert.deepEqual(
  [summary.converted.subTotal, summary.converted.vatAmount, summary.converted.totalAmount],
  [18261765, 1460941, 19722706],
  "the reported contract (18,000,000 VND + 10 USD, both + 8%)",
);

// ---- the services table is wired to the Signed date ----
const src = fs.readFileSync(CONTRACT, "utf8");
const section = src.slice(src.indexOf("const ManualContractServicesSection = ({"), src.indexOf("const PaymentScheduleSection = ({"));
const calls = section.match(/pickConversionRate\([^)]*\)/g) || [];
const tableCalls = calls.filter((c) => !/comboRatesVnd/.test(c));
assert.ok(tableCalls.length >= 2, "row cell and currency modal look rates up");
tableCalls.forEach((c) => assert.match(c, /pricingDate/, `rate lookup without the Signed date: ${c}`));
(section.match(/buildContractFinancialSummary\(\{[\s\S]*?\}\)/g) || []).forEach((c) =>
  assert.match(c, /pricingDate/, "summary without the Signed date"),
);
assert.match(src, /pricingDate: form\.signedDate \|\| "",/, "the form passes its Signed date (today's Vietnam date when blank)");

// ---- Case: a line linked to a contract / quotation line reuses its frozen rate ----
const CASE = path.join(root, "All Module/Case/CaseCreateForm.js");
const extractCurrencyId = (v) => {
  const id = v && typeof v === "object" ? v.id : v;
  const n = parseInt(id, 10);
  return Number.isFinite(n) ? n : null;
};
const rates = extractMarkedBlock(
  CASE,
  "// ---- source rate helpers (pure; tested by scripts/tests/create-forms-money.test.js) ----",
  "// ---- end source rate helpers ----",
  ["frozenSourceRate", "rowFrozenRate"],
  {},
);
assert.deepEqual(rates.frozenSourceRate({ exchangeRateToBase: 26176.5, exchangeRateDate: "2026-08-18" }), { rate: 26176.5, date: "2026-08-18" });
assert.deepEqual(rates.frozenSourceRate({ exchangeRateToBase: 25000 }), { rate: 25000, date: null }, "≠ 1 counts as frozen");
assert.equal(rates.frozenSourceRate({ exchangeRateToBase: 1 }), null, "1 without a date is a legacy placeholder");
assert.equal(rates.frozenSourceRate({ exchangeRateToBase: 0, exchangeRateDate: "2026-08-18" }), null);
assert.equal(rates.frozenSourceRate({}), null);
const frozenRow = { currencyId: "2", _frozenRate: { rate: 26176.5, date: "2026-08-18" }, _frozenRateCurrencyId: "2" };
assert.deepEqual(rates.rowFrozenRate(frozenRow, extractCurrencyId), { rate: 26176.5, date: "2026-08-18" });
// Review Focus 2: the currency was changed after loading — the old rate no longer applies
assert.equal(rates.rowFrozenRate({ ...frozenRow, currencyId: "3" }, extractCurrencyId), null, "currency changed");
assert.equal(rates.rowFrozenRate({ currencyId: "2" }, extractCurrencyId), null, "a row of the Case itself");

const caseSrc = fs.readFileSync(CASE, "utf8");
assert.match(caseSrc, /_contractServiceId: s\.id,\s*\r?\n\s*_frozenRate: frozenSourceRate\(s\),/, "contract rows keep the contract line's rate");
assert.match(caseSrc, /_qServiceId: s\.id,\s*\r?\n\s*_frozenRate: frozenSourceRate\(s\),/, "quotation rows keep the quotation line's rate");
// a row's VND is rounded per part (as money_line_amounts), never total × rate
assert.doesNotMatch(caseSrc, /amounts\.totalAmount \* info\.rate/, "row cell converts the total in one go");
assert.match(caseSrc, /rowRateBasis\(row, \{ extractCurrencyId, synced: /, "totals group by the row's rate basis");
// a linked line's group must not replace the market-rate lookup of its currency
assert.match(caseSrc, /if \(item\.frozen\) return acc; \/\/ its rows convert through /, "per-currency lookup skips linked-line groups");
assert.match(caseSrc, /frozen: !!\(group\.rateBasis\?\.rate \|\| group\.rateBasis\?\.date\),/, "breakdown items say which groups are linked-line groups");
assert.doesNotMatch(caseSrc, /\{ key: item\.currencyCode \}/, "breakdown rows keyed by currency alone collide");
console.log("create-forms-money: all tests passed");
