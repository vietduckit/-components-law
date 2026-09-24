# OnlyOffice In-Browser Editing Plugin — Design

## Bối cảnh & vấn đề

Task Detail có luồng "Điền biến & Generate": `docxtemplater` điền các `{{tag}}` từ `VARIABLE_CATALOG` vào file `.docx` mẫu ngay trên trình duyệt, upload kết quả lên Nocobase, rồi preview qua iframe Office Online (`view.officeapps.live.com`). Preview này **chỉ đọc** — luật sư muốn sửa nội dung sau khi generate (thêm điều khoản, chỉnh câu chữ...) phải tải file về, sửa bằng Word desktop, rồi upload lại thủ công.

Mục tiêu: cho phép sửa trực tiếp file `.docx` ngay trong trình duyệt, lưu lại thành phiên bản mới, không phá vỡ luồng Generate hiện có.

## Phạm vi (đã chốt qua brainstorming)

- Chỉ áp dụng cho file `.docx` sinh ra từ **Task Template Generate flow** (không mở rộng cho toàn bộ Document Library ở giai đoạn này).
- Mỗi lần Save trong editor tạo **document/attachment mới** (giữ lịch sử phiên bản đầy đủ), không ghi đè bản cũ.
- Version mới chỉ được tạo **khi luật sư đóng trình soạn thảo** sau khi đã sửa (không tạo version liên tục theo mỗi keystroke/autosave).
- Công cụ editor: **OnlyOffice Document Server Community Edition** (đã chọn qua Approach A, xem "Các phương án đã xét" bên dưới).

## Các phương án đã xét

1. **OnlyOffice Document Server CE** *(đã chọn)* — JS API đơn giản (`DocsAPI.DocEditor` + 1 callback endpoint nhận status code), độ tương thích định dạng `.docx` cao (dùng chung engine với MS Office format). Nhược điểm: giới hạn ~20 phiên đồng thời trên bản CE, cần container riêng (~2 vCPU/2GB RAM).
2. **Collabora Online (CODE)** — dùng giao thức WOPI, cần tự implement 3 endpoint host (`CheckFileInfo`/`GetFile`/`PutFile`) thay vì 1 callback đơn giản — tích hợp phức tạp hơn đáng kể. Renderer dựa trên LibreOffice, nhẹ hơn nhưng có rủi ro sai lệch định dạng với file `.docx` phức tạp (bảng, style tuỳ biến).
3. **Server riêng tự viết (không dùng OnlyOffice/Collabora)** — được phân tích ở phase brainstorm trước: chi phí xây dựng + bảo trì một document-editing engine tương thích `.docx` từ đầu là không hợp lý so với dùng lại OnlyOffice/Collabora.

**Quyết định:** Approach A (OnlyOffice CE), tích hợp qua **Nocobase plugin** (chạy server-side trong cùng process Node của Nocobase) thay vì một service Node/Express tách rời — vì plugin có thể giữ `JWT_SECRET` an toàn phía server và truy cập trực tiếp Sequelize models (`documents`, `attachments`) mà không cần mở thêm cổng API công khai.

## Kiến trúc tổng quan

```
Browser (luật sư)
   │  1. Bấm "Sửa trực tuyến"
   ▼
Nocobase Frontend (TaskDetailView.js)
   │  2. Gọi custom action onlyoffice:getConfig
   ▼
Nocobase Plugin (plugin-onlyoffice, server-side)
   │  3. Build + ký JWT config, trả về
   ▼
Browser tải api.js từ OnlyOffice Document Server (public URL)
   │  4. new DocsAPI.DocEditor(...) — mở editor trong modal
   ▼
OnlyOffice Document Server (container riêng)
   │  5. Tự fetch file gốc từ document.url (nội bộ docker network)
   │  6. Luật sư sửa, bấm Close trong editor
   │  7. Document Server POST callback (status=2) tới editorConfig.callbackUrl
   ▼
Nocobase Plugin (onlyoffice:callback, server-side)
   │  8. Verify JWT, tải file đã sửa từ Document Server, tạo document/attachment mới
   ▼
Postgres (documents, attachments, junction tables)
```

