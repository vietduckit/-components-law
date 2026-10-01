# By Service Payment Trigger Configuration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a lawyer pick, per service, which tasks trigger that service's Payment Request directly in the Contract create form for By Service contracts — on real tasks when a Case exists, on sample tasks (persisted and later pre-ticked in Case creation) when it doesn't.

**Architecture:** Pure helper functions (grouping, selection merge, diff, warning list) live in a marked block inside `ContractCreateForm.js` so a Node test can extract and exercise them. A new `PaymentTriggersSection` component renders in the Payment Schedule slot for By Service. Submit writes `tasks.isPaymentTrigger` (Case exists) before linking the contract to the Case, or `contractServices.paymentTriggerTemplateIds` (no Case), which `CaseCreateForm.js` reads to seed Sample Tasks.

**Tech Stack:** NocoBase JS Blocks (React via `ctx.React`, antd via `ctx.antd`, `ctx.api.request`), plain Node (`node:assert`) for helper tests, `@babel/parser` (already in `package.json`) for syntax checks.

**Spec:** `docs/superpowers/specs/2026-09-24-by-service-payment-trigger-config-design.md`

## Global Constraints

- JS Blocks are single files pasted into NocoBase — no imports/exports, no shared modules; everything a block needs lives in that block.
- Code, identifiers and UI copy in English (the Contract/Task UI is English); do not introduce Vietnamese UI strings.
- New field: `contractServices.paymentTriggerTemplateIds`, `type: "json"`, `interface: "json"`, `defaultValue: null`, stores `projectTemplates.id` values as strings.
- (A) `tasks:update` for triggers MUST run before the existing `projects:update { contractId }` call.
- An empty `paymentTriggerTemplateIds` array means "explicitly no triggers" and overrides the catalog default; `null`/absent means "use catalog default".
- Zero-trigger services produce a confirm dialog, never a `validate()` error.
- By Case (installment schedule with required service tags) and Retainer behavior must not change.
- Responsive from the first version: no horizontal scroll at phone width.
- Do NOT `git commit` or `git push` unless the user explicitly asks (public repo; see memory "Không push khi chưa check secret").
- Do NOT run inline `node -e` with non-ASCII text — write scripts to files (memory "Unicode escape corruption via inline node -e").

## Review Focus

1. **Case switched after ticking** — lawyer ticks tasks with Case X selected, then switches to Case Y (or clears it): selection must reset to Y's (or template) defaults, never carry X's task ids into Y's submit. → pinned by `mergeTriggerSelection` reset test (Task 2) + scope-key reset in Task 3.
2. **Same catalog service on two lines** (e.g. a catalog line and a manual row both with `serviceId` 7, no Case) — each line gets its own independent selection; ticking one doesn't tick the other. → test in Task 2 (`groupTriggerTasks` template source, duplicate serviceId).
3. **Task already Done when ticked (Case exists)** — expected: Payment Request created right after contract creation via the `projects.contractId` catch-up trigger. → guaranteed by ordering in Task 4; manual test 2.
4. **Services list edited after ticking** (a service added/removed) — ticks on surviving lines stay; new lines get defaults; removed lines drop out of the submit and the warning. → `mergeTriggerSelection` keep/drop test (Task 2).
5. **Old contract (no field) used to create a Case** — Sample Tasks show the catalog default exactly as before. → `applyContractTriggerSelection` null test (Task 5).

---

## File Structure

| File | Responsibility |
|---|---|
| `JsField/RegisterContractServicesPaymentTriggerField.js` (create) | One-time, idempotent field registration for `contractServices.paymentTriggerTemplateIds` |
| `All Module/Contract/ContractCreateForm.js` (modify) | Pure trigger helpers; `PaymentTriggersSection`; loading state/effect; submit wiring |
| `All Module/Case/CaseCreateForm.js` (modify) | `applyContractTriggerSelection` + call in `mapContractServicesToRows` |
| `scripts/tests/extract-marked-block.js` (create) | Test utility: pulls a marker-delimited block out of a JS Block file and evaluates it |
| `scripts/tests/payment-trigger-helpers.test.js` (create) | Node tests for the ContractCreateForm helpers |
| `scripts/tests/case-trigger-seed.test.js` (create) | Node test for `applyContractTriggerSelection` |
| `scripts/tests/parse-blocks.js` (create) | Babel syntax check of the touched blocks (wrapped in an async function, as NocoBase runs them) |

---

### Task 1: Field registration script + test/parse utilities

**Files:**
- Create: `JsField/RegisterContractServicesPaymentTriggerField.js`
- Create: `scripts/tests/extract-marked-block.js`
- Create: `scripts/tests/parse-blocks.js`

