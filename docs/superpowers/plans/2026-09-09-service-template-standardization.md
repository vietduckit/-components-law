# Service Template Standardization ("Save as template" / "Override") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Save as template" and "Override existing template" actions to each service group in `TaskManagement.js`'s Task Management tab, so a lawyer can turn the real tasks currently under a case's service into a reusable (or updated) `services`/`projectTemplates` catalog entry.

**Architecture:** All changes live in one file, `All Module/Task/TaskManagement.js` (single-file JS Block — no other file is touched). `ProjectTasksTab` gains a `serviceCatalog` fetch and a `templateAction` piece of state; `ListView`/`ServiceSection` are threaded with the extra data needed (the case's own `projectServices` row per group, the catalog list) and a new per-service "⋮" action menu (built as a plain self-positioned div, matching `TaskRow`'s existing per-task menu — this file imports no antd `Dropdown`/`Menu`). Two new modal components, `SaveAsTemplateModal` and `OverrideTemplateModal`, do the actual catalog writes.

**Tech Stack:** React (via `ctx.React`), antd (via `ctx.antd`: `Modal`, `Input`, `Select`, `Button`, `Tooltip`, `Typography`), NocoBase REST API (via `ctx.api.request` / this file's own `apiReq`/`fetchAll` helpers).

**Spec:** `docs/superpowers/specs/2026-09-09-service-template-standardization-design.md`

## Global Constraints

- Only `All Module/Task/TaskManagement.js` is touched — not `CaseServices.js`, `companyServices`, `serviceCombos`, or the variable-config feature.
- "Save as template" creates a **new** `services` row; "Override" writes into an **existing**, user-picked `services`' `projectTemplates`.
- "Save as template" name-collision check reuses this project's established `normalizeSearch`/`serviceNameKey` pattern (`ContractCreateForm.js:3248-3252`/`5595-5596`), duplicated locally into this file (per this session's established per-file-duplication convention — no shared-lib import).
- Override reconciles **by position, in place** (update matched pairs, create surplus tasks, delete surplus old templates) — **never** delete-then-recreate. This is load-bearing: `documents.sourceProjectTemplateId` (already-shipped variable-config feature) points at a `projectTemplates.id`; deleting and recreating would orphan that reference for every already-generated document in other cases using this service.
- No file/`variableConfig` carry-over: `variableConfig`, `fileAttachment`, `templateFileId` are left null on create and untouched on update.
- No automatic due-date offset: `quantity`/`duration` are left null on create and untouched on update.
- No dependency chain: `previousTaskId` is left null on create and untouched on update.
- No commercial-field sync on Override: only `projectTemplates` rows are touched; the target `services` row's own `serviceName`/`serviceType`/`basePrice`/`description` are never modified by Override.
- Field mapping (`tasks` → `projectTemplates`, both create and the matched-pair case of update): `title→templateName`, `description→description`, `priority→priority`, current display position→`sortOrder`.

---

## Task 1: Service catalog fetch + case-service data threading

**Files:**
- Modify: `All Module/Task/TaskManagement.js`

