const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// 2026-09-25: money must not leak through rounding. Rules:
// - installments split by percentage add up to the total exactly (the last
//   installment takes the remainder) — the same amounts shown and saved;
// - rounded parts add up: subtotal + VAT = total;
// - VND amounts are whole numbers wherever they're computed (conversion
//   results, folded line contributions, retainer cycles).
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const CONTRACT = "All Module/Contract/ContractCreateForm.js";
const CASE = "All Module/Case/CaseCreateForm.js";
const QUOTATION = "All Module/Quotation/QuotationCreateForm.js";

const parseNum = (v) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const roundAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
};

// ---- ContractCreateForm: installment allocation ----
{
  const calcInstallmentAmount = (percentage, baseAmount) => {
    const percent = parseNum(percentage);
    const base = parseNum(baseAmount);
    if (percent <= 0 || base <= 0) return 0;
    return roundAmount((base * percent) / 100);
  };
  const paymentScheduleRowAmount = (row, baseAmount) =>
    calcInstallmentAmount(row?.percentage, baseAmount) || parseNum(row?.amount);
  const { allocateInstallmentAmounts } = extractMarkedBlock(
    path.join(root, CONTRACT),
    "// ---- installment allocation helpers (pure; tested by scripts/tests/money-rounding.test.js) ----",
    "// ---- end installment allocation helpers ----",
    ["allocateInstallmentAmounts"],
    { paymentScheduleRowAmount, roundAmount, parseNum },
  );
  const rows = (...pcts) => pcts.map((p) => ({ percentage: String(p) }));
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  for (const total of [10000000, 10000001, 10000005, 9999999, 12345678, 7]) {
    const out = allocateInstallmentAmounts(rows(30, 30, 40), total);
    assert.equal(sum(out), total, `30/30/40 of ${total} adds up`);
  }
  assert.deepEqual(allocateInstallmentAmounts(rows(30, 30, 40), 10000001), [3000000, 3000000, 4000001]);
  assert.equal(sum(allocateInstallmentAmounts(rows(33.33, 33.33, 33.34), 10000000)), 10000000);
  // a trailing blank row must not receive the remainder
  assert.deepEqual(
    allocateInstallmentAmounts([...rows(30, 30, 40), { percentage: "" }], 10000001),
    [3000000, 3000000, 4000001, 0],
  );
  // percentages not adding up to 100: left as typed (submit blocks it)
  assert.deepEqual(allocateInstallmentAmounts(rows(30, 30), 10000001), [3000000, 3000000]);
  // single row untouched
  assert.deepEqual(allocateInstallmentAmounts(rows(100), 10000001), [10000001]);

  const src = read(CONTRACT);
  const clean = src.slice(src.indexOf("const cleanPaymentScheduleRows = "), src.indexOf("const buildPaymentSchedulePayload = "));
  assert.ok(/allocateInstallmentAmounts\(cleaned, baseAmount\)/.test(clean), "saved amounts use the allocation");
  const section = src.slice(src.indexOf("const PaymentScheduleSection = ("), src.indexOf("const PaymentScheduleSection = (") + 12000);
  assert.ok(/allocateInstallmentAmounts\(rows, baseAmount\)/.test(section), "the table shows the same amounts");
}

