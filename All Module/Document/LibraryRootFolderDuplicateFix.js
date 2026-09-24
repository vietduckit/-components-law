// ============================================================
// Library Root-Folder Duplicate FIX (ghi dữ liệu)
//
// Dùng chung logic phát hiện trùng lặp với
// LibraryRootFolderDuplicateCheck.js. Với mỗi nhóm folder gốc trùng tên
// ("Customers", "Internal Work", ...), người dùng CHỌN 1 bản ghi làm
// "canonical" (mặc định đề xuất theo bản ghi có nhiều folder/document con
// nhất — tức bản ghi đang thực sự được dùng), sau đó script chỉ ĐIỀU HƯỚNG
// LẠI (update parentId/folderId) các folder/document con trực tiếp của các
// bản ghi còn lại về canonical — KHÔNG xoá bản ghi trùng, KHÔNG đụng vào
// bất cứ gì khác.
//
// Không tự chạy ghi khi mở block — phải chọn canonical cho từng nhóm rồi
// bấm "Áp dụng" (có Modal.confirm chặn trước khi gọi API ghi).
// ============================================================

const { React } = ctx;
const { useState, useEffect } = React;
const { Table, Tag, Typography, Spin, Alert, Space, Button, Select, Modal, message, Collapse } = ctx.antd;
const { Title, Text } = Typography;
const { Panel } = Collapse;

const extractId = (val) =>
  typeof val === "object" && val !== null ? val.id : val;
const getFolderParentId = (folder) => extractId(folder?.parentId);
const isTopLevelFolder = (folder) => {
  const p = getFolderParentId(folder);
  return !p || p === "root";
};
const normalizeName = (name) => String(name || "").trim().toLowerCase();
const getDocLabel = (doc) => doc?.name || doc?.title || doc?.templateName || `Document #${extractId(doc?.id)}`;

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

const countDescendantFolders = (rootId, childrenByParent) => {
  let count = 0;
  const stack = [String(rootId)];
  const visited = new Set();
  while (stack.length) {
    const cur = stack.pop();
    const kids = childrenByParent.get(cur) || [];
    kids.forEach((k) => {
      const kid = String(extractId(k.id));
      if (visited.has(kid)) return;
      visited.add(kid);
      count++;
      stack.push(kid);
    });
  }
  return count;
};

// Load toàn bộ state cần thiết 1 lần: tất cả folders + document trực tiếp
// của riêng các folder gốc (để build được cả bảng hiển thị lẫn plan di
// chuyển mà không phải fetch lại khi người dùng đổi lựa chọn canonical).
const loadState = async () => {
  const folders = await fetchAllList("folders:list", {});
  const topLevel = folders.filter(isTopLevelFolder);

  const childrenByParent = new Map();
  folders.forEach((f) => {
    const pid = getFolderParentId(f);
    if (!pid || pid === "root") return;
    const key = String(pid);
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key).push(f);
  });

  const groups = new Map();
  topLevel.forEach((f) => {
    const key = normalizeName(f.name);
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  });

  const duplicateGroupIds = [];
  for (const list of groups.values()) {
    if (list.length > 1) list.forEach((f) => duplicateGroupIds.push(extractId(f.id)));
  }

  // Chỉ fetch documents cho các folder gốc TRÙNG (không quét toàn bộ
  // documents trong hệ thống).
  const documentsByFolder = new Map();
  if (duplicateGroupIds.length) {
    const docs = await fetchAllList("documents:list", {
      filter: JSON.stringify({ folderId: { $in: duplicateGroupIds } }),
    });
    docs.forEach((d) => {
      const fid = String(extractId(d.folderId));
      if (!documentsByFolder.has(fid)) documentsByFolder.set(fid, []);
      documentsByFolder.get(fid).push(d);
    });
  }

  const duplicateGroups = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const candidates = list.map((f) => {
      const id = extractId(f.id);
      const directChildFolders = childrenByParent.get(String(id)) || [];
      const directDocuments = documentsByFolder.get(String(id)) || [];
      return {
        id,
        name: f.name,
        createdAt: f.createdAt,
        directChildFolders,
        totalDescendantFolders: countDescendantFolders(id, childrenByParent),
        directDocuments,
        activityScore: countDescendantFolders(id, childrenByParent) + directDocuments.length,
      };
    });
    candidates.sort(
      (a, b) =>
        b.activityScore - a.activityScore ||
        new Date(a.createdAt) - new Date(b.createdAt),
    );
    duplicateGroups.push({
      name: list[0].name,
      candidates,
      suggestedCanonicalId: candidates[0]?.id,
    });
  }

  return { duplicateGroups };
};

