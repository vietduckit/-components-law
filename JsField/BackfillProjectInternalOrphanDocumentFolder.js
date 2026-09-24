// ============================================================
// ONE-TIME BACKFILL SCRIPT — NOT a reusable field/action block.
//
// Context (see DiagnoseProjectInternalFolders.js run for
// projectInternalId 382210844262400, "Tạo template quotations"):
//   - 2 folder records exist with that projectInternalId:
//       #382210846359556 "Tạo template quotations" — parentId
//         381870560837632 (nested under something else, NOT a root
//         of this project's own tree — orphaned/stray duplicate,
//         no document currently references it, left untouched here)
//       #382254986756096 "Tạo template quotations" — the real root
//         (parentId null, createdBy Super Admin) — stop.ico and
//         "Mẫu số 04.docx" already correctly point folderId here.
//   - 1 document, "record.ico" (#382249437691905, taskId 678), has
//     folderId = null. It's the only one uploaded before the real
//     root folder existed, so ProjectDocument.js's strict
//     `String(doc.folderId) === currentFolderKey` match (see
//     ProjectDocument.js ~L6057-6065) can never place it inside that
//     folder — it only shows at the module's "root" listing instead.
//
// This script backfills folderId on EXACTLY the documents under
// TARGET_PROJECT_INTERNAL_ID whose folderId is currently null,
// pointing them at TARGET_ROOT_FOLDER_ID. It does NOT touch the
// orphaned duplicate folder #382210846359556 — that's a separate
// question (what is its real parent 381870560837632?) left for
// manual review before any folder-level fix.
//
// Idempotent: re-running finds nothing left to do once folderId is
// set (the null-filter no longer matches).
//
// DRY_RUN defaults to true — first run only logs what WOULD change.
// Review the console output, then flip DRY_RUN to false and re-run
// to actually write.
//
// How to run: paste into a temporary Nocobase Action block (a
// button's onClick JS) or the browser dev console while on any page
// where `ctx` is already in scope.
// ============================================================
const TARGET_PROJECT_INTERNAL_ID = "382210844262400"; // <-- EDIT THIS
const TARGET_ROOT_FOLDER_ID = "382254986756096"; // <-- EDIT THIS (the confirmed real root)
const DRY_RUN = false; // <-- flip to false to actually write

const extractId = (val) =>
  typeof val === "object" && val !== null ? val.id : val;

const fetchAllList = async (url, params = {}) => {
  let all = [];
  let page = 1;
  const pageSize = 200;
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
  console.log(
    `[backfill] Checking root folder #${TARGET_ROOT_FOLDER_ID} for project #${TARGET_PROJECT_INTERNAL_ID}...`,
  );
  const rootRows = await fetchAllList("folders:list", {
    filter: JSON.stringify({ id: { $eq: TARGET_ROOT_FOLDER_ID } }),
    fields: "id,name,parentId,projectInternalId,isDeleted",
  });
  const rootFolder = rootRows[0] || null;
  if (!rootFolder) {
    throw new Error(
      `Root folder #${TARGET_ROOT_FOLDER_ID} not found — aborting, nothing written.`,
    );
  }
  if (rootFolder.isDeleted) {
    throw new Error(
      `Root folder #${TARGET_ROOT_FOLDER_ID} is marked isDeleted — aborting, nothing written.`,
    );
  }
  if (extractId(rootFolder.parentId)) {
    throw new Error(
      `Root folder #${TARGET_ROOT_FOLDER_ID} has a non-null parentId (${extractId(
        rootFolder.parentId,
      )}) — it isn't actually a root folder. Aborting, nothing written.`,
    );
  }
  if (String(extractId(rootFolder.projectInternalId) || "") !== String(TARGET_PROJECT_INTERNAL_ID)) {
    throw new Error(
      `Root folder #${TARGET_ROOT_FOLDER_ID}'s projectInternalId doesn't match TARGET_PROJECT_INTERNAL_ID — aborting, nothing written.`,
    );
  }
  console.log(`[backfill] Root folder OK: "${rootFolder.name}".`);

  const docs = await fetchAllList("documents:list", {
    filter: JSON.stringify({
      projectInternalId: { $eq: TARGET_PROJECT_INTERNAL_ID },
      folderId: { $eq: null },
      isDeleted: { $ne: true },
    }),
    fields: "id,title,folderId,taskId,createdAt",
  });

  if (docs.length === 0) {
    console.log(
      "[backfill] No documents with a null folderId found for this project — nothing to do.",
    );
    if (typeof message !== "undefined" && message?.success) {
      message.success("Không có document nào cần backfill.");
    }
    return;
  }

  console.log(
    `[backfill] ${docs.length} document(s) with folderId=null found:`,
    docs.map((d) => `#${extractId(d)} "${d.title}"`).join(", "),
  );

  if (DRY_RUN) {
    console.log(
      `[backfill] DRY_RUN=true — would set folderId=${TARGET_ROOT_FOLDER_ID} on the ${docs.length} document(s) above. Flip DRY_RUN to false and re-run to actually write.`,
    );
    if (typeof message !== "undefined" && message?.info) {
      message.info(
        `DRY RUN: ${docs.length} document(s) sẽ được gán folderId. Xem console, sau đó tắt DRY_RUN để ghi thật.`,
      );
    }
    return;
  }

  let updated = 0;
  for (const doc of docs) {
    await ctx.api.request({
      url: "documents:update",
      method: "POST",
      params: { filterByTk: extractId(doc) },
      data: { folderId: Number(TARGET_ROOT_FOLDER_ID) },
    });
    updated++;
    console.log(`[backfill] Updated #${extractId(doc)} "${doc.title}" → folderId=${TARGET_ROOT_FOLDER_ID}`);
  }

  const summary = `Backfill complete: ${updated} document(s) updated to folderId=${TARGET_ROOT_FOLDER_ID}.`;
  console.log(`[backfill] ${summary}`);
  if (typeof message !== "undefined" && message?.success) {
    message.success(summary);
  }
};

run().catch((e) => {
  console.error("[backfill] failed", e);
  if (typeof message !== "undefined" && message?.error) {
    message.error(`Backfill failed: ${e?.message || e}`);
  }
});
