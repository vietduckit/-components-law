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
  legalReferenceDetailUrlTemplate:
    "/admin/5hu22zyhxgd/view/hgakeuwafzz/tab/67tvoviyl4s/filterbytk/{id}",
  legalStudyGetCandidates: ["legalStudy:get", "legalStudies:get", "LegalStudy:get"],
  legalReferenceListCandidates: [
    "legalReference:list",
    "legalReferences:list",
    "LegalReference:list",
  ],
  caseListCandidates: ["projects:list", "cases:list"],
  pageSize: 200,
  caseRelationNames: ["cases", "projects", "caseReferences"],
  legalReferenceRelationNames: [
    "legalReference",
    "legalReferences",
    "legalReferenceRecord",
  ],
  studyAppends: ["createdBy", "updatedBy"],
  caseListAppends: ["legalStudy", "legalStudies", "createdBy", "updatedBy"],
  referenceListAppends: ["legalStudy", "legalStudies", "createdBy", "updatedBy"],
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

const normalizeFilterId = (id) => {
  const safeId = Number(id);
  return Number.isFinite(safeId) && String(safeId) === String(id) ? safeId : id;
};

const idValue = (value) => {
  const id = extractId(value);
  if (id === null || id === undefined || id === "") return id;
  return normalizeFilterId(id);
};

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

const getCurrentLegalStudyId = (record = null) =>
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
    .replace(/[Ä‘Ä]/g, "d")
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

const getCaseTitle = (record) => {
  if (!record) return "Case";
  const code = record.caseCode || record.projectCode || record.code || "";
  const title =
    record.projectName || record.caseName || record.title || record.name || "";
  if (code && title && String(code) !== String(title))
    return `${code} - ${title}`;
  return title || code || `Case #${extractId(record) || ""}`;
};

const getLegalReferenceTitle = (record) => {
  if (!record) return "Legal Reference";
  const title = record.title || record.name || record.referenceName || "";
  if ( title && String(code) !== String(title))
    return `${title}`;
  return title || `Legal Reference #${extractId(record) || ""}`;
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

const recordMatchesLegalStudy = (record, legalStudyId) =>
  [
    record?.legalStudyId,
    record?.legalStudy,
    record?.legalStudies,
    record?.legalStudiesId,
    record?.sourceLegalStudyId,
    record?.sourceLegalStudy,
    record?.parentLegalStudyId,
    record?.baseLegalStudyId,
  ].some((value) => valueMatchesId(value, legalStudyId));

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
    appends: CONFIG.caseListAppends,
    sort: ["-updatedAt", "-createdAt"],
  }).catch(() =>
    fetchWithCandidates(CONFIG.caseListCandidates, {
      sort: ["-updatedAt", "-createdAt"],
    }),
  );

const fetchCandidateLegalReferences = () =>
  fetchWithCandidates(CONFIG.legalReferenceListCandidates, {
    appends: CONFIG.referenceListAppends,
    sort: ["-updatedAt", "-createdAt"],
  }).catch(() =>
    fetchWithCandidates(CONFIG.legalReferenceListCandidates, {
      sort: ["-updatedAt", "-createdAt"],
    }),
  );

const fetchLegalStudyWithLinks = async (legalStudyId) => {
  const safeId = extractId(legalStudyId);
  if (!safeId) return null;

  const appendSets = [CONFIG.studyAppends, ["createdBy", "updatedBy"], []];
  for (const url of CONFIG.legalStudyGetCandidates) {
    for (const appends of appendSets) {
      try {
        const response = await ctx.api.request({
          url: `${url}?filterByTk=${encodeURIComponent(safeId)}`,
          params: appends.length ? { appends } : {},
        });
        const data = getResponseData(response);
        return Array.isArray(data) ? data[0] || null : data;
      } catch {
        // Try the next endpoint/append set.
      }
    }
  }
  return null;
};

