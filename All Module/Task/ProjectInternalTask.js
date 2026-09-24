// ============================================================
// §1 CONFIG — không import, không side-effect
// ============================================================
const { React } = ctx;
const { useState, useEffect, useCallback, useMemo, useRef } = React;
const {
  Spin,
  Typography,
  message,
  Modal,
  Button,
  Tooltip,
  Empty,
} = ctx.antd;
const { Text } = Typography;

const PROJECT_ID = ctx.record?.id;
const PROJECT_INTERNAL_DOCUMENT_SCOPE = "project_internal";
const PROJECT_INTERNAL_STORAGE_TYPE = "project_internal";
const FONT =
  "Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const COL = {
  stt: 38,
  toggle: 24,
  updatedAt: 125,
  desc: 190,
  nextStep: 155,
  start: 88,
  deadline: 88,
  assign: 150,
  approval: 28,
  menu: 32,
  pendingIssue: 148,
  files: 72,
};

const DeleteIcon = () =>
  React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: "14",
      height: "14",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: {
        flexShrink: 0,
        display: "inline-flex",
        verticalAlign: "middle",
        pointerEvents: "none",
      },
    },
    React.createElement("polyline", { points: "3 6 5 6 21 6" }),
    React.createElement("path", {
      d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    }),
    React.createElement("line", { x1: "10", y1: "11", x2: "10", y2: "17" }),
    React.createElement("line", { x1: "14", y1: "11", x2: "14", y2: "17" }),
  );
const EditIcon = () =>
  React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: "12",
      height: "12",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: {
        flexShrink: 0,
        display: "inline-flex",
        verticalAlign: "middle",
        pointerEvents: "none",
      },
    },
    React.createElement("path", {
      d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",
    }),
    React.createElement("path", {
      d: "M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z",
    }),
  );
const originURL = window.location.origin;
// 🌟 CONFIG URL DEEP-LINK CHO BÌNH LUẬN (Gán cứng các UID Route để dễ bảo trì)
const DEEP_LINK_CONFIG = {
  buildUrl: (taskId, projectInternalId) => {
    const origin = window.location.origin;
    const pathname = window.location.pathname || "";
    const cleanPath = pathname.split("/view/a5c9c251a6a")[0];
    return `${origin}${cleanPath}/view/a5c9c251a6a/filterbytk/${taskId}/sourceid/${projectInternalId}`;
  },
};

const STATUS_CFG = {
  toDo: {
    label: "Not Start",
    color: "#595959",
    bg: "#f5f5f5",
    border: "#d9d9d9",
  },
  inProgress: {
    label: "In Progress",
    color: "#1890ff",
    bg: "#e6f4ff",
    border: "#91caff",
  },
  blocked: {
    label: "Blocked",
    color: "#722ed1",
    bg: "#f9f0ff",
    border: "#d3adf7",
  },
  pending: {
    label: "Pending approval",
    color: "#d46b08",
    bg: "#fff7e6",
    border: "#ffd591",
  },
  approval: {
    label: "Approved",
    color: "#389e0d",
    bg: "#f6ffed",
    border: "#b7eb8f",
  },
  done: {
    label: "Done",
    color: "#389e0d",
    bg: "#f6ffed",
    border: "#b7eb8f",
  },
  cancelled: {
    label: "Cancelled",
    color: "#cf1322",
    bg: "#fff1f0",
    border: "#ffa39e",
  },
};

const STATUS_KEYS_WITH_APPROVAL = [
  "toDo",
  "inProgress",
  "blocked",
  "pending",
  "approval",
  "done",
  "cancelled",
];
const STATUS_KEYS_WITHOUT_APPROVAL = [
  "toDo",
  "inProgress",
  "blocked",
  "done",
  "cancelled",
];
const getStatusKeys = (isRequiredApproval) =>
  isRequiredApproval ? STATUS_KEYS_WITH_APPROVAL : STATUS_KEYS_WITHOUT_APPROVAL;
const PRIORITY_CFG = {
  high: { label: "High", color: "#cf1322", bg: "#fff1f0", icon: "↑↑" },
  medium: { label: "Medium", color: "#d46b08", bg: "#fff7e6", icon: "↑" },
  low: { label: "Low", color: "#389e0d", bg: "#f6ffed", icon: "↓" },
};

const LAWYER_COLORS = [
  "#531dab",
  "#096dd9",
  "#08979c",
  "#237804",
  "#d46b08",
  "#9e1068",
  "#a8071a",
  "#003a8c",
];
const LAWYER_TYPE_CFG = {
  partner: { label: "Partner", color: "#531dab", bg: "#f9f0ff" },
  lawyer: { label: "Lawyer", color: "#096dd9", bg: "#e6f4ff" },
  associate: { label: "Associate", color: "#08979c", bg: "#e6fffb" },
  suppliant: { label: "Legal Assistant", color: "#d46b08", bg: "#fff7e6" },
};

const FILE_EXT_ICON = {
  ".pdf": { icon: "📄", color: "#ff4d4f", bg: "#fff2f0" },
  ".doc": { icon: "📝", color: "#1890ff", bg: "#e6f7ff" },
  ".docx": { icon: "📝", color: "#1890ff", bg: "#e6f7ff" },
  ".xls": { icon: "📊", color: "#52c41a", bg: "#f6ffed" },
  ".xlsx": { icon: "📊", color: "#52c41a", bg: "#f6ffed" },
  ".png": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
  ".jpg": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
  ".jpeg": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
  ".gif": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
  ".webp": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
};

const SERVICE_COLORS = [
  { bg: "#e6f4ff", border: "#91caff", text: "#096dd9", dot: "#1890ff" },
  { bg: "#f9f0ff", border: "#d3adf7", text: "#531dab", dot: "#722ed1" },
  { bg: "#e6fffb", border: "#87e8de", text: "#006d75", dot: "#13c2c2" },
  { bg: "#fff7e6", border: "#ffd591", text: "#d46b08", dot: "#fa8c16" },
  { bg: "#f6ffed", border: "#b7eb8f", text: "#237804", dot: "#52c41a" },
  { bg: "#fff1f0", border: "#ffa39e", text: "#a8071a", dot: "#f5222d" },
  { bg: "#fcffe6", border: "#eaff8f", text: "#5b8c00", dot: "#a0d911" },
  { bg: "#fff0f6", border: "#ffadd2", text: "#9e1068", dot: "#eb2f96" },
];

// ============================================================
// §2 UTILS
// ============================================================
// 🌟 HÀM EXTRACT ID AN TOÀN TUYỆT ĐỐI (Xử lý cả mảng, object, string)
const extractId = (val) => {
  if (val === null || val === undefined || val === "") return null;
  if (Array.isArray(val)) return val.length > 0 ? extractId(val[0]) : null;
  if (typeof val === "object") return val.id ? parseInt(val.id, 10) : null;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
};

const getPathSegmentId = (segmentName) => {
  const segments = (window.location?.pathname || "").split("/");
  for (let i = 0; i < segments.length; i++) {
    if (segments[i] === segmentName && segments[i + 1]) {
      return extractId(segments[i + 1]);
    }
  }
  return null;
};

const getDeepLinkCaseId = (fallbackCaseId) =>
  extractId(fallbackCaseId) ||
  getPathSegmentId("sourceid") ||
  extractId(PROJECT_ID) ||
  extractId(ctx.record?.id) ||
  getPathSegmentId("filterbytk");

const getCurrentPathUrl = () =>
  [window.location.origin, window.location.pathname].join("");

const buildTaskLinkedUrl = (item, type = "task", fallbackCaseId = null) => {
  const source = item && typeof item === "object" ? item : { id: item };
  const taskId =
    type === "subTask" ? extractId(source.taskId) : extractId(source.id);
  const caseId = getDeepLinkCaseId(
    fallbackCaseId || source.caseId || source.projectInternalId,
  );

  if (taskId && caseId) return DEEP_LINK_CONFIG.buildUrl(taskId, caseId);
  return getCurrentPathUrl();
};

const withTaskLinkedUrl = (
  payload,
  item,
  type = "task",
  fallbackCaseId = null,
) => ({
  ...payload,
  linkedUrl: buildTaskLinkedUrl(item, type, fallbackCaseId),
});

const fmt = (iso, mode) => {
  if (!iso) return null;
  const d = new Date(iso);
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const yy = d.getFullYear();
  const hh = d.getHours().toString().padStart(2, "0");
  const mi = d.getMinutes().toString().padStart(2, "0");
  if (mode === "full") return `${dd}/${mm}/${yy} ${hh}:${mi}`;
  if (mode === "date") return `${dd}/${mm}/${yy}`;
  return `${dd}/${mm}`;
};

const isOD = (iso, st) =>
  iso && st !== "done" && st !== "cancelled" && new Date(iso) < new Date();
const isToday = (iso) => {
  if (!iso) return false;
  const d = new Date(iso),
    n = new Date();
  return (
    d.getDate() === n.getDate() &&
    d.getMonth() === n.getMonth() &&
    d.getFullYear() === n.getFullYear()
  );
};

const userName = (u) =>
  u?.nickname ||
  `${u?.firstName || ""} ${u?.lastName || ""}`.trim() ||
  u?.username ||
  u?.email ||
  null;
const getFullUrl = (url) =>
  !url
    ? null
    : url.startsWith("http")
      ? url
      : `${window.location.origin}${url}`;
const getExtInfo = (ext) =>
  FILE_EXT_ICON[(ext || "").toLowerCase()] || {
    icon: "📎",
    color: "#8c8c8c",
    bg: "#fafafa",
  };
async function apiReq(url, method, data) {
  return ctx.api.request({ url, method: method || "POST", data });
}
async function fetchAll(url, fields, filter) {
  try {
    const params = { pageSize: 500, page: 1 };
    if (fields) params.fields = fields;
    if (filter) params.filter = JSON.stringify(filter);
    const res = await ctx.api.request({ url, params });
    return res?.data?.data || [];
  } catch {
    return [];
  }
}
async function getCurrentUser() {
  try {
    const r = await ctx.api.request({ url: "auth:check", method: "GET" });
    return r?.data?.data || r?.data || null;
  } catch {
    return null;
  }
}
const DOCUMENT_FILE_FIELDS =
  "id,title,documentCode,documentType,batchId,collectionName,sourceCollectionName,sourceTaskId,sourceRecordId,googleDriveUrl,note,createdAt,updatedAt,createdById,isDeleted,folderId,caseId,taskId,subTaskId,moduleScope,storageType";

function normalizeDocumentCollectionName(collectionName) {
  const raw = String(collectionName || "").trim();
  const lower = raw.toLowerCase();
  if (lower === "tasks" || lower === "task") return "Task";
  if (lower === "subtasks" || lower === "subtask") return "SubTask";
  if (
    ["projectinternal", "project internal", "project_internal"].includes(lower)
  )
    return "Project Internal";
  return raw || collectionName;
}

function getDocumentTaskId(doc) {
  return (
    extractId(doc?.taskId) ||
    extractId(doc?.task) ||
    extractId(doc?.sourceTaskId) ||
    (normalizeDocumentCollectionName(doc?.sourceCollectionName) === "Task"
      ? extractId(doc?.sourceRecordId)
      : null)
  );
}

function filterTaskDocumentsByIds(
  files,
  taskIds,
  moduleScope = null,
  storageType = null,
) {
  const idSet = new Set(
    (taskIds || []).map((id) => String(extractId(id))).filter(Boolean),
  );
  return (files || []).filter((file) => {
    const taskId = getDocumentTaskId(file);
    if (!taskId || !idSet.has(String(taskId))) return false;
    if (moduleScope && file.moduleScope && file.moduleScope !== moduleScope)
      return false;
    if (storageType && file.storageType && file.storageType !== storageType)
      return false;
    return true;
  });
}

async function fetchTaskDocumentsByIds(taskIds, extraFilters = []) {
  const safeTaskIds = (taskIds || []).map(extractId).filter(Boolean);
  if (!safeTaskIds.length) return [];
  const baseFilters = [
    { collectionName: { $eq: "Task" } },
    ...extraFilters,
    { isDeleted: { $ne: true } },
  ];
  const filterAttempts = [
    {
      $and: [
        ...baseFilters,
        {
          $or: [
            { taskId: { $in: safeTaskIds } },
            { sourceTaskId: { $in: safeTaskIds } },
            { sourceRecordId: { $in: safeTaskIds } },
          ],
        },
      ],
    },
    { $and: [...baseFilters, { taskId: { $in: safeTaskIds } }] },
    { $and: [...baseFilters, { sourceTaskId: { $in: safeTaskIds } }] },
    { $and: [...baseFilters, { sourceRecordId: { $in: safeTaskIds } }] },
    { $and: baseFilters },
  ];

  for (const filter of filterAttempts) {
    try {
      const res = await ctx.api.request({
        url: "documents:list",
        params: {
          pageSize: 2000,
          filter: JSON.stringify(filter),
          fields: DOCUMENT_FILE_FIELDS,
          appends: ["fileAttachment", "createdBy", "updatedBy"],
        },
      });
      const files = filterTaskDocumentsByIds(
        res?.data?.data || [],
        safeTaskIds,
        PROJECT_INTERNAL_DOCUMENT_SCOPE,
        PROJECT_INTERNAL_STORAGE_TYPE,
      );
      if (
        files.length ||
        filter === filterAttempts[filterAttempts.length - 1]
      ) {
        return files;
      }
    } catch {}
  }
  return [];
}

async function logActivity(
  collectionName,
  recordId,
  action,
  fieldName,
  oldValue,
  newValue,
  changedByName,
  batchId,
  dataId = null,
  timestamp = null,
) {
  try {
    const now = timestamp || new Date().toISOString();
    await apiReq("activity_log:create", "POST", {
      collectionName,
      recordId,
      action,
      fieldName,
      oldValue: oldValue ? String(oldValue) : null,
      newValue: newValue ? String(newValue) : null,
      changedByName: changedByName || "System",
      changedAt: now,
      createdAt: now, // 🌟 Đồng bộ createdAt
      batchId: batchId || null,
      dataId: dataId || null,
    });
  } catch {}
}

