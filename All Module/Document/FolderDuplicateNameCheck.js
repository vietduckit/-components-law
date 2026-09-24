// ============================================================
// Folder Duplicate-Name Check (read-only, phục vụ truy vấn)
//
// Quét TOÀN BỘ folder trong hệ thống, tìm các folder TRÙNG TÊN trong
// CÙNG 1 thư mục cha (sibling trùng tên) — không so trùng tên xuyên suốt
// toàn hệ thống, vì các tên template cố định (Legal Study, Obsolete,
// Legal docs...) vốn dĩ lặp lại ở MỌI case một cách hợp lệ (xem
// SYSTEM_LOCKED_RENAME_TEMPLATE_NAMES trong CaseDocument.js/Library.js) —
// so trùng kiểu đó sẽ ra hàng nghìn "trùng" giả, vô nghĩa để tra cứu.
//
// Với mỗi nhóm trùng, liệt kê luôn document nằm trực tiếp bên trong từng
// folder trùng đó, để tiện đối chiếu/truy vấn xem folder nào đang chứa
// dữ liệu thật trước khi quyết định xử lý gì tiếp theo.
//
// Chỉ đọc — không ghi gì cả.
// ============================================================

const { React } = ctx;
const { useState } = React;
const { Table, Tag, Typography, Spin, Alert, Space, Button, Collapse, Input } = ctx.antd;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const extractId = (val) =>
  typeof val === "object" && val !== null ? val.id : val;
const getFolderParentId = (folder) => extractId(folder?.parentId);
const normalizeName = (name) => String(name || "").trim().toLowerCase();

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

const getDocLabel = (doc) =>
  doc?.title || doc?.name || doc?.templateName || `Document #${extractId(doc?.id)}`;

// Dựng breadcrumb từ folder lên tới gốc, để biết folder trùng đang nằm ở
// đâu trong cây (vd "Customers / Nguyễn Văn A / C012024 - ... / Obsolete").
const buildFolderPath = (folder, folderById) => {
  const parts = [];
  let current = folder;
  const visited = new Set();
  while (current) {
    parts.unshift(current.name || `Folder #${extractId(current.id)}`);
    const pid = getFolderParentId(current);
    if (!pid || pid === "root" || visited.has(String(pid))) break;
    visited.add(String(pid));
    current = folderById.get(String(pid));
  }
  return parts.join(" / ");
};

const runCheck = async () => {
  const [folders, documents] = await Promise.all([
    fetchAllList("folders:list", {
      filter: JSON.stringify({ isDeleted: { $ne: true } }),
    }),
    fetchAllList("documents:list", {
      filter: JSON.stringify({ isDeleted: { $ne: true } }),
    }),
  ]);

  const folderById = new Map();
  folders.forEach((f) => folderById.set(String(extractId(f.id)), f));

  const documentsByFolder = new Map();
  documents.forEach((d) => {
    const fid = String(extractId(d.folderId));
    if (!fid || fid === "undefined" || fid === "null") return;
    if (!documentsByFolder.has(fid)) documentsByFolder.set(fid, []);
    documentsByFolder.get(fid).push(d);
  });

  // Nhóm theo (parentId, tên chuẩn hoá) — chỉ folder cùng cha mới tính là
  // trùng thật, tránh nhiễu bởi các tên template lặp lại hợp lệ ở mọi case.
  const groups = new Map();
  folders.forEach((f) => {
    const name = normalizeName(f.name);
    if (!name) return;
    const parentKey = getFolderParentId(f) || "root";
    const groupKey = `${parentKey}::${name}`;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(f);
  });

  const duplicateGroups = [];
  groups.forEach((list) => {
    if (list.length < 2) return;
    const parentId = getFolderParentId(list[0]);
    const parentFolder = parentId ? folderById.get(String(parentId)) : null;
    const candidates = list
      .map((f) => {
        const fid = String(extractId(f.id));
        const docs = documentsByFolder.get(fid) || [];
        return {
          id: extractId(f.id),
          name: f.name,
          type: f.type,
          moduleScope: f.moduleScope,
          createdAt: f.createdAt,
          documents: docs,
          documentCount: docs.length,
        };
      })
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    duplicateGroups.push({
      name: list[0].name,
      parentPath: parentFolder
        ? buildFolderPath(parentFolder, folderById)
        : "(folder gốc — không có cha)",
      candidates,
    });
  });

  duplicateGroups.sort(
    (a, b) =>
      b.candidates.reduce((s, c) => s + c.documentCount, 0) -
      a.candidates.reduce((s, c) => s + c.documentCount, 0),
  );

  return { duplicateGroups, totalFolders: folders.length, totalDocuments: documents.length };
};

