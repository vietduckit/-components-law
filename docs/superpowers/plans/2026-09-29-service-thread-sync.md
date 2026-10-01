# Service Thread Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The quotation / contract / case lines of one service share a `serviceThreadId`; any content change or destroy on one line reaches every line of the thread in one transaction, is refused on billed contracts, and is logged.

**Architecture:** One new SQL file `pgsql/service_thread_sync.sql` (columns, history table, helpers, a BEFORE trigger that assigns threads and refuses, an AFTER trigger that spreads / destroys and logs, By Service pending-request refresh, audit view, and the data backfill function). Runner files for preview / backfill. A NocoBase registration script, a read-only history JS block, and database error messages in the service blocks.

**Tech Stack:** PostgreSQL 16 plpgsql; NocoBase JS Blocks; node test scripts; local harness `scripts/tests/sql/run-local.sh`.

**Spec:** `docs/superpowers/specs/2026-09-29-service-thread-sync-design.md`

## Global Constraints

- Synced content: catalog service (`serviceId`; `ServiceId` on contractServices), `serviceName`, `serviceType`, `description` on every line; `basePrice`, `quantity`, `vat`, `currencyId`, `comboId`, `comboName` only between lines of the same pricing (combo `package` vs line) — a combo line's price is not a price.
- Compared normalized: text trimmed, empty = NULL; quantity NULL / 0 = 1; basePrice / VAT NULL = 0; currency NULL = the base currency.
- Refusal messages (Vietnamese, shown to users): `Dịch vụ "<name>" thuộc hợp đồng <code> đã phát sinh thanh toán — không thể sửa.` / `... — không thể xoá.` / `Dịch vụ "<name>" có công việc đang thực hiện (<task>) — xử lý các task trước.`
- Session flag `money.thread_sync = 'on'`: writes made by the sync (and by the backfill) do not sync again and are not refused.
- Amounts are never copied; `money_line_compute` computes each line.
- Never run anything on dev: the executor works on the harness and on the LOCAL copy `nocobase-law` (localhost:5432, user postgres, pgpass in place).
- The user commits; no commits by the executor. CRLF files (`QuotationCreateForm.js`, `CaseCreateForm.js`, `ContractCreateForm.js`) keep CRLF. Scripts with `$` / escapes are written with the Write tool, not inline bash.

## Review Focus

1. Two users saving lines of one thread at the same time: rows are locked in a fixed order (table, id), no deadlock loop.
2. The JS blocks re-save every row on "Save" with the same values: no history rows, no refusal on billed contracts (normalization).
3. A case line created by JS without `quantity` joining a thread whose contract line has quantity 3: it takes 3, it does not reset the contract line to 1.
4. A combo quotation made into a line-priced contract (contract 269 on dev): a name edit spreads, a price edit never zeroes the contract line.
5. A NocoBase-created `serviceChangeLogs` table (no id default) still accepts the trigger inserts.

---

### Task 1: Columns, history table, thread assignment

**Files:**
- Create: `pgsql/service_thread_sync.sql`
- Modify: `pgsql/tests/fixtures/finance_min_schema.sql` (content columns; task-side tables)
- Modify: `scripts/tests/sql/run-local.sh` (load the new file last)
- Create: `pgsql/tests/service_thread_test.sql` (sections A.. grow per task)

**Interfaces:**
- Produces: columns `serviceThreadId` (3 tables), `contractServices.serviceType`, `projectServices.quantity`; table `serviceChangeLogs`; functions `money_thread_is_package(jsonb)`, `money_thread_content(text, jsonb) → jsonb`, `money_thread_column(text, text) → text`, `money_thread_diff(text, jsonb, text, jsonb) → TABLE(field, old_value, new_value)`, `money_thread_lines(bigint) → TABLE(table_name, id, j)`, `money_thread_table_order(text) → int`, `money_thread_of_link(text, jsonb) → bigint`, `money_thread_billed_contract(bigint, bigint) → text`, `money_line_document(text, jsonb) → (document_type, document_id)`, `money_thread_log(...) → bigint`; trigger function `money_thread_before()` as `trg_money_a_thread_before` (name sorts before `trg_money_line_compute`, so adopted inputs are priced).

- [ ] **Step 1: fixture.** Add to `finance_min_schema.sql`:
  - `quotationServices`: `"serviceId" bigint, "serviceType" varchar(255), description text, "comboId" bigint, "comboName" text, "updatedById" bigint`;
  - `contractServices`: `"ServiceId" bigint, "serviceType" varchar(255), description text, "comboId" bigint, "comboName" text, "updatedById" bigint, "paymentAllocatedAmount" double precision`;
  - `projectServices`: `"serviceType" varchar(255), description text, quantity double precision, "comboId" bigint, "comboName" text, "updatedById" bigint`;
  - `tasks`: `"contractServiceId" bigint, "quotationServiceId" bigint`;
  - new tables `timesheets (id bigint PRIMARY KEY, "taskId" bigint)`, `"subTasks" (id bigint PRIMARY KEY, "taskId" bigint)`, `meetings (id bigint PRIMARY KEY, "taskId" bigint)`, `documents (id bigint PRIMARY KEY, "taskId" bigint, "createdAt" timestamptz DEFAULT now())`, `folders (id bigint PRIMARY KEY, "taskId" bigint)`.
- [ ] **Step 2: failing test** `pgsql/tests/service_thread_test.sql` section A (setup + thread assignment):

```sql
-- ============================================================
-- Self-checking test: service thread sync (pgsql/service_thread_sync.sql).
-- BEGIN ... ROLLBACK; prints "ALL SERVICE THREAD CHECKS PASSED". Ids 998300000000001+.
--   bash scripts/tests/sql/run-local.sh pgsql/tests/service_thread_test.sql
-- ============================================================
BEGIN;
INSERT INTO currencies (id, code, "decimalPlaces", "isBaseCurrency")
SELECT 998300000000001, 'VND', 0, true WHERE NOT EXISTS (SELECT 1 FROM currencies WHERE upper(code) = 'VND');
INSERT INTO currencies (id, code, "decimalPlaces") VALUES (998300000000002, 'XTU', 2);
INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate", status)
VALUES (998300000000011, 998300000000002, money_base_currency_id(), 26176.5, '2026-08-18T09:18:17Z', NULL);
INSERT INTO quotations (id, "pricingMode", "createdAt") VALUES (998300000000101, 'line', '2026-09-01T02:00:00Z');
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "createdAt") VALUES
  (998300000000201, 'ST-1', 'Thread 1', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z'),
  (998300000000202, 'ST-2', 'Thread 2', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z'),
  (998300000000203, 'ST-3', 'Thread 3', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z');
INSERT INTO projects (id, "contractId", status, "createdAt") VALUES (998300000000301, 998300000000201, 'in_progress', '2026-09-20T02:00:00Z');

-- ---- A. one quotation line made into three contracts and a case: one thread
INSERT INTO "quotationServices" (id, "quotationId", "serviceId", "serviceName", "serviceType", description, "basePrice", quantity, vat, "currencyId")
VALUES (998300000000111, 998300000000101, 5, 'Trademark', 'IP', 'desc', 10, 1, 8, 998300000000002);
INSERT INTO "contractServices" (id, "contractId", "quotationServiceId", "ServiceId", "serviceName", "serviceType", description, "basePrice", quantity, vat, "currencyId") VALUES
  (998300000000211, 998300000000201, 998300000000111, 5, 'Trademark', 'IP', 'desc', 10, 1, 8, 998300000000002),
  (998300000000212, 998300000000202, 998300000000111, 5, 'Trademark', 'IP', 'desc', 10, 1, 8, 998300000000002),
  (998300000000213, 998300000000203, 998300000000111, 5, 'Trademark', 'IP', 'desc', 10, 1, 8, 998300000000002);
INSERT INTO "projectServices" (id, "projectId", "serviceId", "serviceName", "serviceType", description, "basePrice", vat, "currencyId")
VALUES (998300000000311, 998300000000301, 5, 'Trademark', 'IP', 'desc', 10, 8, 998300000000002);
UPDATE "contractServices" SET "projectServiceId" = 998300000000311 WHERE id = 998300000000211;
DO $$
DECLARE n integer; v_thread bigint;
BEGIN
  SELECT "serviceThreadId" INTO v_thread FROM "projectServices" WHERE id = 998300000000311;
  SELECT count(*) INTO n FROM money_thread_lines(v_thread);
  IF n <> 5 THEN
    RAISE EXCEPTION 'FAIL A: the quotation line, three contract lines and the case line share one thread (got % lines)', n;
  END IF;
  IF (SELECT "projectId" FROM "contractServices" WHERE id = 998300000000211) <> 998300000000301 THEN
    RAISE EXCEPTION 'FAIL A: a contract line takes its case from its case line';
  END IF;
  IF (SELECT "serviceThreadId" FROM "quotationServices" WHERE id = 998300000000111) IS DISTINCT FROM v_thread THEN
    RAISE EXCEPTION 'FAIL A: linking merges the whole thread';
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL SERVICE THREAD CHECKS PASSED'; END $$;
ROLLBACK;
```

