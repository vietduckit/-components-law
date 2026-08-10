# CaseDocument.js Link Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Link" button + creation flow to `CaseDocument.js` for all three cross-case link kinds (Case, Reference/Legal Study, specific folder), and change folder permission resolution in `CaseDocument.js` and `Library.js` so a folder directly under a Case root ("level-2") can carry its own scoped access grant instead of requiring access to the whole target Case.

**Architecture:** No new collections. Reuse `caseReferences`/`legalStudy` relations and the `caseLegalStudyLinks` collection (all already read-only wired in `CaseDocument.js`). Add a new "level-2 aware" permission resolution algorithm as an additional helper (`resolvePermissionFolder`) layered on top of the existing `resolveFolderTreeRoot`, used everywhere permission is checked; keep `resolveFolderTreeRoot` itself untouched so its other consumers (delete-lock, Case-record sync) keep behaving exactly as today. The Link modal is new JSX UI in `CaseDocument.js`, adapted from `LegalReferenceWorkspace.js`'s equivalent flows but writing the folder-scoped grant directly onto the target folder instead of the target Case's root.

**Tech Stack:** Nocobase JS Field/Action block (React + antd via `ctx.React`/`ctx.antd`, JSX supported directly — see project `CLAUDE.md`). No unit test framework exists in this repo (`package.json` has no test runner). The closest available verification is a Babel-parser syntax check (`@babel/parser`, already a repo dependency) confirming the file still parses as valid JS+JSX after each edit, paired with a concrete manual verification procedure run in the live Nocobase app for behavior. Every task below uses both.

## Global Constraints

- No `fetch()` — only `ctx.api.request()` (see `CLAUDE.md` §"Quy tắc khi viết code mới").
- No direct `import` — only `ctx.React`, `ctx.antd`, `ctx.importAsync()`, `ctx.requireAsync()`.
- Activity log is written by SQL triggers, never from JS — do not add `activity_log:create` calls for this feature unless explicitly matching an existing pattern already in the file for the same action type.
- Status colors/labels come from `STATUS_CFG`-style objects, not hardcoded inline — not applicable here (no status field involved), noted only per project convention.
- Every JS/JSX edit must be verified with the Babel-parser syntax check command shown in each task before being considered done.
- Do not modify the existing `isLinkCaseOpen` / `openLinkCaseModal` / "Link Reference Case" modal — it is a different, unrelated feature (attaching Cases to a `legalReference` record's `.cases` field). The new "Link" button and modal are entirely separate state and JSX.

---

## Task 1: New level-2-aware permission resolution helpers in `CaseDocument.js`

**Files:**
- Modify: `All Module/Document/CaseDocument.js:2081-2261` (adds two new functions after `resolveFolderTreeRoot` and after `isFolderTreeRoot`; changes one line inside `getFolderPermissions` and one line inside `getVisibleFolderIds`)
- Modify: `All Module/Document/CaseDocument.js` (the `canManagePermissions` gate, currently at or near line 9007-9009 — confirm exact line with Grep before editing, since line numbers drift as earlier tasks change file length)

**Interfaces:**
- Consumes: existing `extractId`, `getFolderManagerRows`, `getFolderMemberRows`, `resolveFolderTreeRoot`, `isFolderTreeRoot`, `roleToPerms`, `getMemberRoleTierPerms`, `getPermissionRole`, `getPermissionLawyerId` — all already defined in this file, unchanged.
- Produces: `resolvePermissionFolder(folder, allFolders)` — returns the folder object whose own `folderManagers`/`folderMembers` rows should govern `folder`'s permissions (either the Case's absolute root, or a level-2 folder if it has explicit rows). `isPermissionBearingFolder(folder, allFolders)` — returns `true` if `folder` is the Case's absolute root OR a direct child of it (used only to gate the "Permissions" UI action, never to gate delete). Task 2, Task 4, and Task 5 call `resolvePermissionFolder`/`isPermissionBearingFolder` by these exact names.

- [ ] **Step 1: Add `resolvePermissionFolder` and `isPermissionBearingFolder` right after the existing `resolveFolderTreeRoot`/`isFolderTreeRoot` functions**

Find this exact block (currently lines 2081-2120):

```js
const resolveFolderTreeRoot = (folder, allFolders) => {
  if (!folder) return null;
  const folderById = new Map(
    (allFolders || []).map((f) => [String(extractId(f.id)), f]),
  );
  // Case-bound folders (getLinkedCaseId set) stop climbing once the parent
  // no longer carries the SAME case's link — the Case root's own parent is
  // the Customer folder above it, which must never be treated as part of
  // this case's tree (matches Library.js's resolveFolderTreeRootFromMap;
  // without this gate a Case root folder's permissions/canDelete would
  // silently resolve against the Customer folder instead of itself).
  const ownCaseId = getLinkedCaseId(folder);
  let current = folder;
  const visited = new Set();
  while (true) {
    const parentId = extractId(current.parentId);
    if (!parentId || parentId === "root") break;
    const parentKey = String(parentId);
    if (visited.has(parentKey)) break;
    visited.add(parentKey);
    const parent = folderById.get(parentKey);
    if (!parent) break;
    if (ownCaseId && !getLinkedCaseId(parent)) break;
    current = parent;
  }
  return current;
};

const lockDeleteIfReferenceEntityRoot = (folder, perms) =>
  isReferenceEntityRootFolder(folder) ? { ...perms, canDelete: false } : perms;

// Permissions is root-folder-only now — never offered on a subfolder
// (its own folderManagers/folderMembers rows are ignored by the
// root-only model above, so editing them there would silently do
// nothing). True when `folder` IS its own tree root.
const isFolderTreeRoot = (folder, allFolders) => {
  if (!folder) return false;
  const root = resolveFolderTreeRoot(folder, allFolders) || folder;
  return String(extractId(root)) === String(extractId(folder));
};
```

Insert two new functions immediately after `isFolderTreeRoot`'s closing `};` (before `const getFolderPermissions = (`):

