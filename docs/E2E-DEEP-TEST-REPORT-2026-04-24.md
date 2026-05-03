# E2E Deep Test Report — 2026-04-24 (3 runs over V1-M22→V1-M23)

**Branch:** `feature/V1-M23-wiring-fixes` (chained V1-M20 → V1-M21 → V1-M22 → V1-M23)
**Binary:** `target/release/complior` v0.10.0
**Test Project:** `~/test-projects/eval-target`

## Progress across 3 runs

| Run | Trigger | PASS | FAIL | SKIP | Real blockers |
|-----|---------|------|------|------|---------------|
| 1 | V1-M22 dev impl, eval-target | 39 | 20 | 1 | 4 (B-1..B-4) + 8 HTML + 3 UX |
| 2 | V1-M22 + Section E test scripts | 47 | 13 | 1 | 4 (W-1..W-4 from V1-M22 wiring gaps) |
| **3 (FINAL — V1-M23)** | V1-M23 wiring fixes applied | **51** | **12** | **1** | **5 partial — needs V1-M24 follow-up** |

## V1-M23 closure summary

| Task | Unit | Runtime | Verdict |
|------|------|---------|---------|
| W-1 disclaimer | ✅ GREEN | ❌ scan --json missing | partial — service returns it, HTTP route doesn't surface it |
| W-2 --output | ✅ GREEN | ✅ md/html OK, ❌ PDF NOT | partial — PDF endpoint missed |
| W-3 passport notify | ✅ GREEN | ✅ P-7 PASS | **DONE** ✅ |
| W-4 aiuc1 alias | ✅ GREEN | ✅ manual confirmed | **DONE** ✅ (script bug — ACTUAL_PP empty) |

## V1-M22 A-* tests illusory GREEN (need V1-M24 closure)

Unit tests passed against mock data; real HTML production rendering still has gaps:

| Task | Unit | Real HTML | Issue |
|------|------|-----------|-------|
| A-2 placeholders | ✅ GREEN | ❌ 3 `$N` left | Real template has placeholders unit didn't see |
| A-3 company profile | ✅ GREEN | ❌ no profile section | Unit checked builder fn, not real HTML output |
| A-5 doc IDs | ✅ GREEN | ❌ `[YYYY]/[NNN]` left | Real template still has placeholders |

## Final pass rate (run 3)

| Metric | Count |
|--------|-------|
| Total cases | 64 |
| PASS | 51 (~80%) |
| FAIL | 12 (3 script bugs + 4 expected after C-3 + 5 real wiring gaps for V1-M24) |
| SKIP | 1 |

## Remaining release blockers — V1-M24 scope (R-1..R-5)

- R-1: scan --json includes disclaimer (HTTP route layer wire-up)
- R-2: PDF endpoint honors outputPath
- R-3: HTML template removes all `$N` placeholders (real production path)
- R-4: HTML Overview section includes company profile block (real template)
- R-5: HTML substitutes real document IDs (TDD-2026-001 etc.)

## Old summary (run 1, retained for history)

## Per-case Results

