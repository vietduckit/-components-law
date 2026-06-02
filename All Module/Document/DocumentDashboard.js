// ============================================================
// §1 CONFIG & SETUP
// ============================================================
const { React } = ctx;
const { useState, useEffect, useCallback, useMemo, useRef } = React;
const {
  Spin,
  Typography,
  Tag,
  Empty,
  Tooltip,
  Modal,
  Button,
  Input,
  Form,
  Upload,
  message,
  Table,
  Space,
  Drawer,
  Tabs,
  Descriptions,
  Divider,
  Popconfirm,
  Dropdown,
  Menu,
  Tree,
  Select,
  DatePicker,
  TreeSelect,
  Timeline,
  Avatar,
  Card,
} = ctx.antd;
const { Text, Title } = Typography;
const { Dragger } = Upload;
const { DirectoryTree } = Tree;

const FONT =
  "Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Compact line icons for a quieter document-management UI.
const iconNode = (tag, props) => React.createElement(tag, props);
const makeIcon = (children, options = {}) => {
  const size = options.size || 16;
  return React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: size,
      height: size,
      fill: "none",
      stroke: options.color || "currentColor",
      strokeWidth: options.strokeWidth || 1.8,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
      focusable: false,
      style: {
        display: "inline-block",
        verticalAlign: "-0.18em",
        ...options.style,
      },
    },
    ...children,
  );
};
const iconLabel = (icon, label, color) =>
  React.createElement(
    "span",
    {
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        color: color || "inherit",
        fontFamily: FONT,
      },
    },
    icon,
    React.createElement("span", null, label),
  );

const EditIcon = makeIcon([
  iconNode("path", { d: "M4 20h4.5L19 9.5a2.1 2.1 0 0 0-3-3L5.5 17 4 20Z" }),
  iconNode("path", { d: "m14.5 8.5 3 3" }),
]);
const DeleteIcon = makeIcon([
  iconNode("path", { d: "M4 7h16" }),
  iconNode("path", { d: "M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" }),
  iconNode("path", { d: "m6 7 1 13h10l1-13" }),
  iconNode("path", { d: "M10 11v5" }),
  iconNode("path", { d: "M14 11v5" }),
]);
const HistoryIcon = makeIcon([
  iconNode("path", { d: "M4 12a8 8 0 1 0 2.35-5.65" }),
  iconNode("path", { d: "M4 5.5v4h4" }),
  iconNode("path", { d: "M12 8v4l3 2" }),
]);
const FolderIcon = makeIcon([
  iconNode("path", { d: "M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6A2.5 2.5 0 0 1 20.5 9.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-9Z" }),
]);
const FolderOpenIcon = makeIcon([
  iconNode("path", { d: "M3.5 9V7.5A2.5 2.5 0 0 1 6 5h4l2 2h5.5A2.5 2.5 0 0 1 20 9.5v.5" }),
  iconNode("path", { d: "M4 10h16.5l-2 7.5A2 2 0 0 1 16.6 19H5.7a2 2 0 0 1-1.95-1.55L2.8 13A2.5 2.5 0 0 1 5.25 10Z" }),
]);
const FolderPlusIcon = makeIcon([
  iconNode("path", { d: "M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6A2.5 2.5 0 0 1 20.5 9.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-9Z" }),
  iconNode("path", { d: "M12 10.5v5" }),
  iconNode("path", { d: "M9.5 13h5" }),
]);
const LockIcon = makeIcon([
  iconNode("rect", { x: "5", y: "10", width: "14", height: "10", rx: "2" }),
  iconNode("path", { d: "M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" }),
]);
const UsersIcon = makeIcon([
  iconNode("circle", { cx: "9", cy: "8", r: "3" }),
  iconNode("path", { d: "M3.5 19a5.5 5.5 0 0 1 11 0" }),
  iconNode("path", { d: "M16 11a3 3 0 0 0 0-6" }),
  iconNode("path", { d: "M17.5 19a5.2 5.2 0 0 0-2.2-4.2" }),
]);
const MoveIcon = makeIcon([
  iconNode("path", { d: "M12 3v18" }),
  iconNode("path", { d: "m8.5 6.5 3.5-3.5 3.5 3.5" }),
  iconNode("path", { d: "m8.5 17.5 3.5 3.5 3.5-3.5" }),
  iconNode("path", { d: "M3 12h18" }),
  iconNode("path", { d: "m6.5 8.5-3.5 3.5 3.5 3.5" }),
  iconNode("path", { d: "m17.5 8.5 3.5 3.5-3.5 3.5" }),
]);
const EyeIcon = makeIcon([
  iconNode("path", { d: "M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" }),
  iconNode("circle", { cx: "12", cy: "12", r: "2.5" }),
]);
const DownloadIcon = makeIcon([
  iconNode("path", { d: "M12 4v10" }),
  iconNode("path", { d: "m8 10 4 4 4-4" }),
  iconNode("path", { d: "M5 19h14" }),
]);
const UploadIcon = makeIcon([
  iconNode("path", { d: "M12 20V10" }),
  iconNode("path", { d: "m8 14 4-4 4 4" }),
  iconNode("path", { d: "M5 6h14" }),
]);
const FileIcon = makeIcon([
  iconNode("path", { d: "M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5Z" }),
  iconNode("path", { d: "M14 3.5V8h4" }),
]);
const SearchIcon = makeIcon([
  iconNode("circle", { cx: "11", cy: "11", r: "6.5" }),
  iconNode("path", { d: "m16 16 4 4" }),
]);
const RefreshIcon = makeIcon([
  iconNode("path", { d: "M20 12a8 8 0 0 1-13.5 5.8" }),
  iconNode("path", { d: "M4 12A8 8 0 0 1 17.5 6.2" }),
  iconNode("path", { d: "M17 3v4h-4" }),
  iconNode("path", { d: "M7 21v-4h4" }),
]);
const PlusIcon = makeIcon([
  iconNode("path", { d: "M12 5v14" }),
  iconNode("path", { d: "M5 12h14" }),
]);
const CheckIcon = makeIcon([
  iconNode("path", { d: "m5 12 4 4 10-10" }),
]);
const CloseIcon = makeIcon([
  iconNode("path", { d: "M6 6l12 12" }),
  iconNode("path", { d: "M18 6 6 18" }),
]);
const ChevronLeftIcon = makeIcon([
  iconNode("polyline", { points: "15 18 9 12 15 6" }),
], { size: 14 });
const ChevronRightIcon = makeIcon([
  iconNode("polyline", { points: "9 18 15 12 9 6" }),
], { size: 14 });
const WarningIcon = makeIcon([
  iconNode("path", { d: "M12 4 3 20h18L12 4Z" }),
  iconNode("path", { d: "M12 9v5" }),
  iconNode("path", { d: "M12 17h.01" }),
]);
const MoreIcon = makeIcon(
  [
    iconNode("circle", { cx: "6", cy: "12", r: "1.2", fill: "currentColor", stroke: "none" }),
    iconNode("circle", { cx: "12", cy: "12", r: "1.2", fill: "currentColor", stroke: "none" }),
    iconNode("circle", { cx: "18", cy: "12", r: "1.2", fill: "currentColor", stroke: "none" }),
  ],
  { size: 18 },
);

const ReloadButton = ({
  onReload,
  loading,
  text = "Làm mới",
  style = {},
  size,
}) => {
  return React.createElement(
    Button,
    {
      size: size,
      onClick: onReload,
      loading: loading,
      style: {
        fontFamily: FONT,
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      },
    },
    !loading
      ? iconLabel(RefreshIcon, text)
      : text,
  );
};

const extractId = (val) => {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "object") return val.id ? parseInt(val.id, 10) : null;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
};

const MODULE_SCOPE = {
  CASE_DOCUMENT: "case_document",
  INTERNAL_TEMPLATE: "internal_template",
  LEGAL_REFERENCE: "legal_reference",
  PROJECT_INTERNAL: "project_internal",
};

const MODULE_SCOPE_LABEL = {
  [MODULE_SCOPE.CASE_DOCUMENT]: "Case documents",
  [MODULE_SCOPE.INTERNAL_TEMPLATE]: "Internal template files",
  [MODULE_SCOPE.LEGAL_REFERENCE]: "Legal reference",
  [MODULE_SCOPE.PROJECT_INTERNAL]: "Project internal files",
};

const LEGAL_STUDY_FOLDER_NAME = "Legal Study";

const DOCUMENT_DASHBOARD_CONFIG = {
  // auto | global | customers | cases | tasks | quotations | contracts | internal_templates | legal_reference | project_internal
  mode: "global",
  moduleScope: null,
  debug: true,
  // false: render the full folder tree returned by the API for the selected mode.
  // true: additionally filter folders by folderManager/folderMember/creator on the client.
  respectFolderPermissions: true,
};

const DEBUG_DOCUMENT_DASHBOARD = !!DOCUMENT_DASHBOARD_CONFIG.debug;
const debugDashboard = (...args) => {
  if (DEBUG_DOCUMENT_DASHBOARD) console.log("[DEBUG][DocumentDashboard]", ...args);
};

const DOCUMENT_SAFE_FIELDS = [
  "id",
  "documentType",
  "collectionName",
  "googleDriveUrl",
  "uploadedById",
  "createdById",
  "updatedById",
  "createdAt",
  "updatedAt",
  "documentCode",
  "title",
  "openingDate",
  "signedAt",
  "effectiveAt",
  "status",
  "senderName",
  "recipientName",
  "language",
  "docFormat",
  "description",
  "note",
  "folderId",
  "fileIndex",
  "batchId",
  "isDeleted",
  "deletedAt",
  "moduleScope",
  "sourceProjectId",
  "sourceTaskId",
  "sourceCollectionName",
  "sourceRecordId",
  "movedToLegalReferenceAt",
  "movedToLegalReferenceById",
  "internalCompanyId",
  "legalReferenceId",
  "internalTemplateId",
  "storageType",
  "customerId",
  "caseId",
  "contractId",
  "quotationId",
  "taskId",
  "subTaskId",
];

const sanitizeDocumentFields = (fields) => {
  const source = Array.isArray(fields)
    ? fields
    : typeof fields === "string"
      ? fields.split(",")
      : DOCUMENT_SAFE_FIELDS;
  return source
    .map((field) => String(field || "").trim())
    .filter((field) => field && field !== "recordId");
};

const withDocumentSafeFields = (params = {}) => ({
  ...params,
  fields: sanitizeDocumentFields(params?.fields),
});

const stripDocumentLegacyPayload = (payload = {}) => {
  const { recordId, projectId, ...safePayload } = payload || {};
  return safePayload;
};

const requestDocumentApi = async ({ params, data, ...options }) =>
  ctx.api.request({
    ...options,
    params: withDocumentSafeFields(params),
    data: stripDocumentLegacyPayload(data),
  });

const getDocumentDirectLinkPayload = (context) => {
  const safeContextId = extractId(context?.recordId);
  if (!safeContextId || context?.mode === "global") return {};

  if (context?.mode === "cases") {
    const caseId = extractId(context.projectId) || safeContextId;
    return {
      collectionName: "Project",
      caseId,
      ...(context.customerId ? { customerId: extractId(context.customerId) } : {}),
    };
  }

  if (context?.mode === "customers") {
    return {
      collectionName: "Customer",
      customerId: safeContextId,
    };
  }

  if (context?.mode === "tasks") {
    return {
      collectionName: "Task",
      taskId: safeContextId,
      ...(context.projectId ? { caseId: extractId(context.projectId) } : {}),
      ...(context.customerId ? { customerId: extractId(context.customerId) } : {}),
    };
  }

  if (context?.mode === "quotations") {
    return {
      collectionName: "Quotation",
      quotationId: safeContextId,
      ...(context.projectId ? { caseId: extractId(context.projectId) } : {}),
      ...(context.customerId ? { customerId: extractId(context.customerId) } : {}),
    };
  }

  if (context?.mode === "contracts") {
    return {
      collectionName: "Contract",
      contractId: safeContextId,
      ...(context.projectId ? { caseId: extractId(context.projectId) } : {}),
      ...(context.customerId ? { customerId: extractId(context.customerId) } : {}),
    };
  }

  if (context?.mode === "legal_reference") {
    return {
      collectionName: "LegalReference",
      legalReferenceId: safeContextId,
      ...(context.internalCompanyId
        ? { internalCompanyId: extractId(context.internalCompanyId) }
        : {}),
    };
  }

  if (context?.mode === "internal_templates") {
    return {
      collectionName: "InternalCompany",
      internalCompanyId: safeContextId,
    };
  }

  return context?.collection ? { collectionName: context.collection } : {};
};

const getDocumentDirectLinkFilter = (context, recordId = null) => {
  const safeContextId = extractId(recordId) || extractId(context?.recordId);
  if (!safeContextId || context?.mode === "global") return null;

  if (context?.mode === "cases") {
    const caseId = extractId(context.projectId) || safeContextId;
    return { caseId: { $eq: caseId } };
  }
  if (context?.mode === "customers") return { customerId: { $eq: safeContextId } };
  if (context?.mode === "tasks") return { taskId: { $eq: safeContextId } };
  if (context?.mode === "quotations") return { quotationId: { $eq: safeContextId } };
  if (context?.mode === "contracts") return { contractId: { $eq: safeContextId } };
  if (context?.mode === "legal_reference") return { legalReferenceId: { $eq: safeContextId } };
  if (context?.mode === "internal_templates") return { internalCompanyId: { $eq: safeContextId } };
  return null;
};

const debugRecordSnapshot = (record) => {
  if (!record) return null;
  return {
    id: record.id,
    idExtracted: extractId(record.id || record),
    name: record.name || record.title,
    parentId: record.parentId,
    parentIdExtracted: extractId(record.parentId),
    customerId: record.customerId,
    projectId: record.projectId,
    projectInternalId: record.projectInternalId,
    internalCompanyId: record.internalCompanyId,
    legalReferenceId: record.legalReferenceId,
    moduleScope: record.moduleScope,
  };
};

const MODE_COLLECTION = {
  global: "Project",
  customers: "Customer",
  cases: "Project",
  tasks: "Task",
  quotations: "Quotation",
  contracts: "Contract",
  internal_templates: "InternalCompany",
  legal_reference: "LegalReference",
  project_internal: "Project Internal",
};

const MODE_SCOPE = {
  global: MODULE_SCOPE.CASE_DOCUMENT,
  customers: MODULE_SCOPE.CASE_DOCUMENT,
  cases: MODULE_SCOPE.CASE_DOCUMENT,
  tasks: MODULE_SCOPE.CASE_DOCUMENT,
  quotations: MODULE_SCOPE.CASE_DOCUMENT,
  contracts: MODULE_SCOPE.CASE_DOCUMENT,
  internal_templates: MODULE_SCOPE.INTERNAL_TEMPLATE,
  legal_reference: MODULE_SCOPE.LEGAL_REFERENCE,
  project_internal: MODULE_SCOPE.PROJECT_INTERNAL,
};

const getRuntimeOptionCandidates = (key) => {
  try {
    const candidates = [
      ctx?.[key],
      ctx?.options?.[key],
      ctx?.props?.[key],
      ctx?.popupParams?.[key],
      ctx?.block?.[key],
      ctx?.block?.props?.[key],
      ctx?.schema?.[key],
      ctx?.schema?.[`x-${key}`],
    ];
    return candidates.filter((v) => v !== undefined && v !== null && v !== "");
  } catch {
    return [];
  }
};

const getRuntimeOption = (key) =>
  getRuntimeOptionCandidates(key)[0] || null;

const getRuntimeCollectionName = () => {
  try {
    return (
      ctx?.collectionName ||
      ctx?.collection?.name ||
      ctx?.collection?.resourceName ||
      ctx?.record?.__collectionName ||
      ctx?.schema?.["x-collection"] ||
      ""
    );
  } catch {
    return "";
  }
};

const getUrlFilterByTk = () => {
  try {
    const match =
      window.location.pathname.match(/\/filterbytk\/(\d+)/i) ||
      window.location.href.match(/\/filterbytk\/(\d+)/i);
    return match ? extractId(match[1]) : null;
  } catch {
    return null;
  }
};

const normalizeDashboardMode = (mode) => {
  const value = String(mode || "auto").trim().toLowerCase();
  const aliasKey = value.replace(/[\s-]+/g, "_");
  const aliases = {
    case: "cases",
    project: "cases",
    projects: "cases",
    customer: "customers",
    task: "tasks",
    quotation: "quotations",
    quote: "quotations",
    contract: "contracts",
    project_internal: "project_internal",
    projectinternal: "project_internal",
    internal_project: "project_internal",
    internal_projects: "project_internal",
    internal_template: "internal_templates",
    internaltemplate: "internal_templates",
    internal_company_template: "internal_templates",
    internal_company_templates: "internal_templates",
    legalreference: "legal_reference",
    legal_references: "legal_reference",
  };
  const normalized = aliases[value] || aliases[aliasKey] || value;
  return normalized in MODE_COLLECTION || normalized === "auto"
    ? normalized
    : "auto";
};

const getRuntimeDashboardMode = () => {
  const keys = ["dashboardMode", "documentDashboardMode", "documentMode", "mode"];
  for (const key of keys) {
    for (const candidate of getRuntimeOptionCandidates(key)) {
      const normalized = normalizeDashboardMode(candidate);
      if (normalized !== "auto") return normalized;
    }
  }
  return "auto";
};

const getDashboardConfig = () => {
  const codeMode = normalizeDashboardMode(DOCUMENT_DASHBOARD_CONFIG.mode);
  const runtimeDashboardMode = getRuntimeDashboardMode();
  const runtimeModuleScope = getRuntimeOption("moduleScope");
  const runtimeRespectPermissions = getRuntimeOption("respectFolderPermissions");
  const resolvedMode =
    runtimeDashboardMode !== "auto" ? runtimeDashboardMode : codeMode;
  return {
    ...DOCUMENT_DASHBOARD_CONFIG,
    mode: resolvedMode,
    moduleScope: runtimeModuleScope || DOCUMENT_DASHBOARD_CONFIG.moduleScope || null,
    respectFolderPermissions:
      runtimeRespectPermissions === undefined ||
        runtimeRespectPermissions === null
        ? DOCUMENT_DASHBOARD_CONFIG.respectFolderPermissions
        : !["false", "0", "no"].includes(
          String(runtimeRespectPermissions).toLowerCase(),
        ),
  };
};

const getCurrentUser = () => {
  try {
    return (
      ctx.currentUser ||
      ctx.app?.currentUser ||
      ctx.store?.getState()?.currentUser ||
      null
    );
  } catch {
    return null;
  }
};

const compactKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const isProjectInternalCollectionName = (value) =>
  compactKey(value) === "projectinternal";

const isLegalReferenceCollectionName = (value) =>
  ["legalreference", "legalreferences"].includes(compactKey(value));

const getContextProjectInternalId = (context) =>
  extractId(context?.projectInternalId) ||
  (context?.mode === "project_internal" ? extractId(context?.recordId) : null);

const getContextLegalReferenceId = (context) =>
  extractId(context?.legalReferenceId) ||
  (context?.mode === "legal_reference" ? extractId(context?.recordId) : null);

// ==================== SUPER CONTEXT DETECTOR ====================
const getContext = () => {
  const record = ctx.record;
  const recordObject = record && typeof record === "object" ? record : {};
  const config = getDashboardConfig();
  const configuredMode = config.mode;
  const runtimeCollectionName = String(getRuntimeCollectionName()).toLowerCase();
  const configuredInternalCompanyId = extractId(
    getRuntimeOption("internalCompanyId"),
  );
  const configuredProjectInternalId =
    extractId(getRuntimeOption("projectInternalId")) ||
    extractId(getRuntimeOption("internalProjectId"));
  const configuredRecordId =
    extractId(getRuntimeOption("dashboardRecordId")) ||
    extractId(getRuntimeOption("documentRecordId")) ||
    extractId(getRuntimeOption("recordId")) ||
    configuredProjectInternalId;
  const urlRecordId =
    configuredMode !== "auto" && configuredMode !== "global"
      ? getUrlFilterByTk()
      : null;
  const recordIdFromContext =
    extractId(recordObject.id) ||
    extractId(record) ||
    configuredRecordId ||
    urlRecordId;

  const buildConfiguredContext = (mode) => {
    const recordId = mode === "global" ? null : recordIdFromContext;
    const customerId =
      mode === "customers"
        ? recordId
        : extractId(recordObject.customerId) || extractId(recordObject.customer);
    const projectId =
      mode === "cases"
        ? recordId
        : mode === "project_internal"
          ? null
          : extractId(recordObject.projectId) || extractId(recordObject.project);
    const projectInternalId =
      mode === "project_internal"
        ? recordId
        : extractId(recordObject.projectInternalId) ||
        extractId(recordObject.projectInternal) ||
        configuredProjectInternalId;
    const internalCompanyId =
      mode === "internal_templates"
        ? configuredInternalCompanyId || recordId
        : configuredInternalCompanyId ||
        extractId(recordObject.internalCompanyId) ||
        extractId(recordObject.internalCompany);

    return {
      mode,
      modeSource: "config",
      respectFolderPermissions: config.respectFolderPermissions,
      recordId,
      collection: MODE_COLLECTION[mode] || "Project",
      customerId,
      projectId,
      projectInternalId,
      internalCompanyId,
      moduleScope: config.moduleScope || MODE_SCOPE[mode] || MODULE_SCOPE.CASE_DOCUMENT,
    };
  };

  if (configuredMode !== "auto") {
    return buildConfiguredContext(configuredMode);
  }

  let mode = "global";
  let recordId = null;
  let collection = "Project";
  let moduleScope = config.moduleScope || MODULE_SCOPE.CASE_DOCUMENT;

  let customerId = null;
  let projectId = null;
  let projectInternalId = configuredProjectInternalId;
  let internalCompanyId = configuredInternalCompanyId;
  if (isLegalReferenceCollectionName(runtimeCollectionName)) {
    moduleScope = MODULE_SCOPE.LEGAL_REFERENCE;
  }
  if (runtimeCollectionName.includes("internalcompan")) {
    moduleScope = MODULE_SCOPE.INTERNAL_TEMPLATE;
  }
  if (isProjectInternalCollectionName(runtimeCollectionName)) {
    moduleScope = MODULE_SCOPE.PROJECT_INTERNAL;
  }

  if (record) {
    recordId = recordIdFromContext;
    customerId =
      extractId(recordObject.customerId) || extractId(recordObject.customer);
    projectId =
      extractId(recordObject.projectId) || extractId(recordObject.project);
    projectInternalId =
      projectInternalId ||
      extractId(recordObject.projectInternalId) ||
      extractId(recordObject.projectInternal);
    internalCompanyId =
      internalCompanyId ||
      extractId(recordObject.internalCompanyId) ||
      extractId(recordObject.internalCompany);

    if (
      isLegalReferenceCollectionName(runtimeCollectionName) ||
      "referenceCode" in recordObject ||
      "sourceCaseId" in recordObject ||
      "caseLegalReference" in recordObject
    ) {
      mode = "legal_reference";
      collection = "LegalReference";
      moduleScope = MODULE_SCOPE.LEGAL_REFERENCE;
    } else if (
      isProjectInternalCollectionName(runtimeCollectionName) ||
      (
        "projectCode" in recordObject &&
        "projectManagerId" in recordObject &&
        !("customerId" in recordObject) &&
        !("customer" in recordObject)
      )
    ) {
      mode = "project_internal";
      collection = "Project Internal";
      projectInternalId = recordId;
      projectId = null;
      moduleScope = MODULE_SCOPE.PROJECT_INTERNAL;
    } else if (
      runtimeCollectionName.includes("internalcompan") ||
      "internalCompanyCode" in recordObject ||
      "internalCompanyName" in recordObject
    ) {
      mode = "internal_templates";
      collection = "InternalCompany";
      internalCompanyId = recordId;
      moduleScope = MODULE_SCOPE.INTERNAL_TEMPLATE;
    } else if (
      "email" in recordObject ||
      "taxCode" in recordObject ||
      "customerCode" in recordObject
    ) {
      mode = "customers";
      collection = "Customer";
      customerId = recordId;
    } else if (
      "lawyerId" in recordObject &&
      "priority" in recordObject &&
      !("projectManagerId" in recordObject)
    ) {
      mode = "tasks";
      collection = "Task";
    } else if ("quotationNumber" in recordObject) {
      mode = "quotations";
      collection = "Quotation";
    } else if ("contractCode" in recordObject || "signedDate" in recordObject) {
      mode = "contracts";
      collection = "Contract";
    } else {
      mode = "cases";
      collection = "Project";
      projectId = recordId;
    }
  } else if (moduleScope === MODULE_SCOPE.INTERNAL_TEMPLATE) {
    mode = "internal_templates";
    collection = "InternalCompany";
  } else if (moduleScope === MODULE_SCOPE.LEGAL_REFERENCE) {
    mode = "legal_reference";
    collection = "LegalReference";
  } else if (moduleScope === MODULE_SCOPE.PROJECT_INTERNAL) {
    mode = "project_internal";
    collection = "Project Internal";
    recordId = projectInternalId || recordId;
  }

  return {
    mode,
    modeSource: "auto",
    respectFolderPermissions: config.respectFolderPermissions,
    recordId,
    collection,
    customerId,
    projectId,
    projectInternalId,
    internalCompanyId,
    moduleScope,
  };
};

const CONTEXT = getContext();

const resolveLogicalParentId = async (context, currentParentId) => {
  const explicitId = extractId(currentParentId);
  if (explicitId && currentParentId !== "root") return explicitId;
  try {
    // 1. Ưu tiên tìm folder liên kết trực tiếp (Báo giá/Hợp đồng)
    if (context.mode === "quotations" && context.recordId) {
      const qRes = await ctx.api.request({
        url: "folders:list",
        params: {
          filter: JSON.stringify({ quotationId: { $eq: context.recordId } }),
          pageSize: 1,
        },
      });
      const qFolder = qRes?.data?.data?.[0];
      if (qFolder) return extractId(qFolder.id);
    }

    if (context.mode === "contracts" && context.recordId) {
      const cRes = await ctx.api.request({
        url: "folders:list",
        params: {
          filter: JSON.stringify({ contractId: { $eq: context.recordId } }),
          pageSize: 1,
        },
      });
      const cFolder = cRes?.data?.data?.[0];
      if (cFolder) return extractId(cFolder.id);
    }

    if (context.mode === "project_internal") {
      const projectInternalId = getContextProjectInternalId(context);
      if (projectInternalId) {
        const piRes = await ctx.api.request({
          url: "folders:list",
          params: {
            filter: JSON.stringify({
              projectInternalId: { $eq: projectInternalId },
            }),
            sort: ["createdAt"],
          },
        });
        const piFolders = piRes?.data?.data || [];
        const projectInternalRoot = piFolders.find((f) => {
          const parent = piFolders.find(
            (pf) => extractId(pf.id) === extractId(f.parentId),
          );
          return (
            !parent ||
            extractId(parent.projectInternalId) !== projectInternalId
          );
        });
        if (projectInternalRoot) return extractId(projectInternalRoot.id);
      }
    }

    // 2. Fallback tìm folder gốc của Project (như cũ)
    if (
      ["tasks", "quotations", "contracts"].includes(context.mode) &&
      context.projectId
    ) {
      const pRes = await ctx.api.request({
        url: "folders:list",
        params: {
          filter: JSON.stringify({ projectId: { $eq: context.projectId } }),
          sort: ["createdAt"],
        },
      });
      const pFolders = pRes?.data?.data || [];
      const caseRoot = pFolders.find(
        (f) =>
          !f.parentId ||
          !pFolders.some((pf) => extractId(pf.id) === extractId(f.parentId)),
      );
      if (caseRoot) return extractId(caseRoot.id);
    }
    // 3. Fallback tìm folder gốc của Customer (như cũ)
    if (
      ["cases", "tasks", "quotations", "contracts"].includes(context.mode) &&
      context.customerId
    ) {
      const cRes = await ctx.api.request({
        url: "folders:list",
        params: {
          filter: JSON.stringify({ customerId: { $eq: context.customerId } }),
          sort: ["createdAt"],
        },
      });
      const cFolders = cRes?.data?.data || [];
      const customerRoot = cFolders.find(
        (f) =>
          !f.parentId ||
          !cFolders.some((cf) => extractId(cf.id) === extractId(f.parentId)),
      );
      if (customerRoot) return extractId(customerRoot.id);
    }
  } catch (e) { }
  return null;
};

// ==================== FORMATTERS ====================
const formatBytes = (bytes) => {
  if (!bytes || isNaN(bytes) || bytes === 0) return "--";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const FILE_EXT_COLOR = {
  ".pdf": { color: "#ff4d4f", bg: "#fff2f0" },
  ".doc": { color: "#1890ff", bg: "#e6f7ff" },
  ".docx": { color: "#1890ff", bg: "#e6f7ff" },
  ".xls": { color: "#52c41a", bg: "#f6ffed" },
  ".xlsx": { color: "#52c41a", bg: "#f6ffed" },
  ".png": { color: "#722ed1", bg: "#f9f0ff" },
  ".jpg": { color: "#722ed1", bg: "#f9f0ff" },
  ".jpeg": { color: "#722ed1", bg: "#f9f0ff" },
  ".gif": { color: "#722ed1", bg: "#f9f0ff" },
  ".webp": { color: "#722ed1", bg: "#f9f0ff" },
  ".html": { color: "#fa8c16", bg: "#fff7e6" },
  ".htm": { color: "#fa8c16", bg: "#fff7e6" },
};
const getExtInfo = (ext = "") =>
  FILE_EXT_COLOR[ext.toLowerCase()] || { color: "#8c8c8c", bg: "#fafafa" };
const getUserName = (u) =>
  !u
    ? null
    : u.nickname ||
    `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
    u.username ||
    u.email ||
    null;
const formatDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
const formatRelative = (iso) => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "Vừa xong";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} ngày trước`;
  return formatDateTime(iso);
};

const compareCreatedAt = (a, b) => {
  const at = new Date(a?.createdAt || 0).getTime() || 0;
  const bt = new Date(b?.createdAt || 0).getTime() || 0;
  if (at !== bt) return at - bt;
  return String(a?.name || "").localeCompare(String(b?.name || ""), "vi");
};

const normalizeFileParentId = (parentId) =>
  parentId === "root" || !parentId ? null : extractId(parentId);

const addScopeFilters = (filter, moduleScope, internalCompanyId) => {
  const next = { ...(filter || {}) };

  // Do not send the null-check operator to NocoBase. For case_document we keep backward
  // compatibility by fetching without a moduleScope condition and filtering
  // legacy records in JS via matchesModuleScope().
  if (moduleScope && moduleScope !== MODULE_SCOPE.CASE_DOCUMENT) {
    next.moduleScope = { $eq: moduleScope };
  }

  const companyId = extractId(internalCompanyId);
  if (companyId && !next.internalCompanyId) {
    next.internalCompanyId = { $eq: companyId };
  }

  return next;
};

