#!/usr/bin/env bash
# ============================================================
# Contract & Case Payment Status Workflow — one-command deploy
# See docs/superpowers/specs/2026-09-05-contract-payment-status-workflow-design.md
#
# Runs both halves of the deploy against a target environment:
#   1. pgsql/contract_payment_status_workflow.sql  (schema + triggers)
#   2. Nocobase field registration for the 3 columns that migration adds
#      (paymentStatus x2, outStandingAmount) — done here via curl instead
#      of pasting JsField/RegisterContractPaymentStatusFields.js into a
#      browser console, so the whole deploy is one command.
#
# Idempotent end to end: safe to re-run against a database/instance that
# already has some or all of this applied (see the .sql file's own
# idempotency, and the "skip if field already exists" check below).
#
# Configure via environment variables (defaults match this local dev
# environment) — override every one of them for a different environment:
#   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
#   NOCOBASE_URL, NOCOBASE_EMAIL, NOCOBASE_PASSWORD
#
# Usage:
#   ./pgsql/deploy-contract-payment-status.sh
#   PGHOST=otherhost NOCOBASE_URL=http://otherhost:13000 \
#     NOCOBASE_EMAIL=admin@x.com NOCOBASE_PASSWORD=xxx \
#     ./pgsql/deploy-contract-payment-status.sh
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/contract_payment_status_workflow.sql"

: "${PGHOST:=localhost}"
: "${PGPORT:=5432}"
: "${PGUSER:=postgres}"
: "${PGPASSWORD:=***REMOVED***}"
: "${PGDATABASE:=nocobase-law}"
: "${NOCOBASE_URL:=http://localhost:13000}"
: "${NOCOBASE_EMAIL:?Set NOCOBASE_EMAIL to an admin account's email}"
: "${NOCOBASE_PASSWORD:?Set NOCOBASE_PASSWORD to that account's password}"

export PGPASSWORD

echo "== 1/2: Applying SQL migration ($SQL_FILE) to $PGDATABASE@$PGHOST:$PGPORT =="
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v ON_ERROR_STOP=1 -f "$SQL_FILE"
echo "== SQL migration applied =="
echo

echo "== 2/2: Registering Nocobase fields on $NOCOBASE_URL =="

TOKEN=$(curl -sf -X POST "$NOCOBASE_URL/api/auth:signIn" \
  -H "Content-Type: application/json" \
  -H "X-Authenticator: basic" \
  -d "{\"email\":\"$NOCOBASE_EMAIL\",\"password\":\"$NOCOBASE_PASSWORD\"}" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);if(!j.data||!j.data.token){console.error('Login failed: '+d);process.exit(1);}console.log(j.data.token);});")

if [ -z "$TOKEN" ]; then
  echo "Failed to authenticate against Nocobase — check NOCOBASE_URL/EMAIL/PASSWORD." >&2
  exit 1
fi

# register_field <collection> <field_name> <field_json_file>
#
# field_name is passed explicitly (not read back out of field_json_file)
# to avoid a real cross-environment path bug hit while testing this
# script: a bash-created temp dir (mktemp -d, a POSIX-style path under
# Git Bash/MSYS) does not reliably resolve when handed to node.exe (a
# native Windows binary) as a file path argument — MSYS's argv path
# translation doesn't consistently follow the path once it's embedded
# inside a larger `node -e` source string. All temp files this script
# writes therefore live under $SCRIPT_DIR (already proven to resolve
# correctly for both bash and node, since SQL_FILE above uses the same
# base path) instead of a separate mktemp'd directory.
register_field() {
  local collection="$1"
  local field_name="$2"
  local field_json_file="$3"

  local already
  already=$(curl -sf "$NOCOBASE_URL/api/collections/$collection/fields:list?paginate=false" \
    -H "Authorization: Bearer $TOKEN" \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log((j.data||[]).some(f=>f.name==='$field_name'));});")

  if [ "$already" = "true" ]; then
    echo "[skip] $collection.$field_name already registered"
    return 0
  fi

  curl -sf -X POST "$NOCOBASE_URL/api/collections/$collection/fields:create" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json; charset=utf-8" \
    --data-binary "@$field_json_file" > /dev/null
  echo "[created] $collection.$field_name"
}

TMP_DIR="$SCRIPT_DIR/.deploy-tmp-$$"
mkdir -p "$TMP_DIR"
trap 'rm -rf "$TMP_DIR"' EXIT

cat > "$TMP_DIR/payment_status.json" <<'EOF'
{
  "name": "paymentStatus",
  "type": "string",
  "interface": "select",
  "uiSchema": {
    "type": "string",
    "x-component": "Select",
    "enum": [
      { "__DO_NOT_USE_THIS_PROPERTY_index__": 0, "value": "unpaid", "label": "Unpaid", "color": "volcano" },
      { "__DO_NOT_USE_THIS_PROPERTY_index__": 1, "value": "partial", "label": "Partial", "color": "gold" },
      { "__DO_NOT_USE_THIS_PROPERTY_index__": 2, "value": "paid", "label": "Paid", "color": "green" }
    ],
    "title": "Payment Status"
  },
  "defaultValue": "unpaid"
}
EOF

cat > "$TMP_DIR/outstanding_amount.json" <<'EOF'
{
  "name": "outStandingAmount",
  "type": "double",
  "interface": "number",
  "uiSchema": {
    "type": "number",
    "x-component": "InputNumber",
    "x-component-props": { "stringMode": true, "step": "1" },
    "title": "Outstanding Amount"
  },
  "defaultValue": 0
}
EOF

register_field "contracts" "paymentStatus" "$TMP_DIR/payment_status.json"
register_field "projects" "paymentStatus" "$TMP_DIR/payment_status.json"
register_field "contracts" "outStandingAmount" "$TMP_DIR/outstanding_amount.json"

echo
echo "== Deploy complete =="
echo "Remaining manual step (UI designer, not scriptable — see spec §7/plan Task 7 Step 4):"
echo "  - Set the \"All Outstanding Cases\" view's filter to: status = done AND paymentStatus != paid"
echo "  - Add paymentStatus as a visible column on the Case Dashboard/Detail block(s)"
