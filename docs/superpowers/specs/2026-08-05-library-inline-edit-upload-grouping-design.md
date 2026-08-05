# Library.js — Inline Edit Metadata & Gom nhóm Upload thành Folder — Design Spec

## Bối cảnh

`All Module/Document/Library.js` hiện chỉ cho phép sửa **tên** (title/name) của
file/folder theo kiểu inline: click "Rename" → `startEditTitle(record)` bật
input tại chỗ trong ô Name (table view) → `handleSaveFileTitle(record)` lưu
qua `documents:update`/`folders:update` khi Enter/blur. Các field khác của
document (`description`, `documentType`, `documentCode`, `openingDate`,
`signedAt`, `effectiveAt`, `senderName`, `recipientName` — đúng bộ field
đang có trong `DocumentUploadFieldsModal`) chỉ nhập được **một lần lúc
upload**, sau đó muốn sửa phải xoá và upload lại.

Đồng thời, modal upload nhiều file (`DocumentUploadFieldsModal`, mở khi
`files.length > 1` qua `handleFileInputTrigger` → `handleConfirmUploadFields`
→ `uploadFilesToTarget`) hiện luôn tạo N document rời rạc trong cùng 1 folder
đích — không có cách nào gom N file đó vào 1 folder con mới ngay trong lúc
upload.

## Mục tiêu

1. Thêm khả năng sửa inline (ở Table view) cho 8 field: Description,
   Document Type, Document Code, Opening Date, Signed Date, Effective Date,
   Sender, Recipient (file) và riêng Description (folder) — thông qua 1
   component/state dùng chung, không copy-paste pattern `editingTitleId` 7
   lần.
2. Thêm tuỳ chọn trong `DocumentUploadFieldsModal` (khi upload ≥ 2 file):
   "Upload as separate files" (mặc định, hành vi cũ) hoặc "Group into a new
   folder" (tạo 1 folder mới, đặt tất cả file đã chọn vào trong đó).

## Ngoài phạm vi (non-goals)

- Không đổi cơ chế edit tên hiện có (`editingTitleId`/`editingTitleValue`/
  `handleSaveFileTitle`) — giữ nguyên, không hợp nhất vào state mới.
- Không thêm inline edit ở Grid/Card view — chỉ Table view.
- Không thêm inline edit cho `uploadFolderFilesToTarget` (upload cả 1 folder
  từ máy) — flow đó không đổi.
- Không rollback folder mới tạo nếu upload file giữa chừng lỗi (giữ đúng
  hành vi lỗi hiện có của `uploadFilesToTarget`).
- Không thêm authorization ở tầng API/server — vẫn kiểm tra quyền client-side
  như toàn bộ file hiện tại.
- Không cho phép ẩn/hiện cột theo lựa chọn người dùng (column settings).

## Phần 1 — Inline edit cho metadata field (Table view)

### Component & state

Thêm 1 component dùng chung, định nghĩa trong `Library.js` (ràng buộc
single-file — xem `[[nocobase_single_file_constraint]]`):

```
const InlineEditCell = ({ record, field, value, type, canEdit, onSaved }) => { ... }
```

- `type: "text" | "textarea" | "date"` — quyết định input hiển thị khi vào
  edit mode (`Input`, `Input.TextArea`, `Input` type="date").
- Hiển thị mặc định: giá trị đã format (text thường / `formatDate(value)`
  cho field ngày); nếu rỗng → `"—"` màu nhạt, gạch chân đứt khi hover để gợi
  ý click-to-edit.
- Click vào ô (không qua nút riêng) → bật input tại chỗ với giá trị hiện
  tại, autofocus.
- Enter hoặc blur → gọi `saveRecordField(record, field, draftValue)` rồi tắt
  edit mode; Escape → huỷ, không lưu.
- Field nào cũng cho lưu rỗng (không `required`).

State thay thế cho việc lặp `editingTitleId`/`editingTitleValue` 7 lần:

```
const [editingCell, setEditingCell] = useState(null); // { recordId, field } | null
const [editingCellValue, setEditingCellValue] = useState("");
```

### Hàm lưu dùng chung

```
const saveRecordField = async (record, field, value) => {
  const isFolder = record._type === "folder";
  const url = isFolder
    ? `folders:update?filterByTk=${extractId(record)}`
    : `documents:update?filterByTk=${extractId(record)}`;
  const requestFn = isFolder ? ctx.api.request : requestDocumentApi;
  await requestFn({ url, method: "POST", data: { [field]: value } });
};
```

- Lỗi khi lưu: `message.error(...)`, **không** revert giá trị đang hiển thị
  trong input — người dùng sửa lại và Enter lần nữa (khớp hành vi lỗi hiện
  tại của `handleSaveFileTitle`).
- Sau khi lưu thành công: gọi `loadData()` để đồng bộ lại `documents`/
  `folders` state — khớp convention hiện có của mọi hàm mutation khác trong
  file (`handleCreateFolder`, `handleSaveFileTitle`, `handleMoveRecord`,
  ...), không tự optimistic-update state cục bộ.

### Phạm vi cột mới trong Table view

- **File rows** (trong nhánh `isAllFiles` và nhánh mixed của `tableColumns`):
  thêm cột Description (sửa cột đã có sẵn để dùng `InlineEditCell` thay vì
  text tĩnh), Document Type, Document Code, Opening Date, Signed Date,
  Effective Date, Sender, Recipient.
