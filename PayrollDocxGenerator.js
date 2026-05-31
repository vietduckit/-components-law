const { React } = ctx;
const { useCallback, useEffect, useMemo, useState } = React;
const { Button, Modal, Spin, message } = ctx.antd;

const PAYROLL_COLLECTIONS = ["payroll", "payrolls"];
const TEMPLATE_COLLECTIONS = ["templateFile", "template"];
const TEMPLATE_FILE_FIELD = "fileAttachment";
const PAYROLL_FILE_FIELD = "fileAttachment";

const TEMPLATE_VARIABLES = [
  "name",
  "address",
  "addfress",
  "issueDate",
  "employeeCode",
  "lawyerName",
  "lawyerType",
  "insurance_salary_basis",
  "actual_work_days",
  "standard_work_days",
  "basic_salary",
  "allowance",
  "allowance_responsibility",
  "allowance_lunch",
  "allowance_phone",
  "allowance_transport",
  "allowance_housing",
  "allowance_childcare",
  "deduction_social_ins",
  "deduction_health_ins",
  "deduction_unemp_ins",
  "deduction_pit",
  "deduction_advance",
  "total_income",
  "total_deductions",
  "net_salary",
  "net_salary_in_words",
  "created_by_id",
  "received_by_id",
];

const RECORD_ID = ctx.record?.id || ctx.filterByTk || ctx.params?.filterByTk;

const first = (value) => (Array.isArray(value) ? value[0] : value);

