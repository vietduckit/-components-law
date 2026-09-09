// ============================================================
// ONE-TIME CLEANUP SCRIPT — NOT a reusable field/action block.
//
// Removes the duplicate "contract" (singular) belongsTo field on
// contractBillingPlans, created accidentally via the Admin UI's
// "Add field" after a "Sync from database" click appeared not to show
// the original "contracts" (plural) relation (a stale Configure-fields
// list, not an actual missing field — confirmed separately via
// JsField/DiagnoseContractBillingPlansFields.js: both "contract" and
// "contracts" resolved to the same belongsTo -> contracts target).
//
// Keeps "contracts" (plural) — the one every workflow/UI script this
// session actually references ($context.data.contracts.*).
//
// How to run: paste into a temporary Nocobase Action block's onClick, or
// the browser dev console on any admin page (ctx is in scope there).
// Idempotent — no-ops if the field is already gone.
// ============================================================

(async () => {
  try {
    await ctx.api.request({
      url: "collections/contractBillingPlans/fields:destroy",
      method: "POST",
      params: { filterByTk: "contract" },
    });
    console.log("[removed] contractBillingPlans.contract (duplicate singular relation)");
  } catch (e) {
    console.log(`[skip] contractBillingPlans.contract: ${e.message}`);
  }

  const res = await ctx.api.request({
    url: "collections/contractBillingPlans/fields:list",
    params: { paginate: false },
  });
  const names = (res?.data?.data || []).map((f) => f.name).sort();
  console.log("Remaining fields:", names.join(", "));
})();
