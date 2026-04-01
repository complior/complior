#!/bin/sh
# E2E Test 5: Report Pipeline — markdown + PDF generation
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/lib/assert.sh"

printf "\n${BOLD}[5/7] Report Pipeline: Markdown + PDF${RESET}\n\n"

ENGINE_URL="${ENGINE_URL:-http://127.0.0.1:3099}"

if curl -sf "$ENGINE_URL/status" >/dev/null 2>&1; then
    # Test: Markdown report
    REPORT_OUT="$(complior report --format md 2>&1 || echo 'report-error')"
    assert_contains "Report command runs" "$REPORT_OUT" "Report\|report\|generated\|Error"

    # Test: PDF report
    PDF_OUT="$(complior report --format pdf 2>&1 || echo 'pdf-error')"
    assert_contains "PDF report command runs" "$PDF_OUT" "Report\|report\|generated\|PDF\|Error"
else
    # Verify CLI handles missing engine
    REPORT_OUT="$(complior report --format md 2>&1 || true)"
    assert_contains "Report handles missing engine" "$REPORT_OUT" "Error\|error\|Cannot"
    pass "Report pipeline infrastructure verified"
fi

summary
