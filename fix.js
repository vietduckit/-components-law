const fs = require('fs');
let content = fs.readFileSync('c:/Users/Viet/Desktop/components-law/CaseCreateForm.js', 'utf8');

// The incorrect part is inside renderRelatedToSection.
// We will replace the Grid containing Related Contract and Related Quotation.

const incorrectGrid = `        React.createElement(
          Grid,
          { cols: 2, gap: 16, mb: 0 },
          React.createElement(
            Field,
            { label: "Related Contract" },
            React.createElement(RelatedSingleDropdown, {
              items: customerContracts,
              value: form.contractId,
              onChange: handleContractChange,
              placeholder: !form.internalCompanyId ? "" : "Select quotation",
              getItemLabel: getQuotationLabel,
              getItemSub: getQuotationSub,
              disabled: !form.internalCompanyId,
              onAddNew: () =>
                openCreatePopup("quotationCreate", refreshQuotations),
            }),
          ),
        ),`;

const correctGrid = `        React.createElement(
          Grid,
          { cols: 2, gap: 16, mb: 0 },
          React.createElement(
            Field,
            { label: "Related Contract" },
            React.createElement(RelatedSingleDropdown, {
              items: customerContracts,
              value: form.contractId,
              onChange: handleContractChange,
              placeholder: !form.internalCompanyId ? "" : "Select contract",
              getItemLabel: getContractLabel,
              getItemSub: getContractSub,
              disabled: !form.internalCompanyId,
              onAddNew: () =>
                openCreatePopup("contractCreate", refreshContracts, { customerId: form.customerId, internalCompanyId: form.internalCompanyId, lawyerId: form.lawyerId }),
            }),
          ),
          React.createElement(
            Field,
            {
              label: "Related Quotation",
              hint: !form.internalCompanyId
                ? "please select internal company"
                : form.quotationId
                  ? "↓ changing will reload services"
                  : "select to load services into table",
            },
            React.createElement(RelatedSingleDropdown, {
              items: customerQuotations,
              value: form.quotationId,
              onChange: handleQuotationChange,
              placeholder: !form.internalCompanyId ? "" : "Select quotation",
              getItemLabel: getQuotationLabel,
              getItemSub: getQuotationSub,
              disabled: !form.internalCompanyId,
              onAddNew: () =>
                openCreatePopup("quotationCreate", refreshQuotations, { customerId: form.customerId, internalCompanyId: form.internalCompanyId, lawyerId: form.lawyerId }),
            }),
          ),
        ),`;

if (content.includes(incorrectGrid)) {
  content = content.replace(incorrectGrid, correctGrid);
  console.log("Replaced Grid successfully.");
} else {
  // Try CRLF
  const incorrectGridCRLF = incorrectGrid.replace(/\n/g, '\r\n');
  if (content.includes(incorrectGridCRLF)) {
    content = content.replace(incorrectGridCRLF, correctGrid.replace(/\n/g, '\r\n'));
    console.log("Replaced Grid successfully (CRLF).");
  } else {
    console.log("Could not find the target grid to replace.");
  }
}

fs.writeFileSync('c:/Users/Viet/Desktop/components-law/CaseCreateForm.js', content, 'utf8');
