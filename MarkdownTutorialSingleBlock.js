
const { React } = ctx;
const { useMemo, useState } = React;
const { Button, Empty, Modal } = ctx.antd;

const FONT = "Inter, Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const TUTORIALS = [
  {
    "key": "document",
    "label": "Quản lý tài liệu",
    "content": "# Hướng Dẫn Sử Dụng Quản Lý Tài Liệu\n\n## 1. Tổng quan\n\nMàn hình Quản lý tài liệu dùng để lưu trữ, phân loại, tìm kiếm, xem trước, chỉnh sửa thông tin và theo dõi lịch sử thao tác của tài liệu/thư mục.\n\nNgười dùng có thể:\n\n- Tạo thư mục và thư mục con.\n- Upload tài liệu hoặc upload cả thư mục.\n- Gắn metadata cho tài liệu.\n- Tìm kiếm, lọc và sắp xếp tài liệu.\n- Kéo thả để di chuyển hoặc đổi thứ tự.\n- Xem trước, tải xuống, chỉnh sửa hoặc xóa tài liệu.\n- Xem lịch sử hoạt động của tài liệu/thư mục.\n\n## 2. Giao diện chính\n\nBên trái là cây thư mục `DANH MỤC`.\n\nKhu vực chính hiển thị danh sách thư mục và tài liệu trong thư mục đang chọn.\n\nCác thông tin thường thấy gồm:\n\n- STT\n- Ngày ban hành\n- Loại văn bản\n- Tên văn bản\n- Người quản lý\n- Số hiệu\n- Người gửi\n- Người nhận\n- Tóm tắt nội dung\n- Ngôn ngữ\n- Hình thức tài liệu\n- Ghi chú\n- Dung lượng\n- Người upload\n- Ngày upload\n\n## 3. Quyền truy cập\n\nAdmin có toàn quyền quản lý.\n\nVới người dùng thường:\n\n- Người tạo thư mục có quyền quản lý thư mục đó.\n- Người được gán quyền `manager` có thể quản lý thư mục.\n- Người được gán quyền `editor` có thể chỉnh sửa nội dung trong thư mục.\n- Người chỉ có quyền xem sẽ không thể sửa, xóa hoặc di chuyển.\n- Quyền có thể được kế thừa từ thư mục cha.\n\nMột số thư mục có biểu tượng khóa chỉ dùng để điều hướng. Người dùng có thể nhìn thấy đường dẫn nhưng không thao tác trực tiếp trên thư mục đó.\n\n## 4. Tạo thư mục\n\nChọn nút `Mới`, sau đó chọn `Thư mục mới`.\n\nNhập tên thư mục và xác nhận để tạo thư mục trong vị trí hiện tại.\n\nSau khi tạo, thư mục sẽ xuất hiện trong cây thư mục và danh sách bên phải.\n\n## 5. Phân quyền thư mục\n\nMở menu thao tác của thư mục, chọn phần phân quyền hoặc chi tiết thư mục.\n\nCó thể thêm người dùng vào thư mục với vai trò phù hợp:\n\n- Quản lý\n- Thành viên chỉnh sửa\n- Thành viên chỉ xem\n\nSau khi lưu, quyền sẽ áp dụng cho thư mục hiện tại và ảnh hưởng đến khả năng thao tác của người dùng trong thư mục đó.\n\n## 6. Upload tài liệu\n\nChọn `Mới`, sau đó chọn `Tải tệp lên`.\n\nKhi upload, có thể nhập các thông tin tài liệu:\n\n- Tên văn bản\n- Loại văn bản\n- Số hiệu\n- Ngày ban hành\n- Ngày ký\n- Ngày hiệu lực\n- Người gửi\n- Người nhận\n- Tóm tắt nội dung\n- Ngôn ngữ\n- Hình thức tài liệu\n- Link Google Drive\n- Ghi chú\n- File đính kèm\n\nSau khi lưu, tài liệu được đưa vào thư mục hiện tại và tự động có STT trong danh sách.\n\n## 7. Upload cả thư mục\n\nCó thể upload một thư mục từ máy tính.\n\nHệ thống sẽ:\n\n- Giữ lại cấu trúc thư mục con.\n- Tạo các thư mục tương ứng trên hệ thống.\n- Upload các file bên trong.\n- Hiển thị tiến trình xử lý trong lúc upload.\n\nTính năng này phù hợp khi cần đưa một bộ hồ sơ lớn lên hệ thống.\n\n## 8. Tìm kiếm và lọc\n\nCó thể tìm kiếm theo tên thư mục, tên tài liệu hoặc metadata của tài liệu.\n\nCác trường có thể được dùng để tìm kiếm gồm:\n\n- Tên văn bản\n- Loại văn bản\n- Số hiệu\n- Người gửi\n- Người nhận\n- Tóm tắt nội dung\n- Ngôn ngữ\n- Hình thức tài liệu\n- Ghi chú\n\nNgoài ra có thể lọc theo:\n\n- Người upload\n- Khoảng ngày upload\n\n## 9. Thao tác với thư mục và tài liệu\n\nMỗi dòng có menu thao tác riêng.\n\nVới thư mục, có thể:\n\n- Mở thư mục\n- Xem chi tiết\n- Phân quyền\n- Di chuyển\n- Xóa\n- Xem lịch sử hoạt động, nếu có quyền\n\nVới tài liệu, có thể:\n\n- Xem trước\n- Tải xuống\n- Xem chi tiết\n- Chỉnh sửa metadata\n- Di chuyển\n- Xóa\n- Xem lịch sử hoạt động, nếu có quyền\n\n## 10. Kéo thả\n\nCó thể kéo thả để thao tác nhanh:\n\n- Kéo tài liệu vào thư mục để di chuyển.\n- Kéo thư mục vào thư mục khác để đổi vị trí.\n- Kéo lên hoặc xuống trong danh sách để đổi thứ tự.\n- Kéo vào breadcrumb để di chuyển lên thư mục cha.\n\nSau khi đổi thứ tự, hệ thống cập nhật lại STT.\n\n## 11. Chi tiết tài liệu\n\nKhi mở chi tiết tài liệu, có thể xem và chỉnh sửa thông tin.\n\nCác nhóm thông tin chính:\n\n- Thông tin văn bản\n- File đính kèm\n- Ghi chú\n- Lịch sử hoạt động\n\nCó thể sửa nhanh tên tài liệu, ghi chú và các metadata nếu có quyền chỉnh sửa.\n\n## 12. Xem trước và tải xuống\n\nTài liệu hỗ trợ xem trước tùy theo định dạng file.\n\nCác loại thường được hỗ trợ:\n\n- PDF\n- Hình ảnh\n- HTML\n- Một số file Office thông qua trình xem online\n\nNếu file không hỗ trợ xem trước, người dùng có thể tải xuống để mở bằng phần mềm phù hợp.\n\n## 13. Lịch sử hoạt động\n\nLịch sử hoạt động ghi lại các thao tác trên tài liệu và thư mục.\n\nCác hành động thường gặp:\n\n- Tạo mới\n- Upload\n- Cập nhật\n- Xóa\n\nMỗi log hiển thị:\n\n- Hành động\n- Người thao tác\n- Tệp hoặc thư mục liên quan\n- Nội dung thay đổi\n- Thời gian thao tác\n\nVới thao tác cập nhật, hệ thống hiển thị giá trị cũ và giá trị mới để người dùng dễ so sánh.\n\nCác thay đổi về STT nội bộ như `fileIndex` hoặc `folderIndex` không hiển thị trong lịch sử để tránh gây nhiễu.\n\n## 14. Làm mới lịch sử\n\nTrong màn hình lịch sử hoạt động, chọn `Làm mới` để tải lại dữ liệu mới nhất.\n\nBảng lịch sử có phân trang, giúp xem các thao tác cũ hơn khi số lượng log lớn.\n\n## 15. Lưu ý sử dụng\n\nNên nhập đầy đủ metadata khi upload tài liệu để dễ tìm kiếm về sau.\n\nKhi xóa thư mục, các thư mục con và tài liệu bên trong cũng có thể bị xóa theo.\n\nChỉ người có quyền phù hợp mới có thể chỉnh sửa, xóa, di chuyển hoặc phân quyền tài liệu/thư mục.\n\nLịch sử hoạt động giúp kiểm tra ai đã thao tác, thao tác vào lúc nào và nội dung đã thay đổi ra sao.\n\n"
  },
  {
    "key": "task",
    "label": "Quản lý công việc",
    "content": "# Hướng Dẫn Sử Dụng Quản Lý Công Việc\n\n## 1. Tổng quan\n\nMàn hình Quản lý công việc dùng để theo dõi task, subtask, người phụ trách, tiến độ, tài liệu, bình luận, lịch sử hoạt động và timesheet trong một vụ việc/dự án.\n\nNgười dùng có thể:\n\n- Tạo công việc chính và công việc phụ.\n- Phân công luật sư phụ trách.\n- Theo dõi trạng thái, deadline, pending issue và next step.\n- Đính kèm tài liệu cho công việc.\n- Bình luận, nhắc tên và phản hồi theo luồng.\n- Ghi nhận giờ làm việc bằng timesheet.\n- Xem lịch sử thay đổi của task/subtask.\n\n## 2. Giao diện danh sách công việc\n\nDanh sách công việc được nhóm theo `Dịch vụ`.\n\nThanh trên cùng hiển thị:\n\n- Tổng số công việc đã hoàn thành.\n- Số công việc đang bị chặn.\n- Số công việc quá hạn.\n- Phần trăm tiến độ.\n- Nút tạo công việc.\n- Nút làm mới dữ liệu.\n\nCác cột chính trong danh sách:\n\n- STT\n- Trạng thái\n- Tiêu đề\n- Ngày cập nhật\n- Người phụ trách\n- Nội dung diễn biến\n- Ngày bắt đầu\n- Deadline\n- Pending Issue\n- Next Step\n- Tài liệu\n- Yêu cầu phê duyệt\n\n## 3. Quyền thao tác\n\nAdmin và quản lý dự án có quyền quản lý toàn bộ công việc.\n\nNgười phụ trách có thể chỉnh sửa công việc được phân công cho mình.\n\nMột số thao tác chỉ dành cho quản lý:\n\n- Phân công người phụ trách.\n- Xóa task/subtask.\n- Bật hoặc tắt yêu cầu phê duyệt.\n- Chọn người xét duyệt.\n- Xem lịch sử hoạt động từ màn hình chi tiết.\n\n## 4. Tạo công việc mới\n\nChọn `Tạo công việc`.\n\nCác trường có thể nhập:\n\n- Tên công việc, bắt buộc.\n- Luật sư phụ trách.\n- Dịch vụ.\n- Ngày bắt đầu.\n- Deadline.\n- Thời gian dự kiến.\n- Pending Issue.\n- Mức độ ưu tiên.\n- Yêu cầu phê duyệt.\n- Người xét duyệt.\n- Nội dung diễn biến.\n- Next Step.\n\nNếu chọn `Pending Issue` là một task chưa hoàn thành, công việc mới sẽ tự chuyển sang trạng thái `Bị chặn`.\n\n## 5. Công việc phụ\n\nCó thể tạo công việc phụ từ menu của task hoặc trong màn hình chi tiết task.\n\nCông việc phụ có các thông tin chính:\n\n- Tên công việc phụ.\n- Người phụ trách.\n- Thời gian dự kiến.\n- Ngày bắt đầu.\n- Deadline.\n- Mức độ ưu tiên.\n- Yêu cầu phê duyệt.\n- Người xét duyệt.\n- Nội dung diễn biến.\n- Next Step.\n\nTask chính có thể mở rộng hoặc thu gọn để xem danh sách công việc phụ.\n\n## 6. Trạng thái công việc\n\nCác trạng thái chính:\n\n- Chưa thực hiện.\n- Đang xử lý.\n- Bị chặn.\n- Chờ phê duyệt.\n- Đã phê duyệt.\n- Hoàn thành.\n- Đã hủy.\n\nNếu task có yêu cầu phê duyệt, khi chuyển sang `Hoàn thành`, hệ thống sẽ đưa task sang `Chờ phê duyệt`.\n\nNếu task đang phụ thuộc vào một `Pending Issue` chưa hoàn thành, người dùng không thể chuyển task sang trạng thái xử lý/hoàn thành cho đến khi task trước đó hoàn tất hoặc bị hủy.\n\nKhi task trước được hoàn thành, các task đang bị chặn bởi task đó sẽ được tự động mở khóa.\n\n## 7. Chi tiết công việc\n\nBấm vào tiêu đề task hoặc subtask để mở màn hình chi tiết.\n\nTrong màn hình chi tiết có thể xem hoặc chỉnh sửa:\n\n- Tên công việc.\n- Trạng thái.\n- Mức độ ưu tiên.\n- Thời gian dự kiến.\n- Người phụ trách.\n- Yêu cầu phê duyệt.\n- Người xét duyệt.\n- Ngày bắt đầu và deadline.\n- Nội dung diễn biến.\n- Pending Issue.\n- Next Step.\n- Tài liệu đính kèm.\n- Bình luận và báo cáo.\n\n## 8. Tài liệu đính kèm\n\nTài liệu có thể được đính kèm trong phần bình luận hoặc hiển thị trong chi tiết công việc.\n\nKhi đính kèm tài liệu, có thể chọn:\n\n- Upload từ máy tính.\n- Chọn từ thư viện tài liệu.\n- Nhập Google Drive URL.\n\nNếu `Loại văn bản` là `File mẫu`, tài liệu sẽ được tách riêng trong nhóm file mẫu.\n\n## 9. Bình luận và nhắc tên\n\nKhu vực `Bình luận & Báo cáo` nằm bên phải màn hình chi tiết.\n\nNgười dùng có thể:\n\n- Soạn bình luận rich text.\n- Nhắc tên luật sư liên quan.\n- Đính kèm tài liệu vào bình luận.\n- Phản hồi một bình luận hoặc tài liệu.\n- Chỉnh sửa bình luận của mình.\n- Xóa bình luận hoặc tài liệu của mình.\n\nPhím tắt gửi bình luận:\n\n- `Ctrl + Enter` trên Windows.\n- `Cmd + Enter` trên macOS.\n\nToolbar bình luận hỗ trợ:\n\n- Chọn font size: 12px, 14px, 16px, 18px, 20px, 24px.\n- In đậm, in nghiêng, gạch chân, gạch ngang.\n- Căn lề.\n- Tăng hoặc giảm thụt lề.\n- Trích dẫn.\n- Code block.\n- Danh sách số hoặc danh sách chấm.\n- Chèn link.\n- Đính kèm tài liệu.\n- Xóa định dạng.\n\nKhi đặt con trỏ rồi chọn font size, các chữ nhập tiếp theo sẽ dùng font size mới.\n\n## 10. Timesheet\n\nChọn `Ghi nhận Timesheet` trong màn hình chi tiết để ghi nhận giờ làm việc.\n\nThông tin timesheet gồm:\n\n- Luật sư phụ trách.\n- Ngày giờ thực hiện.\n- Số giờ thực hiện.\n- Đơn giá theo giờ, quản lý có thể chỉnh.\n- Nội dung mô tả công việc.\n\nHệ thống tự tính:\n\n- Giờ kết thúc dự kiến.\n- Tổng giờ.\n- Thành tiền, hiển thị cho quản lý.\n- Năng suất dựa trên thời gian dự kiến và thời gian thực tế.\n\n## 11. Lịch sử hoạt động\n\nQuản lý có thể mở `Lịch sử hoạt động` trong màn hình chi tiết.\n\nLịch sử ghi nhận các thay đổi như:\n\n- Đổi trạng thái.\n- Đổi người phụ trách.\n- Cập nhật nội dung diễn biến.\n- Cập nhật next step.\n- Tạo, sửa hoặc xóa bình luận.\n- Nhắc tên người dùng.\n- Thêm, đổi tên hoặc xóa tài liệu.\n\n## 12. Lưu ý sử dụng\n\nNên nhập deadline và thời gian dự kiến để hệ thống tính quá hạn và năng suất chính xác.\n\nNên dùng `Pending Issue` khi một công việc chỉ được bắt đầu sau khi công việc khác hoàn thành.\n\nNên nhập `Next Step` để người tiếp theo hiểu rõ bước cần làm sau đó.\n\nViệc xóa task/subtask là thao tác không thể hoàn tác, cần kiểm tra kỹ trước khi xác nhận.\n\n"
  },
  {
    "key": "case-services",
    "label": "Dịch vụ vụ việc",
    "content": "# Hướng Dẫn Nghiệp Vụ Quản Lý Dịch Vụ Trong Vụ Việc\n\n## 1. Tổng quan\n\nMàn hình `Service List` dùng để quản lý các dịch vụ thuộc một vụ việc.\n\nMột dịch vụ trong vụ việc có thể liên kết với:\n\n- Dịch vụ trong danh mục chung.\n- Báo giá gốc.\n- Báo giá bổ sung.\n- Hợp đồng gốc.\n- Phụ lục hợp đồng.\n- Thư mục tài liệu tương ứng.\n\nMục tiêu nghiệp vụ là theo dõi vòng đời dịch vụ từ lúc phát sinh nhu cầu, lập báo giá, tạo hợp đồng, kích hoạt thực hiện và quản lý tài liệu liên quan.\n\n## 2. Giao diện danh sách dịch vụ\n\nBảng dịch vụ hiển thị:\n\n- STT.\n- Loại dịch vụ.\n- Phí dịch vụ.\n- Tên dịch vụ.\n- Mô tả chi tiết.\n- Trạng thái.\n- Hành động.\n\nMỗi dịch vụ có thể có nhãn:\n\n- `Main`: dịch vụ thuộc báo giá gốc.\n- `Sub`: dịch vụ phát sinh thuộc báo giá bổ sung.\n\n## 3. Trạng thái dịch vụ\n\nCác trạng thái chính:\n\n| Trạng thái | Ý nghĩa |\n|---|---|\n| `pending_quote` | Dịch vụ đang chờ báo giá hoặc báo giá chưa được đặt hàng |\n| `ordered` | Báo giá đã được khách hàng chấp nhận/ordered |\n| `contracted` | Đã tạo hợp đồng hoặc phụ lục ở trạng thái draft |\n| `active` | Hợp đồng đã vào giai đoạn thực hiện |\n| `completed` | Dịch vụ đã hoàn tất |\n| `cancelled` | Dịch vụ đã hủy |\n\nTrạng thái dịch vụ được xác định dựa trên tiến trình báo giá và hợp đồng liên quan.\n\n## 4. Logic xác định trạng thái\n\nKhi tải dữ liệu, hệ thống kiểm tra dịch vụ đang nằm trong báo giá nào.\n\nNếu dịch vụ thuộc báo giá chưa được chấp nhận:\n\n- Trạng thái là `pending_quote`.\n\nNếu báo giá có trạng thái như:\n\n- `order`\n- `ordered`\n- `won`\n- `done`\n- `approved`\n- `accepted`\n\nthì dịch vụ được xem là `ordered`.\n\nNếu báo giá đã có hợp đồng liên kết:\n\n- Hợp đồng còn draft thì dịch vụ là `contracted`.\n- Hợp đồng ở trạng thái `execution`, `active` hoặc `signed` thì dịch vụ là `active`.\n\n## 5. Thêm dịch vụ mới\n\nChọn `Add Service` để thêm dịch vụ vào vụ việc.\n\nCó thể chọn từ danh mục dịch vụ hoặc nhập thủ công.\n\nCác trường gồm:\n\n- Dịch vụ từ danh mục, tùy chọn.\n- Loại dịch vụ.\n- Phí dịch vụ.\n- Tên dịch vụ.\n- Mô tả chi tiết.\n\nNếu vụ việc đã có báo giá gốc, dịch vụ mới sẽ được đưa vào báo giá bổ sung.\n\nNếu vụ việc chưa có báo giá gốc, dịch vụ chỉ được lưu vào vụ việc và chưa đồng bộ sang báo giá.\n\n## 6. Quy tắc chống trùng dịch vụ\n\nHệ thống không cho thêm dịch vụ nếu tên dịch vụ đã tồn tại trong vụ việc.\n\nKhi chọn từ danh mục, các dịch vụ đã có trong vụ việc sẽ bị vô hiệu hóa và hiển thị ghi chú `Already added to Case`.\n\n## 7. Logic tạo báo giá bổ sung\n\nKhi thêm dịch vụ mới vào vụ việc đã có báo giá gốc, hệ thống sẽ:\n\n1. Kiểm tra có báo giá bổ sung nào còn chỉnh sửa được không.\n2. Nếu có, thêm dịch vụ vào báo giá bổ sung đó.\n3. Nếu không có, tạo báo giá bổ sung mới.\n4. Cập nhật tổng tiền báo giá.\n5. Tạo thư mục cho báo giá bổ sung.\n\nBáo giá bổ sung mới sẽ có mã dạng:\n\n`PL + số thứ tự + tháng + năm`\n\n## 8. Đồng bộ phí dịch vụ\n\nKhi sửa `Base Price`, hệ thống tính phần chênh lệch giữa giá mới và giá cũ.\n\nSau đó hệ thống cập nhật:\n\n- Phí dịch vụ trong báo giá.\n- Tổng tiền báo giá.\n- Tổng tiền hợp đồng nếu đã có hợp đồng liên quan.\n\nCách tính là cộng hoặc trừ phần chênh lệch, không tạo lại toàn bộ báo giá.\n\n## 9. Chỉnh sửa dịch vụ\n\nCó thể click trực tiếp vào các ô để sửa:\n\n- Loại dịch vụ.\n- Phí dịch vụ.\n- Tên dịch vụ.\n- Mô tả chi tiết.\n\nKhi sửa tên dịch vụ, hệ thống kiểm tra trùng tên trước khi lưu.\n\nNếu dịch vụ có liên kết với báo giá, thay đổi sẽ được đồng bộ sang báo giá tương ứng.\n\n## 10. Khi nào dịch vụ bị khóa chỉnh sửa\n\nDịch vụ sẽ không thể chỉnh sửa hoặc xóa nếu:\n\n- Dịch vụ thuộc báo giá gốc.\n- Báo giá bổ sung đã ở trạng thái `sent`, `order`, `ordered`, `won`, `done`, `cancelled`, `approved` hoặc `accepted`.\n\nNghiệp vụ này nhằm tránh thay đổi dịch vụ sau khi báo giá đã được gửi hoặc đã được khách hàng chấp nhận.\n\n## 11. Xóa dịch vụ\n\nChỉ có thể xóa dịch vụ phát sinh thuộc báo giá bổ sung còn chỉnh sửa được.\n\nKhi xóa, hệ thống sẽ:\n\n1. Gỡ dịch vụ khỏi báo giá bổ sung.\n2. Trừ giá trị dịch vụ khỏi tổng tiền báo giá.\n3. Trừ giá trị dịch vụ khỏi tổng tiền hợp đồng nếu có.\n4. Xóa dịch vụ khỏi vụ việc.\n\nDịch vụ thuộc báo giá gốc không được xóa tại màn hình này.\n\n## 12. Tạo hợp đồng\n\nKhi dịch vụ ở trạng thái `ordered`, hệ thống hiển thị nút tạo hợp đồng.\n\nNếu dịch vụ thuộc báo giá gốc:\n\n- Hệ thống tạo hợp đồng gốc.\n- Liên kết hợp đồng với vụ việc.\n- Liên kết báo giá với hợp đồng.\n- Tạo thư mục hợp đồng trong thư mục vụ việc.\n\nNếu dịch vụ thuộc báo giá bổ sung:\n\n- Vụ việc phải có hợp đồng gốc trước.\n- Hệ thống tạo phụ lục hợp đồng dưới hợp đồng gốc.\n- Phụ lục lấy một số thông tin từ hợp đồng gốc.\n- Liên kết báo giá bổ sung với phụ lục.\n- Tạo thư mục phụ lục trong thư mục hợp đồng gốc.\n\nSau khi tạo hợp đồng hoặc phụ lục, dịch vụ chuyển sang `contracted`.\n\n## 13. Kích hoạt dịch vụ\n\nKhi dịch vụ ở trạng thái `contracted`, hệ thống hiển thị nút `Activate`.\n\nKhi kích hoạt:\n\n- Dịch vụ được chuyển sang `active`.\n- Hợp đồng liên kết được chuyển sang trạng thái `execution`.\n- Nếu dịch vụ active chưa có thư mục, hệ thống tự tạo thư mục dịch vụ.\n\n## 14. Logic thư mục tài liệu\n\nHệ thống tự động tạo thư mục trong các trường hợp sau:\n\n- Tạo báo giá bổ sung.\n- Tạo hợp đồng gốc.\n- Tạo phụ lục hợp đồng.\n- Dịch vụ chuyển sang `active`.\n\n## 15. Luồng nghiệp vụ đề xuất\n\n1. Tạo hoặc kiểm tra báo giá gốc của vụ việc.\n2. Thêm dịch vụ phát sinh trong màn hình `Service List`.\n3. Hệ thống tạo hoặc cập nhật báo giá bổ sung.\n4. Khi báo giá được khách hàng chấp nhận, trạng thái dịch vụ chuyển thành `ordered`.\n5. Chọn tạo hợp đồng hoặc phụ lục.\n6. Sau khi hợp đồng được ký, chọn `Activate`.\n7. Dịch vụ chuyển sang thực hiện và thư mục tài liệu được tạo tự động.\n\n## 16. Lưu ý sử dụng\n\nKhông nên sửa dịch vụ sau khi báo giá đã gửi hoặc đã được chấp nhận.\n\nNếu cần thay đổi dịch vụ sau khi báo giá đã chốt, nên tạo một dịch vụ phát sinh mới để đi theo báo giá bổ sung mới.\n\nNên nhập đúng phí dịch vụ ngay từ đầu vì phí được đồng bộ sang báo giá và hợp đồng.\n\nNên dùng danh mục dịch vụ khi có thể để dữ liệu thống nhất giữa các vụ việc.\n\n"
  },
  {
    "key": "payroll",
    "label": "Phiếu lương",
    "content": "# Hướng Dẫn Nghiệp Vụ Phiếu Lương Và Xuất DOCX\n\n## 1. Tổng quan\n\nBộ tính năng phiếu lương gồm hai phần chính:\n\n- `Payroll Calculator`: nhập thông tin lương, phụ cấp, khấu trừ và tự động tính lương thực nhận.\n- `Payroll DOCX Generator`: lấy dữ liệu phiếu lương đã lưu, đưa vào mẫu DOCX, xem trước, tải xuống hoặc lưu file vào phiếu lương.\n\nLuồng sử dụng đề xuất:\n\n1. Nhập hoặc cập nhật phiếu lương.\n2. Kiểm tra kết quả tính lương.\n3. Lưu phiếu lương.\n4. Chọn mẫu DOCX.\n5. Xem trước file phiếu lương.\n6. Tải file hoặc lưu file vào phiếu lương.\n\n## 2. Thông tin phiếu lương\n\nPhần thông tin chung gồm:\n\n- Tiêu đề phiếu lương.\n- Công ty phát hành.\n- Mẫu phiếu lương DOCX.\n- Ngày phát hành.\n- Người lập phiếu.\n- Người nhận lương.\n- Ngày công chuẩn.\n- Ngày công đi làm.\n\nTiêu đề mặc định được tạo theo dạng:\n\n`Phiếu lương MM/YYYY - Tên người nhận`\n\nNếu người dùng chưa sửa tiêu đề thủ công, tiêu đề sẽ tự cập nhật khi đổi ngày phát hành hoặc người nhận.\n\n## 3. Ngày công chuẩn và ngày công thực tế\n\nNgày công chuẩn được hệ thống tự tính theo tháng phát hành.\n\nCách tính:\n\n- Đếm tất cả ngày trong tháng.\n- Loại trừ Chủ nhật.\n- Không tự loại trừ ngày lễ hoặc ngày nghỉ đặc biệt.\n\nTỷ lệ tính lương:\n\n`Ngày công đi làm / Ngày công chuẩn`\n\n## 4. Thu nhập\n\nCác khoản thu nhập gồm:\n\n- Lương chính.\n- Phụ cấp trách nhiệm.\n- Phụ cấp ăn trưa.\n- Phụ cấp điện thoại.\n- Phụ cấp đi lại, xăng xe.\n- Phụ cấp nhà ở.\n- Phụ cấp nuôi con nhỏ.\n- Phụ cấp khác.\n\nLương chính được tính theo ngày công:\n\n`Lương chính theo ngày công = Lương chính x Tỷ lệ tính lương`\n\nTổng thu nhập:\n\n`Tổng thu nhập = Lương chính theo ngày công + Tổng phụ cấp`\n\n## 5. Khấu trừ bảo hiểm\n\nNgười dùng có thể nhập `Lương đóng BHBB`.\n\nNếu bỏ trống, hệ thống dùng `Lương chính` làm cơ sở tính bảo hiểm.\n\nCác khoản bảo hiểm bắt buộc:\n\n| Khoản khấu trừ | Tỷ lệ |\n|---|---:|\n| Bảo hiểm xã hội | 8% |\n| Bảo hiểm y tế | 1,5% |\n| Bảo hiểm thất nghiệp | 1% |\n\n## 6. Thuế TNCN\n\nThu nhập tính thuế:\n\n`Thu nhập tính thuế = Tổng thu nhập - Tổng BHBB - 11.000.000`\n\nNếu kết quả nhỏ hơn 0, hệ thống tính là 0.\n\nThuế TNCN được tính theo biểu lũy tiến:\n\n| Bậc | Phần thu nhập tính thuế | Thuế suất |\n|---|---:|---:|\n| 1 | Đến 5 triệu | 5% |\n| 2 | Trên 5 đến 10 triệu | 10% |\n| 3 | Trên 10 đến 18 triệu | 15% |\n| 4 | Trên 18 đến 32 triệu | 20% |\n| 5 | Trên 32 đến 52 triệu | 25% |\n| 6 | Trên 52 đến 80 triệu | 30% |\n| 7 | Trên 80 triệu | 35% |\n\nHiện tại hệ thống chỉ áp dụng giảm trừ cá nhân 11 triệu, chưa có phần nhập giảm trừ người phụ thuộc.\n\n## 7. Lương thực nhận\n\nTổng khấu trừ:\n\n`Tổng BHBB + Thuế TNCN + Tạm ứng`\n\nLương thực nhận:\n\n`Thực nhận = Tổng thu nhập - Tổng khấu trừ`\n\nNếu kết quả nhỏ hơn 0, hệ thống hiển thị là 0.\n\nHệ thống cũng tự đổi số tiền thực nhận sang chữ để đưa vào phiếu lương DOCX.\n\n## 8. Lưu phiếu lương\n\nSau khi nhập đủ thông tin, chọn:\n\n- `Lưu phiếu lương` nếu là phiếu mới.\n- `Cập nhật` nếu đang sửa phiếu đã có.\n\nNút `Làm lại` sẽ đưa form về dữ liệu ban đầu của phiếu lương hiện tại.\n\n## 9. Chọn mẫu DOCX\n\nTrước khi xuất file, phiếu lương cần có mẫu DOCX.\n\nKhi chọn công ty, danh sách mẫu DOCX sẽ được lọc theo công ty đó nếu mẫu có gắn công ty.\n\nNếu đổi công ty, mẫu DOCX đang chọn sẽ được reset để tránh dùng sai mẫu.\n\nMẫu DOCX phải có file đính kèm hợp lệ.\n\n## 10. Biến dùng trong mẫu DOCX\n\nTrong file DOCX, đặt biến theo cú pháp:\n\n`{{ten_bien}}`\n\nCác biến thường dùng:\n\n| Biến | Ý nghĩa |\n|---|---|\n| `{{name}}` | Tên công ty |\n| `{{address}}` | Địa chỉ công ty |\n| `{{issueDate}}` | Ngày phát hành dạng đầy đủ |\n| `{{title}}` | Tiêu đề phiếu lương |\n| `{{employeeCode}}` | Mã nhân sự |\n| `{{lawyerName}}` | Người nhận lương |\n| `{{lawyerType}}` | Chức danh / loại nhân sự |\n| `{{standard_work_days}}` | Ngày công chuẩn |\n| `{{actual_work_days}}` | Ngày công đi làm |\n| `{{basic_salary}}` | Lương chính |\n| `{{earned_basic_salary}}` | Lương chính theo ngày công |\n| `{{allowance}}` | Tổng phụ cấp |\n| `{{insurance_salary_basis}}` | Lương đóng BHBB |\n| `{{deduction_social_ins}}` | Bảo hiểm xã hội |\n| `{{deduction_health_ins}}` | Bảo hiểm y tế |\n| `{{deduction_unemp_ins}}` | Bảo hiểm thất nghiệp |\n| `{{deduction_pit}}` | Thuế TNCN |\n| `{{deduction_advance}}` | Tạm ứng |\n| `{{total_income}}` | Tổng thu nhập |\n| `{{total_deductions}}` | Tổng khấu trừ |\n| `{{net_salary}}` | Lương thực nhận |\n| `{{net_salary_in_words}}` | Lương thực nhận bằng chữ |\n\n## 11. Xem trước, tải và lưu DOCX\n\nChọn `Xem trước` để hệ thống tạo file DOCX tạm và mở bằng trình xem Office online.\n\nTrong màn hình xem trước có thể:\n\n- Đóng preview.\n- Tải file DOCX.\n- Lưu file vào phiếu lương.\n\nNếu đã xem trước trước đó, hệ thống dùng lại file preview để lưu.\n\nNếu chưa xem trước, hệ thống sẽ generate file mới rồi lưu.\n\n## 12. Lưu ý nghiệp vụ\n\nNên chọn công ty trước khi chọn mẫu DOCX.\n\nNên lưu phiếu lương sau khi kiểm tra kết quả tính toán rồi mới generate DOCX.\n\nNgày công chuẩn hiện tại chỉ loại trừ Chủ nhật, không tự loại trừ ngày lễ.\n\nPhụ cấp hiện tại được cộng nguyên khoản, không tự chia theo tỷ lệ ngày công.\n\n"
  },
  {
    "key": "quotation-docx",
    "label": "Xuất báo giá DOCX",
    "content": "# Hướng Dẫn Xuất Báo Giá DOCX\n\n## 1. Tổng quan\n\nTính năng này dùng để tạo file DOCX cho báo giá từ mẫu có sẵn.\n\nNgười dùng có thể:\n\n- Xem trước file báo giá.\n- Tải file DOCX về máy.\n- Lưu file đã generate vào thư mục tài liệu của báo giá.\n- Làm mới dữ liệu trước khi generate.\n\n## 2. Điều kiện cần có\n\nBáo giá cần có:\n\n- Mẫu DOCX đã được chọn.\n- Mẫu DOCX có file đính kèm.\n- Thông tin khách hàng hoặc lead.\n- Danh sách dịch vụ trong báo giá.\n\nNếu thiếu mẫu hoặc mẫu không có file, hệ thống sẽ báo lỗi khi generate.\n\n## 3. Cách hệ thống tạo file\n\nKhi bấm `Preview Quotation` hoặc `Save to Documents`, hệ thống sẽ:\n\n1. Tải dữ liệu báo giá hiện tại.\n2. Tải danh sách dịch vụ trong báo giá.\n3. Tải chi tiết dịch vụ để lấy tên dịch vụ, ngày dự kiến và danh sách task.\n4. Tải file mẫu DOCX đã chọn.\n5. Thay các biến `{{...}}` trong mẫu bằng dữ liệu thực tế.\n6. Tạo file DOCX mới.\n\n## 4. Dữ liệu dịch vụ\n\nMỗi dịch vụ trong báo giá được đưa vào biến `services`.\n\nCác biến trong từng dòng dịch vụ:\n\n| Biến | Ý nghĩa |\n|---|---|\n| `{{stt}}` | Số thứ tự |\n| `{{service_name}}` | Tên dịch vụ |\n| `{{serviceName}}` | Tên dịch vụ |\n| `{{tasks_list}}` | Danh sách task dạng text |\n| `{{tasksList}}` | Danh sách task dạng text |\n| `{{estimated_days}}` | Số ngày dự kiến |\n| `{{estimatedDays}}` | Số ngày dự kiến |\n| `{{quantity}}` | Số lượng |\n| `{{price}}` | Đơn giá |\n| `{{total}}` | Thành tiền trước VAT |\n\n## 5. Công thức tính tiền\n\nVới mỗi dịch vụ:\n\n`Thành tiền = Đơn giá x Số lượng`\n\n`VAT dòng = Thành tiền x VAT%`\n\nTổng báo giá:\n\n`sub_total = Tổng thành tiền trước VAT`\n\n`vat_amount = Tổng VAT`\n\n`total_with_vat = Tổng thành tiền + VAT`\n\nLưu ý: `grand_total` hiện đang bằng `sub_total`. Nếu cần tổng sau VAT, dùng `total_with_vat`.\n\n## 6. Biến dùng trong mẫu DOCX\n\nCác biến chính:\n\n| Biến | Ý nghĩa |\n|---|---|\n| `{{document_title}}` | Tiêu đề tài liệu |\n| `{{customer_name}}` | Tên khách hàng |\n| `{{customer_short_name}}` | Tên ngắn của khách hàng |\n| `{{company_name}}` | Tên công ty phát hành |\n| `{{short_name_company}}` | Tên ngắn công ty |\n| `{{quotation_number}}` | Số báo giá |\n| `{{date}}` | Ngày generate |\n| `{{date_day}}` | Ngày |\n| `{{date_month}}` | Tháng |\n| `{{date_year}}` | Năm |\n| `{{overview}}` | Nội dung tổng quan |\n| `{{services}}` | Danh sách dịch vụ |\n| `{{sub_total}}` | Tổng trước VAT |\n| `{{vat_amount}}` | Tổng VAT |\n| `{{grand_total}}` | Tổng trước VAT |\n| `{{total_with_vat}}` | Tổng sau VAT |\n\n## 7. Quy tắc đặt tên tài liệu\n\nTiêu đề tài liệu khi lưu vào hệ thống có dạng:\n\n`Số báo giá / Proposal / CBI - Tên khách hàng`\n\nFile DOCX generate có dạng:\n\n`Proposal_SốBáoGiá_ThờiGian.docx`\n\n## 8. Xem trước và lưu\n\nBấm `Preview Quotation` để tạo file tạm và mở bằng Microsoft Office Online trong popup preview.\n\nTrong popup có thể:\n\n- Đóng preview.\n- Tải DOCX.\n- Lưu file vào hệ thống.\n\nBấm `Save to Documents` để lưu file vào thư mục của báo giá nếu tìm thấy thư mục phù hợp.\n\n## 9. Lỗi thường gặp\n\nKhông generate được:\n\n- Báo giá chưa chọn mẫu DOCX.\n- Mẫu DOCX chưa có file đính kèm.\n- Biến trong Word sai cú pháp `{{ten_bien}}`.\n\nSố tiền không đúng:\n\n- Kiểm tra đơn giá.\n- Kiểm tra số lượng.\n- Kiểm tra VAT của từng dịch vụ.\n\n"
  },
  {
    "key": "contract-docx",
    "label": "Xuất hợp đồng DOCX",
    "content": "# Hướng Dẫn Xuất Hợp Đồng DOCX\n\n## 1. Tổng quan\n\nTính năng này dùng để tạo file DOCX cho hợp đồng từ mẫu có sẵn.\n\nNgười dùng có thể:\n\n- Xem trước hợp đồng.\n- Tải file DOCX.\n- Lưu file đã generate vào thư mục tài liệu của hợp đồng.\n- Làm mới dữ liệu trước khi generate.\n\n## 2. Điều kiện cần có\n\nHợp đồng cần có:\n\n- Mẫu DOCX đã được chọn.\n- Mẫu DOCX có file đính kèm.\n- Thông tin khách hàng.\n- Báo giá liên kết để lấy danh sách dịch vụ.\n- Thông tin dịch vụ và phạm vi công việc.\n\nNếu thiếu mẫu hoặc mẫu không có file, hệ thống sẽ báo lỗi khi generate.\n\n## 3. Cách hệ thống tạo file\n\nKhi bấm `Preview Contract` hoặc `Save to Documents`, hệ thống sẽ:\n\n1. Tải dữ liệu hợp đồng hiện tại.\n2. Lấy báo giá liên kết với hợp đồng.\n3. Lấy danh sách dịch vụ từ báo giá.\n4. Lấy chi tiết dịch vụ để đưa phạm vi công việc vào hợp đồng.\n5. Tải file mẫu DOCX.\n6. Thay các biến `{{...}}` trong mẫu bằng dữ liệu thực tế.\n7. Tạo file DOCX mới.\n\n## 4. Dữ liệu dịch vụ\n\nMỗi dịch vụ trong hợp đồng được đưa vào biến `services`.\n\nCác biến trong từng dòng dịch vụ:\n\n| Biến | Ý nghĩa |\n|---|---|\n| `{{service_stt}}` | Số thứ tự |\n| `{{service_name}}` | Tên dịch vụ |\n| `{{task_list}}` | Danh sách công việc dạng text |\n| `{{tasks}}` | Danh sách công việc dạng mảng |\n| `{{sub_total}}` | Thành tiền trước VAT |\n| `{{service_vat}}` | VAT của dịch vụ |\n\nNếu muốn format danh sách công việc đẹp trong Word, nên dùng biến mảng `tasks` với biến con:\n\n`{{task_name}}`\n\n## 5. Công thức tính tiền\n\nVới mỗi dịch vụ:\n\n`Thành tiền = Đơn giá x Số lượng`\n\n`VAT dòng = Thành tiền x VAT%`\n\nTổng hợp đồng:\n\n`sub_totalAmount = Tổng trước VAT`\n\n`vatAmount = Tổng VAT`\n\n`total_with_vat = Tổng sau VAT`\n\nHệ thống tự chia thanh toán thành 2 đợt:\n\n`Đợt 1 = 70% tổng sau VAT`\n\n`Đợt 2 = 30% tổng sau VAT`\n\n## 6. Biến thông tin hợp đồng\n\nCác biến chính:\n\n| Biến | Ý nghĩa |\n|---|---|\n| `{{document_title}}` | Tiêu đề tài liệu |\n| `{{contract_code}}` | Số hợp đồng |\n| `{{language}}` | Ngôn ngữ hợp đồng |\n| `{{date_day}}` | Ngày generate |\n| `{{date_month}}` | Tháng generate |\n| `{{date_year}}` | Năm generate |\n| `{{quotation_description}}` | Mô tả hoặc overview từ báo giá |\n| `{{services}}` | Danh sách dịch vụ |\n| `{{sub_totalAmount}}` | Tổng trước VAT |\n| `{{vatAmount}}` | Tổng VAT |\n| `{{total_with_vat}}` | Tổng sau VAT |\n\n## 7. Biến thông tin khách hàng\n\nCác biến khách hàng:\n\n| Biến | Ý nghĩa |\n|---|---|\n| `{{customer_name}}` | Tên đầy đủ khách hàng |\n| `{{customer_short_name}}` | Tên ngắn khách hàng |\n| `{{address}}` | Địa chỉ |\n| `{{phone}}` | Số điện thoại |\n| `{{customer_id_title}}` | Loại giấy tờ hoặc mã số doanh nghiệp |\n| `{{customer_id_number}}` | Số giấy tờ hoặc mã số doanh nghiệp |\n| `{{representative_title}}` | Nhãn người đại diện pháp luật |\n| `{{coporate_representative}}` | Người đại diện pháp luật |\n| `{{customer_issued_place}}` | Nơi cấp giấy tờ cá nhân |\n| `{{customer_issued_date}}` | Ngày cấp giấy tờ cá nhân |\n\nNếu khách hàng là công ty, hệ thống ưu tiên mã số doanh nghiệp và người đại diện pháp luật.\n\nNếu khách hàng là cá nhân, hệ thống ưu tiên CCCD/CMND, nơi cấp và ngày cấp.\n\n## 8. Biến thanh toán\n\nCác biến thanh toán:\n\n| Biến | Ý nghĩa |\n|---|---|\n| `{{total_amount_part_one}}` | Số tiền đợt 1 |\n| `{{total_amount_convert_text_part_one}}` | Số tiền đợt 1 bằng chữ |\n| `{{total_amount_part_two}}` | Số tiền đợt 2 |\n| `{{total_amount_convert_text_part_two}}` | Số tiền đợt 2 bằng chữ |\n\n## 9. Quy tắc đặt tên tài liệu\n\nTiêu đề tài liệu khi lưu vào hệ thống có dạng:\n\n`Số hợp đồng / Contract / CBI - Tên khách hàng`\n\nFile DOCX generate có dạng:\n\n`Contract_SốHợpĐồng_ThờiGian.docx`\n\n## 10. Xem trước và lưu\n\nBấm `Preview Contract` để tạo file tạm và mở bằng Microsoft Office Online trong popup preview.\n\nTrong popup có thể:\n\n- Đóng preview.\n- Tải DOCX.\n- Lưu file vào hệ thống.\n\nBấm `Save to Documents` để lưu file vào thư mục của hợp đồng nếu tìm thấy thư mục phù hợp.\n\n## 11. Lỗi thường gặp\n\nKhông generate được:\n\n- Hợp đồng chưa chọn mẫu DOCX.\n- Mẫu DOCX chưa có file đính kèm.\n- Hợp đồng chưa có báo giá liên kết.\n- Biến trong Word sai cú pháp `{{ten_bien}}`.\n\nSố tiền thanh toán không đúng:\n\n- Kiểm tra danh sách dịch vụ trong báo giá liên kết.\n- Kiểm tra đơn giá, số lượng và VAT.\n- Kiểm tra logic chia 70% và 30%.\n\n"
  }
];

