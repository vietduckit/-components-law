# Task Template File — Variable Configuration Design

Date: 2026-08-18
Status: Approved for planning

## 1. Motivation

Lawyers handle daily tasks tied to a Case's service (e.g. drafting a lawsuit
petition, a request letter). Many of these tasks already get a template file
attached automatically — when a service is added to a Case, a Postgres
trigger (`pgsql/AutoCreateTaskFromTemplate.sql`) clones every matching
`projectTemplates` row (a per-service "task template" with `templateName`,
`description`, `templateFileId`) into a new `tasks` row, and if a
`templateFileId` is set, duplicates that file into a new `documents` row
linked to the task.

Today that file arrives blank — filling in case-specific values (customer
name, case number, court name, etc.) is entirely manual, every time. The
`{{variable}}`-based document generation already built for Quotation/Contract
(`QuotationDocxGenerator.js`, `ContractDocxGenerator.js`) proves the pattern
works, but its variable set is hardcoded in JS — every new variable needs a
code change. This design brings the same "fill a Word template from system
data" capability to task-level template files, but with the variable list
configured through the UI instead of hardcoded, and covering two cases:

- **Standardized tasks** — created from a service's `projectTemplates`, where
  an admin configures the variable list once and it applies to every task
  generated from that template.
- **Ad-hoc tasks** — a lawyer manually attaches a file to any task (whether
  or not that task came from a service template) and wants to configure and
  fill variables for that specific file, with no dependency on service-level
  setup.

## 2. Scope

**In scope:**
- A variable-catalog of system data (Case, Customer, Quotation, Contract,
  Invoice, Payment, Task, current User, Date) that a variable can be mapped
  to, plus free-form "manual entry" variables.
- A reusable variable-config editor UI (one JsField block bound to a JSON
  field), used both at the Service Template level (`projectTemplates`) and
  at the per-document level (`documents`), so admins and lawyers use the
  identical editing experience in both places.
- An "inherited vs. custom" mode on `documents`, so a task created from a
  service template stays in sync with that template's config by default,
  but can be broken off and customized per-task without touching the
  service-wide config.
- A "Generate" action added to `TaskDetailView.js`: resolves system-mapped
  variables from live data, prompts for manual variables, renders the
  `.docx` via docxtemplater (same libraries/approach as the Quotation/
  Contract generators), previews via Office Online, and saves the result as
  a **new** `documents` row on the task (the original template file is
  never overwritten, so Generate can be run repeatedly).

**Out of scope (explicitly deferred):**
- Any change to Quotation/Contract's own hardcoded variable sets — those
  are unaffected by this design.
- Auto-detecting `{{tags}}` directly from the uploaded `.docx` file to
  pre-populate the variable list. Admins/lawyers type variable keys by hand
  for now; this is a candidate follow-up, not required here.
- Automatic (non-button-triggered) generation at task-creation time. Every
  generate is an explicit action the lawyer takes in Task Detail.
- Retroactively updating already-generated **output** documents when the
  source config changes — only the not-yet-generated fill reads live data;
  previously generated documents are static files, same as Quotation/
  Contract's existing "Save to Documents" behavior.

## 3. Data model

Already provisioned directly in Nocobase Admin UI (no code migration
needed) — confirmed via screenshots of the live config:

**`projectTemplates`** ("Task Template" collection) — one new field:
| Field | Type | Purpose |
|---|---|---|
| `variableConfig` | JSON | Array of variable definitions, edited via the shared editor (§5). Source of truth for every task generated from this template, as long as its `documents` row stays in `inherited` mode. |

**`documents`** — three new fields:
| Field | Type | Purpose |
|---|---|---|
| `projectTemplates` (relation, FK column `sourceProjectTemplateId`) | belongsTo → `projectTemplates`, ON DELETE SET NULL | Set by the trigger when a document is cloned from a service's task template; `null` for ad-hoc uploads. Used to resolve the live `variableConfig` when `variableConfigMode = inherited`. |
| `variableConfigMode` | Single select | `inherited` (default when cloned from a template) or `custom`. **TBD:** exact option values must be confirmed against the live Nocobase field config before code is written — placeholder values `inherited`/`custom` are assumed throughout this doc and must be corrected if the actual stored values differ. |
| `variableConfig` | JSON | Only read when `variableConfigMode = custom`. Same array shape as `projectTemplates.variableConfig`. Ignored (not read) when mode is `inherited` — the live `projectTemplates.variableConfig` via the relation above is authoritative in that case. |

