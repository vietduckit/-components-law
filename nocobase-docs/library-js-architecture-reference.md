# Library.js — Tổng kết kiến trúc, business logic, flow, UI/UX

> Mục đích: tài liệu tham chiếu đầy đủ về cách `All Module/Document/Library.js`
> triển khai module Document, để dùng làm chuẩn khi tối ưu/đồng bộ
> `CaseDocument.js` và các file document khác. Đọc cùng với
> [document-inline-edit-upload-grouping-pattern.md](document-inline-edit-upload-grouping-pattern.md)
> (tài liệu đó đi sâu vào đúng 2 tính năng đã port: inline-edit + gom nhóm
> upload — tài liệu này bao quát toàn bộ kiến trúc còn lại).
>
> Do `[[nocobase_single_file_constraint]]`, mọi thứ mô tả dưới đây tồn tại
> **riêng lẻ, trùng lặp** trong từng file document (Library.js,
> CaseDocument.js, CustomerDocument.js, DocumentDashboard.js,
> InternalTemplates.js) — không có module dùng chung. "Đồng bộ" nghĩa là
> copy đúng cách triển khai sang file khác, không phải refactor thành 1 nơi.

## 1. Tổng quan kiến trúc

Library.js là 1 component React độc lập (`InternalTemplates`) render bởi
`ctx.render(React.createElement(InternalTemplates))` ở cuối file — không có
props, tự fetch toàn bộ data qua `loadData()` khi mount.

Cấu trúc file (theo comment `§N` trong code):
- `§1 CONFIG & SETUP` — hằng số, `DASHBOARD_CONFIG`, icon SVG, các hàm
  helper thuần (`extractId`, `formatDate`, `roleToPerms`, permission
  resolvers...) — toàn bộ định nghĩa **ở module scope**, không phụ thuộc
  component state.
- `§2 DATA FETCHING` — các hàm gọi `ctx.api.request` thuần (fetch list,
  create record...), cũng ở module scope.
- `§3 MAIN COMPONENT` — các sub-component dùng chung
  (`PreviewModal`, `PermissionManagerModal`, `FileShareModal`,
  `DocumentUploadFieldsModal`, `InlineEditCell`, `DocumentPickerField`) rồi
  đến component chính `InternalTemplates` chứa toàn bộ state + business
  logic + JSX.
- `§4 RENDER` — 1 dòng `ctx.render(...)`.

`DASHBOARD_CONFIG` là điểm cấu hình trung tâm cho scope dữ liệu của riêng
file này:

```javascript
{
  collection: "internalTemplates",
  moduleScope: "internal_templates",
  moduleScopes: ["internal_templates", "internal_template", "legal_reference", "legal_study", "personal", "knowledge"],
  relationFieldCandidates: [...], // field relation tên "internalTemplates" trên document/folder
}
```

Mỗi file document khác có `DASHBOARD_CONFIG` riêng với `collection`/
`moduleScope`/`moduleScopes` khác (vd `CaseDocument.js`: `collection:
"projects"`, `moduleScope: "case_document"`) — đây là điểm khác biệt **có
chủ đích**, không phải gap cần đồng bộ.

## 2. Data model

Hai collection chính: `folders` và `documents`. Field quan trọng dùng xuyên
suốt:

