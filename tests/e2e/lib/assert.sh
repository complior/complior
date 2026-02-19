#!/bin/sh
# E2E test assertion utilities for Complior Integration Gate Final
set -e

# Colors
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
    GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[0;33m'; BOLD='\033[1m'; RESET='\033[0m'
else
    GREEN=''; RED=''; YELLOW=''; BOLD=''; RESET=''
fi

PASS_COUNT=0
FAIL_COUNT=0

pass() {
    printf "  ${GREEN}PASS${RESET} %s\n" "$1"
    PASS_COUNT=$((PASS_COUNT + 1))
}

fail() {
    printf "  ${RED}FAIL${RESET} %s\n" "$1"
    if [ -n "${2:-}" ]; then
        printf "       Expected: %s\n" "$2"
        printf "       Actual:   %s\n" "$3"
    fi
    FAIL_COUNT=$((FAIL_COUNT + 1))
}

# Assert command exits with expected code
assert_exit_code() {
    local desc="$1"; shift
    local expected="$1"; shift
    set +e
    "$@" >/dev/null 2>&1
    local actual=$?
    set -e
    if [ "$actual" -eq "$expected" ]; then
        pass "$desc"
    else
        fail "$desc" "exit code $expected" "exit code $actual"
    fi
}

# Assert file exists
assert_file_exists() {
    local desc="$1"
    local path="$2"
    if [ -f "$path" ]; then
        pass "$desc"
    else
        fail "$desc" "file exists: $path" "not found"
    fi
}

# Assert file does NOT exist
assert_file_missing() {
    local desc="$1"
    local path="$2"
    if [ ! -f "$path" ]; then
        pass "$desc"
    else
        fail "$desc" "file missing: $path" "file exists"
    fi
}

# Assert output contains string
assert_contains() {
    local desc="$1"
    local haystack="$2"
    local needle="$3"
    if echo "$haystack" | grep -q "$needle"; then
        pass "$desc"
    else
        fail "$desc" "contains: $needle" "not found in output"
    fi
}

# Assert output does NOT contain string
assert_not_contains() {
    local desc="$1"
    local haystack="$2"
    local needle="$3"
    if ! echo "$haystack" | grep -q "$needle"; then
        pass "$desc"
    else
        fail "$desc" "should not contain: $needle" "found in output"
    fi
}

# Assert JSON field has expected value (requires jq)
assert_json_field() {
    local desc="$1"
    local json="$2"
    local field="$3"
    local expected="$4"
    if command -v jq >/dev/null 2>&1; then
        local actual
        actual="$(echo "$json" | jq -r "$field" 2>/dev/null)"
        if [ "$actual" = "$expected" ]; then
            pass "$desc"
        else
            fail "$desc" "$field = $expected" "$field = $actual"
        fi
    else
        printf "  ${YELLOW}SKIP${RESET} %s (jq not found)\n" "$desc"
    fi
}

# Assert number is greater than threshold
assert_gt() {
    local desc="$1"
    local actual="$2"
    local threshold="$3"
    if [ "$actual" -gt "$threshold" ] 2>/dev/null; then
        pass "$desc"
    else
        fail "$desc" "> $threshold" "$actual"
    fi
}

# Print summary
summary() {
    local total=$((PASS_COUNT + FAIL_COUNT))
    printf "\n"
    if [ "$FAIL_COUNT" -eq 0 ]; then
        printf "${GREEN}${BOLD}All %d tests passed${RESET}\n" "$total"
    else
        printf "${RED}${BOLD}%d/%d tests failed${RESET}\n" "$FAIL_COUNT" "$total"
    fi
    return "$FAIL_COUNT"
}
