const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { render, OUTPUT } = require("./sql/gen-money-cases");

// 2026-09-29: one set of money cases for the JS preview and for the database
// (docs/superpowers/specs/2026-09-29-money-flow-unification-design.md §7.6).
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");

assert.equal(read(OUTPUT), render(), `${OUTPUT} is stale: run node scripts/tests/sql/gen-money-cases.js`);

const { extractMarkedBlock } = require("./extract-marked-block");
const cases = JSON.parse(read("scripts/tests/fixtures/money-cases.json"));
const parseNum = (v) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const decimalsOf = (c) => (c && Number.isFinite(Number(c.decimalPlaces)) ? Number(c.decimalPlaces) : 0);

// ---- line amounts: the preview of the Quotation and Case forms ----
{
  const Q = extractMarkedBlock(
    path.join(root, "All Module/Quotation/QuotationCreateForm.js"),
    "// ---- line amount helpers (pure; tested by scripts/tests/money-rounding.test.js) ----",
    "// ---- end line amount helpers ----",
    ["calcLine"],
    { parseNum, getCurrencyDecimals: decimalsOf },
  );
  const K = extractMarkedBlock(
    path.join(root, "All Module/Case/CaseCreateForm.js"),
    "// ---- line amount helpers (pure; tested by scripts/tests/money-rounding.test.js) ----",
    "// ---- end line amount helpers ----",
    ["calcLineAmounts"],
    { parseNum, getCurrencyDecimals: decimalsOf },
  );
  for (const c of cases.lines) {
    const currency = { decimalPlaces: c.decimals };
    const q = Q.calcLine(c.basePrice, c.quantity, c.vat, currency);
    assert.deepEqual([q.subTotal, q.vatAmount, q.totalAmount], c.native, `Quotation preview: ${c.name}`);
    if (c.quantity === 1) {
      const k = K.calcLineAmounts(c.basePrice, c.vat, currency);
      assert.deepEqual([k.subTotal, k.vatAmount, k.totalAmount], c.native, `Case preview: ${c.name}`);
    }
  }
}

// ---- VND: each line converted and rounded on its own, as money_line_amounts() ----
{
  const forms = [
    "All Module/Quotation/QuotationCreateForm.js",
    "All Module/Contract/ContractCreateForm.js",
    "All Module/Case/CaseCreateForm.js",
  ];
  for (const form of forms) {
    const { convertLinesToBase } = extractMarkedBlock(
      path.join(root, form),
      "// ---- base conversion helpers (pure; tested by scripts/tests/money-cases.test.js) ----",
      "// ---- end base conversion helpers ----",
      ["convertLinesToBase"],
      {},
    );
    for (const c of cases.lines) {
      const v = convertLinesToBase([{ subTotal: c.native[0], vatAmount: c.native[1] }], c.rate);
      assert.deepEqual([v.subTotal, v.vatAmount, v.totalAmount], c.vnd, `${form} VND: ${c.name}`);
    }
    // two 200 SGD + 10% lines: 9,011,406 line by line (the database), not
    // 9,011,408 converted as one currency group
    const sgd = cases.lines.find((c) => c.name === "200 SGD + 10%");
    const two = convertLinesToBase(
      [0, 1].map(() => ({ subTotal: sgd.native[0], vatAmount: sgd.native[1] })),
      sgd.rate,
    );
    assert.equal(two.totalAmount, 2 * sgd.vnd[2], `${form}: header = Σ lines`);
    // the header totals go through it, not through a group's sum
    assert.doesNotMatch(read(form), /Math\.round\(group\.(subTotal|vatAmount) \*/, `${form}: group-level rounding`);
  }
}

// ---- splits: installments in the Contract form ----
{
  const roundAmount = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : 0;
  };
  const paymentScheduleRowAmount = (row, baseAmount) => {
    const percent = parseNum(row?.percentage);
    const base = parseNum(baseAmount);
    return percent > 0 && base > 0 ? roundAmount((base * percent) / 100) : parseNum(row?.amount);
  };
  const { splitLargestRemainder, allocateInstallmentAmounts } = extractMarkedBlock(
    path.join(root, "All Module/Contract/ContractCreateForm.js"),
    "// ---- installment allocation helpers (pure; tested by scripts/tests/money-rounding.test.js) ----",
    "// ---- end installment allocation helpers ----",
    ["splitLargestRemainder", "allocateInstallmentAmounts"],
    { paymentScheduleRowAmount, roundAmount, parseNum },
  );
  for (const c of cases.splits) {
    assert.deepEqual(splitLargestRemainder(c.total, c.weights, c.decimals), c.expected, `split ${c.total} by ${c.weights}`);
  }
  // the form's installments are the same split as the database's
  const rows = [{ percentage: "30" }, { percentage: "30" }, { percentage: "40" }];
  assert.deepEqual(allocateInstallmentAmounts(rows, 10000001), [3000000, 3000000, 4000001]);
  assert.deepEqual(allocateInstallmentAmounts(rows, 20000000), [6000000, 6000000, 8000000]);
}

