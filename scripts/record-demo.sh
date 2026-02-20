#!/bin/sh
# Record Complior demo GIF using asciinema + svg-term/agg
# Prerequisites: asciinema, agg (or svg-term-cli)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEMO_DIR="$PROJECT_ROOT/demos/vulnerai"
OUTPUT_DIR="$PROJECT_ROOT/docs/assets"
RECORDING="$OUTPUT_DIR/demo.cast"
GIF_OUTPUT="$OUTPUT_DIR/demo.gif"

mkdir -p "$OUTPUT_DIR"

echo "Recording Complior demo..."
echo "Press Ctrl+D when done."

# Record with asciinema
if command -v asciinema >/dev/null 2>&1; then
    asciinema rec \
        --cols 100 \
        --rows 30 \
        --idle-time-limit 2 \
        --title "Complior — AI Act Compliance in 30 seconds" \
        "$RECORDING"

    # Convert to GIF using agg (asciinema gif generator)
    if command -v agg >/dev/null 2>&1; then
        agg --font-size 16 --speed 1.5 "$RECORDING" "$GIF_OUTPUT"
        echo "GIF saved to: $GIF_OUTPUT"
    elif command -v svg-term >/dev/null 2>&1; then
        svg-term --in "$RECORDING" --out "$OUTPUT_DIR/demo.svg" --window
        echo "SVG saved to: $OUTPUT_DIR/demo.svg"
    else
        echo "Install agg or svg-term-cli to convert recording to GIF/SVG"
        echo "  cargo install agg"
        echo "  npm install -g svg-term-cli"
    fi
else
    echo "asciinema not found. Install: https://asciinema.org/docs/installation"
    exit 1
fi
