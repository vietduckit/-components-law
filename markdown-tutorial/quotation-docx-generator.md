# Hướng Dẫn Xuất Báo Giá DOCX

## 1. Tổng quan

Tính năng này dùng để tạo file DOCX cho báo giá từ mẫu có sẵn.

Người dùng có thể:

- Xem trước file báo giá.
- Tải file DOCX về máy.
- Lưu file đã generate vào thư mục tài liệu của báo giá.
- Làm mới dữ liệu trước khi generate.

## 2. Điều kiện cần có

Báo giá cần có:

- Mẫu DOCX đã được chọn.
- Mẫu DOCX có file đính kèm.
- Thông tin khách hàng hoặc lead.
- Danh sách dịch vụ trong báo giá.

Nếu thiếu mẫu hoặc mẫu không có file, hệ thống sẽ báo lỗi khi generate.

## 3. Cách hệ thống tạo file

Khi bấm `Preview Quotation` hoặc `Save to Documents`, hệ thống sẽ:

1. Tải dữ liệu báo giá hiện tại.
2. Tải danh sách dịch vụ trong báo giá.
3. Tải chi tiết dịch vụ để lấy tên dịch vụ, ngày dự kiến và danh sách task.
4. Tải file mẫu DOCX đã chọn.
5. Thay các biến `{{...}}` trong mẫu bằng dữ liệu thực tế.
6. Tạo file DOCX mới.

## 4. Dữ liệu dịch vụ

Mỗi dịch vụ trong báo giá được đưa vào biến `services`.

Các biến trong từng dòng dịch vụ:

| Biến | Ý nghĩa |
|---|---|
| `{{stt}}` | Số thứ tự |
| `{{service_name}}` | Tên dịch vụ |
| `{{serviceName}}` | Tên dịch vụ |
| `{{tasks_list}}` | Danh sách task dạng text |
| `{{tasksList}}` | Danh sách task dạng text |
| `{{estimated_days}}` | Số ngày dự kiến |
| `{{estimatedDays}}` | Số ngày dự kiến |
| `{{quantity}}` | Số lượng |
| `{{price}}` | Đơn giá |
| `{{total}}` | Thành tiền trước VAT |

## 5. Công thức tính tiền

Với mỗi dịch vụ:

`Thành tiền = Đơn giá x Số lượng`

`VAT dòng = Thành tiền x VAT%`

Tổng báo giá:

`sub_total = Tổng thành tiền trước VAT`

`vat_amount = Tổng VAT`

`total_with_vat = Tổng thành tiền + VAT`

Lưu ý: `grand_total` hiện đang bằng `sub_total`. Nếu cần tổng sau VAT, dùng `total_with_vat`.

## 6. Biến dùng trong mẫu DOCX

Các biến chính:

| Biến | Ý nghĩa |
|---|---|
| `{{document_title}}` | Tiêu đề tài liệu |
| `{{customer_name}}` | Tên khách hàng |
| `{{customer_short_name}}` | Tên ngắn của khách hàng |
| `{{company_name}}` | Tên công ty phát hành |
| `{{short_name_company}}` | Tên ngắn công ty |
| `{{quotation_number}}` | Số báo giá |
| `{{date}}` | Ngày generate |
| `{{date_day}}` | Ngày |
| `{{date_month}}` | Tháng |
| `{{date_year}}` | Năm |
| `{{overview}}` | Nội dung tổng quan |
| `{{services}}` | Danh sách dịch vụ |
| `{{sub_total}}` | Tổng trước VAT |
| `{{vat_amount}}` | Tổng VAT |
| `{{grand_total}}` | Tổng trước VAT |
| `{{total_with_vat}}` | Tổng sau VAT |

## 7. Quy tắc đặt tên tài liệu

Tiêu đề tài liệu khi lưu vào hệ thống có dạng:

`Số báo giá / Proposal / CBI - Tên khách hàng`

File DOCX generate có dạng:

`Proposal_SốBáoGiá_ThờiGian.docx`

## 8. Xem trước và lưu

Bấm `Preview Quotation` để tạo file tạm và mở bằng Microsoft Office Online trong popup preview.

Trong popup có thể:

- Đóng preview.
- Tải DOCX.
- Lưu file vào hệ thống.

Bấm `Save to Documents` để lưu file vào thư mục của báo giá nếu tìm thấy thư mục phù hợp.

## 9. Lỗi thường gặp

Không generate được:

- Báo giá chưa chọn mẫu DOCX.
- Mẫu DOCX chưa có file đính kèm.
- Biến trong Word sai cú pháp `{{ten_bien}}`.

Số tiền không đúng:

- Kiểm tra đơn giá.
- Kiểm tra số lượng.
- Kiểm tra VAT của từng dịch vụ.

