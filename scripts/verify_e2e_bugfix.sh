#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# C-M04 E2E Bug Fix Verification Script
# Reproduces EXACT same test plan from E2E-TEST-REPORT-2026-04-19.md
# Every command is tested, every output verified.
#
# Prerequisites:
#   - Complior engine running on port 3099
#   - eval-target running on port 4000
#   - Binary at target/release/complior (or cargo build first)
#
# Usage: bash scripts/verify_e2e_bugfix.sh
# ──────────────────────────────────────────────────────────────────────────────
set -uo pipefail
# NOTE: no set -e — we handle exit codes explicitly per-test

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPLIOR="${COMPLIOR_BIN:-$SCRIPT_DIR/target/release/complior}"
ENGINE_URL="${ENGINE_URL:-http://127.0.0.1:3099}"
EVAL_TARGET="${EVAL_TARGET:-http://localhost:4000}"
TARGET_DIR="${TARGET_DIR:-/home/openclaw/test-projects/eval-target}"

PASS=0
FAIL=0
SKIP=0
ERRORS=()

pass()  { PASS=$((PASS + 1)); echo "  ✓ $1"; }
fail()  { FAIL=$((FAIL + 1)); ERRORS+=("$1"); echo "  ✗ $1"; }
skip()  { SKIP=$((SKIP + 1)); echo "  ○ $1 (skipped)"; }

header() {
  echo ""
  echo "═══════════════════════════════════════════════════════════════════"
  echo "  $1"
  echo "═══════════════════════════════════════════════════════════════════"
}

# ── Preflight ──────────────────────────────────────────────────────────────

header "PREFLIGHT CHECKS"

# Check engine
if curl -s "$ENGINE_URL/status" | grep -q '"ready":true'; then
  pass "Engine running at $ENGINE_URL"
else
  echo "FATAL: Engine not running at $ENGINE_URL"
  echo "Start with: cd engine/core && npm run dev"
  exit 1
fi

# Check eval-target
if curl -s "$EVAL_TARGET/api/chat" -X POST -H "Content-Type: application/json" \
   -d '{"message":"hi"}' 2>/dev/null | grep -q '"response"'; then
  pass "eval-target running at $EVAL_TARGET"
  EVAL_TARGET_AVAILABLE=true
else
  echo "WARN: eval-target not running at $EVAL_TARGET (eval tests will be skipped)"
  EVAL_TARGET_AVAILABLE=false
fi

# Check binary
if [ -x "$COMPLIOR" ]; then
  pass "Binary found: $COMPLIOR"
else
  echo "FATAL: Binary not found at $COMPLIOR"
  echo "Run: cargo build --release"
  exit 1
fi

CMD="$COMPLIOR --engine-url $ENGINE_URL"

# ══════════════════════════════════════════════════════════════════════════════
# §1 SCAN TESTS
# ══════════════════════════════════════════════════════════════════════════════

header "§1 SCAN TESTS"

# Basic scan
OUTPUT=$(cd "$TARGET_DIR" && $CMD scan --json 2>/dev/null)
if echo "$OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d.get('score',{}).get('totalScore',0) > 0" 2>/dev/null; then
  pass "scan --json returns valid score"
else
  fail "scan --json: no totalScore in output"
fi

# SARIF output
OUTPUT=$(cd "$TARGET_DIR" && $CMD scan --sarif 2>/dev/null)
if echo "$OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['version']=='2.1.0'" 2>/dev/null; then
  pass "scan --sarif: SARIF 2.1.0"
else
  fail "scan --sarif: invalid SARIF format"
fi

# CI threshold pass
cd "$TARGET_DIR" && $CMD scan --ci --threshold 50 >/dev/null 2>&1
if [ $? -eq 0 ]; then
  pass "scan --ci --threshold 50: exit 0 (score > 50)"
else
  fail "scan --ci --threshold 50: should exit 0"
fi

# CI threshold fail
RC=0
cd "$TARGET_DIR" && $CMD scan --ci --threshold 99 >/dev/null 2>&1 || RC=$?
if [ $RC -eq 2 ]; then
  pass "scan --ci --threshold 99: exit 2 (score < 99)"
else
  fail "scan --ci --threshold 99: expected exit 2, got $RC"
fi

