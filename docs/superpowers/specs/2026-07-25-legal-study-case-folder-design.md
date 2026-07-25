# Legal Study dùng folder mẫu có sẵn theo Case (bỏ collection `legalStudy`) — Design

## Mục đích

Hiện tại module "Legal Study" trong `Library.js` yêu cầu người dùng **tạo một
record `legalStudy` riêng** (qua popup `LegalStudyCreateBlock.js` — điền
title, internal company, manager, members, priority, status, description,
liên kết case/case reference) trước khi có thể upload folder/file vào đó.
Đây là bước thừa: mục tiêu thật sự của Legal Study chỉ là lưu trữ tài liệu
và liên kết tới đúng Case, không cần một entity "record" độc lập với nhiều
field hành chính không dùng đến.

Mục tiêu thiết kế này: bỏ hẳn bước tạo record `legalStudy`, dùng thẳng
folder "Legal Study" đã được tự động tạo sẵn cho mỗi Case (từ
`CaseCreateForm.js`) làm nơi lưu trữ — upload trực tiếp, tự động liên kết
đúng Case qua `projectId` có sẵn trên folder đó.

## Bối cảnh & phát hiện quan trọng (đã research + verify bằng script chẩn đoán)

- `CaseCreateForm.js` (~dòng 9197-9263): mỗi khi tạo Case mới, hệ thống đã
  tự động tạo 1 folder gốc case + **5 folder con mẫu cố định**: `"Legal
  Study"`, `"LSC & Related"`, `"Legal docs"`, `"Legal dossiers"`, `"Report
  and Result"` — tất cả với `moduleScope: CASE_DOCUMENT_SCOPE` (tức
  `"case_document"`, giống mọi folder tài liệu case khác), `projectId` trỏ
  đúng về case, `type: "cases"`.
- Cơ chế `legalStudy` collection trong `Library.js` (`activeLegalStudyId`,
  `legalStudyRecords`, `LEGAL_STUDY_STORAGE_TYPE = "legal_study"`,
  `LEGAL_STUDY_CREATE_POPUP_UID`, `LegalStudyCreateBlock.js`) là **một hệ
  thống hoàn toàn tách biệt, không liên quan** tới folder "Legal Study" nói
  trên — chỉ trùng tên. Folder mẫu dùng `moduleScope: "case_document"`,
  trong khi hệ `legalStudy` dùng `moduleScope/storageType: "legal_study"`
  riêng và một collection `legalStudy` với field `cases` (many-to-many).
- Đã chạy script chẩn đoán (`scratch_list_legal_study_folders.js`, dùng
  `ctx.api.request` từ 1 JS block thật trong Nocobase) để kiểm tra dữ liệu
  hiện có: tổng **20 folder** tên khớp chính xác "Legal Study" (không phân
  biệt hoa/thường). Trong đó:
  - **4 folder** có `projectId` hợp lệ, gắn đúng 1 Case duy nhất (không
    trùng lặp giữa các case) — đây là các Case được tạo đúng qua
    `CaseCreateForm.js`.
  - **16 folder** có `projectId: null` — "mồ côi", không gắn Case nào
    (nhiều khả năng do case test bị xoá sau khi tạo, folder không bị xoá
    theo).
  - Tất cả `docCount` gần như bằng 0 — folder mẫu gần như chưa được dùng
    thật sự, an toàn để đổi cơ chế truy xuất.

## Phạm vi

- **Chỉ xử lý Legal Study.** Case Reference (collection `legalReference`)
  giữ nguyên như hiện tại trong lần này — sẽ thiết kế riêng sau (có thể cần
  cơ chế liên kết nhiều Case do 1 tài liệu Case Reference có thể dùng chung
  cho nhiều Case, khác với Legal Study là 1 Case = 1 folder duy nhất).
- **Ngoài phạm vi:** dọn dẹp 16 folder "Legal Study" mồ côi hiện có (không
  hiển thị trong UI mới, nhưng không xoá/sửa dữ liệu của chúng); cơ chế
  chia sẻ 1 tài liệu cho nhiều Case (không cần cho Legal Study vì mỗi Case
  chỉ có đúng 1 folder Legal Study của riêng nó).

## Field mới (đã tạo xong qua Nocobase admin)

Field `folderTemplateKey` (string, nullable) trên collection `folders`.
Giá trị dùng cho 5 folder mẫu:

| Tên folder mẫu     | `folderTemplateKey` |
|---------------------|----------------------|
| Legal Study         | `legal_study`        |
| LSC & Related        | `lsc_related`         |
| Legal docs           | `legal_docs`           |
| Legal dossiers       | `legal_dossiers`       |
| Report and Result    | `report_result`        |

Folder do người dùng tự tạo (không phải 5 folder mẫu) → `folderTemplateKey`
để `null`, không lọc/không ảnh hưởng gì tới logic hiện có khác.

Field này được gắn cho **cả 5 folder mẫu**, không chỉ riêng Legal Study —
để nhất quán và dễ mở rộng lọc theo loại folder khác sau này nếu cần
(nhưng lần này chỉ dùng giá trị `legal_study`).

## Thiết kế chi tiết theo file

### `CaseCreateForm.js`

