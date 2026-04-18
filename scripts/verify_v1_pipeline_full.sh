#!/usr/bin/env bash
# =============================================================================
# verify_v1_pipeline_full.sh — Full v1.0.0 Pipeline Acceptance Test
#
# V1-M16: Comprehensive end-to-end verification of ALL v1.0 pipeline commands.
# Tests every core command from CLAUDE.md v1.0 scope.
#
# Exit 0 = ALL PASS, Exit 1 = at least one FAIL
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPLIOR="$PROJECT_ROOT/target/release/complior"
TEST_PROJECT="${COMPLIOR_TEST_PROJECT:-/home/openclaw/test-projects/eval-target}"
EXPORT_DIR="/tmp/complior_v1_pipeline_test"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
PASS=0
FAIL=0

pass() { ((PASS++)) || true; echo -e "  ${GREEN}✓${NC} $1"; }
fail() { ((FAIL++)) || true; echo -e "  ${RED}✗${NC} $1"; }
info() { echo -e "  ${YELLOW}→${NC} $1"; }
section() { echo -e "\n${CYAN}$1${NC}"; }

echo "═══════════════════════════════════════════════════"
echo " Complior v1.0 Full Pipeline Acceptance Test"
echo "═══════════════════════════════════════════════════"
echo ""

# ── Pre-checks ────────────────────────────────────────────────────────────────

if [[ ! -x "$COMPLIOR" ]]; then
  echo "Binary not found: $COMPLIOR"
  echo "Run: cargo build --release"
  exit 1
fi

if [[ ! -d "$TEST_PROJECT" ]]; then
  echo "Test project not found: $TEST_PROJECT"
  echo "Set COMPLIOR_TEST_PROJECT to a valid project directory"
  exit 1
fi

rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR"

# Kill any lingering engines
pkill -f "tsx.*server.ts" 2>/dev/null || true
sleep 1

# ══════════════════════════════════════════════════════════════════════════════
#  1. complior version
# ══════════════════════════════════════════════════════════════════════════════
section "1. complior version"

VERSION_OUT=$($COMPLIOR version 2>&1 || true)
if echo "$VERSION_OUT" | grep -qE '[0-9]+\.[0-9]+\.[0-9]+'; then
  pass "version shows semver"
else
  fail "version missing semver"
fi
if echo "$VERSION_OUT" | grep -qE '[a-f0-9]{7,}'; then
  pass "version shows git hash"
else
  fail "version missing git hash"
fi

# ══════════════════════════════════════════════════════════════════════════════
#  2. complior init
# ══════════════════════════════════════════════════════════════════════════════
section "2. complior init"

# Remove existing config to test fresh init
rm -rf "$TEST_PROJECT/.complior" 2>/dev/null || true

INIT_OUT=$($COMPLIOR init --yes "$TEST_PROJECT" 2>&1 || true)
if [[ -d "$TEST_PROJECT/.complior" ]]; then
  pass "init creates .complior directory"
else
  fail "init did not create .complior directory"
fi

if echo "$INIT_OUT" | grep -qiE "initialized|project.*ready|success|complior"; then
  pass "init reports success"
else
  fail "init did not report success"
fi

# ══════════════════════════════════════════════════════════════════════════════
#  3. complior scan
# ══════════════════════════════════════════════════════════════════════════════
section "3. complior scan"

# 3a: Basic scan (human output)
SCAN_HUMAN=$($COMPLIOR scan "$TEST_PROJECT" 2>&1 || true)
if echo "$SCAN_HUMAN" | grep -qE '[0-9]+'; then
  pass "scan produces human output with score"
else
  fail "scan human output missing score"
fi

# 3b: --json
SCAN_JSON=$($COMPLIOR scan --json "$TEST_PROJECT" 2>/dev/null || true)
if echo "$SCAN_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'score' in d or 'findings' in d" 2>/dev/null; then
  pass "scan --json returns valid JSON with score/findings"
else
  fail "scan --json is not valid JSON or missing fields"
fi

# 3c: --sarif
SCAN_SARIF=$($COMPLIOR scan --sarif "$TEST_PROJECT" 2>/dev/null || true)
if echo "$SCAN_SARIF" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('\$schema','').endswith('sarif') or 'runs' in d" 2>/dev/null; then
  pass "scan --sarif returns valid SARIF JSON"
else
  fail "scan --sarif is not valid SARIF"
fi