- [ ] **Step 3: run** `bash scripts/tests/sql/run-local.sh pgsql/tests/service_thread_test.sql`. Expected: FAIL (`money_thread_lines` does not exist).
- [ ] **Step 4: implement** sections 1–4 of `pgsql/service_thread_sync.sql`:

```sql
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
-- one contract line per case line (dev data is 1:1; it keeps the thread unambiguous)
CREATE UNIQUE INDEX IF NOT EXISTS "contractServices_projectServiceId_unique"
  ON "contractServices" ("projectServiceId") WHERE "projectServiceId" IS NOT NULL;

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
RETURNS boolean LANGUAGE sql IMMUTABLE AS $f$
  SELECT lower(COALESCE(p_row->>'pricingMode', '')) = 'package';
$f$;

-- The column of a content field in a line table (contractServices spells
-- the catalog service "ServiceId").
CREATE OR REPLACE FUNCTION public.money_thread_column(p_table text, p_field text)
RETURNS text LANGUAGE sql IMMUTABLE AS $f$
  SELECT CASE WHEN p_field = 'serviceId' AND p_table = 'contractServices' THEN 'ServiceId' ELSE p_field END;
$f$;

-- A line's content, normalized so a re-save of the same values is no change.
CREATE OR REPLACE FUNCTION public.money_thread_content(p_table text, p_row jsonb)
RETURNS jsonb LANGUAGE sql STABLE AS $f$
  SELECT jsonb_build_object(
    'serviceId', NULLIF(p_row->>money_thread_column(p_table, 'serviceId'), '')::bigint,
    'serviceName', NULLIF(btrim(p_row->>'serviceName'), ''),
    'serviceType', NULLIF(btrim(p_row->>'serviceType'), ''),
    'description', NULLIF(btrim(p_row->>'description'), ''),
    'basePrice', COALESCE(NULLIF(p_row->>'basePrice', '')::numeric, 0),
    'quantity', COALESCE(NULLIF(NULLIF(p_row->>'quantity', '')::numeric, 0), 1),
    'vat', COALESCE(NULLIF(p_row->>'vat', '')::numeric, 0),
    'currencyId', COALESCE(NULLIF(p_row->>'currencyId', '')::bigint, money_base_currency_id()),
    'comboId', NULLIF(p_row->>'comboId', '')::bigint,
    'comboName', NULLIF(btrim(p_row->>'comboName'), ''));
$f$;

-- The fields where line "to" differs from line "from". Price, quantity, VAT,
-- currency and combo only count between lines of the same pricing.
CREATE OR REPLACE FUNCTION public.money_thread_diff(p_from_table text, p_from jsonb, p_to_table text, p_to jsonb)
RETURNS TABLE (field text, old_value text, new_value text) LANGUAGE sql STABLE AS $f$
  SELECT k, b->>k, a->>k
  FROM (SELECT money_thread_content(p_from_table, p_from) AS a, money_thread_content(p_to_table, p_to) AS b) c,
       unnest(ARRAY['serviceId', 'serviceName', 'serviceType', 'description',
                    'basePrice', 'quantity', 'vat', 'currencyId', 'comboId', 'comboName']) AS k
  WHERE c.a->k IS DISTINCT FROM c.b->k
    AND (k IN ('serviceId', 'serviceName', 'serviceType', 'description')
         OR money_thread_is_package(p_from) = money_thread_is_package(p_to));
$f$;

-- ---- 4. The thread
CREATE OR REPLACE FUNCTION public.money_thread_table_order(p_table text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $f$
  SELECT CASE p_table WHEN 'quotationServices' THEN 1 WHEN 'contractServices' THEN 2 ELSE 3 END;
$f$;

CREATE OR REPLACE FUNCTION public.money_thread_lines(p_thread bigint)
RETURNS TABLE (table_name text, id bigint, j jsonb) LANGUAGE sql STABLE AS $f$
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
RETURNS bigint LANGUAGE sql STABLE AS $f$
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
RETURNS boolean LANGUAGE sql IMMUTABLE AS $f$
  SELECT CASE p_table
    WHEN 'contractServices' THEN p_new->'projectServiceId' IS DISTINCT FROM p_old->'projectServiceId'
                              OR p_new->'quotationServiceId' IS DISTINCT FROM p_old->'quotationServiceId'
    WHEN 'projectServices' THEN p_new->'quotationServiceId' IS DISTINCT FROM p_old->'quotationServiceId'
    ELSE false
  END;
$f$;

-- The code of a billed contract the thread (plus one more contract) touches, or NULL.
CREATE OR REPLACE FUNCTION public.money_thread_billed_contract(p_thread bigint, p_extra_contract bigint DEFAULT NULL)
RETURNS text LANGUAGE sql STABLE AS $f$
  SELECT COALESCE(NULLIF(c."contractCode", ''), NULLIF(c."contractName", ''), c.id::text)
  FROM contracts c
  WHERE c.id IN (SELECT money_line_contract_id(l.table_name, l.j) FROM money_thread_lines(p_thread) l
                 UNION SELECT p_extra_contract)
    AND money_contract_billing_locked(c.id)
  ORDER BY c.id
  LIMIT 1;
$f$;

CREATE OR REPLACE FUNCTION public.money_line_document(p_table text, p_row jsonb, OUT document_type text, OUT document_id bigint)
LANGUAGE sql IMMUTABLE AS $f$
  SELECT CASE p_table WHEN 'quotationServices' THEN 'quotation' WHEN 'contractServices' THEN 'contract' ELSE 'case' END,
         NULLIF(p_row->>CASE p_table WHEN 'quotationServices' THEN 'quotationId'
                                     WHEN 'contractServices' THEN 'contractId' ELSE 'projectId' END, '')::bigint;
$f$;

-- One history row; a currency is logged by its code.
CREATE OR REPLACE FUNCTION public.money_thread_log(
  p_action text, p_table text, p_row jsonb, p_field text, p_old text, p_new text, p_origin bigint, p_user bigint)
RETURNS bigint LANGUAGE plpgsql AS $f$
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
```

  and the BEFORE trigger (thread part; refusals are added in Task 3):

```sql
-- BEFORE INSERT / UPDATE / DELETE on the three line tables. Its name sorts
-- before trg_money_line_compute, so the inputs a new line takes from its
-- thread are priced.
CREATE OR REPLACE FUNCTION public.money_thread_before()
RETURNS trigger LANGUAGE plpgsql AS $f$
DECLARE
  v_row jsonb;
  v_link bigint;
  v_src RECORD;
  v_patch jsonb := '{}';
  v_case bigint;
  k text;
BEGIN
  IF TG_OP = 'DELETE' THEN
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

DROP TRIGGER IF EXISTS trg_money_a_thread_before ON "quotationServices";
CREATE TRIGGER trg_money_a_thread_before BEFORE INSERT OR UPDATE OR DELETE ON "quotationServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_thread_before();
DROP TRIGGER IF EXISTS trg_money_a_thread_before ON "contractServices";
CREATE TRIGGER trg_money_a_thread_before BEFORE INSERT OR UPDATE OR DELETE ON "contractServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_thread_before();
DROP TRIGGER IF EXISTS trg_money_a_thread_before ON "projectServices";
CREATE TRIGGER trg_money_a_thread_before BEFORE INSERT OR UPDATE OR DELETE ON "projectServices"
  FOR EACH ROW EXECUTE FUNCTION public.money_thread_before();
```

  and the AFTER trigger's merge part (spreading comes in Task 2):

```sql
CREATE OR REPLACE FUNCTION public.money_thread_after()
RETURNS trigger LANGUAGE plpgsql AS $f$
BEGIN
  IF COALESCE(current_setting('money.thread_sync', true), '') = 'on' OR TG_OP <> 'UPDATE' THEN
    RETURN NULL;
  END IF;
  IF OLD."serviceThreadId" IS NOT NULL AND OLD."serviceThreadId" IS DISTINCT FROM NEW."serviceThreadId" THEN
    PERFORM set_config('money.thread_sync', 'on', true);
    UPDATE "quotationServices" SET "serviceThreadId" = NEW."serviceThreadId" WHERE "serviceThreadId" = OLD."serviceThreadId";
    UPDATE "contractServices" SET "serviceThreadId" = NEW."serviceThreadId" WHERE "serviceThreadId" = OLD."serviceThreadId";
    UPDATE "projectServices" SET "serviceThreadId" = NEW."serviceThreadId" WHERE "serviceThreadId" = OLD."serviceThreadId";
    PERFORM set_config('money.thread_sync', 'off', true);
  END IF;
  RETURN NULL;
END;
$f$;
-- (three CREATE TRIGGER trg_money_thread_after AFTER INSERT OR UPDATE OR DELETE ... as for the BEFORE trigger)
```

  and `run-local.sh`: append `service_thread_sync.sql` after `money_flow_trail.sql` in the setup loop.
