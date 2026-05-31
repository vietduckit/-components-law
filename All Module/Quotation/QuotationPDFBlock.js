const { React } = ctx;
const { useState, useEffect, useCallback } = React;
const { Spin, Modal, Button } = ctx.antd;

// ==================== CONFIG ====================

const RECORD_ID = ctx.record?.id;
const POPUP_UID_INVOICE = "qlk80ukgcot";
const POPUP_UID_CONTRACT = "41125dcba6c";

const PAYMENT_TERMS_LABEL = {
  immediate: "Thanh toán ngay khi nhận đề xuất",
  "15days": "Thanh toán trong vòng 15 ngày",
  "30days": "Thanh toán trong vòng 30 ngày",
  "45days": "Thanh toán trong vòng 45 ngày",
  endFollowingMonth: "Thanh toán vào cuối tháng kế tiếp",
  balance: "Thanh toán theo số dư hợp đồng",
};

const pad2 = (n) => String(n).padStart(2, "0");
const formatDate = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return "";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const fmtVND = (val) => {
  const n = Number(val);
  if ((!val && val !== 0) || isNaN(n)) return "—";
  return n.toLocaleString("vi-VN") + " VNĐ";
};

// ==================== FETCH ====================
async function fetchQuotation(id) {
  try {
    const res = await ctx.api.request({
      url: `quotations:get`,
      params: {
        filterByTk: id,
        appends: [
          "lead",
          "internalCompany",
          "internalCompany.logo",
          "internalCompany.signatureImage",
          "internalCompany.stamp",
        ],
      },
    });
    return res?.data?.data || res?.data || null;
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function fetchServices(quotationId) {
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
  } catch {
    return {};
  }
}

// Lấy URL ảnh từ attachment
async function fetchAttachmentUrl(attachmentId) {
  if (!attachmentId) return null;
  try {
    const res = await ctx.api.request({
      url: `attachments:get`,
      params: { filterByTk: attachmentId },
    });
    const att = res?.data?.data || res?.data;
    return att?.url || att?.publicUrl || null;
  } catch {
    return null;
  }
}

// Lấy URL logo từ nhiều kiểu dữ liệu khác nhau
function extractLogoUrl(co) {
  // Thử các trường phổ biến
  const raw = co.logo || co.logoUrl || co.logoImage;
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    return first?.url || first?.publicUrl || first?.downloadURL || null;
  }
  if (typeof raw === "object") {
    return raw.url || raw.publicUrl || raw.downloadURL || null;
  }
  return null;
}

function extractSigUrl(co) {
  const raw = co.signatureImage || co.signatureImageUrl;
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    return first?.url || first?.publicUrl || first?.downloadURL || null;
  }
  if (typeof raw === "object") {
    return raw.url || raw.publicUrl || raw.downloadURL || null;
  }
  return null;
}

function extractStampUrl(co) {
  const raw = co.stamp || co.stampImage || co.companyStamp;
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    return first?.url || first?.publicUrl || first?.downloadURL || null;
  }
  if (typeof raw === "object") {
    return raw.url || raw.publicUrl || raw.downloadURL || null;
  }
  return null;
}

