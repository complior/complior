#!/bin/sh
# Complior E2E Integration Tests — Integration Gate Final
# Usage: ./tests/e2e/run-all.sh [ENGINE_URL]
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENGINE_URL="${1:-${ENGINE_URL:-http://127.0.0.1:3099}}"
export ENGINE_URL

# Colors
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
    GREEN='\033[0;32m'; RED='\033[0;31m'; BOLD='\033[1m'; RESET='\033[0m'
    LINE='════════════════════════════════════════'
else
    GREEN=''; RED=''; BOLD=''; RESET=''
    LINE='========================================'
fi

printf "\n${BOLD}E2E Integration Tests — Complior v1.0.0 Release Gate${RESET}\n"
printf "Engine: %s\n\n" "$ENGINE_URL"

TOTAL=7
PASSED=0
FAILED=0
START_TIME=$(date +%s)

run_test() {
    local num="$1"
    local script="$SCRIPT_DIR/$2"
    local name="$3"

    if [ ! -f "$script" ]; then
        printf "${RED}MISSING${RESET} %s\n" "$script"
        FAILED=$((FAILED + 1))
        return
    fi

    chmod +x "$script"
    if sh "$script" 2>&1; then
        PASSED=$((PASSED + 1))
    else
        FAILED=$((FAILED + 1))
    fi
}

run_test 1 "01-cold-start.sh" "Cold Start"
run_test 2 "02-onboarding.sh" "Onboarding"
run_test 3 "03-scan-pipeline.sh" "Scan Pipeline"
run_test 4 "04-fix-pipeline.sh" "Fix Pipeline"
run_test 5 "05-report-pipeline.sh" "Report Pipeline"
run_test 6 "06-watch-mode.sh" "Watch Mode"
run_test 7 "07-mcp-server.sh" "MCP Server"

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

printf "\n${LINE}\n"
if [ "$FAILED" -eq 0 ]; then
    printf "${GREEN}${BOLD}%d/%d passed — Integration Gate Final ✅${RESET}\n" "$PASSED" "$TOTAL"
else
    printf "${RED}${BOLD}%d/%d failed — Integration Gate Final ❌${RESET}\n" "$FAILED" "$TOTAL"
fi
printf "Total time: %ds\n" "$ELAPSED"
printf "${LINE}\n"

exit "$FAILED"
