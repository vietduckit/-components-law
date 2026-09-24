-- ============================================================
-- ONE-TIME DIAGNOSTIC — not a migration, run directly against Postgres
-- (psql/pgAdmin) to find out who was actually BLOCKING the backfill
-- script, since it was cancelled via pgAdmin4's Cancel button (safe —
-- sends pg_cancel_backend(), does not corrupt shared memory), so the
-- cancel itself is very unlikely to be the direct cause of a later RAM
-- spike. The more likely story: the backfill was queued waiting on a lock
-- held by some OTHER session (very plausible right after a restore, or
-- left over from the diagnostic queries run earlier), and that lock
-- holder is still sitting there, now also blocking the live NocoBase
-- app's own queries against the same tables — which piles up app-side
-- connections/pending requests, not the cancelled backfill itself.
--
-- Read-only — makes no changes, EXCEPT the optional pg_terminate_backend()
-- calls at the very bottom, which are commented out — only run those after
-- reading the blocking-chain output first and confirming which pid(s) are
-- safe to terminate.
-- ============================================================

-- ---- 1. Right now: is anything actually blocked, and by whom? This is
-- ---- the single most important query — if this backfill is still blocked
-- ---- by something, this shows exactly what.
SELECT
  blocked.pid AS blocked_pid,
  blocked.usename AS blocked_user,
  now() - blocked.query_start AS blocked_for,
  LEFT(blocked.query, 150) AS blocked_query,
  blocking.pid AS blocking_pid,
  blocking.usename AS blocking_user,
  blocking.state AS blocking_state,
  now() - blocking.xact_start AS blocking_txn_age,
  LEFT(blocking.query, 150) AS blocking_last_query
FROM pg_locks blocked_locks
JOIN pg_stat_activity blocked ON blocked.pid = blocked_locks.pid
JOIN pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.pid <> blocked_locks.pid
JOIN pg_stat_activity blocking ON blocking.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted
  AND blocking_locks.granted;

-- ---- 2. All currently open sessions, oldest transaction first — look
-- ---- specifically for "idle in transaction" rows older than a few
-- ---- minutes (the classic post-restore leftover) and anything from
-- ---- pgAdmin/a migration tool that's still open.
SELECT
  pid,
  usename,
  application_name,
  state,
  now() - query_start AS running_for,
  now() - xact_start AS txn_age,
  LEFT(query, 150) AS query_preview
FROM pg_stat_activity
WHERE pid <> pg_backend_pid()
ORDER BY COALESCE(xact_start, query_start) ASC NULLS LAST;

-- ---- 3. Total connection count vs. max_connections — if the app's own
-- ---- connection pool piled up waiting behind the same lock, this shows
-- ---- how close to the ceiling things got (helps confirm/rule out
-- ---- connection-exhaustion as the actual RAM-pressure trigger).
SELECT
  (SELECT count(*) FROM pg_stat_activity) AS current_connections,
  (SELECT setting FROM pg_settings WHERE name = 'max_connections') AS max_connections,
  (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction') AS idle_in_transaction_count;

-- ---- If section 1 or 2 shows a stuck idle-in-transaction session (NOT
-- ---- one belonging to the live NocoBase app's normal traffic — check
-- ---- application_name/usename first), terminate it cleanly with Postgres's
-- ---- own safe function (equivalent to what pgAdmin's Cancel button does,
-- ---- just targeted at a specific pid instead of your own current query):
--
-- SELECT pg_terminate_backend(<pid_from_above>);
--
-- Never kill -9 the underlying OS process directly — that can force a
-- full crash-recovery restart of the whole Postgres instance, which is a
-- far more likely cause of a sudden RAM/CPU spike than anything above.
