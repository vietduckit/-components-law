#!/usr/bin/env bash
# ============================================================
# Case -> Folder permission sync — one-command deploy
#
# Runs both halves against a target environment:
#   1. pgsql/case_folder_permission_sync.sql (schema + triggers + backfill)
#   2. Nocobase field registration for folderManagers.sourceCaseId (the one
#      new column this feature adds — folderMembers.sourceCaseId/
#      sourceLinkId were already registered by an earlier feature)
#
# Same pattern as deploy-contract-payment-status.sh — see that file for the
# reasoning (one idempotent command instead of psql + paste-into-console).
#
# Configure via environment variables (defaults match this local dev
# environment):
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
#   NOCOBASE_URL, NOCOBASE_EMAIL, NOCOBASE_PASSWORD
#
# Usage:
#   NOCOBASE_EMAIL=admin@x.com NOCOBASE_PASSWORD=xxx \
#     ./pgsql/deploy-case-folder-permission-sync.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/case_folder_permission_sync.sql"

: "${PGHOST:=localhost}"
: "${PGPORT:=5432}"
: "${PGUSER:=postgres}"
: "${PGPASSWORD:?Set PGPASSWORD to the Postgres password (never hardcode it here)}"
: "${PGDATABASE:=nocobase-law}"
: "${NOCOBASE_URL:=http://localhost:13000}"
: "${NOCOBASE_EMAIL:?Set NOCOBASE_EMAIL to an admin account's email}"
: "${NOCOBASE_PASSWORD:?Set NOCOBASE_PASSWORD to that account's password}"

export PGPASSWORD

echo "== 1/2: Applying SQL migration ($SQL_FILE) to $PGDATABASE@$PGHOST:$PGPORT =="
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
echo "== SQL migration applied =="
echo

echo "== 2/2: Registering Nocobase field on $NOCOBASE_URL =="

TOKEN=$(curl -sf -X POST "$NOCOBASE_URL/api/auth:signIn" \
  -H "Content-Type: application/json" \
  -H "X-Authenticator: basic" \
  -d "{\"email\":\"$NOCOBASE_EMAIL\",\"password\":\"$NOCOBASE_PASSWORD\"}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);if(!j.data||!j.data.token){console.error('Login failed: '+d);process.exit(1);}console.log(j.data.token);});")

if [ -z "$TOKEN" ]; then
  echo "Failed to authenticate against Nocobase — check NOCOBASE_URL/EMAIL/PASSWORD." >&2
  exit 1
fi

# Temp files live under this script's own directory (not mktemp -d) —
# a bash-created POSIX-style temp path doesn't reliably resolve when
# handed to node.exe as a file argument on Git Bash/MSYS + native Windows
# node, a real bug hit deploying the payment-status feature's script.
TMP_DIR="$SCRIPT_DIR/.deploy-tmp-$$"
mkdir -p "$TMP_DIR"
trap 'rm -rf "$TMP_DIR"' EXIT

cat > "$TMP_DIR/folder_managers_source_case_id.json" <<'EOF'
{
  "name": "sourceCaseId",
  "type": "bigInt",
  "interface": "integer",
  "uiSchema": {
    "type": "number",
    "x-component": "InputNumber",
    "x-component-props": { "stringMode": true, "step": "1" },
    "x-validator": "integer",
    "title": "sourceCaseId"
  },
  "defaultValue": null
}
EOF

already=$(curl -sf "$NOCOBASE_URL/api/collections/folderManagers/fields:list?paginate=false" \
  -H "Authorization: Bearer $TOKEN" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log((j.data||[]).some(f=>f.name==='sourceCaseId'));});")

if [ "$already" = "true" ]; then
  echo "[skip] folderManagers.sourceCaseId already registered"
else
  curl -sf -X POST "$NOCOBASE_URL/api/collections/folderManagers/fields:create" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json; charset=utf-8" \
    --data-binary "@$TMP_DIR/folder_managers_source_case_id.json" > /dev/null
  echo "[created] folderManagers.sourceCaseId"
fi

echo
echo "== Deploy complete =="
