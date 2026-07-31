# Library.js — Standalone (Case-less) Legal Study Folders — Design Spec

## Bối cảnh

Hiện tại "Legal Study" trong `All Module/Document/Library.js` **không phải** collection/record riêng — nó chỉ là 1 folder mẫu nằm cứng bên trong cây folder của **đúng 1 Case**, nhận diện qua `folder.folderTemplateKey === "legal_study"` (do `CaseCreateForm.js` tự động gán khi tạo Case, kèm `projectId`/`customerId` của Case đó). Gallery "Legal Study" (`legalStudyEntities`, dòng ~5642) là danh sách phẳng quét qua `customerCaseFolders` (fetch không filter gì — `fetchCustomerCasePermissionFolders()`, dòng ~4680 khu vực fetch), lọc ra những folder có `folderTemplateKey === "legal_study"`, rồi bắt buộc resolve được `project`/`customer` của nó mới hiển thị (dòng ~5655-5658: `if (!projectId) return;`).

Nghiệp vụ mới: người dùng muốn tạo tài liệu/nghiên cứu pháp lý **không gắn với Case cụ thể nào** (case-less), nhưng vẫn muốn nó xuất hiện trong đúng danh mục "Legal Study" cùng chỗ với các Legal Study đã gắn Case. Sau khi thảo luận, hướng đã chọn: **vẫn dùng `folderTemplateKey = "legal_study"`** cho các folder độc lập này, chỉ khác là không gán `projectId`/`customerId`/`caseId` — không tạo collection/field mới.

## Mục tiêu

1. Cho phép tạo 1 **folder gốc độc lập** (không thuộc Case nào) với `folderTemplateKey: "legal_study"`, hiển thị chung trong gallery "Legal Study" cùng các Case đã có Legal Study.
2. Duyệt folder/document bên trong folder độc lập đó (tạo folder con, upload file) hoạt động bình thường như mọi không gian khác.
3. Sửa đúng 1 chỗ xung đột có thật: **không** để folder độc lập bị khoá đổi tên bởi cơ chế đang khoá cứng 5 folder mẫu hệ thống (cùng dùng `folderTemplateKey`).

## Ngoài phạm vi (non-goals)

- Không hỗ trợ "gắn Case sau" cho 1 folder Legal Study độc lập đã tạo, hay "gỡ Case" khỏi 1 Legal Study đã gắn Case — mỗi folder cố định 1 trong 2 trạng thái tại thời điểm tạo.
- Không đổi hành vi Legal Study **đã gắn Case** hiện có (permission, breadcrumb, rename-lock của 5 folder mẫu hệ thống thật) — chỉ mở rộng thêm nhánh case-less song song.
- Không đổi Case Study, Customer, Legal Reference hay bất kỳ không gian nào khác.
- Không cho tạo folder độc lập ở đâu khác ngoài đúng 1 điểm vào mới: nút tại gallery gốc Legal Study.

## Phần 1 — Gỡ xung đột khoá rename

**Vấn đề:** `isRenameLockedFolder` (dòng ~132-137) hiện khoá đổi tên bất kỳ folder nào có `folderTemplateKey` nằm trong `SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS` (gồm `"legal_study"`) — nếu folder độc lập cũng dùng key này, nó sẽ vô tình bị khoá tên dù là do người dùng tự tạo.

**Fix:** 5 folder mẫu hệ thống thật (do `CaseCreateForm.js` tạo) **luôn có `projectId`** kèm theo `folderTemplateKey` (cùng 1 lần gán). Folder độc lập theo thiết kế này thì **không có `projectId`**. Dùng chính sự khác biệt đó để phân biệt, không cần thêm field:

```js
const isRenameLockedFolder = (record) =>
  record?._type === "folder" &&
  Boolean(getFolderCaseProjectId(record)) &&
  (SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS.has(record?.folderTemplateKey) ||
    SYSTEM_LOCKED_RENAME_TEMPLATE_NAMES.has(
      String(record?.name || "").trim().toLowerCase(),
    ));
```

`getFolderCaseProjectId` đã tồn tại sẵn (dòng ~2169 khu vực helper), dùng lại y nguyên. Vì `canBulkSelectRecord` (dòng ~6446) gọi lại `isRenameLockedFolder`, fix này tự động áp dụng cho cả khoá bulk-select luôn, không cần sửa thêm.

## Phần 2 — Gallery hiển thị cả entry độc lập

**Vấn đề:** `legalStudyEntities` (dòng ~5642) bắt buộc `projectId` truthy mới push vào danh sách — folder độc lập (không `projectId`) bị loại khỏi gallery hoàn toàn.

