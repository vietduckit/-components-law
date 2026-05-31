const { React } = ctx;
const { useState, useEffect, useCallback } = React;
const { Spin, Modal, Button } = ctx.antd;

// ==================== CONFIG ====================
const RECORD_ID = ctx.record?.id;
const POPUP_UID_CASE = "lqj7vemag75";

const pad2 = (n) => String(n).padStart(2, "0");
const formatDate = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return "";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const formatDateLong = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return "";
  return `ngày ${pad2(d.getDate())} tháng ${pad2(d.getMonth() + 1)} năm ${d.getFullYear()}`;
};
const fmtVND = (val) => {
  const n = Number(val);
  if ((!val && val !== 0) || isNaN(n)) return "—";
  return n.toLocaleString("vi-VN") + " VNĐ";
};

function numberToWords(num) {
  const n = Math.round(Number(num));
  if (!n || isNaN(n)) return "";
  const units = [
    "",
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
  const tens = [
    "",
    "mười",
    "hai mươi",
    "ba mươi",
    "bốn mươi",
    "năm mươi",
    "sáu mươi",
    "bảy mươi",
    "tám mươi",
    "chín mươi",
  ];
  function readGroup(n) {
    if (n === 0) return "";
    const h = Math.floor(n / 100),
      t = Math.floor((n % 100) / 10),
      u = n % 10;
    let s = "";
    if (h > 0) s += units[h] + " trăm";
    if (t > 0) s += (s ? " " : "") + tens[t];
    else if (h > 0 && u > 0) s += " linh";
    if (u > 0) s += (s ? " " : "") + units[u];
    return s;
  }
  if (n === 0) return "không đồng";
  const tỷ = Math.floor(n / 1_000_000_000);
  const triệu = Math.floor((n % 1_000_000_000) / 1_000_000);
  const nghìn = Math.floor((n % 1_000_000) / 1_000);
  const đơn = n % 1_000;
  let result = "";
  if (tỷ) result += readGroup(tỷ) + " tỷ";
  if (triệu) result += (result ? " " : "") + readGroup(triệu) + " triệu";
  if (nghìn) result += (result ? " " : "") + readGroup(nghìn) + " nghìn";
  if (đơn) result += (result ? " " : "") + readGroup(đơn);
  return result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
}

function extractUrl(raw) {
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw.length > 0) {
    const f = raw[0];
    return f?.url || f?.publicUrl || f?.downloadURL || null;
  }
  if (typeof raw === "object")
    return raw.url || raw.publicUrl || raw.downloadURL || null;
  return null;
}

// ==================== FETCH (pattern từ Quotation) ====================

// Bước 1: lấy contract (chỉ lấy các field gốc, không appends nested)
async function fetchContract(id) {
  try {
    const res = await ctx.api.request({
      url: "contracts:get",
      params: { filterByTk: id },
    });
    return res?.data?.data || res?.data || null;
  } catch (e) {
    console.error("fetchContract error:", e);
    return null;
  }
}

// Bước 2: lấy quotation theo quotationId
async function fetchQuotation(quotationId) {
  if (!quotationId) return null;
  try {
    const res = await ctx.api.request({
      url: "quotations:get",
      params: { filterByTk: quotationId },
    });
    return res?.data?.data || res?.data || null;
  } catch (e) {
    console.error("fetchQuotation error:", e);
    return null;
  }
}

// Bước 3: lấy customer theo customerId
async function fetchCustomer(customerId) {
  if (!customerId) return null;
  try {
    const res = await ctx.api.request({
      url: "customers:get",
      params: { filterByTk: customerId },
    });
    return res?.data?.data || res?.data || null;
  } catch (e) {
    console.error("fetchCustomer error:", e);
    return null;
  }
}

// Bước 4: lấy internalCompany kèm ảnh
async function fetchInternalCompany(companyId) {
  if (!companyId) return null;
  try {
    const res = await ctx.api.request({
      url: "internalCompany:get",
      params: {
        filterByTk: companyId,
        appends: ["logo", "signatureImage", "stamp"],
      },
    });
    return res?.data?.data || res?.data || null;
  } catch (e) {
    console.error("fetchInternalCompany error:", e);
    return null;
  }
}

// Bước 5: lấy quotationServices theo quotationId
async function fetchQuotationServices(quotationId) {
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
    console.error("fetchQuotationServices error:", e);
    return [];
  }
}

// Bước 6: lấy service details (tên + tasks)
async function fetchServiceDetails(serviceIds) {
  if (!serviceIds.length) return {};
  try {
    const res = await ctx.api.request({
      url: "services:list",
      params: {
        pageSize: 500,
        page: 1,
        filter: JSON.stringify({ id: { $in: serviceIds } }),
        fields: "id,serviceName",
        appends: ["templateId"],
      },
    });
    const map = {};
    (res?.data?.data || []).forEach((s) => {
      map[s.id] = {
        name: s.serviceName,
        tasks: (s.templateId || [])
          .map((t) => t.templateName || "")
          .filter(Boolean),
      };
    });
    return map;
  } catch (e) {
    console.error("fetchServiceDetails error:", e);
    return {};
  }
}

