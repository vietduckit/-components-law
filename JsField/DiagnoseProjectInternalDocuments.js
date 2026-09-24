// ============================================================
// ONE-TIME DIAGNOSTIC JS BLOCK — NOT a reusable field/action block.
//
// A document correctly stamped with projectInternalId + moduleScope:
// "project_internal" + a real folderId (confirmed via the raw Admin
// grid) still shows as "This folder is empty" inside ProjectDocument.js's
// own Document tab for that same Internal Work item. This script
// replicates ProjectDocument.js's own fetch + matching pipeline
// (fetchDocumentsForInternalTemplates / fetchFoldersForInternalTemplates
// / matchesCaseFolder / matchesCaseDocument) step by step for ONE
// specific projectInternalId, so we can see exactly which step drops the
// document instead of guessing from the source code alone.
//
// EDIT the TARGET_PROJECT_INTERNAL_ID constant below before running —
// paste in the exact numeric id shown in the Admin grid's "Project
// Internal" column for the affected document (e.g. 382210844262400).
//
// Read-only — makes no writes. Safe to run repeatedly.
//
// How to run: paste this whole file into a temporary Nocobase JS block
// (Admin UI -> any page -> add a "JS block"), edit the constant below,
// save. Run while logged in as the SAME user who can't see the file in
// ProjectDocument.js (permission filtering can differ from Admin).
// ============================================================
const TARGET_PROJECT_INTERNAL_ID = "382210844262400"; // <-- EDIT THIS

const { React, antd } = ctx;
const { useState, useEffect } = React;
const { Table, Tag, Typography, Spin, Alert, Descriptions } = antd;
const { Text, Title } = Typography;

const DASHBOARD_MODULE_SCOPES = ["project_internal", "legal_reference", "legal_study"];

const extractId = (val) =>
  typeof val === "object" && val !== null ? val.id : val;
const extractRelationId = (val) =>
  Array.isArray(val) ? extractId(val[0]) : extractId(val);
const getLinkedCaseId = (record) =>
  extractId(record?.projectInternalId) || extractRelationId(record?.projectInternal);
const matchesCaseFolder = (folder, caseId) => {
  const safeCaseId = extractId(caseId);
  if (!safeCaseId) return false;
  return String(getLinkedCaseId(folder) || "") === String(safeCaseId);
};
const matchesCaseDocument = (doc, caseId, folderIdSet) => {
  const safeCaseId = extractId(caseId);
  if (!safeCaseId) return false;
  if (String(getLinkedCaseId(doc) || "") === String(safeCaseId)) return true;
  const folderId = extractId(doc?.folderId);
  return !!(folderId && folderIdSet?.has(String(folderId)));
};

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

