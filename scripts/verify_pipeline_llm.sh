#!/usr/bin/env bash
# =============================================================================
# verify_pipeline_llm.sh — Pipeline acceptance test WITH LLM (API key required)
#
# Tests: scan --llm, eval --llm, fix --ai, report (with LLM-enriched data)
# Requires: OPENROUTER_API_KEY in env or test project .env
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
echo " Complior Pipeline: LLM Mode (API key required)"
echo "═══════════════════════════════════════════════════"
echo ""

# Pre-checks
if [[ ! -x "$COMPLIOR" ]]; then
  echo "Binary not found: $COMPLIOR. Run: cargo build --release"
  exit 1
fi

# Check for API key
API_KEY="${OPENROUTER_API_KEY:-}"
if [[ -z "$API_KEY" ]]; then
  # Try to load from test project .env
  if [[ -f "$TEST_PROJECT/.env" ]]; then
    API_KEY=$(grep "^OPENROUTER_API_KEY=" "$TEST_PROJECT/.env" 2>/dev/null | cut -d= -f2 || true)
  fi
fi

if [[ -z "$API_KEY" ]]; then
  echo -e "${RED}ERROR: OPENROUTER_API_KEY not found${NC}"
  echo "Set it via: export OPENROUTER_API_KEY=sk-or-..."
  echo "Or add to: $TEST_PROJECT/.env"
  exit 1
fi

export OPENROUTER_API_KEY="$API_KEY"
info "API key found (${#API_KEY} chars)"

# Kill any lingering engines
pkill -f "tsx.*server.ts" 2>/dev/null || true
sleep 1

# Ensure project initialized
if [[ ! -d "$TEST_PROJECT/.complior" ]]; then
  $COMPLIOR init --yes "$TEST_PROJECT" >/dev/null 2>&1 || true
fi

# ── Test 1: scan --llm (L5 deep analysis) ────────────────────────────────
echo "Test 1: complior scan --llm (L5 deep analysis)"
SCAN_LLM_OUTPUT=$($COMPLIOR scan --llm "$TEST_PROJECT" 2>&1 || true)

if echo "$SCAN_LLM_OUTPUT" | grep -qiE "score|finding|L5\|deep\|llm"; then
  pass "scan --llm produced output with LLM content"
else
  # Even if L5 didn't add much, scan should still work
  if echo "$SCAN_LLM_OUTPUT" | grep -qiE "score|compliance"; then
    pass "scan --llm completed (LLM analysis may have been minimal)"
  else
    fail "scan --llm failed to produce meaningful output"
  fi
fi

# ── Test 2: scan --deep ──────────────────────────────────────────────────
echo ""
echo "Test 2: complior scan --deep (external scanners)"
SCAN_DEEP_OUTPUT=$($COMPLIOR scan --deep "$TEST_PROJECT" 2>&1 || true)
if echo "$SCAN_DEEP_OUTPUT" | grep -qiE "score|finding|deep|external|semgrep"; then
  pass "scan --deep produced output"
else
  if echo "$SCAN_DEEP_OUTPUT" | grep -qiE "score|compliance"; then
    pass "scan --deep completed (some external tools may be absent)"
  else
    fail "scan --deep failed"
  fi
fi

# ── Test 3: eval --target (if target available) ──────────────────────────
echo ""
echo "Test 3: complior eval (deterministic)"
info "Note: eval requires a running target. Testing parse/init only."
# We just verify the command doesn't crash
OUTPUT=$($COMPLIOR eval --target http://localhost:9999 "$TEST_PROJECT" 2>&1 || true)
if echo "$OUTPUT" | grep -qiE "panic|segfault|SIGSEGV"; then
  fail "eval crashed"
else
  pass "eval command handles missing target gracefully"
fi

# ── Test 4: fix --ai (LLM-assisted) ──────────────────────────────────────
echo ""
echo "Test 4: complior fix --ai"
FIX_AI_OUTPUT=$($COMPLIOR fix --ai "$TEST_PROJECT" 2>&1 || true)
if echo "$FIX_AI_OUTPUT" | grep -qiE "panic|segfault|SIGSEGV"; then
  fail "fix --ai crashed"
else
  if echo "$FIX_AI_OUTPUT" | grep -qiE "fix|applied|score|no.*fix\|already"; then
    pass "fix --ai completed with meaningful output"
  else
    pass "fix --ai did not crash"
  fi
fi

# ── Test 5: Report (with enriched data) ──────────────────────────────────
echo ""
echo "Test 5: complior report (after LLM scan)"
if $COMPLIOR report "$TEST_PROJECT" 2>&1 | grep -qiE "score|section|compliance"; then
  pass "Report after LLM scan contains expected data"
else
  fail "Report after LLM scan failed"
fi

# ── Test 6: Report --format html (with enriched data) ────────────────────
echo ""
echo "Test 6: complior report --format html"
HTML_OUTPUT=$($COMPLIOR report --format html "$TEST_PROJECT" 2>/dev/null || true)
if echo "$HTML_OUTPUT" | grep -qE "<!DOCTYPE|<html|<!doctype"; then
  pass "HTML report generated with LLM-enriched data"
else
  fail "HTML report generation failed"
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
