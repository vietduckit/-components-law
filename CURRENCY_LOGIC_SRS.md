# SRS — Logic nghiệp vụ Multi-Currency (Case / Contract / Quotation)

## 1. Mục đích & Phạm vi

Ba module Case (Hồ sơ), Contract (Hợp đồng), Quotation (Báo giá) đều có bảng dịch vụ (service lines) cho phép **mỗi dòng dịch vụ mang một loại tiền tệ (currency) riêng**, độc lập với tiền tệ mặc định của hồ sơ/hợp đồng/báo giá. Tài liệu này mô tả:

1. Cách hệ thống xác định (resolve) currency cho từng cấp dữ liệu (record / line / catalog service).
2. Cách tính toán, làm tròn, gộp nhóm (group) và quy đổi (convert) tiền khi các dòng dịch vụ khác currency nhau.
3. Cách phân biệt "Display currency" (chỉ để xem, không lưu DB) với "Base currency" (currency gốc của record — **duy nhất** được phép ghi vào DB).
4. Cơ chế đồng bộ (cascade sync) số liệu tài chính giữa Quotation → Project (Case) → Contract.
5. Test case để kiểm chứng các quy tắc trên.

Không thuộc phạm vi: cấu hình danh mục `currencies`/`exchangeRates` (được quản trị ở nơi khác), logic UI thuần trang trí không ảnh hưởng số liệu.

---

## 2. Thuật ngữ & Khái niệm

| Thuật ngữ | Ý nghĩa |
|---|---|
| **Record currency** (`caseCurrency` / `contractCurrency` / `quotationCurrency`) | Currency gốc của hồ sơ/hợp đồng/báo giá, resolve từ field `currency`/`currencies`/`currencyId` của record, fallback về VND nếu không có. Đây là currency mà các trường `subTotal`/`vatAmount`/`totalAmount`/`fixedAmount` trong DB **luôn luôn** được hiểu theo. |
| **Line currency** (`getRowCurrency(row)`) | Currency riêng của một dòng dịch vụ (`_currencyId`/`currencyId`), có thể khác Record currency. Mặc định khi tạo dòng mới = Record currency; có thể đổi thủ công qua dropdown, hoặc lấy tự động theo currency của catalog service khi chọn dịch vụ từ danh mục. |
| **Catalog currency** | Currency của dịch vụ gốc trong danh mục `services`, độc lập với Line currency (dòng dịch vụ có thể đã được đổi currency sau khi copy từ catalog). |
| **Display currency** | Currency người dùng chọn ở dropdown "Display currency" trên UI, dùng **chỉ để xem** tổng quy đổi. Không bao giờ được ghi vào DB. Mặc định = Record currency. |
| **Mixed-currency** | Trạng thái khi (ở Line pricing mode) các dòng dịch vụ active không cùng một currency → `hasMixedLineCurrencies = true`. |
| **Package pricing mode** | Chế độ tính trọn gói: 1 subtotal + 1 VAT rate ở cấp record (không tính theo từng dòng); luôn nằm trong Record currency, không có khái niệm mixed-currency. |
| **Line pricing mode** | Chế độ tính theo từng dòng dịch vụ (basePrice × quantity(=1) × VAT%), mỗi dòng có thể khác currency. |
| **Base-currency conversion** (`baseConvertedTotals`/`baseConvertedSummary`) | Pipeline quy đổi **độc lập**, luôn target về Record currency, dùng làm nguồn duy nhất để lưu DB. Tách biệt hoàn toàn khỏi pipeline quy đổi theo Display currency. |
| **Exchange rate direct/inverse** | Tỷ giá tra được trực tiếp (from→to) hoặc suy ra nghịch đảo từ bản ghi ngược lại (to→from, rate dùng = 1/rate). |

---

## 3. Mô hình dữ liệu liên quan

