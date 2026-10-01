// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Finance P1 (2026-09-28). Daily at 00:10 (server time) runs
//     SELECT * FROM public.finance_refresh_overdue()
// so Payment Requests and Invoices turn overdue on the day after their due
// date even when nothing else touches them (pgsql/finance_foundation.sql).
// Notifications for newly overdue rows are added by Finance P5.
//
// Run pgsql/finance_foundation.sql FIRST (the SQL node calls it).
// After running this script: Admin -> Workflow -> toggle this workflow
// Disabled -> Enabled once (same in-memory-cache caveat as every
// script-created workflow in this project).
//
// How to run: paste into the browser dev console on any admin page (ctx in
// scope) or a temporary Action block's onClick. Idempotent — deletes any
// workflow with this title first, then rebuilds.
// ============================================================

const WORKFLOW_TITLE = "Finance - daily overdue refresh";

const workflowPayload = () => ({
  title: WORKFLOW_TITLE,
  type: "schedule",
  enabled: true,
  sync: false,
  current: true,
  config: {
    mode: 0,
    startsOn: new Date().toISOString(),
    repeat: "10 0 * * *",
  },
});

const sqlNodePayload = () => ({
  type: "sql",
  key: "financeRefreshOverdue",
  title: "Refresh overdue requests and invoices (SQL)",
  upstreamId: null,
  branchIndex: null,
  config: {
    dataSource: "main",
    sql: "SELECT * FROM public.finance_refresh_overdue()",
    withMeta: false,
  },
});

(async () => {
  const existing = await ctx.api.request({
    url: "workflows:list",
    params: { filter: { title: WORKFLOW_TITLE }, paginate: false },
  });
  for (const row of existing?.data?.data || []) {
    await ctx.api.request({ url: "workflows:destroy", method: "POST", params: { filterByTk: row.id } });
    console.log(`[deleted] workflow "${WORKFLOW_TITLE}" id=${row.id}`);
  }

  const created = await ctx.api.request({ url: "workflows:create", method: "POST", data: workflowPayload() });
  const workflowId = created?.data?.data?.id;
  if (!workflowId) {
    console.error("[fail] workflow create returned no id", created?.data);
    return;
  }
  console.log(`[created] workflow id=${workflowId}`);

  const res = await ctx.api.request({ url: `workflows/${workflowId}/nodes:create`, method: "POST", data: sqlNodePayload() });
  console.log(`[created] node "${res?.data?.data?.key}" id=${res?.data?.data?.id}`);

  console.log("Done. Next: Admin -> Workflow -> open this workflow -> toggle Disabled then Enabled once (cache refresh).");
})();
