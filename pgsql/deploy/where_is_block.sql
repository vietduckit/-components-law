-- ============================================================
-- READ-ONLY. Where does a JS block live? Walks each uid below up its parent
-- chain (flowModels.options.parentId) to the page route.
-- Edit the uid list, run, read top to bottom per uid:
--   the Add new / table / popup levels + collection, then the page and tab.
-- ============================================================
WITH RECURSIVE up AS (
  SELECT uid AS block, uid, options, 0 AS depth
  FROM "flowModels"
  WHERE uid IN ('tz4obeojszg', 'uyqjs498p4z')
  UNION ALL
  SELECT up.block, f.uid, f.options, up.depth + 1
  FROM "flowModels" f JOIN up ON f.uid = up.options->>'parentId'
)
SELECT up.block, up.depth, up.uid, up.options->>'use' AS model,
       up.options #>> '{stepParams,resourceSettings,init,collectionName}' AS collection,
       tab.title AS tab_title, page.title AS page_title
FROM up
LEFT JOIN "desktopRoutes" tab ON tab."schemaUid" = up.uid
LEFT JOIN "desktopRoutes" page ON page.id = tab."parentId"
ORDER BY up.block, up.depth;
