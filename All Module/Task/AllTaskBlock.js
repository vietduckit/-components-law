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

const FONT = "inherit";
const CASE_PAGE_SIZE = 5;
const TASK_FETCH_LIMIT = 100;
const LOOKUP_FETCH_LIMIT = 200;
// Reuse this file for a personal task page by setting this to "my",
// or pass taskScope/scope = "my" through ctx.view.inputArgs / ctx.params.
const TASK_BLOCK_DEFAULT_SCOPE = "all";

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
      taskScope:
        ctx.taskScope || inputArgs.taskScope || inputArgs.params?.taskScope,
      scope: ctx.scope || inputArgs.scope || inputArgs.params?.scope,
    };
  } catch {
    return {};
  }
};

const normalizeTaskScope = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();
  if (["my", "mine", "personal", "assigned", "assignee"].includes(raw))
    return "my";
  return "all";
};

const TASK_BLOCK_RUNTIME_INPUT = getRuntimeInput();
const TASK_BLOCK_SCOPE = normalizeTaskScope(
  TASK_BLOCK_RUNTIME_INPUT.taskScope ||
    TASK_BLOCK_RUNTIME_INPUT.scope ||
    TASK_BLOCK_DEFAULT_SCOPE,
);

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

const CASE_GROUP_COLORS = {
  background: "#e6f4ff",
  border: "#91caff",
  text: "#0958d9",
};

const SERVICE_GROUP_COLORS = {
  background: "#f6ffed",
  border: "#b7eb8f",
  text: "#237804",
};

const PROJECT_INTERNAL_GROUP_COLORS = {
  background: "#f0f5ff",
  border: "#adc6ff",
  text: "#1d39c4",
};

const FIELD_GROUP_COLORS = {
  status: { background: "#fff7e6", border: "#ffd591", text: "#ad6800" },
  assignee: { background: "#f9f0ff", border: "#d3adf7", text: "#531dab" },
  start: { background: "#e6fffb", border: "#87e8de", text: "#006d75" },
  due: { background: "#fff1f0", border: "#ffa39e", text: "#a8071a" },
  closedDate: { background: "#f0f5ff", border: "#adc6ff", text: "#1d39c4" },
  waiting: { background: "#fffbe6", border: "#ffe58f", text: "#ad8b00" },
  nextStep: { background: "#f5f5f5", border: "#d9d9d9", text: "#434343" },
  updatedAt: { background: "#f0f0f0", border: "#bfbfbf", text: "#262626" },
};

const useNocoToken = () => {
  const result =
    theme && typeof theme.useToken === "function" ? theme.useToken() : null;
  return result?.token || FALLBACK_TOKEN;
};

const STATUS_CFG = {
  toDo: { label: "Not Start", color: "default" },
  inProgress: { label: "In progress", color: "processing" },
  blocked: { label: "Blocked", color: "purple" },
  pending: { label: "Pending approval", color: "warning" },
  approval: { label: "Approved", color: "success" },
  done: { label: "Done", color: "success" },
  cancelled: { label: "Cancelled", color: "error" },
};

const STATUS_OPTIONS = Object.entries(STATUS_CFG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

const WAITING_OPTIONS = [
  { value: "blocked", label: "Blocked" },
  { value: "waiting_previous", label: "Waiting previous task" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "overdue", label: "Overdue" },
  { value: "unassigned", label: "Unassigned" },
  { value: "has_next_step", label: "Has next step" },
];

const COLUMN_OPTIONS = [
  { value: "task", label: "Task", locked: true },
  { value: "status", label: "Status" },
  { value: "assignee", label: "Assignee" },
  { value: "start", label: "Start" },
  { value: "due", label: "Due" },
  { value: "closedDate", label: "Closed date" },
  { value: "waiting", label: "Waiting issue" },
  { value: "nextStep", label: "Next step" },
  { value: "updatedAt", label: "Updated" },
];

const GROUP_BY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "case", label: "Case" },
  { value: "projectInternal", label: "Internal Work" },
  { value: "status", label: "Status" },
  { value: "assignee", label: "Assignee" },
  { value: "start", label: "Start" },
  { value: "due", label: "Due" },
  { value: "waiting", label: "Waiting issue" },
  { value: "nextStep", label: "Next step" },
  { value: "updatedAt", label: "Updated" },
  { value: "closedDate", label: "Closed date" },
];

const VIEW_MODE_OPTIONS = [
  { value: "table", label: "Table" },
  { value: "board", label: "Board" },
  { value: "roadmap", label: "Roadmap" },
];

const DATE_COLUMN_KEYS = ["start", "due", "closedDate", "updatedAt"];
const DEFAULT_VISIBLE_COLUMN_KEYS = [
  "task",
  "status",
  "assignee",
  "start",
  "due",
  "closedDate",
  "waiting",
  "nextStep",
  "updatedAt",
];
const DEFAULT_GROUP_BY = "case";
const DEFAULT_VIEW_MODE = "table";
const LOCKED_COLUMN_KEYS = COLUMN_OPTIONS.filter((item) => item.locked).map(
  (item) => item.value,
);
const DEFAULT_COLUMN_ORDER = COLUMN_OPTIONS.map((item) => item.value);
const DEFAULT_COLUMN_WIDTHS = {
  task: 280,
  status: 130,
  assignee: 160,
  start: 110,
  due: 110,
  closedDate: 130,
  waiting: 240,
  nextStep: 220,
  updatedAt: 150,
};
const MIN_COLUMN_WIDTH = 90;
const TASK_SELECTION_COLUMN_WIDTH = 42;
const TASK_ACTION_COLUMN_WIDTH = 92;
const TASK_DETAIL_POPUP_UID = "1a280d823ef";
const TASK_DETAIL_CHANGE_EVENT = "law-task-detail:changed";
const USER_VIEW_CONFIG_FIELD = "allTaskViewConfig";
const BLOCK_VIEW_CONFIG_KEY =
  TASK_BLOCK_SCOPE === "my" ? "myTasks" : "allTasks";
const TASK_FIELDS =
  "id,title,status,updatedAt,priority,startDate,dueDate,closedDate,lawyerId,projectId,projectInternalId,serviceId,description,estimatedDuration,isRequiredApproval,previousTaskId,blockedReason,nextStepDescription,linkedUrl";
const SUBTASK_FIELDS =
  "id,subTaskName,status,priority,date,deadline,closedDate,lawyerId,taskId,description,hourlyRate,estimatedDuration,isRequiredApproval,rejectionReason,approvedById,updatedAt,linkedUrl";
const LAWYER_FIELDS = "id,lawyerName,lawyerType,userId";
const PROJECT_FIELDS =
  "id,caseCode,projectName,createdAt,projectManagerId,customerId,customer";
const PROJECT_INTERNAL_FIELDS =
  "id,projectCode,projectName,description,createdAt";
const PROJECT_SERVICE_FIELDS =
  "id,projectId,serviceId,serviceName,serviceType,status";
const SERVICE_FIELDS = "id,serviceName,serviceType";
const CUSTOMER_FIELDS = "id,customerName,shortName";

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
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const isClosedStatus = (status) =>
  ["done", "cancelled"].includes(String(status || "").trim());

const isOverdue = (value, status) => {
  if (!value || isClosedStatus(status)) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

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
    record?.projectName || record?.title || record?.name || record?.description,
  ]).join(" - ") || (record?.id ? `Internal project #${record.id}` : "-");

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

const assigneeLabel = (id, lawyer) =>
  id
    ? lawyerLabel(lawyer) !== "-"
      ? lawyerLabel(lawyer)
      : `Lawyer #${id}`
    : "Unassigned";

const timestampValue = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

const sortByCreatedAtDesc = (items = []) =>
  [...items].sort(
    (a, b) => timestampValue(b?.createdAt) - timestampValue(a?.createdAt),
  );

const serviceKey = (record) => {
  const linkedServiceId =
    extractId(record?.serviceId) ||
    extractId(record?.ServiceId) ||
    extractId(record?.services);
  return String(linkedServiceId || extractId(record?.id) || "");
};

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

const waitingTags = (items = []) =>
  items.length
    ? items.map((item) =>
        React.createElement(
          Tag,
          {
            key: item.key,
            color: item.color || "default",
            style: { marginInlineEnd: 4, marginBottom: 4 },
          },
          item.label,
        ),
      )
    : React.createElement(Text, { type: "secondary" }, "-");

const normalizeColumnKeys = (keys) => {
  const available = new Set(COLUMN_OPTIONS.map((item) => item.value));
  const incoming = Array.isArray(keys) ? keys : DEFAULT_VISIBLE_COLUMN_KEYS;
  const normalized = Array.from(
    new Set([...LOCKED_COLUMN_KEYS, ...incoming]),
  ).filter((key) => available.has(key));
  return normalized.length ? normalized : DEFAULT_VISIBLE_COLUMN_KEYS;
};

