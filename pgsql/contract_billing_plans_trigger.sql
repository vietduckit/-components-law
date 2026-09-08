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
  -- Open-ended retainers (no retainerTotalCycles) stay out of automation —
  -- periodAmount is totalAmount / retainerTotalCycles, undefined with no
  -- cycle count to divide by. Letting this row schedule anyway would let
  -- the Workflow's Calculation node silently divide by NULL and create a
  -- paymentRequests row with requestedAmount = NULL. This guard is the
  -- only thing preventing that.
  IF NEW."planType" <> 'retainer' OR NEW."retainerTotalCycles" IS NULL THEN
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
  BEFORE INSERT OR UPDATE OF "retainerTotalCycles", "startDate", "planType" ON "contractBillingPlans"
  FOR EACH ROW
  EXECUTE FUNCTION public.contract_billing_plan_init_retainer_state();
