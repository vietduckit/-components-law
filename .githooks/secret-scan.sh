#!/usr/bin/env bash
# ============================================================
# secret-scan.sh — shared by the pre-commit and pre-push hooks.
#
# Reads a unified diff on stdin and fails (exit 1) if any ADDED line looks
# like a credential: hardcoded passwords/secrets/tokens, DB connection
# strings with a password, private keys, JWTs, cloud/API keys, or a
# password known to have leaked from this repo before.
#
# False positive? Put `secret-scan:allow` in a comment on that same line.
# Emergency bypass (not recommended): git commit/push --no-verify
# ============================================================

# Exact strings that must never be committed (e.g. passwords that already
# leaked once) live in .git/secret-denylist, one per line — inside .git/ so
# the list itself is never committed/pushed. Lines starting with # ignored.
DENY_FILE="$(git rev-parse --git-dir)/secret-denylist"
DENY=""
if [ -f "$DENY_FILE" ]; then
  DENY=$(grep -v -E '^\s*(#|$)' "$DENY_FILE" | tr -d '\r' \
    | sed 's/[][\.*^$(){}?+|/]/\\&/g' | paste -sd '|' -)
fi

PATTERNS=(
  'PGPASSWORD[:]?=[^$ "]' # secret-scan:allow
  '\$\{PGPASSWORD:=[^}]' # secret-scan:allow
  '(password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)["'"'"']?[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"'$<{ ]{6,}["'"'"']' # secret-scan:allow
  '(postgres|postgresql|mysql|mongodb(\+srv)?|redis|amqp)://[^/[:space:]:@]+:[^@[:space:]$<{]+@' # secret-scan:allow
  '-----BEGIN [A-Z ]*PRIVATE KEY-----' # secret-scan:allow
  'eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}' # secret-scan:allow
  'ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}' # secret-scan:allow
  'sk-ant-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{32,}' # secret-scan:allow
  'AKIA[0-9A-Z]{16}' # secret-scan:allow
  'AIza[0-9A-Za-z_-]{35}' # secret-scan:allow
  'xox[baprs]-[A-Za-z0-9-]{10,}' # secret-scan:allow
  'Bearer [A-Za-z0-9._-]{30,}' # secret-scan:allow
)

# Placeholders / test fixtures that match the generic rules but are fine.
# ***REMOVED*** is what the 2026-09-24 history purge left where leaked
# passwords used to be.
ALLOW='secret-scan:allow|\*\*\*REMOVED\*\*\*|secret123|process\.env|<[a-z-]*(password|token|secret)[a-z-]*>|["'"'"']x{3,}["'"'"']|your[_-]?(password|token|secret)'

[ -n "$DENY" ] && PATTERNS+=("$DENY")
joined=$(IFS='|'; echo "${PATTERNS[*]}")

hits=$(
  awk '
    /^\+\+\+ /   { sub(/^\+\+\+ (b\/)?/, ""); file = $0; next }
    /^\+/        { print file ": " substr($0, 2) }
  ' | grep -E -i -- "$joined" | grep -E -v -i -- "$ALLOW"
)

if [ -n "$hits" ]; then
  echo "" >&2
  echo "✖ secret-scan: possible credentials in $1 — blocked." >&2
  echo "$hits" | cut -c1-200 | sed 's/^/    /' >&2
  echo "" >&2
  echo "  Move the value to an environment variable / .env (gitignored)." >&2
  echo "  False positive? add 'secret-scan:allow' in a comment on that line." >&2
  exit 1
fi
exit 0