const parseInline = (text) => {
  const parts = String(text || "").split(/(`[^`]+`)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return React.createElement(
        "code",
        {
          key: index,
          style: {
            background: "#f5f5f5",
            border: "1px solid #f0f0f0",
            borderRadius: 4,
            padding: "1px 5px",
            fontSize: "0.92em",
          },
        },
        part.slice(1, -1),
      );
    }
    return part;
  });
};

const isTableSeparator = (line) => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line || "");
const splitTableRow = (line) => String(line || "").trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());

const renderMarkdown = (markdown) => {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const nodes = [];
  let i = 0;
  let key = 0;

  const pushParagraph = (paragraphLines) => {
    const text = paragraphLines.join(" ").trim();
    if (!text) return;
    nodes.push(
      React.createElement(
        "p",
        { key: key++, style: { margin: "0 0 12px", lineHeight: 1.75 } },
        parseInline(text),
      ),
    );
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      nodes.push(
        React.createElement(
          "pre",
          {
            key: key++,
            style: {
              background: "#141414",
              color: "#f5f5f5",
              padding: 14,
              borderRadius: 8,
              overflow: "auto",
              fontSize: 13,
              lineHeight: 1.6,
            },
          },
          React.createElement("code", null, codeLines.join("\n")),
        ),
      );
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length, 4);
      const Tag = "h" + level;
      nodes.push(
        React.createElement(
          Tag,
          {
            key: key++,
            style: {
              margin: level === 1 ? "0 0 18px" : "22px 0 10px",
              paddingBottom: level <= 2 ? 8 : 0,
              borderBottom: level <= 2 ? "1px solid #f0f0f0" : "none",
              color: "#262626",
              lineHeight: 1.25,
            },
          },
          parseInline(heading[2]),
        ),
      );
      i += 1;
      continue;
    }

    if (/^-\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^-\s+/, ""));
        i += 1;
      }
      nodes.push(
        React.createElement(
          "ul",
          { key: key++, style: { margin: "0 0 14px 22px", padding: 0, lineHeight: 1.75 } },
          items.map((item, idx) => React.createElement("li", { key: idx }, parseInline(item))),
        ),
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      nodes.push(
        React.createElement(
          "ol",
          { key: key++, style: { margin: "0 0 14px 22px", padding: 0, lineHeight: 1.75 } },
          items.map((item, idx) => React.createElement("li", { key: idx }, parseInline(item))),
        ),
      );
      continue;
    }

    if (trimmed.startsWith("|") && isTableSeparator(lines[i + 1])) {
      const headers = splitTableRow(trimmed);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      nodes.push(
        React.createElement(
          "div",
          { key: key++, style: { overflowX: "auto", margin: "0 0 16px" } },
          React.createElement(
            "table",
            { style: { width: "100%", borderCollapse: "collapse", fontSize: 13 } },
            React.createElement(
              "thead",
              null,
              React.createElement(
                "tr",
                null,
                headers.map((header, idx) =>
                  React.createElement(
                    "th",
                    {
                      key: idx,
                      style: {
                        textAlign: "left",
                        border: "1px solid #e8e8e8",
                        background: "#fafafa",
                        padding: "8px 10px",
                        fontWeight: 700,
                      },
                    },
                    parseInline(header),
                  ),
                ),
              ),
            ),
            React.createElement(
              "tbody",
              null,
              rows.map((row, rowIdx) =>
                React.createElement(
                  "tr",
                  { key: rowIdx },
                  headers.map((_, colIdx) =>
                    React.createElement(
                      "td",
                      {
                        key: colIdx,
                        style: {
                          border: "1px solid #e8e8e8",
                          padding: "8px 10px",
                          verticalAlign: "top",
                        },
                      },
                      parseInline(row[colIdx] || ""),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      continue;
    }

    const paragraph = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6})\s+/.test(lines[i].trim()) &&
      !/^-\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("```") &&
      !(lines[i].trim().startsWith("|") && isTableSeparator(lines[i + 1]))
    ) {
      paragraph.push(lines[i]);
      i += 1;
    }
    pushParagraph(paragraph);
  }

  return nodes;
};

