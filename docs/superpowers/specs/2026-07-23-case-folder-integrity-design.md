# Case Folder Integrity Rework (Design)

## Mục đích

Sửa lại logic xác định "folder gốc của case" và cách xử lý khi folder đó bị
xóa trong `All Module/Document/CaseDocument.js`. Hiện tại có 3 triệu chứng
người dùng báo cáo, cả 3 đều bắt nguồn từ cùng một lỗi gốc.

## Nguyên nhân gốc (đã xác nhận qua đọc code)

`activeCaseRootFolder` (dùng để xác định folder nào là "gốc" của case hiện
tại) tìm kiếm bằng cách so khớp **tên folder** với tên hiển thị của case,
kèm điều kiện folder đó phải có ít nhất 1 con (folder con hoặc document).
Hàm tìm kiếm này (`caseFolders.find(...)`) **không loại trừ folder có
`isDeleted === true`** khỏi danh sách ứng viên.

Hệ quả:
- Nếu folder gốc bị xóa mềm (`isDeleted: true`) ở bất kỳ đâu (kể cả từ
  block JS khác, miễn folder đó vẫn giữ `projectId` trỏ về case), heuristic
  vẫn tiếp tục nhận diện nó là "gốc hợp lệ" → nó bị loại khỏi
  `caseVisibleFolders` (mảng dùng chung cho cả view chính lẫn Thùng rác) →
  folder biến mất khỏi mọi nơi, kể cả Thùng rác (giải thích triệu chứng #3
  và #4 người dùng báo).
- Vì phụ thuộc vào việc folder gốc "phải có con" mới được nhận diện, có một
  khoảng thời gian ngay sau khi tạo folder gốc (trước khi children được
  tạo/refetch xong) mà `activeCaseRootFolderId` không xác định được — bất kỳ
  file nào upload vào lúc đó nhận `folderId` sai lệch, khiến file "biến
  mất" khỏi view Cases (khả năng cao là nguyên nhân triệu chứng #2, cần xác
  nhận lại sau khi sửa vì heuristic mới sẽ loại bỏ hoàn toàn tình huống
  chicken-and-egg này).

## Quyết định thiết kế (đã chốt qua trao đổi)

### 1. Cách xác định folder gốc của case

Thay heuristic dò tên bằng quy tắc đơn giản, đồng bộ với cách
`TaskManagement.js` đang làm cho `projectFolderId`:

> Folder gốc của case = folder đầu tiên (theo `createdAt` cũ nhất) có
> `projectId === case hiện tại`, `parentId` rỗng, và `isDeleted !== true`.

Nếu tồn tại nhiều folder gốc hợp lệ cùng lúc (dữ liệu cũ/lịch sử để lại),
chọn folder cũ nhất làm chính — không cần xử lý gì thêm cho các folder gốc
"thừa" còn lại, chúng vẫn hiển thị bình thường như folder con lạc trong
danh sách (edge case hiếm, không thuộc phạm vi sửa lần này).

### 2. Khi case chưa có folder gốc hợp lệ

Không tự động tạo ngầm. Chặn thao tác **upload tài liệu** ở cấp gốc của
case (hiển thị cảnh báo hướng dẫn tạo folder trước). Thao tác **tạo thư
mục** ở cấp gốc vẫn được phép — chính hành động tạo thư mục đầu tiên đó sẽ
tự nhiên trở thành folder gốc mới theo quy tắc ở mục 1 (vì nó được tạo với
`parentId: null` và `projectId` đúng case). Khu vực nội dung chính hiển thị
trạng thái rỗng rõ ràng ("Case chưa có folder gốc — hãy tạo folder trước")
kèm nút tạo, thay vì cho phép "+ New > Upload" chạy vào khoảng trống.

### 3. Folder con "mồ côi" (cha bị xóa nhưng con vẫn `isDeleted: false`)

Khi phát hiện (lúc `loadData` chạy xong) một cây con có tổ tiên đã bị xóa
nhưng bản thân chưa được đánh dấu xóa, hệ thống **tự động cascade** ghi
`isDeleted: true` cho toàn bộ folder/document con cháu đó — không chỉ ẩn ở
client. `deletedAt`/`updatedById` của các bản ghi con được **kế thừa từ tổ
tiên đã xóa gần nhất** (không dùng thời điểm hệ thống tự phát hiện/sửa),
để log Thùng rác phản ánh đúng "ai xóa, lúc nào" của hành động xóa gốc.

Sau khi cascade ghi xong, luồng lọc hiện có (`!isDeleted` cho view chính,
`isDeleted === true` cho Thùng rác) tự động hoạt động đúng mà không cần sửa
thêm, vì trạng thái DB lúc này đã nhất quán.

### 4. Nhãn "Current Case" ở sidebar

Không đổi cách hiển thị tên case (vẫn lấy từ record case, không phải tên
folder — đây là thông tin luôn hợp lệ). Thay vào đó, khi
`activeCaseRootFolderId` là `null` (chưa có folder gốc hợp lệ), sidebar
hiển thị thêm trạng thái phụ ("Chưa có folder — + Tạo") ngay dưới nhãn case
thay vì im lặng dẫn vào một cấp gốc trống không rõ ràng.

## Phạm vi

Chỉ sửa `All Module/Document/CaseDocument.js`. Không đổi schema. Không đụng
đến các block khác (TaskManagement.js, Library.js, v.v.) — chúng có thể vẫn
tạo/xóa folder case theo cách riêng của chúng; phần sửa lần này chỉ làm cho
CaseDocument.js tự phục hồi/nhận diện đúng trạng thái bất kể ai đã thao tác
ở đâu.

## Việc cần xác nhận sau khi triển khai

Triệu chứng #2 (1 file upload xong nhưng không hiển thị ở view Cases) được
kỳ vọng tự khỏi sau khi thay heuristic ở mục 1, nhưng chưa có cách xác nhận
chắc chắn nguyên nhân gốc của đúng trường hợp cụ thể đó nếu không xem được
dữ liệu thực tế — cần người dùng tự kiểm tra lại trên UI sau khi triển khai.
