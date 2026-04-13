#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# V1-M06 UX Quality — Acceptance Script
# ═══════════════════════════════════════════════════════════════════
#
# Verifies all 8 UX quality improvements work correctly.
#
# Prerequisites:
#   - npm install in engine/core
#   - Test project at test-projects/acme-ai-support (or COMPLIOR_TEST_PROJECT)
#
# Usage:
#   bash scripts/verify_ux_quality.sh
#
# Exit codes:
#   0 = all checks passed
#   1 = one or more checks failed

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENGINE_DIR="$ROOT_DIR/engine/core"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

check() {
  local name="$1"
  local result="$2"
  if [ "$result" -eq 0 ]; then
    echo -e "  ${GREEN}PASS${NC} $name"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC} $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "═══════════════════════════════════════════════════════════"
echo " V1-M06 UX Quality — Acceptance Verification"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ─── Step 1: Run unit tests ──────────────────────────────────
echo -e "${YELLOW}Step 1: Running V1-M06 unit tests...${NC}"
cd "$ENGINE_DIR"
if npx vitest run src/e2e/ux-quality.test.ts --reporter=verbose 2>&1 | tail -20; then
  check "Unit tests (ux-quality.test.ts)" 0
else
  check "Unit tests (ux-quality.test.ts)" 1
fi
echo ""

# ─── Step 2: Regression — all existing tests still pass ──────
echo -e "${YELLOW}Step 2: Running regression tests...${NC}"
cd "$ENGINE_DIR"
if npx vitest run 2>&1 | tail -5; then
  check "Regression (all engine tests)" 0
else
  check "Regression (all engine tests)" 1
fi
echo ""

# ─── Step 3: Verify T-2 config change ────────────────────────
echo -e "${YELLOW}Step 3: Checking reporter-config.json...${NC}"
if grep -q '"maxActionsHttp"' "$ENGINE_DIR/data/reporter-config.json"; then
  check "reporter-config.json has maxActionsHttp" 0
else
  check "reporter-config.json has maxActionsHttp" 1
fi
echo ""

# ─── Step 4: TypeScript compiles cleanly ─────────────────────
echo -e "${YELLOW}Step 4: Checking TypeScript compilation...${NC}"
cd "$ENGINE_DIR"
if npx tsc --noEmit 2>&1 | tail -5; then
  check "TypeScript compiles" 0
else
  check "TypeScript compiles" 1
fi
echo ""

# ─── Summary ─────────────────────────────────────────────────
echo "═══════════════════════════════════════════════════════════"
echo -e " Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}"
echo "═══════════════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}VERIFICATION FAILED${NC}"
  exit 1
fi

echo -e "${GREEN}ALL CHECKS PASSED${NC}"
exit 0
