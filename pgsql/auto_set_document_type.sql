-- FUNCTION: public.auto_set_document_type()
--
-- Keeps documents.documentType compatible with the new direct relation fields.
-- The old trigger only reacted to collectionName; this version also handles
-- customerId/caseId/taskId/subTaskId/quotationId/contractId/legalReferenceId.

CREATE OR REPLACE FUNCTION public.auto_set_document_type()
    RETURNS trigger
    LANGUAGE 'plpgsql'
AS $BODY$
DECLARE
    v_doc jsonb;
    v_collection_name text;
BEGIN
    v_doc := to_jsonb(NEW);
    v_collection_name := COALESCE(v_doc ->> 'collectionName', '');

    IF COALESCE(v_doc ->> 'documentType', '') = '' THEN
        NEW."documentType" := CASE
            WHEN v_doc ->> 'legalReferenceId' IS NOT NULL THEN 'legal_reference_doc'
            WHEN v_doc ->> 'internalTemplateId' IS NOT NULL THEN 'internal_template_file'
            WHEN v_doc ->> 'subTaskId' IS NOT NULL THEN 'subtask_doc'
            WHEN v_doc ->> 'taskId' IS NOT NULL THEN 'task_doc'
            WHEN v_doc ->> 'quotationId' IS NOT NULL THEN 'quote_pdf'
            WHEN v_doc ->> 'contractId' IS NOT NULL THEN 'contract_doc'
            WHEN v_doc ->> 'caseId' IS NOT NULL THEN 'project_doc'
            WHEN v_doc ->> 'projectInternalId' IS NOT NULL THEN 'project_internal_doc'
            WHEN v_doc ->> 'customerId' IS NOT NULL THEN 'customer_doc'
            WHEN v_collection_name IN ('quotations', 'Quotation') THEN 'quote_pdf'
            WHEN v_collection_name IN ('contracts', 'Contract') THEN 'contract_doc'
            WHEN v_collection_name IN ('payments', 'Payment') THEN 'receipt'
            WHEN v_collection_name IN ('projects', 'Project', 'cases', 'Case') THEN 'project_doc'
            WHEN v_collection_name IN ('tasks', 'Task') THEN 'task_doc'
            WHEN v_collection_name IN ('subTasks', 'SubTask') THEN 'subtask_doc'
            WHEN v_collection_name IN ('legalReference', 'LegalReference') THEN 'legal_reference_doc'
            WHEN v_collection_name IN ('internalTemplates', 'InternalTemplate') THEN 'internal_template_file'
            WHEN v_collection_name IN ('projectInternal', 'Project Internal') THEN 'project_internal_doc'
            WHEN v_collection_name IN ('customers', 'Customer') THEN 'customer_doc'
            ELSE NEW."documentType"
        END;
    END IF;

    RETURN NEW;
END;
$BODY$;

ALTER FUNCTION public.auto_set_document_type()
    OWNER TO nocobase;

DROP TRIGGER IF EXISTS trg_set_document_type ON documents;
CREATE TRIGGER trg_set_document_type
BEFORE INSERT OR UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION public.auto_set_document_type();