```js
// Level-2 grants — a folder one level below the Case's absolute root (e.g.
// "Legal Study", "LSC & Related") may carry its own folderManagers/
// folderMembers rows, checked BEFORE falling back to the Case root. This is
// what lets a cross-case link (see the "Link" > "Folder" flow) scope a
// grant to exactly the linked folder instead of the whole target Case.
// Folders at level 3+ are never permission-bearing on their own — they
// always resolve through this same walk to whichever of level-2/level-1
// actually has explicit rows.
const resolvePermissionFolder = (folder, allFolders) => {
  if (!folder) return null;
  const root = resolveFolderTreeRoot(folder, allFolders) || folder;
  const rootId = String(extractId(root));
  if (String(extractId(folder)) === rootId) return root;

  const folderById = new Map(
    (allFolders || []).map((f) => [String(extractId(f.id)), f]),
  );
  let current = folder;
  let level2 = null;
  const visited = new Set();
  while (current) {
    const parentId = String(extractId(current.parentId) || "");
    if (parentId === rootId) {
      level2 = current;
      break;
    }
    if (!parentId || parentId === "root" || visited.has(parentId)) break;
    visited.add(parentId);
    const parent = folderById.get(parentId);
    if (!parent) break;
    current = parent;
  }

  if (level2) {
    const hasOwnGrant =
      getFolderManagerRows(level2).length > 0 ||
      getFolderMemberRows(level2).length > 0;
    if (hasOwnGrant) return level2;
  }

  return root;
};

// Gates the "Permissions" UI action only — deliberately NOT used for
// canDelete (that still uses isFolderTreeRoot unchanged, so an ordinary
// level-2 folder stays deletable; only the 5 system template folders keep
// their separate isRenameLockedFolder lock). True for the Case's absolute
// root OR any of its direct (level-2) children.
const isPermissionBearingFolder = (folder, allFolders) => {
  if (!folder) return false;
  if (isFolderTreeRoot(folder, allFolders)) return true;
  const root = resolveFolderTreeRoot(folder, allFolders) || folder;
  const parentId = String(getFolderParentId(folder) || "");
  return parentId !== "" && parentId === String(extractId(root));
};
```

- [ ] **Step 2: Point `getFolderPermissions`'s root resolution at the new helper**

Find (currently line 2152):

```js
  const root = resolveFolderTreeRoot(folder, allFolders) || folder;

  if (uid && String(extractId(root.createdById)) === String(uid))
    return roleToPerms("owner");
```

Replace with:

```js
  const root = resolvePermissionFolder(folder, allFolders) || folder;

  if (uid && String(extractId(root.createdById)) === String(uid))
    return roleToPerms("owner");
```

- [ ] **Step 3: Point `getVisibleFolderIds`'s `resolveRoot` at the new helper**

Find (currently lines 2219-2226):

```js
  const rootCache = new Map();
  const resolveRoot = (folder) => {
    const key = String(extractId(folder.id));
    if (rootCache.has(key)) return rootCache.get(key);
    const root = resolveFolderTreeRoot(folder, allFolders) || folder;
    rootCache.set(key, root);
    return root;
  };
```

Replace with:

```js
  const rootCache = new Map();
  const resolveRoot = (folder) => {
    const key = String(extractId(folder.id));
    if (rootCache.has(key)) return rootCache.get(key);
    const root = resolvePermissionFolder(folder, allFolders) || folder;
    rootCache.set(key, root);
    return root;
  };
```

- [ ] **Step 4: Relax the "Permissions" context-menu gate to use `isPermissionBearingFolder`**

Run `grep -n "canManagePermissions =" "All Module/Document/CaseDocument.js"` to find the current exact line (was 9007-9009 at plan-writing time; may have shifted from Steps 1-3 adding ~50 lines above it). Find this block:

```js
      const canManagePermissions =
        rawCanManagePermissions &&
        isFolderTreeRoot(record, permissionAllFolders);
```

Replace with:

```js
      const canManagePermissions =
        rawCanManagePermissions &&
        isPermissionBearingFolder(record, permissionAllFolders);
```

Do NOT touch the nearby `canDelete` computation (`!isFolderTreeRoot(record, permissionAllFolders)`) — that must keep using `isFolderTreeRoot` unchanged, or ordinary level-2 folders would become undeletable.

- [ ] **Step 5: Syntax check**

```bash
node -e "
const { readFileSync } = require('fs');
const { parse } = require('@babel/parser');
const code = readFileSync('All Module/Document/CaseDocument.js', 'utf8');
try {
  parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] });
  console.log('OK: no syntax errors');
} catch (e) {
  console.error('Syntax error at line', e.loc && e.loc.line, ':', e.message);
  process.exit(1);
}
"
```

Expected: `OK: no syntax errors`.

- [ ] **Step 6: Manual verification in the running app**

1. Open a Case's document workspace (`CaseDocument.js`) as an admin user.
2. Right-click the "Legal Study" folder (a level-2 folder, direct child of the Case root). Confirm "Permissions" now appears in the context menu (it did not before this change).
3. Right-click a subfolder created *inside* "Legal Study" (level-3). Confirm "Permissions" still does NOT appear (unchanged — only level-1/level-2 are permission-bearing).
4. As a non-admin user who is a plain Member (not Manager) of the Case, confirm the level-2 folder still does not show "Permissions" for them (gate still requires `rawCanManagePermissions`, i.e. an admin/owner/manager-tier role — this is unchanged by this task).
5. Confirm a non-locked level-2 folder (e.g. a custom folder you create directly under the Case root, not one of the 5 system template folders) can still be moved to Trash as before (canDelete unaffected).

- [ ] **Step 7: Commit**

```bash
git add "All Module/Document/CaseDocument.js"
git commit -m "$(cat <<'EOF'
feat(CaseDocument): allow level-2 folders to carry their own permission grant

resolvePermissionFolder checks a folder directly under the Case root for
explicit folderManagers/folderMembers rows before falling back to the
Case root, and isPermissionBearingFolder relaxes the "Permissions"
action to be offered on those folders too (delete-lock via
isFolderTreeRoot is untouched). Lays the groundwork for scoping a
cross-case link's access grant to exactly the linked folder.
EOF
)"
```

---

## Task 2: Fix the Manager/Member summary display to reflect level-2 grants

