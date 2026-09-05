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
CREATE OR REPLACE FUNCTION public.contract_resolved_total_from_row(c contracts)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT COALESCE(
    NULLIF(c."totalAmount", 0),
    NULLIF(c."fixedAmount", 0),
    NULLIF(c."subTotal", 0) + COALESCE(c."vatAmount", 0),
    NULLIF(c."monthlyFee", 0) * NULLIF(c."retainerDuration", 0),
    0
  );
$function$;

CREATE OR REPLACE FUNCTION public.contract_resolved_total(p_contract_id BIGINT)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $function$
  SELECT contract_resolved_total_from_row(c)
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

-- ---- Trigger: recompute the contract whenever a payment's status changes -
CREATE OR REPLACE FUNCTION public.contract_recompute_outstanding()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_contract_id BIGINT;
  v_total NUMERIC;
  v_received NUMERIC;
BEGIN
  v_contract_id := COALESCE(NEW."contractId", OLD."contractId");
  IF v_contract_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_total := contract_resolved_total(v_contract_id);

  SELECT COALESCE(SUM(p.amount), 0) INTO v_received
  FROM payments p
  WHERE p."contractId" = v_contract_id
    AND LOWER(p."paymentStatus") = 'received';

  UPDATE contracts
  SET "outStandingAmount" = v_total - v_received,
      "paymentStatus" = CASE
        WHEN (v_total - v_received) <= 0 THEN 'paid'
        WHEN v_received > 0 THEN 'partial'
        ELSE 'unpaid'
      END
  WHERE id = v_contract_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trg_payment_recompute_contract ON payments;
CREATE TRIGGER trg_payment_recompute_contract
  AFTER INSERT OR UPDATE OF "paymentStatus" ON payments
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
