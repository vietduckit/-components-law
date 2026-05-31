-- FUNCTION: public.activity_skip_columns()

-- DROP FUNCTION IF EXISTS public.activity_skip_columns();

CREATE OR REPLACE FUNCTION public.activity_skip_columns(
	)
    RETURNS text[]
    LANGUAGE 'sql'
    COST 100
    IMMUTABLE PARALLEL UNSAFE
AS $BODY$
    SELECT ARRAY[
        'id', 'createdAt', 'updatedAt',
        'createdById', 'updatedById',
        'fileAttachment',
        'batchId',          -- FIX: tránh log thừa khi batchId thay đổi
        'isDeleted',        -- FIX: soft delete đã được handle riêng trong trigger, không log qua loop
        'collectionName',   -- FIX: đã bị CONTINUE trong loop nhưng skip ở đây rõ ràng hơn
        'recordId'          -- FIX: tương tự collectionName
    ]::TEXT[];
$BODY$;

ALTER FUNCTION public.activity_skip_columns()
    OWNER TO nocobase;