**Interfaces:**
- Produces: `extractMarkedBlock(filePath, startMarker, endMarker, exportNames: string[]) => object` — evaluates the block's source and returns `{ [name]: value }`.
- Produces: `node scripts/tests/parse-blocks.js` — prints `ok <file>` / `ERR <file> <message>` per block, exits 1 on any error.

- [ ] **Step 1: Write the field registration script**

```js
// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Registers contractServices.paymentTriggerTemplateIds (JSON array of
// projectTemplates.id strings) — the sample tasks a lawyer ticked as
// payment triggers in ContractCreateForm.js for a By Service contract
// created before its Case exists. CaseCreateForm.js reads it to pre-tick
// Sample Tasks when a Case is created from that contract. See
// docs/superpowers/specs/2026-09-24-by-service-payment-trigger-config-design.md.
//
// Unlike RegisterContractPaymentStatusFields.js, no pre-existing column:
// fields:create adds the Postgres column itself.
//
// How to run: paste into a temporary Nocobase Action block's onClick, or
// the browser dev console on any admin page (ctx in scope). Idempotent —
// skips if the field already exists. Run BEFORE deploying the updated
// ContractCreateForm.js / CaseCreateForm.js.
// ============================================================
const paymentTriggerTemplateIdsFieldPayload = () => ({
  name: "paymentTriggerTemplateIds",
  type: "json",
  interface: "json",
  uiSchema: {
    type: "object",
    "x-component": "Input.JSON",
    "x-component-props": { autoSize: { minRows: 2 } },
    title: "Payment Trigger Template IDs",
  },
  defaultValue: null,
});

const registerField = async (collectionName, fieldPayload) => {
  const fieldName = fieldPayload.name;
  const existing = await ctx.api.request({
    url: `collections/${collectionName}/fields:list`,
    params: { paginate: false },
  });
  const already = (existing?.data?.data || []).some(
    (f) => f.name === fieldName,
  );
  if (already) {
    console.log(`[skip] ${collectionName}.${fieldName} already registered`);
    return;
  }
  await ctx.api.request({
    url: `collections/${collectionName}/fields:create`,
    method: "POST",
    data: fieldPayload,
  });
  console.log(`[created] ${collectionName}.${fieldName}`);
};

await registerField("contractServices", paymentTriggerTemplateIdsFieldPayload());
console.log("Done.");
```

- [ ] **Step 2: Write the extraction utility**

`scripts/tests/extract-marked-block.js`:

```js
const fs = require("fs");

// Pulls the source between two marker comments out of a NocoBase JS Block
// file and evaluates it in isolation, returning the named bindings. Lets
// pure helpers that must physically live inside a single-file block still
// be unit-tested from Node.
function extractMarkedBlock(filePath, startMarker, endMarker, exportNames) {
  const src = fs.readFileSync(filePath, "utf8");
  const a = src.indexOf(startMarker);
  const b = src.indexOf(endMarker);
  if (a < 0 || b < 0 || b < a) {
    throw new Error(`Markers not found in ${filePath}: ${startMarker} / ${endMarker}`);
  }
  const body = src.slice(a + startMarker.length, b);
  const factory = new Function(`${body}\nreturn { ${exportNames.join(", ")} };`);
  return factory();
}

module.exports = { extractMarkedBlock };
```

- [ ] **Step 3: Write the parse checker**

`scripts/tests/parse-blocks.js`:

```js
const fs = require("fs");
const path = require("path");
const { parse } = require("@babel/parser");

const root = path.resolve(__dirname, "../..");
const files = [
  "All Module/Contract/ContractCreateForm.js",
  "All Module/Case/CaseCreateForm.js",
  "JsField/RegisterContractServicesPaymentTriggerField.js",
];

let failed = false;
for (const rel of files) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  try {
    parse(`async function __block(){\n${src}\n}`, {
      sourceType: "script",
      plugins: ["jsx"],
      allowReturnOutsideFunction: true,
    });
    console.log(`ok ${rel}`);
  } catch (error) {
    failed = true;
    console.log(`ERR ${rel} ${error.message}`);
  }
}
process.exit(failed ? 1 : 0);
```

- [ ] **Step 4: Run the parse checker**

Run: `node scripts/tests/parse-blocks.js`
Expected: three `ok` lines, exit 0.

---

### Task 2: Pure trigger helpers in ContractCreateForm (TDD)

**Files:**
- Modify: `All Module/Contract/ContractCreateForm.js` — insert helper block right after `newPaymentScheduleRow` (search `const newPaymentScheduleRow = (index = 1) => ({`; insert after its closing `});`)
- Test: `scripts/tests/payment-trigger-helpers.test.js`

