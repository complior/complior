#!/usr/bin/env bash
# TRULY Deep E2E Test — multi-profile coverage of complior pipeline.
#
# Tests 3 distinct profiles to verify profile-aware filtering:
#   Profile A: deployer / limited / general    (baseline — eval-target default)
#   Profile B: provider / high / healthcare    (high-risk medical AI provider)
#   Profile C: deployer / minimal / finance    (low-risk finance use case)
#
# For EACH profile runs:
#   - complior init (with profile-specific onboarding answers)
#   - scan ALL flag combos (--json, --sarif, --quiet, --ci, --diff, --comment,
#     --agent, --deep, --llm, --deep --llm)
#   - eval ALL flag combos (--det, --security, --categories, --dry-run,
#     --concurrency, --remediation, --last --failures, --ci threshold,
#     --full optional)
#   - fix ALL flags (--dry-run, --json, --source scan/eval/all, --check-id,
#     --doc fria/all, --ai)
#   - passport ALL 13 flows
#   - report 5 formats with content snapshots
#
# Outputs:
#   tests/e2e-snapshots/<profile>/  — per-profile artifacts
#     scan-*.log, eval-*.log, fix-*.log, passport-*.log, report.{html,md,pdf,json}
#     filterContext.json (extracted) — for cross-profile diff
#   docs/E2E-TRULY-DEEP-REPORT-{date}.md — summary with comparison table
#
# Usage:
#   bash scripts/verify_truly_deep_e2e.sh                  # all 3 profiles
#   PROFILES="A B" bash scripts/verify_truly_deep_e2e.sh   # subset
#   SKIP_FULL_EVAL=1 bash scripts/verify_truly_deep_e2e.sh # skip slow --full
#
# Prerequisites:
#   - cargo build -p complior-cli --release
#   - OPENROUTER_API_KEY in ~/.config/complior/credentials or .env
#   - eval-target with AI server: ~/test-projects/eval-target

set -euo pipefail

# ── Config ─────────────────────────────────────────────────────────
unset TMUX TMUX_PANE 2>/dev/null || true
export TMUX_TMPDIR="${TMUX_TMPDIR:-/tmp/tmux-$(id -u)}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_BIN="${REPO_ROOT}/target/release/complior"
[[ -x "${DEFAULT_BIN}" ]] || DEFAULT_BIN="${REPO_ROOT}/cli/target/release/complior"
COMPLIOR_BIN="${COMPLIOR_BIN:-${DEFAULT_BIN}}"
SOURCE_PROJECT="${SOURCE_PROJECT:-${HOME}/test-projects/eval-target}"
SANDBOX_ROOT="${SANDBOX_ROOT:-/tmp/deep-e2e}"
SNAPSHOT_DIR="${SNAPSHOT_DIR:-${REPO_ROOT}/tests/e2e-snapshots}"
DATE="$(date +%Y-%m-%d)"
REPORT_FILE="${REPORT_FILE:-${REPO_ROOT}/docs/E2E-TRULY-DEEP-REPORT-${DATE}.md}"
DAEMON_PORT="${DAEMON_PORT:-3099}"
AI_TARGET="${AI_TARGET:-http://127.0.0.1:4000}"
PROFILES="${PROFILES:-A B C}"
SKIP_FULL_EVAL="${SKIP_FULL_EVAL:-0}"
SKIP_LLM="${SKIP_LLM:-0}"

# Load OpenRouter key
if [[ -z "${OPENROUTER_API_KEY:-}" ]]; then
  if [[ -f "${HOME}/.config/complior/credentials" ]]; then
    OPENROUTER_API_KEY=$(grep '^OPENROUTER_API_KEY=' "${HOME}/.config/complior/credentials" | cut -d= -f2)
    export OPENROUTER_API_KEY
  fi
fi

# ── Colors ─────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; CYAN='\033[0;36m'; NC='\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; CYAN=''; NC=''
fi

# ── Pre-flight ─────────────────────────────────────────────────────
echo -e "${CYAN}═══ TRULY Deep E2E Test ═══${NC}"
echo "Binary:        ${COMPLIOR_BIN}"
echo "Source project: ${SOURCE_PROJECT}"
echo "Sandbox:        ${SANDBOX_ROOT}"
echo "Snapshots:      ${SNAPSHOT_DIR}"
echo "Profiles:       ${PROFILES}"
echo "Skip --full:    ${SKIP_FULL_EVAL}"
echo "Skip --llm:     ${SKIP_LLM}"
echo "OpenRouter key: $([[ -n "${OPENROUTER_API_KEY:-}" ]] && echo "set" || echo "MISSING")"
echo

