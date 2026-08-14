# SRS — Logic nghiệp vụ Multi-Currency (Case / Contract / Quotation)

## 1. Mục đích & Phạm vi

Ba module Case (Hồ sơ), Contract (Hợp đồng), Quotation (Báo giá) đều có bảng dịch vụ cho phép **mỗi dòng dịch vụ mang một loại tiền tệ riêng**. Mô hình hiện tại giữ currency ở cấp dòng dịch vụ, nhưng mọi số tiền tổng hợp được lưu vào DB đều được chuẩn hóa về VND.

Tài liệu này mô tả:

1. Cách hệ thống resolve currency cho từng dòng dịch vụ và catalog service.
2. Cách tính toán, làm tròn, quy đổi từng dòng sang VND và đóng băng tỷ giá tại thời điểm Save.
3. Cách ghi `subTotal`/`vatAmount`/`totalAmount` ở cấp service line, Contract, Quotation và Case theo VND.
4. Cơ chế đồng bộ số liệu tài chính giữa Quotation, Contract và Project/Case.
5. Test case để kiểm chứng các quy tắc trên.

Không thuộc phạm vi: quản trị danh mục `currencies`/`exchangeRates`, cấu hình payment request chưa xác minh tên field thực tế, và logic UI thuần trang trí không ảnh hưởng số liệu.

---

## 2. Thuật ngữ & Khái niệm

| Thuật ngữ | Ý nghĩa |
|---|---|
| **Line currency** (`getRowCurrency(row)`) | Currency của một dòng dịch vụ (`_currencyId`/`currencyId`), do người dùng chọn qua dropdown hoặc lấy tự động theo catalog service. Đây là currency **duy nhất** còn có ý nghĩa nghiệp vụ trong hệ thống — không còn khái niệm "Record currency" ở cấp Contract/Quotation. |
| **Header currency** (`contract.currencyId`/`quotation.currencyId`) | Chỉ dùng làm **currency gợi ý mặc định** khi thêm dòng dịch vụ mới (`addRow`). Không bao giờ được đọc để tính `subTotal/vatAmount/totalAmount` của module. |
| **VND (base currency)** | Currency duy nhất mà `subTotal/vatAmount/totalAmount` ở **mọi cấp** (dòng dịch vụ, Contract, Quotation, Case) được lưu vào DB. Resolve qua `findDefaultCurrency(currencies)` (ưu tiên `isBaseCurrency`, fallback code `"VND"`). |
| **`exchangeRateToBase`** | Tỷ giá VND-trên-1-đơn-vị-Line-currency, chốt (frozen) tại thời điểm Save — lưu trên chính dòng dịch vụ. Không đổi lại khi tỷ giá tham chiếu (`exchangeRates`) được sửa sau đó. |
| **Missing-rate block** | Nếu 1 dòng dịch vụ ở currency khác VND mà không tra được tỷ giá quy đổi, **toàn bộ Save bị chặn** (không phải chỉ cảnh báo/lưu một phần như model cũ) — lỗi nêu rõ tên dịch vụ + currency thiếu tỷ giá. |

---

## 3. Mô hình dữ liệu liên quan

- `currencies` — danh mục currency, gồm `code`, `decimalPlaces`/`precision`, `locale`, `isBaseCurrency`; VND là base currency.
- `exchangeRates` — bảng tỷ giá tham chiếu để quy đổi về VND, gồm currency nguồn, rate về base, ngày hiệu lực và trạng thái hợp lệ.
- `contractServices.currencyId`, `quotationServices.currencyId`, `projectServices.currencyId` — Line currency của từng dòng dịch vụ.
- `contractServices.exchangeRateToBase`, `quotationServices.exchangeRateToBase` — tỷ giá VND được đóng băng khi lưu dòng dịch vụ.
- `contracts.currencyId`, `quotations.currencyId` — chỉ dùng làm Header currency mặc định cho dòng mới; không quyết định currency của totals.
- `contracts.subTotal/vatAmount/totalAmount/fixedAmount`, `quotations.subTotal/vatAmount/totalAmount`, `contractServices.subTotal/vatAmount/totalAmount`, `quotationServices.subTotal/vatAmount/totalAmount`, `projects.totalAmount` — luôn là VND.

---

## 4. Yêu cầu nghiệp vụ

