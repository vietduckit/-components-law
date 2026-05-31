# Hướng Dẫn Nghiệp Vụ Quản Lý Dịch Vụ Trong Vụ Việc

## 1. Tổng quan

Màn hình `Service List` dùng để quản lý các dịch vụ thuộc một vụ việc.

Một dịch vụ trong vụ việc có thể liên kết với:

- Dịch vụ trong danh mục chung.
- Báo giá gốc.
- Báo giá bổ sung.
- Hợp đồng gốc.
- Phụ lục hợp đồng.
- Thư mục tài liệu tương ứng.

Mục tiêu nghiệp vụ là theo dõi vòng đời dịch vụ từ lúc phát sinh nhu cầu, lập báo giá, tạo hợp đồng, kích hoạt thực hiện và quản lý tài liệu liên quan.

## 2. Giao diện danh sách dịch vụ

Bảng dịch vụ hiển thị:

- STT.
- Loại dịch vụ.
- Phí dịch vụ.
- Tên dịch vụ.
- Mô tả chi tiết.
- Trạng thái.
- Hành động.

Mỗi dịch vụ có thể có nhãn:

- `Main`: dịch vụ thuộc báo giá gốc.
- `Sub`: dịch vụ phát sinh thuộc báo giá bổ sung.

## 3. Trạng thái dịch vụ

Các trạng thái chính:

| Trạng thái | Ý nghĩa |
|---|---|
| `pending_quote` | Dịch vụ đang chờ báo giá hoặc báo giá chưa được đặt hàng |
| `ordered` | Báo giá đã được khách hàng chấp nhận/ordered |
| `contracted` | Đã tạo hợp đồng hoặc phụ lục ở trạng thái draft |
| `active` | Hợp đồng đã vào giai đoạn thực hiện |
| `completed` | Dịch vụ đã hoàn tất |
| `cancelled` | Dịch vụ đã hủy |

Trạng thái dịch vụ được xác định dựa trên tiến trình báo giá và hợp đồng liên quan.

## 4. Logic xác định trạng thái

Khi tải dữ liệu, hệ thống kiểm tra dịch vụ đang nằm trong báo giá nào.

Nếu dịch vụ thuộc báo giá chưa được chấp nhận:

- Trạng thái là `pending_quote`.

Nếu báo giá có trạng thái như:

- `order`
- `ordered`
- `won`
- `done`
- `approved`
- `accepted`

thì dịch vụ được xem là `ordered`.

Nếu báo giá đã có hợp đồng liên kết:

- Hợp đồng còn draft thì dịch vụ là `contracted`.
- Hợp đồng ở trạng thái `execution`, `active` hoặc `signed` thì dịch vụ là `active`.

## 5. Thêm dịch vụ mới

Chọn `Add Service` để thêm dịch vụ vào vụ việc.

Có thể chọn từ danh mục dịch vụ hoặc nhập thủ công.

Các trường gồm:

- Dịch vụ từ danh mục, tùy chọn.
- Loại dịch vụ.
- Phí dịch vụ.
- Tên dịch vụ.
- Mô tả chi tiết.

Nếu vụ việc đã có báo giá gốc, dịch vụ mới sẽ được đưa vào báo giá bổ sung.

Nếu vụ việc chưa có báo giá gốc, dịch vụ chỉ được lưu vào vụ việc và chưa đồng bộ sang báo giá.

## 6. Quy tắc chống trùng dịch vụ

Hệ thống không cho thêm dịch vụ nếu tên dịch vụ đã tồn tại trong vụ việc.

Khi chọn từ danh mục, các dịch vụ đã có trong vụ việc sẽ bị vô hiệu hóa và hiển thị ghi chú `Already added to Case`.

## 7. Logic tạo báo giá bổ sung

Khi thêm dịch vụ mới vào vụ việc đã có báo giá gốc, hệ thống sẽ:

1. Kiểm tra có báo giá bổ sung nào còn chỉnh sửa được không.
2. Nếu có, thêm dịch vụ vào báo giá bổ sung đó.
3. Nếu không có, tạo báo giá bổ sung mới.
4. Cập nhật tổng tiền báo giá.
5. Tạo thư mục cho báo giá bổ sung.

Báo giá bổ sung mới sẽ có mã dạng:

`PL + số thứ tự + tháng + năm`

## 8. Đồng bộ phí dịch vụ

Khi sửa `Base Price`, hệ thống tính phần chênh lệch giữa giá mới và giá cũ.

Sau đó hệ thống cập nhật:

- Phí dịch vụ trong báo giá.
- Tổng tiền báo giá.
- Tổng tiền hợp đồng nếu đã có hợp đồng liên quan.

