# Case Finance Tab — Quy tắc nghiệp vụ — Design Spec

Date: 2026-09-28
Status: Draft — quy tắc 1–4, 9, 10 đã chốt hướng; quy tắc 5–8 là đề xuất; D1–D7 (§12) đã được user trả lời 2026-09-28 và đưa vào các mục tương ứng. Chờ duyệt toàn bộ trước khi lập plan triển khai.
Related:
- Canvas thiết kế UI: https://claude.ai/artifact/XqRAYWFgcjU3yB46g2XhjK (By Case, Retainer, By Service line, By Service combo)
- `2026-09-17-unified-contract-payment-data-model-design.md` (contractPaymentSchedule, FK trên paymentRequests)
- `2026-09-25-by-service-package-allocation-ui-design.md` (billing item theo combo — §3 dưới đây thay đổi một phần)
- `2026-09-07-retainer-billing-automation-design.md`, `2026-09-08-contract-billing-plans-architecture-design.md`
- `docs/superpowers/plans/2026-08-14-currency-vnd-normalization.md`

## 0. Phạm vi

Tab **Finance** trong Case detail: một JS Block mới (`CaseFinanceBlock`) hiển thị toàn bộ vòng đời thu tiền của hợp đồng gắn với case — đơn vị thu (đợt / dịch vụ / combo / kỳ) → Payment Request → Invoice → Payment — và vài thao tác thủ công. Rẽ nhánh UI theo `contracts.contractType` (byCase / byService / retainer) và `pricingMode` (line / package).

Không thay đổi Task Management (TaskManagement.js, TaskDetailView.js) — cấu hình task trigger vẫn làm ở đó; tab Finance chỉ link sang.

## 1. Phạm vi dữ liệu của tab (quy tắc 1 — đã chốt)

- Tab hiển thị **cấp hợp đồng**: mọi đơn vị thu, request, invoice, payment của hợp đồng mà case đang gắn (`projects.contractId`).
- By Service: dịch vụ thuộc case đang mở được làm nổi; dịch vụ thuộc case khác của cùng hợp đồng hiện mờ kèm tên case.
- Nếu hợp đồng gắn nhiều case: banner "Hợp đồng này dùng cho N case" + link.
- Case chưa có hợp đồng: màn trống (Link contract / Create contract), không hiện bất kỳ số tiền nào — giữ quy ước "Finance ẩn khi case chưa có contract".

## 2. Mỗi đơn vị chỉ thu một lần (quy tắc 2 — đã chốt)

Bất biến: **mỗi đơn vị thu có tối đa 1 Payment Request chưa hủy.** Chặn ở tầng DB (unique partial index), không chỉ ở UI:

| Loại hợp đồng | Đơn vị thu | Khóa duy nhất (WHERE status <> 'cancelled') |
|---|---|---|
| By Case | đợt (`contractPaymentSchedule`) | `contractPaymentScheduleId` |
| By Service – line | dịch vụ của case (`projectServices`) | `projectServicesId` |
| By Service – combo | billing item (dòng `contractPaymentSchedule` của combo) | `contractPaymentScheduleId` |
| Retainer | kỳ của plan | (`billingPlanId`, `cycleNo`) — cần thêm 2 cột này lên `paymentRequests` |

Mọi đường tạo request (trigger SQL, workflow, nút thủ công, "Bill now") dùng chung một hàm tạo có kiểm tra khóa này; va chạm → trả lỗi nghiệp vụ "Đơn vị này đã có payment request", không tạo bản thứ hai. Hủy request (§7) thì được tạo lại.

## 3. Combo: request tạo khi đủ trigger (quy tắc 3 — đã chốt, thay đổi spec 2026-09-25)

