# V1-M15: Pre-Release Polish

**Status:** DONE
**Branch:** `feature/V1-M15-pre-release-polish`
**Goal:** 8 UX improvements identified in deep audit, version bump 0.9.7 → 0.9.8

## Changes

### 1. SARIF file locations
- Added `locations[].physicalLocation` with `artifactLocation.uri` and `region.startLine`
- Added `partialFingerprints` for deduplication across runs
- Enables GitHub Code Scanning and IDE SARIF viewers

### 2. `--fail-on` validation
- Changed from `Option<String>` to `Option<SeverityLevel>` (clap ValueEnum)
- Invalid values now rejected at parse time with clear error
- Valid: critical, high, medium, low

### 3. Cold start message
- `"Starting Complior engine..."` printed to stderr before auto-launch retry
- Only shown on TTY (suppressed in CI/pipe)

### 4. Hide `--no-tui`
- Flag was a no-op (scans are always headless)
- Now `hide = true` — invisible in `--help` but still accepted for backwards compat

### 5. Shell completions
- Added `clap_complete` dependency
- New `complior completions <shell>` command (bash, zsh, fish, powershell)
- Examples in `--help` with standard install paths

### 6. User-friendly parse errors
- Replaced raw serde error messages with actionable text
- Suggests `complior doctor` for version mismatch diagnosis

### 7. Empty project / no-AI hint
- When scan finds no L3/L4/L5/ext findings, shows note about AI system requirement
- Helps users who accidentally scan non-AI projects

### 8. `--cloud` improved message
- Changed from generic "not yet available" to specific alternatives
- Suggests `complior scan` and `complior scan --deep`

### 9. Version bump
- 0.9.7 → 0.9.8 across Cargo.toml, package.json ×3, CHANGELOG.md

## Verification

```bash
cargo test -p complior-cli        # 188 GREEN
npx vitest run                     # 2194 GREEN
cargo clippy -p complior-cli       # 0 warnings
bash scripts/verify_v1_release.sh  # 29/29 passed
```
