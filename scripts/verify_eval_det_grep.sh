#!/usr/bin/env bash
# V1-M20 / TD-41 — Acceptance: `eval --det` grep `\d+ passed` must have a
# fallback when target returns all 0/N/A.
#
# Failure mode being prevented: `verify_e2e_bugfix.sh` B-01 grep is too strict.
# When eval target returns empty/N/A results, output looks like "0/20 N/A" and
# script wrongly reports FAIL even though `eval --det` exited 0.
#
# Spec:
#   - Run `eval --det` against a target that returns N/A results
#   - Acceptance must PASS if EITHER:
#     (a) `\d+ passed` is found, OR
#     (b) exit code is 0 AND `eval` summary block is present (e.g. "Total:" or "Score:")
#
# Implementation requirement (dev): patch `verify_e2e_bugfix.sh` B-01 with
# the OR fallback above.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPLIOR_BIN="${COMPLIOR_BIN:-${REPO_ROOT}/cli/target/debug/complior}"
ENV_FILE="${REPO_ROOT}/.env"

if [[ ! -x "${COMPLIOR_BIN}" ]]; then
  echo "FAIL: complior binary not found at ${COMPLIOR_BIN}" >&2
  exit 1
fi

# Load OPENROUTER_API_KEY if present
if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a; source "${ENV_FILE}"; set +a
fi

# Use a deliberately empty/echo target — http://localhost:65535 will refuse
# connection. Even so, eval --det should exit 0 with N/A results (graceful
# degradation per V1-M12 timeout retry).
TARGET="${EVAL_NA_TARGET:-http://127.0.0.1:65535}"

OUT_FILE=$(mktemp /tmp/complior-eval-det-XXXX.txt)
trap 'rm -f "${OUT_FILE}"' EXIT

echo "→ Running: complior eval ${TARGET} --det --ci"
set +e
"${COMPLIOR_BIN}" eval "${TARGET}" --det --ci >"${OUT_FILE}" 2>&1
exit_code=$?
set -e

# Grep with fallback (TD-41 spec)
if grep -qE '[0-9]+ passed' "${OUT_FILE}"; then
  echo "  ✓ found '\\d+ passed' marker"
  echo "✅ TD-41 PASS — primary grep matched"
  exit 0
fi

# Fallback: exit 0 AND a summary block exists
has_summary=0
if grep -qE 'Total:|Score:|Conformity Score|conformityScore' "${OUT_FILE}"; then
  has_summary=1
fi

if [[ "${exit_code}" -eq 0 && "${has_summary}" -eq 1 ]]; then
  echo "  ✓ no '\\d+ passed' but exit=0 + summary present (fallback OK)"
  echo "✅ TD-41 PASS — fallback grep accepted N/A target"
  exit 0
fi

echo "FAIL: TD-41 fallback did not trigger" >&2
echo "  exit_code=${exit_code}" >&2
echo "  has_summary=${has_summary}" >&2
echo "─── eval output ───" >&2
cat "${OUT_FILE}" >&2
exit 1
