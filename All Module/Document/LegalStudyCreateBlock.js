const { React } = ctx;
const { useCallback, useEffect, useMemo, useRef, useState } = React;
const {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Spin,
  Tag,
  Typography,
  message,
} = ctx.antd;

const FONT =
  "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const LEGAL_STUDY_STORAGE_TYPE = "legal_study";
const LEGAL_STUDY_MODULE_SCOPE = "legal_study";
const LEGAL_STUDY_FOLDER_TEMPLATE_KEY = "legal_study";
const LEGAL_STUDY_RESOURCES = ["legalStudy", "legalStudies"];
const LEGAL_STUDY_BLOCK_UID = "ql8tgdq5no2";
const CASE_REFERENCE_BLOCK_UID = "5cyaa66tjwi";
// Library.js is a custom JS block, not a resolvable Nocobase data block, so
// refreshNocoBaseDataBlocks() (ctx.getModel/resource.refresh) can't reach it.
// Broadcast this window event too so it (or anything else) can reload itself.
const LIBRARY_DATA_CHANGED_EVENT = "law-library:data-changed";
const COMPANY_RESOURCES = ["internalCompany", "internalCompanies"];
const PROJECT_RESOURCES = ["projects"];
const PROJECT_SERVICE_RESOURCES = ["projectServices"];
const LEGAL_REFERENCE_RESOURCES = ["legalReference", "legalReferences"];

const compact = (items) =>
  items
    .map((item) => (item === undefined || item === null ? "" : String(item).trim()))
    .filter(Boolean);

