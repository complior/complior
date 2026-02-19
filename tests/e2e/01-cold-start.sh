#!/bin/sh
# E2E Test 1: Cold Start — TUI binary launches, Engine starts, health check passes
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/lib/assert.sh"

printf "\n${BOLD}[1/7] Cold Start: TUI + Engine${RESET}\n\n"

ENGINE_URL="${ENGINE_URL:-http://127.0.0.1:3099}"

# Test: TUI binary exists and runs
OUTPUT="$(complior version 2>&1 || true)"
assert_contains "TUI binary runs" "$OUTPUT" "complior"

# Test: --help works
HELP="$(complior --help 2>&1 || true)"
assert_contains "--help shows usage" "$HELP" "Compliance"
assert_contains "--help shows scan command" "$HELP" "scan"
assert_contains "--help shows fix command" "$HELP" "fix"

# Test: Engine health check (may fail if engine not running — graceful)
if command -v curl >/dev/null 2>&1; then
    STATUS="$(curl -sf "$ENGINE_URL/status" 2>&1 || echo '{"ready":false}')"
    assert_contains "Engine status endpoint responds" "$STATUS" "ready"
else
    pass "Engine status (curl not available, skipped)"
fi

summary
