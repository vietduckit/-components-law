// ============================================================
// ONE-TIME DIAGNOSTIC JS BLOCK — NOT a reusable field/action block.
//
// Follow-up to DiagnoseProjectInternalDocuments.js: that script confirmed
// documents can have a NON-NULL folderId that still points to the wrong
// folder record (name looks identical in the Admin grid's relation column,
// but the underlying id differs). This script lists EVERY folder tied to
// one projectInternalId side by side with EVERY document tied to it, so
// duplicate root folders (same name, different id) and orphaned folderId
// values become visible at a glance instead of requiring manual clicking
// through each relation link.
//
// Read-only — makes no writes. Safe to run repeatedly.
//
// EDIT the TARGET_PROJECT_INTERNAL_ID constant below before running —
// paste in the exact numeric id shown in the Admin grid's "Project
// Internal" column for the affected documents (open that link once to
// read its id from the URL/filterByTk, or check the Internal Work item's
// own record).
//
// How to run: paste this whole file into a temporary Nocobase JS block
// (Admin UI -> any page -> add a "JS block"), edit the constant below,
// save. Run while logged in as the SAME user who sees "This folder is
// empty" in ProjectDocument.js (permission filtering can differ from
// Admin).
// ============================================================
const TARGET_PROJECT_INTERNAL_ID = "382210844262400"; // <-- EDIT THIS

const { React, antd } = ctx;
const { useState, useEffect } = React;
const { Table, Tag, Typography, Spin, Alert, Empty } = antd;
const { Text, Title } = Typography;

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

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN");
};

