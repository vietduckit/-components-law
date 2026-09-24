// ============================================================
// Document Title Version Fix — đổi tên document trùng tiêu đề
// trong cùng 1 folder theo đúng format "(1)", "(2)", ... (check + fix)
//
// Dùng ĐÚNG NGUYÊN VĂN thuật toán getUniqueFileName đã có sẵn trong
// Library.js/TaskDetailView.js (2026-09-18: xác nhận cả 2 file đó đã dùng
// thuật toán này cho việc upload file mới — thống nhất 1 format duy nhất
// trên toàn hệ thống thay vì bịa format riêng "-v1/-v2"). Bản document
// TẠO SỚM NHẤT trong nhóm trùng giữ nguyên tên gốc, không đổi — chỉ các
// bản tạo SAU mới bị gắn "(1)", "(2)"... — đúng cách getUniqueFileName xử
// lý khi có file mới trùng tên file cũ lúc upload.
//
// Chỉ đổi field `title` — KHÔNG đụng tới previousVersionId/rootDocumentId/
// versionNumber (3 field version có sẵn trong schema nhưng chưa nơi nào
// trong toàn bộ All Module đọc/ghi — kiểm tra 2026-09-18, 0/68 document
// đang dùng).
//
// "Trùng" = cùng folderId + cùng tiêu đề hiển thị (so chính xác, case-
// insensitive — đúng cách getUniqueFileName so sánh). Không so trùng
// xuyên suốt toàn hệ thống — 2 document tên giống nhau ở 2 folder khác
// nhau là chuyện bình thường (vd cùng dùng tên mẫu "Hợp đồng").
//
// Chỉ đọc khi mở block — phải bấm "Áp dụng" mới thực sự ghi dữ liệu.
// ============================================================

const { React } = ctx;
const { useState } = React;
const { Table, Tag, Typography, Spin, Alert, Space, Button, Modal, message } = ctx.antd;
const { Title, Text, Paragraph } = Typography;

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

// Cùng logic hiển thị tên document với các file khác trong repo này
// (getDocTitle trong Library.js/CaseDocument.js) — dùng để XÁC ĐỊNH trùng
// và làm "tên gốc" trước khi thêm hậu tố version, kể cả khi field `title`
// đang trống và document chỉ hiện tên nhờ fallback sang tên file đính kèm.
const getAttachment = (doc) =>
  Array.isArray(doc?.fileAttachment) ? doc.fileAttachment[0] : doc?.fileAttachment;
const getDocDisplayTitle = (doc) =>
  doc?.title ||
  doc?.name ||
  doc?.templateName ||
  getAttachment(doc)?.title ||
  getAttachment(doc)?.filename ||
  `Document #${extractId(doc?.id)}`;

// Sao chép nguyên văn từ Library.js — cùng 1 thuật toán, cùng 1 kết quả,
// cho mọi nơi trong hệ thống xử lý tên trùng. KHÔNG viết lại/diễn giải
// khác đi để tránh 2 nơi tính ra 2 kết quả khác nhau cho cùng 1 input.
const getUniqueFileName = (fileName, existingNames) => {
  const raw = String(fileName || "").trim();
  if (!raw) return raw;
  const taken = new Set(
    Array.from(existingNames || [], (n) => String(n || "").trim().toLowerCase()),
  );
  if (!taken.has(raw.toLowerCase())) return raw;
  const dotIndex = raw.lastIndexOf(".");
  const base = dotIndex > 0 ? raw.slice(0, dotIndex) : raw;
  const ext = dotIndex > 0 ? raw.slice(dotIndex) : "";
  let counter = 1;
  let candidate = `${base} (${counter})${ext}`;
  while (taken.has(candidate.toLowerCase())) {
    counter += 1;
    candidate = `${base} (${counter})${ext}`;
  }
  return candidate;
};

const buildFolderPath = (folderId, folderById) => {
  const parts = [];
  let current = folderId ? folderById.get(String(folderId)) : null;
  const visited = new Set();
  while (current) {
    parts.unshift(current.name || `Folder #${extractId(current.id)}`);
    const pid = getFolderParentId(current);
    if (!pid || pid === "root" || visited.has(String(pid))) break;
    visited.add(String(pid));
    current = folderById.get(String(pid));
  }
  return parts.join(" / ") || "(không có folder cha)";
};

