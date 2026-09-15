// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Creates the Nocobase Workflow that automatically creates the next
// Payment Request for a fixed-term Retainer contract as each billing
// cycle comes due. See:
//   docs/superpowers/specs/2026-09-07-retainer-billing-automation-design.md
//   docs/superpowers/plans/2026-09-07-retainer-billing-automation.md (Task 6)
//
// DEVIATION FROM THE WRITTEN PLAN (confirmed with the user before writing
// this script). The plan's Task 6 describes a Static/cron Schedule
// trigger + Query + Loop node graph, built manually. This script instead
// uses Nocobase's built-in DATE_FIELD schedule mode (mode: 1), which
// watches contracts.nextRetainerBillingDate directly and fires exactly
// once per matching contract row — no Query/Loop nodes needed at all.
// Verified by reading
// packages/plugins/@nocobase/plugin-workflow/src/server/triggers/
// ScheduleTrigger/DateFieldScheduleTrigger.ts in full:
//   - loadRecordsToSchedule() / getRecordNextTime(): fires when
//     nextRetainerBillingDate is reached.
//   - on(): hooks contracts.afterSaveWithAssociations, so when this
//     workflow's own final Update node writes a new (future)
//     nextRetainerBillingDate, that save re-arms the SAME trigger for the
//     next cycle automatically. Self-perpetuating — no `repeat` config
//     needed.
//
// TRADE-OFF the user explicitly accepted over the plan's Query/Loop
// design: if the server is down (or this workflow disabled) at the exact
// moment a contract's nextRetainerBillingDate is reached, that cycle will
// NOT fire retroactively once things come back up (no `repeat` means
// getRecordNextTime() returns null for a startsOn date already in the
// past — see that file's own comment block above loadRecordsToSchedule).
// Recovery is a one-time manual fix: edit that contract's
// nextRetainerBillingDate to today (or later) via pgAdmin/Admin UI to
// re-arm it. This design was chosen over the plan's cron+Query<=today
// design (which self-heals from downtime) because that design needs a
// Loop instruction/plugin this session never verified is installed; this
// design needs nothing beyond what's confirmed present in core
// plugin-workflow plus the standard plugin-workflow-date-calculation
// plugin (calculation, dateCalculation, condition, create, update).
//
// Node graph (every type/config shape below was read directly out of
// Nocobase's own source, not guessed — see each payload's comment for
// the exact file):
//
//   Trigger (schedule, mode=1/DATE_FIELD, contracts.nextRetainerBillingDate)
//     -> Calculation: periodAmount = totalAmount / retainerDuration
//     -> Calculation: nextPeriodsBilled = retainerPeriodsBilled + 1
//     -> Create record (paymentRequests): submitted, requestedAmount=periodAmount
//     -> dateCalculation: nextDateCalc (string)   = format(add(nextRetainerBillingDate, 1, unit), 'YYYY-MM-DD')
//     -> dateCalculation: nextDateTsCalc (number) = toTimestamp(add(nextRetainerBillingDate, 1, unit))
//     -> dateCalculation: endDateTsCalc (number)  = toTimestamp(endDate)
//     -> Condition: nextPeriodsBilled >= retainerDuration
//                   OR (endDate set AND nextDateTsCalc > endDateTsCalc)
//          true  -> Update contract: retainerPeriodsBilled=nextPeriodsBilled, nextRetainerBillingDate=null (stop)
//          false -> Update contract: retainerPeriodsBilled=nextPeriodsBilled, nextRetainerBillingDate=nextDateCalc (continue)
//
// nextDate is produced TWICE, in two different node outputs, for two
// different purposes:
//   - nextDateCalc: a 'YYYY-MM-DD' STRING (trailing `format` step) — the
//     value actually written into the "date" column.
//   - nextDateTsCalc: an epoch-SECONDS NUMBER (trailing `toTimestamp`
//     step) — used only inside the Condition's comparison.
// This two-node split exists because of two mathjs behaviors empirically
// verified against this repo's own installed mathjs (not guessed):
//   1. mathjs's logical operators are the WORD forms `or`/`and`, not the
//      symbolic `||`/`&&` — `math.evaluate('$$0 || $$1')` throws
//      "SyntaxError: Value expected". This is the exact error hit when
//      this workflow was first test-run (see git history of this file).
//   2. mathjs's relational operators (`>`, `<`, etc.) do NOT do
//      lexicographic string comparison — `math.evaluate('$$0 > $$1', {$$0:
//      "2026-12-15", $$1: "2027-01-01"})` throws "Cannot convert ... to a
//      number". Two date STRINGS can't be ordered with `>` in mathjs;
//      they must be converted to numbers (epoch seconds) first.
// endDateTsCalc converts contracts.endDate the same way, purely so it can
// be compared numerically to nextDateTsCalc — it runs unconditionally
// (dateCalculation nodes aren't skippable), including when endDate is
// null. `new Date(null)` is a *valid* JS Date (epoch 0), so this never
// errors, it just produces a meaningless huge-negative comparison input
// when endDate is unset — which is exactly why the Condition's `and` only
// ever reaches the `>` comparison after `{{$context.data.endDate}} !=
// null` has already gated it out (mathjs's `and` short-circuits — also
// empirically confirmed, not assumed).
//
// Field/column names (contractCode, contractName, totalAmount,
// retainerDuration, customerId, internalCompanyId, endDate,
// paymentSchedule, and paymentRequests' contractId/customerId/
// internalCompanyId/requestedAmount/status) all confirmed against this
// project's own All Module/Payment/PaymentRequestCreateBlock.js and the
// retainer-automation SQL migration already applied this session — not
// guessed.
//
// {{path}} variable syntax and the {{$jobsMapByNodeKey.<key>}} way of
// referencing an earlier node's own result are confirmed from
// @nocobase/evaluators/src/utils/index.ts (evaluate(), used by both the
// math.js Calculation/Condition engine and by CreateInstruction/
// UpdateInstruction's generic processor.getParsedValue()) and
// plugin-workflow/src/server/Processor.ts's getScope() (`$jobsMapByNodeKey:
// this.jobResultsMapByNodeKey`, i.e. the node's raw result, no ".result"
// suffix needed).
//
// !!! KNOWN PROJECT-SPECIFIC RISK (same as every other workflow this
// session created via script) !!!
// The running server caches enabled workflows in memory. After this
// script runs, open this workflow in Admin -> Workflow, toggle it
// Disabled then Enabled once (even though it's created with
// enabled: true) to force the server to pick it up — this is the same
// step Task 6 Step 11 of the plan already calls for, just applied to a
// script-created row instead of a UI-built one.
//
// How to run: paste into a temporary Nocobase Action block's onClick, or
// the browser dev console on any admin page (ctx is in scope there).
// Idempotent, but NOT "skip if exists" like this project's other setup
// scripts — DELETES any existing workflow with this exact title first,
// then rebuilds it fresh. This is deliberate: Nocobase locks a workflow's
// node graph against further edits once it has recorded any execution
// (see plugin-workflow/src/server/actions/nodes.ts's `versionStats.executed
// > 0` guard on create/update/destroy/move) — a version-1 fix-forward via
// flow_nodes:update is not available once a Test-run has happened, so
// delete+recreate is simpler and more reliable than surgically editing a
// copy-on-write revision. Safe to re-run this way because nothing else
// references this workflow row by id — payment requests it created stand
// on their own and are untouched by deleting the workflow that made them.
//
// BEFORE RUNNING THIS: any verification contract's paymentSchedule that
// was inserted by hand (e.g. via the plan's Task 4 SQL, which predates
// this workflow and never needed a "unit") MUST include
// retainerRule.unit, e.g. '{"retainerRule": {"enabled": true, "unit":
// "month"}, "firstPaymentDate": "..."}'::jsonb — otherwise
// nextDateCalc/nextDateTsCalc's `add(1, unit)` step silently receives
// unit: undefined, which dayjs treats as milliseconds: the node reports
// SUCCESS but nextRetainerBillingDate never visibly advances. Real
// contracts created via ContractCreateForm.js always set this field, so
// this only affects hand-inserted test rows.
// ============================================================

