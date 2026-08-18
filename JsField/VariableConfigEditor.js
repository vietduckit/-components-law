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
    label: "Hồ sơ",
    fields: [
      { key: "case.caseCode", label: "Số hồ sơ", format: "text" },
      { key: "case.projectName", label: "Tên hồ sơ", format: "text" },
      { key: "case.date", label: "Ngày mở hồ sơ", format: "date" },
      { key: "case.deadline", label: "Hạn hồ sơ", format: "date" },
    ],
  },
  customer: {
    label: "Khách hàng",
    fields: [
      { key: "customer.fullName", label: "Tên đầy đủ khách hàng", format: "text" },
      { key: "customer.shortName", label: "Tên ngắn khách hàng", format: "text" },
      { key: "customer.address", label: "Địa chỉ", format: "text" },
      { key: "customer.phone", label: "Số điện thoại", format: "text" },
      { key: "customer.taxCode", label: "Mã số thuế", format: "text" },
      { key: "customer.identityNumber", label: "Số CCCD/CMND", format: "text" },
      { key: "customer.corporateRepresentative", label: "Người đại diện pháp luật", format: "text" },
    ],
  },
  quotation: {
    label: "Báo giá",
    fields: [
      { key: "quotation.quotationNumber", label: "Số báo giá", format: "text" },
      { key: "quotation.status", label: "Trạng thái báo giá", format: "text" },
      { key: "quotation.description", label: "Mô tả báo giá", format: "text" },
      { key: "quotation.subTotal", label: "Tổng trước VAT", format: "currency" },
      { key: "quotation.vatAmount", label: "Tổng VAT", format: "currency" },
      { key: "quotation.totalAmount", label: "Tổng sau VAT", format: "currency" },
    ],
  },
  contract: {
    label: "Hợp đồng",
    fields: [
      { key: "contract.contractCode", label: "Số hợp đồng", format: "text" },
      { key: "contract.language", label: "Ngôn ngữ hợp đồng", format: "text" },
      { key: "contract.status", label: "Trạng thái hợp đồng", format: "text" },
      { key: "contract.executedAt", label: "Ngày hiệu lực hợp đồng", format: "date" },
    ],
  },
  invoice: {
    label: "Hoá đơn",
    fields: [
      { key: "invoice.invoiceNumber", label: "Số hoá đơn", format: "text" },
      { key: "invoice.issuedDate", label: "Ngày phát hành hoá đơn", format: "date" },
      { key: "invoice.deadline", label: "Hạn thanh toán hoá đơn", format: "date" },
      { key: "invoice.totalAmount", label: "Tổng tiền hoá đơn", format: "currency" },
      { key: "invoice.amountPaid", label: "Đã thanh toán", format: "currency" },
      { key: "invoice.outStandingAmount", label: "Còn lại phải thu", format: "currency" },
      { key: "invoice.status", label: "Trạng thái hoá đơn", format: "text" },
    ],
  },
  payment: {
    label: "Thanh toán",
    fields: [
      { key: "payment.paymentNumber", label: "Số phiếu thanh toán", format: "text" },
      { key: "payment.paymentDate", label: "Ngày thanh toán", format: "date" },
      { key: "payment.amount", label: "Số tiền đã thanh toán", format: "currency" },
      { key: "payment.paymentMethod", label: "Hình thức thanh toán", format: "text" },
      { key: "payment.paymentStatus", label: "Trạng thái thanh toán", format: "text" },
    ],
  },
  task: {
    label: "Công việc",
    fields: [
      { key: "task.title", label: "Tên công việc", format: "text" },
      { key: "task.startDate", label: "Ngày bắt đầu", format: "date" },
      { key: "task.dueDate", label: "Hạn công việc", format: "date" },
      { key: "task.description", label: "Nội dung diễn biến", format: "text" },
    ],
  },
  user: {
    label: "Người dùng",
    fields: [
      { key: "user.nickname", label: "Tên luật sư (nickname)", format: "text" },
      { key: "user.username", label: "Tên đăng nhập", format: "text" },
    ],
  },
  date: {
    label: "Ngày tháng",
    fields: [
      { key: "date.today", label: "Ngày hiện tại", format: "date" },
      { key: "date.day", label: "Ngày (dd)", format: "text" },
      { key: "date.month", label: "Tháng (mm)", format: "text" },
      { key: "date.year", label: "Năm (yyyy)", format: "text" },
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
          description: "Chưa có biến nào",
          image: Empty.PRESENTED_IMAGE_SIMPLE,
        })
      : rows.map((row, index) =>
          React.createElement(
            Space.Compact,
            { key: index, style: { width: "100%" } },
            React.createElement(Input, {
              placeholder: "Tên biến (VD: customer_name)",
              value: row.key,
              style: { width: "22%" },
              onChange: (e) => updateRow(index, { key: e.target.value }),
            }),
            React.createElement(Select, {
              value: row.source,
              style: { width: "18%" },
              options: [
                { value: "system", label: "Hệ thống" },
                { value: "manual", label: "Nhập tay" },
              ],
              onChange: (value) => updateRow(index, { source: value }),
            }),
            row.source === "system"
              ? React.createElement(Select, {
                  placeholder: "Chọn field hệ thống",
                  value: row.sourceKey || undefined,
                  style: { width: "45%" },
                  showSearch: true,
                  optionFilterProp: "label",
                  options: SYSTEM_FIELD_OPTIONS,
                  onChange: (value) => updateRow(index, { sourceKey: value }),
                })
              : React.createElement(Input, {
                  placeholder: "Nhãn hiển thị khi nhập tay (VD: Tên tòa án)",
                  value: row.label,
                  style: { width: "45%" },
                  onChange: (e) => updateRow(index, { label: e.target.value }),
                }),
            React.createElement(Button, {
              danger: true,
              onClick: () => removeRow(index),
              style: { width: "15%" },
              children: "Xoá",
            }),
          ),
        ),
    React.createElement(Button, { type: "dashed", onClick: addRow }, "+ Thêm biến"),
  );
}

ctx.render(React.createElement(VariableConfigEditor));
