-- ============================================================
-- Finance P2 — billing rules (2026-09-28)
-- Spec: docs/superpowers/specs/2026-09-28-case-finance-tab-business-rules-design.md §3 §7 §8
-- Plan: docs/superpowers/plans/2026-09-28-finance-p2-billing-rules.md
--
-- UI actions insert a *stub* Payment Request and the database fills it in:
--   { requestType: 'manual_unit', projectServiceId }            a service by hand
--   { requestType: 'manual_unit', contractPaymentScheduleId }    a combo / item, or a By Case
--                                                                installment whose request was cancelled
--   { requestType: 'bill_now', billingPlanId }                   next retainer period now
--   { requestType: 'termination_settlement', contractId, requestedAmount }
-- (optional: dueDate, title). Errors are RAISE EXCEPTION sentences for the UI.
-- Also: cancelling needs a reason and nothing invoiced/paid; retainer
-- auto-billing stops/starts with contractBillingPlans."isBillingActive";
-- terminating a contract cancels what is pending.
-- Deploy after pgsql/finance_foundation.sql, before pgsql/retainer_billing_run_due.sql.
-- Idempotent.
-- ============================================================

ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "cancelReason" text;
ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "cancelledAt" timestamp with time zone;
ALTER TABLE "contractBillingPlans" ADD COLUMN IF NOT EXISTS "isBillingActive" boolean DEFAULT true;
ALTER TABLE "contractBillingPlans" ADD COLUMN IF NOT EXISTS "pausedAt" timestamp with time zone;
ALTER TABLE "contractBillingPlans" ADD COLUMN IF NOT EXISTS "pauseReason" text;
ALTER TABLE "contractBillingPlans" ADD COLUMN IF NOT EXISTS "resumeOn" date;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "terminationDate" date;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "terminationReason" text;
UPDATE "contractBillingPlans" SET "isBillingActive" = true WHERE "isBillingActive" IS NULL;

-- ---- Manual request for a service or a combo / item (spec §3, §7)
CREATE OR REPLACE FUNCTION public.finance_fill_manual_unit(p_row "paymentRequests")
RETURNS "paymentRequests"
LANGUAGE plpgsql
AS $function$
DECLARE
  v_item RECORD;
  v_service RECORD;
  v_contract RECORD;
  v_amount NUMERIC;
  v_source TEXT;
