CREATE OR REPLACE FUNCTION public.activity_jsonb_bigint(
    p_doc jsonb,
    p_key text
)
    RETURNS bigint
    LANGUAGE 'sql'
    IMMUTABLE
AS $BODY$
    SELECT CASE
        WHEN COALESCE($1 ->> $2, '') ~ '^[0-9]+$'
            THEN ($1 ->> $2)::BIGINT
        ELSE NULL
    END;
$BODY$;

ALTER FUNCTION public.activity_jsonb_bigint(jsonb, text) OWNER TO nocobase;

CREATE OR REPLACE FUNCTION public.resolve_document_activity_parent(
    p_doc jsonb
)
    RETURNS TABLE(collection_name text, record_id bigint)
    LANGUAGE 'plpgsql'
    STABLE
AS $BODY$
DECLARE
    v_id BIGINT;
    v_folder_id BIGINT;
    v_folder RECORD;
    v_collection_name TEXT;
BEGIN
    -- Direct relation fields on documents. Keep specific business records before broad customer links.
    v_id := public.activity_jsonb_bigint(p_doc, 'legalReferenceId');
    IF v_id IS NOT NULL THEN collection_name := 'LegalReference'; record_id := v_id; RETURN NEXT; RETURN; END IF;

    v_id := public.activity_jsonb_bigint(p_doc, 'internalTemplateId');
    IF v_id IS NOT NULL THEN collection_name := 'InternalTemplate'; record_id := v_id; RETURN NEXT; RETURN; END IF;

    v_id := public.activity_jsonb_bigint(p_doc, 'subTaskId');
    IF v_id IS NOT NULL THEN collection_name := 'SubTask'; record_id := v_id; RETURN NEXT; RETURN; END IF;

    v_id := public.activity_jsonb_bigint(p_doc, 'taskId');
    IF v_id IS NOT NULL THEN collection_name := 'Task'; record_id := v_id; RETURN NEXT; RETURN; END IF;

    v_id := public.activity_jsonb_bigint(p_doc, 'quotationId');
    IF v_id IS NOT NULL THEN collection_name := 'Quotation'; record_id := v_id; RETURN NEXT; RETURN; END IF;

    v_id := public.activity_jsonb_bigint(p_doc, 'contractId');
    IF v_id IS NOT NULL THEN collection_name := 'Contract'; record_id := v_id; RETURN NEXT; RETURN; END IF;

    v_id := public.activity_jsonb_bigint(p_doc, 'caseId');
    IF v_id IS NOT NULL THEN collection_name := 'Project'; record_id := v_id; RETURN NEXT; RETURN; END IF;

    v_id := public.activity_jsonb_bigint(p_doc, 'projectInternalId');
    IF v_id IS NOT NULL THEN collection_name := 'Project Internal'; record_id := v_id; RETURN NEXT; RETURN; END IF;

    v_id := public.activity_jsonb_bigint(p_doc, 'customerId');
    IF v_id IS NOT NULL THEN collection_name := 'Customer'; record_id := v_id; RETURN NEXT; RETURN; END IF;

    -- Folder fallback: a file in a folder should inherit the folder's business context.
    v_folder_id := public.activity_jsonb_bigint(p_doc, 'folderId');
    IF v_folder_id IS NOT NULL THEN
        SELECT
            f."legalReferenceId" AS legal_reference_id,
            f."internalTemplateId" AS internal_template_id,
            f."taskId" AS task_id,
            f."projectId" AS project_id,
            f."quotationId" AS quotation_id,
            f."contractId" AS contract_id,
            f."projectInternalId" AS project_internal_id,
            f."customerId" AS customer_id
        INTO v_folder
        FROM folders f
        WHERE f.id = v_folder_id;

        IF FOUND THEN
            IF v_folder.legal_reference_id IS NOT NULL THEN collection_name := 'LegalReference'; record_id := v_folder.legal_reference_id; RETURN NEXT; RETURN; END IF;
            IF v_folder.internal_template_id IS NOT NULL THEN collection_name := 'InternalTemplate'; record_id := v_folder.internal_template_id; RETURN NEXT; RETURN; END IF;
            IF v_folder.task_id IS NOT NULL THEN collection_name := 'Task'; record_id := v_folder.task_id; RETURN NEXT; RETURN; END IF;
            IF v_folder.quotation_id IS NOT NULL THEN collection_name := 'Quotation'; record_id := v_folder.quotation_id; RETURN NEXT; RETURN; END IF;
            IF v_folder.contract_id IS NOT NULL THEN collection_name := 'Contract'; record_id := v_folder.contract_id; RETURN NEXT; RETURN; END IF;
            IF v_folder.project_id IS NOT NULL THEN collection_name := 'Project'; record_id := v_folder.project_id; RETURN NEXT; RETURN; END IF;
            IF v_folder.project_internal_id IS NOT NULL THEN collection_name := 'Project Internal'; record_id := v_folder.project_internal_id; RETURN NEXT; RETURN; END IF;
            IF v_folder.customer_id IS NOT NULL THEN collection_name := 'Customer'; record_id := v_folder.customer_id; RETURN NEXT; RETURN; END IF;
        END IF;
    END IF;

    -- Legacy fallback for older records/databases that still carry collectionName + recordId.
    v_id := public.activity_jsonb_bigint(p_doc, 'recordId');
    v_collection_name := NULLIF(p_doc ->> 'collectionName', '');
    IF v_collection_name IS NOT NULL AND v_id IS NOT NULL THEN
        collection_name := CASE
            WHEN v_collection_name IN ('tasks', 'Task') THEN 'Task'
            WHEN v_collection_name IN ('subTasks', 'SubTask') THEN 'SubTask'
            WHEN v_collection_name IN ('projects', 'Project', 'cases', 'Case') THEN 'Project'
            WHEN v_collection_name IN ('customers', 'Customer') THEN 'Customer'
            WHEN v_collection_name IN ('quotations', 'Quotation') THEN 'Quotation'
            WHEN v_collection_name IN ('contracts', 'Contract') THEN 'Contract'
            WHEN v_collection_name IN ('legalReference', 'LegalReference') THEN 'LegalReference'
            WHEN v_collection_name IN ('internalTemplates', 'InternalTemplate') THEN 'InternalTemplate'
            WHEN v_collection_name IN ('projectInternal', 'Project Internal') THEN 'Project Internal'
            ELSE initcap(v_collection_name)
        END;
        record_id := v_id;
        RETURN NEXT;
        RETURN;
    END IF;