const WORKFLOW_TITLE = "Retainer billing - auto-create next payment request";

// Trigger config shape: packages/plugins/@nocobase/plugin-workflow/src/
// server/triggers/ScheduleTrigger/DateFieldScheduleTrigger.ts
// (ScheduleTriggerConfig) + utils.ts (SCHEDULE_MODE.DATE_FIELD = 1).
const workflowPayload = () => ({
  title: WORKFLOW_TITLE,
  type: "schedule",
  enabled: true,
  sync: false,
  current: true,
  config: {
    mode: 1,
    collection: "contracts",
    startsOn: { field: "nextRetainerBillingDate" },
  },
});

// Node 1 — Calculation. Engine/expression shape from
// CalculationInstruction.ts; {{path}} -> scope substitution confirmed in
// @nocobase/evaluators/src/utils/index.ts (evaluate()).
const periodAmountNodePayload = () => ({
  type: "calculation",
  key: "periodAmountCalc",
  title: "Compute period amount",
  upstreamId: null,
  branchIndex: null,
  config: {
    engine: "math.js",
    expression: "{{$context.data.totalAmount}} / {{$context.data.retainerDuration}}",
  },
});

// Node 2 — Calculation.
const nextPeriodsBilledNodePayload = (upstreamId) => ({
  type: "calculation",
  key: "nextPeriodsBilledCalc",
  title: "Compute next periods-billed count",
  upstreamId,
  branchIndex: null,
  config: {
    engine: "math.js",
    expression: "{{$context.data.retainerPeriodsBilled}} + 1",
  },
});

