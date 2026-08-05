# Pattern: Inline Edit Metadata & Upload Grouping (Document module)

> Nguồn triển khai gốc: `All Module/Document/Library.js`. Tài liệu này mô tả
> lại logic nghiệp vụ, hành vi người dùng, flow và hợp đồng component để
> **port sang các file document khác** (`CaseDocument.js`,
> `CustomerDocument.js`, `DocumentDashboard.js`, `InternalTemplates.js`, ...)
> theo đúng cùng một cách, giữ trải nghiệm đồng bộ trên toàn bộ module
> Document. Đọc file này trước khi thêm/sửa 2 tính năng dưới đây ở bất kỳ
> file document nào khác.
>
> Do ràng buộc single-file của Nocobase JS block
> (`[[nocobase_single_file_constraint]]`), **không import được** — mọi
> component/hàm mô tả bên dưới phải copy nguyên khối vào file đích, chỉ đổi
> tên helper nội bộ nếu file đích đã dùng tên khác cho cùng khái niệm (xem
> mục "Ánh xạ tên hàm giữa các file" bên dưới).

## 1. Tính năng A — Inline Edit metadata trong Table view

### Business logic

Table view của mỗi file document có 8 field metadata của document (khớp
đúng bộ field thu thập lúc upload):

| Field | Kiểu | Áp dụng cho |
|---|---|---|
| `description` | textarea | folder **và** file |
| `documentType` | text | chỉ file |
| `documentCode` | text | chỉ file |
| `openingDate` | date | chỉ file |
| `signedAt` | date | chỉ file |
| `effectiveAt` | date | chỉ file |
| `senderName` | text | chỉ file |
| `recipientName` | text | chỉ file |

Trước đây các field này chỉ nhập được **một lần lúc upload**, muốn sửa phải
xoá và upload lại. Pattern này cho sửa trực tiếp tại chỗ trong Table view,
không cần modal riêng.

### Hành vi người dùng

- Click vào ô (không cần nút riêng) → ô chuyển thành input tại chỗ,
  autofocus, giá trị hiện tại được nạp sẵn.
- Enter (field text) hoặc blur (mọi loại field, kể cả textarea/date) → lưu.
  Textarea **không** lưu bằng Enter (Enter xuống dòng bình thường).
- Escape → huỷ, không lưu, quay về hiển thị cũ.
- Field nào cũng cho lưu rỗng — **không** field nào bắt buộc.
- Lưu lỗi → hiện `message.error`, **giữ nguyên** giá trị đang gõ trong ô
  (không tự revert), người dùng sửa lại và thử lại được ngay.
- Không có quyền → hiển thị text tĩnh, không hover, không click được (không
  render input, không phải input disabled).
- Không áp dụng ở Trash — Trash luôn hiển thị text tĩnh cho mọi field, kể cả
  người có quyền.

### Phân quyền

Dùng lại nguyên `getRecordPerms(record).canRename` đã có sẵn ở mọi file
document (không viết logic quyền mới). **Không** áp thêm khoá
`isRenameLockedFolder`/tương đương — khoá đó chỉ khoá **tên** của các folder
mẫu hệ thống, không áp cho Description hay các field metadata khác.

### Component & hàm cần copy

**`InlineEditCell`** — component độc lập (không chung state với cơ chế sửa
tên `editingTitleId` sẵn có — mỗi instance tự quản lý state edit của riêng
nó qua `useState` nội bộ):

```javascript
const InlineEditCell = ({ value, type = "text", canEdit, onSave, placeholder = "—" }) => { ... }
```

- `type`: `"text" | "textarea" | "date"`.
- `onSave: (value) => Promise<void>` — **phải throw/reject khi lỗi** (component
  dựa vào đó để biết ở lại edit mode); hàm gọi `onSave` (`saveRecordField`) tự
  `message.error` rồi `throw`, `InlineEditCell` không tự hiện lỗi.
- Cần thêm 1 helper nhỏ đi kèm: `toDateInputValue(value)` — convert giá trị
  ngày lưu trong DB về dạng `"YYYY-MM-DD"` mà `<input type="date">` cần.

**`saveRecordField(record, field, value)`** — hàm lưu 1 field dùng chung,
định nghĩa bên trong component chính (cần `loadData` trong closure):

```javascript
const saveRecordField = async (record, field, value) => {
  try {
    const isFolder = record._type === "folder";
    const userId = getCurrentUserId();
    await ctx.api.request({
      url: isFolder
        ? `folders:update?filterByTk=${extractId(record)}`
        : `documents:update?filterByTk=${extractId(record)}`,
      method: "POST",
      data: { [field]: value, updatedAt: new Date().toISOString(), ...(userId ? { updatedById: userId } : {}) },
    });
    loadData();
  } catch (e) {
    message.error("Failed to update");
    throw e;
  }
};
```

Nếu file đích có wrapper request riêng cho `documents:*` (ví dụ
`requestDocumentApi` trong `CaseDocument.js`), dùng wrapper đó thay
`ctx.api.request` trực tiếp cho nhánh document — giữ nguyên `ctx.api.request`
cho nhánh `folders:*` (đa số file document không có wrapper riêng cho
folders).

