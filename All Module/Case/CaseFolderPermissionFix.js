// ============================================================
// Case → Root Folder Permission FIX (ghi dữ liệu)
//
// Dùng chung logic phát hiện lệch pha với CaseFolderPermissionAudit.js,
// nhưng thêm bước lập KẾ HOẠCH sửa + yêu cầu xác nhận trước khi gọi API
// ghi dữ liệu thật. Không tự chạy ghi khi mở block — phải bấm "Áp dụng".
//
// Phạm vi kiểm tra: folder gốc CỘNG VỚI mọi folder con trực tiếp (level-2)
// của gốc mà HIỆN ĐANG có ít nhất 1 bản ghi folderManagers/folderMembers
// của riêng nó (vd 6 folder mẫu hệ thống: Legal Study, LSC & Related,
// Legal docs, Legal dossiers, Report and Result, Obsolete — do
// CaseCreateForm.js tạo). Đây chính là các folder được CaseDocument.js/
// Library.js's resolvePermissionFolder() coi là "permission-bearing" —
// runtime ưu tiên đọc quyền TRÊN CHÍNH folder level-2 đó thay vì fallback
// lên gốc khi nó có bản ghi riêng. Level-2 KHÔNG có bản ghi nào thì bỏ qua
// (đang tự kế thừa quyền từ gốc, thêm bản ghi riêng vào sẽ biến nó thành
// điểm cần đồng bộ thủ công vĩnh viễn — phản tác dụng). Folder cấp 3 trở
// xuống (vd folder theo từng dịch vụ trong Obsolete) không nằm trong phạm
// vi vì bản ghi quyền riêng của chúng không được runtime đọc tới.
//
// Mặc định CHỈ bổ sung quyền còn thiếu + thay quyền Manager cũ bằng Manager
// hiện tại của Case:
//   - missing_manager_grant → tạo folderManagers (role: manager)
//   - stale_manager_grant   → xoá folderManagers của manager cũ
//   - missing_member_grant  → tạo folderMembers (role: viewer)
// KHÔNG tự thu hồi "extra_member_grant" (quyền Member có trên folder nhưng
// không còn trong Case.assignees) vì đây có thể là quyền cấp riêng qua
// Folder Permissions / Reference link, không nhất thiết là rác — chỉ xử lý
// khi người dùng chủ động bật switch "Thu hồi quyền thừa".
// ============================================================

const { React } = ctx;
const { useState, useEffect } = React;
const { Table, Tag, Typography, Spin, Alert, Space, Button, Switch, Modal, message } = ctx.antd;
const { Title, Text } = Typography;

const extractId = (val) =>
  typeof val === "object" && val !== null ? val.id : val;
const extractRelationId = (val) =>
  Array.isArray(val) ? extractId(val[0]) : extractId(val);

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

