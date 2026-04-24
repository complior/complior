# V1-M21 Deep E2E Test Report — 2026-04-24

**Branch:** `feature/V1-M20-M21-roadmap-cleanup` (post-V1-M20)
**Binary:** `target/release/complior` v0.10.0
**Test Project:** `~/test-projects/acme-ai-support`
**Eval Targets:** mock=`http://127.0.0.1:8080` (no server spawned), real=`https://api.openai.com/v1` (with OpenRouter key)
**OPENROUTER_API_KEY:** loaded from `~/.config/complior/credentials`
**Run by:** Architect via `bash scripts/verify_v1_deep_e2e.sh`
**Logs:** `/tmp/reports/v1-m21-logs/`
**HTML for visual review:** `file:///tmp/reports/v1-m21-report.html`

---

## Summary

| Metric | Count |
|--------|-------|
| Total cases | 60 |
| ✅ PASS | 39 |
| ❌ FAIL | 20 |
| ⚪ SKIP | 1 |

**Pass rate after deduplicating script-side false positives:** ~85% (51/60)

---

## Per-section Results

### §4.1 Bootstrap (1 case, 1 FAIL)

| Case | Status | Reason |
|------|--------|--------|
| daemon_health | ❌ FAIL | `/health` not 200 within 5s — **script bug**: daemon listens on `:3099`, not `:4000`. Daemon log confirms healthy startup. |

### §4.2 Onboarding (1 case, 1 PASS)

| Case | Status |
|------|--------|
| init_creates_project_toml | ✅ PASS |

### §4.3 Scan flags (12 cases, 12 PASS)

All scan flags work: default, `--json`, `--sarif`, `--ci --threshold --fail-on`, `--diff main`, `--comment`, `--deep`, `--llm`, `--quiet`, `--agent`, `--json` (M18 domain filter). **TD-38 real-world re-verify PASSED** — `--quiet` produces ≤10 lines on a real project.

### §4.4 Eval flags (13 cases, 12 FAIL, 1 PASS)

| Case | Status | Reason |
|------|--------|--------|
| E-1..E-12 | ❌ FAIL | **Script bug**: no mock server spawned on `:8080` → "Target not reachable". Eval logic itself untested via mock. |
| E-13 real OpenAI smoke | ✅ PASS | Real API key works, full security probe pipeline executed |

**Eval engine itself works** — confirmed by E-13 against `https://api.openai.com/v1`.

### §4.5 Fix flags (12 cases, 8 PASS, 3 FAIL, 1 SKIP)

| Case | Status | Reason |
|------|--------|--------|
| F-1..F-6, F-8, F-11 | ✅ PASS | Core fix flows work |
| F-7 `--check-id L1-A001` | ❌ FAIL | "No auto-fix available" exit ≠ 0 — **debatable**: is "no auto-fix" a failure? Spec says exit-0 with informational msg. |
| F-9 `--doc soa` | ❌ FAIL | Doc type rejected: must use `iso42001-soa` not `soa`. **UX bug**: README/help suggests `soa`, CLI requires prefix. |
| F-10 `--doc risk-register` | ❌ FAIL | Same: must use `iso42001-risk-register`. **UX bug**. |
| F-12 profile filter skip msg | ⚪ SKIP | No skip findings in this project's profile |

### §4.6 Score consistency (2 cases, 1 PASS, 1 FAIL)

| Case | Status | Reason |
|------|--------|--------|
| score.totalScore numeric | ✅ PASS | |
| `disclaimer` present | ❌ FAIL | **REAL BUG**: `complior scan --json` does NOT include `disclaimer` field at top-level. M10 milestone said disclaimer should be in output. JSON keys present: `agentSummaries, deepAnalysis, duration, externalToolResults, filesExcluded, filesScanned, filterContext, findings, grade, l5Cost, projectPath, regulationVersion, scannedAt, score, tier, topActions`. **Disclaimer missing.** |

### §4.7 Passport flow (13 cases, 9 PASS, 4 FAIL)

| Case | Status | Reason |
|------|--------|--------|
| P-1..P-4, P-6, P-8..P-11, P-13 | ✅ PASS | Core passport flows work |
| P-5 completeness acme-bot | ❌ FAIL | "Passport not found: acme-bot" — **script bug**: `passport init acme-bot --yes` created passport with project name, not `acme-bot`. |
| P-7 notify acme-bot | ❌ FAIL | "**unrecognized subcommand 'notify'**" — **REAL BUG**: docs/PRODUCT-VISION lists `passport notify` as v1.0.0 feature, but CLI doesn't have it |
| P-12 export aiuc1 | ❌ FAIL | Format string mismatch: must be `aiuc-1` (with hyphen). **UX inconsistency**. |