**Interfaces:**
- Consumes: `extractMarkedBlock` (Task 1).
- Produces (all in ContractCreateForm outer scope):
  - `TriggerLine = { key: string, name: string, serviceId: string|null, projectServiceId: string|null }`
  - `TriggerTask = { id: string, title: string, status: string, isPaymentTrigger: boolean }`
  - `groupTriggerTasks(source: "case"|"template", lines: TriggerLine[], records: object[]) => { [key]: TriggerTask[] }`
  - `mergeTriggerSelection(prev: {[key]: string[]}, tasksByLine) => {[key]: string[]}`
  - `diffTaskTriggers(tasksByLine, selection) => { id: string, isPaymentTrigger: boolean }[]`
  - `linesWithoutTrigger(lines, tasksByLine, selection) => string[]` (service names)
  - `triggerTemplateIdsFor(tasksByLine, selection, key) => string[] | null` (null = line has no template tasks → don't write the field)

- [ ] **Step 1: Write the failing test**

`scripts/tests/payment-trigger-helpers.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/tests/payment-trigger-helpers.test.js`
Expected: FAIL — `Markers not found in ...ContractCreateForm.js`.

- [ ] **Step 3: Insert the helper block**

Insert after `newPaymentScheduleRow`'s closing `});` (match the surrounding 6-space indentation):

```js
      // ---- payment-trigger helpers (pure; tested by scripts/tests/payment-trigger-helpers.test.js) ----
      // By Service "Payment Triggers" block — see
      // docs/superpowers/specs/2026-09-24-by-service-payment-trigger-config-design.md.
      // Kept dependency-free (own id normalizer) so the Node test can
      // extract and run this block in isolation.
      const triggerId = (value) => {
        const raw = value && typeof value === "object" ? value.id : value;
        return raw === null || raw === undefined || raw === "" ? null : String(raw);
      };

      // source "case": records are tasks, matched to a line by projectServiceId.
      // source "template": records are projectTemplates, matched by serviceId —
      // each line gets its own array even when 2 lines share a serviceId.
      const groupTriggerTasks = (source, lines, records) => {
        const isCase = source === "case";
        const toTask = (record) => ({
          id: triggerId(record.id),
          title: String((isCase ? record.title : record.templateName) || "Untitled task"),
          status: isCase ? String(record.status || "") : "",
          isPaymentTrigger: !!record.isPaymentTrigger,
          _order: Number(isCase ? record.taskIndex : record.sortOrder) || 0,
        });
        const result = {};
        (lines || []).forEach((line) => {
          const matchId = isCase ? line.projectServiceId : line.serviceId;
          result[line.key] = matchId
            ? (records || [])
                .filter((record) =>
                  triggerId(isCase ? record.projectServiceId : record.serviceId) === String(matchId),
                )
                .map(toTask)
                .sort((a, b) => a._order - b._order)
                .map(({ _order, ...task }) => task)
            : [];
        });
        return result;
      };

      // Surviving lines keep the lawyer's ticks (minus ids no longer offered);
      // new lines start from each task's current isPaymentTrigger. Lines no
      // longer present are dropped. Pass prev = {} to reset.
      const mergeTriggerSelection = (prev, tasksByLine) => {
        const next = {};
        Object.keys(tasksByLine || {}).forEach((key) => {
          const tasks = tasksByLine[key] || [];
          const offered = new Set(tasks.map((task) => task.id));
          next[key] = Array.isArray(prev?.[key])
            ? prev[key].filter((id) => offered.has(id))
            : tasks.filter((task) => task.isPaymentTrigger).map((task) => task.id);
        });
        return next;
      };

      // Case source only — tasks whose ticked state differs from their
      // loaded isPaymentTrigger.
      const diffTaskTriggers = (tasksByLine, selection) => {
        const changes = [];
        Object.keys(tasksByLine || {}).forEach((key) => {
          const ticked = new Set(selection?.[key] || []);
          (tasksByLine[key] || []).forEach((task) => {
            const next = ticked.has(task.id);
            if (next !== !!task.isPaymentTrigger) changes.push({ id: task.id, isPaymentTrigger: next });
          });
        });
        return changes;
      };

      // Names of services that offer tasks but have none ticked — those will
      // never auto-create a Payment Request. Lines with no tasks at all are
      // excluded (nothing the lawyer could have ticked).
      const linesWithoutTrigger = (lines, tasksByLine, selection) =>
        (lines || [])
          .filter((line) => (tasksByLine?.[line.key] || []).length && !(selection?.[line.key] || []).length)
          .map((line) => line.name);

      // Template source only — value for contractServices.paymentTriggerTemplateIds.
      // null = line has no template tasks (leave the field unset); [] = explicitly none.
      const triggerTemplateIdsFor = (tasksByLine, selection, key) =>
        (tasksByLine?.[key] || []).length ? [...(selection?.[key] || [])] : null;
      // ---- end payment-trigger helpers ----
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/tests/payment-trigger-helpers.test.js`
Expected: `payment-trigger-helpers: all tests passed`

- [ ] **Step 5: Parse check**

Run: `node scripts/tests/parse-blocks.js`
Expected: three `ok` lines.

---

### Task 3: Loading state, effect and `PaymentTriggersSection` UI

**Files:**
- Modify: `All Module/Contract/ContractCreateForm.js`
  - add component after `PaymentScheduleSection` (search `const PaymentScheduleSection = ({`; add after that component's closing `};`)
  - add state after `const [manualServiceRows, setManualServiceRows] = useState([]);`
  - add `isByService` after `const isByCase = form.contractType === "byCase";`
  - add memos/effect after the `selectedContractServiceLines` useMemo
  - render next to `showPaymentSchedule && React.createElement(PaymentScheduleSection, ...)`

**Interfaces:**
- Consumes: Task 2 helpers; existing `lineKey`, `extractId`, `getConfiguredProjectId`, `projects`, `selectedContractServiceLines`, `manualServiceRows`, `C`, `FONT`, `Checkbox`, `Spin`.
- Produces (component scope, used by Task 4): `isByService: boolean`, `triggerLines: TriggerLine[]`, `triggerProjectId: number|null`, `triggerSource: "case"|"template"|null`, `triggerTasksByLine`, `triggerSelection`.

- [ ] **Step 1: Add the component** (after `PaymentScheduleSection`)

```js
      // By Service only — rendered in the slot PaymentScheduleSection uses for
      // By Case (right after "Commercial Terms"), same light sub-heading
      // convention instead of its own Section. See
      // docs/superpowers/specs/2026-09-24-by-service-payment-trigger-config-design.md §3.
      const TASK_STATUS_BADGES = {
        toDo: { label: "To do", color: "#595959", bg: "#f5f5f5" },
        inProgress: { label: "In progress", color: "#0958d9", bg: "#e6f4ff" },
        blocked: { label: "Blocked", color: "#cf1322", bg: "#fff1f0" },
        pending: { label: "Pending", color: "#d46b08", bg: "#fff7e6" },
        approval: { label: "Approval", color: "#531dab", bg: "#f9f0ff" },
        done: { label: "Done", color: "#389e0d", bg: "#f6ffed" },
        cancelled: { label: "Cancelled", color: "#8c8c8c", bg: "#fafafa" },
      };

      const PaymentTriggersSection = ({
        source,
        caseName,
        loading,
        error,
        lines,
        tasksByLine,
        selection,
        onToggle,
      }) => {
        const noteStyle = (tone) => ({
          marginTop: 8,
          padding: "6px 10px",
          borderRadius: 6,
          fontSize: 12.5,
          ...(tone === "warn"
            ? { color: "#ad6800", background: "#fffbe6", border: "1px solid #ffe58f" }
            : { color: C.sub, background: C.bgSoft, border: `1px dashed ${C.border}` }),
        });
        return React.createElement(
          "div",
          { style: { marginTop: 24 } },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 13,
                fontWeight: 700,
                color: C.sub,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                marginBottom: 4,
              },
            },
            "Payment Triggers",
          ),
          React.createElement(
            "div",
            { style: { fontSize: 12.5, color: C.sub, marginBottom: 10, lineHeight: 1.5 } },
            source === "case"
              ? `Tasks of case ${caseName || ""}`.trim()
              : "Sample tasks — applied when a Case is created from this contract",
            ". A service's Payment Request is created once ALL its ticked tasks are Done.",
          ),
          loading &&
            React.createElement(
              "div",
              { style: { padding: 16, textAlign: "center" } },
              Spin ? React.createElement(Spin, { size: "small" }) : "Loading tasks...",
            ),
          !loading && error && React.createElement("div", { style: noteStyle("warn") }, error),
          !loading &&
            !error &&
            !(lines || []).length &&
            React.createElement("div", { style: noteStyle("muted") }, "Add services above to configure payment triggers."),
          !loading &&
            !error &&
            (lines || []).map((line) => {
              const tasks = tasksByLine?.[line.key] || [];
              const ticked = new Set(selection?.[line.key] || []);
              return React.createElement(
                "div",
                {
                  key: line.key,
                  style: {
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    background: "#fff",
                    padding: "12px 14px",
                    marginBottom: 10,
                    minWidth: 0,
                  },
                },
                React.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 8,
                      flexWrap: "wrap",
                      marginBottom: tasks.length ? 8 : 0,
                    },
                  },
                  React.createElement(
                    "span",
                    { style: { fontSize: 14, fontWeight: 700, color: C.text, overflowWrap: "anywhere" } },
                    line.name,
                  ),
                  tasks.length > 0 &&
                    React.createElement(
                      "span",
                      { style: { fontSize: 12.5, color: ticked.size ? C.sub : "#ad6800", whiteSpace: "nowrap" } },
                      `${ticked.size}/${tasks.length} trigger task${tasks.length === 1 ? "" : "s"}`,
                    ),
                ),
                tasks.map((task) => {
                  const badge = TASK_STATUS_BADGES[task.status];
                  return React.createElement(
                    "label",
                    {
                      key: task.id,
                      style: {
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        padding: "5px 0",
                        cursor: "pointer",
                        minWidth: 0,
                      },
                    },
                    React.createElement("input", {
                      type: "checkbox",
                      checked: ticked.has(task.id),
                      onChange: (e) => onToggle(line.key, task.id, e.target.checked),
                      style: { marginTop: 3, flex: "0 0 auto" },
                    }),
                    React.createElement(
                      "span",
                      { style: { flex: "1 1 auto", minWidth: 0, fontSize: 13, color: C.text, overflowWrap: "anywhere" } },
                      task.title,
                    ),
                    badge &&
                      React.createElement(
                        "span",
                        {
                          style: {
                            flex: "0 0 auto",
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: badge.color,
                            background: badge.bg,
                            borderRadius: 4,
                            padding: "1px 6px",
                          },
                        },
                        badge.label,
                      ),
                  );
                }),
                !tasks.length &&
                  React.createElement(
                    "div",
                    { style: noteStyle("muted") },
                    "No tasks yet — configure the trigger later in the Case / Task.",
                  ),
                tasks.length > 0 &&
                  !ticked.size &&
                  React.createElement(
                    "div",
                    { style: noteStyle("warn") },
                    "This service will not create a Payment Request automatically.",
                  ),
              );
            }),
        );
      };
```

(Plain `<input type="checkbox">` inside a `<label>` rather than antd `Checkbox` keeps the whole row clickable and the markup simple; it matches the native fallbacks already used throughout this file.)

- [ ] **Step 2: Add state** (after `const [manualServiceRows, setManualServiceRows] = useState([]);`)

```js
        // By Service "Payment Triggers" — see the helper block near
        // newPaymentScheduleRow. triggerScopeRef remembers which task universe
        // (case id / template) the current selection belongs to, so switching
        // Case resets it instead of carrying stale task ids across.
        const [triggerSource, setTriggerSource] = useState(null);
        const [triggerTasksByLine, setTriggerTasksByLine] = useState({});
        const [triggerSelection, setTriggerSelection] = useState({});
        const [triggerLoading, setTriggerLoading] = useState(false);
        const [triggerError, setTriggerError] = useState("");
        const triggerScopeRef = useRef("");
```

- [ ] **Step 3: Add `isByService`** (right after `const isByCase = form.contractType === "byCase";`)

```js
        const isByService = form.contractType === "byService";
```

- [ ] **Step 4: Add memos + effect** — place them AFTER both the `selectedContractServiceLines` useMemo and the `isByService` line (whichever comes later in the file; `isByCase` is defined after `selectedContractServiceLines`, so put this block right after the new `isByService` line):

```js
        // One entry per service line the contract will create, in Services
        // table order — same identity convention as the payment schedule's
        // service tags: lineKey(line) for catalog lines, row.id for manual rows.
        const triggerLines = useMemo(
          () => [
            ...selectedContractServiceLines.map((line) => ({
              key: lineKey(line),
              name: line.serviceName || `Service #${lineKey(line)}`,
              serviceId: extractId(line.serviceId) ? String(extractId(line.serviceId)) : null,
              projectServiceId: extractId(line.projectServiceId)
                ? String(extractId(line.projectServiceId))
                : null,
            })),
            ...manualServiceRows
              .filter((row) => row.serviceName || row.serviceId)
              .map((row) => ({
                key: row.id,
                name: row.serviceName || "Custom service",
                serviceId: extractId(row.serviceId) ? String(extractId(row.serviceId)) : null,
                projectServiceId: null,
              })),
          ],
          [selectedContractServiceLines, manualServiceRows],
        );
        // Same resolution handleSubmit uses for projectId.
        const triggerProjectId =
          getConfiguredProjectId() || (form.projectId ? parseInt(form.projectId, 10) : null);
        const triggerLineSignature = triggerLines
          .map((line) => `${line.key}:${line.serviceId || ""}:${line.projectServiceId || ""}`)
          .join("|");
        const triggerCaseName = useMemo(() => {
          const project = projects.find(
            (item) => String(extractId(item?.id)) === String(triggerProjectId),
          );
          // Same label the "Case" select shows (projectOptions uses caseLabel).
          return project ? caseLabel(project) : "";
        }, [projects, triggerProjectId]);

        useEffect(() => {
          if (!isByService) {
            triggerScopeRef.current = "";
            setTriggerSource(null);
            setTriggerTasksByLine({});
            setTriggerSelection({});
            setTriggerError("");
            return undefined;
          }
          let cancelled = false;
          const source = triggerProjectId ? "case" : "template";
          const scope = `${source}:${triggerProjectId || ""}`;
          const load = async () => {
            setTriggerLoading(true);
            setTriggerError("");
            try {
              let records = [];
              if (source === "case") {
                const res = await ctx.api.request({
                  url: "tasks:list",
                  params: {
                    pageSize: 1000,
                    page: 1,
                    filter: JSON.stringify({ projectId: { $eq: triggerProjectId } }),
                    fields: ["id", "title", "status", "projectServiceId", "isPaymentTrigger", "taskIndex"],
                  },
                });
                records = res?.data?.data || [];
              } else {
                const serviceIds = [
                  ...new Set(triggerLines.map((line) => line.serviceId).filter(Boolean)),
                ].map((id) => parseInt(id, 10));
                if (serviceIds.length) {
                  const res = await ctx.api.request({
                    url: "projectTemplates:list",
                    params: {
                      pageSize: 1000,
                      page: 1,
                      filter: JSON.stringify({ serviceId: { $in: serviceIds } }),
                      fields: ["id", "serviceId", "templateName", "sortOrder", "isPaymentTrigger"],
                    },
                  });
                  records = res?.data?.data || [];
                }
              }
              if (cancelled) return;
              const tasksByLine = groupTriggerTasks(source, triggerLines, records);
              const scopeChanged = triggerScopeRef.current !== scope;
              triggerScopeRef.current = scope;
              setTriggerSource(source);
              setTriggerTasksByLine(tasksByLine);
              setTriggerSelection((prev) =>
                mergeTriggerSelection(scopeChanged ? {} : prev, tasksByLine),
              );
            } catch (error) {
              console.warn("[ContractCreateForm] Could not load payment trigger tasks:", error);
              if (!cancelled) {
                setTriggerError(
                  "Could not load tasks — you can set payment triggers later in Task detail.",
                );
              }
            } finally {
              if (!cancelled) setTriggerLoading(false);
            }
          };
          load();
          return () => {
            cancelled = true;
          };
          // triggerLines is captured via triggerLineSignature (its identity
          // changes on every services edit; the signature only when it matters).
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [isByService, triggerProjectId, triggerLineSignature]);

        const toggleTrigger = (key, taskId, checked) => {
          markDirty();
          setTriggerSelection((prev) => {
            const current = new Set(prev[key] || []);
            if (checked) current.add(taskId);
            else current.delete(taskId);
            return { ...prev, [key]: [...current] };
          });
        };
```

- [ ] **Step 5: Render the block** — directly after the `showPaymentSchedule && React.createElement(PaymentScheduleSection, {...}),` expression in the main render, add:

```js
                    isByService &&
                      React.createElement(PaymentTriggersSection, {
                        source: triggerSource,
                        caseName: triggerCaseName,
                        loading: triggerLoading,
                        error: triggerError,
                        lines: triggerLines,
                        tasksByLine: triggerTasksByLine,
                        selection: triggerSelection,
                        onToggle: toggleTrigger,
                      }),
```

- [ ] **Step 6: Verify**

Run: `node scripts/tests/parse-blocks.js && node scripts/tests/payment-trigger-helpers.test.js`
Expected: three `ok` lines, then `all tests passed`.
(`markDirty` is a `useCallback` defined early in the component at ~line 8109, so `toggleTrigger` can call it; `caseLabel` is an outer-scope helper already used by `projectOptions`.)

---

### Task 4: Submit wiring — confirm, (A) task updates, (B) template ids

**Files:**
- Modify: `All Module/Contract/ContractCreateForm.js` — `handleSubmit` (search `const handleSubmit = async () => {`)

**Interfaces:**
- Consumes: Task 2 helpers; Task 3 `isByService`, `triggerLines`, `triggerSource`, `triggerTasksByLine`, `triggerSelection`.

- [ ] **Step 1: Confirm dialog** — in `handleSubmit`, between the `validate()` early-return block and `setSavingState(true);`, insert:

```js
          // By Service: services that offer tasks but have none ticked will
          // never auto-create a Payment Request — warn, don't block (spec §7).
          if (isByService) {
            const missing = linesWithoutTrigger(triggerLines, triggerTasksByLine, triggerSelection);
            if (missing.length) {
              const content = `These services have no trigger task and will not create a Payment Request automatically: ${missing.join(", ")}. Create the contract anyway?`;
              const proceed = Modal?.confirm
                ? await new Promise((resolve) => {
                    Modal.confirm({
                      title: "Services without payment trigger",
                      content,
                      okText: "Create anyway",
                      cancelText: "Back to form",
                      maskClosable: false,
                      onOk: () => resolve(true),
                      onCancel: () => resolve(false),
                    });
                  })
                : window.confirm(content);
              if (!proceed) return;
            }
          }
```

- [ ] **Step 2: (B) catalog lines** — in the `for (const line of serviceLinesForSubmit)` loop, replace

```js
                const createdLine = await createContractServiceLine(
                  contractServicePayload,
                );
```

(the first occurrence, inside the catalog loop) with

```js
                const createdLine = await createContractServiceLine(
                  withTriggerTemplateIds(contractServicePayload, lineKey(line)),
                );
```

- [ ] **Step 3: (B) manual rows** — in the `for (const row of manualServiceRowsForSubmit)` loop, replace its `createContractServiceLine(contractServicePayload)` call the same way with `withTriggerTemplateIds(contractServicePayload, row.id)`.

- [ ] **Step 4: Define `withTriggerTemplateIds`** — at the top of the `try {` in `handleSubmit`, right after `const name = form.contractName.trim();`:

```js
            // Case-less By Service contract: remember which sample tasks were
            // ticked, so CaseCreateForm.js can pre-tick them when a Case is
            // created from this contract (spec §5 B). Only the create call gets
            // the field — contractServicePayload itself stays untouched for the
            // projectServices/quotationServices sync that reuses it.
            const withTriggerTemplateIds = (payload, key) => {
              if (!payload || !isByService || triggerSource !== "template") return payload;
              const ids = triggerTemplateIdsFor(triggerTasksByLine, triggerSelection, key);
              return ids ? { ...payload, paymentTriggerTemplateIds: ids } : payload;
            };
```

- [ ] **Step 5: (A) task updates before linking the Case** — immediately BEFORE the block `if (contractId && projectId && contractKind === "main") { await ctx.api.request({ url: "projects:update", ...`, insert:

```js
            // By Service with an existing Case: write the ticked triggers onto
            // the real tasks BEFORE projects:update links the contract — the
            // by_service_contract_linked_catches_up_done_tasks trigger fires on
            // that link and reads isPaymentTrigger at that moment, so a service
            // whose ticked tasks are already Done gets its Payment Request right
            // away (spec §5 A).
            if (contractId && isByService && triggerSource === "case") {
              const triggerChanges = diffTaskTriggers(triggerTasksByLine, triggerSelection);
              let failedTriggerWrites = 0;
              for (const change of triggerChanges) {
                try {
                  await ctx.api.request({
                    url: `tasks:update?filterByTk=${change.id}`,
                    method: "POST",
                    data: { isPaymentTrigger: change.isPaymentTrigger },
                  });
                } catch (triggerErr) {
                  failedTriggerWrites += 1;
                  console.warn(
                    "[ContractCreateForm] Could not save payment trigger on task:",
                    change.id,
                    triggerErr,
                  );
                }
              }
              if (failedTriggerWrites) {
                message.warning(
                  `Could not save payment trigger on ${failedTriggerWrites} task(s) — set it in Task detail.`,
                );
              }
            }
```

- [ ] **Step 6: Verify**

Run: `node scripts/tests/parse-blocks.js && node scripts/tests/payment-trigger-helpers.test.js`
Expected: three `ok`, `all tests passed`.
Then: `grep -n "withTriggerTemplateIds\|diffTaskTriggers(triggerTasksByLine\|linesWithoutTrigger(triggerLines" "All Module/Contract/ContractCreateForm.js"` — expect the definition + 2 call sites for `withTriggerTemplateIds`, 1 each for the others, and the `diffTaskTriggers` block line number smaller than the `url: "projects:update"` line.

---

### Task 5: CaseCreateForm seeds Sample Tasks from the contract (TDD)

**Files:**
- Modify: `All Module/Case/CaseCreateForm.js` — helper right before `function mapContractServicesToRows(`; call inside it after `row._templateTasks = getServiceTaskTemplates(taskTemplates, {...});`
- Test: `scripts/tests/case-trigger-seed.test.js`

**Interfaces:**
- Consumes: `extractMarkedBlock` (Task 1); `contractServices.paymentTriggerTemplateIds` written by Task 4.
- Produces: `applyContractTriggerSelection(templateTasks: object[], ids: unknown) => object[]`.

- [ ] **Step 1: Write the failing test**

`scripts/tests/case-trigger-seed.test.js`:

```js
const assert = require("node:assert/strict");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

const { applyContractTriggerSelection } = extractMarkedBlock(
  path.resolve(__dirname, "../../All Module/Case/CaseCreateForm.js"),
  "// ---- contract trigger seed (pure; tested by scripts/tests/case-trigger-seed.test.js) ----",
  "// ---- end contract trigger seed ----",
  ["applyContractTriggerSelection"],
);

const catalog = [
  { id: 4, templateName: "Draft", isPaymentTrigger: false },
  { id: 5, templateName: "Sign", isPaymentTrigger: true },
];

// ids present → overrides catalog default, new objects (catalog untouched)
{
  const out = applyContractTriggerSelection(catalog, ["4"]);
  assert.deepEqual(out.map((t) => t.isPaymentTrigger), [true, false]);
  assert.equal(catalog[0].isPaymentTrigger, false);
  assert.equal(catalog[1].isPaymentTrigger, true);
  assert.notEqual(out[0], catalog[0]);
}
// [] → explicitly none
assert.deepEqual(applyContractTriggerSelection(catalog, []).map((t) => t.isPaymentTrigger), [false, false]);
// null / undefined / non-array (old contracts) → same array back, unchanged (Review Focus 5)
assert.equal(applyContractTriggerSelection(catalog, null), catalog);
assert.equal(applyContractTriggerSelection(catalog, undefined), catalog);
assert.equal(applyContractTriggerSelection(catalog, "4"), catalog);
// numeric ids in storage still match
assert.deepEqual(applyContractTriggerSelection(catalog, [5]).map((t) => t.isPaymentTrigger), [false, true]);

console.log("case-trigger-seed: all tests passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/tests/case-trigger-seed.test.js`
Expected: FAIL — `Markers not found in ...CaseCreateForm.js`.

- [ ] **Step 3: Add the helper** — right above `function mapContractServicesToRows(` (top-level, no indentation):

```js
// ---- contract trigger seed (pure; tested by scripts/tests/case-trigger-seed.test.js) ----
// A By Service contract created before its Case stores the sample tasks the
// lawyer ticked as payment triggers in contractServices.paymentTriggerTemplateIds
// (ContractCreateForm.js). When present — including [] ("explicitly none") —
// it overrides the catalog default for this row's Sample Tasks; null/absent
// (older contracts, By Case, Retainer) keeps the catalog default. Returns new
// objects: syncCatalogServiceTasks diffs against the pristine catalog entries,
// so those must not be mutated. See
// docs/superpowers/specs/2026-09-24-by-service-payment-trigger-config-design.md §6.
function applyContractTriggerSelection(templateTasks, ids) {
  if (!Array.isArray(ids)) return templateTasks;
  const ticked = new Set(ids.map((id) => String(id)));
  return (templateTasks || []).map((task) => ({
    ...task,
    isPaymentTrigger: ticked.has(String(task?.id)),
  }));
}
// ---- end contract trigger seed ----

```

- [ ] **Step 4: Call it** — inside `mapContractServicesToRows`, directly after the existing statement

```js
    row._templateTasks = getServiceTaskTemplates(taskTemplates, {
      id: resolvedServiceId,
      serviceId: resolvedServiceId,
      serviceName: row.serviceName,
    });
```

add

```js
    row._templateTasks = applyContractTriggerSelection(
      row._templateTasks,
      s.paymentTriggerTemplateIds,
    );
```

- [ ] **Step 5: Run tests + parse**

Run: `node scripts/tests/case-trigger-seed.test.js && node scripts/tests/payment-trigger-helpers.test.js && node scripts/tests/parse-blocks.js`
Expected: both `all tests passed`, three `ok`.

- [ ] **Step 6: Confirm the column is fetched** — `fetchContractServices` passes `appends` but no `fields`, so own columns (incl. the new JSON one) are returned. Verify: `grep -n "fields" ` within `async function fetchContractServices` shows no `fields:` param. If one exists, add `"paymentTriggerTemplateIds"` to it.

---

### Task 6: Final verification + docs

**Files:**
- Modify: `docs/superpowers/specs/2026-09-24-by-service-payment-trigger-config-design.md` (Status line)

- [ ] **Step 1: Full automated pass**

Run: `node scripts/tests/payment-trigger-helpers.test.js && node scripts/tests/case-trigger-seed.test.js && node scripts/tests/parse-blocks.js`
Expected: all pass.

- [ ] **Step 2: Whitespace-insensitive diff review**

Run: `git diff -w --stat` and `git diff -w -- "All Module/Contract/ContractCreateForm.js" "All Module/Case/CaseCreateForm.js"`
Expected: only the additions from Tasks 2–5 (plus the earlier, already-approved section reorder in ContractCreateForm). No By Case / Retainer code touched.

- [ ] **Step 3: Update spec status** — change the `Status:` line to `Status: Implemented 2026-09-24 — pending manual verification on the instance (§9).`

- [ ] **Step 4: Hand off manual test** — report to the user: run `JsField/RegisterContractServicesPaymentTriggerField.js` first, paste the two updated blocks, then run spec §9 tests 1–6.
