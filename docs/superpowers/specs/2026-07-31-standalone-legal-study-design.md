# Legal Study — 2 nhóm dữ liệu thống nhất (case-bound + nguồn ngoài) — Design Spec (v2)

> Thay thế bản v1 (viết trước khi phát hiện `LegalStudyCreateBlock.js` đã tồn tại sẵn, untracked, y hệt tình huống `CaseReferenceCreateBlock.js`). Kiến trúc ở bản này đơn giản hơn nhiều nhờ tái dùng đúng hạ tầng đã có.

## Bối cảnh (đã xác nhận qua thảo luận + kiểm tra Nocobase admin)

Nghiệp vụ xác nhận: Case đang chạy (`projects`) sẽ tham chiếu **Case Study** và **Legal Study** để xem tài liệu liên quan. Đơn giản vậy thôi.

**Case Study**: đã xong (xem `2026-07-30-case-study-rename-design.md`) — record `legalReference`, many-to-many `cases`, folder/document gắn qua `legalReferenceId`. Không đổi gì thêm ở đây.

**Legal Study — 2 nhóm cùng 1 danh mục:**

1. **Hệ thống tự tạo (gắn Case)**: folder `folderTemplateKey = "legal_study"`, tự động sinh bởi `CaseCreateForm.js` khi tạo Case, có `projectId`. Không có record `legalStudy` riêng. **Giữ nguyên 100%, không đổi.**
2. **Người dùng tự tạo (nguồn ngoài — tìm trên mạng, tài liệu công ty khác...)**: có 1 record `legalStudy` làm định danh (title + description, tối giản), folder/document gắn vào qua field `legalStudyId` (relation `hasMany` "Folders"/"documents" trên collection `legalStudy` — **đã xác nhận còn tồn tại thật trên schema Nocobase**, xem screenshot người dùng cung cấp), **và** folder gốc của nó cũng gán `folderTemplateKey: "legal_study"` để hiển thị đúng trong cùng danh mục Legal Study ở `Library.js`.

**Phát hiện quan trọng — 2 file đã tồn tại sẵn (untracked), viết đúng theo mô hình CŨ trước migration 2026-07-25, cần chỉnh lại:**

- `All Module/Document/LegalStudyCreateBlock.js` (1296 dòng) — form tạo record `legalStudy` đầy đủ: tạo record, upload file/folder gắn `legalStudyId`+`moduleScope/storageType: "legal_study"`, link tới nhiều Case (`linkCaseToLegalStudy`) và nhiều Case Reference (`linkLegalReferenceToLegalStudy`). **Chưa gán `folderTemplateKey`** trên folder tạo ra → hiện không hiện được trong gallery Legal Study của `Library.js`. Còn giữ field Manager/Members/Priority/Status/Start Date/Deadline — **đã xác nhận bỏ hết**, theo đúng tiền lệ đã làm với Case Study.
- `All Module/Document/LegalStudyDocument.js` — block xem chi tiết 1 `legalStudy` (chưa đọc do file quá lớn >256KB; sẽ đọc theo phần khi cần ở bước implement, không thuộc phạm vi phân tích lần này trừ khi có tham chiếu `folderTemplateKey`/hiển thị folder cần khớp theo thiết kế mới).

**Vì Group 2 dùng `moduleScope: "legal_study"` (khác Group 1 hoàn toàn không có `moduleScope`), dữ liệu Group 2 **tự động** đã nằm trong state `folders`/`documents` chung của `Library.js`** (`DASHBOARD_CONFIG.moduleScopes` đã có sẵn `"legal_study"` trong danh sách filter của `fetchFoldersForInternalTemplates`/`fetchDocumentsForInternalTemplates`) — **không cần thêm fetch riêng nào cho việc duyệt nội dung Group 2**, khác hẳn giả định ở bản spec v1.

## Mục tiêu

1. `LegalStudyCreateBlock.js`: bỏ Manager/Members/Priority/Status/Start Date/Deadline; gán `folderTemplateKey` cho folder tạo ra; đảm bảo **luôn có ít nhất 1 folder gốc** được tạo cho mỗi record `legalStudy` mới (kể cả khi user không chọn "upload folder", chỉ chọn file rời hoặc không chọn gì) — để record nào cũng hiện được trong gallery.
2. `Library.js`: gallery "Legal Study" hiển thị **cả 2 nhóm** cùng danh sách; duyệt vào Group 2 hoạt động bằng cách lọc thẳng state `folders`/`documents` đã có sẵn (không fetch thêm); có nút tạo mới Group 2 (mở popup `LegalStudyCreateBlock.js`, cùng cơ chế `CASE_REFERENCE_CREATE_POPUP_UID` đã dùng cho Case Study); sửa xung đột khoá rename; sửa breadcrumb.
3. **Ngoài phạm vi lần này** (đã thống nhất tách riêng ở lượt trước): sửa `LegalReferenceWorkspace.js`'s tab "Legal Study" để tìm đúng Group 1 (hiện đang query sai theo `storageType` thay vì `folderTemplateKey`, xem thảo luận trước) — Group 2 **không cần sửa gì** ở file đó vì cơ chế `legalStudy.Folders`/`legalStudy.documents` nó đang đọc vẫn đúng nguyên như thiết kế này tạo ra.

