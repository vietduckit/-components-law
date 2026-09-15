// ============================================================
// SUPERSEDED (2026-09-15) — kept for history, do not run.
// Replaced by pgsql/by_case_payment_request_automation.sql
// (by_case_create_scheduled_payment_requests trigger) — user's explicit
// decision to switch from Workflow to a plain SQL trigger file for easier
// deployment/maintenance (git-tracked, idempotent, survives a DB restore,
// no per-environment Admin UI rebuild). If this workflow is still enabled
// on any environment, disable/delete it before applying that SQL file, or
// Payment Requests will be created twice per contract.
// ============================================================
//
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// WF1 of docs/superpowers/specs/2026-09-15-by-case-payment-request-automation-design.md §5.
// Trigger: Collection event on `contracts`, CREATE only, condition
// contractType == "byCase". For every row in paymentSchedule.installments,
// creates one `paymentRequests` (+ matching `paymentRequestItems`) at
// status "pending" — active immediately only if the installment's
// triggerType is "on_signed" AND it already has a paymentDate.
//
// !!! BUG FOUND AND FIXED THIS REVISION (confirmed against a live
// execution, execution id 386803035602944, job log: `Error: Cannot
// convert "on_signed" to a number` on a "conditionMetCalc" calculation
// node) !!!
// The original version of this file used a `calculation`-type node with
// `engine: "math.js"` to test `{{...}} == "on_signed"`. This project's
// other workflow scripts (CreateContractBillingPlansWorkflow.js etc.) only
// ever use math.js for NUMERIC/date comparisons — this file was the first
// to try a STRING equality check with it, and it turns out mathjs's `==`/
// `equal()` in the version bundled here always attempts to coerce both
// operands to numbers, regardless of syntax, and throws for any
// non-numeric string. Confirmed directly against the real installed
// `mathjs` package (not just inferred from source):
//   math.evaluate('$$0 == "on_signed"', { $$0: "on_signed" })
//   => Error: Cannot convert "on_signed" to a number
// (`{{...}} != null` checks, used elsewhere in this file and in WF3, are
// NOT affected — confirmed separately that `!= null` works fine for both
// null and string scope values.)
//
// Fix: string equality now goes through a `condition`-type node's
// `calculation` config (`{calculator: 'equal', operands: [a, b]}`,
// evaluated by logicCalculate.ts's plain `a == b`, NOT mathjs) instead of
// a `calculation`-type node's `engine: "math.js"` expression. This also
// meant restructuring away the standalone "conditionMetCalc" boolean value
// entirely — a `calculation` node can only run `engine`+`expression`
// (mathjs/formula.js/string), never the `calculation`/logicCalculate
// format, so there was no way to produce a reusable boolean via
// logicCalculate for later reference. Instead, the loop body now branches
// on "is this triggerType on_signed" FIRST, and each branch creates the
// Payment Request with a literal (not computed) `conditionMet` value.
//
// Node graph (Loop body, once per installment):
//   1. Condition "isOnSigned" (loop body's entry — see the branchIndex
//      note below) — `{{triggerType}} == "on_signed"` via the
//      calculation/logicCalculate format (safe for strings).
//      -> true (branchIndex 1): Create "createPR_onSigned"
//         (conditionMet: true literal) -> Create "createPRItem_onSigned"
//         -> Condition "hasDueDate_onSigned" (`!= null`, math.js is fine
//         here — only null-checking, not string equality) -> true
//         (branchIndex 1): Update "activatePR_onSigned" (status: active).
//      -> false (branchIndex 0): Create "createPR_other"
//         (conditionMet: false literal) -> Create "createPRItem_other".
//         No due-date/activation check needed on this side — conditionMet
//         is false, so activation can never happen at creation time
//         regardless of the due date; WF2/WF3/WF4 handle it later.
//
// IMPORTANT node-graph detail, confirmed by reading Processor.ts directly
// (not assumed from the two pre-existing example scripts, which never use
// a Loop node): a Loop's own body only runs at all if its first child node
// has a NON-NULL branchIndex (Processor.getBranches filters out
// branchIndex === null, and LoopInstruction takes the first result) — so
// "isOnSigned" below uses branchIndex: 0 for THAT reason (its role as the
// loop's single body entry), which is unrelated to and does not conflict
// with the branchIndex 0/1 ITS OWN downstream children use (branchIndex is
// always relative to a node's own immediate parent).
//
// How to run: paste into a temporary Nocobase Action block's onClick, or
// the browser dev console on any admin page (ctx is in scope there).
// Idempotent — deletes any existing workflow with this exact title first,
// then rebuilds fresh (same convention as CreateContractBillingPlansWorkflow.js;
// a Test run locks the node graph, so delete+recreate beats patching).
//
// !!! After running, Admin -> Workflow -> open this workflow -> toggle
// Disabled -> Enabled once, to force the running server to pick it up
// (this project's own documented in-memory-cache gotcha — see
// docs/superpowers/specs/2026-09-05-contract-payment-status-workflow-design.md §1). !!!
// ============================================================

const WORKFLOW_TITLE = "By Case - create scheduled Payment Requests on contract save";

const workflowPayload = () => ({
  title: WORKFLOW_TITLE,
  type: "collection",
  enabled: true,
  sync: false,
  current: true,
  config: {
    collection: "contracts",
    mode: 1, // CREATE only — see header comment
    condition: { contractType: { $eq: "byCase" } },
    appends: [],
  },
});

