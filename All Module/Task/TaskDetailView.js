// ============================================================
// §1 CONFIG — không import, không side-effect
// ============================================================
const { React } = ctx;
const { useState, useEffect, useCallback, useMemo, useRef } = React;
const {
  Spin,
  Typography,
  Select,
  message,
  Modal,
  Tag,
  Upload,
  Form,
  Input,
  Button,
  Table,
  Tooltip,
  Drawer,
  Tabs,
  Descriptions,
  Space,
  Empty,
  Mentions,
  Avatar,
} = ctx.antd;
const { Text } = Typography;
const { Dragger } = Upload;

const PROJECT_ID = ctx.record?.id;
const FONT =
  "Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const COL = {
  stt: 38,
  toggle: 24,
  updatedAt: 110,
  desc: 190,
  nextStep: 155,
  start: 88,
  deadline: 88,
  assign: 150,
  approval: 28,
  history: 28,
  menu: 32,
  pendingIssue: 148,
  files: 72,
};

// 🌟 CONFIG URL DEEP-LINK CHO BÌNH LUẬN (Gán cứng các UID Route để dễ bảo trì)
const DEEP_LINK_CONFIG = {
  // 1. Host và đường dẫn Admin
  ORIGIN: "https://law.dev.samset.net",
  ADMIN_PATH: "admin/aoy5h2zeeq3",

  // 2. UID của View và Tab chính (Nơi chứa danh sách Task)
  MAIN_VIEW: "view/dq2npsytcgh",
  MAIN_TAB: "tab/1tj9l1v5l8t",

  // 3. UID của View Task Detail (Giao diện Modal/Drawer hiện tại)
  TASK_VIEW: "view/a5c9c251a6a",

  // 4. Các từ khóa định nghĩa segment
  KW_FILTER: "filterbytk",
  KW_SOURCE: "sourceid",

  // 5. Hàm lắp ghép URL (Hardcoded Structure)
  buildUrl: (taskId, caseId) => {
    const {
      ORIGIN,
      ADMIN_PATH,
      MAIN_VIEW,
      MAIN_TAB,
      TASK_VIEW,
      KW_FILTER,
      KW_SOURCE,
    } = DEEP_LINK_CONFIG;

    // Lắp ghép theo đúng cấu trúc: Origin/Admin/MainView/Tab/CaseFilter/TaskView/TaskFilter/Source
    return [
      ORIGIN,
      ADMIN_PATH,
      MAIN_VIEW,
      MAIN_TAB,
      `${KW_FILTER}/${caseId}`,
      TASK_VIEW,
      `${KW_FILTER}/${taskId}`,
      `${KW_SOURCE}/${caseId}`,
    ].join("/");
  },
};

const STATUS_CFG = {
  toDo: {
    label: "Chưa thực hiện",
    color: "#595959",
    bg: "#f5f5f5",
    border: "#d9d9d9",
  },
  inProgress: {
    label: "Đang xử lý",
    color: "#1890ff",
    bg: "#e6f4ff",
    border: "#91caff",
  },
  blocked: {
    label: "Bị chặn",
    color: "#722ed1",
    bg: "#f9f0ff",
    border: "#d3adf7",
  },
  pending: {
    label: "Chờ phê duyệt",
    color: "#d46b08",
    bg: "#fff7e6",
    border: "#ffd591",
  },
  approval: {
    label: "Đã phê duyệt",
    color: "#389e0d",
    bg: "#f6ffed",
    border: "#b7eb8f",
  },
  done: {
    label: "Hoàn thành",
    color: "#389e0d",
    bg: "#f6ffed",
    border: "#b7eb8f",
  },
  cancelled: {
    label: "Đã huỷ",
    color: "#cf1322",
    bg: "#fff1f0",
    border: "#ffa39e",
  },
};

const FIELD_LABEL = {
  title: "Tiêu đề",
  status: "Trạng thái",
  priority: "Ưu tiên",
  lawyerId: "Luật sư",
  dueDate: "Deadline",
  startDate: "Ngày bắt đầu",
  closedDate: "Ngày hoàn thành",
  description: "Nội dung diễn biến",
  body: "Nội dung ghi chú",
  estimatedDuration: "Thời gian dự kiến",
  previousTaskId: "Pending Issue",
  nextStepDescription: "Next Step",
  approvedById: "Người xét duyệt",
  approvedAt: "Ngày phân công xét duyệt",
  acceptedAt: "Ngày xét duyệt",
  isRequiredApproval: "Yêu cầu xét duyệt",
  notes: "Bình luận",
  documents: "Tài liệu",
  isDeleted: "Trạng thái xóa",
  assignedLawyerId: "Người thực hiện",
};

const ACTIVITY_FIELD_LABELS = {
  notes: "Ghi chú",
  body: "Nội dung",
  documents: "Tài liệu",
  title: "Tiêu đề",
  status: "Trạng thái",
  assignedLawyerId: "Người thực hiện",
  assignees: "Người được gán",
};

const tF = (f) => FIELD_LABEL[f] || f;
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
  high: { label: "Cao", color: "#cf1322", bg: "#fff1f0", icon: "↑↑" },
  medium: { label: "Trung", color: "#d46b08", bg: "#fff7e6", icon: "↑" },
  low: { label: "Thấp", color: "#389e0d", bg: "#f6ffed", icon: "↓" },
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
  partner: { label: "Luật sư đối tác", color: "#531dab", bg: "#f9f0ff" },
  lawyer: { label: "Luật sư", color: "#096dd9", bg: "#e6f4ff" },
  associate: { label: "Luật sư cộng sự", color: "#08979c", bg: "#e6fffb" },
  suppliant: { label: "Trợ lý pháp lý", color: "#d46b08", bg: "#fff7e6" },
};

const DOC_TYPE_SUGGESTIONS = [
  "Hợp đồng",
  "Biên bản",
  "Quyết định",
  "Tờ trình",
  "Báo cáo",
  "Chứng cứ / Hồ sơ",
  "Công văn",
  "Đơn từ",
  "Phụ lục",
  "Biên bản làm việc",
  "File mẫu",
  "Khác",
];

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

const getFileIcon = (ext) => {
  const e = (ext || "").toLowerCase();
  let url = "https://img.icons8.com/color/48/000000/file.png";
  if (e === ".pdf") url = "https://img.icons8.com/color/48/000000/pdf.png";
  else if ([".doc", ".docx"].includes(e))
    url = "https://img.icons8.com/color/48/000000/microsoft-word-2019.png";
  else if ([".xls", ".xlsx"].includes(e))
    url = "https://img.icons8.com/color/48/000000/microsoft-excel-2019.png";
  else if ([".ppt", ".pptx"].includes(e))
    url =
      "https://img.icons8.com/color/48/000000/microsoft-powerpoint-2019.png";
  else if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(e))
    url = "https://img.icons8.com/color/48/000000/image.png";

  return React.createElement("img", {
    src: url,
    style: { width: 22, height: 22, flexShrink: 0, objectFit: "contain" },
    alt: "icon",
  });
};

