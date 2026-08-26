# Apply Combo trong *Services.js — Design

## Bối cảnh

`CaseCreateForm.js`, `ContractCreateForm.js`, `QuotationCreateForm.js` đã có sẵn kiến trúc combo đầy đủ: người dùng có thể áp dụng một combo có sẵn từ catalog `serviceCombos`/`serviceComboItems`, hoặc tự ghép nhiều dịch vụ thành một "ad-hoc combo" tạm thời, ngay trong lúc TẠO MỚI case/hợp đồng/báo giá.

Ba file quản lý dịch vụ SAU khi record đã tồn tại — `CaseServices.js`, `ContractServices.js`, `QuotationServices.js` — đã được bổ sung (qua các phiên làm việc trước) khả năng:
- Hiển thị các dịch vụ đã thuộc một combo dưới dạng section riêng (header "COMBO + tên + số lượng").
- Thêm MỘT dịch vụ nữa vào một combo section ĐÃ TỒN TẠI.
- Xoá cả một combo section.
- Gộp/ẩn 4 cột giá (Subtotal/VAT/VAT amount/Total amount) cho các dòng thuộc combo, vì cả case/hợp đồng/báo giá chỉ dùng CHUNG một tổng giá package duy nhất.
- Một panel tổng tiền dạng stacked-row độc lập (Package subtotal + VAT rate sửa được, VAT amount/Package total tự tính).

**Khoảng trống được phát hiện khi audit**: không file `*Services.js` nào có khả năng ÁP DỤNG MỘT COMBO HOÀN TOÀN MỚI sau khi record đã tồn tại. Không file nào từng fetch `serviceCombos`/`serviceComboItems`. Combo chỉ có thể được tạo lúc CreateForm; sau đó Services.js chỉ có thể quản lý (thêm dịch vụ lẻ vào / xoá) những combo đã có sẵn.

## Mục tiêu

Xây dựng MỘT design pattern duy nhất cho việc "Apply Combo" (áp dụng combo có sẵn từ catalog HOẶC tự ghép ad-hoc combo) ngay trong màn hình Services, áp dụng đồng bộ cho cả 3 file, dựa trên UX đã có sẵn ở CreateForm.

## Quyết định đã chốt (qua các câu hỏi làm rõ)

1. Cho phép apply combo MỚI ngay tại Services.js (không chỉ giới hạn quản lý combo có sẵn).
2. Hỗ trợ cả 2 cách: chọn combo từ catalog, VÀ tự ghép ad-hoc combo.
3. Triển khai đồng thời cho cả 3 file trong một lượt (không làm Case trước rồi chờ duyệt riêng).

## Kiến trúc: một UI pattern, hai mô hình lưu dữ liệu

Modal và UX phải **giống hệt nhau** ở cả 3 file. Hành động "Apply" (persist dữ liệu) khác nhau vì mỗi file có kiến trúc lưu dữ liệu khác nhau:

| | CaseServices.js | ContractServices.js / QuotationServices.js |
|---|---|---|
| Mô hình sửa dữ liệu | Mỗi thay đổi gọi API ngay (`ctx.api.request` trực tiếp trong handler) | Sửa vào state `rows` cục bộ, có cờ `dirty`, chỉ persist khi bấm nút "Save & Update" đã có sẵn |
| Khi Apply Combo | Tạo NGAY N dòng `projectServices` qua API tuần tự (loop, mỗi item 1 request tạo); cộng NGAY giá combo vào `servicePricingSummary` qua `applyPackageSummaryEdit` đã có | Đẩy N dòng mới (`_isNew: true`) vào `rows` cục bộ; cộng giá combo vào state `packageSubTotal` cục bộ qua `updatePackageField`; đặt `dirty = true` |
| Khi nào dữ liệu thực sự lưu xuống DB | Ngay lập tức, trong lúc Apply | Chỉ khi người dùng bấm "Save & Update" |

## Cấu trúc modal (áp dụng giống nhau ở cả 3 file)

Nút toolbar "+ Add Service" (đã có sẵn) mở modal với 2 tab cấp 1:

1. **Individual Service** — chính là form dịch vụ lẻ đã có sẵn ở mỗi file hiện tại (Case: form với catalog service picker + custom fields; Contract/Quotation: `openServiceModal` picker gắn với 1 row cục bộ). KHÔNG thay đổi logic, chỉ chuyển vào làm nội dung của tab này.
2. **Apply Combo** — MỚI, có 2 tab con:
   - **Select from catalog** — ô tìm kiếm + danh sách combo từ `serviceCombos` (tên, số dịch vụ, giá catalog `packageSubTotal`), click vào 1 combo để xem trước danh sách `serviceComboItems`, nút "Select"/"Apply" để xác nhận.
   - **Create ad-hoc** — checkbox chọn nhiều dịch vụ từ catalog dịch vụ (`services`) + ô nhập tên combo (bắt buộc), nút "Create" để xác nhận.

