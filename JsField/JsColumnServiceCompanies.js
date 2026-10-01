// JS Column for the Services table: shows the internal companies offering the
// row's service (services.companyServices → companyServices.internalCompanyId
// → internalCompany), instead of the bare companyServices ids.
//
// Data: uses ctx.record.companyServices when the table already appended them
// with internalCompanyId; otherwise every cell of the page shares one
// companyServices:list request (serviceId $in [...]). The internalCompany list
// is loaded once and cached for a minute across cells. Shared state lives on
// ctx.engine (one FlowEngine for the page): in a JS column `window` is the
// RunJS sandbox proxy, which rejects unknown keys and is not shared.
// ---- ui language (pure; tested by scripts/tests/i18n-blocks.test.js) ----
// Labels follow the language NocoBase's UI runs in (ctx.i18n.language: the
// user's appLang, else the system default; changing it reloads the page):
// Vietnamese for "vi-*", English otherwise. The English text is the key, so a
// label missing from VI shows in English; {name} placeholders are filled from
// vars. Stored data is not translated. Tool: scripts/i18n/ui-strings.js.
const pickLang = (locale) => (/^vi\b/i.test(String(locale || "").trim()) ? "vi" : "en");
const makeTr = (lang, dict) => (text, vars) => {
  const template = (lang === "vi" && dict[text]) || text;
  return vars
    ? template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
    : template;
};
const VI = {
  "Could not load companies": "Không tải được công ty",
  "No company": "Chưa có công ty",
};
// ---- end ui language ----
const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);

const { React } = ctx;
const { useState, useEffect } = React;
const { Spin, Tooltip } = ctx.antd;

const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ---- service companies (pure; tested by scripts/tests/js-column-service-companies.test.js) ----
// Ids are snowflake bigints: compare them as strings.
const idKey = (v) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "object") return idKey(v.id);
  const s = String(v).trim();
  return s || null;
};

// true when the row's companyServices are appended objects carrying the FK
const hasCompanyIds = (companyServices) =>
  (companyServices || []).every(
    (cs) => cs && typeof cs === "object" && ("internalCompanyId" in cs || "internalCompany" in cs),
  );

// distinct companies of a service, in companyServices order; unknown ones skipped
const serviceCompanies = (companyServices, companyById) => {
  const seen = new Set();
  const out = [];
  (companyServices || []).forEach((cs) => {
    const appended = cs?.internalCompany && typeof cs.internalCompany === "object" ? cs.internalCompany : null;
    const key = idKey(appended?.id) || idKey(cs?.internalCompanyId);
    if (!key || seen.has(key)) return;
    const company = appended || companyById[key];
    const label = company && (company.shortName || company.name || company.legalName);
    if (!label) return;
    seen.add(key);
    out.push({ key, label, fullName: company.name || label });
  });
  return out;
};
// ---- end service companies ----

const shared = ctx.engine || ctx.app || {};
const COMPANY_CACHE_KEY = "__lawInternalCompanyCache";
const COMPANY_CACHE_MS = 60 * 1000;
const loadCompanies = () => {
  const cache = shared[COMPANY_CACHE_KEY];
  if (cache && Date.now() - cache.at < COMPANY_CACHE_MS) return cache.promise;
  const promise = ctx.api
    .request({
      url: "internalCompany:list",
      params: { pageSize: 1000, fields: "id,name,shortName,legalName" },
    })
    .then((res) => {
      const byId = {};
      (res?.data?.data || []).forEach((c) => {
        byId[idKey(c.id)] = c;
      });
      return byId;
    })
    .catch((e) => {
      shared[COMPANY_CACHE_KEY] = null;
      throw e;
    });
  shared[COMPANY_CACHE_KEY] = { at: Date.now(), promise };
  return promise;
};

// Cells render one by one; collect their service ids for a moment and fetch
// all their companyServices in one request.
const BATCH_KEY = "__lawServiceCompaniesBatch";
const BATCH_WAIT_MS = 30;
const loadCompanyServices = (serviceId) =>
  new Promise((resolve, reject) => {
    const batch = shared[BATCH_KEY] || (shared[BATCH_KEY] = { pending: new Map(), timer: null });
    if (!batch.pending.has(serviceId)) batch.pending.set(serviceId, []);
    batch.pending.get(serviceId).push({ resolve, reject });
    if (batch.timer) return;
    batch.timer = setTimeout(async () => {
      const waiting = batch.pending;
      batch.pending = new Map();
      batch.timer = null;
      try {
        const res = await ctx.api.request({
          url: "companyServices:list",
          params: {
            pageSize: 1000,
            filter: JSON.stringify({ serviceId: { $in: [...waiting.keys()] } }),
            fields: "id,serviceId,internalCompanyId",
          },
        });
        const byService = {};
        (res?.data?.data || []).forEach((row) => {
          const key = idKey(row.serviceId);
          (byService[key] || (byService[key] = [])).push(row);
        });
        waiting.forEach((waiters, id) => waiters.forEach((w) => w.resolve(byService[id] || [])));
      } catch (e) {
        waiting.forEach((waiters) => waiters.forEach((w) => w.reject(e)));
      }
    }, BATCH_WAIT_MS);
  });

const tagStyle = {
  display: "inline-block",
  maxWidth: "100%",
  padding: "1px 8px",
  borderRadius: 4,
  border: "1px solid #91caff",
  background: "#e6f4ff",
  color: "#096dd9",
  fontSize: 12,
  lineHeight: "20px",
  fontFamily: FONT,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const mutedStyle = { color: "#bfbfbf", fontSize: 12, fontFamily: FONT };

function JsColumnServiceCompanies() {
  const record = ctx.record || {};
  const serviceId = idKey(record.id);
  const [state, setState] = useState({ loading: true, error: false, companies: [] });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!serviceId) {
        setState({ loading: false, error: false, companies: [] });
        return;
      }
      try {
        const rowServices = record.companyServices;
        const [companyById, companyServices] = await Promise.all([
          loadCompanies(),
          Array.isArray(rowServices) && hasCompanyIds(rowServices)
            ? rowServices
            : loadCompanyServices(serviceId),
        ]);
        if (!cancelled) {
          setState({ loading: false, error: false, companies: serviceCompanies(companyServices, companyById) });
        }
      } catch (e) {
        console.error("JsColumnServiceCompanies:", e);
        if (!cancelled) setState({ loading: false, error: true, companies: [] });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [serviceId, record.companyServices]);

  if (state.loading) return React.createElement(Spin, { size: "small" });
  if (state.error) {
    return React.createElement("span", { style: { ...mutedStyle, color: "#ff4d4f" } }, tr("Could not load companies"));
  }
  if (state.companies.length === 0) {
    return React.createElement("span", { style: mutedStyle }, tr("No company"));
  }
  return React.createElement(
    "div",
    { style: { display: "flex", flexWrap: "wrap", gap: 4, minWidth: 0 } },
    state.companies.map((c) =>
      React.createElement(
        Tooltip,
        { key: c.key, title: c.fullName !== c.label ? c.fullName : null },
        React.createElement("span", { style: tagStyle }, c.label),
      ),
    ),
  );
}

ctx.render(React.createElement(JsColumnServiceCompanies));