const renderDocList = (record) => {
  if (!record.documents.length) {
    return React.createElement(Text, { type: "secondary" }, "Không có document trực tiếp trong folder này.");
  }
  return React.createElement(Table, {
    size: "small",
    pagination: false,
    dataSource: record.documents,
    rowKey: (d) => String(extractId(d.id)),
    columns: [
      { title: "Document ID", key: "id", width: 140, render: (_, d) => extractId(d.id) },
      { title: "Tên", key: "name", render: (_, d) => getDocLabel(d) },
      { title: "Tạo lúc", dataIndex: "createdAt", width: 180 },
    ],
  });
};

const FolderDuplicateNameCheckBlock = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await runCheck();
      setResult(r);
      console.log("[FolderDuplicateNameCheck] duplicateGroups:", r.duplicateGroups);
      r.duplicateGroups.forEach((g) => {
        const flat = [];
        g.candidates.forEach((c) => {
          if (c.documents.length === 0) {
            flat.push({ folderId: c.id, folderCreatedAt: c.createdAt, documentId: "", documentName: "(rỗng)" });
          }
          c.documents.forEach((d) => {
            flat.push({
              folderId: c.id,
              folderCreatedAt: c.createdAt,
              documentId: extractId(d.id),
              documentName: getDocLabel(d),
            });
          });
        });
        console.log(`[FolderDuplicateNameCheck] "${g.parentPath} / ${g.name}":`);
        console.table(flat);
      });
    } catch (e) {
      console.error("[FolderDuplicateNameCheck] failed:", e);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const filteredGroups =
    result?.duplicateGroups.filter((g) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        g.name.toLowerCase().includes(q) || g.parentPath.toLowerCase().includes(q)
      );
    }) || [];

  const candidateColumns = [
    { title: "Folder ID", dataIndex: "id", key: "id", width: 140 },
    { title: "Tên folder", dataIndex: "name", key: "name", width: 220 },
    { title: "Tạo lúc", dataIndex: "createdAt", key: "createdAt", width: 180 },
    { title: "Số document trực tiếp", dataIndex: "documentCount", key: "documentCount", width: 160 },
    { title: "type", dataIndex: "type", key: "type", width: 100 },
    { title: "moduleScope", dataIndex: "moduleScope", key: "moduleScope", width: 140 },
  ];

  return React.createElement(
    "div",
    { style: { padding: 16 } },
    React.createElement(
      Space,
      { style: { marginBottom: 12 }, align: "center", wrap: true },
      React.createElement(Title, { level: 4, style: { margin: 0 } }, "Check: Folder trùng tên (cùng thư mục cha) + document bên trong"),
      React.createElement(Button, { onClick: load, loading }, "Quét lại"),
      React.createElement(Input, {
        placeholder: "Lọc theo tên folder hoặc đường dẫn cha...",
        value: search,
        onChange: (e) => setSearch(e.target.value),
        style: { width: 320 },
        allowClear: true,
      }),
    ),
    error && React.createElement(Alert, { type: "error", message: error, style: { marginBottom: 12 } }),
    loading && !result
      ? React.createElement(Spin, {})
      : result &&
          React.createElement(
            React.Fragment,
            null,
            React.createElement(
              Text,
              { type: "secondary" },
              `Tổng ${result.totalFolders} folder, ${result.totalDocuments} document. ${result.duplicateGroups.length} nhóm folder trùng tên (cùng thư mục cha)${search.trim() ? ` — đang lọc còn ${filteredGroups.length}` : ""}. Chi tiết đầy đủ đã in ra console.table theo từng nhóm.`,
            ),
            filteredGroups.length === 0
              ? React.createElement(Alert, {
                  type: "success",
                  style: { marginTop: 12 },
                  message: result.duplicateGroups.length === 0
                    ? "Không phát hiện folder trùng tên trong cùng thư mục cha."
                    : "Không có nhóm nào khớp bộ lọc.",
                })
              : React.createElement(
                  Collapse,
                  { style: { marginTop: 12 } },
                  filteredGroups.map((g, idx) =>
                    React.createElement(
                      Panel,
                      {
                        header: `${g.parentPath} / "${g.name}" — ${g.candidates.length} bản trùng, ${g.candidates.reduce((s, c) => s + c.documentCount, 0)} document`,
                        key: `${g.parentPath}::${g.name}::${idx}`,
                      },
                      React.createElement(Table, {
                        rowKey: "id",
                        dataSource: g.candidates,
                        columns: candidateColumns,
                        pagination: false,
                        size: "small",
                        expandable: {
                          defaultExpandAllRows: true,
                          expandedRowRender: renderDocList,
                        },
                      }),
                    ),
                  ),
                ),
          ),
  );
};

ctx.render(React.createElement(FolderDuplicateNameCheckBlock, null));
