const React = ctx.React;
const h = React.createElement;
const antd = ctx.antd || {};
const {
  Alert,
  Badge,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Spin,
  Tag,
  Tooltip,
  Typography,
} = antd;

const message = ctx.message || antd.message;
const Text = Typography?.Text;

const CONFIG = {
  caseDetailUrlTemplate:
    "/admin/61j36bn1f6i/view/3l7acumtlsc/tab/6hx8srk0iqs/filterbytk/{id}",
  legalStudyDetailUrlTemplate:
    "/admin/nx1vuuzjtl2/view/z2psn5kl88e/tab/va81q9kascq/filterbytk/{id}",
  legalReferenceGetUrl: "legalReference:get",
  legalReferenceListUrl: "legalReference:list",
  legalStudyListCandidates: ["legalStudy:list", "legalStudies:list", "LegalStudy:list"],
  caseListCandidates: ["projects:list", "cases:list"],
  pageSize: 200,
  caseRelationNames: ["cases", "projects", "caseReferences"],
  legalStudyRelationNames: ["legalStudy", "legalStudies"],
  relationAppends: [
    "cases",
    "cases.createdBy",
    "cases.updatedBy",
    "cases.legalStudy",
    "cases.legalStudies",
    "projects",
    "projects.createdBy",
    "projects.updatedBy",
    "projects.legalStudy",
    "projects.legalStudies",
    "caseReferences",
    "caseReferences.createdBy",
    "caseReferences.updatedBy",
    "caseReferences.legalStudy",
    "caseReferences.legalStudies",
    "legalStudy",
    "legalStudy.createdBy",
    "legalStudy.updatedBy",
    "legalStudies",
    "legalStudies.createdBy",
    "legalStudies.updatedBy",
    "createdBy",
    "updatedBy",
  ],
  legalStudyStorageType: "legal_study",
  legalStudyReferenceKind: "legal_study",
};

const color = {
  blue: "#185FA5",
  blueSoft: "#E6F1FB",
  border: "#E5E7EB",
  borderDark: "#D1D5DB",
  text: "#111827",
  muted: "#6B7280",
  bg: "#F9FAFB",
  white: "#FFFFFF",
};

const LINK_TABLE_COLUMNS =
  "120px minmax(190px, 1.5fr) minmax(160px, 1.25fr) 140px 120px 36px";
const LINK_TABLE_MIN_WIDTH = 760;

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
  open: icon([
    h("path", {
      key: "a",
      d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
    }),
    h("path", { key: "b", d: "M15 3h6v6" }),
    h("path", { key: "c", d: "M10 14 21 3" }),
  ]),
  refresh: icon([
    h("path", { key: "a", d: "M23 4v6h-6" }),
    h("path", { key: "b", d: "M20.49 15a9 9 0 1 1-2.12-9.36L23 10" }),
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
    return isNilLike(text) ? null : text;
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

const relationRows = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data?.data)) return value.data.data;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.records)) return value.records;
  if (Array.isArray(value?.rows)) return value.rows;
  return value && typeof value === "object" && extractId(value) ? [value] : [];
};

const activeRows = (rows) =>
  asArray(rows).filter(
    (row) => row && row.isDeleted !== true && row.status !== "archived",
  );

const getResponseData = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.data && typeof payload.data === "object") return payload.data;
  if (Array.isArray(payload)) return payload;
  return payload?.data || payload || null;
};

const getResponseMeta = (response) => response?.data?.meta || response?.data || {};

const buildFilter = (filter) => JSON.stringify(filter);

const uniqById = (items) => {
  const map = new Map();
  asArray(items).forEach((item) => {
    const id = extractId(item);
    if (id !== null && id !== undefined && !map.has(String(id))) {
      map.set(String(id), item);
    }
  });
  return Array.from(map.values());
};

const uniqLinks = (links) => {
  const map = new Map();
  asArray(links).forEach((link) => {
    const key = `${link.type}:${link.recordId}`;
    if (link.recordId && !map.has(key)) map.set(key, link);
  });
  return Array.from(map.values());
};

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
    return (
      params.get("filterByTk") || params.get("filterbytk") || params.get("id")
    );
  } catch {
    return null;
  }
};

const getFormValues = () => {
  try {
    return ctx.form?.getFieldsValue?.(true) || ctx.form?.values || {};
  } catch {
    return {};
  }
};

const getCurrentRecord = () => ({
  ...omitNilValues(ctx.record),
  ...omitNilValues(ctx.popup?.record),
  ...omitNilValues(ctx.view?.record),
  ...omitNilValues(ctx.data?.record),
  ...omitNilValues(ctx.action?.record),
  ...omitNilValues(getFormValues()),
});

const getCurrentLegalReferenceId = (record = null) =>
  extractId(record?.id) ||
  extractId(record?._id) ||
  extractId(record?.targetKey) ||
  extractId(ctx.recordId) ||
  extractId(ctx.filterByTk) ||
  extractId(ctx.params?.filterByTk) ||
  extractId(ctx.params?.filterbytk) ||
  extractId(ctx.router?.params?.filterByTk) ||
  extractId(ctx.router?.params?.filterbytk) ||
  extractId(ctx.view?.params?.filterByTk) ||
  extractId(ctx.inputArgs?.filterByTk) ||
  extractId(getRouteFilterByTk());

