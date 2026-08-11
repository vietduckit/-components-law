const { React } = ctx;
const { useCallback, useEffect, useMemo, useState } = React;
const {
  Avatar,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Empty,
  Input,
  Modal,
  Popover,
  Select,
  Segmented,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  theme,
} = ctx.antd;

const { Text, Title } = Typography;
const { RangePicker } = DatePicker || {};

const FONT = "inherit";
const MEETING_BLOCK_DEFAULT_SCOPE = "all";
const MEETING_FETCH_LIMIT = 500;
const LOOKUP_FETCH_LIMIT = 1000;
const MEETING_CHANGED_EVENT = "law-meeting:changed";
const USER_VIEW_CONFIG_FIELD = "allTaskViewConfig";
const MIN_COLUMN_WIDTH = 96;

const MEETING_FIELDS =
  "id,title,meetingDate,startTime,endTime,location,status,type,description,hostId,caseId,createdAt,updatedAt";
const ATTENDEE_FIELDS =
  "id,userId,meetingId,attendanceStatus,isHost,content,createdAt,updatedAt";
const MEETING_TASK_FIELDS =
  "id,taskId,meetingId,addedAt,createdAt,updatedAt";
const USER_FIELDS = "id,nickname,username,email";
const PROJECT_FIELDS = "id,caseCode,projectName,customerId,createdAt";
const CUSTOMER_FIELDS = "id,customerName,shortName";
const TASK_FIELDS = "id,title,status,lawyerId,projectId,dueDate,updatedAt";

const FALLBACK_TOKEN = {
  colorBgContainer: "#fff",
  colorBgLayout: "#f5f5f5",
  colorFillAlter: "#fafafa",
  colorText: "#262626",
  colorTextSecondary: "#8c8c8c",
  colorBorder: "#d9d9d9",
  colorSplit: "#f0f0f0",
  colorPrimary: "#1677ff",
  colorError: "#cf1322",
  colorWarning: "#d46b08",
  colorSuccess: "#389e0d",
  borderRadius: 6,
  paddingXS: 8,
  paddingSM: 12,
  padding: 16,
  marginXS: 8,
  marginSM: 12,
  margin: 16,
  fontSizeSM: 12,
};

const STATUS_CFG = {
  scheduled: { label: "Scheduled", color: "processing" },
  ongoing: { label: "Ongoing", color: "warning" },
  completed: { label: "Completed", color: "success" },
  cancelled: { label: "Cancelled", color: "default" },
  canceled: { label: "Cancelled", color: "default" },
};

const TYPE_CFG = {
  internal: { label: "Internal", color: "blue" },
  case_review: { label: "Case review", color: "purple" },
  strategy: { label: "Strategy", color: "cyan" },
  training: { label: "Training", color: "green" },
  other: { label: "Other", color: "default" },
};

const ATTENDANCE_CFG = {
  pending: { label: "Pending", color: "default" },
  confirmed: { label: "Confirmed", color: "success" },
  absent: { label: "Absent", color: "error" },
  excused: { label: "Excused", color: "warning" },
};

const STATUS_OPTIONS = Object.entries(STATUS_CFG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

const TYPE_OPTIONS = Object.entries(TYPE_CFG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

const ATTENDANCE_OPTIONS = Object.entries(ATTENDANCE_CFG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

const COLUMN_OPTIONS = [
  { value: "title", label: "Title", locked: true },
  { value: "status", label: "Status" },
  { value: "meetingDate", label: "Date" },
  { value: "time", label: "Time" },
  { value: "host", label: "Host" },
  { value: "attendees", label: "Attendees" },
  { value: "case", label: "Case" },
  { value: "location", label: "Location" },
  { value: "updatedAt", label: "Updated" },
];

const DEFAULT_VISIBLE_COLUMNS = [
  "title",
  "status",
  "meetingDate",
  "time",
  "host",
  "attendees",
  "case",
];

const DEFAULT_COLUMN_WIDTHS = {
  title: 360,
  status: 130,
  meetingDate: 130,
  time: 140,
  host: 190,
  attendees: 180,
  case: 280,
  location: 220,
  updatedAt: 160,
};

const getRuntimeInput = () => {
  try {
    const inputArgs = ctx.view?.inputArgs || ctx.inputArgs || {};
    return {
      ...(inputArgs || {}),
      ...(inputArgs.params || {}),
      ...(ctx.action?.params || {}),
      ...(ctx.modal?.params || {}),
      ...(ctx.view?.params || {}),
      ...(ctx.popup?.params || {}),
      ...(ctx.router?.params || {}),
      ...(ctx.params || {}),
      title:
        ctx.title ||
        ctx.view?.title ||
        ctx.blockModel?.title ||
        ctx.model?.title ||
        ctx.schema?.title ||
        inputArgs.title ||
        inputArgs.params?.title,
      blockTitle:
        ctx.blockTitle ||
        ctx.block?.title ||
        ctx.blockModel?.schema?.title ||
        ctx.model?.schema?.title ||
        inputArgs.blockTitle ||
        inputArgs.params?.blockTitle,
      pageTitle:
        ctx.pageTitle ||
        ctx.view?.pageTitle ||
        inputArgs.pageTitle ||
        inputArgs.params?.pageTitle,
      menuTitle:
        ctx.menuTitle ||
        inputArgs.menuTitle ||
        inputArgs.params?.menuTitle,
      scope:
        ctx.scope ||
        ctx.blockScope ||
        inputArgs.scope ||
        inputArgs.blockScope ||
        inputArgs.params?.scope ||
        inputArgs.params?.blockScope,
      meetingScope:
        ctx.meetingScope ||
        inputArgs.meetingScope ||
        inputArgs.params?.meetingScope,
    };
  } catch {
    return {};
  }
};

const normalizeScope = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  const ascii = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (
    ["my", "mine", "personal", "me", "host", "attendee", "participant", "mymeetings", "my_meetings", "my-meetings"].includes(raw)
  ) return "my";
  if (raw.includes("my") && raw.includes("meeting")) return "my";
  if (ascii.includes("cua toi") || ascii.includes("ca nhan")) return "my";
  return "all";
};

const inferMeetingScope = (input = {}) => {
  const explicit = normalizeScope(input.meetingScope || input.scope || input.mode || input.blockMode);
  if (explicit === "my") return "my";
  const hints = [
    input.title,
    input.pageTitle,
    input.menuTitle,
    input.tabTitle,
    input.blockTitle,
    input.name,
    input.routeName,
    input.path,
    input.pathname,
  ].filter((item) => item !== undefined && item !== null && String(item).trim());
  return hints.some((hint) => normalizeScope(hint) === "my") ? "my" : MEETING_BLOCK_DEFAULT_SCOPE;
};

const RUNTIME_INPUT = getRuntimeInput();
const MEETING_SCOPE = inferMeetingScope(RUNTIME_INPUT);
const MEETING_VIEW_CONFIG_KEY = MEETING_SCOPE === "my" ? "myMeetings" : "allMeetings";
const MEETING_APP_BASE_PATH = normalizeAppPath(
  RUNTIME_INPUT.meetingAppBasePath ||
    RUNTIME_INPUT.meetingAppPath ||
    RUNTIME_INPUT.appBasePath ||
    RUNTIME_INPUT.appPath ||
    "/admin/jz7okazb1n5",
);
const MEETING_DETAIL_POPUP_UID =
  RUNTIME_INPUT.meetingDetailPopupUid || RUNTIME_INPUT.detailPopupUid || "d3b88171bf7";
const MEETING_CREATE_FORM_UID =
  RUNTIME_INPUT.meetingCreateFormUid || RUNTIME_INPUT.createFormUid || "1778f9b1d48";

function normalizeAppPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "/admin/jz7okazb1n5";
  try {
    const parsed = new URL(raw);
    return (parsed.pathname || "/admin/jz7okazb1n5").replace(/\/+$/, "");
  } catch {}
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return path.replace(/\/+$/, "") || "/admin/jz7okazb1n5";
}

const useNocoToken = () => {
  const result =
    theme && typeof theme.useToken === "function" ? theme.useToken() : null;
  return result?.token || FALLBACK_TOKEN;
};

const extractId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.length ? extractId(value[0]) : null;
  const raw = value && typeof value === "object" ? value.id || value._id : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const absoluteUrl = (pathname) => {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://law.dev.samset.net";
  return `${origin}${pathname}`;
};

const buildDefineProperties = (params) => {
  const defineProperties = {};
  Object.keys(params || {}).forEach((key) => {
    defineProperties[key] = {
      value: params[key],
      writable: true,
      enumerable: true,
      configurable: true,
    };
  });
  return defineProperties;
};

const buildMeetingCreateRoute = () => {
  const pathname = `${MEETING_APP_BASE_PATH}/view/${MEETING_CREATE_FORM_UID}`;
  return {
    uid: MEETING_CREATE_FORM_UID,
    pathname,
    url: absoluteUrl(pathname),
  };
};

const buildMeetingDetailRoute = (meetingId) => {
  const safeMeetingId = extractId(meetingId);
  if (!safeMeetingId) return null;
  const pathname = `${MEETING_APP_BASE_PATH}/view/${MEETING_DETAIL_POPUP_UID}/filterbytk/${encodeURIComponent(String(safeMeetingId))}`;
  return {
    uid: MEETING_DETAIL_POPUP_UID,
    recordId: safeMeetingId,
    pathname,
    url: absoluteUrl(pathname),
  };
};

const isSelectableUser = (record) => extractId(record?.id) !== 1;

const compact = (items) =>
  (items || [])
    .map((item) =>
      item === undefined || item === null ? "" : String(item).trim(),
    )
    .filter(Boolean);

const uniqueIds = (items) =>
  Array.from(new Set((items || []).map(extractId).filter(Boolean)));

const unwrapList = (res) => {
  const data = res?.data?.data ?? res?.data ?? [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
};


const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const stripHtml = (value) =>
  String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const isValidDate = (value) =>
  value instanceof Date && !Number.isNaN(value.getTime());

const parseDateText = (value) => {
  const text = String(value || "").trim();
  if (!text || text === "Invalid date") return null;

  const localMatch = text.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (localMatch) {
    const [, year, month, day, hour = "0", minute = "0", second = "0"] =
      localMatch;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
    return isValidDate(date) ? date : null;
  }

  const viMatch = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (viMatch) {
    const [, day, month, year, hour = "0", minute = "0", second = "0"] =
      viMatch;
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );
    return isValidDate(date) ? date : null;
  }

  const date = new Date(text);
  return isValidDate(date) ? date : null;
};

const toNativeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isValidDate(value) ? value : null;
  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return isValidDate(date) ? date : null;
  }
  if (value.$d) return isValidDate(value.$d) ? value.$d : null;
  if (typeof value === "string") return parseDateText(value);
  const date = new Date(value);
  return isValidDate(date) ? date : null;
};

