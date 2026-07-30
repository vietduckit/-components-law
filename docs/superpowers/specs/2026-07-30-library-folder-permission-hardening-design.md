# Library.js — Folder Permission Hardening — Design Spec

## Bối cảnh

`All Module/Document/Library.js` đã có sẵn hệ thống permission cho folder/document:
`getFolderPermissions` (role: admin/owner/manager/editor/viewer/null),
`getVisibleFolderIds` (tính tập `accessible` để lọc folder hiển thị),
`permissionFilteredFolders`/`permissionFilteredDocs` (áp tập đó lên danh sách
render), và `FolderPermissionsModal` (UI gán Manager/Members cho 1 folder,
ghi vào `folderManagers`/`folderMembers`).

Ba vấn đề cần siết chặt, phát sinh từ việc dùng thực tế:

1. `getVisibleFolderIds` hiện chỉ cascade quyền **xuống** (có quyền ở 1
   folder → thấy hết folder con của nó), không cascade **lên** — nếu user
   chỉ có quyền ở 1 folder con (không phải case root), case root folder (và
   mọi folder trung gian trên đường tới nó) không hiện ra, khiến folder con
   đó bị "mồ côi", không có đường điều hướng tới trong cây.
2. 5 folder mẫu do `CaseCreateForm.js` tự tạo khi tạo Case (nhận diện qua
   `folder.folderTemplateKey`: `legal_study`, `lsc_related`, `legal_docs`,
   `legal_dossiers`, `report_result`) hiện vẫn cho phép rename như folder
   thường — cần khoá cứng, không cho đổi tên các folder này.
3. Khi Save permissions cho đúng **case root folder** (folder gốc đại diện
   cho 1 Case, phân biệt với các folder mẫu con bên trong nó), cần đồng bộ
   ngược Manager/Members vừa gán lên field `managerId`/`assignees` của
   chính bản ghi Case (`projects`) — vì `CaseCreateForm.js` chỉ đồng bộ 1
   chiều Case → folder lúc tạo case, chưa có chiều ngược lại khi permission
   bị sửa trực tiếp từ Library.

## Mục tiêu

1. `getVisibleFolderIds` cascade quyền lên tổ tiên — case root folder (và
   toàn bộ chuỗi cha) luôn hiện ra để điều hướng nếu user có quyền ở bất kỳ
   folder con/cháu nào của case đó, **kể cả khi user không có quyền trực
   tiếp ở chính folder cha/root**. Việc này chỉ mở rộng tập hiển thị, không
   cấp thêm quyền edit/rename/manage ở các folder trung gian đó.
2. Khoá rename (cả UI và tầng submit) cho đúng 5 `folderTemplateKey` liệt
   kê cứng ở trên — áp dụng bất kể role gì, kể cả admin/owner.
3. `FolderPermissionsModal.handleSave`, khi folder đang sửa là case root
   folder: chặn Save nếu có >1 Manager được gán; nếu hợp lệ, sau khi lưu
   xong `folderManagers`/`folderMembers` như cũ, gọi thêm `projects:update`
   để ghi `managerId`/`assignees` tương ứng.

## Ngoài phạm vi (non-goals)

- Không backfill dữ liệu `managerId`/`assignees` cho các Case cũ đã tồn tại
  từ trước — đồng bộ chỉ chạy khi user chủ động bấm Save permissions ở case
  root folder của case đó, kể từ thời điểm deploy trở đi.
- Không đổi cơ chế inherit-down hiện có trong `getFolderPermissions` (khi 1
  folder không có permission row riêng, nó thừa hưởng role từ folder cha).
- Không đổi UI/UX của `FolderPermissionsModal` (bảng chọn lawyer, badge
  role...) — chỉ thêm validate + 1 lời gọi API phụ khi Save.
- Không thêm khoá rename cho folder Legal Study *do người dùng tự tạo*
  bên trong không gian Legal Study (những folder đó không có
  `folderTemplateKey` nằm trong danh sách khoá — chỉ 5 folder mẫu hệ thống
  mới bị khoá).

## Phần 1 — Cascade quyền lên tổ tiên (root folder luôn điều hướng được)

**Vị trí:** `getVisibleFolderIds(allFolders, currentUser, currentLawyerId)`
(hàm thuần, không phụ thuộc React state, nhận `allFolders` là danh sách
folder đã được scope sẵn theo ngữ cảnh gọi — case/company/space tuỳ nơi gọi).

Thuật toán hiện tại có 2 bước:
1. Duyệt toàn bộ `allFolders`, thêm vào `accessible` những folder mà user là
   creator, hoặc là manager/member trực tiếp (so theo `currentLawyerId`).
2. Cascade xuống: với mỗi folder gốc trong bước 1, thêm toàn bộ folder con
   cháu của nó (đệ quy theo `parentId`) vào `accessible`.

