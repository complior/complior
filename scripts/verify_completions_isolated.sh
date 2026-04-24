#!/usr/bin/env bash
# V1-M20 / TD-40 — Acceptance: completions test must pass both in isolation
# AND after a prior daemon-using script has run.
#
# Failure mode being prevented: engine process from prior section in
# verify_v1_pipeline_full.sh leaks → completions binary thinks daemon is up
# → wrong output.
#
# Spec:
#   1. Kill any leftover engine process (idempotent)
#   2. Run `complior completions bash` — must print bash completion script
#   3. Spawn engine via `complior daemon start &`, wait for healthy, then stop
#   4. Re-run `complior completions bash` — must STILL print correct output
#
# Implementation requirement (dev):
#   - The completions handler must NOT depend on engine state
#   - Pipeline script section that owns engine must `trap 'complior daemon stop' EXIT`

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPLIOR_BIN="${COMPLIOR_BIN:-${REPO_ROOT}/cli/target/debug/complior}"

if [[ ! -x "${COMPLIOR_BIN}" ]]; then
  echo "FAIL: complior binary not found at ${COMPLIOR_BIN}" >&2
  echo "Run: cargo build -p complior-cli" >&2
  exit 1
fi

cleanup() {
  "${COMPLIOR_BIN}" daemon stop >/dev/null 2>&1 || true
  pkill -f "node.*complior.*server" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# ── Step 1: kill any leftover engine ───────────────────────────────
cleanup
sleep 1

# ── Step 2: completions in clean env ───────────────────────────────
echo "→ Step 2: completions in clean env"
out_clean=$("${COMPLIOR_BIN}" completions bash 2>&1)
if ! grep -q "_complior" <<<"${out_clean}"; then
  echo "FAIL: completions bash output missing _complior function (clean env)" >&2
  echo "Output:" >&2
  echo "${out_clean}" >&2
  exit 1
fi
echo "  ✓ clean env: completions OK"

# ── Step 3: spawn engine, wait, stop ───────────────────────────────
echo "→ Step 3: spawn + stop daemon to simulate prior section"
"${COMPLIOR_BIN}" daemon start >/dev/null 2>&1 &
sleep 3
"${COMPLIOR_BIN}" daemon stop >/dev/null 2>&1 || true
sleep 1

# ── Step 4: completions after daemon lifecycle ─────────────────────
echo "→ Step 4: completions after daemon lifecycle"
out_after=$("${COMPLIOR_BIN}" completions bash 2>&1)
if ! grep -q "_complior" <<<"${out_after}"; then
  echo "FAIL: completions bash output missing _complior function (after daemon)" >&2
  echo "Output:" >&2
  echo "${out_after}" >&2
  exit 1
fi
echo "  ✓ after daemon: completions OK"

# ── Step 5: outputs must be identical ──────────────────────────────
if [[ "${out_clean}" != "${out_after}" ]]; then
  echo "FAIL: completions output diverged between clean env and post-daemon" >&2
  diff <(echo "${out_clean}") <(echo "${out_after}") || true
  exit 1
fi

echo
echo "✅ TD-40 PASS — completions stable across daemon lifecycle"
