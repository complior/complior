#!/usr/bin/env bash
# =============================================================================
# verify_passport_cli.sh — V1-M11: Passport CLI acceptance test
#
# Tests: complior passport replaces complior agent (T-5),
#        complior fix --doc generates documents (T-6).
# Exit 0 = PASS, Exit 1 = FAIL
# RED until rust-dev implements T-5 + T-6 on the Rust CLI side.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPLIOR="$PROJECT_ROOT/target/release/complior"
TEST_PROJECT="${COMPLIOR_TEST_PROJECT:-/home/openclaw/test-projects/eval-target}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
PASS=0
FAIL=0

pass() { ((PASS++)) || true; echo -e "  ${GREEN}✓${NC} $1"; }
fail() { ((FAIL++)) || true; echo -e "  ${RED}✗${NC} $1"; }
info() { echo -e "  ${YELLOW}→${NC} $1"; }

# Helper: run CLI command and capture ONLY stdout (stderr goes to /dev/null)
run_json() { "$COMPLIOR" "$@" 2>/dev/null || true; }

echo "═══════════════════════════════════════════════════"
echo " V1-M11: Complior Passport CLI Test"
echo "═══════════════════════════════════════════════════"
echo ""

if [[ ! -x "$COMPLIOR" ]]; then
  echo "Binary not found: $COMPLIOR. Run: cargo build --release"
  exit 1
fi

# Kill lingering engines and clean state
pkill -f "tsx.*server.ts" 2>/dev/null || true
sleep 2
rm -rf "$TEST_PROJECT/.complior"

# ── T-5: complior passport (renamed from agent) ────────────────────────────
echo "T-5: complior passport subcommands"
echo ""

# Test 1: passport init
echo "Test 1: passport init"
$COMPLIOR init --yes "$TEST_PROJECT" >/dev/null 2>&1 || true
if [[ -d "$TEST_PROJECT/.complior/agents" ]]; then
  pass "init created .complior/agents/"
else
  fail "init did not create agents directory"
fi

