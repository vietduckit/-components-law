# Create Invoice JS Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new NocoBase JS Block (`All Module/Invoice/InvoiceCreateBlock.js`) that creates `invoices` records from either a Payment Request or a set of already-recorded Payments, plus the one schema field this depends on.

**Architecture:** One new field (`invoices.paymentRequestId`, registered via a Nocobase `fields:create` script) plus one new self-contained JS Block file, structurally mirroring `All Module/Payment/PaymentCreateBlock.js`'s established shape: plain helper functions, a single `useState`-based form, a `Mode` switch, and a `buildInvoicePayload()`/`handleSubmit()` pair. No shared module — NocoBase JS Blocks are pasted whole into one Admin UI field each, so this file is self-contained even where it duplicates small helpers already in `PaymentCreateBlock.js`.

**Tech Stack:** Plain `React.createElement` (no JSX, no build step — the file is pasted directly into a NocoBase JS Block field), `ctx.antd` components, `ctx.api.request` for all data access. **No unit test framework exists for these files** (they run inside a live NocoBase browser session via `ctx`, which cannot be mocked cheaply). Verification in this plan uses `node --check <file>` as the syntax gate on every step (the same gate used for every JS Block change this session — see `docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md`), plus small standalone Node scripts under the scratchpad directory that copy out and exercise pure calculation functions (sum, vat calc) with plain `assert` calls, and a live-data diagnostic script (matching `JsField/Diagnose*.js` convention) for the one schema-dependent task. Real UI behavior is confirmed by the user pasting the finished file into NocoBase and reporting back — flag this explicitly at the end rather than claiming untested behavior works.

**Spec:** `docs/superpowers/specs/2026-09-23-create-invoice-js-block-design.md`

## Global Constraints

- New field mirrors the exact shape already proven in `JsField/RegisterPaymentRequestLinkFields.js` (belongsTo, `interface: "m2o"`, `x-component-props: { multiple: false }`) — do not invent a different shape.
- `invoiceNumber` is `type: sequence` — never included in any create payload.
- `accounting`/`accountingId` on `invoices` is excluded from the form entirely (confirmed with user, unknown purpose).
- `amountPaid`/`outStandingAmount` on `invoices` are left untouched at their schema defaults — never computed or set by this block.
- `totalAmount` is always manually editable regardless of which mode auto-filled it (same "manual entry always wins" rule as `ContractCreateForm.js` §6t and `PaymentCreateBlock.js`).
- Layout must follow both saved memory patterns: `FieldRow`/`InfoLine`-with-`minWidth` (content-sized flex, not equal-width CSS Grid) for read-only/auto-resolved field groups, and `repeat(auto-fit, minmax(Npx, 1fr))` CSS Grid reserved only for genuinely uniform KPI-style tiles if any are added.
- Every task ends with `node --check "All Module/Invoice/InvoiceCreateBlock.js"` (or the field-registration script) passing with no output.

## Review Focus

- **Contract with zero uninvoiced payments in "From Payment(s)" mode** — the picker table must show an empty state ("No uninvoiced payments for this contract"), not a silently empty table that looks broken.
- **Partial failure updating `payments.invoiceId` after the invoice is already created** (mode 2) — the user must see exactly which payments failed to link, not a generic error that hides whether the invoice itself was created.
- **`vat` left blank/zero** — `vatAmount` must compute to `0`, not `NaN` or throw, and `totalAmount` must still submit correctly with no VAT.
- **Re-selecting Mode after partially filling the form** — switching from "From Payment Request" to "From Payment(s)" (or back) must clear the other mode's selections (active request / selected payments) so a stale link can't be submitted silently, mirroring `PaymentCreateBlock.js`'s `handleModeChange` reset discipline.
- **Selecting a Payment Request whose contract has no `customerId`/`internalCompanyId` resolvable** (edge data) — the auto-resolve fields must show `"-"` and the form must still let the user proceed if those fields aren't strictly required, not crash on a `null` dereference.

---

## Task 1: Register `invoices.paymentRequestId`

**Files:**
- Create: `JsField/RegisterInvoicePaymentRequestField.js`
- Test: manual run in NocoBase (browser console / temp Action block) — no local automated test possible, this task's own script *is* the verification tool

**Interfaces:**
- Consumes: nothing from other tasks (first task, no dependencies)
- Produces: the `invoices.paymentRequestId` column and `invoices.paymentRequest` (belongsTo → `paymentRequests`) relation that Tasks 3 and 6 read/write via `ctx.api.request({ url: "invoices:create", data: { paymentRequestId: ... } })`

- [ ] **Step 1: Write the field-registration script**

```js
// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Registers invoices.paymentRequestId as a proper Nocobase belongsTo
// ("Many to one") field targeting `paymentRequests`, with foreign key
// column "paymentRequestId" — same pattern as
// JsField/RegisterPaymentRequestLinkFields.js (payments.paymentRequest/
// paymentRequestItem), itself modeled on the already-proven
// RegisterPaymentRequestAssignedLawyerField.js.
//
// Verified via JsField/DiagnoseInvoiceSchema.js (2026-09-23) that this
// field does NOT already exist on invoices — see
// docs/superpowers/specs/2026-09-23-create-invoice-js-block-design.md §2
// for why the pre-existing invoices.paymentRequestItems (hasMany,
// FK on paymentRequestItems) is deliberately NOT used instead: Retainer
// Payment Requests never get a paymentRequestItems row, so that path
// would silently exclude Retainer invoices.
//
// Nocobase's fields:create endpoint creates the underlying
// "paymentRequestId" column itself as part of registering the relation
// — no separate column-create step needed first.
//
// How to run: paste into a temporary Nocobase Action block's onClick,
// or into the browser dev console while on any admin page (ctx is in
// scope there via the Nocobase app).
// Idempotent — checks invoices for an existing field of the same name
// before creating, skips if already present.
// ============================================================

const paymentRequestFieldPayload = () => ({
  name: "paymentRequest",
  type: "belongsTo",
  interface: "m2o",
  target: "paymentRequests",
  foreignKey: "paymentRequestId",
  targetKey: "id",
  uiSchema: {
    type: "object",
    title: "Payment request",
    "x-component": "AssociationField",
    "x-component-props": { multiple: false },
  },
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

await registerField("invoices", paymentRequestFieldPayload());
console.log("Done.");
```