- `currencies` — `code`, `decimalPlaces`/`precision` (số chữ số thập phân), `locale`, `isBaseCurrency`.
- `exchangeRates` — `fromCurrencyId`/`fromCurrency`, `toCurrencyId`/`toCurrency`, `rate`, `effectiveDate`, `status`.
- `contracts.currencyId` / `quotations.currencyId` / project(case) currency field → Record currency của từng entity.
- `contractServices.currencyId`, `quotationServices.currencyId` → Line currency (mỗi dòng dịch vụ).
- `contracts.subTotal/vatAmount/totalAmount/fixedAmount`, `quotations.subTotal/vatAmount/totalAmount`, `projects.totalAmount` → **luôn được hiểu là số tiền theo Record currency của chính bảng đó**, không phải Display currency.

---

## 4. Yêu cầu nghiệp vụ (Functional Requirements)

### FR-1 — Currency Resolution

- FR-1.1: `resolveCurrency(value, currencies)` tra cứu theo thứ tự: match theo `id` → match theo `code` → nếu value là object có code thì dùng luôn → dựng object tối giản từ code string → nếu tất cả thất bại, trả `null`.
- FR-1.2: `currencyFromRecord(record, currencies, fallback)` tra theo thứ tự: `record.currency/currencies/currencyId` → `getRecordCurrencyId(record)` → `getRecordCurrencyCode(record)` → `fallback` truyền vào → currency có `code === "VND"` trong danh sách → object VND hard-code mặc định. **Không bao giờ trả `null`/`undefined`.**
- FR-1.3: `getCurrencyDecimals(currency)`: dùng `decimalPlaces`/`precision` tường minh của bản ghi currency nếu có; nếu không, VND = 0 chữ số thập phân, các currency khác = 2.
- FR-1.4: `getCurrencyLocale(currency)`: dùng `currency.locale` nếu có; nếu không, VND → `"vi-VN"`, khác → `"en-US"`.
- FR-1.5: Dòng dịch vụ mới thêm (`addRow`) mặc định nhận Record currency của record cha.
- FR-1.6: Khi chọn dịch vụ từ catalog (`handleSelectCatalogService`), nếu catalog service có `currencyId` riêng → Line currency của dòng đổi theo catalog; nếu catalog không có currency → giữ nguyên Line currency hiện tại của dòng (không reset về Record currency).

### FR-2 — Định dạng & làm tròn số tiền

- FR-2.1: Mọi phép làm tròn số tiền (subTotal, vatAmount, totalAmount, package totals, giá trị quy đổi) phải dùng `roundMoneyForCurrency(value, currency)` — làm tròn theo đúng số chữ số thập phân của **currency đích**, tuyệt đối không dùng `Math.round()` trần trụi (vì sẽ cắt phần thập phân của currency 2-decimal).
- FR-2.2: Hiển thị số tiền đọc (`formatMoney`) = số đã format theo `getCurrencyLocale` + hậu tố mã currency (VD: `"2.000 VND"`, `"1,234.50 USD"`).
- FR-2.3: Cột **Price** (nhập basePrice từng dòng) hiển thị **chỉ số**, KHÔNG kèm mã currency (`hideCurrencyCode: true`), vì dropdown currency đặt ngay cạnh đã thể hiện đơn vị — tránh lặp thông tin (VD không hiển thị `"2.000 VND"` cạnh dropdown `VND` mà chỉ `"2.000"`).
- FR-2.4: Tất cả các ô tiền khác (VAT amount, Total amount, dòng Tổng ở Summary, modal Breakdown) vẫn hiển thị kèm mã currency vì không có dropdown currency đi kèm.
- FR-2.5: Khi nhập liệu (edit draft), separator hàng nghìn/thập phân phải suy ra thật từ `Intl.NumberFormat(locale).formatToParts()` (`getLocaleSeparators`), không hard-code nhị phân `vi-VN → ","` else `"."`, vì các locale khác (vd `de-DE`) cũng dùng `","` làm dấu thập phân.

### FR-3 — Line Pricing Mode (tính theo từng dòng)

