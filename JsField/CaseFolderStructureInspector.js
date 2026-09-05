// ============================================================
// ONE-TIME INSPECTOR + FIXER JS BLOCK — NOT a reusable field/action block.
//
// Companion to pgsql/backfill_case_obsolete_folder_structure.sql: that
// script already backfilled every case that existed at the time it ran.
// This block is for spot-checking a SPECIFIC case's folder tree afterwards
// (or any case created/edited since) and, if its case_service folders
// aren't correctly parented under "Obsolete", fixing just that one case
// on the spot — same logic as the SQL backfill, but scoped to one case and
// driven through the Nocobase API (a JS Block runs client-side, it can't
// run raw SQL).
//
// Root-folder identification mirrors pgsql/backfill_case_obsolete_folder_
// structure.sql exactly: a case's root folder is the one folder for that
// projectId whose own parentId does NOT belong to another folder of the
// same projectId.
//
// Service-folder identification goes one step further than that SQL
// script: a folder counts as a service folder if EITHER it's tagged
// folderTemplateKey === "case_service" OR it's the real target of a
// projectServices.folderId FK (the source of truth, per
// JsField/BackfillCaseServiceFolderTemplateKey.js) — folders created
// before the 2026-09-04 tagging change are real service folders but were
// never stamped, so the SQL script's tag-only filter silently skips them.
// Every service folder should have a parent with folderTemplateKey ===
// "obsolete"; if the case has no "obsolete" folder yet, one is created
// (as a direct child of the root) before reparenting anything onto it.
//
// Only ever writes to the ONE case currently selected, only when you press
// the button, and only touches: (a) creating a missing "Obsolete" folder,
// (b) updating parentId on service folders that aren't under it yet, (c)
// stamping folderTemplateKey = "case_service" on service folders that were
// never tagged. Never deletes, never touches other cases. A service folder
// whose FK match already carries a DIFFERENT folderTemplateKey (one of the
// 5 fixed template keys) is left alone and flagged instead — that's a data
// conflict worth investigating by hand, not something to silently retag.
//
// How to run: paste this whole file into a temporary Nocobase JS block
// (Admin UI -> any page -> add a "JS block").
// ============================================================
const { React, antd } = ctx;
const { useState, useEffect, useMemo } = React;
const { Select, Button, Alert, Tag, Typography, Spin, Empty, message } = antd;
const { Text, Title } = Typography;

const extractId = (val) => (typeof val === "object" && val !== null ? val.id : val);

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

// Mirrors buildFolderData() in CaseCreateForm.js for the "obsolete" child.
const buildObsoleteFolderData = (root, projectId, currentUserId) => ({
  name: "Obsolete",
  type: root?.type || "cases",
  folderTemplateKey: "obsolete",
  parentId: parseInt(root.id),
  projectId: parseInt(projectId),
  customerId: extractId(root.customerId) ? parseInt(extractId(root.customerId)) : null,
  internalCompanyId: extractId(root.internalCompanyId)
    ? parseInt(extractId(root.internalCompanyId))
    : null,
  moduleScope: root.moduleScope || "case_document",
  createdById: currentUserId ? parseInt(currentUserId) : null,
  updatedById: currentUserId ? parseInt(currentUserId) : null,
});

// Root = the folder whose own parentId does NOT belong to another folder
// of the same case (it nests under a customer/company folder outside the
// case, or has no parent at all) — same definition as the SQL backfill,
// NOT "folderTemplateKey IS NULL" (an ad-hoc subfolder can also be NULL).
function findRoot(folders) {
  const idSet = new Set(folders.map((f) => String(extractId(f.id))));
  return folders.find((f) => !idSet.has(String(extractId(f.parentId)))) || null;
}

// A case can never legitimately have a real service folder tagged as one
// of the 5 fixed template folders — same guard as
// JsField/BackfillCaseServiceFolderTemplateKey.js. If the real FK points
// at one of these, that's a data conflict to flag, not silently retag.
const PROTECTED_TEMPLATE_KEYS = new Set([
  "legal_study",
  "lsc_related",
  "legal_docs",
  "legal_dossiers",
  "report_result",
  "obsolete",
]);

// Source of truth for "this folder is a service folder": the real FK,
// projectServices.folderId — NOT folderTemplateKey alone. Folders created
// before the 2026-09-04 tagging change are real service folders but were
// never stamped "case_service", so relying on the tag misses them (as seen
// live: a case's service folder sitting untagged under "Legal dossiers").
function analyzeCase(folders, projectServiceFolderIds) {
  const root = findRoot(folders);
  const obsolete = folders.find((f) => f.folderTemplateKey === "obsolete") || null;
  const obsoleteId = obsolete ? String(extractId(obsolete.id)) : null;

  const serviceFolders = folders.filter(
    (f) =>
      f.folderTemplateKey === "case_service" ||
      projectServiceFolderIds.has(String(extractId(f.id))),
  );

  const conflicting = serviceFolders.filter(
    (f) => f.folderTemplateKey && PROTECTED_TEMPLATE_KEYS.has(f.folderTemplateKey),
  );
  const fixable = serviceFolders.filter((f) => !conflicting.includes(f));

  const misplacedServices = fixable.filter(
    (f) => !obsoleteId || String(extractId(f.parentId)) !== obsoleteId,
  );
  const untaggedServices = fixable.filter((f) => f.folderTemplateKey !== "case_service");

  return { root, obsolete, misplacedServices, untaggedServices, conflicting };
}