// Với 1 lựa chọn canonical/nhóm, build danh sách action di chuyển folder/
// document con trực tiếp của các bản ghi KHÔNG được chọn về canonical.
const buildFixPlan = (duplicateGroups, canonicalByGroup) => {
  const actions = [];
  duplicateGroups.forEach((g) => {
    const canonicalId = canonicalByGroup[g.name] ?? g.suggestedCanonicalId;
    g.candidates.forEach((cand) => {
      if (String(cand.id) === String(canonicalId)) return;
      cand.directChildFolders.forEach((childFolder) => {
        actions.push({
          groupName: g.name,
          op: "move_folder",
          itemId: extractId(childFolder.id),
          itemLabel: childFolder.name || `Folder #${extractId(childFolder.id)}`,
          fromRootId: cand.id,
          toRootId: canonicalId,
          detail: `Folder "${childFolder.name || extractId(childFolder.id)}": chuyển parentId từ #${cand.id} → #${canonicalId}`,
          run: () =>
            ctx.api.request({
              url: "folders:update",
              method: "POST",
              params: { filterByTk: extractId(childFolder.id) },
              data: { parentId: Number(canonicalId) },
            }),
        });
      });
      cand.directDocuments.forEach((doc) => {
        actions.push({
          groupName: g.name,
          op: "move_document",
          itemId: extractId(doc.id),
          itemLabel: getDocLabel(doc),
          fromRootId: cand.id,
          toRootId: canonicalId,
          detail: `Document "${getDocLabel(doc)}": chuyển folderId từ #${cand.id} → #${canonicalId}`,
          run: () =>
            ctx.api.request({
              url: "documents:update",
              method: "POST",
              params: { filterByTk: extractId(doc.id) },
              data: { folderId: Number(canonicalId) },
            }),
        });
      });
    });
  });
  return actions;
};

const OP_LABELS = {
  move_folder: { text: "Chuyển folder", color: "blue" },
  move_document: { text: "Chuyển document", color: "purple" },
};

