// ============================================================
// ONE-TIME MIGRATION SCRIPT — NOT a reusable field/action block.
//
// DB-level-only reorganization, invisible to the Library.js UI (neither
// the Customer->Case gallery nor the Reference gallery reads parentId —
// see the 2026-08-19 Library.js root-folder discussion). Purpose: give an
// external tool (Google Drive backup sync) a stable, non-flat tree to
// walk, instead of every customer's own root folder and every standalone
// Reference (Legal Study) root folder sitting as siblings at the very
// top level alongside Knowledge/My Documents/company_shared folders.
//
// Reparents:
//   1. Every existing "Customer root" folder (parentId: null, has its own
//      customerId, no projectId/caseId of its own — see CaseCreateForm.js's
//      3-tier tree: Customer root -> Case root -> Case's template folders)
//      into the "Customers" category root folder (id below).
//   2. Every existing standalone (case-less) Reference/Legal Study root
//      folder (folderTemplateKey === "legal_study", no projectId/caseId,
//      parentId: null — created via Library.js's "New Reference") into
//      the "Reference" category root folder (id below).
//
// Companion: Library.js's LIBRARY_CATEGORY_ROOT_FOLDER_ID map only lists
// Knowledge — Customers/Reference are intentionally left OUT of that map,
// since (unlike Knowledge) neither space ever creates new folders at a
// flat "root" the way Knowledge's "+ New Folder" did, so there's no
// equivalent ongoing-declutter code needed for them.
//
// Idempotent — only picks up folders whose parentId is still null, so
// re-running after a first successful pass is a no-op.
//
// How to run: paste this into a temporary Nocobase Action block (a
// button's onClick JS), or into the browser dev console while on any
// page where `ctx` is already in scope (e.g. Library.js's page).
// ============================================================
const CUSTOMERS_ROOT_FOLDER_ID = 381870527283200;
const REFERENCE_ROOT_FOLDER_ID = 381870548254720;
const LEGAL_STUDY_FOLDER_TEMPLATE_KEY = "legal_study";

const extractId = (val) =>
  typeof val === "object" && val !== null ? val.id : val;
const extractRelationId = (val) =>
  Array.isArray(val) ? extractId(val[0]) : extractId(val);

// Mirrors Library.js's own getFolderCaseProjectId — "does this folder
// belong to a specific Case", checked across every field/relation alias
// that function recognizes, so this script's classification matches
// exactly what the app itself treats as a Case-scoped folder.
const getFolderCaseProjectId = (folder) =>
  extractId(folder?.projectId) ||
  extractRelationId(folder?.project) ||
  extractRelationId(folder?.projects) ||
  extractId(folder?.sourceProjectId) ||
  extractRelationId(folder?.sourceProject) ||
  extractId(folder?.caseId) ||
  extractRelationId(folder?.case) ||
  extractRelationId(folder?.cases);

const getFolderCustomerId = (folder) =>
  extractId(folder?.customerId) || extractRelationId(folder?.customers);

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
  console.log("[backfill-customer-reference-root] loading folders...");
  const folders = await fetchAllList("folders:list", {
    filter: JSON.stringify({ isDeleted: { $ne: true } }),
    fields: ["id", "parentId", "customerId", "folderTemplateKey", "name"],
  });

  const rootLevelFolders = folders.filter(
    (f) =>
      !f.parentId &&
      extractId(f.id) !== CUSTOMERS_ROOT_FOLDER_ID &&
      extractId(f.id) !== REFERENCE_ROOT_FOLDER_ID,
  );

  const customerRootFolders = rootLevelFolders.filter(
    (f) => getFolderCustomerId(f) && !getFolderCaseProjectId(f),
  );

  const standaloneReferenceFolders = rootLevelFolders.filter(
    (f) =>
      f.folderTemplateKey === LEGAL_STUDY_FOLDER_TEMPLATE_KEY &&
      !getFolderCaseProjectId(f),
  );

  let movedCustomers = 0;
  for (const folder of customerRootFolders) {
    await ctx.api.request({
      url: "folders:update",
      method: "POST",
      params: { filterByTk: extractId(folder.id) },
      data: { parentId: CUSTOMERS_ROOT_FOLDER_ID },
    });
    movedCustomers++;
  }

  let movedReference = 0;
  for (const folder of standaloneReferenceFolders) {
    await ctx.api.request({
      url: "folders:update",
      method: "POST",
      params: { filterByTk: extractId(folder.id) },
      data: { parentId: REFERENCE_ROOT_FOLDER_ID },
    });
    movedReference++;
  }

  const summary = `Backfill complete: moved ${movedCustomers} customer root folder(s) under Customers, ${movedReference} standalone Reference folder(s) under Reference.`;
  console.log(`[backfill-customer-reference-root] ${summary}`);
  if (typeof message !== "undefined" && message?.success) {
    message.success(summary);
  }
};

run().catch((e) => {
  console.error("[backfill-customer-reference-root] failed", e);
  if (typeof message !== "undefined" && message?.error) {
    message.error("Backfill failed — see console for details.");
  }
});