# 3d: --quiet
SCAN_QUIET=$($COMPLIOR scan --quiet "$TEST_PROJECT" 2>&1 || true)
QUIET_LINES=$(echo "$SCAN_QUIET" | wc -l)
if [[ $QUIET_LINES -le 5 ]]; then
  pass "scan --quiet produces minimal output ($QUIET_LINES lines)"
else
  fail "scan --quiet too verbose ($QUIET_LINES lines)"
fi

# 3e: --ci --threshold
set +e
$COMPLIOR scan --ci --threshold 100 "$TEST_PROJECT" >/dev/null 2>&1
CI_EXIT=$?
set -e
if [[ $CI_EXIT -ne 0 ]]; then
  pass "scan --ci --threshold 100 returns non-zero exit (gate works)"
else
  fail "scan --ci --threshold 100 should fail for most projects"
fi

# ══════════════════════════════════════════════════════════════════════════════
#  4. complior fix
# ══════════════════════════════════════════════════════════════════════════════
section "4. complior fix"

# 4a: --dry-run
FIX_DRY=$($COMPLIOR fix --dry-run "$TEST_PROJECT" 2>&1 || true)
if echo "$FIX_DRY" | grep -qiE "fix|create|document|wrap|template|no.*fix"; then
  pass "fix --dry-run shows available fixes or 'no fixes'"
else
  fail "fix --dry-run output unclear"
fi

# 4b: --json
FIX_JSON=$($COMPLIOR fix --dry-run --json "$TEST_PROJECT" 2>/dev/null || true)
if echo "$FIX_JSON" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
  pass "fix --dry-run --json returns valid JSON"
else
  fail "fix --dry-run --json is not valid JSON"
fi

# 4c: --doc fria (document generation)
FIX_DOC=$($COMPLIOR fix --doc fria "$TEST_PROJECT" 2>&1 || true)
if echo "$FIX_DOC" | grep -qiE "fria|generated|document|rights.*impact|error.*passport"; then
  pass "fix --doc fria generates document or reports passport needed"
else
  fail "fix --doc fria output unclear"
fi

# ══════════════════════════════════════════════════════════════════════════════
#  5. complior report
# ══════════════════════════════════════════════════════════════════════════════
section "5. complior report"

# 5a: Human report
REPORT_HUMAN=$($COMPLIOR report "$TEST_PROJECT" 2>&1 || true)
if echo "$REPORT_HUMAN" | grep -qiE "score|compliance|readiness|section|═|report"; then
  pass "report human output has compliance data"
else
  fail "report human output missing compliance data"
fi

# 5b: --json
REPORT_JSON=$($COMPLIOR report --json "$TEST_PROJECT" 2>/dev/null || true)
if echo "$REPORT_JSON" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
  pass "report --json returns valid JSON"
else
  fail "report --json is not valid JSON"
fi

# 5c: --format md (markdown)
REPORT_MD=$($COMPLIOR report --format md "$TEST_PROJECT" 2>&1 || true)
if echo "$REPORT_MD" | grep -qiE "generated|markdown|compliance|report|#"; then
  pass "report --format md generates/reports markdown"
else
  fail "report --format md output unclear"
fi

# 5d: --format html
REPORT_HTML=$($COMPLIOR report --format html "$TEST_PROJECT" 2>&1 || true)
if echo "$REPORT_HTML" | grep -qiE "generated|html|report|file"; then
  pass "report --format html generates HTML report"
else
  fail "report --format html output unclear"
fi

# ══════════════════════════════════════════════════════════════════════════════
#  6. complior passport
# ══════════════════════════════════════════════════════════════════════════════
section "6. complior passport"

# 6a: init
PASSPORT_INIT=$($COMPLIOR passport init "$TEST_PROJECT" 2>&1 || true)
if echo "$PASSPORT_INIT" | grep -qiE "passport|generated|created|agent|already.*exists"; then
  pass "passport init creates or acknowledges existing passport"
else
  fail "passport init output unclear"
fi

# 6b: list
PASSPORT_LIST=$($COMPLIOR passport list "$TEST_PROJECT" 2>&1 || true)
if echo "$PASSPORT_LIST" | grep -qiE "passport|agent|name\|eval"; then
  pass "passport list shows passports"
else
  fail "passport list output unclear"
fi