const TEMPLATE_KEY_COLORS = {
  obsolete: "purple",
  case_service: "blue",
  legal_study: "default",
  lsc_related: "default",
  legal_docs: "default",
  legal_dossiers: "default",
  report_result: "default",
};

function FolderNode({ folder, childrenById, depth, obsoleteId, misplacedIds, untaggedIds, conflictingIds }) {
  const kids = childrenById.get(String(extractId(folder.id))) || [];
  const fid = String(extractId(folder.id));
  const isMisplaced = misplacedIds.has(fid);
  const isUntagged = untaggedIds.has(fid);
  const isConflicting = conflictingIds.has(fid);
  return (
    <div style={{ marginLeft: depth * 20, marginTop: 4 }}>
      <Text style={isMisplaced || isConflicting ? { color: "#cf1322" } : undefined}>
        {depth > 0 ? "└─ " : ""}
        {folder.name}
      </Text>{" "}
      {folder.folderTemplateKey ? (
        <Tag color={TEMPLATE_KEY_COLORS[folder.folderTemplateKey] || "default"}>
          {folder.folderTemplateKey}
        </Tag>
      ) : null}
      {isMisplaced ? <Tag color="red">sai vị trí — chưa nằm dưới Obsolete</Tag> : null}
      {isUntagged ? <Tag color="orange">chưa gắn tag case_service</Tag> : null}
      {isConflicting ? (
        <Tag color="volcano">FK trỏ vào đây nhưng đã có folderTemplateKey khác — kiểm tra thủ công</Tag>
      ) : null}
      {kids.map((child) => (
        <FolderNode
          key={extractId(child.id)}
          folder={child}
          childrenById={childrenById}
          depth={depth + 1}
          obsoleteId={obsoleteId}
          misplacedIds={misplacedIds}
          untaggedIds={untaggedIds}
          conflictingIds={conflictingIds}
        />
      ))}
    </div>
  );
}

