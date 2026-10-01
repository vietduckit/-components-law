# Finance P1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the payment data trustworthy before any Finance UI reads it: one status vocabulary, paid/outstanding/overdue derived by the database for requests and invoices, only received money counted (edits and deletes included), and at most one open request per billing unit.

**Architecture:** One new idempotent SQL file (`pgsql/finance_foundation.sql`) holds the columns, BEFORE triggers that derive `outstanding*`/`overdueSince`/invoice `status` from the paid amount, AFTER triggers that roll payments up into requests and invoices, the unique partial indexes, and `finance_refresh_overdue()` for a daily NocoBase cron workflow. Existing SQL (`contract_payment_status_workflow.sql`, `unified_contract_payment_schedule.sql`, `retainer_billing_run_due.sql`) is edited in place. JS blocks stop writing `submitted` and `Partial`. One-time data changes live in an audit file (read-only) and a migrate file.

**Tech Stack:** PostgreSQL (plpgsql; PG 16 locally), NocoBase JS Blocks (plain JS, `React.createElement`), Node `node:assert` static tests, NocoBase API scripts run from the browser console.

**Spec:** `docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md` (§2, §4, §5, §6 status rules). Roadmap: `docs/superpowers/plans/2026-09-28-case-finance-roadmap.md`.

## Global Constraints

- Payment Request status: `pending` → `active`; terminal `cancelled`. `submitted`, `checking`, `approved`, `converted` are no longer written; `rejected` maps to `cancelled`.
- Payment status: exactly `Received` / `Cancelled` (stored with that capitalisation, compared with `lower(btrim(...))`). Only `Received` money counts anywhere.
- Money is in VND: a payment counts as `amount × exchangeRateToBase` (VND per 1 unit; VND rows are 1; NULL/0 treated as 1).
- Dates: "today" and due dates are compared in `Asia/Ho_Chi_Minh` (`finance_today()`, `finance_local_date()`).
- Overdue: request = `status = 'active'` and due date before today and outstanding > 0. Invoice = not draft/cancelled, `deadline` (else its request's `dueDate`) before today, outstanding > 0. `overdueSince = due date + 1 day`.
- Invoice status is derived except `draft` and `cancelled`, which stay as set by hand; order paid > overdue > partial > pending.
- One non-cancelled request per `contractPaymentScheduleId`, per `projectServiceId` (when no schedule id), per (`billingPlanId`, `cycleNo`).
- Every SQL file is idempotent (`CREATE OR REPLACE`, `IF NOT EXISTS`, `DROP TRIGGER IF EXISTS`).
- NocoBase single-file blocks: no imports, no new files for blocks, keep each file's existing style (`React.createElement`, English UI).
- No git commits and no pushes: the user reviews and commits (public repo; `.githooks` secret scan).
- Deployment is manual on dev; this plan ends with the exact checklist.

## Review Focus

1. A payment's amount is edited or the payment is deleted → request, invoice and contract totals follow (today's trigger only fires on `paymentStatus`). Pinned in Task 3.
2. A payment recorded against the invoice only (no `paymentRequestId`) → counts toward the invoice's request; one recorded against the request only → counts toward that request's single invoice. Pinned in Task 3.
3. Overpayment → outstanding 0, never negative; invoice `paid`, request not overdue. Pinned in Task 3.
4. A cancelled request never blocks a new one for the same unit and is never overdue; the By Service idempotency check ignores it. Pinned in Task 4.
5. Running the daily refresh twice changes nothing the second time; paying an overdue request clears `overdueSince`. Pinned in Task 5.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `pgsql/tests/fixtures/finance_min_schema.sql` | Create | Minimal tables/columns for running payment SQL on a throwaway local Postgres |
| `scripts/tests/sql/run-local.sh` | Create | initdb → load fixture + payment SQL → run given test files → tear down |
| `pgsql/contract_payment_status_workflow.sql` | Modify | Helpers `finance_is_received`, `finance_payment_base_amount`; contract outstanding counts Received only, in VND, on insert/update/delete |
| `pgsql/finance_foundation.sql` | Create | Columns, date helpers, paid sums, derive triggers, roll-up triggers, unique indexes, `finance_refresh_overdue()` |
| `pgsql/unified_contract_payment_schedule.sql` | Modify | Idempotency checks ignore cancelled requests |
| `pgsql/retainer_billing_run_due.sql` | Modify | Requests created `active` with `dueDate`, `billingPlanId`, `cycleNo`; ON CONFLICT DO NOTHING |
| `pgsql/finance_foundation_audit.sql` | Create | Read-only report: duplicates that block the indexes, statuses in use, invoices whose status will change |
| `pgsql/finance_foundation_migrate.sql` | Create | One-time status mapping, retainer plan/cycle backfill, paid backfill |
| `pgsql/tests/finance_foundation_test.sql` | Create | Self-checking test (BEGIN…ROLLBACK), runs locally and on dev |
| `JsField/RegisterFinanceFoundationFields.js` | Create | Registers the new columns as NocoBase fields |
| `JsField/Workflow/CreateFinanceOverdueCronWorkflow.js` | Create | Daily workflow running `finance_refresh_overdue()` |
| `All Module/Payment/PaymentRequestCreateBlock.js` | Modify | Create requests as `active` |
| `All Module/Contract/ContractDetailView.js` | Modify | Create requests as `active`; status meta pending/active/cancelled; requested = active |
| `All Module/Contract/ContractPaymentScheduleDetailBlock.js` | Modify | Same as ContractDetailView |
| `JsField/Workflow/CreateContractBillingPlansWorkflow.js` | Modify | Legacy script: `active` (kept consistent) |
| `All Module/Payment/PaymentCreateBlock.js` | Modify | Status options Received/Cancelled; never writes Partial |
| `All Module/Payment/PaymentContractDetailBlock.js` | Modify | Received-only |
| `scripts/tests/finance-foundation.test.js` | Create | Static checks of SQL shape and JS constants |

---

### Task 1: Local SQL test harness

**Files:**
- Create: `pgsql/tests/fixtures/finance_min_schema.sql`
- Create: `scripts/tests/sql/run-local.sh`
- Create: `pgsql/tests/finance_foundation_test.sql` (smoke section only in this task)

**Interfaces:**
- Produces: `bash scripts/tests/sql/run-local.sh <test.sql>...` — exits 0 and prints each test's final NOTICE when all checks pass; non-zero on the first `FAIL`. Env: `PGBIN` (default `/c/Program Files/PostgreSQL/16/bin`), `SQL_TEST_TMP` (parent dir for the throwaway cluster), `PGPORT_LOCAL` (default 55439).

- [ ] **Step 1: Write the fixture**

`pgsql/tests/fixtures/finance_min_schema.sql`:

```sql
-- Minimal stand-in for the NocoBase tables the payment SQL touches, so the
-- self-checking tests in pgsql/tests can run on a throwaway local Postgres
-- (scripts/tests/sql/run-local.sh). Only the columns that SQL reads/writes.
-- The real check is still running the same test file on the dev database.
CREATE TABLE contracts (
  id bigint PRIMARY KEY, "contractCode" varchar(255), "contractName" varchar(255),
  "contractType" varchar(255), "billingCycle" varchar(255), "pricingMode" varchar(255),
  "customerId" bigint, "internalCompanyId" bigint, "lawyerId" bigint,
  "totalAmount" double precision, "fixedAmount" double precision,
  "subTotal" double precision, "vatAmount" double precision,
  "paymentDate" timestamptz, "paymentSchedule" jsonb,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE projects (
  id bigint PRIMARY KEY, "contractId" bigint, "customerId" bigint,
  status varchar(255), "managerId" bigint,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE lawyers (id bigint PRIMARY KEY, "userId" bigint);
CREATE TABLE services (id bigint PRIMARY KEY, "basePrice" double precision);
CREATE TABLE "projectServices" (
  id bigint PRIMARY KEY, "projectId" bigint, "serviceId" bigint, "serviceName" varchar(255),
  "totalAmount" double precision, "pricingMode" varchar(255),
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE "contractServices" (id bigint PRIMARY KEY, "contractId" bigint, "projectServiceId" bigint);
CREATE TABLE tasks (
  id bigint PRIMARY KEY, title varchar(255), status varchar(255), "projectId" bigint,
  "projectServiceId" bigint, "isPaymentTrigger" boolean DEFAULT false, "paymentRequestId" bigint,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE "contractPaymentSchedules" (
  id bigint PRIMARY KEY, "contractId" bigint, "installmentNo" bigint, label varchar(255),
  percentage double precision, amount double precision, "triggerType" varchar(255), "dueDate" timestamptz,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE "contractPaymentScheduleServices" (
  id bigint PRIMARY KEY, "contractPaymentScheduleId" bigint, "contractServiceId" bigint,
  "createdAt" timestamptz, "updatedAt" timestamptz
);
CREATE TABLE "paymentRequests" (
  id bigint PRIMARY KEY, title varchar(255), status varchar(255), "triggerType" varchar(255),
  "conditionMet" boolean, "installmentNo" bigint, "contractPaymentScheduleId" bigint,
  "projectServiceId" bigint, "contractServiceId" bigint, "contractId" bigint,
  "customerId" bigint, "internalCompanyId" bigint,
  "requestedAmount" double precision, "dueDate" timestamptz, currency varchar(255),
  "requestType" varchar(255), priority varchar(255), "requestNote" text, "sourceSnapshot" jsonb,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE "paymentRequestServices" (
  id bigint PRIMARY KEY, "paymentRequestId" bigint, "contractServiceId" bigint,
  "createdAt" timestamptz, "updatedAt" timestamptz
);
CREATE TABLE "paymentRequestItems" (
  id bigint PRIMARY KEY, "paymentRequestId" bigint, "contractId" bigint,
  "lineType" varchar(255), "lineStatus" varchar(255), "scheduleItemId" varchar(255),
  "installmentNo" bigint, "lineLabel" varchar(255), "plannedPaymentDate" timestamptz,
  "requestedAmount" double precision, "createdAt" timestamptz, "updatedAt" timestamptz
);
CREATE TABLE invoices (
  id bigint PRIMARY KEY, "invoiceNumber" varchar(255), status varchar(255),
  "totalAmount" double precision, "amountPaid" double precision DEFAULT 0,
  "outStandingAmount" double precision DEFAULT 0, deadline timestamptz, "issuedDate" timestamptz,
  "paymentRequestId" bigint, "contractId" bigint,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE payments (
  id bigint PRIMARY KEY, amount double precision, "paymentStatus" varchar(255),
  "paymentDate" timestamptz, "contractId" bigint, "invoiceId" bigint, "paymentRequestId" bigint,
  "currencyId" bigint, "exchangeRateToBase" double precision DEFAULT 1, "sourceKey" varchar(255),
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
CREATE TABLE "contractBillingPlans" (
  id bigint PRIMARY KEY, "contractId" bigint, "planType" varchar(255), status varchar(255),
  "totalAmount" double precision, "retainerTotalCycles" integer, "retainerCyclesBilled" integer DEFAULT 0,
  "retainerUnit" varchar(255), "startDate" date, "nextBillingDate" date, "endDate" date,
  "createdAt" timestamptz DEFAULT now(), "updatedAt" timestamptz DEFAULT now()
);
```

