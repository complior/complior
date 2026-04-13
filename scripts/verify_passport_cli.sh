#!/usr/bin/env bash
# V1-M11: Command Restructuring — Passport CLI Acceptance Script
# Verifies: `complior passport` replaces `complior agent`, `complior fix --doc` works
# Requires: complior binary in PATH, engine running or auto-launched
# FAIL until rust-dev implements T-5 + T-6

set -euo pipefail

PASS=0
FAIL=0
TOTAL=10

check() {
  local desc="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "  ✅ $desc"
    ((PASS++))
  else
    echo "  ❌ $desc"
    ((FAIL++))
  fi
}

echo "=== V1-M11: Command Restructuring Acceptance ==="
echo ""

# --- T-5: complior passport (renamed from agent) ---
echo "T-5: complior passport subcommands"

check "complior passport init exits 0" \
  complior passport init --json

check "complior passport list returns JSON array" \
  bash -c "complior passport list --json 2>/dev/null | jq -e 'type == \"array\"'"

PASSPORT_NAME=$(complior passport list --json 2>/dev/null | jq -r '.[0].name // "unknown"')

check "complior passport show returns passport" \
  bash -c "complior passport show '$PASSPORT_NAME' --json 2>/dev/null | jq -e '.display_name'"

check "complior passport validate returns result" \
  bash -c "complior passport validate '$PASSPORT_NAME' --json 2>/dev/null | jq -e '.valid'"

check "complior passport completeness returns number" \
  bash -c "complior passport completeness '$PASSPORT_NAME' --json 2>/dev/null | jq -e '.completeness | type == \"number\"'"

check "complior passport evidence returns chain" \
  bash -c "complior passport evidence --json 2>/dev/null | jq -e '.entries'"

# --- T-6: complior fix --doc (new flag) ---
echo ""
echo "T-6: complior fix --doc subcommands"

check "complior fix --doc fria generates FRIA" \
  bash -c "complior fix --doc fria '$PASSPORT_NAME' --json 2>/dev/null | jq -e '.markdown'"

check "complior fix --doc notify generates notification" \
  bash -c "complior fix --doc notify '$PASSPORT_NAME' --company 'Test Corp' --json 2>/dev/null | jq -e '.markdown'"

# --- Backward compat: old `complior agent` should warn ---
echo ""
echo "Backward compat"

check "complior agent gives error or redirect" \
  bash -c "! complior agent list --json 2>/dev/null"

check "complior passport --help shows subcommands" \
  complior passport --help

echo ""
echo "=== Results: $PASS/$TOTAL passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