**Interfaces:**
- Produces: top-level helpers `normalizeSearch(value)`, `serviceNameKey(value)`, `sortTasksByDisplayOrder(list)` (all consumed by Task 2 and Task 3). Produces `ServiceSection` props `ps` (the case's own `projectServices` row for this group, or `null`) and `serviceCatalog` (the full catalog `services` array) — consumed by Task 2's menu.

This task is pure data plumbing: it changes what data reaches `ServiceSection`, but adds no new visible UI. Existing behavior must be pixel-identical after this task.

- [x] **Step 1: Add shared helpers next to `getProjectServiceTaskKey`**

Find (around line 360):

```js
const isTaskServiceDeleted = (item = {}) => !!item?._serviceDeleted;
```

Replace with:

```js
const isTaskServiceDeleted = (item = {}) => !!item?._serviceDeleted;

// Reused as-is from ContractCreateForm.js:3248-3252/5595-5596 (this project's
// established name-collision-check pattern) — duplicated locally per this
// project's single-file JS Block convention, not imported from a shared lib.
const normalizeSearch = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const serviceNameKey = (value) =>
  normalizeSearch(value).replace(/\s+/g, " ").trim();

// Same taskIndex-based ordering ServiceSection already uses to interleave
// tasks/meetings for display (see the .sort(...) inside ServiceSection's
// render) — reused so "Save as template"/"Override" capture sortOrder in
// the same order the lawyer actually sees on screen.
const sortTasksByDisplayOrder = (list) =>
  list.slice().sort((a, b) => {
    const ai = Number.isFinite(Number(a.taskIndex))
      ? Number(a.taskIndex)
      : Infinity;
    const bi = Number.isFinite(Number(b.taskIndex))
      ? Number(b.taskIndex)
      : Infinity;
    if (ai !== bi) return ai - bi;
    return String(a.id).localeCompare(String(b.id));
  });
```

- [x] **Step 2: Add `serviceCatalog` state to `ProjectTasksTab`**

Find:

```js
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
```

Replace with:

```js
  const [services, setServices] = useState([]);
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
```

- [x] **Step 3: Fetch the catalog in `reload()`**

Find:

```js
      const [allTasks, allSubs, allLawyers, allServices, allMeetings, user] =
        await Promise.all([
```

Replace with:

```js
      const [
        allTasks,
        allSubs,
        allLawyers,
        allServices,
        allMeetings,
        user,
        allServiceCatalog,
      ] = await Promise.all([
```

Then find (the last entry in that same `Promise.all([...])` array):

```js
          getCurrentUser(),
        ]);
```

Replace with:

```js
          getCurrentUser(),
          fetchAll(
            "services:list",
            "id,serviceName,serviceType,description,basePrice",
          ),
        ]);
```

- [x] **Step 4: Store the fetched catalog**

Find:

```js
      setLawyers(allLawyers);
      setServices(allServices);
      setMeetings(enrichedMeetings);
      setCurrentUser(user);
```

Replace with:

```js
      setLawyers(allLawyers);
      setServices(allServices);
      setServiceCatalog(allServiceCatalog);
      setMeetings(enrichedMeetings);
      setCurrentUser(user);
```

- [x] **Step 5: Thread `serviceCatalog` + build `psByKeyMap` in `ListView`**

Find:

```js
const ListView = ({
  tasks,
  meetings = [],
  services,
  lawyers,
  expanded,
  toggleExpand,
  handleStatus,
  handleOpen,
  handleOpenMeeting,
  handleAssign,
  isManager,
  handleOpenAddSubModal,
  isAssigneeOnly,
  myLawyerId,
  showAddTask,
  setShowAddTask,
  onDeleteTask,
  onReorderTask,
}) => {
```

Replace with:

```js
const ListView = ({
  tasks,
  meetings = [],
  services,
  serviceCatalog,
  lawyers,
  expanded,
  toggleExpand,
  handleStatus,
  handleOpen,
  handleOpenMeeting,
  handleAssign,
  isManager,
  handleOpenAddSubModal,
  isAssigneeOnly,
  myLawyerId,
  showAddTask,
  setShowAddTask,
  onDeleteTask,
  onReorderTask,
}) => {
```

Find:

```js
  const serviceMap = {};
  const serviceDeletedMap = {};
  services.forEach((ps) => {
    const key = getProjectServiceTaskKey(ps);
    const deleted = isDeletedServiceRecord(ps);
    serviceMap[key] = ps.serviceName || `Service #${ps.id}`;
    serviceDeletedMap[key] = deleted;
  });
```

Replace with:

```js
  const serviceMap = {};
  const serviceDeletedMap = {};
  const psByKeyMap = {};
  services.forEach((ps) => {
    const key = getProjectServiceTaskKey(ps);
    const deleted = isDeletedServiceRecord(ps);
    serviceMap[key] = ps.serviceName || `Service #${ps.id}`;
    serviceDeletedMap[key] = deleted;
    psByKeyMap[key] = ps;
  });
```

Find:

```js
        serviceDeleted: !!serviceDeletedMap[key],
        onDeleteTask,
        onReorderTask,
        groupServiceKey: key,
      });
```

Replace with:

```js
        serviceDeleted: !!serviceDeletedMap[key],
        onDeleteTask,
        onReorderTask,
        groupServiceKey: key,
        ps: psByKeyMap[key] || null,
        serviceCatalog,
      });
