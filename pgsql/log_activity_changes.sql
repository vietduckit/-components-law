CREATE OR REPLACE FUNCTION public.log_activity_changes()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF
AS $BODY$
DECLARE
    col_name         TEXT;
    old_val          TEXT;
    new_val          TEXT;
    old_display      TEXT;
    new_display      TEXT;
    user_name        TEXT;
    collection_label TEXT;
    skip_cols        TEXT[];
    display_name     TEXT;
    display_field    TEXT;
    v_changed_at     TIMESTAMP WITH TIME ZONE;

    v_collection_name TEXT;
    v_record_id       BIGINT;
    v_relation_label  TEXT;

    v_batch_id        TEXT;

    v_assigned_id     TEXT;
    v_lawyer_name     TEXT;
    
    -- Biến tạm cho dynamic check
    v_temp_id         BIGINT;
    v_temp_user_id    BIGINT;
    v_is_deleted_new  BOOLEAN;
    v_is_deleted_old  BOOLEAN;

    -- FIX: Biến để mirror notes chỉ 1 lần sau loop (tránh duplicate)
    v_notes_mirror_needed BOOLEAN := false;
    v_notes_old_display   TEXT;
    v_notes_new_display   TEXT;

BEGIN
    v_changed_at := timezone('Asia/Ho_Chi_Minh', now());

    collection_label := CASE TG_TABLE_NAME
        WHEN 'lead'       THEN 'Lead'
        WHEN 'customers'  THEN 'Customer'
        WHEN 'tasks'      THEN 'Task'
        WHEN 'subTasks'   THEN 'SubTask'
        WHEN 'projects'   THEN 'Project'
        WHEN 'payments'   THEN 'Payment'
        WHEN 'quotations' THEN 'Quotation'
        WHEN 'notes'      THEN 'Note'
        WHEN 'contracts'  THEN 'Contract'
        ELSE initcap(TG_TABLE_NAME)
    END;

    skip_cols := public.activity_skip_columns();

    -- ── 1. Lấy ID của record (Dùng dynamic để tránh lỗi sập hệ thống) ─────
    BEGIN
        EXECUTE 'SELECT ($1).id' INTO v_record_id USING (CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
    EXCEPTION WHEN others THEN 
        v_record_id := NULL;
    END;

    -- ── 2. Xác định người thực hiện (Dynamic check updatedById/createdById) ─
    user_name := NULL;
    v_temp_user_id := NULL;
    
    BEGIN
        IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
            EXECUTE 'SELECT ($1)."updatedById"' INTO v_temp_user_id USING NEW;
            IF v_temp_user_id IS NULL AND TG_OP = 'INSERT' THEN
                EXECUTE 'SELECT ($1)."createdById"' INTO v_temp_user_id USING NEW;
            END IF;
        END IF;
    EXCEPTION WHEN others THEN v_temp_user_id := NULL;
    END;

    IF v_temp_user_id IS NOT NULL THEN
        SELECT COALESCE(nickname, username) INTO user_name
        FROM users WHERE id = v_temp_user_id;
    END IF;

    -- ── 3. Đọc batchId (Dynamic) ──────────────────────────────────
    BEGIN
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            EXECUTE 'SELECT ($1)."batchId"::TEXT' INTO v_batch_id USING NEW;
        END IF;
    EXCEPTION WHEN others THEN v_batch_id := NULL;
    END;

    -- ==========================================================
    --  INSERT
    -- ==========================================================
    IF TG_OP = 'INSERT' THEN
        IF v_temp_user_id IS NULL THEN
            RETURN NEW;
        END IF;

        display_name  := NULL;
        display_field := NULL;

        CASE TG_TABLE_NAME
            WHEN 'tasks' THEN
                display_field := 'title';
                BEGIN EXECUTE 'SELECT ($1)."title"::TEXT' INTO display_name USING NEW; EXCEPTION WHEN others THEN NULL; END;

            WHEN 'subTasks' THEN
                display_field := 'subTaskName';
                BEGIN EXECUTE 'SELECT ($1)."subTaskName"::TEXT' INTO display_name USING NEW; EXCEPTION WHEN others THEN NULL; END;

            WHEN 'notes' THEN
                display_field := 'body';
                BEGIN 
                    EXECUTE 'SELECT LEFT(($1)."body"::TEXT, 60)' INTO display_name USING NEW; 
                    IF display_name IS NOT NULL AND LENGTH(display_name) = 60 THEN display_name := display_name || '…'; END IF;
                EXCEPTION WHEN others THEN NULL; 
                END;


            ELSE
                display_field := 'id';
                display_name  := '#' || v_record_id;
        END CASE;

        IF display_name IS NULL OR display_name = '' THEN
            display_name := collection_label || ' #' || v_record_id;
        END IF;

        PERFORM public.log_activity(collection_label, v_record_id, 'created', display_field, NULL, display_name, user_name, false, v_changed_at, v_batch_id, NULL);

        -- FIX: assignedLawyerId cho notes
        IF TG_TABLE_NAME = 'notes' THEN
            BEGIN
                EXECUTE 'SELECT ($1)."assignedLawyerId"::TEXT' INTO v_assigned_id USING NEW;
                IF v_assigned_id IS NOT NULL THEN
                    v_lawyer_name := public.resolve_display_value('assignedLawyerId', v_assigned_id, 'notes');
                    PERFORM public.log_activity(collection_label, v_record_id, 'created', 'assignedLawyerId', NULL, v_lawyer_name, user_name, false, v_changed_at, v_batch_id, NULL);
                END IF;
            EXCEPTION WHEN others THEN NULL;
            END;
        END IF;

        -- Mirroring record cha
        IF TG_TABLE_NAME IN ('notes') THEN
            BEGIN
                -- FIX Bug #3: Tách thành 2 EXECUTE riêng (SELECT 2 cột vào 2 biến không chuẩn)
                EXECUTE 'SELECT ($1)."collectionName"::TEXT' INTO v_collection_name USING NEW;
                EXECUTE 'SELECT ($1)."recordId"::BIGINT'     INTO v_temp_id         USING NEW;
                IF v_collection_name IS NOT NULL AND v_temp_id IS NOT NULL THEN
                    v_relation_label := public.resolve_relation_label(v_collection_name, v_temp_id);
                    PERFORM public.log_activity(collection_label, v_record_id, 'created', 'linkedTo', NULL, v_collection_name || ': ' || v_relation_label, user_name, true, v_changed_at, v_batch_id);
                    
                    v_collection_name := CASE
                        WHEN v_collection_name = 'tasks'    THEN 'Task'
                        WHEN v_collection_name = 'subTasks' THEN 'SubTask'
                        WHEN v_collection_name = 'projects' THEN 'Project'
                        ELSE initcap(v_collection_name)
                    END;
                    PERFORM public.log_activity(v_collection_name, v_temp_id, 'created', 'notes', NULL, display_name, user_name, true, v_changed_at, v_batch_id, v_record_id);
                END IF;
            EXCEPTION WHEN others THEN NULL;
            END;
        END IF;

        RETURN NEW;
    END IF;

    -- ==========================================================
    --  UPDATE
    -- ==========================================================
    IF TG_OP = 'UPDATE' THEN

        -- ── Soft Delete Check (Dynamic) ────────────────────────
        v_is_deleted_new := false;
        v_is_deleted_old := false;
        BEGIN
            EXECUTE 'SELECT ($1)."isDeleted"' INTO v_is_deleted_new USING NEW;
            EXECUTE 'SELECT ($1)."isDeleted"' INTO v_is_deleted_old USING OLD;
        EXCEPTION WHEN others THEN NULL;
        END;

        IF TG_TABLE_NAME IN ('notes') AND v_is_deleted_new IS TRUE AND (v_is_deleted_old IS FALSE OR v_is_deleted_old IS NULL) THEN
            display_name := NULL;
            IF TG_TABLE_NAME = 'notes' THEN
                BEGIN EXECUTE 'SELECT LEFT(($1)."body"::TEXT, 60)' INTO display_name USING OLD; IF display_name IS NOT NULL AND LENGTH(display_name) = 60 THEN display_name := display_name || '…'; END IF; EXCEPTION WHEN others THEN NULL; END;
            END IF;
            
            IF display_name IS NULL OR display_name = '' THEN display_name := collection_label || ' #' || v_record_id; END IF;

            PERFORM public.log_activity(collection_label, v_record_id, 'deleted', 'id', display_name, NULL, user_name, false, v_changed_at, v_batch_id, NULL);

            -- Mirror soft delete
            BEGIN
                EXECUTE 'SELECT ($1)."collectionName"::TEXT, ($1)."recordId"::BIGINT' INTO v_collection_name, v_temp_id USING NEW;
                IF v_collection_name IS NOT NULL AND v_temp_id IS NOT NULL THEN
                    v_collection_name := CASE WHEN v_collection_name = 'tasks' THEN 'Task' WHEN v_collection_name = 'subTasks' THEN 'SubTask' WHEN v_collection_name = 'projects' THEN 'Project' ELSE initcap(v_collection_name) END;
                    PERFORM public.log_activity(v_collection_name, v_temp_id, 'deleted', 'notes', display_name, NULL, user_name, true, v_changed_at, v_batch_id, v_record_id);
                END IF;
            EXCEPTION WHEN others THEN NULL;
            END;

            RETURN NEW;
        END IF;

        -- ── Loop changed columns ─────────────────────────────
        FOR col_name IN
            SELECT column_name FROM information_schema.columns WHERE table_name = TG_TABLE_NAME AND table_schema = 'public' AND column_name <> ALL(skip_cols)
        LOOP
            BEGIN
                EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', col_name, col_name) INTO old_val, new_val USING OLD, NEW;
            EXCEPTION WHEN others THEN CONTINUE;
            END;

            CONTINUE WHEN old_val IS NOT DISTINCT FROM new_val;

            -- Chặn các cột hệ thống
            IF TG_TABLE_NAME IN ('notes') AND col_name IN ('collectionName', 'recordId') THEN CONTINUE; END IF;

            IF col_name IN ('description', 'body', 'note', 'content', 'googleDriveUrl', 'replyText') THEN
                old_val := public.truncate_long_text(old_val);
                new_val := public.truncate_long_text(new_val);
            END IF;

            old_display := public.resolve_display_value(col_name, old_val, TG_TABLE_NAME);
            new_display := public.resolve_display_value(col_name, new_val, TG_TABLE_NAME);

            PERFORM public.log_activity(collection_label, v_record_id, 'updated', col_name, old_display, new_display, user_name, false, v_changed_at, v_batch_id, NULL);

            -- FIX Bug #1: Chỉ đánh dấu để mirror sau loop, tránh gọi N lần theo số cột đổi
            IF TG_TABLE_NAME = 'notes' THEN
                v_notes_mirror_needed := true;
                v_notes_old_display   := old_display;
                v_notes_new_display   := new_display;
            END IF;
        END LOOP;

        -- FIX Bug #1: Mirror notes 1 lần duy nhất sau loop (tránh duplicate)
        IF TG_TABLE_NAME = 'notes' AND v_notes_mirror_needed THEN
            BEGIN
                EXECUTE 'SELECT ($1)."collectionName"::TEXT' INTO v_collection_name USING NEW;
                EXECUTE 'SELECT ($1)."recordId"::BIGINT'     INTO v_temp_id         USING NEW;
                IF v_collection_name IS NOT NULL AND v_temp_id IS NOT NULL THEN
                    v_collection_name := CASE
                        WHEN v_collection_name = 'tasks'    THEN 'Task'
                        WHEN v_collection_name = 'subTasks' THEN 'SubTask'
                        WHEN v_collection_name = 'projects' THEN 'Project'
                        ELSE initcap(v_collection_name)
                    END;
                    PERFORM public.log_activity(v_collection_name, v_temp_id, 'updated', 'notes', v_notes_old_display, v_notes_new_display, user_name, true, v_changed_at, v_batch_id, v_record_id);
                END IF;
            EXCEPTION WHEN others THEN NULL;
            END;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$BODY$;

ALTER FUNCTION public.log_activity_changes() OWNER TO nocobase;