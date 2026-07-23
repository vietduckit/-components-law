# Case Folder Integrity Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix case-root-folder detection in `All Module/Document/CaseDocument.js` so a deleted root folder can no longer masquerade as valid, cascade-delete orphaned descendants automatically, block uploads at an unresolved case root, and give the sidebar/empty-state UI honest feedback when no root folder exists yet.

**Architecture:** All changes live in one file. The core fix replaces a fragile name-matching heuristic (`activeCaseRootFolder`) with a deterministic rule (oldest non-deleted, parent-less folder whose `projectId` matches the case). A new self-healing `useEffect` detects folders/documents whose nearest ancestor is deleted-but-they-aren't, and cascades `isDeleted: true` to them, inheriting the ancestor's `deletedAt`/`updatedById` so Trash shows accurate attribution. Two small UI additions (sidebar badge, empty-state message) and one guard (block uploads with no resolvable root) round out the fix.

**Tech Stack:** React (`ctx.React`, JSX — this file uses JSX, unlike `TaskManagement.js`), `ctx.api.request()`.

## Global Constraints

- Nocobase JS blocks stay in exactly one file — no `import`/`require` of local modules (see `CLAUDE.md`).
- No `fetch()` — only `ctx.api.request()`.
- This file uses JSX syntax throughout — match it exactly, do not switch to `React.createElement`.
- No automated test runner in this repo. Verification is the Babel-parser syntax check below plus manual reasoning trace.
- `activeCaseRootFolderId` is consumed by many other memos/callbacks purely as an opaque folder id (or `null`/falsy meaning "no root") — confirmed via grep that every consumer already handles the falsy case gracefully. The replacement must keep returning either a real folder id or a falsy value — do not change what downstream code expects.
- The cascade-repair effect must only ever attempt to fix a given folder id **once per page load** (track attempted ids in a `useRef` Set) — never retry-loop indefinitely on a failed write, since these are automatic background writes the user did not directly trigger.
- Scope: only the case (`activeSpace === "cases"`) folder tree. Do not touch `legal_reference`, `case_reference`, `legal_study`, `company_shared`, or `personal` spaces — they are out of scope per the design spec.

Babel syntax-check command (run after every task, from repo root):
```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('All Module/Document/CaseDocument.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```

---

## Task 1: Replace the case-root-folder detection heuristic

**Files:**
- Modify: `All Module/Document/CaseDocument.js`

**Interfaces:**
- Consumes: `caseFolders` (existing memo, all folders linked to the active case via `projectId`/`caseId`, **including deleted ones** — unchanged), `getFolderParentId` (existing helper), `sortByCreatedAt` (existing helper, ascending by `createdAt`), `extractId` (existing helper).
- Produces: `activeCaseRootFolder` / `activeCaseRootFolderId` — same names, same "folder object / folder id or falsy" shape every existing consumer already expects. No other file/task needs to change because of this replacement.

This task only changes HOW the root folder is chosen, not the shape of what it returns, so it is safe to make in isolation — the ~12 existing call sites of `activeCaseRootFolderId` (found via grep) need no changes.

- [ ] **Step 1: Replace `activeCaseRootFolder`**

Grep for `const activeCaseRootFolder = useMemo(() => {` (currently line 4555). It currently reads exactly:

```js
  const activeCaseRootFolder = useMemo(() => {
    if (!caseFolders.length || !activeCaseIdValue) return null;
    const caseRecord = activeCase || initialCaseContext.record || {};
    const caseNames = [
      getCaseDisplayName(caseRecord),
      caseRecord.caseCode,
      caseRecord.caseNumber,
      caseRecord.projectCode,
      caseRecord.code,
      caseRecord.projectName,
      caseRecord.title,
      caseRecord.name,
    ]
      .map(normalizeKey)
      .filter(Boolean);
    if (!caseNames.length) return null;
    const outsideParent = (folder) => {
      const parentId = getFolderParentId(folder);
      return !parentId || !caseFolderIdSet.has(String(parentId));
    };
    const hasCaseChild = (folder) =>
      caseFolders.some(
        (child) =>
          String(getFolderParentId(child) || "") === String(extractId(folder)),
      ) ||
      documents.some(
        (doc) =>
          String(extractId(doc.folderId) || "") === String(extractId(folder)) &&
          matchesCaseDocument(doc, activeCaseIdValue, caseFolderIdSet),
      );
    return (
      caseFolders.find((folder) => {
        if (!outsideParent(folder)) return false;
        const folderName = normalizeKey(folder?.name);
        return (
          folderName && caseNames.includes(folderName) && hasCaseChild(folder)
        );
      }) ||
      caseFolders.find(
        (folder) => outsideParent(folder) && hasCaseChild(folder),
      ) ||
      null
    );
  }, [
    caseFolders,
    caseFolderIdSet,
    activeCase,
    initialCaseContext.record,
    documents,
    activeCaseIdValue,
  ]);
```

