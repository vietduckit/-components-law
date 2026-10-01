// ============================================================
// Service change log — read-only JS Block for a quotation, contract or case
// detail page. Lists every change to its services that
// pgsql/service_thread_sync.sql logged in serviceChangeLogs: edits made here,
// and edits made elsewhere that spread here through a service thread
// (docs/superpowers/specs/2026-09-29-service-thread-sync-design.md §7).
// ============================================================
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
  "Quotation": "Báo giá",
  "Contract": "Hợp đồng",
  "Case": "Hồ sơ",
  "Catalog service": "Dịch vụ danh mục",
  "Service name": "Tên dịch vụ",
  "Service type": "Loại dịch vụ",
  "Description": "Mô tả",
  "Unit price": "Đơn giá",
  "Quantity": "Số lượng",
  "VAT (%)": "VAT (%)",
  "Currency": "Tiền tệ",
  "Combo": "Combo",
  "Combo name": "Tên combo",
  "System": "Hệ thống",
  "Service removed": "Đã xóa dịch vụ",
  "Service added": "Đã thêm dịch vụ",
  "Could not load the change log.": "Không tải được lịch sử thay đổi.",
  "from {0}": "từ {0}",
  "from change #{0}": "từ thay đổi #{0}",
  "Time": "Thời gian",
  "By": "Người thực hiện",
  "Where": "Ở đâu",
  "Change": "Thay đổi",
  "Service change log": "Lịch sử thay đổi dịch vụ",
  "{0} changes": "{0} thay đổi",
  "Refresh": "Làm mới",
  "No changes yet": "Chưa có thay đổi nào",
};
// ---- end ui language ----
const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);

const { React } = ctx;
const { useState, useEffect, useMemo } = React;
const { Table, Tag, Typography, Spin, Empty, List, Card, Space, Button } = ctx.antd;
const { Text } = Typography;

// Set to "quotation" / "contract" / "case" to override the detection below.
const DOC_TYPE = null;

const record = ctx.record || {};
const detectDocType = () => {
  if (DOC_TYPE) return DOC_TYPE;
  if (record.contractCode !== undefined || record.contractType !== undefined) return "contract";
  if (record.caseCode !== undefined || record.projectName !== undefined) return "case";
  return "quotation";
};
const DOC = detectDocType();
const LINES = {
  quotation: { resource: "quotationServices", key: "quotationId" },
  contract: { resource: "contractServices", key: "contractId" },
  case: { resource: "projectServices", key: "projectId" },
};
const DOC_LABEL = { quotation: tr("Quotation"), contract: tr("Contract"), case: tr("Case") };
const FIELD_LABEL = {
  serviceId: tr("Catalog service"),
  serviceName: tr("Service name"),
  serviceType: tr("Service type"),
  description: tr("Description"),
  basePrice: tr("Unit price"),
  quantity: tr("Quantity"),
  vat: tr("VAT (%)"),
  currencyId: tr("Currency"),
  comboId: tr("Combo"),
  comboName: tr("Combo name"),
};
const ACTION_COLOR = { update: "blue", insert: "green", delete: "red" };

const formatTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toLocaleString("vi-VN") : String(value);
};
const userName = (row) =>
  row?.createdBy?.nickname || row?.createdBy?.username || (row?.createdById ? `#${row.createdById}` : tr("System"));
const whereText = (row) => `${DOC_LABEL[row.documentType] || row.documentType || "—"} #${row.documentId ?? "—"}`;
const changeText = (row) => {
  if (row.action === "delete") return tr("Service removed");
  if (row.action === "insert") return tr("Service added");
  return `${row.oldValue ?? "—"} → ${row.newValue ?? "—"}`;
};

// The RunJS sandbox blocks reading the window's size or media queries, so
// the width is polled off document.body.clientWidth (same as TaskManagement.js).
const MOBILE_BREAKPOINT = 640;
const useNarrow = () => {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const check = () => {
      try {
        const width = document.querySelector("body")?.clientWidth;
        if (typeof width === "number") setNarrow((prev) => (prev === width <= MOBILE_BREAKPOINT ? prev : width <= MOBILE_BREAKPOINT));
      } catch {
        // the sandbox may block it in some contexts: keep the last value
      }
    };
    check();
    const id = setInterval(check, 400);
    return () => clearInterval(id);
  }, []);
  return narrow;
};

