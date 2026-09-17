// ============================================================
// ONE-TIME DIAGNOSTIC SCRIPT — NOT a reusable field/action block.
//
// Checks the 5 open items from
// docs/superpowers/specs/2026-09-17-unified-contract-payment-data-model-design.md
// §6, directly against NocoBase's own field/collection metadata via the
// API, before writing the SQL trigger file that depends on the real
// column/table names.
//
// How to run: paste into a temporary NocoBase Action block's onClick, or
// the browser dev console on any admin page (ctx is in scope there).
// Read-only — makes no changes.
// ============================================================

(async () => {
  const log = (...args) => console.log(...args);

  // ---- Item 1: real table name behind the "Contract Payment Schedule" collection ----
  log("\n=== Item 1: contractPaymentSchedule — real collection/table name ===");
  let scheduleCollectionName = null;
  try {
    const collsRes = await ctx.api.request({
      url: "collections:list",
      params: { paginate: false },
    });
    const colls = collsRes?.data?.data || [];
    const match = colls.find(
      (c) =>
        /contractpaymentschedule/i.test(c.name || "") ||
        /contract payment schedule/i.test(c.title || ""),
    );
    if (match) {
      scheduleCollectionName = match.name;
      log(`[OK] collection name: "${match.name}" | tableName: "${match.tableName || "(same as name)"}" | title: "${match.title}"`);
    } else {
      log("[MISSING] No collection matching 'contractPaymentSchedule' found in collections:list.");
      log("All collection names for reference:", colls.map((c) => c.name).join(", "));
    }
  } catch (err) {
    log("[ERROR] collections:list failed:", err?.message || err);
  }

  // ---- helper: dump a collection's fields, flagging belongsTo foreignKey + enum options ----
  const dumpFields = async (collectionName, focusFieldNames = []) => {
    log(`\n=== Fields for "${collectionName}" ===`);
    try {
      const res = await ctx.api.request({
        url: `collections/${collectionName}/fields:list`,
        params: { paginate: false },
      });
      const fields = res?.data?.data || [];
      log(`Total fields: ${fields.length}`);
      fields.forEach((f) => {
        const isFocus = focusFieldNames.includes(f.name);
        const prefix = isFocus ? ">>> " : "- ";
        let line = `${prefix}${f.name} (${f.type}, interface: ${f.interface || "-"})`;
        if (f.target) line += ` -> target: ${f.target}`;
        if (f.foreignKey) line += ` | foreignKey: "${f.foreignKey}"`;
        if (f.sourceKey) line += ` | sourceKey: "${f.sourceKey}"`;
        log(line);
        if (isFocus && f.uiSchema?.enum) {
          log(`      enum options: ${JSON.stringify(f.uiSchema.enum)}`);
        }
        if (isFocus && f.uiSchema?.description) {
          log(`      description: ${f.uiSchema.description}`);
        }
      });
      return fields;
    } catch (err) {
      log(`[ERROR] fields:list for "${collectionName}" failed:`, err?.message || err);
      return [];
    }
  };

  // ---- Item 2: tasks.caseService — real foreignKey column ----
  log("\n=== Item 2: tasks — caseService/contractService raw FK columns + isPaymentTrigger ===");
  await dumpFields("tasks", ["caseService", "contractService", "quotationService", "isPaymentTrigger", "linkedPaymentRequestId", "serviceId", "projectId"]);

  // ---- Item 3: contractPaymentSchedule.triggerType option list ----
  if (scheduleCollectionName) {
    log("\n=== Item 3: contractPaymentSchedule.triggerType option list ===");
    await dumpFields(scheduleCollectionName, ["triggerType", "contracts", "paymentRequests", "installmentNo", "percentage", "amount"]);
  }

  // ---- Item 4: paymentRequests.sourceSnapshot metadata (type/description only — intent needs a human answer) ----
  log("\n=== Item 4: paymentRequests — sourceSnapshot + new FK fields ===");
  await dumpFields("paymentRequests", [
    "sourceSnapshot",
    "installmentNo",
    "contractPaymentSchedule",
    "projectServices",
    "contractServices",
    "triggerType",
    "conditionMet",
    "status",
  ]);

  // ---- Item 5: projectServices -> contracts join path ----
  log("\n=== Item 5: projectServices — join path back to contracts ===");
  await dumpFields("projectServices", ["contractId", "contractServiceId", "contractServices", "projectId", "project", "totalAmount"]);

  log("\n=== Item 5b: contractServices — for cross-check ===");
  await dumpFields("contractServices", ["contractId", "id", "totalAmount"]);

  log("\n=== DONE — copy this whole console output back for the spec confirmation ===");
})();