Replace with:

```js
  const activeCaseRootFolder = useMemo(() => {
    if (!caseFolders.length || !activeCaseIdValue) return null;
    const rootCandidates = caseFolders.filter(
      (folder) => !folder.isDeleted && !getFolderParentId(folder),
    );
    if (!rootCandidates.length) return null;
    return [...rootCandidates].sort(sortByCreatedAt)[0];
  }, [caseFolders, activeCaseIdValue]);
```

Note: the new version drops the `caseFolderIdSet`, `activeCase`, `initialCaseContext.record`, and `documents` dependencies since they're no longer read — do not leave stale entries in the dependency array.

- [ ] **Step 2: Verify the file still parses**

```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('All Module/Document/CaseDocument.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 3: Grep-verify no other code depended on the removed name-matching behavior**

Run `grep -n "caseNames\|hasCaseChild\|outsideParent"` over the file. Expected: zero matches (these were local variables only used inside the function just replaced).

- [ ] **Step 4: Manual trace**

Using the scenario from the bug report: a case has one root-level folder ("C005072026 - Case", `parentId` empty, `projectId` = the case, `isDeleted: false`) and 5 children under it. Trace that `rootCandidates` contains exactly that one folder (the 5 children all have a non-empty `parentId`, so they're excluded), so `activeCaseRootFolder` resolves to it immediately — with no dependency on it having children yet, unlike the old heuristic. This removes the chicken-and-egg window where a file uploaded right after folder creation could get attached to the wrong (or no) folder.

- [ ] **Step 5: Commit**

```bash
git add "All Module/Document/CaseDocument.js"
git commit -m "fix: replace name-matching case root folder heuristic with deterministic parentId+projectId rule"
```

---

## Task 2: Auto-heal orphaned folders/documents when their case root is deleted

**Files:**
- Modify: `All Module/Document/CaseDocument.js`

**Interfaces:**
- Consumes: `folders`, `documents` (state), `caseFolders` (memo), `activeCaseIdValue`, `getFolderParentId`, `extractId`, `requestDocumentApi` (existing helper for document writes), `ctx.api.request` (existing, for folder writes), `loadData` (existing reload function).
- Produces: a new `useEffect` with no external consumers — purely a background self-repair mechanism. Does not change any return value or prop other tasks depend on.

This task is additive: a new memo, a new callback, a new ref, and a new effect, none of which any existing code reads. It only performs `folders:update` / `documents:update` writes when it detects data that is already logically inconsistent (a non-deleted folder underneath a deleted ancestor) — it never touches a folder/document whose whole ancestor chain is intact.

- [ ] **Step 1: Locate the insertion point**

Grep for `const activeCaseRootFolderId = useMemo(` (now at the end of Task 1's replacement, immediately following it). Insert the new code directly after that memo's closing `);`, before the next existing memo (`const caseVisibleFolders = useMemo(...)`).

- [ ] **Step 2: Add the orphan-detection helpers and repair effect**

```js
  const folderById = useMemo(() => {
    const map = new Map();
    folders.forEach((folder) => {
      const id = String(extractId(folder) || "");
      if (id) map.set(id, folder);
    });
    return map;
  }, [folders]);

  const findNearestDeletedAncestor = useCallback(
    (folder) => {
      let current = folder;
      const seen = new Set();
      while (current) {
        const parentId = getFolderParentId(current);
        if (!parentId) return null;
        const parentKey = String(parentId);
        if (seen.has(parentKey)) return null;
        seen.add(parentKey);
        const parent = folderById.get(parentKey);
        if (!parent) return null;
        if (parent.isDeleted) return parent;
        current = parent;
      }
      return null;
    },
    [folderById],
  );

  const orphanRepairAttemptedRef = useRef(new Set());
  const orphanRepairRunningRef = useRef(false);

  useEffect(() => {
    if (orphanRepairRunningRef.current) return;
    if (!activeCaseIdValue || caseFolders.length === 0) return;

    const groups = new Map();
    caseFolders.forEach((folder) => {
      if (folder.isDeleted) return;
      const folderId = extractId(folder);
      const folderKey = String(folderId || "");
      if (!folderId || orphanRepairAttemptedRef.current.has(folderKey)) return;
      const ancestor = findNearestDeletedAncestor(folder);
      if (!ancestor) return;
      const ancestorKey = String(extractId(ancestor));
      if (!groups.has(ancestorKey)) {
        groups.set(ancestorKey, { ancestor, folderIds: [] });
      }
      groups.get(ancestorKey).folderIds.push(folderId);
      orphanRepairAttemptedRef.current.add(folderKey);
    });

    if (groups.size === 0) return;

    orphanRepairRunningRef.current = true;
    const run = async () => {
      try {
        for (const { ancestor, folderIds } of groups.values()) {
          const payload = {
            isDeleted: true,
            deletedAt:
              ancestor.deletedAt || ancestor.updatedAt || new Date().toISOString(),
            ...(extractId(ancestor.updatedById)
              ? { updatedById: extractId(ancestor.updatedById) }
              : {}),
          };
          await ctx.api
            .request({
              url: "folders:update",
              method: "POST",
              params: {
                filter: JSON.stringify({ id: { $in: folderIds.map(Number) } }),
              },
              data: payload,
            })
            .catch(() => {});
          await requestDocumentApi({
            url: "documents:update",
            method: "POST",
            params: {
              filter: JSON.stringify({
                folderId: { $in: folderIds.map(Number) },
              }),
            },
            data: payload,
          }).catch(() => {});
        }
      } finally {
        orphanRepairRunningRef.current = false;
        loadData();
      }
    };
    run();
  }, [caseFolders, activeCaseIdValue, findNearestDeletedAncestor, loadData]);