const ServiceChangeLog = () => {
  const narrow = useNarrow();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!record.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const lines = LINES[DOC];
      const lineRes = await ctx.api.request({
        url: `${lines.resource}:list`,
        params: { filter: JSON.stringify({ [lines.key]: { $eq: record.id } }), fields: ["id", "serviceThreadId"], pageSize: 500 },
      });
      const threads = Array.from(
        new Set((lineRes?.data?.data || []).map((l) => l.serviceThreadId).filter((t) => t !== null && t !== undefined)),
      );
      const or = [{ documentType: { $eq: DOC }, documentId: { $eq: record.id } }];
      if (threads.length) or.push({ serviceThreadId: { $in: threads } });
      const res = await ctx.api.request({
        url: "serviceChangeLogs:list",
        params: { filter: JSON.stringify({ $or: or }), sort: ["-createdAt", "-id"], appends: ["createdBy"], pageSize: 200 },
      });
      setRows(res?.data?.data || []);
    } catch (e) {
      setError(e?.response?.data?.errors?.[0]?.message || e?.message || tr("Could not load the change log."));
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const originText = (row) => {
    if (!row.originLogId) return null;
    const origin = byId.get(row.originLogId);
    return origin ? tr("from {0}", { 0: whereText(origin) }) : tr("from change #{0}", { 0: row.originLogId });
  };

  const columns = [
    { title: tr("Time"), dataIndex: "createdAt", width: 160, render: (v) => formatTime(v) },
    { title: tr("By"), key: "by", width: 140, render: (_, r) => userName(r) },
    {
      title: tr("Where"),
      key: "where",
      width: 170,
      render: (_, r) =>
        React.createElement(Space, { size: 4, wrap: true },
          React.createElement(Text, null, whereText(r)),
          originText(r) && React.createElement(Tag, { color: "purple" }, originText(r)),
        ),
    },
    {
      title: tr("Change"),
      key: "change",
      render: (_, r) =>
        React.createElement(Space, { size: 6, wrap: true },
          React.createElement(Tag, { color: ACTION_COLOR[r.action] || "default" }, r.action || "—"),
          r.fieldName && React.createElement(Text, { strong: true }, FIELD_LABEL[r.fieldName] || r.fieldName),
          React.createElement(Text, { style: { wordBreak: "break-word" } }, changeText(r)),
        ),
    },
  ];

  const header = React.createElement(Space, { size: 8, wrap: true },
    React.createElement(Text, { strong: true }, tr("Service change log")),
    React.createElement(Text, { type: "secondary" }, tr("{0} changes", { 0: rows.length })),
  );
  const extra = React.createElement(Button, { size: "small", onClick: load, loading }, tr("Refresh"));

  let body;
  if (loading) {
    body = React.createElement("div", { style: { textAlign: "center", padding: 24 } }, React.createElement(Spin, null));
  } else if (error) {
    body = React.createElement(Text, { type: "danger" }, error);
  } else if (!rows.length) {
    body = React.createElement(Empty, { description: tr("No changes yet") });
  } else if (narrow) {
    body = React.createElement(List, {
      dataSource: rows,
      rowKey: "id",
      renderItem: (r) =>
        React.createElement(List.Item, { key: r.id, style: { padding: "8px 0" } },
          React.createElement("div", { style: { width: "100%", minWidth: 0 } },
            React.createElement(Space, { size: 6, wrap: true },
              React.createElement(Tag, { color: ACTION_COLOR[r.action] || "default" }, r.action || "—"),
              r.fieldName && React.createElement(Text, { strong: true }, FIELD_LABEL[r.fieldName] || r.fieldName),
            ),
            React.createElement("div", { style: { wordBreak: "break-word", margin: "4px 0" } }, changeText(r)),
            React.createElement(Text, { type: "secondary", style: { fontSize: 12 } },
              `${formatTime(r.createdAt)} · ${userName(r)} · ${whereText(r)}${originText(r) ? ` · ${originText(r)}` : ""}`),
          ),
        ),
    });
  } else {
    body = React.createElement(Table, {
      dataSource: rows,
      columns,
      rowKey: "id",
      size: "small",
      pagination: { pageSize: 20, hideOnSinglePage: true },
      scroll: { x: "max-content" },
    });
  }

  return React.createElement(Card, { size: "small", title: header, extra, style: { width: "100%" } }, body);
};

ctx.render(React.createElement(ServiceChangeLog, null));