- **Giữ** một dòng `contractPaymentSchedule` cho mỗi combo (và mỗi dịch vụ lẻ ngoài combo) làm *định nghĩa khoản thu*: `label` = tên combo, `amount` = số đã phân bổ lúc tạo hợp đồng, gắn các contractServices của combo, `triggerType = on_task_done`.
- **Bỏ** việc tạo request Pending ngay khi insert dòng schedule cho loại hợp đồng By Service + package.
- Khi **mọi** task `isPaymentTrigger` thuộc **tất cả** dịch vụ của combo đều `done` (AND) → tạo **một** request, status `active`, `dueDate = hôm nay + 7`, tiêu đề **`{tên combo} - {mã hợp đồng}`**, `sourceSnapshot` lưu danh sách dịch vụ + số tiền tham khảo từng dịch vụ.
- Combo không có task trigger nào → không bao giờ tự tạo; người phụ trách (§10) tạo thủ công, cùng định dạng tiêu đề.
- Hệ quả: "Requested" = tổng request đã tạo; **công nợ = giá trị hợp đồng − đã thu**, không tính bằng tổng request.
- Hợp đồng combo cũ (tạo trước per-item billing, không có dòng schedule) giữ đường per-service như hiện tại.

## 4. Trạng thái Payment Request (quy tắc 4 — đã chốt)

Vòng đời chỉ còn **`pending` → `active`**:
- `pending`: đã có request nhưng chưa đủ điều kiện thu (By Case: chưa tới ngày / chưa đủ điều kiện). Chưa được xuất invoice, không tính quá hạn.
- `active`: sẵn sàng xuất invoice. By Service (line + combo), Retainer, request thủ công đều tạo thẳng `active`.
- "Đã thu đủ / một phần" **không phải trạng thái** — suy ra từ tổng payment (§5).
- Ngoài vòng đời: **`cancelled`** — trạng thái kết thúc cho request bị hủy (§7.1). Không quay lại pending/active; muốn thu lại thì tạo request mới (D1 — đã chốt).

Bỏ `submitted`, `checking`, `approved`, `converted`. Chỗ đang ghi / đọc các giá trị này (phải sửa cùng đợt):
- Ghi `submitted`: `pgsql/retainer_billing_run_due.sql:118`, `JsField/Workflow/CreateContractBillingPlansWorkflow.js:127`, `All Module/Payment/PaymentRequestCreateBlock.js:1296`, `All Module/Contract/ContractDetailView.js:6181`, `All Module/Contract/ContractPaymentScheduleDetailBlock.js:1405` → đổi thành `active`.
- Đọc: `REQUESTED_PR_STATUSES` và bảng màu status ở `ContractDetailView.js:5457,5469`, `ContractPaymentScheduleDetailBlock.js:689,701`.
- Migrate dữ liệu: `UPDATE "paymentRequests" SET status='active' WHERE status IN ('submitted','checking','approved','converted')` — chạy trước khi thu hẹp option list của field trong NocoBase.

## 5. Invoice và Request tự tính trạng thái + quá hạn (quy tắc 5 — đề xuất)

### 5.1 Nguồn số liệu
Một trigger trên `payments` (INSERT/UPDATE/DELETE) tính lại, cho request và invoice liên quan:
- `paidAmount` = tổng `payments.amount` (quy VND, §9) có `paymentStatus = received` gắn với request / invoice đó.
- `outstandingAmount` = `amount − paidAmount` (không âm; phần dư xử lý ở §6.2).

`invoices` đã có cột `amountPaid` / `outStandingAmount` nhưng chưa ai ghi (spec 2026-09-23 §2) → dùng lại, có chủ. `paymentRequests` thêm `paidAmount`, `outstandingAmount`, `overdueSince`.

### 5.2 Trạng thái invoice (tự tính, trừ 2 trạng thái tay)
Thứ tự ưu tiên:
1. `cancelled` — chỉ đặt tay (§7).
2. `draft` — đặt tay, chưa phát hành; không tính quá hạn.
3. `paid` — `paidAmount ≥ amount`.
4. `overdue` — `dueDate < hôm nay` và còn nợ.
5. `partial` — `0 < paidAmount < amount`.
6. `pending` — đã phát hành, chưa thu, chưa tới hạn.

Invoice vừa quá hạn vừa đã thu một phần vẫn có status `overdue`; số đã thu hiện qua `amountPaid` ("Overdue · đã thu 40%").

