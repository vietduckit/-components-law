const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

const file = path.resolve(__dirname, "../../All Module/Contract/ContractCreateForm.js");
const { pricingInputsOnly, convertedTotalsPatch, sameId, lineModeTotalsPatch } = extractMarkedBlock(
  file,
  "// ---- service totals helpers (pure; tested by scripts/tests/service-totals.test.js) ----",
  "// ---- end service totals helpers ----",
  ["pricingInputsOnly", "convertedTotalsPatch", "sameId", "lineModeTotalsPatch"],
  { roundAmount: (value) => Math.round(Number(value) || 0) },
);

// pricingInputsOnly — editing a Case line's price must recompute from
// basePrice/quantity/vat, not keep the stale derived totals
// (resolveServiceAmounts prefers existing subTotal/totalAmount).
{
  const line = { basePrice: "100", quantity: 1, vat: "0", subTotal: 10, vatAmount: 0, totalAmount: 10, currencyId: "2", serviceName: "X" };
  const out = pricingInputsOnly(line);
  assert.equal(out.subTotal, undefined);
  assert.equal(out.vatAmount, undefined);
  assert.equal(out.totalAmount, undefined);
  assert.equal(out.basePrice, "100");
  assert.equal(out.currencyId, "2");
  assert.equal(out.serviceName, "X");
  assert.equal(line.subTotal, 10, "input not mutated");
}

// convertedTotalsPatch — form header totals come from the CONVERTED services
// total (what the Services footer shows), never a raw cross-currency sum.
{
  const base = { packageMode: false, canConvert: true, rowCount: 2 };
  assert.deepEqual(
    convertedTotalsPatch({ ...base, subTotal: 5617650.4, vatAmount: 0, totalAmount: 5617650.4 }),
    { subTotal: "5617650", vatAmount: "", totalAmount: "5617650", fixedAmount: "5617650" },
  );
  assert.deepEqual(
    convertedTotalsPatch({ ...base, subTotal: 1000, vatAmount: 80, totalAmount: 1080 }),
    { subTotal: "1000", vatAmount: "80", totalAmount: "1080", fixedAmount: "1080" },
  );
  // package pricing owns its own totals
  assert.equal(convertedTotalsPatch({ ...base, packageMode: true, subTotal: 1, vatAmount: 0, totalAmount: 1 }), null);
  // missing exchange rate → leave whatever is there
  assert.equal(convertedTotalsPatch({ ...base, canConvert: false, subTotal: 1, vatAmount: 0, totalAmount: 1 }), null);
  // no service rows → a hand-typed total (e.g. Retainer without services) stays
  assert.equal(convertedTotalsPatch({ ...base, rowCount: 0, subTotal: 0, vatAmount: 0, totalAmount: 0 }), null);
  assert.equal(convertedTotalsPatch(null), null);
}

// Wiring: Case-line edits recompute via pricingInputsOnly, and the services
// section reports converted totals to the form.
{
  const src = fs.readFileSync(file, "utf8");
  const upd = src.slice(src.indexOf("const updateCaseServiceLineRow = "), src.indexOf("const isManualServiceRowId = "));
  assert.ok(/resolveServiceAmounts\(pricingInputsOnly\(patched\)\)/.test(upd), "updateCaseServiceLineRow uses pricingInputsOnly");
  assert.ok(/onConvertedTotalsChange: applyConvertedServiceTotals/.test(src), "section wired to applyConvertedServiceTotals");
  const sync = src.slice(src.indexOf("const syncManualLineTotals = "), src.indexOf("const syncPackageTotals = "));
  assert.ok(!/totalAmount:/.test(sync), "syncManualLineTotals no longer writes a raw totalAmount");
}

// sameId — two missing ids are NOT a match. A Quotation with no Case has
// projectServiceId null on every line; String(null) === String(null) used to
// pick its FIRST service as "the" service, so the contract's Total amount
// became that one line's total (19,440,000 instead of 19,764,000).
{
  assert.equal(sameId(null, null), false);
  assert.equal(sameId(undefined, null), false);
  assert.equal(sameId("", ""), false);
  assert.equal(sameId(5, null), false);
  assert.equal(sameId(5, "5"), true);
  assert.equal(sameId("7", 7), true);
  assert.equal(sameId(7, 8), false);
}

// lineModeTotalsPatch — a late line-mode writer (mount prefill,
// applyQuotationToForm) keeps the services table's last converted total:
// the table only re-reports when that total changes, so an overwrite with a
// single line's / raw-sum amount would stick.
{
  const reported = { packageMode: false, canConvert: true, rowCount: 2, subTotal: 18300000, vatAmount: 1464000, totalAmount: 19764000 };
  const oneLine = { subTotal: "18000000", vatAmount: "1440000", totalAmount: "19440000", fixedAmount: "19440000" };
  assert.deepEqual(lineModeTotalsPatch(reported, oneLine), {
    subTotal: "18300000", vatAmount: "1464000", totalAmount: "19764000", fixedAmount: "19764000",
  });
  // table has not reported yet (or can't convert) → the writer's own amounts
  assert.deepEqual(lineModeTotalsPatch(null, oneLine), oneLine);
  assert.deepEqual(lineModeTotalsPatch({ ...reported, canConvert: false }, oneLine), oneLine);
}

// Wiring: the no-Case quotation line lookup uses sameId, and both late
// line-mode writers go through lineModeTotalsPatch.
{
  const src = fs.readFileSync(file, "utf8");
  assert.ok(
    !/String\(\s*firstId\(line\.projectServiceId, line\.projectServices\),?\s*\)\s*===\s*String\(currentProjectServiceId\)/.test(src),
    "no String(null) === String(null) projectService match",
  );
  assert.ok(/sameId\(\s*firstId\(line\.projectServiceId, line\.projectServices\),\s*currentProjectServiceId,?\s*\)/.test(src), "projectService match uses sameId");
  assert.ok(/applyConvertedServiceTotals = useCallback\(\(totals\) => \{\s*lastConvertedTotalsRef\.current = totals;/.test(src), "last reported totals are kept");
  const apply = src.slice(src.indexOf("const applyQuotationToForm = "), src.indexOf("const handleCustomerChange = "));
  assert.ok(/lineModeTotalsPatch\(lastConvertedTotalsRef\.current,/.test(apply), "applyQuotationToForm keeps the table total in line mode");
  const mount = src.slice(src.indexOf("const effectiveTotalAmount = quotationPackageMode"), src.indexOf("const setF = (key, value) =>"));
  assert.ok(/lineModeTotalsPatch\(lastConvertedTotalsRef\.current,/.test(mount), "mount prefill keeps the table total in line mode");
}

console.log("service-totals: all tests passed");