BEGIN
  IF p_row."contractPaymentScheduleId" IS NOT NULL THEN
    SELECT * INTO v_item FROM "contractPaymentSchedules" WHERE id = p_row."contractPaymentScheduleId";
    SELECT id, "contractCode", "contractName", "contractType", "customerId", "internalCompanyId", status
    INTO v_contract FROM contracts WHERE id = v_item."contractId";
    IF v_item.id IS NULL OR v_contract.id IS NULL THEN
      RAISE EXCEPTION 'This combo no longer exists.';
    END IF;
    -- 2026-09-28: a By Case installment too, once its request was cancelled
    -- (Finance tab "+ Payment Request"); same title as the automatic one.
    IF v_contract."contractType" IS DISTINCT FROM 'byService' AND v_contract."contractType" IS DISTINCT FROM 'byCase' THEN
      RAISE EXCEPTION 'Only a By Case installment or a By Service combo can be billed by hand here.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM "paymentRequests"
      WHERE "contractPaymentScheduleId" = v_item.id AND status IS DISTINCT FROM 'cancelled'
    ) THEN
      RAISE EXCEPTION '% already has a payment request.',
        CASE WHEN v_contract."contractType" = 'byCase' THEN 'This installment' ELSE 'This combo' END;
    END IF;
    v_amount := v_item.amount;
    p_row."installmentNo" := v_item."installmentNo";
    IF v_contract."contractType" = 'byCase' THEN
      p_row.title := COALESCE(NULLIF(btrim(p_row.title), ''),
        'Đợt ' || COALESCE(v_item."installmentNo"::text, '') || ' - ' || COALESCE(v_contract."contractCode", '') ||
        ' - ' || COALESCE(v_contract."contractName", ''));
      p_row."sourceSnapshot" := jsonb_build_object('billing', 'installment_manual', 'label', v_item.label, 'amount', v_amount);
    ELSE
      p_row.title := COALESCE(NULLIF(btrim(p_row.title), ''),
        COALESCE(v_item.label, 'Combo') || ' - ' || COALESCE(v_contract."contractCode", ''));
      p_row."sourceSnapshot" := jsonb_build_object('billing', 'combo_manual', 'label', v_item.label, 'amount', v_amount);
    END IF;
  ELSIF p_row."projectServiceId" IS NOT NULL THEN
    SELECT ps.id, ps."serviceName", p."contractId" INTO v_service
    FROM "projectServices" ps JOIN projects p ON p.id = ps."projectId"
    WHERE ps.id = p_row."projectServiceId";
    SELECT id, "contractCode", "contractName", "contractType", "pricingMode", "customerId", "internalCompanyId", status
    INTO v_contract FROM contracts WHERE id = v_service."contractId";
    IF v_service.id IS NULL OR v_contract.id IS NULL THEN
      RAISE EXCEPTION 'This service is not linked to a contract.';
    END IF;
    IF v_contract."contractType" IS DISTINCT FROM 'byService' THEN
      RAISE EXCEPTION 'Only a By Service contract bills per service.';
    END IF;
    IF v_contract."pricingMode" = 'package'
       AND EXISTS (SELECT 1 FROM "contractPaymentSchedules" WHERE "contractId" = v_contract.id) THEN
      RAISE EXCEPTION 'This service is billed as part of a combo — bill the combo instead.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM "paymentRequests"
      WHERE "projectServiceId" = v_service.id AND status IS DISTINCT FROM 'cancelled'
    ) THEN
      RAISE EXCEPTION 'This service already has a payment request.';
    END IF;
    SELECT a.amount, a.source INTO v_amount, v_source FROM public.by_service_service_amount(v_service.id) a;
    p_row."contractServiceId" := (SELECT id FROM "contractServices" WHERE "projectServiceId" = v_service.id LIMIT 1);
    p_row.title := COALESCE(NULLIF(btrim(p_row.title), ''),
      'Dịch vụ ' || COALESCE(v_service."serviceName", '') || ' - ' || COALESCE(v_contract."contractCode", '') ||
      ' - ' || COALESCE(v_contract."contractName", ''));
    p_row."sourceSnapshot" := jsonb_build_object('billing', 'service_manual', 'serviceName', v_service."serviceName",
                                                 'totalAmount', v_amount, 'amountSource', v_source);
  ELSE
    RAISE EXCEPTION 'Choose the service or the combo to bill.';
  END IF;

  IF v_contract.status = 'terminated' THEN
    RAISE EXCEPTION 'The contract is terminated — use a termination settlement instead.';
  END IF;
  IF COALESCE(v_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'There is no amount to bill for this item.';
  END IF;

  p_row."requestedAmount" := v_amount;
  p_row."contractId" := v_contract.id;
  p_row."customerId" := v_contract."customerId";
  p_row."internalCompanyId" := v_contract."internalCompanyId";
  p_row."requestNote" := COALESCE(p_row."requestNote",
    'Yêu cầu thanh toán tạo thủ công (ngày ' || to_char(now(), 'DD/MM/YYYY') || ')');
  RETURN p_row;
END;
$function$;

-- ---- Termination settlement (spec §7.5): terminated contract only, a
-- positive amount no larger than what is still unbilled.
CREATE OR REPLACE FUNCTION public.finance_fill_termination_settlement(p_row "paymentRequests")
RETURNS "paymentRequests"
LANGUAGE plpgsql
AS $function$
DECLARE
  v_contract RECORD;
  v_unbilled NUMERIC;
BEGIN
  SELECT id, "contractCode", "customerId", "internalCompanyId", status INTO v_contract
  FROM contracts WHERE id = p_row."contractId";
  IF v_contract.id IS NULL THEN
    RAISE EXCEPTION 'Choose the contract to settle.';
  END IF;
  IF v_contract.status IS DISTINCT FROM 'terminated' THEN
    RAISE EXCEPTION 'A termination settlement is only for a terminated contract.';
  END IF;
  IF COALESCE(p_row."requestedAmount", 0) <= 0 THEN
    RAISE EXCEPTION 'Enter the amount to settle.';
  END IF;
  v_unbilled := COALESCE(contract_resolved_total(v_contract.id), 0) - COALESCE((
    SELECT SUM("requestedAmount") FROM "paymentRequests"
    WHERE "contractId" = v_contract.id AND status IS DISTINCT FROM 'cancelled'
  ), 0);
  IF p_row."requestedAmount" > v_unbilled THEN
    RAISE EXCEPTION 'The settlement (%) is more than what is still unbilled on the contract (%).',
      p_row."requestedAmount", GREATEST(v_unbilled, 0);
  END IF;
  p_row.title := COALESCE(NULLIF(btrim(p_row.title), ''), 'Quyết toán chấm dứt - ' || COALESCE(v_contract."contractCode", ''));
  p_row."customerId" := v_contract."customerId";
  p_row."internalCompanyId" := v_contract."internalCompanyId";
  p_row."sourceSnapshot" := jsonb_build_object('billing', 'termination_settlement', 'unbilledBefore', v_unbilled);
  RETURN p_row;
END;
$function$;

-- ---- Dispatcher for stub inserts. Runs before trg_finance_payment_request_derive
-- (BEFORE triggers fire in name order: "fill" < "payment"), so the derived
-- columns see the filled-in amount.
CREATE OR REPLACE FUNCTION public.finance_fill_request_stub()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW."requestType" = 'manual_unit' THEN
    NEW := public.finance_fill_manual_unit(NEW);
  ELSIF NEW."requestType" = 'bill_now' THEN
    NEW := public.finance_fill_bill_now(NEW);
  ELSIF NEW."requestType" = 'termination_settlement' THEN
    NEW := public.finance_fill_termination_settlement(NEW);
  ELSE
    RETURN NEW;
  END IF;
  NEW."requestType" := 'create_payment';
  NEW.status := 'active';
  NEW."triggerType" := 'manual';
  NEW."conditionMet" := true;
  NEW.currency := COALESCE(NEW.currency, 'VND');
  NEW.priority := COALESCE(NEW.priority, 'high');
  NEW."dueDate" := COALESCE(NEW."dueDate", now() + INTERVAL '7 days');
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_fill_request_stub ON "paymentRequests";
CREATE TRIGGER trg_finance_fill_request_stub
  BEFORE INSERT ON "paymentRequests"
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_fill_request_stub();

-- ---- Cancelling a request (spec §7.1): reason required; refused while it has
-- a non-cancelled invoice (draft included) or Received money; terminal.
CREATE OR REPLACE FUNCTION public.finance_payment_request_cancel_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    IF btrim(COALESCE(NEW."cancelReason", '')) = '' THEN
      RAISE EXCEPTION 'Give a reason to cancel this payment request.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM invoices
      WHERE "paymentRequestId" = NEW.id AND lower(btrim(COALESCE(status, ''))) <> 'cancelled'
    ) THEN
      RAISE EXCEPTION 'This request has an invoice — cancel or replace the invoice first.';
    END IF;
    IF public.finance_pr_paid(NEW.id) > 0 THEN
      RAISE EXCEPTION 'Money was received on this request — move or cancel those payments first.';
    END IF;
    NEW."cancelledAt" := now();
  ELSIF OLD.status = 'cancelled' AND NEW.status IS DISTINCT FROM 'cancelled' THEN
    RAISE EXCEPTION 'A cancelled payment request cannot be reopened — create a new one.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_payment_request_cancel_guard ON "paymentRequests";
