# SRS — Hệ thống Quản lý Tài liệu Thư viện (Library.js)

> **Nguồn triển khai:** `All Module/Document/Library.js` (component React
> `InternalTemplates`, ~15.600 dòng, tự render qua
> `ctx.render(React.createElement(InternalTemplates))`).
> **Tài liệu tham chiếu gốc dùng để biên soạn SRS này:**
> [nocobase-docs/library-js-architecture-reference.md](nocobase-docs/library-js-architecture-reference.md)
> và [nocobase-docs/document-inline-edit-upload-grouping-pattern.md](nocobase-docs/document-inline-edit-upload-grouping-pattern.md).
> **Cập nhật lần cuối:** 2026-08-07 — phản ánh trạng thái sau đợt đồng bộ
> permission tier 2026-08-05 (viewer/editor/contributed/manager).

---

## 1. Mục đích & Phạm vi

Tài liệu này mô tả nghiệp vụ hiện hành của **Library.js** — module quản lý
tài liệu trung tâm cấp công ty (Knowledge base, tài liệu theo Customer/Case,
Reference/Legal Study, tài liệu cá nhân...), tập trung vào 4 mảng nghiệp vụ
mới/quan trọng nhất:

1. **Phân quyền** (permission model) — role-based, root-only inheritance,
   entity permission (Case Study/Legal Study), 4-tier capability
   (viewer/editor/contributed/manager).
2. **Move file/folder** (di chuyển) — điều kiện, ràng buộc, tác dụng phụ
   (reindex `fileIndex`).
3. **Workflow** — các luồng nghiệp vụ chính: tạo folder, upload (đơn/nhiều
   file, gom nhóm), upload cả folder, kéo-thả ngoài OS, sắp xếp thủ công,
   rename/inline-edit, xoá mềm/Trash/khôi phục/xoá vĩnh viễn, bulk actions,
   share, quản lý quyền.
4. **Testing** — checklist test case cụ thể cho toàn bộ 3 mảng trên.

**Phạm vi:** chỉ nghiệp vụ **nội tại của Library.js** (không gian Knowledge,
Customer/Case, Reference/Legal Study, Company Shared, Personal, Shared with
me, Recent, Trash) — **không** bao gồm luồng "Move to Library" tích hợp từ
`TaskDetailView.js` (module Task/ProjectInternal đưa file *vào* Knowledge từ
bên ngoài — thuộc phạm vi SRS/tài liệu riêng của module Task).

**Ràng buộc kỹ thuật nền:** Library.js là 1 Nocobase JS Field/Action block —
không `import`, không side-effect ngoài `ctx`, mọi logic nằm **trong 1
file duy nhất** (`[[nocobase_single_file_constraint]]`). Không có test suite
tự động (không có `package.json` script test) — mọi test case trong tài
liệu này là **test thủ công** thực hiện trực tiếp trên Nocobase UI.

---

## 2. Thuật ngữ & Khái niệm

| Thuật ngữ | Ý nghĩa |
|---|---|
| **Space** (`activeSpace`) | "Không gian" đang xem, chọn qua sidebar flat menu — xem bảng đầy đủ ở mục 4. |
| **Root folder** | Folder không có `parentId` (hoặc `parentId` trỏ ra ngoài phạm vi cây hiện tại) — nơi **duy nhất** lưu quyền thật (`folderManagers`/`folderMembers`) cho toàn bộ cây con của nó. |
| **Root-only permission** | Mô hình phân quyền: mọi folder/document con thừa hưởng quyền từ root của cây chứa nó, **không tự có** `folderManagers`/`folderMembers` riêng có tác dụng. |
| **Entity permission** | Mô hình phân quyền riêng cho Case Study (`legal_reference`)/Legal Study (`legal_study`) — dùng bảng `legalMembers` + field `manager` trên chính record entity, **không dùng** `folderManager`/`folderMembers`. |
| **Capability tier** | 1 trong 4 mức năng lực: `viewer` / `editor` / `contributed` / `manager` — áp dụng cho cả folder-Member lẫn entity-Member. |
| **`roleToPerms(role)`** | Hàm map 1 trong 6 role hệ thống (`admin/owner/manager/editor/viewer/null`) sang object quyền (`canView/canCreate/canRename/canMove/canDelete/canShare/canManagePermissions`). |
| **`getRecordPerms(record)`** | Hàm bridge chính — trả về object quyền cho **1 record cụ thể** (folder hoặc document), dùng ở hầu hết UI (context menu, action button, drag-drop). |
| **`getFolderPermsById(folderId, space)`** | Biến thể dùng khi chỉ có `folderId` (chưa có record đầy đủ) — vd trước khi upload/tạo folder/move. |
| **`getVisibleFolderIds`** | Trả về 2 tập `{accessible, entitled}` — folder id mà user hiện tại được thấy, dùng lọc `visibleFolders`/`visibleDocs`. |
| **`resolveFolderTreeRoot`** | Hàm leo `parentId` từ 1 folder lên tới root của cây chứa nó (có gate riêng cho ranh giới Case). |
| **`storageType`** | Không gian lưu trữ tại thời điểm tạo record (gần trùng `activeSpace` lúc tạo, nhưng không phải cùng khái niệm). |
| **`moduleScope`** | Field dùng để filter khi fetch dữ liệu — mỗi file document (Library.js, CaseDocument.js...) query theo bộ `moduleScopes` riêng trong `DASHBOARD_CONFIG`. |
| **`fileIndex`** | Thứ tự thủ công của 1 file trong 1 folder khi `sortMode === "manual"` — phải **reindex** (`reindexFolderFiles`) sau mọi thao tác làm lệch thứ tự (move/xoá/thêm). |
| **`folderTemplateKey`** | Đánh dấu 1 trong 5 folder mẫu hệ thống do `CaseCreateForm.js` tự sinh khi tạo Case — không ai đổi tên/xoá được. |
| **Soft delete / Trash** | Đánh dấu `isDeleted: true` (+ `deletedAt`, `deletedById`) — không gọi `folders:destroy`/`documents:destroy` thật cho tới khi "Permanently delete". |
| **Gallery 2 cấp** | UI trung gian trước khi vào 1 folder gốc cụ thể — hiện ở space `customer` (Customer → gộp thẳng danh sách Case-root-folder) và `legal_study` (gallery flat Case có folder Legal Study + Legal Study độc lập). |

---

## 3. Mô hình dữ liệu liên quan

Hai collection chính: **`folders`** và **`documents`**. Các field quan
trọng dùng xuyên suốt toàn bộ nghiệp vụ mô tả trong tài liệu này:

| Field | Bảng | Ý nghĩa |
|---|---|---|
| `parentId` (folder) / `folderId` (document) | folders / documents | Cha trực tiếp. `"root"` chỉ là sentinel state UI, **không** phải giá trị lưu DB (DB lưu `null`) — luôn chuẩn hoá qua `normalizeParentId`/`getFolderParentId`. |
| `storageType` | cả 2 | Không gian lưu trữ lúc tạo (`"company_shared"`, `"personal"`, `"knowledge"`, `"legal_study"`, ...). |
| `moduleScope` | cả 2 | Dùng để filter fetch theo `DASHBOARD_CONFIG.moduleScopes` của Library.js: `["internal_templates", "internal_template", "legal_reference", "legal_study", "personal", "knowledge"]`. |
| `folderTemplateKey` | folders | 1 trong 5 key folder mẫu hệ thống (mục 8, quy tắc 1). |
| `legalStudyId` / `legalReferenceId` | cả 2 | Flat-tag trực tiếp trên **mọi** folder/document bên trong 1 Legal Study/Case Study (không chỉ folder gốc) — nguồn kích hoạt entity permission. |
| `createdById` / `updatedById` / `uploadedById` | cả 2 | Nocobase user id. `createdById` của **folder root** quyết định quyền "owner" cho cả cây. |
| `folderManager` / `folderManagers` | folders | Quan hệ tới bảng `folderManagers` — chỉ có ý nghĩa khi đọc trên **folder gốc**. |
| `folderMember` / `folderMembers` | folders | Quan hệ tới bảng `folderMembers`, có field `role` (`viewer`/`editor`/`contributed`). |
| `manager`/`managerId` | legalReference / legalStudy | Manager duy nhất của entity (belongsTo lawyers), mặc định = người tạo. |
| (bảng `legalMembers`) | — | Members của Case Study/Legal Study, field `role` (`viewer`/`editor`/`contributed`), FK `legalReferenceId` **hoặc** `legalStudyId` (dùng chung 1 bảng cho cả 2 kind). |
| `isDeleted` / `deletedAt` / `deletedById` | cả 2 | Soft-delete — Trash lọc theo các field này (không lọc theo quyền folder như view thường). |
| `fileIndex` | documents | Thứ tự thủ công trong 1 folder (sort mode "manual"). |
| 8 field metadata document | documents | `description` (folder + file), `documentType`, `documentCode`, `openingDate`, `signedAt`, `effectiveAt`, `senderName`, `recipientName` (chỉ file) — sửa được inline trong Table view. |

---

## 4. Mô hình Không gian (Space) & Điều hướng

`activeSpace` là chuỗi xác định "không gian" đang xem — sidebar flat menu,
**không lồng nhau**:

| `activeSpace` | Ý nghĩa | Gallery 2 cấp? |
|---|---|---|
| `"knowledge"` (`KNOWLEDGE_STORAGE_TYPE`) | Kiến thức chung công ty | Không |
| `"customer"` | Tài liệu theo Customer → Case | **Có** — chọn Customer hiện thẳng danh sách folder gốc của mọi Case thuộc customer đó (đã gộp 2 bước thành 1) |
| `"legal_study"` (`LEGAL_STUDY_STORAGE_TYPE`, label UI "Reference") | Gallery flat các Case có folder mẫu Legal Study + Legal Study độc lập (case-less) | **Có** |
| `"company_shared"` | Thư mục chia sẻ toàn công ty | Không |
| `"legal_reference"` | Case Study (UI hiện đã ẩn phần lớn, chỉ còn lookup) | Không |
| `"personal"` (`MY_DOCUMENT_STORAGE_TYPE`) | Tài liệu cá nhân | Không |
| `"shared_with_me"` | Document được share trực tiếp cho user qua `documentShares` | Không |
| `"recent"` | Activity log | Không |
| `"trash"` | Thùng rác | Không |

`breadcrumbs` build lại path từ `selectedFolderId` leo ngược `parentId` qua
`folderMap`. Space `legal_study` có 1 node đặc biệt `"case_info"` (mô tả
Case/Customer sở hữu, click không điều hướng).

---

## 5. Mô hình Phân quyền (Permission Model) — FR nhóm A

### FR-A1 — `roleToPerms(role)`: 6 role hệ thống

- FR-A1.1: Role hợp lệ: `admin | owner | manager | editor | viewer | null`.
- FR-A1.2: `canView`: true với mọi role khác `null`.
- FR-A1.3: `canCreate`: true với `admin/owner/manager/editor/viewer`.
- FR-A1.4: `canRename` / `canMove` / `canDelete` / `canShare`: true với
  `admin/owner/manager/editor` (viewer **không** có 4 quyền này).
- FR-A1.5: `canManagePermissions`: true với `admin/owner/manager` (editor và
  viewer **không** có quyền sửa phân quyền).

### FR-A2 — Root-only permission (folder thông thường, không thuộc Legal
Study/Case Study)

- FR-A2.1: Mọi folder/document thừa hưởng quyền từ **root của cây chứa nó**,
  không phải từ chính nó — `resolveFolderTreeRoot(folder, allFolders)` leo
  `parentId` lên tới khi hết cha (hoặc gặp sentinel `"root"`).
- FR-A2.2: Có gate riêng cho ranh giới Case: nếu folder gắn
  `projectId`/`caseId`, việc leo cha **dừng lại** khi cha không còn cùng
  `projectId` — ranh giới xác định qua `isCaseRootFolder`.
- FR-A2.3: `getFolderPermissions(folder, user, allFolders, currentLawyerId, entityCtx)`
  resolve theo thứ tự ưu tiên:
  1. Admin → luôn `roleToPerms("admin")` (**trừ** khoá xoá Legal Study root
     — xem FR-C4).
  2. Nếu folder có `legalStudyId` → bridge sang **entity permission**
     (FR-A4), tuyệt đối **không** dùng `folderManager`/`folderMembers`.
  3. Ngược lại: resolve `root`; nếu `root.createdById === user.id` → role
     `"owner"`; nếu không → tra `folderManagers`/`folderMembers` của
     **root**.
- FR-A2.4: `getFilePermissions(file, folder, ...)` = quyền của folder cha
  (qua FR-A2.3), **cộng thêm**: nếu record không có quyền nào qua folder
  nhưng được share riêng cho user (`isRecordSharedWithUser`) → role
  `"shared"`, `canView: true` (các quyền khác vẫn theo mặc định `false` trừ
  khi override thêm).