const stripHtml = (html) => {
  if (!html) return "";
  return String(html)
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
};

const normalizeSearchValue = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();

const normalizeKey = (value) =>
  normalizeSearchValue(value).replace(/\s+/g, "_");

const matchesSearchParts = (parts, query) => {
  const q = normalizeSearchValue(query);
  if (!q) return true;
  return normalizeSearchValue(parts.filter(Boolean).join(" ")).includes(q);
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

const getUserValueLabel = (value, allowIdFallback = false) => {
  if (isNilLike(value)) return "";
  if (typeof value === "number") return allowIdFallback ? String(value) : "";
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return "";
    return allowIdFallback || Number.isNaN(Number(text)) ? text : "";
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => getUserValueLabel(item, allowIdFallback))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    return (
      value.nickname ||
      value.username ||
      value.name ||
      value.fullName ||
      value.lawyerName ||
      value.email ||
      value.title ||
      (allowIdFallback && hasUsableId(value) ? String(extractId(value)) : "")
    );
  }
  return "";
};

const getCreatedById = (record) =>
  extractId(record?.createdById) ||
  extractId(record?.createdBy) ||
  extractId(record?.owner) ||
  extractId(record?.lawyer) ||
  extractId(record?.responsibleLawyer);

const getCreatedByName = (record, userLabelMap = null) => {
  const candidates = [
    record?.createdBy,
    record?.owner,
    record?.lawyer,
    record?.responsibleLawyer,
  ];
  for (const candidate of candidates) {
    const label = getUserValueLabel(candidate);
    if (label) return label;
  }

  const userId = getCreatedById(record);
  if (hasUsableId(userId)) {
    const mappedLabel = userLabelMap?.get?.(String(userId));
    if (mappedLabel) return mappedLabel;
  }
  return "-";
};

const getLegalReferenceTitle = (record) => {
  if (!record) return "Legal Reference";
  const code = record.referenceCode || record.code || record.referenceNo || "";
  const title = record.title || record.name || record.referenceName || "";
  if (code && title && String(code) !== String(title))
    return `${code} - ${title}`;
  return title || code || `Legal Reference #${extractId(record) || ""}`;
};

const getCaseTitle = (record) => {
  if (!record) return "Case";
  const code = record.caseCode || record.projectCode || record.code || "";
  const title =
    record.projectName || record.caseName || record.title || record.name || "";
  if (code && title && String(code) !== String(title))
    return `${code} - ${title}`;
  return title || code || `Case #${extractId(record) || ""}`;
};

const getLegalStudyTitle = (record) => {
  if (!record) return "Legal Study";
  const code = record.studyCode || record.legalStudyCode || record.code || "";
  const title =
    record.title ||
    record.name ||
    record.studyName ||
    record.legalStudyName ||
    "";
  if (code && title && String(code) !== String(title))
    return `${code} - ${title}`;
  return title || code || `Legal Study #${extractId(record) || ""}`;
};

const getRelationRowsByFields = (record, fields) =>
  activeRows(
    uniqById(fields.flatMap((field) => relationRows(record?.[field]))),
  );

const getCaseRowsFromReferenceRecord = (record) =>
  getRelationRowsByFields(record, CONFIG.caseRelationNames);

const getLegalStudyRowsFromReferenceRecord = (record) =>
  getRelationRowsByFields(record, CONFIG.legalStudyRelationNames);

const getLegalStudyIdFromRecord = (record) =>
  extractId(record?.legalStudyId) ||
  extractId(record?.legalStudy) ||
  extractId(record?.legalStudiesId) ||
  extractId(record?.legalStudies) ||
  extractId(record?.sourceLegalStudyId) ||
  extractId(record?.sourceLegalStudy);

const isLegalStudyReferenceRecord = (record) => {
  const kind = normalizeKey(
    record?.referenceKind || record?.kind || record?.type,
  );
  const sourceSpace = normalizeKey(
    record?.sourceSpace || record?.storageType || record?.moduleScope,
  );
  return (
    kind === CONFIG.legalStudyReferenceKind ||
    sourceSpace === CONFIG.legalStudyStorageType ||
    hasUsableId(getLegalStudyIdFromRecord(record))
  );
};

