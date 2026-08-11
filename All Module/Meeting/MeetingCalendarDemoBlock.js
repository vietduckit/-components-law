/**
 * MeetingCalendarDemoBlock.js
 *
 * Google Calendar-like workspace that combines Meetings and Tasks.
 *
 * Scope (All Calendar vs My Calendar), same convention as
 * All Module/Task/AllTaskBlock.js and All Module/Task/AllApprovalBlock.js:
 * this single file is meant to be reused as two separate block instances —
 * one page/tab configured for "All Calendar" (default, unfiltered — every
 * meeting/task the user has permission to see) and another for "My Calendar"
 * (calendarScope/scope = "my" — meeting host/attendee and task assignee for
 * the current user only), passed through ctx.view.inputArgs / ctx.params.
 */

const { React } = ctx;
const { useEffect, useMemo, useRef, useState } = React;
const {
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Segmented,
  Space,
  Spin,
  Tag,
  Typography,
  message,
  theme,
} = ctx.antd;

const { Text, Title } = Typography;
const { RangePicker } = DatePicker || {};

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
      calendarScope: ctx.calendarScope || inputArgs.calendarScope || inputArgs.params?.calendarScope,
      scope: ctx.scope || inputArgs.scope || inputArgs.params?.scope,
    };
  } catch {
    return {};
  }
};

const RUNTIME_INPUT = getRuntimeInput();
const MEETING_DETAIL_POPUP_UID =
  RUNTIME_INPUT.meetingDetailPopupUid || RUNTIME_INPUT.detailPopupUid || "5ffaa21d255";
const TASK_DETAIL_POPUP_UID =
  RUNTIME_INPUT.taskDetailPopupUid || RUNTIME_INPUT.taskDetailUid || "1a280d823ef";
const MEETING_APP_ROUTE = RUNTIME_INPUT.meetingAppRoute || "/admin/hewwj7gt9u3";
const TASK_APP_ROUTE = RUNTIME_INPUT.taskAppRoute || "/admin/tlm6r1r9xb6";

// ─── Scope (All Calendar vs My Calendar) ───────────────────────────────────
// Reuse this file for "My Calendar" by setting calendarScope/scope = "my"
// through ctx.view.inputArgs / ctx.params. Defaults to "all", same as
// AllTaskBlock.js / AllApprovalBlock.js.
const CALENDAR_BLOCK_DEFAULT_SCOPE = "all";
const normalizeCalendarScope = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (["my", "mine", "personal", "assigned", "assignee"].includes(raw)) return "my";
  return "all";
};
const CALENDAR_BLOCK_SCOPE = normalizeCalendarScope(
  RUNTIME_INPUT.calendarScope || RUNTIME_INPUT.scope || CALENDAR_BLOCK_DEFAULT_SCOPE
);

const MEETING_FETCH_LIMIT = 500;
const TASK_FETCH_LIMIT = 500;
const LOOKUP_FETCH_LIMIT = 1000;
const MEETING_CHANGED_EVENT = "law-meeting:changed";
const TASK_DETAIL_CHANGE_EVENT = "law-task-detail:changed";
const CALENDAR_DRAG_MIME = "application/x-law-calendar-item";
const DAY_DEFAULT_START_HOUR = 8;
const DAY_DEFAULT_END_HOUR = 18;
const DAY_SLOT_MINUTES = 15;
const DAY_HOUR_HEIGHT = 72;
const DAY_MIN_EVENT_HEIGHT = 34;

const MEETING_FIELDS =
  "id,title,meetingDate,startTime,endTime,location,status,type,description,hostId,caseId,createdAt,updatedAt";
const ATTENDEE_FIELDS =
  "id,userId,meetingId,attendanceStatus,isHost,content,createdAt,updatedAt";
const USER_FIELDS = "id,nickname,username,email";
const PROJECT_FIELDS =
  "id,caseCode,projectName,customerId,customer,createdAt";
const CUSTOMER_FIELDS = "id,customerName,shortName";
const TASK_FIELDS =
  "id,title,status,updatedAt,priority,startDate,dueDate,closedDate,lawyerId,projectId,serviceId,description,estimatedDuration,isRequiredApproval,approvedById,previousTaskId,blockedReason,nextStepDescription,linkedUrl";
const LAWYER_FIELDS = "id,lawyerName,lawyerType,userId";
const PROJECT_SERVICE_FIELDS =
  "id,projectId,serviceId,serviceName,serviceType,status";
const SERVICE_FIELDS = "id,serviceName,serviceType";

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

const VIEW_OPTIONS = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
  { value: "list", label: "List" },
];

const KIND_OPTIONS = [
  { value: "all", label: "All records" },
  { value: "meeting", label: "Meetings" },
  { value: "task", label: "Tasks" },
];

const CREATE_TYPE_OPTIONS = [
  { value: "meeting", label: "Meeting" },
  { value: "task", label: "Task" },
];

const TYPE_OPTIONS = [
  { value: "internal", label: "Internal" },
  { value: "case_review", label: "Case review" },
  { value: "strategy", label: "Strategy" },
  { value: "training", label: "Training" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "ongoing", label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "blocked", label: "Blocked" },
  { value: "overdue", label: "Overdue" },
];

const STATUS_META = {
  scheduled: { label: "Scheduled", color: "#1677ff", bg: "#e6f4ff", border: "#91caff" },
  ongoing: { label: "Ongoing", color: "#d46b08", bg: "#fff7e6", border: "#ffd591" },
  completed: { label: "Completed", color: "#389e0d", bg: "#f6ffed", border: "#b7eb8f" },
  cancelled: { label: "Cancelled", color: "#595959", bg: "#f5f5f5", border: "#d9d9d9" },
  todo: { label: "To do", color: "#595959", bg: "#fafafa", border: "#d9d9d9" },
  in_progress: { label: "In progress", color: "#1677ff", bg: "#e6f4ff", border: "#91caff" },
  pending_approval: { label: "Pending approval", color: "#d46b08", bg: "#fff7e6", border: "#ffd591" },
  blocked: { label: "Blocked", color: "#722ed1", bg: "#f9f0ff", border: "#d3adf7" },
  overdue: { label: "Overdue", color: "#cf1322", bg: "#fff1f0", border: "#ffa39e" },
};

const KIND_META = {
  meeting: { label: "Meeting", color: "#1677ff", bg: "#e6f4ff", border: "#91caff" },
  task: { label: "Task", color: "#389e0d", bg: "#f6ffed", border: "#b7eb8f" },
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const useNocoToken = () => {
  const result = theme && typeof theme.useToken === "function" ? theme.useToken() : null;
  return result?.token || FALLBACK_TOKEN;
};

const compact = (items) =>
  (items || [])
    .map((item) => (item === undefined || item === null ? "" : String(item).trim()))
    .filter(Boolean);

const extractRecordId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.length ? extractRecordId(value[0]) : null;
  if (typeof value === "object") return extractRecordId(value.recordId || value.id || value._id);
  const text = String(value).trim();
  return text || null;
};

const extractId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.length ? extractId(value[0]) : null;
  if (typeof value === "object") return extractId(value.id || value._id);
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const uniqueIds = (items) =>
  Array.from(new Set((items || []).map(extractId).filter(Boolean)));

const unwrapList = (res) => {
  const data = res?.data?.data ?? res?.data ?? [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
};

const getResponseRecord = (res) => {
  const data = res?.data?.data ?? res?.data ?? res;
  if (Array.isArray(data)) return data[0] || null;
  if (Array.isArray(data?.data)) return data.data[0] || null;
  return data && typeof data === "object" ? data : null;
};

const getCurrentUserFromCtx = () => {
  try {
    return (
      ctx.currentUser ||
      ctx.state?.currentUser ||
      ctx.user ||
      ctx.auth?.user ||
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
    console.warn("[MeetingCalendarDemoBlock] auth:check failed", error);
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
    console.warn(`[MeetingCalendarDemoBlock] ${url} failed`, error);
    return [];
  }
};

const fetchRowsByIds = async (url, ids, fields, sort = ["id"]) => {
  const safeIds = uniqueIds(ids);
  if (!safeIds.length) return [];
  return safeFetchList(
    url,
    {
      fields,
      filter: JSON.stringify({ id: { $in: safeIds } }),
      sort,
    },
    Math.max(safeIds.length, 50)
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

const openNocoView = async (uid, options, fallbackMessage) => {
  if (!uid || typeof ctx.openView !== "function") {
    message?.warning?.(fallbackMessage || "View is not configured.");
    return false;
  }
  try {
    await ctx.openView(uid, options);
    return true;
  } catch (error) {
    console.error("[MeetingCalendarDemoBlock] openView failed", error);
    message?.error?.(error?.message || fallbackMessage || "Could not open view.");
    return false;
  }
};

const pad2 = (value) => String(value).padStart(2, "0");

const isValidDate = (date) => date instanceof Date && !Number.isNaN(date.getTime());

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isValidDate(value) ? value : null;
  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return isValidDate(date) ? date : null;
  }
  if (value.$d) return isValidDate(value.$d) ? value.$d : null;
  const date = new Date(value);
  return isValidDate(date) ? date : null;
};

const toDateKey = (date) => {
  const value = toDate(date);
  if (!value) return "";
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
};

const startOfDay = (date) => {
  const value = toDate(date) || new Date();
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
};

const addDays = (date, days) => {
  const value = startOfDay(date);
  value.setDate(value.getDate() + days);
  return value;
};

const startOfWeek = (date) => {
  const value = startOfDay(date);
  const day = value.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(value, offset);
};

const buildMonthCells = (date) => {
  const value = startOfDay(date);
  const first = new Date(value.getFullYear(), value.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
};

const formatMonthTitle = (date) => {
  const value = toDate(date) || new Date();
  return `${MONTHS[value.getMonth()]} ${value.getFullYear()}`;
};

const formatDateTitle = (date) => {
  const value = toDate(date) || new Date();
  return `${MONTHS[value.getMonth()]} ${value.getDate()}, ${value.getFullYear()}`;
};

const formatWeekTitle = (date) => {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  return `${MONTHS[start.getMonth()]} ${start.getDate()} - ${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
};

const toDateTimeString = (date) => {
  const value = toDate(date);
  if (!value) return null;
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())} ${pad2(value.getHours())}:${pad2(value.getMinutes())}:${pad2(value.getSeconds())}`;
};

const normalizeTimeText = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}[T\s]\d{1,2}:\d{2}/.test(text)) {
    const date = toDate(value);
    if (date) return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  }
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (match) return `${pad2(match[1])}:${match[2]}`;
  const date = toDate(value);
  return date ? `${pad2(date.getHours())}:${pad2(date.getMinutes())}` : "";
};

const timeToStorage = (value) => {
  const text = normalizeTimeText(value);
  return text ? `${text}:00` : null;
};

const getDayjsFactory = () => {
  try {
    return typeof ctx.dayjs === "function"
      ? ctx.dayjs
      : typeof ctx.app?.dayjs === "function"
        ? ctx.app.dayjs
        : null;
  } catch {
    return null;
  }
};

const buildDefaultDateTimeRange = (dateKey, kind) => {
  const dayjsFactory = getDayjsFactory();
  if (!dayjsFactory || !dateKey) return undefined;
  const startTime = "09:00:00";
  const endTime = kind === "task" ? "17:00:00" : "10:00:00";
  return [
    dayjsFactory(`${dateKey} ${startTime}`),
    dayjsFactory(`${dateKey} ${endTime}`),
  ];
};

const isClosedStatus = (status) =>
  ["done", "completed", "cancelled", "canceled"].includes(
    String(status || "").trim().toLowerCase()
  );

