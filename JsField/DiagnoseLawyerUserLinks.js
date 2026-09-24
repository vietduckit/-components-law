// ============================================================
// ONE-TIME DIAGNOSTIC JS BLOCK — NOT a reusable field/action block.
//
// Renders a table listing every `lawyers` record alongside the `users`
// record its userId/users/user relation currently resolves to. Written to
// track down why Library.js's "My Documents" space couldn't find a
// lawyer's personal folder (see the 2026-08-21 discussion) — the folder
// itself was correctly tagged with lawyerId + parentId, but
// Library.js's loadData() first has to map "the Nocobase user account
// currently logged in" -> "which lawyers record represents them" via
// lawyers.userId (or lawyers.createdById as a fallback). If that link
// points at the wrong user record (e.g. a duplicate same-name user
// account), currentLawyerId resolves to null and the folder lookup fails
// even though the folder itself is fine.
//
// Read-only — makes no writes. Safe to run repeatedly.
//
// How to run: paste this whole file into a temporary Nocobase JS block
// (Admin UI -> any page -> add a "JS block"), save. Run while logged in
// as an Admin so every lawyer's link is visible (RBAC won't hide rows).
// Delete the temporary block afterward — this file is not meant to stay
// wired into any page.
// ============================================================
const { React, antd } = ctx;
const { useState, useEffect } = React;
const { Table, Tag, Typography, Spin, Alert } = antd;
const { Text, Title } = Typography;

const extractId = (val) =>
  typeof val === "object" && val !== null ? val.id : val;
const extractRelationId = (val) =>
  Array.isArray(val) ? extractId(val[0]) : extractId(val);

function LawyerUserLinkDiagnostic() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [lawyersRes, usersRes] = await Promise.all([
          ctx.api.request({
            url: "lawyers:list",
            params: { pageSize: 1000, appends: ["users", "user"] },
          }),
          ctx.api.request({ url: "users:list", params: { pageSize: 1000 } }),
        ]);
        const lawyers = lawyersRes?.data?.data || [];
        const users = usersRes?.data?.data || [];
        const userById = new Map(
          users.map((u) => [String(extractId(u)), u]),
        );

        const data = lawyers.map((lw) => {
          const linkedUserId =
            extractId(lw.userId) ||
            extractRelationId(lw.users) ||
            extractRelationId(lw.user);
          const linkedUser = linkedUserId
            ? userById.get(String(linkedUserId))
            : null;
          return {
            key: String(extractId(lw.id)),
            lawyerId: extractId(lw.id),
            lawyerName: lw.lawyerName || "—",
            linkedUserId: linkedUserId || null,
            linkedUserEmail: linkedUser?.email || null,
            linkedUserNickname:
              linkedUser?.nickname || linkedUser?.username || null,
            ok: !!linkedUser,
          };
        });
        data.sort((a, b) => (a.ok === b.ok ? 0 : a.ok ? 1 : -1));
        setRows(data);
      } catch (e) {
        console.error("[diagnose-lawyer-user-links] failed", e);
        setError(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spin tip="Đang tải..." />;
  if (error) return <Alert type="error" message={`Lỗi: ${error}`} />;

  const brokenCount = rows.filter((r) => !r.ok).length;

  return (
    <div style={{ padding: 12 }}>
      <Title level={5} style={{ marginBottom: 8 }}>
        Kiểm tra liên kết Lawyer ↔ User ({rows.length} lawyer, {brokenCount}{" "}
        lỗi liên kết)
      </Title>
      <Table
        dataSource={rows}
        rowKey="key"
        pagination={false}
        size="small"
        columns={[
          { title: "Lawyer ID", dataIndex: "lawyerId", width: 90 },
          { title: "Lawyer Name", dataIndex: "lawyerName" },
          {
            title: "Linked User ID",
            dataIndex: "linkedUserId",
            render: (v) =>
              v || <Text type="secondary">(trống)</Text>,
          },
          {
            title: "Linked User Email",
            dataIndex: "linkedUserEmail",
            render: (v) =>
              v || <Tag color="red">KHÔNG TÌM THẤY USER</Tag>,
          },
          {
            title: "Linked User Nickname",
            dataIndex: "linkedUserNickname",
            render: (v) => v || <Text type="secondary">—</Text>,
          },
          {
            title: "Trạng thái",
            width: 130,
            render: (_, r) =>
              r.ok ? (
                <Tag color="green">OK</Tag>
              ) : (
                <Tag color="red">LỖI LIÊN KẾT</Tag>
              ),
          },
        ]}
      />
    </div>
  );
}

ctx.render(<LawyerUserLinkDiagnostic />);
