-- ══════════════════════════════════════════════════════════════════════════
-- FILE: link_grant_source_tracking.sql
-- Purpose: Adds nullable "source" tracking columns so CaseDocument.js's
--          "Link" feature (cross-case/cross-reference shortcuts) can revoke
--          EXACTLY the members it granted when a link is removed, instead of
--          wiping every member on the target folder/document/entity
--          (which also destroyed grants set independently via Permissions
--          UI, or via a different case's own link into the same target).
--
--          sourceLinkId  -> the caseLegalStudyLinks.id that created this
--                            grant (per-item folder/document shortcut).
--          sourceCaseId  -> the projects.id of the Case that performed a
--                            whole-Case or whole-Reference link grant (no
--                            single caseLegalStudyLinks row exists for
--                            those, so the granting Case itself is the
--                            discriminator).
--
--          Both stay NULL for rows created any other way (manual
--          Permissions UI edits, pre-existing data) — those are never
--          touched by the Link feature's remove-link revoke logic.
--
-- How to run: Execute this script once in pgAdmin or psql. Idempotent —
--             safe to re-run (ADD COLUMN IF NOT EXISTS).
--
-- REQUIRED FOLLOW-UP (cannot be done from SQL): in the Nocobase Admin UI,
-- open Collections > folderMembers / documentShares / legalMembers >
-- Configure fields, and add each new column below as a Number field with
-- the exact same name. Nocobase's REST API silently drops any payload key
-- that isn't a registered field, so until these fields exist there the
-- application code will write these columns as always-NULL.
-- ══════════════════════════════════════════════════════════════════════════

ALTER TABLE public."folderMembers"
    ADD COLUMN IF NOT EXISTS "sourceLinkId" bigint,
    ADD COLUMN IF NOT EXISTS "sourceCaseId" bigint;

ALTER TABLE public."documentShares"
    ADD COLUMN IF NOT EXISTS "sourceLinkId" bigint;

ALTER TABLE public."legalMembers"
    ADD COLUMN IF NOT EXISTS "sourceCaseId" bigint;


-- ══════════════════════════════════════════════════════════════════════════
-- Verification queries (run after the script, not part of it)
-- ══════════════════════════════════════════════════════════════════════════
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'folderMembers'
--   AND column_name IN ('sourceLinkId', 'sourceCaseId');
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'documentShares'
--   AND column_name = 'sourceLinkId';
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'legalMembers'
--   AND column_name = 'sourceCaseId';