const isAdminUser = (user) => {
  if (!user) return false;
  const role = user?.roles?.[0]?.name || user?.role || user?.systemRole || "";
  return (
    role === "admin" ||
    role === "root" ||
    user?.isAdmin === true ||
    user?.isSuperAdmin === true
  );
};

const resolveStatus = (newStatus, item) => {
  if (newStatus === "done" && item?.isRequiredApproval) return "pending";
  if (newStatus === "approval") return "done";
  return newStatus;
};

// ============================================================
// §5 ATOMS
// ============================================================

const ReloadButton = ({ onReload, loading, text = "Refresh", style = {} }) => {
  return React.createElement(
    Button,
    {
      size: "medium",
      onClick: onReload,
      loading: loading,
      style: {
        padding: "5px 16px",
        fontFamily: FONT,
        fontSize: 12,
        borderRadius: 4,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      },
    },
    !loading ? `↻ ${text}` : text,
  );
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.toDo;
  return React.createElement(
    "span",
    {
      style: {
        fontSize: 12,
        fontFamily: FONT,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 3,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        whiteSpace: "nowrap",
      },
    },
    cfg.label,
  );
};

const Av = ({ name, color, size = 20 }) =>
  React.createElement(
    "div",
    {
      title: name,
      style: {
        width: size,
        height: size,
        borderRadius: "50%",
        background: color || "#8c8c8c",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.42,
        color: "#fff",
        fontWeight: 500,
        flexShrink: 0,
      },
    },
    (name || "?").charAt(0).toUpperCase(),
  );

const ApprovalIcon = ({ isRequiredApproval }) => {
  if (!isRequiredApproval)
    return React.createElement("div", {
      style: { width: COL.approval, flexShrink: 0 },
    });
  return React.createElement(
    "div",
    {
      style: {
        width: COL.approval,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
      title: "Approval required",
    },
    React.createElement("span", { style: { fontSize: 12 } }, "🔐"),
  );
};

const StatusBtn = ({
  status,
  size = 15,
  onChange,
  isRequiredApproval = false,
  isBlocked = false,
  readOnly = false,
}) => {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CFG[status] || STATUS_CFG.toDo;
  const allowedKeys = getStatusKeys(isRequiredApproval);
  return React.createElement(
    "div",
    { style: { position: "relative", flexShrink: 0 } },
    React.createElement(
      "div",
      {
        onClick: (e) => {
          e.stopPropagation();
          // 🌟 NẾU BỊ CHẶN QUYỀN SẼ BÁO LỖI NGAY TẠI ĐÂY
          if (readOnly) {
            message.warning(
              "🔒 Only managers or the assignee can change the status",
            );
            return;
          }
          setOpen((v) => !v);
        },
        title: readOnly
          ? "No edit permission"
          : isBlocked
            ? "Task is blocked by a previous task"
            : cfg.label,
        style: {
          width: size,
          height: size,
          borderRadius: "50%",
          border: `2px solid ${cfg.color}`,
          background:
            status === "done"
              ? cfg.color
              : status === "inProgress"
                ? `${cfg.color}25`
                : status === "blocked"
                  ? `${cfg.color}20`
                  : "transparent",
          cursor: readOnly ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          opacity: readOnly ? 0.7 : 1,
        },
      },
      status === "done" &&
        React.createElement(
          "span",
          { style: { color: "#fff", fontSize: size * 0.6, lineHeight: 1 } },
          "✓",
        ),
      status === "cancelled" &&
        React.createElement(
          "span",
          { style: { color: cfg.color, fontSize: size * 0.6, lineHeight: 1 } },
          "×",
        ),
      status === "blocked" &&
        React.createElement(
          "span",
          { style: { color: cfg.color, fontSize: size * 0.55, lineHeight: 1 } },
          "⏸",
        ),
    ),
    open &&
      !readOnly &&
      React.createElement(
        "div",
        {
          style: {
            position: "absolute",
            top: size + 4,
            left: 0,
            zIndex: 9999,
            background: "#fff",
            border: "1px solid #e8e8e8",
            borderRadius: 6,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            padding: "4px 0",
            minWidth: 160,
          },
          onMouseLeave: () => setOpen(false),
        },
        ...allowedKeys.map((k) => {
          const v = STATUS_CFG[k];
          return React.createElement(
            "div",
            {
              key: k,
              onClick: (e) => {
                e.stopPropagation();
                onChange && onChange(k);
                setOpen(false);
              },
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 12px",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: FONT,
              },
              onMouseEnter: (e) =>
                (e.currentTarget.style.background = "#f5f5f5"),
              onMouseLeave: (e) =>
                (e.currentTarget.style.background = "transparent"),
            },
            React.createElement("div", {
              style: {
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: v.color,
                flexShrink: 0,
              },
            }),
            React.createElement(
              "span",
              { style: { color: "#262626" } },
              v.label,
            ),
          );
        }),
      ),
  );
};

const ColHeader = () =>
  React.createElement(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        minHeight: 32,
        borderBottom: "1px solid #e8e8e8",
        background: "#fafafa",
        fontSize: 12,
        fontFamily: FONT,
        fontWeight: 700,
        minWidth: 1300,
        color: "#8c8c8c",
        textTransform: "uppercase",
        letterSpacing: 0.5,
      },
    },
    React.createElement("div", { style: { width: COL.menu, flexShrink: 0 } }),
    React.createElement(
      "div",
      { style: { width: COL.stt, flexShrink: 0, textAlign: "center" } },
      "STT",
    ),
    React.createElement("div", { style: { width: COL.toggle, flexShrink: 0 } }),
    React.createElement("div", { style: { width: 22, flexShrink: 0 } }),
    React.createElement(
      "div",
      { style: { flex: 1, padding: "0 10px", minWidth: 120 } },
      "Title",
    ),
    React.createElement(
      "div",
      { style: { width: COL.updatedAt, textAlign: "center", flexShrink: 0 } },
      "Updated date",
    ),
    React.createElement(
      "div",
      { style: { width: COL.assign, textAlign: "center", flexShrink: 0 } },
      "Assignee",
    ),
    React.createElement(
      "div",
      { style: { width: COL.desc, flexShrink: 0, padding: "0 8px" } },
      "Description",
    ),
    React.createElement(
      "div",
      { style: { width: COL.start, textAlign: "center", flexShrink: 0 } },
      "Start",
    ),
    React.createElement(
      "div",
      { style: { width: COL.deadline, textAlign: "center", flexShrink: 0 } },
      "Deadline",
    ),
    React.createElement(
      "div",
      { style: { width: COL.pendingIssue, flexShrink: 0, padding: "0 8px" } },
      "Pending Issue",
    ),
    React.createElement(
      "div",
      { style: { width: COL.nextStep, flexShrink: 0, padding: "0 8px" } },
      "Next Step",
    ),
    React.createElement(
      "div",
      { style: { width: COL.files, textAlign: "center", flexShrink: 0 } },
      "Documents",
    ),
    React.createElement("div", {
      style: { width: COL.approval, flexShrink: 0 },
    }),
  );
// ============================================================
// §6 PICKERS
// ============================================================

const PortalDropdown = ({ anchorRef, open, onClose, width, children }) => {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const openUp = rect.top > 400;
    setPos({
      top: openUp ? rect.top - 344 : rect.bottom + 4,
      left: rect.right - width,
    });
  }, [open]);
  if (!open) return null;
  return React.createElement(
    React.Fragment,
    null,
    React.createElement("div", {
      style: { position: "fixed", inset: 0, zIndex: 99998 },
      onClick: onClose,
    }),
    React.createElement(
      "div",
      {
        style: {
          position: "fixed",
          top: pos.top,
          left: pos.left,
          zIndex: 99999,
          background: "#fff",
          border: "1px solid #e8e8e8",
          borderRadius: 8,
          boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
          width,
          padding: "8px 0",
          maxHeight: 340,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
        },
        onClick: (e) => e.stopPropagation(),
      },
      children,
    ),
  );
};

const LawyerPicker = ({
  lawyers,
  value,
  onChange,
  size = 20,
  readOnly = false,
}) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const triggerRef = useRef(null);
  const cur = lawyers.find((l) => l.id === value);
  const color = cur
    ? LAWYER_COLORS[lawyers.indexOf(cur) % LAWYER_COLORS.length]
    : "#8c8c8c";

  const TYPE_ORDER = ["associate", "suppliant", "lawyer", "partner"];
  const filtered = lawyers.filter((l) =>
    (l.lawyerName || "").toLowerCase().includes(q.toLowerCase()),
  );
  const grouped = TYPE_ORDER.map((type) => ({
    type,
    cfg: LAWYER_TYPE_CFG[type] || {
      label: type,
      color: "#8c8c8c",
      bg: "#f5f5f5",
    },
    items: filtered.filter((l) => l.lawyerType === type),
  })).filter((g) => g.items.length > 0);
  const others = filtered.filter((l) => !TYPE_ORDER.includes(l.lawyerType));
  const handleClose = useCallback(() => {
    setOpen(false);
    setQ("");
  }, []);
  const renderLawyerRow = (l) => {
    const lColor = LAWYER_COLORS[lawyers.indexOf(l) % LAWYER_COLORS.length];
    return React.createElement(
      "div",
      {
        key: l.id,
        onClick: (e) => {
          e.stopPropagation();
          onChange && onChange(l.id, l.lawyerName, lColor);
          handleClose();
        },
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          cursor: "pointer",
          fontFamily: FONT,
        },
        onMouseEnter: (e) => (e.currentTarget.style.background = "#f5f5f5"),
        onMouseLeave: (e) => (e.currentTarget.style.background = "transparent"),
      },
      React.createElement(Av, { name: l.lawyerName, color: lColor, size: 26 }),
      React.createElement(
        "div",
        { style: { flex: 1, minWidth: 0 } },
        React.createElement(
          "div",
          {
            style: {
              fontSize: 12,
              fontFamily: FONT,
              color: "#262626",
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          },
          l.lawyerName,
        ),
        l.unitPrice > 0 &&
          React.createElement(
            "div",
            { style: { fontSize: 12, fontFamily: FONT, color: "#8c8c8c" } },
            `${Number(l.unitPrice).toLocaleString("vi-VN")} ₫/hr`,
          ),
      ),
    );
  };
  const dropdownContent = React.createElement(
    "div",
    { style: { display: "flex", flexDirection: "column", height: "100%" } },
    React.createElement(
      "div",
      { style: { padding: "0 10px 8px", flexShrink: 0 } },
      React.createElement("input", {
        autoFocus: true,
        value: q,
        onChange: (e) => setQ(e.target.value),
        placeholder: "Search lawyer...",
        style: {
          width: "100%",
          border: "1px solid #e8e8e8",
          borderRadius: 6,
          padding: "6px 10px",
          fontSize: 12,
          outline: "none",
          boxSizing: "border-box",
          fontFamily: FONT,
        },
      }),
    ),
    React.createElement(
      "div",
      { style: { overflowY: "auto", flex: 1 } },
      cur &&
        React.createElement(
          "div",
          {
            onClick: (e) => {
              e.stopPropagation();
              onChange && onChange(null, null, null);
              handleClose();
            },
            style: {
              padding: "7px 12px",
              fontSize: 12,
              color: "#cf1322",
              cursor: "pointer",
              fontFamily: FONT,
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
              borderBottom: "1px solid #f0f0f0",
            },
            onMouseEnter: (e) => (e.currentTarget.style.background = "#fff1f0"),
            onMouseLeave: (e) =>
              (e.currentTarget.style.background = "transparent"),
          },
          React.createElement("span", null, "×"),
          React.createElement("span", null, "Unassign"),
        ),
      ...grouped.map(({ type, cfg, items }) =>
        React.createElement(
          "div",
          { key: type },
          React.createElement(
            "div",
            {
              style: {
                padding: "5px 12px 3px",
                fontSize: 12,
                fontFamily: FONT,
                fontWeight: 700,
                color: cfg.color,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                background: cfg.bg,
                borderTop: "1px solid #f0f0f0",
                borderBottom: "1px solid #f0f0f0",
              },
            },
            cfg.label,
          ),
          ...items.map(renderLawyerRow),
        ),
      ),
      others.length > 0 &&
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            {
              style: {
                padding: "5px 12px 3px",
                fontSize: 12,
                fontFamily: FONT,
                fontWeight: 700,
                color: "#8c8c8c",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                background: "#f5f5f5",
                borderTop: "1px solid #f0f0f0",
              },
            },
            "Other",
          ),
          ...others.map(renderLawyerRow),
        ),
    ),
  );

  return React.createElement(
    "div",
    {
      style: {
        position: "relative",
        flexShrink: 0,
        display: "flex",
        justifyContent: "flex-start",
      },
    },
    React.createElement(
      "div",
      {
        ref: triggerRef,
        onClick: (e) => {
          e.stopPropagation();
          if (!readOnly) setOpen((v) => !v);
        },
        style: {
          display: "inline-flex",
          alignItems: "center",
          cursor: readOnly ? "default" : "pointer",
          gap: 6,
        },
      },
      cur
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement(Av, { name: cur.lawyerName, color, size }),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 13,
                  fontFamily: FONT,
                  color: "#262626",
                  fontWeight: 600,
                },
              },
              cur.lawyerName,
            ),
            !readOnly &&
              React.createElement(
                "span",
                { style: { fontSize: 12, color: "#bfbfbf", lineHeight: 1 } },
                "▾",
              ),
          )
        : readOnly
          ? React.createElement("div", {
              style: {
                width: size,
                height: size,
                borderRadius: "50%",
                background: "#f0f0f0",
                border: "1px solid #e8e8e8",
                flexShrink: 0,
              },
            })
          : React.createElement(
              "div",
              {
                title: "Assign lawyer",
                style: {
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  border: "1.5px dashed #bfbfbf",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: size * 0.55,
                  color: "#bfbfbf",
                },
              },
              "+",
            ),
    ),
    React.createElement(
      PortalDropdown,
      { anchorRef: triggerRef, open, onClose: handleClose, width: 260 },
      dropdownContent,
    ),
  );
};

