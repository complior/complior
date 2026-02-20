#!/bin/sh
# Complior install script — POSIX-compliant
# Usage: curl -fsSL https://complior.ai/install.sh | sh
set -e

REPO="a3ka/complior"
BINARY_NAME="complior"

# --- Colors (only if terminal supports it) ---
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
    GREEN='\033[0;32m'
    YELLOW='\033[0;33m'
    RED='\033[0;31m'
    BOLD='\033[1m'
    RESET='\033[0m'
else
    GREEN='' YELLOW='' RED='' BOLD='' RESET=''
fi

info()  { printf "${BOLD}%s${RESET}\n" "$1"; }
ok()    { printf "${GREEN}%s${RESET}\n" "$1"; }
warn()  { printf "${YELLOW}%s${RESET}\n" "$1"; }
error() { printf "${RED}%s${RESET}\n" "$1" >&2; exit 1; }

# --- Detect OS and architecture ---
detect_platform() {
    OS="$(uname -s)"
    ARCH="$(uname -m)"

    case "$OS" in
        Linux)  PLATFORM="linux" ;;
        Darwin) PLATFORM="macos" ;;
        MINGW*|MSYS*|CYGWIN*) PLATFORM="windows" ;;
        *) error "Unsupported OS: $OS" ;;
    esac

    case "$ARCH" in
        x86_64|amd64)  ARCH="x86_64" ;;
        aarch64|arm64) ARCH="arm64" ;;
        *) error "Unsupported architecture: $ARCH" ;;
    esac

    # Map to artifact names
    case "${PLATFORM}-${ARCH}" in
        linux-x86_64)  ARTIFACT="complior-linux-x86_64" ;;
        linux-arm64)   ARTIFACT="complior-linux-aarch64" ;;
        macos-x86_64)  ARTIFACT="complior-macos-x86_64" ;;
        macos-arm64)   ARTIFACT="complior-macos-arm64" ;;
        windows-x86_64) ARTIFACT="complior-windows-x86_64.exe" ;;
        *) error "No pre-built binary for ${PLATFORM}-${ARCH}" ;;
    esac

    info "Detecting platform... ${PLATFORM} ${ARCH}"
}

# --- Get latest version from GitHub ---
get_latest_version() {
    if command -v curl >/dev/null 2>&1; then
        VERSION="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"tag_name":\s*"([^"]+)".*/\1/')"
    elif command -v wget >/dev/null 2>&1; then
        VERSION="$(wget -qO- "https://api.github.com/repos/${REPO}/releases/latest" | grep '"tag_name"' | sed -E 's/.*"tag_name":\s*"([^"]+)".*/\1/')"
    else
        error "Neither curl nor wget found. Install one and retry."
    fi

    if [ -z "$VERSION" ]; then
        error "Could not determine latest version. Check your network connection."
    fi

    info "Downloading complior ${VERSION}..."
}

# --- Download binary ---
download() {
    URL="https://github.com/${REPO}/releases/download/${VERSION}/${ARTIFACT}"
    CHECKSUM_URL="https://github.com/${REPO}/releases/download/${VERSION}/checksums.txt"
    TMPDIR="$(mktemp -d)"
    TMPFILE="${TMPDIR}/${ARTIFACT}"

    if command -v curl >/dev/null 2>&1; then
        curl -fsSL "$URL" -o "$TMPFILE"
        curl -fsSL "$CHECKSUM_URL" -o "${TMPDIR}/checksums.txt"
    else
        wget -q "$URL" -O "$TMPFILE"
        wget -q "$CHECKSUM_URL" -O "${TMPDIR}/checksums.txt"
    fi
}

# --- Verify checksum ---
verify_checksum() {
    EXPECTED="$(grep "$ARTIFACT" "${TMPDIR}/checksums.txt" | awk '{print $1}')"

    if [ -z "$EXPECTED" ]; then
        warn "Warning: checksum not found for ${ARTIFACT}, skipping verification"
        return 0
    fi

    if command -v sha256sum >/dev/null 2>&1; then
        ACTUAL="$(sha256sum "$TMPFILE" | awk '{print $1}')"
    elif command -v shasum >/dev/null 2>&1; then
        ACTUAL="$(shasum -a 256 "$TMPFILE" | awk '{print $1}')"
    else
        warn "Warning: no sha256sum or shasum found, skipping checksum verification"
        return 0
    fi

    if [ "$EXPECTED" = "$ACTUAL" ]; then
        ok "Verifying checksum... SHA256 OK"
    else
        error "Checksum mismatch!\n  Expected: ${EXPECTED}\n  Actual:   ${ACTUAL}\n\nThe download may be corrupted. Please retry."
    fi
}

# --- Install binary ---
install_binary() {
    # Try /usr/local/bin first, fall back to ~/.local/bin
    if [ -w "/usr/local/bin" ]; then
        INSTALL_DIR="/usr/local/bin"
    elif [ -d "$HOME/.local/bin" ] || mkdir -p "$HOME/.local/bin" 2>/dev/null; then
        INSTALL_DIR="$HOME/.local/bin"
        # Ensure it's in PATH
        case ":$PATH:" in
            *":$INSTALL_DIR:"*) ;;
            *) warn "Add $INSTALL_DIR to your PATH:  export PATH=\"\$HOME/.local/bin:\$PATH\"" ;;
        esac
    else
        error "Cannot write to /usr/local/bin or ~/.local/bin. Try: sudo sh -c 'curl -fsSL https://complior.ai/install.sh | sh'"
    fi

    info "Installing to ${INSTALL_DIR}/${BINARY_NAME}..."
    chmod +x "$TMPFILE"
    mv "$TMPFILE" "${INSTALL_DIR}/${BINARY_NAME}"
    rm -rf "$TMPDIR"
}

# --- Verify installation ---
verify_install() {
    if command -v complior >/dev/null 2>&1; then
        printf "\n"
        ok "Complior ${VERSION} installed successfully!"
        printf "\n"
        info "Run: complior --help"
        printf "     complior scan         Scan current project\n"
        printf "     complior fix --all    Auto-fix violations\n"
        printf "     complior doctor       System health check\n"
    else
        warn "Installed to ${INSTALL_DIR}/${BINARY_NAME}, but 'complior' not found in PATH."
        warn "Restart your shell or add ${INSTALL_DIR} to PATH."
    fi
}

# --- Main ---
main() {
    printf "\n"
    info "Complior Installer"
    printf "\n"

    detect_platform
    get_latest_version
    download
    verify_checksum
    install_binary
    verify_install
}

main "$@"
