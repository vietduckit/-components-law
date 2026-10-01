# Runbook triển khai lên dev — money flow · service thread · currency · form tạo (30/09/2026)

Áp dụng thủ công trên **dev**, gồm toàn bộ thay đổi từ 29/09 đến nay:
- money flow;
- đồng bộ dịch vụ 3 chiều (service thread);
- quy đổi VND cho catalog;
- đợt C (form tạo Case / Contract / Quotation).

Mọi file đều nằm trong repo `components-law`. Chạy **đúng thứ tự** dưới đây.

> **Đã diễn tập trên dữ liệu thật của dev.**
> - DB `nocobase-law-dev-check` là bản restore của dev. File check trên bản này khớp **461/461 dòng** với CSV chạy trên dev lúc 15:25.
> - Toàn bộ runbook đã được chạy thử trên một bản sao của nó (`nocobase-law-dev-rehearsal`): mọi bước đều không lỗi, và file check sau đó chỉ còn 3 script field (phần phải chạy trên trình duyệt).
> - Các con số ghi ở từng bước là **kết quả thật của lần diễn tập**. Trên dev, số liệu phải giống như vậy.
> - Nếu dev có người thao tác sau thời điểm restore, số liệu có thể lệch nhẹ. Trường hợp đó, chạy lại file check trước khi làm.

**Tổng thời gian dự kiến:** khoảng 60–90 phút, phần lớn là bước 5 (dán tay 82 JS block) và bước 8 (kiểm thử). Mỗi file SQL chạy trong vài giây; backfill mất khoảng 10 giây.

**Chuẩn bị:**
- **pgAdmin**, đăng nhập bằng user có quyền owner trên DB dev.
- Một tài khoản **admin NocoBase** để chạy script đăng ký field trong console và dán JS block.
- Làm **liền một mạch** từ bước 1 tới bước 5. Sau bước 1, trigger mới đã chạy nhưng form cũ vẫn còn trên giao diện, nên không để người dùng tạo/sửa chứng từ ở giữa hai bước này.

**Lưu ý khi dùng pgAdmin:**
- pgAdmin chỉ hiện kết quả của **câu lệnh cuối cùng** trong file.
- Nếu một file có `BEGIN … COMMIT` báo `ERROR`, transaction ở tab đó sẽ bị treo. Khi đó chạy `ROLLBACK;` hoặc đóng tab, rồi gửi tôi nguyên thông báo lỗi.

---

## Bước 0 — Backup và báo ngưng

1. pgAdmin → chuột phải DB dev → **Backup…** → Format **Custom**. Lưu file ở ngoài repo.
2. Báo mọi người ngưng thao tác trên dev trong lúc triển khai.

## Bước 0b — Kiểm tra unique index (chỉ đọc, vài giây)

Query Tool → mở `pgsql/deploy/precheck_unique_indexes.sql` → Execute (F5).

- **Mong đợi:** 3 dòng `ready`:
  - `ux_payment_requests_schedule_open`;
  - `ux_payment_requests_project_service_open`;
  - `contractServices_projectServiceId_unique`.
  
  Trên bản restore của dev, cả 3 đều `ready`.
- Nếu có dòng `duplicate`: **dừng lại, gửi tôi kết quả.** Nếu không, bước 1 sẽ dừng giữa chừng khi tạo index.

## Bước 1 — SQL định nghĩa (4 file)

Mỗi file mở một **Query Tool** mới, mở file, bấm Execute (F5). Chạy **đúng thứ tự**:

| # | File | Vì sao |
|---|---|---|
| 1 | `pgsql/finance_foundation.sql` | Tạo 2 unique index còn thiếu. Các phần khác của file đã có trên dev, chạy lại chỉ ghi đè bằng bản giống hệt |
| 2 | `pgsql/money_flow_foundation.sql` | `money_line_compute`, `money_backfill_run` đã cũ; thiếu cột `basePriceVnd` ở 3 bảng dòng dịch vụ |
| 3 | `pgsql/service_thread_sync.sql` | Mới hoàn toàn (43 đối tượng): đồng bộ 3 chiều, lịch sử `serviceChangeLogs`, chặn sửa hợp đồng đã thanh toán |
| 4 | `pgsql/currency_catalog.sql` | Mới hoàn toàn (29 đối tượng): quy VND cho catalog, chặn nhập tỷ giá ngược chiều |

