-- ============================================================
-- Naming guards for customers, folders and documents (2026-09-25).
-- Spec: docs/superpowers/specs/2026-09-25-naming-guards-design.md
--
-- Enforced in the database, so every way of creating/renaming a record is
-- covered: the JS Blocks, NocoBase's native forms, the API and imports.
--   1. customers — an MST/CCCD already used by another customer is blocked;
--      company names are unique among companies; same-name individuals
--      must be told apart (CCCD, MST, email or phone — blocked when they
--      share the email/phone). Deleting a customer is blocked while it has
--      Cases, and otherwise moves its folders + documents to Trash.
--   2. folders   — a customer's ROOT folder can't share its name with
--      another root folder of the same customer (blocked, no numbering);
--      every other folder that collides with a sibling (same parent) is
--      renamed "Name (1)", "Name (2)", ...
--   3. documents — a title that collides with another document in the same
--      folder is renamed "Name (1).ext", "Name (2).ext", ... — the exact
--      format of getUniqueFileName() in the JS Blocks.
-- Names compare trimmed, inner whitespace collapsed, case-insensitive;
-- deleted records (isDeleted) don't count. Existing duplicates are left
-- alone (see pgsql/audit_naming_duplicates.sql).
--
-- A blocked write raises an exception whose message NocoBase returns as
-- errors[0].message, so the reason reaches the UI. Each guard takes a
-- transaction-scoped advisory lock on its scope, so two concurrent writes
-- can't both pass the check.
--
-- Idempotent: safe to run again (CREATE OR REPLACE / DROP TRIGGER IF EXISTS).
-- ============================================================

-- ---- Shared normalisation -------------------------------------------------

-- Name key: trimmed, inner whitespace collapsed, lower-cased; NULL if empty.
-- Plain lower() follows the database locale — under the "C" locale it
-- leaves non-ASCII capitals alone (lower('ĐÔNG') = 'ĐÔng'), so "ĐÔNG" and
-- "đông" would not match. The ICU collation folds every letter; it is used
-- whenever the server has it, else plain lower().
DO $install$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_collation WHERE collname = 'und-x-icu') THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.law_norm_name(p_value text)
      RETURNS text
      LANGUAGE sql
      IMMUTABLE
      AS $body$
        SELECT NULLIF(lower(regexp_replace(btrim(COALESCE(p_value, '')), '\s+', ' ', 'g') COLLATE "und-x-icu"), '')
      $body$
    $fn$;
  ELSE
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.law_norm_name(p_value text)
      RETURNS text
      LANGUAGE sql
      IMMUTABLE
      AS $body$
        SELECT NULLIF(lower(regexp_replace(btrim(COALESCE(p_value, '')), '\s+', ' ', 'g')), '')
      $body$
    $fn$;
  END IF;
END;
$install$;

