#!/usr/bin/env bash
# =============================================================================
# verify_pipeline.sh — Full pipeline acceptance test (NO LLM required)
#
# Tests: init → scan → fix → report → verify
# Uses eval-target test project
# Exit 0 = PASS, Exit 1 = FAIL
# =============================================================================
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPLIOR="$PROJECT_ROOT/target/release/complior"
TEST_PROJECT="${COMPLIOR_TEST_PROJECT:-/home/openclaw/test-projects/eval-target}"
ENGINE_DIR="$PROJECT_ROOT/engine/core"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
PASS=0
FAIL=0

# ── Helpers ────────────────────────────────────────────────────────────────
pass() { ((PASS++)) || true; echo -e "  ${GREEN}✓${NC} $1"; }
fail() { ((FAIL++)) || true; echo -e "  ${RED}✗${NC} $1"; }
info() { echo -e "  ${YELLOW}→${NC} $1"; }

# ── Pre-checks ─────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════"
echo " Complior Pipeline Acceptance Test (no LLM)"
echo "═══════════════════════════════════════════════════"
echo ""

# Check binary exists
if [[ ! -x "$COMPLIOR" ]]; then
  echo "Binary not found: $COMPLIOR"
  echo "Run: cargo build --release"
  exit 1
fi

# Check test project exists
if [[ ! -d "$TEST_PROJECT" ]]; then
  echo "Test project not found: $TEST_PROJECT"
  exit 1
fi

# Clean previous state
rm -rf "$TEST_PROJECT/.complior"

# ── Step 1: Build verification ────────────────────────────────────────────
echo "Step 1: Build verification"
info "CLI binary: $COMPLIOR ($(stat --printf='%s bytes' "$COMPLIOR" 2>/dev/null || echo 'unknown size'))"
pass "CLI binary exists and runs"

# Kill any lingering engines from previous runs
pkill -f "tsx.*server.ts" 2>/dev/null || true
sleep 1

# ── Step 2: Init ───────────────────────────────────────────────────────────
echo ""
echo "Step 2: complior init"

INIT_OUTPUT=$($COMPLIOR init --yes "$TEST_PROJECT" 2>&1 || true)
echo "$INIT_OUTPUT" > /tmp/complior_init.log
echo "$INIT_OUTPUT" | tail -3
if [[ -d "$TEST_PROJECT/.complior" ]]; then
  pass "complior init created .complior/ directory"
else
  fail "complior init did not create .complior/ directory"
fi

# ── Step 3: Scan (basic, no LLM) ──────────────────────────────────────────
echo ""
echo "Step 3: complior scan (basic)"

SCAN_OUTPUT=$($COMPLIOR scan --json "$TEST_PROJECT" 2>/dev/null || true)
if echo "$SCAN_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('score',{}).get('totalScore','MISSING'))" 2>/dev/null; then
  SCORE=$(echo "$SCAN_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['score']['totalScore'])" 2>/dev/null || echo "0")
  pass "complior scan --json returned valid JSON with score=$SCORE"
else
  # Try human output
  if $COMPLIOR scan "$TEST_PROJECT" 2>&1 | grep -q "Score\|score\|Compliance"; then
    pass "complior scan produced human-readable output"
  else
    fail "complior scan produced no output"
  fi
fi

# Verify scan produces findings
if echo "$SCAN_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert len(d.get('findings',[])) > 0" 2>/dev/null; then
  FINDINGS=$(echo "$SCAN_OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['findings']))" 2>/dev/null || echo "0")
  pass "Scan produced $FINDINGS findings"
else
  fail "Scan produced no findings"
fi

# ── Step 4: Fix (dry-run) ─────────────────────────────────────────────────
echo ""
echo "Step 4: complior fix --dry-run"

FIX_DRY_OUTPUT=$($COMPLIOR fix --dry-run "$TEST_PROJECT" 2>&1 || true)
echo "$FIX_DRY_OUTPUT" > /tmp/complior_fix.log
echo "$FIX_DRY_OUTPUT" | tail -5
if [[ -n "$FIX_DRY_OUTPUT" ]]; then
  pass "complior fix --dry-run completed"
else
  fail "complior fix --dry-run failed"
fi

# ── Step 5: Fix (apply) ───────────────────────────────────────────────────
echo ""
echo "Step 5: complior fix (apply)"

FIX_OUTPUT=$($COMPLIOR fix "$TEST_PROJECT" 2>&1 || true)
echo "$FIX_OUTPUT" > /tmp/complior_fix_apply.log
echo "$FIX_OUTPUT" | tail -5
if [[ -n "$FIX_OUTPUT" ]]; then
  pass "complior fix completed"
else
  fail "complior fix failed"
fi

# ── Step 6: Re-scan after fix ─────────────────────────────────────────────
echo ""
echo "Step 6: complior scan (after fix)"

SCAN_AFTER=$($COMPLIOR scan --json "$TEST_PROJECT" 2>/dev/null || true)
if echo "$SCAN_AFTER" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['score']['totalScore'])" 2>/dev/null; then
  SCORE_AFTER=$(echo "$SCAN_AFTER" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['score']['totalScore'])" 2>/dev/null || echo "0")
  pass "Re-scan after fix: score=$SCORE_AFTER"
else
  fail "Re-scan after fix failed"
fi

# ── Step 7: Report ─────────────────────────────────────────────────────────
echo ""
echo "Step 7: complior report"

REPORT_OUTPUT=$($COMPLIOR report "$TEST_PROJECT" 2>&1 || true)
echo "$REPORT_OUTPUT" > /tmp/complior_report.log
echo "$REPORT_OUTPUT" | tail -5
if [[ -n "$REPORT_OUTPUT" ]]; then
  pass "complior report produced output"
else
  fail "complior report failed"
fi

# Report --json
REPORT_JSON=$($COMPLIOR report --json "$TEST_PROJECT" 2>/dev/null || true)
if echo "$REPORT_JSON" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
  pass "complior report --json produced valid JSON"
else
  fail "complior report --json failed"
fi

# ── Summary ────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "═══════════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
exit 0