- [ ] **Step 2: Write the runner**

`scripts/tests/sql/run-local.sh`:

```bash
#!/usr/bin/env bash
# Runs self-checking SQL tests (pgsql/tests/*_test.sql) on a throwaway local
# Postgres: initdb -> fixture schema -> the payment SQL files -> the tests.
# Nothing touches a real database. The same test files are meant to be run on
# the dev database too (psql -f), where the real schema is the judge.
#
#   bash scripts/tests/sql/run-local.sh pgsql/tests/finance_foundation_test.sql
#
# Env: PGBIN (Postgres bin dir), SQL_TEST_TMP (parent dir for the cluster),
#      PGPORT_LOCAL (port, default 55439).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PGBIN="${PGBIN:-/c/Program Files/PostgreSQL/16/bin}"
PORT="${PGPORT_LOCAL:-55439}"
DATA="$(mktemp -d "${SQL_TEST_TMP:-${TMPDIR:-/tmp}}/pgtest.XXXXXX")"
cleanup() {
  "$PGBIN/pg_ctl" -D "$DATA" stop -m immediate >/dev/null 2>&1 || true
  rm -rf "$DATA"
}
trap cleanup EXIT

"$PGBIN/initdb" -D "$DATA" -U postgres -A trust -E UTF8 >/dev/null
"$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT" -l "$DATA/server.log" -w start >/dev/null

PSQL=("$PGBIN/psql" -X -q -v ON_ERROR_STOP=1 -h localhost -p "$PORT" -U postgres -d postgres)
"${PSQL[@]}" -f "$ROOT/pgsql/tests/fixtures/finance_min_schema.sql"
for f in contract_payment_status_workflow.sql by_case_payment_request_automation.sql \
         unified_contract_payment_schedule.sql retainer_billing_run_due.sql finance_foundation.sql; do
  if [ -f "$ROOT/pgsql/$f" ]; then "${PSQL[@]}" -f "$ROOT/pgsql/$f"; fi
done
for t in "$@"; do
  echo "== $t"
  "${PSQL[@]}" -f "$ROOT/$t"
done
```

- [ ] **Step 3: Smoke test file**

`pgsql/tests/finance_foundation_test.sql` (later tasks append sections before the final `ROLLBACK`):

```sql
-- ============================================================
-- Self-checking test for pgsql/finance_foundation.sql (+ the payment SQL it
-- changes). Run AFTER deploying:  psql ... -f pgsql/tests/finance_foundation_test.sql
-- Locally: bash scripts/tests/sql/run-local.sh pgsql/tests/finance_foundation_test.sql
-- Everything runs inside BEGIN ... ROLLBACK — nothing is left behind.
-- Each check RAISEs "FAIL: ..." on a wrong result; the last line prints
-- "ALL FINANCE FOUNDATION CHECKS PASSED". Test rows use ids 991000000000001+.
-- ============================================================
BEGIN;

INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount")
VALUES (991000000000001, 'FIN-TEST', 'Finance foundation test', 'byCase', 1000);

-- ---- (sections appended by later tasks go here) ----

DO $$ BEGIN RAISE NOTICE 'ALL FINANCE FOUNDATION CHECKS PASSED'; END $$;
ROLLBACK;
```

- [ ] **Step 4: Run it**

Run: `SQL_TEST_TMP="$SCRATCH" bash scripts/tests/sql/run-local.sh pgsql/tests/finance_foundation_test.sql` (`$SCRATCH` = any writable temp dir)
Expected: `NOTICE:  ALL FINANCE FOUNDATION CHECKS PASSED`, exit 0. If loading an existing payment SQL file fails on a missing column, that column is missing from the fixture — add it to the matching `CREATE TABLE` in Step 1 (the real table has it) and re-run.

---

### Task 2: Contract outstanding counts Received only, in VND, on every change

**Files:**
- Modify: `pgsql/contract_payment_status_workflow.sql` (functions `contract_recompute_outstanding`, trigger `trg_payment_recompute_contract`, the backfill at the end)
- Test: `pgsql/tests/finance_foundation_test.sql` (section "contract outstanding")

**Interfaces:**
- Produces: `finance_is_received(p_status text) RETURNS boolean`, `finance_payment_base_amount(p_amount double precision, p_rate double precision) RETURNS numeric`, `contract_recompute_outstanding_for(p_contract_id bigint) RETURNS void`. Used by Task 3.

- [ ] **Step 1: Write the failing test** — append before the final NOTICE:

```sql
-- ---- contract outstanding: Received only, VND, insert/update/delete ----
DO $$
DECLARE v double precision;
BEGIN
  INSERT INTO payments (id, amount, "paymentStatus", "contractId") VALUES (991000000000101, 400, 'Received', 991000000000001);
  SELECT "outStandingAmount" INTO v FROM contracts WHERE id = 991000000000001;
  IF v <> 600 THEN RAISE EXCEPTION 'FAIL: outstanding after 400 received should be 600, got %', v; END IF;

  UPDATE payments SET amount = 700 WHERE id = 991000000000101;
  SELECT "outStandingAmount" INTO v FROM contracts WHERE id = 991000000000001;
  IF v <> 300 THEN RAISE EXCEPTION 'FAIL: editing the amount must recompute (want 300, got %)', v; END IF;

  INSERT INTO payments (id, amount, "paymentStatus", "contractId") VALUES (991000000000102, 100, 'Partial', 991000000000001);
  SELECT "outStandingAmount" INTO v FROM contracts WHERE id = 991000000000001;
  IF v <> 300 THEN RAISE EXCEPTION 'FAIL: only Received counts (want 300, got %)', v; END IF;

  INSERT INTO payments (id, amount, "paymentStatus", "contractId", "exchangeRateToBase") VALUES (991000000000103, 0.01, 'received', 991000000000001, 10000);
  SELECT "outStandingAmount" INTO v FROM contracts WHERE id = 991000000000001;
  IF v <> 200 THEN RAISE EXCEPTION 'FAIL: foreign payment counts in VND (want 200, got %)', v; END IF;

  DELETE FROM payments WHERE id IN (991000000000101, 991000000000103);
  SELECT "outStandingAmount" INTO v FROM contracts WHERE id = 991000000000001;
  IF v <> 1000 THEN RAISE EXCEPTION 'FAIL: deleting payments must recompute (want 1000, got %)', v; END IF;
  DELETE FROM payments WHERE id = 991000000000102;
END $$;
```

- [ ] **Step 2: Run to verify it fails**

