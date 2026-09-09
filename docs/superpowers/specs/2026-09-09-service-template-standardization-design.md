# Service Template Standardization ("Save as template" / "Override") — Design

Date: 2026-09-09
Status: Approved by user, ready for implementation planning

## 1. Overview

Today, a "standardized service" in the `services` catalog gets its task list (`projectTemplates`, linked via `serviceId`) populated entirely by hand through the Admin UI. There is no way to turn "what a lawyer actually did for this case" into a reusable catalog entry — the only existing data flow between a case and the catalog runs the other direction (`services`/`projectTemplates` → case, via the DB trigger `pgsql/AutoCreateTaskFromTemplate.sql` that clones templates into real `tasks` when a service is added to a case).

This spec adds the missing reverse flow: from inside a case's Task Management tab, a lawyer can capture the *real* tasks currently sitting under one service and either (a) publish them as a brand-new catalog service, or (b) use them to bring an existing catalog service's template list up to date.

**Location, confirmed with the user mid-design:** `All Module/Task/TaskManagement.js`, not `CaseServices.js`. Research into both files (see Appendix) found `TaskManagement.js` already groups a case's real tasks by service (`ServiceSection` components, one per service, inside `ListView`) — the exact data this feature needs to capture is already sitting in memory there, with no extra fetch required. `CaseServices.js` has the more intuitive "catalog" framing (it already lists `services`, has a "New service" button) but holds zero task data — using it would mean fetching `tasks` a second time for no benefit. The tradeoff is accepted: the two new buttons live somewhere a lawyer managing tasks will find naturally, at the cost of not being physically next to the commercial service list.

## 2. Goals

- From a case's Task Management tab, per service group, two new actions:
  - **"Save as template"** — capture the group's current real tasks into a **new** `services` catalog entry (with its own name) plus matching `projectTemplates` rows.
  - **"Override existing template"** — capture the same tasks into an **existing**, user-selected catalog service's `projectTemplates`, reconciling in place (see §4) rather than deleting and recreating.
- Duplicate-name protection: "Save as template" checks the entered name against the existing `services` catalog (case/diacritic-insensitive, reusing this project's established `normalizeSearch`/`serviceNameKey` comparison) and blocks Save until the name is unique, with a message that points the user at "Override" if that's what they actually meant.
- Reuses this project's existing conventions throughout: the name-collision check pattern (§5 of research), the "read from case, write to catalog" is the *new* direction, but the *inverse* (catalog → case, via Apply Package/Service Combo) already establishes the precedent of "snapshot now, no live link afterward" — this spec follows the same posture.

## 3. Non-goals (explicitly out of scope)

- **No file/variableConfig carry-over.** A real task's generated `documents` may carry `variableConfig`/a template file, linked via `documents.sourceProjectTemplateId` — none of that is read or copied. New/updated `projectTemplates` rows leave `variableConfig`/`fileAttachment`/`templateFileId` untouched (null on create; unmodified on update). If a lawyer wants a template's document config, they set it up by hand afterward through the existing Settings UI — unchanged workflow.
- **No automatic due-date offset.** `projectTemplates.quantity`/`duration` (the "+N days from case start" pair the auto-create trigger uses) are left null on create and untouched on update. A real task's absolute `dueDate` is not converted into a relative offset — computing that correctly (relative to what reference point? what if `dueDate` is null?) is a separate decision this spec doesn't make; templates created here simply have no auto-computed due date until someone sets one by hand.
- **No dependency chain.** `projectTemplates.previousTaskId` is left null — this feature does not attempt to infer or preserve task-to-task dependency ordering, only a flat `sortOrder`.
- **No retroactive sync.** Overriding a catalog service's templates never touches tasks already created in *other* cases (the auto-create trigger only fires once, at the moment a service is added to a case — this spec doesn't change that). Only future cases that add this service are affected.
- **No commercial-field sync on Override.** Overriding only touches `projectTemplates` rows. The target service's own `serviceName`/`serviceType`/`basePrice`/`description` in the `services` catalog are never modified by Override.
- **No changes to `CaseServices.js`, `companyServices`, `serviceCombos`, or the variable-config feature.** All confirmed-unrelated by research (Appendix) — this spec touches only `TaskManagement.js`, `services`, and `projectTemplates`.

## 4. Mechanism

### 4.1 UI: where the two actions live