- FR-A2.5: `getVisibleFolderIds(allFolders, user, lawyerId, entityCtx)` trả
  về `{accessible, entitled}` — admin luôn thấy toàn bộ; user thường chỉ
  thấy folder mà quyền resolve ra `canView: true`.

### FR-A3 — 4-tier capability (`MEMBER_ROLE_CAPABILITIES`) — dùng chung cho
folder-Member **và** entity-Member

| Tier | canCreate | canRename | canMove | canDelete | canShare | canEdit | Ghi chú |
|---|---|---|---|---|---|---|---|
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | Upload/View/Download |
| **Editor** | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | + Edit/Share |
| **Contributed** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | + Delete/Move (gần bằng Manager, trừ `canManagePermissions`) |
| **Manager** | Full access (tương đương `roleToPerms("manager")`) | | | | | | Có thêm `canManagePermissions` |

- FR-A3.1: `getMemberRoleTierPerms(role)` là điểm dùng chung duy nhất cho
  cả nhánh folder-Member (FR-A2.3 bước 3) và entity-Member (FR-A4) — sửa 1
  nơi ảnh hưởng cả 2.
- FR-A3.2: **Đã đồng bộ 2026-08-05**: capability tier chuẩn cho Member là
  **viewer/editor/contributed** (3 role gán được cho Member qua UI), không
  phải bộ `admin/owner/manager/editor/viewer` đầy đủ của FR-A1 — "manager"
  chỉ gán qua field Manager riêng (không nằm trong list role của Member).

### FR-A4 — Entity permission (Case Study `legal_reference` / Legal Study
`legal_study`)

- FR-A4.1: Case Study và Legal Study là 2 collection **độc lập**, mỗi record
  có đúng 1 `manager` (belongsTo lawyers, field `managerId`, mặc định =
  người tạo lúc khởi tạo record) + nhiều `members` qua bảng trung gian
  `legalMembers`.
- FR-A4.2: `resolveLegalEntityFolderPerms(entityId, kind, lwId, entityCtx)`
  tra `entityCtx.legalStudyById`/`entityCtx.legalMemberRoleByStudy` (build
  **1 lần** trong `loadData`, không fetch lại mỗi lần check quyền) → trả
  `roleToPerms("manager")` nếu là manager, hoặc `getMemberRoleTierPerms(role)`
  nếu là member.
- FR-A4.3: **KHÔNG có owner/`createdById` bypass** — khác hẳn FR-A2 (root-only
  permission của folder thường). Nếu Manager của entity bị đổi sang người
  khác, **người tạo cũ mất quyền ngay lập tức**, kể cả với chính record họ
  đã tạo ra.
- FR-A4.4: Mọi folder/document có `legalStudyId`/`legalReferenceId` (không
  chỉ folder gốc) đều dùng entity permission — bridge tại FR-A2.3 bước 2.

### FR-A5 — Bridge functions dùng ở UI

- FR-A5.1: `getRecordPerms(record)` — dùng ở hầu hết render/action (context
  menu, action button, drag-drop). Admin → admin; Folder → FR-A2.3; File →
  tìm folder cha trong `visibleFolders`, gọi FR-A2.4.
- FR-A5.2: `getFolderPermsById(folderId, space)` — dùng khi chỉ có id (chưa
  chắc có record đầy đủ), ví dụ trước khi upload/tạo folder/move. Case đặc
  biệt: `folderId` rỗng (đang ở sentinel `"root"`) → xử lý riêng theo
  `space`:
  - `MY_DOCUMENT_STORAGE_TYPE` (Personal) → luôn `"owner"`.
  - `"legal_reference"` với `activeLegalReferenceId` → bridge thẳng sang
    entity permission (Case Study chưa có folder thật cho tới khi có
    subfolder/file đầu tiên).

---

## 6. Nghiệp vụ CRUD & Workflow — FR nhóm B

### FR-B1 — Tạo folder (`handleCreateFolder`)

1. Check `getFolderPermsById(selectedFolderId).canCreate`.
2. Check `requireCompany()` — **trừ** 3 space không cần chọn company: Legal
   Study, Personal, Shared-with-me.
3. Build payload cơ bản (`name`, `description`, `type: "custom"`, timestamps,
   `createdById`/`updatedById`).
4. `applyFolderSpacePayload(payload)` — áp field scope theo `activeSpace`
   (internalCompanyId, moduleScope, projectId/caseId/customerId,
   legalReferenceId, ...).
5. `createFolderRecord(payload)` → `loadData()` (reload toàn bộ danh sách).

### FR-B2 — Upload file(s) (`handleFileInputTrigger` → modal metadata →
`handleConfirmUploadFields` → `uploadFilesToTarget`)

- FR-B2.1: Click "Upload file" → mở native OS file picker (hỗ trợ
  multi-select) → check quyền → mở `DocumentUploadFieldsModal`.
- FR-B2.2: Khi upload **≥ 2 file cùng lúc**, modal cho chọn 1 trong 2 chế độ
  (Radio.Group, chỉ hiện khi `files.length > 1`):
  1. **Upload as separate files** (mặc định) — N file rời trong folder đích.
  2. **Group into a new folder** — bắt buộc nhập tên folder (không gợi ý
     sẵn) → tạo 1 folder mới trong folder đích hiện tại → đặt toàn bộ N
     file vào trong đó.
- FR-B2.3: Ở chế độ "grouped", **ẩn toàn bộ** field metadata (Document
  Type/Name/Code, các ngày, Sender, Recipient, Description) — không có ý
  nghĩa khi đang tạo 1 folder.
- FR-B2.4: Submit chế độ grouped: tạo folder trước (đợi xong) rồi mới gọi
  `uploadFilesToTarget` với cờ `skipPermissionCheck: true` (folder vừa tạo
  chưa kịp có trong state `visibleFolders` vì `loadData()` chưa chạy — nếu
  không bỏ qua check lần 2 sẽ bị chặn nhầm upload dù chính người dùng vừa
  tạo folder đó).
- FR-B2.5: Nếu tạo folder lỗi ở chế độ grouped → dừng lại, báo lỗi, **không
  upload file nào cả**. Không rollback nếu upload file giữa chừng lỗi sau
  khi folder đã tạo thành công (rủi ro đã tồn tại sẵn ở chế độ separate).
- FR-B2.6: `uploadFilesToTarget` là hàm dùng **chung** cho mọi nguồn upload
  (single/multi picker, kéo-thả ngoài, nhánh grouped) — tính `nextIndex`
  1 lần rồi loop tăng dần cho `fileIndex`, áp
  `buildScopedPayload(targetSpace, targetLegalReferenceId)`.
  `options.metadata.title` chỉ override tên file khi **đúng 1 file** trong
  batch.

