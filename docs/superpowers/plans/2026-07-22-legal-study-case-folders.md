# Legal Study → Case-Scoped Folders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `legalStudy`-collection-backed "Legal Study" feature in `All Module/Document/Library.js` with a design where a "Legal Study" is simply a root-level `folders` row (`storageType`/`moduleScope: "legal_study"`) scoped to a real case (`projectId`/`caseId` FK), matching the design spec.

**Architecture:** All changes are inside one file, `All Module/Document/Library.js` (currently ~15929 lines). No other file is touched. Work proceeds additive-first (new data helpers, new create flow) before the risky parts (swapping the table, deleting dead code), so the file stays in a working, syntactically valid state after every task.

**Tech Stack:** React (`ctx.React`), Ant Design (`ctx.antd`), `ctx.api.request()` against the existing `folders`/`documents`/`projects` collections. No backend/schema changes — the (still-existing but unused-by-frontend-after-this-plan) `legalStudy` collection is the user's own responsibility to retire.

## Global Constraints

- Nocobase JS blocks stay in exactly one file — no `import`/`require` of local modules (see `CLAUDE.md`).
- No `fetch()` — only `ctx.api.request()`.
- No direct `import` — only `ctx.React`, `ctx.antd`, `ctx.importAsync()`, `ctx.requireAsync()`.
- This repo has no automated test runner. Verification per task is a Babel-parser syntax check (command below) run against the full file — the same tool this repo already uses for other JS blocks — plus a manual reasoning trace of the specific change, since this file cannot be executed outside Nocobase.
- Status/enum labels come from config, not hardcoded inline — not directly relevant here since this feature drops its status field entirely (see spec).
- Money formatting: not applicable to this feature.
- **Do not touch** `All Module/Document/LegalStudyDocument.js`, `All Module/Document/LegalStudyCreateBlock.js`, `JsField/JsLegalStudyLinks.js` — explicitly out of scope per the design spec.
- **This file is huge (~16000 lines) and every task after Task 1 will shift line numbers from what's written below.** Every task's steps that reference a line number MUST be preceded by using Grep to re-locate the exact current line number of the anchor text before editing — the code shown in this plan is verbatim as of the plan-writing pass (verified by direct reads) and is the ground truth for *what* to find and *what to change it to*, not *where* (line numbers drift).

Babel syntax-check command (run after every task, from repo root):
```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('All Module/Document/Library.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```

---

## Task 1: Case-scoped payload plumbing + folder-based stats + case-name helper

**Files:**
- Modify: `All Module/Document/Library.js`

**Interfaces:**
- Consumes: existing `folders`, `documents`, `projects` state; existing `extractId`, `getFolderParentId`, `LEGAL_STUDY_STORAGE_TYPE`, `LEGAL_STUDY_MODULE_SCOPE` constants; existing `legalStudyRootFolders` (already computed at the time of this plan, no change needed — see Step 5).
- Produces: `buildScopedPayload`'s `LEGAL_STUDY_STORAGE_TYPE` branch now keyed by a real case id (used by Task 3's create flow); `legalStudyFolderStats` (memoized object, keyed by root folder id string) → `{ folderCount, docCount }` per key; `getCaseNameForFolder(folder)` → `string`.