```

- [ ] **Step 3: Verify the file still parses**

```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('All Module/Document/CaseDocument.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 4: Manual trace**

- A case has folder A (root, `isDeleted: true`, `deletedAt: "2026-07-20T10:00:00Z"`, `updatedById: 7`) with child folder B (`isDeleted: false`) which has child folder C (`isDeleted: false`), and a document D inside folder C. Trace that `findNearestDeletedAncestor(B)` walks B → A, finds A deleted, returns A. Same for C: walks C → B → A, returns A (the loop keeps climbing past non-deleted ancestors until it hits a deleted one or runs out of parents). Both B and C land in the same group keyed by A's id, and get updated with A's `deletedAt`/`updatedById` — not "now". Document D is caught by the `documents:update` filter on `folderId: { $in: [B, C] }`.
- Confirm a folder whose entire ancestor chain is intact (no deleted ancestor) returns `null` from `findNearestDeletedAncestor` and is never touched.
- Confirm that on the second run (after `loadData()` refetches and B/C are now `isDeleted: true`), the `caseFolders.forEach` loop's `if (folder.isDeleted) return;` guard skips them immediately — the effect naturally becomes a no-op, it does not loop forever.
- Confirm that if the API write fails (network error, caught by `.catch(() => {})`), B and C's ids are already in `orphanRepairAttemptedRef.current` (added *before* the async call), so a subsequent `loadData()` (which still sees them as non-deleted) will NOT retry them — this trades a rare missed repair for guaranteed no infinite retry loop.

- [ ] **Step 5: Commit**

```bash
git add "All Module/Document/CaseDocument.js"
git commit -m "feat: auto-heal orphaned case folders/documents when their root folder is deleted"
```

---

## Task 3: Block uploads at an unresolved case root

**Files:**
- Modify: `All Module/Document/CaseDocument.js`

**Interfaces:**
- Consumes: `activeSpace`, `getEffectiveFolderId` (existing), `message` (antd, already imported).
- Produces: `requireCaseRootFolderForUpload(targetFolderId)` — new helper, called from `handleUploadSubmit` and `executeFolderUpload` only. Folder creation (`handleCreateFolder`) is deliberately NOT gated — creating a folder at an unresolved root is exactly what makes Task 1's detection pick it up as the new root.

- [ ] **Step 1: Add the guard helper**

Grep for `const requireCompany = () => {` (currently line 5687). Insert the new helper directly after `requireCompany`'s closing `};`:

```js

  const requireCaseRootFolderForUpload = (targetFolderId) => {
    if (activeSpace !== "cases") return true;
    if (getEffectiveFolderId(targetFolderId)) return true;
    message.warning("Vui lòng tạo folder Case trước khi tải tài liệu lên");
    return false;
  };
```

- [ ] **Step 2: Call it from `handleUploadSubmit`**

Grep for `const handleUploadSubmit = async () => {` (currently line 5994). It currently starts:

```js
  const handleUploadSubmit = async () => {
    if (activeSpace !== "personal" && !requireCompany()) return;
    try {
      await uploadForm.validateFields();
    } catch {
      return;
    }
```

Add the new guard right after the existing `requireCompany()` check:

```js
  const handleUploadSubmit = async () => {
    if (activeSpace !== "personal" && !requireCompany()) return;
    if (!requireCaseRootFolderForUpload(selectedFolderId)) return;
    try {
      await uploadForm.validateFields();
    } catch {
      return;
    }
```

- [ ] **Step 3: Call it from `executeFolderUpload`**

Grep for `const executeFolderUpload = async () => {` (currently line 6061). It currently starts:

```js
  const executeFolderUpload = async () => {
    if (activeSpace !== "personal" && !requireCompany()) return;
    setBulkUploading(true);
```

Add the new guard right after the existing `requireCompany()` check:

```js
  const executeFolderUpload = async () => {
    if (activeSpace !== "personal" && !requireCompany()) return;
    if (!requireCaseRootFolderForUpload(bulkTargetId)) return;
    setBulkUploading(true);
```

- [ ] **Step 4: Verify the file still parses**

```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('All Module/Document/CaseDocument.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 5: Manual trace**

- `activeSpace === "cases"`, `selectedFolderId === "root"`, no valid root folder exists (`activeCaseRootFolderId` is falsy) → `getEffectiveFolderId("root")` returns `activeCaseRootFolderId || null` = `null` → `requireCaseRootFolderForUpload` warns and returns `false` → upload is blocked. Correct.
- Same case, but user has navigated into one of the 5 real subfolders (`selectedFolderId` = that subfolder's real id, not `"root"`) → `getEffectiveFolderId` returns that real id (non-empty, since `normalizeParentId` only special-cases `"root"`/falsy) → guard passes, upload proceeds normally. Correct — the block only ever applies at the unresolved case root itself.
- `activeSpace !== "cases"` (e.g. `"personal"`, `"company_shared"`) → guard returns `true` immediately, no behavior change for any other space. Correct — matches the spec's "only cases scope" requirement.

- [ ] **Step 6: Commit**

```bash
git add "All Module/Document/CaseDocument.js"
git commit -m "fix: block document uploads at an unresolved case root folder"
```

---

## Task 4: Sidebar "no folder yet" indicator + empty-state messaging

**Files:**
- Modify: `All Module/Document/CaseDocument.js`

**Interfaces:**
- Consumes: `activeCaseRootFolderId`, `activeSpace`, `selectedFolderId`, `handleCreateFolderFromSidebar` (existing), `setIsFolderOpen`/`folderForm` (existing, used by the sidebar's own "+ Tạo" button already).
- Produces: no new functions — pure JSX additions in two existing render locations.

- [ ] **Step 1: Add the sidebar badge**

Grep for `{getCaseDisplayName(activeCaseRecord || activeCase)}` (currently line 8940), inside the "Current Case" sidebar button. It currently reads:

```jsx
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {getCaseDisplayName(activeCaseRecord || activeCase)}
                      </span>
                    </button>
```

Replace with (adds a small warning pill after the name, only when there's no valid root folder):

```jsx
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {getCaseDisplayName(activeCaseRecord || activeCase)}
                      </span>
                      {!activeCaseRootFolderId && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: "#B45309",
                            background: "#FFFBEB",
                            border: "1px solid #FEF3C7",
                            borderRadius: 999,
                            padding: "1px 6px",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Chưa có folder
                        </span>
                      )}
                    </button>
