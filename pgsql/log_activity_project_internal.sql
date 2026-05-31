-- Activity logging for the Project Internal module.
--
-- Design notes:
-- 1. This file does not replace public.log_activity_changes().
-- 2. It uses its own function and trigger names so re-running is idempotent.
-- 3. It refuses to attach if another activity-style trigger already exists on
--    projectInternal. That avoids duplicate audit rows.
-- 4. It only logs physical columns on public."projectInternal". Relation fields
--    like tasks, notes, documents, folders, projectAssignees and activity_log
--    are virtual/relation-backed fields in NocoBase and need their own child or
--    join-table triggers if you want relation membership changes in history.
-- 5. Exact Project Internal fields from the collection settings:
--    id, projectManagerId, internalCompanyId, createdAt, createdBy, updatedAt,
--    updatedBy, projectName, description, priority, projectCode, status,
--    startDate, deadline, closedDate, internalCompany, projectManager, tasks,
--    projectAssignees, notes, documents, folders, activity_log.
-- 6. Activity rows use the display collectionName 'Project Internal' to stay
--    consistent with relation logs from notes/documents.

CREATE OR REPLACE FUNCTION public.project_internal_activity_tracked_columns()
    RETURNS text[]
    LANGUAGE 'sql'
    IMMUTABLE
AS $BODY$
    -- Audit columns id/createdAt/createdById/updatedAt/updatedById are skipped
    -- by public.activity_skip_columns(); they are used to identify actor/time.
    SELECT ARRAY[
        'projectName',
        'description',
        'priority',
        'projectCode',
        'status',
        'startDate',
        'deadline',
        'closedDate',
        'internalCompanyId',
        'projectManagerId'
    ]::text[];
$BODY$;

CREATE OR REPLACE FUNCTION public.project_internal_activity_label(
    p_table_name text,
    p_record_id bigint,
    p_fields text[]
)
    RETURNS text
    LANGUAGE 'plpgsql'
    STABLE
AS $BODY$
DECLARE
    v_field text;
    v_label text;
BEGIN
    IF p_table_name IS NULL OR p_record_id IS NULL THEN
        RETURN NULL;
    END IF;

    IF to_regclass(format('%I.%I', 'public', p_table_name)) IS NULL THEN
        RETURN NULL;
    END IF;

    IF p_table_name = 'projectInternal' THEN
        BEGIN
            EXECUTE format(
                'SELECT NULLIF(concat_ws('' '', NULLIF("projectCode"::TEXT, ''''), NULLIF("projectName"::TEXT, '''')), '''') FROM %I.%I WHERE id = $1',
                'public',
                p_table_name
            )
            INTO v_label
            USING p_record_id;

            IF v_label IS NOT NULL THEN
                RETURN v_label;
            END IF;
        EXCEPTION WHEN others THEN
            v_label := NULL;
        END;
    END IF;

    FOREACH v_field IN ARRAY p_fields
    LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = p_table_name
              AND column_name = v_field
        ) THEN
            BEGIN
                EXECUTE format(
                    'SELECT NULLIF(%I::TEXT, '''') FROM %I.%I WHERE id = $1',
                    v_field,
                    'public',
                    p_table_name
                )
                INTO v_label
                USING p_record_id;

                IF v_label IS NOT NULL THEN
                    RETURN v_label;
                END IF;
            EXCEPTION WHEN others THEN
                v_label := NULL;
            END;
        END IF;
    END LOOP;

    RETURN NULL;
END;
$BODY$;

CREATE OR REPLACE FUNCTION public.resolve_project_internal_activity_value(
    p_col_name text,
    p_val text,
    p_table_name text DEFAULT NULL::text
)
    RETURNS text
    LANGUAGE 'plpgsql'
    STABLE
AS $BODY$
DECLARE
    v_result text;
    v_id bigint;
