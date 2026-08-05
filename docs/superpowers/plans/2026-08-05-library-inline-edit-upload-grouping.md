# Library.js Inline Edit Metadata & Upload Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In `All Module/Document/Library.js`, make 8 document/folder metadata
fields editable inline in Table view (Description, Document Type, Document
Code, Opening/Signed/Effective Date, Sender, Recipient), and let a multi-file
upload optionally group all selected files into one new folder instead of
uploading them as separate files in the current folder.

**Architecture:** A new self-contained `InlineEditCell` component (click to
edit, Enter/blur to save, Escape to cancel, no field required) replaces the
static `<Text>` renders in `tableColumns`' Description column (3 places) and
`buildDocMetaColumns()` (already exists, currently read-only — 7 fields).
Saves go through one new `saveRecordField(record, field, value)` helper that
calls `folders:update`/`documents:update` directly via `ctx.api.request`,
mirroring the existing `handleSaveFileTitle` pattern. For upload grouping,
`DocumentUploadFieldsModal` gets a mode toggle; when "grouped" is chosen,
`handleConfirmUploadFields` creates the folder first (via a newly extracted
`applyFolderSpacePayload` helper, shared with `handleCreateFolder`) and then
calls the existing `uploadFilesToTarget` unchanged with the new folder's id.

**Tech Stack:** React (via `ctx.React`), Ant Design (via `ctx.antd`) — no
build step, no test framework. This is a Nocobase JS Field block: the whole
file is pasted into the Nocobase block editor and runs in-browser. All code
for both features lives in this single file (see
`[[nocobase_single_file_constraint]]` — no splitting into modules/imports).

## Global Constraints

- No automated test suite exists in this repo (`package.json` has no
  test runner). "Run the test" steps below mean: run the file through
  `@babel/parser` (already a project dependency) with the `jsx` plugin to
  catch syntax errors — this is the same check used earlier in this session
  for `CaseDocument.js`. Final behavioral verification is manual, in the
  Nocobase UI (Task 7).
- Every new/edited API call must go through `ctx.api.request` directly (no
  `fetch()`), matching every existing call in this file.
- Every new UI element must use `ctx.antd` components already destructured
  at the top of the file (add `Radio` to that destructure — Task 4) or
  imported the same way — never a raw HTML `<select>`/`<input>` outside of
  what's already used for the two hidden `<input type="file">` pickers.
- Inline-edit permission = `getRecordPerms(record).canRename` — do **not**
  layer `isRenameLockedFolder(record)` on top (that lock is name-only, see
  spec `docs/superpowers/specs/2026-08-05-library-inline-edit-upload-grouping-design.md`
  Phần 1).
- No inline edit in `activeSpace === "trash"` — leave those 3 Description
  columns (trash branches) untouched.
- Every mutation ends with `loadData()` (or relies on a helper that already
  calls it, e.g. `uploadFilesToTarget`) — never hand-patch local state,
  matching the rest of the file's convention.

---

## Task 1: `InlineEditCell` component

**Files:**
- Modify: `All Module/Document/Library.js` (insert after line 4508, the
  closing `};` of `DocumentUploadFieldsModal`, before the
  `DocumentPickerField` comment block at line 4510)

**Interfaces:**
- Produces: `InlineEditCell({ value, type, canEdit, onSave, placeholder })`
  — `type: "text" | "textarea" | "date"` (default `"text"`), `onSave: (v)
  => Promise<void>` (must throw/reject on failure — the component relies on
  that to stay in edit mode), `placeholder` defaults to `"—"`.
- Produces: `toDateInputValue(value)` — converts any stored date value to
  the `YYYY-MM-DD` string an `<input type="date">` needs.
- Consumes: module-level `Text` (from `Typography`, line 31), `Input` (line
  11 destructure), `formatDate` (module-level function, line 2550),
  `useState` (line 5 destructure).

- [ ] **Step 1: Insert the component**

Insert this block immediately after line 4508 (`  };` closing
`DocumentUploadFieldsModal`) and before the `DocumentPickerField` comment:

