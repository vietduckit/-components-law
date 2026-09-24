// ============================================================
// ONE-TIME DIAGNOSTIC SCRIPT — NOT a reusable field/action block.
//
// Before building the new "Create Invoice" JS Block, confirm the real
// "invoices" schema instead of trusting what InvoiceGenerator.js merely
// *reads* (a field a renderer reads defensively with fallbacks is not
// proof the field exists — exactly the lesson from payments.paymentRequestId
// earlier this session, §6z of docs/superpowers/specs/
// 2026-09-17-unified-contract-payment-data-model-design.md: code had
// always tried to write it, but it was never actually registered).
//
// Dumps:
//   1. Every field Nocobase has registered on "invoices" (name, type,
//      interface, enum options for select-type fields like invoiceType/
//      paymentTerms) — the ground truth, not what any JS file assumes.
//   2. One real invoice row, ALL fields, no `fields` restriction — same
//      technique as JsField/DiagnosePaymentRequestLinkage.js.
//   3. Confirms "payments" already has "invoiceId" (belongsTo) registered
//      and usable, since the new block's "From Payment(s)" mode depends
//      on updating that exact field.
//
// How to run: paste into a temporary Nocobase Action block's onClick, or
// the browser dev console on any admin page (ctx is in scope there).
// Read-only — makes no changes.
// ============================================================

(async () => {
  const log = (...args) => console.log(...args);

  const listFields = async (collectionName) => {
    try {
      const res = await ctx.api.request({
        url: `collections/${collectionName}/fields:list`,
        params: { paginate: false },
      });
      return res?.data?.data || [];
    } catch (err) {
      log(`[ERROR] collections/${collectionName}/fields:list failed:`, err?.response?.data || err?.message || err);
      return null;
    }
  };

  const list = async (url, params) => {
    try {
      const res = await ctx.api.request({ url, params: { pageSize: 5, ...params } });
      return res?.data?.data || [];
    } catch (err) {
      log(`[ERROR] ${url} failed:`, err?.response?.data || err?.message || err);
      return null;
    }
  };

  log("=== 1. invoices — registered fields ===");
  const invoiceFields = await listFields("invoices");
  if (invoiceFields) {
    invoiceFields.forEach((f) => {
      const enumOptions = f.uiSchema?.enum;
      log(
        `  ${f.name} | type=${f.type} | interface=${f.interface}` +
        (f.type === "belongsTo" || f.type === "hasMany" || f.type === "belongsToMany"
          ? ` | target=${f.target} | foreignKey=${f.foreignKey || "-"}`
          : "") +
        (Array.isArray(enumOptions) ? ` | options=[${enumOptions.map((o) => o.value).join(", ")}]` : ""),
      );
    });
  }

  log("\n=== 2. Most recent invoices row — raw, all fields ===");
  const recentInvoices = await list("invoices:list", { sort: ["-id"], pageSize: 1 });
  if (recentInvoices && recentInvoices.length) {
    log(JSON.stringify(recentInvoices[0], null, 2));
  } else {
    log("  [INFO] No invoices rows exist yet (or list failed) — nothing to inspect, fields list above is still valid.");
  }

  log("\n=== 3. payments.invoiceId — confirm it's a real, usable belongsTo field ===");
  const paymentFields = await listFields("payments");
  if (paymentFields) {
    const invoiceIdField = paymentFields.find((f) => f.name === "invoiceId" || f.name === "invoice" || f.name === "invoices");
    log(invoiceIdField ? `  FOUND: ${JSON.stringify(invoiceIdField, null, 2)}` : "  [MISSING] No invoiceId/invoice/invoices field registered on payments.");
  }

  log("\n=== DONE ===");
})();
