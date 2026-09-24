const { React } = ctx;
const { useState, useEffect, useCallback, useMemo, useRef } = React;
const { Spin, message, Modal, Empty, Steps, Tag, Space, Input } = ctx.antd;

// ==================== CONFIGURATION ====================
const TEMPLATE_COLLECTION_NAME = "template";
const TEMPLATE_FILE_FIELD = "fileAttachment";
const SERVICE_TASK_RELATION = "templateId";
const TASK_NAME_FIELD = "templateName";
const DEFAULT_CURRENCY_CODE = "VND";
const CURRENCY_RESOURCE_CANDIDATES = [
  "currencies:list",
  "currency:list",
  "Currency:list",
];
const EXCHANGE_RATE_RESOURCE_CANDIDATES = [
  "exchangeRates:list",
  "exchangeRate:list",
  "ExchangeRates:list",
];
// "Create New Case" popup — only offered once the contract has reached
// execution (see isExecutionStatus in ContractDocxGenerator below).
const POPUP_UID_CASE = "eqy8o1tcc1v";
// ==========================================================

const RECORD_ID = ctx.record?.id;

// ==================== HELPER: CURRENCY CONVERSION ====================
const extractCurrencyId = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return extractCurrencyId(value[0]);
  if (typeof value === "object")
    return extractCurrencyId(value.id || value.value || value.key);
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};
const extractCurrencyCode = (value) => {
  if (!value) return "";
  if (Array.isArray(value)) return extractCurrencyCode(value[0]);
  if (typeof value === "object")
    return extractCurrencyCode(
      value.code ||
        value.currencyCode ||
        value.isoCode ||
        value.title ||
        value.label ||
        value.name,
    );
  const match = String(value).trim().toUpperCase().match(/\b[A-Z]{3}\b/);
  return match ? match[0] : "";
};
const getCurrencyCode = (currency) =>
  String(
    currency?.code || currency?.currencyCode || currency?.name || DEFAULT_CURRENCY_CODE,
  ).toUpperCase();
const getRecordCurrencyId = (record) =>
  extractCurrencyId(
    record?.currencyId || record?.currency || record?.currencies,
  );
const findDefaultCurrency = (currencies = []) =>
  currencies.find(
    (c) => c?.isBaseCurrency || getCurrencyCode(c) === DEFAULT_CURRENCY_CODE,
  ) || null;

async function fetchAllFromCandidates(urls = [], params = {}) {
  for (const url of urls) {
    try {
      const res = await ctx.api.request({
        url,
        params: { pageSize: 500, page: 1, ...params },
      });
      const rows = res?.data?.data || [];
      if (Array.isArray(rows) && rows.length) return rows;
    } catch {}
  }
  return [];
}

const isUsableExchangeRateStatus = (status) => {
  const value = String(status || "").trim().toLowerCase();
  if (!value) return true;
  return ![
    "inactive",
    "disabled",
    "archived",
    "cancelled",
    "canceled",
    "draft",
  ].includes(value);
};
const rateSideCurrencyId = (rate, side) =>
  extractCurrencyId(rate?.[`${side}CurrencyId`] || rate?.[`${side}Currency`]);
const rateSideCurrencyCode = (rate, side) =>
  extractCurrencyCode(rate?.[`${side}Currency`] || rate?.[`${side}CurrencyCode`]);
const rateMatchesSide = (rate, side, currencyId, currencyCode) => {
  const rId = rateSideCurrencyId(rate, side);
  if (rId && currencyId) return rId === currencyId;
  const rCode = rateSideCurrencyCode(rate, side);
  return !!rCode && !!currencyCode && rCode === currencyCode;
};
// Finds the most recent usable exchange rate converting fromCurrency ->
// toCurrency, trying the inverse pair (1/rate) if no direct rate exists.
function findConversionRate(
  rates,
  fromCurrencyId,
  fromCurrencyCode,
  toCurrencyId,
  toCurrencyCode,
) {
  const usable = (rates || []).filter(
    (r) => isUsableExchangeRateStatus(r.status) && parseFloat(r.rate) > 0,
  );
  const direct = usable
    .filter(
      (r) =>
        rateMatchesSide(r, "from", fromCurrencyId, fromCurrencyCode) &&
        rateMatchesSide(r, "to", toCurrencyId, toCurrencyCode),
    )
    .sort(
      (a, b) => new Date(b.effectiveDate || 0) - new Date(a.effectiveDate || 0),
    )[0];
  if (direct) return parseFloat(direct.rate);
  const inverse = usable
    .filter(
      (r) =>
        rateMatchesSide(r, "from", toCurrencyId, toCurrencyCode) &&
        rateMatchesSide(r, "to", fromCurrencyId, fromCurrencyCode),
    )
    .sort(
      (a, b) => new Date(b.effectiveDate || 0) - new Date(a.effectiveDate || 0),
    )[0];
  if (inverse && parseFloat(inverse.rate) > 0) return 1 / parseFloat(inverse.rate);
  return null;
}

