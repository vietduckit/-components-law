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
CREATE OR REPLACE FUNCTION public.contract_resolved_total(p_contract_id BIGINT)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $function$
  SELECT COALESCE(
    NULLIF(c."totalAmount", 0),
    NULLIF(c."fixedAmount", 0),
    NULLIF(c."subTotal", 0) + COALESCE(c."vatAmount", 0),
    NULLIF(c."monthlyFee", 0) * NULLIF(c."retainerDuration", 0),
    0
  )
  FROM contracts c
  WHERE c.id = p_contract_id;
$function$;