### Vị trí wiring trong `tableColumns`

Mọi file document đều có cấu trúc `tableColumns` tương tự nhau (nhánh
`isAllFolders`/`isAllFiles`/mixed × trash/non-trash). Chỉ sửa ở **nhánh
non-trash**:

- Cột `Description`: thay `<Text type="secondary">{record.description || "—"}</Text>`
  bằng `<InlineEditCell type="textarea" value={record.description} canEdit={getRecordPerms(record).canRename} onSave={(v) => saveRecordField(record, "description", v)} />`.
- 7 field còn lại: nếu file đích đã có sẵn 1 hàm kiểu `buildDocMetaColumns()`
  (Library.js đã có sẵn hàm này, chỉ cần sửa render từ tĩnh sang
  `InlineEditCell`) thì sửa tại đó — nếu chưa có, tạo mới hàm này rồi spread
  `...buildDocMetaColumns()` vào đúng vị trí trong mảng cột (sau cột
  Description, trước cột Size), y hệt Library.js.
- **Không đụng vào nhánh trash** — giữ nguyên `<Text>` tĩnh.
- Thêm `saveRecordField` vào dependency array của `useMemo` bao ngoài
  `tableColumns`.

⚠️ Bẫy đã gặp thực tế: nếu 2 nhánh khác nhau (ví dụ `isAllFolders` non-trash
và `isAllFiles` non-trash) có đoạn code Description **giống hệt nhau về
text/indent**, dùng `replace_all: true` sẽ vô tình sửa luôn cả nhánh **trash**
nếu nhánh đó cũng trùng khớp text/indent. Luôn kiểm tra lại bằng cách đếm số
lần xuất hiện `record.description || "—"` còn lại (phải đúng bằng số nhánh
trash) sau khi sửa.

## 2. Tính năng B — Gom nhóm nhiều file thành 1 folder khi upload

### Business logic

Khi upload ≥ 2 file cùng lúc (qua modal nhập metadata chung, tên hàm phổ
biến `DocumentUploadFieldsModal`/tương đương), cho chọn 1 trong 2 chế độ:

1. **Upload as separate files** (mặc định) — hành vi cũ, N file rời trong
   folder đích hiện tại.
2. **Group into a new folder** — tạo 1 folder mới (tên do người dùng nhập,
   **bắt buộc, không gợi ý sẵn**) ngay trong folder đích hiện tại, rồi đặt
   toàn bộ N file đã chọn vào trong folder mới đó.

### Hành vi người dùng / UI

- Toggle (Radio.Group) chỉ hiện khi `files.length > 1` — upload 1 file
  không có khái niệm "gom nhóm".
- Chọn "Group into a new folder" → hiện thêm ô "Folder Name" bắt buộc ngay
  dưới toggle.
- **Khi ở chế độ "grouped", ẩn toàn bộ các field metadata** (Document
  Type/Name/Code, Opening/Signed/Effective Date, Sender, Recipient,
  Description) — các field này không có ý nghĩa khi đang tạo 1 folder, chỉ
  cần tên folder. Field metadata quay lại hiển thị bình thường nếu người
  dùng đổi lại "Upload as separate files".
- Submit ở chế độ grouped: tạo folder trước (đợi xong), rồi mới upload N
  file vào folder mới đó bằng đúng hàm upload dùng chung sẵn có
  (`uploadFilesToTarget`/tương đương) — **không viết lại logic loop-upload**.
- Nếu tạo folder lỗi → dừng lại, báo lỗi, **không upload file nào cả**.
- Không rollback nếu upload file giữa chừng lỗi sau khi folder đã tạo thành
  công (giữ đúng rủi ro đã tồn tại sẵn ở chế độ "separate").

### Phân quyền

- Trước khi tạo folder: check `canCreate` trên folder **cha** (folder đích
  hiện tại) — dùng đúng hàm `getFolderPermsById`/tương đương file đích đã
  có.
- **Bẫy quan trọng đã gặp thực tế:** sau khi tạo folder mới xong và gọi hàm
  upload dùng chung, hàm đó thường tự check lại quyền trên `targetFolderId`
  bằng cách tra trong state `folders`/`visibleFolders` — nhưng folder vừa
  tạo **chưa có trong state đó** (`loadData()` chưa chạy) → tra không thấy
  → mặc định coi như không có quyền → chặn nhầm upload dù chính người dùng
  vừa tạo folder đó. Fix: truyền cờ bỏ qua check lần 2 (ví dụ
  `skipPermissionCheck: true`) khi gọi hàm upload dùng chung ở nhánh
  grouped, vì quyền đã được xác nhận tương đương qua check trên folder cha
  ngay phía trên.

### Hàm cần copy