| Field | Ý nghĩa |
|---|---|
| `parentId` / `folderId` | cha trực tiếp (folder cha của folder, hoặc folder chứa document). `"root"` là sentinel "không có cha" trong state UI, KHÔNG phải giá trị lưu DB (DB lưu `null`) — luôn qua `normalizeParentId`/`getFolderParentId` để chuẩn hoá. |
| `storageType` | không gian lưu trữ tại thời điểm tạo (`"company_shared"`, `"personal"`, `"knowledge"`, `"legal_study"`, ...) — gần như trùng với `activeSpace` lúc tạo nhưng không phải cùng 1 khái niệm (space có thể đổi tên hiển thị mà không đổi storageType). |
| `moduleScope` | dùng để filter khi fetch (`$in: DASHBOARD_CONFIG.moduleScopes`) — mỗi file document query theo `moduleScopes` riêng, nên 1 record chỉ "thuộc về" đúng 1 file document tuỳ theo giá trị này. |
| `folderTemplateKey` | đánh dấu 1 trong 5 folder mẫu hệ thống tự sinh (xem mục 7). |
| `legalStudyId` / `legalReferenceId` | flat-tag trực tiếp trên MỌI folder/document bên trong 1 Legal Study/Case Study (không chỉ folder gốc) — nguồn cấp quyền qua entity Manager/Member (xem mục 3). |
| `createdById` / `updatedById` / `uploadedById` | Nocobase user id — `createdById` của **folder gốc (root)** quyết định quyền "owner" cho cả cây (root-only permission model). |
| `folderManager` / `folderManagers` | quan hệ tới bảng `folderManagers` — chỉ có ý nghĩa khi đọc trên **folder gốc**. |
| `folderMember` / `folderMembers` | tương tự, bảng `folderMembers`, có field `role` (`viewer`/`editor`/`contributed`). |
| `isDeleted` / `deletedAt` | soft-delete — Trash lọc theo field này, không dùng `folders:destroy` thật cho tới khi permanently delete. |
| `fileIndex` | thứ tự thủ công trong 1 folder (sort mode "manual") — phải reindex lại (`reindexFolderFiles`) sau mỗi lần move/xoá/thêm để không bị lẫn thứ tự. |

## 3. Permission model