const fetchAllList = async (url, params = {}, pageSize = 2000) => {
  const all = [];
  let page = 1;
  let total = null;
  const safeParams = url === "documents:list" ? withDocumentSafeFields(params) : params;
  debugDashboard("fetchAllList:start", { url, params, pageSize });

  while (true) {
    const res = await ctx.api.request({
      url,
      params: {
        ...safeParams,
        page,
        pageSize,
      },
    });
    const responseBody =
      Array.isArray(res?.data?.data) || res?.data?.meta ? res.data : res;
    const items = Array.isArray(responseBody?.data)
      ? responseBody.data
      : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];
    const meta = responseBody?.meta || res?.data?.meta || res?.meta || {};
    all.push(...items);

    debugDashboard("fetchAllList:page", {
      url,
      page,
      responseShape: {
        hasResDataDataArray: Array.isArray(res?.data?.data),
        hasResDataArray: Array.isArray(res?.data),
        hasDirectDataArray: Array.isArray(res?.data),
        responseKeys: res && typeof res === "object" ? Object.keys(res) : [],
        dataKeys:
          res?.data && typeof res.data === "object" && !Array.isArray(res.data)
            ? Object.keys(res.data)
            : [],
      },
      itemCount: items.length,
      totalSoFar: all.length,
      meta,
      firstItem: debugRecordSnapshot(items[0]),
    });

    total =
      meta?.count ??
      meta?.total ??
      meta?.totalCount ??
      total;

    if (items.length === 0) break;
    if (total !== null) {
      if (all.length >= total) break;
    } else if (items.length < pageSize) {
      break;
    }
    page += 1;
  }

  debugDashboard("fetchAllList:done", {
    url,
    totalItems: all.length,
    firstItem: debugRecordSnapshot(all[0]),
    lastItem: debugRecordSnapshot(all[all.length - 1]),
  });

  return all;
};

const DOCUMENT_LIST_APPEND_FALLBACKS = [
  ["fileAttachment", "internalCompany", "legalReference", "updatedBy", "createdBy"],
  ["fileAttachment", "internalCompany", "updatedBy", "createdBy"],
  ["fileAttachment", "legalReference", "updatedBy", "createdBy"],
  ["fileAttachment", "updatedBy", "createdBy"],
];

const areAppendProfilesSame = (a = [], b = []) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

const fetchAllDocumentsList = async (params = {}) => {
  const { appends, ...restParams } = params || {};
  const preferredAppends = Array.isArray(appends)
    ? appends
    : DOCUMENT_LIST_APPEND_FALLBACKS[0];
  const appendProfiles = [preferredAppends, ...DOCUMENT_LIST_APPEND_FALLBACKS]
    .filter(Boolean)
    .filter(
      (profile, index, profiles) =>
        profiles.findIndex((candidate) =>
          areAppendProfilesSame(candidate, profile),
        ) === index,
    );
  let lastError = null;

  for (const appendProfile of appendProfiles) {
    try {
      return await fetchAllList("documents:list", {
        ...restParams,
        appends: appendProfile,
      });
    } catch (e) {
      lastError = e;
      console.warn("[DEBUG][documents:list] retry with reduced appends", {
        failedAppends: appendProfile,
        error: e?.message || String(e),
      });
    }
  }

  if (lastError) {
    console.warn("[DEBUG][documents:list] retry without appends", lastError);
  }
  return fetchAllList("documents:list", restParams);
};


const normalizeModuleScopeValue = (rawScope) => {
  if (Array.isArray(rawScope)) {
    return normalizeModuleScopeValue(rawScope[0]);
  }
  const raw =
    rawScope && typeof rawScope === "object"
      ? rawScope.value ||
      rawScope.name ||
      rawScope.key ||
      rawScope.label ||
      rawScope.id
      : rawScope;
  if (!raw) return "";
  const value = String(raw).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["case", "cases", "project", "projects", "case_documents"].includes(value))
    return MODULE_SCOPE.CASE_DOCUMENT;
  if (["internal_template", "internal_templates", "internal_company_template"].includes(value))
    return MODULE_SCOPE.INTERNAL_TEMPLATE;
  if (["legal_reference", "legal_references"].includes(value))
    return MODULE_SCOPE.LEGAL_REFERENCE;
  if (["project_internal", "projectinternal", "internal_project", "internal_projects"].includes(value))
    return MODULE_SCOPE.PROJECT_INTERNAL;
  return value;
};

const matchesModuleScope = (record, moduleScope) => {
  const scope = normalizeModuleScopeValue(record?.moduleScope);
  const expectedScope = normalizeModuleScopeValue(moduleScope);
  if (!expectedScope || expectedScope === MODULE_SCOPE.CASE_DOCUMENT) {
    return !scope || scope === MODULE_SCOPE.CASE_DOCUMENT;
  }
  if (expectedScope === MODULE_SCOPE.PROJECT_INTERNAL) {
    return (
      scope === MODULE_SCOPE.PROJECT_INTERNAL ||
      (
        !scope &&
        (
          extractId(record?.projectInternalId) ||
          extractId(record?.projectInternal) ||
          isProjectInternalCollectionName(record?.collectionName)
        )
      )
    );
  }
  return scope === expectedScope;
};

const getRecordLegalReferenceId = (record) =>
  extractId(record?.legalReferenceId) ||
  extractId(record?.legalReference) ||
  extractId(record?.legalReferenceRecord);

const isLinkedToLegalReference = (record, legalReferenceId) => {
  const safeId = extractId(legalReferenceId);
  if (!safeId) return true;
  if (getRecordLegalReferenceId(record) === safeId) return true;
  return (
    isLegalReferenceCollectionName(record?.collectionName) &&
    extractId(record?.recordId) === safeId
  );
};

const filterFoldersForContext = (folders, context) => {
  const byId = new Map(
    folders
      .map((folder) => [extractId(folder.id), folder])
      .filter(([id]) => !!id),
  );
  const childrenByParent = new Map();
  folders.forEach((folder) => {
    const parentId = extractId(folder.parentId);
    if (!parentId) return;
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(folder);
  });

  const collectDescendants = (folder, keep) => {
    const id = extractId(folder.id);
    if (!id) return;
    (childrenByParent.get(id) || []).forEach((child) => {
      const childId = extractId(child.id);
      if (!childId || keep.has(childId)) return;
      keep.add(childId);
      collectDescendants(child, keep);
    });
  };

  if (context?.mode === "customers") {
    const customerId = extractId(context.customerId) || extractId(context.recordId);
    if (!customerId) return folders;

    const customerRootFolders = folders.filter((folder) => {
      if (extractId(folder.customerId) !== customerId) return false;
      if (extractId(folder.projectId)) return false;
      const parent = byId.get(extractId(folder.parentId));
      return !parent || extractId(parent.customerId) !== customerId;
    });

    if (customerRootFolders.length === 0) return folders;
    const keep = new Set();
    customerRootFolders.forEach((folder) => collectDescendants(folder, keep));
    debugDashboard("filterFoldersForContext:customers", {
      customerId,
      totalFolders: folders.length,
      rootFolders: customerRootFolders.map(debugRecordSnapshot),
      descendantCount: keep.size,
      descendantSamples: folders
        .filter((folder) => keep.has(extractId(folder.id)))
        .slice(0, 5)
        .map(debugRecordSnapshot),
    });
    return folders.filter((folder) => keep.has(extractId(folder.id)));
  }

  if (context?.mode === "cases") {
    const projectId = extractId(context.projectId) || extractId(context.recordId);
    if (!projectId) return folders;

    const caseRootFolders = folders.filter((folder) => {
      if (extractId(folder.projectId) !== projectId) return false;
      const parent = byId.get(extractId(folder.parentId));
      return !parent || extractId(parent.projectId) !== projectId;
    });

    if (caseRootFolders.length === 0) return folders;
    const keep = new Set();
    caseRootFolders.forEach((folder) => collectDescendants(folder, keep));
    debugDashboard("filterFoldersForContext:cases", {
      projectId,
      totalFolders: folders.length,
      rootFolders: caseRootFolders.map(debugRecordSnapshot),
      descendantCount: keep.size,
      descendantSamples: folders
        .filter((folder) => keep.has(extractId(folder.id)))
        .slice(0, 5)
        .map(debugRecordSnapshot),
    });
    return folders.filter((folder) => keep.has(extractId(folder.id)));
  }

  if (context?.mode === "legal_reference") {
    const legalReferenceId = getContextLegalReferenceId(context);
    if (!legalReferenceId) return folders;

    const legalReferenceRootFolders = folders.filter((folder) => {
      if (!isLinkedToLegalReference(folder, legalReferenceId)) return false;
      const parent = byId.get(extractId(folder.parentId));
      return !parent || !isLinkedToLegalReference(parent, legalReferenceId);
    });

    if (legalReferenceRootFolders.length === 0) {
      debugDashboard("filterFoldersForContext:legal_reference:no-root", {
        legalReferenceId,
        totalFolders: folders.length,
      });
      return [];
    }
    const keep = new Set();
    legalReferenceRootFolders.forEach((folder) => {
      const rootId = extractId(folder.id);
      if (rootId) keep.add(rootId);
      collectDescendants(folder, keep);
    });
    debugDashboard("filterFoldersForContext:legal_reference", {
      legalReferenceId,
      totalFolders: folders.length,
      rootFolders: legalReferenceRootFolders.map(debugRecordSnapshot),
      descendantCount: keep.size,
      descendantSamples: folders
        .filter((folder) => keep.has(extractId(folder.id)))
        .slice(0, 5)
        .map(debugRecordSnapshot),
    });
    return folders.filter((folder) => keep.has(extractId(folder.id)));
  }

  if (context?.mode === "project_internal") {
    const projectInternalId = getContextProjectInternalId(context);
    if (!projectInternalId) return [];

    const projectInternalRootFolders = folders.filter((folder) => {
      const folderProjectInternalId =
        extractId(folder.projectInternalId) || extractId(folder.projectInternal);
      if (folderProjectInternalId !== projectInternalId) return false;
      const parent = byId.get(extractId(folder.parentId));
      const parentProjectInternalId =
        extractId(parent?.projectInternalId) || extractId(parent?.projectInternal);
      return !parent || parentProjectInternalId !== projectInternalId;
    });

    if (projectInternalRootFolders.length === 0) {
      debugDashboard("filterFoldersForContext:project_internal:no-root", {
        projectInternalId,
        totalFolders: folders.length,
      });
      return [];
    }
    const keep = new Set();
    projectInternalRootFolders.forEach((folder) => {
      const rootId = extractId(folder.id);
      if (rootId) keep.add(rootId);
      collectDescendants(folder, keep);
    });
    debugDashboard("filterFoldersForContext:project_internal", {
      projectInternalId,
      totalFolders: folders.length,
      rootFolders: projectInternalRootFolders.map(debugRecordSnapshot),
      descendantCount: keep.size,
      descendantSamples: folders
        .filter((folder) => keep.has(extractId(folder.id)))
        .slice(0, 5)
        .map(debugRecordSnapshot),
    });
    return folders.filter((folder) => keep.has(extractId(folder.id)));
  }

  return folders;
};

const buildScopePayload = (context, internalCompanyId = null) => {
  const moduleScope = context?.moduleScope || MODULE_SCOPE.CASE_DOCUMENT;
  const payload = { moduleScope };
  const companyId = extractId(internalCompanyId) || extractId(context?.internalCompanyId);
  if (companyId) payload.internalCompanyId = companyId;
  return payload;
};

const copyRelationPayloadFromFolder = (payload, folder) => {
  if (!folder) return payload;
  if (folder.customerId && !payload.customerId)
    payload.customerId = extractId(folder.customerId);
  if (folder.projectId && !payload.projectId)
    payload.projectId = extractId(folder.projectId);
  if (folder.taskId && !payload.taskId) payload.taskId = extractId(folder.taskId);
  if (folder.quotationId && !payload.quotationId)
    payload.quotationId = extractId(folder.quotationId);
  if (folder.contractId && !payload.contractId)
    payload.contractId = extractId(folder.contractId);
  if (folder.projectInternalId && !payload.projectInternalId)
    payload.projectInternalId = extractId(folder.projectInternalId);
  if (folder.projectInternal && !payload.projectInternalId)
    payload.projectInternalId = extractId(folder.projectInternal);
  if (folder.internalCompanyId && !payload.internalCompanyId)
    payload.internalCompanyId = extractId(folder.internalCompanyId);
  if (folder.legalReferenceId && !payload.legalReferenceId)
    payload.legalReferenceId = extractId(folder.legalReferenceId);
  if (folder.legalReference && !payload.legalReferenceId)
    payload.legalReferenceId = extractId(folder.legalReference);
  return payload;
};

const getRecordLinkPayload = (context) => {
  return getDocumentDirectLinkPayload(context);
};

const getActiveBusinessCompanyId = (context, selectedInternalCompanyId = null) => {
  const moduleScope = normalizeModuleScopeValue(
    context?.moduleScope || MODE_SCOPE[normalizeDashboardMode(context?.mode)],
  );
  if (
    ![MODULE_SCOPE.INTERNAL_TEMPLATE, MODULE_SCOPE.LEGAL_REFERENCE].includes(
      moduleScope,
    )
  ) {
    return null;
  }
  return extractId(selectedInternalCompanyId) || extractId(context?.internalCompanyId);
};

const matchesInternalCompany = (record, internalCompanyId) => {
  const companyId = extractId(internalCompanyId);
  if (!companyId) return true;
  return (
    extractId(record?.internalCompanyId) === companyId ||
    extractId(record?.internalCompany) === companyId
  );
};

const buildModuleScopeOnlyBusiness = ({ key, moduleScope, folderType }) => ({
  key,
  moduleScope,
  collection: null,
  usesCollectionLink: false,
  getFolderType: () => folderType,
  buildFolderFilter: () => addScopeFilters({}, moduleScope, null),
  buildDocumentFilter: () => addScopeFilters({}, moduleScope, null),
  shouldFetchDocuments: () => true,
  filterFolders: (folders) => folders,
  matchesFolder: (folder, { activeInternalCompanyId } = {}) =>
    matchesInternalCompany(folder, activeInternalCompanyId),
  matchesDocument: (doc, { activeInternalCompanyId } = {}) =>
    matchesInternalCompany(doc, activeInternalCompanyId),
  buildFolderPayload: (context, { activeInternalCompanyId, parentFolder } = {}) => {
    const payload = buildScopePayload(
      { ...context, moduleScope },
      activeInternalCompanyId,
    );
    copyRelationPayloadFromFolder(payload, parentFolder);
    return payload;
  },
  buildDocumentPayload: (context, { activeInternalCompanyId } = {}) =>
    buildScopePayload({ ...context, moduleScope }, activeInternalCompanyId),
  isDocumentVisibleAtRoot: () => true,
});

const DASHBOARD_BUSINESS = {
  global: {
    key: "global",
    moduleScope: MODULE_SCOPE.CASE_DOCUMENT,
    collection: null,
    usesCollectionLink: false,
    getFolderType: () => "custom",
    buildFolderFilter: () => addScopeFilters({}, MODULE_SCOPE.CASE_DOCUMENT, null),
    buildDocumentFilter: () => addScopeFilters({}, MODULE_SCOPE.CASE_DOCUMENT, null),
    shouldFetchDocuments: () => true,
    filterFolders: (folders) => folders,
    matchesFolder: (folder) => matchesModuleScope(folder, MODULE_SCOPE.CASE_DOCUMENT),
    matchesDocument: (doc) => matchesModuleScope(doc, MODULE_SCOPE.CASE_DOCUMENT),
    buildFolderPayload: (context, { parentFolder } = {}) => {
      const payload = buildScopePayload(
        { ...context, moduleScope: MODULE_SCOPE.CASE_DOCUMENT },
        null,
      );
      copyRelationPayloadFromFolder(payload, parentFolder);
      return payload;
    },
    buildDocumentPayload: (context) =>
      buildScopePayload(
        { ...context, moduleScope: MODULE_SCOPE.CASE_DOCUMENT },
        null,
      ),
    isDocumentVisibleAtRoot: (doc) => !extractId(doc.folderId),
  },
  cases: {
    key: "cases",
    moduleScope: MODULE_SCOPE.CASE_DOCUMENT,
    collection: "Project",
    usesCollectionLink: true,
    getFolderType: () => "cases",
    buildFolderFilter: () => ({}),
    buildDocumentFilter: (context, { folderIds = [] } = {}) => {
      const safeCaseId =
        extractId(context?.recordId) || extractId(context?.projectId);
      const orConditions = [];
      if (folderIds.length > 0) {
        orConditions.push({ folderId: { $in: folderIds } });
      }
      if (safeCaseId) {
        orConditions.push({ caseId: { $eq: safeCaseId } });
      }
      return orConditions.length > 0 ? { $or: orConditions } : {};
    },
    shouldFetchDocuments: (context, { folderIds = [] } = {}) =>
      folderIds.length > 0 ||
      !!(extractId(context?.recordId) || extractId(context?.projectId)),
    filterFolders: (folders, context) => filterFoldersForContext(folders, context),
    matchesFolder: (folder) => matchesModuleScope(folder, MODULE_SCOPE.CASE_DOCUMENT),
    matchesDocument: (doc) => matchesModuleScope(doc, MODULE_SCOPE.CASE_DOCUMENT),
    buildFolderPayload: (context, { parentFolder } = {}) => {
      const payload = buildScopePayload(
        { ...context, moduleScope: MODULE_SCOPE.CASE_DOCUMENT },
        null,
      );
      copyRelationPayloadFromFolder(payload, parentFolder);
      const projectId = extractId(context?.projectId) || extractId(context?.recordId);
      if (projectId && !payload.projectId) payload.projectId = projectId;
      if (context?.customerId && !payload.customerId) {
        payload.customerId = extractId(context.customerId);
      }
      return payload;
    },
    buildDocumentPayload: (context) => ({
      ...buildScopePayload(
        { ...context, moduleScope: MODULE_SCOPE.CASE_DOCUMENT },
        null,
      ),
      ...getRecordLinkPayload({
        ...context,
        mode: "cases",
        collection: "Project",
        recordId: extractId(context?.recordId) || extractId(context?.projectId),
      }),
    }),
    isDocumentVisibleAtRoot: (doc) => !extractId(doc.folderId),
  },
  legal_reference: {
    key: "legal_reference",
    moduleScope: MODULE_SCOPE.LEGAL_REFERENCE,
    collection: "LegalReference",
    usesCollectionLink: true,
    getFolderType: () => "custom",
    buildFolderFilter: (context, { activeInternalCompanyId } = {}) =>
      addScopeFilters({}, MODULE_SCOPE.LEGAL_REFERENCE, activeInternalCompanyId),
    buildDocumentFilter: (context, { folderIds = [], activeInternalCompanyId } = {}) => {
      const legalReferenceId = getContextLegalReferenceId(context);
      const scopeFilter = addScopeFilters(
        {},
        MODULE_SCOPE.LEGAL_REFERENCE,
        activeInternalCompanyId,
      );
      if (!legalReferenceId) return scopeFilter;

      const linkConditions = [
        { legalReferenceId: { $eq: legalReferenceId } },
      ];
      if (folderIds.length > 0) {
        linkConditions.push({ folderId: { $in: folderIds } });
      }
      return Object.keys(scopeFilter).length > 0
        ? { $and: [scopeFilter, { $or: linkConditions }] }
        : { $or: linkConditions };
    },
    shouldFetchDocuments: () => true,
    filterFolders: (folders, context) => filterFoldersForContext(folders, context),
    matchesFolder: (folder, { activeInternalCompanyId } = {}) =>
      matchesModuleScope(folder, MODULE_SCOPE.LEGAL_REFERENCE) &&
      matchesInternalCompany(folder, activeInternalCompanyId),
    matchesDocument: (
      doc,
      { activeInternalCompanyId, folderIds = [], context } = {},
    ) => {
      if (!matchesModuleScope(doc, MODULE_SCOPE.LEGAL_REFERENCE)) return false;
      if (!matchesInternalCompany(doc, activeInternalCompanyId)) return false;
      const legalReferenceId = getContextLegalReferenceId(context);
      if (!legalReferenceId) return true;
      const folderId = extractId(doc.folderId);
      const folderIdSet = new Set(folderIds.map((id) => String(id)));
      return (
        isLinkedToLegalReference(doc, legalReferenceId) ||
        (folderId && folderIdSet.has(String(folderId)))
      );
    },
    buildFolderPayload: (context, { activeInternalCompanyId, parentFolder } = {}) => {
      const payload = buildScopePayload(
        { ...context, moduleScope: MODULE_SCOPE.LEGAL_REFERENCE },
        activeInternalCompanyId,
      );
      copyRelationPayloadFromFolder(payload, parentFolder);
      const legalReferenceId = getContextLegalReferenceId(context);
      if (legalReferenceId) payload.legalReferenceId = legalReferenceId;
      return payload;
    },
    buildDocumentPayload: (context, { activeInternalCompanyId } = {}) => ({
      ...buildScopePayload(
        { ...context, moduleScope: MODULE_SCOPE.LEGAL_REFERENCE },
        activeInternalCompanyId,
      ),
      ...getRecordLinkPayload({
        ...context,
        mode: "legal_reference",
        collection: "LegalReference",
        recordId: getContextLegalReferenceId(context),
      }),
    }),
    isDocumentVisibleAtRoot: (doc, folderMap, context) => {
      const legalReferenceId = getContextLegalReferenceId(context);
      const folderId = extractId(doc.folderId);
      if (!legalReferenceId) return true;
      return !folderId || !folderMap.has(folderId);
    },
  },
  internal_templates: buildModuleScopeOnlyBusiness({
    key: "internal_templates",
    moduleScope: MODULE_SCOPE.INTERNAL_TEMPLATE,
    folderType: "custom",
  }),
};

const getDashboardBusiness = (context) => {
  const mode = normalizeDashboardMode(context?.mode);
  const moduleScope = normalizeModuleScopeValue(
    context?.moduleScope || MODE_SCOPE[mode] || MODULE_SCOPE.CASE_DOCUMENT,
  );

  if (moduleScope === MODULE_SCOPE.LEGAL_REFERENCE)
    return DASHBOARD_BUSINESS.legal_reference;
  if (moduleScope === MODULE_SCOPE.INTERNAL_TEMPLATE)
    return DASHBOARD_BUSINESS.internal_templates;
  if (mode === "cases") return DASHBOARD_BUSINESS.cases;
  if (mode === "global") return DASHBOARD_BUSINESS.global;
  return null;
};

const getFolderTypeForContext = (context, parentFolder = null) => {
  if (parentFolder?.type) return parentFolder.type;
  const business = getDashboardBusiness(context);
  if (business?.getFolderType) return business.getFolderType(context);

  const modeTypeMap = {
    customers: "customer",
    cases: "cases",
    tasks: "tasks",
    quotations: "quotation",
    contracts: "contract",
    project_internal: "project_internal",
  };
  return modeTypeMap[context?.mode] || "custom";
};

const buildFolderPayloadForContext = (
  context,
  { activeInternalCompanyId = null, parentFolder = null } = {},
) => {
  const business = getDashboardBusiness(context);
  if (business?.buildFolderPayload) {
    return business.buildFolderPayload(context, {
      activeInternalCompanyId,
      parentFolder,
    });
  }

  const payload = buildScopePayload(context, activeInternalCompanyId);
  copyRelationPayloadFromFolder(payload, parentFolder);
  const linkPayload = getRecordLinkPayload(context);
  Object.keys(linkPayload).forEach((key) => {
    if (key === "collectionName" || key === "recordId") return;
    if (!payload[key]) payload[key] = linkPayload[key];
  });
  return payload;
};

const buildDocumentPayloadForContext = (
  context,
  { activeInternalCompanyId = null } = {},
) => {
  const business = getDashboardBusiness(context);
  if (business?.buildDocumentPayload) {
    return business.buildDocumentPayload(context, { activeInternalCompanyId });
  }
  return {
    ...buildScopePayload(context, activeInternalCompanyId),
    ...getRecordLinkPayload(context),
  };
};

const isDocumentVisibleAtRootForContext = (context, doc, folderMap) => {
  const business = getDashboardBusiness(context);
  if (business?.isDocumentVisibleAtRoot) {
    return business.isDocumentVisibleAtRoot(doc, folderMap, context);
  }

  const folderId = extractId(doc.folderId);
  if (context?.mode === "project_internal") {
    return !folderId || (folderId && !folderMap.has(folderId));
  }
  return !folderId;
};

// HELPER FILE INDEX: only files receive an auto index.
const getNextFileIndex = async (
  parentId,
  moduleScope = MODULE_SCOPE.CASE_DOCUMENT,
  internalCompanyId = null,
) => {
  const sId = normalizeFileParentId(parentId);
  const folderFilter = sId ? { folderId: { $eq: sId } } : {};
  try {
    const res = await ctx.api.request({
      url: "documents:list",
      params: withDocumentSafeFields({
        pageSize: 2000,
        filter: JSON.stringify(
          addScopeFilters(folderFilter, moduleScope, internalCompanyId),
        ),
        sort: ["-fileIndex", "-createdAt"],
      }),
    });
    const sameFolderDocs = (res?.data?.data || []).filter(
      (doc) =>
        normalizeFileParentId(doc.folderId) === sId &&
        matchesModuleScope(doc, moduleScope),
    );
    const maxIndex = sameFolderDocs.reduce(
      (max, doc) => Math.max(max, Number(doc.fileIndex) || 0),
      0,
    );
    return maxIndex + 1;
  } catch (e) {
    console.warn("Failed to get next file index:", e);
    return 1;
  }
};

const reindexFiles = async (
  parentId,
  moduleScope = MODULE_SCOPE.CASE_DOCUMENT,
  internalCompanyId = null,
) => {
  const sId = normalizeFileParentId(parentId);
  const folderFilter = sId ? { folderId: { $eq: sId } } : {};
  try {
    const res = await ctx.api.request({
      url: "documents:list",
      params: withDocumentSafeFields({
        pageSize: 2000,
        filter: JSON.stringify(
          addScopeFilters(folderFilter, moduleScope, internalCompanyId),
        ),
        sort: ["fileIndex", "createdAt"],
      }),
    });
    const items = (res?.data?.data || []).filter(
      (doc) =>
        normalizeFileParentId(doc.folderId) === sId &&
        matchesModuleScope(doc, moduleScope),
    );
    const promises = items
      .map((d, idx) => {
        const nextIndex = idx + 1;
        if (Number(d.fileIndex) === nextIndex) return null;
        return ctx.api.request({
          url: `documents:update?filterByTk=${extractId(d.id)}`,
          method: "POST",
          data: { fileIndex: nextIndex },
        });
      })
      .filter(Boolean);
    await Promise.all(promises);
  } catch (e) {
    console.warn("Failed to reindex files:", e);
  }
};

const ACTION_CONFIG = {
  created: {
    label: "Tạo mới",
    color: "#52c41a",
    bg: "#f6ffed",
    border: "#b7eb8f",
  },
  updated: {
    label: "Cập nhật",
    color: "#1890ff",
    bg: "#e6f7ff",
    border: "#91d5ff",
  },
  deleted: { label: "Xoá", color: "#ff4d4f", bg: "#fff2f0", border: "#ffccc7" },
  upload: {
    label: "Upload",
    color: "#722ed1",
    bg: "#f9f0ff",
    border: "#d3adf7",
  },
};
const getActionCfg = (action) =>
  ACTION_CONFIG[action?.toLowerCase()] || {
    label: action || "Khác",
    color: "#8c8c8c",
    bg: "#fafafa",
    border: "#d9d9d9",
  };
const FIELD_LABEL = {
  title: "Tên văn bản",
  documentType: "Loại văn bản",
  documentCode: "Số hiệu",
  openingDate: "Ngày ban hành",
  senderName: "Người gửi",
  recipientName: "Người nhận",
  description: "Tóm tắt nội dung",
  language: "Ngôn ngữ",
  docFormat: "Hình thức tài liệu",
  googleDriveUrl: "Google Drive URL",
  fileAttachment: "File đính kèm",
  signedAt: "Ngày ký",
  effectiveAt: "Ngày có hiệu lực",
  note: "Ghi chú",
  status: "Trạng thái",
  collectionName: "Collection",
};
const getFieldLabel = (f) => FIELD_LABEL[f] || f;
const getFullUrl = (url) =>
  !url
    ? null
    : url.startsWith("http")
      ? url
      : `${window.location.origin}${url}`;

// ==================== PERMISSIONS ====================
const isAdminUser = (user) => {
  if (!user) return false;
  const roles = user.roles || [];
  return roles.some((r) => {
    const rName = typeof r === "string" ? r : r.name;
    return ["admin", "root"].includes(rName?.toLowerCase());
  });
};

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const getFolderManagerRows = (folder) =>
  asArray(folder?.folderManager || folder?.folderManagers);

const getFolderMemberRows = (folder) =>
  asArray(folder?.folderMember || folder?.folderMembers);

const getRelationLawyerRecord = (row) => {
  if (!row || typeof row !== "object") return {};
  if (row.lawyer && typeof row.lawyer === "object") return row.lawyer;
  if (row.lawyerId && typeof row.lawyerId === "object") return row.lawyerId;
  return row;
};

const getPermissionLawyerId = (row) =>
  extractId(row?.lawyerId) ||
  extractId(row?.lawyer) ||
  extractId(row?.id) ||
  extractId(row);

const getPermissionRole = (row, fallback = "viewer") =>
  row?.folderMembers?.role ||
  row?.folderMember?.role ||
  row?.through?.role ||
  row?.role ||
  fallback;