const isOverdueDate = (value, status) => {
  if (!value || isClosedStatus(status)) return false;
  const date = toDate(value);
  if (!date) return false;
  const today = startOfDay(new Date());
  return startOfDay(date) < today;
};

const buildMapById = (items) => {
  const map = {};
  (items || []).forEach((item) => {
    const id = extractId(item?.id);
    if (id) map[id] = item;
  });
  return map;
};

const userLabel = (record) =>
  record?.nickname ||
  record?.displayName ||
  record?.username ||
  record?.name ||
  record?.email ||
  (record?.id ? `User #${record.id}` : "");

const isSelectableUser = (record) => extractId(record?.id || record) !== 1;

const lawyerLabel = (record) =>
  record?.lawyerName ||
  record?.name ||
  record?.displayName ||
  (record?.id ? `Lawyer #${record.id}` : "Unassigned");

const customerLabel = (record) =>
  record?.customerName ||
  record?.shortName ||
  record?.name ||
  record?.fullName ||
  (record?.id ? `Customer #${record.id}` : "");

const caseLabel = (record) =>
  compact([
    record?.caseCode || record?.projectCode || record?.code,
    record?.projectName || record?.caseName || record?.title || record?.name,
  ]).join(" - ") || (record?.id ? `Case #${record.id}` : "");

const projectCustomerLabel = (project, customersById = {}) => {
  const directCustomer = project?.customer || project?.customers;
  if (directCustomer && typeof directCustomer === "object") {
    const label = customerLabel(directCustomer);
    if (label) return label;
  }
  const customerId = extractId(project?.customerId || directCustomer);
  return customerLabel(customersById[customerId]);
};

const relatedCustomerId = (record) =>
  extractId(record?.customerId || record?.customer || record?.customers);

const contractLabel = (record) =>
  compact([
    record?.contractCode || record?.contractNumber || record?.code,
    record?.contractName || record?.name || record?.title,
  ]).join(" - ") || (record?.id ? `Contract #${record.id}` : "");

const quotationLabel = (record) =>
  compact([
    record?.quotationNumber || record?.quotationCode || record?.code,
    record?.quotationName || record?.name || record?.title,
  ]).join(" - ") || (record?.id ? `Quotation #${record.id}` : "");

const richRelationOption = (record, getLabel, customersById = {}) => {
  const id = extractId(record?.id);
  if (!id) return null;
  const primary = getLabel(record);
  const customer = customerLabel(customersById[relatedCustomerId(record)]);
  return {
    value: String(id),
    title: primary,
    searchText: compact([primary, record?.id, customer]).join(" "),
    label: React.createElement(
      "div",
      { style: { display: "grid", gap: 2, minWidth: 0 } },
      React.createElement(
        "span",
        { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } },
        primary
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
            customer
          )
        : null
    ),
  };
};

const selectFilterOption = (input, option) => {
  const keyword = String(input || "").trim().toLowerCase();
  if (!keyword) return true;
  return compact([
    option?.searchText,
    option?.title,
    typeof option?.label === "string" ? option.label : "",
    option?.value,
  ])
    .join(" ")
    .toLowerCase()
    .includes(keyword);
};

const serviceCatalogId = (record) =>
  extractId(record?.serviceId) ||
  extractId(record?.ServiceId) ||
  extractId(record?.services) ||
  extractId(record?.service);

const projectServiceTaskValue = (record) =>
  serviceCatalogId(record) || extractId(record?.id);

const serviceLabel = (record) => {
  const related = Array.isArray(record?.services) ? record.services[0] : record?.services;
  return (
    record?.serviceName ||
    record?._catalogServiceName ||
    related?.serviceName ||
    record?.service?.serviceName ||
    record?.name ||
    related?.name ||
    record?.service?.name ||
    (record?.id ? `Service #${record.id}` : "")
  );
};

const mergeProjectServicesWithCatalog = (projectServices = [], catalog = []) => {
  const catalogMap = buildMapById(catalog);
  return (projectServices || []).map((projectService) => {
    const catalogId = serviceCatalogId(projectService);
    const catalogRecord = catalogId ? catalogMap[catalogId] : null;
    if (!catalogRecord) return projectService;
    return {
      ...projectService,
      _catalogServiceName: catalogRecord.serviceName || catalogRecord.name || "",
      services: projectService.services || catalogRecord,
    };
  });
};

const buildServiceOptionsForCase = (caseId, projectServices = []) => {
  const safeCaseId = extractId(caseId);
  if (!safeCaseId) return [];
  return (projectServices || [])
    .filter((item) => extractId(item?.projectId || item?.project) === safeCaseId)
    .map((item) => {
      const value = projectServiceTaskValue(item);
      return {
        value: value ? String(value) : "",
        label: serviceLabel(item),
      };
    })
    .filter((item) => item.value && item.label);
};

const normalizeStatus = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "todo";
  if (["in progress", "in-progress", "doing"].includes(raw)) return "in_progress";
  if (["pending approval", "pending-approval"].includes(raw)) return "pending_approval";
  if (["to do", "to-do", "todo"].includes(raw)) return "todo";
  if (["canceled"].includes(raw)) return "cancelled";
  return raw;
};

const toTaskStorageStatus = (value) => {
  const normalized = normalizeStatus(value);
  if (normalized === "todo") return "toDo";
  if (normalized === "in_progress") return "inProgress";
  if (normalized === "pending_approval") return "pending";
  return normalized || "toDo";
};

const getStatusMeta = (status) => STATUS_META[normalizeStatus(status)] || STATUS_META.todo;

const getKindMeta = (kind) => KIND_META[kind] || KIND_META.task;

const itemSearchText = (item) =>
  compact([
    item.title,
    item.kind,
    item.status,
    item.caseName,
    item.customerName,
    item.serviceName,
    item.ownerName,
    item.roleLabel,
  ])
    .join(" ")
    .toLowerCase();

const sortByDateTime = (a, b) => {
  const left = `${a.date || ""} ${a.start || ""}`;
  const right = `${b.date || ""} ${b.start || ""}`;
  return left.localeCompare(right);
};

