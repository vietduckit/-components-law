-- FUNCTION: public.resolve_display_value(text, text, text)

-- DROP FUNCTION IF EXISTS public.resolve_display_value(text, text, text);

CREATE OR REPLACE FUNCTION public.resolve_display_value(
	p_col_name text,
	p_val text,
	p_table_name text DEFAULT NULL::text)
    RETURNS text
    LANGUAGE 'plpgsql'
    COST 100
    STABLE PARALLEL UNSAFE
AS $BODY$
DECLARE
    result TEXT;
BEGIN
    IF p_val IS NULL THEN RETURN NULL; END IF;

    IF p_col_name = 'userId' THEN
        SELECT COALESCE(nickname, username) INTO result
        FROM users WHERE id = p_val::BIGINT;
        RETURN COALESCE(result, 'User #' || p_val);
    END IF;

    -- ── Lawyer / người duyệt ─────────────────────────────────
    IF p_col_name IN (
        'lawyerId', 'approvedById', 'createdById', 'updatedById',
        'projectManagerId', 'assignedLawyerId'  -- ← FIX: thêm assignedLawyerId
    ) THEN
        SELECT "lawyerName" INTO result
        FROM lawyers WHERE id = p_val::BIGINT;
        IF result IS NULL THEN
            SELECT COALESCE(nickname, username) INTO result
            FROM users WHERE id = p_val::BIGINT;
        END IF;
        RETURN COALESCE(result, 'User #' || p_val);
    END IF;

    -- ── Status ───────────────────────────────────────────────
    IF p_col_name = 'status' THEN
        RETURN CASE p_val
            WHEN 'toDo'       THEN 'Chưa thực hiện'
            WHEN 'inProgress' THEN 'Đang xử lý'
            WHEN 'pending'    THEN 'Chờ phê duyệt'
            WHEN 'approval'   THEN 'Đã phê duyệt'
            WHEN 'done'       THEN 'Hoàn thành'
            WHEN 'cancelled'  THEN 'Đã huỷ'
            WHEN 'draft'      THEN 'Nháp'
            WHEN 'sent'       THEN 'Đã gửi'
            WHEN 'accepted'   THEN 'Đã chấp nhận'
            WHEN 'rejected'   THEN 'Từ chối'
            ELSE p_val
        END;
    END IF;

    -- ── Priority ─────────────────────────────────────────────
    IF p_col_name = 'priority' THEN
        RETURN CASE p_val
            WHEN 'high'   THEN 'Cao'
            WHEN 'medium' THEN 'Trung bình'
            WHEN 'low'    THEN 'Thấp'
            ELSE p_val
        END;
    END IF;

    -- ── Datetime ─────────────────────────────────────────────
    IF p_col_name IN (
        'approvedAt', 'acceptedAt', 'closedDate',
        'startDate', 'dueDate', 'deadline', 'date',
        'signedAt', 'effectiveAt', 'openingDate', 'workingDay'
    ) THEN
        BEGIN
            RETURN to_char(
                p_val::TIMESTAMPTZ AT TIME ZONE 'Asia/Ho_Chi_Minh',
                'DD/MM/YYYY HH24:MI'
            );
        EXCEPTION WHEN others THEN
            RETURN p_val;
        END;
    END IF;

    -- ── previousTaskId ───────────────────────────────────────
    IF p_col_name = 'previousTaskId' AND p_val IS NOT NULL THEN
        BEGIN
            SELECT title INTO result FROM tasks WHERE id = p_val::BIGINT;
            RETURN COALESCE(result, 'Task #' || p_val);
        EXCEPTION WHEN others THEN
            RETURN 'Task #' || p_val;
        END;
    END IF;

    -- ── Folder ───────────────────────────────────────────────
    IF p_col_name = 'folderId' AND p_val IS NOT NULL THEN
        BEGIN
            SELECT "name" INTO result FROM folders WHERE id = p_val::BIGINT;
            RETURN COALESCE(result, 'Folder #' || p_val);
        EXCEPTION WHEN others THEN
            RETURN 'Folder #' || p_val;
        END;
    END IF;

    -- ── Boolean ──────────────────────────────────────────────
    -- Direct relation fields on documents/folders
    IF p_col_name = 'customerId' AND p_val IS NOT NULL THEN
        BEGIN
            SELECT "customerName" INTO result FROM customers WHERE id = p_val::BIGINT;
            RETURN COALESCE(result, 'Customer #' || p_val);
        EXCEPTION WHEN others THEN
            RETURN 'Customer #' || p_val;
        END;
    END IF;

    IF p_col_name IN ('caseId', 'projectId', 'sourceProjectId') AND p_val IS NOT NULL THEN
        BEGIN
            SELECT COALESCE("projectName", "caseCode") INTO result FROM projects WHERE id = p_val::BIGINT;
            RETURN COALESCE(result, 'Case #' || p_val);
        EXCEPTION WHEN others THEN
            RETURN 'Case #' || p_val;
        END;
    END IF;

    IF p_col_name IN ('taskId', 'sourceTaskId') AND p_val IS NOT NULL THEN
        BEGIN
            SELECT title INTO result FROM tasks WHERE id = p_val::BIGINT;
            RETURN COALESCE(result, 'Task #' || p_val);
        EXCEPTION WHEN others THEN
            RETURN 'Task #' || p_val;
        END;
    END IF;

    IF p_col_name = 'subTaskId' AND p_val IS NOT NULL THEN
        BEGIN
            SELECT "subTaskName" INTO result FROM "subTasks" WHERE id = p_val::BIGINT;
            RETURN COALESCE(result, 'SubTask #' || p_val);
        EXCEPTION WHEN others THEN
            RETURN 'SubTask #' || p_val;
        END;
    END IF;

    IF p_col_name = 'quotationId' AND p_val IS NOT NULL THEN
        BEGIN
            SELECT "quotationNumber" INTO result FROM quotations WHERE id = p_val::BIGINT;
            RETURN COALESCE(result, 'Quotation #' || p_val);
        EXCEPTION WHEN others THEN
            RETURN 'Quotation #' || p_val;
        END;
    END IF;

    IF p_col_name = 'contractId' AND p_val IS NOT NULL THEN
        BEGIN
            SELECT COALESCE("contractCode", "contractName") INTO result FROM contracts WHERE id = p_val::BIGINT;
            RETURN COALESCE(result, 'Contract #' || p_val);
        EXCEPTION WHEN others THEN
            RETURN 'Contract #' || p_val;
        END;
    END IF;

    IF p_col_name = 'legalReferenceId' AND p_val IS NOT NULL THEN
        BEGIN
            SELECT COALESCE(title, "referenceCode") INTO result FROM "legalReference" WHERE id = p_val::BIGINT;
            RETURN COALESCE(result, 'LegalReference #' || p_val);
        EXCEPTION WHEN others THEN
            RETURN 'LegalReference #' || p_val;
        END;
    END IF;

    IF p_col_name = 'internalTemplateId' AND p_val IS NOT NULL THEN
        BEGIN
            SELECT COALESCE(title, "templateCode") INTO result FROM "internalTemplates" WHERE id = p_val::BIGINT;
            RETURN COALESCE(result, 'InternalTemplate #' || p_val);
        EXCEPTION WHEN others THEN
            RETURN 'InternalTemplate #' || p_val;
        END;
    END IF;

    IF p_col_name = 'projectInternalId' AND p_val IS NOT NULL THEN
        BEGIN
            SELECT "projectName" INTO result FROM "projectInternal" WHERE id = p_val::BIGINT;
            RETURN COALESCE(result, 'Project Internal #' || p_val);
        EXCEPTION WHEN others THEN
            RETURN 'Project Internal #' || p_val;
        END;
    END IF;

    IF p_col_name = 'internalCompanyId' AND p_val IS NOT NULL THEN
        BEGIN
            SELECT COALESCE("shortName", name, "legalName") INTO result FROM "internalCompany" WHERE id = p_val::BIGINT;
            RETURN COALESCE(result, 'Internal Company #' || p_val);
        EXCEPTION WHEN others THEN
            RETURN 'Internal Company #' || p_val;
        END;
    END IF;

    IF p_col_name IN ('isRequiredApproval', 'billable') THEN
        RETURN CASE p_val
            WHEN 'true'  THEN 'Có'
            WHEN 'false' THEN 'Không'
            ELSE p_val
        END;
    END IF;

    -- ── Default ──────────────────────────────────────────────
    RETURN p_val;
END;
$BODY$;

ALTER FUNCTION public.resolve_display_value(text, text, text)
    OWNER TO nocobase;

