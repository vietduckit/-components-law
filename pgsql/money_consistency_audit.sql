-- ============================================================
-- Money consistency audit (read-only). Run any time after
-- pgsql/money_flow_trail.sql and pgsql/service_thread_sync.sql;
-- expected result: 0 rows in both.
-- Rules: docs/superpowers/specs/2026-09-29-money-flow-unification-design.md §7.5,
--        docs/superpowers/specs/2026-09-29-service-thread-sync-design.md §8
-- ============================================================
SELECT rule, table_name, record_id, contract_id, detail
FROM money_consistency_violations
ORDER BY rule, table_name, record_id;

SELECT rule, table_name, record_id, thread_id, detail
FROM service_thread_violations
ORDER BY rule, table_name, record_id;

-- exchange rates to enter (pgsql/currency_catalog.sql): a foreign currency
-- with no foreign -> VND rate, or whose latest one is older than 30 days
SELECT currency, last_date, days_old, detail
FROM money_rate_warnings
ORDER BY currency;
