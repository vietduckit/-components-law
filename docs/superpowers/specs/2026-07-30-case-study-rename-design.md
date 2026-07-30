# Library.js — Case Reference → Case Study Rename & Field Cleanup — Design Spec

## Bối cảnh

`All Module/Document/Library.js` hiện có module **"Case Reference"** (tên nội bộ vẫn dùng collection `legalReference`/`legalReferences`): một record đại diện cho 1 hồ sơ tham chiếu, giữ quan hệ **many-to-many** với `projects` (Case) qua field `cases`, và là điểm neo (`legalReferenceId`) để folder/document gắn vào — quản lý nội dung trực tiếp qua cây folder/document, không qua field trên record (giống cách Legal Study quản lý qua `folderTemplateKey`, khác ở chỗ Legal Study không cần record riêng vì chỉ gắn với đúng 1 Case).

Người dùng muốn đổi tên module này thành **"Case Study"** (đúng nghiệp vụ: tham chiếu nghiên cứu hồ sơ/tình tiết vụ việc liên quan cho các Case đang chạy), đồng thời dọn bớt các field không dùng trong form tạo mới.

**Đã xác nhận qua thảo luận trước đó** (không phải giả định):

- Quan hệ many-to-many với nhiều Case là bắt buộc theo nghiệp vụ → không thể chuyển sang mô hình `folderTemplateKey` thuần (1 folder chỉ gắn được 1 Case). Do đó **giữ nguyên kiến trúc record + folder/document hiện tại**, không đổi mô hình dữ liệu.
- `managerId`/`memberIds` trên form tạo hiện tại **không được lưu xuống record** — `handleCreateLegalReference` (dòng ~7484) build `payload` không hề tham chiếu `values.managerId`/`values.memberIds`, dù form (Modal "Create Case Reference", dòng ~14767) có 2 field này. Đây là UI chết, bỏ đi không mất chức năng.
- Cột "Reference Code" trong bảng danh sách (dòng ~9767) luôn hiển thị "—" vì không field nào trong form tạo/sửa ghi giá trị `referenceCode` xuống record. Bỏ cột này không mất dữ liệu vì chưa từng có dữ liệu.
- Phát hiện phụ: dòng ~11992 (label nút "New" khi đứng ở gallery gốc Case Reference) đã ghi sẵn **"New Case Study"** — không nhất quán với phần còn lại của module (vẫn ghi "Case Reference" ở mọi nơi khác). Đây là điểm không nhất quán có sẵn trong code, sau khi đổi tên toàn bộ sẽ tự động nhất quán trở lại.

## Mục tiêu

1. Đổi toàn bộ **text hiển thị** (tiếng Anh, UI-facing) từ "Case Reference"/"Reference"/liên quan sang "Case Study" tương ứng — sidebar, modal, breadcrumb, bảng, thông báo, placeholder, tooltip.
2. Bỏ field `managerId` (Manager) và `memberIds` (Members) khỏi Modal "Create Case Study" (trước đây "Create Case Reference").
3. Bỏ field `priority` và `status` khỏi cùng Modal đó.
4. Bỏ cột "Reference Code" khỏi bảng danh sách Case Study (gallery table view).
5. Giữ nguyên: Tên (title), Company nội bộ (internalCompanyId), Mô tả (description), Case liên kết (caseIds, many-to-many), Upload file/folder tuỳ chọn lúc tạo — không đổi hành vi các field này.

## Ngoài phạm vi (non-goals)

- **Không đổi tên collection/API thật** (`legalReference`/`legalReferences`/`LegalReference` giữ nguyên ở mọi `ctx.api.request({ url: ... })`), không đổi tên field trên record (`title`, `referenceCode`, `cases`, `internalCompanyId`, `description`, `priority`, `status` vẫn tồn tại trên schema — chỉ không còn field nào trong form UI ghi giá trị vào `priority`/`status`/`managerId`/`memberIds` nữa).
- **Không đổi tên biến/state nội bộ trong code** (`activeLegalReferenceId`, `legalReferences`, `filteredLegalReferences`, `isLegalReferenceRoot`, `openLegalReferenceDetail`, `LEGAL_REFERENCE_RESOURCE_CANDIDATES`, `getRecordLegalReferenceId`, các hàm `handleCreateLegalReference`/`handleDeleteTemplate`/`handleLinkCaseSubmit`...) — chỉ đổi **chuỗi text hiển thị** (JSX text node, `message.success/error/warning(...)`, `title:`/`label:`/`placeholder=` string literal). Lý do: đổi tên biến/collection là thay đổi có rủi ro cao, không mang lại giá trị UX, và nằm ngoài yêu cầu gốc ("chỉ đổi nhãn tên thôi chứ thật sự collection/field vẫn như cũ" — xác nhận của người dùng).
- **Không đổi hành vi/logic** của Link Case, upload file/folder lúc tạo, permission model, breadcrumb navigation, hay bất kỳ luồng dữ liệu nào — chỉ đổi text hiển thị và bớt field UI không dùng.
- **Không đổi field trên các module khác** — `DASHBOARD_CONFIG.label` (dòng ~87-93, dùng cho "Internal Templates"/route fallback không liên quan trực tiếp tới Case Reference) giữ nguyên, không nằm trong phạm vi rename này.
- Nút "Link Case" giữ nguyên nhãn — đã đúng nghĩa, không chứa chữ "Reference".

