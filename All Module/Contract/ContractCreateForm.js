const { React } = ctx;
const { useEffect, useMemo, useState } = React;
const { Spin, message, Tooltip, Modal } = ctx.antd;

const FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const CASE_DOCUMENT_SCOPE = "case_document";
const AUTO_CREATE_CONTRACT_FOLDERS = false;

const C = {
  primary: "#1a3a5c",
  border: "#e5e7eb",
  borderFocus: "#1a3a5c",
  text: "#1f2937",
  sub: "#6b7280",
  label: "#374151",
  bg: "#ffffff",
  bgSoft: "#f8fafc",
  danger: "#dc2626",
  approvalBg: "#fdf4ff",
  approvalBorder: "#e9d5ff",
  approvalText: "#7c3aed",
  approvalBadgeBg: "#f3e8ff",
};

// Current page context from the NocoBase record JSON.
const PROJECT_RECORD_CONFIG = {
  record: ctx.record || null,
};

const PAYMENT_TERMS = [
  { value: "immediate", label: "Immediate" },
  { value: "15days", label: "Net 15 days" },
  { value: "30days", label: "Net 30 days" },
  { value: "45days", label: "Net 45 days" },
  { value: "endFollowingMonth", label: "End of following month" },
  { value: "balance", label: "Balance payment" },
];

const CONTRACT_TYPES = [
  { value: "byCase", label: "By case" },
  { value: "retainer", label: "Retainer" },
];

const FEE_MODELS = [
  { value: "fixed", label: "Fixed amount" },
  { value: "hourly", label: "Hourly" },
  { value: "monthlyRetainer", label: "Monthly retainer" },
  { value: "successFee", label: "Success fee" },
  { value: "hybrid", label: "Hybrid" },
];

const FEE_MODEL_BY_TYPE = {
  byCase: ["fixed", "hourly", "successFee", "hybrid"],
  retainer: ["monthlyRetainer", "fixed", "hourly", "hybrid"],
};

const PAYMENT_TERM_DAYS = {
  immediate: 0,
  "15days": 15,
  "30days": 30,
  "45days": 45,
};

const BILLING_CYCLES = [
  { value: "one_time", label: "One time" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "milestone", label: "Milestone" },
  { value: "manual", label: "Manual" },
];

const RETAINER_PERIODS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "approved", label: "Approved" },
  { value: "sent", label: "Sent for signature" },
  { value: "signed", label: "Signed" },
  { value: "negotiation", label: "Negotiation" },
  { value: "pending", label: "Pending" },
  { value: "approval", label: "Approval" },
  { value: "execution", label: "Execution" },
  { value: "completed", label: "Completed" },
  { value: "terminated", label: "Terminated" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
  { value: "expired", label: "Expired" },
];

const todayInput = () => new Date().toISOString().slice(0, 10);

const extractId = (value) => {
  const id = value && typeof value === "object" ? value.id : value;
  return id ? parseInt(id, 10) : null;
};

const extractFirstId = (value) => {
  if (Array.isArray(value)) return extractId(value[0]);
  return extractId(value);
};

