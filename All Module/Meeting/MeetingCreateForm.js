/**
 * MeetingCreateForm.js — JS Block tạo meeting mới
 *
 * inputArgs (từ ctx.openView hoặc ctx.view?.inputArgs):
 *   initialTaskId  — tự động tạo meetingTasks record sau khi tạo meeting
 *   initialCaseId  — pre-fill dropdown Case
 *   initialTitle   — pre-fill field Title (vd: "Họp: [task title]")
 *
 * Sau khi submit thành công:
 *   - emit "law-meeting:changed"
 *   - gọi ctx.modal?.close() để đóng popup
 */

const { React } = ctx;
const { useCallback, useEffect, useMemo, useRef, useState } = React;
const {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Spin,
  Typography,
  message,
  theme,
} = ctx.antd;

const { Text } = Typography;
const { RangePicker } = DatePicker || {};
const { TextArea } = Input;

// ─── Constants ───────────────────────────────────────────────────────────────

const LOOKUP_FETCH_LIMIT = 1000;
const MEETING_CHANGED_EVENT = "law-meeting:changed";

const USER_FIELDS    = "id,nickname,username,email";
const PROJECT_FIELDS = "id,caseCode,projectName,customerId,createdAt";
const CUSTOMER_FIELDS = "id,customerName,shortName";
const TASK_FIELDS = "id,title,status,projectId,createdAt";

const FALLBACK_TOKEN = {
  colorBgContainer: "#fff",
  colorTextSecondary: "#8c8c8c",
  colorBorder: "#d9d9d9",
  colorSplit: "#f0f0f0",
  borderRadius: 6,
  paddingSM: 12,
  marginSM: 12,
  fontSizeSM: 12,
};

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "ongoing",   label: "Ongoing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const TYPE_OPTIONS = [
  { value: "internal",    label: "Internal" },
  { value: "case_review", label: "Case review" },
  { value: "strategy",    label: "Strategy" },
  { value: "training",    label: "Training" },
  { value: "other",       label: "Other" },
];

const ATTENDANCE_STATUS_CONFIRMED = "confirmed";
const ATTENDANCE_STATUS_PENDING   = "pending";

// ─── Utilities ────────────────────────────────────────────────────────────────

const useNocoToken = () => {
  const result = theme && typeof theme.useToken === "function" ? theme.useToken() : null;
  return result?.token || FALLBACK_TOKEN;
};

const extractId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.length ? extractId(value[0]) : null;
  const raw = value && typeof value === "object" ? value.id || value._id : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const compact = (items) =>
  (items || [])
    .map((item) => (item === undefined || item === null ? "" : String(item).trim()))
    .filter(Boolean);

const uniqueIds = (items) =>
  Array.from(new Set((items || []).map(extractId).filter(Boolean)));

const unwrapList = (res) => {
  const data = res?.data?.data ?? res?.data ?? [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
};

const isSelectableUser = (record) => extractId(record?.id) !== 1;

const pad2 = (v) => String(v).padStart(2, "0");

const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

const toNativeDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isValidDate(value) ? value : null;
  if (typeof value.toDate === "function") {
    const d = value.toDate();
    return isValidDate(d) ? d : null;
  }
  if (value.$d) return isValidDate(value.$d) ? value.$d : null;
  const d = new Date(value);
  return isValidDate(d) ? d : null;
};