const fetchCaseRowsForStudy = async (legalStudyId) => {
  const rows = [];
  for (const url of CONFIG.caseListCandidates) {
    try {
      rows.push(
        ...(await fetchAllList(url, {
          appends: CONFIG.caseListAppends,
          sort: ["-updatedAt", "-createdAt"],
        })),
      );
      break;
    } catch {
      try {
        rows.push(
          ...(await fetchAllList(url, {
            sort: ["-updatedAt", "-createdAt"],
          })),
        );
        break;
      } catch {
        // Try next case collection candidate.
      }
    }
  }
  return activeRows(rows).filter((row) =>
    recordMatchesLegalStudy(row, legalStudyId),
  );
};

const fetchLegalReferenceRowsForStudy = async (legalStudyId) => {
  const rows = [];
  const appendSets = [CONFIG.referenceListAppends, ["createdBy", "updatedBy"], []];

  for (const url of CONFIG.legalReferenceListCandidates) {
    let fetched = false;
    for (const appends of appendSets) {
      try {
        rows.push(
          ...(await fetchAllList(url, {
            ...(appends.length ? { appends } : {}),
            sort: ["-updatedAt", "-createdAt"],
          })),
        );
        fetched = true;
        break;
      } catch {
        // Try next append set.
      }
    }
    if (fetched) break;
  }

  return activeRows(rows).filter((row) =>
    recordMatchesLegalStudy(row, legalStudyId),
  );
};

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

const addCaseLinkToLegalStudy = (legalStudyId, caseId) => {
  const studyId = idValue(legalStudyId);
  const cId = idValue(caseId);
  if (!hasUsableId(studyId) || !hasUsableId(cId)) {
    throw new Error("Missing Legal Study or Case ID");
  }
  return postRelationCandidates([
    { url: `projects/${encodeURIComponent(cId)}/legalStudy:add`, targetId: studyId },
    { url: `projects/${encodeURIComponent(cId)}/legalStudies:add`, targetId: studyId },
    { url: `projects/${encodeURIComponent(cId)}/sourceLegalStudy:add`, targetId: studyId },
    { url: `cases/${encodeURIComponent(cId)}/legalStudy:add`, targetId: studyId },
    { url: `cases/${encodeURIComponent(cId)}/legalStudies:add`, targetId: studyId },
    { url: `cases/${encodeURIComponent(cId)}/sourceLegalStudy:add`, targetId: studyId },
    { url: `legalStudy/${encodeURIComponent(studyId)}/cases:add`, targetId: cId },
    { url: `legalStudy/${encodeURIComponent(studyId)}/projects:add`, targetId: cId },
    { url: `legalStudies/${encodeURIComponent(studyId)}/cases:add`, targetId: cId },
    { url: `legalStudies/${encodeURIComponent(studyId)}/projects:add`, targetId: cId },
    { url: `LegalStudy/${encodeURIComponent(studyId)}/cases:add`, targetId: cId },
    { url: `LegalStudy/${encodeURIComponent(studyId)}/projects:add`, targetId: cId },
  ]);
};

const addLegalReferenceLinkToLegalStudy = (legalStudyId, legalReferenceId) => {
  const studyId = idValue(legalStudyId);
  const refId = idValue(legalReferenceId);
  if (!hasUsableId(studyId) || !hasUsableId(refId)) {
    throw new Error("Missing Legal Study or Legal Reference ID");
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
        .map((user) => [String(extractId(user)), getUserValueLabel(user)])
        .filter(([id, label]) => id && label),
    );
  } catch (error) {
    console.warn("[JsLegalStudyLinks] users:list creator labels failed", error);
    return new Map();
  }
};

const resolveLinkCreatorLabels = async (links) => {
  const ids = links
    .map((link) => getCreatedById(link?.record))
    .filter(hasUsableId);
  const userLabelMap = await fetchUserLabelMap(ids);
  if (!userLabelMap.size) return links;
  return links.map((link) => ({
    ...link,
    createdBy: getCreatedByName(link.record, userLabelMap),
  }));
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
    createdBy: getCreatedByName(record),
    createdById: getCreatedById(record),
    linkedAt: record?.linkedAt || record?.createdAt,
    updatedAt: record?.updatedAt || record?.createdAt,
  };
};