function CaseFolderStructureInspector() {
  const [cases, setCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [folders, setFolders] = useState(null);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await fetchAllList("projects:list", {
          fields: ["id", "caseCode", "projectName"],
          sort: ["-createdAt"],
        });
        setCases(rows);
      } catch (e) {
        setError(e?.message || String(e));
      } finally {
        setLoadingCases(false);
      }
    })();
  }, []);

  const [projectServiceFolderIds, setProjectServiceFolderIds] = useState(new Set());

  const loadFolders = async (caseId) => {
    setLoadingFolders(true);
    setError(null);
    try {
      const [folderRows, serviceRows] = await Promise.all([
        fetchAllList("folders:list", {
          filter: JSON.stringify({ projectId: { $eq: caseId }, isDeleted: { $ne: true } }),
          fields: [
            "id",
            "name",
            "type",
            "folderTemplateKey",
            "parentId",
            "projectId",
            "customerId",
            "internalCompanyId",
            "moduleScope",
          ],
          sort: ["createdAt"],
        }),
        fetchAllList("projectServices:list", {
          filter: JSON.stringify({ projectId: { $eq: caseId }, folderId: { $ne: null } }),
          fields: ["id", "folderId"],
        }),
      ]);
      setFolders(folderRows);
      setProjectServiceFolderIds(
        new Set(serviceRows.map((s) => String(extractId(s.folderId))).filter(Boolean)),
      );
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleSelectCase = (caseId) => {
    setSelectedCaseId(caseId);
    setFolders(null);
    setProjectServiceFolderIds(new Set());
    loadFolders(caseId);
  };

  const analysis = useMemo(
    () => (folders ? analyzeCase(folders, projectServiceFolderIds) : null),
    [folders, projectServiceFolderIds],
  );

  const childrenById = useMemo(() => {
    const map = new Map();
    (folders || []).forEach((f) => {
      const pid = String(extractId(f.parentId));
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid).push(f);
    });
    return map;
  }, [folders]);

  const hasAnomaly =
    analysis &&
    (!analysis.obsolete ||
      analysis.misplacedServices.length > 0 ||
      analysis.untaggedServices.length > 0);

  const handleFix = async () => {
    if (!analysis || !selectedCaseId) return;
    setFixing(true);
    try {
      let obsoleteId = analysis.obsolete ? extractId(analysis.obsolete.id) : null;
      if (!obsoleteId) {
        if (!analysis.root) {
          throw new Error("Không tìm thấy folder gốc của case này — không thể tạo Obsolete.");
        }
        const created = await ctx.api.request({
          url: "folders:create",
          method: "POST",
          data: buildObsoleteFolderData(analysis.root, selectedCaseId, ctx.currentUser?.id),
        });
        obsoleteId = created?.data?.data?.id || created?.data?.id;
      }
      if (!obsoleteId) {
        throw new Error("Tạo folder Obsolete thất bại — không có id trả về.");
      }

      // Union of "needs reparent" and "needs tag" — one folders:update call
      // per affected folder, combining whichever fields it actually needs.
      const misplacedIds = new Set(analysis.misplacedServices.map((f) => extractId(f.id)));
      const untaggedIds = new Set(analysis.untaggedServices.map((f) => extractId(f.id)));
      const allById = new Map(
        [...analysis.misplacedServices, ...analysis.untaggedServices].map((f) => [
          extractId(f.id),
          f,
        ]),
      );

      await Promise.all(
        Array.from(allById.keys()).map((id) => {
          const data = {};
          if (misplacedIds.has(id)) data.parentId = parseInt(obsoleteId);
          if (untaggedIds.has(id)) data.folderTemplateKey = "case_service";
          return ctx.api.request({
            url: "folders:update",
            method: "POST",
            params: { filterByTk: id },
            data,
          });
        }),
      );
      message.success("Đã cập nhật lại cấu trúc folder cho case này.");
      await loadFolders(selectedCaseId);
    } catch (e) {
      message.error(`Cập nhật thất bại: ${e?.message || String(e)}`);
    } finally {
      setFixing(false);
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <Title level={5} style={{ marginBottom: 12 }}>
        Kiểm tra cấu trúc folder theo Case
      </Title>

      <Select
        showSearch
        allowClear
        style={{ width: 420 }}
        placeholder="Chọn case (theo mã hoặc tên)..."
        loading={loadingCases}
        value={selectedCaseId}
        onChange={handleSelectCase}
        filterOption={(input, option) =>
          (option?.label || "").toLowerCase().includes(input.toLowerCase())
        }
        options={cases.map((c) => ({
          value: extractId(c.id),
          label: `${c.caseCode ? c.caseCode + " - " : ""}${c.projectName || ""}`,
        }))}
      />

      {error ? <Alert style={{ marginTop: 16 }} type="error" message={error} /> : null}

      {loadingFolders ? <Spin style={{ marginTop: 16 }} tip="Đang tải folder..." /> : null}

      {analysis ? (
        <div style={{ marginTop: 16 }}>
          {hasAnomaly ? (
            <Alert
              type="warning"
              showIcon
              message="Cấu trúc folder của case này chưa đúng chuẩn."
              description={
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {!analysis.obsolete ? <li>Chưa có folder Obsolete.</li> : null}
                  {analysis.misplacedServices.length > 0 ? (
                    <li>{analysis.misplacedServices.length} folder dịch vụ chưa nằm dưới Obsolete.</li>
                  ) : null}
                  {analysis.untaggedServices.length > 0 ? (
                    <li>{analysis.untaggedServices.length} folder dịch vụ chưa được gắn tag "case_service" (tạo trước ngày gắn tag, nhận diện qua projectServices.folderId).</li>
                  ) : null}
                  {analysis.conflicting.length > 0 ? (
                    <li style={{ color: "#ad4e00" }}>
                      {analysis.conflicting.length} folder được projectServices trỏ tới nhưng đã mang folderTemplateKey khác — bỏ qua, cần kiểm tra thủ công.
                    </li>
                  ) : null}
                </ul>
              }
              action={
                <Button size="small" danger loading={fixing} onClick={handleFix}>
                  Cập nhật lại cấu trúc case này
                </Button>
              }
            />
          ) : (
            <Alert type="success" showIcon message="Cấu trúc folder của case này đã đúng chuẩn." />
          )}

          <div style={{ marginTop: 16 }}>
            {analysis.root ? (
              <FolderNode
                folder={analysis.root}
                childrenById={childrenById}
                depth={0}
                obsoleteId={analysis.obsolete ? extractId(analysis.obsolete.id) : null}
                misplacedIds={new Set(analysis.misplacedServices.map((f) => String(extractId(f.id))))}
                untaggedIds={new Set(analysis.untaggedServices.map((f) => String(extractId(f.id))))}
                conflictingIds={new Set(analysis.conflicting.map((f) => String(extractId(f.id))))}
              />
            ) : (
              <Empty description="Không tìm thấy folder gốc cho case này" />
            )}
          </div>
        </div>
      ) : selectedCaseId && !loadingFolders ? (
        <Empty style={{ marginTop: 16 }} description="Case này chưa có folder nào" />
      ) : null}
    </div>
  );
}

ctx.render(<CaseFolderStructureInspector />);