const toDateTimeString = (value) => {
  const d = toNativeDate(value);
  if (!d) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

const toTimeString = (value) => {
  if (typeof value === "string") {
    const m = value.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) return `${pad2(m[1])}:${m[2]}:${pad2(m[3] || 0)}`;
  }
  const d = toNativeDate(value);
  if (!d) return null;
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

const toDatetimeLocalValue = (dateValue, timeValue) => {
  const d = toNativeDate(dateValue);
  if (!d) return "";
  const tm = String(timeValue || "").match(/(\d{1,2}):(\d{2})/);
  const h  = tm ? Number(tm[1]) : d.getHours();
  const mi = tm ? Number(tm[2]) : d.getMinutes();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(h)}:${pad2(mi)}`;
};

const userLabel = (record) =>
  record?.nickname ||
  record?.displayName ||
  record?.username ||
  record?.name ||
  record?.email ||
  (record?.id ? `User #${record.id}` : "");

const caseLabel = (record) =>
  compact([
    record?.caseCode || record?.projectCode || record?.code,
    record?.projectName || record?.caseName || record?.title || record?.name,
  ]).join(" - ") || (record?.id ? `Case #${record.id}` : "");

const taskLabel = (record) =>
  record?.title ||
  record?.taskName ||
  record?.name ||
  (record?.id ? `Task #${record.id}` : "");

const contractLabel = (record) =>
  compact([
    record?.contractCode || record?.contractNumber || record?.code,
    record?.contractName || record?.name || record?.title,
  ]).join(" - ") || (record?.id ? `Contract #${record.id}` : "");

const quotationLabel = (record) =>
  compact([
    record?.quotationNumber || record?.quotationCode || record?.code,
    record?.quotationName || record?.name || record?.title,
  ]).join(" - ") || (record?.id ? `Quotation #${record.id}` : "");

const customerLabel = (record) =>
  record?.customerName ||
  record?.shortName ||
  record?.name ||
  record?.fullName ||
  record?.companyName ||
  "";

const relatedCustomerId = (record) =>
  extractId(record?.customerId || record?.customer || record?.customers);

const relatedCaseId = (record) =>
  extractId(record?.projectId || record?.caseId || record?.projects || record?.cases);

const relationOption = (record, getLabel, customerMap = {}) => {
  const primary = getLabel(record);
  const customer = customerLabel(customerMap[relatedCustomerId(record)]);
  return {
    value: String(extractId(record?.id)),
    title: primary,
    searchText: compact([primary, record?.id, customer]).join(" "),
    label: React.createElement(
      "div",
      { style: { display: "grid", gap: 2, minWidth: 0 } },
      React.createElement(
        "span",
        { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } },
        primary,
      ),
      customer
        ? React.createElement(
            "span",
            {
              style: {
                color: FALLBACK_TOKEN.colorTextSecondary,
                fontSize: FALLBACK_TOKEN.fontSizeSM,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            },
            customer,
          )
        : null,
    ),
  };
};

const selectFilterOption = (input, option) => {
  const keyword = String(input || "").trim().toLowerCase();
  if (!keyword) return true;
  return compact([
    option?.searchText,
    option?.title,
    typeof option?.label === "string" ? option.label : "",
    option?.value,
  ])
    .join(" ")
    .toLowerCase()
    .includes(keyword);
};

const taskOption = (record, casesById = {}, customerMap = {}) => {
  const primary = taskLabel(record);
  const caseRecord = casesById[relatedCaseId(record)];
  const caseText = caseRecord ? caseLabel(caseRecord) : "";
  const customer = customerLabel(customerMap[relatedCustomerId(caseRecord || {})]);
  return {
    value: String(extractId(record?.id)),
    title: primary,
    searchText: compact([primary, record?.id, caseText, customer]).join(" "),
    label: React.createElement(
      "div",
      { style: { display: "grid", gap: 2, minWidth: 0 } },
      React.createElement(
        "span",
        { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } },
        primary,
      ),
      caseText || customer
        ? React.createElement(
            "span",
            {
              style: {
                color: FALLBACK_TOKEN.colorTextSecondary,
                fontSize: FALLBACK_TOKEN.fontSizeSM,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            },
            compact([caseText, customer]).join(" · "),
          )
        : null,
    ),
  };
};

const buildMapById = (items) => {
  const map = {};
  (items || []).forEach((item) => {
    const id = extractId(item?.id);
    if (id) map[id] = item;
  });
  return map;
};

const safeFetchList = async (url, params = {}) => {
  try {
    const res = await ctx.api.request({
      url,
      method: "GET",
      params: { page: 1, pageSize: LOOKUP_FETCH_LIMIT, ...params },
    });
    return unwrapList(res);
  } catch (err) {
    console.warn(`[MeetingCreateForm] ${url} failed`, err);
    return [];
  }
};

const emitMeetingChanged = (payload = {}) => {
  const detail = { ...payload, changedAt: Date.now() };
  try { ctx.emit?.(MEETING_CHANGED_EVENT, detail); } catch {}
  try { ctx.eventBus?.emit?.(MEETING_CHANGED_EVENT, detail); } catch {}
  try { ctx.view?.emit?.(MEETING_CHANGED_EVENT, detail); } catch {}
};

const refreshNocoBaseDataBlocks = async () => {
  const engine = ctx.engine || ctx.app;
  const input = getRuntimeInput();
  const modelCandidates = [];
  compact([
    input.targetBlockUid,
    input.sourceBlockUid,
    input.blockUid,
    input.dataBlockUid,
    ctx.blockModel?.uid,
    ctx.model?.uid,
    ctx.block?.uid,
  ]).forEach((uid) => {
    try {
      const model = engine?.getModel?.(uid);
      if (model) modelCandidates.push(model);
    } catch (error) {
      console.warn("[MeetingCreateForm] get model failed", error);
    }
  });
  const candidates = [
    ...modelCandidates.flatMap((model) => [
      [model?.resource, "refresh"],
      [model, "refresh"],
      [model, "reload"],
    ]),
    [ctx.resource, "refresh"],
    [ctx.blockModel?.resource, "refresh"],
    [ctx.model?.resource, "refresh"],
    [ctx.block?.resource, "refresh"],
    [ctx.dataBlock?.resource, "refresh"],
    [ctx.blockModel, "refresh"],
    [ctx.model, "refresh"],
    [ctx.block, "refresh"],
    [ctx.dataBlock, "refresh"],
    [ctx.action, "refresh"],
    [ctx.view, "refresh"],
    [ctx, "refresh"],
    [ctx.action, "reload"],
    [ctx.view, "reload"],
    [ctx, "reload"],
  ];
  const called = new Set();

  for (const [target, method] of candidates) {
    const fn = target && target[method];
    if (typeof fn !== "function" || called.has(fn)) continue;
    called.add(fn);
    try {
      await fn.call(target);
    } catch (error) {
      console.warn("[MeetingCreateForm] native refresh failed", error);
    }
  }

  const reloaders = engine?.__nocobaseReloaders;
  if (reloaders && typeof reloaders.forEach === "function") {
    reloaders.forEach((reloadFn) => {
      if (typeof reloadFn !== "function") return;
      try { reloadFn(); } catch (error) {
        console.warn("[MeetingCreateForm] custom reloader failed", error);
      }
    });
  }
};

const closeCurrentPopup = () => {
  const calls = [
    [ctx.view, "close", []],
    [ctx, "onClose", []],
    [ctx, "close", []],
    [ctx.popup, "onClose", []],
    [ctx.popup, "close", []],
    [ctx.popup, "closeModal", []],
    [ctx.modal, "onClose", []],
    [ctx.modal, "close", []],
    [ctx.drawer, "onClose", []],
    [ctx.drawer, "close", []],
    [ctx.action, "onClose", []],
    [ctx.action, "close", []],
    [ctx.popup, "setVisible", [false]],
    [ctx.modal, "setVisible", [false]],
    [ctx.modal, "setOpen", [false]],
    [ctx.drawer, "setOpen", [false]],
  ];

  for (const [target, method, args] of calls) {
    if (target && typeof target[method] === "function") {
      try {
        target[method](...(args || []));
        return true;
      } catch (error) {
        console.warn("[MeetingCreateForm] close popup failed", error);
      }
    }
  }
  return false;
};

const configureGuardedModalClose = (requestClose) => {
  if (typeof requestClose !== "function") return undefined;
  const restoreFns = [];
  const props = {
    maskClosable: true,
    keyboard: false,
    onCancel: requestClose,
    onClose: requestClose,
  };

  [
    [ctx.view, "setProps"],
    [ctx.view, "setOptions"],
    [ctx.popup, "setProps"],
    [ctx.popup, "setOptions"],
    [ctx.modal, "setProps"],
    [ctx.modal, "setOptions"],
    [ctx.drawer, "setProps"],
    [ctx.drawer, "setOptions"],
    [ctx.action, "setProps"],
  ].forEach(([target, method]) => {
    if (!target || typeof target[method] !== "function") return;
    try {
      target[method](props);
    } catch (error) {
      console.warn("[MeetingCreateForm] configure modal close failed", error);
    }
  });

  const patchMethod = (target, method) => {
    if (!target || typeof target[method] !== "function") return;
    const original = target[method];
    const patchedClose = function patchedClose(...args) {
      const isSetter = method === "setVisible" || method === "setOpen";
      if (isSetter && args[0] !== false) return original.apply(this, args);
      requestClose(() => original.apply(this, args));
      return undefined;
    };
    try {
      target[method] = patchedClose;
    } catch (error) {
      console.warn("[MeetingCreateForm] patch close failed", error);
      return;
    }
    restoreFns.push(() => {
      if (target[method] !== patchedClose) return;
      try {
        target[method] = original;
      } catch {}
    });
  };

  [ctx.view, ctx.popup, ctx.modal, ctx.drawer, ctx.action, ctx].forEach(
    (target) => {
      ["onClose", "close", "closeModal", "setVisible", "setOpen"].forEach(
        (method) => patchMethod(target, method),
      );
    },
  );

  return () => {
    restoreFns.forEach((restore) => {
      try {
        restore();
      } catch {}
    });
  };
};

const getRuntimeInput = () => {
  try {
    const ia = ctx.view?.inputArgs || ctx.inputArgs || {};
    return {
      ...(ia || {}),
      ...(ia.params || {}),
      ...(ctx.action?.params || {}),
      ...(ctx.modal?.params || {}),
      ...(ctx.view?.params || {}),
      ...(ctx.popup?.params || {}),
      ...(ctx.record || {}),
    };
  } catch {
    return {};
  }
};

// ─── MeetingCreateForm ────────────────────────────────────────────────────────

const MeetingCreateForm = () => {
  const token     = useNocoToken();
  const [form]    = Form.useForm();
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers]           = useState([]);
  const [cases, setCases]           = useState([]);
  const [customers, setCustomers]   = useState([]);
  const [tasks, setTasks]           = useState([]);
  const [contracts, setContracts]   = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [hostFilterId, setHostFilterId] = useState(null);
  const [caseFilterId, setCaseFilterId] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  const allowCloseRef = useRef(false);
  const confirmCloseOpenRef = useRef(false);

  // Resolve context từ inputArgs
  const input         = useMemo(() => getRuntimeInput(), []);
  const initialTaskId = useMemo(() => extractId(input.initialTaskId || input.taskId), [input]);
  const initialContractId = useMemo(() => extractId(input.initialContractId || input.contractId), [input]);
  const initialQuotationId = useMemo(() => extractId(input.initialQuotationId || input.quotationId), [input]);
  const initialCaseId = useMemo(() => extractId(input.initialCaseId || input.caseId), [input]);
  const initialTitle  = useMemo(() => String(input.initialTitle || input.title || "").trim(), [input]);

  const customersById = useMemo(() => buildMapById(customers), [customers]);
  const casesById = useMemo(() => buildMapById(cases), [cases]);
  const hasFormWatch = !!Form.useWatch;
  const watchedHostId = hasFormWatch ? Form.useWatch("hostId", form) : null;
  const watchedCaseId = hasFormWatch ? Form.useWatch("caseId", form) : null;
  const activeHostId = hasFormWatch ? extractId(watchedHostId) : hostFilterId;
  const activeCaseId = hasFormWatch ? extractId(watchedCaseId) : caseFilterId;

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  const forceClosePopup = useCallback((nativeClose) => {
    allowCloseRef.current = true;
    setIsDirty(false);
    isDirtyRef.current = false;
    try {
      if (typeof nativeClose === "function") {
        nativeClose();
      } else {
        closeCurrentPopup();
      }
    } finally {
      window.setTimeout(() => {
        allowCloseRef.current = false;
      }, 0);
    }
  }, []);

  const requestClose = useCallback(
    (nativeClose) => {
      if (allowCloseRef.current || !isDirtyRef.current) {
        forceClosePopup(nativeClose);
        return;
      }

      if (confirmCloseOpenRef.current) return;
      confirmCloseOpenRef.current = true;
      const confirmExit = () => {
        confirmCloseOpenRef.current = false;
        forceClosePopup(nativeClose);
      };
      const keepEditing = () => {
        confirmCloseOpenRef.current = false;
      };
      const title = "Discard unsaved meeting?";
      const content = "Changes in this meeting form will be lost if you close it.";

      if (Modal && typeof Modal.confirm === "function") {
        Modal.confirm({
          title,
          content,
          okText: "Discard",
          okType: "danger",
          cancelText: "Keep editing",
          onOk: confirmExit,
          onCancel: keepEditing,
        });
        return;
      }

      if (window.confirm(`${title}\n${content}`)) confirmExit();
      else keepEditing();
    },
    [forceClosePopup],
  );

  useEffect(() => {
    return configureGuardedModalClose(requestClose);
  }, [requestClose]);

  const handleValuesChange = useCallback(() => {
    setIsDirty(true);
  }, []);

  // ── Load lookups ──────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      safeFetchList("users:list", { fields: USER_FIELDS, sort: ["nickname", "username"] }),
      safeFetchList("projects:list", { fields: PROJECT_FIELDS, sort: ["-createdAt"] }),
      safeFetchList("tasks:list", { fields: TASK_FIELDS, sort: ["-createdAt"] }),
      safeFetchList("contracts:list", { sort: ["-createdAt"] }),
      safeFetchList("quotations:list", { sort: ["-createdAt"] }),
    ])
      .then(([userRows, caseRows, taskRows, contractRows, quotationRows]) => {
        setUsers(userRows);
        setCases(caseRows);
        setTasks(taskRows);
        setContracts(contractRows);
        setQuotations(quotationRows);
        const customerIds = uniqueIds(
          [
            ...caseRows.map((r) => r.customerId || r.customer || r.customers),
            ...contractRows.map((r) => r.customerId || r.customer || r.customers),
            ...quotationRows.map((r) => r.customerId || r.customer || r.customers),
          ],
        );
        if (customerIds.length) {
          safeFetchList("customers:list", {
            fields: CUSTOMER_FIELDS,
            filter: JSON.stringify({ id: { $in: customerIds } }),
          }).then(setCustomers);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Pre-fill sau khi lookups load ─────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    const patch = {};
    if (initialTitle)  patch.title  = initialTitle;
    if (initialCaseId) patch.caseId = String(initialCaseId);
    if (initialTaskId) patch.taskId = String(initialTaskId);
    if (initialContractId) patch.contractId = String(initialContractId);
    if (initialQuotationId) patch.quotationId = String(initialQuotationId);
    if (initialCaseId) setCaseFilterId(initialCaseId);
    if (Object.keys(patch).length) form.setFieldsValue(patch);
  }, [loading, form, initialTitle, initialCaseId, initialTaskId, initialContractId, initialQuotationId]);

  // ── Options ───────────────────────────────────────────────────────────────
  const userOptions = useMemo(
    () =>
      users.filter(isSelectableUser).map((u) => ({
        value: String(extractId(u.id)),
        label: userLabel(u),
        searchText: compact([userLabel(u), u?.id]).join(" "),
      })),
    [users],
  );

  const attendeeOptions = useMemo(
    () => userOptions.filter((option) => extractId(option.value) !== activeHostId),
    [userOptions, activeHostId],
  );

  const caseOptions = useMemo(
    () =>
      cases.map((c) => {
        const primary  = caseLabel(c);
        const custId   = extractId(c.customerId || c.customer || c.customers);
        const customer = customerLabel(customersById[custId]);
        return {
          value:      String(extractId(c.id)),
          title:      primary,
          searchText: compact([primary, c?.id, customer]).join(" "),
          label: React.createElement(
            "div",
            { style: { display: "grid", gap: 2, minWidth: 0 } },
            React.createElement(
              "span",
              { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } },
              primary,
            ),
            customer
              ? React.createElement(
                  "span",
                  {
                    style: {
                      color: FALLBACK_TOKEN.colorTextSecondary,
                      fontSize: FALLBACK_TOKEN.fontSizeSM,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                  },
                  customer,
                )
              : null,
          ),
        };
      }),
    [cases, customersById],
  );

  const filteredTasks = useMemo(
    () =>
      activeCaseId
        ? tasks.filter((item) => relatedCaseId(item) === activeCaseId)
        : tasks,
    [tasks, activeCaseId],
  );

  const taskOptions = useMemo(
    () => filteredTasks.map((item) => taskOption(item, casesById, customersById)),
    [filteredTasks, casesById, customersById],
  );

  const contractOptions = useMemo(
    () => contracts.map((item) => relationOption(item, contractLabel, customersById)),
    [contracts, customersById],
  );

  const quotationOptions = useMemo(
    () => quotations.map((item) => relationOption(item, quotationLabel, customersById)),
    [quotations, customersById],
  );

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleHostChange = useCallback(
    (value) => {
      const nextHostId = extractId(value);
      setHostFilterId(nextHostId);
      if (!nextHostId) return;
      const nextAttendeeIds = uniqueIds(form.getFieldValue("attendeeIds") || [])
        .filter((id) => id !== nextHostId)
        .map(String);
      form.setFieldsValue({ attendeeIds: nextAttendeeIds });
    },
    [form],
  );

  const handleAttendeeChange = useCallback(
    (values) => {
      const nextAttendeeIds = uniqueIds(values || [])
        .filter((id) => id !== activeHostId)
        .map(String);
      form.setFieldsValue({ attendeeIds: nextAttendeeIds });
    },
    [form, activeHostId],
  );

  const handleCaseChange = useCallback(
    (value) => {
      const nextCaseId = extractId(value);
      setCaseFilterId(nextCaseId);
      const currentTaskId = extractId(form.getFieldValue("taskId"));
      if (!nextCaseId || !currentTaskId) return;
      const currentTask = tasks.find((item) => extractId(item?.id) === currentTaskId);
      if (currentTask && relatedCaseId(currentTask) !== nextCaseId) {
        form.setFieldsValue({ taskId: undefined });
      }
    },
    [form, tasks],
  );

  const handleSubmit = useCallback(async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    const hostId = extractId(values.hostId);
    const meetingRange = Array.isArray(values.meetingRange) ? values.meetingRange : [];
    const startAt = toNativeDate(meetingRange[0]);
    const endAt = toNativeDate(meetingRange[1]);
    const linkedTaskId = extractId(values.taskId);
    const linkedContractId = extractId(values.contractId);
    const linkedQuotationId = extractId(values.quotationId);

    if (!hostId) {
      message.error("Host is required.");
      return;
    }
    if (!startAt || !endAt) {
      message.error("Meeting time is invalid.");
      return;
    }
    if (endAt < startAt) {
      message.error("End time must be after start time.");
      return;
    }
    setSubmitting(true);
    try {
      // 1. Tạo meeting
      const createRes = await ctx.api.request({
        url:    "meetings:create",
        method: "POST",
        data: {
          title:       String(values.title || "").trim(),
          meetingDate: toDateTimeString(startAt),
          startTime:   toTimeString(startAt),
          endTime:     toTimeString(endAt),
          location:    String(values.location || "").trim() || null,
          status:      values.status || "scheduled",
          type:        values.type   || "internal",
          description: String(values.description || "").trim() || null,
          hostId,
          caseId:      extractId(values.caseId) || null,
        },
      });

      const newMeetingId = extractId(
        createRes?.data?.data?.id ||
        createRes?.data?.id       ||
        createRes?.id,
      );

      if (!newMeetingId) throw new Error("Could not resolve new meeting id.");

      // 2. Tạo attendee records (host + guests)
      const selectedAttendeeIds = uniqueIds(values.attendeeIds || []);
      const guestIds = selectedAttendeeIds.filter((id) => id !== hostId);

      await ctx.api.request({
        url:    "meetingAttendees:create",
        method: "POST",
        data: {
          meetingId:        newMeetingId,
          userId:           hostId,
          isHost:           true,
          attendanceStatus: ATTENDANCE_STATUS_CONFIRMED,
        },
      });

      for (const userId of guestIds) {
        await ctx.api.request({
          url:    "meetingAttendees:create",
          method: "POST",
          data: {
            meetingId:        newMeetingId,
            userId,
            isHost:           false,
            attendanceStatus: ATTENDANCE_STATUS_PENDING,
          },
        });
      }

      // 3. Link task nếu có initialTaskId
      const linkPayload = {};
      if (linkedTaskId) linkPayload.taskId = linkedTaskId;
      if (linkedContractId) linkPayload.contractId = linkedContractId;
      if (linkedQuotationId) linkPayload.quotationId = linkedQuotationId;

      if (Object.keys(linkPayload).length) {
        try {
          await ctx.api.request({
            url: `meetings:update?filterByTk=${newMeetingId}`,
            method: "POST",
            data: linkPayload,
          });
        } catch (linkErr) {
          console.warn("[MeetingCreateForm] optional meeting links were not saved", linkErr);
          message.warning("Meeting created, but optional links were not saved. Please check Meeting fields.");
        }
      }

      if (linkedTaskId) {
        await ctx.api.request({
          url:    "meetingTasks:create",
          method: "POST",
          data: {
            meetingId: newMeetingId,
            taskId:    linkedTaskId,
            addedAt:   new Date().toISOString().slice(0, 10),
          },
        });
      }

      message.success("Meeting created.");
      emitMeetingChanged({ action: "created", meetingId: newMeetingId });
      await refreshNocoBaseDataBlocks();

      // 4. Đóng popup
      forceClosePopup();

    } catch (err) {
      console.error("[MeetingCreateForm] submit failed", err);
      message.error(err?.message || "Could not create meeting.");
    } finally {
      setSubmitting(false);
    }
  }, [form, forceClosePopup]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return React.createElement(
      "div",
      { style: { padding: 40, textAlign: "center" } },
      React.createElement(Spin, null),
    );
  }

  const fieldStyle = { marginBottom: 0, minWidth: 0 };
  const titleFieldStyle = { ...fieldStyle, gridColumn: "span 2" };
  const caseTaskFieldStyle = {
    ...fieldStyle,
    gridColumn: "span 2",
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px 12px",
    minWidth: 0,
  };
  const fullFieldStyle = { ...fieldStyle, gridColumn: "1 / -1" };
  const selectStyle = { width: "100%", minWidth: 0 };

  return React.createElement(
    "div",
    { style: { padding: token.paddingSM } },
    React.createElement(
      Form,
      {
        form,
        layout: "vertical",
        requiredMark: false,
        onValuesChange: handleValuesChange,
      },
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "10px 12px",
            alignItems: "start",
            minWidth: 0,
          },
        },

        // Title
        React.createElement(
          Form.Item,
          {
            name:  "title",
            label: "Title",
            rules: [{ required: true, message: "Please enter a title." }],
            style: titleFieldStyle,
          },
          React.createElement(Input, { placeholder: "Enter meeting title", style: { width: "100%" } }),
        ),

        // Host
        React.createElement(
          Form.Item,
          {
            name:  "hostId",
            label: "Host",
            rules: [{ required: true, message: "Please select a host." }],
            style: fieldStyle,
          },
          React.createElement(Select, {
            showSearch:       true,
            optionFilterProp: "label",
            filterOption:     selectFilterOption,
            options:          userOptions,
            placeholder:      "Select host",
            style:            selectStyle,
            onChange:         handleHostChange,
          }),
        ),
        React.createElement(
          Form.Item,
          {
            name:  "attendeeIds",
            label: "Attendees",
            style: fieldStyle,
          },
          React.createElement(Select, {
            mode:             "multiple",
            allowClear:       true,
            showSearch:       true,
            maxTagCount:      "responsive",
            optionFilterProp: "label",
            filterOption:     selectFilterOption,
            options:          attendeeOptions,
            placeholder:      "Invite attendees",
            style:            selectStyle,
            onChange:         handleAttendeeChange,
          }),
        ),
        // Case + Task
        React.createElement(
          "div",
          { style: caseTaskFieldStyle },
          React.createElement(
            Form.Item,
            { name: "caseId", label: "Case", style: fieldStyle },
            React.createElement(Select, {
              allowClear:       true,
              showSearch:       true,
              optionFilterProp: "searchText",
              optionLabelProp:  "title",
              filterOption:     selectFilterOption,
              options:          caseOptions,
              placeholder:      "Select related case (optional)",
              style:            selectStyle,
              onChange:         handleCaseChange,
            }),
          ),

        // Start + End datetime (span toàn bộ chiều rộng)
        React.createElement(
          Form.Item,
          { name: "taskId", label: "Task", style: fieldStyle },
          React.createElement(Select, {
            allowClear: true,
            showSearch: true,
            optionFilterProp: "searchText",
            optionLabelProp: "title",
            filterOption: selectFilterOption,
            options: taskOptions,
            placeholder: "Select related task (optional)",
            style: selectStyle,
          }),
        ),
        ),
        React.createElement(
          Form.Item,
          { name: "contractId", label: "Contract", style: fieldStyle },
          React.createElement(Select, {
            allowClear: true,
            showSearch: true,
            optionFilterProp: "searchText",
            optionLabelProp: "title",
            filterOption: selectFilterOption,
            options: contractOptions,
            placeholder: "Select related contract (optional)",
            style: selectStyle,
          }),
        ),
        React.createElement(
          Form.Item,
          { name: "quotationId", label: "Quotation", style: fieldStyle },
          React.createElement(Select, {
            allowClear: true,
            showSearch: true,
            optionFilterProp: "searchText",
            optionLabelProp: "title",
            filterOption: selectFilterOption,
            options: quotationOptions,
            placeholder: "Select related quotation (optional)",
            style: selectStyle,
          }),
        ),
        React.createElement(
          "div",
          {
            style: {
              gridColumn: "1 / -1",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 0,
              minWidth: 0,
            },
          },
          React.createElement(
            Form.Item,
            {
              name:  "meetingRange",
              label: "Meeting time",
              rules: [{ required: true, message: "Please select meeting time." }],
              style: fieldStyle,
            },
            React.createElement(RangePicker, {
              showTime: { format: "HH:mm", minuteStep: 5 },
              format: "DD/MM/YYYY HH:mm",
              placeholder: ["Start time", "End time"],
              style: { width: "100%" },
            }),
          ),
        ),

        // Status + Type
        React.createElement(
          Form.Item,
          { name: "status", label: "Status", initialValue: "scheduled", style: fieldStyle },
          React.createElement(Select, { options: STATUS_OPTIONS, style: selectStyle }),
        ),
        React.createElement(
          Form.Item,
          { name: "type", label: "Type", initialValue: "internal", style: fieldStyle },
          React.createElement(Select, { options: TYPE_OPTIONS, style: selectStyle }),
        ),

        // Location
        React.createElement(
          Form.Item,
          { name: "location", label: "Location / Link", style: fieldStyle },
          React.createElement(Input, {
            placeholder: "Room, address or online meeting link",
            style: { width: "100%" },
          }),
        ),
        

        // Attendees (multi-select, không kể host)
        React.createElement(
          Form.Item,
          {
            name:  "__legacyAttendeeIds",
            label: "Attendees",
            style: { display: "none" },
          },
          React.createElement(Select, {
            mode:             "multiple",
            allowClear:       true,
            showSearch:       true,
            maxTagCount:      "responsive",
            optionFilterProp: "label",
            options:          userOptions,
            placeholder:      "Invite attendees (host added automatically)",
            style:            selectStyle,
          }),
        ),

        // Description / Agenda
        React.createElement(
          Form.Item,
          {
            name:  "description",
            label: "Agenda / Description",
            style: fullFieldStyle,
          },
          React.createElement(TextArea, {
            rows:        4,
            placeholder: "Write meeting agenda or notes...",
            style:       { width: "100%" },
          }),
        ),
      ),

      // Context info (hiển thị khi có initialTaskId)
      initialTaskId
        ? React.createElement(
            "div",
            {
              style: {
                marginTop: 4,
                padding:   "8px 12px",
                background: "#f0f9ff",
                border:     "1px solid #bae0ff",
                borderRadius: token.borderRadius,
                fontSize:   FALLBACK_TOKEN.fontSizeSM,
                color:      "#0958d9",
              },
            },
            `This meeting will be automatically linked to Task #${initialTaskId} after creation.`,
          )
        : null,

      // Actions
      React.createElement(
        "div",
        {
          style: {
            display:        "flex",
            justifyContent: "flex-end",
            gap:            8,
            marginTop:      16,
          },
        },
        React.createElement(
          Button,
          {
            onClick: () => requestClose(),
          },
          "Cancel",
        ),
        React.createElement(
          Button,
          {
            type:    "primary",
            loading: submitting,
            onClick: handleSubmit,
          },
          "Create meeting",
        ),
      ),
    ),
  );
};

ctx.render(React.createElement(MeetingCreateForm, null));
