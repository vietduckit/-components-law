// Chẩn đoán call ĐẦU TIÊN và CƠ BẢN NHẤT trong reload() — notes:list lấy
// note của chính Case này (collectionName="Project Internal" + recordId=case).
// Đây là call duy nhất trong reload() CHƯA được test riêng ở 3 vòng trước.
(async () => {
  const CASE_ID = 388063335350072;

  const tryCall = async (label, params) => {
    try {
      const res = await ctx.api.request({ url: "notes:list", params: { pageSize: 5, ...params } });
      console.log(`[${label}] OK, số dòng:`, res?.data?.data?.length, JSON.stringify(res?.data?.data));
    } catch (e) {
      console.log(`[${label}] LỖI:`, e?.message, JSON.stringify(e?.response?.data));
    }
  };

  // [1] Y hệt nguyên văn call đầu tiên trong reload()
  await tryCall("1-full-exact", {
    pageSize: 100,
    sort: ["-createdAt"],
    filter: JSON.stringify({
      $and: [
        { collectionName: { $eq: "Project Internal" } },
        { recordId: { $eq: CASE_ID } },
        { isDeleted: { $ne: true } },
      ],
    }),
    fields: "id,title,body,batchId,linkedUrl,collectionName,recordId,createdAt,updatedAt,createdById,replyText,parentId,isDeleted,assignedLawyerId",
    appends: ["createdBy", "updatedBy", "assignees", "parent"],
  });

  // [2] Chỉ appends, không fields
  await tryCall("2-appends-only", {
    filter: JSON.stringify({ collectionName: { $eq: "Project Internal" }, recordId: { $eq: CASE_ID } }),
    appends: ["createdBy", "updatedBy", "assignees", "parent"],
  });

  // [3] Chỉ append "assignees"
  await tryCall("3-only-assignees-append", {
    filter: JSON.stringify({ collectionName: { $eq: "Project Internal" }, recordId: { $eq: CASE_ID } }),
    appends: ["assignees"],
  });

  // [4] Chỉ append "parent"
  await tryCall("4-only-parent-append", {
    filter: JSON.stringify({ collectionName: { $eq: "Project Internal" }, recordId: { $eq: CASE_ID } }),
    appends: ["parent"],
  });

  console.log("Done.");
})();
