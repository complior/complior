#!/usr/bin/env bash
# =============================================================================
# test_complior.sh — Unified test runner: TS Engine + Rust CLI + SDK
#
# Runs all 3 test suites, collects results, prints summary table.
# Exit 0 = ALL PASS, Exit 1 = ANY FAIL
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

TOTAL_PASS=0
TOTAL_FAIL=0
RESULTS=()

echo "═══════════════════════════════════════════════════"
echo " Complior Unified Test Runner"
echo "═══════════════════════════════════════════════════"
echo ""

# ── Suite 1: TypeScript Engine ──────────────────────────────────────────
echo "Suite 1: TypeScript Engine (vitest)"
TS_OUTPUT=$(cd "$PROJECT_ROOT/engine/core" && npx vitest run --reporter=verbose 2>&1 || true)
TS_PASSED=$(echo "$TS_OUTPUT" | grep -oP '\d+ passed' | tail -1 || echo "0 passed")
TS_FAILED=$(echo "$TS_OUTPUT" | grep -oP '\d+ failed' | tail -1 || echo "")
TS_PASS_NUM=$(echo "$TS_PASSED" | grep -oP '\d+' || echo "0")
TS_FAIL_NUM=$(echo "$TS_FAILED" | grep -oP '\d+' || echo "0")

if echo "$TS_OUTPUT" | grep -qE "Tests.*passed"; then
  TS_STATUS="✓ PASS"
  TS_COLOR="$GREEN"
else
  TS_STATUS="✗ FAIL"
  TS_COLOR="$RED"
  ((TOTAL_FAIL++)) || true
fi
((TOTAL_PASS++)) || true
RESULTS+=("TS Engine|$TS_PASS_NUM|$TS_FAIL_NUM|$TS_STATUS|$TS_COLOR")
echo -e "  ${TS_COLOR}${TS_STATUS}${NC} — $TS_PASSED${TS_FAILED:+, $TS_FAILED}"

# ── Suite 2: Rust CLI ──────────────────────────────────────────────────
echo ""
echo "Suite 2: Rust CLI (cargo test)"
RUST_OUTPUT=$(cargo test --manifest-path "$PROJECT_ROOT/cli/Cargo.toml" 2>&1 || true)
RUST_PASSED=$(echo "$RUST_OUTPUT" | grep -oP '\d+ passed' | head -1 || echo "0 passed")
RUST_FAILED=$(echo "$RUST_OUTPUT" | grep -oP '\d+ failed' | head -1 || echo "")
RUST_PASS_NUM=$(echo "$RUST_PASSED" | grep -oP '\d+' || echo "0")
RUST_FAIL_NUM=$(echo "$RUST_FAILED" | grep -oP '\d+' || echo "0")

if echo "$RUST_OUTPUT" | grep -q "test result: ok"; then
  RUST_STATUS="✓ PASS"
  RUST_COLOR="$GREEN"
else
  RUST_STATUS="✗ FAIL"
  RUST_COLOR="$RED"
  ((TOTAL_FAIL++)) || true
fi
((TOTAL_PASS++)) || true
RESULTS+=("Rust CLI|$RUST_PASS_NUM|$RUST_FAIL_NUM|$RUST_STATUS|$RUST_COLOR")
echo -e "  ${RUST_COLOR}${RUST_STATUS}${NC} — $RUST_PASSED${RUST_FAILED:+, $RUST_FAILED}"

# ── Suite 3: SDK ────────────────────────────────────────────────────────
echo ""
echo "Suite 3: SDK (vitest)"
if [[ -d "$PROJECT_ROOT/engine/sdk" ]]; then
  SDK_OUTPUT=$(cd "$PROJECT_ROOT/engine/sdk" && npx vitest run 2>&1 || true)
  SDK_PASSED=$(echo "$SDK_OUTPUT" | grep -oP '\d+ passed' | tail -1 || echo "0 passed")
  SDK_FAILED=$(echo "$SDK_OUTPUT" | grep -oP '\d+ failed' | tail -1 || echo "")
  SDK_PASS_NUM=$(echo "$SDK_PASSED" | grep -oP '\d+' || echo "0")
  SDK_FAIL_NUM=$(echo "$SDK_FAILED" | grep -oP '\d+' || echo "0")

  if echo "$SDK_OUTPUT" | grep -qE "Tests.*passed"; then
    SDK_STATUS="✓ PASS"
    SDK_COLOR="$GREEN"
  else
    SDK_STATUS="✗ FAIL"
    SDK_COLOR="$RED"
    ((TOTAL_FAIL++)) || true
  fi
  ((TOTAL_PASS++)) || true
  RESULTS+=("SDK|$SDK_PASS_NUM|$SDK_FAIL_NUM|$SDK_STATUS|$SDK_COLOR")
  echo -e "  ${SDK_COLOR}${SDK_STATUS}${NC} — $SDK_PASSED${SDK_FAILED:+, $SDK_FAILED}"
else
  RESULTS+=("SDK|0|0|⊘ SKIP|$YELLOW")
  echo -e "  ${YELLOW}⊘ SKIP${NC} — SDK directory not found"
fi

# ── Summary Table ────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo -e " ${BOLD}Summary${NC}"
echo "═══════════════════════════════════════════════════"
printf "  %-12s  %8s  %8s  %s\n" "Suite" "Passed" "Failed" "Status"
printf "  %-12s  %8s  %8s  %s\n" "────────────" "────────" "────────" "──────"

ALL_PASS=0
ALL_FAIL=0
for result in "${RESULTS[@]}"; do
  IFS='|' read -r name passed failed status color <<< "$result"
  printf "  %-12s  %8s  %8s  " "$name" "$passed" "$failed"
  echo -e "${color}${status}${NC}"
  ALL_PASS=$((ALL_PASS + passed))
  ALL_FAIL=$((ALL_FAIL + failed))
done

printf "  %-12s  %8s  %8s\n" "────────────" "────────" "────────"
printf "  %-12s  %8s  %8s\n" "TOTAL" "$ALL_PASS" "$ALL_FAIL"
echo "═══════════════════════════════════════════════════"

if [[ $ALL_FAIL -gt 0 || $TOTAL_FAIL -gt 0 ]]; then
  echo -e "  ${RED}RESULT: FAIL${NC}"
  exit 1
fi

echo -e "  ${GREEN}RESULT: ALL PASS${NC}"
exit 0