function ProjectInternalDocDiagnostic() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  useEffect(() => {
    (async () => {
      const log = [];
      const push = (label, detail) => log.push({ label, detail });

      let currentUser = null;
      try {
        const authRes = await ctx.api.request({ url: "auth:check" });
        currentUser = authRes?.data?.data || authRes?.data || null;
        push("auth:check OK", `userId = ${extractId(currentUser)}`);
      } catch (e) {
        push("auth:check LỖI", e?.message || String(e));
      }

      // ── Step 1: replicate fetchFoldersForInternalTemplates() ──
      let allFolders = [];
      try {
        const scopeFilter = JSON.stringify({
          $or: [
            { moduleScope: { $in: DASHBOARD_MODULE_SCOPES } },
            { projectInternalId: { $ne: null } },
          ],
        });
        allFolders = await fetchAllList("folders:list", {
          sort: ["createdAt"],
          filter: scopeFilter,
          appends: ["createdBy", "updatedBy"],
        });
        push("folders:list (scopeFilter $or) OK", `${allFolders.length} folder tổng`);
      } catch (e) {
        push("folders:list LỖI", e?.message || String(e));
      }

      // ── Step 2: replicate fetchDocumentsForInternalTemplates() ──
      let allDocuments = [];
      try {
        const scopeFilter = JSON.stringify({
          $or: [
            { moduleScope: { $in: DASHBOARD_MODULE_SCOPES } },
            { projectInternalId: { $ne: null } },
          ],
        });
        allDocuments = await fetchAllList("documents:list", {
          sort: ["fileIndex", "-createdAt"],
          filter: scopeFilter,
          appends: ["fileAttachment", "createdBy", "updatedBy"],
        });
        push("documents:list (scopeFilter $or) OK", `${allDocuments.length} document tổng`);
      } catch (e) {
        push("documents:list LỖI", e?.message || String(e));
      }

      // ── Step 3: is the target folder/doc even present in the raw fetch? ──
      const rawFoldersForTarget = allFolders.filter(
        (f) => String(getLinkedCaseId(f) || "") === String(TARGET_PROJECT_INTERNAL_ID),
      );
      const rawDocsForTarget = allDocuments.filter(
        (d) => String(getLinkedCaseId(d) || "") === String(TARGET_PROJECT_INTERNAL_ID),
      );
      push(
        "Folder có projectInternalId khớp target (trong raw fetch)",
        `${rawFoldersForTarget.length} folder: ${rawFoldersForTarget
          .map((f) => `#${extractId(f)} "${f.name}" (isDeleted=${!!f.isDeleted}, parentId=${extractId(f.parentId) || "null"})`)
          .join("; ") || "(không có)"}`,
      );
      push(
        "Document có projectInternalId khớp target (trong raw fetch)",
        `${rawDocsForTarget.length} document: ${rawDocsForTarget
          .map(
            (d) =>
              `#${extractId(d)} "${d.title}" (isDeleted=${!!d.isDeleted}, folderId=${extractId(d.folderId) || "null"}, moduleScope=${d.moduleScope || "(trống)"})`,
          )
          .join("; ") || "(không có)"}`,
      );

      // ── Step 4: replicate caseFolders / caseDocs useMemo chain ──
      const caseFolders = allFolders.filter((folder) =>
        matchesCaseFolder(folder, TARGET_PROJECT_INTERNAL_ID),
      );
      const caseFolderIdSet = new Set(
        caseFolders.map((f) => String(extractId(f))).filter(Boolean),
      );
      const caseDocs = allDocuments.filter((doc) =>
        matchesCaseDocument(doc, TARGET_PROJECT_INTERNAL_ID, caseFolderIdSet),
      );
      push(
        "caseFolders (matchesCaseFolder)",
        `${caseFolders.length} folder — id set: [${Array.from(caseFolderIdSet).join(", ")}]`,
      );
      push(
        "caseDocs (matchesCaseDocument)",
        `${caseDocs.length} document: ${caseDocs
          .map((d) => `#${extractId(d)} "${d.title}" folderId=${extractId(d.folderId) || "null"}`)
          .join("; ") || "(không có)"}`,
      );

      // ── Step 5: visibleDocs = caseDocs.filter(!isDeleted) ──
      const visibleDocs = caseDocs.filter((d) => !d.isDeleted);
      push(
        "visibleDocs (sau khi lọc isDeleted)",
        `${visibleDocs.length} document còn lại`,
      );

      // ── Step 6: for each candidate root folder, does any visible doc match its id exactly? ──
      const rootCandidates = caseFolders.filter((f) => !extractId(f.parentId));
      const rootMatchSummary = rootCandidates.map((root) => {
        const rootId = String(extractId(root));
        const matchingDocs = visibleDocs.filter(
          (d) => String(extractId(d.folderId) || "") === rootId,
        );
        return `Root #${rootId} "${root.name}": ${matchingDocs.length} doc khớp folderId chính xác`;
      });
      push(
        "So khớp folderId của document với id thật của folder gốc",
        rootMatchSummary.join(" | ") || "(không có folder gốc nào trong caseFolders)",
      );

      setReport({ log, currentUser, allFoldersCount: allFolders.length, allDocumentsCount: allDocuments.length });
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spin tip="Đang tái hiện pipeline ProjectDocument.js..." />;
  if (!report) return <Alert type="error" message="Không thu được kết quả" />;

  return (
    <div style={{ padding: 12 }}>
      <Title level={5} style={{ marginBottom: 8 }}>
        Chẩn đoán ProjectDocument.js cho projectInternalId = {TARGET_PROJECT_INTERNAL_ID}
      </Title>
      {report.log.map((entry, i) => (
        <div key={i} style={{ marginBottom: 8, fontFamily: "monospace", fontSize: 12 }}>
          <Text strong>{i + 1}. {entry.label}:</Text>
          <div style={{ whiteSpace: "pre-wrap", color: "#555" }}>{entry.detail}</div>
        </div>
      ))}
    </div>
  );
}

ctx.render(<ProjectInternalDocDiagnostic />);
