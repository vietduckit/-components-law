// ============================================================
// ONE-TIME DIAGNOSTIC SCRIPT — NOT a reusable field/action block.
//
// Confirms the 2 new junction collections §6h (
// docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md)
// depends on actually exist, with the expected FK column names, before
// relying on ContractCreateForm.js's new "Service" column, the updated
// by_case_schedule_row_creates_payment_request() trigger
// (pgsql/unified_contract_payment_schedule.sql), or TaskDetailView.js/
// TaskManagement.js's installment-picker filtering:
//   - contractPaymentScheduleServices (contractPaymentScheduleId, contractServiceId)
//   - paymentRequestServices (paymentRequestId, contractServiceId)
//
// Both are plain junction collections (matching this codebase's existing
// serviceCombos/serviceComboItems pattern), created via Admin UI — this
// script only checks whether that's been done correctly, it does not
// create them itself.
//
// How to run: paste into a temporary NocoBase Action block's onClick, or
// the browser dev console on any admin page (ctx is in scope there).
// Read-only — makes no changes.
// ============================================================

(async () => {
  const log = (...args) => console.log(...args);

  const checkJunctionCollection = async (collectionName, expectedFkFields) => {
    log(`\n=== "${collectionName}" ===`);
    try {
      const res = await ctx.api.request({
        url: `collections/${collectionName}/fields:list`,
        params: { paginate: false },
      });
      const fields = res?.data?.data || [];
      if (!fields.length) {
        log(`[MISSING] Collection "${collectionName}" not found (or has no fields) — create it via Admin UI first.`);
        return;
      }
      expectedFkFields.forEach((fieldName) => {
        const match = fields.find((f) => f.name === fieldName);
        if (match) {
          const isScalar = match.type === "bigInt" || match.type === "integer";
          log(`[OK] "${fieldName}" exists — type: ${match.type}, interface: ${match.interface || "-"}${isScalar ? "" : "  [WARN] expected a plain integer/bigInt field"}`);
        } else {
          log(`[MISSING] "${fieldName}" not found on "${collectionName}". Add it via Admin UI (bigInt/Integer).`);
        }
      });
      log("All fields on this collection:", fields.map((f) => `${f.name}(${f.type})`).join(", "));
    } catch (err) {
      log(`[ERROR] fields:list for "${collectionName}" failed:`, err?.message || err);
    }
  };

  log("=== §6h: service-tagged installments — required junction collections ===");
  await checkJunctionCollection("contractPaymentScheduleServices", [
    "contractPaymentScheduleId",
    "contractServiceId",
  ]);
  await checkJunctionCollection("paymentRequestServices", [
    "paymentRequestId",
    "contractServiceId",
  ]);

  log("\n=== DONE ===");
})();
