const assert = require("node:assert/strict");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// 2026-10-01 (user rule): the case-code STT runs on through the whole year
// and resets only in January — Sept C001..C032 → Oct starts at C033, not C001.
// The MMYYYY part still shows the Open date's month/year (matches the Cases
// "Case Code" sequence field: reset cycle "day 1 of the month, only in January").
// Same block in the dev form and the Prod copy deployed to the live instance.
for (const name of ["CaseCreateForm.js", "CaseCreateForm-Prod.js"]) {
  const file = path.resolve(__dirname, "../../All Module/Case", name);
  const { nextCaseCode } = extractMarkedBlock(
    file,
    "// ---- case code sequence (pure; tested by scripts/tests/case-code-sequence.test.js) ----",
    "// ---- end case code sequence ----",
    ["nextCaseCode"],
  );

  const sept = Array.from({ length: 32 }, (_, i) => `C${String(i + 1).padStart(3, "0")}092026`);

  // continues across months within the year
  assert.equal(nextCaseCode(sept, "C", "10", 2026), "C033102026");
  assert.equal(nextCaseCode([...sept, "C033102026"], "C", "10", 2026), "C034102026");
  // highest STT of the year wins, whatever its month
  assert.equal(nextCaseCode(["C040082026", "C005092026"], "C", "10", 2026), "C041102026");
  // a new year starts again at 001
  assert.equal(nextCaseCode(sept, "C", "01", 2027), "C001012027");
  // other years / prefixes / malformed codes are ignored
  assert.equal(nextCaseCode(["C099122025", "V050092026", "C12092026", "C001132026", "", null], "C", "10", 2026), "C001102026");
  // case-insensitive prefix, as before
  assert.equal(nextCaseCode(["c007092026"], "C", "10", 2026), "C008102026");
  // past 999 keeps counting instead of wrapping
  assert.equal(nextCaseCode(["C999092026"], "C", "10", 2026), "C1000102026");
  assert.equal(nextCaseCode(["C1000092026"], "C", "10", 2026), "C1001102026");
  // no codes yet
  assert.equal(nextCaseCode([], "V", "03", 2026), "V001032026");
}

console.log("case-code-sequence: ok");
