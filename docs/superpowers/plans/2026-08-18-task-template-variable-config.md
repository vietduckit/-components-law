# Task Template File — Variable Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a lawyer fill a task's attached `.docx` template with live case/customer/
quotation/contract/invoice/payment data plus manually-typed values, configured either once at
the service's Task Template level (auto-applies to every task created from it) or ad-hoc per
task, and save the result as a new document on the task without touching the original file.

**Architecture:** Reuses the exact docxtemplater/pizzip render pattern already proven in
`QuotationDocxGenerator.js` / `ContractDocxGenerator.js`, but scoped to a single document inside
`TaskDetailView.js`'s existing attachment UI instead of a standalone page. A variable-definition
list (`{ key, source: "system"|"manual", sourceKey?, label? }`) lives on
`projectTemplates.variableConfig` (source of truth for standardized tasks) and
`documents.variableConfig` (used only when that document's `variableConfigMode = "custom"`).
One shared JsField block edits both. A static "variable catalog" JS object (duplicated in two
files per this repo's single-file constraint) maps `sourceKey` dot-paths to live data fetched at
generate time.

**Tech Stack:** Nocobase RunJS blocks (`ctx.React`, `ctx.antd`, `ctx.api.request`,
`ctx.importAsync`), `pizzip`/`docxtemplater` via CDN (`esm.sh`), no bundler, no imports across
files (single-file constraint — see `nocobase_single_file_constraint` convention already followed
throughout this repo).

**Spec:** `docs/superpowers/specs/2026-08-18-task-template-variable-config-design.md`

## Global Constraints

- No `fetch()` — only `ctx.api.request()` (per repo-wide `CLAUDE.md` rule).
- No cross-file imports — every helper a task needs must be defined in that same file, even if
  it duplicates a helper from another task's file (single-file constraint).
- Money values render as `"<rounded>".toLocaleString("en-US") + " VND"` (matches
  `ContractDocxGenerator.js`/`QuotationDocxGenerator.js` convention) — not `fmtVND` (that helper
  isn't defined in `TaskDetailView.js`).
- Dates render `dd/mm/yyyy` (matches the rest of this repo).
- `documents.variableConfigMode` values are the literal strings `"inherited"` and `"custom"`
  (confirmed against the live Nocobase field — see spec §3).
- The source `.docx` file that gets filled is **always the task's own attached file**
  (`document.fileAttachment`), never re-fetched from the linked `projectTemplates` record —
  only the *variable config* (not the file bytes) is resolved as inherited-vs-custom. This
  avoids generate silently swapping in different file bytes than what's visibly attached to the
  task.
- Every new `documents` row this feature creates must go through
  `buildTaskUploadDocumentLink("Task", taskId, { folderId: projectFolderId })` — the same helper
  every other task-scoped document creation path in `TaskDetailView.js` already uses — never set
  `caseId` directly (see the existing comment at `TaskDetailView.js:1462-1467` on why).

---

## Task 1: Trigger — link cloned documents back to their source Task Template

**Files:**
- Modify: `pgsql/AutoCreateTaskFromTemplate.sql`

**Interfaces:**
- Produces: every `documents` row the trigger creates from a `projectTemplates.templateFileId`
  now carries `sourceProjectTemplateId` (FK to the originating `projectTemplates` row) and
  `variableConfigMode = 'inherited'`, so `TaskDetailView.js` (Task 4/5) can resolve that
  document's effective variable config by following the relation.

- [ ] **Step 1: Add the two columns to the `documents` INSERT**

Find (the existing `INSERT INTO documents` block):
```sql
                    INSERT INTO documents (
                        id,
                        title,
                        "documentType",
                        "taskId",
                        "caseId",
                        "customerId",
                        "moduleScope",
                        "storageType",
                        "createdById",
                        "updatedById",
                        "createdAt",
                        "updatedAt"
                    )
                    VALUES (
                        new_doc_id,
                        v_attachment.title,
                        'File mẫu',
                        new_task_id,
                        NEW."projectId",
                        proj."customerId",
                        'case_document',
                        'tasks',
                        proj."createdById",
                        proj."updatedById",
                        timezone('Asia/Ho_Chi_Minh', now()) + INTERVAL '2 hours',
                        timezone('Asia/Ho_Chi_Minh', now()) + INTERVAL '2 hours'
                    );
```

Replace with:
```sql
                    INSERT INTO documents (
                        id,
                        title,
                        "documentType",
                        "taskId",
                        "caseId",
                        "customerId",
                        "moduleScope",
                        "storageType",
                        "sourceProjectTemplateId",
                        "variableConfigMode",
                        "createdById",
                        "updatedById",
                        "createdAt",
                        "updatedAt"
                    )
                    VALUES (
                        new_doc_id,
                        v_attachment.title,
                        'File mẫu',
                        new_task_id,
                        NEW."projectId",
                        proj."customerId",
                        'case_document',
                        'tasks',
                        tmpl.id,
                        'inherited',
                        proj."createdById",
                        proj."updatedById",
                        timezone('Asia/Ho_Chi_Minh', now()) + INTERVAL '2 hours',
                        timezone('Asia/Ho_Chi_Minh', now()) + INTERVAL '2 hours'
                    );
```

`tmpl` is the `projectTemplates` row already being iterated by the enclosing `FOR tmpl IN ...
LOOP` (declared at the top of the function, `tmpl RECORD;`), so `tmpl.id` is exactly the
originating Task Template's id — no new query needed.

- [ ] **Step 2: Deploy the updated function**

Run this SQL against the project's Postgres database (same way any other file under `pgsql/` in
this repo gets deployed — via the project's existing DB admin access, e.g. psql or the Nocobase
DB console):
```sql
-- paste the full updated CREATE OR REPLACE FUNCTION ... AS $BODY$ ... $BODY$; block from
-- pgsql/AutoCreateTaskFromTemplate.sql after Step 1's edit
```
Expected: `CREATE FUNCTION` success, no errors. This function is `CREATE OR REPLACE`, so
re-running it is safe and doesn't need a DROP first.

- [ ] **Step 3: Manual verification**

In Nocobase, add a service to a test Case whose service has at least one `projectTemplates` row
with a non-null `templateFileId`. Confirm:
- A new task is created (existing behavior, unchanged).
- Its cloned document (visible in the task's Attachments) now has `sourceProjectTemplateId`
  pointing at that `projectTemplates` row and `variableConfigMode = "inherited"` — check via the
  `documents` table directly (e.g. `SELECT "sourceProjectTemplateId", "variableConfigMode" FROM
  documents WHERE "taskId" = <new task id>;`).

- [ ] **Step 4: Commit**

```bash
git add pgsql/AutoCreateTaskFromTemplate.sql
git commit -m "feat(AutoCreateTaskFromTemplate): link cloned task documents back to their source Task Template"
```

---

## Task 2: Nocobase Admin configuration (manual, no code)

**Files:** none — this is Nocobase Admin UI configuration, not a code change. It's a
prerequisite for Task 3's block to be reachable from the UI.

**Interfaces:**
- Produces: `POPUP_UID_VARIABLE_CONFIG`, a view UID string that Task 5's
  `TaskDetailView.js` change consumes (same pattern as the existing `POPUP_UID_CASE` /
  `POPUP_UID_CONTRACT` constants already in this codebase — see
  `All Module/Quotation/QuotationDocxGenerator.js:26-27`).

- [ ] **Step 1: Set a DB-level default on `documents.variableConfigMode`**

In Nocobase Admin → Data sources → `documents` collection → edit the `variableConfigMode` field
→ set its default value to `custom`. This makes every freshly-created `documents` row default to
`custom` (covers ad-hoc lawyer uploads, which never go through the trigger) — Task 1's trigger
still explicitly writes `'inherited'` for template-cloned rows, overriding this default.

- [ ] **Step 2: Create a single-field popup view for `documents.variableConfig`**

Create a new Nocobase view scoped to the `documents` collection, form/drawer mode, showing only
the `variableConfig` field (bind Task 3's JsField block to it as its field component — do this
after Task 3 is deployed) and the `variableConfigMode` field (plain select, so the lawyer can see/
switch mode from the same popup). Note the view's UID (from View Settings → UID, same place
every other `POPUP_UID_*` constant in this repo was sourced from — see `CLAUDE.md`'s "View UIDs"
section).

- [ ] **Step 3: Attach the same JsField block to `projectTemplates.variableConfig`**

In Nocobase Admin → Data sources → `projectTemplates` (Task Template) collection → edit the
`variableConfig` field → set its Field Component to Task 3's JsField block. This is the
already-existing default Task Template form — no new view needed here, just a field-component
change on the existing field.

- [ ] **Step 4: Record the popup view UID for Task 5**

Write down the UID from Step 2 — Task 5 needs it verbatim as the value of the
`POPUP_UID_VARIABLE_CONFIG` constant.

---

## Task 3: Shared variable-config editor (`JsField/VariableConfigEditor.js`)

**Files:**
- Create: `JsField/VariableConfigEditor.js`

**Interfaces:**
- Consumes: `ctx.getValue()` (current `variableConfig` array or `null`/`undefined`),
  `ctx.setValue(nextArray)`, `ctx.React`, `ctx.antd`. Generic — works identically whichever
  collection's `variableConfig` field it's bound to (per Task 2, that's both `projectTemplates`
  and `documents`).
- Produces: calls `ctx.setValue()` with an array of
  `{ key, source: "system"|"manual", sourceKey?, label? }` objects — this is the exact shape
  Task 4's `getEffectiveVariableConfig` and Task 5's `resolveVariables` helpers consume.

- [ ] **Step 1: Write the block**

```js
const { React } = ctx;
const { useState } = React;
const { Input, Select, Button, Space, Empty } = ctx.antd;

// Grouped list of system fields a variable can be mapped to. Duplicated verbatim in
// TaskDetailView.js (see docs/superpowers/plans/2026-08-18-task-template-variable-config.md
// Task 5) — this repo's single-file constraint means JsField blocks and page blocks can't
// import a shared module, so both copies must be kept in sync by hand if this catalog changes.
const VARIABLE_CATALOG = {
  case: {
    label: "Hồ sơ",
    fields: [
      { key: "case.caseCode", label: "Số hồ sơ", format: "text" },
      { key: "case.projectName", label: "Tên hồ sơ", format: "text" },
      { key: "case.date", label: "Ngày mở hồ sơ", format: "date" },
      { key: "case.deadline", label: "Hạn hồ sơ", format: "date" },
    ],
  },
  customer: {
    label: "Khách hàng",
    fields: [
      { key: "customer.fullName", label: "Tên đầy đủ khách hàng", format: "text" },
      { key: "customer.shortName", label: "Tên ngắn khách hàng", format: "text" },
      { key: "customer.address", label: "Địa chỉ", format: "text" },
      { key: "customer.phone", label: "Số điện thoại", format: "text" },
      { key: "customer.taxCode", label: "Mã số thuế", format: "text" },
      { key: "customer.identityNumber", label: "Số CCCD/CMND", format: "text" },
      { key: "customer.corporateRepresentative", label: "Người đại diện pháp luật", format: "text" },
    ],
  },
  quotation: {
    label: "Báo giá",
    fields: [
      { key: "quotation.quotationNumber", label: "Số báo giá", format: "text" },
      { key: "quotation.status", label: "Trạng thái báo giá", format: "text" },
      { key: "quotation.description", label: "Mô tả báo giá", format: "text" },
      { key: "quotation.subTotal", label: "Tổng trước VAT", format: "currency" },
      { key: "quotation.vatAmount", label: "Tổng VAT", format: "currency" },
      { key: "quotation.totalAmount", label: "Tổng sau VAT", format: "currency" },
    ],
  },
  contract: {
    label: "Hợp đồng",
    fields: [
      { key: "contract.contractCode", label: "Số hợp đồng", format: "text" },
      { key: "contract.language", label: "Ngôn ngữ hợp đồng", format: "text" },
      { key: "contract.status", label: "Trạng thái hợp đồng", format: "text" },
      { key: "contract.executedAt", label: "Ngày hiệu lực hợp đồng", format: "date" },
    ],
  },
  invoice: {
    label: "Hoá đơn",
    fields: [
      { key: "invoice.invoiceNumber", label: "Số hoá đơn", format: "text" },
      { key: "invoice.issuedDate", label: "Ngày phát hành hoá đơn", format: "date" },
      { key: "invoice.deadline", label: "Hạn thanh toán hoá đơn", format: "date" },
      { key: "invoice.totalAmount", label: "Tổng tiền hoá đơn", format: "currency" },
      { key: "invoice.amountPaid", label: "Đã thanh toán", format: "currency" },
      { key: "invoice.outStandingAmount", label: "Còn lại phải thu", format: "currency" },
      { key: "invoice.status", label: "Trạng thái hoá đơn", format: "text" },
    ],
  },
  payment: {
    label: "Thanh toán",
    fields: [
      { key: "payment.paymentNumber", label: "Số phiếu thanh toán", format: "text" },
      { key: "payment.paymentDate", label: "Ngày thanh toán", format: "date" },
      { key: "payment.amount", label: "Số tiền đã thanh toán", format: "currency" },
      { key: "payment.paymentMethod", label: "Hình thức thanh toán", format: "text" },
      { key: "payment.paymentStatus", label: "Trạng thái thanh toán", format: "text" },
    ],
  },
  task: {
    label: "Công việc",
    fields: [
      { key: "task.title", label: "Tên công việc", format: "text" },
      { key: "task.startDate", label: "Ngày bắt đầu", format: "date" },
      { key: "task.dueDate", label: "Hạn công việc", format: "date" },
      { key: "task.description", label: "Nội dung diễn biến", format: "text" },
    ],
  },
  user: {
    label: "Người dùng",
    fields: [
      { key: "user.nickname", label: "Tên luật sư (nickname)", format: "text" },
      { key: "user.username", label: "Tên đăng nhập", format: "text" },
    ],
  },
  date: {
    label: "Ngày tháng",
    fields: [
      { key: "date.today", label: "Ngày hiện tại", format: "date" },
      { key: "date.day", label: "Ngày (dd)", format: "text" },
      { key: "date.month", label: "Tháng (mm)", format: "text" },
      { key: "date.year", label: "Năm (yyyy)", format: "text" },
    ],
  },
};

const SYSTEM_FIELD_OPTIONS = Object.entries(VARIABLE_CATALOG).flatMap(([groupKey, group]) =>
  group.fields.map((f) => ({
    value: f.key,
    label: `${group.label} — ${f.label}`,
  })),
);

function VariableConfigEditor() {
  const initial = Array.isArray(ctx.getValue()) ? ctx.getValue() : [];
  const [rows, setRows] = useState(initial);

  const commit = (nextRows) => {
    setRows(nextRows);
    ctx.setValue(nextRows);
  };

  const updateRow = (index, patch) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    commit(next);
  };

  const addRow = () => {
    commit([...rows, { key: "", source: "system", sourceKey: "", label: "" }]);
  };

  const removeRow = (index) => {
    commit(rows.filter((_, i) => i !== index));
  };

  return React.createElement(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 8 } },
    rows.length === 0
      ? React.createElement(Empty, {
          description: "Chưa có biến nào",
          image: Empty.PRESENTED_IMAGE_SIMPLE,
        })
      : rows.map((row, index) =>
          React.createElement(
            Space.Compact,
            { key: index, style: { width: "100%" } },
            React.createElement(Input, {
              placeholder: "Tên biến (VD: customer_name)",
              value: row.key,
              style: { width: "22%" },
              onChange: (e) => updateRow(index, { key: e.target.value }),
            }),
            React.createElement(Select, {
              value: row.source,
              style: { width: "18%" },
              options: [
                { value: "system", label: "Hệ thống" },
                { value: "manual", label: "Nhập tay" },
              ],
              onChange: (value) => updateRow(index, { source: value }),
            }),
            row.source === "system"
              ? React.createElement(Select, {
                  placeholder: "Chọn field hệ thống",
                  value: row.sourceKey || undefined,
                  style: { width: "45%" },
                  showSearch: true,
                  optionFilterProp: "label",
                  options: SYSTEM_FIELD_OPTIONS,
                  onChange: (value) => updateRow(index, { sourceKey: value }),
                })
              : React.createElement(Input, {
                  placeholder: "Nhãn hiển thị khi nhập tay (VD: Tên tòa án)",
                  value: row.label,
                  style: { width: "45%" },
                  onChange: (e) => updateRow(index, { label: e.target.value }),
                }),
            React.createElement(Button, {
              danger: true,
              onClick: () => removeRow(index),
              style: { width: "15%" },
              children: "Xoá",
            }),
          ),
        ),
    React.createElement(Button, { type: "dashed", onClick: addRow }, "+ Thêm biến"),
  );
}

ctx.render(React.createElement(VariableConfigEditor));
```

- [ ] **Step 2: Verify syntax**

Run: `node --check "JsField/VariableConfigEditor.js"`
Expected: no output, exit code 0.

- [ ] **Step 3: Manual verification**

Complete Task 2 Step 3 (attach this block to `projectTemplates.variableConfig`) first. Open a
Task Template's edit form in Nocobase Admin, confirm the field now renders this table UI instead
of a raw JSON textarea. Add a row, set source to "Hệ thống", pick e.g. "Khách hàng — Tên đầy đủ
khách hàng", save the form, reopen it, confirm the row persisted with `sourceKey:
"customer.fullName"`. Add a second row with source "Nhập tay" and a label, save, reopen, confirm
it persisted too. Remove a row, save, confirm it's gone.

- [ ] **Step 4: Commit**

```bash
git add "JsField/VariableConfigEditor.js"
git commit -m "feat(VariableConfigEditor): add shared variable-config table editor for template variableConfig fields"
```

---

## Task 4: `TaskDetailView.js` — field plumbing, catalog, and menu entries

**Files:**
- Modify: `All Module/Task/TaskDetailView.js`

**Interfaces:**
- Consumes: `BASE_DOCUMENT_FILE_FIELDS`, `DOCUMENT_KNOWN_RELATION_FIELDS`,
  `fetchTaskDocumentsByIds` (all pre-existing in this file).
- Produces: `VARIABLE_CATALOG` (identical shape/content to Task 3's copy),
  `getEffectiveVariableConfig(doc)`, `POPUP_UID_VARIABLE_CONFIG` — all consumed by Task 5's
  generate modal and by this task's own menu-item wiring.

- [ ] **Step 1: Add the two new document fields to the fetch field lists**

Find (`BASE_DOCUMENT_FILE_FIELDS`, `TaskDetailView.js:1175-1176`):
```js
    const BASE_DOCUMENT_FILE_FIELDS =
      "id,title,documentCode,documentType,batchId,collectionName,sourceCollectionName,sourceTaskId,sourceRecordId,sourceProjectId,recordId,googleDriveUrl,note,createdAt,updatedAt,createdById,updatedById,uploadedById,isDeleted,folderId,caseId,taskId,subTaskId,moduleScope,storageType,legalStudyId,legalReferenceId,internalCompanyId,movedToLegalReferenceAt,movedToLegalReferenceById,fileIndex";
```

Replace with:
```js
    const BASE_DOCUMENT_FILE_FIELDS =
      "id,title,documentCode,documentType,batchId,collectionName,sourceCollectionName,sourceTaskId,sourceRecordId,sourceProjectId,recordId,googleDriveUrl,note,createdAt,updatedAt,createdById,updatedById,uploadedById,isDeleted,folderId,caseId,taskId,subTaskId,moduleScope,storageType,legalStudyId,legalReferenceId,internalCompanyId,movedToLegalReferenceAt,movedToLegalReferenceById,fileIndex,variableConfig,variableConfigMode,sourceProjectTemplateId";
```

Find (`DOCUMENT_KNOWN_RELATION_FIELDS`, `TaskDetailView.js:1187-1188`):
```js
    const DOCUMENT_KNOWN_RELATION_FIELDS =
      "fileAttachment,updatedBy,createdBy,folders,activity_log,sourceProject,sourceTask,users,internalCompany,legalReference,internalTemplates,customers,cases,contracts,quotations,tasks,subTasks,projectInternal,documentShares,legalStudy";
```

Replace with:
```js
    const DOCUMENT_KNOWN_RELATION_FIELDS =
      "fileAttachment,updatedBy,createdBy,folders,activity_log,sourceProject,sourceTask,users,internalCompany,legalReference,internalTemplates,customers,cases,contracts,quotations,tasks,subTasks,projectInternal,documentShares,legalStudy,projectTemplates";
```

Find (`fetchTaskDocumentsByIds`, `TaskDetailView.js:1552-1556`):
```js
          const rows = await listDocumentsWithFieldFallback({
            pageSize: 2000,
            filter: JSON.stringify(filter),
            appends: ["fileAttachment", "createdBy", "updatedBy"],
          });
```

Replace with:
```js
          const rows = await listDocumentsWithFieldFallback({
            pageSize: 2000,
            filter: JSON.stringify(filter),
            appends: ["fileAttachment", "createdBy", "updatedBy", "projectTemplates"],
          });
```

This makes every document row rendered in a task's Attachments panel carry
`variableConfig`, `variableConfigMode`, and (when linked) the full
`projectTemplates` relation object including its own `variableConfig` — everything needed to
compute eligibility without an extra per-file API call.

- [ ] **Step 2: Verify syntax**

Run: `node --check "All Module/Task/TaskDetailView.js"`
Expected: no output, exit code 0.

- [ ] **Step 3: Add the variable catalog + effective-config helper + popup UID constant**

Find (immediately before `async function apiReq`, `TaskDetailView.js:1070-1073`):
```js
    // ============================================================
    // §3 API
    // ============================================================
    async function apiReq(url, method, data) {
```

Insert immediately before that block:
```js
    // ============================================================
    // Task Template variable configuration — Generate flow
    // ============================================================
    // "Cấu hình biến" / "Điền biến & Generate" — see
    // docs/superpowers/specs/2026-08-18-task-template-variable-config-design.md.
    // Popup view UID for the shared documents.variableConfig editor (Task 2/3 of
    // docs/superpowers/plans/2026-08-18-task-template-variable-config.md). Leave "" and this
    // action shows a "Chưa cấu hình Popup UID" warning instead of erroring — same guard as
    // ContractDocxGenerator.js's POPUP_UID_CASE.
    const POPUP_UID_VARIABLE_CONFIG = "";

    // Grouped list of system fields a variable can be mapped to. Duplicated verbatim in
    // JsField/VariableConfigEditor.js — this repo's single-file constraint means these two
    // files can't share a module, so both copies must be kept in sync by hand if this catalog
    // changes.
    const VARIABLE_CATALOG = {
      case: {
        label: "Hồ sơ",
        fields: [
          { key: "case.caseCode", label: "Số hồ sơ", format: "text" },
          { key: "case.projectName", label: "Tên hồ sơ", format: "text" },
          { key: "case.date", label: "Ngày mở hồ sơ", format: "date" },
          { key: "case.deadline", label: "Hạn hồ sơ", format: "date" },
        ],
      },
      customer: {
        label: "Khách hàng",
        fields: [
          { key: "customer.fullName", label: "Tên đầy đủ khách hàng", format: "text" },
          { key: "customer.shortName", label: "Tên ngắn khách hàng", format: "text" },
          { key: "customer.address", label: "Địa chỉ", format: "text" },
          { key: "customer.phone", label: "Số điện thoại", format: "text" },
          { key: "customer.taxCode", label: "Mã số thuế", format: "text" },
          { key: "customer.identityNumber", label: "Số CCCD/CMND", format: "text" },
          { key: "customer.corporateRepresentative", label: "Người đại diện pháp luật", format: "text" },
        ],
      },
      quotation: {
        label: "Báo giá",
        fields: [
          { key: "quotation.quotationNumber", label: "Số báo giá", format: "text" },
          { key: "quotation.status", label: "Trạng thái báo giá", format: "text" },
          { key: "quotation.description", label: "Mô tả báo giá", format: "text" },
          { key: "quotation.subTotal", label: "Tổng trước VAT", format: "currency" },
          { key: "quotation.vatAmount", label: "Tổng VAT", format: "currency" },
          { key: "quotation.totalAmount", label: "Tổng sau VAT", format: "currency" },
        ],
      },
      contract: {
        label: "Hợp đồng",
        fields: [
          { key: "contract.contractCode", label: "Số hợp đồng", format: "text" },
          { key: "contract.language", label: "Ngôn ngữ hợp đồng", format: "text" },
          { key: "contract.status", label: "Trạng thái hợp đồng", format: "text" },
          { key: "contract.executedAt", label: "Ngày hiệu lực hợp đồng", format: "date" },
        ],
      },
      invoice: {
        label: "Hoá đơn",
        fields: [
          { key: "invoice.invoiceNumber", label: "Số hoá đơn", format: "text" },
          { key: "invoice.issuedDate", label: "Ngày phát hành hoá đơn", format: "date" },
          { key: "invoice.deadline", label: "Hạn thanh toán hoá đơn", format: "date" },
          { key: "invoice.totalAmount", label: "Tổng tiền hoá đơn", format: "currency" },
          { key: "invoice.amountPaid", label: "Đã thanh toán", format: "currency" },
          { key: "invoice.outStandingAmount", label: "Còn lại phải thu", format: "currency" },
          { key: "invoice.status", label: "Trạng thái hoá đơn", format: "text" },
        ],
      },
      payment: {
        label: "Thanh toán",
        fields: [
          { key: "payment.paymentNumber", label: "Số phiếu thanh toán", format: "text" },
          { key: "payment.paymentDate", label: "Ngày thanh toán", format: "date" },
          { key: "payment.amount", label: "Số tiền đã thanh toán", format: "currency" },
          { key: "payment.paymentMethod", label: "Hình thức thanh toán", format: "text" },
          { key: "payment.paymentStatus", label: "Trạng thái thanh toán", format: "text" },
        ],
      },
      task: {
        label: "Công việc",
        fields: [
          { key: "task.title", label: "Tên công việc", format: "text" },
          { key: "task.startDate", label: "Ngày bắt đầu", format: "date" },
          { key: "task.dueDate", label: "Hạn công việc", format: "date" },
          { key: "task.description", label: "Nội dung diễn biến", format: "text" },
        ],
      },
      user: {
        label: "Người dùng",
        fields: [
          { key: "user.nickname", label: "Tên luật sư (nickname)", format: "text" },
          { key: "user.username", label: "Tên đăng nhập", format: "text" },
        ],
      },
      date: {
        label: "Ngày tháng",
        fields: [
          { key: "date.today", label: "Ngày hiện tại", format: "date" },
          { key: "date.day", label: "Ngày (dd)", format: "text" },
          { key: "date.month", label: "Tháng (mm)", format: "text" },
          { key: "date.year", label: "Năm (yyyy)", format: "text" },
        ],
      },
    };

    function getVariableCatalogField(sourceKey) {
      const groupKey = String(sourceKey || "").split(".")[0];
      const group = VARIABLE_CATALOG[groupKey];
      return group?.fields.find((f) => f.key === sourceKey) || null;
    }

    // A document's effective variable list: "custom" reads its own variableConfig; "inherited"
    // (or unset, treated the same as inherited for template-cloned rows) reads the live
    // projectTemplates.variableConfig via the relation appended in fetchTaskDocumentsByIds
    // above — never a stale copy.
    function getEffectiveVariableConfig(doc) {
      const mode = doc?.variableConfigMode;
      if (mode === "custom") {
        return Array.isArray(doc?.variableConfig) ? doc.variableConfig : [];
      }
      const cfg = doc?.projectTemplates?.variableConfig;
      return Array.isArray(cfg) ? cfg : [];
    }

    function resolveCatalogValue(context, dotPath) {
      return String(dotPath || "")
        .split(".")
        .reduce((acc, part) => (acc == null ? acc : acc[part]), context);
    }

    function formatCatalogValue(rawValue, format) {
      if (rawValue === null || rawValue === undefined || rawValue === "") return "";
      if (format === "currency") {
        const n = Number(rawValue);
        if (!Number.isFinite(n)) return String(rawValue);
        return Math.round(n).toLocaleString("en-US") + " VND";
      }
      if (format === "date") {
        const d = new Date(rawValue);
        if (Number.isNaN(d.getTime())) return String(rawValue);
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      }
      return String(rawValue);
    }

    // ============================================================
    // §3 API
    // ============================================================
    async function apiReq(url, method, data) {
```

- [ ] **Step 4: Verify syntax**

Run: `node --check "All Module/Task/TaskDetailView.js"`
Expected: no output, exit code 0.

- [ ] **Step 5: Add "Cấu hình biến" / "Điền biến & Generate" menu items**

Find (`fileActionItems` array, `TaskDetailView.js:13879-13920`):
```js
            const fileActionItems = [
              {
                key: "preview",
                icon: TASK_FILE_ACTION_ICONS.preview,
                label: "Preview",
                disabled: !fullUrl,
              },
              {
                key: "download",
                icon: TASK_FILE_ACTION_ICONS.download,
                label: "Download",
                disabled: !fullUrl,
              },
```

Replace with (adds the two new items right after "download", before the existing move/rename
items — `ext` and `f` are already in scope at this point in `renderFileList`):
```js
            const effectiveVariableConfig = getEffectiveVariableConfig(f);
            const fileActionItems = [
              {
                key: "preview",
                icon: TASK_FILE_ACTION_ICONS.preview,
                label: "Preview",
                disabled: !fullUrl,
              },
              {
                key: "download",
                icon: TASK_FILE_ACTION_ICONS.download,
                label: "Download",
                disabled: !fullUrl,
              },
              canEdit &&
                ext === ".docx" && {
                  key: "configure_variables",
                  icon: TASK_FILE_ACTION_ICONS.edit,
                  label: "Cấu hình biến",
                },
              canEdit &&
                ext === ".docx" &&
                effectiveVariableConfig.length > 0 && {
                  key: "generate_variables",
                  icon: TASK_FILE_ACTION_ICONS.preview,
                  label: "Điền biến & Generate",
                },
```

- [ ] **Step 6: Wire the two new menu keys into `handleFileActionClick`**

Find (`TaskDetailView.js:13921-13956`, the end of the existing dispatcher):
```js
              if (key === "edit") {
                setEditingFileId(f.id);
                setEditFileTitle(displayTitle);
              }
            };
```

Replace with:
```js
              if (key === "edit") {
                setEditingFileId(f.id);
                setEditFileTitle(displayTitle);
                return;
              }
              if (key === "configure_variables") {
                if (!POPUP_UID_VARIABLE_CONFIG) {
                  message.warning("Chưa cấu hình Popup UID");
                  return;
                }
                ctx.openView(POPUP_UID_VARIABLE_CONFIG, {
                  mode: "dialog",
                  size: "middle",
                  filterbytk: f.id,
                });
                return;
              }
              if (key === "generate_variables") {
                setGenerateTarget(f);
              }
            };
```

- [ ] **Step 7: Add the `generateTarget` state**

Find (`TaskDetailView.js:13409`):
```js
      const [libraryMoveTarget, setLibraryMoveTarget] = useState(null);
```

Replace with:
```js
      const [libraryMoveTarget, setLibraryMoveTarget] = useState(null);
      const [generateTarget, setGenerateTarget] = useState(null);
```

- [ ] **Step 8: Verify syntax**

Run: `node --check "All Module/Task/TaskDetailView.js"`
Expected: no output, exit code 0.

- [ ] **Step 9: Commit**

```bash
git add "All Module/Task/TaskDetailView.js"
git commit -m "feat(TaskDetailView): add variable catalog, effective-config resolution, and menu entries"
```

---

## Task 5: `TaskDetailView.js` — the Generate modal

**Files:**
- Modify: `All Module/Task/TaskDetailView.js`

**Interfaces:**
- Consumes: `VARIABLE_CATALOG`, `getVariableCatalogField`, `getEffectiveVariableConfig`,
  `resolveCatalogValue`, `formatCatalogValue`, `POPUP_UID_VARIABLE_CONFIG` (all from Task 4);
  `apiReq`, `getCurrentUser`, `uploadTaskAttachment`, `buildTaskUploadDocumentLink`, `extractId`
  (all pre-existing in this file); `generateTarget`/`setGenerateTarget` (Task 4 Step 7).
- Produces: `TaskTemplateGenerateModal` component, rendered from the row component whenever
  `generateTarget` is set.

- [ ] **Step 1: Add the context-fetch + variable-resolution helpers**

Find (immediately after the `formatCatalogValue` function added in Task 4 Step 3, i.e. right
before `// ============================================================\n    // §3 API`):
```js
      return String(rawValue);
    }

    // ============================================================
    // §3 API
    // ============================================================
```

Replace with:
```js
      return String(rawValue);
    }

    // Builds the flat context object VARIABLE_CATALOG's dot-paths resolve against. Always
    // fetches fresh (no caching) so an admin's edit to a linked projectTemplates.variableConfig
    // is reflected the next time Generate is opened — see the design spec §6 step 2.
    async function fetchGenerateContext(task) {
      const safeProjectId = extractId(task?.projectId);
      let project = null;
      if (safeProjectId) {
        const projRes = await ctx.api
          .request({
            url: "projects:get",
            params: {
              filterByTk: safeProjectId,
              fields: "id,caseCode,projectName,date,deadline,contractId,quotationId,customerId,customer",
              appends: ["customer"],
            },
          })
          .catch(() => null);
        project = projRes?.data?.data || projRes?.data || null;
      }

      const [quotationRes, contractRes] = await Promise.all([
        project?.quotationId
          ? ctx.api
              .request({ url: "quotations:get", params: { filterByTk: project.quotationId } })
              .catch(() => null)
          : Promise.resolve(null),
        project?.contractId
          ? ctx.api
              .request({ url: "contracts:get", params: { filterByTk: project.contractId } })
              .catch(() => null)
          : Promise.resolve(null),
      ]);
      const quotation = quotationRes?.data?.data || quotationRes?.data || null;
      const contract = contractRes?.data?.data || contractRes?.data || null;

      let invoice = null;
      if (project?.contractId || project?.quotationId) {
        const filterOr = [];
        if (project.contractId) filterOr.push({ contractId: { $eq: project.contractId } });
        if (project.quotationId) filterOr.push({ quotationId: { $eq: project.quotationId } });
        const invRes = await ctx.api
          .request({
            url: "invoices:list",
            params: {
              pageSize: 1,
              sort: ["-issuedDate"],
              filter: JSON.stringify({ $or: filterOr }),
            },
          })
          .catch(() => null);
        invoice = invRes?.data?.data?.[0] || null;
      }

      let payment = null;
      if (invoice?.id) {
        const payRes = await ctx.api
          .request({
            url: "payments:list",
            params: {
              pageSize: 1,
              sort: ["-paymentDate"],
              filter: JSON.stringify({ invoiceId: { $eq: invoice.id } }),
            },
          })
          .catch(() => null);
        payment = payRes?.data?.data?.[0] || null;
      }

      const currentUser = await getCurrentUser();
      const now = new Date();

      return {
        case: project || {},
        customer: project?.customer || {},
        quotation: quotation || {},
        contract: contract || {},
        invoice: invoice || {},
        payment: payment || {},
        task: task || {},
        user: currentUser || {},
        date: {
          today: now.toISOString(),
          day: String(now.getDate()).padStart(2, "0"),
          month: String(now.getMonth() + 1).padStart(2, "0"),
          year: String(now.getFullYear()),
        },
      };
    }

    // Splits a document's effective variableConfig into { resolved, missing, manualDefs }:
    // resolved = { key: formattedValue } for every "system" variable found in context (or a
    // " ____ " placeholder if the mapped data was empty — same convention ContractDocxGenerator
    // uses for missing customer data); missing = keys whose system data resolved empty (shown to
    // the lawyer as a warning); manualDefs = the "manual" variable definitions, to render as
    // input fields.
    function resolveVariables(variableConfig, context) {
      const resolved = {};
      const missing = [];
      const manualDefs = [];
      (variableConfig || []).forEach((def) => {
        if (def.source === "manual") {
          manualDefs.push(def);
          return;
        }
        const catalogField = getVariableCatalogField(def.sourceKey);
        const rawValue = resolveCatalogValue(context, def.sourceKey);
        const formatted = formatCatalogValue(rawValue, catalogField?.format || "text");
        if (!formatted) missing.push(def.key);
        resolved[def.key] = formatted || " ____ ";
      });
      return { resolved, missing, manualDefs };
    }

    // Fetches the task's own attached .docx (never the projectTemplates source file — see this
    // plan's Global Constraints), fills it with templateData via docxtemplater, returns the
    // rendered blob. Mirrors ContractDocxGenerator.js's buildDocxBlob.
    async function buildFilledDocxBlob(doc, templateData) {
      const PizZipModule = await ctx.importAsync("https://esm.sh/pizzip@3.1.4");
      const PizZip = PizZipModule.default || PizZipModule;
      const DocxModule = await ctx.importAsync("https://esm.sh/docxtemplater@3.37.11");
      const Docxtemplater = DocxModule.default || DocxModule;

      const attachmentObj = doc?.fileAttachment;
      const sourceUrl = Array.isArray(attachmentObj) ? attachmentObj[0]?.url : attachmentObj?.url;
      if (!sourceUrl) throw new Error("Tài liệu này chưa có file đính kèm.");

      const response = await ctx.api.request({
        url: sourceUrl,
        method: "GET",
        responseType: "arraybuffer",
        baseURL: "/",
      });
      const arrayBuffer = response.data;

      const zip = new PizZip(arrayBuffer);
      const rendered = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: "{{", end: "}}" },
      });
      rendered.render(templateData);

      const generatedBlob = rendered.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const baseName = String(doc?.title || "Document").replace(/\.[^/.]+$/, "");
      const fileName = `${baseName}_${Date.now()}.docx`;
      return { generatedBlob, fileName };
    }

    // Detailed error modal for Generate/Save failures — mirrors ContractDocxGenerator.js's
    // showErrorModal so a docxtemplater render error (e.g. a {{tag}} in the .docx with no
    // matching variableConfig entry) surfaces its actual multi-line explanation instead of a
    // generic message. Duplicated here rather than shared, per this repo's single-file
    // constraint.
    function showGenerateError(error) {
      let errorMsg = error?.message || "Unknown error";
      let errorDetails = "";
      if (error?.properties?.errors) {
        errorDetails = error.properties.errors
          .map((e) => (e.properties ? e.properties.explanation || e.message : e.message))
          .join("\n\n");
      }
      Modal.error({
        title: "Generate thất bại",
        content: React.createElement(
          "div",
          { style: { whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 400, overflowY: "auto", fontSize: 13 } },
          React.createElement("strong", { style: { color: "red" } }, errorMsg),
          errorDetails && React.createElement("br"),
          errorDetails,
        ),
        width: 640,
      });
    }

    // ============================================================
    // §3 API
    // ============================================================
```

- [ ] **Step 2: Verify syntax**

Run: `node --check "All Module/Task/TaskDetailView.js"`
Expected: no output, exit code 0.

- [ ] **Step 3: Add the `TaskTemplateGenerateModal` component**

The component must be defined once per row component (not redefined per-file inside
`renderFileList`'s `.map()`), so it's inserted immediately before `renderFileList`'s own
definition rather than inside it.

Find (`TaskDetailView.js:13836`, the start of `renderFileList`):
```js
      const renderFileList = (
        files,
        emptyMsg = "No attached files yet.",
        hideTime = false,
      ) => {
```

Insert immediately before it:
```js
      const TaskTemplateGenerateModal = ({ doc, task, projectFolderId, onClose, onSaved }) => {
        const [loading, setLoading] = useState(true);
        const [context, setContext] = useState(null);
        const [manualDefs, setManualDefs] = useState([]);
        const [manualValues, setManualValues] = useState({});
        const [missingKeys, setMissingKeys] = useState([]);
        const [generating, setGenerating] = useState(false);
        const [saving, setSaving] = useState(false);
        const [previewUrl, setPreviewUrl] = useState(null);
        const [previewBlob, setPreviewBlob] = useState(null);
        const [previewFileName, setPreviewFileName] = useState("");
        const [previewAttId, setPreviewAttId] = useState(null);

        useEffect(() => {
          let cancelled = false;
          (async () => {
            setLoading(true);
            const ctxData = await fetchGenerateContext(task);
            if (cancelled) return;
            const variableConfig = getEffectiveVariableConfig(doc);
            const { missing, manualDefs: defs } = resolveVariables(variableConfig, ctxData);
            setContext(ctxData);
            setMissingKeys(missing);
            setManualDefs(defs);
            setManualValues(Object.fromEntries(defs.map((d) => [d.key, ""])));
            setLoading(false);
          })();
          return () => {
            cancelled = true;
          };
        }, [doc?.id, task?.id]);

        const buildTemplateData = () => {
          const variableConfig = getEffectiveVariableConfig(doc);
          const { resolved } = resolveVariables(variableConfig, context);
          manualDefs.forEach((def) => {
            resolved[def.key] = manualValues[def.key] || " ____ ";
          });
          return resolved;
        };

        const handleGenerate = async () => {
          setGenerating(true);
          try {
            const templateData = buildTemplateData();
            const { generatedBlob, fileName } = await buildFilledDocxBlob(doc, templateData);
            const attachment = await uploadTaskAttachment(generatedBlob, fileName);
            let fullUrl = attachment.url;
            if (fullUrl && fullUrl.startsWith("/")) {
              fullUrl = window.location.origin + fullUrl;
            }
            setPreviewBlob(generatedBlob);
            setPreviewUrl(fullUrl);
            setPreviewFileName(fileName);
            setPreviewAttId(attachment.id);
          } catch (error) {
            showGenerateError(error);
          } finally {
            setGenerating(false);
          }
        };

        const handleSave = async () => {
          setSaving(true);
          try {
            let attId = previewAttId;
            let fileName = previewFileName;
            if (!attId) {
              const templateData = buildTemplateData();
              const built = await buildFilledDocxBlob(doc, templateData);
              fileName = built.fileName;
              const attachment = await uploadTaskAttachment(built.generatedBlob, fileName);
              attId = attachment.id;
            }
            const currentUser = context?.user;
            const now = new Date().toISOString();
            await apiReq("documents:create", "POST", {
              title: fileName,
              documentType: "Generated",
              folderId: extractId(projectFolderId),
              fileAttachment: { id: attId },
              note: `Generated from "${doc?.title || "template"}" by ${currentUser?.nickname || currentUser?.username || "System"} at ${new Date().toLocaleTimeString("en-GB")} on ${new Date().toLocaleDateString("en-GB")}`,
              createdById: currentUser?.id || null,
              updatedById: currentUser?.id || null,
              createdAt: now,
              updatedAt: now,
              ...buildTaskUploadDocumentLink("Task", task?.id, { folderId: projectFolderId }),
            });
            message.success("Đã lưu tài liệu vào task");
            if (onSaved) onSaved();
            onClose();
          } catch (error) {
            showGenerateError(error);
          } finally {
            setSaving(false);
          }
        };

        return React.createElement(
          Modal,
          {
            title: `Điền biến & Generate — ${doc?.title || ""}`,
            open: true,
            onCancel: onClose,
            width: previewUrl ? "80%" : 640,
            footer: previewUrl
              ? [
                  React.createElement(
                    Button,
                    { key: "close", onClick: onClose },
                    "Đóng",
                  ),
                  React.createElement(
                    Button,
                    { key: "save", type: "primary", loading: saving, onClick: handleSave },
                    "Lưu vào Documents",
                  ),
                ]
              : [
                  React.createElement(
                    Button,
                    { key: "cancel", onClick: onClose },
                    "Huỷ",
                  ),
                  React.createElement(
                    Button,
                    {
                      key: "generate",
                      type: "primary",
                      loading: generating,
                      disabled: loading,
                      onClick: handleGenerate,
                    },
                    "Generate & Preview",
                  ),
                ],
          },
          loading
            ? React.createElement(Spin)
            : previewUrl
              ? React.createElement("iframe", {
                  src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`,
                  width: "100%",
                  height: "70vh",
                  frameBorder: "0",
                })
              : React.createElement(
                  "div",
                  { style: { display: "flex", flexDirection: "column", gap: 12 } },
                  missingKeys.length > 0 &&
                    React.createElement(
                      "div",
                      { style: { color: "#d46b08", fontSize: 12 } },
                      `Thiếu dữ liệu hệ thống cho: ${missingKeys.join(", ")} — các biến này sẽ để trống trong file.`,
                    ),
                  manualDefs.length === 0
                    ? React.createElement(
                        "div",
                        { style: { color: "#8c8c8c", fontSize: 12 } },
                        "Toàn bộ biến đều lấy tự động từ hệ thống.",
                      )
                    : manualDefs.map((def) =>
                        React.createElement(
                          "div",
                          { key: def.key, style: { display: "flex", flexDirection: "column", gap: 4 } },
                          React.createElement("label", { style: { fontSize: 12, fontWeight: 600 } }, def.label || def.key),
                          React.createElement(Input, {
                            value: manualValues[def.key] || "",
                            onChange: (e) =>
                              setManualValues((prev) => ({ ...prev, [def.key]: e.target.value })),
                          }),
                        ),
                      ),
                ),
        );
      };

      const renderFileList = (
        files,
        emptyMsg = "No attached files yet.",
        hideTime = false,
      ) => {
```

- [ ] **Step 4: Render the modal from the row component**

Find (`TaskDetailView.js:15238-15258`, the existing `libraryMoveTarget` modal render — the last
conditional modal in this row component's returned tree):
```js
          libraryMoveTarget &&
            React.createElement(LibraryMoveModal, {
              open: !!libraryMoveTarget,
              record: libraryMoveTarget.record,
              destinationType: libraryMoveTarget.destinationType,
              sourceContext: legalStudyTaskContext,
              currentUser,
              onClose: () => setLibraryMoveTarget(null),
              onSuccess: (updatedFile) => {
                setLibraryMoveTarget(null);
                if (onUpdate && updatedFile?._type !== "folder") {
                  const updatedFiles = allFiles.map((file) =>
                    file.id === updatedFile.id ? { ...file, ...updatedFile } : file,
                  );
                  onUpdate({ ...item, _files: updatedFiles });
                } else {
                  reloadAttachments();
                }
                setCmtRefreshTrigger((v) => v + 1);
              },
            }),
        );
      }
    };
