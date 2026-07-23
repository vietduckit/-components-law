# Task Drag-and-Drop Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag-and-drop reordering of tasks (within and across services) to `All Module/Task/TaskManagement.js`, persisted via a new `tasks.taskIndex` field the user has already added to the Nocobase `tasks` collection.

**Architecture:** All changes are inside one file, `All Module/Task/TaskManagement.js` (~17,600 lines). Work proceeds additive-first: fetch/sort support, then a standalone reorder handler, then prop-threading, then the actual drag/drop DOM wiring last (the only step that touches currently-live, already-rendered UI).

**Tech Stack:** React (`ctx.React`, used via `React.createElement`, not JSX, matching this file's existing convention — do NOT introduce JSX), `ctx.api.request()` / the existing `apiReq()` helper.

## Global Constraints

- Nocobase JS blocks stay in exactly one file — no `import`/`require` of local modules (see `CLAUDE.md`).
- No `fetch()` — only `ctx.api.request()`.
- This file uses `React.createElement(...)` throughout, not JSX — all new code must match this style exactly, not introduce JSX syntax.
- No automated test runner in this repo. Verification is a Babel-parser syntax check (command below) plus manual reasoning trace, since this file only truly runs inside Nocobase.
- `tasks.taskIndex` (integer, nullable) already exists on the live Nocobase `tasks` collection — the user added it before this plan was written. Do not add any schema/collection changes yourself.
- `previousTaskId` is an unrelated "blocked by" dependency field (label "Pending Issue") — do not confuse it with ordering, and do not touch its existing logic.
- Reindexing convention: always reassign sequential integers (1, 2, 3…) to all tasks in an affected service group on drop — do not use a "value between two neighbors" scheme (avoids precision exhaustion after repeated drags), matching the `reindexFolderFiles` convention already used for documents/folders in `Library.js` (a different file, referenced here only as the established pattern to follow, not to be imported).

Babel syntax-check command (run after every task, from repo root):
```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('All Module/Task/TaskManagement.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```

---

## Task 1: Fetch layer — `taskIndex` field + optional sort support

**Files:**
- Modify: `All Module/Task/TaskManagement.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `fetchAll(url, fields, filter, sort)` — a new, optional 4th parameter, backward-compatible with every existing call site (all of which currently pass only 2-3 args and must keep working unchanged). The `tasks:list` call in `reload()` now requests `taskIndex` and sorts by it.

This task only changes what data comes back and in what order — it does not touch any rendering code, so the app's visible behavior is identical to today except that task order now reflects `taskIndex`/`id` instead of whatever the database's default order happened to be (which was already unspecified/arbitrary, so this is not a regression of any defined behavior).

- [ ] **Step 1: Add optional `sort` support to `fetchAll`**

Grep for `async function fetchAll(url, fields, filter) {` (currently lines 838-848). It currently reads exactly:

```js
async function fetchAll(url, fields, filter) {
  try {
    const params = { pageSize: 500, page: 1 };
    if (fields) params.fields = fields;
    if (filter) params.filter = JSON.stringify(filter);
    const res = await ctx.api.request({ url, params });
    return res?.data?.data || [];
  } catch {
    return [];
  }
}
```

Replace with:

```js
async function fetchAll(url, fields, filter, sort) {
  try {
    const params = { pageSize: 500, page: 1 };
    if (fields) params.fields = fields;
    if (filter) params.filter = JSON.stringify(filter);
    if (sort) params.sort = sort;
    const res = await ctx.api.request({ url, params });
    return res?.data?.data || [];
  } catch {
    return [];
  }
}
```

Grep the whole file for `fetchAll(` afterward and confirm every OTHER call site still only passes 2-3 arguments (they will simply get `sort === undefined`, which the `if (sort)` guard correctly skips) — do not modify any other call site in this step.

- [ ] **Step 2: Add `taskIndex` to the tasks fetch fields and sort by it**

Grep for the `fetchAll(` call for `"tasks:list"` inside `reload()` (currently around line 16375-16379). It currently reads exactly:

```js
          fetchAll(
            "tasks:list",
            "id,title,status,updatedAt,priority,startDate,dueDate,closedDate,lawyerId,projectId,serviceId,description,estimatedDuration,workRate,isRequiredApproval,rejectionReason,approvedById,approvedAt,acceptedAt,previousTaskId,blockedReason,nextStepDescription,linkedUrl",
            { projectId: { $eq: safeProjectId } },
          ),
```

Replace with (adds `taskIndex` to the fields string, adds a 4th `sort` argument):

```js
          fetchAll(
            "tasks:list",
            "id,title,status,updatedAt,priority,startDate,dueDate,closedDate,lawyerId,projectId,serviceId,description,estimatedDuration,workRate,isRequiredApproval,rejectionReason,approvedById,approvedAt,acceptedAt,previousTaskId,blockedReason,nextStepDescription,linkedUrl,taskIndex",
            { projectId: { $eq: safeProjectId } },
            ["taskIndex", "id"],
          ),
```

- [ ] **Step 3: Verify the file still parses**

```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('All Module/Task/TaskManagement.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 4: Commit**

```bash
git add "All Module/Task/TaskManagement.js"
git commit -m "feat: fetch taskIndex and sort tasks by it in TaskManagement"
```

---

## Task 2: `handleReorderTask` — reindex + backfill + persist logic (not wired to any UI yet)

**Files:**
- Modify: `All Module/Task/TaskManagement.js`

**Interfaces:**
- Consumes: `tasks` (state array, already in scope in the top-level component), `setTasks` (state setter, already in scope), `apiReq` (existing helper, `apiReq(url, method, data)`), `extractId` (existing helper), `reload` (existing async function defined earlier in the same component scope, line ~16343 — called after persistence, on both success and failure, to resync with server state).
- Produces: `handleReorderTask(draggedTaskId, targetTaskId, targetServiceKey, dropPosition)` — a new `useCallback` in the SAME top-level component scope as the existing `handleStatus`/`handleDetailUpdate` (around line 16566-16887). Not called from anywhere yet — this task only defines it.

This task is purely additive: a new function added to a scope that already holds `tasks`/`setTasks`/`apiReq`, calling nothing new externally. Nothing existing is modified, so there is no risk to current behavior — verify this by grepping for the function name afterward and confirming it has zero call sites (expected, until Task 3/4 wire it up).

- [ ] **Step 1: Locate the insertion point**

Grep for `const handleDetailUpdate = useCallback((updated) => {` (currently line 16871). Read 20 lines of context to confirm this is the top-level component scope (it should be inside the same function as `reload`, `handleStatus`, and have `tasks`/`setTasks` available — confirm by checking that `setTasks` and `tasks` are referenced nearby, e.g. in the `handleStatus` you can see above it). Insert the new function directly after `handleDetailUpdate`'s closing `}, []);`.

- [ ] **Step 2: Add `handleReorderTask`**

```js
  const handleReorderTask = useCallback(
    async (draggedTaskId, targetTaskId, targetServiceKey, dropPosition) => {
      const draggedId = extractId(draggedTaskId);
      const targetId = extractId(targetTaskId);
      if (!draggedId || draggedId === targetId) return;

      const draggedTask = tasks.find((t) => extractId(t.id) === draggedId);
      if (!draggedTask) return;

      const groupKeyOf = (t) => (t.serviceId ? String(extractId(t.serviceId)) : "__none__");
      const sourceServiceKey = groupKeyOf(draggedTask);
      const isCrossService = sourceServiceKey !== targetServiceKey;

      // Build the target group's current order (excluding the dragged task if it
      // was already in this group), backfilling any missing taskIndex by current
      // display order (already taskIndex/id-sorted from the fetch layer) before
      // inserting the dragged task at the drop position.
      const targetGroupTasks = tasks
        .filter((t) => groupKeyOf(t) === targetServiceKey && extractId(t.id) !== draggedId)
        .slice();

      const targetIndex = targetGroupTasks.findIndex(
        (t) => extractId(t.id) === targetId,
      );
      const insertAt =
        targetIndex === -1
          ? targetGroupTasks.length
          : dropPosition === "before"
            ? targetIndex
            : targetIndex + 1;
      targetGroupTasks.splice(insertAt, 0, draggedTask);

      // Reindex the target group sequentially (1-based).
      const targetUpdates = targetGroupTasks
        .map((t, i) => ({ task: t, newIndex: i + 1 }))
        .filter(({ task, newIndex }) => Number(task.taskIndex) !== newIndex);

      // If moving across services, also reindex the source group (with the
      // dragged task removed) so it stays sequential.
      let sourceUpdates = [];
      if (isCrossService) {
        const sourceGroupTasks = tasks
          .filter((t) => groupKeyOf(t) === sourceServiceKey && extractId(t.id) !== draggedId)
          .slice();
        sourceUpdates = sourceGroupTasks
          .map((t, i) => ({ task: t, newIndex: i + 1 }))
          .filter(({ task, newIndex }) => Number(task.taskIndex) !== newIndex);
      }

      const newServiceIdForDragged = isCrossService
        ? targetServiceKey === "__none__"
          ? null
          : Number(targetServiceKey)
        : draggedTask.serviceId;

      // Optimistic UI update.
      const updatesById = new Map();
      targetUpdates.forEach(({ task, newIndex }) => updatesById.set(extractId(task.id), newIndex));
      sourceUpdates.forEach(({ task, newIndex }) => updatesById.set(extractId(task.id), newIndex));
      setTasks((prev) =>
        prev.map((t) => {
          const tid = extractId(t.id);
          if (tid === draggedId) {
            return {
              ...t,
              serviceId: newServiceIdForDragged,
              taskIndex: updatesById.has(tid) ? updatesById.get(tid) : t.taskIndex,
            };
          }
          if (updatesById.has(tid)) {
            return { ...t, taskIndex: updatesById.get(tid) };
          }
          return t;
        }),
      );

      // Persist. Fire the dragged task's own update (taskIndex + possibly
      // serviceId) plus every other task whose taskIndex actually changed.
      const draggedNewIndex = updatesById.has(draggedId) ? updatesById.get(draggedId) : draggedTask.taskIndex;
      const draggedPayload = { taskIndex: draggedNewIndex };
      if (isCrossService) draggedPayload.serviceId = newServiceIdForDragged;

      const requests = [
        apiReq(`tasks:update?filterByTk=${draggedId}`, "POST", draggedPayload),
        ...targetUpdates
          .filter(({ task }) => extractId(task.id) !== draggedId)
          .map(({ task, newIndex }) =>
            apiReq(`tasks:update?filterByTk=${extractId(task.id)}`, "POST", { taskIndex: newIndex }),
          ),
        ...sourceUpdates.map(({ task, newIndex }) =>
          apiReq(`tasks:update?filterByTk=${extractId(task.id)}`, "POST", { taskIndex: newIndex }),
        ),
      ];

      try {
        await Promise.all(requests);
      } catch (e) {
        console.error("[TaskManagement] reorder persist failed", e);
        message.error("Failed to save the new task order.");
      } finally {
        // Resync with the server regardless of outcome: on success this
        // picks up the sorted order via the Task 1 fetch/sort change; on
        // failure it discards the optimistic update above and restores
        // the last-persisted order.
        reload();
      }
    },
    [tasks, reload],
  );
```

- [ ] **Step 3: Verify the file still parses**

```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('All Module/Task/TaskManagement.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 4: Grep-verify this task is purely additive**

Run `grep -n "handleReorderTask"` over the file. Expected: exactly ONE match (the declaration you just added). If there's already a second match, something is wrong — report NEEDS_CONTEXT rather than guessing.

- [ ] **Step 5: Manual trace (no live Nocobase in this sandbox — static reasoning instead)**

Trace by hand and record in your report:
- 3 tasks in service A with `taskIndex` 1, 2, 3. Drag task #3 to drop "before" task #1 within the SAME service. Confirm the resulting `targetUpdates` reassigns: task #3 → 1, task #1 → 2, task #2 → 3 (only entries whose index actually changed are included — since ALL three changed here, all three should appear).
- 2 tasks in service A (`taskIndex` 1, 2) and 1 task in service B (`taskIndex` 1). Drag the service-A task with `taskIndex` 1 to drop "after" the service-B task. Confirm: `isCrossService` is true, `newServiceIdForDragged` resolves to service B's numeric id, `sourceUpdates` reindexes the remaining service-A task from 2 → 1, `targetUpdates` reindexes service B to have the dragged task at position 2.
- A task with `taskIndex: null` (never backfilled) participates in a same-service reorder alongside two tasks that already have `taskIndex` 1 and 2. Confirm the `.filter(({ task, newIndex }) => Number(task.taskIndex) !== newIndex)` comparison correctly treats `Number(null)` (which is `0`) as different from any real 1-based index, so the null-`taskIndex` task always gets included in the update batch (backfilled) the first time it takes part in a reorder in this group.

- [ ] **Step 6: Commit**

```bash
git add "All Module/Task/TaskManagement.js"
git commit -m "feat: add handleReorderTask reindex/backfill/persist logic (not yet wired to any UI)"
```

---

## Task 3: Thread `onReorderTask` prop through `ListView` → `ServiceSection` → `TaskRow`

**Files:**
- Modify: `All Module/Task/TaskManagement.js`

**Interfaces:**
- Consumes: `handleReorderTask` (Task 2).
- Produces: `ListView`, `ServiceSection`, and `TaskRow` all accept and forward a new `onReorderTask` prop (and `ServiceSection`/`TaskRow` also gain a `groupServiceKey` prop carrying the service group's key, including the `"__none__"` sentinel for ungrouped tasks). No drag/drop DOM behavior yet — this task is pure prop-threading, verified by the fact that `onReorderTask`/`groupServiceKey` are not read by any event handler until Task 4.

- [ ] **Step 1: Pass `onReorderTask` into `ListView` from its call site**

Grep for `React.createElement(ListView, {` (currently line 17168). It currently reads:

```js
          : React.createElement(ListView, {
            tasks,
            services,
            lawyers: assignableLawyers,
            expanded,
            toggleExpand,
            handleStatus,
            handleOpen,
            handleAssign,
            handleDetailUpdate,
            isManager,
            handleOpenAddSubModal,
            isAssigneeOnly,
            myLawyerId,
            showAddTask,
            setShowAddTask,
            onDeleteTask: handleDeleteTask,
          }),
```

Add `onReorderTask: handleReorderTask,` as a new line inside this object (anywhere in the list, e.g. right after `onDeleteTask: handleDeleteTask,`).

- [ ] **Step 2: Accept and forward the prop in `ListView`**

Grep for `const ListView = ({` (currently line 16211). Add `onReorderTask,` to its destructured parameter list (matching the style of the other props already there, e.g. right after `onDeleteTask,`).

Grep for `return React.createElement(ServiceSection, {` inside `ListView` (currently line 16291). Add two new lines to this object: `onReorderTask,` and `groupServiceKey: key,` (the `key` variable is already in scope in this `.map((key) => {...})` callback — it's the exact service-group key, including `"__none__"`).

- [ ] **Step 3: Accept and forward in `ServiceSection`**

Grep for `const ServiceSection = ({` (currently line 16072). Add `onReorderTask,` and `groupServiceKey,` to its destructured parameter list.

Grep for `React.createElement(TaskRow, {` inside `ServiceSection` (currently around line 16185-16205, inside the `tasks.map((t, index) => ...)` call). Add two new lines to the object passed to `TaskRow`: `onReorderTask,` and `groupServiceKey,`.

- [ ] **Step 4: Accept in `TaskRow`**

Grep for `const TaskRow = ({` (currently line 15249). Add `onReorderTask,` and `groupServiceKey,` to its destructured parameter list (matching the existing style, e.g. right after `onDeleteTask,`).

Do NOT reference these two new props anywhere in `TaskRow`'s body in this task — that's Task 4's job. This task only makes them available as props; the component doesn't use them yet.

- [ ] **Step 5: Verify the file still parses**

```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('All Module/Task/TaskManagement.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 6: Grep-verify the thread is complete and inert**

Grep for `onReorderTask` and `groupServiceKey` across the file. Expected: each name appears at every hop (call site → destructure → forward → call site → destructure → forward → call site → destructure), ending at `TaskRow`'s destructure with NO further usage inside `TaskRow`'s body (confirm this specifically — if either name is referenced inside `TaskRow`'s JSX/render body already, that would mean Task 4's work leaked into this task; it shouldn't be).

- [ ] **Step 7: Commit**

```bash
git add "All Module/Task/TaskManagement.js"
git commit -m "feat: thread onReorderTask/groupServiceKey props through ListView, ServiceSection, TaskRow"
```

---

## Task 4: Wire drag-and-drop DOM handlers into `TaskRow`

**Files:**
- Modify: `All Module/Task/TaskManagement.js`

**Interfaces:**
- Consumes: `onReorderTask`, `groupServiceKey` (Task 3), `task`, `extractId` (all pre-existing in `TaskRow`).
- Produces: `TaskRow`'s outer row `<div>` becomes draggable and a drop target, calling `onReorderTask(draggedId, task.id, groupServiceKey, dropPosition)` on drop.

This is the task that changes currently-live, already-rendered UI — the row `<div>` you're modifying already has `onMouseEnter`/`onMouseLeave` handlers and other behavior real users depend on today. Add to this object, do not replace it wholesale, and verify nothing existing was removed.

- [ ] **Step 1: Locate the exact current row div**

Grep for `const TaskRow = ({` (currently line 15249) and read forward to the `React.createElement("div", { style: { display: "flex", alignItems: "center", minHeight: 44, ...` block (currently lines 15319-15335). Confirm it currently reads exactly:

```js
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          minHeight: 44,
          borderBottom: expanded ? "none" : "1px solid #f0f0f0",
          background: serviceDeleted ? "#fafafa" : isBlocked ? "#fdf6ff" : hov ? "#f0f7ff" : "#fff",
          transition: "background 0.1s",
          borderLeft: serviceDeleted ? "3px solid #bfbfbf" : isBlocked ? "3px solid #722ed1" : "3px solid transparent",
          minWidth: 1420,
          width: "100%",
        },
        onMouseEnter: () => setHov(true),
        onMouseLeave: () => setHov(false),
      },
```

If it doesn't match exactly (e.g. a prior task shifted something unexpected), read more context and adapt carefully — do not force this exact string match if the real file differs; understand what actually changed and why before editing.

- [ ] **Step 2: Add drag state and handlers inside `TaskRow`**

Directly after the existing `const [hov, setHov] = useState(false);` line (near the top of `TaskRow`'s body, alongside the other `useState`/`useRef` declarations already there), add:

```js
  const [dragOverPos, setDragOverPos] = useState(null); // "before" | "after" | null
  const canDrag = !serviceDeleted && typeof onReorderTask === "function";
  const handleRowDragStart = (e) => {
    if (!canDrag) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ type: "task", id: extractId(task.id) }),
    );
  };
  const handleRowDragOver = (e) => {
    if (!canDrag) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY - rect.top < rect.height / 2 ? "before" : "after";
    setDragOverPos(pos);
    e.dataTransfer.dropEffect = "move";
  };
  const handleRowDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOverPos(null);
  };
  const handleRowDrop = (e) => {
    if (!canDrag) return;
    e.preventDefault();
    const pos = dragOverPos;
    setDragOverPos(null);
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    let payload = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    if (!payload || payload.type !== "task") return;
    onReorderTask(payload.id, extractId(task.id), groupServiceKey, pos || "before");
  };
```

- [ ] **Step 3: Add the drag/drop props and visual feedback to the existing row div**

Replace the row `<div>`'s props object (the exact block quoted in Step 1) with:

```js
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          minHeight: 44,
          borderBottom: expanded ? "none" : "1px solid #f0f0f0",
          background: serviceDeleted ? "#fafafa" : isBlocked ? "#fdf6ff" : hov ? "#f0f7ff" : "#fff",
          transition: "background 0.1s",
          borderLeft: serviceDeleted ? "3px solid #bfbfbf" : isBlocked ? "3px solid #722ed1" : "3px solid transparent",
          borderTop: dragOverPos === "before" ? "2px solid #1677ff" : "2px solid transparent",
          borderBottomWidth: dragOverPos === "after" ? 2 : undefined,
          borderBottomColor: dragOverPos === "after" ? "#1677ff" : undefined,
          minWidth: 1420,
          width: "100%",
          cursor: canDrag ? "grab" : undefined,
        },
        draggable: canDrag,
        onDragStart: handleRowDragStart,
        onDragOver: handleRowDragOver,
        onDragLeave: handleRowDragLeave,
        onDrop: handleRowDrop,
        onMouseEnter: () => setHov(true),
        onMouseLeave: () => setHov(false),
      },
```

Note: `borderBottom` (existing) and the new `borderBottomWidth`/`borderBottomColor` (drop-feedback) can both be present in a React inline-style object — when `dragOverPos !== "after"` the two new properties are `undefined` and have no effect, leaving `borderBottom`'s existing value in control. Do not delete the existing `borderBottom` line.

- [ ] **Step 4: Verify the file still parses**

```bash
node --input-type=module -e "import { readFileSync } from 'fs'; import { parse } from '@babel/parser'; const code = readFileSync('All Module/Task/TaskManagement.js','utf8'); parse(code, { sourceType: 'module', plugins: ['jsx','classProperties','optionalChaining','nullishCoalescingOperator'] }); console.log('OK');"
```
Expected output: `OK`

- [ ] **Step 5: Manual trace / static verification**

- Confirm `onMouseEnter`/`onMouseLeave` (pre-existing) are still present and unchanged in the props object.
- Confirm `serviceDeleted` rows (`canDrag === false`) render `draggable: false` and none of the new handlers do anything when called (each starts with `if (!canDrag) return;`).
- Confirm `handleRowDrop` reads `dragOverPos` (component state) rather than recomputing position from the drop event itself — trace that `dragOverPos` is guaranteed to have been set by a prior `handleRowDragOver` call before any `handleRowDrop` fires (true for real browser drag-and-drop, since `dragover` always fires continuously over a valid drop target before `drop` can fire).

- [ ] **Step 6: Commit**

```bash
git add "All Module/Task/TaskManagement.js"
git commit -m "feat: wire drag-and-drop handlers into TaskRow for task reordering"
```

---

## Task 5: Manual verification against a live Nocobase environment

**Files:** none (verification only)

No implementer subagent in this environment has access to a live Nocobase instance — this task's steps must be performed by a human in the real app. If dispatched as an implementer task, the subagent should instead read through the final drag-and-drop code path end-to-end (Steps 1-4 below reframed as a static trace) and report findings, then explicitly mark the live checks as outstanding rather than fabricating results.

- [ ] **Step 1: Same-service reorder** — Open a case with a service that has 3+ tasks. Drag a task to a new position within the same service. Confirm: the row moves immediately (optimistic update), the "STT" numbers update to reflect the new order, and after a page refresh the new order persists (confirms the `tasks:update` calls actually landed).

- [ ] **Step 2: Cross-service reorder** — Drag a task from one service section into another service section. Confirm: the task now appears under the target service (both visually and its `serviceId` truly changed — check by refreshing), and both the source and target service's remaining tasks still show sequential, non-duplicated STT numbers.

- [ ] **Step 3: Legacy tasks without `taskIndex`** — Find a case whose tasks predate this feature (all `taskIndex` null). Confirm the first drag-and-drop in that service correctly backfills sequential order for every task in the group, not just the two involved in the drag.

- [ ] **Step 4: Regression check** — Confirm existing task actions (status change, assign, open detail, delete, add sub-task) still work normally after this change — these all live on the same `TaskRow`/`ServiceSection` this plan modified.
