// ============================================================
// Folder Duplicate-Name FIX — gộp nội dung folder trùng tên (cùng cha)
// vào 1 bản chính (check + fix)
//
// Dùng chung logic phát hiện trùng với FolderDuplicateNameCheck.js: 2
// folder tính là trùng khi CÙNG thư mục cha + CÙNG tên đã chuẩn hoá (không
// so trùng xuyên suốt hệ thống, vì tên template như "Obsolete"/"Legal
// Study" lặp lại hợp lệ ở mọi case).
//
// Với mỗi nhóm trùng: người dùng CHỌN 1 bản làm "chính" (mặc định đề xuất
// theo bản có nhiều document + folder con nhất — tức đang thực sự được
// dùng), sau đó script chỉ ĐIỀU HƯỚNG LẠI (update parentId/folderId) các
// folder con + document trực tiếp của (các) bản còn lại về bản chính —
// KHÔNG xoá bản trùng, KHÔNG đụng gì khác.
//
// Tự động chống trùng tiêu đề document PHÁT SINH SAU KHI GỘP (đúng thuật
// toán getUniqueFileName có sẵn trong Library.js/TaskDetailView.js, cùng
// format với DocumentTitleVersionFix.js — xem comment ở đó): nếu 1
// document sắp chuyển vào có tên trùng với document đã có sẵn trong
// folder chính (hoặc trùng với document khác cũng đang chuyển vào cùng
// lúc), tự gắn hậu tố "(1)"/"(2)" — gộp chung vào đúng 1 lần ghi
// documents:update với document vừa chuyển, hoặc 1 lần ghi riêng (chỉ đổi
// title) với document vốn đã ở sẵn trong folder chính. Document tạo sớm
// nhất trong mỗi nhóm trùng luôn giữ nguyên tên, không đổi.
//
// Tuỳ chọn (mặc định TẮT): "Cũng XOÁ VĨNH VIỄN các folder trùng đã rỗng"
// — gọi folders:destroy (hard delete, KHÔNG phải Move to Trash — không
// khôi phục được) cho từng bản trùng không được chọn làm chính, miễn là
// sau khi áp dụng plan nó không còn folder con lẫn document nào (rỗng
// thật — kể cả rỗng sẵn từ đầu, không cần có gì để chuyển). Nếu có bất kỳ
// action chuyển/đổi tên nào của CHÍNH folder đó thất bại trong cùng lượt
// Áp dụng, action xoá của nó sẽ tự bỏ qua (không xoá 1 folder chưa chắc
// đã thật sự rỗng).
//
// Không tự ghi khi mở block — phải chọn bản chính cho từng nhóm rồi bấm
// "Áp dụng" (có Modal.confirm chặn trước khi ghi dữ liệu thật).
// ============================================================

const { React } = ctx;
const { useState } = React;
const { Table, Tag, Typography, Spin, Alert, Space, Button, Select, Modal, message, Collapse, Switch } = ctx.antd;
const { Title, Text } = Typography;
const { Panel } = Collapse;

const extractId = (val) =>
  typeof val === "object" && val !== null ? val.id : val;
const getFolderParentId = (folder) => extractId(folder?.parentId);
const normalizeName = (name) => String(name || "").trim().toLowerCase();
const getAttachment = (doc) =>
  Array.isArray(doc?.fileAttachment) ? doc.fileAttachment[0] : doc?.fileAttachment;
const getDocLabel = (doc) =>
  doc?.title || doc?.name || doc?.templateName || getAttachment(doc)?.filename || `Document #${extractId(doc?.id)}`;

// Sao chép nguyên văn từ Library.js/DocumentTitleVersionFix.js — cùng 1
// thuật toán cho mọi nơi trong hệ thống xử lý tên trùng.
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

