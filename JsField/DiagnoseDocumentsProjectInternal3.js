// Chẩn đoán vòng 3 — thêm "sort" (biến duy nhất chưa test ở vòng 2) và
// pageSize:100 y hệt bản gốc, chạy lặp vài lần để kiểm tra có phải lỗi
// thoáng qua (transient) do tải trang nặng hay không.
(async () => {
  const CASE_ID = 388063335350072;
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

  for (let i = 1; i <= 5; i++) {
    try {
      const res = await ctx.api.request({
        url: "documents:list",
        params: {
          pageSize: 100,
          sort: ["-createdAt"],
          filter: FILTER,
          fields: FULL_FIELDS,
          appends: FULL_APPENDS,
        },
      });
      console.log(`[lần ${i}] OK, số dòng:`, res?.data?.data?.length);
    } catch (e) {
      console.log(`[lần ${i}] LỖI:`, e?.message, JSON.stringify(e?.response?.data));
    }
  }
  console.log("Done.");
})();