> **Sửa ngày 30/09 (sau lần check thứ hai trên dev):** NocoBase tự xoá mọi unique index **một cột** mà nó không biết, mỗi lần một field của bảng đó được tạo hoặc sửa. Việc này xảy ra ở `sync-runner.ts` `handleUniqueIndex`, được gọi mỗi khi collection sync.
> - Vì vậy dev mất `ux_payment_requests_schedule_open`, `ux_payment_requests_project_service_open` và `contractServices_projectServiceId_unique`, ngay sau khi chạy các script đăng ký field ở bước 4.
> - Khi thiếu `ux_payment_requests_schedule_open`, câu `ON CONFLICT` trong luồng tạo yêu cầu thanh toán cho combo sẽ báo lỗi.
> - Bản mới khai báo cột hai lần, ví dụ `("projectServiceId", "projectServiceId")`: vẫn unique như cũ, nhưng NocoBase thấy 2 cột nên giữ lại. Mỗi file tự `DROP` rồi tạo lại index, nên thay được bản một cột cũ.
> - File check giờ so cả số cột khoá. Index một cột cũ sẽ hiện `OUTDATED`.
> - **Nếu dev đã chạy bản cũ của 2 file này**, chạy lại `precheck_unique_indexes.sql` rồi chạy lại `finance_foundation.sql` và `service_thread_sync.sql`. Thứ tự so với bước 4 không còn quan trọng.

**Kết quả mong đợi:**
- Không có `ERROR`.
- Chỉ có các `NOTICE` kiểu `… already exists, skipping` / `… does not exist, skipping`.

**Vì sao chạy lại an toàn:**
- Không có `DROP … CASCADE`.
- Không file nào khác định nghĩa lại function của 4 file này, và các file chạy sau không xoá trigger nào của chúng.
- 4 tỷ giá ngược chiều đang có không làm file lỗi, vì DB chỉ chặn khi nhập hoặc sửa tỷ giá mới.

**Không chạy** 10 file SQL còn lại của đợt Finance (`contract_billing_plans_trigger`, `contract_payment_status_workflow`, `by_case_payment_request_automation`, `unified_contract_payment_schedule`, `finance_billing_rules`, `retainer_billing_run_due`, `finance_retainer_schedule`, `finance_members`, `finance_notifications`, `money_flow_trail`): dev đã khớp repo. Cũng **không chạy** các script một lần của đợt trước (`finance_foundation_migrate.sql`, `backfill_*.sql`, `drop_case_done_lump_sum_payment_request.sql`).

## Bước 2 — Test SQL (khuyến nghị, không để lại dữ liệu)

Mỗi file tự `ROLLBACK`. Kết quả trong tab **Messages** phải có dòng `… PASSED`:
- `pgsql/tests/money_cases_test.sql` → `ALL MONEY CASES PASSED`
- `pgsql/tests/money_flow_test.sql` → `ALL MONEY FLOW CHECKS PASSED`
- `pgsql/tests/money_trail_test.sql` → `ALL MONEY TRAIL CHECKS PASSED`
- `pgsql/tests/service_thread_test.sql` → `ALL SERVICE THREAD CHECKS PASSED`
- `pgsql/tests/currency_catalog_test.sql` → `ALL CURRENCY CATALOG CHECKS PASSED`
- `pgsql/tests/currency_vnd_test.sql` → `ALL CURRENCY VND CHECKS PASSED`

Cả 6 file đều pass trên bản diễn tập. Lần diễn tập đầu, `currency_catalog_test` báo `FAIL B`: test đếm cả giá công ty thật của dev, trong khi chỉ nên đếm các dòng do test tự tạo. Đây là lỗi của test, không phải của trigger, và đã được sửa trong repo.

## Bước 3 — Chuẩn hoá dữ liệu (đã review trên bản restore)

Không cần gửi preview nữa: tôi đã chạy preview và bản ghi thật trên bản restore của dev, kết quả tóm tắt bên dưới. Hai file preview (`*_preview.sql`) có nhiều SELECT, nên pgAdmin không hiện được kết quả của chúng.

### 3.1 `pgsql/service_thread_backfill.sql` — **ghi dữ liệu** (COMMIT), khoảng 10 giây

File này gồm cả money backfill, và bỏ trigger tạo task bị đăng ký trùng (`trg_auto_create_tasks`). Không chạy thêm `money_flow_backfill.sql`.

Kết quả trên bản diễn tập:

| Việc | Số dòng |
|---|---|
| Gắn thread cho mọi dòng dịch vụ của Quotation / Contract / Case (dev chưa có thread nào) | toàn bộ |
| Nối dòng Case → dòng báo giá (`quotationServiceId`) | 86 |
| Đồng bộ nội dung giữa các dòng cùng thread: `serviceType`, `serviceId`, combo, `quantity`, `description` | 42 |
| Sửa tiền tệ bị mất (VND → USD/SGD theo dòng gốc) | 12 |
| Xoá hẳn các dòng đã đánh dấu `deleted` / `cancelled`: 3 dòng contract, 8 dòng case, 1 dòng quotation | 12 |
| Chốt tỷ giá và tính lại tiền: 130 dòng quotation, 177 dòng contract, 191 dòng case; tổng của 33 báo giá, 43 hợp đồng, 25 case | — |
| **Không đổi** vì hợp đồng đã phát sinh thanh toán: CT02062026, CT23092026, CT24092026, CT35092026 | 10 |

Đếm trước/sau trên bản diễn tập:
- Chỉ đúng 12 dòng dịch vụ bị xoá (275 → 272 contract, 296 → 288 case, 131 → 130 quotation).
- **Không mất** task, tài liệu, folder, yêu cầu thanh toán hay lịch thanh toán nào.

### 3.2 `pgsql/currency_catalog_fix.sql` — **ghi dữ liệu**

- Xoá 4 tỷ giá nhập ngược chiều ngày 18–20/08 (VND → SGD/USD/EUR/CNY). Mỗi ngoại tệ vẫn còn tỷ giá đúng chiều.
- Gán tiền tệ cho 64 giá công ty (`companyServices`). Giá lớn được hiểu là VND; ví dụ IRC 25.000.000 VND trong khi catalog là 950 USD.
- Quy VND cho 119 dòng catalog.

### 3.3 `pgsql/money_consistency_audit.sql` — chỉ đọc

Số dòng `money_consistency_violations` giảm từ **53 xuống 10**. 10 dòng còn lại đều thuộc hợp đồng đã phát sinh thanh toán, chờ bạn quyết định tay:

