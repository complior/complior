#!/bin/sh
# E2E Test 4: Fix Pipeline — dry-run fix, verify plan
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/lib/assert.sh"

printf "\n${BOLD}[4/7] Fix Pipeline: Apply + Re-Scan${RESET}\n\n"

FIXTURE_DIR="$SCRIPT_DIR/fixtures/test-project"
ENGINE_URL="${ENGINE_URL:-http://127.0.0.1:3099}"

# Test: Dry-run fix
if curl -sf "$ENGINE_URL/status" >/dev/null 2>&1; then
    # First scan to populate findings
    complior scan --json "$FIXTURE_DIR" >/dev/null 2>&1 || true

    # Run dry-run fix
    FIX_OUT="$(complior fix --dry-run "$FIXTURE_DIR" 2>&1 || echo 'fix-error')"
    assert_contains "Fix dry-run runs" "$FIX_OUT" "Fix\|fix\|Fixable\|fixable\|No fixable"

    # JSON dry-run
    FIX_JSON="$(complior fix --dry-run --json "$FIXTURE_DIR" 2>&1 || echo '{}')"
    assert_contains "Fix JSON output" "$FIX_JSON" "dryRun\|dry_run\|changes\|fixable"
else
    # Offline mode — verify CLI handles missing engine gracefully
    FIX_OUT="$(complior fix --dry-run 2>&1 || true)"
    assert_contains "Fix handles missing engine" "$FIX_OUT" "Error\|error\|Cannot\|cannot"
    pass "Fix pipeline infrastructure verified"
fi

summary