```

- [x] **Step 6: Accept the new props on `ServiceSection` (unused for now)**

Find:

```js
const ServiceSection = ({
  serviceId,
  serviceName,
  tasks,
  meetings = [],
  lawyers,
  expanded,
  onToggle,
  onStatus,
  onOpen,
  onOpenMeeting,
  onAssign,
  isManager,
  onOpenAddSubModal,
  colorCfg,
  allTasksInProject,
  isAssigneeOnly = false,
  myLawyerId = null,
  onDeleteTask,
  serviceDeleted = false,
  onReorderTask,
  groupServiceKey,
}) => {
```

Replace with:

```js
const ServiceSection = ({
  serviceId,
  serviceName,
  tasks,
  meetings = [],
  lawyers,
  expanded,
  onToggle,
  onStatus,
  onOpen,
  onOpenMeeting,
  onAssign,
  isManager,
  onOpenAddSubModal,
  colorCfg,
  allTasksInProject,
  isAssigneeOnly = false,
  myLawyerId = null,
  onDeleteTask,
  serviceDeleted = false,
  onReorderTask,
  groupServiceKey,
  ps = null,
  serviceCatalog = [],
}) => {
```

- [x] **Step 7: Thread `serviceCatalog` through the `ProjectTasksTab` → `ListView` call site**

Find:

```js
          : React.createElement(ListView, {
              tasks,
              meetings,
              services,
              lawyers: assignableLawyers,
```

Replace with:

```js
          : React.createElement(ListView, {
              tasks,
              meetings,
              services,
              serviceCatalog,
              lawyers: assignableLawyers,
```

- [ ] **Step 8: Verify no regression**

Reload the Task Management tab for a case with at least one service group. Confirm: task list renders identically to before (grouping, collapse/expand, done counters, drag-reorder all unchanged), no new console errors. As a quick sanity check that the plumbing actually works, temporarily add `console.log("ps", ps, "catalog", serviceCatalog.length)` as the first line inside `ServiceSection`'s body, reload, confirm in devtools that a normal (catalog-linked or custom) service group logs a non-null `ps` and a populated `serviceCatalog` array, then remove the `console.log`.

- [ ] **Step 9: Commit**

```bash
git add "All Module/Task/TaskManagement.js"
git commit -m "feat(task-management): thread service catalog + case-service data into ServiceSection"
```

---

## Task 2: Per-service action menu + "Save as template"

**Files:**
- Modify: `All Module/Task/TaskManagement.js`

**Interfaces:**
- Consumes: `normalizeSearch`, `serviceNameKey`, `sortTasksByDisplayOrder` (Task 1), `ServiceSection` props `ps`/`serviceCatalog` (Task 1).
- Produces: `ServiceSection` prop `onOpenTemplateAction(payload)` where `payload` is `{ mode: "save" | "override", serviceName, tasks, ps }`. Produces `ProjectTasksTab` state `templateAction` (same shape or `null`) and setter `setTemplateAction`, and the `SaveAsTemplateModal` component — both consumed by Task 3 (which adds the `mode === "override"` counterpart).

After this task, clicking "Save as template" is a complete, working flow. Clicking "Override existing template" sets state but nothing visibly happens yet (Task 3 adds the modal that reads it) — this is expected and resolved by the end of Task 3.

- [x] **Step 1: Add the action-menu state and disabled/tooltip logic to `ServiceSection`**

Find:

```js
  const [collapsed, setCollapsed] = useState(serviceDeleted);
  const doneCnt = tasks.filter((t) => t.status === "done").length;
  const totalCnt = tasks.length;
  const isCollapsed = serviceDeleted || collapsed;
```

Replace with:

```js
  const [collapsed, setCollapsed] = useState(serviceDeleted);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const doneCnt = tasks.filter((t) => t.status === "done").length;
  const totalCnt = tasks.length;
  const isCollapsed = serviceDeleted || collapsed;
  const hasNoTasks = tasks.length === 0;
  // ps is null for the "__none__" bucket (tasks with no serviceId) and for
  // orphaned/stale keys (ListView's extraKeys — a task's serviceId that no
  // longer matches any current projectServices row). Neither "Save as
  // template" nor "Override" has a well-defined case-service to read
  // from/represent in that state, so both stay disabled there, same as the
  // existing zero-tasks rule.
  const actionsDisabled = hasNoTasks || !ps;
  const actionDisabledReason = hasNoTasks
    ? "No tasks to save as template"
    : !ps
      ? "This group is not linked to a case service"
      : "";
```

- [x] **Step 2: Accept `onOpenTemplateAction` on `ServiceSection`**

Find (this is the result of Task 1's Step 6 edit):

```js
  ps = null,
  serviceCatalog = [],
}) => {
```

Replace with:

```js
  ps = null,
  serviceCatalog = [],
  onOpenTemplateAction,
}) => {
```

- [x] **Step 3: Render the "⋮" action menu in the header**

Find:

```js
      meetings.length > 0 &&
        React.createElement(
          "span",
          { style: { fontSize: 12, marginLeft: 10 } },
          `📅 ${meetings.length}`,
        ),
    ),
```

Replace with:

```js
      meetings.length > 0 &&
        React.createElement(
          "span",
          { style: { fontSize: 12, marginLeft: 10 } },
          `📅 ${meetings.length}`,
        ),
      !serviceDeleted &&
        React.createElement(
          "div",
          {
            style: { position: "relative", marginLeft: 10 },
            onClick: (e) => e.stopPropagation(),
          },
          React.createElement(
            "div",
            {
              onMouseDown: (e) => {
                e.preventDefault();
                e.stopPropagation();
              },
              onClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                setActionMenuOpen((v) => !v);
              },
              title: "Service actions",
              style: {
                width: 22,
                height: 22,
                borderRadius: 4,
                background: actionMenuOpen ? "#e6f4ff" : "transparent",
                border: actionMenuOpen
                  ? "1px solid #91caff"
                  : "1px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 12,
                color: actionMenuOpen ? "#096dd9" : colorCfg.text,
                fontWeight: 700,
                userSelect: "none",
              },
            },
            "⋮",
          ),
          actionMenuOpen &&
            React.createElement(
              "div",
              {
                style: {
                  position: "absolute",
                  right: 0,
                  top: 28,
                  zIndex: 9999,
                  background: "#fff",
                  border: "1px solid #e8e8e8",
                  borderRadius: 6,
                  boxShadow: "0 6px 20px rgba(0,0,0,0.14)",
                  minWidth: 220,
                  padding: "4px 0",
                },
                onMouseDown: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                },
                onClick: (e) => e.stopPropagation(),
              },
              React.createElement(
                Tooltip,
                { title: actionDisabledReason },
                React.createElement(
                  "div",
                  {
                    onClick: (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (actionsDisabled) return;
                      setActionMenuOpen(false);
                      onOpenTemplateAction({
                        mode: "save",
                        serviceName,
                        tasks,
                        ps,
                      });
                    },
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      cursor: actionsDisabled ? "not-allowed" : "pointer",
                      fontSize: 12,
                      fontFamily: FONT,
                      color: actionsDisabled ? "#bfbfbf" : "#262626",
                    },
                    onMouseEnter: (e) => {
                      if (!actionsDisabled)
                        e.currentTarget.style.background = "#f5f5f5";
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.background = "transparent";
                    },
                  },
                  React.createElement("span", null, "📋"),
                  "Save as template",
                ),
              ),
              React.createElement(
                Tooltip,
                { title: actionDisabledReason },
                React.createElement(
                  "div",
                  {
                    onClick: (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (actionsDisabled) return;
                      setActionMenuOpen(false);
                      onOpenTemplateAction({
                        mode: "override",
                        serviceName,
                        tasks,
                        ps,
                      });
                    },
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      cursor: actionsDisabled ? "not-allowed" : "pointer",
                      fontSize: 12,
                      fontFamily: FONT,
                      color: actionsDisabled ? "#bfbfbf" : "#262626",
                    },
                    onMouseEnter: (e) => {
                      if (!actionsDisabled)
                        e.currentTarget.style.background = "#f5f5f5";
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.background = "transparent";
                    },
                  },
                  React.createElement("span", null, "🔁"),
                  "Override existing template",
                ),
              ),
            ),
        ),
    ),