- [ ] **Step 2: Syntax-check**

Run: `node --check "JsField/RegisterInvoicePaymentRequestField.js"`
Expected: no output (exit code 0)

- [ ] **Step 3: Hand off to the user to run in NocoBase, then verify with a diagnostic**

This step cannot be automated — it requires a live NocoBase session. Ask the user to:
1. Paste the script into a temporary Action block's onClick (or browser console on any admin page) and run it.
2. Confirm the console printed `[created] invoices.paymentRequest` (or `[skip] ...` if already run before).
3. Re-run `JsField/DiagnoseInvoiceSchema.js` (already exists from the design phase) and confirm `paymentRequestId | type=bigInt` now appears in the "invoices — registered fields" list.

Do not proceed to Task 3 (which depends on this field existing) until the user confirms this.

- [ ] **Step 4: Commit**

```bash
git add "JsField/RegisterInvoicePaymentRequestField.js"
git commit -m "feat: add invoices.paymentRequestId field registration script"
```

---

## Task 2: Scaffold `InvoiceCreateBlock.js` — helpers, state, Mode switch shell

**Files:**
- Create: `All Module/Invoice/InvoiceCreateBlock.js`
- Test: `node --check "All Module/Invoice/InvoiceCreateBlock.js"`

**Interfaces:**
- Consumes: nothing (first code in the new file)
- Produces (for Tasks 3–6 to build on):
  - `extractId(value)`, `parseNum(value)`, `compact(items)`, `firstPresent(record, fields)`, `formatMoney(value)`, `nowDateTimeInput()` — plain helpers
  - `apiRequestAny(resources, action, options)`, `listAny(resources, params)`, `getAny(resources, id, params)`, `updateAny(resources, id, data)` — API helpers, same shape as `PaymentCreateBlock.js`'s
  - `INVOICE_RESOURCES = ["invoices"]`, `PAYMENT_REQUEST_RESOURCES = ["paymentRequests"]`, `PAYMENT_RESOURCES = ["payments"]`, `CONTRACT_RESOURCES = ["contracts"]`, `LAWYER_RESOURCES = ["lawyers"]`
  - `MODE = { paymentRequest: "paymentRequest", payments: "payments" }`
  - `contractLabel`, `companyLabel`, `lawyerLabel`, `customerLabel`, `relationRecord`, `resolveCustomerId`, `resolveCompanyId` — label/relation helpers Tasks 3–5 read `selectedContract`/`lawyers` rows through
  - `InvoiceCreateBlock` component with `form` state (fields listed below), `mode` state, `lawyers` state (populated in Task 7, empty array until then), and a `Select` "Mode" already wired to `handleModeChange`
  - `Section`/`FieldRow`/`InfoLine` — the layout helpers from `js_block_internal_admin_layout_pattern.md`, copied in (this file has no way to import them from `PaymentContractDetailBlock.js`)

- [ ] **Step 1: Write the file's top section — imports, constants, plain helpers**

```js
const { React } = ctx;
const { useState } = React;
const {
  Button,
  Card,
  Divider,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} = ctx.antd;

const INVOICE_RESOURCES = ["invoices"];
const PAYMENT_REQUEST_RESOURCES = ["paymentRequests"];
const PAYMENT_RESOURCES = ["payments"];
const CONTRACT_RESOURCES = ["contracts"];
const LAWYER_RESOURCES = ["lawyers"];

const MODE = { paymentRequest: "paymentRequest", payments: "payments" };

const MONEY_TOLERANCE = 0;

const extractId = (value) => {
  if (Array.isArray(value)) return extractId(value[0]);
  const raw = value && typeof value === "object" ? value.id || value._id : value;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const parseNum = (value) => {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const compact = (items) =>
  items
    .map((item) => (item === undefined || item === null ? "" : String(item).trim()))
    .filter(Boolean);

const firstPresent = (record, fields = []) => {
  for (const field of fields) {
    const value = record?.[field];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
};

const formatMoney = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  const n = parseNum(value);
  return `${Math.round(n).toLocaleString("vi-VN")} VND`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("vi-VN");
};

const toDateInput = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// "YYYY-MM-DDTHH:mm" — matches <input type="datetime-local">'s value format.
const nowDateTimeInput = () => {
  const date = new Date();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${toDateInput(date)}T${hh}:${min}`;
};

const unwrapRecord = (res) => res?.data?.data || res?.data || null;

