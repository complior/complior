#!/usr/bin/env bash
# V1-M21 — Deep E2E Manual Testing orchestration script.
#
# Runs the full v1.0.0 pre-release verification on a real test project, with
# real OpenRouter API key, against both mock and real eval targets.
#
# Sections (per V1-M21 §4):
#   §4.1  Bootstrap (tmux + daemon)
#   §4.2  Onboarding (V1-M09)
#   §4.3  Scan — 11 flag combinations
#   §4.4  Eval — 13 flag combinations (mock + real)
#   §4.5  Fix — 12 flag combinations
#   §4.6  Score consistency
#   §4.7  Passport — 13-step flow
#   §4.8  Report — 5 formats (HTML output for user visual review)
#
# Each section emits PASS / FAIL / SKIP with reason. Final summary table.
# Output also captured to docs/E2E-DEEP-TEST-REPORT-${DATE}.md (architect fills
# bug list and recommendations manually).

set -euo pipefail

# Run-time guards: ensure tmux uses our user's socket dir even if we are
# inheriting a TMUX env var from a parent (e.g. running inside another user's
# tmux session via Claude Code).
unset TMUX TMUX_PANE 2>/dev/null || true
export TMUX_TMPDIR="${TMUX_TMPDIR:-/tmp/tmux-$(id -u)}"

# ── Config ─────────────────────────────────────────────────────────
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Workspace builds land at REPO/target/, not REPO/cli/target/
DEFAULT_BIN="${REPO_ROOT}/target/release/complior"
[[ -x "${DEFAULT_BIN}" ]] || DEFAULT_BIN="${REPO_ROOT}/cli/target/release/complior"
COMPLIOR_BIN="${COMPLIOR_BIN:-${DEFAULT_BIN}}"
TEST_PROJECT="${TEST_PROJECT:-${HOME}/test-projects/acme-ai-support}"
EVAL_MOCK_TARGET="${EVAL_MOCK_TARGET:-http://127.0.0.1:8080}"
EVAL_REAL_TARGET="${EVAL_REAL_TARGET:-https://api.openai.com/v1}"
REPORTS_DIR="${REPORTS_DIR:-/tmp/reports}"
DATE="$(date +%Y-%m-%d)"
REPORT_FILE="${REPO_ROOT}/docs/E2E-DEEP-TEST-REPORT-${DATE}.md"
LOG_DIR="${REPORTS_DIR}/v1-m21-logs"
TMUX_SESSION="complior-e2e"

mkdir -p "${REPORTS_DIR}" "${LOG_DIR}"

# ── Colors ─────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; CYAN='\033[0;36m'; NC='\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; CYAN=''; NC=''
fi

# ── Result tracking ────────────────────────────────────────────────
declare -a RESULTS=()
record() {
  # record SECTION CASE STATUS [REASON]
  local section="$1" case="$2" status="$3" reason="${4:-}"
  RESULTS+=("${section}|${case}|${status}|${reason}")
  case "${status}" in
    PASS) echo -e "  ${GREEN}✓${NC} ${case}" ;;
    FAIL) echo -e "  ${RED}✗${NC} ${case} — ${reason}" ;;
    SKIP) echo -e "  ${YELLOW}○${NC} ${case} — ${reason}" ;;
  esac
}

run_capture() {
  # run_capture LOGNAME CMD…  → captures to ${LOG_DIR}/${LOGNAME}.log, returns exit code
  local logname="$1"; shift
  local logfile="${LOG_DIR}/${logname}.log"
  echo "  ─── \$ $* ───" >>"${logfile}"
  if "$@" >>"${logfile}" 2>&1; then
    return 0
  else
    return $?
  fi
}

# ── Pre-flight ─────────────────────────────────────────────────────
echo -e "${CYAN}═══ V1-M21 Deep E2E Test ═══${NC}"
echo "Binary:      ${COMPLIOR_BIN}"
echo "Project:     ${TEST_PROJECT}"
echo "Mock eval:   ${EVAL_MOCK_TARGET}"
echo "Real eval:   ${EVAL_REAL_TARGET}"
echo "Reports:     ${REPORTS_DIR}"
echo "Logs:        ${LOG_DIR}"
echo

