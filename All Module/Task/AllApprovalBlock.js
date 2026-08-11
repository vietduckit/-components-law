const { React } = ctx;
const { useCallback, useEffect, useMemo, useRef, useState } = React;
const {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Empty,
  Input,
  Modal,
  Pagination,
  Popover,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  theme,
} = ctx.antd;

const { Text } = Typography;
const { RangePicker } = DatePicker || {};
const TextArea = Input?.TextArea;

// ─── Constants ─────────────────────────────────────────────────────────────────

const FONT = "inherit";
const CASE_PAGE_SIZE = 5;
const TASK_FETCH_LIMIT = 100;
const LOOKUP_FETCH_LIMIT = 200;
const TASK_DETAIL_POPUP_UID = "1a280d823ef";
const TASK_DETAIL_CHANGE_EVENT = "law-task-detail:changed";
const USER_VIEW_CONFIG_FIELD = "allTaskViewConfig";

// ─── Scope (All Approval vs My Approval) ──────────────────────────────────────

const APPROVAL_BLOCK_DEFAULT_SCOPE = "all";
// Reuse this file for My Approval by setting approvalScope/scope/mode = "my"
// or mode = "myApproval" through ctx.view.inputArgs / ctx.params.

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
      approvalScope: ctx.approvalScope || inputArgs.approvalScope || inputArgs.params?.approvalScope,
      approvalMode: ctx.approvalMode || inputArgs.approvalMode || inputArgs.params?.approvalMode,
      blockMode: ctx.blockMode || inputArgs.blockMode || inputArgs.params?.blockMode,
      mode: ctx.mode || inputArgs.mode || inputArgs.params?.mode,
      scope: ctx.scope || inputArgs.scope || inputArgs.params?.scope,
    };
  } catch {
    return {};
  }
};

const normalizeApprovalScope = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (
    [
      "my",
      "mine",
      "personal",
      "assigned",
      "approver",
      "reviewer",
      "myapproval",
      "my_approval",
      "my-approval",
      "my approval",
    ].includes(raw)
  )
    return "my";
  return "all";
};

const APPROVAL_BLOCK_RUNTIME_INPUT = getRuntimeInput();
const APPROVAL_BLOCK_SCOPE = normalizeApprovalScope(
  APPROVAL_BLOCK_RUNTIME_INPUT.approvalScope ||
    APPROVAL_BLOCK_RUNTIME_INPUT.approvalMode ||
    APPROVAL_BLOCK_RUNTIME_INPUT.blockMode ||
    APPROVAL_BLOCK_RUNTIME_INPUT.scope ||
    APPROVAL_BLOCK_RUNTIME_INPUT.mode ||
    APPROVAL_BLOCK_DEFAULT_SCOPE,
);

const BLOCK_VIEW_CONFIG_KEY =
  APPROVAL_BLOCK_SCOPE === "my" ? "myApprovals" : "allApprovals";

const TASK_FIELDS =
  "id,title,status,updatedAt,priority,startDate,dueDate,closedDate,lawyerId,projectId,projectInternalId,serviceId,description,isRequiredApproval,rejectionReason,approvedById,nextStepDescription,linkedUrl";
const SUBTASK_FIELDS =
  "id,subTaskName,status,priority,date,deadline,closedDate,lawyerId,taskId,description,isRequiredApproval,rejectionReason,approvedById,updatedAt,nextStepDescription,linkedUrl";
const LAWYER_FIELDS = "id,lawyerName,lawyerType,userId";
const PROJECT_FIELDS =
  "id,caseCode,projectName,createdAt,projectManagerId,customerId,customer";
const PROJECT_INTERNAL_FIELDS =
  "id,projectCode,projectName,description,createdAt";
const PROJECT_SERVICE_FIELDS =
  "id,projectId,serviceId,serviceName,serviceType,status";
const SERVICE_FIELDS = "id,serviceName,serviceType";
const CUSTOMER_FIELDS = "id,customerName,shortName";

// ─── Design tokens fallback ────────────────────────────────────────────────────

const FALLBACK_TOKEN = {
  colorBgContainer: "#fff",
  colorFillAlter: "#fafafa",
  colorText: "#262626",
  colorTextSecondary: "#8c8c8c",
  colorBorder: "#d9d9d9",
  colorSplit: "#f0f0f0",
  colorPrimary: "#1677ff",
  colorError: "#cf1322",
  colorWarning: "#d46b08",
  colorSuccess: "#389e0d",
  colorInfo: "#1677ff",
  borderRadius: 6,
  borderRadiusSM: 4,
  controlHeightSM: 24,
  paddingXS: 8,
  paddingSM: 12,
  padding: 16,
  marginXS: 8,
  marginSM: 12,
  margin: 16,
  fontSizeSM: 12,
};

const useNocoToken = () => {
  const result =
    theme && typeof theme.useToken === "function" ? theme.useToken() : null;
  return result?.token || FALLBACK_TOKEN;
};

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  toDo: {
    label: "Not Start",
    color: "default",
    bg: "#f5f5f5",
    border: "#d9d9d9",
    text: "#595959",
  },
  inProgress: {
    label: "In progress",
    color: "processing",
    bg: "#e6f4ff",
    border: "#91caff",
    text: "#0958d9",
  },
  blocked: {
    label: "Blocked",
    color: "purple",
    bg: "#f9f0ff",
    border: "#d3adf7",
    text: "#531dab",
  },
  pending: {
    label: "Pending approval",
    color: "warning",
    bg: "#fff7e6",
    border: "#ffd591",
    text: "#ad6800",
  },
  approval: {
    label: "Approved",
    color: "success",
    bg: "#f6ffed",
    border: "#b7eb8f",
    text: "#237804",
  },
  done: {
    label: "Done",
    color: "success",
    bg: "#f6ffed",
    border: "#b7eb8f",
    text: "#389e0d",
  },
  cancelled: {
    label: "Cancelled",
    color: "error",
    bg: "#fff1f0",
    border: "#ffa39e",
    text: "#a8071a",
  },
};

const STATUS_OPTIONS = Object.entries(STATUS_CFG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

// ─── Column & view mode definitions ───────────────────────────────────────────

const COLUMN_OPTIONS = [
  { value: "task", label: "Task", locked: true },
  { value: "case", label: "Case" },
  { value: "service", label: "Service" },
  { value: "status", label: "Status" },
  { value: "assignee", label: "Assignee" },
  { value: "approver", label: "Approver" },
  { value: "start", label: "Start" },
  { value: "due", label: "Due" },
  { value: "closedDate", label: "Closed date" },
  { value: "rejectionReason", label: "Rejection reason" },
  { value: "nextStep", label: "Next step" },
  { value: "updatedAt", label: "Updated" },
  { value: "actions", label: "Actions", locked: true },
];

const GROUP_BY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "status", label: "Status" },
  { value: "case", label: "Case" },
  { value: "projectInternal", label: "Internal project" },
  { value: "assignee", label: "Assignee" },
  { value: "approver", label: "Approver" },
  { value: "due", label: "Due date" },
  { value: "updatedAt", label: "Updated" },
];

const VIEW_MODE_OPTIONS = [
  { value: "table", label: "Table" },
  { value: "board", label: "Board" },
];

const SERVICE_GROUP_COLORS = {
  background: "#f6ffed",
  border: "#b7eb8f",
  text: "#237804",
};

const DATE_COLUMN_KEYS = ["start", "due", "closedDate", "updatedAt"];
const DEFAULT_VISIBLE_COLUMN_KEYS = [
  "task",
  "case",
  "status",
  "assignee",
  "approver",
  "start",
  "due",
  "rejectionReason",
  "updatedAt",
  "actions",
];
const DEFAULT_GROUP_BY = "status";
const DEFAULT_VIEW_MODE = "table";
const LOCKED_COLUMN_KEYS = COLUMN_OPTIONS.filter((c) => c.locked).map(
  (c) => c.value,
);
const DEFAULT_COLUMN_ORDER = COLUMN_OPTIONS.map((c) => c.value);
const DEFAULT_COLUMN_WIDTHS = {
  task: 240,
  case: 200,
  service: 160,
  status: 140,
  assignee: 140,
  approver: 140,
  start: 110,
  due: 110,
  closedDate: 120,
  rejectionReason: 220,
  nextStep: 180,
  updatedAt: 150,
  actions: 200,
};
const MIN_COLUMN_WIDTH = 80;

// Status priority order for board/group sorting (pending first)
const STATUS_SORT_ORDER = [
  "pending",
  "inProgress",
  "toDo",
  "blocked",
  "approval",
  "done",
  "cancelled",
];

// ─── Utility functions ─────────────────────────────────────────────────────────

const extractId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.length ? extractId(value[0]) : null;
  if (typeof value === "object")
    return value.id ? parseInt(value.id, 10) : null;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const compact = (items) =>
  items
    .map((item) =>
      item === undefined || item === null ? "" : String(item).trim(),
    )
    .filter(Boolean);

const uniqueIds = (items) =>
  Array.from(new Set((items || []).map(extractId).filter(Boolean)));

const uniqueById = (items) => {
  const seen = new Set();
  const output = [];
  (items || []).forEach((item) => {
    const id = extractId(item?.id);
    if (!id || seen.has(id)) return;
    seen.add(id);
    output.push(item);
  });
  return output;
};

const unwrapList = (res) => {
  const data = res?.data?.data ?? res?.data ?? [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizeText = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .replace(/[​-‍﻿]/g, "")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const formatDate = (value, mode = "date") => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
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

const toNativeDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value.$d) return value.$d;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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
  if (!Array.isArray(range) || range.length !== 2 || !range[0] || !range[1])
    return true;
  const date = toNativeDate(value);
  const start = toDateStart(range[0]);
  const end = toDateEnd(range[1]);
  if (!date || !start || !end) return false;
  return date >= start && date <= end;
};

const timestampValue = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const sortByCreatedAtDesc = (items = []) =>
  [...items].sort(
    (a, b) => timestampValue(b?.createdAt) - timestampValue(a?.createdAt),
  );

const projectLabel = (record, customerMap = {}) => {
  const caseCode = record?.caseCode || record?.projectCode || record?.code;
  const customer = projectCustomerLabel(record, customerMap);
  const projectName =
    record?.projectName || record?.caseName || record?.title || record?.name;
  return (
    compact([caseCode, customer, projectName]).join(" - ") ||
    (record?.id ? `Case #${record.id}` : "-")
  );
};

const projectInternalLabel = (record) =>
  compact([
    record?.projectCode || record?.caseCode || record?.code,
    record?.projectName ||
      record?.title ||
      record?.name ||
      record?.description,
  ]).join(" - ") ||
  (record?.id ? `Internal project #${record.id}` : "-");

const customerLabel = (record) =>
  record?.shortName ||
  record?.customerName ||
  record?.name ||
  record?.fullName ||
  (record?.id ? `Customer #${record.id}` : "");

const projectCustomerLabel = (project, customerMap = {}) => {
  const directCustomer = project?.customer || project?.customers;
  const directLabel =
    directCustomer && typeof directCustomer === "object"
      ? customerLabel(directCustomer)
      : "";
  if (directLabel) return directLabel;
  const customerId =
    extractId(project?.customerId) || extractId(directCustomer);
  return customerLabel(customerMap[customerId]);
};

const lawyerLabel = (record) =>
  record?.lawyerName ||
  record?.name ||
  record?.displayName ||
  (record?.id ? `User #${record.id}` : "-");

