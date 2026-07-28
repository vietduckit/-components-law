# LegalReferenceWorkspace.js — Case Reference mở rộng phạm vi Case, Legal Study chuyển sang folder-per-case — Design

## Mục đích

`LegalReferenceWorkspace.js` (module "Case-Reference" trong `All Module/Case/`)
hiện có modal "Link Reference" với 3 tab: Legal Reference (standalone),
Case Reference, Legal Study. Cần sửa 2 tab:

1. **Case Reference**: hiện chỉ cho chọn case có cờ `isLegalReference = true`
   — cần mở rộng cho chọn **tất cả** case trong hệ thống.
2. **Legal Study**: hiện lấy dữ liệu từ collection `legalStudy` riêng (record
   phải tạo thủ công qua `LegalStudyCreateBlock.js`) — collection này đã bị
   bỏ theo thiết kế `2026-07-25-legal-study-case-folder-design.md` (xem
   phần Bối cảnh). Cần đổi sang lấy theo folder mẫu
   `folderTemplateKey = "legal_study"` được tự động tạo sẵn cho mỗi Case,
   đúng như cách `Library.js` đã làm.

Yêu cầu thứ 3 ban đầu ("bổ sung reference lấy từ Document/Library.js") đã
**hoãn lại**, không nằm trong phạm vi thiết kế này — chưa chốt được những
"không gian" tài liệu nào (Customer/Case, Company Shared, Personal,
Knowledge...) sẽ được duyệt/chọn.

## Bối cảnh & phát hiện quan trọng (đã research trong code)

- Spec `2026-07-25-legal-study-case-folder-design.md` đã bỏ collection
  `legalStudy` trong `Library.js`, thay bằng folder có
  `folderTemplateKey = "legal_study"` (tự động tạo cho mỗi Case bởi
  `CaseCreateForm.js`, `moduleScope: "case_document"`, `projectId` = case
  đó). Spec đó nói rõ phần "Case Reference" (tức file này) sẽ thiết kế
  riêng sau — đây chính là lúc đó.
- `LegalReferenceWorkspace.js` hiện có khá nhiều hàm/state đã viết sẵn cho
  đúng kịch bản "chọn 1 nguồn rồi duyệt/chọn folder+file con để tạo 1
  reference wrapper" nhưng **chưa từng được gọi tới** (dead code):
  `createSourceWrapperReference`, `renderSourceSelectionPicker`,
  `selectedSourceFolderIds`/`selectedSourceDocumentIds`,
  `toggleSourceFolder`/`toggleSourceDocument`, `getLockedLegalStudySelection`,
  `legalStudyReferenceTouchesStudy`. Tab "Legal Study" hiện tại trong
  `renderLinkModal` chỉ là 1 `Select` đơn giản chọn thẳng 1 record
  `legalStudy` rồi `addRelationLink("legalStudy", caseId, legalStudyId)` —
  không dùng picker folder/file nào cả.
- `legalReference` collection đã có sẵn field `sourceCaseId` (dùng bởi
  `createCaseBasedReference` cho case-based reference) — tái dùng được để
  lưu "case nào sở hữu folder Legal Study nguồn" mà không cần thêm field
  DB mới. `isCaseBasedReference()` đã loại trừ đúng: nếu
  `referenceKind === "legal_study"` thì không bị coi là case-based dù có
  `sourceCaseId`, nên dùng chung field này an toàn.
- `renderSourceSelectionPicker` là 1 component cây thư mục + chọn file đã
  hoàn chỉnh (search, tree nav, checkbox, khoá folder/file đã link) — chỉ
  cần nối lại vào tab Legal Study, không cần viết mới.

## Phạm vi

- **Trong phạm vi:** sửa `LegalReferenceWorkspace.js` — tab Case Reference
  (bỏ filter `isLegalReference`) và tab Legal Study (đổi nguồn dữ liệu +
  nối lại UI picker + đổi cơ chế link).
- **Ngoài phạm vi:** tab "Document" mới (yêu cầu 3, hoãn lại); migrate dữ
  liệu Legal Study cũ; sửa `Library.js`/`CaseDocument.js`/`CaseCreateForm.js`
  (đã xong ở thiết kế trước, không đụng lại).
- **Tương thích ngược bắt buộc:** các liên kết Legal Study cũ (tạo qua quan
  hệ `legalStudy` many-to-many trước đây) phải tiếp tục hiển thị bình
  thường, không migrate, không xoá.

## Thiết kế chi tiết

### A. Tab "Case Reference" — bỏ filter `isLegalReference`

Trong `loadLinkOptions`, bỏ `filter: buildFilter({ isLegalReference: { $eq: true } })`
khỏi lệnh gọi `fetchWithCandidates(CONFIG.caseListCandidates, ...)` cho
`allCases`. Giữ nguyên phần loại trừ case hiện tại + case đã link
(`linkedCaseIds`). Không đổi field `CONFIG.caseReferenceFilterField` (vẫn
giữ định nghĩa, chỉ không dùng để filter danh sách case nữa — tránh phá vỡ
chỗ khác nếu có tham chiếu).

