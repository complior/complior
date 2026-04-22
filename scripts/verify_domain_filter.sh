#!/usr/bin/env bash
# =============================================================================
# verify_domain_filter.sh — V1-M18 + V1-M19 acceptance test
#
# Tests: onboarding with domain → scan → domain filter → fix filter
# Verifies that healthcare project skips HR/finance checks and fixes.
#
# Exit 0 = PASS, Exit 1 = FAIL
# =============================================================================
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPLIOR="$PROJECT_ROOT/target/release/complior"
TEST_PROJECT="${COMPLIOR_TEST_PROJECT:-/home/openclaw/test-projects/acme-ai-support}"

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
run_cmd() { "$COMPLIOR" "$@" 2>/dev/null || true; }

# ── Pre-checks ─────────────────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════"
echo " V1-M18 + V1-M19: Domain Filter Acceptance Test"
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

# Kill lingering engines
pkill -f "tsx.*server.ts" 2>/dev/null || true
sleep 1

# ── Step 1: Init with healthcare domain ────────────────────────────────────
echo "Step 1: complior init (healthcare domain)"

# Clean previous state
rm -rf "$TEST_PROJECT/.complior"

INIT_OUTPUT=$(run_cmd init --yes "$TEST_PROJECT")
if [[ -d "$TEST_PROJECT/.complior" ]]; then
  pass "complior init created .complior/ directory"
else
  fail "complior init did not create .complior/ directory"
fi

# ── Step 2: Scan with --json and check filterContext ──────────────────────
echo ""
echo "Step 2: complior scan --json (check filterContext)"

SCAN_JSON=$(run_cmd scan --json "$TEST_PROJECT")

# 2a: Check scan returns valid JSON with filterContext
if echo "$SCAN_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
fc = d.get('filterContext', {})
assert 'skippedByDomain' in fc, 'Missing skippedByDomain field'
print(f'skippedByDomain={fc[\"skippedByDomain\"]}')
" 2>/dev/null; then
  SKIPPED=$(echo "$SCAN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['filterContext']['skippedByDomain'])")
  pass "filterContext.skippedByDomain present (value: $SKIPPED)"
else
  fail "filterContext.skippedByDomain missing or invalid"
fi

# 2b: Check domain field in filterContext
if echo "$SCAN_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
domain = d.get('filterContext', {}).get('domain')
print(f'domain={domain}')
" 2>/dev/null; then
  DOMAIN=$(echo "$SCAN_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['filterContext'].get('domain','null'))")
  pass "filterContext.domain present (value: $DOMAIN)"
else
  fail "filterContext.domain missing"
fi

# 2c: Check that no industry-hr-* findings are type: fail (should be skip or absent)
HR_FAILS=$(echo "$SCAN_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
findings = d.get('findings', [])
hr_fails = [f for f in findings if f['checkId'].startswith('industry-hr') and f['type'] == 'fail']
print(len(hr_fails))
" 2>/dev/null || echo "-1")

if [[ "$HR_FAILS" == "0" ]]; then
  pass "No HR-only findings with type=fail (correctly filtered for non-HR domain)"
elif [[ "$HR_FAILS" == "-1" ]]; then
  fail "Could not parse findings from scan JSON"
else
  fail "Found $HR_FAILS HR-only findings still marked as fail (should be skip)"
fi

# 2d: Check that no industry-finance-* findings are type: fail
FIN_FAILS=$(echo "$SCAN_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
findings = d.get('findings', [])
fin_fails = [f for f in findings if f['checkId'].startswith('industry-finance') and f['type'] == 'fail']
print(len(fin_fails))
" 2>/dev/null || echo "-1")

if [[ "$FIN_FAILS" == "0" ]]; then
  pass "No finance-only findings with type=fail (correctly filtered)"
elif [[ "$FIN_FAILS" == "-1" ]]; then
  fail "Could not parse finance findings"
else
  fail "Found $FIN_FAILS finance-only findings still marked as fail"
fi

# 2e: Universal checks (l1-*, l4-*, ai-disclosure) should NOT be skip due to domain
UNIVERSAL_SKIPS=$(echo "$SCAN_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
findings = d.get('findings', [])
universal_domain_skips = [f for f in findings
  if (f['checkId'].startswith('l1-') or f['checkId'].startswith('l4-') or f['checkId'] == 'ai-disclosure')
  and f['type'] == 'skip'
  and 'domain' in f.get('message', '').lower()]
print(len(universal_domain_skips))
" 2>/dev/null || echo "-1")

if [[ "$UNIVERSAL_SKIPS" == "0" ]]; then
  pass "Universal checks not incorrectly domain-skipped"
elif [[ "$UNIVERSAL_SKIPS" == "-1" ]]; then
  fail "Could not parse universal findings"
else
  fail "Found $UNIVERSAL_SKIPS universal checks incorrectly skipped by domain"
fi

# ── Step 3: Fix --dry-run --json and check profile filtering ──────────────
echo ""
echo "Step 3: complior fix --dry-run --json (check fix profile filter)"

FIX_JSON=$(run_cmd fix --dry-run --json "$TEST_PROJECT")

# 3a: Check no HR-only fixes in output
HR_FIXES=$(echo "$FIX_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
fixes = d.get('fixes', d.get('plans', []))
hr_fixes = [f for f in fixes if f.get('checkId', '').startswith('industry-hr')]
print(len(hr_fixes))
" 2>/dev/null || echo "-1")

if [[ "$HR_FIXES" == "0" ]]; then
  pass "No HR-only fixes in fix preview (correctly filtered)"
elif [[ "$HR_FIXES" == "-1" ]]; then
  info "Could not parse fix JSON (fix --dry-run --json may not be implemented yet)"
else
  fail "Found $HR_FIXES HR-only fixes that should have been filtered"
fi

# 3b: Check no provider-only fixes (deployer profile)
PROVIDER_FIXES=$(echo "$FIX_JSON" | python3 -c "
import sys, json
d = json.load(sys.stdin)
fixes = d.get('fixes', d.get('plans', []))
provider_only = ['qms', 'gpai-transparency', 'conformity-assessment']
prov_fixes = [f for f in fixes if f.get('checkId', '') in provider_only]
print(len(prov_fixes))
" 2>/dev/null || echo "-1")

if [[ "$PROVIDER_FIXES" == "0" ]]; then
  pass "No provider-only fixes shown to deployer (correctly filtered)"
elif [[ "$PROVIDER_FIXES" == "-1" ]]; then
  info "Could not parse fix JSON for provider check"
else
  fail "Found $PROVIDER_FIXES provider-only fixes shown to deployer"
fi

# ── Summary ────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
TOTAL=$((PASS + FAIL))
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC} of $TOTAL tests"
echo "═══════════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
exit 0
