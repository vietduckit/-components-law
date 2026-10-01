-- ============================================================
-- Self-checking test: the money trail (pgsql/money_flow_trail.sql).
-- BEGIN ... ROLLBACK; prints "ALL MONEY TRAIL CHECKS PASSED". Ids 998100000000001+.
--   psql ... -f pgsql/tests/money_trail_test.sql
--   bash scripts/tests/sql/run-local.sh pgsql/tests/money_trail_test.sql
-- ============================================================
BEGIN;

INSERT INTO currencies (id, code, "decimalPlaces", "isBaseCurrency")
SELECT 998100000000001, 'VND', 0, true WHERE NOT EXISTS (SELECT 1 FROM currencies WHERE upper(code) = 'VND');
INSERT INTO currencies (id, code, "decimalPlaces") VALUES (998100000000002, 'XTU', 2);
INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate", status) VALUES
  (998100000000011, 998100000000002, money_base_currency_id(), 26176.5, '2026-08-18T09:18:17Z', NULL),
  (998100000000012, 998100000000002, money_base_currency_id(), 26000, '2026-09-10T03:00:00Z', NULL);

-- quotation (1 Sep): 10 XTU + 8% and 1,000,000 VND + 8%
INSERT INTO quotations (id, "pricingMode", "createdAt") VALUES (998100000000101, 'line', '2026-09-01T02:00:00Z');
INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", quantity, vat, "currencyId") VALUES
  (998100000000111, 998100000000101, 'Trademark', 10, 1, 8, 998100000000002),
  (998100000000112, 998100000000101, 'Setup', 1000000, 1, 8, money_base_currency_id());
-- contract signed 15 Sep: the trademark price went up to 12 XTU
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "signedAt", "createdAt")
VALUES (998100000000201, 'TR-1', 'Trail', 'byCase', 'line', 'execution', '2026-09-15T02:00:00Z', '2026-09-01T02:00:00Z');
INSERT INTO projects (id, "contractId", status, "createdAt") VALUES (998100000000202, 998100000000201, 'in_progress', '2026-09-20T02:00:00Z');
INSERT INTO "projectServices" (id, "projectId", "serviceName", "basePrice", vat, "currencyId") VALUES
  (998100000000221, 998100000000202, 'Trademark', 12, 8, 998100000000002),
  (998100000000222, 998100000000202, 'Setup', 1000000, 8, money_base_currency_id());
INSERT INTO "contractServices" (id, "contractId", "projectServiceId", "quotationServiceId", "serviceName", "basePrice", quantity, vat, "currencyId") VALUES
  (998100000000211, 998100000000201, 998100000000221, 998100000000111, 'Trademark', 12, 1, 8, 998100000000002),
  (998100000000212, 998100000000201, 998100000000222, 998100000000112, 'Setup', 1000000, 1, 8, money_base_currency_id());
-- installment 1: 50%, untagged -> spread over both services
INSERT INTO "contractPaymentSchedules" (id, "contractId", "installmentNo", label, percentage, amount, "triggerType")
VALUES (998100000000231, 998100000000201, 1, 'Đợt 1', 50, 708480, 'on_task_done');
-- a request for the trademark alone, and a retainer-period request
INSERT INTO "paymentRequests" (id, "contractId", "contractServiceId", status, "requestedAmount")
VALUES (998100000000241, 998100000000201, 998100000000211, 'active', 336960);
INSERT INTO "paymentRequests" (id, "contractId", "billingPlanId", status, "requestedAmount")
VALUES (998100000000242, 998100000000201, 998100000000299, 'active', 1000);