const normalizeLegalReferenceLink = (record) => {
  const recordId = extractId(record);
  return {
    id: `legal-reference-${recordId}`,
    recordId: String(recordId || ""),
    type: "legal_reference",
    record,
    title: getLegalReferenceTitle(record),
    description: stripHtml(record?.description || record?.summary),
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

function LegalStudyLinksViewer() {
  const [linkForm] = Form.useForm();
  const currentRecord = getCurrentRecord();
  const legalStudyId = getCurrentLegalStudyId(currentRecord);
  const [studyRecord, setStudyRecord] = React.useState(currentRecord);
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
  const [legalReferenceOptions, setLegalReferenceOptions] = React.useState([]);
  const [caseOptionSearch, setCaseOptionSearch] = React.useState("");
  const [legalReferenceOptionSearch, setLegalReferenceOptionSearch] =
    React.useState("");

  const loadLinks = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!hasUsableId(legalStudyId)) {
        setLinks([]);
        return;
      }

      const localRecord = getCurrentRecord();
      const fetchedRecord = await fetchLegalStudyWithLinks(legalStudyId).catch(
        (fetchError) => {
          console.warn(
            "[JsLegalStudyLinks] legalStudy:get failed, using current record",
            fetchError,
          );
          return null;
        },
      );
      const record = fetchedRecord || localRecord;
      const directCaseRows = getRelationRowsByFields(
        record,
        CONFIG.caseRelationNames,
      );
      const directReferenceRows = getRelationRowsByFields(
        record,
        CONFIG.legalReferenceRelationNames,
      );

      const [caseRows, referenceRows] = await Promise.all([
        fetchCaseRowsForStudy(legalStudyId).catch((fetchError) => {
          console.warn("[JsLegalStudyLinks] projects:list study links failed", fetchError);
          return [];
        }),
        fetchLegalReferenceRowsForStudy(legalStudyId).catch((fetchError) => {
          console.warn("[JsLegalStudyLinks] legalReference:list study links failed", fetchError);
          return [];
        }),
      ]);

      setStudyRecord(record);

      const nextLinks = uniqLinks([
        ...activeRows(uniqById([...directCaseRows, ...caseRows])).map(
          normalizeCaseLink,
        ),
        ...activeRows(uniqById([...directReferenceRows, ...referenceRows])).map(
          normalizeLegalReferenceLink,
        ),
      ])
        .filter((link) => hasUsableId(link.recordId))
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.linkedAt || 0) -
            new Date(a.updatedAt || a.linkedAt || 0),
        );

      setLinks(await resolveLinkCreatorLabels(nextLinks));
    } catch (loadError) {
      console.error("[JsLegalStudyLinks] load failed", loadError);
      setError(loadError?.message || "Unable to load linked data.");
    } finally {
      setLoading(false);
    }
  }, [legalStudyId]);

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
  const legalReferenceCount = links.filter(
    (link) => link.type === "legal_reference",
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

  const linkedLegalReferenceIds = React.useMemo(
    () =>
      new Set(
        links
          .filter((link) => link.type === "legal_reference")
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

  const filteredLegalReferenceOptions = React.useMemo(() => {
    const q = legalReferenceOptionSearch.trim();
    return activeRows(legalReferenceOptions).filter((item) => {
      if (linkedLegalReferenceIds.has(String(extractId(item)))) return false;
      if (!q) return true;
      return matchesSearchParts(
        [
          getLegalReferenceTitle(item),
          item?.referenceCode,
          item?.legalReferenceCode,
          item?.code,
          item?.title,
          item?.name,
          item?.description,
        ],
        q,
      );
    });
  }, [
    legalReferenceOptions,
    legalReferenceOptionSearch,
    linkedLegalReferenceIds,
  ]);

  const loadLinkOptions = React.useCallback(async () => {
    setOptionLoading(true);
    try {
      const [cases, references] = await Promise.all([
        fetchCandidateCases().catch((fetchError) => {
          console.warn("[JsLegalStudyLinks] fetch case options failed", fetchError);
          return [];
        }),
        fetchCandidateLegalReferences().catch((fetchError) => {
          console.warn(
            "[JsLegalStudyLinks] fetch legal reference options failed",
            fetchError,
          );
          return [];
        }),
      ]);
      setCaseOptions(activeRows(uniqById(cases)));
      setLegalReferenceOptions(activeRows(uniqById(references)));
    } finally {
      setOptionLoading(false);
    }
  }, []);

  const openLinkModal = () => {
    setLinkMode("case");
    setCaseOptionSearch("");
    setLegalReferenceOptionSearch("");
    linkForm.resetFields();
    linkForm.setFieldsValue({ linkMode: "case" });
    setLinkModalOpen(true);
    loadLinkOptions();
  };

  const closeLinkModal = () => {
    setLinkModalOpen(false);
    setCaseOptionSearch("");
    setLegalReferenceOptionSearch("");
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
        await addCaseLinkToLegalStudy(legalStudyId, caseId);
        message?.success?.("Linked case successfully.");
      } else {
        const legalReferenceId = values.legalReferenceId;
        if (linkedLegalReferenceIds.has(String(legalReferenceId))) {
          message?.info?.("This Legal Reference is already linked.");
          closeLinkModal();
          return;
        }
        await addLegalReferenceLinkToLegalStudy(
          legalStudyId,
          legalReferenceId,
        );
        message?.success?.("Linked Legal Reference successfully.");
      }

      closeLinkModal();
      await loadLinks();
    } catch (submitError) {
      if (submitError?.errorFields) return;
      console.error("[JsLegalStudyLinks] add link failed", submitError);
      message?.error?.("Failed to add link.");
    } finally {
      setLinkLoading(false);
    }
  };

  const filteredLinks = React.useMemo(() => {
    const q = searchText.trim();
    return links.filter((link) => {
      if (filterKind === "case" && link.type !== "case") return false;
      if (filterKind === "legal_reference" && link.type !== "legal_reference")
        return false;
      if (!q) return true;
      return matchesSearchParts(
        [
          link.title,
          link.description,
          link.record?.caseCode,
          link.record?.projectCode,
          link.record?.referenceCode,
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
      link.type === "legal_reference"
        ? CONFIG.legalReferenceDetailUrlTemplate
        : CONFIG.caseDetailUrlTemplate;
    const opened = window.open(
      buildDetailUrl(template, link.recordId),
      "_blank",
      "noopener,noreferrer",
    );
    if (!opened) message?.warning?.("Please allow pop-ups to open details.");
  };

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
        color: type === "legal_reference" ? "geekblue" : "blue",
        style: { margin: 0, borderRadius: 4, fontWeight: 600 },
      },
      type === "legal_reference" ? "Legal Reference" : "Linked Case",
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
          setLegalReferenceOptionSearch("");
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
          renderLinkModeButton("legal_reference", "Legal Reference"),
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
                  key: "referenceCount",
                  style: { marginBottom: 8, color: color.muted, fontSize: 12 },
                },
                `Found ${filteredLegalReferenceOptions.length} Legal References`,
              ),
              h(
                Form.Item,
                {
                  key: "legalReferenceId",
                  name: "legalReferenceId",
                  label: "Legal Reference",
                  rules: [
                    {
                      required: true,
                      message: "Please select a Legal Reference",
                    },
                  ],
                },
                h(
                  Select,
                  {
                    showSearch: true,
                    loading: optionLoading,
                    placeholder: "Search Legal Reference...",
                    searchValue: legalReferenceOptionSearch,
                    onSearch: setLegalReferenceOptionSearch,
                    onChange: () => setLegalReferenceOptionSearch(""),
                    optionFilterProp: "label",
                    filterOption: false,
                    notFoundContent: optionLoading
                      ? h(Spin, { size: "small" })
                      : "No Legal Reference found",
                  },
                  filteredLegalReferenceOptions.slice(0, 100).map((item) => {
                    const label = getLegalReferenceTitle(item);
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

  if (!hasUsableId(legalStudyId)) {
    return h(Alert, {
      type: "warning",
      showIcon: true,
      message: "Current Legal Study not found",
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
          renderSegmentButton(
            "legal_reference",
            "Legal Reference",
            legalReferenceCount,
          ),
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
              : "No linked Cases or Legal References yet.",
            style: { padding: "46px 0" },
          }),
    ),
    renderLinkModal(),
  );
}

ctx.render(h(LegalStudyLinksViewer));
