# Legal Study Two-Group Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `All Module/Document/LegalStudyCreateBlock.js` create minimal, `folderTemplateKey`-tagged Legal Study entries with a guaranteed root folder, and make `All Module/Document/Library.js`'s "Legal Study" gallery/browsing show both system-generated (case-bound) and user-created (external-resource) Legal Study entries side by side, reusing data already fetched wherever possible.

**Architecture:** Two independent-but-sequenced file changes. `LegalStudyCreateBlock.js` (Tasks 1-2) becomes the create form for "external-resource" Legal Study entries — a `legalStudy` record (title + description only) plus a guaranteed root folder tagged `folderTemplateKey: "legal_study"`, linked via the existing `legalStudyId` FK (feeds the `legalStudy.Folders`/`legalStudy.documents` hasMany relations, confirmed present on the live Nocobase schema). `Library.js` (Tasks 3-6) then widens its existing case-bound Legal Study machinery to also surface these case-less entries, exploiting the fact that they get `moduleScope: "legal_study"` and therefore already flow through Library.js's existing general `folders`/`documents` fetch — no new fetch effect needed.

**Tech Stack:** Plain JS. `LegalStudyCreateBlock.js` uses `React.createElement` (no JSX, `node --check` works directly). `Library.js` uses JSX directly (`node --check` cannot parse it — use the repo's established temporary Babel-parser syntax-check script instead, see Global Constraints). Nocobase `ctx.api.request`. No test framework in this repo.

## Global Constraints

- **No new files.** Both target files are single self-contained Nocobase JS blocks (project memory: `nocobase-single-file-constraint`).
- **`legalStudy` collection fields in scope for this plan:** `title`, `description`, `internalCompanyId` (belongsTo), `Folders` (hasMany), `documents` (hasMany) — confirmed present on the live schema via Nocobase admin screenshot. Do **not** read from or write to `priority`, `status`, `startDate`/`Start Date`, `deadline`/`Deadline`, `closedDate`/`Closed Date`, `manager`/`Manager`, `members`/`Members`, `Task`, `activity_log`, `Notes` — this plan's whole point is to stop using them for new Legal Study entries. Do not delete these fields from the schema (out of scope, and other features may still read them from legacy records).
- **`folderTemplateKey` values already defined in `Library.js`:** `LEGAL_STUDY_FOLDER_TEMPLATE_KEY = "legal_study"` (line 111) — reuse this exact constant/value, do not redefine it differently.
- **Case-bound (Group 1) Legal Study behavior must not change** — every task that touches shared code (`isRenameLockedFolder`, `visibleFolders`/`visibleDocs`, breadcrumb, `buildScopedPayload`) must leave the `activeCaseId` / `projectId`-present path byte-for-byte equivalent in behavior.
- **Verification:** `node --check "All Module/Document/LegalStudyCreateBlock.js"` for Tasks 1-2 (plain JS, no JSX). For Tasks 3-6 (`Library.js`, has JSX), use this temporary Babel-parser script (write to repo root, run, delete — matches this repo's established convention for this specific file):
  ```bash
  cat > "__tmp_check_syntax.mjs" << 'EOF'
  import { parse } from "@babel/parser";
  import { readFileSync } from "fs";
  const file = process.argv[2];
  const code = readFileSync(file, "utf8");
  try {
    parse(code, {
      sourceType: "module",
      plugins: ["jsx", "classProperties", "optionalChaining", "nullishCoalescingOperator"],
    });
    console.log("OK:", file);
  } catch (e) {
    console.error("SYNTAX ERROR:", e.message);
    process.exit(1);
  }
  EOF
  node "__tmp_check_syntax.mjs" "All Module/Document/Library.js"
  rm "__tmp_check_syntax.mjs"
  ```
- **Git identity may not be configured.** If a commit fails with "Author identity unknown", do not run `git config`. Leave the change staged, note it, move to the next task.
- **Scope every git command to the file(s) this plan touches.** This repository has ~30 other files with large, unrelated, pre-existing uncommitted changes from the repo owner's own in-progress work (confirmed present throughout this whole session) — never use `git add -A`/`git add .`; always `git add` the exact file path(s) this task modifies.

---

## Task 1: `LegalStudyCreateBlock.js` — remove Manager/Members/Priority/Status/Start Date/Deadline

**Files:**
- Modify: `All Module/Document/LegalStudyCreateBlock.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — pure deletions. Task 2 edits a different region of the same file (inside `handleSubmit`, after the deletions this task makes) and does not depend on anything removed here except that `basePayload` and `users`-related identifiers must already be gone.

- [ ] **Step 1: Remove `toIso` helper (dead after Step 5 removes its only 2 call sites)**

Before:
```js
const toIso = (value) => {
  if (!value) return null;
  if (typeof value.toISOString === "function") return value.toISOString();
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const companyLabel = (record) =>
```
After:
```js
const companyLabel = (record) =>
```

- [ ] **Step 2: Remove `userLabel` helper (dead after Step 8 removes its only call site)**

Before:
```js
const userLabel = (record) =>
  compact([
    firstPresent(record, ["nickname", "displayName", "name", "username", "email"]),
    firstPresent(record, ["email"]) &&
    firstPresent(record, ["email"]) !== firstPresent(record, ["nickname", "displayName", "name", "username", "email"])
      ? `(${firstPresent(record, ["email"])})`
      : "",
  ]).join(" ") || (record?.id ? `User #${record.id}` : "User");

const customerLabel = (record) =>
```
After:
```js
const customerLabel = (record) =>
```

- [ ] **Step 3: Remove `USER_RESOURCES` constant**

Before:
```js
const COMPANY_RESOURCES = ["internalCompany", "internalCompanies"];
const USER_RESOURCES = ["users"];
const PROJECT_RESOURCES = ["projects"];
```
After:
```js
const COMPANY_RESOURCES = ["internalCompany", "internalCompanies"];
const PROJECT_RESOURCES = ["projects"];
```

- [ ] **Step 4: Simplify `legalStudyPayloadVariants` (drop manager/members fallback variants)**

Before:
```js
const legalStudyPayloadVariants = (payload) => [
  payload,
  {
    ...payload,
    manager: payload.managerId ? { id: Number(payload.managerId) } : undefined,
    members: (payload.memberIds || []).map((id) => ({ id: Number(id) })),
  },
  removeKeys(payload, ["manager", "members"]),
  removeKeys(payload, ["manager", "members", "managerId", "memberIds"]),
];
```
After:
```js
const legalStudyPayloadVariants = (payload) => [payload];
```

- [ ] **Step 5: Remove `users` state and simplify `resetDraft`/load-effect `setFieldsValue` calls**

Before:
```js
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
```
After:
```js
  const [companies, setCompanies] = useState([]);
  const [projects, setProjects] = useState([]);
```

Before:
```js
    Promise.all([
      fetchAllList(COMPANY_RESOURCES, { sort: ["createdAt"] }).catch(() => []),
      fetchAllList(USER_RESOURCES, { pageSize: 500, sort: ["nickname", "username"] }).catch(() => []),
      fetchAllList(PROJECT_RESOURCES, {
        pageSize: 1000,
        sort: ["-createdAt"],
        appends: ["customer"],
      }).catch(() => []),
      fetchAllList(LEGAL_REFERENCE_RESOURCES, { pageSize: 1000, sort: ["-createdAt"] }).catch(() => []),
      fetchAllList(PROJECT_SERVICE_RESOURCES, { pageSize: 2000, sort: ["id"] }).catch(() => []),
    ])
      .then(([companyRows, userRows, projectRows, legalReferenceRows, projectServiceRows]) => {
        if (!mounted) return;
        setCompanies(companyRows || []);
        setUsers((userRows || []).filter((user) => extractId(user) !== 1));
        setProjects(projectRows || []);
        setLegalReferences(legalReferenceRows || []);
        setServiceNamesByProject(buildServiceNamesByProjectMap(projectServiceRows || []));
        const companyId = defaultInternalCompanyId() || extractId((companyRows || [])[0]) || "";
        const caseId = defaultCaseId();
        form.setFieldsValue({
          status: "Active",
          ...(companyId ? { internalCompanyId: String(companyId) } : {}),
          ...(caseId ? { caseIds: [String(caseId)] } : {}),
        });
      })
```
After:
```js
    Promise.all([
      fetchAllList(COMPANY_RESOURCES, { sort: ["createdAt"] }).catch(() => []),
      fetchAllList(PROJECT_RESOURCES, {
        pageSize: 1000,
        sort: ["-createdAt"],
        appends: ["customer"],
      }).catch(() => []),
      fetchAllList(LEGAL_REFERENCE_RESOURCES, { pageSize: 1000, sort: ["-createdAt"] }).catch(() => []),
      fetchAllList(PROJECT_SERVICE_RESOURCES, { pageSize: 2000, sort: ["id"] }).catch(() => []),
    ])
      .then(([companyRows, projectRows, legalReferenceRows, projectServiceRows]) => {
        if (!mounted) return;
        setCompanies(companyRows || []);
        setProjects(projectRows || []);
        setLegalReferences(legalReferenceRows || []);
        setServiceNamesByProject(buildServiceNamesByProjectMap(projectServiceRows || []));
        const companyId = defaultInternalCompanyId() || extractId((companyRows || [])[0]) || "";
        const caseId = defaultCaseId();
        form.setFieldsValue({
          ...(companyId ? { internalCompanyId: String(companyId) } : {}),
          ...(caseId ? { caseIds: [String(caseId)] } : {}),
        });
      })
```

Before:
```js
  const resetDraft = () => {
    form.resetFields();
    const companyId = defaultInternalCompanyId() || extractId(companies[0]) || "";
    const caseId = defaultCaseId();
    form.setFieldsValue({
      status: "Active",
      ...(companyId ? { internalCompanyId: String(companyId) } : {}),
      ...(caseId ? { caseIds: [String(caseId)] } : {}),
    });
```
After:
```js
  const resetDraft = () => {
    form.resetFields();
    const companyId = defaultInternalCompanyId() || extractId(companies[0]) || "";
    const caseId = defaultCaseId();
    form.setFieldsValue({
      ...(companyId ? { internalCompanyId: String(companyId) } : {}),
      ...(caseId ? { caseIds: [String(caseId)] } : {}),
    });
```

- [ ] **Step 6: Simplify `handleSubmit`'s `basePayload`**

Before:
```js
      const userId = getCurrentUserId();
      const managerId = extractId(values.managerId);
      const memberIds = (values.memberIds || []).map((id) => extractId(id)).filter(Boolean);
      const basePayload = {
        title: values.title?.trim(),
        description: values.description?.trim() || "",
        internalCompanyId: extractId(values.internalCompanyId),
        priority: values.priority || null,
        status: values.status || "Active",
        startDate: toIso(values.startDate),
        deadline: toIso(values.deadline),
        ...(managerId ? { manager: { id: managerId }, managerId } : {}),
        ...(memberIds.length ? { members: memberIds.map((id) => ({ id })), memberIds } : {}),
        ...(userId ? { createdById: userId, updatedById: userId } : {}),
      };
```
After:
```js
      const userId = getCurrentUserId();
      const basePayload = {
        title: values.title?.trim(),
        description: values.description?.trim() || "",
        internalCompanyId: extractId(values.internalCompanyId),
        ...(userId ? { createdById: userId, updatedById: userId } : {}),
      };
```

- [ ] **Step 7: Remove `userOptions`**

Before:
```js
  const companyOptions = companies.map((company) => ({
    value: String(extractId(company)),
    label: companyLabel(company),
  }));
  const userOptions = users.map((user) => ({
    value: String(extractId(user)),
    label: userLabel(user),
  }));
```
After:
```js
  const companyOptions = companies.map((company) => ({
    value: String(extractId(company)),
    label: companyLabel(company),
  }));
```

- [ ] **Step 8: Delete the Manager/Members `<Row>` and the Priority/Status `<Row>` (the whole JSX block between the title/company `Row` and the `description` `Form.Item`)**

Before (verbatim, including the stray blank line before the final `React.createElement`):
```js
      React.createElement(
        Row,
        { gutter: 16 },
        React.createElement(
          Col,
          { xs: 24, md: 12 },
          React.createElement(
            Form.Item,
            { name: "managerId", label: "Manager" },
            React.createElement(Select, {
              showSearch: true,
              allowClear: true,
              placeholder: "Select manager...",
              optionFilterProp: "label",
              options: userOptions,
            }),
          ),
        ),
        React.createElement(
          Col,
          { xs: 24, md: 12 },
          React.createElement(
            Form.Item,
            { name: "memberIds", label: "Members" },
            React.createElement(Select, {
              mode: "multiple",
              showSearch: true,
              allowClear: true,
              placeholder: "Select members...",
              optionFilterProp: "label",
              options: userOptions,
            }),
          ),
        ),
      ),
      React.createElement(
        Row,
        { gutter: 16 },
        React.createElement(
          Col,
          { xs: 24, md: 12 },
          React.createElement(
            Form.Item,
            { name: "priority", label: "Priority" },
            React.createElement(Select, {
              allowClear: true,
              placeholder: "Select priority...",
              options: [
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ],
            }),
          ),
        ),
        React.createElement(
          Col,
          { xs: 24, md: 12 },
          React.createElement(
            Form.Item,
            { name: "status", label: "Status", initialValue: "Active" },
            React.createElement(Select, {
              placeholder: "Select status...",
              options: [
                { value: "Active", label: "Active" },
                { value: "Closed", label: "Closed" },
                { value: "Pending", label: "Pending" },
              ],
            }),
          ),
        ),
      ),
      
      React.createElement(
        Form.Item,
        { name: "description", label: "Description" },
```
After:
```js
      React.createElement(
        Form.Item,
        { name: "description", label: "Description" },
```

- [ ] **Step 9: Babel/node syntax check**

Run: `node --check "All Module/Document/LegalStudyCreateBlock.js"`
Expected: no output (this file has no JSX, `node --check` works directly here — do not use the Babel-parser script from Global Constraints for this file).

- [ ] **Step 10: Manual review checklist**

- Confirm `Select`/`Row`/`Col` imports (top of file, `const { Button, Card, Col, DatePicker, Form, Input, Modal, Row, Select, Spin, Tag, Typography, message } = ctx.antd;`) are still all used elsewhere in the file (they are — `Row`/`Col` wrap the title/company fields and the caseIds/legalReferenceIds fields; `Select` is used by internalCompanyId/caseIds/legalReferenceIds). `DatePicker` was imported but was never actually used anywhere in the file even before this task (confirm with `grep -n "DatePicker" All Module/Document/LegalStudyCreateBlock.js` — if it only appears in the import line, leave it as-is; removing unused imports from the destructure is not part of this task's scope).
- Confirm no remaining reference to `managerId`, `memberIds`, `priority`, `status`, `startDate`, `deadline`, `toIso`, `userLabel`, `userOptions`, `users`, `setUsers`, `USER_RESOURCES` anywhere in the file: `grep -nE "managerId|memberIds|priority|status|startDate|deadline|toIso|userLabel|userOptions|\\busers\\b|setUsers|USER_RESOURCES" "All Module/Document/LegalStudyCreateBlock.js"` should return no matches other than unrelated words (there are none expected — review any hit manually).

- [ ] **Step 11: Commit**

```bash
git add "All Module/Document/LegalStudyCreateBlock.js"
git commit -m "$(cat <<'EOF'
feat: drop Manager/Members/Priority/Status/dates from Create Legal Study

These fields mirror the exact "thừa" (unnecessary admin overhead) that
motivated the 2026-07-25 migration away from the legalStudy collection
for case-bound Legal Study, and match the same simplification already
applied to Create Case Study. Per
docs/superpowers/specs/2026-07-31-standalone-legal-study-design.md Part A1,
the external-resource Legal Study record only needs title + description +
internal company + case/case-reference links + optional file upload.
EOF
)"
```

---

## Task 2: `LegalStudyCreateBlock.js` — guarantee a `folderTemplateKey`-tagged root folder

**Files:**
- Modify: `All Module/Document/LegalStudyCreateBlock.js`

**Interfaces:**
- Consumes: `createFolderRecord(payload)` (already exists, line ~234-235, POSTs to `folders:create` via `createScopedRecord`), `buildDocumentScopePayload({ internalCompanyId, legalStudyId })` (already exists, line ~617-622, returns `{ storageType: "legal_study", moduleScope: "legal_study", internalCompanyId, legalStudyId }`).
- Produces: every successfully-created `legalStudy` record now always has exactly one root folder with `folderTemplateKey: "legal_study"` and the same `legalStudyId`/`storageType`/`moduleScope` as its documents. `Library.js` (Task 4) relies on this folder existing and carrying `folderTemplateKey` to list the entry in its Legal Study gallery.

- [ ] **Step 1: Add the `LEGAL_STUDY_FOLDER_TEMPLATE_KEY` constant**

Before:
```js
const LEGAL_STUDY_STORAGE_TYPE = "legal_study";
const LEGAL_STUDY_MODULE_SCOPE = "legal_study";
```
After:
```js
const LEGAL_STUDY_STORAGE_TYPE = "legal_study";
const LEGAL_STUDY_MODULE_SCOPE = "legal_study";
const LEGAL_STUDY_FOLDER_TEMPLATE_KEY = "legal_study";
```

- [ ] **Step 2: Create the root folder right after the `legalStudy` record is created, before the case/reference-link and upload logic**

Before:
```js
      const createdStudy = await createWithFallback(
        LEGAL_STUDY_RESOURCES,
        legalStudyPayloadVariants(basePayload),
      );
      const studyId = extractId(createdStudy);
      let uploadFailed = false;
      let linkFailed = false;

      if ((files.length || folderFiles.length) && !studyId) {
        uploadFailed = true;
        message.warning("Created Legal Study, but could not detect its ID for document upload.");
      }
```
After:
```js
      const createdStudy = await createWithFallback(
        LEGAL_STUDY_RESOURCES,
        legalStudyPayloadVariants(basePayload),
      );
      const studyId = extractId(createdStudy);
      let uploadFailed = false;
      let linkFailed = false;

      // Every Legal Study record gets exactly one root folder, tagged with
      // the same folderTemplateKey the case-bound (system-generated) Legal
      // Study folders use — this is what makes the entry show up in
      // Library.js's Legal Study gallery, whether or not the user uploaded
      // anything. Created regardless of files/folderFiles selection.
      let rootFolderId = null;
      if (studyId) {
        try {
          const nowIso = new Date().toISOString();
          const rootFolder = await createFolderRecord({
            name: values.title?.trim() || "Legal Study",
            type: "custom",
            folderTemplateKey: LEGAL_STUDY_FOLDER_TEMPLATE_KEY,
            createdAt: nowIso,
            updatedAt: nowIso,
            ...(userId ? { createdById: userId, updatedById: userId } : {}),
            ...buildDocumentScopePayload({
              internalCompanyId: values.internalCompanyId,
              legalStudyId: studyId,
            }),
          });
          rootFolderId = extractId(rootFolder);
        } catch (error) {
          console.error("[LegalStudyCreateBlock] create root folder failed", error);
          message.warning("Legal Study created, but its root folder could not be created.");
        }
      }

      if ((files.length || folderFiles.length) && !studyId) {
        uploadFailed = true;
        message.warning("Created Legal Study, but could not detect its ID for document upload.");
      }
```

- [ ] **Step 3: Route uploads into the root folder instead of the Legal Study's bare root**

Before:
```js
      const uploadContext = {
        internalCompanyId: extractId(values.internalCompanyId),
        legalStudyId: studyId,
      };
```
After:
```js
      const uploadContext = {
        internalCompanyId: extractId(values.internalCompanyId),
        legalStudyId: studyId,
        folderId: rootFolderId,
      };
```

- [ ] **Step 4: Make `uploadFilesToStudy` place loose files inside `context.folderId` instead of always at the bare root**

Before:
```js
const uploadFilesToStudy = async (files, context) => {
  const rows = Array.from(files || []).filter(Boolean);
  if (!rows.length) return true;
  let nextIndex = await getNextFileIndex({ ...context, folderId: null });
  const userId = getCurrentUserId();

  for (const file of rows) {
    const attachment = await uploadAttachment(file, file.name);
    const nowIso = new Date().toISOString();
    await createDocumentRecord({
      name: file.name,
      title: file.name,
      documentCode: "",
      fileIndex: nextIndex,
      fileAttachment: [{ id: attachment.id }],
      createdAt: nowIso,
      updatedAt: nowIso,
      uploadedAt: nowIso,
      uploaded_at: nowIso,
      ...(userId ? { uploadedById: userId, createdById: userId, updatedById: userId } : {}),
      ...buildDocumentScopePayload(context),
    });
    nextIndex += 1;
  }
  return true;
};
```
After:
```js
const uploadFilesToStudy = async (files, context) => {
  const rows = Array.from(files || []).filter(Boolean);
  if (!rows.length) return true;
  let nextIndex = await getNextFileIndex(context);
  const userId = getCurrentUserId();

  for (const file of rows) {
    const attachment = await uploadAttachment(file, file.name);
    const nowIso = new Date().toISOString();
    await createDocumentRecord({
      name: file.name,
      title: file.name,
      documentCode: "",
      fileIndex: nextIndex,
      fileAttachment: [{ id: attachment.id }],
      createdAt: nowIso,
      updatedAt: nowIso,
      uploadedAt: nowIso,
      uploaded_at: nowIso,
      ...(context.folderId ? { folderId: context.folderId } : {}),
      ...(userId ? { uploadedById: userId, createdById: userId, updatedById: userId } : {}),
      ...buildDocumentScopePayload(context),
    });
    nextIndex += 1;
  }
  return true;
};
```

- [ ] **Step 5: Make `uploadFolderFilesToStudy`'s top-level dragged folders nest under `context.folderId` instead of the bare root**

Before:
```js
const uploadFolderFilesToStudy = async (files, context) => {
  const rows = Array.from(files || []).filter(Boolean);
  if (!rows.length) return true;
  const folderIdMap = { "": null };
  const folderPaths = new Set();
```
After:
```js
const uploadFolderFilesToStudy = async (files, context) => {
  const rows = Array.from(files || []).filter(Boolean);
  if (!rows.length) return true;
  const folderIdMap = { "": context.folderId || null };
  const folderPaths = new Set();
```

- [ ] **Step 6: Babel/node syntax check**

Run: `node --check "All Module/Document/LegalStudyCreateBlock.js"`
Expected: no output.

- [ ] **Step 7: Manual review checklist**

- `getNextFileIndex` (defined ~line 624-649) already destructures `{ folderId, internalCompanyId, legalStudyId }` from its argument and calls `normalizeParentId(folderId)` — passing the full `context` object (which now includes `folderId: rootFolderId`) directly, as Step 4 does, is equivalent to the old `{ ...context, folderId: null }` call except it now correctly uses the real root folder id instead of hardcoding `null`. Confirm this by re-reading `getNextFileIndex`'s body.
- Confirm `uploadFolderFilesToStudy`'s per-file `nextIndexForFolder(folderId)` calls (later in the same function) are untouched — they already resolve the correct nested folder id per file, Step 5 only changes what the **top-level** (`""` path) maps to.
- Confirm `rootFolderId` staying `null` (root-folder creation failed) degrades gracefully: `uploadContext.folderId` becomes `null`, `uploadFilesToStudy`/`uploadFolderFilesToStudy` fall back to their pre-existing null-folderId behavior (documents/folders created without a `folderId`) — no crash, just the pre-Task-2 behavior for that one edge case.

- [ ] **Step 8: Commit**

```bash
git add "All Module/Document/LegalStudyCreateBlock.js"
git commit -m "$(cat <<'EOF'
feat: tag Legal Study's root folder with folderTemplateKey, guarantee its creation

Every legalStudy record now gets exactly one root folder created
automatically (name = the study's title), tagged
folderTemplateKey: "legal_study" — the same identification Library.js's
Legal Study gallery already uses for case-bound folders. Uploaded files
and dragged folders now nest inside this root folder instead of sitting
at the Legal Study's bare root, matching how every other document space
in this app is organized. Per
docs/superpowers/specs/2026-07-31-standalone-legal-study-design.md Part A2.
EOF
)"
```

---

## Task 3: `Library.js` — fix the rename-lock conflict for case-less folders

**Files:**
- Modify: `All Module/Document/Library.js:132-137`

**Interfaces:**
- Consumes: `getFolderCaseProjectId(folder)` (already exists, defined well before line 132 — a folder-only helper reading `projectId`/`project`/`projects`/`sourceProjectId`/`sourceProject`/`caseId`/`case`/`cases`).
- Produces: `isRenameLockedFolder(record)` keeps its exact name/signature; every other file in this plan that calls it (`canBulkSelectRecord`, rename UI gates) needs no change.

- [ ] **Step 1: Add the `projectId` requirement to `isRenameLockedFolder`**

Before:
```js
  const isRenameLockedFolder = (record) =>
    record?._type === "folder" &&
    (SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS.has(record?.folderTemplateKey) ||
      SYSTEM_LOCKED_RENAME_TEMPLATE_NAMES.has(
        String(record?.name || "").trim().toLowerCase(),
      ));
```
After:
```js
  const isRenameLockedFolder = (record) =>
    record?._type === "folder" &&
    Boolean(getFolderCaseProjectId(record)) &&
    (SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS.has(record?.folderTemplateKey) ||
      SYSTEM_LOCKED_RENAME_TEMPLATE_NAMES.has(
        String(record?.name || "").trim().toLowerCase(),
      ));
```

Note: `getFolderCaseProjectId` is defined later in the file than `isRenameLockedFolder` (both are `const` at module scope, evaluated once when the block first runs) — this is safe because `isRenameLockedFolder` is a function *value* that only calls `getFolderCaseProjectId` when *invoked* later at render/interaction time, by which point the whole module has already finished its top-to-bottom initial evaluation. Do not reorder the two declarations.

- [ ] **Step 2: Babel syntax check**

Run the Global Constraints syntax-check script against `All Module/Document/Library.js`.
Expected: `OK: All Module/Document/Library.js`.

- [ ] **Step 3: Manual review checklist**

- Confirm the 5 real system template folders (Legal Study, LSC & Related, Legal docs, Legal dossiers, Report and Result) always carry a `projectId` — they're created by `CaseCreateForm.js` with `projectId: projectId ? parseInt(projectId) : null` in the same payload as `folderTemplateKey`, for a Case that always has an id at that point — so `getFolderCaseProjectId` returns truthy for all 5, preserving today's rename-lock behavior exactly.
- Confirm Task 2's new Legal Study root folders (created by `LegalStudyCreateBlock.js`) never set `projectId`/`caseId`/`project`/`case`/`cases`/`sourceProjectId`/`sourceProject` — `getFolderCaseProjectId` returns falsy for them, so they are rename-able.
- `canBulkSelectRecord` (elsewhere in `Library.js`) calls `isRenameLockedFolder` directly — no separate change needed there, it inherits this fix automatically.

- [ ] **Step 4: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "$(cat <<'EOF'
fix: don't lock rename for case-less Legal Study folders

isRenameLockedFolder identified the 5 system template folders purely by
folderTemplateKey, which is now also used by user-created, case-less
Legal Study root folders (Task 2 of this plan) — those got incorrectly
rename-locked too. The 5 real system folders always carry a projectId
(CaseCreateForm.js sets it alongside folderTemplateKey); case-less ones
never do, so requiring getFolderCaseProjectId(record) to be truthy
correctly excludes them without needing a new field. Per
docs/superpowers/specs/2026-07-31-standalone-legal-study-design.md Part B1.
EOF
)"
```

---

## Task 4: `Library.js` — gallery shows both groups

**Files:**
- Modify: `All Module/Document/Library.js:4066` (add `legalStudyRecords` state)
- Modify: `All Module/Document/Library.js:2517-2535` region (add a `fetchLegalStudyRecords` helper, mirroring `fetchLegalReferenceRecords`)
- Modify: `All Module/Document/Library.js:4326-4361` (`loadData`'s `Promise.all` + destructuring + `setXxx` calls)
- Modify: `All Module/Document/Library.js:5642-5674` (`legalStudyEntities`)
- Modify: `All Module/Document/Library.js:12448-12470` (`formatCaseCustomerLabel`/`openLegalStudyEntity`)

**Interfaces:**
- Consumes: `extractId`, `fetchAllList` (both already exist, module-level helpers).
- Produces: `legalStudyRecords` (component state, array of `{ id, title, description }`-shaped records), `legalStudyRecordById` (a `Map<string, record>` derived via `useMemo`) — Task 5 does not need these, but any future task referencing "which legalStudy record backs this Group 2 entry" should use `entry.study` (added to `legalStudyEntities`'s item shape by this task) rather than re-deriving it.

- [ ] **Step 1: Add a lightweight `fetchLegalStudyRecords` module-level helper**

Insert immediately after the existing `fetchLegalReferenceRecords` function (right before its blank line + `const createLegalReferenceRecord = async (payload) => {` on the line after):

```js
  const fetchLegalStudyRecords = async () => {
    for (const url of ["legalStudy:list", "legalStudies:list"]) {
      try {
        return await fetchAllList(url, {
          sort: ["-createdAt"],
          fields: ["id", "title", "description"],
        });
      } catch (e) {
        // Try next candidate.
      }
    }
    return [];
  };

```

- [ ] **Step 2: Add `legalStudyRecords` state next to `legalReferences`**

Before:
```js
    const [legalReferences, setLegalReferences] = useState([]);
```
After:
```js
    const [legalReferences, setLegalReferences] = useState([]);
    const [legalStudyRecords, setLegalStudyRecords] = useState([]);
```

- [ ] **Step 3: Fetch `legalStudy` records in `loadData`**

Before:
```js
        const [
          fetchedCompanies,
          fetchedFolders,
          fetchedDocs,
          fetchedLegalReferences,
          fetchedProjects,
          fetchedDocumentShares,
          fetchedCustomers,
          fetchedCustomerCaseFolders,
        ] = await Promise.all([
          fetchAllList("internalCompany:list", { sort: ["createdAt"] }).catch(
            () => [],
          ),
          fetchFoldersForInternalTemplates(),
          fetchDocumentsForInternalTemplates(),
          fetchLegalReferenceRecords(),
          fetchAllList("projects:list", {
            fields: [
              "id",
              "caseCode",
              "projectName",
              "description",
              "customerId",
              "customer",
            ],
            sort: ["-createdAt"],
          }).catch(() => []),
          fetchDocumentShareRows(),
          fetchAllList("customers:list", {
            sort: ["customerName"],
            appends: ["internalCompany", "createdBy"],
          }).catch(() => []),
          fetchCustomerCasePermissionFolders(),
        ]);

        setCompanies(fetchedCompanies);
```
After:
```js
        const [
          fetchedCompanies,
          fetchedFolders,
          fetchedDocs,
          fetchedLegalReferences,
          fetchedProjects,
          fetchedDocumentShares,
          fetchedCustomers,
          fetchedCustomerCaseFolders,
          fetchedLegalStudyRecords,
        ] = await Promise.all([
          fetchAllList("internalCompany:list", { sort: ["createdAt"] }).catch(
            () => [],
          ),
          fetchFoldersForInternalTemplates(),
          fetchDocumentsForInternalTemplates(),
          fetchLegalReferenceRecords(),
          fetchAllList("projects:list", {
            fields: [
              "id",
              "caseCode",
              "projectName",
              "description",
              "customerId",
              "customer",
            ],
            sort: ["-createdAt"],
          }).catch(() => []),
          fetchDocumentShareRows(),
          fetchAllList("customers:list", {
            sort: ["customerName"],
            appends: ["internalCompany", "createdBy"],
          }).catch(() => []),
          fetchCustomerCasePermissionFolders(),
          fetchLegalStudyRecords(),
        ]);

        setCompanies(fetchedCompanies);
        setLegalStudyRecords(fetchedLegalStudyRecords);
```

- [ ] **Step 4: Add `legalStudyRecordById` and widen `legalStudyEntities` to include Group 2**

Before:
```js
    const legalStudyEntities = useMemo(() => {
      const currentUser = currentUserState;
      const activeCaseFolders = customerCaseFolders.filter((f) => !f?.isDeleted);
      const { accessible } =
        currentUser && !isAdmin
          ? getVisibleFolderIds(activeCaseFolders, currentUser, currentLawyerId)
          : { accessible: null };

      const items = [];
      activeCaseFolders.forEach((folder) => {
        if (folder.folderTemplateKey !== LEGAL_STUDY_FOLDER_TEMPLATE_KEY) return;
        if (accessible && !accessible.has(extractId(folder.id))) return;

        const projectId = getFolderCaseProjectId(folder);
        if (!projectId) return;
        const project = projectById.get(String(projectId));
        if (!project) return;
        const customerId = getProjectCustomerId(project);
        const customer = customers.find(
          (c) => String(extractId(c)) === String(customerId),
        );

        items.push({ folder, project, customer });
      });
      return items;
    }, [
      customerCaseFolders,
      currentUserState,
      currentLawyerId,
      isAdmin,
      projectById,
      customers,
    ]);
```
After:
```js
    const legalStudyRecordById = useMemo(() => {
      const map = new Map();
      legalStudyRecords.forEach((s) => map.set(String(extractId(s)), s));
      return map;
    }, [legalStudyRecords]);

    const legalStudyEntities = useMemo(() => {
      const currentUser = currentUserState;
      const activeCaseFolders = customerCaseFolders.filter((f) => !f?.isDeleted);
      const { accessible } =
        currentUser && !isAdmin
          ? getVisibleFolderIds(activeCaseFolders, currentUser, currentLawyerId)
          : { accessible: null };

      const items = [];
      activeCaseFolders.forEach((folder) => {
        if (folder.folderTemplateKey !== LEGAL_STUDY_FOLDER_TEMPLATE_KEY) return;
        if (accessible && !accessible.has(extractId(folder.id))) return;

        const projectId = getFolderCaseProjectId(folder);
        if (!projectId) {
          // Group 2 — external-resource Legal Study, anchored by a
          // legalStudy record via folder.legalStudyId, not by any Case.
          const studyId = extractId(folder.legalStudyId);
          const study = studyId ? legalStudyRecordById.get(String(studyId)) : null;
          items.push({ folder, project: null, customer: null, study });
          return;
        }
        const project = projectById.get(String(projectId));
        if (!project) return;
        const customerId = getProjectCustomerId(project);
        const customer = customers.find(
          (c) => String(extractId(c)) === String(customerId),
        );

        items.push({ folder, project, customer, study: null });
      });
      return items;
    }, [
      customerCaseFolders,
      currentUserState,
      currentLawyerId,
      isAdmin,
      projectById,
      customers,
      legalStudyRecordById,
    ]);
```

- [ ] **Step 5: Show the `legalStudy` record's title for Group 2 entries in the gallery**

Before:
```js
                    // caseCode + shortName (khách hàng) + projectName
                    const formatCaseCustomerLabel = (entry) => {
                      const caseCode = entry.project?.caseCode || "";
                      const shortName =
                        entry.customer?.shortName ||
                        (entry.customer ? getCustomerDisplayName(entry.customer) : "");
                      const projectName = entry.project?.projectName || "";
                      return (
                        [caseCode, shortName, projectName].filter(Boolean).join(" - ") ||
                        `Case #${extractId(entry.project)}`
                      );
                    };

                    // 🌟 Nhảy thẳng vào đúng folder Legal Study của case —
                    // set selectedFolderId ngay bằng id thật của folder (thay
                    // vì "root") để không cần đi qua bước hiện case-root rồi
                    // mới tự nhảy vào (tránh flash 1 card "Legal Study" rồi
                    // mới vào nội dung thật của nó).
                    const openLegalStudyEntity = (entry) => {
                      setActiveCustomerId(String(extractId(entry.customer)));
                      setActiveCaseId(String(extractId(entry.project)));
                      setSelectedFolderId(String(extractId(entry.folder)));
                      setSidebarSearch("");
                    };
```
After:
```js
                    // caseCode + shortName (khách hàng) + projectName — hoặc
                    // title của record legalStudy nếu là Group 2 (external
                    // resource, không gắn Case nào).
                    const formatCaseCustomerLabel = (entry) => {
                      if (entry.study) {
                        return (
                          entry.study.title ||
                          entry.study.description ||
                          "External resource"
                        );
                      }
                      if (!entry.project) return "Standalone";
                      const caseCode = entry.project?.caseCode || "";
                      const shortName =
                        entry.customer?.shortName ||
                        (entry.customer ? getCustomerDisplayName(entry.customer) : "");
                      const projectName = entry.project?.projectName || "";
                      return (
                        [caseCode, shortName, projectName].filter(Boolean).join(" - ") ||
                        `Case #${extractId(entry.project)}`
                      );
                    };

                    // 🌟 Nhảy thẳng vào đúng folder Legal Study của case —
                    // set selectedFolderId ngay bằng id thật của folder (thay
                    // vì "root") để không cần đi qua bước hiện case-root rồi
                    // mới tự nhảy vào (tránh flash 1 card "Legal Study" rồi
                    // mới vào nội dung thật của nó). Group 2 (entry.customer/
                    // entry.project đều null) chỉ set selectedFolderId, giữ
                    // activeCustomerId/activeCaseId là null.
                    const openLegalStudyEntity = (entry) => {
                      if (entry.customer) setActiveCustomerId(String(extractId(entry.customer)));
                      if (entry.project) setActiveCaseId(String(extractId(entry.project)));
                      setSelectedFolderId(String(extractId(entry.folder)));
                      setSidebarSearch("");
                    };
```

- [ ] **Step 6: Babel syntax check**

Run the Global Constraints syntax-check script.
Expected: `OK: All Module/Document/Library.js`.

- [ ] **Step 7: Manual review checklist**

- Confirm `legalStudyEntitiesWithSubtree` (immediately after `legalStudyEntities` in the file) still works unchanged — it does `entry._subtreeIds = getFolderSubtreeIds(extractId(entry.folder), activeCaseFolders)`, which only reads `entry.folder`, unaffected by the new `study`/`project: null`/`customer: null` shape.
- Confirm the gallery's card/table rendering (further down, same block as `formatCaseCustomerLabel`) doesn't crash on `entry.project`/`entry.customer` being `null` for Group 2 — re-read the rest of that render block (grep for other `entry.project`/`entry.customer` accesses in the same `if (activeSpace === LEGAL_STUDY_STORAGE_TYPE && !activeCustomerId)` branch) and confirm every access uses `?.` or goes through `formatCaseCustomerLabel`; if a raw non-optional access is found, note it as a concern in the task report rather than silently leaving it.
- Confirm `field: ["id", "title", "description"]` in `fetchLegalStudyRecords` matches the actual field names on the `legalStudy` collection (per the Nocobase admin screenshot: the collection has a `description` field of type Rich Text — a `title` field was not visible in the screenshot's scrolled range, but `LegalStudyCreateBlock.js`'s own form and payload already assume `title` exists as a plain field — if the live schema turns out to use a different name, this is a deploy-time discovery, note it in the report rather than guessing further).

- [ ] **Step 8: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "$(cat <<'EOF'
feat: list external-resource Legal Study entries in the gallery

legalStudyEntities previously required a resolvable Case (projectId) to
include a folder at all, hiding case-less Legal Study folders entirely.
Now folders with folderTemplateKey="legal_study" and no projectId are
included as Group 2 entries, labeled with their backing legalStudy
record's title (joined via folder.legalStudyId, fetched into a new
legalStudyRecords state/legalStudyRecordById map). Per
docs/superpowers/specs/2026-07-31-standalone-legal-study-design.md Part B2.
EOF
)"
```

---

## Task 5: `Library.js` — browse Group 2 content + fix breadcrumb

**Files:**
- Modify: `All Module/Document/Library.js:5825-5834` (`visibleDocs`, `LEGAL_STUDY_STORAGE_TYPE` branch)
- Modify: `All Module/Document/Library.js:5917-5923` (`visibleFolders`, `LEGAL_STUDY_STORAGE_TYPE` branch)
- Modify: `All Module/Document/Library.js:7150-7168` (`buildScopedPayload`)
- Modify: `All Module/Document/Library.js:6186-6221` (breadcrumb, `LEGAL_STUDY_STORAGE_TYPE` branch)

**Interfaces:**
- Consumes: `folders`/`documents` (already-existing component state populated by `loadData`, filtered server-side to `DASHBOARD_CONFIG.moduleScopes` which already includes `"legal_study"` — Task 2's `LegalStudyCreateBlock.js` output flows into these two states with zero additional fetch code), `getFolderSubtreeIds(rootId, allFolders)` (already exists).
- Produces: `activeStandaloneLegalStudyFolderId` and `standaloneLegalStudySubtreeFolderIds` (both local `const`/`useMemo` inside the main component) — no other task in this plan consumes these, but they must be declared before `visibleFolders`/`visibleDocs` (which are defined after `legalStudySubtreeFolderIds` in the file, per existing structure) since both memos read them.

- [ ] **Step 1: Add the standalone-folder-id derivation, placed immediately after the existing `legalStudySubtreeFolderIds` `useMemo` (so it's defined before `visibleDocs`/`visibleFolders` use it)**

Find this exact existing block (already in the file, unchanged) and insert the new code directly after its closing `}, [caseFolders, activeLegalStudyFolder]);`:

Before:
```js
    const legalStudySubtreeFolderIds = useMemo(() => {
      if (!activeLegalStudyFolder) return new Set();
      const rootId = String(extractId(activeLegalStudyFolder));
      const ids = new Set([rootId]);
      let added = true;
      while (added) {
        added = false;
        caseFolders.forEach((f) => {
          const fid = String(extractId(f));
          if (ids.has(fid)) return;
          const parentId = String(getFolderParentId(f) || "");
          if (parentId && ids.has(parentId)) {
            ids.add(fid);
            added = true;
          }
        });
      }
      return ids;
    }, [caseFolders, activeLegalStudyFolder]);
```
After:
```js
    const legalStudySubtreeFolderIds = useMemo(() => {
      if (!activeLegalStudyFolder) return new Set();
      const rootId = String(extractId(activeLegalStudyFolder));
      const ids = new Set([rootId]);
      let added = true;
      while (added) {
        added = false;
        caseFolders.forEach((f) => {
          const fid = String(extractId(f));
          if (ids.has(fid)) return;
          const parentId = String(getFolderParentId(f) || "");
          if (parentId && ids.has(parentId)) {
            ids.add(fid);
            added = true;
          }
        });
      }
      return ids;
    }, [caseFolders, activeLegalStudyFolder]);

    // Group 2 (case-less Legal Study): when there's no active Case but a
    // specific folder is selected inside the Legal Study space, that
    // selectedFolderId IS the standalone root the user opened from the
    // gallery (see openLegalStudyEntity). Its folders/documents already
    // carry moduleScope: "legal_study", so they're already present in the
    // component's general `folders`/`documents` state (loadData) — no
    // extra fetch needed here, unlike the case-bound path above which
    // needs the separate activeCaseId-scoped caseFolders/caseDocs fetch.
    const activeStandaloneLegalStudyFolderId =
      activeSpace === LEGAL_STUDY_STORAGE_TYPE && !activeCaseId && selectedFolderId !== "root"
        ? String(selectedFolderId)
        : null;

    const standaloneLegalStudySubtreeFolderIds = useMemo(() => {
      if (!activeStandaloneLegalStudyFolderId) return new Set();
      return getFolderSubtreeIds(
        activeStandaloneLegalStudyFolderId,
        folders.filter((f) => !f?.isDeleted),
      );
    }, [activeStandaloneLegalStudyFolderId, folders]);
```

- [ ] **Step 2: Branch `visibleDocs`'s `LEGAL_STUDY_STORAGE_TYPE` case on whether a Case is active**

Before:
```js
      if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
        // 🌟 Legal Study giờ chỉ là 1 nhánh trong cây tài liệu của Case
        // (moduleScope vẫn "case_document") — lấy thẳng từ caseDocs, khoanh
        // vùng vào đúng folder Legal Study + folder con cháu của nó.
        return caseDocs.filter(
          (d) =>
            !d.isDeleted &&
            legalStudySubtreeFolderIds.has(String(extractId(d.folderId) || "")),
        );
      }
```
After:
```js
      if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
        if (activeStandaloneLegalStudyFolderId) {
          // Group 2 — case-less, documents already live in the general
          // `documents` state (moduleScope: "legal_study").
          return documents.filter(
            (d) =>
              !d.isDeleted &&
              standaloneLegalStudySubtreeFolderIds.has(String(extractId(d.folderId) || "")),
          );
        }
        // 🌟 Legal Study giờ chỉ là 1 nhánh trong cây tài liệu của Case
        // (moduleScope vẫn "case_document") — lấy thẳng từ caseDocs, khoanh
        // vùng vào đúng folder Legal Study + folder con cháu của nó.
        return caseDocs.filter(
          (d) =>
            !d.isDeleted &&
            legalStudySubtreeFolderIds.has(String(extractId(d.folderId) || "")),
        );
      }
```

Also add `activeStandaloneLegalStudyFolderId`, `standaloneLegalStudySubtreeFolderIds`, and `documents` to `visibleDocs`'s dependency array (the `useMemo`'s `[...]` list right after its closing `}, [` — find `companyDocs, documents, activeSpace, activeLegalReferenceId, legalStudySubtreeFolderIds, ...` — `documents` is already there; add the other two names to that same array).

- [ ] **Step 3: Branch `visibleFolders`'s `LEGAL_STUDY_STORAGE_TYPE` case the same way**

Before:
```js
      if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
        return caseFolders.filter(
          (f) =>
            !f.isDeleted &&
            legalStudySubtreeFolderIds.has(String(extractId(f))),
        );
      }
```
After:
```js
      if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
        if (activeStandaloneLegalStudyFolderId) {
          // Group 2 — case-less, folders already live in the general
          // `folders` state (moduleScope: "legal_study").
          return folders.filter(
            (f) =>
              !f.isDeleted &&
              standaloneLegalStudySubtreeFolderIds.has(String(extractId(f))),
          );
        }
        return caseFolders.filter(
          (f) =>
            !f.isDeleted &&
            legalStudySubtreeFolderIds.has(String(extractId(f))),
        );
      }
```

Add `activeStandaloneLegalStudyFolderId` and `standaloneLegalStudySubtreeFolderIds` to `visibleFolders`'s dependency array too (`folders` is already a dependency there — confirm, don't duplicate if so).

- [ ] **Step 4: Split `buildScopedPayload`'s Legal Study branch so Group 2 creates get `moduleScope`**

Before:
```js
        // 🌟 Legal Study không còn moduleScope/record riêng — chỉ là 1
        // nhánh trong cây tài liệu của Case, nên payload giống hệt nhánh
        // "customer" (folderId đã tự xác định đúng vị trí rồi).
        if (targetSpace === "customer" || targetSpace === LEGAL_STUDY_STORAGE_TYPE) {
          return {
            ...(activeCaseId
              ? {
                  projectId: extractId(activeCaseId),
                  caseId: extractId(activeCaseId),
                }
              : {}),
            ...(activeCustomerId
              ? { customerId: extractId(activeCustomerId) }
              : {}),
            ...(activeCompanyId
              ? { internalCompanyId: extractId(activeCompanyId) }
              : {}),
          };
        }
```
After:
```js
        if (targetSpace === LEGAL_STUDY_STORAGE_TYPE && !activeCaseId) {
          // Group 2 — creating a folder/file while browsing a case-less
          // Legal Study. Needs moduleScope so the new row lands in the
          // general folders/documents state (same as everything else in
          // this space), unlike the case-bound branch below which
          // deliberately has no moduleScope.
          return {
            moduleScope: LEGAL_STUDY_STORAGE_TYPE,
            ...(activeCompanyId
              ? { internalCompanyId: extractId(activeCompanyId) }
              : {}),
          };
        }
        // 🌟 Legal Study không còn moduleScope/record riêng — chỉ là 1
        // nhánh trong cây tài liệu của Case, nên payload giống hệt nhánh
        // "customer" (folderId đã tự xác định đúng vị trí rồi).
        if (targetSpace === "customer" || targetSpace === LEGAL_STUDY_STORAGE_TYPE) {
          return {
            ...(activeCaseId
              ? {
                  projectId: extractId(activeCaseId),
                  caseId: extractId(activeCaseId),
                }
              : {}),
            ...(activeCustomerId
              ? { customerId: extractId(activeCustomerId) }
              : {}),
            ...(activeCompanyId
              ? { internalCompanyId: extractId(activeCompanyId) }
              : {}),
          };
        }
```

- [ ] **Step 5: Fix the breadcrumb so it doesn't collapse to the gallery-root label while browsing inside a standalone folder**

Before:
```js
      if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
        // 🌟 Gallery gốc là danh sách flat các Case có folder Legal Study
        // (xem legalStudyEntities) — không có bước chọn Customer trung
        // gian, nên breadcrumb đi thẳng từ "Legal Study" vào tên Case.
        if (!activeCustomerId || !activeCaseId)
          return [{ id: "legal_study_gallery", name: LEGAL_STUDY_LABEL }];
```
After:
```js
      if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
        // 🌟 Gallery gốc là danh sách flat các Case có folder Legal Study
        // (xem legalStudyEntities) — không có bước chọn Customer trung
        // gian, nên breadcrumb đi thẳng từ "Legal Study" vào tên Case.
        if (!activeCaseId) {
          // Không có Case active — hoặc đang ở gallery gốc, hoặc đang
          // duyệt bên trong 1 Legal Study độc lập (Group 2). Chỉ nhánh sau
          // cần buildFolderPath; ở gallery gốc trả về ngay, không đi qua
          // buildFolderPath (selectedFolderId === "root" lúc đó).
          if (selectedFolderId === "root") {
            return [{ id: "legal_study_gallery", name: LEGAL_STUDY_LABEL }];
          }
          return buildFolderPath([{ id: "legal_study_gallery", name: LEGAL_STUDY_LABEL }]);
        }
```

Leave the rest of that `if (activeSpace === LEGAL_STUDY_STORAGE_TYPE)` block (the case-bound `caseInfoLabel` logic, starting at `const caseRec = projects.find(...)`) completely untouched — it's now reached only when `activeCaseId` is truthy, same condition as before this task (previously gated by `!activeCustomerId || !activeCaseId`, now by the `if (!activeCaseId) { ... }` block above returning early instead).

- [ ] **Step 6: Babel syntax check**

Run the Global Constraints syntax-check script.
Expected: `OK: All Module/Document/Library.js`.

- [ ] **Step 7: Manual review checklist**

- Re-read `visibleDocs`/`visibleFolders` top to bottom once fully edited — confirm exactly one `if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) { ... }` block remains in each (not two), with the `activeStandaloneLegalStudyFolderId` check as its first inner branch.
- Confirm `folders`/`documents` (the general states) are already declared before these two `useMemo`s in the file (they are — both are populated in `loadData`, defined near the top of the component). No import/declaration-order issue expected, but confirm by reading.
- Confirm the breadcrumb's `buildFolderPath` helper (defined earlier in the same `breadcrumbs` `useMemo`) walks `folderMap` (built from `permissionFilteredFolders`) via `parentId` — since Task 5's Group 2 folders now flow into `visibleFolders`/`permissionFilteredFolders` correctly (Steps 2-3), `buildFolderPath` requires no changes of its own.
- Confirm `handleBreadcrumbClick`'s `"case_info"` no-op case (elsewhere in the file) is unaffected — it's only pushed onto breadcrumb items when `activeCaseId` is truthy, a path this task's `if (!activeCaseId) { ... }` early-return never reaches.

- [ ] **Step 8: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "$(cat <<'EOF'
feat: browse and create content inside case-less Legal Study folders

visibleFolders/visibleDocs now serve Group 2 (case-less) Legal Study
content straight from the component's existing general folders/documents
state (already populated via loadData, already scoped by
moduleScope: "legal_study") -- no new fetch effect needed, since these
records already flow through that existing pipeline. buildScopedPayload
gets a dedicated case-less branch so new folders/files created while
browsing a standalone Legal Study also land in that same general state.
Breadcrumb no longer collapses to the gallery-root label while browsing
inside a standalone folder. Per
docs/superpowers/specs/2026-07-31-standalone-legal-study-design.md Parts
B3 and B5.
EOF
)"
```

---

## Task 6: `Library.js` — "+ New Legal Study" entry point

**Files:**
- Modify: `All Module/Document/Library.js:138-140` (add popup UID/URL constants, next to the existing Case Study ones)
- Modify: `All Module/Document/Library.js:7039-7049` (add `openCreateLegalStudyModal`, next to `openCreateReferenceModal`)
- Modify: `All Module/Document/Library.js:11966-11987` (topbar "New" dropdown — add a Legal Study branch alongside the existing Case Study one)

**Interfaces:**
- Consumes: `openCreateViewByUid(uid, fallbackUrl, params)` (already exists, defined ~line 6983, shared helper used by `openCreateReferenceModal`), `renderNewMenuLabel(icon, label)` (already exists), `TYPE_ICONS.folder` (already exists), `requireCompany()` (already exists).
- Produces: `openCreateLegalStudyModal` — no other task in this plan calls it.

- [ ] **Step 1: Add the popup UID/URL constants**

Before:
```js
  const CASE_REFERENCE_CREATE_POPUP_UID = "e9f1aeef243";
  const CASE_REFERENCE_CREATE_VIEW_URL =
    "https://law.dev.samset.net/admin/8y0rkp9rmka/view/e9f1aeef243";
```
After:
```js
  const CASE_REFERENCE_CREATE_POPUP_UID = "e9f1aeef243";
  const CASE_REFERENCE_CREATE_VIEW_URL =
    "https://law.dev.samset.net/admin/8y0rkp9rmka/view/e9f1aeef243";
  // Placeholder — the user must create a Nocobase popup view pointing at
  // All Module/Document/LegalStudyCreateBlock.js (same pattern as the Case
  // Study popup above) after this task deploys, then replace both values
  // below with the real UID/URL, exactly like CASE_REFERENCE_CREATE_POPUP_UID
  // was updated once its real view existed.
  const LEGAL_STUDY_CREATE_POPUP_UID = "__PENDING_NOCOBASE_VIEW_UID__";
  const LEGAL_STUDY_CREATE_VIEW_URL = "__PENDING_NOCOBASE_VIEW_URL__";
```

- [ ] **Step 2: Add `openCreateLegalStudyModal`, mirroring `openCreateReferenceModal`**

Before:
```js
    const openCreateReferenceModal = async () => {
      if (!requireCompany()) return;
      const dataBlockUid = CASE_REFERENCE_DATA_BLOCK_UID;
      await openCreateViewByUid(CASE_REFERENCE_CREATE_POPUP_UID, CASE_REFERENCE_CREATE_VIEW_URL, {
        activeCompanyId: extractId(activeCompanyId),
        internalCompanyId: extractId(activeCompanyId),
        sourceBlockUid: dataBlockUid,
        targetBlockUid: dataBlockUid,
        dataBlockUid,
      });
    };
```
After:
```js
    const openCreateReferenceModal = async () => {
      if (!requireCompany()) return;
      const dataBlockUid = CASE_REFERENCE_DATA_BLOCK_UID;
      await openCreateViewByUid(CASE_REFERENCE_CREATE_POPUP_UID, CASE_REFERENCE_CREATE_VIEW_URL, {
        activeCompanyId: extractId(activeCompanyId),
        internalCompanyId: extractId(activeCompanyId),
        sourceBlockUid: dataBlockUid,
        targetBlockUid: dataBlockUid,
        dataBlockUid,
      });
    };

    const openCreateLegalStudyModal = async () => {
      if (!requireCompany()) return;
      await openCreateViewByUid(LEGAL_STUDY_CREATE_POPUP_UID, LEGAL_STUDY_CREATE_VIEW_URL, {
        activeCompanyId: extractId(activeCompanyId),
        internalCompanyId: extractId(activeCompanyId),
      });
    };
```

- [ ] **Step 3: Add a Legal Study branch to the topbar "New" dropdown**

Before:
```js
                    {activeSpace !== "trash" &&
                      (currentFolderPerms.canCreate ||
                        (activeSpace === "legal_reference" &&
                          !activeLegalReferenceId)) && (
                        <Dropdown
                          menu={
                            activeSpace === "legal_reference" &&
                            !activeLegalReferenceId
                              ? {
                                  items: [
                                    {
                                      key: "create_reference",
                                      label: renderNewMenuLabel(
                                        TYPE_ICONS.folder,
                                        "New Case Study",
                                      ),
                                    },
                                  ],
                                  onClick: openCreateReferenceModal,
                                }
                              : newMenu
                          }
                          trigger={["click"]}
                        >
```
After:
```js
                    {activeSpace !== "trash" &&
                      (currentFolderPerms.canCreate ||
                        (activeSpace === "legal_reference" &&
                          !activeLegalReferenceId) ||
                        (activeSpace === LEGAL_STUDY_STORAGE_TYPE &&
                          !activeCustomerId)) && (
                        <Dropdown
                          menu={
                            activeSpace === "legal_reference" &&
                            !activeLegalReferenceId
                              ? {
                                  items: [
                                    {
                                      key: "create_reference",
                                      label: renderNewMenuLabel(
                                        TYPE_ICONS.folder,
                                        "New Case Study",
                                      ),
                                    },
                                  ],
                                  onClick: openCreateReferenceModal,
                                }
                              : activeSpace === LEGAL_STUDY_STORAGE_TYPE &&
                                  !activeCustomerId
                                ? {
                                    items: [
                                      {
                                        key: "create_legal_study",
                                        label: renderNewMenuLabel(
                                          TYPE_ICONS.folder,
                                          "New Legal Study",
                                        ),
                                      },
                                    ],
                                    onClick: openCreateLegalStudyModal,
                                  }
                                : newMenu
                          }
                          trigger={["click"]}
                        >
```

Note: `activeSpace === LEGAL_STUDY_STORAGE_TYPE && !activeCustomerId` matches exactly the condition already used elsewhere in this file (e.g. `isEntityGallery`'s definition and the Legal Study gallery's own render branch at `if (activeSpace === LEGAL_STUDY_STORAGE_TYPE && !activeCustomerId) { ... }`) for "currently at the Legal Study gallery root" — reuse it verbatim for consistency, don't invent a new condition.

- [ ] **Step 4: Babel syntax check**

Run the Global Constraints syntax-check script.
Expected: `OK: All Module/Document/Library.js`.

- [ ] **Step 5: Manual review checklist**

- Confirm the topbar's surrounding JSX (the `React.Fragment` wrapping this `Dropdown` plus the `Refresh` button after it) still has balanced tags — the added `?... : ... ?... : ...` ternary chain replaces a 2-way ternary with a 3-way one; count parens/braces carefully against the "Before" block.
- Confirm `currentFolderPerms.canCreate` doesn't itself block the button from showing at the Legal Study gallery root: at `selectedFolderId === "root"`, `getFolderPermsById("root", "legal_study")` returns `viewer` for non-admins (no `canCreate`) — this task's added `|| (activeSpace === LEGAL_STUDY_STORAGE_TYPE && !activeCustomerId)` clause is exactly what makes the button appear regardless of that, mirroring how the existing `legal_reference` clause already works the same way.
- This task deliberately does **not** add a matching button to the Legal Study gallery's empty-state view (unlike Case Reference/Case Study, which has one there too) — the topbar entry point is sufficient per the spec's Part B4, and duplicating it would be unrequested scope. Do not add one.

- [ ] **Step 6: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "$(cat <<'EOF'
feat: add "New Legal Study" entry point at the gallery root

Opens the Nocobase popup view backed by LegalStudyCreateBlock.js, mirroring
exactly how "New Case Study" already opens CaseReferenceCreateBlock.js.
LEGAL_STUDY_CREATE_POPUP_UID/LEGAL_STUDY_CREATE_VIEW_URL are placeholders
until the corresponding Nocobase view is configured and its real UID/URL
are provided. Per
docs/superpowers/specs/2026-07-31-standalone-legal-study-design.md Part B4.
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Spec Part A1 (bỏ field thừa) → Task 1. ✅
- Spec Part A2 (folderTemplateKey + luôn có folder gốc) → Task 2. ✅
- Spec Part B1 (rename-lock) → Task 3. ✅
- Spec Part B2 (gallery gồm cả Group 2) → Task 4. ✅
- Spec Part B3 (duyệt Group 2, không cần fetch riêng) → Task 5. ✅
- Spec Part B4 (điểm vào tạo mới) → Task 6. ✅
- Spec Part B5 (breadcrumb) → Task 5 (folded in alongside B3 since both touch the same "no active Case" condition and are trivial to review together). ✅
- Spec's non-goals (không đổi `LegalReferenceWorkspace.js`, không đổi Case Study, không đổi Group 1 hành vi) — no task in this plan touches `LegalReferenceWorkspace.js` or `CaseReferenceCreateBlock.js`; every Library.js task's manual-review step explicitly re-confirms the `activeCaseId`-present (Group 1) path is untouched.

**Placeholder scan:** The two `__PENDING_NOCOBASE_VIEW_UID__`/`__PENDING_NOCOBASE_VIEW_URL__` sentinel strings in Task 6 Step 1 are the one intentional exception — they hold a value that can only come from a Nocobase admin action outside this codebase (identical to how `CASE_REFERENCE_CREATE_POPUP_UID` started as a placeholder earlier this session and was swapped for the real UID once the user configured that view). No other placeholder language appears.

**Type consistency:** `LEGAL_STUDY_FOLDER_TEMPLATE_KEY` is defined once in `Library.js` (pre-existing, line 111) and once in `LegalStudyCreateBlock.js` (Task 2 Step 1) — same string value `"legal_study"` in both, never redefined differently. `entry.study`/`entry.project`/`entry.customer` (Task 4) are read consistently by name in Task 4's own render-block edits; no later task in this plan reads them under a different name.