-- MST / CCCD key: spaces, dots and dashes removed, upper-cased; NULL if empty.
CREATE OR REPLACE FUNCTION public.law_norm_idno(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT NULLIF(upper(regexp_replace(COALESCE(p_value, ''), '[\s.\-]', '', 'g')), '')
$function$;

-- ---- 1. customers: block duplicates -----------------------------------------
-- Rules (2026-09-25, user-approved):
--   * every customer: an MST or a CCCD already used by another customer is
--     blocked (MST and CCCD are compared across both columns — a personal
--     MST may equal a CCCD);
--   * company (customerType = 'company'): the name must be unique among
--     companies, whatever the MST;
--   * individual (any other type, blank included): same names are allowed
--     but must be told apart — blocked when a same-name individual shares
--     the email or phone (likely the same person), or when there is no CCCD,
--     MST, email or phone at all to tell them apart.

-- Email key: lower-cased, spaces removed; NULL if empty.
CREATE OR REPLACE FUNCTION public.law_norm_email(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT NULLIF(lower(regexp_replace(COALESCE(p_value, ''), '\s', '', 'g')), '')
$function$;

-- Phone key: digits only, Vietnamese country code folded to a leading 0
-- ("+84 912 345 678", "0084912345678" and "0912345678" match); NULL if empty.
CREATE OR REPLACE FUNCTION public.law_norm_phone(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT NULLIF(
    CASE
      WHEN d LIKE '0084%' AND length(d) >= 13 THEN '0' || substr(d, 5)
      WHEN d LIKE '84%' AND length(d) >= 11 THEN '0' || substr(d, 3)
      ELSE d
    END,
    ''
  )
  FROM (SELECT regexp_replace(COALESCE(p_value, ''), '\D', '', 'g') AS d) digits
$function$;

CREATE OR REPLACE FUNCTION public.law_customer_duplicate_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_name text := law_norm_name(NEW."customerName");
  v_is_company boolean := lower(btrim(COALESCE(NEW."customerType", ''))) = 'company';
  v_tax text := law_norm_idno(NEW."taxCode");
  v_idno text := law_norm_idno(NEW."IdentityNumber");
  v_email text := law_norm_email(NEW.email);
  v_phone text := law_norm_phone(NEW.phone);
  v_dup RECORD;
BEGIN
  -- Only when something these rules look at actually changes.
  IF TG_OP = 'UPDATE'
     AND law_norm_name(OLD."customerName") IS NOT DISTINCT FROM v_name
     AND (lower(btrim(COALESCE(OLD."customerType", ''))) = 'company') = v_is_company
     AND law_norm_idno(OLD."taxCode") IS NOT DISTINCT FROM v_tax
     AND law_norm_idno(OLD."IdentityNumber") IS NOT DISTINCT FROM v_idno
     AND law_norm_email(OLD.email) IS NOT DISTINCT FROM v_email
     AND law_norm_phone(OLD.phone) IS NOT DISTINCT FROM v_phone THEN
    RETURN NEW;
  END IF;

  -- Customer writes that touch these fields are rare: one lock serializes
  -- them, so two concurrent creates can't both pass.
  PERFORM pg_advisory_xact_lock(hashtext('law_customer_duplicate_guard'));

  -- MST already used by another customer
  IF v_tax IS NOT NULL THEN
    SELECT c.id, c."customerName" INTO v_dup
    FROM customers c
    WHERE c.id IS DISTINCT FROM NEW.id
      AND (law_norm_idno(c."taxCode") = v_tax OR law_norm_idno(c."IdentityNumber") = v_tax)
    ORDER BY c.id
    LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'MST % đã thuộc khách hàng #% "%" — nhập MST khác hoặc dùng khách hàng đã có.',
        btrim(NEW."taxCode"), v_dup.id, btrim(COALESCE(v_dup."customerName", ''));
    END IF;
  END IF;

  -- CCCD already used by another customer
  IF v_idno IS NOT NULL THEN
    SELECT c.id, c."customerName" INTO v_dup
    FROM customers c
    WHERE c.id IS DISTINCT FROM NEW.id
      AND (law_norm_idno(c."IdentityNumber") = v_idno OR law_norm_idno(c."taxCode") = v_idno)
    ORDER BY c.id
    LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'CCCD % đã thuộc khách hàng #% "%" — nhập CCCD khác hoặc dùng khách hàng đã có.',
        btrim(NEW."IdentityNumber"), v_dup.id, btrim(COALESCE(v_dup."customerName", ''));
    END IF;
  END IF;

  IF v_name IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_is_company THEN
    -- company names are unique among companies
    SELECT c.id INTO v_dup
    FROM customers c
    WHERE c.id IS DISTINCT FROM NEW.id
      AND lower(btrim(COALESCE(c."customerType", ''))) = 'company'
      AND law_norm_name(c."customerName") = v_name
    ORDER BY c.id
    LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'Công ty "%" đã tồn tại (#%) — không được tạo trùng tên công ty.',
        btrim(NEW."customerName"), v_dup.id;
    END IF;
    RETURN NEW;
  END IF;

  -- individual: a same-name individual sharing the email or phone
  IF v_email IS NOT NULL OR v_phone IS NOT NULL THEN
    SELECT c.id INTO v_dup
    FROM customers c
    WHERE c.id IS DISTINCT FROM NEW.id
      AND lower(btrim(COALESCE(c."customerType", ''))) <> 'company'
      AND law_norm_name(c."customerName") = v_name
      AND (
        (v_email IS NOT NULL AND law_norm_email(c.email) = v_email)
        OR (v_phone IS NOT NULL AND law_norm_phone(c.phone) = v_phone)
      )
    ORDER BY c.id
    LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'Khách hàng cá nhân "%" trùng email/số điện thoại với khách hàng #% — có thể là cùng một người. Dùng khách hàng đã có hoặc nhập thông tin khác.',
        btrim(NEW."customerName"), v_dup.id;
    END IF;
  END IF;

  -- individual: nothing at all to tell a same-name individual apart
  IF v_tax IS NULL AND v_idno IS NULL AND v_email IS NULL AND v_phone IS NULL THEN
    SELECT c.id INTO v_dup
    FROM customers c
    WHERE c.id IS DISTINCT FROM NEW.id
      AND lower(btrim(COALESCE(c."customerType", ''))) <> 'company'
      AND law_norm_name(c."customerName") = v_name
    ORDER BY c.id
    LIMIT 1;
    IF FOUND THEN
      RAISE EXCEPTION 'Đã có khách hàng cá nhân "%" (#%) — nhập CCCD, email hoặc số điện thoại để phân biệt.',
        btrim(NEW."customerName"), v_dup.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_law_customer_duplicate_guard ON customers;
CREATE TRIGGER trg_law_customer_duplicate_guard
  BEFORE INSERT OR UPDATE OF "customerName", "customerType", "taxCode", "IdentityNumber", email, phone ON customers
  FOR EACH ROW
  EXECUTE FUNCTION public.law_customer_duplicate_guard();

-- ---- 1b. deleting a customer -----------------------------------------------
-- A customer with Cases can't be deleted (Case documents belong to the Case,
-- and the Cases would be left without a customer). Deleting one moves the
-- customer's own folders — the whole tree, stopping at Case folders — and
-- their documents to Trash (isDeleted), restorable from there.
--
-- NocoBase first nulls the references to a record it deletes (onDelete SET
-- NULL, database/src/features/referential-integrity-check.ts) and only then
-- DELETEs it, so by the time customers' own triggers run, folders/projects/
-- documents may no longer point to it. Both orders are covered:
--   * references still set  → the BEFORE/AFTER DELETE triggers on customers;
--   * references nulled first → constraint triggers deferred to COMMIT on
--     folders / documents / projects: a customerId set to NULL whose customer
--     no longer exists at commit was unlinked by that customer's deletion.

-- Moves folder trees to Trash (the given folders and every subfolder, not
-- entering Case folders) together with their documents.
CREATE OR REPLACE FUNCTION public.law_trash_folder_trees(p_root_ids bigint[])
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_tree bigint[];
BEGIN
  IF p_root_ids IS NULL OR cardinality(p_root_ids) = 0 THEN
    RETURN;
  END IF;

  WITH RECURSIVE tree AS (
    SELECT f.id FROM folders f WHERE f.id = ANY(p_root_ids) AND f."projectId" IS NULL
    UNION
    SELECT c.id FROM folders c JOIN tree t ON c."parentId" = t.id WHERE c."projectId" IS NULL
  )
  SELECT array_agg(id) INTO v_tree FROM tree;

  IF v_tree IS NULL THEN
    RETURN;
  END IF;

  UPDATE folders
  SET "isDeleted" = true, "deletedAt" = now(), "updatedAt" = now()
  WHERE id = ANY(v_tree) AND "isDeleted" IS NOT TRUE;

  UPDATE documents
  SET "isDeleted" = true, "deletedAt" = now(), "updatedAt" = now()
  WHERE "folderId" = ANY(v_tree) AND "isDeleted" IS NOT TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.law_customer_delete_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_cases int;
BEGIN
  SELECT count(*) INTO v_cases FROM projects WHERE "customerId" = OLD.id;
  IF v_cases > 0 THEN
    RAISE EXCEPTION 'Khách hàng "%" đang có % case — chuyển hoặc xoá các case trước khi xoá khách hàng.',
      btrim(COALESCE(OLD."customerName", '')), v_cases;
  END IF;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_law_customer_delete_guard ON customers;
CREATE TRIGGER trg_law_customer_delete_guard
  BEFORE DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION public.law_customer_delete_guard();

CREATE OR REPLACE FUNCTION public.law_customer_trash_documents()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM law_trash_folder_trees(ARRAY(
    SELECT f.id FROM folders f
    WHERE f."customerId" = OLD.id AND f."projectId" IS NULL AND f."taskId" IS NULL
  ));
  -- documents filed directly under the customer (no folder, not a Case's)
  UPDATE documents
  SET "isDeleted" = true, "deletedAt" = now(), "updatedAt" = now()
  WHERE "customerId" = OLD.id AND "folderId" IS NULL AND "caseId" IS NULL AND "isDeleted" IS NOT TRUE;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_law_customer_trash_documents ON customers;
CREATE TRIGGER trg_law_customer_trash_documents
  AFTER DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION public.law_customer_trash_documents();

-- references nulled before the DELETE (NocoBase) — checked at COMMIT
CREATE OR REPLACE FUNCTION public.law_folder_customer_unlinked()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM customers WHERE id = OLD."customerId") THEN
    PERFORM law_trash_folder_trees(ARRAY[NEW.id]);
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_law_folder_customer_unlinked ON folders;
CREATE CONSTRAINT TRIGGER trg_law_folder_customer_unlinked
  AFTER UPDATE OF "customerId" ON folders
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  WHEN (OLD."customerId" IS NOT NULL AND NEW."customerId" IS NULL AND NEW."projectId" IS NULL AND NEW."taskId" IS NULL)
  EXECUTE FUNCTION public.law_folder_customer_unlinked();

CREATE OR REPLACE FUNCTION public.law_document_customer_unlinked()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM customers WHERE id = OLD."customerId") THEN
    UPDATE documents
    SET "isDeleted" = true, "deletedAt" = now(), "updatedAt" = now()
    WHERE id = NEW.id AND "isDeleted" IS NOT TRUE;
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_law_document_customer_unlinked ON documents;
CREATE CONSTRAINT TRIGGER trg_law_document_customer_unlinked
  AFTER UPDATE OF "customerId" ON documents
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  WHEN (OLD."customerId" IS NOT NULL AND NEW."customerId" IS NULL AND NEW."folderId" IS NULL AND NEW."caseId" IS NULL)
  EXECUTE FUNCTION public.law_document_customer_unlinked();

CREATE OR REPLACE FUNCTION public.law_case_customer_unlinked()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM customers WHERE id = OLD."customerId") THEN
    RAISE EXCEPTION 'Khách hàng #% đang có case (#%) — chuyển hoặc xoá các case trước khi xoá khách hàng.',
      OLD."customerId", NEW.id;
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS trg_law_case_customer_unlinked ON projects;
CREATE CONSTRAINT TRIGGER trg_law_case_customer_unlinked
  AFTER UPDATE OF "customerId" ON projects
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  WHEN (OLD."customerId" IS NOT NULL AND NEW."customerId" IS NULL)
  EXECUTE FUNCTION public.law_case_customer_unlinked();