- FR-3.1: Với mỗi dòng active (không bị xoá mềm): `subTotal = basePrice × quantity(=1)`; `vatAmount = roundMoneyForCurrency(subTotal × vat / 100, lineCurrency)`; `totalAmount = subTotal + vatAmount`.
- FR-3.2: Các dòng được group theo Line currency (`lineTotalsByCurrency`), key = `currencyId` (ưu tiên) hoặc `code`. Mỗi group cộng dồn `subTotal/vatAmount/totalAmount` riêng.
- FR-3.3: `hasMixedLineCurrencies = true` khi (không ở Package mode) và số lượng group > 1.
- FR-3.4: Khi chỉ có 1 group (single-currency), `totals = lineTotalsByCurrency[0]`, `totalsCurrency = group.currency`.

### FR-4 — Package Pricing Mode (tính trọn gói)

- FR-4.1: Package mode dùng 1 `packageSubTotal` + 1 `packageVatRate` cấp record, luôn tính theo Record currency (`contractCurrency`/`quotationCurrency`), **không phân theo dòng**.
- FR-4.2: Khi chuyển từ Line → Package mode: tất cả dòng bị set `basePrice = 0`, `vat = 0` (Contract); Quotation còn backup lại giá trị cũ (`lineModeBackupRef`) để có thể khôi phục khi chuyển ngược lại Package → Line.
- FR-4.3: `packageVatAmount = roundMoneyForCurrency(packageSubTotal × packageVatRate / 100, contractCurrency/quotationCurrency)`; `packageTotalAmount = packageSubTotal + packageVatAmount`.
- FR-4.4: Người dùng có thể nhập trực tiếp VAT amount hoặc Total amount ở dòng Summary (package mode) → hệ thống suy ngược ra `packageVatRate` tương ứng (`inferVatRate`).
- FR-4.5: Ở Package mode, `hasMixedLineCurrencies` luôn = `false` (không áp dụng khái niệm mixed-currency).

### FR-5 — Display Currency (chỉ để xem)

- FR-5.1: Mặc định Display currency = Record currency. Người dùng có thể đổi qua dropdown "Display currency" bất kỳ lúc nào, **không ảnh hưởng dữ liệu đã lưu**.
- FR-5.2: Với mỗi group currency khác Display currency, hệ thống fetch exchange rate tương ứng (`fetchExchangeRatesForConversion`) và tính `convertedTotals` (`buildConvertedTotals`) target = Display currency.
- FR-5.3: Nếu **tất cả** group quy đổi thành công → `convertedSummary.canConvert = true`, hiển thị dòng "≈ converted" dưới mỗi ô Subtotal/VAT amount/Total amount.
- FR-5.4: Nếu **bất kỳ** group nào thiếu tỷ giá → `canConvert = false`, hiển thị "Thiếu tỷ giá quy đổi" thay vì số liệu quy đổi; danh sách cặp currency thiếu tỷ giá hiển thị dạng `"USD -> VND"`.
- FR-5.5: Trường hợp single-group (không mixed) nhưng Display currency ≠ Record/Line currency → vẫn hiển thị gợi ý quy đổi "≈ ..." (không chỉ riêng trường hợp mixed).
- FR-5.6: Modal "Chi tiết quy đổi tiền tệ" liệt kê breakdown từng group: currency gốc, tổng gốc, tỷ giá áp dụng, tổng quy đổi sang Display currency.

### FR-6 — Base-currency Conversion & Quy tắc lưu DB (CRITICAL — đã fix regression)