**Fix:** Bỏ điều kiện bắt buộc, cho phép entry không có `project`/`customer`:

```js
activeCaseFolders.forEach((folder) => {
  if (folder.folderTemplateKey !== LEGAL_STUDY_FOLDER_TEMPLATE_KEY) return;
  if (accessible && !accessible.has(extractId(folder.id))) return;

  const projectId = getFolderCaseProjectId(folder);
  if (!projectId) {
    items.push({ folder, project: null, customer: null });
    return;
  }
  const project = projectById.get(String(projectId));
  if (!project) return;
  const customerId = getProjectCustomerId(project);
  const customer = customers.find(
    (c) => String(extractId(c)) === String(customerId),
  );
  items.push({ folder, project, customer });
});
```

**Render (gallery card + table, trong khối JSX `activeSpace === LEGAL_STUDY_STORAGE_TYPE && !activeCustomerId`, ~dòng 12448-12630):** hàm `formatCaseCustomerLabel(entry)` (~dòng 12448) hiện build label từ `entry.project?.caseCode`/`entry.customer?.shortName`/`entry.project?.projectName` — khi `entry.project` là `null`, các optional chaining này đã tự trả `undefined`, `.filter(Boolean).join(" - ")` sẽ ra chuỗi rỗng thay vì lỗi. Đổi fallback cuối từ `` `Case #${extractId(entry.project)}` `` (sẽ lỗi vì `entry.project` là `null`) thành `"Standalone"`:

```js
const formatCaseCustomerLabel = (entry) => {
  if (!entry.project) return "Standalone";
  const caseCode = entry.project?.caseCode || "";
  const shortName =
    entry.customer?.shortName ||
    (entry.customer ? getCustomerDisplayName(entry.customer) : "");
  const projectName = entry.project?.projectName || "";
  return (
    [caseCode, shortName, projectName].filter(Boolean).join(" - ") ||
    `Case #${extractId(entry.project)}`
  );
};
```

`openLegalStudyEntity(entry)` (~dòng 12465, hàm mở entry khi click card, cùng khối) hiện set cả `activeCustomerId`/`activeCaseId`/`selectedFolderId` — với entry độc lập, `entry.customer`/`entry.project` là `null`, nên chỉ set `selectedFolderId`, để `activeCustomerId`/`activeCaseId` giữ nguyên `null`:

```js
const openLegalStudyEntity = (entry) => {
  if (entry.customer) setActiveCustomerId(String(extractId(entry.customer)));
  if (entry.project) setActiveCaseId(String(extractId(entry.project)));
  setSelectedFolderId(String(extractId(entry.folder)));
  setSidebarSearch("");
};
```

## Phần 3 — Duyệt nội dung folder độc lập (folder con + document)

**Vấn đề cốt lõi:** `caseFolders`/`caseDocs` (state dùng để hiển thị `visibleFolders`/`visibleDocs` khi `activeSpace === LEGAL_STUDY_STORAGE_TYPE`) chỉ được fetch khi có `activeCaseId` (effect dòng ~5306-5343: `if (!activeCaseId) { setCaseFolders([]); setCaseDocs([]); return; }`). Với folder độc lập, `activeCaseId` luôn `null` → `caseFolders`/`caseDocs` luôn rỗng → duyệt vào trong sẽ thấy trống dù dữ liệu thật có tồn tại.

**Fix — thêm 1 nhánh dữ liệu song song cho trường hợp độc lập, không đổi nhánh case-bound hiện có:**

1. Thêm khái niệm folder gốc đang xem khi độc lập:
```js
// Khi đang ở Legal Study, không có Case active, nhưng đã chọn 1 folder cụ
// thể (không phải "root" — tức đang xem 1 Legal Study độc lập) — chính
// selectedFolderId lúc này LÀ folder gốc độc lập đang duyệt.
const activeStandaloneLegalStudyFolderId =
  activeSpace === LEGAL_STUDY_STORAGE_TYPE && !activeCaseId && selectedFolderId !== "root"
    ? String(selectedFolderId)
    : null;