### 5.3 Quá hạn cho cả request và invoice
- Request quá hạn: `status = active` và `dueDate < hôm nay` và `outstandingAmount > 0`. Ghi `overdueSince`.
- Invoice quá hạn: như §5.2.
- Hạn invoice mặc định = hạn request, sửa được khi xuất.
- Tab Finance hiển thị 1 cờ trên mỗi đơn vị thu: có invoice → theo invoice; chưa có → theo request ("Chưa xuất invoice · quá hạn yêu cầu N ngày").
- Vì quá hạn phụ thuộc thời gian, cần job hằng ngày: **NocoBase Schedule workflow** (không dùng pg_cron — instance chưa có quyền) gọi hàm SQL `finance_mark_overdue()` cập nhật status invoice + `overdueSince` của request, và phát thông báo §10 cho các bản ghi *vừa* chuyển sang quá hạn.

## 6. Thanh toán ngoài trường hợp chuẩn (quy tắc 6 — đề xuất)

Nguyên tắc chung: **mỗi dòng `payments` gắn đúng 1 request (và invoice nếu có).** Các trường hợp phức tạp được tách thành nhiều dòng thay vì thêm bảng phân bổ — mọi phép cộng hiện có (contract_payment_status_workflow, PaymentCreateBlock) vẫn đúng.

Field mới trên `payments`: `paymentType` (`normal` | `advance` | `credit` | `refund`), `receiptGroupId` (string), `targetScheduleId` / `targetProjectServiceId` / `targetBillingPlanId` (chỉ dùng cho advance).

`payments.paymentStatus` chỉ còn **`received`** | **`cancelled`** (D4 — đã chốt). Migrate `paid`/`completed`/`partial` cũ → `received`; "một phần / đủ" là thuộc tính của invoice/request (§5), không phải của khoản tiền nhận. Phải sửa cùng đợt: `ACTUAL_PAYMENT_STATUSES` trong `PaymentContractDetailBlock.js` / `PaymentCreateBlock.js` và điều kiện `LOWER(p."paymentStatus") IN ('received','paid','completed','partial')` trong `contract_payment_status_workflow.sql` → `= 'received'`.

### 6.1 Một lần chuyển khoản trả nhiều invoice
- "Record payment" cho chọn nhiều invoice đang nợ; tổng tiền nhận được phân bổ mặc định **theo hạn cũ trước**, sửa tay được.
- Lưu thành N dòng `payments` cùng `receiptGroupId`, cùng ngày / phương thức / mã giao dịch ngân hàng. Activity ghi 1 sự kiện "Nhận X VND cho N invoice".
- Hủy lần nhận tiền = hủy cả nhóm.

### 6.2 Khách trả dư
- Phần dư lưu thành 1 dòng `paymentType = credit`, gắn hợp đồng, không gắn request/invoice.
- Tab Finance hiện ô "Tiền dư của khách" (tổng credit chưa dùng).
- "Apply credit" trên một invoice: giảm dòng credit, tạo dòng `normal` cùng `receiptGroupId` cho invoice đó.
- Hoàn tiền: dòng `refund` (số âm) trừ vào credit, cần người phụ trách xác nhận.

### 6.3 Tạm ứng khi chưa có request
- Ghi nhận thành dòng `paymentType = advance`, gắn hợp đồng + (tùy chọn) đơn vị thu dự kiến (`target*`).
- Khi request của đơn vị đó được tạo → tự áp tạm ứng vào request (tạo dòng `normal`, giảm advance tương ứng); phần tạm ứng lớn hơn request → giữ lại làm credit.
- Tạm ứng không gắn đơn vị → nằm ở credit, áp tay.
- **Xuất hóa đơn cho tạm ứng là tùy chọn** (D3 — đã chốt): khi ghi nhận tạm ứng có lựa chọn "Xuất hóa đơn tạm ứng" (mặc định: không).
  - **Không xuất**: như trên — tạm ứng chỉ là payment `advance`, được trừ vào invoice chính khi có.
  - **Có xuất**: tạo invoice `invoiceType = advance` (số tiền = số tạm ứng, trạng thái `paid` ngay vì tiền đã nhận), payment `advance` gắn vào invoice đó. Khi xuất invoice chính cho đơn vị thu: invoice chính ghi dòng "Trừ tạm ứng theo hóa đơn …" (`deductedAdvanceInvoiceId`, `advanceDeductedAmount`); số phải thu của invoice chính = số tiền − phần tạm ứng đã xuất hóa đơn. Tránh thu và xuất hóa đơn 2 lần cho cùng một khoản.
  - Field mới trên `invoices`: `invoiceType` (`normal` | `advance`), `deductedAdvanceInvoiceId`, `advanceDeductedAmount`.

