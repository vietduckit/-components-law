const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// 2026-10-01: a Case / Contract / Quotation header is VND (INV-1 —
// CURRENCY_LOGIC_SRS.md, docs/superpowers/specs/2026-09-29-money-flow-unification-design.md):
// foreign-currency services are converted to VND for the services footer and
// Total amount. The header currency used to be copied from the first service
// line or from the source record (a Contract created from a Quotation whose
// first service is in USD showed and saved its totals in USD). None of the
// forms has a header currency picker, so nothing may set it but the base.
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const FORMS = [
  "All Module/Contract/ContractCreateForm.js",
  "All Module/Quotation/QuotationCreateForm.js",
  "All Module/Case/CaseCreateForm.js",
];

for (const rel of FORMS) {
  const src = read(rel);
  const memo = src.match(/const selectedCurrency = useMemo\(([\s\S]*?)\);/);
  assert.ok(memo, `${rel}: selectedCurrency memo`);
  assert.ok(/findDefaultCurrency\(currencies\)/.test(memo[1]), `${rel}: header currency = the base currency (VND)`);
  assert.ok(!/form\.currencyId/.test(memo[1]), `${rel}: header currency no longer follows form.currencyId`);
}

{
  const src = read("All Module/Contract/ContractCreateForm.js");
  assert.ok(!/currencyId: firstCurrencyId/.test(src), "contract: not the first service line's currency");
  assert.ok(!/currencyId: contextCurrencyId/.test(src), "contract: not the quotation / case currency");
  assert.ok(/const submitCurrency = selectedCurrency;/.test(src), "contract: saved in the header currency (VND)");
}
{
  const src = read("All Module/Quotation/QuotationCreateForm.js");
  assert.ok(!/getRecordCurrencyId\(popupParentQuotation\)/.test(src), "quotation: not the parent quotation's currency");
  assert.ok(!/currencyId: projectCurrencyId/.test(src), "quotation: not the case's currency");
}
{
  const src = read("All Module/Case/CaseCreateForm.js");
  assert.ok(!/currencyStateFromRecord/.test(src), "case: not the contract / quotation currency");
}

console.log("header-currency-vnd: all tests passed");