Sửa đoạn tạo `defaultChildren` (hiện là mảng string đơn giản, ~dòng 9225):

```javascript
const defaultChildren = [
  { name: "Legal Study", key: "legal_study" },
  { name: "LSC & Related", key: "lsc_related" },
  { name: "Legal docs", key: "legal_docs" },
  { name: "Legal dossiers", key: "legal_dossiers" },
  { name: "Report and Result", key: "report_result" },
];
```

Trong vòng lặp tạo folder con (~dòng 9236, `childPromises`), thêm
`folderTemplateKey: cItem.key` vào payload `folders:create`, và dùng
`cItem.name` thay cho `cName` cũ. Không đổi bất kỳ field/logic nào khác
trong hàm tạo folder gốc case hay `assignDefaultFolderPermissions`.

### `Library.js` — không gian "Legal Study"

- **Bỏ hoàn toàn** phần liên quan tới collection `legalStudy`:
  `legalStudyRecords` state, fetch `legalStudy:list`/`legalStudies:list`,
  `activeLegalStudyId`, nút/flow "Create Legal Study" (mở
  `LEGAL_STUDY_CREATE_POPUP_UID` → `LegalStudyCreateBlock.js`),
  `LEGAL_STUDY_DATA_BLOCK_UID`, các đoạn tính `legalStudyStats`/
  `legalStudyRootFolders`/`legalStudyRootFoldersByRecord` dựa trên record.
- **Điều hướng mới cho không gian Legal Study:** tái dùng đúng pattern
  2 cấp Customer → Case đã có sẵn cho không gian `"customer"` (cùng state
  `activeCustomerId`/`activeCaseId`, cùng UI duyệt danh sách Case). Khi
  người dùng chọn 1 Case, thay vì hiển thị danh sách tài liệu tổng quát
  của case, mở thẳng vào folder có `folderTemplateKey: "legal_study"` +
  `projectId` = case đó (query `folders:list` filter
  `{ folderTemplateKey: { $eq: "legal_study" }, projectId: { $eq: caseId } }`).
- Upload file/tạo folder con bên trong không gian này **giữ nguyên**
  `moduleScope: "case_document"` như các folder case khác (không cần
  storageType/scope riêng `"legal_study"` nữa) — vì bản chất đây chỉ là 1
  nhánh trong cây tài liệu của Case.
- Case không có folder `legal_study` hợp lệ (ví dụ dữ liệu cũ mồ côi,
  hoặc case tạo trước khi có field mới) → không hiển thị trong danh sách
  Case của không gian Legal Study (bỏ qua, không báo lỗi).

### `TaskDetailView.js` — nút "Move to Legal Study"

Đơn giản hoá: bỏ bước mở `LibraryMoveModal` để chọn record Legal Study +
folder đích bên trong record đó. Thay vào đó:

1. Từ context hiện tại (task/note đang thao tác), xác định `caseId` của
   case đang chứa task đó (đã có sẵn trong `legalStudyTaskContext`/
   `sourceContext`).
2. Tìm folder `folderTemplateKey: "legal_study"` + `projectId: caseId`
   của đúng case đó (1 lần gọi `folders:list`).
3. `documents:update`/`folders:update` set `folderId` = folder tìm được ở
   bước 2. **Không đổi** `moduleScope` (giữ `"case_document"`), **không
   cần** set `legalStudyId`/`legalStudySource`/`legalStudyLinkedAt` nữa.
4. Nếu case đó không có folder `legal_study` hợp lệ → báo lỗi rõ ràng
   ("Case này chưa có folder Legal Study") thay vì cho chọn record khác.

Vì hành động giờ luôn có đúng 1 đích duy nhất (folder Legal Study của
chính case đang thao tác), không còn cần bước "chọn record đích" — có thể
bỏ UI chọn Select/TreeSelect của `LibraryMoveModal` khi action là
"move to Legal Study" (nhánh "move to Legal Reference" giữ nguyên như cũ,
không đụng vào — vẫn dùng `LibraryMoveModal` với collection
`legalReference` như hiện tại).

## Rủi ro / lưu ý khi implement

- `folderTemplateKey` chỉ có trên các Case **tạo mới sau khi thêm field
  này** (và các Case cũ có thể cần được backfill thủ công nếu muốn dùng
  tính năng mới — không thuộc phạm vi lần này, nhưng nên báo cho người
  dùng biết Case cũ chưa có `folderTemplateKey` sẽ không xuất hiện trong
  Library.js "Legal Study" cho tới khi được gắn field thủ công).
- Cần kiểm tra kỹ `Library.js` còn chỗ nào khác tham chiếu
  `LEGAL_STUDY_STORAGE_TYPE`/`legalStudyId`/`legalStudySource` ngoài các
  đoạn đã liệt kê ở trên (file rất lớn, >13000 dòng) — rà lại toàn bộ
  trước khi xoá để tránh còn sót logic tham chiếu tới state đã bị bỏ.
- Xác nhận `LibraryMoveModal` trong `TaskDetailView.js` được dùng chung
  cho cả `legal_study` và `legal_reference` — khi sửa nhánh `legal_study`
  phải đảm bảo không phá nhánh `legal_reference` (giữ nguyên).
