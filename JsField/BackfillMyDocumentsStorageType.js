// ============================================================
// ONE-TIME MIGRATION SCRIPT — NOT a reusable field/action block.
//
// Fixes 3 data gaps found in the "My Documents" space (see the 2026-08-20
// Library.js My-Documents-orphan-folder discussion):
//
//   1. The 9 per-lawyer personal root folders (and any manually
//      reparented folder/document nested under one — e.g. a folder whose
//      Parent was updated by hand through the raw Admin grid, carrying
//      documents that were never touched) were created/relinked manually
//      through Nocobase's raw Admin data grid (not through Library.js's
//      own create flow), so they never got storageType: "personal" /
//      moduleScope: "personal" stamped on them. Library.js's
//      visibleFolders/visibleDocs filters for this space require that
//      field on the record ITSELF (folder or document, not just its
//      ancestor folder), so these records were invisible in the app's
//      own My Documents table even though their parentId/folderId
//      correctly points somewhere inside the "My Documents" subtree.
//
//   2. Folders/documents created while the LIVE Nocobase block was still
//      running an older version of Library.js (before the
//      resolveMyDocumentsParentId fix) ended up with parentId: null /
//      folderId: null instead of being nested under their creator's
//      personal folder — a true orphan outside every lawyer's subtree.
//      This script reparents those, using the record's own lawyerId if
//      already set, otherwise resolving the creator's lawyer the same
//      way Library.js's loadData() does (lawyers.userId /
//      lawyers.createdById matched against the record's createdById).
//
// Idempotent — a folder/document already correctly scoped and parented
// is left untouched, so re-running after a first successful pass only
// processes whatever is still broken.
//
// How to run: paste this into a temporary Nocobase Action block (a
// button's onClick JS), or into the browser dev console while on any
// page where `ctx` is already in scope (e.g. Library.js's page).
// ============================================================
// Resolved at runtime by `type` (see run() below), not hardcoded by id —
// see Library.js's myDocumentsRootFolderId for why (2026-08-20 incident:
// a stale hardcoded id silently broke this lookup for every lawyer once
// the folder record was deleted/recreated at some point).
const MY_DOCUMENTS_ROOT_FOLDER_TYPE = "my_documents";
const MY_DOCUMENT_STORAGE_TYPE = "personal";

const extractId = (val) =>
  typeof val === "object" && val !== null ? val.id : val;
const extractRelationId = (val) =>
  Array.isArray(val) ? extractId(val[0]) : extractId(val);
const getFolderLawyerId = (folder) =>
  extractId(folder?.lawyerId) || extractRelationId(folder?.lawyers);

const fetchAllList = async (url, params = {}) => {
  let all = [];
  let page = 1;
  const pageSize = 500;
  while (true) {
    const res = await ctx.api.request({
      url,
      params: { ...params, page, pageSize },
    });
    const data = res?.data?.data || [];
    all = all.concat(data);
    const meta = res?.data?.meta || {};
    if (!meta.count || all.length >= meta.count || data.length < pageSize)
      break;
    page++;
  }
  return all;
};

