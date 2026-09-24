// Chẩn đoán call activity_log:list mới thêm cho tính năng "Diff lịch sử
// chỉnh sửa" trong ProjectNote.js — nghi ngờ đây mới là thủ phạm thật sự
// gây toast "Invalid SQL column or table reference" (không phải documents:list).
(async () => {
  // [1] Field thật trên activity_log
  try {
    const res = await ctx.api.request({ url: "collections/activity_log/fields:list", params: { paginate: false } });
    console.log("[1] Field names trên activity_log:", JSON.stringify((res?.data?.data || []).map((f) => f.name)));
  } catch (e) {
    console.log("[1] Lỗi lấy fields:list activity_log:", e?.message, JSON.stringify(e?.response?.data));
  }

  const tryCall = async (label, params) => {
    try {
      const res = await ctx.api.request({ url: "activity_log:list", params: { pageSize: 5, ...params } });
      console.log(`[${label}] OK, số dòng:`, res?.data?.data?.length);
    } catch (e) {
      console.log(`[${label}] LỖI:`, e?.message, JSON.stringify(e?.response?.data));
    }
  };

  // [2] Y hệt query mới thêm trong reload()
  await tryCall("2-full-exact", {
    sort: ["createdAt"],
    filter: JSON.stringify({
      $and: [
        { collectionName: { $in: ["Note", "note", "notes"] } },
        { recordId: { $in: [1, 2, 3] } },
        { fieldName: { $eq: "body" } },
      ],
    }),
    fields: "id,recordId,action,fieldName,oldValue,newValue,changedByName,changedAt,createdAt",
  });

  // [3] Chỉ filter collectionName $in (tách riêng)
  await tryCall("3-only-collectionName-in", {
    filter: JSON.stringify({ collectionName: { $in: ["Note", "note", "notes"] } }),
    fields: "id,recordId",
  });

  // [4] Chỉ filter recordId $in
  await tryCall("4-only-recordId-in", {
    filter: JSON.stringify({ recordId: { $in: [1, 2, 3] } }),
    fields: "id,recordId",
  });

  // [5] Chỉ filter fieldName eq "body"
  await tryCall("5-only-fieldName-eq", {
    filter: JSON.stringify({ fieldName: { $eq: "body" } }),
    fields: "id,recordId",
  });

  // [6] Không filter gì, chỉ lấy fields đầy đủ (kiểm tra field list có field lạ không)
  await tryCall("6-no-filter-full-fields", {
    fields: "id,recordId,action,fieldName,oldValue,newValue,changedByName,changedAt,createdAt",
  });

  console.log("Done.");
})();
