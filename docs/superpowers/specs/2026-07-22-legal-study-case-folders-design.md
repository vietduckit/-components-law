# Legal Study → Case-Scoped Folders (Design)

## Mục đích

Bỏ khái niệm "Legal Study" như một collection riêng (`legalStudy`, quan hệ
many-to-many chưa xác định rõ với `projects`). Thay vào đó, "Legal Study" trở
thành một **loại folder thật** (`folders` row) sống trực tiếp trong cây folder
của case (`projects`) mà nó thuộc về — dùng đúng cơ chế FK thật
(`projectId`/`caseId`) đã có sẵn cho folder case thường, thay vì quan hệ M:N
brute-force hiện tại.

Phạm vi: chỉ sửa `All Module/Document/Library.js`. Không đụng
`LegalStudyDocument.js`, `LegalStudyCreateBlock.js`, `JsField/JsLegalStudyLinks.js`
(giữ nguyên, sẽ trở thành orphan — không phải việc của task này). Không đụng
backend/Nocobase collection config (người dùng tự xử lý phần xoá/ngừng dùng
collection `legalStudy` ở Nocobase admin).

## Bối cảnh hiện tại (đã research trong `All Module/Document/Library.js`)

- Bảng "Legal Study" hiện tại (`Library.js:13042-13239`, cột config
  `13081-13156`) render từ `legalStudyRecords` (fetch qua `legalStudy:list`,
  `Library.js:4061`) — đã là danh sách phẳng, không lọc theo case.
- Nút "+New"/"+ Create Legal Study" (`Library.js:12063`, `13176`) gọi
  `openCreateLegalStudyModal` (`Library.js:6667-6677`) → mở popup NocoBase
  riêng chạy `LegalStudyCreateBlock.js` (form đầy đủ field + upload optional).
  Có sẵn 1 modal "chết" không ai gọi tới (`isCreateLegalStudyOpen`,
  `Library.js:15390-15648`, submit handler `handleCreateLegalStudy`,
  `Library.js:7254-7322`) — cũng cần xoá vì cùng thuộc luồng bị thay thế.
- `buildScopedPayload("customer", ...)` (`Library.js:6814-6829`) là pattern FK
  thật đã dùng cho folder/document của case: set cả `projectId` và `caseId`
  (2 tên cột khác nhau cho cùng 1 quan hệ, do lịch sử phát triển — `documents`
  chỉ có `caseId`, `folders` chỉ có `projectId`).
- `buildScopedPayload(LEGAL_STUDY_STORAGE_TYPE, ...)`
  (`Library.js:6798-6806`) hiện set `moduleScope: LEGAL_STUDY_MODULE_SCOPE` +
  `buildLegalStudyRelationPayload(legalStudyId)` (M:N cũ, sẽ bỏ).
- Upload hạ tầng đã có sẵn, tái dùng nguyên: `uploadFilesToTarget`
  (`Library.js:6850-6959`, upload phẳng nhiều file) và
  `uploadFolderFilesToTarget` (`Library.js:6961-~7185`, dựng lại cây folder từ
  `webkitdirectory`/drag-drop, dùng `buildScopedPayload` cho mọi folder/file
  tạo ra trong cây).
- Case = `projects` collection ("case" và "project" là cùng 1 collection,
  xác nhận qua `CaseDocument.js`). Tên hiển thị case:
  `projectName || caseCode || "Vụ việc #{id}"` (pattern đang dùng ở
  `Library.js:5739-5754` và `12746-12765`).

## Data model

Folder Legal Study = `folders` row với:
```
moduleScope: LEGAL_STUDY_MODULE_SCOPE   // giữ nguyên hằng số cũ, chỉ đổi cách gắn quan hệ
projectId: <case id>
caseId: <case id>
internalCompanyId: <company id nếu có>
parentFolderId: null   // root folder của "Legal Study" trong case đó
```
Một case có thể có **nhiều** folder Legal Study (mỗi cái 1 chủ đề nghiên cứu
riêng) — không giới hạn 1-case-1-folder. Document/subfolder bên trong kế thừa
cùng `projectId`/`caseId`/`moduleScope` qua `buildScopedPayload`, giống hệt
cách folder case thường hoạt động — không cần logic mới.

## Bảng danh sách Legal Study

Nguồn dữ liệu: `folders:list` lọc `moduleScope: { $eq: LEGAL_STUDY_MODULE_SCOPE }`,
`parentFolderId: { $eq: null }` (chỉ lấy folder gốc, không lấy subfolder lồng
bên trong), toàn bộ case (không lọc theo 1 case cụ thể) — đúng yêu cầu "list
all Legal Study folders của tất cả case hiện tại".

