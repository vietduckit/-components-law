const { React } = ctx;
const { useState, useEffect, useCallback } = React;
const { Spin, message, Modal } = ctx.antd;

// ==================== CONFIGURATION ====================
const TEMPLATE_COLLECTION_NAME = "template";
const TEMPLATE_FILE_FIELD = "fileAttachment";
const SERVICE_TASK_RELATION = "templateId";
const TASK_NAME_FIELD = "templateName";
// ==========================================================

const RECORD_ID = ctx.record?.id;

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

// ==================== MAIN COMPONENT ====================
const ContractDocxGenerator = () => {
  const [data, setData] = useState(null);
  const [services, setServices] = useState([]);
  const [svcDetails, setSvcDetails] = useState({});
  const [loading, setLoading] = useState(true);

  // Track separate loading states
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Preview States
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [previewAttId, setPreviewAttId] = useState(null);

  // 1. Load Data
  const loadData = useCallback(async () => {
    if (!RECORD_ID) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const contractData = await fetchContract(RECORD_ID);
      setData(contractData);

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

    const mappedServices = services.map((s, index) => {
      const detail = svcDetails[s.serviceId] || {};
      const name = detail.serviceName || `Service #${s.serviceId}`;
      const qty = Number(s.quantity) || 1;
      const price = Number(s.basePrice) || 0;
      const vatPct = Number(s.vat) || 0;
      const sLine = price * qty;
      const vLine = (sLine * vatPct) / 100;

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
            }))
          : [{ task_name: "(No specific tasks configured)" }];

      subTotalAmount += sLine;
      vatAmount += vLine;
      totalAmount += sLine + vLine;

      return {
        service_stt: index + 1,
        service_name: name,
        task_list: tasksText, // Biến cũ (string)
        tasks: mappedTasks, // Biến mới (array)
        sub_total: sLine.toLocaleString("en-US"),
        service_vat: vLine.toLocaleString("en-US"),
      };
    });

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
      
      console.log("Debug: Fresh Contract targetCustomer for Title:", targetCustomer);

      const customerShortName =
        targetCustomer?.shortName ||
        targetCustomer?.customerName ||
        targetCustomer?.companyLegalName ||
        "Customer";
      const documentTitle = `${sttPart} / ${docTypePart} / ${internalCo} - ${customerShortName}`;
      const nextFileIndex = await getNextFileIndex(targetFolderId, "Contract", RECORD_ID);

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
          note: `Auto-generated from Template by ${currentUser?.nickname || currentUser?.username || "System"} at ${new Date().toLocaleTimeString("en-GB")} on ${new Date().toLocaleDateString("en-GB")}`,
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

  // ── Render UI ──
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
    React.createElement(
      "div",
      {
        style: {
          padding: "16px",
          display: "flex",
          gap: "10px",
          alignItems: "center",
          justifyContent: "flex-end",
          flexWrap: "wrap",
        },
      },
      React.createElement(
        "button",
        {
          onClick: handlePreview,
          disabled: generating || saving,
          style: btnPreview,
        },
        generating ? "⏳ Generating..." : "👁️ Preview Contract",
      ),
      React.createElement(
        "button",
        {
          onClick: handleSaveDoc,
          disabled: generating || saving,
          style: btnSave,
        },
        saving ? "⏳ Saving..." : "💾 Save to Documents",
      ),
      React.createElement(
        "button",
        {
          onClick: loadData,
          disabled: generating || saving,
          style: btnStyle,
        },
        "🔄 Refresh",
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
            "⬇️ Download DOCX",
          ),
          React.createElement(
            "button",
            {
              key: "save",
              onClick: handleSaveDoc,
              disabled: saving,
              style: btnSave,
            },
            saving ? "⏳ Saving..." : "💾 Save to System",
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
  );
};

ctx.render(React.createElement(ContractDocxGenerator));
