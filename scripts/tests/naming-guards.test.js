const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// 2026-09-25 naming guards (pgsql/document_naming_guards.sql). The SQL itself
// is exercised by pgsql/tests/document_naming_guards_test.sql against a real
// Postgres; this covers the JS side and keeps the two in step.
const root = path.resolve(__dirname, "../..");
// 2026-10-01: UI labels are tr("English") (scripts/i18n/ui-strings.js); the
// checks below read the source with a plain tr("…") unwrapped to "…"
const untr = (src) => src.replace(/\btr\(("(?:[^"\\]|\\.)*")\)/g, "$1");
const read = (rel) => untr(fs.readFileSync(path.join(root, rel), "utf8"));
const sql = read("pgsql/document_naming_guards.sql");

// ---- the DB numbering matches the JS getUniqueFileName ----------------------
// The SQL test expects exactly these names; the client helper must agree so
// titles numbered in the browser and in the database look the same.
{
  const src = read("All Module/Document/CaseDocument.js");
  const start = src.indexOf("const getUniqueFileName = (fileName, existingNames) => {");
  const end = src.indexOf("\n};", start);
  const getUniqueFileName = new Function(`${src.slice(start, end + 3)}\nreturn getUniqueFileName;`)();
  assert.equal(getUniqueFileName("report.pdf", ["Report.pdf"]), "report (1).pdf");
  assert.equal(getUniqueFileName("Report.pdf", ["Report.pdf", "report (1).pdf"]), "Report (2).pdf");
  assert.equal(getUniqueFileName("archive.tar.gz", ["archive.tar.gz"]), "archive.tar (1).gz");
  assert.equal(getUniqueFileName(".env", [".env"]), ".env (1)");
  const test = read("pgsql/tests/document_naming_guards_test.sql");
  for (const expected of ["report (1).pdf", "Report (2).pdf", "archive.tar (1).gz", ".env (1)"]) {
    assert.ok(test.includes(`'${expected}'`), `SQL test expects "${expected}" like the client`);
  }
}

// ---- SQL shape -------------------------------------------------------------------
assert.ok(
  /BEFORE INSERT OR UPDATE OF "customerName", "customerType", "taxCode", "IdentityNumber", email, phone ON customers/.test(sql),
  "customer guard trigger (type, ids, email, phone)",
);
// company names unique among companies; individuals told apart by CCCD/MST/email/phone
assert.ok(/lower\(btrim\(COALESCE\(NEW\."customerType", ''\)\)\) = 'company'/.test(sql), "company vs individual rules");
assert.ok(/law_norm_phone/.test(sql) && /law_norm_email/.test(sql), "email / phone keys");
// deleting: blocked with Cases, otherwise the customer's folders + documents go to Trash —
// also when NocoBase nulls the references before the DELETE (checked at commit)
assert.ok(/BEFORE DELETE ON customers/.test(sql) && /AFTER DELETE ON customers/.test(sql), "customer delete triggers");
for (const table of ["folders", "documents", "projects"]) {
  assert.ok(new RegExp(`CREATE CONSTRAINT TRIGGER \\w+\\n\\s+AFTER UPDATE OF "customerId" ON ${table}\\n\\s+DEFERRABLE INITIALLY DEFERRED`).test(sql), `${table}: unlink checked at commit`);
}
assert.ok(/BEFORE INSERT OR UPDATE OF name, "parentId", "customerId", "projectId", "isDeleted" ON folders/.test(sql), "folder guard trigger");
assert.ok(/BEFORE INSERT OR UPDATE OF title, "folderId", "isDeleted" ON documents/.test(sql), "document guard trigger");
// Case folders carry the customer's id — only non-case folders can be customer roots
assert.ok(/NEW\."customerId" IS NOT NULL AND NEW\."projectId" IS NULL AND NEW\."taskId" IS NULL/.test(sql), "customer root excludes case/task folders");
assert.ok(/pg_advisory_xact_lock/.test(sql), "concurrent writes serialized");
assert.ok(/COLLATE "und-x-icu"/.test(sql), "Vietnamese capitals fold when ICU is available");
assert.ok(!/\[\^d|\(d\+\)/.test(sql), "no regex lost its backslashes");

// ---- CustomerDocument surfaces the guard's message --------------------------------
{
  const src = read("All Module/Document/CustomerDocument.js");
  assert.ok(/const serverErrorMessage = \(error, fallback\) =>/.test(src), "server message helper");
  for (const fallback of ["Failed to create linked customer", "Update failed", "Rename failed"]) {
    // labels may be wrapped in tr("English") (scripts/i18n/ui-strings.js)
    assert.ok(src.includes(`serverErrorMessage(e, "${fallback}")`) || src.includes(`serverErrorMessage(e, tr("${fallback}"))`), `"${fallback}" shows the server's reason`);
    assert.ok(!src.includes(`message.error("${fallback}")`) && !src.includes(`message.error(tr("${fallback}"))`), `"${fallback}" no longer hides it`);
  }
  // both folder-create catches (the remaining plain text is the "no id returned" case)
  assert.equal((src.match(/serverErrorMessage\(e, (?:tr\()?"Failed to create folder"\)?\)/g) || []).length, 2, "folder create shows the server's reason");
  // a 404 from the fallback endpoint must not replace the real error
  // create, edit, rename, delete
  assert.equal((src.match(/lastError = keepMeaningfulError\(lastError, e\)/g) || []).length, 4, "all customer endpoint loops");
  assert.ok(src.includes('serverErrorMessage(e, "Delete failed")'), "a refused delete shows the reason");
  assert.ok(!/will remain in Trash or become unlinked/.test(src), "delete dialog describes what really happens");
  assert.ok(/data: \{ title: savedTitle \}/.test(src), "attachment title follows the numbered document title");
}

// ---- CaseCreateForm reuses an existing customer root folder by name ----------------
{
  const src = read("All Module/Case/CaseCreateForm.js");
  const block = src.slice(src.indexOf("// 1b. A root folder with the customer's name"), src.indexOf("// 2. Nếu chưa có folder khách hàng"));
  assert.ok(/name: customerName/.test(block) && /projectId: null/.test(block), "looks the root up by name before creating");
}

console.log("naming-guards: all tests passed");