```

- [x] **Step 4: Thread `onOpenTemplateAction` through `ListView`**

Find (result of Task 1's Step 5 edit):

```js
const ListView = ({
  tasks,
  meetings = [],
  services,
  serviceCatalog,
  lawyers,
  expanded,
  toggleExpand,
  handleStatus,
  handleOpen,
  handleOpenMeeting,
  handleAssign,
  isManager,
  handleOpenAddSubModal,
  isAssigneeOnly,
  myLawyerId,
  showAddTask,
  setShowAddTask,
  onDeleteTask,
  onReorderTask,
}) => {
```

Replace with:

```js
const ListView = ({
  tasks,
  meetings = [],
  services,
  serviceCatalog,
  lawyers,
  expanded,
  toggleExpand,
  handleStatus,
  handleOpen,
  handleOpenMeeting,
  handleAssign,
  isManager,
  handleOpenAddSubModal,
  isAssigneeOnly,
  myLawyerId,
  showAddTask,
  setShowAddTask,
  onDeleteTask,
  onReorderTask,
  onOpenTemplateAction,
}) => {
```

Find (result of Task 1's Step 5 edit):

```js
        groupServiceKey: key,
        ps: psByKeyMap[key] || null,
        serviceCatalog,
      });
```

Replace with:

```js
        groupServiceKey: key,
        ps: psByKeyMap[key] || null,
        serviceCatalog,
        onOpenTemplateAction,
      });
