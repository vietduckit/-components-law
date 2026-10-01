// ---- ui language (pure; tested by scripts/tests/i18n-blocks.test.js) ----
// Labels follow the language NocoBase's UI runs in (ctx.i18n.language: the
// user's appLang, else the system default; changing it reloads the page):
// Vietnamese for "vi-*", English otherwise. The English text is the key, so a
// label missing from VI shows in English; {name} placeholders are filled from
// vars. Stored data is not translated. Tool: scripts/i18n/ui-strings.js.
const pickLang = (locale) => (/^vi\b/i.test(String(locale || "").trim()) ? "vi" : "en");
const makeTr = (lang, dict) => (text, vars) => {
  const template = (lang === "vi" && dict[text]) || text;
  return vars
    ? template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match))
    : template;
};
const VI = {
  "Case": "Vụ việc",
  "Case code": "Số vụ việc",
  "Case name": "Tên vụ việc",
  "Case opening date": "Ngày mở vụ việc",
  "Case deadline": "Hạn vụ việc",
  "Customer": "Khách hàng",
  "Customer full name": "Tên đầy đủ khách hàng",
  "Customer short name": "Tên ngắn khách hàng",
  "Address": "Địa chỉ",
  "Phone number": "Số điện thoại",
  "Tax code": "Mã số thuế",
  "ID card number": "Số CCCD/CMND",
  "ID card issue date": "Ngày cấp CCCD/CMND",
  "ID card issue place": "Nơi cấp CCCD/CMND",
  "Legal representative": "Người đại diện pháp luật",
  "Quotation": "Báo giá",
  "Quotation number": "Số báo giá",
  "Quotation status": "Trạng thái báo giá",
  "Quotation description": "Mô tả báo giá",
  "Subtotal (before VAT)": "Tổng trước VAT",
  "VAT amount": "Tổng VAT",
  "Total (after VAT)": "Tổng sau VAT",
  "VAT applied": "Có tính VAT",
  "Contract": "Hợp đồng",
  "Contract number": "Số hợp đồng",
  "Contract language": "Ngôn ngữ hợp đồng",
  "Contract status": "Trạng thái hợp đồng",
  "Contract effective date": "Ngày hiệu lực hợp đồng",
  "Invoice": "Hoá đơn",
  "Invoice number": "Số hoá đơn",
  "Invoice issue date": "Ngày phát hành hoá đơn",
  "Invoice due date": "Hạn thanh toán hoá đơn",
  "Invoice total": "Tổng tiền hoá đơn",
  "Paid": "Đã thanh toán",
  "Outstanding balance": "Còn lại phải thu",
  "Invoice status": "Trạng thái hoá đơn",
  "Payment": "Thanh toán",
  "Payment number": "Số phiếu thanh toán",
  "Payment date": "Ngày thanh toán",
  "Amount paid": "Số tiền đã thanh toán",
  "Payment method": "Hình thức thanh toán",
  "Payment status": "Trạng thái thanh toán",
  "Task": "Công việc",
  "Task name": "Tên công việc",
  "Start date": "Ngày bắt đầu",
  "Task due date": "Hạn công việc",
  "Progress details": "Nội dung diễn biến",
  "User": "Người dùng",
  "Lawyer name (nickname)": "Tên luật sư (nickname)",
  "Username": "Tên đăng nhập",
  "Date": "Ngày tháng",
  "Today's date": "Ngày hiện tại",
  "Day (dd)": "Ngày (dd)",
  "Month (mm)": "Tháng (mm)",
  "Year (yyyy)": "Năm (yyyy)",
  "No variables yet": "Chưa có biến nào",
  "Variable name (e.g. customer_name)": "Tên biến (VD: customer_name)",
  "System": "Hệ thống",
  "Manual": "Nhập tay",
  "Select a system field": "Chọn field hệ thống",
  "Label shown for manual input (e.g. Court name)": "Nhãn hiển thị khi nhập tay (VD: Tên tòa án)",
  "Delete": "Xoá",
  "+ Add variable": "+ Thêm biến",
};
// ---- end ui language ----
const tr = makeTr(pickLang(ctx.i18n?.language || ctx.auth?.locale), VI);

