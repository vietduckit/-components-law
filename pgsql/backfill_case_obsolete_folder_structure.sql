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
-- Service-folder identification (step 2/3): a folder counts as a service
-- folder if EITHER it's tagged folderTemplateKey = 'case_service' OR it's
-- the real target of a projectServices.folderId FK (the source of truth —
-- see JsField/BackfillCaseServiceFolderTemplateKey.js). Folders created
-- before the 2026-09-04 tagging change are real service folders but were
-- never stamped, so a tag-only filter silently misses them (caught live:
-- a case's service folder sitting untagged under "Legal dossiers", not
-- reparented by this script's first version). A folder already carrying
-- one of the 5 fixed template keys is excluded even if the FK points at
-- it — that would be a data conflict to investigate by hand, not
-- something to silently reparent/retag.
--
-- Idempotent: safe to run again — a case that already has an "obsolete"
-- folder is skipped by step 1; a service folder already parented under
-- the correct Obsolete folder (and already tagged) is left untouched by
-- steps 2/3.
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

-- ---- Step 2: reparent every service folder onto its case's Obsolete ---
-- folder, if it isn't already there (covers "sitting as a case-root
-- sibling", "nested under Legal dossiers", or any other prior parent in
-- one pass — whatever its current parent is, if that parent isn't this
-- case's Obsolete folder, fix it). Matches by tag OR by the real
-- projectServices.folderId FK (see the file header) so untagged
-- pre-2026-09-04 service folders are caught too; a folder already
-- carrying one of the 5 fixed template keys is never touched even if the
-- FK points at it.
UPDATE folders svc
SET "parentId" = obs.id
FROM folders obs
WHERE (
    svc."folderTemplateKey" = 'case_service'
    OR svc.id IN (SELECT "folderId" FROM "projectServices" WHERE "folderId" IS NOT NULL)
  )
  AND (
    svc."folderTemplateKey" IS NULL
    OR svc."folderTemplateKey" NOT IN (
      'legal_study', 'lsc_related', 'legal_docs', 'legal_dossiers', 'obsolete', 'report_result'
    )
  )
  AND obs."folderTemplateKey" = 'obsolete'
  AND obs."projectId" = svc."projectId"
  AND svc."parentId" IS DISTINCT FROM obs.id;

-- ---- Step 3: tag every service folder with folderTemplateKey ----------
-- 'case_service' if it isn't already — closes the same pre-2026-09-04 gap
-- for the tag itself, not just the parent (mirrors
-- JsField/BackfillCaseServiceFolderTemplateKey.js, restricted here to
-- folders that already belong to a case, i.e. projectId IS NOT NULL).
UPDATE folders svc
SET "folderTemplateKey" = 'case_service'
WHERE svc."projectId" IS NOT NULL
  AND svc.id IN (SELECT "folderId" FROM "projectServices" WHERE "folderId" IS NOT NULL)
  AND (
    svc."folderTemplateKey" IS NULL
    OR svc."folderTemplateKey" NOT IN (
      'legal_study', 'lsc_related', 'legal_docs', 'legal_dossiers', 'obsolete', 'report_result'
    )
  )
  AND svc."folderTemplateKey" IS DISTINCT FROM 'case_service';
