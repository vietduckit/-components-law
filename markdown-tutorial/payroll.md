# Hướng Dẫn Nghiệp Vụ Phiếu Lương Và Xuất DOCX

## 1. Tổng quan

Bộ tính năng phiếu lương gồm hai phần chính:

- `Payroll Calculator`: nhập thông tin lương, phụ cấp, khấu trừ và tự động tính lương thực nhận.
- `Payroll DOCX Generator`: lấy dữ liệu phiếu lương đã lưu, đưa vào mẫu DOCX, xem trước, tải xuống hoặc lưu file vào phiếu lương.

Luồng sử dụng đề xuất:

1. Nhập hoặc cập nhật phiếu lương.
2. Kiểm tra kết quả tính lương.
3. Lưu phiếu lương.
4. Chọn mẫu DOCX.
5. Xem trước file phiếu lương.
6. Tải file hoặc lưu file vào phiếu lương.

## 2. Thông tin phiếu lương

Phần thông tin chung gồm:

- Tiêu đề phiếu lương.
- Công ty phát hành.
- Mẫu phiếu lương DOCX.
- Ngày phát hành.
- Người lập phiếu.
- Người nhận lương.
- Ngày công chuẩn.
- Ngày công đi làm.

Tiêu đề mặc định được tạo theo dạng:

`Phiếu lương MM/YYYY - Tên người nhận`

Nếu người dùng chưa sửa tiêu đề thủ công, tiêu đề sẽ tự cập nhật khi đổi ngày phát hành hoặc người nhận.

## 3. Ngày công chuẩn và ngày công thực tế

Ngày công chuẩn được hệ thống tự tính theo tháng phát hành.

Cách tính:

- Đếm tất cả ngày trong tháng.
- Loại trừ Chủ nhật.
- Không tự loại trừ ngày lễ hoặc ngày nghỉ đặc biệt.

Tỷ lệ tính lương:

`Ngày công đi làm / Ngày công chuẩn`

## 4. Thu nhập

Các khoản thu nhập gồm:

- Lương chính.
- Phụ cấp trách nhiệm.
- Phụ cấp ăn trưa.
- Phụ cấp điện thoại.
- Phụ cấp đi lại, xăng xe.
- Phụ cấp nhà ở.
- Phụ cấp nuôi con nhỏ.
- Phụ cấp khác.

Lương chính được tính theo ngày công:

`Lương chính theo ngày công = Lương chính x Tỷ lệ tính lương`

Tổng thu nhập:

`Tổng thu nhập = Lương chính theo ngày công + Tổng phụ cấp`

## 5. Khấu trừ bảo hiểm

Người dùng có thể nhập `Lương đóng BHBB`.

Nếu bỏ trống, hệ thống dùng `Lương chính` làm cơ sở tính bảo hiểm.

Các khoản bảo hiểm bắt buộc:

| Khoản khấu trừ | Tỷ lệ |
|---|---:|
| Bảo hiểm xã hội | 8% |
| Bảo hiểm y tế | 1,5% |
| Bảo hiểm thất nghiệp | 1% |

## 6. Thuế TNCN

Thu nhập tính thuế:

`Thu nhập tính thuế = Tổng thu nhập - Tổng BHBB - 11.000.000`

Nếu kết quả nhỏ hơn 0, hệ thống tính là 0.

Thuế TNCN được tính theo biểu lũy tiến:

| Bậc | Phần thu nhập tính thuế | Thuế suất |
|---|---:|---:|
| 1 | Đến 5 triệu | 5% |
| 2 | Trên 5 đến 10 triệu | 10% |
| 3 | Trên 10 đến 18 triệu | 15% |
| 4 | Trên 18 đến 32 triệu | 20% |
| 5 | Trên 32 đến 52 triệu | 25% |
| 6 | Trên 52 đến 80 triệu | 30% |
| 7 | Trên 80 triệu | 35% |

