const assert = require("node:assert/strict");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

const h = extractMarkedBlock(
  path.resolve(__dirname, "../../All Module/Contract/ContractCreateForm.js"),
  "// ---- payment-trigger helpers (pure; tested by scripts/tests/payment-trigger-helpers.test.js) ----",
  "// ---- end payment-trigger helpers ----",
  ["groupTriggerTasks", "mergeTriggerSelection", "diffTaskTriggers", "linesWithoutTrigger", "triggerTemplateIdsFor"],
);

const lines = [
  { key: "11", name: "Company setup", serviceId: "7", projectServiceId: "11" },
  { key: "12", name: "Trademark", serviceId: "8", projectServiceId: "12" },
  { key: "manual-a", name: "Custom advice", serviceId: null, projectServiceId: null },
];

// groupTriggerTasks — case source matches on projectServiceId, sorts by taskIndex
{
  const records = [
    { id: 102, title: "File", status: "toDo", projectServiceId: 11, isPaymentTrigger: false, taskIndex: 2 },
    { id: 101, title: "Draft", status: "done", projectServiceId: { id: 11 }, isPaymentTrigger: true, taskIndex: 1 },
    { id: 201, title: "Search", status: "toDo", projectServiceId: 12, isPaymentTrigger: null, taskIndex: 1 },
    { id: 999, title: "Orphan", status: "toDo", projectServiceId: 55, isPaymentTrigger: true },
  ];
  const g = h.groupTriggerTasks("case", lines, records);
  assert.deepEqual(g["11"].map((t) => t.id), ["101", "102"]);
  assert.equal(g["11"][0].isPaymentTrigger, true);
  assert.equal(g["12"][0].isPaymentTrigger, false);
  assert.deepEqual(g["manual-a"], []);
}

// groupTriggerTasks — template source matches on serviceId, sorts by sortOrder,
// and two lines sharing a serviceId each get their own copy (Review Focus 2)
{
  const dupLines = [
    { key: "qsvc-1", name: "Company setup", serviceId: "7", projectServiceId: null },
    { key: "manual-b", name: "Company setup (extra)", serviceId: "7", projectServiceId: null },
  ];
  const records = [
    { id: 5, serviceId: 7, templateName: "Sign", sortOrder: 2, isPaymentTrigger: true },
    { id: 4, serviceId: { id: 7 }, templateName: "Draft", sortOrder: 1, isPaymentTrigger: false },
  ];
  const g = h.groupTriggerTasks("template", dupLines, records);
  assert.deepEqual(g["qsvc-1"].map((t) => t.title), ["Draft", "Sign"]);
  assert.deepEqual(g["manual-b"].map((t) => t.id), ["4", "5"]);
  assert.notEqual(g["qsvc-1"], g["manual-b"]);
  assert.equal(g["qsvc-1"][0].status, "");
}

// mergeTriggerSelection — keeps surviving keys, drops removed, defaults new (Review Focus 4)
{
  const tasksByLine = {
    "11": [{ id: "101", isPaymentTrigger: true }, { id: "102", isPaymentTrigger: false }],
    "13": [{ id: "301", isPaymentTrigger: true }],
  };
  const prev = { "11": ["102"], "12": ["201"] };
  assert.deepEqual(h.mergeTriggerSelection(prev, tasksByLine), { "11": ["102"], "13": ["301"] });
  // prev ids no longer present in that line's tasks are dropped
  assert.deepEqual(h.mergeTriggerSelection({ "11": ["102", "gone"] }, tasksByLine)["11"], ["102"]);
  // reset (Review Focus 1): empty prev → pure defaults
  assert.deepEqual(h.mergeTriggerSelection({}, tasksByLine), { "11": ["101"], "13": ["301"] });
}

// diffTaskTriggers — only changed tasks
{
  const tasksByLine = {
    "11": [{ id: "101", isPaymentTrigger: true }, { id: "102", isPaymentTrigger: false }],
    "12": [{ id: "201", isPaymentTrigger: false }],
  };
  const selection = { "11": ["102"], "12": [] };
  assert.deepEqual(h.diffTaskTriggers(tasksByLine, selection), [
    { id: "101", isPaymentTrigger: false },
    { id: "102", isPaymentTrigger: true },
  ]);
  assert.deepEqual(h.diffTaskTriggers(tasksByLine, { "11": ["101"], "12": [] }), []);
}

// linesWithoutTrigger — only lines that HAVE tasks but none ticked
{
  const tasksByLine = { "11": [{ id: "101" }], "12": [{ id: "201" }], "manual-a": [] };
  const selection = { "11": ["101"], "12": [], "manual-a": [] };
  assert.deepEqual(h.linesWithoutTrigger(lines, tasksByLine, selection), ["Trademark"]);
}

// triggerTemplateIdsFor — null when no template tasks, [] when explicitly none
{
  const tasksByLine = { a: [{ id: "4" }, { id: "5" }], b: [] };
  assert.deepEqual(h.triggerTemplateIdsFor(tasksByLine, { a: ["5"] }, "a"), ["5"]);
  assert.deepEqual(h.triggerTemplateIdsFor(tasksByLine, {}, "a"), []);
  assert.equal(h.triggerTemplateIdsFor(tasksByLine, {}, "b"), null);
  assert.equal(h.triggerTemplateIdsFor(tasksByLine, {}, "missing"), null);
}

console.log("payment-trigger-helpers: all tests passed");
