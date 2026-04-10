#!/usr/bin/env bash
# =============================================================================
# verify_pipeline_no_key.sh — Pipeline graceful degradation WITHOUT API key
#
# Tests: scan, eval, fix commands without OPENROUTER_API_KEY
# Should NOT crash — should show warnings/errors gracefully
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

pass() { ((PASS++)); echo -e "  ${GREEN}✓${NC} $1"; }
fail() { ((FAIL++)); echo -e "  ${RED}✗${NC} $1"; }
info() { echo -e "  ${YELLOW}→${NC} $1"; }

echo "═══════════════════════════════════════════════════"
echo " Complior Pipeline: No API Key (Graceful Degradation)"
echo "═══════════════════════════════════════════════════"
echo ""

# Pre-checks
if [[ ! -x "$COMPLIOR" ]]; then
  echo "Binary not found: $COMPLIOR. Run: cargo build --release"
  exit 1
fi

# Ensure NO API key is set
unset OPENROUTER_API_KEY 2>/dev/null || true
unset OPENAI_API_KEY 2>/dev/null || true

# Remove .env from test project if it has a key
ENV_FILE="$TEST_PROJECT/.env"
if [[ -f "$ENV_FILE" ]]; then
  ENV_BACKUP="$ENV_FILE.bak.$$"
  cp "$ENV_FILE" "$ENV_BACKUP"
  # Comment out API keys
  sed -i 's/^OPENROUTER_API_KEY/# OPENROUTER_API_KEY/' "$ENV_FILE" 2>/dev/null || true
  sed -i 's/^OPENAI_API_KEY/# OPENAI_API_KEY/' "$ENV_FILE" 2>/dev/null || true
fi

# Ensure project is initialized
if [[ ! -d "$TEST_PROJECT/.complior" ]]; then
  cd "$TEST_PROJECT" && $COMPLIOR init --yes 2>&1 >/dev/null || true
fi

# ── Test 1: Basic scan works without key ──────────────────────────────────
echo "Test 1: complior scan (no key, basic) — should WORK"
if $COMPLIOR scan "$TEST_PROJECT" 2>&1 | grep -qiE "score|finding|compliance"; then
  pass "Basic scan works without API key"
else
  fail "Basic scan failed without API key"
fi

# ── Test 2: scan --llm without key → graceful error ──────────────────────
echo ""
echo "Test 2: complior scan --llm (no key) — should show ERROR, not crash"
OUTPUT=$($COMPLIOR scan --llm "$TEST_PROJECT" 2>&1 || true)
EXIT_CODE=$?

# It should either error gracefully or run without LLM
if echo "$OUTPUT" | grep -qiE "key|api.*required|no.*key|missing.*key|skipping.*llm|error"; then
  pass "scan --llm without key shows appropriate message"
elif [[ $EXIT_CODE -eq 0 ]]; then
  info "scan --llm without key exited 0 (may have skipped LLM silently)"
  pass "scan --llm without key did not crash"
else
  # Non-zero exit is OK if it's a clean error message (not a panic/segfault)
  if echo "$OUTPUT" | grep -qiE "panic|segfault|SIGSEGV|core dump"; then
    fail "scan --llm without key caused a crash"
  else
    pass "scan --llm without key exited with error (no crash)"
  fi
fi

# ── Test 3: eval without key (deterministic) — should WORK ───────────────
echo ""
echo "Test 3: complior eval --target (deterministic, no key) — should WORK"
# Note: eval needs a running target, so we just check it doesn't crash on startup
OUTPUT=$($COMPLIOR eval --target http://localhost:9999 "$TEST_PROJECT" 2>&1 || true)
# Connection refused is expected (no target running), but it shouldn't panic
if echo "$OUTPUT" | grep -qiE "panic|segfault|SIGSEGV|core dump"; then
  fail "eval --target without key caused a crash"
else
  pass "eval --target without key: no crash (connection refused is expected)"
fi

# ── Test 4: eval --llm without key → graceful error ──────────────────────
echo ""
echo "Test 4: complior eval --llm (no key) — should show ERROR, not crash"
OUTPUT=$($COMPLIOR eval --llm --target http://localhost:9999 "$TEST_PROJECT" 2>&1 || true)
if echo "$OUTPUT" | grep -qiE "panic|segfault|SIGSEGV|core dump"; then
  fail "eval --llm without key caused a crash"
else
  pass "eval --llm without key: no crash"
fi

# ── Test 5: fix --ai without key → graceful error ────────────────────────
echo ""
echo "Test 5: complior fix --ai (no key) — should show ERROR, not crash"
OUTPUT=$($COMPLIOR fix --ai "$TEST_PROJECT" 2>&1 || true)
if echo "$OUTPUT" | grep -qiE "panic|segfault|SIGSEGV|core dump"; then
  fail "fix --ai without key caused a crash"
else
  if echo "$OUTPUT" | grep -qiE "key|api.*required|no.*key|missing|error"; then
    pass "fix --ai without key shows appropriate error message"
  else
    pass "fix --ai without key: no crash"
  fi
fi

# ── Test 6: report works without key ──────────────────────────────────────
echo ""
echo "Test 6: complior report (no key) — should WORK"
if $COMPLIOR report "$TEST_PROJECT" 2>&1 | grep -qiE "score|section|compliance|report"; then
  pass "Report works without API key"
else
  fail "Report failed without API key"
fi

# ── Restore .env ──────────────────────────────────────────────────────────
if [[ -f "${ENV_BACKUP:-}" ]]; then
  mv "$ENV_BACKUP" "$ENV_FILE"
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
