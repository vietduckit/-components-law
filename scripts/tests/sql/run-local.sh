#!/usr/bin/env bash
# Runs self-checking SQL tests (pgsql/tests/*_test.sql) on a throwaway local
# Postgres: initdb -> fixture schema -> the payment SQL files -> the tests.
# Nothing touches a real database. The same test files are meant to be run on
# the dev database too (psql -f), where the real schema is the judge.
#
#   bash scripts/tests/sql/run-local.sh pgsql/tests/finance_foundation_test.sql
#
# Env: PGBIN (Postgres bin dir), SQL_TEST_TMP (parent dir for the cluster),
#      PGPORT_LOCAL (port, default 55439).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PGBIN="${PGBIN:-/c/Program Files/PostgreSQL/16/bin}"
PORT="${PGPORT_LOCAL:-55439}"
DATA="$(mktemp -d "${SQL_TEST_TMP:-${TMPDIR:-/tmp}}/pgtest.XXXXXX")"
cleanup() {
  "$PGBIN/pg_ctl" -D "$DATA" stop -m immediate >/dev/null 2>&1 || true
  rm -rf "$DATA"
}
trap cleanup EXIT

"$PGBIN/initdb" -D "$DATA" -U postgres -A trust -E UTF8 >/dev/null
"$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT" -l "$DATA/server.log" -w start >/dev/null

PSQL=("$PGBIN/psql" -X -q -v ON_ERROR_STOP=1 -h localhost -p "$PORT" -U postgres -d postgres)
# setup files: warnings and errors only (their DROP ... IF EXISTS notices are noise)
PGOPTIONS="-c client_min_messages=warning" "${PSQL[@]}" -f "$ROOT/pgsql/tests/fixtures/finance_min_schema.sql"
# contract_billing_plans_trigger.sql: on dev it nulls nextBillingDate of any
# plan inserted without startDate — test plans must look like real ones.
for f in contract_billing_plans_trigger.sql \
         contract_payment_status_workflow.sql by_case_payment_request_automation.sql \
         unified_contract_payment_schedule.sql finance_foundation.sql finance_billing_rules.sql \
         retainer_billing_run_due.sql finance_retainer_schedule.sql finance_members.sql finance_notifications.sql \
         money_flow_foundation.sql money_flow_trail.sql service_thread_sync.sql currency_catalog.sql; do
  if [ -f "$ROOT/pgsql/$f" ]; then PGOPTIONS="-c client_min_messages=warning" "${PSQL[@]}" -f "$ROOT/pgsql/$f"; fi
done
for t in "$@"; do
  echo "== $t"
  "${PSQL[@]}" -f "$ROOT/$t"
done