**Files:**
- Modify: `All Module/Document/CaseDocument.js` (`currentRootFolderPermissionSummary`, currently lines ~6109-6151 — confirm exact lines with Grep, they will have shifted by Task 1's insertions)

**Interfaces:**
- Consumes: `resolvePermissionFolder` from Task 1.
- Produces: no new exports; this task only fixes a read-path bug so the sidebar's "Manager: ... / Member: ..." summary line matches what `getFolderPermissions` actually resolves to.

- [ ] **Step 1: Point the `legal_study_folder_link` branch at the new resolver**

Run `grep -n "Legal Study folder link: resolve the same way" "All Module/Document/CaseDocument.js"` to find the current line. Find this block:

```js
    // Legal Study folder link: resolve the same way as Linked Cases above,
    // but the tree root here is the TARGET case's root folder (not this
    // case's) — found by walking up from the linked folder itself within
    // legalStudyLinkCaseFolders (root-inclusive, unlike visibleFolders).
    if (
      activeSpace === "legal_study_folder_link" &&
      activeLegalStudyLinkFolderId
    ) {
      const targetFolder = legalStudyLinkCaseFolders.find(
        (f) => String(extractId(f)) === String(activeLegalStudyLinkFolderId),
      );
      if (!targetFolder) return null;
      const root =
        resolveFolderTreeRoot(targetFolder, legalStudyLinkCaseFolders) ||
        targetFolder;
      const managerNames = getFolderManagerRows(root)
        .map((row) => getLawyerDisplayName(row))
        .filter(Boolean);
      const memberNames = getFolderMemberRows(root)
        .map((row) => getLawyerDisplayName(row))
        .filter(Boolean);
      return { managerNames, memberNames };
    }
```

Replace the `root` line so it uses the new resolver — this now shows the level-2 grant (if any was set on the linked folder itself via Task 1/5) instead of always jumping straight to the target Case's root:

```js
    // Legal Study folder link: resolve the same way as Linked Cases above,
    // but the tree root here is the TARGET case's root folder (not this
    // case's) — found by walking up from the linked folder itself within
    // legalStudyLinkCaseFolders (root-inclusive, unlike visibleFolders).
    // Uses resolvePermissionFolder (not the plain absolute-root walk) so
    // this summary reflects a level-2 grant set directly on the linked
    // folder itself, if one exists, instead of always jumping to the
    // target case's root.
    if (
      activeSpace === "legal_study_folder_link" &&
      activeLegalStudyLinkFolderId
    ) {
      const targetFolder = legalStudyLinkCaseFolders.find(
        (f) => String(extractId(f)) === String(activeLegalStudyLinkFolderId),
      );
      if (!targetFolder) return null;
      const root =
        resolvePermissionFolder(targetFolder, legalStudyLinkCaseFolders) ||
        targetFolder;
      const managerNames = getFolderManagerRows(root)
        .map((row) => getLawyerDisplayName(row))
        .filter(Boolean);
      const memberNames = getFolderMemberRows(root)
        .map((row) => getLawyerDisplayName(row))
        .filter(Boolean);
      return { managerNames, memberNames };
    }
```

- [ ] **Step 2: Point the generic fallback branch at the new resolver**

Immediately below the block from Step 1, find:

```js
    if (selectedFolderId === "root") return null;
    const folder =
      visibleFolders.find(
        (f) => String(extractId(f)) === String(selectedFolderId),
      ) ||
      permissionAllFolders.find(
        (f) => String(extractId(f)) === String(selectedFolderId),
      );
    if (!folder) return null;
    const root = resolveFolderTreeRoot(folder, permissionAllFolders) || folder;
```

Replace the `root` line:

```js
    if (selectedFolderId === "root") return null;
    const folder =
      visibleFolders.find(
        (f) => String(extractId(f)) === String(selectedFolderId),
      ) ||
      permissionAllFolders.find(
        (f) => String(extractId(f)) === String(selectedFolderId),
      );
    if (!folder) return null;
    const root = resolvePermissionFolder(folder, permissionAllFolders) || folder;
```

- [ ] **Step 3: Syntax check**

Same command as Task 1 Step 5.

- [ ] **Step 4: Manual verification**

1. As the current Case's Manager, open a folder you've linked via `caseLegalStudyLinks` (or, if none exist yet, this step can be revisited after Task 5 creates one) — browse into "Legal Study" sidebar section, click a link.
2. Before any level-2 grant is set on the target folder, confirm the summary line under the breadcrumb shows the target Case's root Manager/Members (unchanged fallback behavior).
3. After Task 5 lands and a level-2 grant has been set directly on that linked folder, revisit this same screen and confirm the summary line now shows the level-2 grant's Manager/Members instead.

- [ ] **Step 5: Commit**

```bash
git add "All Module/Document/CaseDocument.js"
git commit -m "$(cat <<'EOF'
fix(CaseDocument): sync permission summary display to level-2 grants

currentRootFolderPermissionSummary now resolves through
resolvePermissionFolder instead of the plain absolute-root walk, so the
Manager/Member line shown in the breadcrumb area matches what
getFolderPermissions actually grants once a level-2 folder carries its
own explicit rows.
EOF
)"
```

---

## Task 3: Mirror the level-2 permission resolution into `Library.js`

**Files:**
- Modify: `All Module/Document/Library.js` (near `resolveFolderTreeRoot`/`isFolderTreeRoot`, confirmed at lines 1837/1848 at plan-writing time — re-confirm with Grep since this file may have changed)

**Interfaces:**
- Consumes: existing `extractId`, `getFolderManagerRows`, `getFolderMemberRows`, `resolveFolderTreeRootFromMap`, `resolveFolderTreeRoot`, `isFolderTreeRoot`, `isCaseRootFolder`, `getFolderCaseProjectId`, `getFolderParentId` — all already defined in `Library.js`.
- Produces: `resolvePermissionFolder(folder, allFolders)` and `isPermissionBearingFolder(folder, allFolders)` in `Library.js` — same names and same contract as Task 1's `CaseDocument.js` versions, so a developer reading both files recognizes the pattern immediately. Only wired into `getFolderPermissions`/`getVisibleFolderIds` and the "Permissions" action gate(s) — no new UI in this file (per the approved design spec, `Library.js` reaches the linked folder via its existing Customer → Case navigation, not a "link" concept of its own).

- [ ] **Step 1: Add `resolvePermissionFolder` and `isPermissionBearingFolder` after `isFolderTreeRoot`**

Run `grep -n "^const isFolderTreeRoot" "All Module/Document/Library.js"` to confirm the current line (was 1848 at plan-writing time). `isFolderTreeRoot` in `Library.js` reads:

```js
const isFolderTreeRoot = (folder, allFolders) => {
  if (!folder) return false;
  const parentId = getFolderParentId(folder);
  if (!parentId || parentId === "root") return true;
  return isCaseRootFolder(folder, allFolders || []);
};
```

Insert immediately after its closing `};`:

```js
// Level-2 grants (Case trees only) — a folder directly under a Case root
// (e.g. "Legal Study", "LSC & Related") may carry its own
// folderManagers/folderMembers rows, checked BEFORE falling back to the
// Case root. Non-Case trees (Company Shared, Personal, Knowledge,
// standalone Legal Study) are intentionally left untouched — strictly
// root-only, exactly as before. Mirrors CaseDocument.js's function of the
// same name so both files resolve an identical physical folder's
// permission identically (a linked folder reached via CaseDocument.js's
// "Legal Study" link space is the SAME folder a user can also reach here
// via Customer -> Case navigation).
const resolvePermissionFolder = (folder, allFolders) => {
  if (!folder) return null;
  const folderById = new Map(
    (allFolders || []).map((f) => [String(extractId(f)), f]),
  );
  const root = resolveFolderTreeRootFromMap(folder, folderById) || folder;
  const rootId = String(extractId(root));
  if (String(extractId(folder)) === rootId) return root;
  if (!getFolderCaseProjectId(root)) return root;

  let current = folder;
  let level2 = null;
  const visited = new Set();
  while (current) {
    const parentId = String(extractId(current.parentId) || "");
    if (parentId === rootId) {
      level2 = current;
      break;
    }
    if (!parentId || parentId === "root" || visited.has(parentId)) break;
    visited.add(parentId);
    const parent = folderById.get(parentId);
    if (!parent) break;
    current = parent;
  }

  if (level2) {
    const hasOwnGrant =
      getFolderManagerRows(level2).length > 0 ||
      getFolderMemberRows(level2).length > 0;
    if (hasOwnGrant) return level2;
  }

  return root;
};

// Gates the "Permissions" UI action only (never canDelete). True for a
// Case tree's absolute root OR any of its direct (level-2) children; false
// for non-Case trees' non-root folders, matching resolvePermissionFolder's
// scoping above.
const isPermissionBearingFolder = (folder, allFolders) => {
  if (!folder) return false;
  if (isFolderTreeRoot(folder, allFolders)) return true;
  const root = resolveFolderTreeRoot(folder, allFolders) || folder;
  if (!getFolderCaseProjectId(root)) return false;
  const parentId = String(getFolderParentId(folder) || "");
  return parentId !== "" && parentId === String(extractId(root));
};
```

- [ ] **Step 2: Point `getFolderPermissions`'s root resolution at the new helper**

Find (inside `getFolderPermissions`, after the Legal Study entity-bridge branch):

```js
  const root = resolveFolderTreeRoot(folder, allFolders) || folder;

  if (uid && String(extractId(root.createdById)) === String(uid))
    return roleToPerms("owner");
```

Replace with:

```js
  const root = resolvePermissionFolder(folder, allFolders) || folder;

  if (uid && String(extractId(root.createdById)) === String(uid))
    return roleToPerms("owner");
```

- [ ] **Step 3: Point `getVisibleFolderIds`'s `resolveRoot` at the new helper**

Find (inside `getVisibleFolderIds`):

```js
  const rootCache = new Map();
  const resolveRoot = (folder) => {
    const key = String(extractId(folder.id));
    if (rootCache.has(key)) return rootCache.get(key);
    const root = resolveFolderTreeRootFromMap(folder, folderById);
    rootCache.set(key, root);
    return root;
  };
```

Replace with:

```js
  const rootCache = new Map();
  const resolveRoot = (folder) => {
    const key = String(extractId(folder.id));
    if (rootCache.has(key)) return rootCache.get(key);
    const root = resolvePermissionFolder(folder, allFolders);
    rootCache.set(key, root);
    return root;
  };
```

- [ ] **Step 4: Relax every "Permissions" UI gate to use `isPermissionBearingFolder`**

Run `grep -n "isFolderTreeRoot(" "All Module/Document/Library.js"` and inspect each match. For every call site that gates showing/enabling the "Permissions" action (context-menu item construction, and the table/row action button's `canManagePermissions` computation) — replace `isFolderTreeRoot(record, ...)` with `isPermissionBearingFolder(record, ...)`. Leave every other call site (anything not directly gating the Permissions action — e.g. delete-lock logic, if any) untouched, exactly as Task 1 did for `CaseDocument.js`.

As a concrete anchor, one such site (context-menu construction) is:

```js
      if (
        isFolder &&
        canManagePermissions &&
        isFolderTreeRoot(record, visibleFolders)
      ) {
        items.push({
          key: "permission",
          label: renderContextMenuItemLabel(LOCK_ICON, "Permissions"),
```

Change the `isFolderTreeRoot(record, visibleFolders)` condition to `isPermissionBearingFolder(record, visibleFolders)`. Apply the same substitution at the row/table-action equivalent (search for `canManagePermissions` near the folder actions renderer).

- [ ] **Step 5: Syntax check**

```bash
node -e "
const { readFileSync } = require('fs');
const { parse } = require('@babel/parser');
const code = readFileSync('All Module/Document/Library.js', 'utf8');
try {
  parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] });
  console.log('OK: no syntax errors');
} catch (e) {
  console.error('Syntax error at line', e.loc && e.loc.line, ':', e.message);
  process.exit(1);
}
"
```

Expected: `OK: no syntax errors`.

- [ ] **Step 6: Manual verification**

1. Open `Library.js`, navigate Customer → Case → the same "Legal Study" folder used in Task 1's verification (same physical folder, reached via a different file).
2. Right-click it as the Case's Manager/admin — confirm "Permissions" now appears here too.
3. As a lawyer who was granted a level-2 grant on this folder via Task 5 (once that task lands) but has NO access to the Case's root — confirm they can now see this folder here in `Library.js` under Customer → Case navigation (previously they'd have been denied since `Library.js` only checked the Case root).
4. Confirm a Personal-space or Knowledge-space folder's Permissions behavior is completely unchanged (these are non-Case trees, excluded by the `getFolderCaseProjectId(root)` guard).

- [ ] **Step 7: Commit**

```bash
git add "All Module/Document/Library.js"
git commit -m "$(cat <<'EOF'
feat(Library): mirror CaseDocument.js's level-2 folder permission grant

Keeps folder permission resolution consistent across both files for
the same physical folder data — a level-2 grant set via CaseDocument.js
(e.g. through a cross-case link) now also takes effect when the same
folder is reached through Library.js's own Customer -> Case navigation.
Scoped to Case-bound trees only; Company Shared/Personal/Knowledge/
standalone Legal Study trees remain strictly root-only.
EOF
)"
```

---

## Task 4: "Link" button + modal shell with Case and Reference/Legal Study tabs

**Files:**
- Modify: `All Module/Document/CaseDocument.js` (new state near the existing link-related state declarations, ~line 4005-4007 at plan-writing time; new toolbar button in the action-bar `React.Fragment`, ~line 11958-12018 at plan-writing time; new Modal JSX placed alongside the file's other Modal renders)

**Interfaces:**
- Consumes: `LINK_CASE_ICON` (existing icon constant, already used at line 9518), `projects` state (existing, list of active Cases), `legalStudies` state (existing, list of Legal Study/Reference entities), `caseId`-equivalent `activeCaseId` state, `getCaseReferenceListLabel`-equivalent display helper (grep for the existing case-label formatter used elsewhere in this file, e.g. near `getCaseDisplayName` referenced at line 11070 in the sidebar), `ctx.api.request`.
- Produces: `isLinkOpen` (bool state), `openLinkModal()` (opens the modal, resets its fields), `handleLinkCaseTabSubmit()` / `handleLinkReferenceTabSubmit()` (submit handlers for the Case/Reference tabs, calling `caseReferences:add` / `legalStudy:add` respectively). Task 5 adds the third tab ("Folder") plus its own submit handler into the same modal shell built here, and reuses `isLinkOpen`/the tab-switch UI.

- [ ] **Step 0: Confirm every antd component this task and Task 5 introduce is already destructured**

Run:

```bash
grep -n "^const {" -A 40 "All Module/Document/CaseDocument.js" | grep -E "Radio|Empty|Select,|Checkbox|Text,|Input,"
```

This task's new JSX uses `Modal`, `Button`, `Input.Search`, `Checkbox` (Step 4) — all near-certainly already destructured from `ctx.antd` given the file's existing Move/Rename/Permission modals. Task 5 additionally uses `Select`, `Radio`, `Empty`, and `Text` (from `Typography`). For each of `Select`, `Radio`, `Empty`, `Text`, `Checkbox` that the grep above does NOT show as already destructured near the top of the file (the `const { ... } = ctx.antd;` block, and `const { Text } = Typography;` line), add it to that destructuring block now, e.g.:

```js
const {
  // ...existing entries...
  Select,
  Radio,
  Empty,
  Checkbox,
} = ctx.antd;
```

If `Text` isn't already pulled from `Typography`, find the existing `const { Title, Text } = Typography;`-style line (or add one) — this file almost certainly already has this given it renders section headers, but confirm rather than assume.

- [ ] **Step 1: Add state for the new Link modal**

Find (currently lines 4005-4007):

```js
  const [isLinkCaseOpen, setIsLinkCaseOpen] = useState(false);
  const [linkCaseRecord, setLinkCaseRecord] = useState(null);
  const [linkCaseLoading, setLinkCaseLoading] = useState(false);
```

Insert immediately after (keeping the existing three lines untouched — this is a separate, new feature, not a modification of the existing "Link Reference Case" modal):

```js
  // New "Link" button/modal — cross-case linking initiated FROM this Case's
  // own document view (Case / Reference / Folder tabs). Distinct from
  // isLinkCaseOpen above, which is an unrelated feature (attaching Cases to
  // a legalReference record's own .cases field).
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkTabMode, setLinkTabMode] = useState("case"); // "case" | "reference" | "folder"
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [linkCaseSearch, setLinkCaseSearch] = useState("");
  const [linkSelectedCaseIds, setLinkSelectedCaseIds] = useState([]);
  const [linkReferenceSearch, setLinkReferenceSearch] = useState("");
  const [linkSelectedReferenceIds, setLinkSelectedReferenceIds] = useState([]);
```

- [ ] **Step 2: Add `openLinkModal` and the two tab submit handlers**

Find `openLinkCaseModal` (currently lines 7201-7213):

```js
  const openLinkCaseModal = useCallback(
    (record) => {
      if (!record) return;
      const linkedIds = (record.cases || []).map((item) =>
        String(extractId(item)),
      );
      setLinkCaseRecord(record);
      linkCaseForm.resetFields();
      linkCaseForm.setFieldsValue({ caseIds: linkedIds });
      setIsLinkCaseOpen(true);
    },
    [linkCaseForm],
  );
```

Insert a new, separate block immediately after it:

```js
  const openLinkModal = useCallback(() => {
    setLinkTabMode("case");
    setLinkCaseSearch("");
    setLinkSelectedCaseIds([]);
    setLinkReferenceSearch("");
    setLinkSelectedReferenceIds([]);
    setIsLinkOpen(true);
  }, []);

  const closeLinkModal = useCallback(() => {
    setIsLinkOpen(false);
  }, []);

  // caseReferences is a symmetric belongsToMany — linking A to B also
  // shows up when browsing from B, matching how LegalReferenceWorkspace.js's
  // "Case" tab behaves (addRelationLink pattern).
  const handleLinkCaseTabSubmit = async () => {
    if (linkSelectedCaseIds.length === 0) {
      message.warning("Please select at least one Case.");
      return;
    }
    setLinkSubmitting(true);
    try {
      let successCount = 0;
      let failedCount = 0;
      for (const targetCaseId of linkSelectedCaseIds) {
        try {
          await ctx.api.request({
            url: `projects/${encodeURIComponent(activeCaseId)}/caseReferences:add`,
            method: "POST",
            data: { tk: targetCaseId },
          });
          successCount += 1;
        } catch (error) {
          failedCount += 1;
          console.error("[CaseDocument] link case failed", targetCaseId, error);
        }
      }
      if (successCount > 0 && failedCount === 0) {
        message.success(
          successCount === 1
            ? "Linked Case successfully."
            : `Linked ${successCount} Cases successfully.`,
        );
      } else if (successCount > 0) {
        message.warning(`Linked ${successCount} Case(s), ${failedCount} failed.`);
      } else {
        message.error("Failed to link Case.");
        return;
      }
      closeLinkModal();
      loadData();
    } finally {
      setLinkSubmitting(false);
    }
  };

  const handleLinkReferenceTabSubmit = async () => {
    if (linkSelectedReferenceIds.length === 0) {
      message.warning("Please select at least one Reference.");
      return;
    }
    setLinkSubmitting(true);
    try {
      let successCount = 0;
      let failedCount = 0;
      for (const targetLegalStudyId of linkSelectedReferenceIds) {
        try {
          await ctx.api.request({
            url: `projects/${encodeURIComponent(activeCaseId)}/legalStudy:add`,
            method: "POST",
            data: { tk: targetLegalStudyId },
          });
          successCount += 1;
        } catch (error) {
          failedCount += 1;
          console.error(
            "[CaseDocument] link reference failed",
            targetLegalStudyId,
            error,
          );
        }
      }
      if (successCount > 0 && failedCount === 0) {
        message.success(
          successCount === 1
            ? "Linked Reference successfully."
            : `Linked ${successCount} References successfully.`,
        );
      } else if (successCount > 0) {
        message.warning(
          `Linked ${successCount} Reference(s), ${failedCount} failed.`,
        );
      } else {
        message.error("Failed to link Reference.");
        return;
      }
      closeLinkModal();
      loadData();
    } finally {
      setLinkSubmitting(false);
    }
  };
```

- [ ] **Step 3: Add the "Link" toolbar button**

Run `grep -n '"New"' "All Module/Document/CaseDocument.js"` to re-locate the toolbar action-bar `React.Fragment` (was lines 11958-12018 at plan-writing time). Find:

```js
                <React.Fragment>
                  {activeSpace !== "trash" &&
                    (currentFolderPerms.canCreate ||
                      (activeSpace === "legal_reference" &&
                        !activeLegalReferenceId)) && (
                      <Dropdown
```

Insert a new `Button` right before this `<Dropdown>`, still inside the same `<React.Fragment>`, gated so it only shows while browsing the current Case's own tree (not "Linked Cases", "Legal Study" link space, Trash, Recent, "legal_reference", etc.):

```js
                <React.Fragment>
                  {activeSpace === "cases" && (
                    <Button
                      icon={LINK_CASE_ICON}
                      onClick={openLinkModal}
                      style={{
                        borderRadius: 8,
                        border: "0.5px solid #E5E7EB",
                        color: "#185FA5",
                        fontWeight: 500,
                      }}
                    >
                      Link
                    </Button>
                  )}
                  {activeSpace !== "trash" &&
                    (currentFolderPerms.canCreate ||
                      (activeSpace === "legal_reference" &&
                        !activeLegalReferenceId)) && (
                      <Dropdown
```

(Leave the rest of the block — the `<Dropdown>...New...</Dropdown>` and the `Refresh` `<Button>` after it — exactly as is; only the new `Button` above is inserted.)

- [ ] **Step 4: Add the modal shell (tab switcher + Case/Reference tab bodies)**

Locate where the existing "Link Reference Case" modal (`isLinkCaseOpen`) is rendered — run `grep -n "isLinkCaseOpen" "All Module/Document/CaseDocument.js"` and find its `<Modal open={isLinkCaseOpen} ...>` block. Insert the new modal as a sibling `<Modal>` immediately after that one's closing tag (Task 5 will extend this same modal's body with the third "Folder" tab, so keep this JSX block self-contained and easy to find again):

```jsx
      <Modal
        title="Link"
        open={isLinkOpen}
        onCancel={closeLinkModal}
        width={640}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={closeLinkModal}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={linkSubmitting}
            onClick={
              linkTabMode === "case"
                ? handleLinkCaseTabSubmit
                : linkTabMode === "reference"
                  ? handleLinkReferenceTabSubmit
                  : handleLinkFolderTabSubmit
            }
          >
            Link
          </Button>,
        ]}
      >
        <div
          style={{
            display: "inline-flex",
            gap: 4,
            background: "#F3F4F6",
            padding: 4,
            borderRadius: 8,
            border: "1px solid #E5E7EB",
            marginBottom: 20,
          }}
        >
          {[
            { key: "case", label: "Case" },
            { key: "reference", label: "Reference / Legal Study" },
            { key: "folder", label: "Folder" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setLinkTabMode(tab.key)}
              style={{
                border: 0,
                background: linkTabMode === tab.key ? "#fff" : "transparent",
                color: linkTabMode === tab.key ? "#185FA5" : "#6B7280",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {linkTabMode === "case" && (
          <div>
            <Input.Search
              placeholder="Search case..."
              value={linkCaseSearch}
              onChange={(e) => setLinkCaseSearch(e.target.value)}
              allowClear
              style={{ marginBottom: 10 }}
            />
            <div
              style={{
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              {projects
                .filter((p) => String(extractId(p)) !== String(activeCaseId))
                .filter((p) =>
                  String(p.projectName || p.caseCode || "")
                    .toLowerCase()
                    .includes(linkCaseSearch.toLowerCase()),
                )
                .map((p) => {
                  const id = String(extractId(p));
                  const selected = linkSelectedCaseIds.includes(id);
                  return (
                    <div
                      key={id}
                      onClick={() =>
                        setLinkSelectedCaseIds((prev) =>
                          prev.includes(id)
                            ? prev.filter((v) => v !== id)
                            : [...prev, id],
                        )
                      }
                      style={{
                        padding: "10px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid #F3F4F6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>
                        {[p.caseCode, p.projectName].filter(Boolean).join(" - ")}
                      </span>
                      <Checkbox checked={selected} onChange={() => {}} />
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {linkTabMode === "reference" && (
          <div>
            <Input.Search
              placeholder="Search reference..."
              value={linkReferenceSearch}
              onChange={(e) => setLinkReferenceSearch(e.target.value)}
              allowClear
              style={{ marginBottom: 10 }}
            />
            <div
              style={{
                border: "1px solid #E5E7EB",
                borderRadius: 8,
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              {legalStudies
                .filter((s) =>
                  String(s.title || s.name || "")
                    .toLowerCase()
                    .includes(linkReferenceSearch.toLowerCase()),
                )
                .map((s) => {
                  const id = String(extractId(s));
                  const selected = linkSelectedReferenceIds.includes(id);
                  return (
                    <div
                      key={id}
                      onClick={() =>
                        setLinkSelectedReferenceIds((prev) =>
                          prev.includes(id)
                            ? prev.filter((v) => v !== id)
                            : [...prev, id],
                        )
                      }
                      style={{
                        padding: "10px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid #F3F4F6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{s.title || s.name || `Reference #${id}`}</span>
                      <Checkbox checked={selected} onChange={() => {}} />
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {linkTabMode === "folder" && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Folder linking is not available yet"
          />
        )}
      </Modal>