const serviceLabel = (record) => {
  const related = Array.isArray(record?.services)
    ? record.services[0]
    : record?.services;
  return (
    record?.serviceName ||
    record?._catalogServiceName ||
    related?.serviceName ||
    record?.service?.serviceName ||
    record?._serviceName ||
    record?.name ||
    related?.name ||
    record?.service?.name ||
    "-"
  );
};

const serviceKey = (record) => {
  const linkedServiceId =
    extractId(record?.serviceId) ||
    extractId(record?.ServiceId) ||
    extractId(record?.services);
  return String(linkedServiceId || extractId(record?.id) || "");
};

const taskTitle = (row) =>
  row.title ||
  row.subTaskName ||
  row.name ||
  `Task #${extractId(row.id) || ""}`;

const statusTag = (status) => {
  const cfg = STATUS_CFG[status] || { label: status || "-", color: "default" };
  return React.createElement(
    Tag,
    { color: cfg.color, style: { marginInlineEnd: 0 } },
    cfg.label,
  );
};

// ─── View config normalizers ───────────────────────────────────────────────────

const normalizeColumnKeys = (keys) => {
  const available = new Set(COLUMN_OPTIONS.map((c) => c.value));
  const incoming = Array.isArray(keys) ? keys : DEFAULT_VISIBLE_COLUMN_KEYS;
  const normalized = Array.from(
    new Set([...LOCKED_COLUMN_KEYS, ...incoming]),
  ).filter((key) => available.has(key));
  return normalized.length ? normalized : DEFAULT_VISIBLE_COLUMN_KEYS;
};

const normalizeColumnOrder = (keys) => {
  const available = new Set(COLUMN_OPTIONS.map((c) => c.value));
  const incoming = Array.isArray(keys) ? keys : DEFAULT_COLUMN_ORDER;
  const ordered = Array.from(new Set(incoming)).filter((key) =>
    available.has(key),
  );
  DEFAULT_COLUMN_ORDER.forEach((key) => {
    if (!ordered.includes(key)) ordered.push(key);
  });
  return ordered;
};

const normalizeColumnWidths = (value) => {
  const source = value && typeof value === "object" ? value : {};
  return DEFAULT_COLUMN_ORDER.reduce((acc, key) => {
    const width = Number(source[key]);
    acc[key] = Number.isFinite(width)
      ? Math.max(MIN_COLUMN_WIDTH, Math.round(width))
      : DEFAULT_COLUMN_WIDTHS[key];
    return acc;
  }, {});
};

const normalizeGroupBy = (value) =>
  GROUP_BY_OPTIONS.some((g) => g.value === value) ? value : DEFAULT_GROUP_BY;

const normalizeViewMode = (value) =>
  VIEW_MODE_OPTIONS.some((v) => v.value === value) ? value : DEFAULT_VIEW_MODE;

const normalizeSortConfig = (value) => {
  if (!value || typeof value !== "object") return null;
  const field = COLUMN_OPTIONS.some((c) => c.value === value.field)
    ? value.field
    : null;
  const direction =
    value.direction === "asc" || value.direction === "desc"
      ? value.direction
      : null;
  return field && direction ? { field, direction } : null;
};

// ─── Data fetching helpers ─────────────────────────────────────────────────────

const makeApproverFilter = (lawyerIds) => {
  const safeIds = uniqueIds(lawyerIds);
  if (!safeIds.length) return null;
  return safeIds.length === 1
    ? { approvedById: { $eq: safeIds[0] } }
    : { approvedById: { $in: safeIds } };
};

const fetchListPage = async (url, params = {}, pageSize = TASK_FETCH_LIMIT) => {
  const res = await ctx.api.request({
    url,
    params: { page: 1, pageSize, ...params },
  });
  return unwrapList(res);
};

const safeFetchListPage = async (
  url,
  params = {},
  pageSize = TASK_FETCH_LIMIT,
) => {
  try {
    return await fetchListPage(url, params, pageSize);
  } catch (error) {
    console.warn(`[AllApprovalBlock] ${url} failed`, error);
    return [];
  }
};

const fetchRowsByIds = async (url, ids, fields, sort = ["id"]) => {
  const safeIds = uniqueIds(ids);
  if (!safeIds.length) return [];
  return safeFetchListPage(
    url,
    { fields, filter: JSON.stringify({ id: { $in: safeIds } }), sort },
    Math.max(safeIds.length, TASK_FETCH_LIMIT),
  );
};

const fetchProjectServicesByProjectIds = async (projectIds) => {
  const safeIds = uniqueIds(projectIds);
  if (!safeIds.length) return [];
  return safeFetchListPage(
    "projectServices:list",
    {
      fields: PROJECT_SERVICE_FIELDS,
      filter: JSON.stringify({ projectId: { $in: safeIds } }),
      sort: ["id"],
    },
    LOOKUP_FETCH_LIMIT,
  );
};

const getServiceCatalogId = (record) =>
  extractId(record?.serviceId) ||
  extractId(record?.ServiceId) ||
  extractId(record?.services) ||
  extractId(record?.service);