// Node 3 — Create record. CreateInstruction.ts: config.collection +
// config.params -> repository.create({...params}); values field names
// confirmed against this project's own PaymentRequestCreateBlock.js
// (contractId/customerId/internalCompanyId/requestedAmount/status are
// the real scalar columns, not relation names).
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
          "Payment request - {{$context.data.contractCode}} - {{$context.data.contractName}} - Retainer period {{$jobsMapByNodeKey.nextPeriodsBilledCalc}}",
        status: "submitted",
        contractId: "{{$context.data.id}}",
        customerId: "{{$context.data.customerId}}",
        internalCompanyId: "{{$context.data.internalCompanyId}}",
        requestedAmount: "{{$jobsMapByNodeKey.periodAmountCalc}}",
      },
    },
  },
});

// Node 4 — dateCalculation. Registered as 'dateCalculation' by
// plugin-workflow-date-calculation; steps/functions shape from
// DateCalculationInstruction.ts + dateFunction.ts. add() is dayjs
// .add(number, unit); format() is dayjs .format(formatString). Steps
// chain in order — the LAST step's return value is the node's result
// (a string here, deliberately not converted back to a Date).
const nextDateNodePayload = (upstreamId) => ({
  type: "dateCalculation",
  key: "nextDateCalc",
  title: "Compute next billing date",
  upstreamId,
  branchIndex: null,
  config: {
    input: "{{$context.data.nextRetainerBillingDate}}",
    inputType: "date",
    steps: [
      {
        function: "add",
        arguments: { number: 1, unit: "{{$context.data.paymentSchedule.retainerRule.unit}}" },
      },
      {
        function: "format",
        arguments: { format: "YYYY-MM-DD" },
      },
    ],
  },
});

// Node 5 — dateCalculation. Same node type as nextDateCalc, but the last
// step is toTimestamp (epoch seconds) instead of format — a number that
// mathjs's `>` can actually compare, unlike two date strings (see header
// comment). Duplicates the `add` step because a node's result is always
// just its LAST step's return value — nextDateCalc and nextDateTsCalc
// can't share one output despite computing "the same date".
const nextDateTsNodePayload = (upstreamId) => ({
  type: "dateCalculation",
  key: "nextDateTsCalc",
  title: "Compute next billing date (as timestamp, for comparison)",
  upstreamId,
  branchIndex: null,
  config: {
    input: "{{$context.data.nextRetainerBillingDate}}",
    inputType: "date",
    steps: [
      {
        function: "add",
        arguments: { number: 1, unit: "{{$context.data.paymentSchedule.retainerRule.unit}}" },
      },
      {
        function: "toTimestamp",
        arguments: { unit: "second" },
      },
    ],
  },
});

