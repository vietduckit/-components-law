-- ============================================================
-- Contract Billing Plans — retainer state init trigger
-- See docs/superpowers/specs/2026-09-08-contract-billing-plans-architecture-design.md §6.2
--
-- Idempotent: safe to run again on a database that already has this applied.
-- Requires: the contractBillingPlans table itself, created via
-- JsField/CreateContractBillingPlansCollection.js (Task 1) — this file
-- only adds a trigger on top of that already-existing table.
-- ============================================================

CREATE OR REPLACE FUNCTION public.contract_billing_plan_init_retainer_state()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- 2026-09-24 (user decision): open-ended retainers (no
  -- retainerTotalCycles) are now billed too — totalAmount is their amount
  -- PER CYCLE, billed every cycle until the next date passes endDate (or
  -- indefinitely with no endDate). Billing itself runs in
  -- public.retainer_billing_run_due() (pgsql/retainer_billing_run_due.sql),
  -- called hourly by JsField/Workflow/CreateRetainerBillingCronWorkflow.js —
  -- deploy those first; the superseded date-field Workflow's expressions
  -- throw on a null cycle count.
  -- Still never scheduled: non-retainer plans, no startDate, or no positive
  -- totalAmount (would create a request with requestedAmount NULL/0).
  IF NEW."planType" <> 'retainer'
     OR NEW."startDate" IS NULL
     OR COALESCE(NEW."totalAmount", 0) <= 0
  THEN
    NEW."nextBillingDate" := NULL;
    RETURN NEW;
  END IF;

  -- Only (re)initialize a plan that hasn't started billing yet — an
  -- unrelated edit to an in-progress plan must not reset its progress.
  IF COALESCE(NEW."retainerCyclesBilled", 0) = 0 THEN
    NEW."nextBillingDate" := NEW."startDate";
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_contract_billing_plan_init_retainer_state ON "contractBillingPlans";
CREATE TRIGGER trg_contract_billing_plan_init_retainer_state
  BEFORE INSERT OR UPDATE OF "retainerTotalCycles", "startDate", "planType", "totalAmount" ON "contractBillingPlans"
  FOR EACH ROW
  EXECUTE FUNCTION public.contract_billing_plan_init_retainer_state();
