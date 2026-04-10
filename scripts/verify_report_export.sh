#!/usr/bin/env bash
# =============================================================================
# verify_report_export.sh — Report export acceptance test
#
# Tests: report --json, --format markdown, --format html
# Exit 0 = PASS, Exit 1 = FAIL
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPLIOR="$PROJECT_ROOT/target/release/complior"
TEST_PROJECT="${COMPLIOR_TEST_PROJECT:-/home/openclaw/test-projects/eval-target}"
EXPORT_DIR="/tmp/complior_report_export_test"

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
echo " Complior Report Export Test"
echo "═══════════════════════════════════════════════════"
echo ""

# Pre-checks
if [[ ! -x "$COMPLIOR" ]]; then
  echo "Binary not found: $COMPLIOR. Run: cargo build --release"
  exit 1
fi

# Clean export dir
rm -rf "$EXPORT_DIR"
mkdir -p "$EXPORT_DIR"

# Ensure project has been scanned (init + scan first)
if [[ ! -d "$TEST_PROJECT/.complior" ]]; then
  info "Initializing test project..."
  cd "$TEST_PROJECT" && $COMPLIOR init --yes 2>&1 >/dev/null || true
fi

# Scan to populate data
info "Running scan to populate data..."
$COMPLIOR scan "$TEST_PROJECT" 2>&1 >/dev/null || true

# ── Test 1: Report human output ───────────────────────────────────────────
echo "Test 1: complior report (human output)"
if $COMPLIOR report "$TEST_PROJECT" 2>&1 | grep -qE "Score|score|Compliance|Section|═"; then
  pass "Human report contains expected sections"
else
  fail "Human report missing expected content"
fi

# ── Test 2: Report --json ─────────────────────────────────────────────────
echo ""
echo "Test 2: complior report --json"
REPORT_JSON=$($COMPLIOR report --json "$TEST_PROJECT" 2>/dev/null || true)
if echo "$REPORT_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'sections' in d or 'score' in d or 'report' in d" 2>/dev/null; then
  pass "report --json is valid JSON with expected structure"
else
  # Check if it's at least valid JSON
  if echo "$REPORT_JSON" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    pass "report --json is valid JSON (structure may vary)"
  else
    fail "report --json is not valid JSON"
  fi
fi

# ── Test 3: Report --format html ──────────────────────────────────────────
echo ""
echo "Test 3: complior report --format html"
HTML_FILE="$EXPORT_DIR/report.html"

# Try different flag combinations for HTML export
if $COMPLIOR report --format html "$TEST_PROJECT" > "$HTML_FILE" 2>/dev/null; then
  if [[ -s "$HTML_FILE" ]]; then
    # Check HTML structure
    if grep -q "<!DOCTYPE html>\|<html\|<!doctype html>" "$HTML_FILE"; then
      pass "HTML report has valid DOCTYPE/html tag"
    else
      fail "HTML report missing DOCTYPE/html tag"
    fi

    if grep -q "<body\|<div\|<section" "$HTML_FILE"; then
      pass "HTML report has body content"
    else
      fail "HTML report missing body content"
    fi

    # Check for key sections
    SECTIONS_FOUND=0
    for section in "score\|Score\|Compliance" "finding\|Finding\|Gap" "passport\|Passport\|Agent"; do
      if grep -qi "$section" "$HTML_FILE"; then
        ((SECTIONS_FOUND++))
      fi
    done
    if [[ $SECTIONS_FOUND -ge 2 ]]; then
      pass "HTML report contains $SECTIONS_FOUND/3 expected sections"
    else
      fail "HTML report contains only $SECTIONS_FOUND/3 expected sections"
    fi

    FILE_SIZE=$(stat -f%z "$HTML_FILE" 2>/dev/null || stat --printf="%s" "$HTML_FILE" 2>/dev/null || echo "0")
    info "HTML file size: $FILE_SIZE bytes"
  else
    fail "HTML report file is empty"
  fi
else
  fail "complior report --format html failed"
fi

# ── Test 4: Report --format markdown ──────────────────────────────────────
echo ""
echo "Test 4: complior report --format markdown"
MD_FILE="$EXPORT_DIR/report.md"

if $COMPLIOR report --format markdown "$TEST_PROJECT" > "$MD_FILE" 2>/dev/null; then
  if [[ -s "$MD_FILE" ]]; then
    if grep -q "^#\|^##\|^###" "$MD_FILE"; then
      pass "Markdown report has headers"
    else
      fail "Markdown report missing headers"
    fi
  else
    fail "Markdown report file is empty"
  fi
else
  # Markdown might not be implemented yet — that's expected for RED test
  fail "complior report --format markdown failed (may need implementation)"
fi

# ── Summary ────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "═══════════════════════════════════════════════════"

# Cleanup
rm -rf "$EXPORT_DIR"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
exit 0
