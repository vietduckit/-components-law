  const { React } = ctx;
  const { useCallback, useEffect, useMemo, useState } = React;
  const { Button, Modal, Spin, message } = ctx.antd;

  const h = React.createElement;
  const FONT =
    "Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  const RECORD_ID =
    ctx.record?.id ||
    (() => {
      const parts = (window.location.pathname || "").split("/");
      const idx = parts.indexOf("filterbytk");
      return idx !== -1 ? parts[idx + 1] : null;
    })();

  const COMPANY_FALLBACK = {
    name: "CÔNG TY LUẬT TNHH CBI",
    legalName: "Corporate Business Investment Law Firm",
    shortName: "CBI",
    taxCode: "",
    address: "",
    email: "",
    phone: "",
    website: "law.samset.net",
    bankName: "Agribank",
    bankAccountName: "Võ Văn Việt",
    bankAccountNumber: "600xxxxxxx",
    bankBranch: "Long Điền, BR-VT",
    brandColor: "153A5B",
  };

  const PAYMENT_TERMS_LABEL = {
    immediate: "Thanh toán ngay khi nhận hóa đơn",
    "15days": "Thanh toán trong vòng 15 ngày",
    "30days": "Thanh toán trong vòng 30 ngày",
    "45days": "Thanh toán trong vòng 45 ngày",
    endFollowingMonth: "Thanh toán vào cuối tháng kế tiếp",
    balance: "Thanh toán theo số dư hợp đồng",
  };

  const INVOICE_TYPE_LABEL = {
    advance: "Tạm ứng",
    final: "Quyết toán",
    partial: "Thanh toán một phần",
    full: "Thanh toán toàn bộ",
  };

  const asArray = (value) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };

  const firstItem = (value) => {
    const list = asArray(value).filter(Boolean);
    return list[0] || null;
  };

  const extractId = (value) => {
    if (value === null || value === undefined || value === "") return null;
    if (Array.isArray(value)) return value.length ? extractId(value[0]) : null;
    if (typeof value === "object") return extractId(value.id);
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const num = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const isPackagePricing = (record) =>
    String(record?.pricingMode || "").toLowerCase() === "package";

  const inferVatRate = (subTotal, vatAmount, fallback = 0) => {
    const sub = num(subTotal);
    return sub ? Math.round((num(vatAmount) * 10000) / sub) / 100 : num(fallback);
  };

  const cleanFileName = (value) =>
    String(value || "")
      .replace(/[\\/:*?"<>|]+/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 150);

  const stripHtml = (value) =>
    String(value || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+\n/g, "\n")
      .replace(/\n\s+/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();

  const formatCurrency = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "—";
    return amount.toLocaleString("vi-VN") + " đ";
  };

  const formatCurrencyDocx = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "";
    return amount.toLocaleString("vi-VN") + " VND";
  };

  const pad2 = (value) => String(value).padStart(2, "0");

  const formatDate = (iso) => {
    const date = iso ? new Date(iso) : new Date();
    if (Number.isNaN(date.getTime())) return "—";
    return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
  };

  const formatDateLong = (iso) => {
    const date = iso ? new Date(iso) : new Date();
    if (Number.isNaN(date.getTime())) return "";
    return `ngày ${pad2(date.getDate())} tháng ${pad2(
      date.getMonth() + 1,
    )} năm ${date.getFullYear()}`;
  };

  function numberToWords(value) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n <= 0) return "Không đồng";
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
    const readGroup = (group) => {
      if (!group) return "";
      const h100 = Math.floor(group / 100);
      const t10 = Math.floor((group % 100) / 10);
      const unit = group % 10;
      let text = "";
      if (h100) text += units[h100] + " trăm";
      if (t10) text += (text ? " " : "") + tens[t10];
      else if (h100 && unit) text += " linh";
      if (unit) text += (text ? " " : "") + units[unit];
      return text;
    };
    const billions = Math.floor(n / 1000000000);
    const millions = Math.floor((n % 1000000000) / 1000000);
    const thousands = Math.floor((n % 1000000) / 1000);
    const rest = n % 1000;
    let result = "";
    if (billions) result += readGroup(billions) + " tỷ";
    if (millions)
      result += (result ? " " : "") + readGroup(millions) + " triệu";
    if (thousands)
      result += (result ? " " : "") + readGroup(thousands) + " nghìn";
    if (rest) result += (result ? " " : "") + readGroup(rest);
    return result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
  }

  const normalizeCompany = (raw) => {
    const source = firstItem(raw) || {};
    return {
      name:
        source.name ||
        source.legalName ||
        source.companyName ||
        COMPANY_FALLBACK.name,
      legalName:
        source.legalName ||
        source.name ||
        source.companyName ||
        COMPANY_FALLBACK.legalName,
      shortName: source.shortName || source.companyCode || COMPANY_FALLBACK.shortName,
      taxCode: source.taxCode || source.businessLicense || COMPANY_FALLBACK.taxCode,
      address: source.address || source.office || COMPANY_FALLBACK.address,
      email: source.email || COMPANY_FALLBACK.email,
      phone: source.phone || COMPANY_FALLBACK.phone,
      website: source.website || COMPANY_FALLBACK.website,
      bankName: source.bankName || source.bank || COMPANY_FALLBACK.bankName,
      bankAccountName:
        source.bankAccountName || source.accountName || COMPANY_FALLBACK.bankAccountName,
      bankAccountNumber:
        source.bankAccountNumber ||
        source.accountNumber ||
        source.account ||
        COMPANY_FALLBACK.bankAccountNumber,
      bankBranch: source.bankBranch || source.branch || COMPANY_FALLBACK.bankBranch,
      brandColor: String(source.brandColor || COMPANY_FALLBACK.brandColor).replace(
        "#",
        "",
      ),
    };
  };

  const normalizeCustomer = (invoice, contract, quotation, lead) => {
    const customer =
      firstItem(invoice?.customers) ||
      firstItem(contract?.customers) ||
      firstItem(quotation?.customers);
    const source = customer || lead || {};
    const name =
      source.customerName ||
      source.companyName ||
      source.fullName ||
      source.contactName ||
      source.name ||
      "Khách hàng";
    return {
      name,
      shortName: source.shortName || source.companyShortName || name,
      address: source.address || source.companyAddress || "",
      email: source.email || "",
      phone: source.phone || source.mobile || "",
      taxCode: source.taxCode || source.companyTaxCode || "",
      representative:
        source.coporate_representative ||
        source.corporateRepresentative ||
        source.representativeName ||
        source.legalRepresentative ||
        "",
    };
  };

  const getInvoiceQuotation = (invoice) =>
    firstItem(invoice?.quotations) ||
    firstItem(invoice?.quotation) ||
    invoice?.quotation ||
    {};

  const getInvoiceContractId = (invoice) =>
    extractId(invoice?.contractId) ||
    extractId(invoice?.contracts) ||
    extractId(invoice?.contract);

  const buildInvoiceModel = (invoice, contract, quotation, lead, services, serviceMap) => {
    const resolvedQuotation = quotation || getInvoiceQuotation(invoice);
    const company = normalizeCompany(
      invoice?.internalCompany ||
        contract?.internalCompany ||
        resolvedQuotation?.internalCompany,
    );
    const customer = normalizeCustomer(invoice, contract, resolvedQuotation, lead);
    const invoiceNumber = invoice?.invoiceNumber || `INV-${RECORD_ID}`;

    const packageMode = isPackagePricing(resolvedQuotation);
    const serviceNames = (services || []).map((item, index) => {
      const serviceDetail = serviceMap?.[extractId(item.serviceId)] || {};
      return (
        item.serviceName ||
        item.name ||
        serviceDetail.serviceName ||
        serviceDetail.name ||
        `Dá»‹ch vá»¥ phÃ¡p lÃ½ #${extractId(item.serviceId) || index + 1}`
      );
    });
    let lines = (services || []).map((item, index) => {
      const serviceDetail = serviceMap?.[extractId(item.serviceId)] || {};
      const name =
        item.serviceName ||
        item.name ||
        serviceDetail.serviceName ||
        serviceDetail.name ||
        `Dịch vụ pháp lý #${extractId(item.serviceId) || index + 1}`;
      const quantity = num(item.quantity) || 1;
      const unitPrice = num(item.basePrice || item.price || item.unitPrice);
      const subTotal = num(item.subTotal) || unitPrice * quantity;
      const vatRate = num(item.vat || item.vatRate);
      const vatAmount = num(item.vatAmount) || Math.round((subTotal * vatRate) / 100);
      const totalAmount = num(item.totalAmount) || subTotal + vatAmount;
      return {
        index: index + 1,
        name,
        description: stripHtml(item.description || item.scopeOfWork || ""),
        quantity,
        unitPrice,
        subTotal,
        vatRate,
        vatAmount,
        totalAmount,
      };
    });

    if (packageMode) {
      const packageSubTotal = num(invoice?.subTotal) || num(resolvedQuotation?.subTotal);
      const packageVatAmount = num(invoice?.vatAmount) || num(resolvedQuotation?.vatAmount);
      const packageTotal =
        num(invoice?.totalAmount || invoice?.grandTotal || invoice?.amount) ||
        num(resolvedQuotation?.totalAmount || resolvedQuotation?.grandTotal) ||
        packageSubTotal + packageVatAmount;
      lines = [{
        index: 1,
        name: invoice?.title || `Gói dịch vụ pháp lý theo báo giá ${resolvedQuotation?.quotationNumber || resolvedQuotation?.code || resolvedQuotation?.id || ""}`.trim(),
        description: serviceNames.filter(Boolean).join("; "),
        quantity: 1,
        unitPrice: packageSubTotal,
        subTotal: packageSubTotal,
        vatRate: num(resolvedQuotation?.packageVatRate) || inferVatRate(packageSubTotal, packageVatAmount, 0),
        vatAmount: packageVatAmount,
        totalAmount: packageTotal,
      }];
    }

    const lineSubTotal = lines.reduce((sum, item) => sum + item.subTotal, 0);
    const lineVatAmount = lines.reduce((sum, item) => sum + item.vatAmount, 0);
    const lineTotalAmount = lines.reduce((sum, item) => sum + item.totalAmount, 0);
    const subTotal = lineSubTotal;
    const vatAmount = lineVatAmount;
    const totalAmount = lineTotalAmount || lineSubTotal + lineVatAmount;

    return {
      invoice,
      contract,
      quotation: resolvedQuotation,
      company,
      customer,
      invoiceNumber,
      title: invoice?.title || "Hóa đơn dịch vụ pháp lý",
      invoiceType:
        INVOICE_TYPE_LABEL[invoice?.invoiceType] ||
        invoice?.invoiceType ||
        "Thanh toán dịch vụ pháp lý",
      issuedDate: invoice?.issuedDate || invoice?.createdAt || new Date().toISOString(),
      deadline:
        invoice?.deadline ||
        invoice?.dueDate ||
        contract?.deadline ||
        resolvedQuotation?.deadline ||
        null,
      paymentTerms:
        PAYMENT_TERMS_LABEL[invoice?.paymentTerms || resolvedQuotation?.paymentTerms] ||
        invoice?.paymentTerms ||
        resolvedQuotation?.paymentTerms ||
        "Theo thỏa thuận giữa các bên",
      description: stripHtml(
        invoice?.description ||
          contract?.description ||
          resolvedQuotation?.serviceDescription ||
          resolvedQuotation?.description ||
          resolvedQuotation?.overview ||
          "",
      ),
      terms: stripHtml(
        invoice?.termsCondition ||
          contract?.termsCondition ||
          resolvedQuotation?.termsCondition ||
          "",
      ),
      lines,
      subTotal,
      vatAmount,
      totalAmount,
      totalInWords: numberToWords(totalAmount),
    };
  };

  async function fetchInvoice(id) {
    try {
      const res = await ctx.api.request({
        url: "invoices:get",
        params: {
          filterByTk: id,
          appends: ["contracts", "quotations", "customers", "internalCompany"],
        },
      });
      return res?.data?.data || res?.data || null;
    } catch (error) {
      console.error("fetchInvoice error:", error);
      return null;
    }
  }

  async function fetchContract(contractId) {
    if (!contractId) return null;
    try {
      const res = await ctx.api.request({
        url: "contracts:get",
        params: {
          filterByTk: contractId,
          appends: ["customers", "quotations", "internalCompany"],
        },
      });
      return res?.data?.data || res?.data || null;
    } catch (error) {
      console.error("fetchContract error:", error);
      return null;
    }
  }

  async function fetchQuotationByContractId(contractId, contractData) {
    if (!contractId) return null;

    try {
      const res = await ctx.api.request({
        url: "quotations:list",
        params: {
          pageSize: 1,
          page: 1,
          sort: ["-id"],
          filter: JSON.stringify({
            contracts: { id: { $eq: parseInt(contractId, 10) } },
          }),
          appends: ["customers", "lead", "internalCompany", "contracts"],
        },
      });
      const found = res?.data?.data?.[0];
      if (found) return found;
    } catch (error) {
      console.warn("Không tìm được quotation theo contracts relation:", error);
    }

    const appendedQuotation = firstItem(contractData?.quotations);
    if (appendedQuotation) return appendedQuotation;

    const fallbackQuotationId =
      extractId(contractData?.quotationId) || extractId(contractData?.quotation);
    if (!fallbackQuotationId) return null;

    try {
      const res = await ctx.api.request({
        url: "quotations:get",
        params: {
          filterByTk: fallbackQuotationId,
          appends: ["customers", "lead", "internalCompany"],
        },
      });
      return res?.data?.data || res?.data || null;
    } catch (error) {
      console.error("fetchQuotationByContractId fallback error:", error);
      return null;
    }
  }

  async function fetchLead(leadId) {
    if (!leadId) return null;
    try {
      const res = await ctx.api.request({
        url: "lead:get",
        params: { filterByTk: leadId },
      });
      return res?.data?.data || res?.data || null;
    } catch {
      return null;
    }
  }

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
    } catch {
      return [];
    }
  }

  async function fetchServiceDetails(serviceIds) {
    const ids = Array.from(new Set((serviceIds || []).map(extractId).filter(Boolean)));
    if (!ids.length) return {};
    try {
      const res = await ctx.api.request({
        url: "services:list",
        params: {
          pageSize: 500,
          page: 1,
          filter: JSON.stringify({ id: { $in: ids } }),
        },
      });
      const map = {};
      (res?.data?.data || []).forEach((item) => {
        map[extractId(item.id)] = item;
      });
      return map;
    } catch {
      return {};
    }
  }

  async function getCurrentUser() {
    try {
      const res = await ctx.api.request({ url: "auth:check", method: "GET" });
      return res?.data?.data || res?.data || null;
    } catch {
      return null;
    }
  }

  async function findInvoiceFolder(invoiceId) {
    try {
      const res = await ctx.api.request({
        url: "folders:list",
        params: {
          pageSize: 1,
          page: 1,
          filter: JSON.stringify({ invoiceId: { $eq: parseInt(invoiceId) } }),
        },
      });
      return extractId(res?.data?.data?.[0]?.id);
    } catch {
      return null;
    }
  }

  async function getNextFileIndex(folderId, collectionName, recordId) {
    try {
      const filter = folderId
        ? { folderId: { $eq: folderId } }
        : {
            $and: [
              { collectionName: { $eq: collectionName } },
              { recordId: { $eq: parseInt(recordId) } },
            ],
          };
      const res = await ctx.api.request({
        url: "documents:list",
        params: {
          pageSize: 1,
          page: 1,
          filter: JSON.stringify(filter),
          sort: ["-fileIndex"],
        },
      });
      return (num(res?.data?.data?.[0]?.fileIndex) || 0) + 1;
    } catch {
      return 1;
    }
  }

  async function uploadAttachment(blob, fileName) {
    const formData = new window.FormData();
    formData.append("file", blob, fileName);
    const res = await ctx.api.request({
      url: "attachments:create",
      method: "POST",
      params: { attachmentField: "documents.fileAttachment" },
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });
    const attachment = res?.data?.data;
    if (!attachment?.id) throw new Error("Upload file không thành công.");
    return attachment;
  }

  const getPublicUrl = (attachment) => {
    const url = attachment?.url || attachment?.preview || attachment?.publicUrl;
    if (!url) return null;
    return url.startsWith("/") ? window.location.origin + url : url;
  };

  const createTextRun = (TextRun, text, opts = {}) =>
    new TextRun({
      text: String(text ?? ""),
      font: "Times New Roman",
      size: opts.size || 22,
      bold: !!opts.bold,
      italics: !!opts.italics,
      color: opts.color || "1F2937",
      allCaps: !!opts.allCaps,
    });

  const createParagraph = (Paragraph, TextRun, text, opts = {}) =>
    new Paragraph({
      alignment: opts.alignment,
      spacing: { before: opts.before || 0, after: opts.after || 100 },
      children: Array.isArray(text)
        ? text
        : [createTextRun(TextRun, text, opts)],
    });

  const createCell = (TableCell, Paragraph, TextRun, content, opts = {}) => {
    const borderColor = opts.borderColor || "D9E2EC";
    const borderStyle = {
      style: opts.borderStyle,
      size: 1,
      color: borderColor,
    };
    const children = Array.isArray(content)
      ? content
      : [createParagraph(Paragraph, TextRun, content, opts)];
    return new TableCell({
      width: opts.width,
      columnSpan: opts.columnSpan,
      shading: opts.fill ? { fill: opts.fill } : undefined,
      margins: { top: 110, bottom: 110, left: 130, right: 130 },
      borders: {
        top: borderStyle,
        bottom: borderStyle,
        left: borderStyle,
        right: borderStyle,
      },
      children,
    });
  };

  async function buildDocxBlob(model) {
    const docxModule = await ctx.importAsync("https://esm.sh/docx@8.5.0?bundle");
    const {
      AlignmentType,
      BorderStyle,
      Document,
      Packer,
      Paragraph,
      Table,
      TableCell,
      TableRow,
      TextRun,
      WidthType,
    } = docxModule;

    const brand = model.company.brandColor || "153A5B";
    const p = (text, opts) => createParagraph(Paragraph, TextRun, text, opts);
    const cell = (content, opts = {}) =>
      createCell(TableCell, Paragraph, TextRun, content, {
        borderStyle: BorderStyle.SINGLE,
        ...opts,
      });
    const noBorderCell = (content, opts = {}) =>
      createCell(TableCell, Paragraph, TextRun, content, {
        borderStyle: BorderStyle.NONE,
        ...opts,
      });

    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            noBorderCell(
              [
                p(model.company.name, {
                  size: 28,
                  bold: true,
                  color: brand,
                  after: 40,
                }),
                p(model.company.legalName, {
                  size: 18,
                  allCaps: true,
                  color: "64748B",
                  after: 60,
                }),
                p(model.company.address || "Địa chỉ: —", { size: 18, after: 20 }),
                p(
                  [
                    createTextRun(TextRun, "MST: ", {
                      bold: true,
                      size: 18,
                      color: "475569",
                    }),
                    createTextRun(TextRun, model.company.taxCode || "—", {
                      size: 18,
                    }),
                  ],
                  { after: 20 },
                ),
                p(
                  [model.company.email, model.company.phone, model.company.website]
                    .filter(Boolean)
                    .join(" | ") || "Thông tin liên hệ: —",
                  { size: 18, color: "475569" },
                ),
              ],
              { width: { size: 58, type: WidthType.PERCENTAGE } },
            ),
            noBorderCell(
              [
                p("HÓA ĐƠN DỊCH VỤ", {
                  size: 34,
                  bold: true,
                  color: brand,
                  alignment: AlignmentType.RIGHT,
                  after: 80,
                }),
                p(`Số: ${model.invoiceNumber}`, {
                  size: 22,
                  bold: true,
                  alignment: AlignmentType.RIGHT,
                  after: 40,
                }),
                p(`Ngày phát hành: ${formatDate(model.issuedDate)}`, {
                  size: 18,
                  alignment: AlignmentType.RIGHT,
                  after: 20,
                }),
                p(`Hạn thanh toán: ${formatDate(model.deadline)}`, {
                  size: 18,
                  alignment: AlignmentType.RIGHT,
                }),
              ],
              { width: { size: 42, type: WidthType.PERCENTAGE } },
            ),
          ],
        }),
      ],
    });

    const infoTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cell("BÊN NHẬN HÓA ĐƠN", {
              fill: "EEF6FF",
              bold: true,
              color: brand,
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
            cell("THÔNG TIN THANH TOÁN", {
              fill: "F8FAFC",
              bold: true,
              color: brand,
              width: { size: 50, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
        new TableRow({
          children: [
            cell(
              [
                p(model.customer.name, { bold: true, size: 22, after: 50 }),
                p(`Mã số thuế: ${model.customer.taxCode || "—"}`, {
                  size: 19,
                  after: 25,
                }),
                p(`Địa chỉ: ${model.customer.address || "—"}`, {
                  size: 19,
                  after: 25,
                }),
                p(`Email/SĐT: ${[model.customer.email, model.customer.phone].filter(Boolean).join(" | ") || "—"}`, {
                  size: 19,
                }),
              ],
              {},
            ),
            cell(
              [
                p(`Loại hóa đơn: ${model.invoiceType}`, { size: 19, after: 25 }),
                p(`Điều khoản: ${model.paymentTerms}`, { size: 19, after: 25 }),
                p(`Báo giá: ${model.quotation?.quotationNumber || "—"}`, {
                  size: 19,
                  after: 25,
                }),
                p(`Ngày lập file: ${formatDateLong(null)}`, { size: 19 }),
              ],
              {},
            ),
          ],
        }),
      ],
    });

    const serviceRows = [
      new TableRow({
        tableHeader: true,
        children: [
          cell("STT", {
            fill: brand,
            color: "FFFFFF",
            bold: true,
            alignment: AlignmentType.CENTER,
            width: { size: 7, type: WidthType.PERCENTAGE },
          }),
          cell("Nội dung dịch vụ pháp lý", {
            fill: brand,
            color: "FFFFFF",
            bold: true,
            width: { size: 39, type: WidthType.PERCENTAGE },
          }),
          cell("SL", {
            fill: brand,
            color: "FFFFFF",
            bold: true,
            alignment: AlignmentType.CENTER,
            width: { size: 8, type: WidthType.PERCENTAGE },
          }),
          cell("Đơn giá", {
            fill: brand,
            color: "FFFFFF",
            bold: true,
            alignment: AlignmentType.RIGHT,
            width: { size: 15, type: WidthType.PERCENTAGE },
          }),
          cell("VAT", {
            fill: brand,
            color: "FFFFFF",
            bold: true,
            alignment: AlignmentType.RIGHT,
            width: { size: 10, type: WidthType.PERCENTAGE },
          }),
          cell("Thành tiền", {
            fill: brand,
            color: "FFFFFF",
            bold: true,
            alignment: AlignmentType.RIGHT,
            width: { size: 21, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
      ...(model.lines.length
        ? model.lines.map(
            (line) =>
              new TableRow({
                children: [
                  cell(String(line.index), { alignment: AlignmentType.CENTER }),
                  cell(
                    [
                      p(line.name, { bold: true, size: 20, after: 25 }),
                      line.description
                        ? p(line.description, {
                            size: 18,
                            color: "64748B",
                            italics: true,
                          })
                        : p("", { after: 0 }),
                    ],
                    {},
                  ),
                  cell(String(line.quantity), { alignment: AlignmentType.CENTER }),
                  cell(formatCurrencyDocx(line.unitPrice), {
                    alignment: AlignmentType.RIGHT,
                  }),
                  cell(formatCurrencyDocx(line.vatAmount), {
                    alignment: AlignmentType.RIGHT,
                  }),
                  cell(formatCurrencyDocx(line.totalAmount), {
                    alignment: AlignmentType.RIGHT,
                    bold: true,
                  }),
                ],
              }),
          )
        : [
            new TableRow({
              children: [
                cell("Chưa có dòng dịch vụ", {
                  columnSpan: 6,
                  alignment: AlignmentType.CENTER,
                  color: "94A3B8",
                  italics: true,
                }),
              ],
            }),
          ]),
      new TableRow({
        children: [
          cell("Tổng phí dịch vụ trước VAT", {
            columnSpan: 5,
            alignment: AlignmentType.RIGHT,
            bold: true,
          }),
          cell(formatCurrencyDocx(model.subTotal), {
            alignment: AlignmentType.RIGHT,
            bold: true,
          }),
        ],
      }),
      new TableRow({
        children: [
          cell("Thuế VAT", {
            columnSpan: 5,
            alignment: AlignmentType.RIGHT,
            bold: true,
          }),
          cell(formatCurrencyDocx(model.vatAmount), {
            alignment: AlignmentType.RIGHT,
            bold: true,
          }),
        ],
      }),
      new TableRow({
        children: [
          cell("TỔNG CỘNG THANH TOÁN", {
            columnSpan: 5,
            fill: brand,
            color: "FFFFFF",
            bold: true,
            alignment: AlignmentType.RIGHT,
            size: 22,
          }),
          cell(formatCurrencyDocx(model.totalAmount), {
            fill: brand,
            color: "FFFFFF",
            bold: true,
            alignment: AlignmentType.RIGHT,
            size: 22,
          }),
        ],
      }),
    ];

    const serviceTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: serviceRows,
    });

    const paymentTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            cell(
              [
                p("THÔNG TIN CHUYỂN KHOẢN", {
                  bold: true,
                  color: brand,
                  after: 60,
                }),
                p(`Ngân hàng: ${model.company.bankName || "—"}`, {
                  size: 19,
                  after: 25,
                }),
                p(`Chủ tài khoản: ${model.company.bankAccountName || "—"}`, {
                  size: 19,
                  after: 25,
                }),
                p(`Số tài khoản: ${model.company.bankAccountNumber || "—"}`, {
                  size: 22,
                  bold: true,
                  color: brand,
                  after: 25,
                }),
                p(`Chi nhánh: ${model.company.bankBranch || "—"}`, { size: 19 }),
              ],
              { fill: "F8FAFC", width: { size: 55, type: WidthType.PERCENTAGE } },
            ),
            cell(
              [
                p("NỘI DUNG THANH TOÁN", {
                  bold: true,
                  color: brand,
                  after: 60,
                }),
                p(`${model.invoiceNumber} - ${model.customer.shortName}`, {
                  size: 22,
                  bold: true,
                  color: brand,
                  after: 90,
                }),
                p("Vui lòng thanh toán đúng nội dung để hệ thống đối soát nhanh.", {
                  size: 18,
                  italics: true,
                  color: "64748B",
                }),
              ],
              { fill: "FFFBEB", width: { size: 45, type: WidthType.PERCENTAGE } },
            ),
          ],
        }),
      ],
    });

    const signatureTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            noBorderCell(
              [
                p("ĐẠI DIỆN CÔNG TY LUẬT", {
                  bold: true,
                  alignment: AlignmentType.CENTER,
                  after: 40,
                }),
                p("(Ký, ghi rõ họ tên và đóng dấu)", {
                  italics: true,
                  color: "64748B",
                  alignment: AlignmentType.CENTER,
                  after: 850,
                }),
                p(model.company.shortName || model.company.name, {
                  alignment: AlignmentType.CENTER,
                }),
              ],
              { width: { size: 50, type: WidthType.PERCENTAGE } },
            ),
            noBorderCell(
              [
                p("KHÁCH HÀNG", {
                  bold: true,
                  alignment: AlignmentType.CENTER,
                  after: 40,
                }),
                p("(Ký và ghi rõ họ tên)", {
                  italics: true,
                  color: "64748B",
                  alignment: AlignmentType.CENTER,
                  after: 850,
                }),
                p(model.customer.name, { alignment: AlignmentType.CENTER }),
              ],
              { width: { size: 50, type: WidthType.PERCENTAGE } },
            ),
          ],
        }),
      ],
    });

    const children = [
      headerTable,
      p("", { after: 180 }),
      infoTable,
      p("", { after: 180 }),
      p("NỘI DUNG HÓA ĐƠN", { bold: true, color: brand, size: 22, after: 80 }),
      p(
        model.description ||
          "Hóa đơn ghi nhận phí dịch vụ pháp lý theo thỏa thuận/báo giá đã được xác nhận giữa các bên.",
        { size: 20, after: 180 },
      ),
      serviceTable,
      p(`Bằng chữ: ${model.totalInWords}.`, {
        italics: true,
        color: "475569",
        after: 180,
      }),
      paymentTable,
      p("", { after: 140 }),
      p("GHI CHÚ", { bold: true, color: brand, size: 22, after: 70 }),
      p(
        model.terms ||
          "Hóa đơn này là căn cứ thanh toán phí dịch vụ pháp lý. Trường hợp cần điều chỉnh thông tin hóa đơn, vui lòng phản hồi trước khi thực hiện thanh toán.",
        { size: 19, after: 220 },
      ),
      signatureTable,
    ];

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: { top: 720, right: 720, bottom: 720, left: 720 },
            },
          },
          children,
        },
      ],
    });

    const generatedBlob = await Packer.toBlob(doc);
    const fileName = cleanFileName(`HoaDon_${model.invoiceNumber}.docx`);
    return { generatedBlob, fileName };
  }

  const lineCellStyle = (align, extra = {}) => ({
    padding: "10px 12px",
    borderBottom: "1px solid #eef2f7",
    textAlign: align,
    fontSize: 13,
    color: "#243447",
    verticalAlign: "top",
    ...extra,
  });

  const InvoicePreview = ({ model }) => {
    const brand = `#${model.company.brandColor || "153A5B"}`;
    return h(
      "div",
      {
        style: {
          background: "#fff",
          border: "1px solid #e5edf5",
          borderRadius: 8,
          padding: 28,
          boxShadow: "0 1px 8px rgba(15, 35, 55, 0.06)",
          fontFamily: FONT,
        },
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            gap: 24,
            borderBottom: `3px solid ${brand}`,
            paddingBottom: 18,
            marginBottom: 22,
          },
        },
        h(
          "div",
          { style: { flex: 1, minWidth: 0 } },
          h(
            "div",
            { style: { fontSize: 22, fontWeight: 800, color: brand } },
            model.company.name,
          ),
          h(
            "div",
            {
              style: {
                fontSize: 11,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: 1.2,
                marginTop: 3,
              },
            },
            model.company.legalName,
          ),
          h(
            "div",
            { style: { fontSize: 12, color: "#475569", marginTop: 10, lineHeight: 1.7 } },
            model.company.taxCode ? `MST: ${model.company.taxCode}` : "MST: —",
            h("br"),
            model.company.address || "Địa chỉ: —",
            h("br"),
            [model.company.email, model.company.phone, model.company.website]
              .filter(Boolean)
              .join(" | ") || "Thông tin liên hệ: —",
          ),
        ),
        h(
          "div",
          { style: { textAlign: "right", minWidth: 260 } },
          h(
            "div",
            {
              style: {
                fontSize: 28,
                fontWeight: 800,
                color: brand,
                textTransform: "uppercase",
              },
            },
            "Hóa đơn dịch vụ",
          ),
          h(
            "div",
            { style: { fontSize: 14, fontWeight: 700, marginTop: 8 } },
            `Số: ${model.invoiceNumber}`,
          ),
          h(
            "div",
            { style: { fontSize: 12, color: "#64748b", marginTop: 8, lineHeight: 1.7 } },
            `Ngày phát hành: ${formatDate(model.issuedDate)}`,
            h("br"),
            `Hạn thanh toán: ${formatDate(model.deadline)}`,
            h("br"),
            `Loại: ${model.invoiceType}`,
          ),
        ),
      ),
      h(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 22,
          },
        },
        h(
          "section",
          {
            style: {
              border: "1px solid #e5edf5",
              borderRadius: 8,
              padding: 14,
              background: "#fbfdff",
            },
          },
          h(
            "div",
            {
              style: {
                fontSize: 11,
                fontWeight: 800,
                color: brand,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8,
              },
            },
            "Bên nhận hóa đơn",
          ),
          h("div", { style: { fontWeight: 800, fontSize: 15 } }, model.customer.name),
          h(
            "div",
            { style: { fontSize: 12, color: "#475569", lineHeight: 1.8, marginTop: 6 } },
            `MST: ${model.customer.taxCode || "—"}`,
            h("br"),
            `Địa chỉ: ${model.customer.address || "—"}`,
            h("br"),
            `Email/SĐT: ${
              [model.customer.email, model.customer.phone].filter(Boolean).join(" | ") ||
              "—"
            }`,
          ),
        ),
        h(
          "section",
          {
            style: {
              border: "1px solid #e5edf5",
              borderRadius: 8,
              padding: 14,
              background: "#fff",
            },
          },
          h(
            "div",
            {
              style: {
                fontSize: 11,
                fontWeight: 800,
                color: brand,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8,
              },
            },
            "Thông tin thanh toán",
          ),
          h(
            "div",
            { style: { fontSize: 12, color: "#475569", lineHeight: 1.8 } },
            `Điều khoản: ${model.paymentTerms}`,
            h("br"),
            `Báo giá: ${model.quotation?.quotationNumber || "—"}`,
            h("br"),
            `Bằng chữ: ${model.totalInWords}`,
          ),
        ),
      ),
      h(
        "div",
        { style: { marginBottom: 16 } },
        h(
          "div",
          {
            style: {
              fontSize: 12,
              fontWeight: 800,
              color: brand,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 8,
            },
          },
          "Nội dung hóa đơn",
        ),
        h(
          "div",
          {
            style: {
              border: "1px solid #e5edf5",
              borderRadius: 8,
              padding: 14,
              color: "#334155",
              fontSize: 13,
              lineHeight: 1.7,
              background: "#fff",
            },
          },
          model.description ||
            "Hóa đơn ghi nhận phí dịch vụ pháp lý theo thỏa thuận/báo giá đã được xác nhận giữa các bên.",
        ),
      ),
      h(
        "table",
        {
          style: {
            width: "100%",
            borderCollapse: "collapse",
            border: "1px solid #e5edf5",
            marginBottom: 18,
          },
        },
        h(
          "thead",
          null,
          h(
            "tr",
            { style: { background: brand, color: "#fff" } },
            ["STT", "Nội dung dịch vụ pháp lý", "SL", "Đơn giá", "VAT", "Thành tiền"].map(
              (title, index) =>
                h(
                  "th",
                  {
                    key: title,
                    style: {
                      padding: "10px 12px",
                      textAlign: index === 1 ? "left" : index > 2 ? "right" : "center",
                      fontSize: 12,
                      fontWeight: 800,
                    },
                  },
                  title,
                ),
            ),
          ),
        ),
        h(
          "tbody",
          null,
          model.lines.length
            ? model.lines.map((line) =>
                h(
                  "tr",
                  { key: line.index },
                  h("td", { style: lineCellStyle("center", { width: 48 }) }, line.index),
                  h(
                    "td",
                    { style: lineCellStyle("left") },
                    h("div", { style: { fontWeight: 700 } }, line.name),
                    line.description
                      ? h(
                          "div",
                          { style: { color: "#64748b", fontSize: 12, marginTop: 3 } },
                          line.description,
                        )
                      : null,
                  ),
                  h("td", { style: lineCellStyle("center") }, line.quantity),
                  h("td", { style: lineCellStyle("right") }, formatCurrency(line.unitPrice)),
                  h("td", { style: lineCellStyle("right") }, formatCurrency(line.vatAmount)),
                  h(
                    "td",
                    { style: lineCellStyle("right", { fontWeight: 800 }) },
                    formatCurrency(line.totalAmount),
                  ),
                ),
              )
            : h(
                "tr",
                null,
                h(
                  "td",
                  {
                    colSpan: 6,
                    style: {
                      padding: 18,
                      textAlign: "center",
                      color: "#94a3b8",
                      fontSize: 13,
                    },
                  },
                  "Chưa có dòng dịch vụ",
                ),
              ),
        ),
      ),
      h(
        "div",
        { style: { display: "flex", justifyContent: "flex-end", marginBottom: 18 } },
        h(
          "div",
          { style: { width: 340, border: "1px solid #e5edf5", borderRadius: 8 } },
          [
            ["Tổng trước VAT", model.subTotal, false],
            ["Thuế VAT", model.vatAmount, false],
            ["Tổng cộng thanh toán", model.totalAmount, true],
          ].map(([label, amount, isTotal]) =>
            h(
              "div",
              {
                key: label,
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  background: isTotal ? brand : "#fff",
                  color: isTotal ? "#fff" : "#334155",
                  fontWeight: isTotal ? 800 : 600,
                  borderTop: label === "Tổng trước VAT" ? "none" : "1px solid #e5edf5",
                },
              },
              h("span", null, label),
              h("span", null, formatCurrency(amount)),
            ),
          ),
        ),
      ),
      h(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 14,
            marginBottom: 22,
          },
        },
        h(
          "div",
          {
            style: {
              background: "#f8fafc",
              border: "1px solid #e5edf5",
              borderRadius: 8,
              padding: 14,
              fontSize: 13,
              lineHeight: 1.8,
            },
          },
          h("div", { style: { fontWeight: 800, color: brand, marginBottom: 4 } }, "Thông tin chuyển khoản"),
          `Ngân hàng: ${model.company.bankName || "—"}`,
          h("br"),
          `Chủ tài khoản: ${model.company.bankAccountName || "—"}`,
          h("br"),
          h("strong", null, `Số tài khoản: ${model.company.bankAccountNumber || "—"}`),
          h("br"),
          `Chi nhánh: ${model.company.bankBranch || "—"}`,
        ),
        h(
          "div",
          {
            style: {
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: 14,
              fontSize: 13,
              lineHeight: 1.8,
            },
          },
          h("div", { style: { fontWeight: 800, color: brand, marginBottom: 4 } }, "Nội dung chuyển khoản"),
          h("strong", null, `${model.invoiceNumber} - ${model.customer.shortName}`),
          h("div", { style: { color: "#92400e", marginTop: 4 } }, "Vui lòng ghi đúng nội dung để đối soát thanh toán."),
        ),
      ),
      h(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            marginTop: 26,
          },
        },
        ["Đại diện công ty luật", "Khách hàng"].map((title, index) =>
          h(
            "div",
            {
              key: title,
              style: {
                textAlign: "center",
                border: "1px solid #e5edf5",
                borderRadius: 8,
                padding: "14px 12px",
                minHeight: 130,
              },
            },
            h("div", { style: { fontWeight: 800, color: brand, textTransform: "uppercase" } }, title),
            h(
              "div",
              { style: { color: "#94a3b8", fontSize: 12, marginTop: 4 } },
              index === 0 ? "(Ký, ghi rõ họ tên và đóng dấu)" : "(Ký và ghi rõ họ tên)",
            ),
            h(
              "div",
              { style: { marginTop: 58, color: "#475569", fontStyle: "italic" } },
              index === 0 ? model.company.shortName || model.company.name : model.customer.name,
            ),
          ),
        ),
      ),
    );
  };

  const InvoiceGenerator = () => {
    const [data, setData] = useState(null);
    const [contract, setContract] = useState(null);
    const [quotation, setQuotation] = useState(null);
    const [lead, setLead] = useState(null);
    const [services, setServices] = useState([]);
    const [serviceMap, setServiceMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewBlob, setPreviewBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewFileName, setPreviewFileName] = useState("");
    const [previewAttId, setPreviewAttId] = useState(null);

    const loadData = useCallback(async () => {
      if (!RECORD_ID) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const invoice = await fetchInvoice(RECORD_ID);
        setData(invoice);
        if (!invoice) {
          setContract(null);
          setQuotation(null);
          setLead(null);
          setServices([]);
          setServiceMap({});
          return;
        }

        const contractId = getInvoiceContractId(invoice);
        if (!contractId) {
          throw new Error("Invoice hiện tại chưa có contractId để lấy danh sách dịch vụ.");
        }

        const contractData =
          firstItem(invoice.contracts) || firstItem(invoice.contract) || (await fetchContract(contractId));
        const quotationData = await fetchQuotationByContractId(contractId, contractData);
        const quotationId = extractId(quotationData?.id);
        if (!quotationId) {
          throw new Error(
            `Không tìm thấy quotation liên kết với contractId ${contractId}.`,
          );
        }

        const leadId =
          extractId(quotationData?.leadId) ||
          extractId(quotationData?.lead) ||
          extractId(invoice.leadId);
        const [leadData, quotationServices] = await Promise.all([
          fetchLead(leadId),
          fetchQuotationServices(quotationId),
        ]);
        const detailMap = await fetchServiceDetails(
          quotationServices.map((item) => item.serviceId),
        );
        setContract(contractData || null);
        setQuotation(quotationData || null);
        setLead(leadData);
        setServices(quotationServices);
        setServiceMap(detailMap);
      } catch (error) {
        console.error(error);
        message.error("Không tải được dữ liệu hóa đơn.");
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      loadData();
    }, [loadData]);

    const model = useMemo(
      () =>
        data
          ? buildInvoiceModel(data, contract, quotation, lead, services, serviceMap)
          : null,
      [data, contract, quotation, lead, services, serviceMap],
    );

    const resetPreview = () => {
      setPreviewBlob(null);
      setPreviewUrl(null);
      setPreviewFileName("");
      setPreviewAttId(null);
    };

    const ensureGeneratedAttachment = async () => {
      if (previewAttId && previewFileName) {
        return { attId: previewAttId, fileName: previewFileName, blob: previewBlob };
      }
      if (!model) throw new Error("Không có dữ liệu hóa đơn.");
      const { generatedBlob, fileName } = await buildDocxBlob(model);
      const attachment = await uploadAttachment(generatedBlob, fileName);
      return { attId: attachment.id, fileName, blob: generatedBlob, attachment };
    };

    const handlePreview = async () => {
      if (!model || generating || saving) return;
      setGenerating(true);
      try {
        const { generatedBlob, fileName } = await buildDocxBlob(model);
        const attachment = await uploadAttachment(generatedBlob, fileName);
        const publicUrl = getPublicUrl(attachment);
        if (!publicUrl) throw new Error("Không lấy được URL file preview.");
        setPreviewBlob(generatedBlob);
        setPreviewUrl(publicUrl);
        setPreviewFileName(fileName);
        setPreviewAttId(attachment.id);
      } catch (error) {
        console.error(error);
        Modal.error({
          title: "Lỗi xem trước hóa đơn",
          content: error?.message || "Không thể tạo file xem trước.",
        });
      } finally {
        setGenerating(false);
      }
    };

    const downloadBlob = (blob, fileName) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || `HoaDon_${RECORD_ID}.docx`;
      link.style.display = "none";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const handleDownload = async () => {
      try {
        if (previewBlob) {
          downloadBlob(previewBlob, previewFileName);
          return;
        }
        setGenerating(true);
        const { generatedBlob, fileName } = await buildDocxBlob(model);
        setPreviewBlob(generatedBlob);
        setPreviewFileName(fileName);
        downloadBlob(generatedBlob, fileName);
      } catch (error) {
        message.error(error?.message || "Không thể tải file.");
      } finally {
        setGenerating(false);
      }
    };

    const handleSaveDoc = async () => {
      if (!model || saving) return;
      setSaving(true);
      try {
        const { attId } = await ensureGeneratedAttachment();
        const [currentUser, folderId] = await Promise.all([
          getCurrentUser(),
          findInvoiceFolder(RECORD_ID),
        ]);
        const fileIndex = await getNextFileIndex(folderId, "Invoice", RECORD_ID);
        const title = `${model.invoiceNumber} / Invoice / ${
          model.company.shortName || "CBI"
        } - ${model.customer.shortName || model.customer.name}`;
        const now = new Date().toISOString();
        const payload = {
          collectionName: "Invoice",
          recordId: parseInt(RECORD_ID),
          documentType: "Invoice",
          folderId: folderId || null,
          title,
          fileIndex,
          note: `Hóa đơn DOCX được generate tự động ngày ${formatDate(null)}`,
          fileAttachment: { id: attId },
          createdById: currentUser?.id || null,
          updatedById: currentUser?.id || null,
          createdAt: now,
          updatedAt: now,
        };

        try {
          await ctx.api.request({
            url: `invoices/${RECORD_ID}/documents:create`,
            method: "POST",
            data: payload,
          });
        } catch (relationError) {
          await ctx.api.request({
            url: "documents:create",
            method: "POST",
            data: payload,
          });
        }

        message.success("Đã lưu hóa đơn DOCX vào Documents.");
        resetPreview();
      } catch (error) {
        console.error(error);
        Modal.error({
          title: "Lỗi lưu hóa đơn",
          content: error?.message || "Không thể lưu file hóa đơn.",
        });
      } finally {
        setSaving(false);
      }
    };

    if (!RECORD_ID) {
      return h(
        "div",
        { style: { padding: 16, color: "#cf1322", fontFamily: FONT } },
        "Không tìm thấy ID hóa đơn trong URL.",
      );
    }

    if (loading) {
      return h(
        "div",
        { style: { padding: 24, textAlign: "center" } },
        h(Spin, null),
      );
    }

    if (!model) {
      return h(
        "div",
        { style: { padding: 16, color: "#cf1322", fontFamily: FONT } },
        "Không tải được dữ liệu hóa đơn.",
      );
    }

    const actionDisabled = generating || saving;

    return h(
      "div",
      {
        style: {
          padding: "14px 16px",
          fontFamily: FONT,
        },
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            flexWrap: "wrap",
          },
        },
        h(
          Button,
          {
            onClick: handlePreview,
            loading: generating,
            disabled: actionDisabled,
          },
          "Xem trước Office",
        ),
        h(
          Button,
          {
            type: "primary",
            onClick: handleSaveDoc,
            loading: saving,
            disabled: actionDisabled,
          },
          "Lưu vào Documents",
        ),
        h(
          Button,
          {
            onClick: loadData,
            disabled: actionDisabled,
          },
          "Làm mới",
        ),
      ),
      h(
        Modal,
        {
          title: "Xem trước hóa đơn DOCX",
          open: !!previewUrl,
          onCancel: resetPreview,
          width: "86%",
          centered: true,
          footer: [
            h(Button, { key: "close", onClick: resetPreview }, "Đóng"),
            h(
              Button,
              {
                key: "download",
                onClick: handleDownload,
                disabled: !previewBlob && !previewUrl,
              },
              "Tải file",
            ),
            h(
              Button,
              {
                key: "save",
                type: "primary",
                loading: saving,
                onClick: handleSaveDoc,
              },
              "Lưu vào Documents",
            ),
          ],
          bodyStyle: { padding: 0, height: "72vh" },
        },
        previewUrl
          ? h("iframe", {
              src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                previewUrl,
              )}`,
              width: "100%",
              height: "100%",
              frameBorder: "0",
              title: "invoice-preview",
            })
          : null,
      ),
    );
  };

  ctx.render(h(InvoiceGenerator));