Nút "+ Add service" riêng trong từng combo section ĐÃ TỒN TẠI (đã build ở phiên trước — thêm 1 dịch vụ vào combo đó) **giữ nguyên không đổi**: vẫn mở thẳng tab Individual Service, gán sẵn `comboId`/`comboName` đích, không đi qua tab Apply Combo.

## Ràng buộc quan trọng: gom nhóm ad-hoc combo sau reload

Ở CreateForm, ad-hoc combo KHÔNG BAO GIỜ được gán `comboId` thật (`_comboCatalogId` luôn `null` — xác nhận qua code). Điều này chấp nhận được ở CreateForm vì việc gom nhóm chỉ cần sống trong 1 phiên làm việc trước khi submit.

Nhưng logic gom nhóm ở Services.js (`comboGroups` map trong cả 3 file) group CHẶT theo `comboId`/`serviceCombo` đã lưu — và trang có thể reload bất cứ lúc nào. Nếu áp dụng y hệt hành vi CreateForm (để `comboId` = null cho ad-hoc combo), section ad-hoc sẽ hiển thị đúng ngay lúc vừa apply (vì lúc đó dữ liệu còn trong state/vừa fetch lại), nhưng sẽ RÃ NHÓM ở lần reload kế tiếp vì không có khoá nào để gom lại.

**Giải pháp**: khi các dòng có `comboId` = null nhưng cùng chung `comboName` (không rỗng), gom nhóm chúng theo `comboName` như một fallback (chỉ áp dụng cho nhóm không có comboId). Cùng loại giới hạn đã được chấp nhận trước đó với combo catalog (2 lần apply cùng 1 combo catalog sẽ hiển thị gộp làm 1 section) — mở rộng sang trường hợp cùng tên ad-hoc. Input tên ad-hoc combo sẽ là bắt buộc; không xây dựng thêm hệ thống synthetic ID để giải quyết triệt để.

## Giá tiền khi Apply Combo

- **Combo từ catalog**: `packageSubTotal` gốc của combo (quy đổi sang VND nếu khác currency, dùng lại logic kiểu `convertComboSubTotalToVnd` đã có ở CreateForm) được **CỘNG THÊM** vào tổng package hiện có của case/hợp đồng/báo giá — không bao giờ thay thế. Đúng theo quyết định "chỉ 1 tổng duy nhất cho toàn bộ record" đã chốt ở phiên trước.
- **Ad-hoc combo**: không có giá catalog sẵn, đóng góp 0đ vào tổng lúc apply — mọi dòng của nó hiển thị "Included in package", người dùng tự chỉnh Package subtotal sau đó qua panel tổng tiền đã có.
- Mọi dòng được tạo (dù từ catalog hay ad-hoc) đều dùng `pricingMode: package`, `basePrice: 0`, `vat: 0` — đúng quy ước hiện có của các dòng combo.

## Field mapping khi tạo dòng mới

Mỗi dòng service được tạo khi Apply Combo (catalog hoặc ad-hoc) mang các field:
- `comboId` / `serviceCombo`: id catalog combo (số) nếu chọn từ catalog; `null` nếu ad-hoc.
- `comboName`: tên combo catalog, hoặc tên do người dùng nhập nếu ad-hoc.
- `pricingMode: "package"`, `billingMode: included`, `basePrice: 0`, `vat: 0` — như quy ước sẵn có.
- Các field định danh dịch vụ (`serviceId`/`serviceName`/`serviceType`/`description`) lấy từ `serviceComboItems`/dịch vụ catalog tương ứng.

## Phạm vi KHÔNG thay đổi (đã build đúng, giữ nguyên)

- Logic gom nhóm theo `comboId` hiện có trong `displayRows`/`groupedActiveRows` (chỉ MỞ RỘNG thêm fallback theo `comboName` khi comboId null, không viết lại).
- `renderComboHeaderBar`, `handleRemoveCombo`/`removeCombo`, `+ Add service` trong từng section.
- Panel tổng tiền stacked-row + logic `applyPackageSummaryEdit`/`updatePackageField`.
- Việc ẩn/gộp 4 cột giá khi ở package mode.

## Việc cần làm tiếp theo

Sau khi spec này được duyệt, chuyển sang `writing-plans` skill để lập kế hoạch triển khai chi tiết (từng bước, từng file) trước khi bắt đầu code.
