// Chẩn đoán lỗi "Invalid SQL column or table reference" khi ProjectNote.js
// gọi documents:list filter theo collectionName + projectInternalId.
// Dán vào 1 JS Block tạm trong màn hình Case đang lỗi (tab "Notes") rồi chạy.

(async () => {
  const record = ctx.record;
  console.log("[1] ctx.record raw:", JSON.stringify(record));
  console.log("[1] ctx.record.id type:", typeof record?.id, "value:", record?.id);

  // [2] Xem field thật trên collection "documents" liên quan tới project/case
  try {
    const res = await ctx.api.request({ url: "collections/documents/fields:list", params: { paginate: false } });
    const fields = res?.data?.data || [];
    const relevant = fields.filter((f) =>
      /project|case|internal/i.test(f.name || "") || /project|case|internal/i.test(f.type || ""),
    );
    console.log("[2] documents fields liên quan project/case/internal:", JSON.stringify(relevant, null, 2));
  } catch (e) {
    console.log("[2] Lỗi lấy fields:list documents:", e?.message, e?.response?.data);
  }

  // [3] Xem field "id" thật trên collection "projects" (kiểu dữ liệu)
  try {
    const res = await ctx.api.request({ url: "collections/projects/fields:list", params: { paginate: false, filter: { name: "id" } } });
    console.log("[3] projects.id field def:", JSON.stringify(res?.data?.data, null, 2));
  } catch (e) {
    console.log("[3] Lỗi lấy fields:list projects:", e?.message, e?.response?.data);
  }

  // [4] Thử lại documents:list nhưng KHÔNG có filter projectInternalId (chỉ collectionName)
  try {
    const res = await ctx.api.request({
      url: "documents:list",
      params: {
        pageSize: 5,
        filter: JSON.stringify({ collectionName: { $eq: "Project Internal" } }),
        fields: "id,title,projectInternalId,collectionName",
      },
    });
    console.log("[4] documents:list (không filter projectInternalId) OK, số dòng:", res?.data?.data?.length);
  } catch (e) {
    console.log("[4] documents:list (không filter projectInternalId) LỖI:", e?.message, JSON.stringify(e?.response?.data));
  }

  // [5] Thử lại CHÍNH XÁC filter gốc (collectionName + projectInternalId) để bắt lỗi
  try {
    const res = await ctx.api.request({
      url: "documents:list",
      params: {
        pageSize: 5,
        filter: JSON.stringify({
          $and: [
            { collectionName: { $eq: "Project Internal" } },
            { projectInternalId: { $eq: parseInt(record?.id) } },
          ],
        }),
        fields: "id,title,projectInternalId,collectionName",
      },
    });
    console.log("[5] documents:list (filter gốc) OK, số dòng:", res?.data?.data?.length);
  } catch (e) {
    console.log("[5] documents:list (filter gốc) LỖI:", e?.message, JSON.stringify(e?.response?.data));
  }

  console.log("Done.");
})();