### FR-B3 — Upload cả 1 folder từ máy (`uploadFolderFilesToTarget` /
`executeFolderUpload`)

- FR-B3.1: 2 entry point: menu "Upload Folder" (`webkitdirectory`) → modal
  xác nhận (`bulkConfirmOpen`) → `executeFolderUpload`; hoặc kéo-thả 1 thư
  mục thật từ OS (`readDroppedFiles`/`readDirectoryEntries`, có fallback
  cho trình duyệt không hỗ trợ `getAsEntry`).
- FR-B3.2: Dựng lại cây folder từ `webkitRelativePath`/`_dropRelativePath`:
  sort path theo độ sâu tăng dần, tạo folder cha trước con, map
  `path → folderId` để gán `parentId`/`folderId` đúng khi tạo file.
- FR-B3.3: Có thanh tiến trình (`bulkProgress`/`bulkPercent`) khi nhiều
  file; `showProgress: false` khi gọi từ luồng kéo-thả (dùng overlay riêng).

### FR-B4 — Kéo-thả file/folder ngoài OS vào trực tiếp UI

- FR-B4.1: `handleContentDragEnter/DragOver/DragLeave` (toàn vùng Content) +
  `rowDragProps` riêng trên từng row — thả vào 1 folder cụ thể upload thẳng
  vào đó; thả vào vùng trống upload vào `selectedFolderId` hiện tại.
- FR-B4.2: `canUploadDroppedItems(targetFolderId)` chặn ở Trash/Recent/
  gallery (`isEntityGallery`) và theo `canCreate`.
- FR-B4.3: Overlay full-screen hiện đè khi đang kéo (`externalDropActive`)
  hoặc đang upload (`externalUploadInProgress`).

### FR-B5 — Sắp xếp thủ công trong cùng folder (sort mode "manual")

- FR-B5.1: `reorderFileAroundTarget(sourceId, targetRecord, position)` chèn
  file nguồn vào đúng vị trí trước/sau file đích trong mảng đã sort theo
  `fileIndex`, ghi lại `fileIndex` tuần tự cho **toàn bộ sibling** (cả nơi
  cũ nếu khác folder).
- FR-B5.2: Tự động chuyển `sortMode` về `"manual"` sau khi kéo — kéo khi
  đang sort "Newest"/"Name" sẽ không thấy hiệu lực nên phải ép về đúng mode.

### FR-B6 — Move (di chuyển) — `handleMoveRecord`

> Mảng nghiệp vụ được yêu cầu mô tả chi tiết riêng.

- FR-B6.1: **Điều kiện thực hiện** — check quyền **2 lần**, cả hai đều phải
  đạt:
  1. `canMove` **trên chính record** đang di chuyển (folder hoặc document) —
     xem FR-A1.4/FR-A3.
  2. `canCreate` **trên folder đích** — không cho phép move vào 1 vị trí mà
     user không có quyền ghi (kể cả khi có quyền move ở nguồn).
- FR-B6.2: **Ràng buộc cấu trúc cây** — chặn move 1 folder vào **chính nó**
  hoặc vào **con cháu của chính nó** (`getDescendantIds`), tránh tạo vòng
  lặp vô hạn trong cây `parentId`.
- FR-B6.3: **Phạm vi đích hợp lệ** — folder đích được chọn từ tập
  `visibleFolders` (FR-A2.5) hiện có trong `activeSpace` đang mở; UI không
  cung cấp thao tác move xuyên nhiều `activeSpace` cùng lúc (space là điều
  hướng flat, không lồng nhau — mục 4).
- FR-B6.4: **Tác dụng phụ bắt buộc** — sau khi move (đặc biệt khi đích và
  nguồn khác folder), phải reindex `fileIndex` cho cả folder nguồn lẫn
  folder đích (FR-B5.1 cùng cơ chế) để không để lại khoảng trống/trùng số
  thứ tự trong sort mode "manual".
- FR-B6.5: **Move folder** kéo theo toàn bộ cây con (subfolder + file) đi
  cùng — quyền/`storageType`/`moduleScope` của các record con **không**
  bị thay đổi chỉ vì đổi `parentId` (khác hẳn xoá mềm ở FR-B8, vốn set
  `isDeleted` hàng loạt cho cả cây con).
- FR-B6.6: Move không có cơ chế "undo" tự động trong UI — muốn hoàn tác
  phải move ngược lại thủ công.

### FR-B7 — Rename & Inline-edit metadata

- FR-B7.1: `startEditTitle`/`handleSaveFileTitle` — sửa **tên** record
  (khác cơ chế với 8 field metadata khác).
- FR-B7.2: `InlineEditCell` (component độc lập, tự quản lý state edit riêng)
  — sửa 8 field metadata (FR mô tả ở mục 3) trực tiếp trong Table view,
  không cần modal:
  - Click vào ô → chuyển input tại chỗ, autofocus, nạp giá trị hiện tại.
  - Enter (field text) hoặc blur (mọi loại field) → lưu qua
    `saveRecordField(record, field, value)`. Textarea **không** lưu bằng
    Enter (Enter xuống dòng).
  - Escape → huỷ, quay về hiển thị cũ.
  - Mọi field cho lưu **rỗng** — không field nào bắt buộc.
  - Lưu lỗi → `message.error`, **giữ nguyên** giá trị đang gõ (không tự
    revert).
  - Không có quyền `canRename` → hiển thị text tĩnh, không render input.
  - **Không áp dụng ở Trash** — luôn hiển thị text tĩnh dù có quyền.
- FR-B7.3: Khoá cứng `isRenameLockedFolder` (5 folder mẫu hệ thống — mục 8
  quy tắc 1) chặn đổi **tên**, **không** chặn 8 field metadata khác.

### FR-B8 — Xoá mềm (Trash) / Khôi phục / Xoá vĩnh viễn

- FR-B8.1: `showDeleteConfirm`/`handleDeleteFile` — xoá mềm
  (`isDeleted: true`). **Admin-only ngoài Personal space**
  (`isAdminUser(currentUser) || activeSpace === MY_DOCUMENT_STORAGE_TYPE`).
- FR-B8.2: Khoá cứng — không xoá được: 5 folder mẫu hệ thống (mục 8 quy tắc
  1) và Legal Study root (`isLegalStudyRootFolder`).
- FR-B8.3: Xoá 1 folder kéo theo xoá mềm **toàn bộ** subfolder + file bên
  trong (`getDescendantIds` rồi update hàng loạt qua filter `$in`).
