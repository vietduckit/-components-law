-- ============================================================
-- Finance P1 — ONE-TIME data migration. Run AFTER pgsql/finance_foundation.sql.
-- Plan: docs/superpowers/plans/2026-09-28-finance-p1-foundation.md
-- Safe to re-run (every UPDATE only touches rows not yet migrated; the paid
-- backfill is a recompute).
-- ============================================================
BEGIN;

-- Cancelling needs a reason once Finance P2 (pgsql/finance_billing_rules.sql)
-- is deployed; the column is added here too so this file runs before or after P2.
ALTER TABLE "paymentRequests" ADD COLUMN IF NOT EXISTS "cancelReason" text;

-- Request statuses: pending / active / cancelled only (spec §4)
UPDATE "paymentRequests" SET status = 'active'
WHERE status IN ('submitted', 'checking', 'approved', 'converted');
UPDATE "paymentRequests"
SET status = 'cancelled', "cancelReason" = COALESCE("cancelReason", 'Migrated from status ' || status)
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
SELECT 'payments.paymentStatus not migrated' AS check_name, "paymentStatus" AS value, count(*)
FROM payments
WHERE lower(btrim(COALESCE("paymentStatus", ''))) NOT IN ('received', 'cancelled')
GROUP BY "paymentStatus"
UNION ALL
SELECT 'paymentRequests.status not migrated', status, count(*)
FROM "paymentRequests"
WHERE status IS NULL OR status NOT IN ('pending', 'active', 'cancelled')
GROUP BY status;