const mergeProjectServicesWithCatalog = (projectServices = [], catalog = []) => {
  const catalogMap = {};
  catalog.forEach((service) => {
    const id = extractId(service?.id);
    if (id) catalogMap[id] = service;
  });

  return projectServices.map((projectService) => {
    const catalogId = getServiceCatalogId(projectService);
    const service = catalogId ? catalogMap[catalogId] : null;
    if (!service) return projectService;
    return {
      ...projectService,
      _catalogServiceName: service.serviceName || service.name || "",
      services: projectService.services || service,
    };
  });
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

const getUserViewConfig = (user) => {
  const root = parseJsonValue(user?.[USER_VIEW_CONFIG_FIELD]);
  if (!root) return null;
  if (Array.isArray(root)) return { visibleColumnKeys: root };
  const scoped =
    root[BLOCK_VIEW_CONFIG_KEY] &&
    typeof root[BLOCK_VIEW_CONFIG_KEY] === "object"
      ? root[BLOCK_VIEW_CONFIG_KEY]
      : root;
  return scoped && typeof scoped === "object" ? scoped : null;
};

const mergeUserViewConfig = (currentValue, nextView) => {
  const root = parseJsonValue(currentValue) || {};
  const currentScoped =
    root[BLOCK_VIEW_CONFIG_KEY] &&
    typeof root[BLOCK_VIEW_CONFIG_KEY] === "object"
      ? root[BLOCK_VIEW_CONFIG_KEY]
      : {};
  return { ...root, [BLOCK_VIEW_CONFIG_KEY]: { ...currentScoped, ...nextView } };
};

const fetchCurrentUserRecord = async () => {
  let user = getCurrentUserFromCtx();
  if (user) return user;
  try {
    const res = await ctx.api.request({ url: "auth:check", method: "GET" });
    return getResponseRecord(res);
  } catch (error) {
    console.warn("[AllApprovalBlock] auth:check failed", error);
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
    console.warn("[AllApprovalBlock] load user view config failed", error);
    return null;
  }
};

const fetchLawyersByUserId = async (userId) => {
  const safeUserId = extractId(userId);
  if (!safeUserId) return [];
  return safeFetchListPage(
    "lawyers:list",
    {
      fields: LAWYER_FIELDS,
      filter: JSON.stringify({ userId: { $eq: safeUserId } }),
      sort: ["id"],
    },
    LOOKUP_FETCH_LIMIT,
  );
};

// ─── Data enrichment ───────────────────────────────────────────────────────────

const enrichRows = ({
  tasks,
  subTasks,
  projects,
  projectInternals = [],
  services,
  lawyers,
  customers = [],
  contextTasks = [],
}) => {
  const projectMap = {};
  projects.forEach((p) => {
    const id = extractId(p?.id);
    if (id) projectMap[id] = p;
  });

  const customerMap = {};
  customers.forEach((customer) => {
    const id = extractId(customer?.id);
    if (id) customerMap[id] = customer;
  });

  const projectInternalMap = {};
  projectInternals.forEach((p) => {
    const id = extractId(p?.id);
    if (id) projectInternalMap[id] = p;
  });

  const lawyerMap = {};
  lawyers.forEach((l) => {
    const id = extractId(l?.id);
    if (id) lawyerMap[id] = l;
  });

  const projectServiceMap = {};
  services.forEach((svc) => {
    const projectId =
      extractId(svc?.projectId) || extractId(svc?.projects);
    const key = serviceKey(svc);
    if (projectId && key) projectServiceMap[`${projectId}:${key}`] = svc;
    const id = extractId(svc?.id);
    if (id) projectServiceMap[`ps:${id}`] = svc;
  });

  const taskMap = {};
  [...tasks, ...contextTasks].forEach((task) => {
    const id = extractId(task?.id);
    if (id) taskMap[id] = task;
  });

  const resolveProject = (row) =>
    projectMap[extractId(row?.projectId) || extractId(row?.projects)] || null;

  const resolveProjectInternal = (row) =>
    projectInternalMap[
      extractId(row?.projectInternalId) ||
        extractId(row?.projectInternal) ||
        extractId(row?.projectInternals)
    ] || null;

  const resolveLawyer = (row) =>
    lawyerMap[extractId(row?.lawyerId) || extractId(row?.lawyer)] || null;

  const resolveApprover = (row) =>
    lawyerMap[
      extractId(row?.approvedById) || extractId(row?.approvedBy)
    ] || null;

  const resolveService = (row) => {
    const projectId =
      extractId(row?.projectId) || extractId(row?.projects);
    const rowServiceKey = String(
      extractId(row?.serviceId) ||
        extractId(row?.ServiceId) ||
        extractId(row?.services) ||
        "",
    );
    return (
      projectServiceMap[`${projectId}:${rowServiceKey}`] ||
      projectServiceMap[`ps:${rowServiceKey}`] ||
      null
    );
  };

  const makeRow = (task, extra = {}) => {
    const project = resolveProject(task);
    const projectInternal = resolveProjectInternal(task);
    const lawyer = resolveLawyer(task);
    const approver = resolveApprover(task);
    const service = resolveService(task);
    const assigneeId = extractId(task.lawyerId) || extractId(task.lawyer);
    const approverId =
      extractId(task.approvedById) || extractId(task.approvedBy);

    return {
      ...task,
      recordType: "task",
      titleText: taskTitle(task),
      projectIdValue: extractId(task.projectId) || extractId(task.projects),
      projectLabel: projectLabel(project, customerMap),
      projectCreatedAtValue: project?.createdAt,
      projectInternalIdValue:
        extractId(task.projectInternalId) ||
        extractId(task.projectInternal) ||
        extractId(task.projectInternals),
      projectInternalLabel: projectInternalLabel(projectInternal),
      projectInternalCreatedAtValue: projectInternal?.createdAt,
      serviceLabelValue: serviceLabel(service),
      assigneeIdValue: assigneeId,
      assigneeLabel: assigneeId
        ? lawyerLabel(lawyer) !== "-"
          ? lawyerLabel(lawyer)
          : `Lawyer #${assigneeId}`
        : "Unassigned",
      approverIdValue: approverId,
      approverLabel: approverId
        ? lawyerLabel(approver) !== "-"
          ? lawyerLabel(approver)
          : `Lawyer #${approverId}`
        : "-",
      startDateValue: task.startDate,
      dueDateValue: task.dueDate,
      updatedAtValue: task.updatedAt,
      closedDateValue: task.closedDate,
      rejectionReasonValue: task.rejectionReason || "",
      nextStepValue: task.nextStepDescription || "",
      parentTaskId: null,
      parentTaskTitle: "",
      ...extra,
    };
  };

  const rows = tasks.map((task) => ({
    ...makeRow(task),
    key: `task-${extractId(task.id)}`,
  }));

  subTasks.forEach((subTask) => {
    const parentId =
      extractId(subTask.taskId) || extractId(subTask.tasks);
    const parent = taskMap[parentId];
    if (!parent) return;
    const parentBaseRow = makeRow(parent);
    const lawyer = resolveLawyer(subTask);
    const approver = resolveApprover(subTask);
    const assigneeId =
      extractId(subTask.lawyerId) || extractId(subTask.lawyer);
    const approverId =
      extractId(subTask.approvedById) || extractId(subTask.approvedBy);

    rows.push({
      ...subTask,
      key: `subTask-${extractId(subTask.id)}`,
      recordType: "subTask",
      titleText: taskTitle(subTask),
      projectIdValue: parentBaseRow.projectIdValue,
      projectLabel: parentBaseRow.projectLabel,
      projectCreatedAtValue: parentBaseRow.projectCreatedAtValue,
      projectInternalIdValue: parentBaseRow.projectInternalIdValue,
      projectInternalLabel: parentBaseRow.projectInternalLabel,
      projectInternalCreatedAtValue:
        parentBaseRow.projectInternalCreatedAtValue,
      serviceLabelValue: parentBaseRow.serviceLabelValue,
      assigneeIdValue: assigneeId,
      assigneeLabel: assigneeId
        ? lawyerLabel(lawyer) !== "-"
          ? lawyerLabel(lawyer)
          : `Lawyer #${assigneeId}`
        : "Unassigned",
      approverIdValue: approverId,
      approverLabel: approverId
        ? lawyerLabel(approver) !== "-"
          ? lawyerLabel(approver)
          : `Lawyer #${approverId}`
        : "-",
      startDateValue: subTask.date,
      dueDateValue: subTask.deadline,
      updatedAtValue: subTask.updatedAt,
      closedDateValue: subTask.closedDate,
      rejectionReasonValue: subTask.rejectionReason || "",
      nextStepValue: subTask.nextStepDescription || "",
      parentTaskId: parentId,
      parentTaskTitle: taskTitle(parent),
    });
  });

  return rows;
};

// ─── Grouping & sorting ────────────────────────────────────────────────────────

const getGroupInfo = (row, groupBy) => {
  if (groupBy === "all") {
    return { key: "all", label: "All approvals", sortValue: 0 };
  }
  if (groupBy === "status") {
    const cfg = STATUS_CFG[row.status] || {};
    return {
      key: `status:${row.status || "none"}`,
      label: cfg.label || row.status || "No status",
    };
  }
  if (groupBy === "case") {
    return {
      key: `case:${row.projectIdValue || "none"}`,
      label:
        row.projectLabel && row.projectLabel !== "-"
          ? row.projectLabel
          : "No case",
      sortValue: timestampValue(row.projectCreatedAtValue),
    };
  }
  if (groupBy === "projectInternal") {
    return {
      key: `projectInternal:${row.projectInternalIdValue || "none"}`,
      label:
        row.projectInternalLabel && row.projectInternalLabel !== "-"
          ? row.projectInternalLabel
          : "No internal project",
      sortValue: timestampValue(row.projectInternalCreatedAtValue),
    };
  }
  if (groupBy === "assignee") {
    return {
      key: `assignee:${row.assigneeIdValue || "none"}`,
      label: row.assigneeIdValue ? row.assigneeLabel : "Unassigned",
    };
  }
  if (groupBy === "approver") {
    return {
      key: `approver:${row.approverIdValue || "none"}`,
      label: row.approverIdValue ? row.approverLabel : "Not yet approved",
    };
  }
  if (groupBy === "due") {
    const label = formatDate(row.dueDateValue);
    return { key: `due:${label}`, label: label === "-" ? "No due date" : label };
  }
  if (groupBy === "updatedAt") {
    const label = formatDate(row.updatedAtValue);
    return {
      key: `updatedAt:${label}`,
      label: label === "-" ? "No update date" : label,
    };
  }
  return { key: "all", label: "All approvals" };
};

const rowMatchesGroupBy = (row, groupBy) => {
  if (groupBy === "all") return true;
  if (groupBy === "status") return !!row.status;
  if (groupBy === "case") return !!row.projectIdValue;
  if (groupBy === "projectInternal") return !!row.projectInternalIdValue;
  if (groupBy === "assignee") return !!row.assigneeIdValue;
  if (groupBy === "approver") return !!row.approverIdValue;
  if (groupBy === "due") return !!row.dueDateValue;
  if (groupBy === "updatedAt") return !!row.updatedAtValue;
  return true;
};

const getSubtaskParentKey = (row) => {
  const parentId =
    extractId(row?.parentTaskId) ||
    extractId(row?.taskId) ||
    extractId(row?.tasks);
  return parentId ? String(parentId) : "";
};

const orderRowsWithSubtasks = (rows = []) => {
  const taskKeys = new Set();
  const childrenByParent = {};

  rows.forEach((row) => {
    if (row?.recordType === "task") {
      const id = extractId(row.id);
      if (id) taskKeys.add(String(id));
      return;
    }

    if (row?.recordType === "subTask") {
      const parentKey = getSubtaskParentKey(row);
      if (!parentKey) return;
      if (!childrenByParent[parentKey]) childrenByParent[parentKey] = [];
      childrenByParent[parentKey].push(row);
    }
  });

  const ordered = [];
  rows.forEach((row) => {
    if (row?.recordType === "subTask") {
      const parentKey = getSubtaskParentKey(row);
      if (parentKey && taskKeys.has(parentKey)) return;
      ordered.push(row);
      return;
    }

    ordered.push(row);
    const taskKey = extractId(row?.id);
    (childrenByParent[String(taskKey)] || []).forEach((child) =>
      ordered.push(child),
    );
  });

  return ordered;
};

const buildGroups = (rows, groupBy) => {
  const buckets = {};
  const taskRowMap = {};

  rows.forEach((row) => {
    if (row?.recordType !== "task") return;
    const id = extractId(row.id);
    if (id) taskRowMap[String(id)] = row;
  });

  rows.forEach((row) => {
    const parentRow =
      row?.recordType === "subTask"
        ? taskRowMap[getSubtaskParentKey(row)]
        : null;
    const groupRow = parentRow || row;
    if (!rowMatchesGroupBy(groupRow, groupBy)) return;
    const group = getGroupInfo(groupRow, groupBy);
    if (!buckets[group.key]) buckets[group.key] = { ...group, rows: [] };
    buckets[group.key].rows.push(row);
    buckets[group.key].sortValue = Math.max(
      buckets[group.key].sortValue || 0,
      group.sortValue || 0,
    );
  });

  return Object.values(buckets)
    .map((group) => ({ ...group, rows: orderRowsWithSubtasks(group.rows) }))
    .sort((a, b) => {
      if (groupBy === "status") {
        const aStatus = a.key.replace("status:", "");
        const bStatus = b.key.replace("status:", "");
        const aIdx = STATUS_SORT_ORDER.indexOf(aStatus);
        const bIdx = STATUS_SORT_ORDER.indexOf(bStatus);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
      }
      if (groupBy === "case" || groupBy === "projectInternal") {
        return (
          (b.sortValue || 0) - (a.sortValue || 0) ||
          a.label.localeCompare(b.label)
        );
      }
      return a.label.localeCompare(b.label);
    });
};

// Tasks are always auto-subdivided by service within each top-level group.
// When the top-level grouping isn't already "Case", the sub-group label
// also carries the case (caseCode - customer shortName - case name) so the
// case context isn't lost.
const buildServiceSubGroups = (rows, topGroupBy) => {
  const showCaseLabel = normalizeGroupBy(topGroupBy) !== "case";
  const buckets = {};
  rows.forEach((row) => {
    const svcLabel =
      row.serviceLabelValue && row.serviceLabelValue !== "-"
        ? row.serviceLabelValue
        : "No service";
    const caseKey = row.projectIdValue || "none";
    const key = `${caseKey}::${svcLabel}`;
    if (!buckets[key]) {
      buckets[key] = {
        key,
        serviceLabel: svcLabel,
        caseLabel:
          row.projectLabel && row.projectLabel !== "-"
            ? row.projectLabel
            : "No case",
        sortValue: timestampValue(row.projectCreatedAtValue),
        rows: [],
      };
    }
    buckets[key].rows.push(row);
  });

  return Object.values(buckets)
    .map((group) => ({
      ...group,
      rows: orderRowsWithSubtasks(group.rows),
      label: showCaseLabel
        ? `${group.caseLabel} - ${group.serviceLabel}`
        : group.serviceLabel,
    }))
    .sort((a, b) =>
      showCaseLabel
        ? (b.sortValue || 0) - (a.sortValue || 0) ||
          a.label.localeCompare(b.label)
        : a.label.localeCompare(b.label),
    );
};

const getColumnValue = (row, field) => {
  if (field === "task") return row.titleText || "";
  if (field === "case") return row.projectLabel || "";
  if (field === "projectInternal") return row.projectInternalLabel || "";
  if (field === "service") return row.serviceLabelValue || "";
  if (field === "status") {
    const cfg = STATUS_CFG[row.status] || {};
    return cfg.label || row.status || "";
  }
  if (field === "assignee")
    return row.assigneeIdValue ? row.assigneeLabel : "Unassigned";
  if (field === "approver")
    return row.approverIdValue ? row.approverLabel : "-";
  if (field === "start") return formatDate(row.startDateValue);
  if (field === "due") return formatDate(row.dueDateValue);
  if (field === "closedDate") return formatDate(row.closedDateValue);
  if (field === "rejectionReason") return row.rejectionReasonValue || "";
  if (field === "nextStep") return row.nextStepValue || "";
  if (field === "updatedAt") return formatDate(row.updatedAtValue, "datetime");
  return "";
};

const compareValues = (a, b) =>
  String(a || "").localeCompare(String(b || ""), "vi", { numeric: true });

const getColumnSortValue = (row, field) => {
  const rawDate = DATE_COLUMN_KEYS.includes(field)
    ? (() => {
        if (field === "start") return row.startDateValue;
        if (field === "due") return row.dueDateValue;
        if (field === "closedDate") return row.closedDateValue;
        if (field === "updatedAt") return row.updatedAtValue;
        return null;
      })()
    : null;

  if (rawDate !== null) {
    const time = rawDate ? new Date(rawDate).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
  }
  if (DATE_COLUMN_KEYS.includes(field)) return 0;
  return getColumnValue(row, field);
};

const compareColumnRows = (a, b, field) => {
  const left = getColumnSortValue(a, field);
  const right = getColumnSortValue(b, field);
  if (typeof left === "number" || typeof right === "number") {
    return Number(left || 0) - Number(right || 0);
  }
  return compareValues(left, right);
};

// ─── Main component ────────────────────────────────────────────────────────────

const AllApprovalBlock = () => {
  const token = useNocoToken();

  // ── Data state ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUserFromCtx());
  const [currentLawyers, setCurrentLawyers] = useState([]);

  // ── View config state ─────────────────────────────────────────────────────────
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(
    DEFAULT_VISIBLE_COLUMN_KEYS,
  );
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);
  const [columnOrder, setColumnOrder] = useState(DEFAULT_COLUMN_ORDER);
  const [sortConfig, setSortConfig] = useState(null);
  const [groupBy, setGroupBy] = useState(DEFAULT_GROUP_BY);
  const [viewMode, setViewMode] = useState(DEFAULT_VIEW_MODE);
  const [columnFilters, setColumnFilters] = useState({});
  const [openColumnMenu, setOpenColumnMenu] = useState(null);
  const [casePage, setCasePage] = useState(1);

  // ── Filter state ──────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    statuses: [],
    assigneeIds: [],
    approverIds: [],
    caseIds: [],
    dateRange: null,
    keyword: "",
  });

  // ── Action state ──────────────────────────────────────────────────────────────
  const [approvingKey, setApprovingKey] = useState(null);
  const [rejectModal, setRejectModal] = useState({
    open: false,
    row: null,
    reason: "",
    submitting: false,
  });

  const detailRefreshTimerRef = useRef(null);

  const setFilter = (field, value) => {
    setCasePage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  // ── View config helpers ───────────────────────────────────────────────────────

  const getViewConfig = (overrides = {}) => ({
    visibleColumnKeys,
    groupBy,
    viewMode,
    columnWidths,
    columnOrder,
    sortConfig,
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
      console.warn("[AllApprovalBlock] save view config failed", error);
    }
  };

  const setColumns = (value) => {
    const nextKeys = normalizeColumnKeys(value);
    setVisibleColumnKeys(nextKeys);
    saveViewConfig(getViewConfig({ visibleColumnKeys: nextKeys }));
  };

  const setGroupByValue = (value) => {
    const nextGroupBy = normalizeGroupBy(value);
    setCasePage(1);
    setGroupBy(nextGroupBy);
    saveViewConfig(getViewConfig({ groupBy: nextGroupBy }));
  };

  const setViewModeValue = (value) => {
    const nextMode = normalizeViewMode(value);
    setCasePage(1);
    setOpenColumnMenu(null);
    setViewMode(nextMode);
    saveViewConfig(getViewConfig({ viewMode: nextMode }));
  };

  const resetColumns = () => {
    const nextKeys = normalizeColumnKeys(DEFAULT_VISIBLE_COLUMN_KEYS);
    const nextWidths = normalizeColumnWidths(DEFAULT_COLUMN_WIDTHS);
    const nextOrder = normalizeColumnOrder(DEFAULT_COLUMN_ORDER);
    setVisibleColumnKeys(nextKeys);
    setColumnWidths(nextWidths);
    setColumnOrder(nextOrder);
    setSortConfig(null);
    saveViewConfig(
      getViewConfig({
        visibleColumnKeys: nextKeys,
        columnWidths: nextWidths,
        columnOrder: nextOrder,
        sortConfig: null,
      }),
    );
    message.success("Columns reset.");
  };

  const resetFilters = () => {
    setCasePage(1);
    setColumnFilters({});
    setFilters({
      statuses: [],
      assigneeIds: [],
      approverIds: [],
      caseIds: [],
      dateRange: null,
      keyword: "",
    });
  };

  // ── Load current user ─────────────────────────────────────────────────────────

  const loadCurrentUser = useCallback(async () => {
    const user = await fetchCurrentUserRecord();
    if (!user) return;
    const userViewRecord = await fetchUserViewRecord(user?.id ?? user);
    const resolvedUser = userViewRecord ? { ...user, ...userViewRecord } : user;
    setCurrentUser(resolvedUser);

    const userViewConfig = getUserViewConfig(resolvedUser);
    if (userViewConfig?.visibleColumnKeys)
      setVisibleColumnKeys(normalizeColumnKeys(userViewConfig.visibleColumnKeys));
    if (userViewConfig?.groupBy)
      setGroupBy(normalizeGroupBy(userViewConfig.groupBy));
    if (userViewConfig?.columnWidths)
      setColumnWidths(normalizeColumnWidths(userViewConfig.columnWidths));
    if (userViewConfig?.columnOrder)
      setColumnOrder(normalizeColumnOrder(userViewConfig.columnOrder));
    if (userViewConfig?.sortConfig)
      setSortConfig(normalizeSortConfig(userViewConfig.sortConfig));
    if (userViewConfig?.viewMode)
      setViewMode(normalizeViewMode(userViewConfig.viewMode));

    const lawyerRows = await fetchLawyersByUserId(user?.id ?? user);
    setCurrentLawyers(lawyerRows);
  }, []);

  // ── Load data ─────────────────────────────────────────────────────────────────

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const baseFilter = { isRequiredApproval: { $eq: true } };
      let combinedFilter = baseFilter;
      let scopeLawyerRows = [];

      if (APPROVAL_BLOCK_SCOPE === "my") {
        const user = currentUser || (await fetchCurrentUserRecord());
        const userId = extractId(user?.id ?? user);
        if (user && !currentUser) setCurrentUser(user);
        scopeLawyerRows = await fetchLawyersByUserId(userId);
        setCurrentLawyers(scopeLawyerRows);
        const scopeLawyerIds = uniqueIds(scopeLawyerRows.map((l) => l?.id));
        const approverFilter = makeApproverFilter(scopeLawyerIds);
        if (!approverFilter) {
          setRows([]);
          setLawyers([]);
          setProjects([]);
          setCustomers([]);
          setLoading(false);
          return;
        }
        combinedFilter = { $and: [baseFilter, approverFilter] };
      }

      const [taskRows, subTaskRows] = await Promise.all([
        safeFetchListPage(
          "tasks:list",
          {
            fields: TASK_FIELDS,
            filter: JSON.stringify(combinedFilter),
            sort: ["-updatedAt"],
          },
          TASK_FETCH_LIMIT,
        ),
        safeFetchListPage(
          "subTasks:list",
          {
            fields: SUBTASK_FIELDS,
            filter: JSON.stringify(combinedFilter),
            sort: ["-updatedAt"],
          },
          TASK_FETCH_LIMIT,
        ),
      ]);

      if (
        taskRows.length >= TASK_FETCH_LIMIT ||
        subTaskRows.length >= TASK_FETCH_LIMIT
      ) {
        message.warning(
          `Đang hiển thị tối đa ${TASK_FETCH_LIMIT} tasks/subtasks. Dùng filter để thu hẹp kết quả và xem đầy đủ.`,
          6,
        );
      }

      const loadedTaskIds = new Set(uniqueIds(taskRows.map((t) => t?.id)));
      const parentTaskIds = uniqueIds(
        subTaskRows.map((st) => st?.taskId || st?.tasks),
      );
      const missingParentTaskIds = parentTaskIds.filter(
        (id) => !loadedTaskIds.has(id),
      );
      const parentTaskRows = await fetchRowsByIds(
        "tasks:list",
        missingParentTaskIds,
        TASK_FIELDS,
      );
      const taskContextRows = uniqueById([...taskRows, ...parentTaskRows]);

      const projectIds = uniqueIds(
        taskContextRows.map((t) => t?.projectId || t?.projects),
      );
      const projectInternalIds = uniqueIds(
        taskContextRows.map(
          (t) =>
            t?.projectInternalId || t?.projectInternal || t?.projectInternals,
        ),
      );
      const lawyerIds = uniqueIds([
        ...taskContextRows.map((t) => t?.lawyerId || t?.lawyer),
        ...taskContextRows.map((t) => t?.approvedById || t?.approvedBy),
        ...subTaskRows.map((st) => st?.lawyerId || st?.lawyer),
        ...subTaskRows.map((st) => st?.approvedById || st?.approvedBy),
      ]);

      const [lawyerRows, projectRows, projectInternalRows, serviceRows] =
        await Promise.all([
          fetchRowsByIds("lawyers:list", lawyerIds, LAWYER_FIELDS),
          fetchRowsByIds("projects:list", projectIds, PROJECT_FIELDS, [
            "-createdAt",
          ]),
          fetchRowsByIds(
            "projectInternal:list",
            projectInternalIds,
            PROJECT_INTERNAL_FIELDS,
            ["-createdAt"],
          ),
          fetchProjectServicesByProjectIds(projectIds),
        ]);
      const serviceCatalogIds = uniqueIds([
        ...taskContextRows.map(
          (task) => task?.serviceId || task?.ServiceId || task?.services,
        ),
        ...serviceRows.map(
          (service) =>
            service?.serviceId || service?.ServiceId || service?.services,
        ),
      ]);
      const serviceCatalogRows = await fetchRowsByIds(
        "services:list",
        serviceCatalogIds,
        SERVICE_FIELDS,
      );
      const mergedServiceRows = [
        ...mergeProjectServicesWithCatalog(serviceRows, serviceCatalogRows),
        ...serviceCatalogRows,
      ];

      const sortedProjectRows = sortByCreatedAtDesc(projectRows);
      const directCustomerRows = projectRows
        .map((p) => p?.customer || p?.customers)
        .filter((c) => c && typeof c === "object");
      const customerIds = uniqueIds([
        ...projectRows.map(
          (p) => p?.customerId || p?.customer || p?.customers,
        ),
        ...directCustomerRows,
      ]);
      const fetchedCustomerRows = await fetchRowsByIds(
        "customers:list",
        customerIds,
        CUSTOMER_FIELDS,
      );
      const customerRows = uniqueById([
        ...directCustomerRows,
        ...fetchedCustomerRows,
      ]);
      const mergedLawyerRows = uniqueById([...scopeLawyerRows, ...lawyerRows]);

      setLawyers(mergedLawyerRows);
      setProjects(sortedProjectRows);
      setCustomers(customerRows);

      const enrichedRows = enrichRows({
        tasks: taskRows,
        subTasks: subTaskRows,
        contextTasks: parentTaskRows,
        projects: sortedProjectRows,
        projectInternals: sortByCreatedAtDesc(projectInternalRows),
        services: mergedServiceRows,
        lawyers: mergedLawyerRows,
        customers: customerRows,
      }).sort(
        (a, b) =>
          new Date(b.updatedAtValue || 0) - new Date(a.updatedAtValue || 0),
      );

      setRows(enrichedRows);
    } catch (error) {
      console.error("[AllApprovalBlock] load failed", error);
      message.error("Could not load approval tasks.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    let active = true;
    const handleChanged = () => {
      if (!active) return;
      if (detailRefreshTimerRef.current)
        window.clearTimeout(detailRefreshTimerRef.current);
      detailRefreshTimerRef.current = window.setTimeout(() => {
        detailRefreshTimerRef.current = null;
        reload();
      }, 600);
    };
    window.addEventListener(TASK_DETAIL_CHANGE_EVENT, handleChanged);
    return () => {
      active = false;
      if (detailRefreshTimerRef.current)
        window.clearTimeout(detailRefreshTimerRef.current);
    };
  }, [reload]);

  // ── Approval actions ──────────────────────────────────────────────────────────

  const handleApprove = async (row) => {
    const recordId = extractId(row?.id);
    if (!recordId) {
      message.error("Could not resolve task id.");
      return;
    }
    if (approvingKey === row.key) return;

    if (!currentLawyers?.length) {
      message.error(
        "Bạn chưa có hồ sơ luật sư. Không thể ghi nhận người phê duyệt. Vui lòng liên hệ quản trị viên.",
      );
      return;
    }

    setApprovingKey(row.key);
    const collection = row.recordType === "subTask" ? "subTasks" : "tasks";
    const currentLawyerId = extractId(currentLawyers[0].id);

    try {
      await ctx.api.request({
        url: `${collection}:update?filterByTk=${recordId}`,
        method: "POST",
        data: {
          status: "approval",
          ...(currentLawyerId ? { approvedById: currentLawyerId } : {}),
        },
      });
      message.success("Task approved successfully.");
      await reload();
    } catch (error) {
      console.error("[AllApprovalBlock] approve failed", error);
      message.error("Could not approve task.");
    } finally {
      setApprovingKey(null);
    }
  };

  const openRejectModal = (row) => {
    setRejectModal({ open: true, row, reason: "", submitting: false });
  };

  const closeRejectModal = () => {
    if (rejectModal.submitting) return;
    setRejectModal({ open: false, row: null, reason: "", submitting: false });
  };

  const handleRejectConfirm = async () => {
    const { row, reason } = rejectModal;
    if (!reason?.trim()) {
      message.warning("Vui lòng nhập lý do từ chối.");
      return;
    }
    if (reason.trim().length > 500) {
      message.warning("Lý do từ chối không được vượt quá 500 ký tự.");
      return;
    }
    const recordId = extractId(row?.id);
    if (!recordId) {
      message.error("Could not resolve task id.");
      return;
    }

    setRejectModal((prev) => ({ ...prev, submitting: true }));
    const collection = row.recordType === "subTask" ? "subTasks" : "tasks";

    try {
      await ctx.api.request({
        url: `${collection}:update?filterByTk=${recordId}`,
        method: "POST",
        data: {
          status: "toDo",
          rejectionReason: reason.trim(),
        },
      });
      message.success("Task rejected and returned for revision.");
      setRejectModal({ open: false, row: null, reason: "", submitting: false });
      await reload();
    } catch (error) {
      console.error("[AllApprovalBlock] reject failed", error);
      message.error("Could not reject task.");
      setRejectModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // ── Computed values ───────────────────────────────────────────────────────────

  const filteredRows = useMemo(() => {
    const keyword = normalizeText(filters.keyword);
    return rows.filter((row) => {
      if (filters.statuses.length && !filters.statuses.includes(row.status))
        return false;
      if (
        filters.assigneeIds.length &&
        !filters.assigneeIds
          .map(String)
          .includes(String(row.assigneeIdValue || ""))
      )
        return false;
      if (
        filters.approverIds.length &&
        !filters.approverIds
          .map(String)
          .includes(String(row.approverIdValue || ""))
      )
        return false;
      if (
        filters.caseIds.length &&
        !filters.caseIds.map(String).includes(String(row.projectIdValue || ""))
      )
        return false;
      if (
        Array.isArray(filters.dateRange) &&
        filters.dateRange.length === 2 &&
        !inDateRange(row.dueDateValue, filters.dateRange)
      )
        return false;

      const colFilterEntries = Object.entries(columnFilters).filter(
        ([, values]) => Array.isArray(values) && values.length,
      );
      if (
        colFilterEntries.length &&
        !colFilterEntries.every(([field, values]) =>
          values.includes(getColumnValue(row, field)),
        )
      )
        return false;

      if (keyword) {
        const haystack = normalizeText(
          [
            row.titleText,
            row.parentTaskTitle,
            row.projectLabel,
            row.projectInternalLabel,
            row.serviceLabelValue,
            row.assigneeLabel,
            row.approverLabel,
            row.description,
            row.rejectionReasonValue,
            row.nextStepValue,
          ].join(" "),
        );
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    });
  }, [rows, filters, columnFilters]);

  const sortedRows = useMemo(() => {
    const output = [...filteredRows];
    if (sortConfig?.field && sortConfig?.direction) {
      output.sort((a, b) => {
        const result = compareColumnRows(a, b, sortConfig.field);
        return sortConfig.direction === "asc" ? result : -result;
      });
    }
    return output;
  }, [filteredRows, sortConfig]);

  const allGroups = useMemo(
    () => buildGroups(sortedRows, groupBy),
    [sortedRows, groupBy],
  );

  const totalCasePages = useMemo(
    () => Math.max(1, Math.ceil(allGroups.length / CASE_PAGE_SIZE)),
    [allGroups.length],
  );

  useEffect(() => {
    setCasePage((prev) => Math.min(Math.max(prev, 1), totalCasePages));
  }, [totalCasePages]);

  const caseServiceGroups = useMemo(() => {
    const start = (casePage - 1) * CASE_PAGE_SIZE;
    return allGroups.slice(start, start + CASE_PAGE_SIZE);
  }, [allGroups, casePage]);

  // ── Select options ────────────────────────────────────────────────────────────

  const assigneeOptions = useMemo(
    () =>
      lawyers
        .map((l) => ({ value: extractId(l.id), label: lawyerLabel(l) }))
        .filter((o) => o.value),
    [lawyers],
  );

  const approverOptions = useMemo(() => {
    const approverIds = new Set(
      rows.map((row) => row.approverIdValue).filter(Boolean),
    );
    return lawyers
      .filter((l) => approverIds.has(extractId(l.id)))
      .map((l) => ({ value: extractId(l.id), label: lawyerLabel(l) }))
      .filter((o) => o.value);
  }, [lawyers, rows]);

  const caseOptions = useMemo(() => {
    const customerMap = {};
    customers.forEach((c) => {
      const id = extractId(c?.id);
      if (id) customerMap[id] = c;
    });
    return sortByCreatedAtDesc(projects)
      .map((project) => {
        const caseText = projectLabel(project, customerMap);
        const customerText = projectCustomerLabel(project, customerMap);
        const searchText = compact([caseText, customerText]).join(" ");
        return {
          value: extractId(project.id),
          plainLabel: caseText,
          searchText,
          label: React.createElement(
            "div",
            { style: { lineHeight: 1.25, minWidth: 0 } },
            React.createElement(
              "div",
              { style: { overflow: "hidden", textOverflow: "ellipsis" } },
              caseText,
            ),
          ),
        };
      })
      .filter((o) => o.value);
  }, [projects, customers, token]);

  // ── Column management ─────────────────────────────────────────────────────────

  const getColumnFilterOptions = (field) => {
    const values = Array.from(
      new Set(rows.map((row) => getColumnValue(row, field)).filter(Boolean)),
    );
    return values
      .sort((a, b) => compareValues(a, b))
      .map((value) => ({ value, label: value }));
  };

  const setColumnFilterValue = (field, values) => {
    setCasePage(1);
    setColumnFilters((prev) => ({ ...prev, [field]: values || [] }));
  };

  const applySort = (field, direction) => {
    const nextSort = direction ? { field, direction } : null;
    setSortConfig(nextSort);
    saveViewConfig(getViewConfig({ sortConfig: nextSort }));
  };

  const hideColumn = (field) => {
    if (LOCKED_COLUMN_KEYS.includes(field)) return;
    const nextKeys = normalizeColumnKeys(
      visibleColumnKeys.filter((key) => key !== field),
    );
    setVisibleColumnKeys(nextKeys);
    saveViewConfig(getViewConfig({ visibleColumnKeys: nextKeys }));
  };

  const moveColumn = (field, direction) => {
    const currentOrder = normalizeColumnOrder(columnOrder);
    const index = currentOrder.indexOf(field);
    const target = direction === "left" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= currentOrder.length) return;
    const nextOrder = [...currentOrder];
    [nextOrder[index], nextOrder[target]] = [
      nextOrder[target],
      nextOrder[index],
    ];
    setColumnOrder(nextOrder);
    saveViewConfig(getViewConfig({ columnOrder: nextOrder }));
  };

  const clearColumnConfig = (field) => {
    const nextFilters = { ...columnFilters };
    delete nextFilters[field];
    const nextSort = sortConfig?.field === field ? null : sortConfig;
    const nextGroupBy = groupBy === field ? DEFAULT_GROUP_BY : groupBy;
    setCasePage(1);
    setColumnFilters(nextFilters);
    setSortConfig(nextSort);
    setGroupBy(nextGroupBy);
    setOpenColumnMenu(null);
    saveViewConfig(getViewConfig({ sortConfig: nextSort, groupBy: nextGroupBy }));
  };

  const startColumnResize = (field, event) => {
    if (!field || !event) return;
    event.preventDefault();
    event.stopPropagation();
    const ownerWindow = event.view || document.defaultView || window;
    const bodyStyle = ownerWindow?.document?.body?.style;
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
    const ListenerAbortController = ownerWindow?.AbortController || null;
    const listenerAbortController = ListenerAbortController
      ? new ListenerAbortController()
      : null;
    const listenerOptions = listenerAbortController
      ? { signal: listenerAbortController.signal }
      : undefined;

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
      listenerAbortController?.abort?.();
    };
    try {
      if (event.pointerId !== undefined)
        event.currentTarget?.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture is best-effort.
    }
    ownerWindow.addEventListener("pointermove", handleMove, listenerOptions);
    ownerWindow.addEventListener("pointerup", handleUp, listenerOptions);
    ownerWindow.addEventListener("pointercancel", handleUp, listenerOptions);
  };

  // ── Render helpers ────────────────────────────────────────────────────────────

  const renderColumnMenu = (field, label) => {
    const canGroupBy = GROUP_BY_OPTIONS.some((g) => g.value === field);
    const isGrouped = groupBy === field;
    const hasFilter =
      Array.isArray(columnFilters[field]) && columnFilters[field].length > 0;
    const btnStyle = { textAlign: "left", justifyContent: "flex-start" };

    return React.createElement(
      "div",
      {
        onMouseDown: (e) => e.stopPropagation(),
        style: { width: 270 },
      },
      // Header
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: token.marginXS,
            padding: `0 0 ${token.paddingXS}px`,
            borderBottom: `1px solid ${token.colorSplit}`,
            marginBottom: token.marginXS,
          },
        },
        React.createElement(Text, { strong: true }, label),
        React.createElement(
          Button,
          {
            size: "small",
            type: "text",
            onClick: () => setOpenColumnMenu(null),
          },
          "✕",
        ),
      ),
      // Sort
      React.createElement(
        Button,
        {
          type:
            sortConfig?.field === field && sortConfig.direction === "asc"
              ? "primary"
              : "text",
          block: true,
          onClick: () => applySort(field, "asc"),
          style: btnStyle,
        },
        "Sort ascending ↑",
      ),
      React.createElement(
        Button,
        {
          type:
            sortConfig?.field === field && sortConfig.direction === "desc"
              ? "primary"
              : "text",
          block: true,
          onClick: () => applySort(field, "desc"),
          style: btnStyle,
        },
        "Sort descending ↓",
      ),
      sortConfig?.field === field
        ? React.createElement(
            Button,
            {
              type: "text",
              block: true,
              onClick: () => applySort(field, null),
              style: btnStyle,
            },
            "Clear sort",
          )
        : null,
      // Column filter
      React.createElement(
        "div",
        {
          style: {
            marginTop: token.marginXS,
            paddingTop: token.paddingXS,
            borderTop: `1px solid ${token.colorSplit}`,
          },
        },
        React.createElement(
          Text,
          { type: hasFilter ? undefined : "secondary" },
          "Filter by values",
        ),
        React.createElement(Select, {
          mode: "multiple",
          allowClear: true,
          maxTagCount: "responsive",
          value: columnFilters[field] || [],
          options: getColumnFilterOptions(field),
          onChange: (values) => setColumnFilterValue(field, values),
          style: { width: "100%", marginTop: token.marginXS },
        }),
      ),
      // Group / hide / move
      React.createElement(
        Button,
        {
          type: isGrouped ? "primary" : "text",
          block: true,
          disabled: !canGroupBy,
          onClick: () => canGroupBy && setGroupByValue(field),
          style: { ...btnStyle, marginTop: token.marginXS },
        },
        "Group by values",
      ),
      React.createElement(
        Button,
        {
          type: "text",
          block: true,
          disabled: LOCKED_COLUMN_KEYS.includes(field),
          onClick: () => hideColumn(field),
          style: btnStyle,
        },
        "Hide field",
      ),
      React.createElement(
        Button,
        {
          type: "text",
          block: true,
          onClick: () => moveColumn(field, "left"),
          style: btnStyle,
        },
        "Move left",
      ),
      React.createElement(
        Button,
        {
          type: "text",
          block: true,
          onClick: () => moveColumn(field, "right"),
          style: btnStyle,
        },
        "Move right",
      ),
      React.createElement(
        Button,
        {
          type: "text",
          block: true,
          onClick: () => clearColumnConfig(field),
          style: {
            ...btnStyle,
            marginTop: token.marginXS,
            borderTop: `1px solid ${token.colorSplit}`,
          },
        },
        "✕ Clear column config",
      ),
    );
  };

  const renderColumnTitle = (field, label, tableScope = "main") => {
    const isGrouped = groupBy === field;
    const isSorted = sortConfig?.field === field;
    const hasFilter =
      Array.isArray(columnFilters[field]) && columnFilters[field].length > 0;
    const active = isGrouped || isSorted || hasFilter;
    const isMenuOpen =
      openColumnMenu?.field === field && openColumnMenu?.scope === tableScope;

    return React.createElement(
      "div",
      {
        style: {
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: token.marginXS,
          minHeight: 30,
          paddingInline: "8px 10px",
          marginInline: -8,
          borderRadius: token.borderRadiusSM,
          background: active ? token.colorFillAlter : undefined,
          borderLeft: isGrouped
            ? `3px solid ${token.colorPrimary}`
            : "3px solid transparent",
        },
      },
      React.createElement(
        "span",
        {
          style: {
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: isGrouped ? token.colorPrimary : undefined,
          },
        },
        `${label}${isSorted ? (sortConfig.direction === "asc" ? " ↑" : " ↓") : ""}`,
      ),
      React.createElement(
        Popover,
        {
          trigger: "click",
          placement: "bottomRight",
          content: renderColumnMenu(field, label),
          open: isMenuOpen,
          onOpenChange: (open) =>
            setOpenColumnMenu(open ? { field, scope: tableScope } : null),
        },
        React.createElement(
          Button,
          {
            size: "small",
            type: "text",
            onClick: (e) => e.stopPropagation(),
            style: { color: active ? token.colorPrimary : undefined },
          },
          "•••",
        ),
      ),
      React.createElement("span", {
        onPointerDown: (event) => startColumnResize(field, event),
        style: {
          position: "absolute",
          top: 4,
          right: 0,
          width: 8,
          height: "calc(100% - 8px)",
          borderRadius: 4,
          background: token.colorSplit,
          cursor: "col-resize",
          touchAction: "none",
          zIndex: 2,
        },
      }),
    );
  };

  const renderTaskTitleLink = (row, label, extraStyle = {}) => {
    const pathname = window.location?.pathname || "";
    const segments = pathname.split("/").filter(Boolean);
    const adminIndex = segments.findIndex(
      (s) => s.toLowerCase() === "admin",
    );
    const appId = adminIndex >= 0 ? segments[adminIndex + 1] : "";
    const baseSegments = appId ? ["admin", appId] : ["admin"];
    const taskId =
      row.recordType === "subTask"
        ? extractId(row.parentTaskId)
        : extractId(row.id);
    const subTaskId = row.recordType === "subTask" ? extractId(row.id) : null;
    const sourceProjectId = extractId(row.projectIdValue);
    const collectionName = subTaskId ? "subTasks" : "tasks";
    const recordType = subTaskId ? "subTask" : "task";
    const detailPathname = taskId
      ? `/${baseSegments.join("/")}/view/${TASK_DETAIL_POPUP_UID}/filterbytk/${encodeURIComponent(String(taskId))}`
      : "";
    const detailUrl = detailPathname
      ? `${window.location.origin}${detailPathname}`
      : "#";
    const openParams = {
      filterByTk: taskId,
      filterbytk: taskId,
      id: taskId,
      recordId: taskId,
      taskId,
      sourceRecordId: taskId,
      sourceTaskId: taskId,
      parentTaskId: taskId,
      subTaskId,
      sourceSubTaskId: subTaskId,
      selectedSubTaskId: subTaskId,
      recordType,
      collectionName,
      sourceId: sourceProjectId,
      sourceProjectId,
      sourceCaseId: sourceProjectId,
      projectId: sourceProjectId,
      caseId: sourceProjectId,
      pathname: detailPathname,
      linkedUrl: detailUrl,
    };
    const defineProperties = {};
    Object.keys(openParams).forEach((key) => {
      defineProperties[key] = {
        value: openParams[key],
        writable: true,
        enumerable: true,
        configurable: true,
      };
    });
    const popupTitle =
      subTaskId && row.parentTaskTitle
        ? `${label || "Subtask"} - ${row.parentTaskTitle}`
        : label || "Task detail";

    return React.createElement(
      "a",
      {
        href: detailUrl,
        onClick: async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (typeof ctx.openView === "function" && taskId) {
            try {
              await ctx.openView(TASK_DETAIL_POPUP_UID, {
                mode: "dialog",
                title: popupTitle,
                size: "large",
                navigation: false,
                ...openParams,
                inputArgs: openParams,
                params: openParams,
                defineProperties,
              });
            } catch (error) {
              console.error(
                "[AllApprovalBlock] open task detail via ctx.openView failed",
                error,
              );
              window.open(detailUrl, "_blank", "noopener,noreferrer");
            }
          } else if (taskId) {
            window.open(detailUrl, "_blank", "noopener,noreferrer");
          }
        },
        style: {
          display: "inline-block",
          maxWidth: "100%",
          color: token.colorPrimary,
          textDecoration: "none",
          overflow: "hidden",
          textOverflow: "ellipsis",
          verticalAlign: "bottom",
          whiteSpace: "nowrap",
          cursor: "pointer",
          ...extraStyle,
        },
      },
      label || "-",
    );
  };

  const renderActionsCell = (row) => {
    if (row.status !== "pending") return null;
    const isApproving = approvingKey === row.key;

    return React.createElement(
      Space,
      { size: 6, wrap: false },
      React.createElement(
        Button,
        {
          type: "primary",
          size: "small",
          loading: isApproving,
          onClick: () => handleApprove(row),
          style: {
            background: "#389e0d",
            borderColor: "#389e0d",
            minWidth: 82,
          },
        },
        "Phê duyệt",
      ),
      React.createElement(
        Button,
        {
          size: "small",
          danger: true,
          disabled: isApproving,
          onClick: () => openRejectModal(row),
          style: { minWidth: 72 },
        },
        "Từ chối",
      ),
    );
  };

  // ── Build table columns ───────────────────────────────────────────────────────

  const buildColumns = (tableScope = "main") => [
    {
      title: renderColumnTitle("task", "Task", tableScope),
      dataIndex: "titleText",
      key: "task",
      fixed: "left",
      width: columnWidths.task,
      render: (value, row) =>
        React.createElement(
          "div",
          {
            style: {
              minWidth: 0,
              display: row.parentTaskTitle ? "flex" : "block",
              alignItems: "flex-start",
              gap: token.marginXS,
            },
          },
          row.parentTaskTitle
            ? React.createElement(
                Tooltip,
                { title: `Subtask of: ${row.parentTaskTitle}` },
                React.createElement("span", {
                  style: {
                    width: 18,
                    height: 18,
                    marginTop: 2,
                    borderLeft: `1px solid ${token.colorBorder}`,
                    borderBottom: `1px solid ${token.colorBorder}`,
                    borderBottomLeftRadius: 4,
                    flex: "0 0 auto",
                  },
                }),
              )
            : null,
          React.createElement(
            "div",
            { style: { minWidth: 0 } },
            renderTaskTitleLink(row, value || "-"),
            
          ),
        ),
    },
    {
      title: renderColumnTitle("case", "Case", tableScope),
      dataIndex: "projectLabel",
      key: "case",
      width: columnWidths.case,
      ellipsis: true,
      render: (value) =>
        value && value !== "-"
          ? React.createElement(
              Tooltip,
              { title: value },
              React.createElement(Text, null, value),
            )
          : React.createElement(Text, { type: "secondary" }, "-"),
    },
    {
      title: renderColumnTitle("service", "Service", tableScope),
      dataIndex: "serviceLabelValue",
      key: "service",
      width: columnWidths.service,
      ellipsis: true,
      render: (value) =>
        value && value !== "-"
          ? React.createElement(Text, null, value)
          : React.createElement(Text, { type: "secondary" }, "-"),
    },
    {
      title: renderColumnTitle("status", "Status", tableScope),
      dataIndex: "status",
      key: "status",
      width: columnWidths.status,
      render: statusTag,
    },
    {
      title: renderColumnTitle("assignee", "Assignee", tableScope),
      dataIndex: "assigneeLabel",
      key: "assignee",
      width: columnWidths.assignee,
      ellipsis: true,
      render: (value, row) =>
        row.assigneeIdValue
          ? React.createElement(Text, null, value)
          : React.createElement(Text, { type: "secondary" }, "Unassigned"),
    },
    {
      title: renderColumnTitle("approver", "Approver", tableScope),
      dataIndex: "approverLabel",
      key: "approver",
      width: columnWidths.approver,
      ellipsis: true,
      render: (value, row) =>
        row.approverIdValue
          ? React.createElement(Text, { style: { color: "#237804" } }, value)
          : React.createElement(Text, { type: "secondary" }, "-"),
    },
    {
      title: renderColumnTitle("start", "Start", tableScope),
      dataIndex: "startDateValue",
      key: "start",
      width: columnWidths.start,
      render: (value) =>
        React.createElement(
          Text,
          { type: value ? undefined : "secondary" },
          formatDate(value),
        ),
    },
    {
      title: renderColumnTitle("due", "Due", tableScope),
      dataIndex: "dueDateValue",
      key: "due",
      width: columnWidths.due,
      render: (value) =>
        React.createElement(
          Text,
          { type: value ? undefined : "secondary" },
          formatDate(value),
        ),
    },
    {
      title: renderColumnTitle("closedDate", "Closed date", tableScope),
      dataIndex: "closedDateValue",
      key: "closedDate",
      width: columnWidths.closedDate,
      render: (value) =>
        React.createElement(
          Text,
          { type: value ? undefined : "secondary" },
          formatDate(value),
        ),
    },
    {
      title: renderColumnTitle("rejectionReason", "Rejection reason", tableScope),
      dataIndex: "rejectionReasonValue",
      key: "rejectionReason",
      width: columnWidths.rejectionReason,
      ellipsis: true,
      render: (value) =>
        value
          ? React.createElement(
              Tooltip,
              { title: value },
              React.createElement(
                Text,
                { type: "danger" },
                value,
              ),
            )
          : React.createElement(Text, { type: "secondary" }, "-"),
    },
    {
      title: renderColumnTitle("nextStep", "Next step", tableScope),
      dataIndex: "nextStepValue",
      key: "nextStep",
      width: columnWidths.nextStep,
      ellipsis: true,
      render: (value) =>
        value
          ? React.createElement(
              Tooltip,
              { title: value },
              React.createElement(Text, null, value),
            )
          : React.createElement(Text, { type: "secondary" }, "-"),
    },
    {
      title: renderColumnTitle("updatedAt", "Updated", tableScope),
      dataIndex: "updatedAtValue",
      key: "updatedAt",
      width: columnWidths.updatedAt,
      render: (value) =>
        React.createElement(
          Text,
          { type: "secondary" },
          formatDate(value, "datetime"),
        ),
    },
    {
      title: React.createElement(Text, { type: "secondary" }, "Actions"),
      key: "actions",
      width: columnWidths.actions,
      render: (_, row) => renderActionsCell(row),
    },
  ];

  const getVisibleColumns = (tableScope = "main") => {
    const keys = new Set(normalizeColumnKeys(visibleColumnKeys));
    const columnMap = buildColumns(tableScope).reduce((acc, col) => {
      acc[col.key] = col;
      return acc;
    }, {});
    return normalizeColumnOrder(columnOrder)
      .filter((key) => keys.has(key))
      .map((key) => columnMap[key])
      .filter(Boolean);
  };

  const tableScrollX = useMemo(() => {
    const keys = new Set(normalizeColumnKeys(visibleColumnKeys));
    const width = normalizeColumnOrder(columnOrder)
      .filter((key) => keys.has(key))
      .reduce(
        (sum, key) =>
          sum +
          (Number(columnWidths[key]) || DEFAULT_COLUMN_WIDTHS[key] || 120),
        0,
      );
    return Math.max(900, width);
  }, [visibleColumnKeys, columnOrder, columnWidths]);

  // ── Filter bar ────────────────────────────────────────────────────────────────

  const columnConfigContent = React.createElement(
    "div",
    { style: { width: 380 } },
    // View mode toggle
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          border: `1px solid ${token.colorBorder}`,
          borderRadius: token.borderRadius,
          overflow: "hidden",
          marginBottom: token.marginSM,
        },
      },
      VIEW_MODE_OPTIONS.map((item, index) => {
        const active = viewMode === item.value;
        return React.createElement(
          "button",
          {
            key: item.value,
            type: "button",
            onClick: () => setViewModeValue(item.value),
            style: {
              border: 0,
              borderLeft: index ? `1px solid ${token.colorSplit}` : 0,
              background: active
                ? token.colorFillAlter
                : token.colorBgContainer,
              color: active ? token.colorPrimary : token.colorText,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: token.marginXS,
              minHeight: 34,
              font: "inherit",
              fontSize: 13,
            },
          },
          item.label,
        );
      }),
    ),
    React.createElement(
      "div",
      {
        style: {
          marginBottom: token.marginXS,
          color: token.colorTextSecondary,
          fontSize: token.fontSizeSM,
        },
      },
      "Visible columns",
    ),
    React.createElement(
      Checkbox.Group,
      {
        value: visibleColumnKeys,
        onChange: setColumns,
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: token.marginXS,
          width: "100%",
        },
      },
      COLUMN_OPTIONS.map((item) =>
        React.createElement(
          Checkbox,
          {
            key: item.value,
            value: item.value,
            disabled: item.locked,
            style: { marginInlineStart: 0 },
          },
          item.locked ? `${item.label} (fixed)` : item.label,
        ),
      ),
    ),
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "flex-end",
          marginTop: token.marginSM,
          paddingTop: token.paddingXS,
          borderTop: `1px solid ${token.colorSplit}`,
        },
      },
      React.createElement(
        Button,
        { size: "small", onClick: resetColumns },
        "Reset columns",
      ),
    ),
  );

  const columnConfigControl = Popover
    ? React.createElement(
        Popover,
        {
          trigger: "click",
          placement: "bottomRight",
          title: "View config",
          content: columnConfigContent,
        },
        React.createElement(
          Button,
          { style: { width: "100%" } },
          "View config",
        ),
      )
    : null;

  const filterControlStyle = {
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  };
  const filterRowStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: token.marginXS,
    alignItems: "center",
    minWidth: 0,
    maxWidth: "100%",
  };
  const filterActionRowStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: token.marginXS,
    alignItems: "center",
    minWidth: 0,
    maxWidth: "100%",
  };
  const filterBar = React.createElement(
    "div",
    {
      style: {
        padding: token.paddingSM,
        borderBottom: `1px solid ${token.colorSplit}`,
        background: token.colorBgContainer,
        minWidth: 0,
        maxWidth: "100%",
        overflow: "hidden",
        boxSizing: "border-box",
      },
    },
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gap: token.marginXS,
          minWidth: 0,
          maxWidth: "100%",
        },
      },
      // Row 1: Case | Assignee | Approver | Status
      React.createElement(
        "div",
        { style: filterRowStyle },
        React.createElement(Select, {
          mode: "multiple",
          allowClear: true,
          showSearch: true,
          maxTagCount: "responsive",
          optionFilterProp: "searchText",
          optionLabelProp: "plainLabel",
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
          value: filters.assigneeIds,
          placeholder: "Assignee",
          options: assigneeOptions,
          onChange: (value) => setFilter("assigneeIds", value),
          style: filterControlStyle,
        }),
        React.createElement(Select, {
          mode: "multiple",
          allowClear: true,
          showSearch: true,
          maxTagCount: "responsive",
          optionFilterProp: "label",
          value: filters.approverIds,
          placeholder: "Approver",
          options: approverOptions,
          onChange: (value) => setFilter("approverIds", value),
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
      ),
      // Row 2: Search | Group by | Date range | View config | Reset
      React.createElement(
        "div",
        { style: filterActionRowStyle },
        React.createElement(Input.Search, {
          allowClear: true,
          value: filters.keyword,
          placeholder: "Search task, case, rejection reason...",
          onChange: (event) => setFilter("keyword", event.target.value),
          onSearch: (value) => setFilter("keyword", value),
          style: filterControlStyle,
        }),
        React.createElement(Select, {
          value: groupBy,
          options: GROUP_BY_OPTIONS,
          placeholder: "Group by",
          onChange: setGroupByValue,
          style: filterControlStyle,
        }),
        RangePicker
          ? React.createElement(RangePicker, {
              allowClear: true,
              value: filters.dateRange,
              format: "DD/MM/YYYY",
              placeholder: ["Due start", "Due end"],
              onChange: (value) => setFilter("dateRange", value || null),
              style: filterControlStyle,
            })
          : null,
        columnConfigControl,
        React.createElement(
          Button,
          { onClick: resetFilters, style: filterControlStyle },
          "Reset",
        ),
      ),
    ),
  );

  // ── Group section render ──────────────────────────────────────────────────────

  const getGroupColors = (groupKey) => {
    if (groupBy === "status") {
      const status = groupKey.replace("status:", "");
      const cfg = STATUS_CFG[status];
      if (cfg)
        return { background: cfg.bg, border: cfg.border, text: cfg.text };
    }
    if (groupBy === "case")
      return {
        background: "#e6f4ff",
        border: "#91caff",
        text: "#0958d9",
      };
    if (groupBy === "projectInternal")
      return {
        background: "#f0f5ff",
        border: "#adc6ff",
        text: "#1d39c4",
      };
    if (groupBy === "approver")
      return {
        background: "#f9f0ff",
        border: "#d3adf7",
        text: "#531dab",
      };
    if (groupBy === "assignee")
      return {
        background: "#fff7e6",
        border: "#ffd591",
        text: "#ad6800",
      };
    return {
      background: token.colorFillAlter,
      border: token.colorSplit,
      text: token.colorText,
    };
  };

  const renderServiceSubGroup = (subGroup) => {
    const pendingInSubGroup = subGroup.rows.filter(
      (row) => row.status === "pending",
    ).length;

    return React.createElement(
      "div",
      {
        key: subGroup.key,
        style: { borderTop: `1px solid ${token.colorSplit}` },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: token.marginXS,
            minHeight: 32,
            padding: `4px ${token.paddingSM}px`,
            background: SERVICE_GROUP_COLORS.background,
            borderBottom: `1px solid ${SERVICE_GROUP_COLORS.border}`,
            minWidth: 0,
          },
        },
        React.createElement(
          Tooltip,
          { title: subGroup.label },
          React.createElement(
            Text,
            {
              style: {
                color: SERVICE_GROUP_COLORS.text,
                fontSize: 13,
                fontWeight: 600,
                flex: 1,
                display: "block",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            },
            subGroup.label,
          ),
        ),
        pendingInSubGroup > 0
          ? React.createElement(
              Tag,
              { color: "warning", style: { marginInlineEnd: 0 } },
              `${pendingInSubGroup} pending`,
            )
          : null,
        React.createElement(
          Text,
          { type: "secondary", style: { fontSize: 12, flex: "0 0 auto" } },
          `${subGroup.rows.length}`,
        ),
      ),
      React.createElement(
        "div",
        {
          style: {
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            overflowX: "auto",
            overflowY: "hidden",
          },
        },
        React.createElement(Table, {
          size: "small",
          rowKey: "key",
          columns: getVisibleColumns(subGroup.key),
          dataSource: subGroup.rows,
          tableLayout: "fixed",
          pagination: {
            pageSize: 10,
            size: "small",
            showSizeChanger: false,
            hideOnSinglePage: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
            style: {
              padding: `${token.paddingXS}px ${token.paddingSM}px`,
              margin: 0,
            },
          },
          scroll: { x: tableScrollX },
          sticky: false,
          style: { width: "100%", minWidth: 0 },
        }),
      ),
    );
  };

  const renderGroupSection = (group) => {
    const groupColors = getGroupColors(group.key);
    const pendingInGroup = group.rows.filter(
      (row) => row.status === "pending",
    ).length;
    const serviceSubGroups = buildServiceSubGroups(group.rows, groupBy);

    return React.createElement(
      "section",
      {
        key: group.key,
        style: {
          display: "grid",
          gap: 0,
          border: `1px solid ${groupColors.border}`,
          borderRadius: token.borderRadius,
          background: token.colorBgContainer,
          overflow: "hidden",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: token.marginSM,
            minHeight: 42,
            padding: `${token.paddingXS}px ${token.paddingSM}px`,
            borderBottom: `1px solid ${groupColors.border}`,
            background: groupColors.background,
            borderRadius: `${token.borderRadius}px ${token.borderRadius}px 0 0`,
            minWidth: 0,
          },
        },
        React.createElement(
          Tooltip,
          { title: group.label },
          React.createElement(
            Text,
            {
              style: {
                color: groupColors.text,
                fontSize: 17,
                fontWeight: 700,
                flex: 1,
                display: "block",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            },
            group.label,
          ),
        ),
        pendingInGroup > 0
          ? React.createElement(
              Tag,
              { color: "warning", style: { marginInlineEnd: 0 } },
              `${pendingInGroup} pending`,
            )
          : null,
        React.createElement(
          Tag,
          {
            style: {
              marginInlineEnd: 0,
              background: groupColors.background,
              borderColor: groupColors.border,
              color: groupColors.text,
            },
          },
          `${group.rows.length} task${group.rows.length !== 1 ? "s" : ""}`,
        ),
      ),
      serviceSubGroups.map(renderServiceSubGroup),
    );
  };

  // ── Board view ────────────────────────────────────────────────────────────────

  const renderBoardView = () =>
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflowX: "auto",
          padding: token.paddingSM,
          background: token.colorBgLayout || token.colorBgContainer,
          boxSizing: "border-box",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridAutoFlow: "column",
            gridAutoColumns: "minmax(280px, 1fr)",
            gap: token.marginSM,
            minHeight: 360,
            minWidth: "max-content",
          },
        },
        STATUS_OPTIONS.map((statusOption) => {
          const cfg = STATUS_CFG[statusOption.value] || {};
          const bucketRows = sortedRows.filter(
            (row) => row.status === statusOption.value,
          );
          return React.createElement(
            "section",
            {
              key: statusOption.value,
              style: {
                display: "grid",
                gridTemplateRows: "auto minmax(0, 1fr)",
                gap: token.marginXS,
                padding: token.paddingXS,
                border: `1px solid ${cfg.border || token.colorSplit}`,
                borderRadius: token.borderRadius,
                background: cfg.bg || token.colorFillAlter,
                maxHeight: 680,
              },
            },
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  minHeight: 30,
                },
              },
              statusTag(statusOption.value),
              React.createElement(
                Text,
                { type: "secondary" },
                String(bucketRows.length),
              ),
            ),
            React.createElement(
              "div",
              {
                style: {
                  display: "grid",
                  alignContent: "start",
                  gap: token.marginXS,
                  minHeight: 0,
                  overflowY: "auto",
                  paddingRight: 2,
                },
              },
              bucketRows.length
                ? bucketRows.map((row) => {
                    const isPending = row.status === "pending";
                    return React.createElement(
                      "div",
                      {
                        key: row.key,
                        style: {
                          display: "grid",
                          gap: 6,
                          padding: token.paddingXS,
                          border: `1px solid ${token.colorSplit}`,
                          borderRadius: token.borderRadius,
                          background: token.colorBgContainer,
                        },
                      },
                      renderTaskTitleLink(row, row.titleText || "-", {
                        fontSize: 13,
                      }),
                      row.parentTaskTitle
                        ? React.createElement(
                            Text,
                            {
                              type: "secondary",
                              style: { fontSize: token.fontSizeSM },
                            },
                            `Subtask of: ${row.parentTaskTitle}`,
                          )
                        : null,
                      React.createElement(
                        Text,
                        {
                          type: "secondary",
                          style: { fontSize: token.fontSizeSM },
                        },
                        row.projectLabel && row.projectLabel !== "-"
                          ? row.projectLabel
                          : row.projectInternalLabel || "-",
                      ),
                      React.createElement(
                        "div",
                        {
                          style: {
                            display: "flex",
                            justifyContent: "space-between",
                            gap: token.marginXS,
                          },
                        },
                        React.createElement(
                          Text,
                          {
                            type: "secondary",
                            style: { fontSize: token.fontSizeSM },
                          },
                          row.assigneeLabel || "Unassigned",
                        ),
                        React.createElement(
                          Text,
                          {
                            type: "secondary",
                            style: { fontSize: token.fontSizeSM },
                          },
                          formatDate(row.dueDateValue),
                        ),
                      ),
                      row.rejectionReasonValue
                        ? React.createElement(
                            Text,
                            {
                              type: "danger",
                              style: {
                                fontSize: token.fontSizeSM,
                                display: "block",
                              },
                            },
                            `Rejected: ${row.rejectionReasonValue}`,
                          )
                        : null,
                      isPending
                        ? React.createElement(
                            "div",
                            {
                              style: {
                                display: "flex",
                                gap: 4,
                                marginTop: 2,
                              },
                            },
                            React.createElement(
                              Button,
                              {
                                type: "primary",
                                size: "small",
                                loading: approvingKey === row.key,
                                onClick: () => handleApprove(row),
                                style: {
                                  flex: 1,
                                  background: "#389e0d",
                                  borderColor: "#389e0d",
                                },
                              },
                              "Phê duyệt",
                            ),
                            React.createElement(
                              Button,
                              {
                                size: "small",
                                danger: true,
                                disabled: approvingKey === row.key,
                                onClick: () => openRejectModal(row),
                                style: { flex: 1 },
                              },
                              "Từ chối",
                            ),
                          )
                        : null,
                    );
                  })
                : React.createElement(
                    Text,
                    {
                      type: "secondary",
                      style: { padding: token.paddingXS },
                    },
                    "No tasks",
                  ),
            ),
          );
        }),
      ),
    );

  // ── Content render ────────────────────────────────────────────────────────────

  const renderContent = () => {
    if (loading && !rows.length) {
      return React.createElement(
        "div",
        { style: { padding: 48, textAlign: "center" } },
        React.createElement(Spin, null),
      );
    }
    // "All": flat list, không group theo Status/Case/..., không auto sub-group theo Service
  if (groupBy === "all" && viewMode !== "board") {
    if (!sortedRows.length) {
      return React.createElement(Empty, {
        image: Empty.PRESENTED_IMAGE_SIMPLE,
        description: "No approval tasks matched the current filters.",
        style: { padding: 48 },
      });
    }
    const flatRows = orderRowsWithSubtasks(sortedRows);
    const pendingInFlat = flatRows.filter((row) => row.status === "pending").length;
    return React.createElement(
      "div",
      {
        style: {
          padding: token.paddingSM,
          background: token.colorBgLayout || token.colorBgContainer,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflow: "hidden",
          boxSizing: "border-box",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            overflowX: "auto",
            overflowY: "hidden",
            border: `1px solid ${token.colorSplit}`,
            borderRadius: token.borderRadius,
            background: token.colorBgContainer,
          },
        },
        React.createElement(Table, {
          size: "small",
          rowKey: "key",
          columns: getVisibleColumns("all"),
          dataSource: flatRows,
          tableLayout: "fixed",
          pagination: {
            pageSize: 30,
            showSizeChanger: true,
            showTotal: (total) =>
              `${total} tasks${pendingInFlat ? ` · ${pendingInFlat} pending` : ""}`,
          },
          scroll: { x: tableScrollX, y: 640 },
          sticky: true,
          style: { width: "100%", minWidth: 0 },
        }),
      ),
    );
  }
    if (!allGroups.length) {
      return React.createElement(Empty, {
        image: Empty.PRESENTED_IMAGE_SIMPLE,
        description: "No approval tasks matched the current filters.",
        style: { padding: 48 },
      });
    }

    if (viewMode === "board") return renderBoardView();

    const paginationBar =
      allGroups.length > CASE_PAGE_SIZE && Pagination
        ? React.createElement(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "flex-end",
                paddingTop: token.paddingXS,
              },
            },
            React.createElement(Pagination, {
              size: "small",
              current: casePage,
              pageSize: CASE_PAGE_SIZE,
              total: allGroups.length,
              showSizeChanger: false,
              onChange: (page) => setCasePage(page),
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} groups`,
            }),
          )
        : null;

    return React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gap: token.marginSM,
          padding: token.paddingSM,
          background: token.colorBgLayout || token.colorBgContainer,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          overflow: "hidden",
          boxSizing: "border-box",
        },
      },
      caseServiceGroups.map(renderGroupSection),
      paginationBar,
    );
  };

  // ── Reject modal ──────────────────────────────────────────────────────────────

  const rejectModalEl = Modal
    ? React.createElement(
        Modal,
        {
          title: "Từ chối phê duyệt",
          open: rejectModal.open,
          onCancel: closeRejectModal,
          confirmLoading: rejectModal.submitting,
          onOk: handleRejectConfirm,
          okText: "Xác nhận từ chối",
          okButtonProps: { danger: true },
          cancelText: "Hủy",
          width: 480,
          destroyOnClose: true,
          maskClosable: !rejectModal.submitting,
        },
        React.createElement(
          "div",
          { style: { display: "grid", gap: token.marginSM } },
          // Task preview
          rejectModal.row
            ? React.createElement(
                "div",
                {
                  style: {
                    padding: `${token.paddingXS}px ${token.paddingSM}px`,
                    background: token.colorFillAlter,
                    borderRadius: token.borderRadiusSM,
                    border: `1px solid ${token.colorBorder}`,
                  },
                },
                React.createElement(
                  Text,
                  { strong: true, style: { display: "block" } },
                  rejectModal.row.titleText || "Task",
                ),
                React.createElement(
                  Text,
                  {
                    type: "secondary",
                    style: { fontSize: token.fontSizeSM },
                  },
                  compact([
                    rejectModal.row.projectLabel,
                    rejectModal.row.serviceLabelValue,
                  ]).join(" · ") || "-",
                ),
              )
            : null,
          // Reason input
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              {
                style: {
                  marginBottom: token.marginXS,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                },
              },
              React.createElement(Text, null, "Lý do từ chối"),
              React.createElement(
                "span",
                { style: { color: token.colorError } },
                " *",
              ),
            ),
            TextArea
              ? React.createElement(TextArea, {
                  value: rejectModal.reason,
                  onChange: (event) =>
                    setRejectModal((prev) => ({
                      ...prev,
                      reason: event.target.value,
                    })),
                  placeholder: "Nhập lý do từ chối để thông báo cho người thực hiện...",
                  rows: 4,
                  maxLength: 500,
                  showCount: true,
                  autoFocus: true,
                  disabled: rejectModal.submitting,
                })
              : React.createElement(Input, {
                  value: rejectModal.reason,
                  onChange: (event) =>
                    setRejectModal((prev) => ({
                      ...prev,
                      reason: event.target.value,
                    })),
                  placeholder: "Nhập lý do từ chối...",
                  disabled: rejectModal.submitting,
                }),
          ),
          React.createElement(
            Text,
            { type: "secondary", style: { fontSize: token.fontSizeSM } },
            "Task sẽ được trả về trạng thái \"Not Start\" kèm lý do từ chối.",
          ),
        ),
      )
    : null;

  // ── Stats summary ─────────────────────────────────────────────────────────────

  const pendingCount = rows.filter((row) => row.status === "pending").length;
  const approvedCount = rows.filter((row) => row.status === "approval").length;
  const totalCount = rows.length;

  // ── Root render ───────────────────────────────────────────────────────────────

  return React.createElement(
    React.Fragment,
    null,
    rejectModalEl,
    React.createElement(
      Card,
      {
        size: "small",
        title: React.createElement(
          Space,
          { size: 8 },
          React.createElement(
            Text,
            { strong: true },
            APPROVAL_BLOCK_SCOPE === "my" ? "My Approval" : "All Approval",
          ),
          pendingCount > 0
            ? React.createElement(
                Tooltip,
                {
                  title:
                    "Tổng số task chờ duyệt trong toàn bộ danh sách (không bị ảnh hưởng bởi filter hiện tại)",
                },
                React.createElement(
                  Tag,
                  { color: "warning", style: { margin: 0, cursor: "default" } },
                  `${pendingCount} chờ duyệt`,
                ),
              )
            : null,
        ),
        extra: React.createElement(
          Space,
          { size: 8 },
          totalCount > 0
            ? React.createElement(
                Text,
                { type: "secondary", style: { fontSize: token.fontSizeSM } },
                `${approvedCount}/${totalCount} đã duyệt`,
              )
            : null,
          React.createElement(
            Button,
            { size: "small", loading, onClick: reload },
            "Refresh",
          ),
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
          boxSizing: "border-box",
          fontFamily: FONT,
        },
      },
      filterBar,
      renderContent(),
    ),
  );
};

ctx.render(React.createElement(AllApprovalBlock, null));