### B. Tab "Legal Study" — đổi sang folder `folderTemplateKey = legal_study`

**1. Nguồn "chọn Case" (thay cho Select chọn record `legalStudy`):**

Hàm mới `fetchCaseLegalStudyRoots()` thay cho `fetchLegalStudyRecords()`:
- Query nhẹ `folders:list` với filter
  `{ folderTemplateKey: { $eq: "legal_study" }, isDeleted: { $ne: true } }`
  (không cần fetch hết mọi folder như `Library.js` làm, vì đã lọc được
  ngay server-side).
- Lấy danh sách `projectId` distinct từ kết quả, fetch case (`projects:list`
  filter `id $in [...]`) để có tên hiển thị.
- Trả về mảng "study-like" entries: mỗi entry = root folder đã gắn thêm
  `_caseProject` (record case) để dùng làm nhãn hiển thị. Case không tìm
  thấy (bị xoá, orphan) → loại khỏi danh sách, không báo lỗi (giống cách
  `Library.js` đang xử lý folder mồ côi).
- `getLegalStudyTitle` cho entry loại này ưu tiên hiển thị tên Case (vì mọi
  folder mẫu đều tên "Legal Study" giống hệt nhau, phải kèm tên Case mới
  phân biệt được) — ví dụ format `"<Case title>"` hoặc
  `"Legal Study — <Case title>"`.

**2. Khi user chọn 1 Case trong Select:**

Hàm mới `loadCaseLegalStudySubtree(caseId, rootFolderId)` (thay cho việc
dùng `fetchLegalStudyLibrary()` toàn cục):
- Fetch `folders:list` filter `{ projectId: { $eq: caseId } }` +
  `documents:list` filter `{ caseId: { $eq: caseId } }` — chỉ đúng 1 case,
  không kéo toàn hệ thống.
- Khoanh vùng subtree: chỉ giữ folder gốc (`rootFolderId`) + toàn bộ folder
  con cháu (dùng lại `getDescendantFolderIds` sẵn có) + document nằm trong
  các folder đó. Không lẫn sang folder mẫu khác của case (Legal docs,
  LSC & Related...).
- Set vào state `legalStudyLibrary` giữ đúng shape `{ studies, folders,
  documents }` mà `renderSourceSelectionPicker`/`filterLegalStudyLibraryByStudy`/
  `getLockedLegalStudySelection` đang kỳ vọng — `studies` ở đây chỉ chứa
  đúng 1 entry (case đang chọn) để các hàm lọc hiện có hoạt động không cần
  sửa nhiều.
- Sau khi load xong: **auto-select toàn bộ root folder** (set
  `selectedSourceFolderIds = [rootFolderId, ...toàn bộ folder con]`) — đúng
  hành vi mặc định đã chốt (chọn cả study, user có thể bỏ bớt).

**3. Render:** Trong nhánh `linkMode === "legal_study"` của `renderLinkModal`,
sau Select chọn Case, gọi `renderSourceSelectionPicker({ library:
selectedLegalStudyLibrary, loading: sourcePickerLoading, ... })` (component
có sẵn, chỉ cần bật lại). Select đổi label thành "Case" thay vì trực tiếp
"Legal Study" (vì giờ chọn Case, không chọn study).

**4. Submit (`handleLinkSubmit`, nhánh `legal_study`):**

Thay `addRelationLink("legalStudy", caseId, legalStudyId)` bằng:
1. Validate có ít nhất 1 case được chọn (giữ nguyên message cũ nếu thiếu).
2. Gọi `createSourceWrapperReference({ sourceSpace:
   CONFIG.legalStudyStorageType, sourceCaseId: <case đã chọn>,
   sourceFolderIds: selectedSourceFolderIds, sourceDocumentIds:
   selectedSourceDocumentIds, sourceLibrary: selectedLegalStudyLibrary,
   fallbackTitle: getCaseTitle(caseCủaStudy) })` — hàm này đã tồn tại, chỉ
   cần thêm hỗ trợ field `sourceCaseId` trong payload (song song
   `sourceLegalReferenceId` đang có).
3. `addRelationLink("legalReference", caseId, createdReference.id)` — dùng
   đúng quan hệ `legalReference` như tab "Legal Reference" standalone,
   **không** dùng quan hệ `legalStudy` cho link mới nữa.
4. Kiểm tra trùng: thay vì so theo `legalStudyId`, so theo case đã chọn
   — nếu Case hiện tại đã có 1 link `type === "legal_study"` với
   `sourceCaseId` trùng case đang chọn → báo "đã link rồi", không tạo
   thêm.

**5. Đọc lại nội dung khi xem 1 reference đã link (`fetchLibraryForReferenceSource`):**