function ProjectInternalFolderDiagnostic() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [folderRows, docRows] = await Promise.all([
          fetchAllList("folders:list", {
            sort: ["createdAt"],
            filter: JSON.stringify({
              projectInternalId: { $eq: TARGET_PROJECT_INTERNAL_ID },
            }),
            appends: ["createdBy"],
          }),
          fetchAllList("documents:list", {
            sort: ["createdAt"],
            filter: JSON.stringify({
              projectInternalId: { $eq: TARGET_PROJECT_INTERNAL_ID },
            }),
            fields:
              "id,title,folderId,taskId,isDeleted,createdAt,moduleScope,storageType",
            appends: ["createdBy"],
          }),
        ]);
        setFolders(folderRows);
        setDocuments(docRows);
      } catch (e) {
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return <Spin tip="Đang tải folder + document cho project này..." />;
  if (error) return <Alert type="error" message={`Lỗi: ${error}`} />;

  const folderById = new Map(folders.map((f) => [String(extractId(f)), f]));
  const rootFolders = folders.filter((f) => !extractId(f.parentId));
  const oldestRoot = rootFolders[0] || null; // sorted by createdAt asc above
  const oldestRootId = oldestRoot ? String(extractId(oldestRoot)) : null;

  // Group root folders by name to spot duplicates.
  const rootByName = new Map();
  rootFolders.forEach((f) => {
    const key = String(f.name || "").trim();
    if (!rootByName.has(key)) rootByName.set(key, []);
    rootByName.get(key).push(f);
  });
  const duplicateRootNames = Array.from(rootByName.entries()).filter(
    ([, rows]) => rows.length > 1,
  );

  const folderColumns = [
    { title: "id", dataIndex: "id", key: "id", width: 160 },
    { title: "name", dataIndex: "name", key: "name" },
    {
      title: "parentId",
      key: "parentId",
      width: 140,
      render: (_, f) =>
        extractId(f.parentId) ? (
          String(extractId(f.parentId))
        ) : (
          <Tag color={String(extractId(f)) === oldestRootId ? "green" : "orange"}>
            ROOT{String(extractId(f)) === oldestRootId ? " (oldest)" : ""}
          </Tag>
        ),
    },
    {
      title: "createdAt",
      key: "createdAt",
      width: 170,
      render: (_, f) => fmtDate(f.createdAt),
    },
    {
      title: "createdBy",
      key: "createdBy",
      width: 160,
      render: (_, f) =>
        f.createdBy?.nickname || f.createdBy?.username || f.createdById || "—",
    },
  ];

  const documentColumns = [
    { title: "id", dataIndex: "id", key: "id", width: 160 },
    { title: "title", dataIndex: "title", key: "title" },
    {
      title: "folderId → folder",
      key: "folderResolved",
      render: (_, d) => {
        const fid = extractId(d.folderId);
        if (!fid) return <Tag color="red">TRỐNG (null)</Tag>;
        const folder = folderById.get(String(fid));
        if (!folder)
          return (
            <Tag color="red">#{fid} — KHÔNG tìm thấy folder này trong project</Tag>
          );
        const isOldestRoot = String(fid) === oldestRootId;
        return (
          <span>
            #{fid} "{folder.name}"{" "}
            {isOldestRoot ? (
              <Tag color="green">= root cũ nhất</Tag>
            ) : !extractId(folder.parentId) ? (
              <Tag color="orange">= root KHÁC (trùng tên, khác id)</Tag>
            ) : (
              <Tag color="blue">= folder con</Tag>
            )}
          </span>
        );
      },
    },
    {
      title: "taskId",
      dataIndex: "taskId",
      key: "taskId",
      width: 140,
      render: (v) => v || "—",
    },
    {
      title: "isDeleted",
      dataIndex: "isDeleted",
      key: "isDeleted",
      width: 90,
      render: (v) => (v ? <Tag color="red">deleted</Tag> : "—"),
    },
    {
      title: "createdAt",
      key: "createdAt",
      width: 170,
      render: (_, d) => fmtDate(d.createdAt),
    },
  ];

  return (
    <div style={{ padding: 12 }}>
      <Title level={5} style={{ marginBottom: 4 }}>
        Chẩn đoán Folder ↔ Document cho projectInternalId ={" "}
        {TARGET_PROJECT_INTERNAL_ID}
      </Title>
      <Text type="secondary">
        {folders.length} folder · {documents.length} document
      </Text>

      <div style={{ marginTop: 16, marginBottom: 8 }}>
        {rootFolders.length === 0 && (
          <Alert
            type="error"
            showIcon
            message="Không có folder gốc (parentId null) nào cho project này."
          />
        )}
        {rootFolders.length === 1 && (
          <Alert
            type="success"
            showIcon
            message={`Chỉ có 1 folder gốc (#${oldestRootId} "${oldestRoot.name}") — không có trùng lặp.`}
          />
        )}
        {rootFolders.length > 1 && (
          <Alert
            type="warning"
            showIcon
            message={`Có ${rootFolders.length} folder gốc cho cùng 1 project (đáng lẽ chỉ nên có 1).`}
            description={
              duplicateRootNames.length > 0
                ? `Trùng tên: ${duplicateRootNames
                    .map(
                      ([name, rows]) =>
                        `"${name}" xuất hiện ${rows.length} lần (id: ${rows
                          .map((r) => extractId(r))
                          .join(", ")})`,
                    )
                    .join(" | ")}`
                : "Tên khác nhau nhưng vẫn là nhiều folder gốc — kiểm tra thủ công."
            }
          />
        )}
      </div>

      <Title level={5} style={{ marginTop: 20 }}>
        Folders ({folders.length})
      </Title>
      {folders.length === 0 ? (
        <Empty description="Không có folder nào" />
      ) : (
        <Table
          size="small"
          rowKey={(f) => extractId(f)}
          columns={folderColumns}
          dataSource={folders}
          pagination={false}
        />
      )}

      <Title level={5} style={{ marginTop: 20 }}>
        Documents ({documents.length})
      </Title>
      {documents.length === 0 ? (
        <Empty description="Không có document nào" />
      ) : (
        <Table
          size="small"
          rowKey={(d) => extractId(d)}
          columns={documentColumns}
          dataSource={documents}
          pagination={false}
        />
      )}
    </div>
  );
}

ctx.render(<ProjectInternalFolderDiagnostic />);
