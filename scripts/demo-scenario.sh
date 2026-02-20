#!/bin/sh
# Automated demo scenario for Complior
# Run inside asciinema recording for consistent demo
set -e

# Simulated typing effect
type_cmd() {
    printf '$ '
    echo "$1" | while IFS= read -r -n1 char; do
        printf '%s' "$char"
        sleep 0.04
    done
    printf '\n'
    sleep 0.3
    eval "$1"
    sleep 1
}

clear
echo ""
echo "  Complior — AI Act Compliance Scanner"
echo "  ====================================="
echo ""
sleep 2

# Step 1: Show version
type_cmd "complior version"
sleep 1

# Step 2: Navigate to demo project
type_cmd "cd demos/vulnerai && ls"
sleep 1

# Step 3: Initial scan — low score
echo ""
echo "  Step 1: Scan for compliance..."
echo ""
type_cmd "complior scan --no-tui"
sleep 3

# Step 4: Fix all violations
echo ""
echo "  Step 2: Auto-fix violations..."
echo ""
type_cmd "complior fix --dry-run"
sleep 3

# Step 5: Generate report
echo ""
echo "  Step 3: Generate compliance report..."
echo ""
type_cmd "complior report --format md"
sleep 2

# Step 6: Show doctor
echo ""
echo "  Bonus: System health check..."
echo ""
type_cmd "complior doctor"
sleep 2

echo ""
echo "  Done! From violation to compliance in seconds."
echo ""
sleep 3
