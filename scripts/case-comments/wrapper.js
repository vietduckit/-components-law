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