const extractId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.length ? extractId(value[0]) : null;
  if (typeof value === "object") return extractId(value.id);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const num = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let raw = String(value).trim().replace(/\s/g, "");
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
    if (parts.length > 1 && parts.slice(1).every((part) => part.length === 3)) {
      raw = parts.join("");
    }
  }
  const parsed = Number(raw.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasValue = (value) =>
  value !== null && value !== undefined && value !== "";

const roundMoney = (value) => Math.round(num(value));

const formatMoney = (value) =>
  roundMoney(value).toLocaleString("vi-VN", {
    maximumFractionDigits: 0,
  });

const formatNumber = (value) =>
  num(value).toLocaleString("vi-VN", {
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("vi-VN");
};

const formatIssueDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `Ngày ${date.getDate()} Tháng ${
    date.getMonth() + 1
  } Năm ${date.getFullYear()}`;
};

const cleanFileName = (value) =>
  String(value || "")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();

const displayName = (value) => {
  const item = first(value);
  if (!item) return "";
  if (typeof item !== "object") return String(item);
  return (
    item.lawyerName ||
    item.fullName ||
    item.nickname ||
    item.username ||
    item.name ||
    item.title ||
    item.email ||
    (item.id ? `#${item.id}` : "")
  );
};

const companyName = (company) => {
  const item = first(company);
  if (!item || typeof item !== "object") return "";
  return item.name || item.legalName || item.shortName || item.companyCode || "";
};

const companyAddress = (company) => {
  const item = first(company);
  if (!item || typeof item !== "object") return "";
  return item.address || item.office || "";
};

const employeeCode = (lawyer) => {
  const item = first(lawyer);
  if (!item || typeof item !== "object") return "";
  return (
    item.employeeCode ||
    item.lawyerCode ||
    item.code ||
    item.staffCode ||
    item.id ||
    ""
  );
};

const lawyerType = (lawyer) => {
  const item = first(lawyer);
  if (!item || typeof item !== "object") return "";
  const type = item.lawyerType || item.position || item.title || item.role || "";
  return typeof type === "object" ? displayName(type) : String(type || "");
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
    if (hundred > 0 || full) parts.push(`${units[hundred]} trăm`);
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

async function payrollRequest(action, options = {}) {
  let lastError = null;
  for (const collection of PAYROLL_COLLECTIONS) {
    try {
      const res = await ctx.api.request({
        url: `${collection}${action}`,
        ...options,
      });
      return { res, collection };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function fetchPayroll(id) {
  const { res, collection } = await payrollRequest(":get", {
    method: "GET",
    params: {
      filterByTk: id,
      appends: [
        "internalCompany",
        "lawyers",
        "received_payroll",
        "templateFile",
        PAYROLL_FILE_FIELD,
      ],
    },
  });
  const data = res?.data?.data || res?.data || null;
  const appendedCompany = first(data?.internalCompany);
  const companyId =
    extractId(appendedCompany) ||
    extractId(data?.internalCompany) ||
    extractId(data?.internalCompanyId) ||
    extractId(data?.internal_company_id);
  if (data && companyId) {
    const company = await fetchInternalCompany(companyId);
    if (company) {
      data.internalCompany =
        appendedCompany && typeof appendedCompany === "object"
          ? { ...appendedCompany, ...company }
          : company;
    }
  }
  return { data, collection };
}

async function fetchTemplate(templateId) {
  let lastError = null;
  for (const collection of TEMPLATE_COLLECTIONS) {
    try {
      const res = await ctx.api.request({
        url: `${collection}:get`,
        method: "GET",
        params: {
          filterByTk: templateId,
          appends: [TEMPLATE_FILE_FIELD],
        },
      });
      const data = res?.data?.data || res?.data || null;
      if (data) return { data, collection };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Không tìm thấy template.");
}

async function fetchInternalCompany(companyId) {
  if (!companyId) return null;
  try {
    const res = await ctx.api.request({
      url: "internalCompany:get",
      method: "GET",
      params: {
        filterByTk: companyId,
        fields:
          "id,companyCode,name,shortName,email,phone,taxCode,address,legalName,businessLicense,brandColor,city,website,signatureTitle,signatureName,proposalPrefix,office",
      },
    });
    return res?.data?.data || res?.data || null;
  } catch (error) {
    console.warn("Không thể lấy internalCompany:", error);
    return null;
  }
}

async function uploadAttachment(blob, fileName, collection) {
  const formData = new window.FormData();
  formData.append("file", blob, fileName);
  const res = await ctx.api.request({
    url: "attachments:create",
    method: "POST",
    params: collection
      ? { attachmentField: `${collection}.${PAYROLL_FILE_FIELD}` }
      : undefined,
    data: formData,
    headers: { "Content-Type": "multipart/form-data" },
  });
  const attachment = res?.data?.data;
  if (!attachment?.id) throw new Error("Upload file không thành công.");
  return attachment;
}

const attachmentList = (value) => {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  return items.filter((item) => extractId(item));
};

const calcPayroll = (data) => {
  const standardDays = num(data.standard_work_days);
  const actualDays = standardDays
    ? Math.min(num(data.actual_work_days), standardDays)
    : num(data.actual_work_days);
  const workRatio = standardDays > 0 ? actualDays / standardDays : 1;
  const basicSalary = roundMoney(data.basic_salary);
  const earnedBasicSalary = roundMoney(basicSalary * workRatio);
  const allowanceResponsibility = roundMoney(data.allowance_responsibility);
  const allowanceLunch = roundMoney(data.allowance_lunch);
  const allowancePhone = roundMoney(data.allowance_phone);
  const allowanceTransport = roundMoney(data.allowance_transport);
  const allowanceHousing = roundMoney(data.allowance_housing);
  const allowanceChildcare = roundMoney(data.allowance_childcare);
  const allowanceOther = roundMoney(data.allowance);
  const totalAllowance = roundMoney(
    allowanceResponsibility +
      allowanceLunch +
      allowancePhone +
      allowanceTransport +
      allowanceHousing +
      allowanceChildcare +
      allowanceOther,
  );
  const insuranceBasis = hasValue(data.insurance_salary_basis)
    ? roundMoney(data.insurance_salary_basis)
    : basicSalary;
  const socialIns = hasValue(data.deduction_social_ins)
    ? roundMoney(data.deduction_social_ins)
    : roundMoney(insuranceBasis * 0.08);
  const healthIns = hasValue(data.deduction_health_ins)
    ? roundMoney(data.deduction_health_ins)
    : roundMoney(insuranceBasis * 0.015);
  const unempIns = hasValue(data.deduction_unemp_ins)
    ? roundMoney(data.deduction_unemp_ins)
    : roundMoney(insuranceBasis * 0.01);
  const totalIncome = hasValue(data.total_income)
    ? roundMoney(data.total_income)
    : roundMoney(earnedBasicSalary + totalAllowance);
  const pit = roundMoney(data.deduction_pit);
  const advance = roundMoney(data.deduction_advance);
  const totalDeductions = hasValue(data.total_deductions)
    ? roundMoney(data.total_deductions)
    : roundMoney(socialIns + healthIns + unempIns + pit + advance);
  const netSalary = hasValue(data.net_salary)
    ? roundMoney(data.net_salary)
    : Math.max(roundMoney(totalIncome - totalDeductions), 0);

  return {
    actualDays,
    standardDays,
    basicSalary,
    earnedBasicSalary,
    allowanceResponsibility,
    allowanceLunch,
    allowancePhone,
    allowanceTransport,
    allowanceHousing,
    allowanceChildcare,
    allowanceOther,
    totalAllowance,
    insuranceBasis,
    socialIns,
    healthIns,
    unempIns,
    pit,
    advance,
    totalIncome,
    totalDeductions,
    netSalary,
  };
};

const buildTemplateData = (data) => {
  const issuer = first(data.lawyers);
  const recipient = first(data.received_payroll);
  const company = first(data.internalCompany);
  const calc = calcPayroll(data);
  const issueDate = formatIssueDate(data.issueDate);
  const rawIssueDate = data.issueDate ? new Date(data.issueDate) : null;
  const hasValidIssueDate = rawIssueDate && !Number.isNaN(rawIssueDate.getTime());
  const address = companyAddress(company);

  return {
    name: companyName(company),
    address,
    addfress: address,
    issueDate,
    issue_date: issueDate,
    issue_date_short: formatDate(data.issueDate),
    issue_day: hasValidIssueDate ? String(rawIssueDate.getDate()) : "",
    issue_month: hasValidIssueDate ? String(rawIssueDate.getMonth() + 1) : "",
    issue_year: hasValidIssueDate ? String(rawIssueDate.getFullYear()) : "",
    title: data.title || "",
    payroll_id: data.id || "",
    employeeCode: employeeCode(recipient),
    lawyerName: displayName(recipient),
    lawyerType: lawyerType(recipient),
    insurance_salary_basis: formatMoney(calc.insuranceBasis),
    actual_work_days: formatNumber(calc.actualDays),
    standard_work_days: formatNumber(calc.standardDays),
    basic_salary: formatMoney(calc.basicSalary),
    earned_basic_salary: formatMoney(calc.earnedBasicSalary),
    allowance: formatMoney(calc.totalAllowance),
    allowance_other: formatMoney(calc.allowanceOther),
    allowance_responsibility: formatMoney(calc.allowanceResponsibility),
    allowance_lunch: formatMoney(calc.allowanceLunch),
    allowance_phone: formatMoney(calc.allowancePhone),
    allowance_transport: formatMoney(calc.allowanceTransport),
    allowance_housing: formatMoney(calc.allowanceHousing),
    allowance_childcare: formatMoney(calc.allowanceChildcare),
    deduction_social_ins: formatMoney(calc.socialIns),
    deduction_health_ins: formatMoney(calc.healthIns),
    deduction_unemp_ins: formatMoney(calc.unempIns),
    deduction_pit: formatMoney(calc.pit),
    deduction_advance: formatMoney(calc.advance),
    total_income: formatMoney(calc.totalIncome),
    total_deductions: formatMoney(calc.totalDeductions),
    net_salary: formatMoney(calc.netSalary),
    net_salary_in_words: numberToWords(calc.netSalary),
    created_by_id:
      displayName(issuer) ||
      displayName(data.createdBy) ||
      String(data.created_by_id || ""),
    received_by_id:
      displayName(recipient) ||
      displayName(data.receivedBy) ||
      String(data.received_by_id || ""),
  };
};

const PayrollDocxGenerator = () => {
  const [data, setData] = useState(null);
  const [collection, setCollection] = useState(PAYROLL_COLLECTIONS[0]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [previewAttId, setPreviewAttId] = useState(null);

  const templateId = useMemo(
    () => extractId(data?.templateId) || extractId(data?.templateFile),
    [data],
  );
  const templateData = useMemo(
    () => (data ? buildTemplateData(data) : {}),
    [data],
  );

  const loadData = useCallback(async () => {
    if (!RECORD_ID) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await fetchPayroll(RECORD_ID);
      setData(result.data);
      setCollection(result.collection);
    } catch (error) {
      console.error(error);
      message.error("Không thể tải dữ liệu phiếu lương.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showErrorModal = (error) => {
    console.error("Payroll DOCX generation error:", error);
    const rawMessage =
      error?.properties?.errors
        ?.map((item) => item?.properties?.explanation || item?.message)
        .filter(Boolean)
        .join("\n\n") ||
      error?.message ||
      "Không thể generate file phiếu lương.";
    Modal.error({
      title: "Lỗi generate phiếu lương",
      width: 720,
      content: React.createElement(
        "pre",
        {
          style: {
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: 420,
            overflow: "auto",
            margin: 0,
            fontSize: 12,
          },
        },
        rawMessage,
      ),
    });
  };

  const buildDocxBlob = async () => {
    if (!data) throw new Error("Không có dữ liệu phiếu lương.");
    if (!templateId) {
      throw new Error(
        "Phiếu lương chưa có templateId/templateFile. Hãy chọn mẫu trước.",
      );
    }

    const templateResult = await fetchTemplate(templateId);
    const template = templateResult?.data;
    if (!template) throw new Error("Không tìm thấy template được chọn.");

    const attachmentObj = template[TEMPLATE_FILE_FIELD];
    const templateAttachment = Array.isArray(attachmentObj)
      ? attachmentObj[0]
      : attachmentObj;
    const templateUrl = templateAttachment?.url;
    if (!templateUrl) {
      throw new Error(
        `Template #${templateId} (${templateResult.collection}) chưa có fileAttachment để bơm dữ liệu.`,
      );
    }

    const PizZipModule = await ctx.importAsync("https://esm.sh/pizzip@3.1.4");
    const PizZip = PizZipModule.default || PizZipModule;
    const DocxModule = await ctx.importAsync(
      "https://esm.sh/docxtemplater@3.37.11",
    );
    const Docxtemplater = DocxModule.default || DocxModule;

    const fileRes = await ctx.api.request({
      url: templateUrl,
      method: "GET",
      responseType: "arraybuffer",
      baseURL: "/",
    });

    const zip = new PizZip(fileRes.data);
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
    const fileName = cleanFileName(
      `PhieuLuong_${templateData.lawyerName || "employee"}.docx`,
    );

    return { generatedBlob, fileName };
  };

  const handlePreview = async () => {
    setGenerating(true);
    try {
      const { generatedBlob, fileName } = await buildDocxBlob();
      const attachment = await uploadAttachment(generatedBlob, fileName);
      const publicUrl = attachment.url?.startsWith("/")
        ? window.location.origin + attachment.url
        : attachment.url;
      if (!publicUrl) throw new Error("Không lấy được URL file preview.");

      setPreviewBlob(generatedBlob);
      setPreviewUrl(publicUrl);
      setPreviewFileName(fileName);
      setPreviewAttId(attachment.id);
    } catch (error) {
      showErrorModal(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveFile = async () => {
    setSaving(true);
    try {
      let attId = previewAttId;
      if (!attId) {
        const { generatedBlob, fileName } = await buildDocxBlob();
        const attachment = await uploadAttachment(generatedBlob, fileName, collection);
        attId = attachment.id;
      }

      const currentAttachments = attachmentList(data?.[PAYROLL_FILE_FIELD]);
      const nextAttachments = [
        ...currentAttachments
          .filter((item) => extractId(item) !== extractId(attId))
          .map((item) => ({ id: extractId(item) })),
        { id: extractId(attId) },
      ];

      await payrollRequest(":update", {
        method: "POST",
        params: { filterByTk: RECORD_ID },
        data: {
          [PAYROLL_FILE_FIELD]: nextAttachments,
          updatedAt: new Date().toISOString(),
        },
      });

      message.success("Đã generate và lưu file vào phiếu lương.");
      setPreviewUrl(null);
      setPreviewBlob(null);
      setPreviewAttId(null);
      await loadData();
    } catch (error) {
      showErrorModal(error);
    } finally {
      setSaving(false);
    }
  };

  const resetPreview = () => {
    setPreviewUrl(null);
    setPreviewBlob(null);
    setPreviewFileName("");
    setPreviewAttId(null);
  };

  const downloadBlob = (blob, fileName) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName || `Payroll_${RECORD_ID}.docx`;
    link.style.display = "none";
    link.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const downloadPreviewFile = async () => {
    try {
      if (previewBlob) {
        downloadBlob(previewBlob, previewFileName);
        return;
      }
      setGenerating(true);
      const { generatedBlob, fileName } = await buildDocxBlob();
      setPreviewBlob(generatedBlob);
      setPreviewFileName(fileName);
      downloadBlob(generatedBlob, fileName);
    } catch (error) {
      showErrorModal(error);
    } finally {
      setGenerating(false);
    }
  };

  if (!RECORD_ID) {
    return React.createElement(
      "div",
      { style: { padding: 16 } },
      "Không tìm thấy ID phiếu lương.",
    );
  }

  if (loading) {
    return React.createElement(
      "div",
      { style: { padding: 24, textAlign: "center" } },
      React.createElement(Spin),
    );
  }

  if (!data) {
    return React.createElement(
      "div",
      { style: { padding: 16 } },
      "Không tải được dữ liệu phiếu lương.",
    );
  }

  const actionDisabled = generating || saving;
  const buttonStyle = {
    minWidth: 130,
    height: 36,
    borderRadius: 6,
    fontWeight: 600,
  };

  return React.createElement(
    "div",
    {
      style: {
        padding: 16,
        background: "#fff",
        border: "1px solid #e8e8e8",
        borderRadius: 8,
      },
    },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 12,
        },
      },
      React.createElement(
        "div",
        { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
        React.createElement(
          Button,
          {
            onClick: handlePreview,
            disabled: actionDisabled || !templateId,
            loading: generating,
            style: buttonStyle,
          },
          "Xem trước",
        ),
        React.createElement(
          Button,
          {
            type: "primary",
            onClick: handleSaveFile,
            disabled: actionDisabled || !templateId,
            loading: saving,
            style: buttonStyle,
          },
          "Lưu file",
        ),
      ),
    ),
    React.createElement(
      Modal,
      {
        title: "Xem trước phiếu lương",
        open: !!previewUrl,
        onCancel: resetPreview,
        width: "85%",
        centered: true,
        footer: [
          React.createElement(
            Button,
            { key: "close", onClick: resetPreview },
            "Đóng",
          ),
          React.createElement(
            Button,
            {
              key: "download",
              onClick: downloadPreviewFile,
              disabled: !previewBlob && !previewUrl,
            },
            "Tải file",
          ),
          React.createElement(
            Button,
            {
              key: "save",
              type: "primary",
              loading: saving,
              onClick: handleSaveFile,
            },
            "Lưu vào phiếu lương",
          ),
        ],
        bodyStyle: { padding: 0, height: "70vh" },
      },
      previewUrl
        ? React.createElement("iframe", {
            src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
              previewUrl,
            )}`,
            width: "100%",
            height: "100%",
            frameBorder: "0",
          })
        : null,
    ),
  );
};

ctx.render(React.createElement(PayrollDocxGenerator));