- [ ] **Step 5: run** the test. Expected: `ALL SERVICE THREAD CHECKS PASSED`. Then the SQL regression `bash .superpowers/sdd/2026-09-29-service-thread-sync/sqlreg.sh` (copy of the money-flow one). Expected: all PASSED.

### Task 2: Spread content, history

**Files:** Modify `pgsql/service_thread_sync.sql` (`money_thread_after`, `money_thread_apply`); test section B, C, D, F.

**Interfaces:**
- Consumes: Task 1 functions.
- Produces: `money_thread_apply(p_table text, p_id bigint, p_patch jsonb) → void`.

- [ ] **Step 1: failing tests** (append to `service_thread_test.sql` before the PASSED notice):

```sql
-- ---- B. a change on any line reaches every line, and is logged
DO $$
DECLARE v_thread bigint; n integer; v_origin bigint; r RECORD;
BEGIN
  SELECT "serviceThreadId" INTO v_thread FROM "projectServices" WHERE id = 998300000000311;
  UPDATE "quotationServices" SET "serviceName" = 'Trademark filing', "updatedById" = 7 WHERE id = 998300000000111;
  SELECT count(*) INTO n FROM money_thread_lines(v_thread) l WHERE l.j->>'serviceName' = 'Trademark filing';
  IF n <> 5 THEN RAISE EXCEPTION 'FAIL B: a quotation name change reaches all 5 lines (got %)', n; END IF;
  SELECT id INTO v_origin FROM "serviceChangeLogs"
  WHERE "recordId" = 998300000000111 AND "fieldName" = 'serviceName' AND "originLogId" IS NULL;
  IF v_origin IS NULL OR (SELECT count(*) FROM "serviceChangeLogs" WHERE "originLogId" = v_origin) <> 4
     OR (SELECT "createdById" FROM "serviceChangeLogs" WHERE id = v_origin) <> 7 THEN
    RAISE EXCEPTION 'FAIL B: one origin row by user 7 and four spread rows';
  END IF;

  UPDATE "projectServices" SET "basePrice" = 12 WHERE id = 998300000000311;
  SELECT count(*) INTO n FROM money_thread_lines(v_thread) l WHERE (l.j->>'basePrice')::numeric = 12;
  IF n <> 5 THEN RAISE EXCEPTION 'FAIL B: a case price change reaches all lines (got %)', n; END IF;
  IF (SELECT "totalAmount" FROM "projectServices" WHERE id = 998300000000311)
     <> (SELECT "totalAmount" FROM "contractServices" WHERE id = 998300000000211) THEN
    RAISE EXCEPTION 'FAIL B: the case line keeps its contract line''s amount';
  END IF;

  UPDATE "contractServices" SET description = 'new scope', vat = 10, "ServiceId" = 6 WHERE id = 998300000000212;
  SELECT * INTO r FROM "quotationServices" WHERE id = 998300000000111;
  IF r.description <> 'new scope' OR r.vat <> 10 OR r."serviceId" <> 6 THEN
    RAISE EXCEPTION 'FAIL B: a contract edit reaches the quotation (got %, %, %)', r.description, r.vat, r."serviceId";
  END IF;
  IF (SELECT "serviceId" FROM "projectServices" WHERE id = 998300000000311) <> 6 THEN
    RAISE EXCEPTION 'FAIL B: ServiceId maps to the case line''s serviceId';
  END IF;

  UPDATE "quotationServices" SET quantity = 2 WHERE id = 998300000000111;
  IF (SELECT quantity FROM "projectServices" WHERE id = 998300000000311) <> 2
     OR (SELECT "totalAmount" FROM "projectServices" WHERE id = 998300000000311)
        <> (SELECT "totalAmount" FROM "contractServices" WHERE id = 998300000000211) THEN
    RAISE EXCEPTION 'FAIL B: quantity reaches the case line, amounts stay equal';
  END IF;

  UPDATE "contractServices" SET "currencyId" = money_base_currency_id() WHERE id = 998300000000213;
  SELECT count(*) INTO n FROM money_thread_lines(v_thread) l WHERE money_is_base((l.j->>'currencyId')::bigint);
  IF n <> 5 OR (SELECT "totalAmount" FROM "contractServices" WHERE id = 998300000000211) <> 26 THEN
    RAISE EXCEPTION 'FAIL B: a currency change reaches all lines and re-prices them (got %, %)', n,
      (SELECT "totalAmount" FROM "contractServices" WHERE id = 998300000000211);
  END IF;
END $$;

-- ---- C. re-saving the same values is no change
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "serviceChangeLogs";
  UPDATE "contractServices" SET description = '  new scope  ', "serviceName" = "serviceName" WHERE id = 998300000000211;
  UPDATE "projectServices" SET quantity = quantity WHERE id = 998300000000311;
  IF (SELECT count(*) FROM "serviceChangeLogs") <> n THEN
    RAISE EXCEPTION 'FAIL C: a re-save with the same (trimmed) values logs nothing';
  END IF;
END $$;

-- ---- D. a combo quotation line and a line-priced contract line: names spread, prices do not
INSERT INTO quotations (id, "pricingMode", "createdAt") VALUES (998300000000102, 'package', '2026-09-01T02:00:00Z');
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "createdAt")
VALUES (998300000000204, 'ST-4', 'Combo quote', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z');
INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", vat, "pricingMode")
VALUES (998300000000112, 998300000000102, 'Setup', 0, 0, 'package');
INSERT INTO "contractServices" (id, "contractId", "quotationServiceId", "serviceName", "basePrice", vat, "currencyId", "pricingMode")
VALUES (998300000000214, 998300000000204, 998300000000112, 'Setup', 5000000, 8, money_base_currency_id(), 'line');
DO $$
BEGIN
  UPDATE "quotationServices" SET "serviceName" = 'Setup (company)', "basePrice" = 0 WHERE id = 998300000000112;
  IF (SELECT "serviceName" FROM "contractServices" WHERE id = 998300000000214) <> 'Setup (company)' THEN
    RAISE EXCEPTION 'FAIL D: the name spreads to the line-priced contract line';
  END IF;
  IF (SELECT "basePrice" FROM "contractServices" WHERE id = 998300000000214) <> 5000000 THEN
    RAISE EXCEPTION 'FAIL D: a combo line''s price never reaches a line-priced line';
  END IF;
  UPDATE "contractServices" SET "basePrice" = 6000000 WHERE id = 998300000000214;
  IF (SELECT "basePrice" FROM "quotationServices" WHERE id = 998300000000112) <> 0 THEN
    RAISE EXCEPTION 'FAIL D: a line price does not reach a combo line';
  END IF;
END $$;

-- ---- F. a new line joining a thread takes what it was created without, and spreads what it brings
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "createdAt")
VALUES (998300000000205, 'ST-5', 'Late contract', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z');
INSERT INTO "contractServices" (id, "contractId", "quotationServiceId", "basePrice", vat, "currencyId")
VALUES (998300000000215, 998300000000205, 998300000000111, 10, 10, money_base_currency_id());
DO $$
DECLARE r RECORD; v_thread bigint;
BEGIN
  SELECT * INTO r FROM "contractServices" WHERE id = 998300000000215;
  IF r."serviceName" <> 'Trademark filing' OR r.quantity <> 2 OR r."ServiceId" <> 6 THEN
    RAISE EXCEPTION 'FAIL F: a new line takes name / quantity / service from its thread (got %, %, %)', r."serviceName", r.quantity, r."ServiceId";
  END IF;
  -- it brought price 10 (the thread has 12): the thread takes 10
  v_thread := r."serviceThreadId";
  IF EXISTS (SELECT 1 FROM money_thread_lines(v_thread) l WHERE NOT money_thread_is_package(l.j) AND (l.j->>'basePrice')::numeric <> 10) THEN
    RAISE EXCEPTION 'FAIL F: the price a new line brings reaches its thread';
  END IF;
END $$;
```

- [ ] **Step 2: run.** Expected: FAIL B (names not spread).
- [ ] **Step 3: implement** in `money_thread_after` (replace the Task 1 body) and add `money_thread_apply`:

