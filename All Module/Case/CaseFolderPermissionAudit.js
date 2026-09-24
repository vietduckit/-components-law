// ============================================================
// Case → Root Folder Permission Audit (read-only)
//
// Bug bối cảnh: CaseCreateForm.js chỉ ghi folderManagers/folderMembers cho
// folder gốc của Case (và các folder hệ thống bên trong — xem dưới) MỘT LẦN
// lúc tạo Case (assignDefaultFolderPermissions). Khi Case.managerId/
// assignees được sửa sau đó qua các màn hình khác (không đi qua Folder
// Permissions modal trong CaseDocument.js), folderManagers/folderMembers
// trên các folder đó không được đồng bộ lại => member mới bị thêm vào Case
// nhưng không truy cập được các folder này.
//
// Phạm vi kiểm tra: folder gốc CỘNG VỚI mọi folder con trực tiếp (level-2)
// của gốc mà HIỆN ĐANG có ít nhất 1 bản ghi folderManagers/folderMembers
// của riêng nó (vd 6 folder mẫu hệ thống: Legal Study, LSC & Related,
// Legal docs, Legal dossiers, Report and Result, Obsolete — do
// CaseCreateForm.js tạo). Đây chính là các folder được CaseDocument.js/
// Library.js's resolvePermissionFolder() coi là "permission-bearing"
// (isPermissionBearingFolder) — có "hasOwnGrant" thì mới thật sự có hiệu
// lực; runtime sẽ ưu tiên đọc quyền TRÊN CHÍNH folder level-2 đó thay vì
// fallback lên gốc. Level-2 KHÔNG có bản ghi nào thì bỏ qua (không cần
// sửa) vì lúc đó nó tự động kế thừa quyền từ gốc rồi — thêm bản ghi riêng
// vào sẽ biến nó thành 1 điểm cần đồng bộ thủ công vĩnh viễn, phản tác
// dụng. Folder cấp 3 trở xuống (vd folder theo từng dịch vụ nằm trong
// Obsolete) không nằm trong phạm vi vì bản ghi quyền riêng của chúng
// không được runtime đọc tới (luôn resolve qua level-2/level-1), có sửa
// cũng không ảnh hưởng quyền truy cập thật.
//
// Script này chỉ SO SÁNH và BÁO CÁO lệch pha, không ghi dữ liệu.
// ============================================================

const { React } = ctx;
const { useState, useEffect } = React;
const { Table, Tag, Typography, Spin, Alert, Space, Button } = ctx.antd;
const { Title, Text } = Typography;

const extractId = (val) =>
  typeof val === "object" && val !== null ? val.id : val;
const extractRelationId = (val) =>
  Array.isArray(val) ? extractId(val[0]) : extractId(val);

// Cùng field-fallback list với Library.js's getFolderCaseProjectId, để
// nhận diện folder thuộc Case nào bất kể field nào thực sự có dữ liệu.
const getFolderCaseProjectId = (folder) =>
  extractId(folder?.projectId) ||
  extractRelationId(folder?.project) ||
  extractRelationId(folder?.projects) ||
  extractId(folder?.sourceProjectId) ||
  extractRelationId(folder?.sourceProject) ||
  extractId(folder?.caseId) ||
  extractRelationId(folder?.case) ||
  extractRelationId(folder?.cases);
const getFolderParentId = (folder) => extractId(folder?.parentId);