```

- [ ] **Step 2: Add the empty-state messaging branch**

Grep for `: "Thư mục trống"}` — the first of the two occurrences (currently around line 10713), which sits inside the title line of the grid view's empty state. Read 25 lines of context above it to confirm the exact structure matches:

```jsx
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 500,
                            color: "#6B7280",
                            fontFamily: FONT,
                          }}
                        >
                          {activeSpace === "legal_reference" &&
                          !activeLegalReferenceId
                            ? "Chưa có Case Tham Chiếu nào"
                            : activeSpace === "trash"
                              ? "Thùng rác trống"
                              : query
                                ? "Không tìm thấy kết quả"
                                : "Thư mục trống"}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#9CA3AF",
                            fontFamily: FONT,
                          }}
                        >
                          {activeSpace === "legal_reference" &&
                          !activeLegalReferenceId
                            ? "Nhấn + Tạo Case Tham Chiếu bên dưới để bắt đầu"
                            : activeSpace === "trash"
                              ? "Không có file hay thư mục nào bị xóa"
                              : query
                                ? "Thử tìm với từ khóa khác"
                                : "Nhấn + New để tạo thư mục hoặc tải lên tài liệu đầu tiên"}
                        </div>
```

Replace both ternary chains, inserting a new highest-priority branch for the unresolved-case-root state:

```jsx
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 500,
                            color: "#6B7280",
                            fontFamily: FONT,
                          }}
                        >
                          {activeSpace === "cases" &&
                          selectedFolderId === "root" &&
                          !activeCaseRootFolderId
                            ? "Case chưa có folder gốc"
                            : activeSpace === "legal_reference" &&
                              !activeLegalReferenceId
                              ? "Chưa có Case Tham Chiếu nào"
                              : activeSpace === "trash"
                                ? "Thùng rác trống"
                                : query
                                  ? "Không tìm thấy kết quả"
                                  : "Thư mục trống"}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#9CA3AF",
                            fontFamily: FONT,
                          }}
                        >
                          {activeSpace === "cases" &&
                          selectedFolderId === "root" &&
                          !activeCaseRootFolderId
                            ? "Hãy tạo folder gốc cho case trước khi tải tài liệu lên"
                            : activeSpace === "legal_reference" &&
                              !activeLegalReferenceId
                              ? "Nhấn + Tạo Case Tham Chiếu bên dưới để bắt đầu"
                              : activeSpace === "trash"
                                ? "Không có file hay thư mục nào bị xóa"
                                : query
                                  ? "Thử tìm với từ khóa khác"
                                  : "Nhấn + New để tạo thư mục hoặc tải lên tài liệu đầu tiên"}
                        </div>