const parseNum = (value) => {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const nullableNum = (value) =>
  value === undefined || value === null || value === "" ? null : parseNum(value);

const formatMoney = (value) => {
  const raw = String(value ?? "").replace(/[^\d]/g, "");
  if (!raw) return "";
  return `${Number(raw).toLocaleString("vi-VN")} VNĐ`;
};

const formatMoneyNumber = (value) => {
  const raw = String(value ?? "").replace(/[^\d]/g, "");
  if (!raw) return "";
  return Number(raw).toLocaleString("vi-VN");
};

const moneyRaw = (value) => String(value ?? "").replace(/[^\d]/g, "");
const hasInputValue = (value) => value !== undefined && value !== null && value !== "";

const compact = (items) =>
  items
    .map((item) => (item === undefined || item === null ? "" : String(item).trim()))
    .filter(Boolean);

const toIso = (dateValue) => {
  if (!dateValue) return null;
  const d = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const labelOf = (item, fields, fallbackPrefix) => {
  for (const field of fields) {
    if (item?.[field]) return String(item[field]);
  }
  return `${fallbackPrefix} #${item?.id || ""}`.trim();
};

const firstPresent = (item, fields) => {
  for (const field of fields) {
    const value = item?.[field];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const quotationCustomerId = (quotation) =>
  extractId(quotation?.customerId) ||
  extractId(quotation?.customer) ||
  extractId(quotation?.customers);

const quotationInternalCompanyId = (quotation) =>
  extractId(quotation?.internalCompanyId) ||
  extractId(quotation?.internalCompany);

const quotationLawyerId = (quotation) =>
  extractId(quotation?.lawyerId) ||
  extractId(quotation?.lawyer);

const isPackagePricing = (record) =>
  String(record?.pricingMode || "").toLowerCase() === "package";

const hasPackageMoney = (record) =>
  !!(
    record &&
    (parseNum(record.packageSubTotal) ||
      parseNum(record.packageTotalAmount) ||
      parseNum(record.packageVatAmount))
  );

const isPackageSource = (record) => isPackagePricing(record) || hasPackageMoney(record);

const customerOverview = (customer) => {
  if (!customer) return "";
  return compact([
    firstPresent(customer, ["email", "customerEmail"]),
    firstPresent(customer, ["phone", "phoneNumber", "mobile"]),
    firstPresent(customer, ["companyName", "shortName"]),
    firstPresent(customer, ["taxCode"]) ? `MST ${firstPresent(customer, ["taxCode"])}` : "",
  ])
    .slice(0, 2)
    .join(" · ");
};

const quotationOverview = (quotation, customers = []) => {
  const customerId = quotationCustomerId(quotation);
  const customer = customers.find((item) => String(item.id) === String(customerId));
  const customerName =
    customer
      ? labelOf(customer, ["customerName", "name", "fullName", "shortName"], "Customer")
      : firstPresent(quotation, ["customerName"]);
  const amount = formatMoney(firstPresent(quotation, ["totalAmount", "grandTotal"]));
  return compact([customerName, amount ? `Total ${amount}` : ""]).join(" · ");
};

const customerLabel = (customer) =>
  compact([
    firstPresent(customer, ["customerName", "contactName", "clientName", "fullName", "name", "companyName", "shortName", "displayName"]),
    firstPresent(customer, ["customerCode", "contactCode", "clientCode", "code"]) ? `(${firstPresent(customer, ["customerCode", "contactCode", "clientCode", "code"])})` : "",
  ]).join(" ") || (customer?.id ? `Customer #${customer.id}` : "Customer");

const companyLabel = (company) =>
  compact([
    firstPresent(company, ["name", "companyName", "displayName"]),
    firstPresent(company, ["shortName"]) ? `(${firstPresent(company, ["shortName"])})` : "",
  ]).join(" ") || (company?.id ? `Company #${company.id}` : "Company");

const lawyerTypeLabel = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const key = raw
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
  const labels = {
    lawyer:"Luật sư",
    suppliant:"Trợ lý pháp lý",
    partner: "Đối tác",
    managing_partner: "Đối tác điều hành",
    senior_partner: "Đối tác cấp cao",
    associate: "Luật sư cộng sự",
    senior_associate: "Luật sư cộng sự cấp cao",
    junior_associate: "Luật sư cộng sự",
    counsel: "Luật sư tư vấn",
    of_counsel: "Luật sư cố vấn",
    consultant: "Chuyên gia tư vấn",
    paralegal: "Trợ lý luật sư",
    legal_assistant: "Trợ lý pháp lý",
    trainee: "Luật sư tập sự",
    intern: "Thực tập sinh",
    collaborator: "Cộng tác viên",
    external: "Bên ngoài",
  };
  return labels[key] || raw;
};

const lawyerLabel = (lawyer) =>
  compact([
    firstPresent(lawyer, ["lawyerName", "fullName", "nickname", "username", "name", "displayName"]),
    firstPresent(lawyer, ["lawyerType"]) ? `(${lawyerTypeLabel(firstPresent(lawyer, ["lawyerType"]))})` : "",
  ]).join(" ") || (lawyer?.id ? `Lawyer #${lawyer.id}` : "Lawyer");

const quotationLabel = (quotation) =>
  firstPresent(quotation, ["quotationNumber", "quotationCode", "code", "title", "name"]) ||
  (quotation?.id ? `Quotation #${quotation.id}` : "Quotation");

const caseLabel = (project) => {
  const code = firstPresent(project, ["caseCode", "code"]);
  const name = firstPresent(project, ["projectName", "caseName", "title", "name"]);
  return compact([code, name]).join(" - ") || (project?.id ? `Case #${project.id}` : "Case");
};

const relationRecord = (value, id) => {
  if (Array.isArray(value)) {
    return value.find((item) => String(extractId(item)) === String(id)) || value[0] || null;
  }
  return value && typeof value === "object" ? value : null;
};

const CONTRACTED_SERVICE_STATUSES = [
  "contracted",
  "contract_pending_signature",
  "active",
  "completed",
  "cancelled",
  "canceled",
];

const SERVICE_STATUS_LABELS = {
  pending_quote: "Chưa có báo giá",
  quote_draft: "Báo giá nháp",
  quote_pending_approval: "Báo giá chờ duyệt",
  quote_sent: "Đã gửi báo giá",
  ordered: "Đã chốt dịch vụ",
  contracted: "Đã có hợp đồng",
  contract_pending_signature: "Chờ ký hợp đồng",
  active: "Đang thực hiện",
  completed: "Hoàn tất",
  cancelled: "Đã huỷ",
};

const serviceStatusLabel = (status) => {
  const key = String(status || "").toLowerCase().trim();
  return SERVICE_STATUS_LABELS[key] || status || "Chưa xác định";
};

const numberOrNull = (value) => {
  const parsed = nullableNum(value);
  return parsed === null || parsed === undefined ? null : parsed;
};

const firstNumber = (...values) => {
  for (const value of values) {
    const parsed = numberOrNull(value);
    if (parsed !== null) return parsed;
  }
  return null;
};

const firstNonZeroNumber = (...values) => {
  for (const value of values) {
    const parsed = numberOrNull(value);
    if (parsed !== null && parsed !== 0) return parsed;
  }
  return 0;
};

const roundAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
};

const resolveServiceAmounts = (...sources) => {
  const items = sources.filter(Boolean);
  const values = (field) => items.map((item) => item?.[field]);
  const quantity = firstNonZeroNumber(...values("quantity"), 1) || 1;
  let vat = firstNumber(...values("vat")) ?? 0;
  let basePrice = firstNonZeroNumber(...values("basePrice"));
  let subTotal = firstNonZeroNumber(...values("subTotal"));
  const totalFromSource = firstNonZeroNumber(...values("totalAmount"));
  const vatAmountFromSource = firstNonZeroNumber(...values("vatAmount"));

  if (!subTotal && totalFromSource && vatAmountFromSource) {
    subTotal = totalFromSource - vatAmountFromSource;
  }
  if (!subTotal && totalFromSource && vat > -100) {
    subTotal = totalFromSource / (1 + vat / 100);
  }
  if (!subTotal && basePrice) {
    subTotal = basePrice * quantity;
  }
  if (!basePrice && subTotal) {
    basePrice = subTotal / quantity;
  }
  if ((!vat || vat === 0) && vatAmountFromSource && subTotal) {
    vat = Math.round((vatAmountFromSource * 10000) / subTotal) / 100;
  }

  const calculatedVatAmount = subTotal * vat / 100;
  const vatAmount = firstNonZeroNumber(vatAmountFromSource, calculatedVatAmount);
  const totalAmount = firstNonZeroNumber(totalFromSource, subTotal + vatAmount, subTotal);

  return {
    quantity,
    basePrice: roundAmount(basePrice),
    vat,
    subTotal: roundAmount(subTotal),
    vatAmount: roundAmount(vatAmount),
    totalAmount: roundAmount(totalAmount),
  };
};

const resolvePackageAmounts = (...sources) => {
  const items = sources.filter(Boolean);
  const values = (field) => items.map((item) => item?.[field]);
  const subTotal = firstNonZeroNumber(
    ...values("packageSubTotal"),
    ...values("subTotal"),
    ...values("fixedAmount"),
  );
  const explicitVatAmount = firstNonZeroNumber(...values("packageVatAmount"), ...values("vatAmount"));
  const explicitTotalAmount = firstNonZeroNumber(
    ...values("packageTotalAmount"),
    ...values("totalAmount"),
    ...values("grandTotal"),
    ...values("fixedAmount"),
  );
  const vatRate =
    firstNumber(...values("packageVatRate"), ...values("vatRate")) ??
    (subTotal && explicitVatAmount ? Math.round((explicitVatAmount * 10000) / subTotal) / 100 : 0);
  const vatAmount = explicitVatAmount || roundAmount(subTotal * (vatRate || 0) / 100);
  const totalAmount = explicitTotalAmount || roundAmount(subTotal + vatAmount);
  return {
    subTotal: roundAmount(subTotal),
    vatRate: vatRate || 0,
    vatAmount: roundAmount(vatAmount),
    totalAmount: roundAmount(totalAmount),
  };
};

const packagePricingPayload = (...sources) => {
  const amounts = resolvePackageAmounts(...sources);
  return {
    pricingMode: "package",
    billingMode: "packageIncluded",
    financialSourceType: "contract",
    quantity: 1,
    basePrice: 0,
    vat: 0,
    subTotal: 0,
    vatAmount: 0,
    totalAmount: 0,
    packageSubTotal: amounts.subTotal,
    packageVatRate: amounts.vatRate,
    packageVatAmount: amounts.vatAmount,
    packageTotalAmount: amounts.totalAmount,
  };
};

const projectServicePricingPayload = (line) => {
  if (isPackagePricing(line)) {
    return packagePricingPayload(line);
  }
  const amounts = resolveServiceAmounts(line);
  return {
    pricingMode: "line",
    billingMode: "lineBillable",
    financialSourceType: "contract",
    quantity: amounts.quantity,
    basePrice: amounts.basePrice,
    vat: amounts.vat,
    subTotal: amounts.subTotal,
    vatAmount: amounts.vatAmount,
    totalAmount: amounts.totalAmount,
    packageSubTotal: 0,
    packageVatRate: 0,
    packageVatAmount: 0,
    packageTotalAmount: 0,
  };
};

const normalizeServiceLine = ({ projectService, quotationService, quotation, contractService, project }) => {
  const projectServiceId = extractId(projectService?.id);
  if (!projectServiceId) return null;
  const contractId =
    firstId(projectService?.contractId, projectService?.contracts, contractService?.contractId, contractService?.contracts);
  const status = String(projectService?.status || contractService?.lineStatus || "").toLowerCase().trim();
  const locked = !!contractId || CONTRACTED_SERVICE_STATUSES.includes(status);
  const amountSources = locked
    ? [contractService, projectService, quotationService]
    : [quotationService, projectService];
  const amounts = resolveServiceAmounts(...amountSources);
  const pricingSource =
    [contractService, projectService, quotationService, quotation, project].find(isPackageSource) ||
    [contractService, projectService, quotationService, quotation, project].find((item) => item?.pricingMode) ||
    null;
  const packageAmounts = isPackageSource(pricingSource)
    ? resolvePackageAmounts(pricingSource, quotation, contractService, quotationService, projectService, project)
    : { subTotal: 0, vatRate: 0, vatAmount: 0, totalAmount: 0 };
  const projectServiceBasePrice = numberOrNull(projectService?.basePrice);
  const serviceId =
    firstId(
      locked ? contractService?.serviceId : null,
      locked ? contractService?.service : null,
      quotationService?.serviceId,
      quotationService?.service,
      projectService?.serviceId,
      projectService?.services,
      contractService?.serviceId,
      contractService?.service,
    );
  const serviceName =
    (locked ? contractService?.serviceName : "") ||
    quotationService?.serviceName ||
    projectService?.serviceName ||
    contractService?.serviceName ||
    projectService?.services?.serviceName ||
    projectService?.name ||
    (serviceId ? `Service #${serviceId}` : "Dịch vụ");

  return {
    id: String(projectServiceId),
    projectServiceId,
    quotationServiceId: extractId(quotationService?.id) || firstId(contractService?.quotationServiceId, contractService?.quotationServices, projectService?.quotationServiceId, projectService?.quotationServices),
    quotationId: firstId(quotationService?.quotationId, quotationService?.quotations, contractService?.quotationId, contractService?.quotations, projectService?.quotationId, projectService?.quotations),
    quotationCode: quotation ? quotationLabel(quotation) : "",
    projectId: firstId(projectService?.projectId, projectService?.project, projectService?.projects, contractService?.projectId, contractService?.project, contractService?.projects),
    serviceId,
    serviceName,
    description: (locked ? contractService?.description : "") || quotationService?.description || projectService?.description || contractService?.description || projectService?.services?.description || "",
    quantity: amounts.quantity,
    basePrice: projectServiceBasePrice ?? amounts.basePrice,
    vat: amounts.vat,
    subTotal: amounts.subTotal,
    vatAmount: amounts.vatAmount,
    totalAmount: amounts.totalAmount,
    pricingMode: isPackageSource(pricingSource) ? "package" : "line",
    packageSubTotal: packageAmounts.subTotal,
    packageVatRate: packageAmounts.vatRate,
    packageVatAmount: packageAmounts.vatAmount,
    packageTotalAmount: packageAmounts.totalAmount,
    status,
    contractId,
    contractServiceId: extractId(contractService?.id),
    locked,
  };
};

const sumServiceLines = (lines) =>
  lines.reduce(
    (sum, line) => ({
      subTotal: sum.subTotal + safeNumber(line?.subTotal),
      vatAmount: sum.vatAmount + safeNumber(line?.vatAmount),
      totalAmount: sum.totalAmount + safeNumber(line?.totalAmount),
    }),
    { subTotal: 0, vatAmount: 0, totalAmount: 0 },
  );

const serviceCatalogName = (service) =>
  firstPresent(service, ["serviceName", "name", "title", "displayName"]) ||
  (service?.id ? `Service #${service.id}` : "Service");

const serviceCatalogDescription = (service) =>
  firstPresent(service, ["description", "serviceDescription", "scopeNote"]);

const serviceCatalogPrice = (service) =>
  firstPresent(service, ["basePrice", "price", "unitPrice", "defaultPrice"]);

const serviceCatalogType = (service) =>
  firstPresent(service, ["serviceType", "type", "category"]);

const newManualServiceRow = () => ({
  id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  serviceId: "",
  serviceName: "",
  serviceType: "",
  description: "",
  quantity: "1",
  basePrice: "",
  vat: "8",
});

const manualServiceLineAmounts = (row, packageMode = false) =>
  packageMode
    ? {
        quantity: 1,
        basePrice: 0,
        vat: 0,
        subTotal: 0,
        vatAmount: 0,
        totalAmount: 0,
      }
    : resolveServiceAmounts({
        quantity: firstNonZeroNumber(row?.quantity, 1) || 1,
        basePrice: row?.basePrice,
        vat: row?.vat,
      });

const manualServiceRowsTotals = (rows = []) =>
  rows.reduce(
    (sum, row) => {
      const amounts = manualServiceLineAmounts(row, false);
      return {
        subTotal: sum.subTotal + amounts.subTotal,
        vatAmount: sum.vatAmount + amounts.vatAmount,
        totalAmount: sum.totalAmount + amounts.totalAmount,
      };
    },
    { subTotal: 0, vatAmount: 0, totalAmount: 0 },
  );

const fetchQuotationDetail = async (quotationId) => {
  if (!quotationId) return null;
  try {
    const res = await ctx.api.request({
      url: "quotations:get",
      params: { filterByTk: quotationId },
    });
    return unwrapRecord(res);
  } catch (error) {
    console.warn("[ContractCreateForm] Could not fetch quotation detail", error);
    return null;
  }
};

const unwrapRecord = (res) => {
  const payload = res?.data?.data ?? res?.data ?? res;
  if (Array.isArray(payload)) return payload[0] || null;
  if (Array.isArray(payload?.data)) return payload.data[0] || null;
  if (payload?.data && typeof payload.data === "object") return payload.data;
  return payload || null;
};

const fetchRecord = async (url, id, params = {}, options = {}) => {
  if (!id) return null;
  try {
    const res = await ctx.api.request({
      url,
      params: { filterByTk: id, ...params },
    });
    const record = unwrapRecord(res);
    if (record) return record;

    const collection = String(url || "").split(":")[0];
    if (!collection) return null;
    const listRes = await ctx.api.request({
      url: `${collection}:list`,
      params: {
        filter: JSON.stringify({ id: { $eq: id } }),
        pageSize: 1,
        ...params,
      },
    });
    return unwrapRecord(listRes);
  } catch (error) {
    if (!options.quiet) {
      console.warn(`[ContractCreateForm] Could not fetch ${url} #${id}`, error);
    }
    return null;
  }
};

const fetchAnyRecord = async (urls, id) => {
  for (const url of urls) {
    const record = await fetchRecord(url, id);
    if (record) return record;
  }
  return null;
};

const createdAtTime = (item) => {
  const time = new Date(item?.createdAt || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const newestFirst = (items) =>
  [...items].sort((a, b) => createdAtTime(b) - createdAtTime(a));

const toDateInput = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const addMonthsClamped = (dateValue, monthCount) => {
  if (!dateValue || !monthCount) return "";
  const source = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(source.getTime())) return "";

  const y = source.getFullYear();
  const m = source.getMonth();
  const d = source.getDate();
  const targetFirst = new Date(y, m + monthCount, 1);
  const lastDay = new Date(targetFirst.getFullYear(), targetFirst.getMonth() + 1, 0).getDate();
  targetFirst.setDate(Math.min(d, lastDay));
  return toDateInput(targetFirst);
};

const calcRetainerEndDate = (paymentDate, retainerDuration, retainerPeriod) => {
  const duration = parseNum(retainerDuration);
  if (!paymentDate || duration <= 0) return "";
  if (retainerPeriod === "monthly") return addMonthsClamped(paymentDate, duration);
  if (retainerPeriod === "quarterly") return addMonthsClamped(paymentDate, duration * 3);
  if (retainerPeriod === "yearly") return addMonthsClamped(paymentDate, duration * 12);
  return "";
};

const addDays = (dateValue, days) => {
  if (!dateValue && days !== 0) return "";
  const source = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(source.getTime())) return "";
  source.setDate(source.getDate() + days);
  return toDateInput(source);
};

const endOfFollowingMonth = (dateValue) => {
  if (!dateValue) return "";
  const source = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(source.getTime())) return "";
  return toDateInput(new Date(source.getFullYear(), source.getMonth() + 2, 0));
};

const normalizeFeeModel = (feeModel) => feeModel || "";

const allowedFeeModels = (contractType) =>
  FEE_MODEL_BY_TYPE[contractType] || FEE_MODEL_BY_TYPE.byCase;

const defaultFeeModel = (contractType) =>
  contractType === "retainer" ? "monthlyRetainer" : "fixed";

const feeModelForType = (contractType, currentFeeModel) => {
  const normalized = normalizeFeeModel(currentFeeModel);
  const allowed = allowedFeeModels(contractType);
  return allowed.includes(normalized) ? normalized : defaultFeeModel(contractType);
};

const getFeeVisibility = (form) => {
  const isRetainerType = form.contractType === "retainer";
  const model = normalizeFeeModel(form.feeModel);
  const usesHourly = model === "hourly" || model === "hybrid";
  const usesMonthlyRetainer =
    isRetainerType && ["monthlyRetainer", "fixed", "hybrid"].includes(model);

  return {
    fixedAmount: !isRetainerType && ["fixed", "hybrid"].includes(model),
    monthlyFee: usesMonthlyRetainer,
    hourlyRate: usesHourly,
    estimatedHours: usesHourly,
    successFee: !isRetainerType && ["successFee", "hybrid"].includes(model),
    retainerPeriod: isRetainerType,
    retainerDuration: isRetainerType,
    includedHours: usesMonthlyRetainer,
    overageHourlyRate: usesMonthlyRetainer,
  };
};

const calcByCaseTotal = (form) => {
  const model = normalizeFeeModel(form.feeModel);
  const fixed = parseNum(form.fixedAmount);
  const hourly = parseNum(form.hourlyRate);
  const hours = parseNum(form.estimatedHours);
  const success = parseNum(form.successFee);

  if (model === "fixed") return fixed > 0 ? String(fixed) : "";
  if (model === "hourly") return hourly > 0 && hours > 0 ? String(hourly * hours) : "";
  if (model === "successFee") return success > 0 ? String(success) : "";
  if (model === "hybrid") {
    const hourlyTotal = hourly > 0 && hours > 0 ? hourly * hours : 0;
    const total = fixed + hourlyTotal + success;
    return total > 0 ? String(total) : "";
  }

  return "";
};

const calcRetainerTotalByModel = (form) => {
  const visible = getFeeVisibility(form);
  const duration = parseNum(form.retainerDuration);
  const monthly = parseNum(form.monthlyFee);
  const hourly = parseNum(form.hourlyRate);
  const hours = parseNum(form.estimatedHours);
  let total = 0;

  if (visible.monthlyFee && monthly > 0 && duration > 0) {
    total += monthly * duration;
  }

  if (visible.hourlyRate && hourly > 0 && hours > 0) {
    total += hourly * hours * (duration > 0 ? duration : 1);
  }

  return total > 0 ? String(total) : "";
};

const calcTotalByFeeModel = (form) =>
  form.contractType === "retainer" ? calcRetainerTotalByModel(form) : calcByCaseTotal(form);

const calcPaymentTermEndDate = (form) => {
  if (form.contractType === "retainer") {
    return calcRetainerEndDate(form.paymentDate, form.retainerDuration, form.retainerPeriod);
  }

  if (!form.paymentTerms || ["manual", "milestone", "monthly", "quarterly"].includes(form.billingCycle)) {
    return "";
  }

  const baseDate = form.paymentDate || form.issuedDate;
  if (Object.prototype.hasOwnProperty.call(PAYMENT_TERM_DAYS, form.paymentTerms)) {
    return addDays(baseDate, PAYMENT_TERM_DAYS[form.paymentTerms]);
  }
  if (form.paymentTerms === "endFollowingMonth") return endOfFollowingMonth(baseDate);
  return "";
};

const TOTAL_DRIVER_FIELDS = [
  "contractType",
  "feeModel",
  "monthlyFee",
  "retainerDuration",
  "fixedAmount",
  "hourlyRate",
  "estimatedHours",
  "successFee",
];

const DATE_DRIVER_FIELDS = [
  "contractType",
  "billingCycle",
  "paymentTerms",
  "paymentDate",
  "issuedDate",
  "retainerDuration",
  "retainerPeriod",
];

const deriveForm = (prev, patch) => {
  const next = { ...prev, ...patch };
  const patchKeys = Object.keys(patch);

  if (patchKeys.some((key) => TOTAL_DRIVER_FIELDS.includes(key))) {
    next.totalAmount = calcTotalByFeeModel(next);
  }

  if (patchKeys.some((key) => DATE_DRIVER_FIELDS.includes(key))) {
    const calculatedEndDate = calcPaymentTermEndDate(next);
    if (calculatedEndDate) next.endDate = calculatedEndDate;
  }

  return next;
};

const retainerDurationSuffix = (retainerPeriod, durationValue) => {
  const singular = parseNum(durationValue) === 1;
  if (retainerPeriod === "monthly") return singular ? "month" : "months";
  if (retainerPeriod === "quarterly") return singular ? "quarter" : "quarters";
  if (retainerPeriod === "yearly") return singular ? "year" : "years";
  return singular ? "cycle" : "cycles";
};

const getViewInputArgs = () => ctx.view?.inputArgs || {};

const getUrlFilterByTk = () => {
  try {
    const match = window.location.pathname.match(/\/filterbytk\/([^/?#]+)/i);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
};

const getUrlPathname = () => {
  try {
    return String(window.location.pathname || "");
  } catch {
    return "";
  }
};

const recordHasProp = (record, key) =>
  !!record && typeof record === "object" && Object.prototype.hasOwnProperty.call(record, key);

const recordHasAnyProp = (record, keys) => keys.some((key) => recordHasProp(record, key));

const isQuotationCollection = (name) => {
  const value = String(name || "").toLowerCase();
  return value.includes("quotation") || value.includes("quote");
};

const looksLikeQuotationRecord = (record = {}, collectionName = "") => {
  if (!record || typeof record !== "object") return false;
  const name =
    collectionName ||
    record.collectionName ||
    record.__collectionName ||
    record.collection?.name ||
    "";
  if (isQuotationCollection(name)) return true;
  if (
    recordHasAnyProp(record, [
      "contractCode",
      "contractName",
      "contractType",
      "caseCode",
      "caseName",
      "projectName",
      "projectManagerId",
      "projectStatus",
      "leadType",
      "customerType",
    ]) ||
    Array.isArray(record.assignees)
  ) {
    return false;
  }
  return (
    recordHasAnyProp(record, [
      "quotationNumber",
      "quotationCode",
      "quoteNumber",
      "quoteCode",
      "quotationName",
    ]) ||
    (recordHasProp(record, "pricingMode") &&
      recordHasAnyProp(record, ["subTotal", "totalAmount", "grandTotal", "packageSubTotal"]))
  );
};

const getRuntimeContextRecords = (inputArgs = getViewInputArgs(), params = inputArgs.params || {}) =>
  [
    ctx.record,
    ctx.popup?.record,
    ctx.view?.record,
    ctx.modal?.record,
    inputArgs.record,
    inputArgs.sourceRecord,
    inputArgs.parentItem,
    inputArgs.currentRecord,
    params.record,
    params.sourceRecord,
    params.parentItem,
    params.currentRecord,
  ]
    .map((record) => unwrapContextRecord(record))
    .filter((record) => record && typeof record === "object");

const unwrapContextRecord = (record) => {
  if (!record || typeof record !== "object") return record;
  const data = record.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return record;

  const keys = Object.keys(record);
  const wrapperLike =
    keys.length <= 4 &&
    keys.every((key) => ["data", "meta", "status", "success"].includes(key));
  return wrapperLike || !extractId(record.id)
    ? unwrapContextRecord(data)
    : record;
};

const inferQuotationIdFromRecords = (records = [], collectionName = "") => {
  for (const record of records) {
    if (looksLikeQuotationRecord(record, collectionName)) {
      const id = extractId(record.id) || extractId(record.quotationId) || extractFirstId(record.quotations);
      if (id) return id;
    }
  }
  return null;
};

const getPopupParams = () => {
  const inputArgs = getViewInputArgs();
  const params = inputArgs.params || {};
  const sourceCollectionName =
    inputArgs.sourceCollectionName ||
    params.sourceCollectionName ||
    ctx.action?.params?.sourceCollectionName ||
    ctx.modal?.params?.sourceCollectionName ||
    ctx.view?.params?.sourceCollectionName ||
    ctx.popup?.params?.sourceCollectionName ||
    ctx.params?.sourceCollectionName;
  const sourceRecordId =
    inputArgs.sourceRecordId ||
    params.sourceRecordId ||
    inputArgs.sourceId ||
    params.sourceId ||
    ctx.action?.params?.sourceRecordId ||
    ctx.modal?.params?.sourceRecordId ||
    ctx.view?.params?.sourceRecordId ||
    ctx.popup?.params?.sourceRecordId ||
    ctx.params?.sourceRecordId;
  const runtimeRecords = getRuntimeContextRecords(inputArgs, params);
  const runtimeCollectionName =
    inputArgs.collectionName ||
    params.collectionName ||
    ctx.collection?.name ||
    "";
  const runtimeQuotationId = inferQuotationIdFromRecords(runtimeRecords, runtimeCollectionName);
  const sourceQuotationId =
    inputArgs.sourceQuotationId ||
    params.sourceQuotationId ||
    ctx.action?.params?.sourceQuotationId ||
    ctx.modal?.params?.sourceQuotationId ||
    ctx.view?.params?.sourceQuotationId ||
    ctx.popup?.params?.sourceQuotationId ||
    ctx.params?.sourceQuotationId ||
    (isQuotationCollection(sourceCollectionName) ? sourceRecordId : null) ||
    runtimeQuotationId;
  const sourceName = String(sourceCollectionName || "").toLowerCase();
  const sourceCustomerId =
    inputArgs.sourceCustomerId ||
    params.sourceCustomerId ||
    ctx.action?.params?.sourceCustomerId ||
    ctx.modal?.params?.sourceCustomerId ||
    ctx.view?.params?.sourceCustomerId ||
    ctx.popup?.params?.sourceCustomerId ||
    ctx.params?.sourceCustomerId ||
    (sourceName.includes("customer") || sourceName.includes("contact") ? sourceRecordId : null);
  const sourceProjectId =
    inputArgs.sourceProjectId ||
    params.sourceProjectId ||
    inputArgs.sourceCaseId ||
    params.sourceCaseId ||
    ctx.action?.params?.sourceProjectId ||
    ctx.action?.params?.sourceCaseId ||
    ctx.modal?.params?.sourceProjectId ||
    ctx.modal?.params?.sourceCaseId ||
    ctx.view?.params?.sourceProjectId ||
    ctx.view?.params?.sourceCaseId ||
    ctx.popup?.params?.sourceProjectId ||
    ctx.popup?.params?.sourceCaseId ||
    ctx.params?.sourceProjectId ||
    ctx.params?.sourceCaseId ||
    (sourceName.includes("project") || sourceName.includes("case") ? sourceRecordId : null);
  return {
    ...(inputArgs || {}),
    ...(params || {}),
    ...(ctx.action?.params || {}),
    ...(ctx.modal?.params || {}),
    ...(ctx.view?.params || {}),
    ...(ctx.popup?.params || {}),
    ...(ctx.params || {}),
    customerId: ctx.view?.customerId || inputArgs?.customerId || inputArgs?.params?.customerId || sourceCustomerId || ctx.popup?.params?.customerId || ctx.params?.customerId,
    internalCompanyId: ctx.view?.internalCompanyId || inputArgs?.internalCompanyId || inputArgs?.params?.internalCompanyId || ctx.popup?.params?.internalCompanyId || ctx.params?.internalCompanyId,
    lawyerId: ctx.view?.lawyerId || inputArgs?.lawyerId || inputArgs?.params?.lawyerId || ctx.popup?.params?.lawyerId || ctx.params?.lawyerId,
    quotationId: ctx.view?.quotationId || inputArgs?.quotationId || inputArgs?.params?.quotationId || sourceQuotationId || ctx.popup?.params?.quotationId || ctx.params?.quotationId,
    sourceQuotationId,
    sourceCustomerId,
    sourceProjectId,
    sourceCollectionName,
    sourceRecordId,
    projectId: ctx.view?.projectId || inputArgs?.projectId || inputArgs?.params?.projectId || sourceProjectId || ctx.popup?.params?.projectId || ctx.params?.projectId,
    caseId: ctx.view?.caseId || inputArgs?.caseId || inputArgs?.params?.caseId || sourceProjectId || ctx.popup?.params?.caseId || ctx.params?.caseId,
  };
};

const safeJsonStringify = (obj) => {
  try {
    if (obj === null || typeof obj !== "object") return String(obj);
    const clean = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val === null || typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
          clean[key] = val;
        } else if (typeof val === "object") {
          if (Array.isArray(val)) {
            clean[key] = `Array(${val.length})`;
          } else {
            clean[key] = `Object(${Object.keys(val).join(", ")})`;
          }
        }
      }
    }
    return JSON.stringify(clean);
  } catch (e) {
    return "[Serialization Error: " + e.message + "]";
  }
};

const debugContractContext = (step, payload) => {
  console.log(`[ContractCreateForm][context:${step}]`, safeJsonStringify(payload));
};

const firstId = (...values) => {
  for (const value of values) {
    const id = Array.isArray(value) ? extractFirstId(value) : extractId(value);
    if (id) return id;
  }
  return null;
};

const getConfiguredProjectRecord = () => PROJECT_RECORD_CONFIG.record || {};

const hasOwn = (record, key) =>
  !!record && typeof record === "object" && Object.prototype.hasOwnProperty.call(record, key);

const getContextRecordKind = (record = {}, collectionName = "") => {
  const name = String(collectionName || "").toLowerCase();
  if (name.includes("customer")) return "customer";
  if (name.includes("lead")) return "lead";
  if (isQuotationCollection(name)) return "quotation";
  if (name.includes("project")) return "";
  if (
    record?.caseCode ||
    record?.caseName ||
    record?.projectName ||
    record?.projectManagerId ||
    record?.projectStatus ||
    record?.quotationId ||
    record?.contractId ||
    Array.isArray(record?.assignees)
  ) {
    return "";
  }
  if (hasOwn(record, "customerType")) return "customer";
  if (hasOwn(record, "leadType")) return "lead";
  if (looksLikeQuotationRecord(record, collectionName)) {
    return "quotation";
  }
  if (hasOwn(record, "customerName") || hasOwn(record, "companyLegalName") || hasOwn(record, "contactName")) {
    return "customer";
  }
  return "";
};

const recordInternalCompanyId = (record) =>
  firstId(record?.internalCompanyId, record?.internalCompany, record?.internalCompanies);

const recordLawyerId = (record) =>
  firstId(record?.lawyerId, record?.lawyer, record?.lawyers, record?.assignedLawyerId, record?.assignedLawyer);

const getConfiguredProjectId = () => {
  const record = getConfiguredProjectRecord();
  return isProjectRecord(record) ? extractId(record?.id) : null;
};

const isProjectRecord = (record = {}, collectionName = "") => {
  if (!record || typeof record !== "object") return false;
  if (getContextRecordKind(record, collectionName)) return false;
  if (isProjectCollection(collectionName)) return true;
  return !!(
    record.caseCode ||
    record.caseName ||
    record.projectName ||
    record.projectManagerId ||
    record.projectStatus ||
    record.quotationId ||
    record.contractId ||
    Array.isArray(record.assignees)
  );
};

const isProjectServiceCollection = (name) =>
  String(name || "").toLowerCase().includes("projectservices");

const isProjectCollection = (name) =>
  String(name || "").toLowerCase().includes("projects");

const contractStatusToProjectServiceStatus = (status) => {
  const st = String(status || "").toLowerCase().trim();
  if (["cancelled", "canceled", "terminated", "rejected"].includes(st)) return "cancelled";
  if (["completed", "closed", "done"].includes(st)) return "completed";
  if (["execution", "active", "signed"].includes(st)) return "active";
  if (["sent", "pending_signature", "waiting_signature", "signature"].includes(st)) return "contract_pending_signature";
  return "contracted";
};

const safeNumber = (...values) => {
  for (const value of values) {
    const parsed = nullableNum(value);
    if (parsed !== null && parsed !== undefined && parsed !== 0) return parsed;
  }
  return 0;
};

const codeDateParts = (dateValue) => {
  const d = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  const safeDate = Number.isNaN(d.getTime()) ? new Date() : d;
  return {
    mm: String(safeDate.getMonth() + 1).padStart(2, "0"),
    yyyy: safeDate.getFullYear(),
  };
};

const generateContractCode = async ({ prefix, issuedDate, parentId }) => {
  const { mm, yyyy } = codeDateParts(issuedDate);
  const suffix = `${mm}${yyyy}`;
  const filter =
    prefix === "PL" && parentId
      ? { parentId: { $eq: parseInt(parentId, 10) } }
      : {};

  const res = await ctx.api.request({
    url: "contracts:list",
    params: {
      page: 1,
      pageSize: 1000,
      sort: ["-createdAt"],
      ...(Object.keys(filter).length ? { filter: JSON.stringify(filter) } : {}),
    },
  });

  const pattern = new RegExp(`^${prefix}(\\d{2})${suffix}$`, "i");
  const items = res?.data?.data || [];
  const maxIndex = items.reduce((max, item) => {
    const code = String(item?.contractCode || item?.contractNumber || item?.code || "");
    const match = code.match(pattern);
    return match ? Math.max(max, parseInt(match[1], 10) || 0) : max;
  }, 0);

  return `${prefix}${String(maxIndex + 1).padStart(2, "0")}${suffix}`;
};

async function fetchAll(url, params = {}) {
  try {
    const res = await ctx.api.request({
      url,
      params: { pageSize: 500, page: 1, sort: ["-createdAt"], ...params },
    });
    return newestFirst(res?.data?.data || []);
  } catch (error) {
    console.warn(`[ContractCreateForm] Could not fetch ${url}`, error);
    return [];
  }
}

const hasRecordId = (items, id) =>
  !!id && items.some((item) => String(extractId(item?.id)) === String(id));

const mergeRecordById = (items, record) => {
  const id = extractId(record?.id);
  if (!id) return items;
  const index = items.findIndex((item) => String(extractId(item?.id)) === String(id));
  if (index === -1) return [record, ...items];
  const next = items.slice();
  next[index] = { ...next[index], ...record };
  return next;
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 0,
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "9px 11px",
  fontSize: 13,
  lineHeight: "20px",
  color: C.text,
  background: C.bg,
  outline: "none",
  fontFamily: FONT,
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: C.label,
};

const mutedStyle = {
  fontSize: 12,
  color: C.sub,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
};

const FIELD_HELP = {
  "Contract type": "Chọn byCase cho hợp đồng theo vụ việc, retainer cho hợp đồng dịch vụ định kỳ.",
  Status: "Trạng thái xử lý nội bộ của hợp đồng.",
  "Contract code": "Có thể nhập tay hoặc để trống để hệ thống tự tạo CT/PL theo ngữ cảnh.",
  "Contract name": "Tên dùng để nhận diện hợp đồng trong danh sách và tìm kiếm.",
  "Parent contract": "Chọn hợp đồng gốc nếu đây là phụ lục hoặc hợp đồng con.",
  Customer: "Khách hàng của hợp đồng. Khi chọn customer, danh sách quotation sẽ được lọc theo customer này.",
  "Internal company": "Pháp nhân/công ty nội bộ đứng tên cung cấp dịch vụ.",
  Lawyer: "Luật sư phụ trách chính nếu đã xác định.",
  Template: "Mẫu hợp đồng dùng cho soạn thảo hoặc in ấn.",
  Quotation: "Báo giá liên quan. Khi chọn quotation, form chỉ tự lấy các liên kết chính như customer, company, lawyer và payment terms; giá trị tiền trong hợp đồng vẫn theo form này.",
  Case: "Case hoặc hồ sơ mà hợp đồng này phục vụ.",
  "Issued date": "Ngày phát hành hợp đồng và là mốc ngày chính của hợp đồng.",
  "Payment date": "Ngày dự kiến thanh toán hoặc ngày theo dõi nghĩa vụ thanh toán.",
  "End date": "Ngày kết thúc hoặc hạn theo dõi chính. Với by case one time, field này có thể tự tính từ payment terms; milestone/manual cần nhập tay.",
  "Fee model": "Cách tính phí chính: trọn gói, theo giờ, retainer, success fee hoặc kết hợp.",
  "Billing cycle": "Chu kỳ phát sinh phí hoặc khoản thanh toán. Manual/milestone không đủ dữ liệu để tự tính lịch thanh toán chi tiết.",
  "Payment terms": "Điều khoản/hạn thanh toán dành cho hợp đồng by case. Dùng để tự tính end date khi billing cycle là one time.",
  "Retainer period": "Kỳ áp dụng của retainer như tháng, quý, năm hoặc tùy chỉnh.",
  "Retainer duration": "Số kỳ retainer theo retainer period. Bỏ trống nếu retainer không có thời hạn cố định.",
  "Fixed amount": "Phí trọn gói cho hợp đồng by case.",
  "Monthly fee": "Phí định kỳ của hợp đồng retainer.",
  "Hourly rate": "Đơn giá theo giờ để tham chiếu hoặc tính phần việc theo thời gian.",
  "Estimated hours": "Số giờ dự kiến dùng để tính tổng tiền khi fee model là hourly hoặc hybrid.",
  "Overage hourly rate": "Đơn giá cho giờ vượt gói retainer.",
  "Success fee": "Phí thành công khi đạt điều kiện/kết quả đã thỏa thuận.",
  "Included hours": "Số giờ đã bao gồm trong gói retainer.",
  Subtotal: "Giá trị trước VAT.",
  "VAT amount": "Số tiền VAT.",
  "Total amount": "Tổng giá trị hợp đồng. Form có thể tự tính theo fee model nhưng người dùng vẫn có thể chỉnh tay.",
  "Scope note": "Phạm vi công việc, phần bao gồm/loại trừ và điều kiện phát sinh.",
  Description: "Ghi chú nội bộ hoặc mô tả bổ sung.",
};

const focus = (e) => {
  e.currentTarget.style.borderColor = C.borderFocus;
};

const blur = (e) => {
  e.currentTarget.style.borderColor = C.border;
};

const HelpMark = ({ text }) => {
  if (!text) return null;
  const mark = React.createElement(
    "span",
    {
      title: text,
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 15,
        height: 15,
        borderRadius: "50%",
        border: `1px solid ${C.border}`,
        color: C.sub,
        fontSize: 10,
        fontWeight: 700,
        lineHeight: "14px",
        marginLeft: 6,
        cursor: "help",
        flex: "0 0 auto",
      },
    },
    "?",
  );

  return Tooltip ? React.createElement(Tooltip, { title: text }, mark) : mark;
};

const Field = ({ label, required, children, hint, tooltip }) =>
  React.createElement(
    "label",
    { style: fieldStyle },
    React.createElement(
      "span",
      {
        style: {
          ...labelStyle,
          display: "inline-flex",
          alignItems: "center",
          minHeight: 18,
        },
      },
      label,
      required &&
        React.createElement("span", { style: { color: C.danger, marginLeft: 3 } }, "*"),
      React.createElement(HelpMark, { text: tooltip || FIELD_HELP[label] }),
    ),
    children,
    hint && React.createElement("span", { style: mutedStyle }, hint),
  );

const Section = ({ title, children }) =>
  React.createElement(
    "section",
    {
      style: {
        borderTop: `1px solid ${C.border}`,
        paddingTop: 18,
        marginTop: 18,
      },
    },
    React.createElement(
      "div",
      {
        style: {
          fontSize: 14,
          fontWeight: 700,
          color: C.text,
          marginBottom: 12,
        },
      },
      title,
    ),
    children,
  );

const TextInput = ({ value, onChange, placeholder, type = "text" }) =>
  React.createElement("input", {
    type,
    value: value ?? "",
    placeholder,
    onChange: (e) => onChange(e.target.value),
    onFocus: focus,
    onBlur: blur,
    style: inputStyle,
  });

const MoneyInput = ({ value, onChange, placeholder = "0" }) =>
  React.createElement(
    "div",
    { style: { position: "relative", width: "100%" } },
    React.createElement("input", {
      type: "text",
      inputMode: "numeric",
      value: formatMoneyNumber(value),
      placeholder,
      onChange: (e) => onChange(moneyRaw(e.target.value)),
      onFocus: focus,
      onBlur: blur,
      style: {
        ...inputStyle,
        textAlign: "center",
        fontVariantNumeric: "tabular-nums",
        paddingRight: hasInputValue(value) ? 46 : 11,
      },
    }),
    hasInputValue(value) &&
      React.createElement(
        "span",
        {
          style: {
            position: "absolute",
            right: 11,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 11,
            color: C.sub,
            pointerEvents: "none",
          },
        },
    "VNĐ",
      ),
  );

const SuffixInput = ({ value, onChange, placeholder = "0", suffix }) => {
  const suffixPad = suffix ? Math.max(58, String(suffix).length * 8 + 22) : 11;

  return React.createElement(
    "div",
    { style: { position: "relative", width: "100%" } },
    React.createElement("input", {
      type: "text",
      inputMode: "numeric",
      value: value ?? "",
      placeholder,
      onChange: (e) => onChange(e.target.value),
      onFocus: focus,
      onBlur: blur,
      style: {
        ...inputStyle,
        textAlign: "center",
        fontVariantNumeric: "tabular-nums",
        paddingRight: suffixPad,
      },
    }),
    suffix &&
      React.createElement(
        "span",
        {
          style: {
            position: "absolute",
            right: 11,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 11,
            color: C.sub,
            pointerEvents: "none",
          },
        },
        suffix,
      ),
  );
};

const PercentInput = ({ value, onChange, placeholder = "0" }) =>
  React.createElement(
    "div",
    {
      style: {
        ...inputStyle,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 11px",
        minHeight: 40,
      },
    },
    React.createElement("input", {
      type: "text",
      inputMode: "numeric",
      value: value ?? "",
      placeholder,
      onChange: (e) => onChange(moneyRaw(e.target.value)),
      onFocus: (e) => {
        e.currentTarget.parentElement.style.borderColor = C.borderFocus;
      },
      onBlur: (e) => {
        e.currentTarget.parentElement.style.borderColor = C.border;
      },
      style: {
        width: "100%",
        minWidth: 0,
        border: "none",
        outline: "none",
        background: "transparent",
        color: C.text,
        textAlign: "right",
        fontSize: 14,
        fontFamily: FONT,
        fontVariantNumeric: "tabular-nums",
      },
    }),
    React.createElement(
      "span",
      {
        style: {
          color: C.sub,
          fontSize: 12,
          fontWeight: 700,
          flex: "0 0 auto",
        },
      },
      "%",
    ),
  );

const TextArea = ({ value, onChange, placeholder, rows = 3 }) =>
  React.createElement("textarea", {
    value: value ?? "",
    placeholder,
    rows,
    onChange: (e) => onChange(e.target.value),
    onFocus: focus,
    onBlur: blur,
    style: {
      ...inputStyle,
      resize: "vertical",
      minHeight: rows * 24 + 18,
    },
  });

const SelectInput = ({ value, onChange, options, placeholder }) =>
  React.createElement(
    "select",
    {
      value: value ?? "",
      onChange: (e) => onChange(e.target.value),
      onFocus: focus,
      onBlur: blur,
      style: inputStyle,
    },
    React.createElement("option", { value: "" }, placeholder || "Select"),
    options.map((option) =>
      React.createElement(
        "option",
        { key: option.value, value: option.value },
        option.label,
      ),
    ),
  );

const normalizeSearch = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const SearchSelect = ({ value, onChange, options, placeholder, emptyText = "No matching records" }) => {
  const selected = options.find((option) => String(option.value) === String(value));
  const [query, setQuery] = useState(selected?.label || "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(selected?.label || "");
  }, [value, selected?.label]);

  const filteredOptions = useMemo(() => {
    const q = normalizeSearch(query).trim();
    const source = q
      ? options.filter(
          (option) =>
            normalizeSearch(option.label).includes(q) ||
            normalizeSearch(option.subLabel).includes(q) ||
            normalizeSearch(option.value).includes(q),
        )
      : options;

    return source.slice(0, 40);
  }, [options, query]);

  return React.createElement(
    "div",
    { style: { position: "relative", width: "100%" } },
    React.createElement("input", {
      type: "text",
      value: query,
      placeholder,
      onChange: (e) => {
        setQuery(e.target.value);
        setOpen(true);
      },
      onFocus: (e) => {
        focus(e);
        setOpen(true);
      },
      onBlur: (e) => {
        blur(e);
        setTimeout(() => setOpen(false), 120);
      },
      style: {
        ...inputStyle,
        paddingRight: selected ? 60 : 11,
      },
    }),
    selected &&
      React.createElement(
        "button",
        {
          type: "button",
          onMouseDown: (e) => e.preventDefault(),
          onClick: () => {
            onChange("");
            setQuery("");
            setOpen(false);
          },
          style: {
            position: "absolute",
            right: 7,
            top: 6,
            border: "none",
            background: "transparent",
            color: C.sub,
            fontSize: 12,
            fontWeight: 600,
            lineHeight: "24px",
            padding: "0 4px",
            cursor: "pointer",
            fontFamily: FONT,
          },
        },
        "Clear",
      ),
    open &&
      React.createElement(
        "div",
        {
          style: {
            position: "absolute",
            left: 0,
            right: 0,
            top: "calc(100% + 4px)",
            zIndex: 20,
            maxHeight: 220,
            overflowY: "auto",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            background: C.bg,
            boxShadow: "0 12px 28px rgba(15, 23, 42, 0.14)",
          },
        },
        filteredOptions.length
          ? filteredOptions.map((option) =>
              React.createElement(
                "div",
                {
                  key: option.value,
                  onMouseDown: (e) => {
                    e.preventDefault();
                    onChange(option.value);
                    setQuery(option.label);
                    setOpen(false);
                  },
                  style: {
                    padding: "9px 11px",
                    cursor: "pointer",
                    background:
                      String(option.value) === String(value) ? "#eef4fb" : C.bg,
                  },
                },
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 13,
                      lineHeight: "18px",
                      color: C.text,
                      fontWeight: 600,
                    },
                  },
                  option.label,
                ),
                option.subLabel &&
                  React.createElement(
                    "div",
                    {
                      style: {
                        marginTop: 2,
                        fontSize: 12,
                        lineHeight: "17px",
                        color: C.sub,
                      },
                    },
                    option.subLabel,
                  ),
              ),
            )
          : React.createElement(
              "div",
              {
                style: {
                  padding: "9px 11px",
                  fontSize: 13,
                  color: C.sub,
                },
              },
              emptyText,
            ),
      ),
  );
};