const getLawyerDisplayName = (record, fallback = "Lawyer") => {
  const lawyer = getRelationLawyerRecord(record);
  return (
    lawyer.lawyerName ||
    lawyer.nickname ||
    lawyer.username ||
    lawyer.fullName ||
    lawyer.name ||
    lawyer.email ||
    record?.lawyerName ||
    record?.nickname ||
    record?.username ||
    record?.email ||
    `${fallback} ${getPermissionLawyerId(record) || record?.id || ""}`.trim()
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

  const managers = getFolderManagerRows(folder);
  const members = getFolderMemberRows(folder);

  // Check explicit permissions using Lawyer ID
  if (lwId) {
    const isExplicitManager = managers.some(
      (m) => getPermissionLawyerId(m) === lwId,
    );
    if (isExplicitManager)
      return { isManager: true, isMember: true, canEdit: true };

    const explicitMember = members.find(
      (m) => getPermissionLawyerId(m) === lwId,
    );
    if (explicitMember) {
      const role = getPermissionRole(explicitMember);
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

const canManageFile = (file, folder, user, allFolders, currentLawyerId) => {
  if (!user) return false;
  const { isManager, canEdit } = getFolderPermissions(
    folder,
    user,
    allFolders,
    currentLawyerId,
  );
  if (isManager || canEdit) return true;
  if (extractId(file.createdById) === extractId(user.id)) return true;
  return false;
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

  // 1. Find folders with direct access
  allFolders.forEach((f) => {
    const fId = extractId(f.id);
    // Owner check
    if (extractId(f.createdById) === uid) {
      accessible.add(fId);
      return;
    }
    // Manager/Member check via currentLawyerId
    if (lwId) {
      const managers = getFolderManagerRows(f);
      const members = getFolderMemberRows(f);
      if (
        managers.some((m) => getPermissionLawyerId(m) === lwId) ||
        members.some((m) => getPermissionLawyerId(m) === lwId)
      ) {
        accessible.add(fId);
        return;
      }
    }
  });

  // 2. Cascade down: include all descendants of accessible folders
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

  // 3. Build ancestors path for navigation (nav-only)
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

const FolderPermissionsModal = ({ open, folder, onClose, onSuccess }) => {
  const [saving, setSaving] = useState(false);
  const [lawyers, setLawyers] = useState([]);
  const [shares, setShares] = useState([]);

  useEffect(() => {
    if (open) {
      if (folder) {
        const folderId = extractId(folder.id || folder);
        // Load lawyers và permissions song song
        Promise.all([
          ctx.api
            .request({ url: "lawyers:list", params: { pageSize: 1000 } })
            .catch(() => ({ data: { data: [] } })),
          ctx.api
            .request({
              url: `folders/${folderId}/folderManager:list`,
              params: { pageSize: 1000 },
            })
            .catch(() => ({ data: { data: [] } })),
          ctx.api
            .request({
              url: "folderMembers:list",
              params: {
                pageSize: 1000,
                filter: JSON.stringify({ folderId: { $eq: folderId } }),
              },
            })
            .catch(() => ({ data: { data: [] } })),
        ]).then(([lwRes, mgRes, mbRes]) => {
          setLawyers(lwRes?.data?.data || []);
          const initialShares = [];
          const managerRows = mgRes?.data?.data || [];
          const memberRows = mbRes?.data?.data || [];
          // folderManager:list (nested) trả về lawyer records trực tiếp → dùng row.id
          managerRows.forEach((row) => {
            const lawyerId = getPermissionLawyerId(row);
            if (!lawyerId) return;
            initialShares.push({
              id: String(lawyerId),
              role: "manager",
              lawyerData: getRelationLawyerRecord(row),
            });
          });
          // folderMembers:list (direct collection) là junction table → dùng row.lawyerId
          memberRows.forEach((row) => {
            const lawyerId = getPermissionLawyerId(row);
            if (!lawyerId) return;
            initialShares.push({
              id: String(lawyerId),
              role: getPermissionRole(row),
              lawyerData: getRelationLawyerRecord(row),
            });
          });
          setShares(initialShares);
        });
      }
    } else {
      setShares([]);
    }
  }, [open, folder]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const managers = shares.filter((s) => s.role === "manager");
      const members = shares.filter((s) => s.role !== "manager");

      const folderId = extractId(folder.id);

      // 1. Delete old permissions
      await Promise.all([
        ctx.api
          .request({
            url: "folderManagers:destroy",
            method: "POST",
            params: { filter: JSON.stringify({ folderId: { $eq: folderId } }) },
          })
          .catch(() => { }),
        ctx.api
          .request({
            url: "folderMembers:destroy",
            method: "POST",
            params: { filter: JSON.stringify({ folderId: { $eq: folderId } }) },
          })
          .catch(() => { }),
      ]);

      // 2. Create new permissions
      const createPromises = [];
      managers.forEach((s) => {
        createPromises.push(
          ctx.api.request({
            url: "folderManagers:create",
            method: "POST",
            data: { folderId, lawyerId: Number(s.id), role: "manager" },
          }),
        );
      });
      members.forEach((s) => {
        createPromises.push(
          ctx.api.request({
            url: "folderMembers:create",
            method: "POST",
            data: { folderId, lawyerId: Number(s.id), role: s.role },
          }),
        );
      });

      await Promise.all(createPromises);
      message.success("Cập nhật phân quyền thành công");
      onSuccess();
      onClose();
    } catch (e) {
      message.error("Có lỗi xảy ra");
    }
    setSaving(false);
  };

  const handleAddShare = (lawyerId) => {
    if (!lawyerId) return;
    const safeLawyerId = String(extractId(lawyerId));
    if (!safeLawyerId) return;
    if (shares.some((s) => String(s.id) === safeLawyerId)) return;
    setShares([...shares, { id: safeLawyerId, role: "viewer" }]);
  };

  const handleChangeRole = (lawyerId, newRole) => {
    setShares(
      shares.map((s) =>
        String(s.id) === String(lawyerId) ? { ...s, role: newRole } : s,
      ),
    );
  };

  const handleRemoveShare = (lawyerId) => {
    setShares(shares.filter((s) => String(s.id) !== String(lawyerId)));
  };

  const availableOptions = lawyers
    .filter(
      (l) => !shares.some((s) => String(s.id) === String(extractId(l.id))),
    )
    .map((l) => ({
      value: String(extractId(l.id)),
      label: getLawyerDisplayName(l),
    }));

  return React.createElement(
    Modal,
    {
      open,
      onCancel: onClose,
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        "Phân quyền thư mục",
      ),
      width: 500,
      footer: [
        React.createElement(
          Button,
          { key: "cancel", onClick: onClose, style: { fontFamily: FONT } },
          "Hủy",
        ),
        React.createElement(
          Button,
          {
            key: "save",
            type: "primary",
            loading: saving,
            onClick: handleSave,
            style: { fontFamily: FONT },
          },
          "Lưu",
        ),
      ],
    },
    React.createElement(
      "div",
      { style: { marginBottom: 16, fontFamily: FONT } },
      React.createElement(
        "div",
        { style: { marginBottom: 8, fontWeight: 600 } },
        "Thêm người",
      ),
      React.createElement(Select, {
        showSearch: true,
        style: { width: "100%", fontFamily: FONT },
        placeholder: "Tìm và thêm người...",
        options: availableOptions,
        value: null,
        onChange: handleAddShare,
        filterOption: (input, option) =>
          (option?.label ?? "").toLowerCase().includes(input.toLowerCase()),
      }),
    ),
    React.createElement(
      "div",
      { style: { marginTop: 24, fontFamily: FONT } },
      React.createElement(
        "div",
        { style: { marginBottom: 12, fontWeight: 600 } },
        "Những người có quyền truy cập",
      ),
      shares.length === 0
        ? React.createElement(Empty, {
          image: Empty.PRESENTED_IMAGE_SIMPLE,
          description: "Chưa chia sẻ cho ai",
        })
        : shares.map((s) => {
          const lw =
            lawyers.find((l) => String(extractId(l.id)) === String(s.id)) ||
            s.lawyerData ||
            {};
          const lwName =
            lw.nickname ||
            lw.username ||
            lw.email ||
            (s.id && s.id !== "undefined" ? `ID: ${s.id}` : "Không rõ tên");
          const displayName = getLawyerDisplayName(
            lw.id ? lw : s.lawyerData || s,
          );
          return React.createElement(
            "div",
            {
              key: s.id,
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid #f0f0f0",
              },
            },
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 12 } },
              React.createElement(
                "div",
                {
                  style: {
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#1890ff",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    fontSize: 16,
                  },
                },
                displayName.charAt(0).toUpperCase(),
              ),
              React.createElement(
                "div",
                null,
                React.createElement(
                  "div",
                  { style: { fontWeight: 500, lineHeight: 1.2 } },
                  displayName,
                ),
                React.createElement(
                  "div",
                  { style: { fontSize: 12, color: "#8c8c8c" } },
                  s.role === "manager"
                    ? "Quản lý"
                    : s.role === "editor"
                      ? "Người chỉnh sửa"
                      : "Người xem",
                ),
              ),
            ),
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 8 } },
              React.createElement(Select, {
                value: s.role,
                onChange: (val) => handleChangeRole(s.id, val),
                style: { width: 140, fontFamily: FONT },
                bordered: false,
                options: [
                  { value: "viewer", label: "Người xem" },
                  { value: "editor", label: "Người chỉnh sửa" },
                  { value: "manager", label: "Quản lý" },
                ],
              }),
              React.createElement(
                Button,
                {
                  type: "text",
                  danger: true,
                  onClick: () => handleRemoveShare(s.id),
                  style: { padding: "4px 8px" },
                },
                "✕",
              ),
            ),
          );
        }),
    ),
  );
};

// ==================== TRUNCATED & EXPANDABLE TEXT ====================
const highlightText = (text, keyword) => {
  if (!keyword || !text) return text;
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return text;
  return React.createElement(
    React.Fragment,
    null,
    text.slice(0, idx),
    React.createElement(
      "mark",
      { style: { background: "#fff566", padding: 0 } },
      text.slice(idx, idx + keyword.length),
    ),
    text.slice(idx + keyword.length),
  );
};

const TruncatedText = ({ value, keyword, maxLen = 30, style = {} }) => {
  const [expanded, setExpanded] = useState(false);
  if (!value)
    return React.createElement(
      Text,
      { style: { fontSize: 12, color: "#bfbfbf", fontFamily: FONT } },
      "—",
    );

  const needTruncate = value.length > maxLen;
  const displayValue =
    !expanded && needTruncate ? value.slice(0, maxLen) + "…" : value;

  return React.createElement(
    "span",
    null,
    React.createElement(
      Text,
      {
        style: {
          fontSize: 12,
          wordBreak: "break-word",
          fontFamily: FONT,
          ...style,
        },
      },
      highlightText(displayValue, keyword),
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
          fontSize: 11,
          color: "#1890ff",
          cursor: "pointer",
          userSelect: "none",
          marginLeft: 4,
          fontFamily: FONT,
        },
      },
      expanded ? "Thu gọn" : "Xem thêm",
    ),
  );
};

const ExpandableDescription = ({ value, keyword, maxLen = 35 }) => {
  const [expanded, setExpanded] = useState(false);
  if (!value)
    return React.createElement(
      Text,
      { style: { fontSize: 12, color: "#bfbfbf", fontFamily: FONT } },
      "—",
    );

  const needTruncate = value.length > maxLen;
  const displayValue =
    !expanded && needTruncate ? value.slice(0, maxLen) + "…" : value;

  return React.createElement(
    "div",
    null,
    React.createElement(
      Text,
      {
        style: {
          fontSize: 12,
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
          fontFamily: FONT,
        },
      },
      highlightText(displayValue, keyword),
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
          fontSize: 11,
          color: "#1890ff",
          cursor: "pointer",
          userSelect: "none",
          display: "block",
          marginTop: 2,
          fontFamily: FONT,
        },
      },
      expanded ? "Thu gọn" : "Xem thêm",
    ),
  );
};