### 3.1. `roleToPerms(role)` — 6 role: `admin | owner | manager | editor |
viewer | null`

```javascript
canView:              role !== null
canCreate:            admin/owner/manager/editor/viewer
canRename/canMove/canDelete/canShare: admin/owner/manager/editor
canManagePermissions: admin/owner/manager
```

✅ **Đã đồng bộ (2026-08-05)** — `CaseDocument.js`'s `roleToPerms` giờ khớp
byte-for-byte với Library.js's. Người dùng xác nhận đây là chủ ý: capability
tier chuẩn cho Member là **viewer/editor/contributed** (không phải
admin/owner/manager/editor/viewer như base `roleToPerms` gợi ý — xem mục
3.3), cụ thể:

| Tier | Quyền |
|---|---|
| Viewer | Upload/View/Download |
| Editor | Upload/View/Download/Edit/Share |
| Contributed | Upload/View/Download/Edit/Delete/Share/Move |
| Manager | Full access |

`getFolderPermissions`'s nhánh folder-Member (mục 3.2) giờ route qua
`getMemberRoleTierPerms` (dùng chung với entity-Member ở mục 3.3) thay vì
tự check "manager"/"editor"/else-"viewer" — cả 2 file giờ giống hệt nhau.
`FolderPermissionsModal` (CaseDocument.js) đã thêm "Contributed" làm option
thứ 4 trong Select gán role.

### 3.2. Root-only permission — mọi folder/document thừa hưởng quyền từ
**gốc cây (root)** của nó, không phải từ chính nó

- `resolveFolderTreeRoot(folder, allFolders)` — leo `parentId` lên tới khi
  hết cha (hoặc gặp `"root"` sentinel). Có nhánh đặc biệt cho folder gắn
  `projectId`/`caseId` (Case): dừng leo khi cha không còn cùng
  `projectId` — ranh giới đúng bằng `isCaseRootFolder`.
- `getFolderPermissions(folder, user, allFolders, currentLawyerId, entityCtx)`:
  1. Admin → luôn `roleToPerms("admin")` (trừ lock xoá Legal Study root).
  2. Nếu folder có `legalStudyId` → bridge sang **entity permission**
     (mục 3.3), **không** dùng `folderManager`/`folderMembers`.
  3. Ngược lại: resolve `root` qua `resolveFolderTreeRoot`, so
     `root.createdById === user.id` → `"owner"`; không thì tra
     `folderManagers`/`folderMembers` của root.
- `getFilePermissions(file, folder, ...)` — quyền của 1 document = quyền
  của folder cha nó (qua `getFolderPermissions`), cộng thêm: nếu
  không có quyền nào cả nhưng document được share riêng cho user
  (`isRecordSharedWithUser`) → role `"shared"`, `canView: true`.
- `getVisibleFolderIds(allFolders, user, lawyerId, entityCtx)` — trả về tập
  `{accessible, entitled}` folder id user được thấy, dùng để lọc
  `visibleFolders`/`visibleDocs` trước khi hiển thị. Admin thấy tất cả.

### 3.3. Entity permission (Case Study `legal_reference` / Legal Study
`legal_study`) — **KHÔNG** dùng `folderManager`/`folderMembers`

Case Study và Legal Study là 2 collection riêng (`legalReference`,
`legalStudy`), mỗi record có:
- 1 `manager` (belongsTo lawyers, field `managerId`) — set lúc tạo, mặc
  định = người tạo (không tự khoá quyền chính mình).
- Nhiều `members` qua bảng trung gian `legalMembers` (field `role`:
  `viewer`/`editor`/`contributed`, cột FK `legalReferenceId` **hoặc**
  `legalStudyId` — 1 bảng dùng chung cho cả 2 kind).

`resolveLegalEntityFolderPerms(entityId, kind, lwId, entityCtx)` — tra
`entityCtx.legalStudyById`/`entityCtx.legalMemberRoleByStudy` (build 1 lần
trong `loadData`, không fetch lại mỗi lần check quyền) → trả
`roleToPerms("manager")` nếu là manager, hoặc `getMemberRoleTierPerms(role)`
nếu là member. **Không có owner/createdById bypass** — khác hẳn permission
model của folder thường (mục 3.2) — nếu Manager bị đổi người, người tạo cũ
mất quyền ngay, kể cả với record họ tự tạo.

`MEMBER_ROLE_CAPABILITIES` (3 tier, dùng chung cho member folder-based VÀ
entity-based):

```javascript
viewer:      { canCreate: true,  canRename: false, canMove: false, canDelete: false, canShare: false, canEdit: false }
editor:      { canCreate: true,  canRename: true,  canMove: false, canDelete: false, canShare: true,  canEdit: true  }
contributed: { canCreate: true,  canRename: true,  canMove: true,  canDelete: true,  canShare: true,  canEdit: true  }
```

### 3.4. Bridge quyền vào các hàm truy vấn chính

- `getRecordPerms(record)` — dùng ở hầu hết render/action (context menu,
  action buttons, drag...). Admin → admin. Folder → `getFolderPermissions`.
  File → tìm folder cha trong `visibleFolders`, gọi `getFilePermissions`.
- `getFolderPermsById(folderId, space)` — dùng khi chỉ có id (chưa chắc có
  record đầy đủ), vd trước khi upload/tạo folder/move. Case đặc biệt:
  `folderId` rỗng (đang ở "root" sentinel) → xử lý riêng theo `space`
  (`MY_DOCUMENT_STORAGE_TYPE` → luôn `"owner"`; `"legal_reference"` với
  `activeLegalReferenceId` → bridge sang entity permission luôn, vì Case
  Study không có folder thật cho tới khi có subfolder/file đầu tiên).

## 4. Navigation / Space model

`activeSpace` (string) là "không gian" đang xem — sidebar flat menu, không
lồng nhau:

| `activeSpace` | Ý nghĩa | Gallery 2 cấp? |
|---|---|---|
| `"knowledge"` (`KNOWLEDGE_STORAGE_TYPE`) | Kiến thức chung công ty | Không |
| `"customer"` | Tài liệu theo Customer → Case | **Có** — Customer gallery → (gộp) Case-root-folder gallery |
| `"legal_study"` (`LEGAL_STUDY_STORAGE_TYPE`) | "Reference" (label hiển thị, field/logic nội bộ vẫn `legal_study`) | **Có** — gallery flat các Case có folder mẫu Legal Study + Legal Study độc lập (case-less) |
| `"company_shared"` | Thư mục chia sẻ toàn công ty | Không |
| `"legal_reference"` | Case Study (nếu còn dùng — UI hiện đã ẩn phần lớn, chỉ còn lookup) | Không (đã bỏ gallery riêng) |
| `"personal"` (`MY_DOCUMENT_STORAGE_TYPE`) | Tài liệu cá nhân | Không |
| `"shared_with_me"` | Document được share trực tiếp cho user qua `documentShares` | Không |
| `"recent"` | Activity log | Không (bảng riêng) |
| `"trash"` | Thùng rác | Không |

`isEntityGallery` = true khi đang ở 1 trong các bước gallery (chưa chọn
Customer/Case, hoặc đang ở gallery gốc Legal Study) — quyết định render
gallery card/table thay vì Table/Grid tài liệu thường.

**Điểm UX đáng chú ý:** gallery Customer đã được **gộp 2 bước thành 1** —
chọn Customer xong hiện thẳng danh sách **folder gốc của mọi Case** thuộc
customer đó (không phải danh sách tên Case rồi mới vào folder gốc), giảm 1
lượt click. Legal Study gallery cũng tương tự: click card nhảy thẳng vào
đúng folder Legal Study của Case đó (set `selectedFolderId` = id thật của
folder, không qua sentinel `"root"` trung gian).

`breadcrumbs` (useMemo) build lại path từ `selectedFolderId` leo ngược
`parentId` qua `folderMap`, ghép với tên "root" tuỳ `activeSpace`. Có 1 node
đặc biệt `"case_info"` trong Legal Study space — chỉ mang tính mô tả
(Case/Customer sở hữu), click không điều hướng gì (xử lý riêng trong
`handleBreadcrumbClick`).

## 5. CRUD flows

### 5.1. Tạo folder — `handleCreateFolder`
1. Check `getFolderPermsById(selectedFolderId).canCreate`.
2. Check `requireCompany()` (trừ Legal Study/Personal/Shared-with-me —
   3 space không cần chọn company).
3. Build payload cơ bản (`name`, `description`, `type: "custom"`,
   timestamps, `createdById`/`updatedById`).
4. `applyFolderSpacePayload(payload)` — áp field scope theo `activeSpace`
   (xem [pattern doc](document-inline-edit-upload-grouping-pattern.md) mục
   "Hàm cần copy").
5. `createFolderRecord(payload)` → `loadData()`.

### 5.2. Upload file(s) — `handleFileInputTrigger` → modal metadata →
`handleConfirmUploadFields` → `uploadFilesToTarget`

- Click "Upload file" → `fileInputRef.current.click()` (native picker, hỗ
  trợ multi-select) → `handleFileInputTrigger` check quyền rồi mở
  `DocumentUploadFieldsModal` (metadata dùng chung cho cả batch).
- Modal có toggle "Upload as separate files" / "Group into a new folder"
  khi ≥ 2 file (xem pattern doc — tính năng mới nhất).
- `uploadFilesToTarget(files, options)` — hàm dùng **chung** cho MỌI nguồn
  upload (single/multi file picker, kéo-thả file ngoài, và cả nhánh
  grouped ở trên): tính `nextIndex` 1 lần rồi loop tăng dần, áp
  `buildScopedPayload(targetSpace, targetLegalReferenceId)`, gọi
  `createDocumentRecord` từng file. `options.metadata.title` chỉ override
  tên file khi **đúng 1 file** trong batch.

### 5.3. Upload cả 1 folder từ máy — `uploadFolderFilesToTarget` /
`executeFolderUpload`

- 2 entry point: menu "Upload Folder" (`folderInputRef`, dùng
  `webkitdirectory`) → `handleFolderInputTrigger` → modal xác nhận
  (`bulkConfirmOpen`) → `executeFolderUpload`; hoặc kéo-thả 1 thư mục thật
  từ OS vào (đọc qua `readDroppedFiles`/`readDirectoryEntries`, hỗ trợ cả
  trình duyệt không có `getAsEntry`).
- Dựng lại cây folder từ `webkitRelativePath`/`_dropRelativePath`: sort
  path theo độ sâu tăng dần, tạo folder cha trước con, map `path →
  folderId` để gán `parentId`/`folderId` đúng khi tạo file.
- Có thanh tiến trình (`bulkProgress`/`bulkPercent`) cho trường hợp nhiều
  file — `showProgress` option để tắt progress UI khi gọi từ luồng kéo-thả
  (dùng overlay riêng thay vì modal).

### 5.4. Kéo-thả file/folder ngoài OS vào trực tiếp UI

- `handleContentDragEnter/DragOver/DragLeave` (toàn vùng Content) +
  `onDragOver`/`onDrop` riêng trên từng row (`rowDragProps`) — thả vào 1
  folder cụ thể sẽ upload thẳng vào đó, thả vào vùng trống sẽ upload vào
  `selectedFolderId` hiện tại.
- `canUploadDroppedItems(targetFolderId)` chặn ở Trash/Recent/gallery
  (`isEntityGallery`) và theo quyền `canCreate`.
- Overlay full-screen ("Drop files or folders here to upload" /
  "Uploading...") hiện đè khi đang kéo hoặc đang upload
  (`externalDropActive`/`externalUploadInProgress`).

### 5.5. Kéo-thả sắp xếp lại thứ tự file trong cùng folder (sort "manual")

`reorderFileAroundTarget(sourceId, targetRecord, position)` — chèn file
nguồn vào đúng vị trí trước/sau file đích trong mảng đã sort theo
`fileIndex`, ghi lại `fileIndex` tuần tự cho toàn bộ sibling (cả nơi cũ nếu
khác folder). Tự động chuyển `sortMode` về `"manual"` sau khi kéo — kéo khi
đang sort theo "Newest"/"Name" sẽ không thấy hiệu lực nên phải ép về đúng
mode hiển thị thứ tự thủ công.

### 5.6. Move — `handleMoveRecord`

Check quyền 2 lần: `canMove` trên chính record, VÀ `canCreate` trên folder
đích (không cho move vào chỗ không có quyền ghi). Chặn move folder vào
chính nó hoặc vào con cháu của nó (`getDescendantIds`).

### 5.7. Rename — `startEditTitle`/`handleSaveFileTitle` (tên) vs
`InlineEditCell`/`saveRecordField` (8 field metadata khác — xem pattern
doc)

Khoá cứng: `isRenameLockedFolder` (5 folder mẫu hệ thống) chặn đổi **tên**,
không chặn các field khác.

### 5.8. Xoá mềm (Trash) / Khôi phục / Xoá vĩnh viễn

- `showDeleteConfirm`/`handleDeleteFile` — xoá mềm (`isDeleted: true`),
  admin-only ngoài Personal space (`isAdminUser(currentUser) ||
  activeSpace === MY_DOCUMENT_STORAGE_TYPE`), khoá cứng cho 5 folder mẫu
  VÀ Legal Study root (`isLegalStudyRootFolder`).
- Xoá 1 folder kéo theo xoá mềm **toàn bộ** subfolder + file bên trong
  (`getDescendantIds` rồi update hàng loạt qua filter `$in`).
- `canViewTrashRecord` — Trash chỉ hiện item mà **chính user đó** đã xoá
  (so `deletedById`/`updatedById` với user/lawyer hiện tại), admin thấy
  tất cả — khác hẳn view thường (theo quyền folder), Trash lọc theo
  "ai đã bấm xoá".
- `handleRestoreRecord`/`handlePermanentDelete` — hard delete **admin-only
  tuyệt đối**, kèm side-effect đặc thù: restore/destroy 1 folder gốc Legal
  Study độc lập (Group 2) phải đồng bộ luôn `isDeleted` của record
  `legalStudy` tương ứng (`restoreLegalStudyRecordIfNeeded`/
  `destroyLegalStudyRecordIfNeeded`); tương tự cho Case Study
  (`restoreCaseStudyRecordIfNeeded`, chỉ áp cho restore, không áp cho hard
  delete — xoá 1 file dưới Case Study không được kéo theo xoá cả record).

### 5.9. Bulk actions (chọn nhiều dòng)

`canBulkSelectRecord` (per-row) + `bulkSelectableKeys` (Set) →
`bulkRowSelection` cho Ant Design `Table`. `getBulkRecordsWithPermission`
là **defense-in-depth**: re-check quyền từng record ngay trước khi thực
thi (không tin tưởng hoàn toàn vào checkbox đã bị disable đúng), tự
`setSelectedRowKeys([])` nếu phát hiện có record không đủ quyền lọt qua.

## 6. UI Components

| Component | Vai trò |
|---|---|
| `PreviewModal` | Xem trước file (PDF/Office qua MS viewer/ảnh/video/audio/text-code có highlight dòng/không hỗ trợ → nút Download) |
| `PermissionManagerModal` | Modal Manager+Members dùng CHUNG cho folder VÀ entity (Case Study/Legal Study) — nhận `loadPermissions`/`savePermissions` làm adapter, tự nó không biết đang sửa cái gì |
| `FileShareModal` | Share 1 document cho danh sách `users` cụ thể (khác hẳn Manager/Member — đây là share theo Nocobase user, không phải lawyer) |
| `DocumentUploadFieldsModal` | Modal nhập metadata khi upload (xem pattern doc) |
| `InlineEditCell` | Sửa nhanh 1 field ngay trong Table (xem pattern doc) |
| `DocumentPickerField` | Picker file/folder dùng lại ở các form tạo Case Study/Legal Study mới (không phải flow upload chính) |

**Table view** (`tableColumns`, `useMemo`) — 3 nhóm cột tuỳ dữ liệu hiện
tại toàn folder/toàn file/hỗn hợp, mỗi nhóm lại tách trash/non-trash riêng
(6 nhánh tổng cộng). **Grid/Card view** (`viewMode === "grid"`) — card
vuông cho folder (icon + tên + đếm con + ngày tạo) và file (thumbnail theo
extension qua `FILE_TYPE_SVG`/`getFileSvgIcon` + badge extension).

**Context menu** (`renderContextMenuItems`) — build động theo
`getRecordPerms(record)`, dùng chung 1 `<Dropdown>` ẩn (kích thước 1×1px,
định vị theo toạ độ chuột) cho mọi row — không tạo `<Dropdown>` riêng từng
dòng (tối ưu render). Có 1 context menu **thứ hai** riêng cho entity
gallery card (`entityContextMenu`) vì record ở đó không phải
folder/document thường (customer/case/legal-study entry).

**Activity Log** (`activeSpace === "recent"`) — bảng riêng đọc
`activity_log:list`, có `resolveActivityActionInfo`/`resolveActivityDesc`
map action → label/màu/icon/mô tả tiếng Việt-Anh lẫn. Lọc trùng: 1 hành
động xoá/khôi phục thủ công (`trash_deleted`/`restored`) và bản ghi tự
động (`updated`+`isDeleted`) có thể trùng nhau trong khoảng 60s — chỉ giữ
1 bản ghi qua `hasNearbyManualTrashLog`.

## 7. Quy tắc nghiệp vụ đặc biệt cần nhớ

1. **5 folder mẫu hệ thống** (`folderTemplateKey`: `legal_study`,
   `lsc_related`, `legal_docs`, `legal_dossiers`, `report_result`) — do
   `CaseCreateForm.js` tự tạo, **không ai đổi tên/xoá được**, kể cả admin.
   Có fallback nhận diện theo **tên** (case cũ trước khi field
   `folderTemplateKey` tồn tại) — xem `SYSTEM_LOCKED_RENAME_TEMPLATE_NAMES`.
2. **Folder gốc (root) không bao giờ xoá được** — áp dụng chung cho mọi
   loại root (Case, Personal, Company Shared, Legal Study standalone) qua
   `isFolderTreeRoot`/`isLegalStudyRootFolder`.
3. **"Permissions" chỉ hiện ở folder gốc**, không hiện ở subfolder (root-
   only model — sửa quyền ở subfolder sẽ không có tác dụng vì
   `folderManager`/`folderMembers` của subfolder không được đọc bao giờ).
4. **Case Study/Legal Study không có owner/createdById bypass** — khác
   folder thường; đổi Manager là mất quyền ngay với người cũ.
5. **Hard delete (permanently delete) admin-only tuyệt đối**, mọi role
   khác kể cả Manager/Owner chỉ được xoá mềm + khôi phục.
6. **Trash lọc theo "ai xoá"**, không lọc theo quyền folder như view
   thường.
7. **`fileIndex` phải reindex sau mọi thao tác làm lệch thứ tự** (move,
   xoá, thêm vào giữa danh sách) — quên gọi `reindexFolderFiles` sẽ để lại
   khoảng trống/trùng số thứ tự.

## 8. So sánh nhanh với CaseDocument.js (tính đến thời điểm viết tài liệu)

**Cấu trúc khác biệt có chủ đích** (không phải gap):
- Library.js có gallery đa cấp (Customer → Case, Legal Study flat gallery)
  vì phục vụ nhiều Customer/Case cùng lúc; CaseDocument.js chỉ scope 1 Case
  đang mở (`activeCaseIdValue`) nên không cần gallery — hợp lý, không nên
  đồng bộ ngược.
- `DASHBOARD_CONFIG` khác nhau theo đúng domain mỗi file (mục 1).

**Đã đồng bộ** (xem [pattern doc](document-inline-edit-upload-grouping-pattern.md)):
- `resolveFolderTreeRoot` có gate theo case boundary.
- Chặn xoá root folder (mọi loại root).
- Modal upload đa file với metadata phong phú.
- Inline edit 8 field metadata trong Table (`InlineEditCell` +
  `saveRecordField` + `buildDocMetaColumns` — CaseDocument.js trước đây
  chưa có 7/8 cột này ở Table view, đã thêm mới hoàn toàn theo mẫu
  Library.js, không chỉ wiring lại cột có sẵn).
- Upload flow — **2026-08-05: port lại lần 2 để khớp đúng kiến trúc của
  Library.js**, không còn là 1 Modal+Form duy nhất có Dragger nhúng sẵn nữa.
  Giờ CaseDocument.js dùng đúng flow 2 bước của Library.js:
  1. "Upload File" (menu New / nút "+ Add Document" ở empty state / nút
     "+ Upload file" trên 1 folder card cụ thể) → click thẳng vào 1
     `<input type="file" multiple>` ẩn (`fileInputRef`) mở native OS file
     picker — không còn Dragger trong modal nữa.
  2. Chọn file xong (`handleFileInputTrigger`) → check quyền trên đúng
     folder đích (`directFileTargetRef`, không phải lúc nào cũng là
     `selectedFolderId` — nút trên 1 folder card cụ thể set ref = id của
     folder đó rồi mới `setSelectedFolderId` + `setTimeout(...click(), 0)`
     để permission memo kịp cập nhật trước khi dialog OS đóng) → mở
     `DocumentUploadFieldsModal` (component top-level riêng, y hệt cấu trúc
     Library.js, không có Dragger, không có field Google Drive URL) để
     nhập metadata + chọn Radio "separate"/"grouped".
  3. Submit → `handleConfirmUploadFields` tạo folder "grouped" trước (nếu
     chọn) rồi gọi `uploadFilesToTarget` — không re-check permission trên
     folder vừa tạo (tránh đúng bug false "no permission" đã gặp ở
     Library.js, xem pattern doc).
  Đã bỏ hẳn field "Google Drive URL" khỏi luồng tạo mới ở CaseDocument.js
  (theo yêu cầu người dùng, để khớp 100% Library.js — Library chưa từng có
  UI tạo mới bằng URL, chỉ đọc/hiển thị field này cho record cũ). Các
  record cũ có `googleDriveUrl` vẫn xem/preview bình thường — chỉ path tạo
  mới bị gỡ.
- `roleToPerms`/permission tier cho folder Member — xem mục 3.1/3.3, giờ
  khớp byte-for-byte, cả 2 file cùng dùng capability tier
  viewer/editor/contributed/manager.
- Modal phân quyền — **2026-08-05: thay `FolderPermissionsModal` (bespoke,
  chỉ biết sửa folderManagers/folderMembers) bằng `PermissionManagerModal`
  generic y hệt Library.js**:
  - Manager tách thành 1 `Select` riêng (không còn gộp chung 1 list với
    Members rồi chọn role "manager" như trước).
  - "Add members" cho chọn nhiều người 1 lần (`Select mode="multiple"`),
    thay vì thêm từng người một.
  - Role list của Members chỉ còn viewer/editor/contributed
    (`ENTITY_MEMBER_ROLE_OPTIONS`) — không còn "manager" lẫn trong đó.
  - Component nhận `title`/`loadPermissions`/`savePermissions` qua props
    (`permissionModalConfig` useMemo), dùng chung cho 2 loại target qua
    `permissionTarget = { kind: "folder", folder } | { kind: "legal_study",
    record }`:
    - `kind: "folder"` → `loadFolderPermissions`/`saveFolderPermissions`
      (folderManagers/folderMembers, đồng bộ ngược Manager/Members lên
      `projects.managerId/assignees` khi target là root folder của Case
      hiện tại — dùng thẳng `activeCaseRootFolderId`/`activeCaseIdValue`
      đã có sẵn thay vì hàm `isCaseRootFolder`/`getFolderCaseProjectId`
      generic quét `allFolders` như Library.js, vì CaseDocument.js chỉ
      scope 1 Case nên không cần).
    - `kind: "legal_study"` → `loadEntityPermissions`/`saveEntityPermissions`
      (bảng `legalMembers` + field `manager`/`managerId` trên chính record
      legalStudy) — **tính năng mới**, trước đây CaseDocument.js hoàn toàn
      không có UI sửa quyền cho Reference/Legal Study entity (mục
      `canManagePermissions` luôn bị ép `!extractId(record.legalStudyId)`
      để loại trừ hẳn, dù phần đọc quyền — `resolveLegalEntityFolderPerms`
      — đã có sẵn từ trước). Entry point: menu "Permissions" trên context
      menu / row action của 1 folder Reference khi nó là tree root của
      chính nó (`isFolderTreeRoot`) — `rawCanManagePermissions` từ
      `getRecordPerms` đã tự đúng (chỉ true khi user là Manager của đúng
      entity đó, qua `resolveLegalEntityFolderPerms` → `roleToPerms
      ("manager")`), nên chỉ cần bỏ điều kiện loại trừ
      `!extractId(record.legalStudyId)` là đủ — không cần thêm check
      isManager riêng. `openPermissionsForFolder(record)` route: nếu
      record có `legalStudyId` → tra `legalStudyById` lấy record legalStudy
      rồi mở `{kind: "legal_study", ...}`; ngược lại mở `{kind: "folder",
      ...}` như cũ.

**Bẫy thực tế lặp lại y hệt khi port sang CaseDocument.js** (đã có ở
Library.js, gặp lại lần 2): `replace_all` trên block Description giống hệt
text vô tình khớp luôn nhánh **mixed Trash** (không phải chỉ 2 nhánh
non-trash như tính toán) — vì nhánh mixed Trash ở CaseDocument.js cùng cấp
thụt lề với 2 nhánh non-trash khác, khác quy luật "trash luôn thụt lề sâu
hơn" đúng ở isAllFolders/isAllFiles. Luôn đếm lại số occurrence còn lại sau
`replace_all` trước khi commit, đừng tin giả định thụt lề.

**Chưa đối chiếu** (chưa xác nhận CaseDocument.js có/không có, nếu có thì
cách triển khai có khớp Library.js không):
- Kéo-thả file/folder ngoài OS (`handleContentDragEnter`/`readDroppedFiles`).
- Sắp xếp thủ công kéo-thả (`reorderFileAroundTarget`).
- Activity Log filter logic (trùng lặp trash-log 60s...).

## 9. Cách dùng tài liệu này

Khi được giao việc "tối ưu/đồng bộ CaseDocument.js theo Library.js":
1. Đọc mục liên quan ở đây để hiểu Library.js làm gì và tại sao.
2. Đọc code CaseDocument.js **hiện tại** (không suy từ tài liệu cũ) ở đúng
   khu vực tương ứng — line number sẽ lệch theo thời gian.
3. Nếu là 1 trong 2 tính năng đã có pattern doc riêng (inline-edit,
   upload-grouping) → theo checklist ở đó.
4. Nếu là phần khác (permission tier, drag-drop, reorder, activity log...)
   → dùng mục 2-7 ở đây làm spec để implement tương đương, điều chỉnh
   `DASHBOARD_CONFIG`/tên biến scope cho đúng domain của CaseDocument.js.
5. Cập nhật lại mục 8 (so sánh) sau khi đồng bộ xong, để tài liệu không bị
   lạc hậu.
