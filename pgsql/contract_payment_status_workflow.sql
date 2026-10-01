-- ============================================================
-- Contract & Case Payment Status Workflow
-- See docs/superpowers/specs/2026-09-05-contract-payment-status-workflow-design.md
--
-- Idempotent: every statement in this file is safe to run again on a
-- database that already has some or all of it applied.
-- ============================================================

-- ---- Schema: additive columns -------------------------------------------
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "outStandingAmount" double precision DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "paymentStatus" character varying(255) DEFAULT 'unpaid';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS "paymentStatus" character varying(255) DEFAULT 'unpaid';

-- ---- Single source of truth: what is this contract worth? --------------
-- Mirrors the fallback chain already implemented independently in
-- PaymentCreateBlock.js / PaymentContractDetailBlock.js /
-- PaymentRequestCreateBlock.js's contractTotalAmount()/contractMoneyInfo(),
-- restricted to the fields that actually exist as columns on `contracts`.
--
-- Split in two so the SAME formula works both for a row already committed
-- to the table (contract_resolved_total(id), a plain lookup) and for a
-- BEFORE INSERT trigger's NEW record, which is not yet visible to a SELECT
-- against the table (contract_resolved_total_from_row(NEW)).
--
-- 2026-09-22 fix: the 4th fallback (`monthlyFee * retainerDuration`) broke
-- `CREATE FUNCTION` outright on a freshly-restored DB — "missing FROM-clause
-- entry for table c" — because contracts.monthlyFee/retainerDuration were
-- already DROPPED by pgsql/contracts_drop_dead_columns.sql (2026-09-08,
-- superseded by the contractBillingPlans architecture) on that DB, and this
-- is a plain LANGUAGE sql function — Postgres validates every column
-- reference in its body at CREATE time, not lazily like plpgsql, so an
-- unreachable branch still fails to even compile once its columns are gone.
-- Removed rather than repointed at contractBillingPlans: ContractCreateForm.js
-- already keeps contracts.totalAmount in sync for every contract type,
-- Retainer included (deriveForm sets it via calcTotalByFeeModel on every
-- relevant field change), so the 1st fallback (`totalAmount`) already
-- resolves before this branch would ever be reached — confirmed dead code,
-- not a behavior change.
CREATE OR REPLACE FUNCTION public.contract_resolved_total_from_row(c contracts)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT COALESCE(
    NULLIF(c."totalAmount", 0),
    NULLIF(c."fixedAmount", 0),
    NULLIF(c."subTotal", 0) + COALESCE(c."vatAmount", 0),
    0
  );
$function$;

-- 2026-09-30: a retainer's totalAmount (contract and plan) is the fee of EVERY
-- period (retainer_cycle_amount), so the contract is worth fee × the plan's
-- periods — open-ended: the periods billed so far, at least 1 (a new plan is
-- not "paid" before its first bill). The active plan wins, else the newest.
-- NULL = not a retainer, no plan yet, or a zero fee: the contract's own total.
-- A new contract's row (contract_resolved_total_from_row, BEFORE INSERT) has
-- no plan yet; the plan's own trigger (finance_retainer_schedule.sql)
-- recomputes the balance once the plan exists.
CREATE OR REPLACE FUNCTION public.contract_retainer_value(p_contract_id BIGINT)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $function$
  SELECT NULLIF(
           ROUND(COALESCE(p."totalAmount", 0)::numeric)
             * COALESCE(NULLIF(p."retainerTotalCycles", 0), GREATEST(COALESCE(p."retainerCyclesBilled", 0), 1)),
           0)
  FROM contracts c
  JOIN "contractBillingPlans" p ON p."contractId" = c.id AND p."planType" = 'retainer'
  WHERE c.id = p_contract_id AND c."contractType" = 'retainer'
  ORDER BY (p.status = 'active') DESC NULLS LAST, p.id DESC
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.contract_resolved_total(p_contract_id BIGINT)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $function$
  SELECT COALESCE(contract_retainer_value(c.id), contract_resolved_total_from_row(c))
  FROM contracts c
  WHERE c.id = p_contract_id;
$function$;

-- ---- Trigger: initialize a new contract's balance -----------------------
CREATE OR REPLACE FUNCTION public.contract_init_outstanding()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW."outStandingAmount" := contract_resolved_total_from_row(NEW);
  NEW."paymentStatus" := 'unpaid';
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_contract_init_outstanding ON contracts;
CREATE TRIGGER trg_contract_init_outstanding
  BEFORE INSERT ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.contract_init_outstanding();

-- ---- Money helpers shared with pgsql/finance_foundation.sql (2026-09-28) ----
-- Payment statuses are now exactly Received / Cancelled (spec
-- docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md §6):
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

-- Same, for a whole payments row passed as to_jsonb(p). Reading through jsonb
-- keeps every money function working on a database where
-- payments."exchangeRateToBase" does not exist (pgsql/multi_currency_migration.sql
-- not applied — e.g. law306 on dev, 2026-09-28): the rate is then 1 (VND).
CREATE OR REPLACE FUNCTION public.finance_payment_vnd(p_row jsonb)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT COALESCE(NULLIF(p_row->>'amount', '')::numeric, 0)
       * COALESCE(NULLIF(NULLIF(p_row->>'exchangeRateToBase', '')::numeric, 0), 1);