```

Replace with (adds the new modal as a sibling right after `libraryMoveTarget`'s, reusing the
same `reloadAttachments()` helper `LibraryMoveModal`'s own success handler falls back to — the
simplest correct way to pick up the newly-created document without hand-splicing `allFiles`):
```js
          libraryMoveTarget &&
            React.createElement(LibraryMoveModal, {
              open: !!libraryMoveTarget,
              record: libraryMoveTarget.record,
              destinationType: libraryMoveTarget.destinationType,
              sourceContext: legalStudyTaskContext,
              currentUser,
              onClose: () => setLibraryMoveTarget(null),
              onSuccess: (updatedFile) => {
                setLibraryMoveTarget(null);
                if (onUpdate && updatedFile?._type !== "folder") {
                  const updatedFiles = allFiles.map((file) =>
                    file.id === updatedFile.id ? { ...file, ...updatedFile } : file,
                  );
                  onUpdate({ ...item, _files: updatedFiles });
                } else {
                  reloadAttachments();
                }
                setCmtRefreshTrigger((v) => v + 1);
              },
            }),
          generateTarget &&
            React.createElement(TaskTemplateGenerateModal, {
              key: "generate-modal",
              doc: generateTarget,
              task: type === "task" ? item : parentTaskForSubtask || item,
              projectFolderId,
              onClose: () => setGenerateTarget(null),
              onSaved: () => {
                reloadAttachments();
                setCmtRefreshTrigger((v) => v + 1);
              },
            }),
        );
      }
    };
