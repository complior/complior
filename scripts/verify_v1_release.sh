#!/usr/bin/env bash
# V1-M14: Release polish acceptance script
# Verifies all string/URL fixes, version consistency, and build health.
set -euo pipefail

PASS=0
FAIL=0
TOTAL=0

pass() {
    TOTAL=$((TOTAL + 1))
    echo "  ✓ $1"
    PASS=$((PASS + 1))
}

fail() {
    TOTAL=$((TOTAL + 1))
    echo "  ✗ $1"
    FAIL=$((FAIL + 1))
}

echo "V1-M14 Release Polish — Acceptance Checks"
echo "==========================================="
echo

# --- Group A: Strings/docs ---

echo "Group A: Strings & Docs"

# A1: README license — should NOT contain [MIT](LICENSE)
if grep -q '\[MIT\](LICENSE)' README.md 2>/dev/null; then fail "No MIT license in README"; else pass "No MIT license in README"; fi

# A2: Old GitHub URL
if grep -rq 'a3ka/complior' cli/src/ 2>/dev/null; then fail "No a3ka/complior in CLI"; else pass "No a3ka/complior in CLI"; fi

# A3: complior.eu in CLI
if grep -rq 'complior\.eu' cli/src/ 2>/dev/null; then fail "No complior.eu in CLI"; else pass "No complior.eu in CLI"; fi

# A4: Milestone refs in help
if grep -q 'V1-M' cli/src/cli.rs 2>/dev/null; then fail "No V1-M refs in cli.rs"; else pass "No V1-M refs in cli.rs"; fi

# A5: Dev-facing error messages
if grep -q '"cd engine' cli/src/headless/scan.rs 2>/dev/null; then fail "No 'cd engine' in scan.rs"; else pass "No 'cd engine' in scan.rs"; fi
if grep -q '"cd engine' cli/src/main.rs 2>/dev/null; then fail "No 'cd engine' in main.rs"; else pass "No 'cd engine' in main.rs"; fi

echo

# --- Group B: Error messages ---

echo "Group B: Error Messages"

hint_count=$(grep -c 'eprint_with_hint' cli/src/headless/passport.rs 2>/dev/null || true)
if [ "${hint_count:-0}" -ge 10 ]; then pass "Passport errors use hint helper (${hint_count} calls)"; else fail "Passport errors use hint helper (<10 calls)"; fi

if grep -q 'complior daemon' cli/src/headless/scan.rs 2>/dev/null; then pass "scan.rs suggests 'complior daemon'"; else fail "scan.rs suggests 'complior daemon'"; fi

echo

# --- Group C: UX ---

echo "Group C: UX Improvements"

if grep -q 'BUILD_GIT_HASH' cli/src/headless/commands.rs 2>/dev/null; then pass "Version shows git hash"; else fail "Version shows git hash"; fi

if grep -q 'run_doctor.*-> i32' cli/src/headless/commands.rs 2>/dev/null; then pass "Doctor returns i32"; else fail "Doctor returns i32"; fi

if grep -q 'after_long_help' cli/src/cli.rs 2>/dev/null; then pass "Help examples present"; else fail "Help examples present"; fi

if grep -q 'fonts.googleapis.com' engine/core/src/domain/reporter/html-renderer.ts 2>/dev/null; then fail "No Google Fonts in HTML report"; else pass "No Google Fonts in HTML report"; fi

echo

# --- Group D: Windows ---

echo "Group D: Windows Support"

if grep -q 'taskkill' cli/src/headless/daemon.rs 2>/dev/null; then pass "Windows daemon stop uses taskkill"; else fail "Windows daemon stop uses taskkill"; fi

if grep -q 'tasklist' cli/src/daemon.rs 2>/dev/null; then pass "Windows is_process_alive uses tasklist"; else fail "Windows is_process_alive uses tasklist"; fi

if grep -q 'cfg(unix)' cli/Cargo.toml 2>/dev/null; then pass "libc conditional on Unix"; else fail "libc conditional on Unix"; fi

echo

# --- Group E: Polish ---

echo "Group E: Polish"

# Version consistency
CARGO_VER=$(grep '^version = ' Cargo.toml | head -1 | sed 's/version = "\(.*\)"/\1/')
ENGINE_VER=$(node -e "console.log(JSON.parse(require('fs').readFileSync('engine/core/package.json','utf8')).version)")
NPM_VER=$(node -e "console.log(JSON.parse(require('fs').readFileSync('engine/npm/package.json','utf8')).version)")

if [ "$CARGO_VER" = "0.9.7" ]; then pass "Cargo.toml = 0.9.7"; else fail "Cargo.toml = $CARGO_VER (expected 0.9.7)"; fi
if [ "$ENGINE_VER" = "0.9.7" ]; then pass "engine/core = 0.9.7"; else fail "engine/core = $ENGINE_VER (expected 0.9.7)"; fi
if [ "$NPM_VER" = "0.9.7" ]; then pass "engine/npm = 0.9.7"; else fail "engine/npm = $NPM_VER (expected 0.9.7)"; fi
if [ "$CARGO_VER" = "$ENGINE_VER" ] && [ "$ENGINE_VER" = "$NPM_VER" ]; then pass "All versions match"; else fail "Version mismatch: cargo=$CARGO_VER engine=$ENGINE_VER npm=$NPM_VER"; fi

if grep -q 'sha256' engine/npm/scripts/postinstall.js 2>/dev/null; then pass "npm postinstall has checksum verify"; else fail "npm postinstall has checksum verify"; fi

echo

# --- Build checks ---

echo "Build Checks"

if cargo check -p complior-cli 2>/dev/null; then pass "cargo check passes"; else fail "cargo check passes"; fi

echo
echo "==========================================="
echo "  Results: $PASS/$TOTAL passed, $FAIL failed"
echo "==========================================="

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
