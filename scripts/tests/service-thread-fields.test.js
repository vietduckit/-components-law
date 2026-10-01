const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// 2026-09-29: the service-thread columns and the history collection must be
// known to NocoBase, or the API drops them
// (docs/superpowers/specs/2026-09-29-service-thread-sync-design.md §3, §7).
const src = fs.readFileSync(path.resolve(__dirname, "../../JsField/RegisterServiceThreadFields.js"), "utf8");
for (const c of ["quotationServices", "contractServices", "projectServices"]) {
  assert.ok(new RegExp(`\\["${c}", bigIntField\\("serviceThreadId"`).test(src), `${c}.serviceThreadId`);
}
assert.ok(/\["contractServices", stringField\("serviceType"/.test(src), "contractServices.serviceType");
assert.ok(/\["projectServices", numberField\("quantity"/.test(src), "projectServices.quantity");
assert.ok(/name: "serviceChangeLogs"/.test(src) && /collections:create/.test(src), "serviceChangeLogs collection");
for (const f of ["serviceThreadId", "action", "tableName", "recordId", "documentType", "documentId", "fieldName", "oldValue", "newValue", "originLogId"]) {
  assert.ok(src.includes(`"${f}"`), `history field ${f}`);
}
assert.ok(/\[skip\]/.test(src), "idempotent");
console.log("service-thread-fields: all tests passed");
