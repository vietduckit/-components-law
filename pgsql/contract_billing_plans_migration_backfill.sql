-- ============================================================
-- Contract Billing Plans — one-time backfill from existing contracts
-- See docs/superpowers/specs/2026-09-08-contract-billing-plans-architecture-design.md §6.4
--
-- MUST run after Task 1 (contractBillingPlans collection exists) and
-- before Task 10 (old contracts columns dropped) — this file reads
-- those columns.
--
-- Idempotent: skips any contract that already has a contractBillingPlans
-- row, so safe to re-run.
-- ============================================================

INSERT INTO "contractBillingPlans" (
  "contractId", "planType", "status", "totalAmount",
  "startDate", "endDate", "retainerUnit", "retainerTotalCycles",
  "retainerCyclesBilled", "nextBillingDate", "createdAt", "updatedAt"
)
SELECT
  c.id,
  'retainer',
  CASE WHEN c."nextRetainerBillingDate" IS NULL AND COALESCE(c."retainerPeriodsBilled", 0) > 0
       THEN 'completed' ELSE 'active' END,
  COALESCE(c."totalAmount", (c."paymentSchedule" ->> 'totalAmount')::numeric),
  COALESCE(NULLIF(c."paymentSchedule" ->> 'firstPaymentDate', '')::date, c."paymentDate"::date),
  c."endDate"::date,
  COALESCE(NULLIF(c."paymentSchedule" -> 'retainerRule' ->> 'unit', ''), 'month'),
  c."retainerDuration"::integer,
  COALESCE(c."retainerPeriodsBilled", 0),
  c."nextRetainerBillingDate",
  now(), now()
FROM contracts c
WHERE (
    c."contractType" = 'retainer'
    OR COALESCE((c."paymentSchedule" -> 'retainerRule' ->> 'enabled')::boolean, false) = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM "contractBillingPlans" p WHERE p."contractId" = c.id
  )
RETURNING id, "contractId", "nextBillingDate", "retainerCyclesBilled";