### Luồng vận hành chi tiết (6 bước)

1. **getConfig**: Frontend gọi `onlyoffice:getConfig` với `documentId`. Plugin kiểm tra quyền (`canEdit` tương đương các action khác trong `TaskDetailView.js`), build object config gồm `document.url` (trỏ tới file hiện tại), `editorConfig.callbackUrl`, `document.key` (định danh phiên chỉnh sửa, dạng `doc_<documentId>_<timestamp>` để tránh cache editor cũ), rồi ký toàn bộ config bằng JWT (`ONLYOFFICE_JWT_SECRET`). Trả `{ config, docServerPublicUrl }` về frontend.
2. **Embed editor**: Frontend load `api.js` từ `docServerPublicUrl`, khởi tạo `DocsAPI.DocEditor(containerId, config)` trong modal.
3. **User edits**: Luật sư chỉnh sửa trực tiếp trong iframe do OnlyOffice quản lý — không có tương tác nào với Nocobase trong lúc này.
4. **Close → callback**: Luật sư bấm nút Close (bật qua `customization.close.visible: true` trong config, thay vì chỉ đóng modal React) → Document Server tự đóng session, POST callback với `status: 2` ("ready for saving") tới `callbackUrl`.
5. **Plugin xử lý callback**: Verify JWT của request callback (JWT riêng, không phải session user — Document Server không mang cookie/token của luật sư). Parse `documentId` từ `body.key`. Nếu `status !== 2`, bỏ qua (chỉ trả `{error:0}` — các status khác là trạng thái trung gian không cần xử lý). Nếu `status === 2`: tải file đã sửa từ `body.url` (URL tạm do Document Server cấp), tạo `attachment` mới + `document` mới với `previousVersionId`/`rootDocumentId`/`versionNumber` tăng dần, luôn trả `{error:0}` khi xử lý thành công.
6. **Frontend refresh**: Sau khi đóng editor, modal chờ ~2-3s (thời gian callback xử lý bất đồng bộ) rồi gọi `reloadAttachments()` để danh sách file cập nhật bản mới nhất.

### Điểm quan trọng: Docker networking

`document.url` và `editorConfig.callbackUrl` trong config **được fetch bởi chính container Document Server**, không phải bởi trình duyệt. Vì vậy 2 giá trị này phải dùng hostname nội bộ docker network (VD: `http://nocobase:13000`), không dùng domain public HTTPS. Trình duyệt chỉ cần domain public của Document Server để load `web-apps/apps/api/documents/api.js` và render iframe — 2 luồng network hoàn toàn tách biệt và dễ nhầm lẫn nếu không note rõ.

## Data model

Thêm 3 field mới vào collection `documents` (qua Nocobase Admin UI, theo convention hiện tại của dự án — không migrate bằng tay):

| Field | Type | Ý nghĩa |
|---|---|---|
| `previousVersionId` | bigint, nullable | Trỏ tới `documents.id` của bản ngay trước đó trong chuỗi version. `null` với bản gốc (do Generate flow tạo). |
| `rootDocumentId` | bigint, nullable | Trỏ tới `documents.id` của bản đầu tiên trong chuỗi (bản gốc). Dùng để query nhanh toàn bộ lịch sử mà không cần đệ quy theo `previousVersionId`. |
| `versionNumber` | integer, default 1 | Số thứ tự phiên bản trong chuỗi, tăng dần từ 1. |

Bản edit mới lưu với `documentType: "Edited"` (khác `"File mẫu"` của bản do trigger Generate tạo) để phân biệt nguồn gốc trong activity log / UI.

## Thiết kế plugin (`plugin-onlyoffice`)

Cấu trúc thư mục theo chuẩn Nocobase plugin (server-only, không cần UI riêng ở bản đầu):

```
storage/plugins/plugin-onlyoffice/
  package.json
  src/
    server/
      index.ts          -- đăng ký resourcer actions
      config.ts          -- build + ký config, đọc env vars
      jwt.ts              -- sign/verify helper
      callback.ts         -- xử lý onlyoffice:callback
```