**`applyFolderSpacePayload(payload)`** — hàm áp field scope theo
`activeSpace` hiện tại (internalCompanyId, moduleScope, projectId/caseId/
customerId, legalReferenceId, ...) vào 1 payload tạo folder. Nếu file đích
đã có logic tương tự nằm trực tiếp trong `handleCreateFolder` (thường có),
**tách nó ra thành hàm riêng này trước**, rồi cho cả `handleCreateFolder` và
nhánh grouped-upload cùng gọi — tránh 2 nơi tự áp payload theo 2 cách khác
nhau rồi lệch nhau dần theo thời gian.

**Sửa `handleConfirmUploadFields`/tương đương** (hàm nhận metadata từ modal
sau khi người dùng bấm Upload):

```javascript
const handleConfirmUploadFields = async (metadata) => {
  const target = uploadFieldsTarget;
  if (!target) return;

  let targetFolderId = target.folderId;

  if (metadata.uploadMode === "grouped") {
    if (!getFolderPermsById(targetFolderId).canCreate) {
      message.warning("You do not have permission to create a folder at this location");
      return;
    }
    const folderPayload = { name: metadata.groupFolderName.trim(), type: "custom", /* ...timestamps, createdById... */ };
    applyFolderSpacePayload(folderPayload);
    let folderRes;
    try {
      folderRes = await createFolderRecord(folderPayload);
    } catch (e) {
      message.error("Failed to create folder");
      return;
    }
    targetFolderId = extractId(folderRes?.data?.data);
    if (!targetFolderId) {
      message.error("Failed to create folder");
      return;
    }
  }

  const ok = await uploadFilesToTarget(target.files, {
    folderId: targetFolderId,
    metadata,
    skipPermissionCheck: metadata.uploadMode === "grouped",
  });
  if (ok) setUploadFieldsTarget(null);
};
```

**Sửa `DocumentUploadFieldsModal`/tương đương:**

- Thêm state `uploadMode` (mặc định `"separate"`), reset về `"separate"`
  mỗi lần modal mở.
- Thêm `Radio` vào phần destructure `ctx.antd` nếu file đích chưa có.
- Thêm `<Radio.Group>` + `Form.Item name="groupFolderName"` (required khi
  grouped) ngay sau dòng "Selected file(s)", **bên trong** `<Form>` (Ant
  Design `Form.Item` chỉ đăng ký được khi nằm trong cây con của `<Form>`).
- Bọc toàn bộ khối field metadata còn lại trong
  `{uploadMode !== "grouped" && (...)}`.
- `handleOk` gửi thêm `uploadMode` và `groupFolderName: values.groupFolderName?.trim() || ""`
  vào object truyền cho `onSubmit`.

## 3. Checklist khi port sang 1 file document khác

1. Xác định file đích đã có sẵn những hàm/khái niệm tương đương chưa:
   `getRecordPerms`, `getFolderPermsById`, `saveRecordField` (chưa có thì
   tạo mới), `applyFolderSpacePayload`/logic scope trong `handleCreateFolder`,
   `uploadFilesToTarget`, `DocumentUploadFieldsModal`, `buildDocMetaColumns`.
2. Copy `InlineEditCell` + `toDateInputValue` — component độc lập, không
   phụ thuộc state của component cha, chỉ cần `Text`/`Input`/`formatDate`
   sẵn có trong file (mọi file document đều có).
3. Copy/viết `saveRecordField`, đặt cạnh `handleSaveFileTitle` sẵn có.
4. Wiring `InlineEditCell` vào `tableColumns` — chỉ nhánh non-trash, kiểm
   tra kỹ số lượng nhánh trùng text trước khi dùng `replace_all`.
5. Tách `applyFolderSpacePayload` ra khỏi `handleCreateFolder` nếu chưa
   tách sẵn.
6. Thêm `uploadMode`/Radio.Group/ẩn field metadata vào
   `DocumentUploadFieldsModal`.
7. Sửa `handleConfirmUploadFields` theo mẫu ở trên, nhớ `skipPermissionCheck`.
8. Babel-parse syntax check sau mỗi bước nhỏ (file này không có test suite
   tự động — xem `package.json`), QA thủ công trong Nocobase UI ở bước cuối.

## 4. Điểm mở rộng trong tương lai

- Nếu sau này cần thêm field metadata mới (ví dụ "Confidentiality Level"),
  chỉ cần thêm 1 entry trong `buildDocMetaColumns()` (cột Table) + 1
  `Form.Item` trong `DocumentUploadFieldsModal` — không cần đụng
  `InlineEditCell`/`saveRecordField` (đã tổng quát theo `field` là string).
- Nếu muốn cho gom nhóm cả khi upload folder từ máy
  (`uploadFolderFilesToTarget`/tương đương) — hiện **chưa** áp dụng pattern
  này, đó là flow tạo cấu trúc folder có sẵn từ máy, khác bản chất với việc
  "gom N file rời thành 1 folder mới".
- Nếu 1 file document có mô hình phân quyền khác (ví dụ không dùng
  `getRecordPerms(record).canRename` mà dùng field khác), thay đúng chỗ đó
  trong `canEdit`/permission check — phần còn lại của pattern không đổi.
