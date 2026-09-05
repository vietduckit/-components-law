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

-- ---- Trigger: auto-create a Payment Request when a Case finishes unpaid -
CREATE OR REPLACE FUNCTION public.auto_create_payment_request_on_case_done()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_contract RECORD;
  v_new_id BIGINT;
BEGIN
  IF NEW.status <> 'done' OR OLD.status IS NOT DISTINCT FROM 'done' THEN
    RETURN NEW;
  END IF;

  IF NEW."contractId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, "contractCode", "contractName", "customerId", "internalCompanyId",
         "paymentStatus", "outStandingAmount"
  INTO v_contract
  FROM contracts
  WHERE id = NEW."contractId";

  IF v_contract.id IS NULL OR v_contract."paymentStatus" = 'paid' THEN
    RETURN NEW;
  END IF;

  -- "paymentRequests".id has no DB-side default (Nocobase snowflake id,
  -- normally assigned by the app) — same id-generation convention already
  -- used by pgsql/AutoCreateTaskFromTemplate.sql for the same situation.
  v_new_id := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000 + (random() * 999)::INT;

  INSERT INTO "paymentRequests" (
    id, title, status, "contractId", "customerId", "internalCompanyId",
    "requestedAmount", "createdAt", "updatedAt"
  ) VALUES (
    v_new_id,
    'Auto: Case hoàn thành - ' || COALESCE(v_contract."contractCode", '') || ' - ' || COALESCE(v_contract."contractName", ''),
    'submitted',
    v_contract.id, v_contract."customerId", v_contract."internalCompanyId",
    v_contract."outStandingAmount",
    now(), now()
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_case_done_payment_request ON projects;
CREATE TRIGGER trg_case_done_payment_request
  AFTER UPDATE OF "status" ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_payment_request_on_case_done();

-- ---- One-time backfill: correct all pre-existing rows -------------------
-- New contracts/payments from here on are handled entirely by the triggers
-- above. This is only for rows that already existed *before* this migration
-- ran — their outStandingAmount/paymentStatus are still at the column
-- default (0/'unpaid') because ADD COLUMN ... DEFAULT doesn't fire an
-- INSERT trigger. Safe to run repeatedly — recompute, not increment.
WITH received AS (
  SELECT "contractId", COALESCE(SUM(amount), 0) AS total_received
  FROM payments
  WHERE "contractId" IS NOT NULL AND LOWER("paymentStatus") = 'received'
  GROUP BY "contractId"
)
UPDATE contracts c
SET "outStandingAmount" = contract_resolved_total(c.id) - COALESCE(r.total_received, 0),
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