```sql
-- Writes a patch {column: value} to one line.
CREATE OR REPLACE FUNCTION public.money_thread_apply(p_table text, p_id bigint, p_patch jsonb)
RETURNS void LANGUAGE plpgsql AS $f$
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

-- AFTER INSERT / UPDATE / DELETE: brings a line's thread along (merge),
-- writes its content to every other line of the thread, logs it all.
CREATE OR REPLACE FUNCTION public.money_thread_after()
RETURNS trigger LANGUAGE plpgsql AS $f$
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
  IF COALESCE(current_setting('money.thread_sync', true), '') = 'on' OR TG_OP = 'DELETE' THEN
    RETURN NULL;
  END IF;
  v_new := to_jsonb(NEW);
  v_thread := NEW."serviceThreadId";
  v_user := COALESCE(NULLIF(v_new->>'updatedById', '')::bigint, NULLIF(v_new->>'createdById', '')::bigint);
  IF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    IF NOT EXISTS (SELECT 1 FROM money_thread_diff(TG_TABLE_NAME, v_new, TG_TABLE_NAME, v_old))
       AND v_thread IS NOT DISTINCT FROM OLD."serviceThreadId" THEN
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
  -- lock the thread in one order (two saves on one thread wait, never deadlock)
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
```

- [ ] **Step 4: run** the test and the SQL regression. Expected: PASSED; existing tests that edit lines in threads still pass (they have no threads with other members) — any failure is ruled in the ledger.

### Task 3: Refuse on billed contracts

**Files:** Modify `pgsql/service_thread_sync.sql` (`money_thread_before`); test section E.

- [ ] **Step 1: failing test:**

```sql
-- ---- E. a thread that touches a billed contract is locked, for every field
INSERT INTO "paymentRequests" (id, "contractId", status, "requestedAmount") VALUES (998300000000501, 998300000000203, 'active', 100);
DO $$
DECLARE v_msg text;
BEGIN
  BEGIN
    UPDATE "quotationServices" SET description = 'late edit' WHERE id = 998300000000111;
    RAISE EXCEPTION 'FAIL E: an edit of a thread with a billed contract must be refused';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg NOT LIKE '%ST-3 đã phát sinh thanh toán — không thể sửa%' THEN RAISE; END IF;
  END;
  BEGIN
    UPDATE "contractServices" SET "serviceName" = 'x' WHERE id = 998300000000211;
    RAISE EXCEPTION 'FAIL E: an unbilled contract of a billed thread is locked too';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg LIKE 'FAIL%' THEN RAISE; END IF;
  END;
  -- not content: allowed
  UPDATE "contractServices" SET "lineStatus" = 'contracted' WHERE id = 998300000000213;
  -- the same values: allowed
  UPDATE "quotationServices" SET "serviceName" = "serviceName" WHERE id = 998300000000111;
END $$;
DELETE FROM "paymentRequests" WHERE id = 998300000000501;
```

- [ ] **Step 2: run.** Expected: `FAIL E: an edit of a thread with a billed contract must be refused`.
- [ ] **Step 3: implement:** in `money_thread_before`, after the thread is set and before the contract-case block, for INSERT / UPDATE when `money.thread_sync` is not `on`:

```sql
  IF COALESCE(current_setting('money.thread_sync', true), '') <> 'on' THEN
    v_row := to_jsonb(NEW);
    IF (TG_OP = 'UPDATE' AND (EXISTS (SELECT 1 FROM money_thread_diff(TG_TABLE_NAME, v_row, TG_TABLE_NAME, to_jsonb(OLD)))
                              OR NEW."serviceThreadId" IS DISTINCT FROM OLD."serviceThreadId"))
       OR (TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM money_thread_lines(NEW."serviceThreadId") l,
                                         money_thread_diff(TG_TABLE_NAME, v_row, l.table_name, l.j) x)) THEN
      v_billed := COALESCE(
        money_thread_billed_contract(NEW."serviceThreadId", money_line_contract_id(TG_TABLE_NAME, v_row)),
        CASE WHEN TG_OP = 'UPDATE' THEN money_thread_billed_contract(OLD."serviceThreadId") END);
      IF v_billed IS NOT NULL THEN
        RAISE EXCEPTION 'Dịch vụ "%" thuộc hợp đồng % đã phát sinh thanh toán — không thể sửa.',
          COALESCE(NEW."serviceName", ''), v_billed;
      END IF;
    END IF;
  END IF;
```

  (declare `v_billed text`). Existing SQL tests that edit an input of a billed contract's line (money_flow_test E, money_backfill_test) set `money.thread_sync` to `on` around that edit, with a comment: it stands for an admin correction outside the thread rules — ruling in the ledger.
- [ ] **Step 4: run** the test and the regression. Expected: PASSED.

### Task 4: Destroy the thread

**Files:** Modify `pgsql/service_thread_sync.sql` (`money_task_has_progress`, `money_line_task_ids`, `money_thread_task_in_progress`, `money_thread_delete_dependents`, DELETE branches); test section G.

**Interfaces:**
- Produces: `money_task_has_progress(bigint, timestamptz, text) → boolean`, `money_line_task_ids(text, bigint) → SETOF bigint`, `money_thread_task_in_progress(text, bigint, bigint) → text`, `money_thread_delete_dependents(text, bigint) → void` (the backfill uses the last two).

- [ ] **Step 1: failing test:**

```sql
-- ---- G. destroying a line destroys its thread and what hangs on it
INSERT INTO tasks (id, title, status, "projectId", "projectServiceId", "createdAt")
VALUES (998300000000601, 'File the mark', 'inProgress', 998300000000301, 998300000000311, now() - interval '1 day');
INSERT INTO documents (id, "taskId", "createdAt") VALUES (998300000000611, 998300000000601, now() - interval '1 day');
INSERT INTO folders (id, "taskId") VALUES (998300000000621, 998300000000601);
INSERT INTO "paymentRequests" (id, "contractId", "contractServiceId", status, "requestedAmount")
VALUES (998300000000631, 998300000000202, 998300000000212, 'pending', 100);
INSERT INTO "paymentRequestItems" (id, "paymentRequestId", "requestedAmount") VALUES (998300000000632, 998300000000631, 100);
INSERT INTO "contractPaymentScheduleServices" (id, "contractPaymentScheduleId", "contractServiceId") VALUES (998300000000641, 1, 998300000000212);
INSERT INTO "paymentRequestServices" (id, "paymentRequestId", "contractServiceId") VALUES (998300000000642, 1, 998300000000212);
DO $$
DECLARE v_msg text; v_thread bigint;
BEGIN
  SELECT "serviceThreadId" INTO v_thread FROM "quotationServices" WHERE id = 998300000000111;
  BEGIN
    DELETE FROM "quotationServices" WHERE id = 998300000000111;
    RAISE EXCEPTION 'FAIL G: a thread with a task in progress must not be destroyed';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg NOT LIKE '%File the mark%xử lý các task trước%' THEN RAISE; END IF;
  END;
  UPDATE tasks SET status = 'toDo' WHERE id = 998300000000601;
  INSERT INTO timesheets (id, "taskId") VALUES (998300000000651, 998300000000601);
  BEGIN
    DELETE FROM "projectServices" WHERE id = 998300000000311;
    RAISE EXCEPTION 'FAIL G: a timesheet is progress';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg LIKE 'FAIL%' THEN RAISE; END IF;
  END;
  DELETE FROM timesheets WHERE id = 998300000000651;

  DELETE FROM "projectServices" WHERE id = 998300000000311;
  IF EXISTS (SELECT 1 FROM money_thread_lines(v_thread)) THEN
    RAISE EXCEPTION 'FAIL G: the whole thread is destroyed';
  END IF;
  IF EXISTS (SELECT 1 FROM tasks WHERE id = 998300000000601) OR EXISTS (SELECT 1 FROM documents WHERE id = 998300000000611)
     OR EXISTS (SELECT 1 FROM folders WHERE id = 998300000000621) THEN
    RAISE EXCEPTION 'FAIL G: the untouched task goes with its template file and folder';
  END IF;
  IF EXISTS (SELECT 1 FROM "paymentRequests" WHERE id = 998300000000631) OR EXISTS (SELECT 1 FROM "paymentRequestItems" WHERE id = 998300000000632)
     OR EXISTS (SELECT 1 FROM "contractPaymentScheduleServices" WHERE id = 998300000000641)
     OR EXISTS (SELECT 1 FROM "paymentRequestServices" WHERE id = 998300000000642) THEN
    RAISE EXCEPTION 'FAIL G: the pending request and the service tags go too';
  END IF;
  IF (SELECT count(*) FROM "serviceChangeLogs" WHERE "serviceThreadId" = v_thread AND action = 'delete') <> 6 THEN
    RAISE EXCEPTION 'FAIL G: one delete row per destroyed line';
  END IF;
END $$;
```

  plus a billed destroy case at the end of section E (`DELETE FROM "contractServices" WHERE id = 998300000000213` refused with `không thể xoá`, before the request is removed).
