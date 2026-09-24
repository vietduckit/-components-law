// ============================================================
// ONE-TIME DIAGNOSTIC SCRIPT — NOT a reusable field/action block.
//
// Traces the full By Case installment pipeline end to end, to find exactly
// where it stops for a contract that shows "no payment schedule data":
//   ContractCreateForm.js submit
//     -> contractPaymentSchedules row (1 per installment)
//     -> contractPaymentScheduleServices rows (Service tags, §6h)
//     -> by_case_schedule_row_creates_payment_request() SQL trigger fires
//     -> paymentRequests row (auto-created)
//     -> paymentRequestServices rows (tags copied by the same trigger)
//
// Contract status is NOT part of this chain anywhere — ContractCreateForm.js
// only gates on (contractId && isByCase && installments.length). If a
// contract shows no data, it's one of:
//   1. billingCycle wasn't "multiple_payments" (Payment Schedule table never
//      rendered, nothing to submit — most common, not a bug).
//   2. The "Service" field was left empty on every row and validate() should
//      have blocked submit outright (§6m) — check for that warning toast.
//   3. contractPaymentSchedules rows exist, but "contractPaymentScheduleServices"/
//      "paymentRequestServices" don't exist yet (Admin UI collections not
//      created) or the SQL trigger deployed in the DB is a stale version
//      (still expects a "serviceIds" JSON column that was replaced by the
//      junction-table design) — contractPaymentSchedules:create would then
//      itself fail (trigger errors on insert), caught by ContractCreateForm.js
//      as "Could not create payment schedule installment..." (check for that
//      warning toast too).
//   4. contractPaymentSchedules rows exist with 0 paymentRequests — the SQL
//      trigger (pgsql/unified_contract_payment_schedule.sql) hasn't been
//      (re-)run against this DB.
//
// How to run: paste into a temporary NocoBase Action block's onClick, or the
// browser dev console on any admin page (ctx is in scope there). Edit
// CONTRACT_ID below to the contract you're checking (or leave null to scan
// the most recent 10 By Case contracts). Read-only — makes no changes.
// ============================================================

const CONTRACT_ID = null; // <-- set to a specific contract id, or leave null

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

  const contracts = CONTRACT_ID
    ? await list("contracts:list", {
        filter: JSON.stringify({ id: { $eq: CONTRACT_ID } }),
        fields: "id,contractCode,contractName,contractType,billingCycle,status",
      })
    : await list("contracts:list", {
        filter: JSON.stringify({ contractType: { $eq: "byCase" } }),
        fields: "id,contractCode,contractName,contractType,billingCycle,status",
        sort: ["-id"],
        pageSize: 10,
      });

  if (!contracts || !contracts.length) {
    log("[MISSING] No matching By Case contract found.");
    return;
  }

  for (const contract of contracts) {
    log(`\n=== Contract #${contract.id} "${contract.contractCode || contract.contractName}" — status: ${contract.status}, billingCycle: ${contract.billingCycle} ===`);
    if (contract.billingCycle !== "multiple_payments") {
      log(`  [INFO] billingCycle is "${contract.billingCycle}", not "multiple_payments" — Payment Schedule table never rendered for this contract, so 0 rows anywhere below is expected, not a bug.`);
    }

    const schedules = await list("contractPaymentSchedules:list", {
      filter: JSON.stringify({ contractId: { $eq: contract.id } }),
      fields: "id,installmentNo,label,percentage,amount,triggerType",
      sort: ["installmentNo"],
    });
    log(`  contractPaymentSchedules: ${schedules ? schedules.length : "ERROR"} row(s)`);
    if (!schedules || !schedules.length) continue;

    for (const schedule of schedules) {
      const tags = await list("contractPaymentScheduleServices:list", {
        filter: JSON.stringify({ contractPaymentScheduleId: { $eq: schedule.id } }),
        fields: "id,contractServiceId",
      });
      const pr = await list("paymentRequests:list", {
        filter: JSON.stringify({ contractPaymentScheduleId: { $eq: schedule.id } }),
        fields: "id,title,status,conditionMet,requestedAmount",
      });
      const prTagsCount = pr && pr.length
        ? (await list("paymentRequestServices:list", {
            filter: JSON.stringify({ paymentRequestId: { $eq: pr[0].id } }),
            fields: "id,contractServiceId",
          }))?.length ?? "ERROR"
        : "-";
      log(
        `    Đợt ${schedule.installmentNo} "${schedule.label}" (schedule id ${schedule.id}) — ` +
        `service tags: ${tags ? tags.length : "ERROR"} | ` +
        `paymentRequests: ${pr ? pr.length : "ERROR"}${pr && pr.length ? ` (id ${pr[0].id}, status ${pr[0].status}, conditionMet ${pr[0].conditionMet})` : ""} | ` +
        `PR service tags: ${prTagsCount}`,
      );
      if (tags && !tags.length) {
        log(`      [WARN] This installment has NO service tag — validate() should have blocked this at submit time (§6m). Either created before that check existed, or the check didn't fire.`);
      }
      if (pr && !pr.length) {
        log(`      [MISSING] No paymentRequests row for this installment — the SQL trigger (pgsql/unified_contract_payment_schedule.sql) either hasn't been run against this DB, or errored silently on insert. Check contractPaymentSchedules row's own createdAt vs. whether ContractCreateForm.js showed a "Could not create..." warning at that time.`);
      }
    }
  }

  log("\n=== DONE ===");
})();