- FR-B8.4: `canViewTrashRecord` — Trash chỉ hiện item mà **chính user đó**
  đã xoá (so `deletedById`/`updatedById` với user/lawyer hiện tại), admin
  thấy tất cả. **Khác hẳn** view thường (lọc theo quyền folder) — Trash lọc
  theo "ai đã bấm xoá".
- FR-B8.5: `handleRestoreRecord`/`handlePermanentDelete` — hard delete
  **admin-only tuyệt đối** (mọi role khác kể cả Manager/Owner chỉ được xoá
  mềm + khôi phục).
- FR-B8.6: Side-effect đặc thù khi restore/destroy 1 folder gốc Legal Study
  độc lập: đồng bộ luôn `isDeleted` của record `legalStudy` tương ứng
  (`restoreLegalStudyRecordIfNeeded`/`destroyLegalStudyRecordIfNeeded`).
- FR-B8.7: Tương tự cho Case Study (`restoreCaseStudyRecordIfNeeded`), **chỉ
  áp cho restore, không áp cho hard delete** — xoá 1 file dưới Case Study
  không được kéo theo xoá cả record entity.

### FR-B9 — Bulk actions (chọn nhiều dòng)

- FR-B9.1: `canBulkSelectRecord` (check per-row) + `bulkSelectableKeys`
  (Set) → `bulkRowSelection` cho Ant Design `Table`.
- FR-B9.2: `getBulkRecordsWithPermission` là lớp **defense-in-depth**:
  re-check quyền từng record ngay trước khi thực thi hành động hàng loạt
  (không tin tưởng hoàn toàn checkbox đã disable đúng), tự
  `setSelectedRowKeys([])` nếu phát hiện có record không đủ quyền lọt qua.

### FR-B10 — Share & Quản lý quyền (UI)

- FR-B10.1: `FileShareModal` — share **1 document** cho danh sách `users`
  cụ thể (Nocobase user, **khác** khái niệm Manager/Member theo lawyer).
- FR-B10.2: `PermissionManagerModal` — modal Manager + Members dùng
  **chung** cho cả folder (`kind: "folder"`) và entity Case Study/Legal
  Study (`kind: "legal_study"`), nhận `loadPermissions`/`savePermissions`
  làm adapter — bản thân component không biết đang sửa quyền của cái gì.
  - Manager là 1 `Select` riêng (không gộp chung list với Members).
  - "Add members" chọn nhiều người 1 lần (`Select mode="multiple"`).
  - Role list của Members chỉ còn `viewer/editor/contributed`
    (`ENTITY_MEMBER_ROLE_OPTIONS`) — **không** có "manager" lẫn trong đó.

---

## 7. UI Components (tổng hợp)

| Component | Vai trò |
|---|---|
| `PreviewModal` | Xem trước file (PDF/Office qua MS viewer/ảnh/video/audio/text-code có highlight dòng/không hỗ trợ → nút Download) |
| `PermissionManagerModal` | Xem FR-B10.2 |
| `FileShareModal` | Xem FR-B10.1 |
| `DocumentUploadFieldsModal` | Modal nhập metadata khi upload (FR-B2) |
| `InlineEditCell` | Sửa nhanh 1 field trong Table (FR-B7.2) |
| `DocumentPickerField` | Picker file/folder dùng lại ở form tạo Case Study/Legal Study mới |

**Table view** — 3 nhóm cột tuỳ dữ liệu hiện tại (toàn folder / toàn file /
hỗn hợp), mỗi nhóm tách trash/non-trash riêng (6 nhánh render tổng cộng).
**Grid/Card view** (`viewMode === "grid"`) — card vuông cho folder
(icon + tên + đếm con + ngày tạo) và file (thumbnail theo extension qua
`FILE_TYPE_SVG`/`getFileSvgIcon` + badge extension).

**Context menu** (`renderContextMenuItems`) — build động theo
`getRecordPerms(record)`, dùng chung 1 `<Dropdown>` ẩn cho mọi row (không
tạo `<Dropdown>` riêng từng dòng — tối ưu render). Có context menu **thứ
hai** riêng cho entity gallery card (`entityContextMenu`).

**Activity Log** (`activeSpace === "recent"`) — đọc `activity_log:list`,
`resolveActivityActionInfo`/`resolveActivityDesc` map action → label/màu/
icon/mô tả. Lọc trùng: 1 hành động xoá/khôi phục thủ công
(`trash_deleted`/`restored`) và bản ghi tự động (`updated`+`isDeleted`) có
thể trùng nhau trong khoảng 60s — chỉ giữ 1 bản ghi qua
`hasNearbyManualTrashLog`.

---

## 8. Bất biến nghiệp vụ quan trọng (Critical Invariants)

> Test case P0 phải bảo vệ đúng các bất biến này.

1. **INV-1**: `folderManagers`/`folderMembers` của **subfolder** không bao
   giờ được đọc để tính quyền — chỉ đọc trên **root** của cây. UI
   "Permissions" chỉ được phép hiện ở folder gốc.
2. **INV-2**: Case Study/Legal Study **không có** owner/`createdById`
   bypass — đổi Manager phải làm mất quyền ngay với người tạo cũ, kể cả với
   chính record họ tạo.
3. **INV-3**: 5 folder mẫu hệ thống (`folderTemplateKey`) không đổi tên/xoá
   được, **kể cả admin**.
4. **INV-4**: Folder gốc (root) — bất kỳ loại root nào (Case, Personal,
   Company Shared, Legal Study standalone) — không bao giờ xoá được.
5. **INV-5**: Hard delete (Permanently delete) **admin-only tuyệt đối** —
   không role nào khác (kể cả Manager/Owner/Contributed) thực hiện được.
6. **INV-6**: Trash lọc theo **"ai đã xoá"** (`deletedById`/`updatedById`),
   không lọc theo quyền folder như view thường.
7. **INV-7**: `fileIndex` phải được reindex lại sau **mọi** thao tác làm
   lệch thứ tự (move, xoá, thêm vào giữa danh sách) — không được để sót.
8. **INV-8**: Move phải luôn check đủ **2 điều kiện** (`canMove` trên
   record + `canCreate` trên đích) — thiếu 1 trong 2 là lỗi bảo mật.
9. **INV-9**: Không được move 1 folder vào chính nó hoặc vào con cháu của
   chính nó (tránh vòng lặp `parentId`).
10. **INV-10**: `InlineEditCell` không bao giờ hiển thị/hoạt động trong
    Trash, dù user có quyền `canRename` trên record đó.

---

## 9. Test Cases

Ký hiệu: **P0** = phải test trước khi release (bảo vệ Critical Invariant),
**P1** = quan trọng, **P2** = phụ.

