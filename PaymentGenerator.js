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

const PAYMENT_METHOD_LABEL = {
  cash: "Tiền mặt",
  bank: "Chuyển khoản ngân hàng",
  bank_transfer: "Chuyển khoản ngân hàng",
  transfer: "Chuyển khoản ngân hàng",
  credit_card: "Thẻ tín dụng",
  card: "Thẻ",
  momo: "Ví điện tử MoMo",
  vnpay: "VNPay",
  other: "Khác",
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

const hasValue = (value) =>
  value !== null && value !== undefined && value !== "";

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
  if (!Number.isFinite(amount)) return "0 đ";
  return amount.toLocaleString("vi-VN") + " đ";
};

const formatCurrencyDocx = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0 VND";
  return amount.toLocaleString("vi-VN") + " VND";
};

const pad2 = (value) => String(value).padStart(2, "0");

const formatDate = (iso) => {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) return "";
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
    const hundreds = Math.floor(group / 100);
    const ten = Math.floor((group % 100) / 10);
    const unit = group % 10;
    let text = "";
    if (hundreds) text += units[hundreds] + " trăm";
    if (ten) text += (text ? " " : "") + tens[ten];
    else if (hundreds && unit) text += " linh";
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

async function safeGet(url, params = {}, options = {}) {
  try {
    const res = await ctx.api.request({ url, params });
    return res?.data?.data || res?.data || null;
  } catch (error) {
    if (!options.silent) {
      console.warn(`Không lấy được dữ liệu từ ${url}:`, error);
    }
    return null;
  }
}

async function fetchWithAppendFallback(url, id, appendGroups = []) {
  for (const appends of appendGroups) {
    const data = await safeGet(
      url,
      {
        filterByTk: id,
        ...(appends?.length ? { appends } : {}),
      },
      { silent: true },
    );
    if (data) return data;
  }
  return safeGet(url, { filterByTk: id });
}

async function fetchPayment(id) {
  return fetchWithAppendFallback("payments:get", id, [
    ["invoices", "contracts", "quotations", "customers", "internalCompany"],
    ["invoices", "customers", "internalCompany"],
    ["customers"],
  ]);
}

async function fetchInvoice(id) {
  if (!id) return null;
  return fetchWithAppendFallback("invoices:get", id, [
    ["contracts", "quotations", "customers", "internalCompany"],
    ["contracts", "customers", "internalCompany"],
    ["customers"],
  ]);
}

async function fetchContract(id) {
  if (!id) return null;
  return fetchWithAppendFallback("contracts:get", id, [
    ["customers", "quotations", "internalCompany"],
    ["customers", "quotations"],
    ["customers"],
  ]);
}

async function fetchQuotation(id) {
  if (!id) return null;
  return fetchWithAppendFallback("quotations:get", id, [
    ["customers", "lead", "internalCompany", "contracts"],
    ["customers", "lead", "internalCompany"],
    ["customers"],
  ]);
}

async function fetchCustomer(id) {
  if (!id) return null;
  return safeGet("customers:get", { filterByTk: id });
}

async function fetchLead(id) {
  if (!id) return null;
  return safeGet("lead:get", { filterByTk: id });
}

async function fetchInternalCompany(id) {
  if (!id) return null;
  return safeGet("internalCompany:get", { filterByTk: id });
}

async function fetchQuotationByContractId(contractId, contractData) {
  if (!contractId) return firstItem(contractData?.quotations);

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
    console.warn("Không tìm được quotation theo relation contracts:", error);
  }

  const appendedQuotation = firstItem(contractData?.quotations);
  if (appendedQuotation) return appendedQuotation;

  const fallbackQuotationId =
    extractId(contractData?.quotationId) || extractId(contractData?.quotation);
  return fetchQuotation(fallbackQuotationId);
}