const fetchMyMeetingRows = async (currentUserId) => {
  if (!currentUserId) return { meetings: [], attendees: [] };
  const baseParams = {
    fields: MEETING_FIELDS,
    sort: ["-meetingDate", "-startTime", "-createdAt"],
  };
  const [hostRows, attendeeRowsForUser] = await Promise.all([
    safeFetchList(
      "meetings:list",
      {
        ...baseParams,
        filter: JSON.stringify({ hostId: { $eq: currentUserId } }),
      },
      MEETING_FETCH_LIMIT
    ),
    safeFetchList(
      "meetingAttendees:list",
      {
        fields: ATTENDEE_FIELDS,
        filter: JSON.stringify({ userId: { $eq: currentUserId } }),
        sort: ["meetingId", "isHost", "createdAt"],
      },
      LOOKUP_FETCH_LIMIT
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
        Math.max(attendeeMeetingIds.length, 50)
      )
    : [];
  const meetings = uniqueRowsById([...hostRows, ...attendeeMeetingRows]);
  const meetingIds = uniqueIds(meetings.map((row) => row.id));
  const attendees = meetingIds.length
    ? await safeFetchList(
        "meetingAttendees:list",
        {
          fields: ATTENDEE_FIELDS,
          filter: JSON.stringify({ meetingId: { $in: meetingIds } }),
          sort: ["meetingId", "isHost", "createdAt"],
        },
        LOOKUP_FETCH_LIMIT
      )
    : [];
  return { meetings, attendees };
};

const fetchMyTaskRows = async (lawyerIds) => {
  const safeLawyerIds = uniqueIds(lawyerIds);
  if (!safeLawyerIds.length) return [];
  const filter =
    safeLawyerIds.length === 1
      ? { lawyerId: { $eq: safeLawyerIds[0] } }
      : { lawyerId: { $in: safeLawyerIds } };
  return safeFetchList(
    "tasks:list",
    {
      fields: TASK_FIELDS,
      filter: JSON.stringify(filter),
      sort: ["-startDate", "-dueDate", "-updatedAt"],
    },
    TASK_FETCH_LIMIT
  );
};

// ── "All Calendar" scope: unfiltered — relies on collection permissions only,
// same convention as AllTaskBlock.js / AllApprovalBlock.js "all" branch. ──
const fetchAllMeetingRows = async () => {
  const meetings = await safeFetchList(
    "meetings:list",
    {
      fields: MEETING_FIELDS,
      sort: ["-meetingDate", "-startTime", "-createdAt"],
    },
    MEETING_FETCH_LIMIT
  );
  const meetingIds = uniqueIds(meetings.map((row) => row.id));
  const attendees = meetingIds.length
    ? await safeFetchList(
        "meetingAttendees:list",
        {
          fields: ATTENDEE_FIELDS,
          filter: JSON.stringify({ meetingId: { $in: meetingIds } }),
          sort: ["meetingId", "isHost", "createdAt"],
        },
        LOOKUP_FETCH_LIMIT
      )
    : [];
  return { meetings, attendees };
};

const fetchAllTaskRows = async () =>
  safeFetchList(
    "tasks:list",
    {
      fields: TASK_FIELDS,
      sort: ["-startDate", "-dueDate", "-updatedAt"],
    },
    TASK_FETCH_LIMIT
  );

const mapMeetingToCalendarItem = ({
  meeting,
  currentUserId,
  attendeesByMeeting,
  usersById,
  casesById,
  customersById,
}) => {
  const id = extractId(meeting?.id);
  const caseId = extractId(meeting?.caseId || meeting?.cases || meeting?.projectId);
  const project = caseId ? casesById[caseId] : null;
  const date = toDate(meeting?.meetingDate || meeting?.createdAt);
  const start = normalizeTimeText(meeting?.startTime) || normalizeTimeText(meeting?.meetingDate);
  const end = normalizeTimeText(meeting?.endTime);
  const attendees = attendeesByMeeting[id] || [];
  const attendeeIds = uniqueIds(attendees.map((row) => row.userId));
  const isHost = extractId(meeting?.hostId) === currentUserId;
  // In "All Calendar" scope every meeting the user has access to is loaded,
  // not just their own — so "Attendee" can no longer be assumed as the
  // fallback role when the record isn't actually theirs.
  const isAttendee = !!currentUserId && attendeeIds.includes(currentUserId);
  return {
    id: `meeting-${id}`,
    recordId: id,
    kind: "meeting",
    title: meeting?.title || `Meeting #${id}`,
    date: toDateKey(date),
    start,
    end,
    status: normalizeStatus(meeting?.status || "scheduled"),
    caseId: caseId ? String(caseId) : "",
    caseName: project ? caseLabel(project) : "",
    customerName: project ? projectCustomerLabel(project, customersById) : "",
    ownerName: userLabel(usersById[extractId(meeting?.hostId)]) || "Unassigned",
    roleLabel: isHost ? "Host" : isAttendee ? "Attendee" : "",
    isMine: isHost || isAttendee,
    _raw: meeting,
    _attendeeIds: attendeeIds,
  };
};

const mapTaskToCalendarItem = ({
  task,
  lawyersById,
  casesById,
  customersById,
  servicesByValue,
  scopeLawyerIds,
}) => {
  const id = extractId(task?.id);
  const projectId = extractId(task?.projectId || task?.projects);
  const project = projectId ? casesById[projectId] : null;
  const serviceValue = extractId(task?.serviceId || task?.services);
  const service = serviceValue ? servicesByValue[String(serviceValue)] : null;
  const taskDate = task?.startDate || task?.dueDate || task?.updatedAt || task?.createdAt;
  const status = isOverdueDate(task?.dueDate, task?.status) ? "overdue" : normalizeStatus(task?.status || "todo");
  return {
    id: `task-${id}`,
    recordId: id,
    kind: "task",
    title: task?.title || task?.taskName || `Task #${id}`,
    date: toDateKey(taskDate),
    start: normalizeTimeText(task?.startDate),
    end: normalizeTimeText(task?.dueDate),
    status,
    caseId: projectId ? String(projectId) : "",
    caseName: project ? caseLabel(project) : "",
    customerName: project ? projectCustomerLabel(project, customersById) : "",
    serviceName: service ? serviceLabel(service) : "",
    ownerName: lawyerLabel(lawyersById[extractId(task?.lawyerId)]),
    roleLabel: "Assignee",
    isMine: (scopeLawyerIds || []).includes(extractId(task?.lawyerId)),
    _raw: task,
  };
};

const openMeetingDetailView = async (item) => {
  const meetingId = extractRecordId(item?.recordId || item?.id);
  if (!meetingId) {
    message?.warning?.("Could not resolve meeting id.");
    return;
  }
  const pathname = `${MEETING_APP_ROUTE}/view/${MEETING_DETAIL_POPUP_UID}/filterbytk/${encodeURIComponent(String(meetingId))}`;
  const params = {
    filterByTk: meetingId,
    filterbytk: meetingId,
    id: meetingId,
    recordId: meetingId,
    meetingId,
    sourceRecordId: meetingId,
    collectionName: "meetings",
    pathname,
    linkedUrl: pathname,
  };
  await openNocoView(
    MEETING_DETAIL_POPUP_UID,
    {
      mode: "dialog",
      title: item?.title || "Meeting detail",
      size: "large",
      navigation: false,
      ...params,
      inputArgs: params,
      params,
      defineProperties: buildDefineProperties(params),
    },
    "Meeting detail view is not configured."
  );
};

const openTaskDetailView = async (item) => {
  const taskId = extractRecordId(item?.recordId || item?.taskId || item?.id);
  if (!taskId) {
    message?.warning?.("Could not resolve task id.");
    return;
  }
  const pathname = `${TASK_APP_ROUTE}/view/${TASK_DETAIL_POPUP_UID}/filterbytk/${encodeURIComponent(String(taskId))}`;
  const params = {
    filterByTk: taskId,
    filterbytk: taskId,
    id: taskId,
    recordId: taskId,
    taskId,
    sourceRecordId: taskId,
    sourceTaskId: taskId,
    parentTaskId: taskId,
    recordType: "task",
    collectionName: "tasks",
    pathname,
    linkedUrl: pathname,
  };
  await openNocoView(
    TASK_DETAIL_POPUP_UID,
    {
      mode: "dialog",
      title: item?.title || "Task detail",
      size: "large",
      navigation: false,
      ...params,
      inputArgs: params,
      params,
      defineProperties: buildDefineProperties(params),
    },
    "Task detail view is not configured."
  );
};

const openCalendarItemDetail = (item, event) => {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (item?.kind === "meeting") return openMeetingDetailView(item);
  return openTaskDetailView(item);
};

const getRangeBounds = (range) => {
  if (!Array.isArray(range) || range.length < 2) return null;
  const start = toDate(range[0]);
  const end = toDate(range[1]);
  if (!start || !end) return null;
  const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  return [startOfDay(start), endOfDay];
};

const isWithinRange = (dateKey, range) => {
  const bounds = getRangeBounds(range);
  if (!bounds) return true;
  const value = toDate(`${dateKey}T00:00:00`);
  if (!value) return true;
  return value >= bounds[0] && value <= bounds[1];
};

const parseTimeParts = (value, fallback = "09:00") => {
  const text = normalizeTimeText(value) || fallback;
  const match = String(text || "").match(/(\d{1,2}):(\d{2})/);
  const hour = match ? Number(match[1]) : 9;
  const minute = match ? Number(match[2]) : 0;
  return {
    hour: Number.isFinite(hour) ? Math.max(0, Math.min(hour, 23)) : 9,
    minute: Number.isFinite(minute) ? Math.max(0, Math.min(minute, 59)) : 0,
  };
};

const dateTimeFromDateKey = (dateKey, timeValue, fallback = "09:00") => {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const { hour, minute } = parseTimeParts(timeValue, fallback);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hour, minute, 0, 0);
};

const addMinutes = (date, minutes) => {
  const value = toDate(date);
  if (!value) return null;
  return new Date(value.getTime() + minutes * 60 * 1000);
};

const minutesBetween = (start, end) => {
  const left = toDate(start);
  const right = toDate(end);
  if (!left || !right || right <= left) return 0;
  return Math.round((right.getTime() - left.getTime()) / 60000);
};

const buildMovedRange = (item, targetDateKey, targetTime) => {
  if (!item || !targetDateKey) return null;
  const startTime = normalizeTimeText(targetTime) || normalizeTimeText(item.start) || "09:00";
  const startAt = dateTimeFromDateKey(targetDateKey, startTime);
  if (!startAt) return null;
  const originalStart = dateTimeFromDateKey(item.date, item.start || startTime);
  const originalEnd = item.end ? dateTimeFromDateKey(item.date, item.end) : null;
  const duration = minutesBetween(originalStart, originalEnd) || 60;
  const endAt =
    targetTime || !item.end
      ? addMinutes(startAt, duration)
      : dateTimeFromDateKey(targetDateKey, item.end);
  return endAt && endAt > startAt ? { startAt, endAt } : { startAt, endAt: addMinutes(startAt, duration) };
};

const parseDraggedCalendarItem = (event) => {
  const raw =
    event?.dataTransfer?.getData?.(CALENDAR_DRAG_MIME) ||
    event?.dataTransfer?.getData?.("text/plain");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && parsed.id ? parsed : null;
  } catch {
    return null;
  }
};

const minutesOfDay = (value, fallback = "09:00") => {
  const { hour, minute } = parseTimeParts(value, fallback);
  return hour * 60 + minute;
};

const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));

const formatTimeFromMinutes = (value) => {
  const safeValue = clampNumber(Math.round(Number(value) || 0), 0, 24 * 60 - 1);
  return `${pad2(Math.floor(safeValue / 60))}:${pad2(safeValue % 60)}`;
};

const getEventRangeMinutes = (item) => {
  const start = minutesOfDay(item?.start, "09:00");
  const rawEnd = normalizeTimeText(item?.end)
    ? minutesOfDay(item.end, item.start || "10:00")
    : start + 60;
  const end = rawEnd > start ? rawEnd : start + 60;
  return {
    start,
    end: Math.max(start + DAY_SLOT_MINUTES, Math.min(end, 24 * 60)),
  };
};

const getDayTimelineRange = (events) => {
  const ranges = (events || []).map(getEventRangeMinutes);
  const minStart = ranges.length
    ? Math.min(...ranges.map((range) => range.start))
    : DAY_DEFAULT_START_HOUR * 60;
  const maxEnd = ranges.length
    ? Math.max(...ranges.map((range) => range.end))
    : DAY_DEFAULT_END_HOUR * 60;
  const startHour = clampNumber(
    Math.min(DAY_DEFAULT_START_HOUR, Math.floor(minStart / 60)),
    0,
    23
  );
  const endHour = clampNumber(
    Math.max(DAY_DEFAULT_END_HOUR, Math.ceil(maxEnd / 60)),
    startHour + 1,
    24
  );
  return { startHour, endHour };
};

const getTimelineDropTime = (event, startHour, endHour, hourHeight = DAY_HOUR_HEIGHT) => {
  const target = event?.currentTarget;
  if (!target || typeof target.getBoundingClientRect !== "function") {
    return `${pad2(startHour)}:00`;
  }
  const rect = target.getBoundingClientRect();
  const totalMinutes = Math.max(DAY_SLOT_MINUTES, (endHour - startHour) * 60);
  const y = clampNumber(event.clientY - rect.top, 0, Math.max(rect.height, 1));
  const rawMinutes = (y / Math.max(rect.height, hourHeight)) * totalMinutes;
  const snappedMinutes = Math.round(rawMinutes / DAY_SLOT_MINUTES) * DAY_SLOT_MINUTES;
  const clampedMinutes = clampNumber(snappedMinutes, 0, Math.max(0, totalMinutes - DAY_SLOT_MINUTES));
  return formatTimeFromMinutes(startHour * 60 + clampedMinutes);
};

const buildDayEventLayouts = (events, startHour, endHour) => {
  const timelineStart = startHour * 60;
  const timelineEnd = endHour * 60;
  const laneEnds = [];
  const layouts = (events || [])
    .map((item) => {
      const range = getEventRangeMinutes(item);
      if (range.end <= timelineStart || range.start >= timelineEnd) return null;
      const start = clampNumber(range.start, timelineStart, timelineEnd - 1);
      const end = clampNumber(range.end, start + 1, timelineEnd);
      return { item, start, end };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const assigned = layouts.map((layout) => {
    let lane = laneEnds.findIndex((end) => end <= layout.start);
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = layout.end;
    return { ...layout, lane };
  });

  const laneCount = Math.max(1, laneEnds.length);
  return assigned.map((layout) => ({
    ...layout,
    laneCount,
    top: ((layout.start - timelineStart) / 60) * DAY_HOUR_HEIGHT,
    height: Math.max(DAY_MIN_EVENT_HEIGHT, ((layout.end - layout.start) / 60) * DAY_HOUR_HEIGHT),
  }));
};

const setCalendarDragData = (event, item, extra = {}) => {
  event.stopPropagation();
  const payload = JSON.stringify({
    id: item.id,
    recordId: item.recordId,
    kind: item.kind,
    date: item.date,
    start: item.start,
    end: item.end,
    ...extra,
  });
  event.dataTransfer?.setData?.(CALENDAR_DRAG_MIME, payload);
  event.dataTransfer?.setData?.("text/plain", payload);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
};

const CalendarPill = ({ item, compact: compactMode, onOpenDetail }) => {
  const kindMeta = getKindMeta(item.kind);
  const statusMeta = getStatusMeta(item.status);
  const label = compactMode ? item.title : compact([item.start, item.title]).join(" ");

  return React.createElement(
    "div",
    {
      title: compact([item.title, item.caseName, item.customerName]).join(" | "),
      draggable: true,
      onDragStart: (event) => setCalendarDragData(event, item),
      onClick: (event) => {
        if (typeof onOpenDetail === "function") onOpenDetail(item, event);
      },
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        minWidth: 0,
        height: compactMode ? 24 : 26,
        padding: "0 8px",
        borderRadius: 4,
        border: `1px solid ${kindMeta.border}`,
        background: kindMeta.bg,
        color: kindMeta.color,
        fontSize: 12,
        lineHeight: "24px",
        cursor: "pointer",
      },
    },
    React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        flex: "0 0 auto",
        borderRadius: 999,
        background: statusMeta.color,
      },
    }),
    React.createElement(
      "span",
      {
        style: {
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        },
      },
      label
    )
  );
};

const StatusTag = ({ status }) => {
  const meta = getStatusMeta(status);
  return React.createElement(
    Tag,
    {
      style: {
        marginInlineEnd: 0,
        color: meta.color,
        background: meta.bg,
        borderColor: meta.border,
      },
    },
    meta.label
  );
};

