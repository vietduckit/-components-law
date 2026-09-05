# Contract & Case Payment Status Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every contract a correct `paymentStatus` (unpaid/partial/paid) regardless of fee model, mirror it onto the linked Case, and automatically create a Payment Request for accounting when a Case is marked `done` while its contract still owes money — all deployed as one idempotent SQL migration so it survives a dev-database restore and can be applied to any environment without manual UI steps.

**Architecture:** Pure Postgres — one `STABLE` SQL function (`contract_resolved_total`) as the single fallback-aware "what is this contract worth" formula, plus 4 triggers that chain payment → contract → case → payment-request. No NocoBase Workflow rows (their in-memory cache doesn't reload on API-applied edits — the exact failure mode that lost the first implementation this session). A short companion script (run the way this repo's other one-time migration scripts run — pasted into a temporary Nocobase Action block / browser console using `ctx.api.request()`) registers the 2 new columns as proper Nocobase `select` fields afterward, since Nocobase's field/UI metadata lives in its own tables and a raw `ALTER TABLE` alone doesn't make the admin UI aware of a column.

**Tech Stack:** Postgres 14+ PL/pgSQL (functions, triggers), run via `psql -f`. Nocobase field registration via `ctx.api.request()` (same pattern as `JsField/BackfillCaseServiceFolderTemplateKey.js`), pasted into a temporary Action block or the browser console.

**Spec:** [docs/superpowers/specs/2026-09-05-contract-payment-status-workflow-design.md](../specs/2026-09-05-contract-payment-status-workflow-design.md)

## Global Constraints

- Every DDL/DML statement in the migration file must be safe to run twice in a row with no error and no double-effect: `ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS` immediately before every `CREATE TRIGGER`.
- Postgres versions in use here don't reliably support `CREATE OR REPLACE TRIGGER` — always `DROP TRIGGER IF EXISTS <name> ON <table>;` on its own line right before `CREATE TRIGGER <name> ...`, never rely on `OR REPLACE` for triggers.
- The fallback formula (`totalAmount → fixedAmount → subTotal+vatAmount → monthlyFee×retainerDuration → 0`) lives in exactly one place — the `contract_resolved_total(bigint)` function. No trigger re-derives it inline.
- `payments`-table triggers must fire only when `paymentStatus` is the column that actually changed (`UPDATE OF "paymentStatus"` in the trigger definition, or an equivalent `NEW."paymentStatus" IS DISTINCT FROM OLD."paymentStatus"` guard on UPDATE) — touching an unrelated column like `internalNote` must not trigger recomputation. This was the exact gotcha hit repairing test data this session.
- `projects`-table auto-Payment-Request trigger must fire only on the transition *into* `'done'` (`NEW.status = 'done' AND OLD.status IS DISTINCT FROM 'done'`), not on every save of an already-`done` case.
- Auto-created `paymentRequests` rows leave `assignedToId` NULL — confirmed against the 3 existing rows in the restored data that there's no default-assignment convention to follow.
- DB connection for all manual verification in this plan: `PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law` (matches `nocobase/.env` in this environment). If a different environment is used, substitute its own credentials — nothing in the SQL file itself is environment-specific.

---

## Task 1: Schema columns + the single source-of-truth total function

**Files:**
- Create: `pgsql/contract_payment_status_workflow.sql`

**Interfaces:**
- Produces: `contracts.outStandingAmount` (double precision), `contracts.paymentStatus` (varchar), `projects.paymentStatus` (varchar), `public.contract_resolved_total(p_contract_id BIGINT) RETURNS NUMERIC` — every later task's triggers call this function and read/write these 3 columns.

- [ ] **Step 1: Write the column additions and the function**

  Create `pgsql/contract_payment_status_workflow.sql` with this content:

  ```sql
  -- ============================================================
  -- Contract & Case Payment Status Workflow
  -- See docs/superpowers/specs/2026-09-05-contract-payment-status-workflow-design.md
  --
  -- Idempotent: every statement in this file is safe to run again on a
  -- database that already has some or all of it applied.
  -- ============================================================

  -- ---- Schema: additive columns -------------------------------------------
  ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "outStandingAmount" double precision DEFAULT 0;
  ALTER TABLE contracts ADD COLUMN IF NOT EXISTS "paymentStatus" character varying(255) DEFAULT 'unpaid';
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS "paymentStatus" character varying(255) DEFAULT 'unpaid';

  -- ---- Single source of truth: what is this contract worth? --------------
  -- Mirrors the fallback chain already implemented independently in
  -- PaymentCreateBlock.js / PaymentContractDetailBlock.js /
  -- PaymentRequestCreateBlock.js's contractTotalAmount()/contractMoneyInfo(),
  -- restricted to the fields that actually exist as columns on `contracts`.
  CREATE OR REPLACE FUNCTION public.contract_resolved_total(p_contract_id BIGINT)
  RETURNS NUMERIC
  LANGUAGE sql
  STABLE
  AS $function$
    SELECT COALESCE(
      NULLIF(c."totalAmount", 0),
      NULLIF(c."fixedAmount", 0),
      NULLIF(c."subTotal", 0) + COALESCE(c."vatAmount", 0),
      NULLIF(c."monthlyFee", 0) * NULLIF(c."retainerDuration", 0),
      0
    )
    FROM contracts c
    WHERE c.id = p_contract_id;
  $function$;
  ```