```

- [x] **Step 5: Add `templateAction` state to `ProjectTasksTab` and thread the callback down**

Find (result of Task 1's Step 2 edit):

```js
  const [services, setServices] = useState([]);
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
```

Replace with:

```js
  const [services, setServices] = useState([]);
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [templateAction, setTemplateAction] = useState(null);
  const [loading, setLoading] = useState(true);
```

Find (result of Task 1's Step 7 edit):

```js
          : React.createElement(ListView, {
              tasks,
              meetings,
              services,
              serviceCatalog,
              lawyers: assignableLawyers,
              expanded,
              toggleExpand,
              handleStatus,
              handleOpen,
              handleOpenMeeting,
              handleAssign,
              isManager,
              handleOpenAddSubModal,
              isAssigneeOnly,
              myLawyerId,
              showAddTask,
              setShowAddTask,
              onDeleteTask: handleDeleteTask,
              onReorderTask: handleReorderTask,
            }),
```

Replace with:

```js
          : React.createElement(ListView, {
              tasks,
              meetings,
              services,
              serviceCatalog,
              lawyers: assignableLawyers,
              expanded,
              toggleExpand,
              handleStatus,
              handleOpen,
              handleOpenMeeting,
              handleAssign,
              isManager,
              handleOpenAddSubModal,
              isAssigneeOnly,
              myLawyerId,
              showAddTask,
              setShowAddTask,
              onDeleteTask: handleDeleteTask,
              onReorderTask: handleReorderTask,
              onOpenTemplateAction: setTemplateAction,
            }),
