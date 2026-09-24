// ============================================================
// ONE-TIME DIAGNOSTIC JS BLOCK — NOT a reusable field/action block.
//
// Follow-up to DiagnoseLawyerUserLinks.js + DiagnoseMyDocumentsFolders.js:
// both confirmed the data itself is 100% correct for Vy Lê (lawyerId,
// moduleScope, storageType all match), even when checked from Vy Lê's own
// login session. So the bug isn't data — it must be in the actual fetch
// path Library.js's loadData() runs.
//
// This script replicates that exact path WITHOUT swallowing errors the
// way the real code does:
//
//   1. Resolve currentLawyerId the same way loadData() does (lawyers:list
//      filtered by userId/createdById, with the same full-scan fallback).
//   2. Fetch folders the same way fetchFoldersForInternalTemplates() does
//      — same appends (createdBy, updatedBy, internalTemplates,
//      folderManager, folderManagers, folderMember, folderMembers), same
//      moduleScope filter, same primary-then-fallback structure — but
//      logging every error instead of catching it into an empty array.
//   3. Reports whether the resulting folder list actually contains this
//      user's personal folder.
//
// IMPORTANT: run this logged in as the SPECIFIC affected user (e.g. Vy
// Lê), not as Admin — the whole point is to reproduce that user's exact
// RBAC-restricted fetch, which an Admin session won't hit.
//
// Read-only — makes no writes. Safe to run repeatedly.
// ============================================================
const { React, antd } = ctx;
const { useState, useEffect } = React;
const { Typography, Spin, Alert, Descriptions, Tag } = antd;
const { Text, Title, Paragraph } = Typography;

const MY_DOCUMENTS_ROOT_FOLDER_TYPE = "my_documents";
const MODULE_SCOPES = [
  "internal_templates",
  "internal_template",
  "legal_reference",
  "legal_study",
  "personal",
  "knowledge",
];
const RELATION_FIELD_CANDIDATES = [
  "internalTemplates",
  "internalTemplatesId",
  "internalTemplate",
  "internalTemplateId",
];

const extractId = (val) =>
  typeof val === "object" && val !== null ? val.id : val;
const extractRelationId = (val) =>
  Array.isArray(val) ? extractId(val[0]) : extractId(val);
const getFolderLawyerId = (folder) =>
  extractId(folder?.lawyerId) || extractRelationId(folder?.lawyers);
const getFolderParentId = (folder) => extractId(folder?.parentId);

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

