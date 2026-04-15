# V1-M14: v1.0.0 Release Polish

**Status:** DONE
**Branch:** `feature/V1-M14-release-polish`
**Goal:** Fix 18 UX issues blocking v1.0.0 release, version bump 0.9.6 → 1.0.0

## Context

All v1.0 commands implemented (M01-M13 DONE, 2502 tests GREEN). Deep UX audit revealed 18 issues: license mismatch, developer-facing errors shown to users, no `--help` examples, bare passport errors, Windows gaps, and more.

## Groups

### Group A: Blockers (strings/docs)
- [x] A1: README license MIT → AGPL-3.0
- [x] A2: GitHub URL a3ka/complior → complior/complior
- [x] A3: URL consistency complior.eu → complior.ai
- [x] A4: Help text cleanup (milestone prefixes, backtick artifacts)
- [x] A5: --cloud error user-friendly
- [x] A6: README eval syntax (positional arg)
- [x] A7: SDK references marked "(planned)"

### Group B: Error Messages
- [x] B1: Passport error helper (format_engine_hint + eprint_with_hint)
- [x] B2: scan.rs error → "complior daemon"
- [x] B3: main.rs error → "complior daemon"
- [x] B4: Config parse warning (fallback to defaults)

### Group C: UX Improvements
- [x] C1: --help examples (after_long_help on 6 commands)
- [x] C2: Doctor exit code (returns i32, 1 if critical fails)
- [x] C3: Version display (git hash + target triple via build.rs)
- [x] C4: HTML report offline fonts (system font stack)

### Group D: Windows Support
- [x] D1: Windows daemon stop (taskkill graceful → force)
- [x] D2: Windows is_process_alive (tasklist check)
- [x] D3: Conditional libc (cfg(unix) only)

### Group E: Polish
- [x] E1: npm checksum verification (SHA256 sidecar)
- [x] E2: CI env vars format (one-per-line, COMPLIOR_SCORE)
- [x] E3: Version bump 0.9.6 → 1.0.0

## Verification

| # | Task | Method | Files |
|---|------|--------|-------|
| A | Strings/docs | `scripts/verify_v1_release.sh` | README.md, cli.rs, commands.rs, format/mod.rs |
| B | Error messages | acceptance script + manual | passport.rs, scan.rs, main.rs, config.rs |
| C | UX improvements | `cargo test`, acceptance script | cli.rs, commands.rs, build.rs, html-renderer.ts |
| D | Windows support | acceptance script (code review) | daemon.rs, Cargo.toml |
| E | Polish | version consistency check | Cargo.toml, package.json ×2, CHANGELOG.md |

## Acceptance

```bash
bash scripts/verify_v1_release.sh  # All checks pass
cargo test -p complior             # All GREEN
cargo clippy -p complior           # 0 warnings
```
