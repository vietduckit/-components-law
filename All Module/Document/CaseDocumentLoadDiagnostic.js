// ============================================================
// Case Document loadData Diagnostic (read-only)
//
// Đo riêng từng bước trong loadData của CaseDocument.js bằng đúng query
// thật (cùng filter/append), để biết chính xác bước nào còn chậm sau khi
// đã progressive-load fetchFoldersForInternalTemplates — thay vì đoán.
// Không ghi dữ liệu gì cả.
// ============================================================

const { React } = ctx;
const { useState } = React;
const { Table, Tag, Typography, Space, Button } = ctx.antd;
const { Title, Text, Paragraph } = Typography;

const extractId = (val) =>
  typeof val === "object" && val !== null ? val.id : val;

const fetchAllList = async (url, params = {}) => {
  let all = [];
  let page = 1;
  const pageSize = 200;
  while (true) {
    const res = await ctx.api.request({ url, params: { ...params, page, pageSize } });
    const data = res?.data?.data || [];
    all = all.concat(data);
    const meta = res?.data?.meta || {};
    if (!meta.count || all.length >= meta.count || data.length < pageSize) break;
    page++;
  }
  return all;
};

// Same $or-with-null scope filter as CaseDocument.js's DASHBOARD_CONFIG.
// moduleScopes ("case_document") + legal_reference/legal_study — mirrors
// the real query without needing that file's full config object.
const CASE_DOC_MODULE_SCOPES = ["case_document", "legal_reference", "legal_study"];

const getFoldersScopeFilter = () =>
  JSON.stringify({
    $or: [
      { moduleScope: { $in: CASE_DOC_MODULE_SCOPES } },
      { moduleScope: null },
    ],
  });

const getCaseIdFromCtx = () => {
  const record =
    ctx?.record || ctx?.popup?.record || ctx?.data?.record || ctx?.form?.values || null;
  return (
    extractId(record?.caseId) ||
    extractId(record?.id) ||
    extractId(ctx?.recordId) ||
    extractId(ctx?.filterByTk) ||
    null
  );
};

const measurePagedFetch = async (url, params) => {
  const t0 = Date.now();
  const pageTimes = [];
  let firstPageMs = null;
  let all = [];
  let page = 1;
  const pageSize = 200;
  while (true) {
    const pt0 = Date.now();
    const res = await ctx.api.request({ url, params: { ...params, page, pageSize } });
    const pt1 = Date.now();
    pageTimes.push({ page, ms: pt1 - pt0 });
    if (page === 1) firstPageMs = pt1 - t0;
    const data = res?.data?.data || [];
    all = all.concat(data);
    const meta = res?.data?.meta || {};
    if (!meta.count || all.length >= meta.count || data.length < pageSize) break;
    page++;
  }
  const t1 = Date.now();
  return { totalMs: t1 - t0, firstPageMs, totalRows: all.length, pageTimes };
};

