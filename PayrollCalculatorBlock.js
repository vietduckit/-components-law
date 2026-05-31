const { React } = ctx;
const { useEffect, useMemo, useState } = React;
const {
  Button,
  Input,
  InputNumber,
  Select,
  Spin,
  Tag,
  message,
} = ctx.antd;

const FONT =
  "Inter, Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const PAYROLL_COLLECTIONS = ["payroll", "payrolls"];
const TEMPLATE_COLLECTION_NAME = "templateFile";
const DEFAULT_PAYROLL_ISSUER = {
  lawyerId: 20,
  email: "hoangtran@cbilaw.vn",
};
const PIT_PERSONAL_DEDUCTION = 11000000;
const INSURANCE_RATES = {
  social: 0.08,
  health: 0.015,
  unemployment: 0.01,
};

const C = {
  border: "#e8e8e8",
  softBorder: "#f0f0f0",
  text: "#262626",
  muted: "#8c8c8c",
  soft: "#fafafa",
  blue: "#096dd9",
  green: "#237804",
  red: "#cf1322",
};

const extractId = (val) => {
  if (val === null || val === undefined || val === "") return null;
  if (Array.isArray(val)) return val.length > 0 ? extractId(val[0]) : null;
  if (typeof val === "object") return val.id ? Number(val.id) : null;
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : null;
};

