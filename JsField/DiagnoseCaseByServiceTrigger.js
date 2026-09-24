// ============================================================
// ONE-TIME DIAGNOSTIC SCRIPT — NOT a reusable field/action block.
//
// Checks why the By Service isPaymentTrigger checkbox isn't showing for a
// specific case's tasks:
//   1. Does this case (project) have a contractId set at all?
//   2. What is that contract's contractType — is it really "byService"?
//   3. For each task in this case: is projectServiceId set, and is
//      isPaymentTrigger true/false?
//
// How to run: open the Case detail page you're testing on (so
// ctx.record.id is that case), paste into a temporary Action block's
// onClick or the browser dev console. Read-only — makes no changes.
// ============================================================

(async () => {
  const log = (...args) => console.log(...args);
  const caseId = ctx.record?.id;
  if (!caseId) {
    log("[ERROR] No ctx.record.id — run this on a Case detail page.");
    return;
  }
  log(`\n=== Case id: ${caseId} ===`);

  let contractId = null;
  try {
    const projRes = await ctx.api.request({
      url: "projects:get",
      params: { filterByTk: caseId, fields: "id,contractId,caseCode,projectName" },
    });
    const proj = projRes?.data?.data || projRes?.data || {};
    contractId = proj.contractId || null;
    log(`caseCode: ${proj.caseCode} | projectName: ${proj.projectName}`);
    log(`projects.contractId: ${contractId ?? "(null — case has NO linked contract)"}`);
  } catch (err) {
    log("[ERROR] projects:get failed:", err?.message || err);
    return;
  }

  if (!contractId) {
    log("\n[ROOT CAUSE FOUND] This case has no linked contract at all — the isPaymentTrigger checkbox will never show for any of its tasks, regardless of what was ticked during case creation.");
  } else {
    try {
      const contractRes = await ctx.api.request({
        url: "contracts:get",
        params: { filterByTk: contractId, fields: "id,contractCode,contractName,contractType" },
      });
      const contract = contractRes?.data?.data || contractRes?.data || {};
      log(`\nLinked contract: ${contract.contractCode} - ${contract.contractName}`);
      log(`contracts.contractType: "${contract.contractType}"`);
      if (contract.contractType !== "byService") {
        log(`\n[ROOT CAUSE FOUND] This contract's type is "${contract.contractType}", not "byService" — the checkbox is correctly hidden by design. Either this case is linked to the wrong contract, or the contract's Type field needs to be set to By Service.`);
      } else {
        log("\n[OK] contractType is byService — the gate SHOULD pass. Checking tasks next...");
      }
    } catch (err) {
      log("[ERROR] contracts:get failed:", err?.message || err);
    }
  }

  try {
    const tasksRes = await ctx.api.request({
      url: "tasks:list",
      params: {
        filter: JSON.stringify({ projectId: { $eq: caseId } }),
        fields: "id,title,serviceId,projectServiceId,isPaymentTrigger,status",
        pageSize: 200,
      },
    });
    const tasks = tasksRes?.data?.data || [];
    log(`\n=== Tasks in this case (${tasks.length}) ===`);
    tasks.forEach((t) => {
      log(
        `- [${t.id}] "${t.title}" | status: ${t.status} | serviceId: ${t.serviceId ?? "null"} | projectServiceId: ${t.projectServiceId ?? "null (checkbox will show DISABLED for this task even if contractType is byService)"} | isPaymentTrigger: ${t.isPaymentTrigger}`,
      );
    });
  } catch (err) {
    log("[ERROR] tasks:list failed:", err?.message || err);
  }

  log("\n=== DONE — copy this whole console output back for diagnosis ===");
})();
