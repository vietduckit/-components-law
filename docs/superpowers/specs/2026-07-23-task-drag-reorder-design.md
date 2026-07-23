# Task Drag-and-Drop Reorder (Design)

## Mục đích

Cho phép người dùng kéo-thả để sắp xếp lại thứ tự hiển thị của task trong
`All Module/Task/TaskManagement.js`, kể cả kéo một task từ service này sang
service khác. Hiện tại thứ tự task hoàn toàn không kiểm soát được — cột "STT"
chỉ là số thứ tự tính theo vị trí trong mảng lúc render (`index + 1`), và API
`tasks:list` không truyền `sort`, nên thứ tự hiển thị phụ thuộc vào thứ tự DB
trả về (mặc định theo `id`/thời gian tạo).

## Bối cảnh hiện tại (đã research trong `TaskManagement.js`)

- `ServiceSection` (định nghĩa ~dòng 16072) nhận `tasks` (đã lọc theo
  `serviceId`) và render mỗi task qua `TaskRow` với `stt: index + 1`
  (~dòng 16184-16188) — số thứ tự thuần túy theo vị trí mảng.
- `ListView` (~dòng 16211) nhóm `tasks` theo `serviceId` (~dòng 16241-16246)
  bằng `.forEach`/push đơn giản — không có `.sort()` nào áp dụng, giữ nguyên
  thứ tự đã nhận từ props.
- Task được fetch tại `reload()` (~dòng 16343-16390) qua
  `fetchAll("tasks:list", "id,title,status,...", { projectId: {...} })` — hàm
  `fetchAll` (~dòng 838) không nhận tham số `sort`, luôn query không sắp xếp.
- Field `previousTaskId` đã tồn tại nhưng **không phải** cơ chế sắp xếp — đây
  là quan hệ phụ thuộc "task bị chặn bởi task khác" (label "Pending Issue",
  dòng 197), dùng cho blocking logic, không liên quan thứ tự hiển thị.
- Không có field `taskIndex`/`sortOrder`/`position` nào trước đây trên
  collection `tasks`. Người dùng đã tự thêm field `taskIndex` (số nguyên,
  nullable) vào collection `tasks` qua Nocobase admin trước khi bắt đầu
  triển khai — không cần thay đổi backend/schema trong scope này.
- Pattern kéo-thả + reindex đã có sẵn tiền lệ trong `Library.js`
  (`draggable`, `onDragStart`/`onDragOver`/`onDrop`,
  `dataTransfer.setData("application/json", ...)`, và
  `reindexFolderFiles` reindex toàn bộ anh em cùng cấp sau khi di chuyển) —
  tái dùng đúng convention này cho nhất quán codebase, không thêm thư viện
  drag-drop ngoài.

## Data model

`tasks.taskIndex` (integer, nullable — field đã có sẵn). Ý nghĩa: thứ tự
hiển thị của task **trong phạm vi 1 service** (`serviceId`) của 1 case.
Không có ý nghĩa cross-service (một task chuyển sang service khác sẽ được
gán `taskIndex` mới trong phạm vi service đích).

## Fetch & sort

- `reload()`'s `fetchAll("tasks:list", fields, filter)` cần thêm `taskIndex`
  vào chuỗi `fields`, và `fetchAll` cần hỗ trợ tham số `sort` tùy chọn (hiện
  chưa có) để truyền `sort: ["taskIndex", "id"]` — `id` làm tiêu chí phụ ổn
  định cho các task chưa có `taskIndex` (null).
- Không cần đổi gì ở `ListView`/`ServiceSection`/`stt` — vì mảng `tasks`
  nhận được từ props đã đúng thứ tự nhờ sort ở tầng fetch, `stt: index + 1`
  tự động đúng theo thứ tự mới.

## Kéo-thả UI

- Mỗi `TaskRow` được đánh dấu `draggable`, gắn `onDragStart` lưu
  `{ type: "task", id: task.id, serviceId: task.serviceId }` vào
  `dataTransfer` (JSON, theo đúng format `Library.js` đang dùng).
- Mỗi `TaskRow` cũng là drop target: `onDragOver`/`onDrop` xác định vị trí
  thả là "trên"/"dưới" row đó (so sánh `clientY` với chiều cao row, cùng
  pattern `getDropPosition` trong `Library.js`), và `serviceId` của
  `ServiceSection` chứa row đó (kéo sang service khác vẫn hoạt động vì mỗi
  `ServiceSection` chỉ chứa `tasks` của chính service mình — thả vào bất kỳ
  row nào trong section đó nghĩa là thả vào service đó).
- Con trỏ kéo hiển thị visual feedback (border-top/bottom hoặc background)
  tương tự cách `Library.js` làm với `getDropTargetStyle`.

## Xử lý khi thả (drop) — reindex toàn bộ nhóm bị ảnh hưởng

Không dùng cách tính "giá trị taskIndex nằm giữa 2 task lân cận" (dễ hết độ
chính xác sau nhiều lần kéo) — luôn **reindex tuần tự (1, 2, 3...)** toàn bộ
task trong (các) service bị ảnh hưởng, đúng convention `reindexFolderFiles`
đã có trong `Library.js`:

1. **Kéo trong cùng service:** tính lại mảng thứ tự mới (chèn task được kéo
   vào đúng vị trí thả), gọi `tasks:update` cho từng task trong service đó
   với `taskIndex` = vị trí mới (1-based), chỉ gọi update cho task nào có
   `taskIndex` thực sự đổi so với trước.
2. **Kéo sang service khác:** cập nhật `serviceId` của task được kéo (1 lệnh
   `tasks:update`), rồi reindex **cả 2 nhóm**: service nguồn (bỏ task đã đi)
   và service đích (chèn task mới vào đúng vị trí thả).
3. **Task cũ chưa có `taskIndex` (null):** trước khi tính toán thứ tự mới
   cho 1 service, nếu bất kỳ task nào trong service đó có `taskIndex` null,
   tự động "backfill" gán `taskIndex` tuần tự theo thứ tự đang hiển thị hiện
   tại (dựa trên mảng `tasks` hiện có, vốn đã fallback sort theo `id`) —
   không cần script migration riêng, tự chữa lành dần khi người dùng kéo-thả
   lần đầu trong từng service.

Sau khi cập nhật xong, gọi lại `reload()` (đã có sẵn) để đồng bộ UI với dữ
liệu mới.

## Phạm vi

Chỉ sửa `All Module/Task/TaskManagement.js`. Không đụng backend/schema
(field `taskIndex` người dùng đã tự tạo). Không thay đổi cột "STT" hay logic
nhóm theo service — chỉ thêm khả năng kéo-thả + cơ chế reindex đứng sau.