// Node 6 — dateCalculation. Converts contracts.endDate to the same
// epoch-seconds representation as nextDateTsCalc so the Condition node
// can compare them numerically. Runs even when endDate is null (see
// header comment) — safe only because the Condition gates on
// `endDate != null` BEFORE using this node's result.
const endDateTsNodePayload = (upstreamId) => ({
  type: "dateCalculation",
  key: "endDateTsCalc",
  title: "Compute end date (as timestamp, for comparison)",
  upstreamId,
  branchIndex: null,
  config: {
    input: "{{$context.data.endDate}}",
    inputType: "date",
    steps: [
      {
        function: "toTimestamp",
        arguments: { unit: "second" },
      },
    ],
  },
});

// Node 7 — Condition. ConditionInstruction.ts: engine/expression, same
// math.js evaluator as Calculation. BRANCH_INDEX.ON_TRUE=1/ON_FALSE=0
// from the same file. Word-form `or`/`and` (mathjs has no `||`/`&&`) and
// the two *Ts* nodes' numeric results (not date strings) — both fixes
// empirically verified against this repo's own installed mathjs, see
// this file's header comment.
const stopConditionNodePayload = (upstreamId) => ({
  type: "condition",
  key: "stopCondition",
  title: "Cycles exhausted or past end date?",
  upstreamId,
  branchIndex: null,
  config: {
    engine: "math.js",
    expression:
      "{{$jobsMapByNodeKey.nextPeriodsBilledCalc}} >= {{$context.data.retainerDuration}} or ({{$context.data.endDate}} != null and {{$jobsMapByNodeKey.nextDateTsCalc}} > {{$jobsMapByNodeKey.endDateTsCalc}})",
    rejectOnFalse: false,
  },
});

// Nodes 8/9 — Update record, one per branch. UpdateInstruction.ts:
// config.collection + config.params -> repository.update({...params});
// filterByTk targets the triggering contract row itself.
const updateStopNodePayload = (upstreamId) => ({
  type: "update",
  key: "updateStop",
  title: "Stop billing (cycles done or past end date)",
  upstreamId,
  branchIndex: 1, // ON_TRUE
  config: {
    collection: "contracts",
    params: {
      filterByTk: "{{$context.data.id}}",
      values: {
        retainerPeriodsBilled: "{{$jobsMapByNodeKey.nextPeriodsBilledCalc}}",
        nextRetainerBillingDate: null,
      },
    },
  },
});

const updateContinueNodePayload = (upstreamId) => ({
  type: "update",
  key: "updateContinue",
  title: "Advance to next billing cycle",
  upstreamId,
  branchIndex: 0, // ON_FALSE
  config: {
    collection: "contracts",
    params: {
      filterByTk: "{{$context.data.id}}",
      values: {
        retainerPeriodsBilled: "{{$jobsMapByNodeKey.nextPeriodsBilledCalc}}",
        nextRetainerBillingDate: "{{$jobsMapByNodeKey.nextDateCalc}}",
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

  const created = await ctx.api.request({
    url: "workflows:create",
    method: "POST",
    data: workflowPayload(),
  });
  const workflowId = created?.data?.data?.id;
  if (!workflowId) {
    console.error("[fail] workflow create returned no id", created?.data);
    return;
  }
  console.log(`[created] workflow id=${workflowId}`);

  const createNode = async (payload) => {
    const res = await ctx.api.request({
      url: `workflows/${workflowId}/nodes:create`,
      method: "POST",
      data: payload,
    });
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

  console.log("Done. Next steps (see this file's header comment):");
  console.log("1. Admin -> Workflow -> open this workflow -> toggle Disabled then Enabled once (cache refresh).");
  console.log("2. Re-run the plan's Task 6 verification steps against test contracts before trusting this in production.");
})();