const num = (val) => {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  let raw = String(val).trim().replace(/\s/g, "");
  if (!raw) return 0;
  const commaIndex = raw.lastIndexOf(",");
  const dotIndex = raw.lastIndexOf(".");
  if (commaIndex >= 0 && dotIndex >= 0) {
    raw =
      commaIndex > dotIndex
        ? raw.replace(/\./g, "").replace(",", ".")
        : raw.replace(/,/g, "");
  } else if (commaIndex >= 0) {
    raw = raw.replace(",", ".");
  } else if (dotIndex >= 0) {
    const parts = raw.split(".");
    const looksGrouped =
      parts.length > 1 && parts.slice(1).every((part) => part.length === 3);
    if (looksGrouped) raw = parts.join("");
  }
  const parsed = Number(raw.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (val) => Math.round(num(val));

const moneyValue = (val) => Math.max(roundMoney(val), 0);

const formatMoneyInput = (val) => {
  const value = moneyValue(val);
  return value > 0 ? value.toLocaleString("vi-VN") : "";
};

const cleanMoneyInput = (val) => String(val || "").replace(/[^\d]/g, "");

const clamp = (val, min, max) => Math.min(Math.max(num(val), min), max);

const getTemplateId = (source) =>
  extractId(source?.templateFile) || extractId(source?.templateId);

const getInternalCompanyId = (source) =>
  extractId(source?.internalCompany) || extractId(source?.internalCompanyId);

const getStandardWorkDays = (dateValue) => {
  const sourceDate = dateValue ? new Date(dateValue) : new Date();
  const date = Number.isNaN(sourceDate.getTime()) ? new Date() : sourceDate;
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let workDays = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(year, month, day).getDay();
    if (weekday !== 0) workDays += 1;
  }
  return workDays;
};

const money = (val) =>
  `${roundMoney(val).toLocaleString("vi-VN", {
    maximumFractionDigits: 0,
  })} đ`;

const pct = (val) =>
  `${Number(val || 0).toLocaleString("vi-VN", {
    maximumFractionDigits: 2,
  })}%`;

const toDateTimeInput = (value) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(
    d.getHours(),
  )}:${p(d.getMinutes())}`;
};

const toISO = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

async function payrollRequest(urlSuffix, method = "GET", data, params) {
  let lastError = null;
  for (const collection of PAYROLL_COLLECTIONS) {
    try {
      return await ctx.api.request({
        url: `${collection}${urlSuffix}`,
        method,
        data,
        params,
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function fetchAll(url, fields) {
  try {
    const res = await ctx.api.request({
      url,
      params: { pageSize: 500, page: 1, fields },
    });
    return res?.data?.data || [];
  } catch {
    return [];
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

const calcPIT = (taxableIncome) => {
  let remaining = Math.max(roundMoney(taxableIncome), 0);
  const brackets = [
    [5000000, 0.05],
    [5000000, 0.1],
    [8000000, 0.15],
    [14000000, 0.2],
    [20000000, 0.25],
    [28000000, 0.3],
    [Infinity, 0.35],
  ];
  let tax = 0;
  for (const [limit, rate] of brackets) {
    if (remaining <= 0) break;
    const part = Math.min(remaining, limit);
    tax += part * rate;
    remaining -= part;
  }
  return roundMoney(tax);
};

const numberToWords = (value) => {
  const units = [
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
  const scales = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ"];
  const readTriple = (n, full) => {
    const hundred = Math.floor(n / 100);
    const ten = Math.floor((n % 100) / 10);
    const one = n % 10;
    const parts = [];
    if (hundred > 0 || full) {
      parts.push(`${units[hundred]} trăm`);
    }
    if (ten > 1) {
      parts.push(`${units[ten]} mươi`);
      if (one === 1) parts.push("mốt");
      else if (one === 5) parts.push("lăm");
      else if (one > 0) parts.push(units[one]);
    } else if (ten === 1) {
      parts.push("mười");
      if (one === 5) parts.push("lăm");
      else if (one > 0) parts.push(units[one]);
    } else if (one > 0) {
      if (hundred > 0 || full) parts.push("lẻ");
      parts.push(one === 5 && (hundred > 0 || full) ? "năm" : units[one]);
    }
    return parts.join(" ");
  };

  let amount = Math.max(roundMoney(value), 0);
  if (amount === 0) return "Không đồng";
  const chunks = [];
  while (amount > 0) {
    chunks.push(amount % 1000);
    amount = Math.floor(amount / 1000);
  }
  const words = [];
  for (let i = chunks.length - 1; i >= 0; i -= 1) {
    if (chunks[i] === 0) continue;
    words.push(readTriple(chunks[i], i < chunks.length - 1));
    if (scales[i]) words.push(scales[i]);
  }
  const sentence = words.join(" ").replace(/\s+/g, " ").trim();
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + " đồng";
};

const payrollTitlePeriod = (value) => {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return `${String(safeDate.getMonth() + 1).padStart(
    2,
    "0",
  )}/${safeDate.getFullYear()}`;
};

const buildPayrollTitle = (issueDate, recipientName = "") => {
  const suffix = recipientName ? ` - ${recipientName}` : "";
  return `Phiếu lương ${payrollTitlePeriod(issueDate)}${suffix}`;
};

const isAutoPayrollTitle = (title) =>
  !String(title || "").trim() ||
  /^Phiếu lương \d{2}\/\d{4}( - .*)?$/.test(String(title || "").trim());

const defaultTitle = (issueDate, recipientName = "") =>
  buildPayrollTitle(issueDate, recipientName);

const buildInitialForm = (record = {}) => {
  const issueDate = toDateTimeInput(record.issueDate);
  const standardWorkDays = getStandardWorkDays(issueDate);
  const actualWorkDays = num(record.actual_work_days) || standardWorkDays;
  const templateId = getTemplateId(record);
  return {
    title: record.title || defaultTitle(issueDate),
    issueDate,
    internalCompany: getInternalCompanyId(record),
    templateId,
    templateFile: templateId,
    issuer_lawyer_id:
      extractId(record.lawyers) || DEFAULT_PAYROLL_ISSUER.lawyerId,
    recipient_lawyer_id:
      extractId(record.received_payroll) || extractId(record.received_by_id),
    received_by_id: extractId(record.received_by_id),
    basic_salary: formatMoneyInput(record.basic_salary),
    insurance_salary_basis: formatMoneyInput(record.insurance_salary_basis),
    allowance_responsibility: formatMoneyInput(record.allowance_responsibility),
    allowance_lunch: formatMoneyInput(record.allowance_lunch),
    allowance_phone: formatMoneyInput(record.allowance_phone),
    allowance_transport: formatMoneyInput(record.allowance_transport),
    allowance_housing: formatMoneyInput(record.allowance_housing),
    allowance_childcare: formatMoneyInput(record.allowance_childcare),
    allowance: formatMoneyInput(record.allowance),
    standard_work_days: standardWorkDays,
    actual_work_days: clamp(actualWorkDays, 0, standardWorkDays),
    deduction_advance: formatMoneyInput(record.deduction_advance),
  };
};

const calculatePayroll = (form) => {
  const standardDays = num(form.standard_work_days) || 0;
  const actualDays = standardDays > 0 ? clamp(form.actual_work_days, 0, standardDays) : 0;
  const workRatio = standardDays > 0 ? actualDays / standardDays : 1;
  const basicSalary = num(form.basic_salary);
  const earnedBasicSalary = roundMoney(basicSalary * workRatio);
  const allowanceItems = [
    "allowance_responsibility",
    "allowance_lunch",
    "allowance_phone",
    "allowance_transport",
    "allowance_housing",
    "allowance_childcare",
    "allowance",
  ];
  const totalAllowance = roundMoney(
    allowanceItems.reduce((sum, field) => sum + num(form[field]), 0),
  );
  const totalIncome = roundMoney(earnedBasicSalary + totalAllowance);
  const insuranceBasis =
    num(form.insurance_salary_basis) > 0
      ? num(form.insurance_salary_basis)
      : basicSalary;
  const deductionSocial = roundMoney(insuranceBasis * INSURANCE_RATES.social);
  const deductionHealth = roundMoney(insuranceBasis * INSURANCE_RATES.health);
  const deductionUnemp = roundMoney(
    insuranceBasis * INSURANCE_RATES.unemployment,
  );
  const totalCompulsoryIns = roundMoney(
    deductionSocial + deductionHealth + deductionUnemp,
  );
  const taxableIncome = Math.max(
    totalIncome - totalCompulsoryIns - PIT_PERSONAL_DEDUCTION,
    0,
  );
  const deductionPit = calcPIT(taxableIncome);
  const deductionAdvance = roundMoney(form.deduction_advance);
  const totalDeductions = roundMoney(
    totalCompulsoryIns + deductionPit + deductionAdvance,
  );
  const netSalary = Math.max(roundMoney(totalIncome - totalDeductions), 0);

  return {
    workRatio,
    earnedBasicSalary,
    totalAllowance,
    totalIncome,
    insuranceBasis,
    deduction_social_ins: deductionSocial,
    deduction_health_ins: deductionHealth,
    deduction_unemp_ins: deductionUnemp,
    total_compulsory_ins: totalCompulsoryIns,
    taxableIncome,
    deduction_pit: deductionPit,
    deduction_advance: deductionAdvance,
    total_deductions: totalDeductions,
    net_salary: netSalary,
    netSalaryWords: numberToWords(netSalary),
  };
};

const fieldLabel = {
  basic_salary: "Lương chính",
  insurance_salary_basis: "Lương đóng BHBB",
  allowance_responsibility: "Phụ cấp trách nhiệm",
  allowance_lunch: "Phụ cấp ăn trưa",
  allowance_phone: "Phụ cấp điện thoại",
  allowance_transport: "Phụ cấp đi lại, xăng xe",
  allowance_housing: "Phụ cấp nhà ở",
  allowance_childcare: "Phụ cấp nuôi con nhỏ",
  allowance: "Phụ cấp khác", 
  deduction_advance: "Tạm ứng",
};

const PayrollCalculatorBlock = () => {
  const record = ctx.record || {};
  const recordId = extractId(record.id);
  const [form, setForm] = useState(() => buildInitialForm(record));
  const [lawyers, setLawyers] = useState([]);
  const [internalCompanies, setInternalCompanies] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      fetchAll(
        "internalCompany:list",
        "id,companyCode,name,shortName,address,legalName",
      ),
      fetchAll("lawyers:list", "id,lawyerName,userId,lawyerType,unitPrice"),
      fetchAll(
        `${TEMPLATE_COLLECTION_NAME}:list`,
        "id,templateName",
      ),
      getCurrentUser(),
    ]).then(([companyList, lawyerList, templateList, user]) => {
      if (!mounted) return;
      setInternalCompanies(companyList);
      setLawyers(lawyerList);
      setTemplates(templateList);
      setCurrentUser(user);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setForm(buildInitialForm(record));
  }, [recordId]);

  useEffect(() => {
    if (!lawyers.length || form.recipient_lawyer_id || !form.received_by_id) {
      return;
    }
    const recipient = lawyers.find(
      (lawyer) =>
        extractId(lawyer.id) === extractId(form.received_by_id) ||
        extractId(lawyer.userId) === extractId(form.received_by_id),
    );
    if (!recipient) return;
    setForm((prev) => ({
      ...prev,
      recipient_lawyer_id: extractId(recipient.id),
      title: isAutoPayrollTitle(prev.title)
        ? buildPayrollTitle(prev.issueDate, recipient.lawyerName)
        : prev.title,
    }));
  }, [lawyers, form.recipient_lawyer_id, form.received_by_id]);

  const calc = useMemo(() => calculatePayroll(form), [form]);
  const issuerLawyer =
    lawyers.find(
      (lawyer) => extractId(lawyer.id) === extractId(form.issuer_lawyer_id),
    ) ||
    lawyers.find(
      (lawyer) =>
        String(lawyer.email || "").toLowerCase() ===
        DEFAULT_PAYROLL_ISSUER.email,
    );
  const selectedRecipient = lawyers.find(
    (lawyer) => extractId(lawyer.id) === extractId(form.recipient_lawyer_id),
  );
  const selectedInternalCompanyId = getInternalCompanyId(form);
  const filteredTemplates = templates.filter((template) => {
    const templateCompanyId = getInternalCompanyId(template);
    return (
      !selectedInternalCompanyId ||
      !templateCompanyId ||
      templateCompanyId === selectedInternalCompanyId
    );
  });
  const selectedTemplateId = getTemplateId(form);
  const selectedTemplate = filteredTemplates.find(
    (template) => extractId(template.id) === selectedTemplateId,
  );

  const set = (field, value) =>
    setForm((prev) => {
      if (field === "issueDate") {
        const standardWorkDays = getStandardWorkDays(value);
        const actualWorkDays = num(prev.actual_work_days) || standardWorkDays;
        const recipient = lawyers.find(
          (lawyer) =>
            extractId(lawyer.id) === extractId(prev.recipient_lawyer_id),
        );
        return {
          ...prev,
          issueDate: value,
          title: isAutoPayrollTitle(prev.title)
            ? buildPayrollTitle(value, recipient?.lawyerName)
            : prev.title,
          standard_work_days: standardWorkDays,
          actual_work_days: clamp(actualWorkDays, 0, standardWorkDays),
        };
      }
      if (field === "actual_work_days") {
        return {
          ...prev,
          actual_work_days: clamp(value, 0, num(prev.standard_work_days)),
        };
      }
      return {
        ...prev,
        [field]: value,
      };
    });

  const moneyInput = (field, placeholder = "0") =>
    React.createElement(Input, {
      value: form[field] || "",
      onChange: (e) => set(field, cleanMoneyInput(e.target.value)),
      onBlur: (e) => set(field, formatMoneyInput(e.target.value)),
      inputMode: "numeric",
      placeholder,
      style: { width: "100%" },
    });

  const smallNumberInput = (field, step = 0.5, max = undefined, disabled = false) =>
    React.createElement(InputNumber, {
      value: form[field],
      onChange: (value) => set(field, value || 0),
      min: 0,
      max,
      step,
      disabled,
      style: { width: "100%" },
    });

  const formRow = (label, control, hint = null) =>
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "170px minmax(0, 1fr)",
          gap: 12,
          alignItems: "center",
          minHeight: 38,
        },
      },
      React.createElement(
        "div",
        {
          style: {
            color: C.muted,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: FONT,
          },
        },
        label,
      ),
      React.createElement(
        "div",
        null,
        control,
        hint &&
          React.createElement(
            "div",
            { style: { marginTop: 4, color: C.muted, fontSize: 11 } },
            hint,
          ),
      ),
    );

  const section = (title, children) =>
    React.createElement(
      "section",
      {
        style: {
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          background: "#fff",
          overflow: "hidden",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            padding: "10px 14px",
            borderBottom: `1px solid ${C.softBorder}`,
            background: C.soft,
            fontSize: 13,
            fontWeight: 700,
            color: C.text,
            fontFamily: FONT,
          },
        },
        title,
      ),
      React.createElement(
        "div",
        {
          style: {
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          },
        },
        children,
      ),
    );

  const calcLine = (label, value, tone = "default", extra = null) =>
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "7px 0",
          borderBottom: `1px solid ${C.softBorder}`,
          fontSize: 13,
        },
      },
      React.createElement(
        "span",
        { style: { color: C.muted, minWidth: 0 } },
        label,
        extra &&
          React.createElement(
            Tag,
            { style: { marginLeft: 6, fontSize: 11 }, color: "default" },
            extra,
          ),
      ),
      React.createElement(
        "strong",
        {
          style: {
            color: tone === "bad" ? C.red : tone === "good" ? C.green : C.text,
            whiteSpace: "nowrap",
          },
        },
        value,
      ),
    );

  const buildPayload = () => {
    const receivedLawyerId =
      extractId(selectedRecipient?.id) ||
      extractId(form.recipient_lawyer_id) ||
      extractId(form.received_by_id);
    const issuerLawyerId =
      extractId(issuerLawyer?.id) ||
      extractId(form.issuer_lawyer_id) ||
      DEFAULT_PAYROLL_ISSUER.lawyerId;
    const issuerUserId =
      extractId(issuerLawyer?.userId) || extractId(currentUser?.id);
    const standardWorkDays = getStandardWorkDays(form.issueDate);
    const actualWorkDays = clamp(form.actual_work_days, 0, standardWorkDays);
    const templateId = getTemplateId(form);
    const internalCompanyId = getInternalCompanyId(form);
    return {
      title:
        form.title ||
        buildPayrollTitle(form.issueDate, selectedRecipient?.lawyerName),
      internalCompany: internalCompanyId || null,
      templateId: templateId || null,
      templateFile: templateId || null,
      issueDate: toISO(form.issueDate),
      created_by_id: recordId
        ? extractId(record.created_by_id) || issuerUserId
        : issuerUserId,
      received_by_id: receivedLawyerId || null,
      received_payroll: receivedLawyerId || null,
      lawyers: issuerLawyerId,
      basic_salary: roundMoney(form.basic_salary),
      insurance_salary_basis: roundMoney(calc.insuranceBasis),
      allowance_responsibility: roundMoney(form.allowance_responsibility),
      allowance_lunch: roundMoney(form.allowance_lunch),
      allowance_phone: roundMoney(form.allowance_phone),
      allowance_transport: roundMoney(form.allowance_transport),
      allowance_housing: roundMoney(form.allowance_housing),
      allowance_childcare: roundMoney(form.allowance_childcare),
      allowance: roundMoney(form.allowance),
      standard_work_days: standardWorkDays,
      actual_work_days: actualWorkDays,
      total_income: calc.totalIncome,
      deduction_social_ins: calc.deduction_social_ins,
      deduction_health_ins: calc.deduction_health_ins,
      deduction_unemp_ins: calc.deduction_unemp_ins,
      total_compulsory_ins: calc.total_compulsory_ins,
      deduction_pit: calc.deduction_pit,
      deduction_advance: calc.deduction_advance,
      total_deductions: calc.total_deductions,
      net_salary: calc.net_salary,
    };
  };

  const savePayroll = async () => {
    if (!form.title?.trim()) {
      message.warning("Vui lòng nhập tiêu đề phiếu lương");
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (recordId) {
        await payrollRequest(`:update?filterByTk=${recordId}`, "POST", payload);
        message.success("Đã cập nhật phiếu lương");
      } else {
        await payrollRequest(":create", "POST", payload);
        message.success("Đã tạo phiếu lương");
      }
    } catch (error) {
      message.error(error?.message || "Không thể lưu phiếu lương");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return React.createElement(
      "div",
      { style: { padding: 40, textAlign: "center" } },
      React.createElement(Spin),
    );
  }

  return React.createElement(
    "div",
    {
      style: {
        fontFamily: FONT,
        color: C.text,
        background: "#fff",
        padding: 18,
        maxWidth: 1060,
        margin: "0 auto",
      },
    },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 16,
        },
      },
      React.createElement(
        "div",
        null,
        React.createElement(
          "div",
          { style: { fontSize: 18, fontWeight: 750, marginBottom: 4 } },
          form.title || "Phiếu lương",
        ),
        React.createElement(
          "div",
          { style: { fontSize: 12, color: C.muted } },
          selectedRecipient?.lawyerName || "Chưa chọn người nhận",
        ),
      ),
    ),

    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(340px, 0.9fr)",
          gap: 14,
          alignItems: "start",
        },
      },
      React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 14 } },
        section(
          "Thông tin phiếu lương",
          React.createElement(
            React.Fragment,
            null,
            formRow(
              "Tiêu đề",
              React.createElement(Input, {
                value: form.title,
                onChange: (e) => set("title", e.target.value),
                placeholder: "Phiếu lương tháng ...",
              }),
            ),
            formRow(
              "Công ty",
              React.createElement(Select, {
                value: selectedInternalCompanyId || undefined,
                placeholder: "Chọn công ty",
                allowClear: true,
                showSearch: true,
                optionFilterProp: "label",
                style: { width: "100%" },
                onChange: (id) =>
                  setForm((prev) => ({
                    ...prev,
                    internalCompany: extractId(id),
                    templateId: null,
                    templateFile: null,
                  })),
                options: internalCompanies.map((company) => ({
                  value: extractId(company.id),
                  label:
                    company.name ||
                    company.legalName ||
                    company.shortName ||
                    company.companyCode ||
                    `Company #${company.id}`,
                })),
              }),
            ),
            formRow(
              "Mẫu phiếu lương",
              React.createElement(Select, {
                value: selectedTemplateId || undefined,
                placeholder: "Chọn mẫu DOCX",
                allowClear: true,
                showSearch: true,
                optionFilterProp: "label",
                style: { width: "100%" },
                onChange: (id) =>
                  setForm((prev) => ({
                    ...prev,
                    templateId: extractId(id),
                    templateFile: extractId(id),
                  })),
                options: filteredTemplates.map((template) => ({
                  value: extractId(template.id),
                  label:
                    template.templateName ||
                    template.name ||
                    template.title ||
                    `Template #${template.id}`,
                })),
              }),
            ),
            formRow(
              "Ngày phát hành",
              React.createElement("input", {
                type: "datetime-local",
                value: form.issueDate,
                onChange: (e) => set("issueDate", e.target.value),
                style: {
                  width: "100%",
                  height: 32,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: "4px 10px",
                  boxSizing: "border-box",
                  fontFamily: FONT,
                },
              }),
            ),
            formRow(
              "Người lập phiếu",
              React.createElement(Input, {
                value:
                  issuerLawyer?.lawyerName ||
                  `${DEFAULT_PAYROLL_ISSUER.email} (#${DEFAULT_PAYROLL_ISSUER.lawyerId})`,
                disabled: true,
              }),
            ),
            formRow(
              "Người nhận",
              React.createElement(Select, {
                value: form.recipient_lawyer_id || undefined,
                placeholder: "Chọn luật sư / nhân sự",
                allowClear: true,
                showSearch: true,
                optionFilterProp: "label",
                style: { width: "100%" },
                onChange: (id) => {
                  const lawyer = lawyers.find(
                    (item) => extractId(item.id) === extractId(id),
                  );
                  setForm((prev) => ({
                    ...prev,
                    recipient_lawyer_id: extractId(id),
                    received_by_id: extractId(id),
                    title: isAutoPayrollTitle(prev.title)
                      ? buildPayrollTitle(prev.issueDate, lawyer?.lawyerName)
                      : prev.title,
                  }));
                },
                options: lawyers.map((lawyer) => ({
                  value: extractId(lawyer.id),
                  label: lawyer.lawyerName || `#${lawyer.id}`,
                })),
              }),
              selectedRecipient?.unitPrice
                ? `Đơn giá tham khảo: ${money(selectedRecipient.unitPrice)} / giờ`
                : null,
            ),
            formRow(
              "Ngày công chuẩn",
              smallNumberInput("standard_work_days", 1, undefined, true),
              "Tự tính theo tháng phát hành, không tính Chủ nhật.",
            ),
            formRow(
              "Ngày công đi làm",
              smallNumberInput(
                "actual_work_days",
                0.5,
                num(form.standard_work_days),
              ),
              `Tỷ lệ tính lương: ${pct(calc.workRatio * 100)}`,
            ),
          ),
        ),
        section(
          "Thu nhập",
          React.createElement(
            React.Fragment,
            null,
            formRow(fieldLabel.basic_salary, moneyInput("basic_salary")),
            calcLine(
              "Lương chính theo ngày công",
              money(calc.earnedBasicSalary),
              "blue",
              pct(calc.workRatio * 100),
            ),
            formRow(
              fieldLabel.allowance_responsibility,
              moneyInput("allowance_responsibility"),
            ),
            formRow(fieldLabel.allowance_lunch, moneyInput("allowance_lunch")),
            formRow(fieldLabel.allowance_phone, moneyInput("allowance_phone")),
            formRow(
              fieldLabel.allowance_transport,
              moneyInput("allowance_transport"),
            ),
            formRow(fieldLabel.allowance_housing, moneyInput("allowance_housing")),
            formRow(
              fieldLabel.allowance_childcare,
              moneyInput("allowance_childcare"),
            ),
            formRow(fieldLabel.allowance, moneyInput("allowance")),
          ),
        ),
      ),
      React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 14 } },
        section(
          "Khấu trừ",
          React.createElement(
            React.Fragment,
            null,
            formRow(
              fieldLabel.insurance_salary_basis,
              moneyInput("insurance_salary_basis"),
              "Bỏ trống sẽ lấy theo lương chính.",
            ),
            calcLine(
              "Bảo hiểm xã hội",
              money(calc.deduction_social_ins),
              "bad",
              "8%",
            ),
            calcLine(
              "Bảo hiểm y tế",
              money(calc.deduction_health_ins),
              "bad",
              "1,5%",
            ),
            calcLine(
              "Bảo hiểm thất nghiệp",
              money(calc.deduction_unemp_ins),
              "bad",
              "1%",
            ),
            calcLine("Tổng BHBB", money(calc.total_compulsory_ins), "bad"),
            calcLine(
              "Thu nhập tính thuế",
              money(calc.taxableIncome),
              "default",
              "-11 triệu",
            ),
            calcLine("Thuế TNCN", money(calc.deduction_pit), "bad"),
            formRow(fieldLabel.deduction_advance, moneyInput("deduction_advance")),
          ),
        ),
        section(
          "Kết quả",
          React.createElement(
            React.Fragment,
            null,
            calcLine("Tổng phụ cấp", money(calc.totalAllowance), "good"),
            calcLine("Tổng thu nhập", money(calc.totalIncome), "good"),
            calcLine("Tổng khấu trừ", money(calc.total_deductions), "bad"),
            calcLine("Thực nhận", money(calc.net_salary), "good"),
            React.createElement(
              "div",
              {
                style: {
                  marginTop: 8,
                  padding: 12,
                  borderRadius: 8,
                  background: "#f6ffed",
                  border: "1px solid #b7eb8f",
                  color: C.green,
                  fontSize: 13,
                  lineHeight: 1.6,
                },
              },
              React.createElement(
                "div",
                { style: { fontWeight: 700, marginBottom: 4 } },
                "Bằng chữ",
              ),
              calc.netSalaryWords,
            ),
          ),
        ),
      ),
    ),
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 14,
          paddingTop: 14,
        },
      },
      React.createElement(
        Button,
        { onClick: () => setForm(buildInitialForm(record)) },
        "Làm lại",
      ),
      React.createElement(
        Button,
        { type: "primary", loading: saving, onClick: savePayroll },
        recordId ? "Cập nhật" : "Lưu phiếu lương",
      ),
    ),
  );
};

ctx.render(React.createElement(PayrollCalculatorBlock));