-- ---- 2. folders ------------------------------------------------------------

-- Is there another live folder with this name among the folder's siblings?
-- Siblings = same parent; a top-level folder (no parent) is only compared
-- with top-level folders of the same owner (case, customer, legal reference,
-- internal template, module scope, internal company) — e.g. two Cases with
-- the same name each keep their own root folder name.
CREATE OR REPLACE FUNCTION public.law_folder_sibling_name_taken(
  p_id bigint,
  p_parent_id bigint,
  p_project_id bigint,
  p_customer_id bigint,
  p_legal_reference_id bigint,
  p_internal_template_id bigint,
  p_module_scope text,
  p_internal_company_id bigint,
  p_name text
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM folders f
    WHERE f.id IS DISTINCT FROM p_id
      AND f."isDeleted" IS NOT TRUE
      AND law_norm_name(f.name) = law_norm_name(p_name)
      AND CASE
        WHEN p_parent_id IS NOT NULL THEN f."parentId" = p_parent_id
        ELSE f."parentId" IS NULL
          AND f."projectId" IS NOT DISTINCT FROM p_project_id
          AND f."customerId" IS NOT DISTINCT FROM p_customer_id
          AND f."legalReferenceId" IS NOT DISTINCT FROM p_legal_reference_id
          AND f."internalTemplateId" IS NOT DISTINCT FROM p_internal_template_id
          AND f."moduleScope" IS NOT DISTINCT FROM p_module_scope
          AND f."internalCompanyId" IS NOT DISTINCT FROM p_internal_company_id
      END
  )
