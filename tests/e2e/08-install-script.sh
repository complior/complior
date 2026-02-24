#!/usr/bin/env bash
# US-S0205: install_script_smoke — dry-run install script validation
# Tests that the install script is well-formed and handles --dry-run / help.
#
# Does NOT actually download binaries (no network access needed).
# Usage: bash tests/e2e/08-install-script.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INSTALL_SCRIPT="$REPO_ROOT/scripts/install.sh"

pass() { printf "\033[32m  ✓ %s\033[0m\n" "$1"; }
fail() { printf "\033[31m  ✗ %s\033[0m\n" "$1"; exit 1; }

echo "US-S0205: install script smoke tests"
echo "======================================"

# ── 1: script exists and is executable ──────────────────────────────────────
if [ -f "$INSTALL_SCRIPT" ]; then
  pass "install.sh exists"
else
  fail "install.sh not found at $INSTALL_SCRIPT"
fi

if [ -r "$INSTALL_SCRIPT" ]; then
  pass "install.sh is readable"
else
  fail "install.sh is not readable"
fi

# ── 2: POSIX sh syntax check ─────────────────────────────────────────────────
if sh -n "$INSTALL_SCRIPT" 2>/dev/null; then
  pass "install.sh passes POSIX sh syntax check"
else
  fail "install.sh has syntax errors"
fi

# ── 3: contains required functions / patterns ────────────────────────────────
if grep -q "detect_platform" "$INSTALL_SCRIPT"; then
  pass "install.sh has detect_platform function"
else
  fail "install.sh missing detect_platform"
fi

if grep -q "complior" "$INSTALL_SCRIPT"; then
  pass "install.sh references 'complior' binary"
else
  fail "install.sh does not reference complior"
fi

if grep -q "github.com" "$INSTALL_SCRIPT"; then
  pass "install.sh references GitHub releases"
else
  fail "install.sh does not reference GitHub releases"
fi

# ── 4: covers all 5 target platforms ────────────────────────────────────────
PLATFORMS=("linux-x86_64" "linux-aarch64" "macos-x86_64" "macos-arm64" "windows-x86_64")
for platform in "${PLATFORMS[@]}"; do
  if grep -q "$platform" "$INSTALL_SCRIPT"; then
    pass "install.sh handles platform: $platform"
  else
    fail "install.sh missing platform: $platform"
  fi
done

# ── 5: npm package structure ─────────────────────────────────────────────────
NPM_PKG="$REPO_ROOT/packages/npm"
if [ -f "$NPM_PKG/package.json" ]; then
  pass "npm package.json exists"
else
  fail "npm package.json missing"
fi

if [ -f "$NPM_PKG/bin/run.js" ]; then
  pass "npm launcher (bin/run.js) exists"
else
  fail "npm launcher missing"
fi

if [ -f "$NPM_PKG/scripts/postinstall.js" ]; then
  pass "npm postinstall (binary downloader) exists"
else
  fail "npm postinstall missing"
fi

# ── 6: Homebrew formula ───────────────────────────────────────────────────────
FORMULA="$REPO_ROOT/distribute/complior.rb"
if [ -f "$FORMULA" ]; then
  pass "Homebrew formula exists"
else
  fail "Homebrew formula missing at distribute/complior.rb"
fi

# ── 7: GitHub Actions release workflow ────────────────────────────────────────
WORKFLOW="$REPO_ROOT/.github/workflows/release.yml"
if [ -f "$WORKFLOW" ]; then
  pass "release.yml workflow exists"
else
  fail "release.yml workflow missing"
fi

if grep -q "x86_64-unknown-linux-musl" "$WORKFLOW" && \
   grep -q "aarch64-apple-darwin" "$WORKFLOW" && \
   grep -q "x86_64-pc-windows-msvc" "$WORKFLOW"; then
  pass "release.yml covers all 5 targets"
else
  fail "release.yml missing some targets"
fi

# ── 8: landing page ───────────────────────────────────────────────────────────
LANDING="$REPO_ROOT/landing/index.html"
if [ -f "$LANDING" ]; then
  pass "landing/index.html exists"
else
  fail "landing/index.html missing"
fi

echo ""
echo "All install script smoke tests passed."
