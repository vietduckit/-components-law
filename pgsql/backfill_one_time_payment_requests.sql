-- ============================================================
-- ONE-TIME BACKFILL — run once, AFTER re-deploying
-- pgsql/contract_payment_status_workflow.sql and
-- pgsql/unified_contract_payment_schedule.sql (2026-09-24).
--
-- By Case "One time" contracts now get their Payment Request when a Case is
-- linked (trg_by_case_one_time_case_linked_creates_payment_request). Cases
-- linked BEFORE that trigger existed never fire it, and the legacy lump-sum
-- trigger that used to cover them (trg_case_done_payment_request) is
-- dropped — so run the same logic once for every Case already linked.
--
-- by_case_one_time_ensure_payment_request() does all the filtering itself:
-- only byCase + not multiple_payments + not paid, and only contracts with no
-- contractPaymentSchedules row and no paymentRequests yet (contracts already
-- billed by the old "Auto: Case hoàn thành" request are left alone). A Case
-- that is already Done gets its request activated immediately.
--
-- Idempotent: after the first run every eligible contract has a schedule
-- row, so a second run does nothing. One call per contract — if several
-- Cases share a contract, a Done one is preferred.
-- ============================================================

SELECT public.by_case_one_time_ensure_payment_request(linked."contractId", linked.status)
FROM (
  SELECT DISTINCT ON (p."contractId") p."contractId", p.status
  FROM projects p
  WHERE p."contractId" IS NOT NULL
  ORDER BY p."contractId", (p.status = 'done') DESC, p.id
) linked;

-- Check: One time By Case contracts with a linked Case but still no Payment
-- Request (expected 0 rows, except contracts with a zero total or already paid).
SELECT c.id, c."contractCode", c."billingCycle", c."totalAmount", c."paymentStatus"
FROM contracts c
WHERE c."contractType" = 'byCase'
  AND COALESCE(c."billingCycle", 'one_time') <> 'multiple_payments'
  AND EXISTS (SELECT 1 FROM projects p WHERE p."contractId" = c.id)
  AND NOT EXISTS (SELECT 1 FROM "paymentRequests" pr WHERE pr."contractId" = c.id);