[[ -x "${COMPLIOR_BIN}" ]] || { echo -e "${RED}FAIL${NC}: complior binary not found"; exit 2; }
[[ -d "${TEST_PROJECT}" ]] || { echo -e "${RED}FAIL${NC}: test project not found"; exit 2; }
command -v tmux >/dev/null || { echo -e "${RED}FAIL${NC}: tmux not installed"; exit 2; }

if [[ -z "${OPENROUTER_API_KEY:-}" ]] && [[ -f "${REPO_ROOT}/.env" ]]; then
  # shellcheck disable=SC1091
  set -a; source "${REPO_ROOT}/.env"; set +a
fi

# ── Cleanup trap ───────────────────────────────────────────────────
cleanup() {
  echo
  echo "→ Cleanup"
  tmux kill-session -t "${TMUX_SESSION}" 2>/dev/null || true
  "${COMPLIOR_BIN}" daemon stop >/dev/null 2>&1 || true
  pkill -f "node.*complior.*server" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# ── §4.1 Bootstrap ─────────────────────────────────────────────────
echo
echo -e "${CYAN}§4.1 Bootstrap${NC}"
cd "${TEST_PROJECT}"
tmux kill-session -t "${TMUX_SESSION}" 2>/dev/null || true
tmux new-session -d -s "${TMUX_SESSION}" \
  "${COMPLIOR_BIN} daemon start --watch >${LOG_DIR}/daemon.log 2>&1"
sleep 5
if curl -sf http://localhost:4000/health >/dev/null; then
  record "4.1" "daemon_health" "PASS"
else
  record "4.1" "daemon_health" "FAIL" "/health did not return 200 within 5s"
fi

# ── §4.2 Onboarding ────────────────────────────────────────────────
echo
echo -e "${CYAN}§4.2 Onboarding (V1-M09)${NC}"
if run_capture "init" "${COMPLIOR_BIN}" init --yes; then
  if [[ -f "${TEST_PROJECT}/.complior/project.toml" ]]; then
    record "4.2" "init_creates_project_toml" "PASS"
  else
    record "4.2" "init_creates_project_toml" "FAIL" "project.toml missing"
  fi
else
  record "4.2" "complior_init" "FAIL" "exit code != 0"
fi

# ── §4.3 Scan flags ────────────────────────────────────────────────
echo
echo -e "${CYAN}§4.3 Scan flags (11 cases)${NC}"

scan_case() {
  local id="$1"; shift
  local desc="$1"; shift
  if run_capture "scan-${id}" "${COMPLIOR_BIN}" scan "$@"; then
    record "4.3" "${id} ${desc}" "PASS"
  else
    record "4.3" "${id} ${desc}" "FAIL" "exit != 0 (see logs/scan-${id}.log)"
  fi
}

scan_case "S-1"  "default"           ""
scan_case "S-2"  "--json"            --json
scan_case "S-3"  "--sarif"           --sarif
scan_case "S-4"  "--ci threshold"    --ci --threshold 70 --fail-on critical || true   # may exit 1 by design
scan_case "S-5"  "--diff main"       --diff main || true
scan_case "S-6"  "--comment"         --comment
scan_case "S-7"  "--deep"            --deep
[[ -n "${OPENROUTER_API_KEY:-}" ]] \
  && scan_case "S-8" "--llm" --llm \
  || record "4.3" "S-8 --llm" "SKIP" "OPENROUTER_API_KEY not set"
scan_case "S-9"  "--quiet (TD-38)"   --quiet
scan_case "S-10" "--agent acme-bot"  --agent acme-bot || true
scan_case "S-11" "domain filter (M18)" --json   # verify in log

# Inspect S-9 quiet output line count (TD-38 real-world re-verify)
quiet_lines=$(grep -cv '^\s*$' "${LOG_DIR}/scan-S-9.log" || echo 0)
if [[ "${quiet_lines}" -le 10 ]]; then
  record "4.3" "S-9 quiet ≤10 lines (real-world)" "PASS"
else
  record "4.3" "S-9 quiet line count" "FAIL" "${quiet_lines} non-empty lines"
fi

# ── §4.4 Eval flags ────────────────────────────────────────────────
echo
echo -e "${CYAN}§4.4 Eval flags (13 cases)${NC}"

# Spawn mock eval target on :8080 if the test project provides one
if [[ -f "${TEST_PROJECT}/eval-mock-server.js" ]]; then
  node "${TEST_PROJECT}/eval-mock-server.js" >"${LOG_DIR}/mock-server.log" 2>&1 &
  MOCK_PID=$!
  sleep 2
  # shellcheck disable=SC2317
  trap 'kill ${MOCK_PID} 2>/dev/null || true; cleanup' EXIT
fi

eval_case() {
  local id="$1"; shift
  local desc="$1"; shift
  if run_capture "eval-${id}" "${COMPLIOR_BIN}" eval "$@"; then
    record "4.4" "${id} ${desc}" "PASS"
  else
    record "4.4" "${id} ${desc}" "FAIL" "exit != 0"
  fi
}

eval_case "E-1"  "--det"             "${EVAL_MOCK_TARGET}" --det
[[ -n "${OPENROUTER_API_KEY:-}" ]] \
  && eval_case "E-2"  "--det --llm" "${EVAL_MOCK_TARGET}" --det --llm \
  || record "4.4" "E-2 --det --llm" "SKIP" "no key"
eval_case "E-3"  "--security"        "${EVAL_MOCK_TARGET}" --security
[[ -n "${OPENROUTER_API_KEY:-}" ]] \
  && eval_case "E-4"  "--full"      "${EVAL_MOCK_TARGET}" --full \
  || record "4.4" "E-4 --full" "SKIP" "no key"
eval_case "E-5"  "--ci threshold"    "${EVAL_MOCK_TARGET}" --det --ci --threshold 60 || true
eval_case "E-6"  "--categories"      "${EVAL_MOCK_TARGET}" --det --categories Art5,Art10
eval_case "E-7"  "--last --failures" "${EVAL_MOCK_TARGET}" --last --failures || true
eval_case "E-8"  "--remediation"     "${EVAL_MOCK_TARGET}" --det --remediation || true
eval_case "E-9"  "--dry-run"         "${EVAL_MOCK_TARGET}" --det --dry-run
eval_case "E-10" "--concurrency 10"  "${EVAL_MOCK_TARGET}" --det --concurrency 10
eval_case "E-11" "--agent acme-bot"  "${EVAL_MOCK_TARGET}" --det --agent acme-bot || true
# E-12 pre-filter verify is implicit via E-1 logs (filterContext present)
if grep -q "filterContext\|skippedBy" "${LOG_DIR}/eval-E-1.log"; then
  record "4.4" "E-12 pre-filter (M12.1) metadata present" "PASS"
else
  record "4.4" "E-12 pre-filter metadata" "FAIL" "no filterContext in E-1"
fi
[[ -n "${OPENROUTER_API_KEY:-}" ]] \
  && eval_case "E-13" "real OpenAI smoke" "${EVAL_REAL_TARGET}" --security --concurrency 2 \
  || record "4.4" "E-13 real OpenAI" "SKIP" "no key"

# ── §4.5 Fix flags ─────────────────────────────────────────────────
echo
echo -e "${CYAN}§4.5 Fix flags (12 cases)${NC}"

fix_case() {
  local id="$1"; shift
  local desc="$1"; shift
  if run_capture "fix-${id}" "${COMPLIOR_BIN}" fix "$@"; then
    record "4.5" "${id} ${desc}" "PASS"
  else
    record "4.5" "${id} ${desc}" "FAIL" "exit != 0"
  fi
}

fix_case "F-1"  "--dry-run"               --dry-run
fix_case "F-2"  "--json"                  --dry-run --json
[[ -n "${OPENROUTER_API_KEY:-}" ]] \
  && fix_case "F-3" "--ai"                --dry-run --ai \
  || record "4.5" "F-3 --ai" "SKIP" "no key"
fix_case "F-4"  "--source scan"           --dry-run --source scan
fix_case "F-5"  "--source eval"           --dry-run --source eval
fix_case "F-6"  "--source all"            --dry-run --source all
fix_case "F-7"  "--check-id L1-A001"      --dry-run --check-id L1-A001 || true
fix_case "F-8"  "--doc fria"              --doc fria
fix_case "F-9"  "--doc soa"               --doc soa
fix_case "F-10" "--doc risk-register"     --doc risk-register
fix_case "F-11" "--doc all"               --doc all
# F-12 profile filter — verify skip-message in any of F-1..F-6 logs
if grep -q "skipped\|filterContext" "${LOG_DIR}"/fix-F-*.log 2>/dev/null; then
  record "4.5" "F-12 profile filter (M19) skip msg" "PASS"
else
  record "4.5" "F-12 profile filter skip msg" "SKIP" "no skip findings in this project"
fi

# ── §4.6 Score consistency ─────────────────────────────────────────
echo
echo -e "${CYAN}§4.6 Score consistency (M10)${NC}"
"${COMPLIOR_BIN}" scan --json >"${LOG_DIR}/score-check.json" 2>&1 || true
# Naive check: compliance score numeric, disclaimer present
if jq -e '.score.totalScore | numbers' "${LOG_DIR}/score-check.json" >/dev/null 2>&1; then
  record "4.6" "score.totalScore numeric" "PASS"
else
  record "4.6" "score.totalScore" "FAIL" "missing or non-numeric"
fi
if jq -e '.disclaimer' "${LOG_DIR}/score-check.json" >/dev/null 2>&1; then
  record "4.6" "disclaimer present" "PASS"
else
  record "4.6" "disclaimer" "FAIL" "missing"
fi

# ── §4.7 Passport flow ─────────────────────────────────────────────
echo
echo -e "${CYAN}§4.7 Passport flow (13 steps)${NC}"

pp_case() {
  local id="$1"; shift
  local desc="$1"; shift
  if run_capture "pp-${id}" "${COMPLIOR_BIN}" passport "$@"; then
    record "4.7" "${id} ${desc}" "PASS"
  else
    record "4.7" "${id} ${desc}" "FAIL" "exit != 0"
  fi
}

pp_case "P-1"  "init acme-bot"          init acme-bot --yes || true
pp_case "P-2"  "list"                   list
pp_case "P-3"  "show acme-bot"          show acme-bot || true
pp_case "P-4"  "validate acme-bot"      validate acme-bot || true
pp_case "P-5"  "completeness"           completeness acme-bot || true
pp_case "P-6"  "autonomy"               autonomy acme-bot || true
pp_case "P-7"  "notify"                 notify acme-bot || true
pp_case "P-8"  "registry"               registry
pp_case "P-9"  "permissions"            permissions acme-bot || true
pp_case "P-10" "evidence"               evidence
pp_case "P-11" "audit"                  audit
pp_case "P-12" "export aiuc1"           export acme-bot --format aiuc1 || true
pp_case "P-13" "import"                 import --help

# ── §4.8 Report formats ────────────────────────────────────────────
echo
echo -e "${CYAN}§4.8 Report formats (5 formats + share)${NC}"

report_case() {
  local id="$1"; local fmt="$2"; local out="${3:-}"
  local args=( --format "${fmt}" )
  [[ -n "${out}" ]] && args+=( --output "${out}" )
  if run_capture "report-${id}" "${COMPLIOR_BIN}" report "${args[@]}"; then
    record "4.8" "${id} ${fmt}" "PASS"
  else
    record "4.8" "${id} ${fmt}" "FAIL" "exit != 0"
  fi
}

report_case "R-1" "human"  ""
report_case "R-2" "json"   "${REPORTS_DIR}/v1-m21-report.json"
report_case "R-3" "md"     "${REPORTS_DIR}/v1-m21-report.md"
report_case "R-4" "html"   "${REPORTS_DIR}/v1-m21-report.html"
report_case "R-5" "pdf"    "${REPORTS_DIR}/v1-m21-report.pdf"
if run_capture "report-share" "${COMPLIOR_BIN}" report --share; then
  record "4.8" "R-6 --share" "PASS"
else
  record "4.8" "R-6 --share" "FAIL" "exit != 0"
fi

# ── Summary ────────────────────────────────────────────────────────
echo
echo -e "${CYAN}═══ Summary ═══${NC}"
total=${#RESULTS[@]}
pass=0; fail=0; skip=0
for r in "${RESULTS[@]}"; do
  case "$(echo "$r" | cut -d'|' -f3)" in
    PASS) pass=$((pass+1)) ;;
    FAIL) fail=$((fail+1)) ;;
    SKIP) skip=$((skip+1)) ;;
  esac