This task changes shared plumbing but does not touch any rendered UI yet — after this task the file must still render exactly as it did before (the old table/create-modal are untouched and still work, just now backed by the same `buildScopedPayload` with a param that nothing calls with a real value yet — this is safe because the OLD code path's only caller of the `LEGAL_STUDY_STORAGE_TYPE` branch, `handleCreateLegalStudy`'s upload calls, is dead/unreachable, verified in research — see the Global Constraints note on `LegalStudyCreateBlock.js` being the live create path, not this file's dead modal).

- [ ] **Step 1: Locate and update `buildScopedPayload`**

Grep for `const buildScopedPayload = useCallback(` to find its current location (was lines 6786-6849 at plan-writing time). Read 70 lines from that point to confirm you have the full function, which currently reads exactly:

```js
    const buildScopedPayload = useCallback(
      (
        targetSpace,
        targetLegalReferenceId = activeLegalReferenceId,
        targetLegalStudyId = activeLegalStudyId,
      ) => {
        if (targetSpace === "company_shared") {
          return {
            internalCompanyId: extractId(activeCompanyId),
            moduleScope: INTERNAL_TEMPLATE_MODULE_SCOPE,
          };
        }
        if (targetSpace === LEGAL_STUDY_STORAGE_TYPE) {
          return {
            ...(activeCompanyId
              ? { internalCompanyId: extractId(activeCompanyId) }
              : {}),
            moduleScope: LEGAL_STUDY_MODULE_SCOPE,
            ...buildLegalStudyRelationPayload(targetLegalStudyId),
          };
        }
        if (targetSpace === "legal_reference") {
          return {
            internalCompanyId: extractId(activeCompanyId),
            legalReferenceId: extractId(targetLegalReferenceId),
            moduleScope: "legal_reference",
          };
        }
        if (targetSpace === "customer") {
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
        if (targetSpace === MY_DOCUMENT_STORAGE_TYPE) {
          return { moduleScope: MY_DOCUMENT_STORAGE_TYPE };
        }
        if (targetSpace === KNOWLEDGE_STORAGE_TYPE) {
          return {
            internalCompanyId: extractId(activeCompanyId),
            moduleScope: KNOWLEDGE_STORAGE_TYPE,
          };
        }
        return buildScopePayload(activeCompanyId);
      },
      [
        activeCompanyId,
        activeLegalReferenceId,
        activeLegalStudyId,
        activeCaseId,
        activeCustomerId,
      ],
    );
```

Replace it with:

```js
    const buildScopedPayload = useCallback(
      (
        targetSpace,
        targetLegalReferenceId = activeLegalReferenceId,
        targetLegalStudyCaseId = null,
      ) => {
        if (targetSpace === "company_shared") {
          return {
            internalCompanyId: extractId(activeCompanyId),
            moduleScope: INTERNAL_TEMPLATE_MODULE_SCOPE,
          };
        }
        if (targetSpace === LEGAL_STUDY_STORAGE_TYPE) {
          return {
            ...(targetLegalStudyCaseId
              ? {
                  projectId: extractId(targetLegalStudyCaseId),
                  caseId: extractId(targetLegalStudyCaseId),
                }
              : {}),
            ...(activeCompanyId
              ? { internalCompanyId: extractId(activeCompanyId) }
              : {}),
            moduleScope: LEGAL_STUDY_MODULE_SCOPE,
          };
        }
        if (targetSpace === "legal_reference") {
          return {
            internalCompanyId: extractId(activeCompanyId),
            legalReferenceId: extractId(targetLegalReferenceId),
            moduleScope: "legal_reference",
          };
        }
        if (targetSpace === "customer") {
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
        if (targetSpace === MY_DOCUMENT_STORAGE_TYPE) {
          return { moduleScope: MY_DOCUMENT_STORAGE_TYPE };
        }
        if (targetSpace === KNOWLEDGE_STORAGE_TYPE) {
          return {
            internalCompanyId: extractId(activeCompanyId),
            moduleScope: KNOWLEDGE_STORAGE_TYPE,
          };
        }
        return buildScopePayload(activeCompanyId);
      },
      [
        activeCompanyId,
        activeLegalReferenceId,
        activeCaseId,
        activeCustomerId,
      ],
    );
```

(Note: `activeLegalStudyId` is removed from the default-param and the dependency array — it will be removed from state entirely in Task 5. `buildLegalStudyRelationPayload` is no longer called here, but do NOT delete that helper — it and its 3 siblings `getLegalStudyRelationIdFromPayload`/`stripLegalStudyRelationPayload`/`buildLegalStudyRelationVariants` are also used by `requestCreateWithInternalTemplateRelation` — an unrelated, still-live generic document-create wrapper shared with the internal-template feature. Leave all 4 of those helpers untouched; this is a deliberate, explicit exception — do not "clean them up" even though `buildScopedPayload` no longer calls one of them.)

- [ ] **Step 2: Update the two upload functions' `targetLegalStudyId` resolution and their `buildScopedPayload` call**

Grep for `const uploadFilesToTarget = useCallback(` and `const uploadFolderFilesToTarget = useCallback(`. In EACH function, find this block (appears once near the top of each function body):

```js
        const targetLegalStudyId =
          options.legalStudyId === undefined
            ? activeLegalStudyId
            : options.legalStudyId;
```

Replace with:

```js
        const targetLegalStudyCaseId =
          options.legalStudyCaseId === undefined
            ? null
            : options.legalStudyCaseId;
```

Then, still within each of the two functions, Grep within that function's body for `buildScopedPayload(targetSpace,` (there is exactly one call per function, further down in the body, not shown in this plan's earlier verbatim excerpts — locate it directly) and change its 3rd argument from `targetLegalStudyId` to `targetLegalStudyCaseId`. If the call site passes all 3 args positionally like `buildScopedPayload(targetSpace, targetLegalReferenceId, targetLegalStudyId)`, the fix is a straight rename of that one identifier at the call site.

Also update each function's `useCallback` dependency array: remove `activeLegalStudyId` if present, do not add a replacement (the new `targetLegalStudyCaseId` comes from `options`, not from component state, so it's not a hook dependency).

- [ ] **Step 3: Replace `legalStudyStats` with folder-based descendant counting**

Grep for `const legalStudyStats = useMemo(`. It currently reads:

```js
    const legalStudyStats = useMemo(() => {
      const stats = {};
      legalStudyRecords.forEach((study) => {
        const sid = String(extractId(study));
        stats[sid] = {
          folderCount: folders.filter(
            (f) =>
              !f.isDeleted &&
              f.storageType === LEGAL_STUDY_STORAGE_TYPE &&
              String(
                extractId(f.legalStudyId) || extractId(f.legalStudy) || "",
              ) === sid,
          ).length,
          docCount: documents.filter(
            (d) =>
              !d.isDeleted &&
              d.storageType === LEGAL_STUDY_STORAGE_TYPE &&
              String(
                extractId(d.legalStudyId) || extractId(d.legalStudy) || "",
              ) === sid,
          ).length,
        };
      });
      return stats;
    }, [legalStudyRecords, folders, documents]);
```

Replace with a version that counts ALL descendant folders/documents under each root folder (walking the `parentFolderId`/`folderId` chain, however many levels deep — same semantics as before, just keyed by real folder id instead of the old `legalStudyId` relation):

```js
    const legalStudyFolderStats = useMemo(() => {
      const liveFolders = folders.filter((f) => !f.isDeleted);
      const liveDocs = documents.filter((d) => !d.isDeleted);
      const stats = {};
      legalStudyRootFolders.forEach((root) => {
        const rootId = String(extractId(root));
        const descendantFolderIds = new Set([rootId]);
        // Folders can nest arbitrarily deep; repeatedly sweep until no new
        // descendant is found (folders.length passes is a safe upper bound).
        for (let pass = 0; pass < liveFolders.length; pass++) {
          let added = false;
          liveFolders.forEach((f) => {
            const fid = String(extractId(f));
            if (descendantFolderIds.has(fid)) return;
            const parentId = String(getFolderParentId(f) || "");
            if (descendantFolderIds.has(parentId)) {
              descendantFolderIds.add(fid);
              added = true;
            }
          });
          if (!added) break;
        }
        stats[rootId] = {
          folderCount: descendantFolderIds.size - 1, // exclude the root itself
          docCount: liveDocs.filter((d) =>
            descendantFolderIds.has(String(extractId(d.folderId))),
          ).length,
        };
      });
      return stats;
    }, [legalStudyRootFolders, folders, documents]);
```

- [ ] **Step 4: Add `getCaseNameForFolder`**

Grep for `const getLegalStudyDisplayName = (record) => {` (currently around line 2365) and add this new function directly after its closing `};`:

