// ============================================================
// Library Scale Test — seed / measure / cleanup (JS Block)
//
// Đo thực tế xem fetchCustomerCasePermissionFolders (folders:list KHÔNG
// filter, kèm 4 append folderManager/folderManagers/folderMember/
// folderMembers — đã xác định là nút thắt cổ chai lớn nhất trong loadData
// của Library.js, xem 2026-09-18 perf investigation) chạy chậm thế nào khi
// bảng folders tăng lên ~1000-1500 dòng, thay vì suy luận từ baseline 431
// dòng hiện tại.
//
// Đi qua đúng API thật (ctx.api.request, giống hệt cách Library.js gọi),
// KHÔNG đụng DB trực tiếp — an toàn, chạy được ngay trong JS Block.
// Toàn bộ dòng test đều đặt tên "PERFTEST_folder_<n>" để nhận diện + xoá
// sạch sau khi đo xong. Không có gì tự chạy khi mở block — phải bấm nút.
// ============================================================

const { React } = ctx;
const { useState } = React;
const { Table, Tag, Typography, Space, Button, Modal, message, InputNumber } = ctx.antd;
const { Title, Text, Paragraph } = Typography;

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

// Chạy N promise-factory với giới hạn đồng thời — tránh dí 1000 request
// cùng lúc vào server dev, nhưng vẫn nhanh hơn nhiều so với tuần tự.
const runWithConcurrency = async (items, worker, concurrency = 20) => {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = new Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(async () => {
      while (cursor < items.length) {
        const idx = cursor++;
        try {
          results[idx] = await worker(items[idx], idx);
        } catch (e) {
          results[idx] = { error: e?.message || String(e) };
        }
      }
    });
  await Promise.all(runners);
  return results;
};

const PERFTEST_PREFIX = "PERFTEST_folder_";

const seedFolders = async (count, onProgress) => {
  const [customers, projects, lawyers] = await Promise.all([
    fetchAllList("customers:list", { pageSize: 100 }),
    fetchAllList("projects:list", { pageSize: 100 }),
    fetchAllList("lawyers:list", { pageSize: 100 }),
  ]);
  if (!customers.length || !projects.length) {
    throw new Error("Cần ít nhất 1 customer và 1 project trong hệ thống để seed dữ liệu thực tế.");
  }
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const now = new Date().toISOString();

  const indices = Array.from({ length: count }, (_, i) => i + 1);
  let done = 0;
  const created = await runWithConcurrency(
    indices,
    async (i) => {
      const res = await ctx.api.request({
        url: "folders:create",
        method: "POST",
        data: {
          name: `${PERFTEST_PREFIX}${i}`,
          type: "cases",
          moduleScope: "case_document",
          storageType: "cases",
          customerId: extractId(pick(customers)),
          projectId: extractId(pick(projects)),
          createdAt: now,
          updatedAt: now,
        },
      });
      done++;
      if (onProgress) onProgress(done, count);
      const id = extractId(res?.data?.data || res?.data);
      return { id };
    },
    20,
  );

  const folderIds = created.filter((r) => r && r.id).map((r) => r.id);

  // Proportional folderManagers (~0.2/folder) và folderMembers (~0.125/
  // folder) — khớp mật độ hiện có trong DB (87/431 ≈ 0.2, 54/431 ≈ 0.125)
  // để append cost mô phỏng đúng thực tế, không chỉ tăng số dòng folders.
  const managerTargets = folderIds.filter(() => Math.random() < 0.2);
  const memberTargets = folderIds.filter(() => Math.random() < 0.125);

  await runWithConcurrency(
    managerTargets,
    (folderId) =>
      ctx.api.request({
        url: "folderManagers:create",
        method: "POST",
        data: { folderId: Number(folderId), lawyerId: Number(extractId(pick(lawyers))), role: "manager" },
      }),
    20,
  );
  await runWithConcurrency(
    memberTargets,
    (folderId) =>
      ctx.api.request({
        url: "folderMembers:create",
        method: "POST",
        data: { folderId: Number(folderId), lawyerId: Number(extractId(pick(lawyers))), role: "viewer" },
      }),
    20,
  );

  return {
    foldersCreated: folderIds.length,
    managersCreated: managerTargets.length,
    membersCreated: memberTargets.length,
  };
};

const findPerfTestFolders = () =>
  fetchAllList("folders:list", {
    filter: JSON.stringify({ name: { $startsWith: PERFTEST_PREFIX } }),
  });

