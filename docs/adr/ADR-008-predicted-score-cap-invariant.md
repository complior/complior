# ADR-008: Predicted Score Cap Invariant — `MAX_PREDICTED_SCORE = 99`

**Status:** ✅ ACCEPTED
**Date:** 2026-05-02 (originally enforced in V1-M30.10)
**Documented:** 2026-05-03 (post v1.0.1 docs sync)
**Deciders:** Architect + user
**Affected files:**
- `engine/core/src/domain/whatif/simulate-actions.ts:106` — `Math.min(99, currentScore + totalDelta)`
- `cli/src/engine_client.rs:202` — `.clamp(current_score, MAX_PREDICTED_SCORE)`
- `cli/src/headless/fix.rs:119` — `.min(99.0)` (offline fallback)
- `cli/src/types/engine.rs:16` — `pub const MAX_PREDICTED_SCORE: f64 = 99.0`
**Tests enforcing:** `cli/src/types/engine.rs::predicted_score_cap_tests` (5 tests)

---

## Context

When `complior fix --dry-run` (or any preview path) computes the projected compliance score after applying available fixes, the result is an **estimate**, not a **guarantee**. The estimate is computed by:

1. Aggregating `scoreImpact` of each planned fix (`engine_client::fix_dry_run` for the CLI side; `simulateActions` for the whatif/engine side).
2. Applying diminishing returns (5% per subsequent fix in CLI; flat sum in whatif).
3. Adding to the current scan score.
4. Clamping to a maximum.

Prior to V1-M30.9 / V1-M30.10, the clamp value was `100.0` in three independent code paths:
- Engine `simulate-actions.ts` — `Math.min(100, ...)`
- CLI `engine_client.rs` — `.clamp(current_score, 100.0)`
- CLI `fix.rs` offline fallback — `.min(100.0)`

This produced output like `currentScore: 67, predictedScore: 100` after `--dry-run`, which falsely communicated to the user: "if you apply these fixes, your project will be 100% compliant".

This is **not true**. The score is computed from a partial check coverage (most obligations are not yet auto-checked), and even when every visible check passes, edge cases, profile-aware exclusions, document quality enrichment levels, and L5 LLM judgments can still reduce the real post-fix score below 100. Additionally, EU AI Act compliance is not a binary — it includes ongoing post-market monitoring, audit response, and human oversight that no static estimate can promise.

**The root user-trust problem:** showing `100` after a 30-second dry-run undermines confidence in every other Complior score the user sees.

---

## Decision

**Cap all predicted/projected score outputs at `99`, never `100`.**

The constant `MAX_PREDICTED_SCORE: f64 = 99.0` lives in `cli/src/types/engine.rs` and is the single source of truth for the Rust CLI. The TS engine mirrors the value with a literal `Math.min(99, ...)` in `simulate-actions.ts` (test enforces).

### Rationale

- **`100` implies certainty.** Predicted scores are estimates derived from partial coverage. Promising 100 misleads users.
- **`99` is high enough to be motivating.** Going from `67 → ~99` still communicates "this fix sequence will make you nearly fully compliant" without claiming certainty.
- **Single constant simplifies invariants.** The Rust `MAX_PREDICTED_SCORE` ensures any future code path using `clamp` cannot accidentally regress to `100.0` — static-source tests grep for the banned patterns.
- **Mirrors actual scan score behavior.** `complior scan` itself can return `100/100` only when every check passes (which is the fact of measurement), but predicted score is a forecast — different epistemic status.

### Where the invariant must hold

| Path | File | Mechanism |
|------|------|-----------|
| Engine whatif (TS) | `engine/core/src/domain/whatif/simulate-actions.ts:106` | `Math.min(99, currentScore + totalDelta)` literal |
| CLI engine call (Rust, healthy daemon) | `cli/src/engine_client.rs:202` | `.clamp(current_score, MAX_PREDICTED_SCORE)` |
| CLI offline fallback (Rust, daemon down) | `cli/src/headless/fix.rs:119` | `.min(99.0)` literal |

### Tests enforcing this ADR

`cli/src/types/engine.rs::predicted_score_cap_tests` (added in V1-M30.10):