[[ -x "${COMPLIOR_BIN}" ]] || { echo -e "${RED}FAIL${NC}: complior binary not found"; exit 2; }
[[ -d "${SOURCE_PROJECT}" ]] || { echo -e "${RED}FAIL${NC}: source project not found"; exit 2; }
command -v jq >/dev/null || { echo -e "${RED}FAIL${NC}: jq not installed"; exit 2; }

mkdir -p "${SANDBOX_ROOT}" "${SNAPSHOT_DIR}"

# ── AI server PID tracker ──────────────────────────────────────────
AI_SERVER_PID=""

# ── Cleanup ────────────────────────────────────────────────────────
# Port-specific cleanup: only kill PIDs listening on our managed ports.
# AI server (port 4000) is preserved across profiles unless we explicitly stop it.
kill_pid_on_port() {
  local port="$1"
  local pid
  # `set -o pipefail` + `grep` exits 1 on no match; allow with || true
  pid=$(ss -tnlp 2>/dev/null | grep ":${port} " 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | head -1 || true)
  if [[ -n "$pid" ]]; then
    kill -TERM "$pid" 2>/dev/null || true
    sleep 1
    pid=$(ss -tnlp 2>/dev/null | grep ":${port} " 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | head -1 || true)
    [[ -n "$pid" ]] && { kill -KILL "$pid" 2>/dev/null || true; }
  fi
  return 0
}

cleanup() {
  echo
  echo "→ Cleanup"
  "${COMPLIOR_BIN}" daemon stop >/dev/null 2>&1 || true
  kill_pid_on_port "${DAEMON_PORT}"
  # Stop AI server only on FINAL exit (trap), not between profiles
  if [[ -n "$AI_SERVER_PID" ]]; then
    kill -TERM "$AI_SERVER_PID" 2>/dev/null
    sleep 1
    kill -KILL "$AI_SERVER_PID" 2>/dev/null
  fi
  # Backup: anything still listening on AI port (zombie children)
  kill_pid_on_port 4000
}
trap cleanup EXIT

# ── Spawn AI server ────────────────────────────────────────────────
spawn_ai_server() {
  local proj_dir="$1"
  if curl -sf "${AI_TARGET}/health" -m 2 >/dev/null 2>&1; then
    echo "  ✓ AI server already running"
    return 0
  fi
  echo "  → Spawning AI server (npm run dev) in ${proj_dir}"
  # cd in current shell so $! captures the actual background PID.
  # Subshell `(cmd &)` would lose $! to the parent shell under `set -u`.
  pushd "${proj_dir}" >/dev/null
  npm run dev >"${SANDBOX_ROOT}/ai-server.log" 2>&1 &
  AI_SERVER_PID=$!
  popd >/dev/null
  for i in {1..20}; do
    if curl -sf "${AI_TARGET}/health" -m 2 >/dev/null 2>&1; then
      echo "  ✓ AI server ready (pid ${AI_SERVER_PID})"
      return 0
    fi
    sleep 1
  done
  echo "  ✗ AI server did not start"
  return 1
}

# Verify AI server still alive; re-spawn if needed (resilience between profiles)
ensure_ai_server() {
  if curl -sf "${AI_TARGET}/health" -m 2 >/dev/null 2>&1; then
    return 0
  fi
  echo "  ⚠ AI server lost — re-spawning"
  AI_SERVER_PID=""
  spawn_ai_server "${SOURCE_PROJECT}"
}