const SummaryLine = ({ item, token, onOpenDetail }) =>
  React.createElement(
    "button",
    {
      key: item.id,
      type: "button",
      onClick: (event) => {
        if (typeof onOpenDetail === "function") onOpenDetail(item, event);
      },
      style: {
        display: "grid",
        gridTemplateColumns: "72px minmax(0, 1fr) auto",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "8px 0",
        border: 0,
        borderBottom: `1px solid ${token.colorSplit}`,
        background: "transparent",
        textAlign: "left",
        cursor: "pointer",
      },
    },
    React.createElement(Text, { type: "secondary", style: { fontSize: 12 } }, compact([item.start, item.end]).join(" - ") || "All day"),
    React.createElement(
      "div",
      { style: { minWidth: 0 } },
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
        item.title
      ),
      React.createElement(
        Text,
        {
          type: "secondary",
          style: {
            display: "block",
            fontSize: 12,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        },
        compact([item.caseName, item.serviceName, item.ownerName]).join(" | ")
      )
    ),
    React.createElement(StatusTag, { status: item.status })
  );

const FilterBar = ({ filters, setFilters, range, setRange, resetFilters, token, caseOptions }) =>
  React.createElement(
    "div",
    {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 8,
        padding: "10px 0 12px",
        borderBottom: `1px solid ${token.colorSplit}`,
      },
    },
    React.createElement(Input, {
      allowClear: true,
      value: filters.keyword,
      placeholder: "Search title, case, customer...",
      onChange: (event) => setFilters((prev) => ({ ...prev, keyword: event.target.value })),
    }),
    React.createElement(Select, {
      value: filters.kind,
      options: KIND_OPTIONS,
      onChange: (value) => setFilters((prev) => ({ ...prev, kind: value })),
    }),
    React.createElement(Select, {
      value: filters.status,
      options: STATUS_OPTIONS,
      onChange: (value) => setFilters((prev) => ({ ...prev, status: value })),
    }),
    React.createElement(Select, {
      value: filters.caseId,
      options: caseOptions,
      showSearch: true,
      optionFilterProp: "label",
      onChange: (value) => setFilters((prev) => ({ ...prev, caseId: value })),
    }),
    RangePicker
      ? React.createElement(RangePicker, {
          value: range,
          onChange: setRange,
          style: { width: "100%" },
          placeholder: ["Start date", "End date"],
        })
      : null,
    React.createElement(Button, { onClick: resetFilters }, "Reset")
  );

const MonthView = ({
  cursorDate,
  selectedDate,
  setSelectedDate,
  itemsByDate,
  token,
  onOpenDetail,
  onQuickCreate,
  onDropItem,
}) => {
  const todayKey = toDateKey(new Date());
  const selectedKey = toDateKey(selectedDate);
  const cells = useMemo(() => buildMonthCells(cursorDate), [cursorDate]);

  return React.createElement(
    "div",
    {
      style: {
        minWidth: 880,
        border: `1px solid ${token.colorSplit}`,
        borderRadius: token.borderRadius,
        overflow: "hidden",
        background: token.colorBgContainer,
      },
    },
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          borderBottom: `1px solid ${token.colorSplit}`,
          background: token.colorFillAlter,
        },
      },
      WEEKDAYS.map((day) =>
        React.createElement(
          "div",
          {
            key: day,
            style: {
              padding: "8px 10px",
              fontWeight: 600,
              fontSize: 12,
              color: token.colorTextSecondary,
              borderRight: `1px solid ${token.colorSplit}`,
            },
          },
          day
        )
      )
    ),
    React.createElement(
      "div",
      { style: { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" } },
      cells.map((date) => {
        const key = toDateKey(date);
        const events = itemsByDate[key] || [];
        const isOutside = date.getMonth() !== cursorDate.getMonth();
        const isToday = key === todayKey;
        const isSelected = key === selectedKey;
        return React.createElement(
          "div",
          {
            key,
            onClick: () => setSelectedDate(date),
            onDragOver: (event) => {
              if (typeof onDropItem !== "function") return;
              event.preventDefault();
              if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
            },
            onDrop: (event) => {
              event.preventDefault();
              event.stopPropagation();
              if (typeof onDropItem === "function") onDropItem(event, key);
            },
            style: {
              minHeight: 118,
              padding: 8,
              textAlign: "left",
              border: 0,
              borderRight: `1px solid ${token.colorSplit}`,
              borderBottom: `1px solid ${token.colorSplit}`,
              background: isSelected ? "#f0f7ff" : isOutside ? "#fbfbfb" : token.colorBgContainer,
              outline: isSelected ? `1px solid ${token.colorPrimary}` : "none",
              cursor: "pointer",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              },
            },
            React.createElement(
              Text,
              {
                style: {
                  color: isToday ? token.colorPrimary : isOutside ? token.colorTextSecondary : token.colorText,
                  fontWeight: isToday ? 700 : 500,
                },
              },
              date.getDate()
            ),
            events.length
              ? React.createElement(Text, { type: "secondary", style: { fontSize: 12 } }, `${events.length}`)
              : null
          ),
          React.createElement(
            Space,
            { direction: "vertical", size: 4, style: { width: "100%" } },
            events.slice(0, 3).map((item) =>
              React.createElement(CalendarPill, {
                key: item.id,
                item,
                compact: true,
                onOpenDetail,
              })
            ),
            events.length > 3
              ? React.createElement(Text, { type: "secondary", style: { fontSize: 12 } }, `+${events.length - 3} more`)
              : null
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "flex-start",
                marginTop: 6,
              },
              onClick: (event) => event.stopPropagation(),
            },
            React.createElement(
              Button,
              {
                size: "small",
                onClick: () => onQuickCreate(null, key),
                style: { fontSize: 11, height: 22, paddingInline: 6 },
              },
              "+ New"
            )
          )
        );
      })
    )
  );
};

const WeekView = ({ selectedDate, setSelectedDate, itemsByDate, token, onOpenDetail, onQuickCreate, onDropItem }) => {
  const start = startOfWeek(selectedDate);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const todayKey = toDateKey(new Date());

  return React.createElement(
    "div",
    {
      style: {
        minWidth: 880,
        display: "grid",
        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
        border: `1px solid ${token.colorSplit}`,
        borderRadius: token.borderRadius,
        overflow: "hidden",
        background: token.colorBgContainer,
      },
    },
    days.map((day) => {
      const key = toDateKey(day);
      const events = itemsByDate[key] || [];
      const isToday = key === todayKey;
      return React.createElement(
        "div",
        {
          key,
          onDragOver: (event) => {
            if (typeof onDropItem !== "function") return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
          },
          onDrop: (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (typeof onDropItem === "function") onDropItem(event, key);
          },
          style: {
            minHeight: 460,
            borderRight: `1px solid ${token.colorSplit}`,
            background: isToday ? "#fff7e6" : token.colorBgContainer,
          },
        },
        React.createElement(
          "div",
          {
            onClick: () => setSelectedDate(day),
            style: {
              width: "100%",
              borderBottom: `1px solid ${token.colorSplit}`,
              background: "transparent",
              padding: "10px 8px",
              textAlign: "left",
              cursor: "pointer",
            },
          },
          React.createElement(Text, { strong: true }, `${day.getDate()} ${WEEKDAYS[(day.getDay() + 6) % 7]}`),
          React.createElement(Text, { type: "secondary", style: { display: "block", fontSize: 12 } }, `${events.length} records`),
          React.createElement(
            "div",
            {
              style: { marginTop: 6 },
              onClick: (event) => event.stopPropagation(),
            },
            React.createElement(
              Button,
              { size: "small", onClick: () => onQuickCreate(null, key), style: { height: 22, fontSize: 11 } },
              "+ New"
            )
          )
        ),
        React.createElement(
          Space,
          { direction: "vertical", size: 6, style: { width: "100%", padding: 8 } },
          events.length
            ? events.map((item) => React.createElement(CalendarPill, { key: item.id, item, onOpenDetail }))
            : React.createElement(Text, { type: "secondary", style: { fontSize: 12 } }, "No records")
        )
      );
    })
  );
};

