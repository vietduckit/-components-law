-- Self-checking test for pgsql/finance_foundation_migrate.sql. LOCAL ONLY —
-- the migrate file commits its own transaction, so this test leaves its
-- fixture rows behind; it is meant for the throwaway cluster of
-- scripts/tests/sql/run-local.sh (run from the repo root), never for dev.
--   bash scripts/tests/sql/run-local.sh pgsql/tests/finance_foundation_migrate_test.sql
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount")
VALUES (992000000000001, 'MIG', 'Migrate test', 'retainer', 900);
INSERT INTO "contractBillingPlans" (id, "contractId", "planType", status, "totalAmount", "retainerTotalCycles")
VALUES (992000000000002, 992000000000001, 'retainer', 'active', 900, 3);
INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount") VALUES
  (992000000000011, 'Payment request - MIG - Migrate test - Retainer period 1', 'submitted', 992000000000001, 300),
  (992000000000012, 'Payment request - MIG - Migrate test - Retainer period 2', 'approved', 992000000000001, 300),
  (992000000000013, 'Old rejected', 'rejected', 992000000000001, 300);
INSERT INTO payments (id, amount, "paymentStatus", "contractId", "paymentRequestId") VALUES
  (992000000000021, 100, 'Partial', 992000000000001, 992000000000011),
  (992000000000022, 50, 'void', 992000000000001, 992000000000011);
\i pgsql/finance_foundation_migrate.sql
DO $$
DECLARE r RECORD; s text;
BEGIN
  SELECT * INTO r FROM "paymentRequests" WHERE id = 992000000000011;
  IF r.status <> 'active' OR r."billingPlanId" <> 992000000000002 OR r."cycleNo" <> 1 THEN
    RAISE EXCEPTION 'FAIL: submitted -> active with plan/cycle (got %, %, %)', r.status, r."billingPlanId", r."cycleNo";
  END IF;
  IF r."paidAmount" <> 100 THEN RAISE EXCEPTION 'FAIL: Partial payment became Received and counts (got %)', r."paidAmount"; END IF;
  SELECT status INTO s FROM "paymentRequests" WHERE id = 992000000000013;
  IF s <> 'cancelled' THEN RAISE EXCEPTION 'FAIL: rejected -> cancelled (got %)', s; END IF;
  SELECT "paymentStatus" INTO s FROM payments WHERE id = 992000000000022;
  IF s <> 'Cancelled' THEN RAISE EXCEPTION 'FAIL: void -> Cancelled (got %)', s; END IF;
  RAISE NOTICE 'ALL FINANCE MIGRATE CHECKS PASSED';
END $$;