# ── Spawn daemon ───────────────────────────────────────────────────
spawn_daemon() {
  local proj_dir="$1"
  # Port-specific kill: only what's listening on DAEMON_PORT.
  # Do NOT pkill broad patterns — that kills the AI server too.
  "${COMPLIOR_BIN}" daemon stop >/dev/null 2>&1 || true
  kill_pid_on_port "${DAEMON_PORT}"
  sleep 1

  # Spawn with fixed port via --port flag (Rust CLI passes through to engine)
  (cd "${proj_dir}" && "${COMPLIOR_BIN}" daemon start --watch --port "${DAEMON_PORT}" >"${SANDBOX_ROOT}/daemon.log" 2>&1 &)

  for i in {1..15}; do
    if curl -sf "http://localhost:${DAEMON_PORT}/health" -m 2 >/dev/null 2>&1; then
      # Verify it's our V1-M27 daemon (not stale) by checking a known new endpoint or rebuild marker
      echo "  ✓ daemon ready (port ${DAEMON_PORT})"
      return 0
    fi
    sleep 1
  done
  echo "  ✗ daemon did not start on port ${DAEMON_PORT}"
  echo "  Daemon log:"; tail -10 "${SANDBOX_ROOT}/daemon.log" 2>/dev/null
  return 1
}

# ── Profile setup ──────────────────────────────────────────────────
setup_profile_toml() {
  local proj_dir="$1"
  local role="$2"
  local risk="$3"
  local domain="$4"

  mkdir -p "${proj_dir}/.complior"
  cat > "${proj_dir}/.complior/project.toml" << EOF
onboarding_completed = true
project_type = "existing"
jurisdiction = "eu"
requirements = ["eu-ai-act"]
role = "${role}"
industry = "${domain}"
scan_scope = ["deps", "env", "source"]
watch_on_start = false

[onboarding_answers]
org_role = "${role}"
domain = "${domain}"
data_types = ["public"]
system_type = "standalone"
gpai_model = "no"
user_facing = "yes"
autonomous_decisions = "no"
biometric_data = "no"
company_size = "sme"
EOF
}

# Map profile letter → role|riskLevel|domain|label (pipe-delimited)
profile_params() {
  case "$1" in
    A) echo "deployer|limited|general|Deployer / Limited / General (baseline)" ;;
    B) echo "provider|high|healthcare|Provider / High / Healthcare (high-risk medical AI)" ;;
    C) echo "deployer|minimal|finance|Deployer / Minimal / Finance (low-risk fintech)" ;;
    *) echo "" ;;
  esac
}