- FR-6.1: Song song với pipeline Display-currency ở FR-5, tồn tại một pipeline **độc lập hoàn toàn** luôn target về Record currency (`baseConvertedTotals`/`baseConvertedSummary`), bất kể Display currency đang được chọn là gì.
- FR-6.2: `handleSave` **chỉ được phép** dùng `baseConvertedSummary` (không bao giờ dùng `convertedSummary` — cái track theo Display currency) để tính `effectiveTotals` ghi vào DB.
- FR-6.3: Khi mixed-currency và **quy đổi về Record currency thành công** (`baseConvertedSummary.canConvert === true`) → `effectiveTotals = baseConvertedSummary`, ghi `subTotal/vatAmount/totalAmount` (Contract còn ghi thêm `fixedAmount = totalAmount`).
- FR-6.4: Khi mixed-currency nhưng **thiếu tỷ giá** quy đổi về Record currency → `effectiveTotals = null` → **không ghi đè** các field tổng tiền hiện có trong DB, hiển thị `message.warning('Thiếu tỷ giá quy đổi... tổng chưa được cập nhật')`.
- FR-6.5: Khi single-currency (không mixed) → `effectiveTotals = lineTotals` (đã tự nhiên nằm trong Record currency vì chỉ có 1 group, hoặc trùng Record currency).
- FR-6.6: **Bất biến quan trọng nhất:** đổi Display currency dropdown trước khi bấm Save **không được phép** làm thay đổi số liệu ghi vào DB. Đây là bất biến bảo vệ khỏi lỗi data-corruption đã từng xảy ra trong lịch sử phát triển (xem CLAUDE.md/ghi chú session).

### FR-7 — Exchange Rate Resolution

- FR-7.1: `pickExchangeRate` lọc các bản ghi `exchangeRates` thoả: `rate > 0`, status hợp lệ (không thuộc `inactive/disabled/archived/cancelled/canceled/draft`), `effectiveDate <= pricingDate` (hoặc không có effectiveDate), currency from/to khớp (theo id trước, theo code sau) — rồi lấy bản ghi có `effectiveDate` mới nhất.
- FR-7.2: `pickConversionRate` thử rate trực tiếp (from→to) trước; nếu không có, thử rate nghịch đảo (to→from) và dùng `rate = 1/originalRate`.
- FR-7.3: `pricingDate` dùng để lọc hiệu lực tỷ giá = `contract.signedAt || contract.date` (Contract), `quotation.date` (Quotation). Nếu record chưa có ngày, fallback = thời điểm hiện tại (`Date.now()`).
- FR-7.4: Không tìm được tỷ giá nào hợp lệ (cả trực tiếp lẫn nghịch đảo) → group đó vào danh sách `missing`, không tính vào tổng quy đổi.

### FR-8 — Cascade Sync (Quotation ↔ Contract ↔ Project/Case)

- FR-8.1: Sau khi lưu Quotation (`handleSave`), gọi `syncContractHeaderFromServices(contractId)` cho Hợp đồng liên kết (nếu có) — hàm này **tự tính lại** tổng tiền hợp đồng từ chính các `contractServices` đã persist, quy đổi về **contractCurrency** (không tái sử dụng số của Quotation, vì 2 record có thể khác currency).
- FR-8.2: Tương tự, sau khi lưu Contract, gọi `syncQuotationHeaderFromServices(quotationId)` cho Báo giá liên kết khi 1 dòng dịch vụ Contract có link tới `quotationServiceId`.
- FR-8.3: Tổng `totalAmount` của `projects` (Case) được đồng bộ từ Contract totals hoặc Quotation `effectiveTotals` (tuỳ luồng lưu nào trigger).
- FR-8.4: Hợp đồng loại `retainer`: `subTotal = monthlyFee × retainerDuration`, không tham gia group theo currency dòng dịch vụ (không áp dụng multi-currency line aggregation).
- FR-8.5: Khi Quotation chuyển status → `order`: nếu Case đã có hợp đồng chính (`contracts` gốc) và chưa có sub-contract ứng với Quotation này → tự động tạo 1 sub-contract mới (`parentId` trỏ về hợp đồng gốc), copy `effectiveTotals` (Record currency của Quotation) làm totals khởi tạo.
- FR-8.6: `projectServices.status` cascade: `pending_quote → ordered` khi Quotation "order"; `→ contracted` sau khi tạo xong sub-contract.

### FR-9 — Lifecycle / Trạng thái khoá (Lock states)

