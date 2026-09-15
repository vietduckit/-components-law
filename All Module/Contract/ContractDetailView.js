// ============================================================
// ContractDetailView.js — unified "Basic Info" card for the Contract
// detail page's "Details" tab.
//
// Replaces the native NocoBase auto-generated form for `contracts` (the
// generic label-above-input UI) with a card matching the visual language
// already established by the 2 neighboring JS Blocks on this same tab
// (ContractServices.js, ContractPaymentScheduleDetailBlock.js — both a
// white bordered card with a header row) — those 2 blocks are NOT touched
// by this file and stay exactly where the page already has them; only the
// native Basic Info form is meant to be removed from the page and replaced
// by this block. See docs/superpowers/specs/2026-09-15-contract-detail-view-design.md.
//
// SCOPE NOTE (a deliberate reduction from the original ask of "merge
// Contract Services and Payment Schedule into one file too"): JS Blocks in
// this runtime cannot import or reuse another JS Block's code — each runs
// as an independent script — and reusing one via `ctx.openView` needs a
// pre-configured popup `viewUid` from the Admin UI Page Designer, which
// this session has no way to obtain or create. Duplicating those 2 blocks'
// already-working, non-trivial logic (service combo pricing, payment
// schedule + auto-PR-status + create-request modal) into a second copy
// here would be a real regression risk for no functional gain — so this
// file owns Basic Info only.
//
// EDITABLE vs READ-ONLY split: only administrative/reference fields are
// inline-editable here (name, responsible lawyer, template, customer,
// internal company, dates, currency, description, language). Financial/
// structural fields (billingCycle, feeModel, amounts, paymentSchedule,
// status) are shown read-only, even to a user who canEdit — they're each
// already owned by a more specific surface (ContractCreateForm.js for the
// schedule/fee structure, the separate "Status Progress" stepper block for
// status, the Payment Schedule block for amounts) and editing them here
// with no validation against that structure would risk desyncing the
// paymentSchedule JSON.
//
// Permission (new requirement, confirmed not to exist anywhere in this
// codebase today — grepped ContractServices.js, ContractPaymentScheduleDetailBlock.js,
// Case module, found nothing): canEdit = current user IS the contract's
// "Person Responsible" (contracts.lawyers -> lawyers.userId) OR the
// record's own creator (contracts.createdById). Everyone else sees a
// fully read-only card (no Edit button) — view access itself is NOT
// blocked, only editing, since other roles (accounting, admin) plausibly
// still need to see a contract they didn't create.
// ============================================================

const { React } = ctx;
const { useEffect, useMemo, useState } = React;
const {
  Input,
  Select,
  DatePicker,
  Button,
  Spin,
  Alert,
  Tag,
  message,
} = ctx.antd;

const C = {
  primary: "#1677ff",
  border: "#d9d9d9",
  text: "rgba(0, 0, 0, 0.88)",
  sub: "rgba(0, 0, 0, 0.45)",
  muted: "rgba(0, 0, 0, 0.25)",
  bg: "#ffffff",
  bgSoft: "#fafafa",
};

const contextRecord =
  ctx.record ||
  ctx.popup?.record ||
  ctx.state?.record ||
  ctx.data?.record ||
  ctx.recordData ||
  null;