**Variable definition shape** (used identically in both `variableConfig`
fields):
```json
[
  { "key": "customer_name", "source": "system", "sourceKey": "customer.fullName" },
  { "key": "court_name",    "source": "manual", "label": "Tên tòa án" }
]
```
`key` is the literal `{{key}}` tag expected in the `.docx` file. `source` is
`"system"` (resolved automatically from live data via `sourceKey`, a
dot-path into the catalog — §4) or `"manual"` (lawyer types a value into a
form field labeled `label` at generate time).

**No changes to `tasks`, `services`, or `projects`** — the task↔template
link lives entirely on `documents.projectTemplates` (set by the trigger),
not on `tasks`.

**Trigger change required:** `pgsql/AutoCreateTaskFromTemplate.sql`, in the
section that duplicates `templateFileId` into a new `documents` row, must
also set `sourceProjectTemplateId = projectTemplates.id` and
`variableConfigMode = 'inherited'` on that new row.

## 4. Variable Catalog

A static JS object grouping available system fields by entity, each with a
dot-path `key` and a display `label`:

```js
const VARIABLE_CATALOG = {
  case:      { label: "Hồ sơ",      fields: [ { key: "case.caseNumber", label: "Số hồ sơ" }, ... ] },
  customer:  { label: "Khách hàng", fields: [ { key: "customer.fullName", label: "Tên khách hàng" }, ... ] },
  quotation: { label: "Báo giá",    fields: [ ... ] },
  contract:  { label: "Hợp đồng",   fields: [ ... ] },
  invoice:   { label: "Hoá đơn",    fields: [ ... ] },
  payment:   { label: "Thanh toán", fields: [ ... ] },
  task:      { label: "Công việc",  fields: [ ... ] },
  user:      { label: "Người dùng", fields: [ ... ] },
  date:      { label: "Ngày tháng", fields: [ ... ] },
};
```

At generate time (§6), a matching **context object** is built by fetching
the task's Case, and from there the linked Customer/Quotation/Contract/
Invoice/Payment records, plus the current Task, current User, and today's
Date — mirroring the parallel-fetch pattern `QuotationDocxGenerator.js` /
`ContractDocxGenerator.js` already use for their own hardcoded variable
sets. A `sourceKey` like `"customer.fullName"` is resolved as a dot-path
lookup against this context object.

Per the single-file constraint (JsField blocks can't import from each
other — see `nocobase_single_file_constraint` convention already followed
elsewhere in this repo), this catalog is duplicated inline in every file
that needs it: the shared variable-config editor (§5, for the "pick a
system field" dropdown) and the Task Detail generate logic (§6, to resolve
values). Both copies must be kept in sync by hand when the catalog changes.

**Exact field lists per entity are finalized during implementation**, not
this design — `case`/`customer`/`quotation`/`contract`/`task` can mostly
reuse fields already known from `ContractDocxGenerator.js`'s
`templateData`, but `invoice` and `payment` fields need to be looked up
fresh (not yet investigated in this design pass).

Each catalog entry may optionally carry a `format` (`"date"` | `"currency"`
| `"text"`, default `"text"`) so values are rendered consistently with
existing conventions (`fmtVND` for money, `dd/mm/yyyy` for dates) before
injection into the `.docx`.

## 5. Variable Config Editor — one block, two collections

Because both `projectTemplates.variableConfig` and `documents.variableConfig`
share the exact same array shape and editing semantics, this is **one**
JsField block (not two) bound to a JSON field via `ctx.getValue()` /
`ctx.setValue()`, attached in Nocobase UI to both fields independently. This
isn't a single-file-constraint violation — it's one block's field-editing
logic legitimately reused across two collections, the same way any other
generic JsField component would be.

UI: a table of rows (`key` | source toggle: System / Manual | system-field
dropdown grouped by catalog entity, shown when source=System | label input,
shown when source=Manual), with add/remove-row controls. No collection- or
record-specific logic inside this block — it only reads/writes whatever
field it's bound to.

## 6. Generate flow (`TaskDetailView.js`)