function LibraryLoadPathDiagnostic() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  useEffect(() => {
    (async () => {
      const log = [];
      const push = (label, detail) => log.push({ label, detail, ts: Date.now() });

      // ── Step 1: who am I ──
      let currentUser = null;
      try {
        const authRes = await ctx.api.request({ url: "auth:check" });
        currentUser = authRes?.data?.data || authRes?.data || null;
        push("auth:check OK", `userId = ${extractId(currentUser)} (${currentUser?.nickname || currentUser?.email || ""})`);
      } catch (e) {
        push("auth:check LỖI", e?.message || String(e));
      }
      const userId = extractId(currentUser);

      // ── Step 2: resolve lawyerId — same logic as Library.js loadData() ──
      let resolvedLawyerId = null;
      try {
        const lwRes = await ctx.api.request({
          url: "lawyers:list",
          params: {
            pageSize: 1,
            filter: JSON.stringify({
              $or: [{ userId: { $eq: userId } }, { createdById: { $eq: userId } }],
            }),
          },
        });
        let lawyer = lwRes?.data?.data?.[0];
        push(
          "lawyers:list (filter $or userId/createdById)",
          lawyer ? `Tìm thấy lawyerId = ${extractId(lawyer.id)}` : "Không tìm thấy (0 kết quả) — sẽ thử fallback quét toàn bộ",
        );
        if (!lawyer) {
          const allLwRes = await ctx.api.request({
            url: "lawyers:list",
            params: { pageSize: 1000, fields: "id,lawyerName,email,userId,createdById" },
          });
          const allLw = allLwRes?.data?.data || [];
          lawyer = allLw.find((item) => {
            const linkedId = extractId(item.userId) || extractId(item.user);
            return linkedId === userId || extractId(item.createdById) === userId;
          });
          push(
            "fallback: quét toàn bộ lawyers:list",
            lawyer
              ? `Tìm thấy lawyerId = ${extractId(lawyer.id)} (trong ${allLw.length} bản ghi)`
              : `Vẫn KHÔNG tìm thấy trong ${allLw.length} bản ghi lawyers`,
          );
        }
        resolvedLawyerId = lawyer ? extractId(lawyer.id) : null;
      } catch (e) {
        push("Resolve lawyerId LỖI", e?.message || String(e));
      }

      // ── Step 3: fetch folders exactly like fetchFoldersForInternalTemplates() ──
      let folders = [];
      let foldersSource = null;
      try {
        const scopeFilter = JSON.stringify({ moduleScope: { $in: MODULE_SCOPES } });
        const primaryField = RELATION_FIELD_CANDIDATES[0];
        try {
          folders = await fetchAllList("folders:list", {
            sort: ["createdAt"],
            filter: scopeFilter,
            appends: [
              "createdBy",
              "updatedBy",
              primaryField,
              "folderManager",
              "folderManagers",
              "folderMember",
              "folderMembers",
            ],
          });
          foldersSource = "primary (đầy đủ appends)";
          push("folders:list [primary appends] OK", `${folders.length} folder`);
        } catch (primaryErr) {
          push("folders:list [primary appends] LỖI", primaryErr?.message || String(primaryErr));
          try {
            folders = await fetchAllList("folders:list", {
              sort: ["createdAt"],
              filter: scopeFilter,
              appends: ["createdBy", "updatedBy", primaryField],
            });
            foldersSource = "fallback (appends rút gọn)";
            push("folders:list [fallback appends] OK", `${folders.length} folder`);
          } catch (fallbackErr) {
            foldersSource = "THẤT BẠI CẢ 2 LẦN — folders = []";
            push("folders:list [fallback appends] LỖI (đây là điểm gây rỗng)", fallbackErr?.message || String(fallbackErr));
          }
        }
      } catch (e) {
        push("fetchFoldersForInternalTemplates tổng thể LỖI", e?.message || String(e));
      }

      // ── Step 4: does the result contain this lawyer's personal folder? ──
      const rootFolder = folders.find((f) => f.type === MY_DOCUMENTS_ROOT_FOLDER_TYPE);
      push(
        "Tìm folder gốc My Documents trong danh sách vừa fetch",
        rootFolder ? `Có, id = ${extractId(rootFolder.id)}` : "KHÔNG có trong danh sách vừa fetch",
      );
      let myFolder = null;
      if (rootFolder && resolvedLawyerId) {
        myFolder = folders.find(
          (f) =>
            !f.isDeleted &&
            String(getFolderLawyerId(f) || "") === String(resolvedLawyerId) &&
            String(getFolderParentId(f) || "") === String(extractId(rootFolder.id)),
        );
      }
      push(
        "Kết quả cuối: myDocumentsFolder",
        myFolder
          ? `TÌM THẤY — folderId = ${extractId(myFolder.id)}, name = ${myFolder.name}`
          : "KHÔNG TÌM THẤY — đây là lý do app báo lỗi",
      );

      setReport({
        userId,
        resolvedLawyerId,
        foldersCount: folders.length,
        foldersSource,
        rootFolderFound: !!rootFolder,
        myFolderFound: !!myFolder,
        log,
      });
      setLoading(false);
    })();
  }, []);

  if (loading) return <Spin tip="Đang tái hiện đường đi load của Library.js..." />;
  if (!report) return <Alert type="error" message="Không thu được kết quả" />;

  return (
    <div style={{ padding: 12 }}>
      <Title level={5} style={{ marginBottom: 8 }}>
        Tái hiện đường đi fetch folders của Library.js (chạy dưới quyền tài khoản đang đăng nhập)
      </Title>
      <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="userId đang đăng nhập">{report.userId}</Descriptions.Item>
        <Descriptions.Item label="lawyerId resolve được">
          {report.resolvedLawyerId || <Tag color="red">KHÔNG RESOLVE ĐƯỢC</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="Số folder fetch được (folders:list)">
          {report.foldersCount}{" "}
          <Text type="secondary">({report.foldersSource})</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Folder gốc My Documents có trong danh sách?">
          {report.rootFolderFound ? <Tag color="green">CÓ</Tag> : <Tag color="red">KHÔNG</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="myDocumentsFolder cuối cùng">
          {report.myFolderFound ? <Tag color="green">TÌM THẤY</Tag> : <Tag color="red">KHÔNG TÌM THẤY</Tag>}
        </Descriptions.Item>
      </Descriptions>

      <Title level={5} style={{ marginBottom: 8 }}>
        Log chi tiết từng bước
      </Title>
      {report.log.map((entry, i) => (
        <Paragraph key={i} style={{ marginBottom: 4, fontFamily: "monospace", fontSize: 12 }}>
          <Text strong>{i + 1}. {entry.label}:</Text> {entry.detail}
        </Paragraph>
      ))}
    </div>
  );
}

ctx.render(<LibraryLoadPathDiagnostic />);
