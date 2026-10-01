-- ============================================================
-- Currency catalog fix PREVIEW (nothing is kept): runs
-- currency_catalog_fix_run() inside a transaction that is rolled back.
--   'rate deleted (wrong direction)'  -> a VND -> foreign rate that reads
--       10,000 times off; the currency keeps its foreign -> VND rate;
--   'rate kept (…)'                   -> the currency's only rate: enter a
--       foreign -> VND rate, then run the fix again;
--   'company price currency'          -> the currency a company price gets:
--       check the VND / foreign guesses before running the fix.
-- Run pgsql/currency_catalog_fix.sql to apply.
-- ============================================================
BEGIN;
SELECT step, table_name, record_id, detail FROM currency_catalog_fix_run() ORDER BY step, record_id;
SELECT currency, last_date, days_old, detail FROM money_rate_warnings ORDER BY currency;
ROLLBACK;
