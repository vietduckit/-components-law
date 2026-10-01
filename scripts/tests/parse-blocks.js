const fs = require("fs");
const path = require("path");
const { parse } = require("@babel/parser");

const root = path.resolve(__dirname, "../..");
const files = [
  "All Module/Contract/ContractCreateForm.js",
  "All Module/Case/CaseCreateForm.js",
  "All Module/Case/CaseServices.js",
  "All Module/Contract/ContractServices.js",
  "All Module/Contract/ContractDetailView.js",
  "All Module/Quotation/QuotationServices.js",
  "All Module/Quotation/QuotationCreateForm.js",
  "All Module/Contract/ContractPaymentScheduleDetailBlock.js",
  "All Module/Payment/PaymentRequestCreateBlock.js",
  "All Module/Payment/PaymentContractDetailBlock.js",
  "All Module/Task/TaskManagement.js",
  "All Module/Task/TaskDetailView.js",
  "JsField/RegisterContractServicesPaymentTriggerField.js",
  "JsField/Workflow/CreateContractBillingPlansWorkflow.js",
  "JsField/Workflow/CreateRetainerBillingCronWorkflow.js",
  "JsField/Workflow/CreateFinanceNotificationsWorkflow.js",
  "JsField/RegisterFinanceMembersFields.js",
  "JsField/RegisterServiceThreadFields.js",
  "JsField/RegisterCompanyServiceCurrency.js",
  "All Module/Service/ServiceChangeLog.js",
  "JsField/CreateFinanceNotificationsCollection.js",
  "All Module/Contract/ContractPaymentScheduleDetailBlock.js",
  "All Module/Case/CaseFinanceBlock.js",
];

let failed = false;
for (const rel of files) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  try {
    parse(`async function __block(){\n${src}\n}`, {
      sourceType: "script",
      plugins: ["jsx"],
      allowReturnOutsideFunction: true,
    });
    console.log(`ok ${rel}`);
  } catch (error) {
    failed = true;
    console.log(`ERR ${rel} ${error.message}`);
  }
}
process.exit(failed ? 1 : 0);