- FR-9.1: Contract khoá toàn bộ chỉnh sửa (thêm/xoá/sửa dòng, đổi pricing mode, đổi currency) khi `status ∈ {signed, active, completed, terminated}`.
- FR-9.2: Quotation khoá toàn bộ chỉnh sửa khi `status === "order"`.
- FR-9.3: Ở trạng thái khoá, mọi input tiền (`EditableCell isMoney`), dropdown currency, nút Add/Delete service đều bị `disabled`.

### FR-10 — Catalog Currency vs Line Currency (Compare/Review modal)

- FR-10.1: Modal so sánh dịch vụ dòng hiện tại với dịch vụ gốc trong catalog phải tra **catalog currency** độc lập với **line/quoted currency** (`currencyFromRecord(catalog, currencies, recordCurrency)`), không giả định 2 bên cùng currency.
- FR-10.2: Nếu catalog currency ≠ line currency, tiêu đề cột trong bảng so sánh phải hiện rõ mã currency tương ứng của từng cột (VD: `"Dịch vụ gốc (Catalog) · USD"` vs `"Dịch vụ trong Hợp đồng · VND"`).

### FR-11 — UI Cột Price (đã gộp Subtotal + Currency)

- FR-11.1: Cột "Price" (trước đây "Subtotal") gộp 2 control trên **cùng một hàng ngang**: ô nhập tiền (chiếm phần co giãn) + dropdown chọn currency (rộng cố định, chỉ hiện mã 3 ký tự, không hiện tên đầy đủ).
- FR-11.2: Ô nhập tiền trong cột Price không hiển thị mã currency kèm theo (FR-2.3), dropdown bên cạnh là nguồn duy nhất thể hiện đơn vị tiền tệ của dòng.
- FR-11.3: Ở Package mode, cột Price hiển thị text tĩnh `"Included"` (không có control nhập liệu/currency riêng theo dòng).

---

## 5. Bất biến nghiệp vụ quan trọng (Critical Invariants)

> Các test case ưu tiên P0 phải bảo vệ đúng các bất biến này.

1. **INV-1**: `subTotal/vatAmount/totalAmount/fixedAmount` được ghi vào `contracts`/`quotations` **luôn luôn** ở Record currency, không bao giờ ở Display currency.
2. **INV-2**: Đổi Display currency dropdown không kích hoạt `dirty = true` và không làm thay đổi payload `handleSave`.
3. **INV-3**: Mọi phép làm tròn tiền dùng `roundMoneyForCurrency` theo đúng currency đích — không có chỗ nào dùng `Math.round()` trần cho số tiền có thể thuộc currency 2-decimal (ngoại lệ: `getSelectionAmounts`/retainer VAT ở Case dùng `Math.round` — coi là chấp nhận được nếu currency luôn VND, cần test riêng nếu mở rộng đa currency).
4. **INV-4**: Khi thiếu tỷ giá quy đổi về Record currency (mixed-currency), hệ thống **không được ghi đè** totals hiện có bằng số sai/0 — phải giữ nguyên và cảnh báo.
5. **INV-5**: Cột Price không bao giờ hiển thị currency code trùng lặp với dropdown currency liền kề.

---

## 6. Test Cases

Ký hiệu: **P0** = phải test trước khi release (bảo vệ Critical Invariant), **P1** = quan trọng, **P2** = phụ.