```javascript

  // Formats any stored date value into the "YYYY-MM-DD" shape a native
  // <input type="date"> needs for its `value` — display formatting still
  // goes through formatDate().
  const toDateInputValue = (value) => (value ? String(value).slice(0, 10) : "");

  // Generic click-to-edit cell for Library.js's Table view — used by the
  // Description column and buildDocMetaColumns() so those 8 fields don't
  // each need their own copy of the open/save/cancel state machine that
  // editingTitleId/handleSaveFileTitle already owns for the Name column.
  // Each instance owns its own edit state (not a shared editingCell state)
  // since every call site already has a fully-formed onSave callback bound
  // to its own (record, field) pair.
  const InlineEditCell = ({
    value,
    type = "text",
    canEdit,
    onSave,
    placeholder = "—",
  }) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const [saving, setSaving] = useState(false);

    const displayValue =
      type === "date"
        ? value
          ? formatDate(value)
          : placeholder
        : value || placeholder;

    if (!canEdit) {
      return <Text type="secondary">{displayValue}</Text>;
    }

    if (!editing) {
      return (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setDraft(type === "date" ? toDateInputValue(value) : value || "");
            setEditing(true);
          }}
          style={{
            cursor: "pointer",
            display: "inline-block",
            minHeight: 20,
            borderBottom: "1px dashed transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderBottomColor = "#D1D5DB";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderBottomColor = "transparent";
          }}
        >
          <Text type="secondary">{displayValue}</Text>
        </div>
      );
    }

    const commit = async () => {
      if (saving) return;
      setSaving(true);
      try {
        await onSave(type === "date" ? draft || null : draft);
        setEditing(false);
      } catch (e) {
        // onSave already shows message.error — stay in edit mode so the
        // user can fix the value and retry instead of losing it.
      } finally {
        setSaving(false);
      }
    };

    const cancel = () => setEditing(false);

    if (type === "textarea") {
      return (
        <Input.TextArea
          size="small"
          autoFocus
          autoSize={{ minRows: 1, maxRows: 4 }}
          value={draft}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
          }}
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    return (
      <Input
        size="small"
        type={type === "date" ? "date" : "text"}
        autoFocus
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onPressEnter={commit}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") cancel();
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  };

```

- [ ] **Step 2: Verify syntax**

Run:

```bash
node -e "
const fs = require('fs');
const { parse } = require('@babel/parser');
const code = fs.readFileSync('All Module/Document/Library.js', 'utf8');
try {
  parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log('OK: parses cleanly');
} catch (e) {
  console.log('PARSE ERROR:', e.message);
}
"
```

Expected: `OK: parses cleanly`

