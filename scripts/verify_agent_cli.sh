#!/usr/bin/env bash
# =============================================================================
# verify_agent_cli.sh — Agent Passport CLI acceptance test
#
# Tests: agent init → list → show → validate → completeness → fria →
#        evidence → export → notify → autonomy → registry → permissions
# Exit 0 = PASS, Exit 1 = FAIL
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
# This ensures --json output is clean JSON without engine startup messages.
run_json() { "$COMPLIOR" "$@" 2>/dev/null || true; }

echo "═══════════════════════════════════════════════════"
echo " Complior Agent Passport CLI Test"
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

# ── Test 1: agent init ────────────────────────────────────────────────
echo "Test 1: agent init"
$COMPLIOR init --yes "$TEST_PROJECT" >/dev/null 2>&1 || true
if [[ -d "$TEST_PROJECT/.complior/agents" ]]; then
  pass "agent init created .complior/agents/"
else
  fail "agent init did not create agents directory"
fi

# ── Test 2: agent list ────────────────────────────────────────────────
echo ""
echo "Test 2: agent list"
LIST_OUT=$(run_json agent list --json "$TEST_PROJECT")
AGENT_COUNT=$(echo "$LIST_OUT" | python3 -c "
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

if [[ "$AGENT_COUNT" -gt 0 ]]; then
  pass "agent list found $AGENT_COUNT agent(s)"
else
  fail "agent list returned 0 agents"
fi

# Get first agent name for subsequent tests
AGENT_NAME=$(echo "$LIST_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    agents = data if isinstance(data, list) else data.get('agents', [])
    print(agents[0].get('name', ''))
except:
    print('')
" 2>/dev/null || echo "")

if [[ -z "$AGENT_NAME" ]]; then
  # Try reading from manifest file directly
  FIRST_MANIFEST=$(ls "$TEST_PROJECT/.complior/agents/"*-manifest.json 2>/dev/null | head -1 || true)
  if [[ -n "$FIRST_MANIFEST" ]]; then
    AGENT_NAME=$(python3 -c "import json; print(json.load(open('$FIRST_MANIFEST')).get('name',''))" 2>/dev/null || echo "")
  fi
fi

if [[ -z "$AGENT_NAME" ]]; then
  fail "Could not determine agent name — stopping"
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
  echo "═══════════════════════════════════════════════════"
  exit 1
fi
info "Using agent: $AGENT_NAME"

# ── Test 3: agent show ────────────────────────────────────────────────
echo ""
echo "Test 3: agent show"
SHOW_OUT=$(run_json agent show "$AGENT_NAME" --json "$TEST_PROJECT")
HAS_NAME=$(echo "$SHOW_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('yes' if data.get('name') else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

if [[ "$HAS_NAME" == "yes" ]]; then
  pass "agent show returned passport for $AGENT_NAME"
else
  fail "agent show failed for $AGENT_NAME"
fi

# ── Test 4: agent validate ────────────────────────────────────────────
echo ""
echo "Test 4: agent validate"
VALIDATE_OUT=$(run_json agent validate "$AGENT_NAME" --json "$TEST_PROJECT")
IS_VALID=$(echo "$VALIDATE_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    # validate returns array of results (one per agent)
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
  pass "agent validate returned validation result"
else
  fail "agent validate failed"
fi

# ── Test 5: agent completeness ────────────────────────────────────────
echo ""
echo "Test 5: agent completeness"
COMP_OUT=$(run_json agent completeness "$AGENT_NAME" --json "$TEST_PROJECT")
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
  pass "agent completeness returned score"
else
  fail "agent completeness failed"
fi

# ── Test 6: agent fria ────────────────────────────────────────────────
echo ""
echo "Test 6: agent fria"
FRIA_OUT=$(run_json agent fria "$AGENT_NAME" --json --organization "TestCorp" "$TEST_PROJECT")
FRIA_OK=$(echo "$FRIA_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    # fria returns {savedPath, markdown, ...}
    print('yes' if data.get('savedPath') or data.get('markdown') or data.get('path') or data.get('content') else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

if [[ "$FRIA_OK" == "yes" ]]; then
  pass "agent fria generated FRIA report"
else
  fail "agent fria failed"
fi

# ── Test 7: agent evidence ────────────────────────────────────────────
echo ""
echo "Test 7: agent evidence"
EVIDENCE_OUT=$(run_json agent evidence --json "$TEST_PROJECT")
EVIDENCE_OK=$(echo "$EVIDENCE_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('yes' if 'entries' in data or 'totalEntries' in data else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

if [[ "$EVIDENCE_OK" == "yes" ]]; then
  pass "agent evidence returned chain data"
else
  fail "agent evidence failed"
fi

# ── Test 8: agent evidence --verify ───────────────────────────────────
echo ""
echo "Test 8: agent evidence --verify"
VERIFY_OUT=$(run_json agent evidence --verify --json "$TEST_PROJECT")
VERIFY_OK=$(echo "$VERIFY_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('yes' if 'valid' in data or 'verified' in data else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

if [[ "$VERIFY_OK" == "yes" ]]; then
  pass "agent evidence --verify checked chain integrity"
else
  fail "agent evidence --verify failed"
fi

# ── Test 9: agent export ──────────────────────────────────────────────
echo ""
echo "Test 9: agent export --format a2a"
EXPORT_OUT=$(run_json agent export "$AGENT_NAME" --format a2a --json "$TEST_PROJECT")
EXPORT_OK=$(echo "$EXPORT_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('yes' if data.get('format') or data.get('data') else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

if [[ "$EXPORT_OK" == "yes" ]]; then
  pass "agent export produced A2A format"
else
  fail "agent export failed"
fi

# ── Test 10: agent autonomy ───────────────────────────────────────────
echo ""
echo "Test 10: agent autonomy"
AUTONOMY_OUT=$(run_json agent autonomy --json "$TEST_PROJECT")
AUTONOMY_OK=$(echo "$AUTONOMY_OUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('yes' if 'agents' in data or 'level' in data else 'no')
except:
    print('no')
" 2>/dev/null || echo "no")

if [[ "$AUTONOMY_OK" == "yes" ]]; then
  pass "agent autonomy returned analysis"
else
  fail "agent autonomy failed"
fi

# ── Cleanup ──────────────────────────────────────────────────────────
rm -rf "$TEST_PROJECT/.complior"

# ── Summary ───────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "═══════════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then exit 1; fi
exit 0