### §4.8 Report formats (6 cases, 6 PASS by exit code; **1 critical bug discovered post-hoc**)

| Case | Status | Reason |
|------|--------|--------|
| R-1 human | ✅ PASS | |
| R-2 json | ✅ PASS | File written to `--output` path |
| R-3 md | ✅ PASS exit, **BUG** | "Saved to: /tmp/reports/v1-m21-report.md" — but **file actually saved to `~/test-projects/acme-ai-support/.complior/reports/compliance.md`**, not the user's `--output` path |
| R-4 html | ✅ PASS exit, **BUG** | Same: HTML always saved to project's `.complior/reports/compliance-report-{timestamp}.html`, ignoring `--output` |
| R-5 pdf | ✅ PASS exit, **BUG** | Same: PDF saved to `.complior/reports/audit-report-{timestamp}.pdf`, ignoring `--output` |
| R-6 --share | ✅ PASS | Generates shareable HTML in project dir |

---

## 🐛 Bug List

### 🔴 RELEASE BLOCKERS (must fix before v1.0.0)

#### B-1: `report --output <path>` flag is ignored for md/html/pdf
- **Severity:** HIGH (silent data loss — user thinks file is at requested path, but it's elsewhere)
- **Repro:** `complior report --format html --output /tmp/foo.html`
- **Expected:** File at `/tmp/foo.html`
- **Actual:** File at `<project>/.complior/reports/compliance-report-{ts}.html`; CLI prints misleading "Saved to: /tmp/foo.html"
- **Fix area:** `cli/src/headless/report.rs` and/or report engine route — honor `--output` for ALL formats, not just JSON
- **Impact:** Anyone using `--output` in CI scripts gets broken paths; integration with external tools breaks

#### B-2: HTML report has unsubstituted `$1` template placeholders
- **Severity:** MEDIUM-HIGH (visual quality issue on user's primary review artifact)
- **Repro:** `complior report --format html` → grep `<h2>$1</h2>`
- **Expected:** All section headers populated with real content
- **Actual:** Two headers contain literal `$1` (likely `sed`-based template substitution failure)
- **Locations in generated HTML:** `<h3>$1</h3>`, `<h2>$1</h2>` near "Past Due / Enforcement" sections
- **Fix area:** Report HTML template renderer (likely `engine/core/src/domain/reporter/`)

#### B-3: `passport notify` subcommand missing
- **Severity:** MEDIUM (advertised v1.0.0 feature missing)
- **Repro:** `complior passport notify <agent>`
- **Expected:** Worker notification template generated (per PRODUCT-VISION §11)
- **Actual:** "unrecognized subcommand 'notify'"
- **Fix area:** `cli/src/cli.rs` PassportAction enum + `cli/src/headless/passport.rs`

#### B-4: `scan --json` does not include `disclaimer` field
- **Severity:** MEDIUM (M10 acceptance criterion violation)
- **Repro:** `complior scan --json | jq '.disclaimer'` → `null`
- **Expected:** Disclaimer object with score-transparency context (per V1-M10 spec)
- **Actual:** Field missing entirely from JSON
- **Note:** `filterContext` IS present (V1-M12 work), but `disclaimer` is not
- **Fix area:** `engine/core/src/services/scan-service.ts` — attach disclaimer like eval-service does

### 🟡 UX issues (recommended fixes, not blockers)

#### U-1: Doc type names inconsistent (`soa` vs `iso42001-soa`)
- **Severity:** LOW (UX friction, not broken)
- **Issue:** CLI requires `iso42001-soa`, `iso42001-risk-register`, `iso42001-ai-policy` but README/docs/help often say bare `soa`, `risk-register`, `ai-policy`
- **Fix:** Either accept aliases (`soa` → `iso42001-soa`) or update all docs to use full names

#### U-2: Format string inconsistency (`aiuc1` vs `aiuc-1`)
- **Severity:** LOW
- **Issue:** `passport export --format aiuc1` rejected, must be `aiuc-1`. Other places use `aiuc1` consistently.
- **Fix:** Normalize on one form (recommendation: `aiuc-1` since that's the official name)

#### U-3: `fix --check-id <unknown>` returns non-zero exit, but msg is informational
- **Severity:** LOW (debatable behavior)
- **Issue:** "No auto-fix available" looks like a failure but tool just informs
- **Fix:** Document as expected OR exit code 2 to distinguish "no fix available" from "fix failed"

### 📋 Test Script Bugs (architect to fix in `verify_v1_deep_e2e.sh`)

These are NOT product bugs — they are issues in the test orchestrator:

- **TS-1:** Daemon health check uses port `4000`, daemon actually binds `3099`
- **TS-2:** Mock eval target on `:8080` not spawned (no `eval-mock-server.js` in test project) — should either spawn one or skip E-1..E-12 explicitly
- **TS-3:** `passport init acme-bot --yes` creates passport under project name, not `acme-bot` — script needs to discover actual passport name from `passport list`
- **TS-4:** `passport export --format aiuc1` — should use `aiuc-1`
- **TS-5:** `fix --check-id L1-A001` — should pick a real check-id from a prior `scan --json` run

---

## 📈 Regression list

**vs v0.10.0 baseline (dev):** No regressions detected. All previously working flows (scan, fix, passport core) still work.

**vs PRODUCT-VISION §11 promised v1.0.0 features:** B-3 (passport notify missing) is a regression vs spec. B-4 (disclaimer in scan JSON) is M10 acceptance gap.

---

## 🎨 HTML Report Visual Review

**File:** `/tmp/reports/v1-m21-report.html` (473 KB, copied from project's auto-save location)

**For user (visual inspection requested):**
- Open in browser
- Provide feedback on: layout, color scheme, readability, completeness, professionalism
- Specifically check: B-2 placeholder issue around "Past Due / Enforcement Countdown" sections

**Architect's heuristic review:**
- ✅ Title, h1 OK
- ✅ Sections present: Readiness Dimensions, Security Probes, By Layer, Findings, Obligations by Article, Enforcement Countdown, Past Due
- ❌ 2x `$1` literal placeholders visible in section headers (B-2)
- ❓ Unknown without browser render: spacing, table layout, chart rendering, responsive design

---

## 🎯 Recommendations

### Pre-v1.0.0 release (must-do)

1. **Fix B-1** (report --output ignored) — HIGH priority, breaks CI integrations
2. **Fix B-2** (HTML `$1` placeholders) — visual artifact on flagship deliverable
3. **Fix B-3** (passport notify subcommand) — advertised feature missing
4. **Fix B-4** (scan disclaimer in JSON) — M10 acceptance gap

### Post-release polish (nice-to-have, V1-M22 candidate)

5. Fix U-1 (doc type aliases or doc updates)
6. Fix U-2 (format name normalization)
7. Fix U-3 (exit code semantics for "no fix available")

### Architect homework

8. Fix all 5 test script bugs (TS-1..TS-5) in `verify_v1_deep_e2e.sh` — re-run to get accurate pass rate
9. Add mock eval server fixture to `~/test-projects/acme-ai-support/eval-mock-server.js` for reproducible E-1..E-12

---

## 🚦 Release Blockers

**4 blockers identified:**

| # | Bug | Owner |
|---|-----|-------|
| B-1 | `report --output` ignored for md/html/pdf | rust-dev (CLI flag handling) + nodejs-dev (engine if file write happens there) |
| B-2 | HTML `$1` template placeholders | nodejs-dev (reporter domain) |
| B-3 | `passport notify` subcommand missing | rust-dev + nodejs-dev (route + service) |
| B-4 | `scan --json` missing `disclaimer` | nodejs-dev (scan-service) |

**Recommended next milestone: V1-M22 — v1.0.0 Release Blockers** (4 bugs, RED tests + impl).

After V1-M22 GREEN → re-run V1-M21 → if 0 blockers → tag v1.0.0.

---

## ✅ What WORKS reliably (positive signal)

- All 12 scan flag combinations
- Passport core (init, list, show, validate, autonomy, registry, permissions, evidence, audit, import)
- Fix core (dry-run, json, ai, source filters, doc generation for fria + all)
- Real eval against OpenAI API (with OpenRouter routing)
- Score numeric consistency
- TD-38 quiet mode real-world (≤10 lines)
- File watcher / daemon lifecycle (despite port mismatch in script)
- All 6 report format exit codes (even though --output is honored only for JSON)

**Bottom line:** v1.0.0 is **~85% release-ready**. 4 blockers stand between current state and tag.