## Phần 1 — Đổi text hiển thị "Case Reference" → "Case Study"

Danh sách vị trí cần đổi (tham chiếu dòng tại thời điểm viết spec — có thể lệch dòng khi triển khai thật, cần grep lại theo nội dung chuỗi, không theo số dòng cứng):

| Vị trí (mô tả) | Text cũ | Text mới |
|---|---|---|
| `getLegalReferenceDisplayName` fallback (~2507) | `Case Reference ${record.id}` / `"Case Reference"` | `Case Study ${record.id}` / `"Case Study"` |
| `handleCreateLegalReference` — cảnh báo thiếu ID (~7523) | "Case Reference was created, but its ID could not be detected for document upload." | "Case Study was created, but its ID could not be detected for document upload." |
| `handleCreateLegalReference` — lỗi upload file (~7534) | "Upload file for Case Reference failed" | "Upload file for Case Study failed" |
| `handleCreateLegalReference` — lỗi upload folder (~7549) | "Upload folder for Case Reference failed" | "Upload folder for Case Study failed" |
| `handleCreateLegalReference` — cảnh báo 1 phần thất bại (~7556) | "Case Reference was created, but some documents failed to upload." | "Case Study was created, but some documents failed to upload." |
| `handleCreateLegalReference` — thành công (~7559) | "Case Reference created successfully." | "Case Study created successfully." |
| `handleCreateLegalReference` — lỗi tạo (~7565) | "Create Case Reference failed." | "Create Case Study failed." |
| `handleEditTemplateSubmit` — thành công (~7600) | "Case Reference updated successfully!" | "Case Study updated successfully!" |
| `openLinkCaseModal`/submit — cảnh báo chưa chọn (~7640) | "Please select a Case Reference to link" | "Please select a Case Study to link" |
| `handleDeleteTemplate` — tiêu đề confirm xoá (~8864) | `Confirm deletion of Case Reference "..."` | `Confirm deletion of Case Study "..."` |
| `handleDeleteTemplate` — nội dung confirm xoá (~8872) | "Are you sure you want to delete this Case Reference? ..." | "Are you sure you want to delete this Case Study? ..." |
| `handleDeleteTemplate` — thành công (~8904) | "Case Reference deleted" | "Case Study deleted" |
| `handleRenameSubmit` — thành công (~8960) | "Case Reference renamed" | "Case Study renamed" |
| Context menu item label (~9356) | "Delete Case Reference" | "Delete Case Study" |
| Cột bảng gallery (~9767) | "Reference Code" | **Bỏ cột này** (xem Phần 3) |
| Cột bảng gallery (~9779) | "Reference Name" | "Case Study Name" |
| Tooltip nút xoá trong bảng (~9928) | "Delete Case Reference" | "Delete Case Study" |
| Context menu entity gallery — tiêu đề confirm xoá (~11004) | "Delete Case Reference?" | "Delete Case Study?" |
| Context menu entity gallery — thành công xoá (~11020) | "Case Reference deleted" | "Case Study deleted" |
| Sidebar nav comment + label (~11200, ~11240) | "Case Reference" | "Case Study" |
| Placeholder tìm kiếm sidebar (~11734) | "Search case reference..." | "Search case study..." |
| Nút "New" khi ở gallery gốc (~11992) | "New Case Study" *(đã đúng sẵn — không đổi)* | *(giữ nguyên)* |
| Card title (~13101) | "Case Reference Name" | "Case Study Name" |
| Empty state gallery (~13177) | "No Case Reference yet" | "No Case Study yet" |
| Nút tạo trong empty state (~13197) | "+ Create Case Reference" | "+ Create Case Study" |
| Empty state view chính (~13531) | "No Case Reference yet" | "No Case Study yet" |
| Empty state gợi ý (~13547) | "Click + Create Case Reference below to get started" | "Click + Create Case Study below to get started" |
| Nút tạo trong empty state view chính (~13572) | "+ Create Case Reference" | "+ Create Case Study" |
| Modal tiêu đề tạo mới (~14767) | "Create Case Reference" | "Create Case Study" |
| Form field label (~14785) | "Reference Name" | "Case Study Name" *(field `title` vẫn giữ — xem Phần 2)* |
| Modal tiêu đề Link Case (~15118) | "Link Case Reference" | "Link Case Study" |

