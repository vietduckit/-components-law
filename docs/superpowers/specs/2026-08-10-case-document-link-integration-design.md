# CaseDocument.js — Link Business Integration Design

Date: 2026-08-10
Status: Approved for planning

## 1. Motivation

`CaseDocument.js` already has read-only navigation for two kinds of cross-case
links — "Linked Cases" (`activeSpace === "case_reference"`, backed by the
`caseReferences` relation) and "Legal Study" folder links
(`activeSpace === "legal_study_folder_link"`, backed by the
`caseLegalStudyLinks` collection) — plus a third relation, `legalStudy`
(Case↔Reference), fetched the same way. All three are populated by rows
created elsewhere (`LegalReferenceWorkspace.js`); `CaseDocument.js` has no UI
to create a link itself.

Separately, folder permission resolution in `CaseDocument.js` is root-only:
`resolveFolderTreeRoot` always walks a folder up to the absolute root of its
Case, and `folderManagers`/`folderMembers` can only ever be written to that
root (gated by `isFolderTreeRoot` on the "Permissions" action). For a linked
folder (e.g. Case A links Case B's "Legal Study" folder), this means the only
way to grant a Case A member visibility into that one folder is to grant them
access to Case B's **entire** folder tree — there is no way to scope the
grant to just the linked folder.

This design closes both gaps: it adds the missing link-creation UI to
`CaseDocument.js`, and it changes folder permission resolution so a folder
one level below a Case root can carry its own grant, letting a link's access
be scoped to exactly the linked folder.

## 2. Scope

**In scope** (all within `CaseDocument.js` only):
- UI to create all three link kinds: Case↔Case (`caseReferences`),
  Case↔Reference/Legal Study entity (`legalStudy`), Case↔specific folder
  (`caseLegalStudyLinks`).
- A folder-tree picker (adapted from `LegalReferenceWorkspace.js`'s
  `DirectoryTree`-based picker) for choosing the target folder in the
  Case↔folder link flow.
- A "grant access to this link" step, letting the linking Case's Manager pick
  members from the linking Case's own team and grant them view/edit tiers on
  the specifically-linked folder.
- The underlying permission-resolution change: folders one level below a
  Case root ("level-2" folders — the fixed template folders like "Legal
  Study", "LSC & Related", "Legal docs", "Legal dossiers", "Report and
  Result", or any other direct child of a Case root) may carry their own
  `folderManagers`/`folderMembers` rows, checked before falling back to the
  Case root.
- Relaxing the "Permissions" action's `isFolderTreeRoot` gate so it is also
  offered on level-2 folders.

**Out of scope** (explicitly deferred):
- Mirroring the permission-resolution change into `Library.js`. The two
  files currently implement the same root-only model independently and will
  temporarily diverge — `Library.js` keeps its current root-only behavior.
  This is tracked as follow-up work, not part of this change.
- Any approval/veto workflow for the linked-to Case. Links take effect
  immediately on creation, matching the existing `caseLegalStudyLinks`
  behavior. (Read-only visibility for the linked-to Case's Manager, so they
  can see which other Cases link into their folders, is a candidate
  follow-up but not required by this design — see Open Questions.)
- Any change to the existing "Link Reference Case" modal
  (`isLinkCaseOpen`/`openLinkCaseModal`), which is an unrelated feature
  (attaching Cases to a `legalReference` record's `.cases` field). The new
  "Link" button and modal introduced here are a separate, distinctly-named
  UI element.

## 3. Data model

No new collections or fields. All three link kinds reuse existing
infrastructure, matched to what `LegalReferenceWorkspace.js` already writes:

- **Case↔Case**: `projects.caseReferences` relation, written via
  `POST projects/{caseId}/caseReferences:add`.
- **Case↔Reference/Legal Study entity**: `projects.legalStudy` relation,
  written via `POST projects/{caseId}/legalStudy:add`.
- **Case↔specific folder**: `caseLegalStudyLinks:create`, payload
  `{ caseId, targetFolderId, folderName, caseName }`.
- **Scoped access grant**: existing `folderManagers`/`folderMembers` tables
  (`folderId`, `lawyerId`, `role`), written directly against the **target
  folder's own id** (which will now be a level-2 folder, not necessarily the
  Case root) instead of a new table.

## 4. Permission model change

### 4.1 New concept: permission-bearing folder

A folder is "permission-bearing" if it is:
- **Level 1** — a Case's own root folder (existing `isCaseRootFolder` check), or
- **Level 2** — a direct child of a Case root folder.

No folder at level 3 or deeper is ever permission-bearing; it always
inherits from the nearest permission-bearing ancestor.

### 4.2 New resolution algorithm

Replaces the current "walk to absolute root, always" behavior in
`resolveFolderTreeRoot` / `getFolderPermissions` / `getVisibleFolderIds`:

1. From the folder being checked, walk up to find its level-2 ancestor
   (the child of the Case root that contains it), if any.
2. If that level-2 folder has explicit `folderManagers`/`folderMembers`
   rows (non-empty), resolve permission against **that folder** — stop
   here, do not continue to the Case root.
3. Otherwise, fall back to the Case root (level 1), exactly as today.

Folders/Cases where no level-2 folder has ever had explicit rows set behave
identically to today — this is purely additive and backward compatible.

**Constraint:** because only level-1 and level-2 folders can carry their own
grant, the folder-tree picker in the link-creation flow (§5.2) only allows
picking a level-1 (Case root) or level-2 (direct child of Case root) folder
as the link target — never a level-3+ subfolder. Linking a level-3+ folder
would leave the "grant access" step (§4.4) writing to a folder that can
never resolve its own permission, silently falling back to the target
Case's root and defeating the point of scoping. This matches the practical
use case anyway — the folders meant to be linked ("Legal Study", "LSC &
Related", etc.) are exactly the fixed level-2 template folders.

### 4.3 `isFolderTreeRoot` / "Permissions" action

The gate for showing the "Permissions" context-menu action is relaxed from
"folder is the absolute root" to "folder is level 1 OR level 2". This lets a
Case Manager open Permissions directly on a folder like "Legal Study" and
set members there without affecting the Case root.

### 4.4 Cross-case write for links

When a Case↔folder link is created, the linking Case's Manager may add
members directly to the **target folder's** `folderManagers`/`folderMembers`
(a cross-case write — the target folder belongs to a different Case's tree).
This is intentionally allowed without requiring the target Case's own
Manager role, matching the existing precedent that link creation itself
(`caseLegalStudyLinks`) is a unilateral action by the linking Case. The
member picker for this step is restricted to the linking Case's own current
team (its root folder's `folderManagers`/`folderMembers`), not the full
company lawyer directory, to avoid granting access to unrelated people.

## 5. UI / UX

### 5.1 "Link" button

A new "Link" button appears in `CaseDocument.js`'s toolbar, visible only
when `activeSpace === "cases"` (browsing the current Case's own document
tree — not "Linked Cases", "Legal Study" link space, Trash, Recent, etc.).
It is distinct from the existing "Link Reference Case" modal/button, which
is unrelated and untouched.

### 5.2 Link modal

Clicking "Link" opens a new modal with three tabs, one per link kind (§3):

- **Case**: pick one or more active Cases to link (writes `caseReferences`).
- **Reference / Legal Study**: pick one or more Reference/Legal Study
  entities to link (writes `legalStudy`).
- **Folder**: pick a target Case, then browse its folder tree (adapted
  `DirectoryTree` picker from `LegalReferenceWorkspace.js`) to pick one
  folder to link (writes `caseLegalStudyLinks`). The tree only allows
  selecting the Case root or one of its direct child folders (§4.2
  constraint) — deeper subfolders are shown for context but not selectable.
  Immediately after creating the link, an inline "grant access" step lets
  the current Case's Manager pick members (from the current Case's own
  team, §4.4) and a role tier to grant on the target folder.

### 5.3 Viewing linked content

No changes needed — the existing "Linked Cases" and "Legal Study" sidebar
sections already read from the same `caseReferences`/`legalStudy`/
`caseLegalStudyLinks` sources this modal writes to, so newly created links
appear there automatically.

## 6. Open questions / follow-ups (not blocking this design)

- Whether `Library.js` should later receive the same level-2 permission
  resolution change, to keep the two files' folder-permission behavior in
  sync (currently deferred — tracked as a separate future task).
- Whether the linked-to Case's Manager should get any read-only visibility
  of which other Cases have linked into their folders (raised during
  brainstorming, not required for this design to ship).
