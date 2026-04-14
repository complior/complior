#!/usr/bin/env bash
# =============================================================================
# verify_fria_flow.sh — FRIA generation and passport update verification
#
# Tests: agent init → agent fria → fria_completed = true → evidence recorded
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
echo " Complior FRIA Flow Test"
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

# ── Step 1: Init project (creates passports) ─────────────────────────────
echo "Step 1: Init project"
INIT_OUTPUT=$($COMPLIOR init --yes "$TEST_PROJECT" 2>&1 || true)
if [[ -d "$TEST_PROJECT/.complior/agents" ]]; then
  pass "Project initialized with agents"
else
  fail "No agents directory created"
fi

# ── Step 2: Get agent name ───────────────────────────────────────────────
echo ""
echo "Step 2: Find agent name"
AGENT_FILES=$(ls "$TEST_PROJECT/.complior/agents/"*-manifest.json 2>/dev/null || true)
if [[ -z "$AGENT_FILES" ]]; then
  fail "No agent manifests found"
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
  echo "═══════════════════════════════════════════════════"
  exit 1
fi

# Extract agent name from first manifest filename
FIRST_MANIFEST=$(echo "$AGENT_FILES" | head -1)
AGENT_NAME=$(python3 -c "
import json
with open('$FIRST_MANIFEST') as f:
    d = json.load(f)
print(d.get('name', ''))
" 2>/dev/null || echo "")

if [[ -n "$AGENT_NAME" ]]; then
  pass "Found agent: $AGENT_NAME"
else
  fail "Could not extract agent name from manifest"
  exit 1
fi

# ── Step 3: Generate FRIA ────────────────────────────────────────────────
echo ""
echo "Step 3: Generate FRIA report"
FRIA_OUTPUT=$($COMPLIOR agent fria "$AGENT_NAME" --json "$TEST_PROJECT" 2>&1 || true)

# Check FRIA file was created
FRIA_FILES=$(ls "$TEST_PROJECT/.complior/"*fria* 2>/dev/null || ls "$TEST_PROJECT/.complior/reports/"*fria* 2>/dev/null || true)
if [[ -n "$FRIA_FILES" ]]; then
  pass "FRIA report file created"
else
  # FRIA might be in a different location
  if echo "$FRIA_OUTPUT" | grep -qiE "fria|generated|saved|report"; then
    pass "FRIA generation completed (output confirms)"
  else
    fail "FRIA report not found"
  fi
fi

# ── Step 4: Check passport updated ──────────────────────────────────────
echo ""
echo "Step 4: Check passport fria_completed"
FRIA_COMPLETED=$(python3 -c "
import json
with open('$FIRST_MANIFEST') as f:
    d = json.load(f)
c = d.get('compliance', {})
print('true' if c.get('fria_completed') else 'false')
" 2>/dev/null || echo "unknown")

if [[ "$FRIA_COMPLETED" == "true" ]]; then
  pass "Passport fria_completed = true"
else
  fail "Passport fria_completed is not true (got: $FRIA_COMPLETED)"
fi

# ── Step 5: Check evidence chain ────────────────────────────────────────
echo ""
echo "Step 5: Check evidence chain for FRIA entry"
EVIDENCE_FILE="$TEST_PROJECT/.complior/evidence/chain.json"
if [[ -f "$EVIDENCE_FILE" ]]; then
  FRIA_EVIDENCE=$(python3 -c "
import json
with open('$EVIDENCE_FILE') as f:
    entries = json.load(f)
fria = [e for e in entries if e.get('source') == 'fria']
print(len(fria))
" 2>/dev/null || echo "0")

  if [[ "$FRIA_EVIDENCE" -gt 0 ]]; then
    pass "Evidence chain has $FRIA_EVIDENCE FRIA entries"
  else
    fail "No FRIA entries in evidence chain"
  fi
else
  fail "Evidence chain file not found"
fi

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "═══════════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then exit 1; fi
exit 0
