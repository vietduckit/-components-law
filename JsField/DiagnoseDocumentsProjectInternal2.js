// Chẩn đoán vòng 2 — tái hiện đúng nguyên văn query đang lỗi trong
// ProjectNote.js, rồi tách nhỏ dần để tìm đúng field/append gây lỗi.
// Dán vào 1 JS Block tạm rồi chạy (không cần ctx.record, đã hardcode id).

(async () => {
  const CASE_ID = 388063335350072; // id case đang lỗi, lấy từ log vòng 1

  // [1] Toàn bộ field thật trên "documents" (không lọc) — kiểm tra "name" có tồn tại không
  try {
    const res = await ctx.api.request({ url: "collections/documents/fields:list", params: { paginate: false } });
    const fields = (res?.data?.data || []).map((f) => f.name);
    console.log("[1] Toàn bộ field names trên documents:", JSON.stringify(fields));
    console.log("[1] Có field 'name' không:", fields.includes("name"));
  } catch (e) {
    console.log("[1] Lỗi:", e?.message);
  }

  const FULL_FIELDS =
    "id,name,title,documentCode,documentType,batchId,collectionName,projectInternalId,googleDriveUrl,note,description,openingDate,signedAt,effectiveAt,senderName,recipientName,language,docFormat,folderId,fileAttachment,createdAt,updatedAt,createdById,isDeleted";
  const FULL_APPENDS = ["fileAttachment", "createdBy", "updatedBy"];
  const FILTER = JSON.stringify({
    $and: [
      { collectionName: { $eq: "Project Internal" } },
      { projectInternalId: { $eq: CASE_ID } },
      { isDeleted: { $ne: true } },
    ],
  });

  const tryCall = async (label, params) => {
    try {
      const res = await ctx.api.request({ url: "documents:list", params: { pageSize: 5, ...params } });
      console.log(`[${label}] OK, số dòng:`, res?.data?.data?.length);
      return true;
    } catch (e) {
      console.log(`[${label}] LỖI:`, e?.message, JSON.stringify(e?.response?.data));
      return false;
    }
  };

  // [2] Y hệt nguyên văn query đang lỗi trong reload()
  await tryCall("2-full-exact", { filter: FILTER, fields: FULL_FIELDS, appends: FULL_APPENDS });

  // [3] Full fields, KHÔNG có appends
  await tryCall("3-fields-no-appends", { filter: FILTER, fields: FULL_FIELDS });

  // [4] Không có fields (lấy hết cột mặc định), có appends
  await tryCall("4-no-fields-with-appends", { filter: FILTER, appends: FULL_APPENDS });

  // [5] Chỉ field "name" một mình (kiểm tra riêng "name" có phải thủ phạm)
  await tryCall("5-only-name-field", { filter: FILTER, fields: "id,name" });

  // [6] Chỉ append "fileAttachment" một mình
  await tryCall("6-only-fileAttachment-append", { filter: FILTER, fields: "id,title", appends: ["fileAttachment"] });

  // [7] Chỉ append "createdBy" một mình
  await tryCall("7-only-createdBy-append", { filter: FILTER, fields: "id,title", appends: ["createdBy"] });

  // [8] Chỉ append "updatedBy" một mình
  await tryCall("8-only-updatedBy-append", { filter: FILTER, fields: "id,title", appends: ["updatedBy"] });

  console.log("Done.");
})();
