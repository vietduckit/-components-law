-- ============================================================
-- Retainer Billing Automation
-- See docs/superpowers/specs/2026-09-07-retainer-billing-automation-design.md
--
-- Idempotent: every statement in this file is safe to run again on a
-- database that already has some or all of it applied.
-- ============================================================

-- ---- Schema: additive columns -------------------------------------------
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "nextRetainerBillingDate" date;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "retainerPeriodsBilled" integer DEFAULT 0;

-- ---- Trigger: initialize/reset a contract's retainer billing state ------
-- Only reads NEW.* directly (no self-SELECT), so BEFORE INSERT is safe —
-- a self-select can't see a row that isn't committed yet (the exact bug
-- the prior payment-status-workflow feature hit and fixed).
CREATE OR REPLACE FUNCTION public.contract_init_retainer_billing_state()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_retainer_rule jsonb;
  v_enabled boolean;
  v_duration numeric;
  v_first_payment date;
BEGIN
  v_retainer_rule := NEW."paymentSchedule" -> 'retainerRule';
  v_enabled := COALESCE((v_retainer_rule ->> 'enabled')::boolean, false);
  v_duration := NULLIF(NEW."retainerDuration", 0);

  -- Not a fixed-term retainer (not retainer at all, OR open-ended/no
  -- duration set): explicitly opt out of auto-billing.
  IF NOT v_enabled OR v_duration IS NULL THEN
    NEW."nextRetainerBillingDate" := NULL;
    RETURN NEW;
  END IF;

  -- Only (re)initialize a contract that hasn't started billing yet — an
  -- unrelated edit to an in-progress retainer must not reset its progress.
  IF COALESCE(NEW."retainerPeriodsBilled", 0) = 0 THEN
    v_first_payment := NULLIF(NEW."paymentSchedule" ->> 'firstPaymentDate', '')::date;
    NEW."nextRetainerBillingDate" := v_first_payment;
    NEW."retainerPeriodsBilled" := 0;
  END IF;

  RETURN NEW;
END;
$function$;

-- Fires on either column changing, not just paymentSchedule —
-- retainerDuration is a separate top-level column, so a contract edited
-- from open-ended to fixed-term (or vice versa) without paymentSchedule
-- itself being touched in the same save must still re-evaluate eligibility.
DROP TRIGGER IF EXISTS trg_contract_init_retainer_billing_state ON contracts;
CREATE TRIGGER trg_contract_init_retainer_billing_state
  BEFORE INSERT OR UPDATE OF "paymentSchedule", "retainerDuration" ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.contract_init_retainer_billing_state();
