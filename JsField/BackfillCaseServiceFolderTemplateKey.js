// ============================================================
// ONE-TIME MIGRATION SCRIPT — NOT a reusable field/action block.
//
// Tags every EXISTING per-service folder with
// folderTemplateKey: "case_service" — the marker CaseCreateForm.js only
// started stamping on NEW service folders as of the 2026-09-04
// system-folder delete-protection change (CaseDocument.js/Library.js key
// their delete-lock checks off this field, via isSystemFolderRecord /
// isDeleteLockedFolder). Folders created before that change have no such
// marker, so they currently remain deletable — this script closes that
// gap for cases that already existed.
//
// Source of truth for "this folder is a service folder": the real FK,
// projectServices.folderId — NOT name matching (a service could share a
// name with something else, a real FK can't drift out of sync that way).
// Only touches folders that (a) are actually referenced by a
// projectServices row and (b) don't already carry folderTemplateKey
// "case_service". Never overwrites a folder that already has a DIFFERENT
// folderTemplateKey (e.g. one of the 5 fixed template keys) — that would
// indicate a data problem worth investigating by hand, not silently
// papering over, so those are skipped and reported instead.
//
// How to run: paste this into a temporary Nocobase Action block (a
// button's onClick JS), or into the browser dev console while on any
// page where `ctx` is already in scope (e.g. a CaseDocument.js page).
// Idempotent — every write is guarded by an "already tagged" check
// first, so it's safe to re-run.
// ============================================================
const extractId = (val) =>
  typeof val === "object" && val !== null ? val.id : val;

const SERVICE_FOLDER_TEMPLATE_KEY = "case_service";
// Never stomp a folder that's actually one of the 5(+1) fixed template
// folders — a service folder should never legitimately point at one of
// these, so if it ever does, that's a data problem to flag, not silently
// retag.
const PROTECTED_TEMPLATE_KEYS = new Set([
  "legal_study",
  "lsc_related",
  "legal_docs",
  "legal_dossiers",
  "report_result",
  "obsolete",
]);

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
  console.log("[backfill] loading projectServices, folders...");
  const [projectServices, folders] = await Promise.all([
    fetchAllList("projectServices:list", {
      filter: JSON.stringify({ folderId: { $ne: null } }),
      fields: ["id", "folderId", "projectId"],
    }),
    fetchAllList("folders:list", {
      filter: JSON.stringify({ isDeleted: { $ne: true } }),
      fields: ["id", "folderTemplateKey", "name"],
    }),
  ]);

  const folderById = new Map(folders.map((f) => [String(extractId(f.id)), f]));

  let tagged = 0;
  let alreadyTagged = 0;
  let missingFolder = 0;
  let conflicting = 0;
  const conflictDetails = [];

  for (const service of projectServices) {
    const folderId = extractId(service.folderId);
    if (!folderId) continue;
    const folder = folderById.get(String(folderId));
    if (!folder) {
      missingFolder++;
      continue;
    }
    const currentKey = folder.folderTemplateKey;
    if (currentKey === SERVICE_FOLDER_TEMPLATE_KEY) {
      alreadyTagged++;
      continue;
    }
    if (currentKey && PROTECTED_TEMPLATE_KEYS.has(currentKey)) {
      conflicting++;
      conflictDetails.push(
        `folder #${folderId} ("${folder.name || ""}") already has folderTemplateKey "${currentKey}" — projectService #${extractId(service.id)} (case #${extractId(service.projectId)}) skipped`,
      );
      continue;
    }
    await ctx.api.request({
      url: "folders:update",
      method: "POST",
      params: { filterByTk: folderId },
      data: { folderTemplateKey: SERVICE_FOLDER_TEMPLATE_KEY },
    });
    folder.folderTemplateKey = SERVICE_FOLDER_TEMPLATE_KEY; // keep local map in sync in case of dupes
    tagged++;
  }

  const summary = `Backfill complete: ${tagged} folder(s) tagged "${SERVICE_FOLDER_TEMPLATE_KEY}". ${alreadyTagged} already tagged, ${missingFolder} projectServices row(s) pointed at a missing/deleted folder, ${conflicting} skipped due to a conflicting folderTemplateKey.`;
  console.log(`[backfill] ${summary}`);
  if (conflictDetails.length) {
    console.warn("[backfill] conflicts (investigate manually):\n" + conflictDetails.join("\n"));
  }
  if (typeof message !== "undefined" && message?.success) {
    message.success(summary);
  }
};

run().catch((e) => {
  console.error("[backfill] failed", e);
  if (typeof message !== "undefined" && message?.error) {
    message.error("Backfill failed — see console for details.");
  }
});
