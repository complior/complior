#!/usr/bin/env bash
# V1-M10: Score Transparency Acceptance Script
# Verifies: score disclaimer, category breakdown, status command
# Requires: complior binary in PATH, engine running or auto-launched

set -euo pipefail

PASS=0
FAIL=0
TOTAL=6

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

echo "=== V1-M10: Score Transparency Acceptance ==="
echo ""

# --- T-1: Score disclaimer in scan --json output ---
echo "T-1: Score disclaimer"
SCAN_JSON=$(complior scan --json 2>/dev/null || echo "{}")
check "scan --json has scoreDisclaimer field" \
  bash -c "echo '$SCAN_JSON' | jq -e '.scoreDisclaimer.summary' > /dev/null"
check "scoreDisclaimer has coveredObligations number" \
  bash -c "echo '$SCAN_JSON' | jq -e '.scoreDisclaimer.coveredObligations | type == \"number\"' > /dev/null"

# --- T-2: Category breakdown ---
echo ""
echo "T-2: Category breakdown"
check "scan --json has categoryBreakdown array" \
  bash -c "echo '$SCAN_JSON' | jq -e '.categoryBreakdown | length > 0' > /dev/null"
check "each category has impact field" \
  bash -c "echo '$SCAN_JSON' | jq -e '.categoryBreakdown[0].impact' > /dev/null"

# --- T-4: complior status command ---
echo ""
echo "T-4: complior status"
check "complior status exits 0" \
  complior status
check "complior status --json has score.totalScore" \
  bash -c "complior status --json 2>/dev/null | jq -e '.score.totalScore'"

echo ""
echo "=== Results: $PASS/$TOTAL passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