```

This task also defines `handleLinkFolderTabSubmit` (referenced in the footer button above) as a working stub so the file stays fully functional if Task 5 hasn't landed yet — clicking "Link" while on the "Folder" tab shows a warning instead of throwing:

```js
  const handleLinkFolderTabSubmit = async () => {
    message.warning("Folder linking is not available yet.");
  };
```

Add this stub near `handleLinkReferenceTabSubmit` from Step 2. Task 5 Step 3 replaces this stub's body with the real implementation (same function name, so the footer button's `onClick` wiring from this task needs no changes), and Task 5 Step 4 replaces the `<Empty ... />` block above with the real Folder tab body.

- [ ] **Step 5: Syntax check**

Same command as Task 1 Step 5, targeting `CaseDocument.js`.

- [ ] **Step 6: Manual verification**

1. Open a Case's document workspace. Confirm the "Link" button appears in the toolbar only while `activeSpace === "cases"` (i.e. browsing the Case's own folder tree) — switch to "Linked Cases" or "Legal Study" in the sidebar and confirm the button disappears.
2. Click "Link". Confirm the modal opens with three tabs: Case, Reference / Legal Study, Folder (Folder tab shows the "not implemented yet" warning path until Task 5 lands — clicking its tab should not throw).
3. On the "Case" tab, search and select another active Case, submit. Confirm a success message appears and the "Linked Cases" sidebar section (existing, read-only) now shows the newly linked Case.
4. On the "Reference / Legal Study" tab, search and select a Reference, submit. Confirm a success message and that it now appears wherever this file already displays `legalStudy`-linked references (existing read-side UI).

- [ ] **Step 7: Commit**

```bash
git add "All Module/Document/CaseDocument.js"
git commit -m "$(cat <<'EOF'
feat(CaseDocument): add Link button with Case and Reference tabs

