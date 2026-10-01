-- ============================================================
-- Contracts created from a multi-combo Case with a short total — READ ONLY.
-- 2026-09-25 bug: ContractCreateForm read the package total off the FIRST
-- package service of the Case, so a Case with combos A + B (e.g. 85,000,000)
-- produced a contract whose subtotal was combo A only (its services and any
-- Payment Requests were then split from that short total).
--
-- Case total here = what the Case screen shows (CaseServices): each distinct
-- combo group once — comboId, else comboName, else the row — summing its
-- packageSubTotal. Lists every Combo-pricing contract linked to a Case whose
-- subtotal differs from that. Changes nothing; review, then fix per contract.
-- ============================================================

WITH case_groups AS (
  SELECT
    ps."projectId",
    -- via to_jsonb: comboId / comboName were added after the schema dump,
    -- so this doesn't fail where a column is named differently or missing.
    COALESCE(
      'id:' || NULLIF(to_jsonb(ps)->>'comboId', ''),
      'id:' || NULLIF(to_jsonb(ps)->>'serviceComboId', ''),
      'name:' || NULLIF(TRIM(to_jsonb(ps)->>'comboName'), ''),
      'row:' || ps.id::text
    ) AS combo_group,
    MAX(COALESCE(ps."packageSubTotal", 0)) AS group_amount
  FROM "projectServices" ps
  WHERE ps."pricingMode" = 'package'
    AND COALESCE(ps.status, '') <> 'deleted'
  GROUP BY 1, 2
),
case_totals AS (
  SELECT "projectId", SUM(group_amount) AS case_package_subtotal, COUNT(*) AS combo_groups
  FROM case_groups
  GROUP BY 1
)
SELECT
  c.id                                        AS contract_id,
  c."contractCode",
  c."createdAt"                               AS contract_created_at,
  p.id                                        AS case_id,
  p."projectName",
  ct.combo_groups,
  c."subTotal"                                AS contract_subtotal,
  ct.case_package_subtotal,
  ct.case_package_subtotal - COALESCE(c."subTotal", 0) AS missing_subtotal,
  (SELECT COUNT(*) FROM "paymentRequests" pr WHERE pr."contractId" = c.id) AS payment_requests
FROM contracts c
JOIN projects p ON p."contractId" = c.id
JOIN case_totals ct ON ct."projectId" = p.id
WHERE c."pricingMode" = 'package'
  AND ct.combo_groups > 1
  AND COALESCE(c."subTotal", 0) <> ct.case_package_subtotal
ORDER BY c."createdAt" DESC;