**Env vars:**
- `ONLYOFFICE_DOCSERVER_PUBLIC_URL` — domain public Document Server (browser dùng để load `api.js`).
- `ONLYOFFICE_JWT_SECRET` — secret dùng ký config + verify callback, phải giống hệt secret cấu hình trong container Document Server (`JWT_SECRET` env của image `onlyoffice/documentserver`).
- `NOCOBASE_INTERNAL_URL` — hostname nội bộ docker network của chính Nocobase (Document Server dùng để fetch `document.url`).

**Action `onlyoffice:getConfig`** (auth-gated bằng session user hiện tại, giống các action Nocobase khác):
- Input: `{ documentId }`.
- Kiểm tra quyền sửa tương đương action "Điền biến & Generate" hiện có.
- Build `document.key = "doc_" + documentId + "_" + Date.now()` (đảm bảo Document Server không dùng cache của phiên chỉnh sửa cũ cho cùng file).
- Build `document.url = NOCOBASE_INTERNAL_URL + "/storage/uploads/" + <filename hiện tại>`.
- Build `editorConfig.callbackUrl = NOCOBASE_INTERNAL_URL + "/api/onlyoffice:callback"`.
- Ký toàn bộ object bằng `ONLYOFFICE_JWT_SECRET`, gán vào `config.token`.
- Trả `{ config, docServerPublicUrl: ONLYOFFICE_DOCSERVER_PUBLIC_URL }`.

**Action `onlyoffice:callback`** (KHÔNG auth-gated bằng user session — request đến từ Document Server, không mang cookie/token người dùng; verify bằng JWT riêng trong header/body theo chuẩn OnlyOffice):
- Verify JWT của payload callback bằng `ONLYOFFICE_JWT_SECRET`. Sai → trả HTTP khác 200 / `{error: 1}` (KHÔNG trả `error:0`) để Document Server tự retry theo cơ chế chuẩn của nó.
- Parse `documentId` từ `body.key` (tách phần giữa `doc_` và `_<timestamp>`).
- Nếu `body.status !== 2` → trả `{error:0}` ngay, không làm gì thêm (các status khác — đang mở, đang chỉnh sửa — không cần lưu).
- Nếu `body.status === 2`: fetch file tại `body.url`, tạo attachment mới + document mới (set `previousVersionId`, `rootDocumentId`, `versionNumber = version cũ + 1`, `documentType: "Edited"`). Bọc trong try/catch — lỗi ghi DB (hết dung lượng, v.v.) → trả lỗi khác 0 để Document Server retry, đồng thời log để dev kiểm tra thủ công nếu retry vẫn fail.
- Luôn trả `{error:0}` khi xử lý thành công.

**Bảo mật:** `callbackUrl` không cần public-internet-reachable — chỉ cần cùng docker network với Document Server. `JWT_SECRET` chỉ tồn tại phía server (plugin + container Document Server), không bao giờ lộ ra frontend.

## Frontend changes (`TaskDetailView.js`)

- Thêm action **"Sửa trực tuyến"** vào `fileActionItems` (cạnh "Cấu hình biến"/"Điền biến & Generate" hiện có), điều kiện hiển thị: `ext === ".docx" && canEdit` (theo pattern các action hiện có).
- Component mới `OnlineEditModal`:
  1. Gọi `onlyoffice:getConfig` lấy `{ config, docServerPublicUrl }`.
  2. Load `api.js` từ `docServerPublicUrl` qua `ctx.requireAsync` (cùng cách `loadQuillAsync` đang load thư viện Quill UMD trong file này), lấy global `DocsAPI`.
  3. `new DocsAPI.DocEditor(containerId, config)` render editor trong modal.
  4. Config bật `customization.close.visible: true` — luật sư dùng nút Close của chính OnlyOffice thay vì nút Close của modal, đảm bảo Document Server đóng session đúng cách và bắn callback.
  5. Sau khi editor đóng: modal hiện trạng thái "Đang lưu phiên bản mới...", đợi ~2-3s rồi gọi `reloadAttachments()`.