- [ ] **Step 2: Apply it and verify the columns exist**

  Run: `PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -f pgsql/contract_payment_status_workflow.sql`

  Then verify:
  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "\d contracts" | grep -E "outStandingAmount|paymentStatus"
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "\d projects" | grep paymentStatus
  ```
  Expected: both `outStandingAmount` and `paymentStatus` listed for `contracts`; `paymentStatus` listed for `projects`.

- [ ] **Step 3: Verify the function against 3 fee-model shapes**

  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  SELECT contract_resolved_total(id), \"totalAmount\", \"feeModel\"
  FROM contracts ORDER BY id DESC LIMIT 3;
  "
  ```
  Expected: no error; for any row with a non-null `totalAmount`, `contract_resolved_total` equals it exactly.

  Then test the retainer fallback branch directly (no real retainer contract exists in this restored data yet):
  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  INSERT INTO contracts (\"contractName\", \"monthlyFee\", \"retainerDuration\", \"createdAt\", \"updatedAt\")
  VALUES ('plan-verify-retainer', 5000000, 4, now(), now()) RETURNING id;
  "
  ```
  Note the returned `id`, then:
  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "SELECT contract_resolved_total(<id>);"
  ```
  Expected: `20000000` (5,000,000 × 4). Leave this row in place — Task 2 re-verifies it.

- [ ] **Step 4: Run the file a second time to confirm idempotency**

  Run the same `psql -f pgsql/contract_payment_status_workflow.sql` command again.
  Expected: exits 0, no errors (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and `CREATE OR REPLACE FUNCTION` are both no-ops the second time).

- [ ] **Step 5: Commit**

  ```bash
  git add pgsql/contract_payment_status_workflow.sql
  git commit -m "feat(pgsql): contract_resolved_total function + paymentStatus columns"
  ```

---

## Task 2: Init trigger — new contract gets a correct starting balance

**Files:**
- Modify: `pgsql/contract_payment_status_workflow.sql` (append)

**Interfaces:**
- Consumes: `contract_resolved_total(bigint)` from Task 1.
- Produces: `public.contract_init_outstanding()` trigger function + `trg_contract_init_outstanding` trigger on `contracts` — nothing downstream depends on this trigger's name, only its effect (every new contract row ends up with correct `outStandingAmount`/`paymentStatus`).

- [ ] **Step 1: Append the trigger function and trigger to the same file**

  Append to `pgsql/contract_payment_status_workflow.sql`:

  ```sql
  -- ---- Trigger: initialize a new contract's balance -----------------------
  CREATE OR REPLACE FUNCTION public.contract_init_outstanding()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $function$
  BEGIN
    NEW."outStandingAmount" := contract_resolved_total(NEW.id);
    NEW."paymentStatus" := 'unpaid';
    RETURN NEW;
  END;
  $function$;

  DROP TRIGGER IF EXISTS trg_contract_init_outstanding ON contracts;
  CREATE TRIGGER trg_contract_init_outstanding
    BEFORE INSERT ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.contract_init_outstanding();
  ```

  Note this is `BEFORE INSERT` and assigns into `NEW` directly (not an `UPDATE` after the fact) — `NEW.id` is already populated by this point because `contracts.id` is a plain sequence default, not something assigned later. This avoids a second write per insert.

- [ ] **Step 2: Apply and verify on a fresh insert**

  Run: `PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -f pgsql/contract_payment_status_workflow.sql`

  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  INSERT INTO contracts (\"contractName\", \"totalAmount\", \"createdAt\", \"updatedAt\")
  VALUES ('plan-verify-fixed', 12345678, now(), now())
  RETURNING id, \"outStandingAmount\", \"paymentStatus\";
  "
  ```
  Expected: `outStandingAmount = 12345678`, `paymentStatus = 'unpaid'` — set automatically, with no explicit values supplied in the `INSERT`.

- [ ] **Step 3: Re-verify the Task 1 retainer row now also self-corrects on a fresh insert of the same shape**

  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  INSERT INTO contracts (\"contractName\", \"monthlyFee\", \"retainerDuration\", \"createdAt\", \"updatedAt\")
  VALUES ('plan-verify-retainer-2', 5000000, 4, now(), now())
  RETURNING id, \"outStandingAmount\", \"paymentStatus\";
  "
  ```
  Expected: `outStandingAmount = 20000000`, `paymentStatus = 'unpaid'` — this is the exact retainer-contract case that was permanently `NULL` in the previous (lost) implementation. Keep this row — Task 3 reuses it.

- [ ] **Step 4: Commit**

  ```bash
  git add pgsql/contract_payment_status_workflow.sql
  git commit -m "feat(pgsql): trigger to init outStandingAmount/paymentStatus on new contract"
  ```

---

## Task 3: Payment-received trigger — recompute the contract

**Files:**
- Modify: `pgsql/contract_payment_status_workflow.sql` (append)

**Interfaces:**
- Consumes: `contract_resolved_total(bigint)` from Task 1; reads `payments."contractId"`, `payments.amount`, `payments."paymentStatus"`.
- Produces: `public.contract_recompute_outstanding()` trigger function + `trg_payment_recompute_contract` trigger on `payments` — writes `contracts."outStandingAmount"`/`contracts."paymentStatus"` for the affected `contractId`. Task 4's trigger fires off this trigger's `UPDATE` of `contracts.paymentStatus`.

- [ ] **Step 1: Append the trigger function and trigger**

  Append to `pgsql/contract_payment_status_workflow.sql`:

  ```sql
  -- ---- Trigger: recompute the contract whenever a payment's status changes -
  CREATE OR REPLACE FUNCTION public.contract_recompute_outstanding()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $function$
  DECLARE
    v_contract_id BIGINT;
    v_total NUMERIC;
    v_received NUMERIC;
  BEGIN
    v_contract_id := COALESCE(NEW."contractId", OLD."contractId");
    IF v_contract_id IS NULL THEN
      RETURN COALESCE(NEW, OLD);
    END IF;

    v_total := contract_resolved_total(v_contract_id);

    SELECT COALESCE(SUM(p.amount), 0) INTO v_received
    FROM payments p
    WHERE p."contractId" = v_contract_id
      AND LOWER(p."paymentStatus") = 'received';

    UPDATE contracts
    SET "outStandingAmount" = v_total - v_received,
        "paymentStatus" = CASE
          WHEN (v_total - v_received) <= 0 THEN 'paid'
          WHEN v_received > 0 THEN 'partial'
          ELSE 'unpaid'
        END
    WHERE id = v_contract_id;

    RETURN COALESCE(NEW, OLD);
  END;
  $function$;

  DROP TRIGGER IF EXISTS trg_payment_recompute_contract ON payments;
  CREATE TRIGGER trg_payment_recompute_contract
    AFTER INSERT OR UPDATE OF "paymentStatus" ON payments
    FOR EACH ROW
    EXECUTE FUNCTION public.contract_recompute_outstanding();
  ```

  `AFTER INSERT OR UPDATE OF "paymentStatus"` is what makes the "only fires when paymentStatus is the column that changed" constraint hold for `UPDATE`s — Postgres only fires an `UPDATE OF <col>` trigger when that column is present in the `SET` clause, regardless of whether its value actually differs. Combined with `INSERT` always having a `paymentStatus` (the column has a `'received'::character varying` default per the existing schema), this covers "a brand new payment" and "an existing payment's status changed" without covering "someone edited `internalNote`".

- [ ] **Step 2: Apply and verify partial payment**

  Run: `PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -f pgsql/contract_payment_status_workflow.sql`

  Using the retainer contract id from Task 2 Step 3 (`outStandingAmount = 20000000`):
  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  INSERT INTO payments (\"contractId\", amount, \"paymentStatus\", \"createdAt\", \"updatedAt\")
  VALUES (<retainer_id>, 8000000, 'received', now(), now());
  "
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  SELECT \"outStandingAmount\", \"paymentStatus\" FROM contracts WHERE id = <retainer_id>;
  "
  ```
  Expected: `outStandingAmount = 12000000`, `paymentStatus = 'partial'`.

- [ ] **Step 3: Verify full payment flips to paid**

  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  INSERT INTO payments (\"contractId\", amount, \"paymentStatus\", \"createdAt\", \"updatedAt\")
  VALUES (<retainer_id>, 12000000, 'received', now(), now());
  "
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  SELECT \"outStandingAmount\", \"paymentStatus\" FROM contracts WHERE id = <retainer_id>;
  "
  ```
  Expected: `outStandingAmount = 0`, `paymentStatus = 'paid'`.

- [ ] **Step 4: Verify touching an unrelated column does NOT recompute**

  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  UPDATE payments SET \"internalNote\" = 'plan verification note'
  WHERE \"contractId\" = <retainer_id> AND amount = 8000000;
  "
  ```
  Expected: command completes with no error; re-running the Step 3 `SELECT` still shows the same `outStandingAmount = 0`, `paymentStatus = 'paid'` (proves the `UPDATE OF "paymentStatus"` guard is working — an unrelated-column update did not re-fire the trigger, though in this already-fully-paid case a spurious re-fire would happen to produce the same result anyway; the meaningful proof is that the `SELECT` doesn't error and the value is unchanged).

- [ ] **Step 5: Commit**

  ```bash
  git add pgsql/contract_payment_status_workflow.sql
  git commit -m "feat(pgsql): trigger to recompute contract outstanding/status on payment received"
  ```

---

## Task 4: Cascade trigger — Case mirrors its contract's payment status

**Files:**
- Modify: `pgsql/contract_payment_status_workflow.sql` (append)

**Interfaces:**
- Consumes: fires on `contracts` `UPDATE OF "paymentStatus"` (produced by Task 3's trigger).
- Produces: `public.cascade_payment_status_to_case()` trigger function + `trg_contract_cascade_case_status` trigger on `contracts` — writes `projects."paymentStatus"` for every project row whose `"contractId"` matches.

- [ ] **Step 1: Append the trigger function and trigger**

  ```sql
  -- ---- Trigger: cascade a contract's paymentStatus to its linked Case -----
  CREATE OR REPLACE FUNCTION public.cascade_payment_status_to_case()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $function$
  BEGIN
    UPDATE projects
    SET "paymentStatus" = NEW."paymentStatus"
    WHERE "contractId" = NEW.id;
    RETURN NEW;
  END;
  $function$;

  DROP TRIGGER IF EXISTS trg_contract_cascade_case_status ON contracts;
  CREATE TRIGGER trg_contract_cascade_case_status
    AFTER UPDATE OF "paymentStatus" ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION public.cascade_payment_status_to_case();
  ```

- [ ] **Step 2: Apply and verify against the retainer contract's linked case**

  Run: `PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -f pgsql/contract_payment_status_workflow.sql`

  Link a test case to the Task 2/3 retainer contract (already `paymentStatus = 'paid'` at this point) and confirm the cascade fires immediately on link... actually the cascade only fires on the *contract's* `paymentStatus` changing, not on `projects."contractId"` being set — so link first, then force a no-op recompute to trigger the cascade:
  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  INSERT INTO projects (\"projectName\", status, \"contractId\", \"createdAt\", \"updatedAt\")
  VALUES ('plan-verify-case', 'toDo', <retainer_id>, now(), now())
  RETURNING id;
  "
  ```
  Note the returned project id, then re-fire the contract's own status recompute so the freshly-linked case picks it up:
  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  UPDATE contracts SET \"paymentStatus\" = \"paymentStatus\" WHERE id = <retainer_id>;
  "
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  SELECT \"paymentStatus\" FROM projects WHERE id = <project_id>;
  "
  ```
  Expected: `paid` (matches the contract). Note: `SET "paymentStatus" = "paymentStatus"` (assigning a column to itself) still counts as that column being present in the `UPDATE`'s column list, so `UPDATE OF "paymentStatus"` still fires — this is intentional and is the correct way to force a re-cascade after linking a new case to an already-recomputed contract; it is not something the app needs to do routinely, since Task 3's trigger already fires the cascade automatically on every real payment-driven change.

- [ ] **Step 3: Verify a full realistic path — record a payment on a fresh contract that already has its case linked at creation time**

  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  INSERT INTO contracts (\"contractName\", \"totalAmount\", \"createdAt\", \"updatedAt\")
  VALUES ('plan-verify-cascade-2', 5000000, now(), now())
  RETURNING id;
  "
  ```
  Note the id (`<c2_id>`), then:
  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  INSERT INTO projects (\"projectName\", status, \"contractId\", \"createdAt\", \"updatedAt\")
  VALUES ('plan-verify-case-2', 'toDo', <c2_id>, now(), now())
  RETURNING id;
  "
  ```
  Note the id (`<p2_id>`), then pay it in full:
  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  INSERT INTO payments (\"contractId\", amount, \"paymentStatus\", \"createdAt\", \"updatedAt\")
  VALUES (<c2_id>, 5000000, 'received', now(), now());
  "
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  SELECT \"paymentStatus\" FROM projects WHERE id = <p2_id>;
  "
  ```
  Expected: `paid` — reached via the real path (payment → contract recompute → cascade), with zero manual "self-update" step. This is the path the app will actually exercise; Step 2's self-update trick was only needed there because the case was linked *after* the contract had already stopped changing.

- [ ] **Step 4: Commit**

  ```bash
  git add pgsql/contract_payment_status_workflow.sql
  git commit -m "feat(pgsql): trigger to cascade contract paymentStatus to linked Case"
  ```

---

## Task 5: Auto-create Payment Request when a Case is marked done unpaid

**Files:**
- Modify: `pgsql/contract_payment_status_workflow.sql` (append)

**Interfaces:**
- Consumes: fires on `projects` `UPDATE OF "status"`; reads `contracts.id/contractCode/contractName/customerId/internalCompanyId/paymentStatus/outStandingAmount` for `projects."contractId"`.
- Produces: `public.auto_create_payment_request_on_case_done()` trigger function + `trg_case_done_payment_request` trigger on `projects` — inserts into `"paymentRequests"`.

- [ ] **Step 1: Append the trigger function and trigger**

  ```sql
  -- ---- Trigger: auto-create a Payment Request when a Case finishes unpaid -
  CREATE OR REPLACE FUNCTION public.auto_create_payment_request_on_case_done()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $function$
  DECLARE
    v_contract RECORD;
  BEGIN
    IF NEW.status <> 'done' OR OLD.status IS NOT DISTINCT FROM 'done' THEN
      RETURN NEW;
    END IF;

    IF NEW."contractId" IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT id, "contractCode", "contractName", "customerId", "internalCompanyId",
           "paymentStatus", "outStandingAmount"
    INTO v_contract
    FROM contracts
    WHERE id = NEW."contractId";

    IF v_contract.id IS NULL OR v_contract."paymentStatus" = 'paid' THEN
      RETURN NEW;
    END IF;

    INSERT INTO "paymentRequests" (
      title, status, "contractId", "customerId", "internalCompanyId",
      "requestedAmount", "createdAt", "updatedAt"
    ) VALUES (
      'Auto: Case hoàn thành - ' || COALESCE(v_contract."contractCode", '') || ' - ' || COALESCE(v_contract."contractName", ''),
      'submitted',
      v_contract.id, v_contract."customerId", v_contract."internalCompanyId",
      v_contract."outStandingAmount",
      now(), now()
    );

    RETURN NEW;
  END;
  $function$;

  DROP TRIGGER IF EXISTS trg_case_done_payment_request ON projects;
  CREATE TRIGGER trg_case_done_payment_request
    AFTER UPDATE OF "status" ON projects
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_create_payment_request_on_case_done();
  ```

  `OLD.status IS NOT DISTINCT FROM 'done'` (rather than `OLD.status = 'done'`) correctly treats a case whose previous status was `NULL` as "was not done", so a first-ever transition into `'done'` from `NULL` still creates the request.

- [ ] **Step 2: Apply and verify — unpaid case going done creates a request**

  Run: `PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -f pgsql/contract_payment_status_workflow.sql`

  Create a fresh unpaid contract + linked case:
  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  INSERT INTO contracts (\"contractName\", \"totalAmount\", \"customerId\", \"internalCompanyId\", \"createdAt\", \"updatedAt\")
  VALUES ('plan-verify-autopr', 9000000, 382976883097602, 354546565513216, now(), now())
  RETURNING id;
  "
  ```
  (Substitute a real `customerId`/`internalCompanyId` present in the target database if these ids don't exist there — any existing `customers`/`internalCompany` row's id works.) Note the id (`<c3_id>`), then:
  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  INSERT INTO projects (\"projectName\", status, \"contractId\", \"createdAt\", \"updatedAt\")
  VALUES ('plan-verify-case-autopr', 'toDo', <c3_id>, now(), now())
  RETURNING id;
  "
  ```
  Note the id (`<p3_id>`), then mark it done:
  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  UPDATE projects SET status = 'done' WHERE id = <p3_id>;
  "
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  SELECT title, status, \"contractId\", \"assignedToId\", \"requestedAmount\"
  FROM \"paymentRequests\" WHERE \"contractId\" = <c3_id>;
  "
  ```
  Expected: exactly 1 row, `status = 'submitted'`, `assignedToId` is `NULL`, `requestedAmount = 9000000`, `title` starting with `Auto: Case hoàn thành -`.

- [ ] **Step 3: Verify a paid case going done does NOT create a request**

  Reuse the Task 4 Step 3 fully-paid contract/case (`<c2_id>`/`<p2_id>`):
  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  UPDATE projects SET status = 'done' WHERE id = <p2_id>;
  "
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  SELECT COUNT(*) FROM \"paymentRequests\" WHERE \"contractId\" = <c2_id>;
  "
  ```
  Expected: `0`.

- [ ] **Step 4: Verify re-saving an already-done case does not duplicate the request**

  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  UPDATE projects SET status = 'done' WHERE id = <p3_id>;
  "
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  SELECT COUNT(*) FROM \"paymentRequests\" WHERE \"contractId\" = <c3_id>;
  "
  ```
  Expected: still `1` (the `OLD.status IS NOT DISTINCT FROM 'done'` guard blocks the second `UPDATE ... status = 'done'`, since `OLD.status` is already `'done'` this time).

- [ ] **Step 5: Commit**

  ```bash
  git add pgsql/contract_payment_status_workflow.sql
  git commit -m "feat(pgsql): trigger to auto-create Payment Request when unpaid Case is marked done"
  ```

---

## Task 6: One-time backfill for rows that existed before this migration

**Files:**
- Modify: `pgsql/contract_payment_status_workflow.sql` (append)

**Interfaces:**
- Consumes: `contract_resolved_total(bigint)` from Task 1.
- Produces: no new function — a one-time `UPDATE ... FROM` statement that brings every pre-existing `contracts`/`projects` row up to the same correct state a fresh insert would have gotten from Tasks 2-4's triggers.

- [ ] **Step 1: Append the backfill statements**

  New contracts/payments from here on are handled entirely by Tasks 2-3's triggers. This step is only for rows that already existed in the database *before* this migration ran — their `outStandingAmount`/`paymentStatus` are still at the column default (`0`/`'unpaid'`) because `ADD COLUMN ... DEFAULT` doesn't fire an `INSERT` trigger. Append:

  ```sql
  -- ---- One-time backfill: correct all pre-existing rows -------------------
  WITH received AS (
    SELECT "contractId", COALESCE(SUM(amount), 0) AS total_received
    FROM payments
    WHERE "contractId" IS NOT NULL AND LOWER("paymentStatus") = 'received'
    GROUP BY "contractId"
  )
  UPDATE contracts c
  SET "outStandingAmount" = contract_resolved_total(c.id) - COALESCE(r.total_received, 0),
      "paymentStatus" = CASE
        WHEN (contract_resolved_total(c.id) - COALESCE(r.total_received, 0)) <= 0 THEN 'paid'
        WHEN COALESCE(r.total_received, 0) > 0 THEN 'partial'
        ELSE 'unpaid'
      END
  FROM (SELECT c2.id FROM contracts c2) AS all_contracts
  LEFT JOIN received r ON r."contractId" = all_contracts.id
  WHERE c.id = all_contracts.id;

  UPDATE projects p
  SET "paymentStatus" = c."paymentStatus"
  FROM contracts c
  WHERE p."contractId" = c.id;
  ```

  This is safe to run repeatedly (it's a plain recompute, not an increment) — running it twice produces the same values both times, which also makes it safe on a database where Task 2-3's triggers have *already* kept everything correct (it just recomputes to the same numbers).

- [ ] **Step 2: Apply and verify against real (non-test) data**

  Run: `PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -f pgsql/contract_payment_status_workflow.sql`

  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  SELECT id, \"contractCode\", \"totalAmount\", \"outStandingAmount\", \"paymentStatus\"
  FROM contracts
  WHERE \"contractName\" NOT LIKE 'plan-verify-%'
  ORDER BY id DESC LIMIT 10;
  "
  ```
  Expected: every row has a non-`NULL` `outStandingAmount` and a `paymentStatus` in `('unpaid','partial','paid')` — no row left at the raw column default from before the backfill ran (unless it genuinely has 0 total and 0 payments, which correctly reads as `paid` — `0 <= 0`).

- [ ] **Step 3: Regression-check against the comparison done earlier this session**

  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  SELECT id, \"contractCode\", \"totalAmount\", contract_resolved_total(id) as resolved
  FROM contracts
  WHERE COALESCE(\"totalAmount\", 0) <> contract_resolved_total(id)
  ORDER BY id;
  "
  ```
  Expected: only rows where `totalAmount` was genuinely unset (retainer-only contracts) should differ meaningfully; any purely floating-point-precision difference (last-digit rounding on a very large `totalAmount`) is expected and harmless — this was already observed and explained during design research this session.

- [ ] **Step 4: Commit**

  ```bash
  git add pgsql/contract_payment_status_workflow.sql
  git commit -m "feat(pgsql): one-time backfill of outStandingAmount/paymentStatus for pre-existing rows"
  ```

---

## Task 7: Register the 2 new fields in Nocobase

**Files:**
- Create: `JsField/RegisterContractPaymentStatusFields.js`

**Interfaces:**
- Consumes: `ctx.api.request()` (Nocobase JS Block/console runtime — same pattern as `JsField/BackfillCaseServiceFolderTemplateKey.js`).
- Produces: nothing consumed by later tasks — this is the last step, making the 2 columns from Task 1 visible/usable as normal fields in the Nocobase admin UI (list columns, filters, forms) the same way `contracts.status` already is.

- [ ] **Step 1: Write the idempotent registration script**

  Create `JsField/RegisterContractPaymentStatusFields.js`:

  ```js
  // ============================================================
  // ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
  //
  // Registers contracts.paymentStatus and projects.paymentStatus as proper
  // Nocobase `select` fields (matching contracts.status's existing
  // uiSchema shape) so they render as a colored status pill in the admin
  // UI, are filterable, and appear in "Add field" pickers.
  //
  // The underlying columns already exist in Postgres — created by
  // pgsql/contract_payment_status_workflow.sql — this script only adds
  // Nocobase's own field metadata on top, which a raw ALTER TABLE does
  // not create by itself.
  //
  // How to run: paste into a temporary Nocobase Action block's onClick,
  // or into the browser dev console while on any admin page (ctx is in
  // scope there via the Nocobase app, or replace ctx.api.request with an
  // authenticated fetch to the same URLs if running outside ctx).
  // Idempotent — checks each field/collection for an existing field of
  // the same name before creating, skips if already present.
  // ============================================================
  const PAYMENT_STATUS_OPTIONS = [
    { value: "unpaid", label: "Unpaid", color: "volcano" },
    { value: "partial", label: "Partial", color: "gold" },
    { value: "paid", label: "Paid", color: "green" },
  ];

  const buildFieldPayload = (title) => ({
    name: "paymentStatus",
    type: "string",
    interface: "select",
    uiSchema: {
      type: "string",
      "x-component": "Select",
      enum: PAYMENT_STATUS_OPTIONS.map((opt, index) => ({
        __DO_NOT_USE_THIS_PROPERTY_index__: index,
        ...opt,
      })),
      title,
    },
    defaultValue: "unpaid",
  });

  const registerField = async (collectionName, title) => {
    const existing = await ctx.api.request({
      url: `collections/${collectionName}/fields:list`,
      params: { paginate: false },
    });
    const already = (existing?.data?.data || []).some(
      (f) => f.name === "paymentStatus",
    );
    if (already) {
      console.log(`[skip] ${collectionName}.paymentStatus already registered`);
      return;
    }
    await ctx.api.request({
      url: `collections/${collectionName}/fields:create`,
      method: "POST",
      data: buildFieldPayload(title),
    });
    console.log(`[created] ${collectionName}.paymentStatus`);
  };

  await registerField("contracts", "Payment Status");
  await registerField("projects", "Payment Status");
  console.log("Done.");
  ```

- [ ] **Step 2: Run it and verify field registration**

  Paste the script's contents into a temporary Nocobase Action block's onClick handler (or the browser console on an admin page where `ctx`/`ctx.api` is in scope) and execute it once.

  Then verify via the API directly:
  ```bash
  TOKEN=$(curl -s -X POST http://localhost:13000/api/auth:signIn -H "Content-Type: application/json" -H "X-Authenticator: basic" -d '{"email":"<admin-email>","password":"<admin-password>"}' | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{console.log(JSON.parse(d).data.token);});")
  curl -s "http://localhost:13000/api/collections/contracts/fields:list?paginate=false" -H "Authorization: Bearer $TOKEN" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(!!j.data.find(f=>f.name==='paymentStatus'));});"
  ```
  Expected: `true`. Repeat the same check against `collections/projects/fields:list`.

- [ ] **Step 3: Run the script a second time to confirm idempotency**

  Paste and run it again. Expected console output: both lines read `[skip] ...already registered`, no error, no duplicate field created.

- [ ] **Step 4: Manual step — wire up the "All Outstanding Cases" view filter and Case pill visibility (not scripted)**

  Two small manual admin actions, left unscripted for the same reason: both are saved-view/page-schema edits through Nocobase's own UI designer, not `contracts`/`projects` data-layer changes, so scripting either would mean reverse-engineering that page's internal schema keys for a one-time click-through configuration — the spec (§7) already calls this out as a UI/view concern, not part of the data-layer deploy.

  1. Open the existing "All Outstanding Cases" menu (already present in the UI, currently an unfiltered placeholder), open its block's filter configuration, and set the filter to `status = done AND paymentStatus != paid`.
  2. On the Case Dashboard/Detail block(s) where a lawyer would look, add `paymentStatus` to the visible columns/fields the same way `status` is already shown there — it renders as the same colored pill automatically once Task 7 Step 1-2's field registration is in place (Nocobase draws the pill from the field's own `uiSchema`, no per-block styling needed).

- [ ] **Step 5: Commit**

  ```bash
  git add JsField/RegisterContractPaymentStatusFields.js
  git commit -m "feat(nocobase): register paymentStatus fields on contracts/projects"
  ```

---

## Task 8: End-to-end verification (the full flow from the spec, in one pass)

**Files:** None — verification only, exercising Tasks 1-7 together as a whole.

**Interfaces:** None produced — this is the acceptance test for the whole plan.

- [ ] **Step 1: Clean up plan-verification test rows from Tasks 1-6**

  These were left in place deliberately so each task could build on the previous one's data; remove them now that the full chain is verified end-to-end in Step 2 below with fresh rows:
  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
  DELETE FROM payments WHERE \"contractId\" IN (SELECT id FROM contracts WHERE \"contractName\" LIKE 'plan-verify-%');
  DELETE FROM \"paymentRequests\" WHERE \"contractId\" IN (SELECT id FROM contracts WHERE \"contractName\" LIKE 'plan-verify-%');
  DELETE FROM projects WHERE \"contractId\" IN (SELECT id FROM contracts WHERE \"contractName\" LIKE 'plan-verify-%');
  DELETE FROM contracts WHERE \"contractName\" LIKE 'plan-verify-%';
  "
  ```

- [ ] **Step 2: Run the full flow once, fresh, through the actual Nocobase UI (not raw SQL)**

  Using the running dev instance's admin UI:
  1. Create a new Contract with `feeModel = retainer`, `monthlyFee = 10,000,000`, `retainerDuration = 6`, no `totalAmount` entered — through `ContractCreateForm.js` as a real user would.
  2. Confirm the contract's `Payment Status` column/field shows `Unpaid` and `Outstanding Amount` shows `60,000,000` immediately after creation.
  3. Create a Case and link this contract to it (`projects.contractId`).
  4. Through `PaymentCreateBlock.js`, record a payment of `30,000,000` against this contract.
  5. Confirm the contract's `Payment Status` is now `Partial`, `Outstanding Amount` is `30,000,000`, and the Case's own `Payment Status` field also reads `Partial`.
  6. Record the remaining `30,000,000` payment.
  7. Confirm the contract is now `Paid`, `Outstanding Amount` is `0`, and the Case's `Payment Status` is also `Paid`.
  8. Mark the Case's `status` as `done`.
  9. Confirm no Payment Request was auto-created for this contract (it was already `paid` before `done`).
  10. Create a second Contract + linked Case the same way, but only pay it partially, then mark that Case `done`.
  11. Confirm a Payment Request now exists for that second contract, `status = Submitted`, unassigned, `requestedAmount` equal to its remaining balance.

  This step has no single expected shell output — it's a manual UI walkthrough confirming every trigger fires correctly through the real application paths (Nocobase's own insert/update machinery), not just through raw `psql` `INSERT`/`UPDATE` statements as used for speed in Tasks 1-6's verification.

- [ ] **Step 3: Confirm the whole migration file re-applies cleanly on top of itself one more time**

  ```bash
  PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -f pgsql/contract_payment_status_workflow.sql
  ```
  Expected: exits 0, no errors — this is the same file that would be run against a freshly-restored database in any other dev environment.

- [ ] **Step 4: Final commit (only if Step 2's manual walkthrough surfaced any fix)**

  If everything in Step 2 matched expectations with no code changes needed, there is nothing to commit here — Tasks 1-7 already committed the working implementation. If the walkthrough did surface a bug, fix it in `pgsql/contract_payment_status_workflow.sql`, re-run Step 3, then:
  ```bash
  git add pgsql/contract_payment_status_workflow.sql
  git commit -m "fix(pgsql): <describe what the end-to-end walkthrough caught>"
  ```

---

## Rollback (reference only — not a task to execute as part of this plan)

Per spec §10: everything this plan adds is additive (new columns, new functions, new triggers) and nothing pre-existing app logic reads yet, so rollback is only needed if the feature itself is being reverted, not as part of normal execution. If ever needed:

```bash
PGPASSWORD=***REMOVED*** psql -h localhost -p 5432 -U postgres -d nocobase-law -c "
DROP TRIGGER IF EXISTS trg_case_done_payment_request ON projects;
DROP TRIGGER IF EXISTS trg_contract_cascade_case_status ON contracts;
DROP TRIGGER IF EXISTS trg_payment_recompute_contract ON payments;
DROP TRIGGER IF EXISTS trg_contract_init_outstanding ON contracts;
DROP FUNCTION IF EXISTS public.auto_create_payment_request_on_case_done();
DROP FUNCTION IF EXISTS public.cascade_payment_status_to_case();
DROP FUNCTION IF EXISTS public.contract_recompute_outstanding();
DROP FUNCTION IF EXISTS public.contract_init_outstanding();
DROP FUNCTION IF EXISTS public.contract_resolved_total(bigint);
"
```

Leave the 3 added columns in place (unused, harmless) rather than risk a destructive `DROP COLUMN` on a shared dev database.
