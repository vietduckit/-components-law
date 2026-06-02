// NocoBase JS Item / JS Block: Legal Reference reader for Case detail.
// Paste this file into a JS Item/JS Block placed on the Case detail page.

const React = ctx.React;
const h = React.createElement;
const antd = ctx.antd || {};
const {
  Alert,
  Badge,
  Button,
  Card,
  Drawer,
  Empty,
  Input,
  List,
  Space,
  Spin,
  Tag,
  Tooltip,
  Tree,
  Typography,
} = antd;
const DirectoryTree = Tree?.DirectoryTree || Tree;
const message = ctx.message || antd.message;
const Text = Typography?.Text;

const CONFIG = {
  pageSize: 200,
  drawerWidth: 980,
  referenceListCandidates: [
    "legalReference:list",
    "legalReferences:list",
    "LegalReference:list",
  ],
  referenceGetCandidates: [
    "legalReference:get",
    "legalReferences:get",
    "LegalReference:get",
  ],
  referenceAppends: ["cases", "createdBy", "internalCompany"],
  folderAppends: ["createdBy", "updatedBy"],
  documentAppends: ["fileAttachment", "createdBy", "updatedBy"],
  caseRelationFields: ["cases", "projects", "case", "project"],
  sourceCaseFields: ["sourceCaseId", "sourceCase", "caseId", "projectId"],
  referenceFieldsOnCase: [
    "legalReference",
    "legalReferences",
    "legalReferenceId",
    "legalReferenceRecord",
  ],
  referenceFieldsOnDocument: [
    "legalReferenceId",
    "legalReference",
    "legalReferences",
    "legalReferenceRecord",
  ],
  legalReferenceModuleScope: "legal_reference",
};

const color = {
  blue: "#185FA5",
  blueSoft: "#E6F1FB",
  border: "#E5E7EB",
  text: "#111827",
  muted: "#6B7280",
  faint: "#9CA3AF",
  bg: "#F9FAFB",
  white: "#FFFFFF",
};

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

const extractId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" || typeof value === "number") return value;
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

const getResponseData = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.data && typeof payload.data === "object") return payload.data;
  if (Array.isArray(payload)) return payload;
  return payload?.data || payload || [];
};

const getResponseMeta = (response) => response?.data?.meta || response?.data || {};

const getCurrentRecord = () => {
  const formValues = (() => {
    try {
      return ctx.form?.getFieldsValue?.(true) || {};
    } catch {
      return {};
    }
  })();
  return {
    ...(ctx.record || {}),
    ...(ctx.popup?.record || {}),
    ...(ctx.view?.record || {}),
    ...formValues,
  };
};

const buildFilter = (filter) => JSON.stringify(filter);

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

const getReferenceTitle = (record) => {
  if (!record) return "Legal Reference";
  const code = record.referenceCode || record.code || "";
  const title = record.title || record.name || record.referenceName || "";
  if (code && title) return `${code} - ${title}`;
  return title || code || `Legal Reference #${extractId(record) || ""}`;
};

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
    "Tài liệu"
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

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

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

const getReferenceIdsFromRecord = (record) => {
  const ids = [];
  CONFIG.referenceFieldsOnCase.forEach((field) => {
    ids.push(...extractIds(record?.[field]));
  });
  return Array.from(new Set(ids));
};

const getReferenceObjectsFromRecord = (record) => {
  const rows = [];
  CONFIG.referenceFieldsOnCase.forEach((field) => {
    asArray(record?.[field]).forEach((item) => {
      if (item && typeof item === "object" && extractId(item)) rows.push(item);
    });
  });
  return uniqById(rows);
};

const getRecordReferenceIds = (record) => {
  const ids = [];
  CONFIG.referenceFieldsOnDocument.forEach((field) => {
    ids.push(...extractIds(record?.[field]));
  });
  return Array.from(new Set(ids));
};

const recordMatchesReference = (record, referenceId) =>
  getRecordReferenceIds(record).some((id) => String(id) === String(referenceId));

const activeRows = (rows) => asArray(rows).filter((row) => row?.isDeleted !== true);