- [ ] **Step 3: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "feat: add InlineEditCell component to Library.js"
```

---

## Task 2: `saveRecordField` helper

**Files:**
- Modify: `All Module/Document/Library.js` (insert after line 9327, the
  closing `};` of `handleSaveFileTitle`, before `const showDeleteConfirm`)

**Interfaces:**
- Produces: `saveRecordField(record, field, value)` — `async`, throws on
  failure (after showing `message.error`) so `InlineEditCell`'s `commit()`
  knows to stay in edit mode.
- Consumes: `extractId`, `getCurrentUserId` (module-level), `loadData`,
  `message` (component/module scope, already in use next to the insertion
  point).

- [ ] **Step 1: Insert the helper**

Insert immediately after line 9327 (the `};` that closes
`handleSaveFileTitle`) and before `const showDeleteConfirm = (folder) => {`:

```javascript

    // Generic single-field save for InlineEditCell — folders only ever
    // get "description" through this path; files can get any of the 8
    // fields the Table's Description column / buildDocMetaColumns() offer.
    const saveRecordField = async (record, field, value) => {
      try {
        const isFolder = record._type === "folder";
        const userId = getCurrentUserId();
        await ctx.api.request({
          url: isFolder
            ? `folders:update?filterByTk=${extractId(record)}`
            : `documents:update?filterByTk=${extractId(record)}`,
          method: "POST",
          data: {
            [field]: value,
            updatedAt: new Date().toISOString(),
            ...(userId ? { updatedById: userId } : {}),
          },
        });
        loadData();
      } catch (e) {
        message.error("Failed to update");
        throw e;
      }
    };

```

- [ ] **Step 2: Verify syntax**

Run the same babel-parse command as Task 1 Step 2. Expected: `OK: parses
cleanly`

- [ ] **Step 3: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "feat: add saveRecordField helper to Library.js"
```

---

## Task 3: Wire `InlineEditCell` into the Table columns

**Files:**
- Modify: `All Module/Document/Library.js` — 3 Description column renders
  (lines ~10602-10609 and ~10838-10845, byte-identical, plus ~11021-11028
  with different indentation) and `buildDocMetaColumns()` (lines
  10653-10736)

**Interfaces:**
- Consumes: `InlineEditCell` (Task 1), `saveRecordField` (Task 2),
  `getRecordPerms` (existing, line 6865) — all already in scope at every
  edit site below (same `InternalTemplates` component body).

- [ ] **Step 1: Replace the two identical non-trash Description columns**

These two blocks (isAllFolders non-trash return, and isAllFiles non-trash
return) currently have **exactly** this text — use `replace_all: true` so
both are updated in one edit (the replacement is type-agnostic: it works
correctly for a folder row and a file row alike, since `getRecordPerms`
already branches internally on `record._type`):

Old (appears twice, identical):
```javascript
          {
            title: "Description",
            key: "description",
            minWidth: 200,
            render: (_, record) => (
              <Text type="secondary">{record.description || "—"}</Text>
            ),
          },
```

New:
```javascript
          {
            title: "Description",
            key: "description",
            minWidth: 200,
            render: (_, record) => (
              <InlineEditCell
                type="textarea"
                value={record.description}
                canEdit={getRecordPerms(record).canRename}
                onSave={(v) => saveRecordField(record, "description", v)}
              />
            ),
          },
```

- [ ] **Step 2: Replace the mixed-view non-trash Description column**

This one has different (less nested) indentation — it's the final `return
[...]` at the bottom of `tableColumns`, not inside an `if` block:

Old:
```javascript
        {
          title: "Description",
          key: "description",
          minWidth: 200,
          render: (_, record) => (
            <Text type="secondary">{record.description || "—"}</Text>
          ),
        },
```

New:
```javascript
        {
          title: "Description",
          key: "description",
          minWidth: 200,
          render: (_, record) => (
            <InlineEditCell
              type="textarea"
              value={record.description}
              canEdit={getRecordPerms(record).canRename}
              onSave={(v) => saveRecordField(record, "description", v)}
            />
          ),
        },
```

- [ ] **Step 3: Replace `buildDocMetaColumns()` with editable versions**

`buildDocMetaColumns()` is defined once (right after the `isAllFolders`
branch's early `return`) and consumed via `...buildDocMetaColumns()` in
exactly 2 places (`isAllFiles` non-trash return, and the final mixed
non-trash `return`) — editing the function body here updates both call
sites automatically.

Old (full current function, lines 10653-10736):
```javascript
      // Cột thông tin tài liệu (loại, mã, ngày, các bên liên quan) — cùng bộ
      // field được thu thập ở modal upload (DocumentUploadFieldsModal).
      const buildDocMetaColumns = () => [
        {
          title: "Document Type",
          key: "documentType",
          width: 140,
          render: (_, record) => (
            <Text type="secondary">
              {record._type === "file" ? record.documentType || "—" : "—"}
            </Text>
          ),
        },
        {
          title: "Document Code",
          key: "documentCode",
          width: 140,
          render: (_, record) => (
            <Text type="secondary">
              {record._type === "file" ? record.documentCode || "—" : "—"}
            </Text>
          ),
        },
        {
          title: "Opening Date",
          key: "openingDate",
          width: 120,
          sorter: (a, b) =>
            new Date(a.openingDate || 0) - new Date(b.openingDate || 0),
          render: (_, record) => (
            <Text type="secondary">
              {record._type === "file" && record.openingDate
                ? formatDate(record.openingDate)
                : "—"}
            </Text>
          ),
        },
        {
          title: "Signed Date",
          key: "signedAt",
          width: 120,
          sorter: (a, b) =>
            new Date(a.signedAt || 0) - new Date(b.signedAt || 0),
          render: (_, record) => (
            <Text type="secondary">
              {record._type === "file" && record.signedAt
                ? formatDate(record.signedAt)
                : "—"}
            </Text>
          ),
        },
        {
          title: "Effective Date",
          key: "effectiveAt",
          width: 130,
          sorter: (a, b) =>
            new Date(a.effectiveAt || 0) - new Date(b.effectiveAt || 0),
          render: (_, record) => (
            <Text type="secondary">
              {record._type === "file" && record.effectiveAt
                ? formatDate(record.effectiveAt)
                : "—"}
            </Text>
          ),
        },
        {
          title: "Sender",
          key: "senderName",
          width: 150,
          render: (_, record) => (
            <Text type="secondary">
              {record._type === "file" ? record.senderName || "—" : "—"}
            </Text>
          ),
        },
        {
          title: "Recipient",
          key: "recipientName",
          width: 150,
          render: (_, record) => (
            <Text type="secondary">
              {record._type === "file" ? record.recipientName || "—" : "—"}
            </Text>
          ),
        },
      ];
```

New:
```javascript
      // Cột thông tin tài liệu (loại, mã, ngày, các bên liên quan) — cùng bộ
      // field được thu thập ở modal upload (DocumentUploadFieldsModal).
      // Editable via InlineEditCell for file rows only — folders don't
      // carry these fields, so folder rows always show a static "—".
      const buildDocMetaColumns = () => [
        {
          title: "Document Type",
          key: "documentType",
          width: 140,
          render: (_, record) =>
            record._type === "file" ? (
              <InlineEditCell
                value={record.documentType}
                canEdit={getRecordPerms(record).canRename}
                onSave={(v) => saveRecordField(record, "documentType", v)}
              />
            ) : (
              <Text type="secondary">—</Text>
            ),
        },
        {
          title: "Document Code",
          key: "documentCode",
          width: 140,
          render: (_, record) =>
            record._type === "file" ? (
              <InlineEditCell
                value={record.documentCode}
                canEdit={getRecordPerms(record).canRename}
                onSave={(v) => saveRecordField(record, "documentCode", v)}
              />
            ) : (
              <Text type="secondary">—</Text>
            ),
        },
        {
          title: "Opening Date",
          key: "openingDate",
          width: 120,
          sorter: (a, b) =>
            new Date(a.openingDate || 0) - new Date(b.openingDate || 0),
          render: (_, record) =>
            record._type === "file" ? (
              <InlineEditCell
                type="date"
                value={record.openingDate}
                canEdit={getRecordPerms(record).canRename}
                onSave={(v) => saveRecordField(record, "openingDate", v)}
              />
            ) : (
              <Text type="secondary">—</Text>
            ),
        },
        {
          title: "Signed Date",
          key: "signedAt",
          width: 120,
          sorter: (a, b) =>
            new Date(a.signedAt || 0) - new Date(b.signedAt || 0),
          render: (_, record) =>
            record._type === "file" ? (
              <InlineEditCell
                type="date"
                value={record.signedAt}
                canEdit={getRecordPerms(record).canRename}
                onSave={(v) => saveRecordField(record, "signedAt", v)}
              />
            ) : (
              <Text type="secondary">—</Text>
            ),
        },
        {
          title: "Effective Date",
          key: "effectiveAt",
          width: 130,
          sorter: (a, b) =>
            new Date(a.effectiveAt || 0) - new Date(b.effectiveAt || 0),
          render: (_, record) =>
            record._type === "file" ? (
              <InlineEditCell
                type="date"
                value={record.effectiveAt}
                canEdit={getRecordPerms(record).canRename}
                onSave={(v) => saveRecordField(record, "effectiveAt", v)}
              />
            ) : (
              <Text type="secondary">—</Text>
            ),
        },
        {
          title: "Sender",
          key: "senderName",
          width: 150,
          render: (_, record) =>
            record._type === "file" ? (
              <InlineEditCell
                value={record.senderName}
                canEdit={getRecordPerms(record).canRename}
                onSave={(v) => saveRecordField(record, "senderName", v)}
              />
            ) : (
              <Text type="secondary">—</Text>
            ),
        },
        {
          title: "Recipient",
          key: "recipientName",
          width: 150,
          render: (_, record) =>
            record._type === "file" ? (
              <InlineEditCell
                value={record.recipientName}
                canEdit={getRecordPerms(record).canRename}
                onSave={(v) => saveRecordField(record, "recipientName", v)}
              />
            ) : (
              <Text type="secondary">—</Text>
            ),
        },
      ];
```

- [ ] **Step 4: Add `saveRecordField` to the `tableColumns` useMemo dependency array**

Find the dependency array closing `tableColumns`'s `useMemo` (currently
ends `..., getRecordPerms,\n    ]);`) and add `saveRecordField` next to
`getRecordPerms`:

Old:
```javascript
      getFolderSize,
      getRecordPerms,
    ]);