### 6.1. Currency Resolution & Formatting

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-01 | P1 | Record chưa từng set currency | Mở block dịch vụ của 1 Contract/Quotation mới, chưa có `currencyId` | Record currency mặc định resolve về VND (`defaultCurrencyObject`), không lỗi, không hiển thị `"—"` |
| TC-02 | P1 | Currency record có `decimalPlaces = 2` (VD USD) | Nhập basePrice = `1234.5` cho 1 dòng | Ô Price hiển thị `1,234.50` (2 chữ số thập phân), không làm tròn mất phần lẻ |
| TC-03 | P1 | Currency là VND (`decimalPlaces = 0`) | Nhập basePrice = `1234.5` | Giá trị được làm tròn về số nguyên theo quy tắc làm tròn tiền VND, không hiển thị phần thập phân |
| TC-04 | P2 | Currency có `locale = "de-DE"` (dùng `,` làm dấu thập phân) | Gõ `1.234,50` vào ô Price | `parseMoneyEditValue`/`buildMoneyDraft` parse đúng thành `1234.5`, không bị hiểu nhầm dấu `,` là phân cách nghìn kiểu US |
| TC-05 | P1 | Chọn dịch vụ catalog có `currencyId` khác Record currency | Bấm "Select" 1 dịch vụ catalog có currency USD trong khi Record currency là VND | Line currency của dòng tự đổi thành USD, ô Price + dropdown cập nhật đồng bộ |
| TC-06 | P2 | Catalog service không set `currencyId` | Chọn dịch vụ catalog không có currency | Line currency giữ nguyên giá trị hiện tại của dòng (không bị reset về Record currency) |
| TC-07 | P0 | Cột Price đang hiển thị giá trị | Quan sát ô nhập Price | Không hiển thị mã currency (VD chỉ `"2.000"`, không phải `"2.000 VND"`); mã currency chỉ xuất hiện ở dropdown bên cạnh |
| TC-08 | P1 | Ô VAT amount / Total amount / dòng Total ở Summary | Quan sát các ô này | Vẫn hiển thị kèm mã currency (VD `"160 USD"`) vì không có dropdown currency đi kèm |

### 6.2. Line Pricing Mode — Single Currency

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-09 | P1 | Tất cả dòng dịch vụ cùng currency (VND) | Thêm 2 dòng: (2.000.000, VAT 8%), (3.000.000, VAT 10%) | Subtotal = 5.000.000, VAT amount = 160.000 + 300.000 = 460.000, Total = 5.460.000, tất cả hiển thị VND |
| TC-10 | P1 | Như trên | Xoá 1 dòng | Tổng cập nhật lại đúng theo dòng còn lại; `hasMixedLineCurrencies = false` |
| TC-11 | P1 | 1 dòng duy nhất | `vat = 0` | `vatAmount = 0`, `totalAmount = subTotal` |

### 6.3. Line Pricing Mode — Mixed Currency

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-12 | P0 | 2 dòng: 1 VND, 1 USD; đã có tỷ giá USD→VND | Xem dòng Summary Subtotal/VAT/Total | Hiển thị riêng từng group (VD `2.000 USD` và `18.000.000 VND`) **và** thêm 1 dòng "≈ tổng quy đổi" gộp cả 2 sang Display currency hiện tại |
| TC-13 | P0 | Như trên, thiếu tỷ giá USD→VND | Xem dòng Summary | Hiển thị "Thiếu tỷ giá quy đổi" thay vì số quy đổi gộp; các số liệu riêng từng currency vẫn hiển thị đúng |
| TC-14 | P0 | Mixed-currency, đủ tỷ giá về Record currency | Bấm Save | `subTotal/vatAmount/totalAmount` ghi vào DB đúng bằng tổng đã quy đổi về **Record currency**, không phải theo Display currency đang chọn trên UI |
| TC-15 | P0 | Mixed-currency, **thiếu** tỷ giá về Record currency (nhưng đủ tỷ giá về Display currency khác) | Bấm Save | Totals hiện có trong DB **không bị ghi đè/không bị sai**; hiển thị `message.warning` báo thiếu tỷ giá; record vẫn lưu các thay đổi khác (tên dịch vụ, mô tả...) bình thường |
| TC-16 | P0 | Mixed-currency đang hiển thị Display currency = USD (không phải Record currency VND) | Đổi Display currency sang EUR rồi bấm Save ngay (không đổi số liệu dòng nào) | Số liệu ghi DB **không đổi** so với trước khi đổi Display currency — chứng minh INV-1/INV-2 |
| TC-17 | P1 | 3+ group currency khác nhau | Mở modal "Xem chi tiết" quy đổi | Bảng breakdown liệt kê đủ từng group: currency, tổng gốc, tỷ giá, tổng quy đổi sang Display currency; group thiếu tỷ giá hiển thị "Thiếu tỷ giá" ở cột tỷ giá và `"—"` ở cột tổng quy đổi |