### 9.1. Phân quyền — Role-based & Root-only (folder thường)

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-01 | P0 | User là Viewer trên 1 folder root | Mở folder đó, thử rename/move/delete/share | Không thấy các action này trong context menu (hoặc bị disable); chỉ thấy Upload/View/Download |
| TC-02 | P0 | User là Contributed trên 1 folder root | Mở folder, thử rename/move/delete/share 1 file bên trong | Tất cả thao tác thành công |
| TC-03 | P0 | User là Contributed (không phải Manager) | Mở menu "Permissions" trên folder root | Không thấy menu này (chỉ Manager/Owner/Admin có `canManagePermissions`) |
| TC-04 | P0 | User là Owner (`createdById` = user hiện tại) trên folder root, không có tên trong `folderManagers`/`folderMembers` | Thao tác đầy đủ (rename/move/delete/share/permissions) | Tất cả thành công — Owner tương đương `roleToPerms("owner")` full quyền như Manager |
| TC-05 | P1 | User có role trong `folderMembers` **của 1 subfolder** (không phải root), khác role ở root | Mở subfolder đó | Quyền áp dụng là quyền resolve từ **root**, bỏ qua hoàn toàn role gán riêng ở subfolder (bảo vệ INV-1) |
| TC-06 | P1 | Folder có `projectId` = Case A, folder cha (ngoài phạm vi) không cùng `projectId` | Gọi `resolveFolderTreeRoot` (qua thao tác cần resolve quyền) | Việc leo cha dừng đúng tại ranh giới Case, không leo tiếp ra ngoài phạm vi Case A |
| TC-07 | P1 | File không thuộc folder nào user có quyền, nhưng được share riêng qua `documentShares` | Mở file đó (`shared_with_me` hoặc link trực tiếp) | `canView: true`, role hiển thị "shared"; các quyền khác (move/delete/share) mặc định không có trừ khi cấu hình thêm |
| TC-08 | P2 | Admin user | Vào bất kỳ folder/space nào, kể cả không phải Manager/Member | Luôn có full quyền (trừ khoá xoá Legal Study root — xem TC-24) |

### 9.2. Phân quyền — Entity (Case Study / Legal Study)

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-09 | P0 | User A tạo 1 Legal Study, tự động là Manager | User A upload file, quản lý folder bên trong | Toàn quyền — vì đang là Manager, **không** phải nhờ owner bypass |
| TC-10 | P0 | Cùng Legal Study ở TC-09, Manager đổi từ User A sang User B | User A (đã bị đổi) thử mở lại Legal Study đó | User A **mất quyền ngay lập tức** dù chính họ đã tạo record — xác nhận INV-2 (không có owner/`createdById` bypass) |
| TC-11 | P1 | User C được thêm làm Member role `editor` trong `legalMembers` của 1 Legal Study | User C thử move 1 file bên trong | Bị chặn (`canMove: false` theo tier Editor — FR-A3) |
| TC-12 | P1 | User D là Member role `contributed` | User D thử move/xoá 1 file | Thành công (tier Contributed có `canMove`/`canDelete`) |
| TC-13 | P1 | User E là Member (bất kỳ tier nào) của 1 Legal Study | Mở modal "Permissions" | Không thấy menu (chỉ Manager có `canManagePermissions`); danh sách role gán được cho Member khác chỉ gồm viewer/editor/contributed, không có "manager" |
| TC-14 | P2 | 1 folder/document nằm sâu trong cây Legal Study (không phải folder gốc), có `legalStudyId` gắn trực tiếp | Check quyền user | Bridge đúng sang entity permission (không lỡ rơi vào nhánh root-only permission của folder thường) |
| TC-15 | P1 | Case Study (`legal_reference`) chưa có folder thật (mới tạo, chưa upload gì) | User thử upload file đầu tiên | `getFolderPermsById("", "legal_reference")` bridge thẳng sang entity permission qua `activeLegalReferenceId`, không báo lỗi "không có quyền" sai |

### 9.3. Move file/folder

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-16 | P0 | User có `canMove` trên file, **không** có `canCreate` trên folder đích dự kiến | Kéo-thả (hoặc dùng action Move) file vào folder đích đó | Bị chặn — cảnh báo không đủ quyền tại đích, file **không** bị di chuyển |
| TC-17 | P0 | User có `canCreate` trên đích, **không** có `canMove` trên chính file (vd Viewer) | Thử move | Bị chặn ngay từ đầu — không thấy action Move khả dụng, hoặc bị từ chối nếu cố thực hiện |
| TC-18 | P0 | Folder A có subfolder B | Thử move folder A vào chính B (con cháu của A) | Bị chặn — không cho phép tạo vòng lặp `parentId` (bảo vệ INV-9) |
| TC-19 | P0 | Folder A | Thử move folder A vào chính nó | Bị chặn |
| TC-20 | P1 | Folder đích đang sort mode "manual", đã có 3 file với `fileIndex` 0/1/2 | Move 1 file mới vào giữa danh sách (vị trí thứ 2) | `fileIndex` của toàn bộ file trong folder đích được reindex lại tuần tự, không có khoảng trống/trùng số |
| TC-21 | P1 | File đang ở folder nguồn (sort "manual", có `fileIndex`) | Move file đó sang folder khác | `fileIndex` của các file **còn lại ở folder nguồn** cũng được reindex lại (không để lại lỗ hổng thứ tự) |
| TC-22 | P1 | Folder cha có 2 subfolder + 5 file bên trong | Move folder cha sang vị trí khác (cùng space) | Toàn bộ cây con (2 subfolder + 5 file) đi theo đúng vị trí mới; `moduleScope`/`storageType`/quyền của các record con không bị thay đổi chỉ vì di chuyển |
| TC-23 | P2 | 2 màn hình/session khác nhau (giả lập 2 user) | User A move file trong khi User B đang mở đúng folder đó | Sau khi User B reload/`loadData()`, thấy đúng trạng thái mới; không có race condition làm hỏng `fileIndex` |