Cách tính là cộng hoặc trừ phần chênh lệch, không tạo lại toàn bộ báo giá.

## 9. Chỉnh sửa dịch vụ

Có thể click trực tiếp vào các ô để sửa:

- Loại dịch vụ.
- Phí dịch vụ.
- Tên dịch vụ.
- Mô tả chi tiết.

Khi sửa tên dịch vụ, hệ thống kiểm tra trùng tên trước khi lưu.

Nếu dịch vụ có liên kết với báo giá, thay đổi sẽ được đồng bộ sang báo giá tương ứng.

## 10. Khi nào dịch vụ bị khóa chỉnh sửa

Dịch vụ sẽ không thể chỉnh sửa hoặc xóa nếu:

- Dịch vụ thuộc báo giá gốc.
- Báo giá bổ sung đã ở trạng thái `sent`, `order`, `ordered`, `won`, `done`, `cancelled`, `approved` hoặc `accepted`.

Nghiệp vụ này nhằm tránh thay đổi dịch vụ sau khi báo giá đã được gửi hoặc đã được khách hàng chấp nhận.

## 11. Xóa dịch vụ

Chỉ có thể xóa dịch vụ phát sinh thuộc báo giá bổ sung còn chỉnh sửa được.

Khi xóa, hệ thống sẽ:

1. Gỡ dịch vụ khỏi báo giá bổ sung.
2. Trừ giá trị dịch vụ khỏi tổng tiền báo giá.
3. Trừ giá trị dịch vụ khỏi tổng tiền hợp đồng nếu có.
4. Xóa dịch vụ khỏi vụ việc.

Dịch vụ thuộc báo giá gốc không được xóa tại màn hình này.

## 12. Tạo hợp đồng

Khi dịch vụ ở trạng thái `ordered`, hệ thống hiển thị nút tạo hợp đồng.

Nếu dịch vụ thuộc báo giá gốc:

- Hệ thống tạo hợp đồng gốc.
- Liên kết hợp đồng với vụ việc.
- Liên kết báo giá với hợp đồng.
- Tạo thư mục hợp đồng trong thư mục vụ việc.

Nếu dịch vụ thuộc báo giá bổ sung:

- Vụ việc phải có hợp đồng gốc trước.
- Hệ thống tạo phụ lục hợp đồng dưới hợp đồng gốc.
- Phụ lục lấy một số thông tin từ hợp đồng gốc.
- Liên kết báo giá bổ sung với phụ lục.
- Tạo thư mục phụ lục trong thư mục hợp đồng gốc.

Sau khi tạo hợp đồng hoặc phụ lục, dịch vụ chuyển sang `contracted`.

## 13. Kích hoạt dịch vụ

Khi dịch vụ ở trạng thái `contracted`, hệ thống hiển thị nút `Activate`.

Khi kích hoạt:

- Dịch vụ được chuyển sang `active`.
- Hợp đồng liên kết được chuyển sang trạng thái `execution`.
- Nếu dịch vụ active chưa có thư mục, hệ thống tự tạo thư mục dịch vụ.

## 14. Logic thư mục tài liệu

Hệ thống tự động tạo thư mục trong các trường hợp sau:

- Tạo báo giá bổ sung.
- Tạo hợp đồng gốc.
- Tạo phụ lục hợp đồng.
- Dịch vụ chuyển sang `active`.

## 15. Luồng nghiệp vụ đề xuất

1. Tạo hoặc kiểm tra báo giá gốc của vụ việc.
2. Thêm dịch vụ phát sinh trong màn hình `Service List`.
3. Hệ thống tạo hoặc cập nhật báo giá bổ sung.
4. Khi báo giá được khách hàng chấp nhận, trạng thái dịch vụ chuyển thành `ordered`.
5. Chọn tạo hợp đồng hoặc phụ lục.
6. Sau khi hợp đồng được ký, chọn `Activate`.
7. Dịch vụ chuyển sang thực hiện và thư mục tài liệu được tạo tự động.

## 16. Lưu ý sử dụng

Không nên sửa dịch vụ sau khi báo giá đã gửi hoặc đã được chấp nhận.

Nếu cần thay đổi dịch vụ sau khi báo giá đã chốt, nên tạo một dịch vụ phát sinh mới để đi theo báo giá bổ sung mới.

Nên nhập đúng phí dịch vụ ngay từ đầu vì phí được đồng bộ sang báo giá và hợp đồng.

Nên dùng danh mục dịch vụ khi có thể để dữ liệu thống nhất giữa các vụ việc.

