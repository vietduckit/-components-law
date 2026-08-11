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
  Input,
  Button,
  Tooltip,
  Empty,
  Form,
  DatePicker,
  InputNumber,
  Segmented,
  Switch,
} = ctx.antd;
const { Text } = Typography;

const PROJECT_ID = ctx.record?.id;
const FONT =
  "Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const COL = {
  stt: 38,
  toggle: 24,
  status: 130,
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
const originURL = window.location.origin;
// 🌟 CONFIG URL DEEP-LINK CHO BÌNH LUẬN (Gán cứng các UID Route để dễ bảo trì)
const DEEP_LINK_CONFIG = {
  // 1. Host và đường dẫn Admin
  ORIGIN: originURL,
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

// Design tokens cho các modal form (AddTaskModal/AddSubtaskModal) — theo
// convention Nocobase Form (antd Modal + Form.Item), màu primary khớp
// STATUS_CFG.inProgress / nút "＋ New Task" đã dùng trong chính file này.
const TASK_DS = {
  primaryButton: {
    background: "#1890ff",
    borderColor: "#1890ff",
    borderRadius: 6,
    fontWeight: 600,
  },
  secondaryButton: {
    borderColor: "#e8e8e8",
    borderRadius: 6,
  },
  infoBox: {
    padding: "10px 14px",
    background: "#e6f4ff",
    border: "1px solid #91caff",
    borderRadius: 6,
    color: "#0958d9",
    fontSize: 12,
    fontFamily: FONT,
  },
  successBox: {
    padding: "10px 14px",
    background: "#f6ffed",
    border: "1px solid #b7eb8f",
    borderRadius: 6,
    color: "#389e0d",
    fontSize: 12,
    fontFamily: FONT,
  },
  waitingBox: {
    padding: "10px 14px",
    background: "#f9f0ff",
    border: "1px solid #d3adf7",
    borderRadius: 6,
    color: "#531dab",
    fontSize: 12,
    fontFamily: FONT,
  },
  warnBox: {
    padding: "10px 14px",
    background: "#fffbe6",
    border: "1px solid #ffe58f",
    borderRadius: 6,
    color: "#d46b08",
    fontSize: 12,
    fontFamily: FONT,
  },
  approverBox: {
    padding: "10px 14px",
    background: "#fffbe6",
    border: "1px solid #ffd591",
    borderRadius: 6,
  },
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

const makeSvgIcon = (children, options = {}) =>
  React.createElement(
    "svg",
    {
      width: options.size || 15,
      height: options.size || 15,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: options.strokeWidth || 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: { display: "block", flexShrink: 0 },
      "aria-hidden": "true",
    },
    ...children,
  );

const renderServiceLockIcon = (size = 15) =>
  makeSvgIcon(
    [
      React.createElement("rect", {
        key: "body",
        x: 5,
        y: 10,
        width: 14,
        height: 10,
        rx: 2,
      }),
      React.createElement("path", {
        key: "shackle",
        d: "M8 10V7a4 4 0 0 1 8 0v3",
      }),
    ],
    { size },
  );

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
const getTaskRecordId = (task = {}) =>
  extractId(task.id) || extractId(task.taskId) || extractId(task._id);
const getSubTaskRecordId = (subTask = {}) =>
  extractId(subTask.id) ||
  extractId(subTask.subTaskId) ||
  extractId(subTask._id);
const isDeletedServiceRecord = (record = {}) =>
  String(record?.status || record?.lineStatus || "")
    .toLowerCase()
    .trim() === "deleted";
const getProjectServiceTaskKey = (ps = {}) => {
  const serviceId =
    extractId(ps.serviceId) ||
    extractId(ps.ServiceId) ||
    extractId(ps.services);
  return String(serviceId || extractId(ps.id) || "");
};
const isTaskServiceDeleted = (item = {}) => !!item?._serviceDeleted;

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
  getPathSegmentId(DEEP_LINK_CONFIG.KW_SOURCE) ||
  extractId(PROJECT_ID) ||
  extractId(ctx.record?.id) ||
  getPathSegmentId(DEEP_LINK_CONFIG.KW_FILTER);

const getCurrentPathUrl = () =>
  [window.location.origin, window.location.pathname].join("");

const buildTaskLinkedUrl = (item, type = "task", fallbackCaseId = null) => {
  const source = item && typeof item === "object" ? item : { id: item };
  const taskId =
    type === "subTask" ? extractId(source.taskId) : extractId(source.id);
  const caseId = getDeepLinkCaseId(
    fallbackCaseId || source.caseId || source.projectId,
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

// DatePicker (antd Form) trả về dayjs — convert an toàn sang ISO string cho payload
const dateValueToISO = (v) => {
  if (!v) return null;
  const d = typeof v?.toDate === "function" ? v.toDate() : new Date(v);
  return d instanceof Date && !isNaN(d.getTime()) ? d.toISOString() : null;
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

const getFullUrl = (url) =>
  !url
    ? null
    : url.startsWith("http")
      ? url
      : `${window.location.origin}${url}`;

const addPdfFitHash = (url) => {
  if (!url) return url;
  const joiner = url.includes("#") ? "&" : "#";
  return `${url}${joiner}view=FitH&navpanes=0`;
};

const previewFrameShellStyle = (height, options = {}) => ({
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  height,
  boxSizing: "border-box",
  overflowX: "hidden",
  overflowY: "hidden",
  background: options.background || "#f8f9fa",
  display: "flex",
  justifyContent: "center",
  alignItems: "stretch",
  borderTop: options.borderTop || undefined,
});

const previewIframeStyle = (height, options = {}) => ({
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  height: options.iframeHeight || height,
  border: "none",
  display: "block",
  background: "#fff",
});

const scalePreviewLength = (height, ratio, extraPx = 0) => {
  if (typeof height === "number") return Math.ceil(height * ratio + extraPx);
  const raw = String(height || "").trim();
  if (!raw) return extraPx;
  const match = raw.match(/^(-?\d*\.?\d+)([a-z%]+)$/i);
  if (match) {
    const value = Number(match[1]);
    return `calc(${value * ratio}${match[2]} + ${extraPx}px)`;
  }
  return `calc(${raw} + ${extraPx}px)`;
};

const renderTaskFilePreviewFrame = ({
  fullUrl,
  title,
  isPdf,
  isImage,
  isOffice,
  officeViewerUrl,
  height = 640,
  modal = false,
}) => {
  const shellHeight = height;
  const officeScale = modal ? 0.96 : 0.9;
  const officeScaleRatio = 1 / officeScale;
  const officeIframeHeight = scalePreviewLength(
    shellHeight,
    officeScaleRatio,
    42,
  );
  const officeIframeWidth = `${officeScaleRatio * 100}%`;
  const shellStyle = previewFrameShellStyle(shellHeight, {
    background: modal ? "#f5f5f5" : "#f8f9fa",
    borderTop: modal ? undefined : "1px solid #f0f0f0",
  });

  if (isPdf && fullUrl) {
    return React.createElement(
      "div",
      { style: shellStyle },
      React.createElement("iframe", {
        src: addPdfFitHash(fullUrl),
        style: previewIframeStyle(shellHeight),
        title,
      }),
    );
  }

  if (isImage && fullUrl) {
    return React.createElement(
      "div",
      { style: { ...shellStyle, padding: modal ? 16 : 10 } },
      React.createElement("img", {
        src: fullUrl,
        alt: title,
        style: {
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
          objectFit: "contain",
          display: "block",
          margin: "0 auto",
          alignSelf: "center",
        },
      }),
    );
  }

  if (isOffice && officeViewerUrl) {
    return React.createElement(
      "div",
      {
        style: {
          ...shellStyle,
          position: "relative",
          padding: 0,
          alignItems: "flex-start",
        },
      },
      React.createElement("iframe", {
        src: officeViewerUrl,
        style: {
          ...previewIframeStyle(shellHeight, {
            iframeHeight: officeIframeHeight,
          }),
          width: officeIframeWidth,
          maxWidth: "none",
          margin: "0 auto",
          flex: "0 0 auto",
          transform: `scale(${officeScale})`,
          transformOrigin: "top center",
        },
        title,
        frameBorder: "0",
      }),
    );
  }

  return null;
};

const getExtInfo = (ext) =>
  FILE_EXT_ICON[(ext || "").toLowerCase()] || {
    icon: "📎",
    color: "#8c8c8c",
    bg: "#fafafa",
  };

async function apiReq(url, method, data) {
  return ctx.api.request({ url, method: method || "POST", data });
}
async function fetchAll(url, fields, filter, sort) {
  try {
    const params = { pageSize: 500, page: 1 };
    if (fields) params.fields = fields;
    if (filter) params.filter = JSON.stringify(filter);
    if (sort) params.sort = sort;
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

const BASE_DOCUMENT_FILE_FIELDS =
  "id,title,documentCode,documentType,batchId,collectionName,sourceCollectionName,sourceTaskId,sourceRecordId,sourceProjectId,recordId,googleDriveUrl,note,createdAt,updatedAt,createdById,updatedById,uploadedById,isDeleted,folderId,caseId,taskId,subTaskId,moduleScope,storageType,legalStudyId,legalReferenceId,internalCompanyId,movedToLegalReferenceAt,movedToLegalReferenceById,fileIndex";
const LEGAL_STUDY_DOCUMENT_FIELDS =
  "originScope,originFolderId,legalStudyLinkedAt,legalStudySource";
const DOCUMENT_FILE_FIELDS = `${BASE_DOCUMENT_FILE_FIELDS},${LEGAL_STUDY_DOCUMENT_FIELDS}`;
const DOCUMENT_FALLBACK_FILE_FIELDS =
  "id,documentType,createdAt,updatedAt,createdById,updatedById";
const DOCUMENT_KNOWN_SCALAR_FIELDS = [
  BASE_DOCUMENT_FILE_FIELDS,
  LEGAL_STUDY_DOCUMENT_FIELDS,
  "contractId,quotationId,projectInternalId,customerId,legalReferenceId,internalTemplateId,openingDate,signedAt,effectiveAt,status,senderName,recipientName,language,docFormat,description,deletedAt,uploadedById,movedToLegalReferenceById,movedToLegalReferenceAt",
].join(",");
const DOCUMENT_KNOWN_RELATION_FIELDS =
  "fileAttachment,updatedBy,createdBy,folders,activity_log,sourceProject,sourceTask,users,internalCompany,legalReference,internalTemplates,customers,cases,contracts,quotations,tasks,subTasks,projectInternal,documentShares,legalStudy";
const DOCUMENT_KNOWN_FIELD_SET = makeDocumentFieldSet([
  ...compactDocumentFields(DOCUMENT_KNOWN_SCALAR_FIELDS),
  ...compactDocumentFields(DOCUMENT_KNOWN_RELATION_FIELDS),
]);
let documentFieldSetPromise = null;

function splitDocumentFields(fields) {
  if (Array.isArray(fields)) return fields;
  if (typeof fields === "string") return fields.split(",");
  return [];
}

function compactDocumentFields(fields) {
  return Array.from(
    new Set(
      splitDocumentFields(fields)
        .map((field) => String(field || "").trim())
        .filter(Boolean),
    ),
  );
}

function makeDocumentFieldSet(names = []) {
  const fieldSet = new Set(names.filter(Boolean));
  if (fieldSet.has("createdBy")) fieldSet.add("createdById");
  if (fieldSet.has("updatedBy")) fieldSet.add("updatedById");
  if (fieldSet.has("uploadedBy")) fieldSet.add("uploadedById");
  return fieldSet;
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isEmptyPlainObject(value) {
  return isPlainObject(value) && Object.keys(value).length === 0;
}

function parseDocumentFilter(filter) {
  if (!filter) return null;
  if (typeof filter !== "string") return filter;
  try {
    return JSON.parse(filter);
  } catch {
    return null;
  }
}

function sanitizeDocumentFilterByFields(filter, fieldSet) {
  if (!fieldSet || !filter) return filter;
  if (Array.isArray(filter)) {
    const items = filter
      .map((item) => sanitizeDocumentFilterByFields(item, fieldSet))
      .filter((item) => item && !isEmptyPlainObject(item));
    return items.length ? items : null;
  }
  if (!isPlainObject(filter)) return filter;

  const next = {};
  Object.entries(filter).forEach(([key, value]) => {
    if (key === "$and" || key === "$or") {
      const items = sanitizeDocumentFilterByFields(value, fieldSet);
      if (Array.isArray(items) && items.length) next[key] = items;
      return;
    }
    if (key.startsWith("$")) {
      next[key] = value;
      return;
    }
    if (!fieldSet.has(key)) return;
    next[key] = value;
  });

  return Object.keys(next).length ? next : null;
}

function sanitizeDocumentSortByFields(sort, fieldSet) {
  if (!fieldSet || !sort) return sort;
  const items = Array.isArray(sort) ? sort : [sort];
  const safeSort = items.filter((item) => {
    const field = String(item || "").replace(/^[+-]/, "");
    return field && fieldSet.has(field);
  });
  if (!safeSort.length) return undefined;
  return Array.isArray(sort) ? safeSort : safeSort[0];
}

function sanitizeDocumentAppendsByFields(appends, fieldSet) {
  if (!fieldSet || !appends) return appends;
  const items = Array.isArray(appends) ? appends : [appends];
  const safeAppends = items.filter((item) => {
    const relationName = String(item || "").split(".")[0];
    return relationName && fieldSet.has(relationName);
  });
  if (!safeAppends.length) return undefined;
  return Array.isArray(appends) ? safeAppends : safeAppends[0];
}

async function fetchDocumentFieldSet() {
  // Runtime JS blocks should not require Data sources metadata permission.
  // Keep a local field set aligned with the configured documents collection.
  return DOCUMENT_KNOWN_FIELD_SET;
}

async function getDocumentFieldSet() {
  if (!documentFieldSetPromise) {
    documentFieldSetPromise = fetchDocumentFieldSet();
  }
  return documentFieldSetPromise;
}

async function withDocumentSchemaSafeParams(params = {}, options = {}) {
  const fieldSet = await getDocumentFieldSet();
  if (!fieldSet) return { ...(params || {}) };

  const next = { ...(params || {}) };
  const requestedFields =
    options.fields !== undefined ? options.fields : next.fields;
  const safeFields = compactDocumentFields(requestedFields).filter((field) =>
    fieldSet.has(field),
  );
  if (safeFields.length) {
    next.fields = safeFields.join(",");
  } else {
    delete next.fields;
  }

  if (next.filter) {
    const parsedFilter = parseDocumentFilter(next.filter);
    const safeFilter = sanitizeDocumentFilterByFields(parsedFilter, fieldSet);
    if (!safeFilter || isEmptyPlainObject(safeFilter)) {
      if (options.allowEmptyFilter) {
        delete next.filter;
      } else {
        return null;
      }
    } else {
      next.filter = JSON.stringify(safeFilter);
    }
  }

  const safeSort = sanitizeDocumentSortByFields(next.sort, fieldSet);
  if (safeSort) next.sort = safeSort;
  else delete next.sort;

  const safeAppends = sanitizeDocumentAppendsByFields(next.appends, fieldSet);
  if (safeAppends) next.appends = safeAppends;
  else delete next.appends;

  return next;
}

async function listDocumentsWithFieldFallback(params) {
  const attempts = [
    { ...(params || {}), fields: DOCUMENT_FILE_FIELDS },
    { ...(params || {}), fields: BASE_DOCUMENT_FILE_FIELDS },
    { ...(params || {}), fields: DOCUMENT_FALLBACK_FILE_FIELDS },
    { ...(params || {}) },
  ];

  for (const attemptParams of attempts) {
    const safeParams = await withDocumentSchemaSafeParams(attemptParams);
    if (!safeParams) return [];
    try {
      const res = await ctx.api.request({
        url: "documents:list",
        params: safeParams,
      });
      return res?.data?.data || [];
    } catch {}
  }
  return [];
}

function normalizeDocumentCollectionName(collectionName) {
  const raw = String(collectionName || "").trim();
  const lower = raw.toLowerCase();
  if (lower === "tasks" || lower === "task") return "Task";
  if (lower === "subtasks" || lower === "subtask") return "SubTask";
  if (lower === "cases" || lower === "case") return "Case";
  return raw || collectionName;
}

function getDocumentTaskId(doc) {
  return (
    extractId(doc?.taskId) ||
    extractId(doc?.task) ||
    extractId(doc?.sourceTaskId) ||
    (normalizeDocumentCollectionName(doc?.collectionName) === "Task"
      ? extractId(doc?.recordId)
      : null) ||
    (normalizeDocumentCollectionName(doc?.sourceCollectionName) === "Task"
      ? extractId(doc?.sourceRecordId)
      : null)
  );
}

function filterTaskDocumentsByIds(files, taskIds, moduleScope = null) {
  const idSet = new Set(
    (taskIds || []).map((id) => String(extractId(id))).filter(Boolean),
  );
  return (files || []).filter((file) => {
    const taskId = getDocumentTaskId(file);
    if (!taskId || !idSet.has(String(taskId))) return false;
    if (moduleScope && file.moduleScope && file.moduleScope !== moduleScope)
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
            { recordId: { $in: safeTaskIds } },
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
      const rows = await listDocumentsWithFieldFallback({
        pageSize: 2000,
        filter: JSON.stringify(filter),
        appends: ["fileAttachment", "createdBy", "updatedBy"],
      });
      const files = filterTaskDocumentsByIds(rows, safeTaskIds);
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

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const getUserRoleNames = (user) => {
  const roleNames = asArray(user?.roles)
    .map((role) =>
      typeof role === "string"
        ? role
        : role?.name || role?.title || role?.slug || role?.role,
    )
    .filter(Boolean);
  roleNames.push(user?.role, user?.systemRole);
  return new Set(
    roleNames.filter(Boolean).map((role) => String(role).trim().toLowerCase()),
  );
};

const isAdminUser = (user) => {
  if (!user) return false;
  const roleNames = getUserRoleNames(user);
  return (
    roleNames.has("admin") ||
    roleNames.has("root") ||
    user?.isAdmin === true ||
    user?.isSuperAdmin === true
  );
};

const getFolderManagerRows = (folder) =>
  asArray(folder?.folderManager || folder?.folderManagers);

const getFolderMemberRows = (folder) =>
  asArray(folder?.folderMember || folder?.folderMembers);

const getPermissionLawyerId = (row) =>
  extractId(row?.lawyerId) ||
  extractId(row?.lawyer) ||
  extractId(row?.id) ||
  extractId(row);

const getPermissionRole = (row, fallback = "viewer") =>
  String(
    row?.folderMembers?.role ||
      row?.folderMember?.role ||
      row?.through?.role ||
      row?.role ||
      fallback,
  )
    .trim()
    .toLowerCase();

const getFolderPermissions = (
  folder,
  user,
  allFolders,
  currentLawyerId,
  visitedFolderIds = new Set(),
) => {
  if (isAdminUser(user))
    return { isManager: true, isMember: true, canEdit: true };
  if (!folder) return { isManager: true, isMember: true, canEdit: true };
  if (!user) return { isManager: false, isMember: false, canEdit: false };

  const uid = extractId(user.id);
  const lwId = extractId(currentLawyerId);
  const folderId = extractId(folder.id);
  if (folderId && visitedFolderIds.has(String(folderId))) {
    return { isManager: false, isMember: false, canEdit: false };
  }
  const nextVisitedFolderIds = new Set(visitedFolderIds);
  if (folderId) nextVisitedFolderIds.add(String(folderId));

  // Owner check (Nocobase user ID)
  if (extractId(folder.createdById) === uid) {
    return { isManager: true, isMember: true, canEdit: true };
  }

  const managers = getFolderManagerRows(folder);
  const members = getFolderMemberRows(folder);

  // Check explicit permissions using Lawyer ID
  if (lwId) {
    const isExplicitManager = managers.some(
      (manager) =>
        String(getPermissionLawyerId(manager) || "") === String(lwId),
    );
    if (isExplicitManager)
      return { isManager: true, isMember: true, canEdit: true };

    const explicitMember = members.find(
      (member) => String(getPermissionLawyerId(member) || "") === String(lwId),
    );
    if (explicitMember) {
      const role = getPermissionRole(explicitMember);
      const isManager = role === "manager";
      const canEdit = isManager || role === "editor";
      return { isManager, isMember: true, canEdit };
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

  return getFolderPermissions(
    parentFolder,
    user,
    allFolders,
    currentLawyerId,
    nextVisitedFolderIds,
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
      "span",
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
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          fontFamily: FONT,
          fontWeight: 500,
          padding: "2px 8px",
          borderRadius: 3,
          background: cfg.bg,
          color: cfg.color,
          border: `1px solid ${cfg.border}`,
          whiteSpace: "nowrap",
          cursor: readOnly ? "not-allowed" : "pointer",
          opacity: readOnly ? 0.7 : 1,
        },
      },
      cfg.label,
      !readOnly &&
        React.createElement(
          "span",
          { style: { fontSize: 12, lineHeight: 1, opacity: 0.6 } },
          "▾",
        ),
    ),
    open &&
      !readOnly &&
      React.createElement(
        "div",
        {
          style: {
            position: "absolute",
            top: "100%",
            marginTop: 4,
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
        minWidth: 1420,
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
    React.createElement(
      "div",
      { style: { flex: 1, padding: "0 10px", minWidth: 120 } },
      "Title",
    ),
    React.createElement(
      "div",
      { style: { width: COL.status, flexShrink: 0, padding: "0 8px" } },
      "Status",
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

const PortalDropdown = ({
  anchorRef,
  open,
  onClose,
  width,
  align = "right",
  children,
}) => {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const openUp = rect.top > 400;
    setPos({
      top: openUp ? rect.top - 344 : rect.bottom + 4,
      left: align === "left" ? rect.left : rect.right - width,
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
  bordered = false,
  placeholder = "Select assignee",
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

  if (bordered) {
    return React.createElement(
      "div",
      { style: { position: "relative", width: "100%" } },
      React.createElement(
        "div",
        {
          ref: triggerRef,
          onClick: (e) => {
            e.stopPropagation();
            if (!readOnly) setOpen((v) => !v);
          },
          style: {
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            height: 32,
            padding: "0 11px",
            border: `1px solid ${open ? "#1890ff" : "#d9d9d9"}`,
            borderRadius: 6,
            background: readOnly ? "#f5f5f5" : "#fff",
            cursor: readOnly ? "not-allowed" : "pointer",
            boxSizing: "border-box",
            transition: "border-color 0.2s",
          },
        },
        cur
          ? React.createElement(Av, { name: cur.lawyerName, color, size: 20 })
          : null,
        React.createElement(
          "span",
          {
            style: {
              flex: 1,
              fontSize: 13,
              fontFamily: FONT,
              color: cur ? "#262626" : "#bfbfbf",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          },
          cur ? cur.lawyerName : placeholder,
        ),
        !readOnly &&
          React.createElement(
            "span",
            {
              style: {
                fontSize: 11,
                color: "#bfbfbf",
                lineHeight: 1,
                flexShrink: 0,
              },
            },
            "▾",
          ),
      ),
      React.createElement(
        PortalDropdown,
        {
          anchorRef: triggerRef,
          open,
          onClose: handleClose,
          width: 280,
          align: "left",
        },
        dropdownContent,
      ),
    );
  }

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
  services = [],
}) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const cur = useMemo(
    () => allTasks.find((t) => t.id === value),
    [allTasks, value],
  );
  // Key thống nhất: ps.serviceId (catalog) hoặc ps.id (custom service)
  const serviceMap = useMemo(() => {
    const m = { __none__: "No service assigned" };
    services.forEach((ps) => {
      const key = ps.serviceId ? String(ps.serviceId) : String(ps.id);
      m[key] = ps.serviceName || `Service #${ps.id}`;
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

    const serviceKeys = services
      .map((ps) => (ps.serviceId ? String(ps.serviceId) : String(ps.id)))
      .filter((k) => map[k]);
    const noneKey = map["__none__"] ? ["__none__"] : [];
    return [...serviceKeys, ...noneKey].map((k) => ({
      key: k,
      label: serviceMap[k] || "Service #" + k,
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
      width: isPdf || isOffice ? "96vw" : "auto",
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        displayName,
      ),
      bodyStyle: {
        padding: 0,
        maxWidth: "100%",
        overflowX: "hidden",
        overflowY: "hidden",
      },
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
    renderTaskFilePreviewFrame({
      fullUrl,
      title: displayName,
      isPdf,
      isImage,
      isOffice,
      officeViewerUrl,
      height: "82vh",
      modal: true,
    }),
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
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const watchedServiceId = Form.useWatch("serviceId", form);
  const watchedPreviousTaskId = Form.useWatch("previousTaskId", form);
  const watchedIsRequiredApproval = Form.useWatch("isRequiredApproval", form);

  useEffect(() => {
    const prevId = form.getFieldValue("previousTaskId");
    if (!prevId) return;
    const prevTaskRecord = allTasksInProject.find(
      (t) => extractId(t.id) === extractId(prevId),
    );
    if (
      prevTaskRecord &&
      watchedServiceId &&
      String(prevTaskRecord.serviceId) !== String(watchedServiceId)
    ) {
      form.setFieldValue("previousTaskId", null);
    }
  }, [watchedServiceId]);

  const tasksForDependency = useMemo(() => {
    if (!watchedServiceId) return allTasksInProject;
    return allTasksInProject.filter(
      (t) => String(t.serviceId) === String(watchedServiceId),
    );
  }, [allTasksInProject, watchedServiceId]);

  const prevTask = useMemo(
    () =>
      allTasksInProject.find(
        (t) => extractId(t.id) === extractId(watchedPreviousTaskId),
      ),
    [allTasksInProject, watchedPreviousTaskId],
  );

  const handleClose = () => {
    onClose();
    form.resetFields();
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const selectedService = services.find(
      (ps) => getProjectServiceTaskKey(ps) === String(values.serviceId || ""),
    );
    if (selectedService && isDeletedServiceRecord(selectedService)) {
      message.warning(
        "This service has been deleted; a new task cannot be created.",
      );
      return;
    }
    setSaving(true);
    try {
      let finalStatus = "toDo";
      if (values.previousTaskId) {
        const prev = allTasksInProject.find(
          (t) => extractId(t.id) === extractId(values.previousTaskId),
        );
        if (prev && prev.status !== "done") finalStatus = "blocked";
      }
      const payload = {
        title: values.title.trim(),
        status: finalStatus,
        priority: values.priority,
        projectId,
        isRequiredApproval: !!values.isRequiredApproval,
      };
      if (values.lawyerId) payload.lawyerId = values.lawyerId;
      if (values.serviceId) payload.serviceId = Number(values.serviceId);
      if (values.approvedById) payload.approvedById = values.approvedById;
      if (values.startDate)
        payload.startDate = dateValueToISO(values.startDate);
      if (values.dueDate) payload.dueDate = dateValueToISO(values.dueDate);
      if (values.description) payload.description = values.description;
      if (values.estimatedDuration)
        payload.estimatedDuration = parseFloat(values.estimatedDuration);
      if (values.previousTaskId) payload.previousTaskId = values.previousTaskId;
      if (values.nextStepDescription)
        payload.nextStepDescription = values.nextStepDescription;
      await apiReq("tasks:create", "POST", payload);
      message.success("✅ Task created");
      onSave();
      handleClose();
    } catch {
      message.error("Creation failed");
    }
    setSaving(false);
  };

  const priorityOptions = useMemo(
    () =>
      Object.entries(PRIORITY_CFG).map(([k, v]) => ({
        value: k,
        label: v.label,
      })),
    [],
  );

  const prevTaskInfo = prevTask
    ? React.createElement(
        "div",
        {
          style: {
            ...(prevTask.status === "done"
              ? TASK_DS.successBox
              : TASK_DS.waitingBox),
            marginTop: 6,
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
        React.createElement(
          "span",
          {
            style: {
              fontSize: 12,
              fontFamily: FONT,
              color: prevTask.status === "done" ? "#389e0d" : "#722ed1",
              fontWeight: 600,
            },
          },
          prevTask.status === "done"
            ? "Done"
            : 'New task will start as "Waiting"',
        ),
      )
    : null;

  const fieldStyle = { marginBottom: 14 };
  const fullFieldStyle = { ...fieldStyle, gridColumn: "1 / -1" };

  return React.createElement(
    Modal,
    {
      open,
      onCancel: handleClose,
      onOk: handleSave,
      confirmLoading: saving,
      okText: saving ? "Saving..." : "Submit",
      cancelText: "Cancel",
      width: 900,
      okButtonProps: { style: TASK_DS.primaryButton },
      cancelButtonProps: { style: TASK_DS.secondaryButton },
      title: React.createElement(
        Text,
        { strong: true, style: { fontSize: 15, fontFamily: FONT } },
        "New task",
      ),
    },
    React.createElement(
      Form,
      {
        form,
        layout: "vertical",
        requiredMark: false,
        initialValues: { priority: "medium", isRequiredApproval: false },
        style: { maxHeight: "72vh", overflowY: "auto", paddingRight: 4 },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "0 16px",
          },
        },
        React.createElement(
          Form.Item,
          {
            name: "title",
            label: "Title",
            rules: [{ required: true, message: "Please enter a task name" }],
            style: fullFieldStyle,
          },
          React.createElement(Input, { placeholder: "Enter title..." }),
        ),
        React.createElement(
          Form.Item,
          { name: "lawyerId", label: "Assignee", style: fieldStyle },
          React.createElement(LawyerPicker, {
            lawyers,
            size: 20,
            bordered: true,
            placeholder: "Select assignee",
          }),
        ),
        React.createElement(
          Form.Item,
          {
            name: "serviceId",
            label: "Service",
            style: fieldStyle,
            extra:
              services.length === 0
                ? React.createElement(
                    "span",
                    { style: { color: "#d46b08" } },
                    "No services in this case yet",
                  )
                : undefined,
          },
          React.createElement(Select, {
            placeholder: "-- Select service --",
            allowClear: true,
            disabled: services.length === 0,
            // Hiển thị TẤT CẢ projectServices (cả catalog và custom)
            // Catalog service: value = ps.serviceId
            // Custom service: value = ps.id (projectService id, dùng làm key thống nhất)
            options: services.map((ps) => {
              const disabled = isDeletedServiceRecord(ps);
              const serviceLabel = ps.serviceName || `Service #${ps.id}`;
              return {
                value: getProjectServiceTaskKey(ps),
                label: `${serviceLabel}${disabled ? " (Locked)" : ""}`,
                disabled,
              };
            }),
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "startDate", label: "Start date", style: fieldStyle },
          React.createElement(DatePicker, {
            style: { width: "100%" },
            format: "DD/MM/YYYY",
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "dueDate", label: "Deadline", style: fieldStyle },
          React.createElement(DatePicker, {
            style: { width: "100%" },
            format: "DD/MM/YYYY",
          }),
        ),
        React.createElement(
          Form.Item,
          {
            name: "estimatedDuration",
            label: "Estimated duration",
            style: fieldStyle,
          },
          React.createElement(InputNumber, {
            style: { width: "100%" },
            min: 0,
            placeholder: "e.g., 4",
            addonAfter: "hours",
          }),
        ),
        React.createElement(
          Form.Item,
          {
            name: "previousTaskId",
            label: "Pending Issue (optional)",
            style: fullFieldStyle,
            extra: prevTaskInfo,
          },
          React.createElement(TaskPicker, {
            allTasks: tasksForDependency,
            currentTaskId: null,
            services,
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "priority", label: "Priority", style: fieldStyle },
          React.createElement(Segmented, { options: priorityOptions }),
        ),
        React.createElement(
          "div",
          { style: fullFieldStyle },
          React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: watchedIsRequiredApproval
                  ? "repeat(2, minmax(0, 1fr))"
                  : "1fr",
                gap: "0 16px",
                padding: 12,
                border: "1px solid #f0f0f0",
                borderRadius: 6,
                background: "#fafafa",
              },
            },
            React.createElement(
              Form.Item,
              {
                name: "isRequiredApproval",
                label: "Approval required",
                valuePropName: "checked",
                style: { marginBottom: 0 },
              },
              React.createElement(Switch, {
                checkedChildren: "On",
                unCheckedChildren: "Off",
                onChange: (checked) => {
                  if (!checked) form.setFieldValue("approvedById", null);
                },
              }),
            ),
            watchedIsRequiredApproval &&
              React.createElement(
                Form.Item,
                {
                  name: "approvedById",
                  label: "Approver",
                  style: { marginBottom: 0 },
                  extra: "Required because approval is enabled for this task.",
                },
                React.createElement(LawyerPicker, {
                  lawyers,
                  size: 20,
                  bordered: true,
                  placeholder: "Select approver",
                }),
              ),
          ),
        ),
        React.createElement(
          Form.Item,
          { name: "description", label: "Description", style: fullFieldStyle },
          React.createElement(Input.TextArea, {
            rows: 3,
            placeholder: "Description...",
          }),
        ),
        React.createElement(
          Form.Item,
          {
            name: "nextStepDescription",
            label: "Next Step",
            style: fullFieldStyle,
          },
          React.createElement(Input.TextArea, {
            rows: 2,
            placeholder: "Next step after completion...",
          }),
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
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const watchedIsRequiredApproval = Form.useWatch("isRequiredApproval", form);

  const handleClose = () => {
    onClose();
    form.resetFields();
  };

  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const payload = withTaskLinkedUrl(
        {
          subTaskName: values.title.trim(),
          status: "toDo",
          priority: values.priority,
          taskId: parentTaskId,
          isRequiredApproval: !!values.isRequiredApproval,
        },
        { taskId: parentTaskId },
        "subTask",
      );
      if (values.lawyerId) payload.lawyerId = values.lawyerId;
      if (values.approvedById) payload.approvedById = values.approvedById;
      if (values.startDate)
        payload.startDate = dateValueToISO(values.startDate);
      if (values.deadline) payload.deadline = dateValueToISO(values.deadline);
      if (values.description) payload.description = values.description;
      if (values.estimatedDuration)
        payload.estimatedDuration = parseFloat(values.estimatedDuration);
      if (values.nextStepDescription)
        payload.nextStepDescription = values.nextStepDescription;
      await apiReq("subTasks:create", "POST", payload);
      message.success("✅ Subtask created");
      onSave();
      handleClose();
    } catch {
      message.error("Creation failed");
    }
    setSaving(false);
  };

  const priorityOptions = useMemo(
    () =>
      Object.entries(PRIORITY_CFG).map(([k, v]) => ({
        value: k,
        label: v.label,
      })),
    [],
  );

  const fieldStyle = { marginBottom: 14 };
  const fullFieldStyle = { ...fieldStyle, gridColumn: "1 / -1" };

  return React.createElement(
    Modal,
    {
      open,
      onCancel: handleClose,
      onOk: handleSave,
      confirmLoading: saving,
      okText: saving ? "Saving..." : "Submit",
      cancelText: "Cancel",
      width: 640,
      okButtonProps: { style: TASK_DS.primaryButton },
      cancelButtonProps: { style: TASK_DS.secondaryButton },
      title: React.createElement(
        Text,
        { strong: true, style: { fontSize: 15, fontFamily: FONT } },
        "New subtask",
      ),
    },
    React.createElement(
      Form,
      {
        form,
        layout: "vertical",
        requiredMark: false,
        initialValues: { priority: "medium", isRequiredApproval: false },
        style: { maxHeight: "72vh", overflowY: "auto", paddingRight: 4 },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "0 16px",
          },
        },
        React.createElement(
          Form.Item,
          {
            name: "title",
            label: "Title",
            rules: [{ required: true, message: "Please enter a subtask name" }],
            style: fullFieldStyle,
          },
          React.createElement(Input, { placeholder: "Enter title..." }),
        ),
        React.createElement(
          Form.Item,
          { name: "lawyerId", label: "Assignee", style: fieldStyle },
          React.createElement(LawyerPicker, {
            lawyers,
            size: 20,
            bordered: true,
            placeholder: "Select assignee",
          }),
        ),
        React.createElement(
          Form.Item,
          {
            name: "estimatedDuration",
            label: "Estimated duration",
            style: fieldStyle,
          },
          React.createElement(InputNumber, {
            style: { width: "100%" },
            min: 0,
            placeholder: "e.g., 4",
            addonAfter: "hours",
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "startDate", label: "Start date", style: fieldStyle },
          React.createElement(DatePicker, {
            style: { width: "100%" },
            format: "DD/MM/YYYY",
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "deadline", label: "Deadline", style: fieldStyle },
          React.createElement(DatePicker, {
            style: { width: "100%" },
            format: "DD/MM/YYYY",
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "priority", label: "Priority", style: fieldStyle },
          React.createElement(Segmented, { options: priorityOptions }),
        ),
        React.createElement(
          "div",
          { style: fullFieldStyle },
          React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: watchedIsRequiredApproval
                  ? "repeat(2, minmax(0, 1fr))"
                  : "1fr",
                gap: "0 16px",
                padding: 12,
                border: "1px solid #f0f0f0",
                borderRadius: 6,
                background: "#fafafa",
              },
            },
            React.createElement(
              Form.Item,
              {
                name: "isRequiredApproval",
                label: "Approval required",
                valuePropName: "checked",
                style: { marginBottom: 0 },
              },
              React.createElement(Switch, {
                checkedChildren: "On",
                unCheckedChildren: "Off",
                onChange: (checked) => {
                  if (!checked) form.setFieldValue("approvedById", null);
                },
              }),
            ),
            watchedIsRequiredApproval &&
              React.createElement(
                Form.Item,
                {
                  name: "approvedById",
                  label: "Approver",
                  style: { marginBottom: 0 },
                  extra:
                    "Required because approval is enabled for this subtask.",
                },
                React.createElement(LawyerPicker, {
                  lawyers,
                  size: 20,
                  bordered: true,
                  placeholder: "Select approver",
                }),
              ),
          ),
        ),
        React.createElement(
          Form.Item,
          {
            name: "description",
            label: "Detailed Description",
            style: fullFieldStyle,
          },
          React.createElement(Input.TextArea, {
            rows: 3,
            placeholder: "Describe the subtask in detail...",
          }),
        ),
        React.createElement(
          Form.Item,
          {
            name: "nextStepDescription",
            label: "Next Step",
            style: fullFieldStyle,
          },
          React.createElement(Input.TextArea, {
            rows: 2,
            placeholder: "Next step after completion...",
          }),
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
          const name = f.title || att?.title || att?.filename || "(Untitled)";

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
  expanded,
  onToggle,
  isManager = false,
  onOpenAddSubModal,
  allTasksInProject,
  tasksInService,
  isAssigneeOnly = false,
  myLawyerId = null,
  onDeleteTask,
  onReorderTask,
  groupServiceKey,
}) => {
  const [hov, setHov] = useState(false);
  const [dragOverPos, setDragOverPos] = useState(null); // "before" | "after" | null
  const [showMenu, setShowMenu] = useState(false);
  const [filePopup, setFilePopup] = useState(false);
  const [fileAnchorRect, setFileAnchorRect] = useState(null);
  const filesBtnRef = useRef(null);
  const hasSubs = task._subs?.length > 0;
  const done = task._subs?.filter((s) => s.status === "done").length || 0;
  const total = task._subs?.length || 0;
  const isBlocked = task.status === "blocked";
  const serviceDeleted = isTaskServiceDeleted(task);
  const taskRecordId = getTaskRecordId(task);

  // 🌟 FIX QUYỀN TRÊN TABLE ROW (Quét cả trường lawyer)
  const taskLawyerId = extractId(task.lawyerId) || extractId(task.lawyer);
  const isAssignedToThis = myLawyerId && taskLawyerId === extractId(myLawyerId);
  const canEdit = !serviceDeleted && (isManager || isAssignedToThis);
  const menuActive = hov || showMenu;
  const handleTaskMenuAction = (event, action) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!taskRecordId) {
      setShowMenu(false);
      message.error("Task ID not found for this action.");
      return;
    }

    if (action === "addSubTask") {
      onToggle(taskRecordId, true);
      onOpenAddSubModal(taskRecordId);
      setShowMenu(false);
      return;
    }

    if (action === "deleteTask") {
      if (typeof onDeleteTask !== "function") {
        console.error("[TaskManagement] onDeleteTask handler is missing", {
          taskRecordId,
          task,
        });
        message.error("The delete task action has not been configured.");
        setShowMenu(false);
        return;
      }
      onDeleteTask(taskRecordId, "task", task.title);
      setShowMenu(false);
    }
  };

  const canDrag = !serviceDeleted && typeof onReorderTask === "function";
  const handleRowDragStart = (e) => {
    if (!canDrag) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ type: "task", id: extractId(task.id) }),
    );
  };
  const handleRowDragOver = (e) => {
    if (!canDrag) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY - rect.top < rect.height / 2 ? "before" : "after";
    setDragOverPos(pos);
    e.dataTransfer.dropEffect = "move";
  };
  const handleRowDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOverPos(null);
  };
  const handleRowDrop = (e) => {
    if (!canDrag) return;
    e.preventDefault();
    const pos = dragOverPos;
    setDragOverPos(null);
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    let payload = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    if (!payload || payload.type !== "task") return;
    onReorderTask(
      payload.id,
      extractId(task.id),
      groupServiceKey,
      pos || "before",
    );
  };

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      {
        id: `task-row-${taskRecordId}`,
        "data-task-id": taskRecordId,
        "data-record-type": "task",
        style: {
          display: "flex",
          alignItems: "center",
          minHeight: 44,
          background: dragOverPos
            ? "#e6f4ff"
            : serviceDeleted
              ? "#fafafa"
              : isBlocked
                ? "#fdf6ff"
                : hov
                  ? "#f0f7ff"
                  : "#fff",
          transition: "background 0.1s",
          borderLeft: serviceDeleted
            ? "3px solid #bfbfbf"
            : isBlocked
              ? "3px solid #722ed1"
              : "3px solid transparent",
          borderTop:
            dragOverPos === "before"
              ? "2px dashed #1677ff"
              : "2px solid transparent",
          borderBottom: dragOverPos === "after" ? "2px dashed #1677ff" : "none",
          outline: dragOverPos ? "2px dashed #1677ff" : "none",
          outlineOffset: dragOverPos ? -2 : undefined,
          minWidth: 1420,
          width: "100%",
          cursor: canDrag ? "grab" : undefined,
        },
        draggable: canDrag,
        onDragStart: handleRowDragStart,
        onDragOver: handleRowDragOver,
        onDragLeave: handleRowDragLeave,
        onDrop: handleRowDrop,
        onMouseEnter: () => setHov(true),
        onMouseLeave: () => setHov(false),
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
                onMouseDown: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                },
                onClick: (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMenu((v) => !v);
                },
                style: {
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  background: menuActive ? "#e6f4ff" : "transparent",
                  border: menuActive
                    ? "1px solid #91caff"
                    : "1px solid transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 12,
                  color: menuActive ? "#096dd9" : "transparent",
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
                top: 28,
                zIndex: 9999,
                background: "#fff",
                border: "1px solid #e8e8e8",
                borderRadius: 6,
                boxShadow: "0 6px 20px rgba(0,0,0,0.14)",
                minWidth: 180,
                padding: "4px 0",
              },
              onMouseDown: (e) => {
                e.preventDefault();
                e.stopPropagation();
              },
              onClick: (e) => e.stopPropagation(),
            },
            canEdit &&
              React.createElement(
                "div",
                {
                  onClick: (e) => handleTaskMenuAction(e, "addSubTask"),
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
                  onClick: (e) => handleTaskMenuAction(e, "deleteTask"),
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
                React.createElement("span", null, "🗑️"),
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
          onClick: serviceDeleted ? undefined : () => onToggle(task.id),
          style: {
            width: COL.toggle,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: !serviceDeleted && hasSubs ? "pointer" : "default",
            flexShrink: 0,
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 700,
          },
          onMouseEnter: (e) => {
            if (!serviceDeleted && hasSubs)
              e.currentTarget.style.background = "#e6f4ff";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.background = "transparent";
          },
        },
        hasSubs ? (expanded ? "▾" : "▸") : " ",
      ),
      // Title
      React.createElement(
        "div",
        {
          "data-task-id": taskRecordId,
          "data-action": "open-task-detail",
          onClick: serviceDeleted
            ? undefined
            : () => onOpen(task, "task", tasksInService),
          title: serviceDeleted ? "Service is locked" : undefined,
          style: {
            flex: 1,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: FONT,
            cursor: serviceDeleted ? "not-allowed" : "pointer",
            color: task._od
              ? "#cf1322"
              : STATUS_CFG[task.status]?.color || "#262626",
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
      // Trạng thái
      React.createElement(
        "div",
        {
          style: {
            width: COL.status,
            flexShrink: 0,
            padding: "0 8px",
            display: "flex",
            alignItems: "center",
          },
        },
        React.createElement(StatusBtn, {
          status: task.status,
          onChange: canEdit ? (s) => onStatus(task.id, s, "task") : null,
          isRequiredApproval: task.isRequiredApproval,
          isBlocked,
          readOnly: !canEdit,
        }),
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
          readOnly: serviceDeleted || !isManager || isAssigneeOnly,
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
                  if (!serviceDeleted) onOpen(task, "task", tasksInService);
                },
                title: serviceDeleted
                  ? "Service is locked"
                  : "No documents yet — open details to upload",
                style: {
                  fontSize: 12,
                  padding: "3px 8px",
                  borderRadius: 4,
                  border: "1px solid #f0f0f0",
                  color: "#d9d9d9",
                  cursor: serviceDeleted ? "not-allowed" : "pointer",
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
        {
          style: { background: "#fafcff" },
        },
        ...(task._subs || []).map((s, index) => {
          // 🌟 SỬA ĐOẠN NÀY
          const subTaskRecordId = getSubTaskRecordId(s);
          const subLawyerId = extractId(s.lawyerId) || extractId(s.lawyer);
          const canEditSub =
            !serviceDeleted &&
            (isManager ||
              (myLawyerId && subLawyerId === extractId(myLawyerId)));
          const isSubBlocked = s.status === "blocked";
          const i = index + 1;
          return React.createElement(
            "div",
            {
              key: s.id,
              id: `subtask-row-${subTaskRecordId}`,
              "data-task-id": taskRecordId, // id task cha
              "data-subtask-id": subTaskRecordId, // id subtask
              "data-record-type": "subTask",
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
              isManager && !serviceDeleted
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
                        onDeleteTask(subTaskRecordId, "subTask", s.subTaskName);
                      },
                    },
                    "🗑️",
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
            // 3. Cột Title (Dùng flex: 1 để khớp với task chính)
            React.createElement(
              "div",
              {
                onClick: serviceDeleted
                  ? undefined
                  : () => onOpen(s, "subTask"),
                title: serviceDeleted ? "Service is locked" : undefined,
                style: {
                  flex: 1,
                  padding: "0 10px",
                  fontSize: 12,
                  fontFamily: FONT,
                  color: s._od
                    ? "#cf1322"
                    : STATUS_CFG[s.status]?.color || "#595959",
                  cursor: serviceDeleted ? "not-allowed" : "pointer",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              },
              s.subTaskName,
            ),
            // 4. Cột Trạng thái
            React.createElement(
              "div",
              {
                style: {
                  width: COL.status,
                  flexShrink: 0,
                  padding: "0 8px",
                  display: "flex",
                  alignItems: "center",
                },
              },
              React.createElement(StatusBtn, {
                status: s.status,
                onChange: canEditSub
                  ? (st) => onStatus(s.id, st, "subTask")
                  : null,
                isRequiredApproval: s.isRequiredApproval,
                isBlocked: isSubBlocked,
                readOnly: !canEditSub,
              }),
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
                readOnly: serviceDeleted || !isManager || isAssigneeOnly,
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
  isManager,
  onOpenAddSubModal,
  colorCfg,
  allTasksInProject,
  isAssigneeOnly = false,
  myLawyerId = null,
  onDeleteTask,
  serviceDeleted = false,
  onReorderTask,
  groupServiceKey,
}) => {
  const [collapsed, setCollapsed] = useState(serviceDeleted);
  const doneCnt = tasks.filter((t) => t.status === "done").length;
  const totalCnt = tasks.length;
  const isCollapsed = serviceDeleted || collapsed;

  useEffect(() => {
    if (serviceDeleted) setCollapsed(true);
  }, [serviceDeleted]);

  const toggleService = () => {
    if (!serviceDeleted) setCollapsed((value) => !value);
  };

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
        onClick: toggleService,
        onKeyDown: serviceDeleted
          ? undefined
          : (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleService();
              }
            },
        role: serviceDeleted ? undefined : "button",
        tabIndex: serviceDeleted ? -1 : 0,
        "aria-expanded": serviceDeleted ? false : !isCollapsed,
        title: serviceDeleted
          ? "This service has been deleted and locked. The task list cannot be opened."
          : isCollapsed
            ? "Expand task list"
            : "Collapse task list",
        style: {
          display: "flex",
          minWidth: 1420,
          width: "100%",
          alignItems: "center",
          padding: "10px 14px",
          background: colorCfg.bg,
          cursor: serviceDeleted ? "not-allowed" : "pointer",
          borderRadius: isCollapsed ? 8 : "8px 8px 0 0",
          color: serviceDeleted ? "#8c8c8c" : colorCfg.text,
          userSelect: "none",
        },
      },
      React.createElement(
        "span",
        {
          style: {
            marginRight: 8,
            width: 16,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            transform:
              serviceDeleted || !isCollapsed ? "none" : "rotate(-90deg)",
            transition: "transform 0.2s",
            color: serviceDeleted ? "#8c8c8c" : colorCfg.text,
          },
        },
        serviceDeleted ? renderServiceLockIcon(15) : "▾",
      ),
      React.createElement(
        "b",
        {
          style: {
            flex: 1,
            fontSize: 12,
            color: serviceDeleted ? "#595959" : "inherit",
          },
        },
        serviceName,
      ),
      React.createElement(
        "span",
        { style: { fontSize: 12 } },
        `${doneCnt}/${totalCnt} done`,
      ),
    ),
    !isCollapsed &&
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
            isManager,
            onOpenAddSubModal,
            allTasksInProject,
            tasksInService: tasks,
            isAssigneeOnly,
            myLawyerId,
            onDeleteTask,
            onReorderTask,
            groupServiceKey,
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
  services,
  lawyers,
  expanded,
  toggleExpand,
  handleStatus,
  handleOpen,
  handleAssign,
  isManager,
  handleOpenAddSubModal,
  isAssigneeOnly,
  myLawyerId,
  showAddTask,
  setShowAddTask,
  onDeleteTask,
  onReorderTask,
}) => {
  // services = projectServices của case này
  // Key quy ước: nếu ps.serviceId có (catalog service) → dùng ps.serviceId
  //           nếu ps.serviceId = null (custom service) → dùng ps.id (projectService id)
  // task.serviceId sẽ lưu đúng key này khi tạo công việc
  const serviceMap = {};
  const serviceDeletedMap = {};
  services.forEach((ps) => {
    const key = getProjectServiceTaskKey(ps);
    const deleted = isDeletedServiceRecord(ps);
    serviceMap[key] = ps.serviceName || `Service #${ps.id}`;
    serviceDeletedMap[key] = deleted;
  });
  const grouped = {};
  tasks.forEach((t) => {
    const svcId = extractId(t.serviceId);
    const key = svcId ? String(svcId) : "__none__";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  });
  // Thứ tự hiển thị: tất cả projectServices (kể cả custom) rồi mới đến __none__
  const serviceOrder = services.map((ps) => getProjectServiceTaskKey(ps));
  // Nhóm có task + nhóm chưa có task nào (hiển thị rỗng để user tạo task mới)
  const allServiceKeys = serviceOrder; // Luôn hiển thị tất cả dịch vụ
  const extraKeys = Object.keys(grouped).filter(
    (k) => !serviceOrder.includes(k) && k !== "__none__",
  );
  const orderedKeys = [
    ...allServiceKeys,
    ...extraKeys,
    ...(grouped["__none__"] ? ["__none__"] : []),
  ];

  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 0,
        minWidth: 1420,
      },
    },
    ...orderedKeys.map((key) => {
      const colorCfg =
        key === "__none__"
          ? {
              bg: "#fafafa",
              border: "#e8e8e8",
              text: "#8c8c8c",
              dot: "#bfbfbf",
            }
          : serviceDeletedMap[key]
            ? {
                bg: "#fafafa",
                border: "#d9d9d9",
                text: "#8c8c8c",
                dot: "#bfbfbf",
              }
            : SERVICE_COLORS[orderedKeys.indexOf(key) % SERVICE_COLORS.length];
      const svcName =
        key === "__none__"
          ? "No service assigned"
          : serviceMap[key] || `Service #${key}`;
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
        isManager,
        onOpenAddSubModal: handleOpenAddSubModal,
        colorCfg,
        allTasksInProject: tasks,
        isAssigneeOnly,
        myLawyerId,
        serviceDeleted: !!serviceDeletedMap[key],
        onDeleteTask,
        onReorderTask,
        groupServiceKey: key,
      });
    }),
  );
};

// ============================================================
// §10 MAIN — ProjectTasksTab + ctx.render()
// ============================================================
const ProjectTasksTab = () => {
  const [tasks, setTasks] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [projectManagerId, setProjectManagerId] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [addSubForTaskId, setAddSubForTaskId] = useState(null);

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
      const [allTasks, allSubs, allLawyers, allServices, user] =
        await Promise.all([
          fetchAll(
            "tasks:list",
            "id,title,status,updatedAt,priority,startDate,dueDate,closedDate,lawyerId,projectId,serviceId,description,estimatedDuration,workRate,isRequiredApproval,rejectionReason,approvedById,approvedAt,acceptedAt,previousTaskId,blockedReason,nextStepDescription,linkedUrl,taskIndex",
            { projectId: { $eq: safeProjectId } },
            ["taskIndex", "id"],
          ),
          fetchAll(
            "subTasks:list",
            "id,subTaskName,status,priority,date,deadline,closedDate,lawyerId,taskId,description,hourlyRate,estimatedDuration,isRequiredApproval,rejectionReason,approvedById,updatedAt,linkedUrl",
          ),
          fetchAll("lawyers:list", "id,lawyerName,unitPrice,lawyerType,userId"),
          fetchAll(
            "projectServices:list",
            "id,serviceId,serviceName,serviceType,description,basePrice,status",
            {
              projectId: { $eq: safeProjectId },
            },
          ),
          getCurrentUser(),
        ]);

      try {
        const projRes = await ctx.api.request({
          url: "projects:get",
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
        allTaskFiles = await fetchTaskDocumentsByIds(taskIds);
      }

      const fileMap = {};
      taskIds.forEach((id) => {
        fileMap[id] = [];
      });
      allTaskFiles.forEach((f) => {
        const taskId = getDocumentTaskId(f);
        if (taskId && fileMap[taskId]) fileMap[taskId].push(f);
      });

      const serviceDeletedLookup = {};
      allServices.forEach((ps) => {
        serviceDeletedLookup[getProjectServiceTaskKey(ps)] =
          isDeletedServiceRecord(ps);
      });
      const getTaskServiceDeleted = (taskLike) => {
        const svcId = extractId(taskLike?.serviceId);
        return !!svcId && !!serviceDeletedLookup[String(svcId)];
      };

      const enriched = allTasks.map((t) => ({
        ...t,
        _type: "task",
        _serviceDeleted: getTaskServiceDeleted(t),
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
            _serviceDeleted: getTaskServiceDeleted(t),
            _ln: lMap[s.lawyerId]?.name || null,
            _lc: lMap[s.lawyerId]?.color || "#8c8c8c",
            _od: isOD(s.deadline, s.status),
          })),
      }));

      setTasks(enriched);
      setLawyers(allLawyers);
      setServices(allServices);
      setCurrentUser(user);
    } catch (error) {
      message.error("Error loading data, please refresh!");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, []);

  // ── Permission ────────────────────────────────────────────
  const isAdmin = isAdminUser(currentUser);
  // 🌟 PATCH: Đối chiếu chính xác cả trường hợp NocoBase trả về Object
  const myLawyer = useMemo(() => {
    const currentUserId = extractId(currentUser?.id);

    const found = lawyers.find((l) => {
      // Quét cả l.userId (khóa ngoại) và l.user (trường liên kết object)
      const lawyerUserId = extractId(l.userId) || extractId(l.user);
      return currentUserId && lawyerUserId === currentUserId;
    });
    return found;
  }, [lawyers, currentUser]);

  // 🌟 PATCH 2: Bọc extractId cho projectManagerId
  const isManager =
    isAdmin ||
    (currentUser &&
      projectManagerId &&
      extractId(currentUser.id) === extractId(projectManagerId));
  const isAssigneeOnly = !!myLawyer && !isManager;
  const myLawyerId = myLawyer?.id || null;
  const assignableLawyers = lawyers.filter((l) =>
    ["associate", "suppliant", "lawyer", "partner"].includes(l.lawyerType),
  );

  // 🌟 HÀM KIỂM TRA QUYỀN EDIT CHO TỪNG TASK CỤ THỂ
  const checkCanEditTask = useCallback(
    (targetItem) => {
      if (!isAssigneeOnly) return true; // Manager/Admin thì được edit hết
      if (!targetItem) return false;

      const taskLawyerId = extractId(targetItem.lawyerId);
      const currentMyLawyerId = extractId(myLawyerId);

      const isAllowed = currentMyLawyerId && taskLawyerId === currentMyLawyerId;
      if (!isAllowed) {
        console.log("🛑 BỊ CHẶN Ở FRONTEND - Không khớp ID:", {
          taskLawyerId,
          currentMyLawyerId,
        });
      }
      return isAllowed;
    },
    [isAssigneeOnly, myLawyerId],
  );

  // ── Auto-unblock downstream tasks ────────────────────────
  const autoUnblockNextTasks = useCallback(
    async (doneTaskId, allCurrentTasks, changedByName) => {
      const nextTasks = allCurrentTasks.filter(
        (t) =>
          !isTaskServiceDeleted(t) &&
          extractId(t.previousTaskId) === extractId(doneTaskId) &&
          t.status === "blocked",
      );
      if (nextTasks.length === 0) return;
      await Promise.all(
        nextTasks.map(async (t) => {
          try {
            await apiReq(`tasks:update?filterByTk=${extractId(t.id)}`, "POST", {
              status: "toDo",
            });
            await logActivity(
              "Task",
              extractId(t.id),
              "updated",
              "status",
              "Waiting",
              "Not started",
              "System (auto-unblock)",
            );
            message.success(`🔓 "${t.title}" has been unblocked`);
          } catch {}
        }),
      );
      setTasks((prev) =>
        prev.map((t) =>
          nextTasks.find((n) => extractId(n.id) === extractId(t.id))
            ? { ...t, status: "toDo" }
            : t,
        ),
      );
    },
    [],
  );

  // ── handleStatus ──────────────────────────────────────────
  const handleStatus = useCallback(
    async (id, newStatus, type) => {
      let targetItem = null;
      if (type === "task") {
        targetItem = tasks.find((t) => extractId(t.id) === extractId(id));
      } else {
        for (const t of tasks) {
          const sub = t._subs?.find((s) => extractId(s.id) === extractId(id));
          if (sub) {
            targetItem = sub;
            break;
          }
        }
      }

      if (isTaskServiceDeleted(targetItem)) {
        message.warning(
          "This service has been deleted; the task cannot be updated.",
        );
        return;
      }

      if (!checkCanEditTask(targetItem)) {
        message.warning(
          "You are not the assignee and do not have permission to change the status.",
        );
        return;
      }

      if (type === "task" && targetItem?.previousTaskId) {
        const prevTask = tasks.find(
          (t) => extractId(t.id) === extractId(targetItem.previousTaskId),
        );
        if (
          prevTask &&
          prevTask.status !== "done" &&
          prevTask.status !== "cancelled"
        ) {
          if (!["cancelled", "blocked"].includes(newStatus)) {
            message.warning(
              `⛓ Task is waiting for "${prevTask.title}" to complete first`,
            );
            return;
          }
        }
      }

      const resolvedSt = resolveStatus(newStatus, targetItem);
      if (resolvedSt === "pending" && newStatus === "done")
        message.info('📋 Task requires approval — moved to "Pending approval"');

      const url =
        type === "subTask"
          ? `subTasks:update?filterByTk=${extractId(id)}`
          : `tasks:update?filterByTk=${extractId(id)}`;
      const data =
        resolvedSt === "done"
          ? { status: resolvedSt, closedDate: new Date().toISOString() }
          : { status: resolvedSt, closedDate: null };

      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => {
          if (type === "task" && extractId(t.id) === extractId(id))
            return { ...t, ...data, _od: isOD(t.dueDate, resolvedSt) };
          return {
            ...t,
            _subs: t._subs.map((s) =>
              extractId(s.id) === extractId(id) && type === "subTask"
                ? { ...s, ...data }
                : s,
            ),
          };
        }),
      );

      try {
        await apiReq(url, "POST", data);
        await logActivity(
          type === "subTask" ? "SubTask" : "Task",
          extractId(id),
          "updated",
          "status",
          null,
          STATUS_CFG[resolvedSt]?.label,
          currentUser?.nickname || currentUser?.username || "Super Admin",
        );
        if (resolvedSt === "done" && type === "task")
          await autoUnblockNextTasks(
            id,
            tasks,
            currentUser?.nickname || currentUser?.username,
          );
      } catch (e) {
        console.error("🛑 LỖI API BACKEND (NocoBase):", e);
        message.error(
          "Backend error: your account has not been granted permission (Role) to edit data!",
        );
        reload();
      }
    },
    [reload, currentUser, tasks, autoUnblockNextTasks, checkCanEditTask],
  );

  // ── handleAssign ──────────────────────────────────────────
  const handleAssign = useCallback(
    async (id, lawyerId, lawyerName, lawyerColor, type) => {
      if (!isManager) {
        message.warning("You do not have permission to assign an assignee.");
        return;
      }
      const url =
        type === "subTask"
          ? `subTasks:update?filterByTk=${extractId(id)}`
          : `tasks:update?filterByTk=${extractId(id)}`;
      const targetItem =
        type === "subTask"
          ? tasks
              .flatMap((t) => t._subs || [])
              .find((s) => extractId(s.id) === extractId(id))
          : tasks.find((t) => extractId(t.id) === extractId(id));
      if (isTaskServiceDeleted(targetItem)) {
        message.warning(
          "This service has been deleted; the task cannot be updated.",
        );
        return;
      }
      const payload = withTaskLinkedUrl(
        { lawyerId: extractId(lawyerId) },
        targetItem || { id },
        type,
      );
      setTasks((prev) =>
        prev.map((t) => {
          if (type === "task" && extractId(t.id) === extractId(id))
            return {
              ...t,
              ...payload,
              _ln: lawyerName,
              _lc: lawyerColor || "#8c8c8c",
            };
          return {
            ...t,
            _subs: t._subs.map((s) =>
              extractId(s.id) === extractId(id) && type === "subTask"
                ? {
                    ...s,
                    ...payload,
                    _ln: lawyerName,
                    _lc: lawyerColor || "#8c8c8c",
                  }
                : s,
            ),
          };
        }),
      );
      try {
        await apiReq(url, "POST", payload);
        message.success(lawyerName ? `✅ ${lawyerName}` : "Assignment removed");
      } catch {
        message.error("Failed");
        reload();
      }
    },
    [reload, isManager, tasks],
  );

  const destroyTaskRecord = useCallback(async (recordId, recordType) => {
    const safeId = extractId(recordId);
    if (!safeId) throw new Error("Missing record id.");

    const resource = recordType === "subTask" ? "subTasks" : "tasks";
    console.info("[TaskManagement] destroy request", {
      resource,
      filterByTk: safeId,
      recordType,
    });
    const hardDeleteAttempts = [
      () =>
        ctx.api.request({
          url: `${resource}:destroy`,
          method: "POST",
          params: { filterByTk: safeId },
        }),
      () =>
        ctx.api.request({
          url: `${resource}:destroy?filterByTk=${encodeURIComponent(safeId)}`,
          method: "POST",
        }),
      () =>
        ctx.api.request({
          url: `${resource}:destroy`,
          method: "DELETE",
          params: { filterByTk: safeId },
        }),
    ];

    let lastError = null;
    for (const attempt of hardDeleteAttempts) {
      try {
        await attempt();
        return "destroy";
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("Delete request failed.");
  }, []);

  const removeDeletedTaskFromState = useCallback((recordId, recordType) => {
    const safeId = extractId(recordId);
    if (!safeId) return;

    setTasks((prev) =>
      recordType === "task"
        ? prev.filter((task) => getTaskRecordId(task) !== safeId)
        : prev.map((task) => ({
            ...task,
            _subs: (task._subs || []).filter(
              (subTask) => getSubTaskRecordId(subTask) !== safeId,
            ),
          })),
    );
  }, []);

  // ── handleDeleteTask ──────────────────────────
  const handleDeleteTask = useCallback(
    (id, type, taskName) => {
      const safeId = extractId(id);
      const targetItem =
        type === "subTask"
          ? tasks
              .flatMap((t) => t._subs || [])
              .find((s) => getSubTaskRecordId(s) === safeId)
          : tasks.find((t) => getTaskRecordId(t) === safeId);
      console.info("[TaskManagement] delete click", {
        rawId: id,
        safeId,
        type,
        taskName,
        found: !!targetItem,
        recordId:
          type === "subTask"
            ? getSubTaskRecordId(targetItem)
            : getTaskRecordId(targetItem),
      });
      if (!safeId) {
        message.error("Task ID not found for deletion.");
        return;
      }
      if (isTaskServiceDeleted(targetItem)) {
        message.warning(
          "This service has been deleted; the task cannot be deleted.",
        );
        return;
      }
      Modal.confirm({
        title: `Confirm deletion of ${type === "task" ? "task" : "subtask"}`,
        content: React.createElement(
          "div",
          { style: { fontFamily: FONT } },
          "Are you sure you want to delete ",
          React.createElement("b", null, taskName),
          "? This action cannot be undone.",
        ),
        okText: "Delete permanently",
        okType: "danger",
        cancelText: "Cancel",
        onOk: async () => {
          try {
            const childSubTaskIds =
              type === "task"
                ? (targetItem?._subs || [])
                    .map((subTask) => getSubTaskRecordId(subTask))
                    .filter(Boolean)
                : [];

            for (const subTaskId of childSubTaskIds) {
              try {
                await destroyTaskRecord(subTaskId, "subTask");
              } catch (childError) {
                console.warn(
                  "[TaskManagement] delete child subtask failed",
                  childError,
                );
              }
            }
            await destroyTaskRecord(safeId, type);

            message.success("✅ Deleted successfully");
            removeDeletedTaskFromState(safeId, type);
            reload();
          } catch (e) {
            console.error("[TaskManagement] delete task failed", e);
            message.error("Delete failed, please try again");
          }
        },
      });
    },
    [destroyTaskRecord, reload, removeDeletedTaskFromState, tasks],
  );

  // ── handleReorderTask ──────────────────────────────
  const handleReorderTask = useCallback(
    async (draggedTaskId, targetTaskId, targetServiceKey, dropPosition) => {
      const draggedId = extractId(draggedTaskId);
      const targetId = extractId(targetTaskId);
      if (!draggedId || draggedId === targetId) return;

      const draggedTask = tasks.find((t) => extractId(t.id) === draggedId);
      if (!draggedTask) return;

      const groupKeyOf = (t) =>
        t.serviceId ? String(extractId(t.serviceId)) : "__none__";
      const sourceServiceKey = groupKeyOf(draggedTask);
      const isCrossService = sourceServiceKey !== targetServiceKey;

      // Build the target group's current order (excluding the dragged task if it
      // was already in this group), backfilling any missing taskIndex by current
      // display order (already taskIndex/id-sorted from the fetch layer) before
      // inserting the dragged task at the drop position.
      const targetGroupTasks = tasks
        .filter(
          (t) =>
            groupKeyOf(t) === targetServiceKey && extractId(t.id) !== draggedId,
        )
        .slice();

      const targetIndex = targetGroupTasks.findIndex(
        (t) => extractId(t.id) === targetId,
      );
      const insertAt =
        targetIndex === -1
          ? targetGroupTasks.length
          : dropPosition === "before"
            ? targetIndex
            : targetIndex + 1;
      targetGroupTasks.splice(insertAt, 0, draggedTask);

      // Reindex the target group sequentially (1-based).
      const targetUpdates = targetGroupTasks
        .map((t, i) => ({ task: t, newIndex: i + 1 }))
        .filter(({ task, newIndex }) => Number(task.taskIndex) !== newIndex);

      // If moving across services, also reindex the source group (with the
      // dragged task removed) so it stays sequential.
      let sourceUpdates = [];
      if (isCrossService) {
        const sourceGroupTasks = tasks
          .filter(
            (t) =>
              groupKeyOf(t) === sourceServiceKey &&
              extractId(t.id) !== draggedId,
          )
          .slice();
        sourceUpdates = sourceGroupTasks
          .map((t, i) => ({ task: t, newIndex: i + 1 }))
          .filter(({ task, newIndex }) => Number(task.taskIndex) !== newIndex);
      }

      const newServiceIdForDragged = isCrossService
        ? targetServiceKey === "__none__"
          ? null
          : Number(targetServiceKey)
        : draggedTask.serviceId;

      // Optimistic UI update.
      const updatesById = new Map();
      targetUpdates.forEach(({ task, newIndex }) =>
        updatesById.set(extractId(task.id), newIndex),
      );
      sourceUpdates.forEach(({ task, newIndex }) =>
        updatesById.set(extractId(task.id), newIndex),
      );
      setTasks((prev) =>
        prev.map((t) => {
          const tid = extractId(t.id);
          if (tid === draggedId) {
            return {
              ...t,
              serviceId: newServiceIdForDragged,
              taskIndex: updatesById.has(tid)
                ? updatesById.get(tid)
                : t.taskIndex,
            };
          }
          if (updatesById.has(tid)) {
            return { ...t, taskIndex: updatesById.get(tid) };
          }
          return t;
        }),
      );

      // Persist. Fire the dragged task's own update (taskIndex + possibly
      // serviceId) plus every other task whose taskIndex actually changed.
      const draggedNewIndex = updatesById.has(draggedId)
        ? updatesById.get(draggedId)
        : draggedTask.taskIndex;
      const draggedPayload = { taskIndex: draggedNewIndex };
      if (isCrossService) draggedPayload.serviceId = newServiceIdForDragged;

      const requests = [
        apiReq(`tasks:update?filterByTk=${draggedId}`, "POST", draggedPayload),
        ...targetUpdates
          .filter(({ task }) => extractId(task.id) !== draggedId)
          .map(({ task, newIndex }) =>
            apiReq(`tasks:update?filterByTk=${extractId(task.id)}`, "POST", {
              taskIndex: newIndex,
            }),
          ),
        ...sourceUpdates.map(({ task, newIndex }) =>
          apiReq(`tasks:update?filterByTk=${extractId(task.id)}`, "POST", {
            taskIndex: newIndex,
          }),
        ),
      ];

      try {
        await Promise.all(requests);
      } catch (e) {
        console.error("[TaskManagement] reorder persist failed", e);
        message.error("Failed to save the new task order.");
      } finally {
        // Resync with the server regardless of outcome: on success this
        // picks up the sorted order via the Task 1 fetch/sort change; on
        // failure it discards the optimistic update above and restores
        // the last-persisted order.
        reload();
      }
    },
    [tasks, reload],
  );

  // ── handleOpenAddSubModal ─────────────────────────────────
  const handleOpenAddSubModal = useCallback(
    (taskId) => {
      const targetTask = tasks.find(
        (t) => extractId(t.id) === extractId(taskId),
      );
      if (isTaskServiceDeleted(targetTask)) {
        message.warning(
          "This service has been deleted; a subtask cannot be created.",
        );
        return;
      }
      setAddSubForTaskId(taskId);
      setShowAddSub(true);
    },
    [tasks],
  );

  // ── handleOpen (mở Task Detail popup từ row) ─────────────
  // Mở view Task Detail (TaskDetailView.js) qua ctx.openView theo uid cố định.
  // Pathname phải build lại từ gốc (/admin/{appId}/...), không kế thừa path
  // của Case cha — nếu không NocoBase sẽ lấy nhầm filterByTk từ ngữ cảnh Case
  // (bug "Task not found" đã fix bằng cách này, tham khảo AllTaskBlock.js).
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
    if (isTaskServiceDeleted(item)) {
      message.warning(
        "This service has been deleted and locked; task details cannot be opened.",
      );
      return;
    }
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

  // ── Stats ─────────────────────────────────────────────────
  const done = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const overdue = tasks.filter((t) => t._od).length;

  // ── Guard ─────────────────────────────────────────────────
  if (!PROJECT_ID)
    return React.createElement(
      "div",
      { style: { padding: 20, color: "#ff4d4f", fontFamily: FONT } },
      "⚠️ Project ID not found",
    );
  // ── Render ────────────────────────────────────────────────
  return React.createElement(
    "div",
    {
      style: {
        fontFamily: FONT,
        background: "#f5f5f5",
        minHeight: "600px",
        display: "flex",
        flexDirection: "column",
      },
    },

    /* ── Topbar ── */
    React.createElement(
      "div",
      {
        style: {
          background: "#fff",
          borderBottom: "1px solid #e8e8e8",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          flexShrink: 0,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          },
        },
        React.createElement(
          Text,
          {
            strong: true,
            style: { fontSize: 12, fontFamily: FONT, color: "#1a1a1a" },
          },
          "📋 Tasks",
        ),
        React.createElement(
          "span",
          {
            style: {
              fontSize: 12,
              fontFamily: FONT,
              color: "#8c8c8c",
              background: "#f5f5f5",
              borderRadius: 8,
              padding: "2px 8px",
            },
          },
          `${done}/${total} done`,
        ),
        blocked > 0 &&
          React.createElement(
            "span",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: "#722ed1",
                background: "#f9f0ff",
                borderRadius: 8,
                padding: "2px 8px",
                border: "1px solid #d3adf7",
              },
            },
            `⏸ ${blocked} waiting`,
          ),
        overdue > 0 &&
          React.createElement(
            "span",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: "#cf1322",
                background: "#fff1f0",
                borderRadius: 8,
                padding: "2px 8px",
                border: "1px solid #ffa39e",
              },
            },
            `⚠ ${overdue} overdue`,
          ),
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 6 } },
          React.createElement(
            "div",
            {
              style: {
                width: 80,
                height: 5,
                borderRadius: 3,
                background: "#e0e0e0",
                overflow: "hidden",
              },
            },
            React.createElement("div", {
              style: {
                width: `${pct}%`,
                height: "100%",
                background: pct === 100 ? "#389e0d" : "#1890ff",
                borderRadius: 3,
                transition: "width 0.4s",
              },
            }),
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: pct === 100 ? "#389e0d" : "#8c8c8c",
              },
            },
            `${pct}%`,
          ),
        ),
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, alignItems: "center" } },
        React.createElement(
          "div",
          {
            onClick: () => setShowAddTask(true),
            style: {
              padding: "5px 16px",
              borderRadius: 4,
              background: "#1890ff",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: FONT,
              fontWeight: 600,
            },
          },
          "＋ New Task",
        ),
        React.createElement(ReloadButton, {
          onReload: reload,
          loading: loading,
          text: "Refresh",
        }),
      ),
    ),

    /* ── Task list ── */
    React.createElement(
      "div",
      {
        style: {
          flex: 1,
          padding: "12px 16px",
          overflowY: "auto",
          overflowX: "auto",
        },
      },
      loading
        ? React.createElement(
            "div",
            { style: { textAlign: "center", padding: 60 } },
            React.createElement(Spin, { size: "large" }),
          )
        : tasks.length === 0 && services.length === 0
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
              services,
              lawyers: assignableLawyers,
              expanded,
              toggleExpand,
              handleStatus,
              handleOpen,
              handleAssign,
              isManager,
              handleOpenAddSubModal,
              isAssigneeOnly,
              myLawyerId,
              showAddTask,
              setShowAddTask,
              onDeleteTask: handleDeleteTask,
              onReorderTask: handleReorderTask,
            }),
    ),

    /* ── Add Task Modal ── */
    React.createElement(AddTaskModal, {
      open: showAddTask,
      projectId: PROJECT_ID ? parseInt(PROJECT_ID) : null,
      lawyers: assignableLawyers,
      services,
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

ctx.render(React.createElement(ProjectTasksTab, null));
