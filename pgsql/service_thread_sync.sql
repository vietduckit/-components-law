-- ============================================================
-- Service thread sync (2026-09-29)
-- Spec: docs/superpowers/specs/2026-09-29-service-thread-sync-design.md
-- Plan: docs/superpowers/plans/2026-09-29-service-thread-sync.md
--
-- The lines of one service — its quotation line, contract line(s) and case
-- line — share a serviceThreadId. A change to the service's content on any of
-- them is written to all the others in the same transaction and logged in
-- serviceChangeLogs; destroying one destroys the thread. A thread that
-- touches a billed contract is locked. Amounts are not copied: every line
-- computes its own (money_line_compute).
-- Requires pgsql/money_flow_foundation.sql and
-- pgsql/unified_contract_payment_schedule.sql. Idempotent.
-- ============================================================

-- ---- 1. Columns: the three line tables carry the same content
ALTER TABLE "quotationServices"
  ADD COLUMN IF NOT EXISTS "serviceThreadId" bigint,
  ADD COLUMN IF NOT EXISTS "serviceType" varchar(255),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS quantity double precision;
ALTER TABLE "contractServices"
  ADD COLUMN IF NOT EXISTS "serviceThreadId" bigint,
  ADD COLUMN IF NOT EXISTS "serviceType" varchar(255),
  ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE "projectServices"
  ADD COLUMN IF NOT EXISTS "serviceThreadId" bigint,
  ADD COLUMN IF NOT EXISTS "serviceType" varchar(255),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS quantity double precision;
CREATE INDEX IF NOT EXISTS "quotationServices_serviceThreadId" ON "quotationServices" ("serviceThreadId");
CREATE INDEX IF NOT EXISTS "contractServices_serviceThreadId" ON "contractServices" ("serviceThreadId");
CREATE INDEX IF NOT EXISTS "projectServices_serviceThreadId" ON "projectServices" ("serviceThreadId");
-- one contract line per case line (dev data is 1:1; it keeps a thread unambiguous).
-- The column is listed twice on purpose: NocoBase's collection sync drops every
-- single-column unique index it does not know (see ux_payment_requests_* in
-- pgsql/finance_foundation.sql); ("x", "x") counts as two columns and is kept.
-- Dropped and created again so an older single-column copy is replaced.
DROP INDEX IF EXISTS "contractServices_projectServiceId_unique";
CREATE UNIQUE INDEX "contractServices_projectServiceId_unique"
  ON "contractServices" ("projectServiceId", "projectServiceId") WHERE "projectServiceId" IS NOT NULL;

-- ---- 2. History (registered as a NocoBase collection by JsField/RegisterServiceThreadFields.js)
CREATE SEQUENCE IF NOT EXISTS "serviceChangeLogs_id_seq";
CREATE TABLE IF NOT EXISTS "serviceChangeLogs" (
  id bigint PRIMARY KEY,
  "createdAt" timestamptz, "updatedAt" timestamptz, "createdById" bigint,
  "serviceThreadId" bigint, action varchar(255), "tableName" varchar(255), "recordId" bigint,
  "documentType" varchar(255), "documentId" bigint, "fieldName" varchar(255),
  "oldValue" text, "newValue" text, "originLogId" bigint
);
-- also when NocoBase created the table first (its ids come from the app)
ALTER TABLE "serviceChangeLogs" ALTER COLUMN id SET DEFAULT nextval('"serviceChangeLogs_id_seq"');
ALTER TABLE "serviceChangeLogs" ALTER COLUMN "createdAt" SET DEFAULT now();
ALTER TABLE "serviceChangeLogs" ALTER COLUMN "updatedAt" SET DEFAULT now();
CREATE INDEX IF NOT EXISTS "serviceChangeLogs_thread" ON "serviceChangeLogs" ("serviceThreadId");
CREATE INDEX IF NOT EXISTS "serviceChangeLogs_document" ON "serviceChangeLogs" ("documentType", "documentId");