const normalizeColumnOrder = (keys) => {
  const available = new Set(COLUMN_OPTIONS.map((item) => item.value));
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
  GROUP_BY_OPTIONS.some((item) => item.value === value)
    ? value
    : DEFAULT_GROUP_BY;

const normalizeViewMode = (value) =>
  VIEW_MODE_OPTIONS.some((item) => item.value === value)
    ? value
    : DEFAULT_VIEW_MODE;

const normalizeSortConfig = (value) => {
  if (!value || typeof value !== "object") return null;
  const field = COLUMN_OPTIONS.some((item) => item.value === value.field)
    ? value.field
    : null;
  const direction =
    value.direction === "asc" || value.direction === "desc"
      ? value.direction
      : null;
  return field && direction ? { field, direction } : null;
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
  return {
    ...root,
    [BLOCK_VIEW_CONFIG_KEY]: {
      ...currentScoped,
      ...nextView,
    },
  };
};

const fetchListPage = async (url, params = {}, pageSize = TASK_FETCH_LIMIT) => {
  const res = await ctx.api.request({
    url,
    params: {
      page: 1,
      pageSize,
      ...params,
    },
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
    console.warn(`[AllTaskBlock] ${url} failed`, error);
    return [];
  }
};

const fetchRowsByIds = async (url, ids, fields, sort = ["id"]) => {
  const safeIds = uniqueIds(ids);
  if (!safeIds.length) return [];
  return safeFetchListPage(
    url,
    {
      fields,
      filter: JSON.stringify({ id: { $in: safeIds } }),
      sort,
    },
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

const mergeProjectServicesWithCatalog = (
  projectServices = [],
  catalog = [],
) => {
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
    console.warn("[AllTaskBlock] load user view config failed", error);
    return null;
  }
};

const fetchCurrentUserRecord = async () => {
  let user = getCurrentUserFromCtx();
  if (user) return user;
  try {
    const res = await ctx.api.request({ url: "auth:check", method: "GET" });
    return getResponseRecord(res);
  } catch (error) {
    console.warn("[AllTaskBlock] auth:check failed", error);
    return null;
  }
};

const makeLawyerFilter = (lawyerIds) => {
  const safeIds = uniqueIds(lawyerIds);
  if (!safeIds.length) return null;
  return safeIds.length === 1
    ? { lawyerId: { $eq: safeIds[0] } }
    : { lawyerId: { $in: safeIds } };
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
  projects.forEach((project) => {
    const id = extractId(project?.id);
    if (id) projectMap[id] = project;
  });

  const customerMap = {};
  customers.forEach((customer) => {
    const id = extractId(customer?.id);
    if (id) customerMap[id] = customer;
  });

  const projectInternalMap = {};
  projectInternals.forEach((project) => {
    const id = extractId(project?.id);
    if (id) projectInternalMap[id] = project;
  });

  const lawyerMap = {};
  lawyers.forEach((lawyer) => {
    const id = extractId(lawyer?.id);
    if (id) lawyerMap[id] = lawyer;
  });

  const projectServiceMap = {};
  services.forEach((service) => {
    const projectId =
      extractId(service?.projectId) || extractId(service?.projects);
    const key = serviceKey(service);
    if (projectId && key) projectServiceMap[`${projectId}:${key}`] = service;
    const id = extractId(service?.id);
    if (id) projectServiceMap[`ps:${id}`] = service;
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
  const resolveService = (row) => {
    const projectId = extractId(row?.projectId) || extractId(row?.projects);
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

  const makeTaskRow = (task) => {
    const project = resolveProject(task);
    const projectInternal = resolveProjectInternal(task);
    const lawyer = resolveLawyer(task);
    const service = resolveService(task);
    return {
      ...task,
      key: `task-${extractId(task.id)}`,
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
      serviceLabel: serviceLabel(service),
      assigneeIdValue: extractId(task.lawyerId) || extractId(task.lawyer),
      assigneeLabel: assigneeLabel(
        extractId(task.lawyerId) || extractId(task.lawyer),
        lawyer,
      ),
      startDateValue: task.startDate,
      dueDateValue: task.dueDate,
      updatedAtValue: task.updatedAt,
      closedDateValue: task.closedDate,
      parentTaskId: null,
      parentTaskTitle: "",
    };
  };

  const rows = tasks.map(makeTaskRow);

  subTasks.forEach((subTask) => {
    const parentId = extractId(subTask.taskId) || extractId(subTask.tasks);
    const parent = taskMap[parentId];
    if (!parent) return;
    const parentRow = makeTaskRow(parent);
    const lawyer = resolveLawyer(subTask);
    rows.push({
      ...subTask,
      key: `subTask-${extractId(subTask.id)}`,
      recordType: "subTask",
      titleText: taskTitle(subTask),
      projectIdValue: parentRow.projectIdValue,
      projectLabel: parentRow.projectLabel,
      projectCreatedAtValue: parentRow.projectCreatedAtValue,
      projectInternalIdValue: parentRow.projectInternalIdValue,
      projectInternalLabel: parentRow.projectInternalLabel,
      projectInternalCreatedAtValue: parentRow.projectInternalCreatedAtValue,
      serviceLabel: parentRow.serviceLabel,
      assigneeIdValue: extractId(subTask.lawyerId) || extractId(subTask.lawyer),
      assigneeLabel: assigneeLabel(
        extractId(subTask.lawyerId) || extractId(subTask.lawyer),
        lawyer,
      ),
      startDateValue: subTask.date,
      dueDateValue: subTask.deadline,
      updatedAtValue: subTask.updatedAt,
      closedDateValue: subTask.closedDate,
      parentTaskId: parentId,
      parentTaskTitle: taskTitle(parent),
      previousTaskId: null,
      blockedReason: subTask.blockedReason || "",
      nextStepDescription: subTask.nextStepDescription || "",
    });
  });

  const rowTaskMap = {};
  rows.forEach((row) => {
    if (row.recordType === "task") rowTaskMap[extractId(row.id)] = row;
  });

  return rows.map((row) => {
    const waiting = [];
    const status = String(row.status || "").trim();
    const prevTaskId = extractId(row.previousTaskId);
    const prevTask = prevTaskId ? rowTaskMap[prevTaskId] : null;
    const prevOpen = prevTask && !isClosedStatus(prevTask.status);
    const overdue = isOverdue(row.dueDateValue, status);

    if (status === "blocked") {
      waiting.push({ key: "blocked", label: "Blocked", color: "purple" });
    }
    if (prevTaskId && prevOpen) {
      waiting.push({
        key: "waiting_previous",
        label: "Waiting previous task",
        color: "processing",
      });
    }
    if (status === "pending") {
      waiting.push({
        key: "pending_approval",
        label: "Pending approval",
        color: "warning",
      });
    }
    if (overdue) {
      waiting.push({ key: "overdue", label: "Overdue", color: "error" });
    }
    if (!row.assigneeIdValue) {
      waiting.push({
        key: "unassigned",
        label: "Unassigned",
        color: "default",
      });
    }
    if (row.nextStepDescription) {
      waiting.push({
        key: "has_next_step",
        label: "Has next step",
        color: "blue",
      });
    }

    const waitingText = compact([
      prevOpen ? `Waiting: ${prevTask.titleText}` : "",
      row.blockedReason ? `Reason: ${row.blockedReason}` : "",
      row.nextStepDescription ? `Next: ${row.nextStepDescription}` : "",
    ]).join(" | ");

    return {
      ...row,
      waiting,
      waitingKeys: waiting.map((item) => item.key),
      waitingText,
      previousTaskTitle: prevTask?.titleText || "",
      previousTaskStatus: prevTask?.status || "",
      isOverdueValue: overdue,
    };
  });
};

const getPrimaryWaitingLabel = (row) => {
  if (!row.waiting?.length) return "No waiting issue";
  return row.waiting[0]?.label || "Waiting issue";
};

const getGroupInfo = (row, groupBy) => {
  const key = normalizeGroupBy(groupBy);
  if (key === "all") {
    return { key: "all", label: "All tasks", sortValue: 0 };
  }
  if (key === "case") {
    return {
      key: `case:${row.projectIdValue || "none"}`,
      label:
        row.projectLabel && row.projectLabel !== "-"
          ? row.projectLabel
          : "No case",
      sortValue: timestampValue(row.projectCreatedAtValue),
    };
  }
  if (key === "projectInternal") {
    return {
      key: `projectInternal:${row.projectInternalIdValue || "none"}`,
      label:
        row.projectInternalLabel && row.projectInternalLabel !== "-"
          ? row.projectInternalLabel
          : "No internal project",
      sortValue: timestampValue(row.projectInternalCreatedAtValue),
    };
  }
  if (key === "status") {
    const cfg = STATUS_CFG[row.status] || {};
    return {
      key: `status:${row.status || "none"}`,
      label: cfg.label || row.status || "No status",
    };
  }
  if (key === "assignee") {
    return {
      key: `assignee:${row.assigneeIdValue || "none"}`,
      label: row.assigneeIdValue ? row.assigneeLabel : "Unassigned",
    };
  }
  if (key === "start") {
    const label = formatDate(row.startDateValue);
    return {
      key: `start:${label}`,
      label: label === "-" ? "No start date" : label,
    };
  }
  if (key === "due") {
    const label = formatDate(row.dueDateValue);
    return {
      key: `due:${label}`,
      label: label === "-" ? "No due date" : label,
    };
  }
  if (key === "waiting") {
    const label = getPrimaryWaitingLabel(row);
    return { key: `waiting:${row.waitingKeys[0] || "none"}`, label };
  }
  if (key === "nextStep") {
    return {
      key: row.nextStepDescription
        ? `nextStep:${row.nextStepDescription}`
        : "nextStep:none",
      label: row.nextStepDescription || "No next step",
    };
  }
  if (key === "updatedAt") {
    const label = formatDate(row.updatedAtValue);
    return {
      key: `updatedAt:${label}`,
      label: label === "-" ? "No updated date" : label,
    };
  }
  if (key === "closedDate") {
    const label = formatDate(row.closedDateValue);
    return {
      key: `closedDate:${label}`,
      label: label === "-" ? "No closed date" : label,
    };
  }
  return { key: "all", label: "All tasks" };
};

const rowMatchesGroupBy = (row, groupBy) => {
  const key = normalizeGroupBy(groupBy);
  if (key === "all") return true;
  if (key === "case") return !!row.projectIdValue;
  if (key === "projectInternal") return !!row.projectInternalIdValue;
  if (key === "status") return !!row.status;
  if (key === "assignee") return !!row.assigneeIdValue;
  if (key === "start") return !!row.startDateValue;
  if (key === "due") return !!row.dueDateValue;
  if (key === "waiting") return !!row.waitingKeys?.length;
  if (key === "nextStep") return !!row.nextStepDescription;
  if (key === "updatedAt") return !!row.updatedAtValue;
  if (key === "closedDate") return !!row.closedDateValue;
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
  rows.forEach((row) => {
    if (!rowMatchesGroupBy(row, groupBy)) return;
    const group = getGroupInfo(row, groupBy);
    if (!buckets[group.key]) buckets[group.key] = { ...group, rows: [] };
    buckets[group.key].rows.push(row);
    buckets[group.key].sortValue = Math.max(
      buckets[group.key].sortValue || 0,
      group.sortValue || 0,
    );
  });

  return Object.values(buckets)
    .map((group) => ({ ...group, rows: orderRowsWithSubtasks(group.rows) }))
    .sort((a, b) =>
      ["case", "projectInternal"].includes(normalizeGroupBy(groupBy))
        ? (b.sortValue || 0) - (a.sortValue || 0) ||
          a.label.localeCompare(b.label)
        : a.label.localeCompare(b.label),
    );
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
      row.serviceLabel && row.serviceLabel !== "-"
        ? row.serviceLabel
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
  if (field === "projectInternal") return row.projectInternalLabel || "";
  if (field === "status") {
    const cfg = STATUS_CFG[row.status] || {};
    return cfg.label || row.status || "";
  }
  if (field === "assignee")
    return row.assigneeIdValue ? row.assigneeLabel : "Unassigned";
  if (field === "start") return formatDate(row.startDateValue);
  if (field === "due") return formatDate(row.dueDateValue);
  if (field === "closedDate") return formatDate(row.closedDateValue);
  if (field === "waiting") return getPrimaryWaitingLabel(row);
  if (field === "nextStep") return row.nextStepDescription || "";
  if (field === "updatedAt") return formatDate(row.updatedAtValue, "datetime");
  return "";
};

const compareValues = (a, b) =>
  String(a || "").localeCompare(String(b || ""), "vi", { numeric: true });

const getRowDateValue = (row, field) => {
  if (field === "start") return row.startDateValue;
  if (field === "due") return row.dueDateValue;
  if (field === "closedDate") return row.closedDateValue;
  if (field === "updatedAt") return row.updatedAtValue;
  return null;
};

const getColumnSortValue = (row, field) => {
  const rawDateValue = getRowDateValue(row, field);
  if (rawDateValue || DATE_COLUMN_KEYS.includes(field)) {
    const time = rawDateValue ? new Date(rawDateValue).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
  }
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

const getPatchValue = (patch, keys) => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(patch || {}, key))
      return patch[key];
  }
  return undefined;
};

const getPatchRecordType = (patch = {}) => {
  const rawType = String(patch.recordType || patch._type || "").trim();
  if (rawType === "subTask" || rawType === "subtask") return "subTask";
  if (rawType === "task") return "task";
  return patch.subTaskName || patch.taskId ? "subTask" : "task";
};

const patchTaskRow = (row, patch = {}, lawyerRows = []) => {
  if (!row || !patch) return row;
  const next = { ...row, ...patch };
  const titleValue = getPatchValue(patch, ["title", "subTaskName", "name"]);
  if (titleValue !== undefined) next.titleText = taskTitle(next);

  const lawyerValue = getPatchValue(patch, ["lawyerId", "lawyer", "lawyers"]);
  if (lawyerValue !== undefined) {
    const lawyerId = extractId(lawyerValue);
    const lawyer = lawyerRows.find((item) => extractId(item?.id) === lawyerId);
    next.assigneeIdValue = lawyerId;
    next.assigneeLabel = patch._ln || assigneeLabel(lawyerId, lawyer);
  }

  const statusValue = getPatchValue(patch, ["status"]);
  if (statusValue !== undefined) next.status = statusValue;

  const startValue =
    row.recordType === "subTask"
      ? getPatchValue(patch, ["date", "startDate"])
      : getPatchValue(patch, ["startDate", "date"]);
  if (startValue !== undefined) next.startDateValue = startValue;

  const dueValue =
    row.recordType === "subTask"
      ? getPatchValue(patch, ["deadline", "dueDate"])
      : getPatchValue(patch, ["dueDate", "deadline"]);
  if (dueValue !== undefined) next.dueDateValue = dueValue;

  const closedValue = getPatchValue(patch, ["closedDate"]);
  if (closedValue !== undefined) next.closedDateValue = closedValue;

  const nextStepValue = getPatchValue(patch, ["nextStepDescription"]);
  if (nextStepValue !== undefined)
    next.nextStepDescription = nextStepValue || "";

  next.isOverdueValue = isOverdue(next.dueDateValue, next.status);
  return next;
};

const getRowDetailTaskId = (row) => {
  const parentTaskId =
    row?.recordType === "subTask" ? extractId(row.parentTaskId) : null;
  return parentTaskId || extractId(row?.id);
};

const getRowDetailSubTaskId = (row) =>
  row?.recordType === "subTask" ? extractId(row?.id) : null;

const buildTaskDetailRoute = (taskId) => {
  const safeTaskId = extractId(taskId);
  if (!safeTaskId) return null;

  const pathname = window.location?.pathname || "";
  const segments = pathname.split("/").filter(Boolean);
  const adminIndex = segments.findIndex(
    (segment) => segment.toLowerCase() === "admin",
  );
  const appId = adminIndex >= 0 ? segments[adminIndex + 1] : "";
  const baseSegments = appId ? ["admin", appId] : ["admin"];
  const nextPathname = `/${baseSegments.join("/")}/view/${TASK_DETAIL_POPUP_UID}/filterbytk/${encodeURIComponent(String(safeTaskId))}`;

  return {
    uid: TASK_DETAIL_POPUP_UID,
    recordId: safeTaskId,
    pathname: nextPathname,
    url: `${window.location.origin}${nextPathname}`,
  };
};

const AllTaskBlock = () => {
  const token = useNocoToken();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUserFromCtx());
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(
    DEFAULT_VISIBLE_COLUMN_KEYS,
  );
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);
  const [columnOrder, setColumnOrder] = useState(DEFAULT_COLUMN_ORDER);
  const [sortConfig, setSortConfig] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [openColumnMenu, setOpenColumnMenu] = useState(null);
  const [draggingTaskKey, setDraggingTaskKey] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [deletingRowKeys, setDeletingRowKeys] = useState([]);
  const [groupBy, setGroupBy] = useState(DEFAULT_GROUP_BY);
  const [viewMode, setViewMode] = useState(DEFAULT_VIEW_MODE);
  const [casePage, setCasePage] = useState(1);
  const detailRefreshTimerRef = useRef(null);
  const [filters, setFilters] = useState({
    statuses: [],
    assigneeIds: [],
    caseIds: [],
    waitingKinds: [],
    dateRange: null,
    keyword: "",
  });

  const setFilter = (field, value) => {
    setCasePage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const openTaskDetailView = useCallback(async (row, event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const taskId = getRowDetailTaskId(row);
    const subTaskId = getRowDetailSubTaskId(row);
    const detailRoute = buildTaskDetailRoute(taskId);
    if (!detailRoute) {
      message.warning("Could not resolve task id.");
      return;
    }

    const popupTitle =
      row?.recordType === "subTask" && row.parentTaskTitle
        ? `${row.titleText || "Subtask"} - ${row.parentTaskTitle}`
        : row?.titleText || "Task detail";
    const sourceProjectId = extractId(row?.projectIdValue);
    const collectionName = subTaskId ? "subTasks" : "tasks";
    const recordType = subTaskId ? "subTask" : "task";
    const openParams = {
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
      sourceId: sourceProjectId,
      sourceProjectId,
      sourceCaseId: sourceProjectId,
      projectId: sourceProjectId,
      caseId: sourceProjectId,
      collectionName,
      pathname: detailRoute.pathname,
      linkedUrl: detailRoute.url,
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
    const openOptions = {
      mode: "dialog",
      title: popupTitle,
      size: "large",
      navigation: false,
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
      sourceId: sourceProjectId,
      sourceProjectId,
      sourceCaseId: sourceProjectId,
      projectId: sourceProjectId,
      caseId: sourceProjectId,
      collectionName,
      pathname: detailRoute.pathname,
      linkedUrl: detailRoute.url,
      inputArgs: openParams,
      params: openParams,
      defineProperties,
    };

    if (typeof ctx.openView === "function") {
      try {
        await ctx.openView(TASK_DETAIL_POPUP_UID, openOptions);
        return;
      } catch (error) {
        console.error(
          "[AllTaskBlock] open task detail via ctx.openView failed",
          error,
        );
      }
    }

    window.open(detailRoute.url, "_blank", "noopener,noreferrer");
  }, []);

  const loadCurrentUser = useCallback(async () => {
    const user = await fetchCurrentUserRecord();
    if (!user) return;
    const userViewRecord = await fetchUserViewRecord(user?.id ?? user);
    const resolvedUser = userViewRecord ? { ...user, ...userViewRecord } : user;
    setCurrentUser(resolvedUser);

    const userViewConfig = getUserViewConfig(resolvedUser);
    if (userViewConfig?.visibleColumnKeys) {
      setVisibleColumnKeys(
        normalizeColumnKeys(userViewConfig.visibleColumnKeys),
      );
    }
    if (userViewConfig?.groupBy) {
      setGroupBy(normalizeGroupBy(userViewConfig.groupBy));
    }
    if (userViewConfig?.columnWidths) {
      setColumnWidths(normalizeColumnWidths(userViewConfig.columnWidths));
    }
    if (userViewConfig?.columnOrder) {
      setColumnOrder(normalizeColumnOrder(userViewConfig.columnOrder));
    }
    if (userViewConfig?.sortConfig) {
      setSortConfig(normalizeSortConfig(userViewConfig.sortConfig));
    }
    if (userViewConfig?.viewMode) {
      setViewMode(normalizeViewMode(userViewConfig.viewMode));
    }
  }, []);

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
    if (!userId) {
      message.warning("Could not resolve current user to save view.");
      return;
    }

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
      console.warn("[AllTaskBlock] save user view config failed", error);
      message.warning("Could not save view for this user.");
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
    if (nextMode !== "table") setSelectedRowKeys([]);
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
      caseIds: [],
      waitingKinds: [],
      dateRange: null,
      keyword: "",
    });
  };

  const reload = useCallback(
    async (options = {}) => {
      const notifyLimit = !!options?.notifyLimit;
      setLoading(true);
      try {
        let scopeLawyerRows = [];
        let taskFilter = null;
        let subTaskFilter = null;

        if (TASK_BLOCK_SCOPE === "my") {
          const user = currentUser || (await fetchCurrentUserRecord());
          const userId = extractId(user?.id ?? user);
          scopeLawyerRows = await fetchLawyersByUserId(userId);
          const scopeLawyerIds = uniqueIds(
            scopeLawyerRows.map((lawyer) => lawyer?.id),
          );
          const assignedFilter = makeLawyerFilter(scopeLawyerIds);

          if (!assignedFilter) {
            setRows([]);
            setLawyers([]);
            setProjects([]);
            setCustomers([]);
            return;
          }

          taskFilter = assignedFilter;
          subTaskFilter = assignedFilter;
        }

        const taskParams = {
          fields: TASK_FIELDS,
          sort: ["-updatedAt"],
        };
        if (taskFilter) taskParams.filter = JSON.stringify(taskFilter);

        const subTaskParams = {
          fields: SUBTASK_FIELDS,
          sort: ["-updatedAt"],
        };
        if (subTaskFilter) subTaskParams.filter = JSON.stringify(subTaskFilter);

        const [taskRows, subTaskRows] = await Promise.all([
          safeFetchListPage("tasks:list", taskParams, TASK_FETCH_LIMIT),
          safeFetchListPage("subTasks:list", subTaskParams, TASK_FETCH_LIMIT),
        ]);

        if (
          notifyLimit &&
          (taskRows.length >= TASK_FETCH_LIMIT ||
            subTaskRows.length >= TASK_FETCH_LIMIT)
        ) {
          message.warning(
            `Đang hiển thị tối đa ${TASK_FETCH_LIMIT} tasks/subtasks. Dùng filter để thu hẹp kết quả và xem đầy đủ.`,
            6,
          );
        }

        const loadedTaskIds = new Set(
          uniqueIds(taskRows.map((task) => task?.id)),
        );
        const parentTaskIds = uniqueIds(
          subTaskRows.map((subTask) => subTask?.taskId || subTask?.tasks),
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
          taskContextRows.map((task) => task?.projectId || task?.projects),
        );
        const projectInternalIds = uniqueIds(
          taskContextRows.map(
            (task) =>
              task?.projectInternalId ||
              task?.projectInternal ||
              task?.projectInternals,
          ),
        );
        const lawyerIds = uniqueIds([
          ...taskContextRows.map((task) => task?.lawyerId || task?.lawyer),
          ...subTaskRows.map((subTask) => subTask?.lawyerId || subTask?.lawyer),
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
          .map((project) => project?.customer || project?.customers)
          .filter((customer) => customer && typeof customer === "object");
        const customerIds = uniqueIds([
          ...projectRows.map(
            (project) =>
              project?.customerId || project?.customer || project?.customers,
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
        const mergedLawyerRows = uniqueById([
          ...scopeLawyerRows,
          ...lawyerRows,
        ]);

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
        console.error("[AllTaskBlock] load failed", error);
        message.error("Could not load tasks.");
      } finally {
        setLoading(false);
      }
    },
    [currentUser],
  );

  useEffect(() => {
    reload({ notifyLimit: false });
  }, [reload]);

  useEffect(() => {
    let active = true;
    const handleTaskDetailChanged = (event) => {
      if (!active) return;
      const detail = event?.detail || {};
      const updated = detail.updated || detail.record || {};
      const recordId =
        extractId(detail.recordId) ||
        extractId(detail.taskId) ||
        extractId(updated.id);
      const recordType = detail.recordType || getPatchRecordType(updated);

      if (recordId) {
        setRows((prev) =>
          prev.map((row) => {
            const sameType = row.recordType === recordType;
            const sameRecord = extractId(row.id) === recordId;
            return sameType && sameRecord
              ? patchTaskRow(row, updated, lawyers)
              : row;
          }),
        );
      }

      if (detailRefreshTimerRef.current)
        window.clearTimeout(detailRefreshTimerRef.current);
      detailRefreshTimerRef.current = window.setTimeout(() => {
        detailRefreshTimerRef.current = null;
        reload({ notifyLimit: false });
      }, 300);
    };

    window.addEventListener(TASK_DETAIL_CHANGE_EVENT, handleTaskDetailChanged);
    return () => {
      active = false;
      if (detailRefreshTimerRef.current)
        window.clearTimeout(detailRefreshTimerRef.current);
    };
  }, [lawyers, reload]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

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
        filters.caseIds.length &&
        !filters.caseIds.map(String).includes(String(row.projectIdValue || ""))
      )
        return false;
      if (
        filters.waitingKinds.length &&
        !filters.waitingKinds.some((kind) => row.waitingKeys.includes(kind))
      )
        return false;
      if (
        Array.isArray(filters.dateRange) &&
        filters.dateRange.length === 2 &&
        !inDateRange(row.startDateValue, filters.dateRange)
      )
        return false;
      const columnFilterEntries = Object.entries(columnFilters).filter(
        ([, values]) => Array.isArray(values) && values.length,
      );
      if (
        columnFilterEntries.length &&
        !columnFilterEntries.every(([field, values]) =>
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
            row.serviceLabel,
            row.assigneeLabel,
            row.description,
            row.blockedReason,
            row.nextStepDescription,
            row.waitingText,
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

  useEffect(() => {
    const liveKeys = new Set(rows.map((row) => row.key));
    setSelectedRowKeys((prev) => prev.filter((key) => liveKeys.has(key)));
  }, [rows]);

  const selectedRows = useMemo(() => {
    const keySet = new Set(selectedRowKeys);
    return rows.filter((row) => keySet.has(row.key));
  }, [rows, selectedRowKeys]);

  const deletingKeySet = useMemo(
    () => new Set(deletingRowKeys),
    [deletingRowKeys],
  );

  const assigneeOptions = useMemo(
    () =>
      lawyers
        .map((lawyer) => ({
          value: extractId(lawyer.id),
          label: lawyerLabel(lawyer),
        }))
        .filter((item) => item.value),
    [lawyers],
  );

  const caseOptions = useMemo(() => {
    const customerMap = {};
    customers.forEach((customer) => {
      const id = extractId(customer?.id);
      if (id) customerMap[id] = customer;
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
      .filter((item) => item.value);
  }, [projects, customers, token]);

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
    setSelectedColumn((prev) => (prev === field ? null : prev));
    setOpenColumnMenu(null);
    saveViewConfig(
      getViewConfig({ sortConfig: nextSort, groupBy: nextGroupBy }),
    );
  };

  const updateSelectedRows = useCallback((keys, selected) => {
    const safeKeys = (keys || []).filter(Boolean);
    if (!safeKeys.length) return;
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      safeKeys.forEach((key) => {
        if (selected) next.add(key);
        else next.delete(key);
      });
      return Array.from(next);
    });
  }, []);

  const destroyRows = useCallback(
    async (targetRows = []) => {
      const seen = new Set();
      const rowsToDelete = [];
      (targetRows || []).forEach((row) => {
        const id = extractId(row?.id);
        if (!id || !row?.key || seen.has(row.key)) return;
        seen.add(row.key);
        rowsToDelete.push(row);
      });

      if (!rowsToDelete.length) {
        message.warning("No task selected.");
        return;
      }

      const keys = rowsToDelete.map((row) => row.key);
      const keySet = new Set(keys);
      const previousRows = rows;

      setDeletingRowKeys((prev) => Array.from(new Set([...prev, ...keys])));
      setRows((prev) => prev.filter((row) => !keySet.has(row.key)));
      setSelectedRowKeys((prev) => prev.filter((key) => !keySet.has(key)));

      try {
        const orderedRows = [...rowsToDelete].sort((a, b) => {
          const left = a.recordType === "subTask" ? 0 : 1;
          const right = b.recordType === "subTask" ? 0 : 1;
          return left - right;
        });

        for (const row of orderedRows) {
          await ctx.api.request({
            url:
              row.recordType === "subTask"
                ? "subTasks:destroy"
                : "tasks:destroy",
            method: "POST",
            params: { filterByTk: extractId(row.id) },
          });
        }

        await reload({ notifyLimit: false });
        message.success(
          rowsToDelete.length === 1
            ? "Task deleted."
            : `${rowsToDelete.length} tasks deleted.`,
        );
      } catch (error) {
        console.error("[AllTaskBlock] delete task failed", error);
        setRows(previousRows);
        message.error("Could not delete task.");
        reload({ notifyLimit: false });
      } finally {
        setDeletingRowKeys((prev) => prev.filter((key) => !keySet.has(key)));
      }
    },
    [reload, rows],
  );

  const confirmDeleteRows = useCallback(
    (targetRows = []) => {
      const seen = new Set();
      const rowsToDelete = [];
      (targetRows || []).forEach((row) => {
        if (!row?.key || seen.has(row.key)) return;
        seen.add(row.key);
        rowsToDelete.push(row);
      });

      if (!rowsToDelete.length) {
        message.warning("No task selected.");
        return;
      }

      const taskCount = rowsToDelete.filter(
        (row) => row.recordType !== "subTask",
      ).length;
      const subTaskCount = rowsToDelete.length - taskCount;
      const breakdown = compact([
        taskCount ? `${taskCount} task${taskCount > 1 ? "s" : ""}` : "",
        subTaskCount
          ? `${subTaskCount} subtask${subTaskCount > 1 ? "s" : ""}`
          : "",
      ]).join(", ");
      const singleTitle = rowsToDelete[0]?.titleText || "this task";
      const title =
        rowsToDelete.length === 1
          ? `Delete "${singleTitle}"?`
          : `Delete ${rowsToDelete.length} selected items?`;
      const content = React.createElement(
        "div",
        { style: { fontFamily: FONT } },
        React.createElement(
          "div",
          null,
          rowsToDelete.length === 1
            ? "This action cannot be undone."
            : `Selected: ${breakdown}. This action cannot be undone.`,
        ),
      );
      const onOk = () => destroyRows(rowsToDelete);

      if (Modal && typeof Modal.confirm === "function") {
        Modal.confirm({
          title,
          content,
          okText: "Delete",
          okType: "danger",
          cancelText: "Cancel",
          onOk,
        });
        return;
      }

      if (window.confirm(`${title}\nThis action cannot be undone.`)) {
        onOk();
      }
    },
    [destroyRows],
  );

  const makeRowSelection = (items = []) => ({
    columnWidth: TASK_SELECTION_COLUMN_WIDTH,
    fixed: true,
    selectedRowKeys,
    preserveSelectedRowKeys: true,
    onSelect: (record, selected) => updateSelectedRows([record?.key], selected),
    onSelectAll: (selected, selectedRowsForTable, changeRows) => {
      const rowsForChange =
        changeRows && changeRows.length ? changeRows : items;
      updateSelectedRows(
        rowsForChange.map((row) => row?.key),
        selected,
      );
    },
    onSelectNone: () =>
      updateSelectedRows(
        items.map((row) => row?.key),
        false,
      ),
    getCheckboxProps: (record) => ({
      disabled: deletingKeySet.has(record.key),
      title: deletingKeySet.has(record.key) ? "Deleting..." : undefined,
    }),
  });

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
      if (event.pointerId !== undefined)
        event.currentTarget?.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture is best-effort; window listeners still keep resize active.
    }
    ownerWindow.addEventListener("pointermove", handleMove);
    ownerWindow.addEventListener("pointerup", handleUp);
    ownerWindow.addEventListener("pointercancel", handleUp);
  };

  const renderColumnMenu = (field, label) => {
    const canGroupByField = GROUP_BY_OPTIONS.some(
      (item) => item.value === field,
    );
    const isGrouped = groupBy === field;
    const hasColumnFilter =
      Array.isArray(columnFilters[field]) && columnFilters[field].length > 0;
    const menuButtonStyle = { textAlign: "left", justifyContent: "flex-start" };
    return React.createElement(
      "div",
      {
        onMouseDown: (event) => event.stopPropagation(),
        style: { width: 270 },
      },
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
            title: "Cancel",
            onClick: () => setOpenColumnMenu(null),
          },
          "x",
        ),
      ),
      React.createElement(
        Button,
        {
          type: selectedColumn === field ? "primary" : "text",
          block: true,
          onClick: () => setSelectedColumn(field),
          style: menuButtonStyle,
        },
        "Select column",
      ),
      React.createElement(
        Button,
        {
          type:
            sortConfig?.field === field && sortConfig.direction === "asc"
              ? "primary"
              : "text",
          block: true,
          onClick: () => applySort(field, "asc"),
          style: menuButtonStyle,
        },
        "Sort ascending",
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
          style: menuButtonStyle,
        },
        "Sort descending",
      ),
      sortConfig?.field === field
        ? React.createElement(
            Button,
            {
              type: "text",
              block: true,
              onClick: () => applySort(field, null),
              style: menuButtonStyle,
            },
            "Clear sort",
          )
        : null,
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
          { type: hasColumnFilter ? undefined : "secondary" },
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
      React.createElement(
        Button,
        {
          type: isGrouped ? "primary" : "text",
          block: true,
          disabled: !canGroupByField,
          onClick: () => canGroupByField && setGroupByValue(field),
          style: { ...menuButtonStyle, marginTop: token.marginXS },
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
          style: menuButtonStyle,
        },
        "Hide field",
      ),
      React.createElement(
        Button,
        {
          type: "text",
          block: true,
          onClick: () => moveColumn(field, "left"),
          style: menuButtonStyle,
        },
        "Move left",
      ),
      React.createElement(
        Button,
        {
          type: "text",
          block: true,
          onClick: () => moveColumn(field, "right"),
          style: menuButtonStyle,
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
            ...menuButtonStyle,
            marginTop: token.marginXS,
            borderTop: `1px solid ${token.colorSplit}`,
          },
        },
        "x Clear column config",
      ),
    );
  };

  const renderColumnTitle = (field, label, tableScope = "main") => {
    const isGrouped = groupBy === field;
    const isSorted = sortConfig?.field === field;
    const hasColumnFilter =
      Array.isArray(columnFilters[field]) && columnFilters[field].length > 0;
    const active =
      selectedColumn === field || isGrouped || isSorted || hasColumnFilter;
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
        `${label}${isSorted ? (sortConfig.direction === "asc" ? " ^" : " v") : ""}`,
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
            onClick: (event) => event.stopPropagation(),
            style: { color: active ? token.colorPrimary : undefined },
          },
          "...",
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
    const detailRoute = buildTaskDetailRoute(getRowDetailTaskId(row));
    return React.createElement(
      "a",
      {
        href: detailRoute?.url || "#",
        onClick: (event) => openTaskDetailView(row, event),
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
            ? React.createElement("span", {
                style: {
                  width: 18,
                  height: 18,
                  marginTop: 2,
                  borderLeft: `1px solid ${token.colorBorder}`,
                  borderBottom: `1px solid ${token.colorBorder}`,
                  borderBottomLeftRadius: 4,
                  flex: "0 0 auto",
                },
              })
            : null,
          React.createElement(
            "div",
            { style: { minWidth: 0 } },
            renderTaskTitleLink(row, value || "-"),
          ),
        ),
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
      render: (value, row) =>
        React.createElement(
          Text,
          {
            type: value ? undefined : "secondary",
            style: row.isOverdueValue ? { color: token.colorError } : undefined,
          },
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
      title: renderColumnTitle("waiting", "Waiting issue", tableScope),
      dataIndex: "waiting",
      key: "waiting",
      width: columnWidths.waiting,
      render: (value, row) =>
        React.createElement(
          Tooltip,
          { title: row.waitingText || undefined },
          React.createElement("div", null, waitingTags(value)),
        ),
    },
    {
      title: renderColumnTitle("nextStep", "Next step", tableScope),
      dataIndex: "nextStepDescription",
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
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: TASK_ACTION_COLUMN_WIDTH,
      render: (_, row) =>
        React.createElement(
          Button,
          {
            size: "small",
            danger: true,
            type: "text",
            loading: deletingKeySet.has(row.key),
            onClick: (event) => {
              event.stopPropagation();
              confirmDeleteRows([row]);
            },
          },
          "Delete",
        ),
    },
  ];

  const getVisibleColumns = (tableScope = "main") => {
    const keys = new Set(normalizeColumnKeys(visibleColumnKeys));
    const allColumns = buildColumns(tableScope);
    const actionColumn = allColumns.find((column) => column.key === "actions");
    const columnMap = allColumns.reduce((acc, column) => {
      acc[column.key] = column;
      return acc;
    }, {});
    const columns = normalizeColumnOrder(columnOrder)
      .filter((key) => keys.has(key))
      .map((key) => columnMap[key])
      .filter(Boolean);
    return actionColumn ? [...columns, actionColumn] : columns;
  };

  const tableScrollX = useMemo(() => {
    const keys = new Set(normalizeColumnKeys(visibleColumnKeys));
    const width = normalizeColumnOrder(columnOrder)
      .filter((key) => keys.has(key))
      .reduce(
        (sum, key) =>
          sum +
          (Number(columnWidths[key]) || DEFAULT_COLUMN_WIDTHS[key] || 150),
        0,
      );
    return Math.max(
      900,
      width + TASK_SELECTION_COLUMN_WIDTH + TASK_ACTION_COLUMN_WIDTH,
    );
  }, [visibleColumnKeys, columnOrder, columnWidths]);

  const renderModeIcon = (mode, active) => {
    const color = active ? token.colorPrimary : token.colorTextSecondary;
    const cellStyle = { border: `1px solid ${color}`, borderRadius: 1 };
    if (mode === "table") {
      return React.createElement(
        "span",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 2,
            width: 16,
            height: 16,
          },
        },
        React.createElement("span", { style: cellStyle }),
        React.createElement("span", { style: cellStyle }),
        React.createElement("span", { style: cellStyle }),
        React.createElement("span", { style: cellStyle }),
      );
    }
    if (mode === "board") {
      return React.createElement(
        "span",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 2,
            width: 16,
            height: 16,
            border: `1px solid ${color}`,
            borderRadius: 2,
            padding: 2,
          },
        },
        React.createElement("span", {
          style: { background: color, opacity: 0.8 },
        }),
        React.createElement("span", {
          style: { background: color, opacity: 0.55 },
        }),
        React.createElement("span", {
          style: { background: color, opacity: 0.35 },
        }),
      );
    }
    return React.createElement(
      "span",
      {
        style: {
          display: "grid",
          gap: 3,
          width: 16,
          height: 16,
          border: `1px solid ${color}`,
          borderRadius: 2,
          padding: 3,
        },
      },
      React.createElement("span", {
        style: { height: 2, width: "75%", background: color },
      }),
      React.createElement("span", {
        style: { height: 2, width: "100%", background: color },
      }),
      React.createElement("span", {
        style: { height: 2, width: "55%", background: color },
      }),
    );
  };

  const viewModeControl = React.createElement(
    "div",
    {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
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
            background: active ? token.colorFillAlter : token.colorBgContainer,
            color: active ? token.colorPrimary : token.colorText,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: token.marginXS,
            minHeight: 36,
            font: "inherit",
          },
        },
        renderModeIcon(item.value, active),
        item.label,
      );
    }),
  );

  const columnConfigContent = React.createElement(
    "div",
    { style: { width: 360 } },
    viewModeControl,
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
          `View config`,
        ),
      )
    : React.createElement(
        "div",
        { style: { gridColumn: "1 / -1" } },
        columnConfigContent,
      );

  const showGroupByControl = viewMode !== "board";
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
          placeholder: "Assignees",
          options: assigneeOptions,
          onChange: (value) => setFilter("assigneeIds", value),
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
          value: filters.waitingKinds,
          placeholder: "Waiting issue",
          options: WAITING_OPTIONS,
          onChange: (value) => setFilter("waitingKinds", value),
          style: filterControlStyle,
        }),
      ),
      React.createElement(
        "div",
        { style: filterActionRowStyle },
        React.createElement(Input.Search, {
          allowClear: true,
          value: filters.keyword,
          placeholder: "Search task, case, blocker...",
          onChange: (event) => setFilter("keyword", event.target.value),
          onSearch: (value) => setFilter("keyword", value),
          style: filterControlStyle,
        }),
        showGroupByControl
          ? React.createElement(Select, {
              value: groupBy,
              options: GROUP_BY_OPTIONS,
              placeholder: "Group by",
              onChange: setGroupByValue,
              style: filterControlStyle,
            })
          : null,
        RangePicker
          ? React.createElement(RangePicker, {
              allowClear: true,
              value: filters.dateRange,
              format: "DD/MM/YYYY",
              placeholder: ["Ngày bắt đầu từ", "Ngày bắt đầu đến"],
              onChange: (value) => setFilter("dateRange", value || null),
              style: filterControlStyle,
            })
          : null,
        columnConfigControl,
        selectedRows.length
          ? React.createElement(
              Button,
              {
                danger: true,
                loading: selectedRows.some((row) =>
                  deletingKeySet.has(row.key),
                ),
                onClick: () => confirmDeleteRows(selectedRows),
                style: filterControlStyle,
              },
              `Delete selected (${selectedRows.length})`,
            )
          : null,
        React.createElement(
          Button,
          { onClick: resetFilters, style: filterControlStyle },
          "Reset",
        ),
      ),
    ),
  );

  const renderSheetTable = (items, options = {}) =>
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
        columns: getVisibleColumns(options.scope || "main"),
        dataSource: items,
        rowSelection: makeRowSelection(items),
        tableLayout: "fixed",
        pagination: Object.prototype.hasOwnProperty.call(options, "pagination")
          ? options.pagination
          : false,
        scroll: options.scroll || { x: tableScrollX, y: 560 },
        sticky: options.sticky,
        style: { width: "100%", minWidth: 0 },
      }),
    );

  const getGroupColors = () => {
    if (groupBy === "case") return CASE_GROUP_COLORS;
    if (groupBy === "projectInternal") return PROJECT_INTERNAL_GROUP_COLORS;
    return (
      FIELD_GROUP_COLORS[groupBy] || {
        background: token.colorFillAlter,
        border: token.colorSplit,
        text: token.colorText,
      }
    );
  };

  const renderServiceSubGroup = (subGroup) =>
    React.createElement(
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
        React.createElement(
          Text,
          {
            type: "secondary",
            style: { fontSize: 12, flex: "0 0 auto" },
          },
          `${subGroup.rows.length}`,
        ),
      ),
      renderSheetTable(subGroup.rows, {
        scope: subGroup.key,
        pagination: false,
        scroll: { x: tableScrollX },
        sticky: false,
      }),
    );

  const renderGroupSection = (group) => {
    const groupColors = getGroupColors();
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
          overflow: "hidden",
          background: token.colorBgContainer,
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
            minWidth: 0,
          },
        },
        React.createElement(
          "div",
          { style: { minWidth: 0, flex: 1 } },
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
        ),
      ),
      serviceSubGroups.map(renderServiceSubGroup),
    );
  };

  const updateRowStatus = async (row, nextStatus) => {
    if (!row || row.status === nextStatus) return;
    const recordId = extractId(row.id);
    if (!recordId) {
      message.error("Could not resolve task id.");
      return;
    }

    const previousRows = rows;
    const collection = row.recordType === "subTask" ? "subTasks" : "tasks";
    setRows((prev) =>
      prev.map((item) =>
        item.key === row.key ? { ...item, status: nextStatus } : item,
      ),
    );

    try {
      await ctx.api.request({
        url: `${collection}:update?filterByTk=${recordId}`,
        method: "POST",
        data: { status: nextStatus },
      });
      await reload({ notifyLimit: false });
      message.success("Task status updated.");
    } catch (error) {
      console.error("[AllTaskBlock] update task status failed", error);
      setRows(previousRows);
      message.error("Could not update task status.");
    }
  };

  const handleBoardDrop = async (status, event) => {
    event.preventDefault();
    const rowKey = event.dataTransfer?.getData("text/plain") || draggingTaskKey;
    setDragOverStatus(null);
    setDraggingTaskKey(null);
    const row = rows.find((item) => item.key === rowKey);
    if (!row || row.status === status) return;
    await updateRowStatus(row, status);
  };

  const renderTaskCard = (row, options = {}) =>
    React.createElement(
      "div",
      {
        key: row.key,
        draggable: !!options.draggable,
        onDragStart: options.draggable
          ? (event) => {
              setDraggingTaskKey(row.key);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", row.key);
            }
          : undefined,
        onDragEnd: options.draggable
          ? () => {
              setDraggingTaskKey(null);
              setDragOverStatus(null);
            }
          : undefined,
        style: {
          display: "grid",
          gap: 4,
          padding: token.paddingXS,
          border: `1px solid ${token.colorSplit}`,
          borderRadius: token.borderRadius,
          background: token.colorBgContainer,
          boxShadow:
            options.draggable && draggingTaskKey === row.key
              ? token.boxShadowSecondary
              : undefined,
          cursor: options.draggable ? "grab" : undefined,
          opacity: options.draggable && draggingTaskKey === row.key ? 0.55 : 1,
        },
      },
      renderTaskTitleLink(row, row.titleText || "-", { fontSize: 13 }),
      React.createElement(
        Text,
        { type: "secondary", style: { fontSize: token.fontSizeSM } },
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
          { type: "secondary", style: { fontSize: token.fontSizeSM } },
          row.assigneeLabel || "Unassigned",
        ),
        React.createElement(
          Text,
          {
            type: row.dueDateValue ? undefined : "secondary",
            style: { fontSize: token.fontSizeSM },
          },
          formatDate(row.dueDateValue),
        ),
      ),
    );

  const renderBoardView = () => {
    const knownStatuses = new Set(STATUS_OPTIONS.map((status) => status.value));
    const extraStatuses = Array.from(
      new Set(
        sortedRows
          .map((row) => row.status)
          .filter((status) => status && !knownStatuses.has(status)),
      ),
    ).map((status) => ({
      value: status,
      label: STATUS_CFG[status]?.label || status,
    }));
    const buckets = [...STATUS_OPTIONS, ...extraStatuses].map((status) => ({
      ...status,
      rows: sortedRows.filter((row) => row.status === status.value),
    }));

    return React.createElement(
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
            gridAutoColumns: "minmax(260px, 1fr)",
            gap: token.marginSM,
            minHeight: 360,
            minWidth: "max-content",
          },
        },
        buckets.map((bucket) =>
          React.createElement(
            "section",
            {
              key: bucket.value,
              onDragOver: (event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverStatus(bucket.value);
              },
              onDragLeave: () =>
                setDragOverStatus((current) =>
                  current === bucket.value ? null : current,
                ),
              onDrop: (event) => handleBoardDrop(bucket.value, event),
              style: {
                display: "grid",
                gridTemplateRows: "auto minmax(0, 1fr)",
                gap: token.marginXS,
                padding: token.paddingXS,
                border: `1px solid ${dragOverStatus === bucket.value ? token.colorPrimary : token.colorSplit}`,
                borderRadius: token.borderRadius,
                background:
                  dragOverStatus === bucket.value
                    ? token.colorBgContainer
                    : token.colorFillAlter,
                height: "calc(100vh - 260px)",
                minHeight: 360,
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
              statusTag(bucket.value),
              React.createElement(
                Text,
                { type: "secondary" },
                `${bucket.rows.length}`,
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
              bucket.rows.length
                ? bucket.rows.map((row) =>
                    renderTaskCard(row, { draggable: true }),
                  )
                : React.createElement(
                    Text,
                    { type: "secondary", style: { padding: token.paddingXS } },
                    "No tasks",
                  ),
            ),
          ),
        ),
      ),
    );
  };

  const getRoadmapTime = (value) => {
    const time = value ? new Date(value).getTime() : null;
    return Number.isFinite(time) ? time : null;
  };

  const startOfDayTime = (value) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };

  const formatRoadmapMonth = (time) =>
    new Date(time).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

  const formatRoadmapFullDate = (time) =>
    new Date(time).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const formatRoadmapShortDate = (time) =>
    new Date(time).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const formatRoadmapWeekday = (time) =>
    new Date(time).toLocaleDateString("en-US", { weekday: "short" });

  const formatRoadmapRange = (start, end) =>
    `${formatRoadmapShortDate(start)} - ${formatRoadmapShortDate(end)}`;

  const buildRoadmapSegments = (monthStart, monthEnd, today) => {
    const dayMs = 24 * 60 * 60 * 1000;
    const dayOfMonth = (time) => new Date(time).getDate();
    const makeTime = (day) =>
      startOfDayTime(
        new Date(
          new Date(monthStart).getFullYear(),
          new Date(monthStart).getMonth(),
          day,
        ),
      );
    const todayDay = dayOfMonth(today);
    const recentStart = Math.max(1, todayDay - 9);
    const recentEnd = Math.max(0, todayDay - 4);
    const segments = [];

    let day = 1;
    while (day < recentStart) {
      const next = day === 1 ? 5 : day + 5;
      const endDay = Math.min(next - 1, recentStart - 1);
      segments.push({
        key: `past:${day}`,
        start: makeTime(day),
        end: makeTime(endDay),
        label: String(day),
        subLabel:
          endDay > day
            ? `${day}-${endDay}`
            : formatRoadmapWeekday(makeTime(day)),
      });
      day = next;
    }

    for (day = recentStart; day <= recentEnd && day < todayDay; day += 1) {
      segments.push({
        key: `recent:${day}`,
        start: makeTime(day),
        end: makeTime(day),
        label: String(day),
        subLabel: formatRoadmapWeekday(makeTime(day)),
      });
    }

    if (recentEnd + 1 < todayDay) {
      const startDay = recentEnd + 1;
      const endDay = todayDay - 1;
      segments.push({
        key: `gap:${startDay}`,
        start: makeTime(startDay),
        end: makeTime(endDay),
        label: `${startDay}-${endDay}`,
        subLabel: "Past",
      });
    }

    for (day = todayDay; makeTime(day) <= monthEnd; day += 1) {
      const time = makeTime(day);
      segments.push({
        key: `future:${day}`,
        start: time,
        end: time,
        label: String(day),
        subLabel: formatRoadmapWeekday(time),
        isToday: time === today,
      });
    }

    return segments.length
      ? segments
      : [
          {
            key: "month",
            start: monthStart,
            end: monthEnd,
            label: "Month",
            subLabel: "",
          },
        ];
  };

  const renderRoadmapView = () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const now = new Date();
    const today = startOfDayTime(now);
    const monthStart = startOfDayTime(
      new Date(now.getFullYear(), now.getMonth(), 1),
    );
    const monthEnd = startOfDayTime(
      new Date(now.getFullYear(), now.getMonth() + 1, 0),
    );
    const segments = buildRoadmapSegments(monthStart, monthEnd, today);
    const timelineMinWidth = segments.length * 70;
    const currentLeft =
      today >= monthStart && today <= monthEnd
        ? (() => {
            const index = segments.findIndex(
              (segment) => today >= segment.start && today <= segment.end,
            );
            return index >= 0 ? ((index + 0.5) / segments.length) * 100 : null;
          })()
        : null;
    const percentLeft = (time) => {
      if (time <= segments[0].start) return 0;
      const last = segments[segments.length - 1];
      if (time >= last.end + dayMs) return 100;
      const index = segments.findIndex(
        (segment) => time >= segment.start && time <= segment.end,
      );
      if (index < 0) return time < segments[0].start ? 0 : 100;
      const segment = segments[index];
      const segmentRange = Math.max(dayMs, segment.end - segment.start + dayMs);
      const offset = Math.max(
        0,
        Math.min(1, (time - segment.start) / segmentRange),
      );
      return ((index + offset) / segments.length) * 100;
    };
    const getClippedBar = (start, end) => {
      const clippedStart = Math.max(start, monthStart);
      const clippedEnd = Math.min(end, monthEnd);
      if (clippedStart > clippedEnd) return null;
      const left = percentLeft(clippedStart);
      const width = Math.max(2.4, percentLeft(clippedEnd + dayMs) - left);
      return { left, width, clippedStart, clippedEnd };
    };

    const roadmapGroups = allGroups.map((group) => ({
      ...group,
      items: group.rows.map((row) => {
        const fallback = getRoadmapTime(row.updatedAtValue) || today;
        const start = startOfDayTime(
          getRoadmapTime(row.startDateValue) || fallback,
        );
        const rawEnd =
          getRoadmapTime(row.dueDateValue) ||
          getRoadmapTime(row.closedDateValue) ||
          start;
        const end = startOfDayTime(rawEnd);
        return { row, start: Math.min(start, end), end: Math.max(start, end) };
      }),
    }));
    const allItems = roadmapGroups.reduce(
      (acc, group) => acc.concat(group.items),
      [],
    );

    const renderMonthGrid = () =>
      React.createElement(
        "div",
        {
          style: {
            position: "absolute",
            inset: 0,
            display: "grid",
            gridTemplateColumns: `repeat(${segments.length}, minmax(70px, 1fr))`,
            pointerEvents: "none",
          },
        },
        segments.map((segment) => {
          const isToday = !!segment.isToday;
          return React.createElement("span", {
            key: segment.key,
            style: {
              borderLeft: `1px solid ${isToday ? token.colorError : token.colorSplit}`,
              background: isToday ? "rgba(255, 77, 79, 0.04)" : undefined,
            },
          });
        }),
      );

    const renderTodayLine = () =>
      currentLeft === null
        ? null
        : React.createElement("span", {
            style: {
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${currentLeft}%`,
              width: 2,
              background: token.colorError,
              opacity: 0.9,
              zIndex: 2,
            },
          });

    const renderTimelineCell = (children, extraStyle = {}) =>
      React.createElement(
        "div",
        {
          style: {
            position: "relative",
            minHeight: 48,
            borderBottom: `1px solid ${token.colorSplit}`,
            overflow: "hidden",
            ...extraStyle,
          },
        },
        renderMonthGrid(),
        renderTodayLine(),
        children,
      );

    const renderItemRow = (item, index) => {
      const bar = getClippedBar(item.start, item.end);
      const isSubtask = !!item.row.parentTaskTitle;
      return React.createElement(
        React.Fragment,
        { key: item.row.key },
        React.createElement(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "34px 1fr",
              gap: token.marginXS,
              alignItems: "center",
              minHeight: 52,
              padding: `${token.paddingXS}px ${token.paddingSM}px`,
              borderBottom: `1px solid ${token.colorSplit}`,
              background: token.colorBgContainer,
            },
          },
          isSubtask
            ? React.createElement("span", {
                style: {
                  width: 18,
                  height: 20,
                  borderLeft: `1px solid ${token.colorBorder}`,
                  borderBottom: `1px solid ${token.colorBorder}`,
                  borderBottomLeftRadius: 4,
                  justifySelf: "center",
                },
              })
            : React.createElement(Text, { type: "secondary" }, `${index + 1}`),
          React.createElement(
            "div",
            { style: { minWidth: 0 } },
            renderTaskTitleLink(item.row, item.row.titleText || "-", {
              display: "block",
            }),
            React.createElement(
              Text,
              { type: "secondary", style: { fontSize: token.fontSizeSM } },
              item.row.assigneeLabel || "Unassigned",
            ),
          ),
        ),
        renderTimelineCell(
          bar
            ? React.createElement(
                Tooltip,
                {
                  title: `${item.row.titleText || "-"}: ${formatRoadmapRange(item.start, item.end)}`,
                },
                React.createElement(
                  "div",
                  {
                    style: {
                      position: "absolute",
                      left: `${bar.left}%`,
                      top: 12,
                      width: `${bar.width}%`,
                      minWidth: 96,
                      maxWidth: "calc(100% - 10px)",
                      height: 28,
                      borderRadius: 4,
                      border: `1px solid ${item.row.isOverdueValue ? token.colorError : token.colorPrimary}`,
                      background: item.row.isOverdueValue
                        ? "#fff1f0"
                        : token.colorBgContainer,
                      color: item.row.isOverdueValue
                        ? token.colorError
                        : token.colorPrimary,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "0 10px",
                      overflow: "hidden",
                      boxShadow: token.boxShadowTertiary,
                      zIndex: 3,
                    },
                  },
                  renderTaskTitleLink(item.row, item.row.titleText || "-", {
                    color: item.row.isOverdueValue
                      ? token.colorError
                      : token.colorPrimary,
                    flex: "1 1 auto",
                    minWidth: 0,
                  }),
                  React.createElement(
                    "span",
                    {
                      style: {
                        color: token.colorTextSecondary,
                        fontSize: token.fontSizeSM,
                        whiteSpace: "nowrap",
                      },
                    },
                    formatRoadmapRange(item.start, item.end),
                  ),
                ),
              )
            : React.createElement(
                "div",
                {
                  style: {
                    position: "relative",
                    zIndex: 3,
                    padding: token.paddingSM,
                    color: token.colorTextSecondary,
                    fontSize: token.fontSizeSM,
                  },
                },
                `Outside ${formatRoadmapMonth(monthStart)}`,
              ),
        ),
      );
    };

    return React.createElement(
      "div",
      {
        style: {
          display: "grid",
          padding: token.paddingSM,
          background: token.colorBgLayout || token.colorBgContainer,
          maxHeight: "calc(100vh - 230px)",
          overflow: "auto",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: `minmax(360px, 420px) minmax(${timelineMinWidth}px, 1fr)`,
            minWidth: 420 + timelineMinWidth,
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
              minHeight: 74,
              padding: token.paddingSM,
              borderBottom: `1px solid ${token.colorSplit}`,
              background: token.colorFillAlter,
            },
          },
          React.createElement(
            Text,
            { style: { fontSize: 16 } },
            formatRoadmapMonth(monthStart),
          ),
          React.createElement(
            "div",
            {
              style: {
                marginTop: 4,
                color: token.colorTextSecondary,
                fontSize: token.fontSizeSM,
              },
            },
            `${allItems.length} tasks | Today: ${formatRoadmapFullDate(today)}`,
          ),
        ),
        renderTimelineCell(
          React.createElement(
            "div",
            {
              style: {
                position: "relative",
                zIndex: 3,
                display: "grid",
                gridTemplateColumns: `repeat(${segments.length}, minmax(70px, 1fr))`,
                minHeight: 74,
              },
            },
            segments.map((segment) => {
              const isToday = !!segment.isToday;
              return React.createElement(
                "div",
                {
                  key: segment.key,
                  style: {
                    display: "grid",
                    alignContent: "center",
                    justifyItems: "center",
                    gap: 2,
                    color: isToday
                      ? token.colorError
                      : token.colorTextSecondary,
                    fontSize: token.fontSizeSM,
                    borderLeft: `1px solid ${isToday ? token.colorError : token.colorSplit}`,
                    background: isToday ? "rgba(255, 77, 79, 0.04)" : undefined,
                  },
                },
                React.createElement(
                  "span",
                  {
                    style: {
                      color: isToday ? token.colorError : token.colorText,
                    },
                  },
                  segment.label,
                ),
                React.createElement("span", null, segment.subLabel),
              );
            }),
          ),
          { minHeight: 74, background: token.colorFillAlter },
        ),
        roadmapGroups.map((group) => {
          const groupColors = getGroupColors();
          const groupRangeText = group.items.length
            ? formatRoadmapRange(
                Math.min(...group.items.map((item) => item.start)),
                Math.max(...group.items.map((item) => item.end)),
              )
            : "-";
          return React.createElement(
            React.Fragment,
            { key: group.key },
            React.createElement(
              "div",
              {
                style: {
                  minHeight: 44,
                  padding: `${token.paddingXS}px ${token.paddingSM}px`,
                  borderBottom: `1px solid ${groupColors.border}`,
                  background: groupColors.background,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: token.marginXS,
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
                    },
                  },
                  group.label,
                ),
              ),
              React.createElement(
                Text,
                {
                  style: {
                    color: groupColors.text,
                    fontSize: token.fontSizeSM,
                  },
                },
                `${group.items.length}`,
              ),
            ),
            renderTimelineCell(
              React.createElement(
                "div",
                {
                  style: {
                    position: "relative",
                    zIndex: 3,
                    padding: token.paddingSM,
                    color: groupColors.text,
                    fontSize: token.fontSizeSM,
                  },
                },
                `Group range: ${groupRangeText}`,
              ),
              { minHeight: 44, background: groupColors.background },
            ),
            group.items.map(renderItemRow),
          );
        }),
      ),
    );
  };

  const renderContent = () => {
    if (loading && !rows.length) {
      return React.createElement(
        "div",
        { style: { padding: 48, textAlign: "center" } },
        React.createElement(Spin, null),
      );
    }
    // "All": flat list, không group theo Case/Status/..., không auto sub-group theo Service
  if (groupBy === "all" && viewMode === "table") {
    if (!sortedRows.length) {
      return React.createElement(Empty, {
        image: Empty.PRESENTED_IMAGE_SIMPLE,
        description: "No task matched the current filters.",
        style: { padding: 48 },
      });
    }
    const flatRows = orderRowsWithSubtasks(sortedRows);
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
      renderSheetTable(flatRows, {
        scope: "all",
        pagination: {
          pageSize: 30,
          showSizeChanger: true,
          showTotal: (total) => `${total} tasks`,
        },
        scroll: { x: tableScrollX, y: 640 },
        sticky: true,
      }),
    );
  }
    if (!allGroups.length) {
      return React.createElement(Empty, {
        image: Empty.PRESENTED_IMAGE_SIMPLE,
        description: "No task matched the current filters.",
        style: { padding: 48 },
      });
    }

    if (viewMode === "board") {
      return renderBoardView();
    }
    if (viewMode === "roadmap") {
      return renderRoadmapView();
    }

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

  return React.createElement(
    Card,
    {
      size: "small",

      extra: React.createElement(
        Button,
        {
          size: "small",
          loading,
          onClick: () => reload({ notifyLimit: true }),
        },
        "Refresh",
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
  );
};

ctx.render(React.createElement(AllTaskBlock, null));