```

- [x] **Step 6: Define `SaveAsTemplateModal`**

Find:

```js
// ============================================================
// §10 MAIN — ProjectTasksTab + ctx.render()
// ============================================================
const ProjectTasksTab = () => {
```

Replace with:

```js
// ============================================================
// §9b TEMPLATE ACTION MODALS — Save as template / Override
// ============================================================
const SaveAsTemplateModal = ({
  open,
  serviceName,
  tasks,
  ps,
  serviceCatalog,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState(serviceName || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName(serviceName || "");
  }, [open, serviceName]);

  const trimmedName = name.trim();
  const normalizedName = serviceNameKey(trimmedName);
  const duplicate =
    normalizedName &&
    serviceCatalog.find(
      (svc) => serviceNameKey(svc.serviceName) === normalizedName,
    );

  const handleSave = async () => {
    if (!trimmedName || duplicate) return;
    setSaving(true);
    try {
      const createdService = await apiReq("services:create", "POST", {
        serviceName: trimmedName,
        serviceType: ps?.serviceType || null,
        description: ps?.description || null,
        basePrice: ps?.basePrice ?? null,
      });
      const newServiceId = createdService?.data?.data?.id;
      if (!newServiceId) throw new Error("services:create returned no id");
      const sortedTasks = sortTasksByDisplayOrder(tasks);
      await Promise.all(
        sortedTasks.map((t, index) =>
          apiReq("projectTemplates:create", "POST", {
            templateName: t.title,
            description: t.description || null,
            priority: t.priority || null,
            sortOrder: index,
            serviceId: newServiceId,
          }),
        ),
      );
      message.success(`✅ Saved "${trimmedName}" as a new standardized service`);
      onSaved();
    } catch (e) {
      console.error(e);
      message.error("Failed to save as template");
    }
    setSaving(false);
  };

  return React.createElement(
    Modal,
    {
      open,
      onCancel: onClose,
      onOk: handleSave,
      confirmLoading: saving,
      okText: saving ? "Saving..." : "Save",
      cancelText: "Cancel",
      okButtonProps: {
        style: TASK_DS.primaryButton,
        disabled: !trimmedName || !!duplicate,
      },
      cancelButtonProps: { style: TASK_DS.secondaryButton },
      title: React.createElement(
        Text,
        { strong: true, style: { fontSize: 15, fontFamily: FONT } },
        "Save as template",
      ),
    },
    React.createElement(
      "div",
      { style: { fontFamily: FONT } },
      React.createElement(
        "div",
        { style: { marginBottom: 6, fontSize: 12, color: "#595959" } },
        "New service name",
      ),
      React.createElement(Input, {
        value: name,
        onChange: (e) => setName(e.target.value),
        placeholder: "Enter a name for the new standardized service",
      }),
      duplicate &&
        React.createElement(
          "div",
          { style: { marginTop: 6, fontSize: 12, color: "#cf1322" } },
          'This name already exists in the catalog. Rename it, or use "Override" instead if you want to update that service.',
        ),
      React.createElement(
        "div",
        { style: { marginTop: 12, fontSize: 12, color: "#8c8c8c" } },
        `${tasks.length} task${tasks.length === 1 ? "" : "s"} will be copied into this template.`,
      ),
    ),
  );
};

// ============================================================
// §10 MAIN — ProjectTasksTab + ctx.render()
// ============================================================
const ProjectTasksTab = () => {
```

- [x] **Step 7: Render `SaveAsTemplateModal` from `ProjectTasksTab`**

Find:

```js
    /* ── Add SubTask Modal (placeholder) ── */
    showAddSub &&
      addSubForTaskId != null &&
      React.createElement(AddSubtaskModal, {
        key: `submodal-${addSubForTaskId}`,
        open: showAddSub,
        parentTaskId: addSubForTaskId,
        lawyers: assignableLawyers,
        currentUser: currentUser,
        onSave: () => {
          reload();
        },
        onClose: () => {
          setShowAddSub(false);
          setAddSubForTaskId(null);
        },
      }),
  );
};
```

Replace with:

```js
    /* ── Add SubTask Modal (placeholder) ── */
    showAddSub &&
      addSubForTaskId != null &&
      React.createElement(AddSubtaskModal, {
        key: `submodal-${addSubForTaskId}`,
        open: showAddSub,
        parentTaskId: addSubForTaskId,
        lawyers: assignableLawyers,
        currentUser: currentUser,
        onSave: () => {
          reload();
        },
        onClose: () => {
          setShowAddSub(false);
          setAddSubForTaskId(null);
        },
      }),

    /* ── Save as Template Modal ── */
    templateAction?.mode === "save" &&
      React.createElement(SaveAsTemplateModal, {
        open: true,
        serviceName: templateAction.serviceName,
        tasks: templateAction.tasks,
        ps: templateAction.ps,
        serviceCatalog,
        onClose: () => setTemplateAction(null),
        onSaved: () => {
          setTemplateAction(null);
          reload();
        },
      }),
  );
};
```

- [ ] **Step 8: Manually verify**

Reload the Task Management tab.
1. A service group with 2+ real tasks → the "⋮" button appears in its header, next to the done counter. Opening it shows both items enabled (no tooltip on hover).
2. A service group with zero tasks → both items show disabled (greyed) with tooltip "No tasks to save as template".
3. Click "Save as template" on a normal group → modal opens pre-filled with the group's current display name. Type a name that already exists in the catalog (try a different case/diacritic, e.g. if the catalog has "Tư vấn", try "tu van") → inline error appears, Save button disabled.
4. Type a unique name → Save. Confirm success toast, modal closes. In the Admin UI, open Settings → Task Template (or query `services`/`projectTemplates` directly), confirm: one new `services` row with the right `serviceType`/`description`/`basePrice`; one `projectTemplates` row per real task in that group with correct `templateName`/`description`/`priority`/`sortOrder`; `quantity`/`duration`/`previousTaskId`/`variableConfig` all null.
5. Click "Override existing template" on a normal group → confirm nothing crashes and nothing visibly opens yet (expected at this point in the plan — Task 3 completes this flow).

- [ ] **Step 9: Commit**

```bash
git add "All Module/Task/TaskManagement.js"
git commit -m "feat(task-management): add per-service action menu and Save as template"
```

---

## Task 3: "Override existing template"

**Files:**
- Modify: `All Module/Task/TaskManagement.js`

**Interfaces:**
- Consumes: `sortTasksByDisplayOrder` (Task 1), `fetchAll`/`apiReq` (pre-existing file helpers), `templateAction`/`setTemplateAction`/`serviceCatalog` (Task 2).
- Produces: `OverrideTemplateModal` component, wired into `ProjectTasksTab`'s render for `templateAction?.mode === "override"`.

- [x] **Step 1: Define `OverrideTemplateModal`**

Find (this is the result of Task 2's Step 6 edit — the `SaveAsTemplateModal` component's closing brace, right before the `§10 MAIN` section comment):

```js
      React.createElement(
        "div",
        { style: { marginTop: 12, fontSize: 12, color: "#8c8c8c" } },
        `${tasks.length} task${tasks.length === 1 ? "" : "s"} will be copied into this template.`,
      ),
    ),
  );
};

// ============================================================
// §10 MAIN — ProjectTasksTab + ctx.render()
// ============================================================
const ProjectTasksTab = () => {
```

Replace with:

```js
      React.createElement(
        "div",
        { style: { marginTop: 12, fontSize: 12, color: "#8c8c8c" } },
        `${tasks.length} task${tasks.length === 1 ? "" : "s"} will be copied into this template.`,
      ),
    ),
  );
};

