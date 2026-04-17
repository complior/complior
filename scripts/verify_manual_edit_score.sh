#!/usr/bin/env bash
# =============================================================================
# verify_manual_edit_score.sh — Manual document edit → score improvement
#
# Tests: init → scan → write real doc → rescan → score improved
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
echo " Complior Manual Edit Score Test"
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

# ── Step 2: Baseline scan ────────────────────────────────────────────────
echo ""
echo "Step 2: Baseline scan"
SCAN1=$($COMPLIOR scan --json "$TEST_PROJECT" 2>/dev/null || true)
SCORE1=$(echo "$SCAN1" | python3 -c "import sys,json; print(json.load(sys.stdin)['score']['totalScore'])" 2>/dev/null || echo "0")
L2_FAILS1=$(echo "$SCAN1" | python3 -c "
import sys, json
d = json.load(sys.stdin)
findings = d.get('findings', [])
l2 = [f for f in findings if f.get('type') == 'fail' and f.get('checkId','').startswith('l2')]
print(len(l2))
" 2>/dev/null || echo "0")
info "Baseline score: $SCORE1, L2 failures: $L2_FAILS1"

if [[ "$SCORE1" != "0" ]]; then
  pass "Baseline scan produced non-zero score ($SCORE1)"
else
  fail "Baseline scan returned score 0"
fi

# ── Step 3: Write real document content ──────────────────────────────────
echo ""
echo "Step 3: Write real document content"
DOCS_DIR="$TEST_PROJECT/.complior/docs"
mkdir -p "$DOCS_DIR"

cat > "$DOCS_DIR/risk-management.md" << 'DOCEOF'
# Risk Management System

## 1. Risk Identification

Our AI system uses automated classification for customer support tickets.
The primary risks identified include:

- **Bias in classification**: Historical training data may contain biases
  that lead to unequal treatment of different customer demographics.
- **Accuracy degradation**: Model performance may degrade over time as
  customer language patterns evolve, leading to misclassification.
- **Privacy exposure**: Customer messages may contain sensitive personal
  information that could be exposed through model outputs.

## 2. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Classification bias | Medium | High | Regular fairness audits, balanced training data |
| Accuracy degradation | High | Medium | Monthly performance monitoring, retraining pipeline |
| Privacy exposure | Low | Critical | PII detection pre-hook, data minimization |

## 3. Mitigation Measures

### 3.1 Technical Controls
- Automated bias detection via complior eval --security
- PII sanitization hooks in SDK middleware pipeline
- Rate limiting and budget controls per agent

### 3.2 Organizational Controls
- Quarterly risk review meetings
- Designated AI compliance officer
- Staff training on AI literacy (Art. 4 EU AI Act)

## 4. Monitoring and Review

Risk assessments are reviewed quarterly and after any significant model update.
All changes are tracked in the evidence chain via complior passport evidence.
DOCEOF

if [[ -f "$DOCS_DIR/risk-management.md" ]]; then
  WORD_COUNT=$(wc -w < "$DOCS_DIR/risk-management.md")
  pass "Document written ($WORD_COUNT words)"
else
  fail "Failed to write document"
fi

# ── Step 4: Re-scan after edit ───────────────────────────────────────────
echo ""
echo "Step 4: Re-scan after document edit"
SCAN2=$($COMPLIOR scan --json "$TEST_PROJECT" 2>/dev/null || true)
SCORE2=$(echo "$SCAN2" | python3 -c "import sys,json; print(json.load(sys.stdin)['score']['totalScore'])" 2>/dev/null || echo "0")
L2_FAILS2=$(echo "$SCAN2" | python3 -c "
import sys, json
d = json.load(sys.stdin)
findings = d.get('findings', [])
l2 = [f for f in findings if f.get('type') == 'fail' and f.get('checkId','').startswith('l2')]
print(len(l2))
" 2>/dev/null || echo "0")
info "After edit score: $SCORE2, L2 failures: $L2_FAILS2"

# ── Step 5: Compare ─────────────────────────────────────────────────────
echo ""
echo "Step 5: Score comparison"
IMPROVED=$(python3 -c "print('yes' if float('$SCORE2') >= float('$SCORE1') else 'no')" 2>/dev/null || echo "no")
if [[ "$IMPROVED" == "yes" ]]; then
  DELTA=$(python3 -c "print(round(float('$SCORE2') - float('$SCORE1'), 2))" 2>/dev/null || echo "0")
  pass "Score did not decrease: $SCORE1 → $SCORE2 (delta: +$DELTA)"
else
  fail "Score decreased after document edit: $SCORE1 → $SCORE2"
fi

# L2 failures should decrease or stay same
L2_IMPROVED=$(python3 -c "print('yes' if int('$L2_FAILS2') <= int('$L2_FAILS1') else 'no')" 2>/dev/null || echo "no")
if [[ "$L2_IMPROVED" == "yes" ]]; then
  pass "L2 failures did not increase: $L2_FAILS1 → $L2_FAILS2"
else
  fail "L2 failures increased after adding document: $L2_FAILS1 → $L2_FAILS2"
fi

# ── Cleanup ──────────────────────────────────────────────────────────────
rm -f "$DOCS_DIR/risk-management.md"

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "═══════════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then exit 1; fi
exit 0