const loadState = async () => {
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

  const childrenByParent = new Map();
  folders.forEach((f) => {
    const pid = getFolderParentId(f);
    if (!pid || pid === "root") return;
    const key = String(pid);
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key).push(f);
  });

  const documentsByFolder = new Map();
  documents.forEach((d) => {
    const fid = extractId(d.folderId);
    if (!fid) return;
    const key = String(fid);
    if (!documentsByFolder.has(key)) documentsByFolder.set(key, []);
    documentsByFolder.get(key).push(d);
  });

  // Nhóm theo (parentId, tên chuẩn hoá).
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
    const candidates = list.map((f) => {
      const id = extractId(f.id);
      const directChildFolders = childrenByParent.get(String(id)) || [];
      const directDocuments = documentsByFolder.get(String(id)) || [];
      return {
        id,
        name: f.name,
        createdAt: f.createdAt,
        directChildFolders,
        directDocuments,
        totalDescendantFolders: countDescendantFolders(id, childrenByParent),
        activityScore:
          countDescendantFolders(id, childrenByParent) + directDocuments.length,
      };
    });
    candidates.sort(
      (a, b) =>
        b.activityScore - a.activityScore ||
        new Date(a.createdAt) - new Date(b.createdAt),
    );
    duplicateGroups.push({
      groupKey: `${parentId || "root"}::${normalizeName(list[0].name)}`,
      name: list[0].name,
      parentPath: buildFolderPath(parentId, folderById),
      candidates,
      suggestedCanonicalId: candidates[0]?.id,
    });
  });

  return { duplicateGroups };
};