const recordMatchesCase = (record, caseId) => {
  const targetId = String(caseId);
  const ids = [];
  CONFIG.caseRelationFields.forEach((field) => ids.push(...extractIds(record?.[field])));
  CONFIG.sourceCaseFields.forEach((field) => ids.push(...extractIds(record?.[field])));
  return ids.some((id) => String(id) === targetId);
};

const scalarCaseFilters = (caseId) =>
  CONFIG.sourceCaseFields
    .filter((field) => field.endsWith("Id"))
    .map((field) => ({ [field]: { $eq: Number(caseId) || caseId } }));

const scalarReferenceFilters = (referenceId) =>
  CONFIG.referenceFieldsOnDocument
    .filter((field) => field.endsWith("Id"))
    .map((field) => ({ [field]: { $eq: Number(referenceId) || referenceId } }));

const fetchReferenceByIds = async (ids) => {
  const safeIds = Array.from(new Set(asArray(ids).map((id) => String(id)).filter(Boolean)));
  if (!safeIds.length) return [];

  const idFilter = {
    id: {
      $in: safeIds.map((id) => Number(id) || id),
    },
  };

  try {
    const rows = await fetchWithCandidates(CONFIG.referenceListCandidates, {
      filter: buildFilter(idFilter),
      appends: CONFIG.referenceAppends,
    });
    if (rows.length) return uniqById(rows);
  } catch (error) {
    console.warn("[JsItemLegalReference] reference list by id failed", error);
  }

  const result = [];
  for (const id of safeIds) {
    for (const url of CONFIG.referenceGetCandidates) {
      try {
        const response = await ctx.api.request({
          url: `${url}?filterByTk=${id}`,
          params: { appends: CONFIG.referenceAppends },
        });
        const data = getResponseData(response);
        if (data) {
          result.push(data);
          break;
        }
      } catch {
        // Try next candidate.
      }
    }
  }
  return uniqById(result);
};

const fetchReferencesForCase = async (record) => {
  const directIds = getReferenceIdsFromRecord(record);
  if (directIds.length) {
    const directRows = await fetchReferenceByIds(directIds);
    if (directRows.length) return directRows;
    const directObjects = getReferenceObjectsFromRecord(record);
    if (directObjects.length) return directObjects;
  }

  const caseId = extractId(record?.id);
  if (!caseId) return [];

  const rows = [];
  for (const filter of scalarCaseFilters(caseId)) {
    try {
      const result = await fetchWithCandidates(CONFIG.referenceListCandidates, {
        filter: buildFilter(filter),
        appends: CONFIG.referenceAppends,
      });
      rows.push(...result);
    } catch {
      // Field names differ across apps; keep trying other filters.
    }
  }

  if (rows.length) return uniqById(rows);

  try {
    const allReferences = await fetchWithCandidates(CONFIG.referenceListCandidates, {
      appends: CONFIG.referenceAppends,
      sort: ["-createdAt"],
    });
    return uniqById(activeRows(allReferences).filter((item) => recordMatchesCase(item, caseId)));
  } catch {
    return [];
  }
};