// ---- ContractCreateForm: rounded parts add up ----
{
  const firstNonZeroNumber = (...values) => {
    for (const value of values) {
      const n = Number(value);
      if (Number.isFinite(n) && n !== 0) return n;
    }
    return 0;
  };
  const firstNumber = (...values) => {
    for (const value of values) {
      if (value === undefined || value === null || value === "") continue;
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };
  const { resolveServiceAmounts, resolvePackageAmounts } = extractMarkedBlock(
    path.join(root, CONTRACT),
    "// ---- amount resolution helpers (pure; tested by scripts/tests/money-rounding.test.js) ----",
    "// ---- end amount resolution helpers ----",
    ["resolveServiceAmounts", "resolvePackageAmounts"],
    { firstNonZeroNumber, firstNumber, roundAmount },
  );
  for (const [basePrice, vat] of [[1234567.5, 8], [100.5, 10], [999999, 8], [0.5, 8]]) {
    const a = resolveServiceAmounts({ basePrice, vat, quantity: 1 });
    assert.equal(a.subTotal + a.vatAmount, a.totalAmount, `line ${basePrice} @${vat}%`);
  }
  // total-only source: VAT is what's left after the rounded subtotal
  const fromTotal = resolveServiceAmounts({ totalAmount: 10000000, vat: 8 });
  assert.equal(fromTotal.totalAmount, 10000000);
  assert.equal(fromTotal.subTotal + fromTotal.vatAmount, 10000000);
  // a source with all three keeps its own figures
  assert.deepEqual(
    (({ subTotal, vatAmount, totalAmount }) => [subTotal, vatAmount, totalAmount])(
      resolveServiceAmounts({ subTotal: 100, vatAmount: 8, totalAmount: 108, vat: 8 }),
    ),
    [100, 8, 108],
  );
  const p = resolvePackageAmounts({ packageSubTotal: 1234567.5, packageVatRate: 8 });
  assert.equal(p.subTotal + p.vatAmount, p.totalAmount, "package parts add up");

  const { convertedTotalsPatch } = extractMarkedBlock(
    path.join(root, CONTRACT),
    "// ---- service totals helpers (pure; tested by scripts/tests/service-totals.test.js) ----",
    "// ---- end service totals helpers ----",
    ["convertedTotalsPatch"],
    { roundAmount },
  );
  // USD 0.01 x 25,432 (+8% VAT): 254.32 + 20.35 = 274.67 → 254 + 20 must total 274
  const patch = convertedTotalsPatch({ canConvert: true, rowCount: 1, subTotal: 254.32, vatAmount: 20.3456, totalAmount: 274.6656 });
  assert.equal(Number(patch.subTotal) + Number(patch.vatAmount), Number(patch.totalAmount));
}

// ---- Conversions round per line (as the database, 2026-09-29); folded contributions are whole VND ----
for (const rel of [CONTRACT, QUOTATION]) {
  const src = read(rel);
  assert.ok(!/acc\.subTotal \+ group\.subTotal \* matched\.rate/.test(src), `${rel}: converted subtotal not left unrounded`);
  assert.ok(/convertLinesToBase\(group\.lines, matched\.rate\)/.test(src), `${rel}: per-line rounding`);
}
for (const rel of [CONTRACT, CASE, QUOTATION]) {
  const src = read(rel);
  assert.ok(
    !/(contributionVnd|ContributionVnd) = (matched\?\.rate|rate) \? amounts\.subTotal \* (matched\.rate|rate) : 0/.test(src),
    `${rel}: folded line contributions are whole VND`,
  );
  assert.ok(!/packageContributionVnd = amounts\.subTotal \* matched\.rate;/.test(src), `${rel}: added package contribution is whole VND`);
}

// ---- Retainer cycles: whole VND, the same fee every period ----
{
  // 2026-09-28 (Finance P2): the cycle amount lives in retainer_cycle_amount
  // (pgsql/finance_billing_rules.sql), shared by the hourly run and "Bill now";
  // 2026-09-30: every period bills the whole fee (no split) —
  // pgsql/tests/finance_billing_rules_test.sql checks a 1000 fee -> 1000 per cycle.
  const sql = read("pgsql/retainer_billing_run_due.sql");
  assert.ok(!/ROUND\(v_plan\."totalAmount"::numeric \/ v_plan\."retainerTotalCycles", 2\)/.test(sql), "no 2-decimal split");
  assert.ok(/v_amount := public\.retainer_cycle_amount\(/.test(sql), "the run uses the shared cycle amount");
  const rules = read("pgsql/finance_billing_rules.sql");
  const helper = rules.slice(rules.indexOf("FUNCTION public.retainer_cycle_amount"));
  assert.ok(/SELECT ROUND\(p_total::numeric\);/.test(helper), "whole VND, the fee every period");
  assert.ok(!/ROUND\(p_total::numeric \/ p_cycles, 2\)/.test(helper), "whole VND per cycle");
}

// ---- Display / Payment Request blocks: legacy percentage-only schedules ----
for (const rel of [
  "All Module/Contract/ContractDetailView.js",
  "All Module/Contract/ContractPaymentScheduleDetailBlock.js",
  "All Module/Payment/PaymentRequestCreateBlock.js",
  "All Module/Payment/PaymentContractDetailBlock.js",
]) {
  const { absorbPercentRemainder } = extractMarkedBlock(
    path.join(root, rel),
    "// ---- percent remainder helpers (pure; tested by scripts/tests/money-rounding.test.js) ----",
    "// ---- end percent remainder helpers ----",
    ["absorbPercentRemainder"],
  );
  const derived = [
    { percentage: 30, amount: 3000000, amountFromPercent: true, cumulativeTotal: 3000000 },
    { percentage: 30, amount: 3000000, amountFromPercent: true, cumulativeTotal: 6000000 },
    { percentage: 40, amount: 4000000, amountFromPercent: true, cumulativeTotal: 10000000 },
  ];
  const out = absorbPercentRemainder(derived, 10000001);
  assert.deepEqual(out.map((r) => r.amount), [3000000, 3000000, 4000001], `${rel}: last takes the remainder`);
  assert.equal(out[2].cumulativeTotal, 10000001, `${rel}: cumulative follows`);
  const withStored = derived.map((r, i) => (i === 0 ? { ...r, amountFromPercent: false } : r));
  assert.equal(absorbPercentRemainder(withStored, 10000001), withStored, `${rel}: stored amounts are never changed`);
  const src = read(rel);
  assert.ok(/absorbPercentRemainder\(/.test(src.slice(src.indexOf("// ---- end percent remainder helpers ----"))), `${rel}: applied`);
}

// ---- 2026-09-29: foreign-currency lines round to the currency's decimals ----
// 10 USD + 8% VAT used to become 11 USD (VAT rounded to a whole dollar: 10%),
// and under 5% VAT rounded to 0. VND stays whole đồng.
{
  const CASE_HELPERS = extractMarkedBlock(
    path.join(root, CASE),
    "// ---- line amount helpers (pure; tested by scripts/tests/money-rounding.test.js) ----",
    "// ---- end line amount helpers ----",
    ["calcLineAmounts", "inferVatRate", "roundToDecimals"],
    { parseNum, getCurrencyDecimals: (c) => (c && Number.isFinite(Number(c.decimalPlaces)) ? Number(c.decimalPlaces) : 0) },
  );
  const USD = { code: "USD", decimalPlaces: 2 };
  assert.deepEqual(CASE_HELPERS.calcLineAmounts(10, 8, USD), { subTotal: 10, vatAmount: 0.8, totalAmount: 10.8 }, "Case: 10 USD + 8%");
  assert.deepEqual(CASE_HELPERS.calcLineAmounts(10, 4, USD), { subTotal: 10, vatAmount: 0.4, totalAmount: 10.4 }, "Case: 4% VAT is not lost");
  assert.deepEqual(CASE_HELPERS.calcLineAmounts(12000000, 8), { subTotal: 12000000, vatAmount: 960000, totalAmount: 12960000 }, "Case: VND whole đồng");
  assert.equal(CASE_HELPERS.calcLineAmounts(1234567.5, 8).vatAmount, 98765, "Case: VND VAT whole đồng");
  assert.equal(CASE_HELPERS.calcLineAmounts(10.05, 8, 2).totalAmount, 10.85, "Case: decimals as a number");
  assert.equal(CASE_HELPERS.inferVatRate(10, 0.8), 8, "Case: VAT rate read back from a foreign line");
  assert.equal(CASE_HELPERS.roundToDecimals(1.005, 2), 1.01);

  const Q = extractMarkedBlock(
    path.join(root, QUOTATION),
    "// ---- line amount helpers (pure; tested by scripts/tests/money-rounding.test.js) ----",
    "// ---- end line amount helpers ----",
    ["calcLine", "calcPackageTotals"],
    { parseNum, getCurrencyDecimals: (c) => (c && Number.isFinite(Number(c.decimalPlaces)) ? Number(c.decimalPlaces) : 0) },
  );
  assert.deepEqual(Q.calcLine(10, 1, 8, USD), { subTotal: 10, vatAmount: 0.8, totalAmount: 10.8 }, "Quotation: 10 USD + 8%");
  assert.deepEqual(Q.calcLine(10, 3, 4, USD), { subTotal: 30, vatAmount: 1.2, totalAmount: 31.2 }, "Quotation: quantity and 4% VAT");
  assert.deepEqual(Q.calcLine(1000000, 1, 8), { subTotal: 1000000, vatAmount: 80000, totalAmount: 1080000 }, "Quotation: VND");
  assert.deepEqual(Q.calcPackageTotals(10, 8, USD), { subTotal: 10, vatAmount: 0.8, totalAmount: 10.8 }, "Quotation: foreign package");

  const firstNonZeroNumber = (...values) => {
    for (const value of values) {
      const n = Number(value);
      if (Number.isFinite(n) && n !== 0) return n;
    }
    return 0;
  };
  const firstNumber = (...values) => {
    for (const value of values) {
      if (value === undefined || value === null || value === "") continue;
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };
  const { resolveServiceAmounts: resolve } = extractMarkedBlock(
    path.join(root, CONTRACT),
    "// ---- amount resolution helpers (pure; tested by scripts/tests/money-rounding.test.js) ----",
    "// ---- end amount resolution helpers ----",
    ["resolveServiceAmounts"],
    { firstNonZeroNumber, firstNumber, roundAmount },
  );
  const usd = resolve({ quantity: 1, basePrice: 10, vat: 8, decimalPlaces: 2 });
  assert.deepEqual([usd.subTotal, usd.vatAmount, usd.totalAmount, usd.vat], [10, 0.8, 10.8, 8], "Contract: 10 USD + 8%");
  assert.equal(resolve({ quantity: 1, basePrice: 10, vat: 4, decimalPlaces: 2 }).totalAmount, 10.4, "Contract: 4% VAT is not lost");
  assert.equal(resolve({ subTotal: 10, vatAmount: 0.8, decimalPlaces: 2 }).vat, 8, "Contract: VAT rate read back from a foreign line");
  assert.equal(resolve({ quantity: 1, basePrice: 12000000, vat: 8 }).totalAmount, 12960000, "Contract: VND unchanged");

  // every place that prices a line passes the line's currency
  const caseSrc = read(CASE);
  assert.ok(!/calcLineAmounts\([^(),]+,\s*[^(),]+\)/.test(caseSrc.slice(caseSrc.indexOf("// ---- end line amount helpers ----"))), "Case: every line priced in its currency");
  const qSrc = read(QUOTATION);
  assert.ok(!/calcLine\((?:[^(),]|\([^()]*\))+,(?:[^(),]|\([^()]*\))+,(?:[^(),]|\([^()]*\))+\)/.test(qSrc.slice(qSrc.indexOf("// ---- end line amount helpers ----"))), "Quotation: every line priced in its currency");
  const cSrc = read(CONTRACT);
  assert.ok(!/manualServiceLineAmounts\(row, (?:packageMode|false)\)/.test(cSrc), "Contract: every manual line priced in its currency");
}

console.log("money-rounding: all tests passed");