New "Link" button in the toolbar (visible only while browsing the
current Case's own tree) opens a 3-tab modal. Case and Reference tabs
write to the existing caseReferences/legalStudy relations that this
file already reads for its "Linked Cases"/reference display. The
Folder tab is stubbed here and completed in the next commit.
EOF
)"
```

---

## Task 5: "Folder" tab — target Case + level-2 folder picker, `caseLegalStudyLinks` creation, and scoped access grant

**Files:**
- Modify: `All Module/Document/CaseDocument.js` (new state, the Folder tab body replacing the Task 4 stub, `handleLinkFolderTabSubmit` replacing the Task 4 stub)

**Interfaces:**
- Consumes: `folders` state (already loaded company-wide, confirmed via `legalStudyLinkCaseFolders`'s own client-side filter at Task-writing time — no new fetch needed), `matchesCaseFolder`, `getFolderParentId`, `extractId`, `getFolderManagerRows`, `getFolderMemberRows`, `getPermissionLawyerId` (already used inside `getFolderPermissions`/`getVisibleFolderIds` in this file), `getLawyerDisplayName`, `isFolderTreeRoot` (from the existing code, unchanged by Task 1), `activeCaseRootFolder` (existing state, the current Case's own root folder record), `projects` state, `ctx.api.request`.
- Produces: `handleLinkFolderTabSubmit()` (replaces Task 4's stub), completing the modal built in Task 4.

- [ ] **Step 1: Add Folder-tab state**

Find the state block added in Task 4 Step 1 and extend it:

```js
  const [linkFolderTargetCaseId, setLinkFolderTargetCaseId] = useState(null);
  const [linkFolderSelectedFolderId, setLinkFolderSelectedFolderId] = useState(null);
  const [linkFolderGrantMemberIds, setLinkFolderGrantMemberIds] = useState([]);