const fetchRowsForReference = async (resourceUrl, referenceId, appends) => {
  const rows = [];
  for (const filter of scalarReferenceFilters(referenceId)) {
    try {
      const result = await fetchAllList(resourceUrl, {
        filter: buildFilter({ $and: [{ isDeleted: { $ne: true } }, filter] }),
        appends,
      });
      rows.push(...result);
    } catch {
      // Try next relation field candidate.
    }
  }

  if (rows.length) return activeRows(uniqById(rows));

  try {
    const fallbackRows = await fetchAllList(resourceUrl, {
      filter: buildFilter({
        $and: [
          { isDeleted: { $ne: true } },
          { moduleScope: { $eq: CONFIG.legalReferenceModuleScope } },
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

function LegalReferenceReader() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [references, setReferences] = React.useState([]);
  const [activeReference, setActiveReference] = React.useState(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [libraryLoading, setLibraryLoading] = React.useState(false);
  const [library, setLibrary] = React.useState({ folders: [], documents: [] });
  const [selectedFolderId, setSelectedFolderId] = React.useState("root");
  const [query, setQuery] = React.useState("");
  const [previewDoc, setPreviewDoc] = React.useState(null);
  const [previewText, setPreviewText] = React.useState("");
  const [previewTextLoading, setPreviewTextLoading] = React.useState(false);
  const [previewTextError, setPreviewTextError] = React.useState(false);

  const currentRecord = getCurrentRecord();
  const caseId = extractId(currentRecord?.id);

  const loadReferences = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await fetchReferencesForCase(getCurrentRecord());
      setReferences(rows);
    } catch (loadError) {
      console.error("[JsItemLegalReference] load references failed", loadError);
      setError(loadError?.message || "Không tải được Legal Reference.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  React.useEffect(() => {
    const handler = () => loadReferences();
    ctx.element?.addEventListener?.("js-field:value-change", handler);
    return () => ctx.element?.removeEventListener?.("js-field:value-change", handler);
  }, [loadReferences]);

  const openReference = async (record) => {
    setActiveReference(record);
    setDrawerOpen(true);
    setSelectedFolderId("root");
    setQuery("");
    setPreviewDoc(null);
    setLibraryLoading(true);
    try {
      const data = await fetchLibraryForReference(extractId(record));
      setLibrary(data);
    } catch (loadError) {
      console.error("[JsItemLegalReference] load library failed", loadError);
      message?.error?.("Không tải được tài liệu tham chiếu.");
      setLibrary({ folders: [], documents: [] });
    } finally {
      setLibraryLoading(false);
    }
  };

  const openPreview = (doc) => {
    if (!getFileUrl(doc)) {
      message?.warning?.("Tài liệu chưa có file hoặc URL để xem trước.");
      return;
    }
    setPreviewDoc(doc);
  };

  const downloadFile = (doc) => {
    const fileUrl = getFileUrl(doc);
    if (!fileUrl) {
      message?.warning?.("Tài liệu chưa có file hoặc URL để tải về.");
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = fileUrl;
    anchor.download = getFileName(doc);
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
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
          return {
            key: folderId,
            title: `${folder.name || "Folder"}${directFiles ? ` (${directFiles})` : ""}`,
            children: buildTree(folderId),
          };
        }),
    [library.folders, library.documents, folderMap],
  );

  const treeData = React.useMemo(
    () => [
      {
        key: "root",
        title: `Tất cả tài liệu (${library.documents.length})`,
        children: buildTree(null),
      },
    ],
    [library.documents.length, buildTree],
  );

  const visibleDocuments = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = selectedFolderId === "root"
      ? library.documents
      : library.documents.filter((doc) => String(getDocFolderId(doc) || "") === String(selectedFolderId));

    if (q) {
      rows = rows.filter((doc) => {
        const text = `${getFileName(doc)} ${doc.description || ""} ${doc.documentCode || ""}`.toLowerCase();
        return text.includes(q);
      });
    }

    return [...rows].sort((a, b) => new Date(b.uploadedAt || b.createdAt || 0) - new Date(a.uploadedAt || a.createdAt || 0));
  }, [library.documents, selectedFolderId, query]);

  const selectedFolderName = React.useMemo(() => {
    if (selectedFolderId === "root") return "Tất cả tài liệu";
    if (query.trim()) return "Kết quả tìm kiếm";
    return folderMap.get(String(selectedFolderId))?.name || "Folder";
  }, [selectedFolderId, query, folderMap]);

  const renderText = (props, children) => (Text ? h(Text, props, children) : h("span", props, children));

  const renderReferenceCard = (record) => {
    const id = String(extractId(record));
    const linkedCases = asArray(record.cases);
    const title = getReferenceTitle(record);
    return h(
      "button",
      {
        key: id,
        type: "button",
        onClick: () => openReference(record),
        style: {
          border: 0,
          background: "transparent",
          padding: 0,
          margin: 0,
          cursor: "pointer",
          color: color.blue,
          fontSize: 14,
          fontWeight: 600,
          lineHeight: "22px",
          textAlign: "left",
          fontFamily: "inherit",
        },
      },
      title,
    );
    return h(
      Card,
      {
        key: id,
        hoverable: true,
        onClick: () => openReference(record),
        style: {
          borderRadius: 8,
          border: `1px solid ${color.border}`,
          borderLeft: `3px solid ${color.blue}`,
          minWidth: 260,
          flex: "1 1 280px",
          cursor: "pointer",
        },
        bodyStyle: { padding: 14 },
      },
      h(
        "div",
        { style: { display: "flex", gap: 10, alignItems: "flex-start" } },
        h(
          "div",
          {
            style: {
              width: 34,
              height: 34,
              borderRadius: 8,
              background: color.blueSoft,
              color: color.blue,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            },
          },
          ICONS.book,
        ),
        h(
          "div",
          { style: { minWidth: 0, flex: 1 } },
          h(
            "div",
            {
              style: {
                fontSize: 14,
                fontWeight: 700,
                color: color.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
              title,
            },
            title,
          ),
          record.description
            ? h(
              "div",
              {
                style: {
                  marginTop: 4,
                  fontSize: 12,
                  color: color.muted,
                  lineHeight: "18px",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                },
              },
              record.description,
            )
            : null,
          h(
            "div",
            { style: { marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" } },
            h(Tag, { color: "blue", style: { margin: 0, borderRadius: 4 } }, "Tài liệu tham chiếu"),
            linkedCases.length
              ? h(Tag, { style: { margin: 0, borderRadius: 4 } }, `${linkedCases.length} case liên kết`)
              : null,
          ),
        ),
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
            "Mở",
          ),
          h(
            Button,
            {
              key: "download",
              size: "small",
              type: "link",
              icon: ICONS.download,
              disabled: !fileUrl,
              onClick: () => downloadFile(doc),
            },
            "Tải về",
          ),
        ],
      },
      h(
        List.Item.Meta,
        {
          avatar: h(
            "div",
            {
              style: {
                width: 34,
                height: 34,
                borderRadius: 8,
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
                [sizeText, dateText].filter(Boolean).join(" · ") || "Chưa có thông tin file",
              ),
            ],
          ),
        },
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
      return h("video", {
        src: fileUrl,
        controls: true,
        style: { ...frameStyle, background: "#000" },
      });
    }

    if (kind === "audio") {
      return h(
        "div",
        { style: { padding: 24, border: `1px solid ${color.border}`, borderRadius: 8, background: color.white } },
        h("audio", { src: fileUrl, controls: true, style: { width: "100%" } }),
      );
    }

    if (kind === "text") {
      if (previewTextLoading) {
        return h("div", { style: { padding: 60, textAlign: "center" } }, h(Spin, null));
      }
      if (previewTextError) {
        return h(Alert, {
          type: "warning",
          showIcon: true,
          message: "Không đọc được nội dung file trong trình duyệt.",
          description: "Bạn vẫn có thể mở file ở tab mới hoặc tải về.",
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

    if (!folderCount && !fileCount) {
      return h(Empty, {
        image: Empty.PRESENTED_IMAGE_SIMPLE,
        description: "Legal Reference này chưa có thư mục hoặc tài liệu.",
        style: { padding: "60px 0" },
      });
    }

    return h(
      "div",
      { style: { display: "flex", gap: 16, height: "100%" } },
      h(
        "div",
        {
          style: {
            width: 280,
            flexShrink: 0,
            borderRight: `1px solid ${color.border}`,
            paddingRight: 12,
            overflowY: "auto",
          },
        },
        h(
          "div",
          { style: { fontSize: 12, color: color.muted, marginBottom: 8, fontWeight: 600 } },
          "Thư mục",
        ),
        h(DirectoryTree, {
          treeData,
          selectedKeys: [selectedFolderId],
          defaultExpandAll: true,
          onSelect: (keys) => setSelectedFolderId(String(keys?.[0] || "root")),
          style: { background: "transparent" },
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
            h(
              "div",
              { style: { fontSize: 15, fontWeight: 700, color: color.text } },
              selectedFolderName,
            ),
            h(
              "div",
              { style: { fontSize: 12, color: color.muted, marginTop: 2 } },
              `${visibleDocuments.length} tài liệu hiển thị · ${folderCount} thư mục · ${fileCount} file`,
            ),
          ),
          h(Input.Search, {
            allowClear: true,
            placeholder: "Tìm tài liệu tham chiếu...",
            value: query,
            onChange: (event) => setQuery(event.target.value),
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
              description: query ? "Không tìm thấy tài liệu phù hợp." : "Folder này chưa có tài liệu.",
              style: { padding: "48px 0" },
            }),
        ),
      ),
    );
  };

  if (loading) {
    return h(
      "div",
      { style: { padding: 16, textAlign: "center" } },
      h(Spin, null),
    );
  }

  if (error) {
    return h(Alert, {
      type: "error",
      showIcon: true,
      message: "Không tải được Legal Reference",
      description: error,
      action: h(Button, { size: "small", onClick: loadReferences }, "Thử lại"),
    });
  }

  if (!caseId) {
    return h(Alert, {
      type: "warning",
      showIcon: true,
      message: "Không xác định được case hiện tại",
      description: "Hãy đặt JS Item này trong trang chi tiết hoặc form của collection Cases.",
    });
  }

  return h(
    React.Fragment,
    null,
    references.length
      ? h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 4 } },
        references.map(renderReferenceCard),
      )
      : h("span", { style: { color: color.faint, fontSize: 13 } }, "Chưa liên kết Legal Reference"),
    h(
      Drawer,
      {
        title: activeReference ? getReferenceTitle(activeReference) : "Tài liệu tham chiếu",
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
              `${library.folders.length} thư mục · ${library.documents.length} tài liệu`,
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
        title: previewDoc ? getFileName(previewDoc) : "Xem trước tài liệu",
        open: !!previewDoc,
        onClose: () => setPreviewDoc(null),
        width: 900,
        destroyOnClose: true,
        extra: previewDoc
          ? h(
            Space,
            null,
            h(
              Button,
              {
                size: "small",
                onClick: () => {
                  const fileUrl = getFileUrl(previewDoc);
                  if (fileUrl) window.open(fileUrl, "_blank");
                },
              },
              "Mở tab mới",
            ),
            h(
              Button,
              {
                size: "small",
                icon: ICONS.download,
                onClick: () => downloadFile(previewDoc),
              },
              "Tải về",
            ),
          )
          : null,
        bodyStyle: { background: color.bg },
      },
      renderPreviewBody(),
    ),
  );

  return h(
    "div",
    {
      style: {
        width: "100%",
        border: `1px solid ${color.border}`,
        borderRadius: 8,
        background: color.white,
        padding: 14,
      },
    },
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
        { style: { display: "flex", alignItems: "center", gap: 8 } },
        h(
          "span",
          {
            style: {
              color: color.blue,
              display: "inline-flex",
              alignItems: "center",
            },
          },
          ICONS.book,
        ),
        h("strong", { style: { color: color.text, fontSize: 14 } }, "Legal Reference"),
        h(Badge, {
          count: references.length,
          style: { backgroundColor: color.blue },
        }),
      ),
      h(
        Button,
        {
          size: "small",
          icon: ICONS.refresh,
          onClick: loadReferences,
        },
        "Làm mới",
      ),
    ),
    references.length
      ? h(
        "div",
        {
          style: {
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          },
        },
        references.map(renderReferenceCard),
      )
      : h(Empty, {
        image: Empty.PRESENTED_IMAGE_SIMPLE,
        description: "Case này chưa liên kết Legal Reference.",
        style: { padding: "28px 0" },
      }),
    h(
      Drawer,
      {
        title: activeReference ? getReferenceTitle(activeReference) : "Tài liệu tham chiếu",
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
              `${library.folders.length} thư mục · ${library.documents.length} tài liệu`,
            )
            : null,
        ),
        bodyStyle: { background: color.bg },
      },
      renderDrawerBody(),
    ),
  );
}

ctx.render(h(LegalReferenceReader));