const TaskPicker = ({
  allTasks,
  currentTaskId,
  value,
  onChange,
  readOnly = false,
}) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const cur = useMemo(
    () => allTasks.find((t) => t.id === value),
    [allTasks, value],
  );

  const filtered = useMemo(
    () =>
      allTasks.filter(
        (t) =>
          t.id !== currentTaskId &&
          (t.title || "").toLowerCase().includes(q.toLowerCase()),
      ),
    [allTasks, currentTaskId, q],
  );

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((t) => {
      const key = t.titleSection ? t.titleSection.trim() : "__none__";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });

    const sectionKeys = Array.from(
      new Set(
        allTasks
          .map((t) => (t.titleSection ? t.titleSection.trim() : null))
          .filter(Boolean),
      ),
    ).sort();
    const noneKey = map["__none__"] ? ["__none__"] : [];
    return [...sectionKeys, ...noneKey].map((k) => ({
      key: k,
      label: k === "__none__" ? "No Group" : k,
      tasks: map[k],
    }));
  }, [filtered, allTasks]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQ("");
  }, []);
  const CW = {
    status: 90,
    desc: 190,
    start: 82,
    lawyer: 175,
    deadline: 78,
    check: 24,
  };
  if (readOnly) {
    if (!cur)
      return React.createElement(
        "span",
        { style: { fontSize: 12, fontFamily: FONT, color: "#bfbfbf" } },
        "—",
      );
    return React.createElement(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 6 } },
      React.createElement(StatusBadge, { status: cur.status }),
      React.createElement(
        "span",
        {
          style: {
            fontSize: 12,
            fontFamily: FONT,
            color: "#262626",
            fontWeight: 500,
          },
        },
        cur.title,
      ),
    );
  }
  const renderTaskRow = (t) => {
    const isSelected = t.id === value;
    const st = STATUS_CFG[t.status] || STATUS_CFG.toDo;
    const od =
      t.dueDate &&
      t.status !== "done" &&
      t.status !== "cancelled" &&
      new Date(t.dueDate) < new Date();
    const isDone = t.status === "done";
    const isBlocked = t.status === "blocked";
    return React.createElement(
      "div",
      {
        key: t.id,
        onClick: () => {
          onChange(t.id);
          handleClose();
        },
        style: {
          display: "flex",
          alignItems: "center",
          padding: "7px 12px",
          cursor: "pointer",
          background: isSelected ? "#e6f4ff" : "transparent",
          borderBottom: "1px solid #f5f5f5",
          borderLeft:
            "3px solid " +
            (isBlocked ? "#722ed1" : isSelected ? "#1890ff" : "transparent"),
        },
        onMouseEnter: (e) => {
          if (!isSelected) e.currentTarget.style.background = "#f5f5f5";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.background = isSelected
            ? "#e6f4ff"
            : "transparent";
        },
      },
      React.createElement(
        "div",
        { style: { width: CW.status, flexShrink: 0 } },
        React.createElement(
          "span",
          {
            style: {
              fontSize: 11,
              fontFamily: FONT,
              fontWeight: 500,
              padding: "2px 6px",
              borderRadius: 3,
              background: st.bg,
              color: st.color,
              border: `1px solid ${st.border}`,
              whiteSpace: "nowrap",
              display: "inline-block",
            },
          },
          st.label,
        ),
      ),
      React.createElement(
        "div",
        {
          style: {
            flex: 1,
            paddingLeft: 8,
            paddingRight: 6,
            fontSize: 12,
            fontFamily: FONT,
            color: isDone ? "#bfbfbf" : isBlocked ? "#722ed1" : "#262626",
            textDecoration: isDone ? "line-through" : "none",
            overflow: "hidden",
            overflowWrap: "break-word",
            wordBreak: "break-word",
            whiteSpace: "normal",
            fontWeight: isSelected ? 600 : 500,
          },
        },
        t.title,
      ),
      React.createElement(
        "div",
        {
          style: {
            width: CW.check,
            flexShrink: 0,
            textAlign: "center",
            fontSize: 12,
            color: "#1890ff",
            fontWeight: 700,
          },
        },
        isSelected ? "✓" : "",
      ),
    );
  };

  const renderDropdown = () => {
    if (!open) return null;
    return React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          zIndex: 10000,
          background: "#fff",
          border: "1px solid #e8e8e8",
          borderRadius: 6,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          maxHeight: 440,
          overflow: "hidden",
        },
      },
      React.createElement(
        "div",
        { style: { padding: "8px 10px 6px", flexShrink: 0 } },
        React.createElement("input", {
          autoFocus: true,
          value: q,
          onChange: (e) => setQ(e.target.value),
          placeholder: "Search tasks by name...",
          style: {
            width: "100%",
            border: "1px solid #e8e8e8",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: 12,
            outline: "none",
            boxSizing: "border-box",
            fontFamily: FONT,
          },
        }),
      ),
      React.createElement(
        "div",
        { style: { overflowY: "auto", flex: 1 } },
        grouped.length === 0
          ? React.createElement(
              "div",
              {
                style: {
                  padding: "16px",
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#bfbfbf",
                  textAlign: "center",
                },
              },
              "No tasks found",
            )
          : grouped.map((g) =>
              React.createElement(
                "div",
                { key: g.key },
                React.createElement(
                  "div",
                  {
                    style: {
                      padding: "10px 12px",
                      fontSize: 12,
                      fontFamily: FONT,
                      fontWeight: 700,
                      color: "#8c8c8c",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      background: "#f5f5f5",
                      borderTop: "1px solid #efefef",
                      borderBottom: "1px solid #efefef",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    },
                  },
                  React.createElement(
                    "span",
                    { style: { fontSize: 11 } },
                    "🗂",
                  ),
                  React.createElement("span", null, g.label),
                  React.createElement(
                    "span",
                    {
                      style: {
                        marginLeft: "auto",
                        background: "#e0e0e0",
                        borderRadius: 8,
                        padding: "0 6px",
                        fontSize: 12,
                      },
                    },
                    String(g.tasks.length),
                  ),
                ),
                g.tasks.map(renderTaskRow),
              ),
            ),
      ),
    );
  };

  return React.createElement(
    "div",
    { style: { position: "relative" } },
    open &&
      React.createElement("div", {
        style: { position: "fixed", inset: 0, zIndex: 9998 },
        onClick: handleClose,
      }),
    React.createElement(
      "div",
      {
        onClick: () => setOpen((v) => !v),
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          border: `1px solid ${open ? "#1890ff" : "#e8e8e8"}`,
          borderRadius: 6,
          cursor: "pointer",
          background: "#fff",
          minWidth: 280,
          position: "relative",
          zIndex: 9999,
          minHeight: 36,
        },
      },
      cur
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement("div", {
              style: {
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: (STATUS_CFG[cur.status] || STATUS_CFG.toDo).color,
                flexShrink: 0,
              },
            }),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 13,
                  fontFamily: FONT,
                  color: "#262626",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontWeight: 500,
                },
              },
              cur.title,
            ),
            React.createElement(StatusBadge, { status: cur.status }),
            React.createElement(
              "span",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  onChange(null);
                },
                style: {
                  fontSize: 14,
                  color: "#cf1322",
                  fontWeight: 700,
                  flexShrink: 0,
                  lineHeight: 1,
                },
              },
              "×",
            ),
          )
        : React.createElement(
            "span",
            {
              style: {
                fontSize: 13,
                fontFamily: FONT,
                color: "#bfbfbf",
                flex: 1,
              },
            },
            "Select a prerequisite task...",
          ),
    ),
    renderDropdown(),
  );
};

