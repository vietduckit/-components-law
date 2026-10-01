-- ============================================================
-- Self-checking test: the unique indexes NocoBase used to drop.
-- NocoBase's collection sync removes single-column unique indexes it does not
-- know about (reading their columns from pg_index.indkey). These three list
-- their column twice, so indkey has two entries: NocoBase keeps them, and they
-- still enforce one open row per unit and still serve ON CONFLICT (column).
-- BEGIN ... ROLLBACK; prints "ALL NOCOBASE-SAFE INDEX CHECKS PASSED".
--   bash scripts/tests/sql/run-local.sh pgsql/tests/nocobase_safe_indexes_test.sql
-- ============================================================
BEGIN;
DO $$
DECLARE
  r record;
  v_idx record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('ux_payment_requests_schedule_open', 'paymentRequests', 'contractPaymentScheduleId'),
    ('ux_payment_requests_project_service_open', 'paymentRequests', 'projectServiceId'),
    ('contractServices_projectServiceId_unique', 'contractServices', 'projectServiceId')) AS t(idx, tbl, col)
  LOOP
    SELECT ix.indisunique, ix.indnatts, ix.indkey[0] AS k0, ix.indkey[1] AS k1, a.attname
      INTO v_idx
    FROM pg_index ix
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = ix.indkey[0]
    WHERE i.relname = r.idx AND ix.indrelid = format('%I', r.tbl)::regclass;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'FAIL: % is missing', r.idx;
    END IF;
    IF NOT v_idx.indisunique OR v_idx.indnatts <> 2 OR v_idx.k0 <> v_idx.k1 OR v_idx.attname <> r.col THEN
      RAISE EXCEPTION 'FAIL: % must be unique on ("%", "%") (got % columns, first %)',
        r.idx, r.col, r.col, v_idx.indnatts, v_idx.attname;
    END IF;
  END LOOP;

  -- ON CONFLICT (column) still finds its arbiter (planned, not run: no row, no trigger)
  EXECUTE $q$EXPLAIN INSERT INTO "paymentRequests" (id, "contractPaymentScheduleId", status) VALUES (1, 1, 'active')
    ON CONFLICT ("contractPaymentScheduleId")
    WHERE "contractPaymentScheduleId" IS NOT NULL AND status IS DISTINCT FROM 'cancelled' DO NOTHING$q$;
  RAISE NOTICE 'ALL NOCOBASE-SAFE INDEX CHECKS PASSED';
END $$;
ROLLBACK;
