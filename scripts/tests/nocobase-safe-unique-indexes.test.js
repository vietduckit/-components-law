const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// NocoBase drops every single-column unique index whose field is not declared
// unique each time it syncs a collection — i.e. whenever a field of that
// collection is created or edited (plugin-data-source-main server.ts
// fields.afterSaveWithAssociations -> collection.sync -> database
// sync-runner.ts handleUniqueIndex). It reads index columns from pg_index.indkey,
// so an index that lists its column twice, ("x", "x"), counts as two columns and
// is left alone, while enforcing exactly what a unique index on ("x") would.
// Dev lost ux_payment_requests_* and contractServices_projectServiceId_unique
// this way (2026-09-30), which also broke ON CONFLICT ("contractPaymentScheduleId").
const root = path.resolve(__dirname, "../..");
const dir = path.join(root, "pgsql");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql"));

const keyColumns = (list) => list.split(",").map((c) => c.trim()).filter(Boolean);
for (const file of files) {
  const sql = fs.readFileSync(path.join(dir, file), "utf8").replace(/--[^\n]*/g, "");
  for (const m of sql.matchAll(/CREATE\s+UNIQUE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?("?\w+"?)\s+ON\s+("?\w+"?)\s*\(([^)]*)\)/gi)) {
    assert.ok(keyColumns(m[3]).length >= 2, `${file}: unique index ${m[1]} has a single column — NocoBase collection sync drops it`);
  }
}

const GUARDED = [
  ["finance_foundation.sql", "ux_payment_requests_schedule_open", "paymentRequests", "contractPaymentScheduleId"],
  ["finance_foundation.sql", "ux_payment_requests_project_service_open", "paymentRequests", "projectServiceId"],
  ["service_thread_sync.sql", "contractServices_projectServiceId_unique", "contractServices", "projectServiceId"],
];
for (const [file, name, table, column] of GUARDED) {
  const sql = fs.readFileSync(path.join(dir, file), "utf8").replace(/--[^\n]*/g, "");
  const quoted = `"?${name}"?`;
  const create = sql.search(new RegExp(`CREATE UNIQUE INDEX (?:IF NOT EXISTS )?${quoted}\\s+ON "${table}" \\("${column}", "${column}"\\)`));
  assert.ok(create >= 0, `${file}: ${name} is ("${column}", "${column}")`);
  // an older single-column index of the same name (dev, local) must be replaced, not kept by IF NOT EXISTS
  const drop = sql.search(new RegExp(`DROP INDEX IF EXISTS ${quoted};`));
  assert.ok(drop >= 0 && drop < create, `${file}: ${name} is dropped before it is created`);
}
console.log("nocobase-safe-unique-indexes: all tests passed");
