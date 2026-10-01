const assert = require("node:assert/strict");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// 2026-09-30 (bug seen on dev): since the database stores a service line's
// subTotal / vatAmount / totalAmount in VND (money flow INV-1), the Contract
// form read a case line's stored 261,765 as 261,765 USD and converted it again
// (subtotal 6,870,091,523 instead of 18,261,765). A line's amounts in its own
// currency come from its *Native columns, or from its price when the database
// priced it; the VND totals are never read as line-currency amounts.
const root = path.resolve(__dirname, "../..");
const FORM = path.join(root, "All Module/Contract/ContractCreateForm.js");
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
const { resolveServiceAmounts } = extractMarkedBlock(
  FORM,
  "// ---- amount resolution helpers (pure; tested by scripts/tests/money-rounding.test.js) ----",
  "// ---- end amount resolution helpers ----",
  ["resolveServiceAmounts"],
  { firstNonZeroNumber, firstNumber, roundAmount },
);
const { pricingInputsOnly } = extractMarkedBlock(
  FORM,
  "// ---- service totals helpers (pure; tested by scripts/tests/service-totals.test.js) ----",
  "// ---- end service totals helpers ----",
  ["pricingInputsOnly", "convertedTotalsPatch"],
  { roundAmount },
);
const pick = (a) => [a.subTotal, a.vatAmount, a.totalAmount];

// a case line as the database stores it: 10 USD + 8%, VND totals, USD natives
const caseLine = {
  basePrice: 10, quantity: 1, vat: 8, currencyId: 2, decimalPlaces: 2,
  subTotal: 261765, vatAmount: 20941, totalAmount: 282706,
  subTotalNative: 10, vatAmountNative: 0.8, totalAmountNative: 10.8,
  exchangeRateToBase: 26176.5, exchangeRateDate: "2026-08-18",
};
assert.deepEqual(pick(resolveServiceAmounts(caseLine)), [10, 0.8, 10.8], "natives, not the VND totals");
// natives not returned (field not registered) but priced by the database: from its price
const { subTotalNative, vatAmountNative, totalAmountNative, ...noNatives } = caseLine;
assert.deepEqual(pick(resolveServiceAmounts(noNatives)), [10, 0.8, 10.8], "a database-priced line: from its price");
// several sources (contract line, case line, quotation line): still in the line currency
assert.deepEqual(pick(resolveServiceAmounts(caseLine, { ...caseLine, subTotalNative: undefined })), [10, 0.8, 10.8]);
// a VND line stays as it is
const vndLine = { basePrice: 18000000, quantity: 1, vat: 8, subTotal: 18000000, vatAmount: 1440000, totalAmount: 19440000,
  subTotalNative: 18000000, vatAmountNative: 1440000, totalAmountNative: 19440000, exchangeRateToBase: 1, exchangeRateDate: "2026-09-01" };
assert.deepEqual(pick(resolveServiceAmounts(vndLine)), [18000000, 1440000, 19440000]);
// an older line (no rate from the database) keeps using its stored totals
assert.deepEqual(pick(resolveServiceAmounts({ subTotal: 100, vatAmount: 8, totalAmount: 108 })), [100, 8, 108]);
// a price edit drops the stale natives too, so the new price wins
const edited = { ...caseLine, basePrice: 12 };
assert.deepEqual(pick(resolveServiceAmounts(pricingInputsOnly(edited))), [12, 0.96, 12.96], "edited price recomputes");
console.log("contract-native-amounts: all tests passed");