Run: `bash scripts/tests/sql/run-local.sh pgsql/tests/finance_foundation_test.sql`
Expected: `FAIL: editing the amount must recompute` (today's trigger fires only on `paymentStatus`).

- [ ] **Step 3: Implement** — in `pgsql/contract_payment_status_workflow.sql`, replace the whole `contract_recompute_outstanding` function + its trigger with:

```sql
-- ---- Money helpers shared with pgsql/finance_foundation.sql (2026-09-28) ----
-- Payment statuses are now exactly Received / Cancelled (spec 2026-09-28 §6):
-- "partial" describes an invoice or request, not a sum of money received.
CREATE OR REPLACE FUNCTION public.finance_is_received(p_status text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT lower(btrim(COALESCE(p_status, ''))) = 'received';
$function$;

-- VND value of a payment: amount x exchangeRateToBase (VND per 1 unit of the
-- payment's currency; VND rows carry 1). NULL/0 rate -> 1.
CREATE OR REPLACE FUNCTION public.finance_payment_base_amount(p_amount double precision, p_rate double precision)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT COALESCE(p_amount, 0)::numeric * COALESCE(NULLIF(p_rate, 0), 1)::numeric;
$function$;

CREATE OR REPLACE FUNCTION public.contract_recompute_outstanding_for(p_contract_id BIGINT)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_total NUMERIC;
  v_received NUMERIC;
BEGIN
  IF p_contract_id IS NULL THEN
    RETURN;
  END IF;

  v_total := contract_resolved_total(p_contract_id);

  SELECT COALESCE(SUM(finance_payment_base_amount(p.amount, p."exchangeRateToBase")), 0)
  INTO v_received
  FROM payments p
  WHERE p."contractId" = p_contract_id
    AND finance_is_received(p."paymentStatus");

  UPDATE contracts
  SET "outStandingAmount" = GREATEST(v_total - v_received, 0),
      "paymentStatus" = CASE
        WHEN (v_total - v_received) <= 0 THEN 'paid'
        WHEN v_received > 0 THEN 'partial'
        ELSE 'unpaid'
      END
  WHERE id = p_contract_id;
END;
$function$;

-- 2026-09-28: fires on every insert/update/delete (it used to fire only on a
-- paymentStatus change, so an edited amount or a deleted payment left the
-- contract balance wrong), and recomputes both contracts when a payment is
-- moved from one contract to another.
CREATE OR REPLACE FUNCTION public.contract_recompute_outstanding()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM contract_recompute_outstanding_for(NEW."contractId");
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') AND (TG_OP = 'DELETE' OR OLD."contractId" IS DISTINCT FROM NEW."contractId") THEN
    PERFORM contract_recompute_outstanding_for(OLD."contractId");
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_payment_recompute_contract ON payments;
CREATE TRIGGER trg_payment_recompute_contract
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION public.contract_recompute_outstanding();
```

and in the backfill at the end of the file replace

```sql
  SELECT "contractId", COALESCE(SUM(amount), 0) AS total_received
  FROM payments
  WHERE "contractId" IS NOT NULL AND LOWER("paymentStatus") IN ('received', 'paid', 'completed', 'partial')
```

with

```sql
  SELECT "contractId", COALESCE(SUM(finance_payment_base_amount(amount, "exchangeRateToBase")), 0) AS total_received
  FROM payments
  WHERE "contractId" IS NOT NULL AND finance_is_received("paymentStatus")
```

- [ ] **Step 4: Run to verify it passes**

Run: `bash scripts/tests/sql/run-local.sh pgsql/tests/finance_foundation_test.sql`
Expected: `ALL FINANCE FOUNDATION CHECKS PASSED`.

---

### Task 3: Derived paid / outstanding / overdue on requests and invoices

**Files:**
- Create: `pgsql/finance_foundation.sql` (columns, date helpers, paid sums, derive triggers, roll-up triggers)
- Test: `pgsql/tests/finance_foundation_test.sql` (sections "request derive", "invoice derive", "roll-up")

**Interfaces:**
- Consumes: `finance_is_received`, `finance_payment_base_amount` (Task 2).
- Produces: columns `paymentRequests."paidAmount"`, `"outstandingAmount"`, `"overdueSince"`, `"overdueNotifiedAt"`, `"billingPlanId"`, `"cycleNo"`; `invoices."overdueSince"`, `"overdueNotifiedAt"`. Functions `finance_today() → date`, `finance_local_date(timestamptz) → date`, `finance_pr_paid(bigint) → numeric`, `finance_invoice_paid(bigint) → numeric`. Triggers `trg_finance_payment_request_derive`, `trg_finance_invoice_derive`, `trg_finance_payment_rollup`, `trg_finance_invoice_link_rollup`.

- [ ] **Step 1: Write the failing tests** — append:

```sql
-- ---- request derive: outstanding + overdue ----
DO $$
DECLARE r RECORD;
BEGIN
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount", "dueDate")
  VALUES (991000000000201, 'PR overdue', 'active', 991000000000001, 1000, now() - interval '3 days');
  SELECT * INTO r FROM "paymentRequests" WHERE id = 991000000000201;
  IF r."outstandingAmount" <> 1000 OR r."paidAmount" <> 0 THEN RAISE EXCEPTION 'FAIL: new request outstanding = requested (got %/%)', r."outstandingAmount", r."paidAmount"; END IF;
  IF r."overdueSince" IS DISTINCT FROM (finance_local_date(r."dueDate") + 1) THEN RAISE EXCEPTION 'FAIL: overdueSince = due + 1 (got %)', r."overdueSince"; END IF;

  INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount", "dueDate")
  VALUES (991000000000202, 'PR pending past due', 'pending', 991000000000001, 500, now() - interval '3 days');
  SELECT * INTO r FROM "paymentRequests" WHERE id = 991000000000202;
  IF r."overdueSince" IS NOT NULL THEN RAISE EXCEPTION 'FAIL: a pending request is never overdue'; END IF;
  UPDATE "paymentRequests" SET status = 'cancelled' WHERE id = 991000000000201;
  SELECT * INTO r FROM "paymentRequests" WHERE id = 991000000000201;
  IF r."overdueSince" IS NOT NULL THEN RAISE EXCEPTION 'FAIL: a cancelled request is never overdue'; END IF;
  UPDATE "paymentRequests" SET status = 'active' WHERE id = 991000000000201;
END $$;

-- ---- roll-up: payments -> request / invoice, both link directions ----
DO $$
DECLARE r RECORD; i RECORD;
BEGIN
  INSERT INTO payments (id, amount, "paymentStatus", "contractId", "paymentRequestId")
  VALUES (991000000000211, 400, 'Received', 991000000000001, 991000000000201);
  SELECT * INTO r FROM "paymentRequests" WHERE id = 991000000000201;
  IF r."paidAmount" <> 400 OR r."outstandingAmount" <> 600 THEN RAISE EXCEPTION 'FAIL: request paid 400 / outstanding 600 (got %/%)', r."paidAmount", r."outstandingAmount"; END IF;

  -- invoice with no deadline inherits the request's due date -> overdue
  INSERT INTO invoices (id, "invoiceNumber", status, "totalAmount", "paymentRequestId", "contractId")
  VALUES (991000000000221, 'INV-TEST-1', 'pending', 1000, 991000000000201, 991000000000001);
  SELECT * INTO i FROM invoices WHERE id = 991000000000221;
  IF i."amountPaid" <> 400 THEN RAISE EXCEPTION 'FAIL: the request''s payment counts on its single invoice (got %)', i."amountPaid"; END IF;
  IF i.status <> 'overdue' THEN RAISE EXCEPTION 'FAIL: invoice past its request due date is overdue (got %)', i.status; END IF;

  -- a payment made against the invoice only counts for the request too
  INSERT INTO payments (id, amount, "paymentStatus", "contractId", "invoiceId")
  VALUES (991000000000212, 600, 'Received', 991000000000001, 991000000000221);
  SELECT * INTO r FROM "paymentRequests" WHERE id = 991000000000201;
  SELECT * INTO i FROM invoices WHERE id = 991000000000221;
  IF r."paidAmount" <> 1000 OR r."overdueSince" IS NOT NULL THEN RAISE EXCEPTION 'FAIL: request fully paid via invoice payment, not overdue (got %, %)', r."paidAmount", r."overdueSince"; END IF;
  IF i.status <> 'paid' OR i."outStandingAmount" <> 0 THEN RAISE EXCEPTION 'FAIL: invoice paid (got %, %)', i.status, i."outStandingAmount"; END IF;

  -- overpayment never goes negative
  UPDATE payments SET amount = 900 WHERE id = 991000000000212;
  SELECT * INTO r FROM "paymentRequests" WHERE id = 991000000000201;
  SELECT * INTO i FROM invoices WHERE id = 991000000000221;
  IF r."outstandingAmount" <> 0 OR i."outStandingAmount" <> 0 OR i.status <> 'paid' THEN RAISE EXCEPTION 'FAIL: overpayment keeps outstanding at 0 (got %, %, %)', r."outstandingAmount", i."outStandingAmount", i.status; END IF;

  -- cancelling a payment takes it out; partial invoice
  UPDATE payments SET "paymentStatus" = 'Cancelled' WHERE id = 991000000000212;
  SELECT * INTO i FROM invoices WHERE id = 991000000000221;
  IF i."amountPaid" <> 400 THEN RAISE EXCEPTION 'FAIL: cancelled payment does not count (got %)', i."amountPaid"; END IF;
  UPDATE invoices SET deadline = now() + interval '5 days' WHERE id = 991000000000221;
  SELECT * INTO i FROM invoices WHERE id = 991000000000221;
  IF i.status <> 'partial' OR i."overdueSince" IS NOT NULL THEN RAISE EXCEPTION 'FAIL: own deadline in the future -> partial (got %, %)', i.status, i."overdueSince"; END IF;

  -- deleting the payment recomputes
  DELETE FROM payments WHERE id = 991000000000211;
  SELECT * INTO i FROM invoices WHERE id = 991000000000221;
  IF i."amountPaid" <> 0 OR i.status <> 'pending' THEN RAISE EXCEPTION 'FAIL: after delete -> pending, 0 paid (got %, %)', i.status, i."amountPaid"; END IF;

  -- draft and cancelled stay as set by hand
  UPDATE invoices SET status = 'draft' WHERE id = 991000000000221;
  INSERT INTO payments (id, amount, "paymentStatus", "contractId", "invoiceId")
  VALUES (991000000000213, 1000, 'Received', 991000000000001, 991000000000221);
  SELECT * INTO i FROM invoices WHERE id = 991000000000221;
  IF i.status <> 'draft' OR i."amountPaid" <> 1000 THEN RAISE EXCEPTION 'FAIL: draft keeps its status but tracks money (got %, %)', i.status, i."amountPaid"; END IF;
  DELETE FROM payments WHERE id IN (991000000000212, 991000000000213);
END $$;
```

- [ ] **Step 2: Run to verify it fails**

Run: `bash scripts/tests/sql/run-local.sh pgsql/tests/finance_foundation_test.sql`
Expected: FAIL — `column "outstandingAmount" does not exist` (or similar).

- [ ] **Step 3: Implement** — create `pgsql/finance_foundation.sql`:

```sql
-- ============================================================
-- Finance foundation (2026-09-28)
-- Spec:  docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md §2 §4 §5
-- Plan:  docs/superpowers/plans/2026-09-28-finance-p1-foundation.md
--
-- The database derives, for every Payment Request and Invoice, how much has
-- been paid, what is still owed and since when it is overdue, from Received
-- payments only (in VND), whenever a payment, request or invoice changes.
-- A daily NocoBase cron workflow (JsField/Workflow/CreateFinanceOverdueCronWorkflow.js)
-- calls finance_refresh_overdue() so rows turn overdue on the day after
-- their due date even when nothing else touches them.
--
-- Deploy order (see the plan's checklist):
--   1. pgsql/contract_payment_status_workflow.sql  (helpers used below)
--   2. pgsql/finance_foundation_audit.sql          (read-only; resolve duplicates)
--   3. this file
--   4. pgsql/finance_foundation_migrate.sql        (one-time data changes)
-- Requires payments."paymentRequestId" (JsField/RegisterPaymentRequestLinkFields.js),
-- invoices."paymentRequestId" (JsField/RegisterInvoicePaymentRequestField.js) and
-- payments."exchangeRateToBase" (pgsql/multi_currency_migration.sql).
-- Idempotent.
-- ============================================================

-- ---- Columns (registered as NocoBase fields by JsField/RegisterFinanceFoundationFields.js)
ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "paidAmount" double precision DEFAULT 0;
ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "outstandingAmount" double precision;
ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "overdueSince" date;
ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "overdueNotifiedAt" timestamp with time zone;
ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "billingPlanId" bigint;
ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "cycleNo" integer;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "overdueSince" date;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "overdueNotifiedAt" timestamp with time zone;

-- ---- Dates are business dates in Vietnam
CREATE OR REPLACE FUNCTION public.finance_today()
RETURNS date
LANGUAGE sql
STABLE
AS $function$
  SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
$function$;

CREATE OR REPLACE FUNCTION public.finance_local_date(p_ts timestamptz)
RETURNS date
LANGUAGE sql
STABLE
AS $function$
  SELECT (p_ts AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
$function$;

-- ---- What has been received against a request / an invoice (VND)
-- A request counts payments linked to it, plus payments linked only to one
-- of its (non-cancelled) invoices.
CREATE OR REPLACE FUNCTION public.finance_pr_paid(p_pr_id bigint)
RETURNS numeric
LANGUAGE sql
STABLE
AS $function$
  SELECT COALESCE(SUM(finance_payment_base_amount(p.amount, p."exchangeRateToBase")), 0)
  FROM payments p
  WHERE finance_is_received(p."paymentStatus")
    AND (
      p."paymentRequestId" = p_pr_id
      OR (
        p."paymentRequestId" IS NULL
        AND p."invoiceId" IN (
          SELECT i.id FROM invoices i
          WHERE i."paymentRequestId" = p_pr_id
            AND lower(btrim(COALESCE(i.status, ''))) <> 'cancelled'
        )
      )
    );
$function$;

-- An invoice counts payments linked to it, plus payments linked only to its
-- request when it is that request's single non-cancelled invoice.
CREATE OR REPLACE FUNCTION public.finance_invoice_paid(p_invoice_id bigint)
RETURNS numeric
LANGUAGE sql
STABLE
AS $function$
  SELECT COALESCE(SUM(finance_payment_base_amount(p.amount, p."exchangeRateToBase")), 0)
  FROM payments p
  JOIN invoices i ON i.id = p_invoice_id
  WHERE finance_is_received(p."paymentStatus")
    AND (
      p."invoiceId" = i.id
      OR (
        p."invoiceId" IS NULL
        AND i."paymentRequestId" IS NOT NULL
        AND p."paymentRequestId" = i."paymentRequestId"
        AND (
          SELECT count(*) FROM invoices i2
          WHERE i2."paymentRequestId" = i."paymentRequestId"
            AND lower(btrim(COALESCE(i2.status, ''))) <> 'cancelled'
        ) = 1
      )
    );
$function$;

-- ---- Request: outstanding + overdue, derived on every write
-- overdueNotifiedAt is cleared whenever the request stops being overdue, so a
-- request that becomes overdue again is announced again (plan 5).
CREATE OR REPLACE FUNCTION public.finance_payment_request_derive()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_due date;
BEGIN
  NEW."paidAmount" := COALESCE(NEW."paidAmount", 0);
  NEW."outstandingAmount" := GREATEST(COALESCE(NEW."requestedAmount", 0) - NEW."paidAmount", 0);
  v_due := finance_local_date(NEW."dueDate");
  IF NEW.status = 'active' AND v_due IS NOT NULL AND v_due < finance_today() AND NEW."outstandingAmount" > 0 THEN
    NEW."overdueSince" := v_due + 1;
  ELSE
    NEW."overdueSince" := NULL;
    NEW."overdueNotifiedAt" := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_payment_request_derive ON "paymentRequests";
CREATE TRIGGER trg_finance_payment_request_derive
  BEFORE INSERT OR UPDATE ON "paymentRequests"
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_payment_request_derive();

-- ---- Invoice: outstanding + status + overdue, derived on every write
-- draft / cancelled are set by hand and kept; otherwise paid > overdue >
-- partial > pending. Due date = the invoice's own deadline, else its request's.
CREATE OR REPLACE FUNCTION public.finance_invoice_derive()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_total numeric;
  v_paid numeric;
  v_due date;
BEGIN
  v_total := COALESCE(NEW."totalAmount", 0);
  v_paid := COALESCE(NEW."amountPaid", 0);
  NEW."amountPaid" := v_paid;
  NEW."outStandingAmount" := GREATEST(v_total - v_paid, 0);

  IF lower(btrim(COALESCE(NEW.status, ''))) IN ('draft', 'cancelled') THEN
    NEW."overdueSince" := NULL;
    NEW."overdueNotifiedAt" := NULL;
    RETURN NEW;
  END IF;

  v_due := finance_local_date(COALESCE(
    NEW.deadline,
    (SELECT pr."dueDate" FROM "paymentRequests" pr WHERE pr.id = NEW."paymentRequestId")
  ));

  NEW.status := CASE
    WHEN v_total > 0 AND v_paid >= v_total THEN 'paid'
    WHEN v_due IS NOT NULL AND v_due < finance_today() AND v_total > v_paid THEN 'overdue'
    WHEN v_paid > 0 THEN 'partial'
    ELSE 'pending'
  END;

  IF NEW.status = 'overdue' THEN
    NEW."overdueSince" := v_due + 1;
  ELSE
    NEW."overdueSince" := NULL;
    NEW."overdueNotifiedAt" := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_invoice_derive ON invoices;
CREATE TRIGGER trg_finance_invoice_derive
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_invoice_derive();

-- ---- Payments roll up into their request(s) and invoice(s)
CREATE OR REPLACE FUNCTION public.finance_payment_rollup()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_pr_ids bigint[] := ARRAY[]::bigint[];
  v_inv_ids bigint[] := ARRAY[]::bigint[];
  v_id bigint;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_pr_ids := v_pr_ids || NEW."paymentRequestId";
    v_inv_ids := v_inv_ids || NEW."invoiceId";
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_pr_ids := v_pr_ids || OLD."paymentRequestId";
    v_inv_ids := v_inv_ids || OLD."invoiceId";
  END IF;

  -- an invoice's request counts payments made on the invoice, and a request's
  -- single invoice counts payments made on the request
  v_pr_ids := v_pr_ids || ARRAY(
    SELECT "paymentRequestId" FROM invoices WHERE id = ANY (v_inv_ids) AND "paymentRequestId" IS NOT NULL
  );
  v_inv_ids := v_inv_ids || ARRAY(
    SELECT id FROM invoices WHERE "paymentRequestId" = ANY (v_pr_ids)
  );

  FOR v_id IN SELECT DISTINCT x FROM unnest(v_inv_ids) AS x WHERE x IS NOT NULL LOOP
    UPDATE invoices SET "amountPaid" = finance_invoice_paid(v_id) WHERE id = v_id;
  END LOOP;
  FOR v_id IN SELECT DISTINCT x FROM unnest(v_pr_ids) AS x WHERE x IS NOT NULL LOOP
    UPDATE "paymentRequests" SET "paidAmount" = finance_pr_paid(v_id) WHERE id = v_id;
  END LOOP;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_payment_rollup ON payments;
CREATE TRIGGER trg_finance_payment_rollup
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_payment_rollup();

-- ---- An invoice created / linked / cancelled changes what both sides count.
-- The inner UPDATEs set only amountPaid / paidAmount, which are not in the
-- OF-list below, so this does not re-fire itself.
CREATE OR REPLACE FUNCTION public.finance_invoice_link_rollup()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_id bigint;
BEGIN
  IF TG_OP <> 'DELETE' THEN
    UPDATE invoices SET "amountPaid" = finance_invoice_paid(NEW.id) WHERE id = NEW.id;
  END IF;
  FOR v_id IN
    SELECT DISTINCT x FROM unnest(ARRAY[
      CASE WHEN TG_OP <> 'DELETE' THEN NEW."paymentRequestId" END,
      CASE WHEN TG_OP <> 'INSERT' THEN OLD."paymentRequestId" END
    ]) AS x
    WHERE x IS NOT NULL
  LOOP
    UPDATE "paymentRequests" SET "paidAmount" = finance_pr_paid(v_id) WHERE id = v_id;
  END LOOP;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_invoice_link_rollup ON invoices;
CREATE TRIGGER trg_finance_invoice_link_rollup
  AFTER INSERT OR DELETE OR UPDATE OF "paymentRequestId", status, "totalAmount" ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_invoice_link_rollup();
```

- [ ] **Step 4: Run to verify it passes**

Run: `bash scripts/tests/sql/run-local.sh pgsql/tests/finance_foundation_test.sql`
Expected: `ALL FINANCE FOUNDATION CHECKS PASSED`.

---

### Task 4: One open request per billing unit

**Files:**
- Modify: `pgsql/finance_foundation.sql` (append indexes)
- Modify: `pgsql/unified_contract_payment_schedule.sql:275-277` and `:489`
- Modify: `pgsql/retainer_billing_run_due.sql` (INSERT and its guard)
- Test: `pgsql/tests/finance_foundation_test.sql` (sections "one open request", "retainer run")

**Interfaces:**
- Produces: indexes `ux_payment_requests_schedule_open`, `ux_payment_requests_project_service_open`, `ux_payment_requests_plan_cycle_open`. Retainer requests carry `billingPlanId`, `cycleNo`, `dueDate = now() + 7 days`, `status = 'active'`.

- [ ] **Step 1: Write the failing tests** — append:

```sql
-- ---- one open request per unit; cancelled ones don't count ----
DO $$
DECLARE blocked boolean;
BEGIN
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "contractPaymentScheduleId", "requestedAmount")
  VALUES (991000000000301, 'Unit A #1', 'active', 991000000000001, 991000000000900, 100);
  blocked := false;
  BEGIN
    INSERT INTO "paymentRequests" (id, title, status, "contractId", "contractPaymentScheduleId", "requestedAmount")
    VALUES (991000000000302, 'Unit A #2', 'pending', 991000000000001, 991000000000900, 100);
  EXCEPTION WHEN unique_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: a second open request for one schedule row must be blocked'; END IF;

  UPDATE "paymentRequests" SET status = 'cancelled' WHERE id = 991000000000301;
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "contractPaymentScheduleId", "requestedAmount")
  VALUES (991000000000303, 'Unit A #3', 'active', 991000000000001, 991000000000900, 100);

  INSERT INTO "paymentRequests" (id, title, status, "contractId", "projectServiceId", "requestedAmount")
  VALUES (991000000000304, 'Service #1', 'active', 991000000000001, 991000000000901, 100);
  blocked := false;
  BEGIN
    INSERT INTO "paymentRequests" (id, title, status, "contractId", "projectServiceId", "requestedAmount")
    VALUES (991000000000305, 'Service #2', 'active', 991000000000001, 991000000000901, 100);
  EXCEPTION WHEN unique_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'FAIL: a second open request for one case service must be blocked'; END IF;
END $$;

-- ---- By Service: a cancelled request lets the trigger create a new one ----
DO $$
DECLARE n int;
BEGIN
  INSERT INTO projects (id, "contractId", status) VALUES (991000000000401, 991000000000001, 'in_progress');
  UPDATE contracts SET "contractType" = 'byService' WHERE id = 991000000000001;
  INSERT INTO "projectServices" (id, "projectId", "serviceName", "totalAmount", "pricingMode")
  VALUES (991000000000402, 991000000000401, 'Test service', 300, 'line');
  INSERT INTO tasks (id, title, status, "projectId", "projectServiceId", "isPaymentTrigger")
  VALUES (991000000000403, 'Trigger task', 'in_progress', 991000000000401, 991000000000402, true);
  UPDATE tasks SET status = 'done' WHERE id = 991000000000403;
  SELECT count(*) INTO n FROM "paymentRequests" WHERE "projectServiceId" = 991000000000402;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: done trigger task creates the service request (got %)', n; END IF;

  UPDATE "paymentRequests" SET status = 'cancelled' WHERE "projectServiceId" = 991000000000402;
  UPDATE tasks SET status = 'in_progress' WHERE id = 991000000000403;
  UPDATE tasks SET status = 'done' WHERE id = 991000000000403;
  SELECT count(*) INTO n FROM "paymentRequests" WHERE "projectServiceId" = 991000000000402 AND status <> 'cancelled';
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: after cancelling, the trigger creates a new request (got %)', n; END IF;
  UPDATE contracts SET "contractType" = 'byCase' WHERE id = 991000000000001;
END $$;

-- ---- Retainer run: active, due in 7 days, plan + cycle recorded ----
DO $$
DECLARE r RECORD; n int;
BEGIN
  INSERT INTO "contractBillingPlans" (id, "contractId", "planType", status, "totalAmount", "retainerTotalCycles",
                                      "retainerCyclesBilled", "retainerUnit", "nextBillingDate")
  VALUES (991000000000501, 991000000000001, 'retainer', 'active', 900, 3, 0, 'month', finance_today() - 1);
  PERFORM * FROM retainer_billing_run_due();
  SELECT * INTO r FROM "paymentRequests" WHERE "billingPlanId" = 991000000000501 AND "cycleNo" = 1;
  IF r.id IS NULL THEN RAISE EXCEPTION 'FAIL: retainer request carries billingPlanId + cycleNo'; END IF;
  IF r.status <> 'active' OR r."dueDate" IS NULL THEN RAISE EXCEPTION 'FAIL: retainer request is active with a due date (got %, %)', r.status, r."dueDate"; END IF;

  -- a request already existing for the cycle is skipped, the plan still advances
  UPDATE "contractBillingPlans" SET "retainerCyclesBilled" = 0, "nextBillingDate" = finance_today() - 1 WHERE id = 991000000000501;
  PERFORM * FROM retainer_billing_run_due();
  SELECT count(*) INTO n FROM "paymentRequests" WHERE "billingPlanId" = 991000000000501 AND "cycleNo" = 1;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: no second request for the same cycle (got %)', n; END IF;
  SELECT "retainerCyclesBilled" INTO n FROM "contractBillingPlans" WHERE id = 991000000000501;
  IF n <> 1 THEN RAISE EXCEPTION 'FAIL: the plan still advances past a cycle that already had a request (got %)', n; END IF;
END $$;
```

- [ ] **Step 2: Run to verify it fails**

Run: `bash scripts/tests/sql/run-local.sh pgsql/tests/finance_foundation_test.sql`
Expected: `FAIL: a second open request for one schedule row must be blocked`.

- [ ] **Step 3: Implement**

Append to `pgsql/finance_foundation.sql`:

```sql
-- ---- One open request per billing unit (spec §2). Cancelled requests don't
-- count, so a unit can be billed again after its request is cancelled.
-- pgsql/finance_foundation_audit.sql lists the rows that would block these.
CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_requests_schedule_open
  ON "paymentRequests" ("contractPaymentScheduleId")
  WHERE "contractPaymentScheduleId" IS NOT NULL AND status IS DISTINCT FROM 'cancelled';

CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_requests_project_service_open
  ON "paymentRequests" ("projectServiceId")
  WHERE "projectServiceId" IS NOT NULL AND "contractPaymentScheduleId" IS NULL
    AND status IS DISTINCT FROM 'cancelled';

CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_requests_plan_cycle_open
  ON "paymentRequests" ("billingPlanId", "cycleNo")
  WHERE "billingPlanId" IS NOT NULL AND "cycleNo" IS NOT NULL AND status IS DISTINCT FROM 'cancelled';
```

In `pgsql/unified_contract_payment_schedule.sql`, `by_case_one_time_ensure_payment_request`: replace

```sql
     OR EXISTS (SELECT 1 FROM "paymentRequests" WHERE "contractId" = p_contract_id)
```

with

```sql
     OR EXISTS (
       SELECT 1 FROM "paymentRequests"
       WHERE "contractId" = p_contract_id AND status IS DISTINCT FROM 'cancelled'
     )
```

and in `by_service_check_and_create_payment_request` replace

```sql
  IF EXISTS (SELECT 1 FROM "paymentRequests" WHERE "projectServiceId" = p_project_service_id) THEN
```

with

```sql
  -- 2026-09-28: a cancelled request no longer counts (spec §7.1) — the unit
  -- can be billed again; ux_payment_requests_project_service_open enforces it.
  IF EXISTS (
    SELECT 1 FROM "paymentRequests"
    WHERE "projectServiceId" = p_project_service_id AND status IS DISTINCT FROM 'cancelled'
  ) THEN
```

In `pgsql/retainer_billing_run_due.sql`: add `v_inserted_id BIGINT;` to DECLARE; update the header comment's step 2 to "INSERT one paymentRequests row, status 'active' (2026-09-28: statuses are pending/active/cancelled), due in 7 days, carrying billingPlanId + cycleNo; a cycle that already has an open request is skipped (ux_payment_requests_plan_cycle_open) but the plan still advances"; replace the INSERT with:

```sql
    v_inserted_id := NULL;
    INSERT INTO "paymentRequests" (
      id, title, status, "contractId", "customerId", "internalCompanyId",
      "requestedAmount", "dueDate", "billingPlanId", "cycleNo", "createdAt", "updatedAt"
    ) VALUES (
      v_pr_id, v_title, 'active', v_contract.id, v_contract."customerId",
      v_contract."internalCompanyId", v_amount, now() + INTERVAL '7 days', v_plan.id, v_period, now(), now()
    )
    ON CONFLICT ("billingPlanId", "cycleNo")
      WHERE "billingPlanId" IS NOT NULL AND "cycleNo" IS NOT NULL AND status IS DISTINCT FROM 'cancelled'
      DO NOTHING
    RETURNING id INTO v_inserted_id;
```

and wrap the four `payment_request_id := … RETURN NEXT;` lines at the end of the loop body in `IF v_inserted_id IS NOT NULL THEN … END IF;` (the plan UPDATE above them stays unconditional).

- [ ] **Step 4: Run to verify it passes**

Run: `bash scripts/tests/sql/run-local.sh pgsql/tests/finance_foundation_test.sql`
Expected: `ALL FINANCE FOUNDATION CHECKS PASSED`.

---

### Task 5: Daily overdue refresh

**Files:**
- Modify: `pgsql/finance_foundation.sql` (append `finance_refresh_overdue`)
- Create: `JsField/Workflow/CreateFinanceOverdueCronWorkflow.js`
- Test: `pgsql/tests/finance_foundation_test.sql` (section "overdue refresh")

**Interfaces:**
- Produces: `finance_refresh_overdue() RETURNS TABLE (payment_requests_marked integer, invoices_marked integer)` — re-derives active requests and pending/partial invoices; counts rows that are overdue after the call and were not before. Plan 5 adds the notification step that reads `overdueNotifiedAt`.

- [ ] **Step 1: Write the failing test** — append:

```sql
-- ---- overdue refresh: rows whose due date passed silently ----
DO $$
DECLARE r RECORD; c RECORD;
BEGIN
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount", "dueDate")
  VALUES (991000000000601, 'Silent due', 'active', 991000000000001, 100, now() + interval '2 days');
  -- simulate "the due date passed while nothing touched the row"
  ALTER TABLE "paymentRequests" DISABLE TRIGGER trg_finance_payment_request_derive;
  UPDATE "paymentRequests" SET "dueDate" = now() - interval '2 days' WHERE id = 991000000000601;
  ALTER TABLE "paymentRequests" ENABLE TRIGGER trg_finance_payment_request_derive;

  SELECT * INTO c FROM finance_refresh_overdue();
  IF c.payment_requests_marked < 1 THEN RAISE EXCEPTION 'FAIL: refresh marks the silently overdue request'; END IF;
  SELECT * INTO r FROM "paymentRequests" WHERE id = 991000000000601;
  IF r."overdueSince" IS NULL THEN RAISE EXCEPTION 'FAIL: overdueSince set by the refresh'; END IF;

  SELECT * INTO c FROM finance_refresh_overdue();
  IF c.payment_requests_marked <> 0 THEN RAISE EXCEPTION 'FAIL: a second run marks nothing new (got %)', c.payment_requests_marked; END IF;

  INSERT INTO payments (id, amount, "paymentStatus", "contractId", "paymentRequestId")
  VALUES (991000000000602, 100, 'Received', 991000000000001, 991000000000601);
  SELECT * INTO r FROM "paymentRequests" WHERE id = 991000000000601;
  IF r."overdueSince" IS NOT NULL THEN RAISE EXCEPTION 'FAIL: paying clears overdueSince'; END IF;
END $$;
```

- [ ] **Step 2: Run to verify it fails**

Run: `bash scripts/tests/sql/run-local.sh pgsql/tests/finance_foundation_test.sql`
Expected: FAIL — `function finance_refresh_overdue() does not exist`.

- [ ] **Step 3: Implement** — append to `pgsql/finance_foundation.sql`:

```sql
-- ---- Daily: turn rows overdue on the day after their due date even when no
-- payment/request/invoice write touched them. A no-op UPDATE lets the BEFORE
-- triggers above re-derive. Called by the "Finance - daily overdue refresh"
-- workflow (JsField/Workflow/CreateFinanceOverdueCronWorkflow.js).
CREATE OR REPLACE FUNCTION public.finance_refresh_overdue()
RETURNS TABLE (payment_requests_marked integer, invoices_marked integer)
LANGUAGE plpgsql
AS $function$
BEGIN
  WITH touched AS (
    UPDATE "paymentRequests"
    SET "updatedAt" = "updatedAt"
    WHERE status = 'active'
      AND "overdueSince" IS NULL
      AND "dueDate" IS NOT NULL
      AND finance_local_date("dueDate") < finance_today()
      AND COALESCE("requestedAmount", 0) > COALESCE("paidAmount", 0)
    RETURNING "overdueSince"
  )
  SELECT count(*) FILTER (WHERE "overdueSince" IS NOT NULL)::integer INTO payment_requests_marked FROM touched;

  WITH touched AS (
    UPDATE invoices
    SET "updatedAt" = "updatedAt"
    WHERE lower(btrim(COALESCE(status, ''))) IN ('pending', 'partial')
    RETURNING status
  )
  SELECT count(*) FILTER (WHERE status = 'overdue')::integer INTO invoices_marked FROM touched;

  RETURN NEXT;
END;
$function$;
```

Create `JsField/Workflow/CreateFinanceOverdueCronWorkflow.js`:

```js
// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Finance P1 (2026-09-28). Daily at 00:10 (server time) runs
//     SELECT * FROM public.finance_refresh_overdue()
// so Payment Requests and Invoices turn overdue on the day after their due
// date even when nothing else touches them (pgsql/finance_foundation.sql).
// Notifications for newly overdue rows are added by Finance P5.
//
// Run pgsql/finance_foundation.sql FIRST (the SQL node calls it).
// After running this script: Admin -> Workflow -> toggle this workflow
// Disabled -> Enabled once (same in-memory-cache caveat as every
// script-created workflow in this project).
//
// How to run: paste into the browser dev console on any admin page (ctx in
// scope) or a temporary Action block's onClick. Idempotent — deletes any
// workflow with this title first, then rebuilds.
// ============================================================

const WORKFLOW_TITLE = "Finance - daily overdue refresh";

const workflowPayload = () => ({
  title: WORKFLOW_TITLE,
  type: "schedule",
  enabled: true,
  sync: false,
  current: true,
  config: {
    mode: 0,
    startsOn: new Date().toISOString(),
    repeat: "10 0 * * *",
  },
});

const sqlNodePayload = () => ({
  type: "sql",
  key: "financeRefreshOverdue",
  title: "Refresh overdue requests and invoices (SQL)",
  upstreamId: null,
  branchIndex: null,
  config: {
    dataSource: "main",
    sql: "SELECT * FROM public.finance_refresh_overdue()",
    withMeta: false,
  },
});

(async () => {
  const existing = await ctx.api.request({
    url: "workflows:list",
    params: { filter: { title: WORKFLOW_TITLE }, paginate: false },
  });
  for (const row of existing?.data?.data || []) {
    await ctx.api.request({ url: "workflows:destroy", method: "POST", params: { filterByTk: row.id } });
    console.log(`[deleted] workflow "${WORKFLOW_TITLE}" id=${row.id}`);
  }

  const created = await ctx.api.request({ url: "workflows:create", method: "POST", data: workflowPayload() });
  const workflowId = created?.data?.data?.id;
  if (!workflowId) {
    console.error("[fail] workflow create returned no id", created?.data);
    return;
  }
  console.log(`[created] workflow id=${workflowId}`);

  const res = await ctx.api.request({ url: `workflows/${workflowId}/nodes:create`, method: "POST", data: sqlNodePayload() });
  console.log(`[created] node "${res?.data?.data?.key}" id=${res?.data?.data?.id}`);

  console.log("Done. Next: Admin -> Workflow -> open this workflow -> toggle Disabled then Enabled once (cache refresh).");
})();
```

- [ ] **Step 4: Run to verify it passes**

Run: `bash scripts/tests/sql/run-local.sh pgsql/tests/finance_foundation_test.sql`
Expected: `ALL FINANCE FOUNDATION CHECKS PASSED`.

---

### Task 6: Audit and one-time migration

**Files:**
- Create: `pgsql/finance_foundation_audit.sql`
- Create: `pgsql/finance_foundation_migrate.sql`
- Create: `pgsql/tests/finance_foundation_migrate_test.sql`

**Interfaces:**
- Consumes: everything from Tasks 2–5.
- Produces: after migrate — no `submitted/checking/approved/converted/rejected` requests; payments `Received`/`Cancelled` where the old value was known; retainer requests backfilled with plan + cycle; every request/invoice's paid amount recomputed.

- [ ] **Step 1: Write the failing test** — `pgsql/tests/finance_foundation_migrate_test.sql`:

```sql
-- Self-checking test for pgsql/finance_foundation_migrate.sql. LOCAL ONLY —
-- the migrate file commits its own transaction, so this test leaves its
-- fixture rows behind; it is meant for the throwaway cluster of
-- scripts/tests/sql/run-local.sh (run from the repo root), never for dev.
--   bash scripts/tests/sql/run-local.sh pgsql/tests/finance_foundation_migrate_test.sql
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount")
VALUES (992000000000001, 'MIG', 'Migrate test', 'retainer', 900);
INSERT INTO "contractBillingPlans" (id, "contractId", "planType", status, "totalAmount", "retainerTotalCycles")
VALUES (992000000000002, 992000000000001, 'retainer', 'active', 900, 3);
INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount") VALUES
  (992000000000011, 'Payment request - MIG - Migrate test - Retainer period 1', 'submitted', 992000000000001, 300),
  (992000000000012, 'Payment request - MIG - Migrate test - Retainer period 2', 'approved', 992000000000001, 300),
  (992000000000013, 'Old rejected', 'rejected', 992000000000001, 300);
INSERT INTO payments (id, amount, "paymentStatus", "contractId", "paymentRequestId") VALUES
  (992000000000021, 100, 'Partial', 992000000000001, 992000000000011),
  (992000000000022, 50, 'void', 992000000000001, 992000000000011);
\i pgsql/finance_foundation_migrate.sql
DO $$
DECLARE r RECORD; s text;
BEGIN
  SELECT * INTO r FROM "paymentRequests" WHERE id = 992000000000011;
  IF r.status <> 'active' OR r."billingPlanId" <> 992000000000002 OR r."cycleNo" <> 1 THEN
    RAISE EXCEPTION 'FAIL: submitted -> active with plan/cycle (got %, %, %)', r.status, r."billingPlanId", r."cycleNo";
  END IF;
  IF r."paidAmount" <> 100 THEN RAISE EXCEPTION 'FAIL: Partial payment became Received and counts (got %)', r."paidAmount"; END IF;
  SELECT status INTO s FROM "paymentRequests" WHERE id = 992000000000013;
  IF s <> 'cancelled' THEN RAISE EXCEPTION 'FAIL: rejected -> cancelled (got %)', s; END IF;
  SELECT "paymentStatus" INTO s FROM payments WHERE id = 992000000000022;
  IF s <> 'Cancelled' THEN RAISE EXCEPTION 'FAIL: void -> Cancelled (got %)', s; END IF;
  RAISE NOTICE 'ALL FINANCE MIGRATE CHECKS PASSED';
END $$;
```

- [ ] **Step 2: Run to verify it fails**

Run (from repo root): `bash scripts/tests/sql/run-local.sh pgsql/tests/finance_foundation_migrate_test.sql`
Expected: FAIL — `pgsql/finance_foundation_migrate.sql: No such file or directory`.

- [ ] **Step 3: Implement** — `pgsql/finance_foundation_audit.sql`:

```sql
-- ============================================================
-- Finance P1 — READ-ONLY audit. Run BEFORE pgsql/finance_foundation.sql.
-- Plan: docs/superpowers/plans/2026-09-28-finance-p1-foundation.md
-- 1. Duplicate open requests per billing unit: finance_foundation.sql's
--    unique indexes cannot be created while any row is listed here. Cancel
--    (status = 'cancelled') or merge the extras first.
-- 2. Statuses in use: everything outside the new vocabulary is listed so
--    you know what finance_foundation_migrate.sql will map and what it leaves.
-- 3. Invoices whose status will change once it is derived from payments.
-- ============================================================

-- 1. duplicates
SELECT 'schedule row' AS unit, "contractPaymentScheduleId" AS unit_id, count(*) AS open_requests,
       array_agg(id ORDER BY id) AS request_ids
FROM "paymentRequests"
WHERE "contractPaymentScheduleId" IS NOT NULL AND status IS DISTINCT FROM 'cancelled'
  AND status NOT IN ('rejected')
GROUP BY "contractPaymentScheduleId" HAVING count(*) > 1
UNION ALL
SELECT 'case service', "projectServiceId", count(*), array_agg(id ORDER BY id)
FROM "paymentRequests"
WHERE "projectServiceId" IS NOT NULL AND "contractPaymentScheduleId" IS NULL
  AND status IS DISTINCT FROM 'cancelled' AND status NOT IN ('rejected')
GROUP BY "projectServiceId" HAVING count(*) > 1;

-- 2. statuses in use
SELECT 'paymentRequests.status' AS field, status AS value, count(*) FROM "paymentRequests" GROUP BY status
UNION ALL
SELECT 'payments.paymentStatus', "paymentStatus", count(*) FROM payments GROUP BY "paymentStatus"
UNION ALL
SELECT 'invoices.status', status, count(*) FROM invoices GROUP BY status
ORDER BY 1, 2;

-- 3. invoices whose status will change (paid amount = Received payments linked
--    to the invoice; draft/cancelled are kept)
WITH paid AS (
  SELECT i.id, i."invoiceNumber", i.status, COALESCE(i."totalAmount", 0) AS total,
         COALESCE((
           SELECT SUM(COALESCE(p.amount, 0) * COALESCE(NULLIF(p."exchangeRateToBase", 0), 1))
           FROM payments p
           WHERE p."invoiceId" = i.id
             AND lower(btrim(COALESCE(p."paymentStatus", ''))) IN ('received', 'paid', 'completed', 'partial')
         ), 0) AS received,
         (COALESCE(i.deadline, (SELECT pr."dueDate" FROM "paymentRequests" pr WHERE pr.id = i."paymentRequestId"))
            AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS due
  FROM invoices i
  WHERE lower(btrim(COALESCE(i.status, ''))) NOT IN ('draft', 'cancelled')
)
SELECT id, "invoiceNumber", status AS current_status,
       CASE
         WHEN total > 0 AND received >= total THEN 'paid'
         WHEN due IS NOT NULL AND due < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND total > received THEN 'overdue'
         WHEN received > 0 THEN 'partial'
         ELSE 'pending'
       END AS derived_status,
       total, received
FROM paid
WHERE lower(btrim(COALESCE(status, ''))) IS DISTINCT FROM CASE
         WHEN total > 0 AND received >= total THEN 'paid'
         WHEN due IS NOT NULL AND due < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND total > received THEN 'overdue'
         WHEN received > 0 THEN 'partial'
         ELSE 'pending'
       END
ORDER BY id;
```

`pgsql/finance_foundation_migrate.sql`:

```sql
-- ============================================================
-- Finance P1 — ONE-TIME data migration. Run AFTER pgsql/finance_foundation.sql.
-- Plan: docs/superpowers/plans/2026-09-28-finance-p1-foundation.md
-- Safe to re-run (every UPDATE only touches rows not yet migrated).
-- ============================================================
BEGIN;

-- Request statuses: pending / active / cancelled only (spec §4)
UPDATE "paymentRequests" SET status = 'active'
WHERE status IN ('submitted', 'checking', 'approved', 'converted');
UPDATE "paymentRequests" SET status = 'cancelled'
WHERE status IN ('rejected', 'canceled');

-- Payment statuses: Received / Cancelled only (spec §6). Unknown values
-- (e.g. Pending, Planned) are left as they are and reported below.
UPDATE payments SET "paymentStatus" = 'Received'
WHERE lower(btrim("paymentStatus")) IN ('received', 'paid', 'completed', 'partial')
  AND "paymentStatus" IS DISTINCT FROM 'Received';
UPDATE payments SET "paymentStatus" = 'Cancelled'
WHERE lower(btrim("paymentStatus")) IN ('cancelled', 'canceled', 'void')
  AND "paymentStatus" IS DISTINCT FROM 'Cancelled';

-- Retainer requests: plan + cycle from the title "... - Retainer period N",
-- only when the contract has exactly one retainer plan, and only the oldest
-- open request per (plan, cycle) so the unique index is never hit.
WITH candidates AS (
  SELECT pr.id, bp.id AS plan_id,
         substring(pr.title FROM 'Retainer period ([0-9]+)$')::int AS cycle_no,
         row_number() OVER (
           PARTITION BY bp.id, substring(pr.title FROM 'Retainer period ([0-9]+)$')
           ORDER BY pr.id
         ) AS rn
  FROM "paymentRequests" pr
  JOIN "contractBillingPlans" bp ON bp."contractId" = pr."contractId" AND bp."planType" = 'retainer'
  WHERE pr."billingPlanId" IS NULL
    AND pr.status IS DISTINCT FROM 'cancelled'
    AND pr.title ~ 'Retainer period [0-9]+$'
    AND (SELECT count(*) FROM "contractBillingPlans" b2
         WHERE b2."contractId" = pr."contractId" AND b2."planType" = 'retainer') = 1
)
UPDATE "paymentRequests" pr
SET "billingPlanId" = c.plan_id, "cycleNo" = c.cycle_no
FROM candidates c
WHERE pr.id = c.id AND c.rn = 1
  AND NOT EXISTS (
    SELECT 1 FROM "paymentRequests" x
    WHERE x."billingPlanId" = c.plan_id AND x."cycleNo" = c.cycle_no AND x.status IS DISTINCT FROM 'cancelled'
  );

-- Paid amounts (the BEFORE triggers derive outstanding / overdue / status)
UPDATE invoices SET "amountPaid" = finance_invoice_paid(id);
UPDATE "paymentRequests" SET "paidAmount" = finance_pr_paid(id);

COMMIT;

-- Left for a human decision:
SELECT 'payments.paymentStatus not migrated' AS check, "paymentStatus" AS value, count(*)
FROM payments
WHERE lower(btrim(COALESCE("paymentStatus", ''))) NOT IN ('received', 'cancelled')
GROUP BY "paymentStatus"
UNION ALL
SELECT 'paymentRequests.status not migrated', status, count(*)
FROM "paymentRequests"
WHERE status IS NULL OR status NOT IN ('pending', 'active', 'cancelled')
GROUP BY status;
```

- [ ] **Step 4: Run to verify it passes**

Run (from repo root): `bash scripts/tests/sql/run-local.sh pgsql/tests/finance_foundation_migrate_test.sql pgsql/tests/finance_foundation_test.sql`
Expected: `ALL FINANCE MIGRATE CHECKS PASSED` and `ALL FINANCE FOUNDATION CHECKS PASSED`.

---

### Task 7: JS status vocabulary, field registration, static checks

**Files:**
- Modify: `All Module/Payment/PaymentRequestCreateBlock.js:1296`
- Modify: `All Module/Contract/ContractDetailView.js:5454-5470`, `:6181`
- Modify: `All Module/Contract/ContractPaymentScheduleDetailBlock.js:686-702`, `:1405`
- Modify: `JsField/Workflow/CreateContractBillingPlansWorkflow.js:127`
- Modify: `All Module/Payment/PaymentCreateBlock.js:35-36`, `:102-107`, `:1852`
- Modify: `All Module/Payment/PaymentContractDetailBlock.js:19`
- Create: `JsField/RegisterFinanceFoundationFields.js`
- Create: `scripts/tests/finance-foundation.test.js`

**Interfaces:**
- Produces: request creation from JS writes `status: "active"`; payment forms only offer `Received` / `Cancelled`; `REQUESTED_PR_STATUSES = ["active"]`.

- [ ] **Step 1: Write the failing test** — `scripts/tests/finance-foundation.test.js`:

```js
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// Finance P1 (2026-09-28): one status vocabulary everywhere.
// Payment Requests: pending / active / cancelled. Payments: Received / Cancelled.
// The SQL behaviour is exercised by pgsql/tests/finance_foundation_test.sql;
// this keeps the JS blocks and the SQL files in step.
const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

// ---- JS never creates a request as "submitted" ----
for (const rel of [
  "All Module/Payment/PaymentRequestCreateBlock.js",
  "All Module/Contract/ContractDetailView.js",
  "All Module/Contract/ContractPaymentScheduleDetailBlock.js",
  "JsField/Workflow/CreateContractBillingPlansWorkflow.js",
]) {
  const src = read(rel);
  assert.ok(!/status:\s*"submitted"/.test(src), `${rel}: no request is created as "submitted"`);
}
for (const rel of ["All Module/Payment/PaymentRequestCreateBlock.js", "All Module/Contract/ContractDetailView.js", "All Module/Contract/ContractPaymentScheduleDetailBlock.js"]) {
  assert.ok(/status:\s*"active"/.test(read(rel)), `${rel}: requests are created "active"`);
}
for (const rel of ["All Module/Contract/ContractDetailView.js", "All Module/Contract/ContractPaymentScheduleDetailBlock.js"]) {
  const src = read(rel);
  assert.ok(/const REQUESTED_PR_STATUSES = \["active"\];/.test(src), `${rel}: requested = active`);
  for (const gone of ["submitted:", "checking:", "approved:", "converted:", "rejected:"]) {
    assert.ok(!src.includes(`  ${gone} { label:`), `${rel}: PR_STATUS_META has no ${gone}`);
  }
}

// ---- payments: Received / Cancelled only ----
{
  const src = read("All Module/Payment/PaymentCreateBlock.js");
  assert.ok(/const ACTUAL_PAYMENT_STATUSES = \["received"\];/.test(src), "PaymentCreateBlock: only received counts");
  assert.ok(/const FINAL_STATUSES = \["received"\];/.test(src), "PaymentCreateBlock: final = received");
  assert.ok(/options: \["Received", "Cancelled"\]\.map/.test(src), "PaymentCreateBlock: status options");
  const start = src.indexOf("const deriveActualPaymentStatus");
  const body = src.slice(start, src.indexOf("};", start));
  assert.ok(!body.includes("Partial"), "deriveActualPaymentStatus never returns Partial");
}
assert.ok(
  /const ACTUAL_PAYMENT_STATUSES = \["received"\];/.test(read("All Module/Payment/PaymentContractDetailBlock.js")),
  "PaymentContractDetailBlock: only received counts",
);

// ---- SQL shape ----
{
  const sql = read("pgsql/finance_foundation.sql");
  for (const name of [
    "ux_payment_requests_schedule_open",
    "ux_payment_requests_project_service_open",
    "ux_payment_requests_plan_cycle_open",
    "trg_finance_payment_request_derive",
    "trg_finance_invoice_derive",
    "trg_finance_payment_rollup",
    "trg_finance_invoice_link_rollup",
    "finance_refresh_overdue",
  ]) {
    assert.ok(sql.includes(name), `finance_foundation.sql defines ${name}`);
  }
  assert.ok(/'Asia\/Ho_Chi_Minh'/.test(sql), "business dates in Vietnam time");
}
{
  const sql = read("pgsql/contract_payment_status_workflow.sql");
  assert.ok(/AFTER INSERT OR UPDATE OR DELETE ON payments/.test(sql), "contract outstanding recomputes on every payment change");
  assert.ok(!/IN \('received', 'paid', 'completed', 'partial'\)/.test(sql), "contract outstanding: Received only");
}
{
  const sql = read("pgsql/retainer_billing_run_due.sql");
  assert.ok(!/'submitted'/.test(sql.replace(/^--.*$/gm, "")), "retainer requests are not 'submitted'");
  assert.ok(/"billingPlanId", "cycleNo"/.test(sql), "retainer requests record plan + cycle");
}
{
  const sql = read("pgsql/unified_contract_payment_schedule.sql");
  assert.ok(/"projectServiceId" = p_project_service_id AND status IS DISTINCT FROM 'cancelled'/.test(sql), "By Service idempotency ignores cancelled");
}
console.log("finance-foundation: all checks passed");
```

- [ ] **Step 2: Run to verify it fails**

Run: `node scripts/tests/finance-foundation.test.js`
Expected: `AssertionError … no request is created as "submitted"`.

- [ ] **Step 3: Implement the JS changes**

`PaymentRequestCreateBlock.js`, `ContractDetailView.js` (the `requestPayload` at ~6181), `ContractPaymentScheduleDetailBlock.js` (~1405): `status: "submitted",` → `status: "active",`.

`JsField/Workflow/CreateContractBillingPlansWorkflow.js:127`: `status: "submitted",` → `status: "active",` (script is superseded by the cron workflow; kept consistent in case it is ever re-run).

`ContractDetailView.js` and `ContractPaymentScheduleDetailBlock.js`, replace the `PR_STATUS_META` object and `REQUESTED_PR_STATUSES` with:

```js
// Payment Request statuses (2026-09-28, spec
// docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md §4):
// pending (waiting on its trigger / due date) -> active (ready to invoice);
// cancelled is terminal. Paid / partly paid is derived from payments, not a status.
const PR_STATUS_META = {
  pending: { label: "Pending", bg: "#f5f5f5", color: "rgba(0, 0, 0, 0.45)" },
  active: { label: "Active", bg: "#e6f4ff", color: "#1677ff" },
  cancelled: { label: "Cancelled", bg: "#f5f5f5", color: "rgba(0, 0, 0, 0.45)" },
};

// "Requested" = a request that is active, i.e. in accounting's pipeline.
const REQUESTED_PR_STATUSES = ["active"];
```

`PaymentCreateBlock.js`:

```js
  const FINAL_STATUSES = ["received"];
  const ACTUAL_PAYMENT_STATUSES = ["received"];
```

```js
  // 2026-09-28: a payment is Received or Cancelled — whether it settles its
  // request/invoice in full is derived by the database (finance_foundation.sql).
  const deriveActualPaymentStatus = () => "Received";
```

and the status Select: `options: ["Received", "Pending", "Partial", "Planned", "Cancelled"].map(` → `options: ["Received", "Cancelled"].map(`.

`PaymentContractDetailBlock.js:19`: `const ACTUAL_PAYMENT_STATUSES = ["received"];`

- [ ] **Step 4: Field registration script** — `JsField/RegisterFinanceFoundationFields.js`:

```js
// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Finance P1 (2026-09-28). Registers the columns created by
// pgsql/finance_foundation.sql as NocoBase fields, so the API, the UI and
// workflow node pickers can see them (NocoBase silently drops unknown keys —
// see the payments.paymentRequestId incident, spec 2026-09-17 §6z).
//
// Run pgsql/finance_foundation.sql FIRST (the columns must exist).
// How to run: paste into the browser dev console on any admin page (ctx in
// scope) or a temporary Action block's onClick. Idempotent — skips fields
// that are already registered.
// ============================================================

const numberField = (name, title, type = "double") => ({
  name,
  type,
  interface: type === "integer" || type === "bigInt" ? "integer" : "number",
  uiSchema: { type: "number", "x-component": "InputNumber", "x-read-pretty": true, title },
});

const dateField = (name, title) => ({
  name,
  type: "date",
  interface: "date",
  uiSchema: { type: "string", "x-component": "DatePicker", "x-read-pretty": true, title },
});

const datetimeField = (name, title) => ({
  name,
  type: "date",
  interface: "datetime",
  uiSchema: { type: "string", "x-component": "DatePicker", "x-component-props": { showTime: true }, "x-read-pretty": true, title },
});

const FIELDS = {
  paymentRequests: [
    numberField("paidAmount", "Paid amount"),
    numberField("outstandingAmount", "Outstanding amount"),
    dateField("overdueSince", "Overdue since"),
    datetimeField("overdueNotifiedAt", "Overdue notified at"),
    numberField("billingPlanId", "Billing plan ID", "bigInt"),
    numberField("cycleNo", "Retainer cycle", "integer"),
  ],
  invoices: [
    dateField("overdueSince", "Overdue since"),
    datetimeField("overdueNotifiedAt", "Overdue notified at"),
  ],
};

const registerField = async (collectionName, fieldPayload) => {
  const existing = await ctx.api.request({
    url: `collections/${collectionName}/fields:list`,
    params: { paginate: false },
  });
  if ((existing?.data?.data || []).some((f) => f.name === fieldPayload.name)) {
    console.log(`[skip] ${collectionName}.${fieldPayload.name} already registered`);
    return;
  }
  await ctx.api.request({
    url: `collections/${collectionName}/fields:create`,
    method: "POST",
    data: fieldPayload,
  });
  console.log(`[created] ${collectionName}.${fieldPayload.name}`);
};

(async () => {
  for (const [collectionName, fields] of Object.entries(FIELDS)) {
    for (const field of fields) await registerField(collectionName, field);
  }
  console.log("Done. Then set the paymentRequests.status options to pending / active / cancelled and payments.paymentStatus to Received / Cancelled in Collection manager.");
})();
```

- [ ] **Step 5: Run to verify it passes**

Run: `node scripts/tests/finance-foundation.test.js && node scripts/tests/static-checks.test.js && node --check "All Module/Payment/PaymentCreateBlock.js"`
Expected: `finance-foundation: all checks passed`, static checks pass. (Blocks are plain JS with `React.createElement`, so `node --check` parses them; the sandbox/TDZ scans run via static-checks.)

---

## Manual deployment checklist (dev)

Run in this order; stop and report at the first surprise.

1. **Back up** the dev database.
2. `psql … -f pgsql/contract_payment_status_workflow.sql` (re-run; adds the money helpers, fixes the contract roll-up).
3. `psql … -f pgsql/finance_foundation_audit.sql` — read the three result sets:
   - duplicates → cancel the extra requests (`status = 'cancelled'`) before step 4;
   - statuses in use → note any payment status other than Received/Paid/Completed/Partial/Cancelled/Void (e.g. Pending, Planned): the migration leaves them for you;
   - invoices whose status will change → confirm these are expected (invoices marked paid by hand with no payment recorded will become pending/overdue).
4. `psql … -f pgsql/finance_foundation.sql`
5. `psql … -f pgsql/unified_contract_payment_schedule.sql` and `psql … -f pgsql/retainer_billing_run_due.sql` (re-run; cancelled-aware, retainer requests active).
6. `psql … -f pgsql/finance_foundation_migrate.sql` — read the final "not migrated" rows and decide.
7. `psql … -f pgsql/tests/finance_foundation_test.sql` → expect `ALL FINANCE FOUNDATION CHECKS PASSED` (rolls back; nothing left behind).
8. Browser console on any admin page: paste `JsField/RegisterFinanceFoundationFields.js`.
9. Collection manager: `paymentRequests.status` options → pending / active / cancelled; `payments.paymentStatus` options → Received / Cancelled.
10. Browser console: paste `JsField/Workflow/CreateFinanceOverdueCronWorkflow.js`, then toggle the workflow Disabled → Enabled once.
11. Paste the updated blocks: `PaymentRequestCreateBlock.js`, `ContractDetailView.js`, `ContractPaymentScheduleDetailBlock.js`, `PaymentCreateBlock.js`, `PaymentContractDetailBlock.js`.
12. Smoke test in the UI: record a payment on an active request → its invoice/request show paid; edit the amount → totals follow; delete it → back to owed.