const cleanupFolders = async (onProgress) => {
  const folders = await findPerfTestFolders();
  const folderIds = folders.map((f) => extractId(f)).filter(Boolean);
  if (!folderIds.length) return { foldersDeleted: 0 };

  await ctx.api
    .request({
      url: "folderManagers:destroy",
      method: "POST",
      params: { filter: JSON.stringify({ folderId: { $in: folderIds } }) },
    })
    .catch(() => {});
  await ctx.api
    .request({
      url: "folderMembers:destroy",
      method: "POST",
      params: { filter: JSON.stringify({ folderId: { $in: folderIds } }) },
    })
    .catch(() => {});

  let done = 0;
  await runWithConcurrency(
    folderIds,
    async (id) => {
      await ctx.api.request({
        url: "folders:destroy",
        method: "POST",
        params: { filterByTk: id },
      });
      done++;
      if (onProgress) onProgress(done, folderIds.length);
    },
    20,
  );
  return { foldersDeleted: folderIds.length };
};

// Đúng nguyên văn query của fetchCustomerCasePermissionFolders trong
// Library.js (không filter, 4 append quan hệ) — mục đích là đo lại CHÍNH
// XÁC bottleneck đã xác định, không phải 1 query khác na ná.
//
// Đo thêm firstPageMs (2026-09-18, sau khi đổi Library.js sang progressive
// load) — đây mới là con số quyết định customerSpaceLoading tắt lúc nào
// (Customer gallery hiện được), khác với totalMs (quyết định
// customerCaseFoldersFullyLoaded — lúc nút Xoá/Đổi tên mới mở khoá). Query
// tổng vẫn tốn y như cũ (progressive không giảm tổng thời gian fetch, chỉ
// đổi lúc nào UI được phép dùng dữ liệu) — nên totalMs không đổi so với
// lần đo trước, cái cần so sánh là firstPageMs so với totalMs cũ.
const measureCustomerCasePermissionFoldersFetch = async () => {
  const t0 = Date.now();
  const pageTimes = [];
  let firstPageMs = null;
  let all = [];
  let page = 1;
  const pageSize = 200;
  while (true) {
    const pt0 = Date.now();
    const res = await ctx.api.request({
      url: "folders:list",
      params: {
        sort: ["createdAt"],
        appends: ["createdBy", "folderManager", "folderManagers", "folderMember", "folderMembers"],
        page,
        pageSize,
      },
    });
    const pt1 = Date.now();
    pageTimes.push({ page, ms: pt1 - pt0 });
    if (page === 1) firstPageMs = pt1 - t0;
    const data = res?.data?.data || [];
    all = all.concat(data);
    const meta = res?.data?.meta || {};
    if (!meta.count || all.length >= meta.count || data.length < pageSize) break;
    page++;
  }
  const t1 = Date.now();
  return { totalMs: t1 - t0, firstPageMs, totalRows: all.length, pageTimes };
};