const OverrideTemplateModal = ({
  open,
  tasks,
  serviceCatalog,
  onClose,
  onOverridden,
}) => {
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedServiceId(null);
      setConfirming(false);
    }
  }, [open]);

  const selectedService = serviceCatalog.find(
    (s) => extractId(s.id) === extractId(selectedServiceId),
  );

  const sortedTasks = useMemo(() => sortTasksByDisplayOrder(tasks), [tasks]);

  const handleConfirm = async () => {
    if (!selectedServiceId) return;
    setSaving(true);
    try {
      const targetServiceId = Number(selectedServiceId);
      // Sorted ASC by sortOrder, matching the DB trigger's own
      // "ORDER BY pt.sortOrder ASC NULLS LAST" (pgsql/AutoCreateTaskFromTemplate.sql)
      // so "position i" means the same thing on both sides of the reconcile.
      const existingTemplates = await fetchAll(
        "projectTemplates:list",
        "id,sortOrder",
        { serviceId: { $eq: targetServiceId } },
        ["sortOrder"],
      );
      const pairCount = Math.min(sortedTasks.length, existingTemplates.length);

      const ops = [];
      // Matched positions: update in place (same id) so
      // documents.sourceProjectTemplateId in OTHER cases stays valid.
      for (let i = 0; i < pairCount; i++) {
        ops.push(
          apiReq(
            `projectTemplates:update?filterByTk=${existingTemplates[i].id}`,
            "POST",
            {
              templateName: sortedTasks[i].title,
              description: sortedTasks[i].description || null,
              priority: sortedTasks[i].priority || null,
              sortOrder: i,
            },
          ),
        );
      }
      // Surplus real tasks beyond the existing template count: create.
      for (let i = pairCount; i < sortedTasks.length; i++) {
        ops.push(
          apiReq("projectTemplates:create", "POST", {
            templateName: sortedTasks[i].title,
            description: sortedTasks[i].description || null,
            priority: sortedTasks[i].priority || null,
            sortOrder: i,
            serviceId: targetServiceId,
          }),
        );
      }
      // Surplus old templates beyond the current task count: delete.
      for (let i = pairCount; i < existingTemplates.length; i++) {
        ops.push(
          ctx.api.request({
            url: "projectTemplates:destroy",
            method: "POST",
            params: { filterByTk: existingTemplates[i].id },
          }),
        );
      }
      await Promise.all(ops);
      message.success(
        `✅ "${selectedService?.serviceName || ""}" templates updated`,
      );
      onOverridden();
    } catch (e) {
      console.error(e);
      message.error("Failed to override template");
    }
    setSaving(false);
  };

  return React.createElement(
    Modal,
    {
      open,
      onCancel: onClose,
      footer: null,
      title: React.createElement(
        Text,
        { strong: true, style: { fontSize: 15, fontFamily: FONT } },
        "Override existing template",
      ),
    },
    !confirming
      ? React.createElement(
          "div",
          { style: { fontFamily: FONT } },
          React.createElement(
            "div",
            { style: { marginBottom: 6, fontSize: 12, color: "#595959" } },
            "Select the standardized service to override",
          ),
          React.createElement(Select, {
            value: selectedServiceId,
            onChange: setSelectedServiceId,
            showSearch: true,
            optionFilterProp: "label",
            style: { width: "100%" },
            placeholder: "-- Select a catalog service --",
            options: serviceCatalog.map((s) => ({
              value: s.id,
              label: s.serviceName,
            })),
          }),
          React.createElement(
            "div",
            {
              style: {
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              },
            },
            React.createElement(
              Button,
              { style: TASK_DS.secondaryButton, onClick: onClose },
              "Cancel",
            ),
            React.createElement(
              Button,
              {
                style: TASK_DS.primaryButton,
                disabled: !selectedServiceId,
                onClick: () => setConfirming(true),
              },
              "Next",
            ),
          ),
        )
      : React.createElement(
          "div",
          { style: { fontFamily: FONT } },
          React.createElement(
            "div",
            { style: { fontSize: 13, color: "#262626", lineHeight: 1.6 } },
            `This will update "${selectedService?.serviceName || ""}"'s task templates to match the ${sortedTasks.length} task${sortedTasks.length === 1 ? "" : "s"} currently in this case. Existing templates not present here will be removed. This cannot be undone.`,
          ),
          React.createElement(
            "div",
            {
              style: {
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              },
            },
            React.createElement(
              Button,
              {
                style: TASK_DS.secondaryButton,
                disabled: saving,
                onClick: () => setConfirming(false),
              },
              "Back",
            ),
            React.createElement(
              Button,
              {
                danger: true,
                type: "primary",
                loading: saving,
                onClick: handleConfirm,
              },
              saving ? "Overriding..." : "Confirm override",
            ),
          ),
        ),
  );
};