// Ported từ Library.js's isCaseRootFolder: folder gốc của 1 Case là folder
// có projectId riêng mà cha của nó (nếu có) KHÔNG có projectId (cha là
// Customer root hoặc không có cha). Fail-closed: nếu không xác định được
// cha (vì không nằm trong tập folders đã fetch) thì KHÔNG coi là root, để
// tránh báo sai.
const isCaseRootFolder = (folder, allFolders) => {
  const ownProjectId = getFolderCaseProjectId(folder);
  if (!ownProjectId) return false;
  const parentId = getFolderParentId(folder);
  if (!parentId || parentId === "root") return true;
  const parent = allFolders.find(
    (f) => String(extractId(f.id)) === String(parentId),
  );
  if (!parent) return false;
  return !getFolderCaseProjectId(parent);
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

const getCaseCustomerName = (c) => {
  const customer = c?.customer || (Array.isArray(c?.customers) ? c.customers[0] : c?.customers);
  return customer?.shortName || customer?.customerName || customer?.name || "";
};

// Cùng thứ tự fallback với CaseDocument.js's getLawyerDisplayName, áp trực
// tiếp lên record lawyers (không phải qua 1 relation row trung gian).
const getLawyerLabel = (lawyer) => {
  if (!lawyer) return "";
  return (
    lawyer.lawyerName ||
    lawyer.nickname ||
    lawyer.username ||
    lawyer.fullName ||
    lawyer.name ||
    lawyer.email ||
    `Lawyer #${extractId(lawyer.id)}`
  );
};

// Folder gốc + mọi folder con trực tiếp (level-2) của gốc đang có ít nhất
// 1 bản ghi folderManagers/folderMembers riêng — xem giải thích ở đầu file.
const getPermissionBearingFolders = (rootFolder, folders, managersByFolder, membersByFolder) => {
  const rootId = String(extractId(rootFolder.id));
  const targets = [
    { folder: rootFolder, folderId: rootId, folderLabel: rootFolder.name || "Folder gốc", isRoot: true },
  ];
  folders.forEach((f) => {
    const fid = String(extractId(f.id));
    if (fid === rootId) return;
    if (String(getFolderParentId(f) || "") !== rootId) return;
    const hasOwnGrant =
      (managersByFolder.get(fid) || []).length > 0 ||
      (membersByFolder.get(fid) || []).length > 0;
    if (!hasOwnGrant) return;
    targets.push({ folder: f, folderId: fid, folderLabel: f.name || `Folder #${fid}`, isRoot: false });
  });
  return targets;
};

const ISSUE_LABELS = {
  no_root_folder: { text: "Không tìm thấy folder gốc", color: "red" },
  missing_manager_grant: { text: "Thiếu quyền Manager", color: "orange" },
  stale_manager_grant: { text: "Quyền Manager sai/thừa", color: "gold" },
  missing_member_grant: { text: "Thiếu quyền Member", color: "volcano" },
  extra_member_grant: { text: "Quyền Member thừa", color: "blue" },
};

const runAudit = async () => {
  // Không được filter folders theo projectId != null: isCaseRootFolder cần
  // nhìn thấy cả Customer-root (cha của case-root) để xác định đúng root,
  // nếu thiếu cha trong tập fetch sẽ fail-closed và báo sai "no_root_folder".
  const [cases, folders, folderManagers, folderMembers, lawyers] = await Promise.all([
    fetchAllList("projects:list", { appends: ["assignees", "customer", "customers"] }),
    fetchAllList("folders:list", {}),
    fetchAllList("folderManagers:list", {}),
    fetchAllList("folderMembers:list", {}),
    fetchAllList("lawyers:list", {}),
  ]);

  const lawyerNameById = new Map(
    lawyers.map((l) => [String(extractId(l.id)), getLawyerLabel(l)]),
  );
  const lawyerLabel = (id) => (id ? lawyerNameById.get(String(id)) || `Lawyer #${id}` : "");

  const rootFolderByCase = new Map();
  folders.forEach((f) => {
    if (isCaseRootFolder(f, folders)) {
      const pid = getFolderCaseProjectId(f);
      if (pid) rootFolderByCase.set(String(pid), f);
    }
  });

  const groupByFolder = (rows) => {
    const map = new Map();
    rows.forEach((row) => {
      const fid = String(extractId(row.folderId));
      if (!map.has(fid)) map.set(fid, []);
      map.get(fid).push(row);
    });
    return map;
  };
  const managersByFolder = groupByFolder(folderManagers);
  const membersByFolder = groupByFolder(folderMembers);

  const issues = [];

  cases.forEach((c) => {
    const caseId = extractId(c.id);
    const managerLawyerId = extractId(c.managerId) ? String(extractId(c.managerId)) : null;
    const memberLawyerIds = new Set(
      (c.assignees || [])
        .map((a) => extractId(a))
        .filter((id) => id != null)
        .map(String)
        .filter((id) => id !== managerLawyerId),
    );

    const customerName = getCaseCustomerName(c);
    const label = [c.caseCode, c.projectName].filter(Boolean).join(" - ") || `Case #${caseId}`;

    const rootFolder = rootFolderByCase.get(String(caseId));
    if (!rootFolder) {
      issues.push({
        caseId, label, customerName, folderId: null, lawyerId: null, lawyerName: "",
        type: "no_root_folder",
        detail: "Không tìm thấy folder gốc (projectId) cho case này",
      });
      return;
    }
    const targetFolders = getPermissionBearingFolders(rootFolder, folders, managersByFolder, membersByFolder);

    targetFolders.forEach(({ folderId, folderLabel, isRoot }) => {
      const folderNote = isRoot ? "folder gốc" : `folder "${folderLabel}" (level-2)`;

      const managerRows = managersByFolder.get(folderId) || [];
      const managerLawyerIdsOnFolder = managerRows.map((r) => String(extractId(r.lawyerId)));

      if (managerLawyerId && !managerLawyerIdsOnFolder.includes(managerLawyerId)) {
        issues.push({
          caseId, label, customerName, folderId, folderLabel, isRoot,
          lawyerId: managerLawyerId, lawyerName: lawyerLabel(managerLawyerId),
          type: "missing_manager_grant",
          detail: `Case.managerId=${lawyerLabel(managerLawyerId)} nhưng folderManagers chưa có bản ghi tương ứng trên ${folderNote}`,
        });
      }
      // Chỉ gắn cờ "stale" khi Case CÓ managerId khác với bản ghi folder — nếu
      // Case chưa gán Manager (managerLawyerId null) thì không rõ manager grant
      // hiện có là cố ý hay rác, nên bỏ qua thay vì báo sai hàng loạt.
      if (managerLawyerId) {
        managerLawyerIdsOnFolder
          .filter((id) => id !== managerLawyerId)
          .forEach((id) => {
            issues.push({
              caseId, label, customerName, folderId, folderLabel, isRoot,
              lawyerId: id, lawyerName: lawyerLabel(id),
              type: "stale_manager_grant",
              detail: `folderManagers còn quyền manager của ${lawyerLabel(id)} trên ${folderNote}, không khớp Manager hiện tại của Case (${lawyerLabel(managerLawyerId)})`,
            });
          });
      }

      const memberRows = membersByFolder.get(folderId) || [];
      const memberLawyerIdsOnFolder = new Set(memberRows.map((r) => String(extractId(r.lawyerId))));

      memberLawyerIds.forEach((id) => {
        if (!memberLawyerIdsOnFolder.has(id)) {
          issues.push({
            caseId, label, customerName, folderId, folderLabel, isRoot,
            lawyerId: id, lawyerName: lawyerLabel(id),
            type: "missing_member_grant",
            detail: `${lawyerLabel(id)} có trong Case.assignees nhưng chưa có quyền folderMembers trên ${folderNote} → không truy cập được folder`,
          });
        }
      });
      memberLawyerIdsOnFolder.forEach((id) => {
        if (id !== managerLawyerId && !memberLawyerIds.has(id)) {
          issues.push({
            caseId, label, customerName, folderId, folderLabel, isRoot,
            lawyerId: id, lawyerName: lawyerLabel(id),
            type: "extra_member_grant",
            detail: `folderMembers còn quyền của ${lawyerLabel(id)} trên ${folderNote}, người này hiện không còn trong Case.assignees`,
          });
        }
      });
    });
  });

  return { issues, totalCases: cases.length, totalRootFolders: rootFolderByCase.size };
};

const CaseFolderPermissionAuditBlock = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await runAudit();
      setResult(r);
      console.log("[CaseFolderPermissionAudit] summary:", {
        totalCases: r.totalCases,
        totalRootFolders: r.totalRootFolders,
        totalIssues: r.issues.length,
      });
      console.table(r.issues);
    } catch (e) {
      console.error("[CaseFolderPermissionAudit] failed:", e);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const columns = [
    { title: "Case", dataIndex: "label", key: "label", width: 240 },
    { title: "Khách hàng", dataIndex: "customerName", key: "customerName", width: 160 },
    {
      title: "Loại lỗi",
      dataIndex: "type",
      key: "type",
      width: 180,
      filters: Object.keys(ISSUE_LABELS).map((k) => ({ text: ISSUE_LABELS[k].text, value: k })),
      onFilter: (value, record) => record.type === value,
      render: (type) => {
        const cfg = ISSUE_LABELS[type] || { text: type, color: "default" };
        return React.createElement(Tag, { color: cfg.color }, cfg.text);
      },
    },
    { title: "Luật sư", dataIndex: "lawyerName", key: "lawyerName", width: 160 },
    {
      title: "Folder",
      dataIndex: "folderLabel",
      key: "folderLabel",
      width: 160,
      render: (folderLabel, record) =>
        folderLabel
          ? React.createElement(
              Space,
              { size: 4 },
              record.isRoot && React.createElement(Tag, { color: "purple" }, "Gốc"),
              folderLabel,
            )
          : "—",
    },
    { title: "Chi tiết", dataIndex: "detail", key: "detail" },
    { title: "Case ID", dataIndex: "caseId", key: "caseId", width: 90 },
    { title: "Folder ID", dataIndex: "folderId", key: "folderId", width: 90 },
  ];

  return React.createElement(
    "div",
    { style: { padding: 16 } },
    React.createElement(
      Space,
      { style: { marginBottom: 12 }, align: "center" },
      React.createElement(Title, { level: 4, style: { margin: 0 } }, "Audit: Case → Folder gốc (phân quyền)"),
      React.createElement(Button, { onClick: load, loading }, "Chạy lại"),
    ),
    error && React.createElement(Alert, { type: "error", message: error, style: { marginBottom: 12 } }),
    loading && !result
      ? React.createElement(Spin, {})
      : result &&
          React.createElement(
            React.Fragment,
            null,
            React.createElement(
              Text,
              { type: "secondary" },
              `Tổng ${result.totalCases} case, ${result.totalRootFolders} folder gốc xác định được, ${result.issues.length} vấn đề phát hiện (chi tiết đầy đủ đã in ra console.table).`,
            ),
            React.createElement(Table, {
              style: { marginTop: 12 },
              rowKey: (r, i) => `${r.caseId}-${r.type}-${r.folderId || ""}-${i}`,
              dataSource: result.issues,
              columns,
              pagination: { pageSize: 20 },
              size: "small",
            }),
          ),
  );
};

ctx.render(React.createElement(CaseFolderPermissionAuditBlock, null));
