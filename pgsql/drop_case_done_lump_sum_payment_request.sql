-- ============================================================
-- Remove the legacy "Auto: Case hoàn thành" Payment Request trigger
-- (2026-09-25, user decision). Standalone — safe to run on its own, any time,
-- any number of times.
--
-- trg_case_done_payment_request (on projects, AFTER UPDATE OF status) called
-- auto_create_payment_request_on_case_done(), which created a Payment Request
-- titled "Auto: Case hoàn thành - {contractCode} - {contractName}" for the
-- contract's whole outstanding balance whenever a Case became done — on every
-- contract type, duplicating the requests the current pipeline already makes.
-- By Case "One time" is now billed by its own on_case_done installment
-- (pgsql/unified_contract_payment_schedule.sql). The same DROPs are also in
-- pgsql/contract_payment_status_workflow.sql, which no longer recreates it.
--
-- This only stops NEW requests. Requests it already created are untouched —
-- review them with the query at the bottom first.
-- ============================================================

DROP TRIGGER IF EXISTS trg_case_done_payment_request ON projects;
DROP FUNCTION IF EXISTS public.auto_create_payment_request_on_case_done();

-- Check the trigger is gone (expected: 0 rows).
SELECT tgname FROM pg_trigger WHERE tgname = 'trg_case_done_payment_request';

-- Review requests it already created (read-only).
SELECT pr.id, pr.title, pr.status, pr."requestedAmount", pr."createdAt", c."contractCode", c."contractType", c."billingCycle"
FROM "paymentRequests" pr
LEFT JOIN contracts c ON c.id = pr."contractId"
WHERE pr.title LIKE 'Auto: Case hoàn thành - %'
ORDER BY pr."createdAt" DESC;