### FR-1 — Currency Resolution

- FR-1.1: `resolveCurrency(value, currencies)` tra cứu theo thứ tự: match theo `id` → match theo `code` → nếu value là object có code thì dùng luôn → dựng object tối giản từ code string → nếu tất cả thất bại, trả `null`.
- FR-1.2: `currencyFromRecord(record, currencies, fallback)` tra theo thứ tự: `record.currency/currencies/currencyId` → `getRecordCurrencyId(record)` → `getRecordCurrencyCode(record)` → `fallback` truyền vào → currency có `code === "VND"` trong danh sách → object VND hard-code mặc định. Hàm không được trả `null`/`undefined`.
- FR-1.3: `getCurrencyDecimals(currency)` dùng `decimalPlaces`/`precision` tường minh nếu có; nếu không, VND = 0 chữ số thập phân, currency khác = 2.
- FR-1.4: `getCurrencyLocale(currency)` dùng `currency.locale` nếu có; nếu không, VND → `"vi-VN"`, currency khác → `"en-US"`.
- FR-1.5: Dòng dịch vụ mới (`addRow`) mặc định nhận Header currency của record cha; nếu Header currency rỗng thì fallback VND.
- FR-1.6: Khi chọn dịch vụ từ catalog, nếu catalog service có `currencyId` riêng thì Line currency đổi theo catalog; nếu catalog không có currency thì giữ nguyên Line currency hiện tại.

### FR-2 — Định dạng & làm tròn số tiền

- FR-2.1: Mọi phép làm tròn số tiền phải dùng `roundMoneyForCurrency(value, currency)`, không dùng `Math.round()` trần cho tiền.
- FR-2.2: VAT native của dòng được làm tròn theo Line currency trước khi quy đổi; sau khi quy đổi, `subTotal/vatAmount/totalAmount` được làm tròn lại theo VND.
- FR-2.3: `formatMoney` hiển thị số theo `getCurrencyLocale` và hậu tố mã currency khi ô đó không có dropdown currency đi kèm.
- FR-2.4: Cột **Price** hiển thị số nhập trong Line currency nhưng không lặp mã currency trong ô tiền; dropdown cạnh ô nhập là nguồn hiển thị đơn vị.
- FR-2.5: Khi nhập liệu, separator hàng nghìn/thập phân phải suy ra từ `Intl.NumberFormat(locale).formatToParts()` (`getLocaleSeparators`), không hard-code theo locale giả định.

### FR-3 — Per-line VND Conversion

- FR-3.1: Mỗi dòng active tính native amount trước: `subTotal(native) = basePrice × quantity(=1)`, `vatAmount(native) = roundMoneyForCurrency(subTotal(native) × vat / 100, lineCurrency)`, `totalAmount(native) = subTotal(native) + vatAmount(native)`.
- FR-3.2: Nếu `lineCurrency` khác VND, hệ thống tra `pickConversionRate(exchangeRatesToVnd, lineCurrency, vndCurrency, pricingDate)`. Nếu tìm được, `exchangeRateToBase = rate`; `subTotal/vatAmount/totalAmount` lưu DB = `roundMoneyForCurrency(native × exchangeRateToBase, vndCurrency)`.
- FR-3.3: Nếu `lineCurrency` là VND, `exchangeRateToBase = 1`, không cần quy đổi.
- FR-3.4: Nếu không tra được tỷ giá, dòng đó được đánh dấu `_convertible = false`, không tham gia tổng, và **chặn toàn bộ Save**.
- FR-3.5: `pricingDate` dùng để lọc hiệu lực tỷ giá: `contract.signedAt || contract.date` cho Contract, `quotation.date` cho Quotation; nếu record chưa có ngày thì fallback thời điểm hiện tại.

### FR-4 — Module Totals

- FR-4.1: `subTotal/vatAmount/totalAmount` của Contract/Quotation = tổng cộng dồn, không group theo currency, từ `subTotal/vatAmount/totalAmount` VND của từng dòng active.
- FR-4.2: Nếu bất kỳ dòng active nào `_convertible = false`, `handleSave` báo lỗi nêu rõ tên dịch vụ + currency thiếu tỷ giá và **không lưu bất kỳ thay đổi nào**.
- FR-4.3: `projects.totalAmount` (`syncCaseTotalAmount`) = tổng cộng dồn VND từ toàn bộ `projectServices` active của Case, không phân biệt nguồn Quotation-linked, Contract-linked hay standalone.
- FR-4.4: `syncContractHeaderFromServices` và `syncQuotationHeaderFromServices` trong `CaseServices.js` không tự group/quy đổi theo currency; chỉ đọc trực tiếp totals VND của từng dòng và cộng dồn.

