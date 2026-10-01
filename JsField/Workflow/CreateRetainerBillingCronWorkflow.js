// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Retainer billing, SQL edition (2026-09-24). All billing logic lives in
// pgsql/retainer_billing_run_due.sql; this Workflow only schedules it and
// notifies the responsible lawyer for each Payment Request it created:
//
//   [Schedule, cron "0 * * * *" — every hour]
//     → SQL:  SELECT * FROM public.retainer_billing_run_due()
//
// 2026-09-28: no Loop / Notification nodes any more — every request the run
// creates is announced to its Finance members by the "Finance - notifications"
// workflow (pgsql/finance_notifications.sql,
// JsField/Workflow/CreateFinanceNotificationsWorkflow.js). Re-run this script
// to drop the old nodes, which told only the contract's responsible lawyer.
//
// A Postgres trigger can't fire "when a date arrives", and pg_cron wasn't an
// option, hence the cron Workflow as the scheduler. Node types / config
// shapes checked against the NocoBase source in this repo:
//   - schedule trigger mode 0 = STATIC (ScheduleTrigger/utils.ts), repeat
//     as a cron string (StaticScheduleTrigger.ts parses it with cron-parser)
//   - 'sql' instruction (plugin-workflow-sql): result = rows array when
//     withMeta is false
//   - 'loop' instruction (plugin-workflow-loop): branch 0 is the loop body;
//     current row is {{$scopes.<loopKey>.item}}
//
// REPLACES and DELETES the previous date-field Workflows (both would bill
// the same plans twice if left running):
//   - "Retainer billing plans - auto-create next payment request"
//     (JsField/Workflow/CreateContractBillingPlansWorkflow.js)
//   - "Retainer billing - auto-create next payment request"
//     (JsField/Workflow/CreateRetainerBillingWorkflow.js, older)
//
// Run pgsql/retainer_billing_run_due.sql FIRST (the SQL node calls it).
// After running this script: Admin -> Workflow -> toggle this workflow
// Disabled -> Enabled once (same in-memory-cache caveat as every
// script-created workflow in this project).
//
// How to run: paste into a temporary NocoBase Action block's onClick, or
// the browser dev console on any admin page (ctx in scope). Idempotent —
// deletes any existing workflow with this title (and the two old ones)
// first, then rebuilds.
// ============================================================

const WORKFLOW_TITLE = "Retainer billing - hourly SQL run";
const SUPERSEDED_TITLES = [
  "Retainer billing plans - auto-create next payment request",
  "Retainer billing - auto-create next payment request",
];

const workflowPayload = () => ({
  title: WORKFLOW_TITLE,
  type: "schedule",
  enabled: true,
  sync: false,
  current: true,
  config: {
    mode: 0,
    startsOn: new Date().toISOString(),
    repeat: "0 * * * *",
  },
});

const sqlNodePayload = () => ({
  type: "sql",
  key: "runRetainerBillingDue",
  title: "Run retainer billing (SQL)",
  upstreamId: null,
  branchIndex: null,
  config: {
    dataSource: "main",
    sql: "SELECT * FROM public.retainer_billing_run_due()",
    withMeta: false,
  },
});

(async () => {
  for (const title of [WORKFLOW_TITLE, ...SUPERSEDED_TITLES]) {
    const existing = await ctx.api.request({
      url: "workflows:list",
      params: { filter: { title }, paginate: false },
    });
    for (const row of existing?.data?.data || []) {
      await ctx.api.request({ url: "workflows:destroy", method: "POST", params: { filterByTk: row.id } });
      console.log(`[deleted] workflow "${title}" id=${row.id}`);
    }
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

  await createNode(sqlNodePayload());

  console.log("Done. Next steps:");
  console.log("1. Admin -> Workflow -> open this workflow -> toggle Disabled then Enabled once (cache refresh).");
  console.log("2. Optional check now: run SELECT * FROM public.retainer_billing_run_due(); in psql only on a test DB (it really bills).");
})();