DO $$
DECLARE v_pr1 bigint; r RECORD; n bigint;
BEGIN
  SELECT id INTO v_pr1 FROM "paymentRequests" WHERE "contractPaymentScheduleId" = 998100000000231;
  INSERT INTO invoices (id, "invoiceNumber", status, "totalAmount", "paymentRequestId", "contractId")
  VALUES (998100000000251, 'INV-TR-1', 'issued', 708480, v_pr1, 998100000000201);
  INSERT INTO payments (id, amount, "paymentStatus", "paymentDate", "contractId", "invoiceId", "currencyId", "exchangeRateToBase") VALUES
    (998100000000261, 708480, 'Received', now(), 998100000000201, 998100000000251, money_base_currency_id(), 1);
  -- 12.96 XTU received at 27,000 (the contract froze 26,000)
  INSERT INTO payments (id, amount, "paymentStatus", "paymentDate", "contractId", "paymentRequestId", "currencyId", "exchangeRateToBase") VALUES
    (998100000000262, 12.96, 'Received', now(), 998100000000201, 998100000000241, 998100000000002, 27000);
  -- money nobody can place
  INSERT INTO payments (id, amount, "paymentStatus", "paymentDate") VALUES (998100000000263, 5000, 'Received', now());

  SELECT * INTO r FROM finance_service_money_trail WHERE contract_service_id = 998100000000211;
  IF (r.quoted_native, r.quoted_rate, r.quoted_vnd) IS DISTINCT FROM (10.8, 26176.5, 282706::numeric) THEN
    RAISE EXCEPTION 'FAIL: quoted 10.80 XTU at 26176.5 = 282706 (got %, %, %)', r.quoted_native, r.quoted_rate, r.quoted_vnd;
  END IF;
  IF (r.contracted_native, r.contracted_rate, r.contracted_vnd, r.case_vnd)
     IS DISTINCT FROM (12.96, 26000::numeric, 336960::numeric, 336960::numeric) THEN
    RAISE EXCEPTION 'FAIL: contracted 12.96 XTU at 26000 = 336960, case the same (got %, %, %, %)',
      r.contracted_native, r.contracted_rate, r.contracted_vnd, r.case_vnd;
  END IF;
  IF (r.price_change, r.fx_quote_to_contract) IS DISTINCT FROM (56160::numeric, -1906::numeric) THEN
    RAISE EXCEPTION 'FAIL: 54254 more = 56160 price + -1906 rate (got %, %)', r.price_change, r.fx_quote_to_contract;
  END IF;
  IF (r.requested, r.invoiced, r.paid, r.outstanding, r.fx_on_payment)
     IS DISTINCT FROM (505440::numeric, 168480::numeric, 518400::numeric, -168480::numeric, 12960::numeric) THEN
    -- outstanding in contract VND (spec §7.4): the 12.96 XTU paid at 27,000 count as the
    -- 336,960 contracted, not the 349,920 received (the 12,960 is fx_on_payment)
    RAISE EXCEPTION 'FAIL: trademark requested/invoiced/paid/outstanding/fx (got %, %, %, %, %)',
      r.requested, r.invoiced, r.paid, r.outstanding, r.fx_on_payment;
  END IF;

  SELECT * INTO r FROM finance_service_money_trail WHERE contract_service_id = 998100000000212;
  IF (r.quoted_vnd, r.contracted_vnd, r.price_change, r.fx_quote_to_contract, r.requested, r.invoiced, r.paid)
     IS DISTINCT FROM (1080000::numeric, 1080000::numeric, 0::numeric, 0::numeric, 540000::numeric, 540000::numeric, 540000::numeric) THEN
    RAISE EXCEPTION 'FAIL: setup line (got %)', r;
  END IF;

  IF (SELECT requested FROM finance_contract_retainer_trail WHERE contract_id = 998100000000201) <> 1000 THEN
    RAISE EXCEPTION 'FAIL: the retainer request is kept apart';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM finance_unallocated_money WHERE kind = 'payment' AND record_id = 998100000000263 AND amount_vnd = 5000) THEN
    RAISE EXCEPTION 'FAIL: a payment linked to nothing is listed as unallocated';
  END IF;

  SELECT count(*) INTO n FROM money_consistency_violations
  WHERE contract_id = 998100000000201 OR record_id BETWEEN 998100000000000 AND 998100999999999;
  IF n <> 0 THEN
    RAISE EXCEPTION 'FAIL: the audit finds nothing wrong (got % rows)', n;
  END IF;
END $$;

-- a locked paymentAllocatedAmount: its difference to the line is shown on
-- its own, not as an exchange-rate difference
ALTER TABLE "contractServices" ADD COLUMN IF NOT EXISTS "paymentAllocatedAmount" double precision;
UPDATE "contractServices" SET "paymentAllocatedAmount" = 1000000 WHERE id = 998100000000212;
DO $$
DECLARE r RECORD;
BEGIN
  SELECT * INTO r FROM finance_service_money_trail WHERE contract_service_id = 998100000000212;
  IF (r.contracted_vnd, r.price_change, r.fx_quote_to_contract, r.allocation_adjustment)
     IS DISTINCT FROM (1000000::numeric, 0::numeric, 0::numeric, -80000::numeric) THEN
    RAISE EXCEPTION 'FAIL: a locked allocation is not an fx difference (got %, %, %, %)',
      r.contracted_vnd, r.price_change, r.fx_quote_to_contract, r.allocation_adjustment;
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL MONEY TRAIL CHECKS PASSED'; END $$;
ROLLBACK;
