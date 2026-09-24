// Chẩn đoán 2 call còn lại chưa test: tasks:list (lọc theo projectId) và
// notes:list (lọc theo collectionName="Task") — dùng cho tính năng merge
// comment Task vào Case Notes.
(async () => {
  const CASE_ID = 388063335350072;

  const tryCall = async (label, url, params) => {
    try {
      const res = await ctx.api.request({ url, params: { pageSize: 5, ...params } });
      console.log(`[${label}] OK, số dòng:`, res?.data?.data?.length, JSON.stringify(res?.data?.data?.slice(0, 2)));
      return res?.data?.data || [];
    } catch (e) {
      console.log(`[${label}] LỖI:`, e?.message, JSON.stringify(e?.response?.data));
      return [];
    }
  };

  // [1] tasks:list lọc theo projectId — y hệt reload()
  const tasks = await tryCall("1-tasks-list", "tasks:list", {
    pageSize: 500,
    filter: JSON.stringify({ projectId: { $eq: CASE_ID } }),
    fields: "id,title",
  });

  const taskIds = tasks.map((t) => t.id).filter(Boolean);
  console.log("[1b] taskIds tìm được:", JSON.stringify(taskIds));

  // [2] notes:list lọc theo collectionName="Task" + recordId IN taskIds — y hệt reload()
  if (taskIds.length) {
    await tryCall("2-notes-task-scope", "notes:list", {
      pageSize: 200,
      sort: ["-createdAt"],
      filter: JSON.stringify({
        $and: [
          { collectionName: { $eq: "Task" } },
          { recordId: { $in: taskIds } },
          { isDeleted: { $ne: true } },
        ],
      }),
      fields: "id,title,body,batchId,linkedUrl,collectionName,recordId,createdAt,updatedAt,createdById,replyText,parentId,isDeleted,assignedLawyerId",
      appends: ["createdBy", "updatedBy", "assignees", "parent"],
    });
  } else {
    console.log("[2] Bỏ qua vì không có taskIds (case này không có task nào) — thử với recordId giả để kiểm tra field vẫn hợp lệ:");
    await tryCall("2b-notes-task-scope-fake-id", "notes:list", {
      filter: JSON.stringify({
        $and: [
          { collectionName: { $eq: "Task" } },
          { recordId: { $in: [1, 2, 3] } },
        ],
      }),
      fields: "id,title,body,collectionName,recordId",
      appends: ["createdBy", "updatedBy", "assignees", "parent"],
    });
  }

  console.log("Done.");
})();