const DayTimelineEvent = ({ layout, token, onOpenDetail, onTimelineDragStart, onTimelineDragEnd }) => {
  const item = layout.item;
  const kindMeta = getKindMeta(item.kind);
  const statusMeta = getStatusMeta(item.status);
  const timeRange = item.end ? `${item.start || ""} - ${item.end}` : item.start || "No time";
  const durationMinutes = Math.max(DAY_SLOT_MINUTES, layout.end - layout.start);
  return React.createElement(
    "div",
    {
      title: compact([item.title, timeRange, item.caseName, item.customerName]).join(" | "),
      draggable: true,
      onDragStart: (event) => {
        const rect =
          event.currentTarget && typeof event.currentTarget.getBoundingClientRect === "function"
            ? event.currentTarget.getBoundingClientRect()
            : null;
        const rawOffset = rect
          ? ((event.clientY - rect.top) / Math.max(rect.height, 1)) * durationMinutes
          : 0;
        const dragOffsetMinutes = clampNumber(
          Math.round(rawOffset / DAY_SLOT_MINUTES) * DAY_SLOT_MINUTES,
          0,
          durationMinutes
        );
        if (typeof onTimelineDragStart === "function") onTimelineDragStart(dragOffsetMinutes);
        setCalendarDragData(event, item, { dragOffsetMinutes });
      },
      onDragEnd: () => {
        if (typeof onTimelineDragEnd === "function") onTimelineDragEnd();
      },
      onClick: (event) => {
        if (typeof onOpenDetail === "function") onOpenDetail(item, event);
      },
      style: {
        position: "absolute",
        top: layout.top,
        left: `calc(${(layout.lane / layout.laneCount) * 100}% + 6px)`,
        width: `calc(${100 / layout.laneCount}% - 10px)`,
        height: layout.height,
        minHeight: DAY_MIN_EVENT_HEIGHT,
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: "8px minmax(0, 1fr)",
        gap: 6,
        padding: "6px 8px",
        borderRadius: 6,
        border: `1px solid ${kindMeta.border}`,
        background: kindMeta.bg,
        color: kindMeta.color,
        boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        cursor: "grab",
        overflow: "hidden",
        zIndex: 2,
      },
    },
    React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        marginTop: 5,
        borderRadius: 999,
        background: statusMeta.color,
      },
    }),
    React.createElement(
      "div",
      { style: { minWidth: 0, display: "grid", gap: 2 } },
      React.createElement(
        "span",
        {
          style: {
            fontSize: 11,
            lineHeight: "14px",
            color: token.colorTextSecondary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        },
        timeRange
      ),
      React.createElement(
        "span",
        {
          style: {
            fontWeight: 600,
            lineHeight: "16px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        },
        item.title
      ),
      layout.height >= 52
        ? React.createElement(
            "span",
            {
              style: {
                fontSize: 11,
                lineHeight: "14px",
                color: token.colorTextSecondary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            },
            compact([item.caseName, item.customerName]).join(" | ")
          )
        : null
    )
  );
};

const DayView = ({ selectedDate, itemsByDate, token, onOpenDetail, onQuickCreate, onDropItem }) => {
  const key = toDateKey(selectedDate);
  const events = (itemsByDate[key] || []).slice().sort(sortByDateTime);
  const [hoverTime, setHoverTime] = useState(null);
  const [dragOffsetMinutes, setDragOffsetMinutes] = useState(0);
  const { startHour, endHour } = useMemo(() => getDayTimelineRange(events), [events]);
  const hours = useMemo(
    () => Array.from({ length: endHour - startHour }, (_, index) => startHour + index),
    [startHour, endHour]
  );
  const timelineHeight = (endHour - startHour) * DAY_HOUR_HEIGHT;
  const eventLayouts = useMemo(
    () => buildDayEventLayouts(events, startHour, endHour),
    [events, startHour, endHour]
  );
  const hoverOffset =
    hoverTime !== null
      ? ((minutesOfDay(hoverTime, `${pad2(startHour)}:00`) - startHour * 60) / 60) * DAY_HOUR_HEIGHT
      : null;

  const handleTimelineDragOver = (event) => {
    if (typeof onDropItem !== "function") return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    const pointerTime = getTimelineDropTime(event, startHour, endHour, DAY_HOUR_HEIGHT);
    const targetStartMinutes = clampNumber(
      minutesOfDay(pointerTime, `${pad2(startHour)}:00`) - dragOffsetMinutes,
      startHour * 60,
      endHour * 60 - DAY_SLOT_MINUTES
    );
    setHoverTime(formatTimeFromMinutes(targetStartMinutes));
  };

  const handleTimelineDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const dragged = parseDraggedCalendarItem(event);
    const offsetFromPayload = Number(dragged?.dragOffsetMinutes);
    const activeDragOffset = Number.isFinite(offsetFromPayload)
      ? offsetFromPayload
      : dragOffsetMinutes;
    const pointerTime = getTimelineDropTime(event, startHour, endHour, DAY_HOUR_HEIGHT);
    const targetStartMinutes = clampNumber(
      minutesOfDay(pointerTime, `${pad2(startHour)}:00`) - activeDragOffset,
      startHour * 60,
      endHour * 60 - DAY_SLOT_MINUTES
    );
    const targetTime = formatTimeFromMinutes(targetStartMinutes);
    setHoverTime(null);
    setDragOffsetMinutes(0);
    if (typeof onDropItem === "function") onDropItem(event, key, targetTime);
  };

  return React.createElement(
    "div",
    {
      style: {
        minWidth: 760,
        border: `1px solid ${token.colorSplit}`,
        borderRadius: token.borderRadius,
        overflow: "hidden",
        background: token.colorBgContainer,
      },
    },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "10px 12px",
          borderBottom: `1px solid ${token.colorSplit}`,
          background: token.colorFillAlter,
        },
      },
      React.createElement(
        "div",
        null,
        React.createElement(Text, { strong: true }, formatDateTitle(selectedDate)),
        React.createElement(Text, { type: "secondary", style: { marginLeft: 8 } }, `${events.length} records`),
        React.createElement(
          Text,
          { type: "secondary", style: { marginLeft: 8, fontSize: 12 } },
          `${pad2(startHour)}:00 - ${pad2(endHour)}:00 | ${DAY_SLOT_MINUTES}-min slots`
        )
      ),
      React.createElement(
        Space,
        { size: 6 },
        React.createElement(Button, { size: "small", onClick: () => onQuickCreate(null, key) }, "+ New")
      )
    ),
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "88px minmax(0, 1fr)",
          minHeight: timelineHeight,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            borderRight: `1px solid ${token.colorSplit}`,
            background: token.colorBgContainer,
          },
        },
        hours.map((hour) =>
          React.createElement(
            "div",
            {
              key: hour,
              style: {
                height: DAY_HOUR_HEIGHT,
                boxSizing: "border-box",
                padding: "8px 12px 0",
                borderTop: `1px solid ${token.colorSplit}`,
                color: token.colorTextSecondary,
                fontSize: 12,
              },
            },
            `${pad2(hour)}:00`
          )
        )
      ),
      React.createElement(
        "div",
        {
          onDragOver: handleTimelineDragOver,
          onDrop: handleTimelineDrop,
          onDragLeave: (event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setHoverTime(null);
          },
          style: {
            position: "relative",
            minHeight: timelineHeight,
            background: token.colorBgContainer,
            overflow: "hidden",
          },
        },
        hours.map((hour) =>
          React.createElement(
            "div",
            {
              key: `grid-${hour}`,
              style: {
                position: "absolute",
                left: 0,
                right: 0,
                top: (hour - startHour) * DAY_HOUR_HEIGHT,
                height: DAY_HOUR_HEIGHT,
                boxSizing: "border-box",
                borderTop: `1px solid ${token.colorSplit}`,
              },
            },
            [1, 2, 3].map((slot) =>
              React.createElement("div", {
                key: slot,
                style: {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: `${slot * 25}%`,
                  borderTop: `1px dashed ${token.colorSplit}`,
                  opacity: slot === 2 ? 0.9 : 0.55,
                },
              })
            )
          )
        ),
        hoverOffset !== null
          ? React.createElement(
              "div",
              {
                style: {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: clampNumber(hoverOffset, 0, timelineHeight - 1),
                  borderTop: `2px solid ${token.colorPrimary}`,
                  zIndex: 4,
                  pointerEvents: "none",
                },
              },
              React.createElement(
                "span",
                {
                  style: {
                    position: "absolute",
                    left: 8,
                    top: -11,
                    padding: "1px 6px",
                    borderRadius: 999,
                    background: token.colorPrimary,
                    color: "#fff",
                    fontSize: 11,
                    lineHeight: "18px",
                  },
                },
                hoverTime
              )
            )
          : null,
        eventLayouts.length
          ? eventLayouts.map((layout) =>
              React.createElement(DayTimelineEvent, {
                key: layout.item.id,
                layout,
                token,
                onOpenDetail,
                onTimelineDragStart: setDragOffsetMinutes,
                onTimelineDragEnd: () => setDragOffsetMinutes(0),
              })
            )
          : React.createElement(
              "div",
              {
                style: {
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                },
              },
              React.createElement(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: "No records" })
            )
      )
    )
  );
};

const ListView = ({ items, token, onOpenDetail }) =>
  React.createElement(
    "div",
    {
      style: {
        minWidth: 760,
        border: `1px solid ${token.colorSplit}`,
        borderRadius: token.borderRadius,
        overflow: "hidden",
        background: token.colorBgContainer,
      },
    },
    items.length
      ? items.map((item) =>
          React.createElement(
            "button",
            {
              key: item.id,
              type: "button",
              onClick: (event) => {
                if (typeof onOpenDetail === "function") onOpenDetail(item, event);
              },
              style: {
                display: "grid",
                gridTemplateColumns: "120px minmax(260px, 1fr) 140px 160px",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: "10px 12px",
                border: 0,
                borderBottom: `1px solid ${token.colorSplit}`,
                background: "transparent",
                textAlign: "left",
                cursor: "pointer",
              },
            },
            React.createElement(Text, { type: "secondary" }, `${item.date} ${item.start || ""}`),
            React.createElement(
              "div",
              { style: { minWidth: 0 } },
              React.createElement(Text, { style: { display: "block" } }, item.title),
              React.createElement(Text, { type: "secondary", style: { display: "block", fontSize: 12 } }, compact([item.caseName, item.serviceName, item.customerName]).join(" | "))
            ),
            React.createElement(Tag, {
              style: {
                marginInlineEnd: 0,
                color: getKindMeta(item.kind).color,
                background: getKindMeta(item.kind).bg,
                borderColor: getKindMeta(item.kind).border,
              },
            }, getKindMeta(item.kind).label),
            React.createElement(StatusTag, { status: item.status })
          )
        )
      : React.createElement(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE })
  );

const AgendaPanel = ({ selectedDate, selectedItems, upcomingItems, token, onOpenDetail, onQuickCreate }) =>
  React.createElement(
    "div",
    {
      style: {
        border: `1px solid ${token.colorSplit}`,
        borderRadius: token.borderRadius,
        background: token.colorBgContainer,
        minWidth: 280,
        overflow: "hidden",
      },
    },
    React.createElement(
      "div",
      {
        style: {
          padding: "12px 14px",
          borderBottom: `1px solid ${token.colorSplit}`,
          background: token.colorFillAlter,
        },
      },
      React.createElement(Text, { strong: true }, "Agenda"),
      React.createElement(Text, { type: "secondary", style: { display: "block", fontSize: 12 } }, formatDateTitle(selectedDate)),
      React.createElement(
        "div",
        { style: { marginTop: 8 } },
        React.createElement(Button, { size: "small", onClick: () => onQuickCreate(null, toDateKey(selectedDate)) }, "+ New")
      )
    ),
    React.createElement(
      "div",
      { style: { padding: "4px 14px 10px" } },
      selectedItems.length
        ? selectedItems.map((item) => React.createElement(SummaryLine, { key: item.id, item, token, onOpenDetail }))
        : React.createElement(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: "No records" })
    ),
    React.createElement(
      "div",
      {
        style: {
          padding: "12px 14px",
          borderTop: `1px solid ${token.colorSplit}`,
          background: token.colorFillAlter,
        },
      },
      React.createElement(Text, { strong: true }, "Upcoming")
    ),
    React.createElement(
      "div",
      { style: { padding: "4px 14px 10px" } },
      upcomingItems.length
        ? upcomingItems.slice(0, 5).map((item) => React.createElement(SummaryLine, { key: item.id, item, token, onOpenDetail }))
        : React.createElement(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: "No upcoming records" })
    )
  );