// Trả về { cases, rootFolderByCase, managersByFolder, membersByFolder,
// lawyerLabel } — state gốc dùng cả để tính issues lẫn build fix plan,
// tránh fetch 2 lần.
const loadState = async () => {
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

  return {
    cases,
    folders,
    rootFolderByCase,
    managersByFolder: groupByFolder(folderManagers),
    membersByFolder: groupByFolder(folderMembers),
    lawyerLabel,
  };
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

// Từ state gốc, build danh sách action cần chạy để đưa các folder có phân
// quyền riêng (gốc + level-2 hasOwnGrant) của mỗi case về đúng theo
// Case.managerId/assignees hiện tại.
const buildFixPlan = (state, { revokeExtraMembers }) => {
  const { cases, folders, rootFolderByCase, managersByFolder, membersByFolder, lawyerLabel } = state;
  const actions = [];
  const unresolvedCases = [];

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
      unresolvedCases.push({ caseId, label, customerName });
      return;
    }

    const targetFolders = getPermissionBearingFolders(rootFolder, folders, managersByFolder, membersByFolder);

    targetFolders.forEach(({ folderId, folderLabel, isRoot }) => {
      const managerRows = managersByFolder.get(folderId) || [];
      const managerLawyerIdsOnFolder = managerRows.map((r) => String(extractId(r.lawyerId)));

      if (managerLawyerId && !managerLawyerIdsOnFolder.includes(managerLawyerId)) {
        actions.push({
          caseId, label, customerName, folderId, folderLabel, isRoot,
          lawyerId: managerLawyerId, lawyerName: lawyerLabel(managerLawyerId),
          op: "create_manager",
          detail: `Cấp quyền Manager (folderManagers) cho ${lawyerLabel(managerLawyerId)} trên ${isRoot ? "folder gốc" : `folder "${folderLabel}"`}`,
          run: () =>
            ctx.api.request({
              url: "folderManagers:create",
              method: "POST",
              data: { folderId: Number(folderId), lawyerId: Number(managerLawyerId), role: "manager" },
            }),
        });
      }

      if (managerLawyerId) {
        managerLawyerIdsOnFolder
          .filter((id) => id !== managerLawyerId)
          .forEach((oldId) => {
            const staleRow = managerRows.find((r) => String(extractId(r.lawyerId)) === oldId);
            actions.push({
              caseId, label, customerName, folderId, folderLabel, isRoot,
              lawyerId: oldId, lawyerName: lawyerLabel(oldId),
              op: "remove_stale_manager",
              detail: `Thu hồi quyền Manager cũ của ${lawyerLabel(oldId)} trên ${isRoot ? "folder gốc" : `folder "${folderLabel}"`} (không còn là Manager của Case)`,
              run: () =>
                ctx.api.request({
                  url: "folderManagers:destroy",
                  method: "POST",
                  params: { filterByTk: extractId(staleRow?.id) },
                }),
            });
          });
      }

      const memberRows = membersByFolder.get(folderId) || [];
      const memberLawyerIdsOnFolder = new Set(memberRows.map((r) => String(extractId(r.lawyerId))));

      memberLawyerIds.forEach((id) => {
        if (!memberLawyerIdsOnFolder.has(id)) {
          actions.push({
            caseId, label, customerName, folderId, folderLabel, isRoot,
            lawyerId: id, lawyerName: lawyerLabel(id),
            op: "create_member",
            detail: `Cấp quyền Member (folderMembers, role: viewer) cho ${lawyerLabel(id)} trên ${isRoot ? "folder gốc" : `folder "${folderLabel}"`}`,
            run: () =>
              ctx.api.request({
                url: "folderMembers:create",
                method: "POST",
                data: { folderId: Number(folderId), lawyerId: Number(id), role: "viewer" },
              }),
          });
        }
      });

      if (revokeExtraMembers) {
        memberRows.forEach((row) => {
          const id = String(extractId(row.lawyerId));
          if (id !== managerLawyerId && !memberLawyerIds.has(id)) {
            actions.push({
              caseId, label, customerName, folderId, folderLabel, isRoot,
              lawyerId: id, lawyerName: lawyerLabel(id),
              op: "remove_extra_member",
              detail: `Thu hồi quyền Member thừa của ${lawyerLabel(id)} trên ${isRoot ? "folder gốc" : `folder "${folderLabel}"`} (không còn trong Case.assignees)`,
              run: () =>
                ctx.api.request({
                  url: "folderMembers:destroy",
                  method: "POST",
                  params: { filterByTk: extractId(row.id) },
                }),
            });
          }
        });
      }
    });
  });

  return { actions, unresolvedCases };
};

const OP_LABELS = {
  create_manager: { text: "+ Manager", color: "green" },
  remove_stale_manager: { text: "− Manager cũ", color: "gold" },
  create_member: { text: "+ Member", color: "green" },
  remove_extra_member: { text: "− Member thừa", color: "red" },
};

