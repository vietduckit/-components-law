    // ============================================================
    // CaseComments.js — khung "Comments & Reports" cho Case
    // ------------------------------------------------------------
    // Toàn bộ phần thân (QuillEditor, CommentComposer, UnifiedNoteThread,
    // FileUploadModal, PreviewModal, LibraryMoveModal và các helper) được
    // TÁCH NGUYÊN từ Task/TaskDetailView.js để UI/hành vi giống hệt Task.
    // Chỉ khác:
    //   1. CASE_COMMENT_CONFIG bên dưới
    //   2. 4 chỗ vá đánh dấu [CASE] (document link/filter theo caseId,
    //      nguồn legalStudySource = case_note)
    //   3. §CASE wrapper ở cuối file (bootstrap + header)
    // FILE SINH TỰ ĐỘNG — không sửa tay. Sau khi sửa khung comment ở Task,
    // chạy lại: node scripts/case-comments/build.mjs
    // Thay đổi riêng cho Case: sửa scripts/case-comments/wrapper.js hoặc
    // các patch [CASE] trong build.mjs.
    // ============================================================
    const CASE_COMMENT_CONFIG = {
      // Collection của Case trong notes.collectionName / documents.collectionName
      COLLECTION_NAME: "Project",
      // folders.type của folder gốc Case (nơi file upload từ comment rơi vào)
      ROOT_FOLDER_TYPE: "cases",
      // Chiều cao khung: composer cố định trên, danh sách cuộn bên dưới
      PANEL_HEIGHT: "calc(100vh - 220px)",
      PANEL_MIN_HEIGHT: 560,
    };

    // ============================================================
    // §1 CONFIG — không import, không side-effect
    // ============================================================
    const { React } = ctx;
    const { useState, useEffect, useCallback, useMemo, useRef } = React;
    const {
      Spin,
      Typography,
      Select,
      message,
      Modal,
      Tag,
      Upload,
      Form,
      Input,
      Button,
      Table,
      Tooltip,
      Drawer,
      Tabs,
      Descriptions,
      Space,
      Empty,
      Mentions,
      Avatar,
      TreeSelect,
      Dropdown,
      Segmented,
      Checkbox,
    } = ctx.antd;
    const { Text } = Typography;
    const { Dragger } = Upload;

    const PROJECT_ID = ctx.record?.id;
    const CASE_DOCUMENT_SCOPE = "case_document";
    // Internal Work (projectInternal) tasks store their documents in a
    // completely separate space from Case tasks — same shape as
    // ProjectDocument.js's own DASHBOARD_CONFIG.moduleScope/storageType for
    // this space, so folders/documents created here from a task upload land
    // in the exact same scope ProjectDocument.js already reads.
    const PROJECT_INTERNAL_MODULE_SCOPE = "project_internal";
    const LEGAL_STUDY_MODULE_SCOPE = "legal_study";
    const LEGAL_STUDY_STORAGE_TYPE = "legal_study";
    const LEGAL_STUDY_LABEL = "Reference";
    const LEGAL_REFERENCE_MODULE_SCOPE = "legal_reference";
    const LEGAL_REFERENCE_STORAGE_TYPE = "legal_reference";
    const LEGAL_REFERENCE_LABEL = "Legal Reference";
    const MY_DOCUMENT_STORAGE_TYPE = "personal";
    const KNOWLEDGE_STORAGE_TYPE = "knowledge";
    const LIBRARY_DESTINATION = {
      LEGAL_STUDY: "legal_study",
      LEGAL_REFERENCE: "legal_reference",
      CASE_DOCUMENT: "case_document",
      KNOWLEDGE: "knowledge",
      PROJECT_INTERNAL_DOCUMENT: "project_internal_document",
      CUSTOMER_DOCUMENT: "customer_document",
    };
    const LIBRARY_DESTINATION_CONFIG = {
      [LIBRARY_DESTINATION.LEGAL_STUDY]: {
        label: LEGAL_STUDY_LABEL,
        moduleScope: LEGAL_STUDY_MODULE_SCOPE,
        storageType: LEGAL_STUDY_STORAGE_TYPE,
        relationField: "legalStudyId",
        listCandidates: [
          "legalStudy:list",
          "legalStudies:list",
          "LegalStudy:list",
        ],
        // Fields tried in order (via extractId) to read this destination's
        // own parent-record id off a document/folder record — see the
        // generic getLibraryRecordId/getRecordDestinationId below.
        recordIdFields: ["legalStudyId", "legalStudy", "legalStudies", "legalStudiesId"],
      },
      [LIBRARY_DESTINATION.LEGAL_REFERENCE]: {
        label: LEGAL_REFERENCE_LABEL,
        moduleScope: LEGAL_REFERENCE_MODULE_SCOPE,
        storageType: LEGAL_REFERENCE_STORAGE_TYPE,
        relationField: "legalReferenceId",
        listCandidates: [
          "legalReference:list",
          "legalReferences:list",
          "LegalReference:list",
        ],
        recordIdFields: ["legalReferenceId", "legalReference", "legalReferenceRecord"],
      },
      // No "parent record" picker step — the parent is always the current
      // case (sourceContext.caseId). Only the folder-tree picker applies.
      [LIBRARY_DESTINATION.CASE_DOCUMENT]: {
        label: "Document",
        moduleScope: CASE_DOCUMENT_SCOPE,
        storageType: "cases",
        relationField: "folderId",
        listCandidates: [],
      },
      // Company-level Knowledge library (matches Library.js's Knowledge
      // space — storageType/moduleScope "knowledge"). No "parent record"
      // picker either: Knowledge isn't scoped to a single case/company the
      // way Legal Study/Reference are scoped to one record, so the folder
      // tree lists every Knowledge folder directly and internalCompanyId is
      // inherited from whichever folder gets picked (see LibraryMoveModal).
      [LIBRARY_DESTINATION.KNOWLEDGE]: {
        label: "Library",
        moduleScope: "knowledge",
        storageType: "knowledge",
        relationField: "folderId",
        listCandidates: [],
      },
      // Same shape as CASE_DOCUMENT — no parent-record picker, the parent is
      // always the current Internal Work item (sourceContext.projectInternalId).
      // Matches ProjectDocument.js's own DASHBOARD_CONFIG scope for this space.
      [LIBRARY_DESTINATION.PROJECT_INTERNAL_DOCUMENT]: {
        label: "Internal Work Document",
        moduleScope: PROJECT_INTERNAL_MODULE_SCOPE,
        storageType: "project_internal",
        relationField: "folderId",
        listCandidates: [],
      },
      // Parent-record picker like Legal Study/Reference (browse customers),
      // then a folder tree scoped to that customer's own folders. Filtered
      // purely by folders.customerId matching the picked customer — mirrors
      // CustomerDocument.js's own "customer" space predicate exactly (no
      // moduleScope filter there either, since Customer folders share
      // moduleScope with Case folders — see fetchCustomerDocumentFolders).
      [LIBRARY_DESTINATION.CUSTOMER_DOCUMENT]: {
        label: "Customer",
        // Matches CustomerDocument.js's own DASHBOARD_CONFIG.moduleScope —
        // Customer folders/documents are written under the same scope Case
        // folders use; only folders.customerId actually distinguishes them
        // (see fetchCustomerDocumentFolders).
        moduleScope: CASE_DOCUMENT_SCOPE,
        storageType: "customer",
        relationField: "customerId",
        listCandidates: ["customers:list", "customer:list"],
        recordIdFields: ["customerId", "customers", "customer"],
      },
    };
    // Categories the unified "Move to Library" action offers, per task
    // context — Case tasks only ever had Reference; Internal Work tasks had
    // Reference/Customer/Knowledge as 3 separate menu entries. Merging them
    // into one "Move to Library" entry (with an in-modal category switch,
    // see LibraryMoveModal) means every task context now has exactly the
    // same 2-action habit: "Move to <current workspace> Document" + "Move
    // to Library" — Library itself is where the destination-specific
    // choice happens, instead of at the menu level.
    const getLibraryMoveCategories = (isProjectInternalContext) =>
      isProjectInternalContext
        ? [
            LIBRARY_DESTINATION.KNOWLEDGE,
            LIBRARY_DESTINATION.CUSTOMER_DOCUMENT,
            LIBRARY_DESTINATION.LEGAL_STUDY,
          ]
        : [LIBRARY_DESTINATION.LEGAL_STUDY];
    const LIBRARY_SOURCE = {
      CASE_DOCUMENT: "case_document",
      CASE_REFERENCE: "case_reference",
      LEGAL_REFERENCE: "legal_reference",
      LEGAL_STUDY: "legal_study",
      MY_DOCUMENTS: "my_documents",
      KNOWLEDGE: "knowledge",
      // The current Internal Work's own Document space (ProjectDocument.js)
      // — only offered for ProjectInternal tasks (buildTaskWorkspaceLibraryTree).
      PROJECT_INTERNAL_DOCUMENT: "project_internal_document",
    };
    // Values written to activity_log.action, which is a length-capped
    // varchar(20) column — every value here must stay at or under 20
    // characters. The two newer ones were originally the full
    // "move_to_project_internal_document" (33 chars) / "move_to_customer_document"
    // (25 chars), which the DB silently rejected with "value too long for
    // type character varying(20)" on every move.
    const ACTIVITY_ACTION = {
      LINK_LEGAL_STUDY: "link_legal_study",
      LINK_LEGAL_REFERENCE: "link_legal_ref",
      MOVE_TO_CASE_DOCUMENT: "move_to_document",
      MOVE_TO_KNOWLEDGE: "move_to_knowledge",
      MOVE_TO_PROJECT_INTERNAL_DOCUMENT: "move_to_pi_doc",
      MOVE_TO_CUSTOMER_DOCUMENT: "move_to_customer",
    };
    const FONT =
      "Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

    // 🌟 CONFIG URL DEEP-LINK CHO BÌNH LUẬN (Gán cứng các UID Route để dễ bảo trì)
    const originURL = window.location.origin;

    const DEEP_LINK_CONFIG = {
      // 1. Host và đường dẫn Admin
      ORIGIN: originURL,
      ADMIN_PATH: "admin/aoy5h2zeeq3",

      // 2. UID của View và Tab chính (Nơi chứa danh sách Task)
      MAIN_VIEW: "view/dq2npsytcgh",
      MAIN_TAB: "tab/1tj9l1v5l8t",

      // 3. UID của View Task Detail (Giao diện Modal/Drawer hiện tại)
      TASK_VIEW: "view/a5c9c251a6a",

      // 3b. UID của View Case Detail (Trang chi tiết vụ việc)
      CASE_VIEW: "view/20q5aaq1zkf",

      // 3c. Admin path & UID của View Internal Project Detail (app riêng)
      INTERNAL_PROJECT_ADMIN_PATH: "admin/svsft7j86ku",
      INTERNAL_PROJECT_VIEW: "view/363e970fb7f",

      // 4. Các từ khóa định nghĩa segment
      KW_FILTER: "filterbytk",
      KW_SOURCE: "sourceid",

      // 5. Hàm lắp ghép URL (Hardcoded Structure)
      buildUrl: (taskId, caseId) => {
        const {
          ORIGIN,
          ADMIN_PATH,
          MAIN_VIEW,
          MAIN_TAB,
          TASK_VIEW,
          KW_FILTER,
          KW_SOURCE,
        } = DEEP_LINK_CONFIG;

        // Lắp ghép theo đúng cấu trúc: Origin/Admin/MainView/Tab/CaseFilter/TaskView/TaskFilter/Source
        return [
          ORIGIN,
          ADMIN_PATH,
          MAIN_VIEW,
          MAIN_TAB,
          `${KW_FILTER}/${caseId}`,
          TASK_VIEW,
          `${KW_FILTER}/${taskId}`,
          `${KW_SOURCE}/${caseId}`,
        ].join("/");
      },

      // 6. Hàm lắp ghép URL đi thẳng tới trang chi tiết vụ việc (Case)
      buildCaseUrl: (caseId) => {
        const { ORIGIN, ADMIN_PATH, CASE_VIEW, KW_FILTER } = DEEP_LINK_CONFIG;
        return [ORIGIN, ADMIN_PATH, CASE_VIEW, `${KW_FILTER}/${caseId}`].join("/");
      },

      // 7. Hàm lắp ghép URL đi thẳng tới trang chi tiết dự án nội bộ (Internal Project)
      buildInternalProjectUrl: (projectInternalId) => {
        const { ORIGIN, INTERNAL_PROJECT_ADMIN_PATH, INTERNAL_PROJECT_VIEW, KW_FILTER } =
          DEEP_LINK_CONFIG;
        return [
          ORIGIN,
          INTERNAL_PROJECT_ADMIN_PATH,
          INTERNAL_PROJECT_VIEW,
          `${KW_FILTER}/${projectInternalId}`,
        ].join("/");
      },
    };

    const DOC_TYPE_SUGGESTIONS = [
      "Contract",
      "Minutes",
      "Decision",
      "Proposal",
      "Report",
      "Evidence / Records",
      "Official Letter",
      "Petition",
      "Appendix",
      "Meeting Minutes",
      "Template File",
      "Other",
    ];

    const FILE_EXT_ICON = {
      ".pdf": { icon: "📄", color: "#ff4d4f", bg: "#fff2f0" },
      ".doc": { icon: "📝", color: "#1890ff", bg: "#e6f7ff" },
      ".docx": { icon: "📝", color: "#1890ff", bg: "#e6f7ff" },
      ".xls": { icon: "📊", color: "#52c41a", bg: "#f6ffed" },
      ".xlsx": { icon: "📊", color: "#52c41a", bg: "#f6ffed" },
      ".png": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
      ".jpg": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
      ".jpeg": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
      ".gif": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
      ".webp": { icon: "🖼️", color: "#722ed1", bg: "#f9f0ff" },
    };

    const makeSvgIcon = (children, options = {}) =>
      React.createElement(
        "svg",
        {
          width: options.size || 16,
          height: options.size || 16,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: options.strokeWidth || 1.8,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          style: { display: "block" },
        },
        ...children,
      );

    const TASK_FILE_ACTION_ICONS = {
      more: makeSvgIcon([
        React.createElement("circle", { key: "a", cx: 5, cy: 12, r: 1.4 }),
        React.createElement("circle", { key: "b", cx: 12, cy: 12, r: 1.4 }),
        React.createElement("circle", { key: "c", cx: 19, cy: 12, r: 1.4 }),
      ]),
      preview: makeSvgIcon([
        React.createElement("path", {
          key: "a",
          d: "M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z",
        }),
        React.createElement("circle", { key: "b", cx: 12, cy: 12, r: 2.6 }),
      ]),
      download: makeSvgIcon([
        React.createElement("path", { key: "a", d: "M12 3v11" }),
        React.createElement("path", { key: "b", d: "m7 10 5 5 5-5" }),
        React.createElement("path", { key: "c", d: "M5 20h14" }),
      ]),
      edit: makeSvgIcon([
        React.createElement("path", {
          key: "a",
          d: "M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z",
        }),
        React.createElement("path", { key: "b", d: "m14 7 3 3" }),
      ]),
      replace: makeSvgIcon([
        React.createElement("path", { key: "a", d: "M3 12a9 9 0 0 1 15-6.7L21 8" }),
        React.createElement("path", { key: "b", d: "M21 3v5h-5" }),
        React.createElement("path", { key: "c", d: "M21 12a9 9 0 0 1-15 6.7L3 16" }),
        React.createElement("path", { key: "d", d: "M3 21v-5h5" }),
      ]),
      moveLegalStudy: makeSvgIcon([
        React.createElement("path", { key: "a", d: "M4 5h7l2 2h7v12H4z" }),
        React.createElement("path", { key: "b", d: "M9 14h6" }),
        React.createElement("path", { key: "c", d: "m13 11 3 3-3 3" }),
      ]),
      moveLegalReference: makeSvgIcon([
        React.createElement("path", { key: "a", d: "M7 4h8l4 4v12H7z" }),
        React.createElement("path", { key: "b", d: "M15 4v5h5" }),
        React.createElement("path", { key: "c", d: "M4 8v12h3" }),
      ]),
      folder: makeSvgIcon([
        React.createElement("path", {
          key: "a",
          d: "M3 7h7l2 2h9v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
        }),
      ]),
    };

    // ============================================================
    // §2 UTILS
    // ============================================================
    // 🌟 HÀM EXTRACT ID AN TOÀN TUYỆT ĐỐI (Xử lý cả mảng, object, string)
    const extractId = (val) => {
      if (val === null || val === undefined || val === "") return null;
      if (Array.isArray(val)) return val.length > 0 ? extractId(val[0]) : null;
      if (typeof val === "object") return val.id ? parseInt(val.id, 10) : null;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? null : parsed;
    };

    // Returns `fileName` unchanged if it doesn't collide (case-insensitive)
    // with anything in `existingNames`; otherwise appends " (1)", " (2)", ...
    // before the extension — same convention Windows/macOS use for "a copy
    // of a file with the same name" — until a free name is found.
    // `existingNames` is treated as case-insensitive and NOT mutated;
    // callers doing a batch upload should add each returned name back into
    // their own tracking set before checking the next file, so within-batch
    // collisions are caught too.
    const getUniqueFileName = (fileName, existingNames) => {
      const raw = String(fileName || "").trim();
      if (!raw) return raw;
      const taken = new Set(
        Array.from(existingNames || [], (n) => String(n || "").trim().toLowerCase()),
      );
      if (!taken.has(raw.toLowerCase())) return raw;
      const dotIndex = raw.lastIndexOf(".");
      const base = dotIndex > 0 ? raw.slice(0, dotIndex) : raw;
      const ext = dotIndex > 0 ? raw.slice(dotIndex) : "";
      let counter = 1;
      let candidate = `${base} (${counter})${ext}`;
      while (taken.has(candidate.toLowerCase())) {
        counter += 1;
        candidate = `${base} (${counter})${ext}`;
      }
      return candidate;
    };

    const getPrimaryAttachment = (file) =>
      Array.isArray(file?.fileAttachment) ? file.fileAttachment[0] : file?.fileAttachment;

    const withSyncedDocumentFileTitle = (file, title) => {
      const nextAttachment = Array.isArray(file?.fileAttachment)
        ? file.fileAttachment.map((att, index) =>
            index === 0 ? { ...att, title, filename: title } : att,
          )
        : file?.fileAttachment
          ? { ...file.fileAttachment, title, filename: title }
          : file?.fileAttachment;
      return { ...file, title, name: title, fileAttachment: nextAttachment };
    };

    const getPathnameFromValue = (value) => {
      const raw = String(value || "").trim();
      if (!raw) return "";
      try {
        return new URL(raw, window.location.origin).pathname;
      } catch (error) {
        return raw.split("?")[0].split("#")[0];
      }
    };

    const getPathSegmentId = (segmentName, pathValue = window.location.pathname) => {
      const segments = getPathnameFromValue(pathValue).split("/");
      const idx = segments.findIndex((part) => part.toLowerCase() === segmentName.toLowerCase());
      return idx >= 0 && segments[idx + 1] ? extractId(segments[idx + 1]) : null;
    };

    const getDeepLinkCaseId = (fallbackCaseId) =>
      extractId(fallbackCaseId) ||
      getPathSegmentId(DEEP_LINK_CONFIG.KW_SOURCE) ||
      getPathSegmentId(DEEP_LINK_CONFIG.KW_FILTER) ||
      extractId(ctx.record?.caseId) ||
      extractId(ctx.record?.projectId);

    const normalizeLookupText = (val) =>
      String(val || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    const fmt = (iso, mode) => {
      if (!iso) return null;
      const d = new Date(iso);
      const dd = d.getDate().toString().padStart(2, "0");
      const mm = (d.getMonth() + 1).toString().padStart(2, "0");
      const yy = d.getFullYear();
      const hh = d.getHours().toString().padStart(2, "0");
      const mi = d.getMinutes().toString().padStart(2, "0");
      if (mode === "full") return `${dd}/${mm}/${yy} ${hh}:${mi}`;
      if (mode === "date") return `${dd}/${mm}/${yy}`;
      return `${dd}/${mm}`;
    };

    const getFileIcon = (ext) => {
      const e = (ext || "").toLowerCase();
      let url = "https://img.icons8.com/color/48/000000/file.png";
      if (e === ".pdf") url = "https://img.icons8.com/color/48/000000/pdf.png";
      else if ([".doc", ".docx"].includes(e))
        url = "https://img.icons8.com/color/48/000000/microsoft-word-2019.png";
      else if ([".xls", ".xlsx"].includes(e))
        url = "https://img.icons8.com/color/48/000000/microsoft-excel-2019.png";
      else if ([".ppt", ".pptx"].includes(e))
        url =
          "https://img.icons8.com/color/48/000000/microsoft-powerpoint-2019.png";
      else if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(e))
        url = "https://img.icons8.com/color/48/000000/image.png";

      return React.createElement("img", {
        src: url,
        style: { width: 22, height: 22, flexShrink: 0, objectFit: "contain" },
        alt: "icon",
      });
    };

    // Shared by every bulk-download entry point (comment attachments'
    // renderBulkSelectBar, the folder-group download button, and the
    // Attachments section's file grid) — these live in different
    // components in this file, so this stays a module-level helper rather
    // than something scoped to any one of them.
    //
    // Bundles everything into one .zip and triggers a single download,
    // instead of firing one download per file (2026-09-05 — that earlier
    // approach, even using a proper <a download> click instead of
    // window.open, still failed for more than 1 file: Chrome/Edge silently
    // block every programmatic download after the first when a page fires
    // several in a row — its built-in "this site is trying to download
    // multiple files" guard — so only file #1 ever actually arrived).
    // Bundling into one archive means exactly ONE download, which that
    // guard doesn't touch. A single file skips zipping entirely and just
    // downloads directly. Reuses PizZip (already loaded elsewhere in this
    // file for DOCX generation, see e.g. TaskTemplateGenerateModal) instead
    // of adding a second zip library.
    // Deliberately never appended to document.body — this whole flow runs
    // inside an SES-locked-down sandbox (confirmed live, 2026-09-05:
    // "Access to document prop 'body' is not allowed"), and modern
    // browsers don't require an element to be in the DOM for .click() to
    // trigger navigation/download anyway.
    const downloadSingleFile = (item) => {
      const a = document.createElement("a");
      a.href = item.url;
      if (item.filename) a.download = item.filename;
      a.target = "_blank";
      a.rel = "noopener";
      a.click();
    };
    const downloadFilesAsZip = async (items, zipName = "files.zip") => {
      const list = (items || [])
        .map((item) => (typeof item === "string" ? { url: item } : item))
        .filter((item) => item?.url);
      if (list.length === 0) return;
      if (list.length === 1) {
        downloadSingleFile(list[0]);
        return;
      }
      const hideLoading = message.loading(
        `Preparing ${list.length} files...`,
        0,
      );
      try {
        const PizZipModule = await ctx.importAsync(
          "https://esm.sh/pizzip@3.1.4",
        );
        const PizZip = PizZipModule.default || PizZipModule;
        const zip = new PizZip();
        const usedNames = new Set();
        let fetched = 0;
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          let buf;
          try {
            // ctx.api.request, not fetch — no global fetch in this
            // sandbox. rawUrl is the attachment's own relative url field;
            // baseURL: "/" makes ctx.api.request treat it as root-relative
            // instead of appending it to the API's normal base path —
            // the exact call buildFilledDocxBlob already uses to read a
            // document's bytes.
            const res = await ctx.api.request({
              url: item.rawUrl || item.url,
              method: "GET",
              responseType: "arraybuffer",
              baseURL: "/",
            });
            buf = res.data;
          } catch (fetchErr) {
            console.error(
              "[downloadFilesAsZip] fetch failed for",
              item.rawUrl || item.url,
              fetchErr,
            );
            continue; // one bad file shouldn't sink the whole zip
          }
          const rawName = item.filename || `file-${i + 1}`;
          let finalName = rawName;
          let n = 2;
          while (usedNames.has(finalName)) {
            const dot = rawName.lastIndexOf(".");
            finalName =
              dot > 0
                ? `${rawName.slice(0, dot)} (${n})${rawName.slice(dot)}`
                : `${rawName} (${n})`;
            n++;
          }
          usedNames.add(finalName);
          zip.file(finalName, buf);
          fetched++;
        }
        if (fetched === 0) {
          message.error(
            "Could not fetch any of the selected files — see console for details.",
          );
          return;
        }
        const blob = zip.generate({ type: "blob", compression: "DEFLATE" });
        // Uploaded rather than handed to the browser via
        // URL.createObjectURL — the same round-trip the DOCX-generation
        // feature already uses for its own generated blob
        // (uploadTaskAttachment), avoiding an untested Web API in this
        // sandbox in favor of the same server-upload-then-link path every
        // other client-generated file in this app already takes.
        const uploaded = await uploadTaskAttachment(blob, zipName);
        downloadSingleFile({
          url: getFullUrl(uploaded.url),
          filename: zipName,
        });
        if (fetched < list.length) {
          message.warning(
            `${zipName}: ${fetched}/${list.length} files included — the rest couldn't be fetched (see console).`,
          );
        }
      } catch (e) {
        console.error("[downloadFilesAsZip] failed", e);
        message.error("Could not build the zip — see console for details.");
      } finally {
        hideLoading();
      }
    };

    const userName = (u) =>
      u?.nickname ||
      `${u?.firstName || ""} ${u?.lastName || ""}`.trim() ||
      u?.username ||
      u?.email ||
      null;

    const getFullUrl = (url) =>
      !url
        ? null
        : url.startsWith("http")
          ? url
          : `${window.location.origin}${url}`;

    const addPdfFitHash = (url) => {
      if (!url) return url;
      const joiner = url.includes("#") ? "&" : "#";
      return `${url}${joiner}view=FitH&navpanes=0`;
    };

    const previewFrameShellStyle = (height, options = {}) => ({
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      height,
      boxSizing: "border-box",
      overflowX: "hidden",
      overflowY: "hidden",
      background: options.background || "#f8f9fa",
      display: "flex",
      justifyContent: "center",
      alignItems: "stretch",
      borderTop: options.borderTop || undefined,
    });

    const previewIframeStyle = (height, options = {}) => ({
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      height: options.iframeHeight || height,
      border: "none",
      display: "block",
      background: "#fff",
    });

    const scalePreviewLength = (height, ratio, extraPx = 0) => {
      if (typeof height === "number") return Math.ceil(height * ratio + extraPx);
      const raw = String(height || "").trim();
      if (!raw) return extraPx;
      const match = raw.match(/^(-?\d*\.?\d+)([a-z%]+)$/i);
      if (match) {
        const value = Number(match[1]);
        return `calc(${value * ratio}${match[2]} + ${extraPx}px)`;
      }
      return `calc(${raw} + ${extraPx}px)`;
    };

    const renderTaskFilePreviewFrame = ({
      fullUrl,
      title,
      isPdf,
      isImage,
      isOffice,
      officeViewerUrl,
      height = 640,
      modal = false,
    }) => {
      const shellHeight = height;
      const officeScale = modal ? 0.96 : 0.9;
      const officeScaleRatio = 1 / officeScale;
      const officeIframeHeight = scalePreviewLength(shellHeight, officeScaleRatio, 42);
      const officeIframeWidth = `${officeScaleRatio * 100}%`;
      const shellStyle = previewFrameShellStyle(shellHeight, {
        background: modal ? "#f5f5f5" : "#f8f9fa",
        borderTop: modal ? undefined : "1px solid #f0f0f0",
      });

      if (isPdf && fullUrl) {
        return React.createElement(
          "div",
          { style: shellStyle },
          React.createElement("iframe", {
            src: addPdfFitHash(fullUrl),
            style: previewIframeStyle(shellHeight),
            title,
          }),
        );
      }

      if (isImage && fullUrl) {
        return React.createElement(
          "div",
          { style: { ...shellStyle, padding: modal ? 16 : 10 } },
          React.createElement("img", {
            src: fullUrl,
            alt: title,
            style: {
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
              objectFit: "contain",
              display: "block",
              margin: "0 auto",
              alignSelf: "center",
            },
          }),
        );
      }

      if (isOffice && officeViewerUrl) {
        return React.createElement(
          "div",
          {
            style: {
              ...shellStyle,
              position: "relative",
              padding: 0,
              alignItems: "flex-start",
            },
          },
          React.createElement("iframe", {
            src: officeViewerUrl,
            style: {
              ...previewIframeStyle(shellHeight, {
                iframeHeight: officeIframeHeight,
              }),
              width: officeIframeWidth,
              maxWidth: "none",
              margin: "0 auto",
              flex: "0 0 auto",
              transform: `scale(${officeScale})`,
              transformOrigin: "top center",
            },
            title,
            frameBorder: "0",
          }),
        );
      }

      return null;
    };

    const getCommentText = (html, removeMentions = false) => {
      if (!html) return "";
      if (typeof document !== "undefined") {
        const el = document.createElement("div");
        el.innerHTML = String(html);
        if (removeMentions) {
          el.querySelectorAll(".mention-tag, [data-id]").forEach((node) =>
            node.remove(),
          );
        }
        return (el.textContent || "").replace(/\u00a0/g, " ").trim();
      }

      let text = String(html);
      if (removeMentions) {
        text = text.replace(
          /<span\b[^>]*(?:mention-tag|data-id)[^>]*>[\s\S]*?<\/span>/gi,
          " ",
        );
      }
      return text
        .replace(/<[^>]*>?/gm, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };

    const getExtInfo = (ext) =>
      FILE_EXT_ICON[(ext || "").toLowerCase()] || {
        icon: "📎",
        color: "#8c8c8c",
        bg: "#fafafa",
      };

    // ============================================================
    // §3 API
    // ============================================================
    async function apiReq(url, method, data) {
      return ctx.api.request({ url, method: method || "POST", data });
    }
    async function fetchAll(url, fields, filter) {
      try {
        const params = { pageSize: 500, page: 1 };
        if (fields) params.fields = fields;
        if (filter) params.filter = JSON.stringify(filter);
        const safeParams = await withResourceSchemaSafeParams(url, params);
        if (!safeParams) return [];
        const res = await ctx.api.request({ url, params: safeParams });
        return res?.data?.data || [];
      } catch {
        return [];
      }
    }
    async function getCurrentUser() {
      try {
        const r = await ctx.api.request({ url: "auth:check", method: "GET" });
        return r?.data?.data || r?.data || null;
      } catch {
        return null;
      }
    }
    async function fetchNotes(collectionName, recordId, includeDeleted = false) {
      try {
        const filter = {
          $and: [
            { collectionName: { $eq: collectionName } },
            { recordId: { $eq: recordId } },
          ],
        };
        if (!includeDeleted) {
          filter.$and.push({ isDeleted: { $ne: true } });
        }
        const params = await withResourceSchemaSafeParams("notes:list", {
          pageSize: 100,
          page: 1,
          sort: ["-createdAt"],
          filter: JSON.stringify(filter),
          fields:
            "id,title,body,batchId,linkedUrl,collectionName,recordId,createdAt,updatedAt,createdById,replyText,parentId,isDeleted",
          appends: ["createdBy", "updatedBy", "assignees", "parent"],
        });
        if (!params) return [];
        const res = await ctx.api.request({ url: "notes:list", params });
        return res?.data?.data || [];
      } catch {
        return [];
      }
    }

    async function fetchFiles(collectionName, recordId, includeDeleted = false) {
      try {
        const filter = buildDocumentRecordFilter(collectionName, recordId);
        if (!filter) return [];
        if (!includeDeleted) {
          filter.$and.push({ isDeleted: { $ne: true } });
        }
        return await listDocumentsWithFieldFallback({
          pageSize: 100,
          page: 1,
          sort: ["-createdAt"],
          filter: JSON.stringify(filter),
          appends: ["fileAttachment", "createdBy", "updatedBy"],
        });
      } catch {
        return [];
      }
    }

    const BASE_DOCUMENT_FILE_FIELDS =
      "id,title,documentCode,documentType,batchId,collectionName,sourceCollectionName,sourceTaskId,sourceRecordId,sourceProjectId,recordId,googleDriveUrl,note,createdAt,updatedAt,createdById,updatedById,uploadedById,isDeleted,folderId,caseId,taskId,subTaskId,moduleScope,storageType,legalStudyId,legalReferenceId,internalCompanyId,movedToLegalReferenceAt,movedToLegalReferenceById,fileIndex,variableConfig,variableConfigMode,sourceProjectTemplateId";
    const LEGAL_STUDY_DOCUMENT_FIELDS =
      "originScope,originFolderId,legalStudyLinkedAt,legalStudySource";
    const DOCUMENT_FILE_FIELDS = `${BASE_DOCUMENT_FILE_FIELDS},${LEGAL_STUDY_DOCUMENT_FIELDS}`;
    const DOCUMENT_FALLBACK_FILE_FIELDS =
      "id,documentType,createdAt,updatedAt,createdById,updatedById";
    const DOCUMENT_KNOWN_SCALAR_FIELDS = [
      BASE_DOCUMENT_FILE_FIELDS,
      LEGAL_STUDY_DOCUMENT_FIELDS,
      "contractId,quotationId,projectInternalId,customerId,legalReferenceId,internalTemplateId,openingDate,signedAt,effectiveAt,status,senderName,recipientName,language,docFormat,description,deletedAt,uploadedById,movedToLegalReferenceById,movedToLegalReferenceAt",
    ].join(",");
    const DOCUMENT_KNOWN_RELATION_FIELDS =
      "fileAttachment,updatedBy,createdBy,folders,activity_log,sourceProject,sourceTask,users,internalCompany,legalReference,internalTemplates,customers,cases,contracts,quotations,tasks,subTasks,projectInternal,documentShares,legalStudy,projectTemplates";
    const DOCUMENT_KNOWN_FIELD_SET = makeDocumentFieldSet([
      ...compactDocumentFields(DOCUMENT_KNOWN_SCALAR_FIELDS),
      ...compactDocumentFields(DOCUMENT_KNOWN_RELATION_FIELDS),
    ]);
    const RESOURCE_COLLECTION_ALIASES = {
      task: "tasks",
      tasks: "tasks",
      subTask: "subTasks",
      subTasks: "subTasks",
      lawyers: "lawyers",
      lawyer: "lawyers",
      projectServices: "projectServices",
      folders: "folders",
      projects: "projects",
      notes: "notes",
      activity_log: "activity_log",
    };
    const collectionFieldSetPromises = {};
    let documentFieldSetPromise = null;

    function getResourceCollectionName(resourceUrl) {
      const raw = String(resourceUrl || "").split(":")[0].replace(/^\/+/, "");
      return RESOURCE_COLLECTION_ALIASES[raw] || raw;
    }

    async function fetchCollectionFieldSet(collectionName) {
      const safeCollectionName = String(collectionName || "").trim();
      if (!safeCollectionName) return null;
      // User-facing JS blocks should not depend on Data sources metadata permissions.
      // NocoBase shows a permission toast for fields:list before this block can catch it.
      return null;
    }

    async function getCollectionFieldSet(collectionName) {
      const safeCollectionName = String(collectionName || "").trim();
      if (!safeCollectionName) return null;
      if (!collectionFieldSetPromises[safeCollectionName]) {
        collectionFieldSetPromises[safeCollectionName] = fetchCollectionFieldSet(safeCollectionName);
      }
      return collectionFieldSetPromises[safeCollectionName];
    }

    async function withResourceSchemaSafeParams(resourceUrl, params = {}, options = {}) {
      const collectionName = options.collectionName || getResourceCollectionName(resourceUrl);
      const fieldSet = await getCollectionFieldSet(collectionName);
      if (!fieldSet) return { ...(params || {}) };

      const next = { ...(params || {}) };
      if (next.fields) {
        const safeFields = compactDocumentFields(next.fields).filter((field) => fieldSet.has(field));
        if (safeFields.length) next.fields = safeFields.join(",");
        else delete next.fields;
      }

      if (next.filter) {
        const parsedFilter = parseDocumentFilter(next.filter);
        const safeFilter = sanitizeDocumentFilterByFields(parsedFilter, fieldSet);
        if (!safeFilter || isEmptyPlainObject(safeFilter)) {
          if (options.allowEmptyFilter) delete next.filter;
          else return null;
        } else {
          next.filter = JSON.stringify(safeFilter);
        }
      }

      const safeSort = sanitizeDocumentSortByFields(next.sort, fieldSet);
      if (safeSort) next.sort = safeSort;
      else delete next.sort;

      const safeAppends = sanitizeDocumentAppendsByFields(next.appends, fieldSet);
      if (safeAppends) next.appends = safeAppends;
      else delete next.appends;

      return next;
    }

    function splitDocumentFields(fields) {
      if (Array.isArray(fields)) return fields;
      if (typeof fields === "string") return fields.split(",");
      return [];
    }

    function compactDocumentFields(fields) {
      return Array.from(
        new Set(
          splitDocumentFields(fields)
            .map((field) => String(field || "").trim())
            .filter(Boolean),
        ),
      );
    }

    function makeDocumentFieldSet(names = []) {
      const fieldSet = new Set(names.filter(Boolean));
      if (fieldSet.has("createdBy")) fieldSet.add("createdById");
      if (fieldSet.has("updatedBy")) fieldSet.add("updatedById");
      if (fieldSet.has("uploadedBy")) fieldSet.add("uploadedById");
      return fieldSet;
    }

    function isPlainObject(value) {
      return !!value && typeof value === "object" && !Array.isArray(value);
    }

    function isEmptyPlainObject(value) {
      return isPlainObject(value) && Object.keys(value).length === 0;
    }

    function parseDocumentFilter(filter) {
      if (!filter) return null;
      if (typeof filter !== "string") return filter;
      try {
        return JSON.parse(filter);
      } catch {
        return null;
      }
    }

    function sanitizeDocumentFilterByFields(filter, fieldSet) {
      if (!fieldSet || !filter) return filter;
      if (Array.isArray(filter)) {
        const items = filter
          .map((item) => sanitizeDocumentFilterByFields(item, fieldSet))
          .filter((item) => item && !isEmptyPlainObject(item));
        return items.length ? items : null;
      }
      if (!isPlainObject(filter)) return filter;
      const next = {};
      Object.entries(filter).forEach(([key, value]) => {
        if (key === "$and" || key === "$or") {
          const items = sanitizeDocumentFilterByFields(value, fieldSet);
          if (Array.isArray(items) && items.length) next[key] = items;
          return;
        }
        if (key.startsWith("$")) {
          next[key] = value;
          return;
        }
        if (!fieldSet.has(key)) return;
        next[key] = value;
      });
      return Object.keys(next).length ? next : null;
    }

    function sanitizeDocumentSortByFields(sort, fieldSet) {
      if (!fieldSet || !sort) return sort;
      const items = Array.isArray(sort) ? sort : [sort];
      const safeSort = items.filter((item) => {
        const field = String(item || "").replace(/^[+-]/, "");
        return field && fieldSet.has(field);
      });
      if (!safeSort.length) return undefined;
      return Array.isArray(sort) ? safeSort : safeSort[0];
    }

    function sanitizeDocumentAppendsByFields(appends, fieldSet) {
      if (!fieldSet || !appends) return appends;
      const items = Array.isArray(appends) ? appends : [appends];
      const safeAppends = items.filter((item) => {
        const relationName = String(item || "").split(".")[0];
        return relationName && fieldSet.has(relationName);
      });
      if (!safeAppends.length) return undefined;
      return Array.isArray(appends) ? safeAppends : safeAppends[0];
    }

    async function fetchDocumentFieldSet() {
      // Avoid fields:list here; it requires admin metadata permission in this JS block.
      // Keep a local field set aligned with the configured documents collection.
      return DOCUMENT_KNOWN_FIELD_SET;
    }

    async function getDocumentFieldSet() {
      if (!documentFieldSetPromise) documentFieldSetPromise = fetchDocumentFieldSet();
      return documentFieldSetPromise;
    }

    async function withDocumentSchemaSafeParams(params = {}, options = {}) {
      const fieldSet = await getDocumentFieldSet();
      if (!fieldSet) return { ...(params || {}) };
      const next = { ...(params || {}) };
      const requestedFields = options.fields !== undefined ? options.fields : next.fields;
      const safeFields = compactDocumentFields(requestedFields).filter((field) =>
        fieldSet.has(field),
      );
      if (safeFields.length) next.fields = safeFields.join(",");
      else delete next.fields;

      if (next.filter) {
        const parsedFilter = parseDocumentFilter(next.filter);
        const safeFilter = sanitizeDocumentFilterByFields(parsedFilter, fieldSet);
        if (!safeFilter || isEmptyPlainObject(safeFilter)) {
          if (options.allowEmptyFilter) delete next.filter;
          else return null;
        } else {
          next.filter = JSON.stringify(safeFilter);
        }
      }

      const safeSort = sanitizeDocumentSortByFields(next.sort, fieldSet);
      if (safeSort) next.sort = safeSort;
      else delete next.sort;

      const safeAppends = sanitizeDocumentAppendsByFields(next.appends, fieldSet);
      if (safeAppends) next.appends = safeAppends;
      else delete next.appends;

      return next;
    }

    async function listDocumentsWithFieldFallback(params) {
      const attempts = [
        { ...(params || {}), fields: DOCUMENT_FILE_FIELDS },
        { ...(params || {}), fields: BASE_DOCUMENT_FILE_FIELDS },
        { ...(params || {}), fields: DOCUMENT_FALLBACK_FILE_FIELDS },
        { ...(params || {}) },
      ];

      for (const attemptParams of attempts) {
        const safeParams = await withDocumentSchemaSafeParams(attemptParams);
        if (!safeParams) return [];
        try {
          const res = await ctx.api.request({
            url: "documents:list",
            params: safeParams,
          });
          return res?.data?.data || [];
        } catch {}
      }
      return [];
    }

    function normalizeDocumentCollectionName(collectionName) {
      const raw = String(collectionName || "").trim();
      const lower = raw.toLowerCase();
      if (lower === "tasks" || lower === "task") return "Task";
      if (lower === "subtasks" || lower === "subtask") return "SubTask";
      if (lower === "cases" || lower === "case") return "Case";
      return raw || collectionName;
    }

    function buildDocumentRecordLink(collectionName, recordId, extra = {}) {
      const normalized = normalizeDocumentCollectionName(collectionName);
      const safeRecordId = extractId(recordId);
      const safeProjectInternalId = extractId(extra.projectInternalId);
      const payload = {
        collectionName: normalized,
        // Internal Work tasks have no Case to scope into — the document
        // belongs to the projectInternal space instead, matching
        // ProjectDocument.js's own moduleScope for this space.
        moduleScope: safeProjectInternalId
          ? PROJECT_INTERNAL_MODULE_SCOPE
          : CASE_DOCUMENT_SCOPE,
      };
      if (safeProjectInternalId) payload.projectInternalId = safeProjectInternalId;
      const safeCaseId = getDeepLinkCaseId(extra.caseId);
      if (safeCaseId) payload.caseId = safeCaseId;
      const safeFolderId = extractId(extra.folderId);
      if (safeFolderId) payload.folderId = safeFolderId;
      if (safeRecordId) {
        payload.recordId = safeRecordId;
        payload.sourceCollectionName = normalized;
        payload.sourceRecordId = safeRecordId;
      }
      if (normalized === "Task" && safeRecordId) {
        payload.taskId = safeRecordId;
        payload.sourceTaskId = safeRecordId;
      }
      if (normalized === "SubTask" && safeRecordId) payload.subTaskId = safeRecordId;
      // [CASE] Comment của Case gắn thẳng vào Case (giống CaseNotes.js cũ).
      if (normalized === CASE_COMMENT_CONFIG.COLLECTION_NAME && safeRecordId)
        payload.caseId = safeRecordId;
      return payload;
    }

    // Task-upload document creation must never carry a direct caseId — the
    // Document library's root-detection logic (getDirectLibrarySource) treats
    // any record whose own caseId/projectId equals the current case as that
    // case's root container. Stamping caseId on every task-uploaded file made
    // the tree classify them as siblings of the real case root instead of
    // nesting them under it through the real folderId hierarchy.
    function buildTaskUploadDocumentLink(collectionName, recordId, extra = {}) {
      const link = buildDocumentRecordLink(collectionName, recordId, extra);
      // [CASE] Upload từ comment của Case BẮT BUỘC có caseId — lý do bỏ
      // caseId ở trên chỉ áp dụng cho file upload từ Task.
      if (link.collectionName === CASE_COMMENT_CONFIG.COLLECTION_NAME) return link;
      const { caseId: _caseId, ...rest } = link;
      return rest;
    }

    function buildDocumentRecordFilter(collectionName, recordId) {
      const link = buildDocumentRecordLink(collectionName, recordId);
      const filter = [];
      if (link.collectionName) filter.push({ collectionName: { $eq: link.collectionName } });
      // [CASE] Tài liệu comment của Case: collectionName + caseId (khớp dữ
      // liệu CaseNotes.js cũ đã tạo).
      if (link.collectionName === CASE_COMMENT_CONFIG.COLLECTION_NAME) {
        if (!link.caseId) return null;
        filter.push({ caseId: { $eq: link.caseId } });
        return { $and: filter };
      }
      if (link.taskId) {
        filter.push({
          $or: [
            { taskId: { $eq: link.taskId } },
            { sourceTaskId: { $eq: link.taskId } },
            { sourceRecordId: { $eq: link.taskId } },
            { recordId: { $eq: link.taskId } },
          ],
        });
      } else if (link.subTaskId) {
        filter.push({
          $or: [
            { subTaskId: { $eq: link.subTaskId } },
            { sourceRecordId: { $eq: link.subTaskId } },
            { recordId: { $eq: link.subTaskId } },
          ],
        });
      } else return null;
      return { $and: filter };
    }

    const createTaskUploadBatchId = (prefix = "upl") =>
      `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;

    const formatUploadSize = (size) => {
      const bytes = Number(size) || 0;
      if (!bytes) return "";
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getUploadItemFile = (item) => item?.originFileObj || item;

    const getUploadRelativePath = (item) => {
      const file = getUploadItemFile(item);
      return (
        file?.webkitRelativePath ||
        item?.webkitRelativePath ||
        item?.name ||
        file?.name ||
        ""
      );
    };

    const getRelativeFolderPath = (relativePath) => {
      const parts = String(relativePath || "")
        .split("/")
        .map((part) => part.trim())
        .filter(Boolean);
      parts.pop();
      return parts.join("/");
    };

    async function uploadTaskAttachment(file, fileName = null) {
      const formData = new window.FormData();
      formData.append("file", file, fileName || file.name);
      const uploadRes = await ctx.api.request({
        url: "attachments:create",
        method: "POST",
        params: { attachmentField: "documents.fileAttachment" },
        data: formData,
      });
      const attachment = uploadRes?.data?.data;
      if (!attachment?.id) throw new Error("Upload file failed");
      return attachment;
    }

    async function createTaskFolderRecord(payload) {
      const variants = [
        payload,
        (({ moduleScope, ...rest }) => rest)(payload || {}),
        (({ moduleScope, projectId, ...rest }) => rest)(payload || {}),
        // Last-resort fallback in case folders.taskId/subTaskId don't exist
        // in some environment — without this, a missing field would fail
        // every variant above too (none of them strip taskId/subTaskId) and
        // folder creation would hard-fail entirely instead of just losing
        // the task/subtask stamp.
        (({ moduleScope, projectId, taskId, subTaskId, ...rest }) => rest)(
          payload || {},
        ),
      ];
      let lastError = null;
      for (const data of variants) {
        try {
          return await ctx.api.request({
            url: "folders:create",
            method: "POST",
            data,
          });
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError;
    }

    async function createTaskUploadFoldersFromEntries(entries, rootFolderId, options = {}) {
      const rootParentId = extractId(rootFolderId) || null;
      const folderIdMap = { "": rootParentId };
      const folderPaths = new Set();
      (entries || []).forEach((entry) => {
        const folderPath = getRelativeFolderPath(entry.relativePath);
        if (!folderPath) return;
        let currentPath = "";
        folderPath.split("/").forEach((part) => {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          folderPaths.add(currentPath);
        });
      });

      const sortedPaths = Array.from(folderPaths).sort(
        (a, b) => a.split("/").length - b.split("/").length,
      );
      const now = new Date().toISOString();
      const userId = extractId(options.currentUser?.id);
      const caseId = extractId(options.caseId);
      // Internal Work (projectInternal) tasks have no Case to scope
      // into — subfolders created while uploading from one of these tasks
      // must land in the projectInternal space instead (moduleScope/
      // storageType "project_internal", projectInternalId FK), matching
      // ProjectDocument.js's own folder shape for this space, not the
      // Case-scoped shape below.
      const projectInternalId = extractId(options.projectInternalId);
      // Stamps which Task/SubTask an upload-created folder originated from
      // — lets a folder found later (e.g. via the raw Admin grid) be traced
      // back to the exact task/subtask that created it without hunting
      // through comment history. taskId is always the parent task's id
      // (whether the upload came from a Task or a SubTask of it); subTaskId
      // is only set when the upload specifically came from a SubTask.
      const taskId = extractId(options.taskId);
      const subTaskId = extractId(options.subTaskId);

      for (const path of sortedPaths) {
        const parts = path.split("/");
        const folderName = parts.pop();
        const parentPath = parts.join("/");
        const parentId = folderIdMap[parentPath] || rootParentId;
        const payload = {
          name: folderName,
          type: "custom",
          storageType: projectInternalId ? PROJECT_INTERNAL_MODULE_SCOPE : "cases",
          moduleScope: projectInternalId
            ? PROJECT_INTERNAL_MODULE_SCOPE
            : CASE_DOCUMENT_SCOPE,
          createdAt: now,
          updatedAt: now,
          ...(parentId ? { parentId } : {}),
          ...(projectInternalId
            ? { projectInternalId }
            : caseId
              ? { projectId: caseId }
              : {}),
          ...(taskId ? { taskId } : {}),
          ...(subTaskId ? { subTaskId } : {}),
          ...(userId ? { createdById: userId, updatedById: userId } : {}),
        };
        const res = await createTaskFolderRecord(payload);
        folderIdMap[path] = extractId(res?.data?.data);
      }

      return folderIdMap;
    }

    function initcap(str) {
      if (!str) return str;
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // activity_log.oldValue/newValue is a length-capped varchar column (see
    // pgsql/log_activity_changes.sql's own truncate_long_text() guard for
    // long-text source fields like description/body/note). This JS-side
    // logActivity() is the one manual activity-log write path in the app
    // that bypasses that trigger-side guard entirely, so any caller passing
    // a naturally long string — e.g. LibraryMoveModal's
    // `${targetLabel} - ${recName}`, where targetLabel can be a full
    // Customer legal entity name — hit a raw Postgres "value too long for
    // type character varying" error. Cap here, once, so every caller is
    // protected without needing to know the DB's exact limit.
    const truncateActivityLogValue = (value, maxLength = 250) => {
      const str = String(value);
      return str.length > maxLength ? `${str.slice(0, maxLength - 1)}…` : str;
    };
    async function logActivity(
      collectionName,
      recordId,
      action,
      fieldName,
      oldValue,
      newValue,
      changedByName,
      batchId,
      dataId = null,
      timestamp = null,
    ) {
      try {
        const now = timestamp || new Date().toISOString();
        await apiReq("activity_log:create", "POST", {
          collectionName,
          recordId,
          action,
          fieldName,
          oldValue: oldValue ? truncateActivityLogValue(oldValue) : null,
          newValue: newValue ? truncateActivityLogValue(newValue) : null,
          changedByName: changedByName || "System",
          changedAt: now,
          createdAt: now,
          batchId: batchId || null,
          dataId: dataId || null,
        });
      } catch {}
    }

    async function fetchTaskNoteFolders(files = []) {
      if (!(files || []).some((file) => extractId(file?.folderId))) return [];
      const params = {
        pageSize: 2000,
        page: 1,
        filter: JSON.stringify({
          $and: [
            { storageType: { $eq: "cases" } },
            { isDeleted: { $ne: true } },
          ],
        }),
      };
      try {
        const res = await ctx.api.request({ url: "folders:list", params });
        return res?.data?.data || [];
      } catch {
        return [];
      }
    }

    // Direct lookup by exact id, bypassing the storageType/pageSize-bounded
    // scan in fetchTaskNoteFolders — that scan can miss a folder if the case
    // has more "cases" folders than fit in one page, which showed up as
    // badges falling back to "Folder #<id>" instead of the real name.
    async function fetchFoldersByIds(ids = []) {
      const safeIds = Array.from(new Set((ids || []).map(extractId).filter(Boolean)));
      if (!safeIds.length) return [];
      const params = {
        pageSize: safeIds.length,
        page: 1,
        filter: JSON.stringify({
          $and: [{ id: { $in: safeIds } }, { isDeleted: { $ne: true } }],
        }),
      };
      try {
        const res = await ctx.api.request({ url: "folders:list", params });
        return res?.data?.data || [];
      } catch {
        return [];
      }
    }

    const buildFolderLookup = (folders = []) =>
      (folders || []).reduce((acc, folder) => {
        const id = extractId(folder?.id);
        if (id) acc[String(id)] = folder;
        return acc;
      }, {});

    // Folder name lookup for a set of files — broad scan first (also covers
    // ancestor folders, needed for the badge's breadcrumb tooltip), then a
    // targeted by-id fetch for any file's own folderId the scan missed, so
    // the visible folder name never falls back to a bare "Folder #<id>".
    async function fetchFolderLookupForFiles(files = []) {
      const folders = await fetchTaskNoteFolders(files);
      const lookupSoFar = buildFolderLookup(folders);
      const referencedFolderIds = (files || [])
        .map((file) => extractId(file?.folderId))
        .filter(Boolean);
      const missingFolderIds = referencedFolderIds.filter(
        (id) => !lookupSoFar[String(id)],
      );
      const extraFolders = missingFolderIds.length
        ? await fetchFoldersByIds(missingFolderIds)
        : [];
      return buildFolderLookup([...folders, ...extraFolders]);
    }

    const getFolderPathParts = (folderId, folderLookup = {}) => {
      const parts = [];
      const seen = new Set();
      let currentId = extractId(folderId);
      while (currentId && folderLookup[String(currentId)] && !seen.has(String(currentId))) {
        seen.add(String(currentId));
        const folder = folderLookup[String(currentId)];
        parts.unshift(folder.name || folder.title || `Folder #${currentId}`);
        currentId = extractId(folder.parentId);
      }
      return parts;
    };

    const parseLegalStudySource = (value) => {
      if (!value) return null;
      if (typeof value === "object") return value;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    };

    const isLinkedToLegalStudy = (record) =>
      !!record?.legalStudyLinkedAt ||
      !!extractId(record?.legalStudyId) ||
      record?.moduleScope === LEGAL_STUDY_MODULE_SCOPE ||
      record?.storageType === LEGAL_STUDY_STORAGE_TYPE;

    const isLinkedToLegalReference = (record) =>
      !!record?.movedToLegalReferenceAt ||
      !!extractId(record?.legalReferenceId) ||
      record?.moduleScope === LEGAL_REFERENCE_MODULE_SCOPE ||
      record?.storageType === LEGAL_REFERENCE_STORAGE_TYPE;

    // `originScope`/`originFolderId` are only ever written by LibraryMoveModal's
    // move flow (never on initial document creation), so their presence marks
    // "this file went through an explicit move" regardless of destination.
    // Combined with the current moduleScope it tells us the file was moved
    // into a Document (case) folder specifically, as opposed to Legal
    // Study/Reference (covered by the two checks above). storageType is
    // checked too — CUSTOMER_DOCUMENT shares the same moduleScope
    // (CASE_DOCUMENT_SCOPE) but a different storageType ("customer"), so
    // this alone would otherwise also match a Customer-moved file.
    const isMovedToCaseDocument = (record) =>
      !!record?.originScope &&
      record?.moduleScope === CASE_DOCUMENT_SCOPE &&
      record?.storageType === "cases";

    // Same "went through an explicit move" signal as isMovedToCaseDocument,
    // just checked against the Knowledge library's moduleScope instead.
    const isMovedToKnowledge = (record) =>
      !!record?.originScope && record?.moduleScope === LIBRARY_DESTINATION.KNOWLEDGE;

    const isMovedToProjectInternalDocument = (record) =>
      !!record?.originScope && record?.moduleScope === PROJECT_INTERNAL_MODULE_SCOPE;

    // storageType is the only reliable signal here — see isMovedToCaseDocument's
    // comment above for why moduleScope alone can't distinguish Customer moves.
    const isMovedToCustomerDocument = (record) =>
      !!record?.originScope && record?.storageType === "customer";

    // Visible label leads with the immediate folder name (what the user
    // actually asked "moved to which folder?"); the full breadcrumb only
    // shows up on hover, since most files sit 1-2 levels deep and the full
    // chain would just repeat the case's own root folder every time.
    const getMovedDestinationBadge = (record, folderLookup = {}) => {
      if (isLinkedToLegalStudy(record)) {
        return {
          icon: TASK_FILE_ACTION_ICONS.moveLegalStudy,
          prefix: "Moved to",
          value: "Legal Study",
          tooltip: "Moved to Legal Study",
          accent: "#9254de",
        };
      }
      if (isLinkedToLegalReference(record)) {
        return {
          icon: TASK_FILE_ACTION_ICONS.moveLegalReference,
          prefix: "Moved to",
          value: "Legal Reference",
          tooltip: "Moved to Legal Reference",
          accent: "#36cfc9",
        };
      }
      if (isMovedToCaseDocument(record)) {
        const folderId = extractId(record?.folderId);
        const folder = folderId ? folderLookup[String(folderId)] : null;
        const folderName =
          folder?.name || folder?.title || (folderId ? `Folder #${folderId}` : "Root");
        const fullPath =
          getFolderPathParts(folderId, folderLookup).join(" / ") || folderName;
        return {
          icon: TASK_FILE_ACTION_ICONS.folder,
          prefix: "Moved to Document:",
          value: folderName,
          tooltip: `Moved to Document / ${fullPath}`,
          accent: "#4096ff",
        };
      }
      if (isMovedToKnowledge(record)) {
        // Knowledge folders sit outside folderLookup's default "cases" scan
        // (see fetchTaskNoteFolders), but fetchFolderLookupForFiles' by-id
        // fallback fetch (fetchFoldersByIds — no storageType filter) already
        // picks them up, so the same folderLookup works here unchanged.
        const folderId = extractId(record?.folderId);
        const folder = folderId ? folderLookup[String(folderId)] : null;
        const folderName =
          folder?.name || folder?.title || (folderId ? `Folder #${folderId}` : "Root");
        const fullPath =
          getFolderPathParts(folderId, folderLookup).join(" / ") || folderName;
        return {
          // Value is a real folder name (same as the Document badge above),
          // not a fixed category placeholder like "Legal Study"/"Legal
          // Reference" — use the folder icon so it reads the same way.
          icon: TASK_FILE_ACTION_ICONS.folder,
          prefix: "Moved to Library:",
          value: folderName,
          tooltip: `Moved to Library / ${fullPath}`,
          accent: "#fa8c16",
        };
      }
      if (isMovedToProjectInternalDocument(record)) {
        const folderId = extractId(record?.folderId);
        const folder = folderId ? folderLookup[String(folderId)] : null;
        const folderName =
          folder?.name || folder?.title || (folderId ? `Folder #${folderId}` : "Root");
        const fullPath =
          getFolderPathParts(folderId, folderLookup).join(" / ") || folderName;
        return {
          icon: TASK_FILE_ACTION_ICONS.folder,
          prefix: "Moved to Internal Work:",
          value: folderName,
          tooltip: `Moved to Internal Work's Document / ${fullPath}`,
          accent: "#4096ff",
        };
      }
      if (isMovedToCustomerDocument(record)) {
        const folderId = extractId(record?.folderId);
        const folder = folderId ? folderLookup[String(folderId)] : null;
        const folderName =
          folder?.name || folder?.title || (folderId ? `Folder #${folderId}` : "Root");
        const fullPath =
          getFolderPathParts(folderId, folderLookup).join(" / ") || folderName;
        return {
          icon: TASK_FILE_ACTION_ICONS.moveLegalReference,
          prefix: "Moved to Customer:",
          value: folderName,
          tooltip: `Moved to Customer / ${fullPath}`,
          accent: "#36cfc9",
        };
      }
      return null;
    };

    // Deliberately low-contrast pill (light grey shell, muted prefix text) so
    // it reads as a passive status hint rather than competing with the file
    // title or the action buttons — only the folder/destination name itself
    // gets a slightly stronger weight since that's the part users need to
    // actually read.
    const renderMovedBadge = (badge, style = {}) => {
      if (!badge) return null;
      return React.createElement(
        "span",
        {
          title: badge.tooltip || `${badge.prefix} ${badge.value}`,
          style: {
            fontSize: 11,
            fontFamily: FONT,
            color: "#8c8c8c",
            background: "#fafafa",
            border: "1px solid #f0f0f0",
            borderRadius: 4,
            padding: "2px 8px",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            maxWidth: "100%",
            overflow: "hidden",
            ...style,
          },
        },
        React.createElement(
          "span",
          {
            style: {
              color: badge.accent,
              display: "inline-flex",
              alignItems: "center",
              flexShrink: 0,
            },
          },
          React.cloneElement(badge.icon, { size: 12, width: 12, height: 12 }),
        ),
        React.createElement("span", { style: { flexShrink: 0 } }, badge.prefix),
        React.createElement(
          "span",
          {
            style: {
              color: "#595959",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          },
          badge.value,
        ),
      );
    };

    const getLegalStudySourceLabel = (record) => {
      const source = parseLegalStudySource(record?.legalStudySource);
      if (!source) return "";
      const taskTitle = source.taskTitle || "";
      const subTaskTitle = source.subTaskTitle || "";
      if (taskTitle && subTaskTitle) return `${taskTitle} / ${subTaskTitle}`;
      return taskTitle || subTaskTitle || "";
    };

    const getLibraryDestinationConfig = (destinationType) =>
      LIBRARY_DESTINATION_CONFIG[destinationType] ||
      LIBRARY_DESTINATION_CONFIG[LIBRARY_DESTINATION.LEGAL_STUDY];

    const getLibraryRecordId = (record, destinationType) => {
      const config = getLibraryDestinationConfig(destinationType);
      const fields = config.recordIdFields || [
        "legalStudyId",
        "legalStudy",
        "legalStudies",
        "legalStudiesId",
      ];
      for (const field of fields) {
        const id = extractId(record?.[field]);
        if (id) return id;
      }
      return extractId(record?.id);
    };

    const getLibraryRecordDisplayName = (record, destinationType) => {
      if (!record) return "";
      const fallbackLabel = getLibraryDestinationConfig(destinationType).label;
      const code =
        record.studyCode ||
        record.referenceCode ||
        record.code ||
        record.referenceNo ||
        record.customerCode ||
        "";
      const title =
        record.title ||
        record.name ||
        record.projectName ||
        record.customerName ||
        record.companyLegalName ||
        record.fullName ||
        record.description ||
        (record.id ? `${fallbackLabel} #${record.id}` : fallbackLabel);
      return code && String(code) !== String(title) ? `${code} - ${title}` : title;
    };

    const getLibraryRecordInternalCompanyId = (record) =>
      extractId(record?.internalCompanyId) ||
      extractId(record?.internalCompany) ||
      extractId(record?.companyId) ||
      extractId(record?.company);

    const getRecordDestinationId = (record, destinationType) => {
      const config = getLibraryDestinationConfig(destinationType);
      const fields = config.recordIdFields || [
        "legalStudyId",
        "legalStudy",
        "legalStudies",
        "legalStudiesId",
      ];
      for (const field of fields) {
        const id = extractId(record?.[field]);
        if (id) return id;
      }
      return null;
    };

    // Plain-text label used for a non-folder grouping node (e.g. the
    // synthetic "Knowledge" category wrapper in LibraryMoveModal) — no icon
    // box, so it reads visibly differently from the real folder rows below it
    // (which get the folder icon via renderLibraryTreeTitle).
    const renderLibraryCategoryTitle = (label) =>
      React.createElement(
        "span",
        { style: { fontWeight: 700, color: "#374151" } },
        label,
      );

    // Real parent-child folder structure only — no synthetic "Home"/root
    // wrapper node. The folder list's actual top-level folders (no in-list
    // parent) become the tree's top-level nodes directly.
    const buildLibraryFolderTree = (folders = []) => {
      const nodeMap = {};
      const roots = [];
      folders.forEach((folder) => {
        const id = extractId(folder.id || folder);
        if (!id) return;
        const folderTitle = folder.name || folder.title || `Folder #${id}`;
        nodeMap[String(id)] = {
          title: renderLibraryTreeTitle(folderTitle),
          searchText: folderTitle,
          value: String(id),
          key: String(id),
          children: [],
        };
      });
      folders.forEach((folder) => {
        const id = String(extractId(folder.id || folder) || "");
        const parentId = String(extractId(folder.parentId) || "");
        if (!id || !nodeMap[id]) return;
        if (parentId && nodeMap[parentId]) nodeMap[parentId].children.push(nodeMap[id]);
        else roots.push(nodeMap[id]);
      });
      return roots;
    };

    async function fetchLibraryDestinationRecords(destinationType) {
      const config = getLibraryDestinationConfig(destinationType);
      let lastError = null;
      for (const url of config.listCandidates) {
        try {
          const res = await ctx.api.request({
            url,
            params: { pageSize: 2000, page: 1, sort: ["-createdAt"] },
          });
          return (res?.data?.data || []).filter((record) => !record?.isDeleted);
        } catch (e) {
          lastError = e;
        }
      }
      console.warn(`Cannot load ${config.label}`, lastError);
      return [];
    }

    async function fetchLibraryDestinationFolders(destinationType, parentRecordId) {
      const config = getLibraryDestinationConfig(destinationType);
      const safeParentId = extractId(parentRecordId);
      if (!safeParentId) return [];
      const params = {
        pageSize: 2000,
        page: 1,
        sort: ["createdAt"],
        filter: JSON.stringify({
          $and: [
            { moduleScope: { $eq: config.moduleScope } },
            { isDeleted: { $ne: true } },
          ],
        }),
      };
      try {
        const res = await ctx.api.request({ url: "folders:list", params });
        return (res?.data?.data || []).filter(
          (folder) =>
            String(getRecordDestinationId(folder, destinationType) || "") ===
            String(safeParentId),
        );
      } catch {
        return [];
      }
    }

    // Real Document folders of the given case (no Legal Study/Reference
    // parent-record step — the case itself is always the parent).
    async function fetchCaseDocumentFolders(caseId) {
      const safeCaseId = extractId(caseId);
      if (!safeCaseId) return [];
      const params = {
        pageSize: 2000,
        page: 1,
        sort: ["createdAt"],
        filter: JSON.stringify({
          $and: [
            { projectId: { $eq: safeCaseId } },
            { isDeleted: { $ne: true } },
          ],
        }),
      };
      try {
        const res = await ctx.api.request({ url: "folders:list", params });
        return res?.data?.data || [];
      } catch {
        return [];
      }
    }

    // Real Document folders of the given Internal Work item (no parent-record
    // step — the item itself is always the parent). Mirrors
    // fetchCaseDocumentFolders exactly, keyed by projectInternalId instead of
    // projectId, matching ProjectDocument.js's own folder scope.
    async function fetchProjectInternalDocumentFolders(projectInternalId) {
      const safeId = extractId(projectInternalId);
      if (!safeId) return [];
      const params = {
        pageSize: 2000,
        page: 1,
        sort: ["createdAt"],
        filter: JSON.stringify({
          $and: [
            { projectInternalId: { $eq: safeId } },
            { isDeleted: { $ne: true } },
          ],
        }),
      };
      try {
        const res = await ctx.api.request({ url: "folders:list", params });
        return res?.data?.data || [];
      } catch {
        return [];
      }
    }

    // Folders belonging to the given customer's own "Customer" document
    // space. Filtered purely by folders.customerId (no moduleScope filter)
    // to match CustomerDocument.js's own "activeSpace === 'customer'"
    // predicate exactly — Customer folders share moduleScope with Case
    // folders in this schema, so moduleScope alone can't distinguish them.
    async function fetchCustomerDocumentFolders(customerId) {
      const safeCustomerId = extractId(customerId);
      if (!safeCustomerId) return [];
      const params = {
        pageSize: 2000,
        page: 1,
        sort: ["createdAt"],
        filter: JSON.stringify({
          $and: [
            { customerId: { $eq: safeCustomerId } },
            { isDeleted: { $ne: true } },
          ],
        }),
      };
      try {
        const res = await ctx.api.request({ url: "folders:list", params });
        return (res?.data?.data || []).filter(
          (folder) => folder?.storageType !== "personal",
        );
      } catch {
        return [];
      }
    }

    // Company-level Knowledge folders — unlike fetchLibraryDestinationFolders
    // (scoped to one Legal Study/Reference record) there's no single parent
    // record to filter by; every folder tagged moduleScope "knowledge" is a
    // valid destination regardless of which company it belongs to (the user
    // just picks a folder, no company step — see LIBRARY_DESTINATION.KNOWLEDGE).
    async function fetchKnowledgeFolders() {
      const params = {
        pageSize: 2000,
        page: 1,
        sort: ["createdAt"],
        filter: JSON.stringify({
          $and: [
            { moduleScope: { $eq: "knowledge" } },
            { isDeleted: { $ne: true } },
          ],
        }),
      };
      try {
        const res = await ctx.api.request({ url: "folders:list", params });
        return res?.data?.data || [];
      } catch {
        return [];
      }
    }

    const buildLegalStudySource = (sourceContext = {}) => ({
      // [CASE] File chuyển từ comment của Case ghi nguồn là case_note.
      type:
        sourceContext.collectionName === CASE_COMMENT_CONFIG.COLLECTION_NAME
          ? "case_note"
          : "task_note",
      collectionName: sourceContext.collectionName || "Task",
      recordId: extractId(sourceContext.recordId) || null,
      taskId: extractId(sourceContext.taskId) || null,
      taskTitle: sourceContext.taskTitle || "",
      subTaskId: extractId(sourceContext.subTaskId) || null,
      subTaskTitle: sourceContext.subTaskTitle || "",
      caseId: extractId(sourceContext.caseId) || null,
      caseCode: sourceContext.caseCode || "",
    });

    // ============================================================
    // §4 PERMISSION
    // ============================================================
    const asArray = (value) => {
      if (!value) return [];
      return Array.isArray(value) ? value : [value];
    };

    const getUserRoleNames = (user) => {
      const roleNames = asArray(user?.roles)
        .map((role) =>
          typeof role === "string"
            ? role
            : role?.name || role?.title || role?.slug || role?.role,
        )
        .filter(Boolean);
      roleNames.push(user?.role, user?.systemRole);
      return new Set(
        roleNames
          .filter(Boolean)
          .map((role) => String(role).trim().toLowerCase()),
      );
    };

    const isAdminUser = (user) => {
      if (!user) return false;
      const roleNames = getUserRoleNames(user);
      return (
        roleNames.has("admin") ||
        roleNames.has("root") ||
        user?.isAdmin === true ||
        user?.isSuperAdmin === true
      );
    };

    const getFolderManagerRows = (folder) =>
      asArray(folder?.folderManager || folder?.folderManagers);

    const getFolderMemberRows = (folder) =>
      asArray(folder?.folderMember || folder?.folderMembers);

    const getPermissionLawyerId = (row) =>
      extractId(row?.lawyerId) ||
      extractId(row?.lawyer) ||
      extractId(row?.id) ||
      extractId(row);

    const getPermissionRole = (row, fallback = "viewer") =>
      String(
        row?.folderMembers?.role ||
        row?.folderMember?.role ||
        row?.through?.role ||
        row?.role ||
        fallback,
      )
        .trim()
        .toLowerCase();

    const getFolderPermissions = (
      folder,
      user,
      allFolders,
      currentLawyerId,
      visitedFolderIds = new Set(),
    ) => {
      if (isAdminUser(user))
        return { isManager: true, isMember: true, canEdit: true };
      if (!folder) return { isManager: true, isMember: true, canEdit: true };
      if (!user) return { isManager: false, isMember: false, canEdit: false };

      const uid = extractId(user.id);
      const lwId = extractId(currentLawyerId);
      const folderId = extractId(folder.id);
      if (folderId && visitedFolderIds.has(String(folderId))) {
        return { isManager: false, isMember: false, canEdit: false };
      }
      const nextVisitedFolderIds = new Set(visitedFolderIds);
      if (folderId) nextVisitedFolderIds.add(String(folderId));

      // Owner check (Nocobase user ID)
      if (extractId(folder.createdById) === uid) {
        return { isManager: true, isMember: true, canEdit: true };
      }

      const managers = getFolderManagerRows(folder);
      const members = getFolderMemberRows(folder);

      // Check explicit permissions using Lawyer ID
      if (lwId) {
        const isExplicitManager = managers.some(
          (manager) =>
            String(getPermissionLawyerId(manager) || "") === String(lwId),
        );
        if (isExplicitManager)
          return { isManager: true, isMember: true, canEdit: true };

        const explicitMember = members.find(
          (member) =>
            String(getPermissionLawyerId(member) || "") === String(lwId),
        );
        if (explicitMember) {
          const role = getPermissionRole(explicitMember);
          const isManager = role === "manager";
          const canEdit = isManager || role === "editor";
          return { isManager, isMember: true, canEdit };
        }
      }

      // Inherit from parent
      const pId = extractId(folder.parentId);
      if (!pId || pId === "root")
        return { isManager: false, isMember: false, canEdit: false };

      const parentFolder = allFolders.find(
        (f) => String(extractId(f.id)) === String(pId),
      );
      if (!parentFolder)
        return { isManager: false, isMember: false, canEdit: false };

      return getFolderPermissions(
        parentFolder,
        user,
        allFolders,
        currentLawyerId,
        nextVisitedFolderIds,
      );
    };

    const getVisibleFolderIds = (allFolders, currentUser, currentLawyerId) => {
      const accessible = new Set();
      const uid = extractId(currentUser?.id);
      const lwId = extractId(currentLawyerId);

      if (isAdminUser(currentUser)) {
        allFolders.forEach((f) => accessible.add(extractId(f.id)));
        return { accessible, navOnly: new Set() };
      }

      if (!uid) return { accessible, navOnly: new Set() };

      allFolders.forEach((f) => {
        const fId = extractId(f.id);
        if (extractId(f.createdById) === uid) {
          accessible.add(fId);
          return;
        }
        if (lwId) {
          const managers = getFolderManagerRows(f);
          const members = getFolderMemberRows(f);
          if (
            managers.some(
              (manager) =>
                String(getPermissionLawyerId(manager) || "") === String(lwId),
            ) ||
            members.some(
              (member) =>
                String(getPermissionLawyerId(member) || "") === String(lwId),
            )
          ) {
            accessible.add(fId);
            return;
          }
        }
      });

      // Indexed once (parent → children, id → folder) instead of rescanning
      // allFolders per folder — the old nested scans were O(n²) and made
      // the "Choose from ..." pickers visibly slow for non-admin users on a
      // library with thousands of folders. Same result set as before.
      const childrenByParentId = new Map();
      const folderById = new Map();
      allFolders.forEach((f) => {
        const id = extractId(f.id);
        if (id && !folderById.has(id)) folderById.set(id, f);
        const pId = extractId(f.parentId);
        if (!id || !pId) return;
        if (!childrenByParentId.has(pId)) childrenByParentId.set(pId, []);
        childrenByParentId.get(pId).push(id);
      });

      const directIds = Array.from(accessible);
      directIds.forEach((rootId) => {
        const stack = [rootId];
        const visited = new Set([rootId]);
        while (stack.length > 0) {
          const pId = stack.pop();
          (childrenByParentId.get(pId) || []).forEach((id) => {
            if (visited.has(id)) return;
            visited.add(id);
            accessible.add(id);
            stack.push(id);
          });
        }
      });

      const navOnly = new Set();
      accessible.forEach((fId) => {
        let curr = folderById.get(fId);
        const seen = new Set();
        while (curr && curr.parentId) {
          const currentId = extractId(curr.id);
          if (currentId && seen.has(String(currentId))) break;
          if (currentId) seen.add(String(currentId));
          const pId = extractId(curr.parentId);
          if (pId && !accessible.has(pId)) {
            navOnly.add(pId);
          }
          curr = folderById.get(pId);
        }
      });

      return { accessible, navOnly };
    };

    const extractLibraryRelationId = (value) => {
      for (const item of asArray(value)) {
        const id = extractId(item);
        if (id) return id;
      }
      return null;
    };

    const getLibraryRecordCaseId = (record) =>
      extractId(record?.caseId) ||
      extractLibraryRelationId(record?.cases) ||
      extractId(record?.projectId) ||
      extractLibraryRelationId(record?.project);

    // Same lookup as ProjectDocument.js's DASHBOARD_CONFIG.getParentIdFromRecord
    // — projectInternalId is stamped flatly on every folder/document of an
    // Internal Work (not only its root folder).
    const getLibraryRecordProjectInternalId = (record) =>
      extractId(record?.projectInternalId) ||
      extractLibraryRelationId(record?.projectInternal);

    const getLibraryRecordLegalReferenceId = (record) =>
      extractId(record?.legalReferenceId) ||
      extractLibraryRelationId(record?.legalReference) ||
      extractLibraryRelationId(record?.legalReferenceRecord) ||
      extractLibraryRelationId(record?.internalTemplates) ||
      extractId(record?.internalTemplatesId) ||
      extractLibraryRelationId(record?.internalTemplate) ||
      extractId(record?.internalTemplateId);

    const getLibraryRecordLegalStudyId = (record) =>
      extractId(record?.legalStudyId) ||
      extractLibraryRelationId(record?.legalStudy) ||
      extractLibraryRelationId(record?.legalStudies) ||
      extractId(record?.legalStudiesId);

    const getLibraryShareRowUserId = (row) =>
      extractId(row?.userId) ||
      extractLibraryRelationId(row?.users) ||
      extractLibraryRelationId(row?.user);

    const getLibraryShareRowDocumentId = (row) =>
      extractId(row?.documentId) ||
      extractLibraryRelationId(row?.documents) ||
      extractLibraryRelationId(row?.document);

    const isLibraryDocumentSharedWithUser = (document, currentUserId) => {
      if (!currentUserId) return false;
      return asArray(document?._shareRows).some(
        (row) =>
          String(getLibraryShareRowUserId(row) || "") === String(currentUserId),
      );
    };

    async function requestLibraryRows(url, paramsVariants = []) {
      for (const params of paramsVariants) {
        try {
          const safeParams =
            url === "documents:list"
              ? await withDocumentSchemaSafeParams(params)
              : params;
          if (!safeParams) continue;
          const response = await ctx.api.request({ url, params: safeParams });
          return response?.data?.data || [];
        } catch {}
      }
      return [];
    }

    const LIBRARY_ACTIVE_FILTER = { isDeleted: { $ne: true } };
    const LIBRARY_FOLDER_APPEND_VARIANTS = [
      ["createdBy", "folderManager", "folderManagers", "folderMember", "folderMembers"],
      ["createdBy", "folderManager", "folderMember"],
      null,
    ];
    // Max ids per `$in` filter — keeps the GET query string well under
    // typical URL limits when a scope spans hundreds of folders.
    const LIBRARY_IN_CHUNK_SIZE = 400;

    const chunkList = (list, size) => {
      const chunks = [];
      for (let i = 0; i < list.length; i += size) chunks.push(list.slice(i, i + size));
      return chunks;
    };

    const requestLibraryFolders = (filter) =>
      requestLibraryRows(
        "folders:list",
        LIBRARY_FOLDER_APPEND_VARIANTS.map((appends) => ({
          pageSize: 2000,
          page: 1,
          sort: ["createdAt"],
          filter: JSON.stringify(filter),
          ...(appends ? { appends } : {}),
        })),
      );

    const requestLibraryDocuments = (filter) =>
      requestLibraryRows("documents:list", [
        {
          pageSize: 2000,
          page: 1,
          sort: ["-createdAt"],
          filter: JSON.stringify(filter),
          appends: ["fileAttachment", "createdBy"],
        },
      ]);

    // documentShares rows of the current user only — tries a server-side
    // filter first (scalar userId, then the users relation) and only falls
    // back to the old unfiltered scan when neither shape exists.
    async function fetchLibraryShareRows(currentUserId) {
      if (!currentUserId) return [];
      const base = { pageSize: 2000, page: 1, sort: ["-createdAt"] };
      const rows = await requestLibraryRows("documentShares:list", [
        {
          ...base,
          filter: JSON.stringify({ userId: { $eq: currentUserId } }),
          appends: ["users", "documents"],
        },
        {
          ...base,
          filter: JSON.stringify({ users: { id: { $eq: currentUserId } } }),
          appends: ["users", "documents"],
        },
        { ...base, appends: ["users", "documents"] },
        base,
      ]);
      return rows.filter(
        (row) =>
          String(getLibraryShareRowUserId(row) || "") === String(currentUserId),
      );
    }

    // Tags every document with its current-user share rows (_shareRows) and,
    // when fetchMissingShared is on, pulls in shared documents the scoped
    // base query didn't return.
    async function mergeLibraryShares(
      baseDocuments,
      shareRows,
      { fetchMissingShared = true } = {},
    ) {
      const shareMap = new Map();
      shareRows.forEach((row) => {
        const documentId = getLibraryShareRowDocumentId(row);
        if (!documentId) return;
        const key = String(documentId);
        if (!shareMap.has(key)) shareMap.set(key, []);
        shareMap.get(key).push(row);
      });

      let sharedDocuments = [];
      if (fetchMissingShared && shareMap.size > 0) {
        const baseDocumentIds = new Set(
          baseDocuments.map((document) => String(extractId(document) || "")),
        );
        const missingSharedIds = Array.from(shareMap.keys()).filter(
          (id) => !baseDocumentIds.has(id),
        );
        const chunks = await Promise.all(
          chunkList(missingSharedIds, LIBRARY_IN_CHUNK_SIZE).map((ids) =>
            requestLibraryDocuments({ id: { $in: ids } }),
          ),
        );
        sharedDocuments = chunks.flat();
      }

      const documentMap = new Map();
      [...baseDocuments, ...sharedDocuments].forEach((document) => {
        const documentId = extractId(document);
        if (!documentId) return;
        const key = String(documentId);
        documentMap.set(key, {
          ...document,
          _shareRows: shareMap.get(key) || [],
        });
      });
      return Array.from(documentMap.values()).filter(
        (document) => document?.isDeleted !== true,
      );
    }

    // Full scan (every folder + document) — still what the Case tab needs,
    // since its tree spans the case, linked cases and Reference material.
    async function fetchTaskLibraryData(currentUserId) {
      const [folders, baseDocuments, shareRows] = await Promise.all([
        requestLibraryFolders(LIBRARY_ACTIVE_FILTER),
        requestLibraryDocuments(LIBRARY_ACTIVE_FILTER),
        fetchLibraryShareRows(currentUserId),
      ]);
      return {
        folders: folders.filter((folder) => folder?.isDeleted !== true),
        documents: await mergeLibraryShares(baseDocuments, shareRows),
      };
    }

    // "Choose from Internal Work Docs" — only this Internal Work's own
    // folders/documents (projectInternalId is stamped on every one of them,
    // see ProjectDocument.js), plus the ancestor folders above its root so
    // permissions inherited from a parent folder still resolve.
    async function fetchProjectInternalLibraryData(projectInternalId, currentUserId) {
      const safeProjectInternalId = extractId(projectInternalId);
      if (!safeProjectInternalId) return { folders: [], documents: [] };
      const scopeFilter = {
        $and: [
          LIBRARY_ACTIVE_FILTER,
          { projectInternalId: { $eq: safeProjectInternalId } },
        ],
      };
      const [scopedFolders, baseDocuments, shareRows] = await Promise.all([
        requestLibraryFolders(scopeFilter),
        requestLibraryDocuments(scopeFilter),
        fetchLibraryShareRows(currentUserId),
      ]);

      const folderMap = new Map();
      scopedFolders.forEach((folder) => {
        const id = extractId(folder);
        if (id) folderMap.set(String(id), folder);
      });
      for (let depth = 0; depth < 8; depth++) {
        const missingParentIds = Array.from(
          new Set(
            Array.from(folderMap.values())
              .map((folder) => extractId(folder?.parentId))
              .filter((id) => id && !folderMap.has(String(id)))
              .map(String),
          ),
        );
        if (missingParentIds.length === 0) break;
        const parents = await requestLibraryFolders({ id: { $in: missingParentIds } });
        if (parents.length === 0) break;
        parents.forEach((folder) => {
          const id = extractId(folder);
          if (id) folderMap.set(String(id), folder);
        });
      }

      return {
        folders: Array.from(folderMap.values()).filter(
          (folder) => folder?.isDeleted !== true,
        ),
        documents: await mergeLibraryShares(baseDocuments, shareRows, {
          fetchMissingShared: false,
        }),
      };
    }

    // "Choose from Library" for Internal Work tasks (Knowledge + My
    // Documents). Folders still come in full — Knowledge/My Documents
    // subfolders don't reliably carry storageType themselves (Library.js
    // resolves them through the real parent tree too) — but documents are
    // fetched only inside the folders that resolve to those 2 spaces,
    // instead of every document in the system.
    async function fetchWorkspaceLibraryData(currentUserId) {
      const workspaceScopes = [KNOWLEDGE_STORAGE_TYPE, MY_DOCUMENT_STORAGE_TYPE];
      const [allFolders, shareRows] = await Promise.all([
        requestLibraryFolders(LIBRARY_ACTIVE_FILTER),
        fetchLibraryShareRows(currentUserId),
      ]);
      const folders = allFolders.filter((folder) => folder?.isDeleted !== true);

      const folderMap = new Map();
      folders.forEach((folder) => {
        const id = extractId(folder);
        if (id) folderMap.set(String(id), folder);
      });
      const inWorkspaceMemo = new Map();
      const isWorkspaceFolder = (folder, seen = new Set()) => {
        const key = String(extractId(folder) || "");
        if (!key || seen.has(key)) return false;
        if (inWorkspaceMemo.has(key)) return inWorkspaceMemo.get(key);
        seen.add(key);
        const direct =
          workspaceScopes.includes(String(folder?.storageType || "").toLowerCase()) ||
          workspaceScopes.includes(String(folder?.moduleScope || "").toLowerCase());
        const parent = folderMap.get(String(extractId(folder?.parentId) || ""));
        const result = direct || (!!parent && isWorkspaceFolder(parent, seen));
        inWorkspaceMemo.set(key, result);
        return result;
      };
      const workspaceFolderIds = folders
        .filter((folder) => isWorkspaceFolder(folder))
        .map((folder) => extractId(folder))
        .filter(Boolean);

      const scopeFilter = (extra) => ({ $and: [LIBRARY_ACTIVE_FILTER, extra] });
      const documentRequests = [
        requestLibraryDocuments(
          scopeFilter({
            $or: [
              { storageType: { $in: workspaceScopes } },
              { moduleScope: { $in: workspaceScopes } },
            ],
          }),
        ),
        ...chunkList(workspaceFolderIds, LIBRARY_IN_CHUNK_SIZE).map((ids) =>
          requestLibraryDocuments(scopeFilter({ folderId: { $in: ids } })),
        ),
      ];
      const baseDocuments = (await Promise.all(documentRequests)).flat();
      return {
        folders,
        documents: await mergeLibraryShares(baseDocuments, shareRows),
      };
    }

    // Block-level cache for the "Choose from ..." pickers — lives as long as
    // this block stays mounted (reopening the attach modal, switching tabs).
    // Not stored on window: the RunJS sandbox's window proxy throws on
    // reading unknown globals and keeps writes private to each run
    // (flow-engine safeGlobals.ts). Serves cached data instantly and
    // refetches in the background once it's older than the TTL
    // (stale-while-revalidate), de-duplicating concurrent requests.
    const TASK_LIBRARY_CACHE_TTL_MS = 60 * 1000;
    const taskLibraryDataCache = new Map();

    const peekTaskLibraryData = (cacheKey) =>
      taskLibraryDataCache.get(cacheKey)?.data || null;

    const loadTaskLibraryData = (cacheKey, fetcher) => {
      const entry = taskLibraryDataCache.get(cacheKey);
      if (entry?.promise) return entry.promise;
      if (entry?.data && Date.now() - entry.at < TASK_LIBRARY_CACHE_TTL_MS) {
        return Promise.resolve(entry.data);
      }
      const promise = fetcher()
        .then((data) => {
          taskLibraryDataCache.set(cacheKey, { data, at: Date.now(), promise: null });
          return data;
        })
        .catch((error) => {
          const previous = taskLibraryDataCache.get(cacheKey);
          taskLibraryDataCache.set(cacheKey, { ...(previous || {}), promise: null });
          throw error;
        });
      taskLibraryDataCache.set(cacheKey, { ...(entry || {}), promise });
      return promise;
    };

    // Forces the next load to refetch (e.g. after files were just added).
    const invalidateTaskLibraryData = (prefix = "") => {
      Array.from(taskLibraryDataCache.keys()).forEach((key) => {
        if (!prefix || key.startsWith(prefix)) {
          const entry = taskLibraryDataCache.get(key);
          taskLibraryDataCache.set(key, { ...(entry || {}), at: 0 });
        }
      });
    };

    async function fetchLibraryRelationRows(caseId, relationName) {
      const safeCaseId = extractId(caseId);
      if (!safeCaseId) return [];
      const candidates = [
        `projects/${encodeURIComponent(safeCaseId)}/${relationName}:list`,
        `cases/${encodeURIComponent(safeCaseId)}/${relationName}:list`,
      ];
      for (const url of candidates) {
        for (const params of [
          { pageSize: 1000, page: 1, appends: ["createdBy"] },
          { pageSize: 1000, page: 1 },
        ]) {
          try {
            const response = await ctx.api.request({ url, params });
            return (response?.data?.data || []).filter(
              (record) => record?.isDeleted !== true,
            );
          } catch {}
        }
      }
      return [];
    }

    const makeLibrarySource = (group, entityId = null) => ({
      group,
      entityId: extractId(entityId),
    });

    const getLibrarySourceKey = (source) =>
      source
        ? `${source.group}:${source.entityId ? String(source.entityId) : "root"}`
        : "";

    const getDirectLibrarySource = (record, context) => {
      const storageType = String(record?.storageType || "").trim().toLowerCase();
      const moduleScope = String(record?.moduleScope || "").trim().toLowerCase();
      const caseRecordId = getLibraryRecordCaseId(record);
      const legalReferenceId = getLibraryRecordLegalReferenceId(record);
      const legalStudyId = getLibraryRecordLegalStudyId(record);
      const isLegalStudyRecord =
        storageType === LEGAL_STUDY_STORAGE_TYPE ||
        moduleScope === LEGAL_STUDY_MODULE_SCOPE;
      const isLegalReferenceRecord =
        storageType === LIBRARY_SOURCE.LEGAL_REFERENCE ||
        moduleScope === LIBRARY_SOURCE.LEGAL_REFERENCE;

      if (
        storageType === MY_DOCUMENT_STORAGE_TYPE ||
        moduleScope === MY_DOCUMENT_STORAGE_TYPE
      ) {
        return makeLibrarySource(LIBRARY_SOURCE.MY_DOCUMENTS);
      }

      if (
        storageType === KNOWLEDGE_STORAGE_TYPE ||
        moduleScope === KNOWLEDGE_STORAGE_TYPE
      ) {
        return makeLibrarySource(LIBRARY_SOURCE.KNOWLEDGE);
      }

      // Checked before any Case/Reference rule: ProjectDocument.js treats ANY
      // record carrying this projectInternalId as its own regardless of
      // moduleScope, so the picker mirrors exactly what its Docs tab shows.
      if (context.currentProjectInternalId) {
        const projectInternalId = getLibraryRecordProjectInternalId(record);
        if (
          projectInternalId &&
          String(projectInternalId) === String(context.currentProjectInternalId)
        ) {
          return makeLibrarySource(
            LIBRARY_SOURCE.PROJECT_INTERNAL_DOCUMENT,
            context.currentProjectInternalId,
          );
        }
      }

      if (legalStudyId && context.legalStudyIds.has(String(legalStudyId))) {
        return makeLibrarySource(LIBRARY_SOURCE.LEGAL_STUDY, legalStudyId);
      }

      if (isLegalStudyRecord) {
        const source = parseLegalStudySource(record?.legalStudySource);
        const sourceCaseId =
          extractId(source?.caseId) ||
          extractId(record?.sourceProjectId) ||
          caseRecordId;
        if (
          context.currentCaseId &&
          sourceCaseId &&
          String(sourceCaseId) === String(context.currentCaseId)
        ) {
          return makeLibrarySource(LIBRARY_SOURCE.LEGAL_STUDY);
        }
        return null;
      }

      if (legalReferenceId && context.legalReferenceIds.has(String(legalReferenceId))) {
        return makeLibrarySource(LIBRARY_SOURCE.LEGAL_REFERENCE, legalReferenceId);
      }

      if (isLegalReferenceRecord) return null;

      if (caseRecordId && context.caseReferenceIds.has(String(caseRecordId))) {
        return makeLibrarySource(LIBRARY_SOURCE.CASE_REFERENCE, caseRecordId);
      }

      if (
        caseRecordId &&
        context.currentCaseId &&
        String(caseRecordId) === String(context.currentCaseId)
      ) {
        return makeLibrarySource(
          LIBRARY_SOURCE.CASE_DOCUMENT,
          context.currentCaseId,
        );
      }

      return null;
    };

    const buildLibraryEntityMap = (records = []) => {
      const map = new Map();
      records.forEach((record) => {
        const id = extractId(record);
        if (id) map.set(String(id), record);
      });
      return map;
    };

    const sortLibraryRecords = (records = [], getLabel) =>
      [...records].sort((left, right) =>
        String(getLabel(left) || "").localeCompare(
          String(getLabel(right) || ""),
          "vi",
          { sensitivity: "base" },
        ),
      );

    const getLibraryDocumentAttachment = (document) =>
      Array.isArray(document?.fileAttachment)
        ? document.fileAttachment[0]
        : document?.fileAttachment;

    const getLibraryDocumentTitle = (document, attachment) =>
      document?.title ||
      document?.name ||
      document?.documentCode ||
      attachment?.title ||
      attachment?.filename ||
      `Document #${extractId(document) || ""}`;

    const getLibraryDocumentExtension = (document, attachment) => {
      const explicitExtension = String(attachment?.extname || "").trim();
      if (explicitExtension) {
        return explicitExtension.startsWith(".")
          ? explicitExtension.toLowerCase()
          : `.${explicitExtension.toLowerCase()}`;
      }
      const fileName = String(
        attachment?.filename ||
          attachment?.title ||
          document?.title ||
          document?.name ||
          "",
      );
      const match = fileName.match(/(\.[a-z0-9]+)$/i);
      return match ? match[1].toLowerCase() : "";
    };

    const renderLibraryTreeTitle = (label, type = "folder", extension = "") => {
      const fileInfo = getExtInfo(extension);
      const icon =
        type === "file"
          ? React.createElement(
              "span",
              {
                style: {
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  background: fileInfo.bg,
                  color: fileInfo.color,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 13,
                },
              },
              fileInfo.icon,
            )
          : React.createElement(
              "span",
              {
                style: {
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  background: "#FFF7E6",
                  color: "#D97706",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                },
              },
              TASK_FILE_ACTION_ICONS.folder,
            );

      return React.createElement(
        "span",
        {
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            minWidth: 0,
          },
        },
        icon,
        React.createElement(
          "span",
          {
            style: {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          },
          label,
        ),
      );
    };

    const buildDocumentNode = (document) => {
      const attachment = getLibraryDocumentAttachment(document);
      const documentId = extractId(document);
      const title = getLibraryDocumentTitle(document, attachment);
      const extension = getLibraryDocumentExtension(document, attachment);
      return {
        title: renderLibraryTreeTitle(title, "file", extension),
        searchText: title,
        value: `library_doc_${documentId}`,
        key: `library_doc_${documentId}`,
        isLeaf: true,
        docData: document,
        attData: attachment,
      };
    };

    const pruneEmptyFolderNodes = (nodes) =>
      nodes
        .map((node) => ({
          ...node,
          children: pruneEmptyFolderNodes(node.children || []),
        }))
        .filter((node) => node.isLeaf || node.children.length > 0);

    // Shared plumbing behind every "Choose from ..." tree builder below —
    // resolves each folder/document to a LIBRARY_SOURCE bucket (walking a
    // (sub)folder's parentId chain up to the nearest ancestor that carries the
    // source directly, mirrors CaseDocument.js's resolveFolderTreeRoot),
    // applies the same folder-permission model (owner/manager/member, folder
    // descendants, or a direct documentShares grant), and exposes
    // buildBucketChildren/buildFlatEntityChildren/findBucketRootFolder so each
    // concrete builder only has to decide WHICH buckets (context.includeGroups)
    // become top-level groups — buildTaskLibraryTree (Case/Reference, below)
    // and buildTaskWorkspaceLibraryTree (Knowledge/My Documents, further below)
    // both need the exact same tree-assembly logic, just different buckets.
    const buildLibraryBucketResolver = ({
      folders,
      documents,
      currentUser,
      currentLawyerId,
      context,
    }) => {
      const userId = extractId(currentUser?.id);
      const isAdmin = isAdminUser(currentUser);

      const folderMap = new Map();
      folders.forEach((folder) => {
        const id = extractId(folder);
        if (id) folderMap.set(String(id), folder);
      });

      const folderSourceMap = new Map();
      const resolvingFolderIds = new Set();
      const resolveFolderSource = (folder) => {
        const folderId = extractId(folder);
        if (!folderId) return null;
        const key = String(folderId);
        if (folderSourceMap.has(key)) return folderSourceMap.get(key);
        if (resolvingFolderIds.has(key)) return null;
        resolvingFolderIds.add(key);

        let source = getDirectLibrarySource(folder, context);
        if (!source) {
          const parentId = extractId(folder?.parentId);
          const parentFolder = parentId ? folderMap.get(String(parentId)) : null;
          if (parentFolder) source = resolveFolderSource(parentFolder);
        }

        resolvingFolderIds.delete(key);
        folderSourceMap.set(key, source);
        return source;
      };
      folders.forEach(resolveFolderSource);

      const { accessible, navOnly } = getVisibleFolderIds(
        folders,
        currentUser,
        currentLawyerId,
      );
      const accessibleIds = new Set(
        Array.from(accessible).filter(Boolean).map(String),
      );
      const navigationIds = new Set(
        Array.from(navOnly).filter(Boolean).map(String),
      );

      const visibleFolders = folders.filter((folder) => {
        const folderId = extractId(folder);
        const source = folderId ? folderSourceMap.get(String(folderId)) : null;
        if (!source || !context.includeGroups.has(source.group)) return false;
        return (
          accessibleIds.has(String(folderId)) ||
          navigationIds.has(String(folderId))
        );
      });

      const visibleDocuments = [];
      documents.forEach((document) => {
        const attachment = getLibraryDocumentAttachment(document);
        if (!attachment?.id) return;

        let source = getDirectLibrarySource(document, context);
        const folderId = extractId(document?.folderId);
        if (!source && folderId) {
          source = folderSourceMap.get(String(folderId));
        }
        if (!source || !context.includeGroups.has(source.group)) return;

        const isShared = isLibraryDocumentSharedWithUser(document, userId);
        const folderAccessible = !folderId || accessibleIds.has(String(folderId));
        const canView = !!userId && (isAdmin || folderAccessible || isShared);
        if (!canView) return;

        visibleDocuments.push({
          ...document,
          _librarySource: source,
          _libraryDirectShare: isShared && !folderAccessible,
        });
      });

      // The folder that carries a given source directly (not inherited via a
      // parentId walk) is that case/entity's own auto-created container
      // folder — its real name (e.g. "C001062026 - Vụ việc mẫu") is a better
      // label than a generic "Current case" placeholder.
      const findBucketRootFolder = (sourceKey) =>
        visibleFolders.find((folder) => {
          const direct = getDirectLibrarySource(folder, context);
          return direct && getLibrarySourceKey(direct) === sourceKey;
        });

      const buildBucketChildren = (sourceKey, options = {}) => {
        const { flattenRoot = true } = options;
        const bucketFolders = visibleFolders.filter((folder) => {
          const folderId = extractId(folder);
          const source = folderId ? folderSourceMap.get(String(folderId)) : null;
          return getLibrarySourceKey(source) === sourceKey;
        });
        const bucketDocuments = visibleDocuments.filter(
          (document) => getLibrarySourceKey(document._librarySource) === sourceKey,
        );

        const nodeMap = new Map();
        const sortedFolders = sortLibraryRecords(
          bucketFolders,
          (folder) => folder?.name || folder?.title || "",
        );
        sortedFolders.forEach((folder) => {
          const folderId = extractId(folder);
          const folderTitle = folder?.name || folder?.title || `Folder #${folderId}`;
          nodeMap.set(String(folderId), {
            title: renderLibraryTreeTitle(folderTitle),
            searchText: folderTitle,
            value: `library_folder_${folderId}`,
            key: `library_folder_${folderId}`,
            selectable: false,
            children: [],
          });
        });

        // The case/entity's own auto-created container folder carries the
        // source directly (getDirectLibrarySource matches it without a
        // parentId walk); everything else inherits the source from it. Only
        // "Current case" flattens it away — its group label already shows
        // that folder's real name, so keeping the node would just duplicate
        // it. Every other category (Linked cases, Reference) skips the
        // flatten and shows this folder as-is, since it's the real routing
        // node a user would click into (mirrors actual parent-child folder
        // structure instead of a synthetic type/entity grouping).
        const bucketRootFolder = flattenRoot ? findBucketRootFolder(sourceKey) : null;
        const bucketRootFolderIds = new Set(
          bucketRootFolder ? [String(extractId(bucketRootFolder))] : [],
        );

        const roots = [];
        sortedFolders.forEach((folder) => {
          const folderId = String(extractId(folder) || "");
          const parentId = String(extractId(folder?.parentId) || "");
          const node = nodeMap.get(folderId);
          if (!node) return;
          if (parentId && nodeMap.has(parentId)) {
            nodeMap.get(parentId).children.push(node);
          } else {
            roots.push(node);
          }
        });

        const rootDocuments = [];
        const directShareDocuments = [];
        sortLibraryRecords(bucketDocuments, (document) =>
          getLibraryDocumentTitle(document, getLibraryDocumentAttachment(document)),
        ).forEach((document) => {
          const folderId = String(extractId(document?.folderId) || "");
          const documentNode = buildDocumentNode(document);
          if (folderId && nodeMap.has(folderId) && !document._libraryDirectShare) {
            nodeMap.get(folderId).children.push(documentNode);
          } else if (document._libraryDirectShare) {
            directShareDocuments.push(documentNode);
          } else {
            rootDocuments.push(documentNode);
          }
        });

        const flattenedRoots = [];
        roots.forEach((node) => {
          const folderId = String(node.key || "").replace("library_folder_", "");
          if (bucketRootFolderIds.has(folderId)) {
            flattenedRoots.push(...(node.children || []));
          } else {
            flattenedRoots.push(node);
          }
        });

        const children = [...rootDocuments, ...pruneEmptyFolderNodes(flattenedRoots)];
        if (directShareDocuments.length > 0) {
          const sharedTitle = "Shared directly";
          children.push({
            title: renderLibraryTreeTitle(sharedTitle),
            searchText: sharedTitle,
            value: `library_shared_${sourceKey}`,
            key: `library_shared_${sourceKey}`,
            selectable: false,
            children: directShareDocuments,
          });
        }
        return children;
      };

      // Collects every entity's own root folder (or its loose root documents,
      // if it has no folder yet) directly — no synthetic per-entity label
      // node. The folder's own real name is what identifies it, so the tree
      // mirrors actual parent-child folder structure instead of routing
      // through a virtual "entity" or "type" node.
      const buildFlatEntityChildren = (group, entityMap) => {
        const nodes = [];
        entityMap.forEach((_record, entityId) => {
          const sourceKey = getLibrarySourceKey(makeLibrarySource(group, entityId));
          nodes.push(...buildBucketChildren(sourceKey, { flattenRoot: false }));
        });
        return sortLibraryRecords(nodes, (node) => node.searchText || "");
      };

      return { findBucketRootFolder, buildBucketChildren, buildFlatEntityChildren };
    };

    // "Choose from Case's Document" tree — shows 3 groups: the current case's
    // own full folder tree, folders/documents belonging to linked (referenced)
    // cases, and Reference material (legal reference + legal study) already
    // linked to the case. Knowledge and My Documents are excluded since
    // neither is case-scoped (see buildTaskWorkspaceLibraryTree below, used
    // instead for ProjectInternal tasks which have no Case to browse).
    const buildTaskLibraryTree = ({
      folders,
      documents,
      currentUser,
      currentLawyerId,
      currentCaseId,
      caseReferences = [],
      legalReferences = [],
      legalStudies = [],
    }) => {
      const safeCaseId = extractId(currentCaseId);

      const caseReferenceMap = buildLibraryEntityMap(caseReferences);
      const legalReferenceMap = buildLibraryEntityMap(legalReferences);
      const legalStudyMap = buildLibraryEntityMap(legalStudies);

      const context = {
        currentCaseId: safeCaseId,
        caseReferenceIds: new Set(caseReferenceMap.keys()),
        legalReferenceIds: new Set(legalReferenceMap.keys()),
        legalStudyIds: new Set(legalStudyMap.keys()),
        includeGroups: new Set([
          LIBRARY_SOURCE.CASE_DOCUMENT,
          LIBRARY_SOURCE.CASE_REFERENCE,
          LIBRARY_SOURCE.LEGAL_REFERENCE,
          LIBRARY_SOURCE.LEGAL_STUDY,
        ]),
      };

      const { findBucketRootFolder, buildBucketChildren, buildFlatEntityChildren } =
        buildLibraryBucketResolver({
          folders,
          documents,
          currentUser,
          currentLawyerId,
          context,
        });

      const groups = [];

      if (safeCaseId) {
        const currentCaseSourceKey = getLibrarySourceKey(
          makeLibrarySource(LIBRARY_SOURCE.CASE_DOCUMENT, safeCaseId),
        );
        const currentCaseChildren = buildBucketChildren(currentCaseSourceKey);
        const currentCaseRootFolder = findBucketRootFolder(currentCaseSourceKey);
        const currentCaseLabel =
          currentCaseRootFolder?.name ||
          currentCaseRootFolder?.title ||
          "Current case";
        groups.push({
          title: renderLibraryTreeTitle(currentCaseLabel),
          searchText: currentCaseLabel,
          value: "library_group_current_case",
          key: "library_group_current_case",
          selectable: false,
          children: currentCaseChildren,
        });
      }

      const linkedCaseChildren = buildFlatEntityChildren(
        LIBRARY_SOURCE.CASE_REFERENCE,
        caseReferenceMap,
      );
      if (linkedCaseChildren.length > 0) {
        groups.push({
          title: renderLibraryTreeTitle("Linked cases"),
          searchText: "Linked cases",
          value: "library_group_linked_cases",
          key: "library_group_linked_cases",
          selectable: false,
          children: linkedCaseChildren,
        });
      }

      const legalReferenceChildren = buildFlatEntityChildren(
        LIBRARY_SOURCE.LEGAL_REFERENCE,
        legalReferenceMap,
      );
      const legalStudyRootChildren = buildBucketChildren(
        getLibrarySourceKey(makeLibrarySource(LIBRARY_SOURCE.LEGAL_STUDY, null)),
        { flattenRoot: false },
      );
      const legalStudyEntityChildren = buildFlatEntityChildren(
        LIBRARY_SOURCE.LEGAL_STUDY,
        legalStudyMap,
      );
      const referenceChildren = sortLibraryRecords(
        [...legalReferenceChildren, ...legalStudyRootChildren, ...legalStudyEntityChildren],
        (node) => node.searchText || "",
      );
      if (referenceChildren.length > 0) {
        groups.push({
          title: renderLibraryTreeTitle("Reference"),
          searchText: "Reference",
          value: "library_group_reference",
          key: "library_group_reference",
          selectable: false,
          children: referenceChildren,
        });
      }

      return groups;
    };

    // "Choose from Library" tree for a ProjectInternal (Internal Work) task's
    // attach-file modal — these tasks have no Case/Reference to browse (see
    // isProjectInternalContext), so instead of buildTaskLibraryTree above,
    // this surfaces the 2 spaces that exist outside a Case: the company-level
    // Knowledge library and the current user's own My Documents — gated by the
    // exact same folder-permission model (owner/manager/member, folder
    // descendants, or a direct documentShares grant). The task's own
    // Internal Work Docs have their own tab (buildTaskProjectInternalLibraryTree).
    const buildTaskWorkspaceLibraryTree = ({
      folders,
      documents,
      currentUser,
      currentLawyerId,
    }) => {
      const context = {
        currentCaseId: null,
        caseReferenceIds: new Set(),
        legalReferenceIds: new Set(),
        legalStudyIds: new Set(),
        includeGroups: new Set([LIBRARY_SOURCE.KNOWLEDGE, LIBRARY_SOURCE.MY_DOCUMENTS]),
      };

      const { buildBucketChildren } = buildLibraryBucketResolver({
        folders,
        documents,
        currentUser,
        currentLawyerId,
        context,
      });

      // The space's own category root folder (literally named "Knowledge" /
      // "My Documents" in Library.js) would otherwise show up as a second
      // node with the same name right under the group — unwrap it so the
      // group lists that folder's contents directly.
      const unwrapCategoryRootFolder = (children, label) => {
        const target = normalizeLookupText(label);
        return children.flatMap((node) =>
          String(node.key || "").startsWith("library_folder_") &&
          normalizeLookupText(node.searchText || "") === target
            ? node.children || []
            : [node],
        );
      };

      const groups = [];

      const knowledgeChildren = unwrapCategoryRootFolder(
        buildBucketChildren(
          getLibrarySourceKey(makeLibrarySource(LIBRARY_SOURCE.KNOWLEDGE, null)),
          { flattenRoot: false },
        ),
        "Knowledge",
      );
      if (knowledgeChildren.length > 0) {
        groups.push({
          title: renderLibraryTreeTitle("Knowledge"),
          searchText: "Knowledge",
          value: "library_group_knowledge",
          key: "library_group_knowledge",
          selectable: false,
          children: knowledgeChildren,
        });
      }

      const myDocumentsChildren = unwrapCategoryRootFolder(
        buildBucketChildren(
          getLibrarySourceKey(makeLibrarySource(LIBRARY_SOURCE.MY_DOCUMENTS, null)),
          { flattenRoot: false },
        ),
        "My Documents",
      );
      if (myDocumentsChildren.length > 0) {
        groups.push({
          title: renderLibraryTreeTitle("My Documents"),
          searchText: "My Documents",
          value: "library_group_my_documents",
          key: "library_group_my_documents",
          selectable: false,
          children: myDocumentsChildren,
        });
      }

      return groups;
    };

    // "Choose from Internal Work Docs" tree — the current Internal Work's own
    // Document space (same records ProjectDocument.js's Docs tab shows), with
    // the same folder-permission model as every other picker. flattenRoot:
    // false — every Internal Work folder carries projectInternalId directly,
    // so findBucketRootFolder can't single out the real root; the tree shows
    // the actual folder hierarchy (root folder first) instead.
    const buildTaskProjectInternalLibraryTree = ({
      folders,
      documents,
      currentUser,
      currentLawyerId,
      currentProjectInternalId,
    }) => {
      const safeProjectInternalId = extractId(currentProjectInternalId);
      if (!safeProjectInternalId) return [];
      const context = {
        currentCaseId: null,
        currentProjectInternalId: safeProjectInternalId,
        caseReferenceIds: new Set(),
        legalReferenceIds: new Set(),
        legalStudyIds: new Set(),
        includeGroups: new Set([LIBRARY_SOURCE.PROJECT_INTERNAL_DOCUMENT]),
      };
      const { buildBucketChildren } = buildLibraryBucketResolver({
        folders,
        documents,
        currentUser,
        currentLawyerId,
        context,
      });
      return buildBucketChildren(
        getLibrarySourceKey(
          makeLibrarySource(LIBRARY_SOURCE.PROJECT_INTERNAL_DOCUMENT, safeProjectInternalId),
        ),
        { flattenRoot: false },
      );
    };

    // ============================================================
    // §5 ATOMS
    // ============================================================

    const ReloadButton = ({ onReload, loading, text = "Refresh", style = {} }) => {
      return React.createElement(
        Button,
        {
          size: "medium",
          onClick: onReload,
          loading: loading,
          style: {
            padding: "5px 16px",
            fontFamily: FONT,
            fontSize: 12,
            borderRadius: 4,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            ...style,
          },
        },
        !loading ? `↻ ${text}` : text,
      );
    };

    const Av = ({ name, color, size = 20 }) =>
      React.createElement(
        "div",
        {
          title: name,
          style: {
            width: size,
            height: size,
            borderRadius: "50%",
            background: color || "#8c8c8c",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.42,
            color: "#fff",
            fontWeight: 500,
            flexShrink: 0,
          },
        },
        (name || "?").charAt(0).toUpperCase(),
      );

    // ============================================================
    // §RICHTEXT — QuillEditor (ctx.requireAsync CDN, with inline "@" mention) + CommentComposer
    // ============================================================

    // ── Async loader: ctx.requireAsync returns the UMD export directly ────
    // Per Nocobase docs, ctx.requireAsync('...js') returns the library object.
    // For Quill UMD: the return value IS the Quill constructor.
    // We must NOT access window.Quill (window.* globals are sandboxed).
    let _quillLoadPromise = null;
    const QUILL_FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px"];
    const QUILL_SIZE_LABEL_CSS = QUILL_FONT_SIZES.map(
      (size) => `
        .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="${size}"]::before,
        .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="${size}"]::before { content: "${size}"; }
      `,
    ).join("");
    // Shared visual style for an inline "@Name" mention chip — used both by
    // the Quill MentionBlot below (authoring) and matches what
    // getCommentText()'s ".mention-tag, [data-id]" selector expects to find.
    const MENTION_TAG_STYLE_CSS =
      "color: #096dd9; background: #e6f4ff; border-radius: 4px; padding: 0 4px; font-weight: 600; font-size: 13px; border: 1px solid #91caff; margin: 0 2px; display: inline-block;";
    const loadQuillAsync = () => {
      if (_quillLoadPromise) return _quillLoadPromise;
      _quillLoadPromise = ctx
        .requireAsync(
          "https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.snow.css",
        )
        .then(() =>
          ctx.requireAsync(
            "https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.min.js",
          ),
        )
        .then((QuillLib) => {
          // Normalize UMD export: could be the class itself, .default, or .Quill
          const Q =
            QuillLib && typeof QuillLib === "function"
              ? QuillLib
              : (QuillLib && QuillLib.default) ||
                (QuillLib && QuillLib.Quill) ||
                QuillLib;
          if (!Q) throw new Error("Quill constructor not found in UMD export");
          try {
            const SizeStyle = Q.import("attributors/style/size");
            SizeStyle.whitelist = QUILL_FONT_SIZES;
            Q.register(SizeStyle, true);
          } catch {}
          try {
            // Custom inline "mention" embed — the "@Name" chip inserted when
            // picking a lawyer from the in-editor "@" trigger dropdown (see
            // QuillEditor below). Registered once here, before any Quill
            // instance is created, so quill.insertEmbed(i, "mention", {...})
            // works for every editor instance. Markup (class "mention-tag" +
            // data-id) matches what getCommentText() and the mention
            // auto-sync logic already expect from the legacy contentEditable
            // mention format.
            const Embed = Q.import("blots/embed");
            class MentionBlot extends Embed {
              static create(data) {
                const node = super.create();
                node.setAttribute("data-id", data.id);
                node.setAttribute("contenteditable", "false");
                node.classList.add("mention-tag");
                node.style.cssText = MENTION_TAG_STYLE_CSS;
                node.textContent = `@${data.name}`;
                return node;
              }
              static value(node) {
                return {
                  id: node.getAttribute("data-id"),
                  name: (node.textContent || "").replace(/^@/, ""),
                };
              }
            }
            MentionBlot.blotName = "mention";
            // NOT "span" — Parchment's Registry.query() matches a pasted
            // DOM node to a registered Blot primarily by bare tagName
            // (this.tags[node.tagName]), with no way to additionally
            // require a class/attribute for a Blot (only Attributors
            // support class-scoped matching). Since ordinary <span> tags
            // are near-universal in any pasted rich text (Word, Google
            // Docs, other apps' bold/colored spans, even this app's own
            // comment history), registering the mention blot under "span"
            // meant Quill's clipboard converter (matchBlot) treated EVERY
            // pasted <span> as a mention embed — reading its (usually
            // absent) data-id attribute and text content, and silently
            // replacing the span with a bogus "@name" mention chip. A
            // unique, real-HTML-incompatible tag name means no pasted
            // content can ever collide with this registration.
            MentionBlot.tagName = "law-mention";
            Q.register(MentionBlot, true);
          } catch {}
          return Q;
        });
      return _quillLoadPromise;
    };
    // Kick off loading immediately so Quill is ready when component mounts
    loadQuillAsync().catch(() => {});

    // ── QuillEditor ────────────────────────────────────────────────────
    const QUILL_CUSTOM_CSS = `
        .ql-container.ql-snow { border: none !important; font-family: Montserrat, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; border-radius: 0 0 8px 8px !important; }
        .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #f0f0f0 !important; padding: 6px 8px !important; background: #f8f8f8 !important; border-radius: 8px 8px 0 0 !important; flex-wrap: wrap !important; }
        .ql-editor { min-height: 40px; max-height: 240px; overflow-y: auto; font-size: 14px; line-height: 1.7; padding: 12px 16px; font-family: Montserrat, sans-serif; }
        .ql-editor.ql-blank::before { color: #bfbfbf; font-style: normal; }
        .ql-editor blockquote { border-left: 3px solid #1890ff; padding-left: 10px; color: #595959; margin: 6px 0; }
        .ql-editor pre { background: #f6f8fa; border-radius: 6px; padding: 10px 14px; font-size: 12.5px; color: #333; }
        .ql-editor img { max-width: 100%; height: auto; display: block; border-radius: 4px; margin: 4px 0; }
        .ql-snow .ql-stroke { stroke: #555 !important; }
        .ql-snow .ql-fill { fill: #555 !important; }
        .ql-snow.ql-toolbar button:hover .ql-stroke, .ql-snow .ql-toolbar button:hover .ql-stroke { stroke: #1890ff !important; }
        .ql-snow.ql-toolbar button.ql-active .ql-stroke { stroke: #1890ff !important; }
        .ql-snow.ql-toolbar button.ql-active .ql-fill { fill: #1890ff !important; }
        .ql-snow .ql-picker.ql-size { width: 68px !important; }
        .ql-snow .ql-picker.ql-size .ql-picker-label::before { content: "14px"; }
        ${QUILL_SIZE_LABEL_CSS}
        .wysiwyg-content.ql-editor { padding: 0 !important; min-height: auto !important; max-height: none !important; overflow-y: visible !important; border: none !important; }
      `;

    const QuillEditor = ({
      value,
      onChange,
      placeholder,
      onSubmit,
      onUploadClick,
      lawyers = [],
      assignedIds = [],
      onAssignMultiple,
    }) => {
      const containerRef = useRef(null);
      // Ref to the outer wrapper (position:relative) — used as the anchor
      // for the mention dropdown's rect-delta position math below, instead
      // of relying on offsetTop/offsetLeft chains through Quill's internal
      // DOM (which can silently break, see the mention dropdown effect).
      const wrapperRef = useRef(null);
      const quillRef = useRef(null);
      const [ready, setReady] = useState(false);
      const [error, setError] = useState(null);
      const onChangeRef = useRef(onChange);
      const onUploadClickRef = useRef(onUploadClick);
      const onSubmitRef = useRef(onSubmit);
      const lawyersRef = useRef(lawyers);
      const assignedIdsRef = useRef(assignedIds);
      const onAssignMultipleRef = useRef(onAssignMultiple);
      // Mention ids ever seen as an inline chip in this editor session — lets
      // the delete-sync below (only) prune ids the user actually deleted the
      // chip for, without touching ids that arrived pre-set from outside
      // (e.g. editing an old comment whose assignees predate inline mentions
      // and have no chip in the body at all).
      const seenMentionIdsRef = useRef(new Set());
      // Set true by the capture-phase paste listener below, consumed (and
      // cleared) by the very next text-change event — lets "@" trigger
      // detection skip the change produced by a paste. NOT reset by a
      // fixed-delay timer: Quill's own Clipboard module (quill.js 1.3.7)
      // does not apply pasted content synchronously within the "paste"
      // event — it defers via its own internal `setTimeout(..., 1)` so the
      // browser has time to finish writing the pasted DOM into a hidden
      // container first. A same-tick `setTimeout(0)` reset here would fire
      // BEFORE that (0ms < 1ms), clearing the flag before Quill's deferred
      // updateContents() ever runs, which is exactly why the flag needs to
      // be consumed by the text-change handler itself instead of by a timer.
      const pasteInProgressRef = useRef(false);
      // Safety net only, in case a paste is cancelled or otherwise never
      // produces a text-change (e.g. empty clipboard) — without this the
      // flag above could stay stuck "on" and wrongly suppress the next,
      // unrelated "@" trigger. Cleared/replaced on every paste and consumed
      // whenever the flag itself is consumed.
      const pasteFallbackResetTimerRef = useRef(null);

      // ── "@" mention dropdown — typing "@" directly in the editor opens a
      // lawyer picker at the caret (replaces the old standalone "Mention
      // someone" button). Selecting an entry inserts a Quill "mention" embed
      // (registered in loadQuillAsync) and adds the lawyer to assignedIds.
      const [mentionOpen, setMentionOpen] = useState(false);
      const [mentionQuery, setMentionQuery] = useState("");
      const [mentionActiveIdx, setMentionActiveIdx] = useState(0);
      const [mentionPos, setMentionPos] = useState({ top: 0, left: 0, maxHeight: 360 });
      const mentionMatchRef = useRef(null); // { start, length } — Quill text-index space
      const mentionOpenRef = useRef(false);
      const mentionActiveIdxRef = useRef(0);
      const selectMentionLawyerRef = useRef(null);
      // Row elements of the currently rendered dropdown list, keyed by index —
      // populated via a ref callback in the render below, used to keep the
      // arrow-key-highlighted row scrolled into view (mouse hover doesn't need
      // this since the pointer is already over a visible row).
      const mentionItemElsRef = useRef({});

      useEffect(() => {
        onChangeRef.current = onChange;
      }, [onChange]);
      useEffect(() => {
        onUploadClickRef.current = onUploadClick;
      }, [onUploadClick]);
      useEffect(() => {
        onSubmitRef.current = onSubmit;
      }, [onSubmit]);
      useEffect(() => {
        lawyersRef.current = lawyers;
      }, [lawyers]);
      useEffect(() => {
        assignedIdsRef.current = assignedIds;
      }, [assignedIds]);
      useEffect(() => {
        onAssignMultipleRef.current = onAssignMultiple;
      }, [onAssignMultiple]);
      useEffect(() => {
        mentionOpenRef.current = mentionOpen;
      }, [mentionOpen]);
      useEffect(() => {
        mentionActiveIdxRef.current = mentionActiveIdx;
      }, [mentionActiveIdx]);
      // Keep the arrow-key-highlighted row visible — mouse hover already
      // scrolls the row into view naturally, but ArrowUp/ArrowDown only move
      // mentionActiveIdx without touching scrollTop, so the highlighted row
      // could sit outside the dropdown's scrollable viewport otherwise.
      useEffect(() => {
        if (!mentionOpen) return;
        mentionItemElsRef.current[mentionActiveIdx]?.scrollIntoView({
          block: "nearest",
        });
      }, [mentionActiveIdx, mentionOpen]);

      const mentionFiltered = useMemo(() => {
        const q = mentionQuery.toLowerCase();
        const list = q
          ? lawyers.filter((l) => l.lawyerName.toLowerCase().includes(q))
          : lawyers;
        return list.slice(0, 8);
      }, [lawyers, mentionQuery]);
      const mentionFilteredRef = useRef(mentionFiltered);
      useEffect(() => {
        mentionFilteredRef.current = mentionFiltered;
      }, [mentionFiltered]);

      const closeMentionDropdown = () => {
        setMentionOpen(false);
        setMentionQuery("");
        mentionMatchRef.current = null;
      };

      // Capture-phase "paste" listener on the outer wrapper (an ancestor of
      // Quill's own contenteditable root) — fires during the DOM capturing
      // phase, which runs before Quill's own paste handler (attached
      // directly to its root element, invoked in the at-target phase).
      // Marking pasteInProgressRef here, before Quill has processed
      // anything, guarantees the flag is already true once Quill eventually
      // gets around to applying the paste. It is deliberately NOT reset by
      // a short timer here (see pasteInProgressRef's declaration comment) —
      // only consumed by the text-change handler below, plus a generous
      // fallback timer in case that never fires.
      useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        const handlePasteCapture = () => {
          pasteInProgressRef.current = true;
          if (pasteFallbackResetTimerRef.current) {
            clearTimeout(pasteFallbackResetTimerRef.current);
          }
          pasteFallbackResetTimerRef.current = setTimeout(() => {
            pasteInProgressRef.current = false;
            pasteFallbackResetTimerRef.current = null;
          }, 500);
        };
        wrapper.addEventListener("paste", handlePasteCapture, true);
        return () => {
          wrapper.removeEventListener("paste", handlePasteCapture, true);
          if (pasteFallbackResetTimerRef.current) {
            clearTimeout(pasteFallbackResetTimerRef.current);
          }
        };
      }, []);

      // Load Quill via ctx.requireAsync then init
      useEffect(() => {
        let destroyed = false;
        const cleanupFns = [];
        loadQuillAsync()
          .then((Quill) => {
            if (destroyed || !containerRef.current) return;
            if (quillRef.current) {
              setReady(true);
              return;
            } // already mounted

            const q = new Quill(containerRef.current, {
              theme: "snow",
              placeholder: placeholder || "Write a comment... (@ to mention someone)",
              modules: {
                toolbar: {
                  container: [
                    [{ size: QUILL_FONT_SIZES }],
                    ["bold", "italic", "underline", "strike"],
                    [{ align: [] }],
                    [{ indent: "-1" }, { indent: "+1" }],
                    ["blockquote", "code-block"],
                    [{ list: "ordered" }, { list: "bullet" }],
                    ["link", "upload"],
                    ["clean"],
                  ],
                  handlers: {
                    upload: function () {
                      if (onUploadClickRef.current) onUploadClickRef.current();
                    },
                    size: function (value) {
                      const range = this.quill.getSelection(true);
                      if (!range) return;
                      this.quill.focus();
                      if (range.length === 0) {
                        this.quill.format("size", value || false, "user");
                        return;
                      }
                      this.quill.formatText(
                        range.index,
                        range.length,
                        "size",
                        value || false,
                        "user",
                      );
                      this.quill.setSelection(range.index, range.length, "silent");
                    },
                  },
                },
              },
            });

            // Inject custom SVG icon for upload button
            const uploadBtn =
              containerRef.current.parentElement.querySelector(".ql-upload");
            if (uploadBtn) {
              uploadBtn.innerHTML =
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>';
              uploadBtn.title = "Attach document";
            }

            // Add Tooltips to Quill toolbar buttons
            const tooltipMap = {
              ".ql-bold": "Bold (Ctrl+B)",
              ".ql-italic": "Italic (Ctrl+I)",
              ".ql-underline": "Underline (Ctrl+U)",
              ".ql-strike": "Strikethrough",
              '.ql-indent[value="-1"]': "Decrease indent",
              '.ql-indent[value="+1"]': "Increase indent",
              ".ql-blockquote": "Blockquote",
              ".ql-code-block": "Code block",
              '.ql-list[value="ordered"]': "Numbered list",
              '.ql-list[value="bullet"]': "Bullet list",
              ".ql-link": "Insert link",
              ".ql-clean": "Clear formatting",
            };
            Object.entries(tooltipMap).forEach(([selector, title]) => {
              const el = containerRef.current.parentElement.querySelector(selector);
              if (el) el.setAttribute("title", title);
            });
            const headerPicker = containerRef.current.parentElement.querySelector(
              ".ql-size .ql-picker-label",
            );
            if (headerPicker) headerPicker.setAttribute("title", "Font size");
            const alignPicker = containerRef.current.parentElement.querySelector(
              ".ql-align .ql-picker-label",
            );
            if (alignPicker) alignPicker.setAttribute("title", "Alignment");

            // Sync initial value
            if (value) {
              q.clipboard.dangerouslyPasteHTML(value);
              q.setSelection(q.getLength(), 0);
            }

            const selectMentionLawyer = (lawyer) => {
              const match = mentionMatchRef.current;
              if (!match) return;
              q.deleteText(match.start, match.length, "user");
              q.insertEmbed(
                match.start,
                "mention",
                { id: lawyer.id, name: lawyer.lawyerName },
                "user",
              );
              q.insertText(match.start + 1, " ", "user");
              q.setSelection(match.start + 2, 0, "user");

              seenMentionIdsRef.current.add(String(lawyer.id));
              const current = assignedIdsRef.current || [];
              if (!current.includes(lawyer.id) && onAssignMultipleRef.current) {
                onAssignMultipleRef.current([...current, lawyer.id]);
              }
              closeMentionDropdown();
            };
            selectMentionLawyerRef.current = selectMentionLawyer;

            q.on("text-change", (delta) => {
              const editorEl =
                containerRef.current &&
                containerRef.current.querySelector(".ql-editor");
              if (!editorEl) return;
              const html = editorEl.innerHTML;
              const empty = html === "<p><br></p>" || html === "";
              onChangeRef.current(empty ? "" : html);

              // Mark any mention chip currently in the html as "seen", then
              // drop assignedIds that were seen before but no longer appear
              // (i.e. the user deleted that chip) — ids that never had a
              // chip in this editor (old-style assignees on an edited
              // comment) are left untouched.
              (lawyersRef.current || []).forEach((l) => {
                if (html.includes(`data-id="${l.id}"`)) {
                  seenMentionIdsRef.current.add(String(l.id));
                }
              });
              const currentAssignedIds = assignedIdsRef.current || [];
              if (onAssignMultipleRef.current && currentAssignedIds.length > 0) {
                const keep = currentAssignedIds.filter(
                  (id) =>
                    !seenMentionIdsRef.current.has(String(id)) ||
                    html.includes(`data-id="${id}"`),
                );
                if (keep.length !== currentAssignedIds.length) {
                  onAssignMultipleRef.current(keep);
                }
              }

              // "@" trigger detection — skipped for pasted (or otherwise
              // bulk-inserted, e.g. cloned) text. Quill still reports paste
              // as text-change source "user", same as normal typing, so it
              // can't be filtered out via the source argument. Two checks,
              // combined: pasteInProgressRef (consumed here, see its
              // declaration comment for why it can't be reset by a fixed
              // timer) catches the actual paste; the per-event "insert
              // longer than 1 character" check is a fallback for any other
              // bulk-insert path (e.g. programmatic). Without this, pasting
              // text that happens to contain "@" anywhere (an email
              // address, a Twitter handle, quoted text with an @mention
              // already in it) gets misread as the user typing a mention
              // trigger.
              const wasPasting = pasteInProgressRef.current;
              if (wasPasting) {
                pasteInProgressRef.current = false;
                if (pasteFallbackResetTimerRef.current) {
                  clearTimeout(pasteFallbackResetTimerRef.current);
                  pasteFallbackResetTimerRef.current = null;
                }
              }
              const insertOps = (delta?.ops || []).filter(
                (op) => typeof op.insert === "string",
              );
              const isBulkInsert =
                wasPasting || insertOps.some((op) => op.insert.length > 1);
              if (isBulkInsert) {
                closeMentionDropdown();
                return;
              }
              // No insert at all in this delta (pure retain/delete, e.g. a
              // formatting toggle or a mention-chip removal elsewhere) means
              // nothing was actually typed just now — evaluating the regex
              // below would only be replaying whatever text already happens
              // to sit before the caret (which can be a leftover "@word"
              // from an earlier paste), reopening the dropdown for no new
              // keystroke. Still allow delete-only deltas that DO originate
              // from backspacing inside an active query (mentionOpenRef is
              // true) so narrowing an in-progress "@name" by backspacing
              // keeps working.
              const hasNewInsert = insertOps.length > 0;
              if (!hasNewInsert && !mentionOpenRef.current) {
                closeMentionDropdown();
                return;
              }
              const sel = q.getSelection();
              if (!sel) {
                closeMentionDropdown();
                return;
              }
              const textBeforeCaret = q.getText(0, sel.index);
              const match = textBeforeCaret.match(/@([^\s@]{0,30})$/);
              if (!match) {
                closeMentionDropdown();
                return;
              }
              mentionMatchRef.current = {
                start: sel.index - match[0].length,
                length: match[0].length,
              };
              setMentionQuery(match[1]);
              setMentionActiveIdx(0);
              setMentionOpen(true);

              const bounds = q.getBounds(sel.index);
              // q.getBounds() returns coordinates relative to q.root (the
              // actual .ql-editor contenteditable node — Quill's Selection
              // computes bounds against its own scroll root, NOT the outer
              // .ql-container that containerRef points to). Mixing that
              // with containerRef.current's own offset was the bug behind
              // the dropdown rendering far from the caret (the two don't
              // share a coordinate space).
              //
              // Fix: read both rects via getBoundingClientRect() and take
              // the delta against wrapperRef (the position:relative
              // containing block the dropdown is positioned within). A
              // rect delta between two elements stays correct regardless of
              // any transform/scroll/zoom on shared ancestors — both rects
              // shift together — unlike relying on an offsetParent chain.
              const editorRect = q.root.getBoundingClientRect();
              const wrapperRect = wrapperRef.current.getBoundingClientRect();
              const editorOffsetTop = editorRect.top - wrapperRect.top;
              const editorOffsetLeft = editorRect.left - wrapperRect.left;
              const viewportCaretTop = editorRect.top + bounds.top;
              const viewportCaretBottom = editorRect.top + bounds.bottom;
              // A little breathing room below the "@" text so the dropdown
              // doesn't sit flush against the caret line.
              const GAP = 10;
              const MARGIN = 12;
              const MIN_HEIGHT = 120;
              const MAX_HEIGHT = 360;
              const spaceBelow = window.innerHeight - viewportCaretBottom - GAP - MARGIN;
              const spaceAbove = viewportCaretTop - GAP - MARGIN;
              // Prefer opening below (matches where the user is typing); only
              // flip upward when below doesn't even fit the minimum useful
              // height AND above actually has more room — otherwise, sizing
              // the panel to the side with more room (instead of always
              // reserving a fixed 246px) keeps it from overshooting past the
              // caret and unnecessarily covering comments above the composer.
              const openUp = spaceBelow < MIN_HEIGHT && spaceAbove > spaceBelow;
              const available = openUp ? spaceAbove : spaceBelow;
              const dropdownHeight = Math.max(
                MIN_HEIGHT,
                Math.min(MAX_HEIGHT, available),
              );
              setMentionPos({
                top: openUp
                  ? editorOffsetTop + bounds.top - dropdownHeight - GAP
                  : editorOffsetTop + bounds.bottom + GAP,
                left: editorOffsetLeft + bounds.left,
                maxHeight: dropdownHeight,
              });
            });

            const handleMentionKeydown = (e) => {
              if (!mentionOpenRef.current) return;
              const list = mentionFilteredRef.current;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setMentionActiveIdx((i) =>
                  Math.min(i + 1, Math.max(list.length - 1, 0)),
                );
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setMentionActiveIdx((i) => Math.max(i - 1, 0));
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                if (list[mentionActiveIdxRef.current]) {
                  e.preventDefault();
                  selectMentionLawyer(list[mentionActiveIdxRef.current]);
                }
                return;
              }
              if (e.key === "Escape") {
                closeMentionDropdown();
              }
            };
            // Capture-phase, registered before the Ctrl+Enter submit shortcut
            // so arrow/Enter/Escape are consumed by the mention dropdown
            // first when it's open.
            q.root.addEventListener("keydown", handleMentionKeydown, true);
            cleanupFns.push(() =>
              q.root.removeEventListener("keydown", handleMentionKeydown, true),
            );

            const handleSubmitShortcut = (e) => {
              if (!((e.ctrlKey || e.metaKey) && e.key === "Enter")) return;
              if (e.isComposing) return;
              if (!onSubmitRef.current) return;
              e.preventDefault();
              onSubmitRef.current();
            };
            q.root.addEventListener("keydown", handleSubmitShortcut, true);
            cleanupFns.push(() =>
              q.root.removeEventListener("keydown", handleSubmitShortcut, true),
            );

            quillRef.current = q;
            setReady(true);
          })
          .catch((e) => {
            console.error("Quill load error:", e);
            setError("Could not load editor. Please check your network connection.");
          });

        return () => {
          destroyed = true;
          cleanupFns.forEach((fn) => fn());
        };
      }, []); // intentional — only init once

      // Sync external clear (value reset to "")
      useEffect(() => {
        if (!quillRef.current || !containerRef.current) return;
        const editorEl = containerRef.current.querySelector(".ql-editor");
        if (!editorEl) return;
        if (!value && editorEl.innerHTML && editorEl.innerHTML !== "<p><br></p>") {
          quillRef.current.setText("");
        }
      }, [value]);

      return React.createElement(
        "div",
        {
          ref: wrapperRef,
          style: {
            border: "1px solid #d9d9d9",
            borderRadius: 8,
            background: "#fff",
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            // Anchor for the mention dropdown below — its position:absolute
            // top/left are computed via a getBoundingClientRect() delta
            // against this wrapper (see the mention position effect),
            // relying on this being the dropdown's containing block.
            position: "relative",
          },
        },
        // Inject Quill custom CSS via React style element (sandbox-safe)
        React.createElement("style", null, QUILL_CUSTOM_CSS),
        error
          ? React.createElement(
              "div",
              {
                style: {
                  padding: "12px 16px",
                  color: "#ff4d4f",
                  fontSize: 13,
                  fontFamily: FONT,
                },
              },
              error,
            )
          : !ready
            ? React.createElement(
                "div",
                {
                  style: {
                    padding: "12px 16px",
                    color: "#bfbfbf",
                    fontSize: 13,
                    fontFamily: FONT,
                  },
                },
                "Loading editor...",
              )
            : null,
        React.createElement("div", { ref: containerRef }),
        // "@" mention suggestion dropdown — position:absolute against the
        // outer wrapper (position:relative), computed from the editor's own
        // offsetTop/offsetLeft + Quill's caret bounds, so it tracks the "@"
        // text position regardless of ancestor CSS. Backdrop stays
        // position:fixed/inset:0 for full-viewport outside-click coverage.
        mentionOpen &&
          mentionFiltered.length > 0 &&
          React.createElement(
            React.Fragment,
            null,
            React.createElement("div", {
              style: { position: "fixed", inset: 0, zIndex: 99998 },
              onClick: closeMentionDropdown,
            }),
            React.createElement(
              "div",
              {
                style: {
                  position: "absolute",
                  top: mentionPos.top,
                  left: mentionPos.left,
                  zIndex: 99999,
                  background: "#fff",
                  border: "1px solid #e0e0e0",
                  borderRadius: 10,
                  boxShadow: "0 8px 28px rgba(0,0,0,0.14)",
                  minWidth: 230,
                  maxHeight: mentionPos.maxHeight || 360,
                  overflowY: "auto",
                  padding: "4px 0",
                },
                onClick: (e) => e.stopPropagation(),
              },
              ...mentionFiltered.map((l, idx) =>
                React.createElement(
                  "div",
                  {
                    key: l.id,
                    ref: (el) => {
                      mentionItemElsRef.current[idx] = el;
                    },
                    onMouseDown: (e) => {
                      e.preventDefault();
                      selectMentionLawyerRef.current?.(l);
                    },
                    onMouseEnter: () => setMentionActiveIdx(idx),
                    style: {
                      padding: "8px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: idx === mentionActiveIdx ? "#e6f4ff" : "transparent",
                      borderLeft:
                        idx === mentionActiveIdx
                          ? "3px solid #1890ff"
                          : "3px solid transparent",
                    },
                  },
                  React.createElement(Av, { name: l.lawyerName, size: 26 }),
                  React.createElement(
                    "div",
                    null,
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 13,
                          fontWeight: idx === mentionActiveIdx ? 700 : 500,
                          color: idx === mentionActiveIdx ? "#096dd9" : "#262626",
                          fontFamily: FONT,
                        },
                      },
                      l.lawyerName,
                    ),
                  ),
                ),
              ),
            ),
          ),
      );
    };

    // ── CommentComposer — wraps QuillEditor (which now owns the "@" mention
    // dropdown directly, typed inline instead of via a separate button) ────
    const CommentComposer = ({
      value,
      onChange,
      onAssignMultiple,
      assignedIds,
      lawyers,
      placeholder,
      onSubmit,
      onUploadClick,
      // Send button used to live inside the composer as a bottom-right
      // overlay (position:absolute over the Quill editor). That covered
      // whatever text happened to be scrolled into its corner — fine only
      // when scrolled to the very end, but it also hid content whenever the
      // user scrolled back up mid-editor to re-read what they'd typed. It
      // now renders as a static footer row BELOW the editor (normal
      // document flow, not overlaid), so it never sits on top of the
      // scrollable text at any scroll position — showSubmitButton is the
      // caller's canSend (true only once text/mentions/attachments make the
      // comment sendable), sending disables it mid-request.
      showSubmitButton = false,
      sending = false,
    }) => {
      return React.createElement(
        "div",
        {
          // borderRadius+overflow:hidden here (not on .ql-container itself)
          // so the composer's rounded bottom corners land on whichever
          // element is visually last — the editor when the footer is
          // hidden, or the footer's send-button row when it's shown.
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 0,
            borderRadius: 8,
            overflow: "hidden",
          },
        },
        React.createElement(QuillEditor, {
          value,
          onChange,
          placeholder,
          onSubmit,
          onUploadClick,
          lawyers,
          assignedIds,
          onAssignMultiple,
        }),
        showSubmitButton &&
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 6,
                padding: "6px 10px",
                borderTop: "1px solid #f0f0f0",
                background: "#fff",
                borderRadius: "0 0 8px 8px",
              },
            },
            React.createElement(
              "span",
              {
                style: {
                  fontSize: 11,
                  color: "#bbb",
                  fontFamily: FONT,
                  whiteSpace: "nowrap",
                },
              },
              "Ctrl+Enter to send",
            ),
            React.createElement(
              "div",
              {
                onClick: onSubmit,
                style: {
                  padding: "6px 18px",
                  borderRadius: 6,
                  fontSize: 13,
                  fontFamily: FONT,
                  fontWeight: 700,
                  background: sending ? "#f0f0f0" : "#1890ff",
                  color: sending ? "#bfbfbf" : "#fff",
                  cursor: sending ? "not-allowed" : "pointer",
                  border: "none",
                },
              },
              sending ? "Sending..." : "Comment",
            ),
          ),
      );
    };

    // 🌟 HÀM RENDER VĂN BẢN (HỖ TRỢ MENTION VÀ ĐỊNH DẠNG B/I/U)
    const renderRichText = (text, lawyers) => {
      if (!text) return null;

      // Kiểm tra xem text có phải HTML (WYSIWYG) hay không. Quill luôn bọc nội dung bằng thẻ block (vd <p>, <ol>).
      const isHtml = /<[a-z][\s\S]*>/i.test(text);

      if (isHtml) {
        return React.createElement("div", {
          dangerouslySetInnerHTML: { __html: text },
          className: "wysiwyg-content ql-editor",
          style: { whiteSpace: "pre-wrap", wordBreak: "break-word" },
        });
      }

      // --- Hỗ trợ tương thích ngược cho text Markdown cũ ---
      const escapedNames = lawyers
        .map((l) => l.lawyerName)
        .sort((a, b) => b.length - a.length)
        .map((n) => n.replace(/[.*+?^${()|[\]\\]/g, "\\$&"));
      const mentionPattern = new RegExp(`(@(?:${escapedNames.join("|")}))`, "g");

      return text.split("\n").map((line, lineIdx) => {
        const parts = line.split(mentionPattern);
        const renderedLine = parts.map((part, i) => {
          if (
            part.startsWith("@") &&
            lawyers.some((l) => part === `@${l.lawyerName}`)
          ) {
            return React.createElement(
              "span",
              {
                key: `m-${i}`,
                style: {
                  color: "#096dd9",
                  background: "#e6f4ff",
                  borderRadius: 4,
                  padding: "0 4px",
                  fontWeight: 600,
                  fontSize: 13,
                  border: "1px solid #91caff",
                  margin: "0 2px",
                  display: "inline-block",
                },
              },
              part,
            );
          }
          let subParts = [part];
          const boldRegex = /(\*\*(.*?)\*\*)/g;
          let newSubParts = [];
          subParts.forEach((p) => {
            if (typeof p !== "string") {
              newSubParts.push(p);
              return;
            }
            const segments = p.split(boldRegex);
            for (let j = 0; j < segments.length; j++) {
              if (j % 3 === 2) {
                newSubParts.push(
                  React.createElement("b", { key: `b-${i}-${j}` }, segments[j]),
                );
                j++;
              } else if (j % 3 === 0) {
                if (segments[j]) newSubParts.push(segments[j]);
              }
            }
          });
          subParts = newSubParts;
          const italicRegex = /(\*(.*?)\*)/g;
          newSubParts = [];
          subParts.forEach((p, idx) => {
            if (typeof p !== "string") {
              newSubParts.push(p);
              return;
            }
            const segments = p.split(italicRegex);
            for (let j = 0; j < segments.length; j++) {
              if (j % 3 === 2) {
                newSubParts.push(
                  React.createElement(
                    "i",
                    { key: `i-${i}-${idx}-${j}` },
                    segments[j],
                  ),
                );
                j++;
              } else if (j % 3 === 0) {
                if (segments[j]) newSubParts.push(segments[j]);
              }
            }
          });
          subParts = newSubParts;
          return React.createElement(
            React.Fragment,
            { key: `t-${i}` },
            ...subParts,
          );
        });
        return React.createElement(
          "div",
          { key: `l-${lineIdx}`, style: { minHeight: "1.2em", marginBottom: 2 } },
          renderedLine,
        );
      });
    };
    // ============================================================
    // UnifiedNoteThread
    // ============================================================
    const UnifiedNoteThread = ({
      collectionName,
      recordId,
      currentUser,
      lawyers,
      canEdit = true,
      projectFolderId,
      onFilesUpdate,
      refreshTrigger,
      taskContext = {},
      caseId = null, // 🌟 Bổ sung caseId để tạo deep-link
      sortOrder = "newest", // "oldest" | "newest" — hiển thị thứ tự bình luận, áp dụng cho cả list & tree
      viewMode = "list", // "list" (Zalo-style flat timeline) | "tree" (nested replies)
      searchText = "", // lọc theo nội dung note.body (đã strip HTML), không phân biệt hoa/thường
      onCountChange, // reports feed.length up so the "Comments & Reports" header can show a count
    }) => {
      // ProjectInternal (Internal Work) tasks have no Case/Reference to move
      // documents into — the file-level move actions swap to a single
      // "Move to Library" action targeting the company-level Knowledge space
      // instead (see LIBRARY_DESTINATION.KNOWLEDGE).
      const isProjectInternalContext = !!taskContext?.projectInternalId;
      const currentLawyerId = useMemo(() => {
        const currentUserId = extractId(currentUser?.id);
        const found = lawyers?.find((l) => {
          const lawyerUserId = extractId(l.userId) || extractId(l.user);
          return currentUserId && lawyerUserId === currentUserId;
        });
        return found?.id || null;
      }, [currentUser, lawyers]);
      const [feed, setFeed] = useState([]);
      const [loading, setLoading] = useState(true);
      const [body, setBody] = useState("");
      const [assignedIds, setAssignedIds] = useState([]);
      const [sending, setSending] = useState(false);
      const [previewDoc, setPreviewDoc] = useState(null);
      const [showUploadModal, setShowUploadModal] = useState(false);
      const [pendingDocs, setPendingDocs] = useState([]);
      const pendingReplaceInputRef = useRef(null);
      const pendingReplaceTargetRef = useRef(null);
      // Chặn gửi trùng: canSend/sending (state) cập nhật không đồng bộ với
      // ref onSubmitRef (Ctrl+Enter trong Quill) hoặc onClick nút Comment,
      // nên dựa riêng state không đủ an toàn — cần 1 ref check ngay đầu
      // handleSend, đồng bộ tuyệt đối, không phụ thuộc chu kỳ render.
      const sendingRef = useRef(false);
      const [replacingPendingIndex, setReplacingPendingIndex] = useState(null);
      const [pendingBatchId, setPendingBatchId] = useState(
        () => `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      );
      const [editingNoteId, setEditingNoteId] = useState(null);
      const [editBody, setEditBody] = useState("");
      const [editAssignedIds, setEditAssignedIds] = useState([]);
      const [replyingTo, setReplyingTo] = useState(null);
      const [expandedThreads, setExpandedThreads] = useState({});
      const [folderLookup, setFolderLookup] = useState({});
      // List mode's "uploaded as a folder" grouping (2026-09-05) — keyed
      // by `${itemKey}-${folderId}` so expand state never collides between
      // two different comments that happen to share a folderId.
      const [expandedFileFolders, setExpandedFileFolders] = useState({});
      const reload = useCallback(() => {
        setLoading(true);
        Promise.all([
          fetchNotes(collectionName, recordId),
          fetchFiles(collectionName, recordId),
        ]).then(async ([notes, files]) => {
          const WINDOW_MS = 5000;
          const usedFileIds = new Set();
          const noteItems = notes.map((n) => {
            const noteTime = new Date(n.createdAt).getTime();
            const attachedFiles = files.filter((f) => {
              if (usedFileIds.has(f.id)) return false;
              if (n.batchId && f.batchId && n.batchId === f.batchId) return true;
              return (
                Math.abs(new Date(f.createdAt).getTime() - noteTime) <= WINDOW_MS
              );
            });
            attachedFiles.forEach((f) => usedFileIds.add(f.id));
            return {
              _kind: "item",
              _time: new Date(n.createdAt),
              note: n,
              files: attachedFiles,
            };
          });
          const remainingFiles = files.filter((f) => !usedFileIds.has(f.id));
          const fileOnlyItems = [];
          const processedIds = new Set();
          remainingFiles.forEach((f) => {
            if (processedIds.has(f.id)) return;
            const fTime = new Date(f.createdAt).getTime();
            const batch = remainingFiles.filter((f2) => {
              if (processedIds.has(f2.id) && f2.id !== f.id) return false;
              if (f.batchId && f2.batchId && f.batchId === f2.batchId) return true;
              return (
                Math.abs(new Date(f2.createdAt).getTime() - fTime) <= WINDOW_MS
              );
            });
            batch.forEach((f2) => processedIds.add(f2.id));
            fileOnlyItems.push({
              _kind: "item",
              _time: new Date(f.createdAt),
              note: null,
              files: batch,
            });
          });
          // Earliest -> latest, matching a normal chat thread's reading
          // order (composer sits fixed at the bottom, right after the
          // newest message).
          const allItems = [...noteItems, ...fileOnlyItems].sort(
            (a, b) => a._time - b._time,
          );
          setFeed(allItems);
          if (onFilesUpdate) onFilesUpdate(files);
          setFolderLookup(await fetchFolderLookupForFiles(files));
          setLoading(false);
        });
      }, [collectionName, recordId, onFilesUpdate]);
      useEffect(() => {
        reload();
      }, [reload, refreshTrigger]);
      useEffect(() => {
        if (onCountChange) onCountChange(feed.length);
      }, [feed, onCountChange]);
      const authorName = (n) =>
        n.createdBy?.nickname ||
        n.createdBy?.username ||
        n.createdBy?.email ||
        (n.createdById ? `User #${n.createdById}` : "Anonymous");
      const warnMentionOnly = () => {
        message.warning("Please enter a comment before mentioning someone.");
      };
      const handleSend = async () => {
        if (sendingRef.current) return;
        const hasText = getCommentText(body, true).length > 0;
        const hasFiles = pendingDocs.length > 0;
        if (assignedIds.length > 0 && !hasText) {
          warnMentionOnly();
          return;
        }
        if (!hasText && !hasFiles) return;
        sendingRef.current = true;
        setSending(true);
        const batchId = pendingBatchId;
        try {
          // ── BƯỚC 1: Tạo Note với batchId ─────────────────────────
          const currentPath = window.location.origin + window.location.pathname;
          const actualCaseId =
            extractId(caseId) ||
            extractId(taskContext.caseId) ||
            extractId(ctx.record?.id) ||
            getPathSegmentId(DEEP_LINK_CONFIG.KW_SOURCE) ||
            getPathSegmentId(DEEP_LINK_CONFIG.KW_FILTER);
          let linkedUrl = `${currentPath}`;

          // 🌟 TỰ ĐỘNG TẠO DEEP-LINK NẾU LÀ TASK (Hardcore Join)
          if (collectionName === "Task") {
            const { buildUrl } = DEEP_LINK_CONFIG;

            // Lấy caseId từ props hoặc trích xuất từ URL hiện tại
            if (actualCaseId) {
              linkedUrl = buildUrl(recordId, actualCaseId);
            }
          }
          const currentTime = new Date().toISOString(); // 🌟 Thời gian đồng bộ
          const noteRes = await apiReq("notes:create", "POST", {
            collectionName,
            recordId,
            title: "Comment",
            body: hasText ? body.trim() : null,
            linkedUrl,
            assignees: assignedIds,
            assignedLawyerId: assignedIds[0] || null, // 🌟 Thêm field đơn để trigger DB
            parentId: replyingTo
              ? replyingTo.note?.id || replyingTo.files?.[0]?.id
              : null,
            replyText: replyingTo?.note?.body
              ? replyingTo.note.body
                  .replace(/<[^>]*>?/gm, "")
                  .trim()
                  .substring(0, 150) +
                (replyingTo.note.body.length > 150 ? "..." : "")
              : replyingTo
                ? "Attached document"
                : null,
            batchId,
            createdAt: currentTime, // 🌟 Đồng bộ thời gian tạo note
          });

          const noteId = noteRes?.data?.data?.id;
          if (noteId && assignedIds.length > 0) {
            // 🌟 Log thủ công cho M2M assignees (vì trigger không bắt được)
            const names = assignedIds
              .map((id) => {
                const l = lawyers?.find(
                  (law) => extractId(law.id) === extractId(id),
                );
                return l?.lawyerName || l?.nickname || `#${id}`;
              })
              .join(", ");

            await logActivity(
              "Note",
              noteId,
              "created",
              "assignees",
              null,
              names,
              currentUser?.nickname || currentUser?.username || "System",
              batchId,
              null,
              currentTime,
            );
            // Mirror cho parent
            await logActivity(
              initcap(collectionName),
              recordId,
              "created",
              "assignees",
              null,
              names,
              currentUser?.nickname || currentUser?.username || "System",
              batchId,
              noteId,
              currentTime,
            );
          }

          // ── BƯỚC 2: Tạo Document records cùng batchId ────────────
          if (hasFiles) {
            const uploadProjectInternalId = taskContext.projectInternalId;
            const folderIdMap = await createTaskUploadFoldersFromEntries(
              pendingDocs,
              projectFolderId,
              {
                currentUser,
                caseId: actualCaseId,
                taskId: taskContext.taskId,
                subTaskId: taskContext.subTaskId,
                projectInternalId: uploadProjectInternalId,
              },
            );
            const toISO = (val) => {
              if (!val) return null;
              const d = new Date(val);
              return isNaN(d.getTime()) ? null : d.toISOString();
            };
            for (const pDoc of pendingDocs) {
              const relativeFolderPath = getRelativeFolderPath(pDoc.relativePath);
              const targetFolderId =
                folderIdMap[relativeFolderPath] || extractId(projectFolderId);
              const docTitle =
                pDoc.docTitle || pDoc.metadata.title?.trim() || pDoc.fileName;
              await apiReq("documents:create", "POST", {
                title: docTitle,
                documentType: pDoc.metadata.documentType?.trim() || "",
                documentCode: pDoc.metadata.documentCode?.trim() || "",
                openingDate: toISO(pDoc.metadata.openingDate),
                signedAt: toISO(pDoc.metadata.signedAt),
                effectiveAt: toISO(pDoc.metadata.effectiveAt),
                senderName: pDoc.metadata.senderName?.trim() || "",
                recipientName: pDoc.metadata.recipientName?.trim() || "",
                language: pDoc.metadata.language?.trim() || "",
                docFormat: pDoc.metadata.docFormat?.trim() || "",
                googleDriveUrl: pDoc.metadata.googleDriveUrl?.trim() || "",
                note: pDoc.metadata.note?.trim() || "",
                updatedById: currentUser?.id || null,
                updatedAt: new Date().toISOString(),
                uploadedById: currentUser?.id || null,
                ...buildTaskUploadDocumentLink(collectionName, recordId, {
                  folderId: targetFolderId,
                  projectInternalId: uploadProjectInternalId,
                }),
                // Internal Work uploads (uploadProjectInternalId set) get
                // stamped storageType: "project_internal" instead of
                // "cases" — buildTaskUploadDocumentLink above already
                // switches moduleScope the same way.
                storageType: uploadProjectInternalId
                  ? PROJECT_INTERNAL_MODULE_SCOPE
                  : "cases",
                createdById: currentUser?.id || null,
                createdAt: new Date().toISOString(),
                batchId,
                ...(pDoc.attIds && { fileAttachment: pDoc.attIds }),
              });
            }
          }

          setBody("");
          setAssignedIds([]);
          setReplyingTo(null);
          setPendingDocs([]);
          setPendingBatchId(
            `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          );
          // New attachments now also live in the Case/Internal Work document
          // space — mark cached picker data stale so the next "Choose from"
          // open refetches instead of serving a list without them.
          if (hasFiles) invalidateTaskLibraryData();
          reload();
          message.success("Comment posted");
        } catch (e) {
          message.error("Error: " + (e?.message || "Please try again"));
        }
        sendingRef.current = false;
        setSending(false);
      };

      const handleSaveEdit = async (noteId) => {
        const newBody = editBody.trim();
        if (!newBody) return;
        const currentNoteItem = feed.find(
          (item) => item.note && item.note.id === noteId,
        );
        const oldBody = currentNoteItem?.note?.body || "";
        const oldAssignees = (currentNoteItem?.note?.assignees || []).map((a) =>
          typeof a === "object" ? a.id : a,
        );
        const bodyChanged = oldBody !== newBody;
        const assigneesChanged =
          JSON.stringify([...oldAssignees].sort()) !==
          JSON.stringify([...editAssignedIds].sort());

        if (!bodyChanged && !assigneesChanged) {
          setEditingNoteId(null);
          setEditBody("");
          setEditAssignedIds([]);
          return;
        }
        try {
          const currentTime = new Date().toISOString();
          const actionBatchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; // 🌟 Tạo batchId duy nhất cho lần sửa này

          await apiReq(`notes:update?filterByTk=${noteId}`, "POST", {
            body: newBody,
            assignees: editAssignedIds,
            assignedLawyerId: editAssignedIds[0] || null,
            batchId: actionBatchId, // 🌟 Cập nhật batchId của record sang ID mới để trigger dùng
          });

          // 🌟 Log thủ công cho M2M assignees thay đổi (dùng actionBatchId mới)
          const oldNames = oldAssignees
            .map((id) => {
              const l = lawyers?.find((law) => extractId(law.id) === extractId(id));
              return l?.lawyerName || l?.nickname || `#${id}`;
            })
            .join(", ");
          const newNames = editAssignedIds
            .map((id) => {
              const l = lawyers?.find((law) => extractId(law.id) === extractId(id));
              return l?.lawyerName || l?.nickname || `#${id}`;
            })
            .join(", ");

          if (oldNames !== newNames) {
            const userName =
              currentUser?.nickname || currentUser?.username || "System";
            await logActivity(
              "Note",
              noteId,
              "updated",
              "assignees",
              oldNames || null,
              newNames || null,
              userName,
              actionBatchId, // 🌟 Dùng batchId mới
              null,
              currentTime,
            );
            await logActivity(
              initcap(collectionName),
              recordId,
              "updated",
              "assignees",
              oldNames || null,
              newNames || null,
              userName,
              actionBatchId, // 🌟 Dùng batchId mới
              noteId,
              currentTime,
            );
          }
          // 🌟 XÓA BỎ logActivity thủ công, để SQL Trigger tự làm việc cho đồng nhất
          setFeed((prev) =>
            prev.map((item) => {
              if (item.note && item.note.id === noteId)
                return {
                  ...item,
                  note: { ...item.note, body: newBody, assignees: editAssignedIds },
                };
              return item;
            }),
          );
          setEditingNoteId(null);
          setEditBody("");
          setEditAssignedIds([]);
          message.success("Comment updated");
        } catch (e) {
          message.error("Update failed");
        }
      };

      const handleDeleteNote = (item) => {
        const { note, files } = item;
        Modal.confirm({
          title: "Confirm deletion",
          content: note
            ? "Are you sure you want to delete this comment and its attached files?"
            : "Are you sure you want to delete these files?",
          okText: "Delete",
          cancelText: "Cancel",
          okType: "danger",
          onOk: async () => {
            try {
              const currentTime = new Date().toISOString();
              const actionBatchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; // 🌟 BatchId riêng cho việc xóa
              const userName =
                currentUser?.nickname || currentUser?.username || "System";

              if (note) {
                await apiReq(`notes:update?filterByTk=${note.id}`, "POST", {
                  isDeleted: true,
                  batchId: actionBatchId, // 🌟 Cập nhật batchId để trigger bắt đúng
                });

                // 🌟 Log xóa assignees (dùng actionBatchId mới)
                const currentAssignees = note.assignees || [];
                if (currentAssignees.length > 0) {
                  const names = currentAssignees
                    .map((a) => {
                      const id = typeof a === "object" ? a.id : a;
                      const l = lawyers?.find(
                        (law) => extractId(law.id) === extractId(id),
                      );
                      return l?.lawyerName || l?.nickname || `#${id}`;
                    })
                    .join(", ");

                  await logActivity(
                    "Note",
                    note.id,
                    "deleted",
                    "assignees",
                    names,
                    null,
                    userName,
                    actionBatchId,
                    null,
                    currentTime,
                  );
                  await logActivity(
                    initcap(collectionName),
                    recordId,
                    "deleted",
                    "assignees",
                    names,
                    null,
                    userName,
                    actionBatchId,
                    note.id,
                    currentTime,
                  );
                }
              }
              if (files && files.length > 0) {
                for (const f of files) {
                  await apiReq(`documents:update?filterByTk=${f.id}`, "POST", {
                    isDeleted: true,
                    // batchId: deleteBatchId, // ❌ Không thay đổi batchId
                  });
                }
              }
              setFeed((prev) => prev.filter((i) => i !== item));
              message.success("Deleted successfully");
            } catch (e) {
              message.error("Delete failed");
            }
          },
        });
      };

      const [editingFileId, setEditingFileId] = useState(null);
      const [editFileTitle, setEditFileTitle] = useState("");
      const [expandedPreviews, setExpandedPreviews] = useState({});
      const [replacingFileDoc, setReplacingFileDoc] = useState(null);
      const [libraryMoveTarget, setLibraryMoveTarget] = useState(null);
      // Bulk-select state, scoped per comment: { [itemKey]: { active, ids: Set<fileId> } }.
      const [bulkSelectState, setBulkSelectState] = useState({});
      const [bulkMoveTarget, setBulkMoveTarget] = useState(null);

      const toggleBulkSelectMode = (itemKey) => {
        setBulkSelectState((prev) => {
          if (prev[itemKey]?.active) {
            const next = { ...prev };
            delete next[itemKey];
            return next;
          }
          return { ...prev, [itemKey]: { active: true, ids: new Set() } };
        });
      };

      const toggleBulkFileSelected = (itemKey, fileId) => {
        setBulkSelectState((prev) => {
          const cur = prev[itemKey] || { active: true, ids: new Set() };
          const ids = new Set(cur.ids);
          if (ids.has(fileId)) ids.delete(fileId);
          else ids.add(fileId);
          return { ...prev, [itemKey]: { active: true, ids } };
        });
      };

      const handleSaveFileTitle = async (f) => {
        const newTitle = editFileTitle.trim();
        if (!newTitle) return;
        try {
          const actionBatchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const attachment = getPrimaryAttachment(f);
          const oldTitle =
            f.title || f.name || attachment?.title || attachment?.filename || "";

          await apiReq(`documents:update?filterByTk=${f.id}`, "POST", {
            title: newTitle,
            name: newTitle,
            batchId: actionBatchId,
          });
          if (attachment?.id) {
            await apiReq(`attachments:update?filterByTk=${attachment.id}`, "POST", {
              title: newTitle,
            }).catch(() => {});
          }

          // 🌟 Log thủ công vì SQL trigger chặn update title của documents
          const userName =
            currentUser?.nickname || currentUser?.username || "System";
          await logActivity(
            "Document",
            f.id,
            "updated",
            "title",
            oldTitle,
            newTitle,
            userName,
            actionBatchId,
            null,
            new Date().toISOString(),
          );
          // Mirror cho parent (Task)
          await logActivity(
            initcap(collectionName),
            recordId,
            "updated",
            "documents",
            oldTitle,
            newTitle,
            userName,
            actionBatchId,  
            f.id,
            new Date().toISOString(),
          );

          setFeed((prev) =>
            prev.map((item) => ({
              ...item,
              files: item.files.map((file) =>
                file.id === f.id ? withSyncedDocumentFileTitle(file, newTitle) : file,
              ),
            })),
          );
          message.success("Document name updated");
        } catch (e) {
          message.error("Failed to update name");
        }
        setEditingFileId(null);
        setEditFileTitle("");
      };

      const renderFileRow = (f, itemKey, options = {}) => {
        // compact/isLast are List mode's "grouped card" look (2026-09-05) —
        // one shared card per message instead of each file getting its own
        // bordered box. Tree mode and every other caller omit options, so
        // they keep the original per-file boxed look unchanged.
        const { compact = false, isLast = false } = options;
        const bulkState = bulkSelectState[itemKey];
        const bulkSelectActive = !!bulkState?.active;
        const bulkSelected = !!bulkState?.ids?.has(f.id);
        const att = Array.isArray(f.fileAttachment)
          ? f.fileAttachment[0]
          : f.fileAttachment;
        const ext = att?.extname
          ? att.extname.startsWith(".")
            ? att.extname.toLowerCase()
            : "." + att.extname.toLowerCase()
          : "";
        const rawFilename = att?.filename || "File";
        const displayTitle = f.title || f.name || att?.title || rawFilename;
        const fullUrl = getFullUrl(att?.url || att?.preview);
        const isPdf = ext === ".pdf";
        const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(
          ext,
        );
        const isOffice = [
          ".doc",
          ".docx",
          ".xls",
          ".xlsx",
          ".ppt",
          ".pptx",
          ".odt",
        ].includes(ext);
        const officeViewerUrl =
          isOffice && fullUrl
            ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`
            : null;
        const canIframe = isPdf || isImage || isOffice;
        const isExpanded = !!expandedPreviews[f.id];
        const isEditingThisFile = editingFileId === f.id;
        const isMine = currentUser && f.createdById === currentUser.id;
        const movedBadge = getMovedDestinationBadge(f, folderLookup);
        const fileActionItems = [
          {
            key: "preview",
            icon: TASK_FILE_ACTION_ICONS.preview,
            label: isExpanded ? "Hide preview" : "Preview",
            disabled: !fullUrl,
          },
          {
            key: "download",
            icon: TASK_FILE_ACTION_ICONS.download,
            label: "Download",
            disabled: !fullUrl,
          },
          // Replaces the old "Move to Legal Reference" action — moving into
          // the current case's own Document tree is what's actually used;
          // the org-wide Legal Reference library move stays available only
          // via the folder-level action, not per-file. Kept visible even
          // after a prior move so files can be re-moved to a different folder.
          canEdit && !isProjectInternalContext && {
            key: "move_to_document",
            icon: TASK_FILE_ACTION_ICONS.folder,
            label: "Move to Case's Document",
          },
          // Internal Work equivalent of "Move to Case's Document" above —
          // moves into the current Internal Work item's own Document tree.
          canEdit && isProjectInternalContext && {
            key: "move_to_project_internal_document",
            icon: TASK_FILE_ACTION_ICONS.folder,
            label: "Move to Internal Work's Document",
          },
          // Single umbrella entry for every destination that lives outside
          // the current workspace (Reference, and — for Internal Work tasks
          // only — Customer, Knowledge). LibraryMoveModal shows a category
          // switch when more than one applies (see getLibraryMoveCategories)
          // so the menu always stays this same 2-action shape regardless of
          // context.
          canEdit && {
            key: "move_to_library",
            icon: TASK_FILE_ACTION_ICONS.moveLegalReference,
            label: "Move to Library",
          },
          isMine && canEdit && {
            key: "edit",
            icon: TASK_FILE_ACTION_ICONS.edit,
            label: "Rename",
          },
          isMine && canEdit && {
            key: "replace_file",
            icon: TASK_FILE_ACTION_ICONS.replace,
            label: "Replace file",
          },
        ].filter(Boolean);
        const handleFileActionClick = ({ key, domEvent }) => {
          domEvent?.stopPropagation?.();
          if (key === "preview") {
            if (!fullUrl) return;
            if (canIframe) {
              setExpandedPreviews((prev) => ({ ...prev, [f.id]: !prev[f.id] }));
            } else {
              setPreviewDoc(f);
            }
            return;
          }
          if (key === "download") {
            if (fullUrl) window.open(fullUrl, "_blank");
            return;
          }
          if (key === "move_to_document") {
            setLibraryMoveTarget({
              record: f,
              destinationType: LIBRARY_DESTINATION.CASE_DOCUMENT,
            });
            return;
          }
          if (key === "move_to_project_internal_document") {
            setLibraryMoveTarget({
              record: f,
              destinationType: LIBRARY_DESTINATION.PROJECT_INTERNAL_DOCUMENT,
            });
            return;
          }
          if (key === "move_to_library") {
            const availableDestinationTypes = getLibraryMoveCategories(
              isProjectInternalContext,
            );
            setLibraryMoveTarget({
              record: f,
              destinationType: availableDestinationTypes[0],
              availableDestinationTypes,
            });
            return;
          }
          if (key === "edit") {
            setEditingFileId(f.id);
            setEditFileTitle(displayTitle);
            return;
          }
          if (key === "replace_file") {
            setReplacingFileDoc(f);
          }
        };

        return React.createElement(
          "div",
          {
            key: f.id,
            style: compact
              ? {
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  background: "transparent",
                  borderBottom: isLast ? "none" : "1px solid #f0f0f0",
                }
              : {
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  marginTop: 8,
                  background: "#fff",
                  borderRadius: 8,
                  border: "1px solid #e8e8e8",
                  overflow: "hidden",
                },
          },
          // ── Header row: title + actions ─────────────────────────
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
              },
            },
            // Bulk-select checkbox
            bulkSelectActive &&
              React.createElement("input", {
                type: "checkbox",
                checked: bulkSelected,
                onClick: (e) => e.stopPropagation(),
                onChange: () => toggleBulkFileSelected(itemKey, f.id),
                style: { flexShrink: 0, cursor: "pointer" },
              }),
            // File icon
            getFileIcon(ext),
            // Title or edit input
            isEditingThisFile
              ? React.createElement("input", {
                  autoFocus: true,
                  value: editFileTitle,
                  onChange: (e) => setEditFileTitle(e.target.value),
                  onKeyDown: (e) => {
                    if (e.key === "Enter") handleSaveFileTitle(f);
                    if (e.key === "Escape") setEditingFileId(null);
                  },
                  style: {
                    flex: 1,
                    fontSize: 13,
                    fontFamily: FONT,
                    border: "1px solid #1890ff",
                    borderRadius: 4,
                    padding: "3px 8px",
                    outline: "none",
                  },
                })
              : React.createElement(
                  "span",
                  {
                    onClick: bulkSelectActive
                      ? () => toggleBulkFileSelected(itemKey, f.id)
                      : fullUrl
                        ? () => setPreviewDoc(f)
                        : undefined,
                    title: `Original file: ${rawFilename}`,
                    style: {
                      fontSize: 13,
                      fontFamily: FONT,
                      fontWeight: 600,
                      color: "#096dd9",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      cursor: bulkSelectActive || fullUrl ? "pointer" : "default",
                      textDecoration: fullUrl ? "underline" : "none",
                      textUnderlineOffset: 3,
                    },
                  },
                  displayTitle,
                ),
            // Action buttons
            isEditingThisFile
              ? React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(
                    "span",
                    {
                      onClick: () => handleSaveFileTitle(f),
                      style: {
                        fontSize: 12,
                        padding: "2px 10px",
                        cursor: "pointer",
                        color: "#fff",
                        background: "#1890ff",
                        borderRadius: 4,
                        fontWeight: 600,
                        flexShrink: 0,
                      },
                    },
                    "Save",
                  ),
                  React.createElement(
                    "span",
                    {
                      onClick: () => setEditingFileId(null),
                      style: {
                        fontSize: 12,
                        padding: "2px 8px",
                        cursor: "pointer",
                        color: "#595959",
                        border: "1px solid #d9d9d9",
                        borderRadius: 4,
                        flexShrink: 0,
                      },
                    },
                    "Cancel",
                  ),
                )
              : bulkSelectActive
                ? null
                : React.createElement(
                  Dropdown,
                  {
                    trigger: ["click"],
                    placement: "bottomRight",
                    menu: {
                      items: fileActionItems,
                      onClick: handleFileActionClick,
                    },
                  },
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      title: "Actions",
                      onClick: (e) => e.stopPropagation(),
                      style: {
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: "1px solid #E5E7EB",
                        background: "#FFFFFF",
                        color: "#4B5563",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                        padding: 0,
                      },
                    },
                    TASK_FILE_ACTION_ICONS.more,
                  ),
                ),
          ),
          // ── Moved-destination badge ─────────────────────────────────
          movedBadge &&
            React.createElement(
              "div",
              { style: { padding: "0 12px 8px" } },
              renderMovedBadge(movedBadge),
            ),
          // ── Inline iframe preview ─────────────────────────────────
          isExpanded &&
            fullUrl &&
            renderTaskFilePreviewFrame({
              fullUrl,
              title: displayTitle,
              isPdf,
              isImage,
              isOffice,
              officeViewerUrl,
              height: isOffice ? 660 : isPdf ? 620 : 440,
            }),
        );
      };

      const renderBulkSelectBar = (itemKey, files) => {
        if (!canEdit || files.length === 0) return null;
        const state = bulkSelectState[itemKey];
        const active = !!state?.active;
        const selectedCount = state?.ids?.size || 0;
        if (!active) {
          return React.createElement(
            "span",
            {
              onClick: () => toggleBulkSelectMode(itemKey),
              style: {
                display: "inline-block",
                marginTop: 8,
                fontSize: 12,
                fontFamily: FONT,
                color: "#1890ff",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              },
            },
            "Select files",
          );
        }
        const selectedFiles = files.filter((f) => state.ids.has(f.id));
        return React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 8,
              padding: "6px 10px",
              background: "#f0f8ff",
              border: "1px dashed #91caff",
              borderRadius: 6,
            },
          },
          React.createElement(
            "span",
            { style: { fontSize: 12, fontFamily: FONT, color: "#262626", fontWeight: 600 } },
            `${selectedCount} selected`,
          ),
          React.createElement(
            Button,
            {
              key: "download-selected",
              size: "small",
              disabled: selectedCount === 0,
              onClick: () => {
                downloadFilesAsZip(
                  selectedFiles.map((f) => {
                    const att = Array.isArray(f.fileAttachment)
                      ? f.fileAttachment[0]
                      : f.fileAttachment;
                    return {
                      url: getFullUrl(att?.url || att?.preview),
                      rawUrl: att?.url || att?.preview,
                      filename:
                        // att?.filename first — it's the raw uploaded name
                        // and always has the real extension; a user-set
                        // title can be extension-less and would otherwise
                        // save without one.
                        att?.filename || f.title || f.name || att?.title,
                    };
                  }),
                  "attachments.zip",
                );
              },
            },
            "Download",
          ),
          ...(isProjectInternalContext
            ? [
                React.createElement(
                  Button,
                  {
                    key: "move-project-internal-document",
                    size: "small",
                    disabled: selectedCount === 0,
                    onClick: () =>
                      setBulkMoveTarget({
                        records: selectedFiles,
                        destinationType: LIBRARY_DESTINATION.PROJECT_INTERNAL_DOCUMENT,
                        itemKey,
                      }),
                  },
                  "Move to Internal Work's Document",
                ),
              ]
            : [
                React.createElement(
                  Button,
                  {
                    key: "move-document",
                    size: "small",
                    disabled: selectedCount === 0,
                    onClick: () =>
                      setBulkMoveTarget({
                        records: selectedFiles,
                        destinationType: LIBRARY_DESTINATION.CASE_DOCUMENT,
                        itemKey,
                      }),
                  },
                  "Move to Document",
                ),
              ]),
          React.createElement(
            Button,
            {
              key: "move-library",
              size: "small",
              disabled: selectedCount === 0,
              onClick: () => {
                const availableDestinationTypes = getLibraryMoveCategories(
                  isProjectInternalContext,
                );
                setBulkMoveTarget({
                  records: selectedFiles,
                  destinationType: availableDestinationTypes[0],
                  availableDestinationTypes,
                  itemKey,
                });
              },
            },
            "Move to Library",
          ),
          React.createElement(
            "span",
            {
              onClick: () => toggleBulkSelectMode(itemKey),
              style: {
                fontSize: 12,
                fontFamily: FONT,
                color: "#8c8c8c",
                cursor: "pointer",
              },
            },
            "Cancel",
          ),
        );
      };

      const renderItem = (item, key, isChild = false) => {
        const { note, files } = item;
        const firstFile = files[0];
        const creatorName = note
          ? authorName(note)
          : firstFile?.createdBy
            ? userName(firstFile.createdBy) || firstFile.createdBy?.email
            : "System";
        const time = note?.createdAt || firstFile?.createdAt;
        const hasBody = !!note?.body;
        const hasFiles = files.length > 0;
        const isMyItem =
          (note && currentUser && note.createdById === currentUser.id) ||
          (!note &&
            firstFile &&
            currentUser &&
            firstFile.createdById === currentUser.id);
        const isEditing = note && editingNoteId === note.id;

        const replies = note && replyMap[note.id] ? replyMap[note.id] : [];
        const hasReplies = replies.length > 0;
        // Reply threads auto-expand by default — only collapsed once the user
        // explicitly toggles them closed (tracked as `false` in state).
        const isExpanded = expandedThreads[note?.id] !== false;

        const itemTargetId = note?.id || files[0]?.id;
        const replyingTargetId = replyingTo?.note?.id || replyingTo?.files?.[0]?.id;
        const isReplyingToThis = !!(
          replyingTo &&
          replyingTargetId &&
          itemTargetId === replyingTargetId
        );

        return React.createElement(
          "div",
          { key },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                gap: 10,
                padding: "14px 16px",
                borderBottom: isChild ? "none" : "1px solid #f0f0f0",
                borderLeft: isChild ? "2px solid #e6f4ff" : "none",
                marginLeft: 0,
                background: isChild ? "#fafafa" : "#fff",
                borderTop: isChild ? "1px dashed #f0f0f0" : "none",
              },
            },
            React.createElement(Av, {
              name: creatorName,
              color: "#1890ff",
              size: 30,
            }),
            React.createElement(
              "div",
              { style: { flex: 1, minWidth: 0 } },
              React.createElement(
                "div",
                {
                  style: {
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    marginBottom: 6,
                    flexWrap: "wrap",
                  },
                },
                React.createElement(
                  "span",
                  {
                    style: {
                      fontSize: 13,
                      fontFamily: FONT,
                      fontWeight: 700,
                      color: "#1a1a1a",
                    },
                  },
                  creatorName,
                ),
                React.createElement(
                  "span",
                  {
                    style: {
                      fontSize: 11,
                      fontFamily: FONT,
                      color: "#bfbfbf",
                      marginLeft: "auto",
                    },
                  },
                  fmt(time, "full"),
                ),
              ),
              isEditing
                ? React.createElement(
                    "div",
                    { style: { marginTop: 10 } },
                    React.createElement(CommentComposer, {
                      value: editBody,
                      onChange: setEditBody,
                      onAssignMultiple: setEditAssignedIds,
                      assignedIds: editAssignedIds,
                      lawyers,
                      onSubmit: () => handleSaveEdit(note.id),
                    }),
                    React.createElement(
                      "div",
                      {
                        style: {
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 8,
                          marginTop: 8,
                        },
                      },
                      React.createElement(
                        "span",
                        {
                          onClick: () => {
                            setEditingNoteId(null);
                            setEditBody("");
                            setEditAssignedIds([]);
                          },
                          style: {
                            fontSize: 12,
                            padding: "4px 12px",
                            cursor: "pointer",
                            color: "#595959",
                            border: "1px solid #d9d9d9",
                            borderRadius: 4,
                            fontFamily: FONT,
                          },
                        },
                        "Cancel",
                      ),
                      React.createElement(
                        "span",
                        {
                          onClick: () => handleSaveEdit(note.id),
                          style: {
                            fontSize: 12,
                            padding: "4px 16px",
                            cursor: "pointer",
                            color: "#fff",
                            background: "#1890ff",
                            borderRadius: 4,
                            fontWeight: 600,
                            fontFamily: FONT,
                          },
                        },
                        "Save changes",
                      ),
                    ),
                  )
                : (hasBody || hasFiles) &&
                    React.createElement(
                      "div",
                      null,
                      React.createElement(
                        "div",
                        {
                          style: {
                            fontSize: 13,
                            fontFamily: FONT,
                            color: "#262626",
                            lineHeight: 1.7,
                            background: hasFiles && !hasBody ? "transparent" : "#f8f9fa",
                            borderRadius: hasFiles && !hasBody ? 0 : 8,
                            padding: hasFiles && !hasBody ? 0 : "12px 14px",
                            borderLeft: hasFiles && !hasBody ? "none" : "3px solid #1890ff",
                          },
                        },
                        !isChild &&
                          note?.replyText &&
                          React.createElement(
                            "div",
                            {
                              style: {
                                fontSize: 12,
                                fontFamily: FONT,
                                color: "#595959",
                                background: "#fff",
                                border: "1px solid #e8e8e8",
                                borderLeft: "3px solid #bfbfbf",
                                borderRadius: "4px",
                                padding: "6px 10px",
                                marginBottom: 8,
                                whiteSpace: "pre-wrap",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              },
                            },
                            React.createElement(
                              "b",
                              { style: { color: "#8c8c8c", marginRight: 4 } },
                              "Quote:",
                            ),
                            " ",
                            note.replyText,
                          ),
                        hasBody &&
                          React.createElement(
                            "div",
                            {
                              style: {
                                marginBottom: hasFiles ? 8 : 0,
                              },
                            },
                            renderRichText(note.body, lawyers),
                          ),
                        ...files.map((f) => renderFileRow(f, itemTargetId)),
                        renderBulkSelectBar(itemTargetId, files),
                      ),
                      (note || files.length > 0) &&
                        (canEdit || isMyItem) &&
                        !isEditing &&
                        React.createElement(
                          "div",
                          {
                            style: {
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              marginTop: 6,
                              paddingLeft: 4,
                            },
                          },
                          React.createElement(
                            "span",
                            {
                              onClick: () => setReplyingTo(item),
                              style: {
                                fontSize: 12,
                                fontFamily: FONT,
                                color: "#52c41a",
                                cursor: "pointer",
                                textDecoration: "underline",
                                textUnderlineOffset: "2px",
                              },
                              onMouseEnter: (e) =>
                                (e.currentTarget.style.color = "#389e0d"),
                              onMouseLeave: (e) =>
                                (e.currentTarget.style.color = "#52c41a"),
                            },
                            "Reply",
                          ),
                          isMyItem &&
                            note &&
                            React.createElement(
                              "span",
                              {
                                onClick: () => {
                                  setEditingNoteId(note.id);
                                  setEditBody(note.body || "");
                                  setEditAssignedIds(
                                    (note.assignees || []).map((a) =>
                                      typeof a === "object" ? a.id : a,
                                    ),
                                  );
                                },
                                style: {
                                  fontSize: 12,
                                  fontFamily: FONT,
                                  color: "#595959",
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                  textUnderlineOffset: "2px",
                                },
                                onMouseEnter: (e) =>
                                  (e.currentTarget.style.color = "#1890ff"),
                                onMouseLeave: (e) =>
                                  (e.currentTarget.style.color = "#595959"),
                              },
                              "Edit",
                            ),
                          isMyItem &&
                            React.createElement(
                              "span",
                              {
                                onClick: () => handleDeleteNote(item),
                                style: {
                                  fontSize: 12,
                                  fontFamily: FONT,
                                  color: "#ff4d4f",
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                  textUnderlineOffset: "2px",
                                },
                                onMouseEnter: (e) =>
                                  (e.currentTarget.style.color = "#cf1322"),
                                onMouseLeave: (e) =>
                                  (e.currentTarget.style.color = "#ff4d4f"),
                              },
                              "Delete",
                            ),
                        ),
                    ),
              isReplyingToThis ? renderComposerBlock(true) : null,
            ),
          ),
          hasReplies &&
            React.createElement(
              "div",
              {
                style: { marginLeft: 44, padding: "0 20px 16px 0", marginTop: -8 },
              },
              React.createElement(
                "div",
                {
                  onClick: () =>
                    setExpandedThreads((p) => ({ ...p, [note.id]: !isExpanded })),
                  style: {
                    fontSize: 12,
                    color: "#1890ff",
                    cursor: "pointer",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 12px",
                    background: "#f0f8ff",
                    borderRadius: 4,
                    border: "1px dashed #91caff",
                    userSelect: "none",
                  },
                },
                isExpanded
                  ? "▲ Collapse replies"
                  : `▼ View ${replies.length} replies`,
                !isExpanded &&
                  React.createElement(
                    Avatar.Group,
                    { size: "small", maxCount: 3 },
                    replies.map((r, i) =>
                      React.createElement(Av, {
                        key: i,
                        name: r.note ? authorName(r.note) : "Anonymous",
                        size: 16,
                      }),
                    ),
                  ),
              ),
              isExpanded &&
                React.createElement(
                  "div",
                  { style: { marginTop: 8 } },
                  ...replies.map((child, idx) =>
                    renderItem(child, `${key}-child-${idx}`, true),
                  ),
                ),
            ),
        );
      };

      const triggerReplacePendingFile = (index) => {
        pendingReplaceTargetRef.current = index;
        pendingReplaceInputRef.current?.click();
      };

      const handlePendingReplaceFileChange = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        const index = pendingReplaceTargetRef.current;
        pendingReplaceTargetRef.current = null;
        if (!file || index == null || !pendingDocs[index]) return;
        setReplacingPendingIndex(index);
        try {
          const attachment = await uploadTaskAttachment(file, file.name);
          setPendingDocs((prev) =>
            prev.map((doc, i) => {
              if (i !== index) return doc;
              const oldRelativePath = String(doc.relativePath || "");
              const pathParts = oldRelativePath.split("/").filter(Boolean);
              pathParts.pop();
              const newRelativePath = pathParts.length
                ? [...pathParts, file.name].join("/")
                : file.name;
              const hadAutoTitle = doc.docTitle === doc.fileName;
              return {
                ...doc,
                attIds: [{ id: attachment.id }],
                fileName: file.name,
                fileSize: file.size || 0,
                relativePath: oldRelativePath ? newRelativePath : doc.relativePath,
                docTitle: hadAutoTitle ? file.name : doc.docTitle,
              };
            }),
          );
          message.success("File replaced");
        } catch (e) {
          message.error("Failed to replace file: " + (e?.message || "Please try again"));
        } finally {
          setReplacingPendingIndex(null);
        }
      };

      const renderPendingChips = () => {
        if (pendingDocs.length === 0) return null;
        return React.createElement(
          "div",
          {
            style: {
              display: "flex",
              gap: 6,
              flexDirection: "column",
              marginTop: 12,
            },
          },
          ...pendingDocs.map((doc, i) => {
            const name = doc.metadata.title || doc.fileName || "Document";
            return React.createElement(
              "div",
              {
                key: i,
                style: {
                  display: "flex",
                  flexDirection: "column",
                  background: "#f0f0f0",
                  border: "1px solid #d9d9d9",
                  borderRadius: 6,
                  padding: "8px 10px",
                  fontSize: 12,
                  fontFamily: FONT,
                },
              },
              React.createElement(
                "div",
                { style: { display: "flex", alignItems: "center", gap: 6 } },
                React.createElement(
                  "span",
                  {
                    style: {
                      color: "#262626",
                      fontWeight: 600,
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                  },
                  name,
                ),
                React.createElement(
                  "span",
                  {
                    style: {
                      fontSize: 11,
                      color: "#fa8c16",
                      background: "#fff7e6",
                      padding: "1px 6px",
                      borderRadius: 10,
                      border: "1px solid #ffd591",
                      fontWeight: 600,
                    },
                  },
                  "Pending",
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    title: "Replace file",
                    disabled: replacingPendingIndex === i,
                    onClick: () => triggerReplacePendingFile(i),
                    style: {
                      border: "none",
                      background: "transparent",
                      color: "#185FA5",
                      cursor: replacingPendingIndex === i ? "wait" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      padding: 0,
                      flexShrink: 0,
                      opacity: replacingPendingIndex === i ? 0.5 : 1,
                    },
                  },
                  TASK_FILE_ACTION_ICONS.replace,
                ),
                React.createElement(
                  "span",
                  {
                    onClick: () =>
                      setPendingDocs((p) => p.filter((_, j) => j !== i)),
                    style: {
                      color: "#cf1322",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: 16,
                      lineHeight: 1,
                      marginLeft: 4,
                    },
                  },
                  "×",
                ),
              ),
              doc.metadata.note &&
                React.createElement(
                  "div",
                  {
                    style: {
                      marginTop: 6,
                      color: "#262626",
                      padding: "6px 10px",
                      background: "rgba(255,255,255,0.7)",
                      borderRadius: 4,
                    },
                  },
                  React.createElement(
                    "span",
                    {
                      style: { fontWeight: 700, color: "#8c8c8c", marginRight: 6 },
                    },
                    "Note content:",
                  ),
                  doc.metadata.note,
                ),
            );
          }),
        );
      };

      const renderPendingUploadChips = () => {
        if (pendingDocs.length === 0) return null;
        const shouldRenderGrouped =
          pendingDocs.length > 1 ||
          pendingDocs.some((doc) => doc.uploadKind === "folder");
        if (!shouldRenderGrouped) return renderPendingChips();

        const groups = [];
        const groupMap = {};
        pendingDocs.forEach((doc, index) => {
          const key = doc.uploadGroupId || `single_${index}`;
          if (!groupMap[key]) {
            groupMap[key] = { key, items: [] };
            groups.push(groupMap[key]);
          }
          groupMap[key].items.push({ ...doc, _index: index });
        });

        return React.createElement(
          "div",
          {
            style: {
              display: "flex",
              gap: 8,
              flexDirection: "column",
              marginTop: 12,
            },
          },
          ...groups.map((group) => {
            const first = group.items[0] || {};
            const isFolder = first.uploadKind === "folder";
            const folderName =
              String(first.relativePath || "").split("/").filter(Boolean)[0] ||
              "Folder";
            const groupTitle = isFolder
              ? `Folder: ${folderName}`
              : `${group.items.length} attached files`;
            const totalSize = group.items.reduce(
              (sum, item) => sum + (Number(item.fileSize) || 0),
              0,
            );
            return React.createElement(
              "div",
              {
                key: group.key,
                style: {
                  background: "#F8FAFC",
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 12,
                  fontFamily: FONT,
                },
              },
                React.createElement(
                  "div",
                  { style: { display: "flex", alignItems: "center", gap: 8 } },
                React.createElement(
                  "span",
                  {
                    style: {
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      color: isFolder ? "#185FA5" : "#4B5563",
                      background: isFolder ? "#EFF6FF" : "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    },
                  },
                  isFolder
                    ? TASK_FILE_ACTION_ICONS.folder
                    : TASK_FILE_ACTION_ICONS.files,
                ),
                React.createElement(
                  "span",
                  {
                    style: {
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "#111827",
                      fontWeight: 700,
                    },
                  },
                  groupTitle,
                ),
                totalSize
                  ? React.createElement(
                      "span",
                      { style: { color: "#6B7280", fontSize: 11 } },
                      formatUploadSize(totalSize),
                    )
                  : null,
                React.createElement(
                  "span",
                  {
                    style: {
                      color: "#D97706",
                      background: "#FFF7ED",
                      border: "1px solid #FDBA74",
                      borderRadius: 999,
                      padding: "1px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                    },
                  },
                  "Pending",
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: () =>
                      setPendingDocs((prev) =>
                        prev.filter(
                          (_, index) =>
                            !group.items.some((item) => item._index === index),
                        ),
                      ),
                    style: {
                      border: "none",
                      background: "transparent",
                      color: "#DC2626",
                      cursor: "pointer",
                      fontSize: 16,
                      lineHeight: 1,
                      padding: 0,
                    },
                  },
                  "x",
                ),
              ),
              React.createElement(
                "div",
                {
                  style: {
                    marginTop: 6,
                    color: "#4B5563",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  },
                },
                ...group.items.slice(0, 4).map((item) =>
                  React.createElement(
                    "div",
                    {
                      key: `${group.key}_${item._index}`,
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      },
                    },
                    React.createElement(
                      "span",
                      {
                        style: {
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        },
                      },
                      item.docTitle || item.fileName || "Document",
                    ),
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        title: "Replace file",
                        disabled: replacingPendingIndex === item._index,
                        onClick: () => triggerReplacePendingFile(item._index),
                        style: {
                          border: "none",
                          background: "transparent",
                          color: "#185FA5",
                          cursor:
                            replacingPendingIndex === item._index
                              ? "wait"
                              : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          padding: 0,
                          flexShrink: 0,
                          opacity: replacingPendingIndex === item._index ? 0.5 : 1,
                        },
                      },
                      TASK_FILE_ACTION_ICONS.replace,
                    ),
                  ),
                ),
                group.items.length > 4 &&
                  React.createElement(
                    "div",
                    { style: { color: "#6B7280" } },
                    `+${group.items.length - 4} more files`,
                  ),
              ),
            );
          }),
        );
      };

      const hasCommentText = getCommentText(body, true).length > 0;
      const isMentionOnly = assignedIds.length > 0 && !hasCommentText;
      const canSend =
        (hasCommentText || pendingDocs.length > 0) && !isMentionOnly && !sending;
      // feed is sorted earliest -> latest; always shown in full now (no more
      // collapse/"View N more comments" threshold). searchText filters by
      // note.body's plain text (HTML stripped) — a reply whose own text
      // doesn't match drops out entirely, including in Tree mode (no parent-
      // context preservation): if that same reply's parent also drops out,
      // the reply just surfaces as a root item below (see rootItems/
      // replyMap below, unaffected by this — they only look at whether the
      // parent is present in visibleFeed).
      const trimmedSearch = searchText.trim().toLowerCase();
      const visibleFeed = trimmedSearch
        ? feed.filter((item) =>
            getCommentText(item.note?.body).toLowerCase().includes(trimmedSearch),
          )
        : feed;

      const rootItems = [];
      const replyMap = {};
      visibleFeed.forEach((item) => {
        const pId = item.note?.parentId;
        if (pId && visibleFeed.some((p) => p.note?.id === pId)) {
          if (!replyMap[pId]) replyMap[pId] = [];
          replyMap[pId].push(item);
        } else {
          rootItems.push(item);
        }
      });

      Object.keys(replyMap).forEach((k) => {
        replyMap[k].sort((a, b) => a._time - b._time);
      });

      // rootItems is always earliest -> latest (matches visibleFeed) —
      // reversed only for the "newest first" display option so replies
      // (rendered inside renderItem, unaffected by this) stay chronological
      // regardless of the top-level sort order.
      const orderedRootItems =
        sortOrder === "newest" ? [...rootItems].reverse() : rootItems;

      const renderComposerBlock = (isInline = false) => {
        return React.createElement(
          "div",
          {
            style: {
              padding: isInline ? "12px 0 0 0" : "16px 20px",
              // Main (non-inline) composer now renders above the feed —
              // borderBottom separates it from the list below, same divider
              // role the old borderTop played when it sat below the feed.
              borderBottom: isInline ? "none" : "4px solid #f0f0f0",
              background: "#fff",
              marginTop: isInline ? 8 : 0,
              flexShrink: isInline ? undefined : 0,
            },
          },
          // Tree mode keeps the original floating "Replying to X" preview
          // card. List mode instead seeds the quote + @mention directly into
          // the editor body itself when Reply is clicked (see
          // renderListItem's Reply handler + buildReplyQuoteHtml) — showing
          // this card too would just duplicate what's already visible inside
          // the input, so it collapses to a small "Cancel reply" link.
          replyingTo &&
            viewMode === "tree" &&
            React.createElement(
              "div",
              {
                style: {
                  padding: "8px 12px",
                  background: "#f5f5f5",
                  borderLeft: "3px solid #1890ff",
                  marginBottom: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderRadius: "0 4px 4px 0",
                },
              },
              React.createElement(
                "div",
                null,
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#8c8c8c",
                      fontFamily: FONT,
                    },
                  },
                  "Replying to ",
                  replyingTo.note ? authorName(replyingTo.note) : "Document",
                ),
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: 12,
                      color: "#595959",
                      fontFamily: FONT,
                      marginTop: 4,
                      whiteSpace: "pre-wrap",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    },
                  },
                  replyingTo.note?.body
                    ? replyingTo.note.body.replace(/<[^>]*>?/gm, "").trim()
                    : "Attached document",
                ),
              ),
              React.createElement(
                "div",
                {
                  onClick: () => setReplyingTo(null),
                  style: {
                    cursor: "pointer",
                    color: "#bfbfbf",
                    fontSize: 16,
                    lineHeight: 1,
                    padding: "0 4px",
                  },
                },
                "×",
              ),
            ),
          replyingTo &&
            viewMode === "list" &&
            React.createElement(
              "div",
              {
                onClick: () => {
                  setReplyingTo(null);
                  setBody("");
                },
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  cursor: "pointer",
                  color: "#8c8c8c",
                  fontSize: 12,
                  fontFamily: FONT,
                  marginBottom: 6,
                },
              },
              "✕ Cancel reply",
            ),
          React.createElement(CommentComposer, {
            // List mode keeps this composer permanently mounted (see the
            // bottom-of-return visibility change) instead of unmount/
            // remounting it whenever replyingTo changes, so Quill won't
            // pick up a new seeded body on its own (QuillEditor only applies
            // `value` once, at construction — see its "Sync initial value"
            // effect). Keying on the reply target forces the remount that
            // seeding relies on. Tree mode's inline composer already mounts
            // fresh per reply (conditionally rendered), so it doesn't need this.
            key:
              viewMode === "list"
                ? `bottom-composer-${
                    replyingTo
                      ? replyingTo.note?.id || replyingTo.files?.[0]?.id
                      : "idle"
                  }`
                : undefined,
            value: body,
            onChange: setBody,
            onAssignMultiple: (ids) => setAssignedIds(ids),
            assignedIds,
            lawyers,
            onSubmit: canSend
              ? handleSend
              : isMentionOnly
                ? warnMentionOnly
                : undefined,
            onUploadClick: () => setShowUploadModal(true),
            // canSend already folds in !sending (see hasCommentText/canSend
            // above), so "|| sending" keeps the button visible in its
            // disabled "Sending..." state instead of it vanishing the
            // instant a send starts.
            showSubmitButton: canSend || sending,
            sending,
          }),
          renderPendingUploadChips(),
        );
      };

      // ── List mode (Zalo-style flat chronological timeline) ──────────────
      // Renders visibleFeed directly (already earliest -> latest, replies
      // included) instead of splitting into rootItems/replyMap like Tree
      // mode — a flat chat feed has no "nested reply" concept, every item
      // (comment or reply) is just another bubble in time order. Reuses the
      // same handlers/sub-renderers as renderItem (CommentComposer,
      // renderRichText, renderFileRow, renderBulkSelectBar, setReplyingTo,
      // handleSaveEdit, handleDeleteNote) so editing/replying/deleting behave
      // identically in both modes.
      const CHAT_CLUSTER_WINDOW_MS = 5 * 60 * 1000;
      const getDateDividerLabel = (date) => {
        const d = new Date(date);
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const sameDay = (a, b) =>
          a.getFullYear() === b.getFullYear() &&
          a.getMonth() === b.getMonth() &&
          a.getDate() === b.getDate();
        if (sameDay(d, now)) return "Today";
        if (sameDay(d, yesterday)) return "Yesterday";
        return fmt(date, "date");
      };

      const escapeHtmlText = (s) =>
        String(s || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

      // Drops a leading <blockquote> (buildReplyQuoteHtml's own seeded
      // quote, saved as literal body content) before quoting a note again —
      // without this, replying to a reply re-quoted its target's ENTIRE
      // body including whatever it had quoted, and the next reply after
      // that re-quoted THAT, compounding without bound. Only the target's
      // own new text (what's actually visible after its quote block, if
      // any) should ever be quoted.
      const stripLeadingQuoteHtml = (html) => {
        if (!html || typeof document === "undefined") return html || "";
        const el = document.createElement("div");
        el.innerHTML = String(html);
        const first = el.firstElementChild;
        if (first && first.tagName === "BLOCKQUOTE") first.remove();
        return el.innerHTML;
      };

      // Resolves the lawyers.id behind a note's author (createdById is a
      // Nocobase users.id) — same join as currentLawyerId above — so the
      // reply quote below can tag them with a real mention chip instead of
      // inert text.
      const findLawyerByUserId = (userId) => {
        const uid = extractId(userId);
        if (!uid) return null;
        return (
          (lawyers || []).find((l) => {
            const lawyerUserId = extractId(l.userId) || extractId(l.user);
            return lawyerUserId === uid;
          }) || null
        );
      };

      // Builds the HTML seeded into the composer when Reply is clicked in
      // List mode: a quoted snippet of the target's text plus a real
      // @mention chip of its author, both as literal editor content
      // (Zalo-style) instead of the old floating "Replying to X" banner.
      // The <law-mention> markup mirrors what MentionBlot itself produces
      // (see loadQuillAsync) so Quill's clipboard converter recognizes it as
      // a real mention chip on paste, not inert text.
      const buildReplyQuoteHtml = (target) => {
        const targetNote = target?.note;
        const targetFile = target?.files?.[0];
        const targetAuthorName = targetNote
          ? authorName(targetNote)
          : targetFile
            ? userName(targetFile.createdBy) ||
              targetFile.createdBy?.email ||
              "Someone"
            : "Someone";
        const quotedSnippet = targetNote?.body
          ? getCommentText(stripLeadingQuoteHtml(targetNote.body), false)
              .trim()
              .substring(0, 150)
          : targetFile
            ? `📎 ${
                targetFile.title ||
                targetFile.docTitle ||
                targetFile.fileName ||
                "Attached document"
              }`
            : "";
        const targetLawyer = targetNote
          ? findLawyerByUserId(targetNote.createdById)
          : null;
        const mentionHtml = targetLawyer
          ? `<law-mention data-id="${targetLawyer.id}" contenteditable="false" class="mention-tag" style="${MENTION_TAG_STYLE_CSS}">@${escapeHtmlText(targetLawyer.lawyerName)}</law-mention>`
          : `<b>@${escapeHtmlText(targetAuthorName)}</b>`;
        return (
          `<blockquote style="margin:0 0 6px;padding:4px 10px;border-left:3px solid #bfbfbf;background:#f5f5f5;color:#595959;font-size:12px;">` +
          `<b>${escapeHtmlText(targetAuthorName)}:</b> ${escapeHtmlText(quotedSnippet)}` +
          `</blockquote><p>${mentionHtml}&nbsp;</p>`
        );
      };

      // A folder uploaded in one go (webkitdirectory / drag-drop a folder)
      // creates real sub-folders in the document tree — every file inside
      // ends up sharing both this comment's batchId (so they're already one
      // `item`) AND that real, non-root folderId. 2+ files in the same item
      // sharing a folderId is as reliable as it gets that they came from
      // the same folder upload rather than being picked one by one, with no
      // extra fetch needed (folderLookup is already loaded for the badge
      // tooltip elsewhere in this component).
      const groupFilesByUploadFolder = (files) => {
        const byFolder = new Map();
        const rootId = String(extractId(projectFolderId) || "");
        files.forEach((f) => {
          const fid = String(extractId(f.folderId) || "");
          if (!fid || fid === rootId) return;
          if (!byFolder.has(fid)) byFolder.set(fid, []);
          byFolder.get(fid).push(f);
        });
        const groupedFolderIds = new Set();
        const groups = [];
        byFolder.forEach((groupFiles, fid) => {
          if (groupFiles.length < 2) return;
          groupedFolderIds.add(fid);
          groups.push({ folderId: fid, files: groupFiles });
        });
        const standalone = files.filter(
          (f) => !groupedFolderIds.has(String(extractId(f.folderId) || "")),
        );
        return { groups, standalone };
      };

      const renderListItem = (item, key, { dateLabel, isFirstInCluster }) => {
        const { note, files } = item;
        const firstFile = files[0];
        const creatorName = note
          ? authorName(note)
          : firstFile?.createdBy
            ? userName(firstFile.createdBy) || firstFile.createdBy?.email
            : "System";
        const time = note?.createdAt || firstFile?.createdAt;
        const hasBody = !!note?.body;
        const hasFiles = files.length > 0;
        const isMyItem =
          (note && currentUser && note.createdById === currentUser.id) ||
          (!note &&
            firstFile &&
            currentUser &&
            firstFile.createdById === currentUser.id);
        const isEditing = note && editingNoteId === note.id;
        const itemTargetId = note?.id || files[0]?.id;

        return React.createElement(
          "div",
          { key },
          dateLabel &&
            React.createElement(
              "div",
              { style: { textAlign: "center", margin: "16px 0 12px" } },
              React.createElement(
                "span",
                {
                  style: {
                    display: "inline-block",
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: FONT,
                    color: "#8c8c8c",
                    background: "#f0f0f0",
                    borderRadius: 12,
                    padding: "3px 12px",
                  },
                },
                dateLabel,
              ),
            ),
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: isMyItem ? "row-reverse" : "row",
                gap: 8,
                padding: isFirstInCluster ? "10px 16px 2px" : "1px 16px",
                // Avatar pins to the top of the message (its own cluster's
                // first line), not the bottom — content height varies a lot
                // once a message can hold a file card or a folder group, so
                // flex-end put the avatar next to the LAST line (the
                // Reply/Edit/Delete row) instead of next to the author.
                alignItems: "flex-start",
              },
            },
            React.createElement(
              "div",
              { style: { width: 30, flexShrink: 0 } },
              isFirstInCluster
                ? React.createElement(Av, {
                    name: creatorName,
                    color: isMyItem ? "#52c41a" : "#1890ff",
                    size: 30,
                  })
                : null,
            ),
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isMyItem ? "flex-end" : "flex-start",
                  maxWidth: "72%",
                  minWidth: 0,
                },
              },
              isFirstInCluster &&
                !isMyItem &&
                React.createElement(
                  "span",
                  {
                    style: {
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: FONT,
                      color: "#8c8c8c",
                      marginBottom: 3,
                      marginLeft: 2,
                    },
                  },
                  creatorName,
                ),
              isEditing
                ? React.createElement(
                    "div",
                    { style: { marginTop: 4, width: "100%" } },
                    React.createElement(CommentComposer, {
                      value: editBody,
                      onChange: setEditBody,
                      onAssignMultiple: setEditAssignedIds,
                      assignedIds: editAssignedIds,
                      lawyers,
                      onSubmit: () => handleSaveEdit(note.id),
                    }),
                    React.createElement(
                      "div",
                      {
                        style: {
                          display: "flex",
                          justifyContent: "flex-end",
                          gap: 8,
                          marginTop: 8,
                        },
                      },
                      React.createElement(
                        "span",
                        {
                          onClick: () => {
                            setEditingNoteId(null);
                            setEditBody("");
                            setEditAssignedIds([]);
                          },
                          style: {
                            fontSize: 12,
                            padding: "4px 12px",
                            cursor: "pointer",
                            color: "#595959",
                            border: "1px solid #d9d9d9",
                            borderRadius: 4,
                            fontFamily: FONT,
                          },
                        },
                        "Cancel",
                      ),
                      React.createElement(
                        "span",
                        {
                          onClick: () => handleSaveEdit(note.id),
                          style: {
                            fontSize: 12,
                            padding: "4px 16px",
                            cursor: "pointer",
                            color: "#fff",
                            background: "#1890ff",
                            borderRadius: 4,
                            fontWeight: 600,
                            fontFamily: FONT,
                          },
                        },
                        "Save changes",
                      ),
                    ),
                  )
                : (hasBody || hasFiles) &&
                    React.createElement(
                      "div",
                      {
                        style: {
                          fontSize: 13,
                          fontFamily: FONT,
                          color: "#262626",
                          lineHeight: 1.6,
                          // Always a real bubble now, file-only messages
                          // included — the old transparent/no-padding
                          // special case (borrowed from Tree mode, where
                          // each file already drew its own full box) left
                          // file-only messages looking like loose,
                          // unbubbled content once List mode's compact
                          // file card/folder rows stopped doing that.
                          background: isMyItem ? "#e6f4ff" : "#f0f0f0",
                          borderRadius: 14,
                          padding: "8px 12px",
                        },
                      },
                      // Unlike Tree mode's renderItem (which only shows this
                      // quote for root items — a reply's quoted parent is
                      // already right above it visually), List mode has no
                      // indentation to imply that adjacency, so every reply
                      // shows its quote regardless of position — EXCEPT when
                      // the body itself already opens with an embedded
                      // <blockquote> (buildReplyQuoteHtml's seeded quote,
                      // saved as literal body content): showing this too
                      // would duplicate it. Legacy replies made before the
                      // seeded-quote change have no such blockquote in their
                      // body, so they still fall back to this replyText box.
                      note?.replyText &&
                        !/^\s*<blockquote/i.test(note.body || "") &&
                        React.createElement(
                          "div",
                          {
                            style: {
                              fontSize: 12,
                              fontFamily: FONT,
                              color: "#595959",
                              background: "#fff",
                              border: "1px solid #e8e8e8",
                              borderLeft: "3px solid #bfbfbf",
                              borderRadius: "4px",
                              padding: "6px 10px",
                              marginBottom: 6,
                              whiteSpace: "pre-wrap",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            },
                          },
                          React.createElement(
                            "b",
                            { style: { color: "#8c8c8c", marginRight: 4 } },
                            "Quote:",
                          ),
                          " ",
                          note.replyText,
                        ),
                      hasBody &&
                        React.createElement(
                          "div",
                          { style: { marginBottom: hasFiles ? 8 : 0 } },
                          renderRichText(note.body, lawyers),
                        ),
                      // Files uploaded together as one folder collapse
                      // under a single folder row (see
                      // groupFilesByUploadFolder); everything else shares
                      // one card instead of a separate bordered box per
                      // file (renderFileRow's compact mode) — much less
                      // vertical space for file-only messages especially.
                      hasFiles &&
                        (() => {
                          const { groups, standalone } =
                            groupFilesByUploadFolder(files);
                          return React.createElement(
                            "div",
                            {
                              style: {
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                              },
                            },
                            ...groups.map((group) => {
                              const groupKey = `${itemTargetId}-${group.folderId}`;
                              const isOpen = !!expandedFileFolders[groupKey];
                              const folderName =
                                folderLookup[group.folderId]?.name ||
                                folderLookup[group.folderId]?.title ||
                                "Folder";
                              return React.createElement(
                                "div",
                                { key: groupKey },
                                React.createElement(
                                  "div",
                                  {
                                    onClick: () =>
                                      setExpandedFileFolders((prev) => ({
                                        ...prev,
                                        [groupKey]: !isOpen,
                                      })),
                                    style: {
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      padding: "8px 12px",
                                      background: "#fff",
                                      border: "1px solid #e8e8e8",
                                      borderRadius: 8,
                                      cursor: "pointer",
                                      fontSize: 13,
                                      fontFamily: FONT,
                                    },
                                  },
                                  React.createElement(
                                    "span",
                                    {
                                      style: {
                                        fontSize: 10,
                                        color: "#8c8c8c",
                                        width: 10,
                                        display: "inline-block",
                                        flexShrink: 0,
                                      },
                                    },
                                    isOpen ? "▼" : "▶",
                                  ),
                                  TASK_FILE_ACTION_ICONS.folder,
                                  React.createElement(
                                    "span",
                                    {
                                      style: {
                                        flex: 1,
                                        fontWeight: 600,
                                        color: "#262626",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      },
                                    },
                                    folderName,
                                  ),
                                  React.createElement(
                                    "span",
                                    {
                                      style: {
                                        fontSize: 11,
                                        color: "#8c8c8c",
                                        background: "#f5f5f5",
                                        borderRadius: 999,
                                        padding: "1px 8px",
                                        flexShrink: 0,
                                      },
                                    },
                                    `${group.files.length} files`,
                                  ),
                                  React.createElement(
                                    "button",
                                    {
                                      type: "button",
                                      title: "Download all files in this folder",
                                      onClick: (e) => {
                                        e.stopPropagation();
                                        downloadFilesAsZip(
                                          group.files.map((f) => {
                                            const att = Array.isArray(
                                              f.fileAttachment,
                                            )
                                              ? f.fileAttachment[0]
                                              : f.fileAttachment;
                                            return {
                                              url: getFullUrl(
                                                att?.url || att?.preview,
                                              ),
                                              rawUrl:
                                                att?.url || att?.preview,
                                              filename:
                                                att?.filename ||
                                                f.title ||
                                                f.name ||
                                                att?.title,
                                            };
                                          }),
                                          `${folderName}.zip`,
                                        );
                                      },
                                      style: {
                                        flexShrink: 0,
                                        border: "none",
                                        background: "transparent",
                                        cursor: "pointer",
                                        padding: 4,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        color: "#6B7280",
                                      },
                                    },
                                    TASK_FILE_ACTION_ICONS.download,
                                  ),
                                ),
                                isOpen &&
                                  React.createElement(
                                    "div",
                                    {
                                      style: {
                                        marginLeft: 20,
                                        marginTop: 4,
                                        paddingLeft: 10,
                                        borderLeft: "1px dashed #d9d9d9",
                                      },
                                    },
                                    ...group.files.map((f) =>
                                      renderFileRow(f, itemTargetId),
                                    ),
                                  ),
                              );
                            }),
                            standalone.length > 0 &&
                              React.createElement(
                                "div",
                                {
                                  style: {
                                    background: "#fff",
                                    border: "1px solid #e8e8e8",
                                    borderRadius: 8,
                                    overflow: "hidden",
                                  },
                                },
                                ...standalone.map((f, i) =>
                                  renderFileRow(f, itemTargetId, {
                                    compact: true,
                                    isLast: i === standalone.length - 1,
                                  }),
                                ),
                              ),
                          );
                        })(),
                      renderBulkSelectBar(itemTargetId, files),
                    ),
              !isEditing &&
                (note || files.length > 0) &&
                React.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginTop: 3,
                      fontSize: 11,
                      fontFamily: FONT,
                      color: "#bfbfbf",
                    },
                  },
                  fmt(time, "full"),
                  (canEdit || isMyItem) &&
                    React.createElement(
                      "span",
                      {
                        onClick: () => {
                          setReplyingTo(item);
                          setBody(buildReplyQuoteHtml(item));
                          const targetLawyer = note
                            ? findLawyerByUserId(note.createdById)
                            : null;
                          if (
                            targetLawyer &&
                            !(assignedIds || []).includes(targetLawyer.id)
                          ) {
                            setAssignedIds([
                              ...(assignedIds || []),
                              targetLawyer.id,
                            ]);
                          }
                        },
                        style: {
                          cursor: "pointer",
                          color: "#52c41a",
                          textDecoration: "underline",
                          textUnderlineOffset: "2px",
                        },
                      },
                      "Reply",
                    ),
                  isMyItem &&
                    note &&
                    React.createElement(
                      "span",
                      {
                        onClick: () => {
                          setEditingNoteId(note.id);
                          setEditBody(note.body || "");
                          setEditAssignedIds(
                            (note.assignees || []).map((a) =>
                              typeof a === "object" ? a.id : a,
                            ),
                          );
                        },
                        style: {
                          cursor: "pointer",
                          textDecoration: "underline",
                          textUnderlineOffset: "2px",
                        },
                      },
                      "Edit",
                    ),
                  isMyItem &&
                    React.createElement(
                      "span",
                      {
                        onClick: () => handleDeleteNote(item),
                        style: {
                          cursor: "pointer",
                          color: "#ff4d4f",
                          textDecoration: "underline",
                          textUnderlineOffset: "2px",
                        },
                      },
                      "Delete",
                    ),
                ),
            ),
          ),
        );
      };

      // visibleFeed is always earliest -> latest; reversed here (not at the
      // source) so Tree mode's rootItems/replyMap above — which need the
      // original earliest-first array to detect parent/reply relationships
      // — stay unaffected by List mode's own sort choice.
      const orderedListFeed =
        sortOrder === "newest" ? [...visibleFeed].reverse() : visibleFeed;

      const renderListFeed = () => {
        let lastDateKey = null;
        let lastAuthorKey = null;
        let lastTime = null;
        return orderedListFeed.map((item, i) => {
          const t = item._time instanceof Date ? item._time : new Date(item._time);
          const dateKey = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
          const authorKey = item.note
            ? `n${item.note.createdById}`
            : `f${item.files[0]?.createdById}`;
          const dateLabel = dateKey !== lastDateKey ? getDateDividerLabel(t) : null;
          // Math.abs — orderedListFeed may run newest -> oldest, so the gap
          // between consecutive items can be negative; only its magnitude
          // matters for "does this start a new cluster".
          const isFirstInCluster =
            !!dateLabel ||
            authorKey !== lastAuthorKey ||
            !lastTime ||
            Math.abs(t.getTime() - lastTime.getTime()) > CHAT_CLUSTER_WINDOW_MS;
          lastDateKey = dateKey;
          lastAuthorKey = authorKey;
          lastTime = t;
          return renderListItem(item, `list-item-${i}`, {
            dateLabel,
            isFirstInCluster,
          });
        });
      };

      const feedBodyNodes =
        viewMode === "list"
          ? renderListFeed()
          : orderedRootItems.map((item, i) => renderItem(item, `item-${i}`));

      return React.createElement(
        "div",
        {
          style: {
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: "#fff",
          },
        },
        // Composer sits fixed at the top now (both modes) — always visible
        // without scrolling, new comment appears right below it. List mode's
        // composer stays put here even while replying — Tree mode still
        // swaps it out for the inline one under the item being replied to
        // (renderItem's isReplyingToThis branch).
        viewMode === "list" || !replyingTo
          ? renderComposerBlock(false)
          : null,
        // Danh sách bình luận cuộn riêng bên dưới composer — thứ tự theo
        // sortOrder (Newest/Oldest), áp dụng cho cả list & tree.
        React.createElement(
          "div",
          { style: { flex: 1, overflowY: "auto", overflowX: "hidden" } },
          React.createElement(
            "div",
            { style: { paddingBottom: 24 } },
            loading
              ? React.createElement(
                  "div",
                  { style: { textAlign: "center", padding: "24px 0" } },
                  React.createElement(Spin, { size: "small" }),
                )
              : feed.length === 0
                ? React.createElement(
                    "div",
                    {
                      style: {
                        textAlign: "center",
                        padding: "32px 0",
                        fontSize: 13,
                        fontFamily: FONT,
                        color: "#bfbfbf",
                      },
                    },
                    "No comments or documents yet",
                  )
                : visibleFeed.length === 0
                  ? React.createElement(
                      "div",
                      {
                        style: {
                          textAlign: "center",
                          padding: "32px 0",
                          fontSize: 13,
                          fontFamily: FONT,
                          color: "#bfbfbf",
                        },
                      },
                      "No comments match your search",
                    )
                  : React.createElement("div", null, ...feedBodyNodes),
          ),
        ),
        React.createElement("input", {
          key: "pending-replace-input",
          ref: pendingReplaceInputRef,
          type: "file",
          style: { display: "none" },
          onChange: handlePendingReplaceFileChange,
        }),
        previewDoc &&
          React.createElement(PreviewModal, {
            doc: previewDoc,
            onClose: () => setPreviewDoc(null),
          }),
        React.createElement(FileUploadModal, {
          open: showUploadModal,
          onClose: () => setShowUploadModal(false),
          onAddPending: (newDocData) =>
            setPendingDocs((prev) => [
              ...prev,
              ...(Array.isArray(newDocData) ? newDocData : [newDocData]),
            ]),
          collectionName,
          recordId,
          currentUser,
          currentLawyerId,
          lawyers,
          projectFolderId,
          caseId: getDeepLinkCaseId(caseId || taskContext.caseId),
          taskId: taskContext.taskId,
          subTaskId: taskContext.subTaskId,
          isProjectInternalContext,
          projectInternalId: taskContext.projectInternalId,
        }),
        replacingFileDoc &&
          React.createElement(FileUploadModal, {
            open: !!replacingFileDoc,
            editDoc: replacingFileDoc,
            onClose: () => setReplacingFileDoc(null),
            onSuccess: () => {
              setReplacingFileDoc(null);
              reload();
            },
            collectionName,
            recordId,
            currentUser,
            currentLawyerId,
            lawyers,
            projectFolderId,
            caseId: getDeepLinkCaseId(caseId || taskContext.caseId),
            taskId: taskContext.taskId,
            subTaskId: taskContext.subTaskId,
            isProjectInternalContext,
            projectInternalId: taskContext.projectInternalId,
          }),
        libraryMoveTarget &&
          React.createElement(LibraryMoveModal, {
            open: !!libraryMoveTarget,
            record: libraryMoveTarget.record,
            destinationType: libraryMoveTarget.destinationType,
            availableDestinationTypes: libraryMoveTarget.availableDestinationTypes,
            sourceContext: {
              collectionName,
              recordId,
              caseId,
              ...taskContext,
            },
            currentUser,
            onClose: () => setLibraryMoveTarget(null),
            onSuccess: () => {
              setLibraryMoveTarget(null);
              reload();
            },
          }),
        bulkMoveTarget &&
          React.createElement(LibraryMoveModal, {
            open: !!bulkMoveTarget,
            records: bulkMoveTarget.records,
            destinationType: bulkMoveTarget.destinationType,
            availableDestinationTypes: bulkMoveTarget.availableDestinationTypes,
            sourceContext: {
              collectionName,
              recordId,
              caseId,
              ...taskContext,
            },
            currentUser,
            onClose: () => setBulkMoveTarget(null),
            onSuccess: () => {
              setBulkSelectState((prev) => {
                const next = { ...prev };
                delete next[bulkMoveTarget.itemKey];
                return next;
              });
              setBulkMoveTarget(null);
              reload();
            },
          }),
      );
    };

    const PreviewModal = ({ doc, onClose }) => {
      if (!doc) return null;
      const attachment = Array.isArray(doc.fileAttachment)
        ? doc.fileAttachment[0]
        : doc.fileAttachment;
      const fileUrl = attachment?.url || attachment?.preview;
      const fullUrl = getFullUrl(fileUrl);
      const rawName =
        doc.title || attachment?.title || attachment?.filename || "File";
      const extFromAtt = attachment?.extname
        ? attachment.extname.startsWith(".")
          ? attachment.extname.toLowerCase()
          : "." + attachment.extname.toLowerCase()
        : "";
      const extFromName = rawName.includes(".")
        ? "." + rawName.split(".").pop().toLowerCase()
        : "";
      const fileExt = extFromAtt || extFromName || "";
      const baseName = rawName.toLowerCase().endsWith(fileExt)
        ? rawName.slice(0, rawName.length - fileExt.length)
        : rawName;
      const displayName = (baseName || "File") + fileExt;
      const isPdf = fileExt === ".pdf";
      const isImage = [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(fileExt);
      const isOffice = [
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
        ".odt",
      ].includes(fileExt);

      // Office Viewer URL — file phải có public URL
      const officeViewerUrl =
        isOffice && fullUrl
          ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`
          : null;
      return React.createElement(
        Modal,
        {
          open: !!doc,
          onCancel: onClose,
          centered: true,
          width: isPdf || isOffice ? "96vw" : "auto",
          title: React.createElement(
            "span",
            { style: { fontFamily: FONT } },
            displayName,
          ),
          bodyStyle: {
            padding: 0,
            maxWidth: "100%",
            overflowX: "hidden",
            overflowY: "hidden",
          },
          footer: [
            fullUrl &&
              React.createElement(
                Button,
                {
                  key: "dl",
                  onClick: () => window.open(fullUrl, "_blank"),
                },
                "⬇️ Download",
              ),
            React.createElement(Button, { key: "cl", onClick: onClose }, "Close"),
          ].filter(Boolean),
        },
        renderTaskFilePreviewFrame({
          fullUrl,
          title: displayName,
          isPdf,
          isImage,
          isOffice,
          officeViewerUrl,
          height: "82vh",
          modal: true,
        }),
        // Fallback
        !isPdf &&
          !isImage &&
          !isOffice &&
          React.createElement(
            "div",
            {
              style: { padding: 32, textAlign: "center" },
            },
            React.createElement(Empty, {
              description:
                "Cannot preview this file format — please download to open",
            }),
          ),
      );
    };

    const LibraryMoveModal = ({
      open,
      record,
      records,
      destinationType: initialDestinationType,
      availableDestinationTypes: availableDestinationTypesProp,
      sourceContext,
      currentUser,
      onClose,
      onSuccess,
    }) => {
      // `destinationType` is mutable state, not a fixed prop — the unified
      // "Move to Library" action opens with a default category (see
      // getLibraryMoveCategories) but lets the user switch between the
      // categories offered for this context via the Segmented control
      // rendered below (only shown when there's more than one). Every other
      // caller (Move to Case's/Internal Work's Document) still passes a
      // single fixed destinationType, so availableDestinationTypesProp
      // defaults to just that one type and the switch never renders.
      const availableDestinationTypes = availableDestinationTypesProp || [
        initialDestinationType,
      ];
      const [destinationType, setDestinationType] = useState(initialDestinationType);
      const config = getLibraryDestinationConfig(destinationType);
      const isCaseDocument = destinationType === LIBRARY_DESTINATION.CASE_DOCUMENT;
      const isKnowledge = destinationType === LIBRARY_DESTINATION.KNOWLEDGE;
      // Same shape as CASE_DOCUMENT — the parent is always the current
      // Internal Work item, no parent-record picker.
      const isProjectInternalDoc =
        destinationType === LIBRARY_DESTINATION.PROJECT_INTERNAL_DOCUMENT;
      // Same shape as LEGAL_STUDY/LEGAL_REFERENCE — has its own parent-record
      // picker (browse customers), unlike the 3 destinations above.
      const isCustomerDoc = destinationType === LIBRARY_DESTINATION.CUSTOMER_DOCUMENT;
      // Destinations with no "select parent record" step — the parent is
      // always implied by context (current case / current Internal Work
      // item / company-wide Knowledge).
      const hasImplicitScope = isCaseDocument || isKnowledge || isProjectInternalDoc;
      // Accepts either a single `record` (legacy single-file/folder move) or a
      // `records` array (bulk move) — everything below operates on the array.
      const targetRecords = useMemo(
        () => (records && records.length ? records : record ? [record] : []),
        [records, record],
      );
      const isBulk = targetRecords.length > 1;
      const primaryRecord = targetRecords[0] || null;

      const [parentRecords, setParentRecords] = useState([]);
      const [selectedRecordId, setSelectedRecordId] = useState(null);
      const [folderTree, setFolderTree] = useState([]);
      const [folders, setFolders] = useState([]);
      const [targetFolderId, setTargetFolderId] = useState("root");
      const [loading, setLoading] = useState(false);
      const [loadingFolders, setLoadingFolders] = useState(false);
      const [saving, setSaving] = useState(false);

      const primaryIsFolder = primaryRecord?._type === "folder";
      const sourceLabel =
        getLegalStudySourceLabel(primaryRecord) ||
        sourceContext?.subTaskTitle ||
        sourceContext?.taskTitle ||
        "";
      const primaryAtt = getPrimaryAttachment(primaryRecord);
      const primaryRecordName =
        primaryRecord?.title ||
        primaryRecord?.name ||
        primaryAtt?.title ||
        primaryAtt?.filename ||
        (primaryIsFolder ? "Folder" : "Document");
      const selectedParentRecord = hasImplicitScope
        ? null
        : parentRecords.find(
            (item) =>
              String(getLibraryRecordId(item, destinationType) || "") ===
              String(selectedRecordId || ""),
          );

      useEffect(() => {
        if (!open) return;
        if (isCaseDocument) {
          // No parent-record picker — the parent is always the current case.
          setParentRecords([]);
          setSelectedRecordId(
            sourceContext?.caseId ? String(extractId(sourceContext.caseId)) : null,
          );
          setTargetFolderId("root");
          setFolders([]);
          setFolderTree([]);
          return;
        }
        if (isKnowledge) {
          // No parent-record picker here either — Knowledge folders aren't
          // scoped to a single record, so there's nothing to pick a parent
          // for. Use a constant sentinel (always truthy) purely to trigger
          // the folder-loading effect below and keep the submit button enabled.
          setParentRecords([]);
          setSelectedRecordId("__knowledge__");
          setTargetFolderId("root");
          setFolders([]);
          setFolderTree([]);
          return;
        }
        if (isProjectInternalDoc) {
          // No parent-record picker — the parent is always the current
          // Internal Work item.
          setParentRecords([]);
          setSelectedRecordId(
            sourceContext?.projectInternalId
              ? String(extractId(sourceContext.projectInternalId))
              : null,
          );
          setTargetFolderId("root");
          setFolders([]);
          setFolderTree([]);
          return;
        }
        let cancelled = false;
        const loadRecords = async () => {
          setLoading(true);
          const rows = await fetchLibraryDestinationRecords(destinationType);
          if (cancelled) return;
          setParentRecords(rows);
          const currentParentId = getRecordDestinationId(primaryRecord, destinationType);
          const hasCurrentParent = rows.some(
            (item) =>
              String(getLibraryRecordId(item, destinationType) || "") ===
              String(currentParentId || ""),
          );
          setSelectedRecordId(
            !isBulk && hasCurrentParent ? String(currentParentId) : null,
          );
          setTargetFolderId("root");
          setFolders([]);
          setFolderTree([]);
          setLoading(false);
        };
        loadRecords();
        return () => {
          cancelled = true;
        };
      }, [
        open,
        primaryRecord?.id,
        destinationType,
        isCaseDocument,
        isKnowledge,
        isProjectInternalDoc,
        isBulk,
        sourceContext?.caseId,
        sourceContext?.projectInternalId,
      ]);

      useEffect(() => {
        if (!open || !selectedRecordId) {
          setFolders([]);
          setFolderTree([]);
          setTargetFolderId("root");
          return;
        }
        let cancelled = false;
        const loadFolders = async () => {
          setLoadingFolders(true);
          const rows = isCaseDocument
            ? await fetchCaseDocumentFolders(selectedRecordId)
            : isKnowledge
              ? await fetchKnowledgeFolders()
              : isProjectInternalDoc
                ? await fetchProjectInternalDocumentFolders(selectedRecordId)
                : isCustomerDoc
                  ? await fetchCustomerDocumentFolders(selectedRecordId)
                  : await fetchLibraryDestinationFolders(destinationType, selectedRecordId);
          if (cancelled) return;
          setFolders(rows);
          const rawTree = buildLibraryFolderTree(rows);
          // Knowledge has no parent-record picker (see the isKnowledge branch
          // above) offering the usual "you're browsing under X" context, so
          // wrap the real folder tree in a non-selectable "Knowledge" root
          // node — otherwise the destination picker was just a flat-looking
          // folder list with no indication of which space it belongs to.
          setFolderTree(
            isKnowledge
              ? [
                  {
                    // Plain category label, not a folder icon — "Knowledge" is
                    // the space/category these folders live under, not a
                    // folder itself. The real folders are rawTree's children.
                    title: renderLibraryCategoryTitle("Knowledge"),
                    searchText: "Knowledge",
                    value: "__knowledge_root__",
                    key: "__knowledge_root__",
                    selectable: false,
                    children: rawTree,
                  },
                ]
              : rawTree,
          );
          if (!isBulk) {
            const currentFolderId = extractId(primaryRecord?.folderId);
            const folderBelongsToSelectedRecord = rows.some(
              (folder) => extractId(folder?.id) === currentFolderId,
            );
            setTargetFolderId(folderBelongsToSelectedRecord ? String(currentFolderId) : "root");
          } else {
            setTargetFolderId("root");
          }
          setLoadingFolders(false);
        };
        loadFolders();
        return () => {
          cancelled = true;
        };
      }, [
        open,
        selectedRecordId,
        destinationType,
        isCaseDocument,
        isKnowledge,
        isProjectInternalDoc,
        isCustomerDoc,
        isBulk,
        primaryRecord?.folderId,
      ]);

      const getFolderName = (folderId) => {
        const id = String(extractId(folderId) || "");
        if (!id) {
          return hasImplicitScope
            ? config.label
            : getLibraryRecordDisplayName(selectedParentRecord, destinationType) ||
                config.label;
        }
        const folder = folders.find((item) => String(extractId(item.id)) === id);
        return folder?.name || folder?.title || `${config.label} / Folder #${id}`;
      };

      const handleSubmit = async () => {
        if (targetRecords.length === 0) {
          message.warning("No file selected");
          return;
        }
        const parentRecordId = extractId(selectedRecordId);
        if (isCaseDocument) {
          if (!parentRecordId) {
            message.warning("Cannot determine the current case");
            return;
          }
        } else if (isKnowledge) {
          // No parent record to validate — any Knowledge folder (or its root)
          // is a valid target.
        } else if (isProjectInternalDoc) {
          if (!parentRecordId) {
            message.warning("Cannot determine the current Internal Work item");
            return;
          }
        } else if (!parentRecordId || !selectedParentRecord) {
          message.warning(`Please select a ${config.label} record`);
          return;
        }
        setSaving(true);
        try {
          const now = new Date().toISOString();
          const userId = extractId(currentUser?.id);
          const safeTargetFolderId =
            targetFolderId === "root" ? null : extractId(targetFolderId);
          const batchId = `lib_${Date.now().toString(36)}_${Math.random()
            .toString(36)
            .slice(2, 5)}`;
          const changedBy = userName(currentUser) || currentUser?.username || "System";
          const targetLabel = getFolderName(safeTargetFolderId);
          // Knowledge has no single parent record to read a company from —
          // inherit it from whichever destination folder was picked (every
          // existing Knowledge folder already carries its own
          // internalCompanyId). Root-level (no folder picked) stays uncategorized.
          const targetKnowledgeFolder = isKnowledge
            ? folders.find(
                (item) => String(extractId(item.id)) === String(safeTargetFolderId || ""),
              )
            : null;
          const internalCompanyId = isCaseDocument || isProjectInternalDoc
            ? null
            : isKnowledge
              ? getLibraryRecordInternalCompanyId(targetKnowledgeFolder)
              : getLibraryRecordInternalCompanyId(selectedParentRecord);
          const activityAction = isCaseDocument
            ? ACTIVITY_ACTION.MOVE_TO_CASE_DOCUMENT
            : isKnowledge
              ? ACTIVITY_ACTION.MOVE_TO_KNOWLEDGE
              : isProjectInternalDoc
                ? ACTIVITY_ACTION.MOVE_TO_PROJECT_INTERNAL_DOCUMENT
                : isCustomerDoc
                  ? ACTIVITY_ACTION.MOVE_TO_CUSTOMER_DOCUMENT
                  : destinationType === LIBRARY_DESTINATION.LEGAL_STUDY
                    ? ACTIVITY_ACTION.LINK_LEGAL_STUDY
                    : ACTIVITY_ACTION.LINK_LEGAL_REFERENCE;

          const updatedRecords = [];
          for (const rec of targetRecords) {
            const recIsFolder = rec?._type === "folder";
            const recId = extractId(rec?.id || rec);
            if (!recId) continue;

            const hasOriginFolder =
              rec?.originFolderId !== undefined &&
              rec?.originFolderId !== null &&
              rec?.originFolderId !== "";
            const oldFolderId = hasOriginFolder
              ? extractId(rec.originFolderId)
              : extractId(rec?.folderId || rec?.parentId);
            const oldScope =
              rec?.originScope ||
              (rec?.moduleScope &&
              ![LEGAL_STUDY_MODULE_SCOPE, LEGAL_REFERENCE_MODULE_SCOPE].includes(rec.moduleScope)
                ? rec.moduleScope
                : CASE_DOCUMENT_SCOPE);
            const sourceSnapshot = isCaseDocument || isKnowledge || isProjectInternalDoc || isCustomerDoc
              ? null
              : {
                  ...(parseLegalStudySource(rec?.legalStudySource) || {}),
                  ...buildLegalStudySource(sourceContext),
                };
            const relationPayload = isCaseDocument || isKnowledge || isProjectInternalDoc || isCustomerDoc
              ? { legalStudyId: null, legalReferenceId: null }
              : {
                  legalStudyId:
                    destinationType === LIBRARY_DESTINATION.LEGAL_STUDY ? parentRecordId : null,
                  legalReferenceId:
                    destinationType === LIBRARY_DESTINATION.LEGAL_REFERENCE ? parentRecordId : null,
                };
            const commonPayload = {
              moduleScope: config.moduleScope,
              storageType: config.storageType,
              ...relationPayload,
              internalCompanyId: internalCompanyId || null,
              originScope: oldScope,
              originFolderId: oldFolderId || null,
              legalStudyLinkedAt:
                destinationType === LIBRARY_DESTINATION.LEGAL_STUDY
                  ? rec?.legalStudyLinkedAt || now
                  : null,
              legalStudySource: sourceSnapshot,
              movedToLegalReferenceAt:
                destinationType === LIBRARY_DESTINATION.LEGAL_REFERENCE ? now : null,
              movedToLegalReferenceById:
                destinationType === LIBRARY_DESTINATION.LEGAL_REFERENCE ? userId || null : null,
              updatedAt: now,
              ...(userId ? { updatedById: userId } : {}),
              // ProjectDocument.js treats ANY record carrying a
              // projectInternalId as its own regardless of moduleScope, so
              // it must be cleared on every OTHER destination — not just
              // cosmetic, otherwise a moved file would still show up back in
              // Internal Work's document list. customerId is NOT cleared
              // here: Case documents legitimately carry their case's own
              // customerId as normal data (CaseCreateForm.js nests every
              // Case folder under its Customer's own root folder), so this
              // file staying visible under that customer in
              // CustomerDocument.js is correct, not a leak.
              ...(isCaseDocument
                ? { caseId: parentRecordId, projectInternalId: null }
                : {}),
              // Knowledge is company-scoped, not case/customer-scoped —
              // clear any stale caseId/projectInternalId/customerId a
              // task-attachment file may have carried in.
              ...(isKnowledge
                ? { caseId: null, projectInternalId: null, customerId: null }
                : {}),
              ...(isProjectInternalDoc
                ? { caseId: null, projectInternalId: parentRecordId, customerId: null }
                : {}),
              // CustomerDocument.js's own "customer" space filters purely by
              // customerId regardless of moduleScope (same leak risk as
              // projectInternalId above) — clear it on every other
              // destination so a file moved OUT of Customer stops showing
              // there.
              ...(isCustomerDoc
                ? { caseId: null, projectInternalId: null, customerId: parentRecordId }
                : {}),
            };

            let updatedRecord = null;
            if (recIsFolder) {
              const folderCommonPayload = { ...commonPayload };
              delete folderCommonPayload.movedToLegalReferenceAt;
              delete folderCommonPayload.movedToLegalReferenceById;
              const foldersToMove =
                Array.isArray(rec?._foldersToMove) && rec._foldersToMove.length > 0
                  ? rec._foldersToMove
                  : [rec];
              const filesToMove = Array.isArray(rec?._filesToMove) ? rec._filesToMove : [];
              for (const folder of foldersToMove) {
                const folderId = extractId(folder?.id || folder);
                if (!folderId) continue;
                await apiReq(`folders:update?filterByTk=${folderId}`, "POST", {
                  ...folderCommonPayload,
                  ...(folderId === recId ? { parentId: safeTargetFolderId } : {}),
                });
              }
              for (const childFile of filesToMove) {
                const childFileId = extractId(childFile?.id || childFile);
                if (!childFileId) continue;
                await apiReq(`documents:update?filterByTk=${childFileId}`, "POST", {
                  ...commonPayload,
                });
              }
              updatedRecord = {
                ...rec,
                ...folderCommonPayload,
                parentId: safeTargetFolderId,
              };
            } else {
              const payload = {
                ...commonPayload,
                folderId: safeTargetFolderId,
              };
              await apiReq(`documents:update?filterByTk=${recId}`, "POST", payload);
              updatedRecord = { ...rec, ...payload };
            }
            updatedRecords.push(updatedRecord);

            const recAtt = getPrimaryAttachment(rec);
            const recName =
              rec?.title || rec?.name || recAtt?.title || recAtt?.filename ||
              (recIsFolder ? "Folder" : "Document");
            const recSourceLabel =
              getLegalStudySourceLabel(rec) ||
              sourceContext?.subTaskTitle ||
              sourceContext?.taskTitle ||
              "";
            await logActivity(
              recIsFolder ? "Folder" : "Document",
              recId,
              activityAction,
              config.relationField,
              recSourceLabel || null,
              `${targetLabel} - ${recName}`,
              changedBy,
              batchId,
              null,
              now,
            );
            if (sourceContext?.collectionName && sourceContext?.recordId) {
              await logActivity(
                initcap(sourceContext.collectionName),
                extractId(sourceContext.recordId),
                activityAction,
                recIsFolder ? "folders" : "documents",
                null,
                `${recName} -> ${targetLabel}`,
                changedBy,
                batchId,
                recId,
                now,
              );
            }
          }

          message.success(
            targetRecords.length > 1
              ? `Moved ${targetRecords.length} files to ${config.label}`
              : `Moved to ${config.label}`,
          );
          onSuccess?.(isBulk ? updatedRecords : updatedRecords[0]);
          onClose?.();
        } catch (e) {
          console.error(`Cannot move record(s) to ${config.label}`, e);
          message.error(`Cannot move to ${config.label}`);
        } finally {
          setSaving(false);
        }
      };

      return React.createElement(
        Modal,
        {
          open,
          title: isBulk
            ? `Move ${targetRecords.length} files to ${config.label}`
            : `Move to ${config.label}`,
          onCancel: saving ? undefined : onClose,
          width: 520,
          destroyOnClose: true,
          footer: [
            React.createElement(
              Button,
              { key: "cancel", onClick: onClose, disabled: saving },
              "Cancel",
            ),
            React.createElement(
              Button,
              {
                key: "submit",
                type: "primary",
                loading: saving,
                onClick: handleSubmit,
                disabled: !selectedRecordId || targetRecords.length === 0,
              },
              `Move to ${config.label}`,
            ),
          ],
        },
        React.createElement(
          "div",
          { style: { fontFamily: FONT, display: "flex", flexDirection: "column", gap: 14 } },
          isBulk
            ? React.createElement(
                "div",
                { style: { fontSize: 13, color: "#374151" } },
                React.createElement(
                  "div",
                  { style: { fontWeight: 700, marginBottom: 4 } },
                  `${targetRecords.length} files selected`,
                ),
                React.createElement(
                  "div",
                  {
                    style: {
                      color: "#6B7280",
                      maxHeight: 90,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    },
                  },
                  ...targetRecords.map((rec, idx) => {
                    const recAtt = getPrimaryAttachment(rec);
                    const recName =
                      rec?.title || rec?.name || recAtt?.title || recAtt?.filename || "Document";
                    return React.createElement("div", { key: idx }, `• ${recName}`);
                  }),
                ),
              )
            : React.createElement(
                "div",
                { style: { fontSize: 13, color: "#374151" } },
                React.createElement(
                  "div",
                  { style: { fontWeight: 700, marginBottom: 4 } },
                  primaryRecordName,
                ),
                sourceLabel &&
                  React.createElement("div", { style: { color: "#6B7280" } }, "Source: ", sourceLabel),
              ),
          // Category switch — only rendered when "Move to Library" bundles
          // more than one destination for this context (see
          // getLibraryMoveCategories). Switching resets the parent-record
          // and folder selections below since those are keyed off
          // destinationType in their own effects.
          availableDestinationTypes.length > 1 &&
            React.createElement(
              "div",
              null,
              React.createElement(
                "div",
                { style: { fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#374151" } },
                "Category",
              ),
              React.createElement(Segmented, {
                block: true,
                value: destinationType,
                onChange: (value) => setDestinationType(value),
                options: availableDestinationTypes.map((dt) => ({
                  value: dt,
                  label: getLibraryDestinationConfig(dt).label,
                })),
              }),
            ),
          !hasImplicitScope &&
            React.createElement(
              "div",
              null,
              React.createElement(
                "div",
                { style: { fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#374151" } },
                `Select ${config.label}`,
              ),
              React.createElement(Select, {
                value: selectedRecordId,
                loading,
                showSearch: true,
                optionFilterProp: "label",
                style: { width: "100%" },
                placeholder: `Select ${config.label} record...`,
                options: parentRecords.map((item) => ({
                  value: String(getLibraryRecordId(item, destinationType)),
                  label: getLibraryRecordDisplayName(item, destinationType),
                })),
                onChange: (value) => {
                  setSelectedRecordId(value || null);
                  setTargetFolderId("root");
                },
              }),
            ),
          React.createElement(
            "div",
            null,
            React.createElement(
              "div",
              { style: { fontSize: 12, fontWeight: 600, marginBottom: 6, color: "#374151" } },
              `Destination folder`,
            ),
            React.createElement(TreeSelect, {
              value: targetFolderId === "root" ? undefined : targetFolderId,
              treeData: folderTree,
              loading: loadingFolders,
              disabled: !selectedRecordId,
              allowClear: true,
              treeDefaultExpandAll: true,
              showSearch: true,
              // title is now a rendered icon+label element (folder icon), not
              // a plain string, so the default treeNodeFilterProp: "title"
              // string match no longer works — filter against searchText.
              filterTreeNode: (input, node) => {
                const searchText = node?.searchText || node?.props?.searchText || "";
                return normalizeLookupText(searchText).includes(normalizeLookupText(input));
              },
              style: { width: "100%" },
              dropdownStyle: { maxHeight: 360, overflow: "auto" },
              placeholder: `Root level (no subfolder)`,
              onChange: (value) => setTargetFolderId(value || "root"),
            }),
          ),
          React.createElement(
            "div",
            {
              style: {
                fontSize: 12,
                color: "#6B7280",
                background: "#F9FAFB",
                border: "1px solid #E5E7EB",
                borderRadius: 6,
                padding: "8px 10px",
              },
            },
            isBulk
              ? "Files remain traceable from Task Notes after this move."
              : `${primaryIsFolder ? "Folder and child documents" : "File"} remains traceable from Task Notes after this move.`,
          ),
        ),
      );
    };

    // The tree titles render an icon + label row (~22px tall); antd's default
    // fixed-height selection tag clips that row in half. Let the tag grow to
    // fit its content instead of a fixed line-height.
    const LIBRARY_TREESELECT_CSS = `
      .task-library-treeselect .ant-select-selector {
        height: auto !important;
        min-height: 40px;
        padding-top: 4px !important;
        padding-bottom: 4px !important;
      }
      .task-library-treeselect .ant-select-selection-overflow {
        align-items: center;
      }
      .task-library-treeselect .ant-select-selection-overflow-item {
        align-self: center;
      }
      .task-library-treeselect .ant-select-selection-item {
        height: auto;
        line-height: 1.5;
        align-items: center;
        padding-top: 2px;
        padding-bottom: 2px;
        margin-top: 2px;
        margin-bottom: 2px;
      }
      .task-library-treeselect .ant-select-selection-item-content {
        display: inline-flex;
        align-items: center;
      }
    `;

    const FileUploadModal = ({
      open,
      onClose,
      onSuccess,
      onAddPending,
      collectionName,
      recordId,
      currentUser,
      currentLawyerId,
      lawyers = [],
      editDoc = null,
      projectFolderId,
      caseId = null,
      taskId = null,
      subTaskId = null,
      isProjectInternalContext = false,
      projectInternalId = null,
    }) => {
      const [form] = Form.useForm();
      const [fileList, setFileList] = useState([]);
      const [uploading, setUploading] = useState(false);
      const isEdit = !!editDoc;
      // The comment-attachment flow (onAddPending) doesn't need the full
      // document metadata form — only the file itself and an optional type,
      // since the record's other fields can always be filled in later from the
      // Documents list.
      const isCompact = !!onAddPending;
      // Lưu lại title được auto-fill từ editDoc, để biết người dùng đã tự sửa
      // hay vẫn đang là tên file cũ.
      const initialEditTitleRef = useRef("");

      const [activeTab, setActiveTab] = useState("local");
      // One tree per picker tab ("internalDocs" / "library") so switching
      // tabs never refetches or rebuilds what's already loaded.
      const [libraryTrees, setLibraryTrees] = useState({});
      const [libraryLoadingTabs, setLibraryLoadingTabs] = useState({});
      const [libraryLoadedTabs, setLibraryLoadedTabs] = useState({});
      const [libraryExpandedKeys, setLibraryExpandedKeys] = useState([]);
      const [selectedLibDocs, setSelectedLibDocs] = useState([]);
      const { TreeSelect } = ctx.antd;
      const currentUserId = extractId(currentUser?.id);
      const safeCurrentLawyerId = extractId(currentLawyerId);
      const currentRoleSignature = [
        ...Array.from(getUserRoleNames(currentUser)).sort(),
        currentUser?.isAdmin === true ? "isAdmin" : "",
        currentUser?.isSuperAdmin === true ? "isSuperAdmin" : "",
      ]
        .filter(Boolean)
        .join("|");
      const resolvedLibraryCaseId =
        extractId(caseId) ||
        extractId(PROJECT_ID) ||
        extractId(ctx.record?.projectId) ||
        extractId(ctx.record?.caseId);
      const safeProjectInternalId = extractId(projectInternalId);
      const showInternalDocsTab = isProjectInternalContext && !!safeProjectInternalId;
      const isLibraryPickerTab = (tabKey) =>
        tabKey === "library" || (tabKey === "internalDocs" && showInternalDocsTab);
      const isPickingFromLibrary = isLibraryPickerTab(activeTab);
      const treeData = libraryTrees[activeTab] || [];
      const libraryLoading = !!libraryLoadingTabs[activeTab];

      // How each picker tab gets its data (cache key + scoped fetcher) and
      // turns it into a tree. Data is cached per window (see
      // loadTaskLibraryData); the tree is rebuilt per modal since it
      // depends on the current user's folder permissions.
      const getLibraryPickerMode = (tabKey) => {
        if (tabKey === "internalDocs" && showInternalDocsTab) {
          return {
            cacheKey: `pi:${safeProjectInternalId}:u${currentUserId || ""}`,
            fetcher: () => fetchProjectInternalLibraryData(safeProjectInternalId, currentUserId),
            build: (data) =>
              buildTaskProjectInternalLibraryTree({
                ...data,
                currentUser,
                currentLawyerId: safeCurrentLawyerId,
                currentProjectInternalId: safeProjectInternalId,
              }),
          };
        }
        if (tabKey !== "library") return null;
        if (isProjectInternalContext) {
          return {
            cacheKey: `ws:u${currentUserId || ""}`,
            fetcher: () => fetchWorkspaceLibraryData(currentUserId),
            build: (data) =>
              buildTaskWorkspaceLibraryTree({
                ...data,
                currentUser,
                currentLawyerId: safeCurrentLawyerId,
              }),
          };
        }
        return {
          cacheKey: `case:${resolvedLibraryCaseId || ""}:u${currentUserId || ""}`,
          fetcher: async () => {
            const [libraryData, caseReferences, legalReferences, legalStudies] =
              await Promise.all([
                fetchTaskLibraryData(currentUserId),
                fetchLibraryRelationRows(resolvedLibraryCaseId, "caseReferences"),
                fetchLibraryRelationRows(resolvedLibraryCaseId, "legalReference"),
                fetchLibraryRelationRows(resolvedLibraryCaseId, "legalStudy"),
              ]);
            return { ...libraryData, caseReferences, legalReferences, legalStudies };
          },
          build: (data) =>
            buildTaskLibraryTree({
              ...data,
              currentUser,
              currentLawyerId: safeCurrentLawyerId,
              currentCaseId: resolvedLibraryCaseId,
            }),
        };
      };

      const resetLibraryPickers = () => {
        setLibraryTrees({});
        setLibraryLoadingTabs({});
        setLibraryLoadedTabs({});
        setLibraryExpandedKeys([]);
        setSelectedLibDocs([]);
      };

      useEffect(() => {
        if (!open) return;
        resetLibraryPickers();
        if (isEdit && editDoc) {
          const initialTitle = editDoc.title || editDoc.name || "";
          initialEditTitleRef.current = initialTitle;
          form.setFieldsValue({
            documentType: editDoc.documentType || "",
            documentCode: editDoc.documentCode || "",
            title: initialTitle,
            openingDate: editDoc.openingDate
              ? editDoc.openingDate.slice(0, 10)
              : "",
            signedAt: editDoc.signedAt ? editDoc.signedAt.slice(0, 10) : "",
            effectiveAt: editDoc.effectiveAt
              ? editDoc.effectiveAt.slice(0, 10)
              : "",
            senderName: editDoc.senderName || "",
            recipientName: editDoc.recipientName || "",
            language: editDoc.language || "",
            docFormat: editDoc.docFormat || "",
            description: editDoc.description || "",
            googleDriveUrl: editDoc.googleDriveUrl || "",
            note: editDoc.note || "",
          });
          setFileList([]);
        } else {
          form.resetFields();
          setFileList([]);
          setActiveTab("local");
        }
      }, [open, editDoc]);

      useEffect(() => {
        if (!open) return;
        resetLibraryPickers();
      }, [
        open,
        currentUserId,
        safeCurrentLawyerId,
        currentRoleSignature,
        resolvedLibraryCaseId,
        safeProjectInternalId,
      ]);

      // Prefetch every picker tab's data as soon as the modal opens, so it's
      // usually already cached by the time the user clicks the tab.
      useEffect(() => {
        if (!open || !currentUserId) return;
        ["internalDocs", "library"].forEach((tabKey) => {
          const mode = getLibraryPickerMode(tabKey);
          if (mode) loadTaskLibraryData(mode.cacheKey, mode.fetcher).catch(() => {});
        });
      }, [open, currentUserId, resolvedLibraryCaseId, safeProjectInternalId, isProjectInternalContext]);

      useEffect(() => {
        if (!open || !isPickingFromLibrary || libraryLoadedTabs[activeTab]) return;
        const tabKey = activeTab;
        const mode = getLibraryPickerMode(tabKey);
        if (!mode) return;
        let cancelled = false;
        const setTree = (tree) =>
          setLibraryTrees((prev) => ({ ...prev, [tabKey]: tree }));
        const setTabLoading = (value) =>
          setLibraryLoadingTabs((prev) => ({ ...prev, [tabKey]: value }));

        // Cached data renders instantly; loadTaskLibraryData then either
        // returns that same (fresh) data or refetches a stale entry in the
        // background and the tree is swapped in place when it lands.
        const cached = peekTaskLibraryData(mode.cacheKey);
        if (cached) {
          try {
            setTree(mode.build(cached));
          } catch (e) {
            console.error("Cannot build document library", e);
          }
        } else {
          setTabLoading(true);
        }
        loadTaskLibraryData(mode.cacheKey, mode.fetcher)
          .then((data) => {
            if (cancelled || data === cached) return;
            setTree(mode.build(data));
          })
          .catch((e) => {
            console.error("Cannot load document library", e);
            if (!cancelled && !cached) setTree([]);
          })
          .finally(() => {
            if (cancelled) return;
            setTabLoading(false);
            setLibraryLoadedTabs((prev) => ({ ...prev, [tabKey]: true }));
          });
        return () => {
          cancelled = true;
        };
      }, [
        activeTab,
        open,
        libraryLoadedTabs,
        currentUserId,
        safeCurrentLawyerId,
        currentRoleSignature,
        resolvedLibraryCaseId,
        isProjectInternalContext,
        safeProjectInternalId,
      ]);

      const findTreeDoc = (nodes, val) => {
        for (const node of nodes || []) {
          if (node.value === val && node.docData) return node;
          const found = findTreeDoc(node.children, val);
          if (found) return found;
        }
        return null;
      };

      const toggleLibraryTreeNode = useCallback((nodeKey) => {
        const key = String(nodeKey || "");
        if (!key) return;
        setLibraryExpandedKeys((currentKeys) =>
          currentKeys.includes(key)
            ? currentKeys.filter((currentKey) => currentKey !== key)
            : [...currentKeys, key],
        );
      }, []);

      const interactiveLibraryTreeData = useMemo(() => {
        const decorateNodes = (nodes = []) =>
          nodes.map((node) => {
            const children = decorateNodes(node.children || []);
            const expandable = !node.isLeaf && children.length > 0;
            if (!expandable) return { ...node, children };

            const toggleNode = (event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleLibraryTreeNode(node.key || node.value);
            };

            return {
              ...node,
              children,
              title: React.createElement(
                "span",
                {
                  role: "button",
                  tabIndex: 0,
                  onMouseDown: (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  },
                  onClick: toggleNode,
                  onKeyDown: (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      toggleNode(event);
                    }
                  },
                  title: "Click to expand or collapse",
                  style: {
                    display: "inline-flex",
                    alignItems: "center",
                    width: "100%",
                    cursor: "pointer",
                  },
                },
                node.title,
              ),
            };
          });

        return decorateNodes(treeData);
      }, [treeData, toggleLibraryTreeNode]);

      const handleTreeSelect = (vals) => {
        const values = Array.isArray(vals) ? vals : vals ? [vals] : [];
        const found = values
          .map((val) => findTreeDoc(treeData, val))
          .filter((node) => node && node.docData);
        setSelectedLibDocs(found);
        // Auto-fill title only when a single file is selected — with multiple
        // files there's no single title that could apply to all of them.
        if (found.length === 1) {
          const currentTitle = form.getFieldValue("title");
          if (!currentTitle) {
            form.setFieldsValue({
              title:
                found[0].docData.title ||
                found[0].docData.name ||
                found[0].attData.filename,
            });
          }
        }
      };

      const handleClose = () => {
        form.resetFields();
        setFileList([]);
        resetLibraryPickers();
        onClose();
      };

      // Tab label with its full meaning kept in a native tooltip.
      const renderTabLabel = (text, tooltip) =>
        React.createElement("span", { title: tooltip, style: { whiteSpace: "nowrap" } }, text);

      // Shared body of the "Choose from ..." tabs. Only the active tab
      // renders its TreeSelect — treeData/selection belong to activeTab, so a
      // hidden pane would otherwise mirror the visible one's tree.
      const renderLibraryPicker = ({ tabKey, loadingText, placeholder, notFoundContent }) =>
        React.createElement(
          "div",
          { style: { padding: "8px 0" } },
          activeTab !== tabKey
            ? null
            : libraryLoading
              ? React.createElement(
                  "div",
                  { style: { textAlign: "center", padding: 20 } },
                  React.createElement(ctx.antd.Spin, { size: "small" }),
                  React.createElement(
                    "div",
                    { style: { marginTop: 8, fontSize: 12, color: "#8c8c8c" } },
                    loadingText,
                  ),
                )
              : React.createElement(
                  "div",
                  { className: "task-library-treeselect" },
                  React.createElement("style", null, LIBRARY_TREESELECT_CSS),
                  React.createElement(TreeSelect, {
                    style: { width: "100%" },
                    treeData: interactiveLibraryTreeData,
                    placeholder,
                    treeDefaultExpandAll: false,
                    treeExpandedKeys: libraryExpandedKeys,
                    onTreeExpand: (expandedKeys) =>
                      setLibraryExpandedKeys(
                        (expandedKeys || []).map((key) => String(key)),
                      ),
                    allowClear: true,
                    showSearch: true,
                    filterTreeNode: (input, node) => {
                      const searchText =
                        node?.searchText || node?.props?.searchText || "";
                      return normalizeLookupText(searchText).includes(
                        normalizeLookupText(input),
                      );
                    },
                    notFoundContent,
                    multiple: !isEdit,
                    onChange: handleTreeSelect,
                    value: !isEdit
                      ? selectedLibDocs.map((doc) => doc.value)
                      : selectedLibDocs[0]?.value,
                    listHeight: 500,
                    dropdownStyle: { maxHeight: 560, minWidth: 460, overflow: "auto" },
                    dropdownMatchSelectWidth: false,
                    popupMatchSelectWidth: false,
                  }),
                ),
        );

      const getSelectedUploadItems = () =>
        (fileList || [])
          .map((item) => ({ item, file: getUploadItemFile(item) }))
          .filter(({ file }) => !!file);

      // Existing (non-deleted) document titles already sitting in this
      // upload's target folder — used to auto-version a newly uploaded/
      // cloned file's name (e.g. "report.pdf" → "report (1).pdf") instead of
      // silently creating an indistinguishable duplicate. Task documents
      // have no separate "name" field (only `title`, which is what actually
      // ends up as the file's display name — see buildPayload's docTitle
      // usage below), so titles are what's compared. Skipped for folder-tree
      // uploads (activeTab === "folder") since those files land in
      // per-subfolder targetFolderIds only resolved later in
      // handleSubmitUpload, not here.
      const fetchExistingFileNames = async () => {
        // Checked against every (non-deleted) document already attached to
        // this task/subtask — not scoped to a specific folderId. Folder
        // scoping was fragile (a case/task with no folder tree yet uploads
        // with folderId=null, silently disabling the check — see prior
        // fix); comparing against the whole record's document list is both
        // simpler and matches what a user actually means by "duplicate
        // file name" here — one task, one flat list of attachments.
        const existing = await fetchFiles(collectionName, recordId);
        // Exclude the document being replaced itself — otherwise a plain
        // "replace this file" edit would collide with its own current title
        // and get needlessly version-suffixed.
        const editDocId = editDoc ? extractId(editDoc.id) : null;
        return new Set(
          existing
            .filter((doc) => !editDocId || extractId(doc.id) !== editDocId)
            .map((doc) => doc.title)
            .filter(Boolean)
            .map((t) => String(t).trim().toLowerCase()),
        );
      };

      const uploadSingleFile = async (item, usedNames) => {
        const file = getUploadItemFile(item);
        const relativePath = activeTab === "folder" ? getUploadRelativePath(item) : "";
        const pathParts = String(relativePath || file?.name || "")
          .split("/")
          .filter(Boolean);
        let fileName = pathParts[pathParts.length - 1] || file?.name || "File";
        if (usedNames) {
          fileName = getUniqueFileName(fileName, usedNames);
          usedNames.add(fileName.toLowerCase());
        }
        const attachment = await uploadTaskAttachment(file, fileName);
        return {
          attIds: [{ id: attachment.id }],
          fileName,
          relativePath,
          fileSize: file?.size || 0,
        };
      };

      const buildUploadEntries = async (values) => {
        const selectedItems = getSelectedUploadItems();
        const uploadGroupId = createTaskUploadBatchId(
          activeTab === "folder" ? "fld" : "mul",
        );
        const isSingle = selectedItems.length === 1;
        const usedNames =
          activeTab === "folder" ? null : await fetchExistingFileNames();
        const entries = [];
        for (const { item } of selectedItems) {
          const uploaded = await uploadSingleFile(item, usedNames);
          let docTitle =
            isSingle && values.title?.trim()
              ? values.title.trim()
              : uploaded.fileName;
          // uploaded.fileName already claimed its own spot in usedNames
          // above — only re-check when the custom title diverges from it.
          if (usedNames && docTitle.toLowerCase() !== uploaded.fileName.toLowerCase()) {
            docTitle = getUniqueFileName(docTitle, usedNames);
            usedNames.add(docTitle.toLowerCase());
          }
          entries.push({
            ...uploaded,
            uploadKind: activeTab === "folder" ? "folder" : "files",
            uploadGroupId,
            docTitle,
            metadata: values,
          });
        }
        return entries;
      };

      const uploadFile = async () => {
        const file = fileList[0].originFileObj;
        const formData = new window.FormData();
        formData.append("file", file, file.name);
        const uploadRes = await ctx.api.request({
          url: "attachments:create",
          method: "POST",
          params: { attachmentField: "documents.fileAttachment" },
          data: formData,
          // headers: { "Content-Type": "multipart/form-data" }, // Để trình duyệt tự set kèm boundary
        });
        const att = uploadRes?.data?.data;
        if (!att?.id) throw new Error("Upload failed");
        return [{ id: att.id }];
      };

      const cloneLibraryFile = async (attData) => {
        // Reference the existing attachment directly — no re-upload needed
        // This avoids FormData restrictions and is equally valid since the
        // document record created is independent from the library document record.
        if (!attData?.id) throw new Error("Original attachment not found");
        return [{ id: attData.id }];
      };

      const toISO = (val) => {
        if (!val) return null;
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d.toISOString();
      };

      const handleSubmit = async () => {
        try {
          await form.validateFields();
        } catch {
          return;
        }
        const values = form.getFieldsValue();
        const hasLocalFile = fileList.length > 0;
        const hasLibFile = selectedLibDocs.length > 0;
        const hasFile = activeTab === "local" ? hasLocalFile : hasLibFile;
        const hasDrive = !!values.googleDriveUrl?.trim();

        if (!isEdit && !hasFile && !hasDrive) {
          message.error("Please select a file or enter a Drive URL");
          return;
        }

        if (onAddPending) {
          setUploading(true);
          try {
            let attIds = null;
            let fileName = "Google Drive Link";
            if (activeTab === "local" && hasLocalFile) {
              attIds = await uploadFile();
              fileName = fileList[0].name;
            } else if (isPickingFromLibrary && hasLibFile) {
              attIds = await cloneLibraryFile(selectedLibDocs[0].attData);
              const attData = selectedLibDocs[0].attData;
              const ext = attData.extname
                ? attData.extname.startsWith(".")
                  ? attData.extname
                  : `.${attData.extname}`
                : "";
              fileName = attData.filename || `cloned_file${ext}`;
              if (ext && !fileName.toLowerCase().endsWith(ext.toLowerCase()))
                fileName += ext;
            }
            onAddPending({ attIds, fileName, metadata: values });
            handleClose();
          } catch (e) {
            message.error(`Upload error: ${e.message}`);
          } finally {
            setUploading(false);
          }
          return;
        }

        setUploading(true);
        try {
          let attIds = null;
          if (hasFile) {
            if (activeTab === "local") {
              attIds = await uploadFile();
            } else {
              attIds = await cloneLibraryFile(selectedLibDocs[0].attData);
            }
          }
          const now = new Date().toISOString();
          const payload = {
            documentType: values.documentType?.trim() || "",
            documentCode: values.documentCode?.trim() || "",
            title: values.title?.trim() || "",
            openingDate: toISO(values.openingDate),
            signedAt: toISO(values.signedAt),
            effectiveAt: toISO(values.effectiveAt),
            senderName: values.senderName?.trim() || "",
            recipientName: values.recipientName?.trim() || "",
            language: values.language?.trim() || "",
            docFormat: values.docFormat?.trim() || "",
            googleDriveUrl: values.googleDriveUrl?.trim() || "",
            description: values.description?.trim() || "", // 🌟 Bổ sung gửi data tóm tắt
            note: values.note?.trim() || "",
            updatedById: extractId(currentUser?.id) || null,
            updatedAt: now,
            folderId: extractId(projectFolderId),
            ...(attIds && { fileAttachment: attIds }),
          };

          if (isEdit) {
            await ctx.api.request({
              url: "documents:update",
              method: "POST",
              params: { filterByTk: editDoc.id },
              data: payload,
            });
            message.success("✅ Updated successfully!");
          } else {
            await apiReq("documents:create", "POST", {
              ...payload,
              ...buildTaskUploadDocumentLink(collectionName, recordId, {
                folderId: projectFolderId,
              }),
              createdById: currentUser?.id || null,
              createdAt: now,
              batchId: `upd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            });
            message.success("✅ Upload successful!");
          }
          invalidateTaskLibraryData();
          handleClose();
          if (onSuccess) onSuccess();
        } catch (e) {
          message.error("Error: " + (e?.message || "Please try again"));
        }
        setUploading(false);
      };

      const handleSubmitUpload = async () => {
        try {
          await form.validateFields();
        } catch {
          return;
        }
        const values = form.getFieldsValue();
        const hasSelectedUpload = fileList.length > 0;
        const hasLibFile = selectedLibDocs.length > 0;
        const hasUploadFile =
          activeTab === "local" || activeTab === "folder"
            ? hasSelectedUpload
            : hasLibFile;
        const hasDrive = !!values.googleDriveUrl?.trim();

        if (isEdit && activeTab === "folder" && hasSelectedUpload) {
          message.warning("Updating a document only supports replacing 1 file, folder upload is not supported.");
          return;
        }
        if (isEdit && activeTab === "local" && fileList.length > 1) {
          message.warning("Updating a document only supports replacing 1 file.");
          return;
        }
        if (isEdit && isPickingFromLibrary && selectedLibDocs.length > 1) {
          message.warning("Updating a document only supports replacing 1 file.");
          return;
        }
        if (!isEdit && !hasUploadFile && !hasDrive) {
          message.error("Please select a file or enter a Drive URL");
          return;
        }

        const buildLibraryEntries = async () => {
          const isSingle = selectedLibDocs.length === 1;
          const uploadGroupId = createTaskUploadBatchId("lib");
          const usedNames = await fetchExistingFileNames();
          const entries = [];
          for (const libDoc of selectedLibDocs) {
            const attIds = await cloneLibraryFile(libDoc.attData);
            const attData = libDoc.attData;
            const ext = attData.extname
              ? attData.extname.startsWith(".")
                ? attData.extname
                : `.${attData.extname}`
              : "";
            let fileName = attData.filename || `cloned_file${ext}`;
            if (ext && !fileName.toLowerCase().endsWith(ext.toLowerCase()))
              fileName += ext;
            const libDocTitle =
              libDoc.docData?.title || libDoc.docData?.name || fileName;
            let docTitle =
              isSingle && values.title?.trim() ? values.title.trim() : libDocTitle;
            docTitle = getUniqueFileName(docTitle, usedNames);
            usedNames.add(docTitle.toLowerCase());
            entries.push({
              attIds,
              fileName,
              docTitle,
              metadata: values,
              uploadKind: "library",
              uploadGroupId,
            });
          }
          return entries;
        };

        const buildDriveEntry = () => ({
          attIds: null,
          fileName: "Google Drive Link",
          docTitle: values.title?.trim() || "Google Drive Link",
          metadata: values,
          uploadKind: "drive",
          uploadGroupId: createTaskUploadBatchId("drv"),
        });

        const buildEntries = async () => {
          if ((activeTab === "local" || activeTab === "folder") && hasSelectedUpload) {
            return buildUploadEntries(values);
          }
          if (isPickingFromLibrary && hasLibFile) return buildLibraryEntries();
          if (hasDrive) return [buildDriveEntry()];
          return [];
        };

        setUploading(true);
        try {
          const uploadEntries = await buildEntries();
          if (onAddPending) {
            onAddPending(uploadEntries);
            handleClose();
            return;
          }

          const now = new Date().toISOString();
          const buildPayload = (entry, targetFolderId) => {
            const docTitle =
              entry?.docTitle || values.title?.trim() || entry?.fileName || "";
            return {
              title: docTitle,
              documentType: values.documentType?.trim() || "",
              documentCode: values.documentCode?.trim() || "",
              openingDate: toISO(values.openingDate),
              signedAt: toISO(values.signedAt),
              effectiveAt: toISO(values.effectiveAt),
              senderName: values.senderName?.trim() || "",
              recipientName: values.recipientName?.trim() || "",
              language: values.language?.trim() || "",
              docFormat: values.docFormat?.trim() || "",
              googleDriveUrl: values.googleDriveUrl?.trim() || "",
              description: values.description?.trim() || "",
              note: values.note?.trim() || "",
              updatedById: extractId(currentUser?.id) || null,
              updatedAt: now,
              uploadedById: extractId(currentUser?.id) || null,
              folderId: extractId(targetFolderId),
              // Internal Work tasks (projectInternalId set) store their
              // documents in the projectInternal space instead of the
              // Case space — matches ProjectDocument.js's own
              // moduleScope/storageType for that space.
              moduleScope: projectInternalId
                ? PROJECT_INTERNAL_MODULE_SCOPE
                : CASE_DOCUMENT_SCOPE,
              storageType: projectInternalId ? PROJECT_INTERNAL_MODULE_SCOPE : "cases",
              ...(projectInternalId ? { projectInternalId: extractId(projectInternalId) } : {}),
              ...(entry?.attIds && { fileAttachment: entry.attIds }),
            };
          };

          if (isEdit) {
            const entry = uploadEntries[0] || null;
            const payload = buildPayload(entry, projectFolderId);
            await ctx.api.request({
              url: "documents:update",
              method: "POST",
              params: { filterByTk: editDoc.id },
              data: payload,
            });
            message.success("Updated successfully!");
          } else {
            const batchId = createTaskUploadBatchId("upd");
            const folderIdMap = await createTaskUploadFoldersFromEntries(
              uploadEntries,
              projectFolderId,
              { currentUser, caseId, taskId, subTaskId, projectInternalId },
            );
            for (const entry of uploadEntries) {
              const relativeFolderPath = getRelativeFolderPath(entry.relativePath);
              const targetFolderId =
                folderIdMap[relativeFolderPath] || extractId(projectFolderId);
              await apiReq("documents:create", "POST", {
                ...buildPayload(entry, targetFolderId),
                ...buildTaskUploadDocumentLink(collectionName, recordId, {
                  folderId: targetFolderId,
                  projectInternalId,
                }),
                createdById: currentUser?.id || null,
                createdAt: now,
                batchId,
              });
            }
            message.success(
              uploadEntries.length > 1
                ? `Uploaded ${uploadEntries.length} files successfully!`
                : "Upload successful!",
            );
          }
          invalidateTaskLibraryData();
          handleClose();
          if (onSuccess) onSuccess();
        } catch (e) {
          message.error("Error: " + (e?.message || "Please try again"));
        } finally {
          setUploading(false);
        }
      };

      const inpStyle = { fontSize: 12, fontFamily: FONT };
      const documentTypeField = React.createElement(
        Form.Item,
        {
          name: "documentType",
          label: "Document type",
          rules: isCompact
            ? []
            : [{ required: true, message: "Please enter the document type" }],
        },
        React.createElement(
          "div",
          null,
          React.createElement(Input, {
            allowClear: true,
            maxLength: 150,
            placeholder: "e.g.: Contract, Minutes...",
            list: "doc-type-list",
            style: inpStyle,
          }),
          React.createElement(
            "datalist",
            { id: "doc-type-list" },
            ...DOC_TYPE_SUGGESTIONS.map((s) =>
              React.createElement("option", { key: s, value: s }),
            ),
          ),
        ),
      );
      const divider = (label) =>
        React.createElement(
          "div",
          {
            style: {
              fontSize: 12,
              color: "#8c8c8c",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              margin: "12px 0 8px",
              paddingBottom: 4,
              borderBottom: "1px solid #f0f0f0",
              fontFamily: FONT,
            },
          },
          label,
        );

      return React.createElement(
        Modal,
        {
          open,
          onCancel: handleClose,
          width: isCompact ? 680 : 1100,
          centered: true,
          title: React.createElement(
            Text,
            { strong: true, style: { fontFamily: FONT, fontSize: 14 } },
            isEdit ? "✏️ Update document" : "📎 Attach document",
          ),
          footer: [
            React.createElement(
              Button,
              {
                key: "c",
                onClick: handleClose,
                disabled: uploading,
                style: { fontFamily: FONT },
              },
              "Cancel",
            ),
            React.createElement(
              Button,
              {
                key: "s",
                type: "primary",
                onClick: handleSubmitUpload,
                loading: uploading,
                style: { fontFamily: FONT },
              },
              uploading
                ? isEdit
                  ? "Updating..."
                  : "Processing..."
                : isEdit
                  ? "Update"
                  : onAddPending
                    ? "Submit"
                    : "Upload",
            ),
          ],
        },
        currentUser &&
          !isCompact &&
          React.createElement(
            "div",
            {
              style: {
                background: "#f6ffed",
                border: "1px solid #b7eb8f",
                borderRadius: 6,
                padding: "6px 12px",
                marginBottom: 12,
                fontSize: 12,
                color: "#595959",
                fontFamily: FONT,
              },
            },
            `👤 ${isEdit ? "Updated" : "Attached"} by: `,
            React.createElement(
              "strong",
              null,
              userName(currentUser) || currentUser.email,
            ),
          ),
        React.createElement(
          Form,
          { form, layout: "vertical", size: "small", style: { fontFamily: FONT } },
          !isCompact && divider("Identification"),
          !isCompact &&
            React.createElement(
                "div",
                { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
                documentTypeField,
                React.createElement(
                  Form.Item,
                  { name: "title", label: "Document name" },
                  React.createElement(Input, {
                    allowClear: true,
                    placeholder:
                      "Enter the full document name (uses the file name if left blank)",
                    style: inpStyle,
                  }),
                ),
              ),
          !isCompact &&
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
              React.createElement(
                Form.Item,
                { name: "documentCode", label: "Reference number" },
                React.createElement(Input, {
                  allowClear: true,
                  placeholder: "e.g.: 123/2024/HĐ",
                  style: inpStyle,
                }),
              ),
              React.createElement(
                Form.Item,
                { name: "openingDate", label: "Issue date" },
                React.createElement(Input, {
                  type: "date",
                  style: { width: "100%", ...inpStyle },
                }),
              ),
            ),
          !isCompact &&
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
              React.createElement(
                Form.Item,
                { name: "signedAt", label: "Signed date" },
                React.createElement(Input, {
                  type: "date",
                  style: { width: "100%", ...inpStyle },
                }),
              ),
              React.createElement(
                Form.Item,
                { name: "effectiveAt", label: "Effective date" },
                React.createElement(Input, {
                  type: "date",
                  style: { width: "100%", ...inpStyle },
                }),
              ),
            ),
          !isCompact && divider("Related parties"),
          !isCompact &&
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } },
              React.createElement(
                Form.Item,
                { name: "senderName", label: "Sender" },
                React.createElement(Input, {
                  allowClear: true,
                  placeholder: "Name of sending person / organization",
                  style: inpStyle,
                }),
              ),
              React.createElement(
                Form.Item,
                { name: "recipientName", label: "Recipient" },
                React.createElement(Input, {
                  allowClear: true,
                  placeholder: "Name of receiving person / organization",
                  style: inpStyle,
                }),
              ),
            ),

          !isCompact &&
            React.createElement(
              Form.Item,
              { name: "description", label: "Content summary" },
              React.createElement(Input.TextArea, {
                rows: 3,
                allowClear: true,
                placeholder: "Briefly describe the main content...",
              }),
            ),
          divider("Attached file"),
          React.createElement(ctx.antd.Tabs, {
            // Short labels + tighter gutter so all tabs fit the modal width
            // without antd collapsing the last ones into a "..." overflow menu.
            size: "small",
            tabBarGutter: 16,
            activeKey: activeTab,
            onChange: (key) => {
              setActiveTab(key);
              setFileList([]);
              setSelectedLibDocs([]);
            },
            items: [
              {
                key: "local",
                label: renderTabLabel("Upload files", "Upload files from your computer"),
                children: React.createElement(
                  Form.Item,
                  {
                    label: isEdit ? "Replace with new file (optional)" : "Choose file",
                    style: { marginBottom: 0 },
                  },
                  React.createElement(
                    Dragger,
                    {
                      fileList,
                      beforeUpload: () => false,
                      multiple: !isEdit,
                      onChange: ({ fileList: fl }) => {
                        const nextList = isEdit ? fl.slice(-1) : fl;
                        setFileList(nextList);
                        if (isEdit && nextList.length > 0) {
                          const newFile = getUploadItemFile(nextList[0]);
                          const currentTitle = (form.getFieldValue("title") || "").trim();
                          // Chỉ auto-fill nếu title chưa bị người dùng sửa khác tên file cũ
                          if (
                            newFile?.name &&
                            (!currentTitle || currentTitle === initialEditTitleRef.current)
                          ) {
                            form.setFieldsValue({ title: newFile.name });
                          }
                        }
                      },
                      ...(isEdit ? { maxCount: 1 } : {}),
                      style: { padding: "6px 0" },
                    },
                    React.createElement(
                      "p",
                      { style: { fontSize: 20, margin: "0 0 4px" } },
                      "📁",
                    ),
                    React.createElement(
                      "p",
                      {
                        style: {
                          fontSize: 12,
                          color: "#595959",
                          margin: 0,
                          fontFamily: FONT,
                        },
                      },
                      "Drag & drop or ",
                      React.createElement(
                        "span",
                        { style: { color: "#1890ff" } },
                        "click to select",
                      ),
                    ),
                  ),
                ),
              },
              !isEdit && {
                key: "folder",
                label: renderTabLabel("Upload folder", "Upload a whole folder, keeping its structure"),
                children: React.createElement(
                  Form.Item,
                  {
                    label: "Choose folder",
                    style: { marginBottom: 0 },
                  },
                  React.createElement(
                    Dragger,
                    {
                      fileList,
                      beforeUpload: () => false,
                      multiple: true,
                      directory: true,
                      webkitdirectory: "true",
                      onChange: ({ fileList: fl }) => setFileList(fl),
                      style: { padding: "6px 0" },
                    },
                    React.createElement(
                      "p",
                      { style: { margin: "0 0 6px", color: "#185FA5" } },
                      TASK_FILE_ACTION_ICONS.folder,
                    ),
                    React.createElement(
                      "p",
                      {
                        style: {
                          fontSize: 12,
                          color: "#595959",
                          margin: 0,
                          fontFamily: FONT,
                        },
                      },
                      "Choose a folder to preserve the folder structure when rendered in Task Notes",
                    ),
                  ),
                ),
              },
              showInternalDocsTab && {
                key: "internalDocs",
                label: renderTabLabel("Internal Docs", "Choose from this Internal Work's documents"),
                children: renderLibraryPicker({
                  tabKey: "internalDocs",
                  loadingText: "Loading Internal Work documents...",
                  placeholder: "Search this Internal Work's documents...",
                  notFoundContent: "No accessible documents in this Internal Work",
                }),
              },
              {
                key: "library",
                label: isProjectInternalContext
                  ? renderTabLabel("Library", "Choose from Knowledge or My Documents")
                  : renderTabLabel("Case Docs", "Choose from this case, linked cases or reference material"),
                children: renderLibraryPicker({
                  tabKey: "library",
                  loadingText: "Loading library...",
                  placeholder: isProjectInternalContext
                    ? "Search Knowledge or My Documents..."
                    : "Search case, linked cases or references...",
                  notFoundContent: isProjectInternalContext
                    ? "No accessible Knowledge or My Documents files found"
                    : "No accessible documents found",
                }),
              },
            ].filter(Boolean),
          }),
          !isCompact &&
            React.createElement(
              Form.Item,
              { name: "googleDriveUrl", label: "Google Drive URL (optional)" },
              React.createElement(Input, {
                placeholder: "https://docs.google.com/...",
                allowClear: true,
                style: inpStyle,
              }),
            ),
          !isCompact && divider("Note"),
          !isCompact &&
            React.createElement(
              Form.Item,
              { name: "note", label: "Note" },
              React.createElement(Input.TextArea, {
                rows: 2,
                allowClear: true,
                placeholder: "Enter a note...",
                style: inpStyle,
              }),
            ),
        ),
      );
    };

    // ============================================================
    // §CASE — Case wrapper: bootstrap context (user / lawyers / root
    // folder / quyền) + header "Comments & Reports" giống hệt cột phải
    // của TaskDetailView (Search · List/Tree · Newest/Oldest · Reload).
    // ============================================================
    const CASE_RECORD_ID = extractId(ctx.record?.id);

    const CaseCommentsPanel = () => {
      const [lawyers, setLawyers] = useState([]);
      const [currentUser, setCurrentUser] = useState(null);
      const [projectFolderId, setProjectFolderId] = useState(null);
      const [canEdit, setCanEdit] = useState(true);
      const [loadingContext, setLoadingContext] = useState(true);
      const [commentSortOrder, setCommentSortOrder] = useState("newest");
      const [commentViewMode, setCommentViewMode] = useState("list");
      const [commentSearchText, setCommentSearchText] = useState("");
      const [commentCount, setCommentCount] = useState(0);
      const [cmtRefreshTrigger, setCmtRefreshTrigger] = useState(0);
      // UnifiedNoteThread đọc caseId từ taskContext để tạo folder upload
      // (projectId) và gắn caseId cho document — với Case thì đó chính là
      // record hiện tại. caseCode đi vào legalStudySource khi Move to Library.
      const taskContext = useMemo(
        () => ({ caseId: CASE_RECORD_ID, caseCode: ctx.record?.caseCode || "" }),
        [],
      );

      useEffect(() => {
        if (!CASE_RECORD_ID) {
          setLoadingContext(false);
          return;
        }
        const init = async () => {
          try {
            const [user, lawyerList, folders] = await Promise.all([
              getCurrentUser(),
              fetchAll("lawyers:list", "id,lawyerName,lawyerType,unitPrice,userId"),
              ctx.api
                .request({
                  url: "folders:list",
                  params: {
                    pageSize: 500,
                    appends: ["folderMember", "folderManager"],
                    filter: JSON.stringify({
                      projectId: { $eq: CASE_RECORD_ID },
                    }),
                  },
                })
                .then((res) => res?.data?.data || [])
                .catch(() => []),
            ]);
            setCurrentUser(user);
            setLawyers(lawyerList);
            const currentLawyer = lawyerList.find((l) => {
              const lawyerUserId = extractId(l.userId) || extractId(l.user);
              return extractId(user?.id) && lawyerUserId === extractId(user?.id);
            });
            if (folders.length > 0) {
              const rootFolder =
                folders.find((f) => f.type === CASE_COMMENT_CONFIG.ROOT_FOLDER_TYPE) ||
                folders[0];
              setProjectFolderId(rootFolder.id);
              const perms = getFolderPermissions(
                rootFolder,
                user,
                folders,
                extractId(currentLawyer?.id),
              );
              setCanEdit(
                isAdminUser(user) || perms.isManager || perms.isMember || perms.canEdit,
              );
            } else {
              setCanEdit(true);
            }
          } catch (e) {
            console.error("CaseComments: error booting context", e);
          }
          setLoadingContext(false);
        };
        init();
      }, []);

      if (!CASE_RECORD_ID)
        return React.createElement(
          Text,
          { type: "secondary", style: { padding: 16, display: "block", fontFamily: FONT } },
          "Case not found for this block.",
        );

      if (loadingContext)
        return React.createElement(
          "div",
          { style: { padding: 40, textAlign: "center" } },
          React.createElement(Spin),
        );

      return React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            height: CASE_COMMENT_CONFIG.PANEL_HEIGHT,
            minHeight: CASE_COMMENT_CONFIG.PANEL_MIN_HEIGHT,
            background: "#fff",
            border: "1px solid #f0f0f0",
            borderRadius: 8,
            overflow: "hidden",
            fontFamily: FONT,
          },
        },
        React.createElement(
          "div",
          {
            style: {
              padding: "12px 16px",
              borderBottom: "1px solid #f0f0f0",
              background: "#fafafa",
              fontSize: 14,
              fontWeight: 600,
              color: "#262626",
              flexShrink: 0,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "space-between",
              alignItems: "center",
            },
          },
          `Comments & Reports (${commentCount})`,
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
              },
            },
            React.createElement(Input, {
              size: "small",
              allowClear: true,
              placeholder: "Search comments...",
              style: { width: 160 },
              value: commentSearchText,
              onChange: (e) => setCommentSearchText(e.target.value),
            }),
            React.createElement(Segmented, {
              size: "small",
              value: commentViewMode,
              onChange: (value) => setCommentViewMode(value),
              options: [
                { label: "List", value: "list" },
                { label: "Tree", value: "tree" },
              ],
            }),
            React.createElement(Segmented, {
              size: "small",
              value: commentSortOrder,
              onChange: (value) => setCommentSortOrder(value),
              options: [
                { label: "Newest", value: "newest" },
                { label: "Oldest", value: "oldest" },
              ],
            }),
            React.createElement(ReloadButton, {
              onReload: () => setCmtRefreshTrigger((v) => v + 1),
              size: "small",
            }),
          ),
        ),
        React.createElement(
          "div",
          { style: { flex: 1, overflow: "hidden" } },
          React.createElement(UnifiedNoteThread, {
            collectionName: CASE_COMMENT_CONFIG.COLLECTION_NAME,
            recordId: CASE_RECORD_ID,
            currentUser,
            lawyers,
            canEdit,
            projectFolderId,
            refreshTrigger: cmtRefreshTrigger,
            caseId: CASE_RECORD_ID,
            taskContext,
            sortOrder: commentSortOrder,
            viewMode: commentViewMode,
            searchText: commentSearchText,
            onCountChange: setCommentCount,
          }),
        ),
      );
    };

    ctx.render(React.createElement(CaseCommentsPanel, null));