const buildFixPlan = (
  duplicateGroups,
  canonicalByGroup,
  { deleteEmptyDuplicates = false } = {},
) => {
  const actions = [];
  duplicateGroups.forEach((g) => {
    const canonicalId = canonicalByGroup[g.groupKey] ?? g.suggestedCanonicalId;
    const canonicalCandidate = g.candidates.find(
      (c) => String(c.id) === String(canonicalId),
    );

    // Folder con — không có khái niệm "version" cho folder, chỉ điều
    // hướng lại như cũ.
    g.candidates.forEach((cand) => {
      if (String(cand.id) === String(canonicalId)) return;
      cand.directChildFolders.forEach((childFolder) => {
        actions.push({
          groupKey: g.groupKey,
          groupLabel: `${g.parentPath} / ${g.name}`,
          op: "move_folder",
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
    });

    // Document — gom TOÀN BỘ document sẽ có mặt trong folder chính SAU
    // khi gộp (cả những cái vốn đã ở sẵn đó lẫn những cái sắp chuyển vào
    // từ các bản trùng còn lại), rồi nhóm theo tiêu đề chuẩn hoá để phát
    // hiện trùng PHÁT SINH SAU GỘP — chưa chắc trùng trước đó, vì trước
    // khi gộp chúng nằm ở 2 folder riêng biệt nên không đụng nhau.
    const resultingDocs = [];
    (canonicalCandidate?.directDocuments || []).forEach((doc) => {
      resultingDocs.push({ doc, status: "resident", fromRootId: canonicalId });
    });
    g.candidates.forEach((cand) => {
      if (String(cand.id) === String(canonicalId)) return;
      cand.directDocuments.forEach((doc) => {
        resultingDocs.push({ doc, status: "incoming", fromRootId: cand.id });
      });
    });

    const titleGroups = new Map();
    resultingDocs.forEach((entry) => {
      const title = getDocLabel(entry.doc);
      const key = normalizeName(title);
      if (!titleGroups.has(key)) titleGroups.set(key, []);
      titleGroups.get(key).push({ ...entry, title });
    });

    titleGroups.forEach((list) => {
      if (list.length < 2) {
        // Không trùng tên — incoming thì chỉ cần chuyển folder, resident
        // thì không cần làm gì.
        const entry = list[0];
        if (entry.status !== "incoming") return;
        actions.push({
          groupKey: g.groupKey,
          groupLabel: `${g.parentPath} / ${g.name}`,
          op: "move_document",
          itemLabel: getDocLabel(entry.doc),
          fromRootId: entry.fromRootId,
          toRootId: canonicalId,
          detail: `Document "${getDocLabel(entry.doc)}": chuyển folderId từ #${entry.fromRootId} → #${canonicalId}`,
          run: () =>
            ctx.api.request({
              url: "documents:update",
              method: "POST",
              params: { filterByTk: extractId(entry.doc.id) },
              data: { folderId: Number(canonicalId) },
            }),
        });
        return;
      }
      // Trùng tên — document vốn đã ở sẵn trong folder chính (resident)
      // luôn giữ nguyên tên, không đụng tới (đúng cách getUniqueFileName
      // xử lý: file đã tồn tại không bị đổi tên, chỉ file MỚI tới mới bị
      // gắn số). Nếu không có resident nào (mọi bản đều đang chuyển vào từ
      // 2 folder khác nhau, lần đầu "gặp nhau"), document chuyển vào SỚM
      // NHẤT giữ tên gốc, các bản chuyển vào sau mới bị gắn "(1)", "(2)".
      const sorted = [...list].sort(
        (a, b) => new Date(a.doc.createdAt || 0) - new Date(b.doc.createdAt || 0),
      );
      const taken = new Set(
        sorted.filter((e) => e.status === "resident").map((e) => normalizeName(e.title)),
      );
      sorted.forEach((entry) => {
        // resident không bao giờ bị đổi tên/chuyển — chỉ document đang
        // "chuyển vào" mới cần xử lý ở đây.
        if (entry.status !== "incoming") return;
        const currentTitle = getDocLabel(entry.doc);
        const newTitle = getUniqueFileName(entry.title, taken);
        taken.add(normalizeName(newTitle));
        const needsRename = currentTitle !== newTitle;
        const data = { folderId: Number(canonicalId) };
        if (needsRename) data.title = newTitle;
        const op = needsRename ? "move_and_rename_document" : "move_document";
        const detailParts = [`chuyển folderId từ #${entry.fromRootId} → #${canonicalId}`];
        if (needsRename) detailParts.push(`đổi tên "${currentTitle}" → "${newTitle}" (trùng tên sau gộp)`);
        actions.push({
          groupKey: g.groupKey,
          groupLabel: `${g.parentPath} / ${g.name}`,
          op,
          itemLabel: currentTitle,
          fromRootId: entry.fromRootId,
          toRootId: canonicalId,
          detail: `Document "${currentTitle}": ${detailParts.join("; ")}`,
          run: () =>
            ctx.api.request({
              url: "documents:update",
              method: "POST",
              params: { filterByTk: extractId(entry.doc.id) },
              data,
            }),
        });
      });
    });

    // Dọn dẹp (tuỳ chọn, mặc định tắt): mọi bản trùng KHÔNG được chọn làm
    // chính — sau khi các action ở trên chạy, nó luôn hết folder con +
    // document (toàn bộ đã được chuyển đi), kể cả khi nó vốn đã rỗng sẵn
    // từ đầu (không cần chờ có gì để chuyển). XOÁ VĨNH VIỄN (folders:destroy)
    // — không phải Move to Trash, không khôi phục được. `requiresEmptyOf:
    // cand.id` đánh dấu để vòng lặp Áp dụng tự bỏ qua action này nếu có
    // action chuyển/đổi tên nào của CHÍNH folder #cand.id thất bại trước
    // đó trong cùng lượt chạy (folder khi đó chưa chắc đã thật sự rỗng).
    if (deleteEmptyDuplicates) {
      g.candidates.forEach((cand) => {
        if (String(cand.id) === String(canonicalId)) return;
        actions.push({
          groupKey: g.groupKey,
          groupLabel: `${g.parentPath} / ${g.name}`,
          op: "delete_folder",
          itemLabel: cand.name || `Folder #${cand.id}`,
          fromRootId: cand.id,
          toRootId: canonicalId,
          requiresEmptyOf: cand.id,
          detail: `Folder "${cand.name || cand.id}" (#${cand.id}): xoá vĩnh viễn sau khi đã rỗng`,
          run: () =>
            ctx.api.request({
              url: "folders:destroy",
              method: "POST",
              params: { filterByTk: extractId(cand.id) },
            }),
        });
      });
    }
  });
  return actions;
};

const OP_LABELS = {
  move_folder: { text: "Chuyển folder", color: "blue" },
  move_document: { text: "Chuyển document", color: "purple" },
  rename_document: { text: "Đổi tên (trùng sau gộp)", color: "gold" },
  move_and_rename_document: { text: "Chuyển + đổi tên", color: "magenta" },
  delete_folder: { text: "Xoá vĩnh viễn folder", color: "red" },
};

const FolderDuplicateNameFixBlock = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [canonicalByGroup, setCanonicalByGroup] = useState({});
  const [deleteEmptyDuplicates, setDeleteEmptyDuplicates] = useState(false);
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
          const stillValid = g.candidates.some((c) => String(c.id) === String(next[g.groupKey]));
          if (!stillValid) next[g.groupKey] = g.suggestedCanonicalId;
        });
        return next;
      });
      console.log("[FolderDuplicateNameFix] groups:", groups);
    } catch (e) {
      console.error("[FolderDuplicateNameFix] load failed:", e);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const plan = buildFixPlan(duplicateGroups, canonicalByGroup, {
    deleteEmptyDuplicates,
  });

  const applyPlan = () => {
    if (!plan.length) return;
    const groupCount = new Set(plan.map((a) => a.groupKey)).size;
    Modal.confirm({
      title: `Áp dụng ${plan.length} thay đổi trên ${groupCount} nhóm folder trùng?`,
      content: deleteEmptyDuplicates
        ? "Thao tác này gọi API ghi trực tiếp lên dữ liệu thật (folders.parentId / documents.folderId), VÀ XOÁ VĨNH VIỄN các folder trùng sau khi đã rỗng (folders:destroy — KHÔNG phải Move to Trash, KHÔNG khôi phục được). Hãy xem kỹ bảng kế hoạch bên dưới trước khi tiếp tục."
        : "Thao tác này gọi API ghi trực tiếp lên dữ liệu thật (folders.parentId / documents.folderId). Không thể tự hoàn tác — hãy xem lại bảng kế hoạch bên dưới trước khi tiếp tục. Các folder trùng KHÔNG bị xoá, chỉ trở nên rỗng (bật switch \"Cũng xoá vĩnh viễn...\" phía trên nếu muốn dọn luôn).",
      okText: "Áp dụng",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        setApplying(true);
        setApplyResult(null);
        const results = [];
        // Folder nào có action chuyển/đổi tên bị lỗi thì không xoá vĩnh
        // viễn nó (requiresEmptyOf) — folder đó chưa chắc đã thật sự rỗng.
        const failedFolderIds = new Set();
        for (const action of plan) {
          if (action.requiresEmptyOf && failedFolderIds.has(String(action.requiresEmptyOf))) {
            results.push({
              ...action,
              status: "error",
              errorMessage: "Bỏ qua — có thao tác chuyển/đổi tên của folder này thất bại trước đó, chưa chắc đã rỗng.",
            });
            continue;
          }
          try {
            await action.run();
            results.push({ ...action, status: "ok" });
          } catch (e) {
            if (action.fromRootId) failedFolderIds.add(String(action.fromRootId));
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
    { title: "Nhóm", dataIndex: "groupLabel", key: "groupLabel", width: 260 },
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
      { style: { marginBottom: 12 }, align: "center", wrap: true },
      React.createElement(Title, { level: 4, style: { margin: 0 } }, "Fix: Folder trùng tên (cùng thư mục cha) — gộp về 1 bản chính"),
      React.createElement(Button, { onClick: load, loading: loading || applying }, "Tính lại"),
      React.createElement(
        Space,
        { align: "center" },
        React.createElement(Switch, {
          checked: deleteEmptyDuplicates,
          onChange: setDeleteEmptyDuplicates,
          disabled: loading || applying,
        }),
        React.createElement(Text, { type: "secondary" },
          "Cũng XOÁ VĨNH VIỄN các folder trùng đã rỗng sau khi gộp (folders:destroy — không phải Trash, không khôi phục được)",
        ),
      ),
    ),
    error && React.createElement(Alert, { type: "error", message: error, style: { marginBottom: 12 } }),
    loading && !duplicateGroups.length && !error
      ? React.createElement(Spin, {})
      : React.createElement(
          React.Fragment,
          null,
          duplicateGroups.length === 0
            ? React.createElement(Alert, { type: "success", message: "Không phát hiện folder trùng tên trong cùng thư mục cha." })
            : React.createElement(
                Collapse,
                { defaultActiveKey: duplicateGroups.map((g) => g.groupKey) },
                duplicateGroups.map((g) =>
                  React.createElement(
                    Panel,
                    { header: `${g.parentPath} / "${g.name}" — ${g.candidates.length} bản trùng`, key: g.groupKey },
                    React.createElement(
                      Space,
                      { direction: "vertical", style: { width: "100%" } },
                      React.createElement(
                        Space,
                        { align: "center" },
                        React.createElement(Text, null, "Giữ lại (bản chính):"),
                        React.createElement(Select, {
                          style: { width: 480 },
                          value: canonicalByGroup[g.groupKey],
                          onChange: (val) => setCanonicalByGroup((prev) => ({ ...prev, [g.groupKey]: val })),
                          options: g.candidates.map((c) => ({
                            value: c.id,
                            label: `#${c.id} — tạo ${c.createdAt} — ${c.totalDescendantFolders} folder con, ${c.directDocuments.length} document${String(c.id) === String(g.suggestedCanonicalId) ? " (đề xuất)" : ""}`,
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
                          { title: "Tạo lúc", dataIndex: "createdAt", key: "createdAt", width: 180 },
                          { title: "Folder con trực tiếp", key: "directChildFolders", width: 140, render: (r) => r.directChildFolders.length },
                          { title: "Tổng folder con cháu", dataIndex: "totalDescendantFolders", key: "totalDescendantFolders", width: 140 },
                          { title: "Document trực tiếp", key: "directDocuments", width: 140, render: (r) => r.directDocuments.length },
                        ],
                        expandable: {
                          defaultExpandAllRows: true,
                          expandedRowRender: (record) => {
                            const items = [
                              ...record.directChildFolders.map((f) => `📁 ${f.name || `Folder #${extractId(f.id)}`}`),
                              ...record.directDocuments.map((d) => `📄 ${getDocLabel(d)}`),
                            ];
                            if (!items.length) {
                              return React.createElement(Text, { type: "secondary" }, "Không có folder/document con trực tiếp.");
                            }
                            return React.createElement(
                              "ul",
                              { style: { margin: 0, paddingLeft: 20, columns: 2, columnGap: 24 } },
                              items.map((label, i) =>
                                React.createElement("li", { key: i, style: { fontSize: 13 } }, label),
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
                `Kế hoạch: ${plan.length} thay đổi (chỉ điều hướng lại folder/document con trực tiếp — không xoá bản trùng).`,
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
                rowKey: (r, i) => `${r.groupKey}-${r.op}-${r.itemLabel}-${i}`,
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
                rowKey: (r, i) => `result-${r.groupKey}-${r.op}-${r.itemLabel}-${i}`,
                dataSource: applyResult,
                columns: resultColumns,
                pagination: { pageSize: 20 },
                size: "small",
              }),
            ),
        ),
  );
};

ctx.render(React.createElement(FolderDuplicateNameFixBlock, null));