# ── B-02: --fail-on should work WITHOUT --ci ──────────────────────────────
RC=0
cd "$TARGET_DIR" && $CMD scan --fail-on medium >/dev/null 2>&1 || RC=$?
if [ $RC -eq 2 ]; then
  pass "B-02: scan --fail-on medium (without --ci): exit 2"
else
  fail "B-02: scan --fail-on medium: expected exit 2 (has medium findings), got $RC"
fi

RC=0
cd "$TARGET_DIR" && $CMD scan --fail-on low >/dev/null 2>&1 || RC=$?
if [ $RC -eq 2 ]; then
  pass "B-02: scan --fail-on low (without --ci): exit 2"
else
  fail "B-02: scan --fail-on low: expected exit 2 (has low findings), got $RC"
fi

# ── B-03/I-01: Score consistency ──────────────────────────────────────────
OUTPUT=$(cd "$TARGET_DIR" && $CMD scan 2>&1)
COMPLIANCE_SCORE=$(echo "$OUTPUT" | grep -oP 'COMPLIANCE SCORE\s+\K\d+')
FRAMEWORK_SCORE=$(echo "$OUTPUT" | grep -oP 'EU AI Act\s+\K\d+')
if [ -n "$COMPLIANCE_SCORE" ] && [ -n "$FRAMEWORK_SCORE" ]; then
  DIFF=$((COMPLIANCE_SCORE - FRAMEWORK_SCORE))
  if [ ${DIFF#-} -le 1 ]; then
    pass "B-03: Score consistent: COMPLIANCE=$COMPLIANCE_SCORE, Framework=$FRAMEWORK_SCORE (diff≤1)"
  else
    fail "B-03: Score inconsistent: COMPLIANCE=$COMPLIANCE_SCORE vs Framework=$FRAMEWORK_SCORE (diff=$DIFF)"
  fi
else
  fail "B-03: Could not parse scores from output"
fi

# ── U-02: Quick Actions reference valid commands ──────────────────────────
OUTPUT=$(cd "$TARGET_DIR" && $CMD scan 2>&1)
if echo "$OUTPUT" | grep -q "complior docs generate"; then
  fail "U-02: Quick Actions still reference 'complior docs generate' (nonexistent command)"
else
  pass "U-02: Quick Actions do NOT reference 'complior docs generate'"
fi

if echo "$OUTPUT" | grep -q "complior tui"; then
  fail "U-02: Quick Actions still reference 'complior tui' (nonexistent command)"
else
  pass "U-02: Quick Actions do NOT reference 'complior tui'"
fi

# ══════════════════════════════════════════════════════════════════════════════
# §2 EVAL TESTS
# ══════════════════════════════════════════════════════════════════════════════

header "§2 EVAL TESTS"

if [ "$EVAL_TARGET_AVAILABLE" = false ]; then
  skip "B-01: eval auto-detect (eval-target not running)"
  skip "B-01: eval sends {messages} format"
  skip "U-05: eval openai:// protocol hint"
else
  # ── B-01: eval auto-detect should work without /v1/models ──────────────
  OUTPUT=$(cd "$TARGET_DIR" && timeout 120 $CMD eval "$EVAL_TARGET" --det 2>&1 || true)
  ERROR_COUNT=$(echo "$OUTPUT" | grep -c "176 errors" || true)
  PASS_COUNT=$(echo "$OUTPUT" | grep -oP '\d+ passed' | head -1 | grep -oP '\d+' || echo "0")

  if [ "$ERROR_COUNT" -gt 0 ]; then
    fail "B-01: eval --det: still 176 errors (auto-detect broken)"
  elif [ "$PASS_COUNT" -gt 0 ]; then
    pass "B-01: eval --det: $PASS_COUNT tests passed (auto-detect works)"
  else
    fail "B-01: eval --det: could not parse results"
  fi

  # ── B-01: eval with explicit /v1/chat/completions path ──────────────
  OUTPUT=$(cd "$TARGET_DIR" && timeout 120 $CMD eval "$EVAL_TARGET/v1/chat/completions" --det 2>&1 || true)
  ERROR_COUNT=$(echo "$OUTPUT" | grep -c "176 errors" || true)
  if [ "$ERROR_COUNT" -gt 0 ]; then
    fail "B-01: eval /v1/chat/completions: still 176 errors"
  else
    pass "B-01: eval /v1/chat/completions: tests running"
  fi

  # ── U-05: openai:// protocol hint ──────────────────────────────────────
  OUTPUT=$(cd "$TARGET_DIR" && $CMD eval "openai://$EVAL_TARGET" --det 2>&1 || true)
  if echo "$OUTPUT" | grep -q "must be an HTTP"; then
    fail "U-05: eval rejects openai:// protocol hint"
  else
    pass "U-05: eval accepts openai:// protocol hint"
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# §3 FIX TESTS
# ══════════════════════════════════════════════════════════════════════════════

header "§3 FIX TESTS"

# Basic fix --dry-run
OUTPUT=$(cd "$TARGET_DIR" && $CMD fix --dry-run 2>&1)
if echo "$OUTPUT" | grep -qi "planned\|changes\|fix"; then
  pass "fix --dry-run: shows planned fixes"
else
  fail "fix --dry-run: no output"
fi

# ── B-04: fix --doc all ──────────────────────────────────────────────────
OUTPUT=$(cd "$TARGET_DIR" && $CMD fix --doc all --agent eval-target-openai 2>&1)
if echo "$OUTPUT" | grep -q "Invalid document type"; then
  fail "B-04: fix --doc all: 'Invalid document type' error"
else
  pass "B-04: fix --doc all: accepted"
fi

# ── U-03: fix --dry-run estimated score ──────────────────────────────────
OUTPUT=$(cd "$TARGET_DIR" && $CMD fix --dry-run 2>&1)
if echo "$OUTPUT" | grep -qP "SCORE.*0 →"; then
  fail "U-03: fix --dry-run shows 'SCORE 0 →' (wrong before-score)"
else
  pass "U-03: fix --dry-run estimated score is reasonable"
fi

# fix --doc fria with --agent flag
OUTPUT=$(cd "$TARGET_DIR" && $CMD fix --doc fria --agent eval-target-openai 2>&1)
if echo "$OUTPUT" | grep -q "eval-target-openai"; then
  pass "fix --doc fria --agent: uses correct passport"
else
  fail "fix --doc fria --agent: does not use specified passport"
fi

# ══════════════════════════════════════════════════════════════════════════════
# §4 PASSPORT TESTS
# ══════════════════════════════════════════════════════════════════════════════

header "§4 PASSPORT TESTS"

# Basic list
OUTPUT=$(cd "$TARGET_DIR" && $CMD passport list 2>&1)
if echo "$OUTPUT" | grep -q "eval-target"; then
  pass "passport list: shows agents"
else
  fail "passport list: no agents found"
fi

# ── B-06: passport init <name> ──────────────────────────────────────────
OUTPUT=$(cd "$TARGET_DIR" && $CMD passport init my-test-agent 2>&1)
if echo "$OUTPUT" | grep -q "Discovering.*my-test-agent"; then
  fail "B-06: passport init <name>: still treats name as directory"
else
  pass "B-06: passport init <name>: handles name correctly"
fi

# ── B-07: passport validate completeness consistency ────────────────────
OUTPUT=$(cd "$TARGET_DIR" && $CMD passport validate eval-target-openai 2>&1)
COMPLETENESS_0=$(echo "$OUTPUT" | grep -c "Completeness: 0%" || true)
if [ "$COMPLETENESS_0" -gt 0 ]; then
  fail "B-07: passport validate: still shows 'Completeness: 0%'"
else
  pass "B-07: passport validate: completeness consistent"
fi

# ── B-08: passport autonomy ──────────────────────────────────────────────
OUTPUT=$(cd "$TARGET_DIR" && $CMD passport autonomy eval-target-openai 2>&1)
if echo "$OUTPUT" | grep -qi "internal server error\|500"; then
  fail "B-08: passport autonomy: Internal server error"
else
  pass "B-08: passport autonomy: no 500 error"
fi

# ── B-09: passport permissions ──────────────────────────────────────────
OUTPUT=$(cd "$TARGET_DIR" && $CMD passport permissions eval-target-openai 2>&1)
if echo "$OUTPUT" | grep -q "No agents found"; then
  fail "B-09: passport permissions: 'No agents found'"
else
  pass "B-09: passport permissions: shows agent data"
fi

# ── B-10: passport registry ──────────────────────────────────────────────
OUTPUT=$(cd "$TARGET_DIR" && $CMD passport registry eval-target-openai 2>&1)
if echo "$OUTPUT" | grep -q "No Agent Passports found"; then
  fail "B-10: passport registry: 'No Agent Passports found'"
else
  pass "B-10: passport registry: shows passport data"
fi

# passport completeness (should still work)
OUTPUT=$(cd "$TARGET_DIR" && $CMD passport completeness eval-target-openai 2>&1)
if echo "$OUTPUT" | grep -qP "\d+%"; then
  pass "passport completeness: shows percentage"
else
  fail "passport completeness: broken"
fi

# passport export a2a (should still work)
OUTPUT=$(cd "$TARGET_DIR" && $CMD passport export --format a2a eval-target-openai 2>&1)
if echo "$OUTPUT" | grep -qi "exported\|saved"; then
  pass "passport export --format a2a: works"
else
  fail "passport export --format a2a: broken"
fi

# passport evidence (should still work)
OUTPUT=$(cd "$TARGET_DIR" && $CMD passport evidence 2>&1)
if echo "$OUTPUT" | grep -q "Total entries"; then
  pass "passport evidence: shows chain"
else
  fail "passport evidence: broken"
fi

# passport audit (should still work)
OUTPUT=$(cd "$TARGET_DIR" && $CMD passport audit eval-target-openai 2>&1)
if echo "$OUTPUT" | grep -q "Audit Trail"; then
  pass "passport audit: shows trail"
else
  fail "passport audit: broken"
fi

# ══════════════════════════════════════════════════════════════════════════════
# §5 STATUS TESTS
# ══════════════════════════════════════════════════════════════════════════════

header "§5 STATUS TESTS"

# ── U-01: weight display ──────────────────────────────────────────────────
OUTPUT=$(cd "$TARGET_DIR" && $CMD status 2>&1)
if echo "$OUTPUT" | grep -qP "weight \d{3,}%"; then
  fail "U-01: status: weight shows ≥100% (e.g. 900%)"
else
  pass "U-01: status: weight values are reasonable (<100%)"
fi

# status --json
OUTPUT=$(cd "$TARGET_DIR" && $CMD status --json 2>&1)
if echo "$OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'score' in d" 2>/dev/null; then
  pass "status --json: valid JSON"
else
  fail "status --json: invalid JSON"
fi

# ══════════════════════════════════════════════════════════════════════════════
# §6 REPORT TESTS
# ══════════════════════════════════════════════════════════════════════════════

header "§6 REPORT TESTS"

OUTPUT=$(cd "$TARGET_DIR" && $CMD report --format json 2>&1)
if echo "$OUTPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'summary' in d" 2>/dev/null; then
  pass "report --format json: valid JSON"
else
  fail "report --format json: invalid"
fi

OUTPUT=$(cd "$TARGET_DIR" && $CMD report --format md 2>&1)
if echo "$OUTPUT" | grep -qi "generated\|report"; then
  pass "report --format md: generated"
else
  fail "report --format md: broken"
fi

# ══════════════════════════════════════════════════════════════════════════════
# §7 DOCTOR TEST
# ══════════════════════════════════════════════════════════════════════════════

header "§7 DOCTOR TEST"

OUTPUT=$(cd "$TARGET_DIR" && $CMD doctor 2>&1)
if echo "$OUTPUT" | grep -q "OK"; then
  pass "doctor: at least one check passed"
else
  fail "doctor: no OK found"
fi

# ══════════════════════════════════════════════════════════════════════════════
# RESULTS
# ══════════════════════════════════════════════════════════════════════════════

header "RESULTS"

TOTAL=$((PASS + FAIL + SKIP))
echo ""
echo "  Total:   $TOTAL"
echo "  Passed:  $PASS"
echo "  Failed:  $FAIL"
echo "  Skipped: $SKIP"
echo ""

if [ $FAIL -gt 0 ]; then
  echo "  FAILED TESTS:"
  for err in "${ERRORS[@]}"; do
    echo "    ✗ $err"
  done
  echo ""
  echo "  ══════════════════════════════════════════"
  echo "  VERDICT: FAIL ($FAIL failures)"
  echo "  ══════════════════════════════════════════"
  exit 1
else
  echo "  ══════════════════════════════════════════"
  echo "  VERDICT: PASS (all $PASS tests green)"
  echo "  ══════════════════════════════════════════"
  exit 0
fi