const TutorialPanel = ({ contractType }) => {
  const isRetainer = contractType === "retainer";
  const typeRows = isRetainer
    ? [
        ["Monthly fee", "Phí định kỳ của hợp đồng retainer, thường là số tiền khách hàng thanh toán mỗi tháng hoặc mỗi kỳ."],
        ["Retainer period", "Kỳ áp dụng của retainer như tháng, quý, năm hoặc một kỳ tùy chỉnh."],
        ["Retainer duration", "Số kỳ retainer theo retainer period. Ví dụ period monthly và duration 6 nghĩa là 6 tháng; bỏ trống nếu hợp đồng không có thời hạn cố định."],
        ["Included hours", "Số giờ làm việc đã bao gồm trong phí retainer. Có thể bỏ trống nếu chưa quản lý giờ."],
        ["Hourly rate", "Đơn giá theo giờ dùng để tham chiếu hoặc tính phần việc ngoài phạm vi."],
        ["Estimated hours", "Số giờ dự kiến dùng khi retainer tính theo hourly hoặc hybrid. Field này dùng để ước tính total amount, không thay thế bảng chấm công thực tế."],
        ["Overage hourly rate", "Đơn giá cho số giờ vượt quá phần đã bao gồm trong retainer."],
      ]
    : [
        ["Fixed amount", "Phí trọn gói của một vụ việc cụ thể. Đây thường là giá trị chính của hợp đồng by case."],
        ["Hourly rate", "Đơn giá theo giờ nếu vụ việc có phần tính theo thời gian thực hiện."],
        ["Estimated hours", "Số giờ dự kiến dùng để tính tổng tiền khi fee model là hourly hoặc hybrid."],
        ["Success fee", "Phí thành công phát sinh khi đạt điều kiện hoặc kết quả đã thỏa thuận."],
        ["Payment terms", "Điều khoản thanh toán của by case, dùng để xác định hạn thanh toán sau khi ký hợp đồng, xuất hóa đơn, hoàn thành milestone hoặc thanh toán phần còn lại."],
      ];

  const byCaseFlowRows = [
    [
      "1. Liên kết dữ liệu",
      "Chọn customer, quotation và case nếu đã có. Quotation chỉ dùng để tham chiếu và gán thông tin liên quan; các giá trị tiền trong hợp đồng vẫn do người dùng nhập thủ công theo nội dung hợp đồng đã chốt.",
    ],
    [
      "2. Chọn fee model",
      "Fixed dùng cho phí trọn gói; hourly dùng khi tính theo giờ; success fee dùng khi có phí thành công; hybrid dùng khi hợp đồng kết hợp nhiều cách tính như fixed + success fee hoặc fixed + hourly.",
    ],
    [
      "3. Chọn billing cycle",
      "One time phù hợp khi thu một lần; milestone phù hợp khi thu theo giai đoạn; monthly phù hợp cho by case tính theo giờ và cần chốt theo tháng; manual dùng khi lịch thanh toán chưa chuẩn hóa.",
    ],
    [
      "4. Chọn payment terms",
      "Payment terms là hạn thanh toán sau khi khoản phí phát sinh, ví dụ thanh toán ngay, net 15 hoặc net 30. Với billing cycle one time, form có thể tự tính end date từ payment date hoặc issued date.",
    ],
    [
      "5. Tự tính total amount",
      "Fixed: total = fixed amount. Hourly: total = hourly rate x estimated hours. Success: total = success fee. Hybrid: total = fixed amount + hourly rate x estimated hours + success fee. Người dùng vẫn có thể sửa lại total amount sau khi form tự tính.",
    ],
    [
      "6. Theo dõi thực hiện",
      "Issued date là ngày phát hành/chốt hợp đồng, payment date là mốc bắt đầu tính hạn thanh toán, end date là ngày theo dõi cuối cùng nếu form tính được hoặc người dùng nhập tay.",
    ],
    [
      "7. Manual và milestone",
      "Manual nghĩa là lịch thanh toán chưa chuẩn hóa nên không thể tự sinh ngày. Milestone nghĩa là thanh toán theo từng giai đoạn; muốn tự động đầy đủ cần một bảng payment schedule/milestones riêng. Trong form hiện tại, end date của manual và milestone nên nhập tay.",
    ],
  ];

  const groups = [
    {
      title: "Thông tin hợp đồng",
      rows: [
        ["Contract type", "Phân loại hợp đồng. By case dùng cho một vụ việc cụ thể, retainer dùng cho hợp đồng dịch vụ định kỳ."],
        ["Status", "Trạng thái xử lý nội bộ của hợp đồng, ví dụ draft, review, sent hoặc signed."],
        ["Contract code", "Mã hợp đồng. Nếu để trống, hệ thống tự tạo CT cho hợp đồng chính hoặc PL cho phụ lục/sub-contract theo tháng năm của issued date."],
        ["Contract name", "Tên hợp đồng để nhận diện trong danh sách và khi tìm kiếm."],
        ["Parent contract", "Dùng khi hợp đồng này là phụ lục, hợp đồng con hoặc liên quan trực tiếp tới một hợp đồng chính."],
      ],
    },
    {
      title: "Đối tượng liên quan",
      rows: [
        ["Customer", "Khách hàng hoặc bên nhận dịch vụ trong hợp đồng."],
        ["Internal company", "Pháp nhân hoặc công ty nội bộ đứng tên cung cấp dịch vụ."],
        ["Lawyer", "Luật sư phụ trách chính nếu hợp đồng cần gán người xử lý."],
        ["Template", "Mẫu hợp đồng dùng để soạn thảo hoặc in ấn nếu có."],
        ["Quotation", "Báo giá liên quan tới hợp đồng. Field này giúp đối chiếu giá trị đã báo với hợp đồng thực tế."],
        ["Case", "Case hoặc hồ sơ mà hợp đồng này phục vụ."],
      ],
    },
    {
      title: "Mốc thời gian",
      rows: [
        ["Issued date", "Ngày phát hành hợp đồng, đồng thời là mốc ngày chính để xác định hiệu lực nghiệp vụ nếu không có ngày riêng khác."],
        ["Payment date", "Ngày dự kiến thanh toán hoặc ngày dùng để theo dõi nghĩa vụ thanh toán."],
        ["End date", "Với by case one time, ngày này có thể tự tính theo payment terms. Với retainer, ngày này tự tính theo payment date, retainer period và duration. Với manual/milestone, người dùng nhập tay."],
      ],
    },
    {
      title: isRetainer ? "Điều khoản retainer" : "Điều khoản by case",
      rows: typeRows,
    },
    ...(!isRetainer
      ? [
          {
            title: "Logic hoạt động byCase",
            rows: byCaseFlowRows,
          },
        ]
      : []),
    {
      title: "Giá trị và ghi chú",
      rows: [
        ["Fee model", "Cách tính phí chính của hợp đồng như trọn gói, theo giờ, retainer tháng, success fee hoặc kết hợp."],
        ["Billing cycle", isRetainer ? "Chu kỳ phát sinh phí retainer, ví dụ theo tháng, theo quý hoặc nhập thủ công." : "Cách phát sinh khoản thanh toán của by case, ví dụ một lần, theo milestone hoặc nhập thủ công."],
        ["Subtotal", "Giá trị trước VAT."],
        ["VAT amount", "Số tiền thuế VAT nếu có."],
        ["Total amount", "Tổng giá trị hợp đồng. Form tự tính theo fee model để hỗ trợ nhập liệu, nhưng người dùng vẫn có thể chỉnh lại theo nội dung hợp đồng thực tế."],
        ["Scope note", "Phạm vi công việc, phần bao gồm, phần loại trừ và điều kiện xử lý phát sinh."],
        ["Description", "Ghi chú nội bộ hoặc mô tả bổ sung cho người quản trị."],
      ],
    },
  ];

  return React.createElement(
    "div",
    {
      style: {
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        background: C.bgSoft,
        padding: 16,
      },
    },
    React.createElement(
      "div",
      { style: { fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 } },
      "Giải thích field hợp đồng",
    ),
    React.createElement(
      "div",
      { style: { fontSize: 12.5, color: C.sub, lineHeight: "19px", marginBottom: 14 } },
      "Phần này giải thích ý nghĩa từng field để người dùng nhập thủ công đúng ngữ cảnh. Field nào chưa có thông tin chắc chắn có thể để trống và cập nhật sau.",
    ),
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          columnGap: 18,
          rowGap: 12,
          alignItems: "start",
        },
      },
      groups.map((group) =>
      React.createElement(
        "div",
        {
          key: group.title,
          style: {
            borderTop: `1px solid ${C.border}`,
            paddingTop: 12,
          },
        },
        React.createElement(
          "div",
          { style: { fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 7 } },
          group.title,
        ),
        group.rows.map(([name, desc]) =>
          React.createElement(
            "div",
            { key: name, style: { marginTop: 8 } },
            React.createElement(
              "div",
              { style: { fontSize: 12.5, fontWeight: 700, color: C.label, marginBottom: 2 } },
              name,
            ),
            React.createElement(
              "div",
              { style: { fontSize: 12.5, color: C.sub, lineHeight: "19px" } },
              desc,
            ),
          ),
        ),
      ),
    ),
    ),
  );
};

const ApprovalSection = ({
  isRequired,
  approvedById,
  lawyerOptions,
  onToggle,
  onSelectApprover,
}) => {
  return React.createElement(
    "div",
    { style: { marginTop: 16 } },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 14px",
          background: isRequired ? C.approvalBg : C.bgSoft,
          border: `1px solid ${isRequired ? C.approvalBorder : C.border}`,
          borderRadius: isRequired ? "8px 8px 0 0" : 8,
          cursor: "pointer",
          transition: "all 0.18s",
          userSelect: "none",
        },
        onClick: onToggle,
      },
      React.createElement(
        "div",
        {
          style: {
            width: 18,
            height: 18,
            borderRadius: 4,
            flexShrink: 0,
            border: `2px solid ${isRequired ? C.approvalText : "#d1d5db"}`,
            background: isRequired ? C.approvalText : "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s",
          },
        },
        isRequired &&
          React.createElement(
            "span",
            {
              style: { color: "#fff", fontSize: 11, fontWeight: 900, lineHeight: 1 },
            },
            ""
          ),
      ),
      React.createElement(
        "div",
        { style: { flex: 1 } },
        React.createElement(
          "div",
          {
            style: { display: "inline-flex", alignItems: "center", fontSize: 13.5, fontWeight: 600, color: isRequired ? C.approvalText : C.text },
          },
          "Require approval before execution",
          React.createElement(HelpMark, { text: "Bật nếu hợp đồng cần người có thẩm quyền review trước khi thực hiện." })
        ),
        React.createElement(
          "div",
          { style: { fontSize: 11.5, color: C.sub, marginTop: 1 } },
          "Contract will need approval from authorized personnel"
        )
      ),
      React.createElement(
        "span",
        {
          style: {
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 10px",
            borderRadius: 10,
            flexShrink: 0,
            background: isRequired ? C.approvalBadgeBg : "#f3f4f6",
            color: isRequired ? C.approvalText : "#9ca3af",
            border: `1px solid ${isRequired ? C.approvalBorder : "#e5e7eb"}`,
          },
        },
        isRequired ? "Pending Approval" : "Not Required"
      )
    ),
    isRequired &&
      React.createElement(
        "div",
        {
          style: {
            padding: "14px 14px",
            background: C.approvalBg,
            border: `1px solid ${C.approvalBorder}`,
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
          },
        },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 8 } },
          React.createElement(
            "span",
            { style: { fontSize: 11.5, fontWeight: 700, color: C.approvalText } },
            "Approver",
            React.createElement(HelpMark, { text: "Người được chỉ định xét duyệt hợp đồng khi bật yêu cầu approval." })
          ),
          React.createElement(
            "span",
            { style: { fontSize: 11, color: "#9ca3af", fontStyle: "italic" } },
            "— optional"
          )
        ),
        React.createElement(SearchSelect, {
          options: lawyerOptions,
          value: approvedById,
          onChange: onSelectApprover,
          placeholder: "Search and select approver",
        })
      )
  );
};
const makeIcon = (paths, props = {}) => {
  return React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: props.size || 16,
      height: props.size || 16,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...props
    },
    ...paths
  );
};

const EditIcon = makeIcon([
  React.createElement("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7", key: "1" }),
  React.createElement("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z", key: "2" }),
], { size: 14 });

const CheckIcon = makeIcon([
  React.createElement("polyline", { points: "20 6 9 17 4 12", key: "1" }),
], { size: 14 });

const XIcon = makeIcon([
  React.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18", key: "1" }),
  React.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18", key: "2" }),
], { size: 14 });

const PlusIcon = makeIcon([
  React.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19", key: "1" }),
  React.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12", key: "2" }),
], { size: 14 });