CREATE TRIGGER trg_finance_payment_request_cancel_guard
  BEFORE UPDATE OF status ON "paymentRequests"
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_payment_request_cancel_guard();

-- ---- Retainer helpers (shared with pgsql/retainer_billing_run_due.sql)
-- 2026-09-28: 'quarter' is 3 months (the run used to fall back to monthly).
CREATE OR REPLACE FUNCTION public.retainer_step(p_unit text)
RETURNS interval
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE lower(COALESCE(p_unit, 'month'))
    WHEN 'day' THEN interval '1 day'
    WHEN 'week' THEN interval '1 week'
    WHEN 'quarter' THEN interval '3 months'
    WHEN 'year' THEN interval '1 year'
    ELSE interval '1 month'
  END;
$function$;

-- 2026-09-30: a retainer plan's totalAmount is the fee of EVERY period, whole
-- đồng — it is no longer split over a fixed number of periods (the contract is
-- then worth fee × periods: contract_retainer_value). p_cycles / p_period are
-- kept so every caller (hourly run, Bill now, schedule rows) stays unchanged.
CREATE OR REPLACE FUNCTION public.retainer_cycle_amount(p_total double precision, p_cycles integer, p_period integer)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT ROUND(p_total::numeric);
$function$;

-- ---- Bill the next retainer period now (spec §8.3): anchored to the plan's
-- own schedule; refused while stopped, with no cycle left, or on a terminated
-- contract. The plan row is locked, so the hourly run cannot bill the same
-- cycle concurrently (and ux_payment_requests_plan_cycle_open backs it).
CREATE OR REPLACE FUNCTION public.finance_fill_bill_now(p_row "paymentRequests")
RETURNS "paymentRequests"
LANGUAGE plpgsql
AS $function$
DECLARE
  v_plan RECORD;
  v_contract RECORD;
  v_period INT;
  v_next DATE;
  v_stop BOOLEAN;