Ghi chú: 2 comment code tại dòng ~55 và ~84 nhắc tới "Legal Reference" là comment nội bộ giải thích API endpoint cũ (liên quan tới `DASHBOARD_CONFIG` của module "Internal Templates" khác, không phải Case Reference đang đổi tên) — **không đổi**, ngoài phạm vi (xem Non-goals).

## Phần 2 — Bớt field trong Modal "Create Case Study"

Modal hiện tại (component `InternalTemplates`, form `createTemplateForm`, dòng ~14710-14830) có các `Form.Item`:

```
title (Reference Name) — GIỮ, đổi label "Case Study Name"
internalCompanyId (Internal Company) — GIỮ nguyên
managerId (Manager) — BỎ
memberIds (Members) — BỎ
priority (Priority) — BỎ
status (Status) — BỎ
description (Reference Summary) — GIỮ, đổi label "Case Study Summary" (theo Phần 1 style đổi tên)
caseIds (Reference To / linked cases) — GIỮ nguyên hành vi, đổi label liên quan theo Phần 1
Upload file/folder (createReferenceFiles/createReferenceFolderFiles) — GIỮ nguyên, optional như cũ
```

`handleCreateLegalReference` (~7484) hiện build payload:

```js
const payload = {
  title: values.title?.trim(),
  description: values.description?.trim() || "",
  internalCompanyId: extractId(values.internalCompanyId || activeCompanyId),
  cases: mergedCaseIds,
  priority: values.priority || null,
  status: values.status || null,
  ...(userId ? { createdById: userId, updatedById: userId } : {}),
};
```

Sau khi bỏ field trên form, `values.priority`/`values.status` sẽ luôn `undefined` — payload vẫn gửi `priority: null, status: null` xuống record (an toàn, vì field vẫn tồn tại trên schema theo Non-goals, chỉ không còn ai set giá trị khác `null` qua UI này nữa). Không cần sửa gì thêm ở khối payload này ngoài việc field không còn được form cung cấp giá trị.

## Phần 3 — Bỏ cột "Reference Code"

Bảng gallery table view (~dòng 9760-9800, trong nhánh `activeSpace === "legal_reference" && !activeLegalReferenceId` của `tableColumns`) có cột:

```js
{
  title: "Reference Code",
  key: "referenceCode",
  width: 150,
  sorter: (a, b) => (a.referenceCode || "").localeCompare(b.referenceCode || "", "vi"),
  render: (_, record) => (
    <Text style={{ fontWeight: 600, color: "#111827" }}>
      {record.referenceCode || "—"}
    </Text>
  ),
},
```

Xoá toàn bộ object cột này khỏi mảng columns. Các cột còn lại (Reference Name → Case Study Name, Case Summary, Linked Cases, Actions) giữ nguyên vị trí tương đối, STT vẫn ở đầu.

Search filter tại dòng ~9757 (nhánh `isSearching` của `tableData` cho legal reference root) hiện có:

```js
rows = rows.filter((r) =>
  `${r.referenceCode || ""} ${r.title || ""} ${r.description || ""}`
    .toLowerCase()
    .includes(q),
);
```

**Giữ nguyên** — vẫn cho phép search theo `referenceCode` nếu dữ liệu cũ có sẵn giá trị (từ trước khi form ngừng set field này, hoặc do nguồn khác ghi vào), không loại field này khỏi logic tìm kiếm — chỉ ẩn khỏi UI hiển thị cột, không ảnh hưởng tính năng tìm kiếm.

## Kế hoạch xác minh

- `node --check`/babel-parser syntax check sau mỗi bước sửa (quy ước hiện có của file, xem CLAUDE.md phần "Quy tắc khi viết code mới" + ghi chú trước đó trong session).
- Không có Nocobase runtime thật trong phiên làm việc — sau khi deploy, người dùng tự xác nhận trên UI thật:
  - Sidebar, breadcrumb, modal, thông báo, tooltip đều hiển thị "Case Study" thay vì "Case Reference"/"Reference" (trừ 2 comment code không hiển thị UI).
  - Modal tạo mới không còn field Manager/Members/Priority/Status, tạo record thành công vẫn set đúng title/description/internalCompanyId/cases/upload file-folder.
  - Bảng danh sách không còn cột "Reference Code", 4 cột còn lại hiển thị đúng dữ liệu.
  - Search vẫn hoạt động (không bắt buộc verify riêng theo referenceCode vì field này chưa từng có dữ liệu qua UI).