Thêm **bước 3 — cascade lên**: sau bước 2, với mỗi id hiện có trong
`accessible`, đi ngược chuỗi `parentId` (tra trong chính `allFolders` được
truyền vào, không đi ra ngoài phạm vi đó) cho tới khi gặp `parentId` rỗng/
`"root"` hoặc gặp tổ tiên đã có sẵn trong `accessible` (dừng sớm để tránh
duyệt lại phần cây đã biết), thêm từng tổ tiên vào `accessible`.

```js
// Bước 3 (mới) — cascade lên: đảm bảo toàn bộ chuỗi cha của bất kỳ folder
// accessible nào cũng nằm trong accessible, để cây điều hướng không bị đứt
// đoạn — không cấp thêm quyền edit gì, chỉ mở rộng tập hiển thị.
const folderById = new Map(
  allFolders.map((f) => [String(extractId(f.id)), f]),
);
Array.from(accessible).forEach((id) => {
  let current = folderById.get(String(id));
  while (current) {
    const parentId = extractId(current.parentId);
    if (!parentId || parentId === "root") break;
    const parentKey = String(parentId);
    if (accessible.has(parentKey)) break; // đã có, dừng sớm
    accessible.add(parentKey);
    current = folderById.get(parentKey);
  }
});
```

**Không đổi:** `getFolderPermissions` — role/`canRename`/`canManagePermissions`
ở folder chỉ được cascade-lên (không có permission row riêng) vẫn trả về
dựa trên logic hiện có (đệ quy `inherit from parent`, hoặc `null` nếu tới
tận customer root mà không tìm thấy row nào) — nghĩa là user thấy được
folder đó trong cây (để bấm vào điều hướng xuống nhánh họ thực sự có
quyền) nhưng không tự nhiên có nút Rename/Move/Permissions ở đó nếu họ
không phải manager/member thật.

**Đã xác nhận không có xung đột với cơ chế hiện có:** field `canView` (từ
`roleToPerms`) không được dùng để gate việc render 1 folder/document row ở
bất kỳ đâu trong file — việc ẩn/hiện hoàn toàn do
`permissionFilteredFolders`/`permissionFilteredDocs` quyết định, và cả 2 đều
tính lại (`useMemo`) mỗi khi `currentUserState`/`currentLawyerId` đổi, nên
luôn phản ánh đúng quyền hiện tại của đúng người dùng đang đăng nhập — 2
user khác nhau trên cùng 1 case sẽ luôn thấy 2 cây con khác nhau bên dưới
cùng 1 root, không có tình trạng ghi đè/xung đột giữa các phiên.

## Phần 2 — Khoá Rename cho 5 folder mẫu hệ thống

**Hằng số mới** (đặt cạnh `LEGAL_STUDY_FOLDER_TEMPLATE_KEY` đã có ở dòng
~111, tái dùng hằng số đó cho key đầu tiên thay vì lặp lại literal):

```js
const SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS = new Set([
  LEGAL_STUDY_FOLDER_TEMPLATE_KEY, // "legal_study"
  "lsc_related",
  "legal_docs",
  "legal_dossiers",
  "report_result",
]);

const isRenameLockedFolder = (record) =>
  record?._type === "folder" &&
  SYSTEM_LOCKED_RENAME_TEMPLATE_KEYS.has(record?.folderTemplateKey);
```

**Tầng UI — 2 nơi cần sửa** (cả 2 đều destructure `canRename` từ
`getRecordPerms(record)`, cần AND thêm `!isRenameLockedFolder(record)`):

1. `renderContextMenuItems` (~dòng 9223) — menu chuột phải, item "Rename"
   chỉ push khi `canRename` (~dòng 9255).
2. Dãy nút hành động inline theo hàng (~dòng 9417) — nút Rename
   (`startEditTitle(record)`) chỉ render khi `canRename` (~dòng 9437).

Sửa thành (áp dụng ở cả 2 chỗ; chỉ đổi cách lấy `canRename`, giữ nguyên
tên và cách dùng mọi biến khác — `canMove`/`canDelete`/`canShare`/
`canManagePermissions` — y hệt code hiện tại):
```js
const { canRename: rawCanRename, canMove, canDelete, canShare, canManagePermissions } =
  getRecordPerms(record);
const canRename = rawCanRename && !isRenameLockedFolder(record);
```
(Ở dòng ~9417 không có `canShare` trong destructure gốc — bỏ field đó,
giữ nguyên các field còn lại của chỗ đó.)

**Tầng submit — 2 hàm cần thêm guard đầu hàm** (đây là 2 con đường DUY NHẤT
dẫn tới việc thực sự đổi tên folder trong DB — không có đường nào khác,
đã xác nhận không có `onDoubleClick` hay entry point ẩn nào khác gọi thẳng
`startEditTitle`/rename mà bỏ qua nút UI):

1. `handleRenameSubmit` (~dòng 8729) — luồng qua modal Rename
   (`renameRecord` + `Modal` ở cuối file, ~dòng 14929).