BEGIN
    IF p_val IS NULL OR p_val = '' OR lower(p_val) = 'null' THEN
        RETURN NULL;
    END IF;

    BEGIN
        v_id := p_val::bigint;
    EXCEPTION WHEN others THEN
        v_id := NULL;
    END;

    IF p_col_name = 'projectManagerId' AND v_id IS NOT NULL THEN
        BEGIN
            SELECT "lawyerName" INTO v_result
            FROM public.lawyers
            WHERE id = v_id;
        EXCEPTION WHEN others THEN
            v_result := NULL;
        END;

        IF v_result IS NULL THEN
            BEGIN
                SELECT COALESCE(nickname, username) INTO v_result
                FROM public.users
                WHERE id = v_id;
            EXCEPTION WHEN others THEN
                v_result := NULL;
            END;
        END IF;

        RETURN COALESCE(v_result, 'User #' || p_val);
    END IF;

    IF p_col_name IN ('createdById', 'updatedById') AND v_id IS NOT NULL THEN
        BEGIN
            SELECT COALESCE(nickname, username) INTO v_result
            FROM public.users
            WHERE id = v_id;
        EXCEPTION WHEN others THEN
            v_result := NULL;
        END;

        RETURN COALESCE(v_result, 'User #' || p_val);
    END IF;

    IF p_col_name = 'internalCompanyId' AND v_id IS NOT NULL THEN
        v_result := public.project_internal_activity_label(
            'internalCompany',
            v_id,
            ARRAY['name', 'companyName', 'shortName', 'displayName']
        );

        RETURN COALESCE(v_result, 'Company #' || p_val);
    END IF;

    IF p_col_name = 'status' THEN
        RETURN CASE p_val
            WHEN 'draft' THEN 'Nhap'
            WHEN 'planned' THEN 'Len ke hoach'
            WHEN 'toDo' THEN 'Chua thuc hien'
            WHEN 'todo' THEN 'Chua thuc hien'
            WHEN 'active' THEN 'Dang thuc hien'
            WHEN 'inProgress' THEN 'Dang thuc hien'
            WHEN 'pending' THEN 'Cho xu ly'
            WHEN 'onHold' THEN 'Tam dung'
            WHEN 'blocked' THEN 'Dang bi chan'
            WHEN 'done' THEN 'Hoan thanh'
            WHEN 'completed' THEN 'Hoan thanh'
            WHEN 'closed' THEN 'Da dong'
            WHEN 'cancelled' THEN 'Da huy'
            WHEN 'canceled' THEN 'Da huy'
            ELSE p_val
        END;
    END IF;

    IF p_col_name = 'priority' THEN
        RETURN CASE p_val
            WHEN 'urgent' THEN 'Khan cap'
            WHEN 'high' THEN 'Cao'
            WHEN 'medium' THEN 'Trung binh'
            WHEN 'normal' THEN 'Binh thuong'
            WHEN 'low' THEN 'Thap'
            ELSE p_val
        END;
    END IF;

    IF p_col_name IN (
        'closedDate', 'startDate', 'deadline',
        'createdAt', 'updatedAt'
    ) THEN
        BEGIN
            RETURN to_char(
                p_val::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh',
                'DD/MM/YYYY HH24:MI'
            );
        EXCEPTION WHEN others THEN
            RETURN p_val;
        END;
    END IF;

    RETURN p_val;
END;
$BODY$;

CREATE OR REPLACE FUNCTION public.log_activity_project_internal_changes()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF
AS $BODY$
DECLARE
    col_name text;
    old_val text;
    new_val text;
    old_display text;
    new_display text;
    user_name text;
    skip_cols text[];
    display_name text;
    display_field text;
    display_fields text[];
    tracked_cols text[];
    v_changed_at timestamp with time zone;
    v_collection_name text;
    v_record_id bigint;
    v_batch_id text;
    v_temp_user_id bigint;
    v_is_deleted_new boolean;
    v_is_deleted_old boolean;
