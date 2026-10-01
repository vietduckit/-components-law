-- ============================================================
-- READ-ONLY. Run on dev BEFORE runbook step 1.
-- Step 1 creates three unique indexes that dev does not have yet:
--   finance_foundation.sql  : ux_payment_requests_schedule_open,
--                             ux_payment_requests_project_service_open
--   service_thread_sync.sql : contractServices_projectServiceId_unique
-- CREATE UNIQUE INDEX fails (and stops the file) when existing rows already
-- break it. This lists those rows with the exact predicate of each index (for
-- payment requests only 'cancelled' frees a unit; 'rejected' still counts,
-- unlike the older finance_foundation_audit.sql).
-- Result: result · item · detail · action
--   duplicate      -> fix these rows first (see action)
--   ready          -> no conflict: the file can build the index
--   existing index -> unique indexes the tables have now (a same-purpose
--                     index under another name shows up here)
-- ============================================================
WITH dup AS (
  SELECT 'pgsql/finance_foundation.sql' AS file, 'ux_payment_requests_schedule_open' AS index_name,
         'schedule row' AS unit, "contractPaymentScheduleId" AS unit_id, count(*) AS n,
         string_agg('request ' || id || ' (' || COALESCE(status::text, 'null') || ')', ', ' ORDER BY id) AS rows_found,
         'cancel (status = cancelled) or merge the extra requests' AS fix
  FROM "paymentRequests" WHERE "contractPaymentScheduleId" IS NOT NULL AND status IS DISTINCT FROM 'cancelled'
  GROUP BY "contractPaymentScheduleId"
  HAVING count(*) > 1
  UNION ALL
  SELECT 'pgsql/finance_foundation.sql', 'ux_payment_requests_project_service_open',
         'case service', "projectServiceId", count(*),
         string_agg('request ' || id || ' (' || COALESCE(status::text, 'null') || ')', ', ' ORDER BY id),
         'cancel (status = cancelled) or merge the extra requests'
  FROM "paymentRequests" WHERE "projectServiceId" IS NOT NULL AND "contractPaymentScheduleId" IS NULL
    AND status IS DISTINCT FROM 'cancelled'
  GROUP BY "projectServiceId"
  HAVING count(*) > 1
  UNION ALL
  SELECT 'pgsql/service_thread_sync.sql', 'contractServices_projectServiceId_unique',
         'case service', "projectServiceId", count(*),
         string_agg('contract line ' || id || ' (contract ' || COALESCE("contractId"::text, 'null') || ')', ', ' ORDER BY id),
         'keep one contract line per case line: clear projectServiceId on the others'
  FROM "contractServices" WHERE "projectServiceId" IS NOT NULL
  GROUP BY "projectServiceId"
  HAVING count(*) > 1
)
SELECT 'duplicate' AS result, index_name AS item,
       format('%s: %s %s has %s rows: %s', file, unit, unit_id, n, rows_found) AS detail,
       fix AS action
FROM dup
UNION ALL
SELECT 'ready', i.name, i.file || ': no conflicting rows', 'safe to run the file'
FROM (VALUES ('pgsql/finance_foundation.sql', 'ux_payment_requests_schedule_open'),
             ('pgsql/finance_foundation.sql', 'ux_payment_requests_project_service_open'),
             ('pgsql/service_thread_sync.sql', 'contractServices_projectServiceId_unique')) AS i(file, name)
WHERE NOT EXISTS (SELECT 1 FROM dup WHERE dup.index_name = i.name)
UNION ALL
SELECT 'existing index', tablename || '.' || indexname, indexdef, ''
FROM pg_indexes
WHERE tablename IN ('paymentRequests', 'contractServices') AND indexdef ILIKE '%unique%'
ORDER BY 1, 2, 3;