const timeAgo = (iso) => {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return fmt(iso, "date");
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
const fmtVND = (n) => {
  if (!n && n !== 0) return "—";
  return Number(n).toLocaleString("vi-VN") + " ₫";
};

const fmtHours = (h) => {
  if (!h && h !== 0) return "—";
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}p`;
  if (mins === 0) return `${hrs}g`;
  return `${hrs}g ${mins}p`;
};

const getFullUrl = (url) =>
  !url
    ? null
    : url.startsWith("http")
      ? url
      : `${window.location.origin}${url}`;

const getCommentText = (html, removeMentions = false) => {
  if (!html) return "";
  if (typeof document !== "undefined") {
    const el = document.createElement("div");
    el.innerHTML = String(html);
    if (removeMentions) {
      el.querySelectorAll(".mention-tag, [data-id]").forEach((node) =>
        node.remove(),
      );
    }
    return (el.textContent || "").replace(/\u00a0/g, " ").trim();
  }

  let text = String(html);
  if (removeMentions) {
    text = text.replace(
      /<span\b[^>]*(?:mention-tag|data-id)[^>]*>[\s\S]*?<\/span>/gi,
      " ",
    );
  }
  return text
    .replace(/<[^>]*>?/gm, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getExtInfo = (ext) =>
  FILE_EXT_ICON[(ext || "").toLowerCase()] || {
    icon: "📎",
    color: "#8c8c8c",
    bg: "#fafafa",
  };
const formatActivityValue = (val) => {
  if (!val) return val;
  const statusMap = {
    toDo: "Chưa thực hiện",
    inProgress: "Đang xử lý",
    blocked: "Đang chờ",
    pending: "Chờ phê duyệt",
    approval: "Đã phê duyệt",
    done: "Hoàn thành",
    cancelled: "Đã huỷ",
  };
  if (statusMap[val]) return statusMap[val];
  const priorityMap = { high: "Cao", medium: "Trung bình", low: "Thấp" };
  if (priorityMap[val]) return priorityMap[val];
  if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return fmt(val, "full");
    } catch {}
  }
  return val;
};

const calcWorkRate = (est, actual) => {
  if (!est || !actual || actual <= 0) return null;
  return Math.round((est / actual) * 100);
};

const workRateCfg = (rate) => {
  if (rate === null || rate === undefined)
    return { label: "—", color: "#8c8c8c", bg: "#f5f5f5" };
  if (rate >= 120)
    return { label: `${rate}% Xuất sắc`, color: "#389e0d", bg: "#f6ffed" };
  if (rate >= 90)
    return { label: `${rate}% Đúng tiến độ`, color: "#096dd9", bg: "#e6f4ff" };
  if (rate >= 70)
    return { label: `${rate}% Chậm`, color: "#d46b08", bg: "#fff7e6" };
  return { label: `${rate}% Kém`, color: "#cf1322", bg: "#fff1f0" };
};

// ============================================================
// §3 API
// ============================================================
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
async function fetchActivityLog(collectionName, recordId) {
  try {
    const collectionMap = {
      tasks: "Task",
      task: "Task",
      Task: "Task",
      subTasks: "SubTask",
      subTask: "SubTask",
      SubTask: "SubTask",
      notes: "Note",
      documents: "Document",
    };
    const normalized = collectionMap[collectionName] || collectionName;
    const res = await ctx.api.request({
      url: "activity_log:list",
      params: {
        pageSize: 200,
        page: 1,
        sort: ["-id"],
        filter: JSON.stringify({
          $and: [
            { collectionName: { $eq: normalized } },
            { recordId: { $eq: recordId } },
          ],
        }),
      },
    });
    return res?.data?.data || [];
  } catch {
    return [];
  }
}
async function fetchNotes(collectionName, recordId, includeDeleted = false) {
  try {
    const filter = {
      $and: [
        { collectionName: { $eq: collectionName } },
        { recordId: { $eq: recordId } },
      ],
    };
    if (!includeDeleted) {
      filter.$and.push({ isDeleted: { $ne: true } });
    }
    const res = await ctx.api.request({
      url: "notes:list",
      params: {
        pageSize: 100,
        page: 1,
        sort: ["-createdAt"],
        filter: JSON.stringify(filter),
        fields:
          "id,title,body,batchId,linkedUrl,collectionName,recordId,createdAt,updatedAt,createdById,replyText,parentId,isDeleted",
        appends: ["createdBy", "updatedBy", "assignees", "parent"],
      },
    });
    return res?.data?.data || [];
  } catch {
    return [];
  }
}

async function fetchFiles(collectionName, recordId, includeDeleted = false) {
  try {
    const filter = {
      $and: [
        { collectionName: { $eq: collectionName } },
        { recordId: { $eq: parseInt(recordId) } },
      ],
    };
    if (!includeDeleted) {
      filter.$and.push({ isDeleted: { $ne: true } });
    }
    const res = await ctx.api.request({
      url: "documents:list",
      params: {
        pageSize: 100,
        page: 1,
        sort: ["-createdAt"],
        filter: JSON.stringify(filter),
        fields:
          "id,title,documentCode,documentType,batchId,collectionName,recordId,googleDriveUrl,note,createdAt,updatedAt,createdById,isDeleted",
        appends: ["fileAttachment", "createdBy", "updatedBy"],
      },
    });
    return res?.data?.data || [];
  } catch {
    return [];
  }
}
function initcap(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
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
      changedByName: changedByName || "Hệ thống",
      changedAt: now,
      createdAt: now,
      batchId: batchId || null,
      dataId: dataId || null,
    });
  } catch {}
}
async function fetchTimesheets(filter) {
  try {
    const res = await ctx.api.request({
      url: "timesheets:list",
      params: {
        pageSize: 200,
        page: 1,
        sort: ["-workingDay", "-createdAt"],
        filter: JSON.stringify(filter),
      },
    });
    return res?.data?.data || [];
  } catch {
    return [];
  }
}
const createTimesheet = (payload) =>
  apiReq("timesheets:create", "POST", payload);
const updateTimesheet = (id, payload) =>
  ctx.api.request({
    url: "timesheets:update",
    method: "POST",
    params: { filterByTk: id },
    data: payload,
  });
const deleteTimesheet = (id) =>
  ctx.api.request({
    url: "timesheets:destroy",
    method: "POST",
    params: { filterByTk: id },
  });

// ============================================================
// §4 PERMISSION
// ============================================================
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

const getFolderPermissions = (folder, user, allFolders, currentLawyerId) => {
  if (isAdminUser(user))
    return { isManager: true, isMember: true, canEdit: true };
  if (!folder) return { isManager: true, isMember: true, canEdit: true };
  if (!user) return { isManager: false, isMember: false, canEdit: false };

  const uid = extractId(user.id);
  const lwId = extractId(currentLawyerId);

  // Owner check (Nocobase user ID)
  if (extractId(folder.createdById) === uid) {
    return { isManager: true, isMember: true, canEdit: true };
  }

  const managers = folder.folderManager || folder.folderManagers || [];
  const members = folder.folderMember || folder.folderMembers || [];

  // Check explicit permissions using Lawyer ID
  if (lwId) {
    const isExplicitManager = managers.some((m) => extractId(m.id) === lwId);
    if (isExplicitManager)
      return { isManager: true, isMember: true, canEdit: true };

    const explicitMember = members.find((m) => extractId(m.id) === lwId);
    if (explicitMember) {
      const role =
        explicitMember.folderMembers?.role || explicitMember.role || "viewer";
      const canEdit = role === "editor";
      return { isManager: false, isMember: true, canEdit };
    }
  }

  // Inherit from parent
  const pId = extractId(folder.parentId);
  if (!pId || pId === "root")
    return { isManager: false, isMember: false, canEdit: false };

  const parentFolder = allFolders.find(
    (f) => String(extractId(f.id)) === String(pId),
  );
  if (!parentFolder)
    return { isManager: false, isMember: false, canEdit: false };

  return getFolderPermissions(parentFolder, user, allFolders, currentLawyerId);
};

const getVisibleFolderIds = (allFolders, currentUser, currentLawyerId) => {
  const accessible = new Set();
  const uid = extractId(currentUser?.id);
  const lwId = extractId(currentLawyerId);

  if (isAdminUser(currentUser)) {
    allFolders.forEach((f) => accessible.add(extractId(f.id)));
    return { accessible, navOnly: new Set() };
  }

  if (!uid) return { accessible, navOnly: new Set() };

  allFolders.forEach((f) => {
    const fId = extractId(f.id);
    if (extractId(f.createdById) === uid) {
      accessible.add(fId);
      return;
    }
    if (lwId) {
      const managers = f.folderManager || f.folderManagers || [];
      const members = f.folderMember || f.folderMembers || [];
      if (
        managers.some((m) => extractId(m.id) === lwId) ||
        members.some((m) => extractId(m.id) === lwId)
      ) {
        accessible.add(fId);
        return;
      }
    }
  });

  const getDescendantIdsRecursive = (pId, list) => {
    let ids = [];
    list.forEach((f) => {
      if (extractId(f.parentId) === pId) {
        const id = extractId(f.id);
        ids.push(id);
        ids = ids.concat(getDescendantIdsRecursive(id, list));
      }
    });
    return ids;
  };

  const directIds = Array.from(accessible);
  directIds.forEach((pId) => {
    const descIds = getDescendantIdsRecursive(pId, allFolders);
    descIds.forEach((id) => accessible.add(id));
  });

  const navOnly = new Set();
  accessible.forEach((fId) => {
    let curr = allFolders.find((f) => extractId(f.id) === fId);
    while (curr && curr.parentId) {
      const pId = extractId(curr.parentId);
      if (pId && !accessible.has(pId)) {
        navOnly.add(pId);
      }
      curr = allFolders.find((f) => extractId(f.id) === pId);
    }
  });

  return { accessible, navOnly };
};

const buildPerm = ({ currentUser, myLawyer, isManager, itemLawyerId }) => {
  const isAdmin = isAdminUser(currentUser);
  const isAssignedToThis = !!(
    myLawyer &&
    itemLawyerId &&
    myLawyer.id === itemLawyerId
  );
  const isAssigneeOnly = !!myLawyer && !isManager;
  return {
    isManager,
    isAssigneeOnly,
    isAssignedToThis,
    canEdit: !isAssigneeOnly || isAssignedToThis,
    canManage: ((isAdmin || isManager) && !isAssigneeOnly) || isAssignedToThis,
    canAccessFilesAndTimesheet: isManager || isAssignedToThis,
  };
};

const resolveStatus = (newStatus, item) => {
  if (newStatus === "done" && item?.isRequiredApproval) return "pending";
  if (newStatus === "approval") return "done";
  return newStatus;
};

// ============================================================
// §5 ATOMS
// ============================================================

const ReloadButton = ({ onReload, loading, text = "Làm mới", style = {} }) => {
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
      title: "Cần phê duyệt",
    },
    React.createElement("span", { style: { fontSize: 12 } }, "🔐"),
  );
};

const TruncatedCell = ({
  value,
  maxLen = 30,
  style = {},
  showTooltip = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  if (!value)
    return React.createElement(
      Text,
      { style: { fontSize: 12, color: "#bfbfbf", fontFamily: FONT } },
      "—",
    );
  const needTruncate = value.length > maxLen;
  const display =
    !expanded && needTruncate ? value.slice(0, maxLen) + "…" : value;
  const textEl = React.createElement(
    "span",
    null,
    React.createElement(
      Text,
      {
        style: {
          fontSize: 12,
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
          fontFamily: FONT,
          ...style,
        },
      },
      display,
    ),
    needTruncate &&
      React.createElement(
        "span",
        {
          onClick: (e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          },
          style: {
            fontSize: 12,
            color: "#1890ff",
            cursor: "pointer",
            userSelect: "none",
            marginLeft: 4,
          },
        },
        expanded ? "Thu gọn" : "Xem thêm",
      ),
  );
  if (showTooltip && needTruncate)
    return React.createElement(
      Tooltip,
      { title: value, placement: "topLeft" },
      textEl,
    );
  return textEl;
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
              "🔒 Chỉ quản lý hoặc người phụ trách mới được đổi trạng thái",
            );
            return;
          }
          setOpen((v) => !v);
        },
        title: readOnly
          ? "Không có quyền chỉnh sửa"
          : isBlocked
            ? "Task đang bị block bởi task trước"
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
      "Tiêu đề",
    ),
    React.createElement(
      "div",
      { style: { width: COL.updatedAt, textAlign: "center", flexShrink: 0 } },
      "Ngày updated",
    ),
    React.createElement(
      "div",
      { style: { width: COL.assign, textAlign: "center", flexShrink: 0 } },
      "Người phụ trách",
    ),
    React.createElement(
      "div",
      { style: { width: COL.desc, flexShrink: 0, padding: "0 8px" } },
      "Nội dung diễn biến",
    ),
    React.createElement(
      "div",
      { style: { width: COL.start, textAlign: "center", flexShrink: 0 } },
      "Bắt đầu",
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
      "Tài liệu",
    ),
    React.createElement("div", {
      style: { width: COL.approval, flexShrink: 0 },
    }),
    React.createElement("div", {
      style: { width: COL.history, flexShrink: 0 },
    }),
    React.createElement("div", { style: { width: COL.menu, flexShrink: 0 } }),
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
            `${Number(l.unitPrice).toLocaleString("vi-VN")} ₫/giờ`,
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
        placeholder: "Tìm luật sư...",
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
          React.createElement("span", null, "Huỷ phân công"),
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
            "Khác",
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
                title: "Phân công luật sư",
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
  services = [],
}) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const cur = useMemo(
    () => allTasks.find((t) => t.id === value),
    [allTasks, value],
  );
  const serviceMap = useMemo(() => {
    const m = { __none__: "Chưa gắn dịch vụ" };
    services.forEach((s) => {
      m[String(s.id)] = s.serviceName;
    });
    return m;
  }, [services]);

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
      const key = t.serviceId ? String(t.serviceId) : "__none__";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });

    const serviceKeys = services.map((s) => String(s.id)).filter((k) => map[k]);
    const noneKey = map["__none__"] ? ["__none__"] : [];
    return [...serviceKeys, ...noneKey].map((k) => ({
      key: k,
      label: serviceMap[k] || "Dịch vụ #" + k,
      tasks: map[k],
    }));
  }, [filtered, services, serviceMap]);

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
          top: "100%",
          left: 0,
          zIndex: 9999,
          background: "#fff",
          border: "1px solid #e8e8e8",
          borderRadius: 6,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          width: 460,
          marginTop: 4,
          display: "flex",
          flexDirection: "column",
          maxHeight: 440,
        },
      },
      React.createElement(
        "div",
        { style: { padding: "8px 10px 6px", flexShrink: 0 } },
        React.createElement("input", {
          autoFocus: true,
          value: q,
          onChange: (e) => setQ(e.target.value),
          placeholder: "Tìm công việc theo tên...",
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
              "Không có công việc nào",
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
                  fontSize: 14,
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
                fontSize: 14,
                fontFamily: FONT,
                color: "#bfbfbf",
                flex: 1,
              },
            },
            "Chọn công việc điều kiện...",
          ),
    ),
    renderDropdown(),
  );
};

// ============================================================
// §7 SHARED TABS
// ============================================================

const HistoryPanel = ({ collectionName, recordId, canAccess = true }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const collectionMap = {
    tasks: "Task",
    task: "Task",
    Task: "Task",
    subTasks: "SubTask",
    subTask: "SubTask",
    SubTask: "SubTask",
  };
  const normalizedName = collectionMap[collectionName] || collectionName;

  useEffect(() => {
    if (!canAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchActivityLog(normalizedName, recordId),
      fetchNotes(normalizedName, recordId),
      fetchFiles(normalizedName, recordId),
    ]).then(([logs, notes, files]) => {
      const logItems = logs.map((a) => ({
        _kind: "log",
        _time: new Date(
          a.action === "created" ? a.createdAt : a.changedAt || a.updatedAt,
        ),
        data: a,
      }));
      const noteItems = notes.map((n) => ({
        _kind: "note",
        _time: new Date(n.createdAt),
        data: n,
      }));
      const fileItems = files.map((f) => ({
        _kind: "file",
        _time: new Date(f.createdAt),
        data: f,
      }));
      setItems(
        [...logItems, ...noteItems, ...fileItems].sort(
          (a, b) => b._time - a._time,
        ),
      );
      setLoading(false);
    });
  }, [recordId, normalizedName, canAccess]);

  const authorName = (n) =>
    n.createdBy?.nickname ||
    n.createdBy?.username ||
    n.createdBy?.email ||
    (n.createdById ? `User #${n.createdById}` : "Ẩn danh");
  if (!canAccess)
    return React.createElement(
      "div",
      {
        style: {
          margin: "0 28px 0 28px",
          padding: "16px",
          background: "#fafafa",
          border: "1px dashed #d9d9d9",
          borderRadius: 6,
          display: "flex",
          alignItems: "center",
          gap: 8,
        },
      },
      React.createElement("span", null, "🔒"),
      React.createElement(
        Text,
        { style: { fontSize: 12, fontFamily: FONT, color: "#8c8c8c" } },
        "Bạn không có quyền xem lịch sử của task này.",
      ),
    );

  const renderLog = (a, key) => {
    const isCreate = a.action === "created";
    const timeVal = isCreate ? a.createdAt : a.changedAt || a.updatedAt;
    return React.createElement(
      "div",
      {
        key,
        style: {
          display: "flex",
          gap: 8,
          padding: "6px 0",
          borderBottom: "1px solid #f5f5f5",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            width: 22,
            height: 22,
            borderRadius: "50%",
            flexShrink: 0,
            background: isCreate ? "#f6ffed" : "#fff7e6",
            border: `1px solid ${isCreate ? "#b7eb8f" : "#ffd591"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
          },
        },
        isCreate ? "✨" : "✏️",
      ),
      React.createElement(
        "div",
        { style: { flex: 1, minWidth: 0 } },
        React.createElement(
          "div",
          {
            style: { display: "flex", justifyContent: "space-between", gap: 4 },
          },
          React.createElement(
            "span",
            { style: { fontSize: 12, fontFamily: FONT, color: "#262626" } },
            React.createElement("b", null, a.changedByName || "Hệ thống"),
            ` ${isCreate ? "tạo" : "sửa"} [${tF(a.fieldName || "")}]`,
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: "#bfbfbf",
                flexShrink: 0,
              },
            },
            timeAgo(timeVal),
          ),
        ),
        (a.oldValue || a.newValue) &&
          !isCreate &&
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 2,
                flexWrap: "wrap",
              },
            },
            a.oldValue &&
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 12,
                    color: "#cf1322",
                    background: "#fff1f0",
                    padding: "1px 5px",
                    borderRadius: 3,
                    textDecoration: "line-through",
                  },
                },
                formatActivityValue(a.oldValue),
              ),
            a.oldValue &&
              a.newValue &&
              React.createElement(
                "span",
                { style: { fontSize: 12, color: "#8c8c8c" } },
                "→",
              ),
            a.newValue &&
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 12,
                    color: "#389e0d",
                    background: "#f6ffed",
                    padding: "1px 5px",
                    borderRadius: 3,
                  },
                },
                formatActivityValue(a.newValue),
              ),
          ),
      ),
    );
  };

  const renderNote = (n, key) =>
    React.createElement(
      "div",
      {
        key,
        style: {
          display: "flex",
          gap: 8,
          padding: "6px 0",
          borderBottom: "1px solid #f5f5f5",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            width: 22,
            height: 22,
            borderRadius: "50%",
            flexShrink: 0,
            background: "#e6fffb",
            border: "1px solid #87e8de",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
          },
        },
        "📝",
      ),
      React.createElement(
        "div",
        { style: { flex: 1, minWidth: 0 } },
        React.createElement(
          "div",
          {
            style: { display: "flex", justifyContent: "space-between", gap: 4 },
          },
          React.createElement(
            "span",
            { style: { fontSize: 12, fontFamily: FONT, color: "#262626" } },
            React.createElement("b", null, authorName(n)),
            " thêm ghi chú",
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: "#bfbfbf",
                flexShrink: 0,
              },
            },
            timeAgo(n.createdAt),
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              marginTop: 3,
              background: "#e6fffb",
              border: "1px solid #87e8de",
              borderLeft: "2px solid #13c2c2",
              borderRadius: 4,
              padding: "4px 8px",
            },
          },
          n.title &&
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  fontWeight: 600,
                  color: "#006d75",
                },
              },
              n.title,
            ),
          n.body &&
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#595959",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                },
              },
              (() => {
                const plainText = n.body.replace(/<[^>]*>?/gm, "").trim();
                return plainText.length > 100
                  ? plainText.slice(0, 100) + "…"
                  : plainText;
              })(),
            ),
        ),
      ),
    );

  const renderFile = (f, key) => {
    const att = Array.isArray(f.fileAttachment)
      ? f.fileAttachment[0]
      : f.fileAttachment;
    const fileExt = att?.extname || "";
    const extInfo = getExtInfo(fileExt);
    const fullUrl = getFullUrl(att?.url || att?.preview);
    return React.createElement(
      "div",
      {
        key,
        style: {
          display: "flex",
          gap: 8,
          padding: "6px 0",
          borderBottom: "1px solid #f5f5f5",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            width: 22,
            height: 22,
            borderRadius: "50%",
            flexShrink: 0,
            background: "#f9f0ff",
            border: "1px solid #d3adf7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
          },
        },
        "📎",
      ),
      React.createElement(
        "div",
        { style: { flex: 1, minWidth: 0 } },
        React.createElement(
          "div",
          {
            style: { display: "flex", justifyContent: "space-between", gap: 4 },
          },
          React.createElement(
            "span",
            { style: { fontSize: 12, fontFamily: FONT, color: "#262626" } },
            React.createElement(
              "b",
              null,
              f.createdBy
                ? userName(f.createdBy) || f.createdBy?.email
                : "Hệ thống",
            ),
            " upload tài liệu",
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: "#bfbfbf",
                flexShrink: 0,
              },
            },
            timeAgo(f.createdAt),
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              marginTop: 3,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#f9f0ff",
              border: "1px solid #d3adf7",
              borderLeft: "2px solid #722ed1",
              borderRadius: 4,
              padding: "4px 8px",
            },
          },
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
            (f.title || att?.title || att?.filename || "(Chưa có tên)") +
              fileExt,
          ),
          fullUrl &&
            React.createElement(
              "span",
              {
                onClick: (e) => {
                  e.stopPropagation();
                  window.open(fullUrl, "_blank");
                },
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#531dab",
                  cursor: "pointer",
                  flexShrink: 0,
                  padding: "1px 6px",
                  border: "1px solid #d3adf7",
                  borderRadius: 3,
                  background: "#fff",
                },
              },
              "⬇️",
            ),
        ),
      ),
    );
  };

  return React.createElement(
    "div",
    {
      style: {
        margin: "0 0 0 28px",
        padding: "8px 12px",
        background: "#fafafa",
        borderLeft: "2px solid #e8e8e8",
        borderBottom: "1px solid #f0f0f0",
      },
    },
    loading
      ? React.createElement(
          "div",
          { style: { textAlign: "center", padding: "8px 0" } },
          React.createElement(Spin, { size: "small" }),
        )
      : items.length === 0
        ? React.createElement(
            Text,
            {
              style: {
                fontSize: 12,
                color: "#bfbfbf",
                display: "block",
                padding: "4px 0",
                fontFamily: FONT,
              },
            },
            "Chưa có hoạt động nào",
          )
        : React.createElement(
            "div",
            null,
            ...items.map((item, i) => {
              const key = `hp-${item._kind}-${i}`;
              if (item._kind === "log") return renderLog(item.data, key);
              if (item._kind === "note") return renderNote(item.data, key);
              if (item._kind === "file") return renderFile(item.data, key);
              return null;
            }),
          ),
  );
};
// ======================== HELPER ====================================
// Helper: parse text và highlight @mention màu xanh
const renderTextWithMentions = (text, lawyers) => {
  if (!text) return null;
  return React.createElement("div", {
    dangerouslySetInnerHTML: { __html: text },
    style: { whiteSpace: "pre-wrap" },
  });
};

// ============================================================
// §RICHTEXT — QuillEditor (ctx.requireAsync CDN) + MentionPicker + CommentComposer
// ============================================================

// ── Async loader: ctx.requireAsync returns the UMD export directly ────
// Per Nocobase docs, ctx.requireAsync('...js') returns the library object.
// For Quill UMD: the return value IS the Quill constructor.
// We must NOT access window.Quill (window.* globals are sandboxed).
let _quillLoadPromise = null;
const QUILL_FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px"];
const QUILL_SIZE_LABEL_CSS = QUILL_FONT_SIZES.map(
  (size) => `
    .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="${size}"]::before,
    .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="${size}"]::before { content: "${size}"; }
  `,
).join("");
const loadQuillAsync = () => {
  if (_quillLoadPromise) return _quillLoadPromise;
  _quillLoadPromise = ctx
    .requireAsync(
      "https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.snow.css",
    )
    .then(() =>
      ctx.requireAsync(
        "https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.min.js",
      ),
    )
    .then((QuillLib) => {
      // Normalize UMD export: could be the class itself, .default, or .Quill
      const Q =
        QuillLib && typeof QuillLib === "function"
          ? QuillLib
          : (QuillLib && QuillLib.default) ||
            (QuillLib && QuillLib.Quill) ||
            QuillLib;
      if (!Q) throw new Error("Quill constructor not found in UMD export");
      try {
        const SizeStyle = Q.import("attributors/style/size");
        SizeStyle.whitelist = QUILL_FONT_SIZES;
        Q.register(SizeStyle, true);
      } catch {}
      return Q;
    });
  return _quillLoadPromise;
};
// Kick off loading immediately so Quill is ready when component mounts
loadQuillAsync().catch(() => {});

// ── QuillEditor ────────────────────────────────────────────────────
const QUILL_CUSTOM_CSS = `
    .ql-container.ql-snow { border: none !important; font-family: Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; border-radius: 0 0 8px 8px !important; }
    .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #f0f0f0 !important; padding: 6px 8px !important; background: #f8f8f8 !important; border-radius: 8px 8px 0 0 !important; flex-wrap: wrap !important; }
    .ql-editor { min-height: 110px; max-height: 380px; overflow-y: auto; font-size: 14px; line-height: 1.7; padding: 12px 16px; font-family: Montserrat, sans-serif; }
    .ql-editor.ql-blank::before { color: #bfbfbf; font-style: normal; }
    .ql-editor blockquote { border-left: 3px solid #1890ff; padding-left: 10px; color: #595959; margin: 6px 0; }
    .ql-editor pre { background: #f6f8fa; border-radius: 6px; padding: 10px 14px; font-size: 12.5px; color: #333; }
    .ql-snow .ql-stroke { stroke: #555 !important; }
    .ql-snow .ql-fill { fill: #555 !important; }
    .ql-snow.ql-toolbar button:hover .ql-stroke, .ql-snow .ql-toolbar button:hover .ql-stroke { stroke: #1890ff !important; }
    .ql-snow.ql-toolbar button.ql-active .ql-stroke { stroke: #1890ff !important; }
    .ql-snow.ql-toolbar button.ql-active .ql-fill { fill: #1890ff !important; }
    .ql-snow .ql-picker.ql-size { width: 68px !important; }
    .ql-snow .ql-picker.ql-size .ql-picker-label::before { content: "14px"; }
    ${QUILL_SIZE_LABEL_CSS}
    .wysiwyg-content.ql-editor { padding: 0 !important; min-height: auto !important; max-height: none !important; overflow-y: visible !important; border: none !important; }
  `;

const QuillEditor = ({
  value,
  onChange,
  placeholder,
  onSubmit,
  onUploadClick,
}) => {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const onUploadClickRef = useRef(onUploadClick);
  const onSubmitRef = useRef(onSubmit);

  useEffect(() => {
    onUploadClickRef.current = onUploadClick;
  }, [onUploadClick]);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  // Load Quill via ctx.requireAsync then init
  useEffect(() => {
    let destroyed = false;
    const cleanupFns = [];
    loadQuillAsync()
      .then((Quill) => {
        if (destroyed || !containerRef.current) return;
        if (quillRef.current) {
          setReady(true);
          return;
        } // already mounted

        const q = new Quill(containerRef.current, {
          theme: "snow",
          placeholder: placeholder || "Viết bình luận...",
          modules: {
            toolbar: {
              container: [
                [{ size: QUILL_FONT_SIZES }],
                ["bold", "italic", "underline", "strike"],
                [{ align: [] }],
                [{ indent: "-1" }, { indent: "+1" }],
                ["blockquote", "code-block"],
                [{ list: "ordered" }, { list: "bullet" }],
                ["link", "upload"],
                ["clean"],
              ],
              handlers: {
                upload: function () {
                  if (onUploadClickRef.current) onUploadClickRef.current();
                },
                size: function (value) {
                  const range = this.quill.getSelection(true);
                  if (!range) return;
                  this.quill.focus();
                  if (range.length === 0) {
                    this.quill.format("size", value || false, "user");
                    return;
                  }
                  this.quill.formatText(
                    range.index,
                    range.length,
                    "size",
                    value || false,
                    "user",
                  );
                  this.quill.setSelection(range.index, range.length, "silent");
                },
              },
            },
          },
        });

        // Inject custom SVG icon for upload button
        const uploadBtn =
          containerRef.current.parentElement.querySelector(".ql-upload");
        if (uploadBtn) {
          uploadBtn.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>';
          uploadBtn.title = "Đính kèm tài liệu";
        }

        // Add Tooltips to Quill toolbar buttons
        const tooltipMap = {
          ".ql-bold": "In đậm (Ctrl+B)",
          ".ql-italic": "In nghiêng (Ctrl+I)",
          ".ql-underline": "Gạch chân (Ctrl+U)",
          ".ql-strike": "Gạch ngang",
          '.ql-indent[value="-1"]': "Giảm lề",
          '.ql-indent[value="+1"]': "Tăng lề",
          ".ql-blockquote": "Trích dẫn",
          ".ql-code-block": "Đoạn mã",
          '.ql-list[value="ordered"]': "Danh sách số",
          '.ql-list[value="bullet"]': "Danh sách chấm",
          ".ql-link": "Chèn liên kết",
          ".ql-clean": "Xóa định dạng",
        };
        Object.entries(tooltipMap).forEach(([selector, title]) => {
          const el = containerRef.current.parentElement.querySelector(selector);
          if (el) el.setAttribute("title", title);
        });
        const headerPicker = containerRef.current.parentElement.querySelector(
          ".ql-size .ql-picker-label",
        );
        if (headerPicker) headerPicker.setAttribute("title", "Kích cỡ chữ");
        const alignPicker = containerRef.current.parentElement.querySelector(
          ".ql-align .ql-picker-label",
        );
        if (alignPicker) alignPicker.setAttribute("title", "Căn lề");

        // Sync initial value
        if (value) {
          q.clipboard.dangerouslyPasteHTML(value);
          q.setSelection(q.getLength(), 0);
        }

        q.on("text-change", () => {
          const editorEl =
            containerRef.current &&
            containerRef.current.querySelector(".ql-editor");
          if (!editorEl) return;
          const html = editorEl.innerHTML;
          const empty = html === "<p><br></p>" || html === "";
          onChange(empty ? "" : html);
        });

        const handleSubmitShortcut = (e) => {
          if (!((e.ctrlKey || e.metaKey) && e.key === "Enter")) return;
          if (e.isComposing) return;
          if (!onSubmitRef.current) return;
          e.preventDefault();
          onSubmitRef.current();
        };
        q.root.addEventListener("keydown", handleSubmitShortcut, true);
        cleanupFns.push(() =>
          q.root.removeEventListener("keydown", handleSubmitShortcut, true),
        );

        quillRef.current = q;
        setReady(true);
      })
      .catch((e) => {
        console.error("Quill load error:", e);
        setError("Không thể tải editor. Vui lòng kiểm tra kết nối mạng.");
      });

    return () => {
      destroyed = true;
      cleanupFns.forEach((fn) => fn());
    };
  }, []); // intentional — only init once

  // Sync external clear (value reset to "")
  useEffect(() => {
    if (!quillRef.current || !containerRef.current) return;
    const editorEl = containerRef.current.querySelector(".ql-editor");
    if (!editorEl) return;
    if (!value && editorEl.innerHTML && editorEl.innerHTML !== "<p><br></p>") {
      quillRef.current.setText("");
    }
  }, [value]);

  return React.createElement(
    "div",
    {
      style: {
        border: "1px solid #d9d9d9",
        borderRadius: 8,
        background: "#fff",
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
      },
    },
    // Inject Quill custom CSS via React style element (sandbox-safe)
    React.createElement("style", null, QUILL_CUSTOM_CSS),
    error
      ? React.createElement(
          "div",
          {
            style: {
              padding: "12px 16px",
              color: "#ff4d4f",
              fontSize: 13,
              fontFamily: FONT,
            },
          },
          error,
        )
      : !ready
        ? React.createElement(
            "div",
            {
              style: {
                padding: "12px 16px",
                color: "#bfbfbf",
                fontSize: 13,
                fontFamily: FONT,
              },
            },
            "Đang tải editor...",
          )
        : null,
    React.createElement("div", { ref: containerRef }),
  );
};

// ── MentionPicker ──────────────────────────────────────────────────
// Standalone "@ Nhắc đến ai" button + dropdown. No global event listeners.
// Outside-click detection uses a fullscreen backdrop overlay (sandbox-safe pattern).
const MentionPicker = ({ lawyers, assignedIds, onAssignMultiple }) => {
  const { Tag } = ctx.antd;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const pickerRef = React.useRef(null);

  const closeDropdown = () => {
    setOpen(false);
    setSearch("");
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? lawyers.filter((l) => l.lawyerName.toLowerCase().includes(q))
      : lawyers;
  }, [lawyers, search]);

  const toggle = (lawyer) => {
    const already = assignedIds.includes(lawyer.id);
    const next = already
      ? assignedIds.filter((id) => id !== lawyer.id)
      : [...assignedIds, lawyer.id];
    onAssignMultiple(next);
  };

  const removeTag = (id) =>
    onAssignMultiple(assignedIds.filter((i) => i !== id));

  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
        marginTop: 8,
      },
    },

    // ── @ Button ─────────────────────────────────────────────────
    React.createElement(
      "div",
      { ref: pickerRef, style: { position: "relative" } },
      React.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            setOpen((v) => !v);
            setSearch("");
          },
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            fontFamily: FONT,
            fontWeight: 600,
            padding: "5px 12px",
            borderRadius: 20,
            border: open ? "1px solid #1890ff" : "1px solid #d9d9d9",
            background: open ? "#e6f4ff" : "#fff",
            color: open ? "#096dd9" : "#595959",
            cursor: "pointer",
            userSelect: "none",
            transition: "all 0.15s",
          },
          onMouseEnter: (e) => {
            if (!open) {
              e.currentTarget.style.borderColor = "#1890ff";
              e.currentTarget.style.color = "#1890ff";
            }
          },
          onMouseLeave: (e) => {
            if (!open) {
              e.currentTarget.style.borderColor = "#d9d9d9";
              e.currentTarget.style.color = "#595959";
            }
          },
        },
        React.createElement(
          "span",
          { style: { fontSize: 14, fontWeight: 700 } },
          "@",
        ),
        "Nhắc đến ai",
      ),

      // ── Dropdown ───────────────────────────────────────────────
      open &&
        React.createElement(
          "div",
          {
            style: {
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              zIndex: 9999,
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
              minWidth: 240,
              maxHeight: 280,
              overflowY: "auto",
              padding: "6px 0",
            },
          },
          // Search input
          React.createElement(
            "div",
            {
              style: { padding: "6px 10px", borderBottom: "1px solid #f0f0f0" },
            },
            React.createElement("input", {
              autoFocus: true,
              value: search,
              onChange: (e) => setSearch(e.target.value),
              placeholder: "Tìm tên luật sư...",
              style: {
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid #e0e0e0",
                borderRadius: 8,
                padding: "5px 10px",
                fontSize: 12,
                fontFamily: FONT,
                outline: "none",
              },
            }),
          ),
          // List
          filtered.length === 0
            ? React.createElement(
                "div",
                {
                  style: {
                    padding: "12px",
                    textAlign: "center",
                    color: "#bfbfbf",
                    fontSize: 12,
                    fontFamily: FONT,
                  },
                },
                "Không tìm thấy",
              )
            : filtered.map((l) => {
                const selected = assignedIds.includes(l.id);
                return React.createElement(
                  "div",
                  {
                    key: l.id,
                    onMouseDown: (e) => {
                      e.preventDefault();
                      toggle(l);
                    },
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 14px",
                      cursor: "pointer",
                      background: selected ? "#e6f4ff" : "transparent",
                      borderLeft: selected
                        ? "3px solid #1890ff"
                        : "3px solid transparent",
                      transition: "background 0.1s",
                    },
                    onMouseEnter: (e) => {
                      if (!selected)
                        e.currentTarget.style.background = "#f5f5f5";
                    },
                    onMouseLeave: (e) => {
                      if (!selected)
                        e.currentTarget.style.background = "transparent";
                    },
                  },
                  React.createElement(Av, { name: l.lawyerName, size: 28 }),
                  React.createElement(
                    "div",
                    { style: { flex: 1 } },
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 13,
                          fontWeight: selected ? 700 : 400,
                          color: selected ? "#096dd9" : "#262626",
                          fontFamily: FONT,
                        },
                      },
                      l.lawyerName,
                    ),
                    l.lawyerType &&
                      React.createElement(
                        "div",
                        { style: { fontSize: 11, color: "#8c8c8c" } },
                        l.lawyerType,
                      ),
                  ),
                  selected &&
                    React.createElement(
                      "span",
                      {
                        style: {
                          fontSize: 16,
                          color: "#1890ff",
                          fontWeight: 700,
                        },
                      },
                      "✓",
                    ),
                );
              }),
        ),
    ),

    // ── Selected Tags ─────────────────────────────────────────────
    assignedIds.map((id) => {
      const lawyer = lawyers.find((l) => l.id === id);
      if (!lawyer) return null;
      return React.createElement(
        Tag,
        {
          key: id,
          closable: true,
          onClose: () => removeTag(id),
          style: {
            borderRadius: 16,
            background: "#e6f4ff",
            color: "#096dd9",
            border: "1px solid #91caff",
            fontSize: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 10px 2px 6px",
          },
        },
        React.createElement(Av, { name: lawyer.lawyerName, size: 16 }),
        lawyer.lawyerName,
      );
    }),
  );
};

// ── CommentComposer — wraps QuillEditor + MentionPicker ────────────
const CommentComposer = ({
  value,
  onChange,
  onAssignMultiple,
  assignedIds,
  lawyers,
  placeholder,
  onSubmit,
  onUploadClick,
}) => {
  return React.createElement(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 0 } },
    React.createElement(QuillEditor, {
      value,
      onChange,
      placeholder,
      onSubmit,
      onUploadClick,
    }),
    React.createElement(MentionPicker, {
      lawyers,
      assignedIds,
      onAssignMultiple,
    }),
  );
};

// 🌟 HÀM RENDER VĂN BẢN (HỖ TRỢ MENTION VÀ ĐỊNH DẠNG B/I/U)
const renderRichText = (text, lawyers) => {
  if (!text) return null;

  // Kiểm tra xem text có phải HTML (WYSIWYG) hay không. Quill luôn bọc nội dung bằng thẻ block (vd <p>, <ol>).
  const isHtml = /<[a-z][\s\S]*>/i.test(text);

  if (isHtml) {
    return React.createElement("div", {
      dangerouslySetInnerHTML: { __html: text },
      className: "wysiwyg-content ql-editor",
      style: { whiteSpace: "pre-wrap", wordBreak: "break-word" },
    });
  }

  // --- Hỗ trợ tương thích ngược cho text Markdown cũ ---
  const escapedNames = lawyers
    .map((l) => l.lawyerName)
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${()|[\]\\]/g, "\\$&"));
  const mentionPattern = new RegExp(`(@(?:${escapedNames.join("|")}))`, "g");

  return text.split("\n").map((line, lineIdx) => {
    const parts = line.split(mentionPattern);
    const renderedLine = parts.map((part, i) => {
      if (
        part.startsWith("@") &&
        lawyers.some((l) => part === `@${l.lawyerName}`)
      ) {
        return React.createElement(
          "span",
          {
            key: `m-${i}`,
            style: {
              color: "#096dd9",
              background: "#e6f4ff",
              borderRadius: 4,
              padding: "0 4px",
              fontWeight: 600,
              fontSize: 13,
              border: "1px solid #91caff",
              margin: "0 2px",
              display: "inline-block",
            },
          },
          part,
        );
      }
      let subParts = [part];
      const boldRegex = /(\*\*(.*?)\*\*)/g;
      let newSubParts = [];
      subParts.forEach((p) => {
        if (typeof p !== "string") {
          newSubParts.push(p);
          return;
        }
        const segments = p.split(boldRegex);
        for (let j = 0; j < segments.length; j++) {
          if (j % 3 === 2) {
            newSubParts.push(
              React.createElement("b", { key: `b-${i}-${j}` }, segments[j]),
            );
            j++;
          } else if (j % 3 === 0) {
            if (segments[j]) newSubParts.push(segments[j]);
          }
        }
      });
      subParts = newSubParts;
      const italicRegex = /(\*(.*?)\*)/g;
      newSubParts = [];
      subParts.forEach((p, idx) => {
        if (typeof p !== "string") {
          newSubParts.push(p);
          return;
        }
        const segments = p.split(italicRegex);
        for (let j = 0; j < segments.length; j++) {
          if (j % 3 === 2) {
            newSubParts.push(
              React.createElement(
                "i",
                { key: `i-${i}-${idx}-${j}` },
                segments[j],
              ),
            );
            j++;
          } else if (j % 3 === 0) {
            if (segments[j]) newSubParts.push(segments[j]);
          }
        }
      });
      subParts = newSubParts;
      return React.createElement(
        React.Fragment,
        { key: `t-${i}` },
        ...subParts,
      );
    });
    return React.createElement(
      "div",
      { key: `l-${lineIdx}`, style: { minHeight: "1.2em", marginBottom: 2 } },
      renderedLine,
    );
  });
};

// 🌟 WYSIWYG RICH TEXT EDITOR V6 - CONTENT_EDITABLE + INLINE MENTIONS
const RichMentionInput = ({
  value,
  onChange,
  onAssignMultiple,
  assignedIds,
  lawyers,
  placeholder,
  onSubmit,
  onUploadClick, // Thêm prop cho nút upload
}) => {
  const { Tag, Tooltip } = ctx.antd;
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const dropdownRef = useRef(null);

  const [showDD, setShowDD] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  // Filter lawyers based on query
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const list = q
      ? lawyers.filter((l) => l.lawyerName.toLowerCase().includes(q))
      : lawyers;
    return list.slice(0, 8);
  }, [lawyers, query]);

  // Sync initial value (only if editor is empty to prevent cursor jump)
  useEffect(() => {
    if (
      editorRef.current &&
      value !== editorRef.current.innerHTML &&
      document.activeElement !== editorRef.current
    ) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  // ── Handle Input Change ──────────────────────────────────
  const handleInput = () => {
    const el = editorRef.current;
    if (!el) return;
    onChange(el.innerHTML);

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;

    // Only detect @ in text nodes
    if (textNode.nodeType === Node.TEXT_NODE) {
      const textBeforeCaret = textNode.textContent.slice(0, range.startOffset);
      const match = textBeforeCaret.match(/@([^\s@]{0,30})$/);

      if (match) {
        setQuery(match[1]);
        setShowDD(true);
        setActiveIdx(0);

        // Get accurate caret position for dropdown
        const rect = range.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom - containerRect.top + 4,
          left: rect.left - containerRect.left,
        });
      } else {
        setShowDD(false);
      }
    } else {
      setShowDD(false);
    }

    // Auto-sync: remove assigned IDs if their mention tag was deleted
    if (onAssignMultiple && assignedIds.length > 0) {
      const currentHtml = el.innerHTML;
      const keep = assignedIds.filter((id) => {
        const l = lawyers.find((x) => x.id === id);
        return l && currentHtml.includes(`data-id="${id}"`);
      });
      if (keep.length !== assignedIds.length) onAssignMultiple(keep);
    }
  };

  // ── Execute Format Commands ──────────────────────────────
  const executeCommand = (e, cmd, value = null) => {
    e.preventDefault();
    if (editorRef.current) editorRef.current.focus();

    if (cmd === "h1" || cmd === "h2") {
      document.execCommand("formatBlock", false, cmd.toUpperCase());
    } else if (cmd === "quote") {
      document.execCommand("formatBlock", false, "BLOCKQUOTE");
    } else if (cmd === "code") {
      document.execCommand("formatBlock", false, "PRE");
    } else {
      document.execCommand(cmd, false, value);
    }

    handleInput(); // Trigger sync
  };

  // ── Select Mention from Dropdown ──────────────────────────
  const selectLawyer = (lawyer) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;

    if (textNode.nodeType === Node.TEXT_NODE) {
      const textBeforeCaret = textNode.textContent.slice(0, range.startOffset);
      const match = textBeforeCaret.match(/@([^\s@]{0,30})$/);

      if (match) {
        // Remove the "@query" text
        range.setStart(textNode, range.startOffset - match[0].length);
        range.deleteContents();

        // Insert Mention Tag
        const mentionNode = document.createElement("span");
        mentionNode.contentEditable = "false";
        mentionNode.className = "mention-tag";
        mentionNode.setAttribute("data-id", lawyer.id);
        mentionNode.style.cssText =
          "color: #096dd9; background: #e6f4ff; border-radius: 4px; padding: 0 4px; font-weight: 600; font-size: 13px; border: 1px solid #91caff; margin: 0 2px; display: inline-block; user-select: all;";
        mentionNode.innerText = `@${lawyer.lawyerName}`;

        const spaceNode = document.createTextNode("\u00A0"); // Non-breaking space

        range.insertNode(spaceNode);
        range.insertNode(mentionNode);

        // Move caret after space
        range.setStartAfter(spaceNode);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    // Sync IDs
    const newIds = assignedIds.includes(lawyer.id)
      ? assignedIds
      : [...assignedIds, lawyer.id];
    onAssignMultiple(newIds);
    setShowDD(false);
    setQuery("");
    handleInput();
  };

  // ── Keyboard Navigation ──────────────────────────────────
  const handleKeyDown = (e) => {
    if (showDD && filtered.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(activeIdx + 1, filtered.length - 1);
        setActiveIdx(next);
        dropdownRef.current?.children[next]?.scrollIntoView({
          block: "nearest",
        });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = Math.max(activeIdx - 1, 0);
        setActiveIdx(prev);
        dropdownRef.current?.children[prev]?.scrollIntoView({
          block: "nearest",
        });
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filtered[activeIdx]) selectLawyer(filtered[activeIdx]);
        return;
      }
      if (e.key === "Escape") {
        setShowDD(false);
        return;
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (onSubmit) onSubmit();
    }
  };

  // ── Remove Assigned Tag Manually ─────────────────────────
  const removeAssigned = (id) => {
    const newIds = assignedIds.filter((i) => i !== id);
    onAssignMultiple(newIds);

    // Remove from DOM
    if (editorRef.current) {
      const elements = editorRef.current.querySelectorAll(
        `span[data-id="${id}"]`,
      );
      elements.forEach((el) => el.remove());
      onChange(editorRef.current.innerHTML);
    }
  };

  // ── Format Buttons ───────────────────────────────────────
  const FMT = [
    {
      key: "bold",
      title: "Đậm (Ctrl+B)",
      cmd: "bold",
      el: React.createElement("b", null, "B"),
    },
    {
      key: "italic",
      title: "Nghiêng (Ctrl+I)",
      cmd: "italic",
      el: React.createElement("i", null, "I"),
    },
    {
      key: "underline",
      title: "Gạch chân (Ctrl+U)",
      cmd: "underline",
      el: React.createElement("u", null, "U"),
    },
    {
      key: "strikeThrough",
      title: "Gạch ngang",
      cmd: "strikeThrough",
      el: React.createElement("s", null, "S"),
    },
    { key: "sep1" },
    { key: "h1", title: "Tiêu đề lớn", cmd: "h1", el: "H1" },
    { key: "h2", title: "Tiêu đề vừa", cmd: "h2", el: "H2" },
    { key: "sep2" },
    { key: "quote", title: "Trích dẫn", cmd: "quote", el: "❝" },
    {
      key: "insertUnorderedList",
      title: "Danh sách chấm",
      cmd: "insertUnorderedList",
      el: "• —",
    },
    {
      key: "insertOrderedList",
      title: "Danh sách số",
      cmd: "insertOrderedList",
      el: "1.—",
    },
    {
      key: "insertHorizontalRule",
      title: "Kẻ ngang",
      cmd: "insertHorizontalRule",
      el: "─",
    },
  ];

  const Sep = () =>
    React.createElement("div", {
      style: {
        width: 1,
        height: 18,
        background: "#e0e0e0",
        margin: "0 2px",
        flexShrink: 0,
      },
    });

  return React.createElement(
    "div",
    {
      ref: containerRef,
      style: {
        border: "1px solid #d9d9d9",
        borderRadius: 8,
        background: "#fff",
        boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
        position: "relative",
      },
    },
    // Toolbar
    React.createElement(
      "div",
      {
        style: {
          padding: "5px 8px",
          background: "#f8f8f8",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
          gap: 3,
          flexWrap: "wrap",
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        },
      },
      ...FMT.map((f) => {
        if (f.key.startsWith("sep"))
          return React.createElement(Sep, { key: f.key });
        return React.createElement(
          Tooltip,
          { key: f.key, title: f.title, placement: "top" },
          React.createElement(
            "button",
            {
              type: "button",
              onMouseDown: (e) => executeCommand(e, f.cmd),
              style: {
                minWidth: 28,
                height: 26,
                padding: "0 4px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #ddd",
                borderRadius: 4,
                background: "#fff",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: FONT,
                color: "#333",
                userSelect: "none",
              },
              onMouseEnter: (e) => {
                e.currentTarget.style.background = "#e8f4ff";
                e.currentTarget.style.borderColor = "#1890ff";
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.borderColor = "#ddd";
              },
            },
            f.el,
          ),
        );
      }),
      React.createElement(Sep, { key: "sep-upload" }),
      onUploadClick &&
        React.createElement(
          Tooltip,
          { title: "Đính kèm tệp", placement: "top" },
          React.createElement(
            "button",
            {
              type: "button",
              onClick: onUploadClick,
              style: {
                minWidth: 28,
                height: 26,
                padding: "0 4px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #ddd",
                borderRadius: 4,
                background: "#fff",
                cursor: "pointer",
                fontSize: 14,
                fontFamily: FONT,
                color: "#333",
                userSelect: "none",
              },
              onMouseEnter: (e) => {
                e.currentTarget.style.background = "#e8f4ff";
                e.currentTarget.style.borderColor = "#1890ff";
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.borderColor = "#ddd";
              },
            },
            "📎",
          ),
        ),
      React.createElement(
        "span",
        {
          style: {
            marginLeft: "auto",
            fontSize: 11,
            color: "#bbb",
            fontFamily: FONT,
          },
        },
        "@ nhắc · Ctrl+Enter gửi",
      ),
    ),
    // ContentEditable Editor
    React.createElement("div", {
      ref: editorRef,
      contentEditable: true,
      onInput: handleInput,
      onKeyDown: handleKeyDown,
      onBlur: () => setTimeout(() => setShowDD(false), 200),
      style: {
        width: "100%",
        minHeight: 100,
        maxHeight: 380,
        padding: "12px 16px",
        fontSize: 14,
        fontFamily: FONT,
        lineHeight: 1.7,
        border: "none",
        outline: "none",
        overflowY: "auto",
        boxSizing: "border-box",
        background: "transparent",
      },
      "data-placeholder": placeholder || "Viết bình luận... (@ để nhắc tên)",
    }),
    // Dropdown Mentions
    showDD &&
      filtered.length > 0 &&
      React.createElement(
        "div",
        {
          style: {
            position: "absolute",
            top: dropdownPos.top,
            left: dropdownPos.left,
            zIndex: 9999,
            background: "#fff",
            border: "1px solid #e0e0e0",
            borderRadius: 10,
            boxShadow: "0 8px 28px rgba(0,0,0,0.14)",
            minWidth: 230,
            maxHeight: 240,
            overflowY: "auto",
            padding: "4px 0",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              padding: "5px 12px 6px",
              fontSize: 11,
              color: "#888",
              fontFamily: FONT,
              borderBottom: "1px solid #f0f0f0",
            },
          },
          query ? `Tìm luật sư: "${query}"` : "Nhắc tên luật sư",
        ),
        React.createElement(
          "div",
          { ref: dropdownRef },
          filtered.map((l, idx) =>
            React.createElement(
              "div",
              {
                key: l.id,
                onMouseDown: (e) => {
                  e.preventDefault();
                  selectLawyer(l);
                },
                onMouseEnter: () => setActiveIdx(idx),
                style: {
                  padding: "8px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: idx === activeIdx ? "#e6f4ff" : "transparent",
                  borderLeft:
                    idx === activeIdx
                      ? "3px solid #1890ff"
                      : "3px solid transparent",
                  transition: "background 0.1s",
                },
              },
              React.createElement(Av, { name: l.lawyerName, size: 28 }),
              React.createElement(
                "div",
                null,
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 13,
                      fontWeight: idx === activeIdx ? 600 : 400,
                      color: idx === activeIdx ? "#096dd9" : "#262626",
                      fontFamily: FONT,
                    },
                  },
                  l.lawyerName,
                ),
                l.lawyerType &&
                  React.createElement(
                    "div",
                    { style: { fontSize: 11, color: "#888" } },
                    l.lawyerType,
                  ),
              ),
            ),
          ),
        ),
      ),
    // Tags List
    assignedIds.length > 0 &&
      React.createElement(
        "div",
        {
          style: {
            padding: "6px 12px 8px",
            borderTop: "1px solid #f0f0f0",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 6,
            background: "#fafcff",
          },
        },
        React.createElement(
          "span",
          { style: { fontSize: 11, color: "#888", fontFamily: FONT } },
          "Đã nhắc:",
        ),
        assignedIds.map((id) => {
          const lawyer = lawyers.find((l) => l.id === id);
          if (!lawyer) return null;
          return React.createElement(
            Tag,
            {
              key: id,
              closable: true,
              onClose: () => removeAssigned(id),
              style: {
                borderRadius: 12,
                background: "#e6f4ff",
                color: "#096dd9",
                border: "1px solid #91caff",
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              },
            },
            React.createElement(Av, { name: lawyer.lawyerName, size: 16 }),
            lawyer.lawyerName,
          );
        }),
      ),
  );
};
// ============================================================
// UnifiedNoteThread
// ============================================================
const UnifiedNoteThread = ({
  collectionName,
  recordId,
  currentUser,
  lawyers,
  canEdit = true,
  projectFolderId,
  onFilesUpdate,
  refreshTrigger,
  caseId = null, // 🌟 Bổ sung caseId để tạo deep-link
}) => {
  const currentLawyerId = useMemo(() => {
    const currentUserId = extractId(currentUser?.id);
    const found = lawyers?.find((l) => {
      const lawyerUserId = extractId(l.userId) || extractId(l.user);
      return currentUserId && lawyerUserId === currentUserId;
    });
    return found?.id || null;
  }, [currentUser, lawyers]);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [assignedIds, setAssignedIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [pendingBatchId, setPendingBatchId] = useState(
    () => `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  );
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editBody, setEditBody] = useState("");
  const [editAssignedIds, setEditAssignedIds] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedThreads, setExpandedThreads] = useState({});
  const [showAll, setShowAll] = useState(false);
  const INITIAL_COUNT = 10;
  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchNotes(collectionName, recordId),
      fetchFiles(collectionName, recordId),
    ]).then(([notes, files]) => {
      const WINDOW_MS = 5000;
      const usedFileIds = new Set();
      const noteItems = notes.map((n) => {
        const noteTime = new Date(n.createdAt).getTime();
        const attachedFiles = files.filter((f) => {
          if (usedFileIds.has(f.id)) return false;
          if (n.batchId && f.batchId && n.batchId === f.batchId) return true;
          return (
            Math.abs(new Date(f.createdAt).getTime() - noteTime) <= WINDOW_MS
          );
        });
        attachedFiles.forEach((f) => usedFileIds.add(f.id));
        return {
          _kind: "item",
          _time: new Date(n.createdAt),
          note: n,
          files: attachedFiles,
        };
      });
      const remainingFiles = files.filter((f) => !usedFileIds.has(f.id));
      const fileOnlyItems = [];
      const processedIds = new Set();
      remainingFiles.forEach((f) => {
        if (processedIds.has(f.id)) return;
        const fTime = new Date(f.createdAt).getTime();
        const batch = remainingFiles.filter((f2) => {
          if (processedIds.has(f2.id) && f2.id !== f.id) return false;
          if (f.batchId && f2.batchId && f.batchId === f2.batchId) return true;
          return (
            Math.abs(new Date(f2.createdAt).getTime() - fTime) <= WINDOW_MS
          );
        });
        batch.forEach((f2) => processedIds.add(f2.id));
        fileOnlyItems.push({
          _kind: "item",
          _time: new Date(f.createdAt),
          note: null,
          files: batch,
        });
      });
      const allItems = [...noteItems, ...fileOnlyItems].sort(
        (a, b) => b._time - a._time,
      );
      setFeed(allItems);
      if (onFilesUpdate) onFilesUpdate(files);
      setLoading(false);
    });
  }, [collectionName, recordId, onFilesUpdate]);
  useEffect(() => {
    reload();
  }, [reload, refreshTrigger]);
  const authorName = (n) =>
    n.createdBy?.nickname ||
    n.createdBy?.username ||
    n.createdBy?.email ||
    (n.createdById ? `User #${n.createdById}` : "Ẩn danh");
  const warnMentionOnly = () => {
    message.warning("Vui lòng nhập nội dung bình luận trước khi nhắc tên.");
  };
  const handleSend = async () => {
    const hasText = getCommentText(body, true).length > 0;
    const hasFiles = pendingDocs.length > 0;
    if (assignedIds.length > 0 && !hasText) {
      warnMentionOnly();
      return;
    }
    if (!hasText && !hasFiles) return;
    setSending(true);
    const batchId = pendingBatchId;
    try {
      // ── BƯỚC 1: Tạo Note với batchId ─────────────────────────
      const currentPath = window.location.origin + window.location.pathname;
      let linkedUrl = `${currentPath}`;

      // 🌟 TỰ ĐỘNG TẠO DEEP-LINK NẾU LÀ TASK (Hardcore Join)
      if (collectionName === "Task") {
        const { buildUrl } = DEEP_LINK_CONFIG;

        // Lấy caseId từ props hoặc trích xuất từ URL hiện tại
        const actualCaseId =
          extractId(caseId) ||
          extractId(ctx.record?.id) ||
          window.location.pathname.match(/filterbytk\/(\d+)/)?.[1];

        if (actualCaseId) {
          linkedUrl = buildUrl(recordId, actualCaseId);
        }
      }
      const currentTime = new Date().toISOString(); // 🌟 Thời gian đồng bộ
      const noteRes = await apiReq("notes:create", "POST", {
        collectionName,
        recordId,
        title: "Bình luận",
        body: hasText ? body.trim() : null,
        linkedUrl,
        assignees: assignedIds,
        assignedLawyerId: assignedIds[0] || null, // 🌟 Thêm field đơn để trigger DB
        parentId: replyingTo
          ? replyingTo.note?.id || replyingTo.files?.[0]?.id
          : null,
        replyText: replyingTo?.note?.body
          ? replyingTo.note.body
              .replace(/<[^>]*>?/gm, "")
              .trim()
              .substring(0, 150) +
            (replyingTo.note.body.length > 150 ? "..." : "")
          : replyingTo
            ? "Tài liệu đính kèm"
            : null,
        batchId,
        createdAt: currentTime, // 🌟 Đồng bộ thời gian tạo note
      });

      const noteId = noteRes?.data?.data?.id;
      if (noteId && assignedIds.length > 0) {
        // 🌟 Log thủ công cho M2M assignees (vì trigger không bắt được)
        const names = assignedIds
          .map((id) => {
            const l = lawyers?.find(
              (law) => extractId(law.id) === extractId(id),
            );
            return l?.lawyerName || l?.nickname || `#${id}`;
          })
          .join(", ");

        await logActivity(
          "Note",
          noteId,
          "created",
          "assignees",
          null,
          names,
          currentUser?.nickname || currentUser?.username || "Hệ thống",
          batchId,
          null,
          currentTime,
        );
        // Mirror cho parent
        await logActivity(
          initcap(collectionName),
          recordId,
          "created",
          "assignees",
          null,
          names,
          currentUser?.nickname || currentUser?.username || "Hệ thống",
          batchId,
          noteId,
          currentTime,
        );
      }

      // ── BƯỚC 2: Tạo Document records cùng batchId ────────────
      if (hasFiles) {
        const toISO = (val) => {
          if (!val) return null;
          const d = new Date(val);
          return isNaN(d.getTime()) ? null : d.toISOString();
        };
        for (const pDoc of pendingDocs) {
          await apiReq("documents:create", "POST", {
            documentType: pDoc.metadata.documentType?.trim() || "",
            documentCode: pDoc.metadata.documentCode?.trim() || "",
            title: pDoc.metadata.title?.trim() || pDoc.fileName,
            openingDate: toISO(pDoc.metadata.openingDate),
            signedAt: toISO(pDoc.metadata.signedAt),
            effectiveAt: toISO(pDoc.metadata.effectiveAt),
            senderName: pDoc.metadata.senderName?.trim() || "",
            recipientName: pDoc.metadata.recipientName?.trim() || "",
            language: pDoc.metadata.language?.trim() || "",
            docFormat: pDoc.metadata.docFormat?.trim() || "",
            googleDriveUrl: pDoc.metadata.googleDriveUrl?.trim() || "",
            note: pDoc.metadata.note?.trim() || "",
            updatedById: currentUser?.id || null,
            updatedAt: new Date().toISOString(),
            collectionName,
            recordId: parseInt(recordId),
            folderId: extractId(projectFolderId),
            createdById: currentUser?.id || null,
            createdAt: new Date().toISOString(),
            batchId,
            ...(pDoc.attIds && { fileAttachment: pDoc.attIds }),
          });
        }
      }

      setBody("");
      setAssignedIds([]);
      setReplyingTo(null);
      setPendingDocs([]);
      setPendingBatchId(
        `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      );
      reload();
      message.success("Đã đăng bình luận");
    } catch (e) {
      message.error("Lỗi: " + (e?.message || "Thử lại"));
    }
    setSending(false);
  };

  const handleSaveEdit = async (noteId) => {
    const newBody = editBody.trim();
    if (!newBody) return;
    const currentNoteItem = feed.find(
      (item) => item.note && item.note.id === noteId,
    );
    const oldBody = currentNoteItem?.note?.body || "";
    const oldAssignees = (currentNoteItem?.note?.assignees || []).map((a) =>
      typeof a === "object" ? a.id : a,
    );
    const bodyChanged = oldBody !== newBody;
    const assigneesChanged =
      JSON.stringify([...oldAssignees].sort()) !==
      JSON.stringify([...editAssignedIds].sort());

    if (!bodyChanged && !assigneesChanged) {
      setEditingNoteId(null);
      setEditBody("");
      setEditAssignedIds([]);
      return;
    }
    try {
      const currentTime = new Date().toISOString();
      const actionBatchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; // 🌟 Tạo batchId duy nhất cho lần sửa này

      await apiReq(`notes:update?filterByTk=${noteId}`, "POST", {
        body: newBody,
        assignees: editAssignedIds,
        assignedLawyerId: editAssignedIds[0] || null,
        batchId: actionBatchId, // 🌟 Cập nhật batchId của record sang ID mới để trigger dùng
      });

      // 🌟 Log thủ công cho M2M assignees thay đổi (dùng actionBatchId mới)
      const oldNames = oldAssignees
        .map((id) => {
          const l = lawyers?.find((law) => extractId(law.id) === extractId(id));
          return l?.lawyerName || l?.nickname || `#${id}`;
        })
        .join(", ");
      const newNames = editAssignedIds
        .map((id) => {
          const l = lawyers?.find((law) => extractId(law.id) === extractId(id));
          return l?.lawyerName || l?.nickname || `#${id}`;
        })
        .join(", ");

      if (oldNames !== newNames) {
        const userName =
          currentUser?.nickname || currentUser?.username || "Hệ thống";
        await logActivity(
          "Note",
          noteId,
          "updated",
          "assignees",
          oldNames || null,
          newNames || null,
          userName,
          actionBatchId, // 🌟 Dùng batchId mới
          null,
          currentTime,
        );
        await logActivity(
          initcap(collectionName),
          recordId,
          "updated",
          "assignees",
          oldNames || null,
          newNames || null,
          userName,
          actionBatchId, // 🌟 Dùng batchId mới
          noteId,
          currentTime,
        );
      }
      // 🌟 XÓA BỎ logActivity thủ công, để SQL Trigger tự làm việc cho đồng nhất
      setFeed((prev) =>
        prev.map((item) => {
          if (item.note && item.note.id === noteId)
            return {
              ...item,
              note: { ...item.note, body: newBody, assignees: editAssignedIds },
            };
          return item;
        }),
      );
      setEditingNoteId(null);
      setEditBody("");
      setEditAssignedIds([]);
      message.success("Đã cập nhật bình luận");
    } catch (e) {
      message.error("Lỗi cập nhật");
    }
  };

  const handleDeleteNote = (item) => {
    const { note, files } = item;
    Modal.confirm({
      title: "Xác nhận xóa",
      content: note
        ? "Bạn có chắc chắn muốn xóa bình luận này và các tệp đính kèm không?"
        : "Bạn có chắc chắn muốn xóa các tệp này không?",
      okText: "Xóa",
      cancelText: "Hủy",
      okType: "danger",
      onOk: async () => {
        try {
          const currentTime = new Date().toISOString();
          const actionBatchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; // 🌟 BatchId riêng cho việc xóa
          const userName =
            currentUser?.nickname || currentUser?.username || "Hệ thống";

          if (note) {
            await apiReq(`notes:update?filterByTk=${note.id}`, "POST", {
              isDeleted: true,
              batchId: actionBatchId, // 🌟 Cập nhật batchId để trigger bắt đúng
            });

            // 🌟 Log xóa assignees (dùng actionBatchId mới)
            const currentAssignees = note.assignees || [];
            if (currentAssignees.length > 0) {
              const names = currentAssignees
                .map((a) => {
                  const id = typeof a === "object" ? a.id : a;
                  const l = lawyers?.find(
                    (law) => extractId(law.id) === extractId(id),
                  );
                  return l?.lawyerName || l?.nickname || `#${id}`;
                })
                .join(", ");

              await logActivity(
                "Note",
                note.id,
                "deleted",
                "assignees",
                names,
                null,
                userName,
                actionBatchId,
                null,
                currentTime,
              );
              await logActivity(
                initcap(collectionName),
                recordId,
                "deleted",
                "assignees",
                names,
                null,
                userName,
                actionBatchId,
                note.id,
                currentTime,
              );
            }
          }
          if (files && files.length > 0) {
            for (const f of files) {
              await apiReq(`documents:update?filterByTk=${f.id}`, "POST", {
                isDeleted: true,
                // batchId: deleteBatchId, // ❌ Không thay đổi batchId
              });
            }
          }
          setFeed((prev) => prev.filter((i) => i !== item));
          message.success("Đã xóa thành công");
        } catch (e) {
          message.error("Lỗi khi xóa");
        }
      },
    });
  };

  const [editingFileId, setEditingFileId] = useState(null);
  const [editFileTitle, setEditFileTitle] = useState("");
  const [expandedPreviews, setExpandedPreviews] = useState({});

  const handleSaveFileTitle = async (f) => {
    const newTitle = editFileTitle.trim();
    if (!newTitle) return;
    try {
      const actionBatchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const oldTitle = f.title || "";

      await apiReq(`documents:update?filterByTk=${f.id}`, "POST", {
        title: newTitle,
        batchId: actionBatchId,
      });

      // 🌟 Log thủ công vì SQL trigger chặn update title của documents
      const userName =
        currentUser?.nickname || currentUser?.username || "Hệ thống";
      await logActivity(
        "Document",
        f.id,
        "updated",
        "title",
        oldTitle,
        newTitle,
        userName,
        actionBatchId,
        null,
        new Date().toISOString(),
      );
      // Mirror cho parent (Task)
      await logActivity(
        initcap(collectionName),
        recordId,
        "updated",
        "documents",
        oldTitle,
        newTitle,
        userName,
        actionBatchId,
        f.id,
        new Date().toISOString(),
      );

      setFeed((prev) =>
        prev.map((item) => ({
          ...item,
          files: item.files.map((file) =>
            file.id === f.id ? { ...file, title: newTitle } : file,
          ),
        })),
      );
      message.success("Đã cập nhật tên tài liệu");
    } catch (e) {
      message.error("Lỗi cập nhật tên");
    }
    setEditingFileId(null);
    setEditFileTitle("");
  };

  const renderFileRow = (f) => {
    const att = Array.isArray(f.fileAttachment)
      ? f.fileAttachment[0]
      : f.fileAttachment;
    const ext = att?.extname
      ? att.extname.startsWith(".")
        ? att.extname.toLowerCase()
        : "." + att.extname.toLowerCase()
      : "";
    const rawFilename = att?.filename || "File";
    const displayTitle = f.title || att?.title || rawFilename;
    const fullUrl = getFullUrl(att?.url || att?.preview);
    const isPdf = ext === ".pdf";
    const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(
      ext,
    );
    const isOffice = [
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
    ].includes(ext);
    const canIframe = isPdf || isImage || isOffice;
    const isExpanded = !!expandedPreviews[f.id];
    const isEditingThisFile = editingFileId === f.id;
    const isMine = currentUser && f.createdById === currentUser.id;

    return React.createElement(
      "div",
      {
        key: f.id,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 0,
          marginTop: 8,
          background: "#fff",
          borderRadius: 8,
          border: "1px solid #e8e8e8",
          overflow: "hidden",
        },
      },
      // ── Header row: title + actions ─────────────────────────
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
          },
        },
        // File icon
        getFileIcon(ext),
        // Title or edit input
        isEditingThisFile
          ? React.createElement("input", {
              autoFocus: true,
              value: editFileTitle,
              onChange: (e) => setEditFileTitle(e.target.value),
              onKeyDown: (e) => {
                if (e.key === "Enter") handleSaveFileTitle(f);
                if (e.key === "Escape") setEditingFileId(null);
              },
              style: {
                flex: 1,
                fontSize: 13,
                fontFamily: FONT,
                border: "1px solid #1890ff",
                borderRadius: 4,
                padding: "3px 8px",
                outline: "none",
              },
            })
          : React.createElement(
              "span",
              {
                onClick: fullUrl ? () => setPreviewDoc(f) : undefined,
                title: `File gốc: ${rawFilename}`,
                style: {
                  fontSize: 13,
                  fontFamily: FONT,
                  fontWeight: 600,
                  color: "#096dd9",
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  cursor: fullUrl ? "pointer" : "default",
                  textDecoration: fullUrl ? "underline" : "none",
                  textUnderlineOffset: 3,
                },
              },
              displayTitle,
            ),
        // Action buttons
        isEditingThisFile
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(
                "span",
                {
                  onClick: () => handleSaveFileTitle(f),
                  style: {
                    fontSize: 12,
                    padding: "2px 10px",
                    cursor: "pointer",
                    color: "#fff",
                    background: "#1890ff",
                    borderRadius: 4,
                    fontWeight: 600,
                    flexShrink: 0,
                  },
                },
                "Lưu",
              ),
              React.createElement(
                "span",
                {
                  onClick: () => setEditingFileId(null),
                  style: {
                    fontSize: 12,
                    padding: "2px 8px",
                    cursor: "pointer",
                    color: "#595959",
                    border: "1px solid #d9d9d9",
                    borderRadius: 4,
                    flexShrink: 0,
                  },
                },
                "Hủy",
              ),
            )
          : React.createElement(
              React.Fragment,
              null,
              canIframe &&
                React.createElement(
                  "span",
                  {
                    onClick: () =>
                      setExpandedPreviews((prev) => ({
                        ...prev,
                        [f.id]: !prev[f.id],
                      })),
                    title: isExpanded ? "Ẩn preview" : "Xem preview",
                    style: {
                      fontSize: 12,
                      padding: "2px 8px",
                      cursor: "pointer",
                      color: "#595959",
                      border: "1px solid #d9d9d9",
                      borderRadius: 4,
                      flexShrink: 0,
                      fontWeight: 500,
                    },
                  },
                  isExpanded ? "▲ Thu nhỏ" : "▼ Preview",
                ),
              fullUrl &&
                React.createElement(
                  "span",
                  {
                    onClick: (e) => {
                      e.stopPropagation();
                      window.open(fullUrl, "_blank");
                    },
                    style: {
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#531dab",
                      cursor: "pointer",
                      flexShrink: 0,
                      padding: "2px 8px",
                      background: "#f9f0ff",
                      borderRadius: 4,
                      border: "1px solid #d3adf7",
                    },
                  },
                  "Tải về",
                ),
              isMine &&
                canEdit &&
                React.createElement(
                  "span",
                  {
                    onClick: () => {
                      setEditingFileId(f.id);
                      setEditFileTitle(displayTitle);
                    },
                    style: {
                      fontSize: 12,
                      padding: "2px 8px",
                      cursor: "pointer",
                      color: "#8c8c8c",
                      border: "1px solid #d9d9d9",
                      borderRadius: 4,
                      flexShrink: 0,
                    },
                  },
                  "✏️",
                ),
            ),
      ),
      // ── Inline iframe preview ─────────────────────────────────
      isExpanded &&
        fullUrl &&
        React.createElement(
          "div",
          { style: { borderTop: "1px solid #f0f0f0", background: "#f8f9fa" } },
          isPdf
            ? React.createElement("iframe", {
                src: fullUrl,
                style: {
                  width: "100%",
                  height: 420,
                  border: "none",
                  display: "block",
                },
                title: displayTitle,
              })
            : isImage
              ? React.createElement("img", {
                  src: fullUrl,
                  alt: displayTitle,
                  style: {
                    width: "100%",
                    maxHeight: 400,
                    objectFit: "contain",
                    display: "block",
                    background: "#fff",
                  },
                })
              : isOffice
                ? React.createElement("iframe", {
                    src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`,
                    style: {
                      width: "100%",
                      height: 600,
                      border: "none",
                      display: "block",
                    },
                    title: displayTitle,
                  })
                : null,
        ),
    );
  };

  const renderItem = (item, key, isChild = false) => {
    const { note, files } = item;
    const firstFile = files[0];
    const creatorName = note
      ? authorName(note)
      : firstFile?.createdBy
        ? userName(firstFile.createdBy) || firstFile.createdBy?.email
        : "Hệ thống";
    const time = note?.createdAt || firstFile?.createdAt;
    const hasBody = !!note?.body;
    const hasFiles = files.length > 0;
    const isMyItem =
      (note && currentUser && note.createdById === currentUser.id) ||
      (!note &&
        firstFile &&
        currentUser &&
        firstFile.createdById === currentUser.id);
    const isEditing = note && editingNoteId === note.id;

    const replies = note && replyMap[note.id] ? replyMap[note.id] : [];
    const hasReplies = replies.length > 0;
    const isExpanded = expandedThreads[note?.id];

    const itemTargetId = note?.id || files[0]?.id;
    const replyingTargetId = replyingTo?.note?.id || replyingTo?.files?.[0]?.id;
    const isReplyingToThis = !!(
      replyingTo &&
      replyingTargetId &&
      itemTargetId === replyingTargetId
    );

    return React.createElement(
      "div",
      { key },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            gap: 12,
            padding: "16px 20px",
            borderBottom: isChild ? "none" : "1px solid #f0f0f0",
            borderLeft: isChild ? "2px solid #e6f4ff" : "none",
            marginLeft: 0,
            background: isChild ? "#fafafa" : "#fff",
            borderTop: isChild ? "1px dashed #f0f0f0" : "none",
          },
        },
        React.createElement(Av, {
          name: creatorName,
          color: "#1890ff",
          size: 30,
        }),
        React.createElement(
          "div",
          { style: { flex: 1, minWidth: 0 } },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                marginBottom: 6,
                flexWrap: "wrap",
              },
            },
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 13,
                  fontFamily: FONT,
                  fontWeight: 700,
                  color: "#1a1a1a",
                },
              },
              creatorName,
            ),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 11,
                  fontFamily: FONT,
                  color: "#bfbfbf",
                  marginLeft: "auto",
                },
              },
              timeAgo(time),
            ),
          ),
          isEditing
            ? React.createElement(
                "div",
                { style: { marginTop: 10 } },
                React.createElement(CommentComposer, {
                  value: editBody,
                  onChange: setEditBody,
                  onAssignMultiple: setEditAssignedIds,
                  assignedIds: editAssignedIds,
                  lawyers,
                  onSubmit: () => handleSaveEdit(note.id),
                }),
                React.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 8,
                      marginTop: 8,
                    },
                  },
                  React.createElement(
                    "span",
                    {
                      onClick: () => {
                        setEditingNoteId(null);
                        setEditBody("");
                        setEditAssignedIds([]);
                      },
                      style: {
                        fontSize: 12,
                        padding: "4px 12px",
                        cursor: "pointer",
                        color: "#595959",
                        border: "1px solid #d9d9d9",
                        borderRadius: 4,
                        fontFamily: FONT,
                      },
                    },
                    "Hủy",
                  ),
                  React.createElement(
                    "span",
                    {
                      onClick: () => handleSaveEdit(note.id),
                      style: {
                        fontSize: 12,
                        padding: "4px 16px",
                        cursor: "pointer",
                        color: "#fff",
                        background: "#1890ff",
                        borderRadius: 4,
                        fontWeight: 600,
                        fontFamily: FONT,
                      },
                    },
                    "Lưu thay đổi",
                  ),
                ),
              )
            : (hasBody || hasFiles) &&
                React.createElement(
                  "div",
                  null,
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: 13,
                        fontFamily: FONT,
                        color: "#262626",
                        lineHeight: 1.7,
                        background: "#f8f9fa",
                        borderRadius: 8,
                        padding: "12px 14px",
                        borderLeft: "3px solid #1890ff",
                      },
                    },
                    !isChild &&
                      note?.replyText &&
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 12,
                            fontFamily: FONT,
                            color: "#595959",
                            background: "#fff",
                            border: "1px solid #e8e8e8",
                            borderLeft: "3px solid #bfbfbf",
                            borderRadius: "4px",
                            padding: "6px 10px",
                            marginBottom: 8,
                            whiteSpace: "pre-wrap",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          },
                        },
                        React.createElement(
                          "b",
                          { style: { color: "#8c8c8c", marginRight: 4 } },
                          "Trích dẫn:",
                        ),
                        " ",
                        note.replyText,
                      ),
                    hasBody &&
                      React.createElement(
                        "div",
                        {
                          style: {
                            marginBottom: hasFiles ? 8 : 0,
                          },
                        },
                        renderRichText(note.body, lawyers),
                      ),
                    note?.assignees &&
                      note.assignees.length > 0 &&
                      React.createElement(
                        "div",
                        {
                          style: {
                            marginTop: 8,
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                            alignItems: "center",
                          },
                        },
                        React.createElement(
                          "span",
                          {
                            style: {
                              fontSize: 12,
                              color: "#8c8c8c",
                              fontFamily: FONT,
                            },
                          },
                          "Đã nhắc đến:",
                        ),
                        ...note.assignees.map((assigneeItem) => {
                          const assigneeId =
                            typeof assigneeItem === "object" &&
                            assigneeItem !== null
                              ? assigneeItem.id
                              : assigneeItem;
                          const l = lawyers?.find((lw) => lw.id === assigneeId);
                          if (!l) return null;
                          return React.createElement(
                            "span",
                            {
                              key: l.id,
                              style: {
                                fontSize: 12,
                                color: "#096dd9",
                                background: "#e6f4ff",
                                border: "1px solid #91caff",
                                padding: "2px 8px",
                                borderRadius: 4,
                                display: "inline-flex",
                                alignItems: "center",
                                fontFamily: FONT,
                                fontWeight: 500,
                              },
                            },
                            "@",
                            l.lawyerName,
                          );
                        }),
                      ),
                    ...files.map((f) => renderFileRow(f)),
                  ),
                  (note || files.length > 0) &&
                    (canEdit || isMyItem) &&
                    !isEditing &&
                    React.createElement(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          marginTop: 6,
                          paddingLeft: 4,
                        },
                      },
                      React.createElement(
                        "span",
                        {
                          onClick: () => setReplyingTo(item),
                          style: {
                            fontSize: 12,
                            fontFamily: FONT,
                            color: "#52c41a",
                            cursor: "pointer",
                            textDecoration: "underline",
                            textUnderlineOffset: "2px",
                          },
                          onMouseEnter: (e) =>
                            (e.currentTarget.style.color = "#389e0d"),
                          onMouseLeave: (e) =>
                            (e.currentTarget.style.color = "#52c41a"),
                        },
                        "Phản hồi",
                      ),
                      isMyItem &&
                        note &&
                        React.createElement(
                          "span",
                          {
                            onClick: () => {
                              setEditingNoteId(note.id);
                              setEditBody(note.body || "");
                              setEditAssignedIds(
                                (note.assignees || []).map((a) =>
                                  typeof a === "object" ? a.id : a,
                                ),
                              );
                            },
                            style: {
                              fontSize: 12,
                              fontFamily: FONT,
                              color: "#595959",
                              cursor: "pointer",
                              textDecoration: "underline",
                              textUnderlineOffset: "2px",
                            },
                            onMouseEnter: (e) =>
                              (e.currentTarget.style.color = "#1890ff"),
                            onMouseLeave: (e) =>
                              (e.currentTarget.style.color = "#595959"),
                          },
                          "Chỉnh sửa",
                        ),
                      isMyItem &&
                        React.createElement(
                          "span",
                          {
                            onClick: () => handleDeleteNote(item),
                            style: {
                              fontSize: 12,
                              fontFamily: FONT,
                              color: "#ff4d4f",
                              cursor: "pointer",
                              textDecoration: "underline",
                              textUnderlineOffset: "2px",
                            },
                            onMouseEnter: (e) =>
                              (e.currentTarget.style.color = "#cf1322"),
                            onMouseLeave: (e) =>
                              (e.currentTarget.style.color = "#ff4d4f"),
                          },
                          "Xóa",
                        ),
                    ),
                ),
          isReplyingToThis ? renderComposerBlock(true) : null,
        ),
      ),
      hasReplies &&
        React.createElement(
          "div",
          {
            style: { marginLeft: 44, padding: "0 20px 16px 0", marginTop: -8 },
          },
          React.createElement(
            "div",
            {
              onClick: () =>
                setExpandedThreads((p) => ({ ...p, [note.id]: !p[note.id] })),
              style: {
                fontSize: 12,
                color: "#1890ff",
                cursor: "pointer",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 12px",
                background: "#f0f8ff",
                borderRadius: 4,
                border: "1px dashed #91caff",
                userSelect: "none",
              },
            },
            isExpanded
              ? "▲ Thu gọn phản hồi"
              : `▼ Xem ${replies.length} phản hồi`,
            !isExpanded &&
              React.createElement(
                Avatar.Group,
                { size: "small", maxCount: 3 },
                replies.map((r, i) =>
                  React.createElement(Av, {
                    key: i,
                    name: r.note ? authorName(r.note) : "Ẩn danh",
                    size: 16,
                  }),
                ),
              ),
          ),
          isExpanded &&
            React.createElement(
              "div",
              { style: { marginTop: 8 } },
              ...replies.map((child, idx) =>
                renderItem(child, `${key}-child-${idx}`, true),
              ),
            ),
        ),
    );
  };

  const renderPendingChips = () => {
    if (pendingDocs.length === 0) return null;
    return React.createElement(
      "div",
      {
        style: {
          display: "flex",
          gap: 6,
          flexDirection: "column",
          marginTop: 12,
        },
      },
      ...pendingDocs.map((doc, i) => {
        const name = doc.metadata.title || doc.fileName || "Tài liệu";
        return React.createElement(
          "div",
          {
            key: i,
            style: {
              display: "flex",
              flexDirection: "column",
              background: "#f0f0f0",
              border: "1px solid #d9d9d9",
              borderRadius: 6,
              padding: "8px 10px",
              fontSize: 12,
              fontFamily: FONT,
            },
          },
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 6 } },
            React.createElement(
              "span",
              {
                style: {
                  color: "#262626",
                  fontWeight: 600,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              },
              name,
            ),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 11,
                  color: "#fa8c16",
                  background: "#fff7e6",
                  padding: "1px 6px",
                  borderRadius: 10,
                  border: "1px solid #ffd591",
                  fontWeight: 600,
                },
              },
              "Chờ gửi",
            ),
            React.createElement(
              "span",
              {
                onClick: () =>
                  setPendingDocs((p) => p.filter((_, j) => j !== i)),
                style: {
                  color: "#cf1322",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 16,
                  lineHeight: 1,
                  marginLeft: 4,
                },
              },
              "×",
            ),
          ),
          doc.metadata.note &&
            React.createElement(
              "div",
              {
                style: {
                  marginTop: 6,
                  color: "#262626",
                  padding: "6px 10px",
                  background: "rgba(255,255,255,0.7)",
                  borderRadius: 4,
                },
              },
              React.createElement(
                "span",
                {
                  style: { fontWeight: 700, color: "#8c8c8c", marginRight: 6 },
                },
                "Nội dung ghi chú:",
              ),
              doc.metadata.note,
            ),
        );
      }),
    );
  };

  const hasCommentText = getCommentText(body, true).length > 0;
  const isMentionOnly = assignedIds.length > 0 && !hasCommentText;
  const canSend =
    (hasCommentText || pendingDocs.length > 0) && !isMentionOnly && !sending;
  const visibleFeed = showAll ? feed : feed.slice(0, INITIAL_COUNT);
  const hasMore = feed.length > INITIAL_COUNT;

  const rootItems = [];
  const replyMap = {};
  visibleFeed.forEach((item) => {
    const pId = item.note?.parentId;
    if (pId && visibleFeed.some((p) => p.note?.id === pId)) {
      if (!replyMap[pId]) replyMap[pId] = [];
      replyMap[pId].push(item);
    } else {
      rootItems.push(item);
    }
  });

  Object.keys(replyMap).forEach((k) => {
    replyMap[k].sort((a, b) => a._time - b._time);
  });

  const renderComposerBlock = (isInline = false) => {
    return React.createElement(
      "div",
      {
        style: {
          padding: isInline ? "12px 0 0 0" : "16px 20px",
          borderBottom: isInline ? "none" : "4px solid #f0f0f0",
          background: "#fff",
          marginTop: isInline ? 8 : 0,
        },
      },
      replyingTo &&
        React.createElement(
          "div",
          {
            style: {
              padding: "8px 12px",
              background: "#f5f5f5",
              borderLeft: "3px solid #1890ff",
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderRadius: "0 4px 4px 0",
            },
          },
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#8c8c8c",
                  fontFamily: FONT,
                },
              },
              "Đang trả lời ",
              replyingTo.note ? authorName(replyingTo.note) : "Tài liệu",
            ),
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 12,
                  color: "#595959",
                  fontFamily: FONT,
                  marginTop: 4,
                  whiteSpace: "pre-wrap",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                },
              },
              replyingTo.note?.body
                ? replyingTo.note.body.replace(/<[^>]*>?/gm, "").trim()
                : "Tài liệu đính kèm",
            ),
          ),
          React.createElement(
            "div",
            {
              onClick: () => setReplyingTo(null),
              style: {
                cursor: "pointer",
                color: "#bfbfbf",
                fontSize: 16,
                lineHeight: 1,
                padding: "0 4px",
              },
            },
            "×",
          ),
        ),
      React.createElement(CommentComposer, {
        value: body,
        onChange: setBody,
        onAssignMultiple: (ids) => setAssignedIds(ids),
        assignedIds,
        lawyers,
        onSubmit: canSend
          ? handleSend
          : isMentionOnly
            ? warnMentionOnly
            : undefined,
        onUploadClick: () => setShowUploadModal(true),
      }),
      renderPendingChips(),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 10,
            flexWrap: "wrap",
          },
        },
        React.createElement(
          "div",
          {
            onClick: canSend
              ? handleSend
              : isMentionOnly
                ? warnMentionOnly
                : undefined,
            style: {
              marginLeft: "auto",
              padding: "6px 18px",
              borderRadius: 6,
              fontSize: 13,
              fontFamily: FONT,
              fontWeight: 700,
              background: !canSend ? "#f0f0f0" : "#1890ff",
              color: !canSend ? "#bfbfbf" : "#fff",
              cursor: !canSend ? "not-allowed" : "pointer",
              border: "none",
            },
          },
          sending ? "Đang gửi..." : "Bình luận",
        ),
      ),
    );
  };

  return React.createElement(
    "div",
    { style: { height: "100%", overflowY: "auto", background: "#fff" } },
    !replyingTo ? renderComposerBlock(false) : null,
    React.createElement(
      "div",
      { style: { paddingBottom: 24 } },
      loading
        ? React.createElement(
            "div",
            { style: { textAlign: "center", padding: "24px 0" } },
            React.createElement(Spin, { size: "small" }),
          )
        : feed.length === 0
          ? React.createElement(
              "div",
              {
                style: {
                  textAlign: "center",
                  padding: "32px 0",
                  fontSize: 13,
                  fontFamily: FONT,
                  color: "#bfbfbf",
                },
              },
              "Chưa có bình luận hay tài liệu nào",
            )
          : React.createElement(
              "div",
              null,
              ...rootItems.map((item, i) => renderItem(item, `item-${i}`)),
              hasMore &&
                React.createElement(
                  "div",
                  {
                    onClick: () => setShowAll((v) => !v),
                    style: {
                      margin: "16px",
                      textAlign: "center",
                      fontSize: 12,
                      fontFamily: FONT,
                      color: "#1890ff",
                      cursor: "pointer",
                      padding: "7px 0",
                      border: "1px dashed #91caff",
                      borderRadius: 6,
                      background: "#f0f8ff",
                    },
                    onMouseEnter: (e) =>
                      (e.currentTarget.style.background = "#d6ecff"),
                    onMouseLeave: (e) =>
                      (e.currentTarget.style.background = "#f0f8ff"),
                  },
                  showAll
                    ? `▲ Rút gọn (hiện ${INITIAL_COUNT} trong ${feed.length})`
                    : `▼ Xem thêm ${feed.length - INITIAL_COUNT} bình luận (tổng ${feed.length})`,
                ),
            ),
    ),
    previewDoc &&
      React.createElement(PreviewModal, {
        doc: previewDoc,
        onClose: () => setPreviewDoc(null),
      }),
    React.createElement(FileUploadModal, {
      open: showUploadModal,
      onClose: () => setShowUploadModal(false),
      onAddPending: (newDocData) =>
        setPendingDocs((prev) => [...prev, newDocData]),
      collectionName,
      recordId,
      currentUser,
      currentLawyerId,
      lawyers,
      projectFolderId,
    }),
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
            "⬇️ Tải về",
          ),
        React.createElement(Button, { key: "cl", onClick: onClose }, "Đóng"),
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
            "Không thể xem trước định dạng này — vui lòng tải về để mở",
        }),
      ),
  );
};

const FileUploadModal = ({
  open,
  onClose,
  onSuccess,
  onAddPending,
  collectionName,
  recordId,
  currentUser,
  currentLawyerId,
  lawyers = [],
  editDoc = null,
  projectFolderId,
}) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const isEdit = !!editDoc;

  const [activeTab, setActiveTab] = useState("local");
  const [treeData, setTreeData] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [selectedLibDoc, setSelectedLibDoc] = useState(null);
  const { TreeSelect } = ctx.antd;

  useEffect(() => {
    if (!open) return;
    if (isEdit && editDoc) {
      form.setFieldsValue({
        documentType: editDoc.documentType || "",
        documentCode: editDoc.documentCode || "",
        title: editDoc.title || "",
        openingDate: editDoc.openingDate
          ? editDoc.openingDate.slice(0, 10)
          : "",
        signedAt: editDoc.signedAt ? editDoc.signedAt.slice(0, 10) : "",
        effectiveAt: editDoc.effectiveAt
          ? editDoc.effectiveAt.slice(0, 10)
          : "",
        senderName: editDoc.senderName || "",
        recipientName: editDoc.recipientName || "",
        language: editDoc.language || "",
        docFormat: editDoc.docFormat || "",
        description: editDoc.description || "",
        googleDriveUrl: editDoc.googleDriveUrl || "",
        note: editDoc.note || "",
      });
      setFileList([]);
    } else {
      form.resetFields();
      setFileList([]);
      setActiveTab("local");
      setSelectedLibDoc(null);
    }
  }, [open, editDoc]);

  useEffect(() => {
    if (
      open &&
      activeTab === "library" &&
      treeData.length === 0 &&
      !libraryLoading
    ) {
      const fetchLibraryData = async () => {
        setLibraryLoading(true);
        try {
          const [fRes, dRes] = await Promise.all([
            ctx.api.request({
              url: "folders:list",
              params: {
                pageSize: 1000,
                page: 1,
                appends: ["folderMember", "folderManager"],
              },
            }),
            ctx.api.request({
              url: "documents:list",
              params: {
                pageSize: 1000,
                page: 1,
                fields:
                  "id,title,documentCode,folderId,fileAttachment,createdById",
                appends: ["fileAttachment", "createdBy"],
              },
            }),
          ]);
          const allF = fRes?.data?.data || [];
          const allD = dRes?.data?.data || [];

          const { accessible } = getVisibleFolderIds(
            allF,
            currentUser,
            currentLawyerId,
          );

          const allowedF = allF.filter((f) => accessible.has(extractId(f.id)));

          const generateTree = () => {
            const currentUid = extractId(currentUser?.id);
            const nodeMap = {};
            allowedF.forEach((f) => {
              nodeMap[extractId(f.id)] = {
                title: `📁 ${f.name}`,
                value: `folder_${f.id}`,
                key: `folder_${f.id}`,
                selectable: false,
                children: [],
              };
            });

            allD.forEach((d) => {
              if (
                !d.fileAttachment ||
                (Array.isArray(d.fileAttachment) &&
                  d.fileAttachment.length === 0)
              )
                return;
              const fId = extractId(d.folderId);
              if (!fId || !nodeMap[fId]) return;

              // 🌟 LOGIC: Chỉ hiện file do chính currentUser upload
              if (extractId(d.createdById) !== currentUid) return;

              const fileId = extractId(d.id);
              const att = Array.isArray(d.fileAttachment)
                ? d.fileAttachment[0]
                : d.fileAttachment;
              nodeMap[fId].children.push({
                title: `📄 ${d.title || d.documentCode || "Untitled"} (${att.title || att.filename})`,
                value: `doc_${fileId}`,
                key: `doc_${fileId}`,
                isLeaf: true,
                docData: d,
                attData: att,
              });
            });

            const rootNodes = [];
            allowedF.forEach((f) => {
              const pId = extractId(f.parentId);
              if (pId && nodeMap[pId]) {
                nodeMap[pId].children.push(nodeMap[extractId(f.id)]);
              } else {
                rootNodes.push(nodeMap[extractId(f.id)]);
              }
            });

            // Clean up empty folders (optional, but better UX)
            const pruneEmpty = (nodes) => {
              return nodes.filter((n) => {
                if (n.isLeaf) return true;
                n.children = pruneEmpty(n.children || []);
                return n.children.length > 0;
              });
            };

            return pruneEmpty(rootNodes);
          };

          setTreeData(generateTree());
        } catch (e) {
          console.error(e);
        }
        setLibraryLoading(false);
      };
      fetchLibraryData();
    }
  }, [
    activeTab,
    open,
    treeData.length,
    libraryLoading,
    currentUser,
    currentLawyerId,
  ]);

  // 🌟 Effect để re-filter tree khi filter thay đổi mà không cần fetch lại API (nếu đã có data)
  // Tuy nhiên ở đây fetchLibraryData đang nằm trong useEffect và setTreeData trực tiếp.
  // Để tối ưu, ta có thể tách allF/allD ra state riêng. Nhưng hiện tại làm đơn giản trước.

  const handleTreeSelect = (val) => {
    if (!val) {
      setSelectedLibDoc(null);
      return;
    }
    let found = null;
    for (const folder of treeData) {
      if (folder.children) {
        found = folder.children.find((child) => child.value === val);
        if (found) break;
      }
    }
    if (found && found.docData) {
      setSelectedLibDoc(found);
      // Auto-fill title if empty
      const currentTitle = form.getFieldValue("title");
      if (!currentTitle) {
        form.setFieldsValue({
          title: found.docData.title || found.attData.filename,
        });
      }
    } else {
      setSelectedLibDoc(null);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setFileList([]);
    onClose();
  };

  const uploadFile = async () => {
    const file = fileList[0].originFileObj;
    const formData = new window.FormData();
    formData.append("file", file, file.name);
    const uploadRes = await ctx.api.request({
      url: "attachments:create",
      method: "POST",
      params: { attachmentField: "documents.fileAttachment" },
      data: formData,
      // headers: { "Content-Type": "multipart/form-data" }, // Để trình duyệt tự set kèm boundary
    });
    const att = uploadRes?.data?.data;
    if (!att?.id) throw new Error("Upload thất bại");
    return [{ id: att.id }];
  };

  const cloneLibraryFile = async (attData) => {
    // Reference the existing attachment directly — no re-upload needed
    // This avoids FormData restrictions and is equally valid since the
    // document record created is independent from the library document record.
    if (!attData?.id) throw new Error("Không tìm thấy attachment gốc");
    return [{ id: attData.id }];
  };

  const toISO = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const values = form.getFieldsValue();
    const hasLocalFile = fileList.length > 0;
    const hasLibFile = !!selectedLibDoc;
    const hasFile = activeTab === "local" ? hasLocalFile : hasLibFile;
    const hasDrive = !!values.googleDriveUrl?.trim();

    if (!isEdit && !hasFile && !hasDrive) {
      message.error("Vui lòng chọn file hoặc nhập Drive URL");
      return;
    }

    if (onAddPending) {
      setUploading(true);
      try {
        let attIds = null;
        let fileName = "Google Drive Link";
        if (activeTab === "local" && hasLocalFile) {
          attIds = await uploadFile();
          fileName = fileList[0].name;
        } else if (activeTab === "library" && hasLibFile) {
          attIds = await cloneLibraryFile(selectedLibDoc.attData);
          const attData = selectedLibDoc.attData;
          const ext = attData.extname
            ? attData.extname.startsWith(".")
              ? attData.extname
              : `.${attData.extname}`
            : "";
          fileName = attData.filename || `cloned_file${ext}`;
          if (ext && !fileName.toLowerCase().endsWith(ext.toLowerCase()))
            fileName += ext;
        }
        onAddPending({ attIds, fileName, metadata: values });
        handleClose();
      } catch (e) {
        message.error(`Lỗi upload: ${e.message}`);
      } finally {
        setUploading(false);
      }
      return;
    }

    setUploading(true);
    try {
      let attIds = null;
      if (hasFile) {
        if (activeTab === "local") {
          attIds = await uploadFile();
        } else {
          attIds = await cloneLibraryFile(selectedLibDoc.attData);
        }
      }
      const now = new Date().toISOString();
      const payload = {
        documentType: values.documentType?.trim() || "",
        documentCode: values.documentCode?.trim() || "",
        title: values.title?.trim() || "",
        openingDate: toISO(values.openingDate),
        signedAt: toISO(values.signedAt),
        effectiveAt: toISO(values.effectiveAt),
        senderName: values.senderName?.trim() || "",
        recipientName: values.recipientName?.trim() || "",
        language: values.language?.trim() || "",
        docFormat: values.docFormat?.trim() || "",
        googleDriveUrl: values.googleDriveUrl?.trim() || "",
        description: values.description?.trim() || "", // 🌟 Bổ sung gửi data tóm tắt
        note: values.note?.trim() || "",
        updatedById: extractId(currentUser?.id) || null,
        updatedAt: now,
        folderId: extractId(projectFolderId),
        ...(attIds && { fileAttachment: attIds }),
      };

      if (isEdit) {
        await ctx.api.request({
          url: "documents:update",
          method: "POST",
          params: { filterByTk: editDoc.id },
          data: payload,
        });
        message.success("✅ Cập nhật thành công!");
      } else {
        await apiReq("documents:create", "POST", {
          ...payload,
          collectionName,
          recordId: parseInt(recordId),
          createdById: currentUser?.id || null,
          createdAt: now,
          batchId: `upd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        });
        message.success("✅ Upload thành công!");
      }
      handleClose();
      if (onSuccess) onSuccess();
    } catch (e) {
      message.error("Lỗi: " + (e?.message || "Thử lại"));
    }
    setUploading(false);
  };

  const inpStyle = { fontSize: 12, fontFamily: FONT };
  const divider = (label) =>
    React.createElement(
      "div",
      {
        style: {
          fontSize: 12,
          color: "#8c8c8c",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          margin: "12px 0 8px",
          paddingBottom: 4,
          borderBottom: "1px solid #f0f0f0",
          fontFamily: FONT,
        },
      },
      label,
    );

  return React.createElement(
    Modal,
    {
      open,
      onCancel: handleClose,
      width: 1100,
      centered: true,
      title: React.createElement(
        Text,
        { strong: true, style: { fontFamily: FONT, fontSize: 14 } },
        isEdit ? "✏️ Cập nhật tài liệu" : "📎 Đính kèm tài liệu",
      ),
      footer: [
        React.createElement(
          Button,
          {
            key: "c",
            onClick: handleClose,
            disabled: uploading,
            style: { fontFamily: FONT },
          },
          "Huỷ",
        ),
        React.createElement(
          Button,
          {
            key: "s",
            type: "primary",
            onClick: handleSubmit,
            loading: uploading,
            style: { fontFamily: FONT },
          },
          uploading
            ? isEdit
              ? "Đang cập nhật..."
              : "Đang xử lý..."
            : isEdit
              ? "Cập nhật"
              : onAddPending
                ? "Xác nhận đính kèm"
                : "Upload",
        ),
      ],
    },
    currentUser &&
      React.createElement(
        "div",
        {
          style: {
            background: "#f6ffed",
            border: "1px solid #b7eb8f",
            borderRadius: 6,
            padding: "6px 12px",
            marginBottom: 12,
            fontSize: 12,
            color: "#595959",
            fontFamily: FONT,
          },
        },
        `👤 ${isEdit ? "Cập nhật" : "Đính kèm"} bởi: `,
        React.createElement(
          "strong",
          null,
          userName(currentUser) || currentUser.email,
        ),
      ),
    React.createElement(
      Form,
      { form, layout: "vertical", size: "small", style: { fontFamily: FONT } },
      divider("Định danh"),
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement(
          Form.Item,
          {
            name: "documentType",
            label: "Loại văn bản",
            rules: [{ required: true, message: "Vui lòng nhập loại văn bản" }],
          },
          React.createElement(
            "div",
            null,
            React.createElement(Input, {
              allowClear: true,
              maxLength: 150,
              placeholder: "VD: Hợp đồng, Biên bản...",
              list: "doc-type-list",
              style: inpStyle,
            }),
            React.createElement(
              "datalist",
              { id: "doc-type-list" },
              ...DOC_TYPE_SUGGESTIONS.map((s) =>
                React.createElement("option", { key: s, value: s }),
              ),
            ),
          ),
        ),
        React.createElement(
          Form.Item,
          { name: "title", label: "Tên tài liệu" },
          React.createElement(Input, {
            allowClear: true,
            placeholder:
              "Nhập tên đầy đủ của tài liệu (Sẽ lấy tên file nếu bỏ trống)",
            style: inpStyle,
          }),
        ),
      ),
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement(
          Form.Item,
          { name: "documentCode", label: "Số hiệu" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "VD: 123/2024/HĐ",
            style: inpStyle,
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "openingDate", label: "Ngày ban hành" },
          React.createElement(Input, {
            type: "date",
            style: { width: "100%", ...inpStyle },
          }),
        ),
      ),
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement(
          Form.Item,
          { name: "signedAt", label: "Ngày ký" },
          React.createElement(Input, {
            type: "date",
            style: { width: "100%", ...inpStyle },
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "effectiveAt", label: "Ngày hiệu lực" },
          React.createElement(Input, {
            type: "date",
            style: { width: "100%", ...inpStyle },
          }),
        ),
      ),
      divider("Bên liên quan"),
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement(
          Form.Item,
          { name: "senderName", label: "Người gửi" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "Tên cá nhân / tổ chức gửi",
            style: inpStyle,
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "recipientName", label: "Người nhận" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "Tên cá nhân / tổ chức nhận",
            style: inpStyle,
          }),
        ),
      ),

      React.createElement(
        Form.Item,
        { name: "description", label: "Tóm tắt nội dung" },
        React.createElement(Input.TextArea, {
          rows: 3,
          allowClear: true,
          placeholder: "Mô tả ngắn gọn nội dung chính...",
        }),
      ),
      divider("File đính kèm"),
      React.createElement(ctx.antd.Tabs, {
        activeKey: activeTab,
        onChange: setActiveTab,
        items: [
          {
            key: "local",
            label: "Upload từ máy tính",
            children: React.createElement(
              Form.Item,
              {
                label: isEdit ? "Thay file mới (tuỳ chọn)" : "Chọn file",
                style: { marginBottom: 0 },
              },
              React.createElement(
                Dragger,
                {
                  fileList,
                  beforeUpload: () => false,
                  onChange: ({ fileList: fl }) => setFileList(fl.slice(-1)),
                  maxCount: 1,
                  style: { padding: "6px 0" },
                },
                React.createElement(
                  "p",
                  { style: { fontSize: 20, margin: "0 0 4px" } },
                  "📁",
                ),
                React.createElement(
                  "p",
                  {
                    style: {
                      fontSize: 12,
                      color: "#595959",
                      margin: 0,
                      fontFamily: FONT,
                    },
                  },
                  "Kéo thả hoặc ",
                  React.createElement(
                    "span",
                    { style: { color: "#1890ff" } },
                    "click để chọn",
                  ),
                ),
              ),
            ),
          },
          {
            key: "library",
            label: "Chọn từ Thư viện",
            children: React.createElement(
              "div",
              { style: { padding: "8px 0" } },
              libraryLoading
                ? React.createElement(
                    "div",
                    { style: { textAlign: "center", padding: 20 } },
                    React.createElement(ctx.antd.Spin, { size: "small" }),
                    React.createElement(
                      "div",
                      {
                        style: { marginTop: 8, fontSize: 12, color: "#8c8c8c" },
                      },
                      "Đang tải thư viện...",
                    ),
                  )
                : React.createElement(
                    "div",
                    null,
                    React.createElement(TreeSelect, {
                      style: { width: "100%" },
                      treeData,
                      placeholder: "Tìm kiếm và chọn file từ thư viện...",
                      treeDefaultExpandAll: true,
                      allowClear: true,
                      showSearch: true,
                      treeNodeFilterProp: "title",
                      onChange: handleTreeSelect,
                      value: selectedLibDoc ? selectedLibDoc.value : undefined,
                      dropdownStyle: { maxHeight: 400, overflow: "auto" },
                    }),
                  ),
            ),
          },
        ],
      }),
      React.createElement(
        Form.Item,
        { name: "googleDriveUrl", label: "Google Drive URL (tuỳ chọn)" },
        React.createElement(Input, {
          placeholder: "https://docs.google.com/...",
          allowClear: true,
          style: inpStyle,
        }),
      ),
      divider("Ghi chú"),
      React.createElement(
        Form.Item,
        { name: "note", label: "Ghi chú" },
        React.createElement(Input.TextArea, {
          rows: 2,
          allowClear: true,
          placeholder: "Nhập ghi chú...",
          style: inpStyle,
        }),
      ),
    ),
  );
};