```

Do not touch the action-buttons block immediately below this (the `+ Tạo Case Tham Chiếu` / `+ Thêm tài liệu` / `+ Thêm thư mục` buttons) — the existing `activeSpace !== "trash" && !query` branch already renders the "+ Thêm thư mục" button in this state, which is the correct call to action (create the root folder); no change needed there.

- [ ] **Step 3: Verify the file still parses**

```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('All Module/Document/CaseDocument.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 4: Grep-verify the second empty-state occurrence (table view) was intentionally left alone**

Run `grep -n "Thư mục trống"` — expect exactly 2 matches: the one just edited, and a second one (table view's `locale.emptyText`, currently ~line 11633) which is a much simpler one-line empty message not covered by this task (out of scope — grid view is the default and primary view for the Cases space).

- [ ] **Step 5: Commit**

```bash
git add "All Module/Document/CaseDocument.js"
git commit -m "feat: show explicit no-root-folder state in case sidebar and empty view"
```

---

## Task 5: Manual verification against a live Nocobase environment

**Files:** none (verification only)

No implementer subagent in this environment has access to a live Nocobase instance — perform these checks in the real app.

- [ ] **Step 1: Missing-file regression check** — Open the same case from the bug report (or a fresh case). Create a root case folder, then a subfolder, then upload a file directly at the case root level (not inside the subfolder). Confirm the file now appears in the Cases grid at the root breadcrumb, alongside the folders.

- [ ] **Step 2: Deleted-root-folder behavior** — Delete the case's root folder (either from this same Cases screen, or — to match the original bug report — from wherever else in the app can delete a `folders` row, e.g. a Customer-side document view). Reload the Cases screen for this case. Confirm: (a) the sidebar shows "Chưa có folder" next to the case name, (b) the main Cases view at root shows the new "Case chưa có folder gốc" empty state, (c) none of the 5 previously-visible subfolders (or the file) appear in the main Cases view anymore, (d) switching to "Thùng rác" shows the root folder AND all 5 subfolders AND the file, each with "who deleted" attribution matching who actually deleted the root folder (not "self-repair" as the actor).

- [ ] **Step 3: Recovery flow** — With no valid root folder (from Step 2), try "+ New > Upload" at the case root — confirm it's blocked with the "Vui lòng tạo folder Case trước khi tải tài liệu lên" warning. Then create a new folder at the case root — confirm it becomes the new root folder (sidebar badge disappears, and new uploads/folders at root now nest under it).

- [ ] **Step 4: Regression check on other spaces** — Confirm `personal`, `company_shared`, `legal_reference`, `case_reference`, and `legal_study` spaces still create/upload normally (the new guard in Task 3 must not affect them).
