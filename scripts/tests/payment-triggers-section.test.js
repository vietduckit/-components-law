const assert = require("node:assert/strict");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// Render test for PaymentTriggersSection (inline summary + accordion popup)
// with minimal React/antd stubs: builds a plain element tree we can search,
// no DOM needed. useState is driven per render via `hooks`.
const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children: children.flat() }),
};
let hooks = null;
const makeHooks = (overrides = []) => {
  const sets = [];
  let i = 0;
  return {
    sets,
    useState: (init) => {
      const idx = i++;
      const value = overrides[idx] !== undefined ? overrides[idx] : typeof init === "function" ? init() : init;
      return [value, (next) => sets.push([idx, next])];
    },
  };
};
const C = { sub: "#888", text: "#111", border: "#ddd", bgSoft: "#fafafa", primary: "#1677ff" };
const file = path.resolve(__dirname, "../../All Module/Contract/ContractCreateForm.js");
const { isTriggerSelectable } = extractMarkedBlock(
  file,
  "// ---- payment-trigger helpers (pure; tested by scripts/tests/payment-trigger-helpers.test.js) ----",
  "// ---- end payment-trigger helpers ----",
  ["isTriggerSelectable"],
);
const { PaymentTriggersSection } = extractMarkedBlock(
  file,
  "// ---- payment-triggers section (tested by scripts/tests/payment-triggers-section.test.js) ----",
  "// ---- end payment-triggers section ----",
  ["PaymentTriggersSection"],
  {
    React,
    C,
    FONT: "inherit",
    Spin: null,
    AntButton: null,
    Modal: "Modal",
    isTriggerSelectable,
    useState: (init) => hooks.useState(init),
  },
);

const texts = (node) =>
  node == null || node === false
    ? []
    : typeof node === "string" || typeof node === "number"
      ? [String(node)]
      : (node.children || []).flatMap(texts);
const find = (node, pred, out = []) => {
  if (!node || typeof node !== "object") return out;
  if (pred(node)) out.push(node);
  (node.children || []).forEach((child) => find(child, pred, out));
  return out;
};
const textOf = (node) => texts(node).join(" ");

const lines = [
  { key: "11", name: "Company setup" },
  { key: "12", name: "Trademark" },
  { key: "manual-a", name: "Custom advice" },
];
const tasksByLine = {
  "11": [
    { id: "101", title: "Draft", status: "done" },
    { id: "102", title: "File", status: "cancelled" },
  ],
  "12": [{ id: "201", title: "Search", status: "toDo" }],
  "manual-a": [],
};
const selection = { "11": ["101"], "12": [] };
const toggles = [];
const baseProps = {
  sourceLabel: "Tasks of case CASE-01",
  loading: false,
  error: "",
  lines,
  tasksByLine,
  selection,
  onToggle: (...args) => toggles.push(args),
};
const render = (props = {}, overrides = []) => {
  hooks = makeHooks(overrides);
  return PaymentTriggersSection({ ...baseProps, ...props });
};
const modalOf = (tree) => find(tree, (n) => n.type === "Modal")[0];

// ---- closed: inline summary only ----
{
  const tree = render();
  const modal = modalOf(tree);
  assert.ok(modal, "modal element present");
  assert.equal(modal.props.open, false, "popup closed by default");
  const summary = textOf({ children: tree.children.filter((c) => c !== modal) });
  assert.ok(summary.includes("1/2 services have a payment trigger"), "summary count");
  assert.ok(summary.includes("1 without trigger"), "warning count");
  assert.ok(summary.includes("1 with no tasks yet"), "no-task count");
  assert.equal(find({ children: tree.children.filter((c) => c !== modal) }, (n) => n.type === "input").length, 0, "no checkboxes inline");
  const configure = find(tree, (n) => n.type === "button" && textOf(n).includes("Configure"))[0];
  assert.ok(configure, "Configure button");
  configure.props.onClick();
  assert.deepEqual(hooks.sets, [[0, true]], "Configure opens the popup");
}

// ---- open, default expansion = first service without a trigger ----
{
  const tree = render({}, [true]);
  const modal = modalOf(tree);
  assert.equal(modal.props.open, true);
  const body = textOf(modal);
  assert.ok(body.includes("Tasks of case CASE-01"), "source label in popup");
  ["Company setup", "Trademark", "Custom advice"].forEach((name) => assert.ok(body.includes(name), name));
  assert.ok(body.includes("1/2") && body.includes("0/1") && body.includes("No tasks"), "per-service counters");
  const inputs = find(modal, (n) => n.type === "input");
  assert.equal(inputs.length, 1, "only the expanded service's tasks");
  assert.ok(body.includes("Search"));
  assert.ok(body.includes("will not create a Payment Request automatically"), "warning for expanded unticked service");
  inputs[0].props.onChange({ target: { checked: true } });
  assert.deepEqual(toggles.pop(), ["12", "201", true]);
}

