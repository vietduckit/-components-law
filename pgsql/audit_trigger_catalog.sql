-- ============================================================
-- ONE-TIME AUDIT QUERY — not a migration, run directly against Postgres
-- (psql/pgAdmin/whatever client runs the other pgsql/*.sql files) to
-- confirm what's ACTUALLY live in the database, rather than trusting each
-- .sql file's own history of what it says it dropped/created.
--
-- Written 2026-09-22 after a file-by-file audit of every pgsql/*.sql
-- trigger for RAM-overflow and conflict risk. Conclusion from reading the
-- code: no unbounded loops, no self-recursive trigger cascades, no
-- cartesian-blowup joins — every loop in this codebase is scoped by a
-- specific FK match (one case's tasks, one installment's service tags,
-- etc.), so no RAM risk from trigger logic itself. The one real risk
-- category found was DEPLOYMENT DRIFT — a trigger a later file says it
-- dropped might still be live if that drop script was never actually run,
-- or might get resurrected if an old, un-updated file (like the previous
-- version of retainer_billing_automation.sql) is re-run by mistake. This
-- query checks the live catalog directly instead of re-reading file
-- history.
--
-- Read-only — makes no changes.
-- ============================================================

-- ---- 1. Every trigger currently defined on the tables this project's
-- ---- pgsql/ triggers touch, with the function it calls and whether it's
-- ---- enabled. Cross-check against the "expected" list further down.
SELECT
  c.relname AS table_name,
  t.tgname AS trigger_name,
  p.proname AS function_name,
  CASE t.tgenabled WHEN 'O' THEN 'enabled' WHEN 'D' THEN 'DISABLED' ELSE t.tgenabled::text END AS status,
  pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND c.relname IN (
    'contracts', 'contractPaymentSchedules', 'contractPaymentScheduleServices',
    'paymentRequests', 'paymentRequestServices', 'paymentRequestItems',
    'tasks', 'projects', 'payments', 'contractBillingPlans',
    'caseAssignees', 'documents', 'folders', 'projectInternal',
    'documentShares'
  )
ORDER BY c.relname, t.tgname;

-- ---- 2. Specifically flag the 2 triggers that should NOT exist anymore —
-- ---- confirmed superseded, each with a dedicated DROP TRIGGER IF EXISTS
-- ---- somewhere in pgsql/*.sql. An empty result here is the "all clear".
SELECT
  c.relname AS table_name,
  t.tgname AS trigger_name,
  'Should have been dropped — see pgsql/contracts_drop_obsolete_retainer_trigger.sql or pgsql/unified_contract_payment_schedule.sql' AS note
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE NOT t.tgisinternal
  AND t.tgname IN (
    'trg_contract_init_retainer_billing_state',
    'trg_by_case_create_scheduled_payment_requests'
  );

-- ---- 3. Any table with MORE THAN ONE trigger for the SAME event — not
-- ---- necessarily wrong (several are intentional, documented cascades in
-- ---- this codebase — e.g. tasks.status has 3 by design), but worth a
-- ---- quick look at anything unexpected showing up here after future
-- ---- changes.
SELECT
  c.relname AS table_name,
  t.tgtype,
  array_agg(t.tgname ORDER BY t.tgname) AS triggers_sharing_this_event
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE NOT t.tgisinternal
GROUP BY c.relname, t.tgtype
HAVING COUNT(*) > 1
ORDER BY c.relname;
