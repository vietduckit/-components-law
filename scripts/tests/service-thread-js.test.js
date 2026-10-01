const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// 2026-09-29 (service threads): a save / delete the database refuses (a
// billed contract, a task in progress) shows the database's message, not
// "Request failed with status code 500".
const root = path.resolve(__dirname, "../..");
const BLOCKS = [
  "All Module/Quotation/QuotationServices.js",
  "All Module/Contract/ContractServices.js",
  "All Module/Contract/ContractDetailView.js",
  "All Module/Case/CaseServices.js",
];
for (const rel of BLOCKS) {
  const { apiErrorText } = extractMarkedBlock(
    path.join(root, rel),
    "// ---- api error text (pure; tested by scripts/tests/service-thread-js.test.js) ----",
    "// ---- end api error text ----",
    ["apiErrorText"],
    {},
  );
  const refused = {
    response: { data: { errors: [{ message: 'Service "A" belongs to contract CT-1, which has payments — it cannot be changed.' }] } },
    message: "Request failed with status code 500",
  };
  assert.equal(apiErrorText(refused, "x"), 'Service "A" belongs to contract CT-1, which has payments — it cannot be changed.', rel);
  assert.equal(apiErrorText({ message: "boom" }, "x"), "boom", rel);
  assert.equal(apiErrorText(null, "fallback"), "fallback", rel);
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  assert.ok((src.match(/apiErrorText\(/g) || []).length >= 3, `${rel}: save and delete errors use apiErrorText`);
}

// the history block reads serviceChangeLogs for the current document and its threads
const log = fs.readFileSync(path.join(root, "All Module/Service/ServiceChangeLog.js"), "utf8");
assert.match(log, /serviceChangeLogs:list/);
assert.match(log, /serviceThreadId/);
assert.match(log, /documentType/);
assert.ok(log.includes('document.querySelector("body")?.clientWidth'), "responsive: a card list on narrow screens (sandbox-safe width)");
assert.ok(!/window\.(matchMedia|innerWidth)/.test(log), "no window.matchMedia / innerWidth (blocked by the RunJS sandbox)");
console.log("service-thread-js: all tests passed");
