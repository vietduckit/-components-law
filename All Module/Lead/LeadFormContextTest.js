const React = ctx.libs?.React || ctx.React;
const antd = ctx.libs?.antd || ctx.antd;

if (!React || !antd) {
  throw new Error("React or Ant Design is not available.");
}

if (!ctx.form) {
  ctx.render(
    React.createElement(antd.Alert, {
      type: "error",
      showIcon: true,
      message: ctx.t("Form context is unavailable"),
    }),
  );
} else {
  const { Col, Input, InputNumber, Row, Select } = antd;

  const SOURCE_OPTIONS = [
    { value: "googleAds", label: "Google Ads" },
    { value: "facebookAds", label: "Facebook Ads" },
    { value: "zalo", label: "Zalo" },
    { value: "referral", label: "Referral" },
    { value: "website", label: "Website" },
    { value: "hotline", label: "Hotline" },
    { value: "partner", label: "Partner" },
    { value: "lawyer", label: "Lawyer" },
    { value: "staff", label: "Staff" },
  ];

  const LEAD_TYPE_OPTIONS = [
    { value: "company", label: ctx.t("Company") },
    { value: "individual", label: ctx.t("Individual") },
  ];

  const readFormValues = () => ctx.form.getFieldsValue(true) || {};

  const extractRelationId = (value) => {
    const item = Array.isArray(value) ? value[0] : value;
    if (item == null || item === "") return null;
    if (typeof item === "object") return item.id ?? null;
    return item;
  };

  const internalCompanyLabel = (company) =>
    String(
      company?.shortName ||
        company?.name ||
        company?.legalName ||
        company?.companyCode ||
        (company?.id ? `Company #${company.id}` : ""),
    );

  const lawyerLabel = (lawyer) => {
    const user = Array.isArray(lawyer?.users)
      ? lawyer.users[0]
      : lawyer?.users;
    const lawyerName =
      lawyer?.lawyerName ||
      user?.nickname ||
      user?.username ||
      lawyer?.email ||
      `#${lawyer?.id ?? ""}`;
    const userName = user?.nickname || user?.username;

    return String(
      userName && userName !== lawyerName
        ? `${lawyerName}`
        : lawyerName,
    );
  };

  const LeadFormMapping = () => {
    const [values, setValues] = React.useState(readFormValues);
    const [internalCompanies, setInternalCompanies] = React.useState([]);
    const [companiesLoading, setCompaniesLoading] = React.useState(true);
    const [lawyers, setLawyers] = React.useState([]);
    const [lawyersLoading, setLawyersLoading] = React.useState(true);

    const refresh = React.useCallback(() => {
      setValues(readFormValues());
    }, []);

    React.useEffect(() => {
      let active = true;

      const loadInternalCompanies = async () => {
        setCompaniesLoading(true);
        try {
          const response = await ctx.api.request({
            url: "internalCompany:list",
            method: "GET",
            params: {
              page: 1,
              pageSize: 500,
              sort: ["shortName", "name"],
            },
          });
          if (active) {
            setInternalCompanies(response?.data?.data || []);
          }
        } catch (error) {
          console.error("[LeadFormMapping] Unable to load internal companies", error);
        } finally {
          if (active) setCompaniesLoading(false);
        }
      };

      loadInternalCompanies();

      return () => {
        active = false;
      };
    }, []);

    React.useEffect(() => {
      let active = true;

      const loadLawyers = async () => {
        setLawyersLoading(true);
        try {
          const response = await ctx.api.request({
            url: "lawyers:list",
            method: "GET",
            params: {
              page: 1,
              pageSize: 500,
              appends: ["users"],
              sort: ["lawyerName"],
            },
          });
          if (active) {
            setLawyers(response?.data?.data || []);
          }
        } catch (error) {
          console.error("[LeadFormMapping] Unable to load lawyers", error);
        } finally {
          if (active) setLawyersLoading(false);
        }
      };

      loadLawyers();

      return () => {
        active = false;
      };
    }, []);

    React.useEffect(() => {
      const handleFormValuesChange = () => {
        setValues(readFormValues());
      };

      const disposer = ctx.blockModel?.on?.(
        "formValuesChange",
        handleFormValuesChange,
      );

      refresh();

      return () => {
        if (typeof disposer === "function") {
          disposer();
        } else {
          ctx.blockModel?.off?.(
            "formValuesChange",
            handleFormValuesChange,
          );
        }
      };
    }, [refresh]);

    const setField = (name, value) => {
      ctx.form.setFieldValue(name, value);
      refresh();
    };

    const setLeadName = (value) => {
      const targetField =
        values.leadType === "individual" ? "fullName" : "companyName";
      setField(targetField, value);
    };

    const setInternalCompany = (companyId) => {
      if (companyId == null || companyId === "") {
        ctx.form.setFieldsValue({
          internalCompany: null,
          internalCompanyId: null,
        });
        refresh();
        return;
      }

      const selectedCompany = internalCompanies.find(
        (company) => String(company.id) === String(companyId),
      );

      ctx.form.setFieldsValue({
        internalCompany: selectedCompany
          ? {
              id: selectedCompany.id,
              shortName: selectedCompany.shortName,
              name: selectedCompany.name,
              legalName: selectedCompany.legalName,
              companyCode: selectedCompany.companyCode,
            }
          : { id: companyId },
        internalCompanyId: selectedCompany?.id ?? companyId,
      });
      refresh();
    };

    const setPersonResponsible = (lawyerId) => {
      if (lawyerId == null || lawyerId === "") {
        ctx.form.setFieldsValue({
          Assignees: null,
          lawyerId: null,
        });
        refresh();
        return;
      }

      const selectedLawyer = lawyers.find(
        (lawyer) => String(lawyer.id) === String(lawyerId),
      );
      if (!selectedLawyer) return;

      ctx.form.setFieldsValue({
        Assignees: {
          id: selectedLawyer.id,
          lawyerName: selectedLawyer.lawyerName,
          email: selectedLawyer.email,
          userId: selectedLawyer.userId,
          users: selectedLawyer.users,
        },
        lawyerId: selectedLawyer.id,
      });
      refresh();
    };

    const leadNameField =
      values.leadType === "individual" ? "fullName" : "companyName";
    const selectedInternalCompanyId =
      extractRelationId(values.internalCompany) ??
      extractRelationId(values.internalCompanyId);

    const internalCompanyOptions = internalCompanies.map((company) => ({
      value: String(company.id),
      label: internalCompanyLabel(company),
    }));
    const selectedLawyerId =
      extractRelationId(values.Assignees) ??
      extractRelationId(values.lawyerId);
    const lawyerOptions = lawyers.map((lawyer) => ({
      value: String(lawyer.id),
      label: lawyerLabel(lawyer),
    }));

    const fieldBox = (label, child, span = 12) =>
      React.createElement(
        Col,
        { xs: 24, md: span },
        React.createElement(
          "div",
          { style: { marginBottom: 14 } },
          React.createElement(
            "label",
            {
              style: {
                display: "block",
                marginBottom: 6,
                fontWeight: 600,
              },
            },
            ctx.t(label),
          ),
          child,
        ),
      );

    return React.createElement(
      Row,
      { gutter: 16 },
      fieldBox(
        "Lead Type",
        React.createElement(Select, {
          value: values.leadType ?? "company",
          options: LEAD_TYPE_OPTIONS,
          onChange: (value) => setField("leadType", value),
          style: { width: "100%" },
        }),
      ),
      fieldBox(
        "Internal Company",
        React.createElement(Select, {
          value:
            selectedInternalCompanyId == null
              ? undefined
              : String(selectedInternalCompanyId),
          options: internalCompanyOptions,
          loading: companiesLoading,
          disabled: companiesLoading,
          allowClear: true,
          showSearch: true,
          optionFilterProp: "label",
          placeholder: ctx.t("Select internal company"),
          onChange: setInternalCompany,
          style: { width: "100%" },
        }),
      ),
      fieldBox(
        "Lead Name / Company Name",
        React.createElement(Input, {
          value: values[leadNameField] || "",
          onChange: (event) => setLeadName(event.target.value),
        }),
      ),
      fieldBox(
        "Short Name",
        React.createElement(Input, {
          value: values.shortName || "",
          onChange: (event) => setField("shortName", event.target.value),
        }),
      ),
      fieldBox(
        "Corporate Representative",
        React.createElement(Input, {
          value: values.corporateRepresentative || "",
          onChange: (event) =>
            setField("corporateRepresentative", event.target.value),
        }),
      ),
      fieldBox(
        "Corporate Representative Title",
        React.createElement(Input, {
          value: values.corporateRepresentativeTitle || "",
          onChange: (event) =>
            setField("corporateRepresentativeTitle", event.target.value),
        }),
      ),
      fieldBox(
        "Email",
        React.createElement(Input, {
          value: values.email || "",
          onChange: (event) => setField("email", event.target.value),
        }),
      ),
      fieldBox(
        "Phone",
        React.createElement(Input, {
          value: values.phone || "",
          onChange: (event) => setField("phone", event.target.value),
        }),
      ),
      fieldBox(
        "Expected Revenue",
        React.createElement(InputNumber, {
          value: values.expectedRevenue,
          onChange: (value) => setField("expectedRevenue", value),
          min: 0,
          controls: false,
          style: { width: "100%" },
          formatter: (value) =>
            value == null || value === ""
              ? ""
              : String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ","),
          parser: (value) => String(value || "").replace(/,/g, ""),
        }),
      ),
      fieldBox(
        "Person Responsible",
        React.createElement(Select, {
          value:
            selectedLawyerId == null
              ? undefined
              : String(selectedLawyerId),
          options: lawyerOptions,
          loading: lawyersLoading,
          disabled: lawyersLoading,
          allowClear: true,
          showSearch: true,
          optionFilterProp: "label",
          placeholder: ctx.t("Select person responsible"),
          onChange: setPersonResponsible,
          style: { width: "100%" },
        }),
      ),
      fieldBox(
        "Source",
        React.createElement(Select, {
          value: values.source,
          options: SOURCE_OPTIONS,
          allowClear: true,
          onChange: (value) => setField("source", value),
          style: { width: "100%" },
        }),
      ),
      fieldBox(
        "Salesperson",
        React.createElement(Input, {
          value: values.salesperson || "",
          onChange: (event) => setField("salesperson", event.target.value),
        }),
      ),
      fieldBox(
        "Needs",
        React.createElement(Input.TextArea, {
          value: values.needs || "",
          rows: 4,
          onChange: (event) => setField("needs", event.target.value),
        }),
        24,
      ),
    );
  };

  ctx.render(React.createElement(LeadFormMapping));
}