// ---- open with an explicit expanded service; header click switches/collapses ----
{
  const tree = render({}, [true, "11"]);
  const modal = modalOf(tree);
  const inputs = find(modal, (n) => n.type === "input");
  assert.deepEqual(
    inputs.map((i) => [i.props.checked, !!i.props.disabled]),
    [[true, false], [false, true]],
    "cancelled unticked task disabled",
  );
  const headers = find(modal, (n) => n.type === "button" && n.props["data-trigger-line"]);
  assert.equal(headers.length, 3, "one header per service");
  headers.find((hd) => hd.props["data-trigger-line"] === "12").props.onClick();
  headers.find((hd) => hd.props["data-trigger-line"] === "11").props.onClick();
  assert.deepEqual(hooks.sets, [[1, "12"], [1, "__none__"]], "switch then collapse");
  const footerDone = find(modal.props.footer, (n) => n.type === "button" && textOf(n).includes("Done"))[0];
  assert.ok(footerDone, "Done button in footer");
  footerDone.props.onClick();
  assert.deepEqual(hooks.sets.pop(), [0, false], "Done closes");
}

// ---- collapsed all ----
{
  const modal = modalOf(render({}, [true, "__none__"]));
  assert.equal(find(modal, (n) => n.type === "input").length, 0);
}

// ---- empty-service expanded shows its note ----
{
  const modal = modalOf(render({}, [true, "manual-a"]));
  assert.ok(textOf(modal).includes("No tasks yet"));
}

// ---- loading / error / empty states (inline) ----
assert.ok(textOf(render({ loading: true })).includes("Loading tasks"));
{
  const tree = render({ error: "Could not load tasks" });
  assert.ok(textOf(tree).includes("Could not load tasks"));
  assert.equal(find(tree, (n) => n.type === "button" && textOf(n).includes("Configure")).length, 0, "no Configure on error");
}
assert.ok(textOf(render({ lines: [], tasksByLine: {} })).includes("Add services above"));
{
  const tree = render({ selection: { "11": ["101"], "12": ["201"] } });
  const summary = textOf({ children: tree.children.filter((c) => c !== modalOf(tree)) });
  assert.ok(summary.includes("2/2 services have a payment trigger") && !summary.includes("without trigger"));
}

// ---- installment mode (By Case): items with service groups + cross-item locks ----
{
  const items = [
    {
      key: "pay-1",
      name: "Installment 1 — 30%",
      groups: [{ label: "Company setup", tasks: tasksByLine["11"] }],
    },
    {
      key: "pay-2",
      name: "Installment 2 — 70%",
      groups: [
        { label: "Company setup", tasks: tasksByLine["11"] },
        { label: "Trademark", tasks: tasksByLine["12"] },
      ],
    },
    { key: "pay-3", name: "Final", groups: [] },
  ];
  const instSelection = { "pay-1": ["101"], "pay-2": [] };
  const lockedBy = (itemKey, taskId) =>
    taskId === "101" && itemKey !== "pay-1" ? "Installment 1 — 30%" : null;
  const props = {
    noun: "installment",
    helpText: "An installment is activated when ALL its ticked tasks are Done.",
    items,
    selection: instSelection,
    lockedBy,
  };

  // closed: installment wording in the summary
  const closed = render(props);
  const closedSummary = textOf({ children: closed.children.filter((c) => c !== modalOf(closed)) });
  assert.ok(closedSummary.includes("1/2 installments have trigger tasks"), closedSummary);
  assert.ok(closedSummary.includes("1 without trigger"));
  assert.ok(closedSummary.includes("1 with no tasks yet"));

  // open on pay-2: grouped by service, 101 locked (linked to installment 1)
  const modal = modalOf(render(props, [true, "pay-2"]));
  const body = textOf(modal);
  assert.ok(body.includes("An installment is activated when ALL its ticked tasks are Done."));
  assert.ok(body.includes("Company setup") && body.includes("Trademark"), "service group headers");
  assert.ok(body.includes("Linked to Installment 1"), "lock note");
  assert.ok(body.includes("This installment will not be activated automatically."));
  const inputs = find(modal, (n) => n.type === "input");
  assert.deepEqual(
    inputs.map((i) => [i.props.checked, !!i.props.disabled]),
    [[false, true], [false, true], [false, false]],
    "101 locked by installment 1; 102 disabled (cancelled in this fixture); 201 free",
  );
  inputs[2].props.onChange({ target: { checked: true } });
  assert.deepEqual(toggles.pop(), ["pay-2", "201", true]);

  // the owning installment can still untick its own task
  const own = find(modalOf(render(props, [true, "pay-1"])), (n) => n.type === "input");
  assert.deepEqual(own.map((i) => [i.props.checked, !!i.props.disabled]), [[true, false], [false, true]]);

  // empty state for installments
  assert.ok(textOf(render({ ...props, items: [] })).includes("Add installments above"));
}

