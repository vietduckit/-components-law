const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// 2026-09-29: every copy of the rate lookup follows money_rate_to_base()
// (Vietnam dates; direct / inverse on or before the date, then after it),
// and previews price on the same dates as the database (spec §6.2).
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const COPIES = [
  "All Module/Quotation/QuotationCreateForm.js",
  "All Module/Case/CaseCreateForm.js",
  "All Module/Contract/ContractCreateForm.js",
  "All Module/Contract/ContractServices.js",
  "All Module/Quotation/QuotationServices.js",
  "All Module/Case/CaseServices.js",
  "All Module/Contract/ContractDetailView.js",
];
for (const rel of COPIES) {
  const src = read(rel);
  assert.ok(/same order as money_rate_to_base\(\)/.test(src), `${rel}: follows money_rate_to_base()`);
  assert.ok(/const moneyDateKey = /.test(src) && /const rate15 = /.test(src), `${rel}: Vietnam dates, 15 digits`);
  assert.ok(!/effectiveMs <= cutoff/.test(src), `${rel}: the old millisecond cutoff is gone`);
}
const quotation = read("All Module/Quotation/QuotationCreateForm.js");
assert.ok(!/pickConversionRate\([^)]*form\.validUntil\)/.test(quotation), "Quotation form previews at today's rate (the quotation date)");
assert.ok(/const pricingDate = quotation\?\.createdAt;/.test(read("All Module/Quotation/QuotationServices.js")), "QuotationServices: the quotation date");
assert.ok(/const pricingDate = contract\?\.signedAt \|\| contract\?\.createdAt;/.test(read("All Module/Contract/ContractServices.js")), "ContractServices: signing date, else creation");
console.log("rate-lookup: all tests passed");