const DocDetailDrawer = ({ doc, onClose, onSuccess, currentUser }) => {
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!doc) return;
    setEditing(false);
    form.setFieldsValue({
      documentType: doc.documentType || "",
      documentCode: doc.documentCode || "",
      title: doc.title || "",
      openingDate: doc.openingDate ? doc.openingDate.slice(0, 10) : "",
      signedAt: doc.signedAt ? doc.signedAt.slice(0, 10) : "",
      effectiveAt: doc.effectiveAt ? doc.effectiveAt.slice(0, 10) : "",
      senderName: doc.senderName || "",
      recipientName: doc.recipientName || "",
      googleDriveUrl: doc.googleDriveUrl || "",
      note: doc.note || "",
    });
  }, [doc]);

  const toISO = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };
  const handleSave = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const values = form.getFieldsValue();
    setSaving(true);
    try {
      await ctx.api.request({
        url: "documents:update",
        method: "POST",
        params: { filterByTk: doc.id },
        data: {
          documentType: values.documentType?.trim() || "",
          documentCode: values.documentCode?.trim() || "",
          title: values.title?.trim() || "",
          openingDate: toISO(values.openingDate),
          signedAt: toISO(values.signedAt),
          effectiveAt: toISO(values.effectiveAt),
          senderName: values.senderName?.trim() || "",
          recipientName: values.recipientName?.trim() || "",
          googleDriveUrl: values.googleDriveUrl?.trim() || "",
          note: values.note?.trim() || "",
          updatedById: currentUser?.id || null,
          updatedAt: new Date().toISOString(),
        },
      });
      message.success("✅ Cập nhật thành công!");
      setEditing(false);
      onSuccess();
    } catch (e) {
      message.error("Lỗi: " + (e?.message || "Thử lại"));
    }
    setSaving(false);
  };

  if (!doc) return null;
  const attachment = Array.isArray(doc.fileAttachment)
    ? doc.fileAttachment[0]
    : doc.fileAttachment;
  const fileUrl = attachment?.url || attachment?.preview;
  const fullUrl = getFullUrl(fileUrl);
  const fileExt = attachment?.extname || "";
  const isPdf = fileExt === ".pdf";
  const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(fileExt);

  return React.createElement(
    Drawer,
    {
      open: !!doc,
      onClose,
      width: 460,
      destroyOnClose: false,
      title: React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8 } },
        React.createElement(
          "div",
          { style: { flex: 1, minWidth: 0 } },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: FONT,
              },
            },
            doc.title ||
              attachment?.title ||
              attachment?.filename ||
              "(Chưa có tên)",
          ),
          doc.documentType &&
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 12,
                  color: "#8c8c8c",
                  fontFamily: FONT,
                  marginTop: 2,
                },
              },
              doc.documentType,
            ),
        ),
      ),
      extra: editing
        ? React.createElement(
            Space,
            null,
            React.createElement(
              Button,
              { size: "small", onClick: () => setEditing(false) },
              "Huỷ",
            ),
            React.createElement(
              Button,
              {
                size: "small",
                type: "primary",
                loading: saving,
                onClick: handleSave,
              },
              "💾 Lưu",
            ),
          )
        : React.createElement(
            Button,
            {
              size: "small",
              type: "primary",
              ghost: true,
              onClick: () => setEditing(true),
            },
            "✏️ Chỉnh sửa",
          ),
    },
    React.createElement(
      Descriptions,
      {
        column: 1,
        size: "small",
        bordered: true,
        labelStyle: {
          width: 130,
          fontSize: 12,
          color: "#8c8c8c",
          fontFamily: FONT,
        },
        contentStyle: { fontSize: 12, fontFamily: FONT },
      },
      React.createElement(
        Descriptions.Item,
        { label: "Loại văn bản" },
        doc.documentType || "—",
      ),
      React.createElement(
        Descriptions.Item,
        { label: "Số hiệu" },
        React.createElement(
          "span",
          { style: { fontFamily: "monospace", fontSize: 12 } },
          doc.documentCode || "—",
        ),
      ),
      React.createElement(
        Descriptions.Item,
        { label: "Ngày ban hành" },
        doc.openingDate ? formatDate(doc.openingDate) : "—",
      ),
      React.createElement(
        Descriptions.Item,
        { label: "Ngày ký" },
        doc.signedAt ? formatDate(doc.signedAt) : "—",
      ),
      React.createElement(
        Descriptions.Item,
        { label: "Ngày hiệu lực" },
        doc.effectiveAt
          ? React.createElement(
              Text,
              { style: { color: "#389e0d", fontWeight: 500 } },
              formatDate(doc.effectiveAt),
            )
          : "—",
      ),
      React.createElement(
        Descriptions.Item,
        { label: "Tên tài liệu" },
        React.createElement(Text, { strong: true }, doc.title || "(Chưa có)"),
      ),
      React.createElement(
        Descriptions.Item,
        { label: "Người gửi" },
        doc.senderName || "—",
      ),
      React.createElement(
        Descriptions.Item,
        { label: "Người nhận" },
        doc.recipientName || "—",
      ),
      React.createElement(
        Descriptions.Item,
        { label: "Google Drive" },
        doc.googleDriveUrl
          ? React.createElement(
              Button,
              {
                type: "link",
                size: "small",
                style: { padding: 0 },
                onClick: () => window.open(doc.googleDriveUrl, "_blank"),
              },
              "🔗 Mở link",
            )
          : "—",
      ),
      React.createElement(
        Descriptions.Item,
        { label: "Ghi chú" },
        React.createElement(
          Text,
          { style: { whiteSpace: "pre-wrap", fontSize: 12 } },
          doc.note || "—",
        ),
      ),
      React.createElement(
        Descriptions.Item,
        { label: "Ngày tạo" },
        doc.createdAt ? fmt(doc.createdAt, "full") : "—",
      ),
      React.createElement(
        Descriptions.Item,
        { label: "Người tạo" },
        doc.createdBy ? userName(doc.createdBy) || doc.createdBy?.email : "—",
      ),
    ),
    attachment &&
      fullUrl &&
      React.createElement(
        "div",
        {
          style: {
            marginTop: 16,
            paddingTop: 12,
            borderTop: "1px solid #f0f0f0",
          },
        },
        (isPdf || isImage) &&
          React.createElement(
            Button,
            { size: "small", onClick: () => window.open(fullUrl, "_blank") },
            "👁 Xem trước",
          ),
      ),
  );
};

