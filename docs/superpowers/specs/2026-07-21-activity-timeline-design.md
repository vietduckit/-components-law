# Activity Timeline — Config-driven Audit Log (Design)

## Mục đích

Một JS block hiển thị **audit trail** (ai làm gì, khi nào) cho một bản ghi, dạng
timeline dọc cổ điển — dùng cho các collection **chưa có** activity log riêng
(Contract, Quotation, Customer, Lead, Meeting, Payment...). Không thay thế
`ActivityTab.js` (Project Internal) hay `DocumentActivityLog.js` (Document) —
hai file đó giữ nguyên.

Nhúng như một tab/block trong trang chi tiết của record cụ thể (đọc
`ctx.record.id`), không phải trang audit toàn hệ thống.

## Ràng buộc nền tảng

- Mỗi JS block phải tự chứa trong 1 file (Nocobase không hỗ trợ import
  cross-file trong runtime). Áp dụng cho collection mới = copy file template,
  chỉ sửa object `CONFIG` ở đầu file.
- Nguồn dữ liệu: collection `activity_log` (đã có, ghi bởi trigger SQL), lọc
  theo `collectionName` + `recordId`, giống pattern `fetchActivityLogs()`
  trong `ActivityTab.js`.

## Config schema

Một object `CONFIG` duy nhất ở đầu file gom mọi phần biến-đổi-theo-collection:

```javascript
const CONFIG = {
  collectionName: 'Contract',        // khớp activity_log.collectionName
  title: 'Lịch sử hoạt động hợp đồng',
  icon: <Icons.Contract/>,

  fieldLabels: { contractCode: 'Mã hợp đồng', value: 'Giá trị', signedAt: 'Ngày ký', ... },
  skipFields: ['batchId', 'internalNote'],

  actionConfig: {
    created: { label: 'Tạo hợp đồng', color, bg, border, icon, major: true },
    updated: { label: 'Cập nhật', color, bg, border, icon, major: false },
    deleted: { label: 'Huỷ hợp đồng', color, bg, border, icon, major: true },
  },

  enumMaps: { status: { draft: 'Nháp', signed: 'Đã ký', ... } },

  fkResolvers: {
    lawyerId:   { url: 'lawyers:list',   labelFn: r => r.lawyerName },
    customerId: { url: 'customers:list', labelFn: r => r.customerName },
  },
};
```

- `fieldLabels` — nhãn hiển thị cho field (thay `FIELD_MAP` cứng trong
  `ActivityTab.js`).
- `skipFields` — field ghi log nhưng không hiển thị trong timeline (audit vẫn
  ghi đủ ở DB, chỉ ẩn ở UI).
- `actionConfig` — nhãn/màu/icon theo action; cờ `major` quyết định marker
  to/nhỏ trên trục timeline.
- `enumMaps` — map giá trị enum (status, priority...) sang nhãn tiếng Việt.
- `fkResolvers` — khai báo field khoá ngoại cần resolve sang tên hiển thị,
  thay vì mảng `FK_SOURCES` hardcode.

**Nguyên tắc audit:** timeline hiển thị **mọi** sự kiện field-level, không ẩn
theo mức độ quan trọng — `major` chỉ ảnh hưởng kích thước marker để mắt bắt
được sự kiện chính (created/deleted) giữa các sự kiện `updated` lẻ tẻ khi
lịch sử dài, chứ không lọc bớt dữ liệu.

## Layout

Timeline dọc cổ điển: trục bên trái nối các điểm tròn (marker), nội dung bên
phải.

- Nhãn ngày dạng pill gắn trên trục (không phải divider ngang full-width).
- Mỗi sự kiện: marker màu theo action (`major: true` → marker to, viền đậm) +
  đường nối trục; thẻ nội dung gồm avatar + tên + vai trò người thực hiện, mô
  tả hành vi dạng câu tự nhiên (field cũ → mới, đã resolve FK/enum), badge
  hành động, timestamp tuyệt đối + tương đối.
- Toolbar: search full-width (hàng trên) + hàng filter (loại hành động,
  thành viên, khoảng ngày) + nút Làm mới + đếm số hoạt động — giữ nguyên tinh
  thần `ActivityTab.js` hiện tại, không rút gọn.

## Phạm vi giai đoạn này

Chỉ dựng **mockup HTML tĩnh** (`JsField/ActivityTimeline_mockup.html`, dữ
liệu giả collection Contract) để duyệt visual trước khi viết JS block thật.
Việc build JS block production (fetch thật, FK resolver thật, filter logic)
là bước kế tiếp, thực hiện sau khi mockup được duyệt.
