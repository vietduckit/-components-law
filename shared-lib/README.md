# shared-lib — Thư viện dùng chung cho JS Block

## Vì sao có thư mục này

Quét toàn bộ `All Module/` cho thấy các hàm như `parseNum`, `fmtVND`, `fmtDate`,
`extractId`, `initials`, `avatarBg`... bị copy-paste (với nhiều biến thể nhỏ:
"₫" vs "VNĐ", fallback "-" vs "—" vs "") vào **20+ file JS Block khác nhau**.
`shared-lib/law-shared.js` gom các hàm thuần (pure function, không phụ thuộc
React/antd) này về một chỗ, load bằng `ctx.importAsync()` thay vì định nghĩa
lại trong từng block.

## Cách deploy (host qua Nocobase file-manager)

1. Sửa/thêm hàm trong `shared-lib/law-shared.js`.
2. Tăng `VERSION` ở đầu file nếu có thay đổi public API.
3. Upload file này lên Nocobase (qua plugin file-manager / storage đang dùng)
   — **đặt tên file có version**, ví dụ `law-shared-v1.js`, `law-shared-v2.js`,
   thay vì ghi đè cùng 1 tên file. Lý do: nhiều block khác nhau có thể đang
   cache/pin theo URL cụ thể; ghi đè cùng URL có thể âm thầm đổi hành vi của
   các block đang chạy production mà không ai biết đang dùng bản nào.
4. Lấy URL công khai sau khi upload (thường dạng
   `https://<domain>/storage/uploads/law-shared-v1.js` hoặc tương đương theo
   cấu hình storage của bạn).
5. Trong mỗi JS Block muốn dùng, khai báo:
   ```js
   const SHARED_LIB_URL = "https://<domain>/storage/uploads/law-shared-v1.js";
   const Shared = await ctx.importAsync(SHARED_LIB_URL);
   const { fmtVND, parseNum, fmtDate /* ... */ } = Shared;
   ```

## Quy tắc khi sửa `law-shared.js`

- Đây là code dùng chung cho nhiều block **đang chạy production** — không đổi
  hành vi mặc định của hàm đã tồn tại, chỉ thêm option mới (mỗi hàm nhận object
  option để tái tạo đúng biến thể cũ, ví dụ `fmtVND(n, { symbol: 'VNĐ' })`).
- Khi 1 block cần hành vi khác hẳn (không chỉ là option), viết hàm mới có tên
  khác, đừng sửa hàm cũ.
- Đổi tên file (bump version) khi có thay đổi có thể phá vỡ block cũ, thay vì
  ghi đè URL cũ — xem bước 3 ở trên.

## Trạng thái áp dụng

| File | Trạng thái |
|---|---|
| `All Module/Case/CaseDashboard.js` | ✅ Đã refactor dùng `Shared` (file mẫu, đang chờ review + test ở dev/staging) |
| ~30 file JS Block còn lại | ⏳ Chưa áp dụng — sẽ làm tuần tự sau khi mẫu trên được duyệt |

Sau khi `CaseDashboard.js` chạy ổn ở dev/staging, áp dụng tiếp cho các file khác
theo cùng khuôn mẫu: thay phần "UTILS" trùng lặp bằng `const Shared = await
ctx.importAsync(SHARED_LIB_URL)` + destructure, giữ lại local những hàm đặc thù
riêng của từng block.