```js
  const getCaseNameForFolder = (folder) => {
    const caseId = extractId(folder?.projectId) || extractId(folder?.caseId);
    if (!caseId) return "";
    const caseRecord = projects.find(
      (p) => String(extractId(p)) === String(caseId),
    );
    if (!caseRecord) return "";
    return (
      caseRecord.projectName ||
      caseRecord.caseCode ||
      `Vụ việc #${extractId(caseRecord)}`
    );
  };
```

(This is a plain function reading the `projects` array captured at render time via closure, same pattern already used elsewhere in this file for e.g. the breadcrumb case-name lookup — it does not need `useCallback`/`useMemo` since it's cheap and only called from within already-memoized render code in Task 3.)

- [ ] **Step 5: Verify `legalStudyRootFolders` needs no changes**

Grep for `const legalStudyRootFolders = useMemo(` and confirm it still reads (no edit needed, just confirm — this task relies on it existing unchanged):

```js
    const legalStudyRootFolders = useMemo(() => {
      return folders.filter((f) => {
        if (f.isDeleted) return false;
        if (f.storageType !== LEGAL_STUDY_STORAGE_TYPE) return false;
        const pId = getFolderParentId(f);
        if (pId && pId !== "root") return false;
        const currentUser = currentUserState;
        if (!currentUser) return true;
        if (isAdminUser(currentUser)) return true;
        const { accessible } = getVisibleFolderIds(
          folders,
          currentUser,
          currentLawyerId,
        );
        return accessible.has(extractId(f.id));
      });
    }, [folders, currentUserState, currentLawyerId]);
```

If it differs from this, STOP and report NEEDS_CONTEXT rather than guessing — the rest of this plan assumes this exact filter (root-level, `storageType === "legal_study"`, permission-filtered) exists unchanged.

- [ ] **Step 6: Verify the file still parses**

```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('All Module/Document/Library.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 7: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "refactor: scope Legal Study payload/stats by case instead of legalStudy relation"
```

---

## Task 2: New filtered root-folder list (replaces `filteredSidebarLegalStudy`)

**Files:**
- Modify: `All Module/Document/Library.js`

**Interfaces:**
- Consumes: `legalStudyRootFolders` (Task 1), `galleryCompanyFilter`, `sidebarSearch` (existing state), `getLegalStudyDisplayName` (existing, works unchanged on `folders` records since they have a `.name` field — `record.title || record.name || ...` falls through to `.name`).
- Produces: `filteredLegalStudyFolders` (array) — the new `dataSource` for Task 3's table.

This task also deletes two now-fully-dead helper `useMemo`s discovered during research (confirmed zero other call sites): `legalStudyRootFoldersByRecord` and `filteredSidebarLegalStudyFolders`. `filteredSidebarLegalStudy` itself is replaced (not just deleted) since Task 3 needs its replacement to exist first.

- [ ] **Step 1: Delete `legalStudyRootFoldersByRecord`**

Grep for `const legalStudyRootFoldersByRecord = useMemo(`. Confirm via Grep that `legalStudyRootFoldersByRecord` has no other occurrences in the file besides its own declaration (research at plan-writing time found none — re-verify, since Task 1 did not touch this area). It currently reads:

```js
    const legalStudyRootFoldersByRecord = useMemo(() => {
      const map = {};
      folders.forEach((f) => {
        if (f.isDeleted) return;
        const lsId = String(
          extractId(f.legalStudyId) ||
            extractId(f.legalStudy) ||
            extractId(f.legalStudies) ||
            "",
        );
        if (!lsId) return;
        const pId = getFolderParentId(f);
        if (pId && pId !== "root") return;
        if (!map[lsId]) map[lsId] = [];
        map[lsId].push(f);
      });
      return map;
    }, [folders]);
```

Delete this whole block (including its blank line before/after, keep exactly one blank line separating the surrounding code).

- [ ] **Step 2: Delete `filteredSidebarLegalStudyFolders` and replace `filteredSidebarLegalStudy`**

Grep for `const filteredSidebarLegalStudyFolders = useMemo(`. Confirm via Grep it has no other occurrences besides its own declaration and its own dependency on `legalStudyRootFolders` (re-verify — do not assume the earlier research pass is still accurate after Task 1's edits). The two blocks currently read (back to back):

```js
    const filteredSidebarLegalStudyFolders = useMemo(() => {
      if (!sidebarSearch) return legalStudyRootFolders;
      const q = sidebarSearch.toLowerCase();
      return legalStudyRootFolders.filter((f) =>
        (f.name || "").toLowerCase().includes(q),
      );
    }, [legalStudyRootFolders, sidebarSearch]);

    const filteredSidebarLegalStudy = useMemo(() => {
      let result = legalStudyRecords;
      if (!isAdmin && accessibleLegalStudyIds !== null) {
        result = result.filter((r) =>
          accessibleLegalStudyIds.has(String(extractId(r))),
        );
      }
      if (galleryCompanyFilter.length > 0) {
        result = result.filter((r) => {
          const cid = String(
            extractId(r.internalCompanyId) || extractId(r.internalCompany) || "",
          );
          return galleryCompanyFilter.includes(cid);
        });
      }
      if (sidebarSearch) {
        const q = sidebarSearch.toLowerCase();
        result = result.filter((r) =>
          getLegalStudyDisplayName(r).toLowerCase().includes(q),
        );
      }
      return result;
    }, [
      legalStudyRecords,
      isAdmin,
      accessibleLegalStudyIds,
      sidebarSearch,
      galleryCompanyFilter,
    ]);
```

Replace BOTH blocks with a single new one (folder-level permission filtering is already handled inside `legalStudyRootFolders` itself — see Task 1 Step 5 — so this replacement does not need the `isAdmin`/`accessibleLegalStudyIds` check that the old `filteredSidebarLegalStudy` had):

```js
    const filteredLegalStudyFolders = useMemo(() => {
      let result = legalStudyRootFolders;
      if (galleryCompanyFilter.length > 0) {
        result = result.filter((f) => {
          const cid = String(
            extractId(f.internalCompanyId) || extractId(f.internalCompany) || "",
          );
          return galleryCompanyFilter.includes(cid);
        });
      }
      if (sidebarSearch) {
        const q = sidebarSearch.toLowerCase();
        result = result.filter((f) =>
          getLegalStudyDisplayName(f).toLowerCase().includes(q),
        );
      }
      return result;
    }, [legalStudyRootFolders, sidebarSearch, galleryCompanyFilter]);
```

- [ ] **Step 3: Verify the file still parses**

```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('All Module/Document/Library.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 4: Grep-verify no dangling references**

Run `grep -n "legalStudyRootFoldersByRecord\|filteredSidebarLegalStudyFolders\|filteredSidebarLegalStudy\b"` (or use the Grep tool) over the file. Expected: zero matches for the first two names; zero matches for `filteredSidebarLegalStudy` too (it's fully replaced, not just renamed — Task 3 will introduce the new `filteredLegalStudyFolders` name). If `filteredSidebarLegalStudy` still appears anywhere (e.g., the still-untouched old table in Task 3's territory), that's expected until Task 3 runs — note it in your report, do not fix it in this task.

- [ ] **Step 5: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "refactor: replace legalStudy-relation filtering with folder-based filteredLegalStudyFolders"
```

---

## Task 3: New inline "create Legal Study folder" flow

**Files:**
- Modify: `All Module/Document/Library.js`

**Interfaces:**
- Consumes: `projects` (case list, existing state), `buildScopedPayload` (Task 1), `createFolderRecord`, `uploadFilesToTarget`, `uploadFolderFilesToTarget` (existing, Task 1 updated their option handling), `LEGAL_STUDY_STORAGE_TYPE`/`LEGAL_STUDY_MODULE_SCOPE` (existing constants).
- Produces: `isCreateLegalStudyFolderOpen`/`setIsCreateLegalStudyFolderOpen` state, `createLegalStudyFolderForm` (antd Form instance), `legalStudyUploadFileInputRef`, `legalStudyUploadFolderInputRef` (new hidden `<input>` refs), `handleLegalStudyFileSelect`, `handleLegalStudyFolderSelect` (input `onChange` handlers), `handleCreateLegalStudyFolder` (modal submit handler), a new `<Modal>` JSX block. None of this is wired to the "+New" button yet — that happens in Task 4. This task is purely additive; nothing existing changes behavior.

- [ ] **Step 1: Add new state**

Grep for `const [legalStudyRecords, setLegalStudyRecords] = useState([]);` (currently line ~3929, alongside `activeLegalStudyId`). Directly after that pair of lines (do not remove them yet — Task 5 removes them), add:

```js
    const [isCreateLegalStudyFolderOpen, setIsCreateLegalStudyFolderOpen] =
      useState(false);
    const [createLegalStudyFolderLoading, setCreateLegalStudyFolderLoading] =
      useState(false);
    const [legalStudyUploadFiles, setLegalStudyUploadFiles] = useState([]);
    const [legalStudyUploadFolderFiles, setLegalStudyUploadFolderFiles] =
      useState([]);
    const [legalStudyUploadIsFolder, setLegalStudyUploadIsFolder] =
      useState(false);
    const [legalStudyUploadDefaultName, setLegalStudyUploadDefaultName] =
      useState("");
    const legalStudyUploadFileInputRef = useRef(null);
    const legalStudyUploadFolderInputRef = useRef(null);
```

(`useRef` is already imported/used elsewhere in this file for `fileInputRef` etc. — confirm via Grep for `useRef` near the top of the component if unsure; do not re-import React hooks.)

You will also need a Form instance for the modal. Grep for `const [createLegalStudyForm] = Form.useForm();` (the OLD dead modal's form, line ~3841) and add a new one directly after it (leave the old one in place — Task 5 removes it):

```js
    const [createLegalStudyFolderForm] = Form.useForm();
```

- [ ] **Step 2: Add the hidden file/folder inputs**

Grep for the existing hidden input block containing `ref={createReferenceFolderInputRef}` (currently lines 12116-12147, shown in full below for context — do not modify these, just find them as an anchor):

```jsx
              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={handleFileInputTrigger}
              />
              <input
                ref={folderInputRef}
                type="file"
                multiple
                webkitdirectory="true"
                directory="true"
                style={{ display: "none" }}
                onChange={handleFolderInputTrigger}
              />
              <input
                ref={createReferenceFileInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={handleCreateReferenceFileSelect}
              />
              <input
                ref={createReferenceFolderInputRef}
                type="file"
                multiple
                webkitdirectory="true"
                directory="true"
                style={{ display: "none" }}
                onChange={handleCreateReferenceFolderSelect}
              />
```

Add two more hidden inputs directly after this block (same indentation):

```jsx
              <input
                ref={legalStudyUploadFileInputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={handleLegalStudyFileSelect}
              />
              <input
                ref={legalStudyUploadFolderInputRef}
                type="file"
                multiple
                webkitdirectory="true"
                directory="true"
                style={{ display: "none" }}
                onChange={handleLegalStudyFolderSelect}
              />
```

- [ ] **Step 3: Add the input-change handlers and submit handler**

Grep for `const handleCreateLegalStudy = async (values) => {` (the OLD dead handler, currently lines 7254-7322 — do not modify it, just use it as a location anchor) and add the following new code directly before it:

```js
    const handleLegalStudyFileSelect = (e) => {
      const files = Array.from(e.target.files || []);
      if (e.target) e.target.value = "";
      if (!files.length) return;
      setLegalStudyUploadIsFolder(false);
      setLegalStudyUploadFiles(files);
      setLegalStudyUploadFolderFiles([]);
      setLegalStudyUploadDefaultName("");
      createLegalStudyFolderForm.resetFields();
      setIsCreateLegalStudyFolderOpen(true);
    };

    const handleLegalStudyFolderSelect = (e) => {
      const files = Array.from(e.target.files || []);
      if (e.target) e.target.value = "";
      if (!files.length) return;
      const firstPath = getUploadRelativePath(files[0]);
      const topLevelName = firstPath.split("/")[0] || "";
      setLegalStudyUploadIsFolder(true);
      setLegalStudyUploadFolderFiles(files);
      setLegalStudyUploadFiles([]);
      setLegalStudyUploadDefaultName(topLevelName);
      createLegalStudyFolderForm.resetFields();
      createLegalStudyFolderForm.setFieldsValue({ name: topLevelName });
      setIsCreateLegalStudyFolderOpen(true);
    };

    const handleCreateLegalStudyFolder = async (values) => {
      setCreateLegalStudyFolderLoading(true);
      try {
        const userId = getCurrentUserId();
        const caseId = extractId(values.caseId);
        const nowIso = new Date().toISOString();
        const folderPayload = {
          name: values.name.trim(),
          type: "custom",
          storageType: LEGAL_STUDY_STORAGE_TYPE,
          createdAt: nowIso,
          updatedAt: nowIso,
          ...(userId ? { createdById: userId, updatedById: userId } : {}),
          ...buildScopedPayload(LEGAL_STUDY_STORAGE_TYPE, undefined, caseId),
        };
        const createRes = await createFolderRecord(folderPayload);
        const newFolderId = extractId(createRes?.data?.data);
        if (!newFolderId) {
          throw new Error("Folder creation returned no id");
        }

        if (legalStudyUploadIsFolder && legalStudyUploadFolderFiles.length) {
          await uploadFolderFilesToTarget(legalStudyUploadFolderFiles, {
            storageType: LEGAL_STUDY_STORAGE_TYPE,
            legalStudyCaseId: caseId,
            folderId: newFolderId,
            skipPermissionCheck: true,
            refresh: false,
            showProgress: false,
            successMessage: false,
          }).catch(() => {});
        } else if (legalStudyUploadFiles.length) {
          await uploadFilesToTarget(legalStudyUploadFiles, {
            storageType: LEGAL_STUDY_STORAGE_TYPE,
            legalStudyCaseId: caseId,
            folderId: newFolderId,
            skipPermissionCheck: true,
            refresh: false,
            successMessage: false,
          }).catch(() => {});
        }

        message.success("Đã tạo Legal Study.");
        setIsCreateLegalStudyFolderOpen(false);
        createLegalStudyFolderForm.resetFields();
        setLegalStudyUploadFiles([]);
        setLegalStudyUploadFolderFiles([]);
        loadData();
      } catch (e) {
        console.error(e);
        message.error("Tạo Legal Study thất bại.");
      } finally {
        setCreateLegalStudyFolderLoading(false);
      }
    };

```

(This calls `getUploadRelativePath`, `createFolderRecord`, `uploadFolderFilesToTarget`, `uploadFilesToTarget`, `getCurrentUserId`, `message`, `loadData` — all confirmed to already exist elsewhere in this file. If any Grep for one of these turns up nothing, STOP and report NEEDS_CONTEXT with the exact missing name rather than inventing a replacement.)

- [ ] **Step 4: Add the create modal JSX**

Grep for `{/* ── CREATE LEGAL STUDY MODAL ── */}` (the OLD dead modal's comment, currently line 15391) and add the following new modal directly BEFORE that comment (so the new live modal and the old dead one both exist side by side until Task 5 deletes the old one):

```jsx
        {/* ── CREATE LEGAL STUDY FOLDER MODAL ── */}
        <Modal
          title={
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: "#111827",
                fontFamily: FONT,
              }}
            >
              Tạo Legal Study
            </span>
          }
          open={isCreateLegalStudyFolderOpen}
          onCancel={() => {
            setIsCreateLegalStudyFolderOpen(false);
            createLegalStudyFolderForm.resetFields();
            setLegalStudyUploadFiles([]);
            setLegalStudyUploadFolderFiles([]);
          }}
          footer={null}
          destroyOnClose
          width={480}
        >
          <Form
            form={createLegalStudyFolderForm}
            layout="vertical"
            onFinish={handleCreateLegalStudyFolder}
          >
            <Form.Item
              name="name"
              label="Tên Legal Study"
              rules={[{ required: true, message: "Vui lòng nhập tên" }]}
            >
              <Input placeholder="Nhập tên..." />
            </Form.Item>
            <Form.Item
              name="caseId"
              label="Vụ việc liên quan"
              rules={[{ required: true, message: "Vui lòng chọn vụ việc" }]}
            >
              <Select
                showSearch
                placeholder="Chọn vụ việc..."
                optionFilterProp="label"
                options={projects.map((p) => ({
                  value: extractId(p),
                  label: p.projectName || p.caseCode || `Vụ việc #${extractId(p)}`,
                }))}
              />
            </Form.Item>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>
              {legalStudyUploadIsFolder
                ? `${legalStudyUploadFolderFiles.length} file trong folder đã chọn`
                : `${legalStudyUploadFiles.length} file đã chọn`}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <Button
                onClick={() => {
                  setIsCreateLegalStudyFolderOpen(false);
                  createLegalStudyFolderForm.resetFields();
                  setLegalStudyUploadFiles([]);
                  setLegalStudyUploadFolderFiles([]);
                }}
                style={{
                  borderRadius: 8,
                  border: "0.5px solid #E5E7EB",
                  color: "#6B7280",
                }}
              >
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createLegalStudyFolderLoading}
                style={{
                  borderRadius: 8,
                  background: "#185FA5",
                  borderColor: "#185FA5",
                }}
              >
                Tạo
              </Button>
            </div>
          </Form>
        </Modal>

```

- [ ] **Step 5: Verify the file still parses**

```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('All Module/Document/Library.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 6: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "feat: add inline create-Legal-Study-folder upload flow (not yet wired to any button)"
```

---

## Task 4: Wire the table to the new flow (columns, data source, drill-down, +New trigger)

**Files:**
- Modify: `All Module/Document/Library.js`

**Interfaces:**
- Consumes: `filteredLegalStudyFolders` (Task 2), `legalStudyFolderStats` (Task 1), `getCaseNameForFolder` (Task 1), `getUploadRelativePath`-driven modal from Task 3 (via `legalStudyUploadFileInputRef`/`legalStudyUploadFolderInputRef`), `projects` (existing state, for the drill-down customer lookup).
- Produces: the live Legal Study table, now case-scoped and reading from real folders; the "+New" trigger now opens the file/folder picker from Task 3 instead of the old popup.

This is the task where user-visible behavior actually changes. Read the existing `isEntityGallery` condition (Grep for `const isEntityGallery =`, currently lines 3933-3937) and the case-folder-browser navigation pattern (Grep for `setActiveCaseId(null);` near `handleBreadcrumbClick`, currently around line 5816-5827) BEFORE writing the `onRow` handler below — confirm that setting `activeSpace`, `activeCustomerId`, `activeCaseId`, and `selectedFolderId` together is what makes the existing "customer" space folder browser show the folder tree (not the customer/case gallery) rather than assuming this plan's snippet is complete; if the real navigation requires an additional piece of state not listed here, add it and note the discrepancy in your report.

- [ ] **Step 1: Locate and replace the Legal Study gallery block**

Grep for `/* ── LEGAL STUDY GALLERY ── */` (currently line 13042). Read from there through the matching closing `}` (currently line 13239 — the block is `if (activeSpace === LEGAL_STUDY_STORAGE_TYPE && !activeLegalStudyId) { ... }`). The full current block (table branch + card/gallery branch) is reproduced in this plan's research notes; at a minimum confirm the block still starts with:

```jsx
                  /* ── LEGAL STUDY GALLERY ── */
                  if (
                    activeSpace === LEGAL_STUDY_STORAGE_TYPE &&
                    !activeLegalStudyId
                  ) {
```

Replace the ENTIRE `if (...) { ... }` block (table branch AND card/gallery branch, everything from `/* ── LEGAL STUDY GALLERY ── */` through the matching closing `}` before `return null;`) with:

```jsx
                  /* ── LEGAL STUDY GALLERY ── */
                  if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
                    const items = filteredLegalStudyFolders;
                    const openFolder = (folder) => {
                      const caseId = extractId(folder.projectId) || extractId(folder.caseId);
                      const caseRecord = projects.find(
                        (p) => String(extractId(p)) === String(caseId),
                      );
                      const customerId =
                        extractId(caseRecord?.customerId) ||
                        extractId(caseRecord?.customer);
                      setActiveSpace("customer");
                      setActiveCustomerId(customerId ? String(customerId) : null);
                      setActiveCaseId(caseId ? String(caseId) : null);
                      setSelectedFolderId(String(extractId(folder)));
                    };
                    return (
                      <div>
                        {renderBulkBar(LEGAL_STUDY_STORAGE_TYPE)}
                        <Table
                          size="small"
                          rowSelection={{
                            ...entityRowSelection,
                            getCheckboxProps: () => ({
                              onClick: (e) => e.stopPropagation(),
                            }),
                          }}
                          dataSource={items}
                          rowKey={(r) => String(extractId(r))}
                          onRow={(r) => ({
                            onClick: () => openFolder(r),
                            onContextMenu: (e) =>
                              handleEntityCtx(e, r, LEGAL_STUDY_STORAGE_TYPE),
                          })}
                          pagination={{
                            pageSize: 20,
                            showSizeChanger: true,
                            pageSizeOptions: ["20", "50", "100"],
                            showTotal: (total) => `${total} mục`,
                          }}
                          style={{
                            background: "#fff",
                            borderRadius: 10,
                            border: "1px solid #E5E7EB",
                          }}
                          columns={[
                            {
                              title: "STT",
                              width: 52,
                              render: (_, __, i) => i + 1,
                            },
                            {
                              title: "Tên Legal Study",
                              key: "name",
                              render: (_, r) => {
                                const name = getLegalStudyDisplayName(r);
                                return (
                                  <Tooltip title={name}>
                                    <span
                                      style={{
                                        fontWeight: 500,
                                        cursor: "pointer",
                                      }}
                                    >
                                      {name}
                                    </span>
                                  </Tooltip>
                                );
                              },
                            },
                            {
                              title: "Vụ việc liên quan",
                              key: "caseName",
                              render: (_, r) => {
                                const name = getCaseNameForFolder(r);
                                return name ? (
                                  <Tooltip title={name}>
                                    <span>{name}</span>
                                  </Tooltip>
                                ) : (
                                  <span style={{ color: "#9CA3AF" }}>—</span>
                                );
                              },
                            },
                            {
                              title: "Thư mục",
                              width: 80,
                              render: (_, r) => {
                                const st =
                                  legalStudyFolderStats[String(extractId(r))] || {};
                                return (
                                  <span style={{ color: "#185FA5" }}>
                                    {st.folderCount || 0}
                                  </span>
                                );
                              },
                            },
                            {
                              title: "File",
                              width: 60,
                              render: (_, r) => {
                                const st =
                                  legalStudyFolderStats[String(extractId(r))] || {};
                                return (
                                  <span style={{ color: "#185FA5" }}>
                                    {st.docCount || 0}
                                  </span>
                                );
                              },
                            },
                            {
                              title: "Ngày tạo",
                              dataIndex: "createdAt",
                              width: 110,
                              defaultSortOrder: "descend",
                              sorter: (a, b) =>
                                new Date(a.createdAt || 0) -
                                new Date(b.createdAt || 0),
                              render: (v) => formatDate(v),
                            },
                            {
                              title: "Người tạo",
                              width: 140,
                              render: (_, r) =>
                                r.createdBy?.nickname ||
                                r.createdBy?.email ||
                                "—",
                            },
                          ]}
                        />
                        {items.length === 0 && (
                          <div style={{ padding: "80px 0", textAlign: "center" }}>
                            <Empty
                              description={
                                sidebarSearch
                                  ? "Không tìm thấy"
                                  : "Chưa có Legal Study"
                              }
                            />
                            {!sidebarSearch && (
                              <button
                                type="button"
                                onClick={() =>
                                  legalStudyUploadFolderInputRef.current?.click()
                                }
                                style={{
                                  marginTop: 12,
                                  padding: "8px 18px",
                                  background: "#185FA5",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 8,
                                  fontFamily: FONT,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                + Create Legal Study
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
```

Notes on this replacement:
- The condition drops `&& !activeLegalStudyId` — that variable is being removed entirely in Task 5, and since drill-down no longer keeps `activeSpace === LEGAL_STUDY_STORAGE_TYPE` (it switches to `"customer"`, see `openFolder`), this branch is now ONLY ever the flat list — no second "inside a study" mode exists under this condition anymore.
- The card/gallery view branch (the old `galleryViewMode !== "table"` fallback) is dropped — table is now the only view for this space. If you find `galleryViewMode` is still meaningfully used elsewhere (other spaces), do not touch those other usages; only this space's fallback branch is removed.
- The empty-state button now triggers the FOLDER picker (`legalStudyUploadFolderInputRef`) directly rather than the old popup. This is a judgment call for the empty state specifically (folder upload is the more common case) — the general "+New" dropdown (Step 2 below) offers both file and folder options.

- [ ] **Step 2: Change the "+New" dropdown menu for this space**

Grep for `key: "create_legal_study",` (currently around line 12056, inside the ternary building the `Dropdown`'s `menu` prop). The relevant branch currently reads:

```jsx
                              : activeSpace === LEGAL_STUDY_STORAGE_TYPE &&
                                  !activeLegalStudyId
                                ? {
                                    items: [
                                      {
                                        key: "create_legal_study",
                                        label: renderNewMenuLabel(
                                          TYPE_ICONS.folder,
                                          "Create Legal Study",
                                        ),
                                      },
                                    ],
                                    onClick: openCreateLegalStudyModal,
                                  }
```

Replace with a two-item menu (choose file vs. choose folder) using an `onClick` that dispatches on the clicked item's `key`, matching the pattern Ant Design's `Dropdown menu.onClick` uses (`({ key }) => {...}`):

```jsx
                              : activeSpace === LEGAL_STUDY_STORAGE_TYPE
                                ? {
                                    items: [
                                      {
                                        key: "legal_study_upload_files",
                                        label: renderNewMenuLabel(
                                          TYPE_ICONS.file,
                                          "Chọn file",
                                        ),
                                      },
                                      {
                                        key: "legal_study_upload_folder",
                                        label: renderNewMenuLabel(
                                          TYPE_ICONS.folder,
                                          "Chọn folder",
                                        ),
                                      },
                                    ],
                                    onClick: ({ key }) => {
                                      if (key === "legal_study_upload_files") {
                                        legalStudyUploadFileInputRef.current?.click();
                                      } else if (
                                        key === "legal_study_upload_folder"
                                      ) {
                                        legalStudyUploadFolderInputRef.current?.click();
                                      }
                                    },
                                  }
```

(`TYPE_ICONS.file` — Grep to confirm this exact key exists on `TYPE_ICONS` alongside the already-used `TYPE_ICONS.folder`; if the file-icon key has a different name, use the real one and note the correction in your report.)

Also update the gating condition just above this ternary (Grep for `(activeSpace === LEGAL_STUDY_STORAGE_TYPE &&` near line 12033-12034, part of the larger `&&`-chain deciding whether the `<Dropdown>` renders at all) — remove the `&& !activeLegalStudyId` clause there too, for the same reason as Step 1 (that state no longer gates this space).

- [ ] **Step 3: Verify the file still parses**

```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('All Module/Document/Library.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 4: Manual trace (no live Nocobase available — read-through verification)**

Trace by hand and record in your report:
- With `filteredLegalStudyFolders` empty, does the empty-state render without throwing (no `.map` on undefined, etc.)?
- With one folder in `filteredLegalStudyFolders` that has a valid `projectId` matching a `projects` entry, does `getCaseNameForFolder` return a non-empty string and does the "Vụ việc liên quan" column render it?
- Does `openFolder` reference only state setters that exist (`setActiveSpace`, `setActiveCustomerId`, `setActiveCaseId`, `setSelectedFolderId`) — Grep to confirm each setter name exactly matches its `useState` declaration.

- [ ] **Step 5: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "feat: wire Legal Study table to case-scoped folders (new column, new create flow, folder-browser drill-down)"
```

---

## Task 5: Remove dead code from the old `legalStudy`-collection flow

**Files:**
- Modify: `All Module/Document/Library.js`

This task only runs after Task 4 makes the new flow live — verify Task 4's commit exists before starting. Work through the sub-steps in order; after EACH deletion, Grep for the removed symbol's name across the whole file and confirm zero remaining references before moving to the next sub-step. If a Grep turns up an unexpected remaining reference, STOP that specific deletion, leave the code in place, and note it in your report as NEEDS_CONTEXT rather than guessing whether it's safe to remove.

- [ ] **Step 1: Delete the old fetch of `legalStudy:list` and its state**

Grep for `fetchedLegalStudyRecords,` inside the `Promise.all` destructure (currently line 4036) and remove that one line from the destructure array. Grep for the corresponding `fetchAllList("legalStudy:list", {...})` call (currently lines 4061-4069, includes a `.catch()` fallback to `legalStudies:list`) inside the same `Promise.all([...])` array and remove that whole array element (including its trailing comma, keeping the array syntactically valid). Grep for `setLegalStudyRecords(fetchedLegalStudyRecords);` (currently line 4129) and delete that line.

Then Grep for `const [legalStudyRecords, setLegalStudyRecords] = useState([]);` and `const [activeLegalStudyId, setActiveLegalStudyId] = useState(null);` (currently lines 3929-3930) and delete both lines — but FIRST Grep the whole file for `legalStudyRecords` and `activeLegalStudyId` individually and confirm every remaining reference is inside code this task is about to delete in later steps (the dead modal, `handleCreateLegalStudy`, etc.) — if either name is referenced from code Task 4 did NOT touch and this task hasn't reached yet, defer deleting that specific state variable until the referencing code is also deleted later in this same task, and come back to remove the `useState` line as the last part of Step 5.

- [ ] **Step 2: Delete `openCreateLegalStudyModal` and its now-unused constants**

Grep for `const openCreateLegalStudyModal = useCallback(async () => {` (currently lines 6667-6677) and delete the whole function. Grep the file for `openCreateLegalStudyModal` afterward — expect zero remaining references (Task 4 already rewired both call sites away from it).

Grep for `LEGAL_STUDY_CREATE_POPUP_UID`, `LEGAL_STUDY_CREATE_VIEW_URL`, `LEGAL_STUDY_DATA_BLOCK_UID` (declared around lines 110-113) individually. For each, confirm (via Grep) that the ONLY remaining reference is its own `const` declaration; if so, delete that declaration line. Do not delete `LEGAL_STUDY_LABEL`, `LEGAL_STUDY_MODULE_SCOPE`, or `LEGAL_STUDY_STORAGE_TYPE` — these three are still live (used throughout the new flow).

- [ ] **Step 3: Delete the dead create-modal JSX and its handler**

Grep for `{/* ── CREATE LEGAL STUDY MODAL ── */}` (the OLD modal's comment — there are now two similarly-named comments after Task 3; make sure you find the one immediately followed by `<Modal ... open={isCreateLegalStudyOpen}`, NOT the new one from Task 3 which uses `open={isCreateLegalStudyFolderOpen}`). Delete from that comment through the matching closing `</Modal>` (confirmed at plan-writing time to span from the comment through 259 lines later, ending right before a following unrelated `<Modal>`).

Grep for `const handleCreateLegalStudy = async (values) => {` (NOT `handleCreateLegalStudyFolder`, the new one from Task 3 — confirm you have the right one by checking it calls `legalStudy:create`) and delete the whole function.

Grep for and delete these now-dead state declarations (confirm each has zero remaining references first, same as Step 1's method): `isCreateLegalStudyOpen`/`setIsCreateLegalStudyOpen`, `createLegalStudyLoading`/`setCreateLegalStudyLoading`, `createLegalStudyForm` (the `Form.useForm()` call).

If Step 1 deferred deleting `legalStudyRecords`/`activeLegalStudyId`'s `useState` lines, re-run that Grep check now and delete them if clear.

- [ ] **Step 4: Review (don't blindly delete) the shared relation-payload helpers**

Grep for `getRecordLegalStudyId` and read its 2 call sites (inside a `useMemo` computing `{ legalRefIds, legalStudyIds }`, used for BOTH legal-reference AND legal-study access-scope permission checks — this `useMemo` is shared with the still-live `legal_reference` feature). Within that `useMemo`, the `legalStudyIds` half is now unused garbage (nothing reads `accessibleLegalStudyIds`/`documentModuleAccessScope.legalStudyIds` anymore after Tasks 1-4 — Grep to confirm), but the `legalRefIds` half is still live. Remove ONLY the `legalStudyId`-specific lines from within that shared `useMemo` (the lines computing/adding to a `legalStudyIds` Set), leaving the `legalRefIds` logic and the function's overall shape untouched. Also Grep for and remove now-dead downstream consumers of `legalStudyIds`/`accessibleLegalStudyIds`/`canOpenLegalStudySpace` ONLY if each is confirmed (via Grep) to have no other purpose — several of these (effects that reset `activeLegalStudyId` when access changes) reference the state deleted in Step 1 and will no longer compile once that state is gone, so they MUST be found and removed as part of this step, not left behind. Read each one before deleting — do not remove `canOpenLegalReferenceSpace` or anything with "LegalReference" in the name, only the "LegalStudy" siblings.

Do NOT touch `buildLegalStudyRelationPayload`, `getLegalStudyRelationIdFromPayload`, `stripLegalStudyRelationPayload`, `buildLegalStudyRelationVariants`, or `requestCreateWithInternalTemplateRelation` — confirmed in Task 1 to be shared with the unrelated, still-live internal-template create flow. Leave these exactly as they are.

- [ ] **Step 5: Verify the file still parses**

```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('All Module/Document/Library.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 6: Final grep sweep**

Grep the whole file for: `legalStudyRecords`, `activeLegalStudyId`, `isCreateLegalStudyOpen`, `createLegalStudyLoading`, `handleCreateLegalStudy\b` (word boundary, to not match `handleCreateLegalStudyFolder`), `openCreateLegalStudyModal`, `LEGAL_STUDY_CREATE_POPUP_UID`, `LEGAL_STUDY_CREATE_VIEW_URL`, `LEGAL_STUDY_DATA_BLOCK_UID`. Expected: zero matches for all of them. Report any that still match and why (should be none if the above steps completed cleanly).

- [ ] **Step 7: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "chore: remove dead legalStudy-collection create flow and unused relation-scope helpers"
```

---

## Task 6: Manual verification against a live Nocobase environment

**Files:** none (verification only)

No implementer subagent in this environment has access to a live Nocobase instance — this task's steps must be performed by a human in the real app, not simulated. If dispatched as an implementer task, the subagent should read through the final `All Module/Document/Library.js` Legal Study code path end-to-end (Steps 1-4 below reframed as a static trace) and report findings, then explicitly mark the live checks as outstanding rather than fabricating results — same convention as this plan's automated-verification limitations throughout.

- [ ] **Step 1: List view** — Open the "Documents" module → "Legal Study". Confirm: table loads without console errors, shows one row per existing `moduleScope: "legal_study"` root folder across ALL cases (not just one), "Vụ việc liên quan" column shows a real case name (not blank/"—") for folders that have `projectId`/`caseId` set, "Trạng thái" column is gone.

- [ ] **Step 2: Create flow** — Click "+New" → "Chọn folder", pick a local folder with a few files. Confirm the name/case modal appears pre-filled with the folder's name, pick a case, submit. Confirm: a new row appears in the table after reload, "Thư mục"/"File" counts match what was uploaded, the new folder's files are visible after drilling in (Step 3).

- [ ] **Step 3: Drill-down** — Click an existing Legal Study row. Confirm it navigates into the case's regular folder browser (not a blank/broken screen), landing directly on that folder's contents, and that the breadcrumb/sidebar context makes sense (shows the right case/customer, not stuck on a stale "Legal Study" label).

- [ ] **Step 4: Regression check on unrelated features** — Since Task 5 touched a shared permission-scope `useMemo` and `buildScopedPayload` (both used by the `legal_reference` and `customer`/case document spaces too), open the "Case Reference" section and a regular case's document folder and confirm both still work normally (list, upload, navigate) — this is the highest-risk regression area from this plan's changes.
