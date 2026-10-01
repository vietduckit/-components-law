-- ============================================================
-- Self-checking test: finance_service_money_trail stays fast on a real-size
-- database (review finding I2: per-row subqueries recomputed every
-- allocation for every service — 57 s for 150 contracts). BEGIN ... ROLLBACK;
-- prints "ALL MONEY TRAIL PERF CHECKS PASSED". Ids 998300000000001+.
--   bash scripts/tests/sql/run-local.sh pgsql/tests/money_trail_perf_test.sql
-- ============================================================
BEGIN;

INSERT INTO currencies (id, code, "decimalPlaces", "isBaseCurrency")
SELECT 998300000000001, 'VND', 0, true WHERE NOT EXISTS (SELECT 1 FROM currencies WHERE upper(code) = 'VND');

-- 150 contracts x 3 VND services, and 450 pending requests spread over them
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "createdAt")
SELECT 998300000000000 + g, 'PF-' || g, 'Perf', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z'
FROM generate_series(1, 150) AS g;
INSERT INTO "contractServices" (id, "contractId", "serviceName", "basePrice", vat, "currencyId")
SELECT 998300000100000 + g * 10 + s, 998300000000000 + g, 'Service ' || s, 1000000 * s, 8, money_base_currency_id()
FROM generate_series(1, 150) AS g, generate_series(1, 3) AS s;
INSERT INTO "paymentRequests" (id, "contractId", status, "requestedAmount")
SELECT 998300000200000 + g * 10 + k, 998300000000000 + g, 'pending', 1000000
FROM generate_series(1, 150) AS g, generate_series(1, 3) AS k;

DO $$
DECLARE v_started timestamptz := clock_timestamp(); v_requested numeric; v_seconds numeric;
BEGIN
  SELECT sum(requested) INTO v_requested
  FROM finance_service_money_trail
  WHERE contract_id BETWEEN 998300000000001 AND 998300000000150;
  v_seconds := extract(epoch FROM clock_timestamp() - v_started);
  IF v_requested <> 450000000 THEN
    RAISE EXCEPTION 'FAIL: every request is spread over its services (got %)', v_requested;
  END IF;
  IF v_seconds > 10 THEN
    RAISE EXCEPTION 'FAIL: the trail of 150 contracts reads in under 10 s (took % s)', round(v_seconds, 1);
  END IF;
  RAISE NOTICE 'trail of 150 contracts: % s', round(v_seconds, 2);
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL MONEY TRAIL PERF CHECKS PASSED'; END $$;
ROLLBACK;
