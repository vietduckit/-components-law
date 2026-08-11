CREATE OR REPLACE FUNCTION public.log_grouped_document_share_activity(
    p_collection_name TEXT,
    p_record_id BIGINT,
    p_action TEXT,
    p_field_name TEXT,
    p_shared_user TEXT,
    p_actor_name TEXT,
    p_is_child BOOLEAN,
    p_changed_at TIMESTAMP WITH TIME ZONE,
    p_batch_id TEXT,
    p_data_id BIGINT
)
    RETURNS void
    LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_existing_id BIGINT;
    v_existing_value TEXT;
    v_next_value TEXT;
    v_lock_key TEXT;
BEGIN
    IF p_shared_user IS NULL OR p_shared_user = '' THEN
        RETURN;
    END IF;

    v_lock_key := concat_ws(
        ':',
        'document_share_activity',
        p_collection_name,
        p_record_id,
        p_action,
        p_field_name,
        COALESCE(NULLIF(p_batch_id, ''), 'no_batch'),
        COALESCE(p_actor_name, ''),
        COALESCE(p_data_id::TEXT, '')
    );
    PERFORM pg_advisory_xact_lock(hashtext(v_lock_key)::BIGINT);

    SELECT id, "newValue"
    INTO v_existing_id, v_existing_value
    FROM public.activity_log
    WHERE "collectionName" = p_collection_name
      AND "recordId" = p_record_id
      AND action = p_action
      AND "fieldName" = p_field_name
      AND COALESCE("changedByName", '') = COALESCE(p_actor_name, '')
      AND COALESCE("dataId", 0) = COALESCE(p_data_id, 0)
      AND (
          (
              COALESCE(NULLIF(p_batch_id, ''), '') <> ''
              AND COALESCE("batchId", '') = p_batch_id
          )
          OR (
              COALESCE(NULLIF(p_batch_id, ''), '') = ''
              AND "changedAt" >= p_changed_at - INTERVAL '15 seconds'
              AND "changedAt" <= p_changed_at + INTERVAL '15 seconds'
          )
      )
    ORDER BY "changedAt" DESC
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        IF COALESCE(v_existing_value, '') = '' THEN
            v_next_value := p_shared_user;
        ELSIF p_shared_user = ANY(string_to_array(v_existing_value, '; ')) THEN
            v_next_value := v_existing_value;
        ELSE
            v_next_value := v_existing_value || '; ' || p_shared_user;
        END IF;

        UPDATE public.activity_log
        SET
            "newValue" = v_next_value,
            "oldValue" = CASE WHEN p_action = 'unshared_file' THEN v_next_value ELSE "oldValue" END,
            "changedAt" = p_changed_at,
            "batchId" = COALESCE("batchId", NULLIF(p_batch_id, ''))
        WHERE id = v_existing_id;

        RETURN;
    END IF;

    IF p_action = 'unshared_file' THEN
        PERFORM public.log_activity(p_collection_name, p_record_id, p_action, p_field_name, p_shared_user, p_shared_user, p_actor_name, p_is_child, p_changed_at, p_batch_id, p_data_id);
    ELSE
        PERFORM public.log_activity(p_collection_name, p_record_id, p_action, p_field_name, NULL, p_shared_user, p_actor_name, p_is_child, p_changed_at, p_batch_id, p_data_id);
    END IF;
END;
$BODY$;

CREATE OR REPLACE FUNCTION public.log_activity_document_shares()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_document_id     BIGINT;
    v_user_id         BIGINT;
    v_actor_id        BIGINT;
    v_actor_name      TEXT;
    v_shared_user     TEXT;
    v_changed_at      TIMESTAMP WITH TIME ZONE;
    v_batch_id        TEXT;
    v_collection_name TEXT;
    v_parent_id       BIGINT;
    v_document_row    documents%ROWTYPE;
BEGIN
    v_changed_at := timezone('Asia/Ho_Chi_Minh', now());

    IF TG_OP = 'INSERT' THEN
        v_document_id := NEW."documentId";
        v_user_id := NEW."userId";
        v_actor_id := COALESCE(NEW."updatedById", NEW."createdById");
        BEGIN
            v_batch_id := NEW."batchId"::TEXT;
        EXCEPTION WHEN others THEN
            v_batch_id := NULL;
        END;
    ELSIF TG_OP = 'DELETE' THEN
        v_document_id := OLD."documentId";
        v_user_id := OLD."userId";
        v_actor_id := COALESCE(OLD."updatedById", OLD."createdById");
        BEGIN
            v_batch_id := OLD."batchId"::TEXT;
        EXCEPTION WHEN others THEN
            v_batch_id := NULL;
        END;
    ELSE
        RETURN NULL;
    END IF;

    IF v_document_id IS NULL OR v_user_id IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    SELECT * INTO v_document_row
    FROM documents
    WHERE id = v_document_id;

    SELECT COALESCE(nickname, username) INTO v_actor_name
    FROM users
    WHERE id = v_actor_id;

    SELECT COALESCE(nickname, username) INTO v_shared_user
    FROM users
    WHERE id = v_user_id;
    v_shared_user := COALESCE(v_shared_user, 'User #' || v_user_id);

    PERFORM public.log_grouped_document_share_activity(
        'Document',
        v_document_id,
        CASE WHEN TG_OP = 'INSERT' THEN 'shared_file' ELSE 'unshared_file' END,
        'userId',
        v_shared_user,
        v_actor_name,
        false,
        v_changed_at,
        v_batch_id,
        NULL
    );

    BEGIN
        SELECT p.collection_name, p.record_id
        INTO v_collection_name, v_parent_id
        FROM public.resolve_document_activity_parent(to_jsonb(v_document_row)) p
        LIMIT 1;

        IF v_collection_name IS NOT NULL AND v_parent_id IS NOT NULL THEN
            PERFORM public.log_grouped_document_share_activity(
                v_collection_name,
                v_parent_id,
                CASE WHEN TG_OP = 'INSERT' THEN 'shared_file' ELSE 'unshared_file' END,
                'documents',
                v_shared_user,
                v_actor_name,
                true,
                v_changed_at,
                v_batch_id,
                v_document_id
            );
        END IF;
    EXCEPTION WHEN others THEN NULL;
    END;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$BODY$;

ALTER FUNCTION public.log_grouped_document_share_activity(TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMP WITH TIME ZONE, TEXT, BIGINT) OWNER TO nocobase;
ALTER FUNCTION public.log_activity_document_shares() OWNER TO nocobase;

DO $$
BEGIN
    IF to_regclass('public."documentShares"') IS NOT NULL THEN
        EXECUTE 'DROP TRIGGER IF EXISTS trg_log_activity_document_shares ON public."documentShares"';
        EXECUTE 'CREATE TRIGGER trg_log_activity_document_shares
            AFTER INSERT OR DELETE ON public."documentShares"
            FOR EACH ROW EXECUTE FUNCTION public.log_activity_document_shares()';
    END IF;
END $$;