BEGIN
  SELECT * INTO v_plan FROM "contractBillingPlans" WHERE id = p_row."billingPlanId" FOR UPDATE;
  IF v_plan.id IS NULL OR v_plan."planType" IS DISTINCT FROM 'retainer' THEN
    RAISE EXCEPTION 'Retainer plan not found.';
  END IF;
  IF v_plan."isBillingActive" IS FALSE THEN
    RAISE EXCEPTION 'Auto-billing is stopped — start it again before billing the next period.';
  END IF;
  IF v_plan.status IS DISTINCT FROM 'active' OR v_plan."nextBillingDate" IS NULL THEN
    RAISE EXCEPTION 'This retainer has no period left to bill.';
  END IF;
  SELECT id, "contractCode", "contractName", "customerId", "internalCompanyId", status
  INTO v_contract FROM contracts WHERE id = v_plan."contractId";
  IF v_contract.status = 'terminated' THEN
    RAISE EXCEPTION 'The contract is terminated.';
  END IF;

  v_period := COALESCE(v_plan."retainerCyclesBilled", 0) + 1;
  p_row."requestedAmount" := public.retainer_cycle_amount(v_plan."totalAmount", v_plan."retainerTotalCycles", v_period);
  IF COALESCE(p_row."requestedAmount", 0) <= 0 THEN
    RAISE EXCEPTION 'This retainer has no amount to bill.';
  END IF;
  v_next := (v_plan."nextBillingDate" + public.retainer_step(v_plan."retainerUnit"))::date;
  v_stop := (v_plan."retainerTotalCycles" IS NOT NULL AND v_period >= v_plan."retainerTotalCycles")
    OR (v_plan."endDate" IS NOT NULL AND v_next > v_plan."endDate");

  p_row."cycleNo" := v_period;
  -- 2026-09-29: on the period's schedule row (pgsql/finance_retainer_schedule.sql)
  p_row."contractPaymentScheduleId" := (
    SELECT s.id FROM "contractPaymentSchedules" s
    WHERE s."contractId" = v_contract.id AND s."installmentNo" = v_period AND s."triggerType" = 'retainer_period'
    ORDER BY s.id LIMIT 1
  );
  p_row."contractId" := v_contract.id;
  p_row."customerId" := v_contract."customerId";
  p_row."internalCompanyId" := v_contract."internalCompanyId";
  p_row.title := COALESCE(NULLIF(btrim(p_row.title), ''),
    'Payment request - ' || COALESCE(v_contract."contractCode", '') || ' - ' ||
    COALESCE(v_contract."contractName", '') || ' - Retainer period ' || v_period);
  p_row."requestNote" := COALESCE(p_row."requestNote",
    'Bill next period now — kỳ ' || v_period || ' (lịch ' || to_char(v_plan."nextBillingDate", 'DD/MM/YYYY') ||
    '), lập ngày ' || to_char(now(), 'DD/MM/YYYY'));
  p_row."sourceSnapshot" := jsonb_build_object('billing', 'retainer_bill_now', 'period', v_period,
                                               'scheduledDate', v_plan."nextBillingDate");

  UPDATE "contractBillingPlans"
  SET "retainerCyclesBilled" = v_period,
      "nextBillingDate" = CASE WHEN v_stop THEN NULL ELSE v_next END,
      status = CASE WHEN v_stop THEN 'completed' ELSE status END,
      "updatedAt" = now()
  WHERE id = v_plan.id;
  RETURN p_row;
