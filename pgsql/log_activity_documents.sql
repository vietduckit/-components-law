CREATE OR REPLACE FUNCTION public.log_activity_documents()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    col_name         TEXT;
    old_val          TEXT;
    new_val          TEXT;
    old_display      TEXT;
    new_display      TEXT;
    user_name        TEXT;
    v_changed_at     TIMESTAMP WITH TIME ZONE;
    v_record_id      BIGINT;
    v_batch_id       TEXT;
    v_temp_user_id   BIGINT;
    v_collection_name TEXT;
    v_temp_id        BIGINT;
    v_is_deleted_new BOOLEAN;
    v_is_deleted_old BOOLEAN;
    v_title          TEXT;
    skip_cols        TEXT[];
BEGIN
    v_changed_at := timezone('Asia/Ho_Chi_Minh', now());
    v_record_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
    
    -- Skip columns from generic config
    skip_cols := public.activity_skip_columns();

    -- 1. Identify User
    IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
        v_temp_user_id := COALESCE(NEW."updatedById", NEW."createdById");
    ELSE
        v_temp_user_id := OLD."updatedById";
    END IF;

    IF v_temp_user_id IS NOT NULL THEN
        SELECT COALESCE(nickname, username) INTO user_name
        FROM users WHERE id = v_temp_user_id;
    END IF;

    -- 2. Batch ID
    BEGIN
        IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
            v_batch_id := NEW."batchId"::TEXT;
        END IF;
    EXCEPTION WHEN others THEN
        v_batch_id := NULL;
    END;

    -- 3. Document Title for display
    IF TG_OP = 'DELETE' THEN
        v_title := COALESCE(OLD."title", 'Tài liệu #' || OLD.id);
    ELSE
        v_title := COALESCE(NEW."title", 'Tài liệu #' || NEW.id);
    END IF;

    -- ==========================================================
    --  INSERT (Uploaded)
    -- ==========================================================
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_activity('Document', v_record_id, 'uploaded', 'title', NULL, v_title, user_name, false, v_changed_at, v_batch_id, NULL);
        
        -- Mirroring record cha
        BEGIN
            EXECUTE 'SELECT ($1)."collectionName"::TEXT, ($1)."recordId"::BIGINT' INTO v_collection_name, v_temp_id USING NEW;
            IF v_collection_name IS NOT NULL AND v_temp_id IS NOT NULL THEN
                v_collection_name := CASE 
                    WHEN v_collection_name = 'tasks'    THEN 'Task' 
                    WHEN v_collection_name = 'subTasks' THEN 'SubTask' 
                    WHEN v_collection_name = 'projects' THEN 'Project' 
                    ELSE initcap(v_collection_name) 
                END;
                PERFORM public.log_activity(v_collection_name, v_temp_id, 'uploaded', 'documents', NULL, v_title, user_name, true, v_changed_at, v_batch_id, v_record_id);
            END IF;
        EXCEPTION WHEN others THEN NULL;
        END;
        
        RETURN NEW;
    END IF;

    -- ==========================================================
    --  UPDATE
    -- ==========================================================
    IF TG_OP = 'UPDATE' THEN
        -- Check Soft Delete
        v_is_deleted_new := COALESCE(NEW."isDeleted", false);
        v_is_deleted_old := COALESCE(OLD."isDeleted", false);

        IF v_is_deleted_new IS TRUE AND v_is_deleted_old IS FALSE THEN
            PERFORM public.log_activity('Document', v_record_id, 'deleted', 'id', v_title, NULL, user_name, false, v_changed_at, v_batch_id, NULL);
            
            -- Mirror soft delete
            BEGIN
                EXECUTE 'SELECT ($1)."collectionName"::TEXT, ($1)."recordId"::BIGINT' INTO v_collection_name, v_temp_id USING NEW;
                IF v_collection_name IS NOT NULL AND v_temp_id IS NOT NULL THEN
                    v_collection_name := CASE 
                        WHEN v_collection_name = 'tasks'    THEN 'Task' 
                        WHEN v_collection_name = 'subTasks' THEN 'SubTask' 
                        WHEN v_collection_name = 'projects' THEN 'Project' 
                        ELSE initcap(v_collection_name) 
                    END;
                    PERFORM public.log_activity(v_collection_name, v_temp_id, 'deleted', 'documents', v_title, NULL, user_name, true, v_changed_at, v_batch_id, v_record_id);
                END IF;
            EXCEPTION WHEN others THEN NULL;
            END;

            RETURN NEW;
        END IF;

        -- Check Restore from Trash
        IF v_is_deleted_new IS FALSE AND v_is_deleted_old IS TRUE THEN
            PERFORM public.log_activity('Document', v_record_id, 'updated', 'isDeleted', 'true', 'false', user_name, false, v_changed_at, v_batch_id, NULL);
            
            -- Mirror restore
            BEGIN
                EXECUTE 'SELECT ($1)."collectionName"::TEXT, ($1)."recordId"::BIGINT' INTO v_collection_name, v_temp_id USING NEW;
                IF v_collection_name IS NOT NULL AND v_temp_id IS NOT NULL THEN
                    v_collection_name := CASE 
                        WHEN v_collection_name = 'tasks'    THEN 'Task' 
                        WHEN v_collection_name = 'subTasks' THEN 'SubTask' 
                        WHEN v_collection_name = 'projects' THEN 'Project' 
                        ELSE initcap(v_collection_name) 
                    END;
                    PERFORM public.log_activity(v_collection_name, v_temp_id, 'updated', 'documents', 'true', 'false', user_name, true, v_changed_at, v_batch_id, v_record_id);
                END IF;
            EXCEPTION WHEN others THEN NULL;
            END;

            RETURN NEW;
        END IF;

        -- Check Move (folderId change)
        IF OLD."folderId" IS DISTINCT FROM NEW."folderId" THEN
            old_display := public.resolve_display_value('folderId', OLD."folderId"::TEXT, 'documents');
            new_display := public.resolve_display_value('folderId', NEW."folderId"::TEXT, 'documents');
            PERFORM public.log_activity('Document', v_record_id, 'moved', 'folderId', old_display, new_display, user_name, false, v_changed_at, v_batch_id, NULL);

            -- Mirror move
            BEGIN
                EXECUTE 'SELECT ($1)."collectionName"::TEXT, ($1)."recordId"::BIGINT' INTO v_collection_name, v_temp_id USING NEW;
                IF v_collection_name IS NOT NULL AND v_temp_id IS NOT NULL THEN
                    v_collection_name := CASE 
                        WHEN v_collection_name = 'tasks'    THEN 'Task' 
                        WHEN v_collection_name = 'subTasks' THEN 'SubTask' 
                        WHEN v_collection_name = 'projects' THEN 'Project' 
                        ELSE initcap(v_collection_name) 
                    END;
                    PERFORM public.log_activity(v_collection_name, v_temp_id, 'moved', 'documents', old_display, new_display, user_name, true, v_changed_at, v_batch_id, v_record_id);
                END IF;
            EXCEPTION WHEN others THEN NULL;
            END;
        END IF;

        -- Check other columns
        FOR col_name IN
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'documents' AND table_schema = 'public' 
            AND column_name <> ALL(skip_cols)
            AND column_name NOT IN ('folderId', 'isDeleted', 'updatedAt', 'updatedById', 'batchId', 'fileIndex', 'folderIndex')
        LOOP
            BEGIN
                EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', col_name, col_name) INTO old_val, new_val USING OLD, NEW;
            EXCEPTION WHEN others THEN CONTINUE;
            END;

            IF old_val IS DISTINCT FROM new_val THEN
                old_display := public.resolve_display_value(col_name, old_val, 'documents');
                new_display := public.resolve_display_value(col_name, new_val, 'documents');
                PERFORM public.log_activity('Document', v_record_id, 'updated', col_name, old_display, new_display, user_name, false, v_changed_at, v_batch_id, NULL);
            END IF;
        END LOOP;

        RETURN NEW;
    END IF;

    -- ==========================================================
    --  DELETE
    -- ==========================================================
    IF TG_OP = 'DELETE' THEN
        PERFORM public.log_activity('Document', v_record_id, 'deleted', 'id', v_title, NULL, user_name, false, v_changed_at, NULL, NULL);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$BODY$;

ALTER FUNCTION public.log_activity_documents() OWNER TO nocobase;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_log_activity_documents ON documents;
CREATE TRIGGER trg_log_activity_documents
AFTER INSERT OR UPDATE OR DELETE ON documents
FOR EACH ROW EXECUTE FUNCTION public.log_activity_documents();
