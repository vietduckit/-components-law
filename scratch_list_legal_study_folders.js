  // 🌟 SCRATCH DIAGNOSTIC — dán tạm vào 1 JS Field/Action block bất kỳ trong
  // Nocobase (block nào có ctx.api.request là chạy được, không cần ctx.record)
  // để liệt kê nhanh tất cả folder tên "Legal Study" hiện có, kèm case liên quan.
  // Xoá block/snippet này sau khi xem xong — không phải code sản phẩm.

  const { React } = ctx;
  const { useState, useEffect } = React;
  const { Spin, Table, Typography } = ctx.antd;
  const { Text } = Typography;

  const extractId = (v) => {
    if (v === null || v === undefined || v === "") return null;
    if (Array.isArray(v)) return v.length ? extractId(v[0]) : null;
    if (typeof v === "object") return v.id ? parseInt(v.id, 10) : null;
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? null : n;
  };

  async function fetchAllPages(url, params) {
    let all = [];
    let page = 1;
    const pageSize = params.pageSize || 500;
    while (true) {
      const res = await ctx.api.request({ url, params: { ...params, page, pageSize } });
      const rows = res?.data?.data || [];
      all = all.concat(rows);
      const count = res?.data?.meta?.count;
      if (!count || all.length >= count || rows.length < pageSize) break;
      page += 1;
    }
    return all;
  }

  const App = () => {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
      (async () => {
        try {
          // Lấy toàn bộ folder tên khớp "Legal Study" (không phân biệt hoa/thường,
          // trim khoảng trắng thừa) — không lọc theo moduleScope để không bỏ sót
          // trường hợp đã bị đổi scope trước đó.
          const folders = await fetchAllPages("folders:list", {
            pageSize: 1000,
            filter: JSON.stringify({ isDeleted: { $ne: true } }),
          });
          const legalStudyFolders = folders.filter(
            (f) => String(f?.name || "").trim().toLowerCase() === "legal study",
          );

          const projectIds = Array.from(
            new Set(legalStudyFolders.map((f) => extractId(f.projectId)).filter(Boolean)),
          );

          let projectMap = {};
          if (projectIds.length) {
            const projects = await fetchAllPages("projects:list", {
              pageSize: 1000,
              filter: JSON.stringify({ id: { $in: projectIds } }),
              appends: ["customer"],
            });
            projects.forEach((p) => {
              projectMap[extractId(p.id)] = p;
            });
          }

          // Đếm nhanh số document con trực tiếp trong mỗi folder Legal Study
          const withCounts = await Promise.all(
            legalStudyFolders.map(async (f) => {
              let docCount = 0;
              try {
                const docRes = await ctx.api.request({
                  url: "documents:list",
                  params: {
                    pageSize: 1,
                    filter: JSON.stringify({
                      folderId: { $eq: extractId(f.id) },
                      isDeleted: { $ne: true },
                    }),
                  },
                });
                docCount = docRes?.data?.meta?.count ?? (docRes?.data?.data || []).length;
              } catch {}
              const project = projectMap[extractId(f.projectId)];
              return {
                key: f.id,
                folderId: f.id,
                projectId: extractId(f.projectId),
                caseCode: project?.caseCode || "",
                projectName: project?.projectName || "",
                customerName:
                  project?.customer?.shortName || project?.customer?.customerName || "",
                moduleScope: f.moduleScope || "",
                storageType: f.storageType || "",
                docCount,
                createdAt: f.createdAt,
              };
            }),
          );

          withCounts.sort((a, b) => (a.caseCode || "").localeCompare(b.caseCode || ""));
          setRows(withCounts);
        } catch (e) {
          console.error(e);
          setError(e?.message || String(e));
        } finally {
          setLoading(false);
        }
      })();
    }, []);

    if (loading) return React.createElement(Spin, { tip: "Đang truy vấn..." });
    if (error) return React.createElement(Text, { type: "danger" }, error);

    console.log("[LegalStudyFolders] total =", rows.length, rows);

    return React.createElement(
      "div",
      { style: { padding: 16 } },
      React.createElement(
        Text,
        { strong: true },
        `Tổng số folder "Legal Study": ${rows.length} (chi tiết đã in ra console)`,
      ),
      React.createElement(Table, {
        style: { marginTop: 12 },
        size: "small",
        pagination: false,
        dataSource: rows,
        columns: [
          { title: "Folder ID", dataIndex: "folderId" },
          { title: "Case Code", dataIndex: "caseCode" },
          { title: "Case Name", dataIndex: "projectName" },
          { title: "Customer", dataIndex: "customerName" },
          { title: "Project ID", dataIndex: "projectId" },
          { title: "moduleScope", dataIndex: "moduleScope" },
          { title: "storageType", dataIndex: "storageType" },
          { title: "# Documents", dataIndex: "docCount" },
          { title: "Created", dataIndex: "createdAt" },
        ],
      }),
    );
  };

  ctx.render(React.createElement(App));