END;
$BODY$;

ALTER FUNCTION public.resolve_document_activity_parent(jsonb) OWNER TO nocobase;

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
            SELECT p.collection_name, p.record_id
            INTO v_collection_name, v_temp_id
            FROM public.resolve_document_activity_parent(to_jsonb(NEW)) p
            LIMIT 1;
            IF v_collection_name IS NOT NULL AND v_temp_id IS NOT NULL THEN
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
                SELECT p.collection_name, p.record_id
                INTO v_collection_name, v_temp_id
                FROM public.resolve_document_activity_parent(to_jsonb(NEW)) p
                LIMIT 1;
                IF v_collection_name IS NOT NULL AND v_temp_id IS NOT NULL THEN
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
                SELECT p.collection_name, p.record_id
                INTO v_collection_name, v_temp_id
                FROM public.resolve_document_activity_parent(to_jsonb(NEW)) p
                LIMIT 1;
                IF v_collection_name IS NOT NULL AND v_temp_id IS NOT NULL THEN
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
                SELECT p.collection_name, p.record_id
                INTO v_collection_name, v_temp_id
                FROM public.resolve_document_activity_parent(to_jsonb(NEW)) p
                LIMIT 1;
                IF v_collection_name IS NOT NULL AND v_temp_id IS NOT NULL THEN
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
            AND column_name NOT IN (
                'folderId', 'isDeleted', 'updatedAt', 'updatedById', 'batchId',
                'fileIndex', 'folderIndex',
                'moduleScope', 'storageType',
                'originScope', 'originFolderId', 'legalStudyLinkedAt', 'legalStudySource',
                'sourceCollectionName', 'sourceTaskId', 'sourceSubTaskId',
                'sourceRecordId', 'sourceProjectId', 'sourceFolderId', 'sourceLegalReferenceId'
            )
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
