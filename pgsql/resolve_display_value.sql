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