const TrashIcon = makeIcon([
  React.createElement("polyline", { points: "3 6 5 6 21 6", key: "1" }),
  React.createElement("path", { d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6", key: "2" }),
  React.createElement("path", { d: "M10 11v6", key: "3" }),
  React.createElement("path", { d: "M14 11v6", key: "4" }),
  React.createElement("path", { d: "M9 6V4h6v2", key: "5" }),
], { size: 14 });

const SearchIcon = makeIcon([
  React.createElement("circle", { cx: "11", cy: "11", r: "8", key: "1" }),
  React.createElement("path", { d: "m21 21-4.35-4.35", key: "2" }),
], { size: 14 });

const TagIcon = makeIcon([
  React.createElement("path", { d: "M20.59 13.41 12 22l-10-10V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z", key: "1" }),
  React.createElement("circle", { cx: "7", cy: "7", r: "1.5", key: "2" }),
], { size: 14 });

const ChevronDownIcon = makeIcon([
  React.createElement("polyline", { points: "6 9 12 15 18 9", key: "1" }),
], { size: 14 });

const ServiceLinesSection = ({ lines, selectedIds, onToggle, onSelectAll, onClear, onLineUpdate }) => {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingId, setSavingId] = useState(null);

  const handleEdit = (line) => {
    setEditingId(line.projectServiceId);
    setEditForm({
      serviceName: line.serviceName || "",
      description: line.description || "",
      totalAmount: line.totalAmount || 0,
      vat: line.vat || 0,
      quantity: line.quantity || 1,
    });
  };

  const handleSave = async (line) => {
    setSavingId(line.projectServiceId);
    try {
      const amounts = resolveServiceAmounts({
        quantity: firstNonZeroNumber(editForm.quantity, line.quantity, 1) || 1,
        vat: editForm.vat,
        totalAmount: editForm.totalAmount,
      });
      const payload = {
        serviceName: editForm.serviceName,
        description: editForm.description,
        ...projectServicePricingPayload(amounts),
      };
      await ctx.api.request({
        url: `projectServices:update?filterByTk=${line.projectServiceId}`,
        method: "POST",
        data: payload,
      });
      if (line.contractServiceId) {
        try {
          await ctx.api.request({
            url: "contractServices:update",
            method: "POST",
            params: { filterByTk: line.contractServiceId },
            data: payload,
          });
        } catch (error) {
          const fallbackPayload = { ...payload };
          delete fallbackPayload.serviceName;
          await ctx.api.request({
            url: "contractServices:update",
            method: "POST",
            params: { filterByTk: line.contractServiceId },
            data: fallbackPayload,
          });
        }
      }
      message.success("Đã cập nhật dịch vụ");
      onLineUpdate(line.projectServiceId, payload);
      setEditingId(null);
    } catch (e) {
      message.error("Lỗi cập nhật dịch vụ");
    }
    setSavingId(null);
  };

  if (!lines.length) return null;
  const selectableCount = lines.filter((line) => !line.locked).length;
  const selectedTotals = sumServiceLines(lines.filter((line) => selectedIds.includes(String(line.projectServiceId))));
  const serviceTableColumns = "36px minmax(260px, 2fr) minmax(130px, 0.8fr) minmax(125px, 0.8fr) minmax(90px, 0.5fr) minmax(125px, 0.8fr) minmax(135px, 0.85fr) 58px";
  const serviceTableMinWidth = 1050;
  const serviceHeaderStyle = (extra = {}) => ({
    padding: "8px 12px",
    background: "#f9fafb",
    color: C.sub,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    minWidth: 0,
    boxSizing: "border-box",
    ...extra,
  });
  const serviceCellStyle = (extra = {}) => ({
    padding: "11px 12px",
    minWidth: 0,
    boxSizing: "border-box",
    ...extra,
  });

  return React.createElement(
    Section,
    { title: "Services in contract" },
    React.createElement(
      "div",
      { style: { border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", background: "#fff", maxWidth: "100%" } },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "10px 12px",
            background: C.bgSoft,
            borderBottom: `1px solid ${C.border}`,
          },
        },
        React.createElement(
          "span",
          { style: { fontSize: 12, color: C.sub } },
          `${selectedIds.length}/${selectableCount} services selected`,
        ),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } },
          React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: C.text } }, formatMoney(selectedTotals.totalAmount)),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: onSelectAll,
              style: { border: `1px solid ${C.border}`, borderRadius: 6, background: "#fff", padding: "5px 9px", fontSize: 12, fontWeight: 600, fontFamily: FONT, cursor: "pointer" },
            },
            "Select all",
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: onClear,
              style: { border: `1px solid ${C.border}`, borderRadius: 6, background: "#fff", color: C.sub, padding: "5px 9px", fontSize: 12, fontWeight: 600, fontFamily: FONT, cursor: "pointer" },
            },
            "Clear",
          ),
        ),
      ),
      React.createElement(
        "div",
        { role: "table", style: { overflowX: "auto", overflowY: "hidden", maxWidth: "100%", background: "#fff" } },
        React.createElement(
          "div",
          {
            style: {
              minWidth: serviceTableMinWidth,
              width: "100%",
              display: "flex",
              flexDirection: "column",
            },
          },
        React.createElement(
          "div",
          {
            role: "row",
            style: {
              display: "grid",
              gridTemplateColumns: serviceTableColumns,
              width: "100%",
              alignItems: "center",
              background: "#f9fafb",
              borderBottom: `1px solid ${C.border}`,
              boxSizing: "border-box",
            },
          },
          React.createElement("div", { role: "columnheader", style: serviceHeaderStyle({ textAlign: "center" }) }, ""),
          React.createElement("div", { role: "columnheader", style: serviceHeaderStyle({ textAlign: "center" }) }, "Service"),
          React.createElement("div", { role: "columnheader", style: serviceHeaderStyle({ textAlign: "center" }) }, "Status"),
          React.createElement("div", { role: "columnheader", style: serviceHeaderStyle({ textAlign: "center" }) }, "Base price"),
          React.createElement("div", { role: "columnheader", style: serviceHeaderStyle({ textAlign: "center" }) }, "VAT"),
          React.createElement("div", { role: "columnheader", style: serviceHeaderStyle({ textAlign: "center" }) }, "VAT amount"),
          React.createElement("div", { role: "columnheader", style: serviceHeaderStyle({ textAlign: "center" }) }, "Total"),
          React.createElement("div", { role: "columnheader", style: serviceHeaderStyle({ textAlign: "center" }) }, ""),
        ),
      lines.map((line) => {
        const checked = selectedIds.includes(String(line.projectServiceId));
        const isEditing = editingId === line.projectServiceId;
        const isSaving = savingId === line.projectServiceId;
        const editAmounts = isEditing
          ? resolveServiceAmounts({
              quantity: firstNonZeroNumber(editForm.quantity, line.quantity, 1) || 1,
              vat: editForm.vat,
              totalAmount: editForm.totalAmount,
            })
          : null;

        const statusLabel = line.locked ? "Đã có hợp đồng" : serviceStatusLabel(line.status);
        const statusColor = line.locked ? C.danger : (line.status === "active" ? "#52c41a" : (line.status === "ordered" ? "#1890ff" : C.sub));
        const statusBg = line.locked ? "#fff1f0" : (line.status === "active" ? "#f6ffed" : (line.status === "ordered" ? "#e6f7ff" : "#f5f5f5"));

        return React.createElement(
          "div",
          {
            key: line.id,
            role: "row",
            style: {
              display: "grid",
              gridTemplateColumns: serviceTableColumns,
              width: "100%",
              gap: 0,
              alignItems: "center",
              borderBottom: `1px solid ${C.border}`,
              boxSizing: "border-box",
              opacity: line.locked && !isEditing ? 0.55 : 1,
              background: isEditing ? "#fafafa" : "#fff",
              transition: "background 0.2s",
            },
          },
          React.createElement(
            "div",
            { role: "cell", style: serviceCellStyle({ textAlign: "center" }) },
            React.createElement("input", {
              type: "checkbox",
              checked,
              disabled: line.locked || isEditing,
              onChange: () => onToggle(line),
              style: { width: 16, height: 16, cursor: (line.locked || isEditing) ? "not-allowed" : "pointer" },
            }),
          ),
          React.createElement(
            "div",
            { role: "cell", style: serviceCellStyle() },
            isEditing
              ? React.createElement(
                  "div",
                  { style: { display: "flex", flexDirection: "column", gap: 6 } },
                  React.createElement(TextInput, {
                    value: editForm.serviceName,
                    onChange: (val) => setEditForm({ ...editForm, serviceName: val }),
                    placeholder: "Tên dịch vụ",
                  }),
                  React.createElement(TextArea, {
                    value: editForm.description,
                    onChange: (val) => setEditForm({ ...editForm, description: val }),
                    placeholder: "Mô tả",
                    rows: 2,
                  })
                )
              : React.createElement(
                  React.Fragment,
                  null,
                  React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: C.text, wordBreak: "break-word" } }, line.serviceName),
                  React.createElement("div", { style: { fontSize: 11.5, color: C.sub, marginTop: 2, wordBreak: "break-word" } }, line.description || "No description")
                )
          ),
          React.createElement(
            "div",
            { role: "cell", style: serviceCellStyle({ fontSize: 12, fontWeight: 600 }) },
            React.createElement("span", {
              style: {
                background: statusBg, color: statusColor, padding: "2px 8px", borderRadius: 4, border: `1px solid ${statusColor}40`,
              }
            }, statusLabel)
          ),
          React.createElement(
            "div",
            { role: "cell", style: serviceCellStyle({ textAlign: "center" }) },
            React.createElement("span", {
              title: "Base price",
              style: { fontSize: 12, fontWeight: 700, color: C.text, fontVariantNumeric: "tabular-nums" }
            }, formatMoney(isEditing ? editAmounts.basePrice : line.basePrice))
          ),
          React.createElement(
            "div",
            { role: "cell", style: serviceCellStyle({ fontSize: 12, color: C.text, textAlign: "center" }) },
            isEditing
              ? React.createElement(SuffixInput, {
                  value: editForm.vat,
                  onChange: (val) => setEditForm({ ...editForm, vat: moneyRaw(val) }),
                  suffix: "% VAT",
                  placeholder: "0"
                })
              : React.createElement("span", {
                  style: { background: "#f5f5f5", color: C.sub, padding: "2px 8px", borderRadius: 4, border: "1px solid #d9d9d9" }
                }, `${line.vat || 0}%`)
          ),
          React.createElement(
            "div",
            { role: "cell", style: serviceCellStyle({ textAlign: "center" }) },
            React.createElement("span", {
              title: "VAT amount",
              style: { fontSize: 12, fontWeight: 700, color: "#b45309", fontVariantNumeric: "tabular-nums" }
            }, formatMoney(isEditing ? editAmounts.vatAmount : line.vatAmount))
          ),
          React.createElement(
            "div",
            { role: "cell", style: serviceCellStyle({ textAlign: "center" }) },
            isEditing
              ? React.createElement(MoneyInput, {
                  value: editForm.totalAmount,
                  onChange: (val) => setEditForm({ ...editForm, totalAmount: val }),
                })
              : React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: C.text, fontVariantNumeric: "tabular-nums" } }, formatMoney(line.totalAmount))
          ),
          React.createElement(
            "div",
            { role: "cell", style: serviceCellStyle({ display: "flex", gap: 6, justifyContent: "flex-end" }) },
            isEditing
              ? React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(
                    "button",
                    {
                      onClick: () => setEditingId(null), disabled: isSaving,
                      style: { border: "1px solid #d9d9d9", background: "#fff", cursor: "pointer", padding: "4px 6px", borderRadius: 4, color: C.sub }
                    },
                    XIcon
                  ),
                  React.createElement(
                    "button",
                    {
                      onClick: () => handleSave(line), disabled: isSaving,
                      style: { border: "1px solid #1890ff", background: "#1890ff", cursor: "pointer", padding: "4px 6px", borderRadius: 4, color: "#fff" }
                    },
                    isSaving ? React.createElement(Spin, { size: "small" }) : CheckIcon
                  )
                )
              : React.createElement(
                  "button",
                  {
                    onClick: () => handleEdit(line),
                    title: "Sửa dịch vụ",
                    style: { border: "1px solid #d9d9d9", background: "#fff", cursor: "pointer", padding: "4px 6px", borderRadius: 4, color: C.text }
                  },
                  EditIcon
                )
          )
        );
      }),
      ),
    ),
    ),
  );
};

const ManualContractServicesSection = ({
  rows,
  services,
  pricingMode,
  packageVatRate,
  packageTotals,
  readOnlyServices = false,
  showAddRow = true,
  allowDelete = true,
  onPricingModeChange,
  onPackageSubTotalChange,
  onPackageVatRateChange,
  onAddRow,
  onDeleteRow,
  onUpdateRow,
  onSelectService,
  onCreateManualService,
}) => {
  const [pickerRowId, setPickerRowId] = useState(null);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newService, setNewService] = useState({
    serviceName: "",
    serviceType: "",
    basePrice: "",
    description: "",
  });
  const [createError, setCreateError] = useState("");
  const packageMode = pricingMode === "package";
  const totals = packageMode ? packageTotals : manualServiceRowsTotals(rows);
  const actionColumn = allowDelete ? " 52px" : "";
  const columns = packageMode
    ? `minmax(280px, 1.25fr) minmax(320px, 1.6fr)${actionColumn}`
    : `minmax(260px, 1.2fr) minmax(300px, 1.45fr) minmax(150px, 0.75fr) 98px minmax(155px, 0.75fr)${actionColumn}`;
  const selectedServiceIds = rows.map((row) => String(row.serviceId || "")).filter(Boolean);
  const currentRow = rows.find((row) => row.id === pickerRowId) || null;
  const filteredServices = useMemo(() => {
    const q = normalizeSearch(search).trim();
    return services
      .filter((service) => {
        if (!q) return true;
        return (
          normalizeSearch(serviceCatalogName(service)).includes(q) ||
          normalizeSearch(serviceCatalogType(service)).includes(q) ||
          normalizeSearch(serviceCatalogDescription(service)).includes(q)
        );
      })
      .slice(0, 80);
  }, [services, search]);
  const headerStyle = {
    padding: "11px 14px",
    background: "#fbfcfd",
    color: C.sub,
    fontSize: 12,
    fontWeight: 600,
    borderBottom: `1px solid ${C.border}`,
  };
  const cellStyle = {
    padding: "12px 14px",
    minWidth: 0,
    borderBottom: `1px solid ${C.border}`,
    display: "flex",
    alignItems: "center",
    minHeight: packageMode ? 76 : 84,
    boxSizing: "border-box",
  };
  const iconButtonStyle = (extra = {}) => ({
    border: `1px solid ${C.border}`,
    background: "#fff",
    color: C.text,
    borderRadius: 6,
    width: 32,
    height: 32,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    ...extra,
  });
  const serviceNameKey = (value) => normalizeSearch(value).replace(/\s+/g, " ").trim();
  const normalizedNewServiceName = serviceNameKey(newService.serviceName);
  const duplicateCatalogService =
    normalizedNewServiceName &&
    services.find((service) => serviceNameKey(serviceCatalogName(service)) === normalizedNewServiceName);
  const duplicateManualRow =
    normalizedNewServiceName &&
    rows.find((row) => row.id !== pickerRowId && serviceNameKey(row.serviceName) === normalizedNewServiceName);
  const duplicateNewService = duplicateCatalogService || duplicateManualRow;

  const resetCreateForm = () => {
    setNewService({ serviceName: "", serviceType: "", basePrice: "", description: "" });
    setCreateError("");
    setShowAdd(false);
  };

  const openPicker = (rowId) => {
    setPickerRowId(rowId);
    setSearch("");
    resetCreateForm();
  };

  const closePicker = () => {
    setPickerRowId(null);
    setSearch("");
    resetCreateForm();
  };

  const selectService = (service) => {
    if (!currentRow || !service) return;
    const serviceId = String(extractId(service?.id));
    const isUsed = rows.some((row) => row.id !== currentRow.id && String(row.serviceId) === serviceId);
    if (isUsed) {
      message.warning("This service is already selected in another row.");
      return;
    }
    onSelectService(currentRow.id, serviceId, service);
    closePicker();
  };

  const handleCreateService = async () => {
    if (!newService.serviceName.trim()) {
      setCreateError("Please enter service name.");
      return;
    }
    if (parseNum(newService.basePrice) <= 0) {
      setCreateError("Please enter unit price greater than 0.");
      return;
    }
    if (duplicateNewService) {
      setCreateError(
        duplicateCatalogService
          ? "This service already exists in the catalog. Please select it instead."
          : "This service is already added in another row.",
      );
      return;
    }
    if (!currentRow) return;
    const created = onCreateManualService?.(currentRow.id, newService);
    if (created) {
      closePicker();
    }
  };

  const renderSelectedServiceButton = (row) => {
    const typeLabel = row.serviceType || "";
    if (readOnlyServices) {
      return React.createElement(
        "div",
        {
          style: {
            width: "100%",
            minHeight: 54,
            border: `1px solid ${C.border}`,
            borderRadius: 7,
            background: C.bgSoft,
            padding: "8px 11px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            textAlign: "left",
            fontFamily: FONT,
            boxSizing: "border-box",
          },
        },
        React.createElement("span", { style: { color: C.primary, flexShrink: 0 } }, TagIcon),
        React.createElement(
          "span",
          { style: { flex: 1, minWidth: 0 } },
          React.createElement(
            "span",
            {
              style: {
                display: "block",
                color: C.text,
                fontSize: 14,
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            },
            row.serviceName || "Service",
          ),
          typeLabel &&
            React.createElement(
              "span",
              {
                style: {
                  display: "block",
                  marginTop: 2,
                  color: C.sub,
                  fontSize: 12,
                  lineHeight: "16px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              },
              typeLabel,
            ),
        ),
      );
    }
    return React.createElement(
      "button",
      {
        type: "button",
        onClick: () => openPicker(row.id),
        style: {
          width: "100%",
          minHeight: 54,
          border: `1px solid ${C.border}`,
          borderRadius: 7,
          background: "#fff",
          padding: "8px 11px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          textAlign: "left",
          cursor: "pointer",
          fontFamily: FONT,
        },
      },
      React.createElement("span", { style: { color: row.serviceName ? C.primary : C.sub, flexShrink: 0 } }, row.serviceName ? TagIcon : SearchIcon),
      React.createElement(
        "span",
        { style: { flex: 1, minWidth: 0 } },
        React.createElement(
          "span",
          {
            style: {
              display: "block",
              color: row.serviceName ? C.text : C.sub,
              fontSize: 14,
              fontWeight: row.serviceName ? 600 : 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          },
          row.serviceName || "Select service",
        ),
        typeLabel &&
          React.createElement(
            "span",
            {
              style: {
                display: "block",
                marginTop: 2,
                color: C.sub,
                fontSize: 12,
                lineHeight: "16px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            },
            typeLabel,
          ),
      ),
      React.createElement("span", { style: { color: C.sub, flexShrink: 0 } }, ChevronDownIcon),
    );
  };

  const modalThStyle = (extra = {}) => ({
    padding: "10px 14px",
    fontSize: 12.5,
    fontWeight: 600,
    color: C.sub,
    background: C.bgSoft,
    borderBottom: `1px solid ${C.border}`,
    textAlign: "left",
    fontFamily: FONT,
    ...extra,
  });
  const modalTdStyle = (extra = {}) => ({
    padding: "14px 14px",
    fontSize: 13.5,
    borderBottom: `1px solid #f3f4f6`,
    verticalAlign: "middle",
    fontFamily: FONT,
    ...extra,
  });
  const modalButtonStyle = {
    border: "none",
    borderRadius: 6,
    background: C.primary,
    color: "#fff",
    padding: "7px 15px",
    fontSize: 12.5,
    fontWeight: 700,
    fontFamily: FONT,
    cursor: "pointer",
  };

  const pickerModal = pickerRowId &&
    React.createElement(
      "div",
      {
        style: {
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.42)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1200,
          padding: 18,
          boxSizing: "border-box",
        },
        onClick: closePicker,
      },
      React.createElement(
        "div",
        {
          style: {
            background: "#fff",
            borderRadius: 12,
            width: "100%",
            maxWidth: showAdd ? 704 : 944,
            maxHeight: "88vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 18px 54px rgba(15,23,42,0.22)",
            overflow: "hidden",
          },
          onClick: (e) => e.stopPropagation(),
        },
        React.createElement(
          "div",
          {
            style: {
              padding: "18px 26px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            },
          },
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 } },
            showAdd &&
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => {
                    setShowAdd(false);
                    setCreateError("");
                  },
                  style: {
                    border: "none",
                    borderRadius: 6,
                    background: "#eff6ff",
                    color: C.primary,
                    padding: "6px 10px",
                    fontSize: 13,
                    fontFamily: FONT,
                    cursor: "pointer",
                  },
                },
                "< Back",
              ),
            React.createElement(
              "span",
              { style: { fontSize: 18, fontWeight: 500, color: C.text, fontFamily: FONT } },
              showAdd ? "Create New Service" : "Select Service",
            ),
          ),
          React.createElement(
            "button",
            {
              type: "button",
              onClick: closePicker,
              style: {
                border: "none",
                background: "transparent",
                color: C.sub,
                fontSize: 18,
                fontFamily: FONT,
                cursor: "pointer",
                padding: 0,
              },
            },
            "Close",
          ),
        ),
        !showAdd
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(
                "div",
                {
                  style: {
                    padding: "16px 26px",
                    borderBottom: `1px solid #f3f4f6`,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexShrink: 0,
                  },
                },
                React.createElement("input", {
                  autoFocus: true,
                  value: search,
                  onChange: (e) => setSearch(e.target.value),
                  placeholder: "Search service name...",
                  onFocus: focus,
                  onBlur: blur,
                  style: { ...inputStyle, flex: 1, minWidth: 0, height: 44 },
                }),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      setShowAdd(true);
                      setCreateError("");
                    },
                    style: {
                      border: "none",
                      borderRadius: 7,
                      background: "#16a34a",
                      color: "#fff",
                      padding: "0 20px",
                      height: 44,
                      fontSize: 13,
                      fontWeight: 500,
                      fontFamily: FONT,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    },
                  },
                  "Create new",
                ),
              ),
              React.createElement(
                "div",
                { style: { overflowY: "auto", flex: 1, minHeight: 220 } },
                React.createElement(
                  "table",
                  { style: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" } },
                  React.createElement(
                    "thead",
                    null,
                    React.createElement(
                      "tr",
                      null,
                      React.createElement("th", { style: modalThStyle({ width: 42, textAlign: "center" }) }, "#"),
                      React.createElement("th", { style: modalThStyle() }, "Service Name"),
                      React.createElement("th", { style: modalThStyle({ width: 180 }) }, "Type"),
                      React.createElement("th", { style: modalThStyle({ width: 160, textAlign: "right" }) }, "Unit Price (VND)"),
                      React.createElement("th", { style: modalThStyle({ width: 104, textAlign: "center" }) }, ""),
                    ),
                  ),
                  React.createElement(
                    "tbody",
                    null,
                    filteredServices.length
                      ? filteredServices.map((service, index) => {
                          const serviceId = String(extractId(service?.id));
                          const serviceName = serviceCatalogName(service);
                          const serviceType = serviceCatalogType(service);
                          const description = serviceCatalogDescription(service);
                          const price = serviceCatalogPrice(service);
                          const isUsed = selectedServiceIds.includes(serviceId) && String(currentRow?.serviceId || "") !== serviceId;
                          const isCurrent = String(currentRow?.serviceId || "") === serviceId;
                          return React.createElement(
                            "tr",
                            {
                              key: serviceId || index,
                              onClick: () => !isUsed && selectService(service),
                              style: {
                                background: isCurrent ? "#eef4fb" : index % 2 === 0 ? "#fff" : "#fafafa",
                                cursor: isUsed ? "not-allowed" : "pointer",
                                opacity: isUsed ? 0.5 : 1,
                              },
                            },
                            React.createElement(
                              "td",
                              { style: modalTdStyle({ textAlign: "center", color: C.sub, fontSize: 12 }) },
                              index + 1,
                            ),
                            React.createElement(
                              "td",
                              { style: modalTdStyle({ fontWeight: 700, color: C.text }) },
                              React.createElement("div", { style: { lineHeight: "19px" } }, serviceName),
                              description &&
                                React.createElement(
                                  "div",
                                  {
                                    style: {
                                      marginTop: 4,
                                      color: C.sub,
                                      fontSize: 12,
                                      fontWeight: 500,
                                      lineHeight: "18px",
                                    },
                                  },
                                  description,
                                ),
                            ),
                            React.createElement(
                              "td",
                              { style: modalTdStyle() },
                              serviceType
                                ? React.createElement(
                                    "span",
                                    {
                                      style: {
                                        display: "inline-block",
                                        maxWidth: "100%",
                                        borderRadius: 10,
                                        background: "#eff6ff",
                                        color: "#1d4ed8",
                                        padding: "3px 8px",
                                        fontSize: 11.5,
                                        lineHeight: "16px",
                                        overflowWrap: "anywhere",
                                      },
                                    },
                                    serviceType,
                                  )
                                : React.createElement("span", { style: { color: "#cbd5e1" } }, "-"),
                            ),
                            React.createElement(
                              "td",
                              { style: modalTdStyle({ textAlign: "right", fontVariantNumeric: "tabular-nums", color: C.text }) },
                              formatMoney(price),
                            ),
                            React.createElement(
                              "td",
                              { style: modalTdStyle({ textAlign: "center" }) },
                              isCurrent
                                ? React.createElement(
                                    "span",
                                    {
                                      title: "Selected",
                                      style: {
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        width: 28,
                                        height: 28,
                                        borderRadius: "50%",
                                        background: "#ecfdf5",
                                        border: "1px solid #bbf7d0",
                                        color: "#15803d",
                                      },
                                    },
                                    CheckIcon,
                                  )
                                : isUsed
                                  ? React.createElement("span", { style: { color: C.sub, fontSize: 12, fontWeight: 700 } }, "Used")
                                  : React.createElement(
                                      "button",
                                      {
                                        type: "button",
                                        onClick: (e) => {
                                          e.stopPropagation();
                                          selectService(service);
                                        },
                                        style: modalButtonStyle,
                                      },
                                      "Select",
                                    ),
                            ),
                          );
                        })
                      : React.createElement(
                          "tr",
                          null,
                          React.createElement(
                            "td",
                            { colSpan: 5, style: modalTdStyle({ textAlign: "center", color: C.sub, padding: "42px 12px" }) },
                            React.createElement(
                              "div",
                              { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 } },
                              React.createElement("div", null, "No services found"),
                              React.createElement(
                                "button",
                                {
                                  type: "button",
                                  onClick: () => setShowAdd(true),
                                  style: {
                                    border: "none",
                                    background: "transparent",
                                    color: C.primary,
                                    cursor: "pointer",
                                    fontSize: 12,
                                    textDecoration: "underline",
                                    fontFamily: FONT,
                                  },
                                },
                                "Create now",
                              ),
                            ),
                          ),
                        ),
                  ),
                ),
              ),
              React.createElement(
                "div",
                {
                  style: {
                    padding: "14px 26px",
                    borderTop: `1px solid ${C.border}`,
                    display: "flex",
                    justifyContent: "flex-end",
                    flexShrink: 0,
                    background: "#fff",
                  },
                },
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: closePicker,
                    style: {
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      background: "#fff",
                      color: C.sub,
                      padding: "8px 22px",
                      fontSize: 13,
                      fontFamily: FONT,
                      cursor: "pointer",
                    },
                  },
                  "Close",
                ),
              ),
            )
          : React.createElement(
              React.Fragment,
              null,
              React.createElement(
                "div",
                { style: { overflowY: "auto", flex: 1, padding: "24px 32px 18px" } },
                React.createElement(
                  "div",
                  { style: { display: "grid", gap: 16 } },
                  React.createElement(
                    Field,
                    { label: "Service Name", required: true },
                    React.createElement(TextInput, {
                      value: newService.serviceName,
                      onChange: (value) => {
                        setNewService((prev) => ({ ...prev, serviceName: value }));
                        setCreateError("");
                      },
                      placeholder: "e.g., Labor contract consulting...",
                    }),
                  ),
                  React.createElement(
                    Field,
                    { label: "Service Type", hint: "optional" },
                    React.createElement(TextInput, {
                      value: newService.serviceType,
                      onChange: (value) => setNewService((prev) => ({ ...prev, serviceType: value })),
                      placeholder: "e.g., Consulting, Legal...",
                    }),
                  ),
                  React.createElement(
                    Field,
                    { label: "Unit Price (VND)", required: true },
                    React.createElement(MoneyInput, {
                      value: newService.basePrice,
                      onChange: (value) => {
                        setNewService((prev) => ({ ...prev, basePrice: value }));
                        setCreateError("");
                      },
                    }),
                  ),
                  React.createElement(
                    Field,
                    { label: "Description", hint: "optional" },
                    React.createElement(TextArea, {
                      value: newService.description,
                      onChange: (value) => setNewService((prev) => ({ ...prev, description: value })),
                      placeholder: "Scope of work, notes...",
                      rows: 4,
                    }),
                  ),
                  duplicateNewService &&
                    React.createElement(
                      "div",
                      {
                        style: {
                          color: "#92400e",
                          background: "#fffbeb",
                          border: "1px solid #fde68a",
                          borderRadius: 6,
                          padding: "9px 11px",
                          fontSize: 12,
                        },
                      },
                      duplicateCatalogService
                        ? "This service already exists in the catalog. Select it from the list to avoid duplicates."
                        : "This service is already added in another row.",
                    ),
                  createError &&
                    React.createElement(
                      "div",
                      { style: { color: C.danger, fontSize: 12, fontWeight: 700 } },
                      createError,
                    ),
                ),
              ),
              React.createElement(
                "div",
                {
                  style: {
                    padding: "16px 32px",
                    borderTop: `1px solid #f3f4f6`,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 12,
                    background: C.bgSoft,
                    flexShrink: 0,
                  },
                },
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      setShowAdd(false);
                      setCreateError("");
                    },
                    style: {
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      background: "#fff",
                      color: C.text,
                      padding: "9px 24px",
                      fontSize: 13,
                      fontFamily: FONT,
                      cursor: "pointer",
                    },
                  },
                  "Cancel",
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: handleCreateService,
                    disabled: !!duplicateNewService,
                    style: {
                      border: "none",
                      borderRadius: 6,
                      background: duplicateNewService ? "#9ca3af" : C.primary,
                      color: "#fff",
                      padding: "9px 28px",
                      fontSize: 13,
                      fontWeight: 800,
                      fontFamily: FONT,
                      cursor: duplicateNewService ? "not-allowed" : "pointer",
                    },
                  },
                  "Save & Select",
                ),
              ),
            ),
      ),
    );

  return React.createElement(
    Section,
    { title: "Services in contract" },
    pickerModal,
    React.createElement(
      "div",
      { style: { border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", background: "#fff" } },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            padding: "10px 12px",
            background: C.bgSoft,
            borderBottom: `1px solid ${C.border}`,
          },
        },
        React.createElement(
          "div",
          { style: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" } },
          [
            ["line", "Line pricing"],
            ["package", "Package pricing"],
          ].map(([mode, label]) =>
            React.createElement(
              "button",
              {
                key: mode,
                type: "button",
                onClick: () => onPricingModeChange(mode),
                style: {
                  border: `1px solid ${pricingMode === mode ? C.primary : C.border}`,
                  background: pricingMode === mode ? C.primary : "#fff",
                  color: pricingMode === mode ? "#fff" : C.text,
                  borderRadius: 6,
                  padding: "8px 13px",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: FONT,
                  cursor: "pointer",
                },
              },
              label,
            ),
          ),
        ),
        React.createElement(
          "div",
          { style: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" } },
          React.createElement("span", { style: { fontSize: 13, color: C.sub } }, `${rows.length} services`),
          React.createElement("span", { style: { fontSize: 14, fontWeight: 700, color: C.text } }, formatMoney(totals.totalAmount)),
          showAddRow &&
            React.createElement(
            "button",
            {
              type: "button",
              onClick: onAddRow,
              style: {
                border: `1px dashed ${C.primary}`,
                background: "#fff",
                color: C.primary,
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: FONT,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              },
            },
            PlusIcon,
            "Add row",
          ),
        ),
      ),
      packageMode &&
        React.createElement(
          "div",
          {
            style: {
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
              padding: 12,
              borderBottom: `1px solid ${C.border}`,
              background: "#fff",
            },
          },
          React.createElement(
            Field,
            { label: "Package subtotal", required: true },
            React.createElement(MoneyInput, {
              value: packageTotals.subTotal,
              onChange: onPackageSubTotalChange,
            }),
          ),
          React.createElement(
            Field,
            { label: "VAT %" },
            React.createElement(SuffixInput, {
              value: packageVatRate,
              onChange: onPackageVatRateChange,
              suffix: "% VAT",
            }),
          ),
          React.createElement(
            Field,
            { label: "VAT amount" },
            React.createElement("div", { style: { ...inputStyle, textAlign: "center", fontWeight: 700, background: C.bgSoft } }, formatMoney(packageTotals.vatAmount)),
          ),
          React.createElement(
            Field,
            { label: "Package total" },
            React.createElement("div", { style: { ...inputStyle, textAlign: "center", fontWeight: 800, background: "#ecfdf5" } }, formatMoney(packageTotals.totalAmount)),
          ),
        ),
      React.createElement(
        "div",
        { style: { overflowX: "auto" } },
        React.createElement(
          "div",
          { style: { minWidth: packageMode ? 700 : 1015 } },
          React.createElement(
            "div",
            { style: { display: "grid", gridTemplateColumns: columns } },
            React.createElement("div", { style: headerStyle }, "Service"),
            React.createElement("div", { style: headerStyle }, "Description"),
            !packageMode && React.createElement("div", { style: { ...headerStyle, textAlign: "center" } }, "Base price"),
            !packageMode && React.createElement("div", { style: { ...headerStyle, textAlign: "center" } }, "VAT"),
            !packageMode && React.createElement("div", { style: { ...headerStyle, textAlign: "center" } }, "Total"),
            allowDelete && React.createElement("div", { style: headerStyle }, ""),
          ),
          rows.length
            ? rows.map((row) => {
                const amounts = manualServiceLineAmounts(row, packageMode);
                return React.createElement(
                  "div",
                  { key: row.id, style: { display: "grid", gridTemplateColumns: columns, alignItems: "stretch" } },
                  React.createElement(
                    "div",
                    { style: cellStyle },
                    renderSelectedServiceButton(row),
                  ),
                  React.createElement(
                    "div",
                    { style: cellStyle },
                    React.createElement("textarea", {
                      value: row.description || "",
                      onChange: (e) => onUpdateRow(row.id, "description", e.target.value),
                      placeholder: "Service scope or note",
                      rows: 2,
                      onFocus: focus,
                      onBlur: blur,
                      style: {
                        ...inputStyle,
                        width: "100%",
                        height: 56,
                        minHeight: 56,
                        resize: "none",
                        lineHeight: "20px",
                        fontSize: 14,
                      },
                    }),
                  ),
                  !packageMode &&
                    React.createElement(
                      "div",
                      { style: cellStyle },
                      React.createElement(MoneyInput, {
                        value: row.basePrice,
                        onChange: (value) => onUpdateRow(row.id, "basePrice", value),
                      }),
                    ),
                  !packageMode &&
                    React.createElement(
                      "div",
                      { style: cellStyle },
                      React.createElement(PercentInput, {
                        value: row.vat,
                        onChange: (value) => onUpdateRow(row.id, "vat", value),
                      }),
                    ),
                  !packageMode &&
                    React.createElement(
                      "div",
                      { style: { ...cellStyle, textAlign: "center", fontSize: 14, fontWeight: 700, color: C.text } },
                      formatMoney(amounts.totalAmount),
                    ),
                  allowDelete &&
                    React.createElement(
                    "div",
                    { style: { ...cellStyle, textAlign: "center" } },
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        onClick: () => onDeleteRow(row.id),
                        style: {
                          border: `1px solid ${C.border}`,
                          background: "#fff",
                          color: C.danger,
                          borderRadius: 6,
                          width: 30,
                          height: 30,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          fontWeight: 800,
                        },
                      },
                      TrashIcon,
                    ),
                  ),
                );
              })
            : React.createElement(
                "div",
                {
                  style: {
                    padding: "30px 12px",
                    textAlign: "center",
                    color: C.sub,
                    fontSize: 13,
                    borderTop: `1px solid ${C.border}`,
                  },
                },
                'No services added. Click "Add row" to add contract services.',
              ),
        ),
      ),
    ),
  );
};