```

New:
```javascript
      getFolderSize,
      getRecordPerms,
      saveRecordField,
    ]);
```

- [ ] **Step 5: Verify syntax**

Run the same babel-parse command as Task 1 Step 2. Expected: `OK: parses
cleanly`

- [ ] **Step 6: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "feat: make Description and document-meta table columns inline-editable"
```

---

## Task 4: Upload-mode toggle in `DocumentUploadFieldsModal`

**Files:**
- Modify: `All Module/Document/Library.js`
  - Line ~28 (antd destructure) — add `Radio`
  - Lines 4331-4508 (`DocumentUploadFieldsModal`) — add mode state, UI, and
    include the new fields in `onSubmit`'s payload

**Interfaces:**
- Produces: `onSubmit` (the existing prop) now also receives
  `uploadMode: "separate" | "grouped"` and `groupFolderName: string` in its
  metadata object, in addition to the 8 existing fields
  (`title`/`documentType`/.../`description`).
- Consumes: `Radio` (newly added to the `ctx.antd` destructure).

- [ ] **Step 1: Add `Radio` to the antd destructure**

Old:
```javascript
    Dropdown,
    Checkbox,
    DatePicker,
  } = ctx.antd;
```

New:
```javascript
    Dropdown,
    Checkbox,
    DatePicker,
    Radio,
  } = ctx.antd;
```

- [ ] **Step 2: Add `uploadMode` state and reset it on open**