const PreviewModal = ({ doc, onClose }) => {
  if (!doc) return null;
  const attachment = Array.isArray(doc.fileAttachment)
    ? doc.fileAttachment[0]
    : doc.fileAttachment;
  const fileUrl = attachment?.url || attachment?.preview;
  const fullUrl = getFullUrl(fileUrl);
  const rawName =
    doc.title || attachment?.title || attachment?.filename || "File";
  const extFromAtt = attachment?.extname
    ? attachment.extname.startsWith(".")
      ? attachment.extname.toLowerCase()
      : "." + attachment.extname.toLowerCase()
    : "";
  const extFromName = rawName.includes(".")
    ? "." + rawName.split(".").pop().toLowerCase()
    : "";
  const fileExt = extFromAtt || extFromName || "";
  const baseName = rawName.toLowerCase().endsWith(fileExt)
    ? rawName.slice(0, rawName.length - fileExt.length)
    : rawName;
  const displayName = (baseName || "File") + fileExt;
  const isPdf = fileExt === ".pdf";
  const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(fileExt);
  const isOffice = [
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".odt",
  ].includes(fileExt);

  // Office Viewer URL — file phải có public URL
  const officeViewerUrl =
    isOffice && fullUrl
      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`
      : null;
  return React.createElement(
    Modal,
    {
      open: !!doc,
      onCancel: onClose,
      centered: true,
      width: isPdf || isOffice ? "88%" : "auto",
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        displayName,
      ),
      bodyStyle: { padding: 0 },
      footer: [
        fullUrl &&
          React.createElement(
            Button,
            {
              key: "dl",
              onClick: () => window.open(fullUrl, "_blank"),
            },
            "⬇️ Download",
          ),
        React.createElement(Button, { key: "cl", onClick: onClose }, "Close"),
      ].filter(Boolean),
    },
    // PDF
    isPdf &&
      fullUrl &&
      React.createElement("iframe", {
        src: fullUrl,
        style: {
          width: "100%",
          height: "80vh",
          border: "none",
          display: "block",
        },
        title: displayName,
      }),
    // Image
    isImage &&
      fullUrl &&
      React.createElement("img", {
        src: fullUrl,
        alt: displayName,
        style: {
          maxWidth: "100%",
          maxHeight: "80vh",
          display: "block",
          margin: "0 auto",
          padding: 16,
        },
      }),
    // Office — Microsoft Web Viewer
    isOffice &&
      officeViewerUrl &&
      React.createElement(
        "div",
        { style: { padding: 0 } },
        React.createElement("iframe", {
          src: officeViewerUrl,
          style: {
            width: "100%",
            height: "80vh",
            border: "none",
            display: "block",
          },
          title: displayName,
          frameBorder: "0",
        }),
      ),
    // Fallback
    !isPdf &&
      !isImage &&
      !isOffice &&
      React.createElement(
        "div",
        {
          style: { padding: 32, textAlign: "center" },
        },
        React.createElement(Empty, {
          description:
            "Cannot preview this file type — please download to open",
        }),
      ),
  );
};

const PendingIssueCell = ({ task, allTasksInProject, lawyers }) => {
  if (!task.previousTaskId) {
    return React.createElement(
      "div",
      {
        style: {
          width: COL.pendingIssue,
          flexShrink: 0,
          textAlign: "center",
          color: "#d9d9d9",
          fontSize: 12,
        },
      },
      "—",
    );
  }
  const prevTask = allTasksInProject?.find((t) => t.id === task.previousTaskId);
  if (!prevTask) {
    return React.createElement(
      "div",
      {
        style: {
          width: COL.pendingIssue,
          flexShrink: 0,
          textAlign: "center",
          color: "#d9d9d9",
          fontSize: 12,
        },
      },
      "—",
    );
  }
  const statusInfo = STATUS_CFG[prevTask.status] || {
    color: "#8c8c8c",
    bg: "#f5f5f5",
    border: "#d9d9d9",
    label: "N/A",
  };
  const assignedLawyer = lawyers?.find((l) => l.id === prevTask.lawyerId);
  const lawyerName = assignedLawyer ? assignedLawyer.lawyerName : null;
  const tooltipContent = React.createElement(
    "div",
    null,
    React.createElement(
      "div",
      { style: { fontWeight: 700, marginBottom: 4 } },
      prevTask.title,
    ),
    React.createElement(
      "div",
      null,
      `Assignee: ${lawyerName || "Not assigned"}`,
    ),
    React.createElement("div", null, `Status: ${statusInfo.label}`),
  );
  return React.createElement(
    "div",
    {
      style: {
        width: COL.pendingIssue,
        flexShrink: 0,
        padding: "3px 8px",
        display: "flex",
        alignItems: "center",
      },
    },
    React.createElement(
      Tooltip,
      { title: tooltipContent, placement: "topLeft" },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 1,
            background: statusInfo.bg,
            border: `1px solid ${statusInfo.border}`,
            borderRadius: 4,
            padding: "3px 6px",
            cursor: "help",
            overflow: "hidden",
            width: "100%",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              fontSize: 12,
              fontFamily: FONT,
              color: statusInfo.color,
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 4,
            },
          },
          React.createElement(
            "span",
            null,
            prevTask.status === "done" ? "✅" : "⏳",
          ),
          React.createElement(
            "span",
            {
              style: {
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            },
            prevTask.title,
          ),
        ),
        lawyerName &&
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: statusInfo.color,
                opacity: 0.75,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            },
            `👤 ${lawyerName}`,
          ),
      ),
    ),
  );
};

const AddTaskModal = ({
  open,
  projectInternalId,
  lawyers,
  allTasksInProject,
  onSave,
  onClose,
  currentUser,
}) => {
  const INIT_FORM = {
    title: "",
    lawyerId: null,
    titleSection: "",
    approvedById: null,
    priority: "medium",
    status: "toDo",
    startDate: "",
    dueDate: "",
    estimatedDuration: "",
    description: "",
    isRequiredApproval: false,
    previousTaskId: null,
    nextStepDescription: "",
  };
  const [form, setForm] = useState(INIT_FORM);
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const uniqueSections = useMemo(() => {
    return Array.from(
      new Set(
        allTasksInProject
          .map((t) => (t.titleSection ? t.titleSection.trim() : null))
          .filter(Boolean),
      ),
    ).sort();
  }, [allTasksInProject]);

  const filteredSuggestions = useMemo(() => {
    const query = (form.titleSection || "").trim().toLowerCase();
    if (!query) return uniqueSections;
    return uniqueSections.filter((s) => s.toLowerCase().includes(query));
  }, [uniqueSections, form.titleSection]);

  useEffect(() => {
    if (form.previousTaskId) {
      const prevTask = allTasksInProject.find(
        (t) => extractId(t.id) === extractId(form.previousTaskId),
      );
      if (
        prevTask &&
        form.titleSection &&
        String(prevTask.titleSection).trim() !==
          String(form.titleSection).trim()
      ) {
        set("previousTaskId", null);
      }
    }
  }, [form.titleSection]);

  const tasksForDependency = useMemo(() => {
    if (!form.titleSection) return allTasksInProject;
    return allTasksInProject.filter(
      (t) =>
        String(t.titleSection || "").trim() ===
        String(form.titleSection || "").trim(),
    );
  }, [allTasksInProject, form.titleSection]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      message.warning("Please enter a task name");
      return;
    }
    if (!form.startDate) {
      message.warning("Please select a start date");
      return;
    }
    setSaving(true);
    try {
      let finalStatus = form.status;
      if (form.previousTaskId) {
        const prev = allTasksInProject.find(
          (t) => extractId(t.id) === extractId(form.previousTaskId),
        );
        if (prev && prev.status !== "done") finalStatus = "blocked";
      }
      const payload = {
        title: form.title.trim(),
        status: finalStatus,
        priority: form.priority,
        projectInternalId,
        isRequiredApproval: form.isRequiredApproval,
      };
      if (form.lawyerId) payload.lawyerId = form.lawyerId;
      if (form.titleSection) payload.titleSection = form.titleSection.trim();
      if (form.approvedById) payload.approvedById = form.approvedById;
      const startDateObj = form.startDate ? new Date(form.startDate) : null;
      if (startDateObj) payload.startDate = startDateObj.toISOString();
      if (form.dueDate) {
        payload.dueDate = new Date(form.dueDate).toISOString();
      } else if (startDateObj) {
        const defaultDeadline = new Date(startDateObj);
        defaultDeadline.setDate(defaultDeadline.getDate() + 2);
        payload.dueDate = defaultDeadline.toISOString();
      }
      if (form.description) payload.description = form.description;
      if (form.estimatedDuration)
        payload.estimatedDuration = parseFloat(form.estimatedDuration);
      if (form.previousTaskId) payload.previousTaskId = form.previousTaskId;
      if (form.nextStepDescription)
        payload.nextStepDescription = form.nextStepDescription;
      await apiReq("tasks:create", "POST", payload);
      message.success("✅ Task created");
      onSave();
      onClose();
      setForm(INIT_FORM);
    } catch {
      message.error("Creation failed");
    }
    setSaving(false);
  };

  const inp = (ph, val, fn, type = "text") =>
    React.createElement("input", {
      type,
      placeholder: ph,
      value: val,
      onChange: (e) => fn(e.target.value),
      style: {
        width: "100%",
        border: "1px solid #e8e8e8",
        borderRadius: 4,
        padding: "7px 10px",
        fontSize: 12,
        fontFamily: FONT,
        outline: "none",
        boxSizing: "border-box",
        color: "#262626",
      },
      onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
      onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
    });

  const sel = (ph, val, fn, opts) =>
    React.createElement(
      "select",
      {
        value: val || "",
        onChange: (e) => fn(e.target.value || null),
        style: {
          width: "100%",
          border: "1px solid #e8e8e8",
          borderRadius: 4,
          padding: "7px 10px",
          fontSize: 12,
          fontFamily: FONT,
          outline: "none",
          boxSizing: "border-box",
          color: val ? "#262626" : "#8c8c8c",
          background: "#fff",
        },
        onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
        onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
      },
      React.createElement("option", { value: "" }, ph),
      ...opts.map((o) =>
        React.createElement(
          "option",
          { key: o.value, value: o.value },
          o.label,
        ),
      ),
    );

  const lbl = (t) =>
    React.createElement(
      Text,
      {
        style: {
          fontSize: 12,
          color: "#8c8c8c",
          display: "block",
          marginBottom: 4,
          fontFamily: FONT,
          fontWeight: 600,
        },
      },
      t,
    );
  const fld = (l, c) =>
    React.createElement("div", { style: { marginBottom: 12 } }, lbl(l), c);
  const prevTask = allTasksInProject.find(
    (t) => extractId(t.id) === extractId(form.previousTaskId),
  );

  return React.createElement(
    Modal,
    {
      open,
      onCancel: onClose,
      footer: null,
      width: 1100,
      title: React.createElement(
        Text,
        { strong: true, style: { fontSize: 15, fontFamily: FONT } },
        "📋 New Task",
      ),
    },
    React.createElement(
      "div",
      { style: { maxHeight: "75vh", overflowY: "auto", paddingRight: 4 } },
      fld(
        "Title *",
        inp("Enter title...", form.title, (v) => set("title", v)),
      ),
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        fld(
          "👨‍⚖️ Assignee",
          sel(
            "-- Assign --",
            form.lawyerId,
            (v) => set("lawyerId", v ? Number(v) : null),
            lawyers.map((l) => ({ value: l.id, label: l.lawyerName })),
          ),
        ),
        React.createElement(
          "div",
          { style: { marginBottom: 12, position: "relative" } },
          lbl("🗂 Task Group (Section)"),
          React.createElement("input", {
            placeholder: "Select or enter a group name...",
            value: form.titleSection || "",
            onChange: (e) => set("titleSection", e.target.value),
            style: {
              width: "100%",
              border: "1px solid #e8e8e8",
              borderRadius: 4,
              padding: "7px 10px",
              fontSize: 12,
              fontFamily: FONT,
              outline: "none",
              boxSizing: "border-box",
              color: "#262626",
            },
            onFocus: (e) => {
              e.currentTarget.style.borderColor = "#1890ff";
              setShowSuggestions(true);
            },
            onBlur: (e) => {
              e.currentTarget.style.borderColor = "#e8e8e8";
              setTimeout(() => setShowSuggestions(false), 250);
            },
          }),
          showSuggestions &&
            filteredSuggestions.length > 0 &&
            React.createElement(
              "div",
              {
                style: {
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  border: "1px solid #d9d9d9",
                  borderRadius: 4,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  zIndex: 1050,
                  maxHeight: 180,
                  overflowY: "auto",
                  marginTop: 2,
                },
              },
              ...filteredSuggestions.map((s) =>
                React.createElement(
                  "div",
                  {
                    key: s,
                    onMouseDown: () => {
                      set("titleSection", s);
                      setShowSuggestions(false);
                    },
                    style: {
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: 12,
                      fontFamily: FONT,
                      borderBottom: "1px solid #f0f0f0",
                      transition: "background 0.2s",
                      textAlign: "left",
                    },
                    onMouseEnter: (e) =>
                      (e.currentTarget.style.background = "#f5f5f5"),
                    onMouseLeave: (e) =>
                      (e.currentTarget.style.background = "transparent"),
                  },
                  s,
                ),
              ),
            ),
        ),
        fld(
          "📅 Start date *",
          inp("", form.startDate, (v) => set("startDate", v), "date"),
        ),
        fld(
          "🏁 Deadline",
          inp("", form.dueDate, (v) => set("dueDate", v), "date"),
        ),
        fld(
          "⏱ Estimated duration (hours)",
          inp(
            "e.g. 4",
            form.estimatedDuration,
            (v) => set("estimatedDuration", v),
            "number",
          ),
        ),
      ),
      React.createElement(
        "div",
        { style: { marginBottom: 12 } },
        lbl("⛓ Pending Issue (optional)"),
        React.createElement(TaskPicker, {
          allTasks: tasksForDependency,
          currentTaskId: null,
          value: form.previousTaskId,
          onChange: (v) => set("previousTaskId", v),
        }),
        prevTask &&
          React.createElement(
            "div",
            {
              style: {
                marginTop: 6,
                padding: "7px 12px",
                background: prevTask.status === "done" ? "#f6ffed" : "#f9f0ff",
                border: `1px solid ${prevTask.status === "done" ? "#b7eb8f" : "#d3adf7"}`,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                gap: 8,
              },
            },
            React.createElement(StatusBadge, { status: prevTask.status }),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#262626",
                  fontWeight: 500,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              },
              prevTask.title,
            ),
            prevTask.status === "done"
              ? React.createElement(
                  "span",
                  {
                    style: {
                      fontSize: 12,
                      fontFamily: FONT,
                      color: "#389e0d",
                      fontWeight: 600,
                    },
                  },
                  "✓ Done",
                )
              : React.createElement(
                  "span",
                  {
                    style: {
                      fontSize: 12,
                      fontFamily: FONT,
                      color: "#722ed1",
                      fontWeight: 600,
                    },
                  },
                  '⏸ New task will start as "Waiting"',
                ),
          ),
      ),
      fld(
        "⚡ Priority",
        React.createElement(
          "div",
          { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
          ...Object.entries(PRIORITY_CFG).map(([k, v]) =>
            React.createElement(
              "div",
              {
                key: k,
                onClick: () => set("priority", k),
                style: {
                  fontSize: 12,
                  padding: "5px 12px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily: FONT,
                  background: form.priority === k ? v.bg : "#fafafa",
                  color: form.priority === k ? v.color : "#8c8c8c",
                  border: `1px solid ${form.priority === k ? v.color : "#f0f0f0"}`,
                  fontWeight: form.priority === k ? 600 : 400,
                },
              },
              `${v.icon} ${v.label}`,
            ),
          ),
        ),
      ),
      fld(
        "🔐 Approval required",
        React.createElement(
          "label",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 12,
              fontFamily: FONT,
              color: "#595959",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #f0f0f0",
              background: form.isRequiredApproval ? "#fff7e6" : "#fafafa",
            },
          },
          React.createElement("input", {
            type: "checkbox",
            checked: form.isRequiredApproval,
            onChange: (e) => {
              const checked = e.target.checked;
              setForm((p) => ({
                ...p,
                isRequiredApproval: checked,
                ...(!checked ? { approvedById: null } : {}),
              }));
            },
            style: {
              width: 15,
              height: 15,
              cursor: "pointer",
              accentColor: "#d46b08",
            },
          }),
          React.createElement(
            "span",
            {
              style: {
                color: form.isRequiredApproval ? "#d46b08" : "#595959",
                fontWeight: form.isRequiredApproval ? 600 : 400,
              },
            },
            form.isRequiredApproval
              ? "🔐 On — approval required"
              : "Require approval before marking as done",
          ),
        ),
      ),
      form.isRequiredApproval &&
        fld(
          "👤 Approver",
          React.createElement(
            "div",
            {
              style: {
                padding: "8px 12px",
                border: "1px solid #ffd591",
                borderRadius: 6,
                background: "#fffbe6",
                display: "flex",
                alignItems: "center",
                gap: 10,
              },
            },
            React.createElement(
              "span",
              { style: { fontSize: 12, color: "#d46b08", flexShrink: 0 } },
              "🔐",
            ),
            React.createElement(LawyerPicker, {
              lawyers,
              value: form.approvedById,
              size: 22,
              onChange: (id) => set("approvedById", id),
            }),
            !form.approvedById &&
              React.createElement(
                "span",
                { style: { fontSize: 12, color: "#bfbfbf", fontFamily: FONT } },
                "Select approver...",
              ),
          ),
        ),
      fld(
        "📝 Description",
        React.createElement("textarea", {
          value: form.description,
          onChange: (e) => set("description", e.target.value),
          placeholder: "Description...",
          rows: 3,
          style: {
            width: "100%",
            border: "1px solid #e8e8e8",
            borderRadius: 4,
            padding: "8px 10px",
            fontSize: 12,
            fontFamily: FONT,
            outline: "none",
            boxSizing: "border-box",
            resize: "vertical",
            color: "#262626",
          },
          onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
          onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
        }),
      ),
      fld(
        "👣 Next Step",
        React.createElement("textarea", {
          value: form.nextStepDescription,
          onChange: (e) => set("nextStepDescription", e.target.value),
          placeholder: "Next step after completion...",
          rows: 2,
          style: {
            width: "100%",
            border: "1px solid #e8e8e8",
            borderRadius: 4,
            padding: "8px 10px",
            fontSize: 12,
            fontFamily: FONT,
            outline: "none",
            boxSizing: "border-box",
            resize: "vertical",
            color: "#262626",
          },
          onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
          onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
        }),
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 16,
            paddingTop: 12,
            borderTop: "1px solid #f0f0f0",
          },
        },
        React.createElement(
          "div",
          {
            onClick: onClose,
            style: {
              padding: "6px 20px",
              borderRadius: 4,
              border: "1px solid #e8e8e8",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: FONT,
              color: "#595959",
            },
          },
          "Cancel",
        ),
        React.createElement(
          "div",
          {
            onClick: handleSave,
            style: {
              padding: "6px 24px",
              borderRadius: 4,
              background: "#1890ff",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: FONT,
              fontWeight: 600,
            },
          },
          saving ? "Saving..." : "Create task",
        ),
      ),
    ),
  );
};

const AddSubtaskModal = ({
  open,
  parentTaskId,
  lawyers,
  onSave,
  onClose,
  currentUser,
}) => {
  const INIT_FORM = {
    title: "",
    lawyerId: null,
    approvedById: null,
    priority: "medium",
    status: "toDo",
    startDate: "",
    deadline: "",
    estimatedDuration: "",
    description: "",
    isRequiredApproval: false,
    nextStepDescription: "",
  };
  const [form, setForm] = useState(INIT_FORM);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      message.warning("Please enter a subtask name");
      return;
    }
    if (!form.startDate) {
      message.warning("Please select a start date");
      return;
    }
    setSaving(true);
    try {
      const payload = withTaskLinkedUrl(
        {
          subTaskName: form.title.trim(),
          status: form.status,
          priority: form.priority,
          taskId: parentTaskId,
          isRequiredApproval: form.isRequiredApproval,
        },
        { taskId: parentTaskId },
        "subTask",
      );
      if (form.lawyerId) payload.lawyerId = form.lawyerId;
      if (form.approvedById) payload.approvedById = form.approvedById;
      if (form.startDate)
        payload.startDate = new Date(form.startDate).toISOString();
      if (form.deadline)
        payload.deadline = new Date(form.deadline).toISOString();
      if (form.description) payload.description = form.description;
      if (form.estimatedDuration)
        payload.estimatedDuration = parseFloat(form.estimatedDuration);
      if (form.nextStepDescription)
        payload.nextStepDescription = form.nextStepDescription;
      await apiReq("subTasks:create", "POST", payload);
      message.success("✅ Subtask created");
      onSave();
      onClose();
      setForm(INIT_FORM);
    } catch {
      message.error("Creation failed");
    }
    setSaving(false);
  };

  const inp = (ph, val, fn, type = "text") =>
    React.createElement("input", {
      type,
      placeholder: ph,
      value: val,
      onChange: (e) => fn(e.target.value),
      style: {
        width: "100%",
        border: "1px solid #e8e8e8",
        borderRadius: 4,
        padding: "7px 10px",
        fontSize: 12,
        fontFamily: FONT,
        outline: "none",
        boxSizing: "border-box",
        color: "#262626",
      },
      onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
      onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
    });

  const sel = (ph, val, fn, opts) =>
    React.createElement(
      "select",
      {
        value: val || "",
        onChange: (e) => fn(e.target.value || null),
        style: {
          width: "100%",
          border: "1px solid #e8e8e8",
          borderRadius: 4,
          padding: "7px 10px",
          fontSize: 12,
          fontFamily: FONT,
          outline: "none",
          boxSizing: "border-box",
          color: val ? "#262626" : "#8c8c8c",
          background: "#fff",
        },
        onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
        onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
      },
      React.createElement("option", { value: "" }, ph),
      ...opts.map((o) =>
        React.createElement(
          "option",
          { key: o.value, value: o.value },
          o.label,
        ),
      ),
    );

  const lbl = (t) =>
    React.createElement(
      Text,
      {
        style: {
          fontSize: 12,
          color: "#8c8c8c",
          display: "block",
          marginBottom: 4,
          fontFamily: FONT,
          fontWeight: 600,
        },
      },
      t,
    );
  const fld = (l, c) =>
    React.createElement("div", { style: { marginBottom: 12 } }, lbl(l), c);
  return React.createElement(
    Modal,
    {
      open,
      onCancel: onClose,
      footer: null,
      width: 800,
      title: React.createElement(
        Text,
        { strong: true, style: { fontSize: 15, fontFamily: FONT } },
        "📋 New Subtask",
      ),
    },
    React.createElement(
      "div",
      { style: { maxHeight: "75vh", overflowY: "auto", paddingRight: 4 } },
      fld(
        "Title *",
        inp("Enter title...", form.title, (v) => set("title", v)),
      ),
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        fld(
          "👨‍⚖️ Assignee",
          sel(
            "-- Assign --",
            form.lawyerId,
            (v) => set("lawyerId", v ? Number(v) : null),
            lawyers.map((l) => ({ value: l.id, label: l.lawyerName })),
          ),
        ),
        fld(
          "⏱ Estimated duration (hours)",
          inp(
            "e.g. 4",
            form.estimatedDuration,
            (v) => set("estimatedDuration", v),
            "number",
          ),
        ),
        fld(
          "📅 Start date *",
          inp("", form.startDate, (v) => set("startDate", v), "date"),
        ),
        fld(
          "🏁 Deadline",
          inp("", form.deadline, (v) => set("deadline", v), "date"),
        ),
      ),
      fld(
        "⚡ Priority",
        React.createElement(
          "div",
          { style: { display: "flex", gap: 6, flexWrap: "wrap" } },
          ...Object.entries(PRIORITY_CFG).map(([k, v]) =>
            React.createElement(
              "div",
              {
                key: k,
                onClick: () => set("priority", k),
                style: {
                  fontSize: 12,
                  padding: "5px 12px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily: FONT,
                  background: form.priority === k ? v.bg : "#fafafa",
                  color: form.priority === k ? v.color : "#8c8c8c",
                  border: `1px solid ${form.priority === k ? v.color : "#f0f0f0"}`,
                  fontWeight: form.priority === k ? 600 : 400,
                },
              },
              `${v.icon} ${v.label}`,
            ),
          ),
        ),
      ),
      fld(
        "🔐 Approval required",
        React.createElement(
          "label",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 12,
              fontFamily: FONT,
              color: "#595959",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #f0f0f0",
              background: form.isRequiredApproval ? "#fff7e6" : "#fafafa",
            },
          },
          React.createElement("input", {
            type: "checkbox",
            checked: form.isRequiredApproval,
            onChange: (e) => {
              const checked = e.target.checked;
              // 🌟 TỰ ĐỘNG XÓA NGƯỜI DUYỆT NẾU TẮT
              setForm((p) => ({
                ...p,
                isRequiredApproval: checked,
                ...(!checked ? { approvedById: null } : {}),
              }));
            },
            style: {
              width: 15,
              height: 15,
              cursor: "pointer",
              accentColor: "#d46b08",
            },
          }),
          React.createElement(
            "span",
            {
              style: {
                color: form.isRequiredApproval ? "#d46b08" : "#595959",
                fontWeight: form.isRequiredApproval ? 600 : 400,
              },
            },
            form.isRequiredApproval
              ? "🔐 On — approval required"
              : "Require approval before marking as done",
          ),
        ),
      ),
      form.isRequiredApproval &&
        fld(
          "👤 Approver",
          React.createElement(
            "div",
            {
              style: {
                padding: "8px 12px",
                border: "1px solid #ffd591",
                borderRadius: 6,
                background: "#fffbe6",
                display: "flex",
                alignItems: "center",
                gap: 10,
              },
            },
            React.createElement(
              "span",
              { style: { fontSize: 12, color: "#d46b08", flexShrink: 0 } },
              "🔐",
            ),
            React.createElement(LawyerPicker, {
              lawyers,
              value: form.approvedById,
              size: 22,
              onChange: (id) => set("approvedById", id),
            }),
            !form.approvedById &&
              React.createElement(
                "span",
                { style: { fontSize: 12, color: "#bfbfbf", fontFamily: FONT } },
                "Select approver...",
              ),
          ),
        ),
      fld(
        "📝 Detailed Description",
        React.createElement("textarea", {
          value: form.description,
          onChange: (e) => set("description", e.target.value),
          placeholder: "Describe the subtask in detail...",
          rows: 3,
          style: {
            width: "100%",
            border: "1px solid #e8e8e8",
            borderRadius: 4,
            padding: "8px 10px",
            fontSize: 12,
            fontFamily: FONT,
            outline: "none",
            boxSizing: "border-box",
            resize: "vertical",
            color: "#262626",
          },
          onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
          onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
        }),
      ),
      fld(
        "👣 Next Step",
        React.createElement("textarea", {
          value: form.nextStepDescription,
          onChange: (e) => set("nextStepDescription", e.target.value),
          placeholder: "Next step after completion...",
          rows: 2,
          style: {
            width: "100%",
            border: "1px solid #e8e8e8",
            borderRadius: 4,
            padding: "8px 10px",
            fontSize: 12,
            fontFamily: FONT,
            outline: "none",
            boxSizing: "border-box",
            resize: "vertical",
            color: "#262626",
          },
          onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
          onBlur: (e) => (e.currentTarget.style.borderColor = "#e8e8e8"),
        }),
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 16,
            paddingTop: 12,
            borderTop: "1px solid #f0f0f0",
          },
        },
        React.createElement(
          "div",
          {
            onClick: onClose,
            style: {
              padding: "6px 20px",
              borderRadius: 4,
              border: "1px solid #e8e8e8",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: FONT,
              color: "#595959",
            },
          },
          "Cancel",
        ),
        React.createElement(
          "div",
          {
            onClick: handleSave,
            style: {
              padding: "6px 24px",
              borderRadius: 4,
              background: "#1890ff",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: FONT,
              fontWeight: 600,
            },
          },
          saving ? "Saving..." : "Create subtask",
        ),
      ),
    ),
  );
};

// ── Task File Preview Popup (inline trong row) ──────────────
const TaskFilePreviewPopup = ({ files, onClose, anchorRect }) => {
  const [previewDoc, setPreviewDoc] = useState(null);
  if (previewDoc) {
    return React.createElement(PreviewModal, {
      doc: previewDoc,
      onClose: () => setPreviewDoc(null),
    });
  }

  return React.createElement(
    React.Fragment,
    null,
    React.createElement("div", {
      style: { position: "fixed", inset: 0, zIndex: 9990 },
      onClick: onClose,
    }),
    React.createElement(
      "div",
      {
        style: {
          position: "fixed",
          // 🌟 FIX LỖI: Đã gỡ bỏ window.innerHeight, thay bằng giới hạn an toàn 450
          top: anchorRect ? Math.min(anchorRect.bottom + 6, 450) : 200,
          left: anchorRect ? Math.max(anchorRect.right - 280, 10) : 200,
          zIndex: 9991,
          background: "#fff",
          border: "1px solid #e8e8e8",
          borderRadius: 8,
          boxShadow: "0 8px 28px rgba(0,0,0,0.16)",
          minWidth: 280,
          maxWidth: 360,
          maxHeight: 320,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
        onClick: (e) => e.stopPropagation(),
      },
      // Header
      React.createElement(
        "div",
        {
          style: {
            padding: "10px 14px",
            borderBottom: "1px solid #f0f0f0",
            background: "#fafafa",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          },
        },
        React.createElement(
          "span",
          {
            style: {
              fontSize: 12,
              fontFamily: FONT,
              fontWeight: 700,
              color: "#096dd9",
            },
          },
          `📎 ${files.length} documents`,
        ),
        React.createElement(
          "span",
          {
            onClick: onClose,
            style: {
              fontSize: 16,
              color: "#bfbfbf",
              cursor: "pointer",
              lineHeight: 1,
              padding: "0 2px",
            },
          },
          "×",
        ),
      ),
      // File list
      React.createElement(
        "div",
        { style: { overflowY: "auto", flex: 1, padding: "6px 0" } },
        ...files.map((f) => {
          const att = Array.isArray(f.fileAttachment)
            ? f.fileAttachment[0]
            : f.fileAttachment;
          const fileExt = att?.extname || "";
          const extInfo = getExtInfo(fileExt);
          const fullUrl = getFullUrl(att?.url || att?.preview);
          const name =
            f.title || att?.title || att?.filename || "(Untitled)";

          // 🌟 Mở rộng danh sách Preview cho cả file Office
          const canPreview = [
            ".pdf",
            ".png",
            ".jpg",
            ".jpeg",
            ".gif",
            ".webp",
            ".doc",
            ".docx",
            ".xls",
            ".xlsx",
            ".ppt",
            ".pptx",
            ".odt",
          ].includes(fileExt.toLowerCase());

          return React.createElement(
            "div",
            {
              key: f.id,
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 14px",
                borderBottom: "1px solid #f8f8f8",
              },
              onMouseEnter: (e) => {
                e.currentTarget.style.background = "#f9f0ff";
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.background = "transparent";
              },
            },
            React.createElement(
              "span",
              { style: { fontSize: 15, flexShrink: 0 } },
              extInfo.icon,
            ),

            // 🌟 LOGIC CLICK PREVIEW & TEXT XANH
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  color: canPreview ? "#1890ff" : "#595959",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontWeight: canPreview ? 600 : 500,
                  cursor: canPreview ? "pointer" : "default",
                  textDecoration: canPreview ? "underline" : "none",
                  textUnderlineOffset: "2px",
                },
                title: canPreview
                  ? "Click to preview"
                  : "This format doesn't support preview",
                onClick: canPreview
                  ? (e) => {
                      e.stopPropagation();
                      setPreviewDoc(f);
                    }
                  : undefined,
              },
              name + fileExt,
            ),

            // 🌟 Nút Tải Về
            React.createElement(
              "div",
              { style: { display: "flex", gap: 4, flexShrink: 0 } },
              fullUrl &&
                React.createElement(
                  "span",
                  {
                    title: "Download",
                    onClick: (e) => {
                      e.stopPropagation();
                      window.open(fullUrl, "_blank");
                    },
                    style: {
                      fontSize: 12,
                      padding: "2px 6px",
                      borderRadius: 3,
                      border: "1px solid #91caff",
                      color: "#096dd9",
                      cursor: "pointer",
                      background: "#fff",
                    },
                    onMouseEnter: (e) =>
                      (e.currentTarget.style.background = "#e6f4ff"),
                    onMouseLeave: (e) =>
                      (e.currentTarget.style.background = "#fff"),
                  },
                  "⬇️",
                ),
            ),
          );
        }),
      ),
    ),
  );
};

// ── Task Row ───────────────────────────────────────────────
const TaskRow = ({
  task,
  stt,
  lawyers,
  onStatus,
  onOpen,
  onAssign,
  onUpdate,
  expanded,
  onToggle,
  isManager = false,
  onOpenAddSubModal,
  allTasksInProject,
  tasksInService,
  isAssigneeOnly = false,
  myLawyerId = null,
  onDeleteTask,
}) => {
  const [hov, setHov] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [filePopup, setFilePopup] = useState(false);
  const [fileAnchorRect, setFileAnchorRect] = useState(null);
  const filesBtnRef = useRef(null);
  const hasSubs = task._subs?.length > 0;
  const done = task._subs?.filter((s) => s.status === "done").length || 0;
  const total = task._subs?.length || 0;
  const isBlocked = task.status === "blocked";

  // 🌟 FIX QUYỀN TRÊN TABLE ROW (Quét cả trường lawyer)
  const taskLawyerId = extractId(task.lawyerId) || extractId(task.lawyer);
  const isAssignedToThis = myLawyerId && taskLawyerId === extractId(myLawyerId);
  const canEdit = isManager || isAssignedToThis;

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          minHeight: 44,
          borderBottom: expanded ? "none" : "1px solid #f0f0f0",
          background: isBlocked ? "#fdf6ff" : hov ? "#f0f7ff" : "#fff",
          transition: "background 0.1s",
          borderLeft: isBlocked ? "3px solid #722ed1" : "3px solid transparent",
          minWidth: 1300,
          width: "100%",
        },
        onMouseEnter: () => setHov(true),
        onMouseLeave: () => {
          setHov(false);
          setShowMenu(false);
        },
      },
      // Context menu
      React.createElement(
        "div",
        {
          style: {
            width: COL.menu,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          },
        },
        canEdit
          ? React.createElement(
              "div",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  setShowMenu((v) => !v);
                },
                style: {
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  background: hov ? "#e6f4ff" : "transparent",
                  border: hov ? "1px solid #91caff" : "1px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: hov ? "pointer" : "default",
                  fontSize: 12,
                  color: hov ? "#096dd9" : "transparent",
                  fontWeight: 700,
                  transition: "all 0.15s",
                  userSelect: "none",
                },
              },
              "⋮",
            )
          : React.createElement(
              "span",
              { style: { fontSize: 12, color: "#d9d9d9" } },
              "",
            ),

        showMenu &&
          canEdit &&
          React.createElement(
            "div",
            {
              style: {
                position: "absolute",
                left: 0,
                bottom: "100%",
                marginBottom: 4,
                zIndex: 9999,
                background: "#fff",
                border: "1px solid #e8e8e8",
                borderRadius: 6,
                boxShadow: "0 6px 20px rgba(0,0,0,0.14)",
                minWidth: 180,
                padding: "4px 0",
              },
              onMouseLeave: () => setShowMenu(false),
            },
            canEdit &&
              React.createElement(
                "div",
                {
                  onClick: (e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onToggle(task.id, true);
                    onOpenAddSubModal(task.id);
                  },
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#262626",
                  },
                  onMouseEnter: (e) =>
                    (e.currentTarget.style.background = "#f5f5f5"),
                  onMouseLeave: (e) =>
                    (e.currentTarget.style.background = "transparent"),
                },
                React.createElement("span", null, "➕"),
                "Create subtask",
              ),
            canEdit &&
              React.createElement(
                "div",
                {
                  onClick: (e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onDeleteTask(task.id, "task", task.title);
                  },
                  style: {
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#cf1322",
                  },
                  onMouseEnter: (e) =>
                    (e.currentTarget.style.background = "#fff1f0"),
                  onMouseLeave: (e) =>
                    (e.currentTarget.style.background = "transparent"),
                },
                React.createElement(DeleteIcon),
                "Delete task",
              ),
          ),
      ),
      // STT
      React.createElement(
        "div",
        {
          style: {
            width: COL.stt,
            flexShrink: 0,
            textAlign: "center",
            fontSize: 12,
            fontFamily: FONT,
            color: "black",
            fontWeight: 500,
          },
        },
        stt,
      ),
      // Toggle
      React.createElement(
        "div",
        {
          onClick: () => onToggle(task.id),
          style: {
            width: COL.toggle,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: hasSubs ? "pointer" : "default",
            flexShrink: 0,
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 700,
          },
          onMouseEnter: (e) => {
            if (hasSubs) e.currentTarget.style.background = "#e6f4ff";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.background = "transparent";
          },
        },
        hasSubs ? (expanded ? "▾" : "▸") : " ",
      ),
      // Status button
      React.createElement(
        "div",
        {
          style: {
            width: 22,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
        },
        React.createElement(StatusBtn, {
          status: task.status,
          size: 15,
          onChange: canEdit ? (s) => onStatus(task.id, s, "task") : null,
          isRequiredApproval: task.isRequiredApproval,
          isBlocked,
          readOnly: !canEdit,
        }),
      ),
      // Title
      React.createElement(
        "div",
        {
          onClick: () => onOpen(task, "task", tasksInService),
          style: {
            flex: 1,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: FONT,
            cursor: "pointer",
            color:
              task.status === "done"
                ? "#bfbfbf"
                : isBlocked
                  ? "#722ed1"
                  : task._od
                    ? "#cf1322"
                    : "#262626",
            textDecoration: task.status === "done" ? "line-through" : "none",
            minWidth: 100,
            wordBreak: "break-word",
            whiteSpace: "normal",
            lineHeight: 1.55,
          },
        },
        task.title,
        hasSubs &&
          React.createElement(
            "span",
            {
              style: {
                display: "inline-block",
                marginLeft: 6,
                fontSize: 11,
                fontFamily: FONT,
                color: "#8c8c8c",
                background: "#f0f0f0",
                borderRadius: 8,
                padding: "1px 6px",
                fontWeight: 400,
                verticalAlign: "middle",
                whiteSpace: "nowrap",
              },
            },
            `${done}/${total}`,
          ),
      ),
      // Updated At
      React.createElement(
        "div",
        {
          style: {
            width: COL.updatedAt,
            textAlign: "center",
            flexShrink: 0,
            fontSize: 12,
            fontFamily: FONT,
            color: "#8c8c8c",
          },
        },
        task.updatedAt ? fmt(task.updatedAt, "full") : "—",
      ),
      // Lawyer picker
      React.createElement(
        "div",
        {
          style: {
            width: COL.assign,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          },
        },
        React.createElement(LawyerPicker, {
          lawyers,
          value: task.lawyerId,
          size: 22,
          readOnly: !isManager || isAssigneeOnly,
          onChange: (id, n, c) => onAssign(task.id, id, n, c, "task"),
        }),
      ),
      // Description
      React.createElement(
        "div",
        {
          style: {
            width: COL.desc,
            flexShrink: 0,
            padding: "4px 8px",
            display: "flex",
            alignItems: "flex-start",
          },
        },
        task.description
          ? React.createElement(
              Tooltip,
              { title: task.description, placement: "topLeft" },
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#595959",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    lineHeight: 1.5,
                    cursor: "pointer",
                  },
                },
                task.description,
              ),
            )
          : React.createElement(
              "span",
              { style: { fontSize: 12, fontFamily: FONT, color: "#d9d9d9" } },
              "—",
            ),
      ),
      // Start date
      React.createElement(
        "div",
        {
          style: {
            width: COL.start,
            textAlign: "center",
            flexShrink: 0,
            fontSize: 12,
            fontFamily: FONT,
            color: "#8c8c8c",
          },
        },
        fmt(task.startDate, "date") || "—",
      ),
      // Deadline
      React.createElement(
        "div",
        {
          style: {
            width: COL.deadline,
            textAlign: "center",
            flexShrink: 0,
            fontSize: 12,
            fontFamily: FONT,
            color: task._od ? "#cf1322" : task._today ? "#d46b08" : "#8c8c8c",
            fontWeight: task._today ? 700 : 400,
          },
        },
        fmt(task.dueDate, "date") || "—",
      ),
      // Pending Issue
      React.createElement(PendingIssueCell, {
        task,
        allTasksInProject,
        lawyers,
      }),
      // Next Step
      React.createElement(
        "div",
        {
          style: {
            width: COL.nextStep,
            flexShrink: 0,
            padding: "4px 8px",
            display: "flex",
            alignItems: "flex-start",
          },
        },
        task.nextStepDescription
          ? React.createElement(
              Tooltip,
              { title: task.nextStepDescription, placement: "topLeft" },
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#096dd9",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    lineHeight: 1.5,
                    cursor: "pointer",
                    fontWeight: 500,
                  },
                },
                `→ ${task.nextStepDescription}`,
              ),
            )
          : React.createElement(
              "span",
              { style: { fontSize: 12, fontFamily: FONT, color: "#d9d9d9" } },
              "—",
            ),
      ),
      // Files — hiển thị số lượng file thực, click popup preview
      React.createElement(
        "div",
        {
          style: {
            width: COL.files,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          },
        },
        task._files && task._files.length > 0
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(
                "div",
                {
                  ref: filesBtnRef,
                  onClick: (e) => {
                    e.stopPropagation();
                    const rect = filesBtnRef.current?.getBoundingClientRect();
                    setFileAnchorRect(rect || null);
                    setFilePopup((v) => !v);
                  },
                  title: `${task._files.length} documents — click to view`,
                  style: {
                    fontSize: 12,
                    fontFamily: FONT,
                    padding: "3px 8px",
                    borderRadius: 4,
                    border: "1px solid #d3adf7",
                    color: "#531dab",
                    cursor: "pointer",
                    background: filePopup ? "#efe0ff" : "#f9f0ff",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontWeight: 700,
                    transition: "background 0.1s",
                  },
                  onMouseEnter: (e) =>
                    (e.currentTarget.style.background = "#efe0ff"),
                  onMouseLeave: (e) => {
                    if (!filePopup)
                      e.currentTarget.style.background = "#f9f0ff";
                  },
                },
                React.createElement("span", null, "📎"),
                React.createElement(
                  "span",
                  { style: { fontSize: 12, fontWeight: 700 } },
                  task._files.length,
                ),
              ),
              filePopup &&
                React.createElement(TaskFilePreviewPopup, {
                  files: task._files,
                  anchorRect: fileAnchorRect,
                  onClose: () => setFilePopup(false),
                }),
            )
          : React.createElement(
              "div",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  onOpen(task, "task", tasksInService);
                },
                title: "No documents yet — open details to upload",
                style: {
                  fontSize: 12,
                  padding: "3px 8px",
                  borderRadius: 4,
                  border: "1px solid #f0f0f0",
                  color: "#d9d9d9",
                  cursor: "pointer",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.borderColor = "#d3adf7";
                  e.currentTarget.style.color = "#bfbfbf";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.borderColor = "#f0f0f0";
                  e.currentTarget.style.color = "#d9d9d9";
                },
              },
              "📎",
            ),
      ),
      React.createElement(ApprovalIcon, {
        isRequiredApproval: task.isRequiredApproval,
      }),
    ),
    // SubTask rows
    expanded &&
      React.createElement(
        "div",
        { style: { background: "#fafcff" } },
        ...(task._subs || []).map((s, index) => {
          // 🌟 SỬA ĐOẠN NÀY
          const subLawyerId = extractId(s.lawyerId) || extractId(s.lawyer);
          const canEditSub =
            isManager || (myLawyerId && subLawyerId === extractId(myLawyerId));
          const isSubBlocked = s.status === "blocked";
          const i = index + 1;
          return React.createElement(
            "div",
            {
              key: s.id,
              style: {
                display: "flex",
                alignItems: "center",
                minHeight: 38,
                borderBottom: "1px solid #f0f0f0",
                background: isSubBlocked ? "#fdf6ff" : "#fafcff",
                borderLeft: "3px solid transparent",
              },
            },
            // 14. Cột Menu
            React.createElement(
              "div",
              {
                style: {
                  width: COL.menu,
                  flexShrink: 0,
                  display: "flex",
                  justifyContent: "center",
                },
              },
              canEditSub
                ? React.createElement(
                    "span",
                    {
                      style: {
                        fontSize: 14,
                        color: "#cf1322",
                        cursor: "pointer",
                      },
                      title: "Delete subtask",
                      onClick: (e) => {
                        e.stopPropagation();
                        onDeleteTask(s.id, "subTask", s.subTaskName);
                      },
                    },
                    React.createElement(DeleteIcon),
                  )
                : React.createElement(
                    "span",
                    { style: { fontSize: 12, color: "#d9d9d9" } },
                    "—",
                  ),
            ),
            // 1. Cột STT (Để trống hoặc hiển thị ký hiệu con)
            React.createElement("div", {
              style: { width: COL.stt, flexShrink: 0 },
            }),
            // 2. Cột Toggle (Hiển thị đường dẫn góc L)
            React.createElement(
              "div",
              {
                style: {
                  width: COL.toggle,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                },
              },
              React.createElement(
                "span",
                { style: { color: "#d9d9d9", fontSize: 10 } },
                "└─",
              ),
            ),
            // 3. Cột Status
            React.createElement(
              "div",
              {
                style: {
                  width: 22,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                },
              },
              React.createElement(StatusBtn, {
                status: s.status,
                size: 13,
                onChange: canEditSub
                  ? (st) => onStatus(s.id, st, "subTask")
                  : null,
                isRequiredApproval: s.isRequiredApproval,
                isBlocked: isSubBlocked,
                readOnly: !canEditSub,
              }),
            ),
            // 4. Cột Title (Dùng flex: 1 để khớp với task chính)
            React.createElement(
              "div",
              {
                onClick: () => onOpen(s, "subTask"),
                style: {
                  flex: 1,
                  padding: "0 10px",
                  fontSize: 12,
                  fontFamily: FONT,
                  color:
                    s.status === "done"
                      ? "#bfbfbf"
                      : isSubBlocked
                        ? "#722ed1"
                        : s._od
                          ? "#cf1322"
                          : "#595959",
                  textDecoration: s.status === "done" ? "line-through" : "none",
                  cursor: "pointer",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              },
              s.subTaskName,
            ),
            // 5. Cột UpdatedAt
            React.createElement(
              "div",
              {
                style: {
                  width: COL.updatedAt,
                  textAlign: "center",
                  flexShrink: 0,
                  fontSize: 12,
                  fontFamily: FONT,
                  color: s.updatedAt ? "#8c8c8c" : "#d9d9d9",
                },
              },
              s.updatedAt ? fmt(s.updatedAt, "full") : "—",
            ),
            // 6. Cột Lawyer Picker
            React.createElement(
              "div",
              {
                style: {
                  width: COL.assign,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                },
              },
              React.createElement(LawyerPicker, {
                lawyers,
                value: s.lawyerId,
                size: 20,
                readOnly: !isManager || isAssigneeOnly,
                onChange: (id, n, c) => onAssign(s.id, id, n, c, "subTask"),
              }),
            ),
            // 7. Cột Description
            React.createElement(
              "div",
              { style: { width: COL.desc, flexShrink: 0, padding: "4px 8px" } },
              s.description
                ? React.createElement(
                    Tooltip,
                    { title: s.description, placement: "topLeft" },
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 12,
                          fontFamily: FONT,
                          color: "#8c8c8c",
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          lineHeight: 1.5,
                        },
                      },
                      s.description,
                    ),
                  )
                : React.createElement(
                    "span",
                    { style: { fontSize: 12, color: "#d9d9d9" } },
                    "—",
                  ),
            ),
            // 8. Cột Start Date
            React.createElement(
              "div",
              {
                style: {
                  width: COL.start,
                  textAlign: "center",
                  flexShrink: 0,
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#8c8c8c",
                },
              },
              fmt(s.date, "date") || "—",
            ),
            // 9. Cột Deadline
            React.createElement(
              "div",
              {
                style: {
                  width: COL.deadline,
                  textAlign: "center",
                  flexShrink: 0,
                  fontSize: 12,
                  fontFamily: FONT,
                  color: s._od ? "#cf1322" : "#8c8c8c",
                },
              },
              fmt(s.deadline, "date") || "—",
            ),
            // 10. Cột Pending Issue (Subtask thường không có dependency phức tạp)
            React.createElement("div", {
              style: { width: COL.pendingIssue, flexShrink: 0 },
            }),
            // 11. Cột Next Step
            React.createElement("div", {
              style: { width: COL.nextStep, flexShrink: 0 },
            }),
            // 12. Cột Files
            React.createElement(
              "div",
              {
                style: {
                  width: COL.files,
                  flexShrink: 0,
                  textAlign: "center",
                  color: "#d9d9d9",
                },
              },
              "—",
            ),
            // 13. Cột Approval Icon
            React.createElement(ApprovalIcon, {
              isRequiredApproval: s.isRequiredApproval,
            }),
          );
        }),
      ),
  );
};
// ── Service Section ────────────────────────────────────────
const ServiceSection = ({
  serviceId,
  serviceName,
  tasks,
  lawyers,
  expanded,
  onToggle,
  onStatus,
  onOpen,
  onAssign,
  onUpdate,
  isManager,
  onOpenAddSubModal,
  colorCfg,
  allTasksInProject,
  isAssigneeOnly = false,
  myLawyerId = null,
  onDeleteTask,
  onRenameSection,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const isNoneGroup = serviceId === "__none__";
  const baselineName = isNoneGroup ? "" : serviceName;
  const [editVal, setEditVal] = useState(baselineName);
  const isRenamingRef = useRef(false);

  useEffect(() => {
    setEditVal(baselineName);
  }, [serviceName, serviceId]);

  const handleRename = () => {
    if (isRenamingRef.current) return;
    isRenamingRef.current = true;
    setIsEditing(false);
    if (!editVal || !editVal.trim()) {
      setEditVal(baselineName);
      isRenamingRef.current = false;
      return;
    }
    const cleanVal = editVal.trim();
    if (cleanVal === baselineName) {
      isRenamingRef.current = false;
      return;
    }
    if (onRenameSection) {
      // oldName truyền cho log — nếu là nhóm chưa đặt tên, dùng chuỗi rỗng
      onRenameSection(isNoneGroup ? "" : serviceName, cleanVal, tasks);
    }
  };

  const handleStartEdit = (e) => {
    e.stopPropagation();
    isRenamingRef.current = false;
    setIsEditing(true);
  };
  const doneCnt = tasks.filter((t) => t.status === "done").length;
  const totalCnt = tasks.length;
  return React.createElement(
    "div",
    {
      style: {
        marginBottom: 12,
        borderRadius: 8,
        border: `1px solid ${colorCfg.border}`,
        background: "#fff",
      },
    },
    React.createElement(
      "div",
      {
        onClick: () => setCollapsed((v) => !v),
        style: {
          display: "flex",
          minWidth: 1300,
          width: "100%",
          alignItems: "center",
          padding: "10px 14px",
          background: colorCfg.bg,
          cursor: "pointer",
          borderRadius: collapsed ? 8 : "8px 8px 0 0",
        },
      },
      React.createElement(
        "span",
        {
          style: {
            marginRight: 8,
            transform: collapsed ? "rotate(-90deg)" : "none",
            transition: "0.2s",
          },
        },
        "▾",
      ),
      React.createElement(
        "b",
        { style: { flex: 1, fontSize: 12 } },
        isEditing
          ? React.createElement("input", {
              value: editVal,
              onChange: (e) => setEditVal(e.target.value),
              onClick: (e) => e.stopPropagation(),
              onKeyDown: (e) => {
                if (e.key === "Enter") {
                  e.stopPropagation();
                  handleRename();
                }
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setIsEditing(false);
                  setEditVal(serviceName);
                  isRenamingRef.current = false;
                }
              },
              onBlur: (e) => {
                e.stopPropagation();
                handleRename();
              },
              autoFocus: true,
              style: {
                fontSize: 12,
                fontFamily: FONT,
                fontWeight: 700,
                border: "1px solid #1890ff",
                borderRadius: 4,
                padding: "2px 6px",
                outline: "none",
                color: "#262626",
                width: "auto",
                minWidth: 200,
                marginRight: 8,
              },
            })
          : React.createElement(
              React.Fragment,
              null,
              React.createElement(
                "span",
                { style: { marginRight: 8 } },
                serviceName,
              ),
              isManager &&
                React.createElement(
                  "span",
                  {
                    onClick: handleStartEdit,
                    style: {
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      color: "#1890ff",
                      opacity: 0.7,
                      transition: "opacity 0.2s",
                    },
                    onMouseEnter: (e) => (e.currentTarget.style.opacity = 1),
                    onMouseLeave: (e) => (e.currentTarget.style.opacity = 0.7),
                    title: "Rename task group",
                  },
                  React.createElement(EditIcon),
                ),
            ),
      ),
      React.createElement(
        "span",
        { style: { fontSize: 12 } },
        `${doneCnt}/${totalCnt} done`,
      ),
    ),
    !collapsed &&
      React.createElement(
        "div",
        null,
        React.createElement(ColHeader),
        ...tasks.map((t, index) =>
          React.createElement(TaskRow, {
            key: t.id,
            task: t,
            stt: index + 1,
            lawyers,
            expanded: !!expanded[t.id],
            onToggle,
            onStatus,
            onOpen,
            onAssign,
            onUpdate,
            isManager,
            onOpenAddSubModal,
            allTasksInProject,
            tasksInService: tasks,
            isAssigneeOnly,
            myLawyerId,
            onDeleteTask,
          }),
        ),
      ),
  );
};
// ============================================================
// §9 VIEW MODES — ListView (default; KanbanView / GanttView peuvent être ajoutées ici)
// ============================================================
const ListView = ({
  tasks,
  lawyers,
  expanded,
  toggleExpand,
  handleStatus,
  handleOpen,
  handleAssign,
  handleDetailUpdate,
  isManager,
  handleOpenAddSubModal,
  isAssigneeOnly,
  myLawyerId,
  showAddTask,
  setShowAddTask,
  onDeleteTask,
  onRenameSection,
}) => {
  const grouped = {};
  tasks.forEach((t) => {
    const key = t.titleSection ? t.titleSection.trim() : "__none__";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });

  const sectionKeys = Array.from(
    new Set(
      tasks
        .map((t) => (t.titleSection ? t.titleSection.trim() : null))
        .filter(Boolean),
    ),
  ).sort();

  const orderedKeys = [
    ...sectionKeys,
    ...(grouped["__none__"] ? ["__none__"] : []),
  ];

  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 0,
        minWidth: 1300,
      },
    },
    ...orderedKeys.map((key, index) => {
      const colorCfg =
        key === "__none__"
          ? {
              bg: "#fafafa",
              border: "#e8e8e8",
              text: "#8c8c8c",
              dot: "#bfbfbf",
            }
          : SERVICE_COLORS[index % SERVICE_COLORS.length];
      const svcName = key === "__none__" ? "No Group" : key;
      return React.createElement(ServiceSection, {
        key,
        serviceId: key,
        serviceName: svcName,
        tasks: grouped[key] || [],
        lawyers,
        expanded,
        onToggle: toggleExpand,
        onStatus: handleStatus,
        onOpen: handleOpen,
        onAssign: handleAssign,
        onUpdate: handleDetailUpdate,
        isManager,
        onOpenAddSubModal: handleOpenAddSubModal,
        colorCfg,
        allTasksInProject: tasks,
        isAssigneeOnly,
        myLawyerId,
        onDeleteTask,
        onRenameSection,
      });
    }),
  );
};

// §10 MAIN — ProjectTasksTab + ctx.render()
// ============================================================
const ProjectInternalTasksTab = () => {
  const [tasks, setTasks] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [projectManagerId, setProjectManagerId] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [addSubForTaskId, setAddSubForTaskId] = useState(null);

  // State lưu ID thư mục của vụ việc hiện tại
  const [projectFolderId, setProjectFolderId] = useState(null);
  const [allProjectFolders, setAllProjectFolders] = useState([]);

  const toggleExpand = (id, force) =>
    setExpanded((prev) => ({
      ...prev,
      [id]: force !== undefined ? force : !prev[id],
    }));

  // ── Data loading ──────────────────────────────────────────
  const reload = useCallback(async () => {
    if (!PROJECT_ID) {
      setLoading(false);
      return;
    }

    const safeProjectId =
      typeof PROJECT_ID === "object"
        ? parseInt(PROJECT_ID?.id)
        : parseInt(PROJECT_ID);
    if (isNaN(safeProjectId)) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const folderPromise = ctx.api
        .request({
          url: "folders:list",
          params: {
            pageSize: 1000,
            filter: JSON.stringify({
              projectInternalId: { $eq: safeProjectId },
            }),
          },
        })
        .catch(() => null);

      const [allTasks, allSubs, allLawyers, user, folderRes] =
        await Promise.all([
          fetchAll(
            "tasks:list",
            "id,title,status,updatedAt,priority,startDate,dueDate,closedDate,lawyerId,projectInternalId,titleSection,description,estimatedDuration,workRate,isRequiredApproval,rejectionReason,approvedById,approvedAt,acceptedAt,previousTaskId,blockedReason,nextStepDescription,linkedUrl",
            { projectInternalId: { $eq: safeProjectId } },
          ),
          fetchAll(
            "subTasks:list",
            "id,subTaskName,status,priority,date,deadline,closedDate,lawyerId,taskId,description,hourlyRate,estimatedDuration,isRequiredApproval,rejectionReason,approvedById,updatedAt,linkedUrl",
          ),
          fetchAll("lawyers:list", "id,lawyerName,unitPrice,lawyerType,userId"),
          getCurrentUser(),
          folderPromise,
        ]);

      const projectFolders = folderRes?.data?.data || [];
      setAllProjectFolders(projectFolders);
      const root = projectFolders.find((f) => !f.parentId);
      setProjectFolderId(root ? extractId(root.id) : null);

      try {
        const projRes = await ctx.api.request({
          url: "projectInternal:get",
          params: { filterByTk: safeProjectId, fields: "id,projectManagerId" },
        });
        setProjectManagerId(
          projRes?.data?.data?.projectManagerId ||
            projRes?.data?.projectManagerId ||
            null,
        );
      } catch {}

      const lMap = {};
      allLawyers.forEach((l, i) => {
        lMap[l.id] = {
          name: l.lawyerName,
          color: LAWYER_COLORS[i % LAWYER_COLORS.length],
        };
      });

      const taskIds = allTasks.map((t) => t.id);
      let allTaskFiles = [];

      if (taskIds.length > 0) {
        allTaskFiles = await fetchTaskDocumentsByIds(taskIds, [
          { moduleScope: { $eq: PROJECT_INTERNAL_DOCUMENT_SCOPE } },
          { storageType: { $eq: PROJECT_INTERNAL_STORAGE_TYPE } },
        ]);
      }

      const fileMap = {};
      taskIds.forEach((id) => {
        fileMap[id] = [];
      });
      allTaskFiles.forEach((f) => {
        const taskId = getDocumentTaskId(f);
        if (taskId && fileMap[taskId]) fileMap[taskId].push(f);
      });

      const enriched = allTasks.map((t) => ({
        ...t,
        _type: "task",
        _ln: lMap[t.lawyerId]?.name || null,
        _lc: lMap[t.lawyerId]?.color || "#8c8c8c",
        _od: isOD(t.dueDate, t.status),
        _today: isToday(t.dueDate || t.startDate),
        _files: fileMap[t.id] || [],
        _subs: allSubs
          .filter((s) => s.taskId === t.id)
          .map((s) => ({
            ...s,
            _type: "subTask",
            _ln: lMap[s.lawyerId]?.name || null,
            _lc: lMap[s.lawyerId]?.color || "#8c8c8c",
            _od: isOD(s.deadline, s.status),
          })),
      }));

      setTasks(enriched);
      setLawyers(allLawyers);
      setCurrentUser(user);
    } catch (e) {
      console.error("Lỗi reload:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleStatus = useCallback(
    async (id, newSt, type) => {
      const isSub = type === "subTask";
      const pool = isSub ? tasks.flatMap((t) => t._subs || []) : tasks;
      const item = pool.find((t) => extractId(t.id) === extractId(id));
      if (!item) return;

      // Check dependency
      if (!isSub && item.previousTaskId) {
        const prevTask = tasks.find(
          (t) => extractId(t.id) === extractId(item.previousTaskId),
        );
        if (
          prevTask &&
          prevTask.status !== "done" &&
          prevTask.status !== "cancelled"
        ) {
          if (!["cancelled", "blocked"].includes(newSt)) {
            message.warning(`Please complete "${prevTask.title}" first`);
            return;
          }
        }
      }

      const resolvedSt = resolveStatus(newSt, item);
      const url = isSub
        ? `subTasks:update?filterByTk=${extractId(id)}`
        : `tasks:update?filterByTk=${extractId(id)}`;

      const data =
        resolvedSt === "done"
          ? { status: resolvedSt, closedDate: new Date().toISOString() }
          : { status: resolvedSt, closedDate: null };

      setTasks((prev) =>
        prev.map((t) => {
          if (!isSub && extractId(t.id) === extractId(id)) {
            return { ...t, ...data, _od: isOD(t.dueDate, resolvedSt) };
          }
          return {
            ...t,
            _subs: t._subs.map((s) =>
              isSub && extractId(s.id) === extractId(id)
                ? { ...s, ...data, _od: isOD(s.deadline, resolvedSt) }
                : s,
            ),
          };
        }),
      );

      try {
        await apiReq(url, "POST", data);
        await logActivity(
          isSub ? "SubTask" : "Task",
          extractId(id),
          "updated",
          "status",
          STATUS_CFG[item.status]?.label || item.status,
          STATUS_CFG[resolvedSt]?.label || resolvedSt,
          userName(currentUser),
          `upd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        );

        if (!isSub && resolvedSt === "done") {
          await autoUnblockNextTasks(
            id,
            tasks,
            currentUser?.nickname || currentUser?.username,
          );
        }

        message.success(`Status: ${STATUS_CFG[resolvedSt]?.label}`);
      } catch (e) {
        message.error("Backend error: unable to update status");
        reload();
      }
    },
    [tasks, currentUser, reload],
  );

  const autoUnblockNextTasks = useCallback(
    async (doneTaskId, currentTasks, changedBy) => {
      const blockedTasks = currentTasks.filter(
        (t) =>
          extractId(t.previousTaskId) === extractId(doneTaskId) &&
          t.status === "blocked",
      );
      for (const t of blockedTasks) {
        try {
          await apiReq(`tasks:update?filterByTk=${t.id}`, "POST", {
            status: "toDo",
          });
          setTasks((prev) =>
            prev.map((item) =>
              extractId(item.id) === extractId(t.id)
                ? { ...item, status: "toDo" }
                : item,
            ),
          );
          await logActivity(
            "Task",
            extractId(t.id),
            "updated",
            "status",
            "Blocked",
            "Not Start",
            changedBy,
            `auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          );
        } catch (e) {
          console.error("Lỗi auto unblock task", t.id, e);
        }
      }
    },
    [],
  );

  const handleAssign = useCallback(
    async (id, lawyerId, name, color, type) => {
      const isSub = type === "subTask";
      const url = isSub
        ? `subTasks:update?filterByTk=${extractId(id)}`
        : `tasks:update?filterByTk=${extractId(id)}`;

      const payload = withTaskLinkedUrl(
        { lawyerId },
        { id, caseId: PROJECT_ID },
        type,
      );

      setTasks((prev) =>
        prev.map((t) => {
          if (!isSub && extractId(t.id) === extractId(id)) {
            return { ...t, ...payload, _ln: name, _lc: color || "#8c8c8c" };
          }
          return {
            ...t,
            _subs: t._subs.map((s) =>
              isSub && extractId(s.id) === extractId(id)
                ? { ...s, ...payload, _ln: name, _lc: color || "#8c8c8c" }
                : s,
            ),
          };
        }),
      );

      try {
        await apiReq(url, "POST", payload);
        message.success("Assigned successfully");
      } catch (e) {
        message.error("Assignment failed");
        reload();
      }
    },
    [reload],
  );

  const handleDeleteTask = useCallback(
    async (id, type, title) => {
      const isSub = type === "subTask";
      const label = isSub ? "subtask" : "task";
      Modal.confirm({
        title: `Confirm delete ${label}`,
        content: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
        okText: "Delete permanently",
        okType: "danger",
        cancelText: "Cancel",
        onOk: async () => {
          try {
            await ctx.api.request({
              url: isSub ? "subTasks:destroy" : "tasks:destroy",
              method: "POST",
              params: { filterByTk: extractId(id) },
            });
            message.success("✅ Deleted successfully");
            reload();
          } catch (e) {
            message.error("Delete failed");
          }
        },
      });
    },
    [reload],
  );

  const handleRenameSection = useCallback(
    async (oldName, newName, sectionTasks) => {
      if (!newName || !newName.trim()) {
        message.warning("Group name cannot be empty");
        return;
      }
      const cleanNewName = newName.trim();
      if (cleanNewName === oldName) return;

      setLoading(true);
      try {
        const promises = sectionTasks.map((t) =>
          ctx.api.request({
            url: "tasks:update",
            method: "POST",
            params: { filterByTk: extractId(t.id) },
            data: { titleSection: cleanNewName },
          }),
        );
        await Promise.all(promises);

        for (const t of sectionTasks) {
          await logActivity(
            "Task",
            extractId(t.id),
            "updated",
            "titleSection",
            oldName,
            cleanNewName,
            userName(currentUser),
            `rename_${Date.now()}`,
          );
        }

        message.success(
          `Renamed group from "${oldName}" to "${cleanNewName}"`,
        );
        reload();
      } catch (e) {
        message.error("Failed to rename group");
        reload();
      }
    },
    [currentUser, reload],
  );

  const myLawyer = useMemo(() => {
    if (!currentUser) return null;
    const uid = extractId(currentUser.id);
    return lawyers.find((l) => extractId(l.userId) === uid) || null;
  }, [currentUser, lawyers]);

  const myLawyerId = myLawyer?.id || null;
  const isManager = useMemo(() => {
    if (isAdminUser(currentUser)) return true;
    if (projectManagerId && myLawyer) {
      return extractId(projectManagerId) === extractId(myLawyer.id);
    }
    return false;
  }, [currentUser, projectManagerId, myLawyer]);

  const isAssigneeOnly = myLawyer && !isManager;

  const assignableLawyers = useMemo(() => {
    return lawyers;
  }, [lawyers]);

  const handleDetailUpdate = useCallback((updated) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (extractId(t.id) === extractId(updated.id))
          return { ...t, ...updated };
        return {
          ...t,
          _subs: t._subs.map((s) =>
            extractId(s.id) === extractId(updated.id)
              ? { ...s, ...updated }
              : s,
          ),
        };
      }),
    );
  }, []);

  const handleOpenAddSubModal = useCallback((taskId) => {
    setAddSubForTaskId(taskId);
    setShowAddSub(true);
  }, []);

  // ── handleOpen (mở Task Detail popup từ row) ─────────────
  // Đồng bộ với TaskManagement.js: mở view Task Detail (TaskDetailView.js)
  // qua ctx.openView theo uid cố định, thay vì render DetailModal inline
  // như trước — TaskDetailView.js đã tự resolve caseId/projectInternalId
  // từ chính record task/subtask sau khi fetch, không cần truyền riêng.
  const buildTaskDetailRoute = (popupUid, taskId) => {
    const safeTaskId = extractId(taskId);
    if (!safeTaskId) return null;
    const pathname = window.location?.pathname || "";
    const segments = pathname.split("/").filter(Boolean);
    const adminIndex = segments.findIndex(
      (segment) => segment.toLowerCase() === "admin",
    );
    const appId = adminIndex >= 0 ? segments[adminIndex + 1] : "";
    const baseSegments = appId ? ["admin", appId] : ["admin"];
    const nextPathname = `/${baseSegments.join("/")}/view/${popupUid}/filterbytk/${encodeURIComponent(String(safeTaskId))}`;
    return {
      recordId: safeTaskId,
      pathname: nextPathname,
      url: `${window.location.origin}${nextPathname}`,
    };
  };

  const handleOpen = useCallback((item, type) => {
    const popupUid = "32b72ed2a6a";
    const taskId =
      type === "subTask" ? extractId(item.taskId) : extractId(item.id);
    const subTaskId = type === "subTask" ? extractId(item.id) : null;
    if (!taskId) return;

    const detailRoute = buildTaskDetailRoute(popupUid, taskId);
    if (!detailRoute) return;

    const collectionName = subTaskId ? "subTasks" : "tasks";
    const recordType = subTaskId ? "subTask" : "task";
    const sharedIdKeys = {
      filterByTk: detailRoute.recordId,
      filterbytk: detailRoute.recordId,
      id: detailRoute.recordId,
      recordId: detailRoute.recordId,
      taskId: detailRoute.recordId,
      sourceRecordId: detailRoute.recordId,
      sourceTaskId: detailRoute.recordId,
      parentTaskId: detailRoute.recordId,
      subTaskId,
      sourceSubTaskId: subTaskId,
      selectedSubTaskId: subTaskId,
      recordType,
      collectionName,
      pathname: detailRoute.pathname,
      linkedUrl: detailRoute.url,
    };
    const defineProperties = {};
    Object.keys(sharedIdKeys).forEach((key) => {
      defineProperties[key] = {
        value: sharedIdKeys[key],
        writable: true,
        enumerable: true,
        configurable: true,
      };
    });

    ctx.openView(popupUid, {
      mode: "dialog",
      size: "large",
      title: ctx.t ? ctx.t("Task detail") : "Task detail",
      navigation: false,
      ...sharedIdKeys,
      inputArgs: sharedIdKeys,
      params: sharedIdKeys,
      defineProperties,
    });
  }, []);

  // ── Guard ─────────────────────────────────────────────────
  if (!PROJECT_ID)
    return React.createElement(
      "div",
      { style: { padding: 24, fontFamily: FONT, color: "#8c8c8c" } },
      "⚠️ Project not found",
    );

  return React.createElement(
    "div",
    {
      style: {
        background: "#f0f2f5",
        padding: "16px 20px 24px",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      },
    },
    /* ── Header Toolbar ── */
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        },
      },
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "baseline", gap: 8 } },
        React.createElement(
          Text,
          { strong: true, style: { fontSize: 18, fontFamily: FONT } },
          "",
        ),
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8 } },
          React.createElement(
            Button,
            {
              type: "primary",
              onClick: () => setShowAddTask(true),
              style: {
                background: "#1890ff",
                borderColor: "#1890ff",
                borderRadius: 4,
                fontFamily: FONT,
                fontSize: 12,
                padding: "5px 16px",
                display: "inline-flex",
                alignItems: "center",
                fontWeight: 600,
              },
            },
            "＋ New Task",
          ),
          React.createElement(ReloadButton, { onReload: reload, loading }),
      ),
    ),

    /* ── Main View Container ── */
    React.createElement(
      "div",
      {
        style: {
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          padding: 16,
          flex: 1,
          overflowX: "auto",
          minWidth: 1000,
        },
      },
      loading
        ? React.createElement(
            "div",
            {
              style: {
                textAlign: "center",
                padding: "60px 0",
                color: "#8c8c8c",
                fontFamily: FONT,
                fontSize: 12,
              },
            },
            React.createElement(Spin, { tip: "Loading..." }),
          )
        : tasks.length === 0
          ? React.createElement(
              "div",
              {
                style: {
                  textAlign: "center",
                  padding: "60px 0",
                  color: "#bfbfbf",
                  fontSize: 12,
                  fontFamily: FONT,
                },
              },
              "📭 No tasks yet",
            )
          : React.createElement(ListView, {
              tasks,
              lawyers: assignableLawyers,
              expanded,
              toggleExpand,
              handleStatus,
              handleOpen,
              handleAssign,
              handleDetailUpdate,
              isManager,
              handleOpenAddSubModal,
              isAssigneeOnly,
              myLawyerId,
              showAddTask,
              setShowAddTask,
              onDeleteTask: handleDeleteTask,
              onRenameSection: handleRenameSection,
            }),
    ),

    /* ── Add Task Modal ── */
    React.createElement(AddTaskModal, {
      open: showAddTask,
      projectInternalId: PROJECT_ID ? parseInt(PROJECT_ID) : null,
      lawyers: assignableLawyers,
      allTasksInProject: tasks,
      currentUser,
      onSave: reload,
      onClose: () => setShowAddTask(false),
    }),

    /* ── Add SubTask Modal (placeholder) ── */
    showAddSub &&
      addSubForTaskId != null &&
      React.createElement(AddSubtaskModal, {
        key: `submodal-${addSubForTaskId}`,
        open: showAddSub,
        parentTaskId: addSubForTaskId,
        lawyers: assignableLawyers,
        currentUser: currentUser,
        onSave: () => {
          reload();
        },
        onClose: () => {
          setShowAddSub(false);
          setAddSubForTaskId(null);
        },
      }),
  );
};

ctx.render(React.createElement(ProjectInternalTasksTab, null));