### 6.4. Package Pricing Mode

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-18 | P1 | Đang ở Line mode có dữ liệu | Chuyển sang Package mode | Tất cả dòng basePrice/vat reset về 0; packageSubTotal khởi tạo = tổng lineTotals trước đó (nếu chưa có); cột Price hiển thị `"Included"` |
| TC-19 | P1 | Quotation only: đang ở Package mode | Chuyển ngược lại Line mode | Các dòng khôi phục lại đúng basePrice/vat đã backup trước đó (`lineModeBackupRef`) |
| TC-20 | P1 | Package mode | Nhập packageSubTotal = 100.000.000, packageVatRate = 10 | packageVatAmount = 10.000.000, packageTotalAmount = 110.000.000, đúng theo Record currency |
| TC-21 | P2 | Package mode | Nhập trực tiếp VAT amount = 12.000.000 (thay vì %) | `packageVatRate` được suy ngược đúng (`inferVatRate`), Total amount cập nhật theo |
| TC-22 | P2 | Package mode | Nhập trực tiếp Total amount = 120.000.000 | VAT amount = Total − Subtotal, VAT rate suy ngược tương ứng |
| TC-23 | P1 | Package mode | Quan sát `hasMixedLineCurrencies` | Luôn = `false`, không hiển thị cảnh báo/gợi ý mixed-currency dù các dòng ẩn có currencyId khác nhau |

### 6.5. Display Currency (view-only)

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-24 | P1 | Single-currency, Record currency = VND | Đổi Display currency sang USD (có tỷ giá) | Toàn bộ dòng Summary hiện thêm "≈ ... USD"; số liệu dòng dịch vụ gốc (VND) không đổi |
| TC-25 | P1 | Như trên nhưng chưa có tỷ giá VND→USD | Đổi Display currency sang USD | Hiển thị "Thiếu tỷ giá" ở khu vực Display currency, không crash, không hiện số sai |
| TC-26 | P2 | Đang loading tỷ giá | Đổi Display currency liên tục nhiều lần nhanh | Chỉ request tỷ giá mới nhất theo currency cuối cùng chọn (không bị race hiển thị sai do request cũ trả về sau); có `Spin`/loading indicator |
| TC-27 | P2 | Record currency đổi (hiếm khi xảy ra trong 1 phiên) | — | `displayCurrency` fallback lại về Record currency mới nếu `displayCurrencyId` chưa từng được set thủ công |

### 6.6. Exchange Rate Resolution

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-28 | P1 | Có bản ghi rate `USD→VND` | Quy đổi USD sang VND | Dùng đúng rate trực tiếp |
| TC-29 | P1 | Chỉ có bản ghi rate `VND→USD` (không có chiều ngược) | Quy đổi USD sang VND | Hệ thống tự dùng `1 / rate(VND→USD)` (inverse) |
| TC-30 | P1 | Có nhiều bản ghi rate cùng cặp currency, `effectiveDate` khác nhau | Quy đổi tại `pricingDate` cụ thể | Chọn đúng bản ghi có `effectiveDate` mới nhất **không vượt quá** `pricingDate` |
| TC-31 | P1 | Rate có `status = "inactive"`/`"draft"`/... | Quy đổi | Bản ghi này bị loại, không được dùng làm tỷ giá hợp lệ |
| TC-32 | P2 | Rate có `rate <= 0` (dữ liệu lỗi) | Quy đổi | Bản ghi bị loại, coi như không có tỷ giá |
| TC-33 | P2 | Record chưa có `date`/`signedAt` | Quy đổi | `pricingDate` fallback về thời điểm hiện tại, không throw lỗi |