const MarkdownTutorialSingleBlock = () => {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState(TUTORIALS[0]?.key);
  const activeTutorial = useMemo(
    () => TUTORIALS.find((item) => item.key === activeKey) || TUTORIALS[0],
    [activeKey],
  );

  if (!TUTORIALS.length) {
    return React.createElement(Empty, { description: "Chưa có tài liệu hướng dẫn" });
  }

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { style: { display: "flex", justifyContent: "flex-end", fontFamily: FONT } },
      React.createElement(
        Button,
        { type: "primary", onClick: () => setOpen(true), style: { borderRadius: 6, fontWeight: 700 } },
        "Hướng dẫn sử dụng",
      ),
    ),
    React.createElement(
      Modal,
      {
        open,
        title: activeTutorial?.label || "Hướng dẫn sử dụng",
        onCancel: () => setOpen(false),
        footer: null,
        width: "86vw",
        style: { top: 32 },
        bodyStyle: { padding: 0, height: "78vh", overflow: "hidden" },
      },
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "240px minmax(0, 1fr)", height: "100%", fontFamily: FONT } },
        React.createElement(
          "aside",
          { style: { borderRight: "1px solid #f0f0f0", background: "#fafafa", padding: 12, overflowY: "auto" } },
          TUTORIALS.map((item) => {
            const active = item.key === activeTutorial.key;
            return React.createElement(
              "button",
              {
                key: item.key,
                onClick: () => setActiveKey(item.key),
                style: {
                  width: "100%",
                  border: "1px solid " + (active ? "#91caff" : "#f0f0f0"),
                  background: active ? "#e6f4ff" : "#fff",
                  color: active ? "#0958d9" : "#262626",
                  borderRadius: 6,
                  padding: "9px 10px",
                  marginBottom: 8,
                  textAlign: "left",
                  cursor: "pointer",
                  fontWeight: active ? 700 : 500,
                  fontFamily: FONT,
                },
              },
              item.label,
            );
          }),
        ),
        React.createElement(
          "main",
          { style: { padding: "22px 28px", overflowY: "auto", color: "#262626", fontSize: 14 } },
          renderMarkdown(activeTutorial.content),
        ),
      ),
    ),
  );
};

ctx.render(React.createElement(MarkdownTutorialSingleBlock));
