// ============================================================
// DocumentRestore.js — Quản lý Thùng rác tài liệu
// ============================================================
const { React } = ctx;
const { useState, useEffect, useCallback, useMemo } = React;
const {
  Spin, Typography, Tag, Empty, Tooltip, Modal, Button, Input,
  Table, Space, Tabs, Descriptions, Popconfirm, Select, message,
  Checkbox, TreeSelect, Dropdown,
} = ctx.antd;
const { Text, Title } = Typography;

const FONT = "Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ==================== ICONS ====================
const iconNode = (tag, props) => React.createElement(tag, props);
const makeIcon = (children, options = {}) => {
  const size = options.size || 16;
  return React.createElement("svg", {
    viewBox: "0 0 24 24", width: size, height: size, fill: "none",
    stroke: options.color || "currentColor", strokeWidth: options.strokeWidth || 1.8,
    strokeLinecap: "round", strokeLinejoin: "round",
    "aria-hidden": true, focusable: false,
    style: { display: "inline-block", verticalAlign: "-0.18em", ...options.style },
  }, ...children);
};
const iconLabel = (icon, label, color) =>
  React.createElement("span", {
    style: { display: "inline-flex", alignItems: "center", gap: 8, color: color || "inherit", fontFamily: FONT },
  }, icon, React.createElement("span", null, label));

const RestoreIcon = makeIcon([
  iconNode("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }),
  iconNode("path", { d: "M3 3v5h5" }),
]);
const DeleteIcon = makeIcon([
  iconNode("path", { d: "M4 7h16" }),
  iconNode("path", { d: "M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" }),
  iconNode("path", { d: "m6 7 1 13h10l1-13" }),
]);
const FileIcon = makeIcon([
  iconNode("path", { d: "M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z" }),
  iconNode("path", { d: "M14 3.5V8h4" }),
]);
const FolderIcon = makeIcon([
  iconNode("path", { d: "M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6A2.5 2.5 0 0 1 20.5 9.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-9Z" }),
]);
const RefreshIcon = makeIcon([
  iconNode("path", { d: "M20 12a8 8 0 0 1-13.5 5.8" }),
  iconNode("path", { d: "M4 12A8 8 0 0 1 17.5 6.2" }),
  iconNode("path", { d: "M17 3v4h-4" }),
  iconNode("path", { d: "M7 21v-4h4" }),
]);
const SearchIcon = makeIcon([
  iconNode("circle", { cx: "11", cy: "11", r: "6.5" }),
  iconNode("path", { d: "m16 16 4 4" }),
]);
const WarningIcon = makeIcon([
  iconNode("path", { d: "M12 4 3 20h18L12 4Z" }),
  iconNode("path", { d: "M12 9v5" }),
  iconNode("path", { d: "M12 17h.01" }),
]);
const EyeIcon = makeIcon([
  iconNode("path", { d: "M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" }),
  iconNode("circle", { cx: "12", cy: "12", r: "2.5" }),
]);

// ==================== HELPERS ====================
const extractId = (val) => {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "object") return val.id ? parseInt(val.id, 10) : null;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
};

const getCurrentUser = () => {
  try {
    return ctx.currentUser || ctx.app?.currentUser || ctx.store?.getState()?.currentUser || null;
  } catch { return null; }
};

const isAdminUser = (user) => {
  if (!user) return false;
  return (user.roles || []).some((r) => {
    const rName = typeof r === "string" ? r : r.name;
    return ["admin", "root"].includes(rName?.toLowerCase());
  });
};

const formatDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "";
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const formatBytes = (bytes) => {
  if (!bytes || isNaN(bytes) || bytes === 0) return "--";
  const k = 1024, sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getUserName = (u) =>
  !u ? null : u.nickname || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.username || u.email || null;

const FILE_EXT_COLOR = {
  ".pdf": { color: "#ff4d4f", bg: "#fff2f0" },
  ".doc": { color: "#1890ff", bg: "#e6f7ff" },
  ".docx": { color: "#1890ff", bg: "#e6f7ff" },
  ".xls": { color: "#52c41a", bg: "#f6ffed" },
  ".xlsx": { color: "#52c41a", bg: "#f6ffed" },
  ".png": { color: "#722ed1", bg: "#f9f0ff" },
  ".jpg": { color: "#722ed1", bg: "#f9f0ff" },
  ".jpeg": { color: "#722ed1", bg: "#f9f0ff" },
};
const getExtInfo = (ext = "") => FILE_EXT_COLOR[ext.toLowerCase()] || { color: "#8c8c8c", bg: "#fafafa" };
const getFullUrl = (url) => !url ? null : url.startsWith("http") ? url : `${window.location.origin}${url}`;

// ==================== DATA HOOK ====================
function useDeletedData(currentUser) {
  const [deletedDocs, setDeletedDocs] = useState([]);
  const [deletedFolders, setDeletedFolders] = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const isAdmin = isAdminUser(currentUser);
      const uid = extractId(currentUser.id);

      // Fetch deleted documents
      let docFilter = { isDeleted: { $eq: true } };
      if (!isAdmin) docFilter = { $and: [{ isDeleted: { $eq: true } }, { createdById: { $eq: uid } }] };

      // Fetch deleted folders (admin only)
      let folderFilter = { isDeleted: { $eq: true } };

      const [docsRes, foldersRes, allFoldersRes] = await Promise.all([
        ctx.api.request({
          url: "documents:list",
          params: {
            pageSize: 2000,
            sort: ["-updatedAt"],
            filter: JSON.stringify(docFilter),
            appends: ["fileAttachment", "updatedBy", "createdBy"],
          },
        }).catch(() => ({ data: { data: [] } })),
        isAdmin ? ctx.api.request({
          url: "folders:list",
          params: {
            pageSize: 2000,
            sort: ["-updatedAt"],
            filter: JSON.stringify(folderFilter),
            appends: ["createdBy", "updatedBy"],
          },
        }).catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
        // Fetch all active folders for path resolution + permissions
        ctx.api.request({
          url: "folders:list",
          params: {
            pageSize: 2000,
            filter: JSON.stringify({ isDeleted: { $eq: false } }),
            appends: ["folderManager", "folderMember"],
          },
        }).catch(() => ({ data: { data: [] } })),
      ]);

      setDeletedDocs(docsRes?.data?.data || []);
      setDeletedFolders(foldersRes?.data?.data || []);
      setAllFolders(allFoldersRes?.data?.data || []);
    } catch (e) {
      message.error("Lỗi tải dữ liệu thùng rác");
    }
    setLoading(false);
  }, [currentUser]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { deletedDocs, deletedFolders, allFolders, loading, refetch: fetchData };
}

