-- ============================================================
-- Currency catalog fix (writes). Review
-- pgsql/currency_catalog_fix_preview.sql first. Requires pgsql/currency_catalog.sql.
-- ============================================================
BEGIN;
SELECT step, table_name, record_id, detail FROM currency_catalog_fix_run() ORDER BY step, record_id;
COMMIT;