| Section | Case | Status | Reason |
|---------|------|--------|--------|
| §4.1 | daemon_health (port 3099) | PASS |  |
| §4.2 | init_creates_project_toml | PASS |  |
| §4.3 | S-1 default | PASS |  |
| §4.3 | S-2 --json | PASS |  |
| §4.3 | S-3 --sarif | PASS |  |
| §4.3 | S-4 --ci threshold | PASS |  |
| §4.3 | S-5 --diff main | PASS |  |
| §4.3 | S-6 --comment | PASS |  |
| §4.3 | S-7 --deep | PASS |  |
| §4.3 | S-8 --llm | PASS |  |
| §4.3 | S-9 --quiet (TD-38) | PASS |  |
| §4.3 | S-10 --agent acme-bot | PASS |  |
| §4.3 | S-11 domain filter (M18) | PASS |  |
| §4.3 | S-9 quiet ≤10 lines (real-world) | PASS |  |
| §4.4 | E-1 --det | PASS |  |
| §4.4 | E-2 --det --llm | PASS |  |
| §4.4 | E-3 --security | PASS |  |
| §4.4 | E-4 --full | PASS |  |
| §4.4 | E-5 --ci threshold | PASS |  |
| §4.4 | E-6 --categories | FAIL | exit != 0 |
| §4.4 | E-7 --last --failures | PASS |  |
| §4.4 | E-8 --remediation | PASS |  |
| §4.4 | E-9 --dry-run | PASS |  |
| §4.4 | E-10 --concurrency 10 | PASS |  |
| §4.4 | E-11 --agent acme-bot | PASS |  |
| §4.4 | E-12 pre-filter metadata | FAIL | no filterContext in E-1 |
| §4.4 | E-13 real OpenAI smoke | PASS |  |
| §4.5 | F-1 --dry-run | PASS |  |
| §4.5 | F-2 --json | PASS |  |
| §4.5 | F-3 --ai | PASS |  |
| §4.5 | F-4 --source scan | PASS |  |
| §4.5 | F-5 --source eval | PASS |  |
| §4.5 | F-6 --source all | PASS |  |
| §4.5 | F-7 --check-id l2-monitoring-policy | FAIL | exit != 0 |
| §4.5 | F-8 --doc fria | PASS |  |
| §4.5 | F-9 --doc soa | FAIL | exit != 0 |
| §4.5 | F-10 --doc risk-register | FAIL | exit != 0 |
| §4.5 | F-11 --doc all | PASS |  |
| §4.5 | F-12 profile filter skip msg | SKIP | no skip findings in this project |
| §4.6 | score.totalScore numeric | PASS |  |
| §4.6 | disclaimer | FAIL | missing (V1-M22 B-2) |
| §4.6 | no deprecated  action (A-7) | PASS |  |
| §4.7 | P-1 init (done above) | PASS |  |
| §4.7 | P-2 list | PASS |  |
| §4.7 | P-3 show | PASS |  |
| §4.7 | P-4 validate | PASS |  |
| §4.7 | P-5 completeness | FAIL | exit != 0 |
| §4.7 | P-6 autonomy | PASS |  |
| §4.7 | P-7 notify (V1-M22 B-1) | PASS |  |
| §4.7 | P-8 registry | PASS |  |
| §4.7 | P-9 permissions | PASS |  |
| §4.7 | P-10 evidence | PASS |  |
| §4.7 | P-11 audit | PASS |  |
| §4.7 | P-12 export aiuc1 alias | FAIL | exit != 0 |
| §4.7 | P-13 import | PASS |  |
| §4.8 | R-1 human | PASS |  |
| §4.8 | R-2 json (--output honored) | PASS |  |
| §4.8 | R-3 md (--output honored) | PASS |  |
| §4.8 | R-4 html (--output honored) | PASS |  |
| §4.8 | R-4a HTML $N placeholders | FAIL | 3 leftover placeholders in HTML |
| §4.8 | R-4b company profile block | FAIL | no profile block found in HTML |
| §4.8 | R-4c document IDs (A-5) | FAIL | placeholder IDs [YYYY]/[NNN] still present |
| §4.8 | R-5 pdf (--output NOT honored) | FAIL | CLI exit 0 but file absent at /tmp/reports/v1-m21-report.pdf |
| §4.8 | R-6 --share | PASS |  |

## HTML Report for Visual Review

Open in browser: file:///tmp/reports/v1-m21-report.html

## Bug List

_To be filled by architect after manual review._

## Regression List

_To be filled by architect — what worked before, broke now._

## UX Issues

_To be filled — what works but is awkward._

## Recommendations

_To be filled — what to polish before v1.0.0 tag._

## Release Blockers

_To be filled — anything that blocks v1.0.0 release._
