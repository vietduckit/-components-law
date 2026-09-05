-- ============================================================
-- Backfill: normalize existing Case folders to the "Obsolete" structure
--
-- CaseCreateForm.js's 2026-09-04 change adds a 6th default folder,
-- "Obsolete" (folderTemplateKey='obsolete'), and nests every per-service
-- folder (folderTemplateKey='case_service') under it instead of leaving
-- them as case-root siblings (oldest cases) or — an intermediate
-- 2026-08-27 change — nested under "Legal dossiers" (cases created in
-- between). Only NEW cases got this at the time the JS change landed;
-- this one-time script catches EXISTING cases up to the same structure.
--
-- Root-folder identification: a case's root folder is the one folder for
-- that projectId whose own parentId does NOT belong to another folder of
-- the same projectId (it nests instead under a customer/company folder
-- outside the case). Not "folderTemplateKey IS NULL" — a case can have
-- other NULL-key folders nested deeper (e.g. an ad-hoc attachments
-- sub-folder created inside a service folder), which this definition
-- correctly excludes since their parent IS within the same case.
--
-- Idempotent: safe to run again — a case that already has an "obsolete"
-- folder is skipped by step 1; a case_service folder already parented
-- under the correct Obsolete folder is left untouched by step 2.
-- ============================================================

-- ---- Step 1: create the missing "Obsolete" folder for every case that --
-- doesn't have one yet.
WITH roots AS (
  SELECT
    f.id AS root_id, f."projectId", f."customerId", f."internalCompanyId",
    f."moduleScope", f.type
  FROM folders f
  WHERE f."projectId" IS NOT NULL
    AND f."moduleScope" = 'case_document'
    AND NOT EXISTS (
      SELECT 1 FROM folders p
      WHERE p.id = f."parentId" AND p."projectId" = f."projectId"
    )
),
missing_obsolete AS (
  SELECT r.*
  FROM roots r
  WHERE NOT EXISTS (
    SELECT 1 FROM folders o
    WHERE o."projectId" = r."projectId" AND o."folderTemplateKey" = 'obsolete'
  )
)
INSERT INTO folders (
  id, name, type, "folderTemplateKey", "parentId", "projectId",
  "customerId", "internalCompanyId", "moduleScope", "createdAt", "updatedAt"
)
SELECT
  (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000
    + (random() * 999)::INT
    + (row_number() OVER ())::BIGINT,
  'Obsolete', mo.type, 'obsolete', mo.root_id, mo."projectId",
  mo."customerId", mo."internalCompanyId", mo."moduleScope", now(), now()
FROM missing_obsolete mo;

-- ---- Step 2: reparent every case_service folder onto its case's -------
-- Obsolete folder, if it isn't already there (covers both "sitting as a
-- case-root sibling" and "nested under Legal dossiers" prior states in
-- one pass — whatever its current parent is, if that parent isn't this
-- case's Obsolete folder, fix it).
UPDATE folders svc
SET "parentId" = obs.id
FROM folders obs
WHERE svc."folderTemplateKey" = 'case_service'
  AND obs."folderTemplateKey" = 'obsolete'
  AND obs."projectId" = svc."projectId"
  AND svc."parentId" IS DISTINCT FROM obs.id;