### FR-5 — Package Pricing Mode

- FR-5.1: Package mode dùng `packageSubTotal` + `packageVatRate` cấp record, luôn nhập trực tiếp bằng VND.
- FR-5.2: Khi chuyển Line → Package mode, các dòng chuyển sang trạng thái included/không tính giá dòng; Quotation vẫn có thể backup dữ liệu line mode để khôi phục khi chuyển ngược lại.
- FR-5.3: `packageVatAmount = roundMoneyForCurrency(packageSubTotal × packageVatRate / 100, vndCurrency)`; `packageTotalAmount = packageSubTotal + packageVatAmount`.
- FR-5.4: Người dùng có thể nhập trực tiếp VAT amount hoặc Total amount ở dòng Summary; hệ thống suy ngược `packageVatRate` tương ứng (`inferVatRate`).

### FR-6 — Retainer Contracts

- FR-6.1: Hợp đồng loại `retainer`: `subTotal = monthlyFee × retainerDuration`, luôn tính bằng VND. Đây là assumption tường minh vì retainer không gắn với dòng dịch vụ nào để suy ra currency khác.
- FR-6.2: VAT và total của retainer phải dùng `roundMoneyForCurrency(..., vndCurrency)`.

---

## 5. Bất biến nghiệp vụ quan trọng

Các test case ưu tiên P0 phải bảo vệ đúng các bất biến này.

1. **INV-1**: `subTotal/vatAmount/totalAmount/fixedAmount` được ghi vào `contracts`/`quotations`/`contractServices`/`quotationServices`/`projects` **luôn luôn** là VND — không có ngoại lệ, không có "Record currency" nào khác VND ở các field này.
2. **INV-2**: `exchangeRateToBase` một khi đã ghi vào 1 dòng dịch vụ thì **không tự đổi lại** khi `exchangeRates` gốc bị sửa sau đó (frozen-at-save, không phải live-computed) — trừ khi người dùng chủ động đổi lại currency hoặc basePrice của dòng đó và Save lại.
3. **INV-3**: Mọi phép làm tròn tiền dùng `roundMoneyForCurrency` theo đúng currency đích ở từng bước (native currency cho VAT amount gốc, VND cho số liệu cuối) — không có chỗ nào dùng `Math.round()` trần cho số tiền.
4. **INV-4**: Nếu bất kỳ dòng dịch vụ active nào thiếu tỷ giá quy đổi sang VND, **toàn bộ Save bị chặn** — không có trạng thái "lưu một phần, tổng chưa cập nhật" như model cũ.
5. **INV-5**: Cột Price không bao giờ hiển thị currency code trùng lặp với dropdown currency liền kề.

---

## 6. Test Cases

Ký hiệu: **P0** = phải test trước khi release, **P1** = quan trọng, **P2** = phụ.

### 6.1. Currency Resolution & Formatting

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-01 | P1 | Header chưa từng set currency | Mở block dịch vụ của Contract/Quotation mới | Currency mặc định cho dòng mới resolve về VND, không lỗi, không hiển thị `"—"` |
| TC-02 | P1 | Currency record có `decimalPlaces = 2` (VD USD) | Nhập `basePrice = 1234.5` cho 1 dòng USD | Ô Price hiển thị `1,234.50`, không làm tròn mất phần lẻ |
| TC-03 | P1 | Currency là VND (`decimalPlaces = 0`) | Nhập `basePrice = 1234.5` | Giá trị VND được làm tròn về số nguyên, không hiển thị phần thập phân |
| TC-04 | P2 | Currency có `locale = "de-DE"` | Gõ `1.234,50` vào ô Price | `parseMoneyEditValue`/`buildMoneyDraft` parse đúng thành `1234.5` |
| TC-05 | P1 | Catalog service có `currencyId` USD | Chọn service catalog đó khi dòng hiện tại đang VND | Line currency đổi thành USD, ô Price + dropdown cập nhật đồng bộ |
| TC-06 | P2 | Catalog service không set `currencyId` | Chọn service catalog đó | Line currency giữ nguyên giá trị hiện tại |
| TC-07 | P0 | Cột Price đang hiển thị giá trị | Quan sát ô nhập Price | Không hiển thị mã currency trong ô tiền; mã currency chỉ xuất hiện ở dropdown bên cạnh |
| TC-08 | P1 | Ô VAT amount / Total amount / Summary | Quan sát các ô này | Hiển thị VND sau quy đổi; nếu thiếu tỷ giá thì hiển thị trạng thái không thể quy đổi thay vì số sai |

