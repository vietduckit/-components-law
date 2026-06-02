-- FUNCTION: public.resolve_relation_label(text, bigint)

-- DROP FUNCTION IF EXISTS public.resolve_relation_label(text, bigint);

CREATE OR REPLACE FUNCTION public.resolve_relation_label(
	p_collection text,
	p_record_id bigint)
    RETURNS text
    LANGUAGE 'plpgsql'
    COST 100
    STABLE PARALLEL UNSAFE
AS $BODY$
DECLARE
    v_label TEXT;
    v_collection_key TEXT;
BEGIN
    v_collection_key := lower(regexp_replace(COALESCE(p_collection, ''), '[^a-zA-Z0-9]+', '', 'g'));

    CASE v_collection_key
        WHEN 'project'   THEN SELECT COALESCE("projectName", "caseCode", 'Case #' || p_record_id::TEXT)  INTO v_label FROM projects   WHERE id = p_record_id;
        WHEN 'projects'  THEN SELECT COALESCE("projectName", "caseCode", 'Case #' || p_record_id::TEXT)  INTO v_label FROM projects   WHERE id = p_record_id;
        WHEN 'case'      THEN SELECT COALESCE("projectName", "caseCode", 'Case #' || p_record_id::TEXT)  INTO v_label FROM projects   WHERE id = p_record_id;
        WHEN 'cases'     THEN SELECT COALESCE("projectName", "caseCode", 'Case #' || p_record_id::TEXT)  INTO v_label FROM projects   WHERE id = p_record_id;
        WHEN 'task'      THEN SELECT COALESCE(title,          'Task #' || p_record_id::TEXT)  INTO v_label FROM tasks      WHERE id = p_record_id;
        WHEN 'tasks'     THEN SELECT COALESCE(title,          'Task #' || p_record_id::TEXT)  INTO v_label FROM tasks      WHERE id = p_record_id;
        WHEN 'subtask'   THEN SELECT COALESCE("subTaskName",  'SubTask #' || p_record_id::TEXT) INTO v_label FROM "subTasks" WHERE id = p_record_id;
        WHEN 'subtasks'  THEN SELECT COALESCE("subTaskName",  'SubTask #' || p_record_id::TEXT) INTO v_label FROM "subTasks" WHERE id = p_record_id;
        WHEN 'customer'  THEN SELECT COALESCE("customerName", 'KH #' || p_record_id::TEXT)   INTO v_label FROM customers  WHERE id = p_record_id;
        WHEN 'customers' THEN SELECT COALESCE("customerName", 'KH #' || p_record_id::TEXT)   INTO v_label FROM customers  WHERE id = p_record_id;
        WHEN 'quotation' THEN SELECT COALESCE("quotationNumber", 'BG #' || p_record_id::TEXT) INTO v_label FROM quotations WHERE id = p_record_id;
        WHEN 'quotations' THEN SELECT COALESCE("quotationNumber", 'BG #' || p_record_id::TEXT) INTO v_label FROM quotations WHERE id = p_record_id;
        WHEN 'contract'  THEN SELECT COALESCE("contractCode", "contractName", 'HD #' || p_record_id::TEXT)   INTO v_label FROM contracts  WHERE id = p_record_id;
        WHEN 'contracts' THEN SELECT COALESCE("contractCode", "contractName", 'HD #' || p_record_id::TEXT)   INTO v_label FROM contracts  WHERE id = p_record_id;
        WHEN 'legalreference' THEN SELECT COALESCE(title, "referenceCode", 'LegalReference #' || p_record_id::TEXT) INTO v_label FROM "legalReference" WHERE id = p_record_id;
        WHEN 'internaltemplate' THEN SELECT COALESCE(title, "templateCode", 'InternalTemplate #' || p_record_id::TEXT) INTO v_label FROM "internalTemplates" WHERE id = p_record_id;
        WHEN 'internaltemplates' THEN SELECT COALESCE(title, "templateCode", 'InternalTemplate #' || p_record_id::TEXT) INTO v_label FROM "internalTemplates" WHERE id = p_record_id;
        WHEN 'projectinternal' THEN SELECT COALESCE("projectName", 'Project Internal #' || p_record_id::TEXT) INTO v_label FROM "projectInternal" WHERE id = p_record_id;
        WHEN 'lead'      THEN
            SELECT
                CASE
                    WHEN "leadType" = 'company' THEN
                        COALESCE(NULLIF("companyName", ''), NULLIF("corporateRepresentative", ''), 'Lead #' || p_record_id::TEXT)
                    ELSE
                        COALESCE(NULLIF("fullName", ''), 'Lead #' || p_record_id::TEXT)
                END
            INTO v_label FROM lead WHERE id = p_record_id;
        ELSE v_label := p_collection || ' #' || p_record_id::TEXT;
    END CASE;

    RETURN COALESCE(v_label, p_collection || ' #' || p_record_id::TEXT);
EXCEPTION WHEN others THEN
    RETURN p_collection || ' #' || p_record_id::TEXT;
END;
$BODY$;

ALTER FUNCTION public.resolve_relation_label(text, bigint)
    OWNER TO nocobase;