## 7. Hủy và điều chỉnh (quy tắc 7 — đề xuất)

### 7.1 Hủy Payment Request
- Chỉ khi chưa có invoice hiệu lực và chưa có payment. Nếu có → phải hủy invoice / chuyển payment trước.
- `status = cancelled`, bắt buộc lý do; đơn vị thu trở lại "chưa có request" → có thể tạo lại (thủ công, hoặc trigger chạy lại khi điều kiện còn đúng).

### 7.2 Hủy / thay thế Invoice
- Hủy chỉ khi chưa có payment gắn vào; có payment → chuyển payment sang invoice thay thế (cùng `receiptGroupId`).
- Invoice thay thế ghi `replacesInvoiceId`; request quay về "chờ xuất invoice" cho tới khi có invoice mới.
- Nếu hóa đơn điện tử thật phát hành ở hệ thống khác: lưu số hóa đơn điện tử tham chiếu; điều chỉnh/thay thế làm bên đó, ở đây chỉ phản ánh.

### 7.3 Sửa hợp đồng sau khi đã có request
- **Số tiền của request đã tạo bị khóa.** Sửa giá chỉ ảnh hưởng đơn vị chưa có request.
- By Case: phần giá trị mới chia lại cho các đợt chưa có request; tổng đợt phải = tổng hợp đồng (giữ rule làm tròn: đợt cuối nhận phần dư).
- By Service combo: số phân bổ của combo khóa khi request của combo được tạo; combo chưa có request thì phân bổ lại như lúc tạo hợp đồng.
- Giảm giá trị xuống dưới số đã yêu cầu → không cho lưu; phải hủy request (§7.1) hoặc xử lý credit/hoàn tiền trước.
- Banner "Hợp đồng đã sửa ngày … bởi …" trên tab Finance; chi tiết ở Activity.

### 7.4 Thêm dịch vụ sau khi đã tạo case
- Lưu hợp đồng phải tạo luôn `projectServices` cho case đang gắn (sửa lỗ hổng "notInCase" đã ghi trong spec 2026-09-24), để dịch vụ mới có task và chạy trigger.
- Nếu không tạo được (nhiều case, chưa chọn case) → dịch vụ hiện trạng thái "Chưa gắn case" với nút "Thêm vào case".

### 7.5 Chấm dứt hợp đồng giữa chừng
- Hợp đồng chuyển trạng thái chấm dứt, lưu `terminationDate` + lý do.
- Request `pending` → hủy tự động. Request `active` còn nợ → **vẫn thu** (giữ nguyên).
- Đơn vị chưa có request: By Case / By Service / combo → không tạo nữa; nếu đã làm một phần việc, người phụ trách tạo request thủ công "Quyết toán chấm dứt" với số tiền nhập tay (không vượt phần chưa yêu cầu).
- Retainer: plan `completed` tại `terminationDate`, không sinh kỳ mới; kỳ dở dang không tự tính theo ngày (có thể tạo tay).
- Tab Finance: banner "Đã chấm dứt ngày …"; công nợ = tổng request active chưa thu.

## 8. Retainer — phân tích sâu (quy tắc 8)

Dữ liệu thật: `contractBillingPlans` (`planType = retainer`, `status` active/completed, `nextBillingDate`, `retainerCyclesBilled`, số kỳ, đơn vị kỳ, `endDate`); job `retainer_billing_run_due.sql` chỉ xử lý plan `status = 'active'`. Tiền mỗi kỳ = `ROUND(tổng / số kỳ)`, **kỳ cuối nhận phần dư** (spec làm tròn 2026-09-25) → UI phải hiện số tiền từng kỳ, không giả định bằng nhau.

### 8.1 "Tạm dừng" nghĩa là gì — cần phân biệt 2 nghiệp vụ
- **(A) Tạm ngưng dịch vụ** (khách tạm dừng thuê, hãng không làm việc): các kỳ trong thời gian dừng **không thu**, và **không mất** — lịch dời về sau.
- **(B) Hoãn thu** (vẫn làm việc, chỉ thu chậm): không phải tạm dừng; xử lý bằng cách lùi hạn của request, không đụng plan.