const CaseFolderPermissionFixBlock = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [state, setState] = useState(null);
  const [plan, setPlan] = useState(null);
  const [revokeExtraMembers, setRevokeExtraMembers] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setApplyResult(null);
    try {
      const s = await loadState();
      setState(s);
      const p = buildFixPlan(s, { revokeExtraMembers });
      setPlan(p);
      console.log("[CaseFolderPermissionFix] plan:", p);
    } catch (e) {
      console.error("[CaseFolderPermissionFix] load failed:", e);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (state) setPlan(buildFixPlan(state, { revokeExtraMembers }));
  }, [revokeExtraMembers]);

  const applyPlan = async () => {
    if (!plan || !plan.actions.length) return;
    Modal.confirm({
      title: `Áp dụng ${plan.actions.length} thay đổi quyền folder?`,
      content: `Thao tác này sẽ gọi API ghi trực tiếp lên dữ liệu thật (folderManagers/folderMembers) cho ${new Set(plan.actions.map((a) => a.caseId)).size} case. Không thể tự hoàn tác — hãy xem lại bảng bên dưới trước khi tiếp tục.`,
      okText: "Áp dụng",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        setApplying(true);
        setApplyResult(null);
        const results = [];
        for (const action of plan.actions) {
          try {
            await action.run();
            results.push({ ...action, status: "ok" });
          } catch (e) {
            results.push({ ...action, status: "error", errorMessage: e?.message || String(e) });
          }
        }
        const failed = results.filter((r) => r.status === "error");
        setApplyResult(results);
        setApplying(false);
        if (failed.length) {
          message.warning(`Hoàn tất với ${failed.length}/${results.length} thay đổi thất bại — xem bảng kết quả bên dưới.`);
        } else {
          message.success(`Đã áp dụng ${results.length} thay đổi thành công.`);
        }
        // Nạp lại state + plan từ dữ liệu mới nhất để xác nhận đã hết lệch pha.
        await load();
      },
    });
  };

  const planColumns = [
    { title: "Case", dataIndex: "label", key: "label", width: 240 },
    { title: "Khách hàng", dataIndex: "customerName", key: "customerName", width: 160 },
    {
      title: "Hành động",
      dataIndex: "op",
      key: "op",
      width: 140,
      render: (op) => {
        const cfg = OP_LABELS[op] || { text: op, color: "default" };
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

  const resultColumns = [
    ...planColumns,
    {
      title: "Kết quả",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status, row) =>
        status === "ok"
          ? React.createElement(Tag, { color: "green" }, "OK")
          : React.createElement(Tag, { color: "red" }, row.errorMessage || "Lỗi"),
    },
  ];

  return React.createElement(
    "div",
    { style: { padding: 16 } },
    React.createElement(
      Space,
      { style: { marginBottom: 12 }, align: "center", wrap: true },
      React.createElement(Title, { level: 4, style: { margin: 0 } }, "Fix: Case → Folder gốc (phân quyền)"),
      React.createElement(Button, { onClick: load, loading: loading || applying }, "Tính lại kế hoạch"),
      React.createElement(
        Space,
        { align: "center" },
        React.createElement(Switch, {
          checked: revokeExtraMembers,
          onChange: setRevokeExtraMembers,
          disabled: loading || applying,
        }),
        React.createElement(Text, { type: "secondary" }, "Cũng thu hồi quyền Member thừa (rủi ro cao hơn — có thể cắt quyền cấp riêng qua Folder Permissions)"),
      ),
    ),
    error && React.createElement(Alert, { type: "error", message: error, style: { marginBottom: 12 } }),
    loading && !plan
      ? React.createElement(Spin, {})
      : plan &&
          React.createElement(
            React.Fragment,
            null,
            plan.unresolvedCases.length > 0 &&
              React.createElement(Alert, {
                type: "warning",
                style: { marginBottom: 12 },
                message: `${plan.unresolvedCases.length} case không xác định được folder gốc — bỏ qua, cần kiểm tra thủ công (không nằm trong phạm vi tự sửa của script này).`,
              }),
            React.createElement(
              Text,
              { type: "secondary" },
              `Kế hoạch: ${plan.actions.length} thay đổi trên ${new Set(plan.actions.map((a) => a.caseId)).size} case.`,
            ),
            React.createElement(Button, {
              type: "primary",
              danger: true,
              style: { marginLeft: 12 },
              disabled: !plan.actions.length || applying,
              loading: applying,
              onClick: applyPlan,
            }, "Áp dụng thay đổi"),
            React.createElement(Table, {
              style: { marginTop: 12 },
              rowKey: (r, i) => `${r.caseId}-${r.op}-${r.lawyerId}-${i}`,
              dataSource: plan.actions,
              columns: planColumns,
              pagination: { pageSize: 20 },
              size: "small",
            }),
            applyResult &&
              React.createElement(
                React.Fragment,
                null,
                React.createElement(Title, { level: 5, style: { marginTop: 24 } }, "Kết quả áp dụng lần chạy gần nhất"),
                React.createElement(Table, {
                  rowKey: (r, i) => `result-${r.caseId}-${r.op}-${r.lawyerId}-${i}`,
                  dataSource: applyResult,
                  columns: resultColumns,
                  pagination: { pageSize: 20 },
                  size: "small",
                }),
              ),
          ),
  );
};

ctx.render(React.createElement(CaseFolderPermissionFixBlock, null));
