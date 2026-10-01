-- ============================================================
-- Service thread backfill (writes). Review
-- pgsql/service_thread_backfill_preview.sql first. Requires
-- pgsql/service_thread_sync.sql.
-- ============================================================
BEGIN;
-- auto_create_tasks_from_template is registered twice on projectServices;
-- trigger_auto_create_tasks (INSERT and UPDATE) covers what
-- trg_auto_create_tasks (INSERT) does
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger
             WHERE tgname = 'trigger_auto_create_tasks' AND tgrelid = '"projectServices"'::regclass) THEN
    DROP TRIGGER IF EXISTS trg_auto_create_tasks ON "projectServices";
  END IF;
END $$;
SELECT step, table_name, record_id, detail FROM service_thread_backfill_run();
COMMIT;
