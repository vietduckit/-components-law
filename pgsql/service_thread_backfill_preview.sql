-- ============================================================
-- Service thread backfill PREVIEW (nothing is kept): runs
-- service_thread_backfill_run() inside a transaction that is rolled back,
-- then lists what it did and what the audits would still show.
-- Steps (spec §9): links, threads, currency, content, deleted lines, money.
--   'currency (billed …, not changed)' / 'content (billed …, not changed)'
--       -> a billed contract's thread: decide by hand;
--   'deleted line kept (task in progress)' -> handle the task first.
-- Run pgsql/service_thread_backfill.sql to apply.
-- ============================================================
BEGIN;
CREATE TEMP TABLE st_preview AS SELECT * FROM service_thread_backfill_run();
SELECT step, count(*) AS rows FROM st_preview GROUP BY step ORDER BY step;
SELECT step, table_name, record_id, detail FROM st_preview WHERE step NOT LIKE 'money:%' ORDER BY step, table_name, record_id;
SELECT rule, count(*) FROM service_thread_violations GROUP BY rule ORDER BY rule;
SELECT rule, count(*) FROM money_consistency_violations GROUP BY rule ORDER BY rule;
ROLLBACK;
