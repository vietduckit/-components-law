// ============================================================
// Library Root-Folder Duplicate Check (read-only)
//
// Bối cảnh: hệ thống quản lý dữ liệu/backup Google Drive dựa trên 4 folder
// gốc cấp cao nhất (parentId rỗng): "Customers", "Internal Work",
// "Knowledge", "My Documents". Mỗi cái được resolve ĐỘNG lúc runtime theo
// tên (và libraryCategoryKey nếu có) thay vì hardcode id cố định — xem
// comment trong Library.js quanh LIBRARY_CATEGORY_KEY_BY_SPACE: "an id gets
// orphaned the moment this folder record is ever deleted/recreated". Sự cố
// đã phát hiện: có nhiều hơn 1 bản ghi folder cùng tên ở cấp gốc cho
// "Customers" và "Internal Work" — con của case/customer mới thì nằm dưới
// bản ghi này, dữ liệu cũ thì nằm dưới bản ghi kia, tách rời nhau.
//
// Script này CHỈ QUÉT & BÁO CÁO — không sửa gì. Quét TẤT CẢ folder gốc
// (không giới hạn 4 tên trên) để không bỏ sót nếu phát sinh case khác.
// ============================================================

const { React } = ctx;
const { useState, useEffect } = React;
const { Table, Tag, Typography, Spin, Alert, Space, Button, Collapse } = ctx.antd;
const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

const extractId = (val) =>
  typeof val === "object" && val !== null ? val.id : val;
const getFolderParentId = (folder) => extractId(folder?.parentId);
const isTopLevelFolder = (folder) => {
  const p = getFolderParentId(folder);
  return !p || p === "root";
};
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

const fetchCount = async (url, filter) => {
  const res = await ctx.api.request({
    url,
    params: { pageSize: 1, filter: JSON.stringify(filter) },
  });
  return res?.data?.meta?.count ?? (res?.data?.data ? res.data.data.length : 0);
};

// Đếm toàn bộ folder con cháu (đệ quy) của 1 root, dựa trên map cha→con đã
// build sẵn trong bộ nhớ (không gọi API thêm).
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

const runCheck = async () => {
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

  const duplicateGroups = [];
  for (const [name, list] of groups.entries()) {
    if (list.length < 2) continue;
    const enriched = await Promise.all(
      list.map(async (f) => {
        const id = extractId(f.id);
        const directChildFolderRecords = childrenByParent.get(String(id)) || [];
        // folderId -> folder name, cho từng folder con trực tiếp — để soi
        // bằng mắt xem bản ghi nào đang chứa dữ liệu thật (thay vì chỉ tin
        // vào số đếm).
        const directChildFolderList = directChildFolderRecords
          .map((cf) => ({ id: extractId(cf.id), name: cf.name || `Folder #${extractId(cf.id)}` }))
          .sort((a, b) => String(a.name).localeCompare(String(b.name)));
        const totalDescendantFolders = countDescendantFolders(id, childrenByParent);
        const directDocuments = await fetchCount("documents:list", { folderId: { $eq: id } });
        return {
          id,
          name: f.name,
          createdAt: f.createdAt,
          type: f.type,
          storageType: f.storageType,
          moduleScope: f.moduleScope,
          libraryCategoryKey: f.libraryCategoryKey,
          directChildFolders: directChildFolderList.length,
          directChildFolderList,
          totalDescendantFolders,
          directDocuments,
          activityScore: totalDescendantFolders + directDocuments,
        };
      }),
    );
    enriched.sort(
      (a, b) =>
        b.activityScore - a.activityScore ||
        new Date(a.createdAt) - new Date(b.createdAt),
    );
    duplicateGroups.push({
      name: list[0].name,
      candidates: enriched,
      suggestedCanonicalId: enriched[0]?.id,
    });
  }

  return { duplicateGroups, totalTopLevelFolders: topLevel.length };
};