const TimesheetModal = ({
  open,
  onClose,
  onSuccess,
  item,
  type,
  lawyers,
  currentUser,
  projectManagerId,
  editEntry = null,
}) => {
  const isEdit = !!editEntry;
  const isAdmin = isAdminUser(currentUser);
  const isManager = isAdmin || currentUser?.id === projectManagerId;
  const assignedLawyer = useMemo(
    () => lawyers.find((l) => l.id === item.lawyerId),
    [lawyers, item.lawyerId],
  );
  const hasLawyer = !!assignedLawyer;

  const toLocalDTStr = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    const p = (n) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}`;
  };
  const nowLocalDTStr = () => toLocalDTStr(new Date());
  const initForm = () => ({
    workingDay: nowLocalDTStr(),
    duration: "",
    hourlyRate: assignedLawyer?.unitPrice || "",
    description: "",
  });
  const [form, setForm] = useState(initForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isEdit && editEntry) {
      setForm({
        workingDay:
          toLocalDTStr(editEntry.workingDay || editEntry.startTime) ||
          nowLocalDTStr(),
        duration: editEntry.duration || "",
        hourlyRate: editEntry.hourlyRate || assignedLawyer?.unitPrice || "",
        description: editEntry.description || "",
      });
    } else {
      setForm({ ...initForm(), hourlyRate: assignedLawyer?.unitPrice || "" });
    }
  }, [open, editEntry]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const handleSave = async () => {
    if (!hasLawyer) {
      message.warning("Task chưa được phân công luật sư");
      return;
    }
    const finalDuration = parseFloat(form.duration || 0);
    if (!finalDuration || finalDuration <= 0) {
      message.warning("Vui lòng nhập số giờ thực hiện");
      return;
    }
    if (finalDuration > 24) {
      message.warning("Số giờ không được vượt quá 24 giờ");
      return;
    }
    if (!form.workingDay) {
      message.warning("Vui lòng chọn ngày giờ thực hiện");
      return;
    }
    const startDT = new Date(form.workingDay);
    if (isNaN(startDT.getTime())) {
      message.warning("Ngày giờ không hợp lệ");
      return;
    }
    const endDT = new Date(startDT.getTime() + finalDuration * 3600000);
    const workingDayISO = startDT.toISOString(); // ISO full, Nocobase nhận datetime field
    const startTimeISO = startDT.toISOString();
    const endTimeISO = endDT.toISOString();
    const rate = isManager
      ? parseFloat(form.hourlyRate) || 0
      : assignedLawyer?.unitPrice || 0;
    const amount = rate > 0 ? rate * finalDuration : null;
    const estDur = parseFloat(item.estimatedDuration || 0);
    const workRate = estDur > 0 ? calcWorkRate(estDur, finalDuration) : null;

    const payload = {
      lawyerId: extractId(assignedLawyer.id),
      workingDay: workingDayISO,
      startTime: startTimeISO,
      endTime: endTimeISO,
      duration: finalDuration,
      hourlyRate: rate || null,
      amount,
      workRate,
      description: form.description || null,
      billable: true,
      ...(type === "task"
        ? { taskId: extractId(item.id) }
        : { subTaskId: extractId(item.id) }),
      projectId: extractId(PROJECT_ID),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateTimesheet(extractId(editEntry.id), payload);
        message.success("✅ Đã cập nhật");
      } else {
        // 🌟 ĐÃ BỎ status: 'draft', ĐỂ BACKEND TỰ QUYẾT ĐỊNH
        await createTimesheet(payload);

        if (workRate !== null) {
          const updateUrl =
            type === "subTask"
              ? `subTasks:update?filterByTk=${extractId(item.id)}`
              : `tasks:update?filterByTk=${extractId(item.id)}`;
          await apiReq(updateUrl, "POST", { workRate });
        }
        message.success("✅ Đã lưu timesheet");
      }
      onClose();
      onSuccess();
    } catch (err) {
      message.error("Lỗi: " + (err?.message || "Thử lại"));
    }
    setSaving(false);
  };

  const inpS = {
    width: "100%",
    border: "1px solid #e8e8e8",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 13,
    fontFamily: FONT,
    outline: "none",
    boxSizing: "border-box",
    color: "#262626",
    background: "#fff",
  };
  const lbl = (t) =>
    React.createElement(
      Text,
      {
        style: {
          fontSize: 11,
          color: "#8c8c8c",
          display: "block",
          marginBottom: 5,
          fontFamily: FONT,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
      },
      t,
    );
  const fld = (l, child) =>
    React.createElement("div", { style: { marginBottom: 14 } }, lbl(l), child);
  const focusB = (e) => (e.currentTarget.style.borderColor = "#1890ff");
  const blurB = (e) => (e.currentTarget.style.borderColor = "#e8e8e8");
  const dur = parseFloat(form.duration || 0);
  const estDur = parseFloat(item.estimatedDuration || 0);
  const previewWR = estDur > 0 && dur > 0 ? calcWorkRate(estDur, dur) : null;
  const wrPrev = previewWR !== null ? workRateCfg(previewWR) : null;

  const endPreview = (() => {
    if (!form.workingDay || dur <= 0) return null;
    const s = new Date(form.workingDay);
    if (isNaN(s.getTime())) return null;
    return new Date(s.getTime() + dur * 3600000);
  })();

  return React.createElement(
    Modal,
    {
      open,
      onCancel: onClose,
      footer: null,
      width: 480,
      centered: true,
      title: React.createElement(
        Text,
        { strong: true, style: { fontSize: 15, fontFamily: FONT } },
        isEdit ? "✏️ Cập nhật giờ làm việc" : "⏱ Ghi nhận giờ làm việc",
      ),
    },
    !hasLawyer
      ? React.createElement(
          "div",
          { style: { textAlign: "center", padding: "30px 0" } },
          React.createElement(
            "div",
            { style: { fontSize: 32, marginBottom: 12 } },
            "⚠️",
          ),
          React.createElement(
            Text,
            {
              style: {
                fontSize: 14,
                fontFamily: FONT,
                color: "#cf1322",
                display: "block",
              },
            },
            "Công việc chưa được phân công luật sư",
          ),
        )
      : React.createElement(
          "div",
          null,

          /* Luật sư (read-only) */
          fld(
            "👨‍⚖️ Luật sư",
            React.createElement(
              "div",
              {
                style: {
                  ...inpS,
                  background: "#f5f5f5",
                  color: "#595959",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "not-allowed",
                  borderRadius: 6,
                },
              },
              React.createElement(Av, {
                name: assignedLawyer.lawyerName,
                color:
                  LAWYER_COLORS[
                    lawyers.indexOf(assignedLawyer) % LAWYER_COLORS.length
                  ],
                size: 22,
              }),
              React.createElement(
                "span",
                { style: { fontWeight: 500 } },
                assignedLawyer.lawyerName,
              ),
            ),
          ),
          /* Ngày giờ thực hiện */
          fld(
            "📅 Ngày giờ thực hiện *",
            React.createElement("input", {
              type: "datetime-local",
              value: form.workingDay,
              onChange: (e) => set("workingDay", e.target.value),
              style: inpS,
              onFocus: focusB,
              onBlur: blurB,
            }),
          ),
          /* Số giờ */
          React.createElement(
            "div",
            { style: { marginBottom: 14 } },
            lbl("⏱ Số giờ thực hiện *"),
            React.createElement(
              "div",
              { style: { position: "relative" } },
              React.createElement("input", {
                type: "number",
                step: "0.5",
                min: "0.5",
                max: "24",
                placeholder: "Ví dụ: 2",
                value: form.duration,
                onChange: (e) => set("duration", e.target.value),
                style: {
                  ...inpS,
                  fontSize: 13,
                  fontWeight: 700,
                  paddingRight: 50,
                  textAlign: "center",
                  border: dur > 0 ? "2px solid #1890ff" : "1px solid #e8e8e8",
                },
                onFocus: focusB,
                onBlur: blurB,
                autoFocus: true,
              }),
              React.createElement(
                "span",
                {
                  style: {
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 13,
                    color: "#8c8c8c",
                    fontFamily: FONT,
                    pointerEvents: "none",
                  },
                },
                "giờ",
              ),
            ),
            dur > 0 &&
              React.createElement(
                "div",
                {
                  style: {
                    marginTop: 8,
                    padding: "10px 14px",
                    background: "#e6f4ff",
                    borderRadius: 8,
                    border: "1px solid #91caff",
                  },
                },
                React.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: wrPrev ? 6 : 0,
                    },
                  },
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 11,
                          fontFamily: FONT,
                          color: "#8c8c8c",
                          marginBottom: 2,
                        },
                      },
                      "🕐 Kết thúc dự kiến",
                    ),
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 13,
                          fontFamily: FONT,
                          fontWeight: 600,
                          color: "#096dd9",
                        },
                      },
                      endPreview
                        ? endPreview.toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—",
                    ),
                  ),
                  React.createElement(
                    "div",
                    { style: { textAlign: "right" } },
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 11,
                          fontFamily: FONT,
                          color: "#8c8c8c",
                          marginBottom: 2,
                        },
                      },
                      "⏱ Tổng",
                    ),
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 16,
                          fontFamily: FONT,
                          fontWeight: 700,
                          color: "#096dd9",
                        },
                      },
                      fmtHours(dur),
                    ),
                  ),
                ),
                wrPrev &&
                  React.createElement(
                    "div",
                    {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingTop: 6,
                        borderTop: "1px solid #bae0ff",
                      },
                    },
                    React.createElement(
                      "span",
                      {
                        style: {
                          fontSize: 11,
                          fontFamily: FONT,
                          color: "#8c8c8c",
                        },
                      },
                      "⚡ Năng suất:",
                    ),
                    React.createElement(
                      "span",
                      {
                        style: {
                          fontSize: 12,
                          fontFamily: FONT,
                          fontWeight: 700,
                          padding: "2px 10px",
                          borderRadius: 10,
                          background: wrPrev.bg,
                          color: wrPrev.color,
                        },
                      },
                      wrPrev.label,
                    ),
                  ),
              ),
          ),
          isManager &&
            fld(
              "💵 Đơn giá / giờ (₫)",
              React.createElement("input", {
                type: "number",
                placeholder: "Đơn giá/giờ",
                value: form.hourlyRate,
                onChange: (e) => set("hourlyRate", e.target.value),
                style: inpS,
                onFocus: focusB,
                onBlur: blurB,
              }),
            ),
          /* Mô tả */
          fld(
            "📝 Nội dung mô tả công việc",
            React.createElement("textarea", {
              value: form.description,
              onChange: (e) => set("description", e.target.value),
              placeholder: "Mô tả ngắn gọn công việc đã thực hiện...",
              rows: 3,
              style: { ...inpS, resize: "vertical", lineHeight: 1.6 },
              onFocus: focusB,
              onBlur: blurB,
            }),
          ),
          /* Footer */
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
                  padding: "7px 20px",
                  borderRadius: 6,
                  border: "1px solid #e8e8e8",
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: FONT,
                  color: "#595959",
                },
              },
              "Huỷ",
            ),
            React.createElement(
              "div",
              {
                onClick: saving ? null : handleSave,
                style: {
                  padding: "7px 24px",
                  borderRadius: 6,
                  background: saving ? "#f5f5f5" : "#1890ff",
                  color: saving ? "#bfbfbf" : "#fff",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontFamily: FONT,
                  fontWeight: 700,
                },
              },
              saving ? "Đang lưu..." : isEdit ? "Cập nhật" : "+ Ghi nhận giờ",
            ),
          ),
        ),
  );
};

const TimesheetTab = ({
  item,
  type,
  lawyers,
  currentUser,
  projectManagerId,
  isManager = false,
  canAccess = true,
}) => {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [deleting, setDeleting] = useState(null);

  if (!canAccess)
    return React.createElement(
      "div",
      { style: { textAlign: "center", padding: "32px 0", color: "#8c8c8c" } },
      React.createElement(
        "div",
        { style: { fontSize: 28, marginBottom: 8 } },
        "🔒",
      ),
      React.createElement(
        Text,
        { style: { fontSize: 12, fontFamily: FONT, color: "#8c8c8c" } },
        "Chỉ người được phân công hoặc quản lý mới xem được.",
      ),
    );

  const assignedLawyer = useMemo(
    () => lawyers.find((l) => extractId(l.id) === extractId(item.lawyerId)),
    [lawyers, item.lawyerId],
  );
  const hasLawyer = !!assignedLawyer;
  const lawyerMap = useMemo(() => {
    const m = {};
    lawyers.forEach((l, i) => {
      m[extractId(l.id)] = {
        name: l.lawyerName,
        color: LAWYER_COLORS[i % LAWYER_COLORS.length],
      };
    });
    return m;
  }, [lawyers]);

  const reload = useCallback(() => {
    setLoading(true);
    const fk = type === "task" ? "taskId" : "subTaskId";
    fetchTimesheets({ [fk]: { $eq: extractId(item.id) } }).then((d) => {
      setSheets(d);
      setLoading(false);
    });
  }, [item.id, type]);

  useEffect(() => {
    reload();
  }, [item.id]);

  const totalHours = sheets.reduce(
    (s, r) => s + (parseFloat(r.duration) || 0),
    0,
  );
  const totalAmount = sheets.reduce(
    (s, r) => s + (parseFloat(r.amount) || 0),
    0,
  );
  const estDur = parseFloat(item.estimatedDuration || 0);

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteTimesheet(extractId(id));
      message.success("Đã xoá");
      reload();
    } catch {
      message.error("Xoá thất bại");
    }
    setDeleting(null);
  };

  return React.createElement(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 10 } },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        },
      },
      hasLawyer
        ? React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 8 } },
            React.createElement(Av, {
              name: assignedLawyer.lawyerName,
              color: lawyerMap[extractId(assignedLawyer.id)]?.color,
              size: 22,
            }),
            React.createElement(
              "div",
              null,
              React.createElement(
                Text,
                {
                  style: {
                    fontSize: 12,
                    fontFamily: FONT,
                    fontWeight: 600,
                    display: "block",
                  },
                },
                assignedLawyer.lawyerName,
              ),
              React.createElement(
                Text,
                { style: { fontSize: 12, fontFamily: FONT, color: "#8c8c8c" } },
                `${fmtVND(assignedLawyer.unitPrice || 0)}/giờ${estDur > 0 ? `  ·  Dự kiến: ${fmtHours(estDur)}` : ""}`,
              ),
            ),
          )
        : React.createElement(
            "span",
            { style: { fontSize: 12, fontFamily: FONT, color: "#cf1322" } },
            "⚠ Chưa phân công",
          ),

      // 🌟 HEADER BUTTONS (Thêm nút Reload ở đây)
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, alignItems: "center" } },
        React.createElement(ReloadButton, {
          onReload: reload,
          loading,
          size: "small",
          text: "",
        }),
        hasLawyer &&
          React.createElement(
            "div",
            {
              onClick: () => {
                setEditEntry(null);
                setModal(true);
              },
              style: {
                fontSize: 12,
                fontFamily: FONT,
                padding: "5px 12px",
                borderRadius: 5,
                background: "#1890ff",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600,
              },
            },
            "＋ Thêm",
          ),
      ),
    ),

    sheets.length > 0 &&
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: isManager ? "1fr 1fr 1fr" : "1fr 1fr",
            gap: 8,
          },
        },
        React.createElement(
          "div",
          {
            style: {
              background: "#e6f4ff",
              borderRadius: 6,
              padding: "8px 10px",
              border: "1px solid #91caff",
            },
          },
          React.createElement(
            Text,
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: "#096dd9",
                fontWeight: 700,
                display: "block",
                marginBottom: 2,
              },
            },
            "⏱ Tổng giờ",
          ),
          React.createElement(
            Text,
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                fontWeight: 700,
                color: "#096dd9",
                display: "block",
              },
            },
            fmtHours(totalHours),
          ),
        ),
        React.createElement(
          "div",
          {
            style: {
              background: item.workRate
                ? workRateCfg(item.workRate).bg
                : "#f9f0ff",
              borderRadius: 6,
              padding: "8px 10px",
              border: "1px solid #d3adf7",
            },
          },
          React.createElement(
            Text,
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: "#531dab",
                fontWeight: 700,
                display: "block",
                marginBottom: 2,
              },
            },
            "⚡ Năng suất",
          ),
          React.createElement(
            Text,
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                fontWeight: 700,
                color: item.workRate
                  ? workRateCfg(item.workRate).color
                  : "#8c8c8c",
                display: "block",
              },
            },
            item.workRate ? workRateCfg(item.workRate).label : "—",
          ),
        ),
        isManager &&
          React.createElement(
            "div",
            {
              style: {
                background: "#f6ffed",
                borderRadius: 6,
                padding: "8px 10px",
                border: "1px solid #b7eb8f",
              },
            },
            React.createElement(
              Text,
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  color: "#389e0d",
                  fontWeight: 700,
                  display: "block",
                  marginBottom: 2,
                },
              },
              "💰 Thành tiền",
            ),
            React.createElement(
              Text,
              {
                style: {
                  fontSize: 12,
                  fontFamily: FONT,
                  fontWeight: 700,
                  color: "#389e0d",
                  display: "block",
                },
              },
              fmtVND(totalAmount),
            ),
          ),
      ),

    loading
      ? React.createElement(
          "div",
          { style: { textAlign: "center", padding: 16 } },
          React.createElement(Spin, { size: "small" }),
        )
      : sheets.length === 0
        ? React.createElement(
            "div",
            {
              style: {
                textAlign: "center",
                padding: "16px 0",
                color: "#bfbfbf",
                fontSize: 12,
                fontFamily: FONT,
                border: "1px dashed #f0f0f0",
                borderRadius: 6,
              },
            },
            hasLawyer
              ? "Chưa có bản ghi giờ làm việc nào"
              : "Phân công luật sư trước",
          )
        : React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: 6 } },
            ...sheets.map((s) => {
              const wr = s.workRate != null ? workRateCfg(s.workRate) : null;
              return React.createElement(
                "div",
                {
                  key: s.id,
                  style: {
                    background: "#fff",
                    borderRadius: 6,
                    padding: "10px 12px",
                    border: "1px solid #e8e8e8",
                  },
                },
                React.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    },
                  },
                  React.createElement(
                    "div",
                    {
                      style: { display: "flex", alignItems: "center", gap: 6 },
                    },
                    React.createElement(
                      Text,
                      {
                        style: {
                          fontSize: 12,
                          fontFamily: FONT,
                          color: "#262626",
                          fontWeight: 600,
                        },
                      },
                      fmt(s.workingDay, "full") || "—",
                    ),
                  ),
                  wr &&
                    React.createElement(
                      "span",
                      {
                        style: {
                          fontSize: 12,
                          fontFamily: FONT,
                          fontWeight: 600,
                          padding: "1px 6px",
                          borderRadius: 8,
                          background: wr.bg,
                          color: wr.color,
                        },
                      },
                      `⚡ ${wr.label}`,
                    ),
                ),
                React.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      fontSize: 12,
                      fontFamily: FONT,
                      color: "#595959",
                    },
                  },
                  React.createElement(
                    "span",
                    { style: { fontWeight: 700, color: "#096dd9" } },
                    fmtHours(parseFloat(s.duration) || 0),
                  ),
                  isManager &&
                    s.amount > 0 &&
                    React.createElement(
                      "span",
                      { style: { fontWeight: 700, color: "#389e0d" } },
                      `= ${fmtVND(s.amount)}`,
                    ),
                ),
                s.description &&
                  React.createElement(
                    Text,
                    {
                      style: {
                        fontSize: 12,
                        fontFamily: FONT,
                        color: "#8c8c8c",
                        display: "block",
                        marginTop: 3,
                      },
                    },
                    s.description,
                  ),

                // 🌟 NÚT SỬA/XOÁ (Đã bỏ quy trình gửi duyệt vô nghĩa)
                React.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 6,
                      paddingTop: 6,
                      marginTop: 4,
                      borderTop: "1px solid #f5f5f5",
                    },
                  },
                  React.createElement(
                    "div",
                    {
                      onClick: () => {
                        setEditEntry(s);
                        setModal(true);
                      },
                      style: {
                        fontSize: 12,
                        fontFamily: FONT,
                        padding: "3px 10px",
                        borderRadius: 4,
                        border: "1px solid #e8e8e8",
                        color: "#595959",
                        cursor: "pointer",
                        background: "#fafafa",
                      },
                    },
                    "✏️ Sửa",
                  ),
                  React.createElement(
                    "div",
                    {
                      onClick: () => handleDelete(s.id),
                      style: {
                        fontSize: 12,
                        fontFamily: FONT,
                        padding: "3px 10px",
                        borderRadius: 4,
                        border: "1px solid #ffa39e",
                        color: "#cf1322",
                        cursor: "pointer",
                        background: "#fff1f0",
                      },
                    },
                    deleting === s.id ? "..." : "🗑 Xoá",
                  ),
                ),
              );
            }),
          ),

    React.createElement(TimesheetModal, {
      open: modal,
      onClose: () => {
        setModal(false);
        setEditEntry(null);
      },
      onSuccess: () => {
        setModal(false);
        setEditEntry(null);
        reload();
      },
      item,
      type,
      lawyers,
      currentUser,
      projectManagerId,
      editEntry,
    }),
  );
};

// ============================================================
// §8 TASK COMPONENTS
// ============================================================
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
      `Phụ trách: ${lawyerName || "Chưa phân công"}`,
    ),
    React.createElement("div", null, `Trạng thái: ${statusInfo.label}`),
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

const NextStepInlineEditor = ({
  item,
  onUpdate,
  currentUser,
  readOnly = false,
}) => {
  const [val, setVal] = useState(item.nextStepDescription || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVal(item.nextStepDescription || "");
  }, [item.id, item.nextStepDescription]);
  const isDirty = val !== (item.nextStepDescription || "");
  const handleSave = async () => {
    if (!isDirty || readOnly) return;
    setSaving(true);
    try {
      await apiReq(`tasks:update?filterByTk=${item.id}`, "POST", {
        nextStepDescription: val || null,
      });
      onUpdate({ ...item, nextStepDescription: val || null });
      message.success("✅ Đã lưu bước tiếp theo");
    } catch {
      message.error("Lưu thất bại");
    }
    setSaving(false);
  };

  if (readOnly) {
    return React.createElement(
      "div",
      {
        style: {
          padding: "8px 10px",
          background: "#fafafa",
          border: "1px solid #f0f0f0",
          borderRadius: 6,
          fontSize: 12,
          fontFamily: FONT,
          color: val ? "#096dd9" : "#bfbfbf",
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          minHeight: 40,
        },
      },
      val ? `→ ${val}` : "(Chưa có bước tiếp theo)",
    );
  }
  return React.createElement(
    "div",
    { style: { position: "relative" } },
    React.createElement("textarea", {
      value: val,
      onChange: (e) => setVal(e.target.value),
      placeholder:
        "VD: Khải soạn LoA theo Detailed outline, gửi khách hàng review...",
      rows: 3,
      style: {
        width: "100%",
        border: `1px solid ${isDirty ? "#1890ff" : "#e8e8e8"}`,
        borderRadius: 6,
        padding: "8px 10px",
        paddingBottom: 36,
        fontSize: 12,
        fontFamily: FONT,
        outline: "none",
        boxSizing: "border-box",
        resize: "vertical",
        lineHeight: 1.6,
        color: "#262626",
        background: "#fff",
      },
      onFocus: (e) => (e.currentTarget.style.borderColor = "#1890ff"),
    }),
    React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          bottom: 8,
          right: 8,
          display: "flex",
          alignItems: "center",
          gap: 6,
        },
      },
      isDirty &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 12,
              fontFamily: FONT,
              color: "#fa8c16",
              background: "#fff7e6",
              border: "1px solid #ffd591",
              borderRadius: 10,
              padding: "1px 8px",
            },
          },
          "Chưa lưu",
        ),
      React.createElement(
        "div",
        {
          onClick: saving ? null : handleSave,
          style: {
            fontSize: 12,
            fontFamily: FONT,
            padding: "3px 12px",
            borderRadius: 4,
            fontWeight: 600,
            background: saving ? "#f0f0f0" : isDirty ? "#1890ff" : "#f5f5f5",
            color: saving ? "#bfbfbf" : isDirty ? "#fff" : "#bfbfbf",
            cursor: saving ? "not-allowed" : isDirty ? "pointer" : "default",
          },
        },
        saving ? "Đang lưu..." : isDirty ? "💾 Lưu" : "✓ Đã lưu",
      ),
    ),
  );
};

const DescriptionInlineEditor = ({
  item,
  type,
  onUpdate,
  readOnly = false,
}) => {
  const [val, setVal] = useState(item.description || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVal(item.description || "");
  }, [item.id]);
  const isDirty = val !== (item.description || "");
  const handleSave = async () => {
    if (!isDirty || readOnly) return;
    setSaving(true);
    try {
      const url =
        type === "subTask"
          ? `subTasks:update?filterByTk=${item.id}`
          : `tasks:update?filterByTk=${item.id}`;
      await apiReq(url, "POST", { description: val || null });
      onUpdate({ ...item, description: val || null });
      message.success("✅ Đã lưu");
    } catch {
      message.error("Lưu thất bại");
    }
    setSaving(false);
  };

  if (readOnly) {
    return React.createElement(
      "div",
      {
        style: {
          padding: "10px 12px",
          background: "#fafafa",
          border: "1px solid #f0f0f0",
          borderRadius: 6,
          fontSize: 12,
          fontFamily: FONT,
          color: val ? "#262626" : "#bfbfbf",
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          minHeight: 64,
        },
      },
      val || "(Chưa có nội dung)",
    );
  }

  return React.createElement(
    "div",
    { style: { position: "relative" } },
    React.createElement("textarea", {
      value: val,
      onChange: (e) => setVal(e.target.value),
      placeholder: "Nhập nội dung diễn biến...",
      rows: 4,
      style: {
        width: "100%",
        border: `1px solid ${isDirty ? "#1890ff" : "#e8e8e8"}`,
        borderRadius: 6,
        padding: "10px 12px",
        paddingBottom: 40,
        fontSize: 12,
        fontFamily: FONT,
        outline: "none",
        resize: "vertical",
        boxSizing: "border-box",
        color: "#262626",
        background: "#fff",
        lineHeight: 1.7,
      },
    }),
    React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          bottom: 8,
          right: 8,
          display: "flex",
          alignItems: "center",
          gap: 6,
        },
      },
      isDirty &&
        React.createElement(
          "span",
          {
            style: {
              fontSize: 11,
              fontFamily: FONT,
              color: "#fa8c16",
              background: "#fff7e6",
              border: "1px solid #ffd591",
              borderRadius: 10,
              padding: "1px 8px",
            },
          },
          "Chưa lưu",
        ),
      React.createElement(
        "div",
        {
          onClick: saving ? null : handleSave,
          style: {
            fontSize: 12,
            fontFamily: FONT,
            padding: "3px 12px",
            borderRadius: 4,
            fontWeight: 600,
            background: saving ? "#f0f0f0" : isDirty ? "#1890ff" : "#f5f5f5",
            color: saving ? "#bfbfbf" : isDirty ? "#fff" : "#bfbfbf",
            cursor: saving ? "not-allowed" : isDirty ? "pointer" : "default",
          },
        },
        saving ? "Đang lưu..." : isDirty ? "💾 Lưu" : "✓ Đã lưu",
      ),
    ),
  );
};

const ActivityTab = ({ collectionName, recordId, lawyers }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const INITIAL_COUNT = 10;

  const collectionMap = {
    tasks: "Task",
    task: "Task",
    Task: "Task",
    subTasks: "SubTask",
    subTask: "SubTask",
    SubTask: "SubTask",
  };
  const normalizedName = collectionMap[collectionName] || collectionName;

  const authorName = (n) =>
    n?.createdBy?.nickname ||
    n?.createdBy?.username ||
    n?.createdBy?.email ||
    (n?.createdById ? `User #${n.createdById}` : "Ẩn danh");

  const getActivityTime = (a) =>
    new Date(
      a?.action === "created"
        ? a.createdAt || a.changedAt || a.updatedAt
        : a?.changedAt || a?.updatedAt || a?.createdAt,
    );

  const getActivitySortTime = (item) => {
    if (item._kind === "group") return item.latestTime || 0;
    if (item._kind === "taskLog") return item._time?.getTime?.() || 0;
    return item._time?.getTime?.() || 0;
  };

  const activityLogKey = (a) =>
    a?.batchId
      ? [
          "batch",
          a.collectionName || "",
          extractId(a.recordId) || "",
          a.action || "",
          a.fieldName || "",
          a.batchId || "",
          extractId(a.dataId) || "",
          a.oldValue || "",
          a.newValue || "",
        ].join("|")
      : [
          "time",
          a?.collectionName || "",
          extractId(a?.recordId) || "",
          a?.action || "",
          a?.fieldName || "",
          extractId(a?.dataId) || "",
          a?.oldValue || "",
          a?.newValue || "",
          a?.changedAt || a?.updatedAt || a?.createdAt || "",
        ].join("|");

  const activityLogRenderKey = (a) => {
    const field = ["title", "documents"].includes(a?.fieldName)
      ? "documents"
      : ["assignees", "assignedLawyerId"].includes(a?.fieldName)
        ? "assignees"
        : ["body", "notes"].includes(a?.fieldName)
          ? "body"
          : a?.fieldName || "";
    return [
      a?.action || "",
      field,
      a?.batchId || "",
      extractId(a?.dataId) || extractId(a?.recordId) || "",
      a?.oldValue || "",
      a?.newValue || "",
    ].join("|");
  };

  const uniqueActivityLogs = (logs) => {
    const seen = new Set();
    return (logs || []).filter((a) => {
      const key = activityLogKey(a);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const fetchChildActivityLogs = async (childCollectionName, records) => {
    const ids = Array.from(
      new Set((records || []).map((r) => extractId(r.id)).filter(Boolean)),
    );
    if (ids.length === 0) return [];

    const chunks = [];
    for (let i = 0; i < ids.length; i += 50) {
      chunks.push(ids.slice(i, i + 50));
    }

    try {
      const resList = await Promise.all(
        chunks.map((chunk) =>
          ctx.api.request({
            url: "activity_log:list",
            params: {
              pageSize: 500,
              page: 1,
              sort: ["-id"],
              filter: JSON.stringify({
                $and: [
                  { collectionName: { $eq: childCollectionName } },
                  { recordId: { $in: chunk } },
                ],
              }),
            },
          }),
        ),
      );
      return resList.flatMap((res) => res?.data?.data || []);
    } catch {
      const nested = await Promise.all(
        ids.map((id) => fetchActivityLog(childCollectionName, id)),
      );
      return nested.flat();
    }
  };

  const hasAssigneeValue = (assignees) => {
    if (!assignees) return false;
    if (typeof assignees === "string") return assignees.trim().length > 0;
    if (Array.isArray(assignees)) return assignees.length > 0;
    return true;
  };

  const getCommentLayoutType = ({ body, assignees, files }) => {
    const hasText = getCommentText(body, true).length > 0;
    const hasMentions = hasAssigneeValue(assignees);
    const hasFiles = (files || []).length > 0;

    if (hasText && (hasMentions || hasFiles)) return "commentGroup";
    if (hasText) return "commentOnly";
    if (hasFiles && hasMentions) return "commentGroup";
    if (hasFiles) return "fileOnly";
    if (hasMentions) return "mentionOnly";
    return "empty";
  };

  const getLayoutActionLabel = (layoutType, action, collection = null) => {
    const isCommentLayout =
      layoutType === "commentGroup" ||
      layoutType === "commentOnly" ||
      layoutType === "mentionOnly" ||
      collection === "Note";

    if (isCommentLayout && action === "updated")
      return "\u0111\u00e3 ch\u1ec9nh s\u1eeda b\u00ecnh lu\u1eadn";
    if (isCommentLayout && action === "deleted")
      return "\u0111\u00e3 x\u00f3a b\u00ecnh lu\u1eadn";

    const layoutLabels = {
      fileOnly: "\u0111\u00e3 t\u1ea3i l\u00ean t\u1ec7p",
      commentGroup: "\u0111\u00e3 b\u00ecnh lu\u1eadn",
      commentOnly: "\u0111\u00e3 b\u00ecnh lu\u1eadn",
      mentionOnly: "\u0111\u00e3 b\u00ecnh lu\u1eadn",
    };
    const actionLabels = {
      created: "\u0111\u00e3 b\u00ecnh lu\u1eadn",
      commented: "\u0111\u00e3 b\u00ecnh lu\u1eadn",
      updated: "\u0111\u00e3 ch\u1ec9nh s\u1eeda",
      deleted: "\u0111\u00e3 x\u00f3a b\u1ecf",
      uploaded: "\u0111\u00e3 t\u1ea3i l\u00ean",
    };
    return (
      layoutLabels[layoutType] ||
      actionLabels[action] ||
      "\u0111\u00e3 th\u1ef1c hi\u1ec7n"
    );
  };

  const getLayoutBadge = (layoutType, files) => {
    const fileCount = (files || []).length;
    if (layoutType === "commentGroup") {
      return fileCount > 0
        ? `B\u00ecnh lu\u1eadn + ${fileCount} t\u1ec7p`
        : "B\u00ecnh lu\u1eadn + nh\u1eafc t\u00ean";
    }
    if (layoutType === "commentOnly") return "B\u00ecnh lu\u1eadn";
    if (layoutType === "fileOnly")
      return fileCount > 1
        ? `${fileCount} t\u1ec7p`
        : "T\u1ec7p \u0111\u00ednh k\u00e8m";
    if (layoutType === "mentionOnly") return "Nh\u1eafc t\u00ean";
    return null;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // reloadData
  // ─────────────────────────────────────────────────────────────────────────
  const reloadData = useCallback(async () => {
    setLoading(true);
    setShowAll(false);

    try {
      const [parentLogsRaw, notes, files] = await Promise.all([
        fetchActivityLog(normalizedName, recordId),
        fetchNotes(normalizedName, recordId, true),
        fetchFiles(normalizedName, recordId, true),
      ]);

      const [noteLogsRaw, documentLogsRaw] = await Promise.all([
        fetchChildActivityLogs("Note", notes),
        fetchChildActivityLogs("Document", files),
      ]);

      const parentLogs = uniqueActivityLogs(parentLogsRaw);
      const childLogs = uniqueActivityLogs([
        ...noteLogsRaw,
        ...documentLogsRaw,
      ]);

      const notesMap = {};
      notes.forEach((n) => (notesMap[extractId(n.id)] = n));

      const noteIdSet = new Set(notes.map((n) => extractId(n.id)));
      const fileIdSet = new Set(files.map((f) => extractId(f.id)));
      const childBatchIds = new Set(
        [...notes, ...files].map((x) => x.batchId).filter(Boolean),
      );
      const NOTE_FIELDS = new Set([
        "body",
        "notes",
        "assignees",
        "assignedLawyerId",
        "isDeleted",
      ]);
      const DOCUMENT_FIELDS = new Set(["documents", "title", "isDeleted"]);
      const CHILD_LOG_FIELDS = new Set([
        "body",
        "notes",
        "assignees",
        "assignedLawyerId",
        "title",
        "documents",
        "isDeleted",
      ]);
      const TASK_LOG_FIELDS = new Set([
        ...Object.keys(FIELD_LABEL),
        ...Object.keys(ACTIVITY_FIELD_LABELS),
        "subTaskName",
        "deadline",
        "date",
        "blockedReason",
        "rejectionReason",
      ]);

      const isChildMirrorLog = (a) => {
        const field = a.fieldName;
        const dataId = extractId(a.dataId);
        if (NOTE_FIELDS.has(field) && noteIdSet.has(dataId)) return true;
        if (DOCUMENT_FIELDS.has(field) && fileIdSet.has(dataId)) return true;
        if (
          a.batchId &&
          childBatchIds.has(a.batchId) &&
          (NOTE_FIELDS.has(field) || DOCUMENT_FIELDS.has(field))
        ) {
          return true;
        }
        return false;
      };

      const commentBodySnapshots = new Set();
      const addCommentBodySnapshot = (value) => {
        const text = getCommentText(value, true);
        if (text) commentBodySnapshots.add(text);
      };
      notes.forEach((n) => addCommentBodySnapshot(n.body));
      childLogs.forEach((l) => {
        if (
          l.collectionName === "Note" &&
          (l.fieldName === "body" || l.fieldName === "notes")
        ) {
          addCommentBodySnapshot(l.oldValue);
          addCommentBodySnapshot(l.newValue);
        }
      });

      const isLegacyParentCommentLog = (a) => {
        if (!["created", "commented", "updated", "deleted"].includes(a.action))
          return false;
        if (a.fieldName === "notes") return true;
        if (a.fieldName !== "body") return false;
        const oldText = getCommentText(a.oldValue, true);
        const newText = getCommentText(a.newValue, true);
        return (
          (oldText && commentBodySnapshots.has(oldText)) ||
          (newText && commentBodySnapshots.has(newText))
        );
      };

      const taskLogItems = parentLogs
        .filter((a) => {
          const cName = a.collectionName;
          const field = a.fieldName;
          if (cName !== "Task" && cName !== "SubTask") return false;
          if (isChildMirrorLog(a)) return false;
          if (isLegacyParentCommentLog(a)) return false;
          return !field || TASK_LOG_FIELDS.has(field);
        })
        .map((a) => ({
          _kind: "taskLog",
          _action: a.action,
          _time: getActivityTime(a),
          data: a,
        }));

      const usedFileIds = new Set();
      const getFilesForNote = (note) => {
        const noteTime = new Date(note.createdAt).getTime();
        const result = files.filter((f) => {
          if (usedFileIds.has(extractId(f.id))) return false;
          return (
            (note.batchId && f.batchId && note.batchId === f.batchId) ||
            Math.abs(new Date(f.createdAt).getTime() - noteTime) <= 5000
          );
        });
        result.forEach((f) => usedFileIds.add(extractId(f.id)));
        return result;
      };

      const unifiedItems = notes
        .map((n) => {
          const noteId = extractId(n.id);
          const attachedFiles = getFilesForNote(n);
          const parentNote = n.parentId
            ? notesMap[extractId(n.parentId)]
            : null;
          const parentAuthor = parentNote ? authorName(parentNote) : null;

          const createBodyLog = childLogs.find(
            (l) =>
              l.collectionName === "Note" &&
              (l.action === "created" || l.action === "commented") &&
              extractId(l.recordId) === noteId &&
              (l.fieldName === "body" || l.fieldName === "notes"),
          );
          const createAssigneesLog = childLogs.find(
            (l) =>
              l.collectionName === "Note" &&
              l.action === "created" &&
              extractId(l.recordId) === noteId &&
              (l.fieldName === "assignees" ||
                l.fieldName === "assignedLawyerId"),
          );
          const originalBody = createBodyLog ? createBodyLog.newValue : n.body;
          const originalAssignees = createAssigneesLog
            ? createAssigneesLog.newValue
            : n.assignees || [];
          const layoutType = getCommentLayoutType({
            body: originalBody,
            assignees: originalAssignees,
            files: attachedFiles,
          });

          return {
            _kind: "unified",
            _action: "created",
            _time: new Date(n.createdAt),
            note: n,
            files: attachedFiles,
            parentAuthor,
            parentNote,
            originalBody,
            originalAssignees,
            layoutType,
          };
        })
        .filter((it) => it.layoutType !== "empty");

      const logItems = childLogs
        .map((a) => {
          const field = a.fieldName;
          const act = a.action;
          const cName = a.collectionName;
          const recordLogId = extractId(a.recordId);
          const dataId = extractId(a.dataId);

          if (!["Note", "Document"].includes(cName)) return null;
          if (field && !CHILD_LOG_FIELDS.has(field)) return null;

          if ((act === "created" || act === "commented") && cName === "Note") {
            if (noteIdSet.has(recordLogId) || noteIdSet.has(dataId))
              return null;
          }

          if (
            (act === "created" || act === "uploaded") &&
            cName === "Document"
          ) {
            if (fileIdSet.has(recordLogId) || fileIdSet.has(dataId))
              return null;
          }

          if (
            field === "assignedLawyerId" &&
            childLogs.some(
              (l) =>
                l !== a &&
                l.collectionName === cName &&
                extractId(l.recordId) === recordLogId &&
                l.action === act &&
                l.batchId &&
                l.batchId === a.batchId &&
                l.fieldName === "assignees",
            )
          ) {
            return null;
          }

          const isNoteCommentField =
            cName === "Note" &&
            ["body", "notes", "assignees", "assignedLawyerId"].includes(field);
          const relatedNote =
            cName === "Note"
              ? notesMap[recordLogId] || notesMap[dataId] || null
              : null;
          const relatedParentNote = relatedNote?.parentId
            ? notesMap[extractId(relatedNote.parentId)]
            : null;

          return {
            _kind: "log",
            _action: act,
            _time: getActivityTime(a),
            data: a,
            note: relatedNote,
            parentNote: relatedParentNote,
            parentAuthor: relatedParentNote
              ? authorName(relatedParentNote)
              : null,
            layoutType: isNoteCommentField ? "commentGroup" : undefined,
          };
        })
        .filter(Boolean);

      const orphanFiles = files
        .filter((f) => !usedFileIds.has(extractId(f.id)))
        .map((f) => ({
          _kind: "unified",
          _action: "uploaded",
          _time: new Date(f.createdAt),
          note: null,
          files: [f],
          parentAuthor: null,
          parentNote: null,
          originalBody: null,
          originalAssignees: [],
          layoutType: "fileOnly",
        }));

      const noteDocumentItems = [
        ...unifiedItems,
        ...logItems,
        ...orphanFiles,
      ].sort((a, b) => b._time - a._time);

      const groups = new Map();
      noteDocumentItems.forEach((it) => {
        const act = it._action;
        const cName =
          it._kind === "log"
            ? it.data.collectionName || "unknown"
            : it.note
              ? "Note"
              : "Document";
        let gId;

        if (it._kind === "unified" && it.note) {
          gId = `created_note_${extractId(it.note.id)}`;
        } else if (it._kind === "unified" && !it.note) {
          const bId = it.files?.[0]?.batchId;
          gId = bId
            ? `uploaded_document_batch_${bId}`
            : `uploaded_document_${extractId(it.files?.[0]?.id)}`;
        } else {
          const targetId =
            extractId(it.data.recordId) || extractId(it.data.dataId) || "no_id";
          const bId = it.data.batchId;
          gId = bId
            ? `log_${act}_${cName}_batch_${bId}`
            : `log_${act}_${cName}_${targetId}_${it._time.getTime()}`;
        }

        const time = it._time.getTime();
        if (!groups.has(gId)) {
          groups.set(gId, {
            id: gId,
            action: act,
            collectionName: cName,
            items: [],
            latestTime: 0,
            isDeleted: false,
            _kind: "group",
            layoutType: it.layoutType || "logGroup",
          });
        }

        const g = groups.get(gId);
        if (it.layoutType && g.layoutType === "logGroup") {
          g.layoutType = it.layoutType;
        }
        const isDup = g.items.some((prev) => {
          if (it._kind === "unified" && prev._kind === "unified") {
            const currentId = it.note
              ? `note_${extractId(it.note.id)}`
              : `doc_${extractId(it.files?.[0]?.id)}`;
            const prevId = prev.note
              ? `note_${extractId(prev.note.id)}`
              : `doc_${extractId(prev.files?.[0]?.id)}`;
            return currentId === prevId;
          }
          if (it._kind === "log" && prev._kind === "log") {
            return (
              activityLogKey(prev.data) === activityLogKey(it.data) ||
              activityLogRenderKey(prev.data) === activityLogRenderKey(it.data)
            );
          }
          return false;
        });

        if (!isDup) g.items.push(it);
        if (time > g.latestTime) g.latestTime = time;
        if (it._kind === "log" && it.data.action === "deleted")
          g.isDeleted = true;
      });

      const finalItems = [...Array.from(groups.values()), ...taskLogItems].sort(
        (a, b) => getActivitySortTime(b) - getActivitySortTime(a),
      );

      setItems(finalItems);
    } catch (e) {
      console.error("ActivityTab reload error:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [recordId, normalizedName]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  // ─────────────────────────────────────────────────────────────────────────
  // renderAssigneeTags
  // ─────────────────────────────────────────────────────────────────────────
  const renderAssigneeTags = (assignees, isOld = false, isDel = false) => {
    if (!assignees) return null;

    const color = isOld ? "error" : isDel ? "default" : "processing";
    const style = {
      margin: "2px",
      fontSize: 11,
      borderRadius: 4,
      textDecoration: isOld || isDel ? "line-through" : "none",
      color: isOld ? "#cf1322" : undefined,
    };

    // String "name1, name2"
    if (typeof assignees === "string") {
      return assignees
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n, i) =>
          React.createElement(
            Tag,
            { key: i, color, style },
            n.startsWith("@") ? n : "@" + n,
          ),
        );
    }

    // Array [{id} | id]
    if (Array.isArray(assignees)) {
      return assignees
        .map((item) => {
          const id = typeof item === "object" && item !== null ? item.id : item;
          if (typeof id === "string" && !extractId(id)) {
            const name = id.trim();
            if (!name) return null;
            return React.createElement(
              Tag,
              { key: name, color, style },
              name.startsWith("@") ? name : "@" + name,
            );
          }
          const u = lawyers?.find((l) => extractId(l.id) === extractId(id));
          if (!u) return null;
          return React.createElement(
            Tag,
            { key: id, color, style },
            "@" + (u.nickname || u.username || u.lawyerName || u.email),
          );
        })
        .filter(Boolean);
    }

    return null;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // renderNoteContent — layout ĐỒNG BỘ dùng cho cả unified lẫn log updated
  // Props:
  //   body, oldBody       — nội dung (oldBody chỉ có khi updated)
  //   assignees, oldAssignees
  //   files
  //   parentNote, parentAuthor
  //   isDel, isUpdated
  // ─────────────────────────────────────────────────────────────────────────
  const renderNoteContent = ({
    body,
    oldBody,
    assignees,
    oldAssignees,
    files,
    parentNote,
    parentAuthor,
    isDel = false,
    isUpdated = false,
    layoutType = "commentGroup",
  }) => {
    const hasBody = body || oldBody;
    const hasAssignees =
      hasAssigneeValue(assignees) || hasAssigneeValue(oldAssignees);
    const hasFiles = files?.length > 0;
    const isCommentOnly = layoutType === "commentOnly";
    const isFileOnly = layoutType === "fileOnly";
    const showBodyLabel = hasBody && !isCommentOnly;
    const showFileLabel = hasFiles && !isFileOnly;

    return React.createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: isCommentOnly || isFileOnly ? 6 : 10,
        },
      },

      // ── Reply context ──────────────────────────────────────────────────
      parentAuthor &&
        React.createElement(
          "div",
          {
            style: {
              fontSize: 12,
              color: "#8c8c8c",
              fontFamily: FONT,
              fontStyle: "italic",
            },
          },
          `đã phản hồi ${parentAuthor}:`,
        ),

      // ── Nội dung bình luận ─────────────────────────────────────────────
      hasBody &&
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                fontWeight: 600,
                color: "#8c8c8c",
                marginBottom: 6,
                fontFamily: FONT,
                display: showBodyLabel ? "block" : "none",
              },
            },
            "Nội dung bình luận:",
          ),
          React.createElement(
            "div",
            {
              style: {
                background: isDel
                  ? "#fff1f0"
                  : isCommentOnly
                    ? "#fff"
                    : "#e6fffb",
                border: isDel
                  ? "1px solid #ffa39e"
                  : isCommentOnly
                    ? "1px solid #e8e8e8"
                    : "1px solid #87e8de",
                borderLeft: `3px solid ${isDel ? "#ff4d4f" : "#13c2c2"}`,
                borderRadius: isCommentOnly ? 6 : 8,
                padding: isCommentOnly ? "9px 12px" : "10px 14px",
                fontSize: 13,
                fontFamily: FONT,
                lineHeight: 1.6,
              },
            },

            // Quote parent note
            parentNote &&
              React.createElement(
                "div",
                {
                  style: {
                    borderLeft: "2px solid #1890ff",
                    paddingLeft: 8,
                    marginBottom: 8,
                    color: "#8c8c8c",
                    fontSize: 12,
                    fontStyle: "italic",
                  },
                },
                renderRichText(parentNote.body, lawyers),
              ),

            // Updated: oldBody gạch đỏ
            isUpdated &&
              oldBody &&
              React.createElement("div", {
                style: {
                  color: "#ff4d4f",
                  textDecoration: "line-through",
                  marginBottom: 4,
                  opacity: 0.8,
                },
                dangerouslySetInnerHTML: {
                  __html:
                    typeof oldBody === "string"
                      ? oldBody
                      : renderRichText(oldBody, lawyers),
                },
              }),
            isUpdated &&
              oldBody &&
              body &&
              React.createElement(
                "div",
                { style: { color: "#8c8c8c", fontSize: 10, margin: "2px 0" } },
                "↓ thay đổi thành ↓",
              ),

            // Nội dung hiện tại
            body
              ? React.createElement("div", {
                  style: {
                    color: isDel ? "#8c8c8c" : "#262626",
                    textDecoration: isDel ? "line-through" : "none",
                  },
                  dangerouslySetInnerHTML: {
                    __html:
                      typeof body === "string"
                        ? body
                        : renderRichText(body, lawyers),
                  },
                })
              : isDel && oldBody
                ? React.createElement("div", {
                    style: { color: "#8c8c8c", textDecoration: "line-through" },
                    dangerouslySetInnerHTML: {
                      __html:
                        typeof oldBody === "string"
                          ? oldBody
                          : renderRichText(oldBody, lawyers),
                    },
                  })
                : React.createElement(
                    "span",
                    { style: { color: "#8c8c8c", fontStyle: "italic" } },
                    "(Ghi chú có nhắc tên)",
                  ),
          ),
        ),

      // ── Đã nhắc đến ai ─────────────────────────────────────────────────
      hasAssignees &&
        React.createElement(
          "div",
          null,
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                fontWeight: 600,
                color: "#8c8c8c",
                marginBottom: 4,
                fontFamily: FONT,
              },
            },
            "Đã nhắc đến ai:",
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                background: "#fafafa",
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #f0f0f0",
                gap: 4,
              },
            },
            // Updated: old tags gạch đỏ → mũi tên → new tags
            isUpdated &&
              oldAssignees &&
              React.createElement(
                React.Fragment,
                null,
                renderAssigneeTags(oldAssignees, true, false),
                assignees?.length > 0 &&
                  React.createElement(
                    "span",
                    {
                      style: {
                        margin: "0 6px",
                        color: "#bfbfbf",
                        fontSize: 12,
                      },
                    },
                    "→",
                  ),
              ),
            // Current / deleted
            renderAssigneeTags(
              isDel && !isUpdated && oldAssignees ? oldAssignees : assignees,
              isDel && !isUpdated,
              isDel,
            ),
          ),
        ),

      // ── Tệp đính kèm ───────────────────────────────────────────────────
      hasFiles &&
        React.createElement(
          "div",
          { style: { marginTop: 4 } },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                fontWeight: 600,
                color: "#8c8c8c",
                marginBottom: 4,
                fontFamily: FONT,
                display: showFileLabel ? "block" : "none",
              },
            },
            "Tệp đính kèm:",
          ),
          files.map((f) => {
            const att = Array.isArray(f.fileAttachment)
              ? f.fileAttachment[0]
              : f.fileAttachment;
            const rawName =
              f.title || att?.title || att?.filename || "(Chưa có tên)";
            const fExt = att?.extname || "";
            const displayName = rawName
              .toLowerCase()
              .endsWith(fExt.toLowerCase())
              ? rawName
              : rawName + fExt;
            const eInfo = getExtInfo(fExt);
            const fUrl = getFullUrl(att?.url || att?.preview);
            const isFileDeleted = f.isDeleted || isDel;

            return React.createElement(
              "div",
              {
                key: f.id,
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: isFileDeleted ? "#fff1f0" : "#f9f0ff",
                  border: isFileDeleted
                    ? "1px solid #ffa39e"
                    : "1px solid #d3adf7",
                  borderLeft: `3px solid ${isFileDeleted ? "#ff4d4f" : "#722ed1"}`,
                  borderRadius: 4,
                  padding: "4px 10px",
                  marginBottom: 4,
                  opacity: isFileDeleted ? 0.7 : 1,
                  cursor: fUrl && !isFileDeleted ? "pointer" : "default",
                },
                onClick:
                  fUrl && !isFileDeleted
                    ? () => window.open(fUrl, "_blank")
                    : undefined,
              },
              React.createElement(
                "span",
                { style: { fontSize: 12 } },
                eInfo.icon,
              ),
              React.createElement(
                "span",
                {
                  style: {
                    fontSize: 11,
                    fontFamily: FONT,
                    fontWeight: 600,
                    color: isFileDeleted ? "#8c8c8c" : "#262626",
                    textDecoration: isFileDeleted ? "line-through" : "none",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                },
                displayName,
              ),
              fUrl &&
                !isFileDeleted &&
                React.createElement(
                  "span",
                  {
                    style: { fontSize: 10, color: "#722ed1", fontWeight: 700 },
                  },
                  "TẢI VỀ",
                ),
            );
          }),
        ),
    );
  };

  const renderTaskLog = (item, key) => {
    const a = item.data;
    const timeVal =
      a.action === "created"
        ? a.createdAt || a.changedAt || a.updatedAt
        : a.changedAt || a.updatedAt || a.createdAt;
    const fieldLabel = tF(a.fieldName || "dữ liệu");
    const user = a.changedByName || "Hệ thống";
    const actionLabel =
      a.action === "created"
        ? `\u0111\u00e3 t\u1ea1o ${fieldLabel}`
        : a.action === "deleted"
          ? `\u0111\u00e3 x\u00f3a ${fieldLabel}`
          : `\u0111\u00e3 c\u1eadp nh\u1eadt ${fieldLabel}`;
    const oldVal = a.oldValue ? formatActivityValue(a.oldValue) : "—";
    const newVal = a.newValue ? formatActivityValue(a.newValue) : "—";
    const showOldValue = a.action !== "created";
    const showArrow = a.action !== "created";

    return React.createElement(
      "div",
      {
        key,
        style: {
          margin: "12px 16px",
          background: "#fff",
          borderRadius: 8,
          border: "1px solid #e8e8e8",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
          overflow: "hidden",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            padding: "10px 14px",
            background: "#fafafa",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            gap: 10,
            alignItems: "center",
          },
        },
        React.createElement(Av, { name: user, size: 24 }),
        React.createElement(
          "div",
          { style: { flex: 1, minWidth: 0, fontFamily: FONT } },
          React.createElement(
            "span",
            { style: { fontSize: 13, fontWeight: 700, color: "#262626" } },
            user,
          ),
          React.createElement(
            "span",
            { style: { fontSize: 13, color: "#595959" } },
            ` ${actionLabel} lúc `,
          ),
          React.createElement(
            "span",
            { style: { fontSize: 12, color: "#8c8c8c", whiteSpace: "nowrap" } },
            fmt(timeVal, "full") || "—",
          ),
        ),
      ),
      React.createElement(
        "div",
        {
          style: {
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            fontSize: 12,
            fontFamily: FONT,
          },
        },
        React.createElement(
          "span",
          { style: { color: "#8c8c8c", fontWeight: 700 } },
          "Giá trị:",
        ),
        showOldValue &&
          React.createElement(
            "span",
            {
              style: {
                color: "#cf1322",
                background: "#fff1f0",
                padding: "2px 8px",
                borderRadius: 4,
                textDecoration: a.oldValue ? "line-through" : "none",
                maxWidth: "100%",
                overflowWrap: "anywhere",
              },
            },
            oldVal,
          ),
        showArrow &&
          React.createElement(
            "span",
            { style: { color: "#8c8c8c", fontWeight: 700 } },
            "→",
          ),
        React.createElement(
          "span",
          {
            style: {
              color: a.action === "deleted" ? "#8c8c8c" : "#237804",
              background: a.action === "deleted" ? "#f5f5f5" : "#f6ffed",
              padding: "2px 8px",
              borderRadius: 4,
              maxWidth: "100%",
              overflowWrap: "anywhere",
            },
          },
          newVal,
        ),
      ),
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // renderGroup — header card
  // ─────────────────────────────────────────────────────────────────────────
  const getGroupActionSummary = (group) => {
    const { items, action, collectionName, layoutType } = group;
    const logs = items.filter((it) => it._kind === "log").map((it) => it.data);
    const hasBodyLog = logs.some((a) =>
      ["body", "notes"].includes(a.fieldName),
    );
    const hasAssigneeLog = logs.some((a) =>
      ["assignees", "assignedLawyerId"].includes(a.fieldName),
    );
    const firstUnified = items.find((it) => it._kind === "unified");
    const fileCount = items.reduce(
      (sum, it) => sum + (it.files?.length || 0),
      0,
    );

    if (collectionName === "Note" && action === "updated") {
      if (hasBodyLog && hasAssigneeLog)
        return "S\u1eeda n\u1ed9i dung b\u00ecnh lu\u1eadn v\u00e0 c\u1eadp nh\u1eadt ng\u01b0\u1eddi \u0111\u01b0\u1ee3c nh\u1eafc";
      if (hasBodyLog) return "S\u1eeda n\u1ed9i dung b\u00ecnh lu\u1eadn";
      if (hasAssigneeLog)
        return "C\u1eadp nh\u1eadt ng\u01b0\u1eddi \u0111\u01b0\u1ee3c nh\u1eafc trong b\u00ecnh lu\u1eadn";
    }

    if (collectionName === "Note" && action === "deleted")
      return "X\u00f3a b\u00ecnh lu\u1eadn";

    if (firstUnified?.parentAuthor)
      return `Ph\u1ea3n h\u1ed3i b\u00ecnh lu\u1eadn c\u1ee7a ${firstUnified.parentAuthor}`;

    if (layoutType === "fileOnly")
      return fileCount > 1
        ? `T\u1ea3i l\u00ean ${fileCount} t\u1ec7p \u0111\u00ednh k\u00e8m`
        : "T\u1ea3i l\u00ean t\u1ec7p \u0111\u00ednh k\u00e8m";

    if (layoutType === "commentGroup")
      return "T\u1ea1o b\u00ecnh lu\u1eadn k\u00e8m th\u00f4ng tin li\u00ean quan";

    if (layoutType === "commentOnly") return "T\u1ea1o b\u00ecnh lu\u1eadn";

    return null;
  };

  const renderActionSummary = (text) => {
    if (!text) return null;
    return React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          fontFamily: FONT,
          color: "#595959",
          background: "#fafafa",
          border: "1px solid #f0f0f0",
          borderRadius: 6,
          padding: "6px 10px",
        },
      },
      React.createElement(
        "span",
        { style: { color: "#8c8c8c", fontWeight: 700 } },
        "H\u00e0nh \u0111\u1ed9ng:",
      ),
      React.createElement("span", null, text),
    );
  };

  const renderCompositeNoteLogGroup = (group) => {
    const noteLogs = group.items.filter(
      (it) =>
        it._kind === "log" &&
        it.data.collectionName === "Note" &&
        ["body", "notes", "assignees", "assignedLawyerId"].includes(
          it.data.fieldName,
        ),
    );
    if (noteLogs.length === 0) return null;

    const bodyLog = noteLogs.find((it) =>
      ["body", "notes"].includes(it.data.fieldName),
    );
    const assigneeLog = noteLogs.find((it) =>
      ["assignees", "assignedLawyerId"].includes(it.data.fieldName),
    );
    const source = bodyLog || assigneeLog || noteLogs[0];
    const isDel = group.isDeleted || source.data.action === "deleted";
    const isUpd = noteLogs.some((it) => it.data.action === "updated");
    const relatedNote = source.note;

    return React.createElement(
      "div",
      { key: "note-composite" },
      renderNoteContent({
        body: bodyLog
          ? isUpd
            ? bodyLog.data.newValue
            : isDel
              ? null
              : bodyLog.data.newValue
          : relatedNote?.body,
        oldBody: bodyLog
          ? isUpd
            ? bodyLog.data.oldValue
            : isDel
              ? bodyLog.data.oldValue
              : null
          : null,
        assignees: assigneeLog
          ? isUpd
            ? assigneeLog.data.newValue
            : isDel
              ? null
              : assigneeLog.data.newValue
          : null,
        oldAssignees: assigneeLog
          ? isUpd
            ? assigneeLog.data.oldValue
            : isDel
              ? assigneeLog.data.oldValue
              : null
          : null,
        parentNote: source.parentNote,
        parentAuthor: source.parentAuthor,
        isDel,
        isUpdated: isUpd,
        layoutType: "commentGroup",
      }),
    );
  };

  const renderGroup = (group, key) => {
    const {
      items,
      latestTime,
      action,
      isDeleted,
      layoutType = "logGroup",
    } = group;
    const firstIt = items[0];
    const filesInGroup = items.flatMap((it) => it.files || []);
    const isOnlyLayout =
      layoutType === "commentOnly" || layoutType === "fileOnly";
    const badge = getLayoutBadge(layoutType, filesInGroup);

    // Tên user hiển thị
    const user =
      firstIt._kind === "log"
        ? firstIt.data.changedByName || "Hệ thống"
        : firstIt.note
          ? authorName(firstIt.note)
          : "Hệ thống";

    const actionLabel = getLayoutActionLabel(
      layoutType,
      action,
      group.collectionName,
    );
    const actionSummary = getGroupActionSummary(group);
    const compositeNoteLog = renderCompositeNoteLogGroup(group);

    return React.createElement(
      "div",
      {
        key,
        style: {
          margin: "12px 16px",
          background: "#fff",
          borderRadius: isOnlyLayout ? 8 : 10,
          border:
            layoutType === "fileOnly"
              ? "1px solid #d3adf7"
              : "1px solid #f0f0f0",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
          overflow: "hidden",
        },
      },

      // Header
      React.createElement(
        "div",
        {
          style: {
            padding: "10px 16px",
            background: "#fafafa",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            alignItems: "center",
          },
        },
        React.createElement(Av, { name: user, size: 24 }),
        React.createElement(
          "div",
          {
            style: {
              marginLeft: 10,
              display: "flex",
              alignItems: "center",
              gap: 4,
              flexWrap: "wrap",
              flex: 1,
              minWidth: 0,
            },
          },
          React.createElement(
            "span",
            {
              style: {
                fontWeight: 600,
                color: "#262626",
                fontSize: 13,
                fontFamily: FONT,
              },
            },
            user,
          ),
          React.createElement(
            "span",
            { style: { color: "#8c8c8c", fontSize: 12, fontFamily: FONT } },
            `${actionLabel} l\u00fac ${fmt(latestTime, "full") || "\u2014"}`,
          ),
          badge &&
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 11,
                  color: layoutType === "fileOnly" ? "#531dab" : "#006d75",
                  background: layoutType === "fileOnly" ? "#f9f0ff" : "#e6fffb",
                  border: `1px solid ${
                    layoutType === "fileOnly" ? "#d3adf7" : "#87e8de"
                  }`,
                  borderRadius: 4,
                  padding: "1px 6px",
                  marginLeft: 6,
                  fontFamily: FONT,
                  whiteSpace: "nowrap",
                },
              },
              badge,
            ),
        ),
      ),

      // Body
      React.createElement(
        "div",
        {
          style: {
            padding: isOnlyLayout ? "10px 14px" : "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: isOnlyLayout ? 8 : 12,
          },
        },
        renderActionSummary(actionSummary),
        compositeNoteLog ||
          items.map((it, idx) => {
            if (it._kind === "log") return renderLogInner(it, idx, isDeleted);
            if (it._kind === "unified")
              return renderUnifiedInner(it, idx, isDeleted);
            return null;
          }),
      ),
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // renderLogInner — card updated / deleted
  // ─────────────────────────────────────────────────────────────────────────
  const renderLogInner = (item, idx, isDeletedGroup) => {
    const a = item.data;
    const isDel = isDeletedGroup || a.action === "deleted";
    const isUpd = a.action === "updated";
    const field = a.fieldName;

    // body / notes → dùng renderNoteContent để layout đồng bộ với unified
    if (field === "body" || field === "notes") {
      return React.createElement(
        "div",
        { key: idx, style: { marginTop: idx > 0 ? 12 : 0 } },
        renderNoteContent({
          body: isUpd ? a.newValue : isDel ? null : a.newValue,
          oldBody: isUpd ? a.oldValue : isDel ? a.oldValue : null,
          isDel,
          isUpdated: isUpd,
        }),
      );
    }

    // assignees / assignedLawyerId → dùng renderNoteContent
    if (field === "assignees" || field === "assignedLawyerId") {
      return React.createElement(
        "div",
        { key: idx, style: { marginTop: idx > 0 ? 12 : 0 } },
        renderNoteContent({
          assignees: isUpd ? a.newValue : isDel ? null : a.newValue,
          oldAssignees: isUpd ? a.oldValue : isDel ? a.oldValue : null,
          isDel,
          isUpdated: isUpd,
        }),
      );
    }

    // documents / title
    if (field === "documents" || field === "title") {
      return React.createElement(
        "div",
        { key: idx, style: { marginTop: idx > 0 ? 12 : 0 } },
        React.createElement(
          "div",
          {
            style: {
              fontSize: 12,
              fontWeight: 600,
              color: "#8c8c8c",
              marginBottom: 4,
              fontFamily: FONT,
            },
          },
          "Tệp đính kèm:",
        ),
        React.createElement(
          "div",
          {
            style: {
              background: isDel ? "#fff1f0" : "#f9f0ff",
              border: isDel ? "1px solid #ffa39e" : "1px solid #d3adf7",
              borderLeft: `3px solid ${isDel ? "#ff4d4f" : "#722ed1"}`,
              borderRadius: 4,
              padding: "8px 12px",
            },
          },
          isUpd &&
            a.oldValue &&
            React.createElement(
              "div",
              {
                style: {
                  color: "#ff4d4f",
                  textDecoration: "line-through",
                  fontSize: 12,
                  marginBottom: 4,
                },
              },
              a.oldValue,
            ),
          isUpd &&
            a.oldValue &&
            a.newValue &&
            React.createElement(
              "div",
              { style: { fontSize: 10, color: "#bfbfbf", margin: "2px 0" } },
              "↓",
            ),
          a.newValue &&
            React.createElement(
              "div",
              {
                style: {
                  fontWeight: 600,
                  fontSize: 13,
                  color: isDel ? "#8c8c8c" : "#262626",
                  textDecoration: isDel ? "line-through" : "none",
                },
              },
              a.newValue,
            ),
          isDel &&
            !isUpd &&
            a.oldValue &&
            React.createElement(
              "div",
              {
                style: {
                  fontWeight: 600,
                  fontSize: 13,
                  color: "#8c8c8c",
                  textDecoration: "line-through",
                },
              },
              a.oldValue,
            ),
        ),
      );
    }

    // Default: status, priority, v.v.
    const label = (
      ACTIVITY_FIELD_LABELS?.[field] ||
      FIELD_LABEL?.[field] ||
      field ||
      ""
    ).toLowerCase();
    return React.createElement(
      "div",
      {
        key: idx,
        style: {
          borderTop: idx > 0 ? "1px dashed #f0f0f0" : "none",
          paddingTop: idx > 0 ? 12 : 0,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            fontSize: 13,
            color: "#595959",
            marginBottom: 4,
            fontFamily: FONT,
          },
        },
        isUpd ? `cập nhật [${label}]` : `đã xóa [${label}]`,
      ),
      (a.oldValue || a.newValue) &&
        React.createElement(
          "div",
          {
            style: {
              fontSize: 12,
              fontFamily: FONT,
              background: isDel ? "#fff1f0" : "#fafafa",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #f0f0f0",
              opacity: isDel ? 0.7 : 1,
              marginTop: 4,
            },
          },
          a.oldValue &&
            React.createElement("div", {
              style: {
                color: "#ff4d4f",
                textDecoration: "line-through",
                marginBottom: a.newValue ? 4 : 0,
              },
              dangerouslySetInnerHTML: {
                __html: formatActivityValue(a.oldValue),
              },
            }),
          a.newValue &&
            React.createElement("div", {
              style: { color: isDel ? "#8c8c8c" : "#262626" },
              dangerouslySetInnerHTML: {
                __html: formatActivityValue(a.newValue),
              },
            }),
        ),
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // renderUnifiedInner — card created/commented
  // ─────────────────────────────────────────────────────────────────────────
  const renderUnifiedInner = (item, idx, isDel) => {
    const {
      note,
      files,
      parentAuthor,
      parentNote,
      originalBody,
      originalAssignees,
      layoutType,
    } = item;

    return React.createElement(
      "div",
      {
        key: idx,
        style: {
          borderTop: idx > 0 ? "1px dashed #f0f0f0" : "none",
          paddingTop: idx > 0 ? 12 : 0,
          opacity: isDel ? 0.6 : 1,
        },
      },
      renderNoteContent({
        body: originalBody || note?.body,
        assignees: originalAssignees || note?.assignees,
        files,
        parentNote,
        parentAuthor,
        isDel,
        isUpdated: false, // unified item luôn là created/commented
        layoutType,
      }),
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────
  const visibleItems = showAll ? items : items.slice(0, INITIAL_COUNT);
  const hasMore = items.length > INITIAL_COUNT;

  return React.createElement(
    "div",
    { style: { display: "flex", flexDirection: "column", height: "100%" } },

    // Header
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          background: "#fafafa",
          borderBottom: "1px solid #f0f0f0",
        },
      },
      React.createElement(
        Text,
        {
          style: {
            fontSize: 14,
            fontWeight: 700,
            fontFamily: FONT,
            color: "#262626",
          },
        },
        "Lịch sử hoạt động",
      ),
      React.createElement(ReloadButton, {
        onReload: reloadData,
        loading,
        size: "small",
      }),
    ),

    // Content
    React.createElement(
      "div",
      { style: { flex: 1, overflowY: "auto" } },
      loading
        ? React.createElement(
            "div",
            { style: { textAlign: "center", padding: 30 } },
            React.createElement(Spin, { size: "large" }),
          )
        : items.length === 0
          ? React.createElement(
              "div",
              {
                style: {
                  fontSize: 13,
                  color: "#bfbfbf",
                  textAlign: "center",
                  padding: "30px 0",
                  fontFamily: FONT,
                },
              },
              "Chưa có hoạt động nào",
            )
          : React.createElement(
              "div",
              null,
              ...visibleItems.map((item, i) => {
                if (item._kind === "group")
                  return renderGroup(item, `act-${i}`);
                if (item._kind === "taskLog")
                  return renderTaskLog(item, `act-task-${i}`);
                return null;
              }),
              hasMore &&
                React.createElement(
                  "div",
                  {
                    onClick: () => setShowAll((v) => !v),
                    style: {
                      margin: "16px",
                      textAlign: "center",
                      fontSize: 12,
                      fontFamily: FONT,
                      color: "#1890ff",
                      cursor: "pointer",
                      padding: "8px 0",
                      border: "1px dashed #91caff",
                      borderRadius: 6,
                      background: "#f0f8ff",
                      fontWeight: 600,
                    },
                    onMouseEnter: (e) =>
                      (e.currentTarget.style.background = "#d6ecff"),
                    onMouseLeave: (e) =>
                      (e.currentTarget.style.background = "#f0f8ff"),
                  },
                  showAll
                    ? `▲ Rút gọn (hiện ${INITIAL_COUNT} trong ${items.length})`
                    : `▼ Xem thêm ${items.length - INITIAL_COUNT} hoạt động (tổng ${items.length})`,
                ),
            ),
    ),
  );
};