### 6.2. Line Pricing Mode

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-09 | P1 | Tất cả dòng dịch vụ là VND | Thêm 2 dòng: (2.000.000, VAT 8%), (3.000.000, VAT 10%) | Subtotal = 5.000.000 VND, VAT amount = 460.000 VND, Total = 5.460.000 VND |
| TC-10 | P1 | Như TC-09 | Xoá mềm 1 dòng | Tổng VND cập nhật lại đúng theo dòng còn active |
| TC-11 | P1 | 1 dòng duy nhất | `vat = 0` | `vatAmount = 0`, `totalAmount = subTotal`, tất cả là VND |

### 6.3. Package Pricing Mode

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-18 | P1 | Đang ở Line mode có dữ liệu | Chuyển sang Package mode | Các dòng không còn tự tính giá; packageSubTotal khởi tạo theo tổng VND hiện tại nếu chưa có; cột Price hiển thị `"Included"` |
| TC-19 | P1 | Quotation đang ở Package mode | Chuyển ngược lại Line mode | Các dòng khôi phục đúng `basePrice`/`vat` đã backup trước đó (`lineModeBackupRef`) |
| TC-20 | P1 | Package mode | Nhập packageSubTotal = 100.000.000, packageVatRate = 10 | packageVatAmount = 10.000.000 VND, packageTotalAmount = 110.000.000 VND |
| TC-21 | P2 | Package mode | Nhập trực tiếp VAT amount = 12.000.000 | `packageVatRate` được suy ngược đúng (`inferVatRate`), Total amount cập nhật theo |
| TC-22 | P2 | Package mode | Nhập trực tiếp Total amount = 120.000.000 | VAT amount = Total − Subtotal, VAT rate suy ngược tương ứng |
| TC-23 | P1 | Package mode | Quan sát Summary/header | Chỉ hiển thị VND; không có lựa chọn currency riêng cho package totals |

### 6.4. Exchange Rate Resolution

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-28 | P1 | Có rate `USD→VND` | Quy đổi USD sang VND | Dùng đúng rate trực tiếp |
| TC-29 | P1 | Chỉ có rate `VND→USD` | Quy đổi USD sang VND | Hệ thống dùng `1 / rate(VND→USD)` nếu helper hỗ trợ inverse |
| TC-30 | P1 | Có nhiều rate cùng cặp currency, `effectiveDate` khác nhau | Quy đổi tại `pricingDate` cụ thể | Chọn bản ghi mới nhất không vượt quá `pricingDate` |
| TC-31 | P1 | Rate có `status = "inactive"`/`"draft"`/... | Quy đổi | Bản ghi bị loại, không được dùng |
| TC-32 | P2 | Rate có `rate <= 0` | Quy đổi | Bản ghi bị loại, coi như không có tỷ giá |
| TC-33 | P2 | Record chưa có `date`/`signedAt` | Quy đổi | `pricingDate` fallback về thời điểm hiện tại, không throw lỗi |

