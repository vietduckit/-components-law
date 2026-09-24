// ============================================================
// ONE-TIME DIAGNOSTIC JS BLOCK — NOT a reusable field/action block.
//
// Follow-up to the Apply Combo feature (CaseCreateForm.js / ContractCreateForm.js /
// QuotationCreateForm.js applyCombo, and the newer CaseServices.js /
// ContractServices.js / QuotationServices.js Apply Combo modals).
//
// User reports the DB has a combo whose price is meant to be tracked in
// USD, but every place that reads it shows VND instead. getRecordCurrencyId()
// (shared across all 6 files) looks for combo.currencyId / combo.currency /
// combo.currencies / combo.defaultCurrencyId / combo.defaultCurrency — but
// per the ORIGINAL approved design spec (docs/superpowers/specs/
// 2026-08-24-service-combo-design.md), the serviceCombos collection was
// configured with NO currency field at all. If one was added later via the
// Nocobase admin UI, its actual field name is unknown to the code.
//
// This script fetches raw serviceCombos rows (no `fields` restriction, so
// every scalar column comes back) and prints every key on each record whose
// name contains "curr" (case-insensitive), plus packageSubTotal so you can
// match the record to the specific USD combo you're looking at, plus the
// FULL raw JSON of the first row so nothing is hidden by this script's own
// guesses about field names.
//
// Read-only — makes no writes. Safe to run repeatedly.
// ============================================================
const { React, antd } = ctx;
const { useState, useEffect } = React;
const { Typography, Spin, Alert, Table, Tag } = antd;
const { Text, Title, Paragraph } = Typography;

function DiagnoseServiceComboCurrency() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [combos, setCombos] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [currenciesError, setCurrenciesError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await ctx.api.request({
          url: "serviceCombos:list",
          params: { pageSize: 50, page: 1 },
        });
        setCombos(res?.data?.data || []);
      } catch (e) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
      // Cross-reference: does combo.currencyId actually point at a real
      // row in the currencies collection, or is it an unrelated number
      // (e.g. the field was configured as its own ID generator instead of
      // a real belongsTo relation to currencies)?
      try {
        const curRes = await ctx.api.request({
          url: "currencies:list",
          params: { pageSize: 100, page: 1 },
        });
        setCurrencies(curRes?.data?.data || []);
      } catch (e) {
        setCurrenciesError(e?.message || String(e));
      }
    })();
  }, []);

  if (loading) return React.createElement(Spin, { tip: "Loading serviceCombos..." });
  if (error) return React.createElement(Alert, { type: "error", message: "Fetch failed", description: error });
  if (!combos.length) return React.createElement(Alert, { type: "warning", message: "No serviceCombos records found." });

  const currencyLikeKeys = Array.from(
    new Set(
      combos.flatMap((c) => Object.keys(c).filter((k) => /curr/i.test(k)))
    )
  );

  const columns = [
    { title: "id", dataIndex: "id", width: 70 },
    { title: "comboName", dataIndex: "comboName", width: 220 },
    { title: "packageSubTotal", dataIndex: "packageSubTotal", width: 140 },
    ...currencyLikeKeys.map((k) => ({
      title: k,
      dataIndex: k,
      render: (v) => (typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "")),
    })),
    {
      title: "currencyId matches a currencies row?",
      dataIndex: "_matchesCurrency",
      width: 260,
      render: (v) => React.createElement(Tag, { color: v === "YES" ? "green" : "red" }, v),
    },
  ];

  const currencyIds = new Set(currencies.map((c) => String(c.id)));
  const comboRows = combos.map((c) => ({
    ...c,
    key: c.id,
    _matchesCurrency: currencyIds.has(String(c.currencyId)) ? "YES" : "NO — no matching currencies row",
  }));

  return React.createElement("div", { style: { padding: 16 } },
    React.createElement(Title, { level: 4 }, "currencies collection (for cross-reference)"),
    currenciesError
      ? React.createElement(Alert, { type: "error", message: "Fetch failed", description: currenciesError, style: { marginBottom: 16 } })
      : React.createElement(Table, {
        dataSource: currencies.map((c) => ({ ...c, key: c.id })),
        columns: [
          { title: "id", dataIndex: "id", width: 220 },
          { title: "code", dataIndex: "code" },
          { title: "currencyCode", dataIndex: "currencyCode" },
          { title: "name", dataIndex: "name" },
          { title: "isBaseCurrency", dataIndex: "isBaseCurrency" },
        ],
        pagination: false,
        size: "small",
        scroll: { x: "max-content" },
        style: { marginBottom: 24 },
      }),
    React.createElement(Title, { level: 4 }, "serviceCombos — currency-like fields"),
    currencyLikeKeys.length === 0
      ? React.createElement(Alert, {
        type: "warning",
        message: "No field name containing \"curr\" found on any serviceCombos record.",
        description: "This means the currency isn't tracked as a field on serviceCombos itself under any name matching /curr/i — check the full raw JSON below for the actual field, or it may live on a different collection entirely.",
        style: { marginBottom: 16 },
      })
      : React.createElement(Paragraph, null, `Found ${currencyLikeKeys.length} candidate field(s): `, currencyLikeKeys.map((k) => React.createElement(Tag, { key: k, color: "blue" }, k))),
    React.createElement(Table, {
      dataSource: comboRows,
      columns,
      pagination: false,
      size: "small",
      scroll: { x: "max-content" },
      style: { marginBottom: 24 },
    }),
    React.createElement(Title, { level: 4 }, "Full raw JSON — first record"),
    React.createElement("pre", {
      style: { background: "#f5f5f5", padding: 12, borderRadius: 6, overflow: "auto", maxHeight: 400 },
    }, JSON.stringify(combos[0], null, 2))
  );
}

ctx.render(React.createElement(DiagnoseServiceComboCurrency));