const DetailModal = ({
  item,
  type,
  lawyers,
  allTasksInProject,
  tasksInService,
  services,
  projectManagerId,
  onClose,
  onUpdate,
  currentUser,
  isManager = false,
  onStatusChange,
  isAssignedToThis = false,
  projectFolderId,
  onOpenAddSubModal,
  standaloneMode = false,
}) => {
  if (!item) return null;
  const name = type === "subTask" ? item.subTaskName : item.title;
  const collectionName = type === "subTask" ? "SubTask" : "Task";
  const st = STATUS_CFG[item.status] || STATUS_CFG.toDo;

  const canEdit = isManager || isAssignedToThis;
  const canManage = isManager;
  const canAccessFilesAndTimesheet = isManager || isAssignedToThis;

  const _pool = tasksInService || allTasksInProject;

  const isLastTask = useMemo(() => {
    if (type !== "task" || !item.serviceId) return false;
    const serviceTasks = _pool.filter(
      (t) => extractId(t.serviceId) === extractId(item.serviceId),
    );
    if (serviceTasks.length === 0) return false;
    const maxId = Math.max(...serviceTasks.map((t) => extractId(t.id)));
    return extractId(item.id) === maxId;
  }, [item, _pool, type]);

  const [editName, setEditName] = useState(false);
  const [nameVal, setNameVal] = useState(name);
  const [estDurVal, setEstDurVal] = useState(item.estimatedDuration || "");
  const [openTimesheet, setOpenTimesheet] = useState(false);
  const [openActivity, setOpenActivity] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [editingFileId, setEditingFileId] = useState(null);
  const [editFileTitle, setEditFileTitle] = useState("");
  const [expandedPreviews, setExpandedPreviews] = useState({});
  const [cmtRefreshTrigger, setCmtRefreshTrigger] = useState(0);

  const handleSaveFileTitle = async (f) => {
    const newTitle = editFileTitle.trim();
    if (!newTitle) return;
    try {
      await apiReq(`documents:update?filterByTk=${f.id}`, "POST", {
        title: newTitle,
      });
      // Update local item files state to reflect change
      if (onUpdate) {
        const updatedFiles = allFiles.map((file) =>
          file.id === f.id ? { ...file, title: newTitle } : file,
        );
        onUpdate({ ...item, _files: updatedFiles });
      }
      message.success("Đã cập nhật tên tài liệu");
    } catch (e) {
      message.error("Lỗi cập nhật tên");
    }
    setEditingFileId(null);
    setEditFileTitle("");
  };

  const allFiles = item._files || [];
  const templateFiles = allFiles.filter(
    (f) => f.documentType && f.documentType.toLowerCase().trim() === "file mẫu",
  );
  const regularFiles = allFiles.filter(
    (f) =>
      !f.documentType || f.documentType.toLowerCase().trim() !== "file mẫu",
  );

  const inpStyle = {
    border: "1px solid #e8e8e8",
    borderRadius: 4,
    padding: "6px 10px",
    fontSize: 12,
    fontFamily: FONT,
    outline: "none",
    color: "#262626",
    background: "#fff",
    width: "100%",
    boxSizing: "border-box",
  };
  const inpReadOnly = {
    ...inpStyle,
    background: "#fafafa",
    color: "#8c8c8c",
    cursor: "not-allowed",
  };

  const toLocalDT = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const DR = ({ label, children }) =>
    React.createElement(
      "div",
      { style: { marginBottom: 12 } },
      React.createElement(
        "div",
        {
          style: {
            fontSize: 12,
            color: "#8c8c8c",
            fontFamily: FONT,
            fontWeight: 600,
            marginBottom: 4,
          },
        },
        label,
      ),
      React.createElement("div", null, children),
    );

  const handleStatus = async (newSt) => {
    if (!canEdit) return;
    if (type === "task" && item.previousTaskId) {
      const prevTask = _pool.find(
        (t) => extractId(t.id) === extractId(item.previousTaskId),
      );
      if (
        prevTask &&
        prevTask.status !== "done" &&
        prevTask.status !== "cancelled"
      ) {
        if (!["cancelled", "blocked"].includes(newSt)) {
          message.warning(`Cần hoàn thành "${prevTask.title}" trước`);
          return;
        }
      }
    }
    const resolvedSt = resolveStatus(newSt, item);
    const url =
      type === "subTask"
        ? `subTasks:update?filterByTk=${extractId(item.id)}`
        : `tasks:update?filterByTk=${extractId(item.id)}`;
    const data =
      resolvedSt === "done"
        ? { status: resolvedSt, closedDate: new Date().toISOString() }
        : { status: resolvedSt, closedDate: null };

    onUpdate({ ...item, ...data });

    try {
      await apiReq(url, "POST", data);
      await logActivity(
        collectionName,
        extractId(item.id),
        "updated",
        "status",
        st.label,
        STATUS_CFG[resolvedSt]?.label,
        userName(currentUser),
      );
      if (onStatusChange)
        onStatusChange(extractId(item.id), resolvedSt, type, data);
      message.success(`Trạng thái: ${STATUS_CFG[resolvedSt]?.label}`);
    } catch (error) {
      message.error(
        "Lỗi Backend: Tài khoản chưa được cấp quyền sửa trường này!",
      );
      onUpdate({ ...item });
    }
  };

  const handleAssign = async (id, n, c) => {
    if (!canManage) return;
    const url =
      type === "subTask"
        ? `subTasks:update?filterByTk=${extractId(item.id)}`
        : `tasks:update?filterByTk=${extractId(item.id)}`;
    await apiReq(url, "POST", { lawyerId: id });
    onUpdate({ ...item, lawyerId: id, _ln: n, _lc: c || "#8c8c8c" });
  };

  const handlePriority = async (newPr) => {
    if (!canEdit) return;
    const url =
      type === "subTask"
        ? `subTasks:update?filterByTk=${extractId(item.id)}`
        : `tasks:update?filterByTk=${extractId(item.id)}`;
    onUpdate({ ...item, priority: newPr });
    try {
      await apiReq(url, "POST", { priority: newPr });
      message.success("Đã cập nhật mức độ ưu tiên");
    } catch (e) {
      message.error("Lỗi Backend: Không có quyền cập nhật");
      onUpdate({ ...item });
    }
  };

  const saveName = async () => {
    if (!canEdit) {
      setEditName(false);
      return;
    }
    setEditName(false);
    if (!nameVal.trim() || nameVal === name) return;
    const url =
      type === "subTask"
        ? `subTasks:update?filterByTk=${extractId(item.id)}`
        : `tasks:update?filterByTk=${extractId(item.id)}`;
    const field = type === "subTask" ? "subTaskName" : "title";
    onUpdate({ ...item, [field]: nameVal.trim() });
    try {
      await apiReq(url, "POST", { [field]: nameVal.trim() });
      message.success("Đã cập nhật tên công việc");
    } catch (e) {
      message.error("Lỗi Backend: Không có quyền cập nhật");
      onUpdate({ ...item });
      setNameVal(name);
    }
  };

  const saveEstDur = async () => {
    if (!canEdit) return;
    const newVal = parseFloat(estDurVal) || null;
    const oldVal = parseFloat(item.estimatedDuration) || null;
    if (newVal === oldVal) return;
    onUpdate({ ...item, estimatedDuration: newVal });
    try {
      const url =
        type === "subTask"
          ? `subTasks:update?filterByTk=${extractId(item.id)}`
          : `tasks:update?filterByTk=${extractId(item.id)}`;
      await apiReq(url, "POST", { estimatedDuration: newVal });
      message.success("Đã cập nhật thời gian dự kiến");
    } catch (e) {
      message.error("Lỗi Backend: Không có quyền cập nhật");
      onUpdate({ ...item });
      setEstDurVal(oldVal || "");
    }
  };

  const modalTitle = React.createElement(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        paddingRight: 20,
      },
    },
    React.createElement(
      "span",
      { style: { fontSize: 18, marginRight: 4 } },
      type === "subTask" ? "↳" : "📋",
    ),
    canEdit && editName
      ? React.createElement("input", {
          value: nameVal,
          onChange: (e) => setNameVal(e.target.value),
          autoFocus: true,
          onKeyDown: (e) => {
            if (e.key === "Enter") saveName();
            if (e.key === "Escape") setEditName(false);
          },
          onBlur: saveName,
          style: {
            fontSize: 16,
            fontWeight: 600,
            fontFamily: FONT,
            border: "none",
            borderBottom: "2px solid #1890ff",
            outline: "none",
            background: "transparent",
            padding: "2px 4px",
            minWidth: 300,
          },
        })
      : React.createElement(
          "span",
          {
            onClick: canEdit ? () => setEditName(true) : undefined,
            style: {
              fontSize: 16,
              fontWeight: 600,
              fontFamily: FONT,
              color: "#1a1a1a",
              cursor: canEdit ? "text" : "default",
            },
          },
          nameVal || name,
        ),

    item.isRequiredApproval &&
      React.createElement(
        "span",
        {
          style: {
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 3,
            background: "#fff7e6",
            color: "#d46b08",
            border: "1px solid #ffd591",
          },
        },
        "Cần phê duyệt",
      ),
    item._od &&
      React.createElement(
        "span",
        {
          style: {
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 3,
            background: "#fff1f0",
            color: "#cf1322",
            border: "1px solid #ffa39e",
          },
        },
        "Quá hạn",
      ),
  );

  const renderFileList = (
    files,
    emptyMsg = "Chưa có tệp đính kèm nào.",
    hideTime = false,
  ) => {
    if (files.length === 0)
      return React.createElement(
        "div",
        {
          style: {
            fontSize: 12,
            color: "#bfbfbf",
            fontStyle: "italic",
            fontFamily: FONT,
          },
        },
        emptyMsg,
      );
    return React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 10,
        },
      },
      ...files.map((f) => {
        const att = Array.isArray(f.fileAttachment)
          ? f.fileAttachment[0]
          : f.fileAttachment;
        let originalName = att?.filename || "File";
        let ext = att?.extname
          ? att.extname.startsWith(".")
            ? att.extname.toLowerCase()
            : "." + att.extname.toLowerCase()
          : "";
        if (ext && originalName.toLowerCase().endsWith(ext))
          originalName = originalName.slice(0, -ext.length);
        const finalFileName = originalName + ext;
        const isEditingThisFile = editingFileId === f.id;
        const fullUrl = getFullUrl(att?.url || att?.preview);
        return React.createElement(
          "div",
          {
            key: f.id,
            onClick: isEditingThisFile
              ? null
              : fullUrl
                ? () => setPreviewDoc(f)
                : undefined,
            style: {
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: "10px 12px",
              background: "#fafafa",
              border: "1px solid #e8e8e8",
              borderRadius: 6,
              cursor: fullUrl ? "pointer" : "default",
              transition: "all 0.2s",
            },
            onMouseEnter: (e) =>
              (e.currentTarget.style.borderColor = "#1890ff"),
            onMouseLeave: (e) =>
              (e.currentTarget.style.borderColor = "#e8e8e8"),
          },
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 8 } },
            getFileIcon(ext),
            React.createElement(
              "div",
              { style: { flex: 1, minWidth: 0 } },
              isEditingThisFile
                ? React.createElement("input", {
                    autoFocus: true,
                    value: editFileTitle,
                    onChange: (e) => setEditFileTitle(e.target.value),
                    onClick: (e) => e.stopPropagation(),
                    onKeyDown: (e) => {
                      if (e.key === "Enter") handleSaveFileTitle(f);
                      if (e.key === "Escape") setEditingFileId(null);
                    },
                    style: {
                      width: "100%",
                      fontSize: 12,
                      fontFamily: FONT,
                      border: "1px solid #1890ff",
                      borderRadius: 4,
                      padding: "2px 6px",
                      outline: "none",
                    },
                  })
                : React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#096dd9",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      },
                    },
                    f.title || att?.title || finalFileName,
                  ),
            ),
            !isEditingThisFile &&
              canEdit &&
              React.createElement(
                "span",
                {
                  onClick: (e) => {
                    e.stopPropagation();
                    setEditingFileId(f.id);
                    setEditFileTitle(f.title || att?.title || finalFileName);
                  },
                  style: {
                    fontSize: 12,
                    cursor: "pointer",
                    color: "#8c8c8c",
                    padding: "2px 4px",
                  },
                },
                "✏️",
              ),
          ),
          f.note &&
            React.createElement(
              "div",
              {
                style: {
                  fontSize: 11,
                  color: "#262626",
                  marginTop: 4,
                  padding: "6px 10px",
                  background: "#fff",
                  borderRadius: 4,
                  border: "1px solid #f0f0f0",
                },
              },
              React.createElement(
                "span",
                {
                  style: { fontWeight: 700, color: "#8c8c8c", marginRight: 6 },
                },
                "Nội dung ghi chú:",
              ),
              f.note,
            ),
        );
      }),
    );
  };
  const headerBar = (txt, extra = null) =>
    React.createElement(
      "div",
      {
        style: {
          padding: "12px 24px",
          borderBottom: "1px solid #f0f0f0",
          background: "#fafafa",
          fontSize: 14,
          fontWeight: 600,
          color: "#262626",
          flexShrink: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        },
      },
      txt,
      extra,
    );
  if (standaloneMode) {
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            background: "#fff",
            fontFamily: FONT,
          },
        },
        React.createElement(
          "div",
          {
            style: {
              padding: "12px 24px 8px",
              borderBottom: "1px solid #e8e8e8",
              background: "#fff",
              flexShrink: 0,
            },
          },
          modalTitle,
        ),
        // ACTION BAR
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              gap: 10,
              padding: "12px 24px",
              borderBottom: "1px solid #f0f0f0",
              background: "#fff",
              flexShrink: 0,
            },
          },
          React.createElement(
            "div",
            {
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 16px",
                background: "#e6f4ff",
                color: "#096dd9",
                border: "1px solid #91caff",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "0.2s",
              },
              onClick: () => setOpenTimesheet(true),
              onMouseEnter: (e) =>
                (e.currentTarget.style.background = "#bae0ff"),
              onMouseLeave: (e) =>
                (e.currentTarget.style.background = "#e6f4ff"),
            },
            "Ghi nhận Timesheet",
          ),
          isManager &&
            React.createElement(
              "div",
              {
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 16px",
                  background: "#f5f5f5",
                  color: "#595959",
                  border: "1px solid #d9d9d9",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "0.2s",
                },
                onClick: () => setOpenActivity(true),
                onMouseEnter: (e) =>
                  (e.currentTarget.style.background = "#e8e8e8"),
                onMouseLeave: (e) =>
                  (e.currentTarget.style.background = "#f5f5f5"),
              },
              "Lịch sử hoạt động",
            ),
          type === "task" &&
            React.createElement(
              "div",
              {
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 16px",
                  background: "#f6ffed",
                  color: "#389e0d",
                  border: "1px solid #b7eb8f",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "0.2s",
                },
                onClick: () => onOpenAddSubModal(item.id),
                onMouseEnter: (e) =>
                  (e.currentTarget.style.background = "#d9f7be"),
                onMouseLeave: (e) =>
                  (e.currentTarget.style.background = "#f6ffed"),
              },
              "＋ Tạo công việc phụ",
            ),
          isLastTask &&
            React.createElement(
              "div",
              {
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 16px",
                  background: "#fff7e6",
                  color: "#d46b08",
                  border: "1px solid #ffd591",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "0.2s",
                },
                onClick: () => ctx.openView({ uid: "" }),
                onMouseEnter: (e) =>
                  (e.currentTarget.style.background = "#ffe7ba"),
                onMouseLeave: (e) =>
                  (e.currentTarget.style.background = "#fff7e6"),
              },
              "💳 Tạo yêu cầu thanh toán",
            ),
        ),

        // 🌟 CHIA GRID THEO TỶ LỆ 4 - 6
        React.createElement(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "4fr 6fr",
              flex: 1,
              overflow: "hidden",
            },
          },
          // ── CỘT TRÁI (Thông tin chung - 4 Phần) ──
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                borderRight: "1px solid #f0f0f0",
                overflow: "hidden",
              },
            },
            headerBar("Thông tin chung"),
            React.createElement(
              "div",
              { style: { padding: "20px 24px", overflowY: "auto", flex: 1 } },
              React.createElement(
                "div",
                {
                  style: {
                    background: "#fafafa",
                    padding: 16,
                    borderRadius: 8,
                    border: "1px solid #f0f0f0",
                    marginBottom: 24,
                  },
                },

                // 🌟 SẮP XẾP LẠI THÀNH 2 CỘT TRÁNH BỊ ÉP NHỎ
                React.createElement(
                  "div",
                  {
                    style: {
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      marginBottom: 16,
                    },
                  },
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 12,
                          color: "#8c8c8c",
                          fontFamily: FONT,
                          fontWeight: 600,
                          marginBottom: 4,
                        },
                      },
                      "Trạng thái",
                    ),
                    React.createElement(Select, {
                      value: item.status,
                      onChange: canEdit ? handleStatus : undefined,
                      disabled: !canEdit,
                      style: { width: "100%", fontFamily: FONT },
                      options: getStatusKeys(item.isRequiredApproval).map(
                        (k) => ({
                          label: React.createElement(
                            "div",
                            {
                              style: {
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              },
                            },
                            React.createElement("div", {
                              style: {
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background: STATUS_CFG[k].color,
                              },
                            }),
                            STATUS_CFG[k].label,
                          ),
                          value: k,
                        }),
                      ),
                    }),
                  ),
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 12,
                          color: "#8c8c8c",
                          fontFamily: FONT,
                          fontWeight: 600,
                          marginBottom: 4,
                        },
                      },
                      "Mức độ ưu tiên",
                    ),
                    React.createElement(Select, {
                      value: item.priority || "medium",
                      onChange: canEdit ? handlePriority : undefined,
                      disabled: !canEdit,
                      style: { width: "100%", fontFamily: FONT },
                      options: Object.entries(PRIORITY_CFG).map(([k, v]) => ({
                        label: `${v.label}`,
                        value: k,
                      })),
                    }),
                  ),
                ),

                React.createElement(
                  "div",
                  {
                    style: {
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      marginBottom: 16,
                    },
                  },
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 12,
                          color: "#8c8c8c",
                          fontFamily: FONT,
                          fontWeight: 600,
                          marginBottom: 4,
                        },
                      },
                      "Thời gian dự kiến",
                    ),
                    React.createElement(
                      "div",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        },
                      },
                      React.createElement("input", {
                        type: "number",
                        step: "0.5",
                        min: "0",
                        value: estDurVal,
                        onChange: canEdit
                          ? (e) => setEstDurVal(e.target.value)
                          : undefined,
                        readOnly: !canEdit,
                        placeholder: "Số giờ...",
                        style: {
                          ...(canEdit ? inpStyle : inpReadOnly),
                          width: "100%",
                        },
                        onBlur: canEdit ? saveEstDur : undefined,
                      }),
                      React.createElement(
                        "span",
                        {
                          style: {
                            color: "#8c8c8c",
                            fontSize: 12,
                            flexShrink: 0,
                          },
                        },
                        "giờ",
                      ),
                    ),
                  ),
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 12,
                          color: "#8c8c8c",
                          fontFamily: FONT,
                          fontWeight: 600,
                          marginBottom: 4,
                        },
                      },
                      "Người phụ trách",
                    ),
                    React.createElement(
                      "div",
                      {
                        style: {
                          border: "1px solid #e8e8e8",
                          borderRadius: 4,
                          padding: "4px 10px",
                          background: canManage ? "#fff" : "#fafafa",
                          minHeight: 32,
                          display: "flex",
                          alignItems: "center",
                          boxSizing: "border-box",
                        },
                      },
                      React.createElement(LawyerPicker, {
                        lawyers,
                        value: extractId(item.lawyerId),
                        size: 20,
                        readOnly: !canManage,
                        onChange: handleAssign,
                      }),
                    ),
                  ),
                ),

                // Yêu cầu xét duyệt | Người xét duyệt
                React.createElement(
                  "div",
                  {
                    style: {
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      marginBottom: 16,
                    },
                  },
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 12,
                          color: "#8c8c8c",
                          fontFamily: FONT,
                          fontWeight: 600,
                          marginBottom: 4,
                        },
                      },
                      "Yêu cầu xét duyệt",
                    ),
                    React.createElement(
                      "label",
                      {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          cursor: canManage ? "pointer" : "default",
                          fontSize: 12,
                          fontFamily: FONT,
                          color: "#595959",
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid #f0f0f0",
                          background: item.isRequiredApproval
                            ? "#fff7e6"
                            : "#fafafa",
                          minHeight: 32,
                          boxSizing: "border-box",
                        },
                      },
                      React.createElement("input", {
                        type: "checkbox",
                        checked: !!item.isRequiredApproval,
                        disabled: !canManage,
                        onChange: canManage
                          ? async (e) => {
                              const newVal = e.target.checked;
                              const payload = { isRequiredApproval: newVal };
                              if (!newVal) payload.approvedById = null; // 🌟 TỰ ĐỘNG XÓA NGƯỜI DUYỆT KHI TOGGLE TẮT

                              const url =
                                type === "subTask"
                                  ? `subTasks:update?filterByTk=${extractId(item.id)}`
                                  : `tasks:update?filterByTk=${extractId(item.id)}`;
                              await apiReq(url, "POST", payload);
                              onUpdate({ ...item, ...payload });
                            }
                          : undefined,
                        style: {
                          width: 14,
                          height: 14,
                          cursor: canManage ? "pointer" : "not-allowed",
                          accentColor: "#d46b08",
                        },
                      }),
                      React.createElement(
                        "span",
                        {
                          style: {
                            color: item.isRequiredApproval
                              ? "#d46b08"
                              : "#8c8c8c",
                            fontWeight: item.isRequiredApproval ? 600 : 400,
                          },
                        },
                        item.isRequiredApproval
                          ? "Cần phê duyệt"
                          : "Không yêu cầu",
                      ),
                    ),
                  ),
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 12,
                          color: "#8c8c8c",
                          fontFamily: FONT,
                          fontWeight: 600,
                          marginBottom: 4,
                        },
                      },
                      "Người xét duyệt",
                    ),
                    React.createElement(
                      "div",
                      {
                        style: {
                          border: "1px solid #e8e8e8",
                          borderRadius: 4,
                          padding: "4px 10px",
                          background:
                            canManage && item.isRequiredApproval
                              ? "#fff"
                              : "#fafafa",
                          minHeight: 32,
                          display: "flex",
                          alignItems: "center",
                          boxSizing: "border-box",
                          opacity: item.isRequiredApproval ? 1 : 0.45,
                        },
                      },
                      React.createElement(LawyerPicker, {
                        lawyers,
                        value: extractId(item.approvedById),
                        size: 20,
                        readOnly: !canManage || !item.isRequiredApproval,
                        onChange:
                          canManage && item.isRequiredApproval
                            ? async (id, n, c) => {
                                const url =
                                  type === "subTask"
                                    ? `subTasks:update?filterByTk=${extractId(item.id)}`
                                    : `tasks:update?filterByTk=${extractId(item.id)}`;
                                await apiReq(url, "POST", { approvedById: id });
                                onUpdate({ ...item, approvedById: id });
                              }
                            : undefined,
                      }),
                      !item.approvedById &&
                        item.isRequiredApproval &&
                        React.createElement(
                          "span",
                          {
                            style: {
                              fontSize: 12,
                              fontFamily: FONT,
                              color: "#bfbfbf",
                              marginLeft: 4,
                            },
                          },
                          "Chọn...",
                        ),
                    ),
                  ),
                ),

                // Thời gian thực hiện (chiếm 1 hàng đầy đủ)
                React.createElement(
                  "div",
                  null,
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: 12,
                        color: "#8c8c8c",
                        fontFamily: FONT,
                        fontWeight: 600,
                        marginBottom: 4,
                      },
                    },
                    "Thời gian thực hiện",
                  ),
                  React.createElement(
                    "div",
                    {
                      style: { display: "flex", alignItems: "center", gap: 8 },
                    },
                    React.createElement("input", {
                      type: "datetime-local",
                      defaultValue: toLocalDT(
                        type === "subTask" ? item.date : item.startDate,
                      ),
                      readOnly: !canEdit,
                      onBlur: canEdit
                        ? async (e) => {
                            const field =
                              type === "subTask" ? "date" : "startDate";
                            const val = e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null;
                            onUpdate({ ...item, [field]: val });
                            const apiUrl =
                              type === "subTask"
                                ? `subTasks:update?filterByTk=${extractId(item.id)}`
                                : `tasks:update?filterByTk=${extractId(item.id)}`;
                            try {
                              await apiReq(apiUrl, "POST", { [field]: val });
                              message.success("Đã cập nhật thời gian");
                            } catch (e) {
                              message.error("Lỗi: Không thể cập nhật");
                            }
                          }
                        : undefined,
                      style: {
                        ...(canEdit ? inpStyle : inpReadOnly),
                        flex: 1,
                        minWidth: 0,
                      },
                    }),
                    React.createElement(
                      "span",
                      { style: { color: "#bfbfbf" } },
                      "→",
                    ),
                    React.createElement("input", {
                      type: "datetime-local",
                      defaultValue: toLocalDT(
                        type === "subTask" ? item.deadline : item.dueDate,
                      ),
                      readOnly: !canEdit,
                      onBlur: canEdit
                        ? async (e) => {
                            const field =
                              type === "subTask" ? "deadline" : "dueDate";
                            const val = e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null;
                            onUpdate({ ...item, [field]: val });
                            const apiUrl =
                              type === "subTask"
                                ? `subTasks:update?filterByTk=${extractId(item.id)}`
                                : `tasks:update?filterByTk=${extractId(item.id)}`;
                            try {
                              await apiReq(apiUrl, "POST", { [field]: val });
                              message.success("Đã cập nhật thời gian");
                            } catch (e) {
                              message.error("Lỗi: Không thể cập nhật");
                            }
                          }
                        : undefined,
                      style: {
                        ...(canEdit ? inpStyle : inpReadOnly),
                        flex: 1,
                        minWidth: 0,
                      },
                    }),
                  ),
                ),
              ),

              // NỘI DUNG CHÍNH
              React.createElement(
                "div",
                {
                  style: { display: "flex", flexDirection: "column", gap: 24 },
                },
                React.createElement(
                  "div",
                  null,
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#262626",
                        marginBottom: 12,
                      },
                    },
                    "Mô tả công việc",
                  ),
                  React.createElement(DescriptionInlineEditor, {
                    item,
                    type,
                    onUpdate,
                    readOnly: !canEdit,
                  }),
                ),
                type === "task" &&
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#262626",
                          marginBottom: 12,
                        },
                      },
                      "Công việc phụ thuộc (Pending Issue)",
                    ),
                    React.createElement(TaskPicker, {
                      allTasks: _pool,
                      currentTaskId: extractId(item.id),
                      value: extractId(item.previousTaskId),
                      services,
                      readOnly: !canManage,
                      onChange: canManage
                        ? async (newPrevId) => {
                            const found = _pool.find(
                              (t) => extractId(t.id) === extractId(newPrevId),
                            );
                            const newStatus = newPrevId
                              ? found?.status !== "done" &&
                                found?.status !== "cancelled"
                                ? "blocked"
                                : item.status
                              : item.status === "blocked"
                                ? "toDo"
                                : item.status;
                            const payload = {
                              previousTaskId: newPrevId || null,
                              status: newStatus,
                            };
                            await apiReq(
                              type === "subTask"
                                ? `subTasks:update?filterByTk=${extractId(item.id)}`
                                : `tasks:update?filterByTk=${extractId(item.id)}`,
                              "POST",
                              payload,
                            );
                            onUpdate({ ...item, ...payload });
                          }
                        : () => {},
                    }),
                  ),
                React.createElement(
                  "div",
                  null,
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#262626",
                        marginBottom: 12,
                      },
                    },
                    "Bước tiếp theo (Next Step)",
                  ),
                  React.createElement(NextStepInlineEditor, {
                    item,
                    onUpdate,
                    currentUser,
                    readOnly: !canEdit,
                  }),
                ),
                React.createElement(
                  "div",
                  null,
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#262626",
                        marginBottom: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      },
                    },
                    "Tệp đính kèm file mẫu" +
                      (templateFiles.length > 0
                        ? ` (${templateFiles.length})`
                        : ""),
                    React.createElement(ReloadButton, {
                      onReload: async () => {
                        const fresh = await fetchFiles(
                          collectionName,
                          extractId(item.id),
                        );
                        onUpdate({ ...item, _files: fresh });
                      },
                      size: "small",
                    }),
                  ),
                  renderFileList(templateFiles, "Chưa có file mẫu nào.", true),
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#262626",
                        marginBottom: 12,
                        marginTop: 24,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      },
                    },
                    "Tệp đính kèm" +
                      (regularFiles.length > 0
                        ? ` (${regularFiles.length})`
                        : ""),
                    React.createElement(ReloadButton, {
                      onReload: async () => {
                        const fresh = await fetchFiles(
                          collectionName,
                          extractId(item.id),
                        );
                        onUpdate({ ...item, _files: fresh });
                      },
                      size: "small",
                    }),
                  ),
                  renderFileList(regularFiles, "Chưa có tệp đính kèm nào."),
                ),
              ),
            ),
          ),
          // ── CỘT PHẢI (Bình luận - 6 Phần) ──
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                background: "#fff",
                overflow: "hidden",
              },
            },
            headerBar(
              "Bình luận & Báo cáo",
              React.createElement(ReloadButton, {
                onReload: () => setCmtRefreshTrigger((v) => v + 1),
                size: "small",
              }),
            ),
            React.createElement(
              "div",
              { style: { flex: 1, overflow: "hidden" } },
              React.createElement(UnifiedNoteThread, {
                collectionName,
                recordId: extractId(item.id),
                currentUser,
                lawyers,
                canEdit: true, // 🌟 Mở quyền cho tất cả User bình luận & upload
                projectFolderId,
                refreshTrigger: cmtRefreshTrigger,
                caseId: extractId(item.caseId), // 🌟 Truyền caseId xuống để tạo link
              }),
            ),
          ),
        ),
      ),
      React.createElement(
        Drawer,
        {
          title: "Quản lý Timesheet",
          placement: "right",
          width: 550,
          onClose: () => setOpenTimesheet(false),
          open: openTimesheet,
          bodyStyle: { padding: "16px", background: "#f5f5f5" },
        },
        React.createElement(TimesheetTab, {
          item,
          type,
          lawyers,
          currentUser,
          projectManagerId,
          isManager: canManage,
          canAccess: true,
        }),
      ),
      React.createElement(
        Drawer,
        {
          title: "Lịch sử hoạt động",
          placement: "right",
          width: 700,
          onClose: () => setOpenActivity(false),
          open: openActivity,
          bodyStyle: { padding: "0" },
        },
        React.createElement(ActivityTab, {
          collectionName,
          recordId: extractId(item.id),
          lawyers: lawyers,
        }),
      ),
      previewDoc &&
        React.createElement(PreviewModal, {
          doc: previewDoc,
          onClose: () => setPreviewDoc(null),
        }),
    );
  }
};

