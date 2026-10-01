const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// 2026-09-30: a company's price of a catalog service carries its own
// currency (pgsql/currency_catalog.sql). The registration script makes it a
// NocoBase relation and drops the old misconfigured "currencies" hasMany; the
// create forms read the company price's currency before the service's.
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const src = read("JsField/RegisterCompanyServiceCurrency.js");
assert.match(src, /name: "currency",\s*type: "belongsTo",\s*interface: "m2o",\s*target: "currencies",\s*foreignKey: "currencyId"/,
  "companyServices.currency belongsTo currencies by currencyId");
assert.match(src, /collections\/companyServices\/fields:destroy/, "the old hasMany 'currencies' is removed");
assert.match(src, /type === "hasMany"/, "only the hasMany of that name is removed");
assert.ok(/\[skip\]/.test(src), "idempotent");
// catalog prices in VND at the latest rate (pgsql/currency_catalog.sql §6)
for (const [collection, fields] of [
  ["services", ["basePriceVnd", "exchangeRateToBase", "exchangeRateDate"]],
  ["companyServices", ["priceVnd", "exchangeRateToBase", "exchangeRateDate"]],
  ["serviceComboItems", ["priceVnd", "exchangeRateToBase", "exchangeRateDate"]],
  ["serviceCombos", ["packageSubTotalVnd", "totalAmountVnd", "exchangeRateToBase", "exchangeRateDate"]],
]) {
  for (const field of fields) {
    assert.ok(new RegExp(`\\["${collection}", \\w+Field\\("${field}"`).test(src), `${collection}.${field}`);
  }
}

// the three create forms: the company price's own currency first, then the service's
const q = read("All Module/Quotation/QuotationCreateForm.js");
assert.match(q, /currencyFromRecordOptional\(item, currencies, null\) \|\|\s*currencyFromRecordOptional\(service, currencies, null\)/,
  "Quotation: company price currency before the service's");
const k = read("All Module/Contract/ContractCreateForm.js");
assert.match(k, /currencyFromRecordOptional\(next, currencies, null\) \|\|\s*currencyFromRecordOptional\(service, currencies, null\)/,
  "Contract: company price currency before the service's");
const c = read("All Module/Case/CaseCreateForm.js");
assert.match(c, /const resolvedCurrency = companyServiceCurrency \|\| serviceCurrency/, "Case: company price currency before the service's");
console.log("company-service-currency: all tests passed");
