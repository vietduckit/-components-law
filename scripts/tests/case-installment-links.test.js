const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

const file = path.resolve(__dirname, "../../All Module/Case/CaseCreateForm.js");
const { resolveTemplateTaskLinks } = extractMarkedBlock(
  file,
  "// ---- installment template links (pure; tested by scripts/tests/case-installment-links.test.js) ----",
  "// ---- end installment template links ----",
  ["resolveTemplateTaskLinks"],
);

// Case rows after submit: each catalog row's Sample Tasks (_templateTasks),
// possibly renamed by the lawyer; ids are projectTemplates ids.
const rows = [
  {
    serviceId: "7",
    _templateTasks: [
      { id: 4, templateName: "Draft contract", title: "Draft contract (v2)" }, // renamed
      { _id: "5", id: 5, templateName: "Sign" },
    ],
  },
  { serviceId: "8", _templateTasks: [{ id: 9, templateName: "Search" }] },
  { serviceId: "", serviceName: "Custom", _customTaskTemplates: [{ title: "x" }] },
];
// Real tasks created for the Case (DB clone + syncCatalogServiceTasks renames).
const tasks = [
  { id: 1001, title: "Draft contract (v2)", serviceId: 7, status: "done" },
  { id: 1002, title: "  sign ", serviceId: "7", status: "toDo" },
  { id: 1003, title: "Search", serviceId: 8, status: "toDo" },
  { id: 1004, title: "Sign", serviceId: 99, status: "toDo" }, // same title, other service
];

const ids = (args) => resolveTemplateTaskLinks(args).taskIds;

// template ids → real task ids, open first; renamed title followed; service must match
assert.deepEqual(ids({ templateIds: ["4", "5"], rows, tasks }), [1002, 1001]);
assert.deepEqual(ids({ templateIds: [9], rows, tasks }), [1003]);
// template removed from Sample Tasks (not in any row) → skipped silently
assert.deepEqual(resolveTemplateTaskLinks({ templateIds: ["4", "404"], rows, tasks }), {
  taskIds: [1001],
  unresolvedCount: 0,
});
// nothing / bad input
assert.deepEqual(resolveTemplateTaskLinks({ templateIds: null, rows, tasks }), { taskIds: [], unresolvedCount: 0 });
assert.deepEqual(ids({ templateIds: ["4"], rows: null, tasks }), []);
// no duplicates when two templates resolve to the same task
assert.deepEqual(ids({ templateIds: ["4", "4"], rows, tasks }), [1001]);

// Review fix 5: a template still in Sample Tasks but with no matching Case
// task (e.g. its rename failed to save) is COUNTED so the lawyer is warned.
assert.deepEqual(
  resolveTemplateTaskLinks({
    templateIds: ["4"],
    rows,
    tasks: tasks.filter((task) => task.id !== 1001),
  }),
  { taskIds: [], unresolvedCount: 1 },
);
// …and a blanked title matches "Untitled task", like syncCatalogServiceTasks writes.
assert.deepEqual(
  ids({
    templateIds: ["3"],
    rows: [{ serviceId: "7", _templateTasks: [{ id: 3, title: "   ", templateName: "" }] }],
    tasks: [{ id: 2001, title: "Untitled task", serviceId: 7, status: "toDo" }],
  }),
  [2001],
);

// Wiring: the Case submit links installment tasks for a contract-sourced Case.
{
  const src = fs.readFileSync(file, "utf8");
  const submitTail = src.slice(src.indexOf("const linkInstallmentTemplateTasks = async"));
  assert.ok(/linkInstallmentTemplateTasks\(/.test(submitTail), "submit calls linkInstallmentTemplateTasks");
  assert.ok(/triggerTemplateIds/.test(submitTail), "reads contractPaymentSchedules.triggerTemplateIds");
}

console.log("case-installment-links: all tests passed");
