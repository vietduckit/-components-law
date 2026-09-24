// ============================================================
// ONE-TIME DIAGNOSTIC SCRIPT — NOT a reusable field/action block. v2.
//
// v1 guessed field names ("paymentCode", a nested "contracts.id" filter)
// that turned out invalid for this payments collection ("Invalid SQL
// column or table reference"). This version filters ONLY by the plain
// "contractId" scalar column (the same fallback listPaymentsByContract()
// in PaymentCreateBlock.js already uses when its own $or filter fails),
// and otherwise dumps raw records with NO fields restriction, so real
// field names are read from the data itself instead of guessed.
//
// How to run: paste into a temporary NocoBase Action block's onClick, or
// the browser dev console on any admin page (ctx is in scope there).
// ============================================================

const CONTRACT_ID = 256; // CT15092026, from the v1 run

(async () => {
  const log = (...args) => console.log(...args);
  const list = async (url, params) => {
    try {
      const res = await ctx.api.request({ url, params: { pageSize: 100, ...params } });
      return res?.data?.data || [];
    } catch (err) {
      log(`[ERROR] ${url} failed:`, err?.response?.data || err?.message || err);
      return null;
    }
  };

  const paymentRequests = await list("paymentRequests:list", {
    filter: JSON.stringify({ contractId: { $eq: CONTRACT_ID } }),
    fields: "id,title,installmentNo,requestedAmount,contractPaymentScheduleId",
    sort: ["installmentNo"],
  });
  log(`=== paymentRequests for contract #${CONTRACT_ID}: ${paymentRequests ? paymentRequests.length : "ERROR"} ===`);
  (paymentRequests || []).forEach((pr) => {
    log(`  id ${pr.id} | "${pr.title}" | installmentNo ${pr.installmentNo} | requestedAmount ${pr.requestedAmount} | contractPaymentScheduleId ${pr.contractPaymentScheduleId}`);
  });

  // Plain scalar filter only — no relation nesting, no guessed field names.
  const payments = await list("payments:list", {
    filter: JSON.stringify({ contractId: { $eq: CONTRACT_ID } }),
  });
  log(`\n=== payments where contractId = ${CONTRACT_ID}: ${payments ? payments.length : "ERROR"} ===`);
  if (payments && payments.length) {
    log("--- raw first record (every field NocoBase actually returns) ---");
    log(JSON.stringify(payments[0], null, 2));
    log("--- summary of all rows ---");
    payments.forEach((p) => {
      log(
        `  id ${p.id} | amount ${p.amount} | paymentStatus "${p.paymentStatus}" | ` +
        `paymentRequestId ${JSON.stringify(p.paymentRequestId)} | scheduleItemId ${JSON.stringify(p.scheduleItemId)}`,
      );
    });
  } else if (payments) {
    log("  [MISSING] Zero rows — the 5,000,000 payment isn't stored with contractId matching this contract at all (may only have the `contracts` relation set, or a different contractId).");
  }

  // Fallback: maybe contractId scalar wasn't set, only the "contracts"
  // belongsTo relation — try that association's default field name too,
  // separately, so an error here doesn't take down the query above.
  const paymentsViaRelation = await list("payments:list", {
    filter: JSON.stringify({ contracts: { id: { $eq: CONTRACT_ID } } }),
  });
  log(`\n=== payments where contracts.id = ${CONTRACT_ID} (relation-based filter): ${paymentsViaRelation ? paymentsViaRelation.length : "ERROR (relation filter unsupported for this collection, as suspected)"} ===`);

  log("\n=== DONE ===");
})();
