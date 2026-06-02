-- FUNCTION: public.auto_create_tasks_from_template()

-- DROP FUNCTION IF EXISTS public.auto_create_tasks_from_template();

CREATE OR REPLACE FUNCTION public.auto_create_tasks_from_template()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF
AS $BODY$
DECLARE
    tmpl           RECORD;
    new_task_id    BIGINT;
    new_doc_id     BIGINT;
    new_attach_id  BIGINT;
    proj           RECORD;
    v_due_date     TIMESTAMP WITH TIME ZONE;
    v_attachment   RECORD;
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
            INSERT INTO tasks (
                id, title, description, priority, status,
                "serviceId", "projectId",
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
                proj."createdById",
                proj."updatedById",
                timezone('Asia/Ho_Chi_Minh', now()), timezone('Asia/Ho_Chi_Minh', now()), timezone('Asia/Ho_Chi_Minh', now()),
                tmpl.quantity,
                v_due_date
            );

            -- ================================================
            -- DUPLICATE FILE MẪU từ templateFile
            --
            -- Cấu trúc:
            --   projectTemplates.templateFileId
            --       → t_10fx1ociynz (junction table)
            --         f_qygfed3jkrn = templateFile.id  (sourceKey)
            --         f_hxut6c1l6sn = attachments.id   (targetKey)
            --       → attachments
            -- ================================================
            IF tmpl."templateFileId" IS NOT NULL THEN

                -- Lấy attachment mới nhất từ templateFile
                SELECT a.*
                INTO v_attachment
                FROM t_10fx1ociynz j
                JOIN attachments a ON a.id = j.f_hxut6c1l6sn
                WHERE j.f_qygfed3jkrn = tmpl."templateFileId"
                ORDER BY a."createdAt" DESC
                LIMIT 1;

                IF FOUND THEN

                    -- Tạo attachment record mới
                    -- (copy metadata, dùng chung file vật lý)
                    new_attach_id := (
                        EXTRACT(EPOCH FROM clock_timestamp()) * 1000
                    )::BIGINT * 1000 + (random() * 999)::INT;

                    INSERT INTO attachments (
                        id, title, filename, extname, size,
                        mimetype, path, url, meta,
                        "storageId", "createdById", "updatedById",
                        "createdAt", "updatedAt"
                    )
                    VALUES (
                        new_attach_id,
                        v_attachment.title,
                        v_attachment.filename,
                        v_attachment.extname,
                        v_attachment.size,
                        v_attachment.mimetype,
                        v_attachment.path,
                        v_attachment.url,
                        v_attachment.meta,
                        v_attachment."storageId",
                        proj."createdById",
                        proj."updatedById",
                        timezone('Asia/Ho_Chi_Minh', now()) + INTERVAL '2 hours',
                        timezone('Asia/Ho_Chi_Minh', now()) + INTERVAL '2 hours'
                    );

                    -- Tạo document record gắn vào task
                    new_doc_id := (
                        EXTRACT(EPOCH FROM clock_timestamp()) * 1000
                    )::BIGINT * 1000 + (random() * 999)::INT;

                    INSERT INTO documents (
                        id,
                        title,
                        "documentType",
                        "taskId",
                        "caseId",
                        "customerId",
                        "moduleScope",
                        "storageType",
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
                        NEW."projectId",
                        proj."customerId",
                        'case_document',
                        'tasks',
                        proj."createdById",
                        proj."updatedById",
                        timezone('Asia/Ho_Chi_Minh', now()) + INTERVAL '2 hours',
                        timezone('Asia/Ho_Chi_Minh', now()) + INTERVAL '2 hours'
                    );

                    -- Link document <-> attachment qua junction table
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
                        new_attach_id
                    );

                END IF;
            END IF;
            -- ================================================

        END IF;
    END LOOP;
    RETURN NEW;
END;
$BODY$;

ALTER FUNCTION public.auto_create_tasks_from_template()
    OWNER TO nocobase;
