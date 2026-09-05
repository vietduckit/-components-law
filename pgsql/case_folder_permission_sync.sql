-- ============================================================
-- Case -> Folder permission sync (Members/Manager field updates)
--
-- CaseCreateForm.js's assignDefaultFolderPermissions() already grants
-- folderManagers (role "manager") / folderMembers (role "viewer") on every
-- folder under a Case (folders.projectId = the case's id — this covers the
-- root case folder AND every subfolder/template child, since projectId is
-- set on all of them, not just the root) at CASE CREATION time only. This
-- file extends the exact same grant semantics to fire automatically
-- whenever a Case's Members (caseAssignees) or Manager (projects.managerId)
-- change LATER, via plain Postgres triggers — same approach as
-- contract_payment_status_workflow.sql, for the same reason: no NocoBase
-- Workflow cache-reload gotcha, one idempotent file to deploy anywhere.
--
-- Revocation: removing a member/manager from a Case deletes only the
-- folderMembers/folderManagers rows THIS mechanism granted for THIS case
-- (tracked via sourceCaseId — see pgsql/link_grant_source_tracking.sql,
-- which already added this column to folderMembers for the same reason;
-- extended here to folderManagers too, since a Case's Manager grant needs
-- the same safe-revoke tracking).
--
-- Idempotent: every statement in this file is safe to run again on a
-- database that already has some or all of it applied.
-- ============================================================

-- ---- Schema: folderManagers needs the same source tracking folderMembers
-- already has, to safely revoke only what a Case's manager-change granted.
ALTER TABLE "folderManagers" ADD COLUMN IF NOT EXISTS "sourceCaseId" bigint;