```

Also reset these three in `openLinkModal` (Task 4 Step 2) — find:

```js
  const openLinkModal = useCallback(() => {
    setLinkTabMode("case");
    setLinkCaseSearch("");
    setLinkSelectedCaseIds([]);
    setLinkReferenceSearch("");
    setLinkSelectedReferenceIds([]);
    setIsLinkOpen(true);
  }, []);
```

Replace with:

```js
  const openLinkModal = useCallback(() => {
    setLinkTabMode("case");
    setLinkCaseSearch("");
    setLinkSelectedCaseIds([]);
    setLinkReferenceSearch("");
    setLinkSelectedReferenceIds([]);
    setLinkFolderTargetCaseId(null);
    setLinkFolderSelectedFolderId(null);
    setLinkFolderGrantMemberIds([]);
    setIsLinkOpen(true);
  }, []);
```

- [ ] **Step 2: Compute the target Case's level-2 folders and the current Case's own team (for the member picker)**

Add these two `useMemo`s near the other folder-derived memos (e.g. right after `legalStudyLinkCaseFolders`, so they follow the same "declared before things that reference it" convention already used in this file):

```js
  // Level-2 folders of whichever Case is picked as the link target in the
  // "Folder" tab — client-side filter over the already-loaded `folders`
  // state (company-wide), no extra fetch needed. A folder is level-2 if
  // its own parent is that target Case's root (isFolderTreeRoot's own
  // definition of "root": no parentId, or the folder is that Case's
  // resolved absolute root via resolveFolderTreeRoot).
  const linkFolderTargetCaseFolders = useMemo(() => {
    if (!linkFolderTargetCaseId) return [];
    return folders.filter(
      (f) => !f.isDeleted && matchesCaseFolder(f, linkFolderTargetCaseId),
    );
  }, [folders, linkFolderTargetCaseId]);

  const linkFolderTargetCaseLevel2Folders = useMemo(() => {
    if (!linkFolderTargetCaseFolders.length) return [];
    const root = linkFolderTargetCaseFolders.find((f) =>
      isFolderTreeRoot(f, linkFolderTargetCaseFolders),
    );
    if (!root) return [];
    const rootId = String(extractId(root));
    return linkFolderTargetCaseFolders.filter(
      (f) => String(getFolderParentId(f) || "") === rootId,
    );
  }, [linkFolderTargetCaseFolders]);

  // The current Case's own team (Manager + Members already granted on its
  // root folder) — the picker for "who gets to see the linked folder" is
  // deliberately restricted to this list, not the full company lawyer
  // directory, so a link can't grant access to someone unrelated to
  // either Case.
  const linkFolderGrantableTeam = useMemo(() => {
    if (!activeCaseRootFolder) return [];
    const rows = [
      ...getFolderManagerRows(activeCaseRootFolder),
      ...getFolderMemberRows(activeCaseRootFolder),
    ];
    const seen = new Map();
    rows.forEach((row) => {
      const lawyerId = String(getPermissionLawyerId(row) || "");
      if (!lawyerId || seen.has(lawyerId)) return;
      seen.set(lawyerId, {
        id: lawyerId,
        name: getLawyerDisplayName(row),
      });
    });
    return Array.from(seen.values());
  }, [activeCaseRootFolder]);
