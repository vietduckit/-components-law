const React = ctx.React;
const h = React.createElement;
const antd = ctx.antd || {};
const {
  Alert,
  Badge,
  Button,
  Checkbox,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Space,
  Spin,
  Tag,
  Tooltip,
  Tree,
  Typography,
  Upload,
} = antd;

const DirectoryTree = Tree?.DirectoryTree || Tree;
const message = ctx.message || antd.message;
const Text = Typography?.Text;

const CONFIG = {
  pageSize: 200,
  drawerWidth: 840,
  previewWidth: 920,


  caseDetailUrlTemplate: "/admin/61j36bn1f6i/view/3l7acumtlsc/tab/6hx8srk0iqs/filterbytk/{id}",
  caseReferenceDetailUrlTemplate: "/admin/aoy5h2zeeq3/view/20q5aaq1zkf/filterbytk/{id}",
  // Leave empty to follow the NocoBase template: popupUid = ctx.model.uid + "-1".
  casePopupUid: "3l7acumtlsc",
  caseViewUid: "3l7acumtlsc",
  caseViewTitle: "Case detail",
  caseCollectionName: "projects",
  dataSourceKey: "main",
  caseOpenStrategy: "url", // "openView" or "url"
  caseDetailUrlTemplate: "/admin/61j36bn1f6i/view/3l7acumtlsc/tab/6hx8srk0iqs/filterbytk/{id}",
  caseUrlTarget: "_blank",

  caseListCandidates: [
    "projects:list",
  ],
  caseGetCandidates: [
    "projects:get",
  ],
  caseUpdateCandidates: [
    "projects:update",
  ],
  caseRelationField: "legalReference",
  caseOppositeRelationField: "cases",
  caseReferenceFilterField: "isLegalReference",
  caseRelationListCandidates: [
    "projects.legalReference:list",
  ],
  caseRelationAddCandidates: [
    "projects.legalReference:add",
  ],
  caseRelationRemoveCandidates: [
    "projects.legalReference:remove",
  ],

  linkListCandidates: [
    "caseLegalReferences:list",
  ],
  linkCreateCandidates: [
    "caseLegalReferences:create",
  ],
  linkDestroyCandidates: [
    "caseLegalReferences:destroy",
  ],
  linkUpdateCandidates: [
    "caseLegalReferences:update",
  ],
  referenceListCandidates: [
    "legalReference:list",
  ],
  referenceGetCandidates: [
    "legalReference:get",
  ],
  referenceCreateCandidates: [
    "legalReference:create",
  ],
  projectListCandidates: [
    "projects:list",
  ],
  projectGetCandidates: [
    "projects:get",
  ],

  // The through collection in this app only has scalar caseId/legalReferenceId fields.
  // IMPORTANT: appends only accepts RELATION names, NOT scalar FK columns.
  // createdBy = relation (BelongsTo) → returns { id, nickname, username }
  // createdById = scalar FK column → causes 404 Not Found if used in appends
  linkAppends: ["legalReference", "legalReference.legalStudy", "createdBy", "legalReference.createdBy"],
  referenceAppends: [],
  projectAppends: [],
  folderAppends: ["createdBy", "updatedBy"],
  documentAppends: ["fileAttachment", "createdBy", "updatedBy"],
  attachmentField: "documents.fileAttachment",
  caseAppends: ["legalReference"],
  legalStudyListCandidates: [
    "legalStudy:list",
  ],
  legalStudyAppends: ["documents", "Folders", "manager", "members"],
  legalStudyRelationFieldCandidates: [
    "legalStudyId",
    "legalStudy",
    "legalStudiesId",
    "legalStudies",
  ],

  // "Legal Study" tab (case-bound Legal Study folders) — caseLegalStudyLinks
  // is a plain collection (not a Nocobase-managed belongsToMany), read via
  // the projects.legalStudyFolderLinks hasMany relation (see
  // fetchLinkedRelationRows) and written via normal create/destroy actions.
  legalStudyFolderLinkRelationName: "legalStudyFolderLinks",
  legalStudyFolderLinkCreateCandidates: [
    "caseLegalStudyLinks:create",
  ],
  legalStudyFolderLinkDestroyCandidates: [
    "caseLegalStudyLinks:destroy",
  ],

  legalReferenceModuleScope: "legal_reference",
  legalReferenceStorageType: "legal_reference",
  legalStudyModuleScope: "legal_study",
  legalStudyStorageType: "legal_study",
  // Case-bound "Legal Study" folder tag (see Library.js's
  // LEGAL_STUDY_FOLDER_TEMPLATE_KEY) — CaseCreateForm.js stamps this on
  // the auto-created "Legal Study" folder inside every case's own tree.
  legalStudyFolderTemplateKey: "legal_study",
  caseStorageType: "cases",

  caseReferenceKind: "case_based",
  standaloneReferenceKind: "standalone",
  legalReferenceKind: "legal_reference",
  legalStudyReferenceKind: "legal_study",
  sourceTypeDossier: "dossier",
  sourceTypeFolder: "folder",
  sourceTypeDocument: "document",
  sourceTypeMixed: "mixed",
  activeStatus: "active",

  debugOpenView: true,
};

const color = {
  blue: "#185FA5",
  blueSoft: "#E6F1FB",
  border: "#E5E7EB",
  borderDark: "#D1D5DB",
  text: "#111827",
  muted: "#6B7280",
  faint: "#9CA3AF",
  bg: "#F9FAFB",
  white: "#FFFFFF",
};

const debugOpenView = (label, payload = {}) => {
  if (!CONFIG.debugOpenView) return;
  const entry = {
    label,
    at: new Date().toISOString(),
    ...payload,
  };
  window.__caseLegalReferenceOpenViewDebug = entry;
  try {
    console.log("[CaseLegalReference/openView]", label, entry);
  } catch {
    // Console can be unavailable in restricted runtimes.
  }
};

const getCasePopupUid = () => {
  const configuredUid = String(CONFIG.casePopupUid || "").trim();
  if (configuredUid) return configuredUid;
  const modelUid = String(ctx.model?.uid || "").trim();
  if (modelUid) return `${modelUid}-1`;
  return String(CONFIG.caseViewUid || "").trim();
};

const serializeOpenViewError = (error) => ({
  name: error?.name,
  message: error?.message || String(error || ""),
  stack: error?.stack,
  raw: error,
});

const icon = (children, size = 16) =>
  h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.9",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: { display: "inline-block", verticalAlign: "middle" },
    },
    children,
  );