→ Đề xuất: nút **Pause chỉ dành cho (A)**. (B) dùng "Sửa hạn thanh toán" trên request.

### 8.2 Started / Stopped (nghĩa A) — checkbox (D2 — đã chốt)
- Field mới trên `contractBillingPlans`: **`isBillingActive`** (checkbox, mặc định `true`). `true` = Started (đang tự thu), `false` = Stopped (tạm dừng). `status` giữ nguyên nghĩa vòng đời plan (`active` / `completed`) — checkbox không thay status.
- Job `retainer_billing_run_due.sql` thêm điều kiện `AND "isBillingActive" = true` (một dòng WHERE; phần còn lại không đổi).
- Bỏ tick (Stop): lưu `pausedAt`, `pausedBy`, `pauseReason` (bắt buộc), `resumeOn` (tùy chọn). Tick lại (Start) — tay, hoặc job hằng ngày khi `resumeOn ≤ hôm nay`.
- Khi Start lại: số kỳ **đã bỏ qua** = số mốc `nextBillingDate` rơi vào khoảng dừng. `nextBillingDate` = mốc kỳ đầu tiên ≥ ngày start (giữ ngày chốt kỳ, ví dụ vẫn mùng 1); **tổng số kỳ giữ nguyên**.
- **Dời ngày kết thúc**: nếu plan/hợp đồng có `endDate` → cộng thêm đúng số kỳ đã bỏ qua, ghi Activity ("Dời ngày kết thúc từ … sang … do tạm dừng N kỳ"). Giá trị hợp đồng không bị mất.
- Bỏ lựa chọn "tạo bù các kỳ bỏ qua" khỏi dialog (khác thiết kế canvas hiện tại).

### 8.3 Bill next period now
- Tạo request cho kỳ `retainerCyclesBilled + 1` ngay, `active`, hạn = hôm nay + 7.
- `retainerCyclesBilled + 1`; `nextBillingDate` = mốc cũ + 1 kỳ (neo theo lịch gốc, không neo theo hôm nay).
- Không cho khi `isBillingActive = false` (đang ngưng dịch vụ mà lại thu trước là mâu thuẫn — sửa lại thiết kế canvas đang cho phép), khi đã đủ số kỳ, hoặc khi hợp đồng đã chấm dứt.
- Chạy cùng hàm tạo với job (§2), khóa dòng plan (`SELECT … FOR UPDATE`) để job và nút bấm chạy cùng lúc không tạo 2 request cho một kỳ.

### 8.4 Retainer không kỳ hạn (open-ended)
- Không có tổng / số kỳ → không tự thu. "Tạo request kỳ này" bắt buộc nhập số tiền; kỳ tăng dần theo `cycleNo`.
- Đề xuất sau: thêm field "Phí mỗi kỳ" để tự thu được cả loại này.

### 8.5 Sửa hợp đồng Retainer giữa chừng
- Đổi tổng / số kỳ: tiền các kỳ còn lại = (tổng mới − đã yêu cầu) / số kỳ còn lại, kỳ cuối nhận phần dư. Kỳ đã có request không đổi.

## 9. Tiền tệ (quy tắc 9 — sửa lại đề xuất trước)

Đề xuất trước ("request/invoice theo tiền tệ của hợp đồng") **không khớp thiết kế hiện có**, rút lại. Theo `multi_currency_migration.sql` và plan chuẩn hóa VND: mỗi dòng dịch vụ giữ tiền tệ riêng nhưng `subTotal`/`vatAmount`/`totalAmount` đã quy **VND** với tỷ giá đóng băng trên dòng; tổng hợp đồng luôn là VND; `contracts.currencyId` chỉ là mặc định cho dòng mới. Việc SQL ghi `'VND'` cho request (`unified_contract_payment_schedule.sql:137,609`) vì vậy là **đúng thiết kế**.