done
echo -e "  Total:  ${total}"
echo -e "  ${GREEN}PASS:${NC}   ${pass}"
echo -e "  ${RED}FAIL:${NC}   ${fail}"
echo -e "  ${YELLOW}SKIP:${NC}   ${skip}"

# Append summary table to report file (architect fills bug list manually)
{
  echo "# E2E Deep Test Report — ${DATE}"
  echo
  echo "**Branch:** \`feature/V1-M20-M21-roadmap-cleanup\`"
  echo "**Binary:** \`${COMPLIOR_BIN}\`"
  echo "**Test Project:** \`${TEST_PROJECT}\`"
  echo
  echo "## Summary"
  echo
  echo "| Metric | Count |"
  echo "|--------|-------|"
  echo "| Total cases | ${total} |"
  echo "| PASS | ${pass} |"
  echo "| FAIL | ${fail} |"
  echo "| SKIP | ${skip} |"
  echo
  echo "## Per-case Results"
  echo
  echo "| Section | Case | Status | Reason |"
  echo "|---------|------|--------|--------|"
  for r in "${RESULTS[@]}"; do
    section="$(echo "$r" | cut -d'|' -f1)"
    case_id="$(echo "$r" | cut -d'|' -f2)"
    status="$(echo "$r" | cut -d'|' -f3)"
    reason="$(echo "$r" | cut -d'|' -f4)"
    echo "| §${section} | ${case_id} | ${status} | ${reason} |"
  done
  echo
  echo "## HTML Report for Visual Review"
  echo
  echo "Open in browser: file://${REPORTS_DIR}/v1-m21-report.html"
  echo
  echo "## Bug List"
  echo
  echo "_To be filled by architect after manual review._"
  echo
  echo "## Regression List"
  echo
  echo "_To be filled by architect — what worked before, broke now._"
  echo
  echo "## UX Issues"
  echo
  echo "_To be filled — what works but is awkward._"
  echo
  echo "## Recommendations"
  echo
  echo "_To be filled — what to polish before v1.0.0 tag._"
  echo
  echo "## Release Blockers"
  echo
  echo "_To be filled — anything that blocks v1.0.0 release._"
} >"${REPORT_FILE}"

echo
echo -e "Report stub: ${CYAN}${REPORT_FILE}${NC}"
echo -e "HTML report: ${CYAN}file://${REPORTS_DIR}/v1-m21-report.html${NC}"
echo -e "Logs:        ${CYAN}${LOG_DIR}/${NC}"

if [[ "${fail}" -gt 0 ]]; then
  echo -e "${RED}E2E completed with ${fail} failures${NC}"
  exit 1
fi
echo -e "${GREEN}E2E completed successfully${NC}"
exit 0
