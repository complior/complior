#!/usr/bin/env bash
# =============================================================================
# verify_self_scan.sh — Self-scan: complior scans itself
#
# Tests: complior scan on the complior project → score > 0, no crash
# Exit 0 = PASS, Exit 1 = FAIL
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPLIOR="$PROJECT_ROOT/target/release/complior"

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
echo " Complior Self-Scan Test"
echo "═══════════════════════════════════════════════════"
echo ""

if [[ ! -x "$COMPLIOR" ]]; then
  echo "Binary not found: $COMPLIOR. Run: cargo build --release"
  exit 1
fi

# Kill lingering engines
pkill -f "tsx.*server.ts" 2>/dev/null || true
sleep 2

# ── Test 1: Init complior project itself ─────────────────────────────────
echo "Test 1: Init complior project"
rm -rf "$PROJECT_ROOT/.complior"
INIT_OUT=$($COMPLIOR init --yes "$PROJECT_ROOT" 2>&1 || true)
if [[ -d "$PROJECT_ROOT/.complior" ]]; then
  pass "Self-init created .complior/"
else
  fail "Self-init failed"
fi

# ── Test 2: Self-scan produces score ─────────────────────────────────────
echo ""
echo "Test 2: Self-scan"
SCAN_OUT=$(timeout 120 $COMPLIOR scan --json "$PROJECT_ROOT" 2>/dev/null || true)
SCORE=$(echo "$SCAN_OUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['score']['totalScore'])" 2>/dev/null || echo "ERROR")

if [[ "$SCORE" != "ERROR" ]]; then
  info "Self-scan score: $SCORE"
  pass "Self-scan produced valid score"
else
  fail "Self-scan failed to produce score"
fi

# ── Test 3: Score is reasonable ──────────────────────────────────────────
echo ""
echo "Test 3: Score sanity check"
if python3 -c "assert 0 <= float('$SCORE') <= 100" 2>/dev/null; then
  pass "Score in valid range (0-100)"
else
  fail "Score out of range: $SCORE"
fi

# ── Test 4: Findings have correct format ─────────────────────────────────
echo ""
echo "Test 4: Finding format"
FINDINGS_OK=$(echo "$SCAN_OUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
findings = d.get('findings', [])
if len(findings) == 0:
    print('no_findings')
else:
    for f in findings[:5]:
        assert 'checkId' in f, 'missing checkId'
        assert 'type' in f, 'missing type'
        assert f['type'] in ('pass','fail','skip','info'), f'bad type: {f[\"type\"]}'
    print('ok')
" 2>/dev/null || echo "error")

if [[ "$FINDINGS_OK" == "ok" ]]; then
  pass "Findings have correct format"
elif [[ "$FINDINGS_OK" == "no_findings" ]]; then
  info "No findings (acceptable for self-scan)"
  pass "Self-scan did not crash with zero findings"
else
  fail "Findings format error"
fi

# ── Cleanup ──────────────────────────────────────────────────────────────
rm -rf "$PROJECT_ROOT/.complior"

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "═══════════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then exit 1; fi
exit 0
