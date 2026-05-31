# Hướng Dẫn Sử Dụng Quản Lý Công Việc

## 1. Tổng quan

Màn hình Quản lý công việc dùng để theo dõi task, subtask, người phụ trách, tiến độ, tài liệu, bình luận, lịch sử hoạt động và timesheet trong một vụ việc/dự án.

Người dùng có thể:

- Tạo công việc chính và công việc phụ.
- Phân công luật sư phụ trách.
- Theo dõi trạng thái, deadline, pending issue và next step.
- Đính kèm tài liệu cho công việc.
- Bình luận, nhắc tên và phản hồi theo luồng.
- Ghi nhận giờ làm việc bằng timesheet.
- Xem lịch sử thay đổi của task/subtask.

## 2. Giao diện danh sách công việc

Danh sách công việc được nhóm theo `Dịch vụ`.

Thanh trên cùng hiển thị:

- Tổng số công việc đã hoàn thành.
- Số công việc đang bị chặn.
- Số công việc quá hạn.
- Phần trăm tiến độ.
- Nút tạo công việc.
- Nút làm mới dữ liệu.

Các cột chính trong danh sách:

- STT
- Trạng thái
- Tiêu đề
- Ngày cập nhật
- Người phụ trách
- Nội dung diễn biến
- Ngày bắt đầu
- Deadline
- Pending Issue
- Next Step
- Tài liệu
- Yêu cầu phê duyệt

## 3. Quyền thao tác

Admin và quản lý dự án có quyền quản lý toàn bộ công việc.

Người phụ trách có thể chỉnh sửa công việc được phân công cho mình.

Một số thao tác chỉ dành cho quản lý:

- Phân công người phụ trách.
- Xóa task/subtask.
- Bật hoặc tắt yêu cầu phê duyệt.
- Chọn người xét duyệt.
- Xem lịch sử hoạt động từ màn hình chi tiết.

## 4. Tạo công việc mới

Chọn `Tạo công việc`.

Các trường có thể nhập:

- Tên công việc, bắt buộc.
- Luật sư phụ trách.
- Dịch vụ.
- Ngày bắt đầu.
- Deadline.
- Thời gian dự kiến.
- Pending Issue.
- Mức độ ưu tiên.
- Yêu cầu phê duyệt.
- Người xét duyệt.
- Nội dung diễn biến.
- Next Step.

Nếu chọn `Pending Issue` là một task chưa hoàn thành, công việc mới sẽ tự chuyển sang trạng thái `Bị chặn`.

## 5. Công việc phụ

Có thể tạo công việc phụ từ menu của task hoặc trong màn hình chi tiết task.

Công việc phụ có các thông tin chính:

- Tên công việc phụ.
- Người phụ trách.
- Thời gian dự kiến.
- Ngày bắt đầu.
- Deadline.
- Mức độ ưu tiên.
- Yêu cầu phê duyệt.
- Người xét duyệt.
- Nội dung diễn biến.
- Next Step.

Task chính có thể mở rộng hoặc thu gọn để xem danh sách công việc phụ.

## 6. Trạng thái công việc

Các trạng thái chính:

- Chưa thực hiện.
- Đang xử lý.
- Bị chặn.
- Chờ phê duyệt.
- Đã phê duyệt.
- Hoàn thành.
- Đã hủy.

Nếu task có yêu cầu phê duyệt, khi chuyển sang `Hoàn thành`, hệ thống sẽ đưa task sang `Chờ phê duyệt`.

Nếu task đang phụ thuộc vào một `Pending Issue` chưa hoàn thành, người dùng không thể chuyển task sang trạng thái xử lý/hoàn thành cho đến khi task trước đó hoàn tất hoặc bị hủy.

Khi task trước được hoàn thành, các task đang bị chặn bởi task đó sẽ được tự động mở khóa.

## 7. Chi tiết công việc

Bấm vào tiêu đề task hoặc subtask để mở màn hình chi tiết.

Trong màn hình chi tiết có thể xem hoặc chỉnh sửa:

- Tên công việc.
- Trạng thái.
- Mức độ ưu tiên.
- Thời gian dự kiến.
- Người phụ trách.
- Yêu cầu phê duyệt.
- Người xét duyệt.
- Ngày bắt đầu và deadline.
- Nội dung diễn biến.
- Pending Issue.
- Next Step.
- Tài liệu đính kèm.
- Bình luận và báo cáo.

## 8. Tài liệu đính kèm

Tài liệu có thể được đính kèm trong phần bình luận hoặc hiển thị trong chi tiết công việc.

Khi đính kèm tài liệu, có thể chọn:

- Upload từ máy tính.
- Chọn từ thư viện tài liệu.
- Nhập Google Drive URL.

Nếu `Loại văn bản` là `File mẫu`, tài liệu sẽ được tách riêng trong nhóm file mẫu.

## 9. Bình luận và nhắc tên

Khu vực `Bình luận & Báo cáo` nằm bên phải màn hình chi tiết.

Người dùng có thể:

- Soạn bình luận rich text.
- Nhắc tên luật sư liên quan.
- Đính kèm tài liệu vào bình luận.
- Phản hồi một bình luận hoặc tài liệu.
- Chỉnh sửa bình luận của mình.
- Xóa bình luận hoặc tài liệu của mình.

Phím tắt gửi bình luận:

- `Ctrl + Enter` trên Windows.
- `Cmd + Enter` trên macOS.

Toolbar bình luận hỗ trợ:

- Chọn font size: 12px, 14px, 16px, 18px, 20px, 24px.
- In đậm, in nghiêng, gạch chân, gạch ngang.
- Căn lề.
- Tăng hoặc giảm thụt lề.
- Trích dẫn.
- Code block.
- Danh sách số hoặc danh sách chấm.
- Chèn link.
- Đính kèm tài liệu.
- Xóa định dạng.

Khi đặt con trỏ rồi chọn font size, các chữ nhập tiếp theo sẽ dùng font size mới.

## 10. Timesheet

Chọn `Ghi nhận Timesheet` trong màn hình chi tiết để ghi nhận giờ làm việc.

Thông tin timesheet gồm:

- Luật sư phụ trách.
- Ngày giờ thực hiện.
- Số giờ thực hiện.
- Đơn giá theo giờ, quản lý có thể chỉnh.
- Nội dung mô tả công việc.

Hệ thống tự tính:

- Giờ kết thúc dự kiến.
- Tổng giờ.
- Thành tiền, hiển thị cho quản lý.
- Năng suất dựa trên thời gian dự kiến và thời gian thực tế.

## 11. Lịch sử hoạt động

Quản lý có thể mở `Lịch sử hoạt động` trong màn hình chi tiết.

Lịch sử ghi nhận các thay đổi như:

- Đổi trạng thái.
- Đổi người phụ trách.
- Cập nhật nội dung diễn biến.
- Cập nhật next step.
- Tạo, sửa hoặc xóa bình luận.
- Nhắc tên người dùng.
- Thêm, đổi tên hoặc xóa tài liệu.

## 12. Lưu ý sử dụng

Nên nhập deadline và thời gian dự kiến để hệ thống tính quá hạn và năng suất chính xác.

Nên dùng `Pending Issue` khi một công việc chỉ được bắt đầu sau khi công việc khác hoàn thành.

Nên nhập `Next Step` để người tiếp theo hiểu rõ bước cần làm sau đó.

Việc xóa task/subtask là thao tác không thể hoàn tác, cần kiểm tra kỹ trước khi xác nhận.