- **Folder rows** (nhánh `isAllFolders` và mixed): chỉ Description dùng
  `InlineEditCell` — folder không có 7 field còn lại.
- `activeSpace === "trash"`: **không** render `InlineEditCell` ở bất kỳ cột
  nào — hiện lại text tĩnh như hiện tại (khớp việc Trash đã ẩn Rename/Move/
  Delete).

### Phân quyền (áp dụng chặt, đã thống nhất với người dùng)

- Dùng lại nguyên `getRecordPerms(record)` đã có sẵn — **không** viết logic
  quyền mới. Hàm này đã tự xử lý đúng: folder thường (root-only permission
  model qua `resolveFolderTreeRoot`), folder Reference/Legal Study (bridge
  qua `entityPermissionContext`/`resolveLegalEntityFolderPerms`), và file
  (suy quyền từ folder cha chứa nó).
- Điều kiện cho phép bật edit mode: `getRecordPerms(record).canRename ===
  true`. **Không** áp thêm `isRenameLockedFolder(record)` — khoá đó chỉ khoá
  **tên** của 5 folder hệ thống (`legal_study`, `lsc_related`, `legal_docs`,
  `legal_dossiers`, `report_result`); Description và các field khác của
  chính 5 folder/file bên trong đó vẫn sửa được bình thường.
- `canEdit` truyền vào `InlineEditCell` = `getRecordPerms(record).canRename`
  (không tạo permission tier mới riêng cho việc này).
- Khi `canEdit === false`: render text tĩnh (không hover, không click được),
  giống hệt cách các cột khác đang hiển thị cho user không có quyền.

## Phần 2 — Gom nhóm file thành 1 folder khi upload nhiều file

### UI trong `DocumentUploadFieldsModal`

Chỉ hiện khi `files.length > 1`, đặt ngay dưới dòng "Selected file(s): ...":

```
<Radio.Group value={uploadMode} onChange={(e) => setUploadMode(e.target.value)}>
  <Radio value="separate">Upload as separate files</Radio>
  <Radio value="grouped">Group into a new folder</Radio>
</Radio.Group>
```

- Mặc định `uploadMode = "separate"` (giữ nguyên hành vi cũ khi không đổi
  gì).
- Khi `uploadMode === "grouped"`: hiện thêm `Form.Item` "Folder Name" —
  input trống, **không gợi ý tên**, `rules={[{ required: true }]}`. Nút
  "Upload" trong footer disable nếu field này trống và đang ở mode
  `grouped` (validate qua `form.validateFields()` như các field khác).
- Các field metadata còn lại (Document Type, Description, Sender...) không
  đổi hành vi — vẫn áp dụng chung cho toàn bộ file trong batch, bất kể mode
  nào.

### Data flow khi submit

Trong `handleOk`/`onSubmit` của `DocumentUploadFieldsModal`, payload gửi lên
`handleConfirmUploadFields` thêm 2 trường: `uploadMode`, `groupFolderName`.

Trong `handleConfirmUploadFields` (nơi hiện đang gọi thẳng
`uploadFilesToTarget`):

```
const handleConfirmUploadFields = async (metadata) => {
  const target = uploadFieldsTarget;
  if (!target) return;

  let targetFolderId = target.folderId;
  if (metadata.uploadMode === "grouped") {
    if (!getFolderPermsById(targetFolderId, activeSpace).canCreate) {
      message.warning("You do not have permission to create a folder at this location");
      return;
    }
    const folderPayload = { name: metadata.groupFolderName.trim(), type: "custom", ... };
    applySpaceFolderPayload(folderPayload);
    let folderRes;
    try {
      folderRes = await createFolderRecord(folderPayload);
    } catch (e) {
      message.error("Failed to create folder");
      return; // KHÔNG upload file nào nếu tạo folder thất bại
    }
    targetFolderId = extractId(folderRes?.data?.data);
  }

  const ok = await uploadFilesToTarget(target.files, {
    folderId: targetFolderId,
    metadata,
    ...
  });
  ...
};
```

- Tạo folder trước, **await xong** mới upload file — nếu tạo folder lỗi,
  dừng lại, không gọi `uploadFilesToTarget`, không có file nào được upload.
- Sau khi có `targetFolderId` (folder mới hoặc folder đích cũ tuỳ mode), gọi
  lại nguyên `uploadFilesToTarget` hiện có — không viết lại logic loop-
  upload-từng-file.
- Nếu upload lỗi giữa chừng (file thứ N trong M file): giữ nguyên hành vi
  hiện tại của `uploadFilesToTarget` (dừng batch, báo lỗi chung, các file đã
  upload trước đó vẫn nằm trong folder mới — không tự rollback/xoá folder
  vừa tạo). Đây là rủi ro đã tồn tại sẵn ở mode "separate", spec này không
  mở rộng phạm vi xử lý lỗi.

### Không đổi

- `handleFileInputTrigger` (cách chọn file ban đầu) — không đổi.
- `uploadFolderFilesToTarget` (upload cả 1 folder từ máy, có cấu trúc thư
  mục sẵn) — flow riêng, không liên quan tới tính năng này.
- `folderInputRef`/nút "Upload Folder" trong menu "New" — không đổi.