-- ---- Shared grant/revoke helpers -----------------------------------------
-- Grants role "viewer" on every (non-deleted) folder under a case to one
-- lawyer, skipping folders where that lawyer already has ANY folderMembers
-- row (manually granted, granted via a different case/link, or already
-- granted by this same mechanism) — never duplicates.
CREATE OR REPLACE FUNCTION public.case_folder_grant_member(p_case_id BIGINT, p_lawyer_id BIGINT)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  IF p_case_id IS NULL OR p_lawyer_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO "folderMembers" (id, "folderId", "lawyerId", role, "sourceCaseId", "createdAt", "updatedAt")
  SELECT
    (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000
      + (random() * 999)::INT
      + (row_number() OVER ())::BIGINT,
    f.id, p_lawyer_id, 'viewer', p_case_id, now(), now()
  FROM folders f
  WHERE f."projectId" = p_case_id
    AND f."isDeleted" IS NOT TRUE
    AND NOT EXISTS (
      SELECT 1 FROM "folderMembers" fm
      WHERE fm."folderId" = f.id AND fm."lawyerId" = p_lawyer_id
    );
END;
$function$;

-- Revokes only the folderMembers rows this mechanism granted for this
-- specific case (sourceCaseId match) — never touches a grant from manual
-- Permissions UI edits, a different case, or a Link (sourceLinkId).
CREATE OR REPLACE FUNCTION public.case_folder_revoke_member(p_case_id BIGINT, p_lawyer_id BIGINT)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  IF p_case_id IS NULL OR p_lawyer_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM "folderMembers" fm
  USING folders f
  WHERE fm."folderId" = f.id
    AND f."projectId" = p_case_id
    AND fm."lawyerId" = p_lawyer_id
    AND fm."sourceCaseId" = p_case_id;
END;
$function$;

-- Same pair, for the Manager relation (role "manager", folderManagers).
CREATE OR REPLACE FUNCTION public.case_folder_grant_manager(p_case_id BIGINT, p_lawyer_id BIGINT)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  IF p_case_id IS NULL OR p_lawyer_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO "folderManagers" (id, "folderId", "lawyerId", role, "sourceCaseId", "createdAt", "updatedAt")
  SELECT
    (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT * 1000
      + (random() * 999)::INT
      + (row_number() OVER ())::BIGINT,
    f.id, p_lawyer_id, 'manager', p_case_id, now(), now()
  FROM folders f
  WHERE f."projectId" = p_case_id
    AND f."isDeleted" IS NOT TRUE
    AND NOT EXISTS (
      SELECT 1 FROM "folderManagers" fmgr
      WHERE fmgr."folderId" = f.id AND fmgr."lawyerId" = p_lawyer_id
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.case_folder_revoke_manager(p_case_id BIGINT, p_lawyer_id BIGINT)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  IF p_case_id IS NULL OR p_lawyer_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM "folderManagers" fmgr
  USING folders f
  WHERE fmgr."folderId" = f.id
    AND f."projectId" = p_case_id
    AND fmgr."lawyerId" = p_lawyer_id
    AND fmgr."sourceCaseId" = p_case_id;
END;
$function$;

-- ---- Trigger: caseAssignees INSERT -> grant folder access ---------------
CREATE OR REPLACE FUNCTION public.trg_fn_case_assignee_grant_folder()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_manager_id BIGINT;
BEGIN
  -- Matches assignDefaultFolderPermissions()'s own filter: the manager
  -- already gets a "manager" grant via the trigger below, no separate
  -- "viewer" row needed for the same lawyer on the same case.
  SELECT "managerId" INTO v_manager_id FROM projects WHERE id = NEW."caseId";
  IF v_manager_id IS NOT NULL AND v_manager_id = NEW."assigneeId" THEN
    RETURN NEW;
  END IF;

  PERFORM case_folder_grant_member(NEW."caseId", NEW."assigneeId");
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_case_assignee_grant_folder ON "caseAssignees";
CREATE TRIGGER trg_case_assignee_grant_folder
  AFTER INSERT ON "caseAssignees"
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_case_assignee_grant_folder();

-- ---- Trigger: caseAssignees DELETE -> revoke folder access ---------------
CREATE OR REPLACE FUNCTION public.trg_fn_case_assignee_revoke_folder()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM case_folder_revoke_member(OLD."caseId", OLD."assigneeId");
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_case_assignee_revoke_folder ON "caseAssignees";
CREATE TRIGGER trg_case_assignee_revoke_folder
  AFTER DELETE ON "caseAssignees"
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_case_assignee_revoke_folder();

-- ---- Trigger: projects.managerId change -> sync folderManagers ----------
CREATE OR REPLACE FUNCTION public.trg_fn_case_manager_sync_folder()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW."managerId" IS NOT DISTINCT FROM OLD."managerId" THEN
    RETURN NEW;
  END IF;

  IF OLD."managerId" IS NOT NULL THEN
    PERFORM case_folder_revoke_manager(NEW.id, OLD."managerId");
  END IF;

  IF NEW."managerId" IS NOT NULL THEN
    PERFORM case_folder_grant_manager(NEW.id, NEW."managerId");
    -- The new manager may already hold a "viewer" grant from being a plain
    -- Member of this same case (granted before becoming manager) — drop it,
    -- same de-dup assignDefaultFolderPermissions applies at creation time.
    PERFORM case_folder_revoke_member(NEW.id, NEW."managerId");
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_case_manager_sync_folder ON projects;
CREATE TRIGGER trg_case_manager_sync_folder
  AFTER UPDATE OF "managerId" ON projects
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_case_manager_sync_folder();

-- ---- One-time backfill: tag sourceCaseId on pre-existing grants ----------
-- Rows created by assignDefaultFolderPermissions() at case-creation time
-- (or by the earlier JsField/BackfillCaseFolderPermissions.js one-time
-- script) predate this file and have sourceCaseId = NULL. Reconcile them
-- against current case Members/Manager data so future member/manager
-- removals can revoke them correctly too. Only touches NULL sourceCaseId
-- rows — safe to re-run, and never overwrites a value already set (by a
-- Link grant, sourceLinkId-tracked, or a previous run of this same block).
UPDATE "folderMembers" fm
SET "sourceCaseId" = f."projectId"
FROM folders f
WHERE fm."folderId" = f.id
  AND fm."sourceCaseId" IS NULL
  AND f."projectId" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "caseAssignees" ca
    WHERE ca."caseId" = f."projectId" AND ca."assigneeId" = fm."lawyerId"
  );

UPDATE "folderManagers" fmgr
SET "sourceCaseId" = f."projectId"
FROM folders f
WHERE fmgr."folderId" = f.id
  AND fmgr."sourceCaseId" IS NULL
  AND f."projectId" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = f."projectId" AND p."managerId" = fmgr."lawyerId"
  );