const loopNodePayload = () => ({
  type: "loop",
  key: "installmentsLoop",
  title: "For each installment in paymentSchedule",
  upstreamId: null,
  branchIndex: null,
  config: {
    target: "{{$context.data.paymentSchedule.installments}}",
  },
});

const isOnSignedConditionNodePayload = (loopId) => ({
  type: "condition",
  key: "isOnSigned",
  title: "Is this installment's triggerType on_signed?",
  upstreamId: loopId,
  branchIndex: 0, // loop body's single entry point — must be non-null, see header comment
  config: {
    calculation: {
      calculator: "equal",
      operands: ["{{$scopes.installmentsLoop.item.triggerType}}", "on_signed"],
    },
    rejectOnFalse: false, // false = the "other" branch below, not an error
  },
});

const createPRPayload = (key, upstreamId, branchIndex, conditionMetLiteral) => ({
  type: "create",
  key,
  title: `Create Payment Request (pending, conditionMet=${conditionMetLiteral})`,
  upstreamId,
  branchIndex,
  config: {
    collection: "paymentRequests",
    params: {
      values: {
        title:
          "Đợt {{$scopes.installmentsLoop.item.installmentNo}} - {{$context.data.contractCode}} - {{$context.data.contractName}}",
        status: "pending",
        triggerType: "{{$scopes.installmentsLoop.item.triggerType}}",
        conditionMet: conditionMetLiteral,
        installmentNo: "{{$scopes.installmentsLoop.item.installmentNo}}",
        contractId: "{{$context.data.id}}",
        customerId: "{{$context.data.customerId}}",
        internalCompanyId: "{{$context.data.internalCompanyId}}",
        requestedAmount: "{{$scopes.installmentsLoop.item.amount}}",
        dueDate: "{{$scopes.installmentsLoop.item.paymentDate}}",
        currency: "VND",
        requestType: "create_payment",
      },
    },
  },
});

const createPRItemPayload = (key, upstreamId, createPRNodeKey) => ({
  type: "create",
  key,
  title: "Create Payment Request Item",
  upstreamId,
  branchIndex: null,
  config: {
    collection: "paymentRequestItems",
    params: {
      values: {
        paymentRequestId: `{{$jobsMapByNodeKey.${createPRNodeKey}.id}}`,
        contractId: "{{$context.data.id}}",
        lineType: "schedule_installment",
        lineStatus: "pending",
        scheduleItemId: "{{$scopes.installmentsLoop.item.id}}",
        installmentNo: "{{$scopes.installmentsLoop.item.installmentNo}}",
        lineLabel: "{{$scopes.installmentsLoop.item.label}}",
        description: "{{$scopes.installmentsLoop.item.content}}",
        plannedPaymentDate: "{{$scopes.installmentsLoop.item.paymentDate}}",
        requestedAmount: "{{$scopes.installmentsLoop.item.amount}}",
      },
    },
  },
});

const hasDueDateConditionNodePayload = (upstreamId) => ({
  type: "condition",
  key: "hasDueDate_onSigned",
  title: "Does it already have a due date?",
  upstreamId,
  branchIndex: null,
  config: {
    engine: "math.js", // safe here — this is a null-check, not string equality
    expression: "{{$scopes.installmentsLoop.item.paymentDate}} != null",
    rejectOnFalse: false,
  },
});

const activatePRNodePayload = (upstreamId, createPRNodeKey) => ({
  type: "update",
  key: "activatePR_onSigned",
  title: "Activate Payment Request immediately",
  upstreamId,
  branchIndex: 1, // ON_TRUE
  config: {
    collection: "paymentRequests",
    params: {
      filterByTk: `{{$jobsMapByNodeKey.${createPRNodeKey}.id}}`,
      values: { status: "active" },
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

  const nLoop = await createNode(loopNodePayload());
  const nIsOnSigned = await createNode(isOnSignedConditionNodePayload(nLoop.id));

  // TRUE branch (on_signed)
  const nCreatePRSigned = await createNode(createPRPayload("createPR_onSigned", nIsOnSigned.id, 1, true));
  const nCreateItemSigned = await createNode(
    createPRItemPayload("createPRItem_onSigned", nCreatePRSigned.id, "createPR_onSigned"),
  );
  const nHasDueDate = await createNode(hasDueDateConditionNodePayload(nCreateItemSigned.id));
  await createNode(activatePRNodePayload(nHasDueDate.id, "createPR_onSigned"));

  // FALSE branch (on_task_done / on_case_done)
  const nCreatePROther = await createNode(createPRPayload("createPR_other", nIsOnSigned.id, 0, false));
  await createNode(createPRItemPayload("createPRItem_other", nCreatePROther.id, "createPR_other"));

  console.log("Done. Next steps:");
  console.log("1. Admin -> Workflow -> open this workflow -> toggle Disabled then Enabled once (cache refresh).");
  console.log(
    "2. Create a test By Case contract with a 3-installment schedule (one of each triggerType, mixed paymentDate presence) and confirm 3 paymentRequests + 3 paymentRequestItems rows appear with the expected status/conditionMet per §7 of the design spec.",
  );
})();
