// ============================================================
// ONE-TIME MIGRATION SCRIPT — NOT a reusable field/action block.
//
// Reparents every existing top-level Knowledge folder/document (parentId
// / folderId === null, storageType === "knowledge") into the real
// "Knowledge" container folder (id KNOWLEDGE_ROOT_FOLDER_ID below,
// tagged libraryCategoryKey: "category_knowledge") created manually in
// the UI. Declutters the Knowledge space's top level down to a single
// entry point — see the 2026-08-19 Library.js root-folder discussion.
//
// Companion code change: Library.js's LIBRARY_CATEGORY_ROOT_FOLDER_ID map
// + resolveCreateTargetParentId() already make new uploads/folders land
// inside this same real folder going forward, so this script only needs
// to run once for the pre-existing backlog.
//
// Idempotent — only picks up records whose parentId/folderId is still
// null, so re-running after a first successful pass is a no-op.
//
// How to run: paste this into a temporary Nocobase Action block (a
// button's onClick JS), or into the browser dev console while on any
// page where `ctx` is already in scope (e.g. Library.js's page).
// ============================================================
const KNOWLEDGE_ROOT_FOLDER_ID = 381870504214528;
const KNOWLEDGE_STORAGE_TYPE = "knowledge";

const extractId = (val) =>
  typeof val === "object" && val !== null ? val.id : val;

const fetchAllList = async (url, params = {}) => {
  let all = [];
  let page = 1;
  const pageSize = 500;
  while (true) {
    const res = await ctx.api.request({ url, params: { ...params, page, pageSize } });
    const data = res?.data?.data || [];
    all = all.concat(data);
    const meta = res?.data?.meta || {};
    if (!meta.count || all.length >= meta.count || data.length < pageSize) break;
    page++;
  }
  return all;
};

const run = async () => {
  console.log("[backfill-knowledge-root] loading Knowledge folders/documents...");
  const [folders, documents] = await Promise.all([
    fetchAllList("folders:list", {
      filter: JSON.stringify({
        $and: [
          { storageType: { $eq: KNOWLEDGE_STORAGE_TYPE } },
          { isDeleted: { $ne: true } },
          { parentId: { $eq: null } },
        ],
      }),
      fields: ["id", "parentId", "name"],
    }),
    fetchAllList("documents:list", {
      filter: JSON.stringify({
        $and: [
          { storageType: { $eq: KNOWLEDGE_STORAGE_TYPE } },
          { isDeleted: { $ne: true } },
          { folderId: { $eq: null } },
        ],
      }),
      fields: ["id", "folderId", "title"],
    }),
  ]);

  const foldersToMove = folders.filter(
    (f) => extractId(f.id) !== KNOWLEDGE_ROOT_FOLDER_ID,
  );

  let movedFolders = 0;
  for (const folder of foldersToMove) {
    const folderId = extractId(folder.id);
    await ctx.api.request({
      url: "folders:update",
      method: "POST",
      params: { filterByTk: folderId },
      data: { parentId: KNOWLEDGE_ROOT_FOLDER_ID },
    });
    movedFolders++;
  }

  let movedDocuments = 0;
  for (const doc of documents) {
    const docId = extractId(doc.id);
    await ctx.api.request({
      url: "documents:update",
      method: "POST",
      params: { filterByTk: docId },
      data: { folderId: KNOWLEDGE_ROOT_FOLDER_ID },
    });
    movedDocuments++;
  }

  const summary = `Backfill complete: moved ${movedFolders} folder(s) and ${movedDocuments} document(s) into the Knowledge root folder.`;
  console.log(`[backfill-knowledge-root] ${summary}`);
  if (typeof message !== "undefined" && message?.success) {
    message.success(summary);
  }
};

run().catch((e) => {
  console.error("[backfill-knowledge-root] failed", e);
  if (typeof message !== "undefined" && message?.error) {
    message.error("Backfill failed — see console for details.");
  }
});