## Ngoài phạm vi (non-goals)

- Không đổi `LegalReferenceWorkspace.js` (tách plan riêng theo yêu cầu trước đó).
- Không đổi `LegalStudyDocument.js` trừ khi việc implement Phần A/B phát hiện nó tham chiếu trực tiếp tới cấu trúc bị đổi (sẽ rà lại ở bước viết plan chi tiết).
- Không hỗ trợ "chuyển nhóm" (Group 1 → Group 2 hay ngược lại) cho 1 folder đã tồn tại.
- Không đổi Case Study.
- Không migrate dữ liệu `legalStudy` cũ (link kiểu cũ qua quan hệ `legalStudy` many-to-many với case vẫn giữ nguyên, không đụng).

## Phần A — `LegalStudyCreateBlock.js`: đơn giản hoá form + gán `folderTemplateKey`

**A1. Bỏ field thừa** (theo đúng pattern đã làm ở `CaseReferenceCreateBlock.js`):
- Xoá 2 `Row` chứa Manager/Members (dòng ~1078-1112) và Priority/Status (dòng ~1113-1149).
- Xoá `Form.Item` Start Date/Deadline nếu có UI riêng (kiểm tra lại khi implement — `values.startDate`/`values.deadline` được build trong `handleSubmit` dòng ~881-882 nhưng chưa thấy `Form.Item` tương ứng trong đoạn JSX đã đọc — có thể đã bị bỏ dở hoặc nằm ngoài phần đã xem; rà lại toàn file khi viết plan).
- Sửa `handleSubmit`'s `basePayload` (dòng ~875-886): bỏ `priority`, `status`, `startDate`, `deadline`, `managerId`/`memberIds` liên quan và spread `manager`/`members`.
- Dọn `users`/`setUsers`/`userLabel`/`USER_RESOURCES`/`userOptions` (dead sau khi bỏ Manager/Members — cùng lý do đã áp dụng ở `CaseReferenceCreateBlock.js`).
- Đơn giản hoá `legalStudyPayloadVariants` (dòng ~542-551) — bỏ biến thể liên quan `manager`/`members`/`managerId`/`memberIds`.

**A2. Gán `folderTemplateKey` + đảm bảo luôn có folder gốc:**

Thêm hằng số `LEGAL_STUDY_FOLDER_TEMPLATE_KEY = "legal_study"` (khớp tên với Library.js). Sau khi tạo record `legalStudy` thành công (`studyId` có giá trị), **luôn** tạo 1 folder gốc đặt tên theo `values.title`, trước khi xử lý `files`/`folderFiles`:

```js
if (studyId) {
  const rootFolder = await createFolderRecord({
    name: values.title?.trim() || "Legal Study",
    type: "custom",
    folderTemplateKey: LEGAL_STUDY_FOLDER_TEMPLATE_KEY,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...(userId ? { createdById: userId, updatedById: userId } : {}),
    ...buildDocumentScopePayload({ internalCompanyId: values.internalCompanyId, legalStudyId: studyId }),
  });
  const rootFolderId = extractId(rootFolder);
  // files rời (không qua "Choose folder") giờ upload VÀO rootFolderId,
  // không còn upload rời ở cấp gốc (folderId: null) như hiện tại.
  // uploadFilesToStudy / uploadFolderFilesToStudy cần nhận thêm rootFolderId
  // làm folderId cha thay vì null.
}
```

`uploadFilesToStudy`/`uploadFolderFilesToStudy` (dòng ~651-751) hiện dùng `folderId: null` làm gốc — sửa để nhận `rootFolderId` làm gốc thay vì `null`, cho cả 2 hàm (file rời nằm thẳng trong `rootFolderId`, folder kéo-thả nằm trong cây con của `rootFolderId`).

**A3. Không đổi:** `linkCaseToLegalStudy`/`linkLegalReferenceToLegalStudy` (cơ chế link nhiều Case/Case Reference) — giữ nguyên, không liên quan tới folder/rename-lock.