### 6.7. Cascade Sync

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-34 | P0 | Quotation liên kết với 1 Contract, khác currency nhau | Sửa dòng dịch vụ Quotation rồi Save | `quotations.subTotal/...` cập nhật theo quotationCurrency; `contracts.subTotal/...` của hợp đồng liên kết được tính lại **độc lập** theo contractCurrency (không copy trực tiếp số của Quotation) |
| TC-35 | P0 | Contract liên kết ngược lại Quotation service qua `quotationServiceId` | Sửa dòng dịch vụ ở Contract rồi Save | `quotationServices`/`quotations` liên quan được đồng bộ lại tương ứng, đúng currency của Quotation |
| TC-36 | P1 | Case có `projects.totalAmount` | Save Quotation/Contract có thay đổi tổng tiền | `projects.totalAmount` cập nhật khớp với totals mới nhất (Record currency tương ứng) |
| TC-37 | P1 | Hợp đồng loại `retainer` | Save | `subTotal = monthlyFee × retainerDuration`, không bị ảnh hưởng bởi logic group-by-currency của service lines |
| TC-38 | P1 | Quotation status chuyển sang `order`, Case đã có hợp đồng chính, chưa có sub-contract cho Quotation này | Save (trigger cascade) | Tự tạo 1 Contract con (`parentId` = hợp đồng gốc) với totals khởi tạo = `effectiveTotals` (Record currency của Quotation); `projectServices.status` chuyển `pending_quote → ordered → contracted` |
| TC-39 | P2 | Sub-contract cho Quotation này đã tồn tại | Save lại Quotation status `order` | Không tạo thêm sub-contract trùng lặp |
| TC-40 | P1 | Xoá 1 dòng dịch vụ (soft-delete `status = deleted`) ở Quotation, dòng có link Contract service | Save | Contract service tương ứng cũng bị soft-delete; totals 2 bên tính lại loại trừ dòng đã xoá |

### 6.8. Lock States

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-41 | P0 | Contract có `status = "signed"` | Thử sửa Price/currency của 1 dòng | Input bị `disabled`, không cho sửa; nút Add/Delete service bị ẩn/disable |
| TC-42 | P0 | Quotation có `status = "order"` | Thử thêm dòng dịch vụ mới | `message.warning` cảnh báo khoá, không tạo dòng mới |
| TC-43 | P1 | Contract `status = "draft"` (chưa khoá) | Sửa Price | Cho phép sửa bình thường |

### 6.9. Catalog vs Line Currency

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-44 | P1 | Dòng dịch vụ đã đổi currency khác với catalog gốc | Mở modal "Review"/So sánh | Tiêu đề 2 cột hiển thị đúng mã currency riêng biệt (VD `"Dịch vụ gốc (Catalog) · USD"` và `"Dịch vụ trong Hợp đồng · VND"`); giá trị mỗi cột format theo đúng currency của cột đó |
| TC-45 | P2 | Dòng dịch vụ không liên kết catalog nào (`_isCustom = true`) | Mở modal Review | Hiển thị tag "No catalog service"/"No catalog", không crash khi `catalog = null` |

### 6.10. Edge Cases khác

| ID | Ưu tiên | Precondition | Steps | Kết quả mong đợi |
|---|---|---|---|---|
| TC-46 | P1 | Dòng dịch vụ với `basePrice = 0` | Bấm Save (Line mode) | Bị chặn bởi validate `parseNum(r._basePrice) <= 0` → `message.warning`, không cho lưu |
| TC-47 | P2 | Package mode, `packageSubTotal <= 0` | Bấm Save | Bị chặn, `message.warning` yêu cầu nhập giá trị gói |
| TC-48 | P2 | Không có `CONTRACT_ID`/`QUOTATION_ID` hợp lệ trong URL | Mở block | Hiển thị thông báo lỗi rõ ràng, không crash trắng trang |
| TC-49 | P2 | Toàn bộ dòng dịch vụ đã bị xoá mềm | Xem bảng | `activeRows.length = 0`, ẩn dòng Summary (`summary: () => null`), hiển thị empty state đúng theo lock state |
| TC-50 | P1 | Currency ID trùng nhưng khác object reference (VD sau khi reload dữ liệu) | So sánh `isSameCurrency(a, b)` | Trả `true` khi cùng `id` hoặc cùng `code`, không phụ thuộc reference object |

---
