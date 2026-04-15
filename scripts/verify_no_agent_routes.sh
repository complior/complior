#!/usr/bin/env bash
# V1-M13 acceptance: verify /agent/ routes and dead code are removed.
#
# Checks:
# 1. No "/agent/" HTTP route strings in reachable Rust source (excluding tests)
# 2. agent.rs dead-code file deleted
# 3. No "complior agent" user-facing messages (excluding tests)
#
# Exit 0 = PASS, 1 = FAIL

set -euo pipefail

CLI_SRC="cli/src"
ERRORS=0

echo "=== V1-M13: Verify /agent/ routes removed ==="
echo ""

# ── Check 1: No "/agent/" route strings in production code ────────
echo "Check 1: No /agent/ HTTP route strings in production code..."
# Search reachable source files (exclude agent.rs itself and test files)
ROUTE_HITS=$(grep -rn '"/agent/' "$CLI_SRC" --include='*.rs' \
    | grep -v 'agent\.rs:' \
    | grep -v '#\[cfg(test)\]' \
    | grep -v 'route_cleanup_tests' \
    | grep -v 'include_str!' \
    | grep -v 'assert!' \
    | grep -v '\.contains(' \
    | grep -v '// ' \
    || true)

if [ -n "$ROUTE_HITS" ]; then
    echo "  FAIL: Found /agent/ route strings in reachable code:"
    echo "$ROUTE_HITS" | while IFS= read -r line; do echo "    $line"; done
    ERRORS=$((ERRORS + 1))
else
    echo "  PASS"
fi

# ── Check 2: agent.rs file deleted ────────────────────────────────
echo "Check 2: cli/src/headless/agent.rs deleted..."
if [ -f "$CLI_SRC/headless/agent.rs" ]; then
    echo "  FAIL: agent.rs still exists (dead code, not in mod.rs)"
    ERRORS=$((ERRORS + 1))
else
    echo "  PASS"
fi

# ── Check 3: No "complior agent" user messages ────────────────────
echo "Check 3: No 'complior agent' user-facing messages..."
MSG_HITS=$(grep -rn 'complior agent' "$CLI_SRC" --include='*.rs' \
    | grep -v 'agent\.rs:' \
    | grep -v 'route_cleanup_tests' \
    | grep -v 'include_str!' \
    | grep -v 'assert!' \
    | grep -v '// ' \
    || true)

if [ -n "$MSG_HITS" ]; then
    echo "  FAIL: Found 'complior agent' messages in reachable code:"
    echo "$MSG_HITS" | while IFS= read -r line; do echo "    $line"; done
    ERRORS=$((ERRORS + 1))
else
    echo "  PASS"
fi

# ── Summary ───────────────────────────────────────────────────────
echo ""
if [ "$ERRORS" -gt 0 ]; then
    echo "=== FAIL: $ERRORS check(s) failed ==="
    exit 1
else
    echo "=== PASS: All checks passed ==="
    exit 0
fi