async function fetchQuotationServices(quotationId) {
  if (!quotationId) return [];
  try {
    const res = await ctx.api.request({
      url: "quotationServices:list",
      params: {
        pageSize: 100,
        page: 1,
        filter: JSON.stringify({ quotationId: { $eq: parseInt(quotationId, 10) } }),
      },
    });
    return res?.data?.data || [];
  } catch (error) {
    console.warn("Không lấy được quotationServices:", error);
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

async function findFolderByField(fieldName, recordId) {
  if (!fieldName || !recordId) return null;
  try {
    const res = await ctx.api.request({
      url: "folders:list",
      params: {
        pageSize: 1,
        page: 1,
        filter: JSON.stringify({
          [fieldName]: { $eq: parseInt(recordId, 10) },
        }),
      },
    });
    return extractId(res?.data?.data?.[0]?.id);
  } catch {
    return null;
  }
}

async function findPaymentFolder(paymentId, invoiceId, contractId) {
  return (
    (await findFolderByField("paymentId", paymentId)) ||
    (await findFolderByField("invoiceId", invoiceId)) ||
    (await findFolderByField("contractId", contractId))
  );
}

async function getNextFileIndex(folderId, collectionName, recordId) {
  try {
    const filter = folderId
      ? { folderId: { $eq: folderId } }
      : {
          $and: [
            { collectionName: { $eq: collectionName } },
            { recordId: { $eq: parseInt(recordId, 10) } },
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

const getPaymentInvoiceId = (payment) =>
  extractId(payment?.invoiceId) ||
  extractId(payment?.invoices) ||
  extractId(payment?.invoice);

const getPaymentContractId = (payment) =>
  extractId(payment?.contractId) ||
  extractId(payment?.contracts) ||
  extractId(payment?.contract);

const getPaymentQuotationId = (payment) =>
  extractId(payment?.quotationId) ||
  extractId(payment?.quotations) ||
  extractId(payment?.quotation);

const getInvoiceContractId = (invoice) =>
  extractId(invoice?.contractId) ||
  extractId(invoice?.contracts) ||
  extractId(invoice?.contract);

const getInvoiceQuotation = (invoice) =>
  firstItem(invoice?.quotations) ||
  firstItem(invoice?.quotation) ||
  invoice?.quotation ||
  null;

const normalizeCompany = (...sources) => {
  const source = sources.map(firstItem).find(Boolean) || {};
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

const normalizeCustomer = (...sources) => {
  const source = sources.map(firstItem).find(Boolean) || {};
  const name =
    source.customerName ||
    source.companyLegalName ||
    source.companyName ||
    source.fullName ||
    source.contactName ||
    source.name ||
    "Khách hàng";
  return {
    name,
    shortName: source.shortName || source.companyShortName || source.customerCode || name,
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

const getPaymentAmount = (payment) =>
  num(
    payment?.amount ||
      payment?.paymentAmount ||
      payment?.paidAmount ||
      payment?.receivedAmount ||
      payment?.totalPaid,
  );

const getPaymentDate = (payment) =>
  payment?.paymentDate || payment?.paidAt || payment?.receivedAt || payment?.createdAt;

const getPaymentMethod = (payment) => {
  const raw =
    payment?.paymentMethod ||
    payment?.method ||
    payment?.paymentType ||
    payment?.type ||
    "";
  return PAYMENT_METHOD_LABEL[raw] || raw || "Chuyển khoản ngân hàng";
};

const getPaymentReference = (payment) =>
  payment?.transactionCode ||
  payment?.transactionRef ||
  payment?.referenceNo ||
  payment?.bankTransactionCode ||
  payment?.paymentReference ||
  "";

function buildServiceLines(services, serviceMap) {
  return (services || []).map((item, index) => {
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
}

function buildPaymentModel({
  payment,
  invoice,
  contract,
  quotation,
  lead,
  customer,
  company,
  services,
  serviceMap,
}) {
  let lines = buildServiceLines(services, serviceMap);
  const lineSubTotal = lines.reduce((sum, item) => sum + item.subTotal, 0);
  const lineVatAmount = lines.reduce((sum, item) => sum + item.vatAmount, 0);
  const lineTotal = lineSubTotal + lineVatAmount;
  const packageMode = isPackagePricing(quotation);
  const packageSubTotal =
    num(invoice?.subTotal) ||
    num(quotation?.subTotal) ||
    num(contract?.subTotal);
  const packageVatAmount =
    num(invoice?.vatAmount) ||
    num(quotation?.vatAmount) ||
    num(contract?.vatAmount);
  const packageTotal =
    num(invoice?.totalAmount || invoice?.grandTotal || invoice?.amount) ||
    num(quotation?.totalAmount || quotation?.grandTotal) ||
    num(contract?.totalAmount || contract?.grandTotal) ||
    packageSubTotal + packageVatAmount;

  if (packageMode) {
    const scope = lines.map((item) => item.name).filter(Boolean).join("; ");
    lines = [{
      index: 1,
      name: `Gói dịch vụ pháp lý theo báo giá ${quotation?.quotationNumber || quotation?.code || quotation?.id || ""}`.trim(),
      description: scope,
      quantity: 1,
      unitPrice: packageSubTotal,
      subTotal: packageSubTotal,
      vatRate: num(quotation?.packageVatRate) || inferVatRate(packageSubTotal, packageVatAmount, 0),
      vatAmount: packageVatAmount,
      totalAmount: packageTotal,
    }];
  }

  const invoiceTotal =
    (packageMode ? packageTotal : lineTotal) ||
    num(invoice?.totalAmount || invoice?.grandTotal || invoice?.amount) ||
    num(quotation?.totalAmount || quotation?.grandTotal) ||
    num(contract?.totalAmount || contract?.grandTotal);
  const paidAmount = getPaymentAmount(payment);
  const remainingSource =
    [
      payment?.remainingAmount,
      payment?.balanceAfterPayment,
      payment?.outstandingAmount,
      payment?.balance,
    ].find(hasValue);
  const remainingAmount = hasValue(remainingSource)
    ? num(remainingSource)
    : invoiceTotal
      ? Math.max(invoiceTotal - paidAmount, 0)
      : 0;
  const receiptNumber =
    payment?.receiptNumber ||
    payment?.paymentNumber ||
    payment?.code ||
    `PT-${RECORD_ID}`;
  const paymentDate = getPaymentDate(payment) || new Date().toISOString();
  const invoiceNumber =
    invoice?.invoiceNumber || invoice?.code || (invoice?.id ? `INV-${invoice.id}` : "");
  const contractCode =
    contract?.contractCode ||
    contract?.contractNumber ||
    contract?.code ||
    (contract?.id ? `#${contract.id}` : "");
  const quotationNumber =
    quotation?.quotationNumber || quotation?.code || (quotation?.id ? `#${quotation.id}` : "");
  const resolvedCompany = normalizeCompany(
    company,
    payment?.internalCompany,
    invoice?.internalCompany,
    contract?.internalCompany,
    quotation?.internalCompany,
  );
  const resolvedCustomer = normalizeCustomer(
    customer,
    payment?.customers,
    invoice?.customers,
    contract?.customers,
    quotation?.customers,
    lead,
  );
  const description = stripHtml(
    payment?.description ||
      payment?.note ||
      invoice?.description ||
      quotation?.serviceDescription ||
      quotation?.description ||
      quotation?.overview ||
      "",
  );

  return {
    payment,
    invoice,
    contract,
    quotation,
    company: resolvedCompany,
    customer: resolvedCustomer,
    receiptNumber,
    paymentDate,
    method: getPaymentMethod(payment),
    reference: getPaymentReference(payment),
    invoiceNumber,
    contractCode,
    quotationNumber,
    description:
      description ||
      "Thu tiền phí dịch vụ pháp lý theo hóa đơn, hợp đồng hoặc thỏa thuận đã được xác nhận giữa các bên.",
    lines,
    subTotal: packageMode ? packageSubTotal : lineSubTotal,
    vatAmount: packageMode ? packageVatAmount : lineVatAmount,
    invoiceTotal,
    paidAmount,
    remainingAmount,
    amountInWords: numberToWords(paidAmount),
  };
}

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
    size: opts.borderStyle === "none" ? 0 : 1,
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
              p(model.company.address || "Địa chỉ: chưa cập nhật", {
                size: 18,
                after: 20,
              }),
              p(
                [
                  createTextRun(TextRun, "MST: ", {
                    bold: true,
                    size: 18,
                    color: "475569",
                  }),
                  createTextRun(TextRun, model.company.taxCode || "chưa cập nhật", {
                    size: 18,
                  }),
                ],
                { after: 20 },
              ),
              p(
                [model.company.email, model.company.phone, model.company.website]
                  .filter(Boolean)
                  .join(" | ") || "Thông tin liên hệ: chưa cập nhật",
                { size: 18, color: "475569" },
              ),
            ],
            { width: { size: 58, type: WidthType.PERCENTAGE } },
          ),
          noBorderCell(
            [
              p("BIÊN LAI THANH TOÁN", {
                size: 30,
                bold: true,
                color: brand,
                alignment: AlignmentType.RIGHT,
                after: 80,
              }),
              p(`Số: ${model.receiptNumber}`, {
                size: 21,
                bold: true,
                alignment: AlignmentType.RIGHT,
                after: 25,
              }),
              p(`Ngày thanh toán: ${formatDate(model.paymentDate)}`, {
                size: 19,
                alignment: AlignmentType.RIGHT,
                after: 25,
              }),
              p(`Hình thức: ${model.method}`, {
                size: 19,
                alignment: AlignmentType.RIGHT,
              }),
            ],
            { width: { size: 42, type: WidthType.PERCENTAGE } },
          ),
        ],
      }),
    ],
  });

  const partyTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell("BÊN NỘP TIỀN", {
            fill: "F8FAFC",
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
              p(model.customer.name, { bold: true, size: 22, after: 45 }),
              p(`MST/CCCD: ${model.customer.taxCode || "chưa cập nhật"}`, {
                size: 19,
                after: 25,
              }),
              p(`Địa chỉ: ${model.customer.address || "chưa cập nhật"}`, {
                size: 19,
                after: 25,
              }),
              p(
                `Email/SĐT: ${
                  [model.customer.email, model.customer.phone].filter(Boolean).join(" | ") ||
                  "chưa cập nhật"
                }`,
                { size: 19, after: 25 },
              ),
              model.customer.representative
                ? p(`Người đại diện: ${model.customer.representative}`, {
                    size: 19,
                  })
                : p("", { size: 1, after: 0 }),
            ],
            { width: { size: 50, type: WidthType.PERCENTAGE } },
          ),
          cell(
            [
              p(
                [
                  createTextRun(TextRun, "Số tiền đã nhận: ", {
                    bold: true,
                    size: 21,
                    color: "475569",
                  }),
                  createTextRun(TextRun, formatCurrencyDocx(model.paidAmount), {
                    bold: true,
                    size: 23,
                    color: brand,
                  }),
                ],
                { after: 40 },
              ),
              p(`Bằng chữ: ${model.amountInWords}`, {
                size: 19,
                italics: true,
                after: 25,
              }),
              p(`Mã giao dịch: ${model.reference || "không có"}`, {
                size: 19,
                after: 25,
              }),
              p(`Ngày lập biên lai: ${formatDateLong(model.paymentDate)}`, {
                size: 19,
              }),
            ],
            { width: { size: 50, type: WidthType.PERCENTAGE } },
          ),
        ],
      }),
    ],
  });

  const referenceTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell("Hóa đơn", { fill: "EFF6FF", bold: true, color: brand }),
          cell("Hợp đồng", { fill: "EFF6FF", bold: true, color: brand }),
          cell("Báo giá", { fill: "EFF6FF", bold: true, color: brand }),
        ],
      }),
      new TableRow({
        children: [
          cell(model.invoiceNumber || "chưa liên kết"),
          cell(model.contractCode || "chưa liên kết"),
          cell(model.quotationNumber || "chưa liên kết"),
        ],
      }),
    ],
  });

  const serviceHeader = new TableRow({
    children: [
      cell("STT", { fill: brand, color: "FFFFFF", bold: true }),
      cell("Nội dung khoản thu", { fill: brand, color: "FFFFFF", bold: true }),
      cell("SL", { fill: brand, color: "FFFFFF", bold: true }),
      cell("Đơn giá", { fill: brand, color: "FFFFFF", bold: true }),
      cell("VAT", { fill: brand, color: "FFFFFF", bold: true }),
      cell("Thành tiền", { fill: brand, color: "FFFFFF", bold: true }),
    ],
  });

  const serviceRows = model.lines.length
    ? model.lines.map(
        (line) =>
          new TableRow({
            children: [
              cell(String(line.index), { width: { size: 7, type: WidthType.PERCENTAGE } }),
              cell(
                [
                  p(line.name, { bold: true, after: 35 }),
                  line.description
                    ? p(line.description, { size: 18, color: "64748B" })
                    : p("", { size: 1, after: 0 }),
                ],
                { width: { size: 38, type: WidthType.PERCENTAGE } },
              ),
              cell(String(line.quantity), {
                width: { size: 8, type: WidthType.PERCENTAGE },
              }),
              cell(formatCurrencyDocx(line.unitPrice), {
                width: { size: 15, type: WidthType.PERCENTAGE },
              }),
              cell(formatCurrencyDocx(line.vatAmount), {
                width: { size: 15, type: WidthType.PERCENTAGE },
              }),
              cell(formatCurrencyDocx(line.totalAmount), {
                width: { size: 17, type: WidthType.PERCENTAGE },
                bold: true,
              }),
            ],
          }),
      )
    : [
        new TableRow({
          children: [
            cell("1", { width: { size: 7, type: WidthType.PERCENTAGE } }),
            cell("Thu phí dịch vụ pháp lý", {
              width: { size: 38, type: WidthType.PERCENTAGE },
            }),
            cell("1", { width: { size: 8, type: WidthType.PERCENTAGE } }),
            cell(formatCurrencyDocx(model.paidAmount), {
              width: { size: 15, type: WidthType.PERCENTAGE },
            }),
            cell(formatCurrencyDocx(0), {
              width: { size: 15, type: WidthType.PERCENTAGE },
            }),
            cell(formatCurrencyDocx(model.paidAmount), {
              width: { size: 17, type: WidthType.PERCENTAGE },
              bold: true,
            }),
          ],
        }),
      ];

  const servicesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [serviceHeader, ...serviceRows],
  });

  const amountTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          cell("Tổng giá trị hóa đơn/hợp đồng", {
            fill: "F8FAFC",
            bold: true,
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
          cell(formatCurrencyDocx(model.invoiceTotal), {
            width: { size: 50, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
      new TableRow({
        children: [
          cell("Số tiền thanh toán lần này", {
            fill: brand,
            color: "FFFFFF",
            bold: true,
          }),
          cell(formatCurrencyDocx(model.paidAmount), {
            fill: brand,
            color: "FFFFFF",
            bold: true,
          }),
        ],
      }),
      new TableRow({
        children: [
          cell("Số tiền còn lại sau thanh toán", {
            fill: "F8FAFC",
            bold: true,
          }),
          cell(formatCurrencyDocx(model.remainingAmount)),
        ],
      }),
    ],
  });

  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: ["Người lập phiếu", "Người nộp tiền", "Đại diện công ty luật"].map(
          (title) =>
            noBorderCell(
              [
                p(title, {
                  bold: true,
                  alignment: AlignmentType.CENTER,
                  color: brand,
                  after: 25,
                }),
                p("(Ký, ghi rõ họ tên)", {
                  size: 18,
                  alignment: AlignmentType.CENTER,
                  color: "64748B",
                  after: 700,
                }),
                p(
                  title === "Người nộp tiền"
                    ? model.customer.name
                    : model.company.shortName || model.company.name,
                  {
                    size: 19,
                    italics: true,
                    alignment: AlignmentType.CENTER,
                  },
                ),
              ],
              { width: { size: 33, type: WidthType.PERCENTAGE } },
            ),
        ),
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 850,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [
          headerTable,
          p("", { after: 220 }),
          p("PHIẾU THU DỊCH VỤ PHÁP LÝ", {
            size: 30,
            bold: true,
            color: brand,
            alignment: AlignmentType.CENTER,
            after: 70,
          }),
          p(`Lập tại ${model.company.shortName || model.company.name}, ${formatDateLong(model.paymentDate)}`, {
            size: 19,
            italics: true,
            color: "475569",
            alignment: AlignmentType.CENTER,
            after: 220,
          }),
          partyTable,
          p("", { after: 160 }),
          p("THÔNG TIN ĐỐI SOÁT", {
            size: 22,
            bold: true,
            color: brand,
            after: 70,
          }),
          referenceTable,
          p("", { after: 160 }),
          p("NỘI DUNG THANH TOÁN", {
            size: 22,
            bold: true,
            color: brand,
            after: 70,
          }),
          p(model.description, { size: 20, color: "334155", after: 120 }),
          servicesTable,
          p("", { after: 160 }),
          amountTable,
          p("", { after: 180 }),
          p(
            "Biên lai này xác nhận công ty luật đã nhận khoản thanh toán nêu trên. Việc hạch toán, khấu trừ nghĩa vụ còn lại và xuất hóa đơn tài chính được thực hiện theo hồ sơ, hợp đồng và quy định pháp luật hiện hành.",
            { size: 19, color: "475569", italics: true, after: 260 },
          ),
          signatureTable,
        ],
      },
    ],
  });

  const generatedBlob = await Packer.toBlob(doc);
  const fileName = `PaymentReceipt_${cleanFileName(model.receiptNumber)}_${Date.now()}.docx`;
  return { generatedBlob, fileName };
}