const QuickCreateModal = ({
  openState,
  form,
  caseOptions,
  projectServices,
  userOptions,
  lawyerOptions,
  contractOptions,
  quotationOptions,
  defaultHostId,
  defaultLawyerId,
  onCancel,
  onDirtyChange,
  onSubmit,
}) => {
  const watchedKind = Form.useWatch ? Form.useWatch("kind", form) : null;
  const watchedCaseId = Form.useWatch ? Form.useWatch("caseId", form) : null;
  const watchedHostId = Form.useWatch ? Form.useWatch("hostId", form) : null;
  const watchedApprovalRequired = Form.useWatch ? Form.useWatch("isRequiredApproval", form) : false;
  const kind = watchedKind || openState?.kind || "meeting";
  const isMeeting = kind === "meeting";
  const activeHostId = extractId(watchedHostId);
  const approvalRequired = watchedApprovalRequired === true || watchedApprovalRequired === "yes";
  const serviceOptions = useMemo(
    () => buildServiceOptionsForCase(watchedCaseId, projectServices),
    [projectServices, watchedCaseId]
  );
  const attendeeOptions = useMemo(
    () => (userOptions || []).filter((option) => extractId(option?.value) !== activeHostId),
    [userOptions, activeHostId]
  );

  const handleKindChange = (value) => {
    onDirtyChange?.();
    const nextKind = value === "task" ? "task" : "meeting";
    const currentRange = form.getFieldValue("datetimeRange");
    const nextHostId = extractId(form.getFieldValue("hostId")) || extractId(defaultHostId);
    const nextLawyerId = extractId(form.getFieldValue("lawyerId")) || extractId(defaultLawyerId);
    form.setFieldsValue({
      kind: nextKind,
      status: nextKind === "meeting" ? "scheduled" : "todo",
      datetimeRange:
        Array.isArray(currentRange) && currentRange.length === 2
          ? currentRange
          : buildDefaultDateTimeRange(openState?.dateKey, nextKind),
      serviceId: undefined,
      hostId: nextKind === "meeting" && nextHostId ? String(nextHostId) : undefined,
      attendeeIds:
        nextKind === "meeting"
          ? uniqueIds(form.getFieldValue("attendeeIds") || [])
              .filter((id) => id !== nextHostId)
              .map(String)
          : [],
      lawyerId: nextKind === "task" && nextLawyerId ? String(nextLawyerId) : undefined,
      isRequiredApproval:
        nextKind === "task" && (form.getFieldValue("isRequiredApproval") === true || form.getFieldValue("isRequiredApproval") === "yes")
          ? "yes"
          : "no",
      approvedById: nextKind === "task" ? form.getFieldValue("approvedById") : undefined,
      contractId: nextKind === "meeting" ? form.getFieldValue("contractId") : undefined,
      quotationId: nextKind === "meeting" ? form.getFieldValue("quotationId") : undefined,
      type: nextKind === "meeting" ? form.getFieldValue("type") || "internal" : undefined,
      location: nextKind === "meeting" ? form.getFieldValue("location") : undefined,
    });
  };

  const handleCaseChange = (value) => {
    onDirtyChange?.();
    form.setFieldsValue({ caseId: value, serviceId: undefined });
  };

  const handleHostChange = (value) => {
    onDirtyChange?.();
    const nextHostId = extractId(value);
    const nextAttendeeIds = uniqueIds(form.getFieldValue("attendeeIds") || [])
      .filter((id) => id !== nextHostId)
      .map(String);
    form.setFieldsValue({
      hostId: nextHostId ? String(nextHostId) : undefined,
      attendeeIds: nextAttendeeIds,
    });
  };

  const handleAttendeeChange = (values) => {
    onDirtyChange?.();
    const nextAttendeeIds = uniqueIds(values || [])
      .filter((id) => id !== activeHostId)
      .map(String);
    form.setFieldsValue({ attendeeIds: nextAttendeeIds });
  };

  const handleApprovalRequiredChange = (value) => {
    onDirtyChange?.();
    const nextRequired = value === true || value === "yes";
    form.setFieldsValue({
      isRequiredApproval: nextRequired ? "yes" : "no",
      approvedById: nextRequired ? form.getFieldValue("approvedById") : undefined,
    });
  };

  return React.createElement(
    Modal,
    {
      open: !!openState?.open,
      title: "Create calendar item",
      width: 820,
      onCancel,
      footer: React.createElement(
        Space,
        { size: 8 },
        React.createElement(Button, { onClick: onCancel }, "Cancel"),
        React.createElement(Button, { type: "primary", onClick: onSubmit }, isMeeting ? "Add meeting" : "Add task")
      ),
    },
    React.createElement(
      Form,
      {
        form,
        layout: "vertical",
        requiredMark: false,
        onValuesChange: () => onDirtyChange?.(),
      },
      React.createElement(
        Form.Item,
        {
          name: "kind",
          label: "Record type",
          style: { marginBottom: 12 },
        },
        React.createElement(Segmented, {
          block: true,
          options: CREATE_TYPE_OPTIONS,
          value: kind,
          onChange: handleKindChange,
        })
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 10,
          },
        },
        React.createElement(
          Form.Item,
          {
            name: "title",
            label: "Title",
            style: { gridColumn: "span 2", minWidth: 0 },
            rules: [{ required: true, message: "Title is required." }],
          },
          React.createElement(Input, { placeholder: isMeeting ? "Meeting title" : "Task title" })
        ),
        React.createElement(
          Form.Item,
          {
            name: "datetimeRange",
            label: "Date time",
            style: { gridColumn: "span 2", minWidth: 0 },
            rules: [{ required: true, message: "Date time is required." }],
          },
          RangePicker
            ? React.createElement(RangePicker, {
                showTime: { format: "HH:mm" },
                format: "DD/MM/YYYY HH:mm",
                style: { width: "100%" },
                placeholder: ["Start time", "End time"],
              })
            : React.createElement(Input, { placeholder: "Select start and end time" })
        ),
        isMeeting
          ? React.createElement(
              Form.Item,
              {
                name: "hostId",
                label: "Host",
                style: { gridColumn: "span 2", minWidth: 0 },
                rules: [{ required: true, message: "Host is required." }],
              },
              React.createElement(Select, {
                allowClear: true,
                showSearch: true,
                optionFilterProp: "searchText",
                optionLabelProp: "title",
                filterOption: selectFilterOption,
                options: userOptions,
                placeholder: "Select host",
                onChange: handleHostChange,
              })
            )
          : React.createElement(
              Form.Item,
              {
                name: "lawyerId",
                label: "Assignee",
                style: { gridColumn: "span 2", minWidth: 0 },
                rules: [{ required: true, message: "Assignee is required." }],
              },
              React.createElement(Select, {
                allowClear: true,
                showSearch: true,
                optionFilterProp: "searchText",
                optionLabelProp: "title",
                filterOption: selectFilterOption,
                options: lawyerOptions,
                placeholder: "Select assignee",
              })
            ),
        isMeeting
          ? React.createElement(
              Form.Item,
              { name: "attendeeIds", label: "Attendees", style: { gridColumn: "span 2", minWidth: 0 } },
              React.createElement(Select, {
                mode: "multiple",
                allowClear: true,
                showSearch: true,
                maxTagCount: "responsive",
                optionFilterProp: "searchText",
                optionLabelProp: "title",
                filterOption: selectFilterOption,
                options: attendeeOptions,
                placeholder: "Invite attendees",
                onChange: handleAttendeeChange,
              })
            )
          : null,
        !isMeeting
          ? React.createElement(
              Form.Item,
              {
                name: "isRequiredApproval",
                label: "Approval",
                initialValue: "no",
                style: { gridColumn: "span 2", minWidth: 0 },
              },
              React.createElement(Select, {
                options: [
                  { value: "no", label: "No approval" },
                  { value: "yes", label: "Require approval" },
                ],
                placeholder: "Select approval requirement",
                onChange: handleApprovalRequiredChange,
              })
            )
          : null,
        !isMeeting && approvalRequired
          ? React.createElement(
              Form.Item,
              {
                name: "approvedById",
                label: "Approver lawyer",
                style: { gridColumn: "span 2", minWidth: 0 },
                rules: [{ required: true, message: "Approver lawyer is required." }],
              },
              React.createElement(Select, {
                allowClear: true,
                showSearch: true,
                optionFilterProp: "searchText",
                optionLabelProp: "title",
                filterOption: selectFilterOption,
                options: lawyerOptions,
                placeholder: "Select approver lawyer",
              })
            )
          : null,
        React.createElement(
          Form.Item,
          { name: "caseId", label: "Case", style: { gridColumn: "span 2", minWidth: 0 } },
          React.createElement(Select, {
            allowClear: true,
            options: caseOptions.filter((option) => option.value !== "all"),
            showSearch: true,
            optionFilterProp: "label",
            placeholder: "Select case",
            onChange: handleCaseChange,
          })
        ),
        isMeeting
          ? React.createElement(
              Form.Item,
              { name: "contractId", label: "Contract", style: { gridColumn: "span 2", minWidth: 0 } },
              React.createElement(Select, {
                allowClear: true,
                showSearch: true,
                optionFilterProp: "searchText",
                optionLabelProp: "title",
                filterOption: selectFilterOption,
                options: contractOptions,
                placeholder: "Select related contract (optional)",
              })
            )
          : null,
        isMeeting
          ? React.createElement(
              Form.Item,
              { name: "quotationId", label: "Quotation", style: { gridColumn: "span 2", minWidth: 0 } },
              React.createElement(Select, {
                allowClear: true,
                showSearch: true,
                optionFilterProp: "searchText",
                optionLabelProp: "title",
                filterOption: selectFilterOption,
                options: quotationOptions,
                placeholder: "Select related quotation (optional)",
              })
            )
          : null,
        isMeeting
          ? React.createElement(
              Form.Item,
              { name: "type", label: "Type", style: { gridColumn: "span 2", minWidth: 0 } },
              React.createElement(Select, {
                options: TYPE_OPTIONS,
                placeholder: "Select meeting type",
              })
            )
          : null,
        isMeeting
          ? React.createElement(
              Form.Item,
              { name: "location", label: "Location / Link", style: { gridColumn: "span 2", minWidth: 0 } },
              React.createElement(Input, {
                allowClear: true,
                placeholder: "Room, address or online meeting link",
              })
            )
          : null,
        !isMeeting
          ? React.createElement(
              Form.Item,
              { name: "serviceId", label: "Service", style: { gridColumn: "span 2", minWidth: 0 } },
              React.createElement(Select, {
                allowClear: true,
                disabled: !extractId(watchedCaseId),
                options: serviceOptions,
                showSearch: true,
                optionFilterProp: "label",
                placeholder: extractId(watchedCaseId) ? "Select service (optional)" : "Select case first",
              })
            )
          : null,
        React.createElement(
          Form.Item,
          { name: "status", label: "Status", style: { gridColumn: isMeeting ? "span 2" : "span 2", minWidth: 0 } },
          React.createElement(Select, {
            options: STATUS_OPTIONS.filter((option) =>
              isMeeting
                ? ["scheduled", "ongoing", "completed", "cancelled"].includes(option.value)
                : ["todo", "in_progress", "pending_approval", "blocked"].includes(option.value)
            ),
          })
        )
      ),
      React.createElement(
        Form.Item,
        { name: "description", label: isMeeting ? "Agenda / Description" : "Description" },
        React.createElement(Input.TextArea, {
          rows: 3,
          placeholder: isMeeting ? "Meeting agenda..." : "Description...",
        })
      )
    )
  );
};

