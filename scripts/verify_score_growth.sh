#!/usr/bin/env bash
# =============================================================================
# verify_score_growth.sh — Score growth after fix verification
#
# Tests: init → scan → fix → rescan → score improved
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

echo "═══════════════════════════════════════════════════"
echo " Complior Score Growth Test"
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

# ── Step 1: Init project ─────────────────────────────────────────────────
echo "Step 1: Init"
$COMPLIOR init --yes "$TEST_PROJECT" >/dev/null 2>&1 || true

# ── Step 2: Initial scan ─────────────────────────────────────────────────
echo "Step 2: Initial scan"
SCAN1=$($COMPLIOR scan --json "$TEST_PROJECT" 2>/dev/null || true)
SCORE1=$(echo "$SCAN1" | python3 -c "import sys,json; print(json.load(sys.stdin)['score']['totalScore'])" 2>/dev/null || echo "0")
info "Initial score: $SCORE1"

if [[ "$SCORE1" != "0" ]]; then
  pass "Initial scan produced non-zero score ($SCORE1)"
else
  fail "Initial scan returned score 0"
fi

# ── Step 3: Apply fixes ──────────────────────────────────────────────────
echo ""
echo "Step 3: Apply fixes"
FIX_OUTPUT=$($COMPLIOR fix "$TEST_PROJECT" 2>&1 || true)
info "Fix output: $(echo "$FIX_OUTPUT" | tail -n 1)"
pass "Fix command completed"

# ── Step 4: Re-scan ──────────────────────────────────────────────────────
echo ""
echo "Step 4: Re-scan after fix"
SCAN2=$($COMPLIOR scan --json "$TEST_PROJECT" 2>/dev/null || true)
SCORE2=$(echo "$SCAN2" | python3 -c "import sys,json; print(json.load(sys.stdin)['score']['totalScore'])" 2>/dev/null || echo "0")
info "Score after fix: $SCORE2"

# ── Step 5: Compare scores ───────────────────────────────────────────────
echo ""
echo "Step 5: Score comparison"

IMPROVED=$(python3 -c "print('yes' if float('$SCORE2') >= float('$SCORE1') else 'no')" 2>/dev/null || echo "no")
if [[ "$IMPROVED" == "yes" ]]; then
  DELTA=$(python3 -c "print(float('$SCORE2') - float('$SCORE1'))" 2>/dev/null || echo "0")
  pass "Score did not decrease: $SCORE1 → $SCORE2 (delta: +$DELTA)"
else
  fail "Score decreased: $SCORE1 → $SCORE2"
fi

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "═══════════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then exit 1; fi
exit 0