# Test 2: passport list
echo ""
echo "Test 2: passport list"
LIST_OUT=$(run_json passport list --json "$TEST_PROJECT")
PASSPORT_COUNT=$(echo "$LIST_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if isinstance(data, list):
        print(len(data))
    elif isinstance(data, dict) and 'agents' in data:
        print(len(data['agents']))
    else:
        print(0)
except:
    print(0)
" 2>/dev/null || echo "0")

if [[ "$PASSPORT_COUNT" -gt 0 ]]; then
  pass "passport list found $PASSPORT_COUNT passport(s)"
else
  fail "passport list returned 0 passports"
fi

# Get first passport name for subsequent tests
PASSPORT_NAME=$(echo "$LIST_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    passports = data if isinstance(data, list) else data.get('agents', [])
    print(passports[0].get('name', '') if passports else '')
except:
    print('')
" 2>/dev/null || echo "")

if [[ -z "$PASSPORT_NAME" ]]; then
  # Try reading from manifest file directly
  FIRST_MANIFEST=$(ls "$TEST_PROJECT/.complior/agents/"*-manifest.json 2>/dev/null | head -1 || true)
  if [[ -n "$FIRST_MANIFEST" ]]; then
    PASSPORT_NAME=$(python3 -c "import json; print(json.load(open('$FIRST_MANIFEST')).get('name',''))" 2>/dev/null || echo "")
  fi
fi

if [[ -z "$PASSPORT_NAME" ]]; then
  fail "Could not determine passport name — stopping"
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
  echo "═══════════════════════════════════════════════════"
  exit 1
fi
info "Using passport: $PASSPORT_NAME"

# Test 3: passport show
echo ""
echo "Test 3: passport show"
SHOW_OUT=$(run_json passport show "$PASSPORT_NAME" --json "$TEST_PROJECT")
HAS_NAME=$(echo "$SHOW_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('yes' if data.get('name') else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

if [[ "$HAS_NAME" == "yes" ]]; then
  pass "passport show returned passport for $PASSPORT_NAME"
else
  fail "passport show failed for $PASSPORT_NAME"
fi

# Test 4: passport validate
echo ""
echo "Test 4: passport validate"
VALIDATE_OUT=$(run_json passport validate "$PASSPORT_NAME" --json "$TEST_PROJECT")
IS_VALID=$(echo "$VALIDATE_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if isinstance(data, list) and len(data) > 0:
        print('yes' if data[0].get('valid') is not None else 'no')
    elif isinstance(data, dict):
        print('yes' if data.get('valid') is not None else 'no')
    else:
        print('no')
except:
    print('no')
" 2>/dev/null || echo "no")

if [[ "$IS_VALID" == "yes" ]]; then
  pass "passport validate returned validation result"
else
  fail "passport validate failed"
fi

# Test 5: passport completeness
echo ""
echo "Test 5: passport completeness"
COMP_OUT=$(run_json passport completeness "$PASSPORT_NAME" --json "$TEST_PROJECT")
COMP_SCORE=$(echo "$COMP_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('completeness', -1))
except:
    print(-1)
" 2>/dev/null || echo "-1")

if [[ "$COMP_SCORE" != "-1" ]]; then
  info "Completeness: $COMP_SCORE%"
  pass "passport completeness returned score"
else
  fail "passport completeness failed"
fi

# Test 6: passport evidence
echo ""
echo "Test 6: passport evidence"
EVIDENCE_OUT=$(run_json passport evidence --json "$TEST_PROJECT")
EVIDENCE_OK=$(echo "$EVIDENCE_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('yes' if 'entries' in data or 'totalEntries' in data else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

if [[ "$EVIDENCE_OK" == "yes" ]]; then
  pass "passport evidence returned chain data"
else
  fail "passport evidence failed"
fi

# Test 7: passport evidence --verify
echo ""
echo "Test 7: passport evidence --verify"
VERIFY_OUT=$(run_json passport evidence --verify --json "$TEST_PROJECT")
VERIFY_OK=$(echo "$VERIFY_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('yes' if 'valid' in data or 'verified' in data else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

if [[ "$VERIFY_OK" == "yes" ]]; then
  pass "passport evidence --verify checked chain integrity"
else
  fail "passport evidence --verify failed"
fi

# Test 8: passport autonomy
echo ""
echo "Test 8: passport autonomy"
AUTONOMY_OUT=$(run_json passport autonomy --json "$TEST_PROJECT")
AUTONOMY_OK=$(echo "$AUTONOMY_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('yes' if 'agents' in data or 'level' in data else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

if [[ "$AUTONOMY_OK" == "yes" ]]; then
  pass "passport autonomy returned analysis"
else
  fail "passport autonomy failed"
fi

# Test 9: passport export
echo ""
echo "Test 9: passport export --format a2a"
EXPORT_OUT=$(run_json passport export "$PASSPORT_NAME" --format a2a --json "$TEST_PROJECT")
EXPORT_OK=$(echo "$EXPORT_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('yes' if data.get('format') or data.get('data') else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

if [[ "$EXPORT_OK" == "yes" ]]; then
  pass "passport export produced A2A format"
else
  fail "passport export failed"
fi

# ── T-6: complior fix --doc (new flag) ────────────────────────────────────
echo ""
echo "T-6: complior fix --doc subcommands"
echo ""

# Test 10: fix --doc fria
echo "Test 10: fix --doc fria"
FRIA_OUT=$(run_json fix --doc fria "$PASSPORT_NAME" --json --organization "TestCorp" "$TEST_PROJECT")
FRIA_OK=$(echo "$FRIA_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('yes' if data.get('savedPath') or data.get('markdown') or data.get('path') or data.get('content') else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

if [[ "$FRIA_OK" == "yes" ]]; then
  pass "fix --doc fria generated FRIA report"
else
  fail "fix --doc fria failed"
fi

# Test 11: fix --doc notify
echo ""
echo "Test 11: fix --doc notify"
NOTIFY_OUT=$(run_json fix --doc notify "$PASSPORT_NAME" --json --company "Test Corp" "$TEST_PROJECT")
NOTIFY_OK=$(echo "$NOTIFY_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('yes' if data.get('markdown') or data.get('content') else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

if [[ "$NOTIFY_OK" == "yes" ]]; then
  pass "fix --doc notify generated Worker Notification"
else
  fail "fix --doc notify failed"
fi

# Test 12: fix --doc policy
echo ""
echo "Test 12: fix --doc policy"
POLICY_OUT=$(run_json fix --doc policy "$PASSPORT_NAME" --json --industry hr "$TEST_PROJECT")
POLICY_OK=$(echo "$POLICY_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('yes' if data.get('markdown') or data.get('content') else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

if [[ "$POLICY_OK" == "yes" ]]; then
  pass "fix --doc policy generated AI Policy"
else
  fail "fix --doc policy failed"
fi

# ── Cleanup ─────────────────────────────────────────────────────────────────
rm -rf "$TEST_PROJECT/.complior"

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "═══════════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then exit 1; fi
exit 0