```

- [ ] **Step 3: Replace `handleLinkFolderTabSubmit`'s stub with the real implementation**

Find the stub added in Task 4 Step 4:

```js
  const handleLinkFolderTabSubmit = async () => {
    message.warning("Folder linking not implemented yet.");
  };
```

Replace with:

```js
  // Creates the caseLegalStudyLinks row (so it shows up in the existing
  // "Legal Study" sidebar section, already wired to read this collection),
  // then grants the picked team members access DIRECTLY on the target
  // folder itself (a level-2 folder — see linkFolderTargetCaseLevel2Folders
  // above) instead of the target Case's root. This cross-case write is
  // authorized simply by the current user managing THIS Case (the same
  // authorization boundary LegalReferenceWorkspace.js's handleLinkSubmit
  // already uses for its own cross-case grants) — no target-Case Manager
  // role is required.
  const handleLinkFolderTabSubmit = async () => {
    if (!linkFolderTargetCaseId) {
      message.warning("Please select a target Case.");
      return;
    }
    if (!linkFolderSelectedFolderId) {
      message.warning("Please select a folder to link.");
      return;
    }
    const targetFolder = linkFolderTargetCaseLevel2Folders.find(
      (f) => String(extractId(f)) === String(linkFolderSelectedFolderId),
    );
    if (!targetFolder) {
      message.error("Selected folder not found.");
      return;
    }
    const targetCase = projects.find(
      (p) => String(extractId(p)) === String(linkFolderTargetCaseId),
    );

    setLinkSubmitting(true);
    try {
      await ctx.api.request({
        url: "caseLegalStudyLinks:create",
        method: "POST",
        data: {
          caseId: activeCaseId,
          targetFolderId: extractId(targetFolder),
          folderName: targetFolder.name || "Folder",
          caseName: targetCase
            ? [targetCase.caseCode, targetCase.projectName]
                .filter(Boolean)
                .join(" - ")
            : "",
        },
      });

      if (linkFolderGrantMemberIds.length > 0) {
        await Promise.all(
          linkFolderGrantMemberIds.map((lawyerId) =>
            ctx.api.request({
              url: "folderMembers:create",
              method: "POST",
              data: {
                folderId: extractId(targetFolder),
                lawyerId: Number(lawyerId),
                role: "viewer",
              },
            }),
          ),
        );
      }

      message.success("Folder linked successfully.");
      closeLinkModal();
      loadData();
    } catch (error) {
      console.error("[CaseDocument] link folder failed", error);
      message.error("Failed to link folder.");
    } finally {
      setLinkSubmitting(false);
    }
  };
```

- [ ] **Step 4: Replace the Task 4 "not available yet" stub with the real Folder tab body**

Find (added in Task 4 Step 4):

```jsx
        {linkTabMode === "folder" && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Folder linking is not available yet"
          />
        )}