END;
$function$;

-- ---- Stop / start auto-billing (spec §8.2): contractBillingPlans."isBillingActive"
-- Stopping needs pauseReason. Starting skips the billing dates that fell while
-- stopped (from pausedAt's date up to yesterday) without billing them: the
-- cycle count is unchanged, so they move to the end, and the plan's and the
-- contract's endDate move forward by the same number of periods.
CREATE OR REPLACE FUNCTION public.finance_billing_plan_active_toggle()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_today DATE := public.finance_today();
  v_from DATE;
  v_step INTERVAL;
  v_skipped INT := 0;
BEGIN
  IF OLD."isBillingActive" IS NOT DISTINCT FROM NEW."isBillingActive" THEN
    RETURN NEW;
  END IF;

  IF NEW."isBillingActive" IS FALSE THEN
    IF btrim(COALESCE(NEW."pauseReason", '')) = '' THEN
      RAISE EXCEPTION 'Give a reason to stop auto-billing.';
    END IF;
    NEW."pausedAt" := COALESCE(NEW."pausedAt", now());
    RETURN NEW;
  END IF;

  -- starting again
  v_step := public.retainer_step(NEW."retainerUnit");
  v_from := COALESCE(public.finance_local_date(OLD."pausedAt"), v_today);
  IF NEW."nextBillingDate" IS NOT NULL THEN
    WHILE NEW."nextBillingDate" < v_today AND NEW."nextBillingDate" >= v_from LOOP
      NEW."nextBillingDate" := (NEW."nextBillingDate" + v_step)::date;
      v_skipped := v_skipped + 1;
    END LOOP;
  END IF;
  IF v_skipped > 0 THEN
    IF NEW."endDate" IS NOT NULL THEN
      NEW."endDate" := (NEW."endDate" + v_step * v_skipped)::date;
    END IF;
    UPDATE contracts
    SET "endDate" = "endDate" + v_step * v_skipped, "updatedAt" = now()
    WHERE id = NEW."contractId" AND "endDate" IS NOT NULL;
  END IF;
  NEW."pausedAt" := NULL;
  NEW."pauseReason" := NULL;
  NEW."resumeOn" := NULL;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_billing_plan_active_toggle ON "contractBillingPlans";
CREATE TRIGGER trg_finance_billing_plan_active_toggle
  BEFORE UPDATE OF "isBillingActive" ON "contractBillingPlans"
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_billing_plan_active_toggle();

-- ---- Terminating a contract (spec §7.5): terminationDate defaults to today;
-- pending requests are cancelled, active ones stay collectible; active
-- retainer plans are completed. (Automatic creation paths already skip a
-- terminated contract.)
CREATE OR REPLACE FUNCTION public.finance_contract_terminating()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'terminated' AND OLD.status IS DISTINCT FROM 'terminated' THEN
    NEW."terminationDate" := COALESCE(NEW."terminationDate", public.finance_today());
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_contract_terminating ON contracts;
CREATE TRIGGER trg_finance_contract_terminating
  BEFORE UPDATE OF status ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_contract_terminating();

CREATE OR REPLACE FUNCTION public.finance_contract_terminated()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'terminated' AND OLD.status IS DISTINCT FROM 'terminated' THEN
    UPDATE "paymentRequests"
    SET status = 'cancelled', "cancelReason" = 'Contract terminated', "updatedAt" = now()
    WHERE "contractId" = NEW.id AND status = 'pending';
    UPDATE "contractBillingPlans"
    SET status = 'completed', "nextBillingDate" = NULL, "updatedAt" = now()
    WHERE "contractId" = NEW.id AND status = 'active';
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_finance_contract_terminated ON contracts;
CREATE TRIGGER trg_finance_contract_terminated
  AFTER UPDATE OF status ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.finance_contract_terminated();
