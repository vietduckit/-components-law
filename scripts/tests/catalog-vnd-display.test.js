const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// 2026-09-30: a catalog service priced in a foreign currency shows the VND
// the database stored at the latest rate (services.basePriceVnd,
// companyServices.priceVnd — pgsql/currency_catalog.sql §6) under its price
// in every service picker.
const root = path.resolve(__dirname, "../..");
const FILES = [
  ["All Module/Quotation/QuotationServices.js", /formatMoney\(price, catalogCurrency\)/],
  ["All Module/Contract/ContractServices.js", /formatMoney\(price, catalogCurrency\)/],
  ["All Module/Contract/ContractDetailView.js", /formatMoney\(price, catalogCurrency\)/],
  ["All Module/Case/CaseServices.js", /formatMoneyAmount\(s\.basePrice \|\| 0, currencyFromRecord\(s, currencies, caseCurrency\)\)/],
  ["All Module/Quotation/QuotationCreateForm.js", /formatMoneyByCurrency\(price, serviceCurrency\)/],
  ["All Module/Contract/ContractCreateForm.js", /formatMoneyByCurrency\(price, serviceCurrency\)/],
  ["All Module/Case/CaseCreateForm.js", /formatMoneyAmount\(s\.basePrice, serviceCurrency\)/],
];
for (const [rel, priceCell] of FILES) {
  const { catalogVndText } = extractMarkedBlock(
    path.join(root, rel),
    "// ---- catalog VND text (pure; tested by scripts/tests/catalog-vnd-display.test.js) ----",
    "// ---- end catalog VND text ----",
    ["catalogVndText"],
    {},
  );
  const usd = { code: "USD" };
  const vnd = { code: "VND" };
  assert.equal(catalogVndText({ basePriceVnd: 261765 }, usd), "≈ 261.765 VND", `${rel}: a catalog service`);
  assert.equal(catalogVndText({ priceVnd: 25000000, basePriceVnd: 1 }, usd), "≈ 25.000.000 VND", `${rel}: a company price uses its own VND`);
  assert.equal(catalogVndText({ priceVnd: null, basePriceVnd: 261765 }, usd), null, `${rel}: a company price without VND shows nothing (not the catalog's)`);
  assert.equal(catalogVndText({ basePriceVnd: 2000000 }, vnd), null, `${rel}: a VND price needs no second line`);
  assert.equal(catalogVndText({}, usd), null, `${rel}: no stored VND (no rate yet)`);

  const src = fs.readFileSync(path.join(root, rel), "utf8");
  const at = src.search(priceCell);
  assert.ok(at >= 0, `${rel}: the picker's price cell`);
  assert.ok(/catalogVndText\(/.test(src.slice(at, at + 900)), `${rel}: the picker shows the stored VND under the price`);
}
console.log("catalog-vnd-display: all tests passed");
