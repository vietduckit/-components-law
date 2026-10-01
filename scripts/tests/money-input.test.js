const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// 2026-09-29: a foreign price can be typed with its decimals (120.50 USD);
// VND stays whole đồng with "." grouping; foreign amounts show all their
// decimals (10.80, not 10.8). Spec §10.
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const START = "// ---- money draft helpers (pure; tested by scripts/tests/money-input.test.js) ----";
const END = "// ---- end money draft helpers ----";

{
  const Q = extractMarkedBlock(path.join(root, "All Module/Quotation/QuotationCreateForm.js"), START, END,
    ["cleanDecimalDraft", "moneyDraftShow", "moneyDraftValue"]);
  assert.equal(Q.cleanDecimalDraft("1,20.505", 2), "120.50");
  assert.equal(Q.cleanDecimalDraft("120.", 2), "120.", "a trailing dot survives while typing");
  assert.equal(Q.moneyDraftShow(1000000, 0), "1.000.000");
  assert.equal(Q.moneyDraftShow(120.5, 2), "120.5");
  assert.equal(Q.moneyDraftValue("120.50", 2), 120.5);
  assert.equal(Q.moneyDraftValue("1.000.000", 0), 1000000);
  assert.equal(Q.moneyDraftValue("", 2), 0);
}
{
  const K = extractMarkedBlock(path.join(root, "All Module/Contract/ContractCreateForm.js"), START, END,
    ["moneyInputShow", "moneyInputRaw"]);
  assert.equal(K.moneyInputShow(1000000, 0), "1.000.000");
  assert.equal(K.moneyInputShow("120.5", 2), "120.5");
  assert.equal(K.moneyInputRaw("120.505", 2), "120.50");
  assert.equal(K.moneyInputRaw("1.000.000", 0), "1000000");
}
// Vietnamese typing in a foreign-currency box, and a currency switched to VND
// (second review): a comma is the decimal point when 1-2 digits (or nothing)
// follow it and groups thousands when 3 do; a dot is the decimal point unless
// several dots group thousands; a decimal amount switched to VND rounds to
// whole đồng instead of losing its point ("120.50" -> "12.050")
{
  const Q = extractMarkedBlock(path.join(root, "All Module/Quotation/QuotationCreateForm.js"), START, END,
    ["cleanDecimalDraft", "moneyDraftShow", "moneyDraftValue", "groupWholeDraft"]);
  const K = extractMarkedBlock(path.join(root, "All Module/Contract/ContractCreateForm.js"), START, END,
    ["moneyInputShow", "moneyInputRaw"]);
  for (const [typed, want] of [
    ["120,5", "120.5"], ["120,50", "120.50"], ["1,500", "1500"], ["1.500.000", "1500000"],
    ["1.500,50", "1500.50"], ["1,500.50", "1500.50"], ["120.", "120."], ["120,", "120."],
    ["120.505", "120.50"], ["1,20.505", "120.50"],
  ]) {
    assert.equal(Q.cleanDecimalDraft(typed, 2), want, `Quotation "${typed}"`);
    assert.equal(K.moneyInputRaw(typed, 2), want, `Contract "${typed}"`);
  }
  assert.equal(Q.moneyDraftShow("120.50", 0), "121", "Quotation: 120.50 switched to VND");
  assert.equal(Q.moneyDraftShow(120.5, 0), "121");
  assert.equal(Q.moneyDraftShow("1000000", 0), "1.000.000");
  assert.equal(Q.groupWholeDraft("1.000.00"), "100.000", "a VND box being typed in keeps digits only");
  assert.equal(K.moneyInputShow("120.50", 0), "121", "Contract: 120.50 switched to VND");
  assert.equal(K.moneyInputShow("1000000", 0), "1.000.000");
  assert.equal(K.moneyInputRaw("1.000.00", 0), "100000", "a VND box being typed in keeps digits only");
  const q = read("All Module/Quotation/QuotationCreateForm.js");
  assert.match(q, /: groupWholeDraft\(inputValue\);/, "typed VND is grouped, not read as a stored decimal");
}
// every price input passes its currency; display keeps a currency's decimals
{
  const q = read("All Module/Quotation/QuotationCreateForm.js");
  assert.ok(/const PriceInput = \(\{ value, onChange, prefilled, currency = null \}\)/.test(q), "Quotation PriceInput takes a currency");
  assert.ok(/value: r\.basePrice,\s*onChange: \(v\) => onUpdate\(r\._id, "basePrice", v\),\s*currency: rowCurrency/.test(q), "row price input passes its currency");
  // the display formatters only; a draft being typed (formatMoneyDraft) must not pad
  const bodyOf = (src, name) => {
    const a = src.indexOf(`const ${name} = `);
    assert.ok(a >= 0, `${name} exists`);
    return src.slice(a, src.indexOf("};", a));
  };
  for (const [rel, fn] of [
    ["All Module/Quotation/QuotationCreateForm.js", "formatMoneyAmount"],
    ["All Module/Case/CaseCreateForm.js", "formatMoneyAmount"],
    ["All Module/Contract/ContractCreateForm.js", "formatMoneyAmountByCurrency"],
  ]) {
    assert.ok(/minimumFractionDigits: (decimals|getCurrencyDecimals\(info\)),/.test(bodyOf(read(rel), fn)), `${rel} ${fn}: amounts show all their decimals`);
  }
  const k = read("All Module/Contract/ContractCreateForm.js");
  assert.ok(/inputMode: decimals > 0 \? "decimal" : "numeric"/.test(k), "Contract MoneyInput offers a decimal keyboard for foreign currencies");
}
console.log("money-input: all tests passed");