### 9.4. Xoá mềm / Trash / Khôi phục / Xoá vĩnh viễn

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-24 | P0 | User không phải admin, đang ở Legal Study root | Thử xoá folder gốc Legal Study | Bị chặn — kể cả admin cũng không xoá được root (INV-4), riêng trường hợp Legal Study root còn khoá thêm ở tầng logic riêng |
| TC-25 | P0 | 1 trong 5 folder mẫu hệ thống (`folderTemplateKey` có giá trị) | Admin thử xoá | Bị chặn tuyệt đối, kể cả admin (INV-3) |
| TC-26 | P0 | User A (không phải admin, không ở Personal space) sở hữu quyền `canDelete` trên 1 file (vd Contributed) | User A thử xoá mềm file | Bị chặn — ngoài Personal space, xoá mềm **admin-only** dù có `canDelete` theo tier |
| TC-27 | P0 | User đang ở Personal space, sở hữu file của chính mình | Xoá mềm file | Thành công (Personal space là ngoại lệ cho phép non-admin xoá) |
| TC-28 | P0 | Folder cha có 2 subfolder + 3 file | Admin xoá mềm folder cha | Toàn bộ subfolder + file bên trong đều bị đánh dấu `isDeleted: true` |
| TC-29 | P1 | User A xoá mềm file X, User B (cùng quyền xem folder đó) chưa từng xoá gì | User B mở Trash | Không thấy file X (Trash lọc theo `deletedById`, không theo quyền folder — INV-6) |
| TC-30 | P1 | Admin | Mở Trash | Thấy toàn bộ item đã xoá của mọi user |
| TC-31 | P0 | User không phải admin, có file trong Trash do chính mình xoá | Thử "Permanently delete" | Bị chặn — hard delete admin-only tuyệt đối (INV-5), user chỉ có action Restore |
| TC-32 | P1 | Admin, có 1 folder gốc Legal Study độc lập đã bị xoá mềm | Admin restore folder đó | Record `legalStudy` tương ứng cũng được đồng bộ khôi phục (`isDeleted` → false) |
| TC-33 | P1 | Admin, permanently delete 1 folder gốc Legal Study độc lập | Thực hiện hard delete | Record `legalStudy` tương ứng cũng bị destroy đồng bộ |
| TC-34 | P1 | Admin, restore 1 file nằm dưới 1 Case Study | Restore file đó (không phải folder gốc Case Study) | Restore thành công, **không** kéo theo thay đổi trạng thái của record `legalReference` (side-effect restore Case Study chỉ áp cho đúng root, không áp khi restore 1 file lẻ) — verify theo FR-B8.7 |
| TC-35 | P2 | Admin, hard delete 1 file lẻ dưới Case Study (không phải root) | Thực hiện permanently delete | Chỉ file đó bị xoá vĩnh viễn, record `legalReference` **không** bị ảnh hưởng (hard delete không áp side-effect Case Study) |

### 9.5. Upload / Workflow (tạo folder, upload đơn/nhiều, gom nhóm, upload folder, kéo-thả)

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-36 | P1 | User có `canCreate` tại folder đích | Bấm "New folder", nhập tên, submit | Folder mới được tạo với payload scope đúng theo `activeSpace` hiện tại (`applyFolderSpacePayload`) |
| TC-37 | P0 | User **không** có `canCreate` tại folder đích | Thử tạo folder | Bị chặn ngay, không gọi API tạo |
| TC-38 | P1 | Space cần chọn company (vd Company Shared) | Tạo folder mà chưa chọn company | `requireCompany()` chặn, báo lỗi yêu cầu chọn company trước |
| TC-39 | P1 | Space không cần company (Legal Study/Personal/Shared-with-me) | Tạo folder | Không bị chặn bởi `requireCompany()` |
| TC-40 | P1 | Chọn đúng 1 file để upload | Upload | Modal metadata hiện đầy đủ field, không có toggle "separate/grouped" (chỉ hiện khi ≥2 file) |
| TC-41 | P1 | Chọn 3 file để upload | Upload, để mặc định "Upload as separate files" | 3 file rời được tạo trong folder đích, mỗi file `fileIndex` tăng dần đúng thứ tự |
| TC-42 | P0 | Chọn 3 file, chuyển sang "Group into a new folder", nhập tên folder | Submit | 1 folder mới được tạo trước, sau đó 3 file được đặt vào **trong** folder mới đó; toàn bộ field metadata không được thu thập (đã ẩn) |
| TC-43 | P0 | Như TC-42 nhưng **không nhập** tên folder | Thử submit | Bị chặn validate (tên folder bắt buộc), không tạo folder, không upload file nào |
| TC-44 | P0 | User có `canCreate` tại folder cha nhưng **chưa test lại quyền trên folder con vừa tạo** | Upload gom nhóm (TC-42) | Không bị chặn nhầm "no permission" ở bước upload N file vào folder mới (nhờ `skipPermissionCheck: true`) — bảo vệ đúng bẫy đã ghi nhận trong tài liệu pattern |
| TC-45 | P1 | Đang ở chế độ grouped, xảy ra lỗi khi tạo folder (vd mất mạng) | Submit | Dừng lại, báo lỗi, không có file nào được upload |
| TC-46 | P1 | Chọn menu "Upload Folder" từ máy, thư mục có cấu trúc con lồng nhau (2-3 cấp) | Chọn thư mục, xác nhận | Toàn bộ cây folder được dựng lại đúng cấu trúc, file nằm đúng folder tương ứng, có thanh tiến trình khi nhiều file |
| TC-47 | P1 | Kéo-thả 1 thư mục thật từ OS (Explorer/Finder) vào vùng Content | Thả vào | Upload thành công tương tự TC-46, hiện overlay "Uploading..." thay vì modal tiến trình riêng |
| TC-48 | P1 | Kéo-thả file vào đúng 1 folder card cụ thể (không phải vùng trống) | Thả | File được upload thẳng vào folder đó, không phải vào `selectedFolderId` hiện tại nếu khác |
| TC-49 | P0 | Đang ở Trash hoặc gallery (`isEntityGallery`) | Kéo-thả file vào | Bị chặn upload — `canUploadDroppedItems` từ chối ở 2 ngữ cảnh này |
| TC-50 | P2 | Không có `canCreate` tại vị trí đang kéo-thả tới | Kéo-thả file vào | Bị chặn, hiện cảnh báo không đủ quyền |

