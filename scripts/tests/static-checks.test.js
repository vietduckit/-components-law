const assert = require("node:assert/strict");
const { spawnSync } = require("child_process");
const path = require("path");

// Runs the static checks over every JS Block, so the usual
// `for t in scripts/tests/*.test.js` loop covers them:
//  - tdz-check.js: "Cannot access 'X' before initialization"
//  - sandbox-globals-check.js: globals the RunJS sandbox blocks
for (const script of ["tdz-check.js", "sandbox-globals-check.js"]) {
  const res = spawnSync(process.execPath, [path.join(__dirname, script)], { encoding: "utf8" });
  const problems = (res.stdout || "").split("\n").filter((line) => /^(TDZ|SANDBOX) /.test(line));
  assert.equal(res.status, 0, `${script} found problems:\n${problems.join("\n")}${res.stderr || ""}`);
}

console.log("static-checks: all tests passed");