BEGIN
    v_changed_at := timezone('Asia/Ho_Chi_Minh', now());

    v_collection_name := CASE TG_TABLE_NAME
        WHEN 'projectInternal' THEN 'Project Internal'
        ELSE TG_TABLE_NAME
    END;

    skip_cols := public.activity_skip_columns()
        || ARRAY[
            'linkedUrl',
            'fileIndex',
            'folderIndex'
        ]::text[];
    tracked_cols := CASE TG_TABLE_NAME
        WHEN 'projectInternal' THEN public.project_internal_activity_tracked_columns()
        ELSE NULL
    END;

    BEGIN
        EXECUTE 'SELECT ($1).id' INTO v_record_id USING (CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
    EXCEPTION WHEN others THEN
        v_record_id := NULL;
    END;

    user_name := NULL;
    v_temp_user_id := NULL;

    BEGIN
        IF TG_OP IN ('INSERT', 'UPDATE') THEN
            EXECUTE 'SELECT ($1)."updatedById"' INTO v_temp_user_id USING NEW;
            IF v_temp_user_id IS NULL THEN
                EXECUTE 'SELECT ($1)."createdById"' INTO v_temp_user_id USING NEW;
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            EXECUTE 'SELECT ($1)."updatedById"' INTO v_temp_user_id USING OLD;
            IF v_temp_user_id IS NULL THEN
                EXECUTE 'SELECT ($1)."createdById"' INTO v_temp_user_id USING OLD;
            END IF;
        END IF;
    EXCEPTION WHEN others THEN
        v_temp_user_id := NULL;
    END;

    IF v_temp_user_id IS NOT NULL THEN
        SELECT COALESCE(nickname, username) INTO user_name
        FROM public.users
        WHERE id = v_temp_user_id;
    END IF;
    user_name := COALESCE(user_name, 'System');

    BEGIN
        IF TG_OP IN ('INSERT', 'UPDATE') THEN
            EXECUTE 'SELECT ($1)."batchId"::TEXT' INTO v_batch_id USING NEW;
        ELSIF TG_OP = 'DELETE' THEN
            EXECUTE 'SELECT ($1)."batchId"::TEXT' INTO v_batch_id USING OLD;
        END IF;
    EXCEPTION WHEN others THEN
        v_batch_id := NULL;
    END;

    display_fields := CASE TG_TABLE_NAME
        WHEN 'projectInternal' THEN ARRAY['projectName', 'projectCode']
        ELSE ARRAY['title', 'name']
    END;

    display_name := NULL;
    display_field := NULL;

    IF TG_TABLE_NAME = 'projectInternal' THEN
        display_field := 'projectName';
        BEGIN
            IF TG_OP = 'DELETE' THEN
                EXECUTE 'SELECT NULLIF(concat_ws('' '', NULLIF(($1)."projectCode"::TEXT, ''''), NULLIF(($1)."projectName"::TEXT, '''')), '''')'
                INTO display_name
                USING OLD;
            ELSE
                EXECUTE 'SELECT NULLIF(concat_ws('' '', NULLIF(($1)."projectCode"::TEXT, ''''), NULLIF(($1)."projectName"::TEXT, '''')), '''')'
                INTO display_name
                USING NEW;
            END IF;
        EXCEPTION WHEN others THEN
            display_name := NULL;
        END;
    END IF;

    IF display_name IS NULL THEN
        FOREACH display_field IN ARRAY display_fields
        LOOP
            BEGIN
                IF TG_OP = 'DELETE' THEN
                    EXECUTE format('SELECT NULLIF(($1).%I::TEXT, '''')', display_field) INTO display_name USING OLD;
                ELSE
                    EXECUTE format('SELECT NULLIF(($1).%I::TEXT, '''')', display_field) INTO display_name USING NEW;
                END IF;
            EXCEPTION WHEN others THEN
                display_name := NULL;
            END;

            IF display_name IS NOT NULL THEN
                EXIT;
            END IF;
        END LOOP;
    END IF;

    IF display_name IS NULL OR display_name = '' THEN
        display_field := 'id';
        display_name := v_collection_name || ' #' || COALESCE(v_record_id::text, '?');
    END IF;

    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_activity(
            v_collection_name,
            v_record_id,
            'created',
            display_field,
            NULL,
            display_name,
            user_name,
            false,
            v_changed_at,
            v_batch_id,
            NULL
        );

        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        v_is_deleted_new := false;
        v_is_deleted_old := false;

        BEGIN
            EXECUTE 'SELECT ($1)."isDeleted"' INTO v_is_deleted_new USING NEW;
            EXECUTE 'SELECT ($1)."isDeleted"' INTO v_is_deleted_old USING OLD;
        EXCEPTION WHEN others THEN
            v_is_deleted_new := false;
            v_is_deleted_old := false;
        END;

        IF v_is_deleted_new IS TRUE AND COALESCE(v_is_deleted_old, false) IS FALSE THEN
            PERFORM public.log_activity(
                v_collection_name,
                v_record_id,
                'deleted',
                'id',
                display_name,
                NULL,
                user_name,
                false,
                v_changed_at,
                v_batch_id,
                NULL
            );

            RETURN NEW;
        END IF;

        FOR col_name IN
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = TG_TABLE_NAME
              AND column_name <> ALL(skip_cols)
              AND (tracked_cols IS NULL OR column_name = ANY(tracked_cols))
        LOOP
            BEGIN
                EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', col_name, col_name)
                INTO old_val, new_val
                USING OLD, NEW;
            EXCEPTION WHEN others THEN
                CONTINUE;
            END;

            CONTINUE WHEN old_val IS NOT DISTINCT FROM new_val;

            IF col_name IN (
                'description'
            ) THEN
                IF old_val IS NOT NULL AND length(old_val) > 500 THEN
                    old_val := left(old_val, 500) || '...';
                END IF;
                IF new_val IS NOT NULL AND length(new_val) > 500 THEN
                    new_val := left(new_val, 500) || '...';
                END IF;
            END IF;

            old_display := public.resolve_project_internal_activity_value(col_name, old_val, TG_TABLE_NAME);
            new_display := public.resolve_project_internal_activity_value(col_name, new_val, TG_TABLE_NAME);

            PERFORM public.log_activity(
                v_collection_name,
                v_record_id,
                'updated',
                col_name,
                old_display,
                new_display,
                user_name,
                false,
                v_changed_at,
                v_batch_id,
                NULL
            );
        END LOOP;

        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        PERFORM public.log_activity(
            v_collection_name,
            v_record_id,
            'deleted',
            'id',
            display_name,
            NULL,
            user_name,
            false,
            v_changed_at,
            v_batch_id,
            NULL
        );

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$BODY$;

DO $OWNER$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nocobase') THEN
        ALTER FUNCTION public.project_internal_activity_tracked_columns() OWNER TO nocobase;
        ALTER FUNCTION public.project_internal_activity_label(text, bigint, text[]) OWNER TO nocobase;
        ALTER FUNCTION public.resolve_project_internal_activity_value(text, text, text) OWNER TO nocobase;
        ALTER FUNCTION public.log_activity_project_internal_changes() OWNER TO nocobase;
    END IF;
END;
$OWNER$;

-- Stop before attaching if another activity trigger is already present.
DO $CONFLICT_GUARD$
DECLARE
    v_conflicts text;
BEGIN
    SELECT string_agg(
        format('%I on %I.%I -> %I.%I()', t.tgname, nc.nspname, c.relname, np.nspname, p.proname),
        E'\n'
    )
    INTO v_conflicts
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace nc ON nc.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace np ON np.oid = p.pronamespace
    WHERE NOT t.tgisinternal
      AND nc.nspname = 'public'
      AND c.relname = 'projectInternal'
      AND t.tgname <> 'trg_log_activity_project_internal'
      AND (
          t.tgname ILIKE '%log%activity%'
          OR p.proname ILIKE 'log_activity%'
      );

    IF v_conflicts IS NOT NULL THEN
        RAISE EXCEPTION
            'Project Internal activity trigger was not attached because existing activity trigger(s) were found:%',
            E'\n' || v_conflicts;
    END IF;
END;
$CONFLICT_GUARD$;

DO $NORMALIZE_ACTIVITY_COLLECTION_NAME$
BEGIN
    IF to_regclass('public.activity_log') IS NOT NULL THEN
        UPDATE public.activity_log
        SET "collectionName" = 'Project Internal'
        WHERE "collectionName" = 'projectInternal';
    END IF;
END;
$NORMALIZE_ACTIVITY_COLLECTION_NAME$;

DO $ATTACH_TRIGGERS$
BEGIN
    IF to_regclass('public."projectInternal"') IS NOT NULL THEN
        EXECUTE 'DROP TRIGGER IF EXISTS trg_log_activity_project_internal ON public."projectInternal"';
        EXECUTE 'CREATE TRIGGER trg_log_activity_project_internal
                 AFTER INSERT OR UPDATE OR DELETE ON public."projectInternal"
                 FOR EACH ROW EXECUTE FUNCTION public.log_activity_project_internal_changes()';
    ELSE
        RAISE NOTICE 'Skipping activity trigger: public."projectInternal" does not exist.';
    END IF;
END;
$ATTACH_TRIGGERS$;

-- Verification query:
-- SELECT
--     t.tgname AS trigger_name,
--     c.relname AS table_name,
--     p.proname AS function_name,
--     NOT t.tgisinternal AS enabled
-- FROM pg_trigger t
-- JOIN pg_class c ON c.oid = t.tgrelid
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- JOIN pg_proc p ON p.oid = t.tgfoid
-- WHERE n.nspname = 'public'
--   AND c.relname = 'projectInternal'
-- ORDER BY c.relname, t.tgname;