- [ ] **Step 2: run.** Expected: FAIL G / E (delete not refused).
- [ ] **Step 3: implement:**

```sql
-- ---- 6. Destroy
-- A task someone worked on: not "to do" any more, or with a timesheet, a
-- subtask, a meeting, or a file added after it was created (template files
-- come with the task).
CREATE OR REPLACE FUNCTION public.money_task_has_progress(p_task_id bigint, p_created timestamptz, p_status text)
RETURNS boolean LANGUAGE sql STABLE AS $f$
  SELECT lower(btrim(COALESCE(p_status, ''))) NOT IN ('', 'todo')
      OR EXISTS (SELECT 1 FROM timesheets t WHERE t."taskId" = p_task_id)
      OR EXISTS (SELECT 1 FROM "subTasks" s WHERE s."taskId" = p_task_id)
      OR EXISTS (SELECT 1 FROM meetings m WHERE m."taskId" = p_task_id)
      OR EXISTS (SELECT 1 FROM documents d WHERE d."taskId" = p_task_id
                   AND d."createdAt" > COALESCE(p_created, '-infinity'::timestamptz) + interval '1 minute');
$f$;

CREATE OR REPLACE FUNCTION public.money_line_task_ids(p_table text, p_id bigint)
RETURNS SETOF bigint LANGUAGE sql STABLE AS $f$
  SELECT t.id FROM tasks t
  WHERE (p_table = 'projectServices' AND t."projectServiceId" = p_id)
     OR (p_table = 'contractServices' AND t."contractServiceId" = p_id)
     OR (p_table = 'quotationServices' AND t."quotationServiceId" = p_id);
$f$;

-- The title of a task with progress on the line or its thread, or NULL.
CREATE OR REPLACE FUNCTION public.money_thread_task_in_progress(p_table text, p_id bigint, p_thread bigint)
RETURNS text LANGUAGE sql STABLE AS $f$
  SELECT COALESCE(NULLIF(t.title, ''), '#' || t.id) FROM tasks t
  WHERE t.id IN (SELECT money_line_task_ids(p_table, p_id)
                 UNION SELECT money_line_task_ids(l.table_name, l.id) FROM money_thread_lines(p_thread) l)
    AND money_task_has_progress(t.id, t."createdAt", t.status)
  ORDER BY t.id LIMIT 1;
$f$;

-- What hangs on a destroyed line: its untouched tasks (with their files and
-- folders), its pending requests (items, finance members, tags) and its
-- service tags on installments and requests.
CREATE OR REPLACE FUNCTION public.money_thread_delete_dependents(p_table text, p_id bigint)
RETURNS void LANGUAGE plpgsql AS $f$
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
```

  In `money_thread_before`, the DELETE branch becomes:

```sql
  IF TG_OP = 'DELETE' THEN
    IF COALESCE(current_setting('money.thread_sync', true), '') <> 'on' THEN
      v_billed := money_thread_billed_contract(OLD."serviceThreadId", money_line_contract_id(TG_TABLE_NAME, to_jsonb(OLD)));
      IF v_billed IS NOT NULL THEN
        RAISE EXCEPTION 'Dịch vụ "%" thuộc hợp đồng % đã phát sinh thanh toán — không thể xoá.', COALESCE(OLD."serviceName", ''), v_billed;
      END IF;
      v_task := money_thread_task_in_progress(TG_TABLE_NAME, OLD.id, OLD."serviceThreadId");
      IF v_task IS NOT NULL THEN
        RAISE EXCEPTION 'Dịch vụ "%" có công việc đang thực hiện (%) — xử lý các task trước.', COALESCE(OLD."serviceName", ''), v_task;
      END IF;
    END IF;
    RETURN OLD;
  END IF;
```

  and `money_thread_after` handles DELETE before its INSERT / UPDATE part:

```sql
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
```

- [ ] **Step 4: run** the test and the regression. Expected: PASSED.

### Task 5: By Service pending requests follow the service amount

**Files:** Modify `pgsql/service_thread_sync.sql`; test section H.

- [ ] **Step 1: failing test:**

```sql
-- ---- H. a By Service pending request follows its service's amount
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "createdAt")
VALUES (998300000000206, 'ST-6', 'By service', 'byService', 'line', 'execution', '2026-09-01T02:00:00Z');
INSERT INTO projects (id, "contractId", status, "createdAt") VALUES (998300000000302, 998300000000206, 'in_progress', '2026-09-20T02:00:00Z');
INSERT INTO "projectServices" (id, "projectId", "serviceName", "basePrice", vat, "currencyId")
VALUES (998300000000321, 998300000000302, 'Audit', 1000000, 8, money_base_currency_id());
INSERT INTO "contractServices" (id, "contractId", "projectServiceId", "serviceName", "basePrice", vat, "currencyId")
VALUES (998300000000221, 998300000000206, 998300000000321, 'Audit', 1000000, 8, money_base_currency_id());
INSERT INTO "paymentRequests" (id, "contractId", "contractServiceId", "projectServiceId", status, "requestedAmount")
VALUES (998300000000701, 998300000000206, 998300000000221, 998300000000321, 'pending', 1080000);
INSERT INTO "paymentRequestItems" (id, "paymentRequestId", "requestedAmount") VALUES (998300000000702, 998300000000701, 1080000);
DO $$
BEGIN
  UPDATE "projectServices" SET "basePrice" = 2000000 WHERE id = 998300000000321;
  IF (SELECT "requestedAmount" FROM "paymentRequests" WHERE id = 998300000000701) <> 2160000
     OR (SELECT "requestedAmount" FROM "paymentRequestItems" WHERE id = 998300000000702) <> 2160000 THEN
    RAISE EXCEPTION 'FAIL H: the pending By Service request and its item follow the service (got %)',
      (SELECT "requestedAmount" FROM "paymentRequests" WHERE id = 998300000000701);
  END IF;
END $$;
```

- [ ] **Step 2: run.** Expected: FAIL H.
- [ ] **Step 3: implement:**

```sql
-- ---- 7. By Service pending requests follow their service's amount
CREATE OR REPLACE FUNCTION public.money_service_requests_refresh(p_project_service_id bigint, p_contract_service_id bigint)
RETURNS void LANGUAGE plpgsql AS $f$
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
RETURNS trigger LANGUAGE plpgsql AS $f$
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
```

- [ ] **Step 4: run** the test and the regression. Expected: PASSED.

### Task 6: Audit view and data backfill

**Files:** Modify `pgsql/service_thread_sync.sql` (view, `service_thread_backfill_run`); Create `pgsql/service_thread_backfill_preview.sql`, `pgsql/service_thread_backfill.sql`, `pgsql/tests/service_thread_backfill_test.sql`; Modify `pgsql/money_consistency_audit.sql`.

**Interfaces:**
- Produces: view `service_thread_violations(rule, table_name, record_id, thread_id, detail)`; function `service_thread_backfill_run() → TABLE(step text, table_name text, record_id bigint, detail text)`.

- [ ] **Step 1: failing test** `pgsql/tests/service_thread_backfill_test.sql`:

```sql
-- ============================================================
-- Self-checking test: fixing older lines for the service threads
-- (service_thread_backfill_run in pgsql/service_thread_sync.sql).
-- BEGIN ... ROLLBACK; prints "ALL SERVICE THREAD BACKFILL CHECKS PASSED". Ids 998400000000001+.
-- ============================================================
BEGIN;
INSERT INTO currencies (id, code, "decimalPlaces", "isBaseCurrency")
SELECT 998400000000001, 'VND', 0, true WHERE NOT EXISTS (SELECT 1 FROM currencies WHERE upper(code) = 'VND');
INSERT INTO currencies (id, code, "decimalPlaces") VALUES (998400000000002, 'XTS', 2);
INSERT INTO "exchangeRates" (id, "fromCurrencyId", "toCurrencyId", rate, "effectiveDate", status)
VALUES (998400000000011, 998400000000002, money_base_currency_id(), 20480.471317, '2026-08-18T09:18:17Z', NULL);
INSERT INTO quotations (id, "pricingMode", "createdAt") VALUES (998400000000101, 'line', '2026-09-01T02:00:00Z');
INSERT INTO contracts (id, "contractCode", "contractName", "contractType", "pricingMode", status, "createdAt") VALUES
  (998400000000201, 'BT-1', 'Lost currency', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z'),
  (998400000000202, 'BT-2', 'Billed', 'byCase', 'line', 'execution', '2026-09-01T02:00:00Z');
INSERT INTO projects (id, "contractId", status, "createdAt") VALUES
  (998400000000301, 998400000000201, 'in_progress', '2026-09-20T02:00:00Z'),
  (998400000000302, 998400000000202, 'in_progress', '2026-09-20T02:00:00Z');

-- older rows, written with the triggers off (no threads)
ALTER TABLE "quotationServices" DISABLE TRIGGER USER;
ALTER TABLE "contractServices" DISABLE TRIGGER USER;
ALTER TABLE "projectServices" DISABLE TRIGGER USER;
INSERT INTO "quotationServices" (id, "quotationId", "serviceName", "basePrice", quantity, vat, "currencyId", status) VALUES
  (998400000000111, 998400000000101, 'Liquor licence', 200, 1, 10, money_base_currency_id(), NULL),
  (998400000000112, 998400000000101, 'Dropped', 100, 1, 0, money_base_currency_id(), 'deleted');
INSERT INTO "projectServices" (id, "projectId", "serviceName", "serviceType", "basePrice", vat, "currencyId") VALUES
  (998400000000311, 998400000000301, 'Liquor licence', 'Licence', 200, 10, 998400000000002),
  (998400000000312, 998400000000302, 'Billed licence', NULL, 200, 10, 998400000000002);
INSERT INTO "contractServices" (id, "contractId", "projectServiceId", "quotationServiceId", "serviceName", "basePrice", quantity, vat, "currencyId", "lineStatus") VALUES
  (998400000000211, 998400000000201, 998400000000311, 998400000000111, 'Liquor licence', 200, 3, 10, money_base_currency_id(), NULL),
  (998400000000212, 998400000000202, 998400000000312, NULL, 'Billed licence', 200, 1, 10, money_base_currency_id(), NULL),
  (998400000000213, 998400000000201, NULL, NULL, 'Cancelled, worked on', 100, 1, 0, money_base_currency_id(), 'cancelled');
ALTER TABLE "quotationServices" ENABLE TRIGGER USER;
ALTER TABLE "contractServices" ENABLE TRIGGER USER;
ALTER TABLE "projectServices" ENABLE TRIGGER USER;
INSERT INTO "paymentRequests" (id, "contractId", status, "requestedAmount") VALUES (998400000000501, 998400000000202, 'active', 100);
INSERT INTO tasks (id, title, status, "projectId", "quotationServiceId") VALUES (998400000000601, 'Template task', 'toDo', 998400000000301, 998400000000112);
INSERT INTO tasks (id, title, status, "projectId", "contractServiceId") VALUES (998400000000602, 'Started', 'inProgress', 998400000000301, 998400000000213);

DO $$
DECLARE r RECORD; v_thread bigint;
BEGIN
  CREATE TEMP TABLE bt_result ON COMMIT DROP AS SELECT * FROM service_thread_backfill_run();

  SELECT "serviceThreadId" INTO v_thread FROM "contractServices" WHERE id = 998400000000211;
  IF v_thread IS NULL OR (SELECT count(*) FROM money_thread_lines(v_thread)) <> 3 THEN
    RAISE EXCEPTION 'FAIL: the quotation, contract and case lines form one thread';
  END IF;
  IF (SELECT "quotationServiceId" FROM "projectServices" WHERE id = 998400000000311) <> 998400000000111 THEN
    RAISE EXCEPTION 'FAIL: the case line links its quotation line';
  END IF;
  -- currency lost on the contract / quotation line: back to the case line's
  IF (SELECT "currencyId" FROM "contractServices" WHERE id = 998400000000211) <> 998400000000002
     OR (SELECT "currencyId" FROM "quotationServices" WHERE id = 998400000000111) <> 998400000000002 THEN
    RAISE EXCEPTION 'FAIL: the contract and quotation lines take the case line''s currency';
  END IF;
  -- content filled from the thread (no value is wiped)
  SELECT * INTO r FROM "projectServices" WHERE id = 998400000000311;
  IF r.quantity <> 3 OR (SELECT "serviceType" FROM "contractServices" WHERE id = 998400000000211) <> 'Licence' THEN
    RAISE EXCEPTION 'FAIL: quantity and service type are filled from the thread (got %, %)', r.quantity,
      (SELECT "serviceType" FROM "contractServices" WHERE id = 998400000000211);
  END IF;
  IF r."totalAmount" IS DISTINCT FROM (SELECT "totalAmount" FROM "contractServices" WHERE id = 998400000000211) THEN
    RAISE EXCEPTION 'FAIL: the case and contract lines end with the same amount';
  END IF;
  -- billed: listed, not changed
  IF (SELECT "currencyId" FROM "contractServices" WHERE id = 998400000000212) <> money_base_currency_id()
     OR NOT EXISTS (SELECT 1 FROM bt_result WHERE record_id = 998400000000212 AND step LIKE '%billed%') THEN
    RAISE EXCEPTION 'FAIL: a billed contract''s line is listed, not changed';
  END IF;
  -- deleted / cancelled lines: destroyed unless worked on
  IF EXISTS (SELECT 1 FROM "quotationServices" WHERE id = 998400000000112) OR EXISTS (SELECT 1 FROM tasks WHERE id = 998400000000601) THEN
    RAISE EXCEPTION 'FAIL: a deleted line with an untouched task is destroyed with it';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "contractServices" WHERE id = 998400000000213)
     OR NOT EXISTS (SELECT 1 FROM bt_result WHERE record_id = 998400000000213 AND step LIKE '%kept%') THEN
    RAISE EXCEPTION 'FAIL: a cancelled line with a task in progress is kept and listed';
  END IF;
  IF EXISTS (SELECT 1 FROM service_thread_violations
             WHERE record_id IN (998400000000111, 998400000000211, 998400000000311)) THEN
    RAISE EXCEPTION 'FAIL: the fixed thread is consistent';
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'ALL SERVICE THREAD BACKFILL CHECKS PASSED'; END $$;
ROLLBACK;
```

- [ ] **Step 2: run.** Expected: FAIL (`service_thread_backfill_run` does not exist).
- [ ] **Step 3: implement** the view and the function:

```sql
-- ---- 8. Audit
CREATE OR REPLACE VIEW public.service_thread_violations AS
WITH lines AS (
  SELECT 'quotationServices'::text AS table_name, l.id, l."serviceThreadId" AS thread_id, to_jsonb(l) AS j FROM "quotationServices" l
  UNION ALL SELECT 'contractServices', l.id, l."serviceThreadId", to_jsonb(l) FROM "contractServices" l
  UNION ALL SELECT 'projectServices', l.id, l."serviceThreadId", to_jsonb(l) FROM "projectServices" l
)
SELECT 'thread_missing'::text AS rule, table_name, id AS record_id, thread_id, 'line without a service thread'::text AS detail
FROM lines WHERE thread_id IS NULL
UNION ALL
SELECT 'thread_content_mismatch', b.table_name, b.id, b.thread_id,
       format('differs from %s #%s: %s', a.table_name, a.id, x.s)
FROM lines a
JOIN lines b ON b.thread_id = a.thread_id
  AND (money_thread_table_order(a.table_name), a.id) < (money_thread_table_order(b.table_name), b.id)
CROSS JOIN LATERAL (
  SELECT string_agg(d.field || ' ' || COALESCE(d.old_value, '∅') || ' / ' || COALESCE(d.new_value, '∅'), '; ') AS s
  FROM money_thread_diff(a.table_name, a.j, b.table_name, b.j) d) x
WHERE x.s IS NOT NULL;

-- ---- 9. Older lines (spec §9). Writes with the sync flag on (no spreading,
-- no refusal); returns what it did, row by row. The preview runs it inside a
-- rolled-back transaction.
CREATE OR REPLACE FUNCTION public.service_thread_backfill_run()
RETURNS TABLE (step text, table_name text, record_id bigint, detail text)
LANGUAGE plpgsql AS $f$
DECLARE
  n1 bigint; n2 bigint; n3 bigint;
  r RECORD;
  t RECORD;
  v_thread bigint;
  v_billed text;
  v_canon jsonb;
  v_patch jsonb;
  v_task text;
  k text;
BEGIN
  PERFORM set_config('money.thread_sync', 'on', true);

  -- 1. links
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

  -- 2. threads: connected components over the links (smallest id wins)
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
    SELECT l.table_name AS tbl, l.id, ps."currencyId" AS cur, l.j
    FROM "projectServices" ps
    JOIN LATERAL money_thread_lines(ps."serviceThreadId") l ON l.table_name <> 'projectServices'
    WHERE NOT money_is_base(ps."currencyId") AND NOT money_thread_is_package(to_jsonb(ps))
      AND NOT money_thread_is_package(l.j)
      AND money_is_base(NULLIF(l.j->>'currencyId', '')::bigint)
      AND NULLIF(l.j->>'basePrice', '')::numeric IS NOT DISTINCT FROM ps."basePrice"::numeric
  LOOP
    v_billed := money_thread_billed_contract(NULLIF(r.j->>'serviceThreadId', '')::bigint);
    IF v_billed IS NOT NULL THEN
      step := 'currency (billed ' || v_billed || ', not changed)'; table_name := r.tbl; record_id := r.id;
      detail := 'VND -> ' || money_currency_code(r.cur); RETURN NEXT;
    ELSE
      PERFORM money_thread_apply(r.tbl, r.id, jsonb_build_object('currencyId', r.cur, 'exchangeRateToBase', NULL));
      step := 'currency'; table_name := r.tbl; record_id := r.id;
      detail := 'VND -> ' || money_currency_code(r.cur); RETURN NEXT;
    END IF;
  END LOOP;

  -- 4. content: per field, the first value found in contract, case, then
  --    quotation lines (price / quantity / VAT / currency / combo within the
  --    same pricing); a missing value never wipes one
  FOR v_thread IN
    SELECT DISTINCT x.th FROM (
      SELECT "serviceThreadId" AS th FROM "quotationServices"
      UNION SELECT "serviceThreadId" FROM "contractServices"
      UNION SELECT "serviceThreadId" FROM "projectServices") x
    WHERE (SELECT count(*) FROM money_thread_lines(x.th)) > 1
  LOOP
    v_billed := money_thread_billed_contract(v_thread);
    FOR t IN SELECT l.* FROM money_thread_lines(v_thread) l ORDER BY money_thread_table_order(l.table_name), l.id LOOP
      v_canon := '{}';
      FOREACH k IN ARRAY ARRAY['serviceId', 'serviceName', 'serviceType', 'description',
                               'basePrice', 'quantity', 'vat', 'currencyId', 'comboId', 'comboName'] LOOP
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
      FOREACH k IN ARRAY ARRAY['serviceId', 'serviceName', 'serviceType', 'description',
                               'basePrice', 'quantity', 'vat', 'currencyId', 'comboId', 'comboName'] LOOP
        IF v_canon->k IS NOT NULL AND v_canon->k <> 'null'::jsonb
           AND v_canon->k IS DISTINCT FROM money_thread_content(t.table_name, t.j)->k
           AND (k IN ('serviceId', 'serviceName', 'serviceType', 'description') OR NOT (k = 'quantity' AND (v_canon->>k)::numeric = 1 AND NULLIF(t.j->>'quantity', '') IS NULL)) THEN
          v_patch := v_patch || jsonb_build_object(money_thread_column(t.table_name, k), v_canon->k);
        END IF;
      END LOOP;
      IF v_patch <> '{}' THEN
        IF v_billed IS NOT NULL THEN
          step := 'content (billed ' || v_billed || ', not changed)'; table_name := t.table_name; record_id := t.id;
          detail := v_patch::text; RETURN NEXT;
        ELSE
          PERFORM money_thread_apply(t.table_name, t.id, v_patch);
          step := 'content'; table_name := t.table_name; record_id := t.id; detail := v_patch::text; RETURN NEXT;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  -- 5. lines marked deleted / cancelled: destroyed on their own, unless a task has progress
  FOR r IN
    SELECT 'quotationServices'::text AS tbl, l.id FROM "quotationServices" l WHERE lower(COALESCE(l.status, '')) IN ('deleted', 'cancelled', 'canceled')
    UNION ALL SELECT 'contractServices', l.id FROM "contractServices" l WHERE lower(COALESCE(l."lineStatus", '')) IN ('deleted', 'cancelled', 'canceled')
    UNION ALL SELECT 'projectServices', l.id FROM "projectServices" l WHERE lower(COALESCE(l.status, '')) IN ('deleted', 'cancelled', 'canceled')
  LOOP
    v_task := money_thread_task_in_progress(r.tbl, r.id, NULL);
    IF v_task IS NOT NULL THEN
      step := 'deleted line kept (task in progress)'; table_name := r.tbl; record_id := r.id; detail := v_task; RETURN NEXT;
    ELSE
      PERFORM money_thread_delete_dependents(r.tbl, r.id);
      EXECUTE format('DELETE FROM %I WHERE id = $1', r.tbl) USING r.id;
      step := 'deleted line destroyed'; table_name := r.tbl; record_id := r.id; detail := NULL; RETURN NEXT;
    END IF;
  END LOOP;

  PERFORM set_config('money.thread_sync', 'off', true);

  -- 6. rates and amounts (pgsql/money_flow_foundation.sql)
  RETURN QUERY SELECT 'money: ' || b.step, NULL::text, NULL::bigint, b.affected::text FROM money_backfill_run() b;
END;
$f$;
```

  Runner files:

```sql
-- pgsql/service_thread_backfill_preview.sql
-- ============================================================
-- Service thread backfill PREVIEW: runs service_thread_backfill_run() inside
-- a transaction that is rolled back, then lists what it did and what the
-- audit would still show. Nothing is kept.
-- ============================================================
BEGIN;
CREATE TEMP TABLE st_preview AS SELECT * FROM service_thread_backfill_run();
SELECT step, count(*) AS rows FROM st_preview GROUP BY step ORDER BY step;
SELECT * FROM st_preview WHERE step NOT LIKE 'money:%' ORDER BY step, table_name, record_id;
SELECT rule, count(*) FROM service_thread_violations GROUP BY rule;
SELECT rule, count(*) FROM money_consistency_violations GROUP BY rule;
ROLLBACK;
```

```sql
-- pgsql/service_thread_backfill.sql
-- ============================================================
-- Service thread backfill (writes). Review pgsql/service_thread_backfill_preview.sql first.
-- ============================================================
BEGIN;
-- the same function is also registered as trigger_auto_create_tasks (INSERT and UPDATE)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_auto_create_tasks' AND tgrelid = '"projectServices"'::regclass) THEN
    DROP TRIGGER IF EXISTS trg_auto_create_tasks ON "projectServices";
  END IF;
END $$;
SELECT step, table_name, record_id, detail FROM service_thread_backfill_run();
COMMIT;
```

  `money_consistency_audit.sql`: add `SELECT rule, table_name, record_id, thread_id, detail FROM service_thread_violations ORDER BY rule, table_name, record_id;`.
- [ ] **Step 4: run** both new tests and the regression. Expected: PASSED.

### Task 7: NocoBase registration script

**Files:** Create `JsField/RegisterServiceThreadFields.js`, `scripts/tests/service-thread-fields.test.js`; add the script to `scripts/tests/parse-blocks.js`.

- [ ] **Step 1: failing test:**