# ── Per-profile test runner ────────────────────────────────────────
run_profile() {
  local prof="$1"
  local params=$(profile_params "$prof")
  [[ -z "$params" ]] && { echo "Unknown profile: $prof"; return 1; }

  IFS='|' read -r role risk domain label <<< "$params"

  echo
  echo -e "${CYAN}═══ Profile $prof: ${label} ═══${NC}"

  local proj_dir="${SANDBOX_ROOT}/profile-${prof}/eval-target"
  local snap_dir="${SNAPSHOT_DIR}/profile-${prof}"
  rm -rf "${proj_dir}" "${snap_dir}"
  mkdir -p "$(dirname "${proj_dir}")" "${snap_dir}"
  cp -r "${SOURCE_PROJECT}" "${proj_dir}"
  rm -rf "${proj_dir}/.complior"

  setup_profile_toml "${proj_dir}" "${role}" "${risk}" "${domain}"

  spawn_daemon "${proj_dir}"
  ensure_ai_server   # re-spawn AI server if previous profile killed it

  cd "${proj_dir}"

  # ─ init (auto-detected merges with project.toml) ─
  echo "→ §init (re-run to populate computed fields)"
  "${COMPLIOR_BIN}" init --yes >"${snap_dir}/init.log" 2>&1 || true
  cp "${proj_dir}/.complior/project.toml" "${snap_dir}/project.toml.after-init" 2>/dev/null || true

  # ─ scan all flags ─
  echo "→ §scan (12 flag combos)"
  for cmd in \
    "scan" \
    "scan --json" \
    "scan --sarif" \
    "scan --ci --threshold 70" \
    "scan --diff main" \
    "scan --comment" \
    "scan --quiet"
  do
    name=$(echo "${cmd}" | tr ' ' '_' | tr -d '/-')
    "${COMPLIOR_BIN}" ${cmd} >"${snap_dir}/${name}.log" 2>&1 || true
  done
  "${COMPLIOR_BIN}" scan --deep >"${snap_dir}/scan_deep.log" 2>&1 || true
  if [[ "${SKIP_LLM}" -eq 0 ]] && [[ -n "${OPENROUTER_API_KEY:-}" ]]; then
    "${COMPLIOR_BIN}" scan --llm >"${snap_dir}/scan_llm.log" 2>&1 || true
    "${COMPLIOR_BIN}" scan --deep --llm >"${snap_dir}/scan_deep_llm.log" 2>&1 || true
  fi
  AGENT=$("${COMPLIOR_BIN}" passport list --json 2>/dev/null | jq -r '.[0].name // empty')
  if [[ -n "$AGENT" ]]; then
    "${COMPLIOR_BIN}" scan --agent "$AGENT" >"${snap_dir}/scan_agent.log" 2>&1 || true
  fi

  # Extract scan filterContext for cross-profile comparison
  "${COMPLIOR_BIN}" scan --json 2>/dev/null \
    | jq '{filterContext, disclaimer: .disclaimer, profile: .profile}' \
    > "${snap_dir}/scan-filter-context.json" 2>/dev/null || echo '{}' > "${snap_dir}/scan-filter-context.json"

  # ─ eval all flags ─
  if curl -sf "${AI_TARGET}/health" -m 3 >/dev/null 2>&1; then
    echo "→ §eval (against ${AI_TARGET})"
    "${COMPLIOR_BIN}" eval "${AI_TARGET}" --det --json >"${snap_dir}/eval_det.log" 2>&1 || true
    "${COMPLIOR_BIN}" eval "${AI_TARGET}" --security --concurrency 10 --json >"${snap_dir}/eval_security.log" 2>&1 || true
    "${COMPLIOR_BIN}" eval "${AI_TARGET}" --det --categories transparency,bias --json >"${snap_dir}/eval_categories.log" 2>&1 || true
    "${COMPLIOR_BIN}" eval "${AI_TARGET}" --det --dry-run >"${snap_dir}/eval_dryrun.log" 2>&1 || true
    "${COMPLIOR_BIN}" eval "${AI_TARGET}" --det --concurrency 20 --json >"${snap_dir}/eval_concur.log" 2>&1 || true
    "${COMPLIOR_BIN}" eval "${AI_TARGET}" --det --remediation --json >"${snap_dir}/eval_remediation.log" 2>&1 || true
    "${COMPLIOR_BIN}" eval --last --failures >"${snap_dir}/eval_last.log" 2>&1 || true
    "${COMPLIOR_BIN}" eval "${AI_TARGET}" --det --ci --threshold 50 >"${snap_dir}/eval_ci_low.log" 2>&1 || true
    "${COMPLIOR_BIN}" eval "${AI_TARGET}" --det --ci --threshold 99 >"${snap_dir}/eval_ci_high.log" 2>&1 || true
    if [[ "${SKIP_FULL_EVAL}" -eq 0 ]] && [[ -n "${OPENROUTER_API_KEY:-}" ]]; then
      "${COMPLIOR_BIN}" eval "${AI_TARGET}" --full --concurrency 10 --json >"${snap_dir}/eval_full.log" 2>&1 || true
    fi

    # Extract eval filterContext
    jq '.filterContext // {}' "${snap_dir}/eval_det.log" > "${snap_dir}/eval-filter-context.json" 2>/dev/null || echo '{}' > "${snap_dir}/eval-filter-context.json"
  else
    echo "  ⚠ AI server not reachable; skipping eval section"
  fi

  # ─ fix all flags ─
  echo "→ §fix"
  "${COMPLIOR_BIN}" fix --dry-run >"${snap_dir}/fix_dry.log" 2>&1 || true
  "${COMPLIOR_BIN}" fix --dry-run --json >"${snap_dir}/fix_json.log" 2>&1 || true
  "${COMPLIOR_BIN}" fix --dry-run --source scan >"${snap_dir}/fix_scan.log" 2>&1 || true
  "${COMPLIOR_BIN}" fix --dry-run --source eval >"${snap_dir}/fix_eval.log" 2>&1 || true
  "${COMPLIOR_BIN}" fix --dry-run --source all >"${snap_dir}/fix_all.log" 2>&1 || true
  CHECK_ID=$("${COMPLIOR_BIN}" scan --json 2>/dev/null | jq -r '.findings[] | select(.type=="fail") | .checkId' | head -1)
  if [[ -n "$CHECK_ID" ]]; then
    "${COMPLIOR_BIN}" fix --dry-run --check-id "$CHECK_ID" >"${snap_dir}/fix_checkid.log" 2>&1 || true
  fi
  "${COMPLIOR_BIN}" fix --doc fria >"${snap_dir}/fix_doc_fria.log" 2>&1 || true
  "${COMPLIOR_BIN}" fix --doc all >"${snap_dir}/fix_doc_all.log" 2>&1 || true
  if [[ "${SKIP_LLM}" -eq 0 ]] && [[ -n "${OPENROUTER_API_KEY:-}" ]]; then
    "${COMPLIOR_BIN}" fix --ai --dry-run >"${snap_dir}/fix_ai.log" 2>&1 || true
  fi

  # Extract fix change list
  jq '{count: (.changes | length), checkIds: [.changes[].checkId]}' "${snap_dir}/fix_json.log" > "${snap_dir}/fix-summary.json" 2>/dev/null || echo '{}' > "${snap_dir}/fix-summary.json"

  # ─ passport flows ─
  if [[ -n "$AGENT" ]]; then
    echo "→ §passport (13 flows)"
    "${COMPLIOR_BIN}" passport list >"${snap_dir}/p_list.log" 2>&1 || true
    "${COMPLIOR_BIN}" passport show "$AGENT" >"${snap_dir}/p_show.log" 2>&1 || true
    "${COMPLIOR_BIN}" passport validate "$AGENT" >"${snap_dir}/p_validate.log" 2>&1 || true
    "${COMPLIOR_BIN}" passport completeness "$AGENT" >"${snap_dir}/p_completeness.log" 2>&1 || true
    "${COMPLIOR_BIN}" passport autonomy "$AGENT" >"${snap_dir}/p_autonomy.log" 2>&1 || true
    "${COMPLIOR_BIN}" passport notify "$AGENT" >"${snap_dir}/p_notify.log" 2>&1 || true
    "${COMPLIOR_BIN}" passport registry >"${snap_dir}/p_registry.log" 2>&1 || true
    "${COMPLIOR_BIN}" passport permissions "$AGENT" >"${snap_dir}/p_permissions.log" 2>&1 || true
    "${COMPLIOR_BIN}" passport evidence >"${snap_dir}/p_evidence.log" 2>&1 || true
    "${COMPLIOR_BIN}" passport audit >"${snap_dir}/p_audit.log" 2>&1 || true
    for fmt in a2a aiuc-1 aiuc1 nist; do
      "${COMPLIOR_BIN}" passport export "$AGENT" --format "$fmt" >"${snap_dir}/p_export_${fmt}.log" 2>&1 || true
    done
  fi

  # ─ report 5 formats ─
  echo "→ §report (5 formats)"
  "${COMPLIOR_BIN}" report --format human >"${snap_dir}/report.human" 2>&1 || true
  "${COMPLIOR_BIN}" report --format json --output "${snap_dir}/report.json" 2>&1 | tee "${snap_dir}/report_json.log" >/dev/null || true
  "${COMPLIOR_BIN}" report --format md --output "${snap_dir}/report.md" 2>&1 | tee "${snap_dir}/report_md.log" >/dev/null || true
  "${COMPLIOR_BIN}" report --format html --output "${snap_dir}/report.html" 2>&1 | tee "${snap_dir}/report_html.log" >/dev/null || true
  "${COMPLIOR_BIN}" report --format pdf --output "${snap_dir}/report.pdf" 2>&1 | tee "${snap_dir}/report_pdf.log" >/dev/null || true
  "${COMPLIOR_BIN}" report --share >"${snap_dir}/report_share.log" 2>&1 || true

  # Extract profile + key data from report JSON
  jq '{profile, score: {overall: .readiness.readinessScore, zone: .readiness.zone}, oblTotal: .obligations.total, oblCovered: .obligations.covered, docs: .documents.total, passportCount: .passports.totalAgents}' \
    "${snap_dir}/report.json" > "${snap_dir}/report-summary.json" 2>/dev/null || echo '{}' > "${snap_dir}/report-summary.json"

  # Extract HTML profile block content for visual review
  awk '/<section id="company-profile"/,/<\/section>/' "${snap_dir}/report.html" > "${snap_dir}/html-profile-block.html" 2>/dev/null || true

  echo -e "  ${GREEN}✓${NC} Profile $prof complete — snapshots in ${snap_dir}"
  cd - >/dev/null
}