const LibraryScaleTestBlock = () => {
  const [seedCount, setSeedCount] = useState(1000);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [seedProgress, setSeedProgress] = useState(null);

  const [measuring, setMeasuring] = useState(false);
  const [measureResult, setMeasureResult] = useState(null);

  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [cleanupProgress, setCleanupProgress] = useState(null);

  const [currentTotal, setCurrentTotal] = useState(null);

  const refreshTotal = async () => {
    const res = await ctx.api.request({ url: "folders:list", params: { pageSize: 1 } });
    setCurrentTotal(res?.data?.meta?.count ?? null);
  };

  const handleSeed = () => {
    Modal.confirm({
      title: `Chèn ${seedCount} folder test vào hệ thống thật?`,
      content:
        "Tạo qua đúng API thật (folders:create/folderManagers:create/folderMembers:create), tên đặt \"PERFTEST_folder_<n>\" để nhận diện. Có thể xoá sạch bằng nút Cleanup bên dưới sau khi đo xong. Không thể tự hoàn tác ngoài việc bấm Cleanup.",
      okText: "Chèn",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        setSeeding(true);
        setSeedResult(null);
        setSeedProgress(null);
        try {
          const result = await seedFolders(seedCount, (done, total) =>
            setSeedProgress({ done, total }),
          );
          setSeedResult(result);
          message.success(`Đã tạo ${result.foldersCreated} folder test.`);
          await refreshTotal();
        } catch (e) {
          message.error("Seed thất bại: " + (e?.message || String(e)));
        } finally {
          setSeeding(false);
        }
      },
    });
  };

  const handleMeasure = async () => {
    setMeasuring(true);
    setMeasureResult(null);
    try {
      const result = await measureCustomerCasePermissionFoldersFetch();
      setMeasureResult(result);
      console.log("[LibraryScaleTest] measure result:", result);
    } catch (e) {
      message.error("Đo thất bại: " + (e?.message || String(e)));
    } finally {
      setMeasuring(false);
    }
  };

  const handleCleanup = () => {
    Modal.confirm({
      title: "Xoá toàn bộ folder test (PERFTEST_folder_*)?",
      content: "Chỉ xoá đúng các folder/folderManagers/folderMembers đã tạo bởi công cụ này, không đụng dữ liệu khác.",
      okText: "Xoá",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: async () => {
        setCleaning(true);
        setCleanupResult(null);
        setCleanupProgress(null);
        try {
          const result = await cleanupFolders((done, total) =>
            setCleanupProgress({ done, total }),
          );
          setCleanupResult(result);
          message.success(`Đã xoá ${result.foldersDeleted} folder test.`);
          await refreshTotal();
        } catch (e) {
          message.error("Cleanup thất bại: " + (e?.message || String(e)));
        } finally {
          setCleaning(false);
        }
      },
    });
  };

  return React.createElement(
    "div",
    { style: { padding: 16 } },
    React.createElement(Title, { level: 4, style: { marginTop: 0 } }, "Library Scale Test — seed / measure / cleanup"),
    React.createElement(
      Paragraph,
      { type: "secondary" },
      "Đo tốc độ query folders:list (không filter, 4 append quan hệ — đúng query fetchCustomerCasePermissionFolders trong Library.js) ở quy mô lớn, để biết loadData sẽ chậm thế nào khi dữ liệu tăng.",
    ),
    React.createElement(
      Space,
      { style: { marginBottom: 16 } },
      React.createElement(Button, { onClick: refreshTotal }, "Xem tổng số folder hiện tại"),
      currentTotal !== null &&
        React.createElement(Text, null, `Tổng: ${currentTotal} folder`),
    ),

    React.createElement("div", { style: { marginBottom: 24, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 } },
      React.createElement(Title, { level: 5 }, "1. Seed dữ liệu test"),
      React.createElement(
        Space,
        null,
        React.createElement(Text, null, "Số folder:"),
        React.createElement(InputNumber, { min: 10, max: 5000, value: seedCount, onChange: setSeedCount }),
        React.createElement(Button, { type: "primary", danger: true, loading: seeding, onClick: handleSeed }, "Chèn"),
      ),
      seedProgress && React.createElement(Text, { type: "secondary" }, ` Đang tạo: ${seedProgress.done}/${seedProgress.total}`),
      seedResult &&
        React.createElement(Paragraph, { style: { marginTop: 8 } },
          `Đã tạo ${seedResult.foldersCreated} folder, ${seedResult.managersCreated} folderManagers, ${seedResult.membersCreated} folderMembers.`,
        ),
    ),

    React.createElement("div", { style: { marginBottom: 24, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 } },
      React.createElement(Title, { level: 5 }, "2. Đo tốc độ fetchCustomerCasePermissionFolders"),
      React.createElement(Button, { type: "primary", loading: measuring, onClick: handleMeasure }, "Đo ngay"),
      measureResult &&
        React.createElement(
          "div",
          { style: { marginTop: 12 } },
          React.createElement(
            Space,
            { direction: "vertical" },
            React.createElement(
              Text,
              null,
              `Trang 1 về (customerSpaceLoading tắt, gallery hiện được): `,
              React.createElement(Tag, { color: measureResult.firstPageMs > 2000 ? "red" : measureResult.firstPageMs > 800 ? "orange" : "green" },
                `${measureResult.firstPageMs} ms`),
            ),
            React.createElement(
              Text,
              null,
              `Toàn bộ về (customerCaseFoldersFullyLoaded tắt, mở khoá Xoá/Đổi tên): `,
              React.createElement(Tag, { color: measureResult.totalMs > 3000 ? "red" : measureResult.totalMs > 1000 ? "orange" : "green" },
                `${measureResult.totalMs} ms`),
              ` cho ${measureResult.totalRows} dòng, ${measureResult.pageTimes.length} trang.`,
            ),
          ),
          React.createElement(Table, {
            style: { marginTop: 8 },
            size: "small",
            pagination: false,
            dataSource: measureResult.pageTimes,
            rowKey: "page",
            columns: [
              { title: "Trang", dataIndex: "page" },
              { title: "Thời gian (ms)", dataIndex: "ms" },
            ],
          }),
        ),
    ),

    React.createElement("div", { style: { padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 } },
      React.createElement(Title, { level: 5 }, "3. Dọn dẹp"),
      React.createElement(Button, { danger: true, loading: cleaning, onClick: handleCleanup }, "Xoá toàn bộ folder test"),
      cleanupProgress && React.createElement(Text, { type: "secondary" }, ` Đang xoá: ${cleanupProgress.done}/${cleanupProgress.total}`),
      cleanupResult &&
        React.createElement(Paragraph, { style: { marginTop: 8 } }, `Đã xoá ${cleanupResult.foldersDeleted} folder test.`),
    ),
  );
};

ctx.render(React.createElement(LibraryScaleTestBlock, null));