-- ---- 3. Content
CREATE OR REPLACE FUNCTION public.money_thread_is_package(p_row jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $f$
  SELECT lower(COALESCE(p_row->>'pricingMode', '')) = 'package';
$f$;

-- The column of a content field in a line table (contractServices spells
-- the catalog service "ServiceId").
CREATE OR REPLACE FUNCTION public.money_thread_column(p_table text, p_field text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $f$
  SELECT CASE WHEN p_field = 'serviceId' AND p_table = 'contractServices' THEN 'ServiceId' ELSE p_field END;
$f$;

-- Text compared without the spaces, tabs and line breaks at its ends; empty = NULL.
CREATE OR REPLACE FUNCTION public.money_thread_text(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $f$
  SELECT NULLIF(btrim(p_text, ' ' || chr(9) || chr(10) || chr(13)), '');
$f$;

-- A line's content, normalized so that re-saving the same values is no change
-- (text trimmed of spaces, tabs and line breaks at both ends).
CREATE OR REPLACE FUNCTION public.money_thread_content(p_table text, p_row jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $f$
  SELECT jsonb_build_object(
    'serviceId', NULLIF(p_row->>money_thread_column(p_table, 'serviceId'), '')::bigint,
    'serviceName', money_thread_text(p_row->>'serviceName'),
    'serviceType', money_thread_text(p_row->>'serviceType'),
    'description', money_thread_text(p_row->>'description'),
    'basePrice', COALESCE(NULLIF(p_row->>'basePrice', '')::numeric, 0),
    'quantity', COALESCE(NULLIF(NULLIF(p_row->>'quantity', '')::numeric, 0), 1),
    'vat', COALESCE(NULLIF(p_row->>'vat', '')::numeric, 0),
    'currencyId', COALESCE(NULLIF(p_row->>'currencyId', '')::bigint, money_base_currency_id()),
    'comboId', NULLIF(p_row->>'comboId', '')::bigint,
    'comboName', money_thread_text(p_row->>'comboName'));
$f$;

-- The fields where line "to" differs from line "from" (old = to's, new =
-- from's). Price, quantity, VAT, currency and combo only count between lines
-- of the same pricing: a combo line's price is not a price.
CREATE OR REPLACE FUNCTION public.money_thread_diff(p_from_table text, p_from jsonb, p_to_table text, p_to jsonb)
RETURNS TABLE (field text, old_value text, new_value text)
LANGUAGE sql
STABLE
AS $f$
  SELECT k, c.b->>k, c.a->>k
  FROM (SELECT money_thread_content(p_from_table, p_from) AS a, money_thread_content(p_to_table, p_to) AS b) c,
       unnest(ARRAY['serviceId', 'serviceName', 'serviceType', 'description',
                    'basePrice', 'quantity', 'vat', 'currencyId', 'comboId', 'comboName']) AS k
  WHERE c.a->k IS DISTINCT FROM c.b->k
    AND (k IN ('serviceId', 'serviceName', 'serviceType', 'description')
         OR money_thread_is_package(p_from) = money_thread_is_package(p_to));
$f$;

-- ---- 4. The thread
CREATE OR REPLACE FUNCTION public.money_thread_table_order(p_table text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $f$
  SELECT CASE p_table WHEN 'quotationServices' THEN 1 WHEN 'contractServices' THEN 2 ELSE 3 END;
$f$;

CREATE OR REPLACE FUNCTION public.money_thread_lines(p_thread bigint)
RETURNS TABLE (table_name text, id bigint, j jsonb)
LANGUAGE sql
STABLE
AS $f$
  SELECT 'quotationServices'::text, l.id, to_jsonb(l) FROM "quotationServices" l WHERE l."serviceThreadId" = p_thread
  UNION ALL
  SELECT 'contractServices', l.id, to_jsonb(l) FROM "contractServices" l WHERE l."serviceThreadId" = p_thread
  UNION ALL
  SELECT 'projectServices', l.id, to_jsonb(l) FROM "projectServices" l WHERE l."serviceThreadId" = p_thread;
$f$;

-- The thread of the line a line links to: contract line -> its case line,
-- else its quotation line; case line -> its quotation line, else the
-- contract line that links it.
CREATE OR REPLACE FUNCTION public.money_thread_of_link(p_table text, p_row jsonb)
RETURNS bigint
LANGUAGE sql
STABLE
AS $f$
  SELECT CASE p_table
    WHEN 'contractServices' THEN COALESCE(
      (SELECT ps."serviceThreadId" FROM "projectServices" ps WHERE ps.id = NULLIF(p_row->>'projectServiceId', '')::bigint),
      (SELECT qs."serviceThreadId" FROM "quotationServices" qs WHERE qs.id = NULLIF(p_row->>'quotationServiceId', '')::bigint))
    WHEN 'projectServices' THEN COALESCE(
      (SELECT qs."serviceThreadId" FROM "quotationServices" qs WHERE qs.id = NULLIF(p_row->>'quotationServiceId', '')::bigint),
      (SELECT min(cs."serviceThreadId") FROM "contractServices" cs WHERE cs."projectServiceId" = NULLIF(p_row->>'id', '')::bigint))
  END;
$f$;

CREATE OR REPLACE FUNCTION public.money_thread_links_changed(p_table text, p_new jsonb, p_old jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $f$
  SELECT CASE p_table
    WHEN 'contractServices' THEN p_new->'projectServiceId' IS DISTINCT FROM p_old->'projectServiceId'
                              OR p_new->'quotationServiceId' IS DISTINCT FROM p_old->'quotationServiceId'
    WHEN 'projectServices' THEN p_new->'quotationServiceId' IS DISTINCT FROM p_old->'quotationServiceId'
    ELSE false
  END;
$f$;

-- The code of a billed contract the thread (plus one more contract) touches, or NULL.
CREATE OR REPLACE FUNCTION public.money_thread_billed_contract(p_thread bigint, p_extra_contract bigint DEFAULT NULL)
RETURNS text
LANGUAGE sql
STABLE
AS $f$
  SELECT COALESCE(NULLIF(c."contractCode", ''), NULLIF(c."contractName", ''), c.id::text)
  FROM contracts c
  WHERE c.id IN (SELECT money_line_contract_id(l.table_name, l.j) FROM money_thread_lines(p_thread) l
                 UNION SELECT p_extra_contract)
    AND money_contract_billing_locked(c.id)
  ORDER BY c.id
  LIMIT 1;
$f$;

CREATE OR REPLACE FUNCTION public.money_line_document(p_table text, p_row jsonb, OUT document_type text, OUT document_id bigint)
LANGUAGE sql
IMMUTABLE
AS $f$
  SELECT CASE p_table WHEN 'quotationServices' THEN 'quotation' WHEN 'contractServices' THEN 'contract' ELSE 'case' END,
         NULLIF(p_row->>CASE p_table WHEN 'quotationServices' THEN 'quotationId'
                                     WHEN 'contractServices' THEN 'contractId' ELSE 'projectId' END, '')::bigint;
$f$;

-- One history row; a currency is logged by its code.
CREATE OR REPLACE FUNCTION public.money_thread_log(
  p_action text, p_table text, p_row jsonb, p_field text, p_old text, p_new text, p_origin bigint, p_user bigint)
RETURNS bigint
LANGUAGE plpgsql
AS $f$
DECLARE
  d RECORD;
  v_id bigint;
BEGIN
  SELECT * INTO d FROM money_line_document(p_table, p_row);
  INSERT INTO "serviceChangeLogs" ("createdAt", "updatedAt", "createdById", "serviceThreadId", action,
    "tableName", "recordId", "documentType", "documentId", "fieldName", "oldValue", "newValue", "originLogId")
  VALUES (now(), now(), p_user, NULLIF(p_row->>'serviceThreadId', '')::bigint, p_action,
    p_table, NULLIF(p_row->>'id', '')::bigint, d.document_type, d.document_id, p_field,
    CASE WHEN p_field = 'currencyId' AND p_old IS NOT NULL THEN money_currency_code(p_old::bigint) ELSE p_old END,
    CASE WHEN p_field = 'currencyId' AND p_new IS NOT NULL THEN money_currency_code(p_new::bigint) ELSE p_new END,
    p_origin)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$f$;

-- ---- 5. Destroy: what may stop it, what goes with it
-- A task someone worked on: not "to do" any more, or with a timesheet, a
-- subtask, a meeting, or a file added after it was created (template files
-- come with the task).
CREATE OR REPLACE FUNCTION public.money_task_has_progress(p_task_id bigint, p_created timestamptz, p_status text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $f$
  SELECT lower(btrim(COALESCE(p_status, ''))) NOT IN ('', 'todo')
      OR EXISTS (SELECT 1 FROM timesheets t WHERE t."taskId" = p_task_id)
      OR EXISTS (SELECT 1 FROM "subTasks" s WHERE s."taskId" = p_task_id)
      OR EXISTS (SELECT 1 FROM meetings m WHERE m."taskId" = p_task_id)
      OR EXISTS (SELECT 1 FROM documents d WHERE d."taskId" = p_task_id
                   AND d."createdAt" > COALESCE(p_created, '-infinity'::timestamptz) + interval '1 minute');
$f$;

CREATE OR REPLACE FUNCTION public.money_line_task_ids(p_table text, p_id bigint)
RETURNS SETOF bigint
LANGUAGE sql
STABLE
AS $f$
  SELECT t.id FROM tasks t
  WHERE (p_table = 'projectServices' AND t."projectServiceId" = p_id)
     OR (p_table = 'contractServices' AND t."contractServiceId" = p_id)
     OR (p_table = 'quotationServices' AND t."quotationServiceId" = p_id);
$f$;

-- The title of a task with progress on the line or its thread, or NULL.
CREATE OR REPLACE FUNCTION public.money_thread_task_in_progress(p_table text, p_id bigint, p_thread bigint)
RETURNS text
LANGUAGE sql
STABLE
AS $f$
  SELECT COALESCE(NULLIF(t.title, ''), '#' || t.id) FROM tasks t
  WHERE t.id IN (SELECT money_line_task_ids(p_table, p_id)
                 UNION SELECT money_line_task_ids(l.table_name, l.id) FROM money_thread_lines(p_thread) l)
    AND money_task_has_progress(t.id, t."createdAt", t.status)
  ORDER BY t.id
  LIMIT 1;
$f$;

-- What hangs on a destroyed line: its untouched tasks (with their files and
-- folders), its pending requests (items, finance members, tags) and its
-- service tags on installments and requests.
CREATE OR REPLACE FUNCTION public.money_thread_delete_dependents(p_table text, p_id bigint)
RETURNS void
LANGUAGE plpgsql
AS $f$
DECLARE
  v_tasks bigint[] := ARRAY(SELECT money_line_task_ids(p_table, p_id));
  v_requests bigint[] := ARRAY(
    SELECT pr.id FROM "paymentRequests" pr
    WHERE lower(COALESCE(pr.status, '')) = 'pending'
      AND ((p_table = 'contractServices' AND pr."contractServiceId" = p_id)
        OR (p_table = 'projectServices' AND pr."projectServiceId" = p_id)));
BEGIN
  DELETE FROM documents WHERE "taskId" = ANY (v_tasks);
  DELETE FROM folders WHERE "taskId" = ANY (v_tasks);
  DELETE FROM tasks WHERE id = ANY (v_tasks);
  DELETE FROM "paymentRequestItems" WHERE "paymentRequestId" = ANY (v_requests);
  DELETE FROM "paymentRequestFinanceMembers" WHERE "paymentRequestId" = ANY (v_requests);
  DELETE FROM "paymentRequestServices" WHERE "paymentRequestId" = ANY (v_requests)
    OR (p_table = 'contractServices' AND "contractServiceId" = p_id);
  DELETE FROM "paymentRequests" WHERE id = ANY (v_requests);
  IF p_table = 'contractServices' THEN
    DELETE FROM "contractPaymentScheduleServices" WHERE "contractServiceId" = p_id;
  END IF;
END;
$f$;

-- ---- 6. Triggers
-- BEFORE INSERT / UPDATE / DELETE on the three line tables. Its name sorts
-- before trg_money_line_compute, so the inputs a new line takes from its
-- thread are priced.
CREATE OR REPLACE FUNCTION public.money_thread_before()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
DECLARE
  v_row jsonb;
  v_link bigint;
  v_src RECORD;
  v_patch jsonb := '{}';
  v_case bigint;
  v_billed text;
  v_task text;
  k text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF COALESCE(current_setting('money.thread_sync', true), '') <> 'on' THEN
      v_billed := money_thread_billed_contract(OLD."serviceThreadId", money_line_contract_id(TG_TABLE_NAME, to_jsonb(OLD)));
      IF v_billed IS NOT NULL THEN
        RAISE EXCEPTION 'Service "%" belongs to contract %, which has payments — it cannot be deleted.',
          COALESCE(OLD."serviceName", ''), v_billed;
      END IF;
      v_task := money_thread_task_in_progress(TG_TABLE_NAME, OLD.id, OLD."serviceThreadId");
      IF v_task IS NOT NULL THEN
        RAISE EXCEPTION 'Service "%" has tasks in progress (%) — finish or remove them first.',
          COALESCE(OLD."serviceName", ''), v_task;
      END IF;
    END IF;
    RETURN OLD;
  END IF;
  v_row := to_jsonb(NEW);
  v_link := money_thread_of_link(TG_TABLE_NAME, v_row);
  IF TG_OP = 'INSERT' THEN
    NEW."serviceThreadId" := COALESCE(NEW."serviceThreadId", v_link, NEW.id);
    -- a new line joining a thread takes the content it was created without
    SELECT l.table_name, l.j INTO v_src
    FROM money_thread_lines(NEW."serviceThreadId") l
    ORDER BY (money_thread_is_package(l.j) = money_thread_is_package(v_row)) DESC,
             CASE l.table_name WHEN 'contractServices' THEN 1 WHEN 'projectServices' THEN 2 ELSE 3 END, l.id
    LIMIT 1;
    IF FOUND THEN
      FOREACH k IN ARRAY ARRAY['serviceId', 'serviceName', 'serviceType', 'description',
                               'basePrice', 'quantity', 'vat', 'currencyId', 'comboId', 'comboName'] LOOP
        IF NULLIF(v_row->>money_thread_column(TG_TABLE_NAME, k), '') IS NULL
           AND NULLIF(v_src.j->>money_thread_column(v_src.table_name, k), '') IS NOT NULL
           AND (k IN ('serviceId', 'serviceName', 'serviceType', 'description')
                OR money_thread_is_package(v_src.j) = money_thread_is_package(v_row)) THEN
          v_patch := v_patch || jsonb_build_object(money_thread_column(TG_TABLE_NAME, k),
                                                   v_src.j->money_thread_column(v_src.table_name, k));
        END IF;
      END LOOP;
      IF v_patch <> '{}' THEN
        NEW := jsonb_populate_record(NEW, v_patch);
      END IF;
    END IF;
  ELSE
    NEW."serviceThreadId" := COALESCE(NEW."serviceThreadId", OLD."serviceThreadId", v_link, NEW.id);
    -- linked to a line of another thread: this line joins it (the AFTER
    -- trigger brings the rest of its old thread along)
    IF v_link IS NOT NULL AND money_thread_links_changed(TG_TABLE_NAME, v_row, to_jsonb(OLD)) THEN
      NEW."serviceThreadId" := v_link;
    END IF;
  END IF;
  -- a thread that touches a billed contract is locked: any content change
  -- (or a new line bringing different content, or a line changing thread)
  -- is refused; writes of the sync itself are not checked again
  IF COALESCE(current_setting('money.thread_sync', true), '') <> 'on' THEN
    v_row := to_jsonb(NEW);
    IF (TG_OP = 'UPDATE' AND (EXISTS (SELECT 1 FROM money_thread_diff(TG_TABLE_NAME, v_row, TG_TABLE_NAME, to_jsonb(OLD)))
                              OR (OLD."serviceThreadId" IS NOT NULL
                                  AND NEW."serviceThreadId" IS DISTINCT FROM OLD."serviceThreadId")))
       OR (TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM money_thread_lines(NEW."serviceThreadId") l,
                                         money_thread_diff(TG_TABLE_NAME, v_row, l.table_name, l.j) x)) THEN
      v_billed := COALESCE(
        money_thread_billed_contract(NEW."serviceThreadId", money_line_contract_id(TG_TABLE_NAME, v_row)),
        CASE WHEN TG_OP = 'UPDATE' THEN money_thread_billed_contract(OLD."serviceThreadId") END);
      IF v_billed IS NOT NULL THEN
        RAISE EXCEPTION 'Service "%" belongs to contract %, which has payments — it cannot be changed.',
          COALESCE(NEW."serviceName", ''), v_billed;
      END IF;
    END IF;
  END IF;
  -- a contract line's case is its case line's case
  IF TG_TABLE_NAME = 'contractServices' AND NULLIF(v_row->>'projectServiceId', '') IS NOT NULL THEN
    SELECT ps."projectId" INTO v_case FROM "projectServices" ps WHERE ps.id = (v_row->>'projectServiceId')::bigint;
    IF v_case IS NOT NULL THEN
      NEW := jsonb_populate_record(NEW, jsonb_build_object('projectId', v_case));
    END IF;
  END IF;
  RETURN NEW;
END;
$f$;

-- Writes a patch {column: value} to one line.
CREATE OR REPLACE FUNCTION public.money_thread_apply(p_table text, p_id bigint, p_patch jsonb)
RETURNS void
LANGUAGE plpgsql
AS $f$
BEGIN
  IF p_patch IS NULL OR p_patch = '{}' THEN
    RETURN;
  END IF;
  EXECUTE format('UPDATE %I t SET %s FROM jsonb_populate_record(NULL::%I, $1) p WHERE t.id = $2',
    p_table,
    (SELECT string_agg(format('%I = p.%I', k, k), ', ') FROM jsonb_object_keys(p_patch) AS k),
    p_table)
  USING p_patch, p_id;
END;
$f$;

-- AFTER INSERT / UPDATE / DELETE: brings a line's old thread along when it
-- joined another one, writes its content to every other line of the
-- thread, and logs it all. Writes made here run with money.thread_sync on
-- and do not sync again.
CREATE OR REPLACE FUNCTION public.money_thread_after()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
DECLARE
  v_new jsonb;
  v_old jsonb;
  v_thread bigint;
  v_user bigint;
  v_origin bigint;
  v_id bigint;
  v_patch jsonb;
  r RECORD;
  d RECORD;
BEGIN
  IF COALESCE(current_setting('money.thread_sync', true), '') = 'on' THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_user := NULLIF(v_old->>'updatedById', '')::bigint;
    PERFORM set_config('money.thread_sync', 'on', true);
    v_origin := money_thread_log('delete', TG_TABLE_NAME, v_old, NULL, NULL, NULL, NULL, v_user);
    PERFORM money_thread_delete_dependents(TG_TABLE_NAME, OLD.id);
    FOR r IN SELECT l.* FROM money_thread_lines(OLD."serviceThreadId") l
             ORDER BY money_thread_table_order(l.table_name), l.id LOOP
      PERFORM money_thread_log('delete', r.table_name, r.j, NULL, NULL, NULL, v_origin, v_user);
      PERFORM money_thread_delete_dependents(r.table_name, r.id);
      EXECUTE format('DELETE FROM %I WHERE id = $1', r.table_name) USING r.id;
    END LOOP;
    PERFORM set_config('money.thread_sync', 'off', true);
    RETURN NULL;
  END IF;
  v_new := to_jsonb(NEW);
  v_thread := NEW."serviceThreadId";
  v_user := COALESCE(NULLIF(v_new->>'updatedById', '')::bigint, NULLIF(v_new->>'createdById', '')::bigint);
  IF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    -- (an older line getting its first thread is no change)
    IF NOT EXISTS (SELECT 1 FROM money_thread_diff(TG_TABLE_NAME, v_new, TG_TABLE_NAME, v_old))
       AND (OLD."serviceThreadId" IS NULL OR v_thread IS NOT DISTINCT FROM OLD."serviceThreadId") THEN
      RETURN NULL;
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM money_thread_lines(v_thread) l
                    WHERE NOT (l.table_name = TG_TABLE_NAME AND l.id = NEW.id)) THEN
    RETURN NULL;  -- a new line in a thread of its own: nothing to spread or log
  END IF;

  PERFORM set_config('money.thread_sync', 'on', true);
  -- the old thread of a line that joined another one comes along
  IF TG_OP = 'UPDATE' AND OLD."serviceThreadId" IS NOT NULL AND OLD."serviceThreadId" IS DISTINCT FROM v_thread THEN
    UPDATE "quotationServices" SET "serviceThreadId" = v_thread WHERE "serviceThreadId" = OLD."serviceThreadId";
    UPDATE "contractServices" SET "serviceThreadId" = v_thread WHERE "serviceThreadId" = OLD."serviceThreadId";
    UPDATE "projectServices" SET "serviceThreadId" = v_thread WHERE "serviceThreadId" = OLD."serviceThreadId";
  END IF;
  -- lock the thread in one order: two saves on one thread wait, never deadlock
  PERFORM 1 FROM "quotationServices" WHERE "serviceThreadId" = v_thread ORDER BY id FOR UPDATE;
  PERFORM 1 FROM "contractServices" WHERE "serviceThreadId" = v_thread ORDER BY id FOR UPDATE;
  PERFORM 1 FROM "projectServices" WHERE "serviceThreadId" = v_thread ORDER BY id FOR UPDATE;

  IF TG_OP = 'UPDATE' THEN
    FOR d IN SELECT * FROM money_thread_diff(TG_TABLE_NAME, v_new, TG_TABLE_NAME, v_old) LOOP
      v_id := money_thread_log('update', TG_TABLE_NAME, v_new, d.field, d.old_value, d.new_value, NULL, v_user);
      v_origin := COALESCE(v_origin, v_id);
    END LOOP;
  END IF;
  IF v_origin IS NULL THEN
    v_origin := money_thread_log(lower(TG_OP), TG_TABLE_NAME, v_new, NULL, NULL, NULL, NULL, v_user);
  END IF;

  FOR r IN
    SELECT l.* FROM money_thread_lines(v_thread) l
    WHERE NOT (l.table_name = TG_TABLE_NAME AND l.id = NEW.id)
    ORDER BY money_thread_table_order(l.table_name), l.id
  LOOP
    v_patch := '{}';
    FOR d IN SELECT * FROM money_thread_diff(TG_TABLE_NAME, v_new, r.table_name, r.j) LOOP
      PERFORM money_thread_log('update', r.table_name, r.j, d.field, d.old_value, d.new_value, v_origin, v_user);
      v_patch := v_patch || jsonb_build_object(money_thread_column(r.table_name, d.field),
                                               v_new->money_thread_column(TG_TABLE_NAME, d.field));
    END LOOP;
    PERFORM money_thread_apply(r.table_name, r.id, v_patch);
  END LOOP;
  PERFORM set_config('money.thread_sync', 'off', true);
  RETURN NULL;
END;
$f$;

DROP TRIGGER IF EXISTS trg_money_a_thread_before ON "quotationServices";
CREATE TRIGGER trg_money_a_thread_before BEFORE INSERT OR UPDATE OR DELETE ON "quotationServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_thread_before();
DROP TRIGGER IF EXISTS trg_money_a_thread_before ON "contractServices";
CREATE TRIGGER trg_money_a_thread_before BEFORE INSERT OR UPDATE OR DELETE ON "contractServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_thread_before();
DROP TRIGGER IF EXISTS trg_money_a_thread_before ON "projectServices";
CREATE TRIGGER trg_money_a_thread_before BEFORE INSERT OR UPDATE OR DELETE ON "projectServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_thread_before();
DROP TRIGGER IF EXISTS trg_money_thread_after ON "quotationServices";
CREATE TRIGGER trg_money_thread_after AFTER INSERT OR UPDATE OR DELETE ON "quotationServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_thread_after();
DROP TRIGGER IF EXISTS trg_money_thread_after ON "contractServices";
CREATE TRIGGER trg_money_thread_after AFTER INSERT OR UPDATE OR DELETE ON "contractServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_thread_after();
DROP TRIGGER IF EXISTS trg_money_thread_after ON "projectServices";
CREATE TRIGGER trg_money_thread_after AFTER INSERT OR UPDATE OR DELETE ON "projectServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_thread_after();

-- ---- 7. By Service pending requests follow their service's amount
-- (by_service_service_amount: a locked allocation, else the line's total);
-- their items share it (largest remainder).
CREATE OR REPLACE FUNCTION public.money_service_requests_refresh(p_project_service_id bigint, p_contract_service_id bigint)
RETURNS void
LANGUAGE plpgsql
AS $f$
DECLARE
  v_amount numeric;
  v_request bigint;
  v_items bigint[];
  v_split numeric[];
  k integer;
BEGIN
  IF p_project_service_id IS NOT NULL THEN
    SELECT a.amount INTO v_amount FROM by_service_service_amount(p_project_service_id) a;
  ELSE
    SELECT COALESCE(NULLIF(to_jsonb(cs)->>'paymentAllocatedAmount', '')::numeric, cs."totalAmount"::numeric)
    INTO v_amount FROM "contractServices" cs WHERE cs.id = p_contract_service_id;
  END IF;
  IF v_amount IS NULL THEN
    RETURN;
  END IF;
  FOR v_request IN
    SELECT pr.id FROM "paymentRequests" pr JOIN contracts c ON c.id = pr."contractId"
    WHERE lower(COALESCE(pr.status, '')) = 'pending' AND c."contractType" = 'byService'
      AND (pr."projectServiceId" = p_project_service_id OR pr."contractServiceId" = p_contract_service_id)
  LOOP
    UPDATE "paymentRequests" SET "requestedAmount" = v_amount
    WHERE id = v_request AND "requestedAmount" IS DISTINCT FROM v_amount;
    SELECT array_agg(i.id ORDER BY i.id),
           money_split(v_amount, array_agg(COALESCE(i."requestedAmount", 0)::numeric ORDER BY i.id), 0)
    INTO v_items, v_split
    FROM "paymentRequestItems" i WHERE i."paymentRequestId" = v_request;
    IF v_items IS NOT NULL THEN
      FOR k IN 1..array_length(v_items, 1) LOOP
        UPDATE "paymentRequestItems" SET "requestedAmount" = v_split[k]
        WHERE id = v_items[k] AND "requestedAmount" IS DISTINCT FROM v_split[k];
      END LOOP;
    END IF;
  END LOOP;
END;
$f$;

CREATE OR REPLACE FUNCTION public.money_service_amount_changed()
RETURNS trigger
LANGUAGE plpgsql
AS $f$
BEGIN
  IF TG_TABLE_NAME = 'projectServices' THEN
    PERFORM money_service_requests_refresh(NEW.id,
      (SELECT cs.id FROM "contractServices" cs WHERE cs."projectServiceId" = NEW.id LIMIT 1));
  ELSE
    PERFORM money_service_requests_refresh(NULLIF(to_jsonb(NEW)->>'projectServiceId', '')::bigint, NEW.id);
  END IF;
  RETURN NULL;
END;
$f$;

DROP TRIGGER IF EXISTS trg_money_service_amount_changed ON "projectServices";
CREATE TRIGGER trg_money_service_amount_changed AFTER UPDATE ON "projectServices"
  FOR EACH ROW WHEN (OLD."totalAmount" IS DISTINCT FROM NEW."totalAmount"
    OR to_jsonb(OLD)->'paymentAllocatedAmount' IS DISTINCT FROM to_jsonb(NEW)->'paymentAllocatedAmount')
  EXECUTE FUNCTION public.money_service_amount_changed();
DROP TRIGGER IF EXISTS trg_money_service_amount_changed ON "contractServices";
CREATE TRIGGER trg_money_service_amount_changed AFTER UPDATE ON "contractServices"
  FOR EACH ROW WHEN (OLD."totalAmount" IS DISTINCT FROM NEW."totalAmount"
    OR to_jsonb(OLD)->'paymentAllocatedAmount' IS DISTINCT FROM to_jsonb(NEW)->'paymentAllocatedAmount')
  EXECUTE FUNCTION public.money_service_amount_changed();

-- ---- 8. Audit: lines without a thread, lines of one thread that differ
CREATE OR REPLACE VIEW public.service_thread_violations AS
WITH lines AS (
  SELECT 'quotationServices'::text AS table_name, l.id, l."serviceThreadId" AS thread_id, to_jsonb(l) AS j FROM "quotationServices" l
  UNION ALL SELECT 'contractServices', l.id, l."serviceThreadId", to_jsonb(l) FROM "contractServices" l
  UNION ALL SELECT 'projectServices', l.id, l."serviceThreadId", to_jsonb(l) FROM "projectServices" l
)
SELECT 'thread_missing'::text AS rule, table_name, id AS record_id, thread_id,
       'line without a service thread'::text AS detail
FROM lines WHERE thread_id IS NULL
UNION ALL
SELECT 'thread_content_mismatch', b.table_name, b.id, b.thread_id,
       format('differs from %s #%s: %s', a.table_name, a.id, x.s)
FROM lines a
JOIN lines b ON b.thread_id = a.thread_id
  AND (money_thread_table_order(a.table_name), a.id) < (money_thread_table_order(b.table_name), b.id)
CROSS JOIN LATERAL (
  SELECT string_agg(d.field || ' ' || COALESCE(d.old_value, '-') || ' / ' || COALESCE(d.new_value, '-'), '; ') AS s
  FROM money_thread_diff(a.table_name, a.j, b.table_name, b.j) d) x
WHERE x.s IS NOT NULL;

-- ---- 9. Older lines (spec §9). Writes with the sync flag on (no spreading,
-- no refusal) and returns what it did, row by row;
-- pgsql/service_thread_backfill_preview.sql runs it and rolls back.
CREATE OR REPLACE FUNCTION public.service_thread_backfill_run()
RETURNS TABLE (step text, table_name text, record_id bigint, detail text)
LANGUAGE plpgsql
AS $f$
DECLARE
  n1 bigint;
  n2 bigint;
  n3 bigint;
  r RECORD;
  t RECORD;
  v_thread bigint;
  v_billed text;
  v_canon jsonb;
  v_patch jsonb;
  v_task text;
  k text;
  c_fields CONSTANT text[] := ARRAY['serviceId', 'serviceName', 'serviceType', 'description',
                                    'basePrice', 'quantity', 'vat', 'currencyId', 'comboId', 'comboName'];
BEGIN
  PERFORM set_config('money.thread_sync', 'on', true);

  -- 1. links: a case line takes its contract line's quotation line; an
  --    unlinked case line and contract line of one case contract with the
  --    same catalog service (one candidate each way) are linked
  RETURN QUERY
  WITH u AS (
    UPDATE "projectServices" ps SET "quotationServiceId" = cs."quotationServiceId"
    FROM "contractServices" cs
    WHERE cs."projectServiceId" = ps.id AND ps."quotationServiceId" IS NULL AND cs."quotationServiceId" IS NOT NULL
    RETURNING ps.id, cs."quotationServiceId" AS q)
  SELECT 'link case -> quotation line'::text, 'projectServices'::text, u.id, 'quotationServiceId = ' || u.q FROM u;

  RETURN QUERY
  WITH cand AS (
    SELECT ps.id AS ps_id, cs.id AS cs_id
    FROM "projectServices" ps
    JOIN projects p ON p.id = ps."projectId"
    JOIN "contractServices" cs ON cs."contractId" = p."contractId" AND cs."projectServiceId" IS NULL
     AND cs."ServiceId" IS NOT NULL AND cs."ServiceId" = ps."serviceId"
    WHERE NOT EXISTS (SELECT 1 FROM "contractServices" x WHERE x."projectServiceId" = ps.id)),
  uniq AS (
    SELECT c.* FROM cand c
    WHERE (SELECT count(*) FROM cand c2 WHERE c2.ps_id = c.ps_id) = 1
      AND (SELECT count(*) FROM cand c3 WHERE c3.cs_id = c.cs_id) = 1),
  u AS (
    UPDATE "contractServices" cs SET "projectServiceId" = uniq.ps_id FROM uniq WHERE cs.id = uniq.cs_id
    RETURNING cs.id, uniq.ps_id)
  SELECT 'link contract -> case line'::text, 'contractServices'::text, u.id, 'projectServiceId = ' || u.ps_id FROM u;

  -- 2. threads: connected components over the links (the smallest id wins)
  UPDATE "quotationServices" SET "serviceThreadId" = id WHERE "serviceThreadId" IS NULL;
  UPDATE "contractServices" SET "serviceThreadId" = id WHERE "serviceThreadId" IS NULL;
  UPDATE "projectServices" SET "serviceThreadId" = id WHERE "serviceThreadId" IS NULL;
  LOOP
    UPDATE "contractServices" cs SET "serviceThreadId" = x.t
    FROM (SELECT c.id, least(c."serviceThreadId", ps."serviceThreadId", qs."serviceThreadId") AS t
          FROM "contractServices" c
          LEFT JOIN "projectServices" ps ON ps.id = c."projectServiceId"
          LEFT JOIN "quotationServices" qs ON qs.id = c."quotationServiceId") x
    WHERE cs.id = x.id AND x.t < cs."serviceThreadId";
    GET DIAGNOSTICS n1 = ROW_COUNT;
    UPDATE "projectServices" ps SET "serviceThreadId" = x.t
    FROM (SELECT p.id, least(p."serviceThreadId", qs."serviceThreadId",
                             (SELECT min(c."serviceThreadId") FROM "contractServices" c WHERE c."projectServiceId" = p.id)) AS t
          FROM "projectServices" p LEFT JOIN "quotationServices" qs ON qs.id = p."quotationServiceId") x
    WHERE ps.id = x.id AND x.t < ps."serviceThreadId";
    GET DIAGNOSTICS n2 = ROW_COUNT;
    UPDATE "quotationServices" qs SET "serviceThreadId" = x.t
    FROM (SELECT q.id, least(q."serviceThreadId",
                             (SELECT min(c."serviceThreadId") FROM "contractServices" c WHERE c."quotationServiceId" = q.id),
                             (SELECT min(p."serviceThreadId") FROM "projectServices" p WHERE p."quotationServiceId" = q.id)) AS t
          FROM "quotationServices" q) x
    WHERE qs.id = x.id AND x.t < qs."serviceThreadId";
    GET DIAGNOSTICS n3 = ROW_COUNT;
    EXIT WHEN n1 + n2 + n3 = 0;
  END LOOP;

  -- 3. currency lost: a VND contract / quotation line whose case line has a
  --    foreign currency and the same price takes that currency
  FOR r IN
    SELECT DISTINCT ON (l.table_name, l.id) l.table_name AS tbl, l.id, ps."currencyId" AS cur, l.j
    FROM "projectServices" ps
    CROSS JOIN LATERAL money_thread_lines(ps."serviceThreadId") l
    WHERE l.table_name <> 'projectServices'
      AND NOT money_is_base(ps."currencyId")
      AND NOT money_thread_is_package(to_jsonb(ps)) AND NOT money_thread_is_package(l.j)
      AND money_is_base(NULLIF(l.j->>'currencyId', '')::bigint)
      AND NULLIF(l.j->>'basePrice', '')::numeric IS NOT DISTINCT FROM ps."basePrice"::numeric
  LOOP
    v_billed := money_thread_billed_contract(NULLIF(r.j->>'serviceThreadId', '')::bigint);
    step := CASE WHEN v_billed IS NOT NULL THEN 'currency (billed ' || v_billed || ', not changed)' ELSE 'currency' END;
    table_name := r.tbl;
    record_id := r.id;
    detail := 'VND -> ' || money_currency_code(r.cur);
    IF v_billed IS NULL THEN
      PERFORM money_thread_apply(r.tbl, r.id, jsonb_build_object('currencyId', r.cur, 'exchangeRateToBase', NULL));
    END IF;
    RETURN NEXT;
  END LOOP;

  -- 4. content: per field the first value found in the contract, case, then
  --    quotation lines (price / quantity / VAT / currency / combo only within
  --    the same pricing); a missing value never wipes one
  FOR v_thread IN
    SELECT x.th FROM (
      SELECT "serviceThreadId" AS th FROM "quotationServices"
      UNION ALL SELECT "serviceThreadId" FROM "contractServices"
      UNION ALL SELECT "serviceThreadId" FROM "projectServices") x
    GROUP BY x.th HAVING count(*) > 1
  LOOP
    v_billed := money_thread_billed_contract(v_thread);
    FOR t IN SELECT l.* FROM money_thread_lines(v_thread) l ORDER BY money_thread_table_order(l.table_name), l.id LOOP
      v_canon := '{}';
      FOREACH k IN ARRAY c_fields LOOP
        v_canon := v_canon || jsonb_build_object(k, (
          SELECT money_thread_content(o.table_name, o.j)->k
          FROM money_thread_lines(v_thread) o
          WHERE NULLIF(o.j->>money_thread_column(o.table_name, k), '') IS NOT NULL
            AND (k IN ('serviceId', 'serviceName', 'serviceType', 'description')
                 OR money_thread_is_package(o.j) = money_thread_is_package(t.j))
          ORDER BY CASE o.table_name WHEN 'contractServices' THEN 1 WHEN 'projectServices' THEN 2 ELSE 3 END, o.id
          LIMIT 1));
      END LOOP;
      v_patch := '{}';
      FOREACH k IN ARRAY c_fields LOOP
        IF jsonb_typeof(v_canon->k) IS NOT NULL AND jsonb_typeof(v_canon->k) <> 'null'
           AND v_canon->k IS DISTINCT FROM money_thread_content(t.table_name, t.j)->k THEN
          v_patch := v_patch || jsonb_build_object(money_thread_column(t.table_name, k), v_canon->k);
        END IF;
      END LOOP;
      IF v_patch <> '{}' THEN
        step := CASE WHEN v_billed IS NOT NULL THEN 'content (billed ' || v_billed || ', not changed)' ELSE 'content' END;
        table_name := t.table_name;
        record_id := t.id;
        detail := v_patch::text;
        IF v_billed IS NULL THEN
          PERFORM money_thread_apply(t.table_name, t.id, v_patch);
        END IF;
        RETURN NEXT;
      END IF;
    END LOOP;
  END LOOP;

  -- 5. lines marked deleted / cancelled: destroyed on their own, unless a task has progress
  FOR r IN
    SELECT 'quotationServices'::text AS tbl, l.id FROM "quotationServices" l
    WHERE lower(COALESCE(l.status, '')) IN ('deleted', 'cancelled', 'canceled')
    UNION ALL SELECT 'contractServices', l.id FROM "contractServices" l
    WHERE lower(COALESCE(l."lineStatus", '')) IN ('deleted', 'cancelled', 'canceled')
    UNION ALL SELECT 'projectServices', l.id FROM "projectServices" l
    WHERE lower(COALESCE(l.status, '')) IN ('deleted', 'cancelled', 'canceled')
  LOOP
    v_task := money_thread_task_in_progress(r.tbl, r.id, NULL);
    table_name := r.tbl;
    record_id := r.id;
    IF v_task IS NOT NULL THEN
      step := 'deleted line kept (task in progress)';
      detail := v_task;
    ELSE
      PERFORM money_thread_delete_dependents(r.tbl, r.id);
      EXECUTE format('DELETE FROM %I WHERE id = $1', r.tbl) USING r.id;
      step := 'deleted line destroyed';
      detail := NULL;
    END IF;
    RETURN NEXT;
  END LOOP;

  PERFORM set_config('money.thread_sync', 'off', true);

  -- 6. rates and amounts (pgsql/money_flow_foundation.sql)
  RETURN QUERY SELECT 'money: ' || b.step, NULL::text, NULL::bigint, b.affected::text FROM money_backfill_run() b;
END;
$f$;