1. `max_predicted_score_is_99_not_100` — sanity: constant equals `99.0`
2. `engine_client_does_not_hardcode_100_as_predicted_score_cap` — static-source check that `engine_client.rs` does NOT contain banned literals (`clamp(current_score, 100.0)`, `min(100.0)`)
3. `engine_client_uses_max_predicted_score_constant` — static-source check that `engine_client.rs` references `MAX_PREDICTED_SCORE` or `99.0`
4. `cap_does_not_inflate_low_baselines` — invariant: cap is a ceiling, not a floor (e.g., 50 + 3 still equals 53, not 99)
5. `cap_is_monotonic_never_decreases_baseline` — invariant: predicted ≥ current with no fixes (cap never produces backwards score)

The TS side has corresponding spec test at `engine/core/src/domain/whatif/simulate-actions.test.ts:125` (`'caps projected score at 99 (V1-M30.9 W-3 spec supersession — 100 implies certainty)'`).

---

## Alternatives considered

### Alternative 1: Cap at `100` and add explicit disclaimer text
> "Projected score is an estimate. Actual compliance may vary."

**Rejected.** Users skim disclaimers, especially in CI output. The number `100` still anchors expectations regardless of disclaimer wording. Better to cap the number itself.

### Alternative 2: Cap at `95`
> Communicates more uncertainty.

**Rejected.** Too far below the realistic post-fix score for low-baseline projects (e.g., 67→97 expected, capping at 95 obscures real progress). 99 is the right tradeoff: nearly-perfect, but never claimed perfect.

### Alternative 3: No cap, return raw projected sum even if >100
> Mathematically pure, leaves clamping to consumer.

**Rejected.** Bug-prone (consumers will display raw `127` to user). The cap is a UX guarantee, not a math choice.

---

## Consequences

### Positive

- ✅ User trust: "fix dry-run says 99" is honest about uncertainty
- ✅ Consistent across whatif (engine) and fix-preview (CLI) paths
- ✅ Static-source tests prevent regression — any future PR introducing `clamp(..., 100.0)` fails CI
- ✅ Single constant `MAX_PREDICTED_SCORE` makes the invariant searchable and modifiable

### Negative

- ⚠️ Profiles where 100 is genuinely achievable (e.g., Profile A with all docs enriched + all eval probes pass) display 99 instead. This is intentional — see Rationale.
- ⚠️ Future contributors may instinctively write `100.0` and need to be redirected by failing tests + this ADR.

### Neutral

- The actual scan score (`complior scan` post-apply) can still be `100/100` if all checks pass. This ADR only constrains **predicted/projected** scores, not measured ones.

---

## Historical context

### Why this took 3 milestones to fully close

The cap-at-99 invariant was specced in **V1-M30.9 W-3** but the initial fix was incomplete:

| Milestone | What was fixed | Gap |
|-----------|----------------|-----|
| V1-M30.9 W-3 | `simulate-actions.ts` (whatif path) + `fix.rs:119` (offline fallback) | CLI's healthy-daemon path via `engine_client::fix_dry_run` still hardcoded `100.0` — `predicted: 100` still appeared in `/deep-e2e v2` output |
| V1-M30.10 | `engine_client.rs:202` (the actual healthy-daemon path) + `MAX_PREDICTED_SCORE` constant + 5 RED tests | Closed root cause |
| V1-M30.11 | Bonus: `fix --doc` error handling (BUG-1) — separate concern but discovered in same /deep-e2e | — |

This three-milestone sequence is the canonical example of why static-source tests matter: V1-M30.9's logic-only tests passed (the cap WAS in `simulate-actions.ts`) but the user-visible bug persisted because the second code path was untested. V1-M30.10's static-source tests catch any future literal-100 introduction across all relevant files.

### Spec supersession of pre-existing test

V1-M30.10 also superseded a pre-existing test in `simulate-actions.test.ts` that expected `projectedScore = 100, delta = 2` for a `currentScore: 98, fix critical` scenario. The architect updated that test to expect `projectedScore = 99, delta = 1` per this ADR (architect-owned test files).

---

## References

- `docs/sprints/V1-M30.9-mini-hotfix.md` — original W-3 spec
- `docs/sprints/V1-M30.10-engine-client-cap.md` — root-cause closing milestone
- `cli/src/types/engine.rs:1-17` — `MAX_PREDICTED_SCORE` constant + doc comment
- `cli/src/types/engine.rs::predicted_score_cap_tests` — 5 enforcement tests
- `engine/core/src/domain/whatif/simulate-actions.ts:106` — TS engine cap
- `engine/core/src/domain/whatif/simulate-actions.test.ts:125` — TS spec test