const pad2 = (value) => String(value).padStart(2, "0");

const toDateTimeString = (value) => {
  const date = toNativeDate(value);
  if (!date) return null;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
};


const toDateInputValue = (value) => {
  const date = toNativeDate(value);
  if (!date) return "";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const toDatetimeLocalValue = (dateValue, timeValue) => {
  const date = toNativeDate(dateValue);
  if (!date) return "";
  const timeMatch = String(timeValue || "").match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const hour = timeMatch ? Number(timeMatch[1]) : date.getHours();
  const minute = timeMatch ? Number(timeMatch[2]) : date.getMinutes();
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(hour)}:${pad2(minute)}`;
};

const toDateStart = (value) => {
  const date = toNativeDate(value);
  if (!date) return null;
  const output = new Date(date);
  output.setHours(0, 0, 0, 0);
  return output;
};

const toDateEnd = (value) => {
  const date = toNativeDate(value);
  if (!date) return null;
  const output = new Date(date);
  output.setHours(23, 59, 59, 999);
  return output;
};

const inDateRange = (value, range) => {
  if (!Array.isArray(range) || !range[0] || !range[1]) return true;
  const date = toNativeDate(value);
  const start = toDateStart(range[0]);
  const end = toDateEnd(range[1]);
  if (!date || !start || !end) return false;
  return date >= start && date <= end;
};

const formatDate = (value, mode = "date") => {
  if (!value) return "-";
  const date = toNativeDate(value);
  if (!date) return String(value);
  if (mode === "datetime") {
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "-";
  if (typeof value === "string") {
    const match = value.match(/(\d{1,2}):(\d{2})/);
    if (match) return `${pad2(match[1])}:${match[2]}`;
  }
  const date = toNativeDate(value);
  if (!date) return String(value);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

const toTimeString = (value) => {
  if (typeof value === "string") {
    const match = value.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (match) return `${pad2(match[1])}:${match[2]}:${pad2(match[3] || 0)}`;
  }
  const date = toNativeDate(value);
  if (!date) return null;
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
};

const formatTimeRange = (start, end) =>
  end ? `${formatTime(start)} - ${formatTime(end)}` : formatTime(start);

const timestampValue = (value) => {
  const date = toNativeDate(value);
  return date ? date.getTime() : 0;
};

const isThisMonth = (value) => {
  const date = toNativeDate(value);
  if (!date) return false;
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

const isToday = (value) => {
  const date = toNativeDate(value);
  if (!date) return false;
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
};

const makeDateKey = (value) => {
  const date = toNativeDate(value);
  if (!date) return "No date";
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const statusTag = (status) => {
  const key = String(status || "scheduled").trim();
  const cfg = STATUS_CFG[key] || { label: key || "-", color: "default" };
  return React.createElement(
    Tag,
    { color: cfg.color, style: { marginInlineEnd: 0 } },
    cfg.label,
  );
};

const typeTag = (type) => {
  const key = String(type || "internal").trim();
  const cfg = TYPE_CFG[key] || { label: key || "-", color: "default" };
  return React.createElement(
    Tag,
    { color: cfg.color, style: { marginInlineEnd: 0 } },
    cfg.label,
  );
};

const attendanceTag = (status) => {
  const key = String(status || "pending").trim();
  const cfg = ATTENDANCE_CFG[key] || { label: key || "-", color: "default" };
  return React.createElement(
    Tag,
    { color: cfg.color, style: { marginInlineEnd: 0 } },
    cfg.label,
  );
};

const userLabel = (record) =>
  record?.nickname ||
  record?.displayName ||
  record?.username ||
  record?.name ||
  record?.email ||
  (record?.id ? `User #${record.id}` : "Unassigned");

const userInitial = (record) => {
  const label = userLabel(record);
  return label && label !== "Unassigned" ? label.charAt(0).toUpperCase() : "?";
};

const caseLabel = (record) =>
  compact([
    record?.caseCode || record?.projectCode || record?.code,
    record?.projectName || record?.caseName || record?.title || record?.name,
  ]).join(" - ") || (record?.id ? `Case #${record.id}` : "-");

const customerLabel = (record) =>
  record?.customerName ||
  record?.shortName ||
  record?.name ||
  record?.fullName ||
  record?.companyName ||
  (record?.id ? `Customer #${record.id}` : "");

const caseCustomerLabel = (record, customerMap = {}) => {
  const directCustomer = record?.customer || record?.customers;
  if (directCustomer && typeof directCustomer === "object") {
    const directLabel = customerLabel(directCustomer);
    if (directLabel) return directLabel;
  }
  const customerId = extractId(record?.customerId) || extractId(directCustomer);
  return customerLabel(customerMap[customerId]);
};

const caseOption = (record, customerMap = {}) => {
  const primary = caseLabel(record);
  const customer = caseCustomerLabel(record, customerMap);
  const searchText = compact([primary, customer]).join(" ");
  return {
    value: String(extractId(record?.id)),
    label: React.createElement(
      "div",
      { style: { display: "grid", gap: 2, minWidth: 0 } },
      React.createElement(
        "span",
        {
          style: {
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        },
        primary,
      ),
      customer
        ? React.createElement(
            "span",
            {
              style: {
                color: FALLBACK_TOKEN.colorTextSecondary,
                fontSize: FALLBACK_TOKEN.fontSizeSM,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            },
            customer,
          )
        : null,
    ),
    searchText,
  };
};

const taskLabel = (record) =>
  record?.title || record?.taskName || record?.name || (record?.id ? `Task #${record.id}` : "-");

const getResponseRecord = (res) => {
  const data = res?.data?.data || res?.data || res;
  return data?.user || data || null;
};

const parseJsonValue = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeViewMode = (value) => {
  if (value === "board" || value === "kanban") return "board";
  if (value === "card") return "board";
  return "table";
};

const normalizeColumnWidths = (value) => {
  const source = value && typeof value === "object" ? value : {};
  return Object.keys(DEFAULT_COLUMN_WIDTHS).reduce((acc, key) => {
    const width = Number(source[key]);
    acc[key] = Number.isFinite(width)
      ? Math.max(MIN_COLUMN_WIDTH, Math.round(width))
      : DEFAULT_COLUMN_WIDTHS[key];
    return acc;
  }, {});
};

const getUserViewConfig = (user) => {
  const root = parseJsonValue(user?.[USER_VIEW_CONFIG_FIELD]);
  if (!root) return null;
  const scoped =
    root[MEETING_VIEW_CONFIG_KEY] && typeof root[MEETING_VIEW_CONFIG_KEY] === "object"
      ? root[MEETING_VIEW_CONFIG_KEY]
      : null;
  return scoped || null;
};

const mergeUserViewConfig = (currentValue, nextView) => {
  const root = parseJsonValue(currentValue) || {};
  const currentScoped =
    root[MEETING_VIEW_CONFIG_KEY] && typeof root[MEETING_VIEW_CONFIG_KEY] === "object"
      ? root[MEETING_VIEW_CONFIG_KEY]
      : {};
  return {
    ...root,
    [MEETING_VIEW_CONFIG_KEY]: {
      ...currentScoped,
      ...nextView,
    },
  };
};

const getCurrentUserFromCtx = () => {
  try {
    return (
      ctx.currentUser ||
      ctx.user ||
      ctx.state?.currentUser ||
      ctx.app?.currentUser ||
      ctx.store?.getState?.()?.currentUser ||
      null
    );
  } catch {
    return null;
  }
};

const fetchCurrentUser = async () => {
  try {
    const existing = getCurrentUserFromCtx();
    if (existing) return getResponseRecord(existing) || existing;
    const res = await ctx.api.request({ url: "auth:check", method: "GET" });
    return getResponseRecord(res);
  } catch (error) {
    console.warn("[MeetingBlock] auth:check failed", error);
    return null;
  }
};

const fetchUserViewRecord = async (userId) => {
  const safeId = extractId(userId);
  if (!safeId) return null;
  try {
    const res = await ctx.api.request({
      url: `users:get?filterByTk=${safeId}`,
      method: "GET",
      params: { fields: `id,${USER_VIEW_CONFIG_FIELD}` },
    });
    return getResponseRecord(res);
  } catch (error) {
    console.warn("[MeetingBlock] load user view config failed", error);
    return null;
  }
};

const safeFetchList = async (url, params = {}, pageSize = LOOKUP_FETCH_LIMIT) => {
  try {
    const res = await ctx.api.request({
      url,
      method: "GET",
      params: {
        page: 1,
        pageSize,
        ...params,
      },
    });
    return unwrapList(res);
  } catch (error) {
    console.warn(`[MeetingBlock] ${url} failed`, error);
    return [];
  }
};

const fetchRowsByIds = async (url, ids, fields) => {
  const safeIds = uniqueIds(ids);
  if (!safeIds.length) return [];
  return safeFetchList(
    url,
    {
      fields,
      filter: JSON.stringify({ id: { $in: safeIds } }),
      sort: ["id"],
    },
    Math.max(safeIds.length, 50),
  );
};

const uniqueRowsById = (rows) => {
  const map = {};
  (rows || []).forEach((row) => {
    const id = extractId(row?.id);
    if (id) map[id] = row;
  });
  return Object.values(map);
};

const sortMeetingRows = (rows) =>
  [...(rows || [])].sort((a, b) => {
    const aDate = toNativeDate(a?.meetingDate)?.getTime() || 0;
    const bDate = toNativeDate(b?.meetingDate)?.getTime() || 0;
    if (aDate !== bDate) return bDate - aDate;
    return String(b?.startTime || "").localeCompare(String(a?.startTime || ""));
  });

const fetchMeetingRowsByScope = async (scope, currentUserId) => {
  const baseParams = {
    fields: MEETING_FIELDS,
    sort: ["-meetingDate", "-startTime", "-createdAt"],
  };
  if (scope !== "my") {
    return safeFetchList("meetings:list", baseParams, MEETING_FETCH_LIMIT);
  }
  if (!currentUserId) return [];

  const [hostRows, attendeeRowsForUser] = await Promise.all([
    safeFetchList(
      "meetings:list",
      {
        ...baseParams,
        filter: JSON.stringify({ hostId: { $eq: currentUserId } }),
      },
      MEETING_FETCH_LIMIT,
    ),
    safeFetchList(
      "meetingAttendees:list",
      {
        fields: ATTENDEE_FIELDS,
        filter: JSON.stringify({ userId: { $eq: currentUserId } }),
        sort: ["meetingId", "isHost", "createdAt"],
      },
      LOOKUP_FETCH_LIMIT,
    ),
  ]);

  const attendeeMeetingIds = uniqueIds(attendeeRowsForUser.map((row) => row.meetingId));
  const attendeeMeetingRows = attendeeMeetingIds.length
    ? await safeFetchList(
        "meetings:list",
        {
          ...baseParams,
          filter: JSON.stringify({ id: { $in: attendeeMeetingIds } }),
        },
        Math.max(attendeeMeetingIds.length, 50),
      )
    : [];

  return sortMeetingRows(uniqueRowsById([...hostRows, ...attendeeMeetingRows]));
};

const buildMapById = (items) => {
  const map = {};
  (items || []).forEach((item) => {
    const id = extractId(item?.id);
    if (id) map[id] = item;
  });
  return map;
};

const emitMeetingChanged = (payload = {}) => {
  const detail = {
    ...payload,
    changedAt: Date.now(),
  };
  try {
    ctx.eventBus?.emit?.(MEETING_CHANGED_EVENT, detail);
  } catch {}
  try {
    ctx.view?.emit?.(MEETING_CHANGED_EVENT, detail);
  } catch {}
};

const normalizeColumnKeys = (keys) => {
  const available = new Set(COLUMN_OPTIONS.map((item) => item.value));
  const incoming = Array.isArray(keys) ? keys : DEFAULT_VISIBLE_COLUMNS;
  const withLocked = Array.from(new Set(["title", ...incoming]));
  return withLocked.filter((key) => available.has(key));
};


const InfoBox = ({ label, value }) => {
  const token = useNocoToken();
  return React.createElement(
    "div",
    {
      style: {
        border: `1px solid ${token.colorSplit}`,
        borderRadius: token.borderRadius,
        padding: token.paddingSM,
        background: token.colorBgContainer,
        minWidth: 0,
      },
    },
    React.createElement(
      Text,
      { type: "secondary", style: { display: "block", fontSize: token.fontSizeSM } },
      label,
    ),
    React.createElement(
      Text,
      {
        style: {
          display: "block",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        },
      },
      value || "-",
    ),
  );
};

const MeetingBlock = () => {
  const token = useNocoToken();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [cases, setCases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [filters, setFilters] = useState({
    caseIds: [],
    attendeeIds: [],
    statuses: [],
    types: [],
    keyword: "",
    dateRange: null,
  });
  const [viewMode, setViewMode] = useState("table");
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);
  const [draggingMeetingKey, setDraggingMeetingKey] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [deletingMeetingIds, setDeletingMeetingIds] = useState([]);

  const usersById = useMemo(() => buildMapById(users), [users]);
  const selectableUsers = useMemo(
    () => users.filter(isSelectableUser),
    [users],
  );
  const casesById = useMemo(() => buildMapById(cases), [cases]);
  const customersById = useMemo(() => buildMapById(customers), [customers]);
  const tasksById = useMemo(() => buildMapById(tasks), [tasks]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const user = await fetchCurrentUser();
      const currentUserId = extractId(user?.id ?? user);
      const meetingRows = await fetchMeetingRowsByScope(MEETING_SCOPE, currentUserId);
      const scopedMeetingIds = uniqueIds(meetingRows.map((row) => row.id));
      const scopedMeetingFilter =
        MEETING_SCOPE === "my" && scopedMeetingIds.length
          ? JSON.stringify({ meetingId: { $in: scopedMeetingIds } })
          : null;
      const shouldSkipScopedChildren = MEETING_SCOPE === "my" && !scopedMeetingIds.length;

      const [attendeeRows, meetingTaskRows, userRows, caseRows] = await Promise.all([
        shouldSkipScopedChildren
          ? Promise.resolve([])
          : safeFetchList(
              "meetingAttendees:list",
              {
                fields: ATTENDEE_FIELDS,
                sort: ["meetingId", "isHost", "createdAt"],
                ...(scopedMeetingFilter ? { filter: scopedMeetingFilter } : {}),
              },
              LOOKUP_FETCH_LIMIT,
            ),
        shouldSkipScopedChildren
          ? Promise.resolve([])
          : safeFetchList(
              "meetingTasks:list",
              {
                fields: MEETING_TASK_FIELDS,
                sort: ["meetingId", "addedAt"],
                ...(scopedMeetingFilter ? { filter: scopedMeetingFilter } : {}),
              },
              LOOKUP_FETCH_LIMIT,
            ),
        safeFetchList(
          "users:list",
          {
            fields: USER_FIELDS,
            sort: ["nickname", "username"],
          },
          LOOKUP_FETCH_LIMIT,
        ),
        safeFetchList(
          "projects:list",
          {
            fields: PROJECT_FIELDS,
            sort: ["-createdAt"],
          },
          LOOKUP_FETCH_LIMIT,
        ),
      ]);

      const taskIds = uniqueIds(meetingTaskRows.map((row) => row.taskId));
      const customerIds = uniqueIds(
        caseRows.map((row) => row.customerId || row.customer || row.customers),
      );
      const [taskRows, customerRows, userViewRecord] = await Promise.all([
        fetchRowsByIds("tasks:list", taskIds, TASK_FIELDS),
        fetchRowsByIds("customers:list", customerIds, CUSTOMER_FIELDS),
        fetchUserViewRecord(user?.id ?? user),
      ]);

      const attendeesByMeeting = {};
      attendeeRows.forEach((row) => {
        const meetingId = extractId(row.meetingId);
        if (!meetingId) return;
        if (!attendeesByMeeting[meetingId]) attendeesByMeeting[meetingId] = [];
        attendeesByMeeting[meetingId].push(row);
      });

      const tasksByMeeting = {};
      meetingTaskRows.forEach((row) => {
        const meetingId = extractId(row.meetingId);
        if (!meetingId) return;
        if (!tasksByMeeting[meetingId]) tasksByMeeting[meetingId] = [];
        tasksByMeeting[meetingId].push(row);
      });

      const enriched = meetingRows
        .map((meeting) => {
          const id = extractId(meeting.id);
          const meetingAttendees = attendeesByMeeting[id] || [];
          const meetingTaskLinks = tasksByMeeting[id] || [];
          return {
            ...meeting,
            key: String(id),
            _attendees: meetingAttendees,
            _linkedTasks: meetingTaskLinks,
            _participantIds: uniqueIds([
              meeting.hostId,
              ...meetingAttendees.map((row) => row.userId),
            ]),
          };
        })
        .filter((meeting) => {
          if (MEETING_SCOPE !== "my") return true;
          if (!currentUserId) return false;
          return (
            extractId(meeting.hostId) === currentUserId ||
            meeting._attendees.some((row) => extractId(row.userId) === currentUserId)
          );
        });

      const resolvedUser = userViewRecord ? { ...user, ...userViewRecord } : user;
      const userViewConfig = getUserViewConfig(resolvedUser);
      if (userViewConfig?.visibleColumns || userViewConfig?.visibleColumnKeys) {
        setVisibleColumns(
          normalizeColumnKeys(
            userViewConfig.visibleColumns || userViewConfig.visibleColumnKeys,
          ),
        );
      }
      if (userViewConfig?.viewMode) {
        setViewMode(normalizeViewMode(userViewConfig.viewMode));
      }
      if (userViewConfig?.columnWidths) {
        setColumnWidths(normalizeColumnWidths(userViewConfig.columnWidths));
      }

      setCurrentUser(resolvedUser);
      setUsers(userRows);
      setCases(caseRows);
      setCustomers(customerRows);
      setTasks(taskRows);
      setRows(enriched);
    } catch (error) {
      console.error("[MeetingBlock] reload failed", error);
      message.error(error?.message || "Could not load meetings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const engine = ctx.engine || ctx.app;
    if (!engine) return undefined;
    if (!engine.__nocobaseReloaders) engine.__nocobaseReloaders = new Set();
    engine.__nocobaseReloaders.add(reload);
    return () => {
      try { engine.__nocobaseReloaders.delete(reload); } catch {}
    };
  }, [reload]);

  useEffect(() => {
    const handler = () => reload();
    try { ctx.on?.(MEETING_CHANGED_EVENT, handler); } catch {}
    return () => {
      try { ctx.off?.(MEETING_CHANGED_EVENT, handler); } catch {}
    };
  }, [reload]);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () =>
    setFilters({
      caseIds: [],
      attendeeIds: [],
      statuses: [],
      types: [],
      keyword: "",
      dateRange: null,
    });

  const getViewConfig = (overrides = {}) => ({
    visibleColumns,
    viewMode,
    columnWidths,
    ...overrides,
  });

  const saveViewConfig = async (nextView) => {
    const userId = extractId(currentUser?.id ?? currentUser);
    if (!userId) return;
    const currentValue =
      typeof currentUser === "object"
        ? currentUser[USER_VIEW_CONFIG_FIELD]
        : null;
    const nextValue = mergeUserViewConfig(currentValue, nextView);
    setCurrentUser((prev) =>
      prev ? { ...prev, [USER_VIEW_CONFIG_FIELD]: nextValue } : prev,
    );
    try {
      await ctx.api.request({
        url: `users:update?filterByTk=${userId}`,
        method: "POST",
        data: { [USER_VIEW_CONFIG_FIELD]: nextValue },
      });
    } catch (error) {
      console.warn("[MeetingBlock] save user view config failed", error);
      message.warning("Could not save meeting view for this user.");
    }
  };

  const setVisibleColumnsValue = (value) => {
    const nextColumns = normalizeColumnKeys(value);
    setVisibleColumns(nextColumns);
    saveViewConfig(getViewConfig({ visibleColumns: nextColumns }));
  };

  const setViewModeValue = (value) => {
    const nextMode = normalizeViewMode(value);
    setViewMode(nextMode);
    saveViewConfig(getViewConfig({ viewMode: nextMode }));
  };

  const startColumnResize = (field, event) => {
    if (!field || !event) return;
    event.preventDefault();
    event.stopPropagation();
    const ownerDocument = event.currentTarget?.ownerDocument;
    const ownerWindow = ownerDocument?.defaultView;
    if (!ownerWindow) return;
    const bodyStyle = ownerDocument?.body?.style;
    const previousCursor = bodyStyle?.cursor;
    const previousUserSelect = bodyStyle?.userSelect;
    if (bodyStyle) {
      bodyStyle.cursor = "col-resize";
      bodyStyle.userSelect = "none";
    }
    const startX = event.clientX || 0;
    const startWidth = Number(
      columnWidths[field] || DEFAULT_COLUMN_WIDTHS[field] || MIN_COLUMN_WIDTH,
    );
    let latestWidth = startWidth;
    const handleMove = (moveEvent) => {
      latestWidth = Math.max(
        MIN_COLUMN_WIDTH,
        Math.round(startWidth + (moveEvent.clientX || 0) - startX),
      );
      setColumnWidths((prev) => ({ ...prev, [field]: latestWidth }));
    };
    const handleUp = () => {
      const nextWidths = { ...columnWidths, [field]: latestWidth };
      setColumnWidths(nextWidths);
      saveViewConfig(getViewConfig({ columnWidths: nextWidths }));
      if (bodyStyle) {
        bodyStyle.cursor = previousCursor || "";
        bodyStyle.userSelect = previousUserSelect || "";
      }
      ownerWindow.removeEventListener("pointermove", handleMove);
      ownerWindow.removeEventListener("pointerup", handleUp);
      ownerWindow.removeEventListener("pointercancel", handleUp);
    };
    try {
      event.currentTarget?.setPointerCapture?.(event.pointerId);
    } catch {}
    ownerWindow.addEventListener("pointermove", handleMove);
    ownerWindow.addEventListener("pointerup", handleUp);
    ownerWindow.addEventListener("pointercancel", handleUp);
  };

  const resizableTitle = (field, label) =>
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          minWidth: 0,
        },
      },
      React.createElement(
        "span",
        {
          style: {
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        },
        label,
      ),
      React.createElement("span", {
        onPointerDown: (event) => startColumnResize(field, event),
        title: "Resize column",
        style: {
          flex: "0 0 auto",
          width: 8,
          height: 24,
          borderLeft: `4px solid ${token.colorSplit}`,
          cursor: "col-resize",
          opacity: 0.9,
        },
      }),
    );

  const updateMeetingStatus = async (row, status) => {
    const meetingId = extractId(row?.id);
    if (!meetingId || !status || row.status === status) return;
    setRows((prev) =>
      prev.map((item) =>
        extractId(item.id) === meetingId ? { ...item, status } : item,
      ),
    );
    try {
      await ctx.api.request({
        url: `meetings:update?filterByTk=${meetingId}`,
        method: "POST",
        data: { status },
      });
      emitMeetingChanged({ action: "status_updated", meetingId, status });
    } catch (error) {
      console.error("[MeetingBlock] update meeting status failed", error);
      message.error(error?.message || "Could not update meeting status.");
      reload();
    }
  };

  const caseOptions = cases.map((item) => ({
    ...caseOption(item, customersById),
  }));

  const userOptions = selectableUsers.map((item) => ({
    value: String(extractId(item.id)),
    label: userLabel(item),
  }));

  const filteredRows = useMemo(() => {
    const keyword = normalizeText(filters.keyword);
    const caseFilter = new Set((filters.caseIds || []).map(String));
    const attendeeFilter = new Set((filters.attendeeIds || []).map(String));
    const statusFilter = new Set(filters.statuses || []);
    const typeFilter = new Set(filters.types || []);

    return rows.filter((row) => {
      if (caseFilter.size && !caseFilter.has(String(extractId(row.caseId)))) return false;
      if (statusFilter.size && !statusFilter.has(String(row.status || ""))) return false;
      if (typeFilter.size && !typeFilter.has(String(row.type || ""))) return false;
      if (!inDateRange(row.meetingDate, filters.dateRange)) return false;
      if (
        attendeeFilter.size &&
        !row._participantIds.some((id) => attendeeFilter.has(String(id)))
      )
        return false;

      if (keyword) {
        const haystack = normalizeText(
          compact([
            row.title,
            row.location,
            stripHtml(row.description),
            caseLabel(casesById[extractId(row.caseId)]),
            caseCustomerLabel(casesById[extractId(row.caseId)], customersById),
            userLabel(usersById[extractId(row.hostId)]),
          ]).join(" "),
        );
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    });
  }, [casesById, customersById, filters, rows, usersById]);

  const scheduledCount = rows.filter((row) => row.status === "scheduled").length;
  const completedThisMonth = rows.filter(
    (row) => row.status === "completed" && isThisMonth(row.meetingDate),
  ).length;

  const openMeetingCreate = async () => {
    if (!MEETING_CREATE_FORM_UID) {
      message.error("Meeting create view is not configured.");
      return;
    }
    const route = buildMeetingCreateRoute();
    const sourceBlockUid =
      ctx.blockModel?.uid ||
      ctx.model?.uid ||
      ctx.block?.uid ||
      ctx.view?.uid ||
      null;
    const params = {
      sourceBlockUid,
      targetBlockUid: sourceBlockUid,
      collectionName: "meetings",
      recordType: "meeting",
      pathname: route.pathname,
      linkedUrl: route.url,
    };
    const openOptions = {
      mode: "dialog",
      title: "Create meeting",
      size: "large",
      navigation: false,
      ...params,
      inputArgs: params,
      params,
      defineProperties: buildDefineProperties(params),
    };

    if (typeof ctx.openView === "function") {
      try {
        await ctx.openView(route.uid, openOptions);
        return;
      } catch (error) {
        console.error("[MeetingBlock] open create form failed", error);
      }
    }

    try {
      window.open(route.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("[MeetingBlock] open create route failed", error);
      message.error("Could not open create form.");
    }
  };

  const openMeetingDetail = async (row) => {
    const meetingId = extractId(row?.id);
    if (!meetingId) {
      message.warning("Could not resolve meeting id.");
      return;
    }
    const route = buildMeetingDetailRoute(meetingId);
    if (!route) {
      message.error("Meeting detail view is not configured.");
      return;
    }
    const params = {
      filterByTk: route.recordId,
      filterbytk: route.recordId,
      id: route.recordId,
      recordId: route.recordId,
      meetingId: route.recordId,
      sourceRecordId: route.recordId,
      sourceMeetingId: route.recordId,
      collectionName: "meetings",
      recordType: "meeting",
      pathname: route.pathname,
      linkedUrl: route.url,
    };
    const openOptions = {
      mode: "dialog",
      title: row?.title || "Meeting detail",
      size: "large",
      navigation: false,
      ...params,
      inputArgs: params,
      params,
      defineProperties: buildDefineProperties(params),
    };

    if (typeof ctx.openView === "function") {
      try {
        await ctx.openView(route.uid, openOptions);
        return;
      } catch (error) {
        console.error("[MeetingBlock] open meeting detail popup failed", error);
      }
    }

    try {
      window.open(route.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("[MeetingBlock] open meeting detail route failed", error);
      message.error(error?.message || "Could not open meeting detail.");
    }
  };

  const deleteMeeting = async (row) => {
    const meetingId = extractId(row?.id);
    if (!meetingId) {
      message.warning("Could not resolve meeting id.");
      return;
    }

    const meetingKey = String(meetingId);
    const previousRows = rows;
    setDeletingMeetingIds((prev) => Array.from(new Set([...prev, meetingKey])));
    setRows((prev) => prev.filter((item) => extractId(item.id) !== meetingId));

    try {
      const [attendeeRows, meetingTaskRows] = await Promise.all([
        safeFetchList(
          "meetingAttendees:list",
          {
            fields: "id,meetingId",
            filter: JSON.stringify({ meetingId: { $eq: meetingId } }),
          },
          LOOKUP_FETCH_LIMIT,
        ),
        safeFetchList(
          "meetingTasks:list",
          {
            fields: "id,meetingId",
            filter: JSON.stringify({ meetingId: { $eq: meetingId } }),
          },
          LOOKUP_FETCH_LIMIT,
        ),
      ]);

      for (const attendee of attendeeRows) {
        const attendeeId = extractId(attendee?.id);
        if (!attendeeId) continue;
        await ctx.api.request({
          url: "meetingAttendees:destroy",
          method: "POST",
          params: { filterByTk: attendeeId },
        });
      }

      for (const meetingTask of meetingTaskRows) {
        const meetingTaskId = extractId(meetingTask?.id);
        if (!meetingTaskId) continue;
        await ctx.api.request({
          url: "meetingTasks:destroy",
          method: "POST",
          params: { filterByTk: meetingTaskId },
        });
      }

      await ctx.api.request({
        url: "meetings:destroy",
        method: "POST",
        params: { filterByTk: meetingId },
      });
      emitMeetingChanged({ action: "deleted", meetingId });
      message.success("Meeting deleted.");
      reload();
    } catch (error) {
      console.error("[MeetingBlock] delete meeting failed", error);
      setRows(previousRows);
      message.error(error?.message || "Could not delete meeting.");
      reload();
    } finally {
      setDeletingMeetingIds((prev) => prev.filter((id) => id !== meetingKey));
    }
  };

  const confirmDeleteMeeting = (row) => {
    const title = row?.title || "this meeting";
    const onOk = () => deleteMeeting(row);
    if (Modal && typeof Modal.confirm === "function") {
      Modal.confirm({
        title: `Delete "${title}"?`,
        content: "This action cannot be undone.",
        okText: "Delete",
        okType: "danger",
        cancelText: "Cancel",
        onOk,
      });
      return;
    }
    if (window.confirm(`Delete "${title}"?\nThis action cannot be undone.`)) {
      onOk();
    }
  };

  const renderMeetingActions = (row) => {
    const meetingId = extractId(row?.id);
    const deleting = deletingMeetingIds.includes(String(meetingId));
    return React.createElement(
      Space,
      { size: 4 },
      React.createElement(
        Button,
        {
          type: "link",
          danger: true,
          size: "small",
          loading: deleting,
          disabled: deleting,
          onClick: (event) => {
            event?.stopPropagation?.();
            confirmDeleteMeeting(row);
          },
          onPointerDown: (event) => event?.stopPropagation?.(),
          onDragStart: (event) => event?.stopPropagation?.(),
        },
        "Delete",
      ),
    );
  };

  const renderMeetingTitle = (row) =>
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gap: 4,
          minWidth: 0,
          maxWidth: "100%",
          alignContent: "center",
          overflow: "hidden",
        },
      },
      React.createElement(
        Button,
        {
          type: "link",
          onClick: () => openMeetingDetail(row),
          style: {
            padding: 0,
            height: "auto",
            textAlign: "left",
            justifyContent: "flex-start",
            fontWeight: 500,
            lineHeight: 1.35,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
            display: "block",
          },
        },
        row.title || "Meeting",
      ),
      React.createElement(
        Space,
        { size: 6, wrap: true },
        typeTag(row.type),
      ),
    );

  const tableColumns = useMemo(() => {
    const withCellClip = (column) => ({
      ...column,
      onCell: () => ({
        style: {
          minWidth: 0,
          overflow: "hidden",
          padding: "8px 10px",
          verticalAlign: "middle",
        },
      }),
    });
    const all = {
      title: {
        title: resizableTitle("title", "Title"),
        dataIndex: "title",
        width: columnWidths.title,
        fixed: "left",
        render: (_, row) => renderMeetingTitle(row),
      },
      status: {
        title: resizableTitle("status", "Status"),
        dataIndex: "status",
        width: columnWidths.status,
        render: statusTag,
      },
      meetingDate: {
        title: resizableTitle("meetingDate", "Date"),
        dataIndex: "meetingDate",
        width: columnWidths.meetingDate,
        render: (value) =>
          React.createElement(
            Text,
            { type: isToday(value) ? "warning" : undefined },
            formatDate(value),
          ),
      },
      time: {
        title: resizableTitle("time", "Time"),
        key: "time",
        width: columnWidths.time,
        render: (_, row) =>
          React.createElement(
            Text,
            { style: { display: "block", maxWidth: "100%" }, ellipsis: true },
            formatTimeRange(row.startTime, row.endTime),
          ),
      },
      host: {
        title: resizableTitle("host", "Host"),
        dataIndex: "hostId",
        width: columnWidths.host,
        render: (value) => {
          const user = usersById[extractId(value)];
          return React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
                maxWidth: "100%",
                overflow: "hidden",
              },
            },
            React.createElement(Avatar, { size: 22 }, userInitial(user)),
            React.createElement(
              Text,
              {
                ellipsis: true,
                style: { minWidth: 0, flex: "1 1 auto" },
              },
              userLabel(user),
            ),
          );
        },
      },
      attendees: {
        title: resizableTitle("attendees", "Attendees"),
        key: "attendees",
        width: columnWidths.attendees,
        render: (_, row) =>
          React.createElement(
            "div",
            { style: { maxWidth: "100%", overflow: "hidden" } },
            React.createElement(Avatar.Group, { maxCount: 3, size: "small" },
              row._participantIds.map((id) => {
                const user = usersById[id];
                return React.createElement(
                  Tooltip,
                  { key: id, title: userLabel(user) },
                  React.createElement(Avatar, null, userInitial(user)),
                );
              }),
            ),
          ),
      },
      case: {
        title: resizableTitle("case", "Case"),
        dataIndex: "caseId",
        width: columnWidths.case,
        render: (value) => {
          const caseRecord = casesById[extractId(value)];
          const customer = caseCustomerLabel(caseRecord, customersById);
          return React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gap: 2,
                minWidth: 0,
                maxWidth: "100%",
                overflow: "hidden",
              },
            },
            React.createElement(
              Text,
              { ellipsis: true, style: { display: "block", maxWidth: "100%" } },
              caseLabel(caseRecord),
            ),
            customer
              ? React.createElement(
                  Text,
                  {
                    type: "secondary",
                    style: {
                      display: "block",
                      maxWidth: "100%",
                      fontSize: token.fontSizeSM,
                    },
                    ellipsis: true,
                  },
                  customer,
                )
              : null,
          );
        },
      },
      location: {
        title: resizableTitle("location", "Location"),
        dataIndex: "location",
        width: columnWidths.location,
        render: (value) =>
          React.createElement(
            Text,
            { ellipsis: true, style: { display: "block", maxWidth: "100%" } },
            value || "-",
          ),
      },
      updatedAt: {
        title: resizableTitle("updatedAt", "Updated"),
        dataIndex: "updatedAt",
        width: columnWidths.updatedAt,
        render: (value) => formatDate(value, "datetime"),
      },
      actions: {
        title: "Actions",
        key: "actions",
        width: 110,
        fixed: "right",
        render: (_, row) => renderMeetingActions(row),
      },
    };
    return [
      ...normalizeColumnKeys(visibleColumns)
        .map((key) => all[key])
        .filter(Boolean),
      all.actions,
    ]
      .map(withCellClip);
  }, [casesById, columnWidths, customersById, deletingMeetingIds, rows, usersById, visibleColumns]);

  const columnConfig = React.createElement(
    "div",
    { style: { display: "grid", gap: token.marginSM, width: 260 } },
    React.createElement(Segmented, {
      block: true,
      value: viewMode,
      options: [
        { label: "Table", value: "table" },
        { label: "Kanban Board", value: "board" },
      ],
      onChange: setViewModeValue,
    }),
    React.createElement(
      Checkbox.Group,
      {
        value: visibleColumns,
        onChange: setVisibleColumnsValue,
        style: { display: "grid", gap: 6 },
      },
      COLUMN_OPTIONS.map((column) =>
        React.createElement(
          Checkbox,
          {
            key: column.value,
            value: column.value,
            disabled: column.locked,
          },
          column.label,
        ),
      ),
    ),
  );

  const filterControlStyle = {
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
  };

  const filterGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: token.marginXS,
    alignItems: "center",
    minWidth: 0,
  };

  const filterBar = React.createElement(
    "div",
    {
      style: {
        display: "grid",
        gap: token.marginXS,
        padding: token.paddingSM,
        borderBottom: `1px solid ${token.colorSplit}`,
        background: token.colorBgContainer,
        overflow: "hidden",
      },
    },
    React.createElement(
      "div",
      { style: filterGridStyle },
      React.createElement(Select, {
        mode: "multiple",
        allowClear: true,
        showSearch: true,
        maxTagCount: "responsive",
        optionFilterProp: "searchText",
        value: filters.caseIds,
        placeholder: "Case",
        options: caseOptions,
        onChange: (value) => setFilter("caseIds", value),
        style: filterControlStyle,
      }),
      React.createElement(Select, {
        mode: "multiple",
        allowClear: true,
        showSearch: true,
        maxTagCount: "responsive",
        optionFilterProp: "label",
        value: filters.attendeeIds,
        placeholder: "Attendee",
        options: userOptions,
        onChange: (value) => setFilter("attendeeIds", value),
        style: filterControlStyle,
      }),
      React.createElement(Select, {
        mode: "multiple",
        allowClear: true,
        maxTagCount: "responsive",
        value: filters.statuses,
        placeholder: "Status",
        options: STATUS_OPTIONS,
        onChange: (value) => setFilter("statuses", value),
        style: filterControlStyle,
      }),
      React.createElement(Select, {
        mode: "multiple",
        allowClear: true,
        maxTagCount: "responsive",
        value: filters.types,
        placeholder: "Type",
        options: TYPE_OPTIONS,
        onChange: (value) => setFilter("types", value),
        style: filterControlStyle,
      }),
    ),
    React.createElement(
      "div",
      { style: filterGridStyle },
      React.createElement(Input.Search, {
        allowClear: true,
        value: filters.keyword,
        placeholder: "Search title, case, location...",
        onChange: (event) => setFilter("keyword", event.target.value),
        onSearch: (value) => setFilter("keyword", value),
        style: filterControlStyle,
      }),
      RangePicker
        ? React.createElement(RangePicker, {
            allowClear: true,
            value: filters.dateRange,
            format: "DD/MM/YYYY",
            placeholder: ["Start date", "End date"],
            onChange: (value) => setFilter("dateRange", value || null),
            style: filterControlStyle,
          })
        : null,
      React.createElement(
        Popover,
        {
          trigger: "click",
          placement: "bottomRight",
          title: "View config",
          content: columnConfig,
        },
        React.createElement(Button, { style: filterControlStyle }, "View config"),
      ),
      React.createElement(Button, { onClick: resetFilters, style: filterControlStyle }, "Reset"),
    ),
  );

  const renderTable = () =>
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflowX: "auto",
        },
      },
      React.createElement(Table, {
        size: "small",
        rowKey: "key",
        columns: tableColumns,
        dataSource: filteredRows,
        loading,
        tableLayout: "fixed",
        pagination: { pageSize: 20, showSizeChanger: false },
        scroll: {
          x: normalizeColumnKeys(visibleColumns).reduce(
            (sum, key) =>
              sum + (Number(columnWidths[key]) || DEFAULT_COLUMN_WIDTHS[key] || 160),
            0,
          ) + 110,
        },
      }),
    );

  const groupedCards = useMemo(() => {
    const map = {};
    filteredRows.forEach((row) => {
      const key = makeDateKey(row.meetingDate);
      if (!map[key]) map[key] = [];
      map[key].push(row);
    });
    return Object.entries(map)
      .sort(([a], [b]) => timestampValue(a) - timestampValue(b))
      .map(([key, items]) => ({ key, items }));
  }, [filteredRows]);

  const renderCardView = () =>
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gap: token.marginSM,
          padding: token.paddingSM,
          background: token.colorBgLayout || token.colorFillAlter,
        },
      },
      groupedCards.map((group) =>
        React.createElement(
          "section",
          {
            key: group.key,
            style: {
              display: "grid",
              gap: token.marginXS,
            },
          },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              },
            },
            React.createElement(Text, { strong: true }, group.key === "No date" ? "No date" : formatDate(group.key)),
            React.createElement(Text, { type: "secondary" }, `${group.items.length} meetings`),
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: token.marginSM,
              },
            },
            group.items.map((row) => {
              const host = usersById[extractId(row.hostId)];
              const caseRecord = casesById[extractId(row.caseId)];
              return React.createElement(
                Card,
                {
                  key: row.key,
                  size: "small",
                  hoverable: true,
                  onClick: () => openMeetingDetail(row),
                  bodyStyle: { display: "grid", gap: 8 },
                },
                React.createElement(
                  Space,
                  { size: 6, wrap: true },
                  statusTag(row.status),
                  typeTag(row.type),
                ),
                React.createElement(Text, { strong: true }, row.title || "Meeting"),
                React.createElement(
                  Text,
                  { type: "secondary" },
                  compact([
                    formatTimeRange(row.startTime, row.endTime),
                    row.location,
                  ]).join(" · ") || "-",
                ),
                React.createElement(
                  Text,
                  { type: "secondary" },
                  compact([`Host: ${userLabel(host)}`, caseLabel(caseRecord)]).join(" · "),
                ),
                React.createElement(
                  "div",
                  { style: { display: "flex", justifyContent: "flex-end" } },
                  renderMeetingActions(row),
                ),
              );
            }),
          ),
        ),
      ),
    );

  const boardGroups = useMemo(() => {
    const map = {};
    STATUS_OPTIONS.forEach((item) => {
      map[item.value] = [];
    });
    filteredRows.forEach((row) => {
      const key = STATUS_CFG[row.status] ? row.status : "scheduled";
      if (!map[key]) map[key] = [];
      map[key].push(row);
    });
    return STATUS_OPTIONS.map((item) => ({
      ...item,
      items: map[item.value] || [],
    }));
  }, [filteredRows]);

  const renderBoardCard = (row) => {
    const host = usersById[extractId(row.hostId)];
    const caseRecord = casesById[extractId(row.caseId)];
    const customer = caseCustomerLabel(caseRecord, customersById);
    return React.createElement(
      Card,
      {
        key: row.key,
        size: "small",
        hoverable: true,
        draggable: true,
        onDragStart: (event) => {
          event.dataTransfer?.setData?.("text/plain", String(extractId(row.id)));
          setDraggingMeetingKey(String(extractId(row.id)));
        },
        onDragEnd: () => {
          setDraggingMeetingKey(null);
          setDragOverStatus(null);
        },
        onClick: () => openMeetingDetail(row),
        bodyStyle: { display: "grid", gap: 8, padding: token.paddingSM },
        style: {
          cursor: "grab",
          opacity: draggingMeetingKey === String(extractId(row.id)) ? 0.55 : 1,
        },
      },
      React.createElement(
        "div",
        { style: { display: "grid", gap: 4, minWidth: 0 } },
        React.createElement(
          Text,
          { strong: true, style: { lineHeight: 1.35 } },
          row.title || "Meeting",
        ),
        React.createElement(
          Space,
          { size: 4, wrap: true },
          typeTag(row.type),
        ),
      ),
      React.createElement(
        Text,
        { type: "secondary", style: { fontSize: token.fontSizeSM } },
        compact([
          formatDate(row.meetingDate),
          formatTimeRange(row.startTime, row.endTime),
        ]).join(" - "),
      ),
      React.createElement(
        Text,
        { type: "secondary", style: { fontSize: token.fontSizeSM } },
        compact([caseLabel(caseRecord), customer]).join(" - ") || "-",
      ),
      React.createElement(
        Space,
        { size: 6 },
        React.createElement(Avatar, { size: 20 }, userInitial(host)),
        React.createElement(
          Text,
          { type: "secondary", style: { fontSize: token.fontSizeSM } },
          userLabel(host),
        ),
      ),
      React.createElement(
        "div",
        { style: { display: "flex", justifyContent: "flex-end" } },
        renderMeetingActions(row),
      ),
    );
  };

  const renderBoardView = () =>
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          gap: token.marginSM,
          padding: token.paddingSM,
          background: token.colorBgLayout || token.colorFillAlter,
          overflowX: "auto",
          minHeight: 420,
        },
      },
      boardGroups.map((group) =>
        React.createElement(
          "section",
          {
            key: group.value,
            onDragOver: (event) => {
              event.preventDefault();
              setDragOverStatus(group.value);
            },
            onDragLeave: () => setDragOverStatus(null),
            onDrop: (event) => {
              event.preventDefault();
              const meetingId =
                event.dataTransfer?.getData?.("text/plain") || draggingMeetingKey;
              const row = filteredRows.find(
                (item) => String(extractId(item.id)) === String(meetingId),
              );
              setDragOverStatus(null);
              setDraggingMeetingKey(null);
              updateMeetingStatus(row, group.value);
            },
            style: {
              flex: "0 0 300px",
              minWidth: 300,
              maxWidth: 340,
              display: "grid",
              gap: token.marginXS,
              alignContent: "start",
              border: `1px solid ${
                dragOverStatus === group.value ? token.colorPrimary : token.colorSplit
              }`,
              borderRadius: token.borderRadius,
              background: token.colorBgContainer,
              padding: token.paddingSM,
            },
          },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: token.paddingXS,
                borderBottom: `1px solid ${token.colorSplit}`,
              },
            },
            React.createElement(Text, { strong: true }, group.label),
            React.createElement(Tag, null, `${group.items.length}`),
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gap: token.marginXS,
                maxHeight: 560,
                overflowY: "auto",
                paddingRight: 2,
              },
            },
            group.items.length
              ? group.items.map(renderBoardCard)
              : React.createElement(Empty, {
                  image: Empty.PRESENTED_IMAGE_SIMPLE,
                  description: "No meetings",
                }),
          ),
        ),
      ),
    );

  const content = loading && !rows.length
    ? React.createElement(
        "div",
        { style: { padding: 60, textAlign: "center" } },
        React.createElement(Spin, null),
      )
    : filteredRows.length
      ? viewMode === "board"
        ? renderBoardView()
        : renderTable()
      : React.createElement(Empty, {
          image: Empty.PRESENTED_IMAGE_SIMPLE,
          description: "No meetings matched the current filters.",
          style: { padding: 60 },
        });

  return React.createElement(
    Card,
    {
      size: "small",
      title: React.createElement(
          Space,
          { size: 8, wrap: true },
          React.createElement(Title, { level: 5, style: { margin: 0 } },
            MEETING_SCOPE === "my" ? "My Meetings" : "All Meetings",
          ),
          scheduledCount
            ? React.createElement(Tag, { color: "processing" }, `${scheduledCount} scheduled`)
            : null,
          React.createElement(Tag, null, `${completedThisMonth} completed this month`),
        ),
        extra: React.createElement(
          Space,
          { size: 8 },
          React.createElement(
            Button,
            {
              type: "primary",
              onClick: openMeetingCreate,
            },
            "Create meeting",
          ),
          React.createElement(Button, { loading, onClick: reload }, "Refresh"),
        ),
        bodyStyle: {
          padding: 0,
          minWidth: 0,
          maxWidth: "100%",
          overflow: "hidden",
        },
        style: {
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflow: "hidden",
          fontFamily: FONT,
        },
      },
      filterBar,
      content,
  );
};

ctx.render(React.createElement(MeetingBlock, null));