Old:
```javascript
  const DocumentUploadFieldsModal = ({ open, files = [], onClose, onSubmit }) => {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
      if (open) {
        form.resetFields();
        // Chỉ gán mặc định tên tài liệu = tên file (không kèm đuôi mở rộng)
        // khi upload đúng 1 file — khớp với logic applyTitleOverride trong
        // uploadFilesToTarget (chỉ override title khi upload 1 file duy nhất).
        if (files.length === 1) {
          const rawName = files[0].name;
          const dotIndex = rawName.lastIndexOf(".");
          const nameWithoutExt =
            dotIndex > 0 ? rawName.slice(0, dotIndex) : rawName;
          form.setFieldsValue({ title: nameWithoutExt });
        }
        setSubmitting(false);
      }
    }, [open, files]);
```

New:
```javascript
  const DocumentUploadFieldsModal = ({ open, files = [], onClose, onSubmit }) => {
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    // "grouped" only ever offered when files.length > 1 (see the
    // Radio.Group below) — irrelevant, but harmless, for single-file
    // submits since handleConfirmUploadFields only reads it when grouping.
    const [uploadMode, setUploadMode] = useState("separate");

    useEffect(() => {
      if (open) {
        form.resetFields();
        setUploadMode("separate");
        // Chỉ gán mặc định tên tài liệu = tên file (không kèm đuôi mở rộng)
        // khi upload đúng 1 file — khớp với logic applyTitleOverride trong
        // uploadFilesToTarget (chỉ override title khi upload 1 file duy nhất).
        if (files.length === 1) {
          const rawName = files[0].name;
          const dotIndex = rawName.lastIndexOf(".");
          const nameWithoutExt =
            dotIndex > 0 ? rawName.slice(0, dotIndex) : rawName;
          form.setFieldsValue({ title: nameWithoutExt });
        }
        setSubmitting(false);
      }
    }, [open, files]);
```

- [ ] **Step 3: Include the new fields in `handleOk`'s submit payload**

Old:
```javascript
    const handleOk = async () => {
      let values = {};
      try {
        values = await form.validateFields();
      } catch {
        return;
      }
      setSubmitting(true);
      try {
        await onSubmit({
          title: values.title?.trim() || "",
          documentType: values.documentType?.trim() || "",
          documentCode: values.documentCode?.trim() || "",
          openingDate: values.openingDate || "",
          signedAt: values.signedAt || "",
          effectiveAt: values.effectiveAt || "",
          senderName: values.senderName?.trim() || "",
          recipientName: values.recipientName?.trim() || "",
          description: values.description?.trim() || "",
        });
      } finally {
        setSubmitting(false);
      }
    };
```

New:
```javascript
    const handleOk = async () => {
      let values = {};
      try {
        values = await form.validateFields();
      } catch {
        return;
      }
      setSubmitting(true);
      try {
        await onSubmit({
          title: values.title?.trim() || "",
          documentType: values.documentType?.trim() || "",
          documentCode: values.documentCode?.trim() || "",
          openingDate: values.openingDate || "",
          signedAt: values.signedAt || "",
          effectiveAt: values.effectiveAt || "",
          senderName: values.senderName?.trim() || "",
          recipientName: values.recipientName?.trim() || "",
          description: values.description?.trim() || "",
          uploadMode,
          groupFolderName: values.groupFolderName?.trim() || "",
        });
      } finally {
        setSubmitting(false);
      }
    };
```

- [ ] **Step 4: Add the Radio.Group + conditional Folder Name field to the JSX**

`Form.Item` must be nested inside `<Form>` to register with it, so this
moves the `<Form>` opening tag to before the `Selected file(s)` div and
inserts the new block as the first two children. Everything from `<Row
gutter={12}>` onward (immediately after the old `<Form ...>` line) is
**not** touched by this edit and needs no reindentation — it was already
sitting at the correct indentation as `<Form>`'s children.

Old:
```javascript
        <div
          style={{
            fontFamily: FONT,
            marginBottom: 12,
            fontSize: 12,
            color: "#6B7280",
          }}
        >
          Selected file(s): <b>{fileNames || "—"}</b>
          {files.length > 1 && (
            <div style={{ marginTop: 4 }}>
              The information below will be applied to all {files.length} files
              (the document name will keep each file's own name if left blank).
            </div>
          )}
        </div>
        <Form form={form} layout="vertical" style={{ fontFamily: FONT }}>
```