Cột (bỏ "Trạng thái" so với bảng cũ):
1. STT
2. Tên Legal Study (`folder.name`)
3. **Tên vụ việc liên quan** (mới) — lookup `projectId`/`caseId` trong danh
   sách `projects` đã load sẵn trong Library.js, hiển thị
   `projectName || caseCode || "Vụ việc #{id}"`
4. Thư mục (đếm subfolder con cháu, tính theo `folderId` thay vì `legalStudyId`
   — đệ quy qua `folders` đã load, giống cách `legalStudyStats` cũ tính nhưng
   đổi khoá nhóm)
5. File (đếm document con cháu, tương tự)
6. Ngày tạo (`folder.createdAt`)
7. Người tạo (`folder.createdBy?.nickname || .email`)

Click 1 dòng → điều hướng vào đúng folder đó bằng **folder-browser thường của
case** (theo `folderId`), tái dùng code duyệt folder hiện có cho "customer"
space — không dùng `activeLegalStudyId`/UI riêng nữa.

## Luồng tạo mới ("+New")

Thay hoàn toàn luồng mở popup `LegalStudyCreateBlock.js` bằng luồng inline
trong Library.js:

1. Bấm "+New" (hoặc nút empty-state) → mở file input ẩn (multi-file) hoặc
   folder input ẩn (`webkitdirectory`) — tái dùng đúng pattern input ref đã
   có (`fileInputRef`/`folderInputRef`, `Library.js:12116-12131`).
2. Sau khi chọn xong, mở modal nhỏ hỏi:
   - **Tên Legal Study** (bắt buộc; tự điền sẵn = tên folder gốc nếu chọn
     folder qua `webkitdirectory`, để trống nếu chọn multi-file)
   - **Case liên quan** (Select bắt buộc, options từ danh sách `projects`
     Library.js đã load sẵn — label `projectName || caseCode`)
3. Submit:
   - Tạo folder gốc: `folders:create` với payload ở mục "Data model" trên
     (tên = giá trị đã nhập, `parentFolderId: null`).
   - Upload file/cây folder đã chọn vào folder gốc vừa tạo, dùng
     `uploadFilesToTarget`/`uploadFolderFilesToTarget` có sẵn, truyền
     `folderId` = id folder gốc vừa tạo và scope = case đã chọn (không phải
     `legalStudyId` nữa).
   - Reload danh sách Legal Study (fetch lại `folders:list` theo filter trên).

Không còn field: công ty, người quản lý, thành viên, ưu tiên, trạng thái, mô
tả — không mất dữ liệu vì các field này thuộc `legalStudy` collection cũ,
không map sang `folders`.

## Dọn dẹp trong Library.js

Xoá hẳn (không giữ lại làm dead code):
- `openCreateLegalStudyModal` (`Library.js:6667-6677`) và các hằng số chỉ
  phục vụ nó: `LEGAL_STUDY_CREATE_POPUP_UID`, `LEGAL_STUDY_CREATE_VIEW_URL`,
  `LEGAL_STUDY_DATA_BLOCK_UID`.
- Modal chết `isCreateLegalStudyOpen` + form JSX (`Library.js:15390-15648`)
  và `handleCreateLegalStudy` (`Library.js:7254-7322`), cùng state liên quan
  (`createLegalStudyForm`, `createLegalStudyLoading`, v.v.).
- Mọi lời gọi `legalStudy:list`/`legalStudy:create`/`legalStudies:*` API.
- `buildLegalStudyRelationPayload`, `getLegalStudyRelationIdFromPayload`,
  `stripLegalStudyRelationPayload`, `buildLegalStudyRelationVariants`
  (`Library.js:2386-2410`) — chỉ phục vụ quan hệ M:N cũ, không còn dùng.
- `legalStudyRecords`/`activeLegalStudyId` state và mọi nơi tham chiếu tới
  (thay bằng state folder-browser thường tái dùng cho case).
- `legalStudyStats` (`Library.js:5325-5349`) — thay bằng bản tính theo
  `folderId` (mục "Bảng danh sách" ở trên), không xoá tính năng, chỉ đổi
  nguồn tính.

Giữ nguyên, không đụng:
- `LEGAL_STUDY_STORAGE_TYPE`/`LEGAL_STUDY_MODULE_SCOPE` (vẫn dùng làm marker
  loại folder).
- `getLegalStudyDisplayName` — vẫn dùng được cho tên folder (đổi input từ
  `legalStudy` record sang `folders` record, field `name` thay vì
  `title`/`name`/`description`).
- Toàn bộ hạ tầng upload (`uploadFilesToTarget`, `uploadFolderFilesToTarget`,
  `createFolderRecord`, `createDocumentRecord`, `uploadAttachment`).
- `LegalStudyDocument.js`, `LegalStudyCreateBlock.js`,
  `JsField/JsLegalStudyLinks.js` (theo yêu cầu, không đụng — sẽ orphan).
