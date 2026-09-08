# Contract Billing Plans — Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Retainer billing state off `contracts` + a JSON blob and into a new `contractBillingPlans` collection — one source of truth for Retainer state, reserving room for By-case/milestone plan types later without another schema migration.

**Architecture:** New collection `contractBillingPlans` (belongsTo `contracts`) owns all retainer-specific fields as real typed columns. The existing SQL trigger + `DateFieldScheduleTrigger` Workflow (already built and verified this session) move to watch this new collection instead of `contracts`. Retainer calculation logic that was duplicated across 3 UI files moves into a new `shared-lib/law-billing.js` module, loaded via `ctx.importAsync()` — the same pattern already proven with `CaseDashboard.js`.

**Tech Stack:** Nocobase JS Blocks (`ctx.api.request()`), PostgreSQL (`plpgsql` triggers), Nocobase Workflow (`schedule`/`calculation`/`dateCalculation`/`condition`/`create`/`update` node types, DATE_FIELD schedule mode), `shared-lib` versioned-URL ES modules.

**Spec:** [2026-09-08-contract-billing-plans-architecture-design.md](../specs/2026-09-08-contract-billing-plans-architecture-design.md)

## Global Constraints

- No `fetch()` — only `ctx.api.request()` (project convention, CLAUDE.md rule 1).
- Every JS file: verify syntax with `node --check "<path>"` before handing to the user to run/deploy.
- Every SQL file: idempotent (`CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`, `ADD COLUMN IF NOT EXISTS`) — safe to re-run.
- Collection/field/workflow creation happens via script (`ctx.api.request()`), not the Admin UI field editor — this project's established, faster pattern (see `JsField/RegisterRetainerBillingFields.js`, `JsField/CreateRetainerBillingWorkflow.js` from the prior spec's implementation).
- **Ordering constraint (spec §6.4, §10):** Task 10 (dropping old `contracts` columns) must run strictly after Tasks 1-9 are verified working end-to-end. It is deliberately the last task and must never be reordered earlier or merged into an earlier migration file.
- After any script-created Workflow: toggle it Disabled → Enabled once in the Admin UI to force the server's `enabledCache` to pick it up (established, repeatedly-confirmed caveat this session).
- Money amounts: VND, no currency conversion (CLAUDE.md rule 5) — `contractBillingPlans` intentionally has no `currencyId`/`currency` columns of its own (simplification made during planning, not in the original spec draft): a plan's currency is always its parent contract's currency, so storing it a second time on the plan would be exactly the kind of duplicate-source-of-truth this whole redesign exists to eliminate. If a future plan type genuinely needs a different currency than its contract, that's a new requirement to design for then, not now.
- The relation field name from `contractBillingPlans` to `contracts` is `contracts` (plural), matching the existing convention on `paymentRequests` (confirmed via `PaymentRequestCreateBlock.js`'s `relationKeys = ["contracts", "customers", "internalCompany", ...]`) — not `contract` (singular) as an earlier draft of the spec's code samples used. This plan is the authoritative naming; use `contracts` everywhere a relation accessor to the parent contract is needed.

---

## Task 1: Create the `contractBillingPlans` collection (scripted)

**Files:**
- Create: `JsField/CreateContractBillingPlansCollection.js`

**Interfaces:**
- Produces: collection `contractBillingPlans` with fields `contracts` (belongsTo → `contracts`, FK `contractId`), `planType`, `status`, `totalAmount`, `startDate`, `endDate`, `retainerUnit`, `retainerTotalCycles`, `retainerCyclesBilled`, `nextBillingDate` — every later task in this plan reads/writes these exact field names.

- [x] **Step 1: Write the collection-creation script**

**Result:** first run revealed a real bug — `type: "date"` maps to Sequelize `DATE(3)` (Postgres `timestamp with time zone`), not a date-only column; the correct Nocobase field type is `type: "dateOnly"` (Sequelize `DATEONLY`), confirmed against `packages/core/database/src/fields/date-field.ts` vs `date-only-field.ts`. Also `timestamps: true` produced no `createdAt`/`updatedAt` columns — replaced with explicit field entries (`interface: "createdAt"`/`"updatedAt"` on a `type: "date"` field, which is the mechanism `date-field.ts` itself uses to wire up automatic timestamp tracking). Script also changed from skip-if-exists to delete-and-recreate so the fix could be applied cleanly. Second run confirmed correct: all 13 columns present, `startDate`/`endDate`/`nextBillingDate` are plain `date`, `createdAt`/`updatedAt` are `timestamp with time zone`.

Create `JsField/CreateContractBillingPlansCollection.js`:

```js
// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Creates the contractBillingPlans collection (all fields in one
// collections:create call, including the belongsTo relation to
// contracts) — see docs/superpowers/specs/
// 2026-09-08-contract-billing-plans-architecture-design.md §6.1/§4.
//
// Verified against Nocobase's own test suite, not guessed:
// packages/plugins/@nocobase/plugin-data-source-main/src/server/
// __tests__/http-api/collections.test.ts shows collections:create
// accepting a full `fields` array (including belongsTo/hasMany/
// belongsToMany relations) in one request — no need to create the
// collection first and add fields one at a time the way this
// project's earlier RegisterXxxFields.js scripts did (those added
// fields to an ALREADY-EXISTING collection; this collection doesn't
// exist yet, so everything is created together).
//
// How to run: paste into a temporary Nocobase Action block's onClick,
// or the browser dev console on any admin page (ctx is in scope
// there). Idempotent — skips creating the collection if one with this
// exact name already exists.
// ============================================================

const COLLECTION_NAME = "contractBillingPlans";

const collectionPayload = () => ({
  name: COLLECTION_NAME,
  timestamps: true,
  fields: [
    {
      name: "contracts",
      type: "belongsTo",
      target: "contracts",
      foreignKey: "contractId",
      uiSchema: {
        type: "number",
        title: "Contract",
        "x-component": "AssociationField",
        "x-component-props": { multiple: false, fieldNames: { label: "contractName", value: "id" } },
      },
    },
    {
      name: "planType",
      type: "string",
      interface: "select",
      uiSchema: {
        type: "string",
        title: "Plan Type",
        "x-component": "Select",
        enum: [
          { label: "Retainer", value: "retainer" },
          { label: "Milestone", value: "milestone" },
          { label: "Fixed one-time", value: "fixed_onetime" },
        ],
      },
    },
    {
      name: "status",
      type: "string",
      interface: "select",
      uiSchema: {
        type: "string",
        title: "Status",
        "x-component": "Select",
        enum: [
          { label: "Active", value: "active" },
          { label: "Completed", value: "completed" },
          { label: "Cancelled", value: "cancelled" },
        ],
      },
      defaultValue: "active",
    },
    {
      name: "totalAmount",
      type: "double",
      interface: "number",
      uiSchema: { type: "number", title: "Total Amount", "x-component": "InputNumber" },
    },
    {
      name: "startDate",
      type: "date",
      interface: "date",
      uiSchema: { type: "string", title: "Start Date", "x-component": "DatePicker" },
    },
    {
      name: "endDate",
      type: "date",
      interface: "date",
      uiSchema: { type: "string", title: "End Date", "x-component": "DatePicker" },
    },
    {
      name: "retainerUnit",
      type: "string",
      interface: "select",
      uiSchema: {
        type: "string",
        title: "Retainer Unit",
        "x-component": "Select",
        enum: [
          { label: "Day", value: "day" },
          { label: "Week", value: "week" },
          { label: "Month", value: "month" },
          { label: "Quarter", value: "quarter" },
          { label: "Year", value: "year" },
        ],
      },
    },
    {
      name: "retainerTotalCycles",
      type: "integer",
      interface: "integer",
      uiSchema: { type: "number", title: "Retainer Total Cycles", "x-component": "InputNumber" },
    },
    {
      name: "retainerCyclesBilled",
      type: "integer",
      interface: "integer",
      uiSchema: { type: "number", title: "Retainer Cycles Billed", "x-component": "InputNumber" },
      defaultValue: 0,
    },
    {
      name: "nextBillingDate",
      type: "date",
      interface: "date",
      uiSchema: { type: "string", title: "Next Billing Date", "x-component": "DatePicker" },
    },
  ],
});

(async () => {
  const existing = await ctx.api.request({
    url: "collections:list",
    params: { filter: { name: COLLECTION_NAME }, paginate: false },
  });
  if ((existing?.data?.data || []).length > 0) {
    console.log(`[skip] Collection "${COLLECTION_NAME}" already exists`);
    return;
  }
  const created = await ctx.api.request({
    url: "collections:create",
    method: "POST",
    data: collectionPayload(),
  });
  console.log(`[created] collection "${COLLECTION_NAME}"`, created?.data?.data?.name);
  console.log("Done. Verify in Admin -> Settings -> Data source -> contractBillingPlans, or via collections:list/fields:list.");
})();
```

- [x] **Step 2: Verify syntax**

Run: `node --check "JsField/CreateContractBillingPlansCollection.js"`
Expected: no output, exit code 0.

- [x] **Step 3: Run it and verify**

Paste into a temporary Action block's onClick (or browser dev console) and run. Expected console: `[created] collection "contractBillingPlans" contractBillingPlans` then the "Done." line.

In pgAdmin, confirm the table and all 13 columns exist:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'contractBillingPlans'
ORDER BY ordinal_position;
```
Expected: `id`, `createdAt`, `updatedAt`, `planType`, `status`, `totalAmount`, `startDate`, `endDate`, `retainerUnit`, `retainerTotalCycles`, `retainerCyclesBilled`, `nextBillingDate`, `contractId` (13 rows). **Confirmed working** after the Step 1 fix (see its Result note).

- [x] **Step 4: Commit**

```bash
git add "JsField/CreateContractBillingPlansCollection.js"
git commit -m "feat(nocobase): script to create the contractBillingPlans collection"
```
Committed as `358a0b3` (initial) + `32e1bc2` (dateOnly/createdAt fix).

---

## Task 2: SQL trigger — initialize retainer billing state on the new collection

**Files:**
- Create: `pgsql/contract_billing_plans_trigger.sql`

**Interfaces:**
- Consumes: `contractBillingPlans` table from Task 1.
- Produces: `public.contract_billing_plan_init_retainer_state()` function, `trg_contract_billing_plan_init_retainer_state` trigger — Task 3's Workflow reads/writes `nextBillingDate`/`retainerCyclesBilled` that this trigger initializes.

- [ ] **Step 1: Write the migration file**

Create `pgsql/contract_billing_plans_trigger.sql`:

```sql
-- ============================================================
-- Contract Billing Plans — retainer state init trigger
-- See docs/superpowers/specs/2026-09-08-contract-billing-plans-architecture-design.md §6.2
--
-- Idempotent: safe to run again on a database that already has this applied.
-- Requires: pgsql/contract_billing_plans... the contractBillingPlans table
-- itself, created via JsField/CreateContractBillingPlansCollection.js (Task 1)
-- — this file only adds a trigger on top of that already-existing table.
-- ============================================================

CREATE OR REPLACE FUNCTION public.contract_billing_plan_init_retainer_state()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Open-ended retainers (no retainerTotalCycles) stay out of automation —
  -- periodAmount is totalAmount / retainerTotalCycles, undefined with no
  -- cycle count to divide by. Letting this row schedule anyway would let
  -- the Workflow's Calculation node silently divide by NULL and create a
  -- paymentRequests row with requestedAmount = NULL. This guard is the
  -- only thing preventing that.
  IF NEW."planType" <> 'retainer' OR NEW."retainerTotalCycles" IS NULL THEN
    NEW."nextBillingDate" := NULL;
    RETURN NEW;
  END IF;

  -- Only (re)initialize a plan that hasn't started billing yet — an
  -- unrelated edit to an in-progress plan must not reset its progress.
  IF COALESCE(NEW."retainerCyclesBilled", 0) = 0 THEN
    NEW."nextBillingDate" := NEW."startDate";
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_contract_billing_plan_init_retainer_state ON "contractBillingPlans";
CREATE TRIGGER trg_contract_billing_plan_init_retainer_state
  BEFORE INSERT OR UPDATE OF "retainerTotalCycles", "startDate", "planType" ON "contractBillingPlans"
  FOR EACH ROW
  EXECUTE FUNCTION public.contract_billing_plan_init_retainer_state();
```

- [ ] **Step 2: Apply it in pgAdmin and verify**

Paste into pgAdmin's Query Tool (same `db.dev.samset.net` / `law306` connection used throughout this session) and execute.

- [ ] **Step 3: Verify the trigger against a fresh fixed-term retainer plan insert**

```sql
INSERT INTO "contractBillingPlans" (
  "contractId", "planType", "status", "totalAmount",
  "startDate", "retainerUnit", "retainerTotalCycles", "createdAt", "updatedAt"
) VALUES (
  225, 'retainer', 'active', 18000000,
  '2026-10-01', 'month', 6, now(), now()
)
RETURNING id, "nextBillingDate", "retainerCyclesBilled";
```
Expected: `nextBillingDate = 2026-10-01`, `retainerCyclesBilled = 0`. (Reuses contract 225 from this session's earlier testing purely as a valid existing `contractId` to satisfy the FK — this row is deleted again in Task 9's cleanup, it is not meant to represent contract 225's real plan.)

- [ ] **Step 4: Verify open-ended plans are excluded**

```sql
INSERT INTO "contractBillingPlans" (
  "contractId", "planType", "status", "totalAmount",
  "startDate", "retainerUnit", "retainerTotalCycles", "createdAt", "updatedAt"
) VALUES (
  225, 'retainer', 'active', 18000000,
  '2026-10-01', 'month', NULL, now(), now()
)
RETURNING id, "nextBillingDate", "retainerCyclesBilled";
```
Expected: `nextBillingDate = NULL` (open-ended, correctly excluded from automation per spec §3 Non-goals).

- [ ] **Step 5: Re-run the file to confirm idempotency**

Paste `pgsql/contract_billing_plans_trigger.sql` into pgAdmin again. Expected: no errors, no duplicate triggers.

- [ ] **Step 6: Commit**

```bash
git add "pgsql/contract_billing_plans_trigger.sql"
git commit -m "feat(pgsql): contractBillingPlans retainer state init trigger"
```

---

## Task 3: Rebuild the Workflow against `contractBillingPlans`

**Files:**
- Create: `JsField/CreateContractBillingPlansWorkflow.js`

**Interfaces:**
- Consumes: `contractBillingPlans.{nextBillingDate,retainerTotalCycles,retainerCyclesBilled,totalAmount,retainerUnit,endDate,contractId}` (Task 1/2), `contracts.{contractCode,contractName,customerId,internalCompanyId}` via the `contracts` relation.
- Produces: new `paymentRequests` rows with `status: 'submitted'` — same downstream chain as before, unchanged.

This is a direct adaptation of `JsField/CreateRetainerBillingWorkflow.js` (already built, debugged, and verified working this session against `contracts`) — same node graph shape, same mathjs `or`/`and` and epoch-seconds fixes, only the collection and field references change. Read that file first to see the full research/citation trail in its header comment; it is not repeated here.

- [ ] **Step 1: Write the workflow-creation script**

Create `JsField/CreateContractBillingPlansWorkflow.js`:

```js
// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Rebuilds JsField/CreateRetainerBillingWorkflow.js's already-verified
// Workflow against the new contractBillingPlans collection instead of
// contracts. See docs/superpowers/specs/
// 2026-09-08-contract-billing-plans-architecture-design.md §6.3.
//
// Node graph, mathjs or/and fix, epoch-seconds date-comparison fix, and
// the "Execute manually" verification recipe are all UNCHANGED from
// JsField/CreateRetainerBillingWorkflow.js — only field references move:
//   - totalAmount / retainerTotalCycles / retainerCyclesBilled /
//     retainerUnit / nextBillingDate / endDate are now DIRECT on
//     $context.data (the plan record itself), not reached through a
//     contract or a paymentSchedule JSON blob.
//   - contractCode / contractName / customerId / internalCompanyId still
//     live on contracts, reached via $context.data.contracts.* (the
//     belongsTo relation, name "contracts" per this plan's Global
//     Constraints) — needs appends: ["contracts"] on the trigger.
//   - contractId on the created paymentRequests row is
//     $context.data.contractId (the plan's own FK column) — simpler than
//     going through the relation for that one field.
//
// Same in-memory-cache caveat as every other script-created workflow
// this session: after running, toggle Disabled -> Enabled once in
// Admin -> Workflow.
//
// How to run: paste into a temporary Nocobase Action block's onClick, or
// the browser dev console on any admin page (ctx is in scope there).
// Idempotent — DELETES any existing workflow with this exact title first,
// then rebuilds fresh (same reasoning as CreateRetainerBillingWorkflow.js:
// a Test run locks the node graph, so delete+recreate beats trying to
// patch an already-executed workflow).
// ============================================================

const WORKFLOW_TITLE = "Retainer billing plans - auto-create next payment request";

const workflowPayload = () => ({
  title: WORKFLOW_TITLE,
  type: "schedule",
  enabled: true,
  sync: false,
  current: true,
  config: {
    mode: 1,
    collection: "contractBillingPlans",
    startsOn: { field: "nextBillingDate" },
    appends: ["contracts"],
  },
});

const periodAmountNodePayload = () => ({
  type: "calculation",
  key: "periodAmountCalc",
  title: "Compute period amount",
  upstreamId: null,
  branchIndex: null,
  config: {
    engine: "math.js",
    expression: "{{$context.data.totalAmount}} / {{$context.data.retainerTotalCycles}}",
  },
});

const nextPeriodsBilledNodePayload = (upstreamId) => ({
  type: "calculation",
  key: "nextPeriodsBilledCalc",
  title: "Compute next periods-billed count",
  upstreamId,
  branchIndex: null,
  config: {
    engine: "math.js",
    expression: "{{$context.data.retainerCyclesBilled}} + 1",
  },
});

const createPaymentRequestNodePayload = (upstreamId) => ({
  type: "create",
  key: "createPaymentRequest",
  title: "Create payment request",
  upstreamId,
  branchIndex: null,
  config: {
    collection: "paymentRequests",
    params: {
      values: {
        title:
          "Payment request - {{$context.data.contracts.contractCode}} - {{$context.data.contracts.contractName}} - Retainer period {{$jobsMapByNodeKey.nextPeriodsBilledCalc}}",
        status: "submitted",
        contractId: "{{$context.data.contractId}}",
        customerId: "{{$context.data.contracts.customerId}}",
        internalCompanyId: "{{$context.data.contracts.internalCompanyId}}",
        requestedAmount: "{{$jobsMapByNodeKey.periodAmountCalc}}",
      },
    },
  },
});

const nextDateNodePayload = (upstreamId) => ({
  type: "dateCalculation",
  key: "nextDateCalc",
  title: "Compute next billing date",
  upstreamId,
  branchIndex: null,
  config: {
    input: "{{$context.data.nextBillingDate}}",
    inputType: "date",
    steps: [
      { function: "add", arguments: { number: 1, unit: "{{$context.data.retainerUnit}}" } },
      { function: "format", arguments: { format: "YYYY-MM-DD" } },
    ],
  },
});

const nextDateTsNodePayload = (upstreamId) => ({
  type: "dateCalculation",
  key: "nextDateTsCalc",
  title: "Compute next billing date (as timestamp, for comparison)",
  upstreamId,
  branchIndex: null,
  config: {
    input: "{{$context.data.nextBillingDate}}",
    inputType: "date",
    steps: [
      { function: "add", arguments: { number: 1, unit: "{{$context.data.retainerUnit}}" } },
      { function: "toTimestamp", arguments: { unit: "second" } },
    ],
  },
});

const endDateTsNodePayload = (upstreamId) => ({
  type: "dateCalculation",
  key: "endDateTsCalc",
  title: "Compute end date (as timestamp, for comparison)",
  upstreamId,
  branchIndex: null,
  config: {
    input: "{{$context.data.endDate}}",
    inputType: "date",
    steps: [{ function: "toTimestamp", arguments: { unit: "second" } }],
  },
});

const stopConditionNodePayload = (upstreamId) => ({
  type: "condition",
  key: "stopCondition",
  title: "Cycles exhausted or past end date?",
  upstreamId,
  branchIndex: null,
  config: {
    engine: "math.js",
    expression:
      "{{$jobsMapByNodeKey.nextPeriodsBilledCalc}} >= {{$context.data.retainerTotalCycles}} or ({{$context.data.endDate}} != null and {{$jobsMapByNodeKey.nextDateTsCalc}} > {{$jobsMapByNodeKey.endDateTsCalc}})",
    rejectOnFalse: false,
  },
});

const updateStopNodePayload = (upstreamId) => ({
  type: "update",
  key: "updateStop",
  title: "Stop billing (cycles done or past end date)",
  upstreamId,
  branchIndex: 1,
  config: {
    collection: "contractBillingPlans",
    params: {
      filterByTk: "{{$context.data.id}}",
      values: {
        retainerCyclesBilled: "{{$jobsMapByNodeKey.nextPeriodsBilledCalc}}",
        nextBillingDate: null,
        status: "completed",
      },
    },
  },
});

const updateContinueNodePayload = (upstreamId) => ({
  type: "update",
  key: "updateContinue",
  title: "Advance to next billing cycle",
  upstreamId,
  branchIndex: 0,
  config: {
    collection: "contractBillingPlans",
    params: {
      filterByTk: "{{$context.data.id}}",
      values: {
        retainerCyclesBilled: "{{$jobsMapByNodeKey.nextPeriodsBilledCalc}}",
        nextBillingDate: "{{$jobsMapByNodeKey.nextDateCalc}}",
      },
    },
  },
});

(async () => {
  const existing = await ctx.api.request({
    url: "workflows:list",
    params: { filter: { title: WORKFLOW_TITLE }, paginate: false },
  });
  for (const row of existing?.data?.data || []) {
    await ctx.api.request({ url: "workflows:destroy", method: "POST", params: { filterByTk: row.id } });
    console.log(`[deleted] previous workflow id=${row.id} (rebuilding fresh)`);
  }

  const created = await ctx.api.request({ url: "workflows:create", method: "POST", data: workflowPayload() });
  const workflowId = created?.data?.data?.id;
  if (!workflowId) {
    console.error("[fail] workflow create returned no id", created?.data);
    return;
  }
  console.log(`[created] workflow id=${workflowId}`);

  const createNode = async (payload) => {
    const res = await ctx.api.request({ url: `workflows/${workflowId}/nodes:create`, method: "POST", data: payload });
    const node = res?.data?.data;
    console.log(`[created] node "${node?.key}" id=${node?.id}`);
    return node;
  };

  const n1 = await createNode(periodAmountNodePayload());
  const n2 = await createNode(nextPeriodsBilledNodePayload(n1.id));
  const n3 = await createNode(createPaymentRequestNodePayload(n2.id));
  const n4 = await createNode(nextDateNodePayload(n3.id));
  const n5 = await createNode(nextDateTsNodePayload(n4.id));
  const n6 = await createNode(endDateTsNodePayload(n5.id));
  const n7 = await createNode(stopConditionNodePayload(n6.id));
  await createNode(updateStopNodePayload(n7.id));
  await createNode(updateContinueNodePayload(n7.id));

  console.log("Done. Next steps:");
  console.log("1. Admin -> Workflow -> open this workflow -> toggle Disabled then Enabled once (cache refresh).");
  console.log("2. Test-run against the contractBillingPlans row from Task 2 Step 3 before trusting this in production.");
})();
```

Note the added `status: "completed"` in `updateStopNodePayload` — new versus the `contracts`-based version, made possible by `contractBillingPlans.status` (Task 1) giving an explicit lifecycle field the old design didn't have.

- [ ] **Step 2: Verify syntax**

Run: `node --check "JsField/CreateContractBillingPlansWorkflow.js"`
Expected: no output, exit code 0.

- [ ] **Step 3: Run it**

Paste into a temporary Action block and run. Expected: `[created] workflow id=...` then 9 `[created] node "..." id=...` lines, then the "Done." reminder.

- [ ] **Step 4: Force the server to pick it up**

Admin -> Workflow -> open "Retainer billing plans - auto-create next payment request" -> toggle Disabled then Enabled once.

- [ ] **Step 5: Test run against the Task 2 Step 3 plan row**

Click **Execute manually** -> "Trigger data" field -> search/select the `contractBillingPlans` row created in Task 2 Step 3 (`totalAmount=18000000`, `retainerTotalCycles=6`). Uncheck "Automatically create a new version after execution" on this first run (same caveat as this session's earlier `CreateRetainerBillingWorkflow.js` testing).

In pgAdmin, confirm:
```sql
SELECT title, status, "requestedAmount" FROM "paymentRequests"
WHERE "contractId" = 225 ORDER BY id DESC LIMIT 1;
SELECT "retainerCyclesBilled", "nextBillingDate", status FROM "contractBillingPlans"
WHERE "contractId" = 225 AND "retainerTotalCycles" = 6;
```
Expected: 1 new `paymentRequests` row, `requestedAmount = 3000000`; plan row `retainerCyclesBilled = 1`, `nextBillingDate = 2026-11-01`, `status = 'active'` (still — only flips to `'completed'` once cycles are exhausted).

- [ ] **Step 6: Repeat to confirm the stop condition**

Repeat Step 5 five more times (6 total, re-selecting the plan row fresh each time). Expected after the 6th run: `retainerCyclesBilled = 6`, `nextBillingDate = NULL`, `status = 'completed'`, and exactly 6 `paymentRequests` rows for this plan's contract.

- [ ] **Step 7: Commit**

```bash
git add "JsField/CreateContractBillingPlansWorkflow.js"
git commit -m "feat(nocobase): rebuild retainer billing workflow against contractBillingPlans"
```

---

## Task 4: Shared retainer logic — `shared-lib/law-billing.js`

**Files:**
- Create: `shared-lib/law-billing.js`

**Interfaces:**
- Produces: `calcRetainerNextPaymentDate(startDate, interval, unit)`, `retainerDurationSuffix(unit, count)`, `resolveActiveBillingPlanDisplay(plan)` — Tasks 5-7 import all three via `ctx.importAsync()`.

This moves the exact, already-working logic from `ContractCreateForm.js`/`ContractPaymentScheduleDetailBlock.js` (read directly from those files during planning, not reconstructed from memory) into one file, plus one new function that didn't exist before (`resolveActiveBillingPlanDisplay`, replacing the old `resolveRetainerNextPaymentDate` pattern with one that reads the plan's own live state instead of approximating it).

- [ ] **Step 1: Write the shared module**

Create `shared-lib/law-billing.js`:

```js
// shared-lib/law-billing.js
// Retainer billing calculation logic shared by ContractCreateForm.js,
// ContractPaymentScheduleDetailBlock.js, and PaymentRequestCreateBlock.js.
// Load via: const Shared = await ctx.importAsync(LAW_BILLING_URL);
// Deploy convention: see shared-lib/README.md (versioned filename, e.g.
// law-billing-v1.js — do not overwrite an existing version's URL).

export const VERSION = '1.0.0';

function parseNum(v) {
  const n = parseFloat(String(v ?? '').replace(/[^\d.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

function toDateInput(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeDateInput(value) {
  if (!value) return '';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : toDateInput(date);
}

function addDays(dateValue, days) {
  if (!dateValue && days !== 0) return '';
  const source = new Date(`${normalizeDateInput(dateValue)}T00:00:00`);
  if (Number.isNaN(source.getTime())) return '';
  source.setDate(source.getDate() + days);
  return toDateInput(source);
}

function addMonthsClamped(dateValue, monthCount) {
  if (!dateValue || !monthCount) return '';
  const source = new Date(`${normalizeDateInput(dateValue)}T00:00:00`);
  if (Number.isNaN(source.getTime())) return '';
  const y = source.getFullYear();
  const m = source.getMonth();
  const d = source.getDate();
  const targetFirst = new Date(y, m + monthCount, 1);
  const lastDay = new Date(targetFirst.getFullYear(), targetFirst.getMonth() + 1, 0).getDate();
  targetFirst.setDate(Math.min(d, lastDay));
  return toDateInput(targetFirst);
}

export function normalizeRetainerUnit(unit) {
  const key = String(unit || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (key === 'daily') return 'day';
  if (key === 'weekly') return 'week';
  if (key === 'monthly') return 'month';
  if (key === 'quarterly') return 'quarter';
  if (key === 'yearly' || key === 'annual') return 'year';
  return key || 'month';
}

export function calcRetainerNextPaymentDate(paymentDate, retainerDuration, repeatUnit) {
  const duration = parseNum(retainerDuration);
  const unit = normalizeRetainerUnit(repeatUnit);
  if (!paymentDate || duration <= 0) return '';
  if (unit === 'day') return addDays(paymentDate, duration);
  if (unit === 'week') return addDays(paymentDate, duration * 7);
  if (unit === 'month') return addMonthsClamped(paymentDate, duration);
  if (unit === 'quarter') return addMonthsClamped(paymentDate, duration * 3);
  if (unit === 'year') return addMonthsClamped(paymentDate, duration * 12);
  return '';
}

export function retainerDurationSuffix(retainerPeriod, durationValue) {
  const singular = parseNum(durationValue) === 1;
  if (retainerPeriod === 'day') return singular ? 'day' : 'days';
  if (retainerPeriod === 'week') return singular ? 'week' : 'weeks';
  if (retainerPeriod === 'month') return singular ? 'month' : 'months';
  if (retainerPeriod === 'quarter') return singular ? 'quarter' : 'quarters';
  if (retainerPeriod === 'year') return singular ? 'year' : 'years';
  return singular ? 'cycle' : 'cycles';
}

// Replaces the old resolveRetainerNextPaymentDate pattern (which always
// recomputed "startDate + 1 unit" and had no way to know how many cycles
// had actually been auto-billed). Once a plan exists, its own
// nextBillingDate *is* the live, correct next-payment date — this reads
// it directly instead of approximating it a second time.
export function resolveActiveBillingPlanDisplay(plan) {
  if (!plan) return null;
  const totalCycles = plan.retainerTotalCycles ?? null;
  const cyclesBilled = plan.retainerCyclesBilled ?? 0;
  if (plan.nextBillingDate) {
    return {
      nextPaymentDate: normalizeDateInput(plan.nextBillingDate),
      cyclesBilled,
      totalCycles,
      displayText: totalCycles
        ? `Every ${plan.retainerUnit} · ${totalCycles} ${retainerDurationSuffix(plan.retainerUnit, totalCycles)} total`
        : `Every ${plan.retainerUnit} · open-ended`,
    };
  }
  // Plan exists but automation hasn't initialized nextBillingDate yet
  // (e.g. open-ended plan, or not yet saved) — best-effort preview only.
  return {
    nextPaymentDate: calcRetainerNextPaymentDate(plan.startDate, 1, plan.retainerUnit),
    cyclesBilled,
    totalCycles,
    displayText: totalCycles
      ? `Every ${plan.retainerUnit} · ${totalCycles} ${retainerDurationSuffix(plan.retainerUnit, totalCycles)} total`
      : `Every ${plan.retainerUnit} · open-ended`,
  };
}
```

- [ ] **Step 2: Verify syntax**

Run: `node --check "shared-lib/law-billing.js"`
Expected: no output, exit code 0.

- [ ] **Step 3: Deploy**

Follow `shared-lib/README.md`'s existing process: upload `law-billing.js` to Nocobase's file storage as `law-billing-v1.js` (versioned filename, not overwriting anything), get its public URL. This is a manual step (the user has to do the upload through the Nocobase file-manager UI) — record the resulting URL, it's needed as `LAW_BILLING_URL` in Tasks 5-7.

- [ ] **Step 4: Commit**

```bash
git add "shared-lib/law-billing.js"
git commit -m "feat(shared-lib): extract retainer billing calculation logic (law-billing.js)"
```

---

## Task 5: `ContractCreateForm.js` — nested plan creation + shared-lib

**Files:**
- Modify: `All Module/Contract/ContractCreateForm.js`

**Interfaces:**
- Consumes: `shared-lib/law-billing.js` (Task 4) — `calcRetainerNextPaymentDate`, `retainerDurationSuffix`.
- Produces: `contracts:create` calls now include a nested `billingPlans: [{...}]` array when the contract is a Retainer, instead of building `paymentSchedule.retainerRule` and the now-removed `retainerDuration`/`retainerPeriod`/`monthlyFee` fields.

- [ ] **Step 1: Read the current retainer-submission code to confirm nothing has drifted**

Re-read `buildPaymentSchedulePayload` (around line 1877) and the submit payload block (around line 11460-11490) in `All Module/Contract/ContractCreateForm.js` — these were last touched by this session's `retainerRule.interval` fix (commit `7f91803`). Confirm the `retainerRule`-building block and the `monthlyFee: null, retainerPeriod: null, retainerDuration: isRetainer ? nullableNum(form.retainerDuration) : null,` lines are still there as last read. If they differ, stop and reconcile before continuing.

- [ ] **Step 2: Load the shared module**

Near the top of the file, alongside any other `ctx.importAsync` usage (or, if none exists yet in this file, near the other module-level constants):

```js
const LAW_BILLING_URL = "<URL from Task 4 Step 3>";
const Shared = await ctx.importAsync(LAW_BILLING_URL);
const { calcRetainerNextPaymentDate, retainerDurationSuffix } = Shared;
```

Delete the file's own local `calcRetainerNextPaymentDate`/`retainerDurationSuffix`/`normalizeRetainerUnit`/`addDays`/`addMonthsClamped`/`toDateInput`/`normalizeDateInput` definitions if this file has its own copies of the date-math helpers *only* used by these two functions (keep any of those helpers if something else in this large file also depends on them independently — check each helper's other call sites before deleting).

- [ ] **Step 3: Replace `buildPaymentSchedulePayload`'s retainer-rule construction**

`paymentSchedule.retainerRule` stops being built for new saves — By-case's `installments`/`mode` fields in the same payload are unaffected. Remove the `retainerRule: { enabled, anchorType, anchorValue, interval, unit, nextPaymentDate, displayText }` object from the returned payload (lines ~1925-1937); nothing else in this function's return value changes.

- [ ] **Step 4: Build the nested `billingPlans` array for the submit payload**

In the submit payload block (~line 11460-11490), these 5 lines/blocks are **not contiguous** — `fixedAmount`/`hourlyRate`/`estimatedHours`/`successFee` sit between the first and the rest (confirmed by directly reading the file during planning, not assumed). Delete each individually, in place:

```js
          monthlyFee: null,
```
(line ~11472 — delete this line only, `fixedAmount:` on the next line is untouched)

```js
          retainerPeriod: null,
          retainerDuration: isRetainer
            ? nullableNum(form.retainerDuration)
            : null,
```
(lines ~11484-11487 — delete these 3 lines; replace them in place with the new `billingPlans` key below, so the payload object gains a new key at the same spot these 3 lines occupied)

```js
          includedHours: null,
          overageHourlyRate: null,
```
(lines ~11488-11489 — delete both lines, nothing replaces them)

New key, inserted where `retainerPeriod`/`retainerDuration` used to be:
```js
          billingPlans: isRetainer
            ? [
                {
                  planType: "retainer",
                  status: "active",
                  totalAmount: headerTotals.totalAmount || parseNum(form.fixedAmount) || null,
                  startDate: toIso(form.paymentDate),
                  endDate: toIso(form.endDate),
                  retainerUnit: form.retainerRepeatUnit || "month",
                  retainerTotalCycles: nullableNum(form.retainerDuration),
                },
              ]
            : undefined,
```
(`undefined` for non-Retainer contracts — Nocobase's nested-create simply does nothing for an `undefined`/absent relation key, so By-case contracts are unaffected.)

`contractType` also gets removed from this same payload object if it's written here (grep the file for `contractType:` within this submit block specifically — it may be set once, near `Type`/`Fee Model`-related fields rather than beside the retainer block; find its actual line before deleting).

- [ ] **Step 5: Update the "Next payment" preview shown during creation**

Wherever the create form currently previews the next payment date live (using `calcRetainerNextPaymentDate`/`retainerDurationSuffix` before the contract is even saved — there is no plan record to read yet at that point), keep using `calcRetainerNextPaymentDate(form.paymentDate, 1, form.retainerRepeatUnit)` directly (now via `Shared`, per Step 2) — this is the one legitimate case where a live computation is still correct, because no `contractBillingPlans` row exists until submit.

- [ ] **Step 6: Hide Billing Cycle for Retainer**

Find wherever `Billing Cycle` (`form.billingCycle`) is rendered as a form field. Wrap it in the same kind of conditional visibility already used elsewhere in this file for fee-model-specific fields (e.g. `visibleFeeFields.retainerDuration &&`) — hide it when `isRetainer` is true.

- [ ] **Step 7: Verify syntax**

Run: `node --check "All Module/Contract/ContractCreateForm.js"`
Expected: no output, exit code 0.

- [ ] **Step 8: Commit**

```bash
git add "All Module/Contract/ContractCreateForm.js"
git commit -m "refactor(ContractCreateForm): create billingPlans nested record instead of contracts.retainerRule/retainerDuration; load retainer logic from shared-lib"
```

(Deploying this to dev/staging's live JS Block happens in Task 9, together with Tasks 6-7's changes, as one combined manual paste — not per-task, since none of Tasks 5-7 is independently useful in the live app until all three are deployed together.)

---

## Task 6: `ContractPaymentScheduleDetailBlock.js` — read the live plan, not a cached snapshot

**Files:**
- Modify: `All Module/Contract/ContractPaymentScheduleDetailBlock.js`

**Interfaces:**
- Consumes: `shared-lib/law-billing.js` (Task 4) — `resolveActiveBillingPlanDisplay`.
- Produces: `RetainerRule` component now renders from a `contractBillingPlans` record (via the contract's `billingPlans` relation), not `schedule.retainerRule`.

- [ ] **Step 1: Read the current `RetainerRule` component and its call site to confirm nothing has drifted**

Re-read `RetainerRule` (line 972) and its usage at line 1568 (`RetainerRule({ rule: schedule.retainerRule })`), plus `resolveRetainerNextPaymentDate` (line 308, fixed by this session's Task 2, commit `202d7fc`). If these differ from what this plan describes, stop and reconcile before continuing.

- [ ] **Step 2: Fetch the active billing plan alongside the contract**

Wherever this block fetches the contract record (`contracts:get` or similar, likely in the component that sets `contextRecord`/`record` state), add `billingPlans` to its `appends` so the active plan comes back with the contract in the same request.

- [ ] **Step 3: Load the shared module**

```js
const LAW_BILLING_URL = "<URL from Task 4 Step 3>";
const Shared = await ctx.importAsync(LAW_BILLING_URL);
const { resolveActiveBillingPlanDisplay } = Shared;
```

Delete `resolveRetainerNextPaymentDate` (line 308) — no longer needed, replaced by `resolveActiveBillingPlanDisplay`. Delete `calcRetainerNextPaymentDate` (line 296) and `normalizeRetainerUnit` too if nothing else in this file uses them independently (check other call sites first).

- [ ] **Step 4: Replace `RetainerRule`'s rendering to use the live plan**

Replace the component (line 972-1007) so it takes a `plan` prop (the active `contractBillingPlans` record, found from `record.billingPlans?.find(p => p.status === 'active')`) instead of a `rule` prop:

```js
const RetainerRule = ({ plan }) => {
  if (!plan) return null;
  const display = resolveActiveBillingPlanDisplay(plan);
  if (!display) return null;
  return React.createElement(
    "div",
    {
      style: {
        margin: "12px 16px 16px",
        padding: "10px 12px",
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        background: C.bgSoft,
        color: C.sub,
        fontSize: 13,
      },
    },
    React.createElement("strong", { style: { color: C.text } }, "Retainer rule: "),
    display.displayText,
    display.nextPaymentDate
      ? React.createElement(
          "div",
          { style: { marginTop: 6 } },
          React.createElement("strong", { style: { color: C.text } }, "Next payment: "),
          formatDate(display.nextPaymentDate),
        )
      : null,
    plan.retainerCyclesBilled
      ? React.createElement(
          "div",
          { style: { marginTop: 6 } },
          React.createElement("strong", { style: { color: C.text } }, "Cycles billed: "),
          `${plan.retainerCyclesBilled}${plan.retainerTotalCycles ? ` / ${plan.retainerTotalCycles}` : ""}`,
        )
      : null,
  );
};
```

(Added a "Cycles billed" line — new information that wasn't previously displayed anywhere, now cheap to show since the component already has the plan record.)

- [ ] **Step 5: Update the call site**

Line 1568: replace `RetainerRule({ rule: schedule.retainerRule })` with `RetainerRule({ plan: record.billingPlans?.find((p) => p.status === "active") })`.

- [ ] **Step 6: Verify syntax**

Run: `node --check "All Module/Contract/ContractPaymentScheduleDetailBlock.js"`
Expected: no output, exit code 0.

- [ ] **Step 7: Commit**

```bash
git add "All Module/Contract/ContractPaymentScheduleDetailBlock.js"
git commit -m "refactor(ContractPaymentScheduleDetailBlock): RetainerRule reads the live contractBillingPlans record instead of a cached paymentSchedule snapshot"
```

---

## Task 7: `PaymentRequestCreateBlock.js` — same relation-based read

**Files:**
- Modify: `All Module/Payment/PaymentRequestCreateBlock.js`

**Interfaces:**
- Consumes: `shared-lib/law-billing.js` (Task 4).
- Produces: any retainer-aware display/logic in this block reads the contract's active `contractBillingPlans` record instead of parsing `paymentSchedule.retainerRule`.

- [ ] **Step 1: Read the current retainer-reading code to confirm nothing has drifted**

Re-read the `retainerRule` construction block (line 603-614, fixed by this session's Task 3, commit `85a57e3`) and `normalizeSchedule`'s handling of `schedule.retainerRule` in this file. If it differs from what this plan describes, stop and reconcile before continuing.

- [ ] **Step 2: Fetch the active billing plan alongside the contract**

Wherever this block loads the selected contract's data (`contracts:get`/`contracts:list`), add `billingPlans` to `appends`.

- [ ] **Step 3: Load the shared module**

```js
const LAW_BILLING_URL = "<URL from Task 4 Step 3>";
const Shared = await ctx.importAsync(LAW_BILLING_URL);
const { resolveActiveBillingPlanDisplay } = Shared;
```

- [ ] **Step 4: Replace the `retainerRule` block**

Replace the `retainerRule = schedule?.retainerRule ? { ...calcRetainerNextPaymentDate(...) } : null` construction (line 603-614) with:
```js
const activePlan = contract?.billingPlans?.find((p) => p.status === "active") || null;
const retainerDisplay = activePlan ? resolveActiveBillingPlanDisplay(activePlan) : null;
```
and update whatever downstream JSX reads `retainerRule.nextPaymentDate`/`retainerRule.displayText` to read `retainerDisplay.nextPaymentDate`/`retainerDisplay.displayText` instead.

- [ ] **Step 5: Verify syntax**

Run: `node --check "All Module/Payment/PaymentRequestCreateBlock.js"`
Expected: no output, exit code 0.

- [ ] **Step 6: Commit**

```bash
git add "All Module/Payment/PaymentRequestCreateBlock.js"
git commit -m "refactor(PaymentRequestCreateBlock): read the live contractBillingPlans record instead of paymentSchedule.retainerRule"
```

---

## Task 8: Migration backfill for existing Retainer contracts

**Files:**
- Create: `pgsql/contract_billing_plans_migration_backfill.sql`

**Interfaces:**
- Consumes: `contracts.{contractType,retainerDuration,nextRetainerBillingDate,retainerPeriodsBilled,paymentSchedule,totalAmount,endDate}` — still present at this point (Task 10 hasn't run yet).
- Produces: one `contractBillingPlans` row per existing Retainer contract.

- [ ] **Step 1: Write the migration file**

Create `pgsql/contract_billing_plans_migration_backfill.sql`:

```sql
-- ============================================================
-- Contract Billing Plans — one-time backfill from existing contracts
-- See docs/superpowers/specs/2026-09-08-contract-billing-plans-architecture-design.md §6.4
--
-- MUST run after Task 1 (collection exists) and before Task 10 (old
-- contracts columns dropped) — this file reads those columns.
--
-- Idempotent: skips any contract that already has a contractBillingPlans
-- row, so safe to re-run.
-- ============================================================

INSERT INTO "contractBillingPlans" (
  "contractId", "planType", "status", "totalAmount",
  "startDate", "endDate", "retainerUnit", "retainerTotalCycles",
  "retainerCyclesBilled", "nextBillingDate", "createdAt", "updatedAt"
)
SELECT
  c.id,
  'retainer',
  CASE WHEN c."nextRetainerBillingDate" IS NULL AND COALESCE(c."retainerPeriodsBilled", 0) > 0
       THEN 'completed' ELSE 'active' END,
  COALESCE(c."totalAmount", (c."paymentSchedule" ->> 'totalAmount')::numeric),
  COALESCE(NULLIF(c."paymentSchedule" ->> 'firstPaymentDate', '')::date, c."paymentDate"::date),
  c."endDate"::date,
  COALESCE(NULLIF(c."paymentSchedule" -> 'retainerRule' ->> 'unit', ''), c."retainerRepeatUnit", 'month'),
  c."retainerDuration"::integer,
  COALESCE(c."retainerPeriodsBilled", 0),
  c."nextRetainerBillingDate",
  now(), now()
FROM contracts c
WHERE (
    c."contractType" = 'retainer'
    OR COALESCE((c."paymentSchedule" -> 'retainerRule' ->> 'enabled')::boolean, false) = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM "contractBillingPlans" p WHERE p."contractId" = c.id
  )
RETURNING id, "contractId", "nextBillingDate", "retainerCyclesBilled";
```

Note: `c."retainerRepeatUnit"` is referenced as a fallback source in case some contract predates even the `paymentSchedule.retainerRule.unit` convention — if this column doesn't actually exist on `contracts` (it may only ever have existed as a form-local JS variable, never a real column — confirm via Step 2's own schema check before running), drop that fallback from the `COALESCE` and rely on `paymentSchedule.retainerRule.unit` / the `'month'` default only.

- [ ] **Step 2: Confirm column names before running**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'contracts'
  AND column_name IN ('contractType', 'retainerDuration', 'nextRetainerBillingDate', 'retainerPeriodsBilled', 'retainerRepeatUnit', 'totalAmount', 'endDate', 'paymentDate');
```
Remove any reference in Step 1's query to a column this returns as absent (edit the file before running it if `retainerRepeatUnit` isn't a real column — see the note above).

- [ ] **Step 3: Run it and verify**

Paste into pgAdmin. Expected: one row returned per existing Retainer contract (at minimum, contract 225 from this session's testing — its `nextRetainerBillingDate` was last confirmed as some auto-advanced date since the workflow ran against it live; whatever that value is, it should carry over unchanged into the new plan's `nextBillingDate`).

```sql
SELECT p.*, c."contractName" FROM "contractBillingPlans" p
JOIN contracts c ON c.id = p."contractId";
```
Manually compare each row's `retainerTotalCycles`/`retainerCyclesBilled`/`nextBillingDate` against the source contract's `retainerDuration`/`retainerPeriodsBilled`/`nextRetainerBillingDate` — confirm they match exactly.

- [ ] **Step 4: Re-run to confirm idempotency**

Paste the file again. Expected: 0 rows returned (every eligible contract already has a plan, `NOT EXISTS` skips them all).

- [ ] **Step 5: Commit**

```bash
git add "pgsql/contract_billing_plans_migration_backfill.sql"
git commit -m "feat(pgsql): backfill contractBillingPlans from existing retainer contracts"
```

---

## Task 9: Deploy and verify end-to-end through the real app

**Files:** None — deployment + verification only.

**Interfaces:** None produced — acceptance test for Tasks 1-8 together.

- [ ] **Step 1: Deploy the updated JS Blocks**

Per this project's CLAUDE.md ("dán vào NocoBase dev/staging để test trước khi đưa lên production"): paste the updated `ContractCreateForm.js` (Task 5), `ContractPaymentScheduleDetailBlock.js` (Task 6), and `PaymentRequestCreateBlock.js` (Task 7) into their respective JS Block editors on dev/staging. This also fixes the separately-diagnosed stale-deployment issue from earlier this session (the "Every 3 months" old-code display on contract 225) as a side effect, since it redeploys `ContractCreateForm.js` regardless.

- [ ] **Step 2: Create a fresh real Retainer contract through the UI**

Real customer, `totalAmount` from real services, Retainer duration = 3, Retainer repeat = month, a real "First payment" date. Confirm in pgAdmin immediately after saving:
```sql
SELECT p.* FROM "contractBillingPlans" p
JOIN contracts c ON c.id = p."contractId"
WHERE c."contractName" = '<the name you used>';
```
Expected: exactly one plan row, `status='active'`, `retainerCyclesBilled=0`, `nextBillingDate` = the First payment date entered.

- [ ] **Step 3: Confirm the detail panel shows the live plan, not a stale computation**

Open the contract's payment schedule detail view. Confirm "Retainer rule" / "Next payment" / "Cycles billed" (new, from Task 6) match the database exactly.

- [ ] **Step 4: Force one automation cycle and re-check the display**

Set that plan's `nextBillingDate` to today (pgAdmin `UPDATE`) and either wait for the schedule or use Execute manually on the Task 3 workflow. Confirm: a new `paymentRequests` row appears in the app's "All Request" list; the contract detail panel's "Next payment"/"Cycles billed" now show the *advanced* state (this is the specific staleness bug this whole plan exists to fix — confirm it's actually gone, not just theoretically fixed).

- [ ] **Step 5: Confirm the existing payment-status chain still connects**

Approve the generated request and record the corresponding Payment through the existing UI flow. Confirm the contract's `paymentStatus`/`outStandingAmount` update via the already-shipped prior-spec trigger chain — no new code involved, just confirms nothing broke crossing feature boundaries.

- [ ] **Step 6: Clean up this plan's own test rows**

```sql
DELETE FROM "paymentRequests" WHERE "contractId" = 225;
DELETE FROM "contractBillingPlans" WHERE "contractId" = 225;
```
(Removes the Task 2/3 test rows created against contract 225 — the fresh real contract from Step 2 of this task is left in place as real data, not test data.)

- [ ] **Step 7: Grep-confirm no remaining references to the old fields, before Task 10 drops them**

```bash
grep -rn "retainerPeriod\b\|\.monthlyFee\b\|\.includedHours\b\|\.overageHourlyRate\b\|\.retainerDuration\b\|\.nextRetainerBillingDate\b\|\.retainerPeriodsBilled\b\|\.contractType\b" "All Module/" "JsField/"
```
Expected: no matches outside of comments/this session's own historical `pgsql/*.sql` files (which are immutable history, not live code) — every live `.js` file should have moved to the new collection/fields by now. If anything unexpected turns up, fix it before proceeding to Task 10.

---

## Task 10: Drop the old `contracts` columns (run last, separately)

**Files:**
- Create: `pgsql/contracts_drop_dead_columns.sql`

**Interfaces:** None produced — cleanup only, executed strictly after Task 9 passes.

**This task must not run until Task 9 is fully verified.** Per the Global Constraints and spec §10 (Rollback), this is the only non-trivially-reversible step in the whole plan.

- [ ] **Step 1: Write the migration file**

Create `pgsql/contracts_drop_dead_columns.sql`:

```sql
-- ============================================================
-- Contract Billing Plans — drop superseded contracts columns
-- See docs/superpowers/specs/2026-09-08-contract-billing-plans-architecture-design.md §5
--
-- RUN ONLY AFTER Task 9 of docs/superpowers/plans/
-- 2026-09-08-contract-billing-plans-architecture.md is fully verified.
-- These columns are migrated into contractBillingPlans by
-- contract_billing_plans_migration_backfill.sql — confirm that ran
-- successfully and Task 9 Step 7's grep is clean before running this.
--
-- Idempotent: DROP COLUMN IF EXISTS is safe to run again.
-- ============================================================

ALTER TABLE contracts DROP COLUMN IF EXISTS "retainerPeriod";
ALTER TABLE contracts DROP COLUMN IF EXISTS "monthlyFee";
ALTER TABLE contracts DROP COLUMN IF EXISTS "includedHours";
ALTER TABLE contracts DROP COLUMN IF EXISTS "overageHourlyRate";
ALTER TABLE contracts DROP COLUMN IF EXISTS "retainerDuration";
ALTER TABLE contracts DROP COLUMN IF EXISTS "nextRetainerBillingDate";
ALTER TABLE contracts DROP COLUMN IF EXISTS "retainerPeriodsBilled";
ALTER TABLE contracts DROP COLUMN IF EXISTS "contractType";
```

- [ ] **Step 2: Also remove the now-orphaned Nocobase field metadata**

Dropping a Postgres column directly (rather than through `fields:destroy`) can leave Nocobase's own field registry pointing at a column that no longer exists. After running Step 1's SQL, also run, once, in a temporary Action block:

```js
const FIELDS_TO_REMOVE = [
  "retainerPeriod", "monthlyFee", "includedHours", "overageHourlyRate",
  "retainerDuration", "nextRetainerBillingDate", "retainerPeriodsBilled", "contractType",
];
(async () => {
  for (const name of FIELDS_TO_REMOVE) {
    try {
      await ctx.api.request({ url: `collections/contracts/fields:destroy`, method: "POST", params: { filterByTk: name } });
      console.log(`[removed field metadata] contracts.${name}`);
    } catch (e) {
      console.log(`[skip] contracts.${name}: ${e.message}`);
    }
  }
})();
```

- [ ] **Step 3: Verify**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'contracts'
  AND column_name IN ('retainerPeriod','monthlyFee','includedHours','overageHourlyRate','retainerDuration','nextRetainerBillingDate','retainerPeriodsBilled','contractType');
```
Expected: 0 rows.

Reload the Admin UI's contract list/detail views — confirm nothing errors out referencing a missing field (this is the live check that Task 9 Step 7's grep was actually thorough).

- [ ] **Step 4: Re-run Step 1's SQL to confirm idempotency**

Expected: no errors (all `DROP COLUMN IF EXISTS`, already gone).

- [ ] **Step 5: Commit**

```bash
git add "pgsql/contracts_drop_dead_columns.sql"
git commit -m "feat(pgsql): drop contracts columns superseded by contractBillingPlans"
```
