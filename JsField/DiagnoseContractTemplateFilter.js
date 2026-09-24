// ============================================================
// ONE-TIME DIAGNOSTIC SCRIPT — NOT a reusable field/action block.
//
// ContractCreateForm.js's "Template" field filters the raw `template:list`
// fetch through matchesTemplateModule(t, "contract", form.templateId):
//   !t.templateKey || t.templateKey === "contract" || t.id === selected
// User reports templates with templateKey = "contract" aren't listed. This
// script fetches the raw collection directly (no client-side filter) and
// prints each record's templateKey EXACTLY as the API returns it (value +
// typeof), so a case-mismatch, wrong collection/field name, or an ACL/data
// scope silently excluding rows can be told apart from a real code bug in
// the filter itself.
//
// How to run: paste into a temporary NocoBase Action block's onClick, or
// the browser dev console on any admin page (ctx is in scope there).
// Read-only — makes no changes.
// ============================================================

(async () => {
  const log = (...args) => console.log(...args);

  // ---- 1. Confirm "template" is really the collection name behind this UI ----
  log("=== Collection check ===");
  try {
    const collsRes = await ctx.api.request({
      url: "collections:list",
      params: { paginate: false },
    });
    const colls = collsRes?.data?.data || [];
    const match = colls.find((c) => /template/i.test(c.name || ""));
    if (match) {
      log(`[OK] Found collection "${match.name}" (title: "${match.title}")`);
    } else {
      log("[MISSING] No collection matching /template/i found — check the exact name ContractCreateForm.js uses (\"template:list\").");
    }
  } catch (err) {
    log("[ERROR] collections:list failed:", err?.message || err);
  }

  // ---- 2. Confirm "templateKey" field exists and its declared type/options ----
  log("\n=== Field check: template.templateKey ===");
  try {
    const fieldsRes = await ctx.api.request({
      url: "collections/template/fields:list",
      params: { paginate: false },
    });
    const fields = fieldsRes?.data?.data || [];
    const tk = fields.find((f) => f.name === "templateKey");
    if (tk) {
      log(`[OK] templateKey exists — type: ${tk.type}, interface: ${tk.interface || "-"}`);
      if (tk.uiSchema?.enum) log("      enum options:", JSON.stringify(tk.uiSchema.enum));
    } else {
      log('[MISSING] No field named exactly "templateKey" on collection "template". All field names for reference:', fields.map((f) => f.name).join(", "));
    }
  } catch (err) {
    log("[ERROR] fields:list for \"template\" failed:", err?.message || err);
  }

  // ---- 3. Raw data dump — every record's templateKey, exactly as returned ----
  log("\n=== Raw template:list data (no filter, no fields restriction) ===");
  try {
    const res = await ctx.api.request({
      url: "template:list",
      params: { pageSize: 500, page: 1 },
    });
    const rows = res?.data?.data || [];
    log(`Total records: ${rows.length}`);
    rows.forEach((r) => {
      const nameGuess = r.name || r.templateName || r.title || "(no name field)";
      log(
        `  id=${r.id} | name="${nameGuess}" | templateKey=${JSON.stringify(r.templateKey)} (typeof ${typeof r.templateKey}) | matches "contract" via ===: ${r.templateKey === "contract"}`,
      );
    });
    const contractMatches = rows.filter((r) => r.templateKey === "contract");
    log(`\n[SUMMARY] ${contractMatches.length} record(s) have templateKey === "contract" (strict).`);
    const looseMatches = rows.filter(
      (r) => typeof r.templateKey === "string" && r.templateKey.trim().toLowerCase() === "contract",
    );
    if (looseMatches.length !== contractMatches.length) {
      log(`[WARN] ${looseMatches.length} record(s) match case-insensitively/with whitespace — likely a data casing/typo issue (e.g. "Contract" instead of "contract"), not a code bug.`);
    }
  } catch (err) {
    log('[ERROR] template:list failed:', err?.response?.data || err?.message || err);
  }

  log("\n=== DONE ===");
})();