const runDiagnostic = async () => {
  const steps = [];

  // 1. auth:check
  let t0 = Date.now();
  await ctx.api.request({ url: "auth:check" }).catch(() => null);
  steps.push({ step: "auth:check", ms: Date.now() - t0, rows: null });

  // 2. lawyers:list (primary lookup — same params shape as loadData)
  t0 = Date.now();
  const lwRes = await ctx.api
    .request({ url: "lawyers:list", params: { pageSize: 1, filter: JSON.stringify({ $or: [{ userId: { $eq: 1 } }] }) } })
    .catch(() => null);
  steps.push({ step: "lawyers:list (primary lookup)", ms: Date.now() - t0, rows: null });

  // 3. folders:list — the fetchFoldersForInternalTemplates query (unscoped
  // $or, 4 relation appends) — the one already made progressive.
  const foldersResult = await measurePagedFetch("folders:list", {
    sort: ["createdAt"],
    filter: getFoldersScopeFilter(),
    appends: ["createdBy", "updatedBy", "folderManager", "folderManagers", "folderMember", "folderMembers"],
  });
  steps.push({
    step: "folders:list (fetchFoldersForInternalTemplates)",
    ms: foldersResult.totalMs,
    firstPageMs: foldersResult.firstPageMs,
    rows: foldersResult.totalRows,
    pages: foldersResult.pageTimes.length,
  });

  // 4. documents:list — fetchDocumentsForInternalTemplates
  const docsResult = await measurePagedFetch("documents:list", {
    sort: ["fileIndex", "-createdAt"],
    filter: getFoldersScopeFilter(),
    appends: ["fileAttachment", "createdBy", "updatedBy", "cases"],
  });
  steps.push({
    step: "documents:list (fetchDocumentsForInternalTemplates)",
    ms: docsResult.totalMs,
    firstPageMs: docsResult.firstPageMs,
    rows: docsResult.totalRows,
    pages: docsResult.pageTimes.length,
  });

  // 5. projects:list
  t0 = Date.now();
  const projRows = await fetchAllList("projects:list", {
    fields: ["id", "caseCode", "projectName", "description", "customerId", "managerId", "projectManagerId"],
    appends: ["manager", "assignees"],
    sort: ["-createdAt"],
  }).catch(() => []);
  steps.push({ step: "projects:list", ms: Date.now() - t0, rows: projRows.length });

  // 6. Stage-2 relation rows for the CURRENT case — same nested-resource
  // URL shape as fetchLinkedRelationRows (projects/{caseId}/{relation}:list,
  // falling back to cases/{caseId}/{relation}:list), not a flat filtered
  // list — using the wrong shape here would just 404/return empty and
  // report a misleadingly "fast" 0ms.
  const caseId = getCaseIdFromCtx();
  if (caseId) {
    const fetchLinkedRows = async (relationName, extraAppends = []) => {
      const candidates = [
        `projects/${encodeURIComponent(caseId)}/${relationName}:list`,
        `cases/${encodeURIComponent(caseId)}/${relationName}:list`,
      ];
      for (const url of candidates) {
        try {
          return await fetchAllList(url, { appends: ["createdBy", ...extraAppends] });
        } catch (e) {
          // try next candidate
        }
      }
      return [];
    };
    for (const [label, relationName, extraAppends] of [
      ["legalReference (case-scoped)", "legalReference", []],
      ["caseReferences (case-scoped)", "caseReferences", []],
      ["legalStudy (case-scoped)", "legalStudy", ["manager", "members"]],
      ["legalStudyFolderLinks (case-scoped)", "legalStudyFolderLinks", ["folders", "documents"]],
    ]) {
      t0 = Date.now();
      const rows = await fetchLinkedRows(relationName, extraAppends);
      steps.push({ step: label, ms: Date.now() - t0, rows: rows.length });
    }
  } else {
    steps.push({ step: "Stage-2 case-relation rows", ms: null, rows: "N/A — không xác định được caseId từ ctx (bỏ qua)" });
  }

  // 7. legalMembers:list (fetchAllLegalMemberRows-equivalent)
  t0 = Date.now();
  const legalMemberRows = await ctx.api
    .request({ url: "legalMembers:list", params: { pageSize: 1000, appends: ["member"] } })
    .then((r) => r?.data?.data || [])
    .catch(() => []);
  steps.push({ step: "legalMembers:list", ms: Date.now() - t0, rows: legalMemberRows.length });

  return steps;
};

const CaseDocumentLoadDiagnosticBlock = () => {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState(null);

  const handleRun = async () => {
    setRunning(true);
    setSteps(null);
    try {
      const result = await runDiagnostic();
      setSteps(result);
      console.log("[CaseDocumentLoadDiagnostic] steps:", result);
    } catch (e) {
      console.error("[CaseDocumentLoadDiagnostic] failed:", e);
    } finally {
      setRunning(false);
    }
  };

  const totalMs = steps ? steps.reduce((sum, s) => sum + (s.ms || 0), 0) : null;

  return React.createElement(
    "div",
    { style: { padding: 16 } },
    React.createElement(Title, { level: 4, style: { marginTop: 0 } }, "Diagnostic: từng bước trong loadData (CaseDocument.js)"),
    React.createElement(Paragraph, { type: "secondary" },
      "Đo tách riêng từng query thật (auth, lawyers, folders progressive, documents, projects, quan hệ theo case, legalMembers) để biết bước nào đang chậm.",
    ),
    React.createElement(Button, { type: "primary", loading: running, onClick: handleRun }, "Chạy đo"),
    totalMs !== null &&
      React.createElement(Paragraph, { style: { marginTop: 12 } },
        `Tổng cộng (chạy tuần tự, không song song như loadData thật): `,
        React.createElement(Tag, { color: totalMs > 3000 ? "red" : totalMs > 1000 ? "orange" : "green" }, `${totalMs} ms`),
      ),
    steps &&
      React.createElement(Table, {
        style: { marginTop: 12 },
        size: "small",
        pagination: false,
        dataSource: steps,
        rowKey: "step",
        columns: [
          { title: "Bước", dataIndex: "step" },
          {
            title: "Thời gian (ms)",
            dataIndex: "ms",
            render: (ms) =>
              ms === null
                ? "—"
                : React.createElement(Tag, { color: ms > 2000 ? "red" : ms > 800 ? "orange" : "green" }, `${ms} ms`),
          },
          { title: "Trang 1 (ms)", dataIndex: "firstPageMs", render: (v) => (v == null ? "—" : `${v} ms`) },
          { title: "Số dòng", dataIndex: "rows" },
          { title: "Số trang", dataIndex: "pages", render: (v) => v ?? "—" },
        ],
      }),
  );
};

ctx.render(React.createElement(CaseDocumentLoadDiagnosticBlock, null));
