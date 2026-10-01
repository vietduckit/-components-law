const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// 2026-09-29 (money flow, second review): a saved service line shows the
// VND the database stored with its frozen rate; only a new or edited line is
// previewed with a fresh rate lookup.
const root = path.resolve(__dirname, "../..");
const FILES = [
  "All Module/Contract/ContractServices.js",
  "All Module/Quotation/QuotationServices.js",
  "All Module/Contract/ContractDetailView.js",
];
const parseNum = (v) => {
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return isNaN(n) ? 0 : n;
};

for (const rel of FILES) {
  const { storedLinePricing } = extractMarkedBlock(
    path.join(root, rel),
    "// ---- stored line helpers (pure; tested by scripts/tests/stored-line-display.test.js) ----",
    "// ---- end stored line helpers ----",
    ["storedLinePricing"],
    { parseNum },
  );
  const saved = {
    basePrice: 10, _basePrice: 10, vat: 8, _vat: 8, quantity: 1, _quantity: 1,
    currencyId: 2, _currencyId: "2", exchangeRateToBase: 26176.5, exchangeRateDate: "2026-08-18",
    subTotal: 261765, vatAmount: 20941, totalAmount: 282706, _isNew: false,
  };
  assert.deepEqual(
    storedLinePricing(saved),
    { subTotal: 261765, vatAmount: 20941, totalAmount: 282706, exchangeRateToBase: 26176.5, _convertible: true, _stored: true },
    `${rel}: a saved line shows its stored VND`,
  );
  assert.equal(storedLinePricing({ ...saved, _basePrice: 12 }), null, `${rel}: an edited price is previewed`);
  assert.equal(storedLinePricing({ ...saved, _vat: 10 }), null, `${rel}: an edited VAT is previewed`);
  assert.equal(storedLinePricing({ ...saved, _currencyId: "3" }), null, `${rel}: another currency is previewed`);
  assert.equal(storedLinePricing({ ...saved, _quantity: 2 }), null, `${rel}: another quantity is previewed`);
  assert.equal(storedLinePricing({ ...saved, _isNew: true }), null, `${rel}: a new line is previewed`);
  assert.equal(storedLinePricing({ ...saved, exchangeRateToBase: null }), null, `${rel}: an older line without a rate is previewed`);
  assert.equal(storedLinePricing({ ...saved, totalAmount: null }), null, `${rel}: no stored total -> previewed`);
  // dev: older rows carry exchangeRateToBase = 1 (old column default) and no date
  assert.equal(storedLinePricing({ ...saved, exchangeRateToBase: 1, exchangeRateDate: null }), null, `${rel}: a rate the database did not freeze is previewed`);

  // every VND shown for a line goes through it
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  const display = src.match(/const pricing = [^;]*?buildServicePricingPayload\(\{\s*pricingMode: PRICING_MODE_LINE,\s*basePrice: r\._basePrice/g) || [];
  assert.ok(display.length >= 4, `${rel}: found the line displays (${display.length})`);
  for (const call of display) {
    assert.match(call, /^const pricing = storedLinePricing\(r\) \|\| buildServicePricingPayload/, `${rel}: ${call.slice(0, 60)}`);
  }
}

// ContractDetailView previews an unsigned contract at its creation date (contracts has no "date")
assert.doesNotMatch(
  fs.readFileSync(path.join(root, "All Module/Contract/ContractDetailView.js"), "utf8"),
  /contract\?\.signedAt \|\| contract\?\.date\b/,
);

console.log("stored-line-display: all tests passed");