Quy tắc đề xuất:
- **Sổ cái là VND**: request, invoice, công nợ, mọi ô tổng trên tab Finance tính bằng VND.
- Hợp đồng có dịch vụ ngoại tệ: tab Finance hiện thêm số ngoại tệ tham khảo theo tỷ giá đóng băng trên dòng dịch vụ ("≈ 500 USD @ 25.432").
- Nhận tiền bằng ngoại tệ: `payments` đã có `currencyId` + `exchangeRateToBase` → lưu số gốc + tỷ giá ngày nhận; số trừ nợ = quy VND. Chênh lệch giữa tỷ giá lúc ký và lúc nhận làm lệch vài đồng → phần thiếu là công nợ còn lại, phần dư là credit (§6.2); ghi rõ "chênh lệch tỷ giá" trên dòng payment.
### 9.1 Invoice ngoại tệ (D7 — đã chốt: ghi ngoại tệ)
Với khách nước ngoài, số khách **thực sự nợ là số ngoại tệ** trên hợp đồng; số VND chỉ là quy đổi. Vì vậy invoice ngoại tệ lấy ngoại tệ làm số gốc:

- **Tiền tệ của invoice**: mặc định = tiền tệ gốc của các dòng dịch vụ thuộc đơn vị thu, nếu tất cả cùng một ngoại tệ; dòng lẫn nhiều tiền tệ → VND. Sửa tay được khi xuất.
- **Số tiền**: invoice ngoại tệ ghi `amountForeign` = tổng giá gốc ngoại tệ của các dòng (theo tỷ lệ của đơn vị thu, ví dụ đợt 30% → 30% số ngoại tệ), kèm `currencyId`, `exchangeRate` = tỷ giá **ngày lập invoice** (bảng `exchangeRates`), và `amount` (VND) = `amountForeign × exchangeRate`.
- **Trạng thái invoice ngoại tệ tính bằng ngoại tệ**: payment cùng ngoại tệ cộng thẳng số gốc; payment khác tiền tệ quy đổi theo tỷ giá ngày nhận. Tránh việc invoice USD đã trả đủ mà vẫn "còn nợ vài nghìn đồng" do tỷ giá.
- **Chênh lệch tỷ giá**: request giữ số VND đã khóa (§7.3). Khi invoice ngoại tệ được lập, invoice trở thành nguồn công nợ của đơn vị đó; chênh lệch giữa VND của invoice và VND của request ghi vào `fxDifference` trên invoice. Khi thu đủ, chênh lệch giữa tỷ giá ngày lập và ngày nhận ghi vào `fxDifference` trên payment. Tab Finance hiện tổng chênh lệch tỷ giá ở phần tổng kết, không trộn vào công nợ.
- **Tab Finance**: đơn vị thu có invoice ngoại tệ hiện số ngoại tệ là chính ("USD 500 · ≈ 12.716.000 VND"); các ô tổng vẫn VND.
- Field mới trên `invoices`: `currencyId`, `exchangeRate`, `amountForeign`, `amountPaidForeign`, `fxDifference`; trên `payments`: `fxDifference`.

## 10. Người phụ trách và thông báo (quy tắc 10 — đã chốt hướng)

### 10.1 Field
- Mới: `contracts.financeLawyers` — belongsToMany → `lawyers` ("Finance handlers"). Đặt ở hợp đồng vì tab Finance là cấp hợp đồng (§1).
- Có sẵn: `projects.managerId` → `lawyers` (Manager của case; `projectManagerId` → users là field cũ, không dùng).
- Có sẵn: `paymentRequests.assignedLawyer` → gán tự động = người đầu tiên trong `financeLawyers`, nếu trống thì Manager của case — để mỗi request có một người chịu trách nhiệm chính.
- Lawyer → user để gửi thông báo qua `lawyers.user` (receiver phải là `….user.id`, xem ghi chú trong `CreatePaymentRequestNotificationWorkflow.js`).