const CalendarWorkspaceDemo = () => {
  const token = useNocoToken();
  const today = startOfDay(new Date());
  const [quickForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [cases, setCases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projectServices, setProjectServices] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [viewMode, setViewMode] = useState("month");
  const [cursorDate, setCursorDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [range, setRange] = useState(null);
  const [quickCreate, setQuickCreate] = useState({
    open: false,
    kind: "meeting",
    dateKey: toDateKey(today),
    sourceItem: null,
  });
  const [quickCreateDirty, setQuickCreateDirty] = useState(false);
  const quickCreateDirtyRef = useRef(false);
  const quickCreateConfirmOpenRef = useRef(false);
  const [filters, setFilters] = useState({
    keyword: "",
    kind: "all",
    status: "all",
    caseId: "all",
  });

  const currentUserId = useMemo(() => extractId(currentUser?.id || currentUser), [currentUser]);
  const defaultHostId = useMemo(
    () => (currentUserId && isSelectableUser(currentUserId) ? currentUserId : null),
    [currentUserId]
  );
  const customersById = useMemo(() => buildMapById(customers), [customers]);
  const usersById = useMemo(() => buildMapById(users), [users]);
  const defaultLawyerId = useMemo(() => {
    const lawyer = (lawyers || []).find((item) => extractId(item?.userId) === currentUserId);
    return extractId(lawyer?.id);
  }, [currentUserId, lawyers]);

  useEffect(() => {
    quickCreateDirtyRef.current = quickCreateDirty;
  }, [quickCreateDirty]);

  const markQuickCreateDirty = () => {
    if (!quickCreate?.open || quickCreateDirtyRef.current) return;
    quickCreateDirtyRef.current = true;
    setQuickCreateDirty(true);
  };

  const userOptions = useMemo(
    () =>
      uniqueRowsById([...users, currentUser].filter(Boolean))
        .filter(isSelectableUser)
        .map((user) => {
          const id = extractId(user?.id);
          const label = userLabel(user);
          return id
            ? {
                value: String(id),
                title: label,
                searchText: compact([label, user?.email, user?.username, id]).join(" "),
                label,
              }
            : null;
        })
        .filter(Boolean),
    [users, currentUser]
  );

  const lawyerOptions = useMemo(
    () =>
      (lawyers || [])
        .map((lawyer) => {
          const id = extractId(lawyer?.id);
          if (!id) return null;
          const primary = lawyerLabel(lawyer);
          const linkedUser = userLabel(usersById[extractId(lawyer?.userId)]);
          return {
            value: String(id),
            title: primary,
            searchText: compact([primary, linkedUser, lawyer?.id]).join(" "),
            label: primary,
          };
        })
        .filter(Boolean),
    [lawyers, usersById]
  );

  const contractOptions = useMemo(
    () =>
      (contracts || [])
        .map((contract) => richRelationOption(contract, contractLabel, customersById))
        .filter(Boolean),
    [contracts, customersById]
  );

  const quotationOptions = useMemo(
    () =>
      (quotations || [])
        .map((quotation) => richRelationOption(quotation, quotationLabel, customersById))
        .filter(Boolean),
    [quotations, customersById]
  );

  const caseOptions = useMemo(
    () => [
      { value: "all", label: "All cases" },
      ...cases.map((project) => {
        const id = extractId(project?.id);
        const customer = projectCustomerLabel(project, customersById);
        const label = compact([caseLabel(project), customer]).join(" - ");
        return {
          value: id ? String(id) : "",
          label,
        };
      }).filter((item) => item.value),
    ],
    [cases, customersById]
  );

  const reload = async () => {
    setLoading(true);
    try {
      const user = await fetchCurrentUser();
      const currentUserId = extractId(user?.id || user);
      setCurrentUser(user);

      const scopeLawyers = currentUserId
        ? await safeFetchList(
            "lawyers:list",
            {
              fields: LAWYER_FIELDS,
              filter: JSON.stringify({ userId: { $eq: currentUserId } }),
              sort: ["id"],
            },
            LOOKUP_FETCH_LIMIT
          )
        : [];
      const scopeLawyerIds = uniqueIds(scopeLawyers.map((item) => item.id));

      const [
        { meetings, attendees },
        taskRows,
        projectRows,
        allUserRows,
        allLawyerRows,
        contractRows,
        quotationRows,
      ] = await Promise.all([
        CALENDAR_BLOCK_SCOPE === "my" ? fetchMyMeetingRows(currentUserId) : fetchAllMeetingRows(),
        CALENDAR_BLOCK_SCOPE === "my" ? fetchMyTaskRows(scopeLawyerIds) : fetchAllTaskRows(),
        safeFetchList(
          "projects:list",
          {
            fields: PROJECT_FIELDS,
            sort: ["-createdAt"],
          },
          LOOKUP_FETCH_LIMIT
        ),
        safeFetchList(
          "users:list",
          {
            fields: USER_FIELDS,
            sort: ["nickname", "username"],
          },
          LOOKUP_FETCH_LIMIT
        ),
        safeFetchList(
          "lawyers:list",
          {
            fields: LAWYER_FIELDS,
            sort: ["lawyerName", "id"],
          },
          LOOKUP_FETCH_LIMIT
        ),
        safeFetchList(
          "contracts:list",
          {
            sort: ["-createdAt"],
          },
          LOOKUP_FETCH_LIMIT
        ),
        safeFetchList(
          "quotations:list",
          {
            sort: ["-createdAt"],
          },
          LOOKUP_FETCH_LIMIT
        ),
      ]);

      const meetingIds = uniqueIds(meetings.map((meeting) => meeting.id));
      const attendeeRows =
        attendees.length || !meetingIds.length
          ? attendees
          : await safeFetchList(
              "meetingAttendees:list",
              {
                fields: ATTENDEE_FIELDS,
                filter: JSON.stringify({ meetingId: { $in: meetingIds } }),
                sort: ["meetingId", "isHost", "createdAt"],
              },
              LOOKUP_FETCH_LIMIT
            );
      const attendeeUserIds = uniqueIds(attendeeRows.map((row) => row.userId));
      const hostUserIds = uniqueIds(meetings.map((meeting) => meeting.hostId));
      const taskLawyerIds = uniqueIds(taskRows.map((task) => task.lawyerId));
      const projectIds = uniqueIds([
        ...meetings.map((meeting) => meeting.caseId),
        ...taskRows.map((task) => task.projectId),
        ...projectRows.map((project) => project.id),
      ]);

      const [userRows, taskLawyers, projectServiceRows] = await Promise.all([
        fetchRowsByIds("users:list", [...hostUserIds, ...attendeeUserIds, currentUserId], USER_FIELDS),
        fetchRowsByIds("lawyers:list", [...scopeLawyerIds, ...taskLawyerIds], LAWYER_FIELDS),
        projectIds.length
          ? safeFetchList(
              "projectServices:list",
              {
                fields: PROJECT_SERVICE_FIELDS,
                filter: JSON.stringify({ projectId: { $in: projectIds } }),
                sort: ["projectId", "id"],
              },
              LOOKUP_FETCH_LIMIT
            )
          : Promise.resolve([]),
      ]);

      const serviceCatalogIds = uniqueIds([
        ...projectServiceRows.map((item) => item.serviceId || item.services),
        ...taskRows.map((task) => task.serviceId || task.services),
      ]);
      const serviceCatalogRows = await fetchRowsByIds(
        "services:list",
        serviceCatalogIds,
        SERVICE_FIELDS
      );
      const mergedProjectServices = mergeProjectServicesWithCatalog(
        projectServiceRows,
        serviceCatalogRows
      );

      const recordsWithCustomers = [...projectRows, ...contractRows, ...quotationRows];
      const directCustomers = recordsWithCustomers
        .map((record) => record.customer || record.customers)
        .filter((customer) => customer && typeof customer === "object");
      const customerIds = uniqueIds([
        ...recordsWithCustomers.map((record) => record.customerId || record.customer || record.customers),
        ...directCustomers,
      ]);
      const customerRows = uniqueRowsById([
        ...directCustomers,
        ...(await fetchRowsByIds("customers:list", customerIds, CUSTOMER_FIELDS)),
      ]);

      const mergedUsers = uniqueRowsById([...allUserRows, ...userRows, user].filter(Boolean));
      const mergedLawyers = uniqueRowsById([...allLawyerRows, ...taskLawyers, ...scopeLawyers]);
      const usersById = buildMapById(mergedUsers);
      const projectMap = buildMapById(projectRows);
      const customerMap = buildMapById(customerRows);
      const lawyerMap = buildMapById(mergedLawyers);
      const servicesByValue = {};
      [...mergedProjectServices, ...serviceCatalogRows].forEach((service) => {
        const value = projectServiceTaskValue(service) || extractId(service?.id);
        if (value) servicesByValue[String(value)] = service;
      });
      const attendeesByMeeting = {};
      attendeeRows.forEach((row) => {
        const meetingId = extractId(row?.meetingId);
        if (!meetingId) return;
        if (!attendeesByMeeting[meetingId]) attendeesByMeeting[meetingId] = [];
        attendeesByMeeting[meetingId].push(row);
      });

      const meetingItems = meetings
        .map((meeting) =>
          mapMeetingToCalendarItem({
            meeting,
            currentUserId,
            attendeesByMeeting,
            usersById,
            casesById: projectMap,
            customersById: customerMap,
          })
        )
        .filter((item) => item.date);
      const taskItems = taskRows
        .map((task) =>
          mapTaskToCalendarItem({
            task,
            lawyersById: lawyerMap,
            casesById: projectMap,
            customersById: customerMap,
            servicesByValue,
            scopeLawyerIds,
          })
        )
        .filter((item) => item.date);

      setCases(projectRows);
      setCustomers(customerRows);
      setProjectServices(mergedProjectServices);
      setUsers(mergedUsers);
      setLawyers(mergedLawyers);
      setContracts(contractRows);
      setQuotations(quotationRows);
      setRows([...meetingItems, ...taskItems].sort(sortByDateTime));
    } catch (error) {
      console.error("[MeetingCalendarDemoBlock] reload failed", error);
      message?.error?.(error?.message || "Could not load calendar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = String(filters.keyword || "").trim().toLowerCase();
    return rows.filter((item) => {
      if (filters.kind !== "all" && item.kind !== filters.kind) return false;
      if (filters.status !== "all" && normalizeStatus(item.status) !== filters.status) return false;
      if (filters.caseId !== "all" && item.caseId !== filters.caseId) return false;
      if (keyword && !itemSearchText(item).includes(keyword)) return false;
      if (!isWithinRange(item.date, range)) return false;
      return true;
    }).sort(sortByDateTime);
  }, [filters, rows, range]);

  const itemsByDate = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const key = item.date;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      acc[key].sort(sortByDateTime);
      return acc;
    }, {});
  }, [filteredItems]);

  const selectedItems = itemsByDate[toDateKey(selectedDate)] || [];
  const upcomingItems = filteredItems.filter((item) => item.date >= toDateKey(today));
  const meetingCount = filteredItems.filter((item) => item.kind === "meeting").length;
  const taskCount = filteredItems.filter((item) => item.kind === "task").length;

  const resetFilters = () => {
    setRange(null);
    setFilters({
      keyword: "",
      kind: "all",
      status: "all",
      caseId: "all",
    });
  };

  const openQuickCreate = (kind, dateKey, sourceItem) => {
    const safeKind =
      kind === "task"
        ? "task"
        : kind === "meeting"
          ? "meeting"
          : filters.kind === "task"
            ? "task"
            : "meeting";
    const safeDateKey = dateKey || toDateKey(selectedDate);
    const caseId =
      sourceItem?.caseId ||
      (filters.caseId && filters.caseId !== "all" ? filters.caseId : undefined);
    const hostId = defaultHostId ? String(defaultHostId) : undefined;
    const lawyerId = defaultLawyerId ? String(defaultLawyerId) : undefined;
    quickCreateDirtyRef.current = false;
    quickCreateConfirmOpenRef.current = false;
    setQuickCreateDirty(false);
    quickForm.resetFields();
    quickForm.setFieldsValue({
      kind: safeKind,
      title:
        sourceItem && safeKind === "meeting"
          ? `Meeting: ${sourceItem.title}`
          : sourceItem && safeKind === "task"
            ? `Follow up: ${sourceItem.title}`
            : "",
      datetimeRange: buildDefaultDateTimeRange(safeDateKey, safeKind),
      status: safeKind === "meeting" ? "scheduled" : "todo",
      caseId,
      serviceId: undefined,
      hostId: safeKind === "meeting" ? hostId : undefined,
      attendeeIds: [],
      lawyerId: safeKind === "task" ? lawyerId : undefined,
      isRequiredApproval: "no",
      approvedById: undefined,
      contractId: undefined,
      quotationId: undefined,
      type: safeKind === "meeting" ? "internal" : undefined,
      location: undefined,
      description: "",
    });
    setQuickCreate({
      open: true,
      kind: safeKind,
      dateKey: safeDateKey,
      sourceItem: sourceItem || null,
    });
  };

  const forceCloseQuickCreate = () => {
    quickCreateDirtyRef.current = false;
    quickCreateConfirmOpenRef.current = false;
    setQuickCreateDirty(false);
    setQuickCreate((prev) => ({ ...prev, open: false }));
  };

  const closeQuickCreate = () => {
    if (!quickCreateDirtyRef.current) {
      forceCloseQuickCreate();
      return;
    }

    if (quickCreateConfirmOpenRef.current) return;
    quickCreateConfirmOpenRef.current = true;
    const title = "Discard unsaved calendar item?";
    const content = "Changes in this create form will be lost if you close it.";
    const confirmExit = () => {
      forceCloseQuickCreate();
    };
    const keepEditing = () => {
      quickCreateConfirmOpenRef.current = false;
    };

    if (Modal && typeof Modal.confirm === "function") {
      Modal.confirm({
        title,
        content,
        okText: "Discard",
        okType: "danger",
        cancelText: "Keep editing",
        onOk: confirmExit,
        onCancel: keepEditing,
      });
      return;
    }

    if (window.confirm(`${title}\n${content}`)) confirmExit();
    else keepEditing();
  };

  const submitQuickCreate = async () => {
    let values;
    try {
      values = await quickForm.validateFields();
    } catch {
      return;
    }
    const kind = values.kind === "task" ? "task" : "meeting";
    const rangeValues = Array.isArray(values.datetimeRange) ? values.datetimeRange : [];
    const startAt = toDate(rangeValues[0]);
    const endAt = toDate(rangeValues[1]);
    const dateKey = toDateKey(startAt) || quickCreate.dateKey || toDateKey(selectedDate);
    const title = String(values.title || "").trim();
    const hostId = extractId(values.hostId) || defaultHostId;
    const attendeeIds = uniqueIds(values.attendeeIds || []).filter((id) => id !== hostId);
    const linkedContractId = extractId(values.contractId);
    const linkedQuotationId = extractId(values.quotationId);
    const selectedLawyerId = extractId(values.lawyerId) || defaultLawyerId;
    const approvalRequired = values.isRequiredApproval === true || values.isRequiredApproval === "yes";
    const approverLawyerId = extractId(values.approvedById);
    if (!startAt || !endAt) {
      message?.error?.("Date time range is required.");
      return;
    }
    if (endAt < startAt) {
      message?.error?.("End time must be after start time.");
      return;
    }
    if (kind === "task" && !selectedLawyerId) {
      message?.error?.("Assignee is required.");
      return;
    }
    if (kind === "task" && approvalRequired && !approverLawyerId) {
      message?.error?.("Approver lawyer is required.");
      return;
    }
    try {
      if (kind === "meeting") {
        if (!hostId) {
          message?.error?.("Host is required to create meeting.");
          return;
        }
        const createRes = await ctx.api.request({
          url: "meetings:create",
          method: "POST",
          data: {
            title,
            meetingDate: toDateTimeString(startAt),
            startTime: timeToStorage(startAt),
            endTime: timeToStorage(endAt),
            status: values.status || "scheduled",
            type: values.type || "internal",
            location: String(values.location || "").trim() || null,
            description: String(values.description || "").trim() || null,
            hostId,
            caseId: extractId(values.caseId) || null,
          },
        });
        const meetingId = extractId(
          createRes?.data?.data?.id ||
          createRes?.data?.id ||
          createRes?.id
        );
        if (meetingId) {
          await ctx.api.request({
            url: "meetingAttendees:create",
            method: "POST",
            data: {
              meetingId,
              userId: hostId,
              isHost: true,
              attendanceStatus: "confirmed",
            },
          });
          for (const userId of attendeeIds) {
            await ctx.api.request({
              url: "meetingAttendees:create",
              method: "POST",
              data: {
                meetingId,
                userId,
                isHost: false,
                attendanceStatus: "pending",
              },
            });
          }
          const linkPayload = {};
          if (linkedContractId) linkPayload.contractId = linkedContractId;
          if (linkedQuotationId) linkPayload.quotationId = linkedQuotationId;
          if (Object.keys(linkPayload).length) {
            try {
              await ctx.api.request({
                url: `meetings:update?filterByTk=${meetingId}`,
                method: "POST",
                data: linkPayload,
              });
            } catch (linkError) {
              console.warn("[MeetingCalendarDemoBlock] optional meeting links were not saved", linkError);
              message?.warning?.("Meeting created, but optional links were not saved. Please check Meeting fields.");
            }
          }
        }
        message?.success?.("Meeting created.");
        try { ctx.eventBus?.emit?.(MEETING_CHANGED_EVENT, { action: "created", meetingId, changedAt: Date.now() }); } catch {}
      } else {
        const payload = {
          title,
          status: toTaskStorageStatus(values.status),
          priority: "medium",
          isRequiredApproval: approvalRequired,
        };
        if (selectedLawyerId) payload.lawyerId = selectedLawyerId;
        if (approvalRequired && approverLawyerId) payload.approvedById = approverLawyerId;
        if (extractId(values.caseId)) payload.projectId = extractId(values.caseId);
        if (extractId(values.serviceId)) payload.serviceId = extractId(values.serviceId);
        payload.startDate = startAt.toISOString();
        payload.dueDate = endAt.toISOString();
        if (String(values.description || "").trim()) {
          payload.description = String(values.description || "").trim();
        }
        const taskRes = await ctx.api.request({
          url: "tasks:create",
          method: "POST",
          data: payload,
        });
        const taskId = extractId(taskRes?.data?.data?.id || taskRes?.data?.id || taskRes?.id);
        message?.success?.("Task created.");
        try { ctx.eventBus?.emit?.(TASK_DETAIL_CHANGE_EVENT, { action: "created", taskId, changedAt: Date.now() }); } catch {}
      }
      setSelectedDate(toDate(`${dateKey}T00:00:00`) || selectedDate);
      setCursorDate(toDate(`${dateKey}T00:00:00`) || cursorDate);
      forceCloseQuickCreate();
      await reload();
    } catch (error) {
      console.error("[MeetingCalendarDemoBlock] create failed", error);
      message?.error?.(error?.message || "Could not create calendar item.");
    }
  };

  const handleCalendarDrop = async (event, targetDateKey, targetTime) => {
    const dragged = parseDraggedCalendarItem(event);
    if (!dragged?.id || !targetDateKey) return;
    const item =
      rows.find((row) => row.id === dragged.id) ||
      rows.find(
        (row) =>
          row.kind === dragged.kind &&
          String(row.recordId) === String(dragged.recordId),
      ) ||
      dragged;
    const recordId = extractId(item.recordId);
    if (!recordId) {
      message?.warning?.("Could not resolve calendar record.");
      return;
    }
    const movedRange = buildMovedRange(item, targetDateKey, targetTime);
    if (!movedRange?.startAt || !movedRange?.endAt) {
      message?.warning?.("Could not resolve target date/time.");
      return;
    }

    try {
      if (item.kind === "meeting") {
        await ctx.api.request({
          url: `meetings:update?filterByTk=${recordId}`,
          method: "POST",
          data: {
            meetingDate: toDateTimeString(movedRange.startAt),
            startTime: timeToStorage(movedRange.startAt),
            endTime: timeToStorage(movedRange.endAt),
          },
        });
        try {
          ctx.eventBus?.emit?.(MEETING_CHANGED_EVENT, {
            action: "rescheduled",
            meetingId: recordId,
            changedAt: Date.now(),
          });
        } catch {}
      } else {
        await ctx.api.request({
          url: `tasks:update?filterByTk=${recordId}`,
          method: "POST",
          data: {
            startDate: movedRange.startAt.toISOString(),
            dueDate: movedRange.endAt.toISOString(),
          },
        });
        try {
          ctx.eventBus?.emit?.(TASK_DETAIL_CHANGE_EVENT, {
            action: "rescheduled",
            taskId: recordId,
            changedAt: Date.now(),
          });
        } catch {}
      }

      const nextDate = toDate(`${targetDateKey}T00:00:00`);
      if (nextDate) {
        setSelectedDate(nextDate);
        setCursorDate(nextDate);
      }
      message?.success?.(`${item.kind === "meeting" ? "Meeting" : "Task"} rescheduled.`);
      await reload();
    } catch (error) {
      console.error("[MeetingCalendarDemoBlock] drag/drop reschedule failed", error);
      message?.error?.(error?.message || "Could not reschedule calendar item.");
    }
  };

  const moveCursor = (amount) => {
    if (viewMode === "day") {
      const next = addDays(selectedDate, amount);
      setCursorDate(next);
      setSelectedDate(next);
      return;
    }
    if (viewMode === "week") {
      const next = addDays(selectedDate, amount * 7);
      setCursorDate(next);
      setSelectedDate(next);
      return;
    }
    const next = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + amount, 1);
    setCursorDate(next);
    setSelectedDate(next);
  };

  const goToday = () => {
    setCursorDate(today);
    setSelectedDate(today);
  };

  const activeTitle =
    viewMode === "day"
      ? formatDateTitle(selectedDate)
      : viewMode === "week"
        ? formatWeekTitle(selectedDate)
        : formatMonthTitle(cursorDate);

  if (loading && !rows.length) {
    return React.createElement(
      "div",
      {
        style: {
          minHeight: 260,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: token.colorBgContainer,
          border: `1px solid ${token.colorSplit}`,
          borderRadius: token.borderRadius,
        },
      },
      React.createElement(Spin, null)
    );
  }

  const calendarView =
    viewMode === "week"
      ? React.createElement(WeekView, {
          selectedDate,
          setSelectedDate,
          itemsByDate,
          token,
          onOpenDetail: openCalendarItemDetail,
          onQuickCreate: openQuickCreate,
          onDropItem: handleCalendarDrop,
        })
      : viewMode === "day"
        ? React.createElement(DayView, {
            selectedDate,
            itemsByDate,
            token,
            onOpenDetail: openCalendarItemDetail,
            onQuickCreate: openQuickCreate,
            onDropItem: handleCalendarDrop,
          })
        : viewMode === "list"
          ? React.createElement(ListView, {
              items: filteredItems,
              token,
              onOpenDetail: openCalendarItemDetail,
            })
          : React.createElement(MonthView, {
              cursorDate,
              selectedDate,
              setSelectedDate,
              itemsByDate,
              token,
              onOpenDetail: openCalendarItemDetail,
              onQuickCreate: openQuickCreate,
              onDropItem: handleCalendarDrop,
            });

  return React.createElement(
    "div",
    {
      style: {
        fontFamily: "inherit",
        color: token.colorText,
        background: token.colorBgContainer,
        border: `1px solid ${token.colorSplit}`,
        borderRadius: token.borderRadius,
        padding: "14px 16px 16px",
        minWidth: 0,
        overflow: "hidden",
      },
    },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        },
      },
      React.createElement(
        Space,
        { size: 8, wrap: true },
        React.createElement(
          Title,
          { level: 4, style: { margin: 0, fontWeight: 600 } },
          CALENDAR_BLOCK_SCOPE === "my" ? "My Calendar" : "All Calendar"
        ),
        React.createElement(Tag, { color: "blue", style: { marginInlineEnd: 0 } }, `${meetingCount} meetings`),
        React.createElement(Tag, { color: "green", style: { marginInlineEnd: 0 } }, `${taskCount} tasks`)
      ),
      React.createElement(
        Space,
        { size: 8, wrap: true },
        React.createElement(
          Button,
          {
            type: "primary",
            onClick: () => openQuickCreate(null, toDateKey(selectedDate), null),
          },
          "Create new"
        ),
        React.createElement(Button, { loading, onClick: reload }, "Refresh"),
        React.createElement(Button, { onClick: goToday }, "Today"),
        React.createElement(Button, { onClick: () => moveCursor(-1) }, "<"),
        React.createElement(Button, { onClick: () => moveCursor(1) }, ">"),
        React.createElement(Segmented, { options: VIEW_OPTIONS, value: viewMode, onChange: setViewMode })
      )
    ),
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 12,
          flexWrap: "wrap",
        },
      },
      React.createElement(Text, { strong: true, style: { fontSize: 16 } }, activeTitle),
      React.createElement(Text, { type: "secondary" }, `${filteredItems.length} visible records`)
    ),
    React.createElement(FilterBar, { filters, setFilters, range, setRange, resetFilters, token, caseOptions }),
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 320px)",
          gap: 12,
          marginTop: 12,
          alignItems: "start",
          minWidth: 0,
        },
      },
      React.createElement("div", { style: { overflowX: "auto", minWidth: 0 } }, calendarView),
      React.createElement(AgendaPanel, {
        selectedDate,
        selectedItems,
        upcomingItems,
        token,
        onOpenDetail: openCalendarItemDetail,
        onQuickCreate: openQuickCreate,
      })
    ),
    React.createElement(QuickCreateModal, {
      openState: quickCreate,
      form: quickForm,
      caseOptions,
      projectServices,
      userOptions,
      lawyerOptions,
      contractOptions,
      quotationOptions,
      defaultHostId,
      defaultLawyerId,
      onCancel: closeQuickCreate,
      onDirtyChange: markQuickCreateDirty,
      onSubmit: submitQuickCreate,
    })
  );
};

ctx.render(React.createElement(CalendarWorkspaceDemo));
