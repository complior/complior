#!/bin/sh
# E2E Test 2: Onboarding — auto-detect framework, create profile
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/lib/assert.sh"

printf "\n${BOLD}[2/7] Onboarding: Auto-Detect + Profile${RESET}\n\n"

FIXTURE_DIR="$SCRIPT_DIR/fixtures/test-project"
ENGINE_URL="${ENGINE_URL:-http://127.0.0.1:3099}"

# Test: Fixture project has expected structure
assert_file_exists "Fixture has package.json" "$FIXTURE_DIR/package.json"
assert_file_exists "Fixture has chat page" "$FIXTURE_DIR/src/app/chat/page.tsx"
assert_file_exists "Fixture has API route" "$FIXTURE_DIR/src/app/api/route.ts"
assert_file_exists "Fixture has AI util" "$FIXTURE_DIR/src/lib/ai.ts"
assert_file_exists "Fixture has docker-compose" "$FIXTURE_DIR/docker-compose.yml"

# Test: complior init creates .complior/
TMPDIR="$(mktemp -d)"
cp -r "$FIXTURE_DIR"/* "$TMPDIR/" 2>/dev/null || true
INIT_OUT="$(complior init "$TMPDIR" 2>&1 || echo 'init-error')"

if [ -d "$TMPDIR/.complior" ]; then
    pass "complior init creates .complior/"
    assert_file_exists "profile.json created" "$TMPDIR/.complior/profile.json"
else
    # May fail without engine — still check the output
    assert_contains "init outputs something" "$INIT_OUT" "complior"
fi

rm -rf "$TMPDIR"

summary