### 9.6. Rename / Inline-edit metadata

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-51 | P0 | 1 trong 5 folder mẫu hệ thống | Thử đổi **tên** folder | Bị chặn (`isRenameLockedFolder`) |
| TC-52 | P1 | Cùng folder mẫu ở TC-51 | Sửa field `description` (không phải tên) qua InlineEditCell | Thành công — khoá chỉ áp cho tên, không áp field metadata khác (FR-B7.3) |
| TC-53 | P1 | User có `canRename` trên 1 file | Click vào ô Description trong Table view | Ô chuyển thành textarea, autofocus, giá trị hiện tại được nạp |
| TC-54 | P1 | Đang sửa 1 field text (vd `senderName`) | Nhấn Enter | Lưu ngay, không cần blur |
| TC-55 | P1 | Đang sửa field `description` (textarea) | Nhấn Enter | Xuống dòng bình thường, **không** lưu |
| TC-56 | P1 | Đang sửa bất kỳ field nào | Click ra ngoài ô (blur) | Lưu giá trị |
| TC-57 | P1 | Đang sửa 1 field, đã gõ giá trị mới | Nhấn Escape | Huỷ, quay về giá trị cũ, không gọi API |
| TC-58 | P1 | Đang sửa field `documentCode` | Xoá hết nội dung, để rỗng, blur | Lưu thành công giá trị rỗng — không field nào bắt buộc |
| TC-59 | P0 | Lưu field bị lỗi mạng/API | Sửa giá trị, blur | Hiện `message.error`, ô **vẫn giữ nguyên** giá trị vừa gõ (không tự revert về giá trị cũ), sửa lại được ngay |
| TC-60 | P0 | User không có `canRename` trên record | Click vào ô Description | Không có phản ứng — hiển thị text tĩnh, không render input |
| TC-61 | P0 | Record đang nằm trong Trash | Click vào ô metadata bất kỳ, kể cả với record có `canRename` | Luôn hiển thị text tĩnh, không cho sửa (INV-10) |

### 9.7. Bulk actions

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-62 | P1 | Danh sách gồm cả record có quyền và không có quyền thao tác hàng loạt | Chọn nhiều dòng bằng checkbox | Checkbox của record không đủ quyền bị disable, không chọn được |
| TC-63 | P0 | Đã chọn nhiều record hợp lệ, giữa chừng quyền của 1 record bị thay đổi (vd bị người khác đổi role) trước khi bấm thực thi | Bấm thực thi hành động hàng loạt (vd Delete) | `getBulkRecordsWithPermission` re-check lại, phát hiện record không đủ quyền → tự bỏ chọn toàn bộ (`setSelectedRowKeys([])`), không thực thi nhầm trên record đó |
| TC-64 | P1 | Chọn nhiều file hợp lệ | Thực hiện bulk delete | Toàn bộ file được xoá mềm đúng, Trash ghi nhận đúng người xoá cho từng file |

### 9.8. Navigation / Space

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-65 | P1 | Space "customer" | Chọn 1 Customer | Hiện thẳng danh sách folder gốc của mọi Case thuộc customer đó (không qua bước danh sách tên Case trung gian) |
| TC-66 | P1 | Space "legal_study" | Click vào 1 card Case có folder Legal Study | Nhảy thẳng vào đúng folder Legal Study của Case đó (`selectedFolderId` = id thật, không qua sentinel "root") |
| TC-67 | P1 | Đang ở sâu trong 1 folder (breadcrumb nhiều cấp) | Click từng breadcrumb node | Điều hướng đúng tới folder tương ứng; riêng node `"case_info"` (chỉ có ở Legal Study space) click không điều hướng |
| TC-68 | P2 | Chuyển giữa các `activeSpace` khác nhau liên tục | Click qua lại sidebar | Không rò rỉ state cũ (selectedFolderId/breadcrumb reset đúng theo space mới) |

### 9.9. Share & Quản lý quyền (UI)

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-69 | P1 | User có `canShare` trên 1 document | Mở FileShareModal, chọn danh sách users, submit | Document được share cho đúng danh sách user đã chọn, các user đó thấy document ở "Shared with me" |
| TC-70 | P0 | User là Manager của 1 folder root | Mở PermissionManagerModal, đổi Manager sang người khác, thêm nhiều Member cùng lúc (multi-select) | Manager cũ mất `canManagePermissions` ngay sau khi lưu; toàn bộ Member mới được thêm đúng role đã chọn |
| TC-71 | P1 | Mở PermissionManagerModal cho 1 subfolder (không phải root) | Quan sát UI | Không có entry point để mở modal này ở subfolder — menu "Permissions" chỉ xuất hiện tại folder gốc (INV-1) |
| TC-72 | P1 | Mở PermissionManagerModal cho 1 entity (Legal Study) | Quan sát danh sách role gán được cho Member | Chỉ có viewer/editor/contributed, không có "manager" trong list (Manager là 1 Select riêng) |

### 9.10. Sắp xếp thủ công (reorder) & Activity Log

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-73 | P1 | Folder đang sort theo "Newest" (không phải manual), có ≥3 file | Kéo-thả đổi vị trí 2 file | Sau khi thả, `sortMode` tự chuyển sang "manual", thứ tự hiển thị đúng theo vừa kéo |
| TC-74 | P1 | Đang ở "recent" space | Thực hiện 1 hành động xoá mềm thủ công rồi ngay sau đó có 1 update tự động ghi `isDeleted` (trong vòng 60s) | Activity Log chỉ hiện **1** bản ghi (đã lọc trùng qua `hasNearbyManualTrashLog`), không hiện lặp 2 dòng cho cùng 1 hành động |

---

## 10. Phụ lục

### 10.1. Tài liệu tham chiếu

- [nocobase-docs/library-js-architecture-reference.md](nocobase-docs/library-js-architecture-reference.md) — kiến trúc/business logic/UI-UX đầy đủ của Library.js.
- [nocobase-docs/document-inline-edit-upload-grouping-pattern.md](nocobase-docs/document-inline-edit-upload-grouping-pattern.md) — chi tiết 2 tính năng inline-edit metadata và gom nhóm upload.
- [nocobase-docs/document-system.md](nocobase-docs/document-system.md) — tài liệu hệ sinh thái Nocobase dùng chung cho dự án.
- `CLAUDE.md` (project root) — quy ước chung khi viết code trong repo (không `fetch()`, không import, dùng `ctx.sql()`...).

### 10.2. Ngoài phạm vi tài liệu này

- Luồng "Move to Library" tích hợp từ `TaskDetailView.js` (Task/
  ProjectInternal đưa file vào Knowledge từ module khác) — xem tài liệu
  riêng của module Task nếu cần.
- Đồng bộ chi tiết `CaseDocument.js`/`CustomerDocument.js`/
  `DocumentDashboard.js` theo Library.js — xem mục 8-9 của
  `library-js-architecture-reference.md`.
- Cấu hình hạ tầng Nocobase (data source, migration, trigger SQL) — xem
  `pgsql/` và tài liệu Nocobase gốc.

### 10.3. Lịch sử cập nhật

| Ngày | Nội dung |
|---|---|
| 2026-08-07 | Tạo mới SRS, phản ánh trạng thái hệ thống sau đợt đồng bộ permission tier 2026-08-05 (viewer/editor/contributed/manager, `PermissionManagerModal` generic). |
