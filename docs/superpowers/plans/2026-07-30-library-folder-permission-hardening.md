# Library.js Folder Permission Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden folder permission behavior in `All Module/Document/Library.js`: make the case root folder always navigable when a user has access to any of its descendants, hard-lock renaming for the 5 system template folders, and sync case root folder permission saves back onto the Case's own `managerId`/`assignees`.

**Architecture:** Three independent, additive changes inside the single existing `Library.js` block: (1) a third pass in the pure helper `getVisibleFolderIds` that walks ancestors of already-accessible folders, (2) a new pure predicate `isRenameLockedFolder` consulted at the 2 UI sites and 2 submit-time sites that currently gate/perform folder rename, (3) a new pure predicate `isCaseRootFolder` plus an extra `projects:update` call inside `FolderPermissionsModal.handleSave`, gated by that predicate and by a new `allFolders` prop.

**Tech Stack:** Plain JS + JSX (this file uses JSX directly, unlike `CaseCreateForm.js`'s `React.createElement` style — match the surrounding style in every edit), Nocobase `ctx.api.request`. No test framework in this repo (`package.json` has no jest/mocha/vitest) — verification is `node --check` for syntax plus standalone Node scripts in the scratchpad directory for every pure (non-`ctx`) helper, matching the existing verification convention used for `JsField/GenericSearchFilter.js`.

## Global Constraints

- **Single file, no new files, no imports.** Per project memory (`nocobase-single-file-constraint`), `Library.js` is one self-contained Nocobase JS block. Every task below edits this one file only. Test scripts are scratch files in the scratchpad directory, never committed and never imported by `Library.js`.
- **JSX style.** This file already uses JSX (`<IconSvg>`, `<rect>`, ...). Do not switch to `React.createElement` in any new code — match the file's existing style exactly.
- **No real Nocobase runtime available in this session.** Any step that touches `ctx.api`, rendering, or React state can only be verified via `node --check` (syntax) plus careful manual code review against the exact line numbers cited in each task — call this out explicitly in the task rather than skipping verification.
- **Git identity may not be configured.** If a commit step fails with "Author identity unknown", do not run `git config`. Leave the change staged, note it, and move to the next task.

---

## Task 1: Cascade permission visibility up to ancestors in `getVisibleFolderIds`

**Files:**
- Modify: `All Module/Document/Library.js:1853-1907` (function `getVisibleFolderIds`)
- Test (scratchpad, not committed): `<scratchpad>/test-task1-visible-folder-ids.js`

**Interfaces:**
- Consumes: nothing new — `getVisibleFolderIds(allFolders, currentUser, currentLawyerId)` keeps its exact existing signature and return shape `{ accessible: Set<string> }`.
- Produces: same function, same signature/return shape, now additionally includes every ancestor (up to but not below the root of `allFolders`) of any folder already in `accessible`. All 7 existing call sites in the file need zero changes — they all call this same function.

- [ ] **Step 1: Read the current function once more to confirm line-exact anchors before editing**

Current content of `All Module/Document/Library.js` at lines 1853-1907 (must match exactly before you edit — if it doesn't, stop and re-read the file, don't guess):

```js
  const getVisibleFolderIds = (allFolders, currentUser, currentLawyerId) => {
    const accessible = new Set();
    const uid = extractId(currentUser?.id);
    const lwId = extractId(currentLawyerId);

    if (isAdminUser(currentUser)) {
      allFolders.forEach((f) => accessible.add(extractId(f.id)));
      return { accessible };
    }

    if (!uid) return { accessible };

    // 1. Find folders with direct access
    allFolders.forEach((f) => {
      const fId = extractId(f.id);
      // Owner check — use String comparison to avoid number/string type mismatch
      if (String(extractId(f.createdById)) === String(uid)) {
        accessible.add(fId);
        return;
      }
      // Manager/Member check via currentLawyerId — use String comparison to avoid number/string type mismatch
      if (lwId) {
        const managers = getFolderManagerRows(f);
        const members = getFolderMemberRows(f);
        if (
          managers.some((m) => String(getPermissionLawyerId(m)) === String(lwId)) ||
          members.some((m) => String(getPermissionLawyerId(m)) === String(lwId))
        ) {
          accessible.add(fId);
          return;
        }
      }
    });

    // 2. Cascade down: include all descendants of accessible folders
    const getDescendantIdsRecursive = (pId, list) => {
      let ids = [];
      list.forEach((f) => {
        if (String(extractId(f.parentId)) === String(pId)) {
          const id = extractId(f.id);
          ids.push(id);
          ids = ids.concat(getDescendantIdsRecursive(id, list));
        }
      });
      return ids;
    };

    const directIds = Array.from(accessible);
    directIds.forEach((pId) => {
      const descIds = getDescendantIdsRecursive(pId, allFolders);
      descIds.forEach((id) => accessible.add(id));
    });

    return { accessible };
  };
```

- [ ] **Step 2: Write the scratchpad test first (it must fail against the OLD behavior)**

Create `<scratchpad>/test-task1-visible-folder-ids.js` (use your actual scratchpad path — see your system prompt for the exact directory). This file is a standalone copy of just the pieces needed to exercise the logic (no `ctx`, no imports):

```js
// Standalone reproduction of the relevant pieces of Library.js for Task 1.
// Not committed — scratchpad verification only.

const extractId = (value) => {
  if (!value) return null;
  if (typeof value === "object") return extractId(value.id || value.value || value.key);
  return value;
};
const asArray = (value) => (!value ? [] : Array.isArray(value) ? value : [value]);
const getFolderManagerRows = (folder) => asArray(folder?.folderManager || folder?.folderManagers);
const getFolderMemberRows = (folder) => asArray(folder?.folderMember || folder?.folderMembers);
const getPermissionLawyerId = (row) =>
  extractId(row?.lawyerId) || extractId(row?.lawyer) || extractId(row?.id) || extractId(row);
const isAdminUser = (user) => {
  if (!user) return false;
  const roles = user.roles || [];
  return roles.some((r) => ["admin", "root"].includes((typeof r === "string" ? r : r.name)?.toLowerCase()));
};

// PASTE the getVisibleFolderIds function body from Library.js here (after
// you've edited it in Step 3) to verify it in isolation before/after.
const getVisibleFolderIds = (allFolders, currentUser, currentLawyerId) => {
  const accessible = new Set();
  const uid = extractId(currentUser?.id);
  const lwId = extractId(currentLawyerId);

  if (isAdminUser(currentUser)) {
    allFolders.forEach((f) => accessible.add(extractId(f.id)));
    return { accessible };
  }
  if (!uid) return { accessible };

  allFolders.forEach((f) => {
    const fId = extractId(f.id);
    if (String(extractId(f.createdById)) === String(uid)) {
      accessible.add(fId);
      return;
    }
    if (lwId) {
      const managers = getFolderManagerRows(f);
      const members = getFolderMemberRows(f);
      if (
        managers.some((m) => String(getPermissionLawyerId(m)) === String(lwId)) ||
        members.some((m) => String(getPermissionLawyerId(m)) === String(lwId))
      ) {
        accessible.add(fId);
        return;
      }
    }
  });

  const getDescendantIdsRecursive = (pId, list) => {
    let ids = [];
    list.forEach((f) => {
      if (String(extractId(f.parentId)) === String(pId)) {
        const id = extractId(f.id);
        ids.push(id);
        ids = ids.concat(getDescendantIdsRecursive(id, list));
      }
    });
    return ids;
  };
  const directIds = Array.from(accessible);
  directIds.forEach((pId) => {
    const descIds = getDescendantIdsRecursive(pId, allFolders);
    descIds.forEach((id) => accessible.add(id));
  });

  // 🔽 Step 3's new "cascade up" block goes here once added — leave this
  // comment as a marker so re-running this script after Step 3 is a 1-line
  // copy-paste update, nothing else in this file changes.

  return { accessible };
};

// Tree: R (root) -> legal_study (L) -> subA ; R -> lsc_related (M1)
const R = { id: "R", parentId: null };
const L = { id: "L", parentId: "R" };
const subA = { id: "subA", parentId: "L", folderMember: [{ lawyerId: 2 }] };
const M1 = { id: "M1", parentId: "R" };
const allFolders = [R, L, subA, M1];

const user2 = { id: 200, roles: [] };
const { accessible } = getVisibleFolderIds(allFolders, user2, 2);

const has = (id) => accessible.has(id);
console.log("accessible:", Array.from(accessible));
console.log("subA visible (expect true):", has("subA"));
console.log("L visible (expect true after fix, false before fix):", has("L"));
console.log("R visible (expect true after fix, false before fix):", has("R"));
console.log("M1 visible (expect false — sibling branch, no access):", has("M1"));

if (!has("subA")) throw new Error("FAIL: subA should be directly accessible");
if (has("M1")) throw new Error("FAIL: M1 must stay hidden — no permission and not an ancestor of subA");
console.log(has("L") && has("R") ? "PASS (ancestors included)" : "EXPECTED-FAIL (ancestors not yet cascaded — add Step 3 code)");
```

- [ ] **Step 2b: Run it to confirm the pre-fix (expected) failure**

Run: `node "<scratchpad>/test-task1-visible-folder-ids.js"`
Expected output ends with `EXPECTED-FAIL (ancestors not yet cascaded — add Step 3 code)` — this is the correct "red" state before the fix; the two `throw` guards above it must NOT fire (if they do, something else is wrong — stop and investigate before continuing).

- [ ] **Step 3: Edit `All Module/Document/Library.js`, add the upward-cascade pass**

In the real file, replace the `return { accessible };` at the very end of `getVisibleFolderIds` (the one immediately after the `directIds.forEach(...)` block ends, i.e. the last 3 lines of the function shown in Step 1) with:

```js
    // 3. Cascade up: ensure the whole ancestor chain of any accessible
    // folder is included too — otherwise a user with access only to a deep
    // subfolder (e.g. one Legal Study child) would never see the case root
    // folder in the tree and couldn't navigate down to it. This only
    // widens the visibility set; getFolderPermissions() is untouched, so
    // these ancestor-only folders still resolve to no edit/rename/manage
    // rights unless the user has an explicit or inherited role there too.
    const folderById = new Map(allFolders.map((f) => [String(extractId(f.id)), f]));
    Array.from(accessible).forEach((id) => {
      let current = folderById.get(String(id));
      while (current) {
        const parentId = extractId(current.parentId);
        if (!parentId || parentId === "root") break;
        const parentKey = String(parentId);
        if (accessible.has(parentKey)) break;
        accessible.add(parentKey);
        current = folderById.get(parentKey);
      }
    });

    return { accessible };
  };
```

- [ ] **Step 4: Run `node --check` on the real file**

Run: `node --check "All Module/Document/Library.js"`
Expected: no output (success). If it errors, the insertion point was wrong — re-open the file at the line number reported and fix before continuing.

- [ ] **Step 5: Update the scratchpad script with the same new block and re-run it**

Paste the identical block from Step 3 into the scratchpad copy at the `// 🔽 Step 3's new "cascade up" block goes here` marker (before the final `return { accessible };` inside the scratchpad's copy of the function).

Run: `node "<scratchpad>/test-task1-visible-folder-ids.js"`
Expected: last line prints `PASS (ancestors included)`, and neither `throw` fires.

- [ ] **Step 6: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "$(cat <<'EOF'
fix: cascade folder permission visibility up to ancestors

getVisibleFolderIds only cascaded access down to descendants. A user with
access to only a deep subfolder (e.g. one child inside Legal Study) never
saw the case root folder, so the tree had no path down to what they could
actually open. Add a third pass that walks each accessible folder's parent
chain and adds every ancestor too — visibility only, getFolderPermissions
still governs edit/rename/manage rights on those ancestor folders.
EOF
)"
```

---

## Task 2: Hard-lock rename for the 5 system template folders

**Files:**
- Modify: `All Module/Document/Library.js:111` (add constant next to `LEGAL_STUDY_FOLDER_TEMPLATE_KEY`)
- Modify: `All Module/Document/Library.js:9223-9267` (`renderContextMenuItems` — right-click menu)
- Modify: `All Module/Document/Library.js:9417-9448` (inline row action buttons)
- Modify: `All Module/Document/Library.js:8729-8806` (`handleRenameSubmit` — modal rename path)
- Modify: `All Module/Document/Library.js:8359-8415` (`handleSaveFileTitle` — inline-edit rename path)
- Test (scratchpad, not committed): `<scratchpad>/test-task2-rename-locked.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS` (a `Set<string>`) and `isRenameLockedFolder(record)` (returns `boolean`), both defined once near line 111 and used by name in every other file location in this task — Task 3 does not depend on these.

- [ ] **Step 1: Write the scratchpad test for the new pure predicate (must fail — function doesn't exist yet)**

Create `<scratchpad>/test-task2-rename-locked.js`:

```js
// Standalone reproduction for Task 2's pure predicate. Not committed.
const LEGAL_STUDY_FOLDER_TEMPLATE_KEY = "legal_study";
const SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS = new Set([
  LEGAL_STUDY_FOLDER_TEMPLATE_KEY,
  "lsc_related",
  "legal_docs",
  "legal_dossiers",
  "report_result",
]);
const isRenameLockedFolder = (record) =>
  record?._type === "folder" && SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS.has(record?.folderTemplateKey);

const cases = [
  [{ _type: "folder", folderTemplateKey: "legal_study" }, true],
  [{ _type: "folder", folderTemplateKey: "lsc_related" }, true],
  [{ _type: "folder", folderTemplateKey: "legal_docs" }, true],
  [{ _type: "folder", folderTemplateKey: "legal_dossiers" }, true],
  [{ _type: "folder", folderTemplateKey: "report_result" }, true],
  [{ _type: "folder", folderTemplateKey: null }, false], // user-created folder
  [{ _type: "folder" }, false], // no template key at all
  [{ _type: "document", folderTemplateKey: "legal_study" }, false], // not a folder record
];

let failures = 0;
cases.forEach(([record, expected], i) => {
  const actual = isRenameLockedFolder(record);
  if (actual !== expected) {
    failures += 1;
    console.error(`FAIL case ${i}: expected ${expected}, got ${actual}`, record);
  }
});
if (failures > 0) throw new Error(`${failures} case(s) failed`);
console.log("PASS: all isRenameLockedFolder cases correct");
```

- [ ] **Step 2: Run it to confirm it passes in isolation (this validates the predicate logic itself before wiring it into the real file)**

Run: `node "<scratchpad>/test-task2-rename-locked.js"`
Expected: `PASS: all isRenameLockedFolder cases correct`

- [ ] **Step 3: Add the constant and predicate to the real file**

In `All Module/Document/Library.js`, immediately after line 111 (`const LEGAL_STUDY_FOLDER_TEMPLATE_KEY = "legal_study";`), insert:

```js
  const SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS = new Set([
    LEGAL_STUDY_FOLDER_TEMPLATE_KEY,
    "lsc_related",
    "legal_docs",
    "legal_dossiers",
    "report_result",
  ]);
  const isRenameLockedFolder = (record) =>
    record?._type === "folder" &&
    SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS.has(record?.folderTemplateKey);
```

- [ ] **Step 4: Run `node --check` to confirm the file still parses**

Run: `node --check "All Module/Document/Library.js"`
Expected: no output.

- [ ] **Step 5: Gate the right-click "Rename" menu item**

In `renderContextMenuItems`, find this exact line (around 9223):

```js
        const { canRename, canMove, canDelete, canShare, canManagePermissions } =
          getRecordPerms(record);
```

Replace with:

```js
        const { canRename: rawCanRename, canMove, canDelete, canShare, canManagePermissions } =
          getRecordPerms(record);
        const canRename = rawCanRename && !isRenameLockedFolder(record);
```

Everything below that already reads `canRename`, `canMove`, etc. by name (e.g. `if (canRename) { ... }` around line 9255) — leave those completely untouched.

- [ ] **Step 6: Gate the inline row-action "Rename" button**

In the same file, find this exact line (around 9417):

```js
        const { canRename, canMove, canDelete, canManagePermissions } =
          getRecordPerms(record);
```

Replace with:

```js
        const { canRename: rawCanRename, canMove, canDelete, canManagePermissions } =
          getRecordPerms(record);
        const canRename = rawCanRename && !isRenameLockedFolder(record);
```

The rest of that block (the `if (!canRename && !canMove && ...) return null;` check and the `{canRename && (...)}` button around line 9437) already reads `canRename` by name — leave untouched.

- [ ] **Step 7: Guard the modal rename submit path**

In `handleRenameSubmit` (around line 8729), the function currently starts:

```js
    const handleRenameSubmit = async () => {
      try {
        const values = await renameForm.validateFields();
```

Change the `try` body's first line to add the guard before anything else runs:

```js
    const handleRenameSubmit = async () => {
      try {
        if (isRenameLockedFolder(renameRecord)) {
          message.error("Folder mẫu hệ thống không được đổi tên.");
          return;
        }
        const values = await renameForm.validateFields();
```

- [ ] **Step 8: Guard the inline-edit rename submit path**

In `handleSaveFileTitle` (around line 8373), the function currently starts:

```js
    const handleSaveFileTitle = async (record) => {
      const safeTitle = editingTitleValue.trim();
      if (!safeTitle) {
        cancelEditTitle();
        return;
      }
      try {
```

Change it to check the lock before the existing empty-title check:

```js
    const handleSaveFileTitle = async (record) => {
      if (isRenameLockedFolder(record)) {
        message.error("Folder mẫu hệ thống không được đổi tên.");
        cancelEditTitle();
        return;
      }
      const safeTitle = editingTitleValue.trim();
      if (!safeTitle) {
        cancelEditTitle();
        return;
      }
      try {
```

- [ ] **Step 9: Run `node --check` again on the whole file**

Run: `node --check "All Module/Document/Library.js"`
Expected: no output.

- [ ] **Step 10: Manual review checklist (no live Nocobase runtime available this session — this replaces a runtime test)**

Re-read each of the 4 edited spots (Steps 5-8) and confirm by eye:
- Every other destructured name from `getRecordPerms(record)` at the 2 UI sites is untouched and still spelled the same as before your edit.
- `isRenameLockedFolder` is referenced by that exact name in all 4 places — no typos, no `isFolderRenameLocked` or similar drift.
- `message` is already in scope at both `handleRenameSubmit` and `handleSaveFileTitle` (it's used a few lines below your inserted guard in both functions already, e.g. `message.error("Rename failed")` in `handleRenameSubmit` and `message.success(...)` in `handleSaveFileTitle`) — confirming there's no missing import.

- [ ] **Step 11: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "$(cat <<'EOF'
feat: lock rename for the 5 system template folders

CaseCreateForm.js auto-creates 5 fixed folders per case (Legal Study,
LSC & Related, Legal docs, Legal dossiers, Report and Result), identified
by folderTemplateKey. These should never be renamed by anyone, including
admins. Add isRenameLockedFolder() and gate both rename UI entry points
(context menu, inline row action) plus both submit paths
(handleRenameSubmit, handleSaveFileTitle) so there is no way to bypass it.
EOF
)"
```

---

## Task 3: Sync case root folder permission saves onto the Case's `managerId`/`assignees`

**Files:**
- Modify: `All Module/Document/Library.js:3175` (`FolderPermissionsModal` component signature — add `allFolders` prop)
- Modify: `All Module/Document/Library.js:3256-3307` (`FolderPermissionsModal.handleSave`)
- Modify: `All Module/Document/Library.js:15115-15130` (JSX usage of `<FolderPermissionsModal>`)
- Test (scratchpad, not committed): `<scratchpad>/test-task3-case-root-folder.js`

**Interfaces:**
- Consumes: `getFolderCaseProjectId(folder)` (already exists, `All Module/Document/Library.js:2169-2177`, returns a project id or falsy), `getFolderParentId(folder)` (already exists, `All Module/Document/Library.js:2164`, returns a parent id or falsy), `extractId` (already exists throughout the file).
- Produces: `isCaseRootFolder(folder, allFolders)` (returns `boolean`), a new `allFolders` prop on `FolderPermissionsModal`.

- [ ] **Step 1: Write the scratchpad test for `isCaseRootFolder` (must fail — function doesn't exist yet)**

Create `<scratchpad>/test-task3-case-root-folder.js`:

```js
// Standalone reproduction for Task 3's pure predicate. Not committed.
const extractId = (value) => {
  if (!value) return null;
  if (typeof value === "object") return extractId(value.id || value.value || value.key);
  return value;
};
const getFolderParentId = (folder) => extractId(folder?.parentId);
const getFolderCaseProjectId = (folder) =>
  extractId(folder?.projectId) ||
  extractId(folder?.caseId);

const isCaseRootFolder = (folder, allFolders) => {
  const ownProjectId = getFolderCaseProjectId(folder);
  if (!ownProjectId) return false;
  const parentId = getFolderParentId(folder);
  const parent = parentId
    ? allFolders.find((f) => String(extractId(f)) === String(parentId))
    : null;
  return !parent || !getFolderCaseProjectId(parent);
};

// Customer root (no projectId) -> Case folder (projectId: 7) -> Legal Study (projectId: 7)
const customerRoot = { id: "CR", parentId: null };
const caseFolder = { id: "CASE1", parentId: "CR", projectId: 7 };
const legalStudy = { id: "LS", parentId: "CASE1", projectId: 7 };
const allFolders = [customerRoot, caseFolder, legalStudy];

const results = [
  [isCaseRootFolder(customerRoot, allFolders), false, "customer root has no projectId"],
  [isCaseRootFolder(caseFolder, allFolders), true, "case folder: own projectId, parent has none"],
  [isCaseRootFolder(legalStudy, allFolders), false, "legal study: parent already has same projectId"],
];

let failures = 0;
results.forEach(([actual, expected, label]) => {
  if (actual !== expected) {
    failures += 1;
    console.error(`FAIL (${label}): expected ${expected}, got ${actual}`);
  }
});
if (failures > 0) throw new Error(`${failures} case(s) failed`);
console.log("PASS: all isCaseRootFolder cases correct");
```

- [ ] **Step 2: Run it to confirm it passes in isolation**

Run: `node "<scratchpad>/test-task3-case-root-folder.js"`
Expected: `PASS: all isCaseRootFolder cases correct`

- [ ] **Step 3: Add `isCaseRootFolder` to the real file**

In `All Module/Document/Library.js`, add this immediately after the `getFolderCaseProjectId` definition (right after line 2177, before `const normalizeParentId = ...` at line 2178):

```js
  // A folder is the root of a Case when it carries its own projectId but
  // its parent doesn't — the parent is then the Customer root (or out of
  // scope), not another folder that already belongs to the same Case. Case
  // template children (Legal Study, ...) also have projectId, but their
  // parent (the case folder itself) has it too, so they're excluded.
  const isCaseRootFolder = (folder, allFolders) => {
    const ownProjectId = getFolderCaseProjectId(folder);
    if (!ownProjectId) return false;
    const parentId = getFolderParentId(folder);
    const parent = parentId
      ? allFolders.find((f) => String(extractId(f)) === String(parentId))
      : null;
    return !parent || !getFolderCaseProjectId(parent);
  };
```

- [ ] **Step 4: Run `node --check`**

Run: `node --check "All Module/Document/Library.js"`
Expected: no output. If it fails, `getFolderParentId` (line 2164) must be defined before this new block — confirm the insertion point is after both `getFolderParentId` and `getFolderCaseProjectId`.

- [ ] **Step 5: Add the `allFolders` prop to `FolderPermissionsModal`**

Change the component signature at line 3175 from:

```js
  const FolderPermissionsModal = ({ open, folder, onClose, onSuccess }) => {
```

to:

```js
  const FolderPermissionsModal = ({ open, folder, allFolders, onClose, onSuccess }) => {
```

- [ ] **Step 6: Wire the prop at the JSX call site**

At lines 15115-15130, the current JSX is:

```jsx
        <FolderPermissionsModal
          open={!!permissionFolder}
          folder={permissionFolder}
          onClose={() => setPermissionFolder(null)}
          onSuccess={(permissionResult = {}) => {
```

Add `allFolders={folders}` (the component's raw, unfiltered folder state declared at line 3902 — this must be the full list so the parent lookup in `isCaseRootFolder` works regardless of the currently active space/company filter):

```jsx
        <FolderPermissionsModal
          open={!!permissionFolder}
          folder={permissionFolder}
          allFolders={folders}
          onClose={() => setPermissionFolder(null)}
          onSuccess={(permissionResult = {}) => {
```

- [ ] **Step 7: Run `node --check`**

Run: `node --check "All Module/Document/Library.js"`
Expected: no output.

- [ ] **Step 8: Edit `handleSave` — block Save when the case root folder has more than 1 manager**

The current `handleSave` (lines 3256-3307) starts:

```js
    const handleSave = async () => {
      setSaving(true);
      try {
        const folderId = extractId(folder.id);
        const managers = shares.filter((s) => s.role === "manager");
        const members = shares.filter((s) => s.role !== "manager");

        await Promise.all([
```

Change it to compute `isRootFolder` and validate *before* `setSaving(true)` (so a rejected save never shows a spinner):

```js
    const handleSave = async () => {
      const managers = shares.filter((s) => s.role === "manager");
      const members = shares.filter((s) => s.role !== "manager");
      const isRootFolder = isCaseRootFolder(folder, allFolders || []);

      if (isRootFolder && managers.length > 1) {
        message.error(
          "Case chỉ được phép có 1 Manager — vui lòng chỉ giữ lại 1 người.",
        );
        return;
      }

      setSaving(true);
      try {
        const folderId = extractId(folder.id);

        await Promise.all([
```

Note `managers`/`members` are now computed once at the top and reused — remove the now-duplicate `const managers = ...` / `const members = ...` lines that used to sit right after `const folderId = extractId(folder.id);` inside the `try` block (they're the two lines directly below the `try {` in the original, now redundant since they moved above `setSaving(true)`).

- [ ] **Step 9: Add the case-sync call at the end of the successful save**

The current end of `handleSave` (around line 3300) is:

```js
        await Promise.all(createPromises);
        message.success("Permissions updated successfully");
        onSuccess({ accessSummary: buildAccessSummary(shares), shares });
      } catch (e) {
        message.error("An error occurred while updating permissions");
      }
      setSaving(false);
    };
```

Change it to add the case sync between the `createPromises` await and the success message:

```js
        await Promise.all(createPromises);

        if (isRootFolder) {
          const projectId = getFolderCaseProjectId(folder);
          try {
            await ctx.api.request({
              url: "projects:update",
              method: "POST",
              params: { filterByTk: parseInt(projectId) },
              data: {
                managerId: managers[0] ? parseInt(managers[0].id) : null,
                assignees: members.map((m) => ({ id: parseInt(m.id) })),
              },
            });
          } catch (syncError) {
            console.warn(
              "Could not sync case manager/assignees from folder permissions:",
              syncError,
            );
            message.warning(
              "Đã lưu quyền folder, nhưng không đồng bộ được Manager/Members lên Case.",
            );
          }
        }

        message.success("Permissions updated successfully");
        onSuccess({ accessSummary: buildAccessSummary(shares), shares });
      } catch (e) {
        message.error("An error occurred while updating permissions");
      }
      setSaving(false);
    };
```

- [ ] **Step 10: Run `node --check` on the whole file**

Run: `node --check "All Module/Document/Library.js"`
Expected: no output.

- [ ] **Step 11: Manual review checklist (no live Nocobase runtime available this session)**

Re-read the full edited `handleSave` top to bottom and confirm:
- `managers` and `members` are each declared exactly once in the function (the duplicate declarations from Step 8's note were actually removed, not just shadowed).
- `isRootFolder` is computed once, before `setSaving(true)`, and referenced (not recomputed) in the case-sync block.
- The `>1 manager` guard's `return` happens before `setSaving(true)` is ever called — so `saving` state never gets stuck `true` on this rejection path.
- The case-sync `catch (syncError)` block does not `throw` and does not `return` — a failure there must fall through to the existing `message.success(...)` / `onSuccess(...)` lines for the folder-permissions part, per the design spec ("2 bước độc lập nhau về mặt thất bại").

- [ ] **Step 12: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "$(cat <<'EOF'
feat: sync case root folder permissions to Case managerId/assignees

CaseCreateForm.js only syncs Case -> folder permissions once, at case
creation. Editing Manager/Members later from Library's Folder Permissions
modal on the case's root folder had no way to flow back to the Case
record itself. Add isCaseRootFolder() to identify that specific folder
(own projectId, but parent folder doesn't have one), block Save when it
would assign more than 1 Manager (Case only has a single managerId slot),
and push managerId/assignees onto the Case via projects:update after a
successful save. Failure to sync back to the Case is reported separately
and does not roll back the already-saved folder permissions.
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Spec §1 (cascade lên) → Task 1. ✅
- Spec §2 (khoá rename 5 folder mẫu, cả 2 tầng UI + 2 tầng submit) → Task 2, all 4 sites covered. ✅
- Spec §3 (root folder permission save → sync case, chặn >1 manager, lỗi sync không rollback) → Task 3. ✅
- Spec's non-goals (no backfill, no change to inherit-down logic, no UI redesign of the modal, only the 5 listed keys locked) → none of the 3 tasks touch anything outside their stated scope; confirmed no task adds backfill logic or changes `getFolderPermissions`.

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to Task N" phrasing anywhere above — every step has literal before/after code.

**Type consistency:** `isRenameLockedFolder(record)` (Task 2) and `isCaseRootFolder(folder, allFolders)` (Task 3) are each defined once and referenced by the exact same name and argument order everywhere they're used across their own task. Task 3's `allFolders` prop name matches between the component signature (Step 5), the JSX call site (Step 6), and its use inside `handleSave` (Step 8). No cross-task name collisions (Task 2 and Task 3 add unrelated helpers).