New:
```javascript
        <Form form={form} layout="vertical" style={{ fontFamily: FONT }}>
          <div
            style={{
              fontFamily: FONT,
              marginBottom: 12,
              fontSize: 12,
              color: "#6B7280",
            }}
          >
            Selected file(s): <b>{fileNames || "—"}</b>
            {files.length > 1 && (
              <div style={{ marginTop: 4 }}>
                The information below will be applied to all {files.length} files
                (the document name will keep each file's own name if left blank).
              </div>
            )}
          </div>
          {files.length > 1 && (
            <div style={{ marginBottom: 16 }}>
              <Radio.Group
                value={uploadMode}
                onChange={(e) => setUploadMode(e.target.value)}
                style={{ fontFamily: FONT }}
              >
                <Radio value="separate">Upload as separate files</Radio>
                <Radio value="grouped">Group into a new folder</Radio>
              </Radio.Group>
              {uploadMode === "grouped" && (
                <Form.Item
                  name="groupFolderName"
                  label="Folder Name"
                  style={{ marginTop: 8, marginBottom: 0 }}
                  rules={[
                    { required: true, message: "Please enter a folder name" },
                  ]}
                >
                  <Input
                    allowClear
                    placeholder="Enter the new folder's name..."
                    style={{ fontFamily: FONT }}
                  />
                </Form.Item>
              )}
            </div>
          )}
```

After this edit, the file reads (unchanged lines shown for context, not
part of this edit):
```javascript
        <Form form={form} layout="vertical" style={{ fontFamily: FONT }}>
          <div>...</div>
          {files.length > 1 && (...)}
          <Row gutter={12}>
            ...
          </Row>
          ...
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} allowClear placeholder="Summarize the main content..." />
          </Form.Item>
        </Form>
      </Modal>
    );
  };
```

- [ ] **Step 5: Verify syntax**

Run the same babel-parse command as Task 1 Step 2. Expected: `OK: parses
cleanly`

- [ ] **Step 6: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "feat: add group-into-folder toggle to the multi-file upload modal"
```

---

## Task 5: Extract `applyFolderSpacePayload` from `handleCreateFolder`

**Files:**
- Modify: `All Module/Document/Library.js` (lines 8395-8460,
  `handleCreateFolder`)

**Interfaces:**
- Produces: `applyFolderSpacePayload(payload)` — mutates and returns
  `payload`, applying the same `activeSpace`-specific scoping fields
  `handleCreateFolder` already applies (`internalCompanyId`, `moduleScope`,
  `legalReferenceId`, `projectId`/`caseId`/`customerId`, etc.). Task 6
  calls this for the new grouped-folder path so both places stay in sync
  with exactly one implementation.
- Consumes: `activeSpace`, `activeCompanyId`, `activeLegalReferenceId`,
  `activeCaseId`, `activeCustomerId` (component state, already in scope),
  `INTERNAL_TEMPLATE_MODULE_SCOPE`, `LEGAL_STUDY_STORAGE_TYPE`,
  `MY_DOCUMENT_STORAGE_TYPE`, `KNOWLEDGE_STORAGE_TYPE`, `buildScopedPayload`
  (all already in scope at this exact location today).

- [ ] **Step 1: Extract the scoping block into a new function, called from `handleCreateFolder`**

Old (the full current function):
```javascript
    const handleCreateFolder = async (values) => {
      if (!getFolderPermsById(selectedFolderId).canCreate) {
        message.warning("You do not have permission to create a folder at this location");
        return;
      }
      if (
        activeSpace !== LEGAL_STUDY_STORAGE_TYPE &&
        activeSpace !== MY_DOCUMENT_STORAGE_TYPE &&
        activeSpace !== "shared_with_me" &&
        !requireCompany()
      )
        return;
      setFolderLoading(true);
      try {
        const parentId = normalizeParentId(selectedFolderId);
        const userId = getCurrentUserId();
        const nowIso = new Date().toISOString();
        const payload = {
          name: values.name.trim(),
          description: values.description?.trim() || "",
          type: "custom",
          createdAt: nowIso,
          updatedAt: nowIso,
          storageType: activeSpace,
          ...(parentId ? { parentId } : {}),
          ...(userId ? { createdById: userId, updatedById: userId } : {}),
        };

        if (activeSpace === "company_shared") {
          payload.internalCompanyId = extractId(activeCompanyId);
          payload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
        } else if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
          Object.assign(payload, buildScopedPayload(LEGAL_STUDY_STORAGE_TYPE));
        } else if (activeSpace === "legal_reference") {
          payload.internalCompanyId = extractId(activeCompanyId);
          payload.legalReferenceId = extractId(activeLegalReferenceId);
          payload.moduleScope = "legal_reference";
        } else if (activeSpace === "customer") {
          if (activeCaseId) {
            payload.projectId = extractId(activeCaseId);
            payload.caseId = extractId(activeCaseId);
          }
          if (activeCustomerId) payload.customerId = extractId(activeCustomerId);
          if (activeCompanyId)
            payload.internalCompanyId = extractId(activeCompanyId);
          delete payload.moduleScope; // case folders don't use moduleScope
        } else if (activeSpace === MY_DOCUMENT_STORAGE_TYPE) {
          payload.moduleScope = MY_DOCUMENT_STORAGE_TYPE;
          // no internalCompanyId — personal space is user-scoped, not company-scoped
        } else if (activeSpace === KNOWLEDGE_STORAGE_TYPE) {
          payload.internalCompanyId = extractId(activeCompanyId);
          payload.moduleScope = KNOWLEDGE_STORAGE_TYPE;
        }

        await createFolderRecord(payload);
        message.success("Folder created successfully!");
        setIsFolderOpen(false);
        folderForm.resetFields();
        loadData();
        if (activeSpace === "customer") refreshCaseFolders();
      } catch (e) {
        message.error("Failed to create folder");
      } finally {
        setFolderLoading(false);
      }
    };
