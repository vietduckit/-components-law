-- ============================================================
-- Self-checking test for pgsql/finance_members.sql. Run AFTER deploying it:
--   psql ... -f pgsql/tests/finance_members_test.sql
--   bash scripts/tests/sql/run-local.sh pgsql/tests/finance_members_test.sql
-- BEGIN ... ROLLBACK; prints "ALL FINANCE MEMBERS CHECKS PASSED".
-- Ids 994000000000001+.
-- ============================================================
BEGIN;

INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "totalAmount", status)
VALUES (994000000000001, 'FM-1', 'Finance members test', 'byCase', 1000, 'execution');
-- two cases on the contract: managers 994000000000701 / 994000000000702,
-- case 1 has Finance member 994000000000703 (and its manager again)
INSERT INTO projects (id, "contractId", status, "managerId") VALUES
  (994000000000011, 994000000000001, 'in_progress', 994000000000701),
  (994000000000012, 994000000000001, 'in_progress', 994000000000702);
SELECT public.finance_link_members('projectFinanceMembers', 'projectId', 994000000000011,
  ARRAY[994000000000703, 994000000000701]::bigint[]);

DO $$
DECLARE ids bigint[]; n int;
BEGIN
  ids := public.finance_default_member_ids(994000000000001);
  IF ids IS DISTINCT FROM ARRAY[994000000000701, 994000000000702, 994000000000703]::bigint[] THEN
    RAISE EXCEPTION 'FAIL: default = Finance members + Manager of every case, once each (got %)', ids;
  END IF;
  IF public.finance_default_member_ids(NULL) <> '{}'::bigint[] THEN
    RAISE EXCEPTION 'FAIL: no contract -> nobody';
  END IF;

  -- a request gets the default people when it is created
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount")
  VALUES (994000000000101, 'Members request', 'active', 994000000000001, 500);
  SELECT array_agg("lawyerId" ORDER BY "lawyerId") INTO ids FROM "paymentRequestFinanceMembers" WHERE "paymentRequestId" = 994000000000101;
  IF ids IS DISTINCT FROM ARRAY[994000000000701, 994000000000702, 994000000000703]::bigint[] THEN
    RAISE EXCEPTION 'FAIL: request assigned to the default people (got %)', ids;
  END IF;

  -- people changed on the request by hand -> its invoice and payments follow the request
  DELETE FROM "paymentRequestFinanceMembers" WHERE "paymentRequestId" = 994000000000101 AND "lawyerId" = 994000000000702;
  INSERT INTO invoices (id, "invoiceNumber", status, "totalAmount", "paymentRequestId", "contractId")
  VALUES (994000000000201, 'INV-FM', 'pending', 500, 994000000000101, 994000000000001);
  SELECT array_agg("lawyerId" ORDER BY "lawyerId") INTO ids FROM "invoiceFinanceMembers" WHERE "invoiceId" = 994000000000201;
  IF ids IS DISTINCT FROM ARRAY[994000000000701, 994000000000703]::bigint[] THEN
    RAISE EXCEPTION 'FAIL: invoice takes its request''s people (got %)', ids;
  END IF;
  INSERT INTO payments (id, amount, "paymentStatus", "contractId", "invoiceId")
  VALUES (994000000000301, 100, 'Received', 994000000000001, 994000000000201);
  SELECT array_agg("lawyerId" ORDER BY "lawyerId") INTO ids FROM "paymentFinanceMembers" WHERE "paymentId" = 994000000000301;
  IF ids IS DISTINCT FROM ARRAY[994000000000701, 994000000000703]::bigint[] THEN
    RAISE EXCEPTION 'FAIL: payment on an invoice takes the request''s people (got %)', ids;
  END IF;

  -- a payment on the contract only -> the default people
  INSERT INTO payments (id, amount, "paymentStatus", "contractId") VALUES (994000000000302, 50, 'Received', 994000000000001);
  SELECT count(*) INTO n FROM "paymentFinanceMembers" WHERE "paymentId" = 994000000000302;
  IF n <> 3 THEN RAISE EXCEPTION 'FAIL: contract-only payment gets the default people (got %)', n; END IF;

  -- linking twice adds nobody twice
  IF public.finance_link_members('paymentRequestFinanceMembers', 'paymentRequestId', 994000000000101,
       ARRAY[994000000000701, 994000000000709]::bigint[]) <> 1 THEN
    RAISE EXCEPTION 'FAIL: only the new person is linked';
  END IF;

  -- a request without a contract: nobody, and no error
  INSERT INTO "paymentRequests" (id, title, status, "requestedAmount") VALUES (994000000000102, 'No contract', 'active', 10);
  IF EXISTS (SELECT 1 FROM "paymentRequestFinanceMembers" WHERE "paymentRequestId" = 994000000000102) THEN
    RAISE EXCEPTION 'FAIL: no contract -> nobody assigned';
  END IF;
END $$;

-- backfill: records created before the people were set get them once
DO $$
DECLARE n int;
BEGIN
  INSERT INTO "paymentRequests" (id, title, status, "contractId", "requestedAmount")
  VALUES (994000000000103, 'Old request', 'active', 994000000000001, 10);
  DELETE FROM "paymentRequestFinanceMembers" WHERE "paymentRequestId" = 994000000000103;
  PERFORM public.finance_members_backfill();
  SELECT count(*) INTO n FROM "paymentRequestFinanceMembers" WHERE "paymentRequestId" = 994000000000103;
  IF n <> 3 THEN RAISE EXCEPTION 'FAIL: backfill assigns the default people (got %)', n; END IF;
  -- a record that already has people is left alone
  SELECT count(*) INTO n FROM "paymentRequestFinanceMembers" WHERE "paymentRequestId" = 994000000000101;
  IF n <> 3 THEN RAISE EXCEPTION 'FAIL: backfill leaves assigned records alone (got %)', n; END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL FINANCE MEMBERS CHECKS PASSED'; END $$;
ROLLBACK;
