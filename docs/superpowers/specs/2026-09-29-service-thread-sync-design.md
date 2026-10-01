# Service thread sync — design

Date: 2026-09-29. Builds on `2026-09-29-money-flow-unification-design.md`
(line triggers, frozen rates, headers, installments, audit).

## 1. Problem

A service lives in up to three places: a quotation line (`quotationServices`),
a contract line (`contractServices`) and a case line (`projectServices`).
Today they are kept alike by seven JS blocks that each write the other tables
with separate API requests (no transaction), and ContractServices does not
update the case line at all. On the dev copy (2026-09-29, `nocobase-law`):

- 11 contract lines lost their currency (VND with a foreign price) while the
  case line kept USD / SGD — contract totals short by millions;
- `projectServices` has no `quantity` (a quantity-3 contract line: contract
  32,400,000, case 10,800,000); `contractServices` has no `serviceType`;
- `projectServices.quotationServiceId` is empty on all 296 case lines;
- 7 case lines / 3 contract lines have no counterpart; 38 contract lines point
  at deleted cases; contracts 259 and 286 have two cases each;
- there are no foreign keys: deleting a line leaves 902 tasks, requests and
  schedule tags pointing at nothing.

## 2. Goal (decided with the user)

1. Any change to a service's content in any of the three places — name,
   type, description, catalog service, price, quantity, VAT, currency, combo —
   changes every related line, **in all three directions**, in one
   transaction.
2. A thread that touches a **billed** contract (an active / invoiced / paid
   request, an invoice, received money — `money_contract_billing_locked`) is
   **locked for every field**: the change is refused with a message.
3. Destroying a line destroys the whole thread (real `destroy`, no status
   flag), with its pending requests, schedule tags and untouched tasks; it is
   refused when the thread is billed or any of its tasks has progress.
4. Every change is kept in a history table (who, when, where, field, old →
   new, and which lines it spread to).
5. Existing real data is repaired by a previewed script; test and orphan rows
   are left alone.

## 3. The thread

- New column `serviceThreadId bigint` (indexed, registered as a NocoBase
  field) on the three line tables. All lines of one service share it; one
  quotation line made into several contracts is one thread.
- **Assignment** (BEFORE INSERT, and BEFORE UPDATE of a link column):
  1. the value the client sent;
  2. else the thread of the line it links to: contract line →
     `projectServiceId`, then `quotationServiceId`; case line →
     `quotationServiceId`, then a contract line whose `projectServiceId` is it;
  3. else its own id (a new thread).
  When a link column is set to a line of another thread, the two threads are
  merged (the other thread's lines take this line's thread id).
- The old link columns stay and keep being written; a contract line links at
  most one case line (unique index on `contractServices("projectServiceId")`).
- `contractServices.projectId` is derived from its case line on every write.

## 4. Synced fields

| Canonical | quotationServices | contractServices | projectServices |
|---|---|---|---|
| catalog service | `serviceId` | `ServiceId` | `serviceId` |
| name, type, description | `serviceName`, `serviceType`, `description` | same (`serviceType` added) | same |
| price, quantity, VAT, currency | `basePrice`, `quantity`, `vat`, `currencyId` | same | same (`quantity` added) |
| combo | `comboId`, `comboName` | same | same |

Catalog service, name, type and description spread to every line. Price,
quantity, VAT, currency and combo spread only between lines of the same
pricing (combo `package` vs line): a combo line's price is 0 by design, and
spreading it would wipe a line-priced contract (contract 269 on dev).

Compared **normalized**: text trimmed, empty = NULL; quantity NULL = 1;
basePrice / VAT NULL = 0; currency NULL = the base currency (VND). A write
that changes nothing after normalizing is not a change (the JS blocks re-save
unchanged rows).

Not synced (per document): status / `lineStatus`, `pricingMode`, the frozen
rate and its date, all amounts (computed by `money_line_compute` with each
document's own rate; a case line takes its contract line's rate), package
amounts, `folderId`, `billingMode`, `financialSourceType`,
`paymentTriggerTemplateIds`, `paymentAllocatedAmount`.

## 5. Sync

- **BEFORE UPDATE / INSERT** (`money_thread_before`): assign the thread; if
  the content changed (for an insert: differs from the thread's current
  content) and the thread has a billed contract → `RAISE EXCEPTION
  'Dịch vụ "<name>" thuộc hợp đồng <code> đã phát sinh thanh toán — không thể sửa.'`