```

New:
```javascript
    // Applies activeSpace-specific scoping fields (internalCompanyId,
    // moduleScope, legalReferenceId, projectId/caseId/customerId, ...) to a
    // folder payload — shared by handleCreateFolder and the "group into a
    // new folder" upload path (handleConfirmUploadFields) so both create
    // folders with identical scoping.
    const applyFolderSpacePayload = (payload) => {
      if (activeSpace === "company_shared") {
        payload.internalCompanyId = extractId(activeCompanyId);
        payload.moduleScope = INTERNAL_TEMPLATE_MODULE_SCOPE;
      } else if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
        Object.assign(payload, buildScopedPayload(LEGAL_STUDY_STORAGE_TYPE));
      } else if (activeSpace === "legal_reference") {
        payload.internalCompanyId = extractId(activeCompanyId);
        payload.legalReferenceId = extractId(activeLegalReferenceId);
        payload.moduleScope = "legal_reference";
      } else if (activeSpace === "customer") {
        if (activeCaseId) {
          payload.projectId = extractId(activeCaseId);
          payload.caseId = extractId(activeCaseId);
        }
        if (activeCustomerId) payload.customerId = extractId(activeCustomerId);
        if (activeCompanyId)
          payload.internalCompanyId = extractId(activeCompanyId);
        delete payload.moduleScope; // case folders don't use moduleScope
      } else if (activeSpace === MY_DOCUMENT_STORAGE_TYPE) {
        payload.moduleScope = MY_DOCUMENT_STORAGE_TYPE;
        // no internalCompanyId — personal space is user-scoped, not company-scoped
      } else if (activeSpace === KNOWLEDGE_STORAGE_TYPE) {
        payload.internalCompanyId = extractId(activeCompanyId);
        payload.moduleScope = KNOWLEDGE_STORAGE_TYPE;
      }
      return payload;
    };

    const handleCreateFolder = async (values) => {
      if (!getFolderPermsById(selectedFolderId).canCreate) {
        message.warning("You do not have permission to create a folder at this location");
        return;
      }
      if (
        activeSpace !== LEGAL_STUDY_STORAGE_TYPE &&
        activeSpace !== MY_DOCUMENT_STORAGE_TYPE &&
        activeSpace !== "shared_with_me" &&
        !requireCompany()
      )
        return;
      setFolderLoading(true);
      try {
        const parentId = normalizeParentId(selectedFolderId);
        const userId = getCurrentUserId();
        const nowIso = new Date().toISOString();
        const payload = {
          name: values.name.trim(),
          description: values.description?.trim() || "",
          type: "custom",
          createdAt: nowIso,
          updatedAt: nowIso,
          storageType: activeSpace,
          ...(parentId ? { parentId } : {}),
          ...(userId ? { createdById: userId, updatedById: userId } : {}),
        };

        applyFolderSpacePayload(payload);

        await createFolderRecord(payload);
        message.success("Folder created successfully!");
        setIsFolderOpen(false);
        folderForm.resetFields();
        loadData();
        if (activeSpace === "customer") refreshCaseFolders();
      } catch (e) {
        message.error("Failed to create folder");
      } finally {
        setFolderLoading(false);
      }
    };
```

- [ ] **Step 2: Verify syntax**

Run the same babel-parse command as Task 1 Step 2. Expected: `OK: parses
cleanly`

- [ ] **Step 3: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "refactor: extract applyFolderSpacePayload out of handleCreateFolder"
```

---

## Task 6: Create the group folder before uploading

**Files:**
- Modify: `All Module/Document/Library.js` (lines 8479-8487,
  `handleConfirmUploadFields`)

**Interfaces:**
- Consumes: `applyFolderSpacePayload` (Task 5), `getFolderPermsById`,
  `createFolderRecord`, `normalizeParentId`, `extractId`,
  `getCurrentUserId`, `uploadFilesToTarget` (all already in scope at this
  exact location today, unchanged).

- [ ] **Step 1: Replace `handleConfirmUploadFields`**

Old:
```javascript
    const handleConfirmUploadFields = async (metadata) => {
      const target = uploadFieldsTarget;
      if (!target) return;
      const ok = await uploadFilesToTarget(target.files, {
        folderId: target.folderId,
        metadata,
      });
      if (ok) setUploadFieldsTarget(null);
    };
```