```

Replace with:

```jsx
        {linkTabMode === "folder" && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ display: "block", marginBottom: 6 }}>
                Target Case
              </Text>
              <Select
                showSearch
                allowClear
                placeholder="Select the Case to link a folder from..."
                style={{ width: "100%" }}
                value={linkFolderTargetCaseId}
                onChange={(value) => {
                  setLinkFolderTargetCaseId(value || null);
                  setLinkFolderSelectedFolderId(null);
                }}
                filterOption={(input, option) =>
                  (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
                options={projects
                  .filter((p) => String(extractId(p)) !== String(activeCaseId))
                  .map((p) => ({
                    value: String(extractId(p)),
                    label: [p.caseCode, p.projectName].filter(Boolean).join(" - "),
                  }))}
              />
            </div>

            {linkFolderTargetCaseId && (
              <div style={{ marginBottom: 12 }}>
                <Text strong style={{ display: "block", marginBottom: 6 }}>
                  Folder to link (only root-level folders of the target Case
                  can be linked)
                </Text>
                {linkFolderTargetCaseLevel2Folders.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="This Case has no root-level folders yet"
                  />
                ) : (
                  <div
                    style={{
                      border: "1px solid #E5E7EB",
                      borderRadius: 8,
                      maxHeight: 220,
                      overflowY: "auto",
                    }}
                  >
                    {linkFolderTargetCaseLevel2Folders.map((f) => {
                      const id = String(extractId(f));
                      const selected = linkFolderSelectedFolderId === id;
                      return (
                        <div
                          key={id}
                          onClick={() => setLinkFolderSelectedFolderId(id)}
                          style={{
                            padding: "10px 12px",
                            cursor: "pointer",
                            borderBottom: "1px solid #F3F4F6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: selected ? "#E6F1FB" : "transparent",
                          }}
                        >
                          <span>{f.name || "Folder"}</span>
                          <Radio checked={selected} onChange={() => {}} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {linkFolderSelectedFolderId && (
              <div>
                <Text strong style={{ display: "block", marginBottom: 6 }}>
                  Grant access to (from this Case's own team)
                </Text>
                {linkFolderGrantableTeam.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="This Case has no Manager/Members set yet"
                  />
                ) : (
                  <Select
                    mode="multiple"
                    allowClear
                    placeholder="Select who on this Case's team can view the linked folder..."
                    style={{ width: "100%" }}
                    value={linkFolderGrantMemberIds}
                    onChange={setLinkFolderGrantMemberIds}
                    options={linkFolderGrantableTeam.map((m) => ({
                      value: m.id,
                      label: m.name,
                    }))}
                  />
                )}
              </div>
            )}
          </div>
        )}
```

- [ ] **Step 5: Syntax check**

Same command as Task 1 Step 5, targeting `CaseDocument.js`.

- [ ] **Step 6: Manual verification (this is the scenario from the original request)**

1. As Case A's Manager, click "Link" → "Folder" tab. Select Case B as the target Case.
2. Confirm the folder list shows Case B's root-level folders (e.g. "Legal Study", "LSC & Related", "Legal docs", "Legal dossiers", "Report and Result", plus any other custom level-2 folder) — and does NOT let you select anything deeper (no tree expansion into level-3 subfolders).
3. Select "Legal Study". Confirm the "Grant access to" picker lists only Case A's own current team (Manager + Members), not the full company lawyer directory.
4. Pick a Case A member who currently has NO access to Case B at all. Submit.
5. Confirm: (a) a success message appears, (b) the "Legal Study" sidebar section in Case A's own document view now lists this new link, (c) as that specific member (log in as them, or use an admin's "view as" tooling if available), open Case A's document workspace → "Legal Study" sidebar link → confirm they CAN see Case B's "Legal Study" folder and its contents, (d) still as that member, confirm they CANNOT see any other folder of Case B (e.g. try navigating to Case B directly via the Customer/Case sidebar or via `Library.js` — access must be denied outside the linked folder's own subtree).
6. As Case B's own Manager (who did not create this link), confirm they are unaffected — their own access to their own Case B root and all its folders is unchanged.

- [ ] **Step 7: Commit**

```bash
git add "All Module/Document/CaseDocument.js"
git commit -m "$(cat <<'EOF'
feat(CaseDocument): complete Folder-tab link creation with scoped grant

Picking a target Case then one of its root-level folders creates a
caseLegalStudyLinks row and grants the current Case's own team members
(picker limited to this Case's own team, never the full lawyer
directory) directly on the target folder itself via folderMembers,
rather than the target Case's root -- so access stays scoped to
exactly the linked folder, closing the gap this whole feature set was
built to fix.
EOF
)"
```

---

## Task 6: End-to-end verification and spec cross-check

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Full syntax check of both modified files**

```bash
node -e "
const { readFileSync } = require('fs');
const { parse } = require('@babel/parser');
for (const file of ['All Module/Document/CaseDocument.js', 'All Module/Document/Library.js']) {
  const code = readFileSync(file, 'utf8');
  try {
    parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] });
    console.log('OK:', file);
  } catch (e) {
    console.error('Syntax error in', file, 'at line', e.loc && e.loc.line, ':', e.message);
    process.exit(1);
  }
}
"
```

Expected: `OK: All Module/Document/CaseDocument.js` and `OK: All Module/Document/Library.js`.

- [ ] **Step 2: Re-run the full scenario from the design spec, end to end**

Re-read `docs/superpowers/specs/2026-08-10-case-document-link-integration-design.md` and confirm each numbered requirement has a corresponding, working piece of behavior:
- §3 data model: all three link kinds write to the exact collections/relations listed (spot-check via the browser's network tab or server logs during Task 4/5's manual verifications).
- §4 permission model: level-2 grants work in both `CaseDocument.js` and `Library.js` (Task 1-3's manual verifications).
- §4.2 constraint: the Folder-tab picker cannot select level-3+ folders (Task 5 Step 6.2).
- §4.4: the member picker is restricted to the linking Case's own team (Task 5 Step 6.3).
- §5.1: the "Link" button only shows in the current Case's own sidebar context (Task 4 Step 6.1).
- §5.3: newly created links appear in the existing "Linked Cases"/"Legal Study" sidebar sections without any further changes (Task 4 Step 6.3, Task 5 Step 6.5b).

- [ ] **Step 3: Update `CLAUDE.md` cross-reference if warranted**

If, during implementation, any pattern here turns out to be reusable/important enough for future document-module work (matching this repo's existing convention of cross-referencing `nocobase-docs/*` and `CLAUDE.md`), add a one-line pointer — otherwise skip this step. Do not add documentation preemptively; only if something genuinely reusable emerged.

- [ ] **Step 4: Final commit (only if Step 3 produced a change)**

```bash
git add CLAUDE.md
git commit -m "docs: note the CaseDocument.js level-2 folder permission pattern"
```