| Hợp đồng | Vấn đề |
|---|---|
| CT53092026 (#303), CT54092026 (#304), CT55092026 (#305), CT23092026 (#264), CT24092026 (#265) | Dòng USD chưa chốt tỷ giá (7 dòng) |
| CT28092026 (#269) | Tổng các đợt thanh toán 19.440.000 ≠ tổng hợp đồng 22.680.000 |
| CT55092026 (#305) | Tổng các đợt 19.727.942 / tổng dịch vụ 19.440.010,8 ≠ tổng hợp đồng 19.722.706 |

Ngoài ra còn 10 dòng `service_thread_violations` (`thread_content_mismatch`), cũng thuộc các hợp đồng đã thanh toán: CT02062026, CT23092026, CT24092026, CT35092026.

## Bước 4 — Đăng ký field với NocoBase (trình duyệt)

Phần này phải chạy qua API của NocoBase, không làm bằng SQL. Mở một trang admin của dev → F12 → **Console**. Dán **từng file**, đợi dòng `[done]` rồi mới dán file tiếp theo. Cả 3 script đều chạy lại được.

| # | File | Dev đang thiếu | Dòng cuối mong đợi |
|---|---|---|---|
| 4.1 | `JsField/RegisterMoneyFlowFields.js` | `basePriceVnd` ở `quotationServices` / `contractServices` / `projectServices` | `[done] money flow fields` |
| 4.2 | `JsField/RegisterServiceThreadFields.js` | collection `serviceChangeLogs`; `serviceThreadId` ×3; `contractServices.serviceType`; `projectServices.quantity` | `[done] …` |
| 4.3 | `JsField/RegisterCompanyServiceCurrency.js` | 15 field VND / tỷ giá của `services`, `companyServices`, `serviceCombos`, `serviceComboItems`; gỡ field cũ `companyServices.currencies` (hasMany) | `[done] company service currency` |

## Bước 5 — Dán lại JS block (82 block, 9 file)

Code mới đã nằm sẵn trong các file JS của repo. Bước này chỉ là dán code đó vào từng block trên dev.

**Cách dán mỗi block:**
1. Bật **UI Editor**, mở menu cài đặt của block.
2. Bấm **Copy UID** và so với danh sách bên dưới để chắc đúng block.
3. Bấm **Edit code**, dán **toàn bộ** nội dung file JS, rồi **Save**.

Nên chép code cũ ra một file trước khi dán đè, để còn hoàn tác được.

Danh sách UID lấy từ CSV check của dev. Nhãn vị trí lấy từ bản sao dev. Hai UID ghi *mới* chỉ có trên dev: để tìm chúng nằm ở trang nào, mở `pgsql/deploy/where_is_block.sql` trong Query Tool rồi Execute. Script chỉ đọc và đã để sẵn 2 UID này.

### 5.1 `All Module/Contract/ContractCreateForm.js` — 2 block
Popup **Add new** của Contract: `rosia6dgrxr`, `b7910640012`.

### 5.2 `All Module/Case/CaseCreateForm.js` — 14 block
- Popup **Add new** (danh sách Case và các nơi tạo Case khác): `0aaakuqnots`, `1k36iny9rpq`, `3cp9ajw9rrw`, `bdyekal1f64`, `e94v7zjgtne`, `ibye6tjvfuz`, `k5cdi70dt39`, `q6dybzxl42e`, `qf60hciride`, `qiu48nlxl02`, `wc4xicul65g`, `zgjrk0rrf6w`.
- Trang Customer → **Cases → Add new**: `nsrhv2fv305`.
- Trang Customer → **Details → company → Details**: `117ae1dde3a`.

### 5.3 `All Module/Quotation/QuotationCreateForm.js` — 28 block
- Popup **Add new** (danh sách Quotation): `16hlfue8pwz`, `480nsccbiq7`, `8wv29z4jwg8`, `b4abe43b879`, `eq75vpvrjcc`, `kyzjllvaxwp`, `scjytstfjh3`.
- **Quotations → Add new**: `5461a8dwbj6`, `tnt7kdl1mz5`.
- Trang Customer → **Quotations → Add new**: `br1vgnzpf7l`, `sijxeaxnxif`.
- **Details → Tạo báo giá → Add New**: `cwlkrghwbrj`, `ffpftf6igh0`, `gdv1avpbuyl`, `w962txx9fof`, `z5xkv6vzuyr`.
- **Info Case → Details** (tạo báo giá từ Case): `ays0th2eik7`, `d4wdhj5sd9o`, `des40ymyhjm`, `en5kc02bdcd`, `nuqotdxonqb`, `o2v6izt6xkz`, `sl4fg4ybugp`, `zm0z5h1x3mm`.
- **Info Case → Edit → Details**: `c2s4pka37l6`, `hg61hf825ee`, `o8dqq74tqmz`.
- *Mới*: `uyqjs498p4z`.

### 5.4 `All Module/Case/CaseServices.js` — 16 block
- Tab **Info Case** (và popup Edit của nó): `3o64p6q5h1c`, `3sn2p0is6fw`, `618oi5n1ws6`, `6um8e7itsm9`, `7eszmqeb3xv`, `94im3cgeqws`, `a1irkz2aqt9`, `ao0jn0gqzna`, `e7ntq23qmw7`, `iw9krgiqxwk`, `pgp23habypb`, `t11xefptu24`, `tjy4q010yo6`, `tx29x7q1g82`, `yrg38elfw5m`.
- *Mới*: `tz4obeojszg`.

### 5.5 `All Module/Quotation/QuotationServices.js` — 16 block
- **Details** của Quotation: `065d5xxw10c`, `17txrsaxz7n`, `80mkj3hxc3o`, `a0e1bdnamiv`, `g89269zi38q`, `mebv52f266b`, `t6gjt7lkupp`, `vbn49l4juom`, `yj2l19ebwha`, `zeveg099ixv`.
- **Info Case → Details**: `g0039lv8xgd`, `hjbn02d1cf5`, `ik9zvcdbca0`, `imm6r1emu8l`, `n8q1gpm80s4`, `vf7ahl34tp6`.

### 5.6 `All Module/Contract/ContractServices.js` — 3 block
**Details** của Contract: `8201e9002a4`, `ljq3vn3oumy`, `te1ihow311t`.

### 5.7 Payment — 3 block (đã lệch repo từ trước, dán luôn cho khớp)
- `All Module/Payment/PaymentContractDetailBlock.js`: `41fff01a7a3`.
- `All Module/Payment/PaymentCreateBlock.js`: `141c06b48f9`.
- `All Module/Payment/PaymentRequestCreateBlock.js`: `vne45ebi9qv`.

### 5.8 Không cần dán
- `CaseFinanceBlock`, `ContractPaymentScheduleDetailBlock`, `InvoiceCreateBlock`: dev đã khớp repo.
- `ContractDetailView`: dev không dùng.
- Các block mồ côi (trang/popup cha đã bị xoá), không hiển thị ở đâu:
  - Quotation form: `94z2rvsnsoe`, `h5ein2owv8g`, `kk6zri5014n`, `l1jlq0id8ir`, `l2osipeb6y1`, `otvhbikfynp`, `v54g4c2zq3o`, `w7323fdrk26`;
  - QuotationServices: `0e9e0whsly3`, `1cef3uz9ds1`, `c9gw8dbxw81`, `gykxrnqctef`, `j4nld1cfsfj`, `rq6vblwzkno`, `yy9mfxhb77o`;
  - CaseServices: `8g0x6ls0zwr`.

Dán xong thì tải lại trang NocoBase (**Ctrl+F5**). Bước 7 (chạy lại file check) sẽ xác nhận block nào còn thiếu hoặc bị dán nhầm: những block đó hiện `OUTDATED`.

### 5.9 Block mới (tuỳ chọn) `All Module/Service/ServiceChangeLog.js` là block mới, hiển thị lịch sử thay đổi dịch vụ. Để thêm: vào trang chi tiết Quotation / Contract / Case → **Add block → JS Block** → dán file.

## Bước 6 — Tỷ giá

Tỷ giá mới nhất trên dev đã cũ: USD / EUR / SGD ngày 18/08 (43 ngày), CNY ngày 20/08 (41 ngày). Nhập tỷ giá mới trong **Exchange Rates**:
- chỉ nhập theo chiều **ngoại tệ → VND** (số VND cho 1 đơn vị). Tỷ giá ngược chiều sẽ bị DB từ chối.
- nhập xong, giá catalog quy VND tự cập nhật. Dòng dịch vụ đã chốt tỷ giá thì giữ nguyên.

## Bước 7 — Chạy lại file check

Chạy lại `pgsql/deploy/check_dev_readiness.sql`, lưu CSV và gửi tôi. Mong đợi (giống bản diễn tập sau khi có field):
- `summary`: chỉ còn `OK` / `nothing to deploy`;
- `function` / `trigger` / `index` / `column` / `view` / `table` / `nocobase field` / `js block`: không còn `MISSING` / `OUTDATED` / `EXTRA`;
- `data`:
  - dòng chưa chốt tỷ giá: 3 contract + 4 case, đúng 7 dòng USD của các hợp đồng đã thanh toán;
  - `money_consistency_violations`: 10;
  - `service_thread_violations`: 10;
  - không còn tỷ giá ngược chiều;
  - tỷ giá không còn cũ, nếu đã làm bước 6.

## Bước 8 — Kiểm thử trên giao diện

| # | Form | Kịch bản | Đúng khi |
|---|---|---|---|
| 1 | Quotation | 1 dòng VND + 1 dòng 10 USD, VAT 8% | Dòng USD hiện VND và `Original: 10.80 USD`; footer khớp tổng đã lưu |
| 2 | Contract | Tạo từ Case có dòng USD | Footer bằng tổng tiền VND của từng dòng cộng lại |
| 3 | Contract | Đổi Signed date sang ngày có tỷ giá khác | Dòng, footer và modal tính lại; lưu xong, DB khớp màn hình |
| 4 | Contract | By Case, Multiple payments 30/70 | Các đợt chia từ đúng tổng trên footer |
| 5 | Case | Dòng USD; dòng lấy từ hợp đồng (kể cả khi đổi tiền tệ) | Khớp số lưu ở `projectServices` |
| 6 | Tất cả | Tiền tệ chưa có tỷ giá | Hiện `Missing rate to VND`, không ra tổng sai |
| 7 | Tất cả | Combo pricing | Nhãn tiếng Anh; tổng nhiều combo cộng đủ tất cả combo |
| 8 | Contract | Tạo từ Case/Quotation | Dòng Case/Quotation đồng bộ; lịch sử (`serviceChangeLogs`) không bị trùng |
| 9 | Bất kỳ | Sửa dịch vụ của hợp đồng đã phát sinh thanh toán | Hiện thông báo tiếng Anh của DB |
| 10 | Tất cả | Mở panel Guide, rê chuột lên tooltip | Toàn bộ tiếng Anh |
| 11 | Contract | Dòng **10,50 USD** | Sau khi lưu, cả hợp đồng, Case và báo giá vẫn là 10,50 (không bị làm tròn thành 11) |
| 12 | Payment | Mở chi tiết thanh toán hợp đồng, tạo payment, tạo payment request | 3 block Payment vừa cập nhật hoạt động bình thường |

## Khôi phục khi có sự cố

- **Toàn bộ DB:** restore file backup ở bước 0.
- **Một JS block:** dán lại code cũ đã chép ra ở bước 5.
- **Lỗi giữa bước 1:** gửi tôi thông báo lỗi. Cả 4 file đều chạy lại được sau khi sửa nguyên nhân.
