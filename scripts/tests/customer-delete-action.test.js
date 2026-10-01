const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// 2026-09-25: the Customers table's Delete (JS action) lists the customer's
// folders + documents that go to Trash with it, and refuses a customer that
// still has Cases (the DB enforces both — pgsql/document_naming_guards.sql).
const file = path.resolve(__dirname, "../../All Module/Customer/CustomerDeleteAction.js");
const { summarizeCustomerFolders, partitionCustomersByCases } = extractMarkedBlock(
  file,
  "// ---- customer folder summary (pure; tested by scripts/tests/customer-delete-action.test.js) ----",
  "// ---- end customer folder summary ----",
  ["summarizeCustomerFolders", "partitionCustomersByCases"],
);

// bulk: customers with Cases are skipped, the rest deleted (input order kept)
{
  const customers = [{ id: 1, customerName: "A" }, { id: 2, customerName: "B" }, { id: 3, customerName: "C" }];
  const cases = [{ id: 10, customerId: 2 }, { id: 11, customerId: { id: 2 } }];
  const out = partitionCustomersByCases(customers, cases);
  assert.deepEqual(out.deletable.map((c) => c.id), [1, 3]);
  assert.deepEqual(out.blocked.map((b) => [b.customer.id, b.cases.length]), [[2, 2]]);
  assert.deepEqual(partitionCustomersByCases([], []), { blocked: [], deletable: [] });
}

const folders = [
  { id: 1, name: "Hồ sơ pháp lý", parentId: 99 }, // parent = the hidden "Customers" root (not in the set)
  { id: 2, name: "Hợp đồng", parentId: 1 },
  { id: 3, name: "Phụ lục", parentId: 2 },
  { id: 4, name: "Lead hôn nhân", parentId: null },
  { id: 5, name: "Old", parentId: 1, isDeleted: true },
];
const documents = [
  { id: 10, folderId: 1 },
  { id: 11, folderId: 2 },
  { id: 12, folderId: 3 },
  { id: 13, folderId: 3 },
  { id: 14, folderId: 4 },
  { id: 15, folderId: 3, isDeleted: true },
];
const out = summarizeCustomerFolders(folders, documents);
assert.deepEqual(
  out.roots.map((r) => [r.name, r.subfolders, r.documents]),
  [
    ["Hồ sơ pháp lý", 2, 4],
    ["Lead hôn nhân", 0, 1],
  ],
  "top-level folders with their whole subtree",
);
assert.equal(out.totalFolders, 4, "deleted folders don't count");
assert.equal(out.totalDocuments, 5, "deleted documents don't count");
assert.deepEqual(summarizeCustomerFolders([], []), { roots: [], totalFolders: 0, totalDocuments: 0 });
// relation objects instead of ids
assert.equal(summarizeCustomerFolders([{ id: 7, name: "A", parentId: { id: 6 } }], [{ folderId: { id: 7 } }]).totalDocuments, 1);

const src = fs.readFileSync(file, "utf8");
// one script for the row action (ctx.filterByTk) and the toolbar action (selected rows)
assert.ok(/const isRowAction = ctx\.filterByTk !== undefined && ctx\.filterByTk !== null;/.test(src), "row vs table action");
assert.ok(/resource\.getSelectedRows\(\)/.test(src), "bulk: the selected rows");
assert.ok(/listAll\("projects", \{ customerId: \{ \$in: ids \} \}/.test(src), "checks the customers' Cases first");
assert.ok(/ctx\.modal\.warning\(/.test(src) && /ctx\.modal\.confirm\(/.test(src), "refuses with Cases, confirms otherwise");
assert.ok(/await resource\.destroy\(ids\.length === 1 \? ids\[0\] : ids\)/.test(src), "deletes through the table resource (refreshes it)");
assert.ok(/resource\.setSelectedRows\(\[\]\)/.test(src), "bulk: clears the selection after deleting");
assert.ok(/errors\?\.\[0\]\?\.message/.test(src), "shows the database's reason when refused");

console.log("customer-delete-action: all tests passed");
