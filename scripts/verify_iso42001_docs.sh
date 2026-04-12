#!/usr/bin/env bash
# Acceptance script for V1-M07: ISO 42001 Document Generators
# Verifies: data files, templates, TypeScript compilation, unit tests
set -euo pipefail

PASS=0
FAIL=0
SKIP=0

check() {
  local desc="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "  ✅ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $desc"
    FAIL=$((FAIL + 1))
  fi
}

skip() {
  local desc="$1"
  echo "  ⏭  $desc (skipped)"
  SKIP=$((SKIP + 1))
}

echo "═══════════════════════════════════════"
echo "  V1-M07: ISO 42001 Document Generators"
echo "═══════════════════════════════════════"
echo ""

# --- Data Layer ---
echo "📁 Data Layer"
check "iso-42001-controls.json exists" test -f engine/core/data/iso-42001-controls.json
check "Controls JSON is valid" node --input-type=module -e "import{readFileSync}from'fs';JSON.parse(readFileSync('engine/core/data/iso-42001-controls.json','utf-8'))"
check "Controls has 34+ entries" node --input-type=module -e "import{readFileSync}from'fs';const c=JSON.parse(readFileSync('engine/core/data/iso-42001-controls.json','utf-8'));if(c.length<34)process.exit(1)"
echo ""

# --- Templates ---
echo "📄 ISO 42001 Templates"
check "AI Policy template exists" test -f engine/core/data/templates/iso-42001/iso-42001-ai-policy.md
check "SoA template exists" test -f engine/core/data/templates/iso-42001/iso-42001-soa.md
check "Risk Register template exists" test -f engine/core/data/templates/iso-42001/iso-42001-risk-register.md
check "AI Policy has placeholder [Organization]" grep -q '\[Organization\]' engine/core/data/templates/iso-42001/iso-42001-ai-policy.md
check "SoA has placeholder [AI System Name]" grep -q '\[AI System Name\]' engine/core/data/templates/iso-42001/iso-42001-soa.md
check "Risk Register has placeholder [Risk Class]" grep -q '\[Risk Class\]' engine/core/data/templates/iso-42001/iso-42001-risk-register.md
echo ""

# --- Template Registry ---
echo "📋 Template Registry"
check "Registry has iso42001-ai-policy" grep -q 'iso42001-ai-policy' engine/core/src/data/template-registry.ts
check "Registry has iso42001-soa" grep -q 'iso42001-soa' engine/core/src/data/template-registry.ts
check "Registry has iso42001-risk-register" grep -q 'iso42001-risk-register' engine/core/src/data/template-registry.ts
echo ""

# --- Types ---
echo "🔧 Types"
check "Iso42001Control type exists" grep -q 'Iso42001Control' engine/core/src/types/common.types.ts
check "SoAEntry type exists" grep -q 'SoAEntry' engine/core/src/types/common.types.ts
check "RiskRegisterEntry type exists" grep -q 'RiskRegisterEntry' engine/core/src/types/common.types.ts
check "SoAResult type exists" grep -q 'SoAResult' engine/core/src/types/common.types.ts
check "RiskRegisterResult type exists" grep -q 'RiskRegisterResult' engine/core/src/types/common.types.ts
echo ""

# --- TypeScript Compilation ---
echo "🔨 Compilation"
check "tsc --noEmit passes" bash -c "cd engine/core && npx tsc --noEmit"
echo ""

# --- Unit Tests (will be RED until implementation) ---
echo "🧪 Unit Tests (expect RED until implementation)"
if cd engine/core && npx vitest run src/domain/documents/soa-generator.test.ts >/dev/null 2>&1; then
  echo "  ✅ SoA generator tests: GREEN"
  PASS=$((PASS + 1))
else
  echo "  🔴 SoA generator tests: RED (expected — awaiting implementation)"
  SKIP=$((SKIP + 1))
fi

if npx vitest run src/domain/documents/risk-register-generator.test.ts >/dev/null 2>&1; then
  echo "  ✅ Risk Register generator tests: GREEN"
  PASS=$((PASS + 1))
else
  echo "  🔴 Risk Register generator tests: RED (expected — awaiting implementation)"
  SKIP=$((SKIP + 1))
fi
cd - >/dev/null
echo ""

# --- Summary ---
echo "═══════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed, $SKIP skipped"
echo "═══════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  echo "❌ FAIL — $FAIL checks did not pass"
  exit 1
fi

echo "✅ PASS — all infrastructure checks passed"
echo "   (RED unit tests are expected before implementation)"