// ---- the contract total the installments are split from = the one the database keeps ----
{
  const formFile = "All Module/Contract/ContractCreateForm.js";
  const { resolveContractTotal } = extractMarkedBlock(
    path.join(root, formFile),
    "// ---- contract total helpers (pure; tested by scripts/tests/money-cases.test.js) ----",
    "// ---- end contract total helpers ----",
    ["resolveContractTotal"],
    { parseNum },
  );
  const priced = [{ basePrice: "10" }, { basePrice: "1000000" }];
  // line pricing: the database sets the total to Σ lines (money_contract_header)
  assert.equal(resolveContractTotal({ rows: priced, typedTotal: "9000000", linesTotal: 10000000 }), 10000000);
  // a retainer, a combo, a line without a price: the database keeps the typed total
  assert.equal(resolveContractTotal({ rows: priced, isRetainer: true, typedTotal: "9000000", linesTotal: 10000000 }), 9000000);
  assert.equal(resolveContractTotal({ rows: priced, packageMode: true, typedTotal: "9000000", linesTotal: 10000000 }), 9000000);
  assert.equal(resolveContractTotal({ rows: [...priced, { basePrice: "" }], typedTotal: "9000000", linesTotal: 10000000 }), 9000000);
  assert.equal(resolveContractTotal({ rows: [], typedTotal: "", linesTotal: 0 }), 0);
  const src = read(formFile);
  assert.match(src, /const resolvedTotalAmount = resolveContractTotal\(/, "submit splits installments from resolveContractTotal");
  assert.match(src, /disabled: totalFromLines/, "Total amount is read-only while the services set it");
}

// ---- rates: the JS lookup picks what money_rate_to_base() picks ----
{
  const parseDateMillis = (value) => {
    if (!value && value !== 0) return null;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
  };
  const isUsableExchangeRateStatus = (status) => {
    const value = String(status || "").trim().toLowerCase();
    return !value || !["inactive", "disabled", "archived", "cancelled", "canceled", "draft"].includes(value);
  };
  const exchangeRateMatchesCurrency = (rate, side, currency) => String(rate?.[`${side}CurrencyId`]) === String(currency?.id);
  const R = extractMarkedBlock(
    path.join(root, "All Module/Quotation/QuotationCreateForm.js"),
    "// ---- rate lookup helpers (pure; tested by scripts/tests/money-cases.test.js) ----",
    "// ---- end rate lookup helpers ----",
    ["pickConversionRate", "moneyDateKey"],
    { parseNum, parseDateMillis, isUsableExchangeRateStatus, exchangeRateMatchesCurrency },
  );
  // ids as gen-money-cases.js gives them: rows entered later have larger ids
  const rows = cases.rates.rows.map((row, index) => ({
    id: 997900000000100 + index,
    fromCurrencyId: row.from, toCurrencyId: row.to, rate: row.rate, effectiveDate: row.effectiveDate, status: row.status,
  }));
  for (const q of cases.rates.queries) {
    const matched = R.pickConversionRate(rows, { id: q.currency }, { id: "VND" }, q.on);
    if (q.rate === null) {
      assert.equal(matched, null, `no rate for ${q.currency}`);
    } else {
      assert.equal(matched?.rate, q.rate, `${q.currency} on ${q.on}: rate`);
      assert.equal(R.moneyDateKey(matched.record.effectiveDate), q.rateDate, `${q.currency} on ${q.on}: rate date`);
    }
  }
}

console.log("money-cases: all tests passed");
