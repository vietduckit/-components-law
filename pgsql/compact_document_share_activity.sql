-- Optional maintenance script:
-- Merge duplicated shared_file / unshared_file activity rows that were created
-- before grouped documentShares logging was introduced.
--
-- Grouping rule: same collection, record, action, field, actor, dataId,
-- and same batchId when present; old rows without batchId are grouped by minute.
-- Review the SELECT first before running the UPDATE/DELETE section in production.

WITH grouped AS (
    SELECT
        "collectionName",
        "recordId",
        action,
        "fieldName",
        COALESCE("changedByName", '') AS actor_name,
        COALESCE("dataId", 0) AS data_id,
        CASE
            WHEN COALESCE("batchId", '') <> '' THEN 'batch:' || "batchId"
            ELSE 'minute:' || date_trunc('minute', "changedAt")::TEXT
        END AS group_key,
        (array_agg(id ORDER BY "changedAt" DESC, id DESC))[1] AS keep_id,
        array_remove((array_agg(id ORDER BY "changedAt" DESC, id DESC))[2:array_length(array_agg(id), 1)], NULL) AS delete_ids,
        string_agg(DISTINCT NULLIF("newValue", ''), '; ' ORDER BY NULLIF("newValue", '')) AS merged_value,
        max("changedAt") AS latest_changed_at,
        count(*) AS row_count
    FROM public.activity_log
    WHERE action IN ('shared_file', 'unshared_file')
      AND "fieldName" IN ('userId', 'documents')
    GROUP BY
        "collectionName",
        "recordId",
        action,
        "fieldName",
        COALESCE("changedByName", ''),
        COALESCE("dataId", 0),
        CASE
            WHEN COALESCE("batchId", '') <> '' THEN 'batch:' || "batchId"
            ELSE 'minute:' || date_trunc('minute', "changedAt")::TEXT
        END
    HAVING count(*) > 1
),
updated AS (
    UPDATE public.activity_log a
    SET
        "newValue" = grouped.merged_value,
        "oldValue" = CASE
            WHEN a.action = 'unshared_file' THEN grouped.merged_value
            ELSE a."oldValue"
        END,
        "changedAt" = grouped.latest_changed_at
    FROM grouped
    WHERE a.id = grouped.keep_id
    RETURNING grouped.delete_ids
)
DELETE FROM public.activity_log a
USING updated
WHERE a.id = ANY(updated.delete_ids);