## Phần B — `Library.js`: hiển thị + duyệt cả 2 nhóm

**B1. Rename-lock (giống spec v1 Phần 1, không đổi):**

```js
const isRenameLockedFolder = (record) =>
  record?._type === "folder" &&
  Boolean(getFolderCaseProjectId(record)) &&
  (SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS.has(record?.folderTemplateKey) ||
    SYSTEM_LOCKED_RENAME_TEMPLATE_NAMES.has(
      String(record?.name || "").trim().toLowerCase(),
    ));
```

Group 2 luôn không có `projectId` → không bị khoá. Group 1 luôn có `projectId` → vẫn bị khoá như cũ.

**B2. `legalStudyEntities` (dòng ~5642) — thêm nhánh Group 2:**

Cần thêm 1 fetch nhẹ danh sách record `legalStudy` (chỉ `id`, `title`, `description` — không cần appends nặng) vào `loadData()`, lưu vào state mới `legalStudyRecords`. Sau đó:

```js
const legalStudyRecordById = useMemo(() => {
  const map = new Map();
  legalStudyRecords.forEach((s) => map.set(String(extractId(s)), s));
  return map;
}, [legalStudyRecords]);

const legalStudyEntities = useMemo(() => {
  const currentUser = currentUserState;
  const activeCaseFolders = customerCaseFolders.filter((f) => !f?.isDeleted);
  const { accessible } =
    currentUser && !isAdmin
      ? getVisibleFolderIds(activeCaseFolders, currentUser, currentLawyerId)
      : { accessible: null };

  const items = [];
  activeCaseFolders.forEach((folder) => {
    if (folder.folderTemplateKey !== LEGAL_STUDY_FOLDER_TEMPLATE_KEY) return;
    if (accessible && !accessible.has(extractId(folder.id))) return;

    const projectId = getFolderCaseProjectId(folder);
    if (!projectId) {
      // Group 2 — nguồn ngoài, gắn qua legalStudyId, không có Case.
      const studyId = extractId(folder.legalStudyId);
      const study = studyId ? legalStudyRecordById.get(String(studyId)) : null;
      items.push({ folder, project: null, customer: null, study });
      return;
    }
    const project = projectById.get(String(projectId));
    if (!project) return;
    const customerId = getProjectCustomerId(project);
    const customer = customers.find(
      (c) => String(extractId(c)) === String(customerId),
    );
    items.push({ folder, project, customer, study: null });
  });
  return items;
}, [
  customerCaseFolders,
  currentUserState,
  currentLawyerId,
  isAdmin,
  projectById,
  customers,
  legalStudyRecordById,
]);
```

Lưu ý: `customerCaseFolders` fetch KHÔNG filter gì (`fetchCustomerCasePermissionFolders()`, không điều kiện `moduleScope`) nên **đã tự động chứa cả Group 2** — không cần sửa hàm fetch đó.

**Render (~dòng 12448 khu vực `formatCaseCustomerLabel`/`openLegalStudyEntity`):**

```js
const formatCaseCustomerLabel = (entry) => {
  if (entry.study) return entry.study.title || entry.study.description || "External resource";
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

const openLegalStudyEntity = (entry) => {
  if (entry.customer) setActiveCustomerId(String(extractId(entry.customer)));
  if (entry.project) setActiveCaseId(String(extractId(entry.project)));
  setSelectedFolderId(String(extractId(entry.folder)));
  setSidebarSearch("");
};
```

**B3. Duyệt nội dung Group 2 — KHÔNG cần fetch mới (khác spec v1):**

```js
const activeStandaloneLegalStudyFolderId =
  activeSpace === LEGAL_STUDY_STORAGE_TYPE && !activeCaseId && selectedFolderId !== "root"
    ? String(selectedFolderId)
    : null;

const standaloneLegalStudySubtreeFolderIds = useMemo(() => {
  if (!activeStandaloneLegalStudyFolderId) return new Set();
  // folders/documents chung của component (state `folders`/`documents`,
  // đã fetch sẵn qua loadData, filter theo DASHBOARD_CONFIG.moduleScopes
  // đã bao gồm "legal_study") — Group 2 nằm sẵn trong đây, không cần fetch
  // thêm gì.
  return getFolderSubtreeIds(
    activeStandaloneLegalStudyFolderId,
    folders.filter((f) => !f?.isDeleted),
  );
}, [activeStandaloneLegalStudyFolderId, folders]);
```

Sửa `visibleFolders`/`visibleDocs` nhánh `LEGAL_STUDY_STORAGE_TYPE` (dòng ~5832 và ~5921):