### 6.5. Cascade Sync

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-34 | P0 | Quotation liên kết với Contract | Sửa dòng dịch vụ Quotation rồi Save | `quotations.subTotal/...` là VND; Contract liên kết được sync bằng cách cộng trực tiếp service totals VND |
| TC-35 | P0 | Contract liên kết ngược lại Quotation service qua `quotationServiceId` | Sửa dòng dịch vụ ở Contract rồi Save | `quotationServices`/`quotations` liên quan được sync lại bằng VND totals đã persist |
| TC-36 | P1 | Case có `projects.totalAmount` | Save Quotation/Contract có thay đổi tổng tiền | `projects.totalAmount` cập nhật khớp tổng VND mới nhất |
| TC-37 | P1 | Hợp đồng loại `retainer` | Save | `subTotal = monthlyFee × retainerDuration`, VAT/Total làm tròn theo VND |
| TC-38 | P1 | Quotation status chuyển sang `order`, Case đã có hợp đồng chính, chưa có sub-contract cho Quotation này | Save | Tự tạo Contract con (`parentId` = hợp đồng gốc) với totals VND; `projectServices.status` chuyển `pending_quote → ordered → contracted` |
| TC-39 | P2 | Sub-contract cho Quotation này đã tồn tại | Save lại Quotation status `order` | Không tạo thêm sub-contract trùng lặp |
| TC-40 | P1 | Xoá mềm 1 dòng Quotation có link Contract service | Save | Contract service tương ứng cũng bị soft-delete; totals 2 bên tính lại, loại trừ dòng đã xoá |

### 6.6. Lock States

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-41 | P0 | Contract có `status = "signed"` | Thử sửa Price/currency của 1 dòng | Input bị `disabled`; nút Add/Delete service bị ẩn hoặc disabled |
| TC-42 | P0 | Quotation có `status = "order"` | Thử thêm dòng dịch vụ mới | `message.warning` cảnh báo khoá, không tạo dòng mới |
| TC-43 | P1 | Contract `status = "draft"` | Sửa Price | Cho phép sửa bình thường |

### 6.7. Catalog vs Line Currency

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-44 | P1 | Dòng dịch vụ đã đổi currency khác catalog gốc | Mở modal Review/So sánh | Tiêu đề 2 cột hiển thị đúng currency riêng biệt; giá trị mỗi cột format theo currency của cột đó |
| TC-45 | P2 | Dòng dịch vụ không liên kết catalog nào (`_isCustom = true`) | Mở modal Review | Hiển thị trạng thái không có catalog, không crash khi `catalog = null` |

### 6.8. Edge Cases

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-46 | P1 | Dòng dịch vụ với `basePrice = 0` | Bấm Save ở Line mode | Bị chặn bởi validate `parseNum(r._basePrice) <= 0`, không cho lưu |
| TC-47 | P2 | Package mode, `packageSubTotal <= 0` | Bấm Save | Bị chặn, yêu cầu nhập giá trị gói |
| TC-48 | P2 | Không có `CONTRACT_ID`/`QUOTATION_ID` hợp lệ trong URL | Mở block | Hiển thị thông báo lỗi rõ ràng, không crash trắng trang |
| TC-49 | P2 | Toàn bộ dòng dịch vụ đã bị xoá mềm | Xem bảng | `activeRows.length = 0`, ẩn dòng Summary, hiển thị empty state đúng theo lock state |
| TC-50 | P1 | Currency ID trùng nhưng khác object reference | So sánh `isSameCurrency(a, b)` | Trả `true` khi cùng `id` hoặc cùng `code`, không phụ thuộc reference object |

### 6.9. VND Normalization Regressions

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-51 | P0 | 2 dòng: 1 VND, 1 USD; đã có tỷ giá USD→VND | Bấm Save | `subTotal/vatAmount/totalAmount` ghi vào DB = tổng VND của cả 2 dòng (dòng USD đã tự convert); dòng USD trong DB vẫn giữ `currencyId` = USD và `exchangeRateToBase` = tỷ giá đã dùng |
| TC-52 | P0 | Dòng USD, không có tỷ giá USD→VND | Bấm Save | Lỗi nêu rõ tên dịch vụ + "USD" chưa có tỷ giá; **không có thay đổi nào được lưu**, kể cả các dòng VND khác trong cùng lần Save |
| TC-53 | P1 | Dòng USD, tỷ giá lúc Save là 25.000 | Sau khi Save, admin sửa lại bản ghi `exchangeRates` USD→VND thành 26.000 | `exchangeRateToBase` trên dòng dịch vụ đã lưu **không đổi** (vẫn 25.000) — chỉ đổi nếu người dùng sửa lại currency/basePrice của chính dòng đó và Save lại |
| TC-54 | P1 | Quotation status chuyển `order`, tự tạo sub-contract | Kiểm tra sub-contract mới tạo | `currencyId` của sub-contract = VND (không còn để trống/mặc định ngẫu nhiên) |

---
