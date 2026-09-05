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
-- System-folder identification (step 2): the 6 fixed folders are always
-- created with one exact, well-known display name each (see
-- CaseCreateForm.js's defaultChildren) — "Legal Study", "LSC & Related",
-- "Legal docs", "Legal dossiers", "Report and Result", "Obsolete". Some
-- older cases have these folders with the tag never stamped at all
-- (missing, not just the service-folder tag) — step 2 recognizes them by
-- name (case-insensitive, trimmed) and backfills their correct key, since
-- there is exactly one of each per case by construction. This MUST run
-- before service-folder detection below, so an untagged system folder is
-- never mistaken for a stray service folder sitting at case-root level.
--
-- Service-folder identification (step 3/4): a folder counts as a service
-- folder if ANY of:
--   (a) it's tagged folderTemplateKey = 'case_service'
--   (b) it's the real target of a projectServices.folderId FK (the
--       source of truth — see JsField/BackfillCaseServiceFolderTemplateKey.js)
--   (c) POSITIONAL: it's a direct child of the case root, or a direct
--       child of "Legal dossiers" — the two documented wrong homes for a
--       service folder (case-root sibling for the oldest cases, nested
--       under Legal dossiers for the 2026-08-27 intermediate state) — and
--       its own folderTemplateKey isn't one of the 6 fixed template keys
--       AND its name doesn't match one of the 6 fixed display names
--       either (covers a system folder step 2 couldn't safely retag, e.g.
--       a genuine duplicate — never touched, left for manual review)
-- (b) and (c) both exist because real staging data has shown BOTH gaps:
-- a service folder with no tag AND no projectServices.folderId FK at all
-- (older than that link too), sitting as a plain root-level sibling next
-- to the system folders — (a) and (b) alone silently miss it, only the
-- position gives it away. A folder already carrying one of the 6 fixed
-- template keys, or matching one of the 6 fixed display names, is
-- excluded even under (c) — the name check is what stops an untagged
-- system folder (fixed by step 2 already, but a duplicate would still
-- carry the name after step 2 skips it) from being misidentified as a
-- stray service folder.
--
-- Idempotent: safe to run again — a case that already has an "obsolete"
-- folder is skipped by step 1; a system folder already correctly tagged
-- is left untouched by step 2; a service folder already parented under
-- the correct Obsolete folder (and already tagged) is left untouched by
-- steps 3/4.
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

-- ---- Step 2: backfill the tag on system folders whose own key was ------
-- never stamped, matched by their exact known display name. Restricted to
-- direct children of the case root, since that's the only place these 6
-- folders are ever created — a same-named folder nested deeper is a
-- coincidence, not a system folder, and is intentionally left alone.
WITH root_map AS (
  SELECT f.id AS root_id, f."projectId"
  FROM folders f
  WHERE f."projectId" IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM folders p
      WHERE p.id = f."parentId" AND p."projectId" = f."projectId"
    )
),
sysnames (disp_name, tpl_key) AS (
  VALUES
    ('legal study', 'legal_study'),
    ('lsc & related', 'lsc_related'),
    ('legal docs', 'legal_docs'),
    ('legal dossiers', 'legal_dossiers'),
    ('report and result', 'report_result'),
    ('obsolete', 'obsolete')
),
candidates AS (
  SELECT f.id AS folder_id, sn.tpl_key
  FROM folders f
  JOIN root_map r ON r."projectId" = f."projectId" AND r.root_id = f."parentId"
  JOIN sysnames sn ON lower(trim(f.name)) = sn.disp_name
  WHERE f."folderTemplateKey" IS DISTINCT FROM sn.tpl_key
)
UPDATE folders f
SET "folderTemplateKey" = c.tpl_key
FROM candidates c
WHERE f.id = c.folder_id;

-- ---- Step 3: reparent every service folder onto its case's Obsolete ---
-- folder, if it isn't already there. "Service folder" = tag, OR FK, OR
-- position (see file header) — whichever current parent it has, if that
-- parent isn't this case's Obsolete folder, fix it. The 6 fixed display
-- names are excluded even when untagged, so a system folder step 2 could
-- not safely retag (e.g. a genuine duplicate) is never swept in here.
WITH candidates AS (
  SELECT svc.id AS folder_id, obs.id AS obsolete_id
  FROM folders svc
  JOIN folders obs ON obs."projectId" = svc."projectId" AND obs."folderTemplateKey" = 'obsolete'
  WHERE svc."projectId" IS NOT NULL
    AND (
      svc."folderTemplateKey" IS NULL
      OR svc."folderTemplateKey" NOT IN (
        'legal_study', 'lsc_related', 'legal_docs', 'legal_dossiers', 'obsolete', 'report_result'
      )
    )
    AND lower(trim(svc.name)) NOT IN (
      'legal study', 'lsc & related', 'legal docs', 'legal dossiers', 'obsolete', 'report and result'
    )
    AND (
      svc."folderTemplateKey" = 'case_service'
      OR svc.id IN (SELECT "folderId" FROM "projectServices" WHERE "folderId" IS NOT NULL)
      OR EXISTS (
          SELECT 1 FROM folders root
          WHERE root."projectId" = svc."projectId"
            AND root.id = svc."parentId"
            AND NOT EXISTS (
              SELECT 1 FROM folders p2
              WHERE p2.id = root."parentId" AND p2."projectId" = root."projectId"
            )
        )
      OR EXISTS (
          SELECT 1 FROM folders dossiers
          WHERE dossiers."projectId" = svc."projectId"
            AND dossiers.id = svc."parentId"
            AND dossiers."folderTemplateKey" = 'legal_dossiers'
        )
    )
)
UPDATE folders svc
SET "parentId" = c.obsolete_id
FROM candidates c
WHERE svc.id = c.folder_id
  AND svc."parentId" IS DISTINCT FROM c.obsolete_id;

-- ---- Step 4: tag every service folder with folderTemplateKey ----------
-- 'case_service' if it isn't already — same candidate definition as step
-- 3, so a folder caught only by position or FK also gets the tag it needs
-- for CaseDocument.js/Library.js's delete-lock check (mirrors
-- JsField/BackfillCaseServiceFolderTemplateKey.js).
WITH candidates AS (
  SELECT svc.id AS folder_id
  FROM folders svc
  WHERE svc."projectId" IS NOT NULL
    AND (
      svc."folderTemplateKey" IS NULL
      OR svc."folderTemplateKey" NOT IN (
        'legal_study', 'lsc_related', 'legal_docs', 'legal_dossiers', 'obsolete', 'report_result'
      )
    )
    AND lower(trim(svc.name)) NOT IN (
      'legal study', 'lsc & related', 'legal docs', 'legal dossiers', 'obsolete', 'report and result'
    )
    AND (
      svc.id IN (SELECT "folderId" FROM "projectServices" WHERE "folderId" IS NOT NULL)
      OR EXISTS (
          SELECT 1 FROM folders root
          WHERE root."projectId" = svc."projectId"
            AND root.id = svc."parentId"
            AND NOT EXISTS (
              SELECT 1 FROM folders p2
              WHERE p2.id = root."parentId" AND p2."projectId" = root."projectId"
            )
        )
      OR EXISTS (
          SELECT 1 FROM folders dossiers
          WHERE dossiers."projectId" = svc."projectId"
            AND dossiers.id = svc."parentId"
            AND dossiers."folderTemplateKey" = 'legal_dossiers'
        )
    )
)
UPDATE folders svc
SET "folderTemplateKey" = 'case_service'
FROM candidates c
WHERE svc.id = c.folder_id
  AND svc."folderTemplateKey" IS DISTINCT FROM 'case_service';
