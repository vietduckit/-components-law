-- ============================================================
-- Naming audit (2026-09-25) — READ ONLY, changes nothing.
-- pgsql/document_naming_guards.sql blocks / numbers NEW duplicates only;
-- this lists what already exists, plus whether the Case → folder
-- permission sync triggers are installed.
-- ============================================================

-- 0. Installed guards and Case permission sync triggers (expect 11 rows).
SELECT tgname AS trigger_name, tgrelid::regclass AS on_table
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgname IN (
    'trg_law_customer_duplicate_guard',
    'trg_law_customer_delete_guard',
    'trg_law_customer_trash_documents',
    'trg_law_folder_customer_unlinked',
    'trg_law_document_customer_unlinked',
    'trg_law_case_customer_unlinked',
    'trg_law_folder_name_guard',
    'trg_law_document_title_guard',
    'trg_case_assignee_grant_folder',   -- pgsql/case_folder_permission_sync.sql
    'trg_case_assignee_revoke_folder',
    'trg_case_manager_sync_folder'
  )
ORDER BY 1;

-- 1. Customers the rules would block today (requires the law_norm_* functions
--    from document_naming_guards.sql). One row per pair; "reason" says why.
SELECT a.id AS customer_id, a."customerName", a."customerType", a."taxCode", a."IdentityNumber", a.email, a.phone,
       b.id AS conflicts_with, b."customerName" AS conflicts_with_name,
       CASE
         WHEN law_norm_idno(a."taxCode") IS NOT NULL
              AND law_norm_idno(a."taxCode") IN (law_norm_idno(b."taxCode"), law_norm_idno(b."IdentityNumber")) THEN 'same MST'
         WHEN law_norm_idno(a."IdentityNumber") IS NOT NULL
              AND law_norm_idno(a."IdentityNumber") IN (law_norm_idno(b."taxCode"), law_norm_idno(b."IdentityNumber")) THEN 'same CCCD'
         WHEN lower(btrim(COALESCE(a."customerType", ''))) = 'company' THEN 'same company name'
         WHEN law_norm_email(a.email) = law_norm_email(b.email) OR law_norm_phone(a.phone) = law_norm_phone(b.phone) THEN 'same name + email/phone'
         ELSE 'same name, nothing to tell apart'
       END AS reason
FROM customers a
JOIN customers b ON b.id < a.id
WHERE
  -- a shared MST / CCCD, whatever the names
  (
    array_remove(ARRAY[law_norm_idno(a."taxCode"), law_norm_idno(a."IdentityNumber")], NULL)
    && array_remove(ARRAY[law_norm_idno(b."taxCode"), law_norm_idno(b."IdentityNumber")], NULL)
  )
  OR (
    law_norm_name(a."customerName") = law_norm_name(b."customerName")
    AND (
      -- two companies with one name
      (lower(btrim(COALESCE(a."customerType", ''))) = 'company' AND lower(btrim(COALESCE(b."customerType", ''))) = 'company')
      -- two individuals with one name that share an email/phone, or where the newer has nothing to tell them apart
      OR (
        lower(btrim(COALESCE(a."customerType", ''))) <> 'company' AND lower(btrim(COALESCE(b."customerType", ''))) <> 'company'
        AND (
          law_norm_email(a.email) = law_norm_email(b.email)
          OR law_norm_phone(a.phone) = law_norm_phone(b.phone)
          OR (law_norm_idno(a."taxCode") IS NULL AND law_norm_idno(a."IdentityNumber") IS NULL
              AND law_norm_email(a.email) IS NULL AND law_norm_phone(a.phone) IS NULL)
        )
      )
    )
  )
ORDER BY law_norm_name(a."customerName"), a.id;

-- 2. Live sibling folders sharing a name (same parent). Clean up with the
--    FolderDuplicateNameFix block.
SELECT f."parentId", law_norm_name(f.name) AS name_key, COUNT(*) AS folders, array_agg(f.id ORDER BY f.id) AS folder_ids
FROM folders f
WHERE f."isDeleted" IS NOT TRUE AND f."parentId" IS NOT NULL AND law_norm_name(f.name) IS NOT NULL
GROUP BY 1, 2
HAVING COUNT(*) > 1
ORDER BY folders DESC;

-- 3. Live documents sharing a title in the same folder. Clean up with the
--    DocumentTitleVersionFix block.
SELECT d."folderId", law_norm_name(d.title) AS title_key, COUNT(*) AS documents, array_agg(d.id ORDER BY d.id) AS document_ids
FROM documents d
WHERE d."isDeleted" IS NOT TRUE AND d."folderId" IS NOT NULL AND law_norm_name(d.title) IS NOT NULL
GROUP BY 1, 2
HAVING COUNT(*) > 1
ORDER BY documents DESC;
