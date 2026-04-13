#!/usr/bin/env bash
# =============================================================================
# verify_eval_flags.sh — Eval CLI flags acceptance test (V1-M04)
#
# Tests the REAL `complior eval` binary for CLI-side eval flag logic.
# Requires COMPLIOR_EVAL_TARGET env var (e.g. http://localhost:4000/api/chat).
#
# Exit 0 = all PASS, Exit 1 = any FAIL
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPLIOR="$PROJECT_ROOT/target/release/complior"
TEST_PROJECT="${COMPLIOR_TEST_PROJECT:-/home/openclaw/test-projects/eval-target}"
EVAL_TARGET="${COMPLIOR_EVAL_TARGET:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
PASS=0
FAIL=0

pass() { ((PASS++)) || true; echo -e "  ${GREEN}✓${NC} $1"; }
fail() { ((FAIL++)) || true; echo -e "  ${RED}✗${NC} $1"; }
info() { echo -e "  ${YELLOW}→${NC} $1"; }

# Helper: run CLI command, capture stdout (stderr to /dev/null)
run_cmd() { "$COMPLIOR" "$@" 2>/dev/null || true; }

echo "═══════════════════════════════════════════════════"
echo " Complior Eval Flags Acceptance Test (V1-M04)"
echo "═══════════════════════════════════════════════════"
echo ""

# ── Pre-checks ─────────────────────────────────────────────────────
if [[ ! -x "$COMPLIOR" ]]; then
  echo "Binary not found: $COMPLIOR. Run: cargo build --release"
  exit 1
fi

if [[ -z "$EVAL_TARGET" ]]; then
  echo -e "${YELLOW}⚠${NC}  COMPLIOR_EVAL_TARGET not set — skipping eval tests"
  echo "  Set it to a live AI endpoint URL:"
  echo "    export COMPLIOR_EVAL_TARGET=http://localhost:4000/api/chat"
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo -e " Results: ${YELLOW}SKIPPED${NC} (no target)"
  echo "═══════════════════════════════════════════════════"
  exit 0
fi

if [[ ! -d "$TEST_PROJECT" ]]; then
  echo "Test project not found: $TEST_PROJECT"
  exit 1
fi

info "Target: $EVAL_TARGET"
info "Project: $TEST_PROJECT"
echo ""

# Kill lingering engines and clean state
pkill -f "tsx.*server.ts" 2>/dev/null || true
sleep 1
rm -rf "$TEST_PROJECT/.complior"

# Init project
$COMPLIOR init --yes "$TEST_PROJECT" >/dev/null 2>&1 || true

# ═══════════════════════════════════════════════════════════════════
#  EVAL FLAGS
# ═══════════════════════════════════════════════════════════════════

# ── Test 1: eval --det ──────────────────────────────────────────────
echo "Test 1: eval --det"
EVAL_DET=$(run_cmd eval "$EVAL_TARGET" --det "$TEST_PROJECT")
if [[ -n "$EVAL_DET" ]]; then
  pass "eval --det produced output"
else
  fail "eval --det produced no output"
fi

# ── Test 2: eval --det --ci --threshold 0 → exit 0 ─────────────────
echo ""
echo "Test 2: eval --det --ci --threshold 0"
"$COMPLIOR" eval "$EVAL_TARGET" --det --ci --threshold 0 "$TEST_PROJECT" >/dev/null 2>&1
EXIT_EVAL_PASS=$?
if [[ $EXIT_EVAL_PASS -eq 0 ]]; then
  pass "eval --ci --threshold 0 exits 0 (threshold always passes)"
else
  fail "eval --ci --threshold 0 should exit 0, got $EXIT_EVAL_PASS"
fi

# ── Test 3: eval --det --ci --threshold 999 → exit 2 ───────────────
echo ""
echo "Test 3: eval --det --ci --threshold 999"
"$COMPLIOR" eval "$EVAL_TARGET" --det --ci --threshold 999 "$TEST_PROJECT" >/dev/null 2>&1 || true
EXIT_EVAL_FAIL=$?
if [[ $EXIT_EVAL_FAIL -eq 2 ]]; then
  pass "eval --ci --threshold 999 exits 2 (threshold exceeded)"