const candidateColumns = (suggestedCanonicalId) => [
  {
    title: "Folder ID",
    dataIndex: "id",
    key: "id",
    width: 160,
    render: (id) =>
      String(id) === String(suggestedCanonicalId)
        ? React.createElement(
            Space,
            null,
            React.createElement("span", null, id),
            React.createElement(Tag, { color: "green" }, "Đề xuất giữ lại"),
          )
        : id,
  },
  { title: "Tên folder", dataIndex: "name", key: "name", width: 200 },
  { title: "Tạo lúc", dataIndex: "createdAt", key: "createdAt", width: 180 },
  { title: "Folder con trực tiếp", dataIndex: "directChildFolders", key: "directChildFolders", width: 140 },
  { title: "Tổng folder con cháu", dataIndex: "totalDescendantFolders", key: "totalDescendantFolders", width: 140 },
  { title: "Document trực tiếp", dataIndex: "directDocuments", key: "directDocuments", width: 140 },
  { title: "type", dataIndex: "type", key: "type", width: 120 },
  { title: "moduleScope", dataIndex: "moduleScope", key: "moduleScope", width: 140 },
  { title: "libraryCategoryKey", dataIndex: "libraryCategoryKey", key: "libraryCategoryKey", width: 160 },
];

// Mở rộng 1 hàng candidate ra thành danh sách "folderId — folder name" của
// từng folder con trực tiếp, để check bằng mắt thay vì chỉ tin số đếm.
const renderChildFolderList = (record) => {
  if (!record.directChildFolderList.length) {
    return React.createElement(Text, { type: "secondary" }, "Không có folder con trực tiếp.");
  }
  return React.createElement(
    "ul",
    { style: { margin: 0, paddingLeft: 20, columns: 2, columnGap: 24 } },
    record.directChildFolderList.map((cf) =>
      React.createElement(
        "li",
        { key: cf.id, style: { fontSize: 13 } },
        React.createElement("code", null, `#${cf.id}`),
        " — ",
        cf.name,
      ),
    ),
  );
};

const LibraryRootFolderDuplicateCheckBlock = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await runCheck();
      setResult(r);
      console.log("[LibraryRootFolderDuplicateCheck] duplicateGroups:", r.duplicateGroups);
      // In riêng từng nhóm ra console.table: mỗi hàng là 1 folder con trực
      // tiếp (rootId/rootName — folderId/folderName), tiện copy sang Excel
      // để đối chiếu tay khi bảng UI không đủ chỗ hiển thị hết.
      r.duplicateGroups.forEach((g) => {
        const flat = [];
        g.candidates.forEach((cand) => {
          cand.directChildFolderList.forEach((cf) => {
            flat.push({
              rootId: cand.id,
              rootCreatedAt: cand.createdAt,
              childFolderId: cf.id,
              childFolderName: cf.name,
            });
          });
        });
        console.log(`[LibraryRootFolderDuplicateCheck] "${g.name}" — folder con trực tiếp theo từng root:`);
        console.table(flat);
      });
    } catch (e) {
      console.error("[LibraryRootFolderDuplicateCheck] failed:", e);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return React.createElement(
    "div",
    { style: { padding: 16 } },
    React.createElement(
      Space,
      { style: { marginBottom: 12 }, align: "center" },
      React.createElement(Title, { level: 4, style: { margin: 0 } }, "Check: Folder gốc bị trùng (Customers / Internal Work / Knowledge / My Documents / ...)"),
      React.createElement(Button, { onClick: load, loading }, "Quét lại"),
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
              `Tổng ${result.totalTopLevelFolders} folder gốc (không có parent). ${result.duplicateGroups.length} tên bị trùng lặp.`,
            ),
            result.duplicateGroups.length === 0
              ? React.createElement(Alert, {
                  type: "success",
                  style: { marginTop: 12 },
                  message: "Không phát hiện folder gốc trùng tên.",
                })
              : React.createElement(
                  Collapse,
                  { style: { marginTop: 12 }, defaultActiveKey: result.duplicateGroups.map((g) => g.name) },
                  result.duplicateGroups.map((g) =>
                    React.createElement(
                      Panel,
                      { header: `"${g.name}" — ${g.candidates.length} bản ghi trùng`, key: g.name },
                      React.createElement(Table, {
                        rowKey: "id",
                        dataSource: g.candidates,
                        columns: candidateColumns(g.suggestedCanonicalId),
                        pagination: false,
                        size: "small",
                        expandable: {
                          expandedRowRender: renderChildFolderList,
                          defaultExpandAllRows: true,
                        },
                      }),
                    ),
                  ),
                ),
            result.duplicateGroups.length > 0 &&
              React.createElement(Paragraph, { type: "secondary", style: { marginTop: 12 } },
                "Dùng LibraryRootFolderDuplicateFix.js để chọn bản ghi giữ lại cho từng nhóm và điều hướng folder/document con về đúng 1 root.",
              ),
          ),
  );
};

ctx.render(React.createElement(LibraryRootFolderDuplicateCheckBlock, null));
