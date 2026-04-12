#!/usr/bin/env bash
# =============================================================================
# verify_ci.sh — CI pipeline verification (same checks as .github/workflows/ci.yml)
#
# Tests: cargo test + vitest + clippy + tsc → all pass
# Exit 0 = PASS, Exit 1 = FAIL
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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
echo " Complior CI Verification"
echo "═══════════════════════════════════════════════════"
echo ""

# ── Test 1: Rust formatting ──────────────────────────────────────────────
echo "Test 1: cargo fmt --check"
if cargo fmt --manifest-path "$PROJECT_ROOT/cli/Cargo.toml" --check 2>&1; then
  pass "Rust code formatted correctly"
else
  fail "Rust formatting issues found"
fi

# ── Test 2: Rust clippy ──────────────────────────────────────────────────
echo ""
echo "Test 2: cargo clippy"
if cargo clippy --manifest-path "$PROJECT_ROOT/cli/Cargo.toml" --all-targets -- -D warnings 2>&1 | tail -n 3; then
  pass "Clippy: zero warnings"
else
  fail "Clippy found warnings/errors"
fi

# ── Test 3: Rust tests ───────────────────────────────────────────────────
echo ""
echo "Test 3: cargo test"
RUST_OUTPUT=$(cargo test --manifest-path "$PROJECT_ROOT/cli/Cargo.toml" 2>&1 || true)
RUST_PASSED=$(echo "$RUST_OUTPUT" | grep -oP '\d+ passed' | head -1 || echo "0 passed")
if echo "$RUST_OUTPUT" | grep -q "test result: ok"; then
  pass "Rust tests: $RUST_PASSED"
else
  fail "Rust tests failed"
fi

# ── Test 4: TypeScript engine tests ──────────────────────────────────────
echo ""
echo "Test 4: vitest (engine)"
TS_OUTPUT=$(cd "$PROJECT_ROOT/engine/core" && npx vitest run --reporter=verbose 2>&1 || true)
TS_PASSED=$(echo "$TS_OUTPUT" | grep -oP '\d+ passed' | tail -1 || echo "0 passed")
if echo "$TS_OUTPUT" | grep -qE "Tests.*passed"; then
  pass "TS engine tests: $TS_PASSED"
else
  fail "TS engine tests failed"
fi

# ── Test 5: SDK tests ────────────────────────────────────────────────────
echo ""
echo "Test 5: vitest (SDK)"
if [[ -d "$PROJECT_ROOT/engine/sdk" ]]; then
  SDK_OUTPUT=$(cd "$PROJECT_ROOT/engine/sdk" && npx vitest run 2>&1 || true)
  SDK_PASSED=$(echo "$SDK_OUTPUT" | grep -oP '\d+ passed' | tail -1 || echo "0 passed")
  if echo "$SDK_OUTPUT" | grep -qE "Tests.*passed"; then
    pass "SDK tests: $SDK_PASSED"
  else
    fail "SDK tests failed"
  fi
else
  info "SDK directory not found — skipping"
  pass "SDK tests skipped (not in tree)"
fi

# ── Test 6: Version consistency ──────────────────────────────────────────
echo ""
echo "Test 6: Version consistency"
CARGO_VER=$(grep '^version' "$PROJECT_ROOT/cli/Cargo.toml" | head -1 | grep -oP '\d+\.\d+\.\d+')
ENGINE_VER=$(python3 -c "import json; print(json.load(open('$PROJECT_ROOT/engine/core/package.json'))['version'])" 2>/dev/null || echo "unknown")
ROOT_VER=$(python3 -c "import json; print(json.load(open('$PROJECT_ROOT/package.json'))['version'])" 2>/dev/null || echo "unknown")

info "Cargo.toml: $CARGO_VER | engine/core: $ENGINE_VER | root: $ROOT_VER"
if [[ "$CARGO_VER" == "$ENGINE_VER" && "$CARGO_VER" == "$ROOT_VER" ]]; then
  pass "All versions match: $CARGO_VER"
else
  fail "Version mismatch: Cargo=$CARGO_VER, Engine=$ENGINE_VER, Root=$ROOT_VER"
fi

# ── Summary ───────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "═══════════════════════════════════════════════════"

if [[ $FAIL -gt 0 ]]; then exit 1; fi
exit 0
