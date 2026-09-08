// ============================================================
// ONE-TIME SETUP SCRIPT — NOT a reusable field/action block.
//
// Run AFTER pgsql/contracts_drop_dead_columns.sql. Dropping a Postgres
// column directly (rather than through Nocobase's own fields:destroy
// action) can leave Nocobase's field registry pointing at a column that
// no longer exists — this removes that now-orphaned metadata.
//
// contractType intentionally excluded — see contracts_drop_dead_columns.sql's
// own header comment (still drives the native "Type" grid badge).
//
// How to run: paste into a temporary Nocobase Action block's onClick, or
// the browser dev console on any admin page (ctx is in scope there).
// Idempotent — each field is independently try/caught, safe to re-run.
// ============================================================

const FIELDS_TO_REMOVE = [
  "retainerPeriod",
  "monthlyFee",
  "includedHours",
  "overageHourlyRate",
  "retainerDuration",
  "nextRetainerBillingDate",
  "retainerPeriodsBilled",
];

(async () => {
  for (const name of FIELDS_TO_REMOVE) {
    try {
      await ctx.api.request({
        url: "collections/contracts/fields:destroy",
        method: "POST",
        params: { filterByTk: name },
      });
      console.log(`[removed field metadata] contracts.${name}`);
    } catch (e) {
      console.log(`[skip] contracts.${name}: ${e.message}`);
    }
  }
  console.log("Done.");
})();