# 6c: show
# Get first passport name from list
FIRST_PASSPORT=$(echo "$PASSPORT_LIST" | grep -oP '(?<=│ )\S+(?= )' | head -1 || true)
if [[ -z "$FIRST_PASSPORT" ]]; then
  FIRST_PASSPORT=$(ls "$TEST_PROJECT"/.complior/passports/*.json 2>/dev/null | head -1 | xargs -I{} basename {} .json 2>/dev/null || echo "")
fi

if [[ -n "$FIRST_PASSPORT" ]]; then
  PASSPORT_SHOW=$($COMPLIOR passport show "$FIRST_PASSPORT" "$TEST_PROJECT" 2>&1 || true)
  if echo "$PASSPORT_SHOW" | grep -qiE "agent|passport|name|autonomy|permission|field"; then
    pass "passport show displays passport fields"
  else
    fail "passport show output unclear"
  fi
else
  info "No passport found to show (skipping show/validate/completeness)"
fi

# 6d: validate
if [[ -n "$FIRST_PASSPORT" ]]; then
  PASSPORT_VALIDATE=$($COMPLIOR passport validate "$FIRST_PASSPORT" "$TEST_PROJECT" 2>&1 || true)
  if echo "$PASSPORT_VALIDATE" | grep -qiE "valid|pass|signature|schema|warning"; then
    pass "passport validate checks passport validity"
  else
    fail "passport validate output unclear"
  fi
fi

# 6e: completeness
if [[ -n "$FIRST_PASSPORT" ]]; then
  PASSPORT_COMPLETE=$($COMPLIOR passport completeness "$FIRST_PASSPORT" "$TEST_PROJECT" 2>&1 || true)
  if echo "$PASSPORT_COMPLETE" | grep -qiE "completeness|%|score|field|gap"; then
    pass "passport completeness shows score/gaps"
  else
    fail "passport completeness output unclear"
  fi
fi

# 6f: evidence
PASSPORT_EVIDENCE=$($COMPLIOR passport evidence "$TEST_PROJECT" 2>&1 || true)
if echo "$PASSPORT_EVIDENCE" | grep -qiE "evidence|chain|entry|entries|empty|hash"; then
  pass "passport evidence shows chain status"
else
  fail "passport evidence output unclear"
fi

# 6g: permissions
PASSPORT_PERMS=$($COMPLIOR passport permissions "$TEST_PROJECT" 2>&1 || true)
if echo "$PASSPORT_PERMS" | grep -qiE "permission|agent|matrix|tool|allow|deny"; then
  pass "passport permissions shows permission data"
else
  fail "passport permissions output unclear"
fi

# ══════════════════════════════════════════════════════════════════════════════
#  7. complior status
# ══════════════════════════════════════════════════════════════════════════════
section "7. complior status"

STATUS_OUT=$($COMPLIOR status "$TEST_PROJECT" 2>&1 || true)
if echo "$STATUS_OUT" | grep -qiE "score|compliance|posture|status|zone"; then
  pass "status shows compliance posture"
else
  fail "status output unclear"
fi

STATUS_JSON=$($COMPLIOR status --json "$TEST_PROJECT" 2>/dev/null || true)
if echo "$STATUS_JSON" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
  pass "status --json returns valid JSON"
else
  fail "status --json is not valid JSON"
fi

# ══════════════════════════════════════════════════════════════════════════════
#  8. complior doctor
# ══════════════════════════════════════════════════════════════════════════════
section "8. complior doctor"

DOCTOR_OUT=$($COMPLIOR doctor "$TEST_PROJECT" 2>&1 || true)
if echo "$DOCTOR_OUT" | grep -qiE "check|engine|node|tui|pass|fail|warn|✓|✗"; then
  pass "doctor runs health checks"
else
  fail "doctor output unclear"
fi

# ══════════════════════════════════════════════════════════════════════════════
#  9. complior completions
# ══════════════════════════════════════════════════════════════════════════════
section "9. complior completions"

# Kill any lingering engine processes from prior sections to avoid output pollution
pkill -f "tsx.*server.ts" 2>/dev/null || true
sleep 1

COMP_OUT=$($COMPLIOR completions bash 2>&1 || true)
if echo "$COMP_OUT" | grep -qE 'complete|_complior|COMPREPLY'; then
  pass "completions bash generates bash completion script"
else
  fail "completions bash output unclear"
fi

# ══════════════════════════════════════════════════════════════════════════════
#  Summary
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════"
TOTAL=$((PASS + FAIL))
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC} of $TOTAL"
echo "═══════════════════════════════════════════════════"

# Cleanup
rm -rf "$EXPORT_DIR"
pkill -f "tsx.*server.ts" 2>/dev/null || true

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
exit 0