const extractId = (value) => {
  if (Array.isArray(value)) return extractId(value[0]);
  const raw = value && typeof value === "object" ? value.id || value._id : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const compact = (items) =>
  items
    .map((item) => (item === undefined || item === null ? "" : String(item).trim()))
    .filter(Boolean);

const firstPresent = (record, fields = []) => {
  for (const field of fields) {
    const value = record?.[field];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
};

const relationRecord = (value) => {
  if (Array.isArray(value)) return value.find((item) => item && typeof item === "object") || null;
  return value && typeof value === "object" ? value : null;
};

// Same fallback chain as ContractPaymentScheduleDetailBlock.js's own
// customerLabel/company helpers — different collections in this codebase
// use different display-name field names (customers has no shortName,
// only customerName; internalCompany has shortName) so the fallback is
// deliberately broad rather than hardcoding one field per relation.
const displayLabel = (record) =>
  firstPresent(record, ["shortName", "customerName", "companyName", "name", "lawyerName", "templateName", "fullName", "displayName"]) ||
  (record?.id ? `#${record.id}` : "");

const getCurrentUser = () =>
  ctx.currentUser ||
  ctx.state?.currentUser ||
  ctx.app?.currentUser ||
  ctx.store?.getState?.()?.currentUser ||
  null;

const formatDate = (value) => {
  if (!value) return "—";
  const normalized =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const parseNum = (value) => {
  const n = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const formatMoney = (value, currencyCode) => {
  const n = parseNum(value);
  if (!n && (value === undefined || value === null || value === "")) return "—";
  return `${Math.round(n).toLocaleString("vi-VN")} ${currencyCode || "VND"}`;
};

const CONTRACT_TYPE_LABELS = {
  byCase: "By Case",
  retainer: "Retainer",
  // byService intentionally not added yet — that contract type does not
  // exist in the live `contractType` enum as of this file's writing (see
  // docs/superpowers/specs/2026-09-15-by-case-payment-request-automation-design.md's
  // "By Service" follow-up, not yet built). Add a labeled entry here (and
  // a matching case in FIELD_GROUPS_BY_TYPE below) once that ships — this
  // switch is the only place that needs to change.
};

const fetchContract = async (id) => {
  const res = await ctx.api.request({
    url: "contracts:get",
    params: {
      filterByTk: id,
      appends: ["lawyers", "lawyers.user", "customers", "internalCompany", "template", "currencies", "billingPlans"],
    },
  });
  return res?.data?.data || res?.data || null;
};

const fetchOptions = async (resource, fields) => {
  try {
    const res = await ctx.api.request({ url: `${resource}:list`, params: { pageSize: 500, fields } });
    return res?.data?.data || [];
  } catch (error) {
    console.warn(`[ContractDetailView] fetch ${resource} failed`, error);
    return [];
  }
};

// currentUser is either the "Person Responsible" lawyer's own linked user
// account, or the record's original creator — matches the exact wording
// the user gave for this new permission requirement. No admin-role
// override is implemented (not asked for and not confirmed) — an actual
// admin would need to be set as Person Responsible today if they need to
// fix a contract they didn't create.
const resolveCanEdit = (contract, currentUser) => {
  const userId = extractId(currentUser?.id ?? currentUser);
  if (!userId || !contract) return false;
  const responsibleLawyer = relationRecord(contract.lawyers);
  const responsibleUserId = extractId(responsibleLawyer?.user) || extractId(responsibleLawyer?.userId);
  if (responsibleUserId && responsibleUserId === userId) return true;
  return extractId(contract.createdById) === userId;
};

const FieldRow = ({ label, children }) =>
  React.createElement(
    "div",
    { style: { display: "grid", gap: 4, minWidth: 0 } },
    React.createElement("div", { style: { fontSize: 12, color: C.sub, fontWeight: 600 } }, label),
    React.createElement("div", { style: { fontSize: 14, color: C.text, minHeight: 22 } }, children),
  );

const ReadField = ({ label, value }) =>
  React.createElement(FieldRow, { label }, value === undefined || value === null || value === "" ? "—" : value);

const GRID_STYLE = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px 20px" };

const SectionTitle = ({ children }) =>
  React.createElement(
    "div",
    { style: { fontSize: 13, fontWeight: 700, color: C.text, margin: "20px 0 12px", borderTop: `1px solid ${C.border}`, paddingTop: 16 } },
    children,
  );

const RetainerPlanSection = ({ plan }) => {
  if (!plan) return React.createElement(Alert, { type: "info", showIcon: true, message: "Contract has no active billing plan yet.", style: { marginTop: 12 } });
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(SectionTitle, null, "Retainer Billing Plan"),
    React.createElement(
      "div",
      { style: GRID_STYLE },
      React.createElement(ReadField, { label: "Plan Type", value: plan.planType }),
      React.createElement(ReadField, { label: "Status", value: plan.status }),
      React.createElement(ReadField, { label: "Total Amount", value: formatMoney(plan.totalAmount) }),
      React.createElement(ReadField, { label: "Retainer Unit", value: plan.retainerUnit }),
      React.createElement(ReadField, {
        label: "Cycles Billed",
        value: `${plan.retainerCyclesBilled ?? 0}${plan.retainerTotalCycles ? ` / ${plan.retainerTotalCycles}` : " (open-ended)"}`,
      }),
      React.createElement(ReadField, { label: "Next Billing Date", value: formatDate(plan.nextBillingDate) }),
      React.createElement(ReadField, { label: "Start Date", value: formatDate(plan.startDate) }),
      React.createElement(ReadField, { label: "End Date", value: formatDate(plan.endDate) }),
    ),
  );
};

const ContractDetailView = () => {
  const [contract, setContract] = useState(contextRecord);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [lawyerOptions, setLawyerOptions] = useState([]);
  const [templateOptions, setTemplateOptions] = useState([]);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [companyOptions, setCompanyOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);

  const recordId = extractId(contextRecord?.id) || extractId(ctx.recordId);

  useEffect(() => {
    let mounted = true;
    setContract(contextRecord);
    setError("");
    if (!recordId) return () => { mounted = false; };
    setLoading(true);
    Promise.all([fetchContract(recordId), Promise.resolve(getCurrentUser())])
      .then(([fresh, user]) => {
        if (!mounted) return;
        setContract(fresh || contextRecord);
        setCurrentUser(user);
      })
      .catch((err) => {
        console.error("[ContractDetailView] fetch contract failed", err);
        if (mounted) setError("Could not load contract details.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [recordId]);

  const canEdit = useMemo(() => resolveCanEdit(contract, currentUser), [contract, currentUser]);

  const startEditing = async () => {
    setForm({
      contractName: contract?.contractName || "",
      lawyerId: extractId(contract?.lawyers) || null,
      templateId: extractId(contract?.template) || null,
      customerId: extractId(contract?.customers) || null,
      internalCompanyId: extractId(contract?.internalCompany) || null,
      currencyId: extractId(contract?.currencies) || null,
      issuedDate: toDateInputValue(contract?.issuedDate),
      signedAt: toDateInputValue(contract?.signedAt),
      effectiveAt: toDateInputValue(contract?.effectiveAt),
      description: contract?.description || "",
      scopeNote: contract?.scopeNote || "",
      language: contract?.language || "",
    });
    setEditing(true);
    const [lawyers, templates, customers, companies, currencies] = await Promise.all([
      fetchOptions("lawyers", "id,lawyerName"),
      fetchOptions("template", "id,templateName"),
      fetchOptions("customers", "id,customerName"),
      fetchOptions("internalCompany", "id,shortName,name"),
      fetchOptions("currencies", "id,code,symbol,name"),
    ]);
    setLawyerOptions(lawyers);
    setTemplateOptions(templates);
    setCustomerOptions(customers);
    setCompanyOptions(companies);
    setCurrencyOptions(currencies);
  };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const cancelEditing = () => setEditing(false);

  const saveEditing = async () => {
    if (!String(form.contractName || "").trim()) {
      message?.warning?.("Please enter the contract name.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        contractName: form.contractName.trim(),
        lawyerId: form.lawyerId || null,
        templateId: form.templateId || null,
        customerId: form.customerId || null,
        internalCompanyId: form.internalCompanyId || null,
        currencyId: form.currencyId || null,
        issuedDate: form.issuedDate || null,
        signedAt: form.signedAt || null,
        effectiveAt: form.effectiveAt || null,
        description: form.description || null,
        scopeNote: form.scopeNote || null,
        language: form.language || null,
      };
      await ctx.api.request({ url: `contracts:update?filterByTk=${recordId}`, method: "POST", data: payload });
      const fresh = await fetchContract(recordId);
      setContract(fresh);
      setEditing(false);
      message?.success?.("Contract updated.");
    } catch (err) {
      console.error("[ContractDetailView] save failed", err);
      message?.error?.(err?.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return React.createElement("div", { style: { padding: 24, textAlign: "center" } }, React.createElement(Spin, null));
  }
  if (!contract) {
    return React.createElement(Alert, { type: "warning", showIcon: true, message: error || "Contract not found." });
  }

  const contractType = contract.contractType || "";
  const isByCase = contractType === "byCase";
  const isRetainer = contractType === "retainer";
  const customer = relationRecord(contract.customers);
  const company = relationRecord(contract.internalCompany);
  const lawyer = relationRecord(contract.lawyers);
  const template = relationRecord(contract.template);
  const currency = relationRecord(contract.currencies);
  const activePlan = (contract.billingPlans || []).find((p) => p.status === "active") || (contract.billingPlans || [])[0] || null;
  const currencyCode = currency?.code || currency?.symbol || "VND";

  const lawyerSelectOptions = lawyerOptions.map((l) => ({ value: l.id, label: l.lawyerName || `#${l.id}` }));
  const templateSelectOptions = templateOptions.map((t) => ({ value: t.id, label: t.templateName || `#${t.id}` }));
  const customerSelectOptions = customerOptions.map((c) => ({ value: c.id, label: c.customerName || `#${c.id}` }));
  const companySelectOptions = companyOptions.map((c) => ({ value: c.id, label: c.shortName || c.name || `#${c.id}` }));
  const currencySelectOptions = currencyOptions.map((c) => ({ value: c.id, label: compact([c.code, c.symbol]).join(" ") || c.name }));

  return React.createElement(
    "div",
    {
      style: {
        fontFamily: "inherit",
        color: C.text,
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: "hidden",
        width: "100%",
        boxSizing: "border-box",
      },
    },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "14px 16px",
          background: C.bgSoft,
          borderBottom: `1px solid ${C.border}`,
          flexWrap: "wrap",
        },
      },
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } },
        React.createElement("span", { style: { fontSize: 15, fontWeight: 700 } }, "Basic Info"),
        contract.contractCode
          ? React.createElement(Tag, { color: "default" }, contract.contractCode)
          : null,
        contractType
          ? React.createElement(Tag, { color: "blue" }, CONTRACT_TYPE_LABELS[contractType] || contractType)
          : null,
        contract.status ? React.createElement(Tag, null, contract.status) : null,
      ),
      canEdit && !editing
        ? React.createElement(Button, { size: "small", onClick: startEditing }, "Edit")
        : editing
          ? React.createElement(
              "div",
              { style: { display: "flex", gap: 8 } },
              React.createElement(Button, { size: "small", onClick: cancelEditing, disabled: saving }, "Cancel"),
              React.createElement(Button, { size: "small", type: "primary", loading: saving, onClick: saveEditing }, "Save"),
            )
          : null,
    ),
    error ? React.createElement(Alert, { type: "warning", showIcon: true, message: error, style: { margin: 16 } }) : null,
    React.createElement(
      "div",
      { style: { padding: 16 } },
      editing
        ? React.createElement(
            "div",
            { style: GRID_STYLE },
            React.createElement(
              FieldRow,
              { label: "Contract Name *" },
              React.createElement(Input, { value: form.contractName, onChange: (e) => setField("contractName", e.target.value) }),
            ),
            React.createElement(
              FieldRow,
              { label: "Person Responsible" },
              React.createElement(Select, { allowClear: true, showSearch: true, optionFilterProp: "label", style: { width: "100%" }, value: form.lawyerId || undefined, onChange: (v) => setField("lawyerId", v || null), options: lawyerSelectOptions }),
            ),
            React.createElement(
              FieldRow,
              { label: "Template" },
              React.createElement(Select, { allowClear: true, showSearch: true, optionFilterProp: "label", style: { width: "100%" }, value: form.templateId || undefined, onChange: (v) => setField("templateId", v || null), options: templateSelectOptions }),
            ),
            React.createElement(
              FieldRow,
              { label: "Customer" },
              React.createElement(Select, { allowClear: true, showSearch: true, optionFilterProp: "label", style: { width: "100%" }, value: form.customerId || undefined, onChange: (v) => setField("customerId", v || null), options: customerSelectOptions }),
            ),
            React.createElement(
              FieldRow,
              { label: "Internal Company" },
              React.createElement(Select, { allowClear: true, showSearch: true, optionFilterProp: "label", style: { width: "100%" }, value: form.internalCompanyId || undefined, onChange: (v) => setField("internalCompanyId", v || null), options: companySelectOptions }),
            ),
            React.createElement(
              FieldRow,
              { label: "Currency" },
              React.createElement(Select, { allowClear: true, style: { width: "100%" }, value: form.currencyId || undefined, onChange: (v) => setField("currencyId", v || null), options: currencySelectOptions }),
            ),
            React.createElement(
              FieldRow,
              { label: "Issued Date" },
              React.createElement(Input, { type: "date", value: form.issuedDate, onChange: (e) => setField("issuedDate", e.target.value) }),
            ),
            React.createElement(
              FieldRow,
              { label: "Signed At" },
              React.createElement(Input, { type: "date", value: form.signedAt, onChange: (e) => setField("signedAt", e.target.value) }),
            ),
            React.createElement(
              FieldRow,
              { label: "Effective At" },
              React.createElement(Input, { type: "date", value: form.effectiveAt, onChange: (e) => setField("effectiveAt", e.target.value) }),
            ),
            React.createElement(
              FieldRow,
              { label: "Language" },
              React.createElement(Input, { value: form.language, onChange: (e) => setField("language", e.target.value) }),
            ),
            React.createElement(
              "div",
              { style: { gridColumn: "1 / -1" } },
              React.createElement(
                FieldRow,
                { label: "Scope Note" },
                React.createElement(Input.TextArea, { rows: 3, value: form.scopeNote, onChange: (e) => setField("scopeNote", e.target.value) }),
              ),
            ),
            React.createElement(
              "div",
              { style: { gridColumn: "1 / -1" } },
              React.createElement(
                FieldRow,
                { label: "Description" },
                React.createElement(Input.TextArea, { rows: 3, value: form.description, onChange: (e) => setField("description", e.target.value) }),
              ),
            ),
          )
        : React.createElement(
            React.Fragment,
            null,
            React.createElement(
              "div",
              { style: GRID_STYLE },
              React.createElement(ReadField, { label: "Contract Code", value: contract.contractCode }),
              React.createElement(ReadField, { label: "Contract Name", value: contract.contractName }),
              React.createElement(ReadField, { label: "Person Responsible", value: displayLabel(lawyer) }),
              React.createElement(ReadField, { label: "Template", value: displayLabel(template) }),
              React.createElement(ReadField, { label: "Customer", value: displayLabel(customer) }),
              React.createElement(ReadField, { label: "Internal Company", value: displayLabel(company) }),
              React.createElement(ReadField, { label: "Currency", value: currencyCode }),
              React.createElement(ReadField, { label: "Issued Date", value: formatDate(contract.issuedDate) }),
              React.createElement(ReadField, { label: "Signed At", value: formatDate(contract.signedAt) }),
              React.createElement(ReadField, { label: "Effective At", value: formatDate(contract.effectiveAt) }),
              React.createElement(ReadField, { label: "Language", value: contract.language }),
            ),
            contract.scopeNote || contract.description
              ? React.createElement(
                  "div",
                  { style: { ...GRID_STYLE, marginTop: 16 } },
                  contract.scopeNote
                    ? React.createElement("div", { style: { gridColumn: "1 / -1" } }, React.createElement(ReadField, { label: "Scope Note", value: contract.scopeNote }))
                    : null,
                  contract.description
                    ? React.createElement("div", { style: { gridColumn: "1 / -1" } }, React.createElement(ReadField, { label: "Description", value: contract.description }))
                    : null,
                )
              : null,
          ),
      // Financial/structural fields — always read-only regardless of
      // canEdit/editing (see header comment). Grouped per contractType so
      // a By Case contract never shows retainer plan fields and vice
      // versa; a future byService entry only needs a new branch here.
      isByCase
        ? React.createElement(
            React.Fragment,
            null,
            React.createElement(SectionTitle, null, "Billing (By Case)"),
            React.createElement(
              "div",
              { style: GRID_STYLE },
              React.createElement(ReadField, { label: "Billing Cycle", value: contract.billingCycle }),
              React.createElement(ReadField, { label: "Fee Model", value: contract.feeModel }),
              React.createElement(ReadField, { label: "Total Amount", value: formatMoney(contract.totalAmount, currencyCode) }),
              React.createElement(ReadField, { label: "Sub Total", value: formatMoney(contract.subTotal, currencyCode) }),
              React.createElement(ReadField, { label: "VAT Amount", value: formatMoney(contract.vatAmount, currencyCode) }),
              React.createElement(ReadField, { label: "End Date", value: formatDate(contract.endDate) }),
              React.createElement(ReadField, { label: "Payment Status", value: contract.paymentStatus }),
              React.createElement(ReadField, { label: "Outstanding Amount", value: formatMoney(contract.outStandingAmount, currencyCode) }),
            ),
          )
        : null,
      isRetainer ? React.createElement(RetainerPlanSection, { plan: activePlan }) : null,
    ),
  );
};

ctx.render(React.createElement(ContractDetailView));