```

2. Folder con của nhánh độc lập lấy trực tiếp từ `customerCaseFolders` (đã fetch sẵn toàn bộ, không filter — không cần fetch thêm):
```js
const standaloneLegalStudySubtreeFolderIds = useMemo(() => {
  if (!activeStandaloneLegalStudyFolderId) return new Set();
  return getFolderSubtreeIds(
    activeStandaloneLegalStudyFolderId,
    customerCaseFolders.filter((f) => !f?.isDeleted),
  );
}, [activeStandaloneLegalStudyFolderId, customerCaseFolders]);
```

3. Document của nhánh độc lập cần fetch riêng (document không nằm trong `customerCaseFolders`) — thêm 1 state + effect mới, theo đúng pattern đã có ở `legalStudyDocs`/`customerCaseRootFolderDocs` (size-fetch) nhưng dùng cho duyệt thật (cần đủ `fileAttachment`, `createdBy`):
```js
const [standaloneLegalStudyDocs, setStandaloneLegalStudyDocs] = useState([]);

useEffect(() => {
  if (!activeStandaloneLegalStudyFolderId) {
    setStandaloneLegalStudyDocs([]);
    return;
  }
  const ids = Array.from(standaloneLegalStudySubtreeFolderIds).map(Number).filter(Boolean);
  if (!ids.length) {
    setStandaloneLegalStudyDocs([]);
    return;
  }
  let cancelled = false;
  fetchAllList("documents:list", {
    filter: JSON.stringify({ folderId: { $in: ids } }),
    appends: ["fileAttachment", "createdBy"],
    sort: ["-createdAt"],
  })
    .then((docs) => {
      if (!cancelled) setStandaloneLegalStudyDocs((docs || []).filter((d) => !d?.isDeleted));
    })
    .catch(() => {
      if (!cancelled) setStandaloneLegalStudyDocs([]);
    });
  return () => {
    cancelled = true;
  };
}, [activeStandaloneLegalStudyFolderId, standaloneLegalStudySubtreeFolderIds]);
```

4. Sửa `visibleFolders`/`visibleDocs` nhánh `LEGAL_STUDY_STORAGE_TYPE` (hiện đang dòng ~5832 và ~5921) để chọn đúng nguồn theo có/không có Case:
```js
// visibleDocs
if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
  if (activeStandaloneLegalStudyFolderId) {
    return standaloneLegalStudyDocs.filter(
      (d) =>
        !d.isDeleted &&
        standaloneLegalStudySubtreeFolderIds.has(String(extractId(d.folderId) || "")),
    );
  }
  return caseDocs.filter(
    (d) =>
      !d.isDeleted &&
      legalStudySubtreeFolderIds.has(String(extractId(d.folderId) || "")),
  );
}

