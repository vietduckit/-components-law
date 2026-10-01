// ============================================================
// ONE-TIME DIAGNOSTIC — money / currency flow schema (2026-09-29)
//
// Before the "DB computes service-line money" design (quotation -> contract
// -> case -> finance) is written as SQL, this checks on the live instance:
//   1. the real field / column names of every table in the money flow
//      (the schema/ dump is old: exchangeRates, quotationServices.subtotal,
//      projectServices totals are uncertain);
//   2. the currencies + exchangeRates data the trigger will read;
//   3. which convention each saved foreign-currency service line follows
//      today: amounts in the line currency ("native") or in VND.
//
// How to run: paste into a JS Block on any admin page (or a temporary
// Action's onClick). Read-only — only list/get requests, nothing is written.
// Press "Copy report" and send the JSON back.
// ============================================================

const { React } = ctx;
const { useEffect, useState } = React;
const { Button, Tag, Spin, Alert, Collapse, message } = ctx.antd;
const h = React.createElement;

// Collection -> fields the design relies on. "a|b" = either name is fine.
const REQUIRED = {
  currencies: ["code", "decimalPlaces", "isBaseCurrency"],
  quotationServices: [
    "quotationId", "serviceId", "basePrice", "quantity", "vat", "currencyId",
    "exchangeRateToBase", "subTotal|subtotal", "vatAmount", "totalAmount",
    "pricingMode", "packageSubTotal", "packageVatAmount", "packageTotalAmount", "createdAt",
  ],
  contractServices: [
    "contractId", "projectServiceId", "quotationServiceId", "serviceId|ServiceId",
    "basePrice", "quantity", "vat", "currencyId", "exchangeRateToBase",
    "subTotal|subtotal", "vatAmount", "totalAmount", "pricingMode",
    "packageSubTotal", "packageVatAmount", "packageTotalAmount", "lineStatus",
  ],
  projectServices: [
    "projectId", "quotationServiceId", "contractServiceId", "serviceId",
    "basePrice", "quantity", "vat", "currencyId", "exchangeRateToBase",
    "subTotal|subtotal", "vatAmount", "totalAmount", "pricingMode",
    "packageSubTotal", "packageVatAmount", "packageTotalAmount", "status",
  ],
  quotations: [
    "currencyId", "subTotal", "vatAmount", "totalAmount", "pricingMode",
    "packageSubTotal", "packageVatRate", "status", "createdAt", "validUntil",
  ],
  contracts: [
    "currencyId", "subTotal", "vatAmount", "totalAmount", "fixedAmount",
    "signedDate", "contractType", "billingCycle", "monthlyFee", "retainerDuration",
    "pricingMode", "packageVatRate",
  ],
  projects: ["contractId", "quotationId", "currencyId|currencies", "subTotal", "vatAmount", "totalAmount"],
  paymentRequests: [
    "contractId", "requestedAmount", "currency", "contractServiceId", "projectServiceId",
    "contractPaymentScheduleId", "sourceSnapshot", "status",
  ],
  paymentRequestServices: ["paymentRequestId", "contractServiceId"],
  contractPaymentSchedules: ["contractId", "amount", "percentage"],
  contractPaymentScheduleServices: ["contractPaymentScheduleId", "contractServiceId"],
  invoices: ["paymentRequestId", "contractId", "totalAmount", "amountPaid"],
  payments: ["amount", "currencyId", "exchangeRateToBase", "paymentRequestId", "invoiceId", "contractId", "paymentStatus"],
};
const LINE_TABLES = ["quotationServices", "contractServices", "projectServices"];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const round = (v, d) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};
const idOf = (v) => {
  if (v == null || v === "") return null;
  if (typeof v === "object") return idOf(v.id);
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

async function listAll(url, params = {}) {
  const res = await ctx.api.request({ url, params: { pageSize: 200, page: 1, ...params } });
  return res?.data?.data || [];
}

async function fieldsOf(collection) {
  const res = await ctx.api.request({
    url: `collections/${collection}/fields:list`,
    params: { paginate: false },
  });
  return (res?.data?.data || []).map((f) => ({
    name: f.name,
    column: f.field || f.name,
    type: f.type,
    interface: f.interface || null,
    foreignKey: f.foreignKey || null,
    target: f.target || null,
  }));
}

// One line: is its saved total the line-currency total or the VND one?
function classifyLine(row, currency, fieldHas) {
  const dec = num(currency?.decimalPlaces) ?? (currency?.code === "VND" ? 0 : 2);
  const qty = num(row.quantity) || 1;
  const base = num(row.basePrice) || 0;
  const vat = num(row.vat) || 0;
  const sub = round(base * qty, dec);
  const nativeTotal = round(sub + round((sub * vat) / 100, dec), dec);
  const saved = num(row.totalAmount);
  const rate = num(row.exchangeRateToBase);
  let verdict = "unknown";
  if (saved == null) verdict = fieldHas.totalAmount ? "no total saved" : "no totalAmount field";
  else if (nativeTotal === 0) verdict = "zero price";
  else if (Math.abs(saved - nativeTotal) <= 10 ** -dec) verdict = "native";
  else if (rate && rate > 1 && Math.abs(saved - nativeTotal * rate) <= Math.max(1, nativeTotal * rate * 0.001)) verdict = "VND (rate on row)";
  else if (saved / nativeTotal > 500) verdict = "VND? (rate missing/other)";
  else verdict = "mismatch";
  return {
    id: row.id,
    name: row.serviceName || null,
    currency: currency?.code || null,
    basePrice: base,
    quantity: qty,
    vat,
    savedSubTotal: num(row.subTotal ?? row.subtotal),
    savedVatAmount: num(row.vatAmount),
    savedTotal: saved,
    exchangeRateToBase: rate,
    expectedNativeTotal: nativeTotal,
    verdict,
  };
}

async function runDiagnostics() {
  const report = { generatedAt: new Date().toISOString(), collections: {}, missing: [], errors: [] };

  // 1. Collections, including anything that looks like a rate / currency table
  let allCollections = [];
  try {
    const res = await ctx.api.request({ url: "collections:list", params: { paginate: false } });
    allCollections = res?.data?.data || [];
  } catch (e) {
    report.errors.push(`collections:list: ${e?.message || e}`);
  }
  const byName = new Map(allCollections.map((c) => [c.name, c]));
  report.rateLikeCollections = allCollections
    .filter((c) => /exchange|currenc|rate/i.test(c.name || ""))
    .map((c) => ({ name: c.name, title: c.title || null, tableName: c.tableName || null }));

  const rateCollection = ["exchangeRates", "exchangeRate", "ExchangeRates"].find((n) => byName.has(n))
    || report.rateLikeCollections.find((c) => /exchange/i.test(c.name))?.name
    || null;
  report.rateCollection = rateCollection;

  const toCheck = { ...REQUIRED };
  if (rateCollection) toCheck[rateCollection] = [];

  for (const [collection, required] of Object.entries(toCheck)) {
    const info = { exists: byName.has(collection), tableName: byName.get(collection)?.tableName || null, fields: [], required: [] };
    report.collections[collection] = info;
    if (!info.exists) {
      report.missing.push(`${collection} (collection)`);
      continue;
    }
    try {
      info.fields = await fieldsOf(collection);
    } catch (e) {
      report.errors.push(`${collection} fields: ${e?.message || e}`);
      continue;
    }
    for (const req of required) {
      const names = req.split("|");
      const hit = info.fields.find((f) => names.includes(f.name) || names.includes(f.column));
      const entry = hit
        ? { required: req, field: hit.name, column: hit.column, type: hit.type, status: names[0] === hit.name ? "ok" : "alt name" }
        : { required: req, status: "missing" };
      info.required.push(entry);
      if (!hit) report.missing.push(`${collection}.${req}`);
    }
  }

  // 2. Currencies + exchange rates actually stored
  try {
    report.currencies = (await listAll("currencies:list")).map((c) => ({
      id: c.id, code: c.code, decimalPlaces: c.decimalPlaces, isBaseCurrency: c.isBaseCurrency,
    }));
  } catch (e) {
    report.currencies = [];
    report.errors.push(`currencies:list: ${e?.message || e}`);
  }
  if (rateCollection) {
    try {
      const rows = await listAll(`${rateCollection}:list`, { pageSize: 20, sort: ["-id"] });
      report.exchangeRateKeys = rows[0] ? Object.keys(rows[0]) : [];
      report.exchangeRateSample = rows.slice(0, 10);
    } catch (e) {
      report.errors.push(`${rateCollection}:list: ${e?.message || e}`);
    }
  }

  // 3. Which convention the saved foreign-currency lines follow
  const currencyById = new Map((report.currencies || []).map((c) => [idOf(c.id), c]));
  const base = (report.currencies || []).find((c) => c.isBaseCurrency) || (report.currencies || []).find((c) => c.code === "VND");
  report.lineConvention = {};
  for (const table of LINE_TABLES) {
    const info = report.collections[table];
    if (!info?.exists) continue;
    const fieldHas = Object.fromEntries(info.fields.map((f) => [f.name, true]));
    try {
      const rows = await listAll(`${table}:list`, { pageSize: 500, sort: ["-id"] });
      const lines = rows.filter((r) => String(r.pricingMode || "").toLowerCase() !== "package");
      const foreign = lines.filter((r) => {
        const cid = idOf(r.currencyId ?? r.currency ?? r.currencies);
        return cid && base && cid !== idOf(base.id);
      });
      const classified = foreign.map((r) => classifyLine(r, currencyById.get(idOf(r.currencyId ?? r.currency ?? r.currencies)), fieldHas));
      const counts = {};
      classified.forEach((c) => { counts[c.verdict] = (counts[c.verdict] || 0) + 1; });
      report.lineConvention[table] = {
        scannedLatest: rows.length,
        packageLines: rows.length - lines.length,
        noCurrency: lines.filter((r) => !idOf(r.currencyId ?? r.currency ?? r.currencies)).length,
        foreignLines: foreign.length,
        verdicts: counts,
        samples: classified.slice(0, 15),
      };
    } catch (e) {
      report.errors.push(`${table}:list: ${e?.message || e}`);
    }
  }
  return report;
}

// The full report is too long to paste into a chat (> 50k characters), so
// "Copy report" sends this: each field as "name:type" (plus "->column" or
// "->target" when it matters), and only the rate columns the design reads.
function compactReport(report) {
  const collections = {};
  for (const [name, info] of Object.entries(report.collections)) {
    if (!info.exists) {
      collections[name] = "MISSING";
      continue;
    }
    collections[name] = {
      missing: info.required.filter((r) => r.status === "missing").map((r) => r.required),
      altNames: info.required.filter((r) => r.status === "alt name").map((r) => `${r.required}=${r.field}`),
      fields: info.fields.map((f) => {
        let s = `${f.name}:${f.type}`;
        if (f.column !== f.name) s += `->${f.column}`;
        if (f.foreignKey) s += `(fk ${f.foreignKey}${f.target ? ` > ${f.target}` : ""})`;
        return s;
      }),
    };
  }
  const RATE_KEYS = ["id", "fromCurrencyId", "toCurrencyId", "rate", "effectiveDate", "status", "isLocked", "source"];
  return {
    generatedAt: report.generatedAt,
    rateCollection: report.rateCollection,
    rateLikeCollections: report.rateLikeCollections,
    currencies: report.currencies,
    exchangeRateKeys: report.exchangeRateKeys,
    exchangeRateSample: (report.exchangeRateSample || []).map((r) => Object.fromEntries(RATE_KEYS.map((k) => [k, r[k]]))),
    lineConvention: report.lineConvention,
    missing: report.missing,
    errors: report.errors,
    collections,
  };
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

const cell = { padding: "4px 8px", borderBottom: "1px solid #f0f0f0", fontSize: 12.5, verticalAlign: "top", overflowWrap: "anywhere" };

const RequiredTable = ({ name, info }) => {
  if (!info.exists) return h(Alert, { type: "error", showIcon: true, message: `Collection "${name}" not found` });
  if (!info.required.length) {
    return h("div", { style: { fontSize: 12.5 } }, `${info.fields.length} fields: `, info.fields.map((f) => `${f.name}${f.column !== f.name ? ` (col ${f.column})` : ""}:${f.type}`).join(", "));
  }
  return h("table", { style: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" } },
    h("tbody", null,
      info.required.map((r) => h("tr", { key: r.required },
        h("td", { style: { ...cell, width: "38%" } }, r.required),
        h("td", { style: { ...cell, width: 90 } }, h(Tag, { color: r.status === "ok" ? "green" : r.status === "missing" ? "red" : "orange" }, r.status)),
        h("td", { style: cell }, r.field ? `${r.field}${r.column !== r.field ? ` → column ${r.column}` : ""} · ${r.type}` : "—"),
      )),
    ),
  );
};

const Diagnose = () => {
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    runDiagnostics().then(setReport).catch((e) => setError(e?.message || String(e)));
  }, []);

  if (error) return h(Alert, { type: "error", showIcon: true, message: error });
  if (!report) return h("div", { style: { padding: 24, textAlign: "center" } }, h(Spin, null), h("div", { style: { marginTop: 8, fontSize: 13 } }, "Checking schema and data…"));

  const json = JSON.stringify(compactReport(report));
  const onCopy = async () => ((await copyText(json)) ? message.success(`Report copied (${json.length.toLocaleString()} characters)`) : message.error("Copy failed — select the JSON below"));

  return h("div", { style: { display: "flex", flexDirection: "column", gap: 12, maxWidth: "100%" } },
    h("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 } },
      h("strong", { style: { fontSize: 15 } }, "Money flow schema check"),
      h(Tag, { color: report.missing.length ? "red" : "green" }, `${report.missing.length} missing`),
      report.errors.length ? h(Tag, { color: "orange" }, `${report.errors.length} errors`) : null,
      h("span", { style: { flexGrow: 1 } }),
      h(Button, { type: "primary", onClick: onCopy }, "Copy report"),
    ),
    report.missing.length ? h(Alert, { type: "warning", showIcon: true, message: "Missing", description: report.missing.join(", ") }) : null,
    report.errors.length ? h(Alert, { type: "error", showIcon: true, message: "Errors", description: report.errors.join(" | ") }) : null,
    h(Alert, {
      type: "info",
      showIcon: true,
      message: `Rate collection: ${report.rateCollection || "none found"}`,
      description: `Row keys: ${(report.exchangeRateKeys || []).join(", ") || "—"} · currencies: ${(report.currencies || []).map((c) => `${c.code}(${c.decimalPlaces ?? "?"}${c.isBaseCurrency ? ", base" : ""})`).join(", ")}`,
    }),
    h("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
      Object.entries(report.lineConvention).map(([t, v]) => h("div", { key: t, style: { fontSize: 13 } },
        h("strong", null, t), `: ${v.foreignLines} foreign lines of ${v.scannedLatest} latest — `,
        Object.entries(v.verdicts).map(([k, n]) => h(Tag, { key: k, color: k === "native" ? "orange" : k.startsWith("VND") ? "blue" : "red" }, `${k}: ${n}`)),
      )),
    ),
    h(Collapse, {
      items: Object.entries(report.collections).map(([name, info]) => ({
        key: name,
        label: `${name}${info.tableName ? ` (table ${info.tableName})` : ""} — ${info.required.filter((r) => r.status === "missing").length} missing`,
        children: h(RequiredTable, { name, info }),
      })),
    }),
    h("details", null,
      h("summary", { style: { cursor: "pointer", fontSize: 13 } }, "Raw JSON"),
      h("pre", { style: { maxHeight: 360, overflow: "auto", fontSize: 11.5, background: "#fafafa", padding: 8, whiteSpace: "pre-wrap", wordBreak: "break-all" } }, json),
    ),
  );
};

ctx.render(h(Diagnose));