Each `ServiceSection` (one block per service group, `TaskManagement.js`) gets a small action menu in its header, next to the existing "X/Y done" counter — this file has no existing per-service action menu to extend (confirmed by research: the only action menu in the file today is per-*task*, a self-built absolute-positioned div, not an antd `Dropdown`/`Menu`, since neither is imported). The new per-service menu follows that same self-built-div pattern for consistency with the file's existing style, with two items: "Save as template" and "Override existing template".

If the service group has zero tasks, both items are disabled with a tooltip ("No tasks to save as template") — there is nothing meaningful to capture.

**Data threading needed:** `ServiceSection` currently receives only a derived, ambiguous `serviceId` key (see Appendix — it's either the catalog `services.id` or the case's own `projectServices.id`, depending on whether the service is catalog-linked), plus `serviceName` and `tasks`. This feature needs the full source `projectServices` row (for `serviceType`/`description`/`basePrice`, used when creating a new catalog service — §4.4) and needs to know unambiguously whether/which catalog service this group is already linked to (relevant context for the Override picker's default selection, if any). This is prop-drilling, not a new fetch — `ListView`/`ProjectTasksTab` already loads the full `projectServices` list.

**New fetch needed:** `TaskManagement.js` currently never calls `services:list` — added once, on tab load, to power both the name-collision check and the Override picker's dropdown.

### 4.2 "Save as template" flow

1. Click → modal with one text input, "New service name", pre-filled with the case-service's current display name.
2. On every change, compare the (trimmed, diacritic/case-normalized) name against the fetched `services` catalog list.
3. Collision → inline error, Save button disabled: *"This name already exists in the catalog. Rename it, or use 'Override' instead if you want to update that service."*
4. No collision → Save:
   - Create one `services` row: `serviceName` (entered), `serviceType`/`description`/`basePrice` copied from the case's `projectServices` row for this group.
   - Create one `projectTemplates` row per real task currently in the group (§4.4 for field mapping), `serviceId` = the new service's id, `sortOrder` = current display position.
   - Success toast, close modal.

### 4.3 "Override existing template" flow

1. Click → modal with a searchable select over the existing `services` catalog (no free-text name entry — this is a "pick one" action, per the user's own framing).
2. Pick a service → confirmation step, since this mutates a shared catalog resource other cases may already reference: *"This will update '[service name]'s task templates to match the N tasks currently in this case. Existing templates not present here will be removed. This cannot be undone."*
3. Confirm → reconcile by position, not delete-and-recreate (§4.4):
   - Sort the target service's existing `projectTemplates` by `sortOrder`; sort the case's current tasks by display order.
   - Pair up index-by-index. Where both sides have an entry: **update** the existing `projectTemplates` row in place (same `id` — see rationale below).
   - Extra tasks beyond the existing template count: **create** new `projectTemplates` rows.
   - Extra old templates beyond the current task count: **delete** those rows.
   - Success toast, close modal.

**Why update-in-place instead of delete-then-recreate (changed from an earlier draft of this spec after the user raised it):** `documents.sourceProjectTemplateId` (from the already-shipped variable-config feature) points directly at a `projectTemplates` row's `id`. A delete-and-recreate Override would orphan that reference for every already-generated document in *any other case* that previously used this service — `TaskDetailView.js`'s `getEffectiveVariableConfig()` reads `doc.projectTemplates?.variableConfig` through exactly that relation, so a dangling id would silently drop the inherited variable config for pre-existing documents. Reconciling by position preserves the `id` for every template that still has a corresponding task, so existing `documents` rows referencing it are never broken — only the surplus/deficit at the edges is created or deleted.

### 4.4 Field mapping

Per real task → one `projectTemplates` row (create on "Save as template" and for the surplus case in "Override"; update the same fields in place for matched positions in "Override"):

| Source (`tasks`) | Target (`projectTemplates`) |
|---|---|
| `title` | `templateName` |
| `description` | `description` |
| `priority` | `priority` |
| *(current display position)* | `sortOrder` |
| — | `serviceId` (target service, new or selected) |

Left untouched (create: null; update: not overwritten) — `quantity`, `duration`, `previousTaskId`, `variableConfig`, `fileAttachment`, `templateFileId` (the last one already confirmed dead/legacy by the auto-create trigger's own comments).

New `services` row (Save as template only): `serviceName` (user-entered, post-collision-check), `serviceType`/`description`/`basePrice` copied from the case's own `projectServices` row for that group.

## 5. Testing / verification plan

1. Open a case's Task Management tab, find a service group with 2+ real tasks. Confirm the new action menu appears in its header, both items enabled.
2. Service group with zero tasks → confirm both items disabled with the expected tooltip.
3. "Save as template" with a name that already exists in the catalog (any casing/diacritic variant) → confirm the inline error appears and Save stays disabled until renamed.
4. "Save as template" with a unique name → confirm: one new `services` row exists with the right `serviceType`/`description`/`basePrice`; one `projectTemplates` row per real task, correct `templateName`/`description`/`priority`/`sortOrder`, `quantity`/`duration`/`previousTaskId`/`variableConfig` all null.
5. "Override" an existing catalog service whose current template count is **less than** the case's task count → confirm existing templates are updated in place (same `id`s, check via a direct query before/after) and the extra tasks produce new template rows.
6. "Override" a service whose template count is **greater than** the case's task count → confirm the surplus old templates are deleted, the matched positions are updated in place.
7. Before/after an Override, confirm any existing `documents` row (in a *different* case) with `sourceProjectTemplateId` pointing at one of the *updated* (not deleted) templates still resolves `variableConfig` correctly through `TaskDetailView.js`'s `getEffectiveVariableConfig()` — this is the concrete proof the update-in-place design actually avoids the orphaning risk it was chosen to avoid.
8. Confirm neither flow touches `CaseServices.js`'s own display, `companyServices`, or `serviceCombos` — spot-check those screens are unaffected after running both flows.

## 6. Rollback

Fully additive at the schema level — no new columns, no new collections, only new/updated rows in `services`/`projectTemplates` using fields that already exist. Rollback is data-level, not schema-level: delete the specific `services`/`projectTemplates` rows created by a mistaken "Save as template", or manually restore a service's prior template list if a specific "Override" turns out to be wrong (no automatic undo — same posture as every other catalog edit made through the Admin UI today, since Override is deliberately positioned as a real, immediate catalog mutation, not a draft).

## Appendix: research notes

- `projectServices`/case-service records themselves store no task-template data — confirmed via grep across `CaseServices.js`/`ContractServices.js`/`QuotationServices.js` (zero `task[Tt]emplate` matches). Task templates live in the separate `projectTemplates` collection, linked to `services` (not to a case or `projectServices`) via a scalar `serviceId`.
- The only existing case↔catalog data flow is the DB trigger `pgsql/AutoCreateTaskFromTemplate.sql`, which clones every `projectTemplates` row matching a newly-added `projectServices.serviceId` into real `tasks` rows — one-directional (catalog → case), never re-reads afterward.
- Three distinct, easy-to-confuse collections exist: `services` (the catalog this spec targets), `companyServices` (an unrelated company↔service pricing join table — the name the user originally proposed, "Company Services", collides with this existing collection and was corrected to plain `services` during design), and `projectTemplates` ("Task Template" in the Admin UI).
- The task-template-variable-config feature (`docs/superpowers/specs/2026-08-18-task-template-variable-config-design.md`) is confirmed *already implemented* (not just planned) via direct code inspection — `projectTemplates.variableConfig`, `documents.variableConfigMode`/`sourceProjectTemplateId`, `TaskDetailView.js`'s `getEffectiveVariableConfig()`/`VARIABLE_CATALOG`. This is what motivated §4.3's update-in-place design for Override.
- The Service Combo / "Apply Package" mechanism (`docs/superpowers/specs/2026-08-24-service-combo-design.md`, implemented in `ContractCreateForm.js`) is the closest existing precedent for "apply a standardized thing into a live record" (catalog → record, snapshot, one-directional, FK back-reference for traceability) — this spec's "Save as template"/"Override" is the mirror-image direction, which that same design doc explicitly notes has no existing support.
- Name-collision checking pattern (`normalizeSearch`/`serviceNameKey`, `ContractCreateForm.js:3248-3252`/`5598-5604`, also used independently in `CaseServices.js:2658-2668`/`5119-5128`) is reused as-is, not reinvented.
- `ServiceSection`'s current props (`serviceId`, `serviceName`, `tasks`, `serviceDeleted`) and the ambiguity in what `serviceId` actually means (`getProjectServiceTaskKey`, `TaskManagement.js:353-359`) — full resolution deferred to the implementation plan, which will read that function directly before writing exact steps.
