const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

const file = path.resolve(__dirname, "../../All Module/Contract/ContractCreateForm.js");
const h = extractMarkedBlock(
  file,
  "// ---- installment trigger helpers (pure; tested by scripts/tests/installment-triggers.test.js) ----",
  "// ---- end installment trigger helpers ----",
  [
    "installmentTriggerItems",
    "installmentTaskGroups",
    "pruneInstallmentSelection",
    "installmentLinkOwner",
    "orderLinksOpenFirst",
    "installmentsWithoutTasks",
  ],
);

const lines = [
  { key: "11", name: "Company setup" },
  { key: "12", name: "Trademark" },
  { key: "manual-a", name: "Custom advice" },
];
const tasksByLine = {
  "11": [
    { id: "101", title: "Draft", status: "done" },
    { id: "102", title: "File", status: "toDo" },
  ],
  "12": [{ id: "201", title: "Search", status: "toDo" }],
  "manual-a": [],
};
const rows = [
  { id: "pay-1", installment: "Installment 1", percentage: "30", serviceKeys: ["11"] },
  { id: "pay-2", installment: "", percentage: "70", serviceKeys: ["11", "12", "manual-a"] },
  { id: "pay-3", installment: "Final", percentage: "", serviceKeys: [] },
];

// installmentTriggerItems — one accordion item per schedule row
{
  const items = h.installmentTriggerItems(rows);
  assert.deepEqual(items.map((it) => it.key), ["pay-1", "pay-2", "pay-3"]);
  assert.equal(items[0].name, "Installment 1 — 30%");
  assert.equal(items[1].name, "Installment 2 — 70%", "blank label falls back to its position");
  assert.equal(items[2].name, "Final");
  assert.deepEqual(items[1].serviceKeys, ["11", "12", "manual-a"]);
}

// installmentTaskGroups — tasks of the installment's tagged services, grouped by service in line order
{
  const [, inst2] = h.installmentTriggerItems(rows);
  const groups = h.installmentTaskGroups(inst2, lines, tasksByLine);
  assert.deepEqual(groups.map((g) => g.lineName), ["Company setup", "Trademark"], "services without tasks omitted");
  assert.deepEqual(groups[0].tasks.map((t) => t.id), ["101", "102"]);
  assert.deepEqual(h.installmentTaskGroups(h.installmentTriggerItems(rows)[2], lines, tasksByLine), []);
  // a serviceKey no longer among the contract's lines is ignored
  assert.deepEqual(h.installmentTaskGroups({ key: "x", serviceKeys: ["gone"] }, lines, tasksByLine), []);
}

// pruneInstallmentSelection — drop removed installments, un-offered tasks, and cross-installment duplicates
{
  const items = h.installmentTriggerItems(rows);
  const selection = {
    "pay-1": ["101", "201"], // 201 belongs to Trademark, not tagged on installment 1
    "pay-2": ["101", "201"], // 101 already claimed by installment 1
    "pay-9": ["102"], // installment removed
  };
  assert.deepEqual(h.pruneInstallmentSelection(selection, items, lines, tasksByLine), {
    "pay-1": ["101"],
    "pay-2": ["201"],
    "pay-3": [],
  });
  assert.deepEqual(h.pruneInstallmentSelection({}, items, lines, tasksByLine), { "pay-1": [], "pay-2": [], "pay-3": [] });
}

// installmentLinkOwner — which installment a task is linked to (for locking elsewhere)
{
  const items = h.installmentTriggerItems(rows);
  const owner = h.installmentLinkOwner({ "pay-1": ["101"], "pay-2": ["201"] }, items);
  assert.deepEqual(owner, { "101": "pay-1", "201": "pay-2" });
}

// orderLinksOpenFirst — not-done first, done last, stable; unknown status counts as open
{
  const byId = { a: { status: "done" }, b: { status: "toDo" }, c: { status: "done" }, d: {} };
  assert.deepEqual(h.orderLinksOpenFirst(["a", "b", "c", "d"], byId), ["b", "d", "a", "c"]);
  assert.deepEqual(h.orderLinksOpenFirst([], byId), []);
}

// installmentsWithoutTasks — installments that offer tasks but have none ticked
{
  const items = h.installmentTriggerItems(rows);
  assert.deepEqual(
    h.installmentsWithoutTasks(items, lines, tasksByLine, { "pay-1": ["101"], "pay-2": [] }),
    ["Installment 2 — 70%"],
    "pay-3 offers no tasks, so it isn't flagged",
  );
}