const ICONS = {
  book: icon([
    h("path", { key: "a", d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }),
    h("path", { key: "b", d: "M4 19.5A2.5 2.5 0 0 0 6.5 22H20" }),
    h("path", { key: "c", d: "M4 19.5V3.5A2.5 2.5 0 0 1 6.5 1H20v21H6.5" }),
  ]),
  caseFile: icon([
    h("path", { key: "a", d: "M4 4h16v18H4z" }),
    h("path", { key: "b", d: "M8 8h8" }),
    h("path", { key: "c", d: "M8 12h8" }),
    h("path", { key: "d", d: "M8 16h5" }),
  ]),
  folder: icon([
    h("path", { key: "a", d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" }),
  ]),
  file: icon([
    h("path", { key: "a", d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
    h("path", { key: "b", d: "M14 2v6h6" }),
    h("path", { key: "c", d: "M8 13h8" }),
    h("path", { key: "d", d: "M8 17h5" }),
  ]),
  open: icon([
    h("path", { key: "a", d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }),
    h("path", { key: "b", d: "M15 3h6v6" }),
    h("path", { key: "c", d: "M10 14 21 3" }),
  ]),
  refresh: icon([
    h("path", { key: "a", d: "M23 4v6h-6" }),
    h("path", { key: "b", d: "M20.49 15a9 9 0 1 1-2.12-9.36L23 10" }),
  ]),
  plus: icon([
    h("path", { key: "a", d: "M12 5v14" }),
    h("path", { key: "b", d: "M5 12h14" }),
  ]),
  trash: icon([
    h("path", { key: "a", d: "M3 6h18" }),
    h("path", { key: "b", d: "M8 6V4h8v2" }),
    h("path", { key: "c", d: "M19 6l-1 16H6L5 6" }),
    h("path", { key: "d", d: "M10 11v6" }),
    h("path", { key: "e", d: "M14 11v6" }),
  ]),
  upload: icon([
    h("path", { key: "a", d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
    h("path", { key: "b", d: "M17 8l-5-5-5 5" }),
    h("path", { key: "c", d: "M12 3v12" }),
  ]),
  download: icon([
    h("path", { key: "a", d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
    h("path", { key: "b", d: "M7 10l5 5 5-5" }),
    h("path", { key: "c", d: "M12 15V3" }),
  ]),
};

const asArray = (value) => {
  if (value === null || value === undefined || value === "") return [];
  return Array.isArray(value) ? value : [value];
};

const isNilLike = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value !== "string") return false;
  const text = value.trim().toLowerCase();
  return !text || text === "undefined" || text === "null";
};

const extractId = (value) => {
  if (isNilLike(value)) return null;
  if (typeof value === "string") {
    const text = value.trim();
    if (isNilLike(text)) return null;
    return text;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return extractId(value[0]);
  if (typeof value === "object") {
    return (
      extractId(value.id) ||
      extractId(value._id) ||
      extractId(value.value) ||
      extractId(value.targetKey) ||
      extractId(value.key)
    );
  }
  return null;
};

const hasUsableId = (value) => {
  const id = extractId(value);
  return id !== null && id !== undefined && id !== "";
};

const idValue = (value) => {
  const id = extractId(value);
  if (id === null || id === undefined || id === "") return id;
  const numeric = Number(id);
  return Number.isFinite(numeric) && String(numeric) === String(id) ? numeric : id;
};

const extractIds = (value) =>
  asArray(value)
    .map((item) => extractId(item))
    .filter((id) => id !== null && id !== undefined && id !== "")
    .map((id) => String(id));

const uniqById = (items) => {
  const map = new Map();
  asArray(items).forEach((item) => {
    const id = extractId(item?.id) || extractId(item);
    if (id !== null && id !== undefined && !map.has(String(id))) {
      map.set(String(id), item);
    }
  });
  return Array.from(map.values());
};

const activeRows = (rows) =>
  asArray(rows).filter((row) => row && row.isDeleted !== true && row.status !== "archived");

const stripHtml = (html) => {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
};

const buildFilter = (filter) => JSON.stringify(filter);

const getResponseData = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.data && typeof payload.data === "object") return payload.data;
  if (Array.isArray(payload)) return payload;
  return payload?.data || payload || [];
};

const getResponseMeta = (response) => response?.data?.meta || response?.data || {};

const omitNilValues = (record) => {
  if (!record || typeof record !== "object") return {};
  return Object.entries(record).reduce((result, [key, value]) => {
    if (!isNilLike(value)) result[key] = value;
    return result;
  }, {});
};

const getRouteFilterByTk = () => {
  if (typeof window === "undefined") return null;
  const pathname = String(window.location?.pathname || "");
  const pathMatch = pathname.match(/\/filterbytk\/([^/?#]+)/i);
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);

  try {
    const params = new URLSearchParams(window.location?.search || "");
    return params.get("filterByTk") || params.get("filterbytk") || params.get("id");
  } catch {
    return null;
  }
};

const getCurrentRecord = () => {
  const formValues = (() => {
    try {
      return ctx.form?.getFieldsValue?.(true) || {};
    } catch {
      return {};
    }
  })();

  return {
    ...omitNilValues(ctx.record),
    ...omitNilValues(ctx.popup?.record),
    ...omitNilValues(ctx.view?.record),
    ...omitNilValues(formValues),
  };
};

const getCurrentCaseId = (record = null) =>
  extractId(record?.id) ||
  extractId(record?._id) ||
  extractId(record?.targetKey) ||
  extractId(ctx.record?.id) ||
  extractId(ctx.record?._id) ||
  extractId(ctx.popup?.record?.id) ||
  extractId(ctx.popup?.record?._id) ||
  extractId(ctx.view?.record?.id) ||
  extractId(ctx.view?.record?._id) ||
  extractId(ctx.params?.filterByTk) ||
  extractId(ctx.params?.filterbytk) ||
  extractId(ctx.router?.params?.filterByTk) ||
  extractId(ctx.router?.params?.filterbytk) ||
  extractId(ctx.view?.params?.filterByTk) ||
  extractId(ctx.inputArgs?.filterByTk) ||
  extractId(getRouteFilterByTk());

const relationRows = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.records)) return value.records;
  if (Array.isArray(value?.rows)) return value.rows;
  return value && typeof value === "object" && extractId(value) ? [value] : [];
};

const isTrueLike = (value) =>
  value === true ||
  value === 1 ||
  value === "1" ||
  String(value || "").toLowerCase() === "true" ||
  String(value || "").toLowerCase() === "yes";

const getCaseRelationRows = (record, field = CONFIG.caseRelationField) =>
  relationRows(record?.[field]);

const getCaseRelationIds = (record, field = CONFIG.caseRelationField) => {
  const directIds = extractIds(record?.[field]);
  const rowIds = relationRows(record?.[field]).map(extractId).filter(Boolean).map(String);
  return Array.from(new Set([...directIds, ...rowIds]));
};

const isLegalReferenceCase = (record) => {
  if (!record || typeof record !== "object") return false;
  if (isTrueLike(record?.[CONFIG.caseReferenceFilterField])) return true;
  return Boolean(
    record?._caseReference ||
    record?.caseCode ||
    record?.caseName ||
    record?.projectCode ||
    record?.projectName ||
    record?.[CONFIG.caseRelationField] ||
    record?.[CONFIG.caseOppositeRelationField],
  );
};

const getLegalStudyTitle = (record) =>
  record?.title ||
  record?.name ||
  record?.studyName ||
  record?.legalStudyName ||
  record?.code ||
  (extractId(record) ? `Legal Study #${extractId(record)}` : "Legal Study");

const getLegalStudyRelationId = (record) => {
  for (const field of CONFIG.legalStudyRelationFieldCandidates) {
    const id = extractId(record?.[field]);
    if (id) return id;
  }
  return extractId(record?._legalStudyId);
};

const withLegalStudyMeta = (row, study) =>
  row && typeof row === "object"
    ? {
      ...row,
      _legalStudy: study || row._legalStudy,
      _legalStudyId: extractId(study) || row._legalStudyId || getLegalStudyRelationId(row),
    }
    : extractId(row)
      ? { id: idValue(row), _legalStudy: study || null, _legalStudyId: extractId(study) || null }
      : row; const buildRelationUrl = (url, parentKey) => {
        if (url.includes('.')) {
          const [parentCollection, relationAction] = url.split('.');
          const [relationName, action] = relationAction.split(':');
          return `${parentCollection}/${encodeURIComponent(parentKey)}/${relationName}:${action}`;
        }
        return `${url}?filterByTk=${encodeURIComponent(parentKey)}`;
      };

const fetchAllList = async (url, params = {}) => {
  const all = [];
  let page = 1;

  while (page <= 20) {
    const response = await ctx.api.request({
      url,
      params: {
        page,
        pageSize: CONFIG.pageSize,
        ...params,
      },
    });
    const data = getResponseData(response);
    const rows = Array.isArray(data) ? data : data ? [data] : [];
    all.push(...rows);

    const meta = getResponseMeta(response);
    const totalPage = Number(meta.totalPage || meta.totalPages || 0);
    const total = Number(meta.count || meta.total || 0);
    if (!rows.length) break;
    if (total && all.length >= total) break;
    if (totalPage && page >= totalPage) break;
    if (rows.length < CONFIG.pageSize) break;
    page += 1;
  }

  return all;
};

const fetchWithCandidates = async (urls, params) => {
  let lastError = null;
  for (const url of urls) {
    try {
      return await fetchAllList(url, params);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("No API candidate worked");
};

const createWithCandidates = async (urls, payload) => {
  let lastError = null;
  for (const url of urls) {
    try {
      const response = await ctx.api.request({
        url,
        method: "POST",
        data: payload,
      });
      return getResponseData(response);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("No create API candidate worked");
};

const updateWithCandidates = async (urls, id, payload) => {
  const safeId = idValue(id);
  if (!hasUsableId(safeId)) throw new Error("Missing update id");
  let lastError = null;
  for (const url of urls) {
    try {
      return await ctx.api.request({
        url: `${url}?filterByTk=${encodeURIComponent(safeId)}`,
        method: "POST",
        data: payload,
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("No update API candidate worked");
};

const destroyWithCandidates = async (urls, id) => {
  const safeId = idValue(id);
  if (!hasUsableId(safeId)) throw new Error("Missing destroy id");
  let lastError = null;
  for (const url of urls) {
    try {
      return await ctx.api.request({
        url: `${url}?filterByTk=${encodeURIComponent(safeId)}`,
        method: "POST",
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("No destroy API candidate worked");
};

const fetchOneById = async (urls, id, params = {}) => {
  const safeId = idValue(id);
  if (!hasUsableId(safeId)) return null;
  for (const url of urls) {
    try {
      const response = await ctx.api.request({
        url: `${url}?filterByTk=${encodeURIComponent(safeId)}`,
        params,
      });
      const data = getResponseData(response);
      if (data) return data;
    } catch {
      // Try next candidate.
    }
  }
  return null;
};

const getInternalCompanyId = (record) =>
  extractId(record?.internalCompanyId) ||
  extractId(record?.internalCompany) ||
  extractId(record?.companyId) ||
  extractId(record?.company);

const getCurrentUserId = () =>
  extractId(ctx.currentUser?.id) ||
  extractId(ctx.state?.currentUser?.id) ||
  extractId(ctx.app?.currentUser?.id) ||
  extractId(ctx.record?.createdById);

const normalizeKey = (value) => String(value || "").trim().toLowerCase();

const getUploadFileObject = (file) => file?.originFileObj || file;

const getUploadRelativePath = (file) => {
  const rawFile = getUploadFileObject(file);
  return String(
    rawFile?.webkitRelativePath ||
    file?.webkitRelativePath ||
    rawFile?.relativePath ||
    file?.relativePath ||
    rawFile?.path ||
    file?.path ||
    rawFile?.name ||
    file?.name ||
    ""
  ).replace(/\\/g, "/");
};

const getUploadRootFolderName = (files) => {
  for (const file of asArray(files)) {
    const relativePath = getUploadRelativePath(file);
    const parts = String(relativePath || "").split("/").filter(Boolean);
    if (parts.length > 1) return parts[0];
  }
  return "";
};

const uploadAttachment = async (file, fileName = null) => {
  const rawFile = getUploadFileObject(file);
  const formData = new window.FormData();
  formData.append("file", rawFile, fileName || rawFile?.name || file?.name || "file");
  const uploadRes = await ctx.api.request({
    url: "attachments:create",
    method: "POST",
    params: { attachmentField: CONFIG.attachmentField },
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
  });
  const attachment = uploadRes?.data?.data;
  if (!attachment?.id) throw new Error("Upload file failed");
  return attachment;
};

const createDocumentRecord = (payload) => createWithCandidates(["documents:create"], payload);
const createFolderRecord = (payload) => createWithCandidates(["folders:create"], payload);

const createLegalReferenceScopePayload = (referenceId, internalCompanyId) => ({
  storageType: CONFIG.legalReferenceStorageType,
  moduleScope: CONFIG.legalReferenceModuleScope,
  legalReferenceId: idValue(referenceId),
  ...(internalCompanyId ? { internalCompanyId: idValue(internalCompanyId) } : {}),
});

const createDocumentPayload = ({
  file,
  fileName,
  attachment,
  fileIndex,
  folderId,
  referenceId,
  internalCompanyId,
}) => {
  const nowIso = new Date().toISOString();
  const userId = getCurrentUserId();
  const safeFileName = fileName || file?.name || "file";
  return {
    name: safeFileName,
    title: safeFileName,
    documentCode: "",
    fileIndex,
    fileAttachment: [{ id: attachment.id }],
    createdAt: nowIso,
    updatedAt: nowIso,
    uploadedAt: nowIso,
    uploaded_at: nowIso,
    ...(folderId ? { folderId: idValue(folderId) } : {}),
    ...(userId ? { uploadedById: userId, createdById: userId, updatedById: userId } : {}),
    ...createLegalReferenceScopePayload(referenceId, internalCompanyId),
  };
};

const getReferenceTitle = (record) => {
  if (!record) return "Legal Reference";
  const title = record.title || record.name || record.referenceName || "";
  if (title) return title;
  const sourceCase = getSourceCase(record);
  if (sourceCase) return getCaseTitle(sourceCase);
  return `Legal Reference #${extractId(record) || ""}`;
};

const getCaseTitle = (record) => {
  if (!record) return "Case";
  const code = record.caseCode || record.projectCode || record.code || "";
  const title = record.projectName || record.caseName || record.title || record.name || "";
  if (code && title) return `${code} - ${title}`;
  return title || code || `Case #${extractId(record) || ""}`;
};

const getSourceCase = (reference) =>
  reference?._caseReference ||
  (isLegalReferenceCase(reference) ? reference : null) ||
  reference?._sourceCase ||
  reference?.sourceCase ||
  reference?.sourceProject ||
  reference?.caseSource ||
  reference?.projectSource ||
  reference?.case ||
  reference?.project ||
  null;

const getSourceCaseId = (reference) =>
  extractId(reference?._caseReference) ||
  (isLegalReferenceCase(reference) ? extractId(reference) : null) ||
  extractId(reference?.sourceCaseId) ||
  extractId(reference?.sourceCase) ||
  extractId(reference?.sourceProjectId) ||
  extractId(reference?.sourceProject) ||
  extractId(reference?.caseSourceId) ||
  extractId(reference?.caseSource) ||
  extractId(reference?.projectSourceId) ||
  extractId(reference?.projectSource) ||
  extractId(reference?.caseId) ||
  extractId(reference?.case) ||
  extractId(reference?.projectId) ||
  extractId(reference?.project);

const parseStoredIds = (value) => {
  if (value === null || value === undefined || value === "") return [];
  if (Array.isArray(value)) return value.map(extractId).filter(Boolean).map(String);
  if (typeof value === "object") return extractIds(value).map(String);
  const text = String(value || "").trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map(extractId).filter(Boolean).map(String);
  } catch {
    // Fall back to comma separated values.
  }
  return text.split(",").map((item) => item.trim()).filter(Boolean);
};

const serializeIds = (ids) =>
  JSON.stringify(Array.from(new Set(asArray(ids).map(extractId).filter(Boolean).map(String))));

const getSelectionSourceType = (folderIds, documentIds, emptyType = CONFIG.sourceTypeDossier) => {
  const folderCount = asArray(folderIds).filter(Boolean).length;
  const documentCount = asArray(documentIds).filter(Boolean).length;
  if (folderCount && documentCount) return CONFIG.sourceTypeMixed;
  if (folderCount) return CONFIG.sourceTypeFolder;
  if (documentCount) return CONFIG.sourceTypeDocument;
  return emptyType;
};

const getReferenceSourceSpace = (reference) => {
  const sourceSpace = normalizeKey(reference?.sourceSpace || reference?.storageType || reference?.moduleScope);
  if (sourceSpace) return sourceSpace;
  const kind = normalizeKey(reference?.referenceKind || reference?.kind || reference?.type);
  if (kind === CONFIG.legalStudyReferenceKind) return CONFIG.legalStudyStorageType;
  return CONFIG.legalReferenceStorageType;
};

const getReferenceSourceType = (reference) =>
  normalizeKey(reference?.sourceType || reference?.selectionType || reference?.itemType);

const getSourceLegalReferenceId = (reference) =>
  extractId(reference?.sourceLegalReferenceId) ||
  extractId(reference?.sourceLegalReference) ||
  extractId(reference?.parentLegalReferenceId) ||
  extractId(reference?.baseLegalReferenceId);

const isCaseBasedReference = (reference) => {
  if (!reference) return false;
  if (reference?._caseReference) return true;
  const kind = normalizeKey(reference?.referenceKind || reference?.kind || reference?.type);
  if (kind === CONFIG.standaloneReferenceKind) return false;
  if (kind === CONFIG.legalStudyReferenceKind || getReferenceSourceSpace(reference) === CONFIG.legalStudyStorageType) return false;
  if (kind === CONFIG.caseReferenceKind || kind === "case" || kind === "case_reference") return true;
  if (isLegalReferenceCase(reference)) return true;
  return !!getSourceCaseId(reference);
};

const isLegalStudyReference = (reference) =>
  normalizeKey(reference?.referenceKind || reference?.kind || reference?.type) === CONFIG.legalStudyReferenceKind ||
  getReferenceSourceSpace(reference) === CONFIG.legalStudyStorageType;

const isStandaloneReference = (reference) => !isCaseBasedReference(reference) && !isLegalStudyReference(reference);

const getReferenceKindLabelMojibake = (reference) =>
  isCaseBasedReference(reference)
    ? "Case Reference"
    : isLegalStudyReference(reference)
      ? "Legal Study"
      : "Case Reference";

const getReferenceKindLabelLegacyMojibake = (reference) =>
  isCaseBasedReference(reference) ? "Case Reference" : "Folder";

const getReferenceSubtitleMojibake = (reference) => {
  if (isCaseBasedReference(reference)) {
    const source = getSourceCase(reference);
    const closedAt = source?.closedDate || source?.closedAt || source?.endDate;
    const status = source?.status;
    return [status, closedAt ? `Closed ${formatDate(closedAt)}` : ""].filter(Boolean).join(" · ") ||
      "Source case in system";
  }
  return reference?.description || "Standalone reference dossier";
};

const getReferenceKindLabel = (reference) =>
  isLegalStudyReference(reference)
    ? "Legal Study"
    : isCaseBasedReference(reference)
      ? "Case Reference"
      : "Legal Reference";

const getReferenceKindLabelLegacy = (reference) =>
  isCaseBasedReference(reference) ? "Case Reference" : "Folder";

const getReferenceSubtitle = (reference) => {
  if (isCaseBasedReference(reference)) {
    const source = getSourceCase(reference);
    const closedAt = source?.closedDate || source?.closedAt || source?.endDate;
    const status = source?.status;
    return [status, closedAt ? `Closed ${formatDate(closedAt)}` : ""].filter(Boolean).join(" · ") ||
      "Case Reference in system";
  }
  return reference?.description || "Standalone reference dossier";
};

const normalizeSearchValue = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();

const matchesSearchParts = (parts, query) => {
  const q = normalizeSearchValue(query);
  if (!q) return true;
  return normalizeSearchValue(parts.filter(Boolean).join(" ")).includes(q);
};

const toPlainText = (value) =>
  String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

const getCaseSummary = (record) => toPlainText(record?.description);

const caseSearchParts = (record) => [
  getCaseTitle(record),
  record?.caseCode,
  record?.projectCode,
  record?.caseName,
  record?.projectName,
  record?.status,
  record?.projectStatus,
  record?.description,
  record?.customer?.name,
  record?.customers?.name,
];

const referenceSearchParts = (record) => [
  getReferenceTitle(record),
  record?.referenceCode,
  record?.title,
  record?.description,
  record?.status,
  record?.priority,
];

const getLinkReference = (link) =>
  // New normalized format: { id, type, reference, ... }
  link?.reference ||
  // Legacy fields kept for backwards compatibility
  link?._caseReference ||
  link?.caseReference ||
  link?.legal_references ||
  link?.case ||
  link?.cases ||
  link?._legalReference ||
  link?.legalReference ||
  link?.legalReferences ||
  link?._legalStudy ||
  link?.legalStudy ||
  link?.legalStudies ||
  link?.legalReferenceId ||
  null;

const getLinkReferenceId = (link) =>
  extractId(link?.reference) ||
  extractId(getLinkReference(link)) ||
  extractId(link?.caseReferenceId) ||
  extractId(link?.caseId) ||
  extractId(link?.case) ||
  extractId(link?.legalReferenceId) ||
  extractId(link?.legalReference) ||
  extractId(link?.legalStudyId) ||
  extractId(link?.legalStudy);

const getAttachment = (doc) =>
  Array.isArray(doc?.fileAttachment) ? doc.fileAttachment[0] : doc?.fileAttachment;

const getFullUrl = (url) => {
  if (!url) return null;
  const text = String(url);
  return /^https?:\/\//i.test(text) ? text : `${window.location.origin}${text}`;
};

const getFileUrl = (doc) => {
  const attachment = getAttachment(doc);
  return getFullUrl(attachment?.url || attachment?.preview || doc?.googleDriveUrl);
};

const getFileName = (doc) => {
  const attachment = getAttachment(doc);
  return (
    attachment?.title ||
    attachment?.filename ||
    doc?.title ||
    doc?.name ||
    doc?.googleDriveUrl ||
    "Document"
  );
};

const getFileExt = (doc) => {
  const attachment = getAttachment(doc);
  const ext = attachment?.extname || "";
  if (ext) return String(ext).replace(".", "").toUpperCase();
  const name = getFileName(doc);
  const parts = String(name).split(".");
  return parts.length > 1 ? parts.pop().toUpperCase() : "FILE";
};

const formatBytes = (value) => {
  const bytes = Number(value || 0);
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const getPreviewKind = (doc) => {
  const ext = getFileExt(doc).toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico"].includes(ext)) return "image";
  if (ext === "pdf") return "iframe";
  if (["mp4", "webm", "ogg", "mov", "m4v"].includes(ext)) return "video";
  if (["mp3", "wav", "aac", "m4a", "flac", "oga"].includes(ext)) return "audio";
  if (["txt", "md", "csv", "json", "xml", "html", "htm", "css", "js", "ts", "log"].includes(ext)) return "text";
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp"].includes(ext)) return "office";
  return "iframe";
};

const getPreviewUrl = (doc) => {
  const fileUrl = getFileUrl(doc);
  if (!fileUrl) return null;
  return getPreviewKind(doc) === "office"
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
    : fileUrl;
};

const getParentId = (folder) => extractId(folder?.parentId) || extractId(folder?.parent);
const getFolderId = (folder) => extractId(folder?.id) || extractId(folder);
const getDocFolderId = (doc) => extractId(doc?.folderId) || extractId(doc?.folder);

const referenceFieldsOnCase = [
  "legalReference",
  "legalReferences",
  "legalReferenceId",
  "legalReferenceRecord",
];

const referenceFieldsOnDocument = [
  "legalReferenceId",
  "legalReference",
  "legalReferences",
  "legalReferenceRecord",
];

const getDirectReferenceIdsFromCase = (record) => {
  const ids = [];
  referenceFieldsOnCase.forEach((field) => ids.push(...extractIds(record?.[field])));
  return Array.from(new Set(ids));
};

const getDirectReferenceObjectsFromCase = (record) => {
  const rows = [];
  referenceFieldsOnCase.forEach((field) => {
    asArray(record?.[field]).forEach((item) => {
      if (item && typeof item === "object" && extractId(item)) rows.push(item);
    });
  });
  return uniqById(rows);
};

const getRecordReferenceIds = (record) => {
  const ids = [];
  referenceFieldsOnDocument.forEach((field) => ids.push(...extractIds(record?.[field])));
  return Array.from(new Set(ids));
};

const recordMatchesReference = (record, referenceId) =>
  getRecordReferenceIds(record).some((id) => String(id) === String(referenceId));

const scalarReferenceFilters = (referenceId) =>
  referenceFieldsOnDocument
    .filter((field) => field.endsWith("Id"))
    .map((field) => ({ [field]: { $eq: idValue(referenceId) } }));

const addRelationLink = async (relationName, sourceCaseId, targetId) => {
  const sourceValue = idValue(sourceCaseId);
  const targetValue = idValue(targetId);
  if (!hasUsableId(sourceValue) || !hasUsableId(targetValue)) {
    throw new Error("Missing source or target ID");
  }
  const candidates = [
    `projects/${encodeURIComponent(sourceValue)}/${relationName}:add`,
    `cases/${encodeURIComponent(sourceValue)}/${relationName}:add`,
  ];
  const payloads = [
    { tk: targetValue },
    { tks: [targetValue] },
  ];

  let lastError = null;
  for (const url of candidates) {
    for (const data of payloads) {
      try {
        console.log(`[addRelationLink] trying POST ${url}`, data);
        const response = await ctx.api.request({ url, method: "POST", data });
        console.log(`[addRelationLink] SUCCESS ${url}`);
        return getResponseData(response);
      } catch (error) {
        const status = error?.response?.status || error?.status;
        console.warn(`[addRelationLink] FAIL ${url} status=${status}`, error?.message);
        lastError = error;
      }
    }
  }
  throw lastError || new Error(`Failed to link ${relationName}`);
};

const removeRelationLink = async (relationName, sourceCaseId, targetId) => {
  const sourceValue = idValue(sourceCaseId);
  const targetValue = idValue(targetId);
  if (!hasUsableId(sourceValue) || !hasUsableId(targetValue)) {
    throw new Error("Missing source or target ID");
  }

  const candidates = [
    `projects/${encodeURIComponent(sourceValue)}/${relationName}:remove`,
    `cases/${encodeURIComponent(sourceValue)}/${relationName}:remove`,
  ];

  const payloads = [
    { tk: targetValue },
    { tks: [targetValue] },
  ];

  let lastError = null;
  for (const url of candidates) {
    for (const data of payloads) {
      try {
        console.log(`[removeRelationLink] trying POST ${url}`, data);
        const response = await ctx.api.request({ url, method: "POST", data });
        console.log(`[removeRelationLink] SUCCESS ${url}`);
        return getResponseData(response);
      } catch (error) {
        const status = error?.response?.status || error?.status;
        console.warn(`[removeRelationLink] FAIL ${url} status=${status}`, error?.message);
        lastError = error;
      }
    }
  }
  throw lastError || new Error(`Failed to unlink ${relationName}`);
};

// Root-folder-only permission model (see Library.js's getFolderPermissions):
// a case's document folders sit under exactly one root folder, and only
// that root folder's own folderMembers rows grant access — subfolders never
// carry their own grants. Finds that root among the case's folders as the
// one whose parentId does NOT also belong to this case's own folder set
// (i.e. its parent is the customer folder, or none).
const findCaseRootFolderId = async (caseIdForFolders) => {
  const safeCaseId = idValue(caseIdForFolders);
  if (!hasUsableId(safeCaseId)) return null;
  let rows = [];
  try {
    rows = await fetchAllList("folders:list", {
      filter: buildFilter({ projectId: { $eq: safeCaseId } }),
      fields: "id,parentId,projectId",
    });
  } catch (error) {
    console.warn("[LegalReferenceWorkspace] fetch case folders failed", caseIdForFolders, error);
    return null;
  }
  const folders = activeRows(rows);
  if (!folders.length) return null;
  const idsInCase = new Set(folders.map((row) => String(extractId(row))));
  const root = folders.find((row) => {
    const parentId = extractId(row?.parentId);
    return !parentId || !idsInCase.has(String(parentId));
  });
  return extractId(root || folders[0]);
};

// Reference/Legal Study counterpart to grantFolderMemberAccess below — when
// linking the current case to a Reference (Legal Study), the current
// case's Members (never its Manager — see handleLinkSubmit) are added as
// viewer-tier legalMembers rows on the target Reference, so they aren't
// blocked from browsing it in Library.js/CaseDocument.js (whose permission
// model for a Reference reads legalMembers, not any case-level relation).
// No-op if the lawyer is already the target's Manager or an existing
// Member — checked against the target's own manager field and a fresh
// legalMembers lookup respectively.
const grantLegalStudyMemberAccess = async (legalStudyId, lawyerId) => {
  const safeLawyerId = idValue(lawyerId);
  const safeStudyId = idValue(legalStudyId);
  if (!hasUsableId(safeLawyerId) || !hasUsableId(safeStudyId)) return;
  const filter = buildFilter({
    legalStudyId: { $eq: safeStudyId },
    memberId: { $eq: safeLawyerId },
  });
  let existing = [];
  try {
    existing = await fetchAllList("legalMembers:list", { filter, pageSize: 1 });
  } catch {
    try {
      existing = await fetchAllList("legalMember:list", { filter, pageSize: 1 });
    } catch {}
  }
  if (activeRows(existing).length) return; // Already a member.

  const payload = { legalStudyId: safeStudyId, memberId: safeLawyerId, role: "viewer" };
  for (const url of ["legalMembers:create", "legalMember:create"]) {
    try {
      await ctx.api.request({ url, method: "POST", data: payload });
      console.log("[grantLegalStudyMemberAccess] legalMembers synced legalStudyId=", safeStudyId, "lawyerId=", safeLawyerId);
      return;
    } catch {}
  }
  console.error("[grantLegalStudyMemberAccess] sync legalMembers FAILED legalStudyId=", safeStudyId, "lawyerId=", safeLawyerId);
};

// Keeps the folder-level permission table (folderMembers, consulted by
// Library.js's document/folder access checks) in sync whenever a lawyer
// gains case-level access via the "assignees" relation above — otherwise a
// newly-granted case Member could open this reference widget but still get
// blocked from browsing the linked case's documents in Library.js. Always
// grants the least-privileged "viewer" role, matching the case-level grant
// (assignees, never promoted to Manager) — see [[feedback_default_role_over_creation_ui]].
const grantFolderMemberAccess = async (targetCaseId, lawyerId) => {
  const safeLawyerId = idValue(lawyerId);
  if (!hasUsableId(safeLawyerId)) return;
  const rootFolderId = await findCaseRootFolderId(targetCaseId);
  if (!hasUsableId(rootFolderId)) return; // Case has no folders/documents yet — nothing to sync.

  try {
    const existing = await fetchAllList("folderMembers:list", {
      filter: buildFilter({
        folderId: { $eq: idValue(rootFolderId) },
        lawyerId: { $eq: safeLawyerId },
      }),
      pageSize: 1,
    });
    if (activeRows(existing).length) return; // Already a member of this folder.
    await ctx.api.request({
      url: "folderMembers:create",
      method: "POST",
      data: { folderId: idValue(rootFolderId), lawyerId: safeLawyerId, role: "viewer" },
    });
    console.log("[grantFolderMemberAccess] folderMembers synced folderId=", rootFolderId, "lawyerId=", safeLawyerId);
  } catch (error) {
    console.error("[grantFolderMemberAccess] sync folderMembers FAILED caseId=", targetCaseId, "lawyerId=", safeLawyerId, error);
  }
};

// Counterpart to grantFolderMemberAccess — used when unlinking a "Legal
// Study" folder link (see removeLinkRecord) and no other link still
// justifies the current case's team having access to targetCaseId's root
// folder. Fetch-then-destroy (rather than a filter-based bulk destroy) so
// it works through the same destroyWithCandidates helper every other
// destroy call in this file goes through.
const revokeFolderMemberAccess = async (targetCaseId, lawyerId) => {
  const safeLawyerId = idValue(lawyerId);
  if (!hasUsableId(safeLawyerId)) return;
  const rootFolderId = await findCaseRootFolderId(targetCaseId);
  if (!hasUsableId(rootFolderId)) return;

  try {
    const existing = await fetchAllList("folderMembers:list", {
      filter: buildFilter({
        folderId: { $eq: idValue(rootFolderId) },
        lawyerId: { $eq: safeLawyerId },
      }),
    });
    await Promise.all(
      activeRows(existing).map((row) => destroyWithCandidates(["folderMembers:destroy"], extractId(row))),
    );
    console.log("[revokeFolderMemberAccess] folderMembers revoked folderId=", rootFolderId, "lawyerId=", safeLawyerId);
  } catch (error) {
    console.error("[revokeFolderMemberAccess] revoke folderMembers FAILED caseId=", targetCaseId, "lawyerId=", safeLawyerId, error);
  }
};

const fetchLinkedRelationRows = async (caseId, relationName, appends = ["createdBy"]) => {
  const safeCaseId = idValue(caseId);
  if (!hasUsableId(safeCaseId)) return [];

  const candidates = [
    `projects/${encodeURIComponent(safeCaseId)}/${relationName}:list`,
    `cases/${encodeURIComponent(safeCaseId)}/${relationName}:list`,
  ];

  for (const url of candidates) {
    try {
      const rows = await fetchAllList(url, { appends });
      console.log(`[OK] ${url} → ${rows.length} rows`);
      return activeRows(rows);
    } catch (error) {
      console.warn(`[FAIL] ${url} → ${error?.response?.status || error?.message}`);
    }
  }
  return [];
};

// ─── REPLACE: fetchCaseReferenceLinks ────────────────────────────────────────
const fetchCaseReferenceLinks = async (record) => {
  const caseId = getCurrentCaseId(record);
  // Guard: không có caseId thì không fetch gì cả
  if (!hasUsableId(caseId)) return [];

  const [legalRefs, caseRefs, legalStudies, legalStudyFolderLinks] = await Promise.all([
    fetchLinkedRelationRows(caseId, "legalReference").catch(() => []),
    fetchLinkedRelationRows(caseId, "caseReferences").catch(() => []),
    fetchLinkedRelationRows(caseId, "legalStudy").catch(() => []),
    // caseLegalStudyLinks — appends "folders" (the belongsTo pointing at the
    // linked Legal Study folder) so its scalar projectId is available for
    // the conditional-revoke check in removeLinkRecord without a second fetch.
    fetchLinkedRelationRows(caseId, CONFIG.legalStudyFolderLinkRelationName, ["createdBy", "folders"]).catch(() => []),
  ]);

  const normalized = [];

  legalRefs.forEach((row) => {
    normalized.push({
      id: `ref-${extractId(row)}`,
      type: "standalone",
      reference: row,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  });

  caseRefs.forEach((row) => {
    normalized.push({
      id: `case-${extractId(row)}`,
      type: "case_based",
      reference: row,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  });

  legalStudies.forEach((row) => {
    normalized.push({
      id: `study-${extractId(row)}`,
      type: "legal_study",
      reference: row,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  });

  legalStudyFolderLinks.forEach((row) => {
    normalized.push({
      id: `study-folder-${extractId(row)}`,
      type: "legal_study_folder",
      reference: row,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  });

  return normalized;
};

const fetchLinkedCasesForReference = async (referenceId) => {
  return [];
};

const fetchRowsForReference = async (resourceUrl, referenceId, appends) => {
  const rows = [];
  for (const filter of scalarReferenceFilters(referenceId)) {
    try {
      const result = await fetchAllList(resourceUrl, {
        filter: buildFilter({
          $and: [
            { isDeleted: { $ne: true } },
            { moduleScope: { $eq: CONFIG.legalReferenceModuleScope } },
            { storageType: { $eq: CONFIG.legalReferenceStorageType } },
            filter,
          ],
        }),
        appends,
      });
      rows.push(...result);
    } catch {
      // Try next field candidate.
    }
  }

  if (rows.length) return activeRows(uniqById(rows));

  try {
    const fallbackRows = await fetchAllList(resourceUrl, {
      filter: buildFilter({
        $and: [
          { isDeleted: { $ne: true } },
          { moduleScope: { $eq: CONFIG.legalReferenceModuleScope } },
          { storageType: { $eq: CONFIG.legalReferenceStorageType } },
        ],
      }),
      appends,
    });
    return activeRows(fallbackRows).filter((row) => recordMatchesReference(row, referenceId));
  } catch {
    return [];
  }
};

const fetchLibraryForReference = async (referenceId) => {
  const [folders, documents] = await Promise.all([
    fetchRowsForReference("folders:list", referenceId, CONFIG.folderAppends),
    fetchRowsForReference("documents:list", referenceId, CONFIG.documentAppends),
  ]);

  return {
    folders: activeRows(uniqById(folders)),
    documents: activeRows(uniqById(documents)),
  };
};

const fetchRowsForStorageSpace = async (resourceUrl, storageType, moduleScope, appends) => {
  try {
    return activeRows(await fetchAllList(resourceUrl, {
      filter: buildFilter({
        $and: [
          { isDeleted: { $ne: true } },
          { storageType: { $eq: storageType } },
        ],
      }),
      appends,
      sort: ["-createdAt"],
    }));
  } catch {
    return [];
  }
};

const mergeRowsById = (...rowSets) => {
  const map = new Map();
  rowSets.flatMap((set) => asArray(set)).forEach((row) => {
    const id = extractId(row);
    if (!id) return;
    const key = String(id);
    map.set(key, { ...(map.get(key) || {}), ...row });
  });
  return Array.from(map.values());
};

const fetchLegalStudyRecords = async () => {
  const appendSets = CONFIG.legalStudyAppends.length ? [CONFIG.legalStudyAppends, []] : [[]];
  for (const appends of appendSets) {
    try {
      const rows = await fetchWithCandidates(CONFIG.legalStudyListCandidates, {
        sort: ["-createdAt"],
        ...(appends.length ? { appends } : {}),
      });
      if (rows.length) return activeRows(rows);
    } catch {
      // Try next append/candidate combination.
    }
  }
  return [];
};

const fetchLegalStudyLibrary = async () => {
  const [studies, folders, documents] = await Promise.all([
    fetchLegalStudyRecords(),
    fetchRowsForStorageSpace("folders:list", CONFIG.legalStudyStorageType, CONFIG.legalStudyModuleScope, CONFIG.folderAppends),
    fetchRowsForStorageSpace("documents:list", CONFIG.legalStudyStorageType, CONFIG.legalStudyModuleScope, CONFIG.documentAppends),
  ]);
  const studyMap = new Map(studies.map((study) => [String(extractId(study)), study]));
  const studyFolders = studies.flatMap((study) =>
    [
      ...relationRows(study?.Folders),
      ...relationRows(study?.folders),
    ].map((folder) => withLegalStudyMeta(folder, study)),
  );
  const studyDocuments = studies.flatMap((study) =>
    [
      ...relationRows(study?.documents),
      ...relationRows(study?.Documents),
    ].map((doc) => withLegalStudyMeta(doc, study)),
  );
  const attachKnownStudy = (row) => {
    const studyId = getLegalStudyRelationId(row);
    return studyId && studyMap.has(String(studyId))
      ? withLegalStudyMeta(row, studyMap.get(String(studyId)))
      : row;
  };

  return {
    studies: activeRows(uniqById(studies)),
    folders: activeRows(mergeRowsById(studyFolders, folders.map(attachKnownStudy))),
    documents: activeRows(mergeRowsById(studyDocuments, documents.map(attachKnownStudy))),
  };
};

const fetchCandidateCaseReferences = async () => {
  let rows = [];
  try {
    rows = await fetchWithCandidates(CONFIG.caseListCandidates, {
      filter: buildFilter({ [CONFIG.caseReferenceFilterField]: { $eq: true } }),
      sort: ["-updatedAt", "-createdAt"],
    });
  } catch (error) {
    console.warn("[JsItemLegalReference] fetchCandidateCaseReferences failed", error);
  }
  return activeRows(rows);
};

const getRowLegalStudyId = (row) =>
  extractId(row?._legalStudyId) ||
  extractId(row?._legalStudy) ||
  getLegalStudyRelationId(row);

const filterLegalStudyLibraryByStudy = (library, studyId) => {
  const selectedId = extractId(studyId);
  const studies = activeRows(library?.studies);
  if (!selectedId) return { studies, folders: [], documents: [] };

  const selectedStudy = studies.find((study) => String(extractId(study)) === String(selectedId)) || null;
  const folders = activeRows(library?.folders).filter((folder) =>
    String(getRowLegalStudyId(folder) || "") === String(selectedId),
  );
  const folderIds = new Set(folders.map((folder) => String(getFolderId(folder))).filter(Boolean));
  const documents = activeRows(library?.documents).filter((doc) => {
    const docStudyId = getRowLegalStudyId(doc);
    if (docStudyId && String(docStudyId) === String(selectedId)) return true;
    const folderId = getDocFolderId(doc);
    return folderId && folderIds.has(String(folderId));
  });

  return {
    studies: selectedStudy ? [selectedStudy] : [],
    folders,
    documents,
  };
};

const sameIdSet = (left, right) => {
  const leftSet = new Set(asArray(left).map(String).filter(Boolean));
  const rightSet = new Set(asArray(right).map(String).filter(Boolean));
  if (leftSet.size !== rightSet.size) return false;
  for (const id of leftSet) {
    if (!rightSet.has(id)) return false;
  }
  return true;
};

const legalStudyReferenceTouchesStudy = (reference, studyId, legalStudyLibrary) => {
  if (!isLegalStudyReference(reference)) return false;
  const selectedId = extractId(studyId);
  if (!selectedId) return false;
  if (String(extractId(reference?.sourceLegalStudyId) || "") === String(selectedId)) return true;

  const scopedLibrary = filterLegalStudyLibraryByStudy(legalStudyLibrary, selectedId);
  const scopedFolderIds = new Set(scopedLibrary.folders.map((folder) => String(getFolderId(folder))).filter(Boolean));
  const scopedDocumentIds = new Set(scopedLibrary.documents.map((doc) => String(extractId(doc))).filter(Boolean));
  const referenceFolderIds = parseStoredIds(reference?.sourceFolderIds);
  const referenceDocumentIds = parseStoredIds(reference?.sourceDocumentIds);

  return referenceFolderIds.some((id) => scopedFolderIds.has(String(id))) ||
    referenceDocumentIds.some((id) => scopedDocumentIds.has(String(id)));
};

const legalStudyReferenceMatchesSelection = (reference, studyId, legalStudyLibrary, folderIds, documentIds) => {
  if (!isLegalStudyReference(reference)) return false;
  const referenceFolderIds = parseStoredIds(reference?.sourceFolderIds);
  const referenceDocumentIds = parseStoredIds(reference?.sourceDocumentIds);
  return sameIdSet(referenceFolderIds, folderIds) && sameIdSet(referenceDocumentIds, documentIds);
};

const getLockedLegalStudySelection = (references, studyId, legalStudyLibrary) => {
  const selectedId = extractId(studyId);
  if (!selectedId) return { folderIds: [], documentIds: [], blockedFolderIds: [] };

  const scopedLibrary = filterLegalStudyLibraryByStudy(legalStudyLibrary, selectedId);
  const folderMap = new Map(scopedLibrary.folders.map((folder) => [String(getFolderId(folder)), folder]));
  const folderIds = new Set();
  const documentIds = new Set();
  const blockedFolderIds = new Set();

  const addDocumentsInFolder = (folderId) => {
    const scopeIds = new Set([String(folderId), ...getDescendantFolderIds(scopedLibrary.folders, folderId).map(String)]);
    scopedLibrary.documents.forEach((doc) => {
      if (scopeIds.has(String(getDocFolderId(doc) || ""))) {
        const docId = extractId(doc);
        if (docId) documentIds.add(String(docId));
      }
    });
  };

  asArray(references).forEach((reference) => {
    if (!legalStudyReferenceTouchesStudy(reference, selectedId, legalStudyLibrary)) return;

    const referenceDocumentIds = parseStoredIds(reference?.sourceDocumentIds);
    const referenceFolderIds = parseStoredIds(reference?.sourceFolderIds);

    if (!referenceDocumentIds.length) {
      referenceFolderIds.forEach((folderId) => {
        if (!folderMap.has(String(folderId))) return;
        folderIds.add(String(folderId));
        blockedFolderIds.add(String(folderId));
        getDescendantFolderIds(scopedLibrary.folders, folderId).forEach((id) => blockedFolderIds.add(String(id)));
        addDocumentsInFolder(folderId);
      });
    }

    referenceDocumentIds.forEach((documentId) => {
      const doc = scopedLibrary.documents.find((item) => String(extractId(item)) === String(documentId));
      if (!doc) return;
      documentIds.add(String(documentId));
      const folderId = getDocFolderId(doc);
      if (folderId) {
        blockedFolderIds.add(String(folderId));
        getAncestorFolderIds(scopedLibrary.folders, folderId).forEach((id) => blockedFolderIds.add(String(id)));
      }
    });
  });

  return {
    folderIds: Array.from(folderIds),
    documentIds: Array.from(documentIds),
    blockedFolderIds: Array.from(blockedFolderIds),
  };
};

const getAncestorFolderIds = (folders, folderId) => {
  const result = [];
  const folderMap = new Map(activeRows(folders).map((folder) => [String(getFolderId(folder)), folder]));
  let current = folderMap.get(String(folderId));
  while (current) {
    const parentId = getParentId(current);
    if (!parentId) break;
    result.push(String(parentId));
    current = folderMap.get(String(parentId));
  }
  return result;
};

const filterLibraryBySourceSelection = (library, reference) => {
  const folderIds = parseStoredIds(reference?.sourceFolderIds);
  const documentIds = parseStoredIds(reference?.sourceDocumentIds);
  if (!folderIds.length && !documentIds.length) return library;

  const selectedFolderSet = new Set(folderIds.map(String));
  const shouldExpandFolders = !documentIds.length;
  if (shouldExpandFolders) {
    folderIds.forEach((folderId) => {
      getDescendantFolderIds(library.folders, folderId).forEach((id) => selectedFolderSet.add(String(id)));
    });
  }

  const selectedDocumentSet = new Set(documentIds.map(String));
  const documents = library.documents.filter((doc) => {
    const docId = String(extractId(doc));
    const folderId = String(getDocFolderId(doc) || "");
    return selectedDocumentSet.has(docId) || (shouldExpandFolders && selectedFolderSet.has(folderId));
  });

  const visibleFolderSet = new Set(selectedFolderSet);
  documents.forEach((doc) => {
    const folderId = getDocFolderId(doc);
    if (folderId) {
      visibleFolderSet.add(String(folderId));
      getAncestorFolderIds(library.folders, folderId).forEach((id) => visibleFolderSet.add(String(id)));
    }
  });

  return {
    folders: library.folders.filter((folder) => visibleFolderSet.has(String(getFolderId(folder)))),
    documents,
  };
};

const fetchLibraryForReferenceSource = async (reference) => {
  if (isLegalStudyReference(reference)) {
    const library = await fetchLegalStudyLibrary();
    return filterLibraryBySourceSelection(library, reference);
  }

  const sourceReferenceId = getSourceLegalReferenceId(reference) || extractId(reference);
  const library = await fetchLibraryForReference(sourceReferenceId);
  return filterLibraryBySourceSelection(library, reference);
};

const getNextReferenceFileIndex = async (referenceId, folderId = null) => {
  try {
    const filters = [
      { isDeleted: { $ne: true } },
      { moduleScope: { $eq: CONFIG.legalReferenceModuleScope } },
      { storageType: { $eq: CONFIG.legalReferenceStorageType } },
      { legalReferenceId: { $eq: idValue(referenceId) } },
    ];
    if (folderId) {
      filters.push({ folderId: { $eq: idValue(folderId) } });
    }
    const rows = await fetchAllList("documents:list", {
      filter: buildFilter({ $and: filters }),
      fields: "id,fileIndex,folderId",
      sort: ["-fileIndex"],
      pageSize: 1,
    });
    const maxIndex = Math.max(0, ...rows.map((row) => Number(row.fileIndex || 0)));
    return maxIndex + 1;
  } catch {
    return 1;
  }
};

const uploadFilesToLegalReference = async (files, referenceId, internalCompanyId, folderId = null) => {
  const rows = asArray(files).map(getUploadFileObject).filter(Boolean);
  if (!rows.length) return true;

  let nextIndex = await getNextReferenceFileIndex(referenceId, folderId);
  for (const file of rows) {
    const attachment = await uploadAttachment(file, file.name);
    await createDocumentRecord(
      createDocumentPayload({
        file,
        fileName: file.name,
        attachment,
        fileIndex: nextIndex,
        folderId,
        referenceId,
        internalCompanyId,
      }),
    );
    nextIndex += 1;
  }
  return true;
};

const uploadFolderToLegalReference = async (files, referenceId, internalCompanyId) => {
  const rows = asArray(files).map(getUploadFileObject).filter(Boolean);
  if (!rows.length) return true;

  const nowIso = new Date().toISOString();
  const userId = getCurrentUserId();
  const folderIdMap = { "": null };
  const folderPaths = new Set();

  rows.forEach((file) => {
    const relativePath = getUploadRelativePath(file);
    const parts = relativePath.split("/");
    parts.pop();
    let currentPath = "";
    parts.forEach((part) => {
      if (!part) return;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      folderPaths.add(currentPath);
    });
  });

  const sortedPaths = Array.from(folderPaths).sort((a, b) => a.split("/").length - b.split("/").length);
  for (const path of sortedPaths) {
    const parts = path.split("/");
    const folderName = parts.pop();
    const parentPath = parts.join("/");
    const parentId = folderIdMap[parentPath] || null;
    const created = await createFolderRecord({
      name: folderName,
      title: folderName,
      type: "custom",
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(parentId ? { parentId: idValue(parentId) } : {}),
      ...(userId ? { createdById: userId, updatedById: userId } : {}),
      ...createLegalReferenceScopePayload(referenceId, internalCompanyId),
    });
    folderIdMap[path] = extractId(created);
  }

  const fileIndexCache = {};
  const nextIndexForFolder = async (folderId) => {
    const key = String(folderId || "root");
    if (fileIndexCache[key] === undefined) {
      fileIndexCache[key] = await getNextReferenceFileIndex(referenceId, folderId);
      return fileIndexCache[key];
    }
    fileIndexCache[key] += 1;
    return fileIndexCache[key];
  };

  for (const file of rows) {
    const relativePath = getUploadRelativePath(file);
    const parts = relativePath.split("/");
    const fileName = parts.pop() || file.name;
    const parentPath = parts.join("/");
    const folderId = folderIdMap[parentPath] || null;
    const attachment = await uploadAttachment(file, fileName);
    await createDocumentRecord(
      createDocumentPayload({
        file,
        fileName,
        attachment,
        fileIndex: await nextIndexForFolder(folderId),
        folderId,
        referenceId,
        internalCompanyId,
      }),
    );
  }
  return true;
};

const fetchDocumentCountForLink = async (link) => {
  const reference = getLinkReference(link);
  if (!reference) return 0;
  if (isCaseBasedReference(reference)) return null;
  const library = await fetchLibraryForReferenceSource(reference);
  return library.documents.length;
};

const countDescendantFolders = (folders, folderId) => {
  const id = String(folderId);
  let count = 0;
  folders.forEach((folder) => {
    if (String(getParentId(folder) || "") === id) {
      count += 1 + countDescendantFolders(folders, getFolderId(folder));
    }
  });
  return count;
};

const getDescendantFolderIds = (folders, folderId) => {
  const result = [];
  const id = String(folderId);
  folders.forEach((folder) => {
    if (String(getParentId(folder) || "") === id) {
      const childId = String(getFolderId(folder));
      result.push(childId, ...getDescendantFolderIds(folders, childId));
    }
  });
  return result;
};

function LegalReferenceWorkspace() {
  const [linkForm] = Form.useForm();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [links, setLinks] = React.useState([]);
  const [filterKind, setFilterKind] = React.useState("all");
  const [searchText, setSearchText] = React.useState("");
  const [stats, setStats] = React.useState({});

  const [linkModalOpen, setLinkModalOpen] = React.useState(false);
  const [linkMode, setLinkMode] = React.useState("case");
  const [standaloneCreateMode, setStandaloneCreateMode] = React.useState("select");
  const [linkLoading, setLinkLoading] = React.useState(false);
  const [optionLoading, setOptionLoading] = React.useState(false);
  const [caseOptions, setCaseOptions] = React.useState([]);
  // Case Manager/Member access (from the case record's own managerId +
  // assignees — see loadCaseAccessById), keyed by case (project) id —
  // { managerIds: string[], memberIds: string[], allIds: string[] }.
  // Built once per loadLinkOptions() call; used both to scope the "Case"
  // picker list to cases the current lawyer actually has access to, and to
  // auto-grant the current case's team access to a newly-linked case.
  const [caseAccessById, setCaseAccessById] = React.useState({});
  // Manager/Member access of the CURRENT case (the case this widget is
  // embedded in) — resolved once on mount, gates the widget's own actions
  // (Link, Remove) below. Separate from caseAccessById above, which is only
  // populated when the Link modal is opened.
  const [currentCaseAccess, setCurrentCaseAccess] = React.useState(null);
  const [sourcePickerLoading, setSourcePickerLoading] = React.useState(false);
  const [sourcePickerLibrary, setSourcePickerLibrary] = React.useState({ studies: [], folders: [], documents: [] });
  const [legalStudyLibrary, setLegalStudyLibrary] = React.useState({ studies: [], folders: [], documents: [] });
  const [selectedSourceFolderIds, setSelectedSourceFolderIds] = React.useState([]);
  const [selectedSourceDocumentIds, setSelectedSourceDocumentIds] = React.useState([]);
  const [activeSourceFolderId, setActiveSourceFolderId] = React.useState("root");
  const [caseOptionSearch, setCaseOptionSearch] = React.useState("");
  const [selectedCaseIdsForLink, setSelectedCaseIdsForLink] = React.useState([]);
  const [legalStudySearch, setLegalStudySearch] = React.useState("");
  const [selectedLegalStudyId, setSelectedLegalStudyId] = React.useState("");
  // Multi-select list for the "Case Study" tab — mirrors selectedCaseIdsForLink
  // on the "Case" tab. selectedLegalStudyId (singular, above) stays as-is;
  // it only backs the unused folder/document source-picker plumbing further
  // down (renderSourceSelectionPicker is never actually rendered).
  const [selectedLegalStudyIds, setSelectedLegalStudyIds] = React.useState([]);
  // "Legal Study" tab — case-bound Legal Study folders (folderTemplateKey
  // === "legal_study", auto-created inside every case's own folder tree by
  // CaseCreateForm.js), across ALL cases, filtered to folders that have at
  // least one file directly inside them. Distinct from selectedLegalStudyIds
  // above, which picks rows from the standalone `legalStudy` collection.
  // Linking here doesn't create any relation record — it directly grants the
  // current case's team viewer access on the TARGET case's root folder (see
  // handleLinkSubmit), since Library.js's permission model only reads
  // folderMembers off a tree's root, never a subfolder like this one.
  const [caseLegalStudyFolders, setCaseLegalStudyFolders] = React.useState([]);
  const [selectedLegalStudyFolderIds, setSelectedLegalStudyFolderIds] = React.useState([]);
  // Search boxes for the "Case Study" and "Legal Study" tabs' row-list
  // pickers (see renderPickerList) — separate from legalStudySearch above,
  // which only backs the unused folder/document source-picker.
  const [caseStudySearch, setCaseStudySearch] = React.useState("");
  const [legalStudyFolderSearch, setLegalStudyFolderSearch] = React.useState("");
  const [newReferenceFiles, setNewReferenceFiles] = React.useState([]);
  const [newReferenceFolderFiles, setNewReferenceFolderFiles] = React.useState([]);

  // Library (Case Study / Legal Study) — permission state. Resolved once on
  // mount (see the effect below), consumed by hasLibraryEntityAccess to
  // filter both lists down to records the current lawyer is Manager or
  // Member of (admins see everything).
  const [currentUser, setCurrentUser] = React.useState(null);
  const [currentLawyerId, setCurrentLawyerId] = React.useState(null);
  const [legalMemberRows, setLegalMemberRows] = React.useState([]);
  // "Case Reference" list label — caseCode - customer shortName - projectName.
  const [customers, setCustomers] = React.useState([]);

  const [activeReference, setActiveReference] = React.useState(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [libraryLoading, setLibraryLoading] = React.useState(false);
  const [library, setLibrary] = React.useState({ studies: [], folders: [], documents: [] });
  const [linkedCases, setLinkedCases] = React.useState([]);
  const [selectedFolderId, setSelectedFolderId] = React.useState("root");
  const [libraryQuery, setLibraryQuery] = React.useState("");
  const [previewDoc, setPreviewDoc] = React.useState(null);
  const [previewText, setPreviewText] = React.useState("");
  const [previewTextLoading, setPreviewTextLoading] = React.useState(false);
  const [previewTextError, setPreviewTextError] = React.useState(false);

  const currentRecord = getCurrentRecord();
  const caseId = getCurrentCaseId(currentRecord);
  const internalCompanyId = getInternalCompanyId(currentRecord);

  const loadStats = React.useCallback(async (rows) => {
    const nextStats = {};
    await Promise.all(
      rows.map(async (row) => {
        // Support both new { id, type, reference } and legacy formats
        const reference = row?.reference || getLinkReference(row);
        const referenceId = extractId(reference);
        if (!referenceId) return;
        if (row?.type === "case_based" || isCaseBasedReference(reference)) {
          nextStats[String(referenceId)] = { documentCount: null, linkedCaseCount: null };
          return;
        }
        try {
          const documentCount = await fetchDocumentCountForLink(row);
          nextStats[String(referenceId)] = {
            documentCount,
            linkedCaseCount: null,
          };
        } catch {
          nextStats[String(referenceId)] = {
            documentCount: null,
            linkedCaseCount: null,
          };
        }
      }),
    );
    setStats(nextStats);
  }, []);

  const loadLinks = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await fetchCaseReferenceLinks(getCurrentRecord());
      setLinks(rows);
      loadStats(rows);
    } catch (loadError) {
      console.error("[JsItemLegalReference] load links failed", loadError);
      setError(loadError?.message || "Failed to load document references.");
    } finally {
      setLoading(false);
    }
  }, [loadStats]);

  React.useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  React.useEffect(() => {
    const handler = () => loadLinks();
    ctx.element?.addEventListener?.("js-field:value-change", handler);
    return () => ctx.element?.removeEventListener?.("js-field:value-change", handler);
  }, [loadLinks]);

  // Resolve the current user + their lawyer record + every Legal Member row
  // once on mount. Consumed by hasLibraryEntityAccess below to filter the
  // Library's Case Study / Legal Study lists down to records the current
  // lawyer is Manager or Member of — mirrors the permission model already
  // used by Library.js (Document/Library.js), duplicated here since
  // Nocobase JS blocks can't share code across files.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      let resolvedUser = null;
      try {
        const authRes = await ctx.api.request({ url: "auth:check" });
        resolvedUser = authRes?.data?.data || authRes?.data || null;
      } catch (error) {
        console.warn("[LegalReferenceWorkspace] auth:check failed", error);
      }
      if (cancelled) return;
      setCurrentUser(resolvedUser);

      const userId = extractId(resolvedUser?.id);
      if (userId) {
        try {
          const lwRes = await ctx.api.request({
            url: "lawyers:list",
            params: {
              pageSize: 1,
              filter: buildFilter({
                $or: [{ userId: { $eq: userId } }, { createdById: { $eq: userId } }],
              }),
            },
          });
          let lawyer = getResponseData(lwRes)?.[0] || null;
          if (!lawyer) {
            const allLwRes = await ctx.api.request({
              url: "lawyers:list",
              params: { pageSize: 1000, fields: "id,userId,createdById" },
            });
            lawyer = asArray(getResponseData(allLwRes)).find((item) => {
              const linkedId = extractId(item.userId) || extractId(item.user);
              return String(linkedId) === String(userId) || String(extractId(item.createdById)) === String(userId);
            }) || null;
          }
          if (!cancelled) setCurrentLawyerId(lawyer ? extractId(lawyer.id) : null);
        } catch (error) {
          console.warn("[LegalReferenceWorkspace] resolve lawyer failed", error);
        }
      }

      try {
        const rows = await fetchAllList("legalMembers:list", {});
        if (!cancelled) setLegalMemberRows(activeRows(rows));
      } catch {
        try {
          const rows = await fetchAllList("legalMember:list", {});
          if (!cancelled) setLegalMemberRows(activeRows(rows));
        } catch (error) {
          console.warn("[LegalReferenceWorkspace] fetch legalMembers failed", error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Customers list — resolved once on mount, used only to build the
  // "caseCode - shortName - projectName" label for the "Case Reference" list.
  React.useEffect(() => {
    let cancelled = false;
    fetchAllList("customers:list", { pageSize: 1000 })
      .then((rows) => {
        if (!cancelled) setCustomers(activeRows(rows));
      })
      .catch((error) => {
        console.warn("[LegalReferenceWorkspace] fetch customers failed", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const customerById = React.useMemo(() => {
    const map = new Map();
    customers.forEach((item) => {
      const id = extractId(item);
      if (id) map.set(String(id), item);
    });
    return map;
  }, [customers]);

  // "caseCode - shortName - projectName" — matches the label format used
  // elsewhere in the app (e.g. Library.js's Link Case pickers) for case
  // items. Falls back to getCaseTitle if the customer can't be resolved.
  const getCaseReferenceListLabel = React.useCallback((item) => {
    const customerId = extractId(item?.customerId) || extractId(item?.customer);
    const customer = customerId ? customerById.get(String(customerId)) : null;
    const shortName = customer?.shortName || customer?.customerName || customer?.name || "";
    const label = [item?.caseCode, shortName, item?.projectName].filter(Boolean).join(" - ");
    return label || getCaseTitle(item);
  }, [customerById]);

  const isAdminUserLocal = React.useCallback((user) => {
    if (!user) return false;
    return asArray(user.roles).some((role) => {
      const roleName = typeof role === "string" ? role : role?.name;
      return ["admin", "root"].includes(String(roleName || "").toLowerCase());
    });
  }, []);

  // Manager: entity.managerId / entity.manager relation equals the current
  // lawyer. Member: a legalMembers row with the matching legalReferenceId/
  // legalStudyId and memberId. No role-tier distinction needed here — this
  // is a read-only source picker, not an editor, so "has any access" is
  // sufficient (unlike Library.js's viewer/editor/contributed capabilities).
  const hasLibraryEntityAccess = React.useCallback((entity, kind) => {
    if (isAdminUserLocal(currentUser)) return true;
    if (!currentLawyerId) return false;
    const managerId = extractId(entity?.managerId) || extractId(entity?.manager);
    if (managerId && String(managerId) === String(currentLawyerId)) return true;
    const fkField = kind === "legal_study" ? "legalStudyId" : "legalReferenceId";
    const entityId = extractId(entity);
    if (!entityId) return false;
    return legalMemberRows.some((row) => {
      const rowEntityId = extractId(row?.[fkField]);
      if (!rowEntityId || String(rowEntityId) !== String(entityId)) return false;
      const rowMemberId = extractId(row?.memberId) || extractId(row?.member);
      return rowMemberId && String(rowMemberId) === String(currentLawyerId);
    });
  }, [currentUser, currentLawyerId, legalMemberRows, isAdminUserLocal]);

  const linkedReferenceIds = React.useMemo(
    () => new Set(links.map((row) => String(getLinkReferenceId(row))).filter(Boolean)),
    [links],
  );

  const linkedSourceCaseIds = React.useMemo(
    () =>
      new Set(
        links
          .filter((row) => row?.type === "case_based")
          .map((row) => extractId(row?.reference))
          .filter(Boolean)
          .map((id) => String(id)),
      ),
    [links],
  );

  const linkedLegalStudyFolderIds = React.useMemo(
    () =>
      new Set(
        links
          .filter((row) => row?.type === "legal_study_folder")
          .map((row) => extractId(row?.reference?.targetFolderId))
          .filter(Boolean)
          .map((id) => String(id)),
      ),
    [links],
  );

  const buildCaseDetailUrl = React.useCallback((sourceCaseId) => {
    const template = CONFIG.caseDetailUrlTemplate || "";
    const path = template
      ? template.replace("{id}", encodeURIComponent(sourceCaseId))
      : `/admin/61j36bn1f6i/view/${CONFIG.caseViewUid}/tab/e4dd54e3dbc/filterbytk/${encodeURIComponent(sourceCaseId)}`;
    return /^https?:\/\//i.test(path) ? path : `${window.location.origin}${path}`;
  }, []);

  const openCaseDetailUrl = React.useCallback((sourceCaseId) => {
    const url = buildCaseDetailUrl(sourceCaseId);
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      // Popup bị browser block → thông báo user thay vì redirect
      message?.warning?.("Please allow popups for this site to open case details.");
    }
  }, [buildCaseDetailUrl]);

  const openCaseViewPopup = async (sourceCaseId, sourceCaseRecord) => {
    const safeId = idValue(sourceCaseId);
    if (!hasUsableId(safeId)) {
      message?.warning?.("Source case not found.");
      return;
    }
    const path = CONFIG.caseDetailUrlTemplate.replace("{id}", encodeURIComponent(safeId));
    const url = `${window.location.origin}${path}`;
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      message?.warning?.("Please allow popups for this site to open case details.");
    }
  };

  const openCaseReferenceViewPopup = async (sourceCaseId, sourceCaseRecord) => {
    const safeId = idValue(sourceCaseId);
    if (!hasUsableId(safeId)) {
      message?.warning?.("Source case not found.");
      return;
    }
    const path = CONFIG.caseReferenceDetailUrlTemplate.replace("{id}", encodeURIComponent(safeId));
    const url = `${window.location.origin}${path}`;
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      message?.warning?.("Please allow popups for this site to open case details.");
    }
  };

  const handleOpenReference = (link) => {
    // Only "Case Reference" rows open a view popup — Case Study and
    // Legal Study rows have no dedicated view UID to open.
    const linkType = link?.type;
    const reference = link?.reference || getLinkReference(link);
    if (!reference) return;

    if (linkType === "case_based") {
      // Case Reference: reference IS the case/project record itself
      openCaseReferenceViewPopup(extractId(reference), reference);
    } else if (!linkType && isCaseBasedReference(reference)) {
      // Legacy: look up source case from the reference wrapper
      openCaseReferenceViewPopup(getSourceCaseId(reference), getSourceCase(reference));
    }
  };


  const openPreview = (doc) => {
    if (!getFileUrl(doc)) {
      message?.warning?.("The document does not have a file or URL to preview.");
      return;
    }
    setPreviewDoc(doc);
  };

  const openFileUrl = (doc) => {
    const fileUrl = getFileUrl(doc);
    if (!fileUrl) {
      message?.warning?.("The document does not have a file or URL.");
      return;
    }
    const opened = window.open(fileUrl, "_blank", "noopener,noreferrer");
    if (!opened) window.location.href = fileUrl;
  };
  const resetSourceSelection = React.useCallback(() => {
    setSelectedSourceFolderIds([]);
    setSelectedSourceDocumentIds([]);
    setActiveSourceFolderId("root");
    setSourcePickerLibrary({ studies: [], folders: [], documents: [] });
    setLegalStudySearch("");
  }, []);

  const loadSourceLibraryForLegalReference = React.useCallback(async (referenceId) => {
    setSourcePickerLoading(true);
    setSelectedSourceFolderIds([]);
    setSelectedSourceDocumentIds([]);
    setActiveSourceFolderId("root");
    setLegalStudySearch("");
    try {
      if (!referenceId) {
        setSourcePickerLibrary({ studies: [], folders: [], documents: [] });
        return;
      }
      setSourcePickerLibrary(await fetchLibraryForReference(referenceId));
    } catch (error) {
      console.warn("[JsItemLegalReference] load source library failed", error);
      setSourcePickerLibrary({ studies: [], folders: [], documents: [] });
      message?.warning?.("Failed to load folders/files of the legal reference.");
    } finally {
      setSourcePickerLoading(false);
    }
  }, []);

  const toggleSourceFolder = (folderId, forcedChecked) => {
    const key = String(folderId || "");
    if (!key || key === "root") {
      setActiveSourceFolderId("root");
      return;
    }

    const selectionLibrary = linkMode === "legal_study" ? selectedLegalStudyLibrary : sourcePickerLibrary;
    const lockedFolders = linkMode === "legal_study"
      ? new Set([
        ...asArray(selectedLegalStudyLockedSelection.folderIds).map(String),
        ...asArray(selectedLegalStudyLockedSelection.blockedFolderIds).map(String),
      ])
      : new Set();
    if (lockedFolders.has(key)) return;

    const folderScopeIds = [key, ...getDescendantFolderIds(selectionLibrary.folders, key).map(String)];
    const currentFolderSet = new Set(selectedSourceFolderIds.map(String));
    const shouldSelect =
      typeof forcedChecked === "boolean"
        ? forcedChecked
        : !folderScopeIds.every((id) => currentFolderSet.has(id));

    setActiveSourceFolderId(key);
    setSelectedSourceFolderIds((prev) => {
      const next = new Set(prev.map(String));
      folderScopeIds.forEach((id) => {
        if (shouldSelect) next.add(id);
        else next.delete(id);
      });
      return Array.from(next);
    });
  };

  const toggleSourceDocument = (documentId) => {
    const key = String(documentId);
    const lockedDocuments = linkMode === "legal_study"
      ? new Set(asArray(selectedLegalStudyLockedSelection.documentIds).map(String))
      : new Set();
    if (lockedDocuments.has(key)) return;

    setSelectedSourceDocumentIds((prev) =>
      prev.includes(key) ? prev.filter((id) => id !== key) : [...prev, key],
    );
  };

  // Case root-folder resolution + Manager/Member access batch-fetch, shared
  // by the "Case" picker's scope filter and the auto-grant-access logic on
  // submit. Mirrors Library.js's Customer/Case folder permission model
  // (folderManagers/folderMembers keyed by the case's root folder) —
  // duplicated here since Nocobase JS blocks can't share code across files.
  // Sole source of truth for "who is Manager/Member of a case": the case
  // (projects) record's own managerId field and assignees relation.
  // Deliberately does NOT look at folders/folderManagers/folderMembers —
  // those depend on a root folder existing (a brand-new case with zero
  // documents has none yet), which previously locked out the case's own
  // real Manager.
  const loadCaseAccessById = React.useCallback(async (caseIds) => {
    const uniqueCaseIds = Array.from(new Set(asArray(caseIds).map((id) => String(extractId(id))).filter(Boolean)));
    if (!uniqueCaseIds.length) return {};

    let caseRecords = [];
    try {
      caseRecords = await fetchAllList("projects:list", {
        filter: buildFilter({ id: { $in: uniqueCaseIds.map((id) => idValue(id)) } }),
        appends: ["assignees"],
      });
    } catch (error) {
      console.warn("[LegalReferenceWorkspace] fetch case records failed", error);
    }
    console.log("[loadCaseAccessById] caseIds=", uniqueCaseIds, "fetched case records=", caseRecords);

    const accessByCaseId = {};
    caseRecords.forEach((record) => {
      const caseIdKey = String(extractId(record));
      if (!caseIdKey) return;
      const managerId = extractId(record?.managerId) || extractId(record?.manager);
      const managerIds = managerId ? [String(managerId)] : [];
      const memberIds = relationRows(record?.assignees)
        .map((row) => String(extractId(row)))
        .filter(Boolean);
      accessByCaseId[caseIdKey] = {
        managerIds,
        memberIds,
        allIds: Array.from(new Set([...managerIds, ...memberIds])),
      };
    });
    console.log("[loadCaseAccessById] final accessByCaseId=", accessByCaseId);
    return accessByCaseId;
  }, []);

  // Resolve the current case's own Manager/Member access once caseId is
  // known — gates the widget's action buttons (Link, Remove) below.
  React.useEffect(() => {
    if (!hasUsableId(caseId)) return;
    let cancelled = false;
    loadCaseAccessById([caseId])
      .then((accessMap) => {
        if (!cancelled) setCurrentCaseAccess(accessMap[String(idValue(caseId))] || null);
      })
      .catch(() => {
        if (!cancelled) setCurrentCaseAccess(null);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId, loadCaseAccessById]);

  // Strict permission gate for this widget's own actions (Link, Remove):
  // ONLY the current case's Manager (or an admin) may act. A Member is
  // explicitly excluded here — Members can view the References list but
  // every action (Link, Remove) is blocked for them, same as anyone with
  // no case role at all.
  const canManageCurrentCase = React.useMemo(() => {
    if (isAdminUserLocal(currentUser)) return true;
    if (!currentLawyerId || !currentCaseAccess) return false;
    return currentCaseAccess.managerIds.includes(String(currentLawyerId));
  }, [currentUser, currentLawyerId, currentCaseAccess, isAdminUserLocal]);

  const loadLinkOptions = React.useCallback(async () => {
    setOptionLoading(true);
    try {
      const [allCases, studyLibrary] = await Promise.all([
        // "Case Reference" now lists every case (no isLegalReference
        // pre-filter) — the checkbox on each row lets the user view/toggle
        // isLegalReference directly instead of it gating visibility.
        // caseReferences is appended so already-existing case↔case links
        // (in either direction) can be shown as a label per row.
        fetchWithCandidates(CONFIG.caseListCandidates, {
          sort: ["-updatedAt", "-createdAt"],
          appends: ["caseReferences"],
        }).catch(() => []),
        fetchLegalStudyLibrary().catch(() => ({ studies: [], folders: [], documents: [] })),
      ]);

      // Only the current case itself is excluded (can't reference itself) —
      // already-linked cases stay in the list (tagged "Already linked" in
      // the UI) so their isLegalReference checkbox is still reachable.
      const candidateCases = activeRows(allCases).filter(
        (item) => String(extractId(item)) !== String(idValue(caseId)),
      );

      const accessByCaseId = await loadCaseAccessById([
        ...candidateCases.map((item) => extractId(item)),
        caseId,
      ]);
      setCaseAccessById(accessByCaseId);

      // Non-admin: only show cases the current lawyer is actually Manager
      // or Member of (root-folder access scope) — admins see every case.
      const scopedCases = isAdminUserLocal(currentUser)
        ? candidateCases
        : candidateCases.filter((item) => {
          if (!currentLawyerId) return false;
          const access = accessByCaseId[String(extractId(item))];
          return access && access.allIds.includes(String(currentLawyerId));
        });
      setCaseOptions(scopedCases);

      // "Legal Study" tab — case-bound Legal Study folders (folderTemplateKey
      // === CONFIG.legalStudyFolderTemplateKey) across every case the current
      // lawyer can see (same access scope as scopedCases above), kept only
      // when the folder has at least one file directly inside it. Sorted by
      // folder.createdAt ascending (earliest first).
      const scopedCaseIds = scopedCases.map((item) => idValue(extractId(item))).filter(hasUsableId);
      let nextCaseLegalStudyFolders = [];
      if (scopedCaseIds.length) {
        try {
          const candidateFolders = activeRows(
            await fetchAllList("folders:list", {
              filter: buildFilter({
                $and: [
                  { isDeleted: { $ne: true } },
                  { folderTemplateKey: { $eq: CONFIG.legalStudyFolderTemplateKey } },
                  { projectId: { $in: scopedCaseIds } },
                ],
              }),
              sort: ["createdAt"],
            }),
          );
          if (candidateFolders.length) {
            const candidateFolderIds = candidateFolders.map((folder) => idValue(getFolderId(folder)));
            const docsInCandidateFolders = await fetchAllList("documents:list", {
              filter: buildFilter({
                $and: [
                  { isDeleted: { $ne: true } },
                  { folderId: { $in: candidateFolderIds } },
                ],
              }),
              fields: "id,folderId",
            }).catch(() => []);
            const folderIdsWithFiles = new Set(
              activeRows(docsInCandidateFolders).map((doc) => String(getDocFolderId(doc))).filter(Boolean),
            );
            const caseByProjectId = new Map(scopedCases.map((item) => [String(extractId(item)), item]));
            nextCaseLegalStudyFolders = candidateFolders
              .filter((folder) => folderIdsWithFiles.has(String(getFolderId(folder))))
              .map((folder) => ({
                folder,
                caseRecord: caseByProjectId.get(String(extractId(folder?.projectId))) || null,
              }))
              .filter((entry) => entry.caseRecord)
              .sort((a, b) => new Date(a.folder?.createdAt || 0) - new Date(b.folder?.createdAt || 0));
          }
        } catch (error) {
          console.warn("[LegalReferenceWorkspace] fetch case-bound legal study folders failed", error);
        }
      }
      setCaseLegalStudyFolders(nextCaseLegalStudyFolders);

      // ── FIX 2: filter Legal Studies đã linked ──
      const linkedStudyIds = new Set(
        links
          .filter((row) => row?.type === "legal_study")
          .map((row) => String(extractId(row?.reference)))
          .filter(Boolean)
      );

      setLegalStudyLibrary({
        ...studyLibrary,
        studies: activeRows(studyLibrary.studies)
          .filter((study) => !linkedStudyIds.has(String(extractId(study))))
          .filter((study) => hasLibraryEntityAccess(study, "legal_study")),
      });

    } finally {
      setOptionLoading(false);
    }
  }, [internalCompanyId, links, caseId, hasLibraryEntityAccess, loadCaseAccessById, isAdminUserLocal, currentUser, currentLawyerId]);

  const openLinkModal = () => {
    if (!canManageCurrentCase) {
      message?.warning?.("Only the case Manager can link references.");
      return;
    }
    linkForm.resetFields();
    setLinkMode("case");
    setStandaloneCreateMode("select");
    setCaseOptionSearch("");
    setLegalStudySearch("");
    setSelectedLegalStudyId("");
    setSelectedLegalStudyIds([]);
    setSelectedLegalStudyFolderIds([]);
    setSelectedCaseIdsForLink([]);
    resetSourceSelection();
    setNewReferenceFiles([]);
    setNewReferenceFolderFiles([]);
    setLinkModalOpen(true);
    loadLinkOptions();
  };

  const selectedLegalStudy = React.useMemo(
    () =>
      activeRows(legalStudyLibrary.studies)
        .find((study) => String(extractId(study)) === String(selectedLegalStudyId)) || null,
    [legalStudyLibrary.studies, selectedLegalStudyId],
  );

  const selectedLegalStudyLibrary = React.useMemo(
    () => filterLegalStudyLibraryByStudy(legalStudyLibrary, selectedLegalStudyId),
    [legalStudyLibrary, selectedLegalStudyId],
  );

  const selectedLegalStudyLockedSelection = React.useMemo(
    () =>
      getLockedLegalStudySelection(
        links.map((row) => getLinkReference(row)),
        selectedLegalStudyId,
        legalStudyLibrary,
      ),
    [links, selectedLegalStudyId, legalStudyLibrary],
  );

  const findCaseBasedReference = async (sourceCaseId) => {
    if (!hasUsableId(sourceCaseId)) return null;
    try {
      const rows = await fetchWithCandidates(CONFIG.referenceListCandidates, {
        filter: buildFilter({ sourceCaseId: { $eq: idValue(sourceCaseId) } }),
      });
      const match = activeRows(rows).find((item) => isCaseBasedReference(item));
      if (match) return (await hydrateSourceCases([match]))[0];
    } catch (error) {
      console.warn("[JsItemLegalReference] find case-based reference failed", error);
    }
    return null;
  };

  const createCaseBasedReference = async (sourceCase) => {
    const sourceCaseId = extractId(sourceCase);
    if (!hasUsableId(sourceCaseId)) throw new Error("Missing source case id");
    const existing = await findCaseBasedReference(sourceCaseId);
    if (existing) return existing;

    const payload = {
      title: getCaseTitle(sourceCase),
      referenceKind: CONFIG.caseReferenceKind,
      sourceCaseId: idValue(sourceCaseId),
      ...(internalCompanyId ? { internalCompanyId: idValue(internalCompanyId) } : {}),
      status: CONFIG.activeStatus,
    };

    const created = await createWithCandidates(CONFIG.referenceCreateCandidates, payload);
    return {
      ...created,
      _sourceCase: sourceCase,
    };
  };

  const createStandaloneReference = async (values) => {
    const fallbackFolderName = getUploadRootFolderName(newReferenceFolderFiles);
    const payload = {
      title: String(values.newStandaloneTitle || fallbackFolderName || "").trim(),
      description: String(values.newStandaloneDescription || "").trim(),
      referenceKind: CONFIG.standaloneReferenceKind,
      ...(internalCompanyId ? { internalCompanyId: idValue(internalCompanyId) } : {}),
      status: CONFIG.activeStatus,
    };
    return createWithCandidates(CONFIG.referenceCreateCandidates, payload);
  };

  const getSelectedSourceTitle = (baseTitle, library, folderIds, documentIds) => {
    const folderIdSet = new Set(asArray(folderIds).map(String));
    const documentIdSet = new Set(asArray(documentIds).map(String));
    const selectedNames = [
      ...library.folders
        .filter((folder) => folderIdSet.has(String(getFolderId(folder))))
        .map((folder) => folder.name || folder.title || "Folder"),
      ...library.documents
        .filter((doc) => documentIdSet.has(String(extractId(doc))))
        .map((doc) => getFileName(doc)),
    ].filter(Boolean);

    if (selectedNames.length === 1) return selectedNames[0];
    return baseTitle;
  };

  const createSourceWrapperReference = async ({
    sourceSpace,
    sourceLegalReference = null,
    sourceFolderIds = [],
    sourceDocumentIds = [],
    sourceLibrary = { studies: [], folders: [], documents: [] },
    fallbackTitle = "",
  }) => {
    const folderIds = Array.from(new Set(asArray(sourceFolderIds).map(String).filter(Boolean)));
    const documentIds = Array.from(new Set(asArray(sourceDocumentIds).map(String).filter(Boolean)));
    const baseTitle = fallbackTitle || getReferenceTitle(sourceLegalReference) || "Legal Reference";
    const title = getSelectedSourceTitle(baseTitle, sourceLibrary, folderIds, documentIds);
    const sourceType = getSelectionSourceType(folderIds, documentIds);

    const payload = {
      title,
      description: `Linked ${sourceSpace === CONFIG.legalStudyStorageType ? "Legal Study" : "Case Reference"} for reference and study.`,
      referenceKind: sourceSpace === CONFIG.legalStudyStorageType
        ? CONFIG.legalStudyReferenceKind
        : CONFIG.legalReferenceKind,
      sourceSpace,
      sourceType,
      ...(sourceLegalReference ? { sourceLegalReferenceId: idValue(extractId(sourceLegalReference)) } : {}),
      sourceFolderIds: serializeIds(folderIds),
      sourceDocumentIds: serializeIds(documentIds),
      ...(internalCompanyId ? { internalCompanyId: idValue(internalCompanyId) } : {}),
      status: CONFIG.activeStatus,
    };

    return createWithCandidates(CONFIG.referenceCreateCandidates, payload);
  };

  const createLegacyLinkRecord = async (referenceId) => {
    if (!hasUsableId(caseId) || !hasUsableId(referenceId)) throw new Error("Missing case or reference id");
    const payload = {
      caseId: idValue(caseId),
      legalReferenceId: idValue(referenceId),
      ...(internalCompanyId ? { internalCompanyId: idValue(internalCompanyId) } : {}),
      status: CONFIG.activeStatus,
    };
    return createWithCandidates(CONFIG.linkCreateCandidates, payload);
  };

  const removeLinkRecord = async (link) => {
    if (!canManageCurrentCase) {
      message?.warning?.("Only the case Manager can remove references.");
      return;
    }
    if (!hasUsableId(caseId)) {
      message?.warning?.("Current case not found.");
      return;
    }

    const linkType = link?.type;
    const reference = link?.reference || getLinkReference(link);
    const referenceId = extractId(reference);

    if (!hasUsableId(referenceId)) {
      message?.warning?.("Reference record not found.");
      return;
    }

    try {
      if (linkType === "legal_study_folder") {
        await destroyWithCandidates(CONFIG.legalStudyFolderLinkDestroyCandidates, referenceId);

        // Conditional revoke: only pull the current team's folderMembers
        // grant off the target case's root folder if no OTHER link still
        // justifies it — another legal_study_folder link pointing at the
        // same target case, or a direct "Case" link to it. Both grant the
        // exact same root folder, so revoking here would otherwise break
        // access the other link still relies on.
        const targetCaseId = extractId(reference?.folders?.projectId) || extractId(reference?.folders?.project);
        if (hasUsableId(targetCaseId)) {
          const hasOtherFolderLink = links.some((row) => {
            if (row?.type !== "legal_study_folder") return false;
            if (String(row?.id) === String(link?.id)) return false;
            const rowTargetCaseId = extractId(row?.reference?.folders?.projectId) || extractId(row?.reference?.folders?.project);
            return String(rowTargetCaseId) === String(targetCaseId);
          });
          const hasDirectCaseLink = links.some(
            (row) => row?.type === "case_based" && String(extractId(row?.reference)) === String(targetCaseId),
          );
          if (!hasOtherFolderLink && !hasDirectCaseLink) {
            const teamIds = currentCaseAccess?.allIds || [];
            await Promise.all(teamIds.map((lawyerId) => revokeFolderMemberAccess(targetCaseId, lawyerId)));
          }
        }
        message?.success?.("Unlinked Legal Study successfully.");
      } else if (linkType === "legal_study") {
        await removeRelationLink("legalStudy", caseId, referenceId);
        message?.success?.("Unlinked Case Study successfully.");
      } else if (linkType === "case_based") {
        await removeRelationLink("caseReferences", caseId, referenceId);
        message?.success?.("Removed Case successfully.");
      } else {
        await removeRelationLink("legalReference", caseId, referenceId);
        message?.success?.("Removed Legal Reference successfully.");
      }
      await loadLinks();
    } catch (err) {
      console.error("[removeLinkRecord] failed", err);
      // Không show error vì removeRelationLink đã thử tất cả candidates
      // Nếu tất cả fail thì reload lại để UI đồng bộ
      await loadLinks();
      message?.warning?.("Could not confirm removal. Please refresh.");
    }
  };

  const confirmRemoveLink = (link) => {
    if (!canManageCurrentCase) {
      message?.warning?.("Only the case Manager can remove references.");
      return;
    }
    const reference = link?.reference || getLinkReference(link);
    const linkType = link?.type;
    const title = linkType === "case_based"
      ? "Remove Case?"
      : linkType === "legal_study_folder"
        ? "Unlink Legal Study?"
        : "Remove Reference?";
    const content = linkType === "legal_study_folder"
      ? (reference?.caseName ? `Legal Study — ${reference.caseName}` : "Legal Study")
      : getReferenceTitle(reference);
    Modal.confirm({
      title,
      content,
      okText: "Remove link",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: () => removeLinkRecord(link),
    });
  };

  const handleLinkSubmit = async () => {
    if (!canManageCurrentCase) {
      message?.warning?.("Only the case Manager can link references.");
      return;
    }
    setLinkLoading(true);
    try {
      const values = await linkForm.validateFields();
      if (!hasUsableId(caseId)) {
        message?.warning?.("Current case not found.");
        return;
      }

      if (linkMode === "case") {
        // Case: link via caseReferences relation — supports linking
        // multiple selected cases in one submit.
        const sourceCaseIds = selectedCaseIdsForLink.filter(
          (id) => !linkedSourceCaseIds.has(String(id)),
        );
        if (sourceCaseIds.length === 0) {
          message?.warning?.("Please select at least one Case.");
          return;
        }
        // One-directional access sync: everyone with access to the current
        // case — its Manager AND its Members alike — is pushed onto each
        // newly-linked case as a plain Member grant (assignees), so nobody
        // on the current case's team is blocked from opening it. Alongside
        // it, also sync the folder-level folderMembers table
        // (grantFolderMemberAccess) so the newly-granted lawyer isn't
        // blocked from that case's documents in Library.js, which still
        // reads folderMembers. No reverse sync — the target case's own
        // team is left untouched on the current case.
        const grantCaseAccess = async (targetCaseId, lawyerId) => {
          try {
            await addRelationLink("assignees", targetCaseId, lawyerId);
            console.log("[grantCaseAccess] assignees synced caseId=", targetCaseId, "lawyerId=", lawyerId);
          } catch (error) {
            console.error("[grantCaseAccess] sync case assignees FAILED caseId=", targetCaseId, "lawyerId=", lawyerId, error);
          }
          await grantFolderMemberAccess(targetCaseId, lawyerId);
        };

        const currentAccess = caseAccessById[String(idValue(caseId))];
        const currentCaseTeamIds = currentAccess?.allIds || [];
        console.log("[handleLinkSubmit] currentCase=", caseId, "currentAccess=", currentAccess);

        let successCount = 0;
        let failedCount = 0;
        for (const sourceCaseId of sourceCaseIds) {
          try {
            await addRelationLink("caseReferences", caseId, sourceCaseId);
            successCount += 1;

            const targetAccess = caseAccessById[String(sourceCaseId)];
            const targetKnownLawyers = new Set((targetAccess?.allIds || []).map(String));
            const missingOnTarget = currentCaseTeamIds.filter((id) => !targetKnownLawyers.has(String(id)));
            console.log("[handleLinkSubmit] missingOnTarget (to grant on case", sourceCaseId, ")=", missingOnTarget);
            await Promise.all(missingOnTarget.map((lawyerId) => grantCaseAccess(sourceCaseId, lawyerId)));
          } catch (error) {
            failedCount += 1;
            console.error("[JsItemLegalReference] link case failed", sourceCaseId, error);
          }
        }
        if (successCount > 0 && failedCount === 0) {
          message?.success?.(
            successCount === 1
              ? "Linked Case successfully."
              : `Linked ${successCount} Cases successfully.`,
          );
        } else if (successCount > 0 && failedCount > 0) {
          message?.warning?.(`Linked ${successCount} Case(s), ${failedCount} failed.`);
        } else {
          message?.error?.("Failed to link Case.");
          return;
        }

      } else if (linkMode === "legal_study") {
        // Reference: supports linking multiple selected Legal Studies in
        // one submit, mirroring the "Case" branch above.
        if (selectedLegalStudyIds.length === 0) {
          message?.warning?.("Please select at least one Reference.");
          return;
        }

        // Same one-directional sync as the Case branch above: everyone
        // with access to the current case — its Manager AND its Members
        // alike — is pushed onto each newly-linked Reference as
        // viewer-tier legalMembers rows, so nobody on the current case's
        // team is blocked from browsing it. Skip anyone who's already the
        // target Reference's own Manager — grantLegalStudyMemberAccess
        // itself dedupes against existing legalMembers rows.
        const currentAccess = caseAccessById[String(idValue(caseId))];
        const currentCaseTeamIds = currentAccess?.allIds || [];

        let successCount = 0;
        let failedCount = 0;
        let alreadyLinkedCount = 0;
        for (const legalStudyId of selectedLegalStudyIds) {
          const legalStudyRecord = activeRows(legalStudyLibrary.studies).find(
            (study) => String(extractId(study)) === String(legalStudyId),
          );
          if (!legalStudyRecord) {
            failedCount += 1;
            continue;
          }
          const isAlreadyLinked = links.some(
            (row) => row?.type === "legal_study" && String(extractId(row?.reference)) === String(legalStudyId),
          );
          if (isAlreadyLinked) {
            alreadyLinkedCount += 1;
            continue;
          }

          try {
            await addRelationLink("legalStudy", caseId, legalStudyId);
            successCount += 1;

            const targetManagerId = extractId(legalStudyRecord?.managerId) || extractId(legalStudyRecord?.manager);
            const membersToGrant = currentCaseTeamIds.filter(
              (id) => !targetManagerId || String(id) !== String(targetManagerId),
            );
            console.log("[handleLinkSubmit] legalStudy=", legalStudyId, "membersToGrant=", membersToGrant);
            await Promise.all(
              membersToGrant.map((lawyerId) => grantLegalStudyMemberAccess(legalStudyId, lawyerId)),
            );
          } catch (error) {
            failedCount += 1;
            console.error("[JsItemLegalReference] link legal study failed", legalStudyId, error);
          }
        }

        if (successCount > 0 && failedCount === 0) {
          message?.success?.(
            successCount === 1
              ? "Linked Reference successfully."
              : `Linked ${successCount} References successfully.`,
          );
        } else if (successCount > 0 && failedCount > 0) {
          message?.warning?.(`Linked ${successCount} Reference(s), ${failedCount} failed.`);
        } else if (failedCount > 0) {
          message?.error?.("Failed to link Reference.");
          return;
        } else if (alreadyLinkedCount > 0) {
          message?.info?.("Selected Reference(s) are already linked to the current case.");
          setLinkModalOpen(false);
          return;
        } else {
          message?.warning?.("Please select at least one Reference.");
          return;
        }

      } else if (linkMode === "legal_study_folder") {
        // Legal Study: creates a caseLegalStudyLinks row (so the link shows
        // up in the References list and can be tracked/removed) AND grants
        // the current case's team (Manager + Members) viewer access on the
        // selected TARGET case's root folder. Library.js's permission model
        // only reads folderManager/folderMembers off a tree's root, never a
        // subfolder like the Legal Study folder itself, so granting there
        // would be silently ignored — the target case's root is the only
        // way to make its Legal Study folder (and the rest of its tree)
        // actually visible to the current team.
        if (selectedLegalStudyFolderIds.length === 0) {
          message?.warning?.("Please select at least one Legal Study.");
          return;
        }

        const alreadyLinkedFolderIds = new Set(
          links
            .filter((row) => row?.type === "legal_study_folder")
            .map((row) => String(extractId(row?.reference?.targetFolderId)))
            .filter(Boolean),
        );

        const currentAccess = caseAccessById[String(idValue(caseId))];
        const currentCaseTeamIds = currentAccess?.allIds || [];

        let successCount = 0;
        let failedCount = 0;
        let alreadyLinkedCount = 0;
        for (const folderId of selectedLegalStudyFolderIds) {
          if (alreadyLinkedFolderIds.has(String(folderId))) {
            alreadyLinkedCount += 1;
            continue;
          }
          const entry = caseLegalStudyFolders.find(
            (item) => String(getFolderId(item.folder)) === String(folderId),
          );
          const targetCaseId = entry ? extractId(entry.caseRecord) : null;
          if (!entry || !hasUsableId(targetCaseId)) {
            failedCount += 1;
            continue;
          }

          try {
            await createWithCandidates(CONFIG.legalStudyFolderLinkCreateCandidates, {
              caseId: idValue(caseId),
              targetFolderId: idValue(folderId),
              folderName: entry.folder?.name || "Legal Study",
              caseName: getCaseReferenceListLabel(entry.caseRecord),
            });
            successCount += 1;

            await Promise.all(
              currentCaseTeamIds.map((lawyerId) => grantFolderMemberAccess(targetCaseId, lawyerId)),
            );
          } catch (error) {
            failedCount += 1;
            console.error("[JsItemLegalReference] link legal study folder failed", folderId, error);
          }
        }

        if (successCount > 0 && failedCount === 0) {
          message?.success?.(
            successCount === 1
              ? "Linked Legal Study successfully."
              : `Linked ${successCount} Legal Studies successfully.`,
          );
        } else if (successCount > 0 && failedCount > 0) {
          message?.warning?.(`Linked ${successCount} Legal Study(s), ${failedCount} failed.`);
        } else if (failedCount > 0) {
          message?.error?.("Failed to link Legal Study.");
          return;
        } else if (alreadyLinkedCount > 0) {
          message?.info?.("Selected Legal Study(s) are already linked to the current case.");
          setLinkModalOpen(false);
          return;
        } else {
          message?.warning?.("Please select at least one Legal Study.");
          return;
        }

      } else {
        message?.warning?.("Unknown link mode.");
        return;
      }

      setLinkModalOpen(false);
      linkForm.resetFields();
      resetSourceSelection();
      setNewReferenceFiles([]);
      setNewReferenceFolderFiles([]);
      setSelectedCaseIdsForLink([]);
      setSelectedLegalStudyIds([]);
      setSelectedLegalStudyFolderIds([]);
      await loadLinks();
    } catch (error) {
      if (error?.errorFields) return;
      console.error("[JsItemLegalReference] link submit failed", error);
      message?.error?.("Failed to create link.");
    } finally {
      setLinkLoading(false);
    }
  };

  const folderMap = React.useMemo(() => {
    const map = new Map();
    library.folders.forEach((folder) => {
      map.set(String(getFolderId(folder)), folder);
    });
    return map;
  }, [library.folders]);

  React.useEffect(() => {
    const fileUrl = getFileUrl(previewDoc);
    if (!previewDoc || !fileUrl || getPreviewKind(previewDoc) !== "text") {
      setPreviewText("");
      setPreviewTextError(false);
      setPreviewTextLoading(false);
      return;
    }

    let cancelled = false;
    setPreviewText("");
    setPreviewTextError(false);
    setPreviewTextLoading(true);

    fetch(fileUrl)
      .then((response) => {
        if (!response.ok) throw new Error("Fetch failed");
        return response.text();
      })
      .then((text) => {
        if (!cancelled) setPreviewText(text);
      })
      .catch(() => {
        if (!cancelled) setPreviewTextError(true);
      })
      .finally(() => {
        if (!cancelled) setPreviewTextLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [previewDoc]);

  const getFolderPath = React.useCallback(
    (folderId) => {
      const id = extractId(folderId);
      if (!id) return "Root";
      const names = [];
      let current = folderMap.get(String(id));
      while (current) {
        names.unshift(current.name || "Folder");
        const parentId = getParentId(current);
        current = parentId ? folderMap.get(String(parentId)) : null;
      }
      return names.length ? names.join(" / ") : "Root";
    },
    [folderMap],
  );

  const buildTree = React.useCallback(
    (parentId) =>
      library.folders
        .filter((folder) => {
          const folderParentId = getParentId(folder);
          if (!parentId) return !folderParentId || !folderMap.has(String(folderParentId));
          return String(folderParentId || "") === String(parentId);
        })
        .map((folder) => {
          const folderId = String(getFolderId(folder));
          const directFiles = library.documents.filter((doc) => String(getDocFolderId(doc) || "") === folderId).length;
          const childFolders = countDescendantFolders(library.folders, folderId);
          return {
            key: folderId,
            title: `${folder.name || "Folder"}${directFiles || childFolders ? ` (${directFiles + childFolders})` : ""}`,
            children: buildTree(folderId),
          };
        }),
    [library.folders, library.documents, folderMap],
  );

  const treeData = React.useMemo(
    () => [
      {
        key: "root",
        title: `All documents (${library.documents.length})`,
        children: buildTree(null),
      },
    ],
    [library.documents.length, buildTree],
  );

  const visibleDocuments = React.useMemo(() => {
    const q = libraryQuery.trim().toLowerCase();
    const selectedFolderIds = selectedFolderId === "root"
      ? null
      : new Set([String(selectedFolderId), ...getDescendantFolderIds(library.folders, selectedFolderId).map(String)]);

    let rows = selectedFolderIds
      ? library.documents.filter((doc) => selectedFolderIds.has(String(getDocFolderId(doc) || "")))
      : library.documents;

    if (q) {
      rows = rows.filter((doc) => {
        const text = `${getFileName(doc)} ${doc.description || ""} ${doc.documentCode || ""}`.toLowerCase();
        return text.includes(q);
      });
    }

    return [...rows].sort((a, b) => new Date(b.uploadedAt || b.createdAt || 0) - new Date(a.uploadedAt || a.createdAt || 0));
  }, [library.documents, library.folders, selectedFolderId, libraryQuery]);

  const selectedFolderName = React.useMemo(() => {
    if (selectedFolderId === "root") return "All documents";
    if (libraryQuery.trim()) return "Search results";
    return folderMap.get(String(selectedFolderId))?.name || "Folder";
  }, [selectedFolderId, libraryQuery, folderMap]);

  const filteredLinks = React.useMemo(() => {
    const q = searchText.trim();
    return links.filter((link) => {
      const linkType = link?.type;
      const reference = link?.reference || getLinkReference(link);
      if (!reference) return false;
      // "case" filter key maps to type "case_based"
      if (filterKind === "case" && linkType !== "case_based") return false;
      // "library" filter key covers "standalone" (Case Study), "legal_study",
      // and "legal_study_folder" (Legal Study)
      if (
        filterKind === "library" &&
        linkType !== "standalone" &&
        linkType !== "legal_study" &&
        linkType !== "legal_study_folder"
      )
        return false;

      if (!q) return true;
      if (linkType === "legal_study_folder") {
        return matchesSearchParts(["Legal Study", reference?.folderName, reference?.caseName], q);
      }
      const title = linkType === "case_based" ? getCaseTitle(reference) : getReferenceTitle(reference);
      const sourceCase = linkType === "case_based" ? reference : getSourceCase(reference);
      return matchesSearchParts([
        title,
        getCaseTitle(sourceCase),
        getCaseSummary(sourceCase),
        reference.description,
        reference.referenceCode,
      ], q);
    });
  }, [links, filterKind, searchText]);

  const filteredCaseOptions = React.useMemo(
    () => caseOptions.filter((item) =>
      matchesSearchParts([
        getCaseReferenceListLabel(item),
        item?.caseCode,
        item?.projectCode,
        item?.description,
      ], caseOptionSearch)
    ),
    [caseOptions, caseOptionSearch, getCaseReferenceListLabel],
  );

  const visibleCaseOptions = React.useMemo(
    () => filteredCaseOptions.slice(0, caseOptionSearch.trim() ? 150 : 80),
    [filteredCaseOptions, caseOptionSearch],
  );

  const filteredCaseStudyOptions = React.useMemo(
    () => activeRows(legalStudyLibrary.studies).filter((study) =>
      matchesSearchParts([getLegalStudyTitle(study)], caseStudySearch)
    ),
    [legalStudyLibrary.studies, caseStudySearch],
  );

  const visibleCaseStudyOptions = React.useMemo(
    () => filteredCaseStudyOptions.slice(0, caseStudySearch.trim() ? 150 : 80),
    [filteredCaseStudyOptions, caseStudySearch],
  );

  const filteredLegalStudyFolderOptions = React.useMemo(
    () => caseLegalStudyFolders.filter((entry) =>
      matchesSearchParts(["Legal Study", getCaseReferenceListLabel(entry.caseRecord)], legalStudyFolderSearch)
    ),
    [caseLegalStudyFolders, legalStudyFolderSearch, getCaseReferenceListLabel],
  );

  const visibleLegalStudyFolderOptions = React.useMemo(
    () => filteredLegalStudyFolderOptions.slice(0, legalStudyFolderSearch.trim() ? 150 : 80),
    [filteredLegalStudyFolderOptions, legalStudyFolderSearch],
  );

  // Shared row-list picker layout for the Link modal's 3 tabs (Case, Case
  // Study, Legal Study) — a bordered list with a header row and a
  // scrollable, checkbox-toggleable body, matching the "Case" tab's
  // original look so all 3 tabs feel like one consistent picker.
  const renderPickerList = ({
    countLabel,
    searchValue,
    onSearchChange,
    searchPlaceholder,
    headerLabel,
    loading,
    items,
    getItemKey,
    isItemDisabled,
    disabledTag,
    isItemSelected,
    onToggleItem,
    renderItemTitle,
    renderItemSubtitle,
    emptyText,
  }) => [
    h(
      "div",
      { key: "pickerCount", style: { marginBottom: 8, color: color.muted, fontSize: 12 } },
      countLabel,
    ),
    h(Input.Search, {
      key: "pickerSearch",
      placeholder: searchPlaceholder,
      value: searchValue,
      onChange: (event) => onSearchChange(event.target.value),
      allowClear: true,
      style: { marginBottom: 10 },
    }),
    h(
      "div",
      {
        key: "pickerList",
        style: { border: `1px solid ${color.border}`, borderRadius: 8, overflow: "hidden" },
      },
      h(
        "div",
        {
          key: "pickerListHeader",
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "8px 12px",
            background: color.bg,
            borderBottom: `1px solid ${color.border}`,
            fontSize: 12,
            fontWeight: 700,
            color: color.muted,
          },
        },
        h("div", null, headerLabel),
      ),
      h(
        "div",
        { key: "pickerListBody", style: { maxHeight: 300, overflowY: "auto" } },
        loading
          ? h("div", { style: { padding: 24, textAlign: "center" } }, h(Spin, null))
          : items.length
            ? h(List, {
              dataSource: items,
              renderItem: (item) => {
                const id = getItemKey(item);
                const disabled = isItemDisabled ? isItemDisabled(item) : false;
                const selected = isItemSelected(id);
                const toggleSelection = () => {
                  if (disabled) return;
                  onToggleItem(id);
                };
                const subtitle = renderItemSubtitle ? renderItemSubtitle(item) : null;
                return h(
                  List.Item,
                  {
                    key: id,
                    onClick: toggleSelection,
                    style: {
                      padding: "10px 12px",
                      cursor: disabled ? "default" : "pointer",
                      background: selected ? color.blueSoft : "transparent",
                      borderLeft: selected ? `3px solid ${color.blue}` : "3px solid transparent",
                    },
                  },
                  h(
                    "div",
                    {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        gap: 12,
                      },
                    },
                    h(
                      "div",
                      { style: { minWidth: 0, flex: 1 } },
                      h("div", { style: { fontWeight: 600, color: color.text, fontSize: 13 } }, renderItemTitle(item)),
                      disabled && disabledTag
                        ? h(Tag, { color: "blue", style: { marginTop: 4 } }, disabledTag)
                        : null,
                      subtitle
                        ? h(
                          "div",
                          { style: { marginTop: 4, fontSize: 11, color: color.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } },
                          subtitle,
                        )
                        : null,
                    ),
                    h(Checkbox, {
                      checked: disabled || selected,
                      disabled,
                      onClick: (event) => event.stopPropagation(),
                      onChange: toggleSelection,
                    }),
                  ),
                );
              },
            })
            : h(Empty, { style: { padding: "24px 0" }, description: emptyText }),
      ),
    ),
  ];

  const caseBasedCount = links.filter((row) => row?.type === "case_based").length;
  const standaloneCount = links.filter((row) => row?.type === "standalone").length;
  const legalStudyCount = links.filter((row) => row?.type === "legal_study").length;
  const legalStudyFolderCount = links.filter((row) => row?.type === "legal_study_folder").length;

  const renderText = (props, children) => (Text ? h(Text, props, children) : h("span", props, children));

  const renderSegmentButton = (key, label, count) => {
    const isActive = filterKind === key;
    return h(
      "button",
      {
        type: "button",
        onClick: () => setFilterKind(key),
        style: {
          border: 0,
          background: isActive ? color.white : "transparent",
          color: isActive ? color.blue : color.muted,
          borderRadius: 6,
          padding: "6px 14px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
          boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" : "none",
          transition: "all 0.2s ease",
        },
      },
      h("span", { style: { display: "flex", alignItems: "center", gap: 6 } },
        label,
        typeof count === "number" && h(
          "span",
          {
            style: {
              background: isActive ? color.blueSoft : "#E5E7EB",
              color: isActive ? color.blue : color.muted,
              padding: "2px 6px",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
            }
          },
          count
        )
      )
    );
  };

  const renderKindBadge = (reference, overrideType) => {
    const isFolderLink = overrideType === "legal_study_folder";
    const isStudy = overrideType === "legal_study" || (!overrideType && isLegalStudyReference(reference));
    const isCase = overrideType === "case_based" || (!overrideType && !isFolderLink && !isStudy && isCaseBasedReference(reference));
    const badgeColor = isCase ? "geekblue" : "purple";
    const label = isCase ? "Case" : isFolderLink ? "Legal Study" : isStudy ? "Case Study" : "Reference";
    return h(
      Tag,
      { color: badgeColor, style: { margin: 0, borderRadius: 4, fontWeight: 600 } },
      label,
    );
  };

  const renderReferenceRow = (link) => {
    // Support new normalized format { id, type, reference }
    const reference = link?.reference || getLinkReference(link);
    const linkType = link?.type || (isCaseBasedReference(reference) ? "case_based" : isLegalStudyReference(reference) ? "legal_study" : "standalone");
    const referenceId = String(extractId(reference));
    const sourceCase = linkType === "case_based" ? (reference?._sourceCase || getSourceCase(reference) || reference) : getSourceCase(reference);
    const title = linkType === "legal_study_folder"
      ? "Legal Study"
      : (linkType === "case_based" && sourceCase) ? getCaseTitle(sourceCase) : getReferenceTitle(reference);
    const descriptionText = linkType === "legal_study_folder"
      ? (reference?.caseName || "-")
      : (stripHtml(reference?.description) || "-");
    const folderCount = parseStoredIds(reference?.sourceFolderIds).length;
    const documentCount = parseStoredIds(reference?.sourceDocumentIds).length;

    const getCreatedByName = () => {
      // Try reference.createdBy first (new format), then fallback to legacy fields
      const user = reference?.createdBy ||
        link?.createdBy ||
        reference?.legalReference?.createdBy ||
        reference?._legalReference?.createdBy ||
        reference?.legalStudy?.createdBy ||
        reference?._legalStudy?.createdBy;
      return user?.nickname || user?.username || user?.name || "-";
    };

    return h(
      "div",
      {
        key: String(link?.id || referenceId),
        style: {
          display: "grid",
          gridTemplateColumns: "110px minmax(160px, 1.2fr) minmax(150px, 1.8fr) 110px 90px 36px",
          gap: 10,
          alignItems: "center",
          minWidth: 740,
          padding: "12px 12px",
          borderTop: `1px solid ${color.border}`,
          background: color.white,
          transition: "background 0.2s ease",
        },
      },
      h("div", null, renderKindBadge(reference, linkType)),
      h(
        "button",
        {
          type: "button",
          onClick: linkType === "case_based" ? () => handleOpenReference(link) : undefined,
          style: {
            border: 0,
            padding: 0,
            background: "transparent",
            textAlign: "left",
            cursor: linkType === "case_based" ? "pointer" : "default",
            minWidth: 0,
            fontFamily: "inherit",
          },
        },
        h(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: 3, minWidth: 0 } },
          h(
            Tooltip,
            { title },
            h(
              "div",
              {
                style: {
                  color: color.text,
                  fontWeight: 600,
                  fontSize: 14,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              },
              title,
            ),
          )
        )
      ),
      h(
        Tooltip,
        { title: descriptionText },
        h(
          "div",
          {
            style: {
              color: color.muted,
              fontSize: 13,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          },
          descriptionText,
        ),
      ),
      h(
        "div",
        {
          style: {
            color: color.muted,
            fontSize: 13,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          },
        },
        getCreatedByName()
      ),
      h("div", { style: { color: color.muted, fontSize: 13 } }, formatDate(link.updatedAt || link.createdAt || reference?.updatedAt || reference?.createdAt) || "-"),
      h(
        Button,
        {
          type: "link",
          size: "small",
          danger: true,
          icon: ICONS.trash,
          disabled: !canManageCurrentCase,
          onClick: () => confirmRemoveLink(link),
          style: { padding: 0, width: 32, minWidth: 32, overflow: "hidden" },
        },
      ),
    );
  };

  const renderFileItem = (doc) => {
    const fileUrl = getFileUrl(doc);
    const attachment = getAttachment(doc);
    const name = getFileName(doc);
    const sizeText = formatBytes(attachment?.size);
    const dateText = formatDate(doc.uploadedAt || doc.createdAt || doc.updatedAt);
    const sourceText = selectedFolderId === "root" ? `Nguồn: ${getFolderPath(getDocFolderId(doc))}` : "";

    return h(
      List.Item,
      {
        key: String(extractId(doc) || name),
        style: { padding: "10px 0" },
        actions: [
          h(
            Button,
            {
              key: "open",
              size: "small",
              type: "link",
              icon: ICONS.open,
              disabled: !fileUrl,
              onClick: () => openPreview(doc),
            },
            "Open",
          ),
          h(
            Button,
            {
              key: "download",
              size: "small",
              type: "link",
              icon: ICONS.download,
              disabled: !fileUrl,
              onClick: (event) => {
                event?.preventDefault?.();
                event?.stopPropagation?.();
                openFileUrl(doc);
              },
            },
            "Download",
          ),
        ],
      },
      h(List.Item.Meta, {
        avatar: h(
          "div",
          {
            style: {
              width: 34,
              height: 34,
              borderRadius: 6,
              border: `1px solid ${color.border}`,
              color: color.blue,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: color.white,
            },
          },
          ICONS.file,
        ),
        title: h(
          "div",
          { style: { display: "flex", gap: 8, alignItems: "center", minWidth: 0 } },
          h(
            Tooltip,
            { title: name },
            h(
              "span",
              {
                style: {
                  fontWeight: 600,
                  color: fileUrl ? color.text : color.muted,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              },
              name,
            ),
          ),
          h(Tag, { style: { margin: 0, borderRadius: 4 } }, getFileExt(doc)),
        ),
        description: h(
          "div",
          { style: { fontSize: 12, color: color.muted } },
          [
            doc.description ? h("div", { key: "desc" }, doc.description) : null,
            sourceText ? h("div", { key: "source", style: { marginTop: doc.description ? 3 : 0 } }, sourceText) : null,
            h(
              "div",
              { key: "meta", style: { marginTop: doc.description || sourceText ? 3 : 0 } },
              [sizeText, dateText].filter(Boolean).join(" · ") || "No file information",
            ),
          ],
        ),
      }),
    );
  };

  const renderLinkedCases = () => {
    const cases = activeRows(linkedCases);
    if (!cases.length) {
      return h("div", { style: { color: color.faint, fontSize: 12 } }, "No other cases.");
    }

    return h(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: 6 } },
      cases.slice(0, 8).map((item) =>
        h(
          "button",
          {
            key: String(extractId(item)),
            type: "button",
            onClick: () => openCaseViewPopup(extractId(item), item),
            style: {
              border: `1px solid ${color.border}`,
              background: color.white,
              borderRadius: 6,
              padding: "6px 8px",
              textAlign: "left",
              cursor: "pointer",
              color: color.text,
              fontSize: 12,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
            title: getCaseTitle(item),
          },
          getCaseTitle(item),
        ),
      ),
    );
  };

  const renderDrawerBody = () => {
    if (libraryLoading) {
      return h(
        "div",
        { style: { padding: 60, textAlign: "center" } },
        h(Spin, { size: "large" }),
      );
    }

    const folderCount = library.folders.length;
    const fileCount = library.documents.length;

    return h(
      "div",
      { style: { display: "flex", gap: 16, height: "100%" } },
      h(
        "div",
        {
          style: {
            width: 286,
            flexShrink: 0,
            borderRight: `1px solid ${color.border}`,
            paddingRight: 14,
            overflowY: "auto",
          },
        },
        h("div", { style: { fontSize: 12, color: color.muted, marginBottom: 8, fontWeight: 700 } }, "Folders"),
        folderCount || fileCount
          ? h(DirectoryTree, {
            treeData,
            selectedKeys: [selectedFolderId],
            defaultExpandAll: true,
            onSelect: (keys) => setSelectedFolderId(String(keys?.[0] || "root")),
            style: { background: "transparent" },
          })
          : h(Empty, {
            image: Empty.PRESENTED_IMAGE_SIMPLE,
            description: "No documents yet.",
            style: { padding: "18px 0" },
          }),
      ),
      h(
        "div",
        { style: { flex: 1, minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" } },
        h(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            },
          },
          h(
            "div",
            { style: { minWidth: 0 } },
            h("div", { style: { fontSize: 15, fontWeight: 700, color: color.text } }, selectedFolderName),
            h(
              "div",
              { style: { fontSize: 12, color: color.muted, marginTop: 2 } },
              `${visibleDocuments.length} documents displayed · ${folderCount} folders · ${fileCount} files`,
            ),
          ),
          h(Input.Search, {
            allowClear: true,
            placeholder: "Search documents...",
            value: libraryQuery,
            onChange: (event) => setLibraryQuery(event.target.value),
            style: { width: 260 },
          }),
        ),
        h(
          "div",
          {
            style: {
              flex: 1,
              overflowY: "auto",
              border: `1px solid ${color.border}`,
              borderRadius: 8,
              padding: "0 14px",
              background: color.white,
            },
          },
          visibleDocuments.length
            ? h(List, {
              itemLayout: "horizontal",
              dataSource: visibleDocuments,
              renderItem: renderFileItem,
            })
            : h(Empty, {
              image: Empty.PRESENTED_IMAGE_SIMPLE,
              description: libraryQuery ? "No matching documents found." : "This folder has no documents yet.",
              style: { padding: "48px 0" },
            }),
        ),
      ),
    );
  };

  const renderPreviewBody = () => {
    if (!previewDoc) return null;
    const fileUrl = getFileUrl(previewDoc);
    const previewUrl = getPreviewUrl(previewDoc);
    const kind = getPreviewKind(previewDoc);

    if (!fileUrl) {
      return h(Empty, {
        image: Empty.PRESENTED_IMAGE_SIMPLE,
        description: "Tài liệu chưa có file hoặc URL để xem trước.",
        style: { padding: "60px 0" },
      });
    }

    const frameStyle = {
      width: "100%",
      height: "calc(100vh - 150px)",
      border: `1px solid ${color.border}`,
      borderRadius: 8,
      background: color.white,
    };

    if (kind === "image") {
      return h(
        "div",
        { style: { height: "calc(100vh - 150px)", overflow: "auto", textAlign: "center", background: color.white, borderRadius: 8, border: `1px solid ${color.border}` } },
        h("img", {
          src: fileUrl,
          alt: getFileName(previewDoc),
          style: { maxWidth: "100%", height: "auto" },
        }),
      );
    }

    if (kind === "video") {
      return h("video", { src: fileUrl, controls: true, style: { ...frameStyle, background: "#000" } });
    }

    if (kind === "audio") {
      return h(
        "div",
        { style: { padding: 24, border: `1px solid ${color.border}`, borderRadius: 8, background: color.white } },
        h("audio", { src: fileUrl, controls: true, style: { width: "100%" } }),
      );
    }

    if (kind === "text") {
      if (previewTextLoading) return h("div", { style: { padding: 60, textAlign: "center" } }, h(Spin, null));
      if (previewTextError) {
        return h(Alert, {
          type: "warning",
          showIcon: true,
          message: "Không đọc được nội dung file trong trình duyệt.",
        });
      }
      return h(
        "pre",
        {
          style: {
            ...frameStyle,
            margin: 0,
            padding: 16,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            fontFamily: "Consolas, Monaco, monospace",
            fontSize: 12,
          },
        },
        previewText,
      );
    }

    return h("iframe", {
      src: previewUrl,
      title: getFileName(previewDoc),
      style: frameStyle,
    });
  };

  const getUploadListUid = (file) =>
    file?.uid || `${file?.name || "file"}-${file?.lastModified || ""}-${file?.size || ""}`;

  const addUploadFiles = (setter, files) => {
    setter((prev) => {
      const map = new Map(prev.map((item) => [getUploadListUid(item), item]));
      asArray(files).forEach((file) => {
        if (file) map.set(getUploadListUid(file), file);
      });
      return Array.from(map.values());
    });
  };

  const removeUploadFile = (setter, file) => {
    const uid = getUploadListUid(file);
    setter((prev) => prev.filter((item) => getUploadListUid(item) !== uid));
  };

  const renderUploadPicker = ({ type, title, fileList, setFileList }) =>
    h(
      Upload,
      {
        multiple: true,
        directory: type === "folder",
        fileList,
        beforeUpload: (file) => {
          if (type === "folder") {
            const rootFolderName = getUploadRootFolderName([file]);
            const currentTitle = linkForm.getFieldValue("newStandaloneTitle");
            if (rootFolderName && !String(currentTitle || "").trim()) {
              linkForm.setFieldsValue({ newStandaloneTitle: rootFolderName });
            }
          }
          addUploadFiles(setFileList, [file]);
          return false;
        },
        onRemove: (file) => {
          removeUploadFile(setFileList, file);
          return false;
        },
      },
      h(
        Button,
        {
          icon: type === "folder" ? ICONS.folder : ICONS.upload,
        },
        title,
      ),
    );

  const renderStandaloneCreateFields = () =>
    h(
      React.Fragment,
      null,
      h(
        Form.Item,
        {
          name: "newStandaloneTitle",
          label: "Tên hồ sơ",
          rules: [{ required: true, message: "Vui lòng nhập tên hồ sơ" }],
        },
        h(Input, { placeholder: "Nhập tên hồ sơ..." }),
      ),
      h(
        Form.Item,
        {
          name: "newStandaloneDescription",
          label: "Mô tả",
        },
        h(Input.TextArea, { rows: 3, placeholder: "Mô tả ngắn..." }),
      ),
      h(
        "div",
        {
          style: {
            border: `1px solid ${color.border}`,
            borderRadius: 8,
            padding: 12,
            background: color.bg,
          },
        },
        h("div", { style: { fontWeight: 700, color: color.text, marginBottom: 8 } }, "Upload tài liệu cho hồ sơ tham chiếu"),
        h(
          Space,
          { size: 8, wrap: true },
          renderUploadPicker({
            type: "files",
            title: "Upload file",
            fileList: newReferenceFiles,
            setFileList: setNewReferenceFiles,
          }),
          renderUploadPicker({
            type: "folder",
            title: "Upload thư mục",
            fileList: newReferenceFolderFiles,
            setFileList: setNewReferenceFolderFiles,
          }),
        ),
        h(
          "div",
          { style: { marginTop: 8, color: color.muted, fontSize: 12 } },
          `${newReferenceFiles.length} file · ${newReferenceFolderFiles.length} file trong thư mục`,
        ),
      ),
    );

  const renderSelectionCheckbox = ({ key, checked, disabled, onChange, children }) =>
    Checkbox
      ? h(Checkbox, { key, checked, disabled, onChange }, children)
      : h(
        "label",
        { key, style: { display: "flex", gap: 8, alignItems: "center", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.68 : 1 } },
        h("input", { type: "checkbox", checked, disabled, onChange }),
        children,
      );

  const renderSourceSelectionPicker = ({ library, loading, emptyText, hint }) => {
    {
      const safeLibrary = library || { studies: [], folders: [], documents: [] };
      const q = legalStudySearch;
      const studies = activeRows(safeLibrary.studies);
      const folders = activeRows(safeLibrary.folders);
      const documents = activeRows(safeLibrary.documents);
      const folderMapForSource = new Map(folders.map((folder) => [String(getFolderId(folder)), folder]));
      const selectedFolderSet = new Set(selectedSourceFolderIds.map(String));
      const selectedDocumentSet = new Set(selectedSourceDocumentIds.map(String));
      const shouldUseLocks = linkMode === "legal_study";
      const lockedDocumentSet = shouldUseLocks
        ? new Set(asArray(selectedLegalStudyLockedSelection.documentIds).map(String))
        : new Set();
      const lockedFolderSet = shouldUseLocks
        ? new Set(asArray(selectedLegalStudyLockedSelection.folderIds).map(String))
        : new Set();
      const blockedFolderSet = shouldUseLocks
        ? new Set(asArray(selectedLegalStudyLockedSelection.blockedFolderIds).map(String))
        : new Set();

      const getSourceFolderPath = (folderId) => {
        const names = [];
        let current = folderMapForSource.get(String(folderId));
        let study = current?._legalStudy;
        while (current) {
          names.unshift(current.name || current.title || "Folder");
          study = study || current?._legalStudy;
          const parentId = getParentId(current);
          current = parentId ? folderMapForSource.get(String(parentId)) : null;
        }
        if (study) names.unshift(getLegalStudyTitle(study));
        return names.join(" / ");
      };

      const getFolderScopeIds = (folderId) => {
        if (!folderId || folderId === "root") return [];
        return [String(folderId), ...getDescendantFolderIds(folders, folderId).map(String)];
      };

      const getScopedDocuments = (folderId) => {
        if (!folderId || folderId === "root") return documents;
        const folderScopeSet = new Set(getFolderScopeIds(folderId));
        return documents.filter((doc) => folderScopeSet.has(String(getDocFolderId(doc) || "")));
      };

      const documentMatchesQuery = (doc) =>
        matchesSearchParts([
          getFileName(doc),
          doc.title,
          doc.name,
          doc.description,
          getLegalStudyTitle(doc?._legalStudy),
          getSourceFolderPath(getDocFolderId(doc)),
        ], q);

      const folderMatchesQuery = (folder) => {
        if (!String(q || "").trim()) return true;
        const folderId = String(getFolderId(folder));
        if (matchesSearchParts([folder.name, folder.title, folder.description, getSourceFolderPath(folderId)], q)) {
          return true;
        }
        return getScopedDocuments(folderId).some(documentMatchesQuery);
      };

      const countFilesInFolder = (folderId) => getScopedDocuments(folderId).length;
      const activeFolder = activeSourceFolderId === "root" ? null : folderMapForSource.get(String(activeSourceFolderId));
      const activeFolderLabel = activeFolder ? getSourceFolderPath(activeSourceFolderId) : "All files";
      const activeScopeFolderIds = activeSourceFolderId === "root" ? [] : getFolderScopeIds(activeSourceFolderId);
      const activeScopeFolderSet = new Set(activeScopeFolderIds);
      const activeDocuments = getScopedDocuments(activeSourceFolderId);
      const visibleDocuments = activeDocuments
        .filter(documentMatchesQuery)
        .sort((a, b) => String(getFileName(a)).localeCompare(String(getFileName(b))))
        .slice(0, 220);
      const activeDocumentIds = activeDocuments.map((doc) => String(extractId(doc))).filter(Boolean);
      const selectableActiveDocumentIds = activeDocumentIds.filter((id) => !lockedDocumentSet.has(id));
      const selectedInActiveFolder = selectableActiveDocumentIds.filter((id) => selectedDocumentSet.has(id)).length;

      const selectActiveDocuments = () => {
        setSelectedSourceDocumentIds((prev) => Array.from(new Set([...prev.map(String), ...selectableActiveDocumentIds])));
      };

      const clearActiveSelection = () => {
        if (activeSourceFolderId === "root") {
          setSelectedSourceFolderIds([]);
          setSelectedSourceDocumentIds([]);
          return;
        }
        setSelectedSourceFolderIds((prev) => prev.map(String).filter((id) => !activeScopeFolderSet.has(id)));
        setSelectedSourceDocumentIds((prev) => {
          const activeDocSet = new Set(selectableActiveDocumentIds);
          return prev.map(String).filter((id) => !activeDocSet.has(id));
        });
      };

      const renderFolderTitle = (folder) => {
        const id = String(getFolderId(folder));
        const fileCount = countFilesInFolder(id);
        const selected = selectedFolderSet.has(id);
        const locked = lockedFolderSet.has(id) || blockedFolderSet.has(id);
        return h(
          "span",
          {
            style: {
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              width: "100%",
              minWidth: 0,
            },
          },
          h(
            "span",
            {
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
                flex: "1 1 auto",
              },
            },
            h("span", {
              role: "checkbox",
              "aria-checked": selected || locked,
              title: selected ? "Bỏ chọn folder" : "Chọn folder",
              onClick: (event) => {
                event.stopPropagation();
                if (locked) return;
                toggleSourceFolder(id);
              },
              onMouseDown: (event) => event.stopPropagation(),
              style: {
                width: 12,
                height: 12,
                borderRadius: 3,
                border: `1px solid ${selected || locked ? color.blue : color.borderDark}`,
                background: selected || locked ? color.blue : color.white,
                boxShadow: selected ? `inset 0 0 0 2px ${color.white}` : "none",
                flex: "0 0 auto",
                cursor: locked ? "not-allowed" : "pointer",
                opacity: locked ? 0.45 : 1,
              },
            }),
            h("span", { style: { color: locked ? color.faint : color.blue, flex: "0 0 auto", display: "inline-flex" } }, ICONS.folder),
            h(
              Tooltip,
              { title: getSourceFolderPath(id) },
              h(
                "span",
                {
                  style: {
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  },
                },
                folder.name || folder.title || "Folder",
              ),
            ),
            locked ? h(Tag, { color: "default", style: { marginLeft: 2, borderRadius: 4, fontSize: 11 } }, "Locked") : null,
          ),
          h(
            "span",
            {
              style: {
                color: color.faint,
                fontSize: 12,
                whiteSpace: "nowrap",
              },
            },
            `(${fileCount} file)`,
          ),
        );
      };

      const buildSourceTree = (parentId) =>
        folders
          .filter((folder) => {
            const folderParentId = getParentId(folder);
            if (!parentId) return !folderParentId || !folderMapForSource.has(String(folderParentId));
            return String(folderParentId || "") === String(parentId);
          })
          .filter(folderMatchesQuery)
          .map((folder) => {
            const folderId = String(getFolderId(folder));
            return {
              key: folderId,
              title: renderFolderTitle(folder),
              children: buildSourceTree(folderId),
            };
          });

      const sourceTreeData = [
        {
          key: "root",
          title: h(
            "span",
            {
              style: {
                display: "inline-flex",
                justifyContent: "space-between",
                width: "100%",
                gap: 8,
              },
            },
            h(
              "span",
              { style: { display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 } },
              h("span", { style: { color: color.blue, display: "inline-flex" } }, ICONS.folder),
              h("span", null, "All files"),
            ),
            h("span", { style: { color: color.faint, fontSize: 12 } }, `(${documents.length} file)`),
          ),
          children: buildSourceTree(null),
        },
      ];
      const selectionHint = `${selectedSourceFolderIds.length} folders · ${selectedSourceDocumentIds.length} files selected · ${studies.length} Legal Studies`;

      return h(
        "div",
        {
          style: {
            border: `1px solid ${color.border}`,
            borderRadius: 8,
            padding: 12,
            background: color.bg,
            marginTop: 8,
          },
        },
        h(Input.Search, {
          allowClear: true,
          placeholder: "Search folders or files...",
          value: legalStudySearch,
          onChange: (event) => setLegalStudySearch(event.target.value),
          style: { marginBottom: 8 },
        }),
        h(
          "div",
          { style: { color: color.muted, fontSize: 12, marginBottom: 10 } },
          hint || selectionHint,
        ),
        loading
          ? h("div", { style: { padding: 24, textAlign: "center" } }, h(Spin, null))
          : (!folders.length && !documents.length)
            ? h(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: emptyText || "No folders/files found." })
            : h(
              "div",
              {
                style: {
                  display: "grid",
                  gridTemplateColumns: "minmax(260px, 0.9fr) minmax(0, 1.35fr)",
                  gap: 12,
                  alignItems: "stretch",
                },
              },
              h(
                "div",
                {
                  style: {
                    border: `1px solid ${color.border}`,
                    borderRadius: 8,
                    background: color.white,
                    padding: 10,
                    minHeight: 292,
                    maxHeight: 340,
                    overflow: "auto",
                  },
                },
                h("div", { style: { fontWeight: 700, marginBottom: 8, color: color.text } }, `Folders (${folders.length})`),
                h(DirectoryTree, {
                  blockNode: true,
                  showIcon: false,
                  defaultExpandAll: true,
                  selectedKeys: [activeSourceFolderId],
                  treeData: sourceTreeData,
                  onSelect: (keys, info) => {
                    const key = String(keys?.[0] || info?.node?.key || "root");
                    setActiveSourceFolderId(key || "root");
                  },
                  style: { background: "transparent" },
                }),
              ),
              h(
                "div",
                {
                  style: {
                    border: `1px solid ${color.border}`,
                    borderRadius: 8,
                    background: color.white,
                    minHeight: 292,
                    maxHeight: 340,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  },
                },
                h(
                  "div",
                  {
                    style: {
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      borderBottom: `1px solid ${color.border}`,
                      padding: "10px 12px",
                    },
                  },
                  h(
                    "div",
                    { style: { minWidth: 0 } },
                    h(
                      Tooltip,
                      { title: activeFolderLabel },
                      h(
                        "div",
                        {
                          style: {
                            fontWeight: 700,
                            color: color.text,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          },
                        },
                        activeFolderLabel,
                      ),
                    ),
                    h(
                      "div",
                      { style: { color: color.muted, fontSize: 12, marginTop: 2 } },
                      `${selectedInActiveFolder}/${selectableActiveDocumentIds.length} files selectable`,
                    ),
                  ),
                  h(
                    Space,
                    { size: 6 },
                    h(Button, {
                      size: "small",
                      disabled: !selectableActiveDocumentIds.length,
                      onClick: selectActiveDocuments,
                    }, "Select all"),
                    h(Button, {
                      size: "small",
                      disabled: activeSourceFolderId === "root"
                        ? (!selectedSourceFolderIds.length && !selectedSourceDocumentIds.length)
                        : (!activeScopeFolderIds.some((id) => selectedFolderSet.has(id)) && !selectedInActiveFolder),
                      onClick: clearActiveSelection,
                    }, "Deselect"),
                  ),
                ),
                h(
                  "div",
                  {
                    style: {
                      padding: 12,
                      overflow: "auto",
                      flex: 1,
                    },
                  },
                  visibleDocuments.length
                    ? h(
                      "div",
                      { style: { display: "flex", flexDirection: "column", gap: 8 } },
                      visibleDocuments.map((doc) => {
                        const id = String(extractId(doc));
                        const folderPath = getSourceFolderPath(getDocFolderId(doc));
                        const locked = lockedDocumentSet.has(id);
                        return renderSelectionCheckbox({
                          key: `doc-${id}`,
                          checked: selectedDocumentSet.has(id) || locked,
                          disabled: locked,
                          onChange: () => {
                            if (!locked) toggleSourceDocument(id);
                          },
                          children: h(
                            Tooltip,
                            { title: locked ? "File này đã được liên kết" : folderPath ? `${folderPath} / ${getFileName(doc)}` : getFileName(doc) },
                            h(
                              "span",
                              {
                                style: {
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  minWidth: 0,
                                  fontSize: 13,
                                },
                              },
                              h("span", { style: { color: color.faint, flex: "0 0 auto" } }, ICONS.file),
                              h(
                                "span",
                                {
                                  style: {
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  },
                                },
                                getFileName(doc),
                              ),
                              locked ? h(Tag, { color: "default", style: { marginLeft: 4, borderRadius: 4, fontSize: 11 } }, "Locked") : null,
                            ),
                          ),
                        });
                      }),
                    )
                    : h(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: "No files in this folder." }),
                ),
              ),
            ),
      );
    }

    const q = legalStudySearch;
    const folderMapForSource = new Map(library.folders.map((folder) => [String(getFolderId(folder)), folder]));
    const getSourceFolderPath = (folderId) => {
      const names = [];
      let current = folderMapForSource.get(String(folderId));
      while (current) {
        names.unshift(current.name || current.title || "Folder");
        const parentId = getParentId(current);
        current = parentId ? folderMapForSource.get(String(parentId)) : null;
      }
      return names.join(" / ");
    };
    const filteredFolders = activeRows(library.folders)
      .filter((folder) => matchesSearchParts([folder.name, folder.title, folder.description, getSourceFolderPath(getFolderId(folder))], q))
      .slice(0, 120);
    const filteredDocuments = activeRows(library.documents)
      .filter((doc) => matchesSearchParts([getFileName(doc), doc.title, doc.name, doc.description, getSourceFolderPath(getDocFolderId(doc))], q))
      .slice(0, 160);

    return h(
      "div",
      {
        style: {
          border: `1px solid ${color.border}`,
          borderRadius: 8,
          padding: 12,
          background: color.bg,
          marginTop: 8,
        },
      },
      h(Input.Search, {
        allowClear: true,
        placeholder: "Search folders or files...",
        value: legalStudySearch,
        onChange: (event) => setLegalStudySearch(event.target.value),
        style: { marginBottom: 8 },
      }),
      h(
        "div",
        { style: { color: color.muted, fontSize: 12, marginBottom: 10 } },
        hint || `${selectedSourceFolderIds.length} folders · ${selectedSourceDocumentIds.length} files selected`,
      ),
      loading
        ? h("div", { style: { padding: 24, textAlign: "center" } }, h(Spin, null))
        : (!library.folders.length && !library.documents.length)
          ? h(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: emptyText || "No folders/files found." })
          : h(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)",
                gap: 12,
              },
            },
            h(
              "div",
              null,
              h("div", { style: { fontWeight: 700, marginBottom: 8, color: color.text } }, `Folders (${filteredFolders.length})`),
              h(
                "div",
                { style: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflow: "auto" } },
                filteredFolders.map((folder) => {
                  const id = String(getFolderId(folder));
                  return renderSelectionCheckbox({
                    key: `folder-${id}`,
                    checked: selectedSourceFolderIds.includes(id),
                    onChange: () => toggleSourceFolder(id),
                    children: h(
                      Tooltip,
                      { title: getSourceFolderPath(id) },
                      h("span", { style: { fontSize: 13 } }, folder.name || folder.title || "Folder"),
                    ),
                  });
                }),
              ),
            ),
            h(
              "div",
              null,
              h("div", { style: { fontWeight: 700, marginBottom: 8, color: color.text } }, `Files (${filteredDocuments.length})`),
              h(
                "div",
                { style: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflow: "auto" } },
                filteredDocuments.map((doc) => {
                  const id = String(extractId(doc));
                  const folderPath = getSourceFolderPath(getDocFolderId(doc));
                  return renderSelectionCheckbox({
                    key: `doc-${id}`,
                    checked: selectedSourceDocumentIds.includes(id),
                    onChange: () => toggleSourceDocument(id),
                    children: h(
                      Tooltip,
                      { title: folderPath ? `${folderPath} / ${getFileName(doc)}` : getFileName(doc) },
                      h("span", { style: { fontSize: 13 } }, getFileName(doc)),
                    ),
                  });
                }),
              ),
            ),
          ),
    );
  };

  const renderLinkModal = () => {
    return h(
      Modal,
      {
        title: "Link Reference",
        open: linkModalOpen,
        width: 920,
        onCancel: () => {
          setLinkModalOpen(false);
          setCaseOptionSearch("");
          setLegalStudySearch("");
          setSelectedLegalStudyId("");
          setSelectedLegalStudyIds([]);
          setSelectedLegalStudyFolderIds([]);
          setSelectedCaseIdsForLink([]);
          resetSourceSelection();
          setNewReferenceFiles([]);
          setNewReferenceFolderFiles([]);
        },
        onOk: handleLinkSubmit,
        okText: "Link",
        cancelText: "Cancel",
        confirmLoading: linkLoading,
        destroyOnClose: true,
      },
      h(
        Form,
        {
          form: linkForm,
          layout: "vertical",
          initialValues: { sourceType: "case" },
        },
        h(
          "div",
          {
            style: {
              display: "inline-flex",
              gap: 4,
              background: "#F3F4F6",
              padding: 4,
              borderRadius: 8,
              border: "1px solid #E5E7EB",
              marginBottom: 20,
            }
          },
          h(
            "button",
            {
              type: "button",
              onClick: () => {
                setLinkMode("case");
                setSelectedLegalStudyId("");
                setSelectedLegalStudyIds([]);
                setSelectedLegalStudyFolderIds([]);
                resetSourceSelection();
                linkForm.setFieldsValue({ sourceType: "case" });
              },
              style: {
                border: 0,
                background: linkMode === "case" ? color.white : "transparent",
                color: linkMode === "case" ? color.blue : color.muted,
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: linkMode === "case" ? "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.2s ease",
              },
            },
            "Case",
          ),
          h(
            "button",
            {
              type: "button",
              onClick: () => {
                setLinkMode("legal_study");
                setCaseOptionSearch("");
                setSelectedCaseIdsForLink([]);
                setSelectedLegalStudyFolderIds([]);
                resetSourceSelection();
                linkForm.setFieldsValue({
                  sourceType: "legal_study",
                  legalStudyId: undefined,
                });
              },
              style: {
                border: 0,
                background: linkMode === "legal_study" ? color.white : "transparent",
                color: linkMode === "legal_study" ? color.blue : color.muted,
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: linkMode === "legal_study" ? "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.2s ease",
              },
            },
            "Case Study",
          ),
          h(
            "button",
            {
              type: "button",
              onClick: () => {
                setLinkMode("legal_study_folder");
                setCaseOptionSearch("");
                setSelectedCaseIdsForLink([]);
                setSelectedLegalStudyId("");
                setSelectedLegalStudyIds([]);
                resetSourceSelection();
                linkForm.setFieldsValue({
                  sourceType: "legal_study_folder",
                  legalStudyId: undefined,
                });
              },
              style: {
                border: 0,
                background: linkMode === "legal_study_folder" ? color.white : "transparent",
                color: linkMode === "legal_study_folder" ? color.blue : color.muted,
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: linkMode === "legal_study_folder" ? "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.2s ease",
              },
            },
            "Legal Study",
          ),
        ),
        linkMode === "case"
          ? renderPickerList({
            countLabel: `Found ${filteredCaseOptions.length} cases${filteredCaseOptions.length > visibleCaseOptions.length ? `, showing ${visibleCaseOptions.length}` : ""}`,
            searchValue: caseOptionSearch,
            onSearchChange: setCaseOptionSearch,
            searchPlaceholder: "Search case...",
            headerLabel: "Case Name",
            loading: false,
            items: visibleCaseOptions,
            getItemKey: (item) => String(extractId(item)),
            isItemDisabled: (item) => linkedSourceCaseIds.has(String(extractId(item))),
            disabledTag: "Already linked",
            isItemSelected: (id) => selectedCaseIdsForLink.includes(id),
            onToggleItem: (id) =>
              setSelectedCaseIdsForLink((prev) =>
                prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
              ),
            renderItemTitle: (item) => getCaseReferenceListLabel(item),
            renderItemSubtitle: (item) => {
              // This case's existing caseReferences links (either direction
              // — the relation is symmetric) to OTHER cases in the system,
              // unrelated to the current case.
              const linkedCaseNames = relationRows(item?.caseReferences)
                .map((row) => getCaseTitle(row))
                .filter(Boolean);
              return linkedCaseNames.length ? `Linked to: ${linkedCaseNames.join(", ")}` : null;
            },
            emptyText: "No case found",
          })
          : linkMode === "legal_study"
          ? renderPickerList({
            countLabel: `Found ${filteredCaseStudyOptions.length} case studies${filteredCaseStudyOptions.length > visibleCaseStudyOptions.length ? `, showing ${visibleCaseStudyOptions.length}` : ""}`,
            searchValue: caseStudySearch,
            onSearchChange: setCaseStudySearch,
            searchPlaceholder: "Search case study...",
            headerLabel: "Case Study Name",
            loading: optionLoading,
            items: visibleCaseStudyOptions,
            getItemKey: (study) => String(extractId(study)),
            isItemSelected: (id) => selectedLegalStudyIds.includes(id),
            onToggleItem: (id) =>
              setSelectedLegalStudyIds((prev) =>
                prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
              ),
            renderItemTitle: (study) => getLegalStudyTitle(study),
            emptyText: "No case study found",
          })
          : renderPickerList({
            // "Legal Study" tab — case-bound Legal Study folders across all
            // cases the current lawyer can see, limited to ones that already
            // have at least one file directly inside them, sorted earliest
            // first. Each row shows "Legal Study" with the owning case's
            // label underneath in a muted color. Submitting grants the
            // current case's team viewer access on the target case's root
            // folder (see handleLinkSubmit) rather than creating a link row.
            countLabel: `Found ${filteredLegalStudyFolderOptions.length} legal studies${filteredLegalStudyFolderOptions.length > visibleLegalStudyFolderOptions.length ? `, showing ${visibleLegalStudyFolderOptions.length}` : ""}`,
            searchValue: legalStudyFolderSearch,
            onSearchChange: setLegalStudyFolderSearch,
            searchPlaceholder: "Search case...",
            headerLabel: "Legal Study of Cases",
            loading: optionLoading,
            items: visibleLegalStudyFolderOptions,
            getItemKey: (entry) => String(getFolderId(entry.folder)),
            isItemDisabled: (entry) => linkedLegalStudyFolderIds.has(String(getFolderId(entry.folder))),
            disabledTag: "Already linked",
            isItemSelected: (id) => selectedLegalStudyFolderIds.includes(id),
            onToggleItem: (id) =>
              setSelectedLegalStudyFolderIds((prev) =>
                prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
              ),
            renderItemTitle: () => "Legal Study",
            renderItemSubtitle: (entry) => getCaseReferenceListLabel(entry.caseRecord),
            emptyText: "No Legal Study with files found",
          }),
      ),
    );
  };

  if (loading) {
    return h("div", { style: { padding: 28, textAlign: "center" } }, h(Spin, null));
  }

  if (error) {
    return h(Alert, {
      type: "error",
      showIcon: true,
      message: "Failed to load references",
      description: error,
      action: h(Button, { size: "small", onClick: loadLinks }, "Retry"),
    });
  }

  if (!hasUsableId(caseId)) {
    return h(Alert, {
      type: "warning",
      showIcon: true,
      message: "Current case not found",
    });
  }

  return h(
    React.Fragment,
    null,
    h(
      "div",
      {
        style: {
          width: "100%",
          border: `1px solid ${color.border}`,
          borderRadius: 8,
          background: color.white,
          overflow: "hidden",
        },
      },
      h(
        "div",
        {
          style: {
            padding: "14px 16px",
            borderBottom: `1px solid ${color.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
          },
        },
        h(
          "div",
          { style: { minWidth: 0 } },
          h(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 8 } },
            h("strong", { style: { color: color.text, fontSize: 15 } }, "References"),
            h(Badge, { count: links.length, style: { backgroundColor: color.blue } }),
          ),
          h("div", { style: { marginTop: 3, fontSize: 12, color: color.muted } }, `${standaloneCount + legalStudyCount + legalStudyFolderCount} Reference · ${caseBasedCount} Case`),
        ),
        h(
          Space,
          { size: 8 },
          h(
            Tooltip,
            { title: canManageCurrentCase ? "" : "Only the case Manager can link references." },
            h(Button, {
              type: "primary",
              icon: ICONS.plus,
              disabled: !canManageCurrentCase,
              onClick: openLinkModal,
            }, "Link"),
          ),
          h(Button, { icon: ICONS.refresh, onClick: loadLinks }, "Refresh"),
        ),
      ),
      h(
        "div",
        {
          style: {
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            borderBottom: `1px solid ${color.border}`,
            background: color.bg,
          },
        },
        h(
          "div",
          {
            style: {
              display: "flex",
              gap: 4,
              background: "#E5E7EB",
              padding: 4,
              borderRadius: 8,
              border: "1px solid #D1D5DB",
            }
          },
          renderSegmentButton("all", "All", links.length),
          renderSegmentButton("case", "Case", caseBasedCount),
          renderSegmentButton("library", "Reference", standaloneCount + legalStudyCount + legalStudyFolderCount),
        ),
        h(Input.Search, {
          allowClear: true,
          placeholder: "Search...",
          value: searchText,
          onChange: (event) => setSearchText(event.target.value),
          style: { width: 280 },
        }),
      ),
      filteredLinks.length
        ? h(
          "div",
          { style: { overflowX: "auto" } },
          h(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "110px minmax(160px, 1.2fr) minmax(150px, 1.8fr) 110px 90px 36px",
                gap: 10,
                minWidth: 740,
                padding: "9px 12px",
                background: color.white,
                color: color.muted,
                fontSize: 12,
                fontWeight: 700,
              },
            },
            h("div", null, "Type"),
            h("div", null, "Reference"),
            h("div", null, "Description"),
            h("div", null, "Creator"),
            h("div", null, "Updated At"),
            h("div", null, ""),
          ),
          filteredLinks.map(renderReferenceRow),
        )
        : h(Empty, {
          image: Empty.PRESENTED_IMAGE_SIMPLE,
          description: links.length ? "No matching references found." : "No references linked yet.",
          style: { padding: "46px 0" },
        }),
    ),
    renderLinkModal(),
    h(
      Drawer,
      {
        title: activeReference
          ? h(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 } },
            renderKindBadge(activeReference),
            h("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, getReferenceTitle(activeReference)),
          )
          : "Folders",
        open: drawerOpen,
        onClose: () => setDrawerOpen(false),
        width: CONFIG.drawerWidth,
        destroyOnClose: false,
        extra: h(
          Space,
          null,
          activeReference
            ? renderText(
              { style: { color: color.muted, fontSize: 12 } },
              `${library.folders.length} folders · ${library.documents.length} documents`,
            )
            : null,
        ),
        bodyStyle: { background: color.bg },
      },
      renderDrawerBody(),
    ),
    h(
      Drawer,
      {
        title: previewDoc ? getFileName(previewDoc) : "Document Preview",
        open: !!previewDoc,
        onClose: () => setPreviewDoc(null),
        width: CONFIG.previewWidth,
        destroyOnClose: true,
        extra: previewDoc
          ? h(
            Space,
            null,
            h(
              Button,
              {
                size: "small",
                icon: ICONS.download,
                onClick: () => openFileUrl(previewDoc),
              },
              "Download",
            ),
          )
          : null,
        bodyStyle: { background: color.bg },
      },
      renderPreviewBody(),
    ),
  );
}

ctx.render(h(LegalReferenceWorkspace));
