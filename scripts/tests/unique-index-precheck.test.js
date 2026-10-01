const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// pgsql/deploy/precheck_unique_indexes.sql lists the rows that would make a unique
// index the deploy creates on dev fail (CREATE UNIQUE INDEX stops the whole file).
// It must count with the exact predicate of each index (the older
// finance_foundation_audit.sql also skips 'rejected', which the indexes do not),
// stay read-only and be a single SELECT (pgAdmin shows the last result only).
const root = path.resolve(__dirname, "../..");
const PRECHECK = path.join(root, "pgsql/deploy/precheck_unique_indexes.sql");
assert.ok(fs.existsSync(PRECHECK), "pgsql/deploy/precheck_unique_indexes.sql missing");
const precheck = fs.readFileSync(PRECHECK, "utf8");

const squash = (s) => s.replace(/\s+/g, " ").trim();
const code = squash(precheck.replace(/--[^\n]*/g, ""));

const INDEXES = [
  ["pgsql/finance_foundation.sql", "ux_payment_requests_schedule_open", "paymentRequests"],
  ["pgsql/finance_foundation.sql", "ux_payment_requests_project_service_open", "paymentRequests"],
  ["pgsql/service_thread_sync.sql", "contractServices_projectServiceId_unique", "contractServices"],
];
for (const [file, name, table] of INDEXES) {
  const sql = fs.readFileSync(path.join(root, file), "utf8");
  const quoted = `"?${name}"?`;
  // the column is listed twice (NocoBase keeps a two-column index; see nocobase-safe-unique-indexes.test.js)
  const m = sql.match(new RegExp(`CREATE UNIQUE INDEX ${quoted}\\s+ON "${table}" \\(("\\w+"), \\1\\)\\s+WHERE ([^;]+);`));
  assert.ok(m, `${name} not found in ${file}`);
  const [, column, predicate] = m;
  assert.ok(code.includes(`'${name}'`), `${name}: not reported by the precheck`);
  assert.ok(code.includes(`FROM "${table}" WHERE ${squash(predicate)} GROUP BY ${column}`), `${name}: precheck predicate differs from the index`);
  assert.ok(code.includes(`'${file}'`), `${name}: precheck does not name ${file}`);
}

assert.doesNotMatch(code, /\b(UPDATE|DELETE|INSERT|TRUNCATE|ALTER|CREATE|DROP|COMMIT|BEGIN)\b/i, "read-only, no transaction");
assert.equal((code.match(/;/g) || []).length, 1, "a single statement");
assert.match(code, /pg_indexes/, "also lists the unique indexes the tables already have");
console.log("unique-index precheck: all tests passed");