// ============================================================
// §10 MAIN — ProjectTasksTab + ctx.render()
// ============================================================
const ProjectTasksTab = () => {
```

- [x] **Step 2: Render `OverrideTemplateModal` from `ProjectTasksTab`**

Find (this is the result of Task 2's Step 7 edit):

```js
    /* ── Save as Template Modal ── */
    templateAction?.mode === "save" &&
      React.createElement(SaveAsTemplateModal, {
        open: true,
        serviceName: templateAction.serviceName,
        tasks: templateAction.tasks,
        ps: templateAction.ps,
        serviceCatalog,
        onClose: () => setTemplateAction(null),
        onSaved: () => {
          setTemplateAction(null);
          reload();
        },
      }),
  );
};
```

Replace with:

```js
    /* ── Save as Template Modal ── */
    templateAction?.mode === "save" &&
      React.createElement(SaveAsTemplateModal, {
        open: true,
        serviceName: templateAction.serviceName,
        tasks: templateAction.tasks,
        ps: templateAction.ps,
        serviceCatalog,
        onClose: () => setTemplateAction(null),
        onSaved: () => {
          setTemplateAction(null);
          reload();
        },
      }),

    /* ── Override Template Modal ── */
    templateAction?.mode === "override" &&
      React.createElement(OverrideTemplateModal, {
        open: true,
        tasks: templateAction.tasks,
        serviceCatalog,
        onClose: () => setTemplateAction(null),
        onOverridden: () => {
          setTemplateAction(null);
          reload();
        },
      }),
  );
};
```

- [ ] **Step 3: Manually verify**

Reload the Task Management tab.
1. Pick a service group, click "Override existing template" → modal opens with a searchable Select over the catalog (type part of a name to confirm search filters it).
2. Pick a service whose current template count is **less** than this group's task count → "Next" → confirm the warning text names the right service and task count → "Confirm override". After it completes, check `projectTemplates` for that `serviceId`: the original rows' `id`s are unchanged (same ids, updated `templateName`/`sortOrder`), and new rows exist for the surplus tasks.
3. Pick a service whose current template count is **greater** than this group's task count → confirm override → the surplus old template rows are gone, the matched positions were updated in place (same ids as before).
4. Before/after step 2 or 3, find (or create) a `documents` row in a *different* case whose `sourceProjectTemplateId` points at one of the templates that was *updated* (not deleted) — open that document in `TaskDetailView.js` and confirm `getEffectiveVariableConfig()` still resolves its inherited `variableConfig` correctly (this is the concrete proof the update-in-place design avoids the orphaning risk it was chosen to avoid).
5. Spot-check `CaseServices.js`, `companyServices`, and any Service Combo screen are visually unaffected after running both flows.

- [ ] **Step 4: Commit**

```bash
git add "All Module/Task/TaskManagement.js"
git commit -m "feat(task-management): add Override existing template flow"
```

---

## Task 4: Full spec verification pass

**Files:** none (verification only)

Run the spec's own testing plan (`docs/superpowers/specs/2026-09-09-service-template-standardization-design.md` §5) top to bottom in one sitting, on a case with a service group that has both a healthy task count and, separately, a zero-task group, to confirm nothing regressed between tasks:

1. Service group, 2+ tasks → menu appears, both items enabled.
2. Service group, 0 tasks → both items disabled, correct tooltip.
3. "Save as template" with a colliding name (including a diacritic/case variant) → blocked with the correct message.
4. "Save as template" with a unique name → new `services` row + correct `projectTemplates` rows, confirmed via direct data inspection.
5. "Override" onto a service with fewer existing templates than case tasks → update-in-place + surplus creates, ids verified unchanged for matched rows.
6. "Override" onto a service with more existing templates than case tasks → update-in-place + surplus deletes.
7. Cross-case `documents.sourceProjectTemplateId` still resolves after an Override that updated (not deleted) the referenced template.
8. `CaseServices.js` / `companyServices` / `serviceCombos` unaffected.

If any step fails, fix the specific broken step's code (in Task 2 or Task 3's section of this file) before considering the plan complete — do not patch around it with a new workaround task.

- [ ] **All 8 steps pass.**