// Standalone mode closes standaloneMode block (noop - structure is inline above)
// ── Add Task Modal ─────────────────────────────────────────
const AddTaskModal = ({
  open,
  projectId,
  lawyers,
  services,
  allTasksInProject,
  onSave,
  onClose,
  currentUser,
}) => {
  const INIT_FORM = {
    title: "",
    lawyerId: null,
    serviceId: null,
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
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (form.previousTaskId) {
      const prevTask = allTasksInProject.find(
        (t) => extractId(t.id) === extractId(form.previousTaskId),
      );
      if (
        prevTask &&
        form.serviceId &&
        String(prevTask.serviceId) !== String(form.serviceId)
      ) {
        set("previousTaskId", null);
      }
    }
  }, [form.serviceId]);

  const tasksForDependency = useMemo(() => {
    if (!form.serviceId) return allTasksInProject;
    return allTasksInProject.filter(
      (t) => String(t.serviceId) === String(form.serviceId),
    );
  }, [allTasksInProject, form.serviceId]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      message.warning("Vui lòng nhập tên công việc");
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
        projectId,
        isRequiredApproval: form.isRequiredApproval,
      };
      if (form.lawyerId) payload.lawyerId = form.lawyerId;
      if (form.serviceId) payload.serviceId = form.serviceId;
      if (form.approvedById) payload.approvedById = form.approvedById;
      if (form.startDate)
        payload.startDate = new Date(form.startDate).toISOString();
      if (form.dueDate) payload.dueDate = new Date(form.dueDate).toISOString();
      if (form.description) payload.description = form.description;
      if (form.estimatedDuration)
        payload.estimatedDuration = parseFloat(form.estimatedDuration);
      if (form.previousTaskId) payload.previousTaskId = form.previousTaskId;
      if (form.nextStepDescription)
        payload.nextStepDescription = form.nextStepDescription;
      await apiReq("tasks:create", "POST", payload);
      message.success("✅ Đã tạo công việc");
      onSave();
      onClose();
      setForm(INIT_FORM);
    } catch {
      message.error("Tạo thất bại");
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
        "📋 Tạo công việc mới",
      ),
    },
    React.createElement(
      "div",
      { style: { maxHeight: "75vh", overflowY: "auto", paddingRight: 4 } },
      fld(
        "Tên công việc *",
        inp("Nhập tên công việc...", form.title, (v) => set("title", v)),
      ),
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        fld(
          "👨‍⚖️ Luật sư phụ trách",
          sel(
            "-- Phân công --",
            form.lawyerId,
            (v) => set("lawyerId", v ? Number(v) : null),
            lawyers.map((l) => ({ value: l.id, label: l.lawyerName })),
          ),
        ),
        React.createElement(
          "div",
          { style: { marginBottom: 12 } },
          lbl("🗂 Dịch vụ"),
          services.length === 0
            ? React.createElement(
                "div",
                {
                  style: {
                    border: "1px solid #ffe58f",
                    borderRadius: 4,
                    padding: "7px 10px",
                    fontSize: 12,
                    fontFamily: FONT,
                    color: "#d46b08",
                    background: "#fffbe6",
                  },
                },
                "⚠ Chưa có dịch vụ",
              )
            : sel(
                "-- Chọn dịch vụ --",
                form.serviceId,
                (v) => set("serviceId", v ? Number(v) : null),
                services.map((s) => ({ value: s.id, label: s.serviceName })),
              ),
        ),
        fld(
          "📅 Ngày bắt đầu",
          inp("", form.startDate, (v) => set("startDate", v), "date"),
        ),
        fld(
          "🏁 Deadline",
          inp("", form.dueDate, (v) => set("dueDate", v), "date"),
        ),
        fld(
          "⏱ Thời gian dự kiến (giờ)",
          inp(
            "Ví dụ: 4",
            form.estimatedDuration,
            (v) => set("estimatedDuration", v),
            "number",
          ),
        ),
      ),
      React.createElement(
        "div",
        { style: { marginBottom: 12 } },
        lbl("⛓ Pending Issue (tuỳ chọn)"),
        React.createElement(TaskPicker, {
          allTasks: tasksForDependency,
          currentTaskId: null,
          value: form.previousTaskId,
          services,
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
                  "✓ Đã xong",
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
                  '⏸ Task mới → "Đang chờ"',
                ),
          ),
      ),
      fld(
        "⚡ Mức độ ưu tiên",
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
        "🔐 Yêu cầu phê duyệt",
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
              ? "🔐 Bật — cần phê duyệt"
              : "Yêu cầu phê duyệt trước khi hoàn thành",
          ),
        ),
      ),
      form.isRequiredApproval &&
        fld(
          "👤 Người xét duyệt",
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
                "Chọn người xét duyệt...",
              ),
          ),
        ),
      fld(
        "📝 Nội dung diễn biến",
        React.createElement("textarea", {
          value: form.description,
          onChange: (e) => set("description", e.target.value),
          placeholder: "Nội dung diễn biến...",
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
          placeholder: "Bước tiếp theo sau khi hoàn thành...",
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
          "Huỷ",
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
          saving ? "Đang lưu..." : "Tạo công việc",
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
      message.warning("Vui lòng nhập tên công việc phụ");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        subTaskName: form.title.trim(),
        status: form.status,
        priority: form.priority,
        taskId: parentTaskId,
        isRequiredApproval: form.isRequiredApproval,
      };
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
      message.success("✅ Đã Tạo công việc phụ");
      onSave();
      onClose();
      setForm(INIT_FORM);
    } catch {
      message.error("Tạo thất bại");
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
        "📋 Tạo công việc phụ",
      ),
    },
    React.createElement(
      "div",
      { style: { maxHeight: "75vh", overflowY: "auto", paddingRight: 4 } },
      fld(
        "Tạo công việc phụ *",
        inp("Nhập tên công việc...", form.title, (v) => set("title", v)),
      ),
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        fld(
          "👨‍⚖️ Luật sư phụ trách",
          sel(
            "-- Phân công --",
            form.lawyerId,
            (v) => set("lawyerId", v ? Number(v) : null),
            lawyers.map((l) => ({ value: l.id, label: l.lawyerName })),
          ),
        ),
        fld(
          "⏱ Thời gian dự kiến (giờ)",
          inp(
            "Ví dụ: 4",
            form.estimatedDuration,
            (v) => set("estimatedDuration", v),
            "number",
          ),
        ),
        fld(
          "📅 Ngày bắt đầu",
          inp("", form.startDate, (v) => set("startDate", v), "date"),
        ),
        fld(
          "🏁 Deadline",
          inp("", form.deadline, (v) => set("deadline", v), "date"),
        ),
      ),
      fld(
        "⚡ Mức độ ưu tiên",
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
        "🔐 Yêu cầu phê duyệt",
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
              ? "🔐 Bật — cần phê duyệt"
              : "Yêu cầu phê duyệt trước khi hoàn thành",
          ),
        ),
      ),
      form.isRequiredApproval &&
        fld(
          "👤 Người xét duyệt",
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
                "Chọn người xét duyệt...",
              ),
          ),
        ),
      fld(
        "📝 Mô tả chi tiết",
        React.createElement("textarea", {
          value: form.description,
          onChange: (e) => set("description", e.target.value),
          placeholder: "Mô tả chi tiết công việc con...",
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
          placeholder: "Bước tiếp theo sau khi hoàn thành...",
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
          "Huỷ",
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
          saving ? "Đang lưu..." : "Tạo công việc phụ",
        ),
      ),
    ),
  );
};
// ============================================================
// §TASKDETAILVIEW — Standalone page, wraps DetailModal logic
// ============================================================
const TaskDetailView = () => {
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [lawyers, setLawyers] = useState([]);
  const [services, setServices] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);
  const [projectManagerId, setProjectManagerId] = useState(null);
  const [projectFolderId, setProjectFolderId] = useState(null);
  const [showAddSub, setShowAddSub] = useState(false);

  const ids = useMemo(() => {
    const path = window.location.pathname;
    const segments = path.split("/");
    let tk = null,
      sc = null;
    for (let i = 0; i < segments.length; i++) {
      if (segments[i] === "filterbytk" && segments[i + 1]) tk = segments[i + 1];
      if (segments[i] === "sourceid" && segments[i + 1]) sc = segments[i + 1];
    }
    return { taskId: tk, caseId: sc };
  }, []);

  const reload = useCallback(async () => {
    if (!ids.taskId) return;
    setLoading(true);
    try {
      const [user, lList, sList, tkRes] = await Promise.all([
        getCurrentUser(),
        fetchAll("lawyers:list", "id,lawyerName,lawyerType,unitPrice,userId"),
        fetchAll("quotationServices:list", "id,serviceName,quotationId"),
        ctx.api
          .request({
            url: "tasks:list",
            params: { filter: { id: ids.taskId }, pageSize: 1 },
          })
          .then((r) => r.data.data?.[0]),
      ]);

      if (tkRes) {
        const files = await fetchFiles("Task", tkRes.id);
        tkRes._files = files;
        tkRes._subs = [];
        tkRes._od = false;

        if (tkRes.projectId) {
          const [pt, projRes] = await Promise.all([
            fetchAll("tasks:list", "id,title,status,previousTaskId,serviceId", {
              projectId: { $eq: tkRes.projectId },
            }),
            ctx.api
              .request({
                url: "projects:get",
                params: {
                  filterByTk: tkRes.projectId,
                  fields: "id,projectManagerId",
                },
              })
              .catch(() => null),
          ]);
          setProjectTasks(pt);
          setProjectManagerId(projRes?.data?.data?.projectManagerId || null);
        }

        try {
          const folderRes = await ctx.api.request({
            url: "folders:list",
            params: {
              pageSize: 1000,
              filter: JSON.stringify({ projectId: { $eq: tkRes.projectId } }),
            },
          });
          const root = folderRes?.data?.data?.find((f) => !f.parentId);
          if (root) setProjectFolderId(root.id);
        } catch {}
      }

      setCurrentUser(user);
      setLawyers(lList);
      setServices(sList);
      setTask(tkRes);
    } catch (e) {
      message.error("Lỗi tải dữ liệu: " + (e?.message || ""));
    }
    setLoading(false);
  }, [ids.taskId]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading)
    return React.createElement(
      "div",
      { style: { padding: 100, textAlign: "center" } },
      React.createElement(Spin, { size: "large" }),
    );
  if (!task)
    return React.createElement(
      "div",
      {
        style: {
          padding: 100,
          textAlign: "center",
          color: "#ff4d4f",
          fontFamily: FONT,
        },
      },
      "Không tìm thấy công việc",
    );

  const isAdmin = isAdminUser(currentUser);
  const myLawyer = lawyers.find(
    (l) => extractId(l.userId) === extractId(currentUser?.id),
  );
  const isManager =
    isAdmin ||
    (projectManagerId &&
      extractId(currentUser?.id) === extractId(projectManagerId));
  const isAssignedToThis = myLawyer
    ? extractId(myLawyer.id) === extractId(task.lawyerId)
    : false;

  return React.createElement(
    "div",
    { style: { background: "#f5f5f5", minHeight: "100vh", fontFamily: FONT } },
    React.createElement(DetailModal, {
      item: task,
      type: "task",
      lawyers,
      allTasksInProject: projectTasks,
      tasksInService: projectTasks,
      services,
      projectManagerId,
      onClose: () => {},
      onUpdate: (updated) => setTask((prev) => ({ ...prev, ...updated })),
      currentUser,
      isManager,
      onStatusChange: () => {},
      isAssignedToThis,
      projectFolderId,
      onOpenAddSubModal: () => setShowAddSub(true),
      standaloneMode: true,
    }),
    showAddSub &&
      React.createElement(AddSubtaskModal, {
        open: showAddSub,
        parentTaskId: task.id,
        lawyers,
        onSave: reload,
        onClose: () => setShowAddSub(false),
        currentUser,
      }),
  );
};

ctx.render(React.createElement(TaskDetailView, null));