const { React } = ctx;
const { useState } = React;
const { Input, Select, Button, Space, Empty } = ctx.antd;

// Grouped list of system fields a variable can be mapped to. Duplicated verbatim in
// All Module/Task/TaskDetailView.js (see
// docs/superpowers/plans/2026-08-18-task-template-variable-config.md Task 4) — this repo's
// single-file constraint means JsField blocks and page blocks can't import a shared module, so
// both copies must be kept in sync by hand if this catalog changes.
const VARIABLE_CATALOG = {
  case: {
    label: tr("Case"),
    fields: [
      { key: "case.caseCode", label: tr("Case code"), format: "text" },
      { key: "case.projectName", label: tr("Case name"), format: "text" },
      { key: "case.date", label: tr("Case opening date"), format: "date" },
      { key: "case.deadline", label: tr("Case deadline"), format: "date" },
    ],
  },
  customer: {
    label: tr("Customer"),
    fields: [
      { key: "customer.fullName", label: tr("Customer full name"), format: "text" },
      { key: "customer.shortName", label: tr("Customer short name"), format: "text" },
      { key: "customer.address", label: tr("Address"), format: "text" },
      { key: "customer.phone", label: tr("Phone number"), format: "text" },
      { key: "customer.taxCode", label: tr("Tax code"), format: "text" },
      { key: "customer.identityNumber", label: tr("ID card number"), format: "text" },
      { key: "customer.identityIssuedDate", label: tr("ID card issue date"), format: "date" },
      { key: "customer.identityIssuedPlace", label: tr("ID card issue place"), format: "text" },
      { key: "customer.corporateRepresentative", label: tr("Legal representative"), format: "text" },
    ],
  },
  quotation: {
    label: tr("Quotation"),
    fields: [
      { key: "quotation.quotationNumber", label: tr("Quotation number"), format: "text" },
      { key: "quotation.status", label: tr("Quotation status"), format: "text" },
      { key: "quotation.description", label: tr("Quotation description"), format: "text" },
      { key: "quotation.subTotal", label: tr("Subtotal (before VAT)"), format: "currency" },
      { key: "quotation.vatAmount", label: tr("VAT amount"), format: "currency" },
      { key: "quotation.totalAmount", label: tr("Total (after VAT)"), format: "currency" },
      // Computed by fetchGenerateContext (TaskDetailView.js) as vatAmount > 0 —
      // this JsField editor only builds the config list, it never resolves
      // values itself, so no matching computation needed here.
      { key: "quotation.isTaxed", label: tr("VAT applied"), format: "boolean" },
    ],
  },
  contract: {
    label: tr("Contract"),
    fields: [
      { key: "contract.contractCode", label: tr("Contract number"), format: "text" },
      { key: "contract.language", label: tr("Contract language"), format: "text" },
      { key: "contract.status", label: tr("Contract status"), format: "text" },
      { key: "contract.executedAt", label: tr("Contract effective date"), format: "date" },
    ],
  },
  invoice: {
    label: tr("Invoice"),
    fields: [
      { key: "invoice.invoiceNumber", label: tr("Invoice number"), format: "text" },
      { key: "invoice.issuedDate", label: tr("Invoice issue date"), format: "date" },
      { key: "invoice.deadline", label: tr("Invoice due date"), format: "date" },
      { key: "invoice.totalAmount", label: tr("Invoice total"), format: "currency" },
      { key: "invoice.amountPaid", label: tr("Paid"), format: "currency" },
      { key: "invoice.outStandingAmount", label: tr("Outstanding balance"), format: "currency" },
      { key: "invoice.status", label: tr("Invoice status"), format: "text" },
    ],
  },
  payment: {
    label: tr("Payment"),
    fields: [
      { key: "payment.paymentNumber", label: tr("Payment number"), format: "text" },
      { key: "payment.paymentDate", label: tr("Payment date"), format: "date" },
      { key: "payment.amount", label: tr("Amount paid"), format: "currency" },
      { key: "payment.paymentMethod", label: tr("Payment method"), format: "text" },
      { key: "payment.paymentStatus", label: tr("Payment status"), format: "text" },
    ],
  },
  task: {
    label: tr("Task"),
    fields: [
      { key: "task.title", label: tr("Task name"), format: "text" },
      { key: "task.startDate", label: tr("Start date"), format: "date" },
      { key: "task.dueDate", label: tr("Task due date"), format: "date" },
      { key: "task.description", label: tr("Progress details"), format: "text" },
    ],
  },
  user: {
    label: tr("User"),
    fields: [
      { key: "user.nickname", label: tr("Lawyer name (nickname)"), format: "text" },
      { key: "user.username", label: tr("Username"), format: "text" },
    ],
  },
  date: {
    label: tr("Date"),
    fields: [
      { key: "date.today", label: tr("Today's date"), format: "date" },
      { key: "date.day", label: tr("Day (dd)"), format: "text" },
      { key: "date.month", label: tr("Month (mm)"), format: "text" },
      { key: "date.year", label: tr("Year (yyyy)"), format: "text" },
    ],
  },
};

