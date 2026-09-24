// ============================================================
// ONE-TIME DIAGNOSTIC JS BLOCK — NOT a reusable field/action block.
//
// Follow-up to DiagnoseLawyerUserLinks.js: that check confirmed
// lawyers.userId links are all correct (2026-08-21). This one checks the
// NEXT link in the chain — Library.js's myDocumentsFolder lookup matches
// a folder to the logged-in lawyer via:
//
//   String(extractId(folder.lawyerId) || extractRelationId(folder.lawyers))
//     === String(currentLawyerId)
//
// If a personal folder's own `lawyerId` scalar was set incorrectly when
// created by hand through the raw Admin grid (e.g. typed the Nocobase
// USER id instead of the LAWYER id, or left blank while only the
// `lawyers` relation column looked populated in the grid view), this
// match silently fails even though the folder is nested in the right
// place and displays the right owner name in the Admin UI.
//
// This script fetches every direct child of the "My Documents" root
// folder (type: my_documents) and cross-checks each one's raw lawyerId
// against the lawyer whose name matches the folder's own name — the
// fastest way to spot a swapped/blank id without opening each record.
//
// Read-only — makes no writes. Safe to run repeatedly.
//
// How to run: paste this whole file into a temporary Nocobase JS block
// (Admin UI -> any page -> add a "JS block"), save. Run while logged in
// as an Admin. Delete the temporary block afterward.
// ============================================================
const { React, antd } = ctx;
const { useState, useEffect } = React;
const { Table, Tag, Typography, Spin, Alert } = antd;
const { Text, Title } = Typography;

const MY_DOCUMENTS_ROOT_FOLDER_TYPE = "my_documents";
const MY_DOCUMENT_STORAGE_TYPE = "personal";
// Mirrors Library.js's DASHBOARD_CONFIG.moduleScopes — fetchFoldersForInternalTemplates()
// silently drops any folder whose moduleScope isn't in this list, regardless
// of how correct its lawyerId/parentId are.
const ALLOWED_MODULE_SCOPES = [
  "internal_templates",
  "internal_template",
  "legal_reference",
  "legal_study",
  "personal",
  "knowledge",
];

const extractId = (val) =>
  typeof val === "object" && val !== null ? val.id : val;
const extractRelationId = (val) =>
  Array.isArray(val) ? extractId(val[0]) : extractId(val);

const normalizeName = (v) =>
  String(v || "")
    .trim()
    .toLowerCase();

function MyDocumentsFolderDiagnostic() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [rootMissing, setRootMissing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [lawyersRes, foldersRes] = await Promise.all([
          ctx.api.request({
            url: "lawyers:list",
            params: { pageSize: 1000, appends: ["users", "user"] },
          }),
          ctx.api.request({
            url: "folders:list",
            params: {
              pageSize: 1000,
              appends: ["lawyers"],
              filter: JSON.stringify({ isDeleted: { $ne: true } }),
            },
          }),
        ]);
        const lawyers = lawyersRes?.data?.data || [];
        const folders = foldersRes?.data?.data || [];

        const lawyerById = new Map(
          lawyers.map((lw) => [String(extractId(lw.id)), lw]),
        );
        const lawyerIdByName = new Map(
          lawyers.map((lw) => [normalizeName(lw.lawyerName), extractId(lw.id)]),
        );

        const rootFolder = folders.find(
          (f) => f.type === MY_DOCUMENTS_ROOT_FOLDER_TYPE,
        );
        if (!rootFolder) {
          setRootMissing(true);
          setLoading(false);
          return;
        }
        const rootFolderId = String(extractId(rootFolder.id));

        const personalFolders = folders.filter(
          (f) =>
            String(extractId(f.parentId) || "") === rootFolderId,
        );

        const data = personalFolders.map((f) => {
          const rawLawyerId = extractId(f.lawyerId);
          const relationLawyerId = extractRelationId(f.lawyers);
          const effectiveLawyerId = rawLawyerId || relationLawyerId || null;
          const effectiveLawyer = effectiveLawyerId
            ? lawyerById.get(String(effectiveLawyerId))
            : null;
          const expectedLawyerId =
            lawyerIdByName.get(normalizeName(f.name)) || null;
          const lawyerIdOk =
            !!effectiveLawyerId &&
            !!expectedLawyerId &&
            String(effectiveLawyerId) === String(expectedLawyerId);
          const scopeOk =
            f.storageType === MY_DOCUMENT_STORAGE_TYPE &&
            ALLOWED_MODULE_SCOPES.includes(f.moduleScope);
          return {
            key: String(extractId(f.id)),
            folderId: extractId(f.id),
            folderName: f.name || "—",
            rawLawyerId: rawLawyerId || null,
            relationLawyerId: relationLawyerId || null,
            resolvedLawyerName: effectiveLawyer?.lawyerName || null,
            expectedLawyerId,
            storageType: f.storageType || null,
            moduleScope: f.moduleScope || null,
            scopeOk,
            ok: lawyerIdOk && scopeOk,
          };
        });
        data.sort((a, b) => (a.ok === b.ok ? 0 : a.ok ? 1 : -1));
        setRows(data);
      } catch (e) {
        console.error("[diagnose-my-documents-folders] failed", e);
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spin tip="Đang tải..." />;
  if (error) return <Alert type="error" message={`Lỗi: ${error}`} />;
  if (rootMissing)
    return (
      <Alert
        type="error"
        message='Không tìm thấy folder gốc "My Documents" (type: my_documents)'
      />
    );

  const brokenCount = rows.filter((r) => !r.ok).length;

  return (
    <div style={{ padding: 12 }}>
      <Title level={5} style={{ marginBottom: 8 }}>
        Kiểm tra lawyerId trên folder cá nhân ({rows.length} folder,{" "}
        {brokenCount} lệch)
      </Title>
      <Table
        dataSource={rows}
        rowKey="key"
        pagination={false}
        size="small"
        columns={[
          { title: "Folder ID", dataIndex: "folderId", width: 90 },
          { title: "Folder Name", dataIndex: "folderName" },
          {
            title: "folder.lawyerId (scalar)",
            dataIndex: "rawLawyerId",
            render: (v) => v || <Text type="secondary">(trống)</Text>,
          },
          {
            title: "folder.lawyers (relation id)",
            dataIndex: "relationLawyerId",
            render: (v) => v || <Text type="secondary">(trống)</Text>,
          },
          {
            title: "Đang trỏ tới lawyer",
            dataIndex: "resolvedLawyerName",
            render: (v) => v || <Tag color="red">KHÔNG XÁC ĐỊNH</Tag>,
          },
          {
            title: "lawyerId đúng (theo tên folder)",
            dataIndex: "expectedLawyerId",
            render: (v) =>
              v || <Text type="secondary">(không tìm thấy lawyer trùng tên)</Text>,
          },
          {
            title: "storageType",
            dataIndex: "storageType",
            render: (v, r) =>
              v === "personal" ? (
                v
              ) : (
                <Tag color="red">{v || "(trống)"}</Tag>
              ),
          },
          {
            title: "moduleScope",
            dataIndex: "moduleScope",
            render: (v) =>
              v && ALLOWED_MODULE_SCOPES.includes(v) ? (
                v
              ) : (
                <Tag color="red">{v || "(trống)"}</Tag>
              ),
          },
          {
            title: "Trạng thái",
            width: 110,
            render: (_, r) =>
              r.ok ? (
                <Tag color="green">OK</Tag>
              ) : (
                <Tag color="red">LỆCH</Tag>
              ),
          },
        ]}
      />
    </div>
  );
}

ctx.render(<MyDocumentsFolderDiagnostic />);
