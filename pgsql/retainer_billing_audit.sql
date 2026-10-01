-- ============================================================
-- Retainer billing — READ-ONLY health check (2026-09-28). Run any time; it
-- changes nothing. In pgAdmin run each numbered query on its own (select it,
-- F5): pgAdmin only shows the last result of a whole file.
--
-- What has to be in place for a retainer to bill by itself:
--   A. contracts.billingPlans registered (JsField/RegisterContractsBillingPlansInverseField.js)
--      — without it the contract form's plan is silently dropped (query 1, 2)
--   B. a plan per retainer contract with a start date, an amount and a next
--      billing date (query 2, 3)
--   C. pgsql/contract_billing_plans_trigger.sql, pgsql/finance_billing_rules.sql,
--      pgsql/retainer_billing_run_due.sql deployed (query 4)
--   D. the hourly workflow enabled (JsField/Workflow/CreateRetainerBillingCronWorkflow.js) (query 5)
-- ============================================================

-- 1. Is contracts.billingPlans registered in NocoBase? Expect ONE row.
SELECT "collectionName", name, type
FROM fields
WHERE "collectionName" = 'contracts' AND name = 'billingPlans';

-- 2. Retainer contracts without a billing plan: they never bill. Expect none;
--    for each row use "New billing plan" on the case's Finance tab.
SELECT c.id, c."contractCode", c."contractName", c.status, c."totalAmount",
       c."paymentDate", c."endDate", c."createdAt"
FROM contracts c
WHERE c."contractType" = 'retainer'
  AND NOT EXISTS (SELECT 1 FROM "contractBillingPlans" p WHERE p."contractId" = c.id)
ORDER BY c."createdAt" DESC;

-- 3. Active retainer plans that cannot bill, and why. Expect none.
SELECT p.id AS plan_id, c."contractCode", p.status, p."startDate", p."nextBillingDate",
       p."totalAmount", p."retainerTotalCycles", p."retainerCyclesBilled", p."isBillingActive",
       CASE
         WHEN p."startDate" IS NULL THEN 'no start date (nextBillingDate stays empty)'
         WHEN COALESCE(p."totalAmount", 0) <= 0 THEN 'no amount'
         WHEN p."nextBillingDate" IS NULL THEN 'no next billing date'
         WHEN c.status = 'terminated' THEN 'contract terminated'
       END AS problem
FROM "contractBillingPlans" p
LEFT JOIN contracts c ON c.id = p."contractId"
WHERE p."planType" = 'retainer' AND p.status = 'active'
  AND (p."startDate" IS NULL OR COALESCE(p."totalAmount", 0) <= 0 OR p."nextBillingDate" IS NULL
       OR c.status = 'terminated');

-- 4. The SQL pieces. Expect 4 rows.
SELECT 'function' AS kind, proname AS name FROM pg_proc
WHERE proname IN ('retainer_billing_run_due', 'finance_fill_bill_now', 'finance_billing_plan_active_toggle')
UNION ALL
SELECT 'trigger', tgname FROM pg_trigger
WHERE tgrelid = '"contractBillingPlans"'::regclass AND tgname = 'trg_contract_billing_plan_init_retainer_state';

-- 5. The scheduled workflows. Expect each enabled.
SELECT id, title, enabled, current
FROM workflows
WHERE title IN (
  'Retainer billing - hourly SQL run',
  'Finance - daily overdue refresh',
  'Finance - notifications (every minute)'
)
ORDER BY title;

-- 6. Plans due now (the next hourly run bills these — one period each).
SELECT p.id AS plan_id, c."contractCode", p."nextBillingDate", p."retainerCyclesBilled", p."retainerTotalCycles"
FROM "contractBillingPlans" p
JOIN contracts c ON c.id = p."contractId"
WHERE p."planType" = 'retainer' AND p.status = 'active' AND p."isBillingActive" IS NOT FALSE
  AND p."nextBillingDate" <= public.finance_today();