// ==================== HTML BUILDER ====================
function buildContractHTML(
  contract,
  quotation,
  customer,
  company,
  services,
  svcDetailMap,
) {
  const cu = customer || {};
  const q = quotation || {};
  const co = company || {};

  // ── Thông tin Khách Hàng ──
  const customerType = cu.customerType || "individual";
  const customerName = cu.customerName || cu.fullName || cu.name || "—";
  const companyLegalName = cu.companyLegalName || "";
  const taxCode = cu.taxCode || "";
  const cuAddress = cu.address || "";
  const repName = cu.representativeName || "";
  const repTitle = cu.representativeTitle || "Giám Đốc";
  const identityNumber = cu.IdentityNumber || "";
  const idIssuedPlace = cu.customerIdIssuedPlace || "";
  const idIssuedDate = cu.customerIdIssuedDate
    ? formatDate(cu.customerIdIssuedDate)
    : "";
  const cuPhone = cu.phone || "";

  // ── Thông tin Công Ty ──
  const coName = co.name || co.companyName || "Công ty Luật";
  const serviceDescription = co.serviceDescription || "";
  const coLegalName = co.legalName || coName;
  const coShortName = co.shortName || coName;
  const coAddress = co.address || "";
  const coEmail = co.email || "";
  const coWebsite = co.website || "";
  const coOffice = co.office || "";
  const coTaxCode = co.taxCode || "";
  const sigName = co.signatureName || "—";
  const sigTitle = co.signatureTitle || "Giám đốc";
  const coPhone = co.phone || "";
  const brandColor = co.brandColor || "#1a3a5c";

  const logoUrl = extractUrl(co.logo || co.logoUrl || co.logoImage);
  const sigImgUrl = extractUrl(co.signatureImage || co.signatureImageUrl);
  const stampUrl = extractUrl(co.stamp || co.stampImage || co.companyStamp);

  // ── Thông tin Hợp Đồng ──
  const contractCode = contract.contractCode || "___";
  const signedDate = contract.signedDate
    ? formatDateLong(contract.signedDate)
    : formatDateLong(null);
  const signedDateShort = contract.signedDate
    ? formatDate(contract.signedDate)
    : formatDate(null);
  const arbLang =
    contract.arbitrationLanguage === "english"
      ? "tiếng Anh"
      : contract.arbitrationLanguage === "both"
        ? "tiếng Việt và tiếng Anh"
        : "tiếng Việt";

  // ── Phí dịch vụ — tính từng dòng trong services (giống file Quotation) ──
  let subTotal = 0,
    vatAmount = 0;
  services.forEach((s) => {
    const price = Number(s.basePrice) || 0;
    const qty = Number(s.quantity) || 1;
    const vatPct = Number(s.vat) || 0;
    const line = price * qty;
    subTotal += line;
    vatAmount += (line * vatPct) / 100;
  });
  // Fallback về quotation nếu services rỗng
  if (!services.length) {
    subTotal = Number(q.subTotal) || 0;
    vatAmount = Number(q.vatAmount) || 0;
  }
  const totalAmount = subTotal + vatAmount;
  // vatIncluded: true nếu có ít nhất 1 service có vat > 0
  const vatIncluded = services.some((s) => Number(s.vat) > 0);
  const pay1 = Math.round(totalAmount * 0.7);
  const pay2 = Math.round(totalAmount * 0.3);
  const pay1Words = numberToWords(pay1);
  const pay2Words = numberToWords(pay2);
  const totalWords = numberToWords(totalAmount);

  // ── Số hợp đồng ──
  const clientShortName =
    (customerType === "company" ? companyLegalName : customerName)
      .split(" ")
      .slice(-1)[0] || customerName;
  const fullContractNumber = `${contractCode}/LSC/${coShortName}-${clientShortName}`;

  // ── Render dịch vụ ──
  const svcList = services
    .map((s, i) => {
      const detail = svcDetailMap[s.serviceId] || {};
      const name = detail.name || `Dịch vụ #${s.serviceId}`;
      const tasks = detail.tasks || [];
      const taskItems = tasks.length
        ? tasks.map((t) => `<li style="margin-bottom:3px">${t}</li>`).join("")
        : "<li>Tư vấn và hỗ trợ thực hiện theo yêu cầu của Khách Hàng.</li>";
      return `<div style="margin-bottom:14px">
      <p style="font-weight:bold;margin-bottom:4px">${i + 1}. ${name}</p>
      <ul style="margin:0 0 0 20px;padding:0;line-height:1.8">${taskItems}</ul>
    </div>`;
    })
    .join("");

  const svcFeeRows = services
    .map((s, i) => {
      const detail = svcDetailMap[s.serviceId] || {};
      const name = detail.name || `Dịch vụ #${s.serviceId}`;
      const price = Number(s.basePrice) || 0;
      const qty = Number(s.quantity) || 1;
      const vatPct = Number(s.vat) || 0;
      const lineAmt = price * qty;
      const vatNote =
        vatPct > 0
          ? ` <span style="font-size:10pt;color:#666">(+${vatPct}% VAT)</span>`
          : "";
      return `<tr>
      <td style="padding:7px 10px;border:1px solid #ddd;text-align:center">${i + 1}</td>
      <td style="padding:7px 10px;border:1px solid #ddd">${name}${vatNote}</td>
      <td style="padding:7px 10px;border:1px solid #ddd;text-align:right">${fmtVND(lineAmt)}</td>
      <td style="padding:7px 10px;border:1px solid #ddd;text-align:center"></td>
    </tr>`;
    })
    .join("");

  // ── Block thông tin khách hàng ──
  const clientBlock =
    customerType === "company"
      ? `
    <p style="margin-bottom:8px"><strong>${companyLegalName || customerName}</strong></p>
    ${taxCode ? `<p style="margin-bottom:6px">Mã số thuế: <strong>${taxCode}</strong>; địa chỉ trụ sở đăng ký tại <strong>${cuAddress}</strong>, Việt Nam.</p>` : ""}
    ${repName ? `<p style="margin-bottom:6px">Đại diện bởi: Ông/Bà: <strong>${repName}</strong> chức vụ: <strong>${repTitle}</strong></p>` : ""}
  `
      : `
    <p style="margin-bottom:8px"><strong>Ông/Bà: ${customerName}</strong></p>
    ${identityNumber ? `<p style="margin-bottom:6px">CCCD Số/Passport Số: <strong>${identityNumber}</strong></p>` : ""}
    ${idIssuedPlace ? `<p style="margin-bottom:6px">Nơi cấp: <strong>${idIssuedPlace}</strong>${idIssuedDate ? `; ngày cấp: <strong>${idIssuedDate}</strong>` : ""}</p>` : ""}
    ${cuAddress ? `<p style="margin-bottom:6px">Chỗ ở hiện tại: <strong>${cuAddress}</strong></p>` : ""}
  `;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<title>Hop Dong Dich Vu Phap Ly - ${customerName}</title>
<style>
  :root { --brand: ${brandColor}; --text: #1a1a1a; --sub: #444; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size:13pt; color:var(--text); background:#fff; line-height:1.8; }
  .page { width:100%; padding:20mm 25mm 20mm 30mm; }
  h1.doc-title { font-size:14pt; font-weight:bold; text-align:center; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; }
  .doc-number { text-align:center; font-size:12pt; margin-bottom:20px; }
  .article-title { font-size:13pt; font-weight:bold; text-transform:uppercase; margin:24px 0 10px; }
  .sub-title { font-size:13pt; font-weight:bold; margin:16px 0 8px; }
  p { margin-bottom:10px; text-align:justify; }
  ol.alpha { list-style-type:lower-alpha; margin-left:28px; }
  ol.alpha li { margin-bottom:8px; text-align:justify; }
  ol.decimal { list-style-type:decimal; margin-left:28px; }
  ol.decimal li { margin-bottom:8px; text-align:justify; }
  .indent { margin-left:28px; }
  .fee-table { width:100%; border-collapse:collapse; font-size:12pt; margin:12px 0; }
  .fee-table th { padding:8px 10px; background:var(--brand); color:#fff; border:1px solid var(--brand); font-size:12pt; }
  .fee-table tfoot td { padding:8px 10px; font-weight:bold; border:1px solid #ddd; }
  .fee-table tfoot tr.grand td { background:var(--brand); color:#fff; border-color:var(--brand); }
  .fee-table tfoot tr.grand td.r { text-align:right; }
  .sig-table { width:100%; margin-top:40px; }
  .sig-table td { width:50%; vertical-align:top; padding:0 10px; text-align:center; }
  .sig-label { font-weight:bold; text-transform:uppercase; margin-bottom:6px; }
  .sig-wrap { position:relative; display:inline-block; width:180px; height:120px; margin:10px auto; }
  .page-break { page-break-before:always; }
  .annex-title { font-size:14pt; font-weight:bold; text-align:center; text-transform:uppercase; margin:0 0 20px; padding-bottom:8px; border-bottom:2px solid var(--brand); color:var(--brand); }
  .payment-schedule { background:#f8f9fa; border:1px solid #dee2e6; border-radius:4px; padding:14px 18px; margin:12px 0; }
  .payment-row { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px; }
  .payment-label { font-weight:bold; }
  .payment-amount { color:var(--brand); font-weight:bold; }
  @media print {
    .page { padding:0; }
    body { padding:0; }
    @page { size:A4; margin:20mm 25mm 20mm 30mm; }
  }
</style>
</head>
<body>
<div class="page">

  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
    <div>
      ${
        logoUrl
          ? `<img src="${logoUrl}" style="max-width:400px;max-height:300px;object-fit:contain;object-position:left;display:block" alt="${coName}" onerror="this.style.display='none'"/>`
          : `<div style="font-size:16pt;font-weight:bold;color:var(--brand)">${coShortName}</div>`
      }
    </div>
    <div style="text-align:right;font-size:10pt;color:var(--sub);line-height:1.9">
      <div><strong>${coName}</strong></div>
      ${coAddress ? `<div><strong>VP: </strong>${coAddress}</div>` : ""}
      ${coOffice ? `<div><strong>VPGD: </strong>${coOffice}</div>` : ""}
      ${coPhone ? `<div><strong>SĐT: </strong>${coPhone}</div>` : ""}
      ${coEmail ? `<div><strong>Email: </strong>${coEmail}</div>` : ""}
      ${coWebsite ? `<div><strong>Website: </strong>${coWebsite}</div>` : ""}
    </div>
  </div>

  <div style="text-align:center;margin-bottom:6px">
    <div style="font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:2px;color:var(--sub)">Cộng Hòa Xã Hội Chủ Nghĩa Việt Nam</div>
    <div style="font-size:11pt;font-style:italic;margin-bottom:16px">Độc lập – Tự do – Hạnh phúc</div>
    <div style="border-bottom:1px solid #ccc;width:200px;margin:0 auto 20px"></div>
  </div>

  <h1 class="doc-title">Hợp Đồng Dịch Vụ Pháp Lý</h1>
  <div class="doc-number">Số: <strong>${fullContractNumber}</strong></div>

  <p style="text-align:center;margin-bottom:6px">GIỮA</p>
  <p style="text-align:center;font-weight:bold;font-size:24pt;margin-bottom:6px">${(customerType === "company" ? companyLegalName || customerName : `Ông/Bà: ${customerName}`).toUpperCase()}</p>
  <p style="text-align:center;margin-bottom:6px">VÀ</p>
  <p style="text-align:center;font-weight:bold;font-size:24pt;margin-bottom:20px">${coName.toUpperCase()}</p>

  <div style="border:1px solid #ccc;padding:16px 20px;margin-bottom:24px;font-size:12pt">
    <p style="margin-bottom:8px">
      <strong>HỢP ĐỒNG DỊCH VỤ PHÁP LÝ Số: ${fullContractNumber}</strong>
      NÀY (cùng các phụ lục kèm theo, gọi chung là "<strong>Hợp Đồng</strong>") được ký ${signedDate} ("<strong>Ngày Ký</strong>"):
    </p>
    <p style="text-align:center;font-weight:bold;margin:12px 0 8px">GIỮA</p>
    <div style="margin-bottom:12px">
      ${clientBlock}
      <p style="margin-top:6px">(sau đây gọi là "<strong>Khách Hàng</strong>"),</p>
    </div>
    <p style="text-align:center;font-weight:bold;margin:8px 0">VÀ</p>
    <div style="margin-bottom:12px">
      <p style="margin-bottom:6px"><strong>${coLegalName.toUpperCase()}</strong></p>
      ${coTaxCode ? `<p style="margin-bottom:6px">Mã số thuế: <strong>${coTaxCode}</strong>${coAddress ? `; địa chỉ trụ sở đăng ký tại <strong>${coAddress}</strong>, Việt Nam.` : ""}</p>` : ""}
      <p style="margin-bottom:6px">Đại diện bởi: Ông <strong>${sigName}</strong> chức vụ: <strong>${sigTitle}</strong></p>
      <p>(sau đây gọi là "<strong>Công Ty</strong>")</p>
    </div>
    <p>Nay, do đó, Khách Hàng và Công Ty (sau đây gọi chung là "<strong>Các Bên</strong>" hay gọi riêng là "<strong>Bên</strong>") đồng ý ký và xác lập Hợp Đồng này với các điều khoản và điều kiện sau đây:</p>
  </div>

  <div class="article-title">Điều 1. Chỉ định Công Ty và Chấp Thuận Dịch Vụ</div>
  <div class="sub-title">1.1. Chỉ Định Công Ty</div>
  <ol class="alpha">
    <li>Khách Hàng tại Hợp Đồng này chỉ định Công Ty cung cấp dịch vụ pháp lý cho Khách Hàng theo quy định tại Điều 1.2 ("Dịch Vụ") của Hợp Đồng này.</li>
    <li>Các Bên đồng ý rằng Hợp Đồng này khi được Các Bên ký phê chuẩn không được coi là hợp đồng độc quyền giữa Khách Hàng và Công Ty liên quan đến các dịch vụ quy định tại Điều 1.2 dưới đây, tuy nhiên luôn luôn với điều kiện rằng Khách Hàng không được giao dịch vụ tương tự đã giao cho Công Ty theo Hợp Đồng này cho bất kỳ tổ chức, công ty hay cá nhân nào khác khi chưa có văn bản chấp thuận trước của Công Ty.</li>
  </ol>
  <div class="sub-title">1.2. Chấp Thuận Dịch Vụ</div>
  <ol class="alpha">
    <li>Khách Hàng đồng ý và chấp thuận thuê Công Ty cung cấp các dịch vụ tư vấn liên quan đến việc <strong>${q.description || "[mô tả dịch vụ]"}</strong>, được liệt kê chi tiết tại Phụ Lục 1 của Hợp Đồng này.</li>
    <li>Bất kỳ dịch vụ nào phát sinh thêm ngoài những dịch vụ quy định tại Khoản (a) Điều 1.2 này đều phải được Các Bên phê chuẩn trước bằng văn bản trước khi thực hiện.</li>
  </ol>

  <div class="article-title">Điều 2. Phí Dịch Vụ, Thuế và Chi Phí</div>
  <div class="sub-title">2.1. Phí Dịch Vụ</div>
  <p class="indent">Phí dịch vụ bao gồm phí tư vấn pháp lý và phí thực hiện các công việc pháp lý theo phạm vi dịch vụ được mô tả chi tiết tại <strong>Phụ lục 1</strong> kèm theo Hợp Đồng này.</p>
  <div class="sub-title">2.2. Thuế và Chi Phí</div>
  <p class="indent">Phí dịch vụ quy định tại Điều 2.1 <strong>${vatIncluded ? "đã" : "chưa"} bao gồm</strong> thuế giá trị gia tăng (VAT) và các chi phí phát sinh khác (nếu có).</p>
  <p class="indent">Thuế suất thuế giá trị gia tăng được áp dụng theo quy định pháp luật hiện hành tại thời điểm phát hành hóa đơn.</p>

  <div class="article-title">Điều 3. Thanh Toán</div>
  <ol class="decimal" style="margin-left:28px">
    <li>Khách Hàng đồng ý thanh toán cho Công Ty toàn bộ phí, thuế và chi phí theo khoản tiền và lịch biểu thanh toán quy định tại Điều 2.1 của Hợp Đồng này.</li>
    <li>Công Ty sẽ gửi Khách Hàng Giấy Đề Nghị Thanh Toán và khoản tiền ghi trong Giấy Đề Nghị Thanh Toán sẽ đến hạn thanh toán và sẽ được Khách Hàng thanh toán cho Công Ty trong thời hạn chậm nhất là mười (10) ngày làm việc kể từ ngày ký của Giấy Đề Nghị Thanh Toán.</li>
  </ol>

  <div class="article-title">Điều 4. Hiệu Lực và Thời Hạn</div>
  <p class="indent">Hợp Đồng này có hiệu lực pháp luật đầy đủ vào Ngày Ký ghi tại phần đầu của Hợp Đồng này ("Ngày Hiệu Lực") và tiếp tục có hiệu lực pháp lý đầy đủ cho đến khi Các Bên thỏa thuận chấm dứt và thanh lý Hợp Đồng này.</p>

  <div class="article-title">Điều 5. Cam Kết và Bảo Đảm</div>
  <div class="sub-title">5.1. Cam Kết và Đảm Bảo của Công Ty</div>
  <p class="indent">Công Ty cam kết và bảo đảm:</p>
  <ol class="alpha">
    <li>rằng Công Ty có đầy đủ năng lực, thẩm quyền, giấy phép cần thiết để ký và thực hiện nghĩa vụ quy định tại Hợp Đồng này.</li>
    <li>rằng dịch vụ được cung cấp theo Hợp Đồng này sẽ được thực hiện theo cách chuyên nghiệp bởi các Công Ty, chuyên gia tư vấn, người hành nghề có trình độ và kỹ năng trong việc thực hiện từng dịch vụ cụ thể. Nếu tư vấn không phù hợp với quy định của pháp luật hoặc dịch vụ quy định tại Hợp Đồng này không hoàn thành hoàn toàn do lỗi của Công Ty, theo yêu cầu của Khách hàng, Công Ty đồng ý bồi thường thiệt hại thực tế với mức bồi thường không vượt quá tổng khoản phí mà Công Ty đã nhận được theo Hợp Đồng này tính đến thời điểm bồi thường.</li>
    <li>rằng Công Ty chỉ tư vấn và hành nghề tư vấn luật theo quy định của pháp luật Việt Nam.</li>
  </ol>
  <div class="sub-title">5.2. Cam Kết và Bảo Đảm của Khách Hàng</div>
  <p class="indent">Khách Hàng cam kết và bảo đảm:</p>
  <ol class="alpha">
    <li>rằng sẽ cung cấp đầy đủ và kịp thời các thông tin và tài liệu liên quan đến công việc gửi cho Công Ty hoặc theo yêu cầu của Công Ty để Công Ty thực hiện dịch vụ quy định tại Hợp Đồng này.</li>
    <li>tính chính xác của thông tin và tài liệu cung cấp cho Công Ty. Trường hợp xảy ra thiệt hại cho Khách Hàng do tư vấn hoặc dịch vụ của Công Ty không chính xác xuất phát từ nguyên nhân thông tin, tài liệu do Khách Hàng cung cấp không chính xác, không đầy đủ và không kịp thời, Khách Hàng tự chịu trách nhiệm về toàn bộ những thiệt hại đó.</li>
    <li>thanh toán đầy đủ các khoản phí, thuế và chi phí cho Công Ty theo đúng quy định tại Hợp Đồng này và/hoặc Phụ Lục của nó.</li>
  </ol>

  <div class="article-title">Điều 6. Bảo Mật</div>
  <div class="sub-title">6.1. Thông Tin Mật</div>
  <ol class="alpha">
    <li>Trong quá trình thực hiện Hợp Đồng này, mỗi Bên có thể tiếp cận hoặc có được thông tin mật ("Thông Tin Mật") của Bên kia liên quan đến tổ chức, hoạt động và kinh doanh của Bên đó.</li>
    <li>Mỗi Bên đồng ý, nếu chưa được sự chấp thuận trước bằng văn bản của Bên kia, sẽ không tiết lộ bất kỳ Thông Tin Mật nào cho bên thứ ba dưới bất kỳ hình thức nào, trừ khi việc tiết lộ đó là bắt buộc theo quy định của pháp luật.</li>
    <li>Công Ty cam kết giữ bí mật tại mọi thời điểm bất kỳ thông tin bí mật nào mà Công Ty có được liên quan đến thỏa thuận giữa Công Ty và Khách Hàng.</li>
    <li>Các nghĩa vụ bảo mật vẫn tiếp tục được áp dụng thêm hai (02) năm nữa kể từ ngày thỏa thuận này hết hạn.</li>
  </ol>
  <div class="sub-title">6.2. Ngoại Trừ</div>
  <p class="indent">Khách Hàng đồng ý rằng Công Ty được phép sử dụng thông tin về dịch vụ mà Công Ty thực hiện theo Hợp Đồng này trong các tài liệu và phương tiện giới thiệu về hồ sơ năng lực của Công Ty.</p>

  <div class="article-title">Điều 7. Chấm Dứt</div>
  <div class="sub-title">7.1. Chấm Dứt Bởi Khách Hàng</div>
  <p class="indent">Khách Hàng không được quyền đơn phương chấm dứt Hợp Đồng này trước Thời Hạn Hiệu Lực tại ĐIỀU 4 của Hợp Đồng này, trừ khi Khách Hàng xuất trình được bằng chứng rõ ràng chứng minh Công Ty đã vi phạm quy định tại ĐIỀU 6 của Hợp Đồng này.</p>
  <div class="sub-title">7.2. Chấm Dứt Bởi Công Ty</div>
  <p class="indent">Công Ty có quyền đơn phương ngừng thực hiện Hợp Đồng này bằng một văn bản thông báo trước năm (5) ngày làm việc gửi Khách Hàng nếu các khoản phí và khoản tiền phải thanh toán cho Công Ty theo quy định tại Hợp Đồng này đã quá hạn thanh toán mười (10) ngày làm việc kể từ ngày đến hạn thanh toán.</p>

  <div class="article-title">Điều 8. Lưu Giữ Tài Liệu</div>
  <ol class="decimal" style="margin-left:28px">
    <li>Khách Hàng sẽ chủ động sao lưu tài liệu (bản gốc, bản sao) trước khi gửi cho Công Ty. Công Ty sẽ không chịu trách nhiệm sao lưu tài liệu cho Khách Hàng.</li>
    <li>Cho mục đích quản lý hồ sơ khách hàng, Công Ty sẽ lưu giữ đầy đủ thông tin và tài liệu liên quan đến dịch vụ đã thực hiện theo Hợp Đồng này.</li>
  </ol>

  <div class="article-title">Điều 9. Tư Cách Nhà Thầu Độc Lập</div>
  <p class="indent">Công Ty tuyên bố và đồng ý cung cấp dịch vụ với tư cách là bên tư vấn, Công Ty độc lập của Khách Hàng. Không một quy định nào trong Hợp Đồng này được hiểu hay diễn giải là tạo ra mối quan hệ liên danh, liên doanh, lao động, đại lý giữa Công Ty và Khách Hàng.</p>

  <div class="article-title">Điều 10. Thông Báo</div>
  <p class="indent">Tất cả các thông báo, tài liệu, yêu cầu và liên lạc của một Bên với Bên kia sẽ được thực hiện theo quy tắc sau đây: (i) nếu được gửi bằng thư điện tử (e-mail), chỉ được coi là đã nhận được nếu Bên nhận xác nhận đã nhận được; (iii) được coi là đã nhận ngay lập tức nếu được trao tận tay người nhận; (iv) được coi là đã nhận sau 02 ngày kể từ ngày gửi bưu điện nếu được gửi bằng dịch vụ chuyển phát nhanh:</p>
  <ol class="alpha">
    <li>Địa chỉ nhận thư của Khách Hàng:<br/>
      <span class="indent">Gửi: <strong>${customerType === "company" ? companyLegalName || customerName : customerName}</strong></span><br/>
      <span class="indent">Địa chỉ: <strong>${cuAddress}</strong></span><br/>
      <span class="indent">Tên người nhận: <strong>${repName || customerName}</strong> - ${repTitle}</span><br/>
     <span class="indent">Di động số: <strong>${cuPhone}</strong></span>
    </li>
    <li>Địa chỉ nhận thư của Công Ty:<br/>
      <span class="indent">Gửi: <strong>${coName.toUpperCase()}</strong></span><br/>
      <span class="indent">Địa chỉ: <strong>${coOffice || coAddress}</strong></span><br/>
      <span class="indent">Người nhận: <strong>${sigName}</strong> - ${sigTitle}</span><br/>
      <span class="indent">Di động số: <strong>${coPhone}</strong></span>
    </li>
  </ol>

  <div class="article-title">Điều 11. Chuyển Nhượng</div>
  <p class="indent">Không Bên nào được quyền chuyển nhượng Hợp Đồng này hoặc bất kỳ quyền hoặc nghĩa vụ nào quy định tại Hợp Đồng này nếu không có văn bản chấp thuận trước của Bên kia.</p>

  <div class="article-title">Điều 12. Công Bố</div>
  <ol class="decimal" style="margin-left:28px">
    <li>Công Ty không công bố công khai các thông tin liên quan đến Hợp Đồng này hoặc liên quan đến Khách Hàng, ngoại trừ trường hợp quy định tại Điều 6 của Hợp Đồng này.</li>
    <li>Công Ty không sử dụng tiêu đề thư, biểu tượng, nhãn hiệu hoặc logo của Khách Hàng trong các tài liệu quảng cáo nếu không có văn bản chấp thuận trước của Khách Hàng.</li>
  </ol>

  <div class="article-title">Điều 13. Kế Thừa</div>
  <p class="indent">Hợp Đồng này ràng buộc những người thừa kế và nhận chuyển nhượng của Các Bên đối với tất cả các quyền, nghĩa vụ và cam kết quy định Hợp Đồng này.</p>

  <div class="article-title">Điều 14. Luật Điều Chỉnh và Giải Quyết Tranh Chấp</div>
  <div class="sub-title">14.1. Luật Điều Chỉnh</div>
  <p class="indent">Pháp luật Việt Nam điều chỉnh tất cả các khía cạnh của Hợp Đồng này.</p>
  <div class="sub-title">14.2. Giải Quyết Tranh Chấp</div>
  <p class="indent">Mọi tranh chấp phát sinh từ hay liên quan đến Hợp Đồng này sẽ được giải quyết bởi trọng tài tại Trung tâm Trọng tài Quốc tế Việt Nam (VIAC), Hội đồng Trọng tài gồm ba (03) Trọng tài viên. Địa điểm Trọng tài tại Thành Phố Hồ Chí Minh, Việt Nam. Ngôn ngữ sử dụng trong xét xử trọng tài là <strong>${arbLang}</strong>.</p>

  <div class="article-title">Điều 15. Hiệu Lực Riêng Biệt của Từng Điều Khoản</div>
  <p class="indent">Nếu bất kỳ một điều khoản nào của Hợp Đồng này bị coi là không có hiệu lực theo quy định của pháp luật thì sự vô hiệu đó không làm vô hiệu hoặc không ảnh hưởng đến hiệu lực của các điều khoản khác của Hợp Đồng này.</p>

  <div class="article-title">Điều 16. Bổ Sung, Sửa Đổi hoặc Miễn Trừ</div>
  <div class="sub-title">16.1. Sửa Đổi, Bổ Sung</div>
  <p class="indent">Bất kỳ sửa đổi, bổ sung nào đối với bất kỳ quy định nào của Hợp Đồng này sẽ chỉ có hiệu lực pháp lý và ràng buộc Các Bên nếu sửa đổi, bổ sung đó được lập thành văn bản được đại diện có thẩm quyền của Các Bên ký hợp lệ.</p>
  <div class="sub-title">16.2. Miễn Trừ</div>
  <p class="indent">Việc một Bên không hoặc chậm đưa ra yêu cầu đối với Bên kia thực hiện một nghĩa vụ không được hiểu là Bên đó từ bỏ quyền yêu cầu đó.</p>

  <div class="article-title">Điều 17. Bất Khả Kháng</div>
  <p class="indent">Thay đổi luật, chính sách của cơ quan thẩm quyền Việt Nam; hành vi sai trái của công chức làm chậm tiến độ xử lý công việc; lệnh cấm vận; chiến tranh; và tất cả các sự kiện khác xảy ra một cách khách quan, không dự đoán trước được và nằm ngoài khả năng kiểm soát của một Bên, là Sự kiện Bất Khả Kháng.</p>

  <div class="article-title">Điều 18. Thoả Thuận Toàn Bộ</div>
  <ol class="decimal" style="margin-left:28px">
    <li>Hợp Đồng này có các Phụ Lục sau: Phụ Lục 1 – Dịch Vụ; Phụ Lục 2 – Phí, Chi Phí Và Thanh Toán; và các Phụ Lục khác được xác lập bằng văn bản theo sự thỏa thuận của các Bên.</li>
    <li>Hợp Đồng này và các Phụ Lục của nó cấu thành toàn bộ sự thoả thuận giữa các bên liên quan và thay thế tất cả các thoả thuận trước đó của các bên dù là thoả thuận bằng miệng hay bằng văn bản.</li>
  </ol>

  <div class="article-title">Điều 19. Ngôn Ngữ và Số Bản Hợp Đồng</div>
  <p class="indent">Hợp Đồng này được ký thành hai (02) bản gốc bằng tiếng Việt. Mỗi Bên giữ một (01) bản gốc có giá trị pháp lý như nhau.</p>

  <p style="text-align:center;font-weight:bold;margin:30px 0 16px;text-transform:uppercase">Xác Nhận Sự Nhất Trí Đối Với Nội Dung Của Hợp Đồng Này</p>
  <p style="text-align:center;font-style:italic;margin-bottom:24px">Đại diện có thẩm quyền của mỗi Bên đã đọc kỹ, hiểu rõ quyền và nghĩa vụ của mình quy định tại Hợp Đồng này.</p>

  <table class="sig-table">
    <tr>
      <td>
        <div class="sig-label">Đại Diện Khách Hàng</div>
        <div style="height:110px;margin:8px 0"></div>
        <div style="font-weight:bold">${customerType === "company" ? repName || customerName : customerName}</div>
        <div style="color:var(--sub)">${customerType === "company" ? repTitle : "Giám đốc"}</div>
      </td>
      <td>
        <div class="sig-label">Đại Diện Công Ty</div>
        <div class="sig-wrap" style="margin:8px auto">
          ${stampUrl ? `<img src="${stampUrl}"  style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:130px;height:130px;object-fit:contain;opacity:0.82;z-index:1" onerror="this.style.display='none'"/>` : ""}
          ${sigImgUrl ? `<img src="${sigImgUrl}" style="position:absolute;bottom:0;left:55%;width:155px;height:95px;object-fit:contain;object-position:left bottom;z-index:2" onerror="this.style.display='none'"/>` : ""}
        </div>
        <div style="font-weight:bold">${sigName}</div>
        <div style="color:var(--sub)">${sigTitle}</div>
      </td>
    </tr>
  </table>

  <div class="page-break"></div>

  <p class="annex-title">Phụ Lục 1 – Dịch Vụ</p>
  <p style="text-align:center;font-style:italic;font-size:11pt;margin-bottom:20px">(Phụ Lục 1 này là một phần không thể tách rời của Hợp Đồng Dịch Vụ Pháp Lý số ${fullContractNumber} ký ${signedDateShort})</p>

  <p style="font-weight:bold;text-transform:uppercase;margin-bottom:8px">A. Yêu Cầu Dịch Vụ Pháp Lý</p>
  <p class="indent">Khách Hàng yêu cầu Công Ty tư vấn pháp lý trọn gói các vấn đề pháp lý về <strong>${serviceDescription || "[mô tả yêu cầu]"}</strong>.</p>

  <p style="font-weight:bold;text-transform:uppercase;margin:20px 0 8px">B. Dịch Vụ Pháp Lý</p>
  <p class="indent">Trên cơ sở thông tin yêu cầu dịch vụ pháp lý nêu tại Mục A của Phụ lục này, Công Ty sẽ cung cấp các dịch vụ sau đây tới Khách Hàng:</p>
  <div class="indent">${svcList || "<p><em>Chưa có dịch vụ nào.</em></p>"}</div>
  <p class="indent">Để tránh hiểu nhầm, các dịch vụ pháp lý nêu trên <strong>không bao gồm</strong> (1) các vụ việc pháp lý, vụ án pháp lý phát sinh liên quan đến Khách Hàng và (2) các vấn đề pháp lý khác ngoài phạm vi trong Mục này.</p>

  <p style="font-weight:bold;text-transform:uppercase;margin:20px 0 8px">C. Tuân Thủ</p>
  <ul style="margin-left:24px;line-height:1.9">
    <li>Công Ty cung cấp các dịch vụ trên cơ sở thông tin do Khách Hàng cung cấp.</li>
    <li>Công Ty tuân thủ pháp luật Việt Nam khi thực hiện Hợp Đồng này.</li>
  </ul>

  <div class="page-break"></div>

  <p class="annex-title">Phụ Lục 2 – Phí, Chi Phí và Thanh Toán</p>
  <p style="text-align:center;font-style:italic;font-size:11pt;margin-bottom:20px">(Phụ Lục 2 này là một phần không thể tách rời của Hợp Đồng Dịch Vụ Pháp Lý số ${fullContractNumber} ký ${signedDateShort})</p>

  <p style="font-weight:bold;text-transform:uppercase;margin-bottom:8px">A. Phí Dịch Vụ</p>
  <p class="indent">Dựa trên kinh nghiệm của chúng tôi trong những vụ việc tương tự, mức phí của Công Ty để thực hiện các dịch vụ quy định tại Phụ lục 1 là <strong>${fmtVND(subTotal)}</strong>, cụ thể:</p>

  <table class="fee-table">
    <thead>
      <tr>
        <th style="width:40px;text-align:center">STT</th>
        <th style="text-align:left">Nội dung dịch vụ</th>
        <th style="text-align:right;width:200px">Phí dịch vụ (VNĐ)</th>
        <th style="text-align:center;width:100px">Ghi chú</th>
      </tr>
    </thead>
    <tbody>${svcFeeRows || `<tr><td colspan="4" style="text-align:center;padding:12px;color:#999">Chưa có dịch vụ</td></tr>`}</tbody>
    <tfoot>
      <tr>
        <td colspan="2" style="text-align:right;font-weight:bold">Tổng phí (${vatIncluded ? "chưa" : "không có"} VAT)</td>
        <td style="text-align:right">${fmtVND(subTotal)}</td>
        <td></td>
      </tr>
      ${
        vatAmount > 0
          ? `<tr>
        <td colspan="2" style="text-align:right">Thuế GTGT</td>
        <td style="text-align:right">${fmtVND(vatAmount)}</td>
        <td></td>
      </tr>`
          : ""
      }
      <tr class="grand">
        <td colspan="2" style="text-align:right">TỔNG CỘNG</td>
        <td class="r">${fmtVND(totalAmount)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <p style="font-weight:bold;text-transform:uppercase;margin:20px 0 8px">B. Thuế</p>
  <p class="indent">Phí dịch vụ quy định tại Phần A của Phụ lục này <strong>${vatIncluded ? "đã" : "chưa"}</strong> bao gồm thuế GTGT.</p>

  <p style="font-weight:bold;text-transform:uppercase;margin:20px 0 8px">C. Chi Phí</p>
  <p class="indent">Khách Hàng sẽ thanh toán trực tiếp bất kỳ khoản chi phí nào dưới đây phát sinh đối với Công Ty khi thực hiện các công việc quy định tại Hợp Đồng này:</p>
  <ul style="margin-left:24px;line-height:1.9">
    <li>Phí và lệ phí nhà nước;</li>
    <li>Phí và lệ phí công chứng, chứng thực tài liệu, bản dịch;</li>
    <li>Các khoản chi phí hợp lý khác, có chứng từ hợp lệ.</li>
  </ul>

  <p style="font-weight:bold;text-transform:uppercase;margin:20px 0 8px">D. Thanh Toán</p>
  <p class="indent">Phí dịch vụ, thuế và chi phí được thanh toán cho Công Ty theo lịch biểu thanh toán dưới đây:</p>

  <div class="payment-schedule">
    <div class="payment-row">
      <span class="payment-label">(a) Đợt 1 – 70%:</span>
      <span class="payment-amount">${fmtVND(pay1)}</span>
    </div>
    <p style="font-size:11pt;color:var(--sub);margin:0 0 12px 16px;font-style:italic">(Bằng chữ: ${pay1Words}) — thanh toán ngay sau khi ký kết Hợp Đồng.</p>
    <div class="payment-row">
      <span class="payment-label">(b) Đợt 2 – 30%:</span>
      <span class="payment-amount">${fmtVND(pay2)}</span>
    </div>
    <p style="font-size:11pt;color:var(--sub);margin:0 0 0 16px;font-style:italic">(Bằng chữ: ${pay2Words}) — trong vòng 05 ngày làm việc kể từ ngày Công Ty hoàn tất các dịch vụ.</p>
  </div>

  <p style="margin-top:16px" class="indent">Tổng phí hợp đồng: <strong>${fmtVND(totalAmount)}</strong> (Bằng chữ: <strong>${totalWords}</strong>).</p>

</div>
</body>
</html>`;
}

// ==================== MAIN COMPONENT ====================
const ContractPDFBlock = () => {
  const [contract, setContract] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [company, setCompany] = useState(null);
  const [services, setServices] = useState([]);
  const [svcDetails, setSvcDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);

  const loadData = useCallback(async () => {
    if (!RECORD_ID) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Bước 1: Lấy contract
      const ct = await fetchContract(RECORD_ID);
      if (!ct) return;
      setContract(ct);

      // Bước 2-4: Song song fetch quotation, customer, company
      const quotationId = ct.quotationId;
      const customerId = ct.customerId;

      const [q, cu] = await Promise.all([
        fetchQuotation(quotationId),
        fetchCustomer(customerId),
      ]);
      setQuotation(q);
      setCustomer(cu);

      // Bước 4: lấy internalCompany từ quotation
      const companyId = q?.internalCompanyId || q?.internalCompany?.id;
      if (companyId) {
        const co = await fetchInternalCompany(companyId);
        if (co) setCompany(co);
      }

      // Bước 5-6: lấy services
      if (quotationId) {
        const svcs = await fetchQuotationServices(quotationId);
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

  const handleClick = async () => {
    await ctx.openView(POPUP_UID_CASE, {
      mode: "dialog",
      size: "large",
      navigation: false,
    });
  };

  const handleOpen = useCallback(() => {
    if (!contract) return;
    const html = buildContractHTML(
      contract,
      quotation,
      customer,
      company,
      services,
      svcDetails,
    );
    setPreviewHtml(html);
  }, [contract, quotation, customer, company, services, svcDetails]);

  const handleSaveDoc = useCallback(async () => {
    if (!contract || saving) return;
    setSaving(true);
    const { message } = ctx.antd;
    try {
      const html = buildContractHTML(
        contract,
        quotation,
        customer,
        company,
        services,
        svcDetails,
      );
      const fileName = (
        "Contract_" +
        (contract.contractCode || RECORD_ID) +
        "_" +
        (customer?.customerName || "") +
        ".html"
      ).replace(/\s+/g, "_");
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const formData = new window.FormData();
      formData.append("file", blob, fileName);

      // Tìm folder của Hợp đồng này để up vào đúng chỗ
      let targetFolderId = null;
      try {
        console.log("Searching folder for Contract RECORD_ID:", RECORD_ID);
        const folderRes = await ctx.api.request({
          url: "folders:list",
          params: {
            filter: JSON.stringify({ contractId: { $eq: parseInt(RECORD_ID) } }),
            pageSize: 1
          }
        });
        const folder = folderRes?.data?.data?.[0];
        if (folder?.id) {
          targetFolderId = folder.id;
          console.log("Found target folder:", targetFolderId);
          formData.append("folderId", targetFolderId);
        }
      } catch (fErr) {
        console.warn("Could not find contract folder:", fErr);
      }

      const uploadRes = await ctx.api.request({
        url: "attachments:create",
        method: "POST",
        params: { attachmentField: "documents.fileAttachment" },
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });
      const att = uploadRes?.data?.data;
      if (!att?.id) throw new Error("Upload failed");

      // Lấy thông tin User hiện tại
      let currentUserId = null;
      try {
        const authRes = await ctx.api.request({ url: "auth:check" });
        currentUserId = authRes?.data?.data?.id || authRes?.data?.id;
      } catch (err) {
        console.warn("Could not fetch current user info:", err);
      }

      await ctx.api.request({
        url: "contracts/" + RECORD_ID + "/documents:create",
        method: "POST",
        data: {
          collectionName: "Contract",
          recordId: parseInt(RECORD_ID),
          documentType: "Contract",
          folderId: targetFolderId,
          createdById: currentUserId,
          updatedById: currentUserId,
          createdAt: new Date().toISOString(),
          title: `${contract.contractCode || RECORD_ID} / Contract / CBI - ${
            customer?.shortName || customer?.customerName || "Customer"
          }`,
          note: "Auto exported on " + formatDate(null),
          fileAttachment: { id: att.id },
        },
      });
      message.success("Saved to Documents!");
    } catch (e) {
      console.error(e);
      message.error("Error: " + (e?.message || "Try again"));
    }
    setSaving(false);
  }, [contract, quotation, customer, company, services, svcDetails, saving]);

  const cStatus = String(contract?.status || "")
    .toLowerCase()
    .trim();
  const isExecution =
    cStatus === "execution" || cStatus === "active" || cStatus === "signed";

  const btnBase = {
    cursor: "pointer",
    fontSize: 12,
    padding: "6px 18px",
    borderRadius: 6,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "'IBM Plex Sans', Arial, sans-serif",
    fontWeight: 600,
    transition: "all 0.15s",
    border: "1px solid #1a3a5c",
  };
  const btnOutline = { ...btnBase, color: "#1a3a5c", background: "#fff" };
  const btnSolid = {
    ...btnBase,
    color: "#fff",
    background: saving ? "#8c8c8c" : "#1a3a5c",
    borderColor: saving ? "#8c8c8c" : "#1a3a5c",
    opacity: saving ? 0.7 : 1,
    cursor: saving ? "not-allowed" : "pointer",
  };

  if (!RECORD_ID)
    return React.createElement(
      "div",
      { style: { padding: 16, color: "#ff4d4f", fontSize: 13 } },
      "Record ID not found",
    );
  if (loading)
    return React.createElement(
      "div",
      { style: { padding: 16, textAlign: "center" } },
      React.createElement(Spin),
    );
  if (!contract)
    return React.createElement(
      "div",
      { style: { padding: 16, color: "#ff4d4f", fontSize: 13 } },
      "Failed to load contract data",
    );

  return React.createElement(
    "div",
    {
      style: {
        padding: "12px 16px",
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
      },
    },
    isExecution &&
      React.createElement(
        "div",
        {
          onClick: handleClick,
          style: btnOutline,
          onMouseEnter: (e) => {
            e.currentTarget.style.background = "#eff6ff";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.background = "#fff";
          },
        },
        "Create New Case",
      ),
    React.createElement(
      "div",
      {
        onClick: handleOpen,
        style: btnOutline,
        onMouseEnter: (e) => {
          e.currentTarget.style.background = "#eff6ff";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.background = "#fff";
        },
      },
      "View Contract",
    ),
    React.createElement(
      "div",
      {
        onClick: handleSaveDoc,
        style: btnSolid,
        onMouseEnter: (e) => {
          if (!saving) e.currentTarget.style.background = "#0f2640";
        },
        onMouseLeave: (e) => {
          if (!saving)
            e.currentTarget.style.background = saving ? "#8c8c8c" : "#1a3a5c";
        },
      },
      saving ? "⏳ Saving..." : "💾 Save to Documents",
    ),
    React.createElement(
      "div",
      {
        onClick: loadData,
        style: btnOutline,
        onMouseEnter: (e) => {
          e.currentTarget.style.background = "#eff6ff";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.background = "#fff";
        },
      },
      "🔄 Refresh",
    ),
    React.createElement(
      Modal,
      {
        open: !!previewHtml,
        onCancel: () => {
          setPreviewHtml(null);
        },
        footer: [
          React.createElement(
            Button,
            {
              key: "close",
              onClick: () => {
                setPreviewHtml(null);
              },
            },
            "Close",
          ),
        ],
        width: "85%",
        centered: true,
        title: React.createElement(
          "span",
          { style: { fontFamily: "'Times New Roman', Times, serif" } },
          "Preview Contract",
        ),
        bodyStyle: {
          padding: 0,
          height: "80vh",
          background: "#f5f5f5",
          position: "relative",
        },
      },
      previewHtml &&
        React.createElement("iframe", {
          id: "preview-iframe-contract",
          srcDoc: previewHtml,
          style: {
            width: "100%",
            height: "100%",
            border: "none",
            backgroundColor: "#fff",
          },
        }),
    ),
  );
};

ctx.render(React.createElement(ContractPDFBlock, null));