```js
// visibleDocs
if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
  if (activeStandaloneLegalStudyFolderId) {
    return documents.filter(
      (d) =>
        !d.isDeleted &&
        standaloneLegalStudySubtreeFolderIds.has(String(extractId(d.folderId) || "")),
    );
  }
  return caseDocs.filter(
    (d) => !d.isDeleted && legalStudySubtreeFolderIds.has(String(extractId(d.folderId) || "")),
  );
}

// visibleFolders
if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
  if (activeStandaloneLegalStudyFolderId) {
    return folders.filter(
      (f) => !f.isDeleted && standaloneLegalStudySubtreeFolderIds.has(String(extractId(f))),
    );
  }
  return caseFolders.filter(
    (f) => !f.isDeleted && legalStudySubtreeFolderIds.has(String(extractId(f))),
  );
}
```

`documents`/`folders` (state chung của component, đã tồn tại từ trước, KHÔNG phải `customerCaseFolders`) dùng được thẳng vì Group 2 có `moduleScope: "legal_study"` nên đã nằm trong 2 state này qua `loadData()` sẵn có.

**Tạo folder con / upload file khi đang duyệt Group 2:** `buildScopedPayload(LEGAL_STUDY_STORAGE_TYPE)` hiện chỉ set `projectId`/`caseId`/`customerId` khi có `activeCaseId`/`activeCustomerId` — khi duyệt Group 2 (không có 2 giá trị này), payload sẽ không có các field đó, đúng ý. Nhưng **cần thêm `moduleScope: "legal_study"`** vào nhánh này của `buildScopedPayload` khi KHÔNG có `activeCaseId` (để file/folder con mới tạo cũng rơi vào đúng state `folders`/`documents` chung, nhất quán với cách Group 2 hoạt động) — hiện nhánh `"customer" || LEGAL_STUDY_STORAGE_TYPE` gộp chung, cần tách riêng:

```js
if (targetSpace === LEGAL_STUDY_STORAGE_TYPE && !activeCaseId) {
  // Đang ở Group 2 (Legal Study độc lập) — cần moduleScope để nằm trong
  // state `folders`/`documents` chung, khác nhánh case-bound bên dưới.
  return {
    moduleScope: LEGAL_STUDY_STORAGE_TYPE,
    ...(activeCompanyId ? { internalCompanyId: extractId(activeCompanyId) } : {}),
  };
}
if (targetSpace === "customer" || targetSpace === LEGAL_STUDY_STORAGE_TYPE) {
  // ...giữ nguyên logic case-bound hiện có...
}
```

**B4. Điểm vào tạo mới Group 2:** tương tự Case Study — thêm hằng số cặp UID/URL:

```js
const LEGAL_STUDY_CREATE_POPUP_UID = "<UID người dùng cấu hình trên Nocobase>";
const LEGAL_STUDY_CREATE_VIEW_URL = "<URL tương ứng>";
```

Thêm hàm `openCreateLegalStudyModal` (mirror `openCreateReferenceModal`, dùng lại `openCreateViewByUid`), và 1 nút "+ New Legal Study" ở gallery gốc Legal Study (cùng khu vực nút "New" hiện có cho Case Study, ~dòng 12400-12650) gọi hàm này.

**B5. Breadcrumb (giống spec v1 Phần 5, không đổi):**

```js
if (activeSpace === LEGAL_STUDY_STORAGE_TYPE) {
  if (!activeCaseId) {
    if (selectedFolderId === "root") {
      return [{ id: "legal_study_gallery", name: LEGAL_STUDY_LABEL }];
    }
    return buildFolderPath([{ id: "legal_study_gallery", name: LEGAL_STUDY_LABEL }]);
  }
  // ...phần case-bound giữ nguyên...
}
```

## Kế hoạch xác minh

- `node --check` (LegalStudyCreateBlock.js — React.createElement thuần, không JSX) / babel-parser check (Library.js — có JSX) sau mỗi bước sửa.
- Không có Nocobase runtime thật — sau khi deploy, người dùng tự xác nhận:
  - Tạo mới 1 Legal Study "nguồn ngoài" từ `LegalStudyCreateBlock.js` (qua popup mới trong Library.js) → tự động có 1 folder gốc, xuất hiện trong gallery Legal Study với tên = title của record.
  - Không còn thấy field Manager/Members/Priority/Status/Start Date/Deadline trong form tạo.
  - Click vào entry Group 2 → duyệt vào đúng, tạo folder con/upload file hoạt động, không cần fetch riêng.
  - Đổi tên folder gốc Group 2 được (không khoá); 5 folder mẫu Group 1 vẫn khoá như cũ.
  - Group 1 (case-bound) không đổi hành vi ở bất kỳ điểm nào.