2. `handleSaveFileTitle` (~dòng 8373) — luồng inline edit
   (`startEditTitle`/`editingTitleId`).

Thêm ở đầu mỗi hàm (trước khi gọi API):
```js
if (isRenameLockedFolder(record)) {
  message.error("Folder mẫu hệ thống không được đổi tên.");
  return; // (handleSaveFileTitle: gọi cancelEditTitle() trước khi return)
}
```
(`record` ở `handleRenameSubmit` là `renameRecord`; ở `handleSaveFileTitle`
là tham số `record` của chính hàm đó.)

## Phần 3 — Save permissions của case root folder → đồng bộ Manager/Members

**Nhận diện case root folder** — tái dùng đúng ranh giới đã có sẵn trong
code (đã dùng ở `customerCaseRootFolders`, ~dòng 5367-5378): 1 folder là
case root khi chính nó có `projectId` riêng (`getFolderCaseProjectId(folder)`
trả về giá trị) NHƯNG folder cha của nó thì không (cha là customer root,
hoặc không tìm thấy cha trong danh sách được truyền vào):

```js
const isCaseRootFolder = (folder, allFolders) => {
  const ownProjectId = getFolderCaseProjectId(folder);
  if (!ownProjectId) return false;
  const parentId = getFolderParentId(folder);
  const parent = parentId
    ? allFolders.find((f) => String(extractId(f)) === String(parentId))
    : null;
  return !parent || !getFolderCaseProjectId(parent);
};
```

**Prop mới cho `FolderPermissionsModal`:** thêm `allFolders` (component cha
truyền `folders` — state gốc chứa toàn bộ folder, không lọc theo
space/company, để đảm bảo luôn tìm được đúng folder cha bất kể context
hiện tại). Cập nhật cả định nghĩa component lẫn nơi render (~dòng 15115).

**Sửa `handleSave`** (~dòng 3256), thêm logic sau khi đã có `managers`/
`members` (giữ nguyên toàn bộ phần tạo/xoá `folderManagers`/`folderMembers`
hiện có):

```js
const handleSave = async () => {
  const folderId = extractId(folder.id);
  const managers = shares.filter((s) => s.role === "manager");
  const members = shares.filter((s) => s.role !== "manager");
  const isRootFolder = isCaseRootFolder(folder, allFolders);

  // Case chỉ có 1 slot Manager (managerId, belongsTo lawyers) — chặn Save
  // sớm, trước khi gọi bất kỳ API nào, nếu root folder bị gán >1 manager.
  if (isRootFolder && managers.length > 1) {
    message.error(
      "Case chỉ được phép có 1 Manager — vui lòng chỉ giữ lại 1 người.",
    );
    return;
  }

  setSaving(true);
  try {
    // ... (giữ nguyên: destroy + create folderManagers/folderMembers) ...

    if (isRootFolder) {
      const projectId = getFolderCaseProjectId(folder);
      try {
        await ctx.api.request({
          url: "projects:update",
          method: "POST",
          params: { filterByTk: parseInt(projectId) },
          data: {
            managerId: managers[0] ? parseInt(managers[0].id) : null,
            assignees: members.map((m) => ({ id: parseInt(m.id) })),
          },
        });
      } catch (syncError) {
        console.warn(
          "Could not sync case manager/assignees from folder permissions:",
          syncError,
        );
        message.warning(
          "Đã lưu quyền folder, nhưng không đồng bộ được Manager/Members lên Case.",
        );
      }
    }

    message.success("Permissions updated successfully");
    onSuccess({ accessSummary: buildAccessSummary(shares), shares });
  } catch (e) {
    message.error("An error occurred while updating permissions");
  }
  setSaving(false);
};
```

Lỗi ở bước đồng bộ Case (nếu có) chỉ hiển thị cảnh báo riêng, **không**
rollback hay chặn phần folder permissions đã lưu thành công trước đó —
2 bước độc lập nhau về mặt thất bại.

## Kế hoạch xác minh

- `node --check "All Module/Document/Library.js"` sau mỗi bước sửa.
- Không có Nocobase runtime thật trong session này để test UI trực tiếp.
  Sau khi deploy, user tự xác nhận trên UI thật:
  - Phần 1: 1 user chỉ có quyền ở folder con sâu trong cây vẫn thấy được
    case root + toàn bộ chuỗi cha để điều hướng, nhưng không thấy các
    nhánh anh em mà họ không có quyền.
  - Phần 2: thử rename cả 2 đường (menu chuột phải + nút inline) trên 1
    trong 5 folder mẫu, kể cả khi đăng nhập admin — phải bị chặn với
    thông báo lỗi, không đổi tên được.
  - Phần 3: sửa Manager/Members ở case root folder qua
    `FolderPermissionsModal`, Save, rồi kiểm tra field `managerId`/
    `assignees` trên bản ghi Case đã cập nhật đúng; thử gán 2 Manager ở
    root folder để xác nhận bị chặn Save với thông báo lỗi.