const getLegalStudyRowsFromSourceRecords = (records) =>
  activeRows(records).flatMap((record) => {
    const relationStudies = getRelationRowsByFields(
      record,
      CONFIG.legalStudyRelationNames,
    );
    if (relationStudies.length) return relationStudies;
    const legalStudyId = getLegalStudyIdFromRecord(record);
    if (!hasUsableId(legalStudyId)) return [];
    return [
      {
        id: legalStudyId,
        title:
          record.legalStudyTitle ||
          record.legalStudyName ||
          record.title ||
          `Legal Study #${legalStudyId}`,
        description: record.description,
        status: record.status,
        createdBy: record.createdBy,
        updatedBy: record.updatedBy,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    ];
  });

const normalizeFilterId = (legalReferenceId) => {
  const safeId = Number(legalReferenceId);
  return Number.isFinite(safeId) && String(safeId) === String(legalReferenceId)
    ? safeId
    : legalReferenceId;
};

const idValue = (value) => {
  const id = extractId(value);
  if (id === null || id === undefined || id === "") return id;
  return normalizeFilterId(id);
};

const valueMatchesId = (value, id) => {
  const safeId = extractId(id);
  if (!hasUsableId(safeId)) return false;
  return (
    relationRows(value).some(
      (row) => String(extractId(row)) === String(safeId),
    ) ||
    asArray(value).some((row) => String(extractId(row)) === String(safeId)) ||
    String(extractId(value)) === String(safeId)
  );
};

const recordMatchesLegalReferenceScope = (record, legalReferenceId) =>
  [
    record?.sourceLegalReferenceId,
    record?.sourceLegalReference,
    record?.parentLegalReferenceId,
    record?.baseLegalReferenceId,
    record?.legalReferenceId,
    record?.legalReference,
    record?.legalReferences,
    record?.legalReferenceRecord,
  ].some((value) => valueMatchesId(value, legalReferenceId));

const buildLegalReferenceSourceFilter = () => ({
  referenceKind: { $eq: CONFIG.legalStudyReferenceKind },
});

const buildLegalReferenceScopeFilter = (legalReferenceId) => {
  const value = normalizeFilterId(legalReferenceId);
  return { legalReferenceId: { $eq: value } };
};

const fetchLegalReferenceSourceRows = async (legalReferenceId) => {
  const safeId = extractId(legalReferenceId);
  if (!safeId) return [];
  const response = await ctx.api.request({
    url: CONFIG.legalReferenceListUrl,
    params: {
      page: 1,
      pageSize: CONFIG.pageSize,
      filter: buildFilter(buildLegalReferenceSourceFilter()),
      appends: ["legalStudy", "createdBy", "updatedBy"],
      sort: ["-updatedAt", "-createdAt"],
    },
  });
  const data = getResponseData(response);
  return activeRows(Array.isArray(data) ? data : data ? [data] : [])
    .filter((row) => recordMatchesLegalReferenceScope(row, safeId))
    .filter(isLegalStudyReferenceRecord);
};

const fetchLegalStudyScopeRows = async (resourceUrl, filter) => {
  const response = await ctx.api.request({
    url: resourceUrl,
    params: {
      page: 1,
      pageSize: CONFIG.pageSize,
      filter: buildFilter(filter),
      appends: ["legalStudy", "createdBy", "updatedBy"],
      sort: ["-updatedAt", "-createdAt"],
    },
  });
  const data = getResponseData(response);
  return activeRows(Array.isArray(data) ? data : data ? [data] : []);
};

const buildLegalStudyBaseFilter = () => ({
  $and: [
    { isDeleted: { $ne: true } },
    { storageType: { $eq: CONFIG.legalStudyStorageType } },
  ],
});

const fetchLegalStudyScopeRowsForReference = async (
  resourceUrl,
  legalReferenceId,
) => {
  const safeId = extractId(legalReferenceId);
  if (!safeId) return [];

  const baseFilter = buildLegalStudyBaseFilter();
  let directRows = [];
  try {
    directRows = await fetchLegalStudyScopeRows(resourceUrl, {
      $and: [...baseFilter.$and, buildLegalReferenceScopeFilter(safeId)],
    });
  } catch (error) {
    console.warn(
      `[JsLegalReferenceLinks] ${resourceUrl} legalReferenceId filter failed, using broad Legal Study fallback`,
      error,
    );
  }
  if (directRows.length) return directRows;

  const broadRows = await fetchLegalStudyScopeRows(resourceUrl, baseFilter);
  return activeRows(broadRows).filter((row) =>
    recordMatchesLegalReferenceScope(row, safeId),
  );
};

const fetchLegalStudyRowsForReference = async (legalReferenceId) => {
  const [sourceReferenceRows, folderRows, documentRows] = await Promise.all([
    fetchLegalReferenceSourceRows(legalReferenceId).catch((error) => {
      console.warn(
        "[JsLegalReferenceLinks] legalReference:list source rows failed",
        error,
      );
      return [];
    }),
    fetchLegalStudyScopeRowsForReference(
      "folders:list",
      legalReferenceId,
    ).catch((error) => {
      console.warn(
        "[JsLegalReferenceLinks] folders:list legal study source rows failed",
        error,
      );
      return [];
    }),
    fetchLegalStudyScopeRowsForReference(
      "documents:list",
      legalReferenceId,
    ).catch((error) => {
      console.warn(
        "[JsLegalReferenceLinks] documents:list legal study source rows failed",
        error,
      );
      return [];
    }),
  ]);

  return uniqById(
    getLegalStudyRowsFromSourceRecords([
      ...sourceReferenceRows,
      ...folderRows,
      ...documentRows,
    ]),
  );
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

const fetchWithCandidates = async (urls, params = {}) => {
  let lastError = null;
  for (const url of urls) {
    try {
      return activeRows(await fetchAllList(url, params));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("No API candidate worked");
};

const fetchCandidateCases = () =>
  fetchWithCandidates(CONFIG.caseListCandidates, {
    appends: ["createdBy", "updatedBy", "legalReference", "legalStudy", "legalStudies"],
    sort: ["-updatedAt", "-createdAt"],
  }).catch(() =>
    fetchWithCandidates(CONFIG.caseListCandidates, {
      sort: ["-updatedAt", "-createdAt"],
    }),
  );

const fetchCandidateLegalStudies = () =>
  fetchWithCandidates(CONFIG.legalStudyListCandidates, {
    appends: ["createdBy", "updatedBy"],
    sort: ["-updatedAt", "-createdAt"],
  }).catch(() =>
    fetchWithCandidates(CONFIG.legalStudyListCandidates, {
      sort: ["-updatedAt", "-createdAt"],
    }),
  );

const postRelationCandidates = async (candidates) => {
  let lastError = null;
  for (const candidate of candidates) {
    const targetValue = idValue(candidate.targetId);
    if (!hasUsableId(targetValue)) continue;
    for (const data of [{ tk: targetValue }, { tks: [targetValue] }]) {
      try {
        const response = await ctx.api.request({
          url: candidate.url,
          method: "POST",
          data,
        });
        return getResponseData(response);
      } catch (error) {
        lastError = error;
      }
    }
  }
  throw lastError || new Error("Failed to create relation link");
};

const addCaseLinkToLegalReference = (legalReferenceId, caseId) => {
  const refId = idValue(legalReferenceId);
  const cId = idValue(caseId);
  if (!hasUsableId(refId) || !hasUsableId(cId)) {
    throw new Error("Missing Legal Reference or Case ID");
  }
  return postRelationCandidates([
    { url: `projects/${encodeURIComponent(cId)}/legalReference:add`, targetId: refId },
    { url: `projects/${encodeURIComponent(cId)}/legalReferences:add`, targetId: refId },
    { url: `projects/${encodeURIComponent(cId)}/sourceLegalReference:add`, targetId: refId },
    { url: `cases/${encodeURIComponent(cId)}/legalReference:add`, targetId: refId },
    { url: `cases/${encodeURIComponent(cId)}/legalReferences:add`, targetId: refId },
    { url: `cases/${encodeURIComponent(cId)}/sourceLegalReference:add`, targetId: refId },
    { url: `legalReference/${encodeURIComponent(refId)}/cases:add`, targetId: cId },
    { url: `legalReference/${encodeURIComponent(refId)}/projects:add`, targetId: cId },
    { url: `legalReferences/${encodeURIComponent(refId)}/cases:add`, targetId: cId },
    { url: `legalReferences/${encodeURIComponent(refId)}/projects:add`, targetId: cId },
    { url: `LegalReference/${encodeURIComponent(refId)}/cases:add`, targetId: cId },
    { url: `LegalReference/${encodeURIComponent(refId)}/projects:add`, targetId: cId },
  ]);
};

const addLegalStudyLinkToLegalReference = (legalReferenceId, legalStudyId) => {
  const refId = idValue(legalReferenceId);
  const studyId = idValue(legalStudyId);
  if (!hasUsableId(refId) || !hasUsableId(studyId)) {
    throw new Error("Missing Legal Reference or Legal Study ID");
  }
  return postRelationCandidates([
    { url: `legalReference/${encodeURIComponent(refId)}/legalStudy:add`, targetId: studyId },
    { url: `legalReference/${encodeURIComponent(refId)}/legalStudies:add`, targetId: studyId },
    { url: `legalReference/${encodeURIComponent(refId)}/sourceLegalStudy:add`, targetId: studyId },
    { url: `legalReferences/${encodeURIComponent(refId)}/legalStudy:add`, targetId: studyId },
    { url: `legalReferences/${encodeURIComponent(refId)}/legalStudies:add`, targetId: studyId },
    { url: `legalReferences/${encodeURIComponent(refId)}/sourceLegalStudy:add`, targetId: studyId },
    { url: `LegalReference/${encodeURIComponent(refId)}/legalStudy:add`, targetId: studyId },
    { url: `LegalReference/${encodeURIComponent(refId)}/legalStudies:add`, targetId: studyId },
    { url: `LegalReference/${encodeURIComponent(refId)}/sourceLegalStudy:add`, targetId: studyId },
    { url: `legalStudy/${encodeURIComponent(studyId)}/legalReference:add`, targetId: refId },
    { url: `legalStudy/${encodeURIComponent(studyId)}/legalReferences:add`, targetId: refId },
    { url: `legalStudy/${encodeURIComponent(studyId)}/sourceLegalReference:add`, targetId: refId },
    { url: `legalStudies/${encodeURIComponent(studyId)}/legalReference:add`, targetId: refId },
    { url: `legalStudies/${encodeURIComponent(studyId)}/legalReferences:add`, targetId: refId },
    { url: `legalStudies/${encodeURIComponent(studyId)}/sourceLegalReference:add`, targetId: refId },
    { url: `LegalStudy/${encodeURIComponent(studyId)}/legalReference:add`, targetId: refId },
    { url: `LegalStudy/${encodeURIComponent(studyId)}/legalReferences:add`, targetId: refId },
    { url: `LegalStudy/${encodeURIComponent(studyId)}/sourceLegalReference:add`, targetId: refId },
  ]);
};

const fetchLegalReferenceWithLinks = async (legalReferenceId) => {
  const safeId = extractId(legalReferenceId);
  if (!safeId) return null;
  const response = await ctx.api.request({
    url: `${CONFIG.legalReferenceGetUrl}?filterByTk=${encodeURIComponent(safeId)}`,
    params: { appends: CONFIG.relationAppends },
  });
  const data = getResponseData(response);
  return Array.isArray(data) ? data[0] || null : data;
};

const fetchUserLabelMap = async (userIds) => {
  const ids = Array.from(
    new Set(asArray(userIds).map(extractId).filter(hasUsableId).map(String)),
  );
  if (!ids.length) return new Map();

  try {
    const response = await ctx.api.request({
      url: "users:list",
      params: {
        page: 1,
        pageSize: Math.max(ids.length, 50),
        fields: "id,nickname,username,email",
        filter: buildFilter({
          id: { $in: ids.map(normalizeFilterId) },
        }),
      },
    });
    const rows = asArray(getResponseData(response));
    return new Map(
      rows
        .map((user) => [
          String(extractId(user)),
          getUserValueLabel(user),
        ])
        .filter(([id, label]) => id && label),
    );
  } catch (error) {
    console.warn("[JsLegalReferenceLinks] users:list creator labels failed", error);
    return new Map();
  }
};

const resolveLinkCreatorLabels = async (links) => {
  const ids = links.map((link) => getCreatedById(link?.record)).filter(hasUsableId);
  const userLabelMap = await fetchUserLabelMap(ids);
  if (!userLabelMap.size) return links;
  return links.map((link) => ({
    ...link,
    createdBy: getCreatedByName(link.record, userLabelMap),
  }));
};

const getRecordStatus = (record) =>
  record?.status ||
  record?.projectStatus ||
  record?.caseStatus ||
  record?.state ||
  "";

const getStatusColor = (status) => {
  const text = normalizeSearchValue(status);
  if (!text) return "default";
  if (["active", "open", "running", "in_progress", "dang xu ly"].includes(text))
    return "green";
  if (["pending", "draft", "new"].includes(text)) return "gold";
  if (["closed", "completed", "done", "finished"].includes(text))
    return "default";
  if (["cancelled", "canceled", "rejected"].includes(text)) return "red";
  return "blue";
};

const normalizeCaseLink = (record) => {
  const recordId = extractId(record);
  return {
    id: `case-${recordId}`,
    recordId: String(recordId || ""),
    type: "case",
    record,
    title: getCaseTitle(record),
    description: stripHtml(
      record?.description || record?.caseDescription || record?.summary,
    ),
    status: getRecordStatus(record),
    createdBy: getCreatedByName(record),
    createdById: getCreatedById(record),
    linkedAt: record?.linkedAt || record?.createdAt,
    updatedAt: record?.updatedAt || record?.createdAt,
  };
};

const normalizeLegalStudyLink = (record) => {
  const recordId = extractId(record);
  return {
    id: `legal-study-${recordId}`,
    recordId: String(recordId || ""),
    type: "legal_study",
    record,
    title: getLegalStudyTitle(record),
    description: stripHtml(record?.description || record?.summary),
    status: getRecordStatus(record),
    createdBy: getCreatedByName(record),
    createdById: getCreatedById(record),
    linkedAt: record?.linkedAt || record?.createdAt,
    updatedAt: record?.updatedAt || record?.createdAt,
  };
};

const buildDetailUrl = (template, id) => {
  const path = template.replace("{id}", encodeURIComponent(id));
  return /^https?:\/\//i.test(path) ? path : `${window.location.origin}${path}`;
};

function LegalReferenceLinksViewer() {
  const currentRecord = getCurrentRecord();
  const legalReferenceId = getCurrentLegalReferenceId(currentRecord);
  const [linkForm] = Form.useForm();
  const [referenceRecord, setReferenceRecord] = React.useState(currentRecord);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [links, setLinks] = React.useState([]);
  const [filterKind, setFilterKind] = React.useState("all");
  const [searchText, setSearchText] = React.useState("");
  const [linkModalOpen, setLinkModalOpen] = React.useState(false);
  const [linkMode, setLinkMode] = React.useState("case");
  const [linkLoading, setLinkLoading] = React.useState(false);
  const [optionLoading, setOptionLoading] = React.useState(false);
  const [caseOptions, setCaseOptions] = React.useState([]);
  const [legalStudyOptions, setLegalStudyOptions] = React.useState([]);
  const [caseOptionSearch, setCaseOptionSearch] = React.useState("");
  const [legalStudyOptionSearch, setLegalStudyOptionSearch] = React.useState("");

  const loadLinks = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!hasUsableId(legalReferenceId)) {
        setLinks([]);
        return;
      }

      const localRecord = getCurrentRecord();
      const fetchedRecord = await fetchLegalReferenceWithLinks(
        legalReferenceId,
      ).catch((fetchError) => {
        console.warn(
          "[JsLegalReferenceLinks] legalReference:get failed, using current record",
          fetchError,
        );
        return null;
      });
      const record = fetchedRecord || localRecord;
      const caseRows = getCaseRowsFromReferenceRecord(record);
      const directStudyRows = [
        ...getLegalStudyRowsFromReferenceRecord(record),
        ...getLegalStudyRowsFromSourceRecords([record]),
      ];
      const fetchedReferenceStudyRows = await fetchLegalStudyRowsForReference(
        legalReferenceId,
      ).catch((fetchError) => {
        console.warn(
          "[JsLegalReferenceLinks] legalReference-based Legal Study fetch failed",
          fetchError,
        );
        return [];
      });
      const studyRows = uniqById([
        ...directStudyRows,
        ...fetchedReferenceStudyRows,
      ]);

      setReferenceRecord(record);

      const nextLinks = uniqLinks([
        ...activeRows(caseRows).map(normalizeCaseLink),
        ...activeRows(studyRows).map(normalizeLegalStudyLink),
      ])
        .filter((link) => hasUsableId(link.recordId))
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.linkedAt || 0) -
            new Date(a.updatedAt || a.linkedAt || 0),
        );

      setLinks(await resolveLinkCreatorLabels(nextLinks));
    } catch (loadError) {
      console.error("[JsLegalReferenceLinks] load failed", loadError);
      setError(loadError?.message || "Unable to load linked data.");
    } finally {
      setLoading(false);
    }
  }, [legalReferenceId]);

  React.useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  React.useEffect(() => {
    const handler = () => loadLinks();
    ctx.element?.addEventListener?.("js-field:value-change", handler);
    return () =>
      ctx.element?.removeEventListener?.("js-field:value-change", handler);
  }, [loadLinks]);

  React.useEffect(() => {
    const reloaders = (ctx.engine || ctx.app)?.__nocobaseReloaders;
    if (!reloaders?.add) return undefined;
    reloaders.add(loadLinks);
    return () => reloaders.delete(loadLinks);
  }, [loadLinks]);

  const caseCount = links.filter((link) => link.type === "case").length;
  const legalStudyCount = links.filter(
    (link) => link.type === "legal_study",
  ).length;
  const linkedCaseIds = React.useMemo(
    () =>
      new Set(
        links
          .filter((link) => link.type === "case")
          .map((link) => String(link.recordId))
          .filter(Boolean),
      ),
    [links],
  );
  const linkedLegalStudyIds = React.useMemo(
    () =>
      new Set(
        links
          .filter((link) => link.type === "legal_study")
          .map((link) => String(link.recordId))
          .filter(Boolean),
      ),
    [links],
  );

  const filteredCaseOptions = React.useMemo(() => {
    const q = caseOptionSearch.trim();
    return activeRows(caseOptions).filter((item) => {
      if (linkedCaseIds.has(String(extractId(item)))) return false;
      if (!q) return true;
      return matchesSearchParts(
        [
          getCaseTitle(item),
          item?.caseCode,
          item?.projectCode,
          item?.caseName,
          item?.projectName,
          item?.description,
        ],
        q,
      );
    });
  }, [caseOptions, caseOptionSearch, linkedCaseIds]);

  const filteredLegalStudyOptions = React.useMemo(() => {
    const q = legalStudyOptionSearch.trim();
    return activeRows(legalStudyOptions).filter((item) => {
      if (linkedLegalStudyIds.has(String(extractId(item)))) return false;
      if (!q) return true;
      return matchesSearchParts(
        [
          getLegalStudyTitle(item),
          item?.studyCode,
          item?.legalStudyCode,
          item?.code,
          item?.description,
        ],
        q,
      );
    });
  }, [legalStudyOptions, legalStudyOptionSearch, linkedLegalStudyIds]);

  const loadLinkOptions = React.useCallback(async () => {
    setOptionLoading(true);
    try {
      const [cases, studies] = await Promise.all([
        fetchCandidateCases().catch((error) => {
          console.warn("[JsLegalReferenceLinks] fetch case options failed", error);
          return [];
        }),
        fetchCandidateLegalStudies().catch((error) => {
          console.warn("[JsLegalReferenceLinks] fetch legal study options failed", error);
          return [];
        }),
      ]);
      setCaseOptions(activeRows(uniqById(cases)));
      setLegalStudyOptions(activeRows(uniqById(studies)));
    } finally {
      setOptionLoading(false);
    }
  }, []);

  const openLinkModal = () => {
    setLinkMode("case");
    setCaseOptionSearch("");
    setLegalStudyOptionSearch("");
    linkForm.resetFields();
    linkForm.setFieldsValue({ linkMode: "case" });
    setLinkModalOpen(true);
    loadLinkOptions();
  };

  const closeLinkModal = () => {
    setLinkModalOpen(false);
    setCaseOptionSearch("");
    setLegalStudyOptionSearch("");
    linkForm.resetFields();
  };

  const handleLinkSubmit = async () => {
    setLinkLoading(true);
    try {
      const values = await linkForm.validateFields();
      if (linkMode === "case") {
        const caseId = values.caseId;
        if (linkedCaseIds.has(String(caseId))) {
          message?.info?.("This case is already linked.");
          closeLinkModal();
          return;
        }
        await addCaseLinkToLegalReference(legalReferenceId, caseId);
        message?.success?.("Linked case successfully.");
      } else {
        const legalStudyId = values.legalStudyId;
        if (linkedLegalStudyIds.has(String(legalStudyId))) {
          message?.info?.("This Legal Study is already linked.");
          closeLinkModal();
          return;
        }
        await addLegalStudyLinkToLegalReference(legalReferenceId, legalStudyId);
        message?.success?.("Linked Legal Study successfully.");
      }

      closeLinkModal();
      await loadLinks();
    } catch (error) {
      if (error?.errorFields) return;
      console.error("[JsLegalReferenceLinks] add link failed", error);
      message?.error?.("Failed to add link.");
    } finally {
      setLinkLoading(false);
    }
  };

  const filteredLinks = React.useMemo(() => {
    const q = searchText.trim();
    return links.filter((link) => {
      if (filterKind === "case" && link.type !== "case") return false;
      if (filterKind === "legal_study" && link.type !== "legal_study")
        return false;
      if (!q) return true;
      return matchesSearchParts(
        [
          link.title,
          link.description,
          link.status,
          link.record?.caseCode,
          link.record?.projectCode,
          link.record?.studyCode,
          link.record?.legalStudyCode,
          link.record?.code,
        ],
        q,
      );
    });
  }, [links, filterKind, searchText]);

  const openLinkedRecord = (link) => {
    if (!link?.recordId) {
      message?.warning?.("Record ID not found.");
      return;
    }
    const template =
      link.type === "legal_study"
        ? CONFIG.legalStudyDetailUrlTemplate
        : CONFIG.caseDetailUrlTemplate;
    const opened = window.open(
      buildDetailUrl(template, link.recordId),
      "_blank",
      "noopener,noreferrer",
    );
    if (!opened) message?.warning?.("Please allow pop-ups to open details.");
  };

  const renderText = (props, children) =>
    Text ? h(Text, props, children) : h("span", props, children);

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
          boxShadow: isActive
            ? "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)"
            : "none",
          transition: "all 0.2s ease",
        },
      },
      h(
        "span",
        { style: { display: "flex", alignItems: "center", gap: 6 } },
        label,
        typeof count === "number"
          ? h(
              "span",
              {
                style: {
                  background: isActive ? color.blueSoft : "#E5E7EB",
                  color: isActive ? color.blue : color.muted,
                  padding: "2px 6px",
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                },
              },
              count,
            )
          : null,
      ),
    );
  };

  const renderKindBadge = (type) =>
    h(
      Tag,
      {
        color: type === "legal_study" ? "purple" : "geekblue",
        style: { margin: 0, borderRadius: 4, fontWeight: 600 },
      },
      type === "legal_study" ? "Legal Study" : "Linked Case",
    );

  const renderLinkModeButton = (key, label) => {
    const isActive = linkMode === key;
    return h(
      "button",
      {
        type: "button",
        onClick: () => {
          setLinkMode(key);
          setCaseOptionSearch("");
          setLegalStudyOptionSearch("");
          linkForm.resetFields();
          linkForm.setFieldsValue({ linkMode: key });
        },
        style: {
          border: 0,
          background: isActive ? color.white : "transparent",
          color: isActive ? color.blue : color.muted,
          borderRadius: 6,
          padding: "6px 14px",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: isActive
            ? "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)"
            : "none",
          transition: "all 0.2s ease",
        },
      },
      label,
    );
  };

  const renderLinkModal = () =>
    h(
      Modal,
      {
        title: "Add link",
        open: linkModalOpen,
        width: 720,
        onCancel: closeLinkModal,
        onOk: handleLinkSubmit,
        okText: "Add link",
        cancelText: "Cancel",
        confirmLoading: linkLoading,
        destroyOnClose: true,
      },
      h(
        Form,
        {
          form: linkForm,
          layout: "vertical",
          initialValues: { linkMode: "case" },
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
              border: `1px solid ${color.border}`,
              marginBottom: 20,
            },
          },
          renderLinkModeButton("case", "Linked Case"),
          renderLinkModeButton("legal_study", "Legal Study"),
        ),
        linkMode === "case"
          ? [
              h(
                "div",
                {
                  key: "caseCount",
                  style: { marginBottom: 8, color: color.muted, fontSize: 12 },
                },
                `Found ${filteredCaseOptions.length} cases`,
              ),
              h(
                Form.Item,
                {
                  key: "caseId",
                  name: "caseId",
                  label: "Case",
                  rules: [{ required: true, message: "Please select a case" }],
                },
                h(
                  Select,
                  {
                    showSearch: true,
                    loading: optionLoading,
                    placeholder: "Search case...",
                    searchValue: caseOptionSearch,
                    onSearch: setCaseOptionSearch,
                    onChange: () => setCaseOptionSearch(""),
                    optionFilterProp: "label",
                    filterOption: false,
                    notFoundContent: optionLoading
                      ? h(Spin, { size: "small" })
                      : "No case found",
                  },
                  filteredCaseOptions.slice(0, 100).map((item) => {
                    const label = getCaseTitle(item);
                    return h(
                      Select.Option,
                      {
                        key: String(extractId(item)),
                        value: String(extractId(item)),
                        label,
                      },
                      label,
                    );
                  }),
                ),
              ),
            ]
          : [
              h(
                "div",
                {
                  key: "studyCount",
                  style: { marginBottom: 8, color: color.muted, fontSize: 12 },
                },
                `Found ${filteredLegalStudyOptions.length} Legal Studies`,
              ),
              h(
                Form.Item,
                {
                  key: "legalStudyId",
                  name: "legalStudyId",
                  label: "Legal Study",
                  rules: [
                    { required: true, message: "Please select a Legal Study" },
                  ],
                },
                h(
                  Select,
                  {
                    showSearch: true,
                    loading: optionLoading,
                    placeholder: "Search Legal Study...",
                    searchValue: legalStudyOptionSearch,
                    onSearch: setLegalStudyOptionSearch,
                    onChange: () => setLegalStudyOptionSearch(""),
                    optionFilterProp: "label",
                    filterOption: false,
                    notFoundContent: optionLoading
                      ? h(Spin, { size: "small" })
                      : "No Legal Study found",
                  },
                  filteredLegalStudyOptions.slice(0, 100).map((item) => {
                    const label = getLegalStudyTitle(item);
                    return h(
                      Select.Option,
                      {
                        key: String(extractId(item)),
                        value: String(extractId(item)),
                        label,
                      },
                      label,
                    );
                  }),
                ),
              ),
            ],
      ),
    );

  const renderStatus = (status) => {
    if (!status)
      return renderText({ style: { color: color.muted, fontSize: 13 } }, "-");
    return h(
      Tag,
      { color: getStatusColor(status), style: { margin: 0, borderRadius: 4 } },
      String(status),
    );
  };

  const renderRow = (link) =>
    h(
      "div",
      {
        key: link.id,
        style: {
          display: "grid",
          gridTemplateColumns: LINK_TABLE_COLUMNS,
          gap: 10,
          alignItems: "center",
          minWidth: LINK_TABLE_MIN_WIDTH,
          padding: "12px 12px",
          borderTop: `1px solid ${color.border}`,
          background: color.white,
        },
      },
      h("div", null, renderKindBadge(link.type)),
      h(
        "button",
        {
          type: "button",
          onClick: () => openLinkedRecord(link),
          style: {
            border: 0,
            padding: 0,
            background: "transparent",
            textAlign: "left",
            cursor: "pointer",
            minWidth: 0,
            fontFamily: "inherit",
          },
        },
        h(
          Tooltip,
          { title: link.title },
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
            link.title,
          ),
        ),
      ),
      h(
        Tooltip,
        { title: link.description || "" },
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
          link.description || "-",
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
        link.createdBy || "-",
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
        formatDate(link.updatedAt || link.linkedAt) || "-",
      ),
      h(
        Tooltip,
        { title: "Open details" },
        h(Button, {
          type: "link",
          size: "small",
          icon: ICONS.open,
          onClick: () => openLinkedRecord(link),
          style: { padding: 0, width: 32, minWidth: 32, overflow: "hidden" },
        }),
      ),
    );

  if (!hasUsableId(legalReferenceId)) {
    return h(Alert, {
      type: "warning",
      showIcon: true,
      message: "Current Legal Reference not found",
    });
  }

  if (loading) {
    return h(
      "div",
      { style: { padding: 28, textAlign: "center" } },
      h(Spin, null),
    );
  }

  if (error) {
    return h(Alert, {
      type: "error",
      showIcon: true,
      message: "Unable to load links",
      description: error,
      action: h(Button, { size: "small", onClick: loadLinks }, "Reload"),
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
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            padding: "12px 16px",
            borderBottom: `1px solid ${color.border}`,
            background: color.bg,
          },
        },
        h(
          "div",
          {
            style: {
              display: "flex",
              flex: "0 1 auto",
              gap: 4,
              maxWidth: "100%",
              overflowX: "auto",
              background: "#E5E7EB",
              padding: 4,
              borderRadius: 8,
              border: `1px solid ${color.borderDark}`,
            },
          },
          renderSegmentButton("all", "All", links.length),
          renderSegmentButton("case", "Linked Case", caseCount),
          renderSegmentButton("legal_study", "Legal Study", legalStudyCount),
        ),
        h(
          "div",
          {
            style: {
              marginLeft: "auto",
              display: "flex",
              flex: "1 1 320px",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
              flexWrap: "wrap",
              minWidth: 0,
              maxWidth: "100%",
            },
          },
          h(Input.Search, {
            allowClear: true,
            placeholder: "Search...",
            value: searchText,
            onChange: (event) => setSearchText(event.target.value),
            style: {
              flex: "1 1 160px",
              minWidth: 130,
              maxWidth: 280,
              width: "100%",
            },
          }),
          h(
            Button,
            {
              type: "primary",
              onClick: openLinkModal,
              style: { flex: "0 0 auto", whiteSpace: "nowrap" },
            },
            "Add link",
          ),
          h(
            Button,
            {
              icon: ICONS.refresh,
              onClick: loadLinks,
              style: { flex: "0 0 auto", whiteSpace: "nowrap" },
            },
            "Reload",
          ),
        ),
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
                  gridTemplateColumns: LINK_TABLE_COLUMNS,
                  gap: 10,
                  minWidth: LINK_TABLE_MIN_WIDTH,
                  padding: "9px 12px",
                  background: color.white,
                  color: color.muted,
                  fontSize: 12,
                  fontWeight: 700,
                },
              },
              h("div", null, "Type"),
              h("div", null, "Code/Name"),
              h("div", null, "Description"),
              h("div", null, "Creator"),
              h("div", null, "Updated"),
              h("div", null, ""),
            ),
            filteredLinks.map(renderRow),
          )
        : h(Empty, {
            image: Empty.PRESENTED_IMAGE_SIMPLE,
            description: links.length
              ? "No matching links found."
              : "No linked Cases or Legal Studies yet.",
            style: { padding: "46px 0" },
          }),
    ),
    renderLinkModal(),
  );
}

ctx.render(h(LegalReferenceLinksViewer));
