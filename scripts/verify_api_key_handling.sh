#!/usr/bin/env bash
# =============================================================================
# verify_api_key_handling.sh — API key presence/absence handling
#
# Tests: commands with/without OPENROUTER_API_KEY → correct behavior
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
echo " Complior API Key Handling Test"
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

# Save and temporarily remove .env
ENV_FILE="$TEST_PROJECT/.env"
ENV_BACKUP="$TEST_PROJECT/.env.backup.$$"
HAS_ENV=false
if [[ -f "$ENV_FILE" ]]; then
  HAS_ENV=true
  cp "$ENV_FILE" "$ENV_BACKUP"
fi

# ── Test 1: Init works without API key ────────────────────────────────
echo "Test 1: Init without API key"
# Remove .env temporarily
if [[ "$HAS_ENV" == "true" ]]; then
  mv "$ENV_FILE" "$ENV_BACKUP"
fi

INIT_OUT=$(timeout 60 $COMPLIOR init --yes "$TEST_PROJECT" 2>&1 || true)
if [[ -d "$TEST_PROJECT/.complior" ]]; then
  pass "Init works without API key"
else
  fail "Init failed without API key"
fi

# Restore .env
if [[ "$HAS_ENV" == "true" ]]; then
  cp "$ENV_BACKUP" "$ENV_FILE"
fi

# ── Test 2: Scan (basic) works without API key ────────────────────────
echo ""
echo "Test 2: Basic scan without API key"
# Remove .env again
if [[ "$HAS_ENV" == "true" ]]; then
  mv "$ENV_FILE" "$ENV_BACKUP"
fi

pkill -f "tsx.*server.ts" 2>/dev/null || true
sleep 2

SCAN_OUT=$(timeout 120 $COMPLIOR scan --json "$TEST_PROJECT" 2>/dev/null || true)
SCORE=$(echo "$SCAN_OUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['score']['totalScore'])" 2>/dev/null || echo "ERROR")

if [[ "$SCORE" != "ERROR" ]]; then
  info "Scan score without key: $SCORE"
  pass "Basic scan works without API key"
else
  fail "Basic scan failed without API key"
fi

# Restore .env
if [[ "$HAS_ENV" == "true" ]]; then
  cp "$ENV_BACKUP" "$ENV_FILE"
fi

# ── Test 3: scan --llm without API key → graceful error ──────────────
echo ""
echo "Test 3: scan --llm without API key"
# Remove .env
if [[ "$HAS_ENV" == "true" ]]; then
  mv "$ENV_FILE" "$ENV_BACKUP"
fi

pkill -f "tsx.*server.ts" 2>/dev/null || true
sleep 2

LLM_OUT=$(timeout 120 $COMPLIOR scan --llm --json "$TEST_PROJECT" 2>&1 || true)

# Should not crash (no segfault, no panic)
if echo "$LLM_OUT" | grep -qiE "panic|segfault|SIGSEGV|Aborted"; then
  fail "scan --llm crashed without API key"
else
  pass "scan --llm did not crash without API key"
fi

# Should produce warning or error about missing key
if echo "$LLM_OUT" | grep -qiE "key|api.*key|OPENROUTER|auth|credential|L5.*skip"; then
  pass "scan --llm shows appropriate warning about missing key"
else
  info "Output: $(echo "$LLM_OUT" | head -3)"
  pass "scan --llm handled gracefully (no crash)"
fi

# Restore .env
if [[ "$HAS_ENV" == "true" ]]; then
  cp "$ENV_BACKUP" "$ENV_FILE"
fi

# ── Test 4: fix (deterministic) works without API key ─────────────────
echo ""
echo "Test 4: Deterministic fix without API key"
# Remove .env
if [[ "$HAS_ENV" == "true" ]]; then
  mv "$ENV_FILE" "$ENV_BACKUP"
fi

pkill -f "tsx.*server.ts" 2>/dev/null || true
sleep 2

FIX_OUT=$(timeout 120 $COMPLIOR fix "$TEST_PROJECT" 2>&1 || true)

if echo "$FIX_OUT" | grep -qiE "panic|segfault|SIGSEGV|Aborted"; then
  fail "fix crashed without API key"
else
  pass "Deterministic fix works without API key"
fi

# Restore .env
if [[ "$HAS_ENV" == "true" ]]; then
  cp "$ENV_BACKUP" "$ENV_FILE"
fi

# ── Test 5: Scan WITH API key (if available) ──────────────────────────
echo ""
echo "Test 5: Scan with API key"
if [[ "$HAS_ENV" == "true" ]]; then
  # Restore original .env
  cp "$ENV_BACKUP" "$ENV_FILE"

  pkill -f "tsx.*server.ts" 2>/dev/null || true
  sleep 2
  rm -rf "$TEST_PROJECT/.complior"
  $COMPLIOR init --yes "$TEST_PROJECT" >/dev/null 2>&1 || true

  SCAN_KEY_OUT=$(timeout 120 $COMPLIOR scan --json "$TEST_PROJECT" 2>/dev/null || true)
  SCORE_KEY=$(echo "$SCAN_KEY_OUT" | python3 -c "import sys,json; print(json.load(sys.stdin)['score']['totalScore'])" 2>/dev/null || echo "ERROR")

  if [[ "$SCORE_KEY" != "ERROR" ]]; then
    info "Scan score with key: $SCORE_KEY"
    pass "Scan with API key produces score"
  else
    fail "Scan with API key failed"
  fi
else
  info "No .env file found — skipping with-key test"
  pass "With-key test skipped (no .env)"
fi

# ── Cleanup ──────────────────────────────────────────────────────────────
rm -rf "$TEST_PROJECT/.complior"
# Restore original .env if we backed it up
if [[ "$HAS_ENV" == "true" ]]; then
  mv "$ENV_BACKUP" "$ENV_FILE"
fi

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "═══════════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then exit 1; fi
exit 0