// ---- service mode with locked Payment Request amounts (By Service + Combo pricing) ----
{
  const amountChanges = [];
  let autoDistributed = 0;
  const amountProps = {
    amounts: { "11": 12000000, "12": 4200000, "manual-a": 0 },
    amountEditable: true,
    onAmountChange: (key, value) => amountChanges.push([key, value]),
    allocation: { sum: 16200000, pool: 16200000, diff: 0, ok: true },
    onAutoDistribute: () => {
      autoDistributed += 1;
    },
    amountWarnings: { "manual-a": "noReference" },
    formatAmount: (n) => `${n} VND`,
  };

  // summary: allocation status visible without opening the popup
  const closed = render(amountProps);
  const summary = textOf({ children: closed.children.filter((c) => c !== modalOf(closed)) });
  assert.ok(summary.includes("Allocated 16200000 VND / 16200000 VND"), summary);

  // popup: header shows each amount; expanded item has an editable amount input
  const modal = modalOf(render(amountProps, [true, "12"]));
  const body = textOf(modal);
  assert.ok(body.includes("4200000 VND"), "amount in the item header");
  const amountInput = find(modal, (n) => n.type === "input" && n.props["data-amount-for"] === "12")[0];
  assert.ok(amountInput, "editable amount input for the expanded service");
  assert.equal(String(amountInput.props.value), "4200000");
  amountInput.props.onChange({ target: { value: "4.300.000" } });
  assert.deepEqual(amountChanges.pop(), ["12", "4300000"], "digits only");
  const auto = find(modal, (n) => n.type === "button" && textOf(n).includes("Auto-distribute"))[0];
  auto.props.onClick();
  assert.equal(autoDistributed, 1);

  // warning for a line without a price reference
  const noRef = textOf(modalOf(render(amountProps, [true, "manual-a"])));
  assert.ok(noRef.includes("No price reference"), noRef);
  // Review fix 4: notInCase / zero have their own texts
  const notInCase = textOf(
    modalOf(render({ ...amountProps, amountWarnings: { "12": "notInCase" } }, [true, "12"])),
  );
  assert.ok(notInCase.includes("Not in the Case"), notInCase);
  assert.ok(!notInCase.includes("Unusually small"));
  const zero = textOf(modalOf(render({ ...amountProps, amountWarnings: { "12": "zero" } }, [true, "12"])));
  assert.ok(zero.includes("no Payment Request will be created"), zero);

  // mismatch shown in red text
  const off = render({ ...amountProps, allocation: { sum: 16000000, pool: 16200000, diff: -200000, ok: false } });
  assert.ok(textOf(off).includes("off by -200000 VND"));

  // Review fix 5: the input shows the raw typed value (so it can be cleared), not the fallback
  const cleared = modalOf(render({ ...amountProps, rawAmounts: { "12": "" } }, [true, "12"]));
  const clearedInput = find(cleared, (n) => n.type === "input" && n.props["data-amount-for"] === "12")[0];
  assert.equal(clearedInput.props.value, "");

  // Review fix 8: allocation + Configure stay available when tasks failed to load
  const failed = render({ ...amountProps, error: "Could not load tasks" });
  assert.ok(textOf(failed).includes("Allocated 16200000 VND"), "allocation visible on task-load error");
  assert.ok(find(failed, (n) => n.type === "button" && textOf(n).includes("Configure")).length === 1);

  // Review fix 4: read-only amounts use per-line preformatted texts (line currency)
  const roTexts = modalOf(
    render(
      { ...amountProps, amountEditable: false, allocation: null, onAutoDistribute: null, amountTexts: { "12": "100 USD" } },
      [true, "12"],
    ),
  );
  assert.ok(textOf(roTexts).includes("100 USD"));

  // read-only amounts (Line pricing): no amount input, amount still shown
  const ro = modalOf(render({ ...amountProps, amountEditable: false, allocation: null, onAutoDistribute: null }, [true, "12"]));
  assert.equal(find(ro, (n) => n.type === "input" && n.props["data-amount-for"]).length, 0);
  assert.ok(textOf(ro).includes("4200000 VND"));
}

console.log("payment-triggers-section: all tests passed");
