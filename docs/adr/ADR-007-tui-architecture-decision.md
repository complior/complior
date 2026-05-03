# ADR-007: TUI Architecture Decision

**Status:** 🟡 OPEN (decision required from user before V2 work begins)
**Date proposed:** 2026-05-03
**Deciders:** User (architectural call) + Architect (options analysis)
**Affected:**
- `cli/` (Rust binary structure)
- `engine/` (daemon embedding)
- Distribution (npm wrapper, crates.io binary, GitHub Release artifacts)
- `docs/feature-areas/tui-architecture.md` (FA-07)

---

## Context

Per FA-07 (`docs/feature-areas/tui-architecture.md`):

> **Status (v1.0.0):** 🟡 OPEN QUESTION — нужно решение: оставлять как отдельную сущность или схлопнуть с CLI/Daemon. Решение перед V2.

The TUI (`ratatui`-based interactive dashboard, 9 pages including Chat) currently lives as part of the `complior-cli` Rust binary. Running `complior` with no subcommand launches the TUI; running `complior <verb>` (scan/eval/fix/...) bypasses it.

This is technically a single binary with a feature flag (`tui` cargo feature, default-on). Architecturally, however, three competing models exist:

1. **TUI is its own product** — needs its own UX, design specs, release notes, possibly its own distribution channel
2. **TUI is a UX layer over CLI** — same binary, same tests, same distribution
3. **TUI is optional sugar** — installable separately for users who don't want the dependency footprint

The decision affects:
- Binary size (TUI deps ~2-3 MB of the 4-5 MB total binary)
- Test ownership (TUI integration tests vs CLI command tests)
- Release coordination (does TUI ship at the same cadence as CLI?)
- Documentation organization (TUI gets own Mintlify section vs interleaved with CLI commands)
- Cross-platform constraints (TUI requires terminal emulator with specific capabilities — Windows ConPTY, macOS iTerm2, etc.)

V1.0 punted on this decision: TUI ships with the CLI binary, all 9 pages work, but the architectural intent is undefined. Before V2-M01 (SDK enrichment) or V2-M02 (MCP enrichment), we need a clear answer because:
- V2-M02 plans MCP enrichment that may need TUI page changes
- Future Cloud Services Phase 3 will add TUI panels (Guard usage, SaaS sync status)
- npm wrapper postinstall logic depends on whether TUI is bundled

---

## Options

### Option A — Keep TUI as separate logical entity (status quo, formalized)

**Description:** TUI remains in the `complior-cli` binary but is treated as an independent product with its own design spec, tests, and release tracking. Cargo feature `tui` (default-on) controls inclusion.

**Pros:**
- Zero migration cost — current architecture already supports this
- TUI can evolve independently of CLI commands (e.g., new TUI page without new CLI verb)
- Future option to ship `complior --no-tui` builds for headless servers (~2 MB smaller)

**Cons:**
- Doubles documentation surface (Mintlify TUI section + CLI section)
- Maintenance overhead — TUI tests, CLI tests, and integration tests all live in `cli/`
- "Separate but bundled" is conceptually muddy

**Distribution impact:** None. Single binary, single Cargo feature.

### Option B — Collapse TUI into CLI (single conceptual product)

**Description:** TUI is just "the no-subcommand mode of `complior`". No separate documentation tab, no separate feature gate. CLI = TUI = same product.

**Pros:**
- Simplest mental model for users: "run `complior`, get a dashboard"
- Single documentation hierarchy
- Test ownership clear: every test is a `complior-cli` test
- Aligned with how cargo / rustup / npm behave (subcommands launch behavior; bare command launches default)

**Cons:**
- No path to ship a smaller headless-only binary for server-only environments
- TUI bugs can block CLI releases (currently isolated to TUI cargo feature)
- TUI design spec (TUI-DESIGN-SPEC.md) loses its standalone identity

**Distribution impact:** Drop the `tui` cargo feature. Single binary, no feature gates.

### Option C — Hybrid: separate npm package `@complior/tui`

**Description:** Core CLI in `complior` npm package. Optional TUI in `@complior/tui` (or `complior-tui`). Users opt-in to TUI install.

**Pros:**
- Smaller default install for CI/server users
- TUI evolves on its own release cadence
- Can support multiple TUI implementations (Rust ratatui, web-based via daemon, etc.)

**Cons:**
- Doubles distribution surface (2 npm packages, possibly 2 crates.io packages)
- Complex install UX: `npm install -g complior @complior/tui`
- Postinstall scripts get harder (which package detects which platform binary?)
- Cross-version compatibility matrix grows (CLI v1.x.0 + TUI v1.y.0 = how many combinations?)
- 80% of current users likely want both — split is for the 20% server crowd

**Distribution impact:** Significant. New npm package, new release pipeline, new docs section.

### Option D — Defer (do nothing, revisit after V2-M02)

**Description:** Leave TUI as-is. Don't formalize. Revisit when there's user feedback that demands a decision.

**Pros:**
- Zero immediate work
- User feedback may make the decision obvious

**Cons:**
- FA-07 stays in 🟡 OPEN status, blocking architects from making confident V2 changes affecting TUI
- Tech debt accumulates: every V2 milestone has to consider "does this affect TUI?" without clear principle

---

## Recommendation

**Architect recommends Option A (Keep separate, formalize)** — but this is a user call.

**Why A over B/C:**
- A is closest to status quo, zero migration cost
- A preserves the future option to ship headless-only (Option B + Option C still possible later)
- B is "just rename the framing" — no real architectural change
- C is over-engineered for current user base; revisit when 1000+ users provide signal

**Why not D:**
- "Decide before V2" was the original plan per FA-07. Deferring further breaks that commitment and blocks V2-M01/M02 confidence.

---

## Consequences (per option)

### If Option A accepted

- Update FA-07: `🟡 OPEN → ✅ DECIDED — Option A: Separate logical entity, single binary`
- No code changes required immediately
- Future ADR or milestone may add `--no-tui` cargo build option
- Documentation organization stays as-is (Mintlify has both `cli/` and TUI references, OK)

### If Option B accepted

- Remove `tui` cargo feature (always-on)
- Simplify documentation: collapse "TUI" section into CLI overview
- Update FA-07: `🟡 OPEN → ✅ DECIDED — Option B: TUI is the no-subcommand mode of CLI`
- Ship as semver patch (no behavior change)

### If Option C accepted

- Spec a 2-3 sprint extraction of `@complior/tui` package
- Add release pipeline for the new package
- Update Mintlify docs for split install
- Significant migration; recommend NOT accepting unless concrete user demand

### If Option D accepted

- FA-07 stays 🟡 OPEN
- Architect logs reminder to revisit after V2-M02 ships and post-launch feedback arrives

---

## Decision (TBD)

User to fill in after considering the above. Format:

```
Decision: Option [A/B/C/D]
Date decided: YYYY-MM-DD
Rationale: [user's reasoning, 1-3 sentences]
Followup work: [any milestone/ADR needed to execute the decision]
```

---

## References

- `docs/feature-areas/tui-architecture.md` — FA-07 with current 🟡 OPEN status
- `docs/TUI-DESIGN-SPEC.md` — current TUI page-by-page spec (9 pages)
- `cli/Cargo.toml` — `tui = ["ratatui", "dep:syntect", "dep:notify", "dep:unicode-width"]` cargo feature
- `cli/src/main.rs` — TUI bootstrap (when no subcommand)
- `docs/V2-ROADMAP.md` V2-M04 — execution milestone after this ADR is decided