// visibleFolders
if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
  if (activeStandaloneLegalStudyFolderId) {
    return customerCaseFolders.filter(
      (f) =>
        !f.isDeleted &&
        standaloneLegalStudySubtreeFolderIds.has(String(extractId(f))),
    );
  }
  return caseFolders.filter(
    (f) =>
      !f.isDeleted &&
      legalStudySubtreeFolderIds.has(String(extractId(f))),
  );
}
```
Nhớ thêm `activeStandaloneLegalStudyFolderId`, `standaloneLegalStudySubtreeFolderIds`, `standaloneLegalStudyDocs`, `customerCaseFolders` vào dependency array của 2 `useMemo` này.

**Tạo folder con / upload file bên trong nhánh độc lập:** `handleCreateFolder`/`uploadFilesToTarget`/`uploadFolderFilesToTarget` đều dùng `buildScopedPayload(LEGAL_STUDY_STORAGE_TYPE)` (dòng ~6900 khu vực `buildScopedPayload`), hiện set `projectId`/`caseId` **chỉ khi** `activeCaseId` có giá trị (`...(activeCaseId ? {...} : {})`) và tương tự cho `customerId`. Với nhánh độc lập, `activeCaseId`/`activeCustomerId` đều `null` → payload tự động không có các field này, đúng ý muốn ("Legal Study" nhưng không case) — **không cần sửa `buildScopedPayload`**.

## Phần 4 — Điểm vào: tạo mới 1 Legal Study độc lập

**Vị trí:** gallery gốc Legal Study (`activeSpace === LEGAL_STUDY_STORAGE_TYPE && !activeCustomerId`, cùng khối render chứa `formatCaseCustomerLabel`/`openLegalStudyEntity` ở Phần 2, ~dòng 12400-12650).

Hiện khu vực topbar "New" button (điều kiện hiện `currentFolderPerms.canCreate || (activeSpace === "legal_reference" && !activeLegalReferenceId)`) không hiện gì ở gallery gốc Legal Study vì `currentFolderPerms` tại `selectedFolderId === "root"` luôn trả `viewer` cho non-admin — đúng ý (không dùng luồng "New" chung, vì nó sẽ tạo folder thiếu `folderTemplateKey`).

Thêm 1 nút riêng "**+ New Independent Legal Study**" ngay trong topbar/empty-state của gallery này (cạnh ô search, giống cách "Case Study" gallery có nút "Create Case Study" riêng), mở 1 dialog đặt tên đơn giản (tái dùng `folderForm`/`isFolderOpen` đã có), submit gọi hàm mới (không dùng chung `handleCreateFolder` vì cần set thêm `folderTemplateKey`):

```js
const handleCreateStandaloneLegalStudy = async (values) => {
  setFolderLoading(true);
  try {
    const userId = getCurrentUserId();
    const nowIso = new Date().toISOString();
    await createFolderRecord({
      name: values.name.trim(),
      description: values.description?.trim() || "",
      type: "custom",
      folderTemplateKey: LEGAL_STUDY_FOLDER_TEMPLATE_KEY,
      storageType: LEGAL_STUDY_STORAGE_TYPE,
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(userId ? { createdById: userId, updatedById: userId } : {}),
      // Cố ý KHÔNG gán parentId/projectId/caseId/customerId/internalCompanyId
      // — đây chính là điểm phân biệt "độc lập" với 5 folder mẫu thật.
    });
    message.success("Legal Study folder created successfully!");
    setIsFolderOpen(false);
    folderForm.resetFields();
    loadData();
  } catch (e) {
    message.error("Failed to create Legal Study folder");
  } finally {
    setFolderLoading(false);
  }
};
```

Nút bấm mở modal đã có (`folderForm.resetFields(); setIsFolderOpen(true);`), nhưng vì Modal "New Folder" hiện dùng chung 1 `onFinish={handleCreateFolder}` (dòng ~14711 khu vực Modal), cần 1 cách phân biệt "đang mở modal để tạo folder thường hay tạo Legal Study độc lập". Đơn giản nhất: thêm 1 state cờ `const [folderCreateMode, setFolderCreateMode] = useState("normal")` (`"normal" | "standalone_legal_study"`), nút mới set `setFolderCreateMode("standalone_legal_study")` trước khi mở modal, và Modal's `onFinish` chọn hàm theo cờ này:
```js
onFinish={folderCreateMode === "standalone_legal_study" ? handleCreateStandaloneLegalStudy : handleCreateFolder}
```
Reset cờ về `"normal"` trong `onCancel` của modal đó.

## Phần 5 — Breadcrumb cho nhánh độc lập

**Vấn đề:** breadcrumb nhánh `LEGAL_STUDY_STORAGE_TYPE` (dòng ~6186-6222) hiện luôn trả về đúng 1 item gallery-root bất cứ khi nào `!activeCaseId` — kể cả khi đang duyệt sâu vào 1 folder độc lập (`selectedFolderId !== "root"`), breadcrumb vẫn chỉ hiện "Legal Study", sai.

**Fix:**
```js
if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
  if (!activeCaseId) {
    // Không có Case active — hoặc đang ở gallery gốc (selectedFolderId
    // === "root"), hoặc đang duyệt bên trong 1 Legal Study độc lập.
    if (selectedFolderId === "root") {
      return [{ id: "legal_study_gallery", name: LEGAL_STUDY_LABEL }];
    }
    return buildFolderPath([{ id: "legal_study_gallery", name: LEGAL_STUDY_LABEL }]);
  }
  // ...phần còn lại (case-bound) giữ nguyên y hệt hiện tại...
}
```
`buildFolderPath` dùng `folderMap` (dựng từ `permissionFilteredFolders`) để đi ngược `parentId` — vì folder độc lập và folder con của nó đều nằm trong `visibleFolders`/`permissionFilteredFolders` sau khi Phần 3 chạy đúng, `buildFolderPath` tự hoạt động không cần sửa thêm.

## Kế hoạch xác minh

- `node --check`/babel-parser syntax check sau mỗi bước sửa (quy ước của file).
- Không có Nocobase runtime thật trong phiên làm việc — sau khi deploy, người dùng tự xác nhận:
  - Tạo mới 1 Legal Study độc lập từ gallery gốc → xuất hiện ngay trong gallery, nhãn phụ hiện "Standalone".
  - Click vào → vào đúng bên trong folder đó, breadcrumb đúng, tạo được folder con + upload file bình thường.
  - Đổi tên folder độc lập được (không bị khoá) — trong khi 5 folder mẫu thật của 1 Case vẫn bị khoá như cũ.
  - Legal Study đã gắn Case (luồng cũ) không thay đổi hành vi ở bất kỳ điểm nào.
