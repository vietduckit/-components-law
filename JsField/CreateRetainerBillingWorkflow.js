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
//     -> dateCalculation: nextDate = format(add(nextRetainerBillingDate, 1, unit), 'YYYY-MM-DD')
//     -> Condition: nextPeriodsBilled >= retainerDuration
//                   OR (endDate set AND nextDate > endDate)
//          true  -> Update contract: retainerPeriodsBilled=nextPeriodsBilled, nextRetainerBillingDate=null (stop)
//          false -> Update contract: retainerPeriodsBilled=nextPeriodsBilled, nextRetainerBillingDate=nextDate (continue)
//
// nextDate is produced as a 'YYYY-MM-DD' STRING (a trailing `format` step
// in the dateCalculation node), not a Date object — this makes it both
// directly writable into the "date" column AND safely comparable to
// endDate with plain lexicographic `>` inside the Condition's math.js
// expression, with no dependency on how mathjs handles raw Date objects
// (never verified this session).
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
// Idempotent — skips creating the workflow if one with this exact title
// already exists.
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

// Node 5 — Condition. ConditionInstruction.ts: engine/expression, same
// math.js evaluator as Calculation. BRANCH_INDEX.ON_TRUE=1/ON_FALSE=0
// from the same file. Symbolic && / || / != used (not the "and"/"or"
// keyword forms) since only the symbolic operators were confirmed
// against mathjs's own source/tests this session.
const stopConditionNodePayload = (upstreamId) => ({
  type: "condition",
  key: "stopCondition",
  title: "Cycles exhausted or past end date?",
  upstreamId,
  branchIndex: null,
  config: {
    engine: "math.js",
    expression:
      "{{$jobsMapByNodeKey.nextPeriodsBilledCalc}} >= {{$context.data.retainerDuration}} || ({{$context.data.endDate}} != null && {{$jobsMapByNodeKey.nextDateCalc}} > {{$context.data.endDate}})",
    rejectOnFalse: false,
  },
});

// Nodes 6/7 — Update record, one per branch. UpdateInstruction.ts:
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
  if ((existing?.data?.data || []).length > 0) {
    console.log(`[skip] Workflow "${WORKFLOW_TITLE}" already exists (id=${existing.data.data[0].id})`);
    return;
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
  const n5 = await createNode(stopConditionNodePayload(n4.id));
  await createNode(updateStopNodePayload(n5.id));
  await createNode(updateContinueNodePayload(n5.id));

  console.log("Done. Next steps (see this file's header comment):");
  console.log("1. Admin -> Workflow -> open this workflow -> toggle Disabled then Enabled once (cache refresh).");
  console.log("2. Run the plan's Task 6 Steps 8-10 verification against test contracts before trusting this in production.");
})();
