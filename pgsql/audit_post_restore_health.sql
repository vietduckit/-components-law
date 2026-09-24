-- ============================================================
-- ONE-TIME POST-RESTORE HEALTH AUDIT — not a migration, run directly
-- against Postgres (psql/pgAdmin) right after restoring a DB backup.
-- Read-only — makes no changes. Written 2026-09-22.
--
-- A restore introduces 2 risk categories a plain code review can't catch:
--   1. Schema/trigger DRIFT — the backup may predate some of this repo's
--      pgsql/*.sql migrations (or predate a DROP of an obsolete one), so
--      the restored DB's actual triggers/columns may not match what the
--      CURRENT application code (ContractCreateForm.js, TaskManagement.js,
--      etc.) expects. This causes broken features or double-processing,
--      not RAM overflow by itself — but see #2.
--   2. Postgres MEMORY CONFIGURATION vs. the actual server's real RAM — by
--      far the most common real-world cause of "server RAM overflow" with
--      Postgres, and totally independent of any trigger's own logic:
--      shared_buffers + (max_connections * work_mem, worst case with every
--      connection running a sort/hash at once) can exceed physical RAM if
--      the restored instance runs on a smaller box than whatever the
--      config values were originally tuned for, or if the restore process
--      itself reset postgresql.conf to generic defaults.
--
-- Run every section below and report back the output — some sections
-- (marked) need you to separately compare against the server's actual
-- physical RAM, which this SQL session cannot see from inside the
-- database itself.
-- ============================================================

-- ---- SECTION 1: Schema drift — which of this repo's migrations are
-- ---- actually applied? (reuses the trigger catalog from
-- ---- audit_trigger_catalog.sql, plus the columns/collections most
-- ---- recently touched this session)
SELECT
  c.relname AS table_name,
  t.tgname AS trigger_name,
  p.proname AS function_name,
  CASE t.tgenabled WHEN 'O' THEN 'enabled' WHEN 'D' THEN 'DISABLED' ELSE t.tgenabled::text END AS status
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND c.relname IN (
    'contracts', 'contractPaymentSchedules', 'contractPaymentScheduleServices',
    'paymentRequests', 'paymentRequestServices', 'paymentRequestItems',
    'tasks', 'projects', 'payments', 'contractBillingPlans'
  )
ORDER BY c.relname, t.tgname;

-- Flag: should be EMPTY. Non-empty = the restore brought back a trigger
-- this repo's migrations say should be dropped — re-run the matching
-- DROP script (contracts_drop_obsolete_retainer_trigger.sql /
-- unified_contract_payment_schedule.sql's own drop line).
SELECT c.relname AS table_name, t.tgname AS trigger_name
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
WHERE NOT t.tgisinternal
  AND t.tgname IN (
    'trg_contract_init_retainer_billing_state',
    'trg_by_case_create_scheduled_payment_requests'
  );

-- Flag: should exist. Missing = this session's newest migrations (§6h)
-- were never (re-)applied after the restore.
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('contractPaymentScheduleServices', 'paymentRequestServices')
  AND table_schema = 'public';

-- ---- SECTION 2: Postgres memory configuration — compare these against
-- ---- the SERVER's actual physical RAM (check separately, e.g. via the
-- ---- hosting dashboard or `free -h` on the box itself — this query
-- ---- cannot see that from inside Postgres).
SELECT
  name,
  setting,
  unit,
  CASE
    WHEN name = 'shared_buffers' THEN 'Typically 25% of RAM. If this looks sized for a bigger box than the restore target, it may over-commit.'
    WHEN name = 'work_mem' THEN 'PER SORT/HASH OPERATION, PER CONNECTION — a query with several sorts can use multiples of this. High work_mem x high max_connections is the single most common real cause of Postgres OOM.'
    WHEN name = 'max_connections' THEN 'Worst-case total memory pressure scales with this x work_mem. If the app''s connection pool size was tuned for different infra, check it still matches this.'
    WHEN name = 'maintenance_work_mem' THEN 'Used by VACUUM/CREATE INDEX/restore itself — a big REINDEX right after restore can spike this once.'
    WHEN name = 'effective_cache_size' THEN 'Just a planner hint, not actually allocated — not a real memory risk on its own.'
  END AS note
FROM pg_settings
WHERE name IN ('shared_buffers', 'work_mem', 'max_connections', 'maintenance_work_mem', 'effective_cache_size');

-- Rough worst-case ceiling estimate (very conservative — assumes every
-- connection is simultaneously running at least one sort/hash):
SELECT
  (SELECT setting::bigint FROM pg_settings WHERE name = 'shared_buffers') AS shared_buffers_kb,
  (SELECT setting::bigint FROM pg_settings WHERE name = 'work_mem') AS work_mem_kb,
  (SELECT setting::bigint FROM pg_settings WHERE name = 'max_connections') AS max_connections,
  (SELECT setting::bigint FROM pg_settings WHERE name = 'work_mem') *
    (SELECT setting::bigint FROM pg_settings WHERE name = 'max_connections') AS worst_case_work_mem_total_kb;

-- ---- SECTION 3: What's actually running RIGHT NOW — long-running or
-- ---- idle-in-transaction sessions hold memory/locks and are a common
-- ---- post-restore surprise (e.g. a stuck migration script, a leaked
-- ---- connection from before the restore).
SELECT
  pid,
  usename,
  state,
  now() - query_start AS running_for,
  now() - xact_start AS in_transaction_for,
  LEFT(query, 200) AS query_preview
FROM pg_stat_activity
WHERE state <> 'idle'
  AND pid <> pg_backend_pid()
ORDER BY query_start ASC;

-- Flag specifically: idle-in-transaction sessions (these hold row locks
-- and prevent VACUUM from reclaiming space — a very common leak).
SELECT pid, usename, now() - state_change AS idle_for, LEFT(query, 200) AS last_query
FROM pg_stat_activity
WHERE state = 'idle in transaction'
ORDER BY state_change ASC;

-- ---- SECTION 4: Have stats been refreshed since the restore? A restore
-- ---- often leaves table statistics stale until ANALYZE runs, which can
-- ---- make the planner pick memory-hungry plans (e.g. a hash join sized
-- ---- for the wrong row-count estimate) until it's run.
SELECT
  schemaname, relname,
  last_analyze, last_autoanalyze,
  n_live_tup, n_dead_tup
FROM pg_stat_user_tables
WHERE relname IN ('tasks', 'contracts', 'paymentRequests', 'projects', 'documents', 'folders')
ORDER BY relname;
-- If last_analyze/last_autoanalyze are NULL or clearly from before
-- today's restore, run: ANALYZE; (whole database, safe, read-mostly cost)

-- ---- SECTION 5: Current total database size and per-table size, for a
-- ---- sanity check against what the restore was expected to bring back
-- ---- (a partial/failed restore is its own separate but related problem).
SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size;

SELECT
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  n_live_tup AS estimated_rows
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;