// ==================== HTML BUILDER ====================
function buildHTML(q, services, svcDetailMap) {
  // ── Thông tin khách hàng ──
  const lead = q.lead || {};
  const clientName = lead.companyName || lead.fullName || lead.name || "—";
  const clientNameShort = clientName.split(" ").slice(-1)[0] || clientName;
  const clientEmail = lead.email || "—";
  const clientPhone = lead.phone || "—";

  // ── Thông tin công ty nội bộ ──
  const co = q.internalCompany || {};
  const coName = co.name || co.companyName || "Công ty Luật";
  const coLegalName = co.legalName || coName;
  const coShortName = co.shortName || coName;
  const coEmail = co.email || "—";
  const coPhone = co.phone || "—";
  const coAddress = co.address || "";
  const coOffice = co.office || "";
  const coWebsite = co.website || "";
  const coTaxCode = co.taxCode || "";
  const sigName = co.signatureName || "—";
  const sigTitle = co.signatureTitle || "Giám đốc điều hành";
  const brandColor = co.brandColor || "#1a3a5c";
  const proposalPrefix = co.proposalPrefix || "Proposal";

  // Logo, chữ ký & dấu mộc
  const logoUrl = extractLogoUrl(co);
  const sigImgUrl = extractSigUrl(co);
  const stampUrl = extractStampUrl(co);

  // ── Số đề xuất ──
  const caseCode = q.quotationNumber || String(q.id);
  const docNumber = `${caseCode}/${proposalPrefix}/${clientName}`;
  const d = new Date();
  const dayStr = pad2(d.getDate());
  const monthStr = pad2(d.getMonth() + 1);
  const yearStr = d.getFullYear();

  // ── Nội dung snapshot ──
  const introText = q.snapshotIntroText || "";
  const overviewText = q.snapshotOverview || "";
  const scopeNote = q.snapshotServicesScopeNote || "";
  const vatNote =
    q.snapshotVatNote ||
    "Phí dịch vụ nói trên <strong>chưa</strong> bao gồm thuế GTGT và chi phí cho bên thứ ba, bao gồm nhưng không giới hạn phí chứng thực, công chứng, dịch thuật, hợp pháp hóa lãnh sự. Thuế suất thuế GTGT sẽ được tính căn cứ theo quy định tại thời điểm xuất hóa đơn.";
  const closingText =
    q.snapshotClosingText ||
    `Một lần nữa, Chúng Tôi rất vui mừng khi biết Quý Khách Hàng quan tâm đến dịch vụ của Chúng Tôi và Chúng Tôi mong đợi sự tin tưởng từ phía Khách Hàng. Nếu Quý Khách Hàng có bất kỳ câu hỏi nào, xin vui lòng liên hệ với Chúng Tôi theo địa chỉ email: <strong>${coEmail}</strong> hoặc số điện thoại <strong>${coPhone}</strong>.`;
  const termsText = q.snapshotTermsAndConditions || "";
  const description = q.serviceDescription || q.description || "";
  const isPackageMode =
    String(q.pricingMode || "").toLowerCase() === "package";

  const payTermLabel =
    PAYMENT_TERMS_LABEL[q.paymentTerms] || q.paymentTerms || "—";

  // ── Bảng dịch vụ ──
  const { subTotal, vatAmount, totalAmount, svcRows } = (() => {
    if (!services.length)
      return {
        subTotal: Number(q.subTotal) || 0,
        vatAmount: Number(q.vatAmount) || 0,
        totalAmount: Number(q.totalAmount) || 0,
        svcRows: `<tr><td colspan="4" style="text-align:center;color:#999;font-style:italic;padding:16px 0">Chưa có dịch vụ</td></tr>`,
      };
    let sub = 0,
      vat = 0,
      total = 0;
    const rows = services
      .map((s, i) => {
        const detail = svcDetailMap[s.serviceId] || {};
        const name = detail.name || `Dịch vụ #${s.serviceId}`;
        const qty = Number(s.quantity) || 1;
        const price = Number(s.basePrice) || 0;
        const vatPct = Number(s.vat) || 0;
        const sLine = price * qty;
        const vLine = (sLine * vatPct) / 100;
        const tLine = sLine + vLine;
        if (!isPackageMode) {
          sub += sLine;
          vat += vLine;
          total += tLine;
        }
        return `
        <tr>
          <td style="text-align:center;width:40px">${i + 1}.</td>
          <td>${name}</td>
          <td style="text-align:right;width:200px">${isPackageMode ? "Included in package" : fmtVND(price)}</td>
          <td style="text-align:center;width:120px"></td>
        </tr>`;
      })
      .join("");
    if (isPackageMode) {
      return {
        subTotal: Number(q.subTotal) || 0,
        vatAmount: Number(q.vatAmount) || 0,
        totalAmount: Number(q.totalAmount) || 0,
        svcRows: rows,
      };
    }
    return { subTotal: sub, vatAmount: vat, totalAmount: total, svcRows: rows };
  })();

  // ── Nội dung chi tiết từng dịch vụ ──
  const svcDetailSection = services
    .map((s, i) => {
      const detail = svcDetailMap[s.serviceId] || {};
      const name = detail.name || `Dịch vụ #${s.serviceId}`;
      const tasks = detail.tasks || [];
      const taskList = tasks.length
        ? tasks.map((t) => `<li>${t}</li>`).join("")
        : "<li>Tư vấn và hỗ trợ thực hiện theo yêu cầu của Khách Hàng.</li>";
      return `
    <div style="margin-bottom:20px">
      <p style="font-weight:bold;text-decoration:underline;margin-bottom:6px">Dịch vụ ${i + 1}: ${name}</p>
      <p style="font-style:italic;margin-bottom:4px">Công việc cụ thể gồm:</p>
      <ul style="margin:4px 0 8px 24px;padding:0">
        ${taskList}
      </ul>
      <p style="font-style:italic;margin-top:6px"><em>Thời gian thực hiện dự kiến:</em> <strong>15 ngày làm việc</strong> kể từ ngày nhận đủ hồ sơ hợp lệ.</p>
    </div>`;
    })
    .join("");

  // ── Phụ lục điều khoản – đánh số tự động ──
  const termsSection = termsText
    ? (() => {
        // Phân tích từng dòng, nhận diện điều khoản đánh số và nội dung
        const lines = termsText.split("\n").filter((l) => l.trim());
        const parsedLines = lines
          .map((line) => {
            const trimmed = line.trim();
            // Điều khoản đánh số: bắt đầu bằng số + dấu chấm
            const match = trimmed.match(/^(\d+)\.\s+(.+)/);
            if (match) {
              // Xóa bold/underline khỏi heading, chỉ giữ text
              const titleText = match[2]
                .replace(/\*\*/g, "")
                .replace(/__/g, "")
                .replace(/<\/?strong>/g, "")
                .replace(/<\/?u>/g, "");
              return `
          <p style="margin:18px 0 6px 0;font-weight:normal">
            <strong>${match[1]}.</strong>&nbsp;&nbsp;${titleText}
          </p>`;
            }
            // Dòng phụ (bắt đầu bằng (i), (ii), (iii)...)
            if (/^\([ivxlcdm]+\)/i.test(trimmed)) {
              return `<p style="margin:4px 0 4px 36px">${trimmed}</p>`;
            }
            // Đoạn văn thường
            return `<p style="margin:6px 0 6px 20px;text-align:justify">${trimmed}</p>`;
          })
          .join("");

        return `
    <div style="page-break-before:always;padding-top:10mm">
      <p style="font-size:13pt;font-weight:bold;text-align:center;text-transform:uppercase;letter-spacing:1px;margin:0 0 24px;padding-bottom:10px;border-bottom:2px solid ${brandColor};color:${brandColor}">
        PHỤ LỤC – ĐIỀU KHOẢN VÀ ĐIỀU KIỆN CHUNG
      </p>
      <div style="font-size:12pt;line-height:1.8">${parsedLines}</div>
      <p style="margin-top:24px;font-size:12pt;font-style:italic">
        Sau khi Ông/Bà đã đọc những Điều khoản và Điều kiện và các thư đính kèm cẩn thận, xin vui lòng xác nhận vào nội dung bên dưới và gửi lại cho Công ty.
      </p>
    </div>`;
      })()
    : "";

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<title>De Xuat Dich Vu Phap Ly - ${clientName}</title>
<style>
  :root { --brand: ${brandColor}; --gold: #c9a84c; --text: #1a1a1a; --sub: #444; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif; font-size:13pt; color:var(--text); background:#fff; line-height:1.7; }
  .page { width:100%; padding:18mm 22mm 18mm 22mm; }
  .section-h1 { font-size:13pt; font-weight:bold; color:var(--brand); text-transform:uppercase; letter-spacing:1px; margin:36px 0 14px; padding-bottom:5px; border-bottom:2px solid var(--brand); }
  .body-text { text-align:justify; }
  .body-text p { margin-bottom:12px; }
  .toc { margin:16px 0 20px 28px; }
  .toc li { margin-bottom:4px; }
  .fee-table { width:100%; border-collapse:collapse; font-size:12pt; margin:14px 0; }
  .fee-table thead tr { background:var(--brand); color:#fff; }
  .fee-table thead th { padding:9px 12px; font-weight:bold; text-align:left; font-size:11pt; border:1px solid var(--brand); }
  .fee-table thead th.r { text-align:right; }
  .fee-table thead th.c { text-align:center; }
  .fee-table tbody tr { border-bottom:1px solid #ddd; }
  .fee-table tbody tr:nth-child(even) { background:#f9fafb; }
  .fee-table tbody td { padding:8px 12px; border:1px solid #e0e0e0; vertical-align:top; }
  .fee-table tbody td.r { text-align:right; }
  .fee-table tfoot tr.subtotal td { padding:7px 12px; font-size:11.5pt; color:var(--sub); border:1px solid #e0e0e0; }
  .fee-table tfoot tr.subtotal td.r { text-align:right; }
  .fee-table tfoot tr.grand td { padding:10px 12px; font-weight:bold; font-size:13pt; background:var(--brand); color:#fff; border:1px solid var(--brand); }
  .fee-table tfoot tr.grand td.r { text-align:right; color:var(--gold); font-size:14pt; }
  .vat-note { margin:14px 0; font-size:12pt; text-align:justify; }
  .scope-exclusion { margin:14px 0 18px; font-size:12pt; text-align:justify; }
  .sig-block { margin:36px 0 20px; }
  .payment-note { background:#fffbf0; border:1px solid #f0e0a0; border-radius:4px; padding:13px 16px; margin:14px 0; font-size:12pt; }
  @media print {
    .page { padding:0; }
    body { padding:0; }
    @page { size:A4; margin:18mm 22mm; }
  }
</style>
</head>
<body>
<div class="page">

  <div style="min-height:250mm;display:flex;flex-direction:column;justify-content:space-between;padding:10mm 0 8mm">
    
    <div style="width: 100%; text-align: center; margin-bottom: 30px;">
      ${
        logoUrl
          ? `<img src="${logoUrl}" style="max-width:280px;max-height:300px;object-fit:contain;object-position:center;display:inline-block;" alt="${coName}" onerror="this.style.display='none';this.nextSibling.style.display='block'"/>
             <div style="display:none;font-size:22pt;font-weight:bold;color:var(--brand);">${coShortName}</div>`
          : `<div style="font-size:22pt;font-weight:bold;color:var(--brand);">${coShortName}</div>`
      }
    </div>

    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:30px">
      
      <div style="flex:1;min-width:0;text-align: right;">
        <div style="font-size:11.5pt;font-weight:bold;color:var(--brand);line-height:1.6;text-transform:uppercase;margin-bottom:8px">${coName}</div>
        <div style="font-size:9.5pt;color:var(--sub);line-height:1.8">
          ${coAddress ? `<div><strong>VP:</strong> ${coAddress}</div>` : ""}
          ${coOffice ? `<div><strong>VPGD:</strong> ${coOffice}</div>` : ""}
          ${coPhone ? `<div><strong>Phone:</strong> ${coPhone}</div>` : ""}
          ${coEmail ? `<div><strong>Email:</strong> ${coEmail}</div>` : ""}
          ${coWebsite ? `<div><strong>Website:</strong> ${coWebsite}</div>` : ""}
          ${coTaxCode ? `<div><strong>MST:</strong> ${coTaxCode}</div>` : ""}
        </div>
      </div>

      <div style="flex:1;min-width:0;text-align:right">
        <div style="font-size:18pt;font-weight:bold;color:var(--brand);text-transform:uppercase;letter-spacing:1px;line-height:1.2;margin-bottom:12px">ĐỀ XUẤT DỊCH VỤ PHÁP LÝ</div>
        <div style="font-size:14pt;font-weight:bold;color:var(--gold);margin-bottom:10px">${clientName}</div>
        <div style="font-size:10pt;color:var(--sub);font-style:italic;margin-bottom:2px">Số: ${docNumber}</div>
        <div style="font-size:10pt;color:var(--sub);font-style:italic">Ngày ${dayStr} tháng ${monthStr} năm ${yearStr}</div>
      </div>

    </div>

    <div style="border-top:2px solid var(--brand);margin-top:auto;padding-top:10px"></div>
  </div>

  <div style="page-break-before:always;padding-top:8mm">
    <p style="margin-bottom:20px"><strong>Kính gửi ${clientName},</strong></p>

    <div style="text-align:justify">
      <p style="margin-bottom:14px">
        Trước hết, Chúng Tôi xin chân thành cảm ơn <strong>${clientName}</strong>
        (sau đây gọi tắt là "<strong>${clientNameShort}</strong>" hoặc "<strong>Khách Hàng</strong>")
        đã quan tâm đến dịch vụ pháp lý của ${coName}
        (sau đây gọi tắt là "<strong>${coShortName}</strong>" hoặc "<strong>Chúng Tôi</strong>" hoặc "<strong>Công Ty</strong>").
      </p>
      ${description ? `<p style="margin-bottom:14px">Chúng Tôi được biết hiện nay <strong>${clientName}</strong> đang có nhu cầu <strong>${description}</strong>. Để hỗ trợ <strong>${clientName}</strong> trong việc thực hiện các công việc trên, Chúng Tôi hân hạnh đệ trình Bản đề xuất dịch vụ của ${coShortName}. Bản đề xuất bao gồm các phần sau:</p>` : ""}
    </div>

    <ol class="toc">
      <li>Kinh nghiệm của ${coShortName};</li>
      <li>Các dịch vụ mà ${coShortName} có thể cung cấp</li>
      <li>Phụ lục - Điều khoản và điều kiện chung.</li>
    </ol>

    <div class="section-h1">I. Kinh nghiệm của ${coShortName}</div>
    <div class="body-text">
      ${
        introText
          ? introText
              .split("\n")
              .filter((l) => l.trim())
              .map((l) => `<p>${l.trim()}</p>`)
              .join("")
          : `<p>${coLegalName} là công ty luật cung cấp dịch vụ pháp lý toàn diện cho khách hàng trong và ngoài nước.</p>`
      }
    </div>

    ${
      overviewText
        ? `
    <div class="section-h1">II. Tổng quan</div>
    <div class="body-text">
      ${overviewText
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => `<p>${l.trim()}</p>`)
        .join("")}
    </div>`
        : ""
    }

    <div class="section-h1">${overviewText ? "III" : "II"}. Các dịch vụ và chi phí</div>

    <p style="margin-bottom:16px">Trong bản đề xuất dịch vụ này, Chúng Tôi đề xuất cung cấp các dịch vụ sau:</p>

    ${svcDetailSection || `<p style="font-style:italic;color:#999">Chưa có dịch vụ nào được thêm.</p>`}

    <div class="scope-exclusion">
      ${
        scopeNote
          ? scopeNote
              .split("\n")
              .filter((l) => l.trim())
              .map((l) => `<p>${l.trim()}</p>`)
              .join("")
          : `<p>Để tránh hiểu nhầm, các dịch vụ pháp lý nêu trên không bao gồm (1) các vụ việc pháp lý, vụ án hoặc tranh chấp phát sinh liên quan đến Khách Hàng và (2) các vấn đề pháp lý khác ngoài phạm vi trong Mục này. Trong trường hợp này Các Bên sẽ thống nhất và xác lập một thoả thuận dịch vụ pháp lý khác liên quan.</p>`
      }
    </div>

    <p style="margin-bottom:14px">Dựa trên kinh nghiệm thực tiễn của Chúng Tôi, phí dịch vụ áp dụng cho các vụ việc tương tự được tính cụ thể như sau:</p>

    <table class="fee-table">
      <thead>
        <tr>
          <th style="width:40px;text-align:center">STT</th>
          <th>Nội dung dịch vụ</th>
          <th class="r" style="width:200px">Phí dịch vụ (VNĐ)</th>
          <th class="c" style="width:120px">Ghi chú</th>
        </tr>
      </thead>
      <tbody>${svcRows}</tbody>
      <tfoot>
        <tr class="subtotal">
          <td colspan="2" style="text-align:right;font-weight:bold">Tổng cộng (chưa VAT)</td>
          <td class="r">${fmtVND(subTotal)}</td>
          <td></td>
        </tr>
        ${
          vatAmount > 0
            ? `<tr class="subtotal">
          <td colspan="2" style="text-align:right">Thuế GTGT</td>
          <td class="r">${fmtVND(vatAmount)}</td>
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

    <p class="vat-note">${vatNote}</p>

    <p style="margin-bottom:14px;font-size:12pt">
      Xin lưu ý rằng kết quả thực hiện dịch vụ sẽ phụ thuộc vào việc đáp ứng các điều kiện luật định của Khách Hàng và tùy thuộc vào việc xem xét, đánh giá của cơ quan có thẩm quyền tùy từng thời điểm, tùy từng trường hợp cụ thể. ${coShortName} có trách nhiệm tư vấn cụ thể các điều kiện Khách Hàng cần đáp ứng và sẽ nỗ lực hết sức trong việc giải trình và làm việc với cơ quan nhà nước để đạt được kết quả tốt nhất.
    </p>

    <p style="margin-bottom:14px;font-size:12pt">
      Để biết thêm thông tin về thời hạn và điều kiện, vui lòng xem <strong>PHỤ LỤC - ĐIỀU KHOẢN VÀ ĐIỀU KIỆN CHUNG</strong> của Chúng Tôi.
    </p>

    ${
      payTermLabel
        ? `
    <div class="payment-note">
      <strong>Điều khoản thanh toán:</strong> ${coShortName} đề nghị ${payTermLabel}.
      ${q.validUntil ? `<br/><strong>Báo giá có hiệu lực đến:</strong> ${formatDate(q.validUntil)}.` : ""}
    </div>`
        : ""
    }

    <div style="margin:20px 0;text-align:justify">
      ${closingText
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => `<p style="margin-bottom:12px">${l.trim()}</p>`)
        .join("")}
    </div>

    <div class="sig-block">
      <div style="position:relative;display:inline-block;width:180px;height:120px;margin-bottom:8px">
        ${stampUrl ? `<img src="${stampUrl}"  style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:140px;height:140px;object-fit:contain;opacity:0.82;z-index:1"  alt="Dau moc"  onerror="this.style.display='none'"/>` : ""}
        ${sigImgUrl ? `<img src="${sigImgUrl}" style="position:absolute;bottom:0;left:50%;width:160px;height:100px;object-fit:contain;object-position:left bottom;z-index:2" alt="Chu ky" onerror="this.style.display='none'"/>` : '<div style="height:100px"></div>'}
      </div>
      <div style="font-weight:bold;font-size:13pt">${sigName}</div>
      <div style="font-size:12pt;color:var(--sub)">${sigTitle}</div>
    </div>

    ${termsSection}

  </div>
</div>
</body>
</html>`;
}

// ==================== MAIN COMPONENT ====================
const QuotationPDFBlock = () => {
  const [data, setData] = useState(null);
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
      const [q, svcs] = await Promise.all([
        fetchQuotation(RECORD_ID),
        fetchServices(RECORD_ID),
      ]);
      setData(q);
      setServices(svcs);
      if (svcs.length) {
        const ids = [...new Set(svcs.map((s) => s.serviceId).filter(Boolean))];
        const details = await fetchServiceDetails(ids);
        setSvcDetails(details);
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

  const handleClick = async (data) => {
    const type = data?.type;

    if (!type) return;

    const POPUP_UID =
      type === "Contract" ? POPUP_UID_CONTRACT : POPUP_UID_INVOICE;

    try {
      await ctx.openView(POPUP_UID, {
        mode: "dialog",
        size: "large",
        navigation: false,
      });
    } catch (error) {
      console.error("Lỗi khi mở popup:", error);
    }
  };

  const handleOpen = useCallback(() => {
    if (!data) return;
    const html = buildHTML(data, services, svcDetails);
    setPreviewHtml(html);
  }, [data, services, svcDetails]);

  const handleSaveDoc = useCallback(async () => {
    if (!data || saving) return;
    setSaving(true);
    const { message } = ctx.antd;
    try {
      const html = buildHTML(data, services, svcDetails);
      const fileName = (
        "Quotation_" +
        (data.quotationNumber || RECORD_ID) +
        "_" +
        (data.lead?.customerName || "") +
        ".html"
      ).replace(/\s+/g, "_");
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const formData = new window.FormData();
      formData.append("file", blob, fileName);

      // Tìm folder của Báo giá này để up vào đúng chỗ
      let targetFolderId = null;
      try {
        console.log("Searching folder for RECORD_ID:", RECORD_ID);
        const folderRes = await ctx.api.request({
          url: "folders:list",
          params: {
            filter: JSON.stringify({ quotationId: { $eq: parseInt(RECORD_ID) } }),
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
        console.warn("Could not find quotation folder:", fErr);
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

      // Lấy thông tin User hiện tại để ghi nhận người upload
      let currentUserId = null;
      try {
        const authRes = await ctx.api.request({ url: "auth:check" });
        currentUserId = authRes?.data?.data?.id || authRes?.data?.id;
      } catch (err) {
        console.warn("Could not fetch current user info:", err);
      }

      await ctx.api.request({
        url: "quotations/" + RECORD_ID + "/documents:create",
        method: "POST",
        data: {
          collectionName: "Quotation",
          recordId: parseInt(RECORD_ID),
          documentType: "Proposal",
          folderId: targetFolderId,
          createdById: currentUserId,
          updatedById: currentUserId,
          createdAt: new Date().toISOString(),
          title: `${data.quotationNumber || RECORD_ID} / Proposal / CBI - ${
            data.customer?.shortName ||
            data.lead?.shortName ||
            data.customer?.customerName ||
            data.lead?.fullName ||
            "Customer"
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
  }, [data, services, svcDetails, saving]);

  // ── Render ──
  const qStatus = String(data?.status || '').toLowerCase().trim();
  const isOrder = qStatus === 'order' || qStatus === 'ordered' || qStatus === 'won' || qStatus === 'approved';

  const btnStyle = {
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
    color: "#1a3a5c",
    background: "#fff",
  };

  if (!RECORD_ID)
    return React.createElement(
      "div",
      {
        style: { padding: 16, color: "#ff4d4f", fontSize: 13 },
      },
      "Record ID not found in URL",
    );

  if (loading)
    return React.createElement(
      "div",
      {
        style: { padding: 16, textAlign: "center" },
      },
      React.createElement(Spin),
    );

  if (!data)
    return React.createElement(
      "div",
      {
        style: { padding: 16, color: "#ff4d4f", fontSize: 13 },
      },
      "Failed to load quotation data",
    );

  const btnSave = Object.assign({}, btnStyle, {
    color: "#fff",
    background: saving ? "#8c8c8c" : "#1a3a5c",
    borderColor: saving ? "#8c8c8c" : "#1a3a5c",
    opacity: saving ? 0.7 : 1,
    cursor: saving ? "not-allowed" : "pointer",
  });

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
    isOrder && React.createElement(
      "div",
      {
        onClick: () => handleClick({ type: "Invoice" }),
        style: btnStyle,
        onMouseEnter: (e) => {
          e.currentTarget.style.background = "#eff6ff";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.background = "#fff";
        },
      },
      "Create New Invoice",
    ),
    isOrder && React.createElement(
      "div",
      {
        onClick: () => handleClick({ type: "Contract" }),
        style: btnStyle,
        onMouseEnter: (e) => {
          e.currentTarget.style.background = "#eff6ff";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.background = "#fff";
        },
      },
      "Create New Contract",
    ),
    React.createElement(
      "div",
      {
        onClick: handleOpen,
        style: btnStyle,
        onMouseEnter: (e) => {
          e.currentTarget.style.background = "#eff6ff";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.background = "#fff";
        },
      },
      "View Quotation",
    ),
    React.createElement(
      "div",
      {
        onClick: handleSaveDoc,
        style: btnSave,
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
        style: btnStyle,
        onMouseEnter: (e) => {
          e.currentTarget.style.background = "#eff6ff";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.background = "#fff";
        },
      },
      "🔄 Refresh",
    ),
    React.createElement(Modal, {
      open: !!previewHtml,
      onCancel: () => {
        setPreviewHtml(null);
      },
      footer: [
        React.createElement(Button, { key: 'close', onClick: () => {
          setPreviewHtml(null);
        } }, 'Close')
      ],
      width: '85%',
      centered: true,
      title: React.createElement('span', { style: { fontFamily: "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif" } }, 'Preview Quotation'),
      bodyStyle: { padding: 0, height: '80vh', background: '#f5f5f5', position: 'relative' }
    },
      previewHtml && React.createElement('iframe', { id: 'preview-iframe-quotation', srcDoc: previewHtml, style: { width: '100%', height: '100%', border: 'none', backgroundColor: '#fff' } })
    )
  );
};

ctx.render(React.createElement(QuotationPDFBlock, null));
