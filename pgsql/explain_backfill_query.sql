-- ============================================================
-- ONE-TIME DIAGNOSTIC — safe to run, does NOT write anything (EXPLAIN
-- ANALYZE on a SELECT executes it for real to measure timing, but this is
-- read-only regardless).
--
-- Shows the ACTUAL execution plan Postgres chose for the backfill query's
-- SELECT (same shape as pgsql/backfill_payment_request_services.sql, minus
-- the INSERT), plus real memory/row numbers — rather than reasoning about
-- the query in the abstract. Look specifically for:
--   - "Seq Scan" where you'd expect an "Index Scan" (missing index, or
--     stats stale enough that the planner thinks a seq scan is cheaper).
--   - Any "rows=" estimate wildly different from "actual rows=" (bad
--     statistics — common right after a restore before ANALYZE runs).
--   - A "Sort" or "Hash" node with a large "Memory:"/"Batches:" figure,
--     or "Disk:" appearing (means it spilled past work_mem — usually FINE,
--     just slower, but confirms whether memory pressure is even plausible
--     for this specific query).
-- ============================================================

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT
  (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000
    + (random() * 999)::INT
    + ROW_NUMBER() OVER (),
  pr.id,
  cpss."contractServiceId",
  now(),
  now()
FROM "paymentRequests" pr
JOIN "contractPaymentScheduleServices" cpss
  ON cpss."contractPaymentScheduleId" = pr."contractPaymentScheduleId"
WHERE pr."contractPaymentScheduleId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "paymentRequestServices" prs
    WHERE prs."paymentRequestId" = pr.id
      AND prs."contractServiceId" = cpss."contractServiceId"
  );

-- ---- Sanity check: actual row counts of the 3 tables involved, right now
-- ---- — confirms whether they're still the small tables from before the
-- ---- restore, or something ballooned unexpectedly.
SELECT 'paymentRequests' AS table_name, count(*) FROM "paymentRequests"
UNION ALL
SELECT 'contractPaymentScheduleServices', count(*) FROM "contractPaymentScheduleServices"
UNION ALL
SELECT 'paymentRequestServices', count(*) FROM "paymentRequestServices";

-- ---- Have statistics been refreshed since the restore? If last_analyze/
-- ---- last_autoanalyze are NULL or old, the plan above may have been
-- ---- computed off stale/default estimates. If so, run `ANALYZE;` (whole
-- ---- database, cheap, read-only-ish) and re-run the EXPLAIN above to
-- ---- compare.
SELECT relname, last_analyze, last_autoanalyze, n_live_tup
FROM pg_stat_user_tables
WHERE relname IN ('paymentRequests', 'contractPaymentScheduleServices', 'paymentRequestServices');