// ==================== PREVIEW MODAL ====================
const PreviewModal = ({ doc, onClose }) => {
  if (!doc) return null;
  const attachment = Array.isArray(doc.fileAttachment)
    ? doc.fileAttachment[0]
    : doc.fileAttachment;
  const fileUrl = attachment?.url || attachment?.preview;
  let fileExt = attachment?.extname
    ? attachment.extname.startsWith(".")
      ? attachment.extname.toLowerCase()
      : "." + attachment.extname.toLowerCase()
    : "";
  const rawName = attachment?.title || attachment?.filename || "File";
  if (!fileExt && rawName.includes("."))
    fileExt = "." + rawName.split(".").pop().toLowerCase();

  const originalName = rawName.toLowerCase().endsWith(fileExt)
    ? rawName.slice(0, rawName.length - fileExt.length)
    : rawName;
  const finalFileName = originalName + fileExt;
  const fullUrl = getFullUrl(fileUrl);
  const isPdf = fileExt === ".pdf";
  const isHtml = fileExt === ".html" || fileExt === ".htm";
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
  const officeViewerUrl =
    isOffice && fullUrl
      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`
      : null;

  return React.createElement(
    Modal,
    {
      open: !!doc,
      onCancel: onClose,
      footer: [
        fullUrl &&
        React.createElement(
          Button,
          {
            key: "dl",
            type: "primary",
            onClick: () => window.open(fullUrl, "_blank"),
            style: { fontFamily: FONT },
          },
          iconLabel(DownloadIcon, "Tải về"),
        ),
        React.createElement(
          Button,
          { key: "cl", onClick: onClose, style: { fontFamily: FONT } },
          "Đóng",
        ),
      ].filter(Boolean),
      width: isPdf || isHtml || isOffice ? "85%" : "auto",
      title: React.createElement(
        "div",
        {
          style: {
            fontFamily: FONT,
            wordBreak: "break-word",
            whiteSpace: "normal",
            paddingRight: 32,
            lineHeight: 1.4,
          },
        },
        finalFileName,
      ),
      centered: true,
      bodyStyle: {
        padding: 0,
        height: "80vh",
        background: "#f5f5f5",
        position: "relative",
      },
    },
    React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 0,
        },
      },
      React.createElement(Spin, { tip: "Đang tải bản xem trước..." }),
    ),
    (isPdf || isHtml) &&
    fullUrl &&
    React.createElement("iframe", {
      src: fullUrl,
      style: {
        width: "100%",
        height: "100%",
        border: "none",
        position: "relative",
        zIndex: 1,
        backgroundColor: "#fff",
      },
      title: originalName,
    }),
    isImage &&
    fullUrl &&
    React.createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 1,
        },
      },
      React.createElement("img", {
        src: fullUrl,
        alt: originalName,
        style: {
          maxWidth: "100%",
          maxHeight: "100%",
          display: "block",
          padding: 24,
        },
      }),
    ),
    isOffice &&
    officeViewerUrl &&
    React.createElement("iframe", {
      src: officeViewerUrl,
      style: {
        width: "100%",
        height: "100%",
        border: "none",
        position: "relative",
        zIndex: 1,
      },
      title: originalName,
    }),
    !isPdf &&
    !isHtml &&
    !isImage &&
    !isOffice &&
    React.createElement(
      "div",
      {
        style: {
          padding: "60px 0",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
          background: "#fff",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        },
      },
      React.createElement(Empty, {
        description: React.createElement(
          "span",
          { style: { fontFamily: FONT } },
          "Không thể xem trước định dạng này trên trình duyệt",
        ),
      }),
      fullUrl &&
      React.createElement(
        Button,
        {
          type: "primary",
          style: { marginTop: 16, fontFamily: FONT },
          onClick: () => window.open(fullUrl, "_blank"),
        },
        "Tải xuống để xem",
      ),
    ),
  );
};

// ==================== INLINE NOTE EDITOR ====================
const InlineNoteEditor = ({ doc, currentUser, onNoteChange }) => {
  const [value, setValue] = useState(doc?.note || "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    setValue(doc?.note || "");
    setDirty(false);
  }, [doc?.id, doc?.note]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await ctx.api.request({
        url: "documents:update",
        method: "POST",
        params: { filterByTk: extractId(doc.id) },
        data: {
          note: value.trim(),
          updatedById: extractId(currentUser?.id) || null,
          updatedAt: new Date().toISOString(),
        },
      });
      setDirty(false);
      onNoteChange?.();
      message.success("Đã lưu ghi chú");
    } catch (e) {
      message.error("Lỗi lưu ghi chú");
    }
    setSaving(false);
  };

  return React.createElement(
    "div",
    {
      style: {
        padding: "12px 16px",
        background: "#fafafa",
        borderRadius: 8,
        border: "1px solid #f0f0f0",
        marginTop: 16,
      },
    },
    React.createElement(
      "div",
      {
        style: {
          fontSize: 12,
          fontWeight: 700,
          color: "#8c8c8c",
          textTransform: "uppercase",
          marginBottom: 8,
          fontFamily: FONT,
        },
      },
      "Ghi chú tài liệu",
    ),
    React.createElement(Input.TextArea, {
      value,
      onChange: (e) => {
        setValue(e.target.value);
        setDirty(e.target.value !== (doc?.note || ""));
      },
      placeholder: "Nhập ghi chú cho tài liệu này... (Ctrl+Enter để lưu)",
      rows: 4,
      style: {
        fontSize: 13,
        marginBottom: 10,
        resize: "vertical",
        fontFamily: FONT,
      },
      onKeyDown: (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSave();
      },
    }),
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 8,
        },
      },
      dirty &&
      React.createElement(
        Text,
        { style: { fontSize: 11, color: "#faad14", fontFamily: FONT } },
        "Chưa lưu",
      ),
      React.createElement(
        Button,
        {
          size: "small",
          type: "primary",
          loading: saving,
          disabled: !dirty,
          onClick: handleSave,
          style: { fontFamily: FONT },
        },
        "Lưu ghi chú",
      ),
    ),
  );
};

// ==================== DOCUMENT ACTIVITY LOG COMPONENT ====================
const DocumentActivityLog = ({
  recordId = null,
  collectionName = "Document",
}) => {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const filter = {
        collectionName: { $eq: collectionName || "Document" },
      };
      if (recordId) {
        filter.recordId = { $eq: recordId };
      }

      const res = await ctx.api.request({
        url: "activity_log:list",
        params: {
          pageSize: 100,
          sort: ["-changedAt"],
          filter: JSON.stringify(filter),
        },
      });
      setLogs(res?.data?.data || []);
    } catch (e) {
      console.error("Failed to fetch activity logs:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [recordId, collectionName]);

  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderSentence = (log) => {
    const who = log.changedByName || "Hệ thống";
    const time = fmtDate(log.changedAt);
    const action = log.action;
    const field = log.fieldName;
    const oldV = log.oldValue;
    const newV = log.newValue;
    const entityLabel = collectionName === "Folder" ? "thư mục" : "tài liệu";

    if (action === "uploaded") {
      return React.createElement(
        "span",
        null,
        React.createElement(Text, { strong: true }, who),
        ` đã tải lên ${entityLabel} `,
        React.createElement(Text, { code: true }, newV),
        " lúc ",
        React.createElement(Text, { type: "secondary" }, time),
      );
    }

    if (action === "created") {
      return React.createElement(
        "span",
        null,
        React.createElement(Text, { strong: true }, who),
        ` đã tạo ${entityLabel} `,
        React.createElement(Text, { code: true }, newV || oldV || ""),
        " lúc ",
        React.createElement(Text, { type: "secondary" }, time),
      );
    }

    if (action === "moved") {
      return React.createElement(
        "span",
        null,
        React.createElement(Text, { strong: true }, who),
        ` đã di chuyển ${entityLabel} sang thư mục `,
        React.createElement(Text, { code: true }, newV),
        " lúc ",
        React.createElement(Text, { type: "secondary" }, time),
      );
    }

    if (action === "deleted") {
      return React.createElement(
        "span",
        null,
        React.createElement(Text, { strong: true }, who),
        ` đã xóa ${entityLabel} `,
        React.createElement(Text, { code: true }, oldV),
        " lúc ",
        React.createElement(Text, { type: "secondary" }, time),
      );
    }

    if (action === "updated") {
      const fieldLabel = field === "title" ? "tiêu đề" : field;
      return React.createElement(
        "span",
        null,
        React.createElement(Text, { strong: true }, who),
        ` đã cập nhật ${fieldLabel} từ `,
        React.createElement(Text, { delete: true }, oldV),
        " thành ",
        React.createElement(Text, { strong: true }, newV),
        " lúc ",
        React.createElement(Text, { type: "secondary" }, time),
      );
    }

    return React.createElement(
      "span",
      null,
      React.createElement(Text, { strong: true }, who),
      ` [${action}] ${field}: `,
      oldV && React.createElement(Text, { delete: true }, oldV),
      " ",
      newV && React.createElement(Text, { strong: true }, newV),
      " lúc ",
      React.createElement(Text, { type: "secondary" }, time),
    );
  };

  const getIcon = (action) => {
    switch (action) {
      case "created":
        return PlusIcon;
      case "uploaded":
        return UploadIcon;
      case "moved":
        return MoveIcon;
      case "deleted":
        return DeleteIcon;
      case "updated":
        return EditIcon;
      default:
        return HistoryIcon;
    }
  };

  const getColor = (action) => {
    switch (action) {
      case "created":
        return "green";
      case "uploaded":
        return "blue";
      case "moved":
        return "orange";
      case "deleted":
        return "red";
      case "updated":
        return "green";
      default:
        return "gray";
    }
  };

  const groupedLogs = useMemo(() => {
    const groups = {};
    logs.forEach((log) => {
      const d = new Date(log.changedAt || new Date());
      const dateStr = d.toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(log);
    });
    return Object.keys(groups).map((date) => ({ date, items: groups[date] }));
  }, [logs]);

  if (loading)
    return React.createElement(Spin, { style: { padding: 40, width: "100%" } });

  if (logs.length === 0)
    return React.createElement(Empty, {
      image: Empty.PRESENTED_IMAGE_SIMPLE,
      description: React.createElement(
        Text,
        { type: "secondary", style: { fontSize: 12 } },
        "Chưa có hoạt động",
      ),
      style: { marginTop: 40 },
    });

  return React.createElement(
    "div",
    { style: { padding: "16px 20px", fontFamily: FONT } },
    groupedLogs.map((group) =>
      React.createElement(
        "div",
        { key: group.date, style: { marginBottom: 24 } },
        React.createElement(
          "div",
          {
            style: {
              fontSize: 11,
              fontWeight: 700,
              color: "#bfbfbf",
              textTransform: "uppercase",
              marginBottom: 12,
              letterSpacing: 0.5,
            },
          },
          group.date,
        ),
        React.createElement(
          Timeline,
          { mode: "left", style: { marginLeft: 4 } },
          group.items.map((log) =>
            React.createElement(
              Timeline.Item,
              {
                key: log.id,
                dot: React.createElement(
                  "span",
                  { style: { fontSize: 12 } },
                  getIcon(log.action),
                ),
                color: getColor(log.action),
              },
              React.createElement(
                "div",
                { style: { fontSize: 12, lineHeight: 1.5 } },
                renderSentence(log),
              ),
            ),
          ),
        ),
      ),
    ),
  );
};

// ==================== ACTIVITY LOG HOOK & TAB ====================
const ActivityLogTab = ({ doc }) => {
  return React.createElement(
    "div",
    { style: { maxHeight: "55vh", overflowY: "auto", padding: "8px 0" } },
    React.createElement(DocumentActivityLog, { recordId: extractId(doc?.id) }),
  );
};

// ==================== DETAIL MODAL (FILE) ====================
const DetailModal = ({ doc, onClose, onSuccess, currentUser, onPreview }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [inlineEditingTitle, setInlineEditingTitle] = useState(false);
  const [inlineTitleVal, setInlineTitleVal] = useState("");

  const buildValues = (d) => ({
    documentType: d.documentType || "",
    documentCode: d.documentCode || "",
    title: d.title || "",
    openingDate: d.openingDate ? d.openingDate.slice(0, 10) : "",
    senderName: d.senderName || "",
    recipientName: d.recipientName || "",
    description: d.description || "",
    language: d.language || "",
    docFormat: d.docFormat || "",
    googleDriveUrl: d.googleDriveUrl || "",
    signedAt: d.signedAt ? d.signedAt.slice(0, 10) : "",
    effectiveAt: d.effectiveAt ? d.effectiveAt.slice(0, 10) : "",
  });

  useEffect(() => {
    if (!doc) return;
    setEditing(false);
    setActiveTab("info");
    form.setFieldsValue(buildValues(doc));
  }, [doc?.id]);

  const handleSave = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const values = form.getFieldsValue();
    const toISO = (val) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d.toISOString();
    };
    setSaving(true);
    try {
      await ctx.api.request({
        url: "documents:update",
        method: "POST",
        params: { filterByTk: extractId(doc.id) },
        data: {
          documentType: values.documentType?.trim() || "",
          documentCode: values.documentCode?.trim() || "",
          title: values.title?.trim() || "",
          openingDate: toISO(values.openingDate),
          senderName: values.senderName?.trim() || "",
          recipientName: values.recipientName?.trim() || "",
          description: values.description?.trim() || "",
          language: values.language?.trim() || "",
          docFormat: values.docFormat?.trim() || "",
          googleDriveUrl: values.googleDriveUrl?.trim() || "",
          signedAt: toISO(values.signedAt),
          effectiveAt: toISO(values.effectiveAt),
          updatedById: extractId(currentUser?.id) || null,
          updatedAt: new Date().toISOString(),
        },
      });

      const attachment = Array.isArray(doc.fileAttachment)
        ? doc.fileAttachment[0]
        : doc.fileAttachment;
      if (attachment?.id && values.title?.trim()) {
        await ctx.api
          .request({
            url: `attachments:update?filterByTk=${attachment.id}`,
            method: "POST",
            data: { title: values.title.trim() },
          })
          .catch(() => { });
      }

      message.success("Cập nhật thành công!");
      setEditing(false);
      onSuccess();
    } catch (e) {
      message.error("Có lỗi: " + (e?.message || "Vui lòng thử lại"));
    }
    setSaving(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    if (doc) form.setFieldsValue(buildValues(doc));
  };

  const handleSaveInline = async () => {
    if (!inlineTitleVal.trim()) return;
    try {
      const safeTitle = inlineTitleVal.trim();
      await ctx.api.request({
        url: `documents:update?filterByTk=${extractId(doc.id)}`,
        method: "POST",
        data: {
          title: safeTitle,
          updatedById: extractId(currentUser?.id) || null,
          updatedAt: new Date().toISOString(),
        },
      });

      const attachment = Array.isArray(doc.fileAttachment)
        ? doc.fileAttachment[0]
        : doc.fileAttachment;
      if (attachment?.id) {
        await ctx.api
          .request({
            url: `attachments:update?filterByTk=${attachment.id}`,
            method: "POST",
            data: { title: safeTitle },
          })
          .catch(() => { });
      }

      message.success("Đã cập nhật tiêu đề");
      setInlineEditingTitle(false);
      onSuccess();
    } catch (e) {
      message.error("Lỗi cập nhật");
    }
  };

  const attachment = doc
    ? Array.isArray(doc.fileAttachment)
      ? doc.fileAttachment[0]
      : doc.fileAttachment
    : null;
  const fileUrl = attachment?.url || attachment?.preview;
  const fullUrl = getFullUrl(fileUrl);
  let fileExt = attachment?.extname
    ? attachment.extname.startsWith(".")
      ? attachment.extname.toLowerCase()
      : "." + attachment.extname.toLowerCase()
    : "";
  const rawName = attachment?.title || attachment?.filename || "File";
  if (!fileExt && rawName.includes(".")) {
    fileExt = "." + rawName.split(".").pop().toLowerCase();
  }
  const originalName = rawName.toLowerCase().endsWith(fileExt)
    ? rawName.slice(0, rawName.length - fileExt.length)
    : rawName;
  const finalFileName = originalName + fileExt;
  const extInfo = getExtInfo(fileExt);

  const InfoView = () =>
    React.createElement(
      "div",
      null,
      React.createElement(
        Descriptions,
        {
          column: 2,
          size: "small",
          bordered: true,
          labelStyle: {
            width: 140,
            fontSize: 12,
            color: "#8c8c8c",
            background: "#fafafa",
            fontFamily: FONT,
          },
          contentStyle: { fontSize: 13, fontFamily: FONT },
        },
        React.createElement(
          Descriptions.Item,
          { label: "STT" },
          doc?.fileIndex ||
          React.createElement(Text, { type: "secondary" }, "—"),
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Loại văn bản" },
          doc?.documentType ||
          React.createElement(Text, { type: "secondary" }, "—"),
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Số hiệu" },
          React.createElement(
            Text,
            { style: { fontFamily: "monospace", fontSize: 12 } },
            doc?.documentCode ||
            React.createElement(Text, { type: "secondary" }, "—"),
          ),
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Ngày ban hành" },
          doc?.openingDate
            ? formatDate(doc.openingDate)
            : React.createElement(Text, { type: "secondary" }, "—"),
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Ngày ký" },
          doc?.signedAt
            ? formatDate(doc.signedAt)
            : React.createElement(Text, { type: "secondary" }, "—"),
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Tên văn bản", span: 2 },
          inlineEditingTitle
            ? React.createElement(
              "div",
              { style: { display: "flex", gap: 8, alignItems: "center" } },
              React.createElement(Input, {
                value: inlineTitleVal,
                onChange: (e) => setInlineTitleVal(e.target.value),
                autoFocus: true,
                onPressEnter: handleSaveInline,
                size: "small",
              }),
              React.createElement(
                Button,
                {
                  type: "text",
                  onClick: handleSaveInline,
                  style: {
                    color: "#52c41a",
                    padding: 0,
                    minWidth: 24,
                    height: 24,
                  },
                  size: "small",
                },
                CheckIcon,
              ),
              React.createElement(
                Button,
                {
                  type: "text",
                  danger: true,
                  onClick: () => setInlineEditingTitle(false),
                  style: { padding: 0, minWidth: 24, height: 24 },
                  size: "small",
                },
                CloseIcon,
              ),
            )
            : React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 8 } },
              React.createElement(
                Text,
                {
                  strong: true,
                  style: { wordBreak: "break-word", whiteSpace: "normal" },
                },
                doc?.title ||
                attachment?.title ||
                attachment?.filename ||
                React.createElement(
                  Text,
                  { type: "secondary" },
                  "(Chưa có)",
                ),
              ),
              React.createElement(
                Button,
                {
                  type: "text",
                  size: "small",
                  onClick: () => {
                    setInlineEditingTitle(true);
                    setInlineTitleVal(
                      doc?.title ||
                      attachment?.title ||
                      attachment?.filename ||
                      "",
                    );
                  },
                  style: { color: "#8c8c8c", padding: "0 4px", height: 20 },
                },
                EditIcon,
              ),
            ),
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Người gửi" },
          doc?.senderName ||
          React.createElement(Text, { type: "secondary" }, "—"),
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Người nhận" },
          doc?.recipientName ||
          React.createElement(Text, { type: "secondary" }, "—"),
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Tóm tắt nội dung", span: 2 },
          React.createElement(
            Text,
            {
              style: {
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 12,
              },
            },
            doc?.description ||
            React.createElement(Text, { type: "secondary" }, "—"),
          ),
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Ngôn ngữ" },
          doc?.language ||
          React.createElement(Text, { type: "secondary" }, "—"),
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Hình thức tài liệu" },
          doc?.docFormat ||
          React.createElement(Text, { type: "secondary" }, "—"),
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Ngày có hiệu lực" },
          doc?.effectiveAt
            ? React.createElement(
              Text,
              {
                style: {
                  color:
                    new Date(doc.effectiveAt) < new Date()
                      ? "#ff4d4f"
                      : "#52c41a",
                },
              },
              formatDate(doc.effectiveAt),
            )
            : React.createElement(Text, { type: "secondary" }, "—"),
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Google Drive" },
          doc?.googleDriveUrl
            ? React.createElement(
              Button,
              {
                type: "link",
                size: "small",
                style: { padding: 0 },
                onClick: () => window.open(doc.googleDriveUrl, "_blank"),
              },
              "Mở link",
            )
            : React.createElement(Text, { type: "secondary" }, "—"),
        ),
        React.createElement(
          Descriptions.Item,
          { label: "File đính kèm", span: 2 },
          attachment
            ? React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                },
              },
              React.createElement(
                "div",
                {
                  style: {
                    minWidth: 46,
                    height: 26,
                    borderRadius: 4,
                    padding: "0 8px",
                    background: extInfo.bg,
                    border: `1px solid ${extInfo.color}40`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    color: extInfo.color,
                    letterSpacing: 0.5,
                    fontFamily: FONT,
                    flexShrink: 0,
                  },
                },
                fileExt.replace(".", "").toUpperCase().slice(0, 4),
              ),
              React.createElement(
                Text,
                {
                  onClick: () => {
                    if (fullUrl && onPreview) onPreview(doc);
                  },
                  style: {
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#1890ff",
                    cursor: fullUrl ? "pointer" : "default",
                    textDecoration: fullUrl ? "underline" : "none",
                    textUnderlineOffset: 3,
                    fontFamily: FONT,
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                    flex: 1,
                    minWidth: 0,
                  },
                },
                finalFileName,
              ),
              fullUrl &&
              React.createElement(
                Button,
                {
                  size: "small",
                  type: "primary",
                  ghost: true,
                  style: {
                    padding: "0 8px",
                    fontSize: 11,
                    height: 24,
                    fontFamily: FONT,
                    flexShrink: 0,
                  },
                  onClick: (e) => {
                    e.stopPropagation();
                    window.open(fullUrl, "_blank");
                  },
                },
                "Tải về",
              ),
            )
            : React.createElement(Text, { type: "secondary" }, "—"),
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Ngày upload" },
          doc?.createdAt
            ? formatDateTime(doc.createdAt)
            : React.createElement(Text, { type: "secondary" }, "—"),
        ),
        React.createElement(
          Descriptions.Item,
          { label: "Người upload" },
          doc?.createdBy
            ? getUserName(doc.createdBy) || doc.createdBy.email
            : React.createElement(Text, { type: "secondary" }, "—"),
        ),
      ),
      React.createElement(InlineNoteEditor, {
        doc,
        currentUser,
        onNoteChange: onSuccess,
      }),
    );

  const InfoEdit = () =>
    React.createElement(
      Form,
      { form, layout: "vertical", size: "small", style: { fontFamily: FONT } },
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 16px",
          },
        },
        React.createElement(
          Form.Item,
          {
            name: "documentType",
            label: "Loại văn bản",
            rules: [{ required: true, message: "Vui lòng nhập loại văn bản" }],
          },
          React.createElement(Input, {
            allowClear: true,
            maxLength: 150,
            placeholder: "VD: Hợp đồng, Biên bản...",
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "title", label: "Tên tài liệu" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "Nhập tên đầy đủ của tài liệu",
          }),
        ),
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 16px",
          },
        },
        React.createElement(
          Form.Item,
          { name: "documentCode", label: "Số hiệu" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "VD: 123/2024/HĐ-SAMSET",
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "openingDate", label: "Ngày ban hành" },
          React.createElement(Input, {
            type: "date",
            style: { width: "100%" },
          }),
        ),
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 16px",
          },
        },
        React.createElement(
          Form.Item,
          { name: "signedAt", label: "Ngày ký" },
          React.createElement(Input, {
            type: "date",
            style: { width: "100%" },
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "effectiveAt", label: "Ngày có hiệu lực" },
          React.createElement(Input, {
            type: "date",
            style: { width: "100%" },
          }),
        ),
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 16px",
          },
        },
        React.createElement(
          Form.Item,
          { name: "senderName", label: "Người gửi" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "Tên cá nhân hoặc tổ chức gửi",
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "recipientName", label: "Người nhận" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "Tên cá nhân hoặc tổ chức nhận",
          }),
        ),
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0 16px",
          },
        },
        React.createElement(
          Form.Item,
          { name: "language", label: "Ngôn ngữ" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "VD: Tiếng Việt, EN...",
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "docFormat", label: "Hình thức tài liệu" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "VD: Bản gốc, Bản scan...",
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
      React.createElement(
        Form.Item,
        { name: "googleDriveUrl", label: "Google Drive URL" },
        React.createElement(Input, {
          allowClear: true,
          placeholder: "https://docs.google.com/...",
        }),
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 12,
          },
        },
        React.createElement(
          Button,
          { onClick: cancelEdit, style: { fontFamily: FONT } },
          "Hủy",
        ),
        React.createElement(
          Button,
          {
            type: "primary",
            loading: saving,
            onClick: handleSave,
            style: { fontFamily: FONT },
          },
          "Lưu cập nhật",
        ),
      ),
    );

  return React.createElement(
    Modal,
    {
      open: !!doc,
      onCancel: onClose,
      width: 860,
      centered: true,
      destroyOnClose: true,
      title: React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingRight: 24,
            fontFamily: FONT,
            gap: 12,
          },
        },
        React.createElement(
          "div",
          { style: { flex: 1, minWidth: 0 } },
          React.createElement(
            "div",
            {
              style: {
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.4,
                wordBreak: "break-word",
                whiteSpace: "normal",
                display: "block",
              },
            },
            doc?.title ||
            attachment?.title ||
            attachment?.filename ||
            "(Chưa có tên)",
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                gap: 8,
                marginTop: 6,
                flexWrap: "wrap",
              },
            },
            doc?.documentType &&
            React.createElement(
              Tag,
              { color: "blue", style: { fontSize: 11, margin: 0 } },
              doc.documentType,
            ),
            doc?.documentCode &&
            React.createElement(
              Tag,
              { style: { fontSize: 11, margin: 0, fontFamily: "monospace" } },
              doc.documentCode,
            ),
          ),
        ),
        !editing &&
        activeTab === "info" &&
        React.createElement(
          Button,
          {
            size: "small",
            type: "primary",
            ghost: true,
            onClick: () => setEditing(true),
            style: { fontFamily: FONT, flexShrink: 0 },
          },
          iconLabel(EditIcon, "Chỉnh sửa"),
        ),
      ),
    },
    React.createElement(Tabs, {
      size: "small",
      activeKey: activeTab,
      onChange: setActiveTab,
      items: [
        {
          key: "info",
          label: React.createElement(
            "span",
            { style: { fontFamily: FONT } },
            "Thông tin & Ghi chú",
          ),
          children: React.createElement(
            "div",
            {
              style: {
                maxHeight: "62vh",
                overflowY: "auto",
                paddingRight: 4,
                paddingTop: 8,
              },
            },
            editing
              ? React.createElement(InfoEdit)
              : React.createElement(InfoView),
          ),
        },
        isAdminUser(currentUser) && {
          key: "activity",
          label: React.createElement(
            "span",
            { style: { fontFamily: FONT } },
            "Lịch sử",
          ),
          children: React.createElement(
            "div",
            { style: { paddingTop: 8 } },
            doc && React.createElement(ActivityLogTab, { doc }),
          ),
        },
      ].filter(Boolean),
    }),
  );
};

// ==================== HOOKS: DATA FETCHING ====================
function useCurrentUserWithLawyer() {
  const [data, setData] = useState({
    currentUser: null,
    currentLawyerId: null,
    currentLawyer: null,
    loading: true,
  });

  useEffect(() => {
    const init = async () => {
      try {
        // Luôn gọi auth:check để lấy đúng user đang login
        // (ctx.currentUser có thể là admin context, không phải user thực sự)
        let user = null;
        try {
          const res = await ctx.api.request({ url: "auth:check" });
          user = res?.data?.data || res?.data || null;
        } catch {}
        if (!user) {
          user = getCurrentUser();
        }

        if (!user) {
          setData({
            currentUser: null,
            currentLawyerId: null,
            currentLawyer: null,
            loading: false,
          });
          return;
        }

        // Fetch associated lawyer record
        const lwRes = await ctx.api.request({
          url: "lawyers:list",
          params: {
            pageSize: 1,
            filter: JSON.stringify({
              $or: [
                { userId: { $eq: extractId(user.id) } },
                { createdById: { $eq: extractId(user.id) } },
              ],
            }),
          },
        });

        let lawyer = lwRes?.data?.data?.[0];
        if (!lawyer) {
          const allLawyersRes = await ctx.api.request({
            url: "lawyers:list",
            params: {
              pageSize: 1000,
              fields: "id,lawyerName,email,userId,createdById",
            },
          });
          const currentUserId = extractId(user.id);
          lawyer = (allLawyersRes?.data?.data || []).find((item) => {
            const linkedUserId =
              extractId(item.userId) || extractId(item.user);
            return (
              linkedUserId === currentUserId ||
              extractId(item.createdById) === currentUserId
            );
          });
        }
        setData({
          currentUser: user,
          currentLawyerId: lawyer ? extractId(lawyer.id) : null,
          currentLawyer: lawyer || null,
          loading: false,
        });
      } catch (e) {
        setData((prev) => ({ ...prev, loading: false }));
      }
    };
    init();
  }, []);

  return data;
}

function useDynamicDocumentManager(
  context,
  currentUser,
  currentLawyerId,
  selectedInternalCompanyId = null,
  userLoading = false,
) {
  const [folders, setFolders] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    console.log("[DEBUG][fetchData] called — context.mode:", context.mode, "| recordId:", context.recordId, "| projectId:", context.projectId, "| customerId:", context.customerId);
    const isGlobalMode = context.mode === "global";
    const business = getDashboardBusiness(context);
    const activeDashboardMode = normalizeDashboardMode(context.mode);
    const moduleScope = normalizeModuleScopeValue(
      business?.moduleScope || context.moduleScope || MODULE_SCOPE.CASE_DOCUMENT,
    );
    const activeInternalCompanyId = getActiveBusinessCompanyId(
      context,
      selectedInternalCompanyId,
    );
    const isLegalReferenceDetail =
      business?.key === "legal_reference" && !!getContextLegalReferenceId(context);
    const isModuleScopeOnlyBusiness =
      business?.key === "internal_templates" ||
      (business?.key === "legal_reference" && !isLegalReferenceDetail);
    console.log("[DEBUG][fetchData] resolved business:", {
      mode: context.mode,
      moduleScope,
      business: business?.key || null,
      activeInternalCompanyId,
      selectedInternalCompanyId,
      isLegalReferenceDetail,
      isModuleScopeOnlyBusiness,
    });
    const needsCurrentUser =
      context.respectFolderPermissions && !isGlobalMode && !isModuleScopeOnlyBusiness;
    // Chờ cả currentUser VÀ lawyer record load xong mới fetch
    if (needsCurrentUser && (userLoading || !currentUser)) {
      console.log("[DEBUG][fetchData] SKIP — user/lawyer loading not complete yet (userLoading:", userLoading, "| currentUser:", !!currentUser, ")");
      setLoading(false);
      return;
    }
    const fetchModuleScopeOnlyDocuments = async () => {
      setLoading(true);
      try {
        const docFilter = business.buildDocumentFilter(context, {
          activeInternalCompanyId,
        });
        console.log("[DEBUG][fetchData] moduleScopeOnly:start", {
          mode: context.mode,
          business: business.key,
          moduleScope,
          activeInternalCompanyId,
          docFilter,
        });
        setFolders([]);
        const baseDocParams = {
          sort: ["-createdAt"],
          appends: [
            "fileAttachment",
            "internalCompany",
            "legalReference",
            "updatedBy",
            "createdBy",
          ],
        };
        const fallbackDocParams = {
          sort: ["-createdAt"],
          appends: [
            "fileAttachment",
            "legalReference",
            "updatedBy",
            "createdBy",
          ],
        };
        const filteredDocParams = {
          ...baseDocParams,
          ...(Object.keys(docFilter).length > 0
            ? { filter: JSON.stringify(docFilter) }
            : {}),
        };

        let fetchedDocs = [];
        let usedFallback = false;
        try {
          fetchedDocs = await fetchAllDocumentsList(filteredDocParams);
        } catch (appendError) {
          console.warn(
            "[DEBUG][fetchData][moduleScopeOnly] retry without internalCompany append",
            appendError,
          );
          fetchedDocs = await fetchAllDocumentsList({
            ...fallbackDocParams,
            ...(Object.keys(docFilter).length > 0
              ? { filter: JSON.stringify(docFilter) }
              : {}),
          });
        }

        if (fetchedDocs.length === 0 && Object.keys(docFilter).length > 0) {
          usedFallback = true;
          console.warn(
            "[DEBUG][fetchData][moduleScopeOnly] server filter returned 0, retry all documents and filter in JS",
            docFilter,
          );
          try {
            fetchedDocs = await fetchAllDocumentsList(baseDocParams);
          } catch {
            fetchedDocs = await fetchAllDocumentsList(fallbackDocParams);
          }
        }

        const scopedDocs = usedFallback
          ? fetchedDocs.filter(
            (doc) => normalizeModuleScopeValue(doc?.moduleScope) === moduleScope,
          )
          : fetchedDocs;
        const visibleDocs = scopedDocs.filter((doc) =>
          business.matchesDocument(doc, { activeInternalCompanyId, context }),
        );
        console.log("[DEBUG][fetchData] moduleScopeOnly:docs", {
          mode: context.mode,
          business: business.key,
          fetched: fetchedDocs.length,
          scoped: scopedDocs.length,
          visible: visibleDocs.length,
          usedFallback,
          firstThree: visibleDocs.slice(0, 3).map(debugRecordSnapshot),
        });
        setDocs(visibleDocs);
      } catch (e) {
        console.error("[DEBUG][fetchData][moduleScopeOnly] failed:", e);
        message.error("Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };

    if (isModuleScopeOnlyBusiness) {
      await fetchModuleScopeOnlyDocuments();
      return;
    }

    if (isGlobalMode && business) {
      setLoading(true);
      try {
        debugDashboard("fetchData:global:start");
        const folderFilter = business.buildFolderFilter(context, {
          activeInternalCompanyId,
        });
        const fetchedFolders = await fetchAllList("folders:list", {
          sort: ["createdAt"],
          ...(Object.keys(folderFilter).length > 0
            ? { filter: JSON.stringify(folderFilter) }
            : {}),
          appends: ["createdBy", "updatedBy"],
        });
        const folderCandidates = fetchedFolders.filter((folder) =>
          business.matchesFolder
            ? business.matchesFolder(folder, { activeInternalCompanyId, context })
            : matchesModuleScope(folder, moduleScope),
        );
        const visibleFolders = business
          .filterFolders(folderCandidates, context, { activeInternalCompanyId })
          .map((folder) => ({ ...folder, _navOnly: false }));
        debugDashboard("fetchData:global:folders", {
          fetched: fetchedFolders.length,
          visible: visibleFolders.length,
          rootCount: visibleFolders.filter((f) => !extractId(f.parentId)).length,
          firstThree: visibleFolders.slice(0, 3).map(debugRecordSnapshot),
        });
        setFolders(visibleFolders);
        const docFilter = business.buildDocumentFilter(context, {
          activeInternalCompanyId,
        });
        const fetchedDocs = await fetchAllDocumentsList({
          sort: ["-createdAt"],
          ...(Object.keys(docFilter).length > 0
            ? { filter: JSON.stringify(docFilter) }
            : {}),
          appends: [
            "fileAttachment",
            "internalCompany",
            "legalReference",
            "updatedBy",
            "createdBy",
          ],
        });
        debugDashboard("fetchData:global:docs", {
          fetched: fetchedDocs.length,
          firstThree: fetchedDocs.slice(0, 3).map(debugRecordSnapshot),
        });
        setDocs(
          fetchedDocs.filter((doc) =>
            business.matchesDocument
              ? business.matchesDocument(doc, { activeInternalCompanyId, context })
              : matchesModuleScope(doc, moduleScope),
          ),
        );
      } catch (e) {
        console.error("[DEBUG][fetchData][global] failed:", e);
        message.error("Lỗi tải dữ liệu");
      } finally {
        setLoading(false);
      }
      return;
    }
    // Guard: only skip global fetch if the URL itself contains /filterbytk/<id>.
    // Do NOT use ctx?.filterByTk here — NocoBase injects that value even on global views
    // (e.g. block config), which would incorrectly block the fetch and cause infinite loading.
    const urlHasFilterByTk = !!(
      window.location.pathname.match(/\/filterbytk\/\d+/i) ||
      window.location.href.match(/\/filterbytk\/\d+/i)
    );
    console.log("[DEBUG][fetchData] urlHasFilterByTk:", urlHasFilterByTk, "| ctx.filterByTk:", ctx?.filterByTk, "| context.mode:", context.mode);
    if (
      context.mode === "global" &&
      context.modeSource !== "config" &&
      urlHasFilterByTk
    ) {
      console.log("[DEBUG][fetchData] SKIP — URL has filterbytk, waiting for resolveContext to update mode to non-global");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (isModuleScopeOnlyBusiness) {
        const docFilter = business.buildDocumentFilter(context, {
          activeInternalCompanyId,
        });
        debugDashboard("fetchData:moduleScopeOnly:start", {
          mode: context.mode,
          business: business.key,
          moduleScope,
          activeInternalCompanyId,
          docFilter,
        });
        setFolders([]);
        let fetchedDocs = [];
        try {
          fetchedDocs = await fetchAllDocumentsList({
            sort: ["-createdAt"],
            ...(Object.keys(docFilter).length > 0
              ? { filter: JSON.stringify(docFilter) }
              : {}),
            appends: [
              "fileAttachment",
              "internalCompany",
              "updatedBy",
              "createdBy",
            ],
          });
        } catch (appendError) {
          console.warn(
            "[DEBUG][fetchData][moduleScopeOnly] retry without internalCompany append",
            appendError,
          );
          fetchedDocs = await fetchAllDocumentsList({
            sort: ["-createdAt"],
            ...(Object.keys(docFilter).length > 0
              ? { filter: JSON.stringify(docFilter) }
              : {}),
            appends: [
              "fileAttachment",
              "updatedBy",
              "createdBy",
            ],
          });
        }
        const visibleDocs = fetchedDocs.filter((doc) =>
          business.matchesDocument(doc, { activeInternalCompanyId, context }),
        );
        debugDashboard("fetchData:moduleScopeOnly:docs", {
          mode: context.mode,
          business: business.key,
          fetched: fetchedDocs.length,
          visible: visibleDocs.length,
          firstThree: visibleDocs.slice(0, 3).map(debugRecordSnapshot),
        });
        setDocs(visibleDocs);
        setLoading(false);
        return;
      }

      let folderFilter = {};
      const safeRecordId = extractId(context.recordId);
      if (business) {
        folderFilter = business.buildFolderFilter(context, {
          activeInternalCompanyId,
        });
      } else if (safeRecordId) {
        if (context.mode === "internal_templates") {
          folderFilter = { internalCompanyId: { $eq: safeRecordId } };
        } else if (context.mode === "customers")
          folderFilter = { customerId: { $eq: safeRecordId } };
        else if (context.mode === "cases") {
          const caseCustomerId = extractId(context.customerId);
          folderFilter = caseCustomerId
            ? { customerId: { $eq: caseCustomerId } }
            : { projectId: { $eq: safeRecordId } };
        }
        else if (context.mode === "tasks")
          folderFilter = { taskId: { $eq: safeRecordId } };
        else if (context.mode === "quotations")
          folderFilter = { quotationId: { $eq: safeRecordId } };
        else if (context.mode === "contracts")
          folderFilter = { contractId: { $eq: safeRecordId } };
        else if (context.mode === "project_internal")
          folderFilter = { projectInternalId: { $eq: safeRecordId } };
      }
      const needsFullFolderTree = ["customers", "cases"].includes(context.mode);
      if (!business && needsFullFolderTree) {
        folderFilter = {};
      } else if (!business && context.mode !== "project_internal") {
        folderFilter = addScopeFilters(
          folderFilter,
          moduleScope,
          activeInternalCompanyId,
        );
      }

      const fetchedFolders = await fetchAllList("folders:list", {
        sort: ["createdAt"],
        ...(Object.keys(folderFilter).length > 0
          ? { filter: JSON.stringify(folderFilter) }
          : {}),
        appends: ["createdBy", "updatedBy", "folderManager", "folderManagers", "folderMember", "folderMembers"],
      });
      debugDashboard("fetchData:folders:raw", {
        mode: context.mode,
        isGlobalMode: false,
        folderFilter,
        fetchedCount: fetchedFolders.length,
        rawFirstThree: fetchedFolders.slice(0, 3).map(debugRecordSnapshot),
      });
      const folderCandidates = fetchedFolders.filter((folder) =>
        business?.matchesFolder
          ? business.matchesFolder(folder, { activeInternalCompanyId, context })
          : matchesModuleScope(folder, moduleScope),
      );
      const scopedFolders = business?.filterFolders
        ? business.filterFolders(folderCandidates, context, {
          activeInternalCompanyId,
        })
        : filterFoldersForContext(folderCandidates, context);

      const accessResult = context.respectFolderPermissions
        ? getVisibleFolderIds(scopedFolders, currentUser, currentLawyerId)
        : {
          accessible: new Set(scopedFolders.map((f) => extractId(f.id)).filter(Boolean)),
          navOnly: new Set(),
        };
      const { accessible, navOnly } = accessResult;

      // Khi respectFolderPermissions = true: chỉ giữ accessible, bỏ navOnly (hidden hoàn toàn)
      const visibleFolders = context.respectFolderPermissions
        ? scopedFolders
          .filter((f) => accessible.has(extractId(f.id)))
          .map((f) => ({ ...f, _navOnly: false }))
        : scopedFolders.map((f) => ({ ...f, _navOnly: false }));
      console.log("[DEBUG][DocumentDashboard][folders]", {
        mode: context.mode,
        moduleScope,
        folderFilter,
        fetched: fetchedFolders.length,
        scoped: scopedFolders.length,
        visible: visibleFolders.length,
        rootCount: visibleFolders.filter((f) => !extractId(f.parentId)).length,
        firstVisible: debugRecordSnapshot(visibleFolders[0]),
      });
      setFolders(visibleFolders);
      debugDashboard("fetchData:setFolders called", {
        visibleCount: visibleFolders.length,
        rootNames: visibleFolders
          .filter((f) => !extractId(f.parentId))
          .slice(0, 10)
          .map((f) => f.name || f.title || f.id),
      });

      const folderIds = Array.from(accessible);

      const orConditions = [];
      if (!business && folderIds.length > 0)
        orConditions.push({ folderId: { $in: folderIds } });
      if (!business && safeRecordId && context.mode !== "internal_templates") {
        const directLinkFilter = getDocumentDirectLinkFilter(context, safeRecordId);
        if (directLinkFilter) orConditions.push(directLinkFilter);
      }

      const projectInternalTaskIds = [];
      const projectInternalSubTaskIds = [];
      const projectInternalLinkedDocConditions = [];
      if (context.mode === "project_internal" && safeRecordId) {
        try {
          const projectTasks = await fetchAllList(
            "tasks:list",
            {
              fields: "id",
              filter: JSON.stringify({
                projectInternalId: { $eq: safeRecordId },
              }),
            },
          );
          projectTasks.forEach((task) => {
            const taskId = extractId(task.id);
            if (taskId) projectInternalTaskIds.push(taskId);
          });

          if (projectInternalTaskIds.length > 0) {
            const projectSubTasks = await fetchAllList(
              "subTasks:list",
              {
                fields: "id,taskId",
                filter: JSON.stringify({
                  taskId: { $in: projectInternalTaskIds },
                }),
              },
            );
            projectSubTasks.forEach((subTask) => {
              const subTaskId = extractId(subTask.id);
              if (subTaskId) projectInternalSubTaskIds.push(subTaskId);
            });
            projectInternalLinkedDocConditions.push({
              taskId: { $in: projectInternalTaskIds },
            });
          }

          if (projectInternalSubTaskIds.length > 0) {
            projectInternalLinkedDocConditions.push({
              subTaskId: { $in: projectInternalSubTaskIds },
            });
          }
          orConditions.push(...projectInternalLinkedDocConditions);
        } catch (e) {
          console.warn("Failed to resolve Project Internal task documents:", e);
        }
      }

      let fetchedDocs = [];
      let docFilter = {};
      let shouldFetchDocs = false;
      if (business) {
        docFilter = business.buildDocumentFilter(context, {
          folderIds,
          activeInternalCompanyId,
        });
        shouldFetchDocs = business.shouldFetchDocuments(context, {
          folderIds,
          activeInternalCompanyId,
        });
      } else {
        let scopeDocFilter = addScopeFilters(
          {},
          moduleScope,
          activeInternalCompanyId,
        );
        if (context.mode === "project_internal" && safeRecordId) {
          const projectInternalDocScopes = [
            scopeDocFilter,
          ];
          if (folderIds.length > 0) {
            projectInternalDocScopes.push({ folderId: { $in: folderIds } });
          }
          projectInternalDocScopes.push(...projectInternalLinkedDocConditions);
          scopeDocFilter = {
            $or: projectInternalDocScopes,
          };
        }
        const hasScopeDocFilter = Object.keys(scopeDocFilter).length > 0;
        docFilter = scopeDocFilter;
        if (
          !["internal_templates", "legal_reference"].includes(activeDashboardMode) &&
          orConditions.length > 0
        ) {
          docFilter = hasScopeDocFilter
            ? { $and: [scopeDocFilter, { $or: orConditions }] }
            : { $or: orConditions };
        }

        shouldFetchDocs =
          orConditions.length > 0 ||
          ["internal_templates", "legal_reference"].includes(activeDashboardMode);
      }

      if (shouldFetchDocs) {
        const docParams = {
          sort: ["-createdAt"],
          ...(Object.keys(docFilter).length > 0
            ? { filter: JSON.stringify(docFilter) }
            : {}),
          appends: [
            "fileAttachment",
            "internalCompany",
            "legalReference",
            "updatedBy",
            "createdBy",
          ],
        };
        try {
          fetchedDocs = await fetchAllDocumentsList(docParams);
        } catch (docFetchError) {
          if (
            business?.key === "legal_reference" &&
            getContextLegalReferenceId(context)
          ) {
            console.warn(
              "[DEBUG][fetchData][legal_reference] retry with scope-only docs",
              docFetchError,
            );
            fetchedDocs = await fetchAllDocumentsList({
              sort: ["-createdAt"],
              filter: JSON.stringify(
                addScopeFilters({}, moduleScope, activeInternalCompanyId),
              ),
              appends: [
                "fileAttachment",
                "internalCompany",
                "legalReference",
                "updatedBy",
                "createdBy",
              ],
            });
          } else {
            throw docFetchError;
          }
        }
      }
      debugDashboard("fetchData:docs:raw", {
        mode: context.mode,
        business: business?.key,
        moduleScope,
        activeInternalCompanyId,
        docFilter,
        shouldFetchDocs,
        fetchedCount: fetchedDocs.length,
        firstThree: fetchedDocs.slice(0, 3).map(debugRecordSnapshot),
      });

      const visibleFolderIdSet = new Set(
        folderIds.map((id) => String(id)).filter(Boolean),
      );
      const projectInternalTaskIdSet = new Set(
        projectInternalTaskIds.map((id) => String(id)),
      );
      const projectInternalSubTaskIdSet = new Set(
        projectInternalSubTaskIds.map((id) => String(id)),
      );
      const visibleDocs = fetchedDocs.filter((doc) => {
        if (business?.matchesDocument) {
          return business.matchesDocument(doc, {
            activeInternalCompanyId,
            folderIds,
            context,
          });
        }
        if (context.mode !== "project_internal") {
          return matchesModuleScope(doc, moduleScope);
        }
        const docFolderId = extractId(doc.folderId);
        const docRecordId = extractId(doc.recordId);
        const docCollectionName = String(doc.collectionName || "").toLowerCase();
        const isProjectInternalTaskDocument =
          ["task", "tasks"].includes(docCollectionName) &&
          projectInternalTaskIdSet.has(String(docRecordId));
        const isProjectInternalSubTaskDocument =
          ["subtask", "subtasks"].includes(docCollectionName) &&
          projectInternalSubTaskIdSet.has(String(docRecordId));
        return (
          matchesModuleScope(doc, moduleScope) ||
          (docFolderId && visibleFolderIdSet.has(String(docFolderId))) ||
          isProjectInternalTaskDocument ||
          isProjectInternalSubTaskDocument ||
          (
            isProjectInternalCollectionName(doc.collectionName) &&
            extractId(doc.recordId) === safeRecordId
          )
        );
      });
      debugDashboard("fetchData:docs:visible", {
        mode: context.mode,
        business: business?.key,
        fetched: fetchedDocs.length,
        visible: visibleDocs.length,
        firstThree: visibleDocs.slice(0, 3).map(debugRecordSnapshot),
      });
      setDocs(visibleDocs);
    } catch (e) {
      console.error("[DEBUG][fetchData] failed:", e);
      message.error("Lỗi tải dữ liệu");
    }
    setLoading(false);
  }, [
    context.mode,
    context.modeSource,
    context.respectFolderPermissions,
    context.recordId,
    context.collection,
    context.moduleScope,
    context.internalCompanyId,
    context.projectInternalId,
    selectedInternalCompanyId,
    currentUser,
    currentLawyerId,
    userLoading,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  return { folders, docs, loading, refetch: fetchData };
}

function useInternalCompanies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      let res = null;
      try {
        res = await ctx.api.request({
          url: "internalCompany:list",
          params: { pageSize: 1000, sort: ["createdAt"] },
        });
      } catch {
        res = await ctx.api.request({
          url: "internalCompany:list",
          params: { pageSize: 1000, sort: ["createdAt"] },
        });
      }
      setCompanies(res?.data?.data || []);
    } catch {
      setCompanies([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return { companies, loading, refetch: fetchCompanies };
}

const getInternalCompanyName = (company) =>
  company?.name ||
  company?.companyName ||
  company?.internalCompanyName ||
  company?.code ||
  company?.companyCode ||
  company?.shortCode ||
  company?.shortName ||
  company?.abbreviation ||
  (company?.id ? `Company ${company.id}` : "");

const LEGAL_REFERENCE_RESOURCE_CANDIDATES = [
  "legalReference:list",
  "legalReferences:list",
  "LegalReference:list",
];

const getLegalReferenceDisplayName = (record) => {
  if (!record) return "";
  const code =
    record.referenceCode ||
    record.code ||
    record.referenceNo ||
    record.id;
  const title =
    record.title ||
    record.name ||
    record.description ||
    (record.id ? `Legal Reference ${record.id}` : "Legal Reference");
  return code && String(code) !== String(title) ? `${code} - ${title}` : title;
};

const getDocumentLegalReferenceId = (doc) =>
  extractId(doc?.legalReferenceId) ||
  extractId(doc?.legalReference) ||
  extractId(doc?.legalReferenceRecord);

const fetchLegalReferenceRecords = async (internalCompanyId = null) => {
  let lastError = null;
  for (const url of LEGAL_REFERENCE_RESOURCE_CANDIDATES) {
    try {
      let items;
      try {
        items = await fetchAllList(url, {
          sort: ["-createdAt"],
          appends: ["internalCompany"],
        });
      } catch {
        items = await fetchAllList(url, {
          sort: ["-createdAt"],
        });
      }
      return items.filter((item) =>
        matchesInternalCompany(item, internalCompanyId),
      );
    } catch (e) {
      lastError = e;
    }
  }
  console.warn("Failed to fetch LegalReference records:", lastError);
  return [];
};

// ==================== MODALS CỦA DASHBOARD ====================

const fetchLegalReferenceRecordById = async (id) => {
  const safeId = extractId(id);
  if (!safeId) return null;
  let lastError = null;
  for (const url of LEGAL_REFERENCE_RESOURCE_CANDIDATES) {
    try {
      const res = await ctx.api.request({
        url,
        params: {
          pageSize: 1,
          filter: JSON.stringify({ id: { $eq: safeId } }),
          appends: ["internalCompany"],
        },
      });
      const item = res?.data?.data?.[0];
      if (item) return item;
    } catch (e) {
      lastError = e;
    }
  }
  if (lastError) {
    console.warn("Failed to resolve LegalReference by id:", safeId, lastError);
  }
  return null;
};

const FolderModal = ({
  open,
  onClose,
  onSuccess,
  context,
  editFolder = null,
  currentUser,
  currentLawyerId,
  currentLawyer = null,
  folders = [],
  activeInternalCompanyId = null,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const isEdit = !!editFolder?.id;
  const [lawyers, setLawyers] = useState([]);
  const [shares, setShares] = useState([]);

  useEffect(() => {
    if (open) {
      if (isEdit) {
        form.setFieldsValue({
          name: editFolder.name,
          description: editFolder.description,
        });

        const folderId = extractId(editFolder.id || editFolder);
        // Load lawyers và permissions song song
        Promise.all([
          ctx.api
            .request({ url: "lawyers:list", params: { pageSize: 1000 } })
            .catch(() => ({ data: { data: [] } })),
          ctx.api
            .request({
              url: `folders/${folderId}/folderManager:list`,
              params: { pageSize: 1000 },
            })
            .catch(() => ({ data: { data: [] } })),
          ctx.api
            .request({
              url: "folderMembers:list",
              params: {
                pageSize: 1000,
                filter: JSON.stringify({ folderId: { $eq: folderId } }),
              },
            })
            .catch(() => ({ data: { data: [] } })),
        ]).then(([lwRes, mgRes, mbRes]) => {
          setLawyers(lwRes?.data?.data || []);
          const initialShares = [];
          const managerRows = mgRes?.data?.data || [];
          const memberRows = mbRes?.data?.data || [];
          // folderManager:list (nested) trả về lawyer records trực tiếp → dùng row.id
          managerRows.forEach((row) => {
            const lawyerId = getPermissionLawyerId(row);
            if (!lawyerId) return;
            initialShares.push({
              id: String(lawyerId),
              role: "manager",
              lawyerData: getRelationLawyerRecord(row),
            });
          });
          // folderMembers:list (direct collection) là junction table → dùng row.lawyerId
          memberRows.forEach((row) => {
            const lawyerId = getPermissionLawyerId(row);
            if (!lawyerId) return;
            initialShares.push({
              id: String(lawyerId),
              role: getPermissionRole(row),
              lawyerData: getRelationLawyerRecord(row),
            });
          });
          setShares(initialShares);
        });
      } else {
        form.setFieldsValue({ name: "", description: "" });
        // Load lawyers trước, sau đó tìm current user's lawyer record
        ctx.api
          .request({ url: "lawyers:list", params: { pageSize: 1000 } })
          .then((res) => {
            const lawyerList = res?.data?.data || [];
            setLawyers(lawyerList);
            if (currentLawyerId) {
              setShares([
                {
                  id: String(extractId(currentLawyerId)),
                  role: "manager",
                  lawyerData: currentLawyer,
                },
              ]);
            } else {
              setShares([]);
            }
          })
          .catch(() => { });
      }
    } else {
      form.resetFields();
      setShares([]);
    }
  }, [open, editFolder, isEdit, form, currentLawyerId, currentLawyer]);

  const handleSave = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const values = form.getFieldsValue();
    const safeUserId = extractId(currentUser);
    setSaving(true);
    try {
      const managers = shares.filter((s) => s.role === "manager");
      const members = shares.filter((s) => s.role !== "manager");

      // Payload lấy đúng theo form: managers/members do user chọn trong UI
      // (không gán cứng current user - form đã init sẵn current user khi mở)

      let folderIdToSync = null;

      if (isEdit) {
        const safeEditId = extractId(editFolder);
        folderIdToSync = safeEditId;
        await ctx.api.request({
          url: `folders:update?filterByTk=${safeEditId}`,
          method: "POST",
          data: {
            name: values.name.trim(),
            description: values.description?.trim() || "",
            updatedById: safeUserId,
          },
        });
        message.success("Cập nhật thư mục thành công!");
      } else {
        const parentFolder = editFolder?.raw || null;
        const folderType = getFolderTypeForContext(context, parentFolder);

        const autoParentId = await resolveLogicalParentId(
          context,
          editFolder?.parentId,
        );

        let payload = {
          ...buildFolderPayloadForContext(context, {
            activeInternalCompanyId,
            parentFolder,
          }),
          name: values.name.trim(),
          description: values.description?.trim() || "",
          type: folderType,
          createdById: safeUserId,
          updatedById: safeUserId,
        };

        if (autoParentId) payload.parentId = autoParentId;
        const createRes = await ctx.api.request({
          url: `folders:create`,
          method: "POST",
          data: payload,
        });
        folderIdToSync = createRes?.data?.data?.id;
        message.success("Tạo thư mục thành công!");
      }

      // Sync permissions manually
      if (folderIdToSync) {
        // 1. Delete old permissions only if editing
        if (isEdit) {
          await Promise.all([
            ctx.api
              .request({
                url: "folderManagers:destroy",
                method: "POST",
                params: {
                  filter: JSON.stringify({ folderId: { $eq: folderIdToSync } }),
                },
              })
              .catch(() => { }),
            ctx.api
              .request({
                url: "folderMembers:destroy",
                method: "POST",
                params: {
                  filter: JSON.stringify({ folderId: { $eq: folderIdToSync } }),
                },
              })
              .catch(() => { }),
          ]);
        }

        // 2. Create new permissions
        const createPromises = [];
        managers.forEach((s) => {
          createPromises.push(
            ctx.api.request({
              url: "folderManagers:create",
              method: "POST",
              data: {
                folderId: folderIdToSync,
                lawyerId: Number(s.id),
                role: "manager",
              },
            }),
          );
        });
        members.forEach((s) => {
          createPromises.push(
            ctx.api.request({
              url: "folderMembers:create",
              method: "POST",
              data: {
                folderId: folderIdToSync,
                lawyerId: Number(s.id),
                role: s.role,
              },
            }),
          );
        });

        await Promise.all(createPromises);
      }
      onClose();
      onSuccess();
    } catch (e) {
      message.error("Có lỗi xảy ra");
    }
    setSaving(false);
  };

  const handleAddShare = (lawyerId) => {
    if (!lawyerId) return;
    const safeLawyerId = String(extractId(lawyerId));
    if (!safeLawyerId) return;
    if (shares.some((s) => String(s.id) === safeLawyerId)) return;
    setShares([...shares, { id: safeLawyerId, role: "viewer" }]);
  };

  const handleChangeRole = (lawyerId, newRole) => {
    setShares(
      shares.map((s) =>
        String(s.id) === String(lawyerId) ? { ...s, role: newRole } : s,
      ),
    );
  };

  const handleRemoveShare = (lawyerId) => {
    setShares(shares.filter((s) => String(s.id) !== String(lawyerId)));
  };

  const availableOptions = lawyers
    .filter(
      (l) => !shares.some((s) => String(s.id) === String(extractId(l.id))),
    )
    .map((l) => ({
      value: String(extractId(l.id)),
      label: getLawyerDisplayName(l),
    }));

  return React.createElement(
    Modal,
    {
      open,
      onCancel: onClose,
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        isEdit ? "Cập nhật thư mục" : "Tạo thư mục mới",
      ),
      footer: [
        React.createElement(
          Button,
          { key: "cancel", onClick: onClose, style: { fontFamily: FONT } },
          "Hủy",
        ),
        React.createElement(
          Button,
          {
            key: "submit",
            type: "primary",
            onClick: handleSave,
            loading: saving,
            style: { fontFamily: FONT },
          },
          "Lưu",
        ),
      ],
      width: 500,
    },
    React.createElement(
      Form,
      { form, layout: "vertical", style: { fontFamily: FONT } },
      React.createElement(
        Form.Item,
        {
          name: "name",
          label: "Tên thư mục",
          rules: [{ required: true, message: "Vui lòng nhập tên thư mục" }],
        },
        React.createElement(Input, {
          autoFocus: true,
          placeholder: "Nhập tên thư mục...",
          onKeyDown: (e) => {
            if (e.key === "Enter") handleSave();
          },
        }),
      ),
      React.createElement(
        Form.Item,
        { name: "description", label: "Tóm tắt nội dung" },
        React.createElement(Input.TextArea, {
          rows: 2,
          allowClear: true,
          placeholder: "Nhập tóm tắt nội dung thư mục...",
        }),
      ),
    ),

    // UI Share list
    React.createElement(
      "div",
      { style: { marginBottom: 16, fontFamily: FONT } },
      React.createElement(
        "div",
        { style: { marginBottom: 8, fontWeight: 600 } },
        "Thêm người truy cập",
      ),
      React.createElement(Select, {
        showSearch: true,
        style: { width: "100%", fontFamily: FONT },
        placeholder: "Tìm và thêm người...",
        options: availableOptions,
        value: null,
        onChange: handleAddShare,
        filterOption: (input, option) =>
          (option?.label ?? "").toLowerCase().includes(input.toLowerCase()),
      }),
    ),
    React.createElement(
      "div",
      { style: { marginTop: 16, fontFamily: FONT } },
      React.createElement(
        "div",
        { style: { marginBottom: 12, fontWeight: 600 } },
        "Những người có quyền truy cập",
      ),
      shares.length === 0
        ? React.createElement(Empty, {
          image: Empty.PRESENTED_IMAGE_SIMPLE,
          description: "Chưa chia sẻ cho ai",
        })
        : shares.map((s) => {
          const lw =
            lawyers.find((l) => String(extractId(l.id)) === String(s.id)) ||
            s.lawyerData ||
            {};
          const lwName =
            lw.nickname ||
            lw.lawyerName ||
            lw.email ||
            (s.id && s.id !== "undefined" ? `ID: ${s.id}` : "Không rõ tên");
          return React.createElement(
            "div",
            {
              key: s.id,
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid #f0f0f0",
              },
            },
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 12 } },
              React.createElement(
                "div",
                {
                  style: {
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#1890ff",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                    fontSize: 16,
                  },
                },
                getLawyerDisplayName(lw.id ? lw : s.lawyerData || s)
                  .charAt(0)
                  .toUpperCase(),
              ),
              React.createElement(
                "div",
                null,
                React.createElement(
                  "div",
                  { style: { fontWeight: 500, lineHeight: 1.2 } },
                  getLawyerDisplayName(lw.id ? lw : s.lawyerData || s),
                ),
                React.createElement(
                  "div",
                  { style: { fontSize: 12, color: "#8c8c8c" } },
                  s.role === "manager"
                    ? "Quản lý"
                    : s.role === "editor"
                      ? "Người chỉnh sửa"
                      : "Người xem",
                ),
              ),
            ),
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 8 } },
              React.createElement(Select, {
                value: s.role,
                onChange: (val) => handleChangeRole(s.id, val),
                style: { width: 140, fontFamily: FONT },
                bordered: false,
                options: [
                  { value: "viewer", label: "Người xem" },
                  { value: "editor", label: "Người chỉnh sửa" },
                  { value: "manager", label: "Quản lý" },
                ],
              }),
              React.createElement(
                Button,
                {
                  type: "text",
                  danger: true,
                  onClick: () => handleRemoveShare(s.id),
                  style: { padding: "4px 8px" },
                },
                "✕",
              ),
            ),
          );
        }),
    ),
  );
};

const UploadModal = ({
  open,
  onClose,
  onSuccess,
  currentUser,
  context,
  currentFolderId,
  docs = [],
  activeInternalCompanyId = null,
  internalCompanies = [],
}) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setFileList([]);
  }, [open]);
  const handleClose = useCallback(() => {
    form.resetFields();
    setFileList([]);
    onClose();
  }, [form, onClose]);

  const uploadFile = async () => {
    const file = fileList[0].originFileObj;
    const formData = new window.FormData();
    formData.append("file", file, file.name);
    const uploadRes = await ctx.api.request({
      url: "attachments:create",
      method: "POST",
      params: { attachmentField: "documents.fileAttachment" },
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });
    const attachment = uploadRes?.data?.data;
    if (!attachment?.id) throw new Error("Upload file thất bại");
    return [{ id: attachment.id }];
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields();
    } catch {
      return;
    }
    const values = form.getFieldsValue();
    const hasFile = fileList.length > 0;
    const hasDriveUrl = !!values.googleDriveUrl?.trim();
    if (!hasFile && !hasDriveUrl) {
      message.error("Vui lòng chọn file hoặc nhập URL");
      return;
    }

    setUploading(true);
    try {
      const attachmentObj = hasFile ? await uploadFile() : null;
      const now = new Date().toISOString();
      const toISO = (val) => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d.toISOString();
      };

      const autoFolderId = await resolveLogicalParentId(
        context,
        currentFolderId,
      );

      const uploadInternalCompanyId =
        values.internalCompanyId || activeInternalCompanyId;
      const calculatedFileIndex = await getNextFileIndex(
        autoFolderId,
        context.moduleScope || MODULE_SCOPE.CASE_DOCUMENT,
        uploadInternalCompanyId,
      );
      const safeUserId = extractId(currentUser);

      const payload = {
        ...buildDocumentPayloadForContext(context, {
          activeInternalCompanyId: uploadInternalCompanyId,
        }),
        fileIndex: calculatedFileIndex,
        documentType: values.documentType?.trim() || "",
        documentCode: values.documentCode?.trim() || "",
        title: values.title?.trim() || (hasFile ? fileList[0].name : ""),
        openingDate: toISO(values.openingDate),
        senderName: values.senderName?.trim() || "",
        recipientName: values.recipientName?.trim() || "",
        description: values.description?.trim() || "",
        language: values.language?.trim() || "",
        docFormat: values.docFormat?.trim() || "",
        googleDriveUrl: values.googleDriveUrl?.trim() || "",
        signedAt: toISO(values.signedAt),
        effectiveAt: toISO(values.effectiveAt),
        note: values.note?.trim() || "",
        uploadedById: safeUserId,
        createdById: safeUserId,
        updatedById: safeUserId,
        createdAt: now,
        updatedAt: now,
        ...(autoFolderId ? { folderId: autoFolderId } : {}),
        ...(attachmentObj && { fileAttachment: attachmentObj }),
      };

      await ctx.api.request({
        url: `documents:create`,
        method: "POST",
        data: payload,
      });
      message.success("Upload thành công!");
      handleClose();
      onSuccess();
    } catch (e) {
      message.error("Có lỗi xảy ra khi upload.");
    }
    setUploading(false);
  };

  const divider = (label) =>
    React.createElement(
      Divider,
      {
        orientation: "left",
        style: { fontSize: 11, color: "#8c8c8c", margin: "10px 0" },
      },
      label,
    );

  return React.createElement(
    Modal,
    {
      open,
      onCancel: handleClose,
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        "Upload tài liệu",
      ),
      width: 1100,
      centered: true,
      footer: [
        React.createElement(
          Button,
          {
            key: "cancel",
            onClick: handleClose,
            disabled: uploading,
            style: { fontFamily: FONT },
          },
          "Hủy",
        ),
        React.createElement(
          Button,
          {
            key: "submit",
            type: "primary",
            onClick: handleSubmit,
            loading: uploading,
            style: { fontFamily: FONT },
          },
          uploading ? "Đang upload..." : "Upload",
        ),
      ],
    },
    React.createElement(
      Form,
      { 
        form, 
        layout: "vertical", 
        size: "small", 
        style: { fontFamily: FONT },
        initialValues: {
          internalCompanyId: activeInternalCompanyId,
        }
      },
      divider("Định danh"),
      (context.mode === "legal_reference" || context.mode === "internal_templates") && React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr", gap: 12 } },
        React.createElement(
          Form.Item,
          {
            name: "internalCompanyId",
            label: "Công ty nội bộ",
            rules: [{ required: true, message: "Vui lòng chọn công ty nội bộ" }],
          },
          React.createElement(Select, {
            options: internalCompanies.map((company) => ({
              value: String(extractId(company)),
              label: getInternalCompanyName(company),
            })),
            placeholder: "Chọn công ty nội bộ",
            showSearch: true,
            optionFilterProp: "label",
          })
        )
      ),
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
          React.createElement(Input, {
            allowClear: true,
            placeholder: "VD: Hợp đồng, Biên bản...",
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "title", label: "Tên tài liệu" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "Nhập tên đầy đủ của tài liệu",
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
            placeholder: "VD: 123/2024/HĐ-SAMSET",
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "openingDate", label: "Ngày ban hành" },
          React.createElement(Input, {
            type: "date",
            style: { width: "100%" },
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
            style: { width: "100%" },
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "effectiveAt", label: "Ngày có hiệu lực" },
          React.createElement(Input, {
            type: "date",
            style: { width: "100%" },
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
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "recipientName", label: "Người nhận" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "Tên cá nhân / tổ chức nhận",
          }),
        ),
      ),
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
        React.createElement(
          Form.Item,
          { name: "language", label: "Ngôn ngữ" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "VD: Tiếng Việt, Tiếng Anh...",
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "docFormat", label: "Hình thức tài liệu" },
          React.createElement(Input, {
            allowClear: true,
            placeholder: "VD: Bản gốc, Bản scan...",
          }),
        ),
      ),
      React.createElement(
        Form.Item,
        { name: "description", label: "Tóm tắt nội dung" },
        React.createElement(Input.TextArea, {
          rows: 2,
          allowClear: true,
          placeholder: "Mô tả ngắn gọn nội dung tài liệu...",
        }),
      ),
      divider("File đính kèm"),
      React.createElement(
        Form.Item,
        { label: "Chọn file" },
        React.createElement(
          Dragger,
          {
            fileList,
            beforeUpload: () => false,
            onChange: ({ fileList: fl }) => setFileList(fl.slice(-1)),
            maxCount: 1,
            style: { padding: "8px 0" },
          },
          React.createElement(
            "p",
            {
              style: {
                color: "#8c8c8c",
                fontSize: 20,
                margin: "0 0 4px",
              },
            },
            UploadIcon,
          ),
          React.createElement(
            "p",
            {
              style: {
                fontSize: 13,
                color: "#595959",
                margin: 0,
                fontFamily: FONT,
              },
            },
            "Kéo thả hoặc click để chọn",
          ),
        ),
      ),
      React.createElement(
        Form.Item,
        { name: "googleDriveUrl", label: "Google Drive URL (tuỳ chọn)" },
        React.createElement(Input, {
          placeholder: "https://docs.google.com/...",
          allowClear: true,
          style: { fontSize: 12, fontFamily: FONT },
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
          style: { fontSize: 12, fontFamily: FONT },
        }),
      ),
    ),
  );
};

const BulkFolderUploadModal = ({ open, files, onClose, folders, onUpload }) => {
  const [targetId, setTargetId] = useState("root");
  useEffect(() => {
    if (open) setTargetId("root");
  }, [open]);

  const folderOptions = useMemo(() => {
    const getPath = (folderId) => {
      if (folderId === "root") return "Home";
      const path = [];
      let curr = folders.find((f) => String(extractId(f)) === String(folderId));
      while (curr) {
        path.unshift(curr.name);
        curr = folders.find(
          (f) => String(extractId(f)) === String(extractId(curr.parentId)),
        );
      }
      return path.join(" / ");
    };

    const opts = [{ value: "root", label: "Home" }];
    folders.forEach((f) => {
      opts.push({
        value: String(extractId(f)),
        label: getPath(extractId(f)),
      });
    });
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }, [folders]);

  const folderNameToUpload =
    files && files.length > 0 ? files[0].webkitRelativePath.split("/")[0] : "";

  return React.createElement(
    Modal,
    {
      open,
      onCancel: onClose,
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        "Xác nhận Upload Thư mục",
      ),
      footer: [
        React.createElement(
          Button,
          { key: "cancel", onClick: onClose, style: { fontFamily: FONT } },
          "Hủy bỏ",
        ),
        React.createElement(
          Button,
          {
            key: "submit",
            type: "primary",
            onClick: () => onUpload(targetId),
            style: { fontFamily: FONT },
          },
          "Xác nhận Upload",
        ),
      ],
    },
    React.createElement(
      "div",
      { style: { fontFamily: FONT } },
      React.createElement(
        "p",
        null,
        `Bạn đang chuẩn bị tải lên thư mục `,
        React.createElement("strong", null, folderNameToUpload),
        ` chứa `,
        React.createElement(
          "strong",
          { style: { color: "#1890ff" } },
          files?.length || 0,
        ),
        ` tệp tin.`,
      ),
      React.createElement(
        "div",
        { style: { marginTop: 16 } },
        React.createElement(
          "div",
          { style: { marginBottom: 8, fontWeight: 600, color: "#262626" } },
          "Chọn nơi lưu trữ:",
        ),
        React.createElement(Select, {
          style: { width: "100%", fontFamily: FONT },
          value: targetId,
          onChange: setTargetId,
          showSearch: true,
          optionFilterProp: "label",
          options: folderOptions,
        }),
      ),
    ),
  );
};

// ==================== MAIN COMPONENT (UNIVERSAL DOCUMENT DASHBOARD) ====================
const DocumentDashboard = () => {
  const {
    currentUser,
    currentLawyerId,
    currentLawyer,
    loading: loadingUser,
  } = useCurrentUserWithLawyer();
  const [lawyerDirectory, setLawyerDirectory] = useState([]);

  useEffect(() => {
    let cancelled = false;
    ctx.api
      .request({
        url: "lawyers:list",
        params: {
          pageSize: 1000,
          fields: "id,lawyerName,email,userId,createdById",
        },
      })
      .then((res) => {
        if (!cancelled) setLawyerDirectory(res?.data?.data || []);
      })
      .catch(() => {
        if (!cancelled) setLawyerDirectory([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const lawyerByUserId = useMemo(() => {
    const map = new Map();
    lawyerDirectory.forEach((lawyer) => {
      const userId = extractId(lawyer.userId) || extractId(lawyer.user);
      if (userId) map.set(userId, lawyer);
    });
    return map;
  }, [lawyerDirectory]);

  const [resolvedContext, setResolvedContext] = useState(CONTEXT);

  const [filterInternalCompanyId, setFilterInternalCompanyId] = useState(
    resolvedContext.internalCompanyId ? String(resolvedContext.internalCompanyId) : null,
  );

  const {
    folders,
    docs,
    loading: loadingData,
    refetch,
  } = useDynamicDocumentManager(
    resolvedContext,
    currentUser,
    currentLawyerId,
    filterInternalCompanyId,
    loadingUser,  // chờ user+lawyer load xong mới fetch để lọc permission đúng
  );

  // === RENDER-PHASE PERMISSION FILTER (safety net cuối cùng) ===
  // Áp dụng trực tiếp trong render, độc lập với async data fetching
  const permissionFilteredFolders = useMemo(() => {
    if (!resolvedContext.respectFolderPermissions || loadingUser || !currentUser) {
      console.log("[PERM] render-phase: skip filter (respectPerm:", resolvedContext.respectFolderPermissions, "loadingUser:", loadingUser, "hasUser:", !!currentUser, ")");
      return folders;
    }
    if (isAdminUser(currentUser)) {
      console.log("[PERM] render-phase: admin user, showing all", folders.length, "folders");
      return folders;
    }
    const uid = extractId(currentUser?.id);
    const lwId = extractId(currentLawyerId);
    const { accessible } = getVisibleFolderIds(folders, currentUser, currentLawyerId);
    const filtered = folders.filter((f) => accessible.has(extractId(f.id)));
    console.log("[PERM] render-phase filter: uid=", uid, "lwId=", lwId, "accessible=", accessible.size, "/", folders.length, "→ show", filtered.length, "| folder managers sample:", (folders[0]?.folderManager || folders[0]?.folderManagers || []).slice(0,2));
    return filtered;
  }, [folders, currentUser, currentLawyerId, loadingUser, resolvedContext.respectFolderPermissions]);

  useEffect(() => {
    const resolveContext = async () => {
      console.log("[DEBUG][resolveContext] START");
      console.log("[DEBUG][resolveContext] pathname:", window.location.pathname);
      console.log("[DEBUG][resolveContext] href:", window.location.href);
      console.log("[DEBUG][resolveContext] ctx.record:", ctx.record);
      console.log("[DEBUG][resolveContext] ctx.filterByTk:", ctx?.filterByTk);
      console.log("[DEBUG][resolveContext] CONTEXT (static):", JSON.stringify(CONTEXT));
      console.log("[DEBUG][resolveContext] resolvedContext.mode:", resolvedContext.mode);

      if (resolvedContext.modeSource === "config") {
        console.log("[DEBUG][resolveContext] BAIL — mode is locked by DOCUMENT_DASHBOARD_CONFIG");
        return;
      }

      const urlId = getUrlFilterByTk();
      console.log("[DEBUG][resolveContext] extracted urlId:", urlId);

      if (!urlId) {
        console.log("[DEBUG][resolveContext] BAIL — no urlId found (no filterbytk in URL and no ctx.filterByTk)");
        return;
      }
      if (resolvedContext.mode !== "global") {
        console.log("[DEBUG][resolveContext] BAIL — mode is already", resolvedContext.mode, "(not global), skip re-resolve");
        return;
      }

      try {
        const id = extractId(urlId);
        console.log("[DEBUG][resolveContext] querying all collections for id:", id);

        // Query NocoBase REST API in parallel using list and eq filters to avoid throwing 404
        const [projRes, custRes, quotRes, contRes, taskRes, projectInternalRes, legalReferenceRec] = await Promise.all([
          ctx.api.request({ url: "projects:list", params: { pageSize: 1, filter: JSON.stringify({ id: { $eq: id } }) } }).catch((e) => { console.warn("[DEBUG] projects:list error", e); return null; }),
          ctx.api.request({ url: "customers:list", params: { pageSize: 1, filter: JSON.stringify({ id: { $eq: id } }) } }).catch((e) => { console.warn("[DEBUG] customers:list error", e); return null; }),
          ctx.api.request({ url: "quotations:list", params: { pageSize: 1, filter: JSON.stringify({ id: { $eq: id } }) } }).catch((e) => { console.warn("[DEBUG] quotations:list error", e); return null; }),
          ctx.api.request({ url: "contracts:list", params: { pageSize: 1, filter: JSON.stringify({ id: { $eq: id } }) } }).catch((e) => { console.warn("[DEBUG] contracts:list error", e); return null; }),
          ctx.api.request({ url: "tasks:list", params: { pageSize: 1, filter: JSON.stringify({ id: { $eq: id } }) } }).catch((e) => { console.warn("[DEBUG] tasks:list error", e); return null; }),
          ctx.api.request({ url: "projectInternal:list", params: { pageSize: 1, filter: JSON.stringify({ id: { $eq: id } }) } }).catch((e) => { console.warn("[DEBUG] projectInternal:list error", e); return null; }),
          fetchLegalReferenceRecordById(id).catch((e) => { console.warn("[DEBUG] legalReference:list error", e); return null; }),
        ]);

        console.log("[DEBUG][resolveContext] API results:",
          "projects hit:", !!(projRes?.data?.data?.[0]),
          "| customers hit:", !!(custRes?.data?.data?.[0]),
          "| quotations hit:", !!(quotRes?.data?.data?.[0]),
          "| contracts hit:", !!(contRes?.data?.data?.[0]),
          "| tasks hit:", !!(taskRes?.data?.data?.[0]),
          "| projectInternal hit:", !!(projectInternalRes?.data?.data?.[0]),
          "| legalReference hit:", !!legalReferenceRec
        );
        console.log("[DEBUG][resolveContext] raw projRes:", projRes?.data?.data);
        console.log("[DEBUG][resolveContext] raw custRes:", custRes?.data?.data);

        let mode = "cases";
        let collection = "Project";
        let recordId = id;
        let customerId = null;
        let projectId = null;
        let projectInternalId = null;
        let internalCompanyId = null;
        let found = false;

        if (legalReferenceRec) {
          const rec = legalReferenceRec;
          mode = "legal_reference";
          collection = "LegalReference";
          internalCompanyId = extractId(rec.internalCompanyId) || extractId(rec.internalCompany);
          found = true;
          console.log("[DEBUG][resolveContext] MATCHED legalReference -> mode=legal_reference, recordId:", id);
        } else if (projectInternalRes?.data?.data?.[0]) {
          const rec = projectInternalRes.data.data[0];
          mode = "project_internal";
          collection = "Project Internal";
          projectInternalId = id;
          internalCompanyId = extractId(rec.internalCompanyId) || extractId(rec.internalCompany);
          found = true;
          console.log("[DEBUG][resolveContext] MATCHED projectInternal -> mode=project_internal, projectInternalId:", projectInternalId);
        } else if (projRes?.data?.data?.[0]) {
          const rec = projRes.data.data[0];
          mode = "cases";
          collection = "Project";
          projectId = id;
          customerId = extractId(rec.customerId) || extractId(rec.customer);
          internalCompanyId = extractId(rec.internalCompanyId) || extractId(rec.internalCompany);
          found = true;
          console.log("[DEBUG][resolveContext] MATCHED projects → mode=cases, projectId:", projectId, "customerId:", customerId);
        } else if (custRes?.data?.data?.[0]) {
          mode = "customers";
          collection = "Customer";
          customerId = id;
          found = true;
          console.log("[DEBUG][resolveContext] MATCHED customers → mode=customers, customerId:", customerId);
        } else if (quotRes?.data?.data?.[0]) {
          const rec = quotRes.data.data[0];
          mode = "quotations";
          collection = "Quotation";
          projectId = extractId(rec.projectId) || extractId(rec.project);
          customerId = extractId(rec.customerId) || extractId(rec.customer);
          found = true;
          console.log("[DEBUG][resolveContext] MATCHED quotations → mode=quotations, projectId:", projectId);
        } else if (contRes?.data?.data?.[0]) {
          const rec = contRes.data.data[0];
          mode = "contracts";
          collection = "Contract";
          projectId = extractId(rec.projectId) || extractId(rec.project);
          customerId = extractId(rec.customerId) || extractId(rec.customer);
          found = true;
          console.log("[DEBUG][resolveContext] MATCHED contracts → mode=contracts, projectId:", projectId);
        } else if (taskRes?.data?.data?.[0]) {
          const rec = taskRes.data.data[0];
          mode = "tasks";
          collection = "Task";
          projectId = extractId(rec.projectId) || extractId(rec.project);
          customerId = extractId(rec.customerId) || extractId(rec.customer);
          found = true;
          console.log("[DEBUG][resolveContext] MATCHED tasks → mode=tasks, projectId:", projectId);
        }

        if (!found) {
          console.warn("[DEBUG][resolveContext] NO collection matched for id:", id, "— context stays global");
        }

        if (found) {
          const newContext = {
            mode,
            modeSource: "auto",
            respectFolderPermissions: resolvedContext.respectFolderPermissions,
            recordId,
            collection,
            customerId,
            projectId,
            projectInternalId,
            internalCompanyId,
            moduleScope:
              mode === "project_internal"
                ? MODULE_SCOPE.PROJECT_INTERNAL
                : MODE_SCOPE[mode] || resolvedContext.moduleScope || MODULE_SCOPE.CASE_DOCUMENT,
          };
          console.log("[DEBUG][resolveContext] setResolvedContext →", JSON.stringify(newContext));
          setResolvedContext(newContext);
          if (internalCompanyId) {
            setFilterInternalCompanyId(String(internalCompanyId));
          }
        }
      } catch (err) {
        console.error("[DEBUG][resolveContext] EXCEPTION:", err);
      }
    };

    resolveContext();
  }, []);
  const {
    companies: internalCompanies,
    loading: loadingCompanies,
  } = useInternalCompanies();
  const loading =
    loadingData || (resolvedContext.respectFolderPermissions ? loadingUser : false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState("root");
  const [expandedFolderKeys, setExpandedFolderKeys] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editFolderData, setEditFolderData] = useState(null);

  const [previewDoc, setPreviewDoc] = useState(null);
  const [detailDoc, setDetailDoc] = useState(null);

  const [editingTitleId, setEditingTitleId] = useState(null);
  const [editingTitleValue, setEditingTitleValue] = useState("");

  const [searchText, setSearchText] = useState("");
  const [filterUploader, setFilterUploader] = useState(null);
  const [filterDateRange, setFilterDateRange] = useState(null);

  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [moveToModalOpen, setMoveToModalOpen] = useState(false);
  const [fileToMove, setFileToMove] = useState(null);
  const [moveToTargetId, setMoveToTargetId] = useState("root");

  const folderInputRef = useRef(null);
  const [pendingFolderFiles, setPendingFolderFiles] = useState(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityTargetRecord, setActivityTargetRecord] = useState(null); // { id, type, name }
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [activeTab, setActiveTab] = useState("list");
  const [legalMoveOpen, setLegalMoveOpen] = useState(false);
  const [legalMoveDoc, setLegalMoveDoc] = useState(null);
  const [legalMoveCompanyId, setLegalMoveCompanyId] = useState(
    filterInternalCompanyId || null,
  );
  const [legalMoveTargetFolderId, setLegalMoveTargetFolderId] =
    useState("root");
  const [legalReferenceFolders, setLegalReferenceFolders] = useState([]);
  const [legalReferences, setLegalReferences] = useState([]);
  const [loadingLegalReferences, setLoadingLegalReferences] = useState(false);
  const [legalMoveReferenceId, setLegalMoveReferenceId] = useState(null);
  const [legalMoveLoading, setLegalMoveLoading] = useState(false);
  const [companyCountDocs, setCompanyCountDocs] = useState([]);

  const activeDashboardMode = normalizeDashboardMode(resolvedContext.mode);
  const activeModuleScope = normalizeModuleScopeValue(
    resolvedContext.moduleScope ||
    MODE_SCOPE[activeDashboardMode] ||
    MODULE_SCOPE.CASE_DOCUMENT,
  );
  const showInternalCompanyFilter = [
    MODULE_SCOPE.INTERNAL_TEMPLATE,
    MODULE_SCOPE.LEGAL_REFERENCE,
  ].includes(activeModuleScope);
  const rawActiveInternalCompanyId =
    extractId(filterInternalCompanyId) || extractId(resolvedContext.internalCompanyId);
  const activeInternalCompanyId =
    showInternalCompanyFilter ? rawActiveInternalCompanyId : null;
  const isCompanyLocked =
    showInternalCompanyFilter && !!resolvedContext.internalCompanyId;
  const isCaseDocumentScope = activeModuleScope === MODULE_SCOPE.CASE_DOCUMENT;
  const isProjectInternalMode = activeDashboardMode === "project_internal";
  const isProjectInternalScope =
    activeModuleScope === MODULE_SCOPE.PROJECT_INTERNAL || isProjectInternalMode;
  const isGlobalOrAutoMode =
    activeDashboardMode === "global" || resolvedContext.modeSource === "auto";
  const showTreeSidebar =
    (isCaseDocumentScope && isGlobalOrAutoMode) && !isProjectInternalScope;

  useEffect(() => {
    setSelectedFolderId("root");
    setExpandedFolderKeys([]);
    setSelectedRowKeys([]);
  }, [
    filterInternalCompanyId,
    resolvedContext.mode,
    resolvedContext.recordId,
    resolvedContext.moduleScope,
  ]);

  useEffect(() => {
    const folderKeys = folders
      .map((folder) => extractId(folder.id))
      .filter(Boolean)
      .map(String);
    const folderKeySet = new Set(folderKeys);
    setExpandedFolderKeys((prev) =>
      prev.filter((key) => folderKeySet.has(String(key))),
    );
    debugDashboard("state:folders changed", {
      mode: resolvedContext.mode,
      count: folders.length,
      rootCount: folders.filter((folder) => !extractId(folder.parentId)).length,
      firstThree: folders.slice(0, 3).map(debugRecordSnapshot),
      expandedKeysCount: expandedFolderKeys.length,
    });
  }, [folders, resolvedContext.mode, expandedFolderKeys.length]);

  useEffect(() => {
    if (!showInternalCompanyFilter) {
      setCompanyCountDocs([]);
      return;
    }
    let cancelled = false;
    const fetchCounts = async () => {
      try {
        const res = await ctx.api.request({
          url: "documents:list",
          params: withDocumentSafeFields({
            pageSize: 2000,
            filter: JSON.stringify(
              addScopeFilters({}, activeModuleScope, null),
            ),
          }),
        });
        if (!cancelled) setCompanyCountDocs(res?.data?.data || []);
      } catch {
        if (!cancelled) setCompanyCountDocs([]);
      }
    };
    fetchCounts();
    return () => {
      cancelled = true;
    };
  }, [showInternalCompanyFilter, activeModuleScope]);

  const getRecordByRowKey = useCallback(
    (key) => {
      if (!key) return null;
      if (key.startsWith("folder_")) {
        const id = extractId(key.replace("folder_", ""));
        const folder = folders.find((f) => extractId(f) === id);
        return folder
          ? { ...folder, _type: "folder", _key: `folder_${id}` }
          : null;
      }
      if (key.startsWith("file_")) {
        const id = extractId(key.replace("file_", ""));
        const doc = docs.find((d) => extractId(d) === id);
        return doc ? { ...doc, _type: "file", _key: `file_${id}` } : null;
      }
      return null;
    },
    [folders, docs],
  );

  const canManageRecord = useCallback(
    (record) => {
      if (!record) return false;
      if (record._type === "folder") {
        const perms = getFolderPermissions(
          record,
          currentUser,
          folders,
          currentLawyerId,
        );
        return !record._navOnly && perms.isManager;
      }

      const folder = folders.find(
        (f) => String(extractId(f)) === String(extractId(record.folderId)),
      );
      return canManageFile(record, folder, currentUser, folders, currentLawyerId);
    },
    [currentUser, currentLawyerId, folders],
  );

  const handleBulkDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    const selectedRecords = selectedRowKeys
      .map(getRecordByRowKey)
      .filter(Boolean);
    if (selectedRecords.some((record) => !canManageRecord(record))) {
      message.warning("Bạn không có quyền thao tác với một số mục đã chọn");
      return;
    }
    try {
      const affectedFileFolderIds = new Set();
      const trackFileFolder = (folderId) => {
        affectedFileFolderIds.add(normalizeFileParentId(folderId) ?? "root");
      };
      const deletePromises = selectedRowKeys.map((key) => {
        if (key.startsWith("folder_")) {
          const fid = key.replace("folder_", "");
          return ctx.api.request({
            url: `folders:destroy?filterByTk=${fid}`,
            method: "POST",
          });
        } else {
          const fid = key.replace("file_", "");
          const doc = selectedRecords.find(
            (record) =>
              record._type === "file" && extractId(record) === extractId(fid),
          );
          if (doc) trackFileFolder(doc.folderId);
          return ctx.api.request({
            url: `documents:destroy?filterByTk=${fid}`,
            method: "POST",
          });
        }
      });
      await Promise.all(deletePromises);
      await Promise.all(
        Array.from(affectedFileFolderIds).map((folderId) =>
          reindexFiles(
            folderId === "root" ? null : folderId,
            activeModuleScope,
            activeInternalCompanyId,
          ),
        ),
      );
      message.success("Đã xoá các mục được chọn");
      setSelectedRowKeys([]);
      refetch();
    } catch (e) {
      message.error("Có lỗi xảy ra khi xoá");
    }
  };

  const handleBulkMove = async (targetFolderId) => {
    if (selectedRowKeys.length === 0) return;
    const selectedRecords = selectedRowKeys
      .map(getRecordByRowKey)
      .filter(Boolean);
    if (selectedRecords.some((record) => !canManageRecord(record))) {
      message.warning("Bạn không có quyền thao tác với một số mục đã chọn");
      return;
    }
    try {
      const parentId =
        targetFolderId === "root"
          ? await resolveLogicalParentId(resolvedContext, null)
          : parseInt(targetFolderId, 10);
      const movePromises = [];
      const affectedFileFolderIds = new Set();
      const trackFileFolder = (folderId) => {
        affectedFileFolderIds.add(normalizeFileParentId(folderId) ?? "root");
      };
      let nextFileIndex = null;
      for (const record of selectedRecords) {
        if (record._type === "folder") {
          movePromises.push(
            ctx.api.request({
              url: `folders:update?filterByTk=${extractId(record)}`,
              method: "POST",
              data: { parentId },
            }),
          );
        } else {
          const updateData = { folderId: parentId };
          if (extractId(record.folderId) !== extractId(parentId)) {
            trackFileFolder(record.folderId);
            trackFileFolder(parentId);
            if (nextFileIndex === null) {
              nextFileIndex = await getNextFileIndex(
                parentId,
                activeModuleScope,
                activeInternalCompanyId,
              );
            }
            updateData.fileIndex = nextFileIndex;
            nextFileIndex += 1;
          }
          movePromises.push(
            ctx.api.request({
              url: `documents:update?filterByTk=${extractId(record)}`,
              method: "POST",
              data: updateData,
            }),
          );
        }
      }
      await Promise.all(movePromises);
      await Promise.all(
        Array.from(affectedFileFolderIds).map((folderId) =>
          reindexFiles(
            folderId === "root" ? null : folderId,
            activeModuleScope,
            activeInternalCompanyId,
          ),
        ),
      );
      message.success("Đã di chuyển các mục được chọn");
      setSelectedRowKeys([]);
      setMoveToModalOpen(false);
      refetch();
    } catch (e) {
      message.error("Có lỗi xảy ra khi di chuyển");
    }
  };

  const getDescendantIds = useCallback((parentId, allFolders) => {
    let ids = [parentId];
    const children = allFolders.filter(
      (f) => extractId(f.parentId) === parentId,
    );
    for (const child of children) {
      ids = ids.concat(getDescendantIds(extractId(child), allFolders));
    }
    return ids;
  }, []);

  const handleMoveFile = async (fileId, targetFolderId) => {
    try {
      const fId = extractId(fileId);
      const doc = docs.find((d) => extractId(d.id) === fId);
      const oldFolderId = doc?.folderId;

      const newFolderId =
        targetFolderId === "root"
          ? await resolveLogicalParentId(resolvedContext, null)
          : parseInt(targetFolderId, 10);

      const movedBetweenFolders =
        normalizeFileParentId(oldFolderId) !== normalizeFileParentId(newFolderId);
      const updateData = { folderId: newFolderId };
      if (movedBetweenFolders) {
        updateData.fileIndex = await getNextFileIndex(
          newFolderId,
          activeModuleScope,
          activeInternalCompanyId,
        );
      }

      await ctx.api.request({
        url: `documents:update?filterByTk=${fId}`,
        method: "POST",
        data: updateData,
      });
      if (movedBetweenFolders) {
        await Promise.all([
          reindexFiles(oldFolderId, activeModuleScope, activeInternalCompanyId),
          reindexFiles(newFolderId, activeModuleScope, activeInternalCompanyId),
        ]);
      }

      message.success("Đã di chuyển file");
      refetch();
    } catch (e) {
      message.error("Di chuyển thất bại");
    }
  };

  const handleMoveFileToLegalStudy = async (record) => {
    let legalStudyFolder = folders.find((folder) => {
      const name = String(folder.name || "").trim().toLowerCase();
      const key = String(folder.folderKey || folder.systemKey || "").toLowerCase();
      return (
        name === LEGAL_STUDY_FOLDER_NAME.toLowerCase() ||
        key === "legal_study"
      );
    });
    if (!legalStudyFolder && resolvedContext.projectId) {
      try {
        const res = await ctx.api.request({
          url: "folders:list",
          params: {
            pageSize: 2000,
            filter: JSON.stringify(
              addScopeFilters(
                { projectId: { $eq: extractId(resolvedContext.projectId) } },
                MODULE_SCOPE.CASE_DOCUMENT,
                null,
              ),
            ),
          },
        });
        legalStudyFolder = (res?.data?.data || []).find((folder) => {
          const name = String(folder.name || "").trim().toLowerCase();
          const key = String(
            folder.folderKey || folder.systemKey || "",
          ).toLowerCase();
          return (
            name === LEGAL_STUDY_FOLDER_NAME.toLowerCase() ||
            key === "legal_study"
          );
        });
      } catch { }
    }
    if (!legalStudyFolder) {
      message.warning("Khong tim thay folder Legal Study trong case nay");
      return;
    }
    const targetFolderId = extractId(legalStudyFolder.id);
    const oldFolderId = record.folderId;
    const projectId =
      extractId(resolvedContext.projectId) ||
      (resolvedContext.mode === "cases" ? extractId(resolvedContext.recordId) : null);
    try {
      const fileIndex = await getNextFileIndex(
        targetFolderId,
        MODULE_SCOPE.CASE_DOCUMENT,
        null,
      );
      const updateData = {
        folderId: targetFolderId,
        moduleScope: MODULE_SCOPE.CASE_DOCUMENT,
        fileIndex,
      };
      if (projectId) {
        updateData.collectionName = "Project";
        updateData.recordId = projectId;
      }
      await ctx.api.request({
        url: `documents:update?filterByTk=${extractId(record.id)}`,
        method: "POST",
        data: updateData,
      });
      await Promise.all([
        reindexFiles(oldFolderId, MODULE_SCOPE.CASE_DOCUMENT, null),
        reindexFiles(targetFolderId, MODULE_SCOPE.CASE_DOCUMENT, null),
      ]);
      message.success("Da di chuyen file vao Legal Study");
      refetch();
    } catch {
      message.error("Di chuyen vao Legal Study that bai");
    }
  };

  const fetchLegalReferenceFolders = useCallback(async (companyId) => {
    setLegalMoveLoading(true);
    try {
      const res = await ctx.api.request({
        url: "folders:list",
        params: {
          pageSize: 2000,
          sort: ["createdAt"],
          filter: JSON.stringify(
            addScopeFilters(
              {},
              MODULE_SCOPE.LEGAL_REFERENCE,
              extractId(companyId),
            ),
          ),
        },
      });
      setLegalReferenceFolders(res?.data?.data || []);
    } catch {
      setLegalReferenceFolders([]);
    }
    setLegalMoveLoading(false);
  }, []);

  const fetchLegalReferenceList = useCallback(async (companyId = null) => {
    setLoadingLegalReferences(true);
    try {
      const items = await fetchLegalReferenceRecords(companyId);
      setLegalReferences(items);
      debugDashboard("legalReference:list", {
        companyId,
        count: items.length,
        firstThree: items.slice(0, 3).map(debugRecordSnapshot),
      });
    } catch (e) {
      console.warn("Failed to fetch legal references:", e);
      setLegalReferences([]);
    } finally {
      setLoadingLegalReferences(false);
    }
  }, []);

  useEffect(() => {
    if (!legalMoveOpen) return;
    fetchLegalReferenceFolders(legalMoveCompanyId);
    fetchLegalReferenceList(legalMoveCompanyId);
  }, [
    legalMoveOpen,
    legalMoveCompanyId,
    fetchLegalReferenceFolders,
    fetchLegalReferenceList,
  ]);

  useEffect(() => {
    if (activeModuleScope !== MODULE_SCOPE.LEGAL_REFERENCE) return;
    fetchLegalReferenceList(activeInternalCompanyId);
  }, [
    activeModuleScope,
    activeInternalCompanyId,
    fetchLegalReferenceList,
  ]);

  const openLegalReferenceMove = (record) => {
    const companyId =
      extractId(record.internalCompanyId) ||
      extractId(record.internalCompany) ||
      activeInternalCompanyId;
    setLegalMoveDoc(record);
    setLegalMoveCompanyId(companyId ? String(companyId) : null);
    const currentReferenceId = getDocumentLegalReferenceId(record);
    setLegalMoveReferenceId(
      currentReferenceId ? String(currentReferenceId) : null,
    );
    setLegalMoveTargetFolderId("root");
    setLegalMoveOpen(true);
  };

  const handleMoveFileToLegalReference = async () => {
    if (!legalMoveDoc) return;
    const companyId = extractId(legalMoveCompanyId);
    if (!companyId) {
      message.warning("Vui long chon cong ty noi bo");
      return;
    }

    const targetFolderId =
      legalMoveTargetFolderId === "root"
        ? null
        : extractId(legalMoveTargetFolderId);
    const targetLegalReferenceId = extractId(legalMoveReferenceId);
    const oldFolderId = legalMoveDoc.folderId;
    const oldScope = legalMoveDoc.moduleScope || activeModuleScope;
    const oldCompanyId =
      extractId(legalMoveDoc.internalCompanyId) || activeInternalCompanyId;
    const sourceProjectId =
      extractId(resolvedContext.projectId) ||
      (resolvedContext.mode === "cases" ? extractId(resolvedContext.recordId) : null) ||
      extractId(legalMoveDoc.projectId);
    const sourceTaskId =
      (resolvedContext.mode === "tasks" ? extractId(resolvedContext.recordId) : null) ||
      extractId(legalMoveDoc.taskId);

    setLegalMoveLoading(true);
    try {
      const targetFileIndex = await getNextFileIndex(
        targetFolderId,
        MODULE_SCOPE.LEGAL_REFERENCE,
        companyId,
      );
      const updateData = {
        folderId: targetFolderId,
        moduleScope: MODULE_SCOPE.LEGAL_REFERENCE,
        internalCompanyId: companyId,
        collectionName: null,
        recordId: null,
        fileIndex: targetFileIndex,
        sourceProjectId,
        sourceTaskId,
        sourceCollectionName: resolvedContext.collection,
        sourceRecordId: extractId(resolvedContext.recordId),
        movedToLegalReferenceAt: new Date().toISOString(),
        movedToLegalReferenceById: extractId(currentUser?.id) || null,
      };
      if (targetLegalReferenceId) {
        updateData.legalReferenceId = targetLegalReferenceId;
      }
      await ctx.api.request({
        url: `documents:update?filterByTk=${extractId(legalMoveDoc.id)}`,
        method: "POST",
        data: updateData,
      });
      await Promise.all([
        reindexFiles(oldFolderId, oldScope, oldCompanyId),
        reindexFiles(targetFolderId, MODULE_SCOPE.LEGAL_REFERENCE, companyId),
      ]);
      message.success("Da di chuyen file vao Legal Reference");
      setLegalMoveOpen(false);
      setLegalMoveDoc(null);
      setLegalMoveReferenceId(null);
      refetch();
    } catch {
      message.error("Di chuyen vao Legal Reference that bai");
    }
    setLegalMoveLoading(false);
  };

  const handleSaveInlineTitle = async (fileId, attachmentId) => {
    if (!editingTitleValue.trim()) {
      setEditingTitleId(null);
      return;
    }
    try {
      const safeTitle = editingTitleValue.trim();
      await ctx.api.request({
        url: `documents:update?filterByTk=${fileId}`,
        method: "POST",
        data: { title: safeTitle },
      });
      if (attachmentId) {
        await ctx.api
          .request({
            url: `attachments:update?filterByTk=${attachmentId}`,
            method: "POST",
            data: { title: safeTitle },
          })
          .catch(() => { });
      }
      message.success("Đã cập nhật tiêu đề file");
      refetch();
    } catch (e) {
      message.error("Cập nhật thất bại");
    }
    setEditingTitleId(null);
  };

  const handleMoveFolderToFolder = async (dragId, dropId) => {
    try {
      const dId = extractId(dragId);
      const newParentId =
        dropId === "root"
          ? await resolveLogicalParentId(resolvedContext, null)
          : parseInt(dropId, 10);

      await ctx.api.request({
        url: `folders:update?filterByTk=${dId}`,
        method: "POST",
        data: { parentId: newParentId },
      });

      message.success("Đã di chuyển thư mục");
      refetch();
    } catch (e) {
      message.error("Di chuyển thất bại");
    }
  };

  const handleTreeDrop = async (info) => {
    const dropKey = info.node.key;

    // 1. Kiểm tra xem có phải kéo từ Table vào Tree không
    let dtPayload = null;
    try {
      const dtData = info.event.dataTransfer?.getData("application/json");
      if (dtData) dtPayload = JSON.parse(dtData);
    } catch (e) { }

    if (dtPayload) {
      if (dtPayload.type === "file") {
        await handleMoveFile(dtPayload.id, dropKey);
      } else if (
        dtPayload.type === "folder" &&
        String(dtPayload.id) !== String(dropKey)
      ) {
        await handleMoveFolderToFolder(dtPayload.id, dropKey);
      }
      return;
    }

    // 2. Kéo thả nội bộ trong Tree
    if (!info.dragNode) return;

    const dragKey = info.dragNode.key;
    const dragFolderId = parseInt(dragKey, 10);
    const dropFolderId = parseInt(dropKey, 10);
    let newParentId = null;

    if (info.dropToGap) {
      message.warning("Khong the thay doi STT thu muc");
      return;
    }
    if (dragFolderId === dropFolderId) return;
    newParentId = dropFolderId;

    try {
      // 1. Cập nhật parentId mới cho folder bị kéo
      await ctx.api.request({
        url: `folders:update?filterByTk=${dragFolderId}`,
        method: "POST",
        data: { parentId: newParentId },
      });


      message.success("Đã di chuyển thư mục");
      refetch();
    } catch (e) {
      message.error("Di chuyển thất bại");
    }
  };

  const handleFolderInputTrigger = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setPendingFolderFiles(files);
    setBulkConfirmOpen(true);
    if (e.target) e.target.value = null;
  };

  const executeFolderUpload = async (destinationFolderId) => {
    setBulkConfirmOpen(false);
    setBulkUploading(true);
    setBulkProgress("Đang phân tích cấu trúc thư mục...");

    try {
      const files = pendingFolderFiles;
      const safeUserId = extractId(currentUser);
      const rootParentId =
        destinationFolderId === "root"
          ? await resolveLogicalParentId(resolvedContext, null)
          : parseInt(destinationFolderId, 10);
      const folderIdMap = { "": rootParentId };

      const folderPaths = new Set();
      files.forEach((file) => {
        const parts = file.webkitRelativePath.split("/");
        parts.pop();
        let currentPath = "";
        parts.forEach((part) => {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          folderPaths.add(currentPath);
        });
      });

      const sortedPaths = Array.from(folderPaths).sort(
        (a, b) => a.split("/").length - b.split("/").length,
      );

      setBulkProgress(`Đang khởi tạo ${sortedPaths.length} thư mục...`);
      for (const path of sortedPaths) {
        const parts = path.split("/");
        const folderName = parts.pop();
        const parentPath = parts.join("/");
        const parentId = folderIdMap[parentPath] || null;

        const parentFolder = parentId
          ? folders.find((f) => extractId(f) === parentId)
          : null;
        const folderType = getFolderTypeForContext(
          resolvedContext,
          parentFolder,
        );

        let payload = {
          ...buildFolderPayloadForContext(resolvedContext, {
            activeInternalCompanyId,
            parentFolder,
          }),
          name: folderName,
          type: folderType,
          parentId,
          createdById: safeUserId,
          updatedById: safeUserId,
        };

        const res = await ctx.api.request({
          url: "folders:create",
          method: "POST",
          data: payload,
        });
        folderIdMap[path] = res.data.data.id;
      }

      let uploadedCount = 0;

      // Tự động tính fileIndex theo folder (có cache để tối ưu bulk upload)
      const fileIndexCache = {};
      const getNextFileIndex = async (fId) => {
        if (fileIndexCache[fId] !== undefined) {
          fileIndexCache[fId] += 1;
          return fileIndexCache[fId];
        }
        try {
          const res = await ctx.api.request({
            url: "documents:list",
            params: withDocumentSafeFields({
              pageSize: 2000,
              filter: JSON.stringify(
                addScopeFilters(
                  { folderId: { $eq: fId } },
                  resolvedContext.moduleScope || MODULE_SCOPE.CASE_DOCUMENT,
                  activeInternalCompanyId,
                ),
              ),
              sort: ["-fileIndex", "-createdAt"],
            }),
          });
          const lastDoc = (res?.data?.data || []).find((doc) =>
            matchesModuleScope(
              doc,
              resolvedContext.moduleScope || MODULE_SCOPE.CASE_DOCUMENT,
            ),
          );
          const nextIdx = (lastDoc?.fileIndex || 0) + 1;
          fileIndexCache[fId] = nextIdx;
          return nextIdx;
        } catch (e) {
          return 1;
        }
      };

      for (const file of files) {
        uploadedCount++;
        setBulkProgress(
          `Đang tải lên file ${uploadedCount}/${files.length}...`,
        );

        const parts = file.webkitRelativePath.split("/");
        const fileName = parts.pop();
        const parentPath = parts.join("/");
        const targetFolderId = folderIdMap[parentPath];

        const formData = new window.FormData();
        formData.append("file", file, fileName);

        const uploadRes = await ctx.api.request({
          url: "attachments:create",
          method: "POST",
          data: formData,
          params: { attachmentField: "documents.fileAttachment" },
          headers: { "Content-Type": "multipart/form-data" },
        });

        const targetFileIndex = await getNextFileIndex(targetFolderId);

        const docPayload = {
          ...buildDocumentPayloadForContext(resolvedContext, {
            activeInternalCompanyId,
          }),
          fileIndex: targetFileIndex,
          title: fileName,
          folderId: targetFolderId,
          uploadedById: safeUserId,
          createdById: safeUserId,
          updatedById: safeUserId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fileAttachment: [{ id: uploadRes.data.data.id }],
        };

        await ctx.api.request({
          url: "documents:create",
          method: "POST",
          data: docPayload,
        });
      }

      message.success("Upload thư mục hoàn tất!");
      refetch();
    } catch (err) {
      message.error("Có lỗi xảy ra trong quá trình xử lý!");
    } finally {
      setBulkUploading(false);
      setBulkProgress("");
      setPendingFolderFiles(null);
    }
  };

  const handleMenuClick = (e) => {
    if (
      showInternalCompanyFilter &&
      !activeInternalCompanyId &&
      ["create_folder", "upload_folder"].includes(e.key)
    ) {
      message.warning("Vui long chon cong ty noi bo truoc");
      return;
    }
    if (e.key === "create_folder") {
      setEditFolderData({
        parentId: selectedFolderId === "root" ? null : selectedFolderId,
        raw: folders.find(
          (f) => String(extractId(f)) === String(selectedFolderId),
        ),
      });
      setFolderModalOpen(true);
    } else if (e.key === "permissions") {
      setPermissionsModalOpen(true);
    } else if (e.key === "upload_file") {
      setUploadOpen(true);
    } else if (e.key === "upload_folder") {
      folderInputRef.current?.click();
    }
  };

  const currentFolder =
    selectedFolderId === "root"
      ? null
      : folders.find((f) => extractId(f) === parseInt(selectedFolderId, 10));
  const { isManager, isMember, canEdit } = getFolderPermissions(
    currentFolder,
    currentUser,
    folders,
    currentLawyerId,
  );
  const canUpload = currentFolder ? isManager || canEdit : true;

  const menuItems = [
    isManager && {
      key: "create_folder",
      label: iconLabel(FolderPlusIcon, "Tạo thư mục mới"),
    },
    isManager &&
    currentFolder && {
      key: "permissions",
      label: iconLabel(UsersIcon, "Phân quyền thư mục"),
    },
    canUpload && {
      key: "upload_file",
      label: iconLabel(FileIcon, "Upload File"),
    },
    canUpload && {
      key: "upload_folder",
      label: iconLabel(FolderIcon, "Upload thư mục"),
    },
  ].filter(Boolean);

  const buildTree = useCallback((data, parentId = null) => {
    return data
      .filter((f) => extractId(f.parentId) === parentId)
      .sort(compareCreatedAt)
      .map((f) => {
        return {
          title: React.createElement(
            "div",
            {
              style: {
                wordBreak: "break-word",
                whiteSpace: "normal",
                lineHeight: 1.4,
                padding: "2px 0",
                color: "inherit",
              },
              onDragOver: (e) => {
                e.preventDefault();
                e.currentTarget.style.color = "#1890ff";
              },
              onDragLeave: (e) => {
                e.currentTarget.style.color = "";
              },
              onDrop: (e) => {
                e.currentTarget.style.color = "";
                const dt = e.dataTransfer.getData("application/json");
                if (dt) {
                  try {
                    const parsed = JSON.parse(dt);
                    if (parsed.type === "file") {
                      e.stopPropagation();
                      handleMoveFile(parsed.id, f.id);
                    }
                  } catch (err) { }
                }
              },
            },
            f.name,
          ),
          key: String(extractId(f.id)),
          isLeaf: false,
          selectable: true,
          children: buildTree(data, extractId(f.id)),
          raw: f,
        };
      });
  }, []);

  const treeData = useMemo(() => {
    const folderMap = new Map(permissionFilteredFolders.map((f) => [extractId(f), f]));
    const roots = permissionFilteredFolders
      .filter((f) => {
        const pId = extractId(f.parentId);
        return !pId || !folderMap.has(pId);
      })
      .sort(compareCreatedAt);

    return roots.map((f) => {
      return {
        title: React.createElement(
          "div",
          {
            style: {
              wordBreak: "break-word",
              whiteSpace: "normal",
              lineHeight: 1.4,
              padding: "2px 0",
              color: "inherit",
            },
            onDragOver: (e) => {
              e.preventDefault();
              e.currentTarget.style.color = "#1890ff";
            },
            onDragLeave: (e) => {
              e.currentTarget.style.color = "";
            },
            onDrop: (e) => {
              e.currentTarget.style.color = "";
              const dt = e.dataTransfer.getData("application/json");
              if (dt) {
                try {
                  const parsed = JSON.parse(dt);
                  if (parsed.type === "file") {
                    e.stopPropagation();
                    handleMoveFile(parsed.id, f.id);
                  }
                } catch (err) { }
              }
            },
          },
          f.name,
        ),
        key: String(extractId(f.id)),
        isLeaf: false,
        selectable: true,
        children: buildTree(permissionFilteredFolders, extractId(f.id)),
        raw: f,
      };
    });
  }, [permissionFilteredFolders, buildTree]);

  useEffect(() => {
    debugDashboard("state:treeData changed", {
      mode: resolvedContext.mode,
      foldersCount: folders.length,
      treeRootCount: treeData.length,
      firstRootKeys: treeData.slice(0, 10).map((node) => node.key),
      firstRootNames: treeData.slice(0, 10).map((node) => {
        const raw = node.raw || {};
        return raw.name || raw.title || raw.id;
      }),
      showTreeSidebar,
      loading,
      selectedFolderId,
      expandedFolderKeysCount: expandedFolderKeys.length,
    });
  }, [
    treeData,
    folders.length,
    resolvedContext.mode,
    showTreeSidebar,
    loading,
    selectedFolderId,
    expandedFolderKeys.length,
  ]);

  const uploaderOptions = useMemo(() => {
    const map = new Map();
    const addUploader = (item) => {
      if (item.createdBy) {
        const id = extractId(
          item.createdBy.id || item.createdById || item.createdBy,
        );
        const name =
          getUserName(item.createdBy) || item.createdBy.email || `User ${id}`;
        if (id && !map.has(id)) map.set(id, name);
      }
    };
    folders.forEach(addUploader);
    docs.forEach(addUploader);
    return Array.from(map.entries()).map(([id, name]) => ({
      value: String(id),
      label: name,
    }));
  }, [folders, docs]);

  const breadcrumbs = useMemo(() => {
    const path = [];
    let curr = folders.find(
      (f) => String(extractId(f)) === String(selectedFolderId),
    );
    while (curr) {
      path.unshift({ id: extractId(curr), name: curr.name });
      curr = folders.find(
        (f) => String(extractId(f)) === String(extractId(curr.parentId)),
      );
    }
    return [{ id: "root", name: "Home" }, ...path];
  }, [folders, selectedFolderId]);

  const currentFolderStats = useMemo(() => {
    const folderMap = new Map(folders.map((f) => [extractId(f), f]));
    const isRoot = selectedFolderId === "root";
    const numSelectedId = parseInt(selectedFolderId, 10);

    const fCount = folders.filter((f) => {
      const pId = extractId(f.parentId);
      return isRoot ? !pId || !folderMap.has(pId) : pId === numSelectedId;
    }).length;

    const dCount = docs.filter((d) => {
      const dFId = extractId(d.folderId);
      return isRoot
        ? isDocumentVisibleAtRootForContext(resolvedContext, d, folderMap)
        : dFId === numSelectedId;
    }).length;

    return { folders: fCount, docs: dCount };
  }, [folders, docs, selectedFolderId, resolvedContext]);

  const internalCompanyOptions = useMemo(
    () =>
      internalCompanies.map((company) => ({
        value: String(extractId(company)),
        label: getInternalCompanyName(company),
      })),
    [internalCompanies],
  );

  const legalReferenceOptions = useMemo(
    () =>
      legalReferences.map((reference) => ({
        value: String(extractId(reference)),
        label: getLegalReferenceDisplayName(reference),
      })),
    [legalReferences],
  );

  const internalCompanyFileCounts = useMemo(() => {
    const countMap = new Map();
    const sourceDocs = showInternalCompanyFilter ? companyCountDocs : docs;
    sourceDocs
      .filter((d) => d._type !== "folder")
      .forEach((doc) => {
        const companyId =
          extractId(doc.internalCompanyId) ||
          extractId(doc.internalCompany) ||
          activeInternalCompanyId;
        if (!companyId) return;
        countMap.set(companyId, (countMap.get(companyId) || 0) + 1);
      });

    const preferredCompanies = internalCompanies.filter((company) => {
      const name = getInternalCompanyName(company).toLowerCase();
      return name.includes("cbi") || name.includes("vlic");
    });
    const companiesToShow =
      preferredCompanies.length > 0 ? preferredCompanies : internalCompanies;

    return companiesToShow.map((company) => {
      const id = extractId(company);
      return {
        id,
        name: getInternalCompanyName(company),
        count: countMap.get(id) || 0,
      };
    });
  }, [
    docs,
    companyCountDocs,
    internalCompanies,
    activeInternalCompanyId,
    showInternalCompanyFilter,
  ]);

  const currentPerms = useMemo(() => {
    if (isAdminUser(currentUser))
      return { isManager: true, canEdit: true, roleName: "Quản trị viên" };
    if (selectedFolderId === "root")
      return { isManager: true, canEdit: true, roleName: "Quản lý" };

    const folder = folders.find(
      (f) => String(extractId(f)) === String(selectedFolderId),
    );
    if (!folder)
      return { isManager: false, canEdit: false, roleName: "Chỉ xem" };

    const perms = getFolderPermissions(
      folder,
      currentUser,
      folders,
      currentLawyerId,
    );
    let roleName = "Chỉ xem";
    if (perms.isManager) roleName = "Quản lý";
    else if (perms.canEdit) roleName = "Thao tác";

    return { ...perms, roleName };
  }, [selectedFolderId, folders, currentUser, currentLawyerId]);

  const getFolderSize = useCallback(
    (folderId) => {
      const descIds = getDescendantIds(folderId, folders);
      const filesInFolder = docs.filter((d) =>
        descIds.includes(extractId(d.folderId)),
      );
      let totalSize = 0;
      filesInFolder.forEach((d) => {
        const att = Array.isArray(d.fileAttachment)
          ? d.fileAttachment[0]
          : d.fileAttachment;
        if (att && att.size) totalSize += parseInt(att.size, 10);
      });
      return totalSize;
    },
    [folders, docs, getDescendantIds],
  );

  const isFiltering =
    searchText ||
    filterUploader ||
    (filterDateRange && filterDateRange[0] && filterDateRange[1]);

  const getFolderPath = useCallback(
    (pId) => {
      if (!pId || pId === "root") return "";
      const path = [];
      let curr = folders.find((f) => String(extractId(f)) === String(pId));
      while (curr) {
        path.unshift(curr.name);
        curr = folders.find(
          (f) => String(extractId(f)) === String(extractId(curr.parentId)),
        );
      }
      return path.join(" / ");
    },
    [folders],
  );

  const tableData = useMemo(() => {
    const folderMap = new Map(permissionFilteredFolders.map((f) => [extractId(f), f]));
    const isRoot = selectedFolderId === "root";
    const numSelectedId = parseInt(selectedFolderId, 10);

    let filteredFolders = [];
    let filteredDocs = [];
    const sortFilesForDisplay = (items) =>
      [...items].sort((a, b) => {
        const ai = Number(a.fileIndex) || 0;
        const bi = Number(b.fileIndex) || 0;
        if (ai && bi && ai !== bi) return ai - bi;
        if (ai && !bi) return -1;
        if (!ai && bi) return 1;
        return compareCreatedAt(a, b);
      });
    const withDisplayFileIndex = (items) =>
      sortFilesForDisplay(items).map((d, idx) => ({
        ...d,
        _type: "file",
        _key: `file_${extractId(d)}`,
        _displayFileIndex: idx + 1,
      }));

    if (isFiltering) {
      let allowedFolderIds = [];
      if (!isRoot) {
        allowedFolderIds = getDescendantIds(numSelectedId, permissionFilteredFolders);
      }

      filteredFolders = permissionFilteredFolders
        .filter((f) => {
          if (isRoot) return true;
          const fid = extractId(f);
          return allowedFolderIds.includes(fid) && fid !== numSelectedId;
        })
        .map((f) => ({
          ...f,
          _type: "folder",
          _key: `folder_${extractId(f)}`,
        }));

      filteredDocs = docs
        .filter((d) => {
          if (isRoot) return true;
          return allowedFolderIds.includes(extractId(d.folderId));
        });

      if (searchText) {
        const lowerSearch = searchText.toLowerCase();
        filteredFolders = filteredFolders.filter((f) =>
          f.name?.toLowerCase().includes(lowerSearch),
        );
        filteredDocs = filteredDocs.filter((d) => {
          const attachment = Array.isArray(d.fileAttachment)
            ? d.fileAttachment[0]
            : d.fileAttachment;
          const originalName = d.title || attachment?.filename || "File";
          const content = [
            d.documentType,
            d.documentCode,
            d.senderName,
            d.recipientName,
            d.description,
            d.language,
            d.docFormat,
            d.note,
          ]
            .map((v) => (v || "").toLowerCase())
            .join(" ");

          return (
            originalName.toLowerCase().includes(lowerSearch) ||
            content.includes(lowerSearch)
          );
        });
      }

      if (filterUploader) {
        filteredFolders = filteredFolders.filter(
          (f) =>
            String(extractId(f.createdById)) === filterUploader ||
            String(f.createdBy?.id) === filterUploader,
        );
        filteredDocs = filteredDocs.filter(
          (d) =>
            String(extractId(d.createdById)) === filterUploader ||
            String(d.createdBy?.id) === filterUploader,
        );
      }

      if (filterDateRange && filterDateRange[0] && filterDateRange[1]) {
        const start = new Date(filterDateRange[0]).setHours(0, 0, 0, 0);
        const end = new Date(filterDateRange[1]).setHours(23, 59, 59, 999);

        filteredFolders = filteredFolders.filter((f) => {
          const t = new Date(f.createdAt).getTime();
          return t >= start && t <= end;
        });
        filteredDocs = filteredDocs.filter((d) => {
          const t = new Date(d.createdAt).getTime();
          return t >= start && t <= end;
        });
      }
      filteredDocs = withDisplayFileIndex(filteredDocs);
    } else {
      filteredFolders = permissionFilteredFolders
        .filter((f) => {
          const pId = extractId(f.parentId);
          return isRoot ? !pId || !folderMap.has(pId) : pId === numSelectedId;
        })
        .sort(compareCreatedAt)
        .map((f) => ({
          ...f,
          _type: "folder",
          _key: `folder_${extractId(f)}`,
        }));

      filteredDocs = docs
        .filter((d) => {
          const dFId = extractId(d.folderId);
          return isRoot
            ? isDocumentVisibleAtRootForContext(resolvedContext, d, folderMap)
            : dFId === numSelectedId;
        });
      filteredDocs = withDisplayFileIndex(filteredDocs);
    }

    return [...filteredFolders, ...filteredDocs];
  }, [
    permissionFilteredFolders,
    docs,
    selectedFolderId,
    isFiltering,
    searchText,
    filterUploader,
    filterDateRange,
    getDescendantIds,
    resolvedContext,
  ]);

  useEffect(() => {
    debugDashboard("state:tableData changed", {
      mode: resolvedContext.mode,
      selectedFolderId,
      isFiltering: !!isFiltering,
      foldersCount: folders.length,
      docsCount: docs.length,
      tableCount: tableData.length,
      firstRows: tableData.slice(0, 5).map(debugRecordSnapshot),
    });
  }, [
    tableData,
    resolvedContext.mode,
    selectedFolderId,
    isFiltering,
    folders.length,
    docs.length,
  ]);

  const moveTargetFolders = useMemo(() => {
    const movingRecords = fileToMove
      ? [fileToMove]
      : selectedRowKeys.map(getRecordByRowKey).filter(Boolean);
    const excludedFolderIds = new Set();

    movingRecords.forEach((record) => {
      if (record?._type !== "folder") return;
      const folderId = extractId(record.id || record);
      if (!folderId) return;
      getDescendantIds(folderId, folders).forEach((id) =>
        excludedFolderIds.add(String(id)),
      );
    });

    const renderedFolders = tableData
      .filter((record) => record._type === "folder" && !record._navOnly)
      .filter((record) => !excludedFolderIds.has(String(extractId(record.id || record))));
    const renderedIds = new Set(
      renderedFolders.map((folder) => String(extractId(folder.id || folder))),
    );

    return renderedFolders.map((folder) => {
      const parentId = extractId(folder.parentId);
      return parentId && renderedIds.has(String(parentId))
        ? folder
        : { ...folder, parentId: null };
    });
  }, [
    fileToMove,
    selectedRowKeys,
    getRecordByRowKey,
    tableData,
    getDescendantIds,
    folders,
  ]);

  const openFolderFromNameColumn = (record) => {
    if (!record) return;
    if (record._navOnly) {
      message.warning("Bạn không có quyền truy cập thư mục này");
      return;
    }
    if (isFiltering) {
      setSearchText("");
      setFilterUploader(null);
      setFilterDateRange(null);
    }
    setSelectedFolderId(String(extractId(record)));
  };

  const openFolderDetailFromNameColumn = (record, event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!record) return;
    if (record._navOnly) {
      message.warning("Bạn không có quyền truy cập thư mục này");
      return;
    }
    const { isManager: folderIsManager } = getFolderPermissions(
      record,
      currentUser,
      folders,
      currentLawyerId,
    );
    if (!folderIsManager) {
      message.warning("Bạn không có quyền phân quyền thư mục này");
      return;
    }
    setEditFolderData(record);
    setFolderModalOpen(true);
  };

  const getFileDisplayName = (record) => {
    const attachment = Array.isArray(record?.fileAttachment)
      ? record.fileAttachment[0]
      : record?.fileAttachment;
    return record?.title || attachment?.title || attachment?.filename || "Tài liệu";
  };

  const openMoveFromNameColumn = (record, event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!record) return;

    if (record._type === "folder") {
      if (record._navOnly) {
        message.warning("Bạn không có quyền truy cập thư mục này");
        return;
      }
      const { isManager: folderIsManager } = getFolderPermissions(
        record,
        currentUser,
        folders,
        currentLawyerId,
      );
      if (!folderIsManager) {
        message.warning("Bạn không có quyền di chuyển thư mục này");
        return;
      }
    } else {
      const folder = folders.find(
        (f) => String(extractId(f)) === String(extractId(record.folderId)),
      );
      if (!canManageFile(record, folder, currentUser, folders, currentLawyerId)) {
        message.warning("Bạn không có quyền di chuyển file này");
        return;
      }
    }

    setFileToMove(record);
    setMoveToTargetId("root");
    setMoveToModalOpen(true);
  };

  const openActivityFromNameColumn = (record, event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!record) return;
    if (!isAdminUser(currentUser)) {
      message.warning("Bạn không có quyền xem lịch sử hoạt động");
      return;
    }

    const isFolderRecord = record._type === "folder";
    setActivityTargetRecord({
      id: extractId(record.id || record),
      type: isFolderRecord ? "Folder" : "Document",
      name: isFolderRecord ? record.name : getFileDisplayName(record),
    });
    setActivityModalOpen(true);
  };

  const getFolderNameContextMenu = (record) => {
    const { isManager: folderIsManager } = getFolderPermissions(
      record,
      currentUser,
      folders,
      currentLawyerId,
    );
    const canManageFolder = !record._navOnly && folderIsManager;
    return {
      items: [
        {
          key: "open",
          label: iconLabel(FolderOpenIcon, "Mở thư mục"),
          disabled: !!record._navOnly,
        },
        canManageFolder
          ? {
            key: "detail",
            label: iconLabel(UsersIcon, "Chi tiết / phân quyền"),
          }
          : {
            key: "detail_disabled",
            label: iconLabel(UsersIcon, "Không có quyền phân quyền"),
            disabled: true,
          },
        canManageFolder
          ? {
            key: "move",
            label: iconLabel(MoveIcon, "Di chuyển thư mục"),
          }
          : {
            key: "move_disabled",
            label: iconLabel(MoveIcon, "Không có quyền di chuyển"),
            disabled: true,
          },
        canManageFolder
          ? {
            key: "delete",
            label: iconLabel(DeleteIcon, "Xóa thư mục"),
            danger: true,
          }
          : {
            key: "delete_disabled",
            label: iconLabel(DeleteIcon, "Không có quyền xóa"),
            disabled: true,
          },
        isAdminUser(currentUser)
          ? {
            key: "activity",
            label: iconLabel(HistoryIcon, "Lịch sử hoạt động"),
          }
          : {
            key: "activity_disabled",
            label: iconLabel(HistoryIcon, "Không có quyền xem lịch sử"),
            disabled: true,
          },
      ],
      onClick: ({ key, domEvent }) => {
        domEvent?.stopPropagation?.();
        if (key === "open") openFolderFromNameColumn(record);
        if (key === "detail") openFolderDetailFromNameColumn(record, domEvent);
        if (key === "move") openMoveFromNameColumn(record, domEvent);
        if (key === "delete") showDeleteConfirm(record);
        if (key === "activity") openActivityFromNameColumn(record, domEvent);
      },
    };
  };

  const getFileNameContextMenu = (record, fileCanManage) => {
    const attachment = Array.isArray(record.fileAttachment)
      ? record.fileAttachment[0]
      : record.fileAttachment;
    const fullUrl = getFullUrl(attachment?.url || attachment?.preview);
    return {
      items: [
        {
          key: "preview",
          label: iconLabel(EyeIcon, "Xem trước"),
        },
        fullUrl && {
          key: "download",
          label: iconLabel(DownloadIcon, "Tải về"),
        },
        fileCanManage
          ? {
            key: "detail",
            label: iconLabel(EditIcon, "Chi tiết / chỉnh sửa"),
          }
          : {
            key: "detail_disabled",
            label: iconLabel(EditIcon, "Không có quyền chỉnh sửa"),
            disabled: true,
          },
        fileCanManage
          ? {
            key: "move",
            label: iconLabel(MoveIcon, "Di chuyển file"),
          }
          : {
            key: "move_disabled",
            label: iconLabel(MoveIcon, "Không có quyền di chuyển"),
            disabled: true,
          },
        fileCanManage && isCaseDocumentScope
          ? {
            key: "move_legal_study",
            label: iconLabel(FolderOpenIcon, "Move to Legal Study"),
          }
          : null,
        fileCanManage && isCaseDocumentScope
          ? {
            key: "move_legal_reference",
            label: iconLabel(FolderOpenIcon, "Move to Legal Reference"),
          }
          : null,
        fileCanManage
          ? {
            key: "delete",
            label: iconLabel(DeleteIcon, "Xóa file"),
            danger: true,
          }
          : {
            key: "delete_disabled",
            label: iconLabel(DeleteIcon, "Không có quyền xóa"),
            disabled: true,
          },
        isAdminUser(currentUser)
          ? {
            key: "activity",
            label: iconLabel(HistoryIcon, "Lịch sử hoạt động"),
          }
          : {
            key: "activity_disabled",
            label: iconLabel(HistoryIcon, "Không có quyền xem lịch sử"),
            disabled: true,
          },
      ].filter(Boolean),
      onClick: ({ key, domEvent }) => {
        domEvent?.stopPropagation?.();
        if (key === "preview") setPreviewDoc(record);
        if (key === "download" && fullUrl) window.open(fullUrl, "_blank");
        if (key === "detail") setDetailDoc(record);
        if (key === "move") openMoveFromNameColumn(record, domEvent);
        if (key === "move_legal_study") handleMoveFileToLegalStudy(record);
        if (key === "move_legal_reference") openLegalReferenceMove(record);
        if (key === "delete") {
          Modal.confirm({
            title: "Xóa file này?",
            okText: "Xóa",
            okType: "danger",
            cancelText: "Hủy",
            onOk: () => handleDeleteFile(record.id),
          });
        }
        if (key === "activity") openActivityFromNameColumn(record, domEvent);
      },
    };
  };

  const renderNameActionButton = (menu) =>
    React.createElement(
      Dropdown,
      {
        menu,
        trigger: ["click"],
      },
      React.createElement(
        Button,
        {
          type: "text",
          size: "small",
          title: "Thao tác",
          onMouseDown: (event) => event.stopPropagation(),
          onClick: (event) => event.stopPropagation(),
          style: {
            width: 24,
            minWidth: 24,
            height: 24,
            padding: 0,
            color: "#8c8c8c",
            flexShrink: 0,
            lineHeight: "22px",
          },
        },
        MoreIcon,
      ),
    );

  const showDeleteConfirm = (folder) => {
    const fId = extractId(folder);
    const folderIdsToDelete = getDescendantIds(fId, folders);
    const filesCount = docs.filter((d) =>
      folderIdsToDelete.includes(extractId(d.folderId)),
    ).length;
    const subFoldersCount = folderIdsToDelete.length - 1;

    let contentElements = [];
    if (subFoldersCount > 0)
      contentElements.push(`- ${subFoldersCount} thư mục con`);
    if (filesCount > 0) contentElements.push(`- ${filesCount} tệp tin`);

    Modal.confirm({
      title: `Xác nhận xóa thư mục "${folder.name}"?`,
      icon: React.createElement(
        "span",
        { style: { color: "#faad14", marginRight: 16 } },
        WarningIcon,
      ),
      content: React.createElement(
        "div",
        { style: { fontFamily: FONT, marginTop: 8 } },
        React.createElement(
          "p",
          null,
          "Bạn sắp xóa vĩnh viễn thư mục này. Các dữ liệu sau cũng sẽ bị xóa theo:",
        ),
        contentElements.length > 0
          ? React.createElement(
            "div",
            {
              style: {
                padding: "8px 12px",
                background: "#fff1f0",
                border: "1px solid #ffa39e",
                borderRadius: 6,
                color: "#cf1322",
                fontWeight: 600,
                marginTop: 8,
                marginBottom: 12,
              },
            },
            contentElements.map((item, idx) =>
              React.createElement("div", { key: idx }, item),
            ),
          )
          : React.createElement(
            "p",
            { style: { color: "#8c8c8c", fontStyle: "italic" } },
            "(Thư mục đang trống)",
          ),
        React.createElement(
          "p",
          null,
          "Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa?",
        ),
      ),
      okText: "Xóa vĩnh viễn",
      okType: "danger",
      cancelText: "Hủy",
      onOk: () => handleDeleteFolder(folderIdsToDelete),
    });
  };

  const handleDeleteFolder = async (folderIdsToDelete) => {
    try {
      if (folderIdsToDelete.length > 0) {
        await ctx.api.request({
          url: "documents:destroy",
          method: "POST",
          params: {
            filter: JSON.stringify({ folderId: { $in: folderIdsToDelete } }),
          },
        });
        await ctx.api.request({
          url: "folders:destroy",
          method: "POST",
          params: {
            filter: JSON.stringify({ id: { $in: folderIdsToDelete } }),
          },
        });
        await ctx.api
          .request({
            url: "folderManagers:destroy",
            method: "POST",
            params: {
              filter: JSON.stringify({ folderId: { $in: folderIdsToDelete } }),
            },
          })
          .catch(() => { });
        await ctx.api
          .request({
            url: "folderMembers:destroy",
            method: "POST",
            params: {
              filter: JSON.stringify({ folderId: { $in: folderIdsToDelete } }),
            },
          })
          .catch(() => { });
      }
      message.success("Đã xóa thành công thư mục và các dữ liệu bên trong");
      if (
        selectedFolderId !== "root" &&
        folderIdsToDelete.includes(parseInt(selectedFolderId, 10))
      )
        setSelectedFolderId("root");
      refetch();
    } catch (e) {
      message.error("Xóa thất bại");
    }
  };

  const handleDeleteFile = async (id) => {
    const safeId = extractId(id);
    const doc = docs.find((d) => extractId(d.id) === safeId);
    try {
      await ctx.api.request({
        url: `documents:destroy?filterByTk=${safeId}`,
        method: "POST",
      });
      if (doc)
        await reindexFiles(
          doc.folderId,
          doc.moduleScope || activeModuleScope,
          doc.internalCompanyId || activeInternalCompanyId,
        );
      message.success("Đã xóa file");
      refetch();
    } catch {
      message.error("Xóa thất bại");
    }
  };

  const baseColumns = [
    {
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        "STT",
      ),
      key: "stt",
      width: 50,
      align: "center",
      fixed: "left",
      sorter: (a, b) => {
        const indexA =
          a._type === "file" ? a._displayFileIndex || a.fileIndex : 0;
        const indexB =
          b._type === "file" ? b._displayFileIndex || b.fileIndex : 0;
        return (indexA || 0) - (indexB || 0);
      },
      render: (_, record) => {
        return React.createElement(
          Text,
          {
            style: {
              fontSize: 12,
              color: "#8c8c8c",
              fontFamily: FONT,
              fontWeight: 600,
            },
          },
          record._type === "file" &&
            (record._displayFileIndex || record.fileIndex)
            ? record._displayFileIndex || record.fileIndex
            : "—",
        );
      },
    },
    {
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        "Ngày ban hành",
      ),
      key: "openingDate",
      width: 120,
      align: "center",
      sorter: (a, b) => {
        const da = a.openingDate ? new Date(a.openingDate).getTime() : 0;
        const db = b.openingDate ? new Date(b.openingDate).getTime() : 0;
        return da - db;
      },
      render: (_, record) => {
        if (record._type === "folder")
          return React.createElement(
            Text,
            { style: { color: "#bfbfbf" } },
            "—",
          );
        return React.createElement(
          Text,
          { style: { fontSize: 12, color: "#595959", fontFamily: FONT } },
          record.openingDate ? formatDate(record.openingDate) : "—",
        );
      },
    },
    {
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        "Loại văn bản",
      ),
      key: "documentType",
      width: 140,
      render: (_, record) => {
        if (record._type === "folder")
          return React.createElement(
            Text,
            { style: { color: "#bfbfbf" } },
            "—",
          );
        return React.createElement(TruncatedText, {
          value: record.documentType,
          keyword: searchText,
          maxLen: 18,
        });
      },
    },
    {
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        "Tên / Tiêu đề",
      ),
      key: "name",
      width: 300,
      render: (_, record) => {
        if (record._type === "folder") {
          const rawLocationPath = isFiltering
            ? getFolderPath(extractId(record.parentId))
            : null;
          const { isManager: folderIsManager } = getFolderPermissions(
            record,
            currentUser,
            folders,
            currentLawyerId,
          );
          const canOpenFolderDetail = !record._navOnly && folderIsManager;
          const folderNameMenu = getFolderNameContextMenu(record);

          const folderCell = React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                cursor: "default",
                width: "100%",
                padding: "4px 0",
                opacity: record._navOnly ? 0.6 : 1,
              },
            },
            React.createElement(
              "span",
              {
                title: "Mở thư mục",
                style: {
                  color: record._navOnly ? "#8c8c8c" : "#8c6d1f",
                  cursor: record._navOnly ? "not-allowed" : "pointer",
                  lineHeight: 1.4,
                  display: "inline-flex",
                  alignItems: "center",
                  paddingTop: 2,
                },
                title: canOpenFolderDetail
                  ? "Folder detail / permissions"
                  : "No permission to open folder detail",
                onClick: (event) => {
                  event.stopPropagation();
                  openFolderDetailFromNameColumn(record, event);
                },
              },
              record._navOnly ? LockIcon : FolderIcon,
            ),
            React.createElement(
              "div",
              { style: { flex: 1, minWidth: 0 } },
              React.createElement(
                Tooltip,
                {
                  title: canOpenFolderDetail
                    ? "Click để mở chi tiết / phân quyền"
                    : record._navOnly
                      ? "Bạn không có quyền truy cập thư mục"
                      : "Click để mở thư mục",
                },
                React.createElement(
                  "div",
                  {
                    onClick: (event) => {
                      event.stopPropagation();
                      openFolderFromNameColumn(record);
                    },
                    style: {
                      fontWeight: 600,
                      color: record._navOnly ? "#595959" : "#262626",
                      fontFamily: FONT,
                      wordBreak: "break-word",
                      whiteSpace: "normal",
                      lineHeight: 1.4,
                      cursor: record._navOnly ? "not-allowed" : "pointer",
                    },
                  },
                  highlightText(record.name, searchText),
                ),
              ),
              rawLocationPath &&
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 11,
                    color: "#8c8c8c",
                    marginTop: 2,
                    fontFamily: FONT,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  },
                },
                rawLocationPath,
              ),
            ),
            renderNameActionButton(folderNameMenu),
          );
          return React.createElement(
            Dropdown,
            {
              trigger: ["contextMenu"],
              menu: folderNameMenu,
            },
            folderCell,
          );
        } else {
          const attachment = Array.isArray(record.fileAttachment)
            ? record.fileAttachment[0]
            : record.fileAttachment;
          const ext = attachment?.extname
            ? attachment.extname.startsWith(".")
              ? attachment.extname.toLowerCase()
              : "." + attachment.extname.toLowerCase()
            : "";
          const originalName =
            record.title || attachment?.title || attachment?.filename || "File";
          const extInfo = getExtInfo(ext);

          const rawLocationPath = isFiltering
            ? getFolderPath(extractId(record.folderId))
            : null;

          const folder = folders.find(
            (f) => String(extractId(f)) === String(extractId(record.folderId)),
          );
          const fileCanManage = canManageFile(
            record,
            folder,
            currentUser,
            folders,
            currentLawyerId,
          );
          const isEditingTitle = editingTitleId === record.id;
          const fileNameMenu = getFileNameContextMenu(record, fileCanManage);

          const fileCell = React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 12,
                width: "100%",
                padding: "4px 0",
              },
            },
            React.createElement(
              "div",
              {
                style: {
                  minWidth: 32,
                  height: 32,
                  borderRadius: 4,
                  background: extInfo.bg,
                  border: `1px solid ${extInfo.color}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: extInfo.color,
                  flexShrink: 0,
                  marginTop: 2,
                  cursor: "pointer",
                },
                onClick: () => setPreviewDoc(record),
              },
              ext === ".html" || ext === ".htm"
                ? "FILE"
                : ext.replace(".", "").toUpperCase().slice(0, 4) || "FILE",
            ),
            React.createElement(
              "div",
              { style: { flex: 1, minWidth: 0 } },
              isEditingTitle
                ? React.createElement(
                  "div",
                  {
                    style: { display: "flex", gap: 4, alignItems: "center" },
                  },
                  React.createElement(Input, {
                    value: editingTitleValue,
                    onChange: (e) => setEditingTitleValue(e.target.value),
                    onPressEnter: () =>
                      handleSaveInlineTitle(record.id, attachment?.id),
                    autoFocus: true,
                    size: "small",
                  }),
                  React.createElement(
                    Button,
                    {
                      type: "text",
                      size: "small",
                      style: {
                        color: "#52c41a",
                        minWidth: 24,
                        height: 24,
                        padding: 0,
                      },
                      onClick: () =>
                        handleSaveInlineTitle(record.id, attachment?.id),
                    },
                    CheckIcon,
                  ),
                  React.createElement(
                    Button,
                    {
                      type: "text",
                      size: "small",
                      danger: true,
                      style: { minWidth: 24, height: 24, padding: 0 },
                      onClick: () => setEditingTitleId(null),
                    },
                    CloseIcon,
                  ),
                )
                : React.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                    },
                  },
                  React.createElement(
                    "div",
                    {
                      onClick: () => setPreviewDoc(record),
                      style: {
                        color: "#1890ff",
                        fontFamily: FONT,
                        fontWeight: 500,
                        wordBreak: "break-word",
                        whiteSpace: "normal",
                        lineHeight: 1.4,
                        cursor: "pointer",
                      },
                    },
                    highlightText(originalName, searchText),
                  ),
                  fileCanManage &&
                  React.createElement(
                    Button,
                    {
                      type: "text",
                      size: "small",
                      onClick: (e) => {
                        e.stopPropagation();
                        setEditingTitleId(record.id);
                        setEditingTitleValue(
                          record.title ||
                          attachment?.title ||
                          attachment?.filename ||
                          "",
                        );
                      },
                      style: {
                        color: "#8c8c8c",
                        padding: "0 4px",
                        height: 20,
                      },
                    },
                    EditIcon,
                  ),
                ),
              rawLocationPath &&
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 11,
                    color: "#8c8c8c",
                    marginTop: 2,
                    fontFamily: FONT,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  },
                },
                rawLocationPath,
              ),
            ),
            renderNameActionButton(fileNameMenu),
          );
          return React.createElement(
            Dropdown,
            {
              trigger: ["contextMenu"],
              menu: fileNameMenu,
            },
            fileCell,
          );
        }
      },
    },
    {
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        "Người quản lý",
      ),
      key: "folderManagers",
      width: 140,
      render: (_, record) => {
        if (record._type !== "folder")
          return React.createElement(
            Text,
            { style: { color: "#bfbfbf" } },
            "—",
          );
        const managers = getFolderManagerRows(record);
        const createdByUserId = extractId(record.createdById || record.createdBy);
        const createdByLawyer = lawyerByUserId.get(createdByUserId);
        const fallbackManager =
          createdByLawyer ||
          (createdByUserId === extractId(currentUser?.id)
            ? currentLawyer
            : null) ||
          record.createdBy;
        const displayManagers = managers.length
          ? managers
          : asArray(fallbackManager);
        if (!displayManagers.length)
          return React.createElement(
            Text,
            { style: { color: "#bfbfbf", fontSize: 12 } },
            "—",
          );
        return React.createElement(
          "div",
          null,
          displayManagers.map((m, idx) => {
            const name = getLawyerDisplayName(
              m,
              managers.length ? "Lawyer" : "User",
            );
            return React.createElement(
              "div",
              {
                key: idx,
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontFamily: FONT,
                  marginBottom: 4,
                },
              },
              UsersIcon,
              React.createElement("span", null, name),
            );
          }),
        );
      },
    },

    {
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        "Số hiệu",
      ),
      key: "documentCode",
      width: 125,
      render: (_, record) => {
        if (record._type === "folder")
          return React.createElement(
            Text,
            { style: { color: "#bfbfbf" } },
            "—",
          );
        return React.createElement(TruncatedText, {
          value: record.documentCode,
          keyword: searchText,
          maxLen: 16,
          style: { fontFamily: "monospace" },
        });
      },
    },
    {
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        "Người gửi",
      ),
      key: "senderName",
      width: 130,
      render: (_, record) => {
        if (record._type === "folder")
          return React.createElement(
            Text,
            { style: { color: "#bfbfbf" } },
            "—",
          );
        return React.createElement(TruncatedText, {
          value: record.senderName,
          keyword: searchText,
          maxLen: 18,
        });
      },
    },
    {
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        "Người nhận",
      ),
      key: "recipientName",
      width: 130,
      render: (_, record) => {
        if (record._type === "folder")
          return React.createElement(
            Text,
            { style: { color: "#bfbfbf" } },
            "—",
          );
        return React.createElement(TruncatedText, {
          value: record.recipientName,
          keyword: searchText,
          maxLen: 18,
        });
      },
    },
    {
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        "Tóm tắt nội dung",
      ),
      key: "description",
      width: 190,
      render: (_, record) => {
        return React.createElement(ExpandableDescription, {
          value: record.description,
          keyword: searchText,
        });
      },
    },
    {
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        "Ngôn ngữ",
      ),
      key: "language",
      width: 95,
      align: "center",
      render: (_, record) => {
        if (record._type === "folder")
          return React.createElement(
            Text,
            { style: { color: "#bfbfbf" } },
            "—",
          );
        return React.createElement(
          Text,
          { style: { fontSize: 12, fontFamily: FONT } },
          record.language || "—",
        );
      },
    },
    {
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        "Hình thức",
      ),
      key: "docFormat",
      width: 105,
      align: "center",
      render: (_, record) => {
        if (record._type === "folder")
          return React.createElement(
            Text,
            { style: { color: "#bfbfbf" } },
            "—",
          );
        return React.createElement(TruncatedText, {
          value: record.docFormat,
          keyword: searchText,
          maxLen: 14,
        });
      },
    },
    {
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        "Ghi chú",
      ),
      key: "note",
      width: 120,
      align: "center",
      render: (_, record) => {
        if (record._type === "folder")
          return React.createElement(
            Text,
            { style: { color: "#bfbfbf" } },
            "—",
          );
        const val = record.note;
        if (!val)
          return React.createElement(
            Text,
            { style: { fontSize: 12, color: "#bfbfbf" } },
            "—",
          );
        try {
          const arr = JSON.parse(val);
          if (Array.isArray(arr) && arr.length > 0) {
            return React.createElement(
              Tag,
              {
                color: "blue",
                style: { fontSize: 11, cursor: "default", fontFamily: FONT },
              },
              `${arr.length} ghi chú`,
            );
          }
        } catch (_) { }
        return React.createElement(TruncatedText, {
          value: val,
          keyword: searchText,
          maxLen: 18,
        });
      },
    },
    {
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        "Dung lượng",
      ),
      key: "size",
      width: 110,
      align: "center",
      render: (_, record) => {
        if (record._type === "folder") {
          const size = getFolderSize(extractId(record));
          return React.createElement(
            Text,
            { style: { fontSize: 12, color: "#8c8c8c", fontFamily: FONT } },
            formatBytes(size),
          );
        } else {
          const attachment = Array.isArray(record.fileAttachment)
            ? record.fileAttachment[0]
            : record.fileAttachment;
          return React.createElement(
            Text,
            { style: { fontSize: 12, color: "#595959", fontFamily: FONT } },
            formatBytes(attachment?.size),
          );
        }
      },
    },
    {
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        "Người upload",
      ),
      key: "createdBy",
      width: 130,
      render: (_, record) => {
        if (record._type === "folder") {
          const uploader = record.createdBy
            ? getUserName(record.createdBy) || record.createdBy.email
            : "Hệ thống";
          return React.createElement(
            Text,
            { style: { fontSize: 12, color: "#595959", fontFamily: FONT } },
            uploader,
          );
        } else {
          const uploader = record.createdBy
            ? getUserName(record.createdBy) || record.createdBy.email
            : "Hệ thống";
          return React.createElement(
            Text,
            { style: { fontSize: 12, color: "#595959", fontFamily: FONT } },
            uploader,
          );
        }
      },
    },
    {
      title: React.createElement(
        "span",
        { style: { fontFamily: FONT } },
        "Ngày upload",
      ),
      key: "createdAt",
      width: 130,
      sorter: (a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return da - db;
      },
      render: (_, record) =>
        React.createElement(
          Text,
          { style: { fontSize: 12, color: "#8c8c8c", fontFamily: FONT } },
          formatDateTime(record.createdAt),
        ),
    },
  ];

  const columns = baseColumns;

  return React.createElement(
    "div",
    {
      style: {
        display: "flex",
        height: "calc(100vh - 120px)",
        minHeight: 600,
        overflow: "hidden",
        background: "#fff",
        borderTop: "1px solid #f0f0f0",
        fontFamily: FONT,
      },
    },

    // CỘT TRÁI: CÂY THƯ MỤC
    React.createElement(
      "div",
      {
        style: {
          width: showTreeSidebar ? (sidebarCollapsed ? 40 : 240) : 0,
          flexShrink: 0,
          borderRight: "1px solid #f0f0f0",
          background: "#fafafa",
          display: showTreeSidebar ? "flex" : "none",
          flexDirection: "column",
          minHeight: 0,
          height: "100%",
          transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            padding: "10px 8px",
            borderBottom: "1px solid #e8e8e8",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarCollapsed ? "center" : "space-between",
            flexShrink: 0,
            gap: 6,
            minHeight: 48,
          },
        },
        !sidebarCollapsed && React.createElement(
          Title,
          {
            level: 5,
            style: {
              margin: 0,
              fontFamily: FONT,
              fontSize: 13,
              color: "#8c8c8c",
              letterSpacing: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
            },
          },
          "DANH MỤC",
        ),
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 } },
          !sidebarCollapsed && React.createElement(
            Dropdown,
            {
              overlay: React.createElement(Menu, null, [
                React.createElement(
                  Menu.Item,
                  {
                    key: "folder",
                    onClick: () => {
                      setEditFolderData(null);
                      setFolderModalOpen(true);
                    },
                    icon: FolderPlusIcon,
                  },
                  "Thư mục mới",
                ),
                React.createElement(
                  Menu.Item,
                  {
                    key: "file",
                    onClick: () => setUploadOpen(true),
                    icon: UploadIcon,
                  },
                  "Tải tệp lên",
                ),
              ]),
              trigger: ["click"],
            },
            React.createElement(
              Button,
              {
                type: "primary",
                size: "small",
                style: {
                  borderRadius: 4,
                  height: 24,
                  padding: "0 8px",
                  fontSize: 12,
                },
              },
              iconLabel(PlusIcon, "Mới"),
            ),
          ),
          React.createElement(
            "button",
            {
              onClick: () => setSidebarCollapsed((v) => !v),
              title: sidebarCollapsed ? "Mở rộng danh mục" : "Thu gọn danh mục",
              style: {
                background: "none",
                border: "1px solid #e8e8e8",
                cursor: "pointer",
                padding: 0,
                color: "#595959",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 4,
                width: 24,
                height: 24,
                flexShrink: 0,
                lineHeight: 1,
              },
              onMouseEnter: (e) => { e.currentTarget.style.background = "#f0f0f0"; },
              onMouseLeave: (e) => { e.currentTarget.style.background = "none"; },
            },
            sidebarCollapsed ? ChevronRightIcon : ChevronLeftIcon,
          ),
        ),
      ),
      !sidebarCollapsed && React.createElement(
        "div",
        {
          style: {
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            padding: "12px 8px",
          },
          onDragOver: (e) => {
            const threshold = 60;
            const container = e.currentTarget;
            const rect = container.getBoundingClientRect();
            const y = e.clientY - rect.top;

            if (y < threshold) {
              const speed = Math.max(5, (threshold - y) / 2);
              container.scrollTop -= speed;
            } else if (y > rect.height - threshold) {
              const speed = Math.max(5, (y - (rect.height - threshold)) / 2);
              container.scrollTop += speed;
            }
          },
        },
        loading && folders.length === 0
          ? React.createElement(Spin, {
            style: { display: "block", margin: "20px auto" },
          })
          : React.createElement(DirectoryTree, {
            showIcon: true,
            draggable: true,
            onDrop: handleTreeDrop,
            icon: (nodeProps) => {
              return React.createElement(
                "span",
                {
                  style: {
                    fontSize: 16,
                    lineHeight: 1,
                    display: "inline-block",
                    color: "#8c6d1f",
                  },
                },
                nodeProps.expanded ? FolderOpenIcon : FolderIcon,
              );
            },
            multiple: false,
            expandedKeys: expandedFolderKeys,
            autoExpandParent: false,
            onExpand: (keys) => setExpandedFolderKeys(keys.map(String)),
            treeData: treeData,
            selectedKeys: [selectedFolderId],
            onSelect: (keys) => {
              if (keys.length > 0) {
                if (isFiltering) {
                  setSearchText("");
                  setFilterUploader(null);
                  setFilterDateRange(null);
                }
                setSelectedFolderId(keys[0]);
              }
            },
            style: {
              background: "transparent",
              fontFamily: FONT,
              minWidth: "max-content",
            },
          }),
      ),
    ),

    // MAIN CONTAINER (2 CỘT: DANH SÁCH & MODALS)
    React.createElement(
      "div",
      {
        style: {
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          minWidth: 0,
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
        },
      },
      // CỘT GIỮA: DANH SÁCH TỆP TIN
      React.createElement(
        "div",
        {
          style: {
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #f0f0f0",
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
          },
        },

        // Topbar & Breadcrumb
        React.createElement(
          "div",
          {
            style: {
              padding: "12px 24px",
              borderBottom: "1px solid #f0f0f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#fff",
              zIndex: 10,
            },
          },

          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 16,
                fontWeight: 600,
                color: "#262626",
                flex: 1,
                minWidth: 0,
                flexWrap: "wrap",
                border: "1px dashed transparent",
                borderRadius: 6,
                padding: "4px 8px",
                margin: "-4px -8px",
                transition: "0.3s",
              },
              onDragOver: (e) => {
                const dt = e.dataTransfer.getData("application/json");
                if (dt && breadcrumbs.length > 1) {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = "#1890ff";
                  e.currentTarget.style.background = "rgba(24, 144, 255, 0.05)";
                }
              },
              onDragLeave: (e) => {
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.background = "transparent";
              },
              onDrop: async (e) => {
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.background = "transparent";
                const dt = e.dataTransfer.getData("application/json");
                if (dt && breadcrumbs.length > 1) {
                  e.preventDefault();
                  try {
                    const parsed = JSON.parse(dt);
                    const parentFolder = breadcrumbs[breadcrumbs.length - 2];
                    if (parentFolder) {
                      if (parsed.type === "folder") {
                        await handleMoveFolderToFolder(
                          parsed.id,
                          parentFolder.id,
                        );
                      } else {
                        await handleMoveFile(parsed.id, parentFolder.id);
                      }
                    }
                  } catch (err) { }
                }
              },
            },
            ...breadcrumbs.map((b, idx) =>
              React.createElement(
                React.Fragment,
                { key: b.id },
                React.createElement(
                  "span",
                  {
                    style: {
                      cursor: "pointer",
                      color:
                        idx === breadcrumbs.length - 1 ? "#262626" : "#8c8c8c",
                      transition: "0.2s",
                      wordBreak: "break-word",
                      whiteSpace: "normal",
                      display: "inline",
                      lineHeight: 1.4,
                      padding: "2px 4px",
                      borderRadius: 4,
                    },
                    onClick: () => {
                      if (isFiltering) {
                        setSearchText("");
                        setFilterUploader(null);
                        setFilterDateRange(null);
                      }
                      setSelectedFolderId(String(b.id));
                    },
                    onDragOver: (e) => {
                      e.preventDefault();
                      e.currentTarget.style.background =
                        "rgba(24, 144, 255, 0.1)";
                    },
                    onDragLeave: (e) => {
                      e.currentTarget.style.background = "transparent";
                    },
                    onDrop: async (e) => {
                      e.preventDefault();
                      e.currentTarget.style.background = "transparent";
                      const dt = e.dataTransfer.getData("application/json");
                      if (!dt) return;
                      try {
                        const parsed = JSON.parse(dt);
                        if (parsed.type === "folder") {
                          await handleMoveFolderToFolder(parsed.id, b.id);
                        } else {
                          await handleMoveFile(parsed.id, b.id);
                        }
                      } catch (err) { }
                    },
                    onMouseEnter: (e) =>
                      (e.currentTarget.style.color = "#1890ff"),
                    onMouseLeave: (e) =>
                    (e.currentTarget.style.color =
                      idx === breadcrumbs.length - 1 ? "#262626" : "#8c8c8c"),
                  },
                  b.name,
                ),
                idx < breadcrumbs.length - 1 &&
                React.createElement(
                  "span",
                  {
                    style: {
                      color: "#d9d9d9",
                      margin: "0 4px",
                      flexShrink: 0,
                    },
                  },
                  "/",
                ),
              ),
            ),
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 13,
                  color: "#8c8c8c",
                  fontWeight: 400,
                  marginLeft: 4,
                  flexShrink: 0,
                },
              },
              `(${currentFolderStats.folders} thư mục, ${currentFolderStats.docs} tệp tin)`,
              " - ",
              React.createElement(
                "span",
                {
                  style: {
                    color:
                      currentPerms.isManager || currentPerms.canEdit
                        ? "#52c41a"
                        : "#ff4d4f",
                    fontWeight: 500,
                  },
                },
                currentPerms.isManager || currentPerms.canEdit
                  ? `(Bạn có quyền ${currentPerms.roleName.toLowerCase()})`
                  : `(Bạn không có quyền thao tác trong thư mục này)`,
              ),
            ),
          ),

          // Khối Action Buttons
          React.createElement(
            Space,
            { style: { flexShrink: 0, flexWrap: "nowrap" } },
            selectedRowKeys.length > 0 &&
            React.createElement(
              Space,
              null,
              React.createElement(
                Button,
                {
                  onClick: () => setSelectedRowKeys([]),
                  style: { fontFamily: FONT },
                },
                "Hủy chọn",
              ),
              React.createElement(
                Popconfirm,
                {
                  title: "Xóa các mục đã chọn?",
                  onConfirm: handleBulkDelete,
                },
                React.createElement(
                  Button,
                  {
                    danger: true,
                    type: "primary",
                    style: { fontFamily: FONT },
                  },
                  iconLabel(DeleteIcon, `Xóa (${selectedRowKeys.length})`),
                ),
              ),
              React.createElement(
                Button,
                {
                  onClick: () => {
                    setFileToMove(null);
                    setMoveToTargetId("root");
                    setMoveToModalOpen(true);
                  },
                  style: { fontFamily: FONT },
                },
                iconLabel(MoveIcon, `Di chuyển (${selectedRowKeys.length})`),
              ),
            ),
            React.createElement(
              Dropdown,
              {
                menu: { items: menuItems, onClick: handleMenuClick },
                trigger: ["click"],
              },
              React.createElement(
                Button,
                {
                  type: "primary",
                  style: { fontFamily: FONT, fontWeight: 600 },
                },
                iconLabel(PlusIcon, "Mới"),
              ),
            ),
            React.createElement(ReloadButton, {
              onReload: refetch,
              loading: loading,
            }),
          ),
        ),

        // THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC
        React.createElement(
          "div",
          {
            style: {
              padding: "10px 24px",
              background: "#fafafa",
              borderBottom: "1px solid #f0f0f0",
              display: "flex",
              gap: 12,
              alignItems: "center",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 12,
              },
            },
            React.createElement(Input, {
              placeholder: "Tìm kiếm...",
              prefix: SearchIcon,
              allowClear: true,
              value: searchText,
              onChange: (e) => setSearchText(e.target.value),
              style: { width: 250, borderRadius: 6, fontFamily: FONT },
            }),
            React.createElement(Select, {
              placeholder: "Người upload",
              allowClear: true,
              value: filterUploader,
              onChange: setFilterUploader,
              options: uploaderOptions,
              style: { width: 160, fontFamily: FONT },
            }),
            showInternalCompanyFilter &&
            React.createElement(Select, {
              placeholder: "Công ty nội bộ",
              allowClear: !isCompanyLocked,
              disabled: isCompanyLocked,
              loading: loadingCompanies,
              value: filterInternalCompanyId,
              onChange: setFilterInternalCompanyId,
              options: internalCompanyOptions,
              showSearch: true,
              optionFilterProp: "label",
              style: { width: 180, fontFamily: FONT },
            }),
            React.createElement(DatePicker.RangePicker, {
              allowClear: true,
              value: filterDateRange,
              onChange: setFilterDateRange,
              format: "DD/MM/YYYY",
              style: { width: 220, fontFamily: FONT },
            }),
            showInternalCompanyFilter &&
            internalCompanyFileCounts.length > 0 &&
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  alignItems: "center",
                },
              },
              internalCompanyFileCounts.map((item) =>
                React.createElement(
                  Button,
                  {
                    key: item.id,
                    size: "small",
                    type:
                      filterInternalCompanyId === String(item.id)
                        ? "primary"
                        : "default",
                    onClick: () =>
                      setFilterInternalCompanyId(
                        filterInternalCompanyId === String(item.id)
                          ? null
                          : String(item.id),
                      ),
                    style: {
                      fontFamily: FONT,
                      borderRadius: 6,
                      fontSize: 12,
                      lineHeight: 1,
                    },
                  },
                  `${item.name} (${item.count})`,
                ),
              ),
            ),
          ),
          isFiltering &&
          React.createElement(
            Text,
            { type: "secondary", style: { fontSize: 12 } },
            `Kết quả: ${tableData.length}`,
          ),
        ),

        // Bảng Dữ liệu
        React.createElement(
          "div",
          {
            style: {
              flex: 1,
              minHeight: 0,
              padding: "20px 24px",
              overflow: "auto",
            },
            onDragOver: (e) => {
              const threshold = 80;
              const container = e.currentTarget;
              const rect = container.getBoundingClientRect();
              const y = e.clientY - rect.top;

              if (y < threshold) {
                const speed = Math.max(8, (threshold - y) / 1.5);
                container.scrollTop -= speed;
              } else if (y > rect.height - threshold) {
                const speed = Math.max(
                  8,
                  (y - (rect.height - threshold)) / 1.5,
                );
                container.scrollTop += speed;
              }
            },
          },
          React.createElement(Table, {
            rowKey: "_key",
            rowSelection: {
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              getCheckboxProps: (record) => {
                const allowed = canManageRecord(record);
                return {
                  disabled: !allowed,
                  title: allowed
                    ? undefined
                    : "Bạn không có quyền thao tác mục này",
                };
              },
            },
            dataSource: tableData,
            columns,
            loading,
            size: "middle",
            onRow: (record) => {
              const isFolder = record._type === "folder";
              return {
                draggable: true,
                onDragStart: (e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", record.id);
                  e.dataTransfer.setData(
                    "application/json",
                    JSON.stringify({ type: record._type, id: record.id }),
                  );
                },
                onDragEnter: (e) => {
                  e.preventDefault();
                },
                onDragOver: (e) => {
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;

                  e.currentTarget.style.background = "";
                  e.currentTarget.style.borderTop = "";
                  e.currentTarget.style.borderBottom = "";
                  e.currentTarget.style.outline = "";
                  e.currentTarget.style.outlineOffset = "";

                  if (y < rect.height * 0.25) {
                    e.currentTarget.style.borderTop = "3px solid #1890ff";
                    e.currentTarget.style.background =
                      "rgba(24, 144, 255, 0.08)";
                  } else if (y > rect.height * 0.75) {
                    e.currentTarget.style.borderBottom = "3px solid #1890ff";
                    e.currentTarget.style.background =
                      "rgba(24, 144, 255, 0.08)";
                  } else {
                    if (isFolder) {
                      e.currentTarget.style.outline = "2px dashed #52c41a";
                      e.currentTarget.style.outlineOffset = "-2px";
                      e.currentTarget.style.background = "#f6ffed";
                    } else {
                      if (y < rect.height / 2) {
                        e.currentTarget.style.borderTop = "3px solid #1890ff";
                        e.currentTarget.style.background =
                          "rgba(24, 144, 255, 0.08)";
                      } else {
                        e.currentTarget.style.borderBottom =
                          "3px solid #1890ff";
                        e.currentTarget.style.background =
                          "rgba(24, 144, 255, 0.08)";
                      }
                    }
                  }
                },
                onDragLeave: (e) => {
                  e.currentTarget.style.background = "";
                  e.currentTarget.style.borderTop = "";
                  e.currentTarget.style.borderBottom = "";
                  e.currentTarget.style.outline = "";
                  e.currentTarget.style.outlineOffset = "";
                },
                onDrop: async (e) => {
                  e.preventDefault();
                  e.currentTarget.style.background = "";
                  e.currentTarget.style.borderTop = "";
                  e.currentTarget.style.borderBottom = "";
                  e.currentTarget.style.outline = "";
                  e.currentTarget.style.outlineOffset = "";

                  const dt = e.dataTransfer.getData("application/json");
                  if (!dt) return;
                  let parsed;
                  try {
                    parsed = JSON.parse(dt);
                  } catch (err) {
                    return;
                  }

                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  let position = "inside";

                  if (y < rect.height * 0.25) {
                    position = "top";
                  } else if (y > rect.height * 0.75) {
                    position = "bottom";
                  } else if (!isFolder) {
                    position = y < rect.height / 2 ? "top" : "bottom";
                  }

                  if (position === "inside" && isFolder) {
                    if (parsed.type === "file") {
                      handleMoveFile(parsed.id, record.id);
                    }
                    if (parsed.type === "folder" && parsed.id !== record.id) {
                      handleMoveFolderToFolder(parsed.id, record.id);
                    }
                  } else if (position === "top" || position === "bottom") {
                    message.warning("Khong the thay doi STT");
                    return;
                  }
                },
              };
            },
            pagination: {
              defaultPageSize: 20,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50", "100"],
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} / ${total} mục`,
            },
            scroll: { x: 2000 },
            locale: {
              emptyText: React.createElement(Empty, {
                description: isFiltering
                  ? "Không tìm thấy dữ liệu phù hợp"
                  : "Thư mục trống",
                image: Empty.PRESENTED_IMAGE_SIMPLE,
              }),
            },
            style: { fontFamily: FONT },
            rowClassName: (_, index) =>
              index % 2 === 0 ? "" : "table-row-alt",
          }),
        ), // close TableContainer
      ), // close Cột Giữa
    ), // close Main Container,

    // MODAL LỊCH SỬ HOẠT ĐỘNG
    React.createElement(
      Modal,
      {
        title: React.createElement(
          "div",
          {
            style: {
              fontFamily: FONT,
              display: "flex",
              alignItems: "center",
              gap: 8,
            },
          },
          HistoryIcon,
          React.createElement(
            "span",
            null,
            `Lịch sử hoạt động: ${activityTargetRecord?.name || ""}`,
          ),
        ),
        open: activityModalOpen,
        onCancel: () => setActivityModalOpen(false),
        footer: [
          React.createElement(
            Button,
            {
              key: "close",
              onClick: () => setActivityModalOpen(false),
              style: { fontFamily: FONT },
            },
            "Đóng",
          ),
        ],
        width: 700,
        bodyStyle: { maxHeight: "60vh", overflowY: "auto", padding: 0 },
      },
      activityTargetRecord &&
      React.createElement(DocumentActivityLog, {
        recordId: activityTargetRecord.id,
        collectionName: activityTargetRecord.type,
      }),
    ),

    // Hidden Input
    React.createElement("input", {
      type: "file",
      ref: folderInputRef,
      webkitdirectory: "true",
      directory: "true",
      multiple: true,
      style: { display: "none" },
      onChange: handleFolderInputTrigger,
    }),

    // Modal Xác nhận Upload Thư mục
    React.createElement(BulkFolderUploadModal, {
      open: bulkConfirmOpen,
      files: pendingFolderFiles,
      onClose: () => {
        setBulkConfirmOpen(false);
        setPendingFolderFiles(null);
      },
      folders: folders,
      onUpload: executeFolderUpload,
    }),

    // Modal hiển thị Progress khi Upload Bulk Folder
    React.createElement(
      Modal,
      {
        open: bulkUploading,
        closable: false,
        footer: null,
        centered: true,
        maskClosable: false,
      },
      React.createElement(
        "div",
        { style: { textAlign: "center", padding: "30px 20px" } },
        React.createElement(Spin, { size: "large" }),
        React.createElement(
          "div",
          {
            style: {
              marginTop: 24,
              fontSize: 15,
              fontFamily: FONT,
              fontWeight: 500,
              color: "#262626",
            },
          },
          bulkProgress,
        ),
      ),
    ),

    // Các Modal dùng chung
    React.createElement(FolderModal, {
      open: folderModalOpen,
      onClose: () => {
        setFolderModalOpen(false);
        setEditFolderData(null);
      },
      onSuccess: refetch,
      context: resolvedContext,
      editFolder: editFolderData,
      currentUser: currentUser,
      currentLawyerId: currentLawyerId,
      currentLawyer: currentLawyer,
      folders: folders,
      activeInternalCompanyId,
    }),
    React.createElement(UploadModal, {
      open: uploadOpen,
      onClose: () => setUploadOpen(false),
      onSuccess: refetch,
      currentUser,
      context: resolvedContext,
      currentFolderId: selectedFolderId,
      docs: docs,
      activeInternalCompanyId,
      internalCompanies,
    }),
    React.createElement(PreviewModal, {
      doc: previewDoc,
      onClose: () => setPreviewDoc(null),
    }),
    React.createElement(DetailModal, {
      doc: detailDoc,
      onClose: () => setDetailDoc(null),
      onSuccess: () => {
        setDetailDoc(null);
        refetch();
      },
      currentUser,
      onPreview: setPreviewDoc,
    }),
    React.createElement(FolderPermissionsModal, {
      open: permissionsModalOpen,
      folder: currentFolder,
      onClose: () => setPermissionsModalOpen(false),
      onSuccess: refetch,
    }),

    // Modal Move To
    React.createElement(
      Modal,
      {
        open: moveToModalOpen,
        onCancel: () => {
          setMoveToModalOpen(false);
          setFileToMove(null);
        },
        title: React.createElement(
          "span",
          { style: { fontFamily: FONT } },
          "Di chuyển",
        ),
        footer: [
          React.createElement(
            Button,
            {
              key: "cancel",
              onClick: () => setMoveToModalOpen(false),
              style: { fontFamily: FONT },
            },
            "Hủy",
          ),
          React.createElement(
            Button,
            {
              key: "submit",
              type: "primary",
              onClick: () => {
                if (fileToMove) {
                  if (fileToMove._type === "folder")
                    handleMoveFolderToFolder(fileToMove.id, moveToTargetId);
                  else handleMoveFile(fileToMove.id, moveToTargetId);
                  setMoveToModalOpen(false);
                } else {
                  handleBulkMove(moveToTargetId);
                }
              },
              style: { fontFamily: FONT },
            },
            "Di chuyển",
          ),
        ],
      },
      React.createElement(
        "div",
        { style: { fontFamily: FONT, marginBottom: 16 } },
        fileToMove
          ? React.createElement(
            React.Fragment,
            null,
            `Bạn đang di chuyển: `,
            React.createElement(
              "strong",
              null,
              fileToMove.title || fileToMove.name || "Thư mục/File",
            ),
          )
          : `Bạn đang di chuyển ${selectedRowKeys.length} mục đã chọn.`,
      ),
      React.createElement(
        "div",
        { style: { fontWeight: 600, marginBottom: 8, fontFamily: FONT } },
        "Chọn thư mục đích:",
      ),
      React.createElement(TreeSelect, {
        style: { width: "100%", fontFamily: FONT },
        treeData: [
          {
            title: "Home",
            value: "root",
            children: buildTreeForSelect(moveTargetFolders),
          },
        ],
        value: moveToTargetId,
        onChange: setMoveToTargetId,
        treeDefaultExpandAll: true,
        placeholder: "Chọn thư mục",
      }),
    ),

    React.createElement(
      Modal,
      {
        open: legalMoveOpen,
        onCancel: () => {
          setLegalMoveOpen(false);
          setLegalMoveDoc(null);
          setLegalMoveReferenceId(null);
        },
        title: React.createElement(
          "span",
          { style: { fontFamily: FONT } },
          "Move to Legal Reference",
        ),
        footer: [
          React.createElement(
            Button,
            {
              key: "cancel",
              onClick: () => {
                setLegalMoveOpen(false);
                setLegalMoveDoc(null);
                setLegalMoveReferenceId(null);
              },
              style: { fontFamily: FONT },
            },
            "Hủy",
          ),
          React.createElement(
            Button,
            {
              key: "submit",
              type: "primary",
              loading: legalMoveLoading,
              onClick: handleMoveFileToLegalReference,
              style: { fontFamily: FONT },
            },
            "Move",
          ),
        ],
      },
      React.createElement(
        "div",
        { style: { fontFamily: FONT, marginBottom: 16 } },
        "File: ",
        React.createElement(
          "strong",
          null,
          legalMoveDoc?.title || legalMoveDoc?.name || "File",
        ),
      ),
      React.createElement(
        "div",
        { style: { fontWeight: 600, marginBottom: 8, fontFamily: FONT } },
        "Công ty nội bộ:",
      ),
      React.createElement(Select, {
        style: { width: "100%", fontFamily: FONT, marginBottom: 16 },
        value: legalMoveCompanyId,
        onChange: (value) => {
          setLegalMoveCompanyId(value);
          setLegalMoveTargetFolderId("root");
          setLegalMoveReferenceId(null);
        },
        options: internalCompanyOptions,
        loading: loadingCompanies,
        showSearch: true,
        optionFilterProp: "label",
        placeholder: "Chọn công ty nội bộ",
      }),
      React.createElement(
        "div",
        { style: { fontWeight: 600, marginBottom: 8, fontFamily: FONT } },
        "Legal Reference:",
      ),
      React.createElement(Select, {
        style: { width: "100%", fontFamily: FONT, marginBottom: 16 },
        value: legalMoveReferenceId,
        onChange: setLegalMoveReferenceId,
        options: legalReferenceOptions,
        loading: loadingLegalReferences,
        showSearch: true,
        optionFilterProp: "label",
        allowClear: true,
        placeholder: "Chọn Legal Reference",
      }),
      React.createElement(
        "div",
        { style: { fontWeight: 600, marginBottom: 8, fontFamily: FONT } },
        "Folder Legal Reference:",
      ),
      React.createElement(TreeSelect, {
        style: { width: "100%", fontFamily: FONT },
        treeData: [
          {
            title: "Legal Reference Home",
            value: "root",
            children: buildTreeForSelect(legalReferenceFolders),
          },
        ],
        value: legalMoveTargetFolderId,
        onChange: setLegalMoveTargetFolderId,
        treeDefaultExpandAll: true,
        loading: legalMoveLoading,
        placeholder: "Chọn thư mục Legal Reference",
      }),
    ),

    React.createElement(
      "style",
      null,
      `
      .table-row-alt td { background: #fafbfc !important; }
      .ant-table-thead > tr > th { background: #f5f7fa !important; font-weight: 600 !important; color: #595959 !important; }
      .ant-tree-directory .ant-tree-node-selected { background-color: #e6f4ff !important; color: #1890ff !important; font-weight: 600; }
      .ant-tree-directory .ant-tree-node-selected::before { background-color: #e6f4ff !important; }
      
      /* Force Tree Switcher Icon to be dark gray/black */
      .ant-tree .ant-tree-switcher { color: #595959 !important; margin-top: 4px; }
      .ant-tree .ant-tree-switcher:hover { color: #262626 !important; }
      .ant-tree-directory .ant-tree-node-selected .ant-tree-switcher { color: #595959 !important; }

      /* BẢO ĐẢM GIAO DIỆN TREE SIDEBAR KHÔNG BỊ BÓP MÉO KHI DEEP NESTING */
      .ant-tree .ant-tree-node-content-wrapper { height: auto !important; min-height: 24px; padding-top: 4px; padding-bottom: 4px; display: flex; align-items: flex-start; gap: 4px; }
      .ant-tree .ant-tree-title { white-space: normal !important; word-break: break-word; line-height: 1.4; padding-top: 2px; }
    `,
    ),
  );
};

// Helper for Move To Select
const buildTreeForSelect = (data, parentId = null) => {
  return data
    .filter((f) => extractId(f.parentId) === parentId)
    .map((f) => ({
      title: f.name,
      value: String(extractId(f)),
      children: buildTreeForSelect(data, extractId(f)),
    }));
};

ctx.render(React.createElement(DocumentDashboard));