const ContractCreateForm = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [parentContracts, setParentContracts] = useState([]);
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [serviceLines, setServiceLines] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [manualServiceRows, setManualServiceRows] = useState([]);

  const [form, setForm] = useState({
    contractType: "byCase",
    status: "draft",
    feeModel: "fixed",
    billingCycle: "one_time",
    issuedDate: todayInput(),
    endDate: "",
    paymentDate: "",
    paymentTerms: "",
    contractCode: "",
    contractName: "",
    customerId: "",
    internalCompanyId: "",
    lawyerId: "",
    templateId: "",
    quotationId: "",
    pricingMode: "line",
    projectId: "",
    parentId: "",
    projectServiceId: "",
    quotationServiceId: "",
    contractKind: "main",
    monthlyFee: "",
    fixedAmount: "",
    hourlyRate: "",
    estimatedHours: "",
    successFee: "",
    retainerPeriod: "",
    retainerDuration: "",
    includedHours: "",
    overageHourlyRate: "",
    subTotal: "",
    vatAmount: "",
    totalAmount: "",
    scopeNote: "",
    description: "",
    isRequiredApproval: false,
    approvedById: "",
    packageVatRate: "8",
  });

  const loadCaseServiceLines = async ({ projectId, preselectedProjectServiceId, knownProjectService, knownQuotationService, knownQuotation, knownProject, quotationId, knownQuotations = [] }) => {
    if (!projectId && !preselectedProjectServiceId) {
      setServiceLines([]);
      setSelectedServiceIds([]);
      return { lines: [], selectedIds: [] };
    }

    let projectServices = [];
    if (projectId) {
      try {
        const psRes = await ctx.api.request({
          url: "projectServices:list",
          params: {
            filter: JSON.stringify({ projectId: { $eq: parseInt(projectId, 10) } }),
            pageSize: 500,
            sort: ["createdAt"],
            appends: ["services"],
          },
        });
        projectServices = psRes?.data?.data || [];
      } catch (error) {
        console.warn("[ContractCreateForm] Could not load case services", error);
      }
    }

    if (knownProjectService && !projectServices.some((item) => String(item.id) === String(knownProjectService.id))) {
      projectServices = [knownProjectService, ...projectServices];
    }
    if (!projectServices.length && preselectedProjectServiceId) {
      const fallbackProjectService = await fetchRecord("projectServices:get", preselectedProjectServiceId, {
        appends: ["services"],
      });
      if (fallbackProjectService) projectServices = [fallbackProjectService];
    }

    const quoteIds = Array.from(new Set([
      quotationId,
      extractId(knownQuotation?.id),
      ...projectServices.map((item) => firstId(item.quotationId, item.quotations)),
      firstId(knownQuotationService?.quotationId, knownQuotationService?.quotations),
    ].filter(Boolean)));

    const quoteMap = {};
    if (knownQuotation?.id) quoteMap[String(knownQuotation.id)] = knownQuotation;
    knownQuotations.forEach((item) => {
      if (quoteIds.includes(extractId(item.id))) quoteMap[String(item.id)] = item;
    });
    await Promise.all(quoteIds.map(async (id) => {
      if (quoteMap[String(id)]) return;
      const detail = await fetchQuotationDetail(id);
      if (detail) quoteMap[String(id)] = detail;
    }));

    let quotationServices = [];
    if (quoteIds.length) {
      try {
        const qsRes = await ctx.api.request({
          url: "quotationServices:list",
          params: {
            filter: JSON.stringify(
              quoteIds.length === 1
                ? { quotationId: { $eq: quoteIds[0] } }
                : { quotationId: { $in: quoteIds } },
            ),
            pageSize: 1000,
          },
        });
        quotationServices = qsRes?.data?.data || [];
      } catch (error) {
        console.warn("[ContractCreateForm] Could not load quotation service lines", error);
      }
    }
    if (knownQuotationService && !quotationServices.some((item) => String(item.id) === String(knownQuotationService.id))) {
      quotationServices = [knownQuotationService, ...quotationServices];
    }

    let contractServices = [];
    if (projectId) {
      try {
        const csRes = await ctx.api.request({
          url: "contractServices:list",
          params: {
            filter: JSON.stringify({ projectId: { $eq: parseInt(projectId, 10) } }),
            pageSize: 1000,
            appends: ["contracts"],
          },
        });
        contractServices = csRes?.data?.data || [];
      } catch (error) {
        console.warn("[ContractCreateForm] Could not load existing contract services", error);
      }
    }

    const qSvcById = {};
    const qSvcByQuoteService = {};
    const qSvcByQuoteName = {};
    quotationServices.forEach((line) => {
      const lineId = extractId(line.id);
      const qId = firstId(line.quotationId, line.quotations);
      const serviceId = firstId(line.serviceId, line.service);
      const serviceName = String(line.serviceName || "").toLowerCase().trim();
      if (lineId) qSvcById[String(lineId)] = line;
      if (qId && serviceId) qSvcByQuoteService[`${qId}:${serviceId}`] = line;
      if (qId && serviceName) qSvcByQuoteName[`${qId}:${serviceName}`] = line;
    });

    const contractByProjectService = {};
    contractServices.forEach((line) => {
      const psId = firstId(line.projectServiceId, line.projectServices);
      if (psId && !contractByProjectService[String(psId)]) contractByProjectService[String(psId)] = line;
    });
    let projectRecord =
      knownProject ||
      projects.find((item) => String(extractId(item?.id)) === String(projectId)) ||
      null;
    if (projectId && !projectRecord) {
      projectRecord = await fetchRecord("projects:get", projectId);
    }

    const lines = projectServices
      .map((projectService) => {
        const qSvcId = firstId(projectService.quotationServiceId, projectService.quotationServices);
        const qId = firstId(projectService.quotationId, projectService.quotations);
        const serviceId = firstId(projectService.serviceId, projectService.services);
        const serviceName = String(projectService.serviceName || projectService.services?.serviceName || projectService.name || "").toLowerCase().trim();
        const quotationService =
          (qSvcId && qSvcById[String(qSvcId)]) ||
          (qId && serviceId && qSvcByQuoteService[`${qId}:${serviceId}`]) ||
          (qId && serviceName && qSvcByQuoteName[`${qId}:${serviceName}`]) ||
          null;
        return normalizeServiceLine({
          projectService,
          quotationService,
          quotation: quoteMap[String(firstId(quotationService?.quotationId, quotationService?.quotations, qId))],
          contractService: contractByProjectService[String(projectService.id)],
          project: projectRecord,
        });
      })
      .filter(Boolean);

    const selectable = lines.filter((line) => !line.locked);
    const preselectedId = preselectedProjectServiceId ? String(preselectedProjectServiceId) : "";
    const sourcePackageMode = isPackageSource(knownQuotation) || selectable.some(isPackageSource);
    const selectedIds =
      sourcePackageMode && selectable.length
        ? selectable.map((line) => String(line.projectServiceId))
        : preselectedId && selectable.some((line) => String(line.projectServiceId) === preselectedId)
          ? [preselectedId]
          : selectable.map((line) => String(line.projectServiceId));

    setServiceLines(lines);
    setSelectedServiceIds(selectedIds);
    return { lines, selectedIds };
  };

  useEffect(() => {
    Promise.all([
      fetchAll("customers:list"),
      fetchAll("internalCompany:list"),
      fetchAll("lawyers:list"),
      fetchAll("template:list"),
      fetchAll("quotations:list"),
      fetchAll("projects:list"),
      fetchAll("contracts:list"),
      fetchAll("services:list"),
    ]).then(async ([custs, comps, laws, tmps, quots, projs, conts, svcCatalog]) => {
      setCustomers(custs);
      setCompanies(comps);
      setLawyers(laws);
      setTemplates(tmps);
      setQuotations(quots);
      setProjects(projs);
      setParentContracts(conts);
      setServiceCatalog(svcCatalog);

      const popupParams = getPopupParams();
      const popupRecord = unwrapContextRecord(
        popupParams.record ||
        popupParams.sourceRecord ||
        popupParams.parentItem ||
        popupParams.currentRecord ||
        null
      );
      console.log("[ContractCreateForm] popupParams:", safeJsonStringify(popupParams));
      console.log("[ContractCreateForm] ctx exists:", !!ctx);
      const inputArgs = getViewInputArgs();
      const collectionName = String(inputArgs.collectionName || popupParams.collectionName || popupParams.sourceCollectionName || ctx.collection?.name || "");
      const urlPathname = getUrlPathname();
      const urlFilterByTk = firstId(getUrlFilterByTk());
      let urlQuotationRecord = null;
      let urlProjectRecord = null;
      const directRecord = unwrapContextRecord(ctx.record || ctx.popup?.record || popupRecord || null);
      const directRecordKind = getContextRecordKind(directRecord || {}, collectionName);
      const directRecordIsProject = isProjectRecord(directRecord || {}, collectionName);
      let routeLooksLikeQuotation =
        isQuotationCollection(collectionName) ||
        isQuotationCollection(popupParams.sourceCollectionName) ||
        isQuotationCollection(urlPathname) ||
        !!popupParams.sourceQuotationId ||
        !!popupParams.quotationId ||
        directRecordKind === "quotation";
      const shouldUseUrlContext =
        !directRecord &&
        !popupRecord &&
        urlFilterByTk;
      if (urlFilterByTk && routeLooksLikeQuotation) {
        urlQuotationRecord = await fetchRecord("quotations:get", urlFilterByTk, {}, { quiet: true });
      }
      if (
        urlFilterByTk &&
        !urlQuotationRecord &&
        !directRecordIsProject &&
        !isProjectCollection(collectionName) &&
        !isProjectServiceCollection(collectionName) &&
        !popupParams.sourceProjectId &&
        !popupParams.projectId &&
        !popupParams.caseId &&
        !popupParams.sourceCustomerId &&
        !popupParams.customerId &&
        directRecordKind !== "customer"
      ) {
        const probedQuotation = await fetchRecord("quotations:get", urlFilterByTk, {}, { quiet: true });
        if (extractId(probedQuotation?.id) && looksLikeQuotationRecord(probedQuotation, "quotations")) {
          urlQuotationRecord = probedQuotation;
          routeLooksLikeQuotation = true;
        }
      }
      if (shouldUseUrlContext && !urlQuotationRecord && !popupParams.sourceProjectId && !popupParams.projectId && !popupParams.caseId) {
        urlProjectRecord = await fetchRecord("projects:get", urlFilterByTk, {}, { quiet: true });
      }
      if (
        shouldUseUrlContext &&
        !urlQuotationRecord &&
        !urlProjectRecord &&
        !popupParams.sourceQuotationId &&
        !popupParams.sourceCustomerId &&
        !popupParams.quotationId
      ) {
        urlQuotationRecord = await fetchRecord("quotations:get", urlFilterByTk);
      }
      const directRecordId = extractId(directRecord?.id);
      const directRecordIsSameQuotation =
        urlQuotationRecord &&
        directRecordId &&
        String(directRecordId) === String(urlFilterByTk) &&
        looksLikeQuotationRecord(directRecord, collectionName);
      const mergedUrlQuotationRecord =
        urlQuotationRecord &&
        routeLooksLikeQuotation &&
        (!directRecordId || String(directRecordId) === String(urlFilterByTk))
          ? (directRecordIsSameQuotation ? { ...urlQuotationRecord, ...directRecord } : urlQuotationRecord)
          : null;
      const record = mergedUrlQuotationRecord || directRecord || urlProjectRecord || urlQuotationRecord || {};
      const contextRecordId = extractId(record?.id);
      const inputFilterId = firstId(inputArgs.filterByTk, popupParams.filterByTk);
      const urlFilterIsQuotation =
        !!extractId(urlQuotationRecord?.id) &&
        (
          String(extractId(urlQuotationRecord?.id)) === String(urlFilterByTk || "") ||
          String(extractId(urlQuotationRecord?.id)) === String(inputFilterId || "")
        );
      const customerLookupFilterId = firstId(
        urlFilterIsQuotation ? null : inputFilterId,
        popupParams.sourceCustomerId,
        popupParams.customerId,
        inputArgs.customerId,
        inputArgs.params?.customerId,
        urlFilterIsQuotation ? null : urlFilterByTk,
      );
      const inputSourceId = firstId(inputArgs.sourceId, popupParams.sourceId);
      const rawContextRecordKind = getContextRecordKind(record, collectionName);
      const recordIsProject = isProjectRecord(record, collectionName);
      const recordProjectId = recordIsProject ? firstId(record.id) : null;
      let recordCustomerMatch =
        contextRecordId && !recordIsProject
          ? custs.find((customer) => String(extractId(customer?.id)) === String(contextRecordId))
          : null;
      let filterCustomerMatch =
        customerLookupFilterId && !recordIsProject && !isProjectCollection(collectionName) && !isProjectServiceCollection(collectionName)
          ? custs.find((customer) => String(extractId(customer?.id)) === String(customerLookupFilterId))
          : null;
      if (!rawContextRecordKind && !recordIsProject && contextRecordId && !recordCustomerMatch) {
        recordCustomerMatch = await fetchAnyRecord(["customers:get", "contacts:get", "contact:get"], contextRecordId);
      }
      if (
        !rawContextRecordKind &&
        !recordIsProject &&
        customerLookupFilterId &&
        String(customerLookupFilterId) !== String(contextRecordId || "") &&
        !filterCustomerMatch &&
        !isProjectCollection(collectionName) &&
        !isProjectServiceCollection(collectionName)
      ) {
        filterCustomerMatch = await fetchAnyRecord(["customers:get", "contacts:get", "contact:get"], customerLookupFilterId);
      }
      const matchedCustomerId =
        !rawContextRecordKind && !recordIsProject
          ? firstId(recordCustomerMatch?.id, filterCustomerMatch?.id)
          : null;
      const matchedCustomerDetail =
        matchedCustomerId
          ? await fetchAnyRecord(["customers:get", "contacts:get", "contact:get"], matchedCustomerId)
          : null;
      const fetchedContextCustomer =
        rawContextRecordKind === "customer" && contextRecordId
          ? await fetchAnyRecord(["customers:get", "contacts:get", "contact:get"], contextRecordId)
          : null;
      const matchedContextCustomer =
        recordCustomerMatch || filterCustomerMatch || matchedCustomerDetail
          ? { ...(recordCustomerMatch || filterCustomerMatch || {}), ...(matchedCustomerDetail || {}) }
          : null;
      const contextCustomerRecord =
        rawContextRecordKind === "customer"
          ? { ...record, ...(fetchedContextCustomer || {}) }
          : matchedContextCustomer;
      const contextRecordKind =
        rawContextRecordKind || (contextCustomerRecord ? "customer" : "");
      const contextQuotationId =
        contextRecordKind === "quotation"
          ? firstId(contextRecordId, inputFilterId)
          : null;
      const contextCustomerId =
        contextRecordKind === "customer"
          ? firstId(contextCustomerRecord?.id, contextRecordId, customerLookupFilterId)
          : null;
      const contextCompanyId =
        contextRecordKind === "customer"
          ? recordInternalCompanyId(contextCustomerRecord || record)
          : null;
      const contextLawyerId =
        contextRecordKind === "customer"
          ? recordLawyerId(contextCustomerRecord || record)
          : null;
      debugContractContext("raw", {
        collectionName,
        recordId: contextRecordId,
        recordKeys: Object.keys(record || {}).slice(0, 30).join(","),
        rawContextRecordKind,
        inferredContextRecordKind: contextRecordKind,
        contextQuotationId,
        inputFilterId,
        customerLookupFilterId,
        inputSourceId,
        urlPathname,
        urlFilterByTk,
        urlFilterIsQuotation,
        routeLooksLikeQuotation,
        mergedUrlQuotationRecordId: extractId(mergedUrlQuotationRecord?.id),
        urlProjectRecordId: extractId(urlProjectRecord?.id),
        urlQuotationRecordId: extractId(urlQuotationRecord?.id),
        sourceProjectId: extractId(popupParams.sourceProjectId),
        sourceCustomerId: extractId(popupParams.sourceCustomerId),
        matchedCustomerByRecordId: extractId(recordCustomerMatch?.id),
        matchedCustomerByFilterByTk: extractId(filterCustomerMatch?.id),
        matchedCustomerDetailId: extractId(matchedCustomerDetail?.id),
        fetchedContextCustomerId: extractId(fetchedContextCustomer?.id),
      });
      const filterAsProjectId =
        isProjectCollection(collectionName) || recordIsProject || (!contextRecordKind && !isProjectServiceCollection(collectionName))
          ? firstId(inputFilterId, urlProjectRecord?.id, popupParams.sourceProjectId)
          : null;
      const filterAsProjectServiceId =
        isProjectServiceCollection(collectionName) ? inputFilterId : null;
      const contextSeed = {
        quotationId: firstId(contextQuotationId, popupParams.sourceQuotationId, popupParams.quotationId, urlQuotationRecord?.id, record.quotationId, record.quotations, popupParams.quotations, inputArgs.quotationId, inputArgs.params?.quotationId),
        projectId: firstId(record.projectId, record.project, record.cases, recordProjectId, popupParams.projectId, popupParams.caseId, inputArgs.projectId, inputArgs.caseId, inputArgs.params?.projectId, inputArgs.params?.caseId, filterAsProjectId),
        parentId: firstId(
          contextRecordKind === "quotation" ? null : record.parentId,
          contextRecordKind === "quotation" ? null : record.parent,
          popupParams.parentId,
          popupParams.parentContractId,
          inputArgs.parentId,
          inputArgs.parentContractId,
          inputArgs.params?.parentId,
        ),
        projectServiceId: firstId(
          record.projectServiceId,
          record.projectServices,
          popupParams.projectServiceId,
          inputArgs.projectServiceId,
          inputArgs.params?.projectServiceId,
          inputSourceId,
          filterAsProjectServiceId,
        ),
        quotationServiceId: firstId(record.quotationServiceId, record.quotationServices, popupParams.quotationServiceId, inputArgs.quotationServiceId, inputArgs.params?.quotationServiceId),
        serviceId: firstId(record.serviceId, record.services, popupParams.serviceId, inputArgs.serviceId, inputArgs.params?.serviceId),
        customerId: firstId(contextCustomerId, record.customerId, record.customers, popupParams.customerId, inputArgs.customerId, inputArgs.params?.customerId),
        internalCompanyId: firstId(contextCompanyId, record.internalCompanyId, record.internalCompany, popupParams.internalCompanyId, inputArgs.internalCompanyId, inputArgs.params?.internalCompanyId),
        lawyerId: firstId(contextLawyerId, record.lawyerId, popupParams.lawyerId, inputArgs.lawyerId, inputArgs.params?.lawyerId),
      };
      debugContractContext("seed", contextSeed);
      let currentQuotationId = contextSeed.quotationId;
      let popupQuotation = currentQuotationId ? await fetchQuotationDetail(currentQuotationId) : null;
      let initialProjectId = contextSeed.projectId;
      const currentParentId =
        contextSeed.parentId;
      const currentProjectServiceId =
        contextSeed.projectServiceId;
      let currentQuotationServiceId =
        contextSeed.quotationServiceId;
      const popupContractMode = String(popupParams.contractKind || popupParams.contractMode || popupParams.mode || "").toLowerCase();
      const currentContractKind =
        popupContractMode === "appendix" ||
        popupContractMode === "sub" ||
        popupContractMode === "sub-contract" ||
        popupParams.isMainContract === false ||
        popupParams.isMainContract === "false" ||
        currentParentId
          ? "appendix"
          : "main";
      let popupProjectService = null;
      if (currentProjectServiceId) {
        popupProjectService = await fetchRecord("projectServices:get", currentProjectServiceId, {
          appends: ["services"],
        });
      }
      let popupQuotationService = null;
      currentQuotationServiceId =
        currentQuotationServiceId ||
        firstId(popupProjectService?.quotationServiceId, popupProjectService?.quotationServices);
      if (currentQuotationServiceId) {
        popupQuotationService = await fetchRecord("quotationServices:get", currentQuotationServiceId);
      }
      currentQuotationId =
        currentQuotationId ||
        firstId(popupProjectService?.quotationId, popupProjectService?.quotations, popupQuotationService?.quotationId, popupQuotationService?.quotations);
      if (!popupQuotation && currentQuotationId) {
        popupQuotation = await fetchQuotationDetail(currentQuotationId);
      }
      initialProjectId =
        initialProjectId ||
        firstId(
          popupProjectService?.projectId,
          popupProjectService?.project,
          popupProjectService?.projects,
          popupQuotation?.projectId,
          popupQuotation?.project,
          popupQuotation?.cases,
        );
      if (!popupQuotationService && currentQuotationId) {
        try {
          const qsRes = await ctx.api.request({
            url: "quotationServices:list",
            params: {
              filter: JSON.stringify({ quotationId: { $eq: parseInt(currentQuotationId, 10) } }),
              pageSize: 500,
            },
          });
          const qLines = qsRes?.data?.data || [];
          const serviceIdForMatch =
            extractId(popupProjectService?.serviceId) ||
            extractId(popupProjectService?.services) ||
            contextSeed.serviceId;
          popupQuotationService =
            qLines.find((line) => String(line.id) === String(currentQuotationServiceId)) ||
            qLines.find((line) => String(firstId(line.projectServiceId, line.projectServices)) === String(currentProjectServiceId)) ||
            qLines.find((line) => {
              const lineServiceId = extractId(line.serviceId) || extractId(line.service);
              return lineServiceId && String(lineServiceId) === String(serviceIdForMatch);
            }) ||
            (qLines.length === 1 ? qLines[0] : null);
        } catch (error) {
          console.warn("[ContractCreateForm] Could not preload quotation service", error);
        }
      }

      const resolvedQuotationServiceId = extractId(popupQuotationService?.id) || currentQuotationServiceId;
      const resolvedProjectId =
        initialProjectId ||
        firstId(
          popupProjectService?.projectId,
          popupProjectService?.project,
          popupProjectService?.projects,
          popupQuotationService?.projectId,
          popupQuotationService?.project,
          popupQuotationService?.cases,
        );
      const popupProject =
        recordIsProject && String(recordProjectId) === String(resolvedProjectId)
          ? record
          : (resolvedProjectId ? await fetchRecord("projects:get", resolvedProjectId) : null);
      const quotationParentId =
        firstId(popupQuotation?.parentId, popupQuotation?.parent, popupQuotation?.parentQuotation);
      const resolvedParentId =
        currentParentId ||
        firstId(popupProject?.contractId, popupProject?.contract, popupProject?.contracts);
      const resolvedContractKind =
        currentContractKind === "appendix" || resolvedParentId || quotationParentId ? "appendix" : "main";

      const resolvedCustomerId =
        contextSeed.customerId ||
        firstId(popupProject?.customerId, popupProject?.customer, popupProject?.customers) ||
        quotationCustomerId(popupQuotation);
      const resolvedCompanyId =
        contextSeed.internalCompanyId ||
        firstId(popupProject?.internalCompanyId, popupProject?.internalCompany) ||
        quotationInternalCompanyId(popupQuotation);
      const resolvedLawyerId =
        contextSeed.lawyerId ||
        firstId(popupProject?.lawyerId, popupProject?.lawyer) ||
        firstId(popupProject?.assignees) ||
        quotationLawyerId(popupQuotation);

      console.log("[ContractCreateForm] resolved preloaded fields:", JSON.stringify({
        resolvedCustomerId,
        resolvedCompanyId,
        resolvedLawyerId,
      }));
      const projectCustomerRecord =
        relationRecord(popupProject?.customer, resolvedCustomerId) ||
        relationRecord(popupProject?.customers, resolvedCustomerId);
      const projectCompanyRecord =
        relationRecord(popupProject?.internalCompany, resolvedCompanyId) ||
        relationRecord(popupProject?.internalCompanies, resolvedCompanyId);
      const projectLawyerRecord =
        relationRecord(popupProject?.lawyer, resolvedLawyerId) ||
        relationRecord(popupProject?.lawyers, resolvedLawyerId) ||
        relationRecord(popupProject?.assignees, resolvedLawyerId) ||
        relationRecord(popupProject?.projectManager, resolvedLawyerId);
      const resolvedContextCustomerRecord =
        contextRecordKind === "customer" && resolvedCustomerId
          ? (contextCustomerRecord || record)
          : null;
      const contextCompanyRecord =
        relationRecord(record?.internalCompany, resolvedCompanyId) ||
        relationRecord(record?.internalCompanies, resolvedCompanyId);
      const contextLawyerRecord =
        relationRecord(record?.lawyer, resolvedLawyerId) ||
        relationRecord(record?.lawyers, resolvedLawyerId) ||
        relationRecord(record?.assignedLawyer, resolvedLawyerId);
      const serviceName =
        popupQuotationService?.serviceName ||
        popupProjectService?.serviceName ||
        popupProjectService?.services?.serviceName ||
        popupProjectService?.name ||
        popupParams.serviceName ||
        "";
      const serviceDescription =
        popupQuotationService?.description ||
        popupProjectService?.description ||
        popupProjectService?.services?.description ||
        popupParams.description ||
        "";
      const serviceAmounts = resolveServiceAmounts(popupQuotationService, popupProjectService, popupParams);
      const serviceSubTotal = serviceAmounts.subTotal;
      const serviceVatAmount = serviceAmounts.vatAmount;
      const serviceTotalAmount = serviceAmounts.totalAmount;
      const serviceLineResult = await loadCaseServiceLines({
        projectId: resolvedProjectId,
        preselectedProjectServiceId: currentProjectServiceId,
        knownProjectService: popupProjectService,
        knownQuotationService: popupQuotationService,
        knownQuotation: popupQuotation,
        knownProject: popupProject,
        quotationId: currentQuotationId,
        knownQuotations: quots,
      });
      const selectedServiceLines = serviceLineResult.lines.filter((line) =>
        serviceLineResult.selectedIds.includes(String(line.projectServiceId)),
      );
      const selectedTotals = sumServiceLines(selectedServiceLines);
      const quotationAmounts = resolveServiceAmounts({
        subTotal: popupQuotation?.subTotal,
        vatAmount: popupQuotation?.vatAmount,
        totalAmount: popupQuotation?.totalAmount || popupQuotation?.grandTotal,
      });
      const hasDirectServiceAmount = !!(serviceSubTotal || serviceVatAmount || serviceTotalAmount);
      const selectedPackageSource =
        selectedServiceLines.find(isPackageSource) ||
        popupQuotationService ||
        popupProjectService ||
        popupQuotation;
      const quotationPackageMode =
        isPackageSource(popupQuotation) ||
        selectedServiceLines.some(isPackageSource) ||
        isPackageSource(popupQuotationService) ||
        isPackageSource(popupProjectService);
      const quotationPackageAmounts = quotationPackageMode
        ? resolvePackageAmounts(selectedPackageSource, popupQuotation, popupQuotationService, popupProjectService)
        : null;
      const effectiveSubTotal = quotationPackageMode
        ? quotationPackageAmounts.subTotal
        : (selectedServiceLines.length ? selectedTotals.subTotal : (hasDirectServiceAmount ? serviceSubTotal : quotationAmounts.subTotal));
      const effectiveVatAmount = quotationPackageMode
        ? quotationPackageAmounts.vatAmount
        : (selectedServiceLines.length ? selectedTotals.vatAmount : (hasDirectServiceAmount ? serviceVatAmount : quotationAmounts.vatAmount));
      const effectiveTotalAmount = quotationPackageMode
        ? quotationPackageAmounts.totalAmount
        : (selectedServiceLines.length ? selectedTotals.totalAmount : (hasDirectServiceAmount ? serviceTotalAmount : quotationAmounts.totalAmount));
      const [resolvedCustomerRecord, resolvedCompanyRecord, resolvedLawyerRecord] = await Promise.all([
        resolvedCustomerId && !resolvedContextCustomerRecord && !projectCustomerRecord && !hasRecordId(custs, resolvedCustomerId)
          ? fetchAnyRecord(["customers:get", "contacts:get", "contact:get"], resolvedCustomerId)
          : Promise.resolve(null),
        resolvedCompanyId && !contextCompanyRecord && !projectCompanyRecord && !hasRecordId(comps, resolvedCompanyId)
          ? fetchAnyRecord(["internalCompany:get", "internalCompanies:get"], resolvedCompanyId)
          : Promise.resolve(null),
        resolvedLawyerId && !contextLawyerRecord && !projectLawyerRecord && !hasRecordId(laws, resolvedLawyerId)
          ? fetchAnyRecord(["lawyers:get", "employees:get", "users:get"], resolvedLawyerId)
          : Promise.resolve(null),
      ]);
      const fallbackQuotationOption =
        popupQuotation || (currentQuotationId ? { id: currentQuotationId, quotationCode: `Quotation #${currentQuotationId}` } : null);
      const fallbackProjectOption =
        popupProject || (resolvedProjectId ? { id: resolvedProjectId, caseCode: `Case #${resolvedProjectId}` } : null);
      const fallbackCustomerOption =
        resolvedContextCustomerRecord || projectCustomerRecord || resolvedCustomerRecord || (resolvedCustomerId ? { id: resolvedCustomerId } : null);
      const fallbackCompanyOption =
        contextCompanyRecord || projectCompanyRecord || resolvedCompanyRecord || (resolvedCompanyId ? { id: resolvedCompanyId } : null);
      const fallbackLawyerOption =
        contextLawyerRecord || projectLawyerRecord || resolvedLawyerRecord || (resolvedLawyerId ? { id: resolvedLawyerId } : null);
      const contractTitlePrefix = resolvedContractKind === "appendix" ? "Phu luc" : "Hop dong";
      const defaultContractName =
        serviceName
          ? `${contractTitlePrefix} - ${serviceName}`
          : (popupQuotation ? `${contractTitlePrefix} - ${quotationLabel(popupQuotation)}` : "");

      debugContractContext("resolved", {
        resolvedCustomerId,
        resolvedCompanyId,
        resolvedLawyerId,
        resolvedProjectId,
        currentQuotationId,
        currentProjectServiceId,
        resolvedQuotationServiceId,
        resolvedParentId,
        resolvedContractKind,
        fallbackCustomerOptionId: extractId(fallbackCustomerOption?.id),
        fallbackCompanyOptionId: extractId(fallbackCompanyOption?.id),
        fallbackLawyerOptionId: extractId(fallbackLawyerOption?.id),
      });

      setQuotations((prev) => mergeRecordById(prev, fallbackQuotationOption));
      setProjects((prev) => mergeRecordById(prev, fallbackProjectOption));
      setCustomers((prev) => mergeRecordById(prev, fallbackCustomerOption));
      setCompanies((prev) => mergeRecordById(prev, fallbackCompanyOption));
      setLawyers((prev) => mergeRecordById(prev, fallbackLawyerOption));

      debugContractContext("setForm", {
        customerId: resolvedCustomerId ? String(resolvedCustomerId) : "",
        internalCompanyId: resolvedCompanyId ? String(resolvedCompanyId) : "",
        lawyerId: resolvedLawyerId ? String(resolvedLawyerId) : "",
        projectId: resolvedProjectId ? String(resolvedProjectId) : "",
        quotationId: currentQuotationId ? String(currentQuotationId) : "",
        parentId: resolvedParentId ? String(resolvedParentId) : "",
      });

      setForm((prev) => ({
        ...prev,
        customerId: resolvedCustomerId ? String(resolvedCustomerId) : prev.customerId,
        internalCompanyId: resolvedCompanyId ? String(resolvedCompanyId) : prev.internalCompanyId,
        lawyerId: resolvedLawyerId ? String(resolvedLawyerId) : prev.lawyerId,
        quotationId: currentQuotationId ? String(currentQuotationId) : prev.quotationId,
        pricingMode: quotationPackageMode ? "package" : "line",
        packageVatRate: quotationPackageMode ? String(quotationPackageAmounts?.vatRate || prev.packageVatRate || "8") : prev.packageVatRate,
        projectId: resolvedProjectId ? String(resolvedProjectId) : prev.projectId,
        parentId: resolvedParentId ? String(resolvedParentId) : prev.parentId,
        projectServiceId: currentProjectServiceId ? String(currentProjectServiceId) : prev.projectServiceId,
        quotationServiceId: resolvedQuotationServiceId ? String(resolvedQuotationServiceId) : prev.quotationServiceId,
        contractKind: resolvedContractKind,
        contractName: serviceName ? `${currentContractKind === "appendix" ? "Phụ lục" : "Hợp đồng"} - ${serviceName}` : prev.contractName,
        contractName: defaultContractName || prev.contractName,
        fixedAmount: effectiveTotalAmount ? String(effectiveTotalAmount) : prev.fixedAmount,
        subTotal: effectiveSubTotal ? String(effectiveSubTotal) : prev.subTotal,
        vatAmount: effectiveSubTotal || effectiveTotalAmount ? String(effectiveVatAmount) : prev.vatAmount,
        totalAmount: effectiveTotalAmount ? String(effectiveTotalAmount) : prev.totalAmount,
        scopeNote: serviceDescription || prev.scopeNote,
      }));

      setLoading(false);
    });
  }, []);

  const setF = (key, value) => {
    setForm((prev) => deriveForm(prev, { [key]: value }));
  };

  useEffect(() => {
    debugContractContext("form-state", {
      customerId: form.customerId,
      internalCompanyId: form.internalCompanyId,
      lawyerId: form.lawyerId,
      projectId: form.projectId,
      quotationId: form.quotationId,
      parentId: form.parentId,
    });
  }, [form.customerId, form.internalCompanyId, form.lawyerId, form.projectId, form.quotationId, form.parentId]);

  const toggleApproval = () => {
    setForm((p) => ({
      ...p,
      isRequiredApproval: !p.isRequiredApproval,
      approvedById: !p.isRequiredApproval ? p.approvedById : "",
    }));
  };

  const selectedQuotation = useMemo(
    () => quotations.find((q) => String(q.id) === String(form.quotationId)),
    [quotations, form.quotationId],
  );

  const selectedContractServiceLines = useMemo(
    () => serviceLines.filter((line) => selectedServiceIds.includes(String(line.projectServiceId))),
    [serviceLines, selectedServiceIds],
  );

  const applyServiceSelection = (nextIds, lines = serviceLines) => {
    const uniqueIds = Array.from(new Set(nextIds.map((id) => String(id)).filter(Boolean)));
    setSelectedServiceIds(uniqueIds);
    const selectedLines = lines.filter((line) => uniqueIds.includes(String(line.projectServiceId)));
    const totals = sumServiceLines(selectedLines);
    const packageSource = selectedLines.find(isPackageSource) || selectedQuotation;
    const packageMode = selectedLines.some(isPackageSource) || isPackageSource(selectedQuotation);
    const packageAmounts = packageMode
      ? resolvePackageAmounts(packageSource, selectedQuotation)
      : null;
    const firstLine = selectedLines[0] || null;
    setForm((prev) => ({
      ...prev,
      projectServiceId: firstLine ? String(firstLine.projectServiceId) : prev.projectServiceId,
      quotationServiceId: firstLine?.quotationServiceId ? String(firstLine.quotationServiceId) : prev.quotationServiceId,
      quotationId: firstLine?.quotationId ? String(firstLine.quotationId) : prev.quotationId,
      pricingMode: packageMode ? "package" : "line",
      packageVatRate: packageMode ? String(packageAmounts.vatRate || prev.packageVatRate || "8") : prev.packageVatRate,
      fixedAmount: selectedLines.length ? String(packageMode ? packageAmounts.totalAmount : totals.totalAmount) : prev.fixedAmount,
      subTotal: selectedLines.length ? String(packageMode ? packageAmounts.subTotal : totals.subTotal) : prev.subTotal,
      vatAmount: selectedLines.length ? String(packageMode ? packageAmounts.vatAmount : totals.vatAmount) : prev.vatAmount,
      totalAmount: selectedLines.length ? String(packageMode ? packageAmounts.totalAmount : totals.totalAmount) : prev.totalAmount,
    }));
  };

  const toggleServiceSelection = (line) => {
    if (!line || line.locked) return;
    const id = String(line.projectServiceId);
    const nextIds = selectedServiceIds.includes(id)
      ? selectedServiceIds.filter((item) => item !== id)
      : [...selectedServiceIds, id];
    applyServiceSelection(nextIds);
  };

  const selectAllAvailableServices = () => {
    applyServiceSelection(serviceLines.filter((line) => !line.locked).map((line) => line.projectServiceId));
  };

  const clearServiceSelection = () => {
    applyServiceSelection([]);
  };

  const selectedCaseServiceLines = selectedContractServiceLines.length
    ? selectedContractServiceLines
    : serviceLines.filter((line) => !line.locked);

  const caseServiceEditorRows = useMemo(
    () =>
      selectedCaseServiceLines.map((line) => ({
        ...line,
        id: String(line.projectServiceId),
        serviceId: line.serviceId ? String(line.serviceId) : "",
        serviceName: line.serviceName || "",
        serviceType: line.serviceType || "",
        description: line.description || "",
        basePrice: line.basePrice ? String(line.basePrice) : "",
        vat: line.vat !== undefined && line.vat !== null ? String(line.vat) : "0",
      })),
    [selectedCaseServiceLines],
  );

  const updateCaseServiceLineRow = (rowId, field, value) => {
    let nextLines = [];
    setServiceLines((prev) => {
      nextLines = prev.map((line) => {
        if (String(line.projectServiceId) !== String(rowId)) return line;
        const next = { ...line, [field]: value };
        if (field === "basePrice" || field === "vat") {
          const basePrice = field === "basePrice" ? parseNum(value) : parseNum(line.basePrice);
          const vat = field === "vat" ? parseNum(value) : parseNum(line.vat);
          const amounts = resolveServiceAmounts({
            basePrice,
            quantity: line.quantity || 1,
            vat,
          });
          return {
            ...next,
            basePrice: amounts.basePrice,
            vat: amounts.vat,
            subTotal: amounts.subTotal,
            vatAmount: amounts.vatAmount,
            totalAmount: amounts.totalAmount,
          };
        }
        return next;
      });
      return nextLines;
    });
    setTimeout(() => applyServiceSelection(selectedServiceIds, nextLines), 0);
  };

  const removeCaseServiceLineRow = (rowId) => {
    applyServiceSelection(selectedServiceIds.filter((id) => String(id) !== String(rowId)));
  };

  const applyQuotationToForm = async (quotationId) => {
    if (!quotationId) {
      setF("quotationId", "");
      return;
    }

    const listRecord = quotations.find((q) => String(q.id) === String(quotationId)) || {};
    const detailRecord = await fetchQuotationDetail(quotationId);
    const quotation = { ...listRecord, ...(detailRecord || {}) };
    const customerId = quotationCustomerId(quotation);
    const internalCompanyId = quotationInternalCompanyId(quotation);
    const lawyerId = quotationLawyerId(quotation);
    const quotationParentId =
      extractId(quotation.parentId) ||
      extractId(quotation.parent) ||
      extractId(quotation.parentQuotation);
    const popupParams = getPopupParams();
    const targetProjectServiceId =
      form.projectServiceId ||
      (popupParams.projectServiceId ? String(popupParams.projectServiceId) : "");
    const targetQuotationServiceId =
      form.quotationServiceId ||
      (popupParams.quotationServiceId ? String(popupParams.quotationServiceId) : "");
    const targetServiceId = popupParams.serviceId ? String(popupParams.serviceId) : "";

    let projectService = null;
    let targetLine = null;
    try {
      if (targetProjectServiceId) {
        const psRes = await ctx.api.request({
          url: "projectServices:get",
          params: { filterByTk: targetProjectServiceId, appends: ["services"] },
        });
        projectService = unwrapRecord(psRes);
      }
      const qsRes = await ctx.api.request({
        url: "quotationServices:list",
        params: {
          filter: JSON.stringify({ quotationId: { $eq: parseInt(quotationId, 10) } }),
          pageSize: 500,
        },
      });
      const qLines = qsRes?.data?.data || [];
      targetLine = qLines.find((line) => String(line.id) === String(targetQuotationServiceId)) ||
        qLines.find((line) => {
          const qServiceId = extractId(line.serviceId) || extractId(line.service);
          const psServiceId = extractId(projectService?.serviceId) || extractId(projectService?.services);
          return qServiceId && (
            String(qServiceId) === String(psServiceId) ||
            String(qServiceId) === String(targetServiceId)
          );
        }) ||
        (qLines.length === 1 ? qLines[0] : null) ||
        null;
    } catch (error) {
      console.warn("[ContractCreateForm] Could not load quotation service context", error);
    }

    const targetProjectId =
      extractId(projectService?.projectId) ||
      extractId(projectService?.project) ||
      extractId(projectService?.projects) ||
      extractId(quotation.projectId) ||
      extractId(quotation.project) ||
      extractFirstId(quotation.cases) ||
      extractId(popupParams.projectId) ||
      extractId(popupParams.caseId);
    const amountSource = targetLine || quotation;
    const lineAmounts = resolveServiceAmounts(targetLine, projectService, popupParams);
    const quotationAmounts = resolveServiceAmounts({
      basePrice: firstPresent(amountSource, ["basePrice"]),
      quantity: firstPresent(amountSource, ["quantity"]),
      vat: firstPresent(amountSource, ["vat"]),
      subTotal: firstPresent(amountSource, ["subTotal"]),
      vatAmount: firstPresent(amountSource, ["vatAmount"]),
      totalAmount: firstPresent(amountSource, ["totalAmount", "grandTotal"]),
    });
    const packageMode = isPackageSource(targetLine) || isPackageSource(projectService) || isPackageSource(quotation);
    const packageAmounts = packageMode
      ? resolvePackageAmounts(targetLine, projectService, quotation)
      : null;
    const amountPatch = targetLine && !packageMode
      ? {
          fixedAmount: lineAmounts.totalAmount ? String(lineAmounts.totalAmount) : "",
          subTotal: lineAmounts.subTotal ? String(lineAmounts.subTotal) : "",
          vatAmount: lineAmounts.subTotal || lineAmounts.totalAmount ? String(lineAmounts.vatAmount) : "",
          totalAmount: lineAmounts.totalAmount ? String(lineAmounts.totalAmount) : "",
          scopeNote: targetLine.description || projectService?.description || "",
        }
      : {
          fixedAmount: (packageMode ? packageAmounts.totalAmount : quotationAmounts.totalAmount) ? String(packageMode ? packageAmounts.totalAmount : quotationAmounts.totalAmount) : "",
          subTotal: (packageMode ? packageAmounts.subTotal : quotationAmounts.subTotal) ? String(packageMode ? packageAmounts.subTotal : quotationAmounts.subTotal) : "",
          vatAmount: (packageMode ? packageAmounts.subTotal || packageAmounts.totalAmount : quotationAmounts.subTotal || quotationAmounts.totalAmount) ? String(packageMode ? packageAmounts.vatAmount : quotationAmounts.vatAmount) : "",
          totalAmount: (packageMode ? packageAmounts.totalAmount : quotationAmounts.totalAmount) ? String(packageMode ? packageAmounts.totalAmount : quotationAmounts.totalAmount) : "",
          scopeNote: targetLine?.description || projectService?.description || "",
        };

    if (targetProjectId) {
      await loadCaseServiceLines({
        projectId: targetProjectId,
        preselectedProjectServiceId: targetProjectServiceId || null,
        knownProjectService: projectService,
        knownQuotation: quotation,
        knownProject: projects.find((item) => String(extractId(item?.id)) === String(targetProjectId)),
        quotationId,
        knownQuotations: [quotation],
      });
    }

    setForm((prev) => deriveForm(prev, {
      quotationId: String(quotationId),
      pricingMode: packageMode ? "package" : "line",
      packageVatRate: packageMode ? String(packageAmounts.vatRate || prev.packageVatRate || "8") : prev.packageVatRate,
      customerId: customerId ? String(customerId) : prev.customerId,
      internalCompanyId: internalCompanyId ? String(internalCompanyId) : prev.internalCompanyId,
      lawyerId: lawyerId ? String(lawyerId) : prev.lawyerId,
      projectId: targetProjectId ? String(targetProjectId) : prev.projectId,
      projectServiceId: targetProjectServiceId || prev.projectServiceId,
      quotationServiceId: targetQuotationServiceId || (extractId(targetLine?.id) ? String(extractId(targetLine.id)) : prev.quotationServiceId),
      contractKind: quotationParentId ? "appendix" : prev.contractKind,
      contractName:
        prev.contractName ||
        (targetLine?.serviceName ? `Hợp đồng - ${targetLine.serviceName}` : prev.contractName),
      ...amountPatch,
      paymentTerms:
        prev.contractType === "retainer"
          ? ""
          : firstPresent(quotation, ["paymentTerms"]) || prev.paymentTerms,
    }));
  };

  const handleCustomerChange = (customerId) => {
    setForm((prev) => {
      const currentQuotation = quotations.find((q) => String(q.id) === String(prev.quotationId));
      const currentQuotationCustomerId = quotationCustomerId(currentQuotation);
      const keepQuotation =
        !customerId ||
        !prev.quotationId ||
        !currentQuotationCustomerId ||
        String(currentQuotationCustomerId) === String(customerId);

      return {
        ...prev,
        customerId,
        quotationId: keepQuotation ? prev.quotationId : "",
        paymentTerms: keepQuotation ? prev.paymentTerms : "",
      };
    });
  };

  const handleProjectChange = async (projectId) => {
    setForm((prev) => ({ ...prev, projectId, projectServiceId: "", quotationServiceId: "" }));
    const result = await loadCaseServiceLines({
      projectId: projectId ? parseInt(projectId, 10) : null,
      preselectedProjectServiceId: null,
      knownProject: projects.find((item) => String(extractId(item?.id)) === String(projectId)),
      knownQuotations: quotations,
    });
    applyServiceSelection(result.selectedIds, result.lines);
  };

  const isRetainer = form.contractType === "retainer";
  const isAppendixContract = useMemo(() => {
    const popupParams = getPopupParams();
    const popupMode = String(popupParams.contractMode || popupParams.mode || "").toLowerCase();
    const popupIsMain = popupParams.isMainContract;
    const quotationParentId =
      extractId(selectedQuotation?.parentId) ||
      extractId(selectedQuotation?.parent) ||
      extractId(selectedQuotation?.parentQuotation);

    return (
      popupMode === "appendix" ||
      popupMode === "sub" ||
      popupMode === "sub-contract" ||
      popupIsMain === false ||
      popupIsMain === "false" ||
      !!form.parentId ||
      !!quotationParentId
    );
  }, [form.parentId, selectedQuotation?.id, selectedQuotation?.parentId]);
  const requestedCodePrefix = String(getPopupParams().codePrefix || "").toUpperCase();
  const autoCodePrefix =
    isAppendixContract || requestedCodePrefix === "PL" ? "PL" : "CT";
  const visibleFeeFields = getFeeVisibility(form);
  const normalizedFeeModel = normalizeFeeModel(form.feeModel);
  const setRetainerField = (key, value) => setF(key, value);

  const handlePaymentDateChange = (value) => setF("paymentDate", value);
  const calculatedTotal = calcTotalByFeeModel(form);
  const totalHint = calculatedTotal
    ? `Auto calculated: ${formatMoney(calculatedTotal)}`
    : isRetainer
      ? "Auto calculated from visible fee fields. Open-ended retainer can stay blank."
      : normalizedFeeModel === "fixed"
        ? "Auto = Fixed amount."
        : normalizedFeeModel === "hourly"
          ? "Auto = Hourly rate x Estimated hours."
          : normalizedFeeModel === "successFee"
            ? "Auto = Success fee."
            : "Auto = Fixed amount + Hourly rate x Estimated hours + Success fee.";
  const endDateHint =
    isRetainer
      ? "Auto from payment date, retainer duration and retainer period when available."
      : ["manual", "milestone", "monthly", "quarterly"].includes(form.billingCycle)
        ? "Manual/milestone/recurring billing needs a separate payment schedule, so end date is entered manually."
        : "Auto from payment date or issued date based on payment terms.";

  const handleContractTypeChange = (value) => {
    setForm((prev) => {
      const nextFeeModel = feeModelForType(value, prev.feeModel);
      const nextBillingCycle =
        value === "retainer"
          ? (prev.billingCycle === "one_time" ? "monthly" : prev.billingCycle)
          : (prev.billingCycle === "monthly" ? "one_time" : prev.billingCycle);

      return deriveForm(prev, {
        contractType: value,
        feeModel: nextFeeModel,
        billingCycle: nextBillingCycle,
        retainerPeriod:
          value === "retainer"
            ? (prev.retainerPeriod || "monthly")
            : "",
        fixedAmount: value === "retainer" ? "" : prev.fixedAmount,
        successFee: value === "retainer" ? "" : prev.successFee,
        monthlyFee: value === "retainer" ? prev.monthlyFee : "",
        retainerDuration: value === "retainer" ? prev.retainerDuration : "",
        includedHours: value === "retainer" ? prev.includedHours : "",
        overageHourlyRate: value === "retainer" ? prev.overageHourlyRate : "",
        paymentTerms: value === "retainer" ? "" : prev.paymentTerms,
      });
    });
  };

  useEffect(() => {
    if (!selectedQuotation) return;
    applyQuotationToForm(selectedQuotation.id);
  }, [selectedQuotation?.id, form.contractType]);

  const customerOptions = customers.map((item) => ({
    value: String(item.id),
    label: customerLabel(item),
    subLabel: customerOverview(item),
  }));

  const companyOptions = companies.map((item) => ({
    value: String(item.id),
    label: companyLabel(item),
  }));

  const lawyerOptions = lawyers.map((item) => ({
    value: String(item.id),
    label: lawyerLabel(item),
  }));

  const templateOptions = templates.map((item) => ({
    value: String(item.id),
    label: labelOf(item, ["name", "templateName", "title"], "Template"),
  }));

  const filteredQuotations = useMemo(
    () =>
      form.customerId
        ? quotations.filter(
            (item) =>
              String(item.id) === String(form.quotationId) ||
              String(quotationCustomerId(item)) === String(form.customerId),
          )
        : quotations,
    [quotations, form.customerId, form.quotationId],
  );

  const quotationOptions = filteredQuotations.map((item) => ({
    value: String(item.id),
    label: quotationLabel(item),
    subLabel: quotationOverview(item, customers),
  }));

  const projectOptions = projects.map((item) => ({
    value: String(item.id),
    label: caseLabel(item),
  }));

  const manualRowsTotals = useMemo(
    () => manualServiceRowsTotals(manualServiceRows),
    [manualServiceRows],
  );

  const packageTotals = useMemo(() => {
    const subTotal = parseNum(form.subTotal || form.fixedAmount);
    const vatRate = parseNum(form.packageVatRate);
    const vatAmount = subTotal * vatRate / 100;
    return {
      subTotal: roundAmount(subTotal),
      vatAmount: roundAmount(vatAmount),
      totalAmount: roundAmount(subTotal + vatAmount),
    };
  }, [form.subTotal, form.fixedAmount, form.packageVatRate]);

  const syncManualLineTotals = (rows) => {
    const totals = manualServiceRowsTotals(rows);
    setForm((prev) => ({
      ...prev,
      pricingMode: "line",
      fixedAmount: totals.totalAmount ? String(totals.totalAmount) : "",
      subTotal: totals.subTotal ? String(totals.subTotal) : "",
      vatAmount: totals.vatAmount ? String(totals.vatAmount) : "",
      totalAmount: totals.totalAmount ? String(totals.totalAmount) : "",
    }));
  };

  const syncPackageTotals = (subTotalValue, vatRateValue) => {
    const subTotal = parseNum(subTotalValue);
    const vatRate = parseNum(vatRateValue);
    const vatAmount = roundAmount(subTotal * vatRate / 100);
    const totalAmount = roundAmount(subTotal + vatAmount);
    setForm((prev) => ({
      ...prev,
      pricingMode: "package",
      packageVatRate: String(vatRateValue ?? ""),
      fixedAmount: totalAmount ? String(totalAmount) : "",
      subTotal: subTotal ? String(subTotal) : "",
      vatAmount: vatAmount ? String(vatAmount) : "",
      totalAmount: totalAmount ? String(totalAmount) : "",
    }));
  };

  const handleManualPricingModeChange = (mode) => {
    const nextMode = mode === "package" ? "package" : "line";
    const activeRows = serviceLines.length ? selectedCaseServiceLines : manualServiceRows;
    const activeTotals = serviceLines.length ? sumServiceLines(activeRows) : manualRowsTotals;
    if (nextMode === "package") {
      const packageSource = activeRows.find(isPackageSource);
      const sourcePackage = packageSource ? resolvePackageAmounts(packageSource) : null;
      const sourceSubTotal = sourcePackage?.subTotal || activeTotals.subTotal || parseNum(form.subTotal);
      const sourceVatRate = sourcePackage?.vatRate || form.packageVatRate || "8";
      syncPackageTotals(sourceSubTotal ? String(sourceSubTotal) : "", sourceVatRate);
      return;
    }
    if (serviceLines.length) {
      setForm((prev) => ({
        ...prev,
        pricingMode: "line",
        fixedAmount: activeTotals.totalAmount ? String(activeTotals.totalAmount) : "",
        subTotal: activeTotals.subTotal ? String(activeTotals.subTotal) : "",
        vatAmount: activeTotals.vatAmount ? String(activeTotals.vatAmount) : "",
        totalAmount: activeTotals.totalAmount ? String(activeTotals.totalAmount) : "",
      }));
      return;
    }
    syncManualLineTotals(manualServiceRows);
  };

  const addManualServiceRow = () => {
    setManualServiceRows((prev) => [...prev, newManualServiceRow()]);
  };

  const deleteManualServiceRow = (rowId) => {
    setManualServiceRows((prev) => {
      const next = prev.filter((row) => row.id !== rowId);
      if (form.pricingMode !== "package") syncManualLineTotals(next);
      return next;
    });
  };

  const updateManualServiceRow = (rowId, field, value) => {
    setManualServiceRows((prev) => {
      const next = prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row));
      if (form.pricingMode !== "package") syncManualLineTotals(next);
      return next;
    });
  };

  const selectManualService = (rowId, serviceId, serviceOverride = null) => {
    const service =
      serviceOverride ||
      serviceCatalog.find((item) => String(extractId(item?.id)) === String(serviceId));
    if (serviceId && !service) {
      message.warning("Selected service was not found in catalog.");
      return;
    }
    if (serviceId && manualServiceRows.some((row) => row.id !== rowId && String(row.serviceId) === String(serviceId))) {
      message.warning("This service is already selected in another row.");
      return;
    }
    setManualServiceRows((prev) => {
      const next = prev.map((row) => {
        if (row.id !== rowId) return row;
        if (!serviceId) {
          return {
            ...row,
            serviceId: "",
            serviceName: "",
            serviceType: "",
            description: "",
            basePrice: "",
          };
        }
        return {
          ...row,
          serviceId: String(serviceId),
          serviceName: serviceCatalogName(service),
          serviceType: serviceCatalogType(service),
          description: row.description || serviceCatalogDescription(service),
          basePrice: form.pricingMode === "package" ? "" : String(serviceCatalogPrice(service) || ""),
          vat: form.pricingMode === "package" ? "0" : (row.vat || "8"),
        };
      });
      if (form.pricingMode !== "package") syncManualLineTotals(next);
      return next;
    });
  };

  const createManualContractServiceDraft = (rowId, data) => {
    const serviceName = String(data?.serviceName || "").trim();
    if (!serviceName) {
      message.warning("Please enter service name.");
      return null;
    }
    const existsInCatalog = serviceCatalog.find(
      (item) => normalizeSearch(serviceCatalogName(item)) === normalizeSearch(serviceName),
    );
    if (existsInCatalog) {
      message.warning("This service already exists in the catalog. Please select it instead.");
      return null;
    }
    const existsInRows = manualServiceRows.find(
      (row) => row.id !== rowId && normalizeSearch(row.serviceName) === normalizeSearch(serviceName),
    );
    if (existsInRows) {
      message.warning("This service is already added in another row.");
      return null;
    }
    if (parseNum(data?.basePrice) <= 0) {
      message.warning("Please enter unit price greater than 0.");
      return null;
    }

    const draft = {
      serviceName,
      serviceType: String(data?.serviceType || "").trim() || null,
      basePrice: String(parseNum(data?.basePrice) || ""),
      description: String(data?.description || "").trim(),
    };

    setManualServiceRows((prev) => {
      const next = prev.map((row) => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          serviceId: "",
          serviceName: draft.serviceName,
          serviceType: draft.serviceType || "",
          description: draft.description,
          basePrice: draft.basePrice,
          quantity: row.quantity || "1",
          vat: row.vat || "8",
        };
      });
      if (form.pricingMode !== "package") syncManualLineTotals(next);
      return next;
    });
    message.success("Service row added.");
    return draft;
  };

  const parentContractOptions = parentContracts
    .filter((item) => String(item.id) !== String(ctx.record?.id || ""))
    .map((item) => ({
      value: String(item.id),
      label: labelOf(item, ["contractCode", "contractNumber", "code", "contractName"], "Contract"),
    }));

  const buildContractServicePayload = async ({ contractId, projectServiceId, quotationServiceId, projectId, serviceLine }) => {
    if (!contractId || !projectServiceId) return null;

    const popupParams = getPopupParams();
    const projectService = await fetchRecord("projectServices:get", projectServiceId, {
      appends: ["services"],
    });

    let quotationService = null;
    const directQuotationServiceId =
      quotationServiceId ||
      extractId(serviceLine?.quotationServiceId) ||
      (form.quotationServiceId ? parseInt(form.quotationServiceId, 10) : null);
    if (directQuotationServiceId) {
      quotationService = await fetchRecord("quotationServices:get", directQuotationServiceId);
    } else if (form.quotationId) {
      try {
        const serviceIdForMatch =
          extractId(projectService?.serviceId) ||
          extractId(projectService?.services) ||
          extractId(popupParams.serviceId);
        const qsRes = await ctx.api.request({
          url: "quotationServices:list",
          params: {
            filter: JSON.stringify({ quotationId: { $eq: parseInt(form.quotationId, 10) } }),
            pageSize: 500,
          },
        });
        quotationService = (qsRes?.data?.data || []).find((line) => {
          const lineServiceId = extractId(line.serviceId) || extractId(line.service);
          return lineServiceId && String(lineServiceId) === String(serviceIdForMatch);
        }) || null;
      } catch (error) {
        console.warn("[ContractCreateForm] Could not find quotation service for contract line", error);
      }
    }

    const serviceId =
      extractId(quotationService?.serviceId) ||
      extractId(quotationService?.service) ||
      extractId(projectService?.serviceId) ||
      extractId(projectService?.services) ||
      extractId(popupParams.serviceId) ||
      extractId(serviceLine?.serviceId);
    const serviceName =
      serviceLine?.serviceName ||
      quotationService?.serviceName ||
      projectService?.serviceName ||
      projectService?.services?.serviceName ||
      popupParams.serviceName ||
      form.contractName;
    const description =
      serviceLine?.description ||
      quotationService?.description ||
      form.scopeNote ||
      projectService?.description ||
      projectService?.services?.description ||
      popupParams.description ||
      null;
    const packageMode = form.pricingMode === "package";
    const pricingPayload = packageMode
      ? packagePricingPayload(
          quotationService,
          serviceLine,
          projectService,
          popupParams,
          {
            packageSubTotal: form.subTotal || form.fixedAmount,
            packageVatRate: form.packageVatRate,
            packageVatAmount: form.vatAmount,
            packageTotalAmount: form.totalAmount || form.fixedAmount,
          },
        )
      : projectServicePricingPayload(
          resolveServiceAmounts(
            serviceLine,
            quotationService,
            projectService,
            popupParams,
            {
              basePrice: form.subTotal || form.fixedAmount,
              subTotal: form.subTotal,
              vatAmount: form.vatAmount,
              totalAmount: form.totalAmount || form.fixedAmount,
            },
          ),
        );

    const payload = {
      contractId,
      contracts: contractId,
      projectServiceId,
      projectServices: projectServiceId,
      quotationServiceId: extractId(quotationService?.id) || directQuotationServiceId || null,
      quotationServices: extractId(quotationService?.id) || directQuotationServiceId || undefined,
      serviceId: serviceId || null,
      projectId: projectId || extractId(serviceLine?.projectId) || extractId(popupParams.projectId) || extractId(popupParams.caseId) || null,
      serviceName: serviceName || null,
      description,
      ...pricingPayload,
      lineStatus: contractStatusToProjectServiceStatus(form.status),
    };
    return payload;
  };

  const buildManualContractServicePayload = ({ contractId, row, projectId }) => {
    if (!contractId || !row) return null;
    const packageMode = form.pricingMode === "package";
    const pricingPayload = packageMode
      ? packagePricingPayload({
          packageSubTotal: form.subTotal || form.fixedAmount,
          packageVatRate: form.packageVatRate,
          packageVatAmount: form.vatAmount,
          packageTotalAmount: form.totalAmount || form.fixedAmount,
        })
      : projectServicePricingPayload(manualServiceLineAmounts(row, false));
    return {
      contractId,
      contracts: contractId,
      serviceId: row.serviceId ? parseInt(row.serviceId, 10) : null,
      services: row.serviceId ? parseInt(row.serviceId, 10) : undefined,
      projectId: projectId || null,
      serviceName: row.serviceName || null,
      serviceType: row.serviceType || null,
      description: row.description || null,
      ...pricingPayload,
      lineStatus: packageMode ? "included_in_package" : contractStatusToProjectServiceStatus(form.status),
    };
  };

  const createContractServiceLine = async (payload) => {
    if (!payload) return null;
    try {
      const res = await ctx.api.request({
        url: "contractServices:create",
        method: "POST",
        data: payload,
      });
      return res?.data?.data || res?.data || null;
    } catch (error) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.contracts;
      delete fallbackPayload.projectServices;
      delete fallbackPayload.quotationServices;
      delete fallbackPayload.services;
      try {
        const res = await ctx.api.request({
          url: "contractServices:create",
          method: "POST",
          data: fallbackPayload,
        });
        return res?.data?.data || res?.data || null;
      } catch (fallbackError) {
        const minimalPayload = { ...fallbackPayload };
        delete minimalPayload.serviceType;
        delete minimalPayload.serviceId;
        const res = await ctx.api.request({
          url: "contractServices:create",
          method: "POST",
          data: minimalPayload,
        });
        return res?.data?.data || res?.data || null;
      }
    }
  };

  const isContractFolder = (folder, contractId) =>
    String(firstId(folder?.contractId, folder?.contract, folder?.contracts)) === String(contractId);

  const isCaseFolderCandidate = (folder, projectId, projectFolderIds) => {
    const folderProjectId = firstId(folder?.projectId, folder?.project, folder?.projects);
    if (String(folderProjectId) !== String(projectId)) return false;

    const linkedRecordId = firstId(
      folder?.contractId,
      folder?.contract,
      folder?.contracts,
      folder?.quotationId,
      folder?.quotation,
      folder?.quotations,
      folder?.projectServiceId,
      folder?.projectService,
      folder?.projectServices,
      folder?.taskId,
      folder?.task,
      folder?.tasks,
    );
    if (linkedRecordId) return false;

    const parentId = firstId(folder?.parentId, folder?.parent);
    return !parentId || !projectFolderIds.has(String(parentId));
  };

  const ensureMainContractFolder = async ({ contractId, projectId, customerId, contractCode, contractName }) => {
    if (!contractId || !projectId) return null;
    if (!AUTO_CREATE_CONTRACT_FOLDERS) return null;

    try {
      const foldersRes = await ctx.api.request({
        url: "folders:list",
        params: {
          filter: JSON.stringify({ projectId: { $eq: parseInt(projectId, 10) } }),
          pageSize: 1000,
          sort: ["folderIndex", "createdAt"],
        },
      });
      const allFolders = foldersRes?.data?.data || [];
      const existingContractFolder = allFolders.find((folder) => isContractFolder(folder, contractId));
      if (existingContractFolder) return existingContractFolder;

      const projectFolderIds = new Set(allFolders.map((folder) => extractId(folder?.id)).filter(Boolean).map(String));
      const parentCaseFolder =
        allFolders.find((folder) => isCaseFolderCandidate(folder, projectId, projectFolderIds)) ||
        allFolders.find((folder) => String(firstId(folder?.projectId, folder?.project, folder?.projects)) === String(projectId));

      if (!parentCaseFolder) {
        console.warn("[ContractCreateForm] Could not find case folder for contract folder", {
          projectId,
          contractId,
          projectRecord: getConfiguredProjectRecord(),
        });
        return null;
      }

      const parentId = extractId(parentCaseFolder.id);
      const childFolders = allFolders.filter((folder) => String(firstId(folder?.parentId, folder?.parent)) === String(parentId));
      const maxFolderIndex = childFolders.reduce((max, folder) => Math.max(max, parseInt(folder.folderIndex, 10) || 0), 0);
      const projectRecord = getConfiguredProjectRecord();
      const creatorId = firstId(projectRecord?.createdById, projectRecord?.createdBy, projectRecord?.updatedById, projectRecord?.updatedBy);
      const folderName = compact(["Hợp đồng", contractCode || contractName || contractId]).join(" ");

      const folderPayload = {
        name: folderName,
        parentId,
        projectId: parseInt(projectId, 10),
        customerId: customerId ? parseInt(customerId, 10) : firstId(parentCaseFolder.customerId, parentCaseFolder.customer),
        moduleScope: CASE_DOCUMENT_SCOPE,
        contractId: parseInt(contractId, 10),
        createdById: creatorId || undefined,
        updatedById: creatorId || undefined,
        folderIndex: maxFolderIndex + 1,
      };
      Object.keys(folderPayload).forEach((key) => {
        if (folderPayload[key] === undefined || folderPayload[key] === null) delete folderPayload[key];
      });

      const createRes = await ctx.api.request({
        url: "folders:create",
        method: "POST",
        data: folderPayload,
      });

      return createRes?.data?.data || createRes?.data || null;
    } catch (error) {
      console.warn("[ContractCreateForm] Could not create main contract folder", error);
      return null;
    }
  };

  const validate = () => {
    if (!form.contractName.trim()) return "Please enter the contract name.";
    if (!form.customerId) return "Please select a customer.";
    if (!form.internalCompanyId) return "Please select an internal company.";
    if (!form.contractType) return "Please select the contract type.";
    if (serviceLines.length && !selectedContractServiceLines.length) {
      return "Please select at least one service for this contract.";
    }
    if (!serviceLines.length && manualServiceRows.length) {
      if (manualServiceRows.some((row) => !row.serviceName && !row.serviceId)) {
        return "Please select a service for every contract service row.";
      }
      const selectedManualServiceIds = manualServiceRows.map((row) => String(row.serviceId || "")).filter(Boolean);
      if (new Set(selectedManualServiceIds).size !== selectedManualServiceIds.length) {
        return "Duplicate services are not allowed in contract service rows.";
      }
      const manualServiceNames = manualServiceRows
        .map((row) => normalizeSearch(row.serviceName).replace(/\s+/g, " ").trim())
        .filter(Boolean);
      if (new Set(manualServiceNames).size !== manualServiceNames.length) {
        return "Duplicate service names are not allowed in contract service rows.";
      }
      const manualNameMatchesCatalog = manualServiceRows.some((row) => {
        if (row.serviceId || !row.serviceName) return false;
        const name = normalizeSearch(row.serviceName).replace(/\s+/g, " ").trim();
        return serviceCatalog.some(
          (service) => normalizeSearch(serviceCatalogName(service)).replace(/\s+/g, " ").trim() === name,
        );
      });
      if (manualNameMatchesCatalog) {
        return "A manually created service already exists in the catalog. Please select the existing service instead.";
      }
      if (form.pricingMode !== "package" && manualServiceRows.some((row) => parseNum(row.basePrice) <= 0)) {
        return "Please enter base price for every line-priced service.";
      }
      if (form.pricingMode === "package" && parseNum(form.subTotal || form.fixedAmount) <= 0) {
        return "Please enter package subtotal.";
      }
    }
    if ((form.contractKind === "appendix" || isAppendixContract) && !form.parentId) {
      return "Please select the main contract before creating an appendix.";
    }
    return "";
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      message.warning(error);
      return;
    }

    setSaving(true);
    try {
      const name = form.contractName.trim();
      const quotationId = form.quotationId ? parseInt(form.quotationId, 10) : null;
      const currentProjectId = getConfiguredProjectId();
      const projectId = currentProjectId || (form.projectId ? parseInt(form.projectId, 10) : null);
      const parentId = form.parentId ? parseInt(form.parentId, 10) : null;
      const projectServiceId = form.projectServiceId ? parseInt(form.projectServiceId, 10) : null;
      const serviceLinesForSubmit = selectedContractServiceLines.length
        ? selectedContractServiceLines
        : (projectServiceId ? [{
            projectServiceId,
            quotationServiceId: form.quotationServiceId ? parseInt(form.quotationServiceId, 10) : null,
            projectId,
          }] : []);
      const manualServiceRowsForSubmit =
        serviceLines.length
          ? []
          : manualServiceRows.filter((row) => row.serviceName || row.serviceId);
      const contractKind = form.contractKind || (parentId ? "appendix" : "main");
      const finalContractCode =
        form.contractCode.trim() ||
        await generateContractCode({
          prefix: autoCodePrefix,
          issuedDate: form.issuedDate,
          parentId,
        });

      const payload = {
        status: form.status || "draft",
        contractKind,
        contractType: form.contractType || null,
        feeModel: form.feeModel || null,
        billingCycle: form.billingCycle || null,
        contractCode: finalContractCode,
        contractNumber: finalContractCode,
        code: finalContractCode,
        contractName: name,
        customerId: parseInt(form.customerId, 10),
        internalCompanyId: parseInt(form.internalCompanyId, 10),
        lawyerId: form.lawyerId ? parseInt(form.lawyerId, 10) : null,
        templateId: form.templateId ? parseInt(form.templateId, 10) : null,
        quotationId,
        quotations: quotationId || undefined,
        pricingMode: form.pricingMode,
        packageVatRate: form.pricingMode === "package" ? parseNum(form.packageVatRate) : null,
        cases: (projectId && contractKind !== "appendix") ? [projectId] : undefined,
        parentId,
        parent: parentId || undefined,
        issuedDate: toIso(form.issuedDate),
        endDate: toIso(form.endDate),
        paymentDate: toIso(form.paymentDate),
        paymentTerms: !isRetainer ? form.paymentTerms || null : null,
        monthlyFee: visibleFeeFields.monthlyFee ? parseNum(form.monthlyFee) || null : null,
        fixedAmount: visibleFeeFields.fixedAmount ? parseNum(form.fixedAmount) || null : null,
        hourlyRate: visibleFeeFields.hourlyRate ? parseNum(form.hourlyRate) || null : null,
        estimatedHours: visibleFeeFields.estimatedHours ? nullableNum(form.estimatedHours) : null,
        successFee: visibleFeeFields.successFee ? parseNum(form.successFee) || null : null,
        retainerPeriod: isRetainer ? form.retainerPeriod || null : null,
        retainerDuration: isRetainer ? nullableNum(form.retainerDuration) : null,
        includedHours: visibleFeeFields.includedHours ? parseNum(form.includedHours) || null : null,
        overageHourlyRate: visibleFeeFields.overageHourlyRate ? parseNum(form.overageHourlyRate) || null : null,
        subTotal: nullableNum(form.subTotal),
        vatAmount: nullableNum(form.vatAmount),
        totalAmount: nullableNum(form.totalAmount),
        scopeNote: form.scopeNote.trim() || null,
        description: form.description.trim() || null,
        isRequiredApproval: form.isRequiredApproval,
        approvedById: form.isRequiredApproval && form.approvedById ? parseInt(form.approvedById, 10) : null,
        approvedAt: form.isRequiredApproval ? new Date().toISOString() : null,
      };

      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) delete payload[key];
      });

      const contractRes = await ctx.api.request({
        url: "contracts:create",
        method: "POST",
        data: payload,
      });
      const contractId = contractRes?.data?.data?.id || contractRes?.data?.id;
      const contractServiceLines = [];

      if (contractId && serviceLinesForSubmit.length) {
        for (const line of serviceLinesForSubmit) {
          const lineProjectServiceId = extractId(line.projectServiceId);
          if (!lineProjectServiceId) continue;
          const contractServicePayload = await buildContractServicePayload({
            contractId,
            projectServiceId: lineProjectServiceId,
            quotationServiceId: extractId(line.quotationServiceId),
            projectId,
            serviceLine: line,
          });
          const createdLine = await createContractServiceLine(contractServicePayload);
          if (createdLine) contractServiceLines.push(createdLine);

          const projectServiceUpdatePayload = {
            ...projectServicePricingPayload(contractServicePayload || line),
            contractId,
            contractServiceId: extractId(createdLine?.id) || undefined,
            status: contractStatusToProjectServiceStatus(form.status),
            quotationServiceId: contractServicePayload?.quotationServiceId || undefined,
          };
          Object.keys(projectServiceUpdatePayload).forEach((key) => {
            if (projectServiceUpdatePayload[key] === undefined) delete projectServiceUpdatePayload[key];
          });

          await ctx.api.request({
            url: "projectServices:update",
            method: "POST",
            params: { filterByTk: lineProjectServiceId },
            data: projectServiceUpdatePayload,
          });
        }
      }

      if (contractId && manualServiceRowsForSubmit.length) {
        for (const row of manualServiceRowsForSubmit) {
          const contractServicePayload = buildManualContractServicePayload({
            contractId,
            row,
            projectId,
          });
          const createdLine = await createContractServiceLine(contractServicePayload);
          if (createdLine) contractServiceLines.push(createdLine);
        }
      }

      if (contractId && projectId && contractKind === "main") {
        await ctx.api.request({
          url: "projects:update",
          method: "POST",
          params: { filterByTk: projectId },
          data: { contractId },
        }).catch((error) => console.warn("[ContractCreateForm] Could not link main contract to project", error));
      }

      if (contractId && currentProjectId && contractKind === "main") {
        await ensureMainContractFolder({
          contractId,
          projectId: currentProjectId,
          customerId: payload.customerId,
          contractCode: finalContractCode,
          contractName: name,
        });
      }

      message.success("Contract created successfully.");
      if (ctx.view?.close) {
        setTimeout(() => {
          ctx.view.close();
        }, 1200);
      }
      setForm((prev) => ({
        ...prev,
        contractCode: "",
        contractName: "",
        parentId: "",
        projectServiceId: "",
        quotationServiceId: "",
        contractKind: "main",
        quotationId: "",
        projectId: "",
        monthlyFee: "",
        fixedAmount: "",
        hourlyRate: "",
        estimatedHours: "",
        successFee: "",
        retainerDuration: "",
        includedHours: "",
        overageHourlyRate: "",
        subTotal: "",
        vatAmount: "",
        totalAmount: "",
        scopeNote: "",
        description: "",
        isRequiredApproval: false,
        approvedById: "",
        packageVatRate: "8",
      }));
      setSelectedServiceIds([]);
      setManualServiceRows([]);
      setServiceLines((prev) =>
        prev.map((line) =>
          serviceLinesForSubmit.some((selectedLine) => String(extractId(selectedLine.projectServiceId)) === String(line.projectServiceId))
            ? { ...line, contractId, locked: true, status: contractStatusToProjectServiceStatus(form.status) }
            : line,
        ),
      );
    } catch (err) {
      console.error(err);
      message.error(`Could not create contract${err?.message ? `: ${err.message}` : ""}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return React.createElement(
      "div",
      { style: { padding: 32, textAlign: "center" } },
      React.createElement(Spin, null),
    );
  }

  return React.createElement(
    "div",
    {
      style: {
        fontFamily: FONT,
        color: C.text,
        background: C.bg,
        padding: 20,
        width: "100%",
        boxSizing: "border-box",
      },
    },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginBottom: 12,
        },
      },
      React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setGuideOpen(true),
          style: {
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            background: "#ffffff",
            color: C.text,
            padding: "8px 13px",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONT,
            cursor: "pointer",
          },
        },
        "Hướng dẫn",
      ),
    ),
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          alignItems: "start",
          width: "100%",
        },
      },
      React.createElement(
        "div",
        { style: { minWidth: 0 } },
        React.createElement(
          Section,
          { title: "Contract information" },
          React.createElement(
            "div",
            { style: gridStyle },
            React.createElement(
              Field,
              { label: "Contract type", required: true },
              React.createElement(SelectInput, {
                value: form.contractType,
                onChange: handleContractTypeChange,
                options: CONTRACT_TYPES,
              }),
            ),
            React.createElement(
              Field,
              { label: "Status" },
              React.createElement(SelectInput, {
                value: form.status,
                onChange: (v) => setF("status", v),
                options: STATUS_OPTIONS,
              }),
            ),
            React.createElement(
              Field,
              { label: "Contract code" },
              React.createElement(TextInput, {
                value: form.contractCode,
                onChange: (v) => setF("contractCode", v),
                placeholder: `Leave blank to auto-generate ${autoCodePrefix}`,
              }),
            ),
            React.createElement(
              Field,
              { label: "Contract name", required: true },
              React.createElement(TextInput, {
                value: form.contractName,
                onChange: (v) => setF("contractName", v),
                placeholder: "Contract name",
              }),
            ),
            React.createElement(
              Field,
              { label: "Parent contract" },
              React.createElement(SelectInput, {
                value: form.parentId,
                onChange: (v) => setF("parentId", v),
                options: parentContractOptions,
                placeholder: "No parent",
              }),
            ),
          ),
          React.createElement(
            "div",
            { style: { marginTop: 16 } },
            React.createElement(ApprovalSection, {
              isRequired: form.isRequiredApproval,
              approvedById: form.approvedById,
              lawyerOptions: lawyerOptions,
              onToggle: toggleApproval,
              onSelectApprover: (v) => setForm((p) => ({ ...p, approvedById: v })),
            })
          )
        ),

    React.createElement(
      Section,
      { title: "Parties and links" },
      React.createElement(
        "div",
        { style: gridStyle },
        React.createElement(
          Field,
          { label: "Customer", required: true },
          React.createElement(SearchSelect, {
            value: form.customerId,
            onChange: handleCustomerChange,
            options: customerOptions,
            placeholder: "Select customer",
          }),
        ),

        React.createElement(
          Field,
          { label: "Internal company", required: true },
          React.createElement(SearchSelect, {
            value: form.internalCompanyId,
            onChange: (v) => setF("internalCompanyId", v),
            options: companyOptions,
            placeholder: "Select company",
          }),
        ),
        React.createElement(
          Field,
          { label: "Lawyer" },
          React.createElement(SearchSelect, {
            value: form.lawyerId,
            onChange: (v) => setF("lawyerId", v),
            options: lawyerOptions,
            placeholder: "Select lawyer",
          }),
        ),
        React.createElement(
          Field,
          { label: "Template" },
          React.createElement(SearchSelect, {
            value: form.templateId,
            onChange: (v) => setF("templateId", v),
            options: templateOptions,
            placeholder: "Select template",
          }),
        ),
        React.createElement(
          Field,
          { label: "Quotation" },
          React.createElement(SearchSelect, {
            value: form.quotationId,
            onChange: (v) => {
              if (v) {
                applyQuotationToForm(v);
              } else {
                setForm((prev) => ({
                  ...prev,
                  quotationId: "",
                  paymentTerms: "",
                }));
              }
            },
            options: quotationOptions,
            placeholder: form.customerId ? "Search customer quotation" : "Search quotation",
          }),
        ),
        React.createElement(
          Field,
          { label: "Case" },
          React.createElement(SearchSelect, {
            value: form.projectId,
            onChange: handleProjectChange,
            options: projectOptions,
            placeholder: "No case",
          }),
        ),
      ),
    ),

    React.createElement(ManualContractServicesSection, {
      rows: serviceLines.length ? caseServiceEditorRows : manualServiceRows,
      services: serviceCatalog,
      pricingMode: form.pricingMode,
      packageVatRate: form.packageVatRate,
      packageTotals,
      readOnlyServices: !!serviceLines.length,
      showAddRow: !serviceLines.length,
      allowDelete: !serviceLines.length || selectedServiceIds.length > 1,
      onPricingModeChange: handleManualPricingModeChange,
      onPackageSubTotalChange: (value) => syncPackageTotals(value, form.packageVatRate),
      onPackageVatRateChange: (value) => syncPackageTotals(form.subTotal || form.fixedAmount, value),
      onAddRow: serviceLines.length ? undefined : addManualServiceRow,
      onDeleteRow: serviceLines.length ? removeCaseServiceLineRow : deleteManualServiceRow,
      onUpdateRow: serviceLines.length ? updateCaseServiceLineRow : updateManualServiceRow,
      onSelectService: serviceLines.length ? undefined : selectManualService,
      onCreateManualService: serviceLines.length ? undefined : createManualContractServiceDraft,
    }),

    React.createElement(
      Section,
      { title: "Commercial terms" },
      React.createElement(
        "div",
        { style: gridStyle },
        React.createElement(
          Field,
          { label: "Fee model" },
          React.createElement(SelectInput, {
            value: form.feeModel,
            onChange: (v) => setF("feeModel", v),
            options: FEE_MODELS.filter((option) =>
              allowedFeeModels(form.contractType).includes(option.value),
            ),
          }),
        ),
        React.createElement(
          Field,
          { label: "Billing cycle" },
          React.createElement(SelectInput, {
            value: form.billingCycle,
            onChange: (v) => setF("billingCycle", v),
            options: BILLING_CYCLES,
          }),
        ),
        !isRetainer &&
          React.createElement(
            Field,
            { label: "Payment terms" },
            React.createElement(SelectInput, {
              value: form.paymentTerms,
              onChange: (v) => setF("paymentTerms", v),
              options: PAYMENT_TERMS,
              placeholder: "Select payment terms",
            }),
          ),
        visibleFeeFields.retainerPeriod &&
          React.createElement(
            Field,
            { label: "Retainer period" },
            React.createElement(SelectInput, {
              value: form.retainerPeriod,
              onChange: (v) => setRetainerField("retainerPeriod", v),
              options: RETAINER_PERIODS,
              placeholder: "Not applicable",
            }),
          ),
        visibleFeeFields.retainerDuration &&
          React.createElement(
            Field,
            {
              label: "Retainer duration",
              hint: "Leave blank for open-ended retainer",
            },
            React.createElement(SuffixInput, {
              value: form.retainerDuration,
              onChange: (v) => setRetainerField("retainerDuration", moneyRaw(v)),
              placeholder: "Number of billing cycles",
              suffix: retainerDurationSuffix(form.retainerPeriod, form.retainerDuration),
            }),
          ),
        visibleFeeFields.fixedAmount &&
          React.createElement(
            Field,
            { label: "Fixed amount" },
            React.createElement(MoneyInput, {
              value: form.fixedAmount,
              onChange: (v) => setF("fixedAmount", v),
            }),
          ),
        visibleFeeFields.monthlyFee &&
          React.createElement(
            Field,
            { label: "Monthly fee" },
            React.createElement(MoneyInput, {
              value: form.monthlyFee,
              onChange: (v) => setRetainerField("monthlyFee", v),
            }),
          ),
        visibleFeeFields.hourlyRate &&
          React.createElement(
            Field,
            { label: "Hourly rate" },
            React.createElement(MoneyInput, {
              value: form.hourlyRate,
              onChange: (v) => setF("hourlyRate", v),
            }),
          ),
        visibleFeeFields.estimatedHours &&
          React.createElement(
            Field,
            { label: "Estimated hours" },
            React.createElement(SuffixInput, {
              value: form.estimatedHours,
              onChange: (v) => setF("estimatedHours", moneyRaw(v)),
              placeholder: "0",
              suffix: "hours",
            }),
          ),
        visibleFeeFields.overageHourlyRate &&
          React.createElement(
            Field,
            { label: "Overage hourly rate" },
            React.createElement(MoneyInput, {
              value: form.overageHourlyRate,
              onChange: (v) => setF("overageHourlyRate", v),
            }),
          ),
        visibleFeeFields.successFee &&
          React.createElement(
            Field,
            { label: "Success fee" },
            React.createElement(MoneyInput, {
              value: form.successFee,
              onChange: (v) => setF("successFee", v),
            }),
          ),
        visibleFeeFields.includedHours &&
          React.createElement(
            Field,
            { label: "Included hours" },
            React.createElement(SuffixInput, {
              value: form.includedHours,
              onChange: (v) => setF("includedHours", moneyRaw(v)),
              placeholder: "0",
              suffix: "hours",
            }),
          ),
      ),
    ),

    React.createElement(
      Section,
      { title: "Dates" },
      React.createElement(
        "div",
        { style: gridStyle },
        React.createElement(
          Field,
          { label: "Issued date" },
          React.createElement(TextInput, {
            type: "date",
            value: form.issuedDate,
            onChange: (v) => setF("issuedDate", v),
          }),
        ),
        React.createElement(
          Field,
          { label: "Payment date" },
          React.createElement(TextInput, {
            type: "date",
            value: form.paymentDate,
            onChange: handlePaymentDateChange,
          }),
        ),
        React.createElement(
          Field,
          { label: "End date", hint: endDateHint },
          React.createElement(TextInput, {
            type: "date",
            value: form.endDate,
            onChange: (v) => setF("endDate", v),
          }),
        ),
      ),
    ),

    React.createElement(
      Section,
      { title: "Amounts" },
      React.createElement(
        "div",
        { style: gridStyle },
        React.createElement(
          Field,
          { label: "Subtotal" },
          React.createElement(MoneyInput, {
            value: form.subTotal,
            onChange: (v) => setF("subTotal", v),
          }),
        ),
        React.createElement(
          Field,
          { label: "VAT amount" },
          React.createElement(MoneyInput, {
            value: form.vatAmount,
            onChange: (v) => setF("vatAmount", v),
          }),
        ),
        React.createElement(
          Field,
          {
            label: "Total amount",
            hint: totalHint,
          },
          React.createElement(MoneyInput, {
            value: form.totalAmount,
            onChange: (v) => setF("totalAmount", v),
          }),
        ),
      ),
    ),

    React.createElement(
      Section,
      { title: "Scope and notes" },
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "1fr", gap: 14 } },
        React.createElement(
          Field,
          { label: "Scope note" },
          React.createElement(TextArea, {
            value: form.scopeNote,
            onChange: (v) => setF("scopeNote", v),
            placeholder: "Scope, inclusions, exclusions, quota notes...",
            rows: 4,
          }),
        ),
        React.createElement(
          Field,
          { label: "Description" },
          React.createElement(TextArea, {
            value: form.description,
            onChange: (v) => setF("description", v),
            placeholder: "Internal description or drafting notes",
            rows: 3,
          }),
        ),
      ),
    ),

    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 20,
          paddingTop: 16,
          borderTop: `1px solid ${C.border}`,
        },
      },
      React.createElement(
        "button",
        {
          type: "button",
          disabled: saving,
          onClick: () => {
            setForm((prev) => ({
              ...prev,
              contractCode: "",
              contractName: "",
              scopeNote: "",
              description: "",
            }));
          },
          style: {
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            background: "#ffffff",
            color: C.text,
            padding: "9px 15px",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONT,
            cursor: saving ? "default" : "pointer",
          },
        },
        "Clear text",
      ),
      React.createElement(
        "button",
        {
          type: "button",
          disabled: saving,
          onClick: handleSubmit,
          style: {
            border: "none",
            borderRadius: 6,
            background: saving ? "#9ca3af" : C.primary,
            color: "#ffffff",
            padding: "9px 16px",
            fontSize: 13,
            fontWeight: 700,
            fontFamily: FONT,
            cursor: saving ? "default" : "pointer",
            minWidth: 128,
          },
        },
        saving ? "Saving..." : "Create contract",
      ),
      ),
    ),
    ),
    React.createElement(
      Modal,
      {
        title: "Giải thích field hợp đồng",
        open: guideOpen,
        onCancel: () => setGuideOpen(false),
        footer: null,
        width: 980,
        destroyOnClose: false,
      },
      React.createElement(TutorialPanel, { contractType: form.contractType }),
    ),
  );
};

ctx.render(React.createElement(ContractCreateForm));