New logic added directly in this file (cannot reuse §5's block or the
Quotation/Contract generators' code — single-file constraint), covering:

1. **Determine eligibility.** A document row shows a "Generate" action only
   when it has a non-empty effective `variableConfig` — i.e.
   `variableConfigMode = custom` with a non-empty `variableConfig`, or
   `variableConfigMode = inherited` with a linked `projectTemplates` row
   whose `variableConfig` is non-empty.
2. **Mode handling.** For `inherited` documents, fetch the linked
   `projectTemplates.variableConfig` fresh (live, not cached) every time the
   Generate modal opens — this is what makes admin edits at the service
   template level apply automatically to future generates, with no stale
   copy. A "Customize for this task" action switches the document to
   `custom` mode, snapshotting the currently-inherited config as the
   starting point for independent editing (opens the §5 editor scoped to
   this document's `variableConfig`).
   For documents with no `projectTemplates` link (ad-hoc uploads), mode is
   `custom` from the start and there's no inherited config to fall back to
   — the lawyer configures from an empty list via the same §5 editor,
   opened directly from Task Detail.
3. **Resolve context + prompt.** Build the context object described in §4
   (Case → Customer/Quotation/Contract/Invoice/Payment, current Task,
   current User, Date). For each variable: `source: "system"` resolves
   silently from the context (missing data renders as an empty placeholder,
   same `" ____ "` convention as `ContractDocxGenerator.js`, with a
   `message.warning` listing which fields couldn't resolve — mirrors the
   existing `missingRateNames` pattern for currency conversion). `source:
   "manual"` variables are shown as input fields in a modal, labeled by
   their configured `label`.
4. **Render + save.** Load `pizzip`/`docxtemplater` via `ctx.importAsync`
   exactly as the Quotation/Contract generators do, render the source
   `.docx` (fetched fresh from the document's `fileAttachment`, never
   mutated), preview via the same Office Online iframe pattern, then on
   confirm save as a **new** `documents` row on the task (reusing the
   `getUniqueFileName`/`getNextFileIndex` de-dup conventions already used
   elsewhere in the Document module) — the original template-sourced
   document is left untouched, so Generate can be re-run with different
   values producing additional documents each time.

## 7. Error handling

- Docxtemplater render errors (a `{{tag}}` in the `.docx` with no matching
  entry in `variableConfig`, or malformed template syntax) reuse the
  existing `showErrorModal` pattern from `QuotationDocxGenerator.js` /
  `ContractDocxGenerator.js` for detailed, copyable error output.
- A system-mapped variable whose context data is missing (e.g. Case has no
  linked Customer) does not block generation — it renders as a blank
  placeholder and surfaces a warning, consistent with how missing exchange
  rates are handled today in the Quotation/Contract generators.
- If the linked `projectTemplates` row (for an `inherited` document) has
  been deleted, the FK is `SET NULL` by the DB — the document silently
  falls back to having no config until the lawyer manually adds one via
  §5's editor in `custom` mode.

## 8. Testing / verification

This repo has no automated test runner for JS Field/Action blocks (they run
inside the Nocobase browser runtime, not a standalone app) — verification is
manual, browser-based, per the project's existing convention. Minimum
manual pass before considering this done:
- Configure a `projectTemplates.variableConfig` with at least one system
  variable and one manual variable; confirm a task auto-created from that
  service template shows the Generate action with `inherited` mode and the
  correct pre-filled values.
- Edit the service template's `variableConfig` after a task already exists;
  re-open Generate on that task and confirm the updated config is reflected
  (proves "live read", not a stale copy).
- Use "Customize for this task" on one such document; confirm it no longer
  reacts to further edits at the service-template level.
- Attach a fresh file to an unrelated ad-hoc task with no `projectTemplates`
  link; configure `variableConfig` directly via §5's editor; confirm
  Generate works identically.
- Trigger a docxtemplater render error (mismatched tag) and confirm the
  error modal surfaces something actionable.

## 9. Open Questions

- Exact `variableConfigMode` select option values as actually configured in
  Nocobase (assumed `inherited`/`custom` throughout this doc — **must be
  confirmed before implementation starts**).
- Exact field lists for the `invoice` and `payment` catalog groups (not yet
  investigated).
- Where in `TaskDetailView.js`'s existing document-list UI the "Generate"
  action should be placed, and how folder-scoping for the new document
  (`folderId`) should be derived for tasks — left to the implementation
  plan, which will need to read the current attached-documents rendering
  code in that file first.