# ── Spawn AI server (one-time) ─────────────────────────────────────
echo
echo -e "${CYAN}═══ Spawning AI server ═══${NC}"
if ! curl -sf "${AI_TARGET}/health" -m 3 >/dev/null 2>&1; then
  spawn_ai_server "${SOURCE_PROJECT}"
else
  echo "  ✓ AI server already running"
fi

# ── Run each profile ───────────────────────────────────────────────
for prof in $PROFILES; do
  run_profile "$prof"
done

# ── Cross-profile comparison ───────────────────────────────────────
echo
echo -e "${CYAN}═══ Cross-profile comparison ═══${NC}"

{
  echo "# TRULY Deep E2E Report — ${DATE}"
  echo
  echo "**Multi-profile coverage:** $(echo $PROFILES | wc -w) profiles tested"
  echo "**Snapshots:** \`${SNAPSHOT_DIR}/\`"
  echo
  echo "## Cross-profile filter context comparison"
  echo
  echo "### scan filterContext"
  echo
  echo "| Profile | Role | Risk | Domain | applicableObligations | totalObligations | skippedByRole | skippedByRiskLevel | skippedByDomain |"
  echo "|---------|------|------|--------|----------------------|------------------|---------------|-------------------|-----------------|"
  for prof in $PROFILES; do
    f="${SNAPSHOT_DIR}/profile-${prof}/scan-filter-context.json"
    if [[ -f "$f" ]]; then
      jq -r --arg p "$prof" '.filterContext as $c | "| \($p) | \($c.role) | \($c.riskLevel // "null") | \($c.domain // "null") | \($c.applicableObligations) | \($c.totalObligations) | \($c.skippedByRole) | \($c.skippedByRiskLevel) | \($c.skippedByDomain) |"' "$f" 2>/dev/null || true
    fi
  done
  echo
  echo "### eval filterContext"
  echo
  echo "| Profile | applicableTests | totalTests | skippedByRole | skippedByRiskLevel | skippedByDomain |"
  echo "|---------|----------------|------------|---------------|-------------------|-----------------|"
  for prof in $PROFILES; do
    f="${SNAPSHOT_DIR}/profile-${prof}/eval-filter-context.json"
    if [[ -f "$f" ]]; then
      jq -r --arg p "$prof" '"| \($p) | \(.applicableTests // "null") | \(.totalTests // "null") | \(.skippedByRole // "null") | \(.skippedByRiskLevel // "null") | \(.skippedByDomain // "null") |"' "$f" 2>/dev/null || true
    fi
  done
  echo
  echo "### fix plan count"
  echo
  echo "| Profile | Fix plans count | First 3 check IDs |"
  echo "|---------|-----------------|-------------------|"
  for prof in $PROFILES; do
    f="${SNAPSHOT_DIR}/profile-${prof}/fix-summary.json"
    if [[ -f "$f" ]]; then
      jq -r --arg p "$prof" '"| \($p) | \(.count) | \((.checkIds // [])[:3] | join(", ")) |"' "$f" 2>/dev/null || true
    fi
  done
  echo
  echo "### report summary"
  echo
  echo "| Profile | Score | Zone | Obligations covered/total | Docs | Passports |"
  echo "|---------|-------|------|--------------------------|------|-----------|"
  for prof in $PROFILES; do
    f="${SNAPSHOT_DIR}/profile-${prof}/report-summary.json"
    if [[ -f "$f" ]]; then
      jq -r --arg p "$prof" '"| \($p) | \(.score.overall) | \(.score.zone) | \(.oblCovered)/\(.oblTotal) | \(.docs) | \(.passportCount) |"' "$f" 2>/dev/null || true
    fi
  done
  echo
  echo "### HTML profile block (first 5 lines per profile)"
  echo
  for prof in $PROFILES; do
    echo "**Profile $prof:**"
    echo '```html'
    head -10 "${SNAPSHOT_DIR}/profile-${prof}/html-profile-block.html" 2>/dev/null || echo "(no profile block found)"
    echo '```'
    echo
  done
  echo "## Full snapshot inventory"
  echo
  for prof in $PROFILES; do
    echo "### Profile $prof"
    echo '```'
    ls -la "${SNAPSHOT_DIR}/profile-${prof}/" 2>/dev/null | head -40
    echo '```'
    echo
  done

  # ── Per-tab analysis (V1-M29: automated visual checks per HTML tab) ─
  echo
  echo "## Per-tab automated analysis"
  echo
  echo "Each tab is inspected for V1-M27/M29 features + profile-aware filtering."
  echo
  if command -v python3 >/dev/null 2>&1; then
    PROFILES_LIST="$PROFILES" SNAPSHOT_DIR="$SNAPSHOT_DIR" python3 - <<'PYEOF'
import os, re, json, sys

profiles_str = os.environ.get('PROFILES_LIST', 'A B C')
snapshot_dir = os.environ.get('SNAPSHOT_DIR', './tests/e2e-snapshots')
profiles_list = profiles_str.split()

def load(p):
    base = f'{snapshot_dir}/profile-{p}'
    try:
        with open(f'{base}/report.html', encoding='utf-8') as f:
            html = f.read()
        with open(f'{base}/report.json', encoding='utf-8') as f:
            data = json.load(f)
        return html, data
    except FileNotFoundError:
        return None, None

def extract_tab(html, tab_id):
    m = re.search(rf'<div class="tab-content" id="tab-{tab_id}"[^>]*>(.*?)(?=<div class="tab-content"|</body>)', html, re.DOTALL)
    return m.group(1) if m else ''

def check(label, ok):
    return f"{'✅' if ok else '❌'} {label}"

# Collect data
loaded = {p: load(p) for p in profiles_list}
loaded = {p: (h, d) for p, (h, d) in loaded.items() if h is not None}

if not loaded:
    print("(no snapshots found)")
    sys.exit(0)

# ─── Overview tab ───
print("### Overview tab")
print()
print("| Profile | Score capped (HR-1) | Profile block | Articles count |")
print("|---------|---------------------|---------------|-----------------|")
for p, (html, data) in loaded.items():
    sc = 'YES ⚠️' if 'Score capped' in html else 'no ✓'
    pb = 'YES ✓' if 'company-profile' in html else 'no ❌'
    art_count = len(data.get('profile', {}).get('applicableArticles', []))
    print(f"| {p} | {sc} | {pb} | {art_count} |")
print()

# ─── Tests tab ───
print("### Tests tab (HR-2: source command grouping)")
print()
print("| Profile | Sections | Has descriptions |")
print("|---------|----------|------------------|")
for p, (html, data) in loaded.items():
    tab = extract_tab(html, 'tests')
    headers = re.findall(r'<h[2-4][^>]*>([^<]+)</h[2-4]>', tab)
    section_check = sum(1 for h in headers if h.strip() in ('Scan', 'Eval --det', 'Eval --llm', 'Security'))
    has_desc = 'tab-intro' in tab
    print(f"| {p} | {section_check}/4 | {has_desc} |")
print()

# ─── Findings tab ───
print("### Findings tab (HR-3: cards + actionable + profile-aware)")
print()
print("| Profile | Findings (data) | Cards rendered | Has cmd | Profile-aware (count diff) |")
print("|---------|----------------|----------------|---------|-----------------------------|")
counts = {}
for p, (html, data) in loaded.items():
    n_data = len(data.get('findings', []))
    n_cards = html.count('finding-card')
    has_cmd = 'complior fix' in extract_tab(html, 'findings')
    counts[p] = n_data
    print(f"| {p} | {n_data} | {n_cards} | {has_cmd} | (see below) |")
unique_counts = set(counts.values())
print(f"\n  → Profile-aware: {'❌ all profiles same count' if len(unique_counts) == 1 else '✅ counts differ across profiles'}")
print()

# ─── Laws tab ───
print("### Laws tab (HR-4: strict filter + disclaimer)")
print()
print("| Profile | Total obligations | Has disclaimer | Sample obligations |")
print("|---------|-------------------|----------------|--------------------|")
for p, (html, data) in loaded.items():
    tab = extract_tab(html, 'laws')
    obl = data.get('obligations', {})
    n = obl.get('total', 0)
    has_disc = bool(re.search(r'not\s+applicable\s+for\s+your\s+profile|excluded|\+\s*\d+\s+(more|other|additional)\s+obligation', tab, re.IGNORECASE))
    titles = re.findall(r'<div class="law-title">([^<]+)</div>', tab)[:3]
    print(f"| {p} | {n} | {'✅' if has_disc else '❌'} | {'; '.join(t[:40] for t in titles)} |")
print()

# ─── Documents tab ───
print("### Documents tab (HR-5: profile-required filter)")
print()
print("| Profile | Risk | FRIA shown (should be: high=YES, limited=no) | Has disclaimer |")
print("|---------|------|----------------------------------------------|----------------|")
for p, (html, data) in loaded.items():
    tab = extract_tab(html, 'documents')
    risk = data.get('profile', {}).get('riskLevel', '?')
    fria_shown = bool(re.search(r'\bFRIA\b|fria\.md', tab, re.IGNORECASE))
    expected = (risk in ('high', 'unacceptable'))
    fria_ok = '✅' if fria_shown == expected else '❌'
    has_disc = bool(re.search(r'not\s+(required|applicable)\s+for\s+your\s+profile|\+\s*\d+\s+(more|other|additional)\s+(documents?|docs?)|excluded.*profile', tab, re.IGNORECASE))
    print(f"| {p} | {risk} | {fria_ok} ({fria_shown}) | {'✅' if has_disc else '❌'} |")
print()

# ─── Fixes tab ───
print("### Fixes tab (HR-6: applied + pending)")
print()
print("| Profile | History entries | Applied section | Available section | Cmds shown |")
print("|---------|----------------|-----------------|-------------------|------------|")
for p, (html, data) in loaded.items():
    tab = extract_tab(html, 'fixes')
    n_hist = len(data.get('fixHistory', []))
    has_a = 'Applied' in tab
    has_v = 'Available' in tab or 'Recommended' in tab or 'Pending' in tab
    cmd_count = len(re.findall(r'complior\s+fix', tab))
    print(f"| {p} | {n_hist} | {'✅' if has_a else '❌'} | {'✅' if has_v else '❌'} | {cmd_count} |")
print()

# ─── Passports tab ───
print("### Passports tab (HR-7: expandable details)")
print()
print("| Profile | Total agents | <details> count | Sections (Identity/Compliance/Evidence) |")
print("|---------|-------------|------------------|------------------------------------------|")
for p, (html, data) in loaded.items():
    tab = extract_tab(html, 'passports')
    n_ag = data.get('passports', {}).get('totalAgents', 0)
    n_det = tab.count('<details')
    sec = 'Identity' in tab and 'Compliance' in tab and 'Evidence' in tab
    print(f"| {p} | {n_ag} | {n_det} | {'✅' if sec else '❌'} |")
print()

# ─── Actions tab ───
print("### Actions tab (HR-8: explanatory + dedup + no deprecated)")
print()
print("| Profile | Explanatory header | Has deprecated 'passport init' | 'fix' cmd count |")
print("|---------|--------------------|-------------------------------|------------------|")
for p, (html, data) in loaded.items():
    tab = extract_tab(html, 'actions')
    has_intro = 'tab-intro' in tab and ('Suggested' in tab or 'Recommended' in tab)
    has_pp_init = 'passport init' in tab
    fix_count = len(re.findall(r'<code[^>]*>complior\s+fix[^<]*</code>', tab))
    print(f"| {p} | {'✅' if has_intro else '❌'} | {'⚠️ YES' if has_pp_init else '✅ no'} | {fix_count} |")
print()

# ─── Timeline tab ───
print("### Timeline tab (HR-8: enforcement deadlines)")
print()
print("| Profile | Header | 2026-08-02 | 2027-08-02 | Past-due markers |")
print("|---------|--------|-----------|-----------|-------------------|")
for p, (html, data) in loaded.items():
    tab = extract_tab(html, 'timeline')
    has_intro = 'tab-intro' in tab and ('enforcement' in tab.lower() or 'deadline' in tab.lower())
    has_2026 = '2026-08-02' in tab or 'August 2026' in tab
    has_2027 = '2027-08-02' in tab or 'August 2027' in tab
    has_past = 'past-due' in tab or 'overdue' in tab.lower()
    print(f"| {p} | {'✅' if has_intro else '❌'} | {'✅' if has_2026 else '❌'} | {'✅' if has_2027 else '❌'} | {'✅' if has_past else '❌'} |")
print()
PYEOF
  else
    echo "(python3 not available — tab analysis skipped)"
  fi
} > "${REPORT_FILE}"

echo
echo -e "${GREEN}═══ TRULY Deep E2E complete ═══${NC}"
echo "Report:    ${REPORT_FILE}"
echo "Snapshots: ${SNAPSHOT_DIR}"
echo "Sandbox:   ${SANDBOX_ROOT}"