```

(`type`, `item`, `parentTaskForSubtask`, `projectFolderId`, `reloadAttachments`, and
`setCmtRefreshTrigger` are all already in scope in this row component per the code read at
`TaskDetailView.js:13361-13459`.)

- [ ] **Step 5: Verify syntax**

Run: `node --check "All Module/Task/TaskDetailView.js"`
Expected: no output, exit code 0.

- [ ] **Step 6: Manual verification**

Prerequisite: Tasks 1-4 deployed, `POPUP_UID_VARIABLE_CONFIG` filled in with the real UID from
Task 2.

- On a task whose attached `.docx` document has `variableConfigMode = "inherited"` and its
  linked Task Template has a non-empty `variableConfig` (configure one via Task 3's editor if
  needed): confirm the file's action menu shows "Điền biến & Generate". Click it, confirm the
  modal loads, shows a warning line for any system field that resolved empty, shows input boxes
  for every "manual" variable. Click "Generate & Preview" — confirm the Office Online preview
  renders with the case/customer data filled in and the manual values you typed. Click "Lưu vào
  Documents" — confirm a new document appears in the task's Attachments (the original template
  file is untouched).
- Edit the linked Task Template's `variableConfig` (via Task 3's editor) to add a new system
  variable. Reopen "Điền biến & Generate" on the same task's document — confirm the new variable
  now appears/resolves, proving the read is live, not cached.
- On a document with no `sourceProjectTemplateId` (upload a fresh file to any task via the
  existing upload flow): confirm "Điền biến & Generate" is **absent** until you use "Cấu hình
  biến" to add at least one variable (opens Task 2's popup view — confirm it saves against this
  specific document, not the Task Template).
- Trigger a docxtemplater error deliberately (put a `{{not_a_configured_key}}` tag in a test
  `.docx` template that isn't in its `variableConfig`) and confirm Generate surfaces a readable
  error instead of silently failing.

- [ ] **Step 7: Commit**

```bash
git add "All Module/Task/TaskDetailView.js"
git commit -m "feat(TaskDetailView): add Generate flow — fill task template variables and save as new document"
```
