#!/usr/bin/env bash
# V1-M12: Context-Aware Eval — Acceptance Script
# Verifies that eval context filtering infrastructure works end-to-end.
# Run: bash scripts/verify_eval_context.sh
set -euo pipefail

PASS=0
FAIL=0
TOTAL=0

check() {
  local desc="$1"
  local result="$2"
  TOTAL=$((TOTAL + 1))
  if [ "$result" = "0" ]; then
    echo "  ✅ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $desc"
    FAIL=$((FAIL + 1))
  fi
}

echo "═══════════════════════════════════════════════════"
echo "V1-M12: Context-Aware Eval — Acceptance Checks"
echo "═══════════════════════════════════════════════════"
echo ""

# --- 1. Data files exist ---
echo "§1: Data files"

test -f engine/core/data/eval/test-applicability.json
check "test-applicability.json exists" "$?"

test -f engine/core/data/eval/severity-weights.json
check "severity-weights.json exists" "$?"

# Validate JSON structure
node -e "const d = require('./engine/core/data/eval/test-applicability.json'); if(!d.overrides) throw 'no overrides'" 2>/dev/null
check "test-applicability.json has overrides" "$?"

node -e "const d = require('./engine/core/data/eval/severity-weights.json'); if(!d.weights || d.weights.critical !== 4.0) throw 'bad'" 2>/dev/null
check "severity-weights.json has correct weights" "$?"

echo ""

# --- 2. Types compile ---
echo "§2: Types compile"

cd engine/core
npx tsc --noEmit 2>/dev/null
check "TypeScript compiles without errors" "$?"
cd ../..

echo ""

# --- 3. EvalFilterContext type exists ---
echo "§3: Types exist in source"

grep -q "EvalFilterContext" engine/core/src/types/common.types.ts
check "EvalFilterContext in common.types.ts" "$?"

grep -q "EvalDisclaimer" engine/core/src/types/common.types.ts
check "EvalDisclaimer in common.types.ts" "$?"

grep -q "EvalFilterContextSchema" engine/core/src/types/common.schemas.ts
check "EvalFilterContextSchema in common.schemas.ts" "$?"

grep -q "EvalDisclaimerSchema" engine/core/src/types/common.schemas.ts
check "EvalDisclaimerSchema in common.schemas.ts" "$?"

grep -q "filterContext" engine/core/src/domain/eval/types.ts
check "filterContext field in EvalResult" "$?"

grep -q "disclaimer" engine/core/src/domain/eval/types.ts
check "disclaimer field in EvalResult" "$?"

grep -q "profile" engine/core/src/domain/eval/types.ts
check "profile field in EvalOptions" "$?"

echo ""

# --- 4. RED tests exist ---
echo "§4: RED test files exist"

test -f engine/core/src/domain/eval/eval-role-filter.test.ts
check "eval-role-filter.test.ts exists" "$?"

test -f engine/core/src/domain/eval/eval-risk-filter.test.ts
check "eval-risk-filter.test.ts exists" "$?"

test -f engine/core/src/domain/eval/eval-domain-filter.test.ts
check "eval-domain-filter.test.ts exists" "$?"

test -f engine/core/src/domain/eval/eval-severity-score.test.ts
check "eval-severity-score.test.ts exists" "$?"

test -f engine/core/src/domain/eval/eval-disclaimer.test.ts
check "eval-disclaimer.test.ts exists" "$?"

test -f engine/core/src/domain/eval/eval-timeout-retry.test.ts
check "eval-timeout-retry.test.ts exists" "$?"

test -f engine/core/src/domain/eval/eval-context-integration.test.ts
check "eval-context-integration.test.ts exists" "$?"

echo ""

# --- Summary ---
echo "═══════════════════════════════════════════════════"
echo "Results: $PASS/$TOTAL passed, $FAIL failed"
echo "═══════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
echo "All acceptance checks PASSED ✅"