const loadState = async () => {
  const [documents, folders] = await Promise.all([
    fetchAllList("documents:list", {
      filter: JSON.stringify({ isDeleted: { $ne: true } }),
      appends: ["fileAttachment"],
    }),
    fetchAllList("folders:list", {
      filter: JSON.stringify({ isDeleted: { $ne: true } }),
    }),
  ]);
  const folderById = new Map();
  folders.forEach((f) => folderById.set(String(extractId(f.id)), f));
  return { documents, folderById };
};

// Từ state gốc, build danh sách nhóm trùng + action đổi title cho từng
// document trong nhóm. Document tạo SỚM NHẤT giữ nguyên tên — chỉ các bản
// tạo SAU mới bị gắn "(1)", "(2)"... (đúng cách getUniqueFileName xử lý
// khi 1 file mới trùng tên file đã tồn tại lúc upload: chỉ file mới bị
// đổi tên, file cũ không động tới).
const buildPlan = ({ documents, folderById }) => {
  const groups = new Map();
  documents.forEach((doc) => {
    const folderId = extractId(doc.folderId);
    if (!folderId) return; // document không thuộc folder nào — bỏ qua, không có "cùng thư mục" để so trùng
    const title = getDocDisplayTitle(doc);
    const key = `${folderId}::${normalizeName(title)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ doc, title });
  });

  const duplicateGroups = [];
  const actions = [];
  groups.forEach((list) => {
    if (list.length < 2) return;
    const sorted = [...list].sort(
      (a, b) => new Date(a.doc.createdAt || 0) - new Date(b.doc.createdAt || 0),
    );
    const folderId = extractId(sorted[0].doc.folderId);
    const folderPath = buildFolderPath(folderId, folderById);
    // taken bắt đầu chỉ với tên gốc (bản sớm nhất, không đổi) — mỗi bản
    // sau lần lượt được cấp số "(N)" nhỏ nhất còn trống, rồi cộng dồn vào
    // taken cho bản tiếp theo, đúng như upload nhiều file trùng tên liên
    // tiếp vào cùng 1 folder.
    const taken = new Set([normalizeName(sorted[0].title)]);
    const items = sorted.map((entry, idx) => {
      const currentTitle = getDocDisplayTitle(entry.doc);
      const newTitle = idx === 0 ? entry.title : getUniqueFileName(entry.title, taken);
      taken.add(normalizeName(newTitle));
      const needsChange = currentTitle !== newTitle;
      return {
        id: extractId(entry.doc.id),
        currentTitle,
        newTitle,
        createdAt: entry.doc.createdAt,
        needsChange,
      };
    });
    items.forEach((item) => {
      if (!item.needsChange) return;
      actions.push({
        folderId,
        folderPath,
        baseTitle: sorted[0].title,
        documentId: item.id,
        fromTitle: item.currentTitle,
        toTitle: item.newTitle,
        run: () =>
          ctx.api.request({
            url: "documents:update",
            method: "POST",
            params: { filterByTk: item.id },
            data: { title: item.newTitle },
          }),
      });
    });
    duplicateGroups.push({ folderId, folderPath, baseTitle: sorted[0].title, items });
  });

  return { duplicateGroups, actions };
};

const DocumentTitleVersionFixBlock = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [actions, setActions] = useState([]);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setApplyResult(null);
    try {
      const state = await loadState();
      const { duplicateGroups: groups, actions: plan } = buildPlan(state);
      setDuplicateGroups(groups);
      setActions(plan);
      console.log("[DocumentTitleVersionFix] duplicateGroups:", groups);
      console.log("[DocumentTitleVersionFix] actions:", plan);
    } catch (e) {
      console.error("[DocumentTitleVersionFix] load failed:", e);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const applyPlan = () => {
    if (!actions.length) return;
    Modal.confirm({
      title: `Đổi tên ${actions.length} document trùng tiêu đề?`,
      content:
        "Thao tác này ghi trực tiếp field \"title\" của document thật (documents:update). Chỉ đổi tên hiển thị (thêm hậu tố (1)/(2)/...), không xoá/di chuyển gì cả. Không thể tự hoàn tác — hãy xem lại bảng bên dưới trước khi tiếp tục.",
      okText: "Áp dụng",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        setApplying(true);
        setApplyResult(null);
        const results = [];
        for (const action of actions) {
          try {
            await action.run();
            results.push({ ...action, status: "ok" });
          } catch (e) {
            results.push({ ...action, status: "error", errorMessage: e?.message || String(e) });
          }
        }
        const failed = results.filter((r) => r.status === "error");
        setApplyResult(results);
        setApplying(false);
        if (failed.length) {
          message.warning(`Hoàn tất với ${failed.length}/${results.length} document đổi tên thất bại — xem bảng kết quả.`);
        } else {
          message.success(`Đã đổi tên ${results.length} document.`);
        }
        await load();
      },
    });
  };

  const groupColumns = [
    { title: "STT", key: "idx", width: 50, render: (_, __, i) => i + 1 },
    { title: "Document ID", dataIndex: "id", key: "id", width: 120 },
    { title: "Tên hiện tại", dataIndex: "currentTitle", key: "currentTitle" },
    {
      title: "Tên mới",
      dataIndex: "newTitle",
      key: "newTitle",
      render: (v, r) =>
        r.needsChange
          ? React.createElement(Text, { strong: true, style: { color: "#185FA5" } }, v)
          : React.createElement(Space, null, v, React.createElement(Tag, null, "đã đúng")),
    },
    { title: "Tạo lúc", dataIndex: "createdAt", key: "createdAt", width: 180 },
  ];

  const resultColumns = [
    { title: "Folder", dataIndex: "folderPath", key: "folderPath" },
    { title: "Document ID", dataIndex: "documentId", key: "documentId", width: 120 },
    { title: "Từ", dataIndex: "fromTitle", key: "fromTitle" },
    { title: "Thành", dataIndex: "toTitle", key: "toTitle" },
    {
      title: "Kết quả",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status, row) =>
        status === "ok"
          ? React.createElement(Tag, { color: "green" }, "OK")
          : React.createElement(Tag, { color: "red" }, row.errorMessage || "Lỗi"),
    },
  ];

  return React.createElement(
    "div",
    { style: { padding: 16 } },
    React.createElement(
      Space,
      { style: { marginBottom: 12 }, align: "center" },
      React.createElement(Title, { level: 4, style: { margin: 0 } }, "Fix: Document trùng tiêu đề trong cùng folder → gắn (1)/(2)/..."),
      React.createElement(Button, { onClick: load, loading: loading || applying }, "Quét lại"),
    ),
    error && React.createElement(Alert, { type: "error", message: error, style: { marginBottom: 12 } }),
    loading && !duplicateGroups.length && !error
      ? React.createElement(Spin, {})
      : React.createElement(
          React.Fragment,
          null,
          duplicateGroups.length === 0
            ? React.createElement(Alert, { type: "success", message: "Không phát hiện document trùng tiêu đề trong cùng folder." })
            : React.createElement(
                React.Fragment,
                null,
                React.createElement(
                  Text,
                  { type: "secondary" },
                  `${duplicateGroups.length} nhóm trùng, ${actions.length} document cần đổi tên.`,
                ),
                duplicateGroups.map((g, idx) =>
                  React.createElement(
                    "div",
                    { key: `${g.folderId}-${g.baseTitle}-${idx}`, style: { marginTop: 16 } },
                    React.createElement(
                      Paragraph,
                      { strong: true, style: { marginBottom: 6 } },
                      `${g.folderPath} — "${g.baseTitle}" (${g.items.length} bản)`,
                    ),
                    React.createElement(Table, {
                      rowKey: "id",
                      dataSource: g.items,
                      columns: groupColumns,
                      pagination: false,
                      size: "small",
                    }),
                  ),
                ),
                React.createElement(Button, {
                  type: "primary",
                  danger: true,
                  style: { marginTop: 16 },
                  disabled: !actions.length || applying,
                  loading: applying,
                  onClick: applyPlan,
                }, "Áp dụng đổi tên"),
              ),
          applyResult &&
            React.createElement(
              React.Fragment,
              null,
              React.createElement(Title, { level: 5, style: { marginTop: 24 } }, "Kết quả áp dụng lần chạy gần nhất"),
              React.createElement(Table, {
                rowKey: (r, i) => `${r.documentId}-${i}`,
                dataSource: applyResult,
                columns: resultColumns,
                pagination: { pageSize: 20 },
                size: "small",
              }),
            ),
        ),
  );
};

ctx.render(React.createElement(DocumentTitleVersionFixBlock, null));
