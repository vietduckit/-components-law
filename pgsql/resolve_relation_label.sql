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
BEGIN
    CASE p_collection
        WHEN 'Project'   THEN SELECT COALESCE("projectName", 'Case #' || p_record_id::TEXT)  INTO v_label FROM projects   WHERE id = p_record_id;
        WHEN 'Task'      THEN SELECT COALESCE(title,          'Task #' || p_record_id::TEXT)  INTO v_label FROM tasks      WHERE id = p_record_id;
        WHEN 'SubTask'   THEN SELECT COALESCE("subTaskName",  'SubTask #' || p_record_id::TEXT) INTO v_label FROM "subTasks" WHERE id = p_record_id;
        WHEN 'Customer'  THEN SELECT COALESCE("customerName", 'KH #' || p_record_id::TEXT)   INTO v_label FROM customers  WHERE id = p_record_id;
        WHEN 'Quotation' THEN SELECT COALESCE("quotationNumber", 'BG #' || p_record_id::TEXT) INTO v_label FROM quotations WHERE id = p_record_id;
        WHEN 'Contract'  THEN SELECT COALESCE("contractCode", 'HĐ #' || p_record_id::TEXT)   INTO v_label FROM contracts  WHERE id = p_record_id;
        WHEN 'Lead'      THEN
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