const PaymentGenerator = () => {
  const [payment, setPayment] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [contract, setContract] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [lead, setLead] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [company, setCompany] = useState(null);
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
      const paymentData = await fetchPayment(RECORD_ID);
      setPayment(paymentData);
      if (!paymentData) {
        setInvoice(null);
        setContract(null);
        setQuotation(null);
        setLead(null);
        setCustomer(null);
        setCompany(null);
        setServices([]);
        setServiceMap({});
        return;
      }

      const invoiceId = getPaymentInvoiceId(paymentData);
      const invoiceData =
        firstItem(paymentData.invoices) ||
        firstItem(paymentData.invoice) ||
        (await fetchInvoice(invoiceId));

      const directContractId = getPaymentContractId(paymentData);
      const invoiceContractId = getInvoiceContractId(invoiceData);
      const contractId = directContractId || invoiceContractId;
      const contractData =
        firstItem(paymentData.contracts) ||
        firstItem(paymentData.contract) ||
        firstItem(invoiceData?.contracts) ||
        firstItem(invoiceData?.contract) ||
        (await fetchContract(contractId));

      const directQuotationId = getPaymentQuotationId(paymentData);
      const invoiceQuotation = getInvoiceQuotation(invoiceData);
      const quotationData =
        firstItem(paymentData.quotations) ||
        firstItem(paymentData.quotation) ||
        invoiceQuotation ||
        (directQuotationId
          ? await fetchQuotation(directQuotationId)
          : await fetchQuotationByContractId(contractId, contractData));
      const quotationId = extractId(quotationData?.id);

      const leadId =
        extractId(quotationData?.leadId) ||
        extractId(quotationData?.lead) ||
        extractId(paymentData.leadId);
      const customerId =
        extractId(paymentData.customerId) ||
        extractId(paymentData.customers) ||
        extractId(invoiceData?.customerId) ||
        extractId(invoiceData?.customers) ||
        extractId(contractData?.customerId) ||
        extractId(contractData?.customers) ||
        extractId(quotationData?.customerId) ||
        extractId(quotationData?.customers);
      const companyId =
        extractId(paymentData.internalCompanyId) ||
        extractId(paymentData.internalCompany) ||
        extractId(invoiceData?.internalCompanyId) ||
        extractId(invoiceData?.internalCompany) ||
        extractId(contractData?.internalCompanyId) ||
        extractId(contractData?.internalCompany) ||
        extractId(quotationData?.internalCompanyId) ||
        extractId(quotationData?.internalCompany);

      const [leadData, customerData, companyData, quotationServices] =
        await Promise.all([
          fetchLead(leadId),
          fetchCustomer(customerId),
          fetchInternalCompany(companyId),
          fetchQuotationServices(quotationId),
        ]);
      const detailMap = await fetchServiceDetails(
        quotationServices.map((item) => item.serviceId),
      );

      setInvoice(invoiceData || null);
      setContract(contractData || null);
      setQuotation(quotationData || null);
      setLead(leadData || null);
      setCustomer(customerData || null);
      setCompany(companyData || null);
      setServices(quotationServices);
      setServiceMap(detailMap);
    } catch (error) {
      console.error(error);
      message.error("Không tải được dữ liệu thanh toán.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const model = useMemo(
    () =>
      payment
        ? buildPaymentModel({
            payment,
            invoice,
            contract,
            quotation,
            lead,
            customer,
            company,
            services,
            serviceMap,
          })
        : null,
    [payment, invoice, contract, quotation, lead, customer, company, services, serviceMap],
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
    if (!model) throw new Error("Không có dữ liệu thanh toán.");
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
        title: "Lỗi xem trước biên lai",
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
    link.download = fileName || `PaymentReceipt_${RECORD_ID}.docx`;
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
      if (!model) throw new Error("Không có dữ liệu thanh toán.");
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
        findPaymentFolder(
          RECORD_ID,
          extractId(invoice?.id),
          extractId(contract?.id),
        ),
      ]);
      const fileIndex = await getNextFileIndex(folderId, "Payment", RECORD_ID);
      const title = `${model.receiptNumber} / Payment Receipt / ${
        model.company.shortName || "CBI"
      } - ${model.customer.shortName || model.customer.name}`;
      const now = new Date().toISOString();
      const payload = {
        collectionName: "Payment",
        recordId: parseInt(RECORD_ID, 10),
        documentType: "Payment Receipt",
        folderId: folderId || null,
        title,
        fileIndex,
        note: `Biên lai thanh toán DOCX được generate tự động ngày ${formatDate(null)}`,
        fileAttachment: { id: attId },
        createdById: currentUser?.id || null,
        updatedById: currentUser?.id || null,
        createdAt: now,
        updatedAt: now,
      };

      try {
        await ctx.api.request({
          url: `payments/${RECORD_ID}/documents:create`,
          method: "POST",
          data: payload,
        });
      } catch {
        await ctx.api.request({
          url: "documents:create",
          method: "POST",
          data: payload,
        });
      }

      message.success("Đã lưu biên lai thanh toán DOCX vào Documents.");
      resetPreview();
    } catch (error) {
      console.error(error);
      Modal.error({
        title: "Lỗi lưu biên lai",
        content: error?.message || "Không thể lưu file biên lai.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!RECORD_ID) {
    return h(
      "div",
      { style: { padding: 16, color: "#cf1322", fontFamily: FONT } },
      "Không tìm thấy ID thanh toán trong URL.",
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
      "Không tải được dữ liệu thanh toán.",
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
        title: "Xem trước biên lai thanh toán DOCX",
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
            title: "payment-receipt-preview",
          })
        : null,
    ),
  );
};

ctx.render(h(PaymentGenerator));