Hiện tại hệ thống chỉ áp dụng giảm trừ cá nhân 11 triệu, chưa có phần nhập giảm trừ người phụ thuộc.

## 7. Lương thực nhận

Tổng khấu trừ:

`Tổng BHBB + Thuế TNCN + Tạm ứng`

Lương thực nhận:

`Thực nhận = Tổng thu nhập - Tổng khấu trừ`

Nếu kết quả nhỏ hơn 0, hệ thống hiển thị là 0.

Hệ thống cũng tự đổi số tiền thực nhận sang chữ để đưa vào phiếu lương DOCX.

## 8. Lưu phiếu lương

Sau khi nhập đủ thông tin, chọn:

- `Lưu phiếu lương` nếu là phiếu mới.
- `Cập nhật` nếu đang sửa phiếu đã có.

Nút `Làm lại` sẽ đưa form về dữ liệu ban đầu của phiếu lương hiện tại.

## 9. Chọn mẫu DOCX

Trước khi xuất file, phiếu lương cần có mẫu DOCX.

Khi chọn công ty, danh sách mẫu DOCX sẽ được lọc theo công ty đó nếu mẫu có gắn công ty.

Nếu đổi công ty, mẫu DOCX đang chọn sẽ được reset để tránh dùng sai mẫu.

Mẫu DOCX phải có file đính kèm hợp lệ.

## 10. Biến dùng trong mẫu DOCX

Trong file DOCX, đặt biến theo cú pháp:

`{{ten_bien}}`

Các biến thường dùng:

| Biến | Ý nghĩa |
|---|---|
| `{{name}}` | Tên công ty |
| `{{address}}` | Địa chỉ công ty |
| `{{issueDate}}` | Ngày phát hành dạng đầy đủ |
| `{{title}}` | Tiêu đề phiếu lương |
| `{{employeeCode}}` | Mã nhân sự |
| `{{lawyerName}}` | Người nhận lương |
| `{{lawyerType}}` | Chức danh / loại nhân sự |
| `{{standard_work_days}}` | Ngày công chuẩn |
| `{{actual_work_days}}` | Ngày công đi làm |
| `{{basic_salary}}` | Lương chính |
| `{{earned_basic_salary}}` | Lương chính theo ngày công |
| `{{allowance}}` | Tổng phụ cấp |
| `{{insurance_salary_basis}}` | Lương đóng BHBB |
| `{{deduction_social_ins}}` | Bảo hiểm xã hội |
| `{{deduction_health_ins}}` | Bảo hiểm y tế |
| `{{deduction_unemp_ins}}` | Bảo hiểm thất nghiệp |
| `{{deduction_pit}}` | Thuế TNCN |
| `{{deduction_advance}}` | Tạm ứng |
| `{{total_income}}` | Tổng thu nhập |
| `{{total_deductions}}` | Tổng khấu trừ |
| `{{net_salary}}` | Lương thực nhận |
| `{{net_salary_in_words}}` | Lương thực nhận bằng chữ |

## 11. Xem trước, tải và lưu DOCX

Chọn `Xem trước` để hệ thống tạo file DOCX tạm và mở bằng trình xem Office online.

Trong màn hình xem trước có thể:

- Đóng preview.
- Tải file DOCX.
- Lưu file vào phiếu lương.

Nếu đã xem trước trước đó, hệ thống dùng lại file preview để lưu.

Nếu chưa xem trước, hệ thống sẽ generate file mới rồi lưu.

## 12. Lưu ý nghiệp vụ

Nên chọn công ty trước khi chọn mẫu DOCX.

Nên lưu phiếu lương sau khi kiểm tra kết quả tính toán rồi mới generate DOCX.

Ngày công chuẩn hiện tại chỉ loại trừ Chủ nhật, không tự loại trừ ngày lễ.

Phụ cấp hiện tại được cộng nguyên khoản, không tự chia theo tỷ lệ ngày công.