// ==================== PREVIEW MODAL (simple) ====================
const PreviewModal = ({ doc, onClose }) => {
  if (!doc) return null;
  const attachment = Array.isArray(doc.fileAttachment) ? doc.fileAttachment[0] : doc.fileAttachment;
  const fileUrl = attachment?.url || attachment?.preview;
  const fullUrl = getFullUrl(fileUrl);
  let fileExt = attachment?.extname
    ? (attachment.extname.startsWith(".") ? attachment.extname.toLowerCase() : "." + attachment.extname.toLowerCase())
    : "";
  const rawName = attachment?.title || attachment?.filename || "File";
  if (!fileExt && rawName.includes(".")) fileExt = "." + rawName.split(".").pop().toLowerCase();
  const isPdf = fileExt === ".pdf";
  const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(fileExt);
  const isOffice = [".doc", ".docx", ".xls", ".xlsx"].includes(fileExt);
  const officeUrl = isOffice && fullUrl ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}` : null;

  return React.createElement(Modal, {
    open: !!doc, onCancel: onClose, width: "85%", centered: true,
    title: React.createElement("span", { style: { fontFamily: FONT } }, rawName),
    footer: [
      fullUrl && React.createElement(Button, {
        key: "dl", type: "primary",
        onClick: () => window.open(fullUrl, "_blank"), style: { fontFamily: FONT },
      }, "Tải về"),
      React.createElement(Button, { key: "cl", onClick: onClose, style: { fontFamily: FONT } }, "Đóng"),
    ].filter(Boolean),
    bodyStyle: { padding: 0, height: "80vh", background: "#f5f5f5", position: "relative" },
  },
    (isPdf || fileExt === ".html") && fullUrl && React.createElement("iframe", {
      src: fullUrl, style: { width: "100%", height: "100%", border: "none", position: "relative", zIndex: 1 }, title: rawName,
    }),
    isImage && fullUrl && React.createElement("div", {
      style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" },
    }, React.createElement("img", { src: fullUrl, alt: rawName, style: { maxWidth: "100%", maxHeight: "100%", padding: 24 } })),
    isOffice && officeUrl && React.createElement("iframe", {
      src: officeUrl, style: { width: "100%", height: "100%", border: "none" }, title: rawName,
    }),
    !isPdf && !isImage && !isOffice && !fullUrl && React.createElement(Empty, {
      description: "Không thể xem trước", style: { paddingTop: 80 },
    }),
  );
};

// ==================== FOLDER CONTENT MODAL ====================
// Hiện danh sách file bên trong folder đã xóa để chọn restore
const FolderContentModal = ({ open, folder, onClose, onConfirmRestore, currentUser }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);

  useEffect(() => {
    if (!open || !folder) return;
    setLoading(true);
    setSelectedKeys([]);
    const fId = extractId(folder.id);
    ctx.api.request({
      url: "documents:list",
      params: {
        pageSize: 2000,
        filter: JSON.stringify({ $and: [{ folderId: { $eq: fId } }, { isDeleted: { $eq: true } }] }),
        appends: ["fileAttachment", "createdBy"],
      },
    }).then((res) => {
      const data = res?.data?.data || [];
      setFiles(data);
      setSelectedKeys(data.map((d) => extractId(d.id)));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [open, folder]);

  const columns = [
    {
      title: "Tên file", key: "name",
      render: (_, r) => {
        const att = Array.isArray(r.fileAttachment) ? r.fileAttachment[0] : r.fileAttachment;
        const name = r.title || att?.title || att?.filename || "Tài liệu";
        let ext = att?.extname ? (att.extname.startsWith(".") ? att.extname.toLowerCase() : "." + att.extname.toLowerCase()) : "";
        const extInfo = getExtInfo(ext);
        return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
          React.createElement("div", {
            style: { minWidth: 32, height: 24, borderRadius: 3, background: extInfo.bg, border: `1px solid ${extInfo.color}40`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: extInfo.color },
          }, ext.replace(".", "").toUpperCase().slice(0, 4) || "FILE"),
          React.createElement(Text, { style: { fontSize: 12, fontFamily: FONT } }, name),
        );
      },
    },
    {
      title: "Kích thước", key: "size", width: 100, align: "center",
      render: (_, r) => {
        const att = Array.isArray(r.fileAttachment) ? r.fileAttachment[0] : r.fileAttachment;
        return React.createElement(Text, { style: { fontSize: 12, color: "#8c8c8c" } }, formatBytes(att?.size));
      },
    },
    {
      title: "Ngày xóa", key: "deletedAt", width: 140,
      render: (_, r) => React.createElement(Text, { style: { fontSize: 12, color: "#8c8c8c" } }, formatDateTime(r.updatedAt)),
    },
  ];

  return React.createElement(Modal, {
    open, onCancel: onClose, width: 640,
    title: React.createElement("div", { style: { fontFamily: FONT } },
      React.createElement("div", null, `Khôi phục thư mục: "${folder?.name}"`),
      React.createElement(Text, { type: "secondary", style: { fontSize: 12, fontWeight: 400 } },
        "Chọn các file bên trong muốn khôi phục cùng thư mục"),
    ),
    footer: [
      React.createElement(Button, { key: "cancel", onClick: onClose, style: { fontFamily: FONT } }, "Hủy"),
      React.createElement(Button, {
        key: "confirm", type: "primary",
        disabled: selectedKeys.length === 0,
        onClick: () => onConfirmRestore(folder, selectedKeys),
        style: { fontFamily: FONT },
      }, `Khôi phục thư mục${selectedKeys.length > 0 ? ` + ${selectedKeys.length} file` : ""}`),
    ],
  },
    loading ? React.createElement(Spin, { style: { display: "block", margin: "40px auto" } }) :
    files.length === 0
      ? React.createElement("div", { style: { padding: "24px 0" } },
          React.createElement(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE,
            description: React.createElement(Text, { type: "secondary" }, "Thư mục này không có file nào bị xóa") }),
          React.createElement(Text, { style: { display: "block", textAlign: "center", marginTop: 8, fontFamily: FONT } },
            "Chỉ khôi phục thư mục trống"),
        )
      : React.createElement(Table, {
          dataSource: files,
          columns,
          rowKey: (r) => extractId(r.id),
          size: "small",
          pagination: false,
          scroll: { y: 320 },
          rowSelection: {
            selectedRowKeys: selectedKeys,
            onChange: setSelectedKeys,
          },
          style: { fontFamily: FONT },
        }),
  );
};

// ==================== RESTORE CONFLICT MODAL ====================
// Khi folder cha của file đã bị xóa
const RestoreConflictModal = ({ open, record, parentFolder, allLiveFolders, onClose, onRestoreWithNewFolder, onRestoreWithAncestors }) => {
  const [targetFolderId, setTargetFolderId] = useState("root");
  const [mode, setMode] = useState(null); // "new_folder" | "ancestors"

  useEffect(() => { if (open) { setMode(null); setTargetFolderId("root"); } }, [open]);

  const buildTreeForSelect = (data, parentId = null) =>
    data.filter((f) => {
      const pid = extractId(f.parentId);
      // Root level: parentId is null or 0 (Nocobase can return either)
      return parentId === null ? (!pid || pid === 0) : pid === parentId;
    })
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "vi"))
      .map((f) => ({
        title: f.name,
        value: String(extractId(f.id)),
        children: buildTreeForSelect(data, extractId(f.id)),
      }));

  const fileName = record?._type === "folder" ? record?.name :
    (() => { const att = Array.isArray(record?.fileAttachment) ? record?.fileAttachment[0] : record?.fileAttachment; return record?.title || att?.title || att?.filename || "Tài liệu"; })();

  return React.createElement(Modal, {
    open, onCancel: onClose, width: 500,
    title: React.createElement("span", { style: { fontFamily: FONT, color: "#faad14" } },
      WarningIcon, " Cảnh báo: Vị trí gốc đã bị xóa"),
    footer: null,
  },
    React.createElement("div", { style: { fontFamily: FONT } },
      React.createElement("p", null,
        "File ", React.createElement("strong", null, `"${fileName}"`),
        " thuộc thư mục ", React.createElement("strong", null, `"${parentFolder?.name}"`),
        " đã bị xóa. Bạn muốn xử lý thế nào?"),

      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12, marginTop: 16 } },
        // Option A: Restore ancestors
        React.createElement("div", {
          onClick: () => setMode("ancestors"),
          style: {
            padding: "12px 16px", border: `2px solid ${mode === "ancestors" ? "#1890ff" : "#f0f0f0"}`,
            borderRadius: 8, cursor: "pointer", background: mode === "ancestors" ? "#e6f7ff" : "#fafafa",
            transition: "0.2s",
          },
        },
          React.createElement("div", { style: { fontWeight: 600, color: mode === "ancestors" ? "#1890ff" : "#262626" } },
            "📁 Khôi phục cả thư mục cha"),
          React.createElement("div", { style: { fontSize: 12, color: "#8c8c8c", marginTop: 4 } },
            `Tự động khôi phục thư mục "${parentFolder?.name}" và đặt file về đúng vị trí ban đầu.`),
        ),

        // Option B: Choose new folder
        React.createElement("div", {
          onClick: () => setMode("new_folder"),
          style: {
            padding: "12px 16px", border: `2px solid ${mode === "new_folder" ? "#1890ff" : "#f0f0f0"}`,
            borderRadius: 8, cursor: "pointer", background: mode === "new_folder" ? "#e6f7ff" : "#fafafa",
            transition: "0.2s",
          },
        },
          React.createElement("div", { style: { fontWeight: 600, color: mode === "new_folder" ? "#1890ff" : "#262626" } },
            "📂 Chọn folder đích mới"),
          React.createElement("div", { style: { fontSize: 12, color: "#8c8c8c", marginTop: 4 } },
            "Đặt file vào một thư mục đang tồn tại."),
          mode === "new_folder" && React.createElement("div", { style: { marginTop: 10 }, onClick: (e) => e.stopPropagation() },
            React.createElement(TreeSelect, {
              style: { width: "100%", fontFamily: FONT },
              treeData: [{ title: "Home (Root)", value: "root", children: buildTreeForSelect(allLiveFolders) }],
              value: targetFolderId,
              onChange: setTargetFolderId,
              treeDefaultExpandAll: true,
              placeholder: "Chọn thư mục đích",
            }),
          ),
        ),

        React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 } },
          React.createElement(Button, { onClick: onClose, style: { fontFamily: FONT } }, "Hủy"),
          React.createElement(Button, {
            type: "primary", disabled: !mode,
            onClick: () => {
              if (mode === "ancestors") onRestoreWithAncestors(record, parentFolder);
              else onRestoreWithNewFolder(record, targetFolderId);
            },
            style: { fontFamily: FONT },
          }, "Xác nhận khôi phục"),
        ),
      ),
    ),
  );
};

// ==================== MAIN COMPONENT ====================
const DocumentRestore = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      let user = getCurrentUser();
      if (!user) {
        try { const r = await ctx.api.request({ url: "auth:check" }); user = r?.data?.data || r?.data || null; } catch {}
      }
      setCurrentUser(user);
      setUserLoading(false);
    };
    init();
  }, []);

  const { deletedDocs, deletedFolders, allFolders, loading, refetch } = useDeletedData(currentUser);

  // UI state
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState("all"); // "all" | "file" | "folder"
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);
  // Folder content modal (cascade restore picker)
  const [folderContentModal, setFolderContentModal] = useState(null); // folder record
  // Conflict modal (parent folder also deleted)
  const [conflictModal, setConflictModal] = useState(null); // { record, parentFolder }

  const isAdmin = isAdminUser(currentUser);
  const currentUserId = extractId(currentUser?.id);

  // Folders the current user can access (for TreeSelect in conflict modal)
  const accessibleFolders = useMemo(() => {
    if (isAdmin) return allFolders;
    return allFolders.filter((folder) => {
      const managers = folder.folderManager || folder.folderManagers || [];
      const members = folder.folderMember || folder.folderMembers || [];
      const uid = String(currentUserId);
      const inManagers = managers.some((m) => {
        const id = m?.id !== undefined ? m.id : m;
        return String(extractId(id)) === uid;
      });
      const inMembers = members.some((m) => {
        const id = m?.id !== undefined ? m.id : m;
        return String(extractId(id)) === uid;
      });
      return inManagers || inMembers;
    });
  }, [allFolders, isAdmin, currentUserId]);

  // Build folder path string from allFolders (live folders)
  const getFolderPath = useCallback((folderId) => {
    if (!folderId) return "Root";
    const parts = [];
    let id = extractId(folderId);
    let safety = 0;
    while (id && safety < 10) {
      const f = allFolders.find((x) => extractId(x.id) === id);
      if (!f) break;
      parts.unshift(f.name);
      id = extractId(f.parentId);
      safety++;
    }
    return parts.length > 0 ? parts.join(" / ") : "Root";
  }, [allFolders]);

  // Build deleted folder path (using deletedFolders)
  const getDeletedFolderPath = useCallback((folderId, deletedFoldersArr) => {
    if (!folderId) return "Root";
    const parts = [];
    let id = extractId(folderId);
    let safety = 0;
    while (id && safety < 10) {
      const f = [...allFolders, ...deletedFoldersArr].find((x) => extractId(x.id) === id);
      if (!f) break;
      parts.unshift(f.name);
      id = extractId(f.parentId);
      safety++;
    }
    return parts.length > 0 ? parts.join(" / ") : "Root";
  }, [allFolders]);

  // Combine docs + folders into flat list for table
  const tableData = useMemo(() => {
    const lowerSearch = searchText.toLowerCase();
    let rows = [];

    // File rows
    if (filterType !== "folder") {
      let docs = deletedDocs.map((d) => ({
        ...d, _type: "file", _key: `file_${extractId(d.id)}`,
      }));
      if (lowerSearch) {
        docs = docs.filter((d) => {
          const att = Array.isArray(d.fileAttachment) ? d.fileAttachment[0] : d.fileAttachment;
          const name = d.title || att?.title || att?.filename || "";
          return name.toLowerCase().includes(lowerSearch) ||
            (d.documentType || "").toLowerCase().includes(lowerSearch) ||
            (d.documentCode || "").toLowerCase().includes(lowerSearch);
        });
      }
      rows = [...rows, ...docs];
    }

    // Folder rows (admin only)
    if (isAdmin && filterType !== "file") {
      let folders = deletedFolders.map((f) => ({
        ...f, _type: "folder", _key: `folder_${extractId(f.id)}`,
      }));
      if (lowerSearch) {
        folders = folders.filter((f) => (f.name || "").toLowerCase().includes(lowerSearch));
      }
      rows = [...rows, ...folders];
    }

    // Sort by updatedAt desc (most recently deleted first)
    return rows.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }, [deletedDocs, deletedFolders, searchText, filterType, isAdmin]);

  // ---- RESTORE LOGIC ----
  const doRestoreDoc = async (docId, newFolderId = undefined) => {
    const payload = { isDeleted: false, updatedAt: new Date().toISOString() };
    if (newFolderId !== undefined) payload.folderId = newFolderId === "root" ? null : parseInt(newFolderId, 10);
    await ctx.api.request({ url: `documents:update?filterByTk=${docId}`, method: "POST", data: payload });
  };

  const doRestoreFolder = async (folderId) => {
    await ctx.api.request({ url: `folders:update?filterByTk=${folderId}`, method: "POST",
      data: { isDeleted: false, updatedAt: new Date().toISOString() } });
  };

  const handleRestoreItem = async (record) => {
    try {
      if (record._type === "folder") {
        // Open folder content modal for cascade selection
        setFolderContentModal(record);
        return;
      }

      // File restore: check if parent folder is alive
      const fId = extractId(record.folderId);
      if (!fId) {
        // No parent folder → restore to root directly
        await doRestoreDoc(extractId(record.id));
        message.success("Đã khôi phục file về Root");
        refetch();
        return;
      }

      // Check if parent folder exists in live folders
      const parentAlive = allFolders.find((f) => extractId(f.id) === fId);
      if (parentAlive) {
        await doRestoreDoc(extractId(record.id));
        message.success(`Đã khôi phục file về thư mục "${parentAlive.name}"`);
        refetch();
        return;
      }

      // Parent folder is also deleted → try to resolve name
      let parentFolder = deletedFolders.find((f) => extractId(f.id) === fId);
      if (!parentFolder) {
        // Not in cache (non-admin or hard-deleted) → fetch by ID directly
        try {
          const res = await ctx.api.request({
            url: "folders:list",
            params: {
              filter: JSON.stringify({ id: { $eq: fId } }),
              pageSize: 1,
            },
          });
          parentFolder = res?.data?.data?.[0] || null;
        } catch {}
      }
      setConflictModal({
        record,
        parentFolder: parentFolder || { id: fId, name: `Thư mục #${fId}` },
      });
    } catch (e) {
      message.error("Khôi phục thất bại: " + (e?.message || "Lỗi không xác định"));
    }
  };

  // Restore ancestors chain then restore file
  const handleRestoreWithAncestors = async (record, parentFolder) => {
    setConflictModal(null);
    try {
      // Traverse ancestor chain (deletedFolders + allFolders) and restore each
      const toRestore = [];
      let id = extractId(parentFolder?.id);
      let safety = 0;
      while (id && safety < 10) {
        const df = deletedFolders.find((f) => extractId(f.id) === id);
        if (!df) break;
        toRestore.unshift(id);
        id = extractId(df.parentId);
        safety++;
      }
      // Restore folders from root to leaf
      for (const fId of toRestore) await doRestoreFolder(fId);

      // Then restore the file
      await doRestoreDoc(extractId(record.id));
      message.success("Đã khôi phục thư mục cha và file thành công");
      refetch();
    } catch (e) {
      message.error("Khôi phục thất bại");
    }
  };

  // Restore file to a new target folder
  const handleRestoreWithNewFolder = async (record, targetFolderId) => {
    setConflictModal(null);
    try {
      await doRestoreDoc(extractId(record.id), targetFolderId);
      message.success("Đã khôi phục file vào thư mục mới");
      refetch();
    } catch (e) {
      message.error("Khôi phục thất bại");
    }
  };

  // Folder content modal confirm: restore folder + selected files
  const handleFolderRestoreConfirm = async (folder, selectedFileIds) => {
    setFolderContentModal(null);
    try {
      // Check folder's parent
      const fId = extractId(folder.id);
      const parentId = extractId(folder.parentId);
      const parentAlive = parentId ? allFolders.find((f) => extractId(f.id) === parentId) : true;

      if (!parentAlive && parentId) {
        // Parent also deleted → restore ancestors first
        await handleRestoreWithAncestors({ _type: "folder" }, { id: parentId });
      }

      // Restore the folder itself
      await doRestoreFolder(fId);

      // Restore selected files
      await Promise.all(selectedFileIds.map((id) => doRestoreDoc(id)));

      message.success(`Đã khôi phục thư mục "${folder.name}" và ${selectedFileIds.length} file`);
      refetch();
    } catch (e) {
      message.error("Khôi phục thất bại");
    }
  };

  // Permanent delete (admin only)
  const handlePermanentDelete = async (record) => {
    try {
      if (record._type === "folder") {
        await ctx.api.request({ url: `folders:destroy?filterByTk=${extractId(record.id)}`, method: "POST" });
      } else {
        await ctx.api.request({ url: `documents:destroy?filterByTk=${extractId(record.id)}`, method: "POST" });
      }
      message.success("Đã xóa vĩnh viễn");
      refetch();
    } catch { message.error("Xóa vĩnh viễn thất bại"); }
  };

  const handleBulkRestore = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      for (const key of selectedRowKeys) {
        const record = tableData.find((r) => r._key === key);
        if (record) await handleRestoreItem(record);
      }
      setSelectedRowKeys([]);
    } catch { message.error("Có lỗi trong quá trình khôi phục hàng loạt"); }
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      await Promise.all(selectedRowKeys.map(async (key) => {
        const record = tableData.find((r) => r._key === key);
        if (!record) return;
        if (record._type === "folder") {
          await ctx.api.request({ url: `folders:destroy?filterByTk=${extractId(record.id)}`, method: "POST" });
        } else {
          await ctx.api.request({ url: `documents:destroy?filterByTk=${extractId(record.id)}`, method: "POST" });
        }
      }));
      message.success(`Đã xóa vĩnh viễn ${selectedRowKeys.length} mục`);
      setSelectedRowKeys([]);
      refetch();
    } catch { message.error("Có lỗi xảy ra"); }
  };

  // ---- CONTEXT MENU STATE ----
  const [ctxMenu, setCtxMenu] = useState({ visible: false, x: 0, y: 0, record: null });

  const closeCtxMenu = () => setCtxMenu((m) => ({ ...m, visible: false }));

  const getCtxMenuItems = (r) => {
    const isFile = r._type === "file";
    const att = isFile ? (Array.isArray(r.fileAttachment) ? r.fileAttachment[0] : r.fileAttachment) : null;
    const fullUrl = att ? getFullUrl(att.url || att.preview) : null;
    return [
      isFile && {
        key: "preview",
        label: React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 8, fontFamily: FONT } },
          EyeIcon, "Xem trước"),
        disabled: !fullUrl,
      },
      {
        key: "restore",
        label: React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 8, fontFamily: FONT, color: "#1890ff" } },
          RestoreIcon, "Khôi phục về vị trí gốc"),
      },
      isAdmin && { type: "divider" },
      isAdmin && {
        key: "delete",
        label: React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: 8, fontFamily: FONT, color: "#ff4d4f" } },
          DeleteIcon, "Xóa vĩnh viễn"),
        danger: true,
      },
    ].filter(Boolean);
  };

  const handleCtxMenuClick = ({ key }) => {
    const r = ctxMenu.record;
    closeCtxMenu();
    if (!r) return;
    if (key === "preview") { setPreviewDoc(r); return; }
    if (key === "restore") { handleRestoreItem(r); return; }
    if (key === "delete") {
      Modal.confirm({
        title: "Xóa vĩnh viễn?",
        content: React.createElement("span", { style: { fontFamily: FONT } },
          "Hành động này không thể hoàn tác. Bạn có chắc muốn xóa vĩnh viễn ",
          React.createElement("strong", null, r._type === "folder" ? r.name : (r.title || "file này")),
          "?"
        ),
        okText: "Xóa vĩnh viễn", okType: "danger", cancelText: "Hủy",
        onOk: () => handlePermanentDelete(r),
      });
    }
  };

  // ---- TABLE COLUMNS ----
  const columns = [
    {
      title: React.createElement("span", { style: { fontFamily: FONT } }, "Loại"),
      key: "type", width: 90, align: "center",
      render: (_, r) => r._type === "folder"
        ? React.createElement(Tag, { color: "gold", style: { fontFamily: FONT, fontSize: 11 } },
            iconLabel(FolderIcon, "Thư mục"))
        : React.createElement(Tag, { color: "blue", style: { fontFamily: FONT, fontSize: 11 } },
            iconLabel(FileIcon, "File")),
    },
    {
      title: React.createElement("span", { style: { fontFamily: FONT } }, "Tên / Tiêu đề"),
      key: "name", width: 260,
      render: (_, r) => {
        if (r._type === "folder") {
          return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
            React.createElement("span", { style: { color: "#8c6d1f" } }, FolderIcon),
            React.createElement(Text, { strong: true, style: { fontFamily: FONT, fontSize: 13 } }, r.name || "—"),
          );
        }
        const att = Array.isArray(r.fileAttachment) ? r.fileAttachment[0] : r.fileAttachment;
        let ext = att?.extname ? (att.extname.startsWith(".") ? att.extname.toLowerCase() : "." + att.extname.toLowerCase()) : "";
        const name = r.title || att?.title || att?.filename || "Tài liệu";
        const extInfo = getExtInfo(ext);
        return React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
          React.createElement("div", {
            style: { minWidth: 34, height: 26, borderRadius: 4, background: extInfo.bg,
              border: `1px solid ${extInfo.color}40`, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 9, fontWeight: 700, color: extInfo.color, flexShrink: 0, cursor: "pointer" },
            onClick: () => setPreviewDoc(r),
          }, ext.replace(".", "").toUpperCase().slice(0, 4) || "FILE"),
          React.createElement("div", { style: { flex: 1, minWidth: 0 } },
            React.createElement("div", {
              style: { fontWeight: 500, fontFamily: FONT, fontSize: 13, color: "#1890ff",
                wordBreak: "break-word", whiteSpace: "normal", cursor: "pointer", lineHeight: 1.4 },
              onClick: () => setPreviewDoc(r),
            }, name),
          ),
        );
      },
    },
    {
      title: React.createElement("span", { style: { fontFamily: FONT } }, "Đường dẫn gốc"),
      key: "path", width: 200,
      render: (_, r) => {
        const path = r._type === "folder"
          ? getDeletedFolderPath(extractId(r.parentId), deletedFolders)
          : getDeletedFolderPath(extractId(r.folderId), deletedFolders);
        return React.createElement(Tooltip, { title: path },
          React.createElement(Text, {
            style: { fontSize: 11, color: "#8c8c8c", fontFamily: FONT,
              display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
          }, path),
        );
      },
    },

    {
      title: React.createElement("span", { style: { fontFamily: FONT } }, "Ngày xóa"),
      key: "deletedAt", width: 140, align: "center",
      sorter: (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
      defaultSortOrder: "descend",
      render: (_, r) => React.createElement("div", null,
        React.createElement(Text, { style: { fontSize: 12, color: "#ff4d4f", fontFamily: FONT } },
          formatDateTime(r.updatedAt)),
      ),
    },
    {
      title: React.createElement("span", { style: { fontFamily: FONT } }, "Người xóa"),
      key: "deletedBy", width: 120,
      render: (_, r) => {
        const who = getUserName(r.updatedBy) || r.updatedBy?.email || "—";
        return React.createElement(Text, { style: { fontSize: 12, color: "#595959", fontFamily: FONT } }, who);
      },
    },
    {
      title: React.createElement("span", { style: { fontFamily: FONT } }, "Dung lượng"),
      key: "size", width: 100, align: "center",
      render: (_, r) => {
        if (r._type === "folder") return React.createElement(Text, { style: { color: "#bfbfbf" } }, "—");
        const att = Array.isArray(r.fileAttachment) ? r.fileAttachment[0] : r.fileAttachment;
        return React.createElement(Text, { style: { fontSize: 12, color: "#595959", fontFamily: FONT } }, formatBytes(att?.size));
      },
    },
    {
      title: React.createElement("span", { style: { fontFamily: FONT } }, "Thao tác"),
      key: "actions", width: 90, fixed: "right", align: "center",
      render: (_, r) => React.createElement(Space, { size: 6 },
        React.createElement(Tooltip, { title: "Khôi phục về vị trí gốc" },
          React.createElement(Button, {
            type: "text", size: "small",
            onClick: (e) => { e.stopPropagation(); handleRestoreItem(r); },
            style: { color: "#1890ff", padding: "0 4px", display: "inline-flex", alignItems: "center" },
          }, RestoreIcon),
        ),
        isAdmin && React.createElement(Popconfirm, {
          title: "Xóa vĩnh viễn? Hành động này không thể hoàn tác.",
          okText: "Xóa vĩnh viễn", okType: "danger", cancelText: "Hủy",
          onConfirm: () => handlePermanentDelete(r),
        },
          React.createElement(Tooltip, { title: "Xóa vĩnh viễn khỏi hệ thống" },
            React.createElement(Button, {
              type: "text", size: "small",
              onClick: (e) => e.stopPropagation(),
              style: { color: "#ff4d4f", padding: "0 4px", display: "inline-flex", alignItems: "center" },
            }, DeleteIcon),
          ),
        ),
      ),
    },
  ];

  // Table onRow — right-click context menu
  const onRow = (record) => ({
    onContextMenu: (e) => {
      e.preventDefault();
      e.stopPropagation();
      setCtxMenu({ visible: true, x: e.clientX, y: e.clientY, record });
    },
  });

  if (userLoading) return React.createElement(Spin, { style: { display: "block", margin: "80px auto" } });

  // ---- RENDER ----
  return React.createElement("div", { style: { fontFamily: FONT, padding: "16px 24px", minHeight: "calc(100vh - 120px)", background: "#fff" } },

    // Toolbar
    React.createElement("div", {
      style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" },
    },
      React.createElement(Input, {
        placeholder: "Tìm theo tên file, thư mục...",
        prefix: SearchIcon,
        value: searchText,
        onChange: (e) => setSearchText(e.target.value),
        allowClear: true,
        style: { width: 260, fontFamily: FONT },
      }),
      isAdmin && React.createElement(Select, {
        value: filterType,
        onChange: setFilterType,
        style: { width: 140, fontFamily: FONT },
        options: [
          { value: "all", label: "Tất cả" },
          { value: "file", label: "Chỉ File" },
          { value: "folder", label: "Chỉ Thư mục" },
        ],
      }),
      React.createElement(Button, {
        onClick: refetch, loading: loading,
        style: { fontFamily: FONT, display: "inline-flex", alignItems: "center", gap: 6 },
      }, iconLabel(RefreshIcon, "Làm mới")),
      selectedRowKeys.length > 0 && React.createElement(Space, { size: 6 },
        React.createElement(Text, { style: { fontSize: 12, color: "#8c8c8c", fontFamily: FONT } },
          `Đã chọn ${selectedRowKeys.length} mục`),
        React.createElement(Tooltip, { title: `Khôi phục ${selectedRowKeys.length} mục đã chọn` },
          React.createElement(Button, {
            type: "primary", size: "small", ghost: true,
            onClick: handleBulkRestore,
            style: { fontFamily: FONT, display: "inline-flex", alignItems: "center", gap: 4 },
          }, iconLabel(RestoreIcon, `Khôi phục (${selectedRowKeys.length})`)),
        ),
        isAdmin && React.createElement(Popconfirm, {
          title: `Xóa vĩnh viễn ${selectedRowKeys.length} mục đã chọn?`,
          okText: "Xóa vĩnh viễn", okType: "danger", cancelText: "Hủy",
          onConfirm: handleBulkPermanentDelete,
        },
          React.createElement(Button, { danger: true, size: "small", style: { fontFamily: FONT, display: "inline-flex", alignItems: "center", gap: 4 } },
            iconLabel(DeleteIcon, `Xóa vĩnh viễn (${selectedRowKeys.length})`)),
        ),
        React.createElement(Button, { size: "small", onClick: () => setSelectedRowKeys([]), style: { fontFamily: FONT } }, "Bỏ chọn"),
      ),
    ),

    // Note for non-admin
    !isAdmin && React.createElement("div", {
      style: { background: "#fffbe6", border: "1px solid #ffe58f", borderRadius: 6, padding: "8px 14px", marginBottom: 14, fontSize: 12, fontFamily: FONT, color: "#8c6d14" },
    }, "ℹ️ Bạn chỉ thấy file của mình. Chức năng xóa vĩnh viễn chỉ dành cho Quản trị viên."),

    // Table
    React.createElement(Table, {
      dataSource: tableData,
      columns,
      rowKey: (r) => r._key,
      loading,
      size: "small",
      scroll: { x: 900 },
      onRow,
      pagination: { pageSize: 50, showSizeChanger: true, showTotal: (t) => `${t} mục`, style: { fontFamily: FONT } },
      rowSelection: {
        selectedRowKeys,
        onChange: setSelectedRowKeys,
      },
      rowClassName: (_, idx) => idx % 2 === 1 ? "restore-row-alt" : "",
      style: { fontFamily: FONT },
      locale: {
        emptyText: React.createElement(Empty, {
          image: Empty.PRESENTED_IMAGE_SIMPLE,
          description: React.createElement("span", { style: { fontFamily: FONT, color: "#8c8c8c" } },
            "Thùng rác trống — không có file hay thư mục nào bị xóa"),
        }),
      },
    }),

    // Modals
    React.createElement(PreviewModal, { doc: previewDoc, onClose: () => setPreviewDoc(null) }),
    React.createElement(FolderContentModal, {
      open: !!folderContentModal,
      folder: folderContentModal,
      onClose: () => setFolderContentModal(null),
      onConfirmRestore: handleFolderRestoreConfirm,
      currentUser,
    }),
    React.createElement(RestoreConflictModal, {
      open: !!conflictModal,
      record: conflictModal?.record,
      parentFolder: conflictModal?.parentFolder,
      allLiveFolders: accessibleFolders,
      onClose: () => setConflictModal(null),
      onRestoreWithNewFolder: handleRestoreWithNewFolder,
      onRestoreWithAncestors: handleRestoreWithAncestors,
    }),

    // Right-click context menu
    ctxMenu.visible && React.createElement(
      React.Fragment,
      null,
      // Backdrop to close
      React.createElement("div", {
        style: { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 999 },
        onClick: closeCtxMenu,
        onContextMenu: (e) => { e.preventDefault(); closeCtxMenu(); },
      }),
      // Menu
      React.createElement("div", {
        style: {
          position: "fixed", top: ctxMenu.y, left: ctxMenu.x, zIndex: 1000,
          background: "#fff", borderRadius: 8, boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
          minWidth: 210, padding: "4px 0", fontFamily: FONT,
          border: "1px solid #f0f0f0",
        },
      },
        ctxMenu.record && getCtxMenuItems(ctxMenu.record).map((item, idx) =>
          item.type === "divider"
            ? React.createElement("div", { key: idx, style: { height: 1, background: "#f0f0f0", margin: "4px 0" } })
            : React.createElement("div", {
                key: item.key,
                onClick: () => handleCtxMenuClick({ key: item.key }),
                style: {
                  padding: "8px 16px", cursor: item.disabled ? "not-allowed" : "pointer",
                  opacity: item.disabled ? 0.4 : 1,
                  fontSize: 13, color: item.danger ? "#ff4d4f" : "#262626",
                  transition: "background 0.15s",
                  userSelect: "none",
                },
                onMouseEnter: (e) => { if (!item.disabled) e.currentTarget.style.background = "#f5f5f5"; },
                onMouseLeave: (e) => { e.currentTarget.style.background = "transparent"; },
              }, item.label)
        ),
      ),
    ),

    // CSS
    React.createElement("style", null, `
      .restore-row-alt td { background: #fafbfc !important; }
      .ant-table-thead > tr > th { background: #f5f7fa !important; font-weight: 600 !important; color: #595959 !important; }
    `),
  );
};

ctx.render(React.createElement(DocumentRestore));