- **Hiển thị version**: danh sách file chính (`renderFileList`) chỉ hiện **bản mới nhất** của mỗi chuỗi — lọc client-side theo `rootDocumentId`, giữ bản có `versionNumber` lớn nhất. Thêm action phụ **"Xem lịch sử phiên bản"** mở danh sách các bản cũ (query theo `rootDocumentId`, sắp `versionNumber` giảm dần) để xem/tải lại.

## Deployment

**docker-compose bổ sung:**

```yaml
services:
  nocobase:
    environment:
      - ONLYOFFICE_DOCSERVER_PUBLIC_URL=https://editor.yourdomain.com
      - ONLYOFFICE_JWT_SECRET=${ONLYOFFICE_JWT_SECRET}
      - NOCOBASE_INTERNAL_URL=http://nocobase:13000
    networks: [law-network]

  onlyoffice-documentserver:
    image: onlyoffice/documentserver:latest
    restart: unless-stopped
    environment:
      - JWT_ENABLED=true
      - JWT_SECRET=${ONLYOFFICE_JWT_SECRET}
    volumes:
      - onlyoffice_data:/var/www/onlyoffice/Data
    networks: [law-network]
    # Không publish port trực tiếp — chỉ qua reverse proxy

networks:
  law-network: { driver: bridge }
volumes:
  onlyoffice_data: {}
```

- Nginx: thêm 1 server block cho `editor.yourdomain.com` → `proxy_pass` vào `onlyoffice-documentserver:80`, cấp TLS bằng certbot như domain chính (cần thêm DNS A record cho subdomain mới).
- **Đóng gói plugin**: giai đoạn đầu mount volume (`./plugins/plugin-onlyoffice` → `storage/plugins/` trong container) để lặp code nhanh không cần rebuild image; khi ổn định chuyển sang build vào custom image cho production.

## Error handling

- **Document Server không phản hồi khi getConfig** → plugin trả lỗi rõ ràng, frontend hiện `message.error`.
- **Callback JWT sai/giả mạo** → plugin từ chối, KHÔNG trả `{error:0}` → Document Server tự động retry theo cơ chế chuẩn, sau vài lần thất bại sẽ báo lỗi cho user trong editor.
- **Ghi attachment/document thất bại trong callback** (hết dung lượng đĩa, lỗi DB...) → bắt buộc trả lỗi khác 0 để Document Server retry, tránh mất bản sửa của luật sư trong im lặng; log rõ để dev kiểm tra nếu retry hết vẫn fail.
- **2 luật sư cùng sửa 1 file cùng lúc** → OnlyOffice hỗ trợ đồng chỉnh sửa real-time sẵn có theo giao thức chuẩn (không cần code thêm); có thể giới hạn sau nếu không muốn cho phép.

## Testing strategy

Repo hiện không có test suite tự động (100% JS block chạy client-side, theo CLAUDE.md). Với plugin (code backend đầu tiên của dự án):
- Phần thuần logic (build config, ký/verify JWT, parse `documentId` từ `key`) test được bằng Jest tiêu chuẩn của Nocobase với model mock.
- Phần còn lại (tích hợp thật với Document Server) kiểm tra thủ công theo checklist end-to-end: Generate file → bấm "Sửa trực tuyến" → xác nhận editor mở được → sửa nội dung → đóng → xác nhận version mới xuất hiện với `versionNumber`/`previousVersionId`/`rootDocumentId` đúng → xác nhận bản cũ vẫn tải được qua "Xem lịch sử phiên bản".

## Ngoài phạm vi (deferred)

- Mở rộng sang toàn bộ Document Library (không chỉ file từ Task Template Generate).
- Table-loop variable rendering và number-to-Vietnamese-words formatting trong Generate flow (đã deferred riêng, không liên quan tính năng này).
- Giới hạn/khoá đồng chỉnh sửa real-time giữa nhiều luật sư (mặc định cho phép, có thể khoá sau nếu phát sinh nhu cầu).