New:
```javascript
    const handleConfirmUploadFields = async (metadata) => {
      const target = uploadFieldsTarget;
      if (!target) return;

      let targetFolderId = target.folderId;

      if (metadata.uploadMode === "grouped") {
        if (!getFolderPermsById(targetFolderId).canCreate) {
          message.warning(
            "You do not have permission to create a folder at this location",
          );
          return;
        }
        const userId = getCurrentUserId();
        const nowIso = new Date().toISOString();
        const parentId = normalizeParentId(targetFolderId);
        const folderPayload = {
          name: metadata.groupFolderName.trim(),
          type: "custom",
          createdAt: nowIso,
          updatedAt: nowIso,
          storageType: activeSpace,
          ...(parentId ? { parentId } : {}),
          ...(userId ? { createdById: userId, updatedById: userId } : {}),
        };
        applyFolderSpacePayload(folderPayload);

        let folderRes;
        try {
          folderRes = await createFolderRecord(folderPayload);
        } catch (e) {
          message.error("Failed to create folder");
          return;
        }
        targetFolderId = extractId(folderRes?.data?.data);
        if (!targetFolderId) {
          message.error("Failed to create folder");
          return;
        }
      }

      const ok = await uploadFilesToTarget(target.files, {
        folderId: targetFolderId,
        metadata,
      });
      if (ok) setUploadFieldsTarget(null);
    };
```

Note: `uploadFilesToTarget` already calls `loadData()` on success (see its
`options.refresh !== false` branch) — no extra refresh call needed here for
the newly created folder to show up.

- [ ] **Step 2: Verify syntax**

Run the same babel-parse command as Task 1 Step 2. Expected: `OK: parses
cleanly`

- [ ] **Step 3: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "feat: create a new folder and upload into it when grouping multi-file uploads"
```

---

## Task 7: Manual QA in the Nocobase UI

No code changes — this task verifies Tasks 1-6 end to end, since this repo
has no automated UI test runner (see Global Constraints).

- [ ] **Step 1: Paste the updated file into the Nocobase block editor**

Open the Library.js block in the Nocobase UI (wherever this block is
currently deployed — check with the person who normally publishes this
block if unsure) and paste the full updated file contents in, matching
however this project already deploys JS Field/Action block changes.

- [ ] **Step 2: Inline edit — happy path**

In Table view, open a folder containing at least one file you have
edit/manager access to:
- Click the Description cell of a file row → type a value → press Enter →
  confirm it saves (no error toast) and the cell shows the new text after
  the table refreshes.
- Click the Document Type cell → type a value → click elsewhere (blur) →
  confirm it saves.
- Click an Opening Date cell → pick a date → confirm it saves and displays
  via `formatDate` (not the raw ISO string) after refresh.
- Click a Description cell on a **folder** row → confirm it saves too
  (folders only get Description, not the other 7 fields — confirm those 7
  columns show a static, non-clickable "—" for folder rows in the mixed
  view).

- [ ] **Step 3: Inline edit — permission gating**

As a user with only Viewer access to that folder (or by temporarily
checking `getRecordPerms(record).canRename` returns false for your test
user/role), confirm every one of the 8 cells renders as plain static text
(no hover underline, no click response) instead of an editable cell.

- [ ] **Step 4: Inline edit — Trash space**

Move a file to Trash, switch to the Trash space, and confirm its
Description cell is plain static text (no click response) — Trash never
gets inline edit.

- [ ] **Step 5: Inline edit — error path**

Temporarily break connectivity (e.g. disable network in devtools) or point
at an id that will 404, click a Description cell, type a value, blur, and
confirm: an error toast appears, the input stays open with your typed
value still in it (not reverted), and you can retry after restoring
connectivity.

- [ ] **Step 6: Upload grouping — separate mode (regression check)**

Select 2+ files via the "Upload file" action, leave "Upload as separate
files" selected (the default), fill in shared metadata, submit — confirm
all files land as separate documents in the current folder exactly as
before this change (no new folder created).

- [ ] **Step 7: Upload grouping — grouped mode**

Select 2+ files, switch to "Group into a new folder", try submitting with
an empty folder name — confirm the required-field validation blocks it.
Enter a folder name, submit — confirm: a new folder with that name appears
inside the folder you were in, all selected files appear inside that new
folder (not in the original folder), and the shared metadata (Document
Type, Sender, etc.) was applied to each of them.

- [ ] **Step 8: Upload grouping — permission gating**

As a user without `canCreate` on the target folder, attempt "Group into a
new folder" — confirm the "You do not have permission to create a folder
at this location" warning appears and no folder/documents are created.
