# E2E Deep Test Report — 2026-04-24

**Branch:** `feature/V1-M20-M21-roadmap-cleanup`
**Binary:** `/home/openclaw/complior/target/release/complior`
**Test Project:** `/home/openclaw/test-projects/eval-target`

## Summary

| Metric | Count |
|--------|-------|
| Total cases | 61 |
| PASS | 47 |
| FAIL | 13 |
| SKIP | 1 |

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
| §4.3 | S-9 quiet line count | FAIL | 12 non-empty lines |
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
| §4.7 | P-7 notify (V1-M22 B-1) | FAIL | exit != 0 |
| §4.7 | P-8 registry | PASS |  |
| §4.7 | P-9 permissions | PASS |  |
| §4.7 | P-10 evidence | PASS |  |
| §4.7 | P-11 audit | PASS |  |
| §4.7 | P-12 export aiuc1 alias | FAIL | exit != 0 |
| §4.7 | P-13 import | PASS |  |
| §4.8 | R-1 human | PASS |  |
| §4.8 | R-2 json (--output honored) | PASS |  |
| §4.8 | R-3 md (--output NOT honored) | FAIL | CLI exit 0 but file absent at /tmp/reports/v1-m21-report.md |
| §4.8 | R-4 html (--output NOT honored) | FAIL | CLI exit 0 but file absent at /tmp/reports/v1-m21-report.html |
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