$function$;

CREATE OR REPLACE FUNCTION public.law_folder_name_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_parent_customer_id bigint;
  v_is_customer_root boolean := false;
  v_base text;
  v_candidate text;
  v_n int := 0;
BEGIN
  IF NEW."isDeleted" IS TRUE OR law_norm_name(NEW.name) IS NULL THEN
    RETURN NEW;
  END IF;
  -- Only when the name, the place or the live state changes (rename, move,
  -- restore from trash).
  -- Unlinking a folder from its customer (NocoBase nulls customerId before
  -- deleting a customer) never renames it.
  IF TG_OP = 'UPDATE'
     AND NEW.name IS NOT DISTINCT FROM OLD.name
     AND NEW."parentId" IS NOT DISTINCT FROM OLD."parentId"
     AND NEW."projectId" IS NOT DISTINCT FROM OLD."projectId"
     AND NEW."isDeleted" IS NOT DISTINCT FROM OLD."isDeleted"
     AND NEW."customerId" IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND NEW.name IS NOT DISTINCT FROM OLD.name
     AND NEW."parentId" IS NOT DISTINCT FROM OLD."parentId"
     AND NEW."customerId" IS NOT DISTINCT FROM OLD."customerId"
     AND NEW."projectId" IS NOT DISTINCT FROM OLD."projectId"
     AND NEW."isDeleted" IS NOT DISTINCT FROM OLD."isDeleted" THEN
    RETURN NEW;
  END IF;

  -- A customer's root folder: it belongs to a customer, not to a Case/Task
  -- (Case folders carry the customer's id too — CaseCreateForm.js), and its
  -- parent (if any) is not part of that customer's tree — the boundary rule
  -- CustomerDocument.js uses. CaseCreateForm.js nests it under the hidden
  -- "Customers" category root (no customerId).
  IF NEW."customerId" IS NOT NULL AND NEW."projectId" IS NULL AND NEW."taskId" IS NULL THEN
    IF NEW."parentId" IS NOT NULL THEN
      SELECT "customerId" INTO v_parent_customer_id FROM folders WHERE id = NEW."parentId";
    END IF;
    v_is_customer_root := NEW."parentId" IS NULL OR v_parent_customer_id IS DISTINCT FROM NEW."customerId";
  END IF;

  IF v_is_customer_root THEN
    -- Unique within the customer; no numbering.
    PERFORM pg_advisory_xact_lock(hashtext('law_customer_root_folder:' || NEW."customerId"));
    IF EXISTS (
      SELECT 1
      FROM folders f
      LEFT JOIN folders pf ON pf.id = f."parentId"
      WHERE f."customerId" = NEW."customerId"
        AND f.id IS DISTINCT FROM NEW.id
        AND f."isDeleted" IS NOT TRUE
        AND f."projectId" IS NULL
        AND f."taskId" IS NULL
        AND (f."parentId" IS NULL OR pf."customerId" IS DISTINCT FROM f."customerId")
        AND law_norm_name(f.name) = law_norm_name(NEW.name)
    ) THEN
      RAISE EXCEPTION 'Khách hàng này đã có folder "%" — folder khách hàng không được trùng tên. Hãy đặt tên khác.',
        btrim(NEW.name);
    END IF;
    RETURN NEW;
  END IF;

  -- Any other folder: number it among its siblings.
  PERFORM pg_advisory_xact_lock(hashtext(
    'law_folder_siblings:' || COALESCE(
      NEW."parentId"::text,
      'top:' || concat_ws('|', NEW."projectId", NEW."customerId", NEW."legalReferenceId",
        NEW."internalTemplateId", NEW."moduleScope", NEW."internalCompanyId")
    )
  ));

  IF NOT law_folder_sibling_name_taken(
    NEW.id, NEW."parentId", NEW."projectId", NEW."customerId", NEW."legalReferenceId",
    NEW."internalTemplateId", NEW."moduleScope", NEW."internalCompanyId", NEW.name
  ) THEN
    RETURN NEW;
  END IF;

  v_base := btrim(NEW.name);
  LOOP
    v_n := v_n + 1;
    v_candidate := v_base || ' (' || v_n || ')';
    EXIT WHEN NOT law_folder_sibling_name_taken(
      NEW.id, NEW."parentId", NEW."projectId", NEW."customerId", NEW."legalReferenceId",
      NEW."internalTemplateId", NEW."moduleScope", NEW."internalCompanyId", v_candidate
    );
  END LOOP;
  NEW.name := v_candidate;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_law_folder_name_guard ON folders;
CREATE TRIGGER trg_law_folder_name_guard
  BEFORE INSERT OR UPDATE OF name, "parentId", "customerId", "projectId", "isDeleted" ON folders
  FOR EACH ROW
  EXECUTE FUNCTION public.law_folder_name_guard();

-- ---- 3. documents: number duplicate titles within a folder -----------------

CREATE OR REPLACE FUNCTION public.law_document_title_taken(p_id bigint, p_folder_id bigint, p_title text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM documents d
    WHERE d."folderId" = p_folder_id
      AND d.id IS DISTINCT FROM p_id
      AND d."isDeleted" IS NOT TRUE
      AND law_norm_name(d.title) = law_norm_name(p_title)
  )
$function$;

CREATE OR REPLACE FUNCTION public.law_document_title_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_title text;
  v_last_dot int;
  v_base text;
  v_ext text;
  v_candidate text;
  v_n int := 0;
BEGIN
  IF NEW."isDeleted" IS TRUE OR NEW."folderId" IS NULL OR law_norm_name(NEW.title) IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND NEW.title IS NOT DISTINCT FROM OLD.title
     AND NEW."folderId" IS NOT DISTINCT FROM OLD."folderId"
     AND NEW."isDeleted" IS NOT DISTINCT FROM OLD."isDeleted" THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('law_document_folder:' || NEW."folderId"));

  IF NOT law_document_title_taken(NEW.id, NEW."folderId", NEW.title) THEN
    RETURN NEW;
  END IF;

  -- getUniqueFileName(): the extension starts at the LAST dot, unless that
  -- dot is the first character (".env" has no extension).
  v_title := btrim(NEW.title);
  v_last_dot := CASE
    WHEN strpos(reverse(v_title), '.') > 0 THEN length(v_title) - strpos(reverse(v_title), '.') + 1
    ELSE 0
  END;
  IF v_last_dot > 1 THEN
    v_base := left(v_title, v_last_dot - 1);
    v_ext := substr(v_title, v_last_dot);
  ELSE
    v_base := v_title;
    v_ext := '';
  END IF;

  LOOP
    v_n := v_n + 1;
    v_candidate := v_base || ' (' || v_n || ')' || v_ext;
    EXIT WHEN NOT law_document_title_taken(NEW.id, NEW."folderId", v_candidate);
  END LOOP;
  NEW.title := v_candidate;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_law_document_title_guard ON documents;
CREATE TRIGGER trg_law_document_title_guard
  BEFORE INSERT OR UPDATE OF title, "folderId", "isDeleted" ON documents
  FOR EACH ROW
  EXECUTE FUNCTION public.law_document_title_guard();