const unwrapList = (res) => {
  const data = res?.data?.data ?? res?.data ?? [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const apiRequestAny = async (resources, action, options = {}) => {
  let lastError = null;
  for (const resource of resources) {
    try {
      return await ctx.api.request({ url: `${resource}:${action}`, ...options });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`No resource available for action ${action}`);
};

const listAny = async (resources, params = {}) => {
  const res = await apiRequestAny(resources, "list", { params });
  return unwrapList(res);
};

const getAny = async (resources, id, params = {}) => {
  if (!id) return null;
  const res = await apiRequestAny(resources, "get", { params: { filterByTk: id, ...params } });
  return unwrapRecord(res);
};

const updateAny = async (resources, id, data) => {
  const res = await apiRequestAny(resources, "update", { method: "POST", params: { filterByTk: id }, data });
  return unwrapRecord(res);
};

const customerLabel = (record) =>
  compact([
    firstPresent(record, ["customerName", "name", "fullName", "displayName", "companyName"]),
    firstPresent(record, ["customerCode", "code"]) ? `(${firstPresent(record, ["customerCode", "code"])})` : "",
  ]).join(" ") || (record?.id ? `Customer #${record.id}` : "-");

const contractLabel = (record) =>
  compact([
    firstPresent(record, ["contractCode", "contractNumber", "code"]),
    firstPresent(record, ["contractName", "name", "title"]),
  ]).join(" - ") || (record?.id ? `Contract #${record.id}` : "-");

const companyLabel = (record) =>
  compact([firstPresent(record, ["name", "companyName", "shortName", "displayName"])]).join(" ") ||
  (record?.id ? `Company #${record.id}` : "-");

const lawyerLabel = (record) =>
  compact([firstPresent(record, ["fullName", "name", "displayName"])]).join(" ") ||
  (record?.id ? `Lawyer #${record.id}` : "-");

// A NocoBase belongsTo relation comes back as either a single object or a
// 1-item array depending on the endpoint — normalize once here instead of
// at every call site.
const relationRecord = (value) => {
  if (Array.isArray(value)) return value.find((item) => item && typeof item === "object") || null;
  return value && typeof value === "object" ? value : null;
};

const resolveCustomerId = (record) =>
  extractId(record?.customerId) || extractId(record?.customers) || extractId(record?.customer);

const resolveCompanyId = (record) =>
  extractId(record?.internalCompanyId) || extractId(record?.internalCompany);
```

- [ ] **Step 2: Add the layout helpers (`js_block_internal_admin_layout_pattern.md`)**

```js
const InfoLine = ({ label, value, minWidth = 110 }) =>
  React.createElement(
    "div",
    { style: { flex: "0 1 auto", minWidth } },
    React.createElement("div", { style: { color: "rgba(0,0,0,0.45)", fontSize: 12, marginBottom: 4 } }, label),
    React.createElement("div", { style: { fontWeight: 500, wordBreak: "break-word" } }, value || "-"),
  );

const FieldRow = ({ children }) =>
  React.createElement(
    "div",
    { style: { display: "flex", flexWrap: "wrap", columnGap: 32, rowGap: 12 } },
    children,
  );

const Section = ({ title, first, children }) =>
  React.createElement(
    "div",
    {
      style: {
        display: "grid",
        gap: 10,
        borderTop: first ? "none" : "1px solid #f0f0f0",
        paddingTop: first ? 0 : 14,
      },
    },
    title
      ? React.createElement("div", { style: { fontSize: 13, fontWeight: 500, color: "rgba(0,0,0,0.72)" } }, title)
      : null,
    children,
  );
```

- [ ] **Step 3: Add the component shell with `form`/`mode` state and the Mode selector**

```js
const InvoiceCreateBlock = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState(MODE.paymentRequest);
  const [contracts, setContracts] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);

  const [form, setForm] = useState({
    contractId: "",
    customerId: "",
    internalCompanyId: "",
    paymentRequestId: "",
    invoiceName: "",
    invoiceType: "advance",
    status: "draft",
    issuedDate: nowDateTimeInput(),
    deadline: "",
    totalAmount: null,
    vat: null,
    vatAmount: null,
    description: "",
    assignees: "",
  });

  const setF = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const emptyFormForMode = () => ({
    contractId: "",
    customerId: "",
    internalCompanyId: "",
    paymentRequestId: "",
    invoiceName: "",
    invoiceType: "advance",
    status: "draft",
    issuedDate: nowDateTimeInput(),
    deadline: "",
    totalAmount: null,
    vat: null,
    vatAmount: null,
    description: "",
    assignees: "",
  });

  const handleModeChange = (value) => {
    setMode(value);
    setForm(emptyFormForMode());
    setSelectedContract(null);
  };

  return React.createElement(
    "div",
    { style: { width: "100%" } },
    React.createElement(
      Card,
      { size: "small", title: "Create invoice" },
      React.createElement(
        Space,
        { direction: "vertical", size: 16, style: { width: "100%" } },
        React.createElement(
          Form.Item,
          { label: "Mode", required: true, style: { maxWidth: 320, marginBottom: 0 } },
          React.createElement(Select, {
            value: mode,
            onChange: handleModeChange,
            options: [
              { label: "From Payment Request", value: MODE.paymentRequest },
              { label: "From Payment(s)", value: MODE.payments },
            ],
          }),
        ),
      ),
    ),
  );
};

ctx.render(React.createElement(InvoiceCreateBlock));
```

- [ ] **Step 4: Syntax-check**

Run: `node --check "All Module/Invoice/InvoiceCreateBlock.js"`
Expected: no output (exit code 0)

- [ ] **Step 5: Commit**

```bash
git add "All Module/Invoice/InvoiceCreateBlock.js"
git commit -m "feat: scaffold InvoiceCreateBlock.js with Mode switch shell"
```

---

## Task 3: "From Payment Request" mode

**Files:**
- Modify: `All Module/Invoice/InvoiceCreateBlock.js`
- Test: `node --check "All Module/Invoice/InvoiceCreateBlock.js"`, plus a standalone Node script exercising the pure resolve helpers

**Interfaces:**
- Consumes: `extractId`, `parseNum`, `firstPresent`, `resolveCustomerId`, `resolveCompanyId`, `getAny`, `listAny`, `CONTRACT_RESOURCES`, `PAYMENT_REQUEST_RESOURCES`, `FieldRow`, `InfoLine`, `Section` from Task 2
- Produces: `contractPaymentRequests` state, `activePaymentRequest` state (`{ id, title, requestedAmount }`), `loadContractContext(contractId)`, `handleContractPaymentRequestSelect(request)` — Task 6's `buildInvoicePayload()` reads `activePaymentRequest` and `form.paymentRequestId`

- [ ] **Step 1: Add state and the contract picker + Payment Request table**

Add to `InvoiceCreateBlock`'s state (alongside the Task 2 state):

```js
  const [contractPaymentRequests, setContractPaymentRequests] = useState([]);
  const [activePaymentRequest, setActivePaymentRequest] = useState(null);
```

Add the loader (mirrors `PaymentCreateBlock.js`'s `loadContractContext`, minus the payments-fetch it doesn't need here):

```js
  const loadContractContext = async (contractId) => {
    const safeId = extractId(contractId);
    setF("contractId", safeId || "");
    setSelectedContract(null);
    setContractPaymentRequests([]);
    setActivePaymentRequest(null);
    if (!safeId) return;
    setLoading(true);
    try {
      const [contract, paymentRequests] = await Promise.all([
        getAny(CONTRACT_RESOURCES, safeId, { appends: ["customers", "internalCompany"] }),
        listAny(["paymentRequests"], {
          pageSize: 500,
          filter: JSON.stringify({ contractId: { $eq: safeId } }),
          fields: ["id", "title", "requestedAmount", "status"],
        }).catch(() => []),
      ]);
      setSelectedContract(contract || null);
      setContractPaymentRequests(paymentRequests || []);
      setForm((prev) => ({
        ...prev,
        contractId: safeId,
        customerId: resolveCustomerId(contract) || "",
        internalCompanyId: resolveCompanyId(contract) || "",
      }));
    } catch (error) {
      console.error("[InvoiceCreateBlock] load contract failed", error);
      message.error("Could not load contract.");
    } finally {
      setLoading(false);
    }
  };

  const handleContractPaymentRequestSelect = (request) => {
    const requestId = extractId(request?.id);
    const requestedAmount = parseNum(request?.requestedAmount);
    setActivePaymentRequest({
      id: requestId,
      title: firstPresent(request || {}, ["title"]) || (requestId ? `Payment request #${requestId}` : "Payment request"),
      requestedAmount,
    });
    setF("paymentRequestId", requestId || "");
    setForm((prev) => ({
      ...prev,
      paymentRequestId: requestId || "",
      totalAmount: requestedAmount > MONEY_TOLERANCE ? requestedAmount : prev.totalAmount,
    }));
  };
```

- [ ] **Step 2: Render the contract selector + Payment Request table, gated on `mode === MODE.paymentRequest`**

Insert into the returned `Space` (after the Mode `Form.Item`, still inside `Card`):

```js
        mode === MODE.paymentRequest &&
        React.createElement(
          React.Fragment,
          null,
          React.createElement(
            Form.Item,
            { label: "Contract", required: true, style: { maxWidth: 480, marginBottom: 0 } },
            React.createElement(Select, {
              showSearch: true,
              allowClear: true,
              value: form.contractId || undefined,
              placeholder: "Select contract",
              optionFilterProp: "label",
              onChange: loadContractContext,
              options: contracts.map((item) => ({ value: extractId(item), label: contractLabel(item) })),
            }),
          ),
          selectedContract &&
          React.createElement(
            FieldRow,
            null,
            React.createElement(InfoLine, { label: "Contract", value: contractLabel(selectedContract), minWidth: 200 }),
            React.createElement(InfoLine, { label: "Customer", value: customerLabel(relationRecord(selectedContract.customers)), minWidth: 160 }),
            React.createElement(InfoLine, { label: "Internal company", value: companyLabel(relationRecord(selectedContract.internalCompany)), minWidth: 160 }),
          ),
          form.contractId &&
          React.createElement(
            Section,
            { title: "Payment requests" },
            activePaymentRequest
              ? React.createElement(
                  FieldRow,
                  null,
                  React.createElement(InfoLine, { label: "Selected request", value: activePaymentRequest.title, minWidth: 220 }),
                  React.createElement(InfoLine, { label: "Requested amount", value: formatMoney(activePaymentRequest.requestedAmount) }),
                )
              : null,
            React.createElement(Table, {
              rowKey: "id",
              size: "small",
              pagination: false,
              dataSource: contractPaymentRequests,
              locale: { emptyText: "No payment requests for this contract." },
              rowSelection: {
                type: "radio",
                selectedRowKeys: activePaymentRequest?.id ? [activePaymentRequest.id] : [],
                onSelect: handleContractPaymentRequestSelect,
              },
              onRow: (row) => ({ onClick: () => handleContractPaymentRequestSelect(row) }),
              columns: [
                { title: "Payment request", dataIndex: "title", render: (value, row) => value || `Payment request #${extractId(row.id)}` },
                { title: "Requested", dataIndex: "requestedAmount", width: 140, align: "right", render: formatMoney },
                { title: "Status", dataIndex: "status", width: 100 },
              ],
            }),
          ),
        ),
```

- [ ] **Step 3: Syntax-check**

Run: `node --check "All Module/Invoice/InvoiceCreateBlock.js"`
Expected: no output (exit code 0)

- [ ] **Step 4: Write and run a standalone test for the pure resolve helpers**

Create `C:\Users\Viet\AppData\Local\Temp\claude\c--Users-Viet-Desktop-nocobase\995368eb-90ba-4962-b7f4-2148fbf18634\scratchpad\test-resolve-helpers.js`:

```js
const assert = require("assert");

const extractId = (value) => {
  if (Array.isArray(value)) return extractId(value[0]);
  const raw = value && typeof value === "object" ? value.id || value._id : value;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const resolveCustomerId = (record) =>
  extractId(record?.customerId) || extractId(record?.customers) || extractId(record?.customer);

assert.strictEqual(resolveCustomerId({ customerId: 42 }), 42);
assert.strictEqual(resolveCustomerId({ customers: { id: 7 } }), 7);
assert.strictEqual(resolveCustomerId({}), null);

console.log("resolve-helpers: all assertions passed");
```

Run: `node "C:\Users\Viet\AppData\Local\Temp\claude\c--Users-Viet-Desktop-nocobase\995368eb-90ba-4962-b7f4-2148fbf18634\scratchpad\test-resolve-helpers.js"`
Expected: `resolve-helpers: all assertions passed`

- [ ] **Step 5: Commit**

```bash
git add "All Module/Invoice/InvoiceCreateBlock.js"
git commit -m "feat: add From Payment Request mode to InvoiceCreateBlock.js"
```

---

## Task 4: "From Payment(s)" mode

**Files:**
- Modify: `All Module/Invoice/InvoiceCreateBlock.js`
- Test: `node --check "All Module/Invoice/InvoiceCreateBlock.js"`, plus a standalone Node script for the sum helper

**Interfaces:**
- Consumes: `PAYMENT_RESOURCES`, `listAny`, `loadContractContext`'s contract-loading half (reused, extended below), `FieldRow`, `InfoLine`, `Section` from Tasks 2–3
- Produces: `contractPayments` state (uninvoiced-only), `selectedPaymentIds` state (array), `sumSelectedPayments(payments, selectedIds)` — Task 6 reads `selectedPaymentIds`/`contractPayments` to build the post-create `payments:update` loop

- [ ] **Step 1: Extend `loadContractContext` to also fetch uninvoiced payments when in this mode**

Modify the `Promise.all` in `loadContractContext` (from Task 3) to branch on `mode`:

```js
  const loadContractContext = async (contractId) => {
    const safeId = extractId(contractId);
    setF("contractId", safeId || "");
    setSelectedContract(null);
    setContractPaymentRequests([]);
    setActivePaymentRequest(null);
    setContractPayments([]);
    setSelectedPaymentIds([]);
    if (!safeId) return;
    setLoading(true);
    try {
      const contract = await getAny(CONTRACT_RESOURCES, safeId, { appends: ["customers", "internalCompany"] });
      setSelectedContract(contract || null);
      setForm((prev) => ({
        ...prev,
        contractId: safeId,
        customerId: resolveCustomerId(contract) || "",
        internalCompanyId: resolveCompanyId(contract) || "",
      }));

      if (mode === MODE.paymentRequest) {
        const paymentRequests = await listAny(["paymentRequests"], {
          pageSize: 500,
          filter: JSON.stringify({ contractId: { $eq: safeId } }),
          fields: ["id", "title", "requestedAmount", "status"],
        }).catch(() => []);
        setContractPaymentRequests(paymentRequests || []);
      } else {
        const payments = await listAny(PAYMENT_RESOURCES, {
          pageSize: 500,
          filter: JSON.stringify({
            contractId: { $eq: safeId },
            invoiceId: { $is: null },
          }),
          fields: ["id", "paymentNumber", "amount", "paymentStatus", "paymentDate"],
        }).catch(() => []);
        setContractPayments(payments || []);
      }
    } catch (error) {
      console.error("[InvoiceCreateBlock] load contract failed", error);
      message.error("Could not load contract.");
    } finally {
      setLoading(false);
    }
  };
```

Add the two new state fields alongside Task 3's:

```js
  const [contractPayments, setContractPayments] = useState([]);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState([]);
```

- [ ] **Step 2: Add the sum helper and the checkbox-select handler**

```js
  const sumSelectedPayments = (payments, selectedIds) =>
    (payments || [])
      .filter((p) => selectedIds.includes(extractId(p.id)))
      .reduce((sum, p) => sum + parseNum(p.amount), 0);

  const handlePaymentSelectionChange = (selectedRowKeys) => {
    const ids = selectedRowKeys.map((key) => extractId(key)).filter(Boolean);
    setSelectedPaymentIds(ids);
    const total = sumSelectedPayments(contractPayments, ids);
    setF("totalAmount", total > MONEY_TOLERANCE ? total : null);
  };
```

- [ ] **Step 3: Render the contract selector + payments table, gated on `mode === MODE.payments`**

```js
        mode === MODE.payments &&
        React.createElement(
          React.Fragment,
          null,
          React.createElement(
            Form.Item,
            { label: "Contract", required: true, style: { maxWidth: 480, marginBottom: 0 } },
            React.createElement(Select, {
              showSearch: true,
              allowClear: true,
              value: form.contractId || undefined,
              placeholder: "Select contract",
              optionFilterProp: "label",
              onChange: loadContractContext,
              options: contracts.map((item) => ({ value: extractId(item), label: contractLabel(item) })),
            }),
          ),
          selectedContract &&
          React.createElement(
            FieldRow,
            null,
            React.createElement(InfoLine, { label: "Contract", value: contractLabel(selectedContract), minWidth: 200 }),
            React.createElement(InfoLine, { label: "Customer", value: customerLabel(relationRecord(selectedContract.customers)), minWidth: 160 }),
            React.createElement(InfoLine, { label: "Internal company", value: companyLabel(relationRecord(selectedContract.internalCompany)), minWidth: 160 }),
          ),
          form.contractId &&
          React.createElement(
            Section,
            { title: "Payments to invoice" },
            selectedPaymentIds.length
              ? React.createElement(InfoLine, {
                  label: `${selectedPaymentIds.length} payment(s) selected`,
                  value: formatMoney(sumSelectedPayments(contractPayments, selectedPaymentIds)),
                })
              : null,
            React.createElement(Table, {
              rowKey: "id",
              size: "small",
              pagination: false,
              dataSource: contractPayments,
              locale: { emptyText: "No uninvoiced payments for this contract." },
              rowSelection: {
                type: "checkbox",
                selectedRowKeys: selectedPaymentIds,
                onChange: handlePaymentSelectionChange,
              },
              columns: [
                { title: "Payment", dataIndex: "paymentNumber", render: (value, row) => value || `Payment #${extractId(row.id)}` },
                { title: "Date", dataIndex: "paymentDate", width: 110, render: formatDate },
                { title: "Status", dataIndex: "paymentStatus", width: 100 },
                { title: "Amount", dataIndex: "amount", width: 140, align: "right", render: formatMoney },
              ],
            }),
          ),
        ),
```

- [ ] **Step 4: Syntax-check**

Run: `node --check "All Module/Invoice/InvoiceCreateBlock.js"`
Expected: no output (exit code 0)

- [ ] **Step 5: Write and run a standalone test for `sumSelectedPayments`**

Create `.../scratchpad/test-sum-selected-payments.js`:

```js
const assert = require("assert");

const parseNum = (value) => {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const extractId = (value) => {
  if (Array.isArray(value)) return extractId(value[0]);
  const raw = value && typeof value === "object" ? value.id || value._id : value;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const sumSelectedPayments = (payments, selectedIds) =>
  (payments || [])
    .filter((p) => selectedIds.includes(extractId(p.id)))
    .reduce((sum, p) => sum + parseNum(p.amount), 0);

const payments = [
  { id: 1, amount: 5000000 },
  { id: 2, amount: 3000000 },
  { id: 3, amount: 1000000 },
];

assert.strictEqual(sumSelectedPayments(payments, [1, 3]), 6000000);
assert.strictEqual(sumSelectedPayments(payments, []), 0);
assert.strictEqual(sumSelectedPayments(payments, [1, 2, 3]), 9000000);

console.log("sum-selected-payments: all assertions passed");
```

Run: `node ".../scratchpad/test-sum-selected-payments.js"`
Expected: `sum-selected-payments: all assertions passed`

- [ ] **Step 6: Commit**

```bash
git add "All Module/Invoice/InvoiceCreateBlock.js"
git commit -m "feat: add From Payment(s) mode to InvoiceCreateBlock.js"
```

---

## Task 5: Invoice detail fields section

**Files:**
- Modify: `All Module/Invoice/InvoiceCreateBlock.js`
- Test: `node --check "All Module/Invoice/InvoiceCreateBlock.js"`, plus a standalone Node script for the VAT calc

**Interfaces:**
- Consumes: `Section`, `FieldRow` from Task 2; `form`/`setF` from Task 2
- Produces: `handleVatChange(value)`, `handleTotalAmountChange(value)` (recompute `vatAmount` when either changes) — Task 6's `buildInvoicePayload()` reads the full `form` object these functions keep up to date

- [ ] **Step 1: Add the VAT recompute handlers**

```js
  const recomputeVatAmount = (totalAmount, vat) => {
    const total = parseNum(totalAmount);
    const rate = parseNum(vat);
    if (!total || !rate) return 0;
    return Math.round((total * rate) / 100);
  };

  const handleTotalAmountChange = (value) => {
    const amount = parseNum(value);
    setForm((prev) => ({ ...prev, totalAmount: amount, vatAmount: recomputeVatAmount(amount, prev.vat) }));
  };

  const handleVatChange = (value) => {
    const rate = parseNum(value);
    setForm((prev) => ({ ...prev, vat: rate, vatAmount: recomputeVatAmount(prev.totalAmount, rate) }));
  };
```

- [ ] **Step 2: Render the "Invoice details" section**

Append after the mode-specific blocks, still inside the `Space`:

```js
        React.createElement(
          Section,
          { title: "Invoice details" },
          React.createElement(
            FieldRow,
            null,
            React.createElement(
              Form.Item,
              { label: "Invoice name", required: true, style: { flex: "1 1 260px", marginBottom: 0 } },
              React.createElement(Input, { value: form.invoiceName, onChange: (e) => setF("invoiceName", e.target.value) }),
            ),
            React.createElement(
              Form.Item,
              { label: "Invoice type", required: true, style: { flex: "0 1 180px", marginBottom: 0 } },
              React.createElement(Select, {
                value: form.invoiceType,
                onChange: (value) => setF("invoiceType", value),
                options: ["advance", "milestone", "final"].map((value) => ({ value, label: value })),
              }),
            ),
            React.createElement(
              Form.Item,
              { label: "Status", required: true, style: { flex: "0 1 160px", marginBottom: 0 } },
              React.createElement(Select, {
                value: form.status,
                onChange: (value) => setF("status", value),
                options: ["draft", "pending", "partial", "paid", "overdue", "cancelled"].map((value) => ({ value, label: value })),
              }),
            ),
          ),
          React.createElement(
            FieldRow,
            null,
            React.createElement(
              Form.Item,
              { label: "Issued date", required: true, style: { flex: "0 1 220px", marginBottom: 0 } },
              React.createElement(Input, { type: "datetime-local", value: form.issuedDate, onChange: (e) => setF("issuedDate", e.target.value) }),
            ),
            React.createElement(
              Form.Item,
              { label: "Deadline", style: { flex: "0 1 220px", marginBottom: 0 } },
              React.createElement(Input, { type: "datetime-local", value: form.deadline, onChange: (e) => setF("deadline", e.target.value) }),
            ),
            React.createElement(
              Form.Item,
              { label: "Assignee", style: { flex: "0 1 220px", marginBottom: 0 } },
              React.createElement(Select, {
                showSearch: true,
                allowClear: true,
                value: form.assignees || undefined,
                placeholder: "Select lawyer",
                optionFilterProp: "label",
                onChange: (value) => setF("assignees", value || ""),
                options: lawyers.map((item) => ({ value: extractId(item), label: lawyerLabel(item) })),
              }),
            ),
          ),
          React.createElement(
            FieldRow,
            null,
            React.createElement(
              Form.Item,
              { label: "Total amount", required: true, style: { flex: "0 1 220px", marginBottom: 0 } },
              React.createElement(Input, { value: form.totalAmount ?? "", inputMode: "numeric", addonAfter: "VND", onChange: (e) => handleTotalAmountChange(e.target.value) }),
            ),
            React.createElement(
              Form.Item,
              { label: "VAT (%)", style: { flex: "0 1 140px", marginBottom: 0 } },
              React.createElement(Input, { value: form.vat ?? "", inputMode: "numeric", onChange: (e) => handleVatChange(e.target.value) }),
            ),
            React.createElement(
              Form.Item,
              { label: "VAT amount", style: { flex: "0 1 200px", marginBottom: 0 } },
              React.createElement(Input, { value: form.vatAmount ?? "", inputMode: "numeric", addonAfter: "VND", onChange: (e) => setF("vatAmount", parseNum(e.target.value)) }),
            ),
          ),
          React.createElement(
            Form.Item,
            { label: "Description", style: { marginBottom: 0 } },
            React.createElement(Input.TextArea, { rows: 3, value: form.description, onChange: (e) => setF("description", e.target.value) }),
          ),
        ),
```

- [ ] **Step 3: Syntax-check**

Run: `node --check "All Module/Invoice/InvoiceCreateBlock.js"`
Expected: no output (exit code 0)

- [ ] **Step 4: Write and run a standalone test for `recomputeVatAmount`**

Create `.../scratchpad/test-vat-amount.js`:

```js
const assert = require("assert");

const parseNum = (value) => {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const recomputeVatAmount = (totalAmount, vat) => {
  const total = parseNum(totalAmount);
  const rate = parseNum(vat);
  if (!total || !rate) return 0;
  return Math.round((total * rate) / 100);
};

assert.strictEqual(recomputeVatAmount(10000000, 10), 1000000);
assert.strictEqual(recomputeVatAmount(10000000, 0), 0);
assert.strictEqual(recomputeVatAmount(10000000, null), 0);
assert.strictEqual(recomputeVatAmount(0, 10), 0);

console.log("vat-amount: all assertions passed");
```

Run: `node ".../scratchpad/test-vat-amount.js"`
Expected: `vat-amount: all assertions passed`

- [ ] **Step 5: Commit**

```bash
git add "All Module/Invoice/InvoiceCreateBlock.js"
git commit -m "feat: add invoice detail fields section to InvoiceCreateBlock.js"
```

---

## Task 6: Validation, submit payload, and post-create payment linking

**Files:**
- Modify: `All Module/Invoice/InvoiceCreateBlock.js`
- Test: `node --check "All Module/Invoice/InvoiceCreateBlock.js"`, plus a standalone Node script for `validate()`

**Interfaces:**
- Consumes: everything from Tasks 2–5 (`form`, `mode`, `activePaymentRequest`, `selectedPaymentIds`, `contractPayments`, `INVOICE_RESOURCES`, `PAYMENT_RESOURCES`, `apiRequestAny`/`getAny`/`updateAny`)
- Produces: `validate()`, `buildInvoicePayload()`, `handleSubmit()` wired to a "Submit" `Button` — this is the last task; nothing downstream depends on it

- [ ] **Step 1: Write `validate()`**

```js
  const validate = () => {
    if (!form.contractId) return "Please select a contract.";
    if (mode === MODE.paymentRequest && !activePaymentRequest) return "Please select a payment request.";
    if (mode === MODE.payments && !selectedPaymentIds.length) return "Please select at least one payment.";
    if (!form.invoiceName.trim()) return "Please enter an invoice name.";
    if (!form.issuedDate) return "Please enter the issued date.";
    const amount = parseNum(form.totalAmount);
    if (amount <= 0) return "Please enter a total amount.";
    return "";
  };
```

- [ ] **Step 2: Write `buildInvoicePayload()` and `handleSubmit()`**

```js
  const buildInvoicePayload = () => ({
    contractId: extractId(form.contractId) || null,
    customerId: extractId(form.customerId) || null,
    internalCompanyId: extractId(form.internalCompanyId) || null,
    paymentRequestId: mode === MODE.paymentRequest ? extractId(form.paymentRequestId) || null : null,
    invoiceName: form.invoiceName.trim(),
    invoiceType: form.invoiceType,
    status: form.status,
    issuedDate: new Date(form.issuedDate).toISOString(),
    deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
    totalAmount: parseNum(form.totalAmount),
    vat: form.vat ? parseNum(form.vat) : null,
    vatAmount: form.vatAmount ? parseNum(form.vatAmount) : null,
    description: form.description.trim() || null,
    assignees: extractId(form.assignees) || null,
  });

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      message.warning(error);
      return;
    }
    setSaving(true);
    try {
      const payload = buildInvoicePayload();
      const created = unwrapRecord(await apiRequestAny(INVOICE_RESOURCES, "create", { method: "POST", data: payload }));
      const invoiceId = extractId(created);
      if (!invoiceId) throw new Error("Invoice was created but its id could not be read back.");

      if (mode === MODE.payments && selectedPaymentIds.length) {
        const failedIds = [];
        for (const paymentId of selectedPaymentIds) {
          try {
            await updateAny(PAYMENT_RESOURCES, paymentId, { invoiceId });
          } catch (linkError) {
            console.error("[InvoiceCreateBlock] failed to link payment", paymentId, linkError);
            failedIds.push(paymentId);
          }
        }
        if (failedIds.length) {
          message.warning(
            `Invoice created, but ${failedIds.length} payment(s) could not be linked (ids: ${failedIds.join(", ")}). Link them manually.`,
          );
        } else {
          message.success("Invoice created and payments linked successfully.");
        }
      } else {
        message.success("Invoice created successfully.");
      }
    } catch (submitError) {
      console.error("[InvoiceCreateBlock] submit failed", submitError);
      message.error(submitError?.message || "Could not create invoice.");
    } finally {
      setSaving(false);
    }
  };
```

- [ ] **Step 3: Wire the Submit button**

Append after the "Invoice details" `Section` from Task 5, still inside the `Space`:

```js
        React.createElement(
          "div",
          { style: { display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 12 } },
          React.createElement(Button, { type: "primary", loading: saving, onClick: handleSubmit }, "Submit"),
        ),
```

- [ ] **Step 4: Syntax-check**

Run: `node --check "All Module/Invoice/InvoiceCreateBlock.js"`
Expected: no output (exit code 0)

- [ ] **Step 5: Write and run a standalone test for `validate()`**

Create `.../scratchpad/test-validate.js`:

```js
const assert = require("assert");

const parseNum = (value) => {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const MODE = { paymentRequest: "paymentRequest", payments: "payments" };

const validate = ({ form, mode, activePaymentRequest, selectedPaymentIds }) => {
  if (!form.contractId) return "Please select a contract.";
  if (mode === MODE.paymentRequest && !activePaymentRequest) return "Please select a payment request.";
  if (mode === MODE.payments && !selectedPaymentIds.length) return "Please select at least one payment.";
  if (!form.invoiceName.trim()) return "Please enter an invoice name.";
  if (!form.issuedDate) return "Please enter the issued date.";
  const amount = parseNum(form.totalAmount);
  if (amount <= 0) return "Please enter a total amount.";
  return "";
};

const baseForm = { contractId: 1, invoiceName: "Test", issuedDate: "2026-09-23T10:00", totalAmount: 1000000 };

assert.strictEqual(
  validate({ form: { ...baseForm, contractId: "" }, mode: MODE.paymentRequest, activePaymentRequest: null, selectedPaymentIds: [] }),
  "Please select a contract.",
);
assert.strictEqual(
  validate({ form: baseForm, mode: MODE.paymentRequest, activePaymentRequest: null, selectedPaymentIds: [] }),
  "Please select a payment request.",
);
assert.strictEqual(
  validate({ form: baseForm, mode: MODE.payments, activePaymentRequest: null, selectedPaymentIds: [] }),
  "Please select at least one payment.",
);
assert.strictEqual(
  validate({ form: { ...baseForm, invoiceName: "  " }, mode: MODE.payments, activePaymentRequest: null, selectedPaymentIds: [1] }),
  "Please enter an invoice name.",
);
assert.strictEqual(
  validate({ form: { ...baseForm, totalAmount: 0 }, mode: MODE.payments, activePaymentRequest: null, selectedPaymentIds: [1] }),
  "Please enter a total amount.",
);
assert.strictEqual(
  validate({ form: baseForm, mode: MODE.paymentRequest, activePaymentRequest: { id: 9 }, selectedPaymentIds: [] }),
  "",
);

console.log("validate: all assertions passed");
```

Run: `node ".../scratchpad/test-validate.js"`
Expected: `validate: all assertions passed`

- [ ] **Step 6: Commit**

```bash
git add "All Module/Invoice/InvoiceCreateBlock.js"
git commit -m "feat: add validation, submit, and payment-linking to InvoiceCreateBlock.js"
```

---

## Task 7: Contract list loading, mode-reset gaps, and final review pass

**Files:**
- Modify: `All Module/Invoice/InvoiceCreateBlock.js`
- Test: `node --check "All Module/Invoice/InvoiceCreateBlock.js"`, manual review against Review Focus list

**Interfaces:**
- Consumes: everything from Tasks 2–6
- Produces: a complete, deployable file — final task, nothing downstream

- [ ] **Step 1: Add the initial contract-list load (`useEffect`)**

Add `useEffect` to the React destructure in Task 2's Step 1 (`const { useState, useEffect } = React;`), then add near the top of `InvoiceCreateBlock`:

```js
  useEffect(() => {
    let mounted = true;
    Promise.all([
      listAny(CONTRACT_RESOURCES, { pageSize: 500, sort: ["-createdAt"] }).catch(() => []),
      listAny(LAWYER_RESOURCES, { pageSize: 500 }).catch(() => []),
    ]).then(([contractRows, lawyerRows]) => {
      if (!mounted) return;
      setContracts(contractRows || []);
      setLawyers(lawyerRows || []);
    });
    return () => { mounted = false; };
  }, []);
```

- [ ] **Step 2: Close the Review Focus gaps that earlier tasks didn't cover**

Re-read `docs/superpowers/plans/2026-09-23-create-invoice-js-block.md`'s Review Focus list against the current file and confirm each is actually true, fixing any that aren't:

1. **Contract with zero uninvoiced payments** — already covered by Task 4's `locale: { emptyText: "No uninvoiced payments for this contract." }`. Confirm by reading the rendered `Table` props.
2. **Partial `payments:update` failure** — already covered by Task 6's `failedIds` handling. Confirm the message names the failed ids, not just a count.
3. **`vat` blank/zero** — already covered by Task 5's `recomputeVatAmount` early-return and Task 6's `test-vat-amount.js`. Re-run that test to confirm.
4. **Mode switch clearing stale selections** — `handleModeChange` (Task 2) already calls `emptyFormForMode()` and resets `selectedContract`, but does **not** reset `contractPaymentRequests`/`activePaymentRequest`/`contractPayments`/`selectedPaymentIds` (those were added in Tasks 3–4, after `handleModeChange` was written). Fix `handleModeChange` now:

```js
  const handleModeChange = (value) => {
    setMode(value);
    setForm(emptyFormForMode());
    setSelectedContract(null);
    setContractPaymentRequests([]);
    setActivePaymentRequest(null);
    setContractPayments([]);
    setSelectedPaymentIds([]);
  };
```

5. **Contract with no resolvable `customerId`/`internalCompanyId`** — already closed: Task 3's Step 2 and Task 4's Step 3 both render a `FieldRow` with Contract/Customer/Internal company `InfoLine`s directly from `selectedContract.customers`/`selectedContract.internalCompany` (fetched via the `appends: ["customers", "internalCompany"]` already in `loadContractContext`, normalized through `relationRecord`). `customerLabel`/`companyLabel` both fall back to `"-"` / `"Customer #id"` / `"Company #id"` when a relation is missing (Task 2), so a contract with no linked customer shows `"-"` instead of a blank cell or a crash — confirm this by reading those two blocks, no new code needed here.

- [ ] **Step 3: Full-file syntax-check**

Run: `node --check "All Module/Invoice/InvoiceCreateBlock.js"`
Expected: no output (exit code 0)

- [ ] **Step 4: Re-run every standalone test from Tasks 3–6**

Run:
```
node ".../scratchpad/test-resolve-helpers.js"
node ".../scratchpad/test-sum-selected-payments.js"
node ".../scratchpad/test-vat-amount.js"
node ".../scratchpad/test-validate.js"
```
Expected: all four print their "all assertions passed" line

- [ ] **Step 5: Hand off for live verification**

This cannot be automated. Tell the user explicitly: paste `All Module/Invoice/InvoiceCreateBlock.js` into a new JS Block in NocoBase Admin UI, then verify:
1. Task 1's field script has been run (required — the block will fail to create invoices with `paymentRequestId` set otherwise).
2. Mode "From Payment Request": pick a contract with at least one Payment Request, select one, confirm Total amount auto-fills, submit, confirm the new `invoices` row has `paymentRequestId` set correctly.
3. Mode "From Payment(s)": pick a contract with at least one uninvoiced payment, tick 2+, confirm Total amount is their sum, submit, confirm the new invoice was created AND the selected `payments` rows now have `invoiceId` set to it.
4. Switch Mode mid-fill and confirm the other mode's selections are cleared, not carried over.

- [ ] **Step 6: Commit**

```bash
git add "All Module/Invoice/InvoiceCreateBlock.js"
git commit -m "feat: close review-focus gaps and add contract list loading to InvoiceCreateBlock.js"
```