Nhánh `isLegalStudyReference(reference)` đổi từ gọi
`fetchLegalStudyLibrary()` (toàn hệ thống) sang: lấy `sourceCaseId` từ
reference (`getSourceCaseId(reference)`, hàm đã có sẵn, đọc đúng field
`sourceCaseId`), fetch folder/doc của đúng case đó (dùng lại
`loadCaseLegalStudySubtree`-style query nhưng không cần state, chỉ cần trả
về `{ folders, documents }`), rồi `filterLibraryBySourceSelection` như cũ
với `reference.sourceFolderIds`/`sourceDocumentIds`.

**6. Phân loại `type` khi load danh sách link (`fetchCaseReferenceLinks`):**

Rows lấy từ quan hệ `legalReference` hiện bị hard-code `type: "standalone"`.
Đổi thành xác định qua nội dung record:
```js
type: isLegalStudyReference(row) ? "legal_study" : "standalone",
```
để các wrapper Legal Study mới tạo (nằm trong quan hệ `legalReference`,
không phải `legalStudy`) hiện đúng nhóm "Legal Study" trong bộ đếm/badge/
filter. Rows lấy từ quan hệ `legalStudy` (link kiểu cũ) **giữ nguyên**
`type: "legal_study"` như hiện tại — không đổi gì ở nhánh đó.

**7. Dedup danh sách "chọn Case" trong picker (`loadLinkOptions`):**

Đổi `linkedStudyIds` (hiện so theo id record `legalStudy`) thành so theo
`sourceCaseId` của các link `type === "legal_study"` hiện có của case này
(gồm cả 2 nguồn: quan hệ `legalStudy` cũ lẫn wrapper `legalReference` mới)
— case đã có Legal Study được link rồi thì không hiện lại trong danh sách
chọn.

### Tương thích ngược

Không đổi cách đọc quan hệ `legalStudy` trong `fetchCaseReferenceLinks`
(vẫn fetch, vẫn gắn `type: "legal_study"` như cũ) và không đổi
`removeLinkRecord` (vẫn `removeRelationLink("legalStudy", ...)` cho link
kiểu cũ dựa trên `link.type`). Link cũ tạo trước thay đổi này tiếp tục hoạt
động y nguyên, kể cả xoá — không cần biết nó "cũ" hay "mới" ở bước xoá vì
`removeLinkRecord` chỉ cần biết `link.type` (đã có sẵn), còn link mới có
`type: "legal_study"` nhưng thực chất là record `legalReference` →
`removeLinkRecord` sẽ gọi `removeRelationLink("legalStudy", ...)` **sai**
cho link mới — cần sửa: nhánh `type === "legal_study"` trong
`removeLinkRecord` phải phân biệt được nguồn quan hệ. Cách xử lý: dựa vào
`isLegalStudyReference(reference)` kết hợp việc record có phải xuất phát từ
quan hệ `legalStudy` hay không — đơn giản nhất là gắn cờ nguồn ngay lúc
normalize trong `fetchCaseReferenceLinks` (ví dụ thêm field nội bộ
`_relationSource: "legalStudy" | "legalReference"` vào mỗi row khi build
`normalized`), rồi `removeLinkRecord` dùng field này để chọn đúng quan hệ
cần gỡ (`legalStudy` cho link cũ, `legalReference` cho wrapper mới) thay vì
suy diễn từ `type`.

## Rủi ro / lưu ý khi implement

- Phải sửa `removeLinkRecord` như mục Tương thích ngược ở trên, nếu không
  link Legal Study mới tạo sẽ không gỡ được (gọi sai quan hệ).
- `renderSourceSelectionPicker` có 2 phần thân hàm trong code hiện tại (1
  đoạn code chết phía sau `return` sớm không bao giờ chạy tới, dùng
  `library.folders`/`library.documents` phẳng không qua tree) — implement
  cần dọn bỏ đoạn chết đó khi chạm vào hàm này, không giữ lại gây rối.
- Case không có folder `folderTemplateKey = legal_study` hợp lệ (dữ liệu cũ
  trước khi có field, hoặc case test) → không hiện trong danh sách chọn
  Case của tab Legal Study, không báo lỗi (nhất quán với `Library.js`).
- `getLegalStudyRelationId`/`withLegalStudyMeta`/`CONFIG.legalStudyRelationFieldCandidates`/
  `CONFIG.legalStudyListCandidates`/`CONFIG.legalStudyAppends` gắn với
  collection `legalStudy` cũ — rà lại xem còn cần giữ cho nhánh tương
  thích ngược (đọc link cũ) hay có thể dọn bớt; không xoá nếu còn được
  dùng ở đường đọc dữ liệu cũ.
- Test thủ công: (1) case A có folder Legal Study, link toàn bộ vào case B
  → xem đúng trong danh sách + xoá được; (2) chỉ chọn 1 folder con của case
  A → link → mở lại đúng chỉ folder đó; (3) case cũ đã link Legal Study
  kiểu cũ (quan hệ `legalStudy`) vẫn hiển thị + xoá được bình thường; (4)
  tab Case Reference hiện đủ mọi case, không chỉ case có `isLegalReference`.