// ==================== HELPER: NUMBER TO TEXT (VN) ====================
function readVietnameseNumber(n) {
  if (n === 0) return "không đồng";
  const units = ["", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ"];
  const digits = [
    "không",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];

  function readBlock3(b, isFirst) {
    let res = "";
    let h = Math.floor(b / 100);
    let t = Math.floor((b % 100) / 10);
    let d = Math.floor(b % 10);

    if (h !== 0 || !isFirst) {
      res += digits[h] + " trăm ";
    }

    if (t === 0) {
      if (d !== 0) res += "lẻ " + digits[d] + " ";
    } else if (t === 1) {
      res += "mười ";
      if (d === 1) res += "một ";
      else if (d === 5) res += "lăm ";
      else if (d !== 0) res += digits[d] + " ";
    } else {
      res += digits[t] + " mươi ";
      if (d === 1) res += "mốt ";
      else if (d === 4) res += "tư ";
      else if (d === 5) res += "lăm ";
      else if (d !== 0) res += digits[d] + " ";
    }
    return res.trim();
  }

  let str = Math.round(n).toString();
  let res = [];
  let partCount = Math.ceil(str.length / 3);
  for (let i = 0; i < partCount; i++) {
    let part = parseInt(
      str.substring(Math.max(0, str.length - 3 * (i + 1)), str.length - 3 * i),
    );
    if (part !== 0 || (i === 0 && partCount === 1)) {
      let blockText = readBlock3(part, i === partCount - 1);
      if (blockText) res.push(blockText + units[i]);
    }
  }
  let finalStr = res.reverse().join(" ").trim() + " đồng";
  // Xóa chữ "không trăm lẻ" ở đầu nếu có do logic block3
  finalStr = finalStr
    .replace(/^không trăm lẻ /g, "")
    .replace(/^không trăm /g, "")
    .trim();
  return finalStr.charAt(0).toUpperCase() + finalStr.slice(1);
}

// ==================== FETCH DATA ====================
async function fetchContract(id) {
  try {
    const res = await ctx.api.request({
      url: `contracts:get`,
      params: {
        filterByTk: id,
        appends: ["customers", "quotations"],
      },
    });
    return res?.data?.data || res?.data || null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function fetchServices(quotationId) {
  if (!quotationId) return [];
  try {
    const res = await ctx.api.request({
      url: "quotationServices:list",
      params: {
        pageSize: 100,
        page: 1,
        filter: JSON.stringify({ quotationId: { $eq: parseInt(quotationId) } }),
      },
    });
    return res?.data?.data || [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function fetchCurrencies() {
  return fetchAllFromCandidates(CURRENCY_RESOURCE_CANDIDATES);
}

async function fetchExchangeRates() {
  return fetchAllFromCandidates(EXCHANGE_RATE_RESOURCE_CANDIDATES, {
    appends: ["fromCurrency", "toCurrency"],
  });
}

async function fetchServiceDetails(serviceIds) {
  if (!serviceIds.length) return {};
  try {
    const res = await ctx.api.request({
      url: "services:list",
      params: {
        pageSize: 500,
        page: 1,
        filter: JSON.stringify({ id: { $in: serviceIds } }),
        appends: [SERVICE_TASK_RELATION],
      },
    });
    const map = {};
    (res?.data?.data || []).forEach((s) => {
      map[s.id] = s;
    });
    return map;
  } catch {
    return {};
  }
}

// Helper to get the next fileIndex for a folder or record (synchronized with folders)
async function getNextFileIndex(folderId, collectionName, recordId) {
  try {
    const docFilter = folderId
      ? { folderId: { $eq: folderId } }
      : { collectionName: { $eq: collectionName }, recordId: { $eq: parseInt(recordId) } };

    const folderFilter = folderId
      ? { parentId: { $eq: folderId } }
      : { contractId: { $eq: parseInt(recordId) } }; // In Contract mode, root folders have contractId

    const [dRes, fRes] = await Promise.all([
      ctx.api.request({
        url: "documents:list",
        params: {
          pageSize: 1,
          filter: JSON.stringify(docFilter),
          sort: ["-fileIndex"],
        },
      }),
      ctx.api.request({
        url: "folders:list",
        params: {
          pageSize: 1,
          filter: JSON.stringify(folderFilter),
          sort: ["-folderIndex"],
        },
      }),
    ]);

    const lastDoc = dRes?.data?.data?.[0]?.fileIndex || 0;
    const lastFolder = fRes?.data?.data?.[0]?.folderIndex || 0;

    return Math.max(lastDoc, lastFolder) + 1;
  } catch (e) {
    console.warn("Failed to get next fileIndex:", e);
    return 1;
  }
}

// Same de-dup convention used across the Document module (Library.js,
// CaseDocument.js, TaskDetailView.js, QuotationDocxGenerator.js): on a
// case-insensitive title collision, append " (1)", " (2)", ... — never
// silently overwrite.
const getUniqueFileName = (fileName, existingNames) => {
  const raw = String(fileName || "").trim();
  if (!raw) return raw;
  const taken = new Set(
    Array.from(existingNames || [], (n) => String(n || "").trim().toLowerCase()),
  );
  if (!taken.has(raw.toLowerCase())) return raw;
  const dotIndex = raw.lastIndexOf(".");
  const base = dotIndex > 0 ? raw.slice(0, dotIndex) : raw;
  const ext = dotIndex > 0 ? raw.slice(dotIndex) : "";
  let counter = 1;
  let candidate = `${base} (${counter})${ext}`;
  while (taken.has(candidate.toLowerCase())) {
    counter += 1;
    candidate = `${base} (${counter})${ext}`;
  }
  return candidate;
};

// Titles already used by this contract's saved documents — same
// folderId-first / collectionName+recordId-fallback scoping as
// getNextFileIndex above, so "duplicate" means the same thing in both
// places.
async function fetchExistingDocumentTitles(folderId, collectionName, recordId) {
  try {
    const docFilter = folderId
      ? { $and: [{ folderId: { $eq: folderId } }, { isDeleted: { $ne: true } }] }
      : {
          $and: [
            { collectionName: { $eq: collectionName } },
            { recordId: { $eq: parseInt(recordId) } },
            { isDeleted: { $ne: true } },
          ],
        };
    const res = await ctx.api.request({
      url: "documents:list",
      params: {
        pageSize: 500,
        page: 1,
        filter: JSON.stringify(docFilter),
        fields: "id,title",
      },
    });
    return (res?.data?.data || []).map((d) => d.title).filter(Boolean);
  } catch (e) {
    console.warn("Failed to fetch existing document titles:", e);
    return [];
  }
}

// ── Shared toolbar button style — hoisted out of ContractDocxGenerator so
// the left-side TutorialGuide button (below) can reuse the exact same look
// as the 4 right-side action buttons instead of the mismatched antd
// Button styling MarkdownTutorialSingleBlock.js used on its own.
const btnStyle = {
  cursor: "pointer",
  fontSize: 13,
  padding: "8px 20px",
  borderRadius: 6,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 600,
  background: "#fff",
  border: "1px solid #1a3a5c",
  color: "#1a3a5c",
  transition: "all 0.15s",
};

// ==================== USER GUIDE (Markdown Tutorial) ====================
// Ported from MarkdownTutorialSingleBlock.js — merged into this file so the
// Contract page shows one toolbar row with the guide on the left and the
// 4 DOCX actions on the right, instead of 2 separately-placed blocks.
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

// Left-side "Hướng dẫn sử dụng" trigger — just the button + its own Modal,
// no wrapping layout div of its own (ContractDocxGenerator's toolbar row
// below owns the left/right positioning).
const TutorialGuide = () => {
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
      "button",
      { onClick: () => setOpen(true), style: btnStyle },
      "Hướng dẫn sử dụng",
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
        { style: { display: "grid", gridTemplateColumns: "240px minmax(0, 1fr)", height: "100%" } },
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

// ==================== STAGE FLOW (contract status stepper) ====================
const ALL_STAGES = [
  { key: 'draft',       label: 'Draft',       description: 'Hợp đồng mới',    requireApproval: false },
  { key: 'negotiation', label: 'Negotiation', description: 'Đàm phán',        requireApproval: false },
  { key: 'pending',     label: 'Pending',     description: 'Xem xét',         requireApproval: true  },
  { key: 'approval',    label: 'Approved',    description: 'Đã xét duyệt',    requireApproval: true  },
  { key: 'rejected',    label: 'Rejected',    description: 'Đã từ chối',      requireApproval: true  },
  { key: 'execution',   label: 'Execution',   description: 'Hiệu lực',        requireApproval: false },
  { key: 'expired',     label: 'Expired',     description: 'Hết hạn',         requireApproval: false },
  { key: 'closed',      label: 'Closed',      description: 'Đã đóng',         requireApproval: false },
];

const STAGE_COLORS = {
  draft:       'purple',
  negotiation: 'blue',
  pending:     'gold',
  approval:    'green',
  rejected:    'red',
  execution:   'green',
  expired:     'orange',
  closed:      'default',
};

// Chuyển trạng thái hợp lệ khi có approval
const TRANSITIONS_WITH_APPROVAL = {
  draft:       ['negotiation', 'closed'],
  negotiation: ['pending', 'closed'],
  pending:     ['approval', 'rejected'],
  approval:    ['execution'],
  rejected:    [],
  execution:   ['expired', 'closed'],
  expired:     ['closed'],
  closed:      [],
};

// Chuyển trạng thái hợp lệ khi không có approval
const TRANSITIONS_NO_APPROVAL = {
  draft:       ['negotiation', 'closed'],
  negotiation: ['execution', 'closed'],
  execution:   ['expired', 'closed'],
  expired:     ['closed'],
  closed:      [],
};

// Block các status này cho đến khi được approval
const BLOCKED_UNTIL_APPROVAL = ['execution'];

// Các status kết thúc (không cho tiến tiếp)
const TERMINAL_KEYS = ['rejected', 'expired', 'closed'];

// Merged from the standalone ProjectStageFlow block into this file so the
// status stepper and the DOCX-generator toolbar share ONE `data` state
// instead of two independent fetches — `record`/`onUpdated` are now props
// from ContractDocxGenerator (its already-fetched `data` + its `loadData`)
// rather than read from ctx.record directly. This is what makes the
// "+ New Case" button's isExecutionStatus gate react instantly the moment
// a stage transition here succeeds, with no polling and no dependency on
// ctx.on/ctx.refresh (neither is reliably available in this block context
// — see the earlier "ctx.on is not a function" runtime error).
const ProjectStageFlow = ({ record, onUpdated }) => {
  const recordId = record?.id;

  const [localStatus,        setLocalStatus]        = useState(record?.status || 'draft');
  const [isRequiredApproval, setIsRequiredApproval] = useState(!!record?.isRequiredApproval);
  const [closeModalOpen,     setCloseModalOpen]      = useState(false);
  const [closeReason,        setCloseReason]         = useState('');
  const [closeError,         setCloseError]          = useState('');
  const [pendingClose,       setPendingClose]        = useState(false);

  // Stay in sync with the parent's `data` — it's the authoritative,
  // freshly-fetched contract record now (re-fetched via onUpdated after
  // every successful transition below), so this bar never goes stale the
  // way relying on a one-time ctx.record snapshot would.
  useEffect(() => {
    setLocalStatus(record?.status || 'draft');
  }, [record?.status]);

  useEffect(() => {
    setIsRequiredApproval(!!record?.isRequiredApproval);
  }, [record?.isRequiredApproval]);

  // Lọc stages theo isRequiredApproval
  const visibleStages = ALL_STAGES.filter(s =>
    isRequiredApproval ? true : !s.requireApproval
  );

  const getStageIndex = (status) => {
    const idx = visibleStages.findIndex(s => s.key === status);
    return idx === -1 ? 0 : idx;
  };

  const displayIndex = getStageIndex(localStatus);
  const isTerminal   = TERMINAL_KEYS.includes(localStatus);

  // Đã qua approval hoặc đang ở các stage sau approval
  const isApproved = localStatus === 'approval' || ['execution', 'expired', 'closed'].includes(localStatus);

  const canTransition = useCallback((targetKey) => {
    if (isTerminal && localStatus !== 'expired') return false;
    // expired vẫn cho chuyển sang closed
    if (localStatus === 'expired' && targetKey !== 'closed') return false;

    // Chỉ block khi isRequiredApproval = true và chưa approved
    if (isRequiredApproval && !isApproved && BLOCKED_UNTIL_APPROVAL.includes(targetKey)) {
      return false;
    }

    const transMap = isRequiredApproval ? TRANSITIONS_WITH_APPROVAL : TRANSITIONS_NO_APPROVAL;
    const allowed  = transMap[localStatus] || [];
    return allowed.includes(targetKey);
  }, [isTerminal, isRequiredApproval, isApproved, localStatus]);

  const updateStatus = useCallback(async (newStatus, extraData = {}) => {
    try {
      const now     = new Date().toISOString();
      const payload = { status: newStatus, ...extraData };

      // Ghi nhận thời điểm hiệu lực
      if (newStatus === 'execution') payload.executedAt = now;

      await ctx.api.request({
        url:    `contracts:update?filterByTk=${recordId}`,
        method: 'POST',
        data:   payload,
      });

      setLocalStatus(newStatus);
      message.success(`Đã cập nhật: ${ALL_STAGES.find(s => s.key === newStatus)?.label}`);
      // Refetch the shared contract record instead of the previous
      // ctx.refresh() call — that API isn't confirmed available in this
      // block context, and this also keeps the DOCX-generator half's
      // `data` (and isExecutionStatus) in sync in the same round trip.
      if (onUpdated) await onUpdated();
    } catch {
      message.error('Cập nhật thất bại');
    }
  }, [recordId, onUpdated]);

  const handleStepClick = useCallback((targetKey) => {
    if (!canTransition(targetKey)) return;
    if (!recordId) { message.warning('Không tìm thấy record ID'); return; }

    // Rejected → dùng rejectionReason (modal)
    if (targetKey === 'rejected') {
      setCloseReason('');
      setCloseError('');
      setCloseModalOpen('rejected');
      return;
    }

    // Closed → yêu cầu nhập lý do đóng
    if (targetKey === 'closed') {
      setCloseReason('');
      setCloseError('');
      setCloseModalOpen('closed');
      return;
    }

    updateStatus(targetKey);
  }, [canTransition, recordId, updateStatus]);

  const handleConfirmModal = useCallback(async () => {
    if (!closeReason.trim()) {
      setCloseError(
        closeModalOpen === 'rejected'
          ? 'Vui lòng nhập lý do từ chối'
          : 'Vui lòng nhập lý do đóng hợp đồng'
      );
      return;
    }
    setPendingClose(true);
    const extraField = closeModalOpen === 'rejected'
      ? { rejectionReason: closeReason.trim() }
      : { closeReason:     closeReason.trim() };
    await updateStatus(closeModalOpen, extraField);
    setPendingClose(false);
    setCloseModalOpen(false);
    setCloseReason('');
  }, [closeReason, closeModalOpen, updateStatus]);

  // Tính stepStatus cho từng node
  const getStepStatus = (stage, index) => {
    if (localStatus === 'closed')    return stage.key === 'closed'    ? 'error'   : index < displayIndex ? 'finish' : 'wait';
    if (localStatus === 'rejected')  return stage.key === 'rejected'  ? 'error'   : index < displayIndex ? 'finish' : 'wait';
    if (localStatus === 'expired')   return stage.key === 'expired'   ? 'process' : index < displayIndex ? 'finish' : 'wait';
    if (index < displayIndex)  return 'finish';
    if (index === displayIndex) return 'process';
    return 'wait';
  };

  const stepsItems = visibleStages.map((stage, index) => {
    const isCurrentStage = stage.key === localStatus;
    const canClick       = canTransition(stage.key);

    return {
      title: (
        <Space size={4}>
          <span style={{ fontWeight: isCurrentStage ? 600 : 400 }}>
            {stage.label}
          </span>
          {isCurrentStage && (
            <Tag color={STAGE_COLORS[localStatus]} style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
              Hiện tại
            </Tag>
          )}
        </Space>
      ),
      status:  getStepStatus(stage, index),
      onClick: canClick ? () => handleStepClick(stage.key) : undefined,
      style:   canClick ? { cursor: 'pointer' } : { cursor: 'default' },
    };
  });

  const overallStatus =
    localStatus === 'closed'   ? 'error'  :
    localStatus === 'rejected' ? 'error'  :
    localStatus === 'execution'? 'finish' : 'process';

  const modalConfig = {
    rejected: { title: 'Từ chối hợp đồng',  placeholder: 'Nhập lý do từ chối...',          okText: 'Xác nhận từ chối' },
    closed:   { title: 'Đóng hợp đồng',     placeholder: 'Nhập lý do đóng hợp đồng...',   okText: 'Xác nhận đóng'   },
  };

  return (
    <div style={{ padding: '12px 16px 4px' }}>

      <Steps
        size="small"
        current={displayIndex}
        status={overallStatus}
        items={stepsItems}
      />

      {/* Modal từ chối / đóng hợp đồng */}
      <Modal
        title={modalConfig[closeModalOpen]?.title}
        open={!!closeModalOpen}
        onOk={handleConfirmModal}
        onCancel={() => { setCloseModalOpen(false); setCloseError(''); }}
        okText={modalConfig[closeModalOpen]?.okText}
        cancelText="Huỷ"
        okButtonProps={{ danger: true, loading: pendingClose }}
        destroyOnClose
      >
        <p style={{ marginBottom: 8, fontSize: 13, color: '#595959' }}>
          {closeModalOpen === 'rejected'
            ? 'Vui lòng nhập lý do từ chối để tiếp tục.'
            : 'Vui lòng nhập lý do đóng hợp đồng để tiếp tục.'}
        </p>
        <Input.TextArea
          rows={4}
          placeholder={modalConfig[closeModalOpen]?.placeholder}
          value={closeReason}
          onChange={e => { setCloseReason(e.target.value); setCloseError(''); }}
          status={closeError ? 'error' : ''}
        />
        {closeError && (
          <div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 4 }}>{closeError}</div>
        )}
      </Modal>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
const ContractDocxGenerator = () => {
  const [data, setData] = useState(null);
  const [services, setServices] = useState([]);
  const [svcDetails, setSvcDetails] = useState({});
  const [currencies, setCurrencies] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Track separate loading states
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Preview States
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [previewAttId, setPreviewAttId] = useState(null);

  // Version-note confirm — shown only when Save to Documents detects the
  // generated title already exists (see handleSaveDoc). Bridges the async
  // save flow to a user decision via a Promise: promptVersionNote() opens
  // the modal and suspends until the user confirms (resolves with their
  // trimmed note) or cancels (resolves with null, aborting the save).
  const [versionNoteModalOpen, setVersionNoteModalOpen] = useState(false);
  const [versionNoteValue, setVersionNoteValue] = useState("");
  const [versionNoteError, setVersionNoteError] = useState("");
  const versionNoteResolverRef = useRef(null);

  const promptVersionNote = () =>
    new Promise((resolve) => {
      versionNoteResolverRef.current = resolve;
      setVersionNoteValue("");
      setVersionNoteError("");
      setVersionNoteModalOpen(true);
    });

  const handleConfirmVersionNote = () => {
    const trimmed = versionNoteValue.trim();
    if (!trimmed) {
      setVersionNoteError("Vui lòng nhập tóm tắt nội dung điều chỉnh");
      return;
    }
    setVersionNoteModalOpen(false);
    versionNoteResolverRef.current?.(trimmed);
    versionNoteResolverRef.current = null;
  };

  const handleCancelVersionNote = () => {
    setVersionNoteModalOpen(false);
    versionNoteResolverRef.current?.(null);
    versionNoteResolverRef.current = null;
  };

  // 1. Load Data
  const loadData = useCallback(async () => {
    if (!RECORD_ID) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [contractData, currs, rates] = await Promise.all([
        fetchContract(RECORD_ID),
        fetchCurrencies(),
        fetchExchangeRates(),
      ]);
      setData(contractData);
      setCurrencies(currs);
      setExchangeRates(rates);

      if (contractData?.quotationId) {
        const svcs = await fetchServices(contractData.quotationId);
        setServices(svcs);
        if (svcs.length) {
          const ids = [
            ...new Set(svcs.map((s) => s.serviceId).filter(Boolean)),
          ];
          const details = await fetchServiceDetails(ids);
          setSvcDetails(details);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Shared Error Handling
  const showErrorModal = (error) => {
    console.error("Error details (Raw):", error);

    let errorMsg = error.message || "Unknown error";
    let errorDetails = "";

    if (error.properties && error.properties.errors) {
      errorDetails = error.properties.errors
        .map((e) => {
          return e.properties
            ? e.properties.explanation || e.message
            : e.message;
        })
        .join("\n\n");
    } else {
      try {
        const rawObj = Object.getOwnPropertyNames(error).reduce((acc, key) => {
          acc[key] = error[key];
          return acc;
        }, {});
        errorDetails = JSON.stringify(rawObj, null, 2);
      } catch (e) {}
    }

    Modal.error({
      title: "Document Generation Error Analysis",
      content: React.createElement(
        "div",
        {
          style: {
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: "500px",
            overflowY: "auto",
            fontSize: "13px",
          },
        },
        React.createElement("strong", { style: { color: "red" } }, errorMsg),
        React.createElement("br"),
        React.createElement("br"),
        errorDetails,
      ),
      width: 700,
    });
  };

  // 3. Core Logic: Generate Blob
  const buildDocxBlob = async () => {
    if (!data) throw new Error("Contract data is missing.");

    // Load External Libs
    const PizZipModule = await ctx.importAsync("https://esm.sh/pizzip@3.1.4");
    const PizZip = PizZipModule.default || PizZipModule;

    const DocxModule = await ctx.importAsync(
      "https://esm.sh/docxtemplater@3.37.11",
    );
    const Docxtemplater = DocxModule.default || DocxModule;

    if (!PizZip || !Docxtemplater) {
      throw new Error("Failed to load document processing libraries.");
    }

    // Map Variables
    let subTotalAmount = 0,
      vatAmount = 0,
      totalAmount = 0;

    // Every amount in the generated document is denominated in VND (the
    // template hardcodes "Phí dịch vụ (VND)"), so a line service quoted in
    // another currency (USD, SGD, ...) must be converted before it's summed
    // into the document totals — otherwise a USD subtotal would be printed
    // (and added into the VND grand total) as if it were already VND.
    const vndCurrency = findDefaultCurrency(currencies);
    const vndCurrencyId = extractCurrencyId(vndCurrency);
    const missingRateServiceNames = [];

    const mappedServices = services.map((s, index) => {
      const detail = svcDetails[s.serviceId] || {};
      const name = detail.serviceName || `Service #${s.serviceId}`;
      const qty = Number(s.quantity) || 1;
      const price = Number(s.basePrice) || 0;
      const vatPct = Number(s.vat) || 0;
      const sLineRaw = price * qty;
      const vLineRaw = (sLineRaw * vatPct) / 100;

      const lineCurrencyId = getRecordCurrencyId(s);
      const lineCurrencyCode = extractCurrencyCode(s.currency || s.currencies);
      let sLine = sLineRaw;
      let vLine = vLineRaw;
      if (
        lineCurrencyId &&
        vndCurrencyId &&
        lineCurrencyId !== vndCurrencyId
      ) {
        const rate = findConversionRate(
          exchangeRates,
          lineCurrencyId,
          lineCurrencyCode,
          vndCurrencyId,
          DEFAULT_CURRENCY_CODE,
        );
        if (rate) {
          sLine = sLineRaw * rate;
          vLine = vLineRaw * rate;
        } else {
          missingRateServiceNames.push(name);
        }
      }

      const rawTasks =
        detail[SERVICE_TASK_RELATION] || s[SERVICE_TASK_RELATION];
      const tasksArray = rawTasks
        ? Array.isArray(rawTasks)
          ? rawTasks
          : [rawTasks]
        : [];

      // Cách 1: Xuất ra 1 đoạn text dài có ngắt dòng (dễ bị lệch lề trong Word)
      let tasksText = "";
      if (tasksArray.length > 0) {
        tasksText = tasksArray
          .map((t) => `- ${t[TASK_NAME_FIELD] || t.title || t.name || "Task"}`)
          .join("\n");
      } else {
        tasksText = "- (No specific tasks configured)";
      }

      // Cách 2: Xuất ra 1 mảng (Array) để lặp trong Word (chuẩn xác format nhất)
      const mappedTasks =
        tasksArray.length > 0
          ? tasksArray.map((t) => ({
              task_name: t[TASK_NAME_FIELD] || t.title || t.name || "Task",
              description:
                t.description || t.taskDescription || t.note || "",
            }))
          : [
              {
                task_name: "(No specific tasks configured)",
                description: "",
              },
            ];

      subTotalAmount += sLine;
      vatAmount += vLine;
      totalAmount += sLine + vLine;

      return {
        service_stt: index + 1,
        service_name: name,
        task_list: tasksText, // Biến cũ (string)
        tasks: mappedTasks, // Biến mới (array)
        sub_total: Math.round(sLine).toLocaleString("en-US"),
        service_vat: Math.round(vLine).toLocaleString("en-US"),
      };
    });

    if (missingRateServiceNames.length) {
      message.warning(
        `Thiếu tỷ giá quy đổi sang VND cho dịch vụ: ${missingRateServiceNames.join(", ")} — số tiền của dòng này được giữ nguyên theo tiền tệ gốc trong file.`,
      );
    }

    subTotalAmount = Math.round(subTotalAmount);
    vatAmount = Math.round(vatAmount);
    totalAmount = Math.round(totalAmount);

    const currentDate = new Date();
    const dd = String(currentDate.getDate()).padStart(2, "0");
    const mm = String(currentDate.getMonth() + 1).padStart(2, "0");
    const yyyy = currentDate.getFullYear();

    const targetCustomer = data.customers || data.customer || {};
    const actualCustomer = Array.isArray(targetCustomer) ? targetCustomer[0] : targetCustomer;

    // Tóm tắt tên khách hàng (Ưu tiên nhập thủ công, không tách ký tự)
    const finalShortName =
      actualCustomer.shortName ||
      actualCustomer.fullName ||
      actualCustomer.customerName ||
      actualCustomer.companyLegalName ||
      actualCustomer.companyName ||
      "Customer";

    // Tạo document_title
    const sttPart = data.contractCode || String(data.id);
    const documentTitle = `${sttPart} / Contract / CBI - ${finalShortName}`;

    const quotation = data.quotations || data.quotation || {};

    // Tính toán đợt thanh toán
    const totalAmountPartOne = totalAmount * 0.7;
    const totalAmountPartTwo = totalAmount - totalAmountPartOne;

    const templateData = {
      document_title: documentTitle,
      // Contract details
      contract_code: sttPart,
      language: data.language || " ____ ",

      // Generic Customer fields
      customer_name:
        actualCustomer.companyLegalName ||
        actualCustomer.fullName ||
        actualCustomer.customerName ||
        actualCustomer.companyName ||
        " ____ ",
      customer_short_name: finalShortName || " ____ ",
      address: actualCustomer.address || " ____ ",
      phone: actualCustomer.phone || " ____ ",

      // Generic ID fields
      customer_id_title: actualCustomer.customerType === "company" ? "Mã số doanh nghiệp" : "Số CCCD/CMND",
      customer_id_number: actualCustomer.customerType === "company"
        ? actualCustomer.taxCode || " ____ "
        : actualCustomer.identityNumber || actualCustomer.idNumber || " ____ ",

      // Company specific
      representative_title: actualCustomer.customerType === "company" ? "Người đại diện theo pháp luật" : "",
      coporate_representative: actualCustomer.customerType === "company"
        ? actualCustomer.corporateRepresentative || " ____ "
        : "",

      // Individual specific
      customer_issued_place: actualCustomer.customerType === "company"
        ? ""
        : actualCustomer.customerIdIssuedPlace || " ____ ",
      customer_issued_date:
        actualCustomer.customerType !== "company" && actualCustomer.customerIdIssuedDate
          ? new Date(actualCustomer.customerIdIssuedDate).toLocaleDateString("en-GB")
          : actualCustomer.customerType === "company" ? "" : " ____ ",

      // Quotation description
      quotation_description:
        quotation.description || quotation.snapshotOverview || " ____ ",

      // Date
      date_day: dd,
      date_month: mm,
      date_year: yyyy,

      // Services Array
      services: mappedServices,

      // Totals
      sub_totalAmount: subTotalAmount.toLocaleString("en-US"),
      vatAmount: vatAmount.toLocaleString("en-US"),
      total_with_vat: totalAmount.toLocaleString("en-US"),

      // Payment parts
      total_amount_part_one: totalAmountPartOne.toLocaleString("en-US"),
      total_amount_convert_text_part_one:
        readVietnameseNumber(totalAmountPartOne),
      total_amount_part_two: totalAmountPartTwo.toLocaleString("en-US"),
      total_amount_convert_text_part_two:
        readVietnameseNumber(totalAmountPartTwo),
    };

    // Fetch Template Blob
    if (!data.templateId) {
      throw new Error(
        "No template assigned to this contract. Please update the contract record first.",
      );
    }

    const tmplRes = await ctx.api.request({
      url: `${TEMPLATE_COLLECTION_NAME}:get`,
      params: {
        filterByTk: data.templateId,
        appends: [TEMPLATE_FILE_FIELD],
      },
    });

    const selectedTmpl = tmplRes?.data?.data;
    if (!selectedTmpl) {
      throw new Error("Assigned template could not be found in the database!");
    }

    const attachmentObj = selectedTmpl[TEMPLATE_FILE_FIELD];
    const templateUrl = Array.isArray(attachmentObj)
      ? attachmentObj[0]?.url
      : attachmentObj?.url;

    if (!templateUrl)
      throw new Error(
        `Template has no attached file ('${TEMPLATE_FILE_FIELD}')!`,
      );

    const response = await ctx.api.request({
      url: templateUrl,
      method: "GET",
      responseType: "arraybuffer",
      baseURL: "/",
    });
    const arrayBuffer = response.data;

    // Render DOCX
    const zip = new PizZip(arrayBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{{", end: "}}" },
    });

    doc.render(templateData);

    const generatedBlob = doc.getZip().generate({
      type: "blob",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const fileName = `Contract_${templateData.contract_code}_${Date.now()}.docx`;

    return { generatedBlob, fileName };
  };

  // 4. Action: Preview (via MS Office Online Plugin Logic)
  const handlePreview = async () => {
    setGenerating(true);
    try {
      const { generatedBlob, fileName } = await buildDocxBlob();

      // Upload temporary file to attachments so we get a public URL for MS Office Preview
      const formData = new window.FormData();
      formData.append("file", generatedBlob, fileName);
      const uploadRes = await ctx.api.request({
        url: "attachments:create",
        method: "POST",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      let attUrl = uploadRes?.data?.data?.url;
      if (!attUrl)
        throw new Error("Failed to upload temporary file for preview.");

      // Ensure URL is absolute for Microsoft Viewer to parse
      let fullUrl = attUrl;
      if (fullUrl.startsWith("/")) {
        fullUrl = window.location.origin + fullUrl;
      }

      // Save state to trigger Modal
      setPreviewBlob(generatedBlob);
      setPreviewUrl(fullUrl);
      setPreviewFileName(fileName);
      setPreviewAttId(uploadRes?.data?.data?.id); // Keep ID so if they save, we just link it
    } catch (error) {
      showErrorModal(error);
    } finally {
      setGenerating(false);
    }
  };

  // "+ New Case" — opens the Create-Case dialog view (POPUP_UID_CASE).
  const handleClick = async () => {
    const targetUid = POPUP_UID_CASE;
    if (!targetUid) {
      message.warning(`Chưa cấu hình Popup UID`);
      return;
    }

    await ctx.openView(targetUid, {
      mode: "dialog",
      size: "large",
      navigation: false,
    });
  };

  // 5. Action: Save to Documents
  const handleSaveDoc = async () => {
    setSaving(true);
    try {
      let attId = previewAttId;
      let fileName = previewFileName;

      // If we haven't previewed/uploaded yet, do it now
      if (!attId) {
        const { generatedBlob, fileName: genName } = await buildDocxBlob();
        fileName = genName;
        const formData = new window.FormData();
        formData.append("file", generatedBlob, fileName);

        const uploadRes = await ctx.api.request({
          url: "attachments:create",
          method: "POST",
          data: formData,
          headers: { "Content-Type": "multipart/form-data" },
        });

        attId = uploadRes?.data?.data?.id;
        if (!attId) throw new Error("Failed to upload the generated file.");
      }

      // Fetch Folder ID, User & Save to Documents
      let targetFolderId = null;
      try {
        const folderRes = await ctx.api.request({
          url: "folders:list",
          params: {
            filter: JSON.stringify({ contractId: { $eq: parseInt(RECORD_ID) } }),
            pageSize: 1
          }
        });
        targetFolderId = folderRes?.data?.data?.[0]?.id || null;
      } catch (fErr) {
        console.warn("Could not find contract folder:", fErr);
      }

      let currentUser = null;
      try {
        const authRes = await ctx.api.request({
          url: "auth:check",
          method: "GET",
        });
        currentUser = authRes?.data?.data || authRes?.data;
      } catch (e) {
        console.warn("Failed to retrieve Current User", e);
      }

      // Fetch Fresh Data for Title
      let freshData = data;
      try {
        const freshRes = await ctx.api.request({
          url: `contracts:get`,
          params: {
            filterByTk: RECORD_ID,
            appends: ["customers", "quotations"],
          },
        });
        freshData = freshRes?.data?.data || freshRes?.data || data;
      } catch (e) {
        console.warn("Failed to fetch fresh contract data for title:", e);
      }

      // Tổng hợp tiêu đề theo cấu trúc: STT + Month + Year / Loại VB / CBI - Tên KH
      const sttPart = freshData.contractCode || String(RECORD_ID);
      const docTypePart = "Contract";
      const internalCo = "CBI";
      const rawCustomer = freshData.customers || freshData.customer || {};
      const targetCustomer = Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer;

      const customerShortName =
        targetCustomer?.shortName ||
        targetCustomer?.customerName ||
        targetCustomer?.companyLegalName ||
        "Customer";
      const rawDocumentTitle = `${sttPart} / ${docTypePart} / ${internalCo} - ${customerShortName}`;
      // Re-running "Save to Documents" on the same contract regenerates the
      // exact same title every time — without this check, that would
      // silently create an indistinguishable duplicate document instead of
      // a new version.
      const existingTitles = await fetchExistingDocumentTitles(
        targetFolderId,
        "Contract",
        RECORD_ID,
      );
      const isDuplicateTitle = existingTitles.some(
        (t) => String(t).trim().toLowerCase() === rawDocumentTitle.trim().toLowerCase(),
      );

      // A duplicate title means this contract already has a saved document
      // under the exact same name — ask the user to describe what changed
      // before silently minting a new version, so the version history
      // stays meaningful instead of just "(1)", "(2)"...
      let versionChangeNote = "";
      if (isDuplicateTitle) {
        const enteredNote = await promptVersionNote();
        if (enteredNote === null) {
          setSaving(false);
          return;
        }
        versionChangeNote = enteredNote;
      }

      const documentTitle = getUniqueFileName(rawDocumentTitle, existingTitles);
      const nextFileIndex = await getNextFileIndex(targetFolderId, "Contract", RECORD_ID);
      const autoNote = `Auto-generated from Template by ${currentUser?.nickname || currentUser?.username || "System"} at ${new Date().toLocaleTimeString("en-GB")} on ${new Date().toLocaleDateString("en-GB")}`;

      await ctx.api.request({
        url: "contracts/" + RECORD_ID + "/documents:create",
        method: "POST",
        data: {
          collectionName: "Contract",
          recordId: parseInt(RECORD_ID),
          documentType: docTypePart,
          folderId: targetFolderId,
          title: documentTitle,
          fileIndex: nextFileIndex,
          note: autoNote,
          // "Tóm tắt nội dung" (documents.description) — what the user
          // entered in the version-note prompt above when this save
          // collided with an existing title. Empty on a first-time save.
          description: versionChangeNote || undefined,
          fileAttachment: { id: attId },
          createdById: currentUser?.id,
          updatedById: currentUser?.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

      message.success("Document generated and saved successfully!");

      // Close preview if open
      setPreviewUrl(null);
      setPreviewAttId(null);
      setPreviewBlob(null);
    } catch (error) {
      showErrorModal(error);
    } finally {
      setSaving(false);
    }
  };

  const resetPreview = () => {
    setPreviewUrl(null);
    setPreviewAttId(null);
    setPreviewBlob(null);
  };

  if (!RECORD_ID)
    return React.createElement(
      "div",
      { style: { padding: 16 } },
      "Record ID not found.",
    );
  if (loading)
    return React.createElement(
      "div",
      { style: { padding: 16, textAlign: "center" } },
      React.createElement(Spin),
    );
  if (!data)
    return React.createElement(
      "div",
      { style: { padding: 16 } },
      "Failed to load contract data.",
    );

  // "+ New Case" only makes sense once the contract itself has actually
  // gone into execution — offering it earlier (draft/pending/etc.) would
  // let a case get created against a contract that might still change.
  const isExecutionStatus =
    String(data?.status || "").trim().toLowerCase() === "execution";
  // Preview/Save both call buildDocxBlob(), which throws immediately if
  // data.templateId is missing — hide the buttons instead of letting the
  // user hit that error modal on click.
  const hasTemplate = !!data?.templateId;

  const btnPreview = Object.assign({}, btnStyle, {
    opacity: generating ? 0.7 : 1,
    cursor: generating ? "not-allowed" : "pointer",
  });

  const btnSave = Object.assign({}, btnStyle, {
    background: saving ? "#8c8c8c" : "#1a3a5c",
    color: "#fff",
    border: "none",
    opacity: saving ? 0.7 : 1,
    cursor: saving ? "not-allowed" : "pointer",
  });

  return React.createElement(
    "div",
    null,
    // ==================== STAGE FLOW — full-width status stepper on top ====================
    React.createElement(
      "div",
      { style: { borderBottom: "1px solid #f0f0f0" } },
      React.createElement(ProjectStageFlow, { record: data, onUpdated: loadData }),
    ),
    // ==================== TOOLBAR — guide on the left, 4 actions on the right ====================
    React.createElement(
      "div",
      {
        style: {
          padding: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        },
      },
      React.createElement(TutorialGuide, null),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            gap: "10px",
            alignItems: "center",
            justifyContent: "flex-end",
            flexWrap: "wrap",
          },
        },
        hasTemplate &&
          React.createElement(
            "button",
            {
              onClick: handlePreview,
              disabled: generating || saving,
              style: btnPreview,
            },
            generating ? "Generating..." : "Preview Contract",
          ),
        hasTemplate &&
          React.createElement(
            "button",
            {
              onClick: handleSaveDoc,
              disabled: generating || saving,
              style: btnSave,
            },
            saving ? "Saving..." : "Save to Documents",
          ),
        isExecutionStatus &&
          React.createElement(
            "button",
            {
              onClick: handleClick,
              disabled: generating || saving,
              style: btnStyle,
            },
            "+ New Case",
          ),
        // React.createElement(
        //   "button",
        //   {
        //     onClick: loadData,
        //     disabled: generating || saving,
        //     style: btnStyle,
        //   },
        //   "Refresh",
        // ),
      ),
    ),

    // ==================== MODAL PREVIEW ====================
    React.createElement(
      Modal,
      {
        title: "Preview Contract Document (Microsoft Office Online)",
        open: !!previewUrl,
        onCancel: resetPreview,
        width: "85%",
        centered: true,
        footer: [
          React.createElement(
            "button",
            {
              key: "close",
              onClick: resetPreview,
              style: Object.assign({}, btnStyle, { marginRight: 8 }),
            },
            "Close",
          ),
          React.createElement(
            "button",
            {
              key: "download",
              onClick: () => {
                const url = URL.createObjectURL(previewBlob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "Preview_" + previewFileName;
                a.click();
                URL.revokeObjectURL(url);
              },
              style: Object.assign({}, btnStyle, {
                background: "#e6f7ff",
                color: "#096dd9",
                borderColor: "#91d5ff",
                marginRight: 8,
              }),
            },
            "Download DOCX",
          ),
          React.createElement(
            "button",
            {
              key: "save",
              onClick: handleSaveDoc,
              disabled: saving,
              style: btnSave,
            },
            saving ? "Saving..." : "Save to System",
          ),
        ],
        bodyStyle: { padding: 0, height: "70vh" },
      },
      previewUrl
        ? React.createElement("iframe", {
            src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewUrl)}`,
            width: "100%",
            height: "100%",
            frameBorder: "0",
          })
        : null,
    ),

    // ==================== MODAL: VERSION CHANGE NOTE ====================
    React.createElement(
      Modal,
      {
        title: "Tài liệu đã tồn tại — nhập tóm tắt điều chỉnh",
        open: versionNoteModalOpen,
        onOk: handleConfirmVersionNote,
        onCancel: handleCancelVersionNote,
        okText: "Xác nhận lưu phiên bản mới",
        cancelText: "Huỷ",
        destroyOnClose: true,
      },
      React.createElement(
        "p",
        { style: { marginBottom: 8, fontSize: 13, color: "#595959" } },
        "Tài liệu này đã tồn tại trong hệ thống. Vui lòng nhập tóm tắt nội dung điều chỉnh để lưu thành phiên bản mới.",
      ),
      React.createElement(Input.TextArea, {
        rows: 4,
        placeholder: "Ví dụ: Cập nhật lại điều khoản thanh toán, sửa thông tin khách hàng...",
        value: versionNoteValue,
        onChange: (e) => {
          setVersionNoteValue(e.target.value);
          setVersionNoteError("");
        },
        status: versionNoteError ? "error" : "",
      }),
      versionNoteError &&
        React.createElement(
          "div",
          { style: { color: "#ff4d4f", fontSize: 12, marginTop: 4 } },
          versionNoteError,
        ),
    ),
  );
};

ctx.render(React.createElement(ContractDocxGenerator));
