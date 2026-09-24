// ============================================================
// ONE-TIME MIGRATION SCRIPT — NOT a reusable field/action block.
//
// Backfills folderManagers/folderMembers onto the 5 auto-created
// template folders (Legal Study / LSC & Related / Legal docs /
// Legal dossiers / Report and Result) for every EXISTING Case whose
// folders were created BEFORE CaseCreateForm.js's
// assignDefaultFolderPermissions fix (commit c20aac4, 2026-08-11).
// Those cases only ever got a Manager/Member grant on their root
// folder — never on the 5 level-2 template children — so a Member who
// only has access via one of those child folders (e.g. a cross-case
// Link into "Legal Study") sees it as empty when browsing it directly.
//
// Source of truth for each case's team: projects.managerId (→
// folderManagers, role "manager") + projects.assignees (→
// folderMembers, role "viewer") — the exact same source
// assignDefaultFolderPermissions already uses for new cases, so the
// backfilled grants match what a case created today would get.
//
// How to run: paste this into a temporary Nocobase Action block (a
// button's onClick JS), or into the browser dev console while on any
// page where `ctx` is already in scope (e.g. a CaseDocument.js page).
// Idempotent — every write is guarded by an "already exists" check
// first, so it's safe to re-run.
// ============================================================
const extractId = (val) =>
  typeof val === "object" && val !== null ? val.id : val;

const SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS = new Set([
  "legal_study",
  "lsc_related",
  "legal_docs",
  "legal_dossiers",
  "report_result",
]);
const SYSTEM_LOCKED_RENAME_TEMPLATE_NAMES = new Set([
  "legal study",
  "lsc & related",
  "legal docs",
  "legal dossiers",
  "report and result",
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

const isTemplateChildFolder = (folder) =>
  SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS.has(folder?.folderTemplateKey) ||
  SYSTEM_LOCKED_RENAME_TEMPLATE_NAMES.has(
    String(folder?.name || "").trim().toLowerCase(),
  );

const run = async () => {
  console.log("[backfill] loading projects, folders, folderManagers, folderMembers...");
  const [projects, folders, allManagers, allMembers] = await Promise.all([
    fetchAllList("projects:list", {
      fields: ["id", "managerId"],
      appends: ["manager", "assignees"],
    }),
    fetchAllList("folders:list", {
      filter: JSON.stringify({ isDeleted: { $ne: true } }),
      fields: ["id", "projectId", "parentId", "folderTemplateKey", "name"],
    }),
    fetchAllList("folderManagers:list", { fields: ["id", "folderId", "lawyerId"] }),
    fetchAllList("folderMembers:list", { fields: ["id", "folderId", "lawyerId"] }),
  ]);

  const managerSet = new Set(
    allManagers.map((r) => `${extractId(r.folderId)}:${extractId(r.lawyerId)}`),
  );
  const memberSet = new Set(
    allMembers.map((r) => `${extractId(r.folderId)}:${extractId(r.lawyerId)}`),
  );

  const foldersByProject = new Map();
  folders.forEach((f) => {
    const pid = extractId(f.projectId);
    if (!pid) return;
    if (!foldersByProject.has(pid)) foldersByProject.set(pid, []);
    foldersByProject.get(pid).push(f);
  });

  let created = 0;
  let skippedNoTeam = 0;
  let touchedCases = 0;

  for (const project of projects) {
    const caseId = extractId(project.id);
    const managerId = extractId(project.managerId) || extractId(project.manager);
    const assigneeIds = Array.from(
      new Set(
        (Array.isArray(project.assignees) ? project.assignees : [])
          .map((a) => extractId(a))
          .filter(Boolean)
          .filter((id) => String(id) !== String(managerId)),
      ),
    );
    if (!managerId && !assigneeIds.length) {
      skippedNoTeam++;
      continue;
    }

    const childFolders = (foldersByProject.get(caseId) || []).filter(
      isTemplateChildFolder,
    );
    if (!childFolders.length) continue;

    let touchedThisCase = false;
    for (const folder of childFolders) {
      const folderId = extractId(folder.id);

      if (managerId && !managerSet.has(`${folderId}:${managerId}`)) {
        await ctx.api.request({
          url: "folderManagers:create",
          method: "POST",
          data: { folderId, lawyerId: Number(managerId), role: "manager" },
        });
        managerSet.add(`${folderId}:${managerId}`);
        created++;
        touchedThisCase = true;
      }

      for (const lawyerId of assigneeIds) {
        if (memberSet.has(`${folderId}:${lawyerId}`)) continue;
        await ctx.api.request({
          url: "folderMembers:create",
          method: "POST",
          data: { folderId, lawyerId: Number(lawyerId), role: "viewer" },
        });
        memberSet.add(`${folderId}:${lawyerId}`);
        created++;
        touchedThisCase = true;
      }
    }
    if (touchedThisCase) touchedCases++;
  }

  const summary = `Backfill complete: ${created} grant(s) added across ${touchedCases} case(s). ${skippedNoTeam} case(s) skipped (no manager/assignees set).`;
  console.log(`[backfill] ${summary}`);
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