const run = async () => {
  console.log("[backfill-my-documents] loading folders, documents, lawyers...");
  const [folders, documents, lawyers] = await Promise.all([
    fetchAllList("folders:list", {
      filter: JSON.stringify({ isDeleted: { $ne: true } }),
      fields: [
        "id",
        "parentId",
        "storageType",
        "moduleScope",
        "lawyerId",
        "createdById",
        "name",
        "type",
      ],
    }),
    fetchAllList("documents:list", {
      filter: JSON.stringify({ isDeleted: { $ne: true } }),
      fields: [
        "id",
        "folderId",
        "storageType",
        "moduleScope",
        "createdById",
        "uploadedById",
        "title",
      ],
    }),
    fetchAllList("lawyers:list", {
      fields: ["id", "userId", "createdById", "lawyerName"],
    }),
  ]);

  const lawyerByUserId = new Map();
  lawyers.forEach((lw) => {
    const lwId = extractId(lw.id);
    const linkedUserId = extractId(lw.userId);
    const creatorUserId = extractId(lw.createdById);
    if (linkedUserId) lawyerByUserId.set(String(linkedUserId), lwId);
    if (creatorUserId && !lawyerByUserId.has(String(creatorUserId)))
      lawyerByUserId.set(String(creatorUserId), lwId);
  });

  const folderById = new Map(
    folders.map((f) => [String(extractId(f.id)), f]),
  );

  const rootFolder = folders.find(
    (f) => f.type === MY_DOCUMENTS_ROOT_FOLDER_TYPE,
  );
  if (!rootFolder) {
    console.error(
      `[backfill-my-documents] no folder found with type "${MY_DOCUMENTS_ROOT_FOLDER_TYPE}" — aborting`,
    );
    if (typeof message !== "undefined" && message?.error) {
      message.error("Could not find the My Documents root folder — aborted.");
    }
    return;
  }
  const rootFolderId = extractId(rootFolder.id);

  // ── Step 1: stamp storageType/moduleScope on every folder that's
  // actually inside the My Documents subtree (walked via parentId) but
  // missing the field(s).
  const subtreeIds = new Set([String(rootFolderId)]);
  let grew = true;
  while (grew) {
    grew = false;
    folders.forEach((f) => {
      const fid = String(extractId(f.id));
      if (subtreeIds.has(fid)) return;
      const parentId = String(extractId(f.parentId) || "");
      if (parentId && subtreeIds.has(parentId)) {
        subtreeIds.add(fid);
        grew = true;
      }
    });
  }
  subtreeIds.delete(String(rootFolderId));

  let stampedFolders = 0;
  for (const fid of subtreeIds) {
    const folder = folderById.get(fid);
    if (!folder) continue;
    const needsStamp =
      folder.storageType !== MY_DOCUMENT_STORAGE_TYPE ||
      folder.moduleScope !== MY_DOCUMENT_STORAGE_TYPE;
    if (!needsStamp) continue;
    await ctx.api.request({
      url: "folders:update",
      method: "POST",
      params: { filterByTk: extractId(folder.id) },
      data: {
        storageType: MY_DOCUMENT_STORAGE_TYPE,
        moduleScope: MY_DOCUMENT_STORAGE_TYPE,
      },
    });
    stampedFolders++;
  }

  // ── Step 1b: same stamp, but for DOCUMENTS whose folderId already
  // correctly points inside the My Documents subtree (e.g. manually
  // reparented via the raw Admin grid) yet still carry whatever
  // storageType/moduleScope they had in their previous space — Library.js's
  // visibleDocs filter for this space requires storageType === "personal"
  // on the DOCUMENT record itself (not just its folder), so a document
  // with the right folderId but a stale storageType stays invisible in
  // the app even though it browses fine from the raw Admin grid.
  let stampedDocuments = 0;
  for (const doc of documents) {
    const folderId = String(extractId(doc.folderId) || "");
    if (!folderId || !subtreeIds.has(folderId)) continue;
    const needsStamp =
      doc.storageType !== MY_DOCUMENT_STORAGE_TYPE ||
      doc.moduleScope !== MY_DOCUMENT_STORAGE_TYPE;
    if (!needsStamp) continue;
    await ctx.api.request({
      url: "documents:update",
      method: "POST",
      params: { filterByTk: extractId(doc.id) },
      data: {
        storageType: MY_DOCUMENT_STORAGE_TYPE,
        moduleScope: MY_DOCUMENT_STORAGE_TYPE,
      },
    });
    stampedDocuments++;
  }

  // ── Step 2: reparent orphaned My Documents folders (parentId null,
  // but tagged storageType/moduleScope: "personal" from the old buggy
  // create flow) into their creator's personal folder.
  const personalRootByLawyerId = new Map();
  folders.forEach((f) => {
    const parentId = String(extractId(f.parentId) || "");
    if (parentId !== String(rootFolderId)) return;
    const lwId = getFolderLawyerId(f);
    if (lwId) personalRootByLawyerId.set(String(lwId), f);
  });

  const orphanFolders = folders.filter((f) => {
    const parentId = extractId(f.parentId);
    if (parentId) return false;
    return (
      f.storageType === MY_DOCUMENT_STORAGE_TYPE ||
      f.moduleScope === MY_DOCUMENT_STORAGE_TYPE
    );
  });

  let reparentedFolders = 0;
  const unresolvedFolders = [];
  for (const folder of orphanFolders) {
    let targetLawyerId = getFolderLawyerId(folder);
    if (!targetLawyerId) {
      const creatorId = extractId(folder.createdById);
      targetLawyerId = creatorId
        ? lawyerByUserId.get(String(creatorId))
        : null;
    }
    const targetRoot = targetLawyerId
      ? personalRootByLawyerId.get(String(targetLawyerId))
      : null;
    if (!targetRoot || String(extractId(targetRoot)) === String(extractId(folder))) {
      unresolvedFolders.push(folder);
      continue;
    }
    await ctx.api.request({
      url: "folders:update",
      method: "POST",
      params: { filterByTk: extractId(folder.id) },
      data: {
        parentId: extractId(targetRoot),
        storageType: MY_DOCUMENT_STORAGE_TYPE,
        moduleScope: MY_DOCUMENT_STORAGE_TYPE,
        ...(getFolderLawyerId(folder) ? {} : { lawyerId: targetLawyerId }),
      },
    });
    reparentedFolders++;
  }

  // ── Step 3: same 2 steps for documents sitting directly under the My
  // Documents root's orphan state (folderId: null but storageType/
  // moduleScope: "personal").
  const orphanDocs = documents.filter((d) => {
    const folderId = extractId(d.folderId);
    if (folderId) return false;
    return (
      d.storageType === MY_DOCUMENT_STORAGE_TYPE ||
      d.moduleScope === MY_DOCUMENT_STORAGE_TYPE
    );
  });

  let reparentedDocs = 0;
  const unresolvedDocs = [];
  for (const doc of orphanDocs) {
    const creatorId =
      extractId(doc.createdById) || extractId(doc.uploadedById);
    const targetLawyerId = creatorId
      ? lawyerByUserId.get(String(creatorId))
      : null;
    const targetRoot = targetLawyerId
      ? personalRootByLawyerId.get(String(targetLawyerId))
      : null;
    if (!targetRoot) {
      unresolvedDocs.push(doc);
      continue;
    }
    await ctx.api.request({
      url: "documents:update",
      method: "POST",
      params: { filterByTk: extractId(doc.id) },
      data: {
        folderId: extractId(targetRoot),
        storageType: MY_DOCUMENT_STORAGE_TYPE,
        moduleScope: MY_DOCUMENT_STORAGE_TYPE,
      },
    });
    reparentedDocs++;
  }

  const summary = `Backfill complete: stamped storageType on ${stampedFolders} folder(s) and ${stampedDocuments} document(s), reparented ${reparentedFolders} orphan folder(s) and ${reparentedDocs} orphan document(s).`;
  console.log(`[backfill-my-documents] ${summary}`);
  if (unresolvedFolders.length) {
    console.warn(
      "[backfill-my-documents] could not resolve target lawyer for these orphan folders (left untouched):",
      unresolvedFolders.map((f) => ({ id: extractId(f.id), name: f.name })),
    );
  }
  if (unresolvedDocs.length) {
    console.warn(
      "[backfill-my-documents] could not resolve target lawyer for these orphan documents (left untouched):",
      unresolvedDocs.map((d) => ({ id: extractId(d.id), title: d.title })),
    );
  }
  if (typeof message !== "undefined" && message?.success) {
    message.success(summary);
  }
};

run().catch((e) => {
  console.error("[backfill-my-documents] failed", e);
  if (typeof message !== "undefined" && message?.error) {
    message.error("Backfill failed — see console for details.");
  }
});
