-- ============================================================
-- Money BACKFILL (writes). Run only after reviewing
-- pgsql/money_flow_backfill_preview.sql. Then run
-- pgsql/money_consistency_audit.sql: only 'protected' and 'missing rate'
-- lines may remain.
-- ============================================================
BEGIN;
SELECT * FROM money_backfill_run();
COMMIT;
