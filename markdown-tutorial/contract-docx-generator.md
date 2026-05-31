# Hướng Dẫn Xuất Hợp Đồng DOCX

## 1. Tổng quan

Tính năng này dùng để tạo file DOCX cho hợp đồng từ mẫu có sẵn.

Người dùng có thể:

- Xem trước hợp đồng.
- Tải file DOCX.
- Lưu file đã generate vào thư mục tài liệu của hợp đồng.
- Làm mới dữ liệu trước khi generate.

## 2. Điều kiện cần có

Hợp đồng cần có:

- Mẫu DOCX đã được chọn.
- Mẫu DOCX có file đính kèm.
- Thông tin khách hàng.
- Báo giá liên kết để lấy danh sách dịch vụ.
- Thông tin dịch vụ và phạm vi công việc.

Nếu thiếu mẫu hoặc mẫu không có file, hệ thống sẽ báo lỗi khi generate.

## 3. Cách hệ thống tạo file

Khi bấm `Preview Contract` hoặc `Save to Documents`, hệ thống sẽ:

1. Tải dữ liệu hợp đồng hiện tại.
2. Lấy báo giá liên kết với hợp đồng.
3. Lấy danh sách dịch vụ từ báo giá.
4. Lấy chi tiết dịch vụ để đưa phạm vi công việc vào hợp đồng.
5. Tải file mẫu DOCX.
6. Thay các biến `{{...}}` trong mẫu bằng dữ liệu thực tế.
7. Tạo file DOCX mới.

## 4. Dữ liệu dịch vụ

Mỗi dịch vụ trong hợp đồng được đưa vào biến `services`.

Các biến trong từng dòng dịch vụ:

| Biến | Ý nghĩa |
|---|---|
| `{{service_stt}}` | Số thứ tự |
| `{{service_name}}` | Tên dịch vụ |
| `{{task_list}}` | Danh sách công việc dạng text |
| `{{tasks}}` | Danh sách công việc dạng mảng |
| `{{sub_total}}` | Thành tiền trước VAT |
| `{{service_vat}}` | VAT của dịch vụ |

Nếu muốn format danh sách công việc đẹp trong Word, nên dùng biến mảng `tasks` với biến con:

`{{task_name}}`

## 5. Công thức tính tiền

Với mỗi dịch vụ:

`Thành tiền = Đơn giá x Số lượng`

`VAT dòng = Thành tiền x VAT%`

Tổng hợp đồng:

`sub_totalAmount = Tổng trước VAT`

`vatAmount = Tổng VAT`

`total_with_vat = Tổng sau VAT`

Hệ thống tự chia thanh toán thành 2 đợt:

`Đợt 1 = 70% tổng sau VAT`

`Đợt 2 = 30% tổng sau VAT`

## 6. Biến thông tin hợp đồng

Các biến chính:

| Biến | Ý nghĩa |
|---|---|
| `{{document_title}}` | Tiêu đề tài liệu |
| `{{contract_code}}` | Số hợp đồng |
| `{{language}}` | Ngôn ngữ hợp đồng |
| `{{date_day}}` | Ngày generate |
| `{{date_month}}` | Tháng generate |
| `{{date_year}}` | Năm generate |
| `{{quotation_description}}` | Mô tả hoặc overview từ báo giá |
| `{{services}}` | Danh sách dịch vụ |
| `{{sub_totalAmount}}` | Tổng trước VAT |
| `{{vatAmount}}` | Tổng VAT |
| `{{total_with_vat}}` | Tổng sau VAT |

## 7. Biến thông tin khách hàng

Các biến khách hàng:

| Biến | Ý nghĩa |
|---|---|
| `{{customer_name}}` | Tên đầy đủ khách hàng |
| `{{customer_short_name}}` | Tên ngắn khách hàng |
| `{{address}}` | Địa chỉ |
| `{{phone}}` | Số điện thoại |
| `{{customer_id_title}}` | Loại giấy tờ hoặc mã số doanh nghiệp |
| `{{customer_id_number}}` | Số giấy tờ hoặc mã số doanh nghiệp |
| `{{representative_title}}` | Nhãn người đại diện pháp luật |
| `{{coporate_representative}}` | Người đại diện pháp luật |
| `{{customer_issued_place}}` | Nơi cấp giấy tờ cá nhân |
| `{{customer_issued_date}}` | Ngày cấp giấy tờ cá nhân |

Nếu khách hàng là công ty, hệ thống ưu tiên mã số doanh nghiệp và người đại diện pháp luật.

Nếu khách hàng là cá nhân, hệ thống ưu tiên CCCD/CMND, nơi cấp và ngày cấp.

## 8. Biến thanh toán

Các biến thanh toán:

| Biến | Ý nghĩa |
|---|---|
| `{{total_amount_part_one}}` | Số tiền đợt 1 |
| `{{total_amount_convert_text_part_one}}` | Số tiền đợt 1 bằng chữ |
| `{{total_amount_part_two}}` | Số tiền đợt 2 |
| `{{total_amount_convert_text_part_two}}` | Số tiền đợt 2 bằng chữ |

## 9. Quy tắc đặt tên tài liệu

Tiêu đề tài liệu khi lưu vào hệ thống có dạng:

`Số hợp đồng / Contract / CBI - Tên khách hàng`

File DOCX generate có dạng:

`Contract_SốHợpĐồng_ThờiGian.docx`

## 10. Xem trước và lưu

Bấm `Preview Contract` để tạo file tạm và mở bằng Microsoft Office Online trong popup preview.

Trong popup có thể:

- Đóng preview.
- Tải DOCX.
- Lưu file vào hệ thống.

Bấm `Save to Documents` để lưu file vào thư mục của hợp đồng nếu tìm thấy thư mục phù hợp.

## 11. Lỗi thường gặp

Không generate được:

- Hợp đồng chưa chọn mẫu DOCX.
- Mẫu DOCX chưa có file đính kèm.
- Hợp đồng chưa có báo giá liên kết.
- Biến trong Word sai cú pháp `{{ten_bien}}`.

Số tiền thanh toán không đúng:

- Kiểm tra danh sách dịch vụ trong báo giá liên kết.
- Kiểm tra đơn giá, số lượng và VAT.
- Kiểm tra logic chia 70% và 30%.