// Review fix 1: pruning is written back, so a tick dropped when its service
// was untagged can't come back and silently steal the task from a later
// installment when the service is re-tagged.
{
  const h2 = extractMarkedBlock(
    file,
    "// ---- installment trigger helpers (pure; tested by scripts/tests/installment-triggers.test.js) ----",
    "// ---- end installment trigger helpers ----",
    ["installmentTriggerItems", "pruneInstallmentSelection", "sameInstallmentSelection", "toggleInstallmentTick"],
  );
  const svcLines = [{ key: "S", name: "Service S" }];
  const svcTasks = { S: [{ id: "T", title: "Task T", status: "toDo" }] };
  const withS = h2.installmentTriggerItems([
    { id: "i1", installment: "Inst 1", serviceKeys: ["S"] },
    { id: "i2", installment: "Inst 2", serviceKeys: ["S"] },
  ]);
  const withoutS = h2.installmentTriggerItems([
    { id: "i1", installment: "Inst 1", serviceKeys: [] },
    { id: "i2", installment: "Inst 2", serviceKeys: ["S"] },
  ]);
  let state = h2.toggleInstallmentTick({}, withS, svcLines, svcTasks, "i1", "T", true);
  assert.deepEqual(state, { i1: ["T"], i2: [] });
  state = h2.pruneInstallmentSelection(state, withoutS, svcLines, svcTasks); // S untagged from Inst 1 (written back)
  assert.deepEqual(state, { i1: [], i2: [] });
  state = h2.toggleInstallmentTick(state, withoutS, svcLines, svcTasks, "i2", "T", true);
  assert.deepEqual(state, { i1: [], i2: ["T"] });
  state = h2.pruneInstallmentSelection(state, withS, svcLines, svcTasks); // S re-tagged on Inst 1
  assert.deepEqual(state, { i1: [], i2: ["T"] }, "T stays on Inst 2");
  assert.equal(h2.sameInstallmentSelection({ a: ["1", "2"] }, { a: ["1", "2"] }), true);
  assert.equal(h2.sameInstallmentSelection({ a: ["1"] }, { a: ["1"], b: [] }), false);
  // untick
  assert.deepEqual(h2.toggleInstallmentTick({ i2: ["T"] }, withS, svcLines, svcTasks, "i2", "T", false), { i1: [], i2: [] });
}

// Review fix 3: in a Case, a task already linked to another installment
// (e.g. the main contract's) is carried through grouping so it can be locked.
{
  const g = extractMarkedBlock(
    file,
    "// ---- payment-trigger helpers (pure; tested by scripts/tests/payment-trigger-helpers.test.js) ----",
    "// ---- end payment-trigger helpers ----",
    ["groupTriggerTasks"],
  ).groupTriggerTasks(
    "case",
    [{ key: "11", projectServiceId: "11", serviceId: "7", name: "S" }],
    [
      { id: 1, title: "A", projectServiceId: 11, linkedPaymentRequestId: { id: 900 } },
      { id: 2, title: "B", projectServiceId: 11, paymentRequestId: 901 },
      { id: 3, title: "C", projectServiceId: 11 },
    ],
  );
  assert.deepEqual(g["11"].map((t) => t.linkedPaymentRequestId), ["900", "901", null]);
}

// Wiring: submit links open-first after each schedule row and sends triggerTemplateIds without a Case.
{
  const src = fs.readFileSync(file, "utf8");
  const submit = src.slice(src.indexOf("const handleSubmit = async () => {"));
  assert.ok(/installmentsWithoutTasks\(/.test(submit), "submit warns about installments without tasks");
  assert.ok(/orderLinksOpenFirst\(/.test(submit), "submit links tasks open-first");
  assert.ok(/contractPaymentScheduleId: \{ \$eq: scheduleRowId \}/.test(submit), "looks up the installment's Payment Request");
  assert.ok(/triggerTemplateIds:/.test(submit), "writes triggerTemplateIds for Case-less contracts");
}

// ---- 2026-09-29: By Case "One time" gets trigger tasks too ----
{
  const one = extractMarkedBlock(
    file,
    "// ---- installment trigger helpers (pure; tested by scripts/tests/installment-triggers.test.js) ----",
    "// ---- end installment trigger helpers ----",
    ["oneTimeTriggerItem", "ONE_TIME_TRIGGER_KEY"],
  );
  // one item for the whole payment, offering the tasks of every service
  assert.deepEqual(one.oneTimeTriggerItem(lines), {
    key: one.ONE_TIME_TRIGGER_KEY,
    name: "One-time payment — 100%",
    serviceKeys: ["11", "12", "manual-a"],
  });
  assert.deepEqual(h.installmentTaskGroups(one.oneTimeTriggerItem(lines), lines, tasksByLine).map((g) => g.lineKey), ["11", "12"]);

  const src = fs.readFileSync(file, "utf8");
  assert.ok(/const triggerFeatureOn = isByService \|\| isByCase;/.test(src), "task data loads for One time too");
  assert.ok(/showOneTimeTriggers\s*\?\s*\[oneTimeTriggerItem\(triggerLines\)\]/.test(src), "One time: one trigger item");
  assert.ok(/showOneTimeTriggers &&\s*React\.createElement\(PaymentTriggersSection/.test(src), "One time: the Payment Triggers section is shown");
  const submit = src.slice(src.indexOf("const byCaseInstallments = isMultiplePayments"), src.indexOf("if (failedInstallmentLinks)"));
  assert.ok(/reuseExisting: true/.test(submit), "One time: the payment the database made for the linked Case is reused");
  assert.ok(/url: "contractPaymentSchedules:list"/.test(submit), "looks the One time row up before creating one");
}

console.log("installment-triggers: all tests passed");