```js
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// 2026-09-29: the service-thread columns and the history collection must be
// known to NocoBase, or the API drops them.
const src = fs.readFileSync(path.resolve(__dirname, "../../JsField/RegisterServiceThreadFields.js"), "utf8");
for (const c of ["quotationServices", "contractServices", "projectServices"]) {
  assert.ok(new RegExp(`\\["${c}", bigIntField\\("serviceThreadId"`).test(src), `${c}.serviceThreadId`);
}
assert.ok(/\["contractServices", stringField\("serviceType"/.test(src), "contractServices.serviceType");
assert.ok(/\["projectServices", numberField\("quantity"/.test(src), "projectServices.quantity");
assert.ok(/name: "serviceChangeLogs"/.test(src) && /collections:create/.test(src), "serviceChangeLogs collection");
for (const f of ["serviceThreadId", "action", "tableName", "recordId", "documentType", "documentId", "fieldName", "oldValue", "newValue", "originLogId"]) {
  assert.ok(src.includes(`"${f}"`), `history field ${f}`);
}
assert.ok(/\[skip\]/.test(src), "idempotent");
console.log("service-thread-fields: all tests passed");
```

- [ ] **Step 2: run** `node scripts/tests/service-thread-fields.test.js`. Expected: ENOENT.
- [ ] **Step 3: implement** `JsField/RegisterServiceThreadFields.js`:

```js
// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Registers what pgsql/service_thread_sync.sql adds
// (docs/superpowers/specs/2026-09-29-service-thread-sync-design.md):
//   serviceThreadId on quotationServices / contractServices / projectServices,
//   contractServices.serviceType, projectServices.quantity, and the history
//   collection serviceChangeLogs (read-only; the database writes it).
// How to run: AFTER pgsql/service_thread_sync.sql, paste into a temporary
// JS Block / the browser console on an admin page (ctx in scope). Idempotent.
// ============================================================
const bigIntField = (name, title) => ({
  name, type: "bigInt", interface: "integer",
  uiSchema: { type: "number", "x-component": "InputNumber", "x-component-props": { stringMode: true, step: "1" }, title },
});
const stringField = (name, title) => ({
  name, type: "string", interface: "input",
  uiSchema: { type: "string", "x-component": "Input", title },
});
const numberField = (name, title) => ({
  name, type: "double", interface: "number",
  uiSchema: { type: "number", "x-component": "InputNumber", "x-component-props": { stringMode: true, step: "1" }, title },
});
const textField = (name, title) => ({
  name, type: "text", interface: "textarea",
  uiSchema: { type: "string", "x-component": "Input.TextArea", title },
});
const dateField = (name, title) => ({
  name, type: "date", interface: "datetime",
  uiSchema: { type: "string", "x-component": "DatePicker", "x-component-props": { showTime: true }, title },
});

const LINE_FIELDS = [
  ["quotationServices", bigIntField("serviceThreadId", "Service Thread")],
  ["contractServices", bigIntField("serviceThreadId", "Service Thread")],
  ["projectServices", bigIntField("serviceThreadId", "Service Thread")],
  ["contractServices", stringField("serviceType", "Service Type")],
  ["projectServices", numberField("quantity", "Quantity")],
];

const listFields = async (collectionName) => {
  const res = await ctx.api.request({ url: `collections/${collectionName}/fields:list`, params: { paginate: false } });
  return res?.data?.data || [];
};
const registerField = async (collectionName, field) => {
  if ((await listFields(collectionName)).some((f) => f.name === field.name)) {
    console.log(`[skip] ${collectionName}.${field.name} already registered`);
    return;
  }
  await ctx.api.request({ url: `collections/${collectionName}/fields:create`, method: "POST", data: field });
  console.log(`[created] ${collectionName}.${field.name}`);
};

for (const [collectionName, field] of LINE_FIELDS) {
  await registerField(collectionName, field);
}

const HISTORY_FIELDS = [
  bigIntField("serviceThreadId", "Service Thread"),
  stringField("action", "Action"),
  stringField("tableName", "Table"),
  bigIntField("recordId", "Line"),
  stringField("documentType", "Document Type"),
  bigIntField("documentId", "Document"),
  stringField("fieldName", "Field"),
  textField("oldValue", "Old Value"),
  textField("newValue", "New Value"),
  bigIntField("originLogId", "Spread From"),
];
const existing = await ctx.api.request({ url: "collections:list", params: { paginate: false, filter: { name: "serviceChangeLogs" } } });
if ((existing?.data?.data || []).length) {
  console.log("[skip] collection serviceChangeLogs already registered");
  for (const field of HISTORY_FIELDS) await registerField("serviceChangeLogs", field);
} else {
  await ctx.api.request({
    url: "collections:create",
    method: "POST",
    data: {
      name: "serviceChangeLogs",
      title: "Service Change Logs",
      autoGenId: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      updatedBy: false,
      fields: HISTORY_FIELDS,
    },
  });
  console.log("[created] collection serviceChangeLogs");
}
console.log("[done] service thread fields");
```

  (`dateField` is not needed: `createdAt` comes with the collection — drop the helper.)
- [ ] **Step 4: run** the test and `node scripts/tests/parse-blocks.js`. Expected: passed.

### Task 8: JS — database messages and the history block

**Files:** Modify `All Module/Quotation/QuotationServices.js`, `All Module/Contract/ContractServices.js`, `All Module/Contract/ContractDetailView.js`, `All Module/Case/CaseServices.js` (their save / delete `catch` blocks); Create `All Module/Service/ServiceChangeLog.js`; Create `scripts/tests/service-thread-js.test.js`; add the new block to `parse-blocks.js`.

- [ ] **Step 1: failing test:**

```js
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { extractMarkedBlock } = require("./extract-marked-block");

// 2026-09-29: a save / delete refused by the database (billed contract,
// task in progress) shows the database's message, not "Request failed".
const root = path.resolve(__dirname, "../..");
const BLOCKS = [
  "All Module/Quotation/QuotationServices.js",
  "All Module/Contract/ContractServices.js",
  "All Module/Contract/ContractDetailView.js",
  "All Module/Case/CaseServices.js",
];
for (const rel of BLOCKS) {
  const { apiErrorText } = extractMarkedBlock(path.join(root, rel),
    "// ---- api error text (pure; tested by scripts/tests/service-thread-js.test.js) ----",
    "// ---- end api error text ----", ["apiErrorText"], {});
  const refused = { response: { data: { errors: [{ message: 'Dịch vụ "A" thuộc hợp đồng HĐ-1 đã phát sinh thanh toán — không thể sửa.' }] } }, message: "Request failed with status code 500" };
  assert.equal(apiErrorText(refused, "x"), 'Dịch vụ "A" thuộc hợp đồng HĐ-1 đã phát sinh thanh toán — không thể sửa.', rel);
  assert.equal(apiErrorText({ message: "boom" }, "x"), "boom", rel);
  assert.equal(apiErrorText(null, "fallback"), "fallback", rel);
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  assert.ok((src.match(/apiErrorText\(/g) || []).length >= 3, `${rel}: save and delete errors use apiErrorText`);
}
// the history block reads serviceChangeLogs for the current document and its threads
const log = fs.readFileSync(path.join(root, "All Module/Service/ServiceChangeLog.js"), "utf8");
assert.match(log, /serviceChangeLogs:list/);
assert.match(log, /serviceThreadId/);
assert.match(log, /documentType/);
console.log("service-thread-js: all tests passed");
```

- [ ] **Step 2: run.** Expected: markers not found.
- [ ] **Step 3: implement.** In each of the four blocks, near the top (after `parseNum`):

```js
// ---- api error text (pure; tested by scripts/tests/service-thread-js.test.js) ----
// A request the database refused (a billed contract, a task in progress —
// pgsql/service_thread_sync.sql) carries its reason in errors[0].message.
const apiErrorText = (error, fallback) =>
  error?.response?.data?.errors?.[0]?.message || error?.message || fallback;
// ---- end api error text ----
```

  and every `catch (e)` of the save handler and of the service destroy calls shows `apiErrorText(e, "…")` (the message it had becomes the fallback). The save handler stops at the first refused write (`throw` after the message) instead of carrying on with the cascade.

  `All Module/Service/ServiceChangeLog.js` — a read-only JS Block for the quotation / contract / case detail pages:
  - document from `ctx.record` (`contractCode` → contract, `caseCode` / `projectName` → case, else quotation);
  - loads the document's lines (`quotationServices` / `contractServices` / `projectServices` by `quotationId` / `contractId` / `projectId`) to get their `serviceThreadId`s, then `serviceChangeLogs:list` with `$or: [{ documentType, documentId }, { serviceThreadId: { $in: threads } }]`, sort `-createdAt`, `appends: ["createdBy"]`, page size 200;
  - antd `Table` (time, user, where: document type + id, field, old → new, a "lan từ #origin" tag when `originLogId`), `scroll: { x: "max-content" }`; below 640 px wide a `List` of cards instead;
  - English UI labels (the rest of the block library), Vietnamese is fine for field names only.
- [ ] **Step 4: run** the test, `node scripts/tests/parse-blocks.js`, the node regression. Expected: passed.

### Task 9: Run on the local copy `nocobase-law`

**Files:** none (commands only); results into the ledger.

- [ ] **Step 1:** apply, in order, on `nocobase-law`: `money_flow_foundation.sql`, `money_flow_trail.sql`, `service_thread_sync.sql`. Expected: no error.
- [ ] **Step 2:** `service_thread_backfill_preview.sql`. Expected: the lines found in the review (11 currency rows of which 264 / 265 billed; quantity / type fills; the 12 deleted lines) and no error.
- [ ] **Step 3:** `service_thread_backfill.sql`, then `money_consistency_audit.sql`. Expected: remaining rows only for billed contracts, orphans and listed decisions.
- [ ] **Step 4:** run `pgsql/tests/service_thread_test.sql`, `service_thread_backfill_test.sql` and the money tests on the copy (BEGIN … ROLLBACK). Expected: all PASSED.
- [ ] **Step 5:** scenario checks on real threads inside `BEGIN … ROLLBACK`: edit a name on a quotation line of contract 301/302/306's quotation (spreads to 3 contracts + case), edit a price on a case line of an unbilled contract, edit / destroy a line of a billed contract (refused), destroy a thread with untouched tasks.