- **AFTER UPDATE / INSERT** (`money_thread_after`), when the content changed
  and the session flag `money.thread_sync` is not `on`:
  1. set the flag; lock the thread's lines in a fixed order (table, id);
  2. log the origin change (one row per field);
  3. write the origin's content into every other line of the thread
     (quotation lines, then contract lines, then case lines), logging each
     changed field with `originLogId`;
  4. clear the flag.
  Writes made while the flag is on do not sync again (no loop). The line
  triggers recompute each line's amounts; a currency change re-freezes each
  line at its own document date and the case line re-takes the contract
  line's rate; headers, installments and pending requests follow.
- **By Service pending requests** (status `pending`, linked by
  `projectServiceId` or `contractServiceId`) follow their service's amount
  (`by_service_service_amount`); their items share it (largest remainder).

## 6. Destroy

- **BEFORE DELETE** (flag off): refuse when the thread is billed, or when a
  task of any thread line (by `projectServiceId`, `contractServiceId` or
  `quotationServiceId`) has progress: status other than `toDo` / empty, a
  timesheet, a subtask, a meeting, or a document created more than one
  minute after the task (template files are created with it).
  Message: `'Dịch vụ "<name>" có công việc đang thực hiện — xử lý các task trước.'`
- **AFTER DELETE** (flag off): set the flag; log; destroy the other thread
  lines; destroy, for every thread line, the untouched tasks with their
  documents and folders, the pending requests linked to the line (with their
  items and finance members), and the schedule / request service tags; clear
  the flag. Headers and installments follow through the existing triggers.

## 7. History: `serviceChangeLogs`

`id` (bigint, default from a sequence), `createdAt`, `updatedAt`,
`createdById` (the line's `updatedById`), `serviceThreadId`, `action`
(`update` / `insert` / `delete`), `tableName`, `recordId`, `documentType`
(`quotation` / `contract` / `case`), `documentId`, `fieldName`, `oldValue`,
`newValue` (text), `originLogId` (NULL on the origin row). Insert-only. Created
by the SQL file (IF NOT EXISTS) and registered as a NocoBase collection by
`JsField/RegisterServiceThreadFields.js`.

## 8. Audit

View `service_thread_violations(rule, table_name, record_id, thread_id,
detail)`: `thread_missing` (a line without a thread), `thread_content_mismatch`
(lines of one thread whose normalized content differs),
`thread_two_contract_lines_one_case` (guarded by the unique index, kept for
dev data). `pgsql/money_consistency_audit.sql` lists both views.

## 9. Existing data (`pgsql/service_thread_backfill_preview.sql` → `..._backfill.sql`)

Runs with the sync flag on (no propagation, no billed refusal), in order:
1. link: case line ← `quotationServiceId` from its contract line; unlinked
   case / contract lines of the same case-contract with the same catalog
   service (one candidate only) are linked;
2. threads: connected components over the links → `serviceThreadId`;
3. currency: a contract / quotation line in VND whose thread's case line is
   foreign with the same price takes that currency (billed contracts listed,
   not changed);
4. fill `projectServices.quantity`, `contractServices.serviceType` from the
   thread;
5. content conflicts in a thread: the contract line wins (billing basis),
   else the case line; threads with a billed contract are listed, not changed;
6. lines with status `deleted` / `cancelled`: destroyed alone (no thread
   propagation) unless a task has progress (listed);
7. `money_backfill_run()` for the rates / amounts;
8. drop the duplicate `trg_auto_create_tasks` (same function as
   `trigger_auto_create_tasks`, which also covers INSERT).
Orphans (lines of deleted cases / contracts) and test rows are left alone.

## 10. JS

- Service save / delete errors show the database message
  (`error.response.data.errors[0].message`).
- New read-only block `All Module/Service/ServiceChangeLog.js`: the history of
  the current quotation / contract / case (by `documentType`, `documentId`,
  and every thread it contains), responsive.
- The JS cascades stay for now (they write the same values: no-ops); removing
  them is a follow-up.

## 11. Testing

`pgsql/tests/service_thread_test.sql` on the local harness: every field from
every table spreads; one quotation → three contracts; normalization (no
spread for NULL vs 1); billed refusal from each table; insert joining a
thread; link merge; destroy spreads and cleans dependents; destroy refused
with task progress; history rows; By Service pending request follows;
no recursion. Then the whole flow on the local copy `nocobase-law`: preview,
backfill, audit (0 rows except listed billed / orphan cases), and scenario
checks inside a transaction.

## 12. Non-goals

UI to resolve conflicts; approval workflow for changes; foreign keys at the
database level; removing the JS cascades (follow-up).