const SYSTEM_FIELD_OPTIONS = Object.entries(VARIABLE_CATALOG).flatMap(([groupKey, group]) =>
  group.fields.map((f) => ({
    value: f.key,
    label: `${group.label} — ${f.label}`,
  })),
);

function VariableConfigEditor() {
  const initial = Array.isArray(ctx.getValue()) ? ctx.getValue() : [];
  const [rows, setRows] = useState(initial);

  const commit = (nextRows) => {
    setRows(nextRows);
    ctx.setValue(nextRows);
  };

  const updateRow = (index, patch) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    commit(next);
  };

  const addRow = () => {
    commit([...rows, { key: "", source: "system", sourceKey: "", label: "" }]);
  };

  const removeRow = (index) => {
    commit(rows.filter((_, i) => i !== index));
  };

  return React.createElement(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 8 } },
    rows.length === 0
      ? React.createElement(Empty, {
          description: tr("No variables yet"),
          image: Empty.PRESENTED_IMAGE_SIMPLE,
        })
      : rows.map((row, index) =>
          React.createElement(
            Space.Compact,
            { key: index, style: { width: "100%" } },
            React.createElement(Input, {
              placeholder: tr("Variable name (e.g. customer_name)"),
              value: row.key,
              style: { width: "22%" },
              onChange: (e) => updateRow(index, { key: e.target.value }),
            }),
            React.createElement(Select, {
              value: row.source,
              style: { width: "18%" },
              options: [
                { value: "system", label: tr("System") },
                { value: "manual", label: tr("Manual") },
              ],
              onChange: (value) => updateRow(index, { source: value }),
            }),
            row.source === "system"
              ? React.createElement(Select, {
                  placeholder: tr("Select a system field"),
                  value: row.sourceKey || undefined,
                  style: { width: "45%" },
                  showSearch: true,
                  optionFilterProp: "label",
                  options: SYSTEM_FIELD_OPTIONS,
                  onChange: (value) => updateRow(index, { sourceKey: value }),
                })
              : React.createElement(Input, {
                  placeholder: tr("Label shown for manual input (e.g. Court name)"),
                  value: row.label,
                  style: { width: "45%" },
                  onChange: (e) => updateRow(index, { label: e.target.value }),
                }),
            React.createElement(Button, {
              danger: true,
              onClick: () => removeRow(index),
              style: { width: "15%" },
              children: tr("Delete"),
            }),
          ),
        ),
    React.createElement(Button, { type: "dashed", onClick: addRow }, tr("+ Add variable")),
  );
}

ctx.render(React.createElement(VariableConfigEditor));