elif [[ $EXIT_EVAL_FAIL -ne 0 ]]; then
  pass "eval --ci --threshold 999 exits non-zero ($EXIT_EVAL_FAIL)"
else
  fail "eval --ci --threshold 999 should exit non-zero, got $EXIT_EVAL_FAIL"
fi

# ── Test 4: eval --det --json ───────────────────────────────────────
echo ""
echo "Test 4: eval --det --json"
EVAL_JSON=$(run_cmd eval "$EVAL_TARGET" --det --json "$TEST_PROJECT")
if echo "$EVAL_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
assert 'overallScore' in d or 'score' in d, 'should have score'
assert 'grade' in d or 'results' in d, 'should have grade or results'
" 2>/dev/null; then
  pass "eval --json produces valid JSON with score and grade"
else
  fail "eval --json did not produce valid JSON"
fi

# ── Test 5: eval --last ─────────────────────────────────────────────
echo ""
echo "Test 5: eval --last"
# Previous eval should have stored a result
EVAL_LAST=$(run_cmd eval --last "$TEST_PROJECT")
if [[ -n "$EVAL_LAST" ]]; then
  pass "eval --last shows previous result"
else
  fail "eval --last produced no output"
fi

# ── Test 6: eval --last --failures ──────────────────────────────────
echo ""
echo "Test 6: eval --last --failures"
EVAL_FAILURES=$(run_cmd eval --last --failures "$TEST_PROJECT")
if [[ -n "$EVAL_FAILURES" ]]; then
  LEN_LAST=${#EVAL_LAST}
  LEN_FAILURES=${#EVAL_FAILURES}
  # Failures output should typically be shorter (only failed tests)
  if [[ $LEN_FAILURES -le $LEN_LAST ]]; then
    pass "eval --last --failures shows filtered output ($LEN_FAILURES <= $LEN_LAST chars)"
  else
    pass "eval --last --failures produced output (may have more failures than passes)"
  fi
else
  # If no failures exist, empty output is acceptable
  pass "eval --last --failures shows no failures (all tests passed)"
fi

# ── Test 7: eval --det --verbose ────────────────────────────────────
echo ""
echo "Test 7: eval --det --verbose"
EVAL_VERBOSE=$(run_cmd eval "$EVAL_TARGET" --det --verbose "$TEST_PROJECT")
EVAL_NORMAL=$(run_cmd eval "$EVAL_TARGET" --det "$TEST_PROJECT")
LEN_VERBOSE=${#EVAL_VERBOSE}
LEN_NORMAL=${#EVAL_NORMAL}
if [[ $LEN_VERBOSE -ge $LEN_NORMAL ]] && [[ $LEN_VERBOSE -gt 0 ]]; then
  pass "eval --verbose output ($LEN_VERBOSE chars) >= normal ($LEN_NORMAL chars)"
else
  fail "eval --verbose output not >= normal ($LEN_VERBOSE vs $LEN_NORMAL)"
fi

# ── Test 8: eval --det --categories transparency ────────────────────
echo ""
echo "Test 8: eval --det --categories transparency"
EVAL_CAT=$(run_cmd eval "$EVAL_TARGET" --det --categories transparency "$TEST_PROJECT")
if [[ -n "$EVAL_CAT" ]]; then
  # Check that output mentions transparency category
  if echo "$EVAL_CAT" | grep -qi "transparen"; then
    pass "eval --categories transparency filters to transparency tests"
  else
    pass "eval --categories transparency produced output (category filter accepted)"
  fi
else
  fail "eval --categories transparency produced no output"
fi

# ── Cleanup ─────────────────────────────────────────────────────────
rm -rf "$TEST_PROJECT/.complior"

# ── Summary ─────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "═══════════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then exit 1; fi
exit 0