const LibraryRootFolderDuplicateFixBlock = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [canonicalByGroup, setCanonicalByGroup] = useState({});
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setApplyResult(null);
    try {
      const { duplicateGroups: groups } = await loadState();
      setDuplicateGroups(groups);
      setCanonicalByGroup((prev) => {
        const next = { ...prev };
        groups.forEach((g) => {
          // Giữ lựa chọn cũ nếu vẫn còn hợp lệ (bản ghi đó vẫn tồn tại trong
          // nhóm sau khi nạp lại), nếu không thì rơi về đề xuất mặc định.
          const stillValid = g.candidates.some((c) => String(c.id) === String(next[g.name]));
          if (!stillValid) next[g.name] = g.suggestedCanonicalId;
        });
        return next;
      });
      console.log("[LibraryRootFolderDuplicateFix] groups:", groups);
    } catch (e) {
      console.error("[LibraryRootFolderDuplicateFix] load failed:", e);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const plan = buildFixPlan(duplicateGroups, canonicalByGroup);

  const applyPlan = () => {
    if (!plan.length) return;
    const groupCount = new Set(plan.map((a) => a.groupName)).size;
    Modal.confirm({
      title: `Áp dụng ${plan.length} thay đổi trên ${groupCount} nhóm folder gốc?`,
      content: "Thao tác này gọi API ghi trực tiếp lên dữ liệu thật (folders.parentId / documents.folderId). Không thể tự hoàn tác — hãy xem lại bảng kế hoạch bên dưới trước khi tiếp tục. Các folder gốc trùng KHÔNG bị xoá, chỉ trở nên rỗng.",
      okText: "Áp dụng",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        setApplying(true);
        setApplyResult(null);
        const results = [];
        for (const action of plan) {
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
          message.warning(`Hoàn tất với ${failed.length}/${results.length} thay đổi thất bại — xem bảng kết quả bên dưới.`);
        } else {
          message.success(`Đã áp dụng ${results.length} thay đổi thành công.`);
        }
        await load();
      },
    });
  };

  const planColumns = [
    { title: "Nhóm", dataIndex: "groupName", key: "groupName", width: 140 },
    {
      title: "Hành động",
      dataIndex: "op",
      key: "op",
      width: 140,
      render: (op) => {
        const cfg = OP_LABELS[op] || { text: op, color: "default" };
        return React.createElement(Tag, { color: cfg.color }, cfg.text);
      },
    },
    { title: "Chi tiết", dataIndex: "detail", key: "detail" },
    { title: "Từ root", dataIndex: "fromRootId", key: "fromRootId", width: 100 },
    { title: "Về root", dataIndex: "toRootId", key: "toRootId", width: 100 },
  ];
  const resultColumns = [
    ...planColumns,
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
      React.createElement(Title, { level: 4, style: { margin: 0 } }, "Fix: Folder gốc bị trùng (điều hướng folder/document con về 1 root)"),
      React.createElement(Button, { onClick: load, loading: loading || applying }, "Tính lại"),
    ),
    error && React.createElement(Alert, { type: "error", message: error, style: { marginBottom: 12 } }),
    loading && !duplicateGroups.length && !error
      ? React.createElement(Spin, {})
      : React.createElement(
          React.Fragment,
          null,
          duplicateGroups.length === 0
            ? React.createElement(Alert, { type: "success", message: "Không phát hiện folder gốc trùng tên — không có gì để sửa." })
            : React.createElement(
                Collapse,
                { defaultActiveKey: duplicateGroups.map((g) => g.name) },
                duplicateGroups.map((g) =>
                  React.createElement(
                    Panel,
                    { header: `"${g.name}" — ${g.candidates.length} bản ghi trùng`, key: g.name },
                    React.createElement(
                      Space,
                      { direction: "vertical", style: { width: "100%" } },
                      React.createElement(
                        Space,
                        { align: "center" },
                        React.createElement(Text, null, "Giữ lại (canonical):"),
                        React.createElement(Select, {
                          style: { width: 420 },
                          value: canonicalByGroup[g.name],
                          onChange: (val) => setCanonicalByGroup((prev) => ({ ...prev, [g.name]: val })),
                          options: g.candidates.map((c) => ({
                            value: c.id,
                            label: `#${c.id} — "${c.name}" — tạo ${c.createdAt} — ${c.totalDescendantFolders} folder con, ${c.directDocuments.length} document${String(c.id) === String(g.suggestedCanonicalId) ? " (đề xuất)" : ""}`,
                          })),
                        }),
                      ),
                      React.createElement(Table, {
                        rowKey: "id",
                        dataSource: g.candidates,
                        pagination: false,
                        size: "small",
                        columns: [
                          { title: "Folder ID", dataIndex: "id", key: "id", width: 100 },
                          { title: "Tên folder", dataIndex: "name", key: "name", width: 200 },
                          { title: "Tạo lúc", dataIndex: "createdAt", key: "createdAt", width: 180 },
                          { title: "Folder con trực tiếp", key: "directChildFolders", width: 140, render: (r) => r.directChildFolders.length },
                          { title: "Tổng folder con cháu", dataIndex: "totalDescendantFolders", key: "totalDescendantFolders", width: 140 },
                          { title: "Document trực tiếp", key: "directDocuments", width: 140, render: (r) => r.directDocuments.length },
                        ],
                        expandable: {
                          defaultExpandAllRows: true,
                          expandedRowRender: (record) => {
                            if (!record.directChildFolders.length) {
                              return React.createElement(Text, { type: "secondary" }, "Không có folder con trực tiếp.");
                            }
                            const sorted = [...record.directChildFolders].sort((a, b) =>
                              String(a.name || "").localeCompare(String(b.name || "")),
                            );
                            return React.createElement(
                              "ul",
                              { style: { margin: 0, paddingLeft: 20, columns: 2, columnGap: 24 } },
                              sorted.map((cf) =>
                                React.createElement(
                                  "li",
                                  { key: extractId(cf.id), style: { fontSize: 13 } },
                                  React.createElement("code", null, `#${extractId(cf.id)}`),
                                  " — ",
                                  cf.name || `Folder #${extractId(cf.id)}`,
                                ),
                              ),
                            );
                          },
                        },
                      }),
                    ),
                  ),
                ),
              ),
          duplicateGroups.length > 0 &&
            React.createElement(
              "div",
              { style: { marginTop: 16 } },
              React.createElement(
                Text,
                { type: "secondary" },
                `Kế hoạch: ${plan.length} thay đổi (chỉ điều hướng lại folder/document con trực tiếp — không xoá bản ghi trùng).`,
              ),
              React.createElement(Button, {
                type: "primary",
                danger: true,
                style: { marginLeft: 12 },
                disabled: !plan.length || applying,
                loading: applying,
                onClick: applyPlan,
              }, "Áp dụng thay đổi"),
              React.createElement(Table, {
                style: { marginTop: 12 },
                rowKey: (r, i) => `${r.groupName}-${r.op}-${r.itemId}-${i}`,
                dataSource: plan,
                columns: planColumns,
                pagination: { pageSize: 20 },
                size: "small",
              }),
            ),
          applyResult &&
            React.createElement(
              React.Fragment,
              null,
              React.createElement(Title, { level: 5, style: { marginTop: 24 } }, "Kết quả áp dụng lần chạy gần nhất"),
              React.createElement(Table, {
                rowKey: (r, i) => `result-${r.groupName}-${r.op}-${r.itemId}-${i}`,
                dataSource: applyResult,
                columns: resultColumns,
                pagination: { pageSize: 20 },
                size: "small",
              }),
            ),
        ),
  );
};

ctx.render(React.createElement(LibraryRootFolderDuplicateFixBlock, null));