const extractId = (value) => {
  if (Array.isArray(value)) return extractId(value[0]);
  const raw = value && typeof value === "object" ? value.id || value._id : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const firstPresent = (record, fields = []) => {
  for (const field of fields) {
    const value = record?.[field];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
};

const removeKeys = (record, keys = []) => {
  const next = { ...(record || {}) };
  keys.forEach((key) => delete next[key]);
  return next;
};

const cleanPayload = (record) => {
  const next = { ...(record || {}) };
  Object.keys(next).forEach((key) => {
    if (next[key] === undefined || next[key] === null || next[key] === "") {
      delete next[key];
    }
  });
  return next;
};

const unwrapRecord = (res) => res?.data?.data || res?.data || null;
const unwrapList = (res) => {
  const data = res?.data?.data ?? res?.data ?? [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getUrlInput = () => {
  const params = {};
  try {
    const search =
      ctx.location?.search ||
      ctx.view?.location?.search ||
      (typeof window !== "undefined" ? window.location?.search : "");
    if (!search) return params;

    const query = String(search).startsWith("?") ? String(search) : `?${search}`;
    new URLSearchParams(query).forEach((value, key) => {
      params[key] = value;
    });
  } catch {}
  return params;
};

const getRuntimeInput = () => {
  try {
    const inputArgs = ctx.view?.inputArgs || ctx.inputArgs || {};
    return {
      ...getUrlInput(),
      ...(inputArgs || {}),
      ...(inputArgs.params || {}),
      ...(ctx.action?.params || {}),
      ...(ctx.modal?.params || {}),
      ...(ctx.view?.params || {}),
      ...(ctx.popup?.params || {}),
      ...(ctx.params || {}),
    };
  } catch {
    return {};
  }
};

const getCurrentUserId = () =>
  extractId(ctx.currentUser) ||
  extractId(ctx.user) ||
  extractId(ctx.state?.currentUser) ||
  extractId(ctx.app?.currentUser) ||
  null;

const currentRecord =
  ctx.record ||
  ctx.popup?.record ||
  ctx.state?.record ||
  ctx.data?.record ||
  ctx.recordData ||
  null;

const defaultInternalCompanyId = () => {
  const input = getRuntimeInput();
  return (
    extractId(input.internalCompanyId) ||
    extractId(input.activeCompanyId) ||
    extractId(input.companyId) ||
    extractId(currentRecord?.internalCompanyId) ||
    extractId(currentRecord?.internalCompany) ||
    ""
  );
};

const defaultCaseId = () => {
  const input = getRuntimeInput();
  const currentIsCase = currentRecord?.projectName || currentRecord?.caseCode;
  return (
    extractId(input.caseId) ||
    extractId(input.projectId) ||
    extractId(input.sourceCaseId) ||
    extractId(input.sourceProjectId) ||
    (currentIsCase ? extractId(currentRecord) : null) ||
    ""
  );
};

const apiRequestAny = async (resources, action, options = {}) => {
  let lastError = null;
  for (const resource of resources) {
    try {
      return await ctx.api.request({ url: `${resource}:${action}`, ...options });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`No resource available for ${action}`);
};

const fetchAllList = async (resources, params = {}) => {
  let all = [];
  let page = 1;
  const pageSize = params.pageSize || 200;
  while (true) {
    const res = await apiRequestAny(resources, "list", {
      params: { ...params, page, pageSize },
    });
    const data = unwrapList(res);
    all = all.concat(data);
    const meta = res?.data?.meta || {};
    if (!meta.count || all.length >= meta.count || data.length < pageSize) break;
    page += 1;
  }
  return all;
};

const createWithFallback = async (resources, payloadVariants = []) => {
  let lastError = null;
  for (const payload of payloadVariants) {
    try {
      const res = await apiRequestAny(resources, "create", {
        method: "POST",
        data: cleanPayload(payload),
      });
      return unwrapRecord(res);
    } catch (error) {
      lastError = error;
      console.warn("[LegalStudyCreateBlock] create fallback failed", error);
    }
  }
  throw lastError || new Error("Create failed");
};

const legalStudyScopeVariants = (payload) => {
  const studyId = extractId(payload?.legalStudyId);
  if (!studyId) return [payload];
  const base = removeKeys(payload, ["legalStudy", "legalStudies"]);
  const withoutId = removeKeys(base, ["legalStudyId"]);
  return [
    payload,
    { ...withoutId, legalStudy: { id: studyId } },
    { ...withoutId, legalStudies: [{ id: studyId }] },
    withoutId,
  ];
};

const createScopedRecord = async (url, payload) => {
  let lastError = null;
  for (const variant of legalStudyScopeVariants(payload)) {
    try {
      const res = await ctx.api.request({
        url,
        method: "POST",
        data: cleanPayload(variant),
      });
      return unwrapRecord(res);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`Create failed: ${url}`);
};

const createDocumentRecord = async (payload) =>
  createScopedRecord("documents:create", payload);

const createFolderRecord = async (payload) =>
  createScopedRecord("folders:create", payload);

const uploadAttachment = async (file, fileName = null) => {
  const formData = new window.FormData();
  formData.append("file", file, fileName || file.name);
  const uploadRes = await ctx.api.request({
    url: "attachments:create",
    method: "POST",
    params: { attachmentField: "documents.fileAttachment" },
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
  });
  const attachment = uploadRes?.data?.data;
  if (!attachment?.id) throw new Error("Upload file failed");
  return attachment;
};

const normalizeParentId = (parentId) => (parentId === "root" || !parentId ? null : extractId(parentId));

const getUploadRelativePath = (file) =>
  String(file?._dropRelativePath || file?.webkitRelativePath || file?.name || "")
    .replace(/^\/+/, "")
    .replace(/\\/g, "/");

const companyLabel = (record) =>
  firstPresent(record, ["shortName", "name", "legalName", "companyName", "title"]) ||
  (record?.id ? `Company #${record.id}` : "Company");

const customerLabel = (record) =>
  firstPresent(record, ["shortName", "customerName", "name", "fullName"]) ||
  (record?.id ? `Customer #${record.id}` : "");

const projectLabel = (record) => {
  const customer = record?.customer || record?.customers;
  return (
    compact([
      firstPresent(record, ["caseCode", "projectCode", "code"]),
      customer ? customerLabel(customer) : "",
      firstPresent(record, ["projectName", "caseName", "name", "title"]),
    ]).join(" - ") || (record?.id ? `Case #${record.id}` : "Case")
  );
};

const legalReferenceLabel = (record) =>
  firstPresent(record, ["title", "name"]) || (record?.id ? `Reference #${record.id}` : "Case Reference");

const getRecordCompanyId = (record) =>
  extractId(record?.internalCompanyId) ||
  extractId(record?.internalCompany) ||
  extractId(record?.companyId) ||
  extractId(record?.companies);

const getProjectServiceName = (row) =>
  firstPresent(row, ["serviceName"]) ||
  firstPresent(row?.service || row?.services || {}, ["serviceName", "name"]);

const buildServiceNamesByProjectMap = (rows = []) => {
  const map = {};
  rows.forEach((row) => {
    const projectId = extractId(row?.projectId ?? row?.projects ?? row?.project);
    const serviceName = getProjectServiceName(row);
    if (!projectId || !serviceName) return;
    if (!map[projectId]) map[projectId] = [];
    map[projectId].push(serviceName);
  });
  return map;
};

const getBlockModelByUid = (uid) => {
  const engine = ctx.engine || ctx.app;
  try {
    return (
      ctx.getModel?.(uid, true) ||
      ctx.getModel?.(uid) ||
      engine?.getModel?.(uid) ||
      (ctx.app && ctx.app !== engine ? ctx.app?.getModel?.(uid) : null)
    );
  } catch (error) {
    console.warn("[LegalStudyCreateBlock] get model failed", uid, error);
    return null;
  }
};

const refreshBlockModel = async (blockModel) => {
  if (!blockModel) return false;
  const resource = blockModel.resource;
  try {
    if (resource && typeof resource.refresh === "function") {
      await resource.refresh();
      return true;
    }
    if (typeof blockModel.refresh === "function") {
      await blockModel.refresh();
      return true;
    }
  } catch (error) {
    console.warn("[LegalStudyCreateBlock] refresh failed", error);
  }
  return false;
};

// Creating/linking a Legal Study can change what the Legal Study list block
// and the Case Reference list block show, so refresh both, not just the first
// block we manage to resolve.
const refreshNocoBaseDataBlocks = async () => {
  const input = getRuntimeInput();
  const uidCandidates = Array.from(
    new Set(
      compact([
        input.targetBlockUid,
        input.sourceBlockUid,
        input.blockUid,
        input.dataBlockUid,
        LEGAL_STUDY_BLOCK_UID,
        CASE_REFERENCE_BLOCK_UID,
      ]),
    ),
  );

  let refreshedAny = false;
  for (const uid of uidCandidates) {
    const refreshed = await refreshBlockModel(getBlockModelByUid(uid));
    refreshedAny = refreshedAny || refreshed;
  }

  if (!refreshedAny) {
    refreshedAny = await refreshBlockModel(ctx.blockModel || ctx.model);
  }

  if (!refreshedAny && typeof ctx.refresh === "function") {
    try {
      await ctx.refresh();
      refreshedAny = true;
    } catch (error) {
      console.warn("[LegalStudyCreateBlock] ctx.refresh fallback failed", error);
    }
  }

  return refreshedAny;
};

const emitLibraryDataChanged = (detail = {}) => {
  const targets = [];
  try {
    if (window?.dispatchEvent) targets.push(window);
    if (window?.parent && window.parent !== window && window.parent.dispatchEvent) {
      targets.push(window.parent);
    }
  } catch {}

  targets.forEach((target) => {
    try {
      const EventCtor = target.CustomEvent || window.CustomEvent || CustomEvent;
      target.dispatchEvent(new EventCtor(LIBRARY_DATA_CHANGED_EVENT, { detail }));
    } catch {
      try {
        const event = new Event(LIBRARY_DATA_CHANGED_EVENT);
        event.detail = detail;
        target.dispatchEvent(event);
      } catch {}
    }
  });

  // window/window.parent only reach a listener in the SAME browsing
  // context (or a direct iframe parent). ctx.openView may render this
  // popup in a context Library.js's window can't see at all (separate
  // window, sibling iframe...), so also write to localStorage —
  // changing it fires a `storage` event in every OTHER same-origin
  // tab/window/iframe automatically, which is the one channel guaranteed
  // to reach Library.js regardless of how the popup was rendered.
  try {
    window.localStorage.setItem(
      LIBRARY_DATA_CHANGED_EVENT,
      JSON.stringify({ ...detail, _t: Date.now() }),
    );
  } catch {}
};

const closeCurrentPopup = () => {
  const calls = [
    [ctx.view, "close", []],
    [ctx, "onClose", []],
    [ctx, "close", []],
    [ctx.popup, "onClose", []],
    [ctx.popup, "close", []],
    [ctx.popup, "closeModal", []],
    [ctx.modal, "onClose", []],
    [ctx.modal, "close", []],
    [ctx.drawer, "onClose", []],
    [ctx.drawer, "close", []],
    [ctx.action, "onClose", []],
    [ctx.action, "close", []],
    [ctx.popup, "setVisible", [false]],
    [ctx.modal, "setVisible", [false]],
    [ctx.modal, "setOpen", [false]],
    [ctx.drawer, "setOpen", [false]],
  ];

  for (const [target, method, args] of calls) {
    if (target && typeof target[method] === "function") {
      try {
        target[method](...(args || []));
        return true;
      } catch (error) {
        console.warn("[LegalStudyCreateBlock] close popup failed", error);
      }
    }
  }
  return false;
};

const showDiscardConfirm = (onOk) => {
  if (showDiscardConfirm._open) return;
  const run = async () => {
    try {
      await onOk?.();
    } finally {
      showDiscardConfirm._open = false;
    }
  };

  if (Modal?.confirm) {
    showDiscardConfirm._open = true;
    Modal.confirm({
      title: "Discard changes?",
      content: "Your unsaved legal study input will be lost.",
      okText: "Discard",
      cancelText: "Keep editing",
      okButtonProps: { danger: true },
      maskClosable: false,
      onCancel: () => {
        showDiscardConfirm._open = false;
      },
      onOk: run,
    });
    return;
  }
  run();
};

const configureGuardedModalClose = (requestClose) => {
  if (typeof requestClose !== "function") return;
  const restoreFns = [];
  const props = {
    maskClosable: true,
    keyboard: false,
    onCancel: requestClose,
    onClose: requestClose,
  };

  [
    [ctx.view, "setProps"],
    [ctx.view, "setOptions"],
    [ctx.popup, "setProps"],
    [ctx.popup, "setOptions"],
    [ctx.modal, "setProps"],
    [ctx.modal, "setOptions"],
    [ctx.drawer, "setProps"],
    [ctx.drawer, "setOptions"],
    [ctx.action, "setProps"],
  ].forEach(([target, method]) => {
    if (!target || typeof target[method] !== "function") return;
    try {
      target[method](props);
    } catch (error) {
      console.warn("[LegalStudyCreateBlock] configure close failed", error);
    }
  });

  const patchMethod = (target, method) => {
    if (!target || typeof target[method] !== "function") return;
    const original = target[method];
    const patchedClose = function patchedClose(...args) {
      const isSetter = method === "setVisible" || method === "setOpen";
      if (isSetter && args[0] !== false) return original.apply(this, args);
      requestClose(() => original.apply(this, args));
      return undefined;
    };
    try {
      target[method] = patchedClose;
    } catch {
      return;
    }
    restoreFns.push(() => {
      if (target[method] !== patchedClose) return;
      try {
        target[method] = original;
      } catch {}
    });
  };

  [ctx.view, ctx.popup, ctx.modal, ctx.drawer, ctx.action, ctx].forEach((target) => {
    ["onClose", "close", "closeModal", "setVisible", "setOpen"].forEach((method) => patchMethod(target, method));
  });

  return () => {
    restoreFns.forEach((restore) => {
      try {
        restore();
      } catch {}
    });
  };
};

const legalStudyPayloadVariants = (payload) => [payload];

// Relation endpoint names aren't fixed in the schema, so try the same
// candidate list JsLegalStudyLinks.js already uses to read these links back.
const postRelationCandidates = async (candidates) => {
  let lastError = null;
  for (const candidate of candidates) {
    const targetValue = extractId(candidate.targetId);
    if (!targetValue) continue;
    for (const data of [{ tk: targetValue }, { tks: [targetValue] }]) {
      try {
        return await ctx.api.request({ url: candidate.url, method: "POST", data });
      } catch (error) {
        lastError = error;
      }
    }
  }
  throw lastError || new Error("Failed to create relation link");
};

const linkCaseToLegalStudy = (legalStudyId, caseId) => {
  const studyId = extractId(legalStudyId);
  const cId = extractId(caseId);
  if (!studyId || !cId) return Promise.reject(new Error("Missing Legal Study or Case ID"));
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

const linkLegalReferenceToLegalStudy = (legalStudyId, legalReferenceId) => {
  const studyId = extractId(legalStudyId);
  const refId = extractId(legalReferenceId);
  if (!studyId || !refId) return Promise.reject(new Error("Missing Legal Study or Legal Reference ID"));
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

const buildDocumentScopePayload = ({ internalCompanyId, legalStudyId }) => ({
  storageType: LEGAL_STUDY_STORAGE_TYPE,
  moduleScope: LEGAL_STUDY_MODULE_SCOPE,
  internalCompanyId: extractId(internalCompanyId),
  legalStudyId: extractId(legalStudyId),
});

const getNextFileIndex = async ({ folderId, internalCompanyId, legalStudyId }) => {
  const parentId = normalizeParentId(folderId);
  try {
    const filter = {
      storageType: { $eq: LEGAL_STUDY_STORAGE_TYPE },
      moduleScope: { $eq: LEGAL_STUDY_MODULE_SCOPE },
      internalCompanyId: { $eq: extractId(internalCompanyId) },
      legalStudyId: { $eq: extractId(legalStudyId) },
      ...(parentId ? { folderId: { $eq: parentId } } : {}),
    };
    const res = await ctx.api.request({
      url: "documents:list",
      params: {
        pageSize: 2000,
        filter: JSON.stringify(filter),
        sort: ["-fileIndex", "-createdAt"],
      },
    });
    const rows = unwrapList(res).filter(
      (doc) => String(extractId(doc.folderId) || "") === String(parentId || ""),
    );
    return rows.reduce((max, doc) => Math.max(max, Number(doc.fileIndex) || 0), 0) + 1;
  } catch {
    return 1;
  }
};

const uploadFilesToStudy = async (files, context) => {
  const rows = Array.from(files || []).filter(Boolean);
  if (!rows.length) return true;
  let nextIndex = await getNextFileIndex(context);
  const userId = getCurrentUserId();

  for (const file of rows) {
    const attachment = await uploadAttachment(file, file.name);
    const nowIso = new Date().toISOString();
    await createDocumentRecord({
      name: file.name,
      title: file.name,
      documentCode: "",
      fileIndex: nextIndex,
      fileAttachment: [{ id: attachment.id }],
      createdAt: nowIso,
      updatedAt: nowIso,
      uploadedAt: nowIso,
      uploaded_at: nowIso,
      ...(context.folderId ? { folderId: context.folderId } : {}),
      ...(userId ? { uploadedById: userId, createdById: userId, updatedById: userId } : {}),
      ...buildDocumentScopePayload(context),
    });
    nextIndex += 1;
  }
  return true;
};

const uploadFolderFilesToStudy = async (files, context) => {
  const rows = Array.from(files || []).filter(Boolean);
  if (!rows.length) return true;
  const folderIdMap = { "": context.folderId || null };
  const folderPaths = new Set();

  rows.forEach((file) => {
    const relativePath = getUploadRelativePath(file);
    const parts = relativePath.split("/");
    parts.pop();
    let currentPath = "";
    parts.forEach((part) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (currentPath) folderPaths.add(currentPath);
    });
  });

  const userId = getCurrentUserId();
  const nowIso = new Date().toISOString();
  const sortedPaths = Array.from(folderPaths).sort((a, b) => a.split("/").length - b.split("/").length);

  for (const path of sortedPaths) {
    const parts = path.split("/");
    const folderName = parts.pop();
    const parentPath = parts.join("/");
    const parentId = folderIdMap[parentPath] || null;
    const folder = await createFolderRecord({
      name: folderName,
      type: "custom",
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(parentId ? { parentId } : {}),
      ...(userId ? { createdById: userId, updatedById: userId } : {}),
      ...buildDocumentScopePayload(context),
    });
    folderIdMap[path] = extractId(folder);
  }

  const fileIndexCache = {};
  const nextIndexForFolder = async (folderId) => {
    const key = String(folderId || "root");
    if (fileIndexCache[key] === undefined) {
      fileIndexCache[key] = await getNextFileIndex({ ...context, folderId });
      return fileIndexCache[key];
    }
    fileIndexCache[key] += 1;
    return fileIndexCache[key];
  };

  for (const file of rows) {
    const relativePath = getUploadRelativePath(file);
    const parts = relativePath.split("/");
    const fileName = parts.pop();
    const parentPath = parts.join("/");
    const folderId = folderIdMap[parentPath] || null;
    const attachment = await uploadAttachment(file, fileName);
    const fileNowIso = new Date().toISOString();
    await createDocumentRecord({
      name: fileName,
      title: fileName,
      documentCode: "",
      fileIndex: await nextIndexForFolder(folderId),
      fileAttachment: [{ id: attachment.id }],
      createdAt: fileNowIso,
      updatedAt: fileNowIso,
      uploadedAt: fileNowIso,
      uploaded_at: fileNowIso,
      ...(folderId ? { folderId } : {}),
      ...(userId ? { uploadedById: userId, createdById: userId, updatedById: userId } : {}),
      ...buildDocumentScopePayload(context),
    });
  }
  return true;
};

const LegalStudyCreateBlock = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [serviceNamesByProject, setServiceNamesByProject] = useState({});
  const [legalReferences, setLegalReferences] = useState([]);
  const [files, setFiles] = useState([]);
  const [folderFiles, setFolderFiles] = useState([]);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const isDirtyRef = useRef(false);
  const savingRef = useRef(false);

  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
  }, []);

  const setSavingState = useCallback((value) => {
    savingRef.current = value;
    setSaving(value);
  }, []);

  const forceClose = useCallback((nativeClose) => {
    isDirtyRef.current = false;
    if (typeof nativeClose === "function") {
      nativeClose();
      return;
    }
    closeCurrentPopup();
  }, []);

  // Reads savingRef (not the `saving` state) so that when we flip it to
  // false right before auto-closing on a successful submit, this guarded
  // close path (patched onto ctx.view/popup/modal by
  // configureGuardedModalClose) sees the up-to-date value immediately
  // instead of a stale closure that still thinks we're saving.
  const requestClose = useCallback(
    (nativeClose) => {
      if (savingRef.current) return;
      if (!isDirtyRef.current) {
        forceClose(nativeClose);
        return;
      }
      showDiscardConfirm(() => forceClose(nativeClose));
    },
    [forceClose],
  );

  useEffect(() => configureGuardedModalClose(requestClose), [requestClose]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchAllList(COMPANY_RESOURCES, { sort: ["createdAt"] }).catch(() => []),
      fetchAllList(PROJECT_RESOURCES, {
        pageSize: 1000,
        sort: ["-createdAt"],
        appends: ["customer"],
      }).catch(() => []),
      fetchAllList(LEGAL_REFERENCE_RESOURCES, { pageSize: 1000, sort: ["-createdAt"] }).catch(() => []),
      fetchAllList(PROJECT_SERVICE_RESOURCES, { pageSize: 2000, sort: ["id"] }).catch(() => []),
    ])
      .then(([companyRows, projectRows, legalReferenceRows, projectServiceRows]) => {
        if (!mounted) return;
        setCompanies(companyRows || []);
        setProjects(projectRows || []);
        setLegalReferences(legalReferenceRows || []);
        setServiceNamesByProject(buildServiceNamesByProjectMap(projectServiceRows || []));
        const companyId = defaultInternalCompanyId() || extractId((companyRows || [])[0]) || "";
        const caseId = defaultCaseId();
        form.setFieldsValue({
          ...(companyId ? { internalCompanyId: String(companyId) } : {}),
          ...(caseId ? { caseIds: [String(caseId)] } : {}),
        });
      })
      .catch((error) => {
        console.error("[LegalStudyCreateBlock] load failed", error);
        message.error("Could not load create form data.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const resetDraft = () => {
    form.resetFields();
    const companyId = defaultInternalCompanyId() || extractId(companies[0]) || "";
    const caseId = defaultCaseId();
    form.setFieldsValue({
      ...(companyId ? { internalCompanyId: String(companyId) } : {}),
      ...(caseId ? { caseIds: [String(caseId)] } : {}),
    });
    setFiles([]);
    setFolderFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
    isDirtyRef.current = false;
  };

  const handleCancel = () => {
    requestClose(() => {
      resetDraft();
      closeCurrentPopup();
    });
  };

  const handleSubmit = async (values) => {
    setSavingState(true);
    try {
      const userId = getCurrentUserId();
      const basePayload = {
        title: values.title?.trim(),
        description: values.description?.trim() || "",
        internalCompanyId: extractId(values.internalCompanyId),
        ...(userId ? { createdById: userId, updatedById: userId } : {}),
      };

      const createdStudy = await createWithFallback(
        LEGAL_STUDY_RESOURCES,
        legalStudyPayloadVariants(basePayload),
      );
      const studyId = extractId(createdStudy);
      let uploadFailed = false;
      let linkFailed = false;

      // Every Legal Study record gets exactly one root folder, tagged with
      // the same folderTemplateKey the case-bound (system-generated) Legal
      // Study folders use — this is what makes the entry show up in
      // Library.js's Legal Study gallery, whether or not the user uploaded
      // anything. Created regardless of files/folderFiles selection.
      let rootFolderId = null;
      if (studyId) {
        try {
          const nowIso = new Date().toISOString();
          const rootFolder = await createFolderRecord({
            name: values.title?.trim() || "Legal Study",
            type: "custom",
            folderTemplateKey: LEGAL_STUDY_FOLDER_TEMPLATE_KEY,
            createdAt: nowIso,
            updatedAt: nowIso,
            ...(userId ? { createdById: userId, updatedById: userId } : {}),
            ...buildDocumentScopePayload({
              internalCompanyId: values.internalCompanyId,
              legalStudyId: studyId,
            }),
          });
          rootFolderId = extractId(rootFolder);
        } catch (error) {
          console.error("[LegalStudyCreateBlock] create root folder failed", error);
          message.warning("Legal Study created, but its root folder could not be created.");
        }
      }

      if ((files.length || folderFiles.length) && !studyId) {
        uploadFailed = true;
        message.warning("Created Legal Study, but could not detect its ID for document upload.");
      }

      const caseIds = Array.from(new Set((values.caseIds || []).map((id) => extractId(id)).filter(Boolean)));
      const legalReferenceIds = Array.from(
        new Set((values.legalReferenceIds || []).map((id) => extractId(id)).filter(Boolean)),
      );

      if (studyId && caseIds.length) {
        for (const caseId of caseIds) {
          await linkCaseToLegalStudy(studyId, caseId).catch((error) => {
            linkFailed = true;
            console.error("[LegalStudyCreateBlock] link case failed", error);
          });
        }
      }
      if (studyId && legalReferenceIds.length) {
        for (const legalReferenceId of legalReferenceIds) {
          await linkLegalReferenceToLegalStudy(studyId, legalReferenceId).catch((error) => {
            linkFailed = true;
            console.error("[LegalStudyCreateBlock] link legal reference failed", error);
          });
        }
      }

      const uploadContext = {
        internalCompanyId: extractId(values.internalCompanyId),
        legalStudyId: studyId,
        folderId: rootFolderId,
      };
      if (studyId && files.length) {
        await uploadFilesToStudy(files, uploadContext).catch((error) => {
          uploadFailed = true;
          console.error("[LegalStudyCreateBlock] upload files failed", error);
        });
      }
      if (studyId && folderFiles.length) {
        await uploadFolderFilesToStudy(folderFiles, uploadContext).catch((error) => {
          uploadFailed = true;
          console.error("[LegalStudyCreateBlock] upload folder failed", error);
        });
      }

      if (uploadFailed || linkFailed) {
        message.warning(
          compact([
            "Legal Study created.",
            uploadFailed ? "Some documents failed to upload." : "",
            linkFailed ? "Some case/reference links failed." : "",
          ]).join(" "),
        );
      } else {
        message.success("Legal Study created successfully.");
      }

      // Flip savingRef before closing so the guarded close patch (which
      // otherwise bails out while a submit is in flight) lets this
      // successful-submit close through immediately.
      setSavingState(false);
      resetDraft();
      await refreshNocoBaseDataBlocks();
      emitLibraryDataChanged({ scope: "legalStudy", id: studyId });
      closeCurrentPopup();
    } catch (error) {
      console.error("[LegalStudyCreateBlock] submit failed", error);
      message.error(error?.message || "Create Legal Study failed.");
    } finally {
      setSavingState(false);
    }
  };

  const companyOptions = companies.map((company) => ({
    value: String(extractId(company)),
    label: companyLabel(company),
  }));

  const selectedCompanyId = Form.useWatch ? Form.useWatch("internalCompanyId", form) : "";
  const filteredProjects = useMemo(() => {
    const companyId = extractId(selectedCompanyId);
    if (!companyId) return projects;
    return projects.filter((project) => {
      const projectCompanyId = getRecordCompanyId(project);
      return !projectCompanyId || String(projectCompanyId) === String(companyId);
    });
  }, [projects, selectedCompanyId]);
  const filteredLegalReferences = useMemo(() => {
    const companyId = extractId(selectedCompanyId);
    if (!companyId) return legalReferences;
    return legalReferences.filter((reference) => {
      const referenceCompanyId = getRecordCompanyId(reference);
      return !referenceCompanyId || String(referenceCompanyId) === String(companyId);
    });
  }, [legalReferences, selectedCompanyId]);
  const caseOptions = filteredProjects.map((project) => {
    const plainLabel = projectLabel(project);
    const serviceNames = serviceNamesByProject[extractId(project)] || [];
    return {
      value: String(extractId(project)),
      searchText: compact([plainLabel, ...serviceNames]).join(" "),
      label: React.createElement(
        "div",
        { style: { lineHeight: 1.4, padding: "2px 0" } },
        React.createElement("div", null, plainLabel),
        serviceNames.map((name, index) =>
          React.createElement(
            "div",
            { key: index, style: { fontSize: 12, color: "#6B7280", paddingLeft: 10 } },
            `- ${name}`,
          ),
        ),
      ),
    };
  });
  const legalReferenceOptions = filteredLegalReferences.map((reference) => ({
    value: String(extractId(reference)),
    label: legalReferenceLabel(reference),
  }));

  if (loading) {
    return React.createElement(
      "div",
      { style: { padding: 32, textAlign: "center" } },
      React.createElement(Spin, null),
    );
  }

  return React.createElement(
    Card,
    {
      // title: "Create Legal Study",
      bordered: false,
      style: { width: "100%", fontFamily: FONT },
    },
    React.createElement(
      Form,
      {
        form,
        layout: "vertical",
        onFinish: handleSubmit,
        onValuesChange: markDirty,
      },
      React.createElement(
        Row,
        { gutter: 16 },
        React.createElement(
          Col,
          { xs: 24, md: 12 },
          React.createElement(
            Form.Item,
            {
              name: "title",
              label: "Title",
              rules: [{ required: true, message: "Please enter a title" }],
            },
            React.createElement(Input, { placeholder: "Enter legal study title..." }),
          ),
        ),
        React.createElement(
          Col,
          { xs: 24, md: 12 },
          React.createElement(
            Form.Item,
            {
              name: "internalCompanyId",
              label: "Internal Company",
              rules: [{ required: true, message: "Please select an internal company" }],
            },
            React.createElement(Select, {
              showSearch: true,
              allowClear: true,
              placeholder: "Select company...",
              optionFilterProp: "label",
              options: companyOptions,
            }),
          ),
        ),
      ),
      React.createElement(
        Form.Item,
        { name: "description", label: "Summary" },
        React.createElement(Input.TextArea, {
          rows: 4,
          placeholder: "Summarize the legal study...",
        }),
      ),
      React.createElement(
        Row,
        { gutter: 16 },
        React.createElement(
          Col,
          { xs: 24, md: 24 },
          React.createElement(
            Form.Item,
            {
              name: "caseIds",
              label: "Reference To Case",
              extra: "Link this legal study to active cases in the system.",
            },
            React.createElement(Select, {
              mode: "multiple",
              showSearch: true,
              allowClear: true,
              placeholder: "Select linked cases...",
              filterOption: (input, option) =>
                (option?.searchText || "").toLowerCase().includes(String(input).toLowerCase()),
              options: caseOptions,
            }),
          ),
        ),
        
      ),
      React.createElement(
        "div",
        {
          style: {
            border: "1px dashed #D1D5DB",
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            background: "#F9FAFB",
          },
        },
        React.createElement(
          Typography.Text,
          { strong: true, style: { display: "block", marginBottom: 10, color: "#374151" } },
          "Upload documents (optional)",
        ),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
          React.createElement(
            Button,
            { onClick: () => fileInputRef.current?.click() },
            "Choose file",
          ),
          React.createElement(
            Button,
            { onClick: () => folderInputRef.current?.click() },
            "Choose folder",
          ),
          files.length || folderFiles.length
            ? React.createElement(
                Button,
                {
                  type: "text",
                  onClick: () => {
                    markDirty();
                    setFiles([]);
                    setFolderFiles([]);
                  },
                },
                "Clear selection",
              )
            : null,
        ),
        files.length || folderFiles.length
          ? React.createElement(
              "div",
              { style: { marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" } },
              files.length ? React.createElement(Tag, { color: "blue" }, `${files.length} file`) : null,
              folderFiles.length
                ? React.createElement(Tag, { color: "green" }, `${folderFiles.length} folder files`)
                : null,
            )
          : null,
        React.createElement("input", {
          ref: fileInputRef,
          type: "file",
          multiple: true,
          style: { display: "none" },
          onChange: (event) => {
            markDirty();
            setFiles(Array.from(event.target.files || []));
          },
        }),
        React.createElement("input", {
          ref: folderInputRef,
          type: "file",
          multiple: true,
          webkitdirectory: "true",
          directory: "true",
          style: { display: "none" },
          onChange: (event) => {
            markDirty();
            setFolderFiles(Array.from(event.target.files || []));
          },
        }),
      ),
      React.createElement(
        "div",
        { style: { display: "flex", justifyContent: "flex-end", gap: 8 } },
        React.createElement(Button, { onClick: handleCancel, disabled: saving }, "Cancel"),
        React.createElement(
          Button,
          { type: "primary", htmlType: "submit", loading: saving },
          "Submit",
        ),
      ),
    ),
  );
};

ctx.render(React.createElement(LegalStudyCreateBlock));
