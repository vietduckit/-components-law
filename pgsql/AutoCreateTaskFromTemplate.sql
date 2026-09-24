-- FUNCTION: public.auto_create_tasks_from_template()

-- DROP FUNCTION IF EXISTS public.auto_create_tasks_from_template();

CREATE OR REPLACE FUNCTION public.auto_create_tasks_from_template()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF
AS $BODY$
DECLARE
    tmpl             RECORD;
    new_task_id      BIGINT;
    new_doc_id       BIGINT;
    proj             RECORD;
    v_due_date       TIMESTAMP WITH TIME ZONE;
    v_attachment     RECORD;
    v_root_folder_id BIGINT;
BEGIN
    -- INSERT: luôn tạo task từ template
    -- UPDATE: chỉ chạy khi status có sự thay đổi (tránh tạo task trùng khi edit các field khác)
    IF TG_OP = 'UPDATE' AND COALESCE(OLD.status, '') = COALESCE(NEW.status, '') THEN
        RETURN NEW;
    END IF;

    -- Lấy thông tin project
    SELECT "createdById", "updatedById", "customerId"
    INTO proj
    FROM projects
    WHERE id = NEW."projectId";

    -- Folder gốc của case — dùng để gắn file mẫu đúng vào cây tài liệu của
    -- case (qua folderId), thay vì gắn thẳng caseId khiến Document library
    -- coi file này là ngang hàng với root của case (xem comment
    -- buildTaskUploadDocumentLink trong TaskDetailView.js).
    SELECT id
    INTO v_root_folder_id
    FROM folders
    WHERE "projectId" = NEW."projectId" AND "parentId" IS NULL
    LIMIT 1;

    FOR tmpl IN
        SELECT pt.*
        FROM "projectTemplates" pt
        WHERE pt."serviceId" = NEW."serviceId"
        ORDER BY pt."sortOrder" ASC NULLS LAST
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM tasks
            WHERE "projectId" = NEW."projectId"
              AND "serviceId" = NEW."serviceId"
              AND title       = tmpl."templateName"
        ) THEN
            -- ------------------------------------------------
            -- Tính dueDate dựa theo quantity + duration
            -- ------------------------------------------------
            v_due_date := NULL;
            IF tmpl.quantity IS NOT NULL AND tmpl.quantity > 0 THEN
                CASE LOWER(TRIM(COALESCE(tmpl.duration, 'hours')))
                    WHEN 'hours' THEN
                        v_due_date := timezone('Asia/Ho_Chi_Minh', now()) + (tmpl.quantity || ' hours')::INTERVAL;
                    WHEN 'days'  THEN
                        v_due_date := timezone('Asia/Ho_Chi_Minh', now()) + (tmpl.quantity || ' days')::INTERVAL;
                    ELSE
                        v_due_date := timezone('Asia/Ho_Chi_Minh', now()) + (tmpl.quantity || ' hours')::INTERVAL;
                END CASE;
            END IF;

            -- ------------------------------------------------
            -- Tạo task ID (snowflake-style)
            -- ------------------------------------------------
            new_task_id := (
                EXTRACT(EPOCH FROM clock_timestamp()) * 1000
            )::BIGINT * 1000 + (random() * 999)::INT;

            -- ------------------------------------------------
            -- Insert task
            -- ------------------------------------------------
            -- "projectServiceId" = NEW.id (this trigger fires on
            -- projectServices — NEW."serviceId"/NEW."projectId" above are
            -- read straight off that same row) — was missing entirely
            -- before this edit, meaning by_service_task_group_done_creates_
            -- payment_request (pgsql/unified_contract_payment_schedule.sql)
            -- could never fire for any auto-created task, since its guard
            -- requires tasks."projectServiceId" IS NOT NULL. "isPaymentTrigger"
            -- seeds from the task template's own default (added to
            -- projectTemplates so a lawyer can mark "this template is
            -- normally a payment trigger" once, instead of re-ticking it on
            -- every case's task by hand) — see
            -- docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md.
            INSERT INTO tasks (
                id, title, description, priority, status,
                "serviceId", "projectId", "projectServiceId", "isPaymentTrigger",
                "createdById", "updatedById",
                "createdAt", "updatedAt",
                "startDate", "estimatedDuration", "dueDate"
            )
            VALUES (
                new_task_id,
                tmpl."templateName",
                tmpl.description,
                tmpl.priority,
                'toDo',
                NEW."serviceId",
                NEW."projectId",
                NEW.id,
                COALESCE(tmpl."isPaymentTrigger", false),
                proj."createdById",
                proj."updatedById",
                timezone('Asia/Ho_Chi_Minh', now()), timezone('Asia/Ho_Chi_Minh', now()), timezone('Asia/Ho_Chi_Minh', now()),
                tmpl.quantity,
                v_due_date
            );

            -- ================================================
            -- DUPLICATE FILE MẪU từ projectTemplates.fileAttachment
            --
            -- Cấu trúc (field belongsToMany "fileAttachment" trên
            -- projectTemplates — field thực sự lưu file mẫu, quản lý bởi
            -- UI "File:" trên form Task Template):
            --   projectTemplates.id
            --       → t_688a4j68kaz (junction table)
            --         f_fpo4hw1cvbm = projectTemplates.id (sourceKey)
            --         f_78rm80jeu4h = attachments.id       (targetKey)
            --       → attachments
            --
            -- LƯU Ý: KHÔNG dùng field "templateFileId" — đây là field cũ,
            -- không còn được UI dùng để lưu file mẫu (giá trị cố định,
            -- không phản ánh file thực tế đang gắn trên Task Template).
            -- ================================================

            -- Lấy attachment mới nhất gắn với Task Template qua fileAttachment
            SELECT a.*
            INTO v_attachment
            FROM t_688a4j68kaz j
            JOIN attachments a ON a.id = j.f_78rm80jeu4h
            WHERE j.f_fpo4hw1cvbm = tmpl.id
            ORDER BY a."createdAt" DESC
            LIMIT 1;

            IF FOUND THEN

                -- KHÔNG tạo attachment record mới ở đây.
                -- Nocobase resolve file vật lý dựa theo filename (không
                -- dùng id) — nhiều document có thể trỏ chung 1 attachment
                -- vật lý, cùng pattern với cloneLibraryFile() trong
                -- TaskDetailView.js.

                -- Tạo document record gắn vào task
                new_doc_id := (
                    EXTRACT(EPOCH FROM clock_timestamp()) * 1000
                )::BIGINT * 1000 + (random() * 999)::INT;

                INSERT INTO documents (
                    id,
                    title,
                    "documentType",
                    "taskId",
                    "collectionName",
                    "sourceCollectionName",
                    "sourceTaskId",
                    "recordId",
                    "sourceRecordId",
                    "folderId",
                    "customerId",
                    "moduleScope",
                    "storageType",
                    "sourceProjectTemplateId",
                    "variableConfigMode",
                    "createdById",
                    "updatedById",
                    "createdAt",
                    "updatedAt"
                )
                VALUES (
                    new_doc_id,
                    v_attachment.title,
                    'File mẫu',
                    new_task_id,
                    'Task',
                    'Task',
                    new_task_id,
                    new_task_id,
                    new_task_id,
                    v_root_folder_id,
                    proj."customerId",
                    'case_document',
                    'tasks',
                    tmpl.id,
                    'inherited',
                    proj."createdById",
                    proj."updatedById",
                    timezone('Asia/Ho_Chi_Minh', now()) + INTERVAL '2 hours',
                    timezone('Asia/Ho_Chi_Minh', now()) + INTERVAL '2 hours'
                );

                -- Link document <-> attachment gốc qua junction table
                -- t_0scpzpnn80i: f_59h52fqfdtb = document.id
                --                f_mkp5fpxvxdb = attachment.id
                INSERT INTO t_0scpzpnn80i (
                    "createdAt",
                    "updatedAt",
                    f_59h52fqfdtb,
                    f_mkp5fpxvxdb
                )
                VALUES (
                    timezone('Asia/Ho_Chi_Minh', now()) + INTERVAL '2 hours',
                    timezone('Asia/Ho_Chi_Minh', now()) + INTERVAL '2 hours',
                    new_doc_id,
                    v_attachment.id
                );

            END IF;
            -- ================================================

        END IF;
    END LOOP;
    RETURN NEW;
END;
$BODY$;

ALTER FUNCTION public.auto_create_tasks_from_template()
    OWNER TO nocobase;