$function$;

-- ---- Recompute one contract's balance from its Received payments -------
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

  SELECT COALESCE(SUM(finance_payment_vnd(to_jsonb(p))), 0)
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

-- ---- Trigger: recompute the contract whenever a payment changes ---------
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
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD."contractId" IS DISTINCT FROM NEW."contractId") THEN
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

-- ---- Trigger: cascade a contract's paymentStatus to its linked Case -----
CREATE OR REPLACE FUNCTION public.cascade_payment_status_to_case()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE projects
  SET "paymentStatus" = NEW."paymentStatus"
  WHERE "contractId" = NEW.id;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_contract_cascade_case_status ON contracts;
CREATE TRIGGER trg_contract_cascade_case_status
  AFTER UPDATE OF "paymentStatus" ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_payment_status_to_case();

-- ---- REMOVED 2026-09-25 (user decision): legacy lump-sum case-done trigger
-- trg_case_done_payment_request / auto_create_payment_request_on_case_done()
-- created an "Auto: Case hoàn thành - …" Payment Request for the contract's
-- whole outstanding balance whenever a Case became done, on every contract
-- type — duplicating the requests the current finance pipeline creates
-- (By Case installments, By Service per-service requests, Retainer billing
-- plans). By Case "One time" now gets its single on_case_done request when a
-- Case is linked (by_case_one_time_ensure_payment_request,
-- unified_contract_payment_schedule.sql), activated by
-- by_case_case_done_activates_payment_request when the Case is Done.
-- Only DROPped here (never recreated), so re-running this file keeps it gone.
-- Standalone equivalent: pgsql/drop_case_done_lump_sum_payment_request.sql.
DROP TRIGGER IF EXISTS trg_case_done_payment_request ON projects;
DROP FUNCTION IF EXISTS public.auto_create_payment_request_on_case_done();

-- ---- Trigger: auto-complete a Case once all its tasks are finished ------
-- "Finished" = status 'done' or 'cancelled'. Requires at least 1 task to
-- exist (a case with zero tasks hasn't started, not finished — never
-- auto-completes on that basis alone). Only drives the case FORWARD into
-- 'done' — adding a new not-yet-done task to an already-'done' case, or
-- reopening a task, does not revert it; not asked for, not built.
-- Only sets projects.status; by_case_case_done_activates_payment_request
-- (by_case_payment_request_automation.sql) reacts to that same column to
-- activate on_case_done installments. (It used to feed
-- trg_case_done_payment_request above — disabled 2026-09-24.)
-- No backfill for this one (by request) — only fires on a task's status
-- changing from here on; pre-existing cases keep whatever status they
-- already have, even if their tasks already all qualify today.
CREATE OR REPLACE FUNCTION public.case_auto_complete_when_tasks_done()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_project_id BIGINT;
  v_total INT;
  v_unfinished INT;
  v_current_status VARCHAR;
BEGIN
  v_project_id := NEW."projectId";
  IF v_project_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_total FROM tasks WHERE "projectId" = v_project_id;
  IF v_total = 0 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_unfinished
  FROM tasks
  WHERE "projectId" = v_project_id
    AND (status IS NULL OR status NOT IN ('done', 'cancelled'));
  IF v_unfinished > 0 THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_current_status FROM projects WHERE id = v_project_id;
  IF v_current_status IS DISTINCT FROM 'done' THEN
    UPDATE projects SET status = 'done' WHERE id = v_project_id;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_case_auto_complete_when_tasks_done ON tasks;
CREATE TRIGGER trg_case_auto_complete_when_tasks_done
  AFTER UPDATE OF "status" ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.case_auto_complete_when_tasks_done();

-- ---- One-time backfill: correct all pre-existing rows -------------------
-- New contracts/payments from here on are handled entirely by the triggers
-- above. This is only for rows that already existed *before* this migration
-- ran — their outStandingAmount/paymentStatus are still at the column
-- default (0/'unpaid') because ADD COLUMN ... DEFAULT doesn't fire an
-- INSERT trigger. Safe to run repeatedly — recompute, not increment.
-- Re-run again after the 2026-09-22 'partial' fix above — this backfill
-- has its own copy of the same filter and needs to match.
WITH received AS (
  SELECT p."contractId", COALESCE(SUM(finance_payment_vnd(to_jsonb(p))), 0) AS total_received
  FROM payments p
  WHERE p."contractId" IS NOT NULL AND finance_is_received(p."paymentStatus")
  GROUP BY p."contractId"
)
UPDATE contracts c
SET "outStandingAmount" = GREATEST(contract_resolved_total(c.id) - COALESCE(r.total_received, 0), 0),
    "paymentStatus" = CASE
      WHEN (contract_resolved_total(c.id) - COALESCE(r.total_received, 0)) <= 0 THEN 'paid'
      WHEN COALESCE(r.total_received, 0) > 0 THEN 'partial'
      ELSE 'unpaid'
    END
FROM (SELECT c2.id FROM contracts c2) AS all_contracts
LEFT JOIN received r ON r."contractId" = all_contracts.id
WHERE c.id = all_contracts.id;

UPDATE projects p
SET "paymentStatus" = c."paymentStatus"
FROM contracts c
WHERE p."contractId" = c.id;
