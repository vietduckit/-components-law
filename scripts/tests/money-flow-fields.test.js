const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// 2026-09-29: the money-flow columns must be NocoBase fields, or the API
// silently drops them (the reason exchangeRateToBase was never saved).
const src = fs.readFileSync(path.resolve(__dirname, "../../JsField/RegisterMoneyFlowFields.js"), "utf8");
for (const name of ["exchangeRateToBase", "exchangeRateDate", "subTotalNative", "vatAmountNative", "totalAmountNative", "basePriceVnd"]) {
  assert.ok(new RegExp(`(name: |numberField\\()"${name}"`).test(src), `registers ${name}`);
}
for (const collection of ["quotationServices", "contractServices", "projectServices"]) {
  assert.ok(src.includes(`"${collection}"`), `on ${collection}`);
}
// a relation (second review), not a bare integer: foreign key quotationServiceId
assert.ok(
  /registerField\("projectServices", \{\s*name: "quotationService",\s*type: "belongsTo",\s*interface: "m2o",\s*target: "quotationServices",\s*foreignKey: "quotationServiceId"/.test(src),
  "projectServices.quotationService -> quotationServices by quotationServiceId",
);
assert.ok(!/name: "quotationServiceId",\s*type: "bigInt"/.test(src), "no bare integer field for the key");
assert.ok(/fields:list/.test(src) && /\[skip\]/.test(src), "idempotent: skips existing fields");
console.log("money-flow-fields: all tests passed");