### 10.2 Ai được xem và thao tác (D6 — đã chốt)
- **Chỉ Manager của case và thành viên Finance (`financeLawyers`) thấy tab Finance.** Người khác không thấy tab (không phải chế độ chỉ đọc). Nhân viên kế toán muốn thấy thì phải được thêm vào `financeLawyers` của hợp đồng.
- Cùng nhóm đó được thao tác: Record payment, Create invoice, tạo request thủ công, hủy request/invoice, Start/Stop Retainer, Bill now, áp credit, hoàn tiền.
- Hợp đồng dùng cho nhiều case: Manager của **bất kỳ** case nào gắn hợp đồng đều thấy tab Finance ở case của mình.
- Kiểm tra quyền phải làm ở cả phía dữ liệu (ACL/scope của NocoBase trên `paymentRequests`, `invoices`, `payments`), không chỉ ẩn tab trong JS Block.

### 10.3 Người nhận thông báo
Người nhận = `financeLawyers` ∪ Manager của case liên quan, loại trùng (một người vừa là finance vừa là manager chỉ nhận 1 lần).
- Hợp đồng dùng cho nhiều case: **báo cho Manager của tất cả case** gắn hợp đồng, với mọi sự kiện (D5 — đã chốt).

| Sự kiện | Nội dung chính |
|---|---|
| Request được tạo / chuyển active | tiêu đề request (combo: tên combo), số tiền, hạn |
| Request / invoice vừa quá hạn (job hằng ngày) | số ngày quá hạn, còn nợ |
| Nhận payment | số tiền, invoice/request, còn nợ |
| Thao tác thủ công (tạo request tay, hủy, Pause/Resume/Bill now, áp credit, hoàn tiền) | ai làm, lý do |
| Hợp đồng sửa giá / chấm dứt | thay đổi, ảnh hưởng công nợ |

Nội dung theo quy ước thông báo human-readable của dự án: `caseCode + projectName + customer.shortName` (Case) hoặc `contractCode/title + customers.shortName` (Contract) — không dùng `#id` trần; chú ý tên relation `customer` / `customers` khác nhau giữa các collection.

## 11. Thứ tự triển khai

1. **Dữ liệu & bất biến**: migrate status (§4); đơn giản `paymentStatus` (§6); unique index (§2) — chạy audit trùng trước khi tạo index; field mới (§5.1, §6, §8.2, §10.1) qua script đăng ký field + Diagnose kiểm lại (NocoBase bỏ qua âm thầm field chưa đăng ký).
2. **Tự động**: trigger payments → request/invoice (§5.1–5.2); job quá hạn (§5.3); combo tạo khi đủ trigger (§3); Retainer pause/resume/bill now (§8).
3. **Tab Finance chỉ đọc** cho 4 loại hợp đồng + màn trống; nút mở InvoiceCreateBlock / PaymentCreateBlock sẵn có.
4. **Thao tác**: tạo request thủ công, hủy/thay thế, nhận tiền nhiều invoice, credit, tạm ứng, thông báo §10.
5. **Kiểm thử theo kịch bản** (mở rộng các tài liệu pipeline test hiện có): combo đủ trigger; tạo tay rồi tick trigger (không trùng); Pause → Resume với/không endDate; Bill now song song với job; nhận USD; khách trả dư rồi áp credit; tạm ứng rồi request được tạo; chấm dứt giữa chừng.

## 12. Quyết định (user trả lời 2026-09-28)

- **D1** — Request có trạng thái `cancelled` → §4, §7.1.
- **D2** — Tạm dừng Retainer được dời ngày kết thúc; dừng/chạy bằng checkbox `isBillingActive` (Started/Stopped) → §8.2.
- **D3** — Tạm ứng có thể xuất hoặc không xuất hóa đơn, chọn khi ghi nhận → §6.3.
- **D4** — `payments.paymentStatus` chỉ còn `received` / `cancelled` → §6.
- **D5** — Hợp đồng nhiều case: báo Manager của tất cả case → §10.3.
- **D6** — Chỉ Manager + thành viên Finance thấy và thao tác tab Finance → §10.2.
- **D7** — Invoice khách nước ngoài ghi ngoại tệ → §9.1.

Còn cần kiểm tra khi lập plan (không phải quyết định nghiệp vụ): tên cột thật của `contractBillingPlans` (số kỳ, `endDate` nằm ở plan hay hợp đồng), bảng `exchangeRates` có tỷ giá theo ngày không, và `paymentRequests` / `paymentRequestItems` chưa có cột tiền tệ (ghi chú trong `multi_currency_migration.sql`).
