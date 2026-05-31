CREATE OR REPLACE FUNCTION public.log_activity_folders()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    old_display      TEXT;
    new_display      TEXT;
    user_name        TEXT;
    v_changed_at     TIMESTAMP WITH TIME ZONE;
    v_record_id      BIGINT;
    v_batch_id       TEXT;
    v_temp_user_id   BIGINT;
    v_is_deleted_new BOOLEAN;
    v_is_deleted_old BOOLEAN;
    v_title          TEXT;
BEGIN
    v_changed_at := timezone('Asia/Ho_Chi_Minh', now());
    v_record_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
    
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

    -- 3. Folder Name for display
    IF TG_OP = 'DELETE' THEN
        v_title := COALESCE(OLD."name", 'Thư mục #' || OLD.id);
    ELSE
        v_title := COALESCE(NEW."name", 'Thư mục #' || NEW.id);
    END IF;

    -- ==========================================================
    --  INSERT (Created)
    -- ==========================================================
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_activity('Folder', v_record_id, 'created', 'name', NULL, v_title, user_name, false, v_changed_at, v_batch_id, NULL);
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
            PERFORM public.log_activity('Folder', v_record_id, 'deleted', 'id', v_title, NULL, user_name, false, v_changed_at, v_batch_id, NULL);
            RETURN NEW;
        END IF;

        -- Check Restore from Trash
        IF v_is_deleted_new IS FALSE AND v_is_deleted_old IS TRUE THEN
            PERFORM public.log_activity('Folder', v_record_id, 'updated', 'isDeleted', 'true', 'false', user_name, false, v_changed_at, v_batch_id, NULL);
            RETURN NEW;
        END IF;

        -- Check Move (parentId change)
        IF OLD."parentId" IS DISTINCT FROM NEW."parentId" THEN
            old_display := NULL;
            new_display := NULL;
            IF OLD."parentId" IS NOT NULL THEN
                SELECT name INTO old_display FROM folders WHERE id = OLD."parentId";
            END IF;
            IF NEW."parentId" IS NOT NULL THEN
                SELECT name INTO new_display FROM folders WHERE id = NEW."parentId";
            END IF;
            old_display := COALESCE(old_display, 'Thư mục gốc');
            new_display := COALESCE(new_display, 'Thư mục gốc');
            
            PERFORM public.log_activity('Folder', v_record_id, 'moved', 'folderId', old_display, new_display, user_name, false, v_changed_at, v_batch_id, NULL);
        END IF;

        -- Check other columns (like name)
        IF OLD."name" IS DISTINCT FROM NEW."name" THEN
            PERFORM public.log_activity('Folder', v_record_id, 'updated', 'name', OLD."name", NEW."name", user_name, false, v_changed_at, v_batch_id, NULL);
        END IF;

        RETURN NEW;
    END IF;

    -- ==========================================================
    --  DELETE
    -- ==========================================================
    IF TG_OP = 'DELETE' THEN
        PERFORM public.log_activity('Folder', v_record_id, 'deleted', 'id', v_title, NULL, user_name, false, v_changed_at, NULL, NULL);
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$BODY$;

ALTER FUNCTION public.log_activity_folders() OWNER TO nocobase;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_log_activity_folders ON folders;
CREATE TRIGGER trg_log_activity_folders
AFTER INSERT OR UPDATE OR DELETE ON folders
FOR EACH ROW EXECUTE FUNCTION public.log_activity_folders();
