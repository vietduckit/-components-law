-- ============================================================
-- Money rounding audit (2026-09-25) — READ ONLY, changes nothing.
-- Lists existing data hit by the rounding leaks fixed in the forms
-- (docs/superpowers/specs/2026-09-25-by-service-package-allocation-ui-design.md
-- "Money rounding: no đồng lost"). Review the rows, then decide per contract.
-- ============================================================

-- 1. Installments that don't add up to the contract total
--    (contracts with at least one schedule row).
SELECT c.id,
       c."contractCode",
       c."totalAmount"                               AS contract_total,
       SUM(s.amount)                                 AS installments_total,
       c."totalAmount" - SUM(s.amount)               AS difference,
       COUNT(*)                                      AS installments
FROM contracts c
JOIN "contractPaymentSchedules" s ON s."contractId" = c.id
GROUP BY c.id, c."contractCode", c."totalAmount"
HAVING c."totalAmount" IS NOT NULL
   AND c."totalAmount" <> SUM(s.amount)
ORDER BY ABS(c."totalAmount" - SUM(s.amount)) DESC;

-- 2. Totals whose parts don't add up (subtotal + VAT <> total).
SELECT 'contracts' AS source, id, "subTotal", "vatAmount", "totalAmount",
       "totalAmount" - ("subTotal" + "vatAmount") AS difference
FROM contracts
WHERE "subTotal" IS NOT NULL AND "vatAmount" IS NOT NULL AND "totalAmount" IS NOT NULL
  AND "totalAmount" <> "subTotal" + "vatAmount"
UNION ALL
SELECT 'quotations', id, "subTotal", "vatAmount", "totalAmount",
       "totalAmount" - ("subTotal" + "vatAmount")
FROM quotations
WHERE "subTotal" IS NOT NULL AND "vatAmount" IS NOT NULL AND "totalAmount" IS NOT NULL
  AND "totalAmount" <> "subTotal" + "vatAmount"
ORDER BY source, id;

-- 3. Fractions of a đồng stored (VND has no decimals).
SELECT 'contracts.totalAmount' AS field, id, "totalAmount" AS value
FROM contracts WHERE "totalAmount" <> TRUNC("totalAmount")
UNION ALL
SELECT 'quotations.totalAmount', id, "totalAmount"
FROM quotations WHERE "totalAmount" <> TRUNC("totalAmount")
UNION ALL
SELECT 'projects.totalAmount', id, "totalAmount"
FROM projects WHERE "totalAmount" <> TRUNC("totalAmount")
UNION ALL
SELECT 'contractPaymentSchedules.amount', id, amount
FROM "contractPaymentSchedules" WHERE amount <> TRUNC(amount)
UNION ALL
SELECT 'paymentRequests.requestedAmount', id, "requestedAmount"
FROM "paymentRequests" WHERE "requestedAmount" <> TRUNC("requestedAmount")
ORDER BY field, id;